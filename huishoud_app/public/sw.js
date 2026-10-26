// Service worker voor offline gebruik. Cachet alleen de app zelf (HTML, JS, CSS); de data in /api/ nooit:
// die wordt lokaal bewaard door de app en later gesynchroniseerd.
const CACHE = 'huishoud-shell-v1';

self.addEventListener('install', (event) => {
  // Bestanden van de pagina die dit script registreerde, worden pas na de eerste keer via de service worker
  // opgehaald; daarom nu alvast de pagina en haar scripts/stijlen bewaren.
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE);
        const scope = self.registration.scope;
        const res = await fetch(scope, { cache: 'reload' });
        if (!res.ok) return;
        const html = await res.clone().text();
        await cache.put(new URL(scope).pathname, res);
        const urls = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
          .map((m) => new URL(m[1], scope))
          .filter((u) => u.origin === self.location.origin && u.pathname.includes('/assets/'));
        await Promise.all(urls.map((u) => cache.add(u.href).catch(() => {})));
      } catch {
        /* offline tijdens installatie: later opnieuw */
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Achter Home Assistant Ingress staat de app onder een voorvoegsel; bepaal het pad relatief aan de scope.
  const scopePath = new URL(self.registration.scope).pathname;
  const rel = url.pathname.startsWith(scopePath) ? url.pathname.slice(scopePath.length) : url.pathname;
  if (rel.startsWith('api/')) return;

  if (req.mode === 'navigate') {
    // Pagina: altijd eerst het netwerk (nieuwe versies direct), offline de laatst bekende
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        try {
          const res = await fetch(req);
          if (res.ok) cache.put(scopePath, res.clone());
          return res;
        } catch {
          return (await cache.match(scopePath)) ?? (await cache.match(req)) ?? Response.error();
        }
      })(),
    );
    return;
  }

  // Bestanden met hash in de naam veranderen nooit: uit de cache, anders ophalen en bewaren
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    })(),
  );
});
