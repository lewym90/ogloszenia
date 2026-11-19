// Testy serwera: node test/serwer.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const katalog = fs.mkdtempSync(path.join(os.tmpdir(), 'amoferty-'));
process.env.AM_DANE = katalog;
process.env.AM_TRYB_TESTOWY = '1';
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
await test('szyfrowanie: baza, historia i dokumenty nieczytelne na dysku, czytelne w aplikacji', async () => {
  await api('/zmiany', { method: 'POST', body: JSON.stringify({ zmiany: [{ oid: 'oferta010', cid: 's1', pola: { roboczy: 'Szyfrowana 1', wlImie: 'Jan Tajny', kl_kowal001: { imie: 'Ewa Kowal', tel: '600700800', status: 'nowy' } } }] }) }, tB);
  const raw = new DatabaseSync(path.join(katalog, 'amoferty.db'));
  const o = raw.prepare("SELECT dane FROM oferty WHERE id = 'oferta010'").get();
  assert.match(o.dane, /^e1:/); assert.ok(!o.dane.includes('Jan Tajny'));
  const h = raw.prepare("SELECT stara, nowa FROM historia WHERE oferta = 'oferta010' AND pole = 'wlImie'").get();
  assert.match(h.nowa, /^e1:/);
  raw.close();
  assert.equal((await api('/zmiany?od=0', {}, tB)).j.oferty.find((x) => x.id === 'oferta010').dane.wlImie, 'Jan Tajny');
  assert.equal((await api('/historia?oferta=oferta010', {}, tB)).j.historia.find((x) => x.pole === 'wlImie').nowa, '"Jan Tajny"');
  const pdf = Buffer.from('%PDF-1.4\nUmowa Jan Tajny\n%%EOF');
  await fetch(`${baza}/plik/dokszyfr01?oferta=oferta010&nazwa=umowa.pdf`, { method: 'PUT', body: pdf, headers: { Authorization: `Bearer ${tB}` } });
  const naDysku = fs.readFileSync(path.join(katalog, 'pliki', 'dokszyfr01.pdf'));
  assert.equal(naDysku.subarray(0, 4).toString(), 'AME1'); assert.ok(!naDysku.includes(Buffer.from('Jan Tajny')));
  const r = await fetch(`${baza}/plik/dokszyfr01`, { headers: { Authorization: `Bearer ${tB}` } });
  assert.deepEqual(Buffer.from(await r.arrayBuffer()), pdf);
});
await test('dane sprzed 1.6.0 (jawne) szyfrowane przy starcie, razem z kopiami i dokumentami', async () => {
  S.db.prepare("INSERT INTO oferty (id, dane, seq, utworzona, zmieniona, kto) VALUES ('stara0001', '{\"wlImie\":\"Stary Jawny\"}', 999, 1, 1, 1)").run();
  S.db.prepare("INSERT INTO historia (oferta, pole, stara, nowa, kto, kiedy) VALUES ('stara0001', 'wlImie', NULL, '\"Stary Jawny\"', 1, 1)").run();
  fs.writeFileSync(path.join(katalog, 'pliki', 'starydok01.pdf'), '%PDF-1.4 jawny');
  S.db.prepare("INSERT INTO pliki (id, oferta, typ, nazwa, rozmiar, kto, utworzone) VALUES ('starydok01', 'stara0001', 'pdf', 'x.pdf', 14, 1, 1)").run();
  const kop = path.join(katalog, 'kopie', 'amoferty-2000010100.db'); S.db.exec(`VACUUM INTO '${kop}'`);
  assert.ok(S.zaszyfrujStare() >= 4);
  assert.match(S.db.prepare("SELECT dane FROM oferty WHERE id = 'stara0001'").get().dane, /^e1:/);
  assert.match(S.db.prepare("SELECT nowa FROM historia WHERE oferta = 'stara0001'").get().nowa, /^e1:/);
  assert.equal(fs.readFileSync(path.join(katalog, 'pliki', 'starydok01.pdf')).subarray(0, 4).toString(), 'AME1');
  const k = new DatabaseSync(kop); assert.match(k.prepare("SELECT dane FROM oferty WHERE id = 'stara0001'").get().dane, /^e1:/); k.close();
  assert.ok(!fs.readFileSync(kop).includes(Buffer.from('Stary Jawny')), 'w pliku kopii nie zostaje jawny tekst');
  assert.equal(S.zaszyfrujStare(), 0, 'drugi raz nic');
  assert.equal((await api('/zmiany?od=0', {}, tB)).j.oferty.find((x) => x.id === 'stara0001').dane.wlImie, 'Stary Jawny');
  fs.rmSync(kop);
});
await test('RODO: wydanie danych osoby i usunięcie na żądanie razem z historią', async () => {
  let r = await api('/osoba?oferta=oferta010&k=kl_kowal001', {}, tB);
  assert.equal(r.kod, 200); assert.equal(r.j.dane.imie, 'Ewa Kowal'); assert.ok(r.j.historia.length >= 1);
  r = await api('/osoba?oferta=oferta010&k=kl_kowal001', { method: 'DELETE' }, tB);
  assert.equal(r.kod, 200);
  assert.equal((await api('/zmiany?od=0', {}, tB)).j.oferty.find((x) => x.id === 'oferta010').dane.kl_kowal001, undefined);
  const hist = (await api('/historia?oferta=oferta010', {}, tB)).j.historia;
  assert.ok(!hist.some((x) => x.pole === 'kl_kowal001'), 'historia osoby usunięta');
  assert.ok(!JSON.stringify(hist).includes('Ewa Kowal'));
  assert.ok(hist.some((x) => x.pole === '_usunieto'));
  const dz = (await api('/dziennik', {}, tB)).j.dziennik;
  assert.ok(dz.some((x) => x.co === 'eksport') && dz.some((x) => x.co === 'usuniecie'));
});
await test('okresy przechowywania: klient po 12 mies., usunięta oferta po 30 dniach — całkiem', async () => {
  await api('/zmiany', { method: 'POST', body: JSON.stringify({ zmiany: [{ oid: 'oferta011', cid: 'r1', pola: { roboczy: 'Retencja', kl_stary0001: { imie: 'Dawny Klient', status: 'po' }, kl_trans0001: { imie: 'Kupujący', status: 'transakcja' }, kl_swiezy001: { imie: 'Nowy' } } }] }) }, tB);
  const rok = Date.now() - 366 * 86400e3;
  S.db.prepare("UPDATE historia SET kiedy = ? WHERE oferta = 'oferta011' AND pole IN ('kl_stary0001', 'kl_trans0001')").run(rok);
  const ostrz = (await api('/retencja', {}, tB)).j.wpisy;
  assert.deepEqual(ostrz.map((w) => w.k), ['kl_stary0001'], 'ostrzeżenie tylko o kliencie bez transakcji');
  S.retencja();
  const d = (await api('/zmiany?od=0', {}, tB)).j.oferty.find((x) => x.id === 'oferta011').dane;
  assert.equal(d.kl_stary0001, undefined); assert.ok(d.kl_trans0001, 'klient z transakcją zostaje 5 lat'); assert.ok(d.kl_swiezy001);
  // usunięta oferta: po 30 dniach znika z bazy razem z dokumentami
  await api('/zmiany', { method: 'POST', body: JSON.stringify({ zmiany: [{ oid: 'oferta011', cid: 'r2', usun: true }] }) }, tB);
  await fetch(`${baza}/plik/dokret0001?oferta=oferta011&nazwa=a.pdf`, { method: 'PUT', body: Buffer.from('%PDF-1.4 x'), headers: { Authorization: `Bearer ${tB}` } });
  S.db.prepare("UPDATE oferty SET zmieniona = ? WHERE id = 'oferta011'").run(Date.now() - 31 * 86400e3);
  S.retencja();
  assert.equal(S.db.prepare("SELECT COUNT(*) AS n FROM oferty WHERE id = 'oferta011'").get().n, 0);
  assert.equal(S.db.prepare("SELECT COUNT(*) AS n FROM historia WHERE oferta = 'oferta011'").get().n, 0);
  assert.ok(!fs.existsSync(path.join(katalog, 'pliki', 'dokret0001.pdf')));
});
await test('nowe urządzenie: kod z zalogowanego, złe kody, odrzucenie; słabe hasło do zmiany', async () => {
  process.env.AM_TRYB_TESTOWY = '';
  try {
    let r = await api('/logowanie', { method: 'POST', body: JSON.stringify({ login: 'anna', haslo: 'haslo456', urzadzenie: 'Android' }) });
    assert.equal(r.kod, 200); assert.equal(r.j.oczekuje, true); assert.equal(r.j.token, undefined, 'samo hasło nie daje dostępu');
    const id = r.j.prosba;
    const pr = (await api('/ja', {}, tB)).j.prosby;
    assert.equal(pr.length, 1); assert.equal(pr[0].urzadzenie, 'Android'); assert.match(pr[0].kod, /^\d{6}$/);
    const zly = pr[0].kod === '000000' ? '111111' : '000000';
    assert.equal((await api('/logowanie/kod', { method: 'POST', body: JSON.stringify({ prosba: id, kod: zly }) })).kod, 401);
    r = await api('/logowanie/kod', { method: 'POST', body: JSON.stringify({ prosba: id, kod: pr[0].kod }) });
    assert.equal(r.kod, 200); assert.ok(r.j.token); assert.equal(r.j.zmienHaslo, true, 'hasło krótsze niż 12 znaków — do zmiany');
    assert.equal((await api('/ja', {}, r.j.token)).kod, 200);
    // odrzucenie
    r = await api('/logowanie', { method: 'POST', body: JSON.stringify({ login: 'anna', haslo: 'haslo456', urzadzenie: 'Obcy' }) });
    const p2 = (await api('/ja', {}, tB)).j.prosby[0];
    await api(`/prosba/${p2.id}`, { method: 'DELETE' }, tB);
    assert.equal((await api('/logowanie/kod', { method: 'POST', body: JSON.stringify({ prosba: r.j.prosba, kod: p2.kod }) })).kod, 410);
    // 5 złych kodów kasuje prośbę
    r = await api('/logowanie', { method: 'POST', body: JSON.stringify({ login: 'anna', haslo: 'haslo456', urzadzenie: 'Zgadywacz' }) });
    const p3 = (await api('/ja', {}, tB)).j.prosby[0];
    const inny = p3.kod === '123456' ? '654321' : '123456';
    for (let i = 0; i < 5; i++) await api('/logowanie/kod', { method: 'POST', body: JSON.stringify({ prosba: r.j.prosba, kod: inny }) });
    assert.equal((await api('/logowanie/kod', { method: 'POST', body: JSON.stringify({ prosba: r.j.prosba, kod: p3.kod }) })).kod, 410);
  } finally { process.env.AM_TRYB_TESTOWY = '1'; }
  // zmiana hasła w aplikacji: min. 12 znaków
  assert.equal((await api('/haslo', { method: 'POST', body: JSON.stringify({ stare: 'haslo456', nowe: 'krotkie' }) }, tB)).kod, 400);
  assert.equal((await api('/haslo', { method: 'POST', body: JSON.stringify({ stare: 'zle', nowe: 'dlugiehaslo1234' }) }, tB)).kod, 403);
  assert.equal((await api('/haslo', { method: 'POST', body: JSON.stringify({ stare: 'haslo456', nowe: 'dlugiehaslo1234' }) }, tB)).kod, 200);
  assert.equal((await api('/ja', {}, tB)).kod, 200, 'zmiana hasła w aplikacji nie wylogowuje tego urządzenia');
  S.zapiszKonto('anna', 'Anna Wspólnik', 'haslo456'); // CLI wylogowuje urządzenia konta — logujemy ponownie
  tB = (await api('/logowanie', { method: 'POST', body: JSON.stringify({ login: 'anna', haslo: 'haslo456' }) })).j.token;
});
await test('połączenie na żywo przez jednorazowy bilet; urządzenie nieużywane 30 dni wylogowane', async () => {
  const b = (await api('/bilet', {}, tB)).j.b;
  const ac = new AbortController();
  const r = await fetch(`${baza}/na-zywo?b=${b}`, { signal: ac.signal });
  assert.equal(r.status, 200); ac.abort();
  assert.equal((await fetch(`${baza}/na-zywo?b=${b}`)).status, 401, 'bilet jednorazowy');
  const t = (await api('/logowanie', { method: 'POST', body: JSON.stringify({ login: 'anna', haslo: 'haslo456', urzadzenie: 'Stary laptop' }) })).j.token;
  S.db.prepare("UPDATE urzadzenia SET ostatnio = ? WHERE nazwa = 'Stary laptop'").run(Date.now() - 31 * 86400e3);
  assert.equal((await api('/ja', {}, t)).kod, 401);
  assert.ok(!S.db.prepare("SELECT 1 FROM urzadzenia WHERE nazwa = 'Stary laptop'").get());
});
await test('dziennik dostępu: wpisy z aplikacji i otwarcia dokumentów', async () => {
  await api('/dziennik', { method: 'POST', body: JSON.stringify({ wpisy: [{ oid: 'oferta010', k: 'wlasciciel', co: 'wlasciciel' }, { oid: '../zle', co: 'klient' }, { oid: 'oferta010', co: 'cokolwiek' }] }) }, tB);
  const dz = (await api('/dziennik', {}, tB)).j.dziennik;
  assert.ok(dz.some((x) => x.co === 'wlasciciel' && x.kto === 'Anna Wspólnik'));
  assert.ok(dz.some((x) => x.co === 'dokument' && x.oferta === 'oferta010'), 'otwarcie dokumentu zapisane');
  assert.ok(!dz.some((x) => x.co === 'cokolwiek' || x.oferta === '../zle'));
});
await test('AML: karta zostaje 5 lat po usunięciu oferty (archiwum), potem znika; nie da się jej usunąć na żądanie', async () => {
  const zm = (cid, pola, extra = {}) => api('/zmiany', { method: 'POST', body: JSON.stringify({ zmiany: [{ oid: 'oferta020', cid, pola, ...extra }] }) }, tB);
  await zm('a1', { roboczy: 'AML test', ulica: 'Lipowa 7', miasto: 'Lublin', wlImie: 'Jan Właściciel', am_strona001: { imie: 'Jan Właściciel', pesel: '80010112345', dokNr: 'ABC123456', ryzyko: 'standardowe', podejrzenie: 'notatka tajna' }, kl_kup00001: { imie: 'Kupiec' } });
  let r = await api('/osoba?oferta=oferta020&k=am_strona001', { method: 'DELETE' }, tB);
  assert.equal(r.kod, 409, 'karty AML nie usuwa się na żądanie');
  r = await api('/osoba?oferta=oferta020&k=am_strona001', {}, tB);
  assert.equal(r.j.dane.pesel, '80010112345'); assert.equal(r.j.dane.ryzyko, undefined); assert.equal(r.j.dane.podejrzenie, undefined, 'bez tajemnicy AML');
  r = await api('/osoba?oferta=oferta020&k=wlasciciel', {}, tB);
  assert.equal(r.j.dane.wlImie, 'Jan Właściciel'); assert.ok(r.j.historia.length >= 1);
  // usunięta oferta po 30 dniach: zostaje tylko karta AML i adres
  await api('/zmiany', { method: 'POST', body: JSON.stringify({ zmiany: [{ oid: 'oferta020', cid: 'a2', usun: true }] }) }, tB);
  S.db.prepare("UPDATE oferty SET zmieniona = ? WHERE id = 'oferta020'").run(Date.now() - 31 * 86400e3);
  S.retencja();
  const o = S.db.prepare("SELECT * FROM oferty WHERE id = 'oferta020'").get();
  assert.ok(o, 'oferta z kartą AML nie znika');
  const d = JSON.parse(S.odszyfruj(o.dane));
  assert.ok(d.am_strona001 && d.am_strona001.zakonczenie, 'zakończenie współpracy = dzień usunięcia oferty');
  assert.equal(d.wlImie, undefined); assert.equal(d.kl_kup00001, undefined, 'reszta danych osobowych usunięta');
  assert.ok(!S.db.prepare("SELECT 1 FROM historia WHERE oferta = 'oferta020' AND pole = 'wlImie'").get());
  const arch = (await api('/aml/archiwum', {}, tB)).j.archiwum;
  const a = arch.find((x) => x.oid === 'oferta020');
  assert.ok(a && a.karty.am_strona001.pesel === '80010112345' && a.adres.includes('Lipowa'));
  assert.ok((await api('/dziennik', {}, tB)).j.dziennik.some((x) => x.co === 'archiwum'));
  // po 5 latach od zakończenia — karta i oferta znikają całkiem
  const stara = { ...d, am_strona001: { ...d.am_strona001, zakonczenie: '2019-01-01' } };
  S.db.prepare("UPDATE oferty SET dane = ? WHERE id = 'oferta020'").run(S.szyfruj(JSON.stringify(stara)));
  S.retencja(); S.retencja();
  assert.equal(S.db.prepare("SELECT COUNT(*) AS n FROM oferty WHERE id = 'oferta020'").get().n, 0);
});
await test('okresy przechowywania: zakończona oferta z umową do końca 6. roku, bez umowy 12 mies.; prezentacje 12 mies.', async () => {
  const zm = (oid, cid, pola) => api('/zmiany', { method: 'POST', body: JSON.stringify({ zmiany: [{ oid, cid, pola }] }) }, tB);
  await zm('oferta021', 'b1', { roboczy: 'Z umową', umowaNr: '1/2026', wlImie: 'A', status: 'zakonczona', wz_wiz00001: { kiedy: '2020-01-01T10:00' } });
  await zm('oferta022', 'b2', { roboczy: 'Bez umowy', wlImie: 'B', status: 'zakonczona' });
  const rok = Date.now() - 366 * 86400e3;
  S.db.prepare("UPDATE historia SET kiedy = ? WHERE oferta IN ('oferta021', 'oferta022')").run(rok);
  const w = S.doUsuniecia();
  assert.ok(w.some((x) => x.oid === 'oferta022' && x.k === 'oferta'), 'bez umowy po roku');
  assert.ok(!w.some((x) => x.oid === 'oferta021' && x.k === 'oferta'), 'z umową jeszcze nie');
  assert.ok(w.some((x) => x.oid === 'oferta021' && x.k === 'wz_wiz00001'), 'prezentacja po roku');
  const t021 = S.terminOferty(S.db.prepare("SELECT * FROM oferty WHERE id = 'oferta021'").get(), { status: 'zakonczona', umowaNr: '1/2026' });
  assert.equal(new Date(t021).getUTCFullYear(), new Date(rok).getUTCFullYear() + 6); assert.equal(new Date(t021).getUTCMonth(), 11);
  S.retencja();
  assert.equal(S.db.prepare("SELECT usunieta FROM oferty WHERE id = 'oferta022'").get().usunieta, 1, 'oferta bez umowy usunięta (kosz)');
  assert.equal(S.db.prepare("SELECT usunieta FROM oferty WHERE id = 'oferta021'").get().usunieta, 0);
});
await test('dane firmy (do klauzuli RODO) i zdalne wylogowanie urządzenia', async () => {
  tA = (await api('/logowanie', { method: 'POST', body: JSON.stringify({ login: 'marek', haslo: 'nowehaslo1', urzadzenie: 'Telefon Marka' }) })).j.token;
  let r = await api('/firma', { method: 'POST', body: JSON.stringify({ firma: { nazwaSc: 'AM Nieruchomości s.c.', email: 'biuro@x.pl', 'zły klucz': 'x' } }) }, tB);
  assert.equal(r.kod, 200);
  r = await api('/firma', {}, tA);
  assert.equal(r.j.firma.nazwaSc, 'AM Nieruchomości s.c.'); assert.equal(r.j.firma['zły klucz'], undefined);
  assert.ok(!S.db.prepare("SELECT wartosc FROM ustawienia WHERE klucz = 'firma'").get().wartosc.includes('biuro@x.pl'), 'zaszyfrowane');
  const L = (await api('/urzadzenia', {}, tB)).j.urzadzenia;
  const a = L.find((x) => !x.moje);
  assert.ok(a && L.some((x) => x.to));
  assert.equal((await api(`/urzadzenie/${L.find((x) => x.to).id}`, { method: 'DELETE' }, tB)).kod, 400, 'siebie nie');
  assert.equal((await api(`/urzadzenie/${a.id}`, { method: 'DELETE' }, tB)).kod, 200);
  assert.equal((await api('/ja', {}, tA)).kod, 401, 'wylogowane zdalnie');
  tA = (await api('/logowanie', { method: 'POST', body: JSON.stringify({ login: 'marek', haslo: 'nowehaslo1', urzadzenie: 'Telefon Marka' }) })).j.token;
});
await test('kopia bazy', async () => {
  S.kopia();
  assert.ok(fs.readdirSync(path.join(katalog, 'kopie')).some((f) => f.endsWith('.db')));
});
srv.close(); srv.closeAllConnections?.();
console.log(`\nSerwer: ${ok} testów OK`);
process.exit(0);
