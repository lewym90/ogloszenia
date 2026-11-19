// Rysowanie rzutu w stylu wizualizacji: podłogi z fakturą, miękki cień przy ścianach, czarne ściany z otworami,
// drzwi z łukiem, okna, granice pomieszczeń, meble (grafika z biblioteki albo rysunek), nazwy z metrażem, wymiary.
// Ten sam kod rysuje ekran edytora i obraz do ogłoszenia (eksportPNG).
import * as G from './geom.js';
import { MEBLE, PODLOGI, rodzajMebla, podlogaDla } from './biblioteka.js';
import { dopasujNazwy } from './dopasuj.js';

const SCIANA = '#1c1b19';
const TEKST = '#24221f';
const ZLOTO = '#C8A44D';

// ---------- scena: wszystko, co da się policzyć raz po zmianie planu ----------
export function pietro(projekt) { return projekt.floors.find((f) => f.id === projekt.activeFloorId) || projekt.floors[0]; }
const jestGranica = (w) => !!w.granica;

export function scena(projekt, pomKarty = []) {
  const fl = pietro(projekt);
  let twarze = [];
  try { twarze = G.resolveRoomGeometry(fl, fl.rooms || []); } catch { twarze = []; }
  const dziury = G.roomHoles(twarze.map((t) => t.polygon));
  const nazwyT = twarze.map((t) => (t.room.amNazwaSkan || /^(Room|Pomieszczenie) \d+$/.test((t.room.name || '').trim()) ? '' : (t.room.name || '').trim())); // nazwy zgadnięte przez skaner nie łączą się z kartą
  const wKarcie = new Map(dopasujNazwy(nazwyT, (pomKarty || []).filter((p) => p.nazwa)).map((x) => [x.i, x]));
  const pokoje = twarze.map((t, i) => {
    let m = null;
    try { m = G.interiorRoomArea(t.polygon, dziury[i], fl.walls); } catch { /* */ }
    const nazwa = /^(Room|Pomieszczenie) \d+$/.test((t.room.name || '').trim()) ? '' : (t.room.name || '').trim(); // nazwy nadane automatycznie = bez nazwy
    const x = wKarcie.get(i), k = x?.k, zm = k && k.a && k.b ? k : null;
    // dopasowany do pomiarów z karty: metraż z rzutu (pełny kształt w skali dalmierza); inaczej przy zmierzonym pokoju — pomiar
    const dop = !!(zm && t.room.amDopasowanie && Math.abs(t.room.amDopasowanie.a - zm.a) < 0.0005 && Math.abs(t.room.amDopasowanie.b - zm.b) < 0.0005);
    return { room: t.room, poly: t.polygon, dziury: dziury[i], m: m == null ? null : Math.round(m * 100) / 100,
      mKarta: zm && !dop ? zm.m : null, karta: k || null, kartaPrzybl: !!x?.przyblizone, wym: zm ? { a: zm.a, b: zm.b } : null, dop,
      nazwa, podloga: t.room.amPodloga || podlogaDla(nazwa), otwor: !!t.room.floorOpening };
  });
  const sciany = przedluzenia(fl.walls.map((w) => geomSciany(w, fl)));
  return { fl, pokoje, sciany, granice: bounds(fl) };
}
export function przeliczSciany(sc) { sc.sciany = przedluzenia(sc.fl.walls.map((w) => geomSciany(w, sc.fl))); sc.granice = bounds(sc.fl); }
// o ile ściana wchodzi za swój koniec: w narożniku — do zewnętrznego lica ściany, na której się kończy (inna grubość nie wystaje za narożnik)
function przedluzenia(sciany) {
  for (const g of sciany) {
    g.p0 = g.p1 = g.th / 2;
    if (g.granica || g.luk) continue;
    for (const [pt, k] of [[g.w.start, 'p0'], [g.w.end, 'p1']]) {
      let m = null;
      for (const h of sciany) {
        if (h === g || h.granica || h.luk || Math.abs(h.ux * g.ux + h.uy * g.uy) > 0.95) continue;
        if (odlOdcinka(pt.x, pt.y, h.w.start, h.w.end) < 3) m = Math.max(m ?? 0, h.th / 2);
      }
      if (m != null) g[k] = m;
    }
  }
  return sciany;
}

function geomSciany(w, fl) {
  const dx = w.end.x - w.start.x, dy = w.end.y - w.start.y, L = Math.hypot(dx, dy) || 1;
  const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const otwory = [];
  for (const d of fl.doors || []) if (d.wallId === w.id) otwory.push({ rodzaj: 'drzwi', el: d, t0: d.position * L - d.width / 2, t1: d.position * L + d.width / 2 });
  for (const o of fl.windows || []) if (o.wallId === w.id) otwory.push({ rodzaj: 'okno', el: o, t0: o.position * L - o.width / 2, t1: o.position * L + o.width / 2 });
  otwory.sort((a, b) => a.t0 - b.t0);
  return { w, L, ux, uy, nx, ny, th: w.thickness || 10, otwory, granica: jestGranica(w), luk: !!w.curvePoint };
}

function bounds(fl) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const p = (x, y, r = 0) => { x0 = Math.min(x0, x - r); y0 = Math.min(y0, y - r); x1 = Math.max(x1, x + r); y1 = Math.max(y1, y + r); };
  for (const w of fl.walls) { p(w.start.x, w.start.y, w.thickness / 2); p(w.end.x, w.end.y, w.thickness / 2); }
  for (const f of fl.furniture || []) { const r = Math.hypot(f.width || 50, f.depth || 50) / 2; p(f.position.x, f.position.y, r); }
  if (!isFinite(x0)) return { x0: -300, y0: -300, x1: 300, y1: 300 };
  return { x0, y0, x1, y1 };
}

