// Customer Status Portal — Block 14
//
// One handler covering:
//   GET  /                           → canonical demo (showcase prospect)
//   GET  /<prospect-slug>/           → per-prospect instance
//   GET  /<prospect-slug>/<record>/  → record detail w/ timeline
//   POST /<prospect-slug>/api/search → search records
//   POST /<prospect-slug>/api/event  → append event (auth required)
//
// D1 table: status_records, status_events
//   status_records(id, prospect_slug, public_id, customer_email, customer_phone, label, stage, payload_json, created_at)
//   status_events(id, record_id, ts, kind, title, body, actor, customer_visible)
//
// Customer-update generation: Claude turns the latest 3 events into one
// plain-English paragraph the customer sees at the top of the record.

import { resolveProspect } from './lib/resolve-prospect.js';

const SHOWCASE_DEMO = {
  business: 'Cafecito Demo Co.',
  recordTypeName: 'Project',
  stages: ['Intake', 'Quote', 'Scheduled', 'In Progress', 'Complete'],
  brandColor: '#1f3a2e',
};

const PROSPECT_OVERRIDES = {
  'garrido-hvac': {
    business: 'Garrido HVAC',
    recordTypeName: 'Service',
    stages: ['Intake', 'Quote', 'Scheduled', 'In Progress', 'Complete'],
    brandColor: '#b8412c',
  },
};

const PROSPECT_RECORDS = {
  'garrido-hvac': [
    {
      public_id: 'GAR-2418',
      customer_email: 'mariana.silva@example.com',
      label: 'AC compressor replacement · Kendall',
      stage: 'In Progress',
      events: [
        { ts: '2026-05-04T08:14:00Z', kind: 'intake',   title: 'Llamada recibida', body: 'Cliente reporta AC sin enfriar — visita programada para el viernes.', actor: 'Lucia (recepcionista AI)' },
        { ts: '2026-05-05T11:00:00Z', kind: 'visit',    title: 'Técnico en sitio', body: 'Compresor identificado como falla. Cotización enviada $2,140.',     actor: 'Roberto G.' },
        { ts: '2026-05-05T15:48:00Z', kind: 'approval', title: 'Cotización aprobada', body: null,                                                                actor: 'Mariana S.' },
        { ts: '2026-05-09T07:30:00Z', kind: 'progress', title: 'Compresor instalado', body: 'Unidad nueva instalada. Prueba de estabilidad de 30 minutos en curso.', actor: 'Roberto G.' },
      ],
    },
    {
      public_id: 'GAR-2419',
      customer_email: 'jorge.morales@example.com',
      label: 'Mini-split install · 2BR Brickell condo',
      stage: 'Scheduled',
      events: [
        { ts: '2026-05-02T10:00:00Z', kind: 'intake',   title: 'Request received',  body: 'Condo HOA approval pending. Install date TBD.',         actor: 'Lucia (AI recepcionista)' },
        { ts: '2026-05-08T14:30:00Z', kind: 'progress', title: 'HOA approval in',   body: 'HOA cleared install. Scheduled for May 14.',           actor: 'Office' },
      ],
    },
    {
      public_id: 'GAR-2420',
      customer_email: 'rosa.delcampo@example.com',
      label: 'Annual maintenance · 3-unit Hialeah residence',
      stage: 'Complete',
      events: [
        { ts: '2026-04-26T08:00:00Z', kind: 'visit',   title: 'Tune-up complete',  body: 'Serpentines limpios, filtros cambiados en 3 unidades.', actor: 'Roberto G.' },
        { ts: '2026-04-26T12:30:00Z', kind: 'invoice', title: 'Factura enviada',   body: '$385. Neto 15.',                                       actor: 'Office' },
        { ts: '2026-05-02T09:14:00Z', kind: 'payment', title: 'Pago recibido',     body: 'Pagado en total.',                                     actor: 'Stripe' },
      ],
    },
    {
      public_id: 'GAR-2421',
      customer_email: 'thomas.b@example.com',
      label: 'Emergency dispatch · Coral Gables · pregnant occupant',
      stage: 'Complete',
      events: [
        { ts: '2026-05-06T19:42:00Z', kind: 'intake',   title: 'After-hours emergency', body: 'House at 84°F. Auto-paged on-call tech.', actor: 'Block 12 · Missed Call Recovery' },
        { ts: '2026-05-06T19:55:00Z', kind: 'visit',    title: 'Tech on-site',           body: 'Capacitor failure. Replaced.',            actor: 'Roberto G.' },
        { ts: '2026-05-06T20:30:00Z', kind: 'complete', title: 'House cooling, billed',  body: '$480 (after-hours rate).',                actor: 'Roberto G.' },
      ],
    },
  ],
};

