// Rzut AM — skan z LiDAR + pomiary dalmierzem z karty → rzut zgodny z rzeczywistością.
//
// Model (ten sam dla każdego mieszkania):
//  • Skaner zapisuje ścianę jako jedną płaszczyznę bez grubości. Przy ścianie zewnętrznej to wewnętrzne lico (to, co widać
//    z pokoju), przy ścianie między pomieszczeniami — mniej więcej jej środek. Import (poprawImport) układa ściany tak samo:
//    zewnętrzna rośnie na zewnątrz, działowa symetrycznie.
//  • Każda prosta ściana (linia — wszystkie odcinki na tej samej prostej) ma dwa lica jako niewiadome: L (mniejsza współrzędna)
//    i R (większa). Grubość = R − L wynika z pomiarów; gdzie ich brak — zostaje (działowa ok. 12 cm).
//  • Dane: pomiar z karty = odległość lico–lico w poprzek pomieszczenia (σ 0,5 cm); skan = położenia płaszczyzn względem
//    sąsiednich ścian (σ 1 cm + 1,5% odległości — skaner myli się głównie na długich odcinkach); grubość ściany działowej
//    (σ 4 cm), zewnętrznej (bez zmian); granica pomieszczeń nie ma położenia ze skanu — ustawia ją pomiar albo zostaje.
//  • Wszystko naraz, metodą najmniejszych kwadratów, osobno w poziomie i w pionie (ściany pod kątem prostym).
//    Narożniki i „T” liczone od nowa jako przecięcia prostych — połączenia ścian nie mogą się rozejść.
//  • Długość i szerokość z karty to para bez kierunku: sprawdzamy oba ułożenia i wybieramy to, które lepiej zgadza się ze skanem
//    i z pomiarami sąsiednich pomieszczeń. Gdy nie da się rozstrzygnąć (prawie kwadrat) — wybór jest oznaczony jako niepewny
//    i można go zamienić jednym stuknięciem (metraż prostokąta i tak się nie zmienia).
// Czyste funkcje — bez DOM (testy: test/dopasuj.test.mjs, test/symulacja.mjs).

const baza = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
const bezNumeru = (s) => baza(s).replace(/\s+\d+$/, '');
export const GRUBOSC_DZIALOWA = 12, GRUBOSC_ZEWNETRZNA = 25;

// pomieszczenia z rzutu ↔ pomieszczenia z karty: ta sama nazwa, potem bez numeru („Pokój 2” ↔ „Pokój”) — tylko jednoznacznie
export function dopasujNazwy(nazwyRzutu, karta) {
  const wynik = [], wolneK = new Set(karta.map((_, j) => j)), wolneR = new Set(nazwyRzutu.map((_, i) => i));
  nazwyRzutu.forEach((n, i) => {
    if (!baza(n)) return;
    const j = [...wolneK].find((jj) => baza(karta[jj].nazwa) === baza(n));
    if (j != null) { wynik.push({ i, k: karta[j], przyblizone: false }); wolneK.delete(j); wolneR.delete(i); }
  });
  for (const i of [...wolneR]) {
    const n = nazwyRzutu[i]; if (!baza(n)) continue;
    const kand = [...wolneK].filter((jj) => bezNumeru(karta[jj].nazwa) === bezNumeru(n));
    const rywale = [...wolneR].filter((ii) => bezNumeru(nazwyRzutu[ii]) === bezNumeru(n));
    if (kand.length === 1 && rywale.length === 1) { wynik.push({ i, k: karta[kand[0]], przyblizone: true }); wolneK.delete(kand[0]); wolneR.delete(i); }
  }
  return wynik;
}

// ---------- układ: kąt główny, ściany, linie ----------
function katGlowny(walls) {
  let sx = 0, sy = 0;
  for (const w of walls) {
    if (w.granica || w.curvePoint) continue;
    const dx = w.end.x - w.start.x, dy = w.end.y - w.start.y, L = Math.hypot(dx, dy); if (L < 30) continue;
    const a = Math.atan2(dy, dx) * 4; sx += Math.cos(a) * L; sy += Math.sin(a) * L;
  }
  return sx || sy ? Math.atan2(sy, sx) / 4 : 0;
}
const obroc = (p, k) => ({ x: p.x * Math.cos(k) - p.y * Math.sin(k), y: p.x * Math.sin(k) + p.y * Math.cos(k) });
const TOL = 3; // cm — punkt „na ścianie”
function wWielokacie(pts, x, y) {
  let w = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i], b = pts[j];
    if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) w = !w;
  }
  return w;
}

