// Google Places API helpers — find a business + pull recent reviews.
// Shared by blocks 04 (reviews), 07 (reactivate).

const PLACES_NEW = 'https://places.googleapis.com/v1';

export async function findPlace(env, params) {
  const { query } = params;
  if (!env.GOOGLE_PLACES_KEY) throw new Error('GOOGLE_PLACES_KEY missing');
  if (!query) throw new Error('query required');

  const res = await fetch(`${PLACES_NEW}/places:searchText`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-Goog-Api-Key': env.GOOGLE_PLACES_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount',
    },
    body: JSON.stringify({ textQuery: query, pageSize: 1 }),
  });
  if (!res.ok) throw new Error(`Places search ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.places?.[0] || null;
}

export async function getPlaceWithReviews(env, placeId) {
  if (!env.GOOGLE_PLACES_KEY) throw new Error('GOOGLE_PLACES_KEY missing');
  if (!placeId) throw new Error('placeId required');

  const res = await fetch(`${PLACES_NEW}/places/${placeId}`, {
    headers: {
      'X-Goog-Api-Key': env.GOOGLE_PLACES_KEY,
      'X-Goog-FieldMask': 'id,displayName,formattedAddress,rating,userRatingCount,reviews,websiteUri,internationalPhoneNumber',
    },
  });
  if (!res.ok) throw new Error(`Places details ${res.status}: ${await res.text()}`);
  return res.json();
}

export function normalizeReview(r) {
  return {
    author: r.authorAttribution?.displayName || 'Anonymous',
    rating: r.rating || 0,
    text: r.text?.text || '',
    publishTime: r.publishTime || null,
    languageCode: r.text?.languageCode || 'en',
    relativeTime: r.relativePublishTimeDescription || '',
    raw: r,
  };
}
