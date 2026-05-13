// Dev triage — pure deterministic. No LLM calls in v1.
// Walks _handoff/* and _ship_log/* (and optionally _incident/*), scores each
// queue item, returns top N with a human-readable reason.

async function listKeys(env, prefix) {
  const keys = [];
  let cursor;
  do {
    const page = await env.INSTANCES.list({ prefix, limit: 1000, cursor });
    for (const k of page.keys) keys.push(k.name);
    cursor = page.cursor;
    if (page.list_complete) break;
  } while (cursor);
  return keys;
}

// Score: higher = more urgent.
//   pending handoff: 100 base · +5 per day age
//   blocked handoff: 80 base · +5 per day age
//   in_progress handoff: 30 base · +3 per day age
//   live handoff: skip
const STATUS_BASE = {
  pending: 100,
  blocked: 80,
  in_progress: 30,
};

export async function computeTriageList(env, { limit = 10 } = {}) {
  const ts = Date.now();
  const handoffKeys = await listKeys(env, '_handoff/');
  const items = [];
  for (const key of handoffKeys) {
    const raw = await env.INSTANCES.get(key);
    if (!raw) continue;
    let h = null;
    try { h = JSON.parse(raw); } catch (_e) { continue; }
    const status = (h.status || '').toLowerCase();
    if (status === 'live') continue;
    const base = STATUS_BASE[status];
    if (base == null) continue;
    const ageDays = Math.max(0, Math.floor((ts - (h.created_at || ts)) / (1000 * 60 * 60 * 24)));
    const score = base + (status === 'in_progress' ? 3 : 5) * ageDays;
    const reason = `${status.toUpperCase()} for ${ageDays}d · ${(h.blocks || []).join('+')} for ${h.prospect}`;
    items.push({
      kind: 'handoff',
      score,
      key,
      prospect: h.prospect,
      blocks: h.blocks || [],
      status,
      age_days: ageDays,
      go_live: h.go_live || null,
      reason,
    });
  }

  items.sort((a, b) => b.score - a.score);
  const top = items.slice(0, limit);

  const rollup = {
    ts,
    iso_date: new Date(ts).toISOString().slice(0, 10),
    total_pending: items.filter(i => i.status === 'pending').length,
    total_blocked: items.filter(i => i.status === 'blocked').length,
    total_in_progress: items.filter(i => i.status === 'in_progress').length,
    top,
  };

  await env.INSTANCES.put(`_triage/${rollup.iso_date}`, JSON.stringify(rollup), {
    expirationTtl: 60 * 60 * 24 * 60,
  });
  await env.INSTANCES.put('_triage/latest', JSON.stringify(rollup));

  return rollup;
}
