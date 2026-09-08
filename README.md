# Runout — pressing scanner (demo)

Identify the exact pressing of a record from its runout matrix, then draft the
condition note. A single-page web app: no build step, no backend, no server code.

## Run it

Locally, on your own machine:

    cd app && python3 -m http.server 8000

then open http://localhost:8000 — or, from a phone on the same wifi,
http://<your-computer's-LAN-IP>:8000

To install it to a phone home screen you need HTTPS, so publish the `app/`
folder to any static host (GitHub Pages, Cloudflare Pages, Netlify).

## Does it need an API key?

For reading photographs, yes — something has to pay for that. Two ways:

- **A shared endpoint (nobody needs a key).** Deploy `worker.js` once to a
  Cloudflare Worker with your `ANTHROPIC_API_KEY` and an `APP_PASSWORD`, then
  put the worker URL and the code into the app's settings. The key stays
  server-side and never reaches a browser. This is how you hand the app to
  other people.
- **Your own key**, pasted into settings, kept in that browser only.

Everything else needs nothing: searching, every version of an album, the
runouts recorded for each, prices, cover art, and the worked example all come
from the public Discogs API with no token at all.

## A note on the branding

This is styled in Discogs' colours and marked **Concept** in the header,
because it is an internal prototype and not a Discogs product.

## What it does

1. Photograph the sleeve. It reads the artist, title, catalogue number, barcode
   and country of manufacture, then finds the album (a barcode goes straight to
   the pressings that carry it). Typing the album name is still there as a fallback.
2. Filter to a country and format; load the runouts recorded for each version
3. Photograph the runout matrix (torch on, low angle, 2–3 frames)
4. Rank the candidates, with a confidence and the margin over the runner-up
5. If the margin is thin, ask for the single most useful extra photograph
6. Photograph the surface for defect detection and a suggested grade *range*
7. Hand off to the real Discogs listing form with the right release selected

Every scan can be logged right or wrong; the tally and CSV export in Settings
are the Phase 0 measurement.

## What it deliberately does not do

- It never issues a single grade as fact, only a range, and never submits one.
- It never claims to judge surface noise, which is audible, not visible.
- It cannot create the listing — that needs a Discogs login — so it hands off.
