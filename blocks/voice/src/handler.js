// Bilingual Voice Receptionist — Block 01
// Canonical demo wraps Suite Air (existing live HVAC receptionist on +1-954-858-5311).
// Per-prospect instances customize the phone number + business name + voice.

const SHOWCASE = {
  business: 'Suite Air HVAC',
  phone: '+1-954-858-5311',
  phoneDisplay: '(954) 858-5311',
  hours: 'Mon–Fri 8am–6pm · 24/7 emergency',
  industry: 'HVAC · Miami-Dade',
  voiceName: 'Lucia',
  languages: ['English', 'Spanish'],
};

const PROSPECT_OVERRIDES = {
  // 'garrido-hvac': { business: 'Garrido HVAC', phone: '+1-786-...', ... },
};

export async function handleVoice(request, env, ctx, url, block, _routerProspectSlug) {
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
  const takeoverUrl = prospectSlug ? `/${prospectSlug}/` : '/';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(s.business)} — bilingual voice receptionist · call ${esc(s.phoneDisplay)}</title>
${styles()}
</head><body>
<main>
  <p class="eyebrow">Block 01 · Bilingual Voice Receptionist · ${esc(prospectSlug || 'canonical demo')}</p>
  <h1>${esc(s.business)}</h1>
  <p class="lede">A bilingual voice receptionist that picks up every call, in Spanish or English, and books the appointment. Live now.</p>
  <a class="call-cta" href="tel:${esc(s.phone)}">
    <span class="call-eyebrow">Call the receptionist · live demo</span>
    <span class="call-number">${esc(s.phoneDisplay)}</span>
    <span class="call-sub">Speak English or Spanish — ${esc(s.voiceName)} books the appointment</span>
  </a>
  <div class="grid">
    <div class="cell"><h3>Who answers</h3><p>${esc(s.voiceName)}, an OpenAI Realtime voice. ${esc(s.languages.join(' / '))} auto-detect — no language menu. Books to Cal.com in 1.5 seconds without leaving the call.</p></div>
    <div class="cell"><h3>What it costs</h3><p><strong>$1,500 setup · $400/mo</strong> + per-minute pass-through at cost-plus 30%. About 1/8 the cost of a part-time bilingual receptionist in Miami.</p></div>
    <div class="cell"><h3>How it ships</h3><p>One day. The agent provisions a Twilio number in your area code, writes the system prompt for your business, wires Cal.com, deploys the Cloudflare Worker bridge. You record the demo Loom and pitch.</p></div>
  </div>
  <h2>What you hear</h2>
  <ol class="flow">
    <li><strong>Ring.</strong> ${esc(s.business)} answers within 1 ring. ${esc(s.voiceName)}: "${esc(s.business)}, ¿cómo le puedo ayudar?" (or in English if you start in English).</li>
    <li><strong>Triage.</strong> Three questions, in order: urgency · service type · ZIP/address. Silent on language switches — if you start in Spanish she stays in Spanish.</li>
    <li><strong>Book.</strong> Function call to Cal.com mid-conversation. The booking lands while you're on the line. SMS confirmation 30 seconds later.</li>
    <li><strong>Escalate.</strong> Emergency words ("leak / broken / lawsuit") trigger an immediate transfer with a 1-sentence summary handoff.</li>
  </ol>
  <h2>Deploy for your business</h2>
  <p class="lede">Sales hands you this URL: <code>https://voice.cafecito-ai.com/&lt;your-slug&gt;/</code>. A working receptionist with YOUR business name, YOUR hours, YOUR services. Ships in one day.</p>
  <div class="cta-row">
    <a class="btn primary" href="https://cafecito-ai.com/new-hire/blocks/${esc(block.slug)}">Read the playbook</a>
    <a class="btn" href="https://github.com/eratner15/block-voice">GitHub mirror</a>
    <a class="btn" href="https://cafecito-ai.com/suite-air/">See the Suite Air build</a>
  </div>
  <footer>Cafecito Blocks · voice.cafecito-ai.com · per-prospect instances at <code>/&lt;prospect-slug&gt;/</code></footer>
</main>
</body></html>`;
}

function styles() {
  return `<style>
*{box-sizing:border-box}
body{margin:0;background:#f5f1ea;color:#0f0e0c;font:16px/1.55 ui-sans-serif,system-ui,-apple-system,"Inter Tight",sans-serif}
main{max-width:780px;margin:0 auto;padding:56px 24px 96px}
.eyebrow{font:500 11px/1 ui-monospace,monospace;letter-spacing:0.16em;text-transform:uppercase;color:#b8412c;margin:0 0 14px}
h1{font:700 40px/1.1 "Fraunces",Georgia,serif;letter-spacing:-0.015em;margin:0 0 14px}
.lede{font-size:18px;color:#2a2723;margin:0 0 28px;line-height:1.5}
.call-cta{display:flex;flex-direction:column;gap:6px;text-decoration:none;color:#f5f1ea;background:#1f3a2e;padding:24px 28px;border-radius:8px;margin:0 0 36px}
.call-cta:hover{background:#2a4a3c}
.call-eyebrow{font:500 11px/1 ui-monospace,monospace;letter-spacing:0.15em;text-transform:uppercase;color:#b8d4c8}
.call-number{font:700 40px/1.1 "Fraunces",Georgia,serif;letter-spacing:-0.01em}
.call-sub{font:400 14px/1.4 ui-sans-serif,system-ui;color:#b8d4c8}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin:0 0 36px}
.cell{background:#fff;border:1px solid #d9d4ca;border-radius:6px;padding:18px 20px}
.cell h3{font:600 14px/1.2 "Fraunces",Georgia,serif;margin:0 0 8px;letter-spacing:-0.005em}
.cell p{font-size:13px;line-height:1.5;color:#2a2723;margin:0}
h2{font:600 22px/1.2 "Fraunces",Georgia,serif;margin:36px 0 14px;letter-spacing:-0.005em}
.flow{padding-left:1.2em;margin:0 0 36px}
.flow li{margin:0 0 10px;line-height:1.55;font-size:15px}
code{font-family:ui-monospace,"JetBrains Mono",monospace;background:#ece5d8;padding:2px 6px;border-radius:3px;font-size:0.9em}
.cta-row{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 48px}
.btn{display:inline-block;padding:11px 18px;border-radius:4px;text-decoration:none;font:500 14px/1 ui-sans-serif,system-ui;border:1px solid #0f0e0c;color:#0f0e0c;background:#fff}
.btn.primary{background:#0f0e0c;color:#f5f1ea}
.btn:hover{opacity:0.85}
footer{font:400 12px/1.5 ui-sans-serif,system-ui;color:#6b6660;border-top:1px solid #d9d4ca;padding-top:18px}
</style>`;
}

function esc(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function html200(html){return new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=60, must-revalidate'}});}
