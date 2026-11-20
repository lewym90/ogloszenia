// Hybryda „Obróbka AI”: z wersji zrobionej przez AI (np. Gemini) bierzemy tylko światło i kolor,
// a piksele, geometria, napisy i drobne przedmioty zostają z oryginału. Czyste funkcje — działają
// w przeglądarce (także w workerze) i w node (testy).
// Obraz = { data: RGBA (Uint8ClampedArray|Uint8Array), width, height }.

export const SIATKA = [9, 12];          // modele koloru: wiersze × kolumny
export const MIN_ZGODNOSC = 0.25;       // poniżej — AI zmieniła kadr albo to inne zdjęcie
const BOK_DOPASOWANIA = 384;            // dłuższy bok obrazów do dopasowania i nauki
export const DOMYSLNE = { sila: 1, kolor: 1.35 };

// ---------- pomocnicze ----------
const LIN = new Float32Array(256);
for (let i = 0; i < 256; i++) { const c = i / 255; LIN[i] = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }
const SRGB = new Uint8ClampedArray(4097);
for (let i = 0; i <= 4096; i++) { const c = i / 4096; SRGB[i] = Math.round(255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055)); }
const doSrgb = (v) => SRGB[v <= 0 ? 0 : v >= 1 ? 4096 : (v * 4096 + 0.5) | 0];
const XN = 0.950456, ZN = 1.088754;
const fLab = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
const fLabOdwr = (t) => (t > 0.206893 ? t * t * t : (t - 16 / 116) / 7.787);

// zmniejszenie przez uśrednianie pól (bez schodków); zwraca obraz o dłuższym boku ≤ maks
export function zmniejsz(img, maks) {
  const { width: W, height: H, data: d } = img;
  const sk = Math.min(1, maks / Math.max(W, H));
  const w = Math.max(1, Math.round(W * sk)), h = Math.max(1, Math.round(H * sk));
  if (w === W && h === H) return img;
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const y0 = Math.floor(y * H / h), y1 = Math.max(y0 + 1, Math.floor((y + 1) * H / h));
    for (let x = 0; x < w; x++) {
      const x0 = Math.floor(x * W / w), x1 = Math.max(x0 + 1, Math.floor((x + 1) * W / w));
      let r = 0, g = 0, b = 0, n = 0;
      for (let yy = y0; yy < y1; yy++) for (let xx = x0, i = (yy * W + x0) * 4; xx < x1; xx++, i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
      const o = (y * w + x) * 4; out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n; out[o + 3] = 255;
    }
  }
  return { data: out, width: w, height: h };
}
function szary(img) {
  const { data: d, width: w, height: h } = img, s = new Float32Array(w * h);
  for (let i = 0, j = 0; j < s.length; i += 4, j++) s[j] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  return s;
}
// rozmycie gaussowskie (rozdzielne), brzegi powielone
function rozmyj(s, w, h, sigma) {
  if (sigma <= 0) return s;
  const r = Math.max(1, Math.ceil(sigma * 3)), k = new Float32Array(2 * r + 1);
  let suma = 0;
  for (let i = -r; i <= r; i++) { k[i + r] = Math.exp(-(i * i) / (2 * sigma * sigma)); suma += k[i + r]; }
  for (let i = 0; i < k.length; i++) k[i] /= suma;
  const t = new Float32Array(w * h), o = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let a = 0; for (let i = -r; i <= r; i++) { const xx = x + i < 0 ? 0 : x + i >= w ? w - 1 : x + i; a += k[i + r] * s[y * w + xx]; } t[y * w + x] = a;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let a = 0; for (let i = -r; i <= r; i++) { const yy = y + i < 0 ? 0 : y + i >= h ? h - 1 : y + i; a += k[i + r] * t[yy * w + x]; } o[y * w + x] = a;
  }
  return o;
}
function gradient(s, w, h) {
  const gx = new Float32Array(w * h), gy = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const xl = x > 0 ? x - 1 : 0, xr = x < w - 1 ? x + 1 : w - 1, yu = y > 0 ? y - 1 : 0, yd = y < h - 1 ? y + 1 : h - 1;
    gx[y * w + x] = (s[y * w + xr] - s[y * w + xl]) / (xr - xl || 1);
    gy[y * w + x] = (s[yd * w + x] - s[yu * w + x]) / (yd - yu || 1);
  }
  return [gx, gy];
}
// mapa krawędzi niezależna od światła: siła gradientu / lokalna średnia siła
function mapaKrawedzi(img) {
  const { width: w, height: h } = img;
  const s = rozmyj(szary(img), w, h, 1);
  const [gx, gy] = gradient(s, w, h), m = new Float32Array(w * h);
  for (let i = 0; i < m.length; i++) m[i] = Math.hypot(gx[i], gy[i]);
  const tlo = rozmyj(m, w, h, Math.max(3, w / 40));
  for (let i = 0; i < m.length; i++) m[i] /= tlo[i] + 2;
  return rozmyj(m, w, h, 0.8);
}
function probka(s, w, h, x, y) {
  if (x < 0 || y < 0 || x > w - 1 || y > h - 1) return NaN;
  const x0 = Math.min(w - 2, x | 0), y0 = Math.min(h - 2, y | 0), fx = x - x0, fy = y - y0, i = y0 * w + x0;
  return (s[i] * (1 - fx) + s[i + 1] * fx) * (1 - fy) + (s[i + w] * (1 - fx) + s[i + w + 1] * fx) * fy;
}
function normujMape(m) {
  let s = 0, s2 = 0; for (const v of m) { s += v; s2 += v * v; }
  const sr = s / m.length, sd = Math.sqrt(Math.max(1e-9, s2 / m.length - sr * sr)), o = new Float32Array(m.length);
  for (let i = 0; i < m.length; i++) o[i] = (m[i] - sr) / sd;
  return o;
}

