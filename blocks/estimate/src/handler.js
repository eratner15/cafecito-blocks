// Quote / Estimate Generator — Block 03
// Photo upload → Claude Vision → labor + materials → printable HTML quote.

import { estimateFromPhoto, renderQuoteHTML } from './lib/vision-quote.js';
import { resolveProspect } from './lib/resolve-prospect.js';

const SHOWCASE = {
  business: 'South Beach Pool Service',
  vertical: 'pool service',
  brandColor: '#1a3a6b',
};

const PROSPECT_OVERRIDES = {
  'garrido-hvac': {
    business: 'Garrido HVAC',
    vertical: 'HVAC service',
    brandColor: '#b8412c',
  },
};

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
const _labor = PRE_BAKED_ESTIMATE.labor.reduce((s, l) => s + l.hours * l.hourly_rate_usd, 0);
const _materials = PRE_BAKED_ESTIMATE.materials.reduce((s, m) => s + m.quantity * m.unit_cost_usd, 0);
const _subtotal = _labor + _materials;
const _contingency = _subtotal * 0.1;
PRE_BAKED_ESTIMATE.totals = {
  labor: Math.round(_labor * 100) / 100,
  materials: Math.round(_materials * 100) / 100,
  subtotal: Math.round(_subtotal * 100) / 100,
  contingency: Math.round(_contingency * 100) / 100,
  total: Math.round((_subtotal + _contingency) * 100) / 100,
};

