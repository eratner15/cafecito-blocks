// Personal Brand Site + Booking — Block 10
// AI-written copy + Cal.com + Stripe + content engine. Personal-brand starter.

import { resolveProspect } from './lib/resolve-prospect.js';

const SHOWCASE = {
  business: 'Dr. Andres Vega · Family Medicine',
  vertical: 'family practice',
  neighborhood: 'Coral Gables',
  services: ['Annual physicals', 'Sick visits same-day', 'Bilingual care · ES/EN', 'Concierge plan'],
  cta_primary: 'Book a visit',
  cta_secondary: 'Call · (305) 555-0142',
  about: 'Dr. Vega trained at Jackson Memorial and has practiced in Coral Gables for 12 years. The clinic is small on purpose — most visits run 30 minutes, not 8.',
  brandColor: '#2a4a3c',
  testimonials: [
    { author: 'Marisol G.', text: 'Best primary-care experience I have had in Miami. Same-day appointment, real conversation, no rush.' },
    { author: 'Robert K.',  text: 'The annual physical was thorough and the followup messages were actually helpful — not formulaic.' },
  ],
};

export async function handleBrand(request, env, ctx, url, block, _routerProspectSlug) {
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
  return html200(renderSite(scope, prospectSlug, block));
}

function renderSite(s, prospectSlug, block) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(s.business)} — ${esc(s.neighborhood)}</title>
${styles(s.brandColor)}
</head><body>
<main>
  <p class="eyebrow">Block 10 · Personal Brand Site + Booking · ${esc(prospectSlug || 'canonical demo')}</p>
  <header class="hero">
    <h1>${esc(s.business)}</h1>
    <p class="hero-sub">${esc(s.vertical)} · ${esc(s.neighborhood)}</p>
    <div class="cta">
      <a class="btn btn-primary" href="#book">${esc(s.cta_primary)}</a>
      <a class="btn" href="#">${esc(s.cta_secondary)}</a>
    </div>
  </header>
  <section>
    <h2>What we do</h2>
    <ul class="services">${s.services.map(v => `<li>${esc(v)}</li>`).join('')}</ul>
  </section>
  <section>
    <h2>About</h2>
    <p>${esc(s.about)}</p>
  </section>
  <section>
    <h2>What patients say</h2>
    ${s.testimonials.map(t => `<blockquote>"${esc(t.text)}" <cite>— ${esc(t.author)}</cite></blockquote>`).join('')}
  </section>
  <section id="book" class="book">
    <h2>Book a visit</h2>
    <p>This block ships with Cal.com pre-wired. Real instance shows the live booking calendar embedded here. Demo shows the placeholder.</p>
    <div class="cal-placeholder">Cal.com embed · per-prospect instance plugs in their event-type ID</div>
  </section>
  <section class="meta-block">
    <h2>For sales</h2>
    <p>Block 10 is $1,500 setup · $200/mo. Cheapest entry-point block — fits solo doctors, dentists, attorneys, consultants. AI-written copy + Cal.com + Stripe + blog generator. Deploy: <code>/cafecito-blocks:brand &lt;prospect-slug&gt;</code></p>
    <p><a class="btn-outline" href="https://cafecito-ai.com/new-hire/blocks/${esc(block.slug)}">Playbook</a> <a class="btn-outline" href="https://github.com/cafecito-ai/block-brand">GitHub mirror</a></p>
  </section>
  <footer>Cafecito Blocks · brand.cafecito-ai.com</footer>
</main>
</body></html>`;
}

function styles(color) {
  return `<style>
*{box-sizing:border-box}
body{margin:0;background:#f5f1ea;color:#0f0e0c;font:16px/1.6 ui-sans-serif,system-ui,-apple-system,"Inter Tight",sans-serif}
main{max-width:720px;margin:0 auto;padding:48px 24px 96px}
.eyebrow{font:500 11px/1 ui-monospace,monospace;letter-spacing:0.16em;text-transform:uppercase;color:#b8412c;margin:0 0 32px}
.hero{margin:0 0 48px}
h1{font:700 44px/1.1 "Fraunces",Georgia,serif;letter-spacing:-0.02em;margin:0 0 8px;color:${color}}
.hero-sub{font:400 17px/1.4 ui-sans-serif,system-ui;color:#6b6660;margin:0 0 24px}
.cta{display:flex;gap:10px;flex-wrap:wrap}
.btn{display:inline-block;padding:13px 22px;border-radius:4px;text-decoration:none;font:500 15px/1 ui-sans-serif,system-ui;border:1px solid ${color};color:${color};background:#fff}
.btn-primary{background:${color};color:#f5f1ea}
.btn:hover{opacity:0.85}
section{margin:0 0 36px;padding-bottom:36px;border-bottom:1px solid #d9d4ca}
section:last-of-type{border-bottom:0}
h2{font:600 24px/1.2 "Fraunces",Georgia,serif;margin:0 0 14px;color:${color}}
.services{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}
.services li{background:#fff;padding:14px 16px;border-radius:4px;border:1px solid #d9d4ca;font-size:14px}
blockquote{background:#fff;border-left:3px solid ${color};padding:14px 20px;margin:0 0 12px;font:italic 15px/1.55 "Fraunces",Georgia,serif;color:#2a2723}
cite{display:block;margin-top:6px;font:500 12px/1 ui-monospace,monospace;color:#6b6660;font-style:normal}
.book{background:#fff;padding:24px;border:1px solid #d9d4ca;border-radius:8px}
.cal-placeholder{background:#ece5d8;padding:36px 20px;text-align:center;border-radius:4px;color:#6b6660;font:500 13px/1 ui-monospace,monospace;letter-spacing:0.06em}
.meta-block{background:#0f0e0c;color:#f5f1ea;padding:24px;border-radius:8px;border:0}
.meta-block h2{color:#f5f1ea}
.meta-block p{font-size:14px;line-height:1.55;color:#c8c2b9}
.meta-block code{background:rgba(255,255,255,0.1);color:#f5f1ea;padding:2px 6px;border-radius:3px;font-family:ui-monospace,monospace;font-size:0.9em}
.meta-block .btn-outline{display:inline-block;padding:8px 14px;border:1px solid #f5f1ea;border-radius:4px;text-decoration:none;color:#f5f1ea;font:500 12px/1 ui-sans-serif,system-ui}
footer{font:400 12px/1.5 ui-sans-serif,system-ui;color:#6b6660;border-top:1px solid #d9d4ca;padding-top:18px;margin-top:36px}
</style>`;
}

function esc(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function html200(html){return new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=60, must-revalidate'}});}