// pokoje (opcjonalnie) — wielokąty pomieszczeń, żeby rozpoznać ściany zewnętrzne
function uklad(fl, pokoje = []) {
  const kat = katGlowny(fl.walls);
  const S = fl.walls.filter((w) => !w.curvePoint).map((w) => ({ w, a: obroc(w.start, -kat), b: obroc(w.end, -kat), th: w.granica ? 0 : (w.thickness || 10) }));
  const V = [], H = [];
  for (const s of S) {
    const dx = s.b.x - s.a.x, dy = s.b.y - s.a.y, dl = Math.hypot(dx, dy), PROG = Math.sin((3 * Math.PI) / 180) * dl; // do 3° od pionu/poziomu
    s.dl = dl;
    if (dl > 1 && Math.abs(dx) <= Math.max(1.5, PROG)) { s.os = 'x'; s.c = (s.a.x + s.b.x) / 2; s.lo = Math.min(s.a.y, s.b.y); s.hi = Math.max(s.a.y, s.b.y); V.push(s); }
    else if (dl > 1 && Math.abs(dy) <= Math.max(1.5, PROG)) { s.os = 'y'; s.c = (s.a.y + s.b.y) / 2; s.lo = Math.min(s.a.x, s.b.x); s.hi = Math.max(s.a.x, s.b.x); H.push(s); }
    else s.os = null;
  }
  const polys = pokoje.filter((p) => !p.otwor).map((p) => p.poly.map((q) => obroc(q, -kat)));
  const zbuduj = (L, os) => { // odcinki na tej samej prostej (także z przerwą) = jedna linia
    const r = L.map((_, i) => i), f = (i) => (r[i] === i ? i : (r[i] = f(r[i])));
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) if (Math.abs(L[i].c - L[j].c) < 2 && !!L[i].w.granica === !!L[j].w.granica) r[f(i)] = f(j);
    const M = new Map();
    L.forEach((s, i) => { const k = f(i); if (!M.has(k)) M.set(k, { sciany: [], os }); M.get(k).sciany.push(s); });
    const G = [...M.values()];
    G.forEach((g, n) => {
      g.n = n; const dl = g.sciany.reduce((a, s) => a + s.dl, 0) || 1;
      g.c = g.sciany.reduce((a, s) => a + s.c * s.dl, 0) / dl;
      g.gr = !!g.sciany[0].w.granica;
      g.t = g.gr ? 0 : g.sciany.reduce((a, s) => a + s.th * s.dl, 0) / dl;
      for (const s of g.sciany) s.g = g;
      // zewnętrzna: po jednej stronie (na całej długości) nie ma pomieszczenia
      let plus = 0, minus = 0, n2 = 0;
      if (!g.gr && polys.length) for (const s of g.sciany) for (const k of [0.25, 0.5, 0.75]) {
        const t = s.lo + (s.hi - s.lo) * k, o = g.t / 2 + 8;
        const P = (sg) => (os === 'x' ? [g.c + sg * o, t] : [t, g.c + sg * o]);
        const ip = polys.some((q) => wWielokacie(q, ...P(1))), im = polys.some((q) => wWielokacie(q, ...P(-1)));
        n2++; if (ip && !im) plus++; if (im && !ip) minus++;
      }
      g.zewn = n2 && plus === n2 ? 1 : n2 && minus === n2 ? -1 : 0; // 1: pomieszczenie po stronie większej współrzędnej
    });
    return G;
  };
  return { kat, S, V, H, GV: zbuduj(V, 'x'), GH: zbuduj(H, 'y') };
}
const lica = (g) => ({ L: g.c - g.t / 2, R: g.c + g.t / 2 });
function naLinii(L, p, os) {
  let best = null;
  for (const s of L) {
    const d = os === 'x' ? Math.abs(p.x - s.c) : Math.abs(p.y - s.c), t = os === 'x' ? p.y : p.x;
    if (d < TOL && t >= s.lo - TOL && t <= s.hi + TOL && (!best || d < best.d)) best = { d, g: s.g };
  }
  return best?.g || null;
}

