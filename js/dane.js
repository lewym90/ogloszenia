// AM Oferty — dane: kopia na urządzeniu (IndexedDB), kolejka zmian offline, synchronizacja na żywo, zdjęcia.
import { noweId } from './model.js';
import * as Z from './sejf.js';

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
    // inna karta czyści telefon (wylogowanie, 5 złych PIN-ów) — oddajemy bazę i przeładowujemy, żeby nie blokować usunięcia
    r.onsuccess = () => { const d = r.result; d.onversionchange = () => { d.close(); _db = null; location.reload(); }; ok(d); };
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
// sejf: wszystko o ofertach i klientach zapisuje się w telefonie zaszyfrowane (js/sejf.js); jawne zostają tylko
// sól i zawinięty klucz (meta.sejf), numer zmian, licznik złych PIN-ów i uchwyt folderu kopii
const KP = { baza: 'id', kolejka: 'cid', wysylka: 'klucz' };
const SZYFR = new Set(['baza', 'kolejka', 'wysylka', 'pliki']);
const META_SZYFR = new Set(['token', 'konto', 'konta', 'agent', 'aktywnosc', 'kluczPlikow', 'firma']);
const szyfrowane = (st, k) => SZYFR.has(st) || (st === 'meta' && META_SZYFR.has(k));
let sejfZapis = null;
async function koduj(st, v, k) {
  if (!szyfrowane(st, k) || !sejfZapis) return v; // przed ustawieniem PIN-u (stara instalacja) — jeszcze jawnie
  const z = await Z.szyfruj(v);
  return KP[st] ? { [KP[st]]: v[KP[st]], z } : { z };
}
const dekoduj = (r) => (r && typeof r === 'object' && Z.zaszyfrowane(r.z) ? Z.odszyfruj(r.z) : r);
const idbGetSurowe = (st, k) => tx(st, 'readonly', (s) => req(s.get(k)));
const idbGet = async (st, k) => dekoduj(await idbGetSurowe(st, k));
const idbAll = async (st) => Promise.all((await tx(st, 'readonly', (s) => req(s.getAll()))).map(dekoduj));
const idbPut = async (st, v, k) => { const w = await koduj(st, v, k); return tx(st, 'readwrite', (s) => { k === undefined ? s.put(w) : s.put(w, k); }); };
const idbDel = (st, k) => tx(st, 'readwrite', (s) => { s.delete(k); });
const idbWpisy = (st) => tx(st, 'readonly', (s) => new Promise((ok, zle) => { const w = []; const c = s.openCursor(); c.onsuccess = () => { const k = c.result; if (!k) return ok(w); w.push([k.key, k.value]); k.continue(); }; c.onerror = () => zle(c.error); }));

