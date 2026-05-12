// Claude Vision → labor + materials → printable HTML quote.
// Shared by blocks 03 (estimate), 11 (orders).

const CLAUDE_MODEL = 'claude-opus-4-7';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

const SYSTEM_PROMPT = `You estimate labor + materials for service-business jobs based on photo evidence + a short description.
Return ONLY a JSON object. Be conservative on hours, generous on contingency.
Materials should list quantity, unit, unit_cost_usd. Labor in hours with hourly_rate_usd.
The vertical determines reasonable defaults (HVAC: 2-4hr typical; landscaping: 4-8hr; pool: 1-3hr; auto detail: 2-4hr).`;

export async function estimateFromPhoto(env, params) {
  const { vertical, description, imageUrl, imageBase64, mimeType = 'image/jpeg' } = params;
  if (!env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY missing');
  if (!imageUrl && !imageBase64) throw new Error('imageUrl or imageBase64 required');

  const content = [];
  if (imageBase64) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: mimeType, data: imageBase64 },
    });
  } else {
    content.push({
      type: 'image',
      source: { type: 'url', url: imageUrl },
    });
  }
  content.push({
    type: 'text',
    text: `Vertical: ${vertical}\nDescription: ${description || '(none provided)'}\n\nReturn JSON:
{
  "summary": "1-sentence description of the job",
  "labor": [{ "task": "...", "hours": N, "hourly_rate_usd": N }],
  "materials": [{ "item": "...", "quantity": N, "unit": "...", "unit_cost_usd": N }],
  "contingency_pct": 10,
  "notes": "anything the customer should know — access, weather, prerequisites",
  "confidence": "high|medium|low"
}`,
  });

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content }],
    }),
  });

  if (!res.ok) throw new Error(`Vision estimate ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.content?.[0]?.text || '{}';
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));

  // Compute totals server-side so the model can't hallucinate them
  const laborTotal = (parsed.labor || []).reduce((s, l) => s + (l.hours * l.hourly_rate_usd), 0);
  const materialsTotal = (parsed.materials || []).reduce((s, m) => s + (m.quantity * m.unit_cost_usd), 0);
  const subtotal = laborTotal + materialsTotal;
  const contingency = subtotal * ((parsed.contingency_pct || 0) / 100);
  parsed.totals = {
    labor: round2(laborTotal),
    materials: round2(materialsTotal),
    subtotal: round2(subtotal),
    contingency: round2(contingency),
    total: round2(subtotal + contingency),
  };
  return parsed;
}

function round2(n) { return Math.round(n * 100) / 100; }
function usd(n) { return '$' + Number(n).toFixed(2); }

export function renderQuoteHTML(estimate, ctx = {}) {
  const { business = 'Your Business', customerName = '', quoteNumber = '', logo } = ctx;
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Quote ${quoteNumber}</title>
<style>
@page { size: letter; margin: 0.6in; }
body { font: 14px/1.5 system-ui, -apple-system, sans-serif; color: #111; max-width: 7.2in; margin: 0 auto; }
h1 { font: 600 28px/1.2 Georgia, serif; margin: 0 0 4px; }
.meta { color: #666; font-size: 13px; margin: 0 0 24px; }
table { width: 100%; border-collapse: collapse; margin: 0 0 18px; }
th, td { padding: 8px 10px; text-align: left; border-bottom: 1px solid #ddd; font-size: 13px; }
th { background: #f3f3f3; font-weight: 600; }
td.num { text-align: right; font-variant-numeric: tabular-nums; }
.totals { width: 280px; margin-left: auto; }
.totals tr.grand td { border-top: 2px solid #111; border-bottom: 0; font-weight: 700; font-size: 16px; padding-top: 14px; }
.notes { background: #f8f5ee; padding: 14px 16px; border-radius: 4px; font-size: 13px; }
.conf { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; padding: 3px 8px; border-radius: 8px; }
.conf.high { background: #d4ecd5; color: #1f3a2e; }
.conf.medium { background: #f5e8c8; color: #6b4f00; }
.conf.low { background: #f5d4cc; color: #8a2210; }
</style></head>
<body>
${logo ? `<img src="${logo}" alt="${business}" style="height:48px;margin:0 0 16px;">` : ''}
<h1>Estimate · ${business}</h1>
<p class="meta">${quoteNumber ? `Quote #${quoteNumber} · ` : ''}${customerName ? `For ${customerName} · ` : ''}${new Date().toLocaleDateString()}</p>
<p>${estimate.summary || ''} <span class="conf ${estimate.confidence || 'medium'}">${estimate.confidence || 'medium'} confidence</span></p>

<h3>Labor</h3>
<table><thead><tr><th>Task</th><th class="num">Hours</th><th class="num">Rate</th><th class="num">Subtotal</th></tr></thead><tbody>
${(estimate.labor || []).map(l => `<tr><td>${l.task}</td><td class="num">${l.hours}</td><td class="num">${usd(l.hourly_rate_usd)}</td><td class="num">${usd(l.hours * l.hourly_rate_usd)}</td></tr>`).join('')}
</tbody></table>

<h3>Materials</h3>
<table><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Unit</th><th class="num">Unit Cost</th><th class="num">Subtotal</th></tr></thead><tbody>
${(estimate.materials || []).map(m => `<tr><td>${m.item}</td><td class="num">${m.quantity}</td><td>${m.unit}</td><td class="num">${usd(m.unit_cost_usd)}</td><td class="num">${usd(m.quantity * m.unit_cost_usd)}</td></tr>`).join('')}
</tbody></table>

<table class="totals">
  <tr><td>Labor</td><td class="num">${usd(estimate.totals.labor)}</td></tr>
  <tr><td>Materials</td><td class="num">${usd(estimate.totals.materials)}</td></tr>
  <tr><td>Subtotal</td><td class="num">${usd(estimate.totals.subtotal)}</td></tr>
  <tr><td>Contingency (${estimate.contingency_pct || 0}%)</td><td class="num">${usd(estimate.totals.contingency)}</td></tr>
  <tr class="grand"><td>Total estimate</td><td class="num">${usd(estimate.totals.total)}</td></tr>
</table>

${estimate.notes ? `<div class="notes"><strong>Notes:</strong> ${estimate.notes}</div>` : ''}
</body></html>`;
}
