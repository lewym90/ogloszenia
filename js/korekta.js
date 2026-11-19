// Uczciwa korekta zdjęć: jasność, cienie, balans bieli, prostowanie, piony i kadr.
// Tylko operacje na całym obrazie — nic nie jest dorysowywane ani usuwane (bez retuszu).
// Czyste funkcje na danych pikseli (Uint8ClampedArray RGBA) — działają w przeglądarce i w Node (testy).

export const DOMYSLNE = Object.freeze({ ev: 0, cienie: 0, temp: 0, odcien: 0, obrot: 0, piony: 0, proporcje: 'org', zoom: 1, px: 0, py: 0 });
export const ZAKRES = { ev: [-1.5, 1.5], cienie: [0, 1], temp: [-1, 1], odcien: [-1, 1], obrot: [-10, 10], piony: [-0.4, 0.4], zoom: [0.5, 1] };
export const PROPORCJE = { org: 'Jak zdjęcie', '4:3': '4:3', '3:2': '3:2', '16:9': '16:9' };
const T_TEMP = 0.6, T_ODCIEN = 0.3;

export function normuj(p) {
  const w = { ...DOMYSLNE, ...(p || {}) };
  for (const [k, [a, b]] of Object.entries(ZAKRES)) { const v = Number(w[k]); w[k] = Number.isFinite(v) ? Math.min(b, Math.max(a, v)) : DOMYSLNE[k]; }
  if (!PROPORCJE[w.proporcje]) w.proporcje = 'org';
  for (const k of ['px', 'py']) { const v = Number(w[k]); w[k] = Number.isFinite(v) ? Math.max(-1, Math.min(1, v)) : 0; }
  return w;
}
// czy parametry cokolwiek zmieniają
export function zmienia(p) {
  const w = normuj(p);
  return Math.abs(w.ev) > 0.005 || w.cienie > 0.005 || Math.abs(w.temp) > 0.005 || Math.abs(w.odcien) > 0.005 || Math.abs(w.obrot) > 0.01 || Math.abs(w.piony) > 0.0005
    || w.proporcje !== 'org' || w.zoom < 0.999 || Math.abs(w.px) > 0.0005 || Math.abs(w.py) > 0.0005;
}
// opis dla człowieka: „jasność, balans bieli, piony”
export function opisKorekty(p) {
  const w = normuj(p), c = [];
  if (Math.abs(w.ev) > 0.005 || w.cienie > 0.005) c.push('jasność');
  if (Math.abs(w.temp) > 0.005 || Math.abs(w.odcien) > 0.005) c.push('balans bieli');
  if (Math.abs(w.obrot) > 0.01 || Math.abs(w.piony) > 0.0005) c.push('piony');
  if (w.proporcje !== 'org' || w.zoom < 0.999 || Math.abs(w.px) > 0.0005 || Math.abs(w.py) > 0.0005) c.push('kadr');
  return c.join(', ');
}

// ---------- macierze 3×3 (wierszami) ----------
export const mnoz = (a, b) => [0, 1, 2].flatMap((i) => [0, 1, 2].map((j) => a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j]));
export function odwroc(m) {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-15) throw new Error('Macierz nieodwracalna');
  const r = [A, -(b * i - c * h), b * f - c * e, B, a * i - c * g, -(a * f - c * d), C, -(a * h - b * g), a * e - b * d];
  return r.map((x) => x / det);
}
export function zastosuj(m, x, y) {
  const w = m[6] * x + m[7] * y + m[8];
  return [(m[0] * x + m[1] * y + m[2]) / w, (m[3] * x + m[4] * y + m[5]) / w, w];
}
// homografia z 4 punktów (z → do), rozwiązanie układu 8×8
export function homografia(z, d) {
  const A = [], bb = [];
  for (let k = 0; k < 4; k++) {
    const [x, y] = z[k], [u, v] = d[k];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); bb.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); bb.push(v);
  }
  const n = 8;
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]]; [bb[c], bb[p]] = [bb[p], bb[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      if (!f) continue;
      for (let k = c; k < n; k++) A[r][k] -= f * A[c][k];
      bb[r] -= f * bb[c];
    }
  }
  return [...bb.map((v, i) => v / A[i][i]), 1];
}

