// Optional shared endpoint for Runout.
//
// Deploy this once and testers need no API key of their own: the key lives here,
// server-side, and never reaches the browser. Without it, each person has to
// paste their own key into the app's settings.
//
//   1. cloudflare.com → Workers & Pages → Create Worker → paste this
//   2. Settings → Variables:
//        ANTHROPIC_API_KEY  = sk-ant-…            (encrypted)
//        APP_PASSWORD       = any phrase you like  (encrypted)
//   3. Deploy, copy the worker URL
//   4. In the app: cog → Shared endpoint = that URL, Access code = APP_PASSWORD
//
// The password matters. Without it the URL is an open relay and anyone who
// finds it spends your credit.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type,x-app-password',
  'Access-Control-Allow-Methods': 'POST,OPTIONS'
};
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', ...CORS } });

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (request.method !== 'POST') return json({ error: { message: 'POST only' } }, 405);

    if (env.APP_PASSWORD && request.headers.get('x-app-password') !== env.APP_PASSWORD)
      return json({ error: { message: 'Wrong access code for this endpoint.' } }, 401);

    if (!env.ANTHROPIC_API_KEY)
      return json({ error: { message: 'This endpoint has no ANTHROPIC_API_KEY set.' } }, 500);

    let body;
    try { body = await request.text(); } catch { return json({ error: { message: 'Bad body' } }, 400); }
    if (body.length > 12 * 1024 * 1024)
      return json({ error: { message: 'Request too large.' } }, 413);

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { 'content-type': 'application/json', ...CORS }
    });
  }
};
