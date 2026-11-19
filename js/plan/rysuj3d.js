// Rzut AM — widok 3D „z lotu ptaka": kamera nad środkiem mieszkania, ściany podniesione na pełną wysokość.
// Podłogi, meble i drzwi rysuje zwykły rysuj() (te same grafiki z biblioteki, widziane z góry),
// tu dochodzą ściany jako bryły (boki widoczne od strony kamery + ciemne wierzchy), parapety, szyby i cienie.
import { rysuj, rysujMebel, wymiaryMebla } from './rysuj.js';
import { rodzajMebla } from './biblioteka.js';

const WYS = 260;          // wysokość ścian [cm]
const PARAPET = 90;       // wysokość parapetu [cm]
const WIERZCH = '#24221f';
const SWIATLO = { x: 0.42, y: 0.91 }; // kierunek padania światła (z góry-lewej w dół-prawo)

export function kamera(sc, op = {}) {
  const b = sc.granice, szer = b.x1 - b.x0, wys = b.y1 - b.y0;
  return { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 + (op.przesuniecie ?? 0.06) * wys, h: Math.max(2200, (op.wysokosc ?? 3.3) * Math.max(szer, wys)) };
}
// rzut punktu (x, y, z) na płaszczyznę podłogi (z = 0) widzianą z kamery
const rzut = (K, x, y, z) => { const k = K.h / (K.h - z); return { x: K.x + (x - K.x) * k, y: K.y + (y - K.y) * k }; };

export function granice3D(sc, op = {}) {
  const K = kamera(sc, op), b = sc.granice;
  let x0 = b.x0, y0 = b.y0, x1 = b.x1, y1 = b.y1;
  for (const g of sc.sciany) for (const p of [g.w.start, g.w.end]) {
    const q = rzut(K, p.x, p.y, WYS), r = g.th / 2 + 4;
    x0 = Math.min(x0, q.x - r); y0 = Math.min(y0, q.y - r); x1 = Math.max(x1, q.x + r); y1 = Math.max(y1, q.y + r);
  }
  return { x0, y0, x1, y1 };
}