// przekształcenie geometryczne: najpierw obrót wokół środka, potem piony (trapez → prostokąt)
export function przeksztalcenie(W, H, p) {
  const a = (p.obrot * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), cx = W / 2, cy = H / 2;
  const R = [c, -s, cx - c * cx + s * cy, s, c, cy - s * cx - c * cy, 0, 0, 1];
  const k = p.piony * W / 2;
  const P = Math.abs(p.piony) < 1e-6 ? [1, 0, 0, 0, 1, 0, 0, 0, 1]
    : homografia([[k, 0], [W - k, 0], [W, H], [0, H]], [[0, 0], [W, 0], [W, H], [0, H]]);
  const F = mnoz(P, R);
  return { F, odw: odwroc(F) };
}
export function stosunek(W, H, proporcje) {
  if (proporcje === 'org' || !PROPORCJE[proporcje]) return W / H;
  const [a, b] = proporcje.split(':').map(Number);
  return W >= H ? a / b : b / a;
}
// kadr w płaszczyźnie po korekcie: największy prostokąt o danych proporcjach mieszczący się w zdjęciu, × zoom, przesunięty o px/py
export function kadr(W, H, p0) {
  const p = normuj(p0);
  const { F, odw } = przeksztalcenie(W, H, p);
  const A = stosunek(W, H, p.proporcje);
  const eps = 1e-6 * Math.max(W, H);
  const wSrodku = (x, y) => { const [u, v, w] = zastosuj(odw, x, y); return w > 0 && u >= -eps && v >= -eps && u <= W + eps && v <= H + eps; };
  const miesci = (cx, cy, w) => { const h = w / A; return wSrodku(cx - w / 2, cy - h / 2) && wSrodku(cx + w / 2, cy - h / 2) && wSrodku(cx + w / 2, cy + h / 2) && wSrodku(cx - w / 2, cy + h / 2); };
  const [c0x, c0y] = zastosuj(F, W / 2, H / 2);
  let lo = 0, hi = 4 * Math.max(W, H * A);
  for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (miesci(c0x, c0y, m)) lo = m; else hi = m; }
  const w = lo * p.zoom, h = w / A;
  // przesunięcie: px/py w ułamku szerokości/wysokości zdjęcia, przycięte do granicy
  const dx = p.px * W, dy = p.py * H;
  let t = 1;
  if (!miesci(c0x + dx, c0y + dy, w)) { let a = 0, b = 1; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (miesci(c0x + dx * m, c0y + dy * m, w)) a = m; else b = m; } t = a; }
  const cx = c0x + dx * t, cy = c0y + dy * t;
  return { x: cx - w / 2, y: cy - h / 2, w, h, px: p.px * t, py: p.py * t, maks: lo, F, odw };
}
// rozmiar wyniku: wymiary kadru (bez powiększania ponad zdjęcie), dłuższy bok najwyżej `maks`
export function rozmiarWyniku(W, H, p, maks = 2560) {
  const k = kadr(W, H, p);
  const sk = Math.min(1, maks / Math.max(k.w, k.h));
  return [Math.max(1, Math.round(k.w * sk)), Math.max(1, Math.round(k.h * sk))];
}

