// „Obróbka AM” — automatyczna obróbka zdjęć własnym modelem, liczona w telefonie (bez serwera i bez opłat).
// Kolejno: (1) wstępne rozjaśnienie bardzo ciemnych zdjęć (krzywa ze „stopą”, bez ruszania czerni i ciemnych
// kolorowych materiałów), (2) sieć przewiduje siatkę lokalnych modeli koloru, (3) HY.naloz — te same bezpieczniki
// co w „Obróbce AI” (tylko światło i kolor, odcienie materiałów ±5°, biel najwyżej kremowa, ochrona ciemnych
// materiałów), (4) wykończenie: odszumienie koloru w rozjaśnionych cieniach, klarowność i delikatne wyostrzenie.
// Nic nie jest dorysowywane — każdy piksel wyniku to ten sam piksel oryginału, tylko jaśniejszy/cieplejszy.
import * as HY from './hybryda.js';
import * as S from './obrobkaSiec.js';

export const DOMYSLNE_AM = { sila: 1, kolor: 1.6, jasnosc: 0 };
const OCHRONA = 0.7;
// styl domu — ADAPTACYJNY (zależny od tego, czego zdjęcie potrzebuje, nie stałe cele):
// biel: globalny balans bieli tylko gdy jasne neutralne powierzchnie są zimne/szare (cel b≈5,5) albo zbyt żółte (> 9);
// kolory: „żywość” tylko gdy materiały są blade (cel mediany nasycenia ≈ 30), słabe kolory mocniej, mocne wcale.
// jasność: gdy mediana jasności (bez ciemnych materiałów) < 74 — średnie tony w górę (czerń zostaje); jasne zdjęcia bez zmian.
const BIEL_B = 6, BIEL_A = 1.5, ZOLTA_MAX = 12, CEL_NAS = 34, ZYW_MAX = 0.8, CEL_L = 74, KLAR = 0.24, OSTR = 0.75;

const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
function lab8(r, g, b) { // przybliżone L*a*b* z sRGB 0..255 (do pomiarów)
  const f = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const R = f(r), G = f(g), B = f(b);
  const X = (0.412453 * R + 0.35758 * G + 0.180423 * B) / 0.950456, Y = 0.212671 * R + 0.71516 * G + 0.072169 * B, Z = (0.019334 * R + 0.119193 * G + 0.950227 * B) / 1.088754;
  const q = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [Y > 0.008856 ? 116 * q(Y) - 16 : 903.3 * Y, 500 * (q(X) - q(Y)), 200 * (q(Y) - q(Z))];
}
const L_Z_LUMY = new Float32Array(256); // jasność L* dla szarości o danej lumie (przybliżenie do wag)
for (let i = 0; i < 256; i++) L_Z_LUMY[i] = lab8(i, i, i)[0];

// ---------- (1) wstępne rozjaśnienie ----------
export function ocenEkspozycje(org) {
  const m = HY.zmniejsz(org, 256), d = m.data, n = m.width * m.height, Ln = [];
  for (let i = 0; i < n; i++) { const [L, a, b] = lab8(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]); if (Math.hypot(a, b) < 10) Ln.push(L); }
  if (Ln.length < 500) return 1;
  Ln.sort((a, b) => a - b);
  const med = Ln[Ln.length >> 1], udz = Ln.length / n;
  if (med >= 50) return 1;
  let g = Math.max(0.6, Math.min(1, Math.log(0.5) / Math.log(Math.max(med, 5) / 100)));
  return 1 - (1 - g) * Math.max(0, Math.min(1, (udz - 0.3) / 0.4));
}
function krzyweZeStopa(g, poziomy = 17) { // LUT-y dla wykładników od g (pełne rozjaśnienie) do 1 (bez zmian)
  const T = [];
  for (let k = 0; k < poziomy; k++) {
    const e = g + (1 - g) * (k / (poziomy - 1)), t = new Float32Array(256);
    for (let i = 0; i < 256; i++) { const x = i / 255; t[i] = (x + (x ** e - x) * smooth((x - 0.04) / 0.16)) * 255; }
    T.push(t);
  }
  return T;
}
export function przedekspozycja(org, mo, g) {
  if (g >= 0.999) return org;
  const { width: W, height: H, data: d } = org, out = new Uint8ClampedArray(d.length), T = krzyweZeStopa(g), P = T.length - 1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, ochr = probkuj(mo, x, y, W, H), f = ochr * P, k = Math.min(P - 1, f | 0), a = f - k, A = T[k], B = T[k + 1];
    out[i] = A[d[i]] * (1 - a) + B[d[i]] * a; out[i + 1] = A[d[i + 1]] * (1 - a) + B[d[i + 1]] * a; out[i + 2] = A[d[i + 2]] * (1 - a) + B[d[i + 2]] * a; out[i + 3] = 255;
  }
  return { data: out, width: W, height: H };
}
function probkuj(mo, x, y, W, H) {
  const fx = Math.max(0, Math.min(mo.w - 1, ((x + 0.5) / W) * mo.w - 0.5)), fy = Math.max(0, Math.min(mo.h - 1, ((y + 0.5) / H) * mo.h - 0.5));
  const x0 = Math.min(mo.w - 2, fx | 0), y0 = Math.min(mo.h - 2, fy | 0), ax = Math.min(1, fx - x0), ay = Math.min(1, fy - y0), m = mo.m, i = y0 * mo.w + x0;
  return (m[i] * (1 - ax) + m[i + 1] * ax) * (1 - ay) + (m[i + mo.w] * (1 - ax) + m[i + mo.w + 1] * ax) * ay;
}

