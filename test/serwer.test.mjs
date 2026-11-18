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
  r = await fetch(`${baza}/zdjecie/zdj000001?rodzaj=mini`, { headers: { Authorization: `Bearer ${tB}` } });
  assert.equal(r.status, 200); assert.equal((await r.arrayBuffer()).byteLength, jpg.length);
  r = await fetch(`${baza}/zdjecie/zdj000002?oferta=oferta002`, { method: 'PUT', body: Buffer.from('<svg>'), headers: { Authorization: `Bearer ${tA}` } });
  assert.equal(r.status, 415);
  r = await fetch(`${baza}/zdjecie/zdj000001`, { method: 'DELETE', headers: { Authorization: `Bearer ${tA}` } });
  assert.equal(r.status, 200);
  r = await fetch(`${baza}/zdjecie/zdj000001`, { headers: { Authorization: `Bearer ${tA}` } });
  assert.equal(r.status, 404);
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
await test('zmiana hasła wylogowuje urządzenia konta', async () => {
  S.zapiszKonto('marek', 'Marek Lewandowski', 'nowehaslo1');
  assert.equal((await api('/ja', {}, tA)).kod, 401);
  assert.equal((await api('/ja', {}, tB)).kod, 200);
});
await test('kopia bazy', async () => {
  S.kopia();
  assert.ok(fs.readdirSync(path.join(katalog, 'kopie')).some((f) => f.endsWith('.db')));
});
srv.close(); srv.closeAllConnections?.();
console.log(`\nSerwer: ${ok} testów OK`);
process.exit(0);
