// AM Oferty — dane: kopia na urządzeniu (IndexedDB), kolejka zmian offline, synchronizacja na żywo, zdjęcia.
import { noweId } from './model.js';

const DOMYSLNY_API = 'https://188-68-247-201.sslip.io/am-api';
export const API = (() => {
  const q = new URLSearchParams(location.search).get('api');
  if (q) localStorage.setItem('am_api', q);
  return (localStorage.getItem('am_api') || DOMYSLNY_API).replace(/\/+$/, '');
})();

// ---------- IndexedDB ----------
let _db;
function bazaDanych() {
  if (_db) return _db;
  _db = new Promise((ok, zle) => {
    const r = indexedDB.open('amoferty', 1);
    r.onupgradeneeded = () => {
      const d = r.result;
      d.createObjectStore('baza', { keyPath: 'id' });
      d.createObjectStore('kolejka', { keyPath: 'cid' });
      d.createObjectStore('pliki');
      d.createObjectStore('wysylka', { keyPath: 'klucz' });
      d.createObjectStore('meta');
    };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => zle(r.error);
  });
  return _db;
}
async function tx(store, tryb, f) {
  const d = await bazaDanych();
  return new Promise((ok, zle) => {
    const t = d.transaction(store, tryb);
    const s = t.objectStore(store);
    let wynik;
    Promise.resolve(f(s)).then((w) => { wynik = w; });
    t.oncomplete = () => ok(wynik);
    t.onerror = () => zle(t.error);
    t.onabort = () => zle(t.error);
  });
}
const req = (r) => new Promise((ok, zle) => { r.onsuccess = () => ok(r.result); r.onerror = () => zle(r.error); });
const idbGet = (st, k) => tx(st, 'readonly', (s) => req(s.get(k)));
const idbAll = (st) => tx(st, 'readonly', (s) => req(s.getAll()));
const idbPut = (st, v, k) => tx(st, 'readwrite', (s) => { k === undefined ? s.put(v) : s.put(v, k); });
const idbDel = (st, k) => tx(st, 'readwrite', (s) => { s.delete(k); });

// ---------- stan ----------
const bazy = new Map();      // id -> {id, dane, seq, zmieniona, kto, usunieta}
let kolejka = [];            // [{cid, oid, pola?, usun?, t}]
let wysylki = [];            // [{klucz, id, oid, rodzaj}]
export const stan = { token: null, konto: null, konta: [], seq: 0, online: navigator.onLine, polaczony: false, blad: '', agent: {} };
const sluchacze = new Set();
export const naZmiane = (f) => { sluchacze.add(f); return () => sluchacze.delete(f); };
let zaplanowane = false;
function powiadom() {
  if (zaplanowane) return; zaplanowane = true;
  queueMicrotask(() => { zaplanowane = false; for (const f of sluchacze) { try { f(); } catch (e) { console.error(e); } } });
}