// ---------- (2) sieć ----------
// → { pre, nauka, mo } — wszystko, czego potrzeba do podglądu i pełnego zdjęcia
export function przygotujAM(wagi, org) {
  const mo = HY.mapaOchrony(org, 1024);
  const pre = przedekspozycja(org, mo, ocenEkspozycje(org));
  return { pre, mo, nauka: S.przewidz(wagi, pre) };
}

// ---------- (3)+(4) ----------
function pomniejszKanal(s, W, H, f) { // średnia z pól f×f
  const w = Math.ceil(W / f), h = Math.ceil(H / f), o = new Float32Array(w * h), n = new Float32Array(w * h);
  for (let y = 0; y < H; y++) { const r = ((y / f) | 0) * w; for (let x = 0; x < W; x++) { const j = r + ((x / f) | 0); o[j] += s[y * W + x]; n[j]++; } }
  for (let j = 0; j < o.length; j++) o[j] /= n[j];
  return { m: o, w, h };
}
// org i pre w tym samym rozmiarze (podgląd albo pełne zdjęcie); mo i nauka — z przygotujAM
export function nalozAM(org, pre, przyg, ust = {}) {
  const sila = Math.max(0, Math.min(1, ust.sila ?? DOMYSLNE_AM.sila)), j = Math.max(-1, Math.min(1, ust.jasnosc ?? 0));
  const t = HY.naloz(pre, przyg.nauka, { sila: 1, kolor: ust.kolor ?? DOMYSLNE_AM.kolor, ochronaCiemnych: OCHRONA, mapaOchrony: przyg.mo, minA: -1, minB: 0.5 });
  const st = ocenStyl(t, ust, przyg.mo);
  return wykoncz(org, t, sila, j, st, przyg.mo);
}