// rozpiętości pomieszczenia w świetle wzdłuż osi: pary przeciwległych krawędzi, które „widzą się” przez pomieszczenie;
// zasieg — na jakiej długości ściany stoją naprzeciw siebie (dalmierz przykłada się tam, gdzie pomieszczenie jest „całe”)
function rozpietosci(poly, L, os) {
  const kraw = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    if (!(os === 'x' ? Math.abs(a.x - b.x) < 1.5 : Math.abs(a.y - b.y) < 1.5)) continue;
    const c = os === 'x' ? (a.x + b.x) / 2 : (a.y + b.y) / 2, lo = os === 'x' ? Math.min(a.y, b.y) : Math.min(a.x, b.x), hi = os === 'x' ? Math.max(a.y, b.y) : Math.max(a.x, b.x);
    let s = null, best = 0;
    for (const q of L) { if (Math.abs(q.c - c) > TOL) continue; const ov = Math.min(hi, q.hi) - Math.max(lo, q.lo); if (ov > best) { best = ov; s = q; } }
    if (s) kraw.push({ c, lo, hi, g: s.g });
  }
  const pary = [];
  for (const e1 of kraw) for (const e2 of kraw) {
    if (e2.c <= e1.c + 10 || e1.g === e2.g) continue;
    const lo = Math.max(e1.lo, e2.lo), hi = Math.min(e1.hi, e2.hi); if (hi - lo < 5) continue;
    let zasieg = 0;
    for (let k = 0; k < 12; k++) {
      const t = lo + ((hi - lo) * (k + 0.5)) / 12, m = (e1.c + e2.c) / 2;
      const wsr = os === 'x' ? wWielokacie(poly, m, t) : wWielokacie(poly, t, m);
      if (wsr && !kraw.some((e) => e !== e1 && e !== e2 && e.c > e1.c + 0.5 && e.c < e2.c - 0.5 && t > e.lo && t < e.hi)) zasieg += (hi - lo) / 12;
    }
    if (zasieg > 4) pary.push({ g1: e1.g, g2: e2.g, os, zasieg, d: lica(e2.g).L - lica(e1.g).R });
  }
  const M = new Map(); for (const p of pary) { const k = `${p.g1.n}|${p.g2.n}`; if (!M.has(k) || M.get(k).zasieg < p.zasieg) M.set(k, p); }
  return [...M.values()];
}
export function rozpietosciPokoju(fl, poly) {
  const U = uklad(fl), q = poly.map((p) => obroc(p, -U.kat));
  return { x: rozpietosci(q, U.V, 'x').map((p) => p.d), y: rozpietosci(q, U.H, 'y').map((p) => p.d) };
}
export function rozpietosciSzczegolowo(fl, poly) { // do testów i symulacji
  const U = uklad(fl), q = poly.map((p) => obroc(p, -U.kat));
  return [...rozpietosci(q, U.V, 'x'), ...rozpietosci(q, U.H, 'y')].map((p) => ({ os: p.os, d: p.d, zasieg: p.zasieg }));
}
export function glowneWymiary(fl, poly) { const r = rozpietosciPokoju(fl, poly); return { x: Math.max(0, ...r.x), y: Math.max(0, ...r.y) }; }
// pomieszczenia bez nazwy ↔ pomieszczenia z karty po wymiarach: długość i szerokość z karty muszą pasować do którejś
// rozpiętości pomieszczenia, w dowolnym ułożeniu; tylko jednoznaczne pary
export function nazwyPoWymiarach(fl, pokoje, karta) {
  const tol = (m) => Math.max(15, m * 0.06);
  const jest = (L, m) => L.some((d) => Math.abs(d - m) <= tol(m));
  const pasuje = (r, k) => { const a = k.a * 100, b = k.b * 100; return (jest(r.x, a) && jest(r.y, b)) || (jest(r.x, b) && jest(r.y, a)); };
  const kand = pokoje.map((p) => ({ p, r: rozpietosciPokoju(fl, p.poly) })).map((x) => ({ ...x, k: karta.filter((k) => pasuje(x.r, k)) }));
  const wynik = [], uzyteK = new Set(), uzyteP = new Set();
  for (let zmiana = true; zmiana;) {
    zmiana = false;
    for (const x of kand) {
      if (uzyteP.has(x)) continue;
      const k = x.k.filter((kk) => !uzyteK.has(kk)); if (k.length !== 1) continue;
      if (kand.filter((y) => !uzyteP.has(y) && y.k.includes(k[0])).length !== 1) continue;
      wynik.push({ pokoj: x.p, k: k[0] }); uzyteK.add(k[0]); uzyteP.add(x); zmiana = true;
    }
  }
  // zostało jedno pomieszczenie i jedna pozycja w karcie — wystarczy luźniejsza zgodność (np. przedpokój otwarty na salon)
  const resztaP = kand.filter((x) => !uzyteP.has(x)), resztaK = karta.filter((k) => !uzyteK.has(k));
  if (resztaP.length === 1 && resztaK.length === 1) {
    const r = resztaP[0].r, k = resztaK[0], a = k.a * 100, b = k.b * 100, luz = (L, m) => L.some((d) => Math.abs(d - m) <= Math.max(25, m * 0.15));
    if ((luz(r.x, a) && luz(r.y, b)) || (luz(r.x, b) && luz(r.y, a))) wynik.push({ pokoj: resztaP[0].p, k });
  }
  return wynik;
}

