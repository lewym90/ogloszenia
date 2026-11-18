// Testy modelu: node test/model.test.mjs
import assert from 'node:assert/strict';
import * as M from '../js/model.js';

const o = {
  ...M.nowaOferta('t1'), transakcja: 'sprzedaz', rodzaj: 'mieszkanie', cena: 489000, pow: 52.4, pokoje: 3, nieprzechodnie: true,
  pietro: 3, pieter: 4, winda: 'nie', rok: 1978, material: 'blok', technologia: 'wielka_plyta', stan: 'odswiezenie', ogrzewanie: 'miejskie',
  okna: 'plastikowe', ekspozycja: 'wschód i zachód', balkon: 'balkon', balkonPow: 3.2, piwnica: 'piwnica', parking: 'ulica',
  wlasnosc: 'spoldzielcze', czynsz: 640, czynszObejmuje: 'zaliczki na wodę, ogrzewanie i fundusz remontowy', media: 180,
  dzielnica: 'Czuby Północne', ulica: 'Wileńska', pokazUlice: true, prowizjaKl: 'brak', dostepneOd: '2027-04-01',
  zr: { pow: 'pom', rok: 'dok', czynsz: 'dok', media: 'wl', wlasnosc: 'dok' },
  pom: [{ id: 'p1', typ: 'Pokój', nazwa: 'Pokój dzienny', m: 17.8, opis: 'wyjście na balkon, okno na zachód' }, { id: 'p2', nazwa: 'Sypialnia', m: 11.2 },
    { id: 'p3', nazwa: 'Pokój', m: 8.9 }, { id: 'p4', nazwa: 'Kuchnia', m: 6.1, opis: 'z oknem' }, { id: 'p5', nazwa: 'Łazienka z WC', m: 3.4, opis: 'remont w 2021' }, { id: 'p6', nazwa: 'Przedpokój', m: 5 }],
  atuty: [{ t: 'okna wymienione w 2019' }, { t: 'piony wodne wymienione przez spółdzielnię w 2023' }],
  minusy: [{ t: 'brak windy — 3. piętro' }, { t: 'od strony wschodniej ruchliwa ulica, okna w sypialni wychodzą na podwórze' }],
  okolica: [{ nazwa: 'przystanek MPK', min: 3, jak: 'pieszo' }, { nazwa: 'szkoła podstawowa nr 51', min: 7 }, { nazwa: 'Zalew Zemborzycki', min: 10, jak: 'rower' }],
  weryf: { kw: { ok: true, d: '2027-03-02' }, oplaty: { ok: true, d: '2027-03-05' } },
  swiad: 'tak', eu: 98.4, ek: 120.1, ep: 145.7, oze: 0, co2: 0.0412,
};
let ok = 0;
const test = (n, f) => { f(); ok++; console.log('✔', n); };