// odcinki ścian (bez drzwi; pod oknami tylko parapet + szyba)
function kawalki(sc) {
  const lista = [];
  const wInnejScianie = (g, p) => sc.sciany.some((h) => h !== g && !h.granica && !h.luk && odl(p, h) <= h.th / 2 + 1.5);
  for (const g of sc.sciany) {
    if (g.granica || g.luk) continue;
    const wolnyPocz = !wInnejScianie(g, g.w.start), wolnyKon = !wInnejScianie(g, g.w.end);
    let t = 0; const otw = [];
    for (const o of g.otwory) { if (o.t0 > t) lista.push({ g, a0: t, a1: o.t0, z: WYS, typ: 'sciana' }); if (o.rodzaj === 'okno') otw.push(o); t = Math.max(t, o.t1); }
    if (t < g.L) lista.push({ g, a0: t, a1: g.L, z: WYS, typ: 'sciana' });
    for (const o of otw) lista.push({ g, a0: Math.max(0, o.t0), a1: Math.min(g.L, o.t1), z: PARAPET, typ: 'parapet' });
    for (const k of lista) if (k.g === g) {
      k.e0 = k.a0 <= 0.01 ? -g.th / 2 : k.a0; k.e1 = k.a1 >= g.L - 0.01 ? g.L + g.th / 2 : k.a1;
      k.czolo0 = k.a0 > 0.01 || wolnyPocz; k.czolo1 = k.a1 < g.L - 0.01 || wolnyKon; // czoło schowane w innej ścianie — nie rysujemy
    }
  }
  return lista;
}
function odl(p, h) {
  const dx = h.w.end.x - h.w.start.x, dy = h.w.end.y - h.w.start.y, L2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - h.w.start.x) * dx + (p.y - h.w.start.y) * dy) / L2));
  return Math.hypot(p.x - h.w.start.x - t * dx, p.y - h.w.start.y - t * dy);
}
const naroza = (k) => {
  const { g } = k, x = g.w.start.x, y = g.w.start.y, h = g.th / 2;
  const P = (t, n) => ({ x: x + g.ux * t + g.nx * n, y: y + g.uy * t + g.ny * n });
  return [P(k.e0, h), P(k.e1, h), P(k.e1, -h), P(k.e0, -h)];
};
// meble-bryły: w 3D dostają wysokość i boki (szafy, regały, zabudowa kuchni, AGD…); reszta leży płasko jak w 2D
const BRYLY = {
  szafa_2: 220, szafa_przesuwna: 220, szafa_przedpokoj: 220, regal_garderoba: 210,
  regal: 195, regal_szeroki: 195, witryna: 190, regal_pralnia: 180, regal_metalowy: 190, regal_magazynowy: 190, regal_sklepowy: 170,
  lodowka: 200, lodowka_zabudowa: 210, slupek_piekarnik: 210, szafka_wysoka: 210, zamrazarka: 180, pralka_suszarka: 170,
  komoda: 85, kredens: 90, szafka_nocna: 55, szafka_nocna2: 55, szafka_rtv: 50, szafka_niska: 55, szafka_waska: 90, szafka_buty: 95,
  blat: 90, blat_120: 90, blat_40: 90, zmywarka: 88, kuchenka: 88, szafka_kuchenna: 90, zlew: 90, zlew_podwojny: 90, plyta_indukcyjna: 90, plyta_gazowa: 90,
  wyspa: 92, wyspa_zlew: 92, wyspa_plyta: 92, polwysep: 92, pralka: 88, suszarka: 88, winiarka: 88,
  umywalka_szafka: 85, umywalka_podwojna: 85, szafka_lazienkowa: 85, kontener: 60, szafka_drukarka: 70, szafka_narzedziowa: 100,
  lada_kasowa: 100, recepcja: 110, bar: 110, kominek: 100,
};
export const wysokoscBryly = (f) => BRYLY[rodzajMebla(f)] || 0;
const KOLOR_BOKU = new Map();
function kolorBoku(r, obrazy) { // średni kolor brzegu grafiki = kolor boków bryły
  if (KOLOR_BOKU.has(r)) return KOLOR_BOKU.get(r);
  let kol = '#d8cdbd';
  const img = obrazy?.get?.(`mebel:${r}`);
  if (img) try {
    const c = document.createElement('canvas'); c.width = 24; c.height = 24; const x = c.getContext('2d'); x.drawImage(img, 0, 0, 24, 24);
    const d = x.getImageData(0, 0, 24, 24).data; let R = 0, G = 0, B = 0, n = 0;
    for (let i = 0; i < 24 * 24; i++) { const px = i % 24, py = (i / 24) | 0; if ((px > 2 && px < 21 && py > 2 && py < 21) || d[i * 4 + 3] < 200) continue; R += d[i * 4]; G += d[i * 4 + 1]; B += d[i * 4 + 2]; n++; }
    if (n) kol = '#' + [R, G, B].map((v) => Math.round(v / n).toString(16).padStart(2, '0')).join('');
  } catch { /* */ }
  KOLOR_BOKU.set(r, kol); return kol;
}
const narozaMebla = (f) => {
  const { w, d } = wymiaryMebla(f), a = ((f.rotation || 0) * Math.PI) / 180, c = Math.cos(a), si = Math.sin(a);
  return [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([x, y]) => ({ x: f.position.x + x * c - y * si, y: f.position.y + x * si + y * c }));
};
const mieszaj = (hex, k) => { const n = parseInt(hex.slice(1), 16); const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * k)))); return `rgb(${c.join(',')})`; };