// ---------- PIN ----------
export const sejfUstawiony = () => !!sejfZapis;
export async function przygotuj() {
  sejfZapis = (await idbGetSurowe('meta', 'sejf')) || null;
  const zalogowany = !!(await idbGetSurowe('meta', 'token'));
  return { sejf: !!sejfZapis, zalogowany, bledy: Number(await idbGetSurowe('meta', 'pinBledy') || 0) };
}
export async function odblokuj(pin) {
  try { await Z.otworz(pin, sejfZapis); await idbPut('meta', 0, 'pinBledy'); return { ok: true }; }
  catch {
    const n = Number(await idbGetSurowe('meta', 'pinBledy') || 0) + 1;
    await idbPut('meta', n, 'pinBledy');
    if (n >= Z.MAKS_PROB) { await wyczysc(`${Z.MAKS_PROB} razy błędny PIN — dane usunięte z tego urządzenia. Zaloguj się hasłem.`); return { ok: false, wyczyszczono: true }; }
    return { ok: false, zostalo: Z.MAKS_PROB - n };
  }
}
// pierwszy PIN: tworzy sejf i szyfruje wszystko, co już jest w telefonie (aktualizacja ze starszej wersji)
export async function ustawPin(pin) {
  const zapis = await Z.utworz(pin);
  sejfZapis = zapis; // od teraz zapisy idą zaszyfrowane
  for (const st of ['baza', 'kolejka', 'wysylka']) {
    const L = await tx(st, 'readonly', (s) => req(s.getAll()));
    for (const v of L) if (!(v && Z.zaszyfrowane(v.z))) await idbPut(st, v);
  }
  for (const [k, v] of await idbWpisy('pliki')) if (!(v && Z.zaszyfrowane(v.z))) await idbPut('pliki', v, k);
  for (const k of META_SZYFR) { const v = await idbGetSurowe('meta', k); if (v !== undefined && !(v && Z.zaszyfrowane(v.z))) await idbPut('meta', v, k); }
  await idbPut('meta', zapis, 'sejf'); await idbPut('meta', 0, 'pinBledy');
}
export async function zmienPin(stary, nowy) {
  const zapis = await Z.przepakuj(stary, nowy, sejfZapis); // zły stary PIN = wyjątek
  sejfZapis = zapis; await idbPut('meta', zapis, 'sejf');
}
// całkowite wyczyszczenie telefonu (wylogowanie, zdalne wylogowanie, 5 złych PIN-ów, „Nie pamiętam PIN-u”)
export async function wyczysc(komunikat = '') {
  Z.zamknij();
  try { if (es) { es.close(); es = null; } } catch { /* */ }
  try { (await _db)?.close(); } catch { /* */ }
  _db = null;
  const usun = (n) => new Promise((ok) => { const r = indexedDB.deleteDatabase(n); r.onsuccess = r.onerror = r.onblocked = () => ok(); });
  await usun('amoferty'); await usun('am-rzut');
  try { for (const k of Object.keys(localStorage)) if (k !== 'am_api') localStorage.removeItem(k); } catch { /* */ }
  try { sessionStorage.clear(); if (komunikat) sessionStorage.setItem('am-komunikat', komunikat); } catch { /* */ }
  location.reload();
}

