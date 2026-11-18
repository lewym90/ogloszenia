// AM Oferty — model karty nieruchomości: pola, generator ogłoszenia (bez AI), kontrola słów, checklista.
// Czyste funkcje, działają w przeglądarce i w Node (testy).

export const TRANSAKCJE = { sprzedaz: 'Sprzedaż', najem: 'Wynajem' };
export const RODZAJE = { mieszkanie: 'Mieszkanie', dom: 'Dom', lokal: 'Lokal użytkowy', dzialka: 'Działka', pokoj: 'Pokój', garaz: 'Garaż / miejsce postojowe' };
export const STATUSY = {
  przygotowanie: 'W przygotowaniu', gotowa: 'Gotowa do publikacji', opublikowana: 'Opublikowana',
  rezerwacja: 'Rezerwacja', zakonczona: 'Zakończona',
};
export const ZRODLA = { dok: 'Dokument', pom: 'Pomiar', ogl: 'Oględziny', wl: 'Wg właściciela' };
export const DZIELNICE_LUBLIN = ['Abramowice', 'Bronowice', 'Czechów Południowy', 'Czechów Północny', 'Czuby Południowe', 'Czuby Północne',
  'Dziesiąta', 'Felin', 'Głusk', 'Hajdów-Zadębie', 'Kalinowszczyzna', 'Konstantynów', 'Kośminek', 'Ponikwoda', 'Rury', 'Sławin', 'Sławinek',
  'Stare Miasto', 'Szerokie', 'Śródmieście', 'Tatary', 'Węglin Południowy', 'Węglin Północny', 'Wieniawa', 'Wrotków', 'Za Cukrownią', 'Zemborzyce'];
export const TYPY_POM = ['Salon', 'Salon z aneksem kuchennym', 'Kuchnia', 'Aneks kuchenny', 'Sypialnia', 'Pokój', 'Pokój dziecięcy', 'Gabinet',
  'Łazienka', 'Łazienka z WC', 'WC', 'Przedpokój', 'Garderoba', 'Spiżarnia', 'Pralnia', 'Kotłownia', 'Strych', 'Sala sprzedaży', 'Zaplecze', 'Biuro'];
export const MIEJSCA_ZDJEC = { rzut: 'Rzut', budynek: 'Budynek i wejście', klatka: 'Klatka schodowa', balkon: 'Balkon / taras', widok: 'Widok z okna',
  okolica: 'Okolica', parking: 'Parking / garaż', dzialka: 'Działka / ogród', inne: 'Inne' };
export const WERYFIKACJA = [
  { k: 'kw', t: 'Księga wieczysta sprawdzona (właściciel, hipoteki, roszczenia)', og: 'Księga wieczysta: właściciel, hipoteki, roszczenia', dla: 'sprzedaz' },
  { k: 'kwN', t: 'Właściciel potwierdzony w księdze wieczystej', og: 'Właściciel zgodny z księgą wieczystą', dla: 'najem' },
  { k: 'oplaty', t: 'Zaświadczenie o braku zaległości w opłatach', og: 'Brak zaległości w opłatach (zaświadczenie)' },
  { k: 'meldunek', t: 'Brak osób zameldowanych', og: 'Brak osób zameldowanych', dla: 'sprzedaz' },
  { k: 'mpzp', t: 'Plan miejscowy / warunki zabudowy sprawdzone', og: 'Plan miejscowy / warunki zabudowy' },
  { k: 'pomiar', t: 'Powierzchnia sprawdzona pomiarem', og: 'Powierzchnia zmierzona na miejscu' },
  { k: 'stan', t: 'Stan techniczny obejrzany na miejscu', og: 'Stan techniczny obejrzany na miejscu' },
  { k: 'swiad', t: 'Świadectwo charakterystyki energetycznej sprawdzone', og: 'Świadectwo charakterystyki energetycznej' },
];