// ---------- najmniejsze kwadraty ----------
function rozwiaz(n, rown) {
  const N = Array.from({ length: n }, () => new Float64Array(n)), b = new Float64Array(n);
  for (const { a, r, s } of rown) { const w = 1 / (s * s); for (const [i, ai] of a) { b[i] += w * ai * r; for (const [j, aj] of a) N[i][j] += w * ai * aj; } }
  for (let i = 0; i < n; i++) {
    let p = i; for (let k = i + 1; k < n; k++) if (Math.abs(N[k][i]) > Math.abs(N[p][i])) p = k;
    [N[i], N[p]] = [N[p], N[i]]; [b[i], b[p]] = [b[p], b[i]];
    const d = N[i][i] || 1e-12;
    for (let k = i + 1; k < n; k++) { const f = N[k][i] / d; if (!f) continue; for (let j = i; j < n; j++) N[k][j] -= f * N[i][j]; b[k] -= f * b[i]; }
  }
  const x = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) { let s = b[i]; for (let j = i + 1; j < n; j++) s -= N[i][j] * x[j]; x[i] = s / (N[i][i] || 1e-12); }
  let koszt = 0; // suma kwadratów ważonych odchyłek — jak bardzo trzeba było „nagiąć” skan
  for (const { a, r, s, pomiar } of rown) { if (pomiar) continue; let v = -r; for (const [i, ai] of a) v += ai * x[i]; koszt += (v * v) / (s * s); }
  return { x, koszt };
}
// położenie płaszczyzny skanu linii jako kombinacja lic (L = 2n, R = 2n+1)
const ref = (g) => (g.zewn === 1 ? [[2 * g.n + 1, 1]] : g.zewn === -1 ? [[2 * g.n, 1]] : [[2 * g.n, 0.5], [2 * g.n + 1, 0.5]]);
const refWart = (g) => (g.zewn === 1 ? lica(g).R : g.zewn === -1 ? lica(g).L : g.c);
function ukladKierunku(U, os, M) {
  const G = os === 'x' ? U.GV : U.GH, P = os === 'x' ? U.H : U.V, L = os === 'x' ? U.V : U.H;
  const rown = [];
  for (const g of G) {
    rown.push({ a: [[2 * g.n + 1, 1], [2 * g.n, -1]], r: g.t, s: g.gr ? 0.05 : g.zewn ? 0.2 : 4 }); // grubość
    rown.push({ a: ref(g), r: refWart(g), s: g.gr ? 400 : 60 }); // położenie bezwzględne — tylko kotwica
  }
  for (const s of P) { // skan: odległości między liniami połączonymi ścianą prostopadłą
    const A = naLinii(L, s.a, os), B = naLinii(L, s.b, os);
    if (!A || !B || A === B || A.gr || B.gr) continue;
    const d = refWart(B) - refWart(A);
    rown.push({ a: [...ref(B), ...ref(A).map(([i, v]) => [i, -v])], r: d, s: 1 + 0.015 * Math.abs(d) });
  }
  for (const m of M) rown.push({ a: [[2 * m.g2.n, 1], [2 * m.g1.n + 1, -1]], r: m.m, s: 0.5, pomiar: true });
  return rozwiaz(2 * G.length, rown);
}