// ---------- tekstury podłóg (proceduralne, póki nie ma grafik z biblioteki) ----------
const TEX = new Map();
const PX_CM = 4; // gęstość tekstury: 4 px na cm
function losowy(ziarno) { let s = ziarno >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }
export function tekstura(klucz, obrazy) {
  const zBiblioteki = obrazy?.get?.(`podloga:${klucz}`);
  if (zBiblioteki) return { img: zBiblioteki, cm: obrazy.get(`podlogaCm:${klucz}`) || 200 }; // szerokość kafla w cm (z narzędzia do cięcia)
  if (TEX.has(klucz)) return TEX.get(klucz);
  const opis = PODLOGI[klucz] || PODLOGI.dab;
  const R = 240, c = document.createElement('canvas'); c.width = c.height = R * PX_CM;
  const g = c.getContext('2d'); g.scale(PX_CM, PX_CM);
  const [h, s, l] = opis.kolor, rnd = losowy(klucz.length * 7919 + 13);
  const hsl = (dh, ds, dl, a = 1) => `hsla(${h + dh},${s + ds}%,${l + dl}%,${a})`;
  if (opis.rodzaj === 'deski') {
    const szer = opis.szer || 20, rzedy = Math.round(R / szer), sz = R / rzedy;
    for (let r = 0; r < rzedy; r++) {
      let x = -rnd() * 150;
      while (x < R) {
        const dl = 110 + rnd() * 90, dt = (rnd() - 0.5) * 7, dsat = (rnd() - 0.5) * 8;
        for (const off of [0, R]) { // zawijanie — tekstura bez szwu
          g.fillStyle = hsl(dt * 0.5, dsat, dt); g.fillRect(x - off, r * sz, dl, sz);
          for (let k = 0; k < 9; k++) { // słoje
            const yy = r * sz + rnd() * sz; g.strokeStyle = hsl(-2, 4, -14 - rnd() * 10, 0.08 + rnd() * 0.08); g.lineWidth = 0.15 + rnd() * 0.35;
            g.beginPath(); g.moveTo(x - off, yy); g.bezierCurveTo(x - off + dl * 0.3, yy + (rnd() - 0.5) * 2, x - off + dl * 0.7, yy + (rnd() - 0.5) * 2, x - off + dl, yy + (rnd() - 0.5) * 1.5); g.stroke();
          }
          g.fillStyle = hsl(0, 0, -30, 0.28); g.fillRect(x - off + dl - 0.25, r * sz, 0.35, sz); // styk desek
        }
        x += dl;
      }
      g.fillStyle = hsl(0, -5, -32, 0.3); g.fillRect(0, r * sz + sz - 0.3, R, 0.4); // fuga między rzędami
    }
  } else if (opis.rodzaj === 'jodelka') {
    g.fillStyle = hsl(0, 0, 0); g.fillRect(0, 0, R, R);
    const dl = 60, sz = 12, kr = dl / Math.SQRT2;
    for (let yy = -dl * 2; yy < R + dl * 2; yy += sz * Math.SQRT2) for (let xx = -dl * 2; xx < R + dl * 2; xx += kr * 2) for (const st of [1, -1]) {
      g.save(); g.translate(xx + (st < 0 ? kr : 0), yy); g.rotate((st * Math.PI) / 4);
      const dt = (rnd() - 0.5) * 7; g.fillStyle = hsl(dt * 0.4, (rnd() - 0.5) * 8, dt); g.fillRect(0, 0, dl, sz);
      g.strokeStyle = hsl(0, -5, -30, 0.3); g.lineWidth = 0.35; g.strokeRect(0, 0, dl, sz);
      for (let k = 0; k < 4; k++) { g.strokeStyle = hsl(-2, 4, -14, 0.1); g.lineWidth = 0.25; g.beginPath(); const y2 = rnd() * sz; g.moveTo(0, y2); g.lineTo(dl, y2 + (rnd() - 0.5) * 2); g.stroke(); }
      g.restore();
    }
  } else if (opis.rodzaj === 'szachownica') {
    const b = opis.bok || 30, n = Math.round(R / b);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { g.fillStyle = (i + j) % 2 ? '#2a2a2a' : '#efede8'; g.fillRect(i * b, j * b, b, b); }
    g.strokeStyle = 'rgba(120,120,120,0.4)'; g.lineWidth = 0.3; for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * b, 0); g.lineTo(i * b, R); g.moveTo(0, i * b); g.lineTo(R, i * b); g.stroke(); }
  } else if (opis.rodzaj === 'lastryko') {
    g.fillStyle = hsl(0, 0, 0); g.fillRect(0, 0, R, R);
    for (let k = 0; k < 2600; k++) { const x2 = rnd() * R, y2 = rnd() * R, r = 0.4 + rnd() * 1.8; g.fillStyle = [hsl(0, -10, -25, 0.7), hsl(10, 10, -12, 0.6), hsl(0, -14, 6, 0.8), hsl(-20, 0, -40, 0.5)][k % 4]; g.beginPath(); g.ellipse(x2, y2, r, r * (0.5 + rnd() * 0.5), rnd() * 3, 0, 7); g.fill(); }
  } else if (opis.rodzaj === 'plytki') {
    const bok = opis.bok || 60, n = Math.round(R / bok), b = R / n, dlg = opis.dlugi ? 2 : 1;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const dl = (rnd() - 0.5) * 3; g.fillStyle = hsl(0, 0, dl); g.fillRect(i * b, j * b, b, b);
      for (let k = 0; k < 14; k++) { // delikatne przebarwienia kamienia
        const gx = i * b + rnd() * b, gy = j * b + rnd() * b, r = 4 + rnd() * 14, gr = g.createRadialGradient(gx, gy, 0, gx, gy, r);
        gr.addColorStop(0, hsl(rnd() * 6 - 3, 0, (rnd() - 0.5) * 6, 0.25)); gr.addColorStop(1, hsl(0, 0, 0, 0)); g.fillStyle = gr; g.fillRect(gx - r, gy - r, 2 * r, 2 * r);
      }
      if (opis.zylki) for (let k = 0; k < 2; k++) {
        g.strokeStyle = hsl(10, -8, -16, 0.18); g.lineWidth = 0.25 + rnd() * 0.3; g.beginPath();
        let px = i * b + rnd() * b, py = j * b; g.moveTo(px, py);
        while (py < (j + 1) * b) { px += (rnd() - 0.5) * 10; py += 4 + rnd() * 6; g.lineTo(Math.min(Math.max(px, i * b), (i + 1) * b), Math.min(py, (j + 1) * b)); }
        g.stroke();
      }
    }
    g.strokeStyle = hsl(0, -6, -20, 0.45); g.lineWidth = 0.35;
    for (let i = 0; i <= n; i += dlg) { g.beginPath(); g.moveTo(i * b, 0); g.lineTo(i * b, R); g.stroke(); }
    for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(0, i * b); g.lineTo(R, i * b); g.stroke(); }
  } else {
    g.fillStyle = hsl(0, 0, 0); g.fillRect(0, 0, R, R);
    for (let k = 0; k < 260; k++) {
      const gx = rnd() * R, gy = rnd() * R, r = 6 + rnd() * 30;
      for (const [ox, oy] of [[0, 0], [R, 0], [-R, 0], [0, R], [0, -R]]) {
        const gr = g.createRadialGradient(gx + ox, gy + oy, 0, gx + ox, gy + oy, r);
        gr.addColorStop(0, hsl(0, 0, (rnd() - 0.5) * 5, 0.22)); gr.addColorStop(1, hsl(0, 0, 0, 0)); g.fillStyle = gr; g.fillRect(gx + ox - r, gy + oy - r, 2 * r, 2 * r);
      }
    }
  }
  const t = { img: c, cm: R };
  TEX.set(klucz, t);
  return t;
}

// ---------- pomocnicze ----------
function sciezkaPoly(ctx, pts) { ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y); ctx.closePath(); }
function sciezkaPokoju(ctx, p) { ctx.beginPath(); sciezkaPoly(ctx, p.poly); for (const d of p.dziury || []) sciezkaPoly(ctx, d); }
export function wPoly(pts, x, y) {
  let w = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i], b = pts[j];
    if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) w = !w;
  }
  return w;
}
export const wPokoju = (p, x, y) => wPoly(p.poly, x, y) && !(p.dziury || []).some((d) => wPoly(d, x, y));
function odlOdcinka(px, py, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / l2));
  return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
}
function katGlowny(poly) { // kierunek najdłuższej krawędzi — deski wzdłuż dłuższej ściany
  let best = 0, kat = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], l = Math.hypot(b.x - a.x, b.y - a.y);
    if (l > best) { best = l; kat = Math.atan2(b.y - a.y, b.x - a.x); }
  }
  return kat;
}
// najlepsze miejsce na podpis: najdalej od ścian, poza meblami
function miejsceNapisu(p, meble) {
  const xs = p.poly.map((q) => q.x), ys = p.poly.map((q) => q.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  if (p.room.labelOffset) { const c = srodek(p.poly); return { x: c.x + p.room.labelOffset.x, y: c.y + p.room.labelOffset.y, d: 80 }; }
  // napis ma wymiary (≈ jak w obrazie do ogłoszenia): sprawdzamy cały prostokąt, nie tylko środek;
  // długą nazwę można złamać na dwie linie, jeśli wtedy zmieści się w wolnym miejscu
  const nazwa = p.nazwa || 'Pomieszczenie', slowa = nazwa.split(' ');
  const uklady = [{ linia: nazwa.length, dwie: false }];
  { let m = Infinity; for (let i = 1; i < slowa.length; i++) if (!/^\d+$/.test(slowa.slice(i).join(' '))) m = Math.min(m, Math.max(slowa.slice(0, i).join(' ').length, slowa.slice(i).join(' ').length)); if (m < Infinity) uklady.push({ linia: m, dwie: true }); } // „Pokój 2” nie łamiemy przed numerem
  const stale = meble.filter((f) => !naPodlodze(f));
  let best = null;
  for (const u of uklady) {
    const hw = Math.min((x1 - x0) * 0.45, (u.linia * 11.5) / 2 + 6), hh = (u.dwie ? 34 : 22) + (p.wym ? 9 : 0);
    const ocena = (x, y) => {
      if (!wPokoju(p, x, y)) return -1;
      let d = Infinity, kolizje = 0;
      for (const [px, py] of [[x, y], [x - hw, y - hh], [x + hw, y - hh], [x - hw, y + hh], [x + hw, y + hh], [x - hw, y], [x + hw, y], [x, y - hh], [x, y + hh]]) {
        if (!wPokoju(p, px, py)) { d = Math.min(d, 0); continue; }
        for (const r of [p.poly, ...(p.dziury || [])]) for (let i = 0; i < r.length; i++) d = Math.min(d, odlOdcinka(px, py, r[i], r[(i + 1) % r.length]) + Math.min(hw, hh));
        for (const f of stale) if (wMeblu(f, px, py, 8)) kolizje++;
      }
      return (d + 1) * Math.pow(0.4, kolizje) * (u.dwie ? 0.85 : 1); // jedna linia, jeśli tylko się da
    };
    let b = { x: (x0 + x1) / 2, y: (y0 + y1) / 2, d: -1, dwie: u.dwie };
    const N = 22;
    for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
      const x = x0 + ((x1 - x0) * i) / N, y = y0 + ((y1 - y0) * j) / N, d = ocena(x, y);
      if (d > b.d) b = { x, y, d, dwie: u.dwie };
    }
    let krok = Math.max(x1 - x0, y1 - y0) / N;
    for (let it = 0; it < 4; it++, krok /= 2) for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
      const x = b.x + ax * krok, y = b.y + ay * krok, d = ocena(x, y); if (d > b.d) b = { x, y, d, dwie: u.dwie };
    }
    if (!best || b.d > best.d) best = b;
  }
  return best;
}
const srodek = (pts) => ({ x: pts.reduce((a, q) => a + q.x, 0) / pts.length, y: pts.reduce((a, q) => a + q.y, 0) / pts.length });
export function wMeblu(f, x, y, zapas = 0) {
  const a = -((f.rotation || 0) * Math.PI) / 180, dx = x - f.position.x, dy = y - f.position.y;
  const lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
  const w = (f.width ?? MEBLE[rodzajMebla(f)].w) * Math.abs(f.scale?.x ?? 1), d = (f.depth ?? MEBLE[rodzajMebla(f)].d) * Math.abs(f.scale?.y ?? 1);
  return Math.abs(lx) <= w / 2 + zapas && Math.abs(ly) <= d / 2 + zapas;
}
export const wymiaryMebla = (f) => ({ w: (f.width ?? MEBLE[rodzajMebla(f)].w) * Math.abs(f.scale?.x ?? 1), d: (f.depth ?? MEBLE[rodzajMebla(f)].d) * Math.abs(f.scale?.y ?? 1) });

