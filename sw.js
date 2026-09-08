// Offline shell for Runout.
//
// HTML is fetched network-first so a new build is picked up on the next visit —
// a cache-first document would pin whoever already opened the link to an old
// version forever. Everything else is cache-first for speed. API traffic is
// never touched.
const SHELL = 'runout-shell-v4';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(k => Promise.all(k.filter(n => n !== SHELL).map(n => caches.delete(n))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;                  // Discogs / Anthropic: always live

  const isDoc = req.mode === 'navigate' || req.destination === 'document' ||
                url.pathname.endsWith('/') || url.pathname.endsWith('index.html');

  if (isDoc) {                                                 // network first, cache as a fallback
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(SHELL).then(c => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  e.respondWith(                                               // assets: cache first
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(SHELL).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }))
  );
});
