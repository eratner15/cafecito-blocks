// Bilingual Voice Receptionist — Block 01
// Canonical demo wraps Suite Air (existing live HVAC receptionist on +1-954-858-5311).
// Per-prospect instances customize phone number + business name + voice.
// V1 in-browser demo: WebRTC → OpenAI Realtime API with per-prospect system prompt.

import { resolveProspect } from './lib/resolve-prospect.js';

const REALTIME_MODEL = 'gpt-realtime'; // GA model name (replaced gpt-4o-realtime-preview-* beta)
const REALTIME_VOICE = 'shimmer'; // warm female; bilingual capable
const REALTIME_SESSION_URL = 'https://api.openai.com/v1/realtime/client_secrets'; // GA endpoint (Beta /v1/realtime/sessions retired)
const MAX_SESSION_SECONDS = 90;

const SHOWCASE = {
  business: 'Suite Air HVAC',
  phone: '+1-954-858-5311',
  phoneDisplay: '(954) 858-5311',
  hours: 'Mon–Fri 8am–6pm · 24/7 emergency',
  industry: 'HVAC · Miami-Dade',
  vertical: 'HVAC service',
  voiceName: 'Lucia',
  languages: ['English', 'Spanish'],
  services: ['AC repair', 'AC installation', 'mini-split installs', 'maintenance plans', 'commercial HVAC'],
  serviceArea: 'Miami-Dade and Broward counties',
};

const PROSPECT_OVERRIDES = {
  'garrido-hvac': {
    business: 'Garrido HVAC',
    phone: '+1-305-555-0142',
    phoneDisplay: '(305) 555-0142',
    hours: 'Mon–Sat 7am–7pm · 24/7 emergency dispatch',
    industry: 'HVAC · Miami / Hialeah / Kendall',
    vertical: 'HVAC service',
    voiceName: 'Lucia',
    languages: ['English', 'Spanish'],
    services: ['AC repair', 'compressor replacement', 'duct cleaning', 'annual maintenance', 'emergency dispatch'],
    serviceArea: 'Miami, Hialeah, Kendall, Doral',
  },
};

export async function handleVoice(request, env, ctx, url, block, _routerProspectSlug) {
  const segments = url.pathname.split('/').filter(Boolean);
  let prospectSlug = null;
  let scope = { ...SHOWCASE };
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

  // /api/session — mint ephemeral OpenAI Realtime client_secret
  if (segments.includes('api') && segments[segments.length - 1] === 'session' && request.method === 'POST') {
    return mintRealtimeSession(env, scope);
  }

  return html200(renderPage(scope, prospectSlug, block));
}

async function mintRealtimeSession(env, scope) {
  if (!env.OPENAI_API_KEY) {
    return json({ ok: false, error: 'Voice demo requires OPENAI_API_KEY on the cafecito-ai worker.' }, 503);
  }
  const instructions = buildSystemPrompt(scope);
  try {
    const res = await fetch(REALTIME_SESSION_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session: {
          type: 'realtime',
          model: REALTIME_MODEL,
          audio: { output: { voice: REALTIME_VOICE } },
          instructions,
        },
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      return json({ ok: false, error: `OpenAI session ${res.status}: ${t}` }, 500);
    }
    const data = await res.json();
    // GA response shape: { value: "ek_...", expires_at: <epoch> } at top level (Beta nested it under client_secret).
    const clientSecret = data.value || data.client_secret?.value || null;
    const expiresAt = data.expires_at || data.client_secret?.expires_at || null;
    return json({
      ok: true,
      model: REALTIME_MODEL,
      voice: REALTIME_VOICE,
      client_secret: clientSecret,
      expires_at: expiresAt,
      max_session_seconds: MAX_SESSION_SECONDS,
      business: scope.business,
      voiceName: scope.voiceName,
    });
  } catch (e) {
    return json({ ok: false, error: e.message }, 500);
  }
}

