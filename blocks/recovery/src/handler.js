// Missed Call Recovery — Block 12
// Live in-browser simulator + dormant Twilio webhook handlers.
// Per-prospect Twilio numbers wire up via deploy script; without env, simulator works standalone.

import { resolveProspect } from './lib/resolve-prospect.js';

const CLAUDE_MODEL = 'claude-opus-4-7';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

const PROSPECT_OVERRIDES = {
  'garrido-hvac': {
    business: 'Garrido HVAC',
    vertical: 'HVAC service',
    callsMissed: 38,
    smsAutoSent: 38,
    smsReplied: 27,
    bookedAutomatically: 19,
    escalatedToHuman: 5,
    sample: [
      { phone: '(305) 555-0871', missedAt: '7:42pm (after-hours)', smsSent: '7:42pm', reply: '"AC went out. House is 84F. Wife is pregnant."', outcome: 'Emergency → human dispatch at 7:44pm', recovered: 480 },
      { phone: '(786) 555-0233', missedAt: '12:18pm (lunch rush)', smsSent: '12:18pm', reply: '"Compressor making grinding noise. Need someone this week."', outcome: 'Auto-booked Thu 10am', recovered: 320 },
      { phone: '(305) 555-0654', missedAt: '9:58pm', smsSent: '9:58pm', reply: '"Just asking for an estimate for new mini-split."', outcome: 'Qualified lead → email digest tomorrow', recovered: null },
      { phone: '(305) 555-0492', missedAt: '6:33am Saturday', smsSent: '6:33am', reply: '"Mantenimiento anual. ¿Tienen disponibilidad esta semana?"', outcome: 'Auto-replied in Spanish, booked Wed 2pm', recovered: 165 },
    ],
  },
};

const SHOWCASE = {
  business: 'Coastline Plumbing',
  vertical: 'plumbing',
  callsMissed: 47,
  smsAutoSent: 47,
  smsReplied: 32,
  bookedAutomatically: 21,
  escalatedToHuman: 6,
  sample: [
    { phone: '(305) 555-0142', missedAt: '7:42pm', smsSent: '7:42pm', reply: '"Yes — toilet overflowing in master bath. Need someone tonight."', outcome: 'Emergency triage → human at 7:44pm', recovered: 380 },
    { phone: '(786) 555-0218', missedAt: '12:18pm (lunch)', smsSent: '12:18pm', reply: '"Hot water heater making banging noise. Not urgent."', outcome: 'Auto-booked Wed 10am', recovered: 220 },
    { phone: '(305) 555-0387', missedAt: '6:55pm', smsSent: '6:55pm', reply: '"Just asking about pricing for a re-pipe job."', outcome: 'Qualified lead → email digest tomorrow', recovered: null },
  ],
};

const SAMPLE_SCENARIOS = [
  '"AC went out. House is 84F. Wife is pregnant."',
  '"Compressor making grinding noise. Need someone this week."',
  '"Just asking for an estimate for a new mini-split."',
  '"Hola — mi unidad no enfría. ¿Pueden venir hoy?"',
];

