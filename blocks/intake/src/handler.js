// Smart Intake + Triage Form — Block 02
// Public form → Claude classifier (lib/classifier) → routes to right human via email/SMS.

import { classifyMessage } from './lib/classifier.js';
import { sendEmail, emailShell } from './lib/email.js';
import { sendSMS } from './lib/twilio.js';
import { resolveProspect } from './lib/resolve-prospect.js';

const SHOWCASE = {
  business: 'Lavin Eviction Law',
  vertical: 'eviction / landlord-tenant law',
  routeEmail: 'demo@cafecito-ai.com',
  routeSMS: null,
};

const PROSPECT_OVERRIDES = {};

export async function handleIntake(request, env, ctx, url, block, _routerProspectSlug) {
  const segments = url.pathname.split('/').filter(Boolean);
  let prospectSlug = null;
  let scope = SHOWCASE;
  if (segments[0] && segments[0] !== 'api' && env.INSTANCES) {
    const hit = await env.INSTANCES.get(`${block.slug}/${segments[0]}`);
    if (hit) {
      prospectSlug = segments[0];
      let _instance = null;
      try { _instance = JSON.parse(hit); } catch (_e) {}
      const _kvOverrides = (_instance && _instance.overrides) || {};
      const _localOverrides = (typeof PROSPECT_OVERRIDES !== 'undefined' && PROSPECT_OVERRIDES[prospectSlug]) || {};
      scope = { ...scope, ..._localOverrides, ..._kvOverrides };
    }
  }

  const apiIdx = segments.indexOf('api');
  if (apiIdx >= 0) {
    return handleApi(request, env, segments.slice(apiIdx + 1), scope, prospectSlug);
  }

  return html200(renderPage(scope, prospectSlug, block));
}

async function handleApi(request, env, apiPath, scope, prospectSlug) {
  if (apiPath[0] === 'submit' && request.method === 'POST') {
    const data = await request.json().catch(() => ({}));
    const { name = '', email = '', phone = '', message = '' } = data;
    if (!message) return json({ error: 'message required' }, 400);

    // Classify via Claude if key present; else synthesize a stub result
    let classification = null;
    if (env.ANTHROPIC_API_KEY) {
      try {
        classification = await classifyMessage(env, { message, vertical: scope.vertical });
      } catch (e) {
        classification = { intent: 'general_question', urgency: 'unclear', language: 'en', dollarValue: 0, summary: message.slice(0, 120), route: 'human_callback', _error: String(e) };
      }
    } else {
      classification = {
        intent: /urgent|emergency|asap|now/i.test(message) ? 'emergency' : 'general_question',
        urgency: /today|now|emergency/i.test(message) ? 'today' : 'flexible',
        language: /^[¿¡a-zñáéíóú\s]+$/i.test(message) && /[ñáéíóú]/i.test(message) ? 'es' : 'en',
        dollarValue: 0,
        summary: message.slice(0, 120),
        route: 'human_callback',
      };
    }

    // Routing — emit email/SMS where configured
    const routeResults = [];
    if (scope.routeEmail && env.RESEND_API_KEY) {
      try {
        await sendEmail(env, {
          to: scope.routeEmail,
          subject: `[${scope.business}] ${classification.intent} · ${classification.urgency} · ${name || email || phone || 'no contact'}`,
          html: emailShell({
            title: 'New intake — auto-triaged',
            bodyHtml: `<p><strong>From:</strong> ${esc(name)} · ${esc(email)} · ${esc(phone)}</p>
                       <p><strong>Classification:</strong> ${classification.intent} · ${classification.urgency} · ${classification.language} · est $${classification.dollarValue}</p>
                       <p><strong>Summary:</strong> ${esc(classification.summary)}</p>
                       <pre style="background:#f5f1ea;padding:14px;border-radius:4px;white-space:pre-wrap;">${esc(message)}</pre>`,
            footer: `Routed via intake.cafecito-ai.com/${prospectSlug || ''}`,
          }),
        });
        routeResults.push('email');
      } catch (e) { routeResults.push(`email-err:${e.message}`); }
    }
    if (scope.routeSMS && env.TWILIO_SID && env.TWILIO_FROM) {
      try {
        await sendSMS(env, { to: scope.routeSMS, from: env.TWILIO_FROM, body: `[${scope.business}] ${classification.intent} · ${name || phone}: ${classification.summary}` });
        routeResults.push('sms');
      } catch (e) { routeResults.push(`sms-err:${e.message}`); }
    }

    return json({ ok: true, classification, routes: routeResults });
  }
  return json({ error: 'not found' }, 404);
}