function buildSystemPrompt(s) {
  const services = (s.services || []).join(', ');
  const langs = (s.languages || ['English']).join(' and ');
  return `You are ${s.voiceName || 'Lucia'}, the live voice receptionist for ${s.business}, a ${s.vertical} business serving ${s.serviceArea || 'Miami'}. You speak ${langs} fluently — auto-detect the caller's language from their first words and stay in it for the rest of the call. Never ask "do you prefer English or Spanish?" — just match them.

Your job:
1. Pick up within one ring with: "${s.business}, this is ${s.voiceName || 'Lucia'} — how can I help?" (Spanish version: "${s.business}, le habla ${s.voiceName || 'Lucia'} — ¿en qué le puedo ayudar?")
2. Triage in this order: urgency (is anyone in immediate discomfort?) → service type (${services}) → address / ZIP / preferred time.
3. If it's an emergency (someone hot/cold, water leak, no power), say "I'm getting someone out right now" and confirm address + best callback number.
4. For routine work, offer specific time windows: "I can get a tech out tomorrow morning between 8 and 10, or Wednesday afternoon between 2 and 4 — which works?"
5. Confirm with a recap before ending the call: customer name, phone, address, service, appointment window.
6. Keep replies short — 1-2 sentences max. This is a phone call, not an email.

Hours: ${s.hours}.

You are running in a sales demo. Don't mention you're an AI unless asked directly. If asked, say "I'm an AI receptionist for ${s.business} — would you like to hear what booking a real appointment sounds like, or do you have questions about the system?"

After ~75 seconds of conversation, naturally wrap up with: "Anything else I can help with before I let you go?" — keep the demo tight.`;
}

function renderPage(s, prospectSlug, block) {
  const apiPath = prospectSlug ? `/${prospectSlug}/api/session` : `/api/session`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(s.business)} — bilingual voice receptionist · live demo</title>
${styles()}
</head><body>
<main>
  <p class="eyebrow">Block 01 · Bilingual Voice Receptionist · ${esc(prospectSlug || 'canonical demo')}</p>
  <h1>${esc(s.business)}</h1>
  <p class="lede">A bilingual voice receptionist that picks up every call, in Spanish or English, and books the appointment. Talk to ${esc(s.voiceName)} right now in your browser — no phone call needed.</p>

  <section class="voice-cta">
    <div class="vc-header">
      <span class="vc-eyebrow">In-browser demo · OpenAI Realtime</span>
      <span class="vc-sub">Click below, allow your microphone, and have a ${MAX_SESSION_SECONDS}-second conversation with ${esc(s.voiceName)}.</span>
    </div>
    <button type="button" id="talk-btn" class="talk-btn">
      <span class="talk-dot"></span>
      <span class="talk-label">Talk to ${esc(s.voiceName)}</span>
      <span class="talk-sub">${esc(s.business)} · ${esc(s.industry)}</span>
    </button>
    <div id="status-row" class="status-row" hidden>
      <span id="status-icon" class="status-icon"></span>
      <span id="status-label">Connecting…</span>
      <span id="status-timer" class="status-timer"></span>
      <button type="button" id="hangup-btn" class="hangup-btn" hidden>Hang up</button>
    </div>
    <div id="transcript" class="transcript" hidden></div>
    <div id="voice-error" class="voice-error" hidden></div>
    <p class="vc-hint">Or call the real phone line: <a href="tel:${esc(s.phone)}" class="phone-link">${esc(s.phoneDisplay)}</a></p>
  </section>

  <div class="grid">
    <div class="cell"><h3>What ${esc(s.voiceName)} can do</h3><p>Triage in ${esc((s.languages||[]).join(' / '))}. Books to Cal.com mid-conversation. Detects emergencies and escalates. Doesn't need a language menu.</p></div>
    <div class="cell"><h3>What it costs</h3><p><strong>$1,500 setup · $400/mo</strong> + per-minute pass-through at cost-plus 30%. About 1/8 the cost of a part-time bilingual receptionist in Miami.</p></div>
    <div class="cell"><h3>How it ships</h3><p>One day. Provision Twilio number in your area code, customize system prompt, wire Cal.com, deploy worker. Sales gets the demo URL same morning.</p></div>
  </div>

  <h2>What a real call sounds like</h2>
  <ol class="flow">
    <li><strong>Ring.</strong> ${esc(s.business)} answers within 1 ring: "${esc(s.business)}, ¿cómo le puedo ayudar?" (or English if you start in English).</li>
    <li><strong>Triage.</strong> Three questions, in order: urgency · service type · ZIP/address. Silent on language switches — if you start in Spanish she stays in Spanish.</li>
    <li><strong>Book.</strong> Function call to Cal.com mid-conversation. The booking lands while you're on the line. SMS confirmation 30 seconds later.</li>
    <li><strong>Escalate.</strong> Emergency words ("leak / broken / lawsuit") trigger an immediate transfer with a 1-sentence summary handoff.</li>
  </ol>

  <h2>Deploy for your business</h2>
  <p class="lede">Sales hands prospects this URL: <code>https://voice.cafecito-ai.com/&lt;your-slug&gt;/</code>. A working receptionist with YOUR business name, YOUR hours, YOUR services. Ships in one day.</p>
  <div class="cta-row">
    <a class="btn primary" href="https://cafecito-ai.com/new-hire/blocks/${esc(block.slug)}">Read the playbook</a>
    <a class="btn" href="https://github.com/cafecito-ai/block-voice">GitHub mirror</a>
    <a class="btn" href="https://cafecito-ai.com/suite-air/">See the Suite Air build</a>
  </div>
  <footer>Cafecito Blocks · voice.cafecito-ai.com · per-prospect instances at <code>/&lt;prospect-slug&gt;/</code></footer>
