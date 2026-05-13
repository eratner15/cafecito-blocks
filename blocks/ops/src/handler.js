// Internal Ops Dashboard — Block 09
// Pulls from QuickBooks, Toast, Mindbody, Salesforce, LiquidityBook into one screen.

import { kpiTile, statusBadge, timelineRow, dashboardShell } from './lib/places-cards.js';
import { resolveProspect } from './lib/resolve-prospect.js';

const SHOWCASE = {
  business: 'La Cubana Cocina · Coral Way',
  vertical: 'restaurant',
  date: '2026-05-11',
  kpis: [
    { label: 'Today revenue',     value: '$8,427', delta: '+12% vs last Sat', deltaTone: 'good', sub: 'lunch + dinner combined' },
    { label: 'Covers',            value: '147',    delta: '+8 vs avg',         deltaTone: 'good' },
    { label: 'Avg ticket',        value: '$57.32', delta: '–$3.40 vs last week', deltaTone: 'bad' },
    { label: 'Labor %',           value: '28.4%',  delta: 'target 30%',         deltaTone: 'good', sub: 'within target' },
    { label: 'Food cost %',       value: '34.1%',  delta: 'target 30%',         deltaTone: 'bad', sub: '+4.1pt — investigate' },
    { label: 'Inventory: critical', value: '2 SKUs', sub: 'Plátano maduro, Cuban bread' },
  ],
  timeline: [
    { ts: '2026-05-11T11:42:00', title: 'Inventory alert: Plátano maduro below par',           body: 'Auto-ordered 80 lb from Aceves. ETA tomorrow 10am.', actor: 'AI · supply' },
    { ts: '2026-05-11T10:14:00', title: 'Server tip share imbalance',                          body: 'Maria S. tip share 47% above avg this week. Manager review queued.', actor: 'AI · payroll' },
    { ts: '2026-05-10T22:18:00', title: 'POS drawer short $84.20',                             body: 'Z-out vs deposits gap. Cashier: J. Lopez. Manager notified.', actor: 'AI · finance' },
    { ts: '2026-05-10T15:30:00', title: 'New Google review: 4★',                                body: 'Drafted response queued (Block 04). Approve to post.', actor: 'AI · reviews' },
  ],
};

export async function handleOps(request, env, ctx, url, block, _routerProspectSlug) {
  const segments = url.pathname.split('/').filter(Boolean);
  let prospectSlug = null;
  if (segments[0] && segments[0] !== 'api' && env.INSTANCES) {
    const hit = await env.INSTANCES.get(`${block.slug}/${segments[0]}`);
    if (hit) prospectSlug = segments[0];
  }

  const tilesHtml = SHOWCASE.kpis.map(k => kpiTile(k)).join('');
  const timelineHtml = `<h2 style="font:600 20px/1.2 'Fraunces',Georgia,serif;margin:36px 0 8px;letter-spacing:-0.005em;">AI alerts &amp; auto-actions · last 24h</h2>
    <div style="background:#fff;border:1px solid #d9d4ca;border-radius:8px;padding:14px 22px;margin:0 0 36px;">
      ${SHOWCASE.timeline.map(t => timelineRow(t)).join('')}
    </div>
    <div style="background:#1f3a2e;color:#f5f1ea;padding:24px 28px;border-radius:8px;margin:0 0 32px;">
      <div style="font:500 11px/1 ui-monospace,monospace;letter-spacing:0.15em;text-transform:uppercase;color:#b8d4c8;margin:0 0 8px;">Block 09 · Internal Ops Dashboard</div>
      <div style="font:600 18px/1.3 'Fraunces',Georgia,serif;margin:0 0 6px;">One screen. Every data source you already pay for.</div>
      <div style="font-size:14px;line-height:1.5;color:#b8d4c8;">Connects QuickBooks · Toast · Mindbody · Salesforce · ServiceTitan · LiquidityBook. Claude reads the data each morning + writes a 5-bullet "what to pay attention to today" brief. Auto-actions on inventory orders, payroll anomalies, POS shorts. $4,500 setup · $850/mo. Deploy: <code style="font-family:ui-monospace,monospace;background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:3px;">/cafecito-blocks:ops &lt;prospect-slug&gt;</code></div>
      <div style="margin:14px 0 0;display:flex;gap:8px;flex-wrap:wrap;">
        <a href="https://cafecito-ai.com/new-hire/blocks/${esc(block.slug)}" style="display:inline-block;padding:9px 16px;border-radius:4px;border:1px solid #f5f1ea;color:#f5f1ea;text-decoration:none;font:500 13px/1 ui-sans-serif,system-ui;">Playbook →</a>
        <a href="https://github.com/cafecito-ai/block-ops" style="display:inline-block;padding:9px 16px;border-radius:4px;border:1px solid #f5f1ea;color:#f5f1ea;text-decoration:none;font:500 13px/1 ui-sans-serif,system-ui;">GitHub mirror →</a>
      </div>
    </div>
    <div style="font:400 12px/1.5 ui-sans-serif,system-ui;color:#6b6660;border-top:1px solid #d9d4ca;padding-top:18px;">Cafecito Blocks · ops.cafecito-ai.com · ${esc(prospectSlug || 'canonical demo')}</div>`;

  return new Response(
    dashboardShell({
      title: SHOWCASE.business,
      subtitle: `${SHOWCASE.vertical} · ${SHOWCASE.date} · Block 09 canonical demo`,
      tilesHtml,
      bodyHtml: timelineHtml,
    }),
    { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=60, must-revalidate' } }
  );
}

function esc(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
