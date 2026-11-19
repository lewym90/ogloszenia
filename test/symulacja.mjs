// Symulacja: losowe mieszkania → „skan” z błędami jak z LiDAR → import → dopasowanie do „pomiarów dalmierzem”.
// Porównuje metraże pomieszczeń z prawdziwymi. node test/symulacja.mjs [liczba] [ziarno]
import * as G from '../js/plan/geom.js';
import { dopasujDoPomiarow, poprawImport, rozpietosciSzczegolowo } from '../js/plan/dopasuj.js';

const N = Number(process.argv[2] || 200);
let ziarno = Number(process.argv[3] || 7);
const los = () => { ziarno ^= ziarno << 13; ziarno ^= ziarno >>> 17; ziarno ^= ziarno << 5; return ((ziarno >>> 0) % 1e6) / 1e6; };
const zakres = (a, b) => a + (b - a) * los();
const gauss = (s) => { let u = 0; for (let i = 0; i < 6; i++) u += los(); return (u - 3) * s / Math.sqrt(0.5); };

// mieszkanie: linie (pionowe x / poziome y) z grubością; ściany = odcinki między liniami prostopadłymi
function mieszkanie() {
  const linie = [], sciany = [], pokojePunkty = [];
  const L = (os, c, t, zew = 0, gr = false) => { const l = { id: linie.length, os, c, t, zew, gr }; linie.push(l); return l; };
  const W = Math.round(zakres(600, 1150)), H = Math.round(zakres(500, 950)), te = Math.round(zakres(25, 45));
  // osie ścian zewnętrznych tak, by wnętrze miało W × H
  const lewa = L('x', -te / 2, te, 1), prawa = L('x', W + te / 2, te, -1), gora = L('y', -te / 2, te, 1), dol = L('y', H + te / 2, te, -1);
  const scz = (l, a, b) => sciany.push({ l, a, b });
  scz(lewa, gora, dol); scz(prawa, gora, dol); scz(gora, lewa, prawa); scz(dol, lewa, prawa);
  // podział gilotynowy
  const obszary = [{ x0: lewa, x1: prawa, y0: gora, y1: dol }];
  const cel = 3 + Math.floor(los() * 4);
  let granica = los() < 0.35;
  while (obszary.length < cel) {
    obszary.sort((p, q) => (q.x1.c - q.x0.c) * (q.y1.c - q.y0.c) - (p.x1.c - p.x0.c) * (p.y1.c - p.y0.c));
    const o = obszary.shift(), w = o.x1.c - o.x0.c, h = o.y1.c - o.y0.c;
    const pion = w > h ? los() < 0.8 : los() < 0.2, ti = granica && los() < 0.5 ? 0 : Math.round(zakres(8, 25));
    const gr = ti === 0; if (gr) granica = false;
    const a = pion ? o.x0 : o.y0, b = pion ? o.x1 : o.y1, dl = (b.c - b.t / 2) - (a.c + a.t / 2);
    if (dl < 400) { obszary.push(o); break; }
    const c = a.c + a.t / 2 + zakres(0.3, 0.7) * dl;
    const nl = L(pion ? 'x' : 'y', Math.round(c), gr ? 0 : ti, 0, gr);
    scz(nl, pion ? o.y0 : o.x0, pion ? o.y1 : o.x1);
    obszary.push(pion ? { ...o, x1: nl } : { ...o, y1: nl }, pion ? { ...o, x0: nl } : { ...o, y0: nl });
  }
  // w części pomieszczeń: wnęka / szacht przy ścianie (prostokąt wchodzący do pomieszczenia)
  for (const o of obszary) {
    pokojePunkty.push(o);
    if (los() < 0.35) {
      const w = o.x1.c - o.x1.t / 2 - (o.x0.c + o.x0.t / 2), h = o.y1.c - o.y1.t / 2 - (o.y0.c + o.y0.t / 2);
      if (w < 250 || h < 250) continue;
      const g = Math.round(zakres(35, 70)), d = Math.round(zakres(70, 130)), t = 10;
      const x0 = o.x0.c + o.x0.t / 2 + zakres(0.2, 0.6) * (w - d);
      const a1 = L('x', Math.round(x0 + t / 2), t), a2 = L('x', Math.round(x0 + d - t / 2), t), fr = L('y', Math.round(o.y0.c + o.y0.t / 2 + g - t / 2), t);
      scz(a1, o.y0, fr); scz(a2, o.y0, fr); scz(fr, a1, a2);
      o.szacht = true;
    }
  }
  return { linie, sciany, obszary: pokojePunkty };
}
// projekt openPlan3D z linii (wsp(l) — położenie osi linii, gr(l) — grubość)
function projekt(M, wsp, gr) {
  const p = G.createDefaultProject('sym'), f = p.floors[0];
  f.walls = M.sciany.map((s, i) => {
    const P = (k) => (s.l.os === 'x' ? { x: wsp(s.l), y: wsp(k) } : { x: wsp(k), y: wsp(s.l) });
    return { id: 'w' + i, start: P(s.a), end: P(s.b), thickness: gr(s.l), height: 260, ...(s.l.gr ? { granica: true } : {}) };
  });
  f.rooms = G.resolveRooms(f, []);
  return f;
}
const pokoje = (f) => G.resolveRoomGeometry(f, f.rooms).map((t) => ({ room: t.room, poly: t.polygon, m: G.interiorRoomArea(t.polygon, [], f.walls) }));
const wew = (q, x, y) => { let w = false; for (let i = 0, j = q.length - 1; i < q.length; j = i++) if ((q[i].y > y) !== (q[j].y > y) && x < ((q[j].x - q[i].x) * (y - q[i].y)) / (q[j].y - q[i].y) + q[i].x) w = !w; return w; };
// punkt w pomieszczeniu (środek obszaru, omijając szacht)
const punkt = (o, wsp) => ({ x: (wsp(o.x0) + wsp(o.x1)) / 2, y: o.szacht ? wsp(o.y1) - 30 : (wsp(o.y0) + wsp(o.y1)) / 2 });