export async function handleRecovery(request, env, ctx, url, block, _routerProspectSlug) {
  const segments = url.pathname.split('/').filter(Boolean);
  let prospectSlug = null;
  let scope = { ...SHOWCASE };
  const reserved = new Set(['api', 'sample-quote', 'twilio']);
  if (segments[0] && !reserved.has(segments[0]) && env.INSTANCES) {
    const hit = await env.INSTANCES.get(`${block.slug}/${segments[0]}`);
    if (hit) {
      prospectSlug = segments[0];
      let _instance = null;
      try { _instance = JSON.parse(hit); } catch (_e) {}
      const _kvOverrides = (_instance && _instance.overrides) || {};
      const _localOverrides = (typeof PROSPECT_OVERRIDES !== 'undefined' && PROSPECT_OVERRIDES[prospectSlug]) || {};
      scope = { ...scope, ..._localOverrides, ..._kvOverrides };
    }
  }

  // ---- API routes ----
  // /api/simulate — live triage simulator (canonical or /<slug>/api/simulate)
  if (segments[segments.length - 1] === 'simulate' && segments[segments.length - 2] === 'api' && request.method === 'POST') {
    return handleSimulate(request, env, scope);
  }

  // /api/twilio/missed-call — Twilio voice-status webhook
  if (segments[segments.length - 1] === 'missed-call' && segments.includes('twilio') && request.method === 'POST') {
    return handleTwilioMissedCall(request, env, scope, prospectSlug);
  }

  // /api/twilio/sms-reply — Twilio inbound-sms webhook
  if (segments[segments.length - 1] === 'sms-reply' && segments.includes('twilio') && request.method === 'POST') {
    return handleTwilioSmsReply(request, env, scope, prospectSlug);
  }

  // /api/threads — list recent threads for this prospect
  if (segments[segments.length - 1] === 'threads' && segments.includes('api')) {
    return listThreads(env, scope, prospectSlug);
  }

  return html200(renderPage(scope, prospectSlug, block));
}

// ---------------------------------------------------------------------------
// Live simulator — Claude classifies a hypothetical customer SMS
// ---------------------------------------------------------------------------

async function handleSimulate(request, env, scope) {
  if (!env.ANTHROPIC_API_KEY) {
    return json({ ok: false, error: 'Simulator requires ANTHROPIC_API_KEY' }, 503);
  }
  const data = await request.json().catch(() => ({}));
  const customerSms = (data.customerSms || '').toString().trim();
  if (!customerSms) return json({ ok: false, error: 'customerSms required' }, 400);

  const system = `You are an SMS triage assistant for ${scope.business}, a ${scope.vertical} business in Miami.
The customer called and we couldn't reach a live person. We auto-sent: "Hi — this is ${scope.business}. Sorry we missed you. What can we help with?"
The customer just replied. Classify their reply and draft a brief, friendly response (under 160 chars).
If they wrote in Spanish, reply in Spanish. If English, reply in English. Match their tone.
Return ONLY JSON, no prose:
{
  "classification": "emergency" | "quote_request" | "general_inquiry" | "spam" | "followup",
  "urgency": "high" | "medium" | "low",
  "language": "en" | "es",
  "sms_draft": "your reply, under 160 chars",
  "next_action": "book" | "escalate_to_human" | "qualify_lead" | "dismiss",
  "outcome_summary": "1 short sentence describing predicted outcome",
  "value_estimate_usd": number | null
}`;

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 600,
      system,
      messages: [{ role: 'user', content: customerSms }],
    }),
  });
  if (!res.ok) return json({ ok: false, error: `Claude ${res.status}: ${await res.text()}` }, 500);
  const body = await res.json();
  const text = body.content?.[0]?.text || '{}';
  const start = text.indexOf('{'), end = text.lastIndexOf('}');
  let parsed = {};
  try { parsed = JSON.parse(text.slice(start, end + 1)); } catch (_e) { return json({ ok: false, error: 'Failed to parse Claude response' }, 500); }
  return json({ ok: true, customerSms, business: scope.business, ...parsed });
}

// ---------------------------------------------------------------------------
// Twilio webhooks — dormant until per-prospect Twilio creds + numbers wired
// ---------------------------------------------------------------------------

