// Rzut AM — dopasowanie skanu do pomiarów dalmierzem z karty pomieszczeń.
// Kształt (wnęki, załomy, ścianki) zostaje ze skanu, skala i położenie ścian — z pomiarów.
// Wszystkie pomiary naraz, jako jeden układ dla całego piętra (metoda najmniejszych kwadratów):
//  • pomiar = odległość w świetle między dwiema równoległymi ścianami pomieszczenia (waga bardzo duża),
//  • skan = odległości między ścianami połączonymi ścianą prostopadłą (waga tym mniejsza, im dłuższy odcinek —
//    skan myli się głównie na długich odcinkach, krótkie, jak głębokość wnęki, trzyma dobrze).
// Ściany przesuwają się tylko równolegle (kąty zostają), razem z nimi narożniki, drzwi, okna i meble.
// Czyste funkcje — bez DOM (testy: test/dopasuj.test.mjs).

const baza = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
const bezNumeru = (s) => baza(s).replace(/\s+\d+$/, '');

// pomieszczenia z rzutu ↔ pomieszczenia z karty: najpierw ta sama nazwa, potem ta sama nazwa bez numeru
// („Pokój 2” ↔ „Pokój”), tylko gdy para jest jednoznaczna. Zwraca [{ i (indeks w rzucie), k (pozycja z karty), przyblizone }]
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

// ---------- geometria w układzie „wyprostowanym” (ściany pionowe i poziome) ----------
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

function wInnej(pts, x, y) { // punkt w wielokącie
  let w = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i], b = pts[j];
    if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) w = !w;
  }
  return w;
}

// grupy ścian współliniowych (jedna zmienna = położenie linii)
function grupy(walls, kat) {
  const S = walls.filter((w) => !w.curvePoint).map((w) => ({ w, a: obroc(w.start, -kat), b: obroc(w.end, -kat), th: w.granica ? 1 : (w.thickness || 10) }));
  const V = [], H = [];
  for (const s of S) {
    if (Math.abs(s.a.x - s.b.x) < 1.5 && Math.abs(s.a.y - s.b.y) > 1) { s.os = 'x'; s.c = (s.a.x + s.b.x) / 2; s.lo = Math.min(s.a.y, s.b.y); s.hi = Math.max(s.a.y, s.b.y); V.push(s); }
    else if (Math.abs(s.a.y - s.b.y) < 1.5 && Math.abs(s.a.x - s.b.x) > 1) { s.os = 'y'; s.c = (s.a.y + s.b.y) / 2; s.lo = Math.min(s.a.x, s.b.x); s.hi = Math.max(s.a.x, s.b.x); H.push(s); }
    else s.os = null;
  }
  const zbuduj = (L) => { // union-find: odcinki na tej samej prostej (także z przerwą, np. ściana przerwana wnęką) — zostają w jednej linii
    const r = L.map((_, i) => i), f = (i) => (r[i] === i ? i : (r[i] = f(r[i])));
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
      if (Math.abs(L[i].c - L[j].c) < 1.5 && !!L[i].w.granica === !!L[j].w.granica) r[f(i)] = f(j);
    }
    const G = new Map();
    L.forEach((s, i) => { const k = f(i); if (!G.has(k)) G.set(k, { sciany: [], c: 0 }); G.get(k).sciany.push(s); });
    const lista = [...G.values()];
    lista.forEach((g, n) => { g.n = n; g.c = g.sciany.reduce((a, s) => a + s.c * (s.hi - s.lo), 0) / g.sciany.reduce((a, s) => a + (s.hi - s.lo), 0); for (const s of g.sciany) s.g = g; });
    return lista;
  };
  return { S, V, H, GV: zbuduj(V), GH: zbuduj(H) };
}
// grupa, na której linii leży punkt (os 'x' — linie pionowe)
function naLinii(L, p, os) {
  let best = null;
  for (const s of L) {
    const d = os === 'x' ? Math.abs(p.x - s.c) : Math.abs(p.y - s.c), t = os === 'x' ? p.y : p.x;
    if (d < TOL && t >= s.lo - TOL && t <= s.hi + TOL && (!best || d < best.d)) best = { d, g: s.g };
  }
  return best?.g || null;
}

