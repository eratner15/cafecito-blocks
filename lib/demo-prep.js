// sales:demo-prep — pre-call checklist.
// Given a prospect slug + scheduled blocks, verify each block is deployed,
// return URLs to open + 12-min talk-track outline.

import { loadProspect, listProspectBlocks } from './prospect-context.js';

const TALK_TRACK = {
  voice:     '"Talk to Lucia" button → 30-sec call demo · highlight bilingual auto-detect + Cal.com booking',
  estimate:  'Drag a photo of their truck / a job site → Claude Vision → real quote in 30 sec',
  recovery:  'Type a customer SMS scenario → Claude triage → SMS draft + classification',
  intake:    'Fill the form → routing decision + email digest sample',
  reviews:   'Pull a real Google review → drafted reply → magic-link approval',
  reactivate: 'CSV upload → outbound SMS preview → Cal.com booking confirmation',
  scan:      'Visibility report against ChatGPT/Claude/Perplexity → audit recs',
  docs:      'Upload a sample PDF → search across uploaded docs',
  outreach:  'Show prospect list + drafted outreach + sequence preview',
  ops:       'KPI tiles + day-over-day delta on their fake data',
  brand:     'AI-generated brand site preview + Cal.com + Stripe',
  orders:    'Fax PDF → normalized order → ops email',
  bilingual: 'Toggle ES/EN overlay on their actual site (sub-frame)',
  status:    'Customer-facing status page with their job IDs',
  qa:        'Upload sample call log CSV → missed-revenue report PDF',
  form:      'Generate the vertical-specific form → fill it → see the lead',
};

export async function prepareDemo(env, slug, blockKeys) {
  const prospect = await loadProspect(env, slug);
  if (!prospect) return { ok: false, error: `no _prospect/${slug}` };

  const deployedBlocks = await listProspectBlocks(env, slug);
  const deployedKeys = new Set(deployedBlocks.map(b => {
    // block_slug looks like "01-bilingual-voice-receptionist" — last word maps to subdomain
    const parts = b.block_slug.split('-');
    return parts[parts.length - 1] === 'receptionist' ? 'voice'
         : parts[parts.length - 1] === 'recovery' ? 'recovery'
         : parts[parts.length - 1] === 'generator' ? 'estimate'
         : parts[parts.length - 1] === 'portal' ? 'status'
         : parts[parts.length - 1] === 'triage' ? 'intake'
         : parts[parts.length - 1];
  }));

  const target = (blockKeys && blockKeys.length) ? blockKeys : Array.from(deployedKeys);
  const checklist = target.map(k => ({
    block: k,
    demo_url: `https://${k}.cafecito-ai.com/${slug}/`,
    deployed: deployedKeys.has(k),
    talk_track: TALK_TRACK[k] || '(no track yet — wing it)',
  }));

  const missing = checklist.filter(c => !c.deployed);
  const talk = [
    '(2m) Open the demo URL. Read the eyebrow + h1 out loud. They see their business name. Reset the room.',
    ...checklist.map((c, i) => `(${Math.round(5 / checklist.length)}m) ${c.block}: ${c.talk_track}`),
    '(3m) Pricing — quote from data.js. Two-block chain = 10% off monthlies. No discount on setup.',
    '(2m) Close: "Want to run this on real traffic next week?" If yes → handoff. If maybe → 7-day follow-up. If no → ask what\'s missing.',
  ];

  const out = {
    ts: Date.now(),
    slug,
    business: prospect.business,
    vertical: prospect.vertical,
    checklist,
    missing_deploys: missing.map(c => c.block),
    talk_track: talk,
    next_action: missing.length
      ? `Deploy missing blocks before the call: bash /home/eratner/cafecito-blocks/scripts/deploy-prospect.sh ${slug} ${missing.map(c => c.block).join(',')} "${prospect.business}"`
      : 'Ready. Open the URLs and walk the talk track.',
  };
  if (env.INSTANCES) {
    await env.INSTANCES.put(`_demo_prep/${slug}`, JSON.stringify(out), { expirationTtl: 60 * 60 * 24 * 14 });
  }
  return { ok: true, ...out };
}
