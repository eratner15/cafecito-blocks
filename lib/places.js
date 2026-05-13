// Google Places sourcer + heuristic-seed fallback.
// PR 4 ships the alpha version: if GOOGLE_PLACES_KEY is set, hits Places Textsearch
// API for a vertical+city query; otherwise returns a curated seed list of Miami
// SMBs so the agent demonstrates end-to-end without the key.

const SEED_MIAMI = [
  { slug: 'miami-coastline-plumbing',  business: 'Coastline Plumbing Miami',  vertical: 'plumbing',  url: 'https://example.com/coastline', notes: 'After-hours dispatcher kicks to voicemail; high Yelp volume',  city: 'Miami', score_hint: 3 },
  { slug: 'miami-aqua-pool-pros',      business: 'Aqua Pool Pros',            vertical: 'pool service', url: 'https://example.com/aqua', notes: 'Photo intake gap, owner-operated, multiple Spanish reviews', city: 'Miami', score_hint: 2 },
  { slug: 'miami-tropics-electric',    business: 'Tropics Electric Service',  vertical: 'electrical', url: 'https://example.com/tropics', notes: 'No after-hours line, "call back tomorrow" pattern in reviews',  city: 'Miami', score_hint: 3 },
  { slug: 'miami-bayside-detail',      business: 'Bayside Auto Detail',       vertical: 'auto detail', url: 'https://example.com/bayside', notes: 'No quote workflow on site — text-only intake',                city: 'Miami', score_hint: 2 },
  { slug: 'doral-acme-hvac',           business: 'ACME HVAC Doral',           vertical: 'HVAC',       url: 'https://example.com/acme', notes: 'Multi-truck (4 trucks listed), English-only site in ES-dominant area', city: 'Doral', score_hint: 3 },
  { slug: 'hialeah-rosa-medspa',       business: 'Rosa MedSpa',               vertical: 'medspa',     url: 'https://example.com/rosa', notes: 'No-show rate referenced in 2 reviews — reactivation gap',         city: 'Hialeah', score_hint: 3 },
  { slug: 'kendall-summit-restoration', business: 'Summit Water Restoration', vertical: 'restoration', url: 'https://example.com/summit', notes: '24/7 emergency service but answering machine after 8pm',          city: 'Kendall', score_hint: 3 },
  { slug: 'aventura-shorelawn',        business: 'Shoreline Lawn & Landscape', vertical: 'landscaping', url: 'https://example.com/shoreline', notes: 'Quote turnaround complaint in reviews — 3-5 day wait',      city: 'Aventura', score_hint: 2 },
  { slug: 'coral-gables-dental',       business: 'Coral Gables Family Dental', vertical: 'dental',    url: 'https://example.com/cgdental', notes: 'No bilingual menu; clientele 50/50 ES/EN per neighborhood',   city: 'Coral Gables', score_hint: 2 },
  { slug: 'miami-beach-locksmith',     business: 'Beach Emergency Locksmith', vertical: 'locksmith',  url: 'https://example.com/locksmith', notes: 'Single-owner, 24/7 service line goes to cell phone',           city: 'Miami Beach', score_hint: 3 },
];

export async function fetchPlaces(env, { city = 'Miami', vertical, limit = 10 } = {}) {
  // Real Places API path
  if (env.GOOGLE_PLACES_KEY) {
    const q = `${vertical || 'local services'} ${city}`;
    const u = `https://places.googleapis.com/v1/places:searchText`;
    const res = await fetch(u, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': env.GOOGLE_PLACES_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.websiteUri,places.nationalPhoneNumber,places.userRatingCount,places.rating,places.formattedAddress',
      },
      body: JSON.stringify({ textQuery: q, pageSize: limit }),
    });
    if (!res.ok) {
      // Fall back to seed if API errors
      return { source: 'seed-fallback', error: `Places ${res.status}`, candidates: SEED_MIAMI.slice(0, limit) };
    }
    const j = await res.json();
    const candidates = (j.places || [])
      .filter(p => p.websiteUri && p.nationalPhoneNumber && (p.userRatingCount || 0) >= 5)
      .map(p => placesToCandidate(p, city));
    return { source: 'places', candidates };
  }
  // Fallback path
  return { source: 'seed', note: 'GOOGLE_PLACES_KEY not set — returning curated Miami seed list', candidates: SEED_MIAMI.slice(0, limit) };
}

function placesToCandidate(p, city) {
  const name = (p.displayName?.text || '').trim();
  const slug = `${city.toLowerCase().replace(/\s+/g, '-')}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`.slice(0, 60);
  return {
    slug,
    business: name,
    vertical: 'unknown',  // BDR fills this on review
    url: p.websiteUri,
    notes: `${p.userRatingCount} reviews · rating ${p.rating} · ${p.formattedAddress || ''}`,
    city,
    score_hint: 2,
    places_id: p.id,
  };
}

// Run the sourcer end-to-end: fetch candidates, write _prospect_draft/<slug> for each.
// Only writes drafts that don't already exist as _prospect/<slug> or _prospect_draft/<slug>.
export async function runSourcer(env, opts = {}) {
  const ts = Date.now();
  const result = await fetchPlaces(env, opts);
  const written = [];
  const skipped = [];
  for (const c of result.candidates) {
    const live = await env.INSTANCES?.get(`_prospect/${c.slug}`);
    const draft = await env.INSTANCES?.get(`_prospect_draft/${c.slug}`);
    if (live || draft) { skipped.push(c.slug); continue; }
    const payload = { ...c, drafted_at: ts, source: result.source };
    await env.INSTANCES?.put(`_prospect_draft/${c.slug}`, JSON.stringify(payload), {
      expirationTtl: 60 * 60 * 24 * 30,
    });
    written.push(c.slug);
  }
  const summary = {
    ts,
    iso_date: new Date(ts).toISOString().slice(0, 10),
    source: result.source,
    note: result.note || null,
    error: result.error || null,
    written_count: written.length,
    skipped_count: skipped.length,
    written,
    skipped,
  };
  await env.INSTANCES?.put(`_agent_log/sales:source`, JSON.stringify({ ran_at: ts, ok: true, output_summary: `${written.length} new drafts, ${skipped.length} dedup'd`, ...summary }));
  return summary;
}
