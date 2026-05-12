// AI Order Desk — Block 11
// Fax / email / photo / PDF intake → normalize → missing-info flags → ops email.

const SHOWCASE = {
  business: 'Aceves Wholesale Produce',
  todayOrders: 47,
  flagged: 6,
  totalUnits: 1284,
  sample: [
    { from: 'Café Versailles', via: 'WhatsApp photo', status: 'normalized', lines: ['80 lb tomato roma', '20 lb cebolla blanca', '50 lb papa idaho'], flags: [] },
    { from: 'La Carreta Bird Rd', via: 'Email PDF', status: 'normalized', lines: ['200 lb plátano maduro', '100 lb plátano verde', '40 lb yuca'], flags: [] },
    { from: 'Mango Tropical Café', via: 'Fax', status: 'flagged', lines: ['? lb avocado (quantity unclear)', '30 cs mango (cs = case or count?)'], flags: ['Quantity ambiguity on 2 of 4 lines', 'Faxed signature illegible'] },
    { from: 'Sergio\'s Restaurant', via: 'Voicemail', status: 'flagged', lines: ['25 lb pollo', '— rest of order inaudible —'], flags: ['Voicemail cut off at 0:18 — needs callback'] },
  ],
};

export async function handleOrders(request, env, ctx, url, block, _routerProspectSlug) {
  const segments = url.pathname.split('/').filter(Boolean);
  let prospectSlug = null;
  if (segments[0] && segments[0] !== 'api' && env.INSTANCES) {
    const hit = await env.INSTANCES.get(`${block.slug}/${segments[0]}`);
    if (hit) prospectSlug = segments[0];
  }
  return html200(renderDesk(SHOWCASE, prospectSlug, block));
}

function renderDesk(s, prospectSlug, block) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(s.business)} — order desk</title>
${styles()}
</head><body>
<main>
  <p class="eyebrow">Block 11 · AI Order Desk · ${esc(prospectSlug || 'canonical demo')}</p>
  <h1>${esc(s.business)}</h1>
  <p class="meta">Today's intake · ${s.todayOrders} orders normalized · ${s.flagged} flagged for human review · ${s.totalUnits.toLocaleString()} units</p>
  <h2>Today's order packets</h2>
  ${s.sample.map(renderOrder).join('')}
  <h2>What it does</h2>
  <ol class="flow">
    <li><strong>Universal intake.</strong> Customers send orders however they want — fax, email PDF, WhatsApp photo, voicemail, online form. Same backend.</li>
    <li><strong>Claude normalizes.</strong> Parses quantity + unit + product name. Maps to your SKU catalog. Computes line totals.</li>
    <li><strong>Flags the ambiguous.</strong> If quantity is unclear, signature illegible, voicemail cut off, or SKU unknown — the order goes to a human queue with the specific question highlighted.</li>
    <li><strong>Routes the clean ones.</strong> Normalized packets go directly to your ops email / dispatch / WMS. No data entry. No "did the order come in?" calls.</li>
  </ol>
  <h2>For sales</h2>
  <p class="lede">Block 11 is $4,000 setup · $750/mo. Best fit: wholesalers, restaurant suppliers, distributors, B2B food/parts. Anchor on "your ops manager spends 2 hours/day transcribing orders." That's $30k/yr in labor. Deploy: <code>/cafecito-blocks:orders &lt;prospect-slug&gt;</code></p>
  <div class="cta-row">
    <a class="btn-outline" href="https://cafecito-ai.com/new-hire/blocks/${esc(block.slug)}">Read the playbook</a>
    <a class="btn-outline" href="https://github.com/eratner15/block-orders">GitHub mirror</a>
  </div>
  <footer>Cafecito Blocks · orders.cafecito-ai.com</footer>
</main>
</body></html>`;
}

function renderOrder(o) {
  return `<div class="order order-${o.status}">
    <div class="order-h">
      <strong>${esc(o.from)}</strong>
      <span class="via">via ${esc(o.via)}</span>
      <span class="badge badge-${o.status}">${o.status === 'normalized' ? '✓ ready' : '⚠ needs review'}</span>
    </div>
    <ul class="lines">${o.lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>
    ${o.flags.length ? `<div class="flags"><strong>Flags:</strong> ${o.flags.map(esc).join(' · ')}</div>` : ''}
  </div>`;
}

function styles() {
  return `<style>
*{box-sizing:border-box}
body{margin:0;background:#f5f1ea;color:#0f0e0c;font:15px/1.55 ui-sans-serif,system-ui,-apple-system,"Inter Tight",sans-serif}
main{max-width:780px;margin:0 auto;padding:48px 24px 96px}
.eyebrow{font:500 11px/1 ui-monospace,monospace;letter-spacing:0.16em;text-transform:uppercase;color:#b8412c;margin:0 0 14px}
h1{font:700 30px/1.15 "Fraunces",Georgia,serif;margin:0 0 6px}
.meta{font:400 13px/1.4 ui-sans-serif,system-ui;color:#6b6660;margin:0 0 28px}
h2{font:600 20px/1.2 "Fraunces",Georgia,serif;margin:32px 0 14px}
.order{background:#fff;border:1px solid #d9d4ca;border-radius:6px;padding:14px 18px;margin:0 0 10px}
.order-flagged{border-left:3px solid #b8412c}
.order-normalized{border-left:3px solid #1f3a2e}
.order-h{display:flex;gap:10px;align-items:baseline;margin:0 0 8px;flex-wrap:wrap}
.via{font:400 11px/1 ui-monospace,monospace;color:#6b6660}
.badge{margin-left:auto;font:600 11px/1 ui-sans-serif,system-ui;padding:3px 9px;border-radius:11px;text-transform:uppercase;letter-spacing:0.04em}
.badge-normalized{background:#d4ecd5;color:#1f3a2e}
.badge-flagged{background:#f5d4cc;color:#8a2210}
.lines{margin:8px 0;padding-left:1.2em;font-size:13px;color:#2a2723}
.lines li{margin:0 0 3px;font-family:ui-monospace,monospace}
.flags{font-size:12px;color:#8a2210;margin:6px 0 0;padding:6px 8px;background:#fff3e6;border-radius:3px}
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