export async function handleEstimate(request, env, ctx, url, block, _routerProspectSlug) {
  const segments = url.pathname.split('/').filter(Boolean);
  let prospectSlug = null;
  let scope = { ...SHOWCASE };
  if (segments[0] && segments[0] !== 'api' && segments[0] !== 'sample-quote' && env.INSTANCES) {
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
  const { imageUrl, imageBase64, mimeType, description, vertical } = data;
  if (!imageUrl && !imageBase64) return json({ ok: false, error: 'imageUrl or imageBase64 required' }, 400);
  try {
    const estimate = await estimateFromPhoto(env, {
      vertical: vertical || scope.vertical,
      description,
      imageUrl,
      imageBase64,
      mimeType,
    });
    const html = renderQuoteHTML(estimate, { business: scope.business });
    return json({ ok: true, estimate, html });
  } catch (e) {
    return json({ ok: false, error: e.message }, 500);
  }
}

function renderLanding(s, prospectSlug, block) {
  const apiPath = prospectSlug ? `/${prospectSlug}/api/estimate` : `/api/estimate`;
  const sampleHref = prospectSlug ? `/${prospectSlug}/sample-quote` : `/sample-quote`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(s.business)} — photo-to-quote · live demo</title>
${styles(s.brandColor)}
</head><body>
<main>
  <p class="eyebrow">Block 03 · Quote / Estimate Generator · ${esc(prospectSlug || 'canonical demo')}</p>
  <h1>Send a photo. Get a real quote in 30 seconds.</h1>
  <p class="lede">Drag a job photo below. Claude Vision reads it, estimates labor + materials at <strong>${esc(s.business)}</strong> rates, computes totals server-side, and renders a branded quote you can print or email.</p>

  <section class="dropwrap" id="dropwrap">
    <input type="file" id="file" accept="image/*" hidden>
    <div class="drop" id="drop">
      <div class="drop-icon">📷</div>
      <div class="drop-headline">Drop a photo here, or <button type="button" id="pick" class="link-btn">pick a file</button></div>
      <div class="drop-sub">PNG / JPG / HEIC · resized client-side · max 8MB</div>
    </div>
    <div class="preview-row" id="preview-row" hidden>
      <img id="preview" alt="upload preview">
      <div class="preview-meta">
        <div class="preview-name" id="preview-name"></div>
        <div class="preview-dim" id="preview-dim"></div>
        <button type="button" id="clear" class="link-btn">remove</button>
      </div>
    </div>
    <label class="field">
      <span class="field-label">Vertical</span>
      <select id="vertical">
        <option value="${esc(s.vertical)}" selected>${esc(s.vertical)} (default)</option>
        <option>HVAC service</option>
        <option>pool service</option>
        <option>plumbing</option>
        <option>landscaping</option>
        <option>auto detail</option>
        <option>handyman</option>
        <option>roofing</option>
        <option>cleaning service</option>
      </select>
    </label>
    <label class="field">
      <span class="field-label">Short description (optional but helpful)</span>
      <textarea id="description" rows="2" placeholder="e.g. 'green pool, 15k gal, owner says algae two weeks'"></textarea>
    </label>
    <button type="button" id="submit" class="submit" disabled>Generate the quote →</button>
    <div class="hint">Or skip the upload: <a href="${sampleHref}">view a pre-baked sample quote</a></div>
  </section>

  <section id="result" hidden>
    <div class="result-head">
      <h2>Generated quote</h2>
      <div class="result-actions">
        <button type="button" id="print-btn" class="link-btn">Print</button>
        <button type="button" id="redo" class="link-btn">Redo with a different photo</button>
      </div>
    </div>
    <iframe id="quote-frame" title="Generated quote"></iframe>
  </section>

  <section id="error" hidden>
    <div class="error-card">
      <strong>Something went wrong.</strong>
      <div id="error-msg"></div>
      <button type="button" id="error-redo" class="link-btn">Try again</button>
    </div>
  </section>

  <h2>How it works</h2>
  <ol class="flow">
    <li><strong>Photo in.</strong> Customer texts a job photo (or you snap one from the truck).</li>
    <li><strong>Claude Vision.</strong> Identifies what work is needed, breaks out labor tasks + materials.</li>
    <li><strong>Server math.</strong> Hours × rate. Quantity × unit cost. Markup + contingency. No LLM math = no hallucinated totals.</li>
    <li><strong>Branded quote out.</strong> Customer gets a real PDF in under a minute.</li>
  </ol>

  <h2>What it costs</h2>
  <div class="grid">
    <div class="cell"><h3>Setup</h3><p><strong>$2,500</strong> one-time. Includes vertical tuning, brand styling, sample-photo calibration.</p></div>
    <div class="cell"><h3>Monthly</h3><p><strong>$400/mo</strong> hosting + maintenance. Up to 500 quotes/mo.</p></div>
    <div class="cell"><h3>Per quote</h3><p>~<strong>$0.05</strong> Vision pass-through. The math runs deterministically on your rates.</p></div>
  </div>

  <h2>Deploy for your business</h2>
  <p class="lede">Sales runs <code>/cafecito-blocks:estimate &lt;prospect-slug&gt;</code>. Per-prospect instance at <code>estimate.cafecito-ai.com/&lt;slug&gt;/</code> with branding + vertical + rates pre-tuned.</p>
  <div class="cta-row">
    <a class="btn-outline" href="https://cafecito-ai.com/new-hire/blocks/${esc(block.slug)}">Read the playbook</a>
    <a class="btn-outline" href="https://github.com/cafecito-ai/block-estimate">GitHub mirror</a>
  </div>
  <footer>Cafecito Blocks · estimate.cafecito-ai.com</footer>
</main>
<script>
${clientScript(apiPath)}
</script>
</body></html>`;
}

function clientScript(apiPath) {
  return `
const $ = (id) => document.getElementById(id);
const drop = $('drop'), file = $('file'), pick = $('pick'), preview = $('preview');
const submit = $('submit'), result = $('result'), errBox = $('error'), errMsg = $('error-msg');
const previewRow = $('preview-row'), previewName = $('preview-name'), previewDim = $('preview-dim');
let pending = null; // { base64, mimeType, w, h, name }

pick.onclick = () => file.click();
$('clear').onclick = () => resetUpload();
$('redo').onclick = () => { result.hidden = true; resetUpload(); };
$('error-redo').onclick = () => { errBox.hidden = true; resetUpload(); };
$('print-btn').onclick = () => { const f = $('quote-frame'); f.contentWindow.focus(); f.contentWindow.print(); };

file.addEventListener('change', (e) => loadFile(e.target.files[0]));
drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
drop.addEventListener('dragleave', () => drop.classList.remove('over'));
drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); loadFile(e.dataTransfer.files[0]); });