// ---------- pola karty ----------
// t: tekst, n: liczba, w: wybór, b: tak/nie, d: data
const WSZ = ['mieszkanie', 'dom', 'lokal', 'dzialka', 'pokoj', 'garaz'];
const BUD = ['mieszkanie', 'dom', 'lokal', 'pokoj'];
export const SEKCJE = [
  { id: 'podstawy', tytul: 'Podstawy', pola: [
    { k: 'roboczy', e: 'Nazwa robocza', t: 't', pl: 'tylko dla nas, np. Narutowicza 12/4' },
    { k: 'transakcja', e: 'Transakcja', t: 'w', o: TRANSAKCJE },
    { k: 'rodzaj', e: 'Rodzaj', t: 'w', o: RODZAJE },
    { k: 'cena', e: 'Cena', t: 'n', j: 'zł', jNajem: 'zł / mies.' },
    { k: 'cenaNeg', e: 'Cena do negocjacji', t: 'b' },
    { k: 'prowizjaKl', e: 'Prowizja od kupującego / najemcy', t: 'w', o: { brak: 'Brak (płaci właściciel)', tak: 'Tak' } },
    { k: 'prowizjaKlCzynsz', e: 'Prowizja równa miesięcznemu czynszowi (bez opłat administracyjnych)', t: 'b', gdy: (o) => o.prowizjaKl === 'tak' && o.transakcja === 'najem',
      info: (o) => (o.prowizjaKlCzynsz ? (o.cena ? `Teraz: ${zl(o.cena)}. Zmieni się sama, gdy zmienisz cenę najmu.` : 'Wpisz cenę najmu — prowizja przeliczy się sama.') : '') },
    { k: 'prowizjaKlTekst', e: 'Wysokość prowizji od kupującego / najemcy', t: 't', gdy: (o) => o.prowizjaKl === 'tak' && !(o.transakcja === 'najem' && o.prowizjaKlCzynsz), pl: 'np. 2% ceny' },
  ] },
  { id: 'lokalizacja', tytul: 'Lokalizacja', pola: [
    { k: 'miasto', e: 'Miejscowość', t: 't', pl: 'Lublin' },
    { k: 'dzielnica', e: 'Dzielnica / osiedle', t: 't', lista: 'dzielnice' },
    { k: 'ulica', e: 'Ulica', t: 't', pl: 'bez numeru' },
    { k: 'pokazUlice', e: 'Pokazuj ulicę w ogłoszeniu', t: 'b' },
  ] },
  { id: 'lokal', tytul: 'Nieruchomość', pola: [
    { k: 'pow', e: 'Powierzchnia', t: 'n', j: 'm²', zr: true },
    { k: 'dzialkaPow', e: 'Powierzchnia działki', t: 'n', j: 'm²', zr: true, dla: ['dom', 'dzialka'] },
    { k: 'pokoje', e: 'Liczba pokoi', t: 'n', dla: ['mieszkanie', 'dom', 'lokal'] },
    { k: 'nieprzechodnie', e: 'Wszystkie pokoje nieprzechodnie', t: 'b', dla: ['mieszkanie', 'dom'] },
    { k: 'pietro', e: 'Piętro (0 = parter)', t: 'n', dla: ['mieszkanie', 'lokal', 'pokoj'] },
    { k: 'pieter', e: 'Liczba pięter w budynku', t: 'n', dla: ['mieszkanie', 'lokal', 'pokoj', 'dom'] },
    { k: 'winda', e: 'Winda', t: 'w', o: { tak: 'Jest', nie: 'Brak' }, dla: ['mieszkanie', 'lokal', 'pokoj'] },
    { k: 'rok', e: 'Rok budowy', t: 'n', zr: true, nieWiem: 'rokNieznany', dla: ['mieszkanie', 'dom', 'lokal', 'pokoj', 'garaz'] },
    { k: 'material', e: 'Budynek', t: 'w', o: { blok: 'Blok', kamienica: 'Kamienica', apartamentowiec: 'Apartamentowiec', szeregowiec: 'Szeregowiec', blizniak: 'Bliźniak', wolnostojacy: 'Wolnostojący', biurowiec: 'Budynek usługowy / biurowy', nieznane: 'Brak informacji' }, dla: BUD },
    { k: 'technologia', e: 'Technologia', t: 'w', o: { cegla: 'Cegła', wielka_plyta: 'Wielka płyta', zelbet: 'Żelbet / monolit', pustak: 'Pustak / bloczek', drewno: 'Drewno', inna: 'Inna', nieznane: 'Brak informacji' }, dla: BUD },
    { k: 'stan', e: 'Stan', t: 'w', o: { gotowy: 'Do zamieszkania', odswiezenie: 'Do odświeżenia', remont: 'Do remontu', wykonczenie: 'Do wykończenia (stan deweloperski)' }, dla: BUD },
    { k: 'ogrzewanie', e: 'Ogrzewanie', t: 'w', o: { miejskie: 'Miejskie', gazowe: 'Gazowe', elektryczne: 'Elektryczne', pompa: 'Pompa ciepła', kominek: 'Kominek', piec: 'Piec / kocioł', inne: 'Inne', nieznane: 'Brak informacji' }, dla: BUD, zr: true },
    { k: 'okna', e: 'Okna', t: 'w', o: { plastikowe: 'Plastikowe', drewniane: 'Drewniane', aluminiowe: 'Aluminiowe', nieznane: 'Brak informacji' }, dla: BUD },
    { k: 'ekspozycja', e: 'Strony świata okien', t: 't', pl: 'np. wschód, zachód', dla: BUD },
    { k: 'balkon', e: 'Balkon / taras / ogródek', t: 'w', o: { brak: 'Brak', balkon: 'Balkon', loggia: 'Loggia', taras: 'Taras', ogrodek: 'Ogródek' }, dla: BUD },
    { k: 'balkonPow', e: 'Powierzchnia balkonu / tarasu / ogródka', t: 'n', j: 'm²', gdy: (o) => o.balkon && o.balkon !== 'brak', dla: BUD },
    { k: 'piwnica', e: 'Piwnica / komórka', t: 'w', o: { brak: 'Brak', piwnica: 'Piwnica', komorka: 'Komórka lokatorska' }, dla: ['mieszkanie', 'pokoj'] },
    { k: 'parking', e: 'Miejsce parkingowe', t: 'w', o: { brak: 'Brak przypisanego', podziemny: 'W garażu podziemnym', naziemny: 'Naziemne przypisane', garaz: 'Garaż', ulica: 'Parking ogólnodostępny' }, dla: WSZ },
    { k: 'parkingCena', e: 'Dopłata za parking (0 = w cenie)', t: 'n', j: 'zł', gdy: (o) => ['podziemny', 'naziemny', 'garaz'].includes(o.parking) },
    { k: 'wlasnosc', e: 'Forma własności', t: 'w', o: { pelna: 'Pełna własność', spoldzielcze: 'Spółdzielcze własnościowe prawo', uzytkowanie: 'Użytkowanie wieczyste' }, zr: true, tylko: 'sprzedaz' },
    { k: 'umeblowanie', e: 'Umeblowanie', t: 'w', o: { tak: 'Umeblowane', czesciowo: 'Częściowo', nie: 'Nieumeblowane' }, tylko: 'najem', dla: BUD },
  ] },
  { id: 'koszty', tytul: 'Koszty i najem', pola: [
    { k: 'czynsz', e: 'Czynsz administracyjny', t: 'n', j: 'zł / mies.', zr: true, dla: ['mieszkanie', 'lokal', 'pokoj', 'garaz'] },
    { k: 'czynszObejmuje', e: 'Czynsz obejmuje', t: 't', pl: 'np. zaliczki na wodę, ogrzewanie, fundusz remontowy', dla: ['mieszkanie', 'lokal', 'pokoj', 'garaz'] },
    { k: 'media', e: 'Media średnio (prąd, gaz, internet)', t: 'n', j: 'zł / mies.', zr: true, dla: BUD },
    { k: 'kaucja', e: 'Kaucja', t: 'n', j: 'zł', tylko: 'najem' },
    { k: 'dostepneOd', e: 'Dostępne od', t: 'd' },
    { k: 'minOkres', e: 'Minimalny okres najmu', t: 'n', j: 'mies.', tylko: 'najem' },
    { k: 'zwierzeta', e: 'Zwierzęta', t: 'w', o: { tak: 'Akceptowane', nie: 'Nie', uzgodnienie: 'Do uzgodnienia' }, tylko: 'najem', dla: BUD },
    { k: 'umowaNajmu', e: 'Rodzaj umowy', t: 'w', o: { okazjonalny: 'Najem okazjonalny', zwykly: 'Zwykła umowa najmu', instytucjonalny: 'Najem instytucjonalny' }, tylko: 'najem' },
  ] },
  { id: 'energia', tytul: 'Świadectwo energetyczne', pola: [
    { k: 'swiad', e: 'Czy świadectwo jest sporządzone?', t: 'w', o: { tak: 'Tak', nie: 'Nie, w przygotowaniu' } },
    { k: 'eu', e: 'EU — energia użytkowa', t: 'n', j: 'kWh/(m²·rok)', gdy: (o) => o.swiad === 'tak' },
    { k: 'ek', e: 'EK — energia końcowa', t: 'n', j: 'kWh/(m²·rok)', gdy: (o) => o.swiad === 'tak' },
    { k: 'ep', e: 'EP — nieodnawialna energia pierwotna', t: 'n', j: 'kWh/(m²·rok)', gdy: (o) => o.swiad === 'tak' },
    { k: 'oze', e: 'Udział odnawialnych źródeł energii', t: 'n', j: '%', gdy: (o) => o.swiad === 'tak' },
    { k: 'co2', e: 'Jednostkowa emisja CO₂', t: 'n', j: 't CO₂/(m²·rok)', gdy: (o) => o.swiad === 'tak' },
    { k: 'swiadNr', e: 'Numer świadectwa (tylko dla nas)', t: 't', gdy: (o) => o.swiad === 'tak' },
    { k: 'swiadDo', e: 'Ważne do', t: 'd', gdy: (o) => o.swiad === 'tak' },
  ] },
  { id: 'wlasciciel', tytul: 'Właściciel i umowa (nie trafia do ogłoszenia)', prywatne: true, pola: [
    { k: 'wlImie', e: 'Imię i nazwisko', t: 't' },
    { k: 'wlTel', e: 'Telefon', t: 't', typ: 'tel' },
    { k: 'wlEmail', e: 'E-mail', t: 't', typ: 'email' },
    { k: 'umowaNr', e: 'Umowa pośrednictwa — numer', t: 't' },
    { k: 'umowaData', e: 'Data umowy', t: 'd' },
    { k: 'umowaDo', e: 'Umowa ważna do', t: 'd' },
    { k: 'wylacznosc', e: 'Na wyłączność', t: 'b' },
    { k: 'prowizjaWl', e: 'Wynagrodzenie od właściciela', t: 't', pl: 'np. 2,5% + VAT' },
    { k: 'notatki', e: 'Notatki', t: 't', dlugi: true },
  ] },
];