// ---------- przesunięcie ścian (topologia zachowana) ----------
// nowe[os][n] = { c, t } — nowa oś i grubość linii (t: null — bez zmiany)
function zastosuj(fl, U, nowe) {
  const { kat, S, GV, GH } = U;
  const dl = (g) => (nowe[g.os]?.[g.n] ? nowe[g.os][g.n].c - g.c : 0);
  const T = (s) => (s.os === 'x' ? { x: dl(s.g), y: 0 } : s.os === 'y' ? { x: 0, y: dl(s.g) } : { x: 0, y: 0 });
  const kier = (s) => { const dx = s.b.x - s.a.x, dy = s.b.y - s.a.y, l = Math.hypot(dx, dy) || 1; return { x: dx / l, y: dy / l }; };
  const przeciecie = (s1, s2) => {
    const u = kier(s1), v = kier(s2), t1 = T(s1), t2 = T(s2), p = { x: s1.a.x + t1.x, y: s1.a.y + t1.y }, q = { x: s2.a.x + t2.x, y: s2.a.y + t2.y };
    const d = u.x * v.y - u.y * v.x; if (Math.abs(d) < 0.17) return null;
    const t = ((q.x - p.x) * v.y - (q.y - p.y) * v.x) / d;
    return { x: p.x + u.x * t, y: p.y + u.y * t };
  };
  const odlOdc = (p, s) => { const dx = s.b.x - s.a.x, dy = s.b.y - s.a.y, l2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p.x - s.a.x) * dx + (p.y - s.a.y) * dy) / l2)); return Math.hypot(p.x - s.a.x - t * dx, p.y - s.a.y - t * dy); };
  const konce = []; for (const s of S) for (const k of ['a', 'b']) konce.push({ s, k, p: s[k] });
  const skup = [];
  for (const e of konce) { let c = skup.find((x) => Math.hypot(x.p.x - e.p.x, x.p.y - e.p.y) <= 1.5); if (!c) skup.push((c = { p: e.p, el: [] })); c.el.push(e); }
  const nowyPkt = new Map(), wolne = [];
  for (const c of skup) {
    const proste = [...new Set(c.el.map((e) => e.s))];
    for (const s of S) if (!proste.includes(s) && odlOdc(c.p, s) < TOL) proste.push(s); // „T”: koniec w środku innej ściany
    // każdy koniec osobno: na przecięciu WŁASNEJ prostej z najbardziej prostopadłą z tego węzła (współliniowe linie mogą
    // przesunąć się różnie — np. granica i ściana w jednej linii — i wtedy węzeł się rozdziela, zamiast ciągnąć jedną ukośnie)
    for (const e of c.el) {
      let p = null, najl = 0;
      for (const q of proste) {
        if (q === e.s) continue;
        const u = kier(e.s), v = kier(q), sin = Math.abs(u.x * v.y - u.y * v.x);
        if (sin > najl + 1e-9) { const X = przeciecie(e.s, q); if (X) { p = X; najl = sin; } }
      }
      if (p) nowyPkt.set(e, p); else wolne.push({ el: [e], razem: c.el.length });
    }
  }
  for (const c of wolne) for (const e of c.el) { // wolny koniec: idzie razem z drugim końcem ściany, długość zostaje
    const inny = konce.find((x) => x.s === e.s && x.k !== e.k), np = nowyPkt.get(inny);
    const t = c.razem === 1 && np ? { x: np.x - inny.p.x, y: np.y - inny.p.y } : T(e.s);
    nowyPkt.set(e, { x: e.p.x + t.x, y: e.p.y + t.y });
  }
  const zaokr = (v) => Math.round(v * 10) / 10;
  for (const e of konce) { const q = obroc(nowyPkt.get(e), kat); e.s.w[e.k === 'a' ? 'start' : 'end'] = { x: zaokr(q.x), y: zaokr(q.y) }; }
  for (const g of [...GV, ...GH]) { const nw = nowe[g.os]?.[g.n]; if (nw && !g.gr && nw.t != null) for (const s of g.sciany) s.w.thickness = Math.round(nw.t * 2) / 2; }
  // meble, schody, słupy, napisy: przesunięcie interpolowane między najbliższymi liniami ścian
  const interp = (p) => {
    const q = obroc(p, -kat), wyn = { x: 0, y: 0 };
    for (const [os, L, poprz] of [['x', GV, 'y'], ['y', GH, 'x']]) {
      let l = null, r = null;
      for (const g of L) {
        if (!g.sciany.some((s) => q[poprz] >= s.lo - 60 && q[poprz] <= s.hi + 60)) continue;
        if (g.c <= q[os] && (!l || g.c > l.c)) l = g;
        if (g.c >= q[os] && (!r || g.c < r.c)) r = g;
      }
      const a = l ? dl(l) : null, b = r ? dl(r) : null;
      wyn[os] = a !== null && b !== null && r.c > l.c ? a + ((b - a) * (q[os] - l.c)) / (r.c - l.c) : a ?? b ?? 0;
    }
    return obroc(wyn, kat);
  };
  for (const lista of [fl.furniture || [], fl.stairs || [], fl.columns || []]) for (const e of lista) {
    if (!e.position) continue; const d = interp(e.position); e.position = { x: zaokr(e.position.x + d.x), y: zaokr(e.position.y + d.y) };
  }
  for (const t of fl.textAnnotations || []) { const d = interp(t); t.x = zaokr(t.x + d.x); t.y = zaokr(t.y + d.y); }
}