export function rysuj3D(ctx, sc, widok, op = {}) {
  const { s, ox, oy } = widok, dpr = widok.dpr || 1;
  const K = kamera(sc, op);
  // 1) podłogi, meble, drzwi — dokładnie jak w 2D, tylko bez ścian i napisów
  const bryly = op.meble === false ? [] : (sc.fl.furniture || []).filter((f) => wysokoscBryly(f) > 0);
  rysuj(ctx, sc, widok, { ...op, bezScian: true, bezNapisow: true, wymiary: false, pomin: new Set(bryly.map((f) => f.id)) });
  ctx.save();
  ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
  const czesci = kawalki(sc);
  // 2) cień rzucany przez ściany na podłogę (miękki, w stronę padania światła)
  if (!op.bezCienia) {
    ctx.save();
    ctx.shadowColor = 'rgba(48,34,18,0.30)'; ctx.shadowBlur = 26 * s * dpr; ctx.shadowOffsetX = SWIATLO.x * 26 * s * dpr; ctx.shadowOffsetY = SWIATLO.y * 26 * s * dpr;
    ctx.fillStyle = WIERZCH; ctx.beginPath();
    for (const k of czesci) { const q = naroza(k); ctx.moveTo(q[0].x, q[0].y); for (const p of q.slice(1)) ctx.lineTo(p.x, p.y); ctx.closePath(); }
    ctx.fill('nonzero');
    ctx.shadowColor = 'rgba(48,34,18,0.26)'; ctx.shadowBlur = 14 * s * dpr; ctx.shadowOffsetX = SWIATLO.x * 12 * s * dpr; ctx.shadowOffsetY = SWIATLO.y * 12 * s * dpr;
    ctx.fillStyle = '#8a7a66'; ctx.beginPath();
    for (const f of bryly) { const q = narozaMebla(f); ctx.moveTo(q[0].x, q[0].y); for (const p of q.slice(1)) ctx.lineTo(p.x, p.y); ctx.closePath(); }
    ctx.fill('nonzero'); ctx.restore();
  }
  // 3) boki ścian widoczne z kamery, od najdalszych do najbliższych
  const sciany = [];
  for (const k of czesci) {
    const q = naroza(k), sr = { x: (q[0].x + q[2].x) / 2, y: (q[0].y + q[2].y) / 2 };
    for (let i = 0; i < 4; i++) {
      if ((i === 1 && !k.czolo1) || (i === 3 && !k.czolo0)) continue;
      const a = q[i], b = q[(i + 1) % 4], m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      let nx = -(b.y - a.y), ny = b.x - a.x; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      if (nx * (m.x - sr.x) + ny * (m.y - sr.y) < 0) { nx = -nx; ny = -ny; }
      if (nx * (K.x - m.x) + ny * (K.y - m.y) <= 0) continue; // odwrócony od kamery
      sciany.push({ k, a, b, nx, ny, d: Math.hypot(m.x - K.x, m.y - K.y), dlugi: i % 2 === 0 });
    }
  }
  for (const f of bryly) { // boki mebli-brył i ich wierzch w tej samej kolejce co ściany (zasłaniają się poprawnie)
    const q = narozaMebla(f), h = wysokoscBryly(f), r = rodzajMebla(f), sr = { x: f.position.x, y: f.position.y };
    let dMin = Infinity;
    for (let i = 0; i < 4; i++) {
      const a = q[i], b = q[(i + 1) % 4], m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      let nx = -(b.y - a.y), ny = b.x - a.x; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      if (nx * (m.x - sr.x) + ny * (m.y - sr.y) < 0) { nx = -nx; ny = -ny; }
      if (nx * (K.x - m.x) + ny * (K.y - m.y) <= 0) continue;
      const d = Math.hypot(m.x - K.x, m.y - K.y); dMin = Math.min(dMin, d);
      sciany.push({ mebel: f, a, b, nx, ny, d, h, kolor: kolorBoku(r, op.obrazy) });
    }
    sciany.push({ wierzch: f, h, d: Math.min(dMin, Math.hypot(sr.x - K.x, sr.y - K.y)) - 0.01 });
  }
  sciany.sort((p, q) => q.d - p.d);
  const lw = 1 / s;
  for (const f of sciany) {
    if (f.wierzch) { // grafika mebla na wysokości blatu
      const k = K.h / (K.h - f.h);
      ctx.save(); ctx.translate(K.x, K.y); ctx.scale(k, k); ctx.translate(-K.x, -K.y);
      rysujMebel(ctx, f.wierzch, s * k, dpr, op.obrazy, false); ctx.restore(); continue;
    }
    if (f.mebel) {
      const A0 = rzut(K, f.a.x, f.a.y, 0), B0 = rzut(K, f.b.x, f.b.y, 0), A1 = rzut(K, f.a.x, f.a.y, f.h), B1 = rzut(K, f.b.x, f.b.y, f.h);
      const jasn = 0.8 + 0.12 * (-(f.nx * SWIATLO.x + f.ny * SWIATLO.y));
      const gr = ctx.createLinearGradient((A0.x + B0.x) / 2, (A0.y + B0.y) / 2, (A1.x + B1.x) / 2, (A1.y + B1.y) / 2);
      gr.addColorStop(0, mieszaj(f.kolor, jasn * 0.72)); gr.addColorStop(1, mieszaj(f.kolor, jasn * 0.97));
      ctx.beginPath(); ctx.moveTo(A0.x, A0.y); ctx.lineTo(B0.x, B0.y); ctx.lineTo(B1.x, B1.y); ctx.lineTo(A1.x, A1.y); ctx.closePath();
      ctx.fillStyle = gr; ctx.fill(); ctx.lineWidth = lw * 0.7; ctx.strokeStyle = 'rgba(50,40,28,0.28)'; ctx.stroke(); continue;
    }
    const z = f.k.z, A0 = rzut(K, f.a.x, f.a.y, 0), B0 = rzut(K, f.b.x, f.b.y, 0), A1 = rzut(K, f.a.x, f.a.y, z), B1 = rzut(K, f.b.x, f.b.y, z);
    const jasn = 0.9 + 0.12 * (-(f.nx * SWIATLO.x + f.ny * SWIATLO.y));
    const baza = f.k.typ === 'parapet' ? '#f6f3ee' : '#f3ede4';
    const gr = ctx.createLinearGradient((A0.x + B0.x) / 2, (A0.y + B0.y) / 2, (A1.x + B1.x) / 2, (A1.y + B1.y) / 2);
    gr.addColorStop(0, mieszaj(baza, jasn * 0.84)); gr.addColorStop(0.3, mieszaj(baza, jasn * 0.96)); gr.addColorStop(1, mieszaj(baza, jasn * 1.03));
    ctx.beginPath(); ctx.moveTo(A0.x, A0.y); ctx.lineTo(B0.x, B0.y); ctx.lineTo(B1.x, B1.y); ctx.lineTo(A1.x, A1.y); ctx.closePath();
    ctx.fillStyle = gr; ctx.fill(); ctx.lineWidth = lw * 0.6; ctx.strokeStyle = 'rgba(60,50,38,0.18)'; ctx.stroke();
    if (f.k.typ === 'parapet' && f.dlugi) { // szyba nad parapetem: jasna tafla z ramą i słupkiem
      const C0 = rzut(K, f.a.x, f.a.y, WYS - 6), D0 = rzut(K, f.b.x, f.b.y, WYS - 6);
      ctx.beginPath(); ctx.moveTo(A1.x, A1.y); ctx.lineTo(B1.x, B1.y); ctx.lineTo(D0.x, D0.y); ctx.lineTo(C0.x, C0.y); ctx.closePath();
      const sz = ctx.createLinearGradient(A1.x, A1.y, C0.x, C0.y); sz.addColorStop(0, '#d5e2e8'); sz.addColorStop(1, '#eef4f7');
      ctx.fillStyle = sz; ctx.fill(); ctx.lineWidth = lw * 2.2; ctx.strokeStyle = '#fbfbf9'; ctx.stroke();
      const M0 = { x: (A1.x + B1.x) / 2, y: (A1.y + B1.y) / 2 }, M1 = { x: (C0.x + D0.x) / 2, y: (C0.y + D0.y) / 2 };
      ctx.beginPath(); ctx.moveTo(M0.x, M0.y); ctx.lineTo(M1.x, M1.y); ctx.lineWidth = lw * 1.6; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(A1.x, A1.y); ctx.lineTo(B1.x, B1.y); ctx.lineWidth = lw * 3; ctx.strokeStyle = '#f7f5f1'; ctx.stroke(); // parapet
    }
  }
  // 4) wierzchy: parapety, górne krawędzie szyb, ściany
  for (const k of czesci) {
    const q = naroza(k).map((p) => rzut(K, p.x, p.y, k.typ === 'parapet' ? WYS - 4 : WYS));
    ctx.beginPath(); ctx.moveTo(q[0].x, q[0].y); for (const p of q.slice(1)) ctx.lineTo(p.x, p.y); ctx.closePath();
    if (k.typ === 'parapet') {
      ctx.fillStyle = 'rgba(214,224,229,0.92)'; ctx.fill(); ctx.lineWidth = lw * 1.2; ctx.strokeStyle = '#fbfbf9'; ctx.stroke();
      const { g } = k, x = g.w.start.x, y = g.w.start.y, m0 = rzut(K, x + g.ux * k.e0, y + g.uy * k.e0, WYS - 4), m1 = rzut(K, x + g.ux * k.e1, y + g.uy * k.e1, WYS - 4);
      ctx.beginPath(); ctx.moveTo(m0.x, m0.y); ctx.lineTo(m1.x, m1.y); ctx.lineWidth = lw * 1.1; ctx.strokeStyle = 'rgba(120,128,132,0.7)'; ctx.stroke();
    } else { ctx.fillStyle = WIERZCH; ctx.fill(); }
  }
  for (const g of sc.sciany) if (g.luk && !g.granica) { // łuki: tylko wierzch
    const a = rzut(K, g.w.start.x, g.w.start.y, WYS), c = rzut(K, g.w.curvePoint.x, g.w.curvePoint.y, WYS), b = rzut(K, g.w.end.x, g.w.end.y, WYS);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(c.x, c.y, b.x, b.y); ctx.lineWidth = g.th; ctx.strokeStyle = WIERZCH; ctx.stroke();
  }
  ctx.restore();
  // 5) nazwy pomieszczeń i metraż (bez wymiarów ścian — w perspektywie byłyby mylące)
  if (!op.bezNapisow) rysuj(ctx, sc, widok, { ...op, tylkoNapisy: true, wymiary: false });
}