// ---------- meble rysowane kodem (zapas, gdy w bibliotece nie ma grafiki) ----------
const K = { dab: '#d9c19b', dabC: '#c3a47a', krem: '#f4f0e8', greige: '#e3dccf', szary: '#d2cdc5', szaryC: '#a9a39a', bialy: '#fdfdfb', stal: '#c8ccce', czarny: '#2e2d2b', zielen: '#7d9862', zielenC: '#5f7a4a' };
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2)) : ctx.rect(x, y, w, h); }
function obrys(ctx, lw, kolor = 'rgba(40,34,26,0.35)') { ctx.strokeStyle = kolor; ctx.lineWidth = lw; ctx.stroke(); }
const WEKTOR = {
  lozko2(ctx, w, d, lw) { lozko(ctx, w, d, lw, 2); },
  lozko1(ctx, w, d, lw) { lozko(ctx, w, d, lw, 1); },
  szafka_nocna(ctx, w, d, lw) { rr(ctx, -w / 2, -d / 2, w, d, 3); ctx.fillStyle = K.dab; ctx.fill(); obrys(ctx, lw); ctx.beginPath(); ctx.arc(0, 0, Math.min(w, d) * 0.22, 0, 7); ctx.fillStyle = K.krem; ctx.fill(); obrys(ctx, lw); },
  szafa(ctx, w, d, lw) { rr(ctx, -w / 2, -d / 2, w, d, 2); ctx.fillStyle = K.szary; ctx.fill(); obrys(ctx, lw); const n = Math.max(1, Math.round(w / 50)); ctx.beginPath(); for (let i = 1; i < n; i++) { ctx.moveTo(-w / 2 + (w * i) / n, -d / 2); ctx.lineTo(-w / 2 + (w * i) / n, d / 2); } ctx.moveTo(-w / 2, d / 2 - 3); ctx.lineTo(w / 2, d / 2 - 3); obrys(ctx, lw); },
  komoda(ctx, w, d, lw) { rr(ctx, -w / 2, -d / 2, w, d, 2); ctx.fillStyle = K.dab; ctx.fill(); obrys(ctx, lw); },
  regal(ctx, w, d, lw) { rr(ctx, -w / 2, -d / 2, w, d, 2); ctx.fillStyle = K.dab; ctx.fill(); obrys(ctx, lw); const n = Math.max(2, Math.round(w / 18)); for (let i = 0; i < n; i++) { ctx.fillStyle = ['#c9b79a', '#a8a39a', '#e4ddd0', '#9aa38f'][i % 4]; ctx.fillRect(-w / 2 + 2 + (i * (w - 4)) / n, -d / 2 + 2, (w - 4) / n - 1, d * 0.75); } },
  biurko(ctx, w, d, lw) { rr(ctx, -w / 2, -d / 2, w, d, 2); ctx.fillStyle = K.dab; ctx.fill(); obrys(ctx, lw); rr(ctx, -w * 0.18, -d / 2 + 4, w * 0.36, d * 0.12, 1); ctx.fillStyle = K.czarny; ctx.fill(); },
  sofa(ctx, w, d, lw) {
    rr(ctx, -w / 2, -d / 2, w, d, 8); ctx.fillStyle = K.greige; ctx.fill(); obrys(ctx, lw);
    const ar = Math.min(18, w * 0.12), op = Math.min(22, d * 0.26);
    const n = Math.max(1, Math.round((w - 2 * ar) / 75));
    for (let i = 0; i < n; i++) { const sw = (w - 2 * ar) / n; rr(ctx, -w / 2 + ar + i * sw + 1, -d / 2 + op, sw - 2, d - op - 3, 6); ctx.fillStyle = K.krem; ctx.fill(); obrys(ctx, lw * 0.8); }
    for (const sx of [-1, 1]) { rr(ctx, sx * (w / 2 - ar * 1.9) - ar * 0.55, -d / 2 + op + 2, ar * 1.1, op * 0.9, 4); ctx.fillStyle = K.szary; ctx.fill(); }
  },
  fotel(ctx, w, d, lw) { rr(ctx, -w / 2, -d / 2, w, d, 10); ctx.fillStyle = K.greige; ctx.fill(); obrys(ctx, lw); rr(ctx, -w / 2 + w * 0.17, -d / 2 + d * 0.25, w * 0.66, d * 0.7, 8); ctx.fillStyle = K.krem; ctx.fill(); obrys(ctx, lw * 0.8); },
  stolik(ctx, w, d, lw) { rr(ctx, -w / 2, -d / 2, w, d, 4); ctx.fillStyle = K.dab; ctx.fill(); obrys(ctx, lw); ctx.beginPath(); ctx.arc(w * 0.15, 0, Math.min(w, d) * 0.12, 0, 7); ctx.fillStyle = K.bialy; ctx.fill(); },
  szafka_rtv(ctx, w, d, lw) { rr(ctx, -w / 2, -d / 2, w, d, 2); ctx.fillStyle = K.dab; ctx.fill(); obrys(ctx, lw); rr(ctx, -w * 0.32, -d / 2 + 3, w * 0.64, 4, 1); ctx.fillStyle = K.czarny; ctx.fill(); },
  telewizor(ctx, w, d) { rr(ctx, -w / 2, -d / 2, w, Math.max(d, 4), 1); ctx.fillStyle = K.czarny; ctx.fill(); },
  kominek(ctx, w, d, lw) { rr(ctx, -w / 2, -d / 2, w, d, 2); ctx.fillStyle = '#d9d5ce'; ctx.fill(); obrys(ctx, lw); rr(ctx, -w * 0.3, -d / 2, w * 0.6, d * 0.55, 2); ctx.fillStyle = K.czarny; ctx.fill(); },
  dywan(ctx, w, d, lw) { rr(ctx, -w / 2, -d / 2, w, d, 3); ctx.fillStyle = 'rgba(236,230,219,0.92)'; ctx.fill(); rr(ctx, -w / 2 + 6, -d / 2 + 6, w - 12, d - 12, 2); obrys(ctx, lw, 'rgba(160,145,120,0.35)'); },
  dywan_okragly(ctx, w, d, lw) { ctx.beginPath(); ctx.ellipse(0, 0, w / 2, d / 2, 0, 0, 7); ctx.fillStyle = '#d8c7a4'; ctx.fill(); for (let r = 0.85; r > 0.1; r -= 0.15) { ctx.beginPath(); ctx.ellipse(0, 0, (w / 2) * r, (d / 2) * r, 0, 0, 7); obrys(ctx, lw * 0.6, 'rgba(140,115,75,0.35)'); } },
  roslina(ctx, w, d, lw) {
    const r = Math.min(w, d) / 2; ctx.beginPath(); ctx.arc(0, 0, r * 0.45, 0, 7); ctx.fillStyle = K.bialy; ctx.fill(); obrys(ctx, lw);
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2, x = Math.cos(a) * r * 0.55, y = Math.sin(a) * r * 0.55; ctx.beginPath(); ctx.ellipse(x, y, r * 0.42, r * 0.17, a, 0, 7); ctx.fillStyle = i % 2 ? K.zielen : K.zielenC; ctx.fill(); }
  },
  lampa(ctx, w, d, lw) { const r = Math.min(w, d) / 2; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fillStyle = K.krem; ctx.fill(); obrys(ctx, lw); ctx.beginPath(); ctx.arc(0, 0, r * 0.25, 0, 7); ctx.fillStyle = K.czarny; ctx.fill(); },
  stol(ctx, w, d, lw) {
    const okr = Math.abs(w - d) < 8;
    ctx.beginPath(); okr ? ctx.ellipse(0, 0, w / 2, d / 2, 0, 0, 7) : rr(ctx, -w / 2, -d / 2, w, d, 4); ctx.fillStyle = K.dab; ctx.fill(); obrys(ctx, lw);
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-w / 2 + 4, -d / 2 + (d * (i + 1)) / 4); ctx.lineTo(w / 2 - 4, -d / 2 + (d * (i + 1)) / 4); obrys(ctx, lw * 0.5, 'rgba(120,90,50,0.15)'); }
  },
  krzeslo(ctx, w, d, lw) { rr(ctx, -w / 2, -d / 2, w, d, 6); ctx.fillStyle = K.greige; ctx.fill(); obrys(ctx, lw); rr(ctx, -w / 2 + 2, -d / 2 + 2, w - 4, d * 0.22, 4); ctx.fillStyle = K.szary; ctx.fill(); },
  krzeslo_biurowe(ctx, w, d, lw) { ctx.beginPath(); ctx.arc(0, 0, Math.min(w, d) / 2, 0, 7); ctx.fillStyle = K.czarny; ctx.fill(); rr(ctx, -w * 0.35, -d / 2, w * 0.7, d * 0.25, 5); ctx.fillStyle = '#4a4845'; ctx.fill(); },
  blat(ctx, w, d, lw) { rr(ctx, -w / 2, -d / 2, w, d, 1); ctx.fillStyle = '#f1efeb'; ctx.fill(); obrys(ctx, lw); },
  zlew(ctx, w, d, lw) { WEKTOR.blat(ctx, w, d, lw); rr(ctx, -w * 0.32, -d * 0.28, w * 0.64, d * 0.6, 6); ctx.fillStyle = K.stal; ctx.fill(); obrys(ctx, lw); ctx.beginPath(); ctx.arc(0, -d * 0.36, 2.2, 0, 7); ctx.fillStyle = '#8b8f92'; ctx.fill(); },
  plyta(ctx, w, d, lw) { WEKTOR.blat(ctx, w, d, lw); rr(ctx, -w * 0.42, -d * 0.4, w * 0.84, d * 0.8, 3); ctx.fillStyle = K.czarny; ctx.fill(); for (const [x, y, r] of [[-0.2, -0.18, 0.13], [0.2, -0.18, 0.1], [-0.2, 0.2, 0.1], [0.2, 0.2, 0.13]]) { ctx.beginPath(); ctx.arc(w * x, d * y, Math.min(w, d) * r, 0, 7); obrys(ctx, lw, 'rgba(255,255,255,0.35)'); } },
  piekarnik(ctx, w, d, lw) { rr(ctx, -w / 2, -d / 2, w, d, 2); ctx.fillStyle = K.szary; ctx.fill(); obrys(ctx, lw); rr(ctx, -w * 0.4, d / 2 - 6, w * 0.8, 3, 1); ctx.fillStyle = K.czarny; ctx.fill(); },
  zmywarka(ctx, w, d, lw) { WEKTOR.blat(ctx, w, d, lw); },
  lodowka(ctx, w, d, lw) { rr(ctx, -w / 2, -d / 2, w, d, 3); ctx.fillStyle = '#e4e6e7'; ctx.fill(); obrys(ctx, lw); ctx.beginPath(); ctx.moveTo(-w / 2, d / 2 - 5); ctx.lineTo(w / 2, d / 2 - 5); obrys(ctx, lw); },
  wc(ctx, w, d, lw) { rr(ctx, -w / 2, -d / 2, w, d * 0.28, 4); ctx.fillStyle = K.bialy; ctx.fill(); obrys(ctx, lw); ctx.beginPath(); ctx.ellipse(0, d * 0.12, w * 0.42, d * 0.36, 0, 0, 7); ctx.fill(); obrys(ctx, lw); ctx.beginPath(); ctx.ellipse(0, d * 0.15, w * 0.26, d * 0.24, 0, 0, 7); obrys(ctx, lw * 0.8); },
  umywalka(ctx, w, d, lw) { rr(ctx, -w / 2, -d / 2, w, d, 5); ctx.fillStyle = K.dab; ctx.fill(); obrys(ctx, lw); ctx.beginPath(); ctx.ellipse(0, d * 0.05, w * 0.32, d * 0.3, 0, 0, 7); ctx.fillStyle = K.bialy; ctx.fill(); obrys(ctx, lw); ctx.beginPath(); ctx.arc(0, -d * 0.33, 2, 0, 7); ctx.fillStyle = '#8b8f92'; ctx.fill(); },
  wanna(ctx, w, d, lw) { rr(ctx, -w / 2, -d / 2, w, d, 8); ctx.fillStyle = K.bialy; ctx.fill(); obrys(ctx, lw); rr(ctx, -w / 2 + 7, -d / 2 + 7, w - 14, d - 14, Math.min(w, d) * 0.3); ctx.fillStyle = '#eef3f5'; ctx.fill(); obrys(ctx, lw * 0.8); },
  prysznic(ctx, w, d, lw) { rr(ctx, -w / 2, -d / 2, w, d, 2); ctx.fillStyle = '#eef2f3'; ctx.fill(); obrys(ctx, lw); ctx.beginPath(); ctx.moveTo(-w / 2, d / 2 - 1.5); ctx.lineTo(w / 2, d / 2 - 1.5); obrys(ctx, lw * 1.6, 'rgba(120,150,160,0.6)'); ctx.beginPath(); ctx.arc(0, 0, 3, 0, 7); ctx.fillStyle = '#9aa0a3'; ctx.fill(); },
  pralka(ctx, w, d, lw) { rr(ctx, -w / 2, -d / 2, w, d, 3); ctx.fillStyle = K.bialy; ctx.fill(); obrys(ctx, lw); ctx.beginPath(); ctx.arc(0, d * 0.05, Math.min(w, d) * 0.3, 0, 7); obrys(ctx, lw); },
  szafka_lazienkowa(ctx, w, d, lw) { rr(ctx, -w / 2, -d / 2, w, d, 2); ctx.fillStyle = K.dab; ctx.fill(); obrys(ctx, lw); },
  schody(ctx, w, d, lw) { rr(ctx, -w / 2, -d / 2, w, d, 1); ctx.fillStyle = K.dab; ctx.fill(); obrys(ctx, lw); const n = Math.max(3, Math.round(d / 28)); ctx.beginPath(); for (let i = 1; i < n; i++) { ctx.moveTo(-w / 2, -d / 2 + (d * i) / n); ctx.lineTo(w / 2, -d / 2 + (d * i) / n); } obrys(ctx, lw); },
  inny(ctx, w, d, lw) { rr(ctx, -w / 2, -d / 2, w, d, 4); ctx.fillStyle = K.greige; ctx.fill(); obrys(ctx, lw); },
  ciemny(ctx, w, d, lw) { rr(ctx, -w / 2, -d / 2, w, d, 1); ctx.fillStyle = '#3a3835'; ctx.fill(); obrys(ctx, lw); },
  kolo(ctx, w, d, lw) { ctx.beginPath(); ctx.ellipse(0, 0, w / 2, d / 2, 0, 0, 7); ctx.fillStyle = K.greige; ctx.fill(); obrys(ctx, lw); ctx.beginPath(); ctx.ellipse(0, 0, w * 0.32, d * 0.32, 0, 0, 7); obrys(ctx, lw * 0.7); },
  kolo_ciemne(ctx, w, d, lw) { ctx.beginPath(); ctx.ellipse(0, 0, w / 2, d / 2, 0, 0, 7); ctx.fillStyle = '#3a3835'; ctx.fill(); obrys(ctx, lw); },
  naroznik(ctx, w, d, lw) {
    const g = Math.min(95, d * 0.55, w * 0.4);
    ctx.beginPath(); ctx.moveTo(-w / 2, -d / 2); ctx.lineTo(w / 2, -d / 2); ctx.lineTo(w / 2, d / 2); ctx.lineTo(w / 2 - g, d / 2); ctx.lineTo(w / 2 - g, -d / 2 + g); ctx.lineTo(-w / 2, -d / 2 + g); ctx.closePath();
    ctx.fillStyle = K.greige; ctx.fill(); obrys(ctx, lw);
    const op = Math.min(22, g * 0.26);
    rr(ctx, -w / 2 + 4, -d / 2 + op, w - g - 8 + op, g - op - 4, 6); ctx.fillStyle = K.krem; ctx.fill(); obrys(ctx, lw * 0.8);
    rr(ctx, w / 2 - g + 4, -d / 2 + op, g - op - 4, d - op - 4, 6); ctx.fill(); obrys(ctx, lw * 0.8);
  },
  stol4(ctx, w, d, lw) { stolKrzesla(ctx, w, d, lw, 2, 'p'); },
  stol6(ctx, w, d, lw) { stolKrzesla(ctx, w, d, lw, 3, 'p'); },
  stol8(ctx, w, d, lw) { stolKrzesla(ctx, w, d, lw, 4, 'p'); },
  stol2(ctx, w, d, lw) { stolKrzesla(ctx, w, d, lw, 1, 'p'); },
  stolokr(ctx, w, d, lw) { stolKrzesla(ctx, w, d, lw, 4, 'o'); },
  stolokr0(ctx, w, d, lw) { ctx.beginPath(); ctx.ellipse(0, 0, w / 2, d / 2, 0, 0, 7); ctx.fillStyle = K.dab; ctx.fill(); obrys(ctx, lw); },
  stol_zielony(ctx, w, d, lw) { rr(ctx, -w / 2, -d / 2, w, d, 4); ctx.fillStyle = K.dabC; ctx.fill(); obrys(ctx, lw); rr(ctx, -w / 2 + 8, -d / 2 + 8, w - 16, d - 16, 2); ctx.fillStyle = '#4f7a5a'; ctx.fill(); },
  blat_l(ctx, w, d, lw) { const g = Math.min(62, w * 0.6, d * 0.6); ctx.beginPath(); ctx.moveTo(-w / 2, -d / 2); ctx.lineTo(w / 2, -d / 2); ctx.lineTo(w / 2, -d / 2 + g); ctx.lineTo(-w / 2 + g, -d / 2 + g); ctx.lineTo(-w / 2 + g, d / 2); ctx.lineTo(-w / 2, d / 2); ctx.closePath(); ctx.fillStyle = '#f1efeb'; ctx.fill(); obrys(ctx, lw); },
  roslina_pas(ctx, w, d, lw) { rr(ctx, -w / 2, -d / 2, w, d, 4); ctx.fillStyle = '#b9a58a'; ctx.fill(); obrys(ctx, lw); const n = Math.max(2, Math.round(w / Math.max(d, 20))); for (let i = 0; i < n; i++) { const x = -w / 2 + (w * (i + 0.5)) / n; ctx.beginPath(); ctx.arc(x, 0, Math.min(d, w / n) * 0.48, 0, 7); ctx.fillStyle = i % 2 ? K.zielen : K.zielenC; ctx.fill(); } },
  drzewo(ctx, w, d, lw) { const r = Math.min(w, d) / 2; for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, x = Math.cos(a) * r * 0.45, y = Math.sin(a) * r * 0.45; ctx.beginPath(); ctx.arc(x, y, r * 0.5, 0, 7); ctx.fillStyle = i % 2 ? 'rgba(111,143,85,0.85)' : 'rgba(95,122,74,0.85)'; ctx.fill(); } ctx.beginPath(); ctx.arc(0, 0, r * 0.5, 0, 7); ctx.fillStyle = 'rgba(125,152,98,0.9)'; ctx.fill(); },
  woda(ctx, w, d, lw) { rr(ctx, -w / 2, -d / 2, w, d, Math.min(w, d) * 0.12); ctx.fillStyle = '#e8e4dc'; ctx.fill(); obrys(ctx, lw); rr(ctx, -w / 2 + 10, -d / 2 + 10, w - 20, d - 20, Math.min(w, d) * 0.1); ctx.fillStyle = '#9fcbd6'; ctx.fill(); },
  auto(ctx, w, d, lw) { rr(ctx, -w / 2, -d / 2, w, d, w * 0.3); ctx.fillStyle = '#c9cdd0'; ctx.fill(); obrys(ctx, lw); rr(ctx, -w * 0.4, -d * 0.18, w * 0.8, d * 0.42, w * 0.15); ctx.fillStyle = '#5c6670'; ctx.fill(); },
};
function stolKrzesla(ctx, w, d, lw, n, ksztalt) {
  const kd = Math.min(52, d * 0.28), kw = 46;
  if (ksztalt === 'o') {
    const r = Math.min(w, d) / 2 - kd * 0.6;
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + Math.PI / 4; ctx.save(); ctx.translate(Math.cos(a) * (r + kd * 0.25), Math.sin(a) * (r + kd * 0.25)); ctx.rotate(a + Math.PI / 2); WEKTOR.krzeslo(ctx, kw, kd, lw); ctx.restore(); }
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fillStyle = K.dab; ctx.fill(); obrys(ctx, lw); return;
  }
  const tw = w, td = d - 2 * kd * 0.7;
  for (const st of [-1, 1]) for (let i = 0; i < n; i++) {
    const x = -tw / 2 + (tw * (i + 0.5)) / n; ctx.save(); ctx.translate(x, st * (td / 2 + kd * 0.25)); if (st > 0) ctx.rotate(Math.PI); WEKTOR.krzeslo(ctx, Math.min(kw, tw / n - 6), kd, lw); ctx.restore();
  }
  rr(ctx, -tw / 2, -td / 2, tw, td, 4); ctx.fillStyle = K.dab; ctx.fill(); obrys(ctx, lw);
}
function lozko(ctx, w, d, lw, n) {
  rr(ctx, -w / 2, -d / 2, w, d, 4); ctx.fillStyle = K.dab; ctx.fill(); obrys(ctx, lw); // rama
  rr(ctx, -w / 2 + 3, -d / 2 + 7, w - 6, d - 10, 4); ctx.fillStyle = K.bialy; ctx.fill(); // materac
  const pw = (w - 6) / n - 6;
  for (let i = 0; i < n; i++) { rr(ctx, -w / 2 + 6 + i * (pw + 6), -d / 2 + 10, pw, Math.min(32, d * 0.16), 7); ctx.fillStyle = K.krem; ctx.fill(); obrys(ctx, lw * 0.8); }
  rr(ctx, -w / 2 + 3, -d / 2 + d * 0.38, w - 6, d * 0.62 - 3, 4); ctx.fillStyle = K.greige; ctx.fill(); obrys(ctx, lw * 0.7); // kołdra
  rr(ctx, -w / 2 + 3, d / 2 - d * 0.2, w - 6, d * 0.17, 3); ctx.fillStyle = K.szary; ctx.fill(); // narzuta w nogach
}