// ---------- 1. dopasowanie: przekształcenie afiniczne we współrzędnych względnych (0..1) ----------
// [ua, va] = [a0*u + a1*v + a2, a3*u + a4*v + a5] — gdzie punkt oryginału leży na obrazie AI
function nalozAI(mapaA, wa, ha, p, w, h) {
  const o = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = (x + 0.5) / w, v = (y + 0.5) / h;
    o[y * w + x] = probka(mapaA, wa, ha, (p[0] * u + p[1] * v + p[2]) * wa - 0.5, (p[3] * u + p[4] * v + p[5]) * ha - 0.5);
  }
  return o;
}
function korelacja(a, b) {
  let n = 0, sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0;
  for (let i = 0; i < a.length; i++) { const x = a[i], y = b[i]; if (Number.isNaN(y)) continue; n++; sa += x; sb += y; saa += x * x; sbb += y * y; sab += x * y; }
  if (n < 50) return 0;
  const cov = sab / n - (sa / n) * (sb / n), va = saa / n - (sa / n) ** 2, vb = sbb / n - (sb / n) ** 2;
  return cov / Math.sqrt(Math.max(1e-12, va * vb));
}
export function dopasuj(org, ai) {
  let p = [1, 0, 0, 0, 1, 0];
  for (const bok of [64, 128, 256, BOK_DOPASOWANIA]) {
    const O = zmniejsz(org, bok), A = zmniejsz(ai, bok);
    const fo = normujMape(mapaKrawedzi(O)), fa = normujMape(mapaKrawedzi(A));
    const { width: w, height: h } = O, { width: wa, height: ha } = A;
    const [gxa, gya] = gradient(fa, wa, ha);
    for (let it = 0; it < (bok === 64 ? 40 : 15); it++) {
      const H = new Float64Array(36), g = new Float64Array(6);
      let n = 0, sumr = 0;
      const res = [];
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        const u = (x + 0.5) / w, v = (y + 0.5) / h;
        const xa = (p[0] * u + p[1] * v + p[2]) * wa - 0.5, ya = (p[3] * u + p[4] * v + p[5]) * ha - 0.5;
        const val = probka(fa, wa, ha, xa, ya);
        if (Number.isNaN(val)) continue;
        res.push(Math.abs(val - fo[y * w + x]));
      }
      res.sort((a, b) => a - b);
      const prog = Math.max(0.3, (res[res.length >> 1] || 1) * 1.5); // Huber
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        const u = (x + 0.5) / w, v = (y + 0.5) / h;
        const xa = (p[0] * u + p[1] * v + p[2]) * wa - 0.5, ya = (p[3] * u + p[4] * v + p[5]) * ha - 0.5;
        const val = probka(fa, wa, ha, xa, ya);
        if (Number.isNaN(val)) continue;
        const r = val - fo[y * w + x], wg = Math.abs(r) <= prog ? 1 : prog / Math.abs(r);
        const dx = probka(gxa, wa, ha, xa, ya) * wa, dy = probka(gya, wa, ha, xa, ya) * ha;
        const J = [dx * u, dx * v, dx, dy * u, dy * v, dy];
        for (let a = 0; a < 6; a++) { g[a] += wg * J[a] * r; for (let b = a; b < 6; b++) H[a * 6 + b] += wg * J[a] * J[b]; }
        n++; sumr += r * r;
      }
      if (n < 100) break;
      for (let a = 0; a < 6; a++) for (let b = 0; b < a; b++) H[a * 6 + b] = H[b * 6 + a];
      for (let a = 0; a < 6; a++) H[a * 6 + a] *= 1.0001; H[0] += 1e-6; // stabilizacja
      const d = rozwiaz(H, g, 6);
      if (!d) break;
      let maks = 0;
      for (let a = 0; a < 6; a++) { p[a] -= d[a]; maks = Math.max(maks, Math.abs(d[a])); }
      if (maks < 1e-5) break;
    }
  }
  const O = zmniejsz(org, BOK_DOPASOWANIA), A = zmniejsz(ai, BOK_DOPASOWANIA);
  const fo = mapaKrawedzi(O), fa = nalozAI(mapaKrawedzi(A), A.width, A.height, p, O.width, O.height);
  return { p, zgodnosc: korelacja(fo, fa), skala: Math.sqrt(Math.abs(p[0] * p[4] - p[1] * p[3])) };
}
// eliminacja Gaussa z wyborem elementu głównego
function rozwiaz(A, b, n, m = 1) {
  const M = new Float64Array(n * (n + m));
  for (let i = 0; i < n; i++) { for (let j = 0; j < n; j++) M[i * (n + m) + j] = A[i * n + j]; for (let k = 0; k < m; k++) M[i * (n + m) + n + k] = b[i * m + k]; }
  const s = n + m;
  for (let c = 0; c < n; c++) {
    let pv = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r * s + c]) > Math.abs(M[pv * s + c])) pv = r;
    if (Math.abs(M[pv * s + c]) < 1e-14) return null;
    if (pv !== c) for (let j = 0; j < s; j++) { const t = M[c * s + j]; M[c * s + j] = M[pv * s + j]; M[pv * s + j] = t; }
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r * s + c] / M[c * s + c]; if (!f) continue;
      for (let j = c; j < s; j++) M[r * s + j] -= f * M[c * s + j];
    }
  }
  const x = new Float64Array(n * m);
  for (let i = 0; i < n; i++) for (let k = 0; k < m; k++) x[i * m + k] = M[i * s + n + k] / M[i * s + i];
  return x;
}