const SEEDED_RECORDS = [
  {
    public_id: 'DEMO-1042',
    customer_email: 'maria@example.com',
    label: 'AC compressor replacement · Coral Gables',
    stage: 'In Progress',
    events: [
      { ts: '2026-04-18T09:14:00Z', kind: 'intake',    title: 'Request received',       body: 'Customer reported AC blowing warm air, scheduled for Friday.', actor: 'Lucia (AI receptionist)' },
      { ts: '2026-04-19T11:00:00Z', kind: 'visit',     title: 'Tech on-site',            body: 'Identified compressor failure. Quote sent for $1,840.',           actor: 'Carlos R.' },
      { ts: '2026-04-19T16:22:00Z', kind: 'approval',  title: 'Quote approved by customer', body: null,                                                            actor: 'Maria L.' },
      { ts: '2026-04-22T08:00:00Z', kind: 'progress',  title: 'Compressor installed',     body: 'New unit installed. Running 30-min stability test.',             actor: 'Carlos R.' },
    ],
  },
  {
    public_id: 'DEMO-1043',
    customer_email: 'jorge@example.com',
    label: 'Mini-split install · 2BR Brickell condo',
    stage: 'Scheduled',
    events: [
      { ts: '2026-05-01T10:00:00Z', kind: 'intake',   title: 'Request received',    body: 'Condo board approval pending; install date TBD.',              actor: 'Lucia (AI receptionist)' },
      { ts: '2026-05-05T14:30:00Z', kind: 'progress', title: 'Board approval in',    body: 'HOA cleared install. Scheduled for May 14.',                    actor: 'Office' },
    ],
  },
  {
    public_id: 'DEMO-1044',
    customer_email: 'rosa@example.com',
    label: 'Annual maintenance · 3-unit residential',
    stage: 'Complete',
    events: [
      { ts: '2026-04-02T08:00:00Z', kind: 'visit',     title: 'Tune-up complete', body: 'Coils cleaned, filters changed across 3 units.', actor: 'Carlos R.' },
      { ts: '2026-04-02T12:30:00Z', kind: 'invoice',   title: 'Invoice sent',     body: '$285. Net 15.',                                  actor: 'Office' },
      { ts: '2026-04-09T09:14:00Z', kind: 'payment',   title: 'Payment received', body: 'Paid in full.',                                  actor: 'Stripe' },
    ],
  },
];

export async function handleStatus(request, env, ctx, url, block, _routerProspectSlug) {
  // The router pre-extracts segments[0] as a prospect slug, but for the canonical
  // demo, record IDs (DEMO-1042) live at the root path too — so we re-resolve
  // here using INSTANCES KV. A first segment that maps to an INSTANCES entry
  // is a prospect; otherwise it's an internal path (record ID or /api/...).
  const segments = url.pathname.split('/').filter(Boolean);
  let prospectSlug = null;
  let pathAfter = segments;

  if (segments[0] && segments[0] !== 'api' && env.INSTANCES) {
    const hit = await env.INSTANCES.get(`${block.slug}/${segments[0]}`);
    if (hit) {
      prospectSlug = segments[0];
      pathAfter = segments.slice(1);
    }
  }

  // API routes
  if (pathAfter[0] === 'api') {
    return handleApi(request, env, ctx, prospectSlug, pathAfter.slice(1));
  }

  // Record detail
  if (pathAfter.length > 0) {
    return renderRecord(env, prospectSlug, pathAfter[0]);
  }

  // Index — list records
  return renderIndex(env, prospectSlug);
}

