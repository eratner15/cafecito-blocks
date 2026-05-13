// Pricing recommendation engine — deterministic.
// Takes recommended blocks + score bucket and returns:
//   - setup + monthly totals
//   - chain discount (10% for 2+ blocks, baked into /prospects loop)
//   - discount tier recommendation (per /operate#decision-rights)
//   - whether AE can quote without approval
//   - one-year value
//
// Source of truth for per-block pricing: BLOCKS array exported from blocks/data.js
// (loaded by caller and passed in to avoid an import cycle inside the lib).

function parseUsd(str) {
  if (!str) return 0;
  const m = String(str).match(/\$([\d,]+)/);
  return m ? parseInt(m[1].replace(/,/g, ''), 10) : 0;
}

// Convert subdomain ('voice') → full slug ('01-bilingual-voice-receptionist').
// We look up by suffix match against BLOCKS so we don't hardcode.
function findBlockData(BLOCKS, subdomainOrFullSlug) {
  // Try exact slug
  let hit = BLOCKS.find((b) => b.slug === subdomainOrFullSlug);
  if (hit) return hit;
  // Try subdomain match — last word in slug
  hit = BLOCKS.find((b) => {
    const last = b.slug.split('-').slice(-1)[0];
    return last === subdomainOrFullSlug;
  });
  if (hit) return hit;
  // Try contains
  hit = BLOCKS.find((b) => b.slug.includes(subdomainOrFullSlug));
  return hit || null;
}

export function priceBundle(BLOCKS, recommendedBlocks, prospect = {}) {
  const items = recommendedBlocks.map((r) => {
    const data = findBlockData(BLOCKS, r.block_slug || r.block || '');
    return {
      block_slug: r.block_slug || r.block,
      rank: r.rank,
      setup_usd: data ? parseUsd(data.setupPrice) : 0,
      monthly_usd: data ? parseUsd(data.monthlyPrice) : 0,
      monthly_price_str: data?.monthlyPrice || null,
      setup_price_str: data?.setupPrice || null,
    };
  });

  const setupTotal = items.reduce((s, i) => s + i.setup_usd, 0);
  const monthlySubtotal = items.reduce((s, i) => s + i.monthly_usd, 0);
  const chainDiscountPct = items.length >= 2 ? 10 : 0;
  const monthlyAfterDiscount = Math.round(monthlySubtotal * (1 - chainDiscountPct / 100));

  // Discount tier recommendation — per /operate#decision-rights
  // - Hot (3+ score) single block: 0% (AE no approval)
  // - Hot 2+ blocks: 10% (built-in, AE no approval)
  // - Warm + multi-block: up to 25% (AE notify Lead)
  // - Strategic / 3+ blocks: 25-50% (Lead approval)
  const score = prospect.score || 0;
  const bucket = prospect.bucket || (score >= 3 ? 'hot' : score === 2 ? 'warm' : 'cold');
  let recommendedTier = 0;
  let aeCanQuote = true;
  let approvalNote = null;

  if (bucket === 'hot' && items.length >= 2) {
    recommendedTier = 10;
    approvalNote = 'Built-in 10% chain discount. No further approval needed.';
  } else if (bucket === 'hot' && items.length === 1) {
    recommendedTier = 0;
    approvalNote = 'Single-block hot prospect. Quote at list price, no discount needed.';
  } else if (bucket === 'warm' && items.length >= 2) {
    recommendedTier = 15;
    aeCanQuote = true;
    approvalNote = 'Warm prospect with chain. Quote 10% chain + up to 5% AE discretion. Mention to Lead in standup.';
  } else if (bucket === 'warm') {
    recommendedTier = 10;
    aeCanQuote = true;
    approvalNote = 'Warm single block. Up to 10% AE discretion. Mention to Lead in standup.';
  } else if (bucket === 'cold') {
    recommendedTier = 0;
    aeCanQuote = false;
    approvalNote = 'Cold prospect. Re-score before quoting, or reject and re-source in 90 days.';
  }

  if (items.length >= 3) {
    aeCanQuote = recommendedTier <= 25;
    if (recommendedTier > 25) approvalNote = '3+ blocks at >25% discount — Lead approval required.';
  }

  const oneYearValue = setupTotal + (monthlyAfterDiscount * 12) - Math.round(monthlySubtotal * 12 * (recommendedTier - chainDiscountPct) / 100);

  return {
    items,
    setup_total_usd: setupTotal,
    monthly_subtotal_usd: monthlySubtotal,
    chain_discount_pct: chainDiscountPct,
    monthly_after_chain_discount_usd: monthlyAfterDiscount,
    recommended_discount_tier_pct: recommendedTier,
    ae_can_quote_without_approval: aeCanQuote,
    approval_note: approvalNote,
    one_year_value_usd: Math.max(0, oneYearValue),
    monthly_at_recommended_tier_usd: Math.round(monthlySubtotal * (1 - recommendedTier / 100)),
  };
}
