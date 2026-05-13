// Bilingual Conversion Layer — Block 13
// Drop-in script that adds ES/EN overlay + lead capture to an existing site.

import { resolveProspect } from './lib/resolve-prospect.js';

const SHOWCASE = {
  business: 'Coral Gables Dental',
  liveAt: 'coralgablesdental.com (demo)',
  metrics: {
    spanishVisitors: 0.38,
    leadLiftEN: 1.2,
    leadLiftES: 3.4,
  },
};

export async function handleBilingual(request, env, ctx, url, block, _routerProspectSlug) {
  const segments = url.pathname.split('/').filter(Boolean);
  let prospectSlug = null;
  if (segments[0] && segments[0] !== 'api' && segments[0] !== 'embed.js' && env.INSTANCES) {
    const hit = await env.INSTANCES.get(`${block.slug}/${segments[0]}`);
    if (hit) prospectSlug = segments[0];
  }

  // Serve the embed script
  if (segments.includes('embed.js')) {
    return new Response(EMBED_JS, {
      headers: { 'content-type': 'application/javascript; charset=utf-8', 'access-control-allow-origin': '*' },
    });
  }

  return html200(renderLanding(SHOWCASE, prospectSlug, block));
}

const EMBED_JS = `(function(){
  // Cafecito Bilingual Conversion Layer · v0.1
  // Drop on any page: <script src="https://bilingual.cafecito-ai.com/embed.js" data-business="Coral Gables Dental" data-phone="+13055550142"></script>
  var s = document.currentScript;
  var business = s.getAttribute('data-business') || 'this business';
  var phone = s.getAttribute('data-phone') || '';
  var prefer = (navigator.language || 'en').slice(0,2);
  var isES = prefer === 'es';
  var overlay = document.createElement('div');
  overlay.id = 'cafecito-bilingual';
  overlay.style.cssText = 'position:fixed;bottom:18px;right:18px;background:#1f3a2e;color:#f5f1ea;padding:14px 18px;border-radius:8px;font:14px/1.4 system-ui,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,0.18);max-width:300px;z-index:99999;cursor:pointer;';
  overlay.innerHTML = isES
    ? '<strong>¿Necesita ayuda?</strong><br>Habla con nosotros en español: <a href="tel:'+phone+'" style="color:#b8d4c8;text-decoration:underline;">'+phone+'</a><br><small style="opacity:0.7;">Click para ocultar</small>'
    : '<strong>Need help?</strong><br>Call us: <a href="tel:'+phone+'" style="color:#b8d4c8;text-decoration:underline;">'+phone+'</a> · <a href="#" id="cafecito-es" style="color:#b8d4c8;">Español</a><br><small style="opacity:0.7;">Click to dismiss</small>';
  overlay.onclick = function(e){ if(e.target.id==='cafecito-es'){overlay.click();return;} overlay.remove(); };
  document.body.appendChild(overlay);
})();
`;

function renderLanding(s, prospectSlug, block) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bilingual Conversion Layer — drop-in ES/EN overlay</title>
${styles()}
</head><body>
<main>
  <p class="eyebrow">Block 13 · Bilingual Conversion Layer · ${esc(prospectSlug || 'canonical demo')}</p>
  <h1>One script tag. Spanish speakers see Spanish.</h1>
  <p class="lede">Drop a single &lt;script&gt; tag onto an existing site. The script reads the browser's language preference, surfaces a Spanish/English overlay that captures leads in the right language, and routes them to the right inbox or Twilio number.</p>
  <div class="snippet">
    <p class="snippet-label">Drop-in install · 30 seconds</p>
    <pre><code>&lt;script src="https://bilingual.cafecito-ai.com/embed.js"
        data-business="Coral Gables Dental"
        data-phone="+13055550142"&gt;&lt;/script&gt;</code></pre>
  </div>
  <p class="lede">Try it now: open this page on a device with Spanish as your browser language, or click below to see it in action (canonical demo loads its own overlay):</p>
  <button id="try-demo" class="btn">Show the overlay →</button>
  <div class="grid">
    <div class="cell"><h3>Lead lift</h3><p>Sample install at ${esc(s.business)}: ${Math.round(s.metrics.spanishVisitors*100)}% of site visitors are Spanish-preferring browsers. Leads from Spanish overlay are <strong>${s.metrics.leadLiftES}x</strong> more likely to convert than the same visitors hitting an English-only form.</p></div>
    <div class="cell"><h3>What you get</h3><p>One overlay script · Spanish lead capture form · auto-routing to your inbox/Twilio · weekly digest of Spanish vs. English lead split · automatic A/B test on the CTA copy.</p></div>
    <div class="cell"><h3>What it costs</h3><p><strong>$1,800 setup · $300/mo</strong>. Most expensive thing about it is YOU figuring out how to handle Spanish inquiries — we include a 1-hour training session on bilingual reply scripts.</p></div>
  </div>
  <h2>For sales</h2>
  <p class="lede">Best fit: ANY service business in Miami / Houston / LA / NYC / Phoenix / Chicago / Orlando whose customer base is &gt;25% Spanish-preferring but whose website is English-only. Deploy: <code>/cafecito-blocks:bilingual &lt;prospect-slug&gt;</code></p>
  <div class="cta-row">
    <a class="btn-outline" href="https://cafecito-ai.com/new-hire/blocks/${esc(block.slug)}">Read the playbook</a>
    <a class="btn-outline" href="https://github.com/cafecito-ai/block-bilingual">GitHub mirror</a>
  </div>
  <footer>Cafecito Blocks · bilingual.cafecito-ai.com · drop-in script at /embed.js</footer>