async function handleTwilioMissedCall(request, env, scope, prospectSlug) {
  if (!env.TWILIO_AUTH_TOKEN || !env.TWILIO_ACCOUNT_SID) {
    return text503('Twilio webhook is wired but TWILIO_AUTH_TOKEN / TWILIO_ACCOUNT_SID not set. Provision a Twilio number for this prospect and add the secrets.');
  }
  const form = await request.formData().catch(() => null);
  if (!form) return text503('Expected Twilio form-encoded body');
  const callStatus = form.get('CallStatus');
  const from = form.get('From');
  if (callStatus !== 'no-answer' && callStatus !== 'busy' && callStatus !== 'failed') {
    return new Response('<Response/>', { headers: { 'content-type': 'application/xml' } });
  }
  if (env.INSTANCES && prospectSlug) {
    const key = `recovery_thread/${prospectSlug}/${from}`;
    const initial = `Hi — this is ${scope.business}. Sorry we missed you. What can we help with?`;
    await env.INSTANCES.put(key, JSON.stringify({
      phone: from,
      thread: [{ direction: 'auto-out', text: initial, ts: Date.now() }],
      status: 'awaiting_reply',
      classification: null,
      created_at: Date.now(),
    }), { expirationTtl: 60 * 60 * 24 * 14 });
    // Outbound SMS via Twilio
    if (env.TWILIO_FROM_NUMBER) await sendTwilioSms(env, from, initial);
  }
  return new Response('<Response/>', { headers: { 'content-type': 'application/xml' } });
}

async function handleTwilioSmsReply(request, env, scope, prospectSlug) {
  if (!env.TWILIO_AUTH_TOKEN || !env.ANTHROPIC_API_KEY) {
    return text503('SMS-reply webhook is wired but TWILIO_AUTH_TOKEN or ANTHROPIC_API_KEY not set.');
  }
  const form = await request.formData().catch(() => null);
  if (!form) return text503('Expected Twilio form-encoded body');
  const from = form.get('From');
  const body = form.get('Body');
  // Pull thread state
  const key = `recovery_thread/${prospectSlug}/${from}`;
  const existing = await env.INSTANCES?.get(key);
  const thread = existing ? JSON.parse(existing) : { phone: from, thread: [], status: 'cold_inbound', classification: null, created_at: Date.now() };
  thread.thread.push({ direction: 'in', text: body, ts: Date.now() });

  // Classify + draft reply via Claude
  const simRes = await handleSimulate(new Request('http://_/', {
    method: 'POST',
    body: JSON.stringify({ customerSms: body }),
    headers: { 'content-type': 'application/json' },
  }), env, scope);
  const sim = await simRes.json();

  if (sim.ok && sim.next_action !== 'escalate_to_human' && sim.next_action !== 'dismiss') {
    thread.thread.push({ direction: 'auto-out', text: sim.sms_draft, ts: Date.now() });
    if (env.TWILIO_FROM_NUMBER) await sendTwilioSms(env, from, sim.sms_draft);
  }
  thread.status = sim.next_action === 'escalate_to_human' ? 'escalated' : (sim.next_action === 'book' ? 'auto_replied' : 'qualified');
  thread.classification = sim.classification;
  thread.urgency = sim.urgency;
  if (env.INSTANCES) await env.INSTANCES.put(key, JSON.stringify(thread), { expirationTtl: 60 * 60 * 24 * 14 });

  // Reply to Twilio: only auto-reply if we made one; otherwise stay silent (let a human take it)
  const twiml = (sim.ok && sim.next_action !== 'escalate_to_human' && sim.next_action !== 'dismiss')
    ? `<Response><Message>${esc(sim.sms_draft)}</Message></Response>`
    : '<Response/>';
  return new Response(twiml, { headers: { 'content-type': 'application/xml' } });
}

async function sendTwilioSms(env, to, body) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`;
  const auth = btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`);
  const params = new URLSearchParams({ From: env.TWILIO_FROM_NUMBER, To: to, Body: body });
  return fetch(url, { method: 'POST', headers: { Authorization: `Basic ${auth}`, 'content-type': 'application/x-www-form-urlencoded' }, body: params });
}