// pomiar na zmniejszonym wyniku: wzmocnienia kanałów (balans bieli) i siła „żywości”
export function ocenStyl(img, ust = {}, mo = null) {
  const m = HY.zmniejsz(img, 256), d = m.data, n = m.width * m.height, Lj = [];
  const LIN = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  let sr = 0, sg = 0, sb = 0, k = 0; const As = [], Bs = [], Cm = [], kand = [];
  for (let i = 0; i < n; i++) {
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2], [L, a, bb] = lab8(r, g, b), C = Math.hypot(a, bb);
    if (L > 60 && C < 16) kand.push([L, a, bb, r, g, b]);
    if (C > 12 && L > 20) Cm.push(C);
    if (!mo || probkuj(mo, i % m.width, (i / m.width) | 0, m.width, m.height) < 0.5) Lj.push(L);
  }
  const med = (t) => { t.sort((x, y) => x - y); return t[t.length >> 1]; };
  // biel do balansu: jasne neutralne miejsca bez przepalonych (lampy, okna)
  for (const [L, a, bb, r, g, b] of kand) if (L < 97) { As.push(a); Bs.push(bb); sr += LIN(r); sg += LIN(g); sb += LIN(b); k++; }
  let zyski = [1, 1, 1];
  if (k > n * 0.03) {
    const a0 = med(As), b0 = med(Bs);
    const db = b0 < BIEL_B ? Math.min(3, BIEL_B - b0) : b0 > ZOLTA_MAX ? Math.max(-4, 10 - b0) : 0;
    const da = a0 < 0 ? Math.min(3, BIEL_A - a0) : a0 > 4 ? Math.max(-3, 4 - a0) : 0;
    if (db || da) {
      const R = sr / k, G = sg / k, B = sb / k; // średnia jasna neutralna barwa (liniowo) → ta sama jasność, przesunięte a/b
      const X = (0.412453 * R + 0.35758 * G + 0.180423 * B) / 0.950456, Yl = 0.212671 * R + 0.71516 * G + 0.072169 * B, Z = (0.019334 * R + 0.119193 * G + 0.950227 * B) / 1.088754;
      const q = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116), qi = (t) => (t > 0.206893 ? t * t * t : (t - 16 / 116) / 7.787);
      const fx = q(X) + da / 500, fy = q(Yl), fz = q(Z) - db / 200;
      const X2 = qi(fx) * 0.950456, Z2 = qi(fz) * 1.088754;
      const R2 = 3.240479 * X2 - 1.53715 * Yl - 0.498535 * Z2, G2 = -0.969256 * X2 + 1.875992 * Yl + 0.041556 * Z2, B2 = 0.055648 * X2 - 0.204043 * Yl + 1.057311 * Z2;
      zyski = [R2 / R, G2 / G, B2 / B];
      const sk = 0.212671 * zyski[0] * R / Yl + 0.71516 * zyski[1] * G / Yl + 0.072169 * zyski[2] * B / Yl; // bez zmiany jasności
      zyski = zyski.map((z) => z / sk);
    }
  }
  const cmed = Cm.length > n * 0.03 ? med(Cm) : CEL_NAS;
  const zyw = Math.max(0, Math.min(ZYW_MAX, (CEL_NAS - cmed) / cmed)) * (ust.zywosc ?? 1);
  const lmed = Lj.length > n * 0.2 ? med(Lj) : 100;
  // głęboka czerń: gdy najciemniejsze 2% są szare (> L 6), dociągamy je w dół (tylko cienie poniżej L ~40)
  const Lall = []; for (let i = 0; i < n; i++) Lall.push(lab8(d[i * 4], d[i * 4 + 1], d[i * 4 + 2])[0]);
  Lall.sort((x, y) => x - y); const p2 = Lall[Math.floor(n * 0.02)];
  const czern = p2 > 6 ? Math.min(10, p2 - 5) : 0;
  const eJas = lmed < CEL_L ? Math.max(0.7, Math.log(CEL_L / 100) / Math.log(Math.max(5, lmed) / 100)) : 1;
  return { zyski, zyw, eJas, czern };
}