export async function start() {
  stan.token = await idbGet('meta', 'token') || null;
  stan.konto = await idbGet('meta', 'konto') || null;
  stan.konta = await idbGet('meta', 'konta') || [];
  stan.seq = await idbGet('meta', 'seq') || 0;
  stan.agent = await idbGet('meta', 'agent') || {};
  for (const b of await idbAll('baza')) bazy.set(b.id, b);
  kolejka = (await idbAll('kolejka')).sort((a, b) => a.t - b.t);
  wysylki = await idbAll('wysylka');
  addEventListener('online', () => { stan.online = true; powiadom(); synchronizuj(); });
  addEventListener('offline', () => { stan.online = false; powiadom(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { synchronizuj(); polaczNaZywo(); } });
  setInterval(() => synchronizuj(), 60e3);
  if (stan.token) { polaczNaZywo(); synchronizuj(); odswiezJa(); }
  powiadom();
}

// ---------- widok ofert (baza z serwera + nie wysłane zmiany) ----------
function zastosuj(dane, z) {
  if (z.usun) return null;
  const d = dane ? { ...dane } : {};
  for (const [k, v] of Object.entries(z.pola || {})) { if (v === null || v === undefined) delete d[k]; else d[k] = v; }
  return d;
}
export function oferta(id) {
  const b = bazy.get(id);
  let d = b && !b.usunieta ? b.dane : null;
  let lok = false;
  for (const z of kolejka) if (z.oid === id) { d = zastosuj(d, z); lok = true; if (d === null) return null; }
  if (!d) return null;
  return { ...d, id, _seq: b?.seq || 0, _zmieniona: b?.zmieniona || 0, _kto: b?.kto, _lokalne: lok };
}
export function oferty() {
  const ids = new Set([...bazy.keys(), ...kolejka.map((z) => z.oid)]);
  return [...ids].map(oferta).filter(Boolean);
}
export const ileWKolejce = () => kolejka.length + wysylki.length;

// ---------- zmiany ----------
let wysylane = new Set();
let timerZmian = null;
export async function zmien(oid, pola) {
  const ost = kolejka.length ? kolejka[kolejka.length - 1] : null;
  if (ost && ost.oid === oid && !ost.usun && !wysylane.has(ost.cid) && Date.now() - ost.t < 30e3) {
    ost.pola = { ...ost.pola, ...pola };
    await idbPut('kolejka', ost);
  } else {
    const z = { cid: `${Date.now().toString(36)}-${noweId(8)}`, oid, pola, t: Date.now() };
    kolejka.push(z);
    await idbPut('kolejka', z);
  }
  powiadom();
  clearTimeout(timerZmian);
  timerZmian = setTimeout(() => wyslijZmiany(), 700);
}
export async function usunOferte(oid) {
  const z = { cid: `${Date.now().toString(36)}-${noweId(8)}`, oid, usun: true, t: Date.now() };
  kolejka.push(z); await idbPut('kolejka', z); powiadom();
  // zdjęcia oferty kasujemy z serwera i z urządzenia
  const o = bazy.get(oid)?.dane;
  for (const zd of o?.zdj || []) usunZdjeciePlik(zd.id);
  wyslijZmiany();
}

// ---------- API ----------
async function api(sciezka, opcje = {}) {
  const r = await fetch(API + sciezka, {
    ...opcje,
    headers: { ...(opcje.body && !(opcje.body instanceof Blob) ? { 'Content-Type': 'application/json' } : {}), ...(stan.token ? { Authorization: `Bearer ${stan.token}` } : {}), ...(opcje.headers || {}) },
  });
  if (r.status === 401 && stan.token) { await wylogujLokalnie('Urządzenie zostało wylogowane. Zaloguj się ponownie.'); throw new Error('wylogowano'); }
  const j = r.headers.get('content-type')?.includes('json') ? await r.json() : null;
  if (!r.ok) throw Object.assign(new Error(j?.blad || `Błąd ${r.status}`), { kod: r.status });
  return j;
}
export async function zaloguj(login, haslo) {
  const urz = /iPhone/.test(navigator.userAgent) ? 'iPhone' : /iPad|Macintosh.*Mobile/.test(navigator.userAgent) ? 'iPad'
    : /Android/.test(navigator.userAgent) ? 'Android' : /Windows/.test(navigator.userAgent) ? 'Windows' : 'Urządzenie';
  const j = await api('/logowanie', { method: 'POST', body: JSON.stringify({ login, haslo, urzadzenie: urz }) });
  stan.token = j.token; stan.konto = j.konto; stan.blad = '';
  await idbPut('meta', j.token, 'token'); await idbPut('meta', j.konto, 'konto');
  if (!stan.agent.nazwa) await ustawAgenta({ nazwa: j.konto.nazwa, telefon: j.konto.telefon });
  polaczNaZywo(); await synchronizuj(); odswiezJa();
  powiadom();
}
async function wylogujLokalnie(komunikat) {
  stan.token = null; stan.blad = komunikat || '';
  await idbDel('meta', 'token');
  if (es) { es.close(); es = null; }
  stan.polaczony = false;
  powiadom();
}
export async function wyloguj() {
  try { await api('/wyloguj', { method: 'POST', body: '{}' }); } catch { /* i tak lokalnie */ }
  await wylogujLokalnie('');
}
async function odswiezJa() {
  try {
    const j = await api('/ja');
    stan.konto = j.konto; stan.konta = j.konta; stan.push = j.push; stan.vapid = j.vapid;
    await idbPut('meta', j.konto, 'konto'); await idbPut('meta', j.konta, 'konta');
    powiadom();
  } catch { /* offline */ }
}
export async function ustawAgenta(a) {
  stan.agent = { ...stan.agent, ...a };
  await idbPut('meta', stan.agent, 'agent');
  if (stan.token && (a.nazwa !== undefined || a.telefon !== undefined)) {
    try { await api('/ja', { method: 'POST', body: JSON.stringify({ nazwa: stan.agent.nazwa, telefon: stan.agent.telefon }) }); odswiezJa(); } catch { /* później */ }
  }
  powiadom();
}
export const nazwaKonta = (id) => stan.konta.find((k) => k.id === id)?.nazwa || '';

let synchronizacja = null;
export function synchronizuj() {
  if (!stan.token || !navigator.onLine) return Promise.resolve();
  if (synchronizacja) return synchronizacja;
  synchronizacja = (async () => {
    try { await wyslijZmiany(true); await pobierz(); wyslijZdjecia(); stan.blad = ''; }
    catch (e) { if (e.message !== 'wylogowano') stan.blad = navigator.onLine ? 'Brak połączenia z serwerem' : ''; }
    finally { synchronizacja = null; powiadom(); }
  })();
  return synchronizacja;
}
async function wyslijZmiany(wewn) {
  if (!stan.token || !navigator.onLine) return;
  const paczka = kolejka.filter((z) => !wysylane.has(z.cid)).slice(0, 200);
  if (!paczka.length) return;
  paczka.forEach((z) => wysylane.add(z.cid));
  try {
    const j = await api('/zmiany', { method: 'POST', body: JSON.stringify({ zmiany: paczka.map(({ cid, oid, pola, usun }) => ({ cid, oid, pola, usun })) }) });
    const ok = new Set(j.wyniki.filter((w) => w.ok).map((w) => w.cid));
    const bledne = new Set(j.wyniki.filter((w) => !w.ok).map((w) => w.cid));
    // zanim zdejmiemy zmiany z kolejki, pobieramy nowy stan, żeby widok nie mrugnął starą wartością
    await pobierz();
    kolejka = kolejka.filter((z) => !ok.has(z.cid) && !bledne.has(z.cid));
    await tx('kolejka', 'readwrite', (s) => { for (const c of [...ok, ...bledne]) s.delete(c); });
    stan.blad = '';
  } catch (e) {
    if (!wewn) stan.blad = navigator.onLine ? 'Nie udało się wysłać zmian — ponowię' : '';
    throw e;
  } finally {
    paczka.forEach((z) => wysylane.delete(z.cid));
    powiadom();
  }
  if (kolejka.some((z) => !wysylane.has(z.cid))) return wyslijZmiany(wewn);
}
async function pobierz() {
  const j = await api(`/zmiany?od=${stan.seq}`);
  if (j.oferty.length) {
    await tx('baza', 'readwrite', (s) => { for (const o of j.oferty) s.put(o); });
    for (const o of j.oferty) bazy.set(o.id, o);
  }
  if (j.seq !== stan.seq) { stan.seq = j.seq; await idbPut('meta', j.seq, 'seq'); }
  powiadom();
}

// ---------- na żywo ----------
let es = null;
function polaczNaZywo() {
  if (!stan.token || typeof EventSource === 'undefined') return;
  if (es && es.readyState !== 2) return;
  es = new EventSource(`${API}/na-zywo?t=${encodeURIComponent(stan.token)}`);
  es.addEventListener('seq', (e) => { stan.polaczony = true; if (Number(e.data) > stan.seq) pobierz().catch(() => {}); powiadom(); });
  es.onerror = () => { stan.polaczony = false; powiadom(); };
}

// ---------- zdjęcia ----------
const urlCache = new Map();
async function przeskaluj(plik, maks, jakosc) {
  let zr;
  try { zr = await createImageBitmap(plik); } catch {
    zr = await new Promise((ok, zle) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => zle(new Error('Nie mogę odczytać zdjęcia.')); i.src = URL.createObjectURL(plik); });
  }
  const w0 = zr.width || zr.naturalWidth, h0 = zr.height || zr.naturalHeight;
  const sk = Math.min(1, maks / Math.max(w0, h0));
  const w = Math.round(w0 * sk), h = Math.round(h0 * sk);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(zr, 0, 0, w, h);
  zr.close?.();
  const blob = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', jakosc));
  c.width = c.height = 0;
  return { blob, w, h };
}
// zwraca listę nowych wpisów zdjęć (do dopisania w ofercie)
export async function przygotujZdjecia(oid, pliki, naPostep) {
  const nowe = [];
  let i = 0;
  for (const plik of pliki) {
    i++; naPostep?.(i, pliki.length);
    const id = noweId(12);
    const pelne = await przeskaluj(plik, 2560, 0.88);
    const mini = await przeskaluj(pelne.blob, 520, 0.8);
    await idbPut('pliki', pelne.blob, `${id}:pelne`);
    await idbPut('pliki', mini.blob, `${id}:mini`);
    for (const rodzaj of ['mini', 'pelne']) {
      const w = { klucz: `${id}:${rodzaj}`, id, oid, rodzaj };
      wysylki.push(w); await idbPut('wysylka', w);
    }
    nowe.push({ id, w: pelne.w, h: pelne.h, t: Date.now() });
  }
  powiadom();
  wyslijZdjecia();
  return nowe;
}
let wysylaZdjecia = false;
async function wyslijZdjecia() {
  if (wysylaZdjecia || !stan.token || !navigator.onLine) return;
  wysylaZdjecia = true;
  try {
    while (wysylki.length) {
      const w = wysylki[0];
      const blob = await idbGet('pliki', w.klucz);
      if (blob) {
        await api(`/zdjecie/${w.id}?oferta=${w.oid}&rodzaj=${w.rodzaj}`, { method: 'PUT', body: blob, headers: { 'Content-Type': 'image/jpeg' } });
        if (w.rodzaj === 'pelne') await idbDel('pliki', w.klucz); // pełne trzyma serwer, na urządzeniu zostaje miniatura
      }
      wysylki.shift(); await idbDel('wysylka', w.klucz);
      powiadom();
    }
  } catch { /* spróbuję przy następnej synchronizacji */ }
  finally { wysylaZdjecia = false; powiadom(); }
}
export const czekaNaWyslanie = (id) => wysylki.some((w) => w.id === id);
export async function urlZdjecia(id, rodzaj = 'mini') {
  const k = `${id}:${rodzaj}`;
  if (urlCache.has(k)) return urlCache.get(k);
  let blob = await idbGet('pliki', k);
  if (!blob && rodzaj === 'pelne') blob = await idbGet('pliki', `${id}:pelne`);
  if (!blob) {
    if (!stan.token || !navigator.onLine) return null;
    const r = await fetch(`${API}/zdjecie/${id}?rodzaj=${rodzaj}`, { headers: { Authorization: `Bearer ${stan.token}` } });
    if (!r.ok) return null;
    blob = await r.blob();
    if (rodzaj === 'mini') await idbPut('pliki', blob, k);
  }
  const u = URL.createObjectURL(blob);
  urlCache.set(k, u);
  return u;
}
export async function blobZdjecia(id) {
  const lok = await idbGet('pliki', `${id}:pelne`);
  if (lok) return lok;
  const r = await fetch(`${API}/zdjecie/${id}?rodzaj=pelne`, { headers: { Authorization: `Bearer ${stan.token}` } });
  if (!r.ok) throw new Error('Nie mogę pobrać zdjęcia z serwera.');
  return r.blob();
}
export async function usunZdjeciePlik(id) {
  wysylki = wysylki.filter((w) => w.id !== id);
  await tx('wysylka', 'readwrite', (s) => { s.delete(`${id}:mini`); s.delete(`${id}:pelne`); });
  await tx('pliki', 'readwrite', (s) => { s.delete(`${id}:mini`); s.delete(`${id}:pelne`); });
  for (const r of ['mini', 'pelne']) { const u = urlCache.get(`${id}:${r}`); if (u) URL.revokeObjectURL(u); urlCache.delete(`${id}:${r}`); }
  if (stan.token && navigator.onLine) { try { await api(`/zdjecie/${id}`, { method: 'DELETE' }); } catch { /* zostanie, nic złego */ } }
}

// ---------- historia ----------
export const historia = (oid) => api(`/historia?oferta=${encodeURIComponent(oid)}`).then((j) => j.historia);

// ---------- powiadomienia push ----------
export async function wlaczPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error('To urządzenie nie obsługuje powiadomień. Na iPhonie dodaj aplikację do ekranu początkowego i otwórz ją z ikony.');
  const zgoda = await Notification.requestPermission();
  if (zgoda !== 'granted') throw new Error('Powiadomienia są zablokowane w ustawieniach.');
  const reg = await navigator.serviceWorker.ready;
  const klucz = Uint8Array.from(atob(stan.vapid.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: klucz });
  await api('/push', { method: 'POST', body: JSON.stringify({ sub: sub.toJSON() }) });
  stan.push = true; powiadom();
}
export async function wylaczPush() {
  try { const reg = await navigator.serviceWorker.ready; const s = await reg.pushManager.getSubscription(); await s?.unsubscribe(); } catch { /* */ }
  await api('/push', { method: 'POST', body: JSON.stringify({ sub: null }) });
  stan.push = false; powiadom();
}
