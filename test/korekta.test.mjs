// Testy korekty zdjęć (js/korekta.js): node test/korekta.test.mjs
import * as K from '../js/korekta.js';

let bledy = 0, ile = 0;
const ok = (w, t) => { ile++; if (!w) { bledy++; console.log('BŁĄD', t); } else console.log('OK  ', t); };
const W = 480, H = 360;

// scena: jasnoszare tło z ciemnymi pionowymi liniami; obraz „zrobiony krzywo” = scena widziana przez F (przekształcenie korekty)
function scena(p, kolor = [200, 200, 200]) {
  const { F } = K.przeksztalcenie(W, H, K.normuj(p));
  const d = new Uint8ClampedArray(W * H * 4);
  const lin = [40, 90, 150, 200, 250, 300, 330, 390, 440];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const [X] = K.zastosuj(F, x + 0.5, y + 0.5);
    let v = 1;
    for (const l of lin) { const dd = Math.abs(X - l); if (dd < 3) v = 0.3; else if (dd < 4) v = Math.min(v, 0.3 + 0.7 * (dd - 3)); }
    const o = (y * W + x) * 4; d[o] = kolor[0] * v; d[o + 1] = kolor[1] * v; d[o + 2] = kolor[2] * v; d[o + 3] = 255;
  }
  return { data: d, width: W, height: H };
}
function szum(w, h) {
  const d = new Uint8ClampedArray(w * h * 4); let s = 7;
  for (let i = 0; i < d.length; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; d[i] = i % 4 === 3 ? 255 : s % 256; }
  return { data: d, width: w, height: h };
}

// 1. macierze i homografia
const Hm = K.homografia([[10, 0], [90, 0], [100, 80], [0, 80]], [[0, 0], [100, 0], [100, 80], [0, 80]]);
const [u, v] = K.zastosuj(Hm, 90, 0);
ok(Math.abs(u - 100) < 1e-6 && Math.abs(v) < 1e-6, 'homografia przenosi narożnik trapezu w narożnik prostokąta');
const I = K.mnoz(Hm, K.odwroc(Hm));
ok(I.every((x, i) => Math.abs(x - (i % 4 === 0 ? 1 : 0)) < 1e-9), 'macierz × odwrotność = jednostkowa');

// 2. domyślne parametry nic nie zmieniają
const src = szum(64, 48);
const id = K.obrob(src, K.DOMYSLNE);
ok(id.width === 64 && id.height === 48 && id.data.every((x, i) => x === src.data[i]), 'bez korekty obraz identyczny piksel w piksel');
ok(!K.zmienia(K.DOMYSLNE) && K.zmienia({ ev: 0.5 }) && K.zmienia({ proporcje: '16:9' }), 'zmienia() rozpoznaje brak i obecność korekty');
ok(K.opisKorekty({ ev: 0.3, obrot: 2 }) === 'jasność, piony', 'opis korekty po polsku');

// 3. kadr zawsze w obrębie zdjęcia (bez czarnych rogów) i z zadanymi proporcjami
for (const p of [{ obrot: 7 }, { piony: 0.3 }, { piony: -0.3, obrot: -5 }, { proporcje: '16:9', zoom: 0.7, px: 0.9, py: -0.9 }, { proporcje: '4:3', piony: 0.2 }]) {
  const k = K.kadr(W, H, p);
  const rogi = [[k.x, k.y], [k.x + k.w, k.y], [k.x + k.w, k.y + k.h], [k.x, k.y + k.h]].map(([x, y]) => K.zastosuj(k.odw, x, y));
  const wSrodku = rogi.every(([a, b]) => a >= -0.01 && b >= -0.01 && a <= W + 0.01 && b <= H + 0.01);
  const A = K.stosunek(W, H, K.normuj(p).proporcje);
  ok(wSrodku && Math.abs(k.w / k.h - A) < 1e-6 && k.w > W * 0.3, `kadr w zdjęciu i w proporcjach ${JSON.stringify(p)}`);
}
const k1 = K.kadr(W, H, { obrot: 5 }), k2 = K.kadr(W, H, { obrot: 5, zoom: 0.6 });
ok(Math.abs(k2.w - 0.6 * k1.w) < 1e-6, 'przybliżenie zmniejsza kadr');
const kp = K.kadr(W, H, { zoom: 0.5, px: 1 });
ok(kp.px > 0.2 && kp.px < 1 && kp.x + kp.w <= W + 0.01, 'przesunięcie kadru zatrzymuje się na krawędzi zdjęcia');
const [ow, oh] = K.rozmiarWyniku(4000, 3000, { obrot: 3 }, 2560);
ok(Math.max(ow, oh) <= 2560 && Math.abs(ow / oh - 4 / 3) < 0.01, 'rozmiar wyniku ograniczony do 2560 px');

