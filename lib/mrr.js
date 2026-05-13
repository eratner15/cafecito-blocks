// MRR rollup — pure deterministic. No LLM calls.
// Walks INSTANCES KV, finds entries shaped <block-slug>/<prospect-slug> with status=live,
// looks up the block's monthly fee in data.js, sums by block + total.
// Writes the rollup to _mrr_log/<YYYY-MM-DD>.

// After sync this file lives at /home/eratner/cafecito-ai/blocks/handlers/lib/mrr.js
// and resolves data.js as ../../data.js (relative to that destination).
import { BLOCKS } from '../../data.js';

// Parse the first dollar amount out of a monthlyPrice string like '$400/mo + per-min usage'.
// Returns the integer monthly fee in USD, or 0 if not parseable.
function monthlyFee(monthlyPriceStr) {
  if (!monthlyPriceStr) return 0;
  const m = String(monthlyPriceStr).match(/\$(\d+(?:\.\d+)?)/);
  return m ? Math.round(parseFloat(m[1])) : 0;
}

// List all live instances. INSTANCES KV keys are shaped:
//   <block-slug>/<prospect-slug>      → live instance JSON
//   _prospect/<slug>                  → prospect metadata
//   _handoff/<slug>                   → handoff state
//   _chain/<slug>                     → chain meta
//   _mrr_log/<YYYY-MM-DD>             → historical rollup
//
// We only care about the first shape. Filter by absence of leading underscore.
async function listAllInstanceKeys(env) {
  const keys = [];
  let cursor;
  do {
    const page = await env.INSTANCES.list({ limit: 1000, cursor });
    for (const k of page.keys) {
      if (k.name.startsWith('_')) continue;        // skip meta prefixes
      if (!k.name.includes('/')) continue;          // must be <block>/<slug>
      keys.push(k.name);
    }
    cursor = page.cursor;
    if (page.list_complete) break;
  } while (cursor);
  return keys;
}

export async function computeMrrRollup(env) {
  const ts = Date.now();
  const isoDate = new Date(ts).toISOString().slice(0, 10);

  const blockFee = Object.fromEntries(
    BLOCKS.map(b => [b.slug, monthlyFee(b.monthlyPrice)])
  );

  const byBlock = {};       // block-slug → { count, mrr }
  let totalMrr = 0;
  let liveCount = 0;
  let totalCount = 0;

  const allKeys = await listAllInstanceKeys(env);
  for (const key of allKeys) {
    totalCount++;
    const raw = await env.INSTANCES.get(key);
    if (!raw) continue;
    let inst = null;
    try { inst = JSON.parse(raw); } catch (_e) { continue; }
    if ((inst.status || '').toLowerCase() !== 'live') continue;

    const [blockSlug] = key.split('/');
    const fee = blockFee[blockSlug] || 0;
    if (!byBlock[blockSlug]) byBlock[blockSlug] = { count: 0, mrr: 0 };
    byBlock[blockSlug].count += 1;
    byBlock[blockSlug].mrr += fee;
    totalMrr += fee;
    liveCount += 1;
  }

  const rollup = {
    ts,
    iso_date: isoDate,
    total_mrr_usd: totalMrr,
    live_instance_count: liveCount,
    total_instance_count: totalCount,
    by_block: byBlock,
    monthly_fees_used: blockFee,
  };

  // Persist
  await env.INSTANCES.put(`_mrr_log/${isoDate}`, JSON.stringify(rollup), {
    expirationTtl: 60 * 60 * 24 * 400, // ~13 months
  });
  // Latest pointer
  await env.INSTANCES.put('_mrr_log/latest', JSON.stringify(rollup));

  return rollup;
}
