// Cold Outreach Engine — Block 08
// UCC / Sunbiz / Apollo data → Claude personalization → sequencer → calendar.

import { resolveProspect } from './lib/resolve-prospect.js';

const SHOWCASE_PIPELINE = {
  campaign: 'MCA brokers · Q2 2026',
  prospectsLoaded: 412,
  enriched: 387,
  firstMessageSent: 387,
  replied: 71,
  qualified: 24,
  meetingsBooked: 9,
  sample: [
    { name: 'Brian Corso', firm: 'AC Group',          stage: 'Meeting booked', value: '$25k/mo target', note: 'Replied "Yes — Tuesday 2pm." Discovery on calendar.' },
    { name: 'James Lexington', firm: 'Lexington Recovery', stage: 'Replied — pricing q', value: '$8k/mo target', note: 'Asked about per-broker pricing tier. Auto-replied with pricing PDF.' },
    { name: 'Daniela Vera', firm: 'CapVerde Funding', stage: 'Sent (no reply)',   value: '$12k/mo target', note: '7 days no response. Followup #2 sends Friday.' },
    { name: 'Marcus Reid',  firm: 'Reid Industries',  stage: 'Disqualified',     value: null,             note: 'Out-of-vertical (manufacturing); auto-removed from sequence.' },
  ],
};

export async function handleOutreach(request, env, ctx, url, block, _routerProspectSlug) {
  const segments = url.pathname.split('/').filter(Boolean);
  let prospectSlug = null;
  let scope = { ...SHOWCASE_PIPELINE };
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
  return html200(renderPage(scope, prospectSlug, block));
}

function renderPage(p, prospectSlug, block) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cold Outreach Engine — ${esc(p.campaign)}</title>
${styles()}
</head><body>
<main>
  <p class="eyebrow">Block 08 · Cold Outreach Engine · ${esc(prospectSlug || 'canonical demo')}</p>
  <h1>Cold outreach that reads like a human wrote it.</h1>
  <p class="meta">${esc(p.campaign)} · last 14 days</p>
  <div class="funnel">
    <div class="step"><div class="num">${p.prospectsLoaded}</div><div class="label">Prospects loaded</div><div class="sub">UCC / Sunbiz / Apollo</div></div>
    <div class="arrow">→</div>
    <div class="step"><div class="num">${p.enriched}</div><div class="label">Enriched</div><div class="sub">decision-maker email found</div></div>
    <div class="arrow">→</div>
    <div class="step"><div class="num">${p.firstMessageSent}</div><div class="label">First message sent</div><div class="sub">Claude-written, prospect-specific</div></div>
    <div class="arrow">→</div>
    <div class="step success"><div class="num">${p.replied}</div><div class="label">Replied</div><div class="sub">${Math.round((p.replied/p.firstMessageSent)*100)}%</div></div>
    <div class="arrow">→</div>
    <div class="step success"><div class="num">${p.meetingsBooked}</div><div class="label">Booked</div><div class="sub">on the calendar</div></div>
  </div>
  <h2>Sample pipeline</h2>
  <table>
    <thead><tr><th>Prospect</th><th>Stage</th><th>Target value</th><th>Latest</th></tr></thead>
    <tbody>
      ${p.sample.map(s => `<tr>
        <td><strong>${esc(s.name)}</strong><div class="firm">${esc(s.firm)}</div></td>
        <td><span class="stage stage-${esc(slugify(s.stage))}">${esc(s.stage)}</span></td>
        <td class="num">${esc(s.value || '—')}</td>
        <td class="note">${esc(s.note)}</td>
      </tr>`).join('')}
    </tbody>
  </table>
  <h2>How it works</h2>
  <ol class="flow">
    <li><strong>Data ingest.</strong> Apollo (people + firmographics), UCC filings (active MCA borrowers), Sunbiz (recently registered FL businesses). De-duplicate. Score by fit.</li>
    <li><strong>Per-prospect research.</strong> Claude reads each prospect's site, LinkedIn (cached), and recent news. Generates 3 specific things to reference in the first message.</li>
    <li><strong>First message + 3-touch sequence.</strong> Each message references the 3 specific things. Sequence pauses on reply. Auto-removes opt-outs.</li>
    <li><strong>Reply handler.</strong> Replies are classified (interest / pricing question / objection / disqualified). Either books a meeting via Cal.com or routes to a human.</li>
    <li><strong>Calendar drop.</strong> Booked meetings drop into your Cal.com. The agent writes a 3-line pre-meeting brief.</li>
  </ol>
  <h2>For sales</h2>
  <p class="lede">Block 08 is $5,000 setup · $1,200/mo + data costs. Most expensive block but highest revenue per closed deal. Best fit: any service business with average deal size > $5k where outbound is the growth lever. Deploy: <code>/cafecito-blocks:outreach &lt;prospect-slug&gt;</code></p>
  <div class="cta-row">
    <a class="btn-outline" href="https://cafecito-ai.com/new-hire/blocks/${esc(block.slug)}">Read the playbook</a>
    <a class="btn-outline" href="https://github.com/cafecito-ai/block-outreach">GitHub mirror</a>
  </div>
  <footer>Cafecito Blocks · outreach.cafecito-ai.com</footer>