test('tytuł', () => {
  assert.equal(M.tytul(o), '3 pokoje, 52,4 m², Czuby Północne — pokoje nieprzechodnie, balkon');
  assert.equal(M.tytul({ ...o, tytul: 'Własny tytuł' }), 'Własny tytuł');
  assert.equal(M.pokojeSlowo(1), 'pokój'); assert.equal(M.pokojeSlowo(5), 'pokoi'); assert.equal(M.pokojeSlowo(22), 'pokoje'); assert.equal(M.pokojeSlowo(12), 'pokoi');
});
test('liczby po polsku', () => {
  assert.equal(M.zl(489000), '489 000 zł');
  assert.equal(M.parsujLiczbe('52,4'), 52.4); assert.equal(M.parsujLiczbe('489 000 zł'), 489000); assert.equal(M.parsujLiczbe(''), null);
});
test('opis zawiera fakty, koszty, minusy, weryfikację i świadectwo', () => {
  const t = M.opis(o, { agent: { nazwa: 'Marek Lewandowski', telefon: '600 100 200' } });
  console.log('\n----- OPIS -----\n' + t + '\n----- KONIEC -----\n');
  assert.match(t, /Na sprzedaż mieszkanie 3-pokojowe o powierzchni 52,4/);
  assert.match(t, /ul\. Wileńska, Czuby Północne, Lublin/);
  assert.match(t, /Piętro: 3 z 4, bez windy/);
  assert.match(t, /Media: średnio ok\. 180 zł\/mies\. \(wg właściciela\)/);
  assert.match(t, /Kupujący nie płaci prowizji/);
  assert.match(t, /CO WARTO WIEDZIEĆ\n– Brak windy/);
  assert.match(t, /SPRAWDZILIŚMY\n– Księga wieczysta: właściciel, hipoteki, roszczenia — 02\.03\.2027/);
  assert.match(t, /EP 145,7 kWh/);
  assert.match(t, /Cena za m²: 9 332 zł/);
  assert.doesNotMatch(t, /undefined|NaN|null/);
});
test('krótka wersja i pola portalu', () => {
  const k = M.krotki(o, { agent: { nazwa: 'Marek', telefon: '600' } });
  console.log('----- KRÓTKA -----\n' + k + '\n');
  assert.match(k, /^NA SPRZEDAŻ \| 3 pokoje/);
  const p = M.polaPortalu(o);
  assert.ok(p.find((x) => x.e === 'Cena (zł)').v === '489000');
  assert.ok(p.find((x) => x.e === 'Powierzchnia (m²)').v === '52,4');
  assert.ok(p.some((x) => x.e.startsWith('EP')));
});
test('najem: inne sekcje', () => {
  const n = { ...o, transakcja: 'najem', cena: 2400, kaucja: 4800, umeblowanie: 'tak', zwierzeta: 'uzgodnienie', minOkres: 12, umowaNajmu: 'okazjonalny' };
  const t = M.opis(n, {});
  assert.match(t, /Do wynajęcia mieszkanie 3-pokojowe/);
  assert.match(t, /Najem: 2 400 zł miesięcznie/);
  assert.match(t, /Kaucja: 4 800 zł/);
  assert.match(t, /Najemca nie płaci prowizji/);
  assert.doesNotMatch(t, /Cena za m²/);
});
test('prowizja równa czynszowi przelicza się z ceną', () => {
  const n = { ...o, transakcja: 'najem', cena: 3500, kaucja: 7000, prowizjaKl: 'tak', prowizjaKlCzynsz: true };
  assert.match(M.opis(n), /Prowizja od najemcy: 3\u00a0500\u00a0zł \(równowartość miesięcznego czynszu najmu, bez opłat administracyjnych\)/);
  assert.match(M.opis({ ...n, cena: 3800 }), /Prowizja od najemcy: 3\u00a0800\u00a0zł/);
  assert.match(M.krotki(n), /Prowizja od najemcy: 3\u00a0500/);
  assert.ok(M.checklista(n).find((x) => x.id === 'prowizja').ok);
  assert.equal(M.checklista({ ...n, cena: undefined }).find((x) => x.id === 'prowizja').ok, false);
  const pole = (k) => M.SEKCJE.flatMap((s) => s.pola).find((p) => p.k === k);
  assert.equal(M.poleWidoczne(pole('prowizjaKlTekst'), n), false, 'ręczne pole chowa się przy czynszu');
  assert.equal(M.poleWidoczne(pole('prowizjaKlCzynsz'), { ...n, transakcja: 'sprzedaz' }), false, 'przy sprzedaży nie ma czynszu');
  assert.match(M.opis({ ...n, transakcja: 'sprzedaz', prowizjaKlTekst: '2% ceny' }), /Prowizja od kupującego: 2% ceny/);
});
test('brak informacji nie trafia do ogłoszenia, wymiary liczą metraż', () => {
  const n = { ...o, technologia: 'nieznane', ogrzewanie: 'nieznane', okna: 'nieznane', material: 'blok', rok: undefined, rokNieznany: true,
    pom: [{ id: 'p1', nazwa: 'Salon', a: 4.2, b: 4.24, m: M.metrazZWymiarow(4.2, 4.24) }] };
  const t = M.opis(n);
  assert.doesNotMatch(t, /Brak informacji|nieznane/);
  assert.match(t, /Budynek: blok\n/);
  assert.doesNotMatch(t, /Ogrzewanie:|Okna:/);
  assert.match(t, /Salon: 17,81\u00a0m² \(4,2 × 4,24 m\)/);
  assert.ok(!M.polaPortalu(n).some((p) => /Brak informacji/.test(p.v)));
  assert.equal(M.metrazZWymiarow(3, 0), null); assert.equal(M.metrazZWymiarow('2.5', 4), 10);
  assert.ok(M.checklista(n).find((x) => x.id === 'rok').ok, 'nie wiem = punkt zaliczony');
});
test('kontrola słów', () => {
  assert.equal(M.kontrolaSlow(o).length, 0);
  const z = M.kontrolaSlow({ ...o, lead: 'Prawdziwa PEREŁKA! Okazja, nie przegap', atuty: [{ t: 'idealne dla rodziny' }] });
  const frazy = z.map((x) => x.fraza.toLowerCase());
  for (const f of ['perełk', '!', 'okazj', 'nie przegap', 'idealn']) assert.ok(frazy.some((x) => x.includes(f)), f);
});
test('checklista blokuje braki', () => {
  let g = M.gotowosc(o);
  assert.equal(g.wszystkieTwarde, false);
  const ids = g.braki.map((b) => b.id);
  assert.ok(ids.includes('zdjIlosc') && ids.includes('rzut') && ids.includes('glowne') && ids.includes('zdjPom'));
  const zdj = [];
  o.pom.forEach((p, i) => { zdj.push({ id: `z${i}a`, pom: p.id }); zdj.push({ id: `z${i}b`, pom: p.id }); });
  zdj.push({ id: 'rz', pom: 'rzut' }); zdj[0].glowne = true;
  g = M.gotowosc({ ...o, zdj });
  assert.equal(g.wszystkieTwarde, true, JSON.stringify(g.braki));
  // wizualizacja bez oryginału blokuje, jako główne też
  g = M.gotowosc({ ...o, zdj: [...zdj, { id: 'w1', pom: 'p1', wiz: true }] });
  assert.ok(g.braki.some((b) => b.id === 'wiz'));
  // świadectwo „tak” bez wskaźników blokuje
  g = M.gotowosc({ ...o, zdj, ep: undefined });
  assert.ok(g.braki.some((b) => b.id === 'swiadPola'));
  // pusty slogan blokuje
  g = M.gotowosc({ ...o, zdj, lead: 'Wyjątkowe mieszkanie!' });
  assert.ok(g.braki.some((b) => b.id === 'slowa'));
});
test('pola zależne od rodzaju i transakcji', () => {
  const pole = (k) => M.SEKCJE.flatMap((s) => s.pola).find((p) => p.k === k);
  assert.equal(M.poleWidoczne(pole('kaucja'), { transakcja: 'sprzedaz' }), false);
  assert.equal(M.poleWidoczne(pole('kaucja'), { transakcja: 'najem' }), true);
  assert.equal(M.poleWidoczne(pole('dzialkaPow'), { rodzaj: 'mieszkanie' }), false);
  assert.equal(M.poleWidoczne(pole('eu'), { swiad: 'nie' }), false);
});
test('wyposażenie w ogłoszeniu i polach portalu', () => {
  const n = { ...M.nowaOferta('w1'), transakcja: 'najem', wyp: { lodowka: true, pralka: true }, wypInne: [{ t: 'Robot sprzątający' }] };
  const t = M.opis(n);
  assert.match(t, /WYPOSAŻENIE\n– Kuchnia: lodówka\n– Łazienka i pranie: pralka\n– Inne: robot sprzątający/);
  assert.ok(M.polaPortalu(n).some((x) => x.v === 'Lodówka, Pralka, Robot sprzątający'));
  assert.match(M.opis({ ...n, transakcja: 'sprzedaz' }), /W CENIE ZOSTAJE/);
  assert.ok(M.kontrolaSlow({ ...n, wypUwagi: 'Idealne meble!' }).length >= 2, 'uwagi do wyposażenia przechodzą kontrolę słów');
});
test('klienci, prezentacje i dokumenty nie trafiają do ogłoszenia', () => {
  const n = { ...o, kl_a1: { imie: 'Jan Tajny', tel: '600999888', t: 2 }, kl_b2: { imie: 'Ewa', status: 'rezygnacja', t: 3 },
    wz_x1: { kiedy: '2026-11-25T10:00' }, wz_x2: { kiedy: '2026-11-21T17:30' }, wz_x3: { kiedy: '2026-11-01T12:00', status: 'odbyla' },
    dk_kw: { s: 'jest', pliki: [{ id: 'p1', nazwa: 'kw.pdf' }] }, dk_q1: { nazwa: 'Regulamin wspólnoty', t: 1 } };
  const t = M.opis(n) + M.krotki(n) + JSON.stringify(M.polaPortalu(n));
  assert.ok(!/Jan Tajny|600999888|Regulamin|kw\.pdf/.test(t));
  assert.deepEqual(M.klienci(n).map((x) => x._k), ['kl_a1', 'kl_b2'], 'rezygnacje na końcu');
  const w = M.wizyty(n);
  assert.deepEqual(w.nad.map((x) => x._k), ['wz_x2', 'wz_x1']); assert.deepEqual(w.po.map((x) => x._k), ['wz_x3']);
  const d = M.dokumenty(n);
  assert.ok(d.find((x) => x._k === 'dk_kw').s === 'jest' && d.some((x) => x.n === 'Regulamin wspólnoty' && !x.std));
  assert.ok(M.dokumentyWymagane({ transakcja: 'najem', rodzaj: 'mieszkanie', umowaNajmu: 'okazjonalny' }).some((x) => x.k === 'egzekucja'));
  assert.ok(M.dokumentyWymagane({ transakcja: 'sprzedaz', rodzaj: 'dom' }).some((x) => x.k === 'wypis'));
  assert.ok(!M.dokumentyWymagane({ transakcja: 'sprzedaz', rodzaj: 'mieszkanie' }).some((x) => x.k === 'wypis'));
});
console.log(`\nModel: ${ok} testów OK`);
