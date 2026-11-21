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
  return wykoncz(org, t, sila, j);
}

// odszumienie koloru w rozjaśnionych cieniach + jasność + klarowność + wyostrzenie + siła
export function wykoncz(org, img, sila = 1, jasnosc = 0) {
  const { width: W, height: H } = img, d = img.data, o = org.data, N = W * H, dl = Math.max(W, H);
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
  const e = 2 ** (-0.6 * jasnosc), JL = new Float32Array(256);
  for (let i = 0; i < 256; i++) { const x = i / 255; JL[i] = (x + (x ** e - x) * smooth((x - 0.04) / 0.16)) * 255; }
  const out = new Uint8ClampedArray(d.length);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x, i = p * 4;
    const wd = Math.max(0, Math.min(1, (40 - probka(loR, lo.w, lo.h, x, y, f)) / 25));
    const cbv = Cb[p] + (probka(cbR, cb.w, cb.h, x, y, f) - Cb[p]) * wd, crv = Cr[p] + (probka(crR, cr.w, cr.h, x, y, f) - Cr[p]) * wd;
    let yv = Y[p];
    const L = L_Z_LUMY[yv < 0 ? 0 : yv > 255 ? 255 : yv | 0], wk = Math.max(0, Math.min(1, L / 25)) * Math.max(0, Math.min(1, (100 - L) / 20));
    yv += 0.18 * (yv - probka(duze, yy.w, yy.h, x, y, f2)) * wk;
    let dm = Y[p] - male[p]; const prog = 1.3; dm = dm > prog ? dm - prog : dm < -prog ? dm + prog : 0;
    yv += 0.6 * dm;
    let r = yv + crv, b = yv + cbv, g = (yv - 0.299 * r - 0.114 * b) / 0.587;
    if (jasnosc) { r = JL[r < 0 ? 0 : r > 255 ? 255 : r | 0]; g = JL[g < 0 ? 0 : g > 255 ? 255 : g | 0]; b = JL[b < 0 ? 0 : b > 255 ? 255 : b | 0]; }
    out[i] = o[i] + (r - o[i]) * sila; out[i + 1] = o[i + 1] + (g - o[i + 1]) * sila; out[i + 2] = o[i + 2] + (b - o[i + 2]) * sila; out[i + 3] = 255;
  }
  return { data: out, width: W, height: H };
}
