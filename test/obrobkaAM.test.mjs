// Obróbka AM (własny model): pełne zdjęcie w rozsądnym czasie, siła 0 = oryginał, granat zostaje ciemny,
// „napis” zostaje wyraźny, ciemne zdjęcie wyraźnie jaśniejsze, jasne dobre zdjęcie prawie bez zmian.
import fs from 'fs'; import * as AM from '../js/obrobkaAM.js'; import * as SN from '../js/obrobkaSiec.js';
const wagi = SN.wczytajWagi(JSON.parse(fs.readFileSync(new URL('../modele/am1.json', import.meta.url))), fs.readFileSync(new URL('../modele/am1.bin', import.meta.url)).buffer.slice(0));
let n = 0, bl = 0; const ok = (w, t) => { n++; if (!w) bl++; console.log(w ? 'OK  ' : 'BŁĄD', t); };
function pokoj(W, H, jas) {
  const d = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = x / W, v = y / H; let c = [140, 142, 148];
    if (u < 0.18 && (x % 60) < 40) c = [115, 90, 66];
    if (u > 0.82) c = [30, 38, 70];
    if (u > 0.35 && u < 0.6 && v > 0.2 && v < 0.45) c = (v > 0.25 && v < 0.3 && ((x - 0.37 * W) % 70) < 25 && u > 0.37) ? [20, 20, 20] : [232, 232, 232];
    if (v > 0.7) c = [172, 170, 167];
    const i = (y * W + x) * 4, sz = ((x * 7 + y * 13) % 9) - 4; d[i] = c[0] * jas + sz; d[i + 1] = c[1] * jas + sz; d[i + 2] = c[2] * jas + sz; d[i + 3] = 255;
  }
  return { data: d, width: W, height: H };
}
const sr = (img, x0, y0, x1, y1) => { const { width: W, height: H, data: d } = img; let s = 0, k = 0; for (let y = Math.round(y0 * H); y < Math.round(y1 * H); y++) for (let x = Math.round(x0 * W); x < Math.round(x1 * W); x++) { const i = (y * W + x) * 4; s += d[i] + d[i + 1] + d[i + 2]; k++; } return s / k / 3; };
const ciemne = pokoj(1600, 1200, 0.45);
let t = Date.now(); const p = AM.przygotujAM(wagi, ciemne); const w = AM.nalozAM(ciemne, p.pre, p, {}); const czas = Date.now() - t;
ok(w.width === 1600 && w.height === 1200, 'wynik w tym samym rozmiarze');
ok(sr(w, 0.2, 0.5, 0.8, 0.65) > sr(ciemne, 0.2, 0.5, 0.8, 0.65) + 30, `ciemne zdjęcie jaśniejsze (${sr(ciemne, 0.2, 0.5, 0.8, 0.65).toFixed(0)} → ${sr(w, 0.2, 0.5, 0.8, 0.65).toFixed(0)})`);
ok(sr(w, 0.86, 0.3, 0.98, 0.6) < 70, `granatowa ściana zostaje ciemna (${sr(w, 0.86, 0.3, 0.98, 0.6).toFixed(0)})`);
ok(sr(w, 0.40, 0.36, 0.55, 0.42) - sr(w, 0.371, 0.26, 0.374, 0.29) > 120, '„napis” zostaje wyraźny');
const zero = AM.nalozAM(ciemne, p.pre, p, { sila: 0 });
let maks = 0; for (let i = 0; i < zero.data.length; i++) maks = Math.max(maks, Math.abs(zero.data[i] - ciemne.data[i]));
ok(maks <= 1, `siła 0 = oryginał (różnica ${maks})`);
const jasne = pokoj(1600, 1200, 1.25), pj = AM.przygotujAM(wagi, jasne), wj = AM.nalozAM(jasne, pj.pre, pj, {});
ok(Math.abs(sr(wj, 0.2, 0.5, 0.8, 0.65) - sr(jasne, 0.2, 0.5, 0.8, 0.65)) < 25, `dobrze naświetlone zdjęcie bez przesady (${sr(jasne, 0.2, 0.5, 0.8, 0.65).toFixed(0)} → ${sr(wj, 0.2, 0.5, 0.8, 0.65).toFixed(0)})`);
ok(czas < 8000, `1,9 Mpx w ${czas} ms`);
console.log(bl ? `${n - bl}/${n} OK` : `wszystkie ${n} OK`); process.exit(bl ? 1 : 0);
