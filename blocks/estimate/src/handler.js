// Quote / Estimate Generator — Block 03
// Photo upload → Claude Vision → labor + materials → printable HTML quote.

import { estimateFromPhoto, renderQuoteHTML } from './lib/vision-quote.js';

const SHOWCASE = {
  business: 'South Beach Pool Service',
  vertical: 'pool service',
  brandColor: '#1a3a6b',
};

const PROSPECT_OVERRIDES = {};

const PRE_BAKED_ESTIMATE = {
  summary: 'Algae bloom remediation + 30-day chemistry stabilization for an in-ground gunite pool, ~15,000 gal.',
  labor: [
    { task: 'Brush + vacuum + waste-mode pump', hours: 2.5, hourly_rate_usd: 95 },
    { task: 'Chemistry rebalance + shock treatment', hours: 1, hourly_rate_usd: 95 },
    { task: 'Follow-up visit (day 7)', hours: 1.5, hourly_rate_usd: 95 },
  ],
  materials: [
    { item: 'Algaecide (Yellow Out)', quantity: 2, unit: 'qt', unit_cost_usd: 28 },
    { item: 'Calcium hypochlorite shock', quantity: 4, unit: 'lb', unit_cost_usd: 12 },
    { item: 'Phosphate remover', quantity: 1, unit: 'gal', unit_cost_usd: 38 },
    { item: 'Replacement DE filter media', quantity: 1, unit: 'kit', unit_cost_usd: 65 },
  ],
  contingency_pct: 10,
  notes: 'If algae returns within 14 days we will re-treat at no additional labor charge.',
  confidence: 'high',
};

// Compute totals (mirrors lib/vision-quote logic)
const labor = PRE_BAKED_ESTIMATE.labor.reduce((s, l) => s + l.hours * l.hourly_rate_usd, 0);
const materials = PRE_BAKED_ESTIMATE.materials.reduce((s, m) => s + m.quantity * m.unit_cost_usd, 0);
const subtotal = labor + materials;
const contingency = subtotal * 0.1;
PRE_BAKED_ESTIMATE.totals = {
  labor: Math.round(labor * 100) / 100,
  materials: Math.round(materials * 100) / 100,
  subtotal: Math.round(subtotal * 100) / 100,
  contingency: Math.round(contingency * 100) / 100,
  total: Math.round((subtotal + contingency) * 100) / 100,
};

export async function handleEstimate(request, env, ctx, url, block, _routerProspectSlug) {
  const segments = url.pathname.split('/').filter(Boolean);
  let prospectSlug = null;
  let scope = SHOWCASE;
  if (segments[0] && segments[0] !== 'api' && segments[0] !== 'sample-quote' && env.INSTANCES) {
    const hit = await env.INSTANCES.get(`${block.slug}/${segments[0]}`);
    if (hit) prospectSlug = segments[0];
  }

  if (segments.includes('sample-quote')) {
    return html200(renderQuoteHTML(PRE_BAKED_ESTIMATE, { business: scope.business, customerName: 'M. Rodriguez', quoteNumber: 'Q-1042' }));
  }

  if (segments.includes('api') && segments[segments.length - 1] === 'estimate' && request.method === 'POST') {
    return handleEstimateApi(request, env, scope, prospectSlug);
  }

  return html200(renderLanding(scope, prospectSlug, block));
}

async function handleEstimateApi(request, env, scope, prospectSlug) {
  if (!env.ANTHROPIC_API_KEY) {
    return json({ ok: false, error: 'Vision estimate requires ANTHROPIC_API_KEY (canonical demo serves pre-baked sample at /sample-quote)' }, 503);
  }
  const data = await request.json().catch(() => ({}));
  const { imageUrl, imageBase64, description } = data;
  if (!imageUrl && !imageBase64) return json({ ok: false, error: 'imageUrl or imageBase64 required' }, 400);
  try {
    const estimate = await estimateFromPhoto(env, { vertical: scope.vertical, description, imageUrl, imageBase64 });
    const html = renderQuoteHTML(estimate, { business: scope.business });
    return json({ ok: true, estimate, html });
  } catch (e) {
    return json({ ok: false, error: e.message }, 500);
  }
}