async function loadFile(f) {
  if (!f) return;
  if (!f.type.startsWith('image/')) { showError('That doesn\\'t look like an image.'); return; }
  if (f.size > 8 * 1024 * 1024) { showError('Image is over 8MB. Try a smaller photo.'); return; }
  try {
    const { base64, mimeType, w, h } = await resizeToBase64(f, 1568);
    pending = { base64, mimeType, w, h, name: f.name };
    preview.src = 'data:' + mimeType + ';base64,' + base64;
    previewName.textContent = f.name;
    previewDim.textContent = w + ' × ' + h + ' · ' + Math.round((base64.length * 0.75) / 1024) + ' KB';
    previewRow.hidden = false;
    drop.style.display = 'none';
    submit.disabled = false;
  } catch (e) {
    showError('Could not read that image. ' + e.message);
  }
}

function resetUpload() {
  pending = null;
  file.value = '';
  previewRow.hidden = true;
  drop.style.display = '';
  submit.disabled = true;
}

function showError(msg) {
  errMsg.textContent = msg;
  errBox.hidden = false;
  result.hidden = true;
}

submit.onclick = async () => {
  if (!pending) return;
  submit.disabled = true;
  submit.textContent = 'Reading the photo + drafting the quote…';
  errBox.hidden = true;
  try {
    const res = await fetch('${apiPath}', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        imageBase64: pending.base64,
        mimeType: pending.mimeType,
        description: $('description').value || null,
        vertical: $('vertical').value,
      }),
    });
    const j = await res.json();
    if (!j.ok) throw new Error(j.error || 'Estimate failed (' + res.status + ')');
    const frame = $('quote-frame');
    frame.srcdoc = j.html;
    frame.onload = () => { frame.style.height = (frame.contentDocument.body.scrollHeight + 40) + 'px'; };
    result.hidden = false;
    result.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) {
    showError(e.message);
  } finally {
    submit.disabled = false;
    submit.textContent = 'Generate the quote →';
  }
};

async function resizeToBase64(file, maxSide) {
  const img = await readImage(file);
  const ratio = Math.min(1, maxSide / Math.max(img.width, img.height));
  const w = Math.round(img.width * ratio), h = Math.round(img.height * ratio);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d').drawImage(img, 0, 0, w, h);
  const dataUrl = c.toDataURL('image/jpeg', 0.85);
  const [head, b64] = dataUrl.split(',');
  const mimeType = head.match(/data:(.*?);/)[1];
  return { base64: b64, mimeType, w, h };
}