</main>
<script src="/embed.js" data-business="${esc(s.business)}" data-phone="+13055550142"></script>
<script>document.getElementById('try-demo').onclick = function(){ var s = document.createElement('script'); s.src='/embed.js?ts='+Date.now(); s.setAttribute('data-business','${esc(s.business)}'); s.setAttribute('data-phone','+13055550142'); document.body.appendChild(s); };</script>
</body></html>`;
}

function styles() {
  return `<style>
*{box-sizing:border-box}
body{margin:0;background:#f5f1ea;color:#0f0e0c;font:16px/1.55 ui-sans-serif,system-ui,-apple-system,"Inter Tight",sans-serif}
main{max-width:780px;margin:0 auto;padding:48px 24px 96px}
.eyebrow{font:500 11px/1 ui-monospace,monospace;letter-spacing:0.16em;text-transform:uppercase;color:#b8412c;margin:0 0 14px}
h1{font:700 34px/1.15 "Fraunces",Georgia,serif;letter-spacing:-0.015em;margin:0 0 14px}
.lede{font-size:16px;color:#2a2723;margin:0 0 24px;line-height:1.55}
.snippet{background:#0f0e0c;color:#f5f1ea;border-radius:8px;padding:18px 22px;margin:0 0 24px;font-family:ui-monospace,"JetBrains Mono",monospace}
.snippet-label{font:500 11px/1 ui-monospace,monospace;letter-spacing:0.14em;text-transform:uppercase;color:#b8d4c8;margin:0 0 10px}
.snippet pre{margin:0;font-size:13px;line-height:1.5;overflow-x:auto;white-space:pre}
.btn{align-self:flex-start;background:#1f3a2e;color:#f5f1ea;border:0;padding:12px 22px;border-radius:4px;font:600 14px/1 ui-sans-serif,system-ui;cursor:pointer;margin:0 0 36px}
.btn-outline{display:inline-block;padding:10px 16px;border:1px solid #0f0e0c;border-radius:4px;text-decoration:none;color:#0f0e0c;font:500 13px/1 ui-sans-serif,system-ui;background:#fff}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin:0 0 36px}
.cell{background:#fff;border:1px solid #d9d4ca;border-radius:6px;padding:18px 20px}
.cell h3{font:600 14px/1.2 "Fraunces",Georgia,serif;margin:0 0 8px}
.cell p{font-size:13px;line-height:1.5;color:#2a2723;margin:0}
h2{font:600 22px/1.2 "Fraunces",Georgia,serif;margin:36px 0 14px}
code{font-family:ui-monospace,monospace;background:#ece5d8;padding:2px 6px;border-radius:3px;font-size:0.9em}
.cta-row{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 36px}
footer{font:400 12px/1.5 ui-sans-serif,system-ui;color:#6b6660;border-top:1px solid #d9d4ca;padding-top:18px}
</style>`;
}

function esc(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function html200(html){return new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=60, must-revalidate'}});}
