// AM Oferty — wymiana z edytorem rzutów (rzut/, openPlan3D z naszymi łatkami).
// Wspólna baza IndexedDB „am-rzut” (ta sama domena): wejscie:<oid> → edytor, wynik:<oid> → aplikacja.
function baza() {
  return new Promise((ok, zle) => {
    const r = indexedDB.open('am-rzut', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('dane');
    r.onsuccess = () => ok(r.result);
    r.onerror = () => zle(r.error);
  });
}
async function op(tryb, f) {
  const d = await baza();
  return new Promise((ok, zle) => {
    const t = d.transaction('dane', tryb);
    const r = f(t.objectStore('dane'));
    t.oncomplete = () => { ok(r?.result); d.close(); };
    t.onerror = () => zle(t.error);
  });
}
export const wloz = (k, v) => op('readwrite', (s) => { s.put(v, k); });
export const usun = (k) => op('readwrite', (s) => { s.delete(k); });
export async function wyniki() {
  const klucze = (await op('readonly', (s) => s.getAllKeys())) || [];
  const L = [];
  for (const k of klucze.filter((x) => String(x).startsWith('wynik:'))) L.push({ oid: String(k).slice(6), ...(await op('readonly', (s) => s.get(k))) });
  return L;
}
// nazwy ze skanu iPhone'a (RoomPlan) i szablonów edytora są po angielsku
const NAZWY = { bedroom: 'Sypialnia', bathroom: 'Łazienka', kitchen: 'Kuchnia', 'living room': 'Salon', livingroom: 'Salon', 'dining room': 'Jadalnia', diningroom: 'Jadalnia',
  hallway: 'Korytarz', hall: 'Korytarz', office: 'Gabinet', closet: 'Garderoba', laundry: 'Pralnia', 'laundry room': 'Pralnia', garage: 'Garaż', pantry: 'Spiżarnia',
  entryway: 'Przedpokój', entry: 'Przedpokój', room: 'Pokój', storage: 'Schowek', toilet: 'WC', balcony: 'Balkon', terrace: 'Taras', 'utility room': 'Pomieszczenie gospodarcze' };
export function polskaNazwa(n) {
  const t = String(n || '').trim();
  const m = t.match(/^(.*?)(\s*\d+)?$/);
  const pl = NAZWY[(m[1] || '').trim().toLowerCase()];
  return pl ? `${pl}${m[2] || ''}` : t;
}
// powtórzone nazwy dostają numery: Sypialnia 1, Sypialnia 2
export function nazwyPomieszczen(pokoje) {
  const L = pokoje.map((r) => ({ ...r, nazwa: polskaNazwa(r.nazwa) }));
  const ile = {};
  for (const r of L) if (r.nazwa) { const k = `${r.nazwa}|${r.kond || ''}`.toLowerCase(); ile[k] = (ile[k] || 0) + 1; }
  const nr = {};
  for (const r of L) {
    if (!r.nazwa) continue;
    const k = `${r.nazwa}|${r.kond || ''}`.toLowerCase();
    if (ile[k] > 1) { nr[k] = (nr[k] || 0) + 1; r.nazwa = `${r.nazwa} ${nr[k]}`; }
  }
  return L;
}
// scalanie pomieszczeń z rzutu z listą w karcie: po nazwie (bez wielkości liter), nowe na końcu
export function scalPomieszczenia(pom, pokoje, noweId) {
  // Pomiar dalmierzem (długość × szerokość) jest dokładniejszy niż skan — nigdy go nie nadpisujemy.
  // Rzut uzupełnia metraż tylko tam, gdzie nie ma wymiarów, i dopisuje nowe pomieszczenia.
  const wynik = pom.map((p) => ({ ...p }));
  const klucz = (s) => String(s || '').trim().toLowerCase();
  let zmienione = 0, dodane = 0;
  const porownanie = [];
  for (const r of pokoje) {
    if (!r.nazwa || r.m == null) continue;
    const nazwa = r.kond ? `${r.nazwa} (${r.kond})` : r.nazwa;
    const ist = wynik.find((p) => klucz(p.nazwa) === klucz(nazwa));
    if (ist && ist.a && ist.b) { porownanie.push({ nazwa, pomiar: ist.m, rzut: r.m }); continue; }
    if (ist) { if (ist.m !== r.m) { ist.m = r.m; zmienione++; } }
    else { wynik.push({ id: noweId(6), nazwa, m: r.m }); dodane++; }
  }
  return { pom: wynik, zmienione, dodane, porownanie, bezNazwy: pokoje.filter((r) => !r.nazwa).length };
}
// odzyskanie wymiarów z historii zmian pola „pom” (najnowsze najpierw): po id pomieszczenia, potem po nazwie
export function odzyskajWymiary(pom, historia) {
  const brak = pom.filter((p) => !(p.a && p.b));
  if (!brak.length) return { pom, odzyskane: 0 };
  const wersje = [];
  for (const h of historia.filter((x) => x.pole === 'pom')) for (const j of [h.nowa, h.stara]) { try { const v = JSON.parse(j); if (Array.isArray(v)) wersje.push(v); } catch { /* */ } }
  const klucz = (s) => String(s || '').trim().toLowerCase();
  let odzyskane = 0;
  const wynik = pom.map((p) => {
    if (p.a && p.b) return p;
    for (const v of wersje) {
      const z = v.find((x) => x.id === p.id && x.a && x.b) || v.find((x) => klucz(x.nazwa) === klucz(p.nazwa) && x.a && x.b);
      if (z) { odzyskane++; return { ...p, a: z.a, b: z.b, m: z.m ?? Math.round(z.a * z.b * 100) / 100 }; }
    }
    return p;
  });
  return { pom: wynik, odzyskane };
}
