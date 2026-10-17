/* PWA exclusivo da Revisão APPCC. Não compartilha escopo/cache com outros guias. */
const CACHE_ID = 'revisao-appcc-configuracao-v1-20261017';
const PREFIX = 'revisao-appcc-configuracao-v';
const SHELL = ['./index.html', './referencias.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_ID);
    await cache.addAll(SHELL);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(PREFIX) && name !== CACHE_ID).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith('/revisao-appcc-configuracao/')) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_ID);
    try {
      const res = await fetch(req);
      if (res.ok && res.type === 'basic') await cache.put(req, res.clone());
      return res;
    } catch (_) {
      const local = await cache.match(req, {ignoreSearch:true});
      if (local) return local;
      if (req.mode === 'navigate') return (await cache.match('./index.html')) || Response.error();
      return Response.error();
    }
  })());
});
