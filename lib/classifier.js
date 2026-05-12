// Claude-powered intent + urgency + language + dollar-value classifier.
// Shared by blocks 02 (intake), 11 (orders), 15 (qa), 16 (form), 12 (recovery).
//
// Input: free-text message + optional vertical hint.
// Output: { intent, urgency, language, dollarValue, summary, route }

const CLAUDE_MODEL = 'claude-opus-4-7';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

const SYSTEM_PROMPT = `You classify inbound messages from prospects/customers for a small business.

Return ONLY a JSON object with these keys:
- intent: one of [quote_request, appointment_booking, complaint, general_question, emergency, sales_pitch, spam]
- urgency: one of [today, this_week, flexible, unclear]
- language: BCP-47 code (en, es, en-es-mixed, …)
- dollarValue: integer USD estimate of this lead's potential value (0 if unclear)
- summary: ≤140 chars, plain prose, no quotes
- route: one of [auto_book, human_callback, human_immediate, ignore]

Output JSON only. No prose before or after.`;

export async function classifyMessage(env, params) {
  const { message, vertical, customRules } = params;
  if (!env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY missing');
  if (!message) throw new Error('message required');

  const userPrompt = [
    vertical ? `Vertical: ${vertical}` : null,
    customRules ? `Custom routing rules:\n${customRules}` : null,
    `Message:\n${message}`,
  ].filter(Boolean).join('\n\n');

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic classifier ${res.status}: ${errText.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = data.content?.[0]?.text || '{}';
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart < 0 || jsonEnd < 0) throw new Error(`Classifier returned non-JSON: ${text.slice(0, 200)}`);
  return JSON.parse(text.slice(jsonStart, jsonEnd + 1));
}

// Convenience: classify + route to one of N handlers based on `route`.
export async function routeMessage(env, params, handlers) {
  const cls = await classifyMessage(env, params);
  const handler = handlers[cls.route] || handlers.default;
  if (!handler) return { classification: cls, handled: false };
  const result = await handler(cls, params);
  return { classification: cls, handled: true, result };
}