async function listThreads(env, scope, prospectSlug) {
  if (!env.INSTANCES || !prospectSlug) return json({ ok: true, threads: [] });
  const list = await env.INSTANCES.list({ prefix: `recovery_thread/${prospectSlug}/`, limit: 50 });
  const threads = [];
  for (const k of list.keys) {
    const v = await env.INSTANCES.get(k.name);
    if (v) threads.push(JSON.parse(v));
  }
  threads.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
  return json({ ok: true, threads });
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function renderPage(s, prospectSlug, block) {
  const apiPath = prospectSlug ? `/${prospectSlug}/api/simulate` : `/api/simulate`;
  const recoveredDollars = s.sample.reduce((sum, c) => sum + (c.recovered || 0), 0);
  const scenarios = SAMPLE_SCENARIOS.map(sc => sc.replace(/^"|"$/g, ''));
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(s.business)} — missed-call recovery · live demo</title>
${styles()}
</head><body>
<main>
  <p class="eyebrow">Block 12 · Missed Call Recovery · ${esc(prospectSlug || 'canonical demo')}</p>
  <h1>${esc(s.business)}</h1>
  <p class="lede">Every missed call → instant SMS in 1 second. Customer replies → Claude triages: emergency, quote request, or qualified lead. Auto-books or escalates without a human.</p>

  <section class="sim">
    <div class="sim-header">
      <span class="sim-eyebrow">Live demo · try the triage agent</span>
      <span class="sim-sub">Type a customer reply below. Claude reads it the same way it would in production.</span>
    </div>
    <div class="thread">
      <div class="bubble auto-out">Hi — this is <strong>${esc(s.business)}</strong>. Sorry we missed you. What can we help with?<span class="bubble-meta">auto-sent · 2 sec after missed call</span></div>
      <div class="bubble in" id="customer-bubble" hidden></div>
      <div class="bubble-thinking" id="thinking" hidden>Claude is reading the message…</div>
      <div class="bubble auto-reply" id="auto-reply" hidden></div>
      <div class="outcome-row" id="outcome-row" hidden></div>
    </div>
    <div class="sim-input">
      <label class="sim-label" for="customer-sms">Customer's reply</label>
      <textarea id="customer-sms" rows="2" placeholder='e.g. "AC went out, house is 84F"'></textarea>
      <div class="sim-chips" id="sim-chips">
        ${scenarios.map((sc, i) => `<button type="button" class="chip" data-sc="${esc(sc)}">${esc(sc.length > 40 ? sc.slice(0,38) + '…' : sc)}</button>`).join('')}
      </div>
      <button type="button" id="sim-go" class="sim-go">Run triage →</button>
      <div class="sim-error" id="sim-error" hidden></div>
    </div>
  </section>

  <section class="kpis-section">
    <h2>Last 30 days · canonical metrics</h2>
    <p class="kpi-sub-meta">${s.callsMissed} calls intercepted · $${recoveredDollars.toLocaleString()} recovered (sample)</p>
    <div class="kpis">
      <div class="kpi"><div class="kpi-label">Missed → SMS</div><div class="kpi-num">${s.callsMissed}</div><div class="kpi-sub">within 4 seconds</div></div>
      <div class="kpi"><div class="kpi-label">Replied</div><div class="kpi-num">${s.smsReplied}</div><div class="kpi-sub">${Math.round((s.smsReplied/s.smsAutoSent)*100)}% engagement</div></div>
      <div class="kpi"><div class="kpi-label">Auto-booked</div><div class="kpi-num">${s.bookedAutomatically}</div><div class="kpi-sub">no human required</div></div>
      <div class="kpi"><div class="kpi-label">Escalated</div><div class="kpi-num">${s.escalatedToHuman}</div><div class="kpi-sub">emergencies + complex</div></div>
    </div>
  </section>

  <h2>Recovery sample (last week)</h2>
  ${s.sample.map(renderCall).join('')}

  <h2>How it works in production</h2>
  <ol class="flow">
    <li><strong>Twilio webhook.</strong> Any inbound call your business misses (busy / no answer / voicemail) fires a webhook in 1 second.</li>
    <li><strong>Instant SMS.</strong> Friendly bilingual SMS from your business number: "Hi — saw I missed your call. What's going on?"</li>
    <li><strong>Claude triage.</strong> Customer replies → classify (emergency / quote / general / spam) → auto-book via Cal.com, qualify into your CRM, or escalate to your phone.</li>
    <li><strong>Daily digest.</strong> Every recovered call lands in your email each morning with the full SMS thread.</li>
  </ol>

  <h2>For sales</h2>
  <p class="lede">Block 12 is <strong>$750 setup · $250/mo</strong>. Highest-ROI block in the arsenal — HVAC / plumbers / contractors miss 40+ calls/month, each is $200-500 in deferred revenue. Pays back in week 1.</p>
  <div class="cta-row">
    <a class="btn-outline" href="https://cafecito-ai.com/new-hire/blocks/${esc(block.slug)}">Read the playbook</a>
    <a class="btn-outline" href="https://github.com/cafecito-ai/block-recovery">GitHub mirror</a>
  </div>
  <footer>Cafecito Blocks · recovery.cafecito-ai.com</footer>
</main>
<script>
${clientScript(apiPath, s.business)}
</script>
</body></html>`;
}

function renderCall(c) {
  return `<div class="call">
    <div class="call-h">
      <strong>${esc(c.phone)}</strong>
      <span class="call-time">missed ${esc(c.missedAt)} · SMS sent ${esc(c.smsSent)}</span>
      ${c.recovered ? `<span class="recovered">+$${c.recovered}</span>` : ''}
    </div>
    <div class="reply">${esc(c.reply.replace(/^["“]|["”]$/g, ''))}</div>
    <div class="outcome">→ ${esc(c.outcome)}</div>
  </div>`;
}

function clientScript(apiPath, business) {
  return `
const $ = (id) => document.getElementById(id);
const ta = $('customer-sms'), go = $('sim-go'), err = $('sim-error');
const cust = $('customer-bubble'), thinking = $('thinking'), reply = $('auto-reply'), outcomeRow = $('outcome-row');
const chips = $('sim-chips');
chips.querySelectorAll('button').forEach(b => b.onclick = () => { ta.value = b.dataset.sc; go.click(); });

const tagFor = (cls, urg) => {
  const u = (urg||'').toLowerCase();
  const c = (cls||'').toLowerCase();
  const colorMap = { emergency: 'red', quote_request: 'blue', general_inquiry: 'grey', spam: 'amber', followup: 'green' };
  const label = c.replace(/_/g, ' ');
  return '<span class="tag tag-' + (colorMap[c] || 'grey') + '">' + label + ' · ' + (u || 'low') + ' urgency</span>';
};

go.onclick = async () => {
  const msg = ta.value.trim();
  if (!msg) { err.textContent = 'Type a customer reply first.'; err.hidden = false; return; }
  err.hidden = true;
  cust.innerHTML = msg.replace(/</g,'&lt;') + '<span class="bubble-meta">customer · inbound</span>';
  cust.hidden = false;
  thinking.hidden = false;
  reply.hidden = true; outcomeRow.hidden = true;
  go.disabled = true; go.textContent = 'Reading…';
  try {
    const res = await fetch('${apiPath}', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ customerSms: msg }) });
    const j = await res.json();
    if (!j.ok) throw new Error(j.error || 'Triage failed');
    thinking.hidden = true;
    const tag = tagFor(j.classification, j.urgency);
    if (j.next_action === 'escalate_to_human') {
      reply.className = 'bubble auto-reply escalate';
      reply.innerHTML = '<strong>Escalating to ${esc(business)} on-call</strong><br>No automated reply — alerting the on-call number with a 1-sentence summary handoff.<span class="bubble-meta">no SMS sent</span>';
    } else {
      reply.className = 'bubble auto-reply';
      reply.innerHTML = j.sms_draft.replace(/</g,'&lt;') + '<span class="bubble-meta">auto-reply draft · ' + j.sms_draft.length + ' chars</span>';
    }
    reply.hidden = false;
    outcomeRow.innerHTML = tag + ' <span class="outcome-text">' + (j.outcome_summary || '').replace(/</g,'&lt;') + (j.value_estimate_usd ? ' · ~$' + j.value_estimate_usd + ' job value' : '') + '</span>';
    outcomeRow.hidden = false;
  } catch (e) {
    thinking.hidden = true;
    err.textContent = e.message;
    err.hidden = false;
  } finally {
    go.disabled = false; go.textContent = 'Run triage →';
  }
};
`;
}

function styles() {
  return `<style>
