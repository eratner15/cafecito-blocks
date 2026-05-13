// Dossier composer — deterministic, no LLM calls.
// Pulls every existing lib output into one structured JSON document.
// The narrative layer (gap analysis, comparable case) is added later by a
// local Claude Code skill writing back to _dossier/<slug>.narrative.

import { loadProspect, fetchSiteFacts, listProspectBlocks } from './prospect-context.js';
import { scoreProspect } from './score.js';
import { recommendBlocks, BLOCK_SLUG } from './recommend.js';
import { priceBundle } from './pricing.js';
import { draftPitch } from './pitch.js';
import { prepareDemo } from './demo-prep.js';
// After sync this file lives at /home/eratner/cafecito-ai/blocks/handlers/lib/dossier.js
// and resolves data.js as ../../data.js (relative to that destination).
import { BLOCKS } from '../../data.js';

export async function composeDossier(env, slug) {
  const ts = Date.now();
  let prospect = await loadProspect(env, slug);
  if (!prospect) {
    return { ok: false, error: `no _prospect/${slug} or _prospect_draft/${slug} in KV`, slug };
  }

  // 1. Ensure score is fresh (within 24h). If not, re-score.
  const scoreAgeMs = ts - (prospect.scored_at || 0);
  if (!prospect.scored_at || scoreAgeMs > 24 * 60 * 60 * 1000) {
    try {
      const s = await scoreProspect(env, slug);
      if (s && s.ok !== false) {
        prospect = { ...prospect, score: s.score, bucket: s.bucket, score_points: s.points, site_facts: s.site_facts, scored_at: s.ts };
      }
    } catch (_e) {
      // Fall through — score-less dossier still has value
    }
  }

  // 2. Fetch site facts if not already on the prospect record.
  let siteFacts = prospect.site_facts;
  if (!siteFacts || !siteFacts.ok) {
    siteFacts = await fetchSiteFacts(prospect.url || '');
  }
  const enriched = { ...prospect, site_facts: siteFacts };

  // 3. Block recommendation.
  const rec = recommendBlocks(enriched, { max: 3 });

  // 4. Pricing.
  const pricing = priceBundle(BLOCKS, rec.ranked, enriched);

  // 5. Existing instances + handoff state.
  const existing = await listProspectBlocks(env, slug);
  const handoffRaw = await env.INSTANCES?.get(`_handoff/${slug}`);
  let handoff = null;
  if (handoffRaw) { try { handoff = JSON.parse(handoffRaw); } catch (_e) {} }

  // 6. Pitch + demo prep using the recommended block set.
  const recBlockKeys = rec.ranked.map((r) => r.block_slug);
  const pitch = await draftPitch(env, slug, recBlockKeys).catch((e) => ({ ok: false, error: e.message }));
  const demo = await prepareDemo(env, slug, recBlockKeys).catch((e) => ({ ok: false, error: e.message }));

  // 7. Deploy commands (copy-paste ready).
  const businessQuoted = `"${(enriched.business || slug).replace(/"/g, '\\"')}"`;
  const verticalQuoted = `"${(enriched.vertical || 'unknown').replace(/"/g, '\\"')}"`;
  const cityQuoted = `"${(enriched.city || 'Miami').replace(/"/g, '\\"')}"`;
  const urlQuoted = `"${(enriched.url || '').replace(/"/g, '\\"')}"`;
  const notesQuoted = `"${(enriched.notes || '').replace(/"/g, '\\"')}"`;
  const blocksCsv = recBlockKeys.join(',');

  const deployCommands = {
    add: `bash /home/eratner/cafecito-blocks/scripts/add-prospect.sh ${slug} ${businessQuoted} ${verticalQuoted} ${cityQuoted} ${urlQuoted} ${notesQuoted}`,
    deploy: `bash /home/eratner/cafecito-blocks/scripts/deploy-prospect.sh ${slug} ${blocksCsv} ${businessQuoted}`,
  };

  // 8. Next-action heuristic.
  let nextAction;
  if (handoff?.status === 'live') nextAction = 'Live — monitor + log MRR';
  else if (handoff?.status === 'pending' || handoff?.status === 'in_progress') nextAction = 'Engineer working — Sales nurture if >48h';
  else if (existing.length > 0) nextAction = 'Demo deployed — send pitch + book call';
  else if (rec.ranked.length > 0 && (enriched.bucket === 'hot' || enriched.bucket === 'warm')) nextAction = `Deploy ${blocksCsv} + send pitch`;
  else if (enriched.bucket === 'cold') nextAction = 'Cold prospect — re-source in 90d or qualify out';
  else nextAction = 'Score prospect first';

  // 9. Existing narrative if present.
  const narrativeRaw = await env.INSTANCES?.get(`_dossier/${slug}.narrative`);
  let narrative = null;
  if (narrativeRaw) { try { narrative = JSON.parse(narrativeRaw); } catch (_e) {} }

  const dossier = {
    ok: true,
    ts,
    slug,
    business: enriched.business,
    vertical: enriched.vertical,
    city: enriched.city,
    url: enriched.url,
    notes: enriched.notes,
    from_draft: !!prospect._from_draft,

    // Score
    scored_at: enriched.scored_at || null,
    score: enriched.score ?? null,
    bucket: enriched.bucket || null,
    score_points: enriched.score_points || [],

    // Site
    site_facts: siteFacts,

    // Recommended blocks (ranked)
    recommended_blocks: rec.ranked,
    recommendation_meta: {
      primary_block: rec.primary_block,
      has_signals: rec.has_signals,
      fallback_used: rec.fallback_used,
    },

    // Pricing
    pricing,

    // Existing state
    existing_instances: existing,
    handoff,

    // Sales artifacts
    drafted_pitch: pitch?.ok ? { subject: pitch.subject, body: pitch.body } : null,
    demo_prep: demo?.ok ? { checklist: demo.checklist, missing_deploys: demo.missing_deploys, talk_track: demo.talk_track, next_action: demo.next_action } : null,
    deploy_commands: deployCommands,
    next_action: nextAction,

    // Narrative (set by local Claude Code skill via upload-narrative)
    narrative,
  };

  // Cache the deterministic data.
  if (env.INSTANCES) {
    await env.INSTANCES.put(`_dossier/${slug}.data`, JSON.stringify(dossier), {
      expirationTtl: 60 * 60 * 24, // 24h
    });
    await env.INSTANCES.put(`_agent_log/sales:dossier`, JSON.stringify({
      ran_at: ts, ok: true,
      output_summary: `${enriched.business || slug}: score ${enriched.score ?? '?'} / ${enriched.bucket || '?'} → ${recBlockKeys.join('+') || 'no rec'} @ $${pricing.monthly_at_recommended_tier_usd}/mo`,
    }));
  }

  return dossier;
}
