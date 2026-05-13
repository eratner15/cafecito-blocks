// dev:incident — minimal viable version. Reads _incident/* KV records (populated by external alerting
// or block error reporting later). Returns the most recent N. v1 is a read-only view.
// v2 (later): integrate Workers Analytics API for live error-rate detection.

export async function listIncidents(env, { limit = 10 } = {}) {
  if (!env.INSTANCES) return { ok: false, error: 'INSTANCES KV not bound' };
  const keys = [];
  let cursor;
  do {
    const page = await env.INSTANCES.list({ prefix: '_incident/', limit: 1000, cursor });
    for (const k of page.keys) keys.push(k);
    cursor = page.cursor;
    if (page.list_complete) break;
  } while (cursor);
  const items = [];
  for (const k of keys.slice(0, limit)) {
    const raw = await env.INSTANCES.get(k.name);
    if (!raw) continue;
    try { items.push(JSON.parse(raw)); } catch (_e) {}
  }
  items.sort((a, b) => (b.ts || 0) - (a.ts || 0));
  return { ok: true, ts: Date.now(), count: items.length, items };
}
