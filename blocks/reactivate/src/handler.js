// SMS Reactivation Agent — Block 07
// CSV import → Twilio outbound SMS → Claude reply handler → Cal.com booking

import { resolveProspect } from './lib/resolve-prospect.js';

const SHOWCASE = {
  business: 'Brickell Glow Med Spa',
  segment: 'Customers who haven\'t booked in 90+ days',
  pulled: 142,
  reachable: 128,
  sample: [
    { name: 'Carmen R.', last: '108 days ago', service: 'HydraFacial', status: 'replied', booked: true, msg: '"Hola Carmen — Brickell Glow says hi. You\'re due for your next HydraFacial. We saved you $20 for this month if you book before the 31st. Want to grab Tuesday 6pm?"' },
    { name: 'James T.',  last: '94 days ago',  service: 'IPL photofacial', status: 'replied', booked: false, msg: '"Hi James — Brickell Glow checking in. It\'s been 3 months since your IPL — most clients re-treat at 90 days. Tuesday 4pm or Wednesday 6pm?"' },
    { name: 'Lisa K.',   last: '127 days ago', service: 'Botox + filler',  status: 'pending', booked: false, msg: '"Hi Lisa — Brickell Glow. We have your touch-up reminder set for this week. Want to book a 30-min slot?"' },
    { name: 'Patricia M.', last: '156 days ago', service: 'Laser hair removal', status: 'opted out', booked: false, msg: 'Opt-out received. Excluded from future campaigns.' },
  ],
};

export async function handleReactivate(request, env, ctx, url, block, _routerProspectSlug) {
  const segments = url.pathname.split('/').filter(Boolean);
  let prospectSlug = null;
  let scope = { ...SHOWCASE };
  if (segments[0] && segments[0] !== 'api' && env.INSTANCES) {
    const hit = await env.INSTANCES.get(`${block.slug}/${segments[0]}`);
    if (hit) {
      prospectSlug = segments[0];
      try {
        const _inst = JSON.parse(hit);
        if (_inst && _inst.overrides) Object.assign(scope, _inst.overrides);
      } catch (_e) {}
    }
  }
  return html200(renderDashboard(scope, prospectSlug, block));
}

function renderDashboard(s, prospectSlug, block) {
  const replied = s.sample.filter(c => c.status === 'replied').length;
  const booked = s.sample.filter(c => c.booked).length;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(s.business)} — reactivation campaign</title>
${styles()}
</head><body>
<main>
  <p class="eyebrow">Block 07 · SMS Reactivation Agent · ${esc(prospectSlug || 'canonical demo')}</p>
  <h1>${esc(s.business)}</h1>
  <p class="meta">${esc(s.segment)} · ${s.pulled} pulled · ${s.reachable} reachable · campaign live</p>
  <div class="kpis">
    <div class="kpi"><div class="kpi-label">Sent</div><div class="kpi-num">${s.reachable}</div></div>
    <div class="kpi"><div class="kpi-label">Replied</div><div class="kpi-num">${replied}</div><div class="kpi-sub">${Math.round((replied/s.sample.length)*100)}% reply rate</div></div>
    <div class="kpi"><div class="kpi-label">Booked</div><div class="kpi-num">${booked}</div><div class="kpi-sub">Cal.com confirmed</div></div>
  </div>
  <h2>Sample threads</h2>
  ${s.sample.map(c => renderThread(c)).join('')}
  <h2>How it works</h2>
  <ol class="flow">
    <li><strong>CSV import.</strong> Your CRM export with name, phone, last_visit_at, last_service. We segment by recency.</li>
    <li><strong>Personalized first message.</strong> Claude writes the SMS using the customer's service history. Spanish/English by name + ZIP heuristic.</li>
    <li><strong>Reply handler.</strong> Replies are classified (interest / objection / opt-out) and either book via Cal.com mid-conversation or escalate to staff.</li>
    <li><strong>Opt-out honored.</strong> STOP keyword auto-unsubscribes. We never message someone who opted out.</li>
  </ol>
  <h2>For sales</h2>
  <p class="lede">Block 07 is $1,500 setup · $400/mo + SMS pass-through. Typical lift: 12-18% reactivation rate on 90+ day inactive lists. Anchor on "your CRM has 800 customers who haven't been back in 6 months — that's $40k+ in deferred revenue." Deploy: <code>/cafecito-blocks:reactivate &lt;prospect-slug&gt;</code></p>
  <div class="cta-row">
    <a class="btn-outline" href="https://cafecito-ai.com/new-hire/blocks/${esc(block.slug)}">Read the playbook</a>
    <a class="btn-outline" href="https://github.com/cafecito-ai/block-reactivate">GitHub mirror</a>
  </div>
  <footer>Cafecito Blocks · reactivate.cafecito-ai.com</footer>
</main>
</body></html>`;
}

function renderThread(c) {
  const tone = c.booked ? 'booked' : c.status === 'opted out' ? 'opt-out' : c.status === 'replied' ? 'replied' : 'pending';
  return `<div class="thread thread-${tone}">
    <div class="thread-h">
      <strong>${esc(c.name)}</strong>
      <span class="thread-meta">last visit ${esc(c.last)} · ${esc(c.service)}</span>
      <span class="badge badge-${tone}">${c.booked ? '✓ booked' : c.status}</span>
    </div>
    <div class="thread-msg">${esc(c.msg)}</div>
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
.kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:0 0 32px}
.kpi{background:#fff;border:1px solid #d9d4ca;border-radius:6px;padding:16px 18px}
.kpi-label{font:500 11px/1 ui-monospace,monospace;letter-spacing:0.14em;text-transform:uppercase;color:#6b6660;margin:0 0 6px}
.kpi-num{font:700 28px/1 "Fraunces",Georgia,serif;color:#1f3a2e}
.kpi-sub{font:400 12px/1.3 ui-sans-serif,system-ui;color:#6b6660;margin:5px 0 0}
h2{font:600 20px/1.2 "Fraunces",Georgia,serif;margin:32px 0 14px}
.thread{background:#fff;border:1px solid #d9d4ca;border-radius:6px;padding:14px 18px;margin:0 0 10px}
.thread-h{display:flex;gap:10px;align-items:baseline;margin:0 0 8px;flex-wrap:wrap}
.thread-meta{font:400 12px/1 ui-monospace,monospace;color:#6b6660}
.badge{margin-left:auto;font:600 11px/1 ui-sans-serif,system-ui;padding:3px 9px;border-radius:11px;text-transform:uppercase;letter-spacing:0.04em}
.badge-booked{background:#d4ecd5;color:#1f3a2e}
.badge-replied{background:#cfdef5;color:#1a3a6b}
.badge-pending{background:#ece5d8;color:#6b6660}
.badge-opt-out{background:#f5d4cc;color:#8a2210}
.thread-msg{font-size:13px;line-height:1.5;color:#2a2723;padding-left:12px;border-left:2px solid #d9d4ca}
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
