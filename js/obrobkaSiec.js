// Własny model „Obróbka AM” — mała sieć liczona w telefonie (bez serwera i bez internetu).
// Z obrazu 256×192 przewiduje siatkę 12×16 lokalnych modeli koloru, które nakłada HY.naloz()
// (te same bezpieczniki co Obróbka AI: tylko światło i kolor, odcienie materiałów ±5°, biel najwyżej kremowa).
export const WE_W = 256, WE_H = 192, GY = 12, GX = 16, K = 30;

function f16(u) {
  const s = (u & 0x8000) ? -1 : 1, e = (u >> 10) & 0x1f, m = u & 0x3ff;
  if (e === 0) return s * m * 2 ** -24;
  if (e === 31) return m ? NaN : s * Infinity;
  return s * (1 + m / 1024) * 2 ** (e - 15);
}

export function wczytajWagi(manifest, bufor) {
  const u16 = new Uint16Array(bufor), W = {};
  for (const [nazwa, { off, ksztalt }] of Object.entries(manifest)) {
    const n = ksztalt.reduce((a, b) => a * b, 1), t = new Float32Array(n);
    for (let i = 0; i < n; i++) t[i] = f16(u16[off + i]);
    W[nazwa] = { t, ksztalt };
  }
  return W;
}

// zmniejszenie RGBA → 3×192×256 (średnia z pól, wartości 0..1)
export function wejscie(img) {
  const { width: w, height: h, data: d } = img, out = new Float32Array(3 * WE_H * WE_W);
  for (let y = 0; y < WE_H; y++) {
    const y0 = (y * h) / WE_H, y1 = ((y + 1) * h) / WE_H;
    for (let x = 0; x < WE_W; x++) {
      const x0 = (x * w) / WE_W, x1 = ((x + 1) * w) / WE_W;
      let r = 0, g = 0, b = 0, s = 0;
      for (let yy = Math.floor(y0); yy < Math.ceil(y1); yy++) {
        const wy = Math.min(yy + 1, y1) - Math.max(yy, y0);
        for (let xx = Math.floor(x0); xx < Math.ceil(x1); xx++) {
          const wx = Math.min(xx + 1, x1) - Math.max(xx, x0), q = wx * wy, i = (yy * w + xx) * 4;
          r += d[i] * q; g += d[i + 1] * q; b += d[i + 2] * q; s += q;
        }
      }
      const o = y * WE_W + x; s *= 255;
      out[o] = r / s; out[WE_H * WE_W + o] = g / s; out[2 * WE_H * WE_W + o] = b / s;
    }
  }
  return out;
}

function conv3(x, C, H, W, w, b, st, relu) {  // 3×3, padding 1
  const O = w.ksztalt[0], Ho = Math.ceil(H / st), Wo = Math.ceil(W / st), y = new Float32Array(O * Ho * Wo), wt = w.t;
  for (let o = 0; o < O; o++) {
    const yo = y.subarray(o * Ho * Wo, (o + 1) * Ho * Wo); yo.fill(b.t[o]);
    for (let c = 0; c < C; c++) {
      const xc = x.subarray(c * H * W, (c + 1) * H * W), wb = (o * C + c) * 9;
      for (let ky = 0; ky < 3; ky++) for (let kx = 0; kx < 3; kx++) {
        const k = wt[wb + ky * 3 + kx]; if (k === 0) continue;
        for (let i = 0; i < Ho; i++) {
          const yy = i * st + ky - 1; if (yy < 0 || yy >= H) continue;
          const rx = yy * W, ri = i * Wo;
          for (let j = 0; j < Wo; j++) { const xx = j * st + kx - 1; if (xx >= 0 && xx < W) yo[ri + j] += k * xc[rx + xx]; }
        }
      }
    }
    if (relu) for (let i = 0; i < yo.length; i++) if (yo[i] < 0) yo[i] = 0;
  }
  return { y, C: O, H: Ho, W: Wo };
}
function lin(v, w, b, relu) {
  const [O, I] = w.ksztalt, y = new Float32Array(O);
  for (let o = 0; o < O; o++) { let s = b.t[o]; for (let i = 0; i < I; i++) s += w.t[o * I + i] * v[i]; y[o] = relu && s < 0 ? 0 : s; }
  return y;
}

// → { modele: Float32Array(12·16·30), siatka: [12, 16] } — gotowe dla HY.naloz()
export function przewidz(W, img) {
  let a = { y: wejscie(img), C: 3, H: WE_H, W: WE_W };
  for (const n of ['d1', 'd2', 'd3', 'd4']) a = conv3(a.y, a.C, a.H, a.W, W[n + '.weight'], W[n + '.bias'], 2, true);
  const h = a;
  let g = conv3(h.y, h.C, h.H, h.W, W['g1.weight'], W['g1.bias'], 2, true);
  g = conv3(g.y, g.C, g.H, g.W, W['g2.weight'], W['g2.bias'], 2, true);
  const sr = new Float32Array(g.C), n = g.H * g.W;
  for (let c = 0; c < g.C; c++) { let s = 0; for (let i = 0; i < n; i++) s += g.y[c * n + i]; sr[c] = s / n; }
  const gl = lin(lin(sr, W['f1.weight'], W['f1.bias'], true), W['f2.weight'], W['f2.bias'], false);
  let l = conv3(h.y, h.C, h.H, h.W, W['l1.weight'], W['l1.bias'], 1, true);
  l = conv3(l.y, l.C, l.H, l.W, W['l2.weight'], W['l2.bias'], 1, false);
  const P = l.H * l.W;
  for (let c = 0; c < l.C; c++) for (let i = 0; i < P; i++) { const v = l.y[c * P + i] + gl[c]; l.y[c * P + i] = v < 0 ? 0 : v; }
  const wy = W['wy.weight'], wb = W['wy.bias'], C = l.C, modele = new Float32Array(GY * GX * K);
  const ident = new Float32Array(K); ident[3] = 1; ident[7] = 1; ident[11] = 1;
  for (let k = 0; k < K; k++) for (let p = 0; p < P; p++) {
    let s = wb.t[k] + ident[k];
    for (let c = 0; c < C; c++) s += wy.t[k * C + c] * l.y[c * P + p];
    modele[p * K + k] = s;
  }
  return { modele, siatka: [GY, GX] };
}
