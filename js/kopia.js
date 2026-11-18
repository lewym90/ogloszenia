// AM Oferty — kopia zapasowa na komputerze wspólnika.
// Aplikacja otwarta na laptopie (Chrome / Edge) ściąga do wybranego folderu wszystko, czego tam jeszcze nie ma:
// zdjęcia, dokumenty i kopię bazy. Folder ma układ jak katalog danych na serwerze, więc z niego da się odtworzyć serwer.
// Pliki usunięte w aplikacji zostają w kopii (archiwum).
import * as D from './dane.js';

export const obslugiwana = typeof window !== 'undefined' && 'showDirectoryPicker' in window;
export const stan = { folder: null, nazwa: '', zgoda: '', trwa: false, postep: '', blad: '', ostatnia: 0 };
const DNI_OSTRZEZENIA = 7;
const ZOSTAW_BAZ = 14;
let sluchacz = () => {};
export const naZmiane = (f) => { sluchacz = f; };
const odswiez = () => { try { sluchacz(); } catch { /* */ } };

export async function start() {
  stan.ostatnia = (await D.meta.get('kopiaOstatnia')) || 0;
  if (!obslugiwana) return;
  stan.folder = (await D.meta.get('kopiaFolder')) || null;
  if (!stan.folder) return;
  stan.nazwa = stan.folder.name;
  try { stan.zgoda = await stan.folder.queryPermission({ mode: 'readwrite' }); } catch { stan.zgoda = 'prompt'; }
  odswiez();
  // automatycznie: chwilę po starcie i co 6 godzin, dopóki aplikacja jest otwarta
  setTimeout(() => zrob({ cicho: true }).catch(() => {}), 8000);
  setInterval(() => zrob({ cicho: true }).catch(() => {}), 6 * 3600e3);
}
export async function wybierzFolder() {
  const h = await window.showDirectoryPicker({ id: 'am-oferty-kopia', mode: 'readwrite', startIn: 'documents' });
  await ustawFolder(h);
  return zrob();
}
export async function ustawFolder(h) {
  stan.folder = h; stan.nazwa = h.name; stan.zgoda = 'granted';
  await D.meta.put(h, 'kopiaFolder');
  odswiez();
}
// czy kopia jest nieaktualna (wg serwera — kopia z dowolnego komputera się liczy)
export function przeterminowana() {
  const k = D.stan.kopia;
  return !k || Date.now() - k.kiedy > DNI_OSTRZEZENIA * 86400e3;
}
export function dniOdKopii() { const k = D.stan.kopia; return k ? Math.floor((Date.now() - k.kiedy) / 86400e3) : null; }

async function rozmiaryWKatalogu(dir) {
  const m = new Map();
  for await (const [n, h] of dir.entries()) if (h.kind === 'file') { try { m.set(n, (await h.getFile()).size); } catch { /* */ } }
  return m;
}
async function zapiszOdpowiedz(dir, nazwa, r) {
  const fh = await dir.getFileHandle(nazwa, { create: true });
  const w = await fh.createWritable();
  try { await r.body.pipeTo(w); } catch (e) { try { await w.abort(); } catch { /* */ } throw e; }
}
async function zapiszTekst(dir, nazwa, tekst) {
  const w = await (await dir.getFileHandle(nazwa, { create: true })).createWritable();
  await w.write(new Blob([tekst], { type: 'text/plain' })); await w.close();
}