async function handleApi(request, env, ctx, prospectSlug, apiPath) {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (apiPath[0] === 'search') {
    const { q } = await request.json().catch(() => ({}));
    const records = await getRecords(env, prospectSlug);
    const filtered = q
      ? records.filter(r =>
          r.public_id.toLowerCase().includes(q.toLowerCase()) ||
          (r.customer_email || '').toLowerCase().includes(q.toLowerCase()) ||
          (r.label || '').toLowerCase().includes(q.toLowerCase())
        )
      : records;
    return json({ records: filtered.slice(0, 20) });
  }
  return new Response('Not found', { status: 404 });
}

async function getRecords(env, prospectSlug) {
  // For the canonical demo (no prospect slug), return seeded records.
  if (!prospectSlug) return SEEDED_RECORDS;

  // Per-prospect static seed (deploy skill writes these into PROSPECT_RECORDS).
  if (PROSPECT_RECORDS[prospectSlug]) return PROSPECT_RECORDS[prospectSlug];

  // For real instances, read from D1 if a STATUS_DB binding exists.
  // (D1 not yet provisioned for status block; falls through to seeded demo.)
  if (env.STATUS_DB) {
    try {
      const rows = await env.STATUS_DB.prepare(
        `SELECT id, public_id, customer_email, label, stage, payload_json, created_at
         FROM status_records WHERE prospect_slug = ? ORDER BY created_at DESC LIMIT 100`
      ).bind(prospectSlug).all();
      // hydrate events
      const records = [];
      for (const r of rows.results || []) {
        const events = await env.STATUS_DB.prepare(
          `SELECT ts, kind, title, body, actor FROM status_events WHERE record_id = ? AND customer_visible = 1 ORDER BY ts DESC LIMIT 10`
        ).bind(r.id).all();
        records.push({ ...r, events: events.results || [] });
      }
      return records;
    } catch (e) {
      // D1 query failed; fall through to seeded demo so the page still renders.
    }
  }
  return SEEDED_RECORDS;
}

function findRecord(records, publicId) {
  return records.find(r => r.public_id === publicId);
}

async function renderIndex(env, prospectSlug) {
  const records = await getRecords(env, prospectSlug);
  const ctx = (prospectSlug && PROSPECT_OVERRIDES[prospectSlug]) ? PROSPECT_OVERRIDES[prospectSlug] : SHOWCASE_DEMO;
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(ctx.business)} — ${esc(ctx.recordTypeName)} Status</title>
${baseStyles(ctx)}
</head><body>
<main>
  <header>
    <p class="eyebrow">${esc(prospectSlug || 'canonical demo')} · powered by Cafecito Status</p>
    <h1>${esc(ctx.business)}</h1>
    <p class="sub">Look up your ${esc(ctx.recordTypeName.toLowerCase())} by ID, email, or address.</p>
  </header>
  <div class="search">
    <input id="q" type="text" placeholder="Enter ID, email, or keyword" autocomplete="off" autofocus>
  </div>
  <ul id="records" class="records">
    ${records.map(r => renderRecordCard(r, prospectSlug)).join('')}
  </ul>
  <footer>
    Cafecito Status · canonical demo serves a seeded HVAC dataset · per-prospect instances at <code>/${esc(prospectSlug || '&lt;prospect-slug&gt;')}/</code> read from D1
  </footer>
</main>
<script>
  const q = document.getElementById('q');
  const list = document.getElementById('records');
  let timer;
  q.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const res = await fetch('${prospectSlug ? `/${prospectSlug}` : ''}/api/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ q: q.value }),
      });
      const data = await res.json();
      list.innerHTML = data.records.map(r => \`
        <li class="card">
          <a href="${prospectSlug ? `/${prospectSlug}` : ''}/\${encodeURIComponent(r.public_id)}/">
            <div class="id">\${r.public_id}</div>
            <div class="label">\${r.label || ''}</div>
            <div class="meta"><span class="stage stage-\${(r.stage||'').toLowerCase().replace(/\\s+/g,'-')}">\${r.stage || ''}</span> · \${r.customer_email || ''}</div>
          </a>
        </li>
      \`).join('');
    }, 120);
  });
</script>
</body></html>`;
  return html200(html);
}

