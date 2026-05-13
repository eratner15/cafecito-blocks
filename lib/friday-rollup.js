// ops:friday-rollup — Friday morning. Drafts the ship-review agenda from:
//   _ship_log/*               — block-level changes shipped this week
//   _handoff/*                — handoffs that flipped to live this week
//   _prospect/*               — sold + lost transitions this week (closes + reasons)
// Output goes to _friday_rollup/<iso-date> and surfaces on /operate#today.

async function listPrefix(env, prefix) {
  const out = [];
  let cursor;
  do {
    const page = await env.INSTANCES.list({ prefix, limit: 1000, cursor });
    for (const k of page.keys) out.push(k.name);
    cursor = page.cursor;
    if (page.list_complete) break;
  } while (cursor);
  return out;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function buildFridayRollup(env) {
  const ts = Date.now();
  const weekAgo = ts - WEEK_MS;

  const shipKeys = await listPrefix(env, '_ship_log/');
  const ships = [];
  for (const k of shipKeys) {
    const raw = await env.INSTANCES.get(k);
    if (!raw) continue;
    try {
      const row = JSON.parse(raw);
      if ((row.ts || 0) >= weekAgo) ships.push(row);
    } catch (_e) {}
  }

  const handoffKeys = await listPrefix(env, '_handoff/');
  const closed_this_week = [];
  const stalled = [];
  for (const k of handoffKeys) {
    const raw = await env.INSTANCES.get(k);
    if (!raw) continue;
    try {
      const h = JSON.parse(raw);
      if ((h.updated_at || 0) >= weekAgo && (h.status || '').toLowerCase() === 'live') closed_this_week.push(h);
      if ((h.status || '').toLowerCase() === 'pending' && (h.created_at || ts) < weekAgo) stalled.push(h);
    } catch (_e) {}
  }

  const prospectKeys = await listPrefix(env, '_prospect/');
  const sold_this_week = [];
  const lost_this_week = [];
  for (const k of prospectKeys) {
    const raw = await env.INSTANCES.get(k);
    if (!raw) continue;
    try {
      const p = JSON.parse(raw);
      if ((p.status_changed_at || 0) >= weekAgo) {
        if ((p.bucket || p.status) === 'sold') sold_this_week.push(p);
        else if ((p.bucket || p.status) === 'lost') lost_this_week.push(p);
      }
    } catch (_e) {}
  }

  const agenda = [
    `🚢 Engineer walks ${ships.length} shipped changes${ships.length ? ': ' + ships.slice(0, 5).map(s => s.block || '?').join(', ') + (ships.length > 5 ? '…' : '') : ''}.`,
    `🤝 ${closed_this_week.length} handoffs flipped to live this week.`,
    `💰 ${sold_this_week.length} closes this week${sold_this_week.length ? ': ' + sold_this_week.slice(0, 3).map(s => s.business || s.slug).join(', ') : ''}.`,
    `❌ ${lost_this_week.length} losses${lost_this_week.length ? ' (review reasons)' : ''}.`,
    stalled.length ? `⏰ ${stalled.length} handoffs stalled >7d — Engineer escalate.` : null,
    `🗳️ Team vote: one anti-pattern from the week to add to /operate#anti-patterns.`,
  ].filter(Boolean);

  const out = {
    ts,
    iso_date: new Date(ts).toISOString().slice(0, 10),
    ship_count: ships.length,
    closed_this_week: closed_this_week.length,
    sold_this_week: sold_this_week.length,
    lost_this_week: lost_this_week.length,
    stalled_handoffs: stalled.length,
    agenda,
    detail: {
      ships,
      closed_this_week,
      sold_this_week: sold_this_week.map(p => ({ slug: p.slug, business: p.business })),
      lost_this_week: lost_this_week.map(p => ({ slug: p.slug, business: p.business, reason: p.lost_reason || null })),
      stalled,
    },
  };
  if (env.INSTANCES) {
    await env.INSTANCES.put('_friday_rollup/latest', JSON.stringify(out));
    await env.INSTANCES.put(`_friday_rollup/${out.iso_date}`, JSON.stringify(out), { expirationTtl: 60 * 60 * 24 * 90 });
  }
  return out;
}