let bezCieniaMebli = false;
export function rysujMebel(ctx, f, s, dpr, obrazy, cien) {
  const r = rodzajMebla(f), { w, d } = wymiaryMebla(f);
  ctx.save();
  ctx.translate(f.position.x, f.position.y); ctx.rotate(((f.rotation || 0) * Math.PI) / 180);
  if (f.scale?.x < 0) ctx.scale(-1, 1);
  if (cien && !bezCieniaMebli) { ctx.shadowColor = 'rgba(55,40,25,0.30)'; ctx.shadowBlur = Math.max(2, 7 * s * dpr); ctx.shadowOffsetY = 2.5 * s * dpr; ctx.shadowOffsetX = 1 * s * dpr; }
  const img = obrazy?.get?.(`mebel:${r}`), sk = MEBLE[r].skala;
  if (img) {
    if (sk === 'p') { const k = Math.min(w / img.width, d / img.height); ctx.drawImage(img, (-img.width * k) / 2, (-img.height * k) / 2, img.width * k, img.height * k); }
    else if (sk === 'pow') { // odcinek powtarzany wzdłuż szerokości (blat dowolnej długości)
      const odc = d * (img.width / img.height), n = Math.max(1, Math.round(w / odc)), sw = w / n;
      for (let i = 0; i < n; i++) ctx.drawImage(img, -w / 2 + i * sw - 0.3, -d / 2, sw + 0.6, d);
    } else ctx.drawImage(img, -w / 2, -d / 2, w, d);
  } else {
    // cień pod rysunkiem wektorowym rzuca pierwszy kształt; potem bez cienia
    const rys = WEKTOR[MEBLE[r].wektor] || WEKTOR.inny, lw = Math.max(0.6 / s, 0.6);
    const wl = ctx.fill.bind(ctx); let pierwszy = true;
    ctx.fill = (...a) => { wl(...a); if (pierwszy) { pierwszy = false; ctx.shadowColor = 'transparent'; } };
    try { rys(ctx, w, d, lw); } finally { delete ctx.fill; }
  }
  ctx.restore();
}