export async function eksport3DPNG(sc, op = {}) {
  const b = granice3D(sc, op), dlugi = 2400, margines = 0.08;
  const szer = b.x1 - b.x0, wys = b.y1 - b.y0;
  const s = op.skala || (dlugi * (1 - 2 * margines)) / Math.max(szer, wys);
  const W = Math.round(szer * s + 2 * dlugi * margines), Hplan = Math.round(wys * s + 2 * dlugi * margines);
  const stopka = op.bezStopki ? 0 : 120;
  const c = document.createElement('canvas'); c.width = W; c.height = Hplan + stopka;
  const ctx = c.getContext('2d');
  rysuj3D(ctx, sc, { s, ox: (W - szer * s) / 2 - b.x0 * s, oy: (Hplan - wys * s) / 2 - b.y0 * s, dpr: 1 }, { ...op, eksport: true, czcionka: dlugi / 900, zaznaczone: null });
  if (!op.bezStopki) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, Hplan, W, stopka);
    ctx.strokeStyle = 'rgba(200,164,77,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(W * 0.08, Hplan + 18); ctx.lineTo(W * 0.92, Hplan + 18); ctx.stroke();
    const logo = op.obrazy?.get?.('logo'), fy = Hplan + 18 + (stopka - 18) / 2;
    ctx.font = '500 30px Archivo, system-ui, sans-serif'; ctx.textBaseline = 'middle';
    const opis = 'Wizualizacja 3D · metraż z pomiaru · aranżacja poglądowa';
    const tw = ctx.measureText(opis).width, lw = logo ? 64 : 0;
    let x = (W - tw - (logo ? lw + 22 : 0)) / 2;
    if (logo) { ctx.drawImage(logo, x, fy - lw / 2, lw, lw); x += lw + 22; }
    ctx.fillStyle = '#6b665d'; ctx.textAlign = 'left'; ctx.fillText(opis, x, fy);
  }
  return await new Promise((ok) => c.toBlob(ok, 'image/png'));
}