// 4. jasność i kolor
const T0 = K.tablice(K.DOMYSLNE);
ok(T0.every((t) => [0, 64, 128, 200, 255].every((x) => t[x * 4] === x)), 'tablice kolorów bez korekty = tożsamość');
const Tj = K.tablice({ ev: 1 });
ok(Tj[0][128 * 4] > 150 && Tj[0][255 * 4] === 255 && Tj[0][250 * 4] < 255, 'rozjaśnienie podnosi średnie tony, nie przepala jasnych');
const Tc = K.tablice({ cienie: 1 });
ok(Tc[0][50 * 4] > 70 && Tc[0][250 * 4] <= 252 && Tc[0][0] === 0, 'cienie podnoszą ciemne, nie ruszają bieli i czerni');
const Tw = K.tablice({ temp: 1 });
ok(Tw[0][128 * 4] > 128 && Tw[2][128 * 4] < 128, 'temperatura: cieplej = więcej czerwieni, mniej niebieskiego');
for (let i = 1; i < 1021; i++) if (Tj[1][i] < Tj[1][i - 1] || Tc[1][i] < Tc[1][i - 1]) { ok(false, 'krzywe rosnące'); break; }

// 5. automat: balans bieli i jasność
const zolte = scena({}, [210, 185, 135]);
const kAuto = K.kolorAuto(zolte);
ok(kAuto.temp < -0.3 && kAuto.temp > -1, `żółtawe zdjęcie → automat ochładza (temp ${kAuto.temp})`);
const po = K.obrob(zolte, kAuto);
let r = 0, g = 0, b = 0; for (let i = 0; i < po.data.length; i += 4) if (po.data[i + 1] > 150) { r += po.data[i]; g += po.data[i + 1]; b += po.data[i + 2]; }
ok(Math.abs(r - b) / r < 0.04 && Math.abs(g - (r + b) / 2) / g < 0.04, `po automacie białe ściany są neutralne (R ${Math.round(r / g * 100)}%, B ${Math.round(b / g * 100)}% zielonego)`);
const ciemne = scena({}, [50, 50, 50]);
const cAuto = K.kolorAuto(ciemne);
ok(cAuto.ev > 0.5 && cAuto.temp === 0, `ciemne zdjęcie → automat rozjaśnia (ev ${cAuto.ev}), szarego nie przebarwia`);
ok(K.kolorAuto(scena({}, [200, 200, 200])).temp === 0, 'neutralne zdjęcie zostaje neutralne');

// 6. automat: prostowanie i piony
for (const p of [{ obrot: 3 }, { obrot: -2 }, { piony: 0.15 }, { piony: -0.1 }, { obrot: 2, piony: 0.12 }]) {
  const a = K.analiza(scena(p));
  ok(Math.abs(a.obrot - (p.obrot || 0)) < 0.35 && Math.abs(a.piony - (p.piony || 0)) < 0.025, `automat odczytuje ${JSON.stringify(p)} → obrót ${a.obrot}°, piony ${a.piony}`);
}
const proste = K.analiza(scena({}));
ok(proste.obrot === 0 && proste.piony === 0, 'proste zdjęcie — automat nie rusza geometrii');
const bezKrawedzi = K.pionyAuto({ data: new Uint8ClampedArray(W * H * 4).fill(180), width: W, height: H });
ok(bezKrawedzi.obrot === 0 && bezKrawedzi.piony === 0, 'brak pionowych krawędzi — geometria bez zmian');
// po korekcie automatem linie są pionowe
const krzywe = scena({ obrot: 2, piony: 0.12 });
const wyprost = K.obrob(krzywe, K.analiza(krzywe), W, H);
const reszta = K.pionyAuto(wyprost);
ok(Math.abs(reszta.obrot) < 0.3 && Math.abs(reszta.piony) < 0.02, `po korekcie linie pionowe (reszta: ${JSON.stringify(reszta)})`);

// 7. szybkość: 2560×1920 (pełne zdjęcie)
const duze = szum(2560, 1920);
const t0 = performance.now(); K.obrob(duze, { ev: 0.4, temp: 0.2, obrot: 2, piony: 0.1 }); const ms = performance.now() - t0;
ok(ms < 4000, `pełne zdjęcie 2560×1920 w ${Math.round(ms)} ms`);

console.log(`\n${ile - bledy}/${ile} OK`);
process.exit(bledy ? 1 : 0);
