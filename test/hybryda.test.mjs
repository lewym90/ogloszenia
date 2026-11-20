// Testy hybrydy „Obróbka AI” (node test/hybryda.test.mjs)
import * as HY from '../js/hybryda.js';

let bledy = 0, ile = 0;
const ok = (w, opis) => { ile++; if (w) console.log('  ✓', opis); else { bledy++; console.log('  ✗', opis); } };

// sztuczne „mieszkanie”: ściana, drewniany słup z lamelami, granatowa ściana, podłoga z żyłkami, ramka z „napisem”
function scena(w, h) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = x / w, v = y / h, i = (y * w + x) * 4;
    let r = 150, g = 152, b = 158;                                   // chłodnawa, ciemna ściana
    if (u < 0.18) { const l = Math.sin(x / w * 160) > 0 ? 1 : 0.8; r = 120 * l; g = 95 * l; b = 70 * l; } // drewno z lamelami
    else if (u > 0.82) { r = 30; g = 38; b = 70; }                    // granat
    if (v > 0.7) { r = 175; g = 173; b = 170; if (Math.abs(Math.sin(u * 23 + v * 9)) < 0.05) { r = 120; g = 105; b = 85; } } // płytki z żyłkami
    if (u > 0.35 && u < 0.6 && v > 0.2 && v < 0.45) {               // ramka z „napisem”
      r = g = b = 235; if (u > 0.37 && u < 0.58 && v > 0.22 && v < 0.43 && (Math.floor(u * 90) % 3 === 0) && Math.floor(v * 40) % 2 === 0) { r = g = b = 20; }
    }
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
  }
  return { data: d, width: w, height: h };
}
// „AI”: lekkie przybliżenie i przesunięcie kadru, jaśniej, cieplej, drewno pomarańczowe, dorysowany pas „słońca”
function wersjaAI(org, wa, ha, sk, tx, ty) {
  const { data: d, width: w, height: h } = org, o = new Uint8ClampedArray(wa * ha * 4);
  for (let y = 0; y < ha; y++) for (let x = 0; x < wa; x++) {
    const ua = (x + 0.5) / wa, va = (y + 0.5) / ha;
    const u = (ua - 0.5 - tx) / sk + 0.5, v = (va - 0.5 - ty) / sk + 0.5;
    const xs = Math.min(w - 1, Math.max(0, Math.round(u * w - 0.5))), ys = Math.min(h - 1, Math.max(0, Math.round(v * h - 0.5)));
    const i = (ys * w + xs) * 4, j = (y * wa + x) * 4;
    let r = d[i], g = d[i + 1], b = d[i + 2];
    r = Math.min(255, r * 1.35 + 25); g = Math.min(255, g * 1.3 + 20); b = Math.min(255, b * 1.15 + 8); // jaśniej i cieplej
    if (u < 0.18) { r = Math.min(255, r * 1.25); b *= 0.55; }                                    // drewno → pomarańcz
    if (ua > 0.62 && ua < 0.7 && va > 0.05 && va < 0.65) { r = g = b = 255; }                      // zmyślony promień słońca
    o[j] = r; o[j + 1] = g; o[j + 2] = b; o[j + 3] = 255;
  }
  return { data: o, width: wa, height: ha };
}
const lab = (r, g, b) => {
  const L = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const R = L(r), G = L(g), B = L(b), f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const X = f((0.412453 * R + 0.35758 * G + 0.180423 * B) / 0.950456), Y = f(0.212671 * R + 0.71516 * G + 0.072169 * B), Z = f((0.019334 * R + 0.119193 * G + 0.950227 * B) / 1.088754);
  return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
};
const sredniaPola = (img, u0, u1, v0, v1) => {
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = Math.round(v0 * img.height); y < v1 * img.height; y++) for (let x = Math.round(u0 * img.width); x < u1 * img.width; x++) { const i = (y * img.width + x) * 4; r += img.data[i]; g += img.data[i + 1]; b += img.data[i + 2]; n++; }
  return [r / n, g / n, b / n];
};

console.log('1. dopasowanie');
const O = scena(800, 600), A = wersjaAI(O, 720, 540, 1.06, 0.01, -0.008);
const dop = HY.dopasuj(O, A);
// punkt (u,v) oryginału leży na AI w (u-0.5)*sk+0.5+tx
const blad = Math.max(...[[0.2, 0.2], [0.8, 0.3], [0.5, 0.8]].map(([u, v]) => {
  const ua = dop.p[0] * u + dop.p[1] * v + dop.p[2], va = dop.p[3] * u + dop.p[4] * v + dop.p[5];
  return Math.hypot(ua - ((u - 0.5) * 1.06 + 0.5 + 0.01), va - ((v - 0.5) * 1.06 + 0.5 - 0.008));
}));
ok(blad < 0.006, `kadr AI dopasowany (błąd ${(blad * 100).toFixed(2)}% szerokości)`);
ok(dop.zgodnosc > 0.5, `zgodność krawędzi ${dop.zgodnosc.toFixed(2)}`);