*{box-sizing:border-box}
body{margin:0;background:#f5f1ea;color:#0f0e0c;font:15px/1.55 ui-sans-serif,system-ui,-apple-system,"Inter Tight",sans-serif}
main{max-width:780px;margin:0 auto;padding:48px 24px 96px}
.eyebrow{font:500 11px/1 ui-monospace,monospace;letter-spacing:0.16em;text-transform:uppercase;color:#b8412c;margin:0 0 14px}
h1{font:700 32px/1.15 "Fraunces",Georgia,serif;margin:0 0 8px}
.lede{font-size:16px;color:#2a2723;margin:0 0 28px;line-height:1.5}

.sim{background:#fff;border:1px solid #d9d4ca;border-radius:8px;padding:18px 18px 14px;margin:0 0 32px}
.sim-header{margin:0 0 14px}
.sim-eyebrow{display:block;font:500 11px/1 ui-monospace,monospace;letter-spacing:0.14em;text-transform:uppercase;color:#b8412c}
.sim-sub{display:block;font:400 13px/1.4 ui-sans-serif,system-ui;color:#6b6660;margin-top:4px}
.thread{background:#f5f1ea;border-radius:6px;padding:12px;margin:0 0 14px;min-height:120px}
.bubble{position:relative;border-radius:14px;padding:10px 14px 22px;margin:0 0 8px;max-width:84%;font-size:14px;line-height:1.4;background:#fff;border:1px solid #d9d4ca;color:#0f0e0c}
.bubble.auto-out{background:#e8eee9;border-color:#c8d4ca;margin-right:auto}
.bubble.in{background:#1f3a2e;color:#f5f1ea;border-color:#1f3a2e;margin-left:auto}
.bubble.auto-reply{background:#1a3a6b;color:#f5f1ea;border-color:#1a3a6b;margin-right:auto}
.bubble.auto-reply.escalate{background:#b8412c;border-color:#b8412c}
.bubble-meta{position:absolute;bottom:5px;right:14px;font:400 10px/1 ui-monospace,monospace;color:rgba(0,0,0,0.55);letter-spacing:0.04em}
.bubble.in .bubble-meta,.bubble.auto-reply .bubble-meta{color:rgba(245,241,234,0.6)}
.bubble-thinking{font:italic 13px/1.4 ui-sans-serif,system-ui;color:#6b6660;padding:6px 14px}
.outcome-row{padding:8px 4px 0;display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-size:13px}
.tag{display:inline-block;padding:3px 9px;border-radius:99px;font:500 11px/1.2 ui-monospace,monospace;letter-spacing:0.04em;text-transform:uppercase}
.tag-red{background:#fdf2ee;color:#8a2210;border:1px solid #e8b8a8}
.tag-blue{background:#eaf0fa;color:#1a3a6b;border:1px solid #b8c8e6}
.tag-grey{background:#ece5d8;color:#2a2723;border:1px solid #c8c2b6}
.tag-amber{background:#f5e8c8;color:#6b4f00;border:1px solid #d9c895}
.tag-green{background:#d4ecd5;color:#1f3a2e;border:1px solid #aacaae}
.outcome-text{color:#2a2723}
.sim-input{margin:0}
.sim-label{display:block;font:500 11px/1 ui-monospace,monospace;letter-spacing:0.12em;text-transform:uppercase;color:#6b6660;margin:0 0 6px}
.sim-input textarea{width:100%;font:14px/1.4 ui-sans-serif,system-ui;padding:10px 12px;border:1px solid #c8c2b6;border-radius:4px;background:#fff;color:#0f0e0c;resize:vertical}
.sim-input textarea:focus{outline:none;border-color:#1a3a6b}
.sim-chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
.chip{background:#f5f1ea;border:1px solid #d9d4ca;border-radius:99px;padding:6px 12px;font:400 12px/1.2 ui-sans-serif,system-ui;color:#2a2723;cursor:pointer}
.chip:hover{background:#ece5d8;border-color:#c8c2b6}
.sim-go{display:block;width:100%;padding:12px 18px;background:#1f3a2e;color:#f5f1ea;border:0;border-radius:6px;font:600 15px/1 "Fraunces",Georgia,serif;cursor:pointer;margin-top:6px}
.sim-go:disabled{opacity:0.5;cursor:not-allowed}
.sim-go:not(:disabled):hover{background:#2a4a3c}
.sim-error{margin-top:8px;font:400 13px/1.4 ui-sans-serif,system-ui;color:#8a2210;background:#fdf2ee;border:1px solid #e8b8a8;padding:8px 12px;border-radius:4px}

.kpis-section{margin:0 0 24px}
.kpi-sub-meta{font:400 13px/1.4 ui-sans-serif,system-ui;color:#6b6660;margin:0 0 12px}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.kpi{background:#fff;border:1px solid #d9d4ca;border-radius:6px;padding:14px 16px}
.kpi-label{font:500 10px/1 ui-monospace,monospace;letter-spacing:0.14em;text-transform:uppercase;color:#6b6660;margin:0 0 5px}
.kpi-num{font:700 26px/1 "Fraunces",Georgia,serif;color:#1f3a2e}
.kpi-sub{font:400 11px/1.3 ui-sans-serif,system-ui;color:#6b6660;margin:4px 0 0}

h2{font:600 20px/1.2 "Fraunces",Georgia,serif;margin:32px 0 14px}
.call{background:#fff;border:1px solid #d9d4ca;border-radius:6px;padding:14px 18px;margin:0 0 10px}
.call-h{display:flex;gap:12px;align-items:baseline;flex-wrap:wrap;margin:0 0 8px}
.call-time{font:400 11px/1 ui-monospace,monospace;color:#6b6660}
.recovered{margin-left:auto;font:700 13px/1 "Fraunces",Georgia,serif;color:#1f3a2e}
.reply{font:italic 14px/1.5 ui-sans-serif,system-ui;padding-left:12px;border-left:2px solid #d9d4ca;margin:0 0 6px;color:#2a2723}
.outcome{font:500 12px/1.3 ui-monospace,monospace;color:#1f3a2e}
.flow{padding-left:1.2em;margin:0 0 28px}
.flow li{margin:0 0 10px;line-height:1.55}
.lede strong{color:#0f0e0c}
.btn-outline{display:inline-block;padding:10px 16px;border:1px solid #0f0e0c;border-radius:4px;text-decoration:none;color:#0f0e0c;font:500 13px/1 ui-sans-serif,system-ui;background:#fff}
.btn-outline:hover{background:#0f0e0c;color:#f5f1ea}
.cta-row{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 36px}
code{font-family:ui-monospace,monospace;background:#ece5d8;padding:2px 6px;border-radius:3px;font-size:0.9em}
footer{font:400 12px/1.5 ui-sans-serif,system-ui;color:#6b6660;border-top:1px solid #d9d4ca;padding-top:18px}
</style>`;
}

function esc(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function html200(html){return new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=60, must-revalidate'}});}
function json(d,status=200){return new Response(JSON.stringify(d),{status,headers:{'content-type':'application/json; charset=utf-8'}});}
function text503(msg){return new Response(msg,{status:503,headers:{'content-type':'text/plain; charset=utf-8'}});}
