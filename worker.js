// Shared endpoint for Runout.
//
// Deploy this once and your testers need no API key of their own: your key
// lives here, server-side, and never reaches anybody's browser.
//
//   1. cloudflare.com -> Workers & Pages -> Create Worker -> paste this in
//   2. Settings -> Variables and Secrets, add both as SECRET (encrypted):
//        ANTHROPIC_API_KEY  = sk-ant-...
//        APP_PASSWORD       = any phrase you like
//      and optionally, as a plain variable:
//        ALLOWED_ORIGIN     = https://mrrussryan.github.io
//   3. Deploy, copy the worker URL
//   4. In the app: cog -> Shared endpoint = that URL, Access code = APP_PASSWORD,
//      then "Copy an invite link" and send that to your testers.
//
// Guard rails, because the app itself is on a public link:
//   - APP_PASSWORD is required. Without it the URL is an open relay.
//   - ALLOWED_ORIGIN means the endpoint only answers the app, so somebody who
//     finds the URL cannot point their own code at it.
//   - The model and token ceiling are pinned here, so it cannot be borrowed as
//     a general-purpose Claude proxy even by someone holding the password.
//   - Set a spend cap at platform.claude.com/settings/limits as the hard floor
//     under all of the above.

const MODEL = 'claude-opus-5';
const MAX_TOKENS = 16000;
const MAX_BODY = 12 * 1024 * 1024;

const cors = origin => ({
  'Access-Control-Allow-Origin': origin || '*',
  'Access-Control-Allow-Headers': 'content-type,x-app-password',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Vary': 'Origin'
});
const json = (obj, status, origin) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json', ...cors(origin) }
  });
const nope = (msg, status, origin) => json({ error: { message: msg } }, status, origin);

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGIN || '').trim();
    const ok = !allowed || origin === allowed;

    if (request.method === 'OPTIONS')
      return new Response(null, { status: 204, headers: cors(ok ? origin : allowed) });
    if (!ok) return nope('This endpoint only answers the Runout app.', 403, allowed);
    if (request.method !== 'POST') return nope('POST only.', 405, origin);

    if (!env.APP_PASSWORD)
      return nope('This endpoint has no APP_PASSWORD set, so it is refusing to run.', 500, origin);
    if (request.headers.get('x-app-password') !== env.APP_PASSWORD)
      return nope('Wrong access code for this endpoint.', 401, origin);
    if (!env.ANTHROPIC_API_KEY)
      return nope('This endpoint has no ANTHROPIC_API_KEY set.', 500, origin);

    const raw = await request.text().catch(() => null);
    if (raw === null) return nope('Unreadable body.', 400, origin);
    if (raw.length > MAX_BODY) return nope('Request too large.', 413, origin);

    let body;
    try { body = JSON.parse(raw); } catch { return nope('Body is not JSON.', 400, origin); }
    if (!Array.isArray(body.messages) || !body.messages.length)
      return nope('No messages in the request.', 400, origin);

    // Pin the expensive knobs so this cannot become a general-purpose proxy.
    const safe = {
      model: MODEL,
      max_tokens: Math.min(Number(body.max_tokens) || MAX_TOKENS, MAX_TOKENS),
      thinking: body.thinking && body.thinking.type === 'adaptive' ? body.thinking : undefined,
      messages: body.messages
    };

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(safe)
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { 'content-type': 'application/json', ...cors(origin) }
    });
  }
};