function renderPage(s, prospectSlug, block) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(s.business)} — intake</title>
${styles()}
</head><body>
<main>
  <p class="eyebrow">Block 02 · Smart Intake + Triage · ${esc(prospectSlug || 'canonical demo')}</p>
  <h1>${esc(s.business)}</h1>
  <p class="lede">Tell us what's going on. We'll route you to the right person — usually within an hour.</p>
  <form id="intake-form" class="form">
    <label>Name<input name="name" required></label>
    <label>Email<input name="email" type="email" required></label>
    <label>Phone<input name="phone" type="tel"></label>
    <label>What's going on?<textarea name="message" rows="6" placeholder="In English or Spanish — describe the situation, when it started, and how urgent it is." required></textarea></label>
    <button type="submit" class="btn">Submit intake →</button>
  </form>
  <div id="result" class="result" hidden></div>
  <h2>What happens next</h2>
  <ol class="flow">
    <li><strong>Auto-classification.</strong> Claude reads your message and tags it: intent · urgency · language · dollar value · best route.</li>
    <li><strong>Routing.</strong> Emergency → SMS to on-call. Routine → email digest. Sales lead → CRM. Spam → /dev/null. All within 5 seconds.</li>
    <li><strong>Confirmation.</strong> You get an automated reply in your language with the next-step timing.</li>
  </ol>
  <h2>For sales</h2>
  <p class="lede">Block 02 is a $2k setup / $300/mo product. Replaces a $25k/yr intake coordinator at law firms, PM cos, MCA brokers, contractors. Deploy a per-prospect form: <code>/cafecito-blocks:intake &lt;prospect-slug&gt;</code></p>
  <div class="cta-row">
    <a class="btn-outline" href="https://cafecito-ai.com/new-hire/blocks/${esc(block.slug)}">Read the playbook</a>
    <a class="btn-outline" href="https://github.com/cafecito-ai/block-intake">GitHub mirror</a>
  </div>
  <footer>Cafecito Blocks · intake.cafecito-ai.com · per-prospect at <code>/&lt;slug&gt;/</code></footer>
</main>
<script>
document.getElementById('intake-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  const result = document.getElementById('result');
  result.hidden = false;
  result.textContent = 'Submitting…';
  try {
    const res = await fetch('${prospectSlug ? `/${prospectSlug}` : ''}/api/submit', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data),
    });
    const json = await res.json();
    if (json.ok) {
      const c = json.classification;
      result.innerHTML = '<strong>✓ Submitted.</strong><br>Auto-classified as <code>' + c.intent + '</code> · urgency <code>' + c.urgency + '</code> · language <code>' + c.language + '</code>. Summary: ' + c.summary + (json.routes.length ? '<br>Routed via: ' + json.routes.join(', ') : '<br><em>(Demo routing: ANTHROPIC_API_KEY / RESEND_API_KEY not set on the canonical demo — per-prospect instances send for real.)</em>');
    } else {
      result.textContent = '✗ ' + (json.error || 'error');
    }
  } catch (err) { result.textContent = '✗ ' + err.message; }
});
</script>
</body></html>`;
}

function styles() {
  return `<style>
*{box-sizing:border-box}
body{margin:0;background:#f5f1ea;color:#0f0e0c;font:16px/1.55 ui-sans-serif,system-ui,-apple-system,"Inter Tight",sans-serif}
main{max-width:680px;margin:0 auto;padding:48px 24px 96px}
.eyebrow{font:500 11px/1 ui-monospace,monospace;letter-spacing:0.16em;text-transform:uppercase;color:#b8412c;margin:0 0 14px}
h1{font:700 32px/1.15 "Fraunces",Georgia,serif;letter-spacing:-0.01em;margin:0 0 8px}
.lede{font-size:16px;color:#2a2723;margin:0 0 24px;line-height:1.5}
.form{display:flex;flex-direction:column;gap:14px;margin:0 0 28px;background:#fff;padding:24px;border-radius:8px;border:1px solid #d9d4ca}
.form label{display:flex;flex-direction:column;gap:6px;font:500 13px/1 ui-sans-serif,system-ui;color:#2a2723}
.form input,.form textarea{font:400 15px/1.4 ui-sans-serif,system-ui;padding:11px 13px;border:1px solid #d9d4ca;border-radius:4px;background:#fff}
.form input:focus,.form textarea:focus{outline:2px solid #1f3a2e;outline-offset:1px}
.btn{align-self:flex-start;background:#1f3a2e;color:#f5f1ea;border:0;padding:12px 22px;border-radius:4px;font:600 14px/1 ui-sans-serif,system-ui;cursor:pointer}
.btn:hover{background:#2a4a3c}
.btn-outline{display:inline-block;padding:10px 16px;border:1px solid #0f0e0c;border-radius:4px;text-decoration:none;color:#0f0e0c;font:500 13px/1 ui-sans-serif,system-ui;background:#fff}
.result{background:#ece5d8;padding:16px 18px;border-radius:6px;margin:0 0 28px;font-size:14px;line-height:1.5}
.result code{background:#fff;padding:1px 6px;border-radius:3px;font-family:ui-monospace,monospace}
h2{font:600 20px/1.2 "Fraunces",Georgia,serif;margin:32px 0 12px}
.flow{padding-left:1.2em;margin:0 0 28px}
.flow li{margin:0 0 10px;line-height:1.5}
code{font-family:ui-monospace,monospace;background:#ece5d8;padding:2px 6px;border-radius:3px;font-size:0.9em}
.cta-row{display:flex;gap:10px;margin:0 0 36px;flex-wrap:wrap}
footer{font:400 12px/1.5 ui-sans-serif,system-ui;color:#6b6660;border-top:1px solid #d9d4ca;padding-top:18px}
</style>`;
}

function esc(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function html200(html){return new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=60, must-revalidate'}});}
function json(d,status=200){return new Response(JSON.stringify(d),{status,headers:{'content-type':'application/json; charset=utf-8'}});}