// warstwa podłóg z cieniami — rysowana raz na początku przeciągania mebla, potem tylko kopiowana
export function warstwaPodlog(sc, widok, op, W, H) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  rysuj(c.getContext('2d'), sc, widok, { ...op, tylkoPodlogi: true, podlogi: null });
  return c;
}
export const naPodlodze = (f) => ['dywan', 'dywan_okragly'].includes(MEBLE[rodzajMebla(f)].wektor);
// ---------- rysowanie całości ----------
// widok: { s: px/cm, ox, oy: położenie punktu (0,0) świata w px ekranu, dpr }
// opcje: { eksport, meble, wymiary, zaznaczone: {rodzaj, id}, obrazy: Map, tlo }
export function rysuj(ctx, sc, widok, op = {}) {
  const { s, ox, oy } = widok, dpr = widok.dpr || 1;
  const W = ctx.canvas.width, H = ctx.canvas.height;
  const swiat = () => ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
  const ekran = () => ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const px = (v) => v / s; // grubość linii w px ekranu → jednostki świata
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (!op.tylkoNapisy) { ctx.fillStyle = op.tlo || '#ffffff'; ctx.fillRect(0, 0, W, H); }
  swiat();
  const { fl, pokoje, sciany } = sc;
  const meble = op.meble === false ? [] : (fl.furniture || []).filter((f) => !op.pomin?.has(f.id)); // pomin: meble-bryły rysowane osobno w 3D
  bezCieniaMebli = !!op.bezCienia;

  if (!op.tylkoNapisy) { // tylkoNapisy: sama warstwa napisów (widok 3D rysuje resztę sam)
  if (op.podlogi) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(op.podlogi, 0, 0); swiat(); } else {
  // 1) cień całego budynku pod spodem
  ctx.save();
  if (op.bezCienia) ctx.shadowColor = 'transparent';
  if (!op.bezCienia) ctx.shadowColor = 'rgba(30,22,12,0.22)'; ctx.shadowBlur = 30 * s * dpr; ctx.shadowOffsetY = 10 * s * dpr; ctx.fillStyle = '#e9e4dc';
  for (const p of pokoje) { if (p.otwor) continue; ctx.beginPath(); sciezkaPoly(ctx, p.poly); ctx.fill(); }
  ctx.restore();

  // 2) podłogi z fakturą
  for (const p of pokoje) {
    if (p.otwor) continue;
    const t = tekstura(p.podloga, op.obrazy);
    const wz = ctx.createPattern(t.img, 'repeat');
    const k = katGlowny(p.poly);
    if (wz.setTransform) wz.setTransform(new DOMMatrix().rotate((k * 180) / Math.PI).scale(t.cm / t.img.width));
    ctx.save(); sciezkaPokoju(ctx, p); ctx.fillStyle = wz; ctx.fill('evenodd');
    // miękki cień wzdłuż ścian (cień wewnętrzny)
    if (op.bezCienia) { ctx.restore(); continue; }
    ctx.clip('evenodd');
    ctx.shadowColor = 'rgba(70,48,24,0.34)'; ctx.shadowBlur = Math.max(4, 22 * s * dpr);
    ctx.beginPath(); ctx.rect(sc.granice.x0 - 2000, sc.granice.y0 - 2000, sc.granice.x1 - sc.granice.x0 + 4000, sc.granice.y1 - sc.granice.y0 + 4000);
    sciezkaPoly(ctx, p.poly); ctx.fillStyle = '#000'; ctx.fill('evenodd');
    ctx.restore();
    if (op.zaznaczone?.rodzaj === 'pokoj' && op.zaznaczone.id === p.room.id) {
      ctx.save(); sciezkaPokoju(ctx, p); ctx.fillStyle = 'rgba(200,164,77,0.16)'; ctx.fill('evenodd'); ctx.restore();
    }
  }

  }
  if (op.tylkoPodlogi) { ctx.restore(); return; }
  // 3) meble (pod ścianami, żeby ściana zawsze była na wierzchu)
  for (const f of meble) {
    if (naPodlodze(f)) rysujMebel(ctx, f, s, dpr, op.obrazy, false);
  }
  for (const f of meble) if (!naPodlodze(f)) rysujMebel(ctx, f, s, dpr, op.obrazy, true);
  for (const st of fl.stairs || []) rysujMebel(ctx, { id: st.id, amRodzaj: st.stairType === 'spiral' ? 'schody_krecone' : st.stairType === 'l-shaped' ? 'schody_l' : st.stairType === 'u-shaped' ? 'schody_u' : 'schody_proste', position: st.position, rotation: st.rotation, width: st.width, depth: st.depth, scale: { x: 1, y: 1, z: 1 } }, s, dpr, op.obrazy, true);
  for (const k of fl.columns || []) rysujMebel(ctx, { id: k.id, amRodzaj: k.shape === 'round' ? 'slup_okragly' : 'slup_kwadratowy', position: k.position, rotation: k.rotation, width: k.diameter, depth: k.diameter, scale: { x: 1, y: 1, z: 1 } }, s, dpr, op.obrazy, false);

  // 4) ściany z otworami (w widoku 3D ściany i okna rysuje rysuj3d.js)
  ctx.fillStyle = SCIANA;
  for (const g of op.bezScian ? [] : sciany) {
    if (g.granica) continue;
    if (g.luk) { ctx.beginPath(); ctx.moveTo(g.w.start.x, g.w.start.y); ctx.quadraticCurveTo(g.w.curvePoint.x, g.w.curvePoint.y, g.w.end.x, g.w.end.y); ctx.lineWidth = g.th; ctx.strokeStyle = SCIANA; ctx.lineCap = 'square'; ctx.stroke(); continue; }
    let t = 0;
    const kawalki = [];
    for (const o of g.otwory) { if (o.t0 > t) kawalki.push([t, o.t0]); t = Math.max(t, o.t1); }
    if (t < g.L) kawalki.push([t, g.L]);
    for (const [a0, a1] of kawalki) {
      const e0 = a0 <= 0.01 ? -g.p0 : a0, e1 = a1 >= g.L - 0.01 ? g.L + g.p1 : a1;
      const x = g.w.start.x, y = g.w.start.y, h = g.th / 2;
      ctx.beginPath();
      ctx.moveTo(x + g.ux * e0 + g.nx * h, y + g.uy * e0 + g.ny * h); ctx.lineTo(x + g.ux * e1 + g.nx * h, y + g.uy * e1 + g.ny * h);
      ctx.lineTo(x + g.ux * e1 - g.nx * h, y + g.uy * e1 - g.ny * h); ctx.lineTo(x + g.ux * e0 - g.nx * h, y + g.uy * e0 - g.ny * h); ctx.closePath(); ctx.fill();
    }
  }
  // 5) okna i drzwi
  for (const g of sciany) for (const o of g.otwory) {
    const x = g.w.start.x, y = g.w.start.y, h = g.th / 2;
    const P = (t, n) => [x + g.ux * t + g.nx * n, y + g.uy * t + g.ny * n];
    if (o.rodzaj === 'okno') {
      if (op.bezScian) continue;
      ctx.beginPath(); ctx.moveTo(...P(o.t0, h)); ctx.lineTo(...P(o.t1, h)); ctx.lineTo(...P(o.t1, -h)); ctx.lineTo(...P(o.t0, -h)); ctx.closePath();
      ctx.fillStyle = '#fbfaf7'; ctx.fill(); ctx.lineWidth = px(1.1); ctx.strokeStyle = '#3b3833'; ctx.stroke();
      ctx.beginPath(); for (const n of [-h * 0.22, h * 0.22]) { ctx.moveTo(...P(o.t0, n)); ctx.lineTo(...P(o.t1, n)); } ctx.lineWidth = px(0.9); ctx.strokeStyle = '#8c8880'; ctx.stroke();
    } else {
      const d = o.el;
      ctx.lineWidth = px(1); ctx.strokeStyle = 'rgba(40,36,30,0.55)';
      if (d.type === 'opening') continue;
      let czesci = [];
      try { czesci = G.doorSymbol({ ...g.w, thickness: g.th }, d); } catch { /* */ }
      for (const c of czesci) {
        if (c.role === 'swing') { ctx.beginPath(); ctx.arc(c.cx, c.cy, c.r, c.from, c.to, c.to < c.from); ctx.lineWidth = px(1); ctx.strokeStyle = 'rgba(60,54,46,0.55)'; ctx.stroke(); }
        else if (c.role === 'leaf' || c.role === 'panel') {
          const [a, b] = c.points, lx = b.x - a.x, ly = b.y - a.y, l = Math.hypot(lx, ly) || 1, qx = (-ly / l) * 2, qy = (lx / l) * 2;
          ctx.beginPath(); ctx.moveTo(a.x + qx, a.y + qy); ctx.lineTo(b.x + qx, b.y + qy); ctx.lineTo(b.x - qx, b.y - qy); ctx.lineTo(a.x - qx, a.y - qy); ctx.closePath();
          ctx.fillStyle = '#fbfaf7'; ctx.fill(); ctx.lineWidth = px(1); ctx.strokeStyle = '#3b3833'; ctx.stroke();
        } else if (c.role === 'track' || c.role === 'threshold') { const [a, b] = c.points; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.setLineDash([px(4), px(3)]); ctx.stroke(); ctx.setLineDash([]); }
      }
    }
  }
  // 6) granice pomieszczeń — przerywana linia
  for (const g of sciany) {
    if (!g.granica) continue;
    ctx.beginPath(); ctx.moveTo(g.w.start.x, g.w.start.y); ctx.lineTo(g.w.end.x, g.w.end.y);
    ctx.setLineDash([px(7), px(5)]); ctx.lineWidth = px(1.4); ctx.strokeStyle = 'rgba(120,98,58,0.75)'; ctx.stroke(); ctx.setLineDash([]);
  }

  // 7) zaznaczenie
  const z = op.zaznaczone;
  if (z) {
    ctx.lineWidth = px(2.5); ctx.strokeStyle = ZLOTO;
    if (z.rodzaj === 'pokoj') { const p = pokoje.find((q) => q.room.id === z.id); if (p) { sciezkaPokoju(ctx, p); ctx.stroke(); } }
    if (z.rodzaj === 'sciana') { const g = sciany.find((q) => q.w.id === z.id); if (g) { ctx.beginPath(); ctx.moveTo(g.w.start.x, g.w.start.y); ctx.lineTo(g.w.end.x, g.w.end.y); ctx.lineWidth = Math.max(g.th, px(6)); ctx.strokeStyle = 'rgba(200,164,77,0.75)'; ctx.stroke(); } }
    if (z.rodzaj === 'mebel') {
      const f = (fl.furniture || []).find((q) => q.id === z.id);
      if (f) { const { w, d } = wymiaryMebla(f); ctx.save(); ctx.translate(f.position.x, f.position.y); ctx.rotate(((f.rotation || 0) * Math.PI) / 180); ctx.strokeRect(-w / 2 - px(3), -d / 2 - px(3), w + px(6), d + px(6)); ctx.restore(); }
    }
    if (z.rodzaj === 'drzwi' || z.rodzaj === 'okno') {
      for (const g of sciany) for (const o of g.otwory) if (o.el.id === z.id) {
        const x = g.w.start.x, y = g.w.start.y, h = g.th / 2 + px(4);
        ctx.beginPath(); ctx.moveTo(x + g.ux * o.t0 + g.nx * h, y + g.uy * o.t0 + g.ny * h); ctx.lineTo(x + g.ux * o.t1 + g.nx * h, y + g.uy * o.t1 + g.ny * h);
        ctx.lineTo(x + g.ux * o.t1 - g.nx * h, y + g.uy * o.t1 - g.ny * h); ctx.lineTo(x + g.ux * o.t0 - g.nx * h, y + g.uy * o.t0 - g.ny * h); ctx.closePath(); ctx.stroke();
      }
    }
  }

  } // koniec !tylkoNapisy
  // 8) napisy: nazwy pomieszczeń, potem wymiary (bez nachodzenia)
  ekran();
  const F = op.czcionka || 1; // mnożnik wielkości napisów
  const zajete = [];
  const koliduje = (r) => zajete.some((q) => r.x0 < q.x1 && r.x1 > q.x0 && r.y0 < q.y1 && r.y1 > q.y0);
  const sx = (x) => x * s + ox, sy = (y) => y * s + oy;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const p of op.bezNapisow ? [] : pokoje) {
    if (p.otwor) continue;
    const m = p.mKarta ?? p.m;
    const nazwa = p.nazwa || 'Pomieszczenie';
    const pos = op.meble === false ? (p._napis0 ||= miejsceNapisu(p, [])) : (p._napis ||= miejsceNapisu(p, meble));
    const szer = Math.max(30, (Math.min(...p.poly.map((q) => q.x)) - Math.max(...p.poly.map((q) => q.x))) * -s * 0.9);
    let f1 = 15 * F, f2 = 12.5 * F;
    ctx.font = `600 ${f1}px Archivo, system-ui, sans-serif`;
    let linie = [nazwa];
    if ((pos.dwie || ctx.measureText(nazwa).width > szer) && nazwa.includes(' ')) { // zawijanie na dwie linie
      const sl = nazwa.split(' '); let best = null;
      for (let i = 1; i < sl.length; i++) { const a = sl.slice(0, i).join(' '), b = sl.slice(i).join(' '); if (/^\d+$/.test(b)) continue; const w = Math.max(ctx.measureText(a).width, ctx.measureText(b).width); if (!best || w < best.w) best = { w, l: [a, b] }; }
      if (best) linie = best.l;
    }
    const maxW = Math.max(...linie.map((l) => ctx.measureText(l).width));
    if (maxW > szer * 1.25) { const k = Math.max(0.62, (szer * 1.25) / maxW); f1 *= k; f2 *= k; }
    const wym = op.wymiaryPokoi !== false && !p.room.amBezWymiarow && p.wym ? `${p.wym.a.toFixed(2).replace('.', ',')} × ${p.wym.b.toFixed(2).replace('.', ',')} m` : ''; // główne wymiary z dalmierza
    const cx = sx(pos.x), cy = sy(pos.y), lh = f1 * 1.18, h = linie.length * lh + (m != null ? f2 * 1.3 : 0) + (wym ? f2 * 1.2 : 0);
    let y = cy - h / 2 + lh / 2;
    ctx.lineJoin = 'round';
    for (const l of linie) { napis(ctx, l, cx, y, `600 ${f1}px Archivo, system-ui, sans-serif`, TEKST, f1); y += lh; }
    if (m != null) { napis(ctx, `${(Math.round(m * 10) / 10).toFixed(1).replace('.', ',')} m²`, cx, y + f2 * 0.15, `400 ${f2}px Archivo, system-ui, sans-serif`, '#4a463f', f2); y += f2 * 1.25; }
    if (wym) napis(ctx, wym, cx, y + f2 * 0.05, `400 ${f2 * 0.88}px Archivo, system-ui, sans-serif`, '#5e594f', f2 * 0.88);
    zajete.push({ x0: cx - maxW / 2 - 4, x1: cx + maxW / 2 + 4, y0: cy - h / 2 - 2, y1: cy + h / 2 + 2 });
  }
  for (const t of op.bezNapisow ? [] : fl.textAnnotations || []) {
    const f = Math.max(10, Math.min(40, (t.fontSize || 14) * s * 2.2 * (op.eksport ? 1 : 0.5)));
    napis(ctx, t.text, sx(t.x), sy(t.y), `500 ${f}px Archivo, system-ui, sans-serif`, '#2f2c27', f);
  }
  if (op.wymiary !== false) {
    // wymiary nie wchodzą na meble — liczymy ich obrys na ekranie
    for (const f of meble) {
      if (naPodlodze(f)) continue;
      const { w, d } = wymiaryMebla(f), a = ((f.rotation || 0) * Math.PI) / 180, c = Math.cos(a), si = Math.sin(a);
      const xs = [], ys = [];
      for (const [lx, ly] of [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]]) { xs.push(sx(f.position.x + lx * c - ly * si)); ys.push(sy(f.position.y + lx * si + ly * c)); }
      zajete.push({ x0: Math.min(...xs) + 2, x1: Math.max(...xs) - 2, y0: Math.min(...ys) + 2, y1: Math.max(...ys) - 2 });
    }
    const f3 = 11.5 * F;
    ctx.font = `500 ${f3}px Archivo, system-ui, sans-serif`;
    const lista = sciany.filter((g) => !g.granica && !g.luk).map((g) => ({ g, L: dlugoscCzysta(g, sciany) })).filter((q) => q.L >= 35).sort((a, b) => b.L - a.L);
    for (const { g, L } of lista) {
      const tekst = `${Math.round(L)} cm`, tw = ctx.measureText(tekst).width, th = f3;
      if (tw > g.L * s * 1.6) continue; // za mało miejsca przy tym powiększeniu
      const mx = g.w.start.x + g.ux * g.L / 2, my = g.w.start.y + g.uy * g.L / 2;
      // strona zewnętrzna: ta, po której nie ma pomieszczenia
      let strona = 1;
      const probka = g.th / 2 + 15;
      const lewa = pokoje.some((p) => !p.otwor && wPokoju(p, mx + g.nx * probka, my + g.ny * probka));
      const prawa = pokoje.some((p) => !p.otwor && wPokoju(p, mx - g.nx * probka, my - g.ny * probka));
      if (lewa && !prawa) strona = -1;
      for (const st of [strona, -strona]) {
        const odst = (g.th / 2) * s + 6 * F + Math.abs(g.nx) * tw / 2 + Math.abs(g.ny) * th / 2;
        const cx = sx(mx) + g.nx * st * odst, cy = sy(my) + g.ny * st * odst;
        const r = { x0: cx - tw / 2 - 2, x1: cx + tw / 2 + 2, y0: cy - th / 2 - 1, y1: cy + th / 2 + 1 };
        if (koliduje(r)) continue;
        napis(ctx, tekst, cx, cy, `500 ${f3}px Archivo, system-ui, sans-serif`, '#2f2c27', f3);
        zajete.push(r); break;
      }
    }
  }
  ctx.restore();
}
function napis(ctx, t, x, y, font, kolor, f) {
  ctx.font = font; ctx.lineWidth = Math.max(2.5, f * 0.28); ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.strokeText(t, x, y);
  ctx.fillStyle = kolor; ctx.fillText(t, x, y);
}
// długość ściany w świetle (bez połówek ścian dochodzących na końcach)
export function dlugoscCzysta(g, sciany) {
  let L = g.L;
  for (const [pt, ] of [[g.w.start], [g.w.end]]) {
    let m = 0;
    for (const h of sciany) {
      if (h === g || h.granica) continue;
      if (odlOdcinka(pt.x, pt.y, h.w.start, h.w.end) < 3) {
        const rown = Math.abs(h.ux * g.ux + h.uy * g.uy) > 0.95; // współliniowa — przedłużenie, nie narożnik
        if (!rown) m = Math.max(m, h.th / 2);
      }
    }
    L -= m;
  }
  return L;
}