// ---------- kolor ----------
const doLin = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const doSrgb = (v) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);
export function wzmocnienia(p) {
  let r = Math.exp(T_TEMP * p.temp), g = Math.exp(-T_ODCIEN * p.odcien), b = Math.exp(-T_TEMP * p.temp);
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b; // jasność bez zmian — temperatura zmienia tylko barwę
  return [r / y, g / y, b / y];
}
// tablice: wartość wejściowa ×4 (0..1020) → bajt wyjściowy, osobno dla R, G, B
export function tablice(p0) {
  const p = normuj(p0), wz = wzmocnienia(p), e = 2 ** p.ev;
  return wz.map((g) => {
    const t = new Uint8ClampedArray(1021);
    for (let i = 0; i <= 1020; i++) {
      let y = Math.min(1, doLin(i / 1020) * g); // balans bieli: zwykłe mnożenie kanału
      y = e > 1 ? (y * e) / (1 + y * (e - 1)) : y * e; // rozjaśnianie bez przepalania jasnych miejsc
      y = doSrgb(Math.min(1, y));
      if (p.cienie) y += p.cienie * 1.5 * y * (1 - y) * (1 - y); // podniesienie cieni, jasne bez zmian
      t[i] = Math.round(Math.min(1, Math.max(0, y)) * 255);
    }
    return t;
  });
}

// ---------- obróbka ----------
// src: {data, width, height}; zwraca {data, width, height} o wymiarach outW×outH
export function obrob(src, p0, outW, outH) {
  const p = normuj(p0), W = src.width, H = src.height, d = src.data;
  const k = kadr(W, H, p);
  if (!outW) [outW, outH] = rozmiarWyniku(W, H, p, Math.max(W, H));
  const [LR, LG, LB] = tablice(p);
  const sx = k.w / outW, sy = k.h / outH;
  // piksel wyniku (i, j) → punkt w płaszczyźnie po korekcie → piksel źródła
  const C = [sx, 0, k.x + sx / 2, 0, sy, k.y + sy / 2, 0, 0, 1];
  const M = mnoz(k.odw, C);
  const out = new Uint8ClampedArray(outW * outH * 4);
  const maxX = W - 1, maxY = H - 1;
  let o = 0;
  for (let j = 0; j < outH; j++) {
    let X = M[1] * j + M[2], Y = M[4] * j + M[5], Z = M[7] * j + M[8];
    for (let i = 0; i < outW; i++, X += M[0], Y += M[3], Z += M[6], o += 4) {
      let u = X / Z - 0.5, v = Y / Z - 0.5;
      if (u < 0) u = 0; else if (u > maxX) u = maxX;
      if (v < 0) v = 0; else if (v > maxY) v = maxY;
      const x0 = u | 0, y0 = v | 0, fx = u - x0, fy = v - y0;
      const x1 = x0 < maxX ? x0 + 1 : x0, y1 = y0 < maxY ? y0 + 1 : y0;
      const a = (y0 * W + x0) * 4, b = (y0 * W + x1) * 4, c = (y1 * W + x0) * 4, e = (y1 * W + x1) * 4;
      const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
      out[o] = LR[((d[a] * w00 + d[b] * w10 + d[c] * w01 + d[e] * w11) * 4 + 0.5) | 0];
      out[o + 1] = LG[((d[a + 1] * w00 + d[b + 1] * w10 + d[c + 1] * w01 + d[e + 1] * w11) * 4 + 0.5) | 0];
      out[o + 2] = LB[((d[a + 2] * w00 + d[b + 2] * w10 + d[c + 2] * w01 + d[e + 2] * w11) * 4 + 0.5) | 0];
      out[o + 3] = 255;
    }
  }
  return { data: out, width: outW, height: outH };
}