// rozpiętości pomieszczenia w świetle wzdłuż osi: pary przeciwległych krawędzi „widzących się” przez pomieszczenie
function rozpietosci(poly, L, os) {
  const kraw = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const pion = os === 'x' ? Math.abs(a.x - b.x) < 1.5 : Math.abs(a.y - b.y) < 1.5;
    if (!pion) continue;
    const c = os === 'x' ? (a.x + b.x) / 2 : (a.y + b.y) / 2, lo = os === 'x' ? Math.min(a.y, b.y) : Math.min(a.x, b.x), hi = os === 'x' ? Math.max(a.y, b.y) : Math.max(a.x, b.x);
    // ściana pod krawędzią (grubość)
    let s = null, best = 0;
    for (const q of L) { if (Math.abs(q.c - c) > TOL) continue; const ov = Math.min(hi, q.hi) - Math.max(lo, q.lo); if (ov > best) { best = ov; s = q; } }
    if (s) kraw.push({ c, lo, hi, s });
  }
  const pary = [];
  for (const e1 of kraw) for (const e2 of kraw) {
    if (e2.c <= e1.c + 10 || e1.s.g === e2.s.g) continue;
    const lo = Math.max(e1.lo, e2.lo), hi = Math.min(e1.hi, e2.hi); if (hi - lo < 5) continue;
    let widac = false;
    for (let k = 1; k <= 5 && !widac; k++) {
      const t = lo + ((hi - lo) * k) / 6, m = (e1.c + e2.c) / 2;
      const wsr = os === 'x' ? wInnej(poly, m, t) : wInnej(poly, t, m);
      if (wsr && !kraw.some((e) => e !== e1 && e !== e2 && e.c > e1.c + 0.5 && e.c < e2.c - 0.5 && t > e.lo && t < e.hi)) widac = true;
    }
    if (widac) pary.push({ g1: e1.s.g, g2: e2.s.g, t1: e1.s.th, t2: e2.s.th, d: e2.c - e2.s.th / 2 - (e1.c + e1.s.th / 2) });
  }
  return pary;
}

// najmniejsze kwadraty: równania Σ a·Δ = r z wagą w
function rozwiaz(n, rown) {
  const N = Array.from({ length: n }, () => new Float64Array(n)), b = new Float64Array(n);
  for (const { a, r, w } of rown) for (const [i, ai] of a) { b[i] += w * ai * r; for (const [j, aj] of a) N[i][j] += w * ai * aj; }
  for (let i = 0; i < n; i++) { // eliminacja Gaussa z wyborem elementu głównego
    let p = i; for (let k = i + 1; k < n; k++) if (Math.abs(N[k][i]) > Math.abs(N[p][i])) p = k;
    [N[i], N[p]] = [N[p], N[i]]; [b[i], b[p]] = [b[p], b[i]];
    const d = N[i][i] || 1e-12;
    for (let k = i + 1; k < n; k++) { const f = N[k][i] / d; if (!f) continue; for (let j = i; j < n; j++) N[k][j] -= f * N[i][j]; b[k] -= f * b[i]; }
  }
  const x = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) { let s = b[i]; for (let j = i + 1; j < n; j++) s -= N[i][j] * x[j]; x[i] = s / (N[i][i] || 1e-12); }
  return x;
}