function readImage(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = r.result;
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
`;
}

function styles(brand) {
  const accent = brand || '#1a3a6b';
  return `<style>
*{box-sizing:border-box}
body{margin:0;background:#f5f1ea;color:#0f0e0c;font:16px/1.55 ui-sans-serif,system-ui,-apple-system,"Inter Tight",sans-serif}
main{max-width:820px;margin:0 auto;padding:56px 24px 96px}
.eyebrow{font:500 11px/1 ui-monospace,monospace;letter-spacing:0.16em;text-transform:uppercase;color:#b8412c;margin:0 0 14px}
h1{font:700 36px/1.1 "Fraunces",Georgia,serif;letter-spacing:-0.015em;margin:0 0 14px}
h2{font:600 22px/1.2 "Fraunces",Georgia,serif;margin:36px 0 14px}
.lede{font-size:17px;color:#2a2723;margin:0 0 24px;line-height:1.5}
.lede strong{color:#0f0e0c}

.dropwrap{background:#fff;border:1px solid #d9d4ca;border-radius:8px;padding:20px;margin:0 0 36px}
.drop{border:2px dashed #c8c2b6;border-radius:6px;padding:36px 24px;text-align:center;transition:border-color 0.15s,background 0.15s;cursor:pointer}
.drop:hover,.drop.over{border-color:${accent};background:#f9f5ec}
.drop-icon{font-size:32px;margin:0 0 8px}
.drop-headline{font:500 16px/1.3 ui-sans-serif,system-ui;color:#2a2723;margin:0 0 4px}
.drop-sub{font:400 12px/1.3 ui-monospace,monospace;color:#6b6660}
.link-btn{background:none;border:0;color:${accent};font:500 inherit;cursor:pointer;text-decoration:underline;padding:0}
.link-btn:hover{opacity:0.75}

.preview-row{display:flex;gap:14px;align-items:center;background:#f9f5ec;border:1px solid #d9d4ca;border-radius:6px;padding:12px;margin:0 0 14px}
.preview-row img{width:96px;height:96px;object-fit:cover;border-radius:4px;border:1px solid #d9d4ca}
.preview-meta{flex:1;min-width:0}
.preview-name{font:500 14px/1.3 ui-sans-serif,system-ui;color:#0f0e0c;margin:0 0 4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.preview-dim{font:400 12px/1.3 ui-monospace,monospace;color:#6b6660;margin:0 0 6px}

.field{display:block;margin:14px 0 0}
.field-label{display:block;font:500 11px/1 ui-monospace,monospace;letter-spacing:0.12em;text-transform:uppercase;color:#6b6660;margin:0 0 6px}
.field select,.field textarea{width:100%;font:14px/1.4 ui-sans-serif,system-ui;padding:10px 12px;border:1px solid #c8c2b6;border-radius:4px;background:#fff;color:#0f0e0c;resize:vertical}
.field select:focus,.field textarea:focus{outline:none;border-color:${accent}}

.submit{display:block;width:100%;margin:18px 0 8px;padding:14px 18px;background:${accent};color:#f5f1ea;border:0;border-radius:6px;font:600 16px/1 "Fraunces",Georgia,serif;cursor:pointer;letter-spacing:-0.005em}
.submit:disabled{opacity:0.4;cursor:not-allowed}
.submit:not(:disabled):hover{filter:brightness(1.08)}
.hint{font:400 13px/1.4 ui-sans-serif,system-ui;color:#6b6660;text-align:center;margin:8px 0 0}
.hint a{color:${accent};text-decoration:underline}

.result-head{display:flex;justify-content:space-between;align-items:baseline;margin:0 0 12px}
.result-head h2{margin:0}
.result-actions{display:flex;gap:14px}
#quote-frame{width:100%;border:1px solid #d9d4ca;border-radius:6px;background:#fff;min-height:420px}

.error-card{background:#fdf2ee;border:1px solid #e8b8a8;border-radius:6px;padding:16px 18px;margin:0 0 24px}
.error-card strong{display:block;color:#8a2210;margin:0 0 6px}
.error-card div{color:#2a2723;margin:0 0 8px;font-size:14px}

.flow{padding-left:1.2em;margin:0 0 28px}
.flow li{margin:0 0 10px;line-height:1.55;font-size:15px}

.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin:0 0 36px}
.cell{background:#fff;border:1px solid #d9d4ca;border-radius:6px;padding:18px 20px}
.cell h3{font:600 14px/1.2 "Fraunces",Georgia,serif;margin:0 0 8px}
.cell p{font-size:13px;line-height:1.5;color:#2a2723;margin:0}
.cell strong{color:#0f0e0c}

code{font-family:ui-monospace,monospace;background:#ece5d8;padding:2px 6px;border-radius:3px;font-size:0.9em}
.cta-row{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 48px}
.btn-outline{display:inline-block;padding:11px 18px;border:1px solid #0f0e0c;border-radius:4px;text-decoration:none;color:#0f0e0c;font:500 14px/1 ui-sans-serif,system-ui;background:#fff}
.btn-outline:hover{background:#0f0e0c;color:#f5f1ea}
footer{font:400 12px/1.5 ui-sans-serif,system-ui;color:#6b6660;border-top:1px solid #d9d4ca;padding-top:18px}
</style>`;
}

function esc(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function html200(html){return new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=60, must-revalidate'}});}
function json(d,status=200){return new Response(JSON.stringify(d),{status,headers:{'content-type':'application/json; charset=utf-8'}});}