// ---------- automatyczne ustawienia ----------
// src: zmniejszone zdjęcie (dłuższy bok ok. 500 px). Zwraca parametry; geometrię tylko, gdy zdjęcie ma wyraźne pionowe krawędzie.
export function analiza(src) {
  const g = pionyAuto(src);
  // druga runda na wyprostowanym obrazie — filtr krawędzi zaniża duże kąty
  if (g.obrot || g.piony) {
    const r = pionyAuto(obrob(src, g, src.width, src.height));
    g.obrot = Math.round(Math.max(-8, Math.min(8, g.obrot + r.obrot)) * 100) / 100;
    g.piony = Math.round(Math.max(-0.3, Math.min(0.3, g.piony + r.piony)) * 1000) / 1000;
  }
  return { ...DOMYSLNE, ...kolorAuto(src), ...g };
}
export function kolorAuto(src) {
  const d = src.data, n = src.width * src.height;
  // balans bieli: średnia z jasnych i średnich, mało nasyconych miejsc (ściany, sufity)
  let sr = 0, sg = 0, sb = 0, ile = 0, ar = 0, ag = 0, ab = 0, ileW = 0;
  const krok = Math.max(1, Math.floor(n / 60000));
  for (let q = 0; q < n; q += krok) {
    const r = d[q * 4] / 255, g = d[q * 4 + 1] / 255, b = d[q * 4 + 2] / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx > 0.97 || mx < 0.12) continue;
    const R = doLin(r), G = doLin(g), B = doLin(b);
    ar += R; ag += G; ab += B; ileW++;
    if ((mx - mn) / mx < 0.3) { sr += R; sg += G; sb += B; ile++; }
  }
  const wynik = { temp: 0, odcien: 0, ev: 0, cienie: 0 };
  if (ile < ileW * 0.05) { sr = ar; sg = ag; sb = ab; ile = ileW; }
  if (ile > 50) {
    // wz_r / wz_b = sb / sr → 2·T·temp = ln(sb/sr); zielony względem średniej geometrycznej R i B
    wynik.temp = Math.max(-1, Math.min(1, Math.log(sb / sr) / (2 * T_TEMP)));
    const gDocel = Math.sqrt(sr * sb) / sg; // ile trzeba pomnożyć zielony
    wynik.odcien = Math.max(-1, Math.min(1, -Math.log(gDocel) / T_ODCIEN));
    if (Math.abs(wynik.temp) < 0.03) wynik.temp = 0;
    if (Math.abs(wynik.odcien) < 0.03) wynik.odcien = 0;
  }
  // jasność: mediana luminancji po balansie bieli → cel ok. 0,18 (liniowo)
  const wz = wzmocnienia(normuj(wynik));
  const lum = [];
  for (let q = 0; q < n; q += krok) lum.push(0.2126 * wz[0] * doLin(d[q * 4] / 255) + 0.7152 * wz[1] * doLin(d[q * 4 + 1] / 255) + 0.0722 * wz[2] * doLin(d[q * 4 + 2] / 255));
  lum.sort((a, b) => a - b);
  const med = lum[lum.length >> 1] || 0.18;
  const md = Math.max(0.005, Math.min(0.95, med));
  // przy rozjaśnianiu krzywa łagodzi jasne miejsca: x·m/(1+x(m−1)) = 0,18 → m = 0,18(1−x)/(0,82·x)
  // jasne wnętrza (białe ściany) zostają jasne: przyciemniamy tylko wyraźnie prześwietlone zdjęcia, i to lekko
  let ev = md < 0.18 ? Math.log2((0.18 * (1 - md)) / (0.82 * md)) : md > 0.45 ? Math.log2(0.45 / md) : 0;
  ev = Math.max(-0.5, Math.min(1.5, ev));
  wynik.ev = Math.abs(ev) < 0.08 ? 0 : Math.round(ev * 100) / 100;
  // cienie: gdy dolna ćwiartka bardzo ciemna
  const q1 = doSrgb(Math.min(1, lum[lum.length >> 2] * 2 ** wynik.ev));
  if (q1 < 0.2) wynik.cienie = Math.round(Math.min(0.6, (0.2 - q1) * 3) * 100) / 100;
  return wynik;
}
// rozmycie Gaussa [1 4 6 4 1]/16 w poziomie i pionie (w miejscu)
function rozmyj(a, W, H) {
  const t = new Float32Array(a.length), k = [1, 4, 6, 4, 1];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let s = 0; for (let i = -2; i <= 2; i++) s += k[i + 2] * a[y * W + Math.min(W - 1, Math.max(0, x + i))]; t[y * W + x] = s / 16; }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let s = 0; for (let i = -2; i <= 2; i++) s += k[i + 2] * t[Math.min(H - 1, Math.max(0, y + i)) * W + x]; a[y * W + x] = s / 16; }
}
// prostowanie i piony z nachylenia pionowych krawędzi: kąt = a + b·(x − środek)
export function pionyAuto(src) {
  const W = src.width, H = src.height, d = src.data;
  const sz = new Float32Array(W * H);
  for (let q = 0; q < W * H; q++) sz[q] = 0.299 * d[q * 4] + 0.587 * d[q * 4 + 1] + 0.114 * d[q * 4 + 2];
  rozmyj(sz, W, H); rozmyj(sz, W, H); // schodki na krawędziach (JPEG, zmniejszanie) zamieniają się w gładkie skosy
  const xs = [], ts = [], ws = [];
  const tanMax = Math.tan((20 * Math.PI) / 180);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const q = y * W + x;
    const gx = (sz[q - W + 1] + 2 * sz[q + 1] + sz[q + W + 1]) - (sz[q - W - 1] + 2 * sz[q - 1] + sz[q + W - 1]);
    const gy = (sz[q + W - 1] + 2 * sz[q + W] + sz[q + W + 1]) - (sz[q - W - 1] + 2 * sz[q - W] + sz[q - W + 1]);
    const m = Math.hypot(gx, gy);
    if (m < 120 || Math.abs(gy) > Math.abs(gx) * tanMax) continue;
    // nachylenie krawędzi od pionu (dodatnie = góra krawędzi w prawo)
    xs.push(x - W / 2); ts.push(-Math.atan(gy / gx)); ws.push(m);
  }
  const brak = { obrot: 0, piony: 0 };
  if (xs.length < 0.004 * W * H || xs.length < 60) return brak;
  let uzyj = new Uint8Array(xs.length).fill(1), a = 0, b = 0, zB = true;
  for (let it = 0; it < 6; it++) {
    let S = 0, Sx = 0, St = 0, Sxx = 0, Sxt = 0;
    for (let i = 0; i < xs.length; i++) if (uzyj[i]) { const w = ws[i]; S += w; Sx += w * xs[i]; St += w * ts[i]; Sxx += w * xs[i] * xs[i]; Sxt += w * xs[i] * ts[i]; }
    if (!S) return brak;
    const vx = Sxx / S - (Sx / S) ** 2;
    zB = Math.sqrt(Math.max(0, vx)) > 0.15 * W; // piony tylko, gdy krawędzie są po obu stronach
    if (zB) { b = (Sxt / S - (Sx / S) * (St / S)) / vx; a = St / S - b * (Sx / S); } else { b = 0; a = St / S; }
    let Sr = 0; for (let i = 0; i < xs.length; i++) if (uzyj[i]) { const r = ts[i] - a - b * xs[i]; Sr += ws[i] * r * r; }
    const prog = Math.max((1.2 * Math.PI) / 180, 2 * Math.sqrt(Sr / S));
    for (let i = 0; i < xs.length; i++) uzyj[i] = Math.abs(ts[i] - a - b * xs[i]) < prog ? 1 : 0;
  }
  let zostalo = 0; for (const u of uzyj) zostalo += u;
  if (zostalo < 40) return brak;
  const obrot = Math.max(-8, Math.min(8, (a * 180) / Math.PI));
  const piony = zB ? Math.max(-0.3, Math.min(0.3, b * H)) : 0;
  return { obrot: Math.abs(obrot) < 0.15 ? 0 : Math.round(obrot * 100) / 100, piony: Math.abs(piony) < 0.006 ? 0 : Math.round(piony * 1000) / 1000 };
}
