// sales:score — 4-pt qualification of a prospect.
// Deterministic + observable. Each point has a quoted reason.
//
// 1. Has pain we solve?       — site fetch + heuristic on phone visibility / language gap / hours mention
// 2. Has $500+/mo budget?     — vertical fit (HVAC/restoration/dental score higher) + multi-loc indicators
// 3. Reachable owner?         — has_phone signal from site + notes mention an owner
// 4. Vertical we've shipped?  — matches a vertical we've live-deployed before

import { loadProspect, fetchSiteFacts } from './prospect-context.js';

const SHIPPED_VERTICALS = new Set([
  'hvac', 'plumbing', 'pool service', 'restoration', 'electrical',
  'auto detail', 'medspa', 'dental', 'landscaping', 'locksmith',
]);

const HIGH_BUDGET_VERTICALS = new Set([
  'hvac', 'restoration', 'medspa', 'dental', 'electrical', 'plumbing',
]);

export async function scoreProspect(env, slug) {
  const ts = Date.now();
  const prospect = await loadProspect(env, slug);
  if (!prospect) return { ok: false, error: `no _prospect/${slug} or _prospect_draft/${slug} in KV` };

  const vertical = (prospect.vertical || '').toLowerCase();
  const notes = (prospect.notes || '').toLowerCase();
  const site = await fetchSiteFacts(prospect.url || '');

  const points = [];

  // 1. Pain we solve
  const painSignals = [];
  if (notes.includes('after-hours') || notes.includes('voicemail') || notes.includes('voice mail')) painSignals.push('after-hours coverage gap in notes');
  if (notes.includes('slow') && notes.includes('quote')) painSignals.push('slow-quote signal in notes');
  if (notes.includes('miss') && notes.includes('call')) painSignals.push('missed-call signal in notes');
  if (notes.includes('reactivat')) painSignals.push('reactivation gap in notes');
  if (notes.includes('bilingual') || notes.includes('spanish')) painSignals.push('language signal in notes');
  if (site.ok && !site.has_phone) painSignals.push('site lacks visible phone number');
  if (painSignals.length > 0) points.push({ rule: 'has_pain_we_solve', awarded: true, evidence: painSignals });
  else points.push({ rule: 'has_pain_we_solve', awarded: false, evidence: ['no specific pain signal in notes or site'] });

  // 2. Budget proxy
  const budgetSignals = [];
  if (HIGH_BUDGET_VERTICALS.has(vertical)) budgetSignals.push(`high-budget vertical (${vertical})`);
  if (notes.match(/\b\d+ (trucks|locations|offices|technicians|stores)\b/)) budgetSignals.push('multi-truck/multi-loc signal in notes');
  if (notes.includes('multi-loc') || notes.includes('multi loc') || notes.includes('locations')) budgetSignals.push('multi-location signal');
  if (points[0].awarded && budgetSignals.length > 0) points.push({ rule: 'has_budget', awarded: true, evidence: budgetSignals });
  else points.push({ rule: 'has_budget', awarded: budgetSignals.length > 0, evidence: budgetSignals.length ? budgetSignals : ['no budget signal'] });

  // 3. Reachable owner
  const ownerSignals = [];
  if (site.ok && site.has_phone) ownerSignals.push('phone on site');
  if (notes.includes('owner-operated') || notes.includes('single-owner') || notes.match(/\b(owner|founder|principal)\b/i)) ownerSignals.push('owner referenced in notes');
  points.push({ rule: 'reachable_owner', awarded: ownerSignals.length > 0, evidence: ownerSignals.length ? ownerSignals : ['no owner signal'] });

  // 4. Vertical we've shipped
  const v = vertical.replace(/\s+/g, ' ').trim();
  const shipped = SHIPPED_VERTICALS.has(v);
  points.push({ rule: 'vertical_shipped_before', awarded: shipped, evidence: shipped ? [`${vertical} — we've shipped this`] : [`${vertical} — net-new vertical`] });

  const total = points.filter(p => p.awarded).length;
  const bucket = total >= 3 ? 'hot' : total === 2 ? 'warm' : 'cold';

  const result = {
    ts,
    slug,
    business: prospect.business,
    vertical: prospect.vertical,
    score: total,
    bucket,
    points,
    site_facts: site,
  };

  // Update prospect record with score
  if (env.INSTANCES) {
    const key = prospect._from_draft ? `_prospect_draft/${slug}` : `_prospect/${slug}`;
    const updated = { ...prospect, _from_draft: undefined, score: total, bucket, scored_at: ts, score_points: points };
    delete updated._from_draft;
    await env.INSTANCES.put(key, JSON.stringify(updated));
  }

  return result;
}
