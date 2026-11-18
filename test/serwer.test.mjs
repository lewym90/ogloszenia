// Testy serwera: node test/serwer.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const katalog = fs.mkdtempSync(path.join(os.tmpdir(), 'amoferty-'));
process.env.AM_DANE = katalog;
const S = await import('../serwer/amoferty.mjs');
const srv = S.utworzSerwer();
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
const baza = `http://127.0.0.1:${srv.address().port}`;
const api = async (p, o = {}, t) => {
  const r = await fetch(baza + p, { ...o, headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}), ...(o.headers || {}) } });
  return { kod: r.status, j: r.headers.get('content-type')?.includes('json') ? await r.json() : await r.arrayBuffer() };
};
let ok = 0;
const test = async (n, f) => { await f(); ok++; console.log('✔', n); };

await test('zdrowie bez kont', async () => {
  const r = await api('/zdrowie'); assert.equal(r.kod, 200); assert.equal(r.j.konta, 0); assert.ok(r.j.vapid);
});
await test('zakładanie kont i walidacja', async () => {
  S.zapiszKonto('marek', 'Marek Lewandowski', 'tajne123', '600100200');
  S.zapiszKonto('anna', 'Anna Wspólnik', 'haslo456');
  assert.throws(() => S.zapiszKonto('X Y', 'zly', 'tajne123'));
  assert.throws(() => S.zapiszKonto('ok', 'krotkie', '123'));
});
let tA, tB;
await test('logowanie', async () => {
  assert.equal((await api('/logowanie', { method: 'POST', body: JSON.stringify({ login: 'marek', haslo: 'zle' }) })).kod, 401);
  const r = await api('/logowanie', { method: 'POST', body: JSON.stringify({ login: 'Marek', haslo: 'tajne123', urzadzenie: 'iPhone' }) });
  assert.equal(r.kod, 200); tA = r.j.token; assert.equal(r.j.konto.nazwa, 'Marek Lewandowski');
  tB = (await api('/logowanie', { method: 'POST', body: JSON.stringify({ login: 'anna', haslo: 'haslo456' }) })).j.token;
  assert.equal((await api('/zmiany?od=0')).kod, 401);
});
await test('nowa oferta, zmiany pól, idempotencja', async () => {
  let r = await api('/zmiany', { method: 'POST', body: JSON.stringify({ zmiany: [{ oid: 'oferta001', cid: 'c1', pola: { transakcja: 'sprzedaz', cena: 450000, roboczy: 'Narutowicza 12' } }] }) }, tA);
  assert.equal(r.kod, 200); assert.equal(r.j.wyniki[0].ok, true);
  r = await api('/zmiany', { method: 'POST', body: JSON.stringify({ zmiany: [{ oid: 'oferta001', cid: 'c1', pola: { cena: 1 } }] }) }, tA);
  assert.equal(r.j.wyniki[0].juz, true, 'powtórzona zmiana nie może być zastosowana drugi raz');
  r = await api('/zmiany', { method: 'POST', body: JSON.stringify({ zmiany: [{ oid: 'oferta001', cid: 'c2', pola: { cena: 439000, pom: [{ n: 'Salon', m: 18.2 }] } }] }) }, tB);
  const z = await api('/zmiany?od=0', {}, tA);
  assert.equal(z.j.oferty.length, 1); assert.equal(z.j.oferty[0].dane.cena, 439000); assert.equal(z.j.oferty[0].dane.pom[0].m, 18.2);
  const seq = z.j.seq;
  assert.equal((await api(`/zmiany?od=${seq}`, {}, tA)).j.oferty.length, 0);
});
await test('historia kto/co', async () => {
  const r = await api('/historia?oferta=oferta001', {}, tA);
  const cena = r.j.historia.filter((h) => h.pole === 'cena');
  assert.equal(cena.length, 2); assert.equal(cena[0].kto, 'Anna Wspólnik'); assert.equal(cena[0].stara, '450000'); assert.equal(cena[0].nowa, '439000');
});
await test('usunięcie i przywrócenie pola null', async () => {
  await api('/zmiany', { method: 'POST', body: JSON.stringify({ zmiany: [{ oid: 'oferta001', cid: 'c3', pola: { roboczy: null } }] }) }, tA);
  let z = await api('/zmiany?od=0', {}, tA); assert.equal(z.j.oferty[0].dane.roboczy, undefined);
  await api('/zmiany', { method: 'POST', body: JSON.stringify({ zmiany: [{ oid: 'oferta001', cid: 'c4', usun: true }] }) }, tA);
  z = await api('/zmiany?od=0', {}, tA); assert.equal(z.j.oferty[0].usunieta, true); assert.equal(z.j.oferty[0].dane, null);
});
await test('złe dane nie przechodzą', async () => {
  const r = await api('/zmiany', { method: 'POST', body: JSON.stringify({ zmiany: [{ oid: '../x', cid: 'c5', pola: {} }, { oid: 'oferta002', cid: 'c6', pola: { __proto__: 1, ok: 1 } }] }) }, tA);
  assert.equal(r.j.wyniki[0].ok, false); assert.equal(r.j.wyniki[1].ok, true);
  assert.equal((await api('/zmiany', { method: 'POST', body: '{zly' }, tA)).kod, 400);
});
await test('zdjęcia: wysyłka, pobranie, odrzucenie nie-JPG, usunięcie', async () => {
  const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(2000, 7)]);
  let r = await fetch(`${baza}/zdjecie/zdj000001?oferta=oferta002&rodzaj=mini`, { method: 'PUT', body: jpg, headers: { Authorization: `Bearer ${tA}` } });
  assert.equal(r.status, 200);
  r = await fetch(`${baza}/zdjecie/zdj000001?oferta=oferta002`, { method: 'PUT', body: jpg, headers: { Authorization: `Bearer ${tA}` } });
  assert.equal(r.status, 200);
  r = await fetch(`${baza}/zdjecie/zdj000001?oferta=oferta002&rodzaj=sr`, { method: 'PUT', body: jpg, headers: { Authorization: `Bearer ${tA}` } });
  assert.equal(r.status, 200);
  r = await fetch(`${baza}/zdjecie/zdj000001?rodzaj=sr`, { headers: { Authorization: `Bearer ${tB}` } });
  assert.equal(r.status, 200); await r.arrayBuffer();
  r = await fetch(`${baza}/zdjecie/zdj000001?rodzaj=mini`, { headers: { Authorization: `Bearer ${tB}` } });
  assert.equal(r.status, 200); assert.equal((await r.arrayBuffer()).byteLength, jpg.length);
  r = await fetch(`${baza}/zdjecie/zdj000002?oferta=oferta002`, { method: 'PUT', body: Buffer.from('<svg>'), headers: { Authorization: `Bearer ${tA}` } });
  assert.equal(r.status, 415);
  r = await fetch(`${baza}/zdjecie/zdj000001`, { method: 'DELETE', headers: { Authorization: `Bearer ${tA}` } });
  assert.equal(r.status, 200);
  r = await fetch(`${baza}/zdjecie/zdj000001`, { headers: { Authorization: `Bearer ${tA}` } });
  assert.equal(r.status, 404);
  r = await fetch(`${baza}/zdjecie/zdj000001?rodzaj=sr`, { headers: { Authorization: `Bearer ${tA}` } });
  assert.equal(r.status, 404, 'średnie też usunięte');
});
await test('SSE wysyła numer zmiany', async () => {
  const ac = new AbortController();
  const r = await fetch(`${baza}/na-zywo?t=${tA}`, { signal: ac.signal });
  const rd = r.body.getReader();
  const { value } = await rd.read();
  assert.match(new TextDecoder().decode(value), /event: seq\ndata: \d+/);
  ac.abort();
});
await test('push trafia tylko do wspólnika', async () => {
  await api('/push', { method: 'POST', body: JSON.stringify({ sub: { endpoint: 'https://example.invalid/push/x', keys: { p256dh: 'BOr1b5Mra2hNLu3T1oMWCeUY3sF1tZ1vHLM5tlW3hzP4Vb4C1J3T6Sg1b9t6Hqv7rX6Z2Q3oQkqgYbXo8wT8u7k', auth: 'AAAAAAAAAAAAAAAAAAAAAA' } } }) }, tB);
  S.wyslanePush.length = 0;
  await api('/zmiany', { method: 'POST', body: JSON.stringify({ zmiany: [{ oid: 'oferta003', cid: 'c7', pola: { roboczy: 'Dom Konopnica', status: 'przygotowanie' } }] }) }, tA);
  assert.ok(S.wyslanePush.length >= 1); assert.match(S.wyslanePush[0].dane.tresc, /Marek/);
  S.wyslanePush.length = 0;
  await api('/zmiany', { method: 'POST', body: JSON.stringify({ zmiany: [{ oid: 'oferta003', cid: 'c8', pola: { status: 'gotowa' } }] }) }, tB);
  assert.equal(S.wyslanePush.length, 0, 'autor zmiany nie dostaje powiadomienia');
});
await test('nowa prezentacja powiadamia wspólnika, edycja już nie', async () => {
  S.wyslanePush.length = 0;
  await api('/zmiany', { method: 'POST', body: JSON.stringify({ zmiany: [{ oid: 'oferta003', cid: 'c9', pola: { wz_abc12345: { kiedy: '2026-11-21T17:30', status: 'plan' } } }] }) }, tA);
  assert.equal(S.wyslanePush.length, 1); assert.equal(S.wyslanePush[0].dane.tytul, 'Nowa prezentacja');
  assert.match(S.wyslanePush[0].dane.tresc, /21\.11, 17:30/); assert.equal(S.wyslanePush[0].dane.ekran, 'wizyty');
  S.wyslanePush.length = 0;
  await api('/zmiany', { method: 'POST', body: JSON.stringify({ zmiany: [{ oid: 'oferta003', cid: 'c10', pola: { wz_abc12345: { kiedy: '2026-11-21T18:00', status: 'plan' } } }] }) }, tA);
  assert.equal(S.wyslanePush.length, 0);
});
await test('dokumenty: PDF i JPG, link z kluczem, odrzucenie innych typów, usunięcie', async () => {
  const pdf = Buffer.from('%PDF-1.4\n%%EOF');
  let r = await fetch(`${baza}/plik/dok00000001?oferta=oferta001&nazwa=${encodeURIComponent('Odpis KW.pdf')}`, { method: 'PUT', body: pdf, headers: { Authorization: `Bearer ${tA}` } });
  assert.equal(r.status, 200); assert.equal((await r.json()).typ, 'pdf');
  r = await fetch(`${baza}/plik/dok00000002?oferta=oferta001`, { method: 'PUT', body: Buffer.from('<html>'), headers: { Authorization: `Bearer ${tA}` } });
  assert.equal(r.status, 415);
  assert.equal((await fetch(`${baza}/plik/dok00000001`)).status, 401, 'bez logowania nie ma dostępu');
  r = await fetch(`${baza}/plik/dok00000001`, { headers: { Authorization: `Bearer ${tB}` } });
  assert.equal(r.status, 200); assert.equal(r.headers.get('content-type'), 'application/pdf'); assert.match(r.headers.get('content-disposition'), /Odpis%20KW\.pdf/);
  const k = (await api('/klucz-plikow', {}, tA)).j.k;
  r = await fetch(`${baza}/plik/dok00000001?k=${encodeURIComponent(k)}`); assert.equal(r.status, 200);
  assert.equal(Buffer.from(await r.arrayBuffer()).toString(), pdf.toString());
  assert.equal((await fetch(`${baza}/plik/dok00000001?k=${encodeURIComponent(k.replace(/.$/, (c) => (c === 'a' ? 'b' : 'a')))}`)).status, 403, 'podrobiony klucz');
  const stary = S.kluczPlikow(1, -1000).k;
  assert.equal((await fetch(`${baza}/plik/dok00000001?k=${encodeURIComponent(stary)}`)).status, 403, 'wygasły klucz');
  assert.equal((await api('/plik/dok00000001', { method: 'DELETE' }, tA)).kod, 200);
  assert.equal((await fetch(`${baza}/plik/dok00000001?k=${encodeURIComponent(k)}`)).status, 404);
  globalThis.kluczA = k;
  // plan rzutu z edytora (JSON)
  r = await fetch(`${baza}/plik/planrzut01?oferta=oferta001&nazwa=rzut.json`, { method: 'PUT', body: '{"floors":[]}', headers: { Authorization: `Bearer ${tA}` } });
  assert.equal(r.status, 200); assert.equal((await r.json()).typ, 'json');
  r = await fetch(`${baza}/plik/planrzut02?oferta=oferta001`, { method: 'PUT', body: '{nie json', headers: { Authorization: `Bearer ${tA}` } });
  assert.equal(r.status, 415, 'uszkodzony JSON odrzucony');
});
await test('kopia na komputer: spis, pobieranie, baza, zgłoszenie; kosz zamiast kasowania', async () => {
  const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
  await fetch(`${baza}/zdjecie/zdjkopia01?oferta=oferta001`, { method: 'PUT', body: jpg, headers: { Authorization: `Bearer ${tA}` } });
  const sp = (await api('/kopia/spis', {}, tA)).j;
  assert.ok(sp.pliki.some((f) => f.s === 'zdjecia/zdjkopia01.jpg' && f.r === jpg.length));
  assert.match(sp.baza.nazwa, /^amoferty-\d{10}\.db$/);
  let r = await fetch(`${baza}/kopia/plik?s=zdjecia/zdjkopia01.jpg`, { headers: { Authorization: `Bearer ${tB}` } });
  assert.equal(r.status, 200); assert.deepEqual(Buffer.from(await r.arrayBuffer()), jpg);
  assert.equal((await fetch(`${baza}/kopia/plik?s=../amoferty.db`, { headers: { Authorization: `Bearer ${tA}` } })).status, 400, 'bez wychodzenia poza katalogi');
  assert.equal((await fetch(`${baza}/kopia/plik?s=zdjecia/zdjkopia01.jpg`)).status, 401);
  r = await fetch(`${baza}/kopia/baza`, { headers: { Authorization: `Bearer ${tA}` } });
  const b = Buffer.from(await r.arrayBuffer()); assert.equal(b.subarray(0, 15).toString(), 'SQLite format 3');
  await api('/kopia/zrobiona', { method: 'POST', body: JSON.stringify({ pliki: 3, bajty: 100, nowe: 1 }) }, tA);
  assert.equal((await api('/ja', {}, tB)).j.kopia.pliki, 3, 'wspólnik widzi stan kopii');
  await api('/zdjecie/zdjkopia01', { method: 'DELETE' }, tA);
  assert.ok(fs.existsSync(path.join(katalog, 'kosz', 'zdjecia--zdjkopia01.jpg')), 'usunięte zdjęcie w koszu');
  assert.ok(!(await api('/kopia/spis', {}, tA)).j.pliki.some((f) => f.s.includes('zdjkopia01')));
  const stary = new Date(Date.now() - 31 * 86400e3); fs.utimesSync(path.join(katalog, 'kosz', 'zdjecia--zdjkopia01.jpg'), stary, stary);
  S.kopia(); assert.ok(!fs.existsSync(path.join(katalog, 'kosz', 'zdjecia--zdjkopia01.jpg')), 'kosz czyszczony po 30 dniach');
});
await test('aktywność pokazuje tylko zmiany wspólnika', async () => {
  const r = await api('/aktywnosc', {}, tA);
  assert.equal(r.kod, 200); assert.ok(r.j.aktywnosc.length > 0);
  assert.ok(r.j.aktywnosc.every((x) => x.kto === 'Anna Wspólnik'), 'Marek widzi tylko zmiany Anny');
  assert.ok(r.j.aktywnosc.some((x) => x.pole === 'status' && x.nazwa === 'Dom Konopnica'));
});
await test('zmiana hasła wylogowuje urządzenia konta', async () => {
  S.zapiszKonto('marek', 'Marek Lewandowski', 'nowehaslo1');
  assert.equal((await api('/ja', {}, tA)).kod, 401);
  assert.equal((await fetch(`${baza}/plik/dok00000001?k=${encodeURIComponent(globalThis.kluczA)}`)).status, 403, 'wylogowanie unieważnia link');
  assert.equal((await api('/ja', {}, tB)).kod, 200);
});
await test('kopia bazy', async () => {
  S.kopia();
  assert.ok(fs.readdirSync(path.join(katalog, 'kopie')).some((f) => f.endsWith('.db')));
});
srv.close(); srv.closeAllConnections?.();
console.log(`\nSerwer: ${ok} testów OK`);
process.exit(0);