// pomiary: [{ pokoj (z scena().pokoje), a, b (cm), pary?: { a: [idŚciany, idŚciany], b: [...] } }]
export function dopasujDoPomiarow(fl, pokoje, pomiary) {
  const kat = katGlowny(fl.walls), G = grupy(fl.walls, kat);
  const raport = [];
  const rownX = [], rownY = [], miary = [];
  const zPar = (ids) => { // para wskazana ręcznie
    const s = ids.map((id) => G.S.find((q) => q.w.id === id)).filter(Boolean);
    if (s.length !== 2 || !s[0].os || s[0].os !== s[1].os || s[0].g === s[1].g) return null;
    const [p, q] = s[0].g.c < s[1].g.c ? s : [s[1], s[0]];
    return { os: p.os, g1: p.g, g2: q.g, d: q.g.c - q.th / 2 - (p.g.c + p.th / 2), recznie: true };
  };
  for (const pm of pomiary) {
    const poly = pm.pokoj.poly.map((p) => obroc(p, -kat));
    const X = rozpietosci(poly, G.V, 'x'), Y = rozpietosci(poly, G.H, 'y');
    const najlepsza = (L, m) => { let b = null; for (const p of L) { const e = Math.abs(p.d - m); if (e <= Math.max(20, m * 0.07) && (!b || e < b.e)) b = { ...p, e }; } return b; };
    const opcje = [[najlepsza(X, pm.a), najlepsza(Y, pm.b)], [najlepsza(Y, pm.a), najlepsza(X, pm.b)]].map(([pa, pb], i) => ({ pa: pa && { ...pa, os: i ? 'y' : 'x' }, pb: pb && { ...pb, os: i ? 'x' : 'y' }, n: !!pa + !!pb, e: (pa?.e ?? 99) + (pb?.e ?? 99) }));
    opcje.sort((u, v) => v.n - u.n || u.e - v.e);
    let { pa, pb } = opcje[0];
    if (pm.pary?.a) pa = zPar(pm.pary.a) || pa;
    if (pm.pary?.b) pb = zPar(pm.pary.b) || pb;
    const wpis = { pokoj: pm.pokoj, a: pm.a, b: pm.b, osie: [] };
    for (const [klucz, p, m] of [['a', pa, pm.a], ['b', pb, pm.b]]) {
      if (!p) { wpis.osie.push({ klucz, m, brak: true }); continue; }
      const mi = { klucz, m, p, wpis }; miary.push(mi); wpis.osie.push(mi);
      (p.os === 'x' ? rownX : rownY).push({ a: [[p.g2.n, 1], [p.g1.n, -1]], r: m - p.d, w: 1e4 });
    }
    raport.push(wpis);
  }
  // skan: odległości między liniami połączonymi ścianą prostopadłą
  const skan = (prostopadle, L, rown) => {
    for (const s of prostopadle) {
      const A = naLinii(L, s.a, L === G.V ? 'x' : 'y'), B = naLinii(L, s.b, L === G.V ? 'x' : 'y');
      if (A && B && A !== B) { const dl = Math.abs(A.c - B.c) / 100; rown.push({ a: [[B.n, 1], [A.n, -1]], r: 0, w: 1 / (dl * dl + 0.05) }); }
    }
  };
  skan(G.H, G.V, rownX); skan(G.V, G.H, rownY);
  for (const g of G.GV) rownX.push({ a: [[g.n, 1]], r: 0, w: 1e-3 });
  for (const g of G.GH) rownY.push({ a: [[g.n, 1]], r: 0, w: 1e-3 });
  const dX = G.GV.length ? rozwiaz(G.GV.length, rownX) : [], dY = G.GH.length ? rozwiaz(G.GH.length, rownY) : [];
  const delta = (g, os) => (os === 'x' ? dX[g.n] : dY[g.n]) || 0;

  // wynik każdego pomiaru po dopasowaniu
  for (const mi of miary) {
    mi.przed = mi.p.d; mi.po = mi.p.d + delta(mi.p.g2, mi.p.os) - delta(mi.p.g1, mi.p.os);
    mi.sprzeczny = Math.abs(mi.po - mi.m) > 1;
  }
  // przesunięcia punktów
  const przes = (p, s) => { // p — punkt w układzie wyprostowanym, s — ściana, do której należy (albo null)
    const gx = s?.os === 'x' ? s.g : naLinii(G.V, p, 'x'), gy = s?.os === 'y' ? s.g : naLinii(G.H, p, 'y');
    let dx = gx ? delta(gx, 'x') : null, dy = gy ? delta(gy, 'y') : null;
    if (s && (dx === null || dy === null)) { // wolny koniec ściany idzie za drugim końcem
      const q = Math.abs(p.x - s.a.x) + Math.abs(p.y - s.a.y) < 0.01 ? s.b : s.a;
      if (dx === null) { const g = s.os === 'x' ? s.g : naLinii(G.V, q, 'x'); dx = g ? delta(g, 'x') : 0; }
      if (dy === null) { const g = s.os === 'y' ? s.g : naLinii(G.H, q, 'y'); dy = g ? delta(g, 'y') : 0; }
    }
    return { dx: dx ?? 0, dy: dy ?? 0 };
  };
  const wSwiecie = (d) => obroc({ x: d.dx, y: d.dy }, kat);
  const zaokr = (v) => Math.round(v * 10) / 10;
  for (const s of G.S) for (const [k, p] of [['start', s.a], ['end', s.b]]) {
    const d = wSwiecie(przes(p, s)); s.w[k] = { x: zaokr(s.w[k].x + d.x), y: zaokr(s.w[k].y + d.y) };
  }
  // meble, schody, słupy, napisy: przesunięcie interpolowane między najbliższymi liniami ścian
  const interp = (p) => {
    const q = obroc(p, -kat), wyn = { dx: 0, dy: 0 };
    for (const [os, L, wsp, poprz] of [['x', G.GV, 'x', 'y'], ['y', G.GH, 'y', 'x']]) {
      let l = null, r = null;
      for (const g of L) {
        if (!g.sciany.some((s) => q[poprz] >= s.lo - 60 && q[poprz] <= s.hi + 60)) continue;
        if (g.c <= q[wsp] && (!l || g.c > l.c)) l = g;
        if (g.c >= q[wsp] && (!r || g.c < r.c)) r = g;
      }
      const dl = l ? delta(l, os) : null, dr = r ? delta(r, os) : null;
      const v = dl !== null && dr !== null && r.c > l.c ? dl + ((dr - dl) * (q[wsp] - l.c)) / (r.c - l.c) : dl ?? dr ?? 0;
      wyn[os === 'x' ? 'dx' : 'dy'] = v;
    }
    return wSwiecie(wyn);
  };
  for (const lista of [fl.furniture || [], fl.stairs || [], fl.columns || []]) for (const e of lista) {
    if (!e.position) continue; const d = interp(e.position); e.position = { x: zaokr(e.position.x + d.x), y: zaokr(e.position.y + d.y) };
  }
  for (const t of fl.textAnnotations || []) { const d = interp(t); t.x = zaokr(t.x + d.x); t.y = zaokr(t.y + d.y); }
  return raport;
}
