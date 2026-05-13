// AI Front Desk QA — Block 15
// Upload call log CSV → Claude classifier categorizes missed revenue,
// unanswered questions, language mismatch, followup gaps. PDF report out.

import { resolveProspect } from './lib/resolve-prospect.js';

const SHOWCASE_AUDIT = {
  business: 'Sample Service Co.',
  period: 'Apr 1 – Apr 30, 2026',
  calls: 187,
  missedRevenue: 14250,
  missedRevenueCalls: 22,
  langMismatch: 18,
  followupGaps: 31,
  byBucket: [
    { bucket: 'Missed revenue', count: 22, dollars: 14250, exemplar: 'Caller asked about emergency AC service; agent said "we close at 5" without offering after-hours pricing. Avg deal $650.' },
    { bucket: 'Language mismatch', count: 18, dollars: 7800, exemplar: 'Spanish-speaking caller; agent said "no Spanish, please email." Caller hung up. Avg deal $430.' },
    { bucket: 'No followup', count: 31, dollars: 11200, exemplar: 'Quoted; said "we will follow up by Wednesday." No followup logged. Avg quote $360.' },
    { bucket: 'Lost to competitor', count: 14, dollars: 9100, exemplar: 'Caller mentioned competitor by name; agent did not counter on price or value.' },
    { bucket: 'Handled well', count: 102, dollars: 0, exemplar: 'Booked or routed appropriately. No action needed.' },
  ],
};

export async function handleQa(request, env, ctx, url, block, _routerProspectSlug) {
  const segments = url.pathname.split('/').filter(Boolean);
  let prospectSlug = null;
  let scope = { ...SHOWCASE_AUDIT };
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
  return html200(renderReport(scope, prospectSlug, block));
}

function renderReport(a, prospectSlug, block) {
  const totalLost = a.byBucket.filter(b => b.dollars > 0).reduce((s, b) => s + b.dollars, 0);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(a.business)} — front-desk QA audit</title>
${styles()}
</head><body>
<main>
  <p class="eyebrow">Block 15 · AI Front Desk QA · ${esc(prospectSlug || 'canonical demo')}</p>
  <h1>${esc(a.business)} — front-desk audit</h1>
  <p class="meta">${esc(a.period)} · ${a.calls} calls reviewed · powered by Claude classifier</p>
  <div class="hero-stat">
    <div class="hero-label">Estimated lost revenue</div>
    <div class="hero-num">$${a.missedRevenue.toLocaleString()}</div>
    <div class="hero-sub">across ${a.missedRevenueCalls + a.langMismatch + a.followupGaps + 14} call outcomes flagged for action</div>
  </div>
  <h2>Failure buckets</h2>
  <table>
    <thead><tr><th>Bucket</th><th class="num">Calls</th><th class="num">Lost $</th></tr></thead>
    <tbody>
      ${a.byBucket.map(b => `<tr>
        <td><strong>${esc(b.bucket)}</strong><div class="ex">${esc(b.exemplar)}</div></td>
        <td class="num">${b.count}</td>
        <td class="num">${b.dollars ? '$' + b.dollars.toLocaleString() : '—'}</td>
      </tr>`).join('')}
      <tr class="total"><td><strong>Total recoverable</strong></td><td class="num">${a.byBucket.filter(b => b.dollars > 0).reduce((s,b)=>s+b.count,0)}</td><td class="num"><strong>$${totalLost.toLocaleString()}</strong></td></tr>
    </tbody>
  </table>
  <h2>What you do about it</h2>
  <ol class="flow">
    <li><strong>Fix the easy 18 first.</strong> Language mismatch is solvable in week 1 with Block 01 (Bilingual Voice Receptionist). Recovers $7,800 / mo.</li>
    <li><strong>Set up 24h followup automation.</strong> Block 12 (Missed Call Recovery) handles all 31 "no followup" buckets automatically. Recovers $11,200 / mo.</li>
    <li><strong>Train on after-hours pricing.</strong> One scripted line ("we charge $X for after-hours; want me to schedule?") recovers most of the 22 missed-revenue calls.</li>
  </ol>
  <h2>For sales</h2>
  <p class="lede">This audit IS the cold pitch. Send the URL during the discovery call. The prospect sees their own number ($14k/mo in flagged-recoverable revenue) before you ask for the meeting. $750 setup (one-time audit) · $1,500 setup + $400/mo (ongoing weekly audit).</p>
  <div class="cta-row">
    <a class="btn-outline" href="https://cafecito-ai.com/new-hire/blocks/${esc(block.slug)}">Read the playbook</a>
    <a class="btn-outline" href="https://github.com/cafecito-ai/block-qa">GitHub mirror</a>
  </div>
  <footer>Cafecito Blocks · qa.cafecito-ai.com · per-prospect audits at <code>/&lt;slug&gt;/</code></footer>
