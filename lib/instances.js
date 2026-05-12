// INSTANCES KV registry — every block writes here when it deploys
// a per-prospect variant. Read by /new-hire block cards + by chain skills.
//
// Key shape: `<block-slug>/<prospect-slug>`
// Value:    { block_slug, prospect_slug, demo_url, takeover_url, status, deployed_at }
// Metadata: { deployed_at }  (KV metadata, so listing is cheap)

export async function recordInstance(env, params) {
  const { blockSlug, prospectSlug, demoUrl, takeoverUrl, status = 'live' } = params;
  if (!env.INSTANCES) throw new Error('INSTANCES KV binding missing');
  const key = `${blockSlug}/${prospectSlug}`;
  const deployedAt = Date.now();
  const value = JSON.stringify({
    block_slug: blockSlug,
    prospect_slug: prospectSlug,
    demo_url: demoUrl,
    takeover_url: takeoverUrl,
    status,
    deployed_at: deployedAt,
  });
  await env.INSTANCES.put(key, value, { metadata: { deployed_at: deployedAt } });
  return { key, deployedAt };
}

export async function getInstance(env, blockSlug, prospectSlug) {
  if (!env.INSTANCES) return null;
  const raw = await env.INSTANCES.get(`${blockSlug}/${prospectSlug}`);
  return raw ? JSON.parse(raw) : null;
}

export async function listInstancesForBlock(env, blockSlug) {
  if (!env.INSTANCES) return [];
  const out = [];
  let cursor;
  do {
    const list = await env.INSTANCES.list({ prefix: `${blockSlug}/`, cursor });
    for (const k of list.keys) {
      out.push({
        key: k.name,
        prospect_slug: k.name.slice(blockSlug.length + 1),
        deployed_at: (k.metadata && k.metadata.deployed_at) || 0,
      });
    }
    cursor = list.list_complete ? null : list.cursor;
  } while (cursor);
  out.sort((a, b) => b.deployed_at - a.deployed_at);
  return out;
}

export async function deleteInstance(env, blockSlug, prospectSlug) {
  if (!env.INSTANCES) return;
  await env.INSTANCES.delete(`${blockSlug}/${prospectSlug}`);
}