</main>
<script>
${clientScript(apiPath)}
</script>
</body></html>`;
}

function clientScript(apiPath) {
  return `
const $ = (id) => document.getElementById(id);
const talkBtn = $('talk-btn'), statusRow = $('status-row'), statusLabel = $('status-label'), statusIcon = $('status-icon');
const statusTimer = $('status-timer'), hangupBtn = $('hangup-btn'), transcript = $('transcript'), errBox = $('voice-error');
let pc = null, micStream = null, audioEl = null, dc = null, timerHandle = null, hardStop = null, startedAt = 0, maxSeconds = 90;

talkBtn.onclick = () => startCall();
hangupBtn.onclick = () => endCall('Ended by user.');

async function startCall() {
  if (pc) return;
  setStatus('connecting', 'Connecting to ${apiPath}…');
  talkBtn.disabled = true; talkBtn.classList.add('connecting');
  errBox.hidden = true;
  transcript.hidden = false; transcript.innerHTML = '';
  try {
    // 1. Mint ephemeral session token from our worker
    const sessRes = await fetch('${apiPath}', { method: 'POST' });
    const sess = await sessRes.json();
    if (!sess.ok) throw new Error(sess.error || 'Failed to mint session');
    maxSeconds = sess.max_session_seconds || 90;
    setStatus('connecting', 'Requesting microphone…');

    // 2. getUserMedia
    micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 48000 } });

    // 3. WebRTC peer connection
    pc = new RTCPeerConnection();
    audioEl = document.createElement('audio'); audioEl.autoplay = true; document.body.appendChild(audioEl);
    pc.ontrack = (e) => { audioEl.srcObject = e.streams[0]; };
    micStream.getTracks().forEach((t) => pc.addTrack(t, micStream));
    dc = pc.createDataChannel('oai-events');
    dc.onmessage = (e) => handleEvent(JSON.parse(e.data));

    // 4. Create offer + POST to OpenAI Realtime
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    setStatus('connecting', 'Handshaking with OpenAI…');
    const sdpRes = await fetch('https://api.openai.com/v1/realtime?model=' + encodeURIComponent(sess.model), {
      method: 'POST',
      body: offer.sdp,
      headers: { Authorization: 'Bearer ' + sess.client_secret, 'Content-Type': 'application/sdp' },
    });
    if (!sdpRes.ok) throw new Error('OpenAI SDP exchange failed (' + sdpRes.status + ')');
    const answerSdp = await sdpRes.text();
    await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

    startedAt = Date.now();
    setStatus('live', sess.voiceName + ' is on the line. Speak naturally.');
    talkBtn.classList.remove('connecting'); talkBtn.classList.add('live');
    talkBtn.querySelector('.talk-label').textContent = sess.voiceName + ' is listening…';
    hangupBtn.hidden = false;
    tickTimer();
    timerHandle = setInterval(tickTimer, 250);
    hardStop = setTimeout(() => endCall('Demo limit reached (' + maxSeconds + 's).'), maxSeconds * 1000);
  } catch (e) {
    console.error(e);
    showError(e.message);
    teardown();
  }
}