console.log('2. hybryda: światło z AI, kolory i kształty z oryginału');
const nauka = HY.przygotuj(O, A);
const H = HY.naloz(O, nauka);
const lO = lab(...sredniaPola(O, 0.25, 0.32, 0.5, 0.65)), lH = lab(...sredniaPola(H, 0.25, 0.32, 0.5, 0.65));
ok(lH[0] > lO[0] + 8, `ściana jaśniejsza jak w AI (L ${lO[0].toFixed(0)} → ${lH[0].toFixed(0)})`);
ok(lH[2] > lO[2] + 1 && lH[2] <= 9.5, `biel ściany cieplejsza, najwyżej krem (b ${lO[2].toFixed(1)} → ${lH[2].toFixed(1)})`);
const dO = lab(...sredniaPola(O, 0.02, 0.15, 0.1, 0.6)), dH = lab(...sredniaPola(H, 0.02, 0.15, 0.1, 0.6)), dA = lab(...sredniaPola(A, 0.03, 0.15, 0.1, 0.6));
const kat = (l) => Math.atan2(l[2], l[1]) * 180 / Math.PI;
ok(Math.abs(kat(dH) - kat(dO)) <= 5.5, `drewno zachowuje odcień (${kat(dO).toFixed(0)}° → ${kat(dH).toFixed(0)}°, AI ${kat(dA).toFixed(0)}°)`);
const CO = Math.hypot(dO[1], dO[2]), CH = Math.hypot(dH[1], dH[2]);
ok(CH <= CO * 1.8 * 1.35 + 1.5, `nasycenie drewna z limitem (${CO.toFixed(0)} → ${CH.toFixed(0)})`);
const gO = lab(...sredniaPola(O, 0.86, 0.98, 0.1, 0.6)), gH = lab(...sredniaPola(H, 0.86, 0.98, 0.1, 0.6));
ok(Math.abs(kat(gH) - kat(gO)) <= 5.5, `granat zostaje granatem (${kat(gO).toFixed(0)}° → ${kat(gH).toFixed(0)}°)`);
// zmyślony promień: w hybrydzie w tym miejscu nie może pojawić się jasny pas — porównujemy z sąsiedztwem
const ua = (u) => (u - 0.5) / 1.06 + 0.5 - 0.01;
const pas = lab(...sredniaPola(H, ua(0.64), ua(0.68), 0.15, 0.35)), obok = lab(...sredniaPola(H, ua(0.72), ua(0.78), 0.15, 0.35));
ok(Math.abs(pas[0] - obok[0]) < 4, `dorysowany przez AI promień nie przechodzi na zdjęcie (różnica L ${Math.abs(pas[0] - obok[0]).toFixed(1)})`);
// napis: kontrast liter zachowany co do piksela
let zgodne = 0, wszystkie = 0;
for (let y = Math.round(0.23 * 600); y < 0.42 * 600; y++) for (let x = Math.round(0.38 * 800); x < 0.57 * 800; x++) {
  const i = (y * 800 + x) * 4, litera = O.data[i] < 100; wszystkie++;
  if (litera === (H.data[i] < 128)) zgodne++;
}
ok(zgodne / wszystkie > 0.999, `„napis” piksel w piksel jak w oryginale (${(100 * zgodne / wszystkie).toFixed(2)}%)`);

console.log('3. suwaki');
const H0 = HY.naloz(O, nauka, { sila: 0 });
let maks = 0; for (let i = 0; i < O.data.length; i++) maks = Math.max(maks, Math.abs(H0.data[i] - O.data[i]));
ok(maks <= 1, 'siła 0% = oryginał');
const Hw = HY.naloz(O, nauka, { kolor: 1 }), Hz = HY.naloz(O, nauka, { kolor: 1.8 });
const cw = lab(...sredniaPola(Hw, 0.02, 0.15, 0.1, 0.6)), cz = lab(...sredniaPola(Hz, 0.02, 0.15, 0.1, 0.6));
ok(Math.hypot(cz[1], cz[2]) >= Math.hypot(cw[1], cw[2]), '„Kolory materiałów” — żywsze nie mniej nasycone niż wierne');

console.log('4. odmowa przy złym wyniku z AI');
let rzucil = '';
try { HY.przygotuj(O, scena(600, 800)); } catch (e) { rzucil = e.message; }
ok(/proporcje/.test(rzucil), 'inny kadr (pion zamiast poziomu) — czytelny komunikat');
const szum = { data: new Uint8ClampedArray(800 * 600 * 4).map((_, i) => (i % 4 === 3 ? 255 : (Math.sin(i * 12.9898) * 43758.5453 % 1 + 1) % 1 * 255)), width: 800, height: 600 };
rzucil = ''; try { HY.przygotuj(O, szum); } catch (e) { rzucil = e.message; }
ok(/dopasować/.test(rzucil), 'zupełnie inne zdjęcie — odmowa');

console.log('5. szybkość (pełne zdjęcie 4096×3072)');
const duze = scena(4096, 3072);
let t = performance.now(); const nd = HY.przygotuj(duze, wersjaAI(duze, 1024, 768, 1.04, 0, 0)); const msP = performance.now() - t;
t = performance.now(); HY.naloz(duze, nd); const msN = performance.now() - t;
ok(msP < 8000, `dopasowanie i nauka ${Math.round(msP)} ms`);
ok(msN < 15000, `nałożenie na 12,6 Mpx ${Math.round(msN)} ms`);

console.log(bledy ? `\n${bledy}/${ile} BŁĘDÓW` : `\nwszystkie ${ile} OK`);
process.exit(bledy ? 1 : 0);