const bl = { surowy: [], import: [], dopas: [], dopasZm: [], dopasNiezm: [] };
let pekniete = 0, sprzeczne = 0, nieprzyp = 0, pomieszczen = 0;
for (let n = 0; n < N; n++) {
  const M = mieszkanie();
  const prawda = projekt(M, (l) => l.c, (l) => (l.gr ? 1 : l.t)), P0 = pokoje(prawda);
  // skan: płaszczyzna ściany zewnętrznej = lico wewnętrzne, działowej ≈ środek; skala 1 ± 1,5%, szum na linię
  const skala = 1 + gauss(0.007), szum = new Map(M.linie.map((l) => [l.id, gauss(2.5)]));
  const plaszczyzna = (l) => (l.zew ? l.c + l.zew * l.t / 2 : l.c);
  const wspSkan = (l) => Math.round((plaszczyzna(l) * skala + szum.get(l.id)) * 10) / 10;
  const skan = projekt(M, wspSkan, (l) => (l.gr ? 1 : 15));
  const surowe = pokoje(skan);
  poprawImport(skan, surowe, undefined, undefined, () => { skan.rooms = G.resolveRooms(skan, skan.rooms); return pokoje(skan); });
  skan.rooms = G.resolveRooms(skan, skan.rooms);
  const poImporcie = pokoje(skan);
  // dopasowanie: pomiary w ~80% pomieszczeń, rozpiętość „główna” (czasem przez/obok wnęki), kierunek losowy dla prawie kwadratowych
  const pom = [], prawdaPok = [];
  for (const o of M.obszary) {
    const pt = punkt(o, (l) => l.c), pr = P0.find((q) => wew(q.poly, pt.x, pt.y)); if (!pr) continue;
    const pts = punkt(o, wspSkan), ps = poImporcie.find((q) => wew(q.poly, pts.x, pts.y)); if (!ps) { pekniete++; continue; }
    pomieszczen++;
    prawdaPok.push({ o, pr, pts });
    if (los() < 0.2) continue;
    const R = rozpietosciSzczegolowo(prawda, pr.poly);
    const os = (k) => R.filter((r) => r.os === k).sort((p, q) => q.zasieg - p.zasieg);
    const wybierz = (L) => (L.length > 1 && los() < 0.25 ? L[1] : L[0]);
    const X = wybierz(os('x')), Y = wybierz(os('y')); if (!X || !Y) continue;
    let a = X.d + gauss(0.3), b = Y.d + gauss(0.3);
    if (Math.abs(a - b) > 20 ? a < b : los() < 0.5) [a, b] = [b, a];
    pom.push({ pokoj: ps, a, b, pts });
  }
  const przedDop = pokoje(skan); const przedDopKopia = JSON.parse(JSON.stringify(skan));
  const { raport } = dopasujDoPomiarow(skan, przedDop, pom);
  if (process.env.DEBUG2 && n === Number(process.env.DEBUG2)) {
    const lic = (f) => { const o = []; for (const w of f.walls) { const v = Math.abs(w.start.x - w.end.x) < 1; o.push(`${v ? 'x' : 'y'}${w.granica ? 'G' : ''}=${(v ? w.start.x : w.start.y).toFixed(1)}±${(w.thickness / 2).toFixed(1)}`); } return [...new Set(o)].sort().join(' '); };
    console.log('prawda ', lic(prawda)); console.log('import ', lic(przedDopKopia)); console.log('po     ', lic(skan)); console.log("linie", M.linie.map((l) => `${l.os}${l.gr ? "G" : ""} c=${l.c} t=${l.t} zew=${l.zew}`).join(" ; ")); for (const w of raport) console.log(" pom", w.a.toFixed(1), w.b.toFixed(1), w.osA, w.niepewny, JSON.stringify(w.osie.map((x) => [x.m.toFixed(1), x.przed?.toFixed(1), x.po?.toFixed(1), x.os]))); }
  for (const w of raport) for (const o of w.osie) { if (o.brak) nieprzyp++; else if (o.sprzeczny) sprzeczne++; }
  skan.rooms = G.resolveRooms(skan, skan.rooms);
  const po = pokoje(skan);
  if (po.length !== poImporcie.length) pekniete++;
  for (const { o, pr, pts } of prawdaPok) {
    const blad = (L) => { const q = L.find((x) => wew(x.poly, pts.x, pts.y)); return q ? Math.abs(q.m - pr.m) / pr.m * 100 : 100; };
    const zm = pom.some((p) => p.pts === pts);
    bl.surowy.push(blad(surowe.map((q) => ({ ...q, poly: q.poly })))); bl.import.push(blad(poImporcie));
    const d = blad(po); bl.dopas.push(d); (zm ? bl.dopasZm : bl.dopasNiezm).push(d);
    if (process.env.DEBUG && d > 3) console.log(`  n=${n} ${zm ? "ZM" : "nz"} błąd ${d.toFixed(1)}% import ${blad(poImporcie).toFixed(1)}% m=${pr.m.toFixed(2)} szacht=${!!o.szacht} granica=${M.linie.some((l) => l.gr)}`, zm ? JSON.stringify(raport.find((w) => w.pokoj === pom.find((p) => p.pts === pts).pokoj)?.osie.map((x) => [x.m.toFixed(1), x.przed?.toFixed(1), x.po?.toFixed(1), x.os]) ) : "");
  }
}
const stat = (L) => { const s = [...L].sort((a, b) => a - b); const sr = s.reduce((a, b) => a + b, 0) / s.length; return `średnio ${sr.toFixed(2)}%  · 95% przypadków ≤ ${s[Math.floor(s.length * 0.95)].toFixed(2)}%  · najgorzej ${s[s.length - 1].toFixed(2)}%`; };
console.log(`Mieszkań: ${N}, pomieszczeń: ${pomieszczen}`);
console.log('Błąd metrażu pomieszczenia (względem prawdziwego):');
console.log('  skan, stary import (ściana 15 cm na środku płaszczyzny):', stat(bl.surowy));
console.log('  skan, nowy import (zewnętrzne na zewnątrz):            ', stat(bl.import));
console.log('  po dopasowaniu do dalmierza — wszystkie:                ', stat(bl.dopas));
console.log('      — zmierzone dalmierzem:                             ', stat(bl.dopasZm));
console.log('      — niezmierzone (tylko skan):                         ', stat(bl.dopasNiezm));
console.log(`Zmiana liczby pomieszczeń (pęknięcia): ${pekniete} · pomiarów nieprzypisanych: ${nieprzyp} · sprzecznych: ${sprzeczne}`);