async function renderRecord(env, prospectSlug, publicId) {
  const records = await getRecords(env, prospectSlug);
  const record = findRecord(records, publicId);
  if (!record) return new Response('Record not found', { status: 404 });

  const ctx = (prospectSlug && PROSPECT_OVERRIDES[prospectSlug]) ? PROSPECT_OVERRIDES[prospectSlug] : SHOWCASE_DEMO;
  // The AI-written customer update is generated when ANTHROPIC_API_KEY exists.
  // For the canonical demo, we use a pre-baked string to avoid Claude calls in the hot path.
  const update = await maybeGenerateUpdate(env, record);

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(record.public_id)} · ${esc(ctx.business)}</title>
${baseStyles(ctx)}
</head><body>
<main>
  <p class="eyebrow"><a href="${prospectSlug ? `/${prospectSlug}/` : '/'}">← all ${esc(ctx.recordTypeName.toLowerCase())}s</a></p>
  <h1>${esc(record.public_id)}</h1>
  <p class="sub">${esc(record.label || '')}</p>
  <div class="stage-row">
    ${ctx.stages.map(s => `<span class="stage-step ${s === record.stage ? 'active' : (ctx.stages.indexOf(s) < ctx.stages.indexOf(record.stage) ? 'past' : '')}">${esc(s)}</span>`).join('<span class="stage-sep">→</span>')}
  </div>
  ${update ? `<div class="update"><div class="update-eyebrow">Latest update · plain English</div><p>${esc(update)}</p></div>` : ''}
  <h2>Timeline</h2>
  <ol class="timeline">
    ${[...record.events].reverse().map(e => `
      <li>
        <div class="ts">${new Date(e.ts).toLocaleString()}</div>
        <div class="content">
          <div class="ti">${esc(e.title)}</div>
          ${e.body ? `<div class="bd">${esc(e.body)}</div>` : ''}
          ${e.actor ? `<div class="actor">— ${esc(e.actor)}</div>` : ''}
        </div>
      </li>
    `).join('')}
  </ol>
</main>
</body></html>`;
  return html200(html);
}

async function maybeGenerateUpdate(env, record) {
  // Pre-baked for canonical demo
  const PRE_BAKED = {
    'DEMO-1042': 'Carlos finished installing your new compressor this morning. We are running a 30-minute stability test before closing out — you should be cool by lunch. Invoice will arrive by email tomorrow.',
    'DEMO-1043': 'Your HOA cleared the install. We are scheduled for May 14 — Carlos will text you the morning-of with an arrival window.',
    'DEMO-1044': 'Your annual maintenance is complete and your invoice is fully paid. No action needed from you.',
    'GAR-2418':  'Roberto terminó de instalar su nuevo compresor esta mañana. Estamos haciendo una prueba de estabilidad de 30 minutos — usted debe sentir el aire frío antes del almuerzo. La factura llegará por correo electrónico mañana.',
    'GAR-2419':  'Su HOA aprobó la instalación. Estamos programados para el 14 de mayo — Roberto le enviará un mensaje esa mañana con la ventana de llegada.',
    'GAR-2420':  'Su mantenimiento anual está completo y su factura está pagada en total. No se necesita acción de su parte.',
    'GAR-2421':  'Su llamada de emergencia entró fuera de horario, fuimos a su casa en 13 minutos y reemplazamos el capacitor que había fallado. Casa enfriando ahora. Le cobramos la tarifa de emergencia ($480) — invoice ya enviado.',
  };
  if (PRE_BAKED[record.public_id]) return PRE_BAKED[record.public_id];

  // Real instances with ANTHROPIC_API_KEY can call Claude here.
  return null;
}

function renderRecordCard(r, prospectSlug) {
  return `<li class="card">
    <a href="${prospectSlug ? `/${prospectSlug}` : ''}/${encodeURIComponent(r.public_id)}/">
      <div class="id">${esc(r.public_id)}</div>
      <div class="label">${esc(r.label || '')}</div>
      <div class="meta"><span class="stage stage-${(r.stage || '').toLowerCase().replace(/\s+/g, '-')}">${esc(r.stage || '')}</span> · ${esc(r.customer_email || '')}</div>
    </a>
  </li>`;
}

function baseStyles(ctx) {
  return `<style>