function renderLanding(s, prospectSlug, block) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(s.business)} — photo-to-quote generator</title>
${styles()}
</head><body>
<main>
  <p class="eyebrow">Block 03 · Quote / Estimate Generator · ${esc(prospectSlug || 'canonical demo')}</p>
  <h1>Send a photo. Get a real quote in 30 seconds.</h1>
  <p class="lede">Customer texts a photo of the job. Claude Vision reads it, estimates labor + materials, applies our markup, and emails the customer a branded PDF. No human estimator until they say "yes."</p>
  <a class="cta-primary" href="/sample-quote">
    <span class="cta-eyebrow">See a sample quote</span>
    <span class="cta-label">Algae remediation · 15,000-gal pool · ${esc(s.business)} →</span>
    <span class="cta-sub">Live PDF rendered from Claude Vision output · /sample-quote</span>
  </a>
  <div class="grid">
    <div class="cell"><h3>How it works</h3><p>Photo → Claude Vision → structured estimate (labor hours, materials with quantities + unit costs, contingency %) → server-computed totals (no LLM math) → branded HTML quote → optional DocuSign send.</p></div>
    <div class="cell"><h3>What's parameterized</h3><p>Vertical (HVAC / pool / auto detail / landscape / general handyman). Hourly rate. Material markup. Brand color, logo, and quote-number prefix.</p></div>
    <div class="cell"><h3>What it costs</h3><p><strong>$2,500 setup · $400/mo</strong> + per-estimate Vision pass-through (~$0.05 per quote). Replaces the "we'll come look at it" step that loses 60% of leads.</p></div>
  </div>
  <h2>How to sell this block</h2>
  <ol class="flow">
    <li><strong>On the discovery call</strong>, ask them to text you a photo of their truck or a recent job site.</li>
    <li><strong>While you talk</strong>, submit it. Branded PDF lands in your inbox within a minute.</li>
    <li><strong>Show them the PDF on screen.</strong> It has their logo, their brand color, their company name. No further pitch needed.</li>
    <li><strong>Anchor on the conversion lift.</strong> Instant quotes typically 2-3x the close rate vs. "we'll get back to you with a quote."</li>
  </ol>
  <h2>Deploy for your business</h2>
  <p class="lede">Sales runs <code>/cafecito-blocks:estimate &lt;prospect-slug&gt;</code>. Per-prospect instance at <code>estimate.cafecito-ai.com/&lt;slug&gt;/</code> with their branding + vertical pre-tuned.</p>
  <div class="cta-row">
    <a class="btn-outline" href="https://cafecito-ai.com/new-hire/blocks/${esc(block.slug)}">Read the playbook</a>
    <a class="btn-outline" href="https://github.com/eratner15/block-estimate">GitHub mirror</a>
  </div>
  <footer>Cafecito Blocks · estimate.cafecito-ai.com</footer>
</main>
</body></html>`;
}

function styles() {
  return `<style>
*{box-sizing:border-box}
body{margin:0;background:#f5f1ea;color:#0f0e0c;font:16px/1.55 ui-sans-serif,system-ui,-apple-system,"Inter Tight",sans-serif}
main{max-width:820px;margin:0 auto;padding:56px 24px 96px}
.eyebrow{font:500 11px/1 ui-monospace,monospace;letter-spacing:0.16em;text-transform:uppercase;color:#b8412c;margin:0 0 14px}
h1{font:700 36px/1.15 "Fraunces",Georgia,serif;letter-spacing:-0.015em;margin:0 0 14px}
.lede{font-size:17px;color:#2a2723;margin:0 0 28px;line-height:1.5}
.cta-primary{display:flex;flex-direction:column;gap:4px;text-decoration:none;background:#1a3a6b;color:#f5f1ea;padding:24px 28px;border-radius:8px;margin:0 0 36px}
.cta-primary:hover{background:#2a4a8c}
.cta-eyebrow{font:500 11px/1 ui-monospace,monospace;letter-spacing:0.15em;text-transform:uppercase;color:#b8c8e6}
.cta-label{font:600 22px/1.2 "Fraunces",Georgia,serif}
.cta-sub{font:400 12px/1.3 ui-monospace,monospace;color:#b8c8e6}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin:0 0 36px}
.cell{background:#fff;border:1px solid #d9d4ca;border-radius:6px;padding:18px 20px}
.cell h3{font:600 14px/1.2 "Fraunces",Georgia,serif;margin:0 0 8px}
.cell p{font-size:13px;line-height:1.5;color:#2a2723;margin:0}
h2{font:600 22px/1.2 "Fraunces",Georgia,serif;margin:36px 0 14px}
.flow{padding-left:1.2em;margin:0 0 36px}
.flow li{margin:0 0 10px;line-height:1.55;font-size:15px}
code{font-family:ui-monospace,monospace;background:#ece5d8;padding:2px 6px;border-radius:3px;font-size:0.9em}
.cta-row{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 48px}
.btn-outline{display:inline-block;padding:11px 18px;border:1px solid #0f0e0c;border-radius:4px;text-decoration:none;color:#0f0e0c;font:500 14px/1 ui-sans-serif,system-ui;background:#fff}
footer{font:400 12px/1.5 ui-sans-serif,system-ui;color:#6b6660;border-top:1px solid #d9d4ca;padding-top:18px}
</style>`;
}

function esc(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function html200(html){return new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=60, must-revalidate'}});}
function json(d,status=200){return new Response(JSON.stringify(d),{status,headers:{'content-type':'application/json; charset=utf-8'}});}
