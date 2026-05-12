// Resend wrapper + digest formatter + magic-link token generator.
// Pulled from boost-ai patterns. Always send from reports@cafecito-ai.com
// (NOT reports@resend.dev — that domain silently rejects external delivery).

const RESEND_URL = 'https://api.resend.com/emails';
const DEFAULT_FROM = 'Cafecito AI <reports@cafecito-ai.com>';

export async function sendEmail(env, params) {
  const { to, subject, html, text, from = DEFAULT_FROM, replyTo, cc, bcc } = params;
  if (!env.RESEND_API_KEY) throw new Error('RESEND_API_KEY missing');
  if (!to || !subject) throw new Error('to + subject required');

  const body = {
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
  };
  if (html) body.html = html;
  if (text) body.text = text;
  if (replyTo) body.reply_to = replyTo;
  if (cc) body.cc = Array.isArray(cc) ? cc : [cc];
  if (bcc) body.bcc = Array.isArray(bcc) ? bcc : [bcc];

  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${env.RESEND_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Resend ${res.status}: ${errText.slice(0, 300)}`);
  }
  return res.json();
}

// Magic-link approval tokens — signed with HMAC-SHA256, 24h expiry.
export async function mintApprovalToken(env, payload) {
  if (!env.APPROVAL_SECRET) throw new Error('APPROVAL_SECRET missing');
  const body = { ...payload, exp: Date.now() + 24 * 3600 * 1000 };
  const json = JSON.stringify(body);
  const sig = await hmacSha256(env.APPROVAL_SECRET, json);
  return `${btoa(json)}.${sig}`;
}

export async function verifyApprovalToken(env, token) {
  if (!env.APPROVAL_SECRET) throw new Error('APPROVAL_SECRET missing');
  const [b64, sig] = String(token).split('.');
  if (!b64 || !sig) return null;
  const json = atob(b64);
  const expected = await hmacSha256(env.APPROVAL_SECRET, json);
  if (sig !== expected) return null;
  const parsed = JSON.parse(json);
  if (parsed.exp && parsed.exp < Date.now()) return null;
  return parsed;
}

async function hmacSha256(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Common email shell — Fraunces serif title, JetBrains mono pre, cream paper.
export function emailShell({ title, preheader, bodyHtml, footer }) {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f5f1ea;font-family:-apple-system,BlinkMacSystemFont,'Inter Tight',system-ui,sans-serif;color:#0f0e0c;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;color:#f5f1ea;">${preheader}</div>` : ''}
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f5f1ea;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;background:#ffffff;border:1px solid #d9d4ca;border-radius:6px;">
      <tr><td style="padding:36px 36px 28px;">
        <h1 style="margin:0 0 16px;font:600 26px/1.2 'Fraunces',Georgia,serif;letter-spacing:-0.01em;">${title}</h1>
        <div style="font-size:15px;line-height:1.55;color:#2a2723;">${bodyHtml}</div>
        ${footer ? `<p style="margin:28px 0 0;padding-top:18px;border-top:1px solid #d9d4ca;font-size:12px;color:#6b6660;">${footer}</p>` : ''}
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}