// ---------- import skanu: płaszczyzna ściany zewnętrznej = lico wewnętrzne, działowej = środek ----------
export function poprawImport(fl, pokoje, zewn = GRUBOSC_ZEWNETRZNA, dzial = GRUBOSC_DZIALOWA, przelicz = null) {
  // 1) skaner potrafi zapisać jedną ścianę jako dwa równoległe kawałki kilka cm obok siebie — sklejamy je w jedną prostą
  {
    const U0 = uklad(fl), nowe0 = { x: [], y: [] };
    for (const L of [U0.GV, U0.GH]) {
      const r = L.map((_, i) => i), f = (i) => (r[i] === i ? i : (r[i] = f(r[i])));
      const zakres = (g) => [Math.min(...g.sciany.map((s) => s.lo)), Math.max(...g.sciany.map((s) => s.hi))];
      for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
        if (L[i].gr || L[j].gr || Math.abs(L[i].c - L[j].c) > 6) continue;
        const [a0, a1] = zakres(L[i]), [b0, b1] = zakres(L[j]); if (a0 <= b1 + 10 && b0 <= a1 + 10) r[f(i)] = f(j);
      }
      const M = new Map(); L.forEach((g, i) => { const k = f(i); if (!M.has(k)) M.set(k, []); M.get(k).push(g); });
      for (const gr of M.values()) {
        if (gr.length < 2) continue;
        const dl = (g) => g.sciany.reduce((a, s) => a + s.dl, 0), c = gr.reduce((a, g) => a + g.c * dl(g), 0) / gr.reduce((a, g) => a + dl(g), 0);
        for (const g of gr) nowe0[g.os][g.n] = { c, t: null };
      }
    }
    if (nowe0.x.length || nowe0.y.length) { zastosuj(fl, U0, nowe0); if (przelicz) pokoje = przelicz(); }
  }
  // 2) płaszczyzna ściany zewnętrznej = lico od środka (ściana rośnie na zewnątrz), działowej = środek
  const U = uklad(fl, pokoje), nowe = { x: [], y: [] };
  for (const g of [...U.GV, ...U.GH]) {
    if (g.gr) continue;
    nowe[g.os][g.n] = g.zewn ? { c: g.c - g.zewn * (zewn / 2), t: zewn } : { c: g.c, t: dzial }; // płaszczyzna skanu = obecna oś
  }
  zastosuj(fl, U, nowe);
}

