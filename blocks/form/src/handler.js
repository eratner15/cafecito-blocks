// Vertical Quote Form Rebuilder — Block 16
// Generates a 3-question vertical-specific form. Used by sales as a swap-out
// for prospects with generic contact forms.

import { resolveProspect } from './lib/resolve-prospect.js';

const VERTICALS = {
  hvac: {
    name: 'HVAC',
    questions: [
      { id: 'service', label: 'What needs attention?', type: 'select', options: ['AC not cooling', 'Heating not working', 'New install / replacement', 'Maintenance', 'Something else'] },
      { id: 'urgency', label: 'How urgent?',           type: 'select', options: ['Today (emergency)', 'This week', 'This month', 'Just getting quotes'] },
      { id: 'address', label: 'Service address or ZIP',type: 'text' },
    ],
    cta: 'Get my quote',
  },
  law: {
    name: 'Law firm',
    questions: [
      { id: 'matter',  label: 'What matter?', type: 'select', options: ['Eviction / landlord-tenant', 'Personal injury', 'Family law', 'Criminal defense', 'Business contracts', 'Other'] },
      { id: 'urgency', label: 'Hearing or deadline?', type: 'select', options: ['Yes — within 7 days', 'Yes — within 30 days', 'No deadline yet', 'Not sure'] },
      { id: 'state',   label: 'State', type: 'text' },
    ],
    cta: 'Request consultation',
  },
  landscaping: {
    name: 'Landscaping',
    questions: [
      { id: 'service', label: 'What do you need?', type: 'select', options: ['Lawn mowing', 'Tree work', 'Garden design', 'Cleanup / leaf removal', 'Irrigation', 'Hardscaping'] },
      { id: 'size',    label: 'Property size',     type: 'select', options: ['Under 1/4 acre', '1/4–1/2 acre', '1/2–1 acre', 'Over 1 acre'] },
      { id: 'address', label: 'Service address',   type: 'text' },
    ],
    cta: 'Get my estimate',
  },
  pool: {
    name: 'Pool service',
    questions: [
      { id: 'service',  label: 'What needs attention?', type: 'select', options: ['Weekly cleaning', 'Equipment repair', 'New pool', 'Resurfacing', 'Heater install', 'Other'] },
      { id: 'poolType', label: 'Pool type', type: 'select', options: ['In-ground gunite', 'In-ground vinyl', 'In-ground fiberglass', 'Above-ground'] },
      { id: 'address',  label: 'Service address',  type: 'text' },
    ],
    cta: 'Schedule visit',
  },
  default: {
    name: 'Generic',
    questions: [
      { id: 'service', label: 'What do you need?', type: 'text' },
      { id: 'urgency', label: 'How soon?', type: 'select', options: ['ASAP', 'This week', 'This month', 'Flexible'] },
      { id: 'contact', label: 'Best way to reach you', type: 'text' },
    ],
    cta: 'Send my request',
  },
};

const SHOWCASE = { business: 'Sample Service Co.', vertical: 'hvac', email: 'demo@cafecito-ai.com' };
const PROSPECT_OVERRIDES = {};

