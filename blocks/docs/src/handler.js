// Document AI Search — Block 06
// Canonical demo wraps PKM Wiki (existing live doc-search prototype).
// Per-prospect instances ingest the prospect's published docs and serve
// at docs.cafecito-ai.com/<prospect-slug>/.

import { resolveProspect } from './lib/resolve-prospect.js';

const SHOWCASE = {
  business: 'Karpathy LLM Wiki',
  liveUrl: 'https://pkm-wiki.evan-ratner.workers.dev/',
  exampleQuery: 'what is RLHF and how does it differ from supervised fine-tuning?',
  docCount: 47,
  vertical: 'AI / ML research notes',
};

const PROSPECT_OVERRIDES = {};

export async function handleDocs(request, env, ctx, url, block, _routerProspectSlug) {
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
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Document AI Search — semantic search + Q&amp;A over your firm's documents</title>
${styles()}
</head><body>
<main>
  <p class="eyebrow">Block 06 · Document AI Search · ${esc(prospectSlug || 'canonical demo')}</p>
  <h1>Find anything in ${esc(s.docCount)} documents. In 4 seconds. With citations.</h1>
  <p class="lede">Upload contracts, bylaws, manuals, policies. The system reads them, embeds them, and answers natural-language questions in your employees' native language — every answer linked back to the source paragraph.</p>
  <div class="demo-box">
    <p class="demo-eyebrow">Example query</p>
    <p class="demo-q">"${esc(s.exampleQuery)}"</p>
    <p class="demo-a">→ Returns a synthesized 2-paragraph answer with footnote citations to specific document pages. Click the footnote, the source PDF opens to that page with the relevant section highlighted.</p>
  </div>
  <a class="cta-primary" href="${esc(s.liveUrl)}">
    <span class="cta-eyebrow">Try the live demo</span>
    <span class="cta-label">${esc(s.business)} — ${esc(s.docCount)} docs indexed →</span>
    <span class="cta-sub">${esc(s.liveUrl)}</span>
  </a>
  <div class="grid">
    <div class="cell"><h3>What you upload</h3><p>PDFs · DOCX · text · email exports. Most law firms / management companies have 200-2,000 docs. We process the lot in ~30 minutes.</p></div>
    <div class="cell"><h3>What it does</h3><p>Semantic search (not keyword) + Q&amp;A synthesis + citation-back. Answers questions like "where is our force-majeure language?" in 4 seconds versus 20 minutes of paralegal time.</p></div>
    <div class="cell"><h3>What it costs</h3><p><strong>$5,000 setup · $750/mo</strong> for a firm with ≤2,000 docs. Setup includes ingestion, taxonomy tuning, employee training session, and a custom voice profile if needed.</p></div>
  </div>
  <h2>How to sell this block</h2>
  <ol class="flow">
    <li><strong>Get 5 public PDFs.</strong> Bylaws, FAQ, a sample engagement letter. Don't ask for confidential material on Day 1.</li>
    <li><strong>Ingest. Build a hosted demo on THEIR docs.</strong> Password-gated subdomain. Send the URL during discovery.</li>
    <li><strong>Type ONE question they can't easily answer.</strong> The synthesized answer + page-level citation lands in 4 seconds.</li>
    <li><strong>Anchor on partner time.</strong> A $500/hr partner spends 30 min/wk answering "where is X?" That's $13k/yr in labor. The system pays for itself in 6 weeks.</li>
  </ol>
  <h2>Deploy doc search for your prospect</h2>
  <p class="lede">Sales runs <code>/cafecito-blocks:docs &lt;prospect-slug&gt;</code> with a folder of their public PDFs. The skill ingests them, builds a hosted demo at <code>docs.cafecito-ai.com/&lt;slug&gt;/</code>, drafts the cold-pitch.</p>
  <div class="cta-row">
    <a class="btn primary" href="https://cafecito-ai.com/new-hire/blocks/${esc(block.slug)}">Read the playbook</a>
    <a class="btn" href="https://github.com/cafecito-ai/block-docs">GitHub mirror</a>
    <a class="btn" href="${esc(s.liveUrl)}">Live PKM Wiki →</a>
  </div>
  <footer>Cafecito Blocks · docs.cafecito-ai.com · per-prospect instances at <code>/&lt;prospect-slug&gt;/</code></footer>
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
.demo-box{background:#fff;border:1px solid #d9d4ca;border-radius:8px;padding:22px 26px;margin:0 0 28px}
.demo-eyebrow{font:500 11px/1 ui-monospace,monospace;letter-spacing:0.15em;text-transform:uppercase;color:#6b6660;margin:0 0 8px}
.demo-q{font:600 18px/1.4 "Fraunces",Georgia,serif;margin:0 0 12px;color:#0f0e0c}
.demo-a{font-size:14px;line-height:1.55;color:#2a2723;margin:0;padding-left:18px;border-left:3px solid #1f3a2e}
.cta-primary{display:flex;flex-direction:column;gap:4px;text-decoration:none;background:#1f3a2e;color:#f5f1ea;padding:24px 28px;border-radius:8px;margin:0 0 36px}
.cta-primary:hover{background:#2a4a3c}
.cta-eyebrow{font:500 11px/1 ui-monospace,monospace;letter-spacing:0.15em;text-transform:uppercase;color:#b8d4c8}
.cta-label{font:600 22px/1.2 "Fraunces",Georgia,serif}
.cta-sub{font:400 12px/1.3 ui-monospace,monospace;color:#b8d4c8}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin:0 0 36px}
.cell{background:#fff;border:1px solid #d9d4ca;border-radius:6px;padding:18px 20px}
.cell h3{font:600 14px/1.2 "Fraunces",Georgia,serif;margin:0 0 8px}
.cell p{font-size:13px;line-height:1.5;color:#2a2723;margin:0}
h2{font:600 22px/1.2 "Fraunces",Georgia,serif;margin:36px 0 14px}
.flow{padding-left:1.2em;margin:0 0 36px}
.flow li{margin:0 0 10px;line-height:1.55;font-size:15px}
code{font-family:ui-monospace,monospace;background:#ece5d8;padding:2px 6px;border-radius:3px;font-size:0.9em}
.cta-row{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 48px}
.btn{display:inline-block;padding:11px 18px;border-radius:4px;text-decoration:none;font:500 14px/1 ui-sans-serif,system-ui;border:1px solid #0f0e0c;color:#0f0e0c;background:#fff}
.btn.primary{background:#0f0e0c;color:#f5f1ea}
footer{font:400 12px/1.5 ui-sans-serif,system-ui;color:#6b6660;border-top:1px solid #d9d4ca;padding-top:18px}
</style>`;
}

function esc(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function html200(html){return new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=60, must-revalidate'}});}