// odszumienie koloru w rozjaśnionych cieniach + jasność + klarowność + wyostrzenie + siła
export function wykoncz(org, img, sila = 1, jasnosc = 0, st = { zyski: [1, 1, 1], zyw: 0, eJas: 1 }, mo = null) {
  const { width: W, height: H } = img, o = org.data, N = W * H, dl = Math.max(W, H);
  let d = img.data;
  if (st.zyski.some((z) => Math.abs(z - 1) > 0.002)) { // balans bieli: wzmocnienia kanałów w świetle liniowym
    const T = st.zyski.map((z) => { const t = new Uint8ClampedArray(256); for (let i = 0; i < 256; i++) { let c = i / 255; c = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; c = Math.min(1, c * z); t[i] = Math.round(255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055)); } return t; });
    const d2 = new Uint8ClampedArray(d.length);
    for (let i = 0; i < d.length; i += 4) { d2[i] = T[0][d[i]]; d2[i + 1] = T[1][d[i + 1]]; d2[i + 2] = T[2][d[i + 2]]; d2[i + 3] = 255; }
    d = d2;
  }
  const Y = new Float32Array(N), Cb = new Float32Array(N), Cr = new Float32Array(N), Lo = new Float32Array(N);
  for (let p = 0, i = 0; p < N; p++, i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    Y[p] = 0.299 * r + 0.587 * g + 0.114 * b; Cb[p] = b - Y[p]; Cr[p] = r - Y[p];
    Lo[p] = L_Z_LUMY[(0.299 * o[i] + 0.587 * o[i + 1] + 0.114 * o[i + 2]) | 0];
  }
  // odszumienie koloru: tam, gdzie oryginał był ciemny (< L 40), kolor z wygładzonej wersji
  const f = Math.max(2, Math.round(dl / 1024)), sg = Math.max(1, (dl * 0.0012) / f);
  const cb = pomniejszKanal(Cb, W, H, f), cr = pomniejszKanal(Cr, W, H, f), lo = pomniejszKanal(Lo, W, H, f);
  const cbR = HY.rozmyjKanal(cb.m, cb.w, cb.h, sg), crR = HY.rozmyjKanal(cr.m, cr.w, cr.h, sg), loR = HY.rozmyjKanal(lo.m, lo.w, lo.h, 3 / f + 0.5);
  // klarowność: lokalny kontrast w dużej skali (σ ≈ 1% boku), liczony na zmniejszonym obrazie
  const f2 = Math.max(4, Math.round(dl / 256)), yy = pomniejszKanal(Y, W, H, f2), duze = HY.rozmyjKanal(yy.m, yy.w, yy.h, (dl * 0.01) / f2);
  const probka = (k, w, h, x, y, ff) => {
    const fx = Math.max(0, Math.min(w - 1, (x + 0.5) / ff - 0.5)), fy = Math.max(0, Math.min(h - 1, (y + 0.5) / ff - 0.5));
    const x0 = Math.min(w - 2, fx | 0), y0 = Math.min(h - 2, fy | 0), ax = Math.min(1, fx - x0), ay = Math.min(1, fy - y0), i = y0 * w + x0;
    return (k[i] * (1 - ax) + k[i + 1] * ax) * (1 - ay) + (k[i + w] * (1 - ax) + k[i + w + 1] * ax) * ay;
  };
  // wyostrzenie: unsharp mask w małej skali z progiem (bez wzmacniania szumu)
  const male = HY.rozmyjKanal(Y, W, H, Math.max(0.8, dl * 0.0003));
  const e = (st.eJas ?? 1) * 2 ** (-0.6 * jasnosc), JL = new Float32Array(256), jasZmiana = Math.abs(e - 1) > 0.002 || (st.czern ?? 0) > 0;
  const cz = (st.czern ?? 0) / 100;
  const JC = new Float32Array(256); // czarny punkt — także na chronionych (ciemnych) materiałach: przywraca ich głębię
  for (let i = 0; i < 256; i++) { const x = i / 255; JL[i] = (x + (x ** e - x) * smooth((x - 0.04) / 0.16)) * 255; JC[i] = (cz > 0 && x < 0.42 ? Math.max(0, x - cz * (1 - x / 0.42) ** 2 * 1.4) : x) * 255; }
  const out = new Uint8ClampedArray(d.length);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x, i = p * 4;
    const wd = Math.max(0, Math.min(1, (40 - probka(loR, lo.w, lo.h, x, y, f)) / 25));
    let cbv = Cb[p] + (probka(cbR, cb.w, cb.h, x, y, f) - Cb[p]) * wd, crv = Cr[p] + (probka(crR, cr.w, cr.h, x, y, f) - Cr[p]) * wd;
    let yv = Y[p];
    const mv = mo && (st.zyw > 0 || jasZmiana) ? probkuj(mo, x, y, W, H) : 0;
    if (st.zyw > 0) { // żywość: blade kolory mocniej, mocne wcale, ciemne kolorowe materiały (granat) bez zmian
      const Cl = Math.hypot(cbv, crv) / 1.8, w = Math.max(0, Math.min(1, (Cl - 3) / 6)) * Math.max(0, Math.min(1, 1 - Cl / 60)) * (1 - mv);
      const kz = 1 + st.zyw * w; cbv *= kz; crv *= kz;
    }
    const L = L_Z_LUMY[yv < 0 ? 0 : yv > 255 ? 255 : yv | 0], wk = Math.max(0, Math.min(1, L / 25)) * Math.max(0, Math.min(1, (100 - L) / 20));
    yv += KLAR * (yv - probka(duze, yy.w, yy.h, x, y, f2)) * wk;
    let dm = Y[p] - male[p]; const prog = 1.3; dm = dm > prog ? dm - prog : dm < -prog ? dm + prog : 0;
    yv += OSTR * dm;
    let r = yv + crv, b = yv + cbv, g = (yv - 0.299 * r - 0.114 * b) / 0.587;
    if (jasZmiana) { // jasność (automatyczna + suwak), ciemne materiały chronione
      const q = 1 - mv * 0.85;
      // krzywa na jasności, kolory mnożone tym samym współczynnikiem — rozjaśnienie nie odbiera nasycenia
      const Yp = Math.max(1, 0.299 * r + 0.587 * g + 0.114 * b), Yi = Yp > 255 ? 255 : Yp | 0, Y2 = Yi + (JL[Yi] - Yi) * q, Y3 = JC[Y2 > 255 ? 255 : Y2 | 0], k = Y3 / Math.max(1, Yi);
      r *= k; g *= k; b *= k;
    }
    out[i] = o[i] + (r - o[i]) * sila; out[i + 1] = o[i + 1] + (g - o[i + 1]) * sila; out[i + 2] = o[i + 2] + (b - o[i + 2]) * sila; out[i + 3] = 255;
  }
  return { data: out, width: W, height: H };
}
