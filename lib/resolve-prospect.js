// Shared prospect resolution. Every block handler calls this at the top.
//
// Resolves URL segments → { prospectSlug, instance, overrides, pathAfter }.
// Instance lookup hits INSTANCES KV once; overrides live INSIDE the KV value
// so deploying a new prospect = one KV write, zero wrangler deploys.
//
// KV value shape:
//   {
//     block_slug, prospect_slug, demo_url, takeover_url, status, deployed_at,
//     prospect: { name, vertical, city, decision_maker_email, ... },
//     overrides: { ...block-specific scope fields }
//   }

export async function resolveProspect(env, url, blockSlug, opts = {}) {
  const segments = url.pathname.split('/').filter(Boolean);
  const reservedFirstSegment = new Set(opts.reserved || ['api', 'sample-quote', 'embed.js', 'vertical']);

  let prospectSlug = null;
  let instance = null;
  let pathAfter = segments;

  if (segments[0] && !reservedFirstSegment.has(segments[0]) && env.INSTANCES) {
    const hit = await env.INSTANCES.get(`${blockSlug}/${segments[0]}`);
    if (hit) {
      prospectSlug = segments[0];
      try { instance = JSON.parse(hit); } catch { instance = null; }
      pathAfter = segments.slice(1);
    }
  }

  const overrides = (instance && instance.overrides) || {};
  return { prospectSlug, instance, overrides, pathAfter, segments };
}