// ---------- trafienie palcem / myszą (w jednostkach świata) ----------
export function trafienie(sc, x, y, tol, op = {}) {
  const { fl, pokoje, sciany } = sc;
  for (const g of sciany) for (const o of g.otwory) {
    const t = (x - g.w.start.x) * g.ux + (y - g.w.start.y) * g.uy, n = (x - g.w.start.x) * g.nx + (y - g.w.start.y) * g.ny;
    if (t >= o.t0 - tol * 0.3 && t <= o.t1 + tol * 0.3 && Math.abs(n) <= g.th / 2 + tol * 0.6) return { rodzaj: o.rodzaj, id: o.el.id };
  }
  if (op.meble !== false) {
    const lista = [...(fl.furniture || [])].reverse();
    for (const f of [...lista.filter((f) => !naPodlodze(f)), ...lista.filter(naPodlodze)]) if (wMeblu(f, x, y, tol * 0.25)) return { rodzaj: 'mebel', id: f.id };
  }
  let best = null;
  for (const g of sciany) {
    const d = odlOdcinka(x, y, g.w.start, g.w.end);
    if (d <= g.th / 2 + tol * 0.5 && (!best || d < best.d)) best = { d, id: g.w.id };
  }
  if (best) return { rodzaj: 'sciana', id: best.id };
  const p = pokoje.filter((q) => wPokoju(q, x, y)).sort((a, b) => Math.abs(pole(a.poly)) - Math.abs(pole(b.poly)))[0];
  if (p) return { rodzaj: 'pokoj', id: p.room.id };
  return null;
}
const pole = (pts) => pts.reduce((a, p, i) => { const q = pts[(i + 1) % pts.length]; return a + p.x * q.y - q.x * p.y; }, 0) / 2;

