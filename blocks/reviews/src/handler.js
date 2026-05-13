// Review Response Bot — Block 04
// Pulls Google reviews via lib/google-places, drafts responses in the owner's voice,
// owner approves with one click via magic-link from a daily digest email.

import { resolveProspect } from './lib/resolve-prospect.js';

const SHOWCASE = {
  business: 'Café Versailles · Little Havana',
  rating: 4.2,
  reviewCount: 1287,
  unrespondedRate: 0.61,
};

const SHOWCASE_REVIEWS = [
  { author: 'Maria T.', rating: 5, text: 'Best cortadito in Miami, and the medianoche was perfect. Service was warm, just like home.', draft: 'Thank you Maria — we are so glad the cortadito hit the spot. The medianoche is a Versailles classic, glad you tried it. ¡Vuelve pronto!', tone: 'warm' },
  { author: 'David R.', rating: 2, text: 'Wait was 40 minutes for a window order at 7pm. Used to be faster.', draft: 'David, thank you for telling us — 40 minutes is too long for a window order. We are working on faster service during dinner rush. Please come back and ask for Carlos at the window; we will make sure the next visit is quicker.', tone: 'apologetic' },
  { author: 'Jennifer K.', rating: 5, text: 'The flan! The colada! The vibe! This place is everything a Miami visit should be.', draft: 'Thank you Jennifer — the flan and colada thank you back. We hope to see you on your next Miami visit. Tell your friends to bring an empty stomach.', tone: 'playful' },
  { author: 'Robert M.', rating: 1, text: 'Cashier was rude when I asked for the wifi password. Will not return.', draft: null, tone: null, escalate: 'Flagged for owner review — single complaint about staff conduct; manager should call back personally.' },
];

export async function handleReviews(request, env, ctx, url, block, _routerProspectSlug) {
  const segments = url.pathname.split('/').filter(Boolean);
  let prospectSlug = null;
  let scope = { ...SHOWCASE };
  if (segments[0] && segments[0] !== 'api' && env.INSTANCES) {
    const hit = await env.INSTANCES.get(`${block.slug}/${segments[0]}`);
    if (hit) {
      prospectSlug = segments[0];
      try {
        const _inst = JSON.parse(hit);
        if (_inst && _inst.overrides) Object.assign(scope, _inst.overrides);
      } catch (_e) {}
    }
  }
  return html200(renderDigest(scope, SHOWCASE_REVIEWS, prospectSlug, block));
}

function renderDigest(s, reviews, prospectSlug, block) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(s.business)} — review digest · today</title>
${styles()}
</head><body>
<main>
  <p class="eyebrow">Block 04 · Review Response Bot · ${esc(prospectSlug || 'canonical demo')}</p>
  <h1>${esc(s.business)}</h1>
  <p class="meta">${s.rating} ★ · ${s.reviewCount.toLocaleString()} Google reviews · ${Math.round(s.unrespondedRate * 100)}% unresponded · today's digest: 4 new reviews</p>
  <h2>Drafted responses (one-click approve)</h2>
  ${reviews.map(r => renderReviewCard(r, prospectSlug)).join('')}
  <h2>How it works</h2>
  <ol class="flow">
    <li><strong>Daily pull.</strong> Google Places API. New reviews land in our worker every morning.</li>
    <li><strong>Voice profile.</strong> Trained on your About page + 10 manually-written examples. Mimics formality, slang, and Spanish/English mix.</li>
    <li><strong>Owner approval.</strong> Each draft has a magic-link in the morning digest email. Click once = posted. Edit-then-post if needed.</li>
    <li><strong>Escalation.</strong> 1-star reviews or staff-complaint flags do NOT get auto-responses — manager reviews + calls back personally.</li>
  </ol>
  <h2>For sales</h2>
  <p class="lede">Block 04 is $1k setup · $250/mo. Anchor on: "61% of your reviews have no owner response. Google local-pack ranking weights response rate." Deploy: <code>/cafecito-blocks:reviews &lt;prospect-slug&gt;</code></p>
  <div class="cta-row">
    <a class="btn-outline" href="https://cafecito-ai.com/new-hire/blocks/${esc(block.slug)}">Read the playbook</a>
    <a class="btn-outline" href="https://github.com/cafecito-ai/block-reviews">GitHub mirror</a>
  </div>
  <footer>Cafecito Blocks · reviews.cafecito-ai.com</footer>
