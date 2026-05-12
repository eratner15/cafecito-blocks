// Twilio outbound SMS + inbound webhook normalizer.
// Pulled from cafecito-ai/suite-air patterns. Shared by blocks 01, 07, 12.

const TWILIO_BASE = 'https://api.twilio.com/2010-04-01';

export async function sendSMS(env, params) {
  const { to, from, body, statusCallback } = params;
  if (!env.TWILIO_SID || !env.TWILIO_TOKEN) throw new Error('TWILIO_SID/TWILIO_TOKEN missing');
  if (!to || !from || !body) throw new Error('to + from + body required');

  const auth = btoa(`${env.TWILIO_SID}:${env.TWILIO_TOKEN}`);
  const form = new URLSearchParams({ To: to, From: from, Body: body });
  if (statusCallback) form.set('StatusCallback', statusCallback);

  const res = await fetch(`${TWILIO_BASE}/Accounts/${env.TWILIO_SID}/Messages.json`, {
    method: 'POST',
    headers: {
      authorization: `Basic ${auth}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Twilio SMS ${res.status}: ${errText.slice(0, 300)}`);
  }
  return res.json();
}

// Parse Twilio inbound webhook (form-encoded) into a normalized object.
export async function parseInboundSMS(request) {
  const form = await request.formData();
  return {
    sid: form.get('MessageSid'),
    from: form.get('From'),
    to: form.get('To'),
    body: form.get('Body') || '',
    numMedia: parseInt(form.get('NumMedia') || '0', 10),
    mediaUrls: collectMediaUrls(form),
    cityState: { city: form.get('FromCity'), state: form.get('FromState') },
    raw: Object.fromEntries(form.entries()),
  };
}

function collectMediaUrls(form) {
  const out = [];
  const n = parseInt(form.get('NumMedia') || '0', 10);
  for (let i = 0; i < n; i++) {
    const url = form.get(`MediaUrl${i}`);
    if (url) out.push({ url, contentType: form.get(`MediaContentType${i}`) });
  }
  return out;
}

// Provision a new Twilio number for a prospect. Returns { phone_number, sid }.
export async function provisionNumber(env, params) {
  const { areaCode = '305', friendlyName } = params;
  if (!env.TWILIO_SID || !env.TWILIO_TOKEN) throw new Error('TWILIO_SID/TWILIO_TOKEN missing');
  const auth = btoa(`${env.TWILIO_SID}:${env.TWILIO_TOKEN}`);

  // 1. Search for an available number in the area code
  const searchRes = await fetch(
    `${TWILIO_BASE}/Accounts/${env.TWILIO_SID}/AvailablePhoneNumbers/US/Local.json?AreaCode=${areaCode}&Limit=1`,
    { headers: { authorization: `Basic ${auth}` } }
  );
  if (!searchRes.ok) throw new Error(`Twilio search ${searchRes.status}: ${await searchRes.text()}`);
  const found = await searchRes.json();
  if (!found.available_phone_numbers?.[0]) throw new Error(`No available numbers in ${areaCode}`);
  const phoneNumber = found.available_phone_numbers[0].phone_number;

  // 2. Purchase it
  const buyRes = await fetch(
    `${TWILIO_BASE}/Accounts/${env.TWILIO_SID}/IncomingPhoneNumbers.json`,
    {
      method: 'POST',
      headers: {
        authorization: `Basic ${auth}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        PhoneNumber: phoneNumber,
        FriendlyName: friendlyName || phoneNumber,
      }).toString(),
    }
  );
  if (!buyRes.ok) throw new Error(`Twilio buy ${buyRes.status}: ${await buyRes.text()}`);
  return buyRes.json();
}

// Build TwiML for inbound webhook responses
export function twiml(parts) {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response>${parts}</Response>`,
    { headers: { 'content-type': 'text/xml; charset=utf-8' } }
  );
}
