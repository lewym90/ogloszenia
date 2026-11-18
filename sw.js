// AM Oferty — praca offline i powiadomienia.
const WERSJA = 'amoferty-1.0.1';
const PLIKI = ['./', 'index.html', 'manifest.webmanifest', 'css/app.css', 'js/app.js', 'js/dane.js', 'js/model.js', 'js/zip.js',
  'fonts/archivo.woff2', 'fonts/marcellus.woff2', 'ikony/icon-192.png', 'ikony/icon-512.png', 'ikony/apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(WERSJA).then((c) => c.addAll(PLIKI.map((p) => new Request(p, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== WERSJA).map((x) => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return; // serwer API idzie zawsze do sieci
  e.respondWith((async () => {
    const c = await caches.open(WERSJA);
    if (r.mode === 'navigate') {
      try { const n = await fetch(r); c.put('index.html', n.clone()); return n; } catch { return (await c.match('index.html')) || Response.error(); }
    }
    const z = await c.match(r, { ignoreSearch: true });
    if (z) return z;
    try { const n = await fetch(r); if (n.ok) c.put(r, n.clone()); return n; } catch { return Response.error(); }
  })());
});
self.addEventListener('push', (e) => {
  let d = {}; try { d = e.data.json(); } catch { d = { tytul: 'AM Oferty', tresc: e.data?.text() || '' }; }
  e.waitUntil(self.registration.showNotification(d.tytul || 'AM Oferty', { body: d.tresc || '', icon: 'ikony/icon-192.png', badge: 'ikony/icon-192.png', data: { oid: d.oid }, tag: d.oid || 'am' }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const oid = e.notification.data?.oid;
  e.waitUntil((async () => {
    const okna = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of okna) { await w.focus(); if (oid) w.postMessage({ oid }); return; }
    await self.clients.openWindow(oid ? `./#/o/${oid}/karta` : './');
  })());
});
