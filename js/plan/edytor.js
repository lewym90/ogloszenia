// Rzut AM — edytor rzutów pod dotyk (i mysz na tej samej zasadzie).
// Zasady: jeden palec / przeciągnięcie myszą = tylko przesuwanie widoku; dwa palce / kółko = tylko powiększanie.
// Stuknięcie zaznacza. Zmienić można wyłącznie zaznaczony element i tylko gestem zaczętym na nim (albo na jego uchwycie).
import * as G from './geom.js';
import { rysuj3D, eksport3DPNG, skalaEksportu3D } from './rysuj3d.js';
import { scena, rysuj, trafienie, eksportPNG, skalaEksportu, wMeblu, wymiaryMebla, pietro, przeliczSciany, warstwaPodlog, dlugoscCzysta, wPokoju } from './rysuj.js';
import { dopasujDoPomiarow, frontSzafy, przyklejDrzwi, nazwyPoWymiarach, poprawImport, porzadkujSkan, szafaWeWnece } from './dopasuj.js';
import { MEBLE, GRUPY, PODLOGI, GRUPY_PODLOG, rodzajMebla, nazwaMebla, NAZWY_POMIESZCZEN } from './biblioteka.js';
import * as R from '../rzut.js';

const $ = (s) => document.querySelector(s);
const plotno = $('#plotno'), ctx = plotno.getContext('2d');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const noweId = () => (crypto.randomUUID ? crypto.randomUUID() : `am-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);
const cm = (v) => `${Math.round(v)} cm`;
const m2 = (v) => `${String(Math.round(v * 100) / 100).replace('.', ',')} m²`;
const IK = {
  obroc: '<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg>',
  wyrownaj: '<svg viewBox="0 0 24 24"><path d="M4 3v18"/><rect x="8" y="6" width="11" height="12" rx="1.5"/></svg>',
  odbij: '<svg viewBox="0 0 24 24"><path d="M12 3v18" stroke-dasharray="2 2.5"/><path d="M9 7L4 12l5 5V7zM15 7l5 5-5 5V7z"/></svg>',
  duplikuj: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
  usun: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
  wiecej: '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h10"/></svg>',
  kierunek: '<svg viewBox="0 0 24 24"><path d="M5 20V8a4 4 0 0 1 4-4h9"/><path d="M15 1l3 3-3 3"/></svg>',
  strona: '<svg viewBox="0 0 24 24"><path d="M3 12h18"/><path d="M8 7l4-4 4 4M8 17l4 4 4-4"/></svg>',
  zakoncz: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  cofnij: '<svg viewBox="0 0 24 24"><path d="M9 7.5L4.5 12 9 16.5"/><path d="M5 12h14"/></svg>',
  nazwa: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>',
  podloga: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v6M15 9v6M9 15v6"/></svg>',
  linijka: '<svg viewBox="0 0 24 24"><path d="M3 15l12-12 6 6-12 12z"/><path d="M7 11l2 2M10 8l2 2M13 5l2 2"/></svg>',
};

// ---------- stan ----------
const adres = new URL(location.href);
const S = {
  oid: (adres.searchParams.get('am') || '').replace(/[^A-Za-z0-9_-]/g, '') || null,
  projekt: null, sc: null, widok: { s: 1, ox: 0, oy: 0 }, dpr: Math.min(window.devicePixelRatio || 1, 3),
  zazn: null, narzedzie: 'widok', meble: true, wymiary: true, tryb3d: false,
  historia: [], przyszlosc: [], zmienione: false, pomKarty: [], nazwa: 'Rzut', bazaT: null,
  obrazy: new Map(), rys: null, akcja: null, podglad: null, arkusz: null,
};

// ---------- rysowanie ----------
let ramka = 0;
function odswiez() { if (!ramka) ramka = requestAnimationFrame(() => { ramka = 0; rysujTeraz(); }); }
function przebuduj() { if (S.projekt) { for (const f of S.projekt.floors || []) przyklejDrzwi(f); S.sc = scena(S.projekt, S.pomKarty); } odswiez(); }
function rozmiar() {
  const r = plotno.parentElement.getBoundingClientRect();
  plotno.width = Math.max(1, Math.round(r.width * S.dpr)); plotno.height = Math.max(1, Math.round(r.height * S.dpr));
  odswiez();
}
new ResizeObserver(rozmiar).observe(plotno.parentElement);
const bufor = { c: document.createElement('canvas'), widok: null };
function rysujTeraz() {
  if (S.sc && bufor.widok && (szczypanie || S.akcja?.pan && S.akcja.ruszony || performance.now() - (S.kolkoT || 0) < 160)) { // gest widoku: przesuwamy gotowy obraz zamiast rysować od nowa
    const b = bufor.widok, k = S.widok.s / b.s;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#F3F0EA'; ctx.fillRect(0, 0, plotno.width, plotno.height);
    ctx.setTransform(k, 0, 0, k, (S.widok.ox - b.ox * k) * S.dpr, (S.widok.oy - b.oy * k) * S.dpr);
    ctx.drawImage(bufor.c, 0, 0);
    nakladka(); clearTimeout(rysujTeraz.t); rysujTeraz.t = setTimeout(odswiez, 140); return;
  }
  if (!S.sc) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#F3F0EA'; ctx.fillRect(0, 0, plotno.width, plotno.height); return; }
  const A = S.akcja, edycja = !!(A?.ruszony && A.zmiana);
  const op = { meble: S.meble, wymiary: S.wymiary, wymiaryPokoi: wymiaryPokoi(), zaznaczone: S.zazn, obrazy: S.obrazy, tlo: '#F3F0EA' };
  if (edycja && A.mebel) { // przeciąganie mebla: podłogi z cieniami bez zmian — kopiujemy gotową warstwę
    if (!A.podlogi) A.podlogi = warstwaPodlog(S.sc, { ...S.widok, dpr: S.dpr }, op, plotno.width, plotno.height);
    op.podlogi = A.podlogi;
  } else if (edycja) op.bezCienia = true; // ściany i otwory: szybki podgląd, pełne cienie po puszczeniu
  if (S.tryb3d) rysuj3D(ctx, S.sc, { ...S.widok, dpr: S.dpr }, { meble: S.meble, wymiaryPokoi: wymiaryPokoi(), obrazy: S.obrazy, tlo: '#F3F0EA' }); // podgląd 3D: bez edycji
  else rysuj(ctx, S.sc, { ...S.widok, dpr: S.dpr }, op);
  if (bufor.c.width !== plotno.width || bufor.c.height !== plotno.height) { bufor.c.width = plotno.width; bufor.c.height = plotno.height; }
  bufor.c.getContext('2d').drawImage(plotno, 0, 0); bufor.widok = { ...S.widok };
  nakladka();
}
const doEkranu = (x, y) => ({ x: x * S.widok.s + S.widok.ox, y: y * S.widok.s + S.widok.oy });
const doSwiata = (x, y) => ({ x: (x - S.widok.ox) / S.widok.s, y: (y - S.widok.oy) / S.widok.s });

// uchwyty zaznaczonego elementu (w px ekranu)
function uchwyty() {
  const z = S.zazn; if (!z || !S.sc) return [];
  const fl = S.sc.fl;
  if (z.rodzaj === 'mebel') {
    const f = fl.furniture.find((q) => q.id === z.id); if (!f) return [];
    const { w, d } = wymiaryMebla(f), a = ((f.rotation || 0) * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    const P = (lx, ly) => doEkranu(f.position.x + lx * c - ly * s, f.position.y + lx * s + ly * c);
    // uchwyty rozmiaru są zawsze; przy małym elemencie (albo dużym oddaleniu) odsunięte poza obrys, żeby dało się je złapać
    const min = 24 / S.widok.s, hw = Math.max(w / 2, min), hd = Math.max(d / 2, min);
    const gora = P(0, -d / 2), odst = (d / 2 < min ? hd - d / 2 + 36 : 34) / S.widok.s;
    return [{ typ: 'obrot', ...P(0, -d / 2 - odst), od: gora },
      { typ: 'kraw', kraw: 'p', ...P(hw, 0) }, { typ: 'kraw', kraw: 'l', ...P(-hw, 0) },
      { typ: 'kraw', kraw: 'd', ...P(0, hd) }, { typ: 'kraw', kraw: 'g', ...P(0, -hd) }];
  }
  if (z.rodzaj === 'sciana') {
    const w = fl.walls.find((q) => q.id === z.id); if (!w) return [];
    return [{ typ: 'koniec', koniec: 'start', ...doEkranu(w.start.x, w.start.y) }, { typ: 'koniec', koniec: 'end', ...doEkranu(w.end.x, w.end.y) }];
  }
  return [];
}
function nakladka() {
  const d = S.dpr; ctx.save(); ctx.setTransform(d, 0, 0, d, 0, 0);
  for (const u of uchwyty()) {
    if (u.typ === 'obrot') { ctx.beginPath(); ctx.moveTo(u.od.x, u.od.y); ctx.lineTo(u.x, u.y); ctx.strokeStyle = '#C8A44D'; ctx.lineWidth = 1.5; ctx.stroke(); }
    const ruchomy = u.typ === 'koniec' && S.zazn?.rodzaj === 'sciana' && element() && koniecSciany(element()) === u.koniec;
    ctx.beginPath(); ctx.arc(u.x, u.y, u.typ === 'obrot' ? 13 : 9, 0, 7); ctx.fillStyle = ruchomy ? '#C8A44D' : '#fff'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#C8A44D'; ctx.stroke();
    if (u.typ === 'obrot') { ctx.beginPath(); ctx.arc(u.x, u.y, 6, -2.6, 1.6); ctx.strokeStyle = '#7a5f22'; ctx.lineWidth = 1.8; ctx.stroke(); ctx.beginPath(); ctx.moveTo(u.x + 0.3, u.y + 6); ctx.lineTo(u.x - 3.2, u.y + 6.8); ctx.lineTo(u.x - 0.6, u.y + 3.6); ctx.stroke(); }
  }
  // podgląd rysowanej ściany
  const r = S.rys;
  if (r && r.punkty.length && r.kursor) {
    const a = doEkranu(r.punkty[r.punkty.length - 1].x, r.punkty[r.punkty.length - 1].y), b = doEkranu(r.kursor.x, r.kursor.y);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineWidth = r.granica ? 2 : Math.max(3, 12 * S.widok.s); ctx.strokeStyle = r.granica ? 'rgba(138,116,68,0.9)' : 'rgba(28,27,25,0.6)';
    if (r.granica) ctx.setLineDash([8, 6]); ctx.stroke(); ctx.setLineDash([]);
    const L = Math.hypot(r.kursor.x - r.punkty[r.punkty.length - 1].x, r.kursor.y - r.punkty[r.punkty.length - 1].y);
    etykieta(`${Math.round(L)} cm`, (a.x + b.x) / 2, (a.y + b.y) / 2 - 18);
  }
  if (r) for (const p of r.punkty) { const q = doEkranu(p.x, p.y); ctx.beginPath(); ctx.arc(q.x, q.y, 6, 0, 7); ctx.fillStyle = '#C8A44D'; ctx.fill(); }
  if (S.projekt && S.narzedzie === 'widok' && !S.tryb3d) for (const p of wolneKonce()) { const q = doEkranu(p.x, p.y); ctx.beginPath(); ctx.arc(q.x, q.y, 9, 0, 7); ctx.lineWidth = 3; ctx.strokeStyle = '#D9534F'; ctx.stroke(); }
  if (S.para) for (const id of S.para.sciany) { const w = fl().walls.find((q) => q.id === id); if (!w) continue; const a = doEkranu(w.start.x, w.start.y), b = doEkranu(w.end.x, w.end.y); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(200,164,77,0.85)'; ctx.stroke(); }
  if (S.podglad?.tekst) etykieta(S.podglad.tekst, S.podglad.x, S.podglad.y);
  ctx.restore();
}
function etykieta(t, x, y) {
  ctx.font = '600 13px Archivo, system-ui, sans-serif'; const w = ctx.measureText(t).width + 16;
  ctx.fillStyle = 'rgba(11,11,13,0.88)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - w / 2, y - 13, w, 26, 8) : ctx.rect(x - w / 2, y - 13, w, 26); ctx.fill();
  ctx.fillStyle = '#EDE7DA'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, x, y + 0.5);
}
function dopasuj() {
  if (!S.sc) return;
  const b = S.sc.granice, r = plotno.parentElement.getBoundingClientRect();
  const marg = Math.min(84, Math.max(52, r.width * 0.14)), dol = S.zazn ? 80 : 20; // miejsce na wymiary przy ścianach zewnętrznych
  const s = Math.min((r.width - 2 * marg) / Math.max(50, b.x1 - b.x0), (r.height - 2 * marg - dol) / Math.max(50, b.y1 - b.y0));
  S.widok = { s, ox: r.width / 2 - ((b.x0 + b.x1) / 2) * s, oy: (r.height - dol) / 2 - ((b.y0 + b.y1) / 2) * s };
  odswiez();
}

// ---------- historia (cofnij / ponów) i autozapis ----------
const migawka = () => JSON.stringify(S.projekt);
function zapamietaj(m = migawka()) { S.historia.push(m); if (S.historia.length > 100) S.historia.shift(); S.przyszlosc = []; zmieniono(); }
function zmieniono() { S.zmienione = true; przyciskiHistorii(); szkic(); }
function przyciskiHistorii() { $('[data-a=cofnij]').disabled = !S.historia.length; $('[data-a=ponow]').disabled = !S.przyszlosc.length; }
function cofnij() { if (!S.historia.length) return; S.przyszlosc.push(migawka()); S.projekt = JSON.parse(S.historia.pop()); poZmianieHistorii(); }
function ponow() { if (!S.przyszlosc.length) return; S.historia.push(migawka()); S.projekt = JSON.parse(S.przyszlosc.pop()); poZmianieHistorii(); }
function poZmianieHistorii() {
  if (S.zazn && !istnieje(S.zazn)) S.zazn = null;
  przebuduj(); interfejs(); zmieniono();
}
let szkicT = 0;
function szkic() {
  clearTimeout(szkicT);
  szkicT = setTimeout(() => { if (S.oid && S.projekt) R.wloz(`szkic:${S.oid}`, { plan: migawka(), t: Date.now(), bazaT: S.bazaT }).catch(() => {}); }, 600);
}

// ---------- pomocnicze geometrii ----------
const fl = () => pietro(S.projekt);
function istnieje(z) {
  const f = fl();
  if (z.rodzaj === 'mebel') return f.furniture.some((q) => q.id === z.id);
  if (z.rodzaj === 'sciana') return f.walls.some((q) => q.id === z.id);
  if (z.rodzaj === 'drzwi') return f.doors.some((q) => q.id === z.id);
  if (z.rodzaj === 'okno') return f.windows.some((q) => q.id === z.id);
  if (z.rodzaj === 'pokoj') return S.sc?.pokoje.some((p) => p.room.id === z.id);
  return false;
}
function element(z = S.zazn) {
  if (!z) return null;
  const f = fl();
  if (z.rodzaj === 'mebel') return f.furniture.find((q) => q.id === z.id);
  if (z.rodzaj === 'sciana') return f.walls.find((q) => q.id === z.id);
  if (z.rodzaj === 'drzwi') return f.doors.find((q) => q.id === z.id);
  if (z.rodzaj === 'okno') return f.windows.find((q) => q.id === z.id);
  if (z.rodzaj === 'pokoj') return S.sc?.pokoje.find((p) => p.room.id === z.id);
  return null;
}
// po zmianie ścian: pomieszczenia liczone od nowa, nazwy zostają (wg granic)
function poScianach() {
  const f = fl();
  const stare = (S.sc?.pokoje || []).filter((p) => p.nazwa).map((p) => ({ poly: p.poly, room: p.room }));
  try { f.rooms = G.resolveRooms(f, f.rooms || []); } catch { /* */ }
  nazwyPoPodziale(f, stare);
  przebuduj();
}
// pomieszczenie podzielone granicą lub ścianą: największa część zachowuje nazwę i podłogę, reszta czeka na nazwę
function nazwyPoPodziale(f, stare) {
  let twarze = [];
  try { twarze = G.resolveRoomGeometry(f, f.rooms); } catch { return; }
  const pole = (pts) => Math.abs(pts.reduce((a, p, i) => { const q = pts[(i + 1) % pts.length]; return a + p.x * q.y - q.x * p.y; }, 0) / 2);
  const wPoly = (pts, x, y) => { let w = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) w = !w; } return w; };
  const nowe = twarze.filter((t) => !t.room.name || /^Room \d+$/.test(t.room.name));
  const doRodzica = new Map();
  for (const t of nowe) {
    const c = { x: t.polygon.reduce((a, q) => a + q.x, 0) / t.polygon.length, y: t.polygon.reduce((a, q) => a + q.y, 0) / t.polygon.length };
    const rodzic = stare.find((o) => wPoly(o.poly, c.x, c.y) && !twarze.some((x) => x.room.name === o.room.name && x !== t && x.room.name));
    if (rodzic) { const l = doRodzica.get(rodzic) || []; l.push(t); doRodzica.set(rodzic, l); }
  }
  for (const [rodzic, czesci] of doRodzica) {
    czesci.sort((a, b) => pole(b.polygon) - pole(a.polygon));
    const r = f.rooms.find((q) => q.id === czesci[0].room.id);
    if (r) { r.name = rodzic.room.name; for (const k of ['amPodloga', 'amDopasowanie', 'amBezWymiarow', 'amPary', 'amOsA']) if (rodzic.room[k] !== undefined) r[k] = JSON.parse(JSON.stringify(rodzic.room[k])); }
  }
  for (const r of f.rooms) if (/^Room \d+$/.test(r.name || '')) r.name = '';
  pamiecNazw(f, stare, wPoly);
}
// pamięć nazw: gdy nazwane pomieszczenie znika (np. ściany na chwilę się rozeszły i dwa pokoje zlały się w jeden),
// jego nazwa, podłoga i dopasowanie czekają w miejscu, gdzie było — i wracają, gdy pomieszczenie znów się zamknie
function pamiecNazw(f, stare, wPoly) {
  let twarze = []; try { twarze = G.resolveRoomGeometry(f, f.rooms); } catch { return; }
  const POLA = ['name', 'amPodloga', 'amDopasowanie', 'amBezWymiarow', 'amPary', 'amOsA'];
  const sa = new Set(twarze.map((t) => (t.room.name || '').trim()).filter(Boolean));
  const P = (f.amZnikniete || []).filter((e) => !sa.has(e.meta.name));
  for (const o of stare) {
    if (sa.has(o.room.name) || P.some((e) => e.meta.name === o.room.name)) continue;
    const c = punktWewnatrz(o.poly, wPoly); if (!c) continue;
    const meta = {}; for (const k of POLA) if (o.room[k] !== undefined) meta[k] = JSON.parse(JSON.stringify(o.room[k]));
    P.push({ meta, punkt: c });
  }
  for (const t of twarze) {
    if (t.room.name) continue;
    const i = P.findIndex((e) => wPoly(t.polygon, e.punkt.x, e.punkt.y)); if (i < 0) continue;
    const r = f.rooms.find((q) => q.id === t.room.id); if (r) Object.assign(r, P[i].meta);
    P.splice(i, 1);
  }
  if (P.length) f.amZnikniete = P.slice(-20); else delete f.amZnikniete;
}
function punktWewnatrz(poly, wPoly) {
  const c = { x: poly.reduce((a, q) => a + q.x, 0) / poly.length, y: poly.reduce((a, q) => a + q.y, 0) / poly.length };
  if (wPoly(poly, c.x, c.y)) return c;
  const xs = poly.map((q) => q.x), ys = poly.map((q) => q.y), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  let best = null;
  for (let i = 1; i < 12; i++) for (let j = 1; j < 12; j++) { const x = x0 + ((x1 - x0) * i) / 12, y = y0 + ((y1 - y0) * j) / 12; if (wPoly(poly, x, y)) { const d = Math.hypot(x - c.x, y - c.y); if (!best || d < best.d) best = { x, y, d }; } }
  return best && { x: best.x, y: best.y };
}
function rzutNaOdcinek(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return { t, x: a.x + t * dx, y: a.y + t * dy, d: Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)) };
}
const rownoPunkt = (a, b, tol = 1.5) => Math.abs(a.x - b.x) <= tol && Math.abs(a.y - b.y) <= tol;
// przyciąganie punktu: końce ścian, potem ściany, potem kąt prosty względem punktu odniesienia
function przyciagnij(p, odniesienie, pomin = null) {
  const tol = Math.min(16 / S.widok.s, 35), f = fl(); // przy małym powiększeniu nie dalej niż 35 cm
  const prosty = (q) => { if (!odniesienie) return false; const a = Math.atan2(q.y - odniesienie.y, q.x - odniesienie.x), k = Math.round(a / (Math.PI / 2)) * (Math.PI / 2); return Math.abs(a - k) < (3 * Math.PI) / 180; };
  let best = null;
  for (const w of f.walls) {
    if (w.id === pomin) continue;
    for (const q of [w.start, w.end]) {
      const d = Math.hypot(q.x - p.x, q.y - p.y);
      // narożnik przyciąga tylko wtedy, gdy nie psuje kąta prostego względem poprzedniego punktu
      if (d < tol && (!odniesienie || prosty(q)) && (!best || d < best.d)) best = { x: q.x, y: q.y, d, rodzaj: 'koniec' };
    }
  }
  if (best) return best;
  let out = { x: p.x, y: p.y };
  if (odniesienie) {
    const dx = out.x - odniesienie.x, dy = out.y - odniesienie.y, kat = Math.atan2(dy, dx), k90 = Math.round(kat / (Math.PI / 2)) * (Math.PI / 2);
    if (Math.abs(kat - k90) < (10 * Math.PI) / 180) { const L = Math.hypot(dx, dy); out = { x: odniesienie.x + Math.round(Math.cos(k90)) * L, y: odniesienie.y + Math.round(Math.sin(k90)) * L }; }
  }
  for (const w of f.walls) {
    if (w.id === pomin || w.curvePoint) continue;
    const r = rzutNaOdcinek(out, w.start, w.end);
    if (r.d < tol * 0.7 && r.t > 0.02 && r.t < 0.98) {
      if (odniesienie) { // przecięcie z kierunkiem rysowania, żeby nie zgubić kąta prostego
        const pr = przeciecie(odniesienie, out, w.start, w.end); if (pr && Math.hypot(pr.x - out.x, pr.y - out.y) < tol) return { ...pr, rodzaj: 'sciana', wall: w.id };
      }
      return { x: r.x, y: r.y, rodzaj: 'sciana', wall: w.id };
    }
  }
  return { x: Math.round(out.x), y: Math.round(out.y) };
}
function przeciecie(a, b, c, d) {
  const r = { x: b.x - a.x, y: b.y - a.y }, s = { x: d.x - c.x, y: d.y - c.y }, den = r.x * s.y - r.y * s.x;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c.x - a.x) * s.y - (c.y - a.y) * s.x) / den;
  return { x: a.x + t * r.x, y: a.y + t * r.y };
}
// podział ściany w punkcie (gdy nowa ściana dochodzi do środka istniejącej) — otwory zostają na swoich miejscach
function podzielSciane(wallId, p) {
  const f = fl(), w = f.walls.find((q) => q.id === wallId); if (!w) return;
  const L = Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y), t = rzutNaOdcinek(p, w.start, w.end).t;
  if (t * L < 5 || (1 - t) * L < 5) return;
  const nowa = { ...JSON.parse(JSON.stringify(w)), id: noweId(), start: { x: p.x, y: p.y } };
  delete nowa.details;
  w.end = { x: p.x, y: p.y };
  for (const kol of ['doors', 'windows']) for (const o of f[kol]) if (o.wallId === w.id) {
    const poz = o.position * L;
    if (poz > t * L) { o.wallId = nowa.id; o.position = (poz - t * L) / ((1 - t) * L); } else o.position = poz / (t * L);
  }
  f.walls.push(nowa);
}

// ---------- gesty ----------
const wskazniki = new Map();
let szczypanie = null;
const PROG = 7; // px — mniejszy ruch to stuknięcie
plotno.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  try { plotno.setPointerCapture(e.pointerId); } catch { /* zdarzenia syntetyczne w testach */ }
  const r = plotno.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  wskazniki.set(e.pointerId, { x, y, x0: x, y0: y, typ: e.pointerType });
  if (wskazniki.size === 2) { // drugi palec: tylko powiększanie; przerwij każdą rozpoczętą zmianę
    przerwijAkcje();
    const [a, b] = [...wskazniki.values()];
    szczypanie = { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
    return;
  }
  if (wskazniki.size > 2) return;
  S.akcja = wybierzAkcje(x, y, e);
  S.akcja.t0 = performance.now();
});
plotno.addEventListener('pointermove', (e) => {
  const r = plotno.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  if (!wskazniki.has(e.pointerId)) { // mysz bez wciśnięcia: podgląd rysowanej ściany
    if (S.rys && e.pointerType === 'mouse') { const p = doSwiata(x, y); const ost = S.rys.punkty[S.rys.punkty.length - 1]; S.rys.kursor = ost ? przyciagnij(p, ost) : null; odswiez(); }
    return;
  }
  const w = wskazniki.get(e.pointerId); const dx = x - w.x, dy = y - w.y; w.x = x; w.y = y;
  if (szczypanie && wskazniki.size >= 2) {
    const [a, b] = [...wskazniki.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
    zoom(d / (szczypanie.d || d), szczypanie.cx, szczypanie.cy);
    S.widok.ox += cx - szczypanie.cx; S.widok.oy += cy - szczypanie.cy;
    szczypanie = { d, cx, cy }; odswiez(); return;
  }
  const A = S.akcja; if (!A) return;
  if (!A.ruszony && Math.hypot(x - w.x0, y - w.y0) < PROG) return;
  if (!A.ruszony) { A.ruszony = true; if (A.zmiana) A.przed = migawka(); plotno.classList.add('chwyt'); }
  A.ruch?.(x, y, dx, dy);
  odswiez();
});
const koniec = (e) => {
  if (!wskazniki.has(e.pointerId)) return;
  const w = wskazniki.get(e.pointerId); wskazniki.delete(e.pointerId);
  plotno.classList.remove('chwyt');
  if (szczypanie) { if (wskazniki.size < 2) szczypanie = null; S.akcja = null; odswiez(); return; }
  const A = S.akcja; S.akcja = null;
  if (!A) return;
  if (!A.ruszony) { if (e.type === 'pointerup' && performance.now() - A.t0 < 800) stukniecie(w.x0, w.y0, w.typ); return; }
  if (A.zmiana && A.przed) { if (A.przed !== migawka()) { zapamietaj(A.przed); A.koniec?.(); } }
  S.podglad = null; interfejs(); odswiez();
};
plotno.addEventListener('pointerup', koniec);
plotno.addEventListener('pointercancel', (e) => { przerwijAkcje(); koniec(e); });
plotno.addEventListener('wheel', (e) => {
  e.preventDefault();
  const r = plotno.getBoundingClientRect();
  const k = e.ctrlKey ? Math.exp(-e.deltaY * 0.012) : Math.exp(-e.deltaY * 0.0018); // ctrl = gest szczypania na touchpadzie
  S.kolkoT = performance.now(); zoom(k, e.clientX - r.left, e.clientY - r.top); odswiez();
}, { passive: false });
for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
plotno.addEventListener('contextmenu', (e) => e.preventDefault());

function zoom(k, cx, cy) {
  const s = Math.max(0.05, Math.min(12, S.widok.s * k)); k = s / S.widok.s;
  S.widok.ox = cx - (cx - S.widok.ox) * k; S.widok.oy = cy - (cy - S.widok.oy) * k; S.widok.s = s;
}
function przerwijAkcje() {
  const A = S.akcja; S.akcja = null;
  if (A?.ruszony && A.przed) { S.projekt = JSON.parse(A.przed); przebuduj(); } // zmiana zaczęta jednym palcem nie zostaje, gdy dołącza drugi
  S.podglad = null;
}
// co robi gest zaczęty w punkcie (x, y)
function wybierzAkcje(x, y, e) {
  const pan = { pan: true, ruch: (_x, _y, dx, dy) => { S.widok.ox += dx; S.widok.oy += dy; } };
  if (!S.projekt) return pan;
  for (const u of uchwyty()) if (Math.hypot(u.x - x, u.y - y) < (e.pointerType === 'mouse' ? 14 : 24)) {
    if (u.typ === 'obrot') return akcjaObrotu();
    if (u.typ === 'kraw') return akcjaRozmiaru(u.kraw, x, y);
    if (u.typ === 'koniec') return akcjaKonca(u.koniec);
  }
  const p = doSwiata(x, y), tol = 12 / S.widok.s;
  const z = S.zazn;
  if (z && S.narzedzie === 'widok') {
    if (z.rodzaj === 'mebel') { const f = element(); if (f && wMeblu(f, p.x, p.y, tol * 0.3)) return akcjaPrzesuniecia(f, p); }
    if (z.rodzaj === 'drzwi' || z.rodzaj === 'okno') { const h = trafienie(S.sc, p.x, p.y, tol, { meble: false }); if (h && h.id === z.id) return akcjaOtworu(p); }
    if (z.rodzaj === 'sciana') { const w = element(); if (w && rzutNaOdcinek(p, w.start, w.end).d <= (w.thickness || 10) / 2 + tol) return akcjaSciany(p); }
  }
  return pan;
}
function akcjaPrzesuniecia(f, p0) {
  const start = { ...f.position }, prz = { x: p0.x - f.position.x, y: p0.y - f.position.y };
  return {
    zmiana: true, mebel: true,
    ruch: (x, y) => {
      const p = doSwiata(x, y);
      f.position = { x: Math.round(p.x - prz.x), y: Math.round(p.y - prz.y) };
      magnes(f);
    },
    koniec: () => { if (start.x === f.position.x && start.y === f.position.y) return; przebuduj(); },
  };
}
function akcjaObrotu() {
  const f = element();
  return {
    zmiana: true, mebel: true,
    ruch: (x, y) => {
      const c = doEkranu(f.position.x, f.position.y);
      let kat = (Math.atan2(y - c.y, x - c.x) * 180) / Math.PI + 90;
      const katy = [0, 90, 180, 270, 360, -90, -180]; // przyciąganie do 15° i do kierunku ścian
      for (const w of fl().walls) { const a = (Math.atan2(w.end.y - w.start.y, w.end.x - w.start.x) * 180) / Math.PI; katy.push(a, a + 90, a + 180, a - 90); }
      let best = null;
      for (const a of katy) { const r = ((((kat - a) % 360) + 540) % 360) - 180; if (Math.abs(r) < 5 && (!best || Math.abs(r) < Math.abs(best.r))) best = { a, r }; }
      kat = best ? kat - best.r : Math.round(kat / 15) * 15;
      f.rotation = Math.round(((kat % 360) + 360) % 360 * 10) / 10;
      S.podglad = { tekst: `${Math.round(f.rotation)}°`, x: c.x, y: c.y - 40 };
    },
  };
}
const proporcjonalny = (f) => MEBLE[rodzajMebla(f)].skala === 'p'; // grafika „w proporcjach” (rośliny, okrągłe stoły, fotele…) — rozmiar zmienia się w obu kierunkach naraz
function akcjaRozmiaru(kraw, x0, y0) {
  const f = element(), { w: w0, d: d0 } = wymiaryMebla(f), a = ((f.rotation || 0) * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  const sx = Math.abs(f.scale?.x ?? 1) || 1, sy = Math.abs(f.scale?.y ?? 1) || 1, p0 = { ...f.position }, prop = proporcjonalny(f);
  const lok = (x, y) => { const p = doSwiata(x, y), dx = p.x - p0.x, dy = p.y - p0.y; return { lx: dx * c + dy * s, ly: -dx * s + dy * c }; }; // w układzie mebla
  const st = lok(x0 ?? 0, y0 ?? 0);
  return {
    zmiana: true, mebel: true,
    ruch: (x, y) => {
      const { lx, ly } = lok(x, y), mx = lx - st.lx, my = ly - st.ly; // przesunięcie palca od chwycenia uchwytu
      let w = w0, d = d0, cx = 0, cy = 0;
      if (kraw === 'p') { w = Math.max(10, Math.round(w0 + mx)); cx = (w - w0) / 2; }
      if (kraw === 'l') { w = Math.max(10, Math.round(w0 - mx)); cx = -(w - w0) / 2; }
      if (kraw === 'd') { d = Math.max(10, Math.round(d0 + my)); cy = (d - d0) / 2; }
      if (kraw === 'g') { d = Math.max(10, Math.round(d0 - my)); cy = -(d - d0) / 2; }
      if (prop) { // obie strony w tej samej proporcji, środek zostaje
        const k = kraw === 'p' || kraw === 'l' ? w / w0 : d / d0;
        w = Math.max(10, Math.round(w0 * k)); d = Math.max(10, Math.round(d0 * k)); cx = 0; cy = 0;
      }
      f.width = w / sx; f.depth = d / sy;
      f.position = { x: p0.x + cx * c - cy * s, y: p0.y + cx * s + cy * c };
      const q = doEkranu(f.position.x, f.position.y);
      S.podglad = { tekst: `${Math.round(w)} × ${Math.round(d)} cm`, x: q.x, y: q.y };
    },
  };
}
// przesuwanie ściany równolegle; połączone ściany idą za nią
function akcjaSciany(p0) {
  const w = element(), f = fl(), ux = (w.end.x - w.start.x), uy = (w.end.y - w.start.y), L = Math.hypot(ux, uy) || 1, nx = -uy / L, ny = ux / L;
  const kopia = f.walls.map((q) => [q, { ...q.start }, { ...q.end }]), linia = liniaSciany(w); // razem z przedłużeniami — nic się nie krzywi
  return {
    zmiana: true,
    ruch: (x, y) => {
      for (const [q, a, b] of kopia) { q.start = { ...a }; q.end = { ...b }; }
      const p = doSwiata(x, y), o = Math.round((p.x - p0.x) * nx + (p.y - p0.y) * ny);
      przesunLinie(linia, nx * o, ny * o);
      przebudujSzybko();
      const q = doEkranu((w.start.x + w.end.x) / 2, (w.start.y + w.end.y) / 2); S.podglad = { tekst: `${o > 0 ? '+' : ''}${o} cm`, x: q.x, y: q.y - 30 };
    },
    koniec: poScianach,
  };
}
function akcjaKonca(k) {
  const w = element(), f = fl(), baza = { ...w[k] }, drugi = k === 'start' ? 'end' : 'start';
  if (naKoncu(w, k).length) { // narożnik / „T”: tylko wzdłuż ściany, ściana na końcu przesuwa się równolegle — nic się nie krzywi
    const kopia = f.walls.map((q) => [q, { ...q.start }, { ...q.end }]), L0 = Math.hypot(w[k].x - w[drugi].x, w[k].y - w[drugi].y) || 1;
    const ux = (w[k].x - w[drugi].x) / L0, uy = (w[k].y - w[drugi].y) / L0;
    return {
      zmiana: true,
      ruch: (x, y) => {
        for (const [q, a, b] of kopia) { q.start = { ...a }; q.end = { ...b }; }
        const p = doSwiata(x, y); let d = Math.round((p.x - baza.x) * ux + (p.y - baza.y) * uy);
        if (L0 + d < 10) d = 10 - L0;
        przesunKoniec(w, k, d); przebudujSzybko();
        const q = doEkranu(w[k].x, w[k].y); S.podglad = { tekst: `${Math.round(czysta(w))} cm`, x: q.x, y: q.y - 34 };
      },
      koniec: poScianach,
    };
  }
  const zwiazane = [];
  for (const q of f.walls) if (q !== w) for (const kk of ['start', 'end']) if (rownoPunkt(q[kk], baza)) zwiazane.push({ q, kk });
  return {
    zmiana: true,
    ruch: (x, y) => {
      const p = przyciagnij(doSwiata(x, y), w[drugi], w.id);
      w[k] = { x: p.x, y: p.y };
      for (const z of zwiazane) z.q[z.kk] = { x: p.x, y: p.y };
      przebudujSzybko();
      const L = Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y), q = doEkranu(p.x, p.y);
      S.podglad = { tekst: `${Math.round(L)} cm`, x: q.x, y: q.y - 34 };
    },
    koniec: poScianach,
  };
}
function akcjaOtworu(p0) {
  const z = S.zazn, f = fl(), o = element(), w = f.walls.find((q) => q.id === o.wallId);
  const L = Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y), pos0 = o.position, t0 = rzutNaOdcinek(p0, w.start, w.end).t;
  return {
    zmiana: true,
    ruch: (x, y) => {
      const t = rzutNaOdcinek(doSwiata(x, y), w.start, w.end).t, mn = o.width / 2 / L;
      delete o.amNaroznik; // przesunięte ręcznie — już nie trzyma się narożnika
      o.position = Math.max(mn, Math.min(1 - mn, pos0 + t - t0));
      przebudujSzybko();
      const odl = o.position * L - o.width / 2, q = doEkranu(w.start.x + (w.end.x - w.start.x) * o.position, w.start.y + (w.end.y - w.start.y) * o.position);
      S.podglad = { tekst: `${Math.round(odl)} cm od narożnika`, x: q.x, y: q.y - 34 };
    },
    koniec: () => { if (z.rodzaj) przebuduj(); },
  };
}
let szybkoT = 0;
function przebudujSzybko() { // podczas przeciągania ścian: pełne przeliczenie nie częściej niż co 60 ms
  const t = performance.now(); if (t - szybkoT < 70) { przeliczSciany(S.sc); return; }
  szybkoT = t; poScianach();
}
// mebel blisko ściany i równoległy do niej: dosuń plecami do ściany
function magnes(f) {
  const { w, d } = wymiaryMebla(f), tol = 10 / S.widok.s + 4;
  const a = ((f.rotation || 0) * Math.PI) / 180;
  for (const g of fl().walls) {
    if (g.granica || g.curvePoint) continue;
    const gx = g.end.x - g.start.x, gy = g.end.y - g.start.y, L = Math.hypot(gx, gy); if (L < 20) continue;
    const ux = gx / L, uy = gy / L, nx = -uy, ny = ux;
    for (const [hx, hy, pol] of [[Math.sin(a), -Math.cos(a), d / 2], [-Math.sin(a), Math.cos(a), d / 2], [Math.cos(a), Math.sin(a), w / 2], [-Math.cos(a), -Math.sin(a), w / 2]]) {
      const kier = hx * nx + hy * ny; if (Math.abs(Math.abs(kier) - 1) > 0.01) continue; // bok równoległy do ściany
      const odl = (f.position.x - g.start.x) * nx + (f.position.y - g.start.y) * ny, wzdl = (f.position.x - g.start.x) * ux + (f.position.y - g.start.y) * uy;
      if (wzdl < -pol || wzdl > L + pol) continue;
      const strona = Math.sign(odl) || 1; if (Math.sign(kier) === strona) continue; // ten bok patrzy na ścianę
      const cel = strona * ((g.thickness || 10) / 2 + pol);
      if (Math.abs(odl - cel) < tol) { f.position = { x: f.position.x + nx * (cel - odl), y: f.position.y + ny * (cel - odl) }; return; }
    }
  }
}

// stuknięcie: zaznacz albo wykonaj narzędzie
function stukniecie(x, y, typ = 'touch') {
  if (!S.projekt) return;
  const p = doSwiata(x, y), tol = (typ === 'mouse' ? 10 : 20) / S.widok.s; // palec jest mniej dokładny niż kursor
  if (S.narzedzie === 'sciana' || S.narzedzie === 'granica') return punktSciany(p);
  if (S.narzedzie === 'drzwi' || S.narzedzie === 'okno') return wstawOtwor(p);
  if (S.narzedzie === 'para' && S.para) return stuknijPare(p, tol);
  if (S.tryb3d) { if (trafienie(S.sc, p.x, p.y, tol, { meble: S.meble })) toast('W 3D tylko oglądasz — edycja w 2D', 2600); return; }
  // wszystko pod palcem, od wierzchu; ponowne stuknięcie w zaznaczony element wybiera następny pod nim (np. ściana pod otworem,
  // szafka pod umywalką) — inaczej nie dałoby się dostać do elementów leżących na sobie
  const pod = [], pomin = new Set();
  for (let h; pod.length < 8 && (h = trafienie(S.sc, p.x, p.y, tol, { meble: S.meble, pomin }));) { pod.push(h); pomin.add(h.id); }
  const i = S.zazn ? pod.findIndex((h) => h.id === S.zazn.id) : -1;
  const nast = i >= 0 ? pod.slice(i + 1).find((h) => h.rodzaj !== 'pokoj') || pod.find((h) => h.rodzaj !== 'pokoj' && h.id !== S.zazn.id && pod.indexOf(h) < i) : null;
  const h = i >= 0 ? nast || S.zazn : pod[0] || null;
  if (i >= 0 && nast) toast(`Pod spodem: ${({ mebel: 'element wyposażenia', sciana: 'ściana', drzwi: 'drzwi', okno: 'okno' })[nast.rodzaj] || 'pomieszczenie'}`, 1600);
  S.zazn = h; S.arkusz = null;
  interfejs(); odswiez();
}

// ---------- narzędzia: ściana i granica ----------
function punktSciany(p) {
  const r = S.rys, ost = r.punkty[r.punkty.length - 1];
  const q = przyciagnij(p, ost);
  if (ost && Math.hypot(q.x - ost.x, q.y - ost.y) < 5) return;
  if (!ost) { r.punkty.push(q); r.kursor = null; podpowiedz(r.granica ? 'Stuknij, gdzie granica się kończy' : 'Stuknij koniec ściany'); interfejs(); odswiez(); return; }
  zapamietaj();
  const f = fl();
  if (ost.wall) podzielSciane(ost.wall, ost);
  if (q.wall) podzielSciane(q.wall, q);
  const nowa = { id: noweId(), start: { x: ost.x, y: ost.y }, end: { x: q.x, y: q.y }, thickness: r.granica ? 1 : 12, height: 260, color: '#444444', ...(r.granica ? { granica: true } : {}) };
  f.walls.push(nowa); r.ostatnia = nowa.id;
  poScianach();
  r.punkty.push({ x: q.x, y: q.y }); r.kursor = null;
  // granica kończy się po jednym odcinku; ściana rysuje się dalej, aż do „Gotowe” albo zamknięcia
  if (r.granica || q.rodzaj === 'koniec' && r.punkty.length > 2 && rownoPunkt(q, r.punkty[0], 2)) return narzedzie('widok');
  podpowiedz('Stuknij kolejny narożnik albo „Gotowe”');
  interfejs(); odswiez();
}
// ---------- narzędzia: drzwi i okno ----------
function wstawOtwor(p) {
  const f = fl(), tol = 30 / S.widok.s;
  let best = null;
  for (const w of f.walls) { if (w.granica || w.curvePoint) continue; const r = rzutNaOdcinek(p, w.start, w.end); if (r.d < (w.thickness || 10) / 2 + tol && (!best || r.d < best.r.d)) best = { w, r }; }
  if (!best) { toast('Stuknij w ścianę, w której ma być ' + (S.narzedzie === 'drzwi' ? 'drzwi' : 'okno')); return; }
  const w = best.w, L = Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y);
  const drzwi = S.narzedzie === 'drzwi', szer = Math.min(drzwi ? 80 : 120, L - 10);
  if (szer < 30) { toast('Ta ściana jest za krótka'); return; }
  zapamietaj();
  const pos = Math.max(szer / 2 / L, Math.min(1 - szer / 2 / L, best.r.t));
  const o = drzwi ? { id: noweId(), wallId: w.id, position: pos, width: szer, height: 205, type: 'single', swingDirection: 'left', flipSide: false }
    : { id: noweId(), wallId: w.id, position: pos, width: szer, height: 150, sillHeight: 85, type: 'standard' };
  f[drzwi ? 'doors' : 'windows'].push(o);
  S.zazn = { rodzaj: drzwi ? 'drzwi' : 'okno', id: o.id };
  narzedzie('widok', true);
  przebuduj();
}

function narzedzie(n, zostawZazn = false) {
  S.narzedzie = n;
  S.rys = n === 'sciana' || n === 'granica' ? { punkty: [], kursor: null, granica: n === 'granica' } : null;
  if (!zostawZazn) S.zazn = null;
  S.arkusz = null;
  podpowiedz({ sciana: 'Rysujesz ścianę — stuknij początek', granica: 'Granica pomieszczeń — stuknij początek (np. przy ścianie)', drzwi: 'Stuknij w ścianę, gdzie mają być drzwi', okno: 'Stuknij w ścianę, gdzie ma być okno' }[n] || '');
  for (const b of document.querySelectorAll('.plan-dol [data-n]')) b.setAttribute('aria-pressed', String(b.dataset.n === n));
  interfejs(); odswiez();
}
function podpowiedz(t) { const el = $('#podpowiedz'); el.hidden = !t; el.textContent = t || ''; el.classList.remove('z-przyciskami'); }

// ---------- operacje na meblach ----------
function wyrownajDoSciany(f) {
  // najbliższa ściana: mebel obraca się plecami do niej i dosuwa
  let best = null;
  for (const g of fl().walls) {
    if (g.granica || g.curvePoint) continue;
    const r = rzutNaOdcinek(f.position, g.start, g.end); if (!best || r.d < best.r.d) best = { g, r };
  }
  if (!best) return false;
  const g = best.g, gx = g.end.x - g.start.x, gy = g.end.y - g.start.y, L = Math.hypot(gx, gy), ux = gx / L, uy = gy / L;
  let nx = -uy, ny = ux;
  const odl = (f.position.x - g.start.x) * nx + (f.position.y - g.start.y) * ny;
  if (odl < 0) { nx = -nx; ny = -ny; } // n wskazuje od ściany do mebla
  f.rotation = Math.round(((((Math.atan2(ny, nx) * 180) / Math.PI - 90) % 360) + 360) % 360 * 10) / 10; // tył (−y) w stronę ściany
  const { d } = wymiaryMebla(f), cel = (g.thickness || 10) / 2 + d / 2;
  const wzdl = (f.position.x - g.start.x) * ux + (f.position.y - g.start.y) * uy;
  f.position = { x: Math.round(g.start.x + ux * wzdl + nx * cel), y: Math.round(g.start.y + uy * wzdl + ny * cel) };
  return true;
}
function dodajMebel(klucz) {
  const e = MEBLE[klucz], r = plotno.getBoundingClientRect();
  const c = doSwiata(r.width / 2, r.height / 2 - 40);
  zapamietaj();
  const f = { id: noweId(), catalogId: 'imported_object', sourceCategory: klucz, amRodzaj: klucz, position: { x: Math.round(c.x), y: Math.round(c.y) }, rotation: 0, scale: { x: 1, y: 1, z: 1 }, width: e.w, depth: e.d, height: 80 };
  fl().furniture.push(f);
  if (!S.meble) S.meble = true;
  S.zazn = { rodzaj: 'mebel', id: f.id }; S.arkusz = null;
  przebuduj(); interfejs();
  toast('Przeciągnij element w wybrane miejsce. Krawędzie zmieniają rozmiar.', 3600);
}

// ---------- akcje z przycisków ----------
const AKCJE = {
  wroc: () => wyjdz(),
  cofnij: () => cofnij(), ponow: () => ponow(),
  zapisz: () => zapiszWOfercie(),
  dopasuj: () => dopasuj(),
  meble: () => { S.meble = !S.meble; zapiszOpcje(); if (!S.meble && S.zazn?.rodzaj === 'mebel') S.zazn = null; interfejs(); odswiez(); },
  wymiary: () => { S.wymiary = !S.wymiary; zapiszOpcje(); odswiez(); },
  skan: () => $('#plik-skanu').click(),
  zaawansowany: () => zaawansowany(),
  narz: (b) => narzedzie(S.narzedzie === b.dataset.n ? 'widok' : b.dataset.n),
  dodaj: () => { S.arkusz = { typ: 'katalog', grupa: S.arkusz?.grupa || 'Sypialnia', szukaj: '' }; interfejs(); },
  wiecej: () => { S.arkusz = S.arkusz?.typ === 'menu' ? null : { typ: 'menu' }; interfejs(); },
  zamknij: () => { S.arkusz = null; interfejs(); },
  ustawienia: () => { S.arkusz = { typ: 'element' }; interfejs(); },
  gotowe: () => narzedzie('widok'),
  'cofnij-punkt': () => { if (S.rys?.punkty.length) { S.rys.punkty.pop(); interfejs(); odswiez(); } },
  odznacz: () => { S.zazn = null; S.arkusz = null; interfejs(); odswiez(); },
  // meble
  obroc: () => zmien((f) => { f.rotation = (((f.rotation || 0) + 90) % 360); }),
  wyrownaj: () => { const f = element(); if (!f) return; const przed = migawka(); if (wyrownajDoSciany(f)) { zapamietaj(przed); przebuduj(); toast('Wyrównano do najbliższej ściany'); } },
  odbij: () => zmien((f) => { f.scale = { ...(f.scale || { x: 1, y: 1, z: 1 }), x: -(f.scale?.x ?? 1) }; }),
  duplikuj: () => { const f = element(); if (!f) return; zapamietaj(); const k = JSON.parse(JSON.stringify(f)); k.id = noweId(); k.position = { x: f.position.x + 30, y: f.position.y + 30 }; fl().furniture.push(k); S.zazn = { rodzaj: 'mebel', id: k.id }; przebuduj(); interfejs(); },
  usun: () => usunZaznaczony(),
  zamien: () => { S.arkusz = { typ: 'katalog', grupa: MEBLE[rodzajMebla(element())]?.grupa || 'Sypialnia', szukaj: '', zamiana: true }; interfejs(); },
  // drzwi
  kierunek: () => zmien((d) => { d.swingDirection = d.swingDirection === 'left' ? 'right' : 'left'; }),
  strona: () => zmien((d) => { d.flipSide = !d.flipSide; }),
  // ściana
  granica: () => {
    const w = element(); if (!w) return;
    const f = fl(), ile = f.doors.filter((q) => q.wallId === w.id).length + f.windows.filter((q) => q.wallId === w.id).length;
    zmien((w2) => { w2.granica = !w2.granica; w2.thickness = w2.granica ? 1 : 12; if (w2.granica) { f.doors = f.doors.filter((q) => q.wallId !== w2.id); f.windows = f.windows.filter((q) => q.wallId !== w2.id); } }, true);
    if (w.granica && ile) toast('Granica nie ma drzwi ani okien — usunięto je z tej ściany. Cofnij, jeśli to pomyłka.', 4000);
  },
  // menu
  wyprostuj: () => wyprostuj(),
  obraz: () => pobierzObraz(),
  tryb: (b) => {
    const t = b.dataset.t === '3d'; if (t === S.tryb3d) return;
    if (t) { if (S.narzedzie !== 'widok') narzedzie('widok'); S.zazn = null; if (S.arkusz && S.arkusz.typ !== 'menu') S.arkusz = null; }
    S.tryb3d = t; interfejs(); odswiez();
    if (t) toast('Widok 3D — edycja w 2D', 2200);
  },
  pietro: (b) => { S.projekt.activeFloorId = b.dataset.id; S.zazn = null; przebuduj(); dopasuj(); interfejs(); },
  pomoc: () => { S.arkusz = { typ: 'pomoc' }; interfejs(); },
};
function zapiszOpcje() { try { localStorage.setItem('am-plan-opcje', JSON.stringify({ meble: S.meble, wymiary: S.wymiary })); } catch { /* */ } }
try { const o = JSON.parse(localStorage.getItem('am-plan-opcje') || '{}'); if (o.meble === false) S.meble = false; if (o.wymiary === false) S.wymiary = false; } catch { /* */ }
function zmien(fn, sciany = false) {
  const el = element(); if (!el) return;
  const przed = migawka(); fn(el);
  if (przed !== migawka()) { zapamietaj(przed); sciany ? poScianach() : przebuduj(); interfejs(); }
}
function usunZaznaczony() {
  const z = S.zazn; if (!z) return;
  const f = fl(); zapamietaj();
  if (z.rodzaj === 'mebel') f.furniture = f.furniture.filter((q) => q.id !== z.id);
  if (z.rodzaj === 'drzwi') f.doors = f.doors.filter((q) => q.id !== z.id);
  if (z.rodzaj === 'okno') f.windows = f.windows.filter((q) => q.id !== z.id);
  if (z.rodzaj === 'sciana') { f.walls = f.walls.filter((q) => q.id !== z.id); f.doors = f.doors.filter((q) => q.wallId !== z.id); f.windows = f.windows.filter((q) => q.wallId !== z.id); }
  S.zazn = null; S.arkusz = null;
  z.rodzaj === 'sciana' ? poScianach() : przebuduj(); interfejs();
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
  const f = AKCJE[b.dataset.a]; if (f) { e.preventDefault(); f(b); }
});
document.addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea')) { if (e.key === 'Enter') e.target.blur(); return; }
  const k = e.key.toLowerCase();
  if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); e.shiftKey ? ponow() : cofnij(); return; }
  if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); ponow(); return; }
  if ((e.ctrlKey || e.metaKey) && k === 'd' && S.zazn?.rodzaj === 'mebel') { e.preventDefault(); AKCJE.duplikuj(); return; }
  if (k === 'delete' || k === 'backspace') { if (S.zazn && S.zazn.rodzaj !== 'pokoj') { e.preventDefault(); usunZaznaczony(); } return; }
  if (k === 'escape') { if (S.narzedzie !== 'widok') narzedzie('widok'); else AKCJE.odznacz(); return; }
  if (k === 'r' && S.zazn?.rodzaj === 'mebel') AKCJE.obroc();
  if (k === 'f') dopasuj();
  if (S.zazn?.rodzaj === 'mebel' && e.key.startsWith('Arrow')) { // strzałki: 1 cm, z Shift 10 cm
    e.preventDefault(); const k2 = e.shiftKey ? 10 : 1;
    zmien((f) => { f.position = { x: f.position.x + (e.key === 'ArrowRight' ? k2 : e.key === 'ArrowLeft' ? -k2 : 0), y: f.position.y + (e.key === 'ArrowDown' ? k2 : e.key === 'ArrowUp' ? -k2 : 0) }; });
  }
});

// ---------- interfejs: pasek akcji i arkusz ----------
const btn = (a, ik, t, kl = '', extra = '') => `<button data-a="${a}" class="${kl}" ${extra}>${IK[ik] || ''}${esc(t)}</button>`;
function interfejs() {
  const pasek = $('#pasek-akcji'), ark = $('#arkusz'), z = S.zazn, el = element();
  const szeroki = matchMedia('(min-width: 900px)').matches;
  przyciskiHistorii();
  const tr = $('.pl-tryb'); tr.hidden = !S.projekt; for (const b of tr.querySelectorAll('button')) b.setAttribute('aria-pressed', String((b.dataset.t === '3d') === S.tryb3d));
  document.body.classList.toggle('tryb-3d', S.tryb3d);
  // pasek akcji
  let h = '';
  if (S.rys) h = btn('cofnij-punkt', 'cofnij', 'Cofnij punkt', '', S.rys.punkty.length ? '' : 'disabled') + (S.rys.ostatnia ? btn('dl-ostatniej', 'linijka', 'Długość') : '') + btn('gotowe', 'zakoncz', 'Gotowe');
  else if (S.narzedzie !== 'widok') h = btn('gotowe', 'zakoncz', 'Anuluj');
  else if (z && el) {
    if (z.rodzaj === 'mebel') h = btn('obroc', 'obroc', 'Obróć 90°') + btn('wyrownaj', 'wyrownaj', 'Do ściany') + btn('duplikuj', 'duplikuj', 'Duplikuj') + btn('usun', 'usun', 'Usuń', 'zly') + btn('ustawienia', 'wiecej', 'Więcej');
    if (z.rodzaj === 'drzwi') h = btn('kierunek', 'kierunek', 'Kierunek') + btn('strona', 'strona', 'Strona') + btn('usun', 'usun', 'Usuń', 'zly') + btn('ustawienia', 'wiecej', 'Więcej');
    if (z.rodzaj === 'okno') h = btn('ustawienia', 'linijka', 'Szerokość') + btn('usun', 'usun', 'Usuń', 'zly');
    if (z.rodzaj === 'sciana') h = btn('ustawienia', 'linijka', 'Długość') + btn('granica', 'strona', el.granica ? 'Zrób ścianą' : 'Zrób granicą') + btn('usun', 'usun', 'Usuń', 'zly');
    if (z.rodzaj === 'pokoj') h = btn('ustawienia', 'nazwa', 'Nazwa') + btn('podloga-arkusz', 'podloga', 'Podłoga');
  }
  if (szeroki && !S.rys && S.narzedzie === 'widok') h = ''; // na tablecie i laptopie wszystko jest w panelu po prawej
  pasek.innerHTML = h;
  pasek.hidden = !h || (!!S.arkusz && !szeroki);
  // arkusz (telefon: od dołu; tablet/laptop: panel po prawej, zawsze widoczny)
  const a = S.arkusz || (szeroki ? { typ: z ? 'element' : 'podsumowanie' } : null);
  if (!a) { ark.hidden = true; ark.innerHTML = ''; return; }
  ark.hidden = false;
  const zamk = szeroki && a.typ !== 'katalog' && a.typ !== 'menu' && a.typ !== 'pomoc' ? '' : '<button data-a="zamknij">Zamknij</button>';
  const naglowek = (t) => `<div class="uchwyt"></div><h3><span>${esc(t)}</span>${zamk}</h3>`;
  if (a.typ === 'katalog') ark.innerHTML = naglowek(a.zamiana ? 'Zamień na' : 'Dodaj element') + htmlKatalog(a);
  else if (a.typ === 'menu') ark.innerHTML = naglowek('Więcej') + htmlMenu();
  else if (a.typ === 'pokoj-nowy') ark.innerHTML = naglowek('Pokój prostokątny') + htmlNowegoPokoju(a);
  else if (a.typ === 'pomoc') ark.innerHTML = naglowek('Jak to działa') + htmlPomoc();
  else if (a.typ === 'kalibracja') ark.innerHTML = naglowek('Dopasowanie do pomiarów') + htmlKalibracji();
  else if (a.typ === 'szafa') ark.innerHTML = naglowek('Szafa we wnęce') + `<p class="info" style="margin-top:0">Pomieszczenia są po obu stronach tej ściany. Do którego należy szafa?</p><div class="przyciski">${[[-1, a.plus], [1, a.minus]].map(([sg, n]) => btn('szafa-strona', 'podloga', esc(n || 'pomieszczenie bez nazwy'), '', `data-v="${sg}"`)).join('')}${btn('zamknij', 'cofnij', 'Anuluj')}</div>`;
  else if (a.typ === 'podloga') ark.innerHTML = naglowek('Podłoga') + htmlPodlogi(el);
  else if (a.typ === 'element' && z && el) ark.innerHTML = naglowek(tytulElementu(z, el)) + htmlElementu(z, el);
  else ark.innerHTML = naglowek('Rzut') + htmlPodsumowania();
  podlaczPola(ark);
  if (!szeroki && z && el) requestAnimationFrame(pokazNadArkuszem);
}
function pokazNadArkuszem() {
  const ark = $('#arkusz'); if (ark.hidden || !S.zazn) return;
  const r = plotno.getBoundingClientRect(), wolne = ark.getBoundingClientRect().top - r.top - 30;
  const el = element(); if (!el) return;
  const c = S.zazn.rodzaj === 'pokoj' ? { x: el.poly.reduce((a, q) => a + q.x, 0) / el.poly.length, y: el.poly.reduce((a, q) => a + q.y, 0) / el.poly.length }
    : S.zazn.rodzaj === 'mebel' ? el.position : S.zazn.rodzaj === 'sciana' ? { x: (el.start.x + el.end.x) / 2, y: (el.start.y + el.end.y) / 2 } : null;
  if (!c) return;
  const y = c.y * S.widok.s + S.widok.oy;
  if (y > wolne) { S.widok.oy -= y - wolne * 0.6; odswiez(); }
}
AKCJE['podloga-arkusz'] = () => { S.arkusz = { typ: 'podloga' }; interfejs(); };
function tytulElementu(z, el) {
  if (z.rodzaj === 'mebel') return nazwaMebla(el);
  if (z.rodzaj === 'pokoj') return el.nazwa || 'Pomieszczenie';
  return { drzwi: 'Drzwi', okno: 'Okno', sciana: el.granica ? 'Granica pomieszczeń' : 'Ściana' }[z.rodzaj];
}
const chip = (a, t, wl, extra = '') => `<button data-a="${a}" aria-pressed="${wl ? 'true' : 'false'}" ${extra}>${esc(t)}</button>`;
function htmlElementu(z, el) {
  if (z.rodzaj === 'mebel') {
    const { w, d } = wymiaryMebla(el);
    return `<div class="dwa"><div><label for="p-w">Szerokość (cm)</label><input id="p-w" type="number" inputmode="decimal" data-pole="w" value="${Math.round(w)}"></div>
      <div><label for="p-d">Głębokość (cm)</label><input id="p-d" type="number" inputmode="decimal" data-pole="d" value="${Math.round(d)}"></div></div>
      <label for="p-r">Obrót (°)</label><input id="p-r" type="number" inputmode="decimal" data-pole="r" value="${Math.round((((el.rotation || 0) % 360) + 360) % 360)}">
      <div class="przyciski">${btn('obroc', 'obroc', 'Obróć 90°')}${btn('wyrownaj', 'wyrownaj', 'Wyrównaj do ściany')}${btn('odbij', 'odbij', 'Odbij')}${btn('duplikuj', 'duplikuj', 'Duplikuj')}${btn('zamien', 'nazwa', 'Zamień na inny')}${btn('usun', 'usun', 'Usuń', 'zly')}</div>`;
  }
  if (z.rodzaj === 'drzwi') {
    const typy = [['single', 'Pojedyncze'], ['double', 'Dwuskrzydłowe'], ['sliding', 'Przesuwne'], ['pocket', 'Chowane w ścianę'], ['opening', 'Przejście bez drzwi']];
    return `<label>Szerokość</label><div class="chipy">${[70, 80, 90, 100, 120, 140].map((v) => chip('szer', `${v} cm`, Math.round(el.width) === v, `data-v="${v}"`)).join('')}</div>
      <input type="number" inputmode="decimal" data-pole="szer" value="${Math.round(el.width)}" aria-label="Szerokość w cm" style="margin-top:8px">
      <label>Rodzaj</label><div class="chipy">${typy.map(([k, t]) => chip('typ-drzwi', t, (el.type || 'single') === k, `data-v="${k}"`)).join('')}</div>
      <div class="przyciski">${btn('kierunek', 'kierunek', 'Zmień kierunek')}${btn('strona', 'strona', 'Na drugą stronę')}${btn('szafa-z-drzwi', 'podloga', 'To nie drzwi — szafa we wnęce')}${btn('usun', 'usun', 'Usuń drzwi', 'zly')}</div>`;
  }
  if (z.rodzaj === 'okno') {
    return `<label>Szerokość</label><div class="chipy">${[60, 90, 120, 150, 180, 240].map((v) => chip('szer', `${v} cm`, Math.round(el.width) === v, `data-v="${v}"`)).join('')}</div>
      <input type="number" inputmode="decimal" data-pole="szer" value="${Math.round(el.width)}" aria-label="Szerokość w cm" style="margin-top:8px">
      <div class="przyciski">${btn('usun', 'usun', 'Usuń okno', 'zly')}</div>`;
  }
  if (z.rodzaj === 'sciana') {
    const kon = koniecSciany(el);
    return `<label for="p-l">Długość w świetle (cm)</label><input id="p-l" type="number" inputmode="decimal" data-pole="dl" value="${Math.round(czysta(el))}">
      <p class="info">Ta sama liczba co na rzucie — od ściany do ściany, jak mierzy miarka. Po wpisaniu przesuwa się ściana na wybranym końcu, równolegle — kąty zostają proste.</p>
      <label>Przesuwa się</label><div class="chipy">${['start', 'end'].map((k) => chip('dl-koniec', nazwaKonca(el, k), kon === k, `data-v="${k}"`)).join('')}</div>
      ${el.granica ? '' : `<label>Grubość</label><div class="chipy">${[8, 12, 15, 25, 38].map((v) => chip('grubosc', `${v} cm`, Math.round(el.thickness) === v, `data-v="${v}"`)).join('')}</div>`}
      <label class="przelacznik"><span>Granica pomieszczeń (bez ściany)<small>Dzieli otwartą przestrzeń, np. przedpokój i salon. Na rzucie przerywana linia.</small></span><input type="checkbox" data-pole="granica" ${el.granica ? 'checked' : ''}></label>
      <div class="przyciski">${!el.granica && frontSzafy(fl(), el.id) ? btn('szafa', 'podloga', 'To front szafy — szafa we wnęce') : ''}${btn('usun', 'usun', el.granica ? 'Usuń granicę' : 'Usuń ścianę', 'zly')}</div>`;
  }
  if (z.rodzaj === 'pokoj') {
    const p = el, k = p.karta && p.wym ? p.karta : null, wy = (v) => Number(v).toFixed(2).replace('.', ',');
    return `<label for="p-n">Nazwa</label><input id="p-n" type="text" data-pole="nazwa" value="${esc(p.nazwa)}" placeholder="np. Salon" autocomplete="off">
      ${(() => { const zajete = new Set(S.sc.pokoje.filter((q) => q !== p && q.nazwa).map((q) => q.nazwa.toLowerCase())); const zk = [...new Set(S.pomKarty.map((k) => (k.nazwa || '').trim()).filter((n) => n && !zajete.has(n.toLowerCase())))];
        return zk.length ? `<label>Z karty oferty</label><div class="chipy">${zk.map((n) => chip('nazwa-pok', n, n === p.nazwa, `data-v="${esc(n)}"`)).join('')}</div><label>Inne</label>` : ''; })()}
      <div class="chipy" style="margin-top:8px">${NAZWY_POMIESZCZEN.map((n) => chip('nazwa-pok', n, n === p.nazwa, `data-v="${esc(n)}"`)).join('')}</div>
      ${k ? (p.dop ? `<p class="info">Rzut dopasowany do Twojego pomiaru ${wy(k.a)} × ${wy(k.b)} m${p.kartaPrzybl ? ` (w karcie: „${esc(k.nazwa)}”)` : ''}. Metraż z całego kształtu, z wnękami: <b>${p.m != null ? m2(p.m) : '—'}</b>.</p>`
        : `<p class="info">Twój pomiar: ${wy(k.a)} × ${wy(k.b)} m = <b>${m2(k.m)}</b>${p.kartaPrzybl ? ` (w karcie: „${esc(k.nazwa)}”)` : ''}. Skan bez dopasowania: ${p.m != null ? m2(p.m) : '—'}.</p><div class="przyciski">${btn('kalibruj', 'linijka', 'Dopasuj rzut do pomiarów')}</div>`)
        + `<label class="przelacznik"><span>Wymiary na obrazie<small>${wy(k.a)} × ${wy(k.b)} m pod metrażem</small></span><input type="checkbox" data-pole="wym-pok" ${p.room.amBezWymiarow ? '' : 'checked'}></label>`
        : `<p class="info">Metraż z rzutu: <b>${p.m != null ? m2(p.m) : '—'}</b></p>`}
      <div class="przyciski">${btn('podloga-arkusz', 'podloga', `Podłoga: ${PODLOGI[p.podloga]?.nazwa || 'Dąb jasny'}`)}</div>`;
  }
  return '';
}
function htmlPodlogi(p) {
  if (!p || S.zazn?.rodzaj !== 'pokoj') return '<p class="info">Zaznacz pomieszczenie.</p>';
  return `<p class="info" style="margin:0 0 6px">${esc(p.nazwa || 'Pomieszczenie')}</p>` + GRUPY_PODLOG.map(([t, nr]) => `<label>${esc(t)}</label><div class="podlogi">${Object.entries(PODLOGI).filter(([, v]) => v.a?.[0] === nr).map(([k, v]) => `<button data-a="podloga" data-v="${k}" aria-pressed="${p.podloga === k}"><canvas data-probka="${k}" width="120" height="80"></canvas><span>${esc(v.nazwa)}</span></button>`).join('')}</div>`).join('')
    + `<div class="przyciski">${btn('ustawienia', 'cofnij', 'Wróć do pomieszczenia')}</div>`;
}
function htmlKatalog(a) {
  const q = a.szukaj.trim().toLowerCase();
  const lista = Object.entries(MEBLE).filter(([k, e]) => k !== 'inny' && (q ? e.nazwa.toLowerCase().includes(q) : e.grupa === a.grupa));
  return `<input type="text" data-pole="szukaj" placeholder="Szukaj: łóżko, szafa, wanna…" value="${esc(a.szukaj)}" autocomplete="off">
    ${q ? '' : `<div class="chipy grupy">${GRUPY.map((g) => chip('grupa', g, g === a.grupa, `data-v="${esc(g)}"`)).join('')}</div>`}
    <div class="katalog">${lista.map(([k, e]) => `<button data-a="${a.zamiana ? 'zamien-na' : 'dodaj-el'}" data-v="${k}"><canvas data-mebel="${k}" width="132" height="96"></canvas><span>${esc(e.nazwa)}</span><small>${e.w} × ${e.d} cm</small></button>`).join('') || '<p class="info">Nic nie znaleziono.</p>'}</div>`;
}
function htmlNowegoPokoju(a) {
  const zKarty = S.pomKarty.filter((p) => p.a && p.b);
  return `<p class="info" style="margin-top:0">Wymiary wewnętrzne, np. z dalmierza. Ściany 12 cm dorysuję dookoła, a pokój pojawi się na środku ekranu — potem przeciągnij ściany, żeby dopasować go do reszty.</p>
    ${zKarty.length ? `<label>Z karty oferty</label><div class="chipy">${zKarty.map((p) => chip('pokoj-z-karty', `${p.nazwa} ${String(p.a).replace('.', ',')} × ${String(p.b).replace('.', ',')} m`, false, `data-n="${esc(p.nazwa)}" data-a1="${p.a}" data-b1="${p.b}"`)).join('')}</div>` : ''}
    <div class="dwa"><div><label for="np-a">Długość (cm)</label><input id="np-a" type="number" inputmode="decimal" value="${a.dl || ''}" placeholder="np. 420"></div>
    <div><label for="np-b">Szerokość (cm)</label><input id="np-b" type="number" inputmode="decimal" value="${a.sz || ''}" placeholder="np. 310"></div></div>
    <label for="np-n">Nazwa</label><input id="np-n" type="text" value="${esc(a.nazwa || '')}" placeholder="np. Sypialnia" autocomplete="off">
    <div class="przyciski">${btn('pokoj-wstaw', 'zakoncz', 'Wstaw pokój')}</div>`;
}
function htmlMenu() {
  const przel = (a, t, opis, wl) => `<label class="przelacznik"><span>${esc(t)}<small>${esc(opis)}</small></span><input type="checkbox" data-przel="${a}" ${wl ? 'checked' : ''}></label>`;
  const pietra = S.projekt ? `<label>Piętra</label><div class="chipy">${S.projekt.floors.map((f) => chip('pietro', f.name, f.id === pietro(S.projekt).id, `data-id="${esc(f.id)}"`)).join('')}${chip('pietro-dodaj', '+ Dodaj piętro', false)}</div>
    <div class="dwa" style="margin-top:8px"><input type="text" data-pole="nazwa-pietra" value="${esc(pietro(S.projekt).name)}" aria-label="Nazwa piętra">${S.projekt.floors.length > 1 ? btn('pietro-usun', 'usun', 'Usuń piętro', 'zly maly') : '<span></span>'}</div>` : '';
  const pok = !matchMedia('(min-width: 900px)').matches && S.sc ? `<label>Pomieszczenia</label>${htmlPodsumowania(true)}` : '';
  return `${pok}${przel('meble', 'Meble i wyposażenie', 'Pokazuj na rzucie i w obrazie do ogłoszenia', S.meble)}${przel('wym-pokoi', 'Wymiary pokoi na obrazie', 'Długość × szerokość z Twojego pomiaru przy nazwie pomieszczenia', wymiaryPokoi())}${przel('wymiary', 'Wymiary ścian (tylko w edytorze)', 'Pomoc przy poprawianiu — nie trafiają do ogłoszenia', S.wymiary)}${pietra}<div class="menu-lista">
    ${S.projekt ? btn('kalibruj', 'linijka', 'Dopasuj rzut do pomiarów z karty') : ''}
    ${btn('pokoj-nowy', 'podloga', 'Dodaj pokój prostokątny (z wymiarów)')}
    ${btn('dopasuj', 'wyrownaj', 'Pokaż cały rzut')}
    ${btn('skan', 'podloga', 'Wczytaj skan z iPhone\'a')}
    ${S.projekt ? btn('wyprostuj', 'linijka', 'Wyprostuj skan (kąty proste, meble do ścian)') : ''}
    ${S.projekt ? btn('obraz', 'duplikuj', 'Pobierz obraz rzutu') : ''}
    ${S.projekt ? btn('plik-rzutu', 'duplikuj', 'Pobierz plik rzutu (.json) — do sprawdzenia') : ''}
    ${btn('zaawansowany', 'strona', 'Edytor zaawansowany')}
    ${btn('pomoc', 'wiecej', 'Jak to działa')}</div>`;
}
function htmlPomoc() {
  return `<ul class="pomoc">
    <li><b>Przesuwanie widoku:</b> jeden palec albo przeciągnięcie myszą. Nic się wtedy nie zmienia w rzucie.</li>
    <li><b>Powiększanie:</b> dwa palce, kółko myszy albo gest na touchpadzie.</li>
    <li><b>Zaznaczanie:</b> stuknij element. Zmienić można tylko zaznaczony — przeciągnij go, złap krawędź, żeby zmienić rozmiar, albo kółko nad nim, żeby obrócić.</li>
    <li><b>Dodawanie:</b> „Dodaj”, wybierz element z listy, przeciągnij na miejsce. Przy ścianie sam się do niej dosunie.</li>
    <li><b>Ściany i granice:</b> wybierz narzędzie i stukaj kolejne narożniki. Granica dzieli otwartą przestrzeń bez ściany.</li>
    <li><b>Drzwi i okna:</b> wybierz narzędzie i stuknij w ścianę.</li>
    <li><b>Wymiary:</b> każda liczba na rzucie to wymiar w świetle — od ściany do ściany, jak mierzy dalmierz albo miarka. Stuknij ścianę, wpisz długość i wybierz, który koniec ma się przesunąć — ściana na tym końcu przesuwa się równolegle, kąty zostają proste.</li>
    <li><b>Dopasowanie do pomiarów:</b> „Więcej” → „Dopasuj rzut do pomiarów z karty”. Edytor bierze długość × szerokość z karty i przesuwa ściany tak, żeby się zgadzały — kształt (wnęki, załomy) zostaje ze skanu, metraż liczy się z całego kształtu.</li>
    <li><b>Na obrazie do ogłoszenia:</b> nazwa, metraż i wymiary z Twojego pomiaru. Wymiary ścian są tylko w edytorze.</li>
    <li><b>Klawiatura:</b> Delete usuwa, R obraca, strzałki przesuwają o 1 cm (z Shift o 10 cm), Ctrl+Z cofa, Ctrl+Y ponawia, Esc odznacza, F pokazuje cały rzut.</li>
    <li>Zmiany zapisują się na tym urządzeniu same. Do oferty i wspólnika trafiają po „Zapisz”.</li></ul>`;
}
function htmlPodsumowania(krotko = false) {
  if (!S.sc) return '<p class="info">Wczytaj skan albo otwórz edytor zaawansowany.</p>';
  const lista = S.sc.pokoje.filter((p) => !p.otwor);
  const suma = lista.reduce((a, p) => a + (p.mKarta ?? p.m ?? 0), 0);
  return `<ul class="pokoje">${lista.map((p) => `<li><button data-a="wybierz-pok" data-id="${esc(p.room.id)}"><span>${esc(p.nazwa || 'Pomieszczenie')}</span><b>${(p.mKarta ?? p.m) != null ? m2(p.mKarta ?? p.m) : '—'}</b></button></li>`).join('')}
    <li class="suma"><span>Razem</span><b>${m2(suma)}</b></li></ul>
    ${krotko ? '' : '<p class="info">Stuknij pomieszczenie na rzucie albo na liście, żeby nadać nazwę i podłogę. „Dodaj” wstawia meble i wyposażenie.</p>'}
    ${S.projekt.floors.length > 1 ? `<label>Piętro</label><div class="chipy">${S.projekt.floors.map((f) => chip('pietro', f.name, f.id === pietro(S.projekt).id, `data-id="${esc(f.id)}"`)).join('')}</div>` : ''}`;
}
AKCJE['od-zera'] = () => { ustawProjekt(polskiProjekt(G.createDefaultProject(S.nazwa)), true); narzedzie('sciana'); };
AKCJE['dl-ostatniej'] = () => { const id = S.rys?.ostatnia; narzedzie('widok'); if (id) { S.zazn = { rodzaj: 'sciana', id }; S.arkusz = { typ: 'element' }; interfejs(); odswiez(); setTimeout(() => $('#p-l')?.focus(), 50); } };
AKCJE['pokoj-nowy'] = () => { S.arkusz = { typ: 'pokoj-nowy' }; S.zazn = null; interfejs(); };
AKCJE['pokoj-z-karty'] = (b) => { S.arkusz = { typ: 'pokoj-nowy', dl: Math.round(b.dataset.a1 * 100), sz: Math.round(b.dataset.b1 * 100), nazwa: b.dataset.n }; interfejs(); };
AKCJE['pokoj-wstaw'] = () => {
  const dl = Number(String($('#np-a').value).replace(',', '.')), sz = Number(String($('#np-b').value).replace(',', '.')), nazwa = $('#np-n').value.trim();
  if (!(dl >= 50 && sz >= 50)) { toast('Wpisz długość i szerokość w centymetrach (co najmniej 50).'); return; }
  if (!S.projekt) ustawProjekt(polskiProjekt(G.createDefaultProject(S.nazwa)));
  zapamietaj();
  const r = plotno.getBoundingClientRect(), c = doSwiata(r.width / 2, r.height / 2), t = 12;
  const x0 = Math.round(c.x - dl / 2 - t / 2), y0 = Math.round(c.y - sz / 2 - t / 2), x1 = x0 + dl + t, y1 = y0 + sz + t;
  const pk = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  for (let i = 0; i < 4; i++) fl().walls.push({ id: noweId(), start: { x: pk[i][0], y: pk[i][1] }, end: { x: pk[(i + 1) % 4][0], y: pk[(i + 1) % 4][1] }, thickness: t, height: 260, color: '#444444' });
  poScianach();
  if (nazwa) { const p = S.sc.pokoje.find((q) => q.poly.some((v) => Math.abs(v.x - x0) < 1 && Math.abs(v.y - y0) < 1) && !q.nazwa); if (p) { pokojMeta(p).name = nazwa; przebuduj(); } }
  S.arkusz = null; dopasuj(); interfejs();
  toast('Pokój wstawiony. Zaznacz ścianę i przeciągnij, żeby go dopasować.', 3800);
};
AKCJE['pietro-dodaj'] = () => {
  zapamietaj();
  const nr = S.projekt.floors.length, f = { id: noweId(), name: `Piętro ${nr}`, level: Math.max(...S.projekt.floors.map((q) => q.level ?? 0)) + 1, walls: [], rooms: [], doors: [], windows: [], furniture: [], stairs: [], columns: [], guides: [], measurements: [], annotations: [], textAnnotations: [], groups: [] };
  S.projekt.floors.push(f); S.projekt.activeFloorId = f.id; S.zazn = null; przebuduj(); interfejs();
  toast('Nowe piętro. Wczytaj jego skan albo dodaj pokój z wymiarów.', 3500);
};
AKCJE['pietro-usun'] = async () => {
  const f = pietro(S.projekt);
  if (!(await potwierdz(`Usunąć „${f.name}”?`, 'Całe piętro zniknie z rzutu. Możesz to cofnąć przyciskiem Cofnij.', 'Usuń'))) return;
  zapamietaj(); S.projekt.floors = S.projekt.floors.filter((q) => q.id !== f.id); S.projekt.activeFloorId = S.projekt.floors[0].id; S.zazn = null; przebuduj(); dopasuj(); interfejs();
};
AKCJE['wybierz-pok'] = (b) => { S.tryb3d = false; S.zazn = { rodzaj: 'pokoj', id: b.dataset.id }; S.arkusz = matchMedia('(min-width: 900px)').matches ? null : { typ: 'element' }; interfejs(); odswiez(); };
AKCJE.grupa = (b) => { S.arkusz.grupa = b.dataset.v; interfejs(); $('#arkusz').scrollTop = 0; };
AKCJE['dodaj-el'] = (b) => { S.arkusz = null; dodajMebel(b.dataset.v); };
AKCJE['zamien-na'] = (b) => { const k = b.dataset.v; zmien((f) => { f.amRodzaj = k; f.catalogId = 'imported_object'; f.sourceCategory = k; f.width = MEBLE[k].w; f.depth = MEBLE[k].d; f.scale = { x: Math.sign(f.scale?.x ?? 1) || 1, y: 1, z: 1 }; }); S.arkusz = null; interfejs(); };
AKCJE.szer = (b) => zmien((o) => { ustawSzerokosc(o, Number(b.dataset.v)); });
AKCJE['typ-drzwi'] = (b) => zmien((o) => { o.type = b.dataset.v; });
AKCJE.grubosc = (b) => zmien((w) => { // ściana zewnętrzna rośnie na zewnątrz — wymiar pomieszczenia w świetle się nie zmienia
  const t1 = Number(b.dataset.v), t0 = w.thickness || 10; if (t1 === t0) return;
  const linia = liniaSciany(w), u = kierunek(w), nx = -u.y, ny = u.x, mx = (w.start.x + w.end.x) / 2, my = (w.start.y + w.end.y) / 2, o = t0 / 2 + 8;
  const jest = (sg) => S.sc.pokoje.some((p) => !p.otwor && wPokoju(p, mx + nx * o * sg, my + ny * o * sg));
  const l = jest(1), pr = jest(-1);
  for (const q of linia) q.thickness = t1;
  if (l !== pr) { const v = ((t1 - t0) / 2) * (l ? -1 : 1); przesunLinie(linia, nx * v, ny * v); }
}, true);
// ---------- dopasowanie rzutu do pomiarów z karty (dalmierz) ----------
function pomiaryKarty() { return (S.sc?.pokoje || []).filter((p) => !p.otwor && p.wym).map((p) => ({ pokoj: p, a: p.wym.a * 100, b: p.wym.b * 100, pary: p.room.amPary, osA: p.room.amOsA })); }
// nazwy z karty są ważniejsze niż nazwy ze skanu: „Pokój 2” → „Pokój”, a pomieszczenie bez nazwy dostaje nazwę z karty,
// jeśli pasuje do niego dokładnie jedno zmierzone pomieszczenie z karty (po wymiarach)
// Nazwy: karta jest prawdą. Nazwy nadane przez skaner (amNazwaSkan — zgadywane: „bedroom”, „kitchen”) nie łączą się z kartą
// po nazwie, tylko po wymiarach; nazwy wpisane ręcznie — po nazwie („Pokój 2” → „Pokój”).
function nazwyZKarty() {
  if (!S.sc || !S.pomKarty?.length) return [];
  const zm = [], pok = S.sc.pokoje.filter((p) => !p.otwor), zeSkanu = (p) => !p.nazwa || p.room.amNazwaSkan;
  for (const p of pok) if (!zeSkanu(p) && p.kartaPrzybl && p.karta?.nazwa && p.nazwa !== p.karta.nazwa) { zm.push(`${p.nazwa} → ${p.karta.nazwa}`); pokojMeta(p).name = p.karta.nazwa; }
  const uzyte = new Set(pok.filter((p) => !zeSkanu(p)).map((p) => (p.karta?.nazwa || p.nazwa || '').trim().toLowerCase()).filter(Boolean));
  const wolne = S.pomKarty.filter((k) => k.nazwa && k.a && k.b && !uzyte.has(k.nazwa.trim().toLowerCase()));
  const kand = pok.filter(zeSkanu);
  const nadane = new Set();
  if (wolne.length && kand.length) for (const { pokoj, k } of nazwyPoWymiarach(fl(), kand, wolne)) {
    const r = pokojMeta(pokoj); if (r.name !== k.nazwa) zm.push(`${k.nazwa} (po wymiarach)`); r.name = k.nazwa; delete r.amNazwaSkan; nadane.add(k.nazwa.toLowerCase()); nadane.add(pokoj);
  }
  // nazwa ze skanu, która nie pasuje wymiarami, a w karcie jest już przy innym pomieszczeniu — usuwamy (żeby nie dublowała)
  const wKarcie = new Set(S.pomKarty.map((k) => (k.nazwa || '').trim().toLowerCase()));
  for (const p of kand) if (!nadane.has(p) && p.nazwa && nadane.has(p.nazwa.toLowerCase())) { const r = pokojMeta(p); r.name = ''; delete r.amNazwaSkan; }
  for (const p of kand) if (!nadane.has(p) && p.nazwa && wKarcie.has(p.nazwa.toLowerCase()) && !pok.some((q) => q !== p && q.nazwa === p.nazwa)) delete pokojMeta(p).amNazwaSkan;
  return zm;
}
function zastosujNazwyZKarty(cicho = false, naStarcie = false) {
  const przed = migawka(), zm = nazwyZKarty();
  if (przed === migawka()) return;
  if (naStarcie && !zm.length) { przebuduj(); interfejs(); return; } // tylko porządki w danych — nie liczymy jako zmianę
  zapamietaj(przed); przebuduj(); interfejs();
  if (!cicho && zm.length) toast(`Nazwy z karty: ${zm.join(', ')}`, 4500);
}
// końce ścian, które się z niczym nie stykają, a są blisko innej ściany — przez nie pomieszczenie nie jest zamknięte
function wolneKonce() {
  // tylko końce, które „nie dochodzą”: przedłużenie ściany o ≤ 40 cm trafia w inną ścianę, albo przed nią (≤ 60 cm) zaczyna się
  // dalszy ciąg tej samej prostej. Ściana kończąca się swobodnie w pomieszczeniu (np. ścianka przy aneksie) nie jest błędem.
  const W = fl().walls.filter((w) => !w.curvePoint), L = [];
  for (const w of W) for (const k of ['start', 'end']) {
    const p = w[k], drugi = w[k === 'start' ? 'end' : 'start'];
    if (W.some((q) => q !== w && rzutNaOdcinek(p, q.start, q.end).d < 2)) continue;
    const l = Math.hypot(p.x - drugi.x, p.y - drugi.y) || 1, u = { x: (p.x - drugi.x) / l, y: (p.y - drugi.y) / l };
    let luka = false;
    for (const q of W) {
      if (q === w) continue;
      const v = kierunek(q), sin = u.x * v.y - u.y * v.x;
      if (Math.abs(sin) < 0.05) { // ta sama prosta: dalszy ciąg przed końcem
        if (Math.abs((q.start.x - p.x) * -u.y + (q.start.y - p.y) * u.x) > 3) continue;
        if (['start', 'end'].some((kk) => { const t = (q[kk].x - p.x) * u.x + (q[kk].y - p.y) * u.y; return t > 0 && t <= 60; })) { luka = true; break; }
        continue;
      }
      const t = ((q.start.x - p.x) * v.y - (q.start.y - p.y) * v.x) / sin;
      if (t > 0 && t <= 40 && rzutNaOdcinek({ x: p.x + u.x * t, y: p.y + u.y * t }, q.start, q.end).d <= 2) { luka = true; break; }
    }
    if (luka) L.push(p);
  }
  return L;
}
const krzyweSciany = () => fl().walls.filter((w) => { if (w.curvePoint) return false; const a = (Math.atan2(w.end.y - w.start.y, w.end.x - w.start.x) * 180) / Math.PI, r = ((a % 90) + 90) % 90, o = Math.min(r, 90 - r); return o > 0.2 && o < 6; }).length;
AKCJE.kalibruj = () => {
  if (!S.sc) return;
  podpowiedz('');
  zastosujNazwyZKarty(true);
  if (krzyweSciany()) wyprostuj(); // dopasowanie zakłada ściany pod kątem prostym (skan bywa krzywy o 1–3°)
  const pom = pomiaryKarty();
  if (!pom.length) { toast('W karcie oferty nie ma pomieszczeń z długością i szerokością (albo nazwy nie pasują do rzutu).', 4200); return; }
  const przed = migawka(), przedM = new Map(S.sc.pokoje.map((p) => [p.room.id, p.m]));
  const nazwy = (sc) => sc.pokoje.filter((p) => !p.otwor).map((p) => p.nazwa).sort().join('|');
  const ilePrzed = S.sc.pokoje.filter((p) => !p.otwor).length, nazwyPrzed = nazwy(S.sc);
  const { raport, grubosci } = dopasujDoPomiarow(fl(), S.sc.pokoje, pom);
  for (const w of raport) { const r = pokojMeta(w.pokoj); if (w.osie.every((o) => !o.brak && !o.sprzeczny)) r.amDopasowanie = { a: w.pokoj.wym.a, b: w.pokoj.wym.b }; else delete r.amDopasowanie; }
  poScianach();
  // bezpiecznik: dopasowanie nie może rozdzielić ani połączyć pomieszczeń
  if (S.sc.pokoje.filter((p) => !p.otwor).length !== ilePrzed || nazwy(S.sc) !== nazwyPrzed) {
    S.projekt = JSON.parse(przed); przebuduj();
    S.raport = null; S.zazn = null; S.arkusz = { typ: 'kalibracja', blad: true }; interfejs(); odswiez();
    return;
  }
  S.raport = raport.map((w) => ({ id: w.pokoj.room.id, nazwa: w.pokoj.nazwa, karta: w.pokoj.karta?.nazwa, przybl: w.pokoj.kartaPrzybl, przedM: przedM.get(w.pokoj.room.id),
    osA: w.osA, niepewny: w.niepewny, reczny: w.reczny,
    osie: w.osie.map((o) => ({ klucz: o.klucz, m: o.m, brak: !!o.brak, przed: o.przed, po: o.po, sprzeczny: !!o.sprzeczny })) }));
  S.raportGrubosci = grubosci;
  zapamietaj(przed);
  S.zazn = null; S.arkusz = { typ: 'kalibracja' }; interfejs(); odswiez();
};
AKCJE['zamien-os'] = (b) => { // cofnij ostatnie dopasowanie, ustaw kierunek długości w tym pomieszczeniu i dopasuj od nowa
  const id = b.dataset.id, os = b.dataset.os;
  if (S.arkusz?.typ === 'kalibracja' && S.historia.length) cofnij();
  const pk = S.sc.pokoje.find((q) => q.room.id === id); if (!pk) return;
  pokojMeta(pk).amOsA = os; przebuduj();
  AKCJE.kalibruj();
};
AKCJE['wskaz-pare'] = (b) => {
  S.para = { id: b.dataset.id, klucz: b.dataset.k, m: Number(b.dataset.m), sciany: [] };
  narzedzie('para'); podpowiedz(`Stuknij dwie ściany, między którymi mierzyłeś ${(S.para.m / 100).toFixed(2).replace('.', ',')} m`);
};
function stuknijPare(p, tol) {
  let best = null;
  for (const w of fl().walls) { if (w.curvePoint) continue; const r = rzutNaOdcinek(p, w.start, w.end); if (r.d < (w.thickness || 10) / 2 + tol && (!best || r.d < best.d)) best = { w, d: r.d }; }
  if (!best) { toast('Stuknij w ścianę'); return; }
  if (!S.para.sciany.includes(best.w.id)) S.para.sciany.push(best.w.id);
  odswiez();
  if (S.para.sciany.length < 2) { podpowiedz('Teraz druga ściana'); return; }
  const pk = S.sc.pokoje.find((q) => q.room.id === S.para.id), sc = S.para.sciany, kl = S.para.klucz;
  S.para = null; narzedzie('widok');
  if (!pk) return;
  const r = pokojMeta(pk); r.amPary = { ...(r.amPary || {}), [kl]: sc }; pk.room.amPary = r.amPary;
  AKCJE.kalibruj();
}
// po wczytaniu rzutu: propozycja dopasowania, gdy karta ma pomiary, a rzut jeszcze do nich nie dopasowany
const kluczPropozycji = () => `am-plan-nie-teraz:${S.oid || 'bez'}`;
function odrzucone(rodzaj, n) { try { return localStorage.getItem(kluczPropozycji()) === `${rodzaj}:${n}`; } catch { return false; } }
function propozycjaDopasowania() {
  const el0 = $('#podpowiedz'), wk = wolneKonce().length;
  if (S.narzedzie === 'widok' && wk && !odrzucone('napraw', wk)) { // najpierw zamknięte pomieszczenia
    el0.innerHTML = `<span>Czerwone kółka: tu ściany się nie stykają, więc pomieszczenie nie jest zamknięte — nie ma podłogi, nazwy ani metrażu.</span><span class="pp-przyciski"><button data-a="napraw">Napraw</button><button data-a="propozycja-nie" data-r="napraw:${wk}">Nie teraz</button></span>`;
    el0.hidden = false; el0.classList.add('z-przyciskami'); return;
  }
  const nie = (S.sc?.pokoje || []).filter((p) => !p.otwor && p.wym && !p.dop);
  const el = $('#podpowiedz');
  if (!nie.length || S.narzedzie !== 'widok' || odrzucone('dopasuj', nie.length)) return;
  el.innerHTML = `<span>Twoje pomiary z karty: ${nie.length} ${nie.length === 1 ? 'pomieszczenie' : nie.length < 5 ? 'pomieszczenia' : 'pomieszczeń'}. Dopasować do nich rzut?</span><span class="pp-przyciski"><button data-a="kalibruj">Dopasuj</button><button data-a="propozycja-nie" data-r="dopasuj:${nie.length}">Nie teraz</button></span>`;
  el.hidden = false; el.classList.add('z-przyciskami');
}
AKCJE['plik-rzutu'] = () => {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([migawka()], { type: 'application/json' }));
  a.download = `rzut-${(S.nazwa || 'oferta').replace(/[^\p{L}\p{N}]+/gu, '-')}.json`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
};
AKCJE['propozycja-nie'] = (b) => { podpowiedz(''); try { localStorage.setItem(kluczPropozycji(), b?.dataset.r || ''); } catch { /* */ } }; // nie pokazuj tej samej propozycji znowu (wróci, gdy sytuacja się zmieni)
// dociągnięcie wolnych końców ścian: do ściany obok (koniec na przecięciu prostych), do drugiego wolnego końca w narożniku
// (obie ściany wydłużone do przecięcia) albo do przedłużenia tej samej ściany (przerwa w prostej ścianie — końce w połowie)
function polaczSciany() {
  const W = fl().walls.filter((w) => !w.curvePoint);
  const styka = (p, w) => W.some((q) => q !== w && rzutNaOdcinek(p, q.start, q.end).d < 2);
  const wolne = () => { const L = []; for (const w of W) for (const k of ['start', 'end']) if (!styka(w[k], w)) L.push({ w, k }); return L; };
  const r1 = (v) => Math.round(v * 10) / 10, ust = (w, k, X) => { w[k] = { x: r1(X.x), y: r1(X.y) }; };
  let n = 0;
  for (let przebieg = 0; przebieg < 4; przebieg++) {
    let zm = 0;
    for (const { w, k } of wolne()) {
      const p = w[k]; if (styka(p, w)) continue;
      const u = kierunek(w), dalej = { x: p.x - w[k === 'start' ? 'end' : 'start'].x, y: p.y - w[k === 'start' ? 'end' : 'start'].y };
      let best = null;
      for (const q of W) {
        if (q === w) continue;
        const v = kierunek(q), sin = u.x * v.y - u.y * v.x;
        if (Math.abs(sin) < 0.05) { // ta sama prosta: przerwa w ścianie
          if (Math.abs((q.start.x - p.x) * -u.y + (q.start.y - p.y) * u.x) > 3) continue;
          for (const kk of ['start', 'end']) {
            const e = q[kk], d = Math.hypot(e.x - p.x, e.y - p.y);
            if (d > 0 && d <= 60 && (e.x - p.x) * dalej.x + (e.y - p.y) * dalej.y > 0 && !styka(e, q) && (!best || d < best.d)) best = { d, X: { x: (p.x + e.x) / 2, y: (p.y + e.y) / 2 }, q, kk };
          }
          continue;
        }
        if (Math.abs(sin) < 0.5) continue; // ukośne pod małym kątem — nie zgadujemy
        const t = ((q.start.x - p.x) * v.y - (q.start.y - p.y) * v.x) / sin, X = { x: p.x + u.x * t, y: p.y + u.y * t };
        if (Math.abs(t) > 40) continue;
        if (rzutNaOdcinek(X, q.start, q.end).d <= 2) { if (!best || Math.abs(t) < best.d) best = { d: Math.abs(t), X }; continue; }
        for (const kk of ['start', 'end']) { // narożnik z dwóch wolnych końców
          const e = q[kk]; if (styka(e, q) || Math.hypot(e.x - X.x, e.y - X.y) > 40) continue;
          if (!best || Math.abs(t) < best.d) best = { d: Math.abs(t), X, q, kk };
        }
      }
      if (best) { ust(w, k, best.X); if (best.q) ust(best.q, best.kk, best.X); zm++; }
    }
    n += zm; if (!zm) break;
  }
  return n;
}
AKCJE.napraw = () => { podpowiedz(''); const przed = migawka(); if (polaczSciany()) { zapamietaj(przed); poScianach(); } wyprostuj(); { const p2 = migawka(); if (polaczSciany()) { zapamietaj(p2); poScianach(); } } const zost = wolneKonce().length; zastosujNazwyZKarty(); if (zost) toast(`Zostało ${zost} miejsc, gdzie ściany się nie stykają — dociągnij je ręcznie (przeciągnij koniec ściany do drugiej).`, 5000); else setTimeout(propozycjaDopasowania, 300); };
AKCJE['wym-pokoi'] = () => { const przed = migawka(), wl = !wymiaryPokoi(); for (const f of S.projekt.floors) { if (wl) delete f.amBezWymiarowPokoi; else f.amBezWymiarowPokoi = true; } zapamietaj(przed); interfejs(); odswiez(); };
const wymiaryPokoi = () => !!S.projekt && S.projekt.floors.every((f) => !f.amBezWymiarowPokoi);
function htmlKalibracji() {
  if (S.arkusz?.blad) return `<p class="info" style="margin-top:0">Nie dopasowałem rzutu — przesunięcie ścian rozdzieliłoby albo połączyło pomieszczenia. Rzut został bez zmian.</p>
    <p class="info">Zwykle to znak, że gdzieś ściany się nie stykają (np. po ręcznych poprawkach). Spróbuj „Więcej” → „Wyprostuj skan” i dopasuj jeszcze raz.</p><div class="przyciski">${btn('zamknij', 'zakoncz', 'Zamknij')}</div>`;
  const R = S.raport || [], cm = (v) => `${(Math.round(v * 10) / 10).toFixed(1).replace('.', ',')} cm`, mm = (v) => (v / 100).toFixed(3).replace('.', ',');
  const teraz = new Map((S.sc?.pokoje || []).map((p) => [p.room.id, p]));
  return `<p class="info" style="margin-top:0">Ściany przesunięte tak, żeby zgadzały się z Twoimi pomiarami z karty. Kształt — wnęki, załomy, ścianki — zostaje ze skanu. „Cofnij” u góry przywraca poprzedni rzut.</p>
    <ul class="kalibracja">${R.map((w) => { const p = teraz.get(w.id); return `<li><div class="k-gl"><b>${esc(w.nazwa || 'Pomieszczenie')}</b>${w.przybl ? `<small>w karcie: ${esc(w.karta)}</small>` : ''}<span>${w.przedM != null ? m2(w.przedM) : '—'} → <b>${p?.m != null ? m2(p.m) : '—'}</b></span></div>
      ${w.niepewny || w.reczny ? `<div class="k-os">${w.reczny ? 'Kierunek długości ustawiony ręcznie.' : 'Pomieszczenie prawie kwadratowe — długość i szerokość ułożone tak, jak lepiej pasuje do skanu i sąsiednich pomiarów.'} ${btn('zamien-os', 'obroc', 'Zamień długość z szerokością', 'maly', `data-id="${esc(w.id)}" data-os="${w.osA === 'x' ? 'y' : 'x'}"`)}</div>` : ''}
      ${w.osie.map((o) => o.brak ? `<div class="k-os zle">${mm(o.m)} m — nie znalazłem pary ścian z taką odległością ${btn('wskaz-pare', 'linijka', 'Wskaż ściany', 'maly', `data-id="${esc(w.id)}" data-k="${o.klucz}" data-m="${o.m}"`)}</div>`
        : `<div class="k-os ${o.sprzeczny ? 'zle' : ''}">${mm(o.m)} m: skan ${cm(o.przed)} → ${cm(o.po)} ${o.sprzeczny ? `— kłóci się z innym pomiarem o ${cm(Math.abs(o.po - o.m))}` : `<span class="ok">✓ ${o.po - o.przed >= 0 ? '+' : '−'}${cm(Math.abs(o.po - o.przed))}</span>`} ${btn('wskaz-pare', 'linijka', 'Inne ściany', 'maly', `data-id="${esc(w.id)}" data-k="${o.klucz}" data-m="${o.m}"`)}</div>`).join('')}</li>`; }).join('')}</ul>
    ${(S.raportGrubosci || []).length ? `<p class="info">Grubości ścian działowych wyliczone z pomiarów: ${S.raportGrubosci.map((g) => `${String(Math.round(g.przed * 10) / 10).replace('.', ',')} → <b>${String(Math.round(g.po * 10) / 10).replace('.', ',')} cm</b>${g.podejrzana ? ' (nietypowa — sprawdź pomiary obok)' : ''}`).join(', ')}.</p>` : ''}
    <p class="info">Metraż każdego pomieszczenia liczy się teraz z dopasowanego kształtu — razem z wnękami i załamaniami — i po „Zapisz” trafi do karty.</p>
    <div class="przyciski">${btn('zamknij', 'zakoncz', 'Gotowe')}</div>`;
}
// ---------- szafa we wnęce: front szafy ze skanu → wnęka do ściany za nim (dopasuj.js: szafaWeWnece) ----------
function wstawSzafe(zakres, strona = 0) {
  if (!zakres) { toast('Nie widzę w skanie frontu szafy w tym miejscu.', 2600); return; }
  const przed = migawka(), f = fl();
  const r = szafaWeWnece(f, S.sc.pokoje, zakres, noweId, strona);
  if (r.potrzebnaStrona) { S.arkusz = { typ: 'szafa', zakres, plus: r.plus, minus: r.minus }; S.zazn = null; interfejs(); odswiez(); return; }
  if (r.blad) { toast(r.blad, 2600); return; }
  zapamietaj(przed); S.arkusz = null; S.zazn = null; poScianach(); interfejs();
  toast(`Szafa we wnęce: ${Math.round(r.szer)} × ${Math.round(r.gleb)} cm${r.wlasciciel ? ` (${r.wlasciciel})` : ''}. Cofnij, jeśli nie pasuje.`, 3000);
}
AKCJE['szafa-z-drzwi'] = () => { const d = element(); if (!d || S.zazn?.rodzaj !== 'drzwi') return; wstawSzafe(frontSzafy(fl(), d.wallId, d.id)); };
AKCJE.szafa = () => { const w = element(); if (!w || S.zazn?.rodzaj !== 'sciana') return; wstawSzafe(frontSzafy(fl(), w.id)); };
AKCJE['szafa-strona'] = (b) => { if (S.arkusz?.typ !== 'szafa') return; wstawSzafe(S.arkusz.zakres, Number(b.dataset.v)); };
AKCJE['dl-koniec'] = (b) => { const w = element(); if (!w) return; S.dlKoniec = { id: w.id, k: b.dataset.v }; interfejs(); odswiez(); };
AKCJE['nazwa-pok'] = (b) => nazwijPokoj(b.dataset.v);
AKCJE.podloga = (b) => { const p = element(); if (!p) return; const przed = migawka(); pokojMeta(p).amPodloga = b.dataset.v; zapamietaj(przed); przebuduj(); interfejs(); };
function ustawSzerokosc(o, v) {
  const w = fl().walls.find((q) => q.id === o.wallId); if (!w || !(v > 10)) return;
  const L = Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y); v = Math.min(v, L - 4);
  o.width = v; o.position = Math.max(v / 2 / L, Math.min(1 - v / 2 / L, o.position));
}
// metadane pomieszczenia (nazwa, podłoga) trzymamy w floor.rooms — dopisujemy, gdy pokój wykryto dopiero teraz
function pokojMeta(p) {
  const f = fl(); f.rooms = f.rooms || [];
  let r = f.rooms.find((q) => q.id === p.room.id);
  if (!r) { r = { ...p.room }; f.rooms.push(r); }
  return r;
}
function nazwijPokoj(n) {
  const p = element(); if (!p) return;
  const przed = migawka(); const r = pokojMeta(p); r.name = String(n).trim(); delete r.amNazwaSkan;
  if (przed !== migawka()) { zapamietaj(przed); przebuduj(); interfejs(); }
}
function podlaczPola(ark) {
  for (const inp of ark.querySelectorAll('input[data-pole]')) {
    const pole = inp.dataset.pole;
    if (pole === 'szukaj') { inp.addEventListener('input', () => { S.arkusz.szukaj = inp.value; const poz = inp.selectionStart; interfejs(); const n = $('#arkusz input[data-pole=szukaj]'); n.focus(); try { n.setSelectionRange(poz, poz); } catch { /* */ } }); continue; }
    const zatwierdz = () => {
      const v = inp.type === 'checkbox' ? inp.checked : inp.type === 'number' ? Number(String(inp.value).replace(',', '.')) : inp.value;
      if (inp.type === 'number' && !(v > 0 || (pole === 'r' && v === 0))) { interfejs(); return; }
      if (pole === 'nazwa') return nazwijPokoj(v);
      if (pole === 'nazwa-pietra') { const f = pietro(S.projekt), przed = migawka(); f.name = String(v).trim() || f.name; if (przed !== migawka()) { zapamietaj(przed); interfejs(); } return; }
      if (pole === 'granica') return AKCJE.granica();
      if (pole === 'wym-pok') { const pk = element(); if (!pk) return; const przed = migawka(); const r = pokojMeta(pk); if (v) delete r.amBezWymiarow; else r.amBezWymiarow = true; zapamietaj(przed); przebuduj(); interfejs(); return; }
      if (pole === 'w' || pole === 'd') return zmien((f) => {
        const { w, d } = wymiaryMebla(f), sxx = Math.abs(f.scale?.x ?? 1) || 1, syy = Math.abs(f.scale?.y ?? 1) || 1, nv = Math.max(5, v);
        if (proporcjonalny(f)) { const k = nv / (pole === 'w' ? w : d); f.width = (w * k) / sxx; f.depth = (d * k) / syy; return; }
        f[pole === 'w' ? 'width' : 'depth'] = nv / (pole === 'w' ? sxx : syy);
      });
      if (pole === 'r') return zmien((f) => { f.rotation = ((v % 360) + 360) % 360; });
      if (pole === 'szer') return zmien((o) => ustawSzerokosc(o, v));
      if (pole === 'dl') return zmien((w) => ustawDlugosc(w, v), true);
    };
    inp.addEventListener('change', zatwierdz);
  }
  for (const inp of ark.querySelectorAll('input[data-przel]')) inp.addEventListener('change', () => AKCJE[inp.dataset.przel]());
  for (const c of ark.querySelectorAll('canvas[data-mebel]')) miniatura(c, c.dataset.mebel);
  for (const c of ark.querySelectorAll('canvas[data-probka]')) probkaPodlogi(c, c.dataset.probka);
}
// ---------- geometria ścian: linie, końce, przesunięcia równoległe ----------
const kierunek = (q) => { const dx = q.end.x - q.start.x, dy = q.end.y - q.start.y, l = Math.hypot(dx, dy) || 1; return { x: dx / l, y: dy / l, l }; };
function wspolliniowe(q, w) { // ta sama prosta
  const u = kierunek(w), v = kierunek(q);
  if (Math.abs(u.x * v.y - u.y * v.x) > 0.02) return false;
  return Math.abs((q.start.x - w.start.x) * -u.y + (q.start.y - w.start.y) * u.x) < 1.5;
}
// linia ściany: ściana i jej współliniowe przedłużenia (połączone końcami) — przesuwają się razem
function liniaSciany(w) {
  const L = [w];
  for (let i = 0; i < L.length; i++) for (const q of fl().walls) {
    if (L.includes(q) || q.curvePoint || !!q.granica !== !!w.granica || !wspolliniowe(q, w)) continue;
    if (['start', 'end'].some((k) => ['start', 'end'].some((kk) => rownoPunkt(q[k], L[i][kk])))) L.push(q);
  }
  return L;
}
const zaokr1 = (v) => Math.round(v * 10) / 10;
// przesunięcie linii ściany o wektor; końce ścian dochodzących do niej idą za nią (te ściany się wydłużają/skracają, kąty zostają)
function przesunLinie(linia, vx, vy) {
  const odc = linia.map((q) => ({ a: { ...q.start }, b: { ...q.end } }));
  for (const q of fl().walls) if (!linia.includes(q)) for (const k of ['start', 'end']) {
    if (odc.some((o) => rzutNaOdcinek(q[k], o.a, o.b).d < 2)) q[k] = { x: zaokr1(q[k].x + vx), y: zaokr1(q[k].y + vy) };
  }
  for (const q of linia) { q.start = { x: zaokr1(q.start.x + vx), y: zaokr1(q.start.y + vy) }; q.end = { x: zaokr1(q.end.x + vx), y: zaokr1(q.end.y + vy) }; }
}
// ściany, na których kończy się ściana w (narożnik albo „T”), bez jej przedłużeń
function naKoncu(w, k) {
  return fl().walls.filter((q) => q !== w && !q.curvePoint && !wspolliniowe(q, w) && (rownoPunkt(q.start, w[k]) || rownoPunkt(q.end, w[k]) || rzutNaOdcinek(w[k], q.start, q.end).d < 2));
}
// wydłużenie / skrócenie ściany o d na końcu k: ściana, na której się kończy, przesuwa się równolegle
function przesunKoniec(w, k, d) {
  const drugi = k === 'start' ? 'end' : 'start', L = Math.hypot(w[k].x - w[drugi].x, w[k].y - w[drugi].y) || 1;
  const ux = (w[k].x - w[drugi].x) / L, uy = (w[k].y - w[drugi].y) / L;
  const linie = []; for (const q of naKoncu(w, k)) if (!linie.some((l) => l.includes(q))) linie.push(liniaSciany(q));
  if (linie.length) { for (const l of linie) przesunLinie(l, ux * d, uy * d); return; }
  const stary = { ...w[k] }; // wolny koniec
  w[k] = { x: zaokr1(w[k].x + ux * d), y: zaokr1(w[k].y + uy * d) };
  for (const q of fl().walls) if (q !== w && wspolliniowe(q, w)) for (const kk of ['start', 'end']) if (rownoPunkt(q[kk], stary)) q[kk] = { ...w[k] };
}
// który koniec ma się przesuwać: wolny, a jeśli oba gdzieś dochodzą — ten, przy którym przesuwa się krótsza ściana (np. tył wnęki, nie długa ściana korytarza)
function domyslnyKoniec(w) {
  const waga = (k) => { const l = []; for (const q of naKoncu(w, k)) if (!l.some((x) => x.includes(q))) l.push(liniaSciany(q)); return l.flat().reduce((a, q) => a + kierunek(q).l, 0); };
  return waga('start') < waga('end') ? 'start' : 'end';
}
const koniecSciany = (w) => (S.dlKoniec?.id === w.id ? S.dlKoniec.k : domyslnyKoniec(w));
function nazwaKonca(w, k) {
  const drugi = k === 'start' ? 'end' : 'start', dx = w[k].x - w[drugi].x, dy = w[k].y - w[drugi].y;
  return Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'prawy koniec →' : '← lewy koniec') : (dy > 0 ? 'dolny koniec ↓' : '↑ górny koniec');
}
const czysta = (w) => { const g = S.sc?.sciany.find((q) => q.w.id === w.id); return g ? dlugoscCzysta(g, S.sc.sciany, S.sc.pokoje) : kierunek(w).l; };
// długość w świetle (jak na rzucie i jak mierzy dalmierz / miarka)
function ustawDlugosc(w, v) {
  if (!(v > 5)) return;
  przesunKoniec(w, koniecSciany(w), v - czysta(w));
}
// miniatury w katalogu: ten sam rysunek co na rzucie
function miniatura(c, k) {
  const g = c.getContext('2d'), e = MEBLE[k], s = Math.min((c.width - 16) / e.w, (c.height - 16) / e.d);
  const sc = { fl: { furniture: [{ id: 'm', amRodzaj: k, catalogId: 'imported_object', position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1, z: 1 }, width: e.w, depth: e.d }], walls: [], doors: [], windows: [] }, pokoje: [], sciany: [], granice: { x0: -e.w / 2, y0: -e.d / 2, x1: e.w / 2, y1: e.d / 2 } };
  rysuj(g, sc, { s, ox: c.width / 2, oy: c.height / 2, dpr: 1 }, { wymiary: false, obrazy: S.obrazy, tlo: '#f3f0ea' });
}
function probkaPodlogi(c, k) {
  const sc = { fl: { furniture: [], walls: [], doors: [], windows: [] }, sciany: [], granice: { x0: 0, y0: 0, x1: 120, y1: 80 },
    pokoje: [{ room: { id: 'p' }, poly: [{ x: 0, y: 0 }, { x: 120, y: 0 }, { x: 120, y: 80 }, { x: 0, y: 80 }], dziury: [], podloga: k, nazwa: '', m: null, otwor: false, bezNapisu: true }] };
  rysuj(c.getContext('2d'), sc, { s: 1, ox: 0, oy: 0, dpr: 1 }, { wymiary: false, obrazy: S.obrazy, bezNapisow: true, bezCienia: true });
}

// ---------- wyprostowanie skanu ----------
function wyprostuj() {
  const f = fl(); if (!f.walls.length) return;
  zapamietaj();
  // 1) dominujący kierunek ścian (ważony długością, kąty mod 90°) → obrót całego piętra do osi
  let sx = 0, sy = 0;
  for (const w of f.walls) { const dx = w.end.x - w.start.x, dy = w.end.y - w.start.y, L = Math.hypot(dx, dy), a = Math.atan2(dy, dx) * 4; sx += Math.cos(a) * L; sy += Math.sin(a) * L; }
  const th = Math.atan2(sy, sx) / 4;
  if (Math.abs(th) > 1e-4) {
    const c = Math.cos(-th), s = Math.sin(-th), obr = (p) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c });
    for (const w of f.walls) { w.start = obr(w.start); w.end = obr(w.end); if (w.curvePoint) w.curvePoint = obr(w.curvePoint); }
    for (const m of f.furniture) { m.position = obr(m.position); m.rotation = (m.rotation || 0) - (th * 180) / Math.PI; }
    for (const k of ['stairs', 'columns']) for (const m of f[k] || []) { m.position = obr(m.position); m.rotation = (m.rotation || 0) - (th * 180) / Math.PI; }
  }
  // 2) skupiska końców ścian (do 8 cm) → wspólny punkt; ściany prawie poziome/pionowe → dokładnie
  const konce = []; for (const w of f.walls) konce.push({ w, k: 'start' }, { w, k: 'end' });
  const rodzic = konce.map((_, i) => i), znajdz = (i) => (rodzic[i] === i ? i : (rodzic[i] = znajdz(rodzic[i])));
  for (let i = 0; i < konce.length; i++) for (let j = i + 1; j < konce.length; j++) { const a = konce[i].w[konce[i].k], b = konce[j].w[konce[j].k]; if (Math.hypot(a.x - b.x, a.y - b.y) < 8) rodzic[znajdz(i)] = znajdz(j); }
  const grX = konce.map((_, i) => i), grY = konce.map((_, i) => i), fx = (i) => (grX[i] === i ? i : (grX[i] = fx(grX[i]))), fy = (i) => (grY[i] === i ? i : (grY[i] = fy(grY[i])));
  for (let i = 0; i < konce.length; i++) { grX[fx(i)] = fx(znajdz(i)); grY[fy(i)] = fy(znajdz(i)); }
  const tol = Math.tan((6 * Math.PI) / 180);
  for (let i = 0; i < konce.length; i += 2) {
    const w = konce[i].w; if (w.curvePoint) continue;
    const dx = w.end.x - w.start.x, dy = w.end.y - w.start.y;
    if (Math.abs(dy) <= Math.abs(dx) * tol) grY[fy(i)] = fy(i + 1); // pozioma: wspólne y
    else if (Math.abs(dx) <= Math.abs(dy) * tol) grX[fx(i)] = fx(i + 1); // pionowa: wspólne x
  }
  const sumX = new Map(), sumY = new Map();
  konce.forEach((e, i) => { const p = e.w[e.k], a = fx(i), b = fy(i); const qx = sumX.get(a) || [0, 0], qy = sumY.get(b) || [0, 0]; sumX.set(a, [qx[0] + p.x, qx[1] + 1]); sumY.set(b, [qy[0] + p.y, qy[1] + 1]); });
  konce.forEach((e, i) => { const qx = sumX.get(fx(i)), qy = sumY.get(fy(i)); e.w[e.k] = { x: Math.round((qx[0] / qx[1]) * 2) / 2, y: Math.round((qy[0] / qy[1]) * 2) / 2 }; });
  // 3) końce dochodzące do środka innej ściany — dokładnie na nią
  for (const e of konce) {
    const p = e.w[e.k];
    for (const w of f.walls) {
      if (w === e.w || w.curvePoint) continue;
      const r = rzutNaOdcinek(p, w.start, w.end);
      if (r.d > 0 && r.d < 8 && r.t > 0.01 && r.t < 0.99) {
        if (Math.abs(w.end.y - w.start.y) < 0.5) p.y = w.start.y; else if (Math.abs(w.end.x - w.start.x) < 0.5) p.x = w.start.x;
      }
    }
  }
  f.walls = f.walls.filter((w) => Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y) >= 2);
  // 4) meble: kąt do pełnych 90° (do 8°), plecami do ściany, gdy stoją blisko
  for (const m of f.furniture) {
    const r = ((m.rotation % 360) + 360) % 360, k = Math.round(r / 90) * 90;
    if (Math.abs(r - k) < 8) m.rotation = k % 360;
    const kopia = { ...m, position: { ...m.position } };
    if (wyrownajDoSciany(kopia)) { const { d } = wymiaryMebla(m); const prz = Math.hypot(kopia.position.x - m.position.x, kopia.position.y - m.position.y); if (prz < Math.max(18, d * 0.25) && Math.abs(((kopia.rotation - m.rotation + 540) % 360) - 180) < 1) m.position = kopia.position; }
    m.position = { x: Math.round(m.position.x), y: Math.round(m.position.y) };
  }
  S.zazn = null; poScianach(); dopasuj(); interfejs();
  toast('Wyprostowano: ściany pod kątem prostym, meble dosunięte do ścian. Cofnij, jeśli wolisz poprzednią wersję.', 4500);
}

// ---------- wczytywanie ----------
$('#plik-skanu').addEventListener('change', async (e) => {
  const plik = e.target.files?.[0]; e.target.value = ''; if (!plik) return;
  try {
    let dane;
    if (/\.zip$/i.test(plik.name) || plik.type.includes('zip')) dane = await G.extractRoomJsonFromZip(plik);
    else dane = JSON.parse(await plik.text());
    let p;
    if (G.isRoomPlanJson(dane)) {
      p = G.createProjectFromRoomPlan(dane, S.nazwa);
      for (const f of p.floors) for (const r of f.rooms || []) if (r.name) r.amNazwaSkan = true; // nazwy zgadnięte przez skaner
      for (const f of p.floors) { // ściana zewnętrzna: płaszczyzna skanu = lico od środka; działowa: środek
        try {
          const przelicz = () => { f.rooms = G.resolveRooms(f, f.rooms || []); return G.resolveRoomGeometry(f, f.rooms).map((t) => ({ room: t.room, poly: t.polygon })); };
          poprawImport(f, przelicz(), undefined, undefined, przelicz); porzadkujSkan(f, przelicz()); f.rooms = G.resolveRooms(f, f.rooms);
        } catch { /* */ }
      }
    }
    else if (dane?.floors) p = G.readProject(dane);
    else throw new Error('To nie jest skan ani plan rzutu.');
    p = polskiProjekt(p);
    S.arkusz = null;
    if (S.projekt && S.projekt.floors.some((f) => f.walls.length)) {
      const w = await wybor('Co zrobić ze skanem?', 'Skan może zastąpić rzut na ekranie albo dojść jako kolejne piętro (np. poddasze domu).', [['zastap', 'Zastąp rzut'], ['pietro', 'Dodaj jako piętro']]);
      if (!w) return;
      zapamietaj();
      if (w === 'pietro') {
        const nowe = p.floors.map((f, i) => ({ ...f, id: noweId(), level: Math.max(...S.projekt.floors.map((q) => q.level ?? 0)) + 1 + i, name: `Piętro ${S.projekt.floors.length + i}` }));
        S.projekt.floors.push(...nowe); S.projekt.activeFloorId = nowe[0].id;
        ustawProjekt(S.projekt, true);
        toast('Skan dodany jako nowe piętro.', 3000);
        return;
      }
    } else if (S.projekt) zapamietaj();
    ustawProjekt(p, true);
    toast('Skan wczytany. „Więcej → Wyprostuj skan” poprawi krzywe ściany.', 4500);
  } catch (err) { toast(err?.message?.startsWith('To nie') ? err.message : 'Nie udało się wczytać pliku. Wybierz plik .json albo .zip ze skanu.', 4500); }
});
// nazwy ze skanu i szablonów po polsku
function polskiProjekt(p) {
  for (const f of p.floors) {
    f.name = { 'Ground Floor': 'Parter', Basement: 'Piwnica' }[f.name] || String(f.name || '').replace(/^Floor (\d+)$/, 'Piętro $1').replace(/^Basement (\d+)$/, 'Piwnica $1') || 'Parter';
    const nazwy = R.nazwyPomieszczen((f.rooms || []).map((r) => ({ nazwa: /^Room \d+$/.test(r.name || '') ? '' : r.name, kond: '' })));
    (f.rooms || []).forEach((r, i) => { r.name = nazwy[i].nazwa || ''; });
    f.doors = f.doors || []; f.windows = f.windows || []; f.furniture = f.furniture || [];
  }
  return p;
}
function ustawProjekt(p, nowy = false) {
  S.projekt = p; S.zazn = null;
  const f = fl();
  try { f.rooms = G.resolveRooms(f, f.rooms || []); } catch { /* */ }
  $('#pusto').hidden = true;
  przebuduj(); dopasuj(); interfejs();
  if (nowy) zmieniono();
  setTimeout(() => { zastosujNazwyZKarty(false, true); propozycjaDopasowania(); }, 400);
}
async function z3dBiblioteki(oid) { // plan z edytora zaawansowanego zapisany na tym urządzeniu
  try {
    const db = await new Promise((ok, zle) => { const r = indexedDB.open('openplan3d-local'); r.onsuccess = () => ok(r.result); r.onerror = () => zle(r.error); r.onupgradeneeded = () => { r.transaction.abort(); zle(new Error('brak')); }; });
    if (!db.objectStoreNames.contains('projects')) { db.close(); return null; }
    const ids = []; try { const z = localStorage.getItem(`am-projekt:${oid}`); if (z) ids.push(z); } catch { /* */ } ids.push(`am-${oid}`);
    for (const id of ids) {
      const raw = await new Promise((ok) => { const t = db.transaction('projects', 'readonly').objectStore('projects').get(id); t.onsuccess = () => ok(t.result); t.onerror = () => ok(null); });
      if (raw) { db.close(); return typeof raw === 'string' ? raw : JSON.stringify(raw); }
    }
    db.close();
  } catch { /* */ }
  return null;
}
async function start() {
  await Promise.all([document.fonts?.load?.('600 16px Archivo').catch(() => {}), document.fonts?.load?.('500 16px Archivo').catch(() => {})]);
  wczytajBiblioteke();
  if (!S.oid) { $('#pusto').hidden = false; interfejs(); return; }
  let wej = null, szk = null;
  try { wej = await R.czytaj(`wejscie:${S.oid}`); } catch { /* */ }
  try { szk = await R.czytaj(`szkic:${S.oid}`); } catch { /* */ }
  try { const z = JSON.parse(localStorage.getItem(`am-plan-wejscie:${S.oid}`) || 'null'); if (z) { S.nazwa = z.nazwa || S.nazwa; S.pomKarty = z.pom || []; S.bazaT = z.t ?? null; } } catch { /* */ }
  if (wej && !wej.z3d) { S.nazwa = wej.nazwa || S.nazwa; S.pomKarty = wej.pom || []; S.bazaT = wej.t ?? null; try { localStorage.setItem(`am-plan-wejscie:${S.oid}`, JSON.stringify({ nazwa: S.nazwa, pom: S.pomKarty, t: S.bazaT })); } catch { /* */ } }
  $('#tytul').textContent = S.nazwa; document.title = `Rzut — ${S.nazwa}`;
  let tekst = null, zrodlo = '';
  // szkic z tego urządzenia wygrywa, jeśli powstał na tej samej wersji planu (nikt nie zapisał nowszej)
  if (wej?.z3d && wej.plan) { tekst = wej.plan; zrodlo = 'z3d'; }
  else if (szk?.plan && (szk.bazaT ?? null) === (S.bazaT ?? null)) { tekst = szk.plan; zrodlo = 'szkic'; }
  else if (wej?.plan) { tekst = wej.plan; zrodlo = 'oferta'; }
  else if (wej && wej.plan === null && wej.brakNaSerwerze) { tekst = await z3dBiblioteki(S.oid); zrodlo = tekst ? 'urzadzenie' : ''; }
  if (!tekst && !wej?.plan) { const t3 = await z3dBiblioteki(S.oid); if (t3) { tekst = t3; zrodlo = 'urzadzenie'; } }
  if (wej) R.usun(`wejscie:${S.oid}`).catch(() => {});
  if (tekst) {
    try { ustawProjekt(polskiProjekt(G.readProject(JSON.parse(tekst)))); }
    catch { toast('Zapisany plan jest uszkodzony. Wczytaj skan jeszcze raz.', 5000); $('#pusto').hidden = false; }
    if (zrodlo === 'szkic') { S.zmienione = true; toast('Wczytano Twój niezapisany szkic z tego urządzenia', 3000); }
    if (zrodlo === 'urzadzenie') toast('Otwarto rzut zapisany na tym urządzeniu', 3000);
    if (zrodlo === 'z3d') { zmieniono(); toast('Zmiany z edytora zaawansowanego są w rzucie. Stuknij „Zapisz”, żeby trafiły do oferty.', 4500); }
  } else $('#pusto').hidden = false;
  interfejs();
}
async function wczytajBiblioteke() {
  const laduj = (src) => new Promise((ok) => { const i = new Image(); i.decoding = 'async'; i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
  const logo = await laduj('img/monogram.png'); if (logo) S.obrazy.set('logo', logo);
  try {
    const spis = await (await fetch('img/plan/biblioteka.json', { cache: 'no-cache' })).json();
    await Promise.all([
      ...(spis.meble || []).map(async (k) => { const i = await laduj(`img/plan/meble/${k}.webp?v=${spis.wersja || 1}`); if (i) S.obrazy.set(`mebel:${k}`, i); }),
      ...(spis.podlogi || []).map(async (k) => { const i = await laduj(`img/plan/podlogi/${k}.webp?v=${spis.wersja || 1}`); if (i) { S.obrazy.set(`podloga:${k}`, i); S.obrazy.set(`podlogaCm:${k}`, spis.cmPodlog?.[k] || 200); } }),
    ]);
  } catch { /* biblioteka grafik jeszcze pusta — rysuje kod */ }
  przebuduj(); if (S.arkusz) interfejs();
}

// ---------- zapis i wyjście ----------
function pokojeDoKarty() {
  const L = [];
  for (const f of S.projekt.floors) {
    const sc = scena({ ...S.projekt, activeFloorId: f.id }, S.pomKarty);
    // karta: nazwa pomieszczenia z karty, z którym rzut je połączył; dop: rzut dopasowany do pomiaru z tej karty
    for (const p of sc.pokoje) if (!p.otwor) L.push({ nazwa: (p.nazwa || '').trim(), m: p.m, kond: S.projekt.floors.length > 1 ? f.name : '', karta: p.karta?.nazwa || '', dop: p.dop });
  }
  return L;
}
async function zapiszWOfercie() {
  if (!S.projekt) { toast('Najpierw wczytaj skan albo narysuj ściany.'); return; }
  if (!S.oid) { toast('Otwórz rzut z karty oferty, żeby zapisać go w ofercie.'); return; }
  const co = await wybor('Co zapisać w ofercie?', 'Każdy widok trafi do zdjęć oferty jako osobne zdjęcie. 2D ma wymiary ścian, 3D to wizualizacja z nazwami i metrażem.',
    [['oba', 'Oba widoki — 2D i 3D'], ['2d', 'Tylko 2D (z wymiarami)'], ['3d', 'Tylko 3D']]);
  if (!co) return;
  const b = $('[data-a=zapisz]'); b.disabled = true; b.textContent = 'Zapisuję…';
  try {
    const pierwotne = S.projekt.activeFloorId;
    // przy kilku piętrach wszystkie piętra na jednym obrazie (osobno 2D i 3D)
    const png = co !== '3d' ? await obrazRzutu(false) : null;
    const png3d = co !== '2d' ? await obrazRzutu(true) : null;
    S.projekt.activeFloorId = pierwotne;
    await R.wloz(`wynik:${S.oid}`, { plan: migawka(), png, png3d, pokoje: pokojeDoKarty(), t: Date.now() });
    await R.usun(`szkic:${S.oid}`).catch(() => {});
    try { localStorage.removeItem(`am-plan-wejscie:${S.oid}`); } catch { /* */ }
    S.zmienione = false;
    location.href = `./#/o/${encodeURIComponent(S.oid)}/zdjecia`;
  } catch (e) { toast('Nie udało się zapisać rzutu. Spróbuj jeszcze raz.', 4000); b.disabled = false; b.textContent = 'Zapisz'; }
}
async function wyjdz() {
  if (S.zmienione && S.projekt && !(await potwierdz('Wyjść bez zapisywania w ofercie?', 'Zmiany zostaną na tym urządzeniu jako szkic — wrócisz do nich, otwierając rzut. W ofercie i u wspólnika pojawią się dopiero po „Zapisz”.', 'Wyjdź'))) return;
  location.href = S.oid ? `./#/o/${encodeURIComponent(S.oid)}/s/pom` : './';
}
async function zaawansowany() {
  if (!S.oid) { location.href = 'rzut/editor'; return; }
  if (S.projekt) { await R.wloz(`wejscie:${S.oid}`, { plan: migawka(), nazwa: S.nazwa }); await R.wloz(`szkic:${S.oid}`, { plan: migawka(), t: Date.now(), bazaT: S.bazaT }); }
  location.href = `rzut/editor?am=${encodeURIComponent(S.oid)}`;
}
async function obrazRzutu(w3d = S.tryb3d) {
  const op = { meble: S.meble, wymiary: false, wymiaryPokoi: wymiaryPokoi(), obrazy: S.obrazy }; // wymiary ścian tylko w edytorze
  const eksport = w3d ? eksport3DPNG : eksportPNG, skalaE = w3d ? skalaEksportu3D : skalaEksportu;
  if (S.projekt.floors.length < 2) return eksport(S.sc, op);
  const sceny = S.projekt.floors.filter((f) => f.walls.length).map((f) => ({ f, sc: scena({ ...S.projekt, activeFloorId: f.id }, S.pomKarty) }));
  const skala = Math.min(...sceny.map((x) => skalaE(x.sc)));
  const kawalki = [];
  for (const [i, { f, sc }] of sceny.entries()) kawalki.push(await createImageBitmap(await eksport(sc, { ...op, tytul: f.name, skala, bezStopki: i < sceny.length - 1 })));
  if (kawalki.length < 2) return eksport(S.sc, op);
  const W = Math.max(...kawalki.map((k) => k.width)), H = kawalki.reduce((a, k) => a + k.height, 0);
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
  let y = 0; for (const k of kawalki) { g.drawImage(k, (W - k.width) / 2, y); y += k.height; }
  return new Promise((ok) => c.toBlob(ok, 'image/png'));
}
async function pobierzObraz() {
  const png = await obrazRzutu();
  const a = document.createElement('a'); a.href = URL.createObjectURL(png); a.download = `rzut${S.tryb3d ? '-3d' : ''}-${(S.nazwa || 'oferta').replace(/[^\p{L}\p{N}]+/gu, '-')}.png`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
window.addEventListener('beforeunload', () => { if (S.projekt && S.oid) R.wloz(`szkic:${S.oid}`, { plan: migawka(), t: Date.now(), bazaT: S.bazaT }).catch(() => {}); });

// ---------- drobne ----------
let toastT = 0;
function toast(t, ms = 2600) { const el = $('#toast'); el.textContent = t; el.classList.add('widac'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('widac'), ms); }
function wybor(tytul, tresc, opcje) {
  return new Promise((wynik) => {
    const w = document.createElement('div'); w.className = 'okno-tlo';
    w.innerHTML = `<div role="dialog" aria-modal="true"><h4>${esc(tytul)}</h4><p>${esc(tresc)}</p><div class="rzad pion">${opcje.map(([k, t], i) => `<button class="${i === 0 ? 'z' : ''}" data-w="${k}">${esc(t)}</button>`).join('')}<button data-n>Anuluj</button></div></div>`;
    w.addEventListener('click', (e) => { const b = e.target.closest('[data-w]'); if (b) { w.remove(); wynik(b.dataset.w); } else if (e.target.closest('[data-n]') || e.target === w) { w.remove(); wynik(null); } });
    document.body.appendChild(w);
  });
}
function potwierdz(tytul, tresc, ok) {
  return new Promise((wynik) => {
    const w = document.createElement('div'); w.className = 'okno-tlo';
    w.innerHTML = `<div role="dialog" aria-modal="true"><h4>${esc(tytul)}</h4><p>${esc(tresc)}</p><div class="rzad"><button data-n>Anuluj</button><button class="z" data-t>${esc(ok)}</button></div></div>`;
    w.addEventListener('click', (e) => { if (e.target.closest('[data-t]')) { w.remove(); wynik(true); } else if (e.target.closest('[data-n]') || e.target === w) { w.remove(); wynik(false); } });
    document.body.appendChild(w);
  });
}
matchMedia('(min-width: 900px)').addEventListener('change', () => { interfejs(); });
if (window.visualViewport) {
  const dopasujArkusz = () => { const v = window.visualViewport, d = Math.max(0, window.innerHeight - v.height - v.offsetTop); $('#arkusz').style.bottom = d > 60 ? `${d}px` : ''; };
  window.visualViewport.addEventListener('resize', dopasujArkusz); window.visualViewport.addEventListener('scroll', dopasujArkusz);
}
window.__plan = S; window.__planUI = { interfejs, odswiez, dopasuj, przebuduj: () => poScianach(), wolneKonce, propozycja: propozycjaDopasowania, nazwyZKarty: () => zastosujNazwyZKarty() }; // do testów
start();
