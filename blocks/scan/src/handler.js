// AI Visibility / Citability Scanner — Block 05
// Canonical demo wraps the existing BoostAI scanner at cafecito-ai.com/boostai/.
// scan.cafecito-ai.com is the descriptive subdomain; per-prospect instances
// link to a pre-baked scan report URL.

const SHOWCASE = {
  business: 'BoostAI',
  scanQuery: 'best AC repair company in Miami',
  yourScore: 28,
  competitorScore: 72,
  competitorName: 'Cooling Pros (top competitor)',
};

const PROSPECT_OVERRIDES = {};

export async function handleScan(request, env, ctx, url, block, _routerProspectSlug) {
  const segments = url.pathname.split('/').filter(Boolean);
  let prospectSlug = null;
  let scope = SHOWCASE;
  if (segments[0] && segments[0] !== 'api' && env.INSTANCES) {
    const hit = await env.INSTANCES.get(`${block.slug}/${segments[0]}`);
    if (hit) prospectSlug = segments[0];
  }
  if (prospectSlug && PROSPECT_OVERRIDES[prospectSlug]) {
    scope = { ...SHOWCASE, ...PROSPECT_OVERRIDES[prospectSlug] };
  }

  return html200(renderPage(scope, prospectSlug, block));
}

function renderPage(s, prospectSlug, block) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>AI Visibility Scanner — does ChatGPT recommend your business?</title>
${styles()}
</head><body>
<main>
  <p class="eyebrow">Block 05 · AI Visibility / Citability Scanner · ${esc(prospectSlug || 'canonical demo')}</p>
  <h1>Does ChatGPT recommend ${esc(prospectSlug || 'your business')}?</h1>
  <p class="lede">When a customer asks ChatGPT / Claude / Perplexity / Gemini for "${esc(s.scanQuery)}", four AI models look across the web and pick a small set of businesses to name. Most local businesses score 20-40 out of 100. Your competitors score 70+.</p>
  <div class="score-row">
    <div class="score score-low">
      <div class="score-label">Your score</div>
      <div class="score-value">${s.yourScore}</div>
      <div class="score-sub">of 100 · cited in 0 of 4 LLMs</div>
    </div>
    <div class="score-vs">vs</div>
    <div class="score score-high">
      <div class="score-label">${esc(s.competitorName)}</div>
      <div class="score-value">${s.competitorScore}</div>
      <div class="score-sub">of 100 · cited in 3 of 4 LLMs</div>
    </div>
  </div>
  <a class="cta-primary" href="https://cafecito-ai.com/boostai/">
    <span class="cta-eyebrow">Try the live scanner</span>
    <span class="cta-label">Scan your business in 90 seconds →</span>
    <span class="cta-sub">cafecito-ai.com/boostai · email-gated · full report + 14-day follow-up</span>
  </a>
  <div class="grid">
    <div class="cell"><h3>How it works</h3><p>We run the same query a customer would ask, against the four AI models that drive 60%+ of new local-business discovery. We measure: citation rate, sentiment, ranking position, source authority. Out comes a score + a specific rewrite plan.</p></div>
    <div class="cell"><h3>What you fix</h3><p>Schema.org markup, knowledge-graph entity claims, About-page clarity, NAP consistency, third-party citations, llms.txt. Most fixes take 1 hour. Score moves 15-25 points in the first 30 days.</p></div>
    <div class="cell"><h3>What it costs</h3><p><strong>$1,000 setup · $250/mo</strong> for monthly delta tracking + automated fixes. ROI: most businesses recover the year-1 fee from a single LLM-recommended sale.</p></div>
  </div>
  <h2>How to sell this block</h2>
  <ol class="flow">
    <li><strong>Scan first.</strong> Send the prospect THEIR score before any pitch. They will read it.</li>
    <li><strong>Scan their competitor.</strong> Side-by-side compare. The number is the entire argument.</li>
    <li><strong>Show the 30-day delta forecast.</strong> Three weeks of fixes typically move a 28 → a 55. That's measurable. Sales-friendly.</li>
    <li><strong>Close on monthly.</strong> AI citation drift is real — quarterly recheck or you lose ground. $250/mo is the monitoring + the fixes.</li>
  </ol>
  <h2>Deploy a scan for your prospect</h2>
  <p class="lede">Sales runs <code>/cafecito-blocks:scan &lt;prospect-slug&gt;</code> and gets back: a pre-run citability report + competitor comparison + 30-day forecast + cold-pitch email that links the report.</p>
  <div class="cta-row">
    <a class="btn primary" href="https://cafecito-ai.com/new-hire/blocks/${esc(block.slug)}">Read the playbook</a>
    <a class="btn" href="https://github.com/eratner15/block-scan">GitHub mirror</a>
    <a class="btn" href="https://cafecito-ai.com/boostai/">Live BoostAI scanner →</a>
  </div>
  <footer>Cafecito Blocks · scan.cafecito-ai.com · per-prospect instances at <code>/&lt;prospect-slug&gt;/</code></footer>
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
.score-row{display:flex;align-items:center;gap:18px;margin:0 0 28px;background:#fff;padding:22px 24px;border-radius:8px;border:1px solid #d9d4ca}
.score{flex:1;text-align:center}
.score-low{color:#b8412c}
.score-high{color:#1f3a2e}
.score-label{font:500 11px/1.1 ui-monospace,monospace;letter-spacing:0.12em;text-transform:uppercase;color:#6b6660;margin:0 0 8px}
.score-value{font:700 64px/1 "Fraunces",Georgia,serif;letter-spacing:-0.02em}
.score-sub{font:400 12px/1.3 ui-sans-serif,system-ui;color:#6b6660;margin:6px 0 0}
.score-vs{font:600 18px/1 "Fraunces",Georgia,serif;color:#9b948b}
.cta-primary{display:flex;flex-direction:column;gap:4px;text-decoration:none;background:#0f0e0c;color:#f5f1ea;padding:24px 28px;border-radius:8px;margin:0 0 36px}
.cta-primary:hover{background:#2a2723}
.cta-eyebrow{font:500 11px/1 ui-monospace,monospace;letter-spacing:0.15em;text-transform:uppercase;color:#c8c2b9}
.cta-label{font:600 22px/1.2 "Fraunces",Georgia,serif}
.cta-sub{font:400 12px/1.3 ui-monospace,monospace;color:#c8c2b9}
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