// ---------- stan ----------
const bazy = new Map();      // id -> {id, dane, seq, zmieniona, kto, usunieta}
let kolejka = [];            // [{cid, oid, pola?, usun?, t}]
let wysylki = [];            // [{klucz, id, oid, rodzaj}]
export const stan = { token: null, konto: null, konta: [], seq: 0, online: navigator.onLine, polaczony: false, blad: '', agent: {}, aktywnosc: [], aktywnoscWidziana: 0, prosby: [], retencja: [], firma: {} };
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
  stan.aktywnosc = await idbGet('meta', 'aktywnosc') || [];
  stan.aktywnoscWidziana = await idbGet('meta', 'aktywnoscWidziana') || 0;
  stan.firma = await idbGet('meta', 'firma') || {};
  klucz = await idbGet('meta', 'kluczPlikow') || null;
  for (const b of await idbAll('baza')) bazy.set(b.id, b);
  kolejka = (await idbAll('kolejka')).sort((a, b) => a.t - b.t);
  wysylki = await idbAll('wysylka');
  addEventListener('online', () => { stan.online = true; powiadom(); synchronizuj(); });
  addEventListener('offline', () => { stan.online = false; powiadom(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { synchronizuj(); polaczNaZywo(); } });
  setInterval(() => synchronizuj(), 60e3);
  if (stan.token) { polaczNaZywo(); synchronizuj(); odswiezJa(); pobierzAktywnosc(); }
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
  if (j.oczekuje) return j; // nowe urządzenie: czeka na kod z zalogowanego telefonu
  return przyjmijToken(j);
}
export async function potwierdzKod(prosba, kod) { return przyjmijToken(await api('/logowanie/kod', { method: 'POST', body: JSON.stringify({ prosba, kod }) })); }
// token trzymamy tylko w pamięci, dopóki nie ma PIN-u — zapis do telefonu dopiero zaszyfrowany (dokonczLogowanie)
function przyjmijToken(j) { stan.token = j.token; stan.konto = j.konto; stan.blad = ''; return { zmienHaslo: !!j.zmienHaslo }; }
export async function dokonczLogowanie() {
  await idbPut('meta', stan.token, 'token'); await idbPut('meta', stan.konto, 'konto');
  if (!stan.agent.nazwa) await ustawAgenta({ nazwa: stan.konto.nazwa, telefon: stan.konto.telefon });
  polaczNaZywo(); await synchronizuj(); odswiezJa();
  powiadom();
}
export const zmienHaslo = (stare, nowe) => api('/haslo', { method: 'POST', body: JSON.stringify({ stare, nowe }) });
async function wylogujLokalnie(komunikat) { await wyczysc(komunikat); }
export async function wyloguj() {
  try { await api('/wyloguj', { method: 'POST', body: '{}' }); } catch { /* i tak czyścimy telefon */ }
  await wyczysc('');
}
export const odrzucProsbe = async (id) => { try { await api(`/prosba/${id}`, { method: 'DELETE' }); } finally { odswiezJa(); } };
async function odswiezJa() {
  try {
    const j = await api('/ja');
    stan.konto = j.konto; stan.konta = j.konta; stan.push = j.push; stan.vapid = j.vapid; stan.kopia = j.kopia || null; stan.prosby = j.prosby || [];
    api('/retencja').then((r) => { stan.retencja = r.wpisy || []; powiadom(); }).catch(() => {});
    pobierzFirme();
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
    try { await wyslijZmiany(true); await pobierz(); wyslijZdjecia(); kluczPlikow().catch(() => {}); wyslijDziennik(); polaczNaZywo(); stan.blad = ''; }
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
  // serwer odtworzony z kopii ma niższy numer zmian — wtedy pobieramy wszystko od nowa
  if (j.seq < stan.seq) { stan.seq = 0; await idbPut('meta', 0, 'seq'); return pobierz(); }
  if (j.oferty.length) {
    const zak = await Promise.all(j.oferty.map((o) => koduj('baza', o)));
    await tx('baza', 'readwrite', (s) => { for (const o of zak) s.put(o); });
    for (const o of j.oferty) bazy.set(o.id, o);
  }
  if (j.seq !== stan.seq) { stan.seq = j.seq; await idbPut('meta', j.seq, 'seq'); }
  if (j.oferty.length) pobierzAktywnosc();
  powiadom();
}

// ---------- aktywność wspólnika ----------
let tAkt = 0;
export function pobierzAktywnosc() {
  clearTimeout(tAkt);
  tAkt = setTimeout(async () => {
    if (!stan.token || !navigator.onLine) return;
    try {
      const j = await api('/aktywnosc');
      stan.aktywnosc = j.aktywnosc;
      await idbPut('meta', j.aktywnosc, 'aktywnosc');
      powiadom();
    } catch { /* offline */ }
  }, 400);
}
export const nowaAktywnosc = () => stan.aktywnosc.some((a) => a.kiedy > stan.aktywnoscWidziana);
export async function aktywnoscWidziana() {
  stan.aktywnoscWidziana = Math.max(Date.now(), ...stan.aktywnosc.map((a) => a.kiedy));
  await idbPut('meta', stan.aktywnoscWidziana, 'aktywnoscWidziana');
  powiadom();
}

// ---------- na żywo ----------
let es = null;
let laczy = false;
async function polaczNaZywo() {
  if (!stan.token || typeof EventSource === 'undefined' || laczy) return;
  if (es && es.readyState !== 2) return;
  laczy = true;
  try {
    const { b } = await api('/bilet'); // jednorazowy bilet — token nie trafia do adresu ani do logów
    es = new EventSource(`${API}/na-zywo?b=${encodeURIComponent(b)}`);
    es.addEventListener('seq', (e) => { stan.polaczony = true; if (Number(e.data) > stan.seq) pobierz().catch(() => {}); powiadom(); });
    es.addEventListener('prosba', () => odswiezJa());
    es.addEventListener('firma', () => pobierzFirme());
    // po zerwaniu bilet jest zużyty — zamykamy i łączymy się od nowa z nowym biletem
    es.onerror = () => { stan.polaczony = false; try { es.close(); } catch { /* */ } powiadom(); setTimeout(() => polaczNaZywo(), 5000); };
  } catch { /* offline — spróbuje przy następnej synchronizacji */ }
  finally { laczy = false; }
}

// ---------- dziennik dostępu (kto oglądał dane klientów i właścicieli) ----------
const doDziennika = [], ostatnioZapisane = new Map();
export function zapiszDostep(oid, k, co) {
  const klucz = `${oid}|${k}|${co}`;
  if (Date.now() - (ostatnioZapisane.get(klucz) || 0) < 10 * 60e3) return; // to samo oglądanie raz na 10 min
  ostatnioZapisane.set(klucz, Date.now());
  doDziennika.push({ oid, k, co, kiedy: Date.now() });
  clearTimeout(tDz); tDz = setTimeout(wyslijDziennik, 2500);
}
let tDz = 0;
async function wyslijDziennik() {
  if (!doDziennika.length || !stan.token || !navigator.onLine) return;
  const paczka = doDziennika.splice(0, 100);
  try { await api('/dziennik', { method: 'POST', body: JSON.stringify({ wpisy: paczka }) }); } catch { doDziennika.unshift(...paczka); }
}
export const dziennik = () => api('/dziennik').then((j) => j.dziennik);
export const daneOsoby = (oid, k) => api(`/osoba?oferta=${encodeURIComponent(oid)}&k=${encodeURIComponent(k)}`);
export async function usunOsobe(oid, k) {
  await api(`/osoba?oferta=${encodeURIComponent(oid)}&k=${encodeURIComponent(k)}`, { method: 'DELETE' });
  const pola = k === 'wlasciciel' ? ['wlImie', 'wlTel', 'wlEmail', 'wlRodo', 'wlRodoKiedy'] : [k];
  for (const z of kolejka) if (z.oid === oid && z.pola) for (const p of pola) delete z.pola[p]; // niewysłane zmiany tej osoby też znikają
  kolejka = kolejka.filter((z) => z.usun || Object.keys(z.pola || {}).length);
  await tx('kolejka', 'readwrite', (s) => { s.clear(); });
  for (const z of kolejka) await idbPut('kolejka', z);
  await pobierz(); odswiezJa();
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
    const sr = await przeskaluj(pelne.blob, 1400, 0.84);
    const mini = await przeskaluj(sr.blob, 520, 0.8);
    await idbPut('pliki', pelne.blob, `${id}:pelne`);
    await idbPut('pliki', sr.blob, `${id}:sr`);
    await idbPut('pliki', mini.blob, `${id}:mini`);
    for (const rodzaj of ['mini', 'sr', 'pelne']) {
      const w = { klucz: `${id}:${rodzaj}`, id, oid, rodzaj };
      wysylki.push(w); await idbPut('wysylka', w);
    }
    nowe.push({ id, w: pelne.w, h: pelne.h, t: Date.now() });
  }
  powiadom();
  wyslijZdjecia();
  return nowe;
}
// gotowy JPEG (np. po korekcie, już ≤ 2560 px) — bez ponownej kompresji pełnej wersji
export async function dodajGotoweZdjecie(oid, blob, w, h) {
  const id = noweId(12);
  const sr = await przeskaluj(blob, 1400, 0.84);
  const mini = await przeskaluj(sr.blob, 520, 0.8);
  await idbPut('pliki', blob, `${id}:pelne`);
  await idbPut('pliki', sr.blob, `${id}:sr`);
  await idbPut('pliki', mini.blob, `${id}:mini`);
  for (const rodzaj of ['mini', 'sr', 'pelne']) {
    const wp = { klucz: `${id}:${rodzaj}`, id, oid, rodzaj };
    wysylki.push(wp); await idbPut('wysylka', wp);
  }
  powiadom();
  wyslijZdjecia();
  return { id, w, h, t: Date.now() };
}
let wysylaZdjecia = false, jeszczeRaz = false;
async function wyslijZdjecia() {
  if (wysylaZdjecia) { jeszczeRaz = true; return; } // dopisane w trakcie wysyłki pójdą zaraz po niej
  if (!stan.token || !navigator.onLine) return;
  wysylaZdjecia = true; jeszczeRaz = false;
  try {
    // dokumenty, których serwer nie przyjął (np. stara wersja serwera), czekają — nie blokują zdjęć
    for (const w of [...wysylki]) {
      const blob = await idbGet('pliki', w.klucz);
      try {
        if (blob && w.rodzaj === 'plik') {
          await api(`/plik/${w.id}?oferta=${w.oid}&nazwa=${encodeURIComponent(w.nazwa || '')}`, { method: 'PUT', body: blob, headers: { 'Content-Type': blob.type || 'application/octet-stream' } });
          await idbDel('pliki', w.klucz);
        } else if (blob) {
          await api(`/zdjecie/${w.id}?oferta=${w.oid}&rodzaj=${w.rodzaj}`, { method: 'PUT', body: blob, headers: { 'Content-Type': 'image/jpeg' } });
          if (w.rodzaj === 'pelne') await idbDel('pliki', w.klucz); // pełne trzyma serwer, na urządzeniu zostaje miniatura
        }
      } catch (e) {
        if (!e.kod || e.kod === 401) throw e; // brak sieci — spróbuję później
        if (w.rodzaj !== 'plik' || ![413, 415].includes(e.kod) || w.nazwa === 'rzut.json') continue; // serwer chwilowo nie przyjmuje (plan rzutu czeka np. na aktualizację serwera) — zostaje w kolejce
        stan.bladPliku = e.message; await idbDel('pliki', w.klucz);
      }
      wysylki = wysylki.filter((x) => x.klucz !== w.klucz); await idbDel('wysylka', w.klucz);
      powiadom();
    }
  } catch { jeszczeRaz = false; /* spróbuję przy następnej synchronizacji */ }
  finally { wysylaZdjecia = false; powiadom(); if (jeszczeRaz) setTimeout(wyslijZdjecia, 0); }
}
export const czekaNaWyslanie = (id) => wysylki.some((w) => w.id === id);
export async function urlZdjecia(id, rodzaj = 'mini') {
  const k = `${id}:${rodzaj}`;
  if (urlCache.has(k)) return urlCache.get(k);
  let blob = await idbGet('pliki', k);
  if (!blob && rodzaj === 'pelne') blob = await idbGet('pliki', `${id}:pelne`);
  if (!blob) {
    if (!stan.token || !navigator.onLine) return null;
    let r;
    try { r = await fetch(`${API}/zdjecie/${id}?rodzaj=${rodzaj}`, { headers: { Authorization: `Bearer ${stan.token}` } }); } catch { return null; } // sieć zerwana — miniatura spróbuje przy następnym odświeżeniu
    if (!r.ok) return rodzaj === 'sr' ? urlZdjecia(id, 'mini') : null;
    blob = await r.blob();
    if (rodzaj !== 'pelne') await idbPut('pliki', blob, k);
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
  await tx('wysylka', 'readwrite', (s) => { for (const r of ['mini', 'sr', 'pelne']) s.delete(`${id}:${r}`); });
  await tx('pliki', 'readwrite', (s) => { for (const r of ['mini', 'sr', 'pelne']) s.delete(`${id}:${r}`); });
  for (const r of ['mini', 'sr', 'pelne']) { const u = urlCache.get(`${id}:${r}`); if (u) URL.revokeObjectURL(u); urlCache.delete(`${id}:${r}`); }
  if (stan.token && navigator.onLine) { try { await api(`/zdjecie/${id}`, { method: 'DELETE' }); } catch { /* zostanie, nic złego */ } }
}

// ---------- dokumenty (PDF, zdjęcia dokumentów) ----------
const MAX_PLIK = 30 * 1024 * 1024;
// zwraca wpis pliku do zapisania w dokumencie oferty
export async function przygotujPlik(oid, plik) {
  const id = noweId(12);
  let blob = plik, typ = 'pdf';
  if (plik.type === 'application/pdf' || /\.pdf$/i.test(plik.name || '')) {
    if (plik.size > MAX_PLIK) throw new Error('Plik jest za duży (maks. 30 MB).');
    blob = new Blob([await plik.arrayBuffer()], { type: 'application/pdf' }); // kopia w pamięci — Safari nie zapisze w IndexedDB pliku wskazującego na dysk
  } else if (/^image\//.test(plik.type) || /\.(jpe?g|png|heic|heif)$/i.test(plik.name || '')) {
    blob = (await przeskaluj(plik, 2400, 0.86)).blob; typ = 'jpg'; // zdjęcie dokumentu: czytelne, ale lekkie
  } else throw new Error('Dodaj PDF albo zdjęcie dokumentu.');
  const nazwa = String(plik.name || `dokument.${typ}`).replace(/\.(heic|heif|png|jpe?g)$/i, '.jpg').slice(0, 120);
  await idbPut('pliki', blob, `pl:${id}`);
  const w = { klucz: `pl:${id}`, id, oid, rodzaj: 'plik', nazwa };
  wysylki.push(w); await idbPut('wysylka', w);
  powiadom();
  wyslijZdjecia();
  return { id, nazwa, typ, rozm: blob.size, t: Date.now() };
}
// plan rzutu z edytora: tekst JSON wysyłany tą samą kolejką co dokumenty
export async function przygotujPlanRzutu(oid, tekst) {
  const id = noweId(12);
  const blob = new Blob([tekst], { type: 'application/json' });
  await idbPut('pliki', blob, `pl:${id}`);
  const w = { klucz: `pl:${id}`, id, oid, rodzaj: 'plik', nazwa: 'rzut.json' };
  wysylki.push(w); await idbPut('wysylka', w);
  powiadom(); wyslijZdjecia();
  return { id, t: Date.now() };
}
let klucz = null;
async function kluczPlikow() {
  if (klucz && klucz.do - Date.now() > 3600e3) return klucz.k;
  klucz = await api('/klucz-plikow');
  await idbPut('meta', klucz, 'kluczPlikow');
  return klucz.k;
}
// adres do otwarcia dokumentu poza aplikacją (PDF w przeglądarce telefonu); null gdy plik jeszcze tylko na urządzeniu
export function adresPliku(id) {
  if (!klucz || klucz.do - Date.now() < 60e3) return null;
  return `${API}/plik/${id}?k=${encodeURIComponent(klucz.k)}`;
}
export const przygotujKluczPlikow = () => (stan.token && navigator.onLine ? kluczPlikow().catch(() => null) : Promise.resolve(null));
export async function blobPliku(id) {
  const lok = await idbGet('pliki', `pl:${id}`);
  if (lok) return lok;
  const r = await fetch(`${API}/plik/${id}`, { headers: { Authorization: `Bearer ${stan.token}` } });
  if (!r.ok) throw new Error('Nie mogę pobrać pliku z serwera.');
  return r.blob();
}
export async function usunPlik(id) {
  wysylki = wysylki.filter((w) => w.id !== id);
  await idbDel('wysylka', `pl:${id}`); await idbDel('pliki', `pl:${id}`);
  if (stan.token && navigator.onLine) { try { await api(`/plik/${id}`, { method: 'DELETE' }); } catch { /* zostanie na serwerze, nic złego */ } }
  powiadom();
}

// ---------- kopia na komputer ----------
export const meta = { get: (k) => idbGet('meta', k), put: (v, k) => idbPut('meta', v, k) };
export const spisKopii = () => api('/kopia/spis');
export async function pobierzDoKopii(sciezka) {
  const r = await fetch(`${API}${sciezka}`, { headers: { Authorization: `Bearer ${stan.token}` } });
  if (!r.ok) throw new Error(`Nie mogę pobrać ${sciezka} (${r.status})`);
  return r;
}
export async function zglosKopie(dane) {
  const j = await api('/kopia/zrobiona', { method: 'POST', body: JSON.stringify(dane) });
  stan.kopia = j.kopia; powiadom();
}
export const odswiezStanKopii = () => odswiezJa();

// ---------- historia ----------
export const historia = (oid, doDziennika = false) => api(`/historia?oferta=${encodeURIComponent(oid)}${doDziennika ? '&dziennik=1' : ''}`).then((j) => j.historia);
// ---------- AML, dane firmy, urządzenia ----------
export const archiwumAml = () => api('/aml/archiwum').then((j) => j.archiwum);
export const urzadzenia = () => api('/urzadzenia').then((j) => j.urzadzenia);
export const wylogujUrzadzenie = (id) => api(`/urzadzenie/${Number(id)}`, { method: 'DELETE' });
let zapisyFirmy = 0; // trwający zapis wygrywa z pobraniem (inaczej stara wersja z serwera nadpisałaby to, co właśnie wpisano)
export async function pobierzFirme() {
  try { const j = await api('/firma'); if (zapisyFirmy) return stan.firma; stan.firma = j.firma || {}; await idbPut('meta', stan.firma, 'firma'); powiadom(); } catch { /* offline — zostaje kopia z telefonu */ }
  return stan.firma || {};
}
export async function zapiszFirme(f) {
  stan.firma = { ...(stan.firma || {}), ...f };
  await idbPut('meta', stan.firma, 'firma');
  zapisyFirmy++;
  try { await api('/firma', { method: 'POST', body: JSON.stringify({ firma: stan.firma }) }); } finally { zapisyFirmy--; }
  powiadom();
}

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