export async function handleForm(request, env, ctx, url, block, _routerProspectSlug) {
  const segments = url.pathname.split('/').filter(Boolean);
  let prospectSlug = null;
  let scope = SHOWCASE;

  // Allow ?v=law or /vertical/law/ on canonical
  const urlVertical = url.searchParams.get('v');
  if (segments[0] === 'vertical' && segments[1] && VERTICALS[segments[1]]) {
    scope = { ...SHOWCASE, vertical: segments[1] };
  } else if (urlVertical && VERTICALS[urlVertical]) {
    scope = { ...SHOWCASE, vertical: urlVertical };
  }

  if (segments[0] && segments[0] !== 'api' && segments[0] !== 'vertical' && env.INSTANCES) {
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

  if (segments.includes('api')) return handleApi(request, env, scope, prospectSlug);

  return html200(renderPage(scope, prospectSlug, block));
}

async function handleApi(request, env, scope, prospectSlug) {
  if (request.method !== 'POST') return json({ error: 'POST required' }, 405);
  const data = await request.json().catch(() => ({}));
  // For canonical demo, just echo back. Real instances would email/SMS.
  return json({ ok: true, received: data, business: scope.business, vertical: scope.vertical });
}

function renderPage(s, prospectSlug, block) {
  const v = VERTICALS[s.vertical] || VERTICALS.default;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(s.business)} — quote form</title>
${styles()}
</head><body>
<main>
  <p class="eyebrow">Block 16 · Vertical Quote Form · ${esc(prospectSlug || 'canonical demo')} · ${esc(v.name)}</p>
  <h1>${esc(s.business)}</h1>
  <p class="lede">Three questions. We'll respond with a real quote in 2 hours.</p>
  <form id="form" class="form">
    <input name="name" placeholder="Your name" required>
    <input name="email" type="email" placeholder="Email" required>
    <input name="phone" type="tel" placeholder="Phone (optional)">
    ${v.questions.map(q => renderQ(q)).join('')}
    <button type="submit" class="btn">${esc(v.cta)} →</button>
  </form>
  <div id="result" class="result" hidden></div>
  <details class="alt-vert">
    <summary>Switch vertical (demo)</summary>
    <p>This canonical demo renders the <strong>${esc(v.name)}</strong> form. Pick another to see the form change:</p>
    <p class="vert-links">
      ${Object.entries(VERTICALS).map(([k, vv]) => `<a class="vert-link" href="?v=${esc(k)}">${esc(vv.name)}</a>`).join('')}
    </p>
  </details>
  <h2>For sales</h2>
  <p class="lede">Block 16 replaces generic "Contact Us" forms with vertical-specific quote flows that ask the 3 questions an estimator would ask first. Conversion lift: 2-4× on submitted leads. $1,500 setup · $200/mo. Deploy: <code>/cafecito-blocks:form &lt;prospect-slug&gt;</code></p>
  <div class="cta-row">
    <a class="btn-outline" href="https://cafecito-ai.com/new-hire/blocks/${esc(block.slug)}">Read the playbook</a>
    <a class="btn-outline" href="https://github.com/cafecito-ai/block-form">GitHub mirror</a>
  </div>
  <footer>Cafecito Blocks · form.cafecito-ai.com</footer>
</main>
<script>
document.getElementById('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  const r = document.getElementById('result');
  r.hidden = false; r.textContent = 'Submitting…';
  const res = await fetch('${prospectSlug ? `/${prospectSlug}` : ''}/api/submit', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
  const j = await res.json();
  r.innerHTML = j.ok ? '<strong>✓ Submitted.</strong> A real instance would email/SMS the lead immediately. Demo data: <pre>' + JSON.stringify(j.received, null, 2) + '</pre>' : '✗ ' + (j.error || 'error');
});
</script>
</body></html>`;
}

function renderQ(q) {
  if (q.type === 'select') {
    return `<label class="q"><span>${esc(q.label)}</span><select name="${esc(q.id)}" required><option value="">Pick one…</option>${q.options.map(o => `<option>${esc(o)}</option>`).join('')}</select></label>`;
  }
  return `<label class="q"><span>${esc(q.label)}</span><input name="${esc(q.id)}" type="text" required></label>`;
}

function styles() {
  return `<style>
*{box-sizing:border-box}
body{margin:0;background:#f5f1ea;color:#0f0e0c;font:16px/1.55 ui-sans-serif,system-ui,-apple-system,"Inter Tight",sans-serif}
main{max-width:620px;margin:0 auto;padding:48px 24px 96px}
.eyebrow{font:500 11px/1 ui-monospace,monospace;letter-spacing:0.16em;text-transform:uppercase;color:#b8412c;margin:0 0 14px}
h1{font:700 30px/1.15 "Fraunces",Georgia,serif;margin:0 0 8px}
.lede{font-size:15px;color:#2a2723;margin:0 0 24px;line-height:1.5}
.form{display:flex;flex-direction:column;gap:10px;margin:0 0 24px;background:#fff;padding:22px;border-radius:8px;border:1px solid #d9d4ca}
.form input,.form select{font:400 15px/1.4 ui-sans-serif,system-ui;padding:11px 13px;border:1px solid #d9d4ca;border-radius:4px;background:#fff;width:100%}
.q{display:flex;flex-direction:column;gap:5px;font:500 12px/1 ui-monospace,monospace;letter-spacing:0.08em;text-transform:uppercase;color:#6b6660}
.btn{align-self:flex-start;background:#1f3a2e;color:#f5f1ea;border:0;padding:12px 22px;border-radius:4px;font:600 14px/1 ui-sans-serif,system-ui;cursor:pointer;margin-top:8px}
.btn-outline{display:inline-block;padding:10px 16px;border:1px solid #0f0e0c;border-radius:4px;text-decoration:none;color:#0f0e0c;font:500 13px/1 ui-sans-serif,system-ui;background:#fff}
.result{background:#ece5d8;padding:14px 18px;border-radius:6px;margin:0 0 28px;font-size:13px;line-height:1.5}
.result pre{background:#fff;padding:10px;border-radius:3px;font-size:11px;overflow:auto}
.alt-vert{background:#fff;border:1px solid #d9d4ca;padding:14px 18px;border-radius:6px;margin:0 0 32px;font-size:13px}
.alt-vert summary{cursor:pointer;font-weight:600;color:#1f3a2e}
.vert-links{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 0}
.vert-link{padding:4px 10px;background:#ece5d8;border-radius:12px;text-decoration:none;color:#0f0e0c;font-size:12px;font-family:ui-monospace,monospace}
h2{font:600 18px/1.2 "Fraunces",Georgia,serif;margin:32px 0 10px}
code{font-family:ui-monospace,monospace;background:#ece5d8;padding:2px 6px;border-radius:3px;font-size:0.85em}
.cta-row{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 36px}
footer{font:400 11px/1.5 ui-sans-serif,system-ui;color:#6b6660;border-top:1px solid #d9d4ca;padding-top:16px}
</style>`;
}

function esc(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function html200(html){return new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=60, must-revalidate'}});}
function json(d,status=200){return new Response(JSON.stringify(d),{status,headers:{'content-type':'application/json; charset=utf-8'}});}
