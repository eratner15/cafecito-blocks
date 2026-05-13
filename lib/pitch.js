// sales:pitch — alpha. Template-based personalized cold-pitch draft.
// v1: pure JS template. v2 (later): swap in a Claude call for tone matching.

import { loadProspect, listProspectBlocks } from './prospect-context.js';
import { BLOCKS } from '../../data.js';

const BLOCK_LANG = {
  voice:       { what: 'a bilingual voice receptionist',                  pain: 'never miss another call in English or Spanish' },
  intake:      { what: 'a smart intake form',                              pain: 'route every web lead to the right person automatically' },
  estimate:    { what: 'a photo-to-quote generator',                       pain: 'send branded quotes from a phone photo in 90 seconds' },
  reviews:     { what: 'a review response bot',                            pain: 'reply to every review with your voice, not your time' },
  scan:        { what: 'an AI visibility scanner',                         pain: 'see what ChatGPT and Claude say about you when buyers ask' },
  docs:        { what: 'a document AI search',                             pain: 'find anything in your docs without scrolling' },
  reactivate:  { what: 'an SMS reactivation agent',                        pain: 'bring back the customers you already paid to acquire' },
  outreach:    { what: 'a cold outreach engine',                           pain: 'send personalized prospecting emails without hiring a BDR' },
  ops:         { what: 'an internal ops dashboard',                        pain: 'see your business in one screen instead of seven tabs' },
  brand:       { what: 'a personal brand site',                            pain: 'turn referrals into bookings without a designer' },
  orders:      { what: 'an AI order desk',                                 pain: 'normalize every order — fax, email, photo, text — into the same flow' },
  recovery:    { what: 'a missed-call recovery agent',                     pain: 'turn every missed call into a booked appointment via SMS' },
  bilingual:   { what: 'a bilingual conversion overlay',                   pain: 'serve your Spanish-speaking customers without a second website' },
  status:      { what: 'a customer status portal',                         pain: 'stop fielding "where are we" calls — show them a live status page' },
  qa:          { what: 'a front-desk QA agent',                            pain: 'know which calls you missed revenue on, before the customer churns' },
  form:        { what: 'a vertical quote-form rebuilder',                  pain: 'capture qualified leads through a form built for your trade' },
};

export async function draftPitch(env, slug, blockKeys) {
  const prospect = await loadProspect(env, slug);
  if (!prospect) return { ok: false, error: `no _prospect/${slug}` };
  const keys = Array.isArray(blockKeys) && blockKeys.length ? blockKeys : suggestBlocks(prospect);
  const blockTuples = keys.map(k => ({ key: k, ...BLOCK_LANG[k] })).filter(b => b.what);
  if (!blockTuples.length) return { ok: false, error: 'no recognized block keys' };

  // Pricing — use first dollar amounts from data.js
  const pricingLines = blockTuples.map(b => {
    const block = BLOCKS.find(x => x.slug.endsWith(`-${b.key}`) || x.slug.includes(b.key));
    const setup = (block?.setupPrice || '').match(/\$(\d+(?:,\d+)?)/)?.[1] || '?';
    const monthly = (block?.monthlyPrice || '').match(/\$(\d+(?:,\d+)?)/)?.[1] || '?';
    return `${b.what}: $${setup} setup + $${monthly}/mo`;
  }).join('\n  ');

  const ownerName = extractFirstName(prospect.notes) || 'there';
  const subject = blockTuples.length === 1
    ? `${capitalize(prospect.business)} + ${blockTuples[0].what}`
    : `${capitalize(prospect.business)} — quick demo (${blockTuples.length} pieces)`;

  const body = `Hi ${ownerName},

I built ${blockTuples.length === 1 ? blockTuples[0].what : `${blockTuples.length} small AI products`} for ${prospect.business}. The point is to ${blockTuples.map(b => b.pain).join(', and ')}.

It's already running with your business name. Live demo${blockTuples.length > 1 ? 's' : ''}:
${blockTuples.map(b => `  https://${b.key}.cafecito-ai.com/${slug}/`).join('\n')}

Pricing if you want to keep using ${blockTuples.length > 1 ? 'them' : 'it'} on real traffic:
  ${pricingLines}
${blockTuples.length >= 2 ? '\n10% off the monthly fees because you\'re running 2+ at once.\n' : ''}
Open to a 15-minute call this week?

—Evan
cafecito-ai.com
`;

  const out = { ts: Date.now(), slug, blocks: keys, subject, body, prospect: { business: prospect.business, vertical: prospect.vertical, url: prospect.url } };

  if (env.INSTANCES) {
    await env.INSTANCES.put(`_pitch_draft/${slug}`, JSON.stringify(out), { expirationTtl: 60 * 60 * 24 * 60 });
  }
  return { ok: true, ...out };
}

function suggestBlocks(prospect) {
  const v = (prospect.vertical || '').toLowerCase();
  if (v.includes('hvac') || v.includes('plumb') || v.includes('electric')) return ['voice', 'recovery'];
  if (v.includes('medspa') || v.includes('dental')) return ['reactivate', 'bilingual'];
  if (v.includes('pool') || v.includes('auto detail') || v.includes('landscap')) return ['estimate', 'form'];
  return ['voice', 'recovery'];
}

function extractFirstName(notes) {
  if (!notes) return null;
  // crude: look for "Owner: Bob Smith" or "[Name] Smith founded" patterns
  const m = notes.match(/(?:owner|founder|principal)[:\s]+([A-Z][a-z]+)/);
  return m ? m[1] : null;
}

function capitalize(s) { return (s || '').replace(/\b\w/g, c => c.toUpperCase()); }