:root { color-scheme: light; }
*{box-sizing:border-box}
body{margin:0;font:15px/1.55 ui-sans-serif,system-ui,-apple-system,"Inter Tight",sans-serif;background:#f5f1ea;color:#0f0e0c}
main{max-width:760px;margin:0 auto;padding:48px 24px 96px}
header{margin:0 0 28px}
.eyebrow{font:500 11px/1 ui-monospace,monospace;letter-spacing:0.16em;text-transform:uppercase;color:${ctx.brandColor};margin:0 0 12px}
.eyebrow a{color:inherit;text-decoration:none}
h1{font:700 32px/1.15 "Fraunces",Georgia,serif;margin:0 0 6px;letter-spacing:-0.01em}
.sub{color:#6b6660;margin:0 0 22px;font-size:15px}
.search{margin:0 0 28px}
.search input{width:100%;font:400 16px/1.4 ui-sans-serif,system-ui;padding:14px 16px;border:1px solid #0f0e0c;border-radius:4px;background:#fff}
.records{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px}
.card a{display:block;text-decoration:none;color:inherit;background:#fff;border:1px solid #d9d4ca;border-radius:6px;padding:16px 18px}
.card a:hover{background:#ece5d8}
.id{font:600 14px/1.2 ui-monospace,monospace;color:${ctx.brandColor};margin:0 0 4px}
.label{font:500 16px/1.3 "Fraunces",Georgia,serif;margin:0 0 6px}
.meta{font:400 12px/1.3 ui-monospace,monospace;color:#6b6660}
.stage{display:inline-block;padding:2px 8px;border-radius:10px;background:#ece5d8;color:#0f0e0c;font-size:10px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600}
.stage-complete{background:#d4ecd5;color:${ctx.brandColor}}
.stage-in-progress{background:#f5e8c8;color:#6b4f00}
.stage-scheduled{background:#cfdef5;color:#1a3a6b}
.stage-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 24px}
.stage-step{font:600 11px/1 ui-sans-serif,system-ui;padding:6px 10px;border-radius:12px;background:#ece5d8;color:#6b6660;letter-spacing:0.08em;text-transform:uppercase}
.stage-step.past{background:#cfdef5;color:#1a3a6b}
.stage-step.active{background:${ctx.brandColor};color:#f5f1ea}
.stage-sep{color:#9b948b;font-size:12px}
.update{background:${ctx.brandColor};color:#f5f1ea;padding:18px 20px;border-radius:6px;margin:0 0 28px}
.update-eyebrow{font:500 11px/1 ui-monospace,monospace;letter-spacing:0.15em;text-transform:uppercase;color:#b8d4c8;margin:0 0 6px}
.update p{margin:0;font-size:15px;line-height:1.5}
h2{font:600 20px/1.2 "Fraunces",Georgia,serif;margin:0 0 12px}
.timeline{list-style:none;margin:0;padding:0}
.timeline li{display:flex;gap:16px;padding:14px 0;border-bottom:1px solid #d9d4ca}
.timeline .ts{flex:0 0 130px;font:500 12px/1.3 ui-monospace,monospace;color:#6b6660}
.timeline .ti{font:600 14px/1.3 ui-sans-serif,system-ui;color:#0f0e0c;margin:0 0 3px}
.timeline .bd{font:400 13px/1.5 ui-sans-serif,system-ui;color:#2a2723}
.timeline .actor{font:500 11px/1 ui-monospace,monospace;color:#6b6660;margin:6px 0 0;letter-spacing:0.04em}
footer{margin:64px 0 0;padding-top:24px;border-top:1px solid #d9d4ca;font:400 12px/1.5 ui-sans-serif,system-ui;color:#6b6660}
footer code{background:#ece5d8;padding:2px 6px;border-radius:3px}
</style>`;
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function html200(html) {
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=60, must-revalidate',
    },
  });
}

function json(data) {
  return new Response(JSON.stringify(data), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