// ---------- dopasowanie do pomiarów ----------
// pomiary: [{ pokoj (z scena().pokoje), a, b (cm), osA?: 'x'|'y' (kierunek długości wybrany ręcznie), pary?: { a: [id, id], b: [...] } }]
export function dopasujDoPomiarow(fl, pokoje, pomiary) {
  const U = uklad(fl, pokoje);
  const tol = (m) => Math.max(25, m * 0.08);
  const zPar = (ids) => {
    const s = ids.map((id) => U.S.find((q) => q.w.id === id)).filter(Boolean);
    if (s.length !== 2 || !s[0].os || s[0].os !== s[1].os || s[0].g === s[1].g) return null;
    const [p, q] = s[0].g.c < s[1].g.c ? s : [s[1], s[0]];
    return { os: p.os, g1: p.g, g2: q.g, d: lica(q.g).L - lica(p.g).R, recznie: true };
  };
  // para ścian dla pomiaru: ta, która stoi naprzeciw na największej części pomieszczenia, jeśli pasuje;
  // inaczej najbliższa pasująca (np. pomiar przez wnękę)
  const wybierz = (L, m) => {
    const pas = L.filter((p) => Math.abs(p.d - m) <= tol(m)); if (!pas.length) return null;
    const gl = L.reduce((a, p) => (!a || p.zasieg > a.zasieg ? p : a), null);
    return pas.includes(gl) && Math.abs(gl.d - m) <= Math.max(12, m * 0.04) ? gl : pas.sort((u, v) => Math.abs(u.d - m) - Math.abs(v.d - m))[0];
  };
  const wpisy = pomiary.map((pm) => {
    const poly = pm.pokoj.poly.map((p) => obroc(p, -U.kat));
    const X = rozpietosci(poly, U.V, 'x'), Y = rozpietosci(poly, U.H, 'y');
    const opcja = (osA) => {
      const [LA, LB] = osA === 'x' ? [X, Y] : [Y, X];
      let pa = wybierz(LA, pm.a), pb = wybierz(LB, pm.b);
      if (pm.pary?.a) { const r = zPar(pm.pary.a); if (r && r.os === osA) pa = r; }
      if (pm.pary?.b) { const r = zPar(pm.pary.b); if (r && r.os !== osA) pb = r; }
      return { osA, pa, pb, n: !!pa + !!pb, e: (pa ? Math.abs(pa.d - pm.a) : 99) + (pb ? Math.abs(pb.d - pm.b) : 99) };
    };
    const o = [opcja('x'), opcja('y')].sort((u, v) => v.n - u.n || u.e - v.e);
    const reczny = pm.osA ? o.find((q) => q.osA === pm.osA) : null;
    // niepewny: oba ułożenia pasują prawie tak samo (pokój prawie kwadratowy) — rozstrzygnie całość
    const niepewny = !reczny && o[0].n === o[1].n && o[0].n > 0 && Math.abs(o[0].e - o[1].e) < 6 && Math.abs(pm.a - pm.b) < Math.max(25, 0.08 * Math.max(pm.a, pm.b));
    return { pm, opcje: o, wyb: reczny || o[0], niepewny, reczny: !!reczny };
  });
  const pomiaryOsi = (os) => { const M = []; for (const w of wpisy) for (const p of [w.wyb.pa, w.wyb.pb]) if (p && p.os === os) M.push({ g1: p.g1, g2: p.g2, m: p === w.wyb.pa ? w.pm.a : w.pm.b }); return M; };
  const licz = () => ({ x: ukladKierunku(U, 'x', pomiaryOsi('x')), y: ukladKierunku(U, 'y', pomiaryOsi('y')) });
  const niep = wpisy.filter((w) => w.niepewny).slice(0, 6);
  let R = licz();
  if (niep.length) { // przy którym ułożeniu skan trzeba najmniej „naginać”, żeby zgadzał się ze wszystkimi pomiarami
    let best = { k: R.x.koszt + R.y.koszt, maska: 0 };
    for (let maska = 1; maska < 1 << niep.length; maska++) {
      niep.forEach((w, i) => { w.wyb = maska & (1 << i) ? w.opcje[1] : w.opcje[0]; });
      const r = licz(), k = r.x.koszt + r.y.koszt; if (k < best.k - 1e-9) best = { k, maska };
    }
    niep.forEach((w, i) => { w.wyb = best.maska & (1 << i) ? w.opcje[1] : w.opcje[0]; });
    R = licz();
  }
  const licaPo = (g) => { const x = (g.os === 'x' ? R.x : R.y).x; return { L: x[2 * g.n], R: x[2 * g.n + 1] }; };
  const raport = wpisy.map((w) => ({
    pokoj: w.pm.pokoj, a: w.pm.a, b: w.pm.b, osA: w.wyb.osA, niepewny: w.niepewny, reczny: w.reczny,
    osie: [['a', w.wyb.pa, w.pm.a], ['b', w.wyb.pb, w.pm.b]].map(([klucz, p, m]) => {
      if (!p) return { klucz, m, brak: true };
      const po = licaPo(p.g2).L - licaPo(p.g1).R;
      return { klucz, m, os: p.os, przed: p.d, po, sprzeczny: Math.abs(po - m) > 1.5, recznie: !!p.recznie };
    }),
  }));
  const grubosci = [], nowe = { x: [], y: [] };
  for (const g of [...U.GV, ...U.GH]) {
    const l = licaPo(g); let t = l.R - l.L;
    if (!g.gr && !g.zewn) { if (Math.abs(t - g.t) > 1) grubosci.push({ os: g.os, przed: g.t, po: t, podejrzana: t < 5 || t > 45 }); t = Math.max(4, t); }
    nowe[g.os][g.n] = { c: (l.L + l.R) / 2, t: g.gr || g.zewn ? null : t };
  }
  zastosuj(fl, U, nowe);
  return { raport, grubosci };
}

