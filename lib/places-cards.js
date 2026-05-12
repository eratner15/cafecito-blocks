// Compact dashboard primitives — KPI tiles + status badges + timeline rows.
// Shared by blocks 09 (ops), 14 (status). Pulled from alpha + lcs-portfolio-intel.
// HTML-string components (no React on Workers); inline-styled for email + dashboard reuse.

const COLORS = {
  paper: '#f5f1ea',
  ink: '#0f0e0c',
  terra: '#b8412c',
  forest: '#1f3a2e',
  cream: '#ece5d8',
  ash: '#6b6660',
  rule: '#d9d4ca',
};

export function kpiTile({ label, value, delta, deltaTone = 'neutral', sub }) {
  const deltaColor = deltaTone === 'good' ? COLORS.forest
    : deltaTone === 'bad' ? COLORS.terra : COLORS.ash;
  return `<div style="background:#fff;border:1px solid ${COLORS.rule};border-radius:6px;padding:18px 20px;min-width:160px;">
  <div style="font:500 11px/1 ui-monospace,monospace;letter-spacing:0.12em;text-transform:uppercase;color:${COLORS.ash};margin:0 0 8px;">${esc(label)}</div>
  <div style="font:700 26px/1.05 'Fraunces',Georgia,serif;color:${COLORS.ink};letter-spacing:-0.01em;">${esc(value)}</div>
  ${delta ? `<div style="font:500 12px/1.2 ui-sans-serif,system-ui;color:${deltaColor};margin:6px 0 0;">${esc(delta)}</div>` : ''}
  ${sub ? `<div style="font:400 12px/1.3 ui-sans-serif,system-ui;color:${COLORS.ash};margin:6px 0 0;">${esc(sub)}</div>` : ''}
</div>`;
}

export function statusBadge({ label, tone = 'neutral' }) {
  const bg = tone === 'good' ? '#d4ecd5'
    : tone === 'bad' ? '#f5d4cc'
    : tone === 'warn' ? '#f5e8c8' : COLORS.cream;
  const fg = tone === 'good' ? COLORS.forest
    : tone === 'bad' ? COLORS.terra
    : tone === 'warn' ? '#6b4f00' : COLORS.ink;
  return `<span style="display:inline-flex;align-items:center;padding:4px 10px;border-radius:12px;background:${bg};color:${fg};font:600 11px/1 ui-sans-serif,system-ui;letter-spacing:0.04em;text-transform:uppercase;">${esc(label)}</span>`;
}

export function timelineRow({ ts, title, body, actor }) {
  const date = ts instanceof Date ? ts : new Date(ts || Date.now());
  return `<div style="display:flex;gap:16px;padding:14px 0;border-bottom:1px solid ${COLORS.rule};">
  <div style="flex:0 0 96px;font:500 12px/1.3 ui-monospace,monospace;color:${COLORS.ash};">${esc(date.toLocaleString())}</div>
  <div style="flex:1;">
    <div style="font:600 14px/1.3 ui-sans-serif,system-ui;color:${COLORS.ink};margin:0 0 3px;">${esc(title)}</div>
    ${body ? `<div style="font:400 13px/1.5 ui-sans-serif,system-ui;color:${COLORS.ash};">${esc(body)}</div>` : ''}
    ${actor ? `<div style="font:500 11px/1 ui-monospace,monospace;color:${COLORS.ash};margin:6px 0 0;letter-spacing:0.06em;">— ${esc(actor)}</div>` : ''}
  </div>
</div>`;
}

export function dashboardShell({ title, subtitle, tilesHtml, bodyHtml }) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>
  body { margin:0;background:${COLORS.paper};font:14px/1.5 ui-sans-serif,system-ui,-apple-system,sans-serif;color:${COLORS.ink}; }
  main { max-width:1080px;margin:0 auto;padding:48px 24px; }
  h1 { font:700 32px/1.15 'Fraunces',Georgia,serif;letter-spacing:-0.01em;margin:0 0 6px; }
  .sub { color:${COLORS.ash};margin:0 0 28px;font-size:15px; }
  .tiles { display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin:0 0 36px; }
</style></head>
<body>
<main>
  <h1>${esc(title)}</h1>
  ${subtitle ? `<p class="sub">${esc(subtitle)}</p>` : ''}
  <div class="tiles">${tilesHtml || ''}</div>
  ${bodyHtml || ''}
</main>
</body></html>`;
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