export function poleWidoczne(p, o) {
  if (p.dla && o.rodzaj && !p.dla.includes(o.rodzaj)) return false;
  if (p.tylko && o.transakcja && p.tylko !== o.transakcja) return false;
  if (p.gdy && !p.gdy(o)) return false;
  return true;
}

// ---------- formatowanie ----------
const nbsp = ' ';
export function liczba(v, miejsca = 2) {
  if (v === null || v === undefined || v === '' || isNaN(Number(v))) return '';
  const n = Number(v);
  const s = n.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: miejsca, useGrouping: true });
  return s.replace(/\s/g, nbsp);
}
export const zl = (v) => `${liczba(Math.round(Number(v)), 0)}${nbsp}zł`;
export const m2 = (v) => `${liczba(v)}${nbsp}m²`;
export function parsujLiczbe(s) {
  if (typeof s === 'number') return s;
  const t = String(s || '').replace(/\s| /g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
  if (t === '' || t === '-' || t === '.') return null;
  const n = Number(t);
  return isFinite(n) ? n : null;
}
export function pokojeSlowo(n) {
  n = Number(n);
  if (n === 1) return 'pokój';
  const r10 = n % 10, r100 = n % 100;
  return r10 >= 2 && r10 <= 4 && (r100 < 12 || r100 > 14) ? 'pokoje' : 'pokoi';
}
export function pietroTekst(o) {
  if (o.pietro === undefined || o.pietro === null || o.pietro === '') return '';
  const p = Number(o.pietro);
  const baza = p === 0 ? 'parter' : p < 0 ? 'suterena' : `${p}.${nbsp}piętro`;
  return o.pieter ? `${baza} z${nbsp}${o.pieter}` : baza;
}
export function data(d) {
  if (!d) return '';
  const [r, m, dz] = String(d).split('-');
  return r && m && dz ? `${dz}.${m}.${r}` : String(d);
}
// wysokość prowizji od kupującego / najemcy: z czynszu (liczona na bieżąco) albo wpisana ręcznie
export function prowizjaKlienta(o) {
  if (o.prowizjaKl !== 'tak') return '';
  if (o.transakcja === 'najem' && o.prowizjaKlCzynsz) return o.cena ? `${zl(o.cena)} (równowartość miesięcznego czynszu najmu, bez opłat administracyjnych)` : '';
  return String(o.prowizjaKlTekst || '').trim();
}
const wg = (o, k) => (o.zr && o.zr[k] === 'wl' ? ' (wg właściciela)' : '');
// „Brak informacji” nigdy nie trafia do ogłoszenia
const wybor = (k, v) => { if (v === 'nieznane') return ''; for (const s of SEKCJE) for (const p of s.pola) if (p.k === k && p.o) return p.o[v] || ''; return ''; };
export const znane = (v) => v !== undefined && v !== null && v !== '' && v !== 'nieznane';
const zdanie = (s) => { s = String(s || '').trim(); if (!s) return ''; s = s[0].toUpperCase() + s.slice(1); return /[.!?…]$/.test(s) ? s : `${s}.`; };
const punkt = (s) => { s = String(s || '').trim().replace(/[.;]+$/, ''); return s ? s[0].toUpperCase() + s.slice(1) : ''; };

function rodzajFraza(o, przypadek = 'mian') {
  const r = o.rodzaj;
  if (r === 'mieszkanie') return o.pokoje ? `mieszkanie ${o.pokoje}-pokojowe` : 'mieszkanie';
  if (r === 'dom') return 'dom';
  if (r === 'lokal') return 'lokal użytkowy';
  if (r === 'dzialka') return 'działka';
  if (r === 'pokoj') return przypadek === 'mian' ? 'pokój' : 'pokój';
  if (r === 'garaz') return 'garaż / miejsce postojowe';
  return 'nieruchomość';
}
const miejsce = (o) => {
  const czesci = [];
  if (o.pokazUlice && o.ulica) czesci.push(`ul.${nbsp}${o.ulica.replace(/^ul\.?\s*/i, '')}`);
  if (o.dzielnica) czesci.push(o.dzielnica);
  czesci.push(o.miasto || 'Lublin');
  return czesci.join(', ');
};

// ---------- tytuł ----------
export function tytul(o) {
  if (o.tytul && o.tytul.trim()) return o.tytul.trim();
  const cz = [];
  const r = o.rodzaj;
  if (r === 'mieszkanie' && o.pokoje) cz.push(`${o.pokoje} ${pokojeSlowo(o.pokoje)}`);
  else cz.push(RODZAJE[r] || 'Nieruchomość');
  if (o.pow) cz.push(m2(o.pow));
  if (o.dzielnica) cz.push(o.dzielnica);
  else if (o.miasto) cz.push(o.miasto);
  let t = cz.join(', ');
  const dodatki = [];
  if (o.nieprzechodnie && Number(o.pokoje) > 1) dodatki.push('pokoje nieprzechodnie');
  if (o.balkon && o.balkon !== 'brak') dodatki.push(wybor('balkon', o.balkon).toLowerCase());
  if (['podziemny', 'garaz'].includes(o.parking)) dodatki.push(o.parking === 'podziemny' ? 'garaż podziemny' : 'garaż');
  if (dodatki.length) t += ` — ${dodatki.slice(0, 2).join(', ')}`;
  return t;
}

// ---------- opis pełny (Otodom, OLX, strona) ----------
export function opis(o, ctx = {}) {
  const najem = o.transakcja === 'najem';
  const A = [];
  // lead: same fakty
  const r = rodzajFraza(o);
  let l1 = `${najem ? 'Do wynajęcia' : 'Na sprzedaż'} ${r}`;
  if (o.pow) l1 += ` o powierzchni ${m2(o.pow)}`;
  l1 += ` — ${miejsce(o)}.`;
  const l2 = [];
  const pt = pietroTekst(o);
  if (pt) l2.push(pt + (o.winda === 'tak' ? ', winda' : o.winda === 'nie' ? ', bez windy' : ''));
  if (o.rok) l2.push(`budynek z${nbsp}${o.rok}${nbsp}r.${wg(o, 'rok')}`);
  if (znane(o.stan)) l2.push(wybor('stan', o.stan).toLowerCase());
  A.push([l1, l2.length ? zdanie(l2.join(', ')) : ''].filter(Boolean).join(' '));
  if (o.lead && o.lead.trim()) A.push(zdanie(o.lead));

  // w skrócie
  const s = [];
  if (o.pow) s.push(`Powierzchnia: ${m2(o.pow)}${wg(o, 'pow')}`);
  if (o.dzialkaPow) s.push(`Działka: ${m2(o.dzialkaPow)}${wg(o, 'dzialkaPow')}`);
  if (o.pokoje) s.push(`${o.pokoje} ${pokojeSlowo(o.pokoje)}${o.nieprzechodnie && Number(o.pokoje) > 1 ? ', wszystkie nieprzechodnie' : ''}`);
  if (pt) s.push(`Piętro: ${Number(o.pietro) === 0 ? 'parter' : Number(o.pietro) < 0 ? 'suterena' : o.pietro}${o.pieter ? ` z${nbsp}${o.pieter}` : ''}${o.winda === 'tak' ? ', winda' : o.winda === 'nie' ? ', bez windy' : ''}`);
  const bud = [wybor('material', o.material), wybor('technologia', o.technologia)].filter(Boolean).join(', ').toLowerCase();
  if (o.rok || bud) s.push(`Budynek: ${[bud, o.rok ? `rok budowy ${o.rok}${wg(o, 'rok')}` : ''].filter(Boolean).join(', ')}`);
  if (o.stan) s.push(`Stan: ${wybor('stan', o.stan).toLowerCase()}`);
  if (znane(o.ogrzewanie)) s.push(`Ogrzewanie: ${wybor('ogrzewanie', o.ogrzewanie).toLowerCase()}${wg(o, 'ogrzewanie')}`);
  if (znane(o.okna)) s.push(`Okna: ${wybor('okna', o.okna).toLowerCase()}${o.ekspozycja ? `, strony: ${o.ekspozycja}` : ''}`);
  else if (o.ekspozycja) s.push(`Okna na: ${o.ekspozycja}`);
  if (o.balkon && o.balkon !== 'brak') s.push(`${wybor('balkon', o.balkon)}${o.balkonPow ? ` ${m2(o.balkonPow)}` : ''}`);
  if (o.piwnica && o.piwnica !== 'brak') s.push(wybor('piwnica', o.piwnica));
  if (o.parking && o.parking !== 'brak') {
    const PARK = { podziemny: 'miejsce w garażu podziemnym', naziemny: 'przypisane miejsce naziemne', garaz: 'garaż', ulica: 'ogólnodostępny, bez przypisanego miejsca' };
    let p = `Parking: ${PARK[o.parking] || wybor('parking', o.parking).toLowerCase()}`;
    if (['podziemny', 'naziemny', 'garaz'].includes(o.parking) && o.parkingCena !== undefined && o.parkingCena !== null && o.parkingCena !== '') {
      p += Number(o.parkingCena) === 0 ? ` (w${nbsp}cenie)` : ` (dodatkowo ${zl(o.parkingCena)}${najem ? '/mies.' : ''})`;
    }
    s.push(p);
  }
  if (!najem && o.wlasnosc) s.push(`Forma własności: ${wybor('wlasnosc', o.wlasnosc).toLowerCase()}${wg(o, 'wlasnosc')}`);
  if (najem && o.umeblowanie) s.push(wybor('umeblowanie', o.umeblowanie));
  if (o.dostepneOd) s.push(`Dostępne od: ${data(o.dostepneOd)}`);
  if (s.length) A.push(`W SKRÓCIE\n${s.map((x) => `– ${x}`).join('\n')}`);

  // pomieszczenia
  const pom = (o.pom || []).filter((p) => p.nazwa || p.typ);
  if (pom.length) {
    A.push(`POMIESZCZENIA\n${pom.map((p) => `– ${p.nazwa || p.typ}${p.m ? `: ${m2(p.m)}` : ''}${p.a && p.b ? ` (${liczba(p.a)} × ${liczba(p.b)} m)` : ''}${p.opis ? ` — ${punkt(p.opis).replace(/^./, (c) => c.toLowerCase())}` : ''}`).join('\n')}`);
  }

  // atuty
  const atuty = (o.atuty || []).map((a) => punkt(a.t)).filter(Boolean);
  if (atuty.length) A.push(`${najem ? 'CO ZYSKUJESZ' : 'ATUTY'}\n${atuty.map((x) => `– ${x}`).join('\n')}`);

  // koszty
  const k = [];
  if (o.cena) k.push(`${najem ? 'Najem' : 'Cena'}: ${zl(o.cena)}${najem ? ' miesięcznie' : ''}${o.cenaNeg ? ' (do negocjacji)' : ''}`);
  if (!najem && o.cena && o.pow) k.push(`Cena za m²: ${zl(Number(o.cena) / Number(o.pow))}`);
  if (o.czynsz !== undefined && o.czynsz !== null && o.czynsz !== '') k.push(`Czynsz administracyjny: ${zl(o.czynsz)}/mies.${wg(o, 'czynsz')}${o.czynszObejmuje ? ` — obejmuje: ${o.czynszObejmuje.trim().replace(/\.$/, '')}` : ''}`);
  if (o.media) k.push(`Media: średnio ok. ${zl(o.media)}/mies.${wg(o, 'media')}`);
  if (najem && o.kaucja) k.push(`Kaucja: ${zl(o.kaucja)}`);
  if (najem && o.minOkres) k.push(`Minimalny okres najmu: ${o.minOkres}${nbsp}mies.`);
  if (najem && o.umowaNajmu) k.push(`Umowa: ${wybor('umowaNajmu', o.umowaNajmu).toLowerCase()}`);
  if (najem && o.zwierzeta) k.push(`Zwierzęta: ${wybor('zwierzeta', o.zwierzeta).toLowerCase()}`);
  if (o.prowizjaKl === 'brak') k.push(`${najem ? 'Najemca' : 'Kupujący'} nie płaci prowizji`);
  if (prowizjaKlienta(o)) k.push(`Prowizja od ${najem ? 'najemcy' : 'kupującego'}: ${prowizjaKlienta(o)}`);
  if (k.length) A.push(`KOSZTY\n${k.map((x) => `– ${x}`).join('\n')}`);

  // okolica
  const ok = (o.okolica || []).filter((x) => x.nazwa);
  if (ok.length) {
    const jak = { pieszo: 'pieszo', rower: 'rowerem', auto: 'autem', mpk: 'komunikacją' };
    A.push(`OKOLICA\n${ok.map((x) => `– ${punkt(x.nazwa)}${x.min ? ` — ${x.min}${nbsp}min ${jak[x.jak] || 'pieszo'}` : ''}`).join('\n')}`);
  }

  // co warto wiedzieć — uczciwie
  const mi = (o.minusy || []).map((m) => punkt(m.t)).filter(Boolean);
  if (mi.length) A.push(`CO WARTO WIEDZIEĆ\n${mi.map((x) => `– ${x}`).join('\n')}`);

  // sprawdziliśmy
  const w = o.weryf || {};
  const spr = WERYFIKACJA.filter((x) => (!x.dla || x.dla === o.transakcja) && w[x.k]?.ok);
  if (spr.length) A.push(`SPRAWDZILIŚMY\n${spr.map((x) => `– ${x.og}${w[x.k].d ? ` — ${data(w[x.k].d)}` : ''}`).join('\n')}`);

  // świadectwo
  if (o.swiad === 'tak') {
    const e = [];
    if (o.eu !== undefined) e.push(`EU ${liczba(o.eu)} kWh/(m²·rok)`);
    if (o.ek !== undefined) e.push(`EK ${liczba(o.ek)} kWh/(m²·rok)`);
    if (o.ep !== undefined) e.push(`EP ${liczba(o.ep)} kWh/(m²·rok)`);
    if (o.oze !== undefined) e.push(`udział OZE ${liczba(o.oze)}%`);
    if (o.co2 !== undefined) e.push(`emisja CO₂ ${liczba(o.co2, 4)} t CO₂/(m²·rok)`);
    A.push(`ŚWIADECTWO CHARAKTERYSTYKI ENERGETYCZNEJ\n${e.join('; ')}.`);
  } else if (o.swiad === 'nie') {
    A.push('Świadectwo charakterystyki energetycznej: w przygotowaniu.');
  }

  // wizualizacje
  if ((o.zdj || []).some((z) => z.wiz)) A.push('Zdjęcia oznaczone „Wizualizacja” pokazują pomieszczenia z meblami dodanymi cyfrowo. Obok każdej wizualizacji jest oryginalne zdjęcie.');

  // stopka
  const ag = ctx.agent || {};
  const st = [`${ag.firma || 'AM Nieruchomości'}${ag.haslo ? ` — ${ag.haslo}` : ''}`];
  if (ag.nazwa || ag.telefon) st.push(`Kontakt: ${[ag.nazwa, ag.telefon].filter(Boolean).join(', tel. ')}`);
  A.push(st.join('\n'));
  return A.join('\n\n');
}

// ---------- krótka wersja (Facebook, Instagram) ----------
export function krotki(o, ctx = {}) {
  const najem = o.transakcja === 'najem';
  const l = [];
  l.push(`${najem ? 'DO WYNAJĘCIA' : 'NA SPRZEDAŻ'} | ${tytul(o)}`);
  l.push('');
  const f = [];
  if (o.cena) f.push(`${zl(o.cena)}${najem ? '/mies.' : ''}${o.cenaNeg ? ' (do negocjacji)' : ''}`);
  if (najem && o.czynsz) f.push(`+ czynsz adm. ${zl(o.czynsz)}`);
  if (najem && o.kaucja) f.push(`kaucja ${zl(o.kaucja)}`);
  if (f.length) l.push(f.join(', '));
  const g = [];
  if (o.pow) g.push(m2(o.pow));
  if (o.pokoje) g.push(`${o.pokoje} ${pokojeSlowo(o.pokoje)}`);
  const pt = pietroTekst(o); if (pt) g.push(pt);
  if (o.rok) g.push(`rok ${o.rok}`);
  if (g.length) l.push(g.join(' · '));
  const at = (o.atuty || []).map((a) => punkt(a.t)).filter(Boolean).slice(0, 3);
  if (at.length) { l.push(''); at.forEach((a) => l.push(`– ${a}`)); }
  if (o.dostepneOd) l.push(`Dostępne od ${data(o.dostepneOd)}`);
  if (o.prowizjaKl === 'brak') l.push(`${najem ? 'Najemca' : 'Kupujący'} nie płaci prowizji.`);
  else if (prowizjaKlienta(o)) l.push(`Prowizja od ${najem ? 'najemcy' : 'kupującego'}: ${prowizjaKlienta(o)}.`);
  const ag = ctx.agent || {};
  l.push('');
  l.push(`${ag.firma || 'AM Nieruchomości'}${ag.nazwa ? ` · ${ag.nazwa}` : ''}${ag.telefon ? ` · ${ag.telefon}` : ''}`);
  return l.join('\n');
}

// ---------- pola do formularza Otodom/OLX (kopiowanie po kolei) ----------
export function polaPortalu(o) {
  const najem = o.transakcja === 'najem';
  const x = [];
  const dodaj = (e, v) => { if (v !== undefined && v !== null && v !== '') x.push({ e, v: String(v) }); };
  dodaj('Tytuł', tytul(o));
  dodaj(najem ? 'Cena najmu (zł/mies.)' : 'Cena (zł)', o.cena);
  dodaj('Powierzchnia (m²)', o.pow !== undefined ? String(o.pow).replace('.', ',') : '');
  dodaj('Liczba pokoi', o.pokoje);
  dodaj('Piętro', o.pietro === 0 ? 'parter' : o.pietro);
  dodaj('Liczba pięter', o.pieter);
  dodaj('Rok budowy', o.rok);
  dodaj('Rodzaj zabudowy', wybor('material', o.material));
  dodaj('Materiał budynku', wybor('technologia', o.technologia));
  dodaj('Stan wykończenia', wybor('stan', o.stan));
  dodaj('Ogrzewanie', wybor('ogrzewanie', o.ogrzewanie));
  dodaj('Okna', wybor('okna', o.okna));
  dodaj('Winda', o.winda === 'tak' ? 'tak' : o.winda === 'nie' ? 'nie' : '');
  dodaj('Balkon / taras / ogródek', o.balkon && o.balkon !== 'brak' ? wybor('balkon', o.balkon) : '');
  dodaj('Miejsce parkingowe', o.parking && o.parking !== 'brak' ? wybor('parking', o.parking) : '');
  dodaj('Czynsz (zł/mies.)', o.czynsz);
  if (najem) { dodaj('Kaucja (zł)', o.kaucja); dodaj('Umeblowanie', wybor('umeblowanie', o.umeblowanie)); }
  if (!najem) dodaj('Forma własności', wybor('wlasnosc', o.wlasnosc));
  dodaj('Dostępne od', data(o.dostepneOd));
  dodaj('Powierzchnia działki (m²)', o.dzialkaPow);
  if (o.swiad === 'tak') {
    dodaj('EU (kWh/(m²·rok))', o.eu); dodaj('EK (kWh/(m²·rok))', o.ek); dodaj('EP (kWh/(m²·rok))', o.ep);
    dodaj('Udział OZE (%)', o.oze); dodaj('Emisja CO₂ (t CO₂/(m²·rok))', o.co2);
  }
  dodaj('Lokalizacja', miejsce(o));
  return x;
}

// ---------- kontrola słów ----------
export const PUSTE_SLOWA = [
  { r: /perełk/i, p: 'Pusty slogan. Napisz, co konkretnie wyróżnia nieruchomość.' },
  { r: /okazj/i, p: 'Ocena „okazja” to sprawa kupującego. Podaj cenę za m² na tle podobnych transakcji.' },
  { r: /unikat|unikaln/i, p: 'Nic nie mówi. Napisz, czego nie ma w innych ofertach.' },
  { r: /wyjątkow|niepowtarzaln/i, p: 'Opinia zamiast faktu. Zastąp konkretem.' },
  { r: /must\s*see|\bhit\b/i, p: 'Język z tablic ogłoszeń. Zastąp faktem.' },
  { r: /rewelacyjn|fenomenaln|bajeczn|zjawiskow|cudown|fantastyczn|niesamowit|wymarzon|obłędn|genialn/i, p: 'Przymiotnik bez treści. Opisz, co widać lub co da się zmierzyć.' },
  { r: /najlepsz|najpiękniejsz|najtańsz|najlepiej/i, p: 'Stopień najwyższy wymaga dowodu. Usuń albo podaj porównanie.' },
  { r: /idealn|perfekcyjn/i, p: 'Każdy ma inny ideał. Napisz, dla kogo i dlaczego.' },
  { r: /luksus|prestiż|ekskluzywn|elitarn/i, p: 'Pokaż to konkretem: materiały, marki, wyposażenie.' },
  { r: /nie przegap|ostatnia szansa|tylko teraz|spiesz|pośpiesz|pospiesz|nie czekaj|szybko się sprzeda/i, p: 'Presja na kupującego. Nie stosujemy.' },
  { r: /piękn|cudn|urocz|klimatyczn|przytuln/i, p: 'Ocena subiektywna. Opisz, co dokładnie widać.' },
  { r: /!/, p: 'Wykrzyknik w ogłoszeniu brzmi jak krzyk. Usuń.' },
  { r: /\b[A-ZĄĆĘŁŃÓŚŹŻ]{5,}\b/, p: 'Słowo pisane wielkimi literami. Pisz normalnie.' },
];
// teksty wpisane ręcznie, które trafiają do ogłoszenia
export function tekstyOgloszenia(o) {
  const t = [];
  if (o.tytul) t.push({ gdzie: 'Tytuł', tekst: o.tytul });
  if (o.lead) t.push({ gdzie: 'Wstęp', tekst: o.lead });
  (o.atuty || []).forEach((a, i) => a.t && t.push({ gdzie: `Atut ${i + 1}`, tekst: a.t }));
  (o.minusy || []).forEach((a, i) => a.t && t.push({ gdzie: `Co warto wiedzieć ${i + 1}`, tekst: a.t }));
  (o.pom || []).forEach((p) => p.opis && t.push({ gdzie: `Pomieszczenie: ${p.nazwa || p.typ}`, tekst: p.opis }));
  (o.okolica || []).forEach((p) => p.nazwa && t.push({ gdzie: 'Okolica', tekst: p.nazwa }));
  if (o.czynszObejmuje) t.push({ gdzie: 'Czynsz obejmuje', tekst: o.czynszObejmuje });
  if (o.ekspozycja) t.push({ gdzie: 'Strony świata', tekst: o.ekspozycja });
  return t;
}
export function kontrolaSlow(o) {
  const uwagi = [];
  for (const { gdzie, tekst } of tekstyOgloszenia(o)) {
    for (const { r, p } of PUSTE_SLOWA) {
      const m = String(tekst).match(r);
      if (m) {
        // pokaż całe słowo, nie sam rdzeń
        const tx = String(tekst), lit = /[\p{L}\p{N}]/u;
        let a = m.index, z = m.index + m[0].length;
        if (lit.test(m[0])) { while (a > 0 && lit.test(tx[a - 1])) a--; while (z < tx.length && lit.test(tx[z])) z++; }
        uwagi.push({ gdzie, fraza: tx.slice(a, z), porada: p });
      }
    }
  }
  return uwagi;
}

// ---------- checklista ----------
const puste = (v) => v === undefined || v === null || v === '';
// metraż pomieszczenia z dwóch wymiarów (m), zaokrąglony do 0,01 m²
export function metrazZWymiarow(a, b) { const x = Number(a), y = Number(b); return x > 0 && y > 0 ? Math.round(x * y * 100) / 100 : null; }
export function minZdjec(o) { return ['mieszkanie', 'dom', 'lokal'].includes(o.rodzaj) ? 10 : o.rodzaj === 'pokoj' ? 5 : 3; }
export function checklista(o) {
  const L = [];
  const add = (id, tekst, ok, twarde, zakladka, info = '') => L.push({ id, tekst, ok: !!ok, twarde, zakladka, info });
  const r = o.rodzaj, najem = o.transakcja === 'najem';
  const zdj = o.zdj || [];
  const zwykle = zdj.filter((z) => !z.wiz);
  add('podstawy', 'Transakcja i rodzaj nieruchomości wybrane', o.transakcja && r, true, 'karta');
  add('cena', 'Cena podana', !puste(o.cena) && Number(o.cena) > 0, true, 'karta');
  add('prowizja', 'Określone, czy kupujący / najemca płaci prowizję, i w jakiej wysokości', !!o.prowizjaKl && (o.prowizjaKl === 'brak' || !!prowizjaKlienta(o)), true, 'karta');
  add('pow', 'Powierzchnia podana i ma źródło', !puste(o.pow) && o.zr?.pow, true, 'karta', puste(o.pow) ? '' : 'Zaznacz, skąd jest metraż: dokument, pomiar albo wg właściciela.');
  add('lokalizacja', 'Dzielnica / lokalizacja podana', o.dzielnica || o.miasto, true, 'karta');
  if (['mieszkanie', 'dom', 'lokal'].includes(r)) add('pokoje', 'Liczba pokoi podana', !puste(o.pokoje), true, 'karta');
  if (['mieszkanie', 'lokal', 'pokoj'].includes(r)) add('pietro', 'Piętro i liczba pięter podane', !puste(o.pietro) && !puste(o.pieter), true, 'karta');
  if (['mieszkanie', 'pokoj'].includes(r)) add('czynsz', 'Czynsz administracyjny podany kwotą', !puste(o.czynsz), true, 'karta');
  if (najem) {
    add('kaucja', 'Kaucja podana', !puste(o.kaucja), true, 'karta');
    add('dostepne', 'Data dostępności podana', !!o.dostepneOd, true, 'karta');
  }
  if (!najem && r !== 'garaz') add('wlasnosc', 'Forma własności podana i ma źródło', o.wlasnosc && o.zr?.wlasnosc, true, 'karta');
  if (BUD.includes(r)) add('swiad', 'Świadectwo energetyczne: odpowiedź udzielona', !!o.swiad, true, 'karta');
  if (o.swiad === 'tak') add('swiadPola', 'Wszystkie 5 wskaźników ze świadectwa wpisane (obowiązek ustawowy)', ['eu', 'ek', 'ep', 'oze', 'co2'].every((k) => !puste(o[k])), true, 'karta');
  if (BUD.includes(r)) {
    const pom = (o.pom || []).filter((p) => p.nazwa || p.typ);
    add('pomieszczenia', 'Lista pomieszczeń z metrażami', pom.length > 0 && pom.every((p) => !puste(p.m)), true, 'karta');
    const bez = pom.filter((p) => !zwykle.some((z) => z.pom === p.id));
    add('zdjPom', 'Każde pomieszczenie ma przynajmniej jedno zdjęcie', pom.length > 0 && bez.length === 0, true, 'zdjecia',
      bez.length ? `Brak zdjęć: ${bez.map((p) => p.nazwa || p.typ).join(', ')}` : '');
  }
  add('zdjIlosc', `Co najmniej ${minZdjec(o)} prawdziwych zdjęć`, zwykle.length >= minZdjec(o), true, 'zdjecia', `Jest ${zwykle.length}.`);
  const gl = zdj.find((z) => z.glowne);
  add('glowne', 'Zdjęcie główne wybrane (prawdziwe, nie wizualizacja)', gl && !gl.wiz, true, 'zdjecia');
  const wiz = zdj.filter((z) => z.wiz);
  if (wiz.length) add('wiz', 'Każda wizualizacja ma przypięte oryginalne zdjęcie', wiz.every((z) => z.oryg && zdj.some((y) => y.id === z.oryg && !y.wiz)), true, 'zdjecia');
  if (['mieszkanie', 'dom', 'lokal'].includes(r)) add('rzut', 'Rzut z wymiarami dołączony', zdj.some((z) => z.pom === 'rzut'), true, 'zdjecia');
  if (!najem) add('kw', 'Księga wieczysta sprawdzona', o.weryf?.kw?.ok, true, 'weryfikacja');
  const slowa = kontrolaSlow(o);
  add('slowa', 'Bez pustych słów, wykrzykników i presji', slowa.length === 0, true, 'ogloszenie', slowa.length ? `Do poprawy: ${slowa.length}` : '');
  // zalecane
  if (BUD.includes(r) && r !== 'pokoj') add('rok', 'Rok budowy podany (albo zaznaczone „nie wiem”)', !puste(o.rok) || !!o.rokNieznany, false, 'karta');
  if (BUD.includes(r)) add('ogrzewanie', 'Ogrzewanie podane', !!o.ogrzewanie, false, 'karta');
  add('minusy', '„Co warto wiedzieć” — co najmniej jedna uczciwa uwaga', (o.minusy || []).some((m) => m.t), false, 'karta');
  add('okolica', 'Okolica — co najmniej 3 punkty z czasem dojścia', (o.okolica || []).filter((x) => x.nazwa && x.min).length >= 3, false, 'karta');
  add('atuty', 'Atuty — co najmniej 2 konkretne fakty', (o.atuty || []).filter((a) => a.t).length >= 2, false, 'karta');
  if (najem) add('kwN', 'Właściciel potwierdzony w księdze wieczystej', o.weryf?.kwN?.ok, false, 'weryfikacja');
  add('zdjOpisy', 'Zdjęcia przypisane do pomieszczeń / miejsc', zdj.length > 0 && zdj.every((z) => z.pom), false, 'zdjecia');
  return L;
}
export function gotowosc(o) {
  const L = checklista(o);
  const tw = L.filter((x) => x.twarde);
  return { procent: Math.round((L.filter((x) => x.ok).length / Math.max(1, L.length)) * 100), braki: tw.filter((x) => !x.ok), wszystkieTwarde: tw.every((x) => x.ok) };
}
export const STATUSY_WYMAGAJACE = ['gotowa', 'opublikowana'];

export function nowaOferta(id, autor) {
  return { id, transakcja: 'sprzedaz', rodzaj: 'mieszkanie', status: 'przygotowanie', miasto: 'Lublin', pokazUlice: true,
    pom: [], atuty: [], minusy: [], okolica: [], zdj: [], weryf: {}, zr: {}, utworzyl: autor || '' };
}
export const noweId = (n = 10) => {
  const a = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const b = new Uint8Array(n); (globalThis.crypto || {}).getRandomValues?.(b);
  return Array.from(b, (x) => a[x % a.length]).join('');
};