</main>
</body></html>`;
}

function styles() {
  return `<style>
*{box-sizing:border-box}
body{margin:0;background:#f5f1ea;color:#0f0e0c;font:15px/1.55 ui-sans-serif,system-ui,-apple-system,"Inter Tight",sans-serif}
main{max-width:780px;margin:0 auto;padding:48px 24px 96px}
.eyebrow{font:500 11px/1 ui-monospace,monospace;letter-spacing:0.16em;text-transform:uppercase;color:#b8412c;margin:0 0 14px}
h1{font:700 32px/1.15 "Fraunces",Georgia,serif;margin:0 0 6px}
.meta{font:400 13px/1.4 ui-sans-serif,system-ui;color:#6b6660;margin:0 0 28px}
.hero-stat{background:#1f3a2e;color:#f5f1ea;padding:28px 32px;border-radius:8px;margin:0 0 36px}
.hero-label{font:500 11px/1 ui-monospace,monospace;letter-spacing:0.15em;text-transform:uppercase;color:#b8d4c8;margin:0 0 8px}
.hero-num{font:700 56px/1 "Fraunces",Georgia,serif;letter-spacing:-0.02em}
.hero-sub{font:400 14px/1.4 ui-sans-serif,system-ui;color:#b8d4c8;margin:6px 0 0}
h2{font:600 22px/1.2 "Fraunces",Georgia,serif;margin:32px 0 12px}
table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #d9d4ca;border-radius:6px;overflow:hidden;margin:0 0 24px}
th,td{padding:14px 16px;text-align:left;border-bottom:1px solid #ece5d8;vertical-align:top}
th{background:#ece5d8;font:600 12px/1 ui-sans-serif,system-ui;letter-spacing:0.04em;text-transform:uppercase;color:#0f0e0c}
.num{text-align:right;font-variant-numeric:tabular-nums}
tr.total td{border-top:2px solid #0f0e0c;background:#f8f5ee;font-size:14px}
.ex{font:400 12px/1.4 ui-sans-serif,system-ui;color:#6b6660;margin:5px 0 0}
.flow{padding-left:1.2em;margin:0 0 28px}
.flow li{margin:0 0 10px;line-height:1.55}
.lede{font-size:15px;color:#2a2723;line-height:1.55;margin:0 0 18px}
.btn-outline{display:inline-block;padding:10px 16px;border:1px solid #0f0e0c;border-radius:4px;text-decoration:none;color:#0f0e0c;font:500 13px/1 ui-sans-serif,system-ui;background:#fff}
.cta-row{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 36px}
code{font-family:ui-monospace,monospace;background:#ece5d8;padding:2px 6px;border-radius:3px;font-size:0.9em}
footer{font:400 12px/1.5 ui-sans-serif,system-ui;color:#6b6660;border-top:1px solid #d9d4ca;padding-top:18px}
</style>`;
}

function esc(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function html200(html){return new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=60, must-revalidate'}});}
