// sales:nurture — alpha. Drafts day-3 / day-7 / day-14 touches for warm prospects.
// v1: template-based. v2 (later): swap in Claude for tone matching.

const TEMPLATES = {
  3: (p) => `Hi — quick follow-up. The ${p.demo_block || 'demo'} I built for ${p.business} is still live at ${p.demo_url}.\n\nAny thoughts? Happy to walk through it in 10 min this week.\n\n—Evan`,
  7: (p) => `Hey, circling back on the ${p.business} demo. If timing isn't right that's fine — just want to know if I should keep it deployed.\n\nQuick yes/no/later works.\n\nDemo: ${p.demo_url}\n\n—Evan`,
  14: (p) => `Last note from me — I'll spin down the ${p.business} demo at the end of the week unless I hear back. Easy to bring back later if priorities change.\n\nDemo (while still live): ${p.demo_url}\n\n—Evan`,
};

async function listWarmProspects(env) {
  const keys = [];
  let cursor;
  do {
    const page = await env.INSTANCES.list({ prefix: '_prospect/', limit: 1000, cursor });
    for (const k of page.keys) keys.push(k.name);
    cursor = page.cursor;
    if (page.list_complete) break;
  } while (cursor);
  const out = [];
  for (const k of keys) {
    const raw = await env.INSTANCES.get(k);
    if (!raw) continue;
    try {
      const p = JSON.parse(raw);
      if (p.bucket === 'warm' || (p.status || 'warm') === 'warm') out.push(p);
    } catch (_e) {}
  }
  return out;
}

export async function runNurture(env) {
  const ts = Date.now();
  const prospects = await listWarmProspects(env);
  const drafts = [];
  for (const p of prospects) {
    const lastTouch = p.last_touch_at || p.scored_at || p.added_at || p.drafted_at || ts;
    const ageDays = Math.floor((ts - lastTouch) / (1000 * 60 * 60 * 24));
    let touchDay = null;
    if (ageDays >= 14) touchDay = 14;
    else if (ageDays >= 7) touchDay = 7;
    else if (ageDays >= 3) touchDay = 3;
    if (!touchDay) continue;

    const tmpl = TEMPLATES[touchDay];
    const ctx = {
      business: p.business || p.slug,
      demo_block: (p.suggested_blocks && p.suggested_blocks[0]) || 'demo',
      demo_url: `https://${(p.suggested_blocks && p.suggested_blocks[0]) || 'estimate'}.cafecito-ai.com/${p.slug}/`,
    };
    const body = tmpl(ctx);
    const subject = touchDay === 14
      ? `Last note on ${ctx.business} demo`
      : `Following up on ${ctx.business} demo (day ${touchDay})`;
    const draft = { slug: p.slug, business: p.business, touch_day: touchDay, subject, body, drafted_at: ts };
    drafts.push(draft);
    if (env.INSTANCES) {
      await env.INSTANCES.put(`_outbound_draft/${p.slug}/${touchDay}`, JSON.stringify(draft), { expirationTtl: 60 * 60 * 24 * 21 });
    }
  }
  const out = { ts, iso_date: new Date(ts).toISOString().slice(0, 10), warm_count: prospects.length, drafts_created: drafts.length, drafts };
  if (env.INSTANCES) {
    await env.INSTANCES.put('_agent_log/sales:nurture', JSON.stringify({ ran_at: ts, ok: true, output_summary: `${drafts.length} touches drafted across ${prospects.length} warm prospects` }));
  }
  return out;
}