// ---------- 2. nauka: lokalne modele koloru (siatka 9×12, wielomian 2. stopnia RGB) ----------
const CECHY = 10;
function cechy(r, g, b, f) { f[0] = 1; f[1] = r; f[2] = g; f[3] = b; f[4] = r * r; f[5] = g * g; f[6] = b * b; f[7] = r * g; f[8] = g * b; f[9] = r * b; }
// lokalna zgodność krawędzi (gdzie AI niczego nie przesunęła ani nie zmyśliła) → waga 0..1
function zgodnoscLokalna(a, b, w, h, okno) {
  const sig = okno / 2.5, N = (x) => rozmyj(x, w, h, sig);
  const bb = b.map((v) => (Number.isNaN(v) ? 0 : v)), ok = b.map((v) => (Number.isNaN(v) ? 0 : 1));
  const ma = N(a), mb = N(bb), mab = N(a.map((v, i) => v * bb[i])), maa = N(a.map((v) => v * v)), mbb = N(bb.map((v) => v * v)), mok = N(ok);
  const q = new Float32Array(w * h);
  for (let i = 0; i < q.length; i++) {
    const cov = mab[i] - ma[i] * mb[i], va = maa[i] - ma[i] ** 2, vb = mbb[i] - mb[i] ** 2;
    const ncc = cov / Math.sqrt(Math.max(1e-6, va * vb));
    q[i] = mok[i] > 0.99 ? Math.max(0, Math.min(1, ncc)) ** 2 : 0;
  }
  return q;
}
export function naucz(org, ai, dop, lam = 1.0) {
  const [gy, gx] = SIATKA, p = dop.p;
  const O = zmniejsz(org, BOK_DOPASOWANIA), A = zmniejsz(ai, Math.round(BOK_DOPASOWANIA * 1.5));
  const { width: w, height: h } = O, { width: wa, height: ha } = A;
  // kolory AI w punktach oryginału
  const kanaly = [0, 1, 2].map((c) => { const s = new Float32Array(wa * ha); for (let i = 0; i < s.length; i++) s[i] = A.data[i * 4 + c] / 255; return s; });
  const Y = new Float32Array(w * h * 3), F = new Float32Array(w * h * CECHY), f = new Float64Array(CECHY);
  const krawA = new Float32Array(w * h).fill(NaN);
  const mA = mapaKrawedzi(A);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, u = (x + 0.5) / w, v = (y + 0.5) / h;
    const xa = (p[0] * u + p[1] * v + p[2]) * wa - 0.5, ya = (p[3] * u + p[4] * v + p[5]) * ha - 0.5;
    for (let c = 0; c < 3; c++) Y[i * 3 + c] = probka(kanaly[c], wa, ha, xa, ya);
    krawA[i] = probka(mA, wa, ha, xa, ya);
    cechy(O.data[i * 4] / 255, O.data[i * 4 + 1] / 255, O.data[i * 4 + 2] / 255, f);
    for (let k = 0; k < CECHY; k++) F[i * CECHY + k] = f[k];
  }
  const q = zgodnoscLokalna(mapaKrawedzi(O), krawA, w, h, Math.max(5, Math.round(w / 50)));
  for (let i = 0; i < w * h; i++) if (Number.isNaN(Y[i * 3])) q[i] = 0;
  const dopasujModel = (wagi, lamb, przyciag) => {
    const AtA = new Float64Array(CECHY * CECHY), AtY = new Float64Array(CECHY * 3);
    for (let i = 0; i < w * h; i++) {
      const wg = wagi(i); if (!(wg > 1e-6)) continue;
      const o = i * CECHY;
      for (let a = 0; a < CECHY; a++) {
        const fa = F[o + a] * wg;
        for (let b = a; b < CECHY; b++) AtA[a * CECHY + b] += fa * F[o + b];
        for (let c = 0; c < 3; c++) AtY[a * 3 + c] += fa * Y[i * 3 + c];
      }
    }
    for (let a = 0; a < CECHY; a++) for (let b = 0; b < a; b++) AtA[a * CECHY + b] = AtA[b * CECHY + a];
    for (let a = 0; a < CECHY; a++) { AtA[a * CECHY + a] += lamb; for (let c = 0; c < 3; c++) AtY[a * 3 + c] += lamb * (przyciag ? przyciag[a * 3 + c] : 0); }
    return rozwiaz(AtA, AtY, CECHY, 3);
  };
  const tozsamosc = new Float64Array(CECHY * 3); tozsamosc[1 * 3 + 0] = 1; tozsamosc[2 * 3 + 1] = 1; tozsamosc[3 * 3 + 2] = 1;
  const Mg = dopasujModel((i) => q[i], lam * 0.1, tozsamosc) || tozsamosc;
  const modele = new Float32Array(gy * gx * CECHY * 3);
  const ch = h / gy, cw = w / gx;
  for (let r = 0; r < gy; r++) for (let c = 0; c < gx; c++) {
    const cy = (r + 0.5) * ch, cx = (c + 0.5) * cw;
    const wagi = (i) => { const y = (i / w) | 0, x = i - y * w, dy = (y + 0.5 - cy) / ch, dx = (x + 0.5 - cx) / cw, d2 = dy * dy + dx * dx; return d2 > 9 ? 0 : Math.exp(-d2) * q[i]; };
    const m = dopasujModel(wagi, lam, Mg) || Mg;
    modele.set(m, (r * gx + c) * CECHY * 3);
  }
  let pokrycie = 0; for (const v of q) pokrycie += v > 0.25 ? 1 : 0;
  return { modele, siatka: [gy, gx], pokrycie: pokrycie / q.length };
}

