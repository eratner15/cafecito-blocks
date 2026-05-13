// Block recommendation engine — deterministic, no LLM.
// Takes prospect data (vertical + notes + score_points + site_facts) and ranks 1-3 blocks.
// Each recommendation carries the reason chain so the dossier UI can show "why."
//
// Architecture: signal-detection in notes/site > vertical fallback. A block can be triggered
// by a signal OR by being a default for the vertical. Signals win.

// Subdomain → BLOCKS.data.js slug for pricing lookup.
const BLOCK_SLUG = {
  voice:       '01-bilingual-voice-receptionist',
  intake:      '02-smart-intake-triage',
  estimate:    '03-quote-estimate-generator',
  reviews:     '04-review-response-bot',
  scan:        '05-ai-visibility-citability-scanner',
  docs:        '06-document-ai-search',
  reactivate:  '07-sms-reactivation-agent',
  outreach:    '08-cold-outreach-engine',
  ops:         '09-internal-ops-dashboard',
  brand:       '10-personal-brand-site-booking',
  orders:      '11-ai-order-desk',
  recovery:    '12-missed-call-recovery',
  bilingual:   '13-bilingual-conversion-layer',
  status:      '14-customer-status-portal',
  qa:          '15-ai-front-desk-qa',
  form:        '16-vertical-quote-form-rebuilder',
};

// Signal patterns: regex → block + reason. First match wins per signal.
const SIGNAL_RULES = [
  {
    block: 'recovery',
    test: (s) => /(missed call|miss.{0,3}call|voicemail|after.?hours|callback|busy line|no answer)/i.test(s),
    reason: 'Missed-call coverage signal',
  },
  {
    block: 'voice',
    test: (s) => /(bilingual|spanish|español|espan|en.?ES|after.?hours.{0,30}phone|24\/?7 line|receptionist)/i.test(s),
    reason: 'Bilingual / live-answer signal',
  },
  {
    block: 'bilingual',
    test: (s) => /(english.?only|sólo inglés|spanish.dominant|hispan|latino|spanish.speaking)/i.test(s),
    reason: 'Language-mismatch signal — site is monolingual in bilingual market',
  },
  {
    block: 'estimate',
    test: (s) => /(slow quote|quote.{0,15}(turnaround|wait|time)|photo.?quote|estimate.?lag|24.?72.?hour)/i.test(s),
    reason: 'Slow-quote signal in notes/reviews',
  },
  {
    block: 'reactivate',
    test: (s) => /(no.?show|reactivat|customer.?retent|lapsed|inactive customer)/i.test(s),
    reason: 'Reactivation / no-show signal',
  },
  {
    block: 'reviews',
    test: (s) => /(google review|reputation|review response|reviews? mgmt)/i.test(s),
    reason: 'Review-management signal',
  },
  {
    block: 'orders',
    test: (s) => /(fax|order entry|order desk|paper order|email order)/i.test(s),
    reason: 'Multi-channel order intake signal',
  },
  {
    block: 'docs',
    test: (s) => /(document search|knowledge base|legal doc|matter.?file|policy doc)/i.test(s),
    reason: 'Document-search signal',
  },
  {
    block: 'ops',
    test: (s) => /(multi.?loc|multiple location|\d+ location|kpi|dashboard|operational)/i.test(s),
    reason: 'Multi-location / ops dashboard signal',
  },
  {
    block: 'status',
    test: (s) => /(status portal|case status|where.?(is|are).?(we|things)|customer update)/i.test(s),
    reason: 'Customer-status-portal signal',
  },
  {
    block: 'qa',
    test: (s) => /(call log|missed revenue|front.?desk qa|call audit)/i.test(s),
    reason: 'Front-desk QA signal',
  },
];

// Fallback by vertical — only used when no signals fire. 1-2 default blocks per vertical.
const VERTICAL_DEFAULTS = {
  'hvac':           ['voice', 'recovery'],
  'plumbing':       ['voice', 'recovery'],
  'electrical':     ['voice', 'recovery'],
  'restoration':    ['voice', 'recovery'],
  'pool service':   ['estimate', 'form'],
  'pool':           ['estimate', 'form'],
  'auto detail':    ['estimate', 'form'],
  'landscaping':    ['estimate', 'form'],
  'medspa':         ['reactivate', 'bilingual'],
  'dental':         ['reactivate', 'bilingual'],
  'legal':          ['docs', 'intake'],
  'law':            ['docs', 'intake'],
  'wholesale food': ['orders', 'intake'],
  'restaurant':     ['voice', 'reviews'],
  'locksmith':      ['voice', 'recovery'],
  'cleaning':       ['estimate', 'form'],
  'roofing':        ['estimate', 'form'],
};

const RANK_ORDER = ['primary', 'secondary', 'tertiary'];

export function recommendBlocks(prospect, opts = {}) {
  const max = opts.max || 3;
  const searchableText = [
    prospect.notes || '',
    prospect.business || '',
    prospect.site_facts?.title || '',
    prospect.site_facts?.description || '',
  ].join(' ');
  const vertical = (prospect.vertical || '').toLowerCase().trim();

  // 1. Run signal rules — collect matches with reasons.
  const fromSignals = new Map();
  for (const rule of SIGNAL_RULES) {
    if (rule.test(searchableText)) {
      if (!fromSignals.has(rule.block)) {
        fromSignals.set(rule.block, { block: rule.block, reasons: [rule.reason], source: 'signal' });
      } else {
        fromSignals.get(rule.block).reasons.push(rule.reason);
      }
    }
  }

  // 2. Vertical fallback for any open slot.
  const fromVertical = (VERTICAL_DEFAULTS[vertical] || ['voice', 'recovery']).map((b) => ({
    block: b,
    reasons: [`Vertical default for ${vertical || 'unknown vertical'}`],
    source: 'vertical',
  }));

  // 3. Merge: signals first (de-duped), then vertical fallbacks to fill, cap at max.
  const seen = new Set();
  const merged = [];
  for (const r of fromSignals.values()) {
    if (!seen.has(r.block)) { merged.push(r); seen.add(r.block); }
  }
  for (const r of fromVertical) {
    if (merged.length >= max) break;
    if (!seen.has(r.block)) { merged.push(r); seen.add(r.block); }
  }

  // 4. Rank + enrich with pricing fields (caller passes BLOCKS for monthly/setup lookup).
  const ranked = merged.slice(0, max).map((r, i) => ({
    block_slug: r.block,
    block_full_slug: BLOCK_SLUG[r.block] || null,
    rank: RANK_ORDER[i] || 'tertiary',
    why: r.reasons.join(' · '),
    pain_signal_match: r.source === 'signal' ? r.reasons : [],
    source: r.source,
  }));

  return {
    ranked,
    primary_block: ranked[0]?.block_slug || null,
    has_signals: fromSignals.size > 0,
    fallback_used: ranked.some((r) => r.source === 'vertical'),
  };
}

export { BLOCK_SLUG };