// ---------- obraz do ogłoszenia ----------
export function skalaEksportu(sc) { const b = sc.granice; return (2400 * (1 - 2 * 0.09)) / Math.max(b.x1 - b.x0, b.y1 - b.y0); }
export async function eksportPNG(sc, op = {}) {
  const b = sc.granice, dlugi = 2400, margines = 0.09;
  const szer = b.x1 - b.x0, wys = b.y1 - b.y0;
  const s = op.skala || (dlugi * (1 - 2 * margines)) / Math.max(szer, wys); // przy kilku piętrach wspólna skala
  const W = Math.round(szer * s + 2 * dlugi * margines);
  const stopka = op.bezStopki ? 0 : 120;
  const Hplan = Math.round(wys * s + 2 * dlugi * margines);
  const c = document.createElement('canvas'); c.width = W; c.height = Hplan + stopka;
  const ctx = c.getContext('2d');
  const ox = (W - szer * s) / 2 - b.x0 * s, oy = (Hplan - wys * s) / 2 - b.y0 * s;
  rysuj(ctx, sc, { s, ox, oy, dpr: 1 }, { ...op, eksport: true, czcionka: dlugi / 900, zaznaczone: null });
  if (op.tytul) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.font = '600 54px Archivo, system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = '#24221f'; ctx.fillText(op.tytul, Math.round(W * 0.05), 60); }
  if (op.bezStopki) return await new Promise((ok) => c.toBlob(ok, 'image/png'));
  // stopka: znak AM i uczciwy opis
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, Hplan, W, stopka);
  ctx.strokeStyle = 'rgba(200,164,77,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(W * 0.08, Hplan + 18); ctx.lineTo(W * 0.92, Hplan + 18); ctx.stroke();
  const logo = op.obrazy?.get?.('logo');
  const fy = Hplan + 18 + (stopka - 18) / 2;
  ctx.font = '500 30px Archivo, system-ui, sans-serif'; ctx.textBaseline = 'middle';
  const opis = 'Wizualizacja rzutu · wymiary z pomiaru · aranżacja poglądowa';
  const tw = ctx.measureText(opis).width, lw = logo ? 64 : 0, razem = tw + (logo ? lw + 22 : 0);
  let x = (W - razem) / 2;
  if (logo) { ctx.drawImage(logo, x, fy - lw / 2, lw, lw); x += lw + 22; }
  ctx.fillStyle = '#6b665d'; ctx.textAlign = 'left'; ctx.fillText(opis, x, fy);
  return await new Promise((ok) => c.toBlob(ok, 'image/png'));
}