</main>
</body></html>`;
}

function renderReviewCard(r, prospectSlug) {
  return `<article class="review">
    <header class="review-h">
      <span class="stars">${'★'.repeat(r.rating)}<span class="stars-dim">${'★'.repeat(5 - r.rating)}</span></span>
      <span class="author">${esc(r.author)}</span>
    </header>
    <p class="review-text">${esc(r.text)}</p>
    ${r.escalate ? `<div class="escalate"><strong>⚠ Escalated:</strong> ${esc(r.escalate)}</div>` : `
      <div class="draft">
        <p class="draft-label">Drafted response · ${esc(r.tone)} tone</p>
        <p class="draft-text">${esc(r.draft)}</p>
        <div class="draft-actions">
          <button class="btn btn-approve">✓ Approve + post</button>
          <button class="btn btn-edit">✎ Edit</button>
        </div>
      </div>
    `}
  </article>`;
}

function styles() {
  return `<style>
*{box-sizing:border-box}
body{margin:0;background:#f5f1ea;color:#0f0e0c;font:15px/1.55 ui-sans-serif,system-ui,-apple-system,"Inter Tight",sans-serif}
main{max-width:740px;margin:0 auto;padding:48px 24px 96px}
.eyebrow{font:500 11px/1 ui-monospace,monospace;letter-spacing:0.16em;text-transform:uppercase;color:#b8412c;margin:0 0 14px}
h1{font:700 30px/1.15 "Fraunces",Georgia,serif;margin:0 0 6px}
.meta{font:400 13px/1.4 ui-sans-serif,system-ui;color:#6b6660;margin:0 0 28px}
h2{font:600 20px/1.2 "Fraunces",Georgia,serif;margin:32px 0 14px}
.review{background:#fff;border:1px solid #d9d4ca;border-radius:6px;padding:18px 22px;margin:0 0 14px}
.review-h{display:flex;justify-content:space-between;margin:0 0 8px;font-size:14px}
.stars{color:#b8412c;font-size:15px}
.stars-dim{color:#d9d4ca}
.author{font-weight:600}
.review-text{margin:0 0 14px;font-size:14px;line-height:1.55;color:#2a2723}
.draft{background:#f8f5ee;padding:14px 16px;border-radius:4px;border-left:3px solid #1f3a2e}
.draft-label{font:500 11px/1 ui-monospace,monospace;letter-spacing:0.14em;text-transform:uppercase;color:#1f3a2e;margin:0 0 8px}
.draft-text{margin:0 0 12px;font-size:14px;line-height:1.55;color:#0f0e0c;font-style:italic}
.draft-actions{display:flex;gap:8px}
.btn{padding:8px 14px;border-radius:4px;font:500 13px/1 ui-sans-serif,system-ui;cursor:pointer;border:1px solid #0f0e0c;background:#fff;color:#0f0e0c}
.btn-approve{background:#1f3a2e;color:#f5f1ea;border-color:#1f3a2e}
.escalate{background:#fff3e6;padding:12px 14px;border-radius:4px;border-left:3px solid #b8412c;font-size:13px}
.flow{padding-left:1.2em;margin:0 0 28px}
.flow li{margin:0 0 10px;line-height:1.55}
.lede{font-size:15px;color:#2a2723;line-height:1.55;margin:0 0 16px}
.btn-outline{display:inline-block;padding:10px 16px;border:1px solid #0f0e0c;border-radius:4px;text-decoration:none;color:#0f0e0c;font:500 13px/1 ui-sans-serif,system-ui;background:#fff}
.cta-row{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 36px}
code{font-family:ui-monospace,monospace;background:#ece5d8;padding:2px 6px;border-radius:3px;font-size:0.9em}
footer{font:400 12px/1.5 ui-sans-serif,system-ui;color:#6b6660;border-top:1px solid #d9d4ca;padding-top:18px}
</style>`;
}

function esc(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function html200(html){return new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=60, must-revalidate'}});}
