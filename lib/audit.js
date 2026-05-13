// ops:workboard-audit — nightly. Walks _prospect/* + INSTANCES for instances without a _handoff,
// flags stale (>14d no touch), missing fields (no score, no notes, no vertical), and prospects
// deployed but with no `_handoff/<slug>` record.

async function listPrefix(env, prefix) {
  const out = [];
  let cursor;
  do {
    const page = await env.INSTANCES.list({ prefix, limit: 1000, cursor });
    for (const k of page.keys) out.push(k.name);
    cursor = page.cursor;
    if (page.list_complete) break;
  } while (cursor);
  return out;
}

export async function auditWorkboard(env) {
  const ts = Date.now();
  const prospectKeys = await listPrefix(env, '_prospect/');
  const draftKeys = await listPrefix(env, '_prospect_draft/');
  const handoffKeys = new Set((await listPrefix(env, '_handoff/')).map(k => k.split('/')[1]));
  const stale = [];
  const missing_fields = [];
  const deployed_no_handoff = [];

  for (const key of prospectKeys) {
    const raw = await env.INSTANCES.get(key);
    if (!raw) continue;
    let p; try { p = JSON.parse(raw); } catch (_e) { continue; }
    const slug = key.split('/')[1];
    const lastTouch = p.last_touch_at || p.scored_at || p.added_at || ts;
    const ageDays = Math.floor((ts - lastTouch) / (1000 * 60 * 60 * 24));

    if (ageDays > 14 && (p.bucket || 'warm') !== 'sold') {
      stale.push({ slug, business: p.business, age_days: ageDays, bucket: p.bucket || 'unknown', last_touch_at: lastTouch });
    }
    const missing = [];
    if (!p.vertical) missing.push('vertical');
    if (!p.notes) missing.push('notes');
    if (p.score == null) missing.push('score');
    if (missing.length) missing_fields.push({ slug, business: p.business, missing });
  }

  // For each instance live, check if there's a _handoff
  let cursor;
  do {
    const page = await env.INSTANCES.list({ limit: 1000, cursor });
    for (const k of page.keys) {
      if (k.name.startsWith('_')) continue;
      if (!k.name.includes('/')) continue;
      const slug = k.name.split('/')[1];
      const raw = await env.INSTANCES.get(k.name);
      if (!raw) continue;
      let inst; try { inst = JSON.parse(raw); } catch (_e) { continue; }
      if ((inst.status || '').toLowerCase() === 'live' && !handoffKeys.has(slug)) {
        deployed_no_handoff.push({ slug, block_slug: k.name.split('/')[0] });
      }
    }
    cursor = page.cursor;
    if (page.list_complete) break;
  } while (cursor);

  const monday_notes = [
    `Audit ${new Date(ts).toISOString().slice(0, 10)} — ${stale.length} stale prospects, ${missing_fields.length} prospects with missing fields, ${deployed_no_handoff.length} live instances without _handoff.`,
    stale.length ? `Stale (>14d): ${stale.slice(0, 5).map(s => s.slug).join(', ')}${stale.length > 5 ? '…' : ''}` : null,
    missing_fields.length ? `Missing fields: ${missing_fields.slice(0, 5).map(m => `${m.slug} (${m.missing.join('+')})`).join(', ')}` : null,
    deployed_no_handoff.length ? `Deployed-no-handoff: ${deployed_no_handoff.slice(0, 5).map(d => `${d.slug}/${d.block_slug}`).join(', ')}` : null,
  ].filter(Boolean).join('\n');

  const out = {
    ts,
    iso_date: new Date(ts).toISOString().slice(0, 10),
    total_prospects: prospectKeys.length,
    total_drafts: draftKeys.length,
    stale_count: stale.length,
    missing_fields_count: missing_fields.length,
    deployed_no_handoff_count: deployed_no_handoff.length,
    stale,
    missing_fields,
    deployed_no_handoff,
    monday_notes,
  };
  if (env.INSTANCES) {
    await env.INSTANCES.put('_audit/latest', JSON.stringify(out));
    await env.INSTANCES.put(`_audit/${out.iso_date}`, JSON.stringify(out), { expirationTtl: 60 * 60 * 24 * 60 });
  }
  return out;
}