export async function zrob({ cicho = false } = {}) {
  if (!stan.folder || stan.trwa || !D.stan.token || !navigator.onLine) return;
  let z = 'prompt';
  try { z = await stan.folder.queryPermission({ mode: 'readwrite' }); } catch { /* */ }
  if (z !== 'granted') {
    if (cicho) { stan.zgoda = z; odswiez(); return; }
    z = await stan.folder.requestPermission({ mode: 'readwrite' });
    stan.zgoda = z;
    if (z !== 'granted') throw new Error('Bez zgody na zapis w folderze kopia nie powstanie.');
  }
  stan.zgoda = 'granted'; stan.trwa = true; stan.blad = ''; stan.postep = 'Sprawdzam, czego brakuje…'; odswiez();
  try {
    const spis = await D.spisKopii();
    const katalogi = {}, jest = {};
    for (const k of ['zdjecia', 'pliki', 'baza']) { katalogi[k] = await stan.folder.getDirectoryHandle(k, { create: true }); jest[k] = await rozmiaryWKatalogu(katalogi[k]); }
    const brak = spis.pliki.filter((f) => { const [k, n] = f.s.split('/'); return jest[k].get(n) !== f.r; });
    let nowe = 0;
    for (const f of brak) {
      stan.postep = `Pobieram ${nowe + 1} z ${brak.length}…`; odswiez();
      const [k, n] = f.s.split('/');
      await zapiszOdpowiedz(katalogi[k], n, await D.pobierzDoKopii(`/kopia/plik?s=${encodeURIComponent(f.s)}`));
      nowe++;
    }
    // baza: najnowsza kopia godzinowa z serwera; trzymamy 14 ostatnich
    if (spis.baza && jest.baza.get(spis.baza.nazwa) !== spis.baza.r) {
      stan.postep = 'Pobieram bazę…'; odswiez();
      await zapiszOdpowiedz(katalogi.baza, spis.baza.nazwa, await D.pobierzDoKopii('/kopia/baza'));
    }
    const bazy = [...(await rozmiaryWKatalogu(katalogi.baza)).keys()].filter((n) => /^amoferty-\d{10}\.db$/.test(n)).sort();
    for (const n of bazy.slice(0, Math.max(0, bazy.length - ZOSTAW_BAZ))) await katalogi.baza.removeEntry(n);
    await zapiszTekst(stan.folder, 'CZYTAJ-MNIE.txt', INSTRUKCJA);
    const bajty = spis.pliki.reduce((a, f) => a + f.r, 0) + (spis.baza?.r || 0);
    stan.ostatnia = Date.now(); await D.meta.put(stan.ostatnia, 'kopiaOstatnia');
    await D.zglosKopie({ pliki: spis.pliki.length, bajty, nowe });
    stan.postep = nowe ? `Gotowe: ${nowe} nowych plików` : 'Gotowe: kopia była aktualna';
    return { nowe, pliki: spis.pliki.length, bajty };
  } catch (e) {
    stan.blad = e.message || 'Kopia się nie udała';
    throw e;
  } finally { stan.trwa = false; odswiez(); }
}

const INSTRUKCJA = `KOPIA ZAPASOWA AM OFERTY
========================

Ten folder uzupełnia się sam, gdy aplikacja AM Oferty jest otwarta na tym komputerze
(przy starcie i co 6 godzin). Nic tu nie zmieniaj ręcznie.

  zdjecia/  — wszystkie zdjęcia ofert (pełne, średnie, miniatury)
  pliki/    — dokumenty (PDF, skany)
  baza/     — kopie bazy danych (14 ostatnich), nazwa = rok miesiąc dzień godzina (UTC)

Zdjęcia i dokumenty usunięte w aplikacji ZOSTAJĄ w tym folderze (archiwum).
W bazie są też dane logowania i klucze serwera — nie udostępniaj tego folderu nikomu.

ODTWORZENIE SERWERA (np. po awarii dysku na serwerze)
1. Na serwerze zainstaluj aplikację tym samym poleceniem co zawsze (install.sh).
2. Zatrzymaj usługę:            sudo systemctl stop amoferty
3. Skopiuj z tego folderu na serwer do /var/lib/amoferty/:
     zdjecia/  →  /var/lib/amoferty/zdjecia/
     pliki/    →  /var/lib/amoferty/pliki/
     najnowszy plik z baza/  →  /var/lib/amoferty/amoferty.db
   (usuń wcześniej /var/lib/amoferty/amoferty.db-wal i amoferty.db-shm, jeśli są)
4. Nadaj właściciela:           sudo chown -R amoferty:amoferty /var/lib/amoferty
5. Uruchom:                     sudo systemctl start amoferty
Urządzenia zostaną zalogowane jak przed awarią (kopia bazy zawiera ich klucze).
`;