function tickTimer() {
  const elapsed = Math.floor((Date.now() - startedAt) / 1000);
  const remaining = Math.max(0, maxSeconds - elapsed);
  statusTimer.textContent = remaining + 's left';
  if (remaining <= 10) statusTimer.classList.add('warn');
}

function handleEvent(ev) {
  // Realtime API event stream — show transcripts in the panel
  if (ev.type === 'conversation.item.input_audio_transcription.completed' && ev.transcript) {
    appendTranscript('You', ev.transcript);
  } else if (ev.type === 'response.audio_transcript.done' && ev.transcript) {
    appendTranscript('Lucia', ev.transcript);
  } else if (ev.type === 'error') {
    showError(ev.error?.message || 'Realtime error');
  }
}

function appendTranscript(who, text) {
  const row = document.createElement('div');
  row.className = 't-row t-' + (who === 'You' ? 'user' : 'agent');
  row.innerHTML = '<span class="t-who">' + who + '</span><span class="t-text"></span>';
  row.querySelector('.t-text').textContent = text;
  transcript.appendChild(row);
  transcript.scrollTop = transcript.scrollHeight;
}

function endCall(reason) {
  setStatus('done', reason || 'Call ended.');
  teardown();
}

function teardown() {
  if (timerHandle) clearInterval(timerHandle);
  if (hardStop) clearTimeout(hardStop);
  if (dc) try { dc.close(); } catch (_e) {}
  if (pc) try { pc.close(); } catch (_e) {}
  if (micStream) micStream.getTracks().forEach((t) => t.stop());
  if (audioEl) try { audioEl.remove(); } catch (_e) {}
  pc = null; dc = null; micStream = null; audioEl = null;
  talkBtn.disabled = false; talkBtn.classList.remove('connecting', 'live');
  talkBtn.querySelector('.talk-label').textContent = 'Talk again';
  hangupBtn.hidden = true;
  statusTimer.classList.remove('warn');
}

function setStatus(kind, label) {
  statusRow.hidden = false;
  statusLabel.textContent = label;
  statusIcon.className = 'status-icon ' + kind;
}

function showError(msg) {
  errBox.textContent = msg;
  errBox.hidden = false;
}
`;
}

function styles() {
  return `<style>
