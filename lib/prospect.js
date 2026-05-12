// Fetch + cache prospect context from /new-hire/prospects.
// Every deploy skill calls getProspect(slug) to seed per-prospect templates.

const PROSPECT_INDEX_URL = 'https://cafecito-ai.com/new-hire/prospects';

export async function getProspect(slug) {
  if (!slug) throw new Error('slug required');
  // The /new-hire/prospects route serves JSON when Accept: application/json is set.
  const res = await fetch(`${PROSPECT_INDEX_URL}.json`, {
    headers: { accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Prospect index ${res.status}`);
  const data = await res.json();
  const list = Array.isArray(data) ? data : (data.prospects || []);
  return list.find(p => p.slug === slug) || null;
}

export function takeoverUrl(blockSubdomain, prospectSlug) {
  return `https://${blockSubdomain}.cafecito-ai.com/${prospectSlug}/`;
}

export function canonicalDemoUrl(blockSubdomain) {
  return `https://${blockSubdomain}.cafecito-ai.com/`;
}