// ---------- porządki po skanie (każde mieszkanie) ----------
// • „otwór” w ścianie między dwoma pomieszczeniami o szerokości drzwi to prawie zawsze drzwi (skaner widzi otwarte/zdjęte
//   skrzydło jako otwór) → drzwi pojedyncze; szersze przejścia zostają otworami. Szerokość skrzydła → najbliższa typowa.
// • meble wykryte podwójnie (szafka pod zlewem, lodówka w zabudowie, szafki wiszące nad blatem) → zostaje jeden.
const SKRZYDLA = [60, 70, 80, 90, 100];
export function porzadkujSkan(fl, pokoje) {
  const polys = pokoje.filter((p) => !p.otwor).map((p) => p.poly);
  const ilePokoi = (x, y) => polys.filter((q) => wWielokacie(q, x, y)).length;
  let drzwi = 0, meble = 0;
  for (const d of fl.doors || []) {
    const w = fl.walls.find((q) => q.id === d.wallId); if (!w) continue;
    const L = Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y) || 1, ux = (w.end.x - w.start.x) / L, uy = (w.end.y - w.start.y) / L;
    const cx = w.start.x + ux * d.position * L, cy = w.start.y + uy * d.position * L, o = (w.thickness || 10) / 2 + 12;
    const obie = ilePokoi(cx - uy * o, cy + ux * o) > 0 && ilePokoi(cx + uy * o, cy - ux * o) > 0;
    if (d.type === 'opening' && obie && d.width >= 55 && d.width <= 125) { d.type = 'single'; d.amZOtworu = true; drzwi++; }
    if (d.type === 'single' && d.width > 135) d.type = 'double';
    if (d.type === 'single' || d.type === 'double') {
      const n = d.type === 'double' ? 2 : 1, skrz = (d.width - 7) / n;
      const typowe = SKRZYDLA.reduce((a, s) => (Math.abs(s - skrz) < Math.abs(a - skrz) ? s : a), SKRZYDLA[0]);
      d.width = typowe * n;
    }
  }
  const F = fl.furniture || [], usun = new Set();
  const prost = (f) => ({ x0: f.position.x - (f.width || 50) / 2, x1: f.position.x + (f.width || 50) / 2, y0: f.position.y - (f.depth || 50) / 2, y1: f.position.y + (f.depth || 50) / 2 });
  const nakladanie = (a, b) => { // przybliżenie: prostokąty bez obrotu (skan i tak jest pod kątem prostym), obrócone o 90° — zamiana boków
    const ra = Math.abs(Math.round(((a.rotation || 0) % 180) / 90)) % 2 ? { ...a, width: a.depth, depth: a.width } : a, rb = Math.abs(Math.round(((b.rotation || 0) % 180) / 90)) % 2 ? { ...b, width: b.depth, depth: b.width } : b;
    const p = prost(ra), q = prost(rb), w = Math.min(p.x1, q.x1) - Math.max(p.x0, q.x0), h = Math.min(p.y1, q.y1) - Math.max(p.y0, q.y0);
    return w > 0 && h > 0 ? (w * h) / Math.min((ra.width || 50) * (ra.depth || 50), (rb.width || 50) * (rb.depth || 50)) : 0;
  };
  const kat = (f) => f.sourceCategory || f.catalogId || '';
  for (let i = 0; i < F.length; i++) for (let j = i + 1; j < F.length; j++) {
    const a = F[i], b = F[j]; if (usun.has(a) || usun.has(b) || nakladanie(a, b) < 0.6) continue;
    const sa = /storage/.test(kat(a)), sb = /storage/.test(kat(b));
    if (sa && !sb) usun.add(a); else if (sb && !sa) usun.add(b);
    else if (kat(a) === kat(b) || (sa && sb)) usun.add((a.depth || 0) * (a.width || 0) < (b.depth || 0) * (b.width || 0) ? a : b);
  }
  if (usun.size) { fl.furniture = F.filter((f) => !usun.has(f)); meble = usun.size; }
  return { drzwi, meble };
}
