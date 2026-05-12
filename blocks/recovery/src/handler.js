// Missed Call Recovery — Block 12
// Twilio missed-call webhook → instant SMS → Claude reply handler → book or escalate

import { resolveProspect } from './lib/resolve-prospect.js';

const PROSPECT_OVERRIDES = {
  'garrido-hvac': {
    business: 'Garrido HVAC',
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

export async function handleRecovery(request, env, ctx, url, block, _routerProspectSlug) {
  const segments = url.pathname.split('/').filter(Boolean);
  let prospectSlug = null;
  let scope = SHOWCASE;
  if (segments[0] && segments[0] !== 'api' && env.INSTANCES) {
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
  return html200(renderPage(scope, prospectSlug, block));
}

function renderPage(s, prospectSlug, block) {
  const recoveredDollars = s.sample.reduce((sum, c) => sum + (c.recovered || 0), 0);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(s.business)} — missed-call recovery</title>
${styles()}
</head><body>
<main>
  <p class="eyebrow">Block 12 · Missed Call Recovery · ${esc(prospectSlug || 'canonical demo')}</p>
  <h1>${esc(s.business)}</h1>
  <p class="meta">Last 30 days · ${s.callsMissed} missed calls intercepted · $${recoveredDollars.toLocaleString()} recovered (sample)</p>
  <div class="kpis">
    <div class="kpi"><div class="kpi-label">Missed → SMS</div><div class="kpi-num">${s.callsMissed}</div><div class="kpi-sub">within 4 seconds</div></div>
    <div class="kpi"><div class="kpi-label">Replied</div><div class="kpi-num">${s.smsReplied}</div><div class="kpi-sub">${Math.round((s.smsReplied/s.smsAutoSent)*100)}% engagement</div></div>
    <div class="kpi"><div class="kpi-label">Auto-booked</div><div class="kpi-num">${s.bookedAutomatically}</div><div class="kpi-sub">no human required</div></div>
    <div class="kpi"><div class="kpi-label">Escalated</div><div class="kpi-num">${s.escalatedToHuman}</div><div class="kpi-sub">emergencies + complex</div></div>
  </div>
  <h2>Recovery sample (last week)</h2>
  ${s.sample.map(renderCall).join('')}
  <h2>How it works</h2>
  <ol class="flow">
    <li><strong>Twilio webhook.</strong> Any inbound call your business misses (busy / no answer / voicemail) fires a webhook to our worker within 1 second.</li>
    <li><strong>Instant SMS.</strong> We send a friendly, personalized SMS from the same business number: "Hi — saw I missed your call. What's going on?"</li>
    <li><strong>Claude reply handler.</strong> Customer replies → we classify (emergency / quote request / general / spam) and either book via Cal.com or escalate to your phone.</li>
    <li><strong>Staff summary.</strong> Every recovered call goes into the daily digest with the SMS thread, classification, and outcome.</li>
  </ol>
  <h2>For sales</h2>
  <p class="lede">Block 12 is $750 setup · $250/mo. Highest-ROI block in the arsenal — the average HVAC / plumber / contractor misses 40+ calls/month; each call is $200-500 in deferred revenue. Pays back in week 1. Deploy: <code>/cafecito-blocks:recovery &lt;prospect-slug&gt;</code></p>
  <div class="cta-row">
    <a class="btn-outline" href="https://cafecito-ai.com/new-hire/blocks/${esc(block.slug)}">Read the playbook</a>
    <a class="btn-outline" href="https://github.com/eratner15/block-recovery">GitHub mirror</a>
  </div>
  <footer>Cafecito Blocks · recovery.cafecito-ai.com</footer>
</main>
</body></html>`;
}

function renderCall(c) {
  return `<div class="call">
    <div class="call-h">
      <strong>${esc(c.phone)}</strong>
      <span class="call-time">missed ${esc(c.missedAt)} · SMS sent ${esc(c.smsSent)}</span>
      ${c.recovered ? `<span class="recovered">+$${c.recovered}</span>` : ''}
    </div>
    <div class="reply">"${esc(c.reply.replace(/^["“]|["”]$/g, ''))}"</div>
    <div class="outcome">→ ${esc(c.outcome)}</div>
  </div>`;
}

function styles() {
  return `<style>
*{box-sizing:border-box}
body{margin:0;background:#f5f1ea;color:#0f0e0c;font:15px/1.55 ui-sans-serif,system-ui,-apple-system,"Inter Tight",sans-serif}
main{max-width:780px;margin:0 auto;padding:48px 24px 96px}
.eyebrow{font:500 11px/1 ui-monospace,monospace;letter-spacing:0.16em;text-transform:uppercase;color:#b8412c;margin:0 0 14px}
h1{font:700 30px/1.15 "Fraunces",Georgia,serif;margin:0 0 6px}
.meta{font:400 13px/1.4 ui-sans-serif,system-ui;color:#6b6660;margin:0 0 24px}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:0 0 32px}
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
.lede{font-size:15px;color:#2a2723;line-height:1.55;margin:0 0 16px}
.btn-outline{display:inline-block;padding:10px 16px;border:1px solid #0f0e0c;border-radius:4px;text-decoration:none;color:#0f0e0c;font:500 13px/1 ui-sans-serif,system-ui;background:#fff}
.cta-row{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 36px}
code{font-family:ui-monospace,monospace;background:#ece5d8;padding:2px 6px;border-radius:3px;font-size:0.9em}
footer{font:400 12px/1.5 ui-sans-serif,system-ui;color:#6b6660;border-top:1px solid #d9d4ca;padding-top:18px}
</style>`;
}

function esc(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function html200(html){return new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=60, must-revalidate'}});}
