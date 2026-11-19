// Urządzenia do obróbki zdjęć: wybór „To urządzenie” (zapamiętany tylko na tym urządzeniu), specyfikacje i krótki test.
// Przeglądarka nie podaje modelu (Safari na każdym iPhonie mówi „iPhone”), dlatego model wybiera użytkownik.
// Etap 1 (obróbka bez AI) działa na każdym urządzeniu tak samo — poziom decyduje o rozdzielczości podglądu,
// a w kolejnych etapach o narzędziach z kartą graficzną (WebGPU).

export const URZADZENIA = {
  'iphone-16-pro-max': { n: 'iPhone 16 Pro Max', typ: 'telefon', spec: 'Apple A18 Pro, 8 GB RAM', poziom: 'pelny', wymaga: 'iOS 26 (karta graficzna w przeglądarce)' },
  'iphone-17-pro-max': { n: 'iPhone 17 Pro Max', typ: 'telefon', spec: 'Apple A19 Pro, 12 GB RAM', poziom: 'pelny', wymaga: 'iOS 26 (karta graficzna w przeglądarce)' },
  'redmi-pad-pro': { n: 'Xiaomi Redmi Pad Pro', typ: 'tablet', spec: 'Snapdragon 7s Gen 2, Adreno 710, 6–8 GB RAM, Android 14', poziom: 'rozszerzony', wymaga: 'Chrome' },
  'asus-gl703ge': { n: 'ASUS ROG Strix GL703GE', typ: 'laptop', spec: 'Intel Core i7-8750H, GeForce GTX 1050 Ti 4 GB', poziom: 'pelny', wymaga: 'Chrome' },
};
export const POZIOMY = {
  pelny: { n: 'Pełny', podglad: 1200, opis: 'cała obróbka, duży podgląd' },
  rozszerzony: { n: 'Rozszerzony', podglad: 1000, opis: 'cała obróbka, średni podgląd' },
  podstawowy: { n: 'Podstawowy', podglad: 800, opis: 'cała obróbka, mniejszy podgląd — dłużej liczy' },
};
const KLUCZ = 'am-urzadzenie', KLUCZ_TEST = 'am-urzadzenie-test';
const czytaj = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const pisz = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* tryb prywatny — trudno */ } };

export function wybrane() { return czytaj(KLUCZ) || { id: '', nazwa: '' }; }
export function ustaw(id, nazwa = '') { pisz(KLUCZ, { id, nazwa: id === 'inne' ? nazwa.slice(0, 60) : '' }); }
export function wynikTestu() { return czytaj(KLUCZ_TEST); }
export function nazwa() { const w = wybrane(); return URZADZENIA[w.id]?.n || (w.id === 'inne' && w.nazwa) || ''; }

// poziom: z tabeli, a gdy test pokazał wolne liczenie — obniżony (np. tryb oszczędzania baterii)
export function poziom() {
  const w = wybrane(), t = wynikTestu();
  let p = URZADZENIA[w.id]?.poziom || '';
  if (t) {
    const zTestu = t.ms < 450 ? 'pelny' : t.ms < 1100 ? 'rozszerzony' : 'podstawowy';
    if (!p) p = zTestu;
    else if (kolej(zTestu) < kolej(p)) p = zTestu;
  }
  return p || 'rozszerzony';
}
const kolej = (p) => ['podstawowy', 'rozszerzony', 'pelny'].indexOf(p);
export const podglad = () => POZIOMY[poziom()].podglad;

// rozbieżność tabeli i testu — do pokazania wprost
export function uwagaTestu() {
  const w = wybrane(), t = wynikTestu();
  if (!t || !URZADZENIA[w.id]) return '';
  const z = URZADZENIA[w.id].poziom;
  const zTestu = t.ms < 450 ? 'pelny' : t.ms < 1100 ? 'rozszerzony' : 'podstawowy';
  if (kolej(zTestu) < kolej(z)) return `Test wypadł słabiej niż zwykle dla ${URZADZENIA[w.id].n} — może tryb oszczędzania baterii albo stara przeglądarka. Aplikacja używa poziomu „${POZIOMY[zTestu].n}”.`;
  if (URZADZENIA[w.id].poziom === 'pelny' && !t.gpu) return `Przeglądarka nie udostępnia karty graficznej (${URZADZENIA[w.id].wymaga}). Teraz to nie przeszkadza — będzie potrzebna w kolejnych etapach.`;
  return '';
}

// test: obróbka próbnego zdjęcia 1000×750 (te same obliczenia co przy „Obróbce”) + czy jest WebGPU
export async function testuj(KZ) {
  const w = 1000, h = 750, d = new Uint8ClampedArray(w * h * 4);
  let s = 12345;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const i = (y * w + x) * 4, v = 60 + ((x / 40) | 0) % 2 * 90 + (s % 20);
    d[i] = v; d[i + 1] = v * 0.95; d[i + 2] = v * 0.85; d[i + 3] = 255;
  }
  const src = { data: d, width: w, height: h };
  const t0 = performance.now();
  const a = KZ.autoObrobka(src);
  KZ.obrob(src, { ...a.naturalna, obrot: 1.5, piony: 0.05 }, w, h);
  const ms = Math.round(performance.now() - t0);
  let gpu = false;
  try { gpu = !!(navigator.gpu && await navigator.gpu.requestAdapter()); } catch { gpu = false; }
  const wynik = { ms, gpu, kiedy: Date.now() };
  pisz(KLUCZ_TEST, wynik);
  return wynik;
}