</main>
</body></html>`;
}

function slugify(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

function styles() {
  return `<style>
*{box-sizing:border-box}
body{margin:0;background:#f5f1ea;color:#0f0e0c;font:15px/1.55 ui-sans-serif,system-ui,-apple-system,"Inter Tight",sans-serif}
main{max-width:920px;margin:0 auto;padding:48px 24px 96px}
.eyebrow{font:500 11px/1 ui-monospace,monospace;letter-spacing:0.16em;text-transform:uppercase;color:#b8412c;margin:0 0 14px}
h1{font:700 32px/1.15 "Fraunces",Georgia,serif;margin:0 0 6px}
.meta{font:400 13px/1.4 ui-sans-serif,system-ui;color:#6b6660;margin:0 0 28px}
.funnel{display:flex;align-items:center;gap:8px;margin:0 0 36px;overflow-x:auto;padding:4px 0}
.step{background:#fff;border:1px solid #d9d4ca;border-radius:6px;padding:14px 16px;min-width:140px;text-align:center}
.step.success{background:#1f3a2e;color:#f5f1ea;border-color:#1f3a2e}
.step.success .label,.step.success .sub{color:#b8d4c8}
.num{font:700 28px/1 "Fraunces",Georgia,serif}
.label{font:500 11px/1 ui-monospace,monospace;letter-spacing:0.12em;text-transform:uppercase;color:#6b6660;margin:6px 0 0}
.sub{font:400 11px/1.3 ui-sans-serif,system-ui;color:#6b6660;margin:4px 0 0}
.arrow{color:#9b948b;font-size:14px;font-weight:600}
h2{font:600 20px/1.2 "Fraunces",Georgia,serif;margin:32px 0 14px}
table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #d9d4ca;border-radius:6px;overflow:hidden;margin:0 0 24px;font-size:13px}
th,td{padding:12px 14px;text-align:left;border-bottom:1px solid #ece5d8;vertical-align:top}
th{background:#ece5d8;font:600 11px/1 ui-sans-serif,system-ui;text-transform:uppercase;letter-spacing:0.04em;color:#0f0e0c}
.firm{font:400 11px/1 ui-monospace,monospace;color:#6b6660;margin-top:3px}
.stage{display:inline-block;padding:3px 9px;border-radius:11px;background:#ece5d8;font-size:10px;letter-spacing:0.04em;text-transform:uppercase;font-weight:600;color:#0f0e0c}
.stage-meeting-booked{background:#d4ecd5;color:#1f3a2e}
.stage-replied-pricing-q{background:#cfdef5;color:#1a3a6b}
.stage-disqualified{background:#f5d4cc;color:#8a2210}
.num{text-align:right;font-variant-numeric:tabular-nums}
.note{font-size:12px;color:#2a2723}
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