*{box-sizing:border-box}
body{margin:0;background:#f5f1ea;color:#0f0e0c;font:16px/1.55 ui-sans-serif,system-ui,-apple-system,"Inter Tight",sans-serif}
main{max-width:780px;margin:0 auto;padding:56px 24px 96px}
.eyebrow{font:500 11px/1 ui-monospace,monospace;letter-spacing:0.16em;text-transform:uppercase;color:#b8412c;margin:0 0 14px}
h1{font:700 40px/1.1 "Fraunces",Georgia,serif;letter-spacing:-0.015em;margin:0 0 14px}
.lede{font-size:18px;color:#2a2723;margin:0 0 28px;line-height:1.5}
.lede strong{color:#0f0e0c}

.voice-cta{background:#fff;border:1px solid #d9d4ca;border-radius:8px;padding:24px;margin:0 0 36px}
.vc-header{margin:0 0 16px}
.vc-eyebrow{display:block;font:500 11px/1 ui-monospace,monospace;letter-spacing:0.14em;text-transform:uppercase;color:#b8412c;margin:0 0 4px}
.vc-sub{display:block;font:400 14px/1.4 ui-sans-serif,system-ui;color:#6b6660}
.talk-btn{display:flex;flex-direction:column;align-items:flex-start;gap:4px;width:100%;padding:24px 28px;background:#1f3a2e;color:#f5f1ea;border:0;border-radius:8px;cursor:pointer;text-align:left;position:relative;transition:filter 0.15s}
.talk-btn:hover{filter:brightness(1.1)}
.talk-btn:disabled{cursor:not-allowed;opacity:0.85}
.talk-btn.connecting{background:#1a3a6b}
.talk-btn.live{background:#b8412c}
.talk-dot{position:absolute;top:18px;right:24px;width:10px;height:10px;border-radius:99px;background:#b8d4c8}
.talk-btn.connecting .talk-dot{background:#f5e8c8;animation:pulse 0.9s ease-in-out infinite}
.talk-btn.live .talk-dot{background:#fff;animation:pulse 0.9s ease-in-out infinite}
@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.85)} }
.talk-label{font:600 22px/1.2 "Fraunces",Georgia,serif}
.talk-sub{font:400 12px/1.3 ui-monospace,monospace;color:#b8d4c8;letter-spacing:0.04em}
.talk-btn.connecting .talk-sub,.talk-btn.live .talk-sub{color:rgba(245,241,234,0.7)}

.status-row{display:flex;align-items:center;gap:10px;margin:12px 0 0;font:500 13px/1 ui-monospace,monospace;color:#2a2723;flex-wrap:wrap}
.status-icon{width:8px;height:8px;border-radius:99px;background:#c8c2b6;display:inline-block}
.status-icon.connecting{background:#f5c558;animation:pulse 0.9s ease-in-out infinite}
.status-icon.live{background:#1f3a2e;animation:pulse 0.9s ease-in-out infinite}
.status-icon.done{background:#6b6660}
.status-timer{margin-left:auto;color:#6b6660}
.status-timer.warn{color:#b8412c;font-weight:700}
.hangup-btn{padding:6px 14px;background:#fff;border:1px solid #c8c2b6;border-radius:99px;color:#8a2210;font:500 12px/1 ui-sans-serif,system-ui;cursor:pointer}
.hangup-btn:hover{background:#fdf2ee;border-color:#e8b8a8}

.transcript{margin:14px 0 0;background:#f5f1ea;border-radius:6px;padding:12px;max-height:260px;overflow-y:auto;font-size:13px}
.t-row{display:flex;gap:10px;padding:6px 0;border-bottom:1px solid #ece5d8}
.t-row:last-child{border-bottom:0}
.t-who{flex:0 0 56px;font:500 11px/1.4 ui-monospace,monospace;color:#6b6660;text-transform:uppercase}
.t-user .t-who{color:#1a3a6b}
.t-agent .t-who{color:#1f3a2e}
.t-text{flex:1;line-height:1.5;color:#2a2723}

.voice-error{margin-top:12px;font:400 13px/1.4 ui-sans-serif,system-ui;color:#8a2210;background:#fdf2ee;border:1px solid #e8b8a8;padding:8px 12px;border-radius:4px}
.vc-hint{font:400 13px/1.4 ui-sans-serif,system-ui;color:#6b6660;margin:14px 0 0;text-align:center}
.phone-link{color:#1f3a2e;font-weight:600;text-decoration:none;border-bottom:1px solid currentColor}

.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin:0 0 36px}
.cell{background:#fff;border:1px solid #d9d4ca;border-radius:6px;padding:18px 20px}
.cell h3{font:600 14px/1.2 "Fraunces",Georgia,serif;margin:0 0 8px;letter-spacing:-0.005em}
.cell p{font-size:13px;line-height:1.5;color:#2a2723;margin:0}
.cell strong{color:#0f0e0c}
h2{font:600 22px/1.2 "Fraunces",Georgia,serif;margin:36px 0 14px;letter-spacing:-0.005em}
.flow{padding-left:1.2em;margin:0 0 36px}
.flow li{margin:0 0 10px;line-height:1.55;font-size:15px}
code{font-family:ui-monospace,"JetBrains Mono",monospace;background:#ece5d8;padding:2px 6px;border-radius:3px;font-size:0.9em}
.cta-row{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 48px}
.btn{display:inline-block;padding:11px 18px;border-radius:4px;text-decoration:none;font:500 14px/1 ui-sans-serif,system-ui;border:1px solid #0f0e0c;color:#0f0e0c;background:#fff}
.btn.primary{background:#0f0e0c;color:#f5f1ea}
.btn:hover{opacity:0.85}
footer{font:400 12px/1.5 ui-sans-serif,system-ui;color:#6b6660;border-top:1px solid #d9d4ca;padding-top:18px}
</style>`;
}

function esc(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function html200(html){return new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=60, must-revalidate'}});}
function json(d,status=200){return new Response(JSON.stringify(d),{status,headers:{'content-type':'application/json; charset=utf-8'}});}