// ---------- 3. nałożenie: światło z AI, kolory materiałów z oryginału (z limitem) ----------
const COS5 = Math.cos((5 * Math.PI) / 180), SIN5 = Math.sin((5 * Math.PI) / 180);
// org → nowy obraz tej samej wielkości; ustawienia: sila 0..1 (ile obróbki), kolor 1..1.8 (o ile żywsze mogą być kolory)
export function naloz(org, nauka, ust = {}) {
  const sila = Math.max(0, Math.min(1, ust.sila ?? DOMYSLNE.sila)), kolor = Math.max(1, Math.min(1.8, ust.kolor ?? DOMYSLNE.kolor));
  const { width: W, height: H, data: d } = org, [gy, gx] = nauka.siatka, M = nauka.modele, K = CECHY * 3;
  const out = new Uint8ClampedArray(W * H * 4);
  const wiersz = new Float32Array(gx * K), f = new Float64Array(CECHY);
  for (let y = 0; y < H; y++) {
    // modele interpolowane między środkami pól (najpierw w pionie dla całego wiersza)
    const ry = Math.max(0, Math.min(gy - 1, ((y + 0.5) / H) * gy - 0.5)), r0 = Math.min(gy - 2, ry | 0), fy = Math.max(0, Math.min(1, ry - r0));
    for (let c = 0; c < gx; c++) for (let k = 0; k < K; k++) wiersz[c * K + k] = M[(r0 * gx + c) * K + k] * (1 - fy) + M[((r0 + 1) * gx + c) * K + k] * fy;
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const R = d[i], G = d[i + 1], B = d[i + 2];
      const rx = Math.max(0, Math.min(gx - 1, ((x + 0.5) / W) * gx - 0.5)), c0 = Math.min(gx - 2, rx | 0), fx = Math.max(0, Math.min(1, rx - c0));
      cechy(R / 255, G / 255, B / 255, f);
      let tr = 0, tg = 0, tb = 0;
      const a0 = c0 * K, a1 = (c0 + 1) * K;
      for (let k = 0; k < CECHY; k++) {
        const fk = f[k];
        tr += fk * (wiersz[a0 + k * 3] * (1 - fx) + wiersz[a1 + k * 3] * fx);
        tg += fk * (wiersz[a0 + k * 3 + 1] * (1 - fx) + wiersz[a1 + k * 3 + 1] * fx);
        tb += fk * (wiersz[a0 + k * 3 + 2] * (1 - fx) + wiersz[a1 + k * 3 + 2] * fx);
      }
      // Lab oryginału i światła z AI
      const [Lo, Ao, Bo] = lab(LIN[R], LIN[G], LIN[B]);
      const [Lt, At, Bt] = lab(lin01(tr), lin01(tg), lin01(tb));
      const Co = Math.hypot(Ao, Bo), Ct = Math.hypot(At, Bt);
      // barwne materiały: odcień z oryginału (najwyżej ±5°), nasycenie rośnie z jasnością, ale z limitem
      const kom = Math.max(1, Math.min(1.8, (Lt + 5) / (Lo + 5)));
      const Cc = Math.min(Ct, Co * kom * kolor + 1);
      let ux = 1, uy = 0;
      if (Co > 1e-6) {
        const ox = Ao / Co, oy = Bo / Co;
        if (Ct > 1e-6) {
          const tx = At / Ct, ty = Bt / Ct, cos = ox * tx + oy * ty, sin = ox * ty - oy * tx;
          if (cos >= COS5) { ux = tx; uy = ty; } else { const s = sin >= 0 ? SIN5 : -SIN5; ux = ox * COS5 - oy * s; uy = ox * s + oy * COS5; }
        } else { ux = ox; uy = oy; }
      }
      const Am = Cc * ux, Bm = Cc * uy;
      // biel i szarości (ściany, sufit, rolety): kolor z AI, najwyżej ciepły krem
      const neu = Math.max(0, Math.min(1, (12 - Co) / 6));
      const An = Math.max(-3, Math.min(4, At)), Bn = Math.max(-2, Math.min(9, Bt));
      const [r, g, b] = rgb(Math.max(0, Math.min(100, Lt)), neu * An + (1 - neu) * Am, neu * Bn + (1 - neu) * Bm);
      out[i] = R + (r - R) * sila; out[i + 1] = G + (g - G) * sila; out[i + 2] = B + (b - B) * sila; out[i + 3] = 255;
    }
  }
  return { data: out, width: W, height: H };
}
function lin01(v) { v = v < 0 ? 0 : v > 1 ? 1 : v; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }
function lab(r, g, b) {
  const X = (0.412453 * r + 0.357580 * g + 0.180423 * b) / XN, Y = 0.212671 * r + 0.715160 * g + 0.072169 * b, Z = (0.019334 * r + 0.119193 * g + 0.950227 * b) / ZN;
  const fx = fLab(X), fy = fLab(Y), fz = fLab(Z);
  return [Y > 0.008856 ? 116 * fy - 16 : 903.3 * Y, 500 * (fx - fy), 200 * (fy - fz)];
}
function rgb(L, a, b) {
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
  const X = fLabOdwr(fx) * XN, Y = L > 8 ? fy * fy * fy : L / 903.3, Z = fLabOdwr(fz) * ZN;
  return [
    doSrgb(3.240479 * X - 1.537150 * Y - 0.498535 * Z),
    doSrgb(-0.969256 * X + 1.875992 * Y + 0.041556 * Z),
    doSrgb(0.055648 * X - 0.204043 * Y + 1.057311 * Z),
  ];
}

// całość: dopasowanie + nauka; rzuca błąd z ludzkim opisem, jeśli AI zmieniła kadr
export function przygotuj(org, ai) {
  const ro = org.width / org.height, ra = ai.width / ai.height;
  if (Math.abs(Math.log(ro / ra)) > 0.2) throw new Error('Wynik z AI ma inne proporcje niż zdjęcie — AI przycięła albo zmieniła kadr. Poproś o ten sam kadr i spróbuj jeszcze raz.');
  const dop = dopasuj(org, ai);
  if (dop.zgodnosc < MIN_ZGODNOSC || dop.skala < 0.7 || dop.skala > 1.4) throw new Error('Nie da się dopasować wyniku z AI do zdjęcia — to inne zdjęcie albo AI za mocno zmieniła kadr.');
  const nauka = naucz(org, ai, dop);
  return { ...nauka, zgodnosc: dop.zgodnosc, p: dop.p };
}
