// Vertical-specific copy generator. Shared by blocks 10 (brand), 13 (bilingual).
//
// Produces website copy (headline, subhead, services list, CTA, about) in the
// requested language(s), tuned to a vertical + a specific business.

const CLAUDE_MODEL = 'claude-opus-4-7';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

const SYSTEM_PROMPT = `You write conversion-focused website copy for small service businesses.
You write copy a 7th grader can read in 4 seconds.
You never use buzzwords (synergy, leverage, holistic, world-class) or AI tells (delve, in conclusion, navigate).
You write specific, not generic — name the service, the neighborhood, the typical customer.
You output ONLY the JSON requested, no prose before or after.`;

export async function generateBrandCopy(env, params) {
  const { business, vertical, neighborhood, services, languages = ['en'], tone = 'warm' } = params;
  if (!env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY missing');

  const userPrompt = `Write website copy for this business:

Business: ${business}
Vertical: ${vertical}
Neighborhood: ${neighborhood || 'Miami'}
Services: ${(services || []).join(', ')}
Languages: ${languages.join(', ')}
Tone: ${tone}

Return JSON:
{
  "headline": "≤8 words, names the service + the outcome",
  "subhead": "1 sentence, names the neighborhood or specificity",
  "services": ["service-1 short", "service-2 short", "service-3 short"],
  "cta_primary": "Book button label — 2-3 words",
  "cta_secondary": "Call/text button label — 2-3 words",
  "about": "2-3 sentence about section, ≤80 words, names the owner if known",
  "translations": ${languages.length > 1 ? `{ "es": { headline, subhead, services, cta_primary, cta_secondary, about } }` : 'null'}
}`;

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic copy-gen ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.content?.[0]?.text || '{}';
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  return JSON.parse(text.slice(jsonStart, jsonEnd + 1));
}
