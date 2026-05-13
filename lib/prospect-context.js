// Prospect context lib — shared by sales:score, sales:pitch, sales:demo-prep, sales:nurture.
// Reads a prospect from INSTANCES KV (_prospect/<slug>), optionally fetches the prospect's
// site head + title + meta description. Pure deterministic; no LLM calls.

export async function loadProspect(env, slug) {
  if (!env.INSTANCES) throw new Error('INSTANCES KV not bound');
  const raw = await env.INSTANCES.get(`_prospect/${slug}`);
  if (!raw) {
    const draft = await env.INSTANCES.get(`_prospect_draft/${slug}`);
    if (draft) return { ...JSON.parse(draft), _from_draft: true };
    return null;
  }
  return JSON.parse(raw);
}

// List live block instances for a prospect (e.g. estimate.cafecito-ai.com/<slug>/).
export async function listProspectBlocks(env, slug) {
  if (!env.INSTANCES) return [];
  const list = await env.INSTANCES.list({ limit: 1000 });
  const blocks = [];
  for (const k of list.keys) {
    if (k.name.startsWith('_')) continue;
    const parts = k.name.split('/');
    if (parts.length !== 2 || parts[1] !== slug) continue;
    const raw = await env.INSTANCES.get(k.name);
    if (!raw) continue;
    try {
      const inst = JSON.parse(raw);
      blocks.push({ block_slug: parts[0], ...inst });
    } catch (_e) {}
  }
  return blocks;
}

// Fetch the prospect's website to grab title + meta description (used for personalization).
// Returns { ok, title, description, has_phone, language_hint, raw_excerpt } or { ok: false }.
export async function fetchSiteFacts(url, { timeoutMs = 5000 } = {}) {
  if (!url || !/^https?:\/\//i.test(url)) return { ok: false, error: 'invalid url' };
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'follow', cf: { cacheTtl: 300 } });
    clearTimeout(t);
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const html = (await res.text()).slice(0, 60000);
    const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || '';
    const description = (html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i) || [])[1] || '';
    const has_phone = /tel:|\(\d{3}\)\s?\d{3}-?\d{4}|\d{3}-\d{3}-\d{4}/.test(html);
    const langAttr = (html.match(/<html[^>]+lang=["']([a-z\-]+)["']/i) || [])[1] || '';
    const spanishHits = (html.match(/(\bservicios|nosotros|contacto|llame|gratis)\b/gi) || []).length;
    const language_hint = langAttr || (spanishHits >= 3 ? 'es' : 'en');
    return {
      ok: true,
      title: title.trim().slice(0, 200),
      description: description.trim().slice(0, 300),
      has_phone,
      language_hint,
      raw_excerpt: html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 600),
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
