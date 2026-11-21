// AM Oferty — praca offline i powiadomienia.
const WERSJA = 'amoferty-1.16.0';
// edytor rzutów (rzut/) ma osobną pamięć: pliki z hashem w nazwie, raz pobrane działają też bez internetu
const RZUT = 'amoferty-rzut';
const PLIKI = ['./', 'index.html', 'manifest.webmanifest', 'css/app.css', 'js/app.js', 'js/dane.js', 'js/sejf.js', 'js/model.js', 'js/zip.js', 'js/kopia.js', 'js/rzut.js', 'js/korekta.js', 'js/hybryda.js', 'js/hybrydaWorker.js', 'js/obrobkaAM.js', 'js/obrobkaSiec.js', 'modele/am1.json', 'modele/am1.bin', 'js/edytorZdjec.js', 'js/urzadzenia.js', 'plan.html', 'css/plan.css', 'js/plan/edytor.js', 'js/plan/rysuj.js', 'js/plan/rysuj3d.js', 'js/plan/dopasuj.js', 'js/plan/biblioteka.js', 'js/plan/geom.js',
  'fonts/archivo.woff2', ...['latin', 'latin-ext'].flatMap((z) => [500, 600].map((g) => `fonts/cormorant-${z}-${g}.woff2`)), 'ikony/icon-192.png', 'ikony/icon-512.png', 'ikony/apple-touch-icon.png',
  'img/tlo.jpg', 'img/monogram.png', ...['podstawy', 'lokalizacja', 'lokal', 'pom', 'koszty', 'atuty', 'minusy', 'okolica', 'weryfikacja', 'energia', 'tekst', 'wlasciciel', 'wyp', 'klienci', 'wizyty', 'dokumenty', 'zdjecia', 'ogloszenie', 'kontrola'].map((n) => `img/ikony/${n}.png`)];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(WERSJA).then((c) => c.addAll(PLIKI.map((p) => new Request(p, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== WERSJA && x !== RZUT).map((x) => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return; // serwer API idzie zawsze do sieci
  if (new URL(r.url).pathname.includes('/rzut/')) { e.respondWith(rzut(r)); return; }
  e.respondWith((async () => {
    const c = await caches.open(WERSJA);
    const sciezka = new URL(r.url).pathname;
    if (r.mode === 'navigate') {
      const klucz = sciezka.endsWith('/plan.html') ? 'plan.html' : 'index.html'; // edytor rzutu ma własną stronę
      try { const n = await fetch(r); if (n.ok) c.put(klucz, n.clone()); return n; } catch { return (await c.match(klucz)) || Response.error(); }
    }
    if (sciezka.endsWith('/img/plan/biblioteka.json')) { // spis grafik biblioteki: zawsze świeży, gdy jest sieć
      try { const n = await fetch(r, { cache: 'no-cache' }); if (n.ok) c.put(r, n.clone()); return n; } catch { return (await c.match(r)) || Response.error(); }
    }
    const z = await c.match(r, { ignoreSearch: !sciezka.includes('/img/plan/') });
    if (z) return z;
    try { const n = await fetch(r); if (n.ok) c.put(r, n.clone()); return n; } catch { return Response.error(); }
  })());
});
async function rzut(r) {
  const c = await caches.open(RZUT);
  if (r.mode === 'navigate') {
    // strona edytora: najpierw sieć (GitHub Pages odda ją jako 404.html z kodem 404 — to normalne dla aplikacji jednostronicowej)
    try { const n = await fetch(r); const kopia = new Response(await n.clone().blob(), { status: 200, headers: n.headers }); c.put('rzut-strona', kopia); return new Response(await n.blob(), { status: 200, headers: n.headers }); }
    catch { return (await c.match('rzut-strona')) || Response.error(); }
  }
  const z = await c.match(r, { ignoreSearch: true });
  if (z) return z;
  try { const n = await fetch(r); if (n.ok) c.put(r, n.clone()); return n; } catch { return Response.error(); }
}
self.addEventListener('push', (e) => {
  let d = {}; try { d = e.data.json(); } catch { d = { tytul: 'AM Oferty', tresc: e.data?.text() || '' }; }
  e.waitUntil(self.registration.showNotification(d.tytul || 'AM Oferty', { body: d.tresc || '', icon: 'ikony/icon-192.png', badge: 'ikony/icon-192.png', data: { oid: d.oid, ekran: d.ekran }, tag: `${d.oid || 'am'}${d.ekran ? `-${d.ekran}` : ''}` }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const oid = e.notification.data?.oid, ekran = e.notification.data?.ekran;
  e.waitUntil((async () => {
    const okna = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of okna) { await w.focus(); if (oid) w.postMessage({ oid, ekran }); return; }
    await self.clients.openWindow(oid ? `./#/o/${oid}/${ekran || 'karta'}` : './');
  })());
});
