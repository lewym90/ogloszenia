// Dopasowanie skanu do pomiarów z karty: node --test test/dopasuj.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../js/plan/geom.js';
import { dopasujDoPomiarow, dopasujNazwy } from '../js/plan/dopasuj.js';

// mieszkanie: pokój 400×300 (osie), korytarz 160 szer. z wnęką na szafę 60 głęb., łazienka
function mieszkanie(k = 1, obrot = 0) {
  const p = G.createDefaultProject('t'), f = p.floors[0]; let n = 0;
  const R = (x, y) => { const a = (obrot * Math.PI) / 180; return { x: Math.round((x * k * Math.cos(a) - y * k * Math.sin(a)) * 10) / 10, y: Math.round((x * k * Math.sin(a) + y * k * Math.cos(a)) * 10) / 10 }; };
  const W = (a, b, t) => f.walls.push({ id: 'w' + n++, start: R(...a), end: R(...b), thickness: t, height: 260 });
  // obrys
  W([0, 0], [600, 0], 20); W([600, 0], [600, 250], 20); W([600, 250], [660, 250], 12); W([660, 250], [660, 400], 12); W([660, 400], [600, 400], 12);
  W([600, 400], [600, 500], 20); W([600, 500], [0, 500], 20); W([0, 500], [0, 0], 20);
  // ściany wewnętrzne
  W([400, 0], [400, 500], 12); // pokój | korytarz
  W([400, 200], [600, 200], 12); // łazienka nad korytarzem
  W([0, 300], [400, 300], 12); // pokój | sypialnia
  f.furniture = [{ id: 'm1', amRodzaj: 'szafa_2', position: R(630, 325), rotation: 0, width: 50, depth: 140, scale: { x: 1, y: 1, z: 1 } }];
  f.rooms = G.resolveRooms(f, []);
  return f;
}
const pokoje = (f) => G.resolveRoomGeometry(f, f.rooms).map((t) => ({ room: t.room, poly: t.polygon, m: G.interiorRoomArea(t.polygon, [], f.walls) }));
const nr = (L, x, y) => L.find((p) => { let w = false; const q = p.poly; for (let i = 0, j = q.length - 1; i < q.length; j = i++) { if ((q[i].y > y) !== (q[j].y > y) && x < ((q[j].x - q[i].x) * (y - q[i].y)) / (q[j].y - q[i].y) + q[i].x) w = !w; } return w; });

for (const obrot of [0, 17]) test(`skan 3% za mały, obrót ${obrot}° — po dopasowaniu metraże jak w rzeczywistości`, () => {
  const prawda = pokoje(mieszkanie(1, obrot)), f = mieszkanie(0.97, obrot), L = pokoje(f);
  const R = (x, y) => { const a = (obrot * Math.PI) / 180; return [x * 0.97 * Math.cos(a) - y * 0.97 * Math.sin(a), x * 0.97 * Math.sin(a) + y * 0.97 * Math.cos(a)]; };
  // pomiary dalmierzem (w świetle, prawdziwe): pokój 400-20/2-12/2 × 300-10-6, korytarz 600-6-10 (do ściany łazienki… i do końca) × 160-6-10
  const pom = [
    { pokoj: nr(L, ...R(200, 150)), a: 384, b: 284 },
    { pokoj: nr(L, ...R(500, 350)), a: 284, b: 184 }, // korytarz: od łazienki do ściany zewn. (200..500 → 300-6-10), szerokość z wnęką 400..660 → 260-6-6? — tu: szerokość w wąskiej części 600-400-6-10
  ];
  const raport = dopasujDoPomiarow(f, L, pom);
  for (const w of raport) for (const o of w.osie) assert.ok(!o.brak, 'pomiar przypisany'), assert.ok(Math.abs(o.po - o.m) < 0.6, `po dopasowaniu ${o.po} ≈ ${o.m}`);
  const po = pokoje(f);
  const pokojPo = nr(po, ...R(200, 150).map((v) => v / 0.97)), pokojPrawda = nr(prawda, ...R(200, 150).map((v) => v / 0.97));
  assert.ok(Math.abs(pokojPo.m - pokojPrawda.m) < 0.02, `pokój ${pokojPo.m} ≈ ${pokojPrawda.m}`);
  const korPo = nr(po, ...R(500, 350).map((v) => v / 0.97)), korPrawda = nr(prawda, ...R(500, 350).map((v) => v / 0.97));
  console.log("pokój", pokojPo.m, pokojPrawda.m, "korytarz", korPo.m, korPrawda.m, "skan", nr(L, ...R(500, 350)).m);
  assert.ok(Math.abs(korPo.m - korPrawda.m) < 0.12, `korytarz z wnęką ${korPo.m} ≈ ${korPrawda.m}`);
  // ściany dalej proste
  const kat = (obrot * Math.PI) / 180;
  for (const w of f.walls) { const a = Math.atan2(w.end.y - w.start.y, w.end.x - w.start.x) - kat; const r = ((a % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2); assert.ok(Math.min(r, Math.PI / 2 - r) < 0.003, 'kąt prosty zachowany'); }
});

test('nazwy: „Pokój 2” ↔ „Pokój” tylko gdy jednoznacznie', () => {
  const k = [{ nazwa: 'Pokój' }, { nazwa: 'Łazienka' }];
  const w = dopasujNazwy(['Pokój 2', 'Łazienka', ''], k);
  assert.equal(w.length, 2); assert.equal(w.find((x) => x.i === 0).k.nazwa, 'Pokój'); assert.ok(w.find((x) => x.i === 0).przyblizone);
  assert.equal(dopasujNazwy(['Pokój 1', 'Pokój 2'], [{ nazwa: 'Pokój' }]).length, 0);
});

test('karta: dopasowany rzut zapisuje mRzut obok pomiaru, „Pokój 2” nie dubluje „Pokój”', async () => {
  const { scalPomieszczenia } = await import('../js/rzut.js');
  let n = 0; const id = () => 'n' + n++;
  const pom = [{ id: 'a', nazwa: 'Pokój', a: 3.947, b: 2.459, m: 9.71 }, { id: 'b', nazwa: 'Przedpokój', a: 5.231, b: 1.205, m: 6.3 }];
  const r = scalPomieszczenia(pom, [{ nazwa: 'Pokój 2', m: 9.68, dop: true, karta: 'Pokój' }, { nazwa: 'Przedpokój', m: 7.12, dop: true }, { nazwa: 'WC', m: 1.2 }], id);
  assert.equal(r.pom.length, 3, 'bez duplikatu');
  const p = r.pom.find((x) => x.id === 'a'); assert.equal(p.m, 9.71); assert.equal(p.a, 3.947); assert.equal(p.mRzut, 9.68);
  assert.equal(r.pom.find((x) => x.id === 'b').mRzut, 7.12);
  // niedopasowany rzut nie zostawia starego mRzut
  const r2 = scalPomieszczenia(r.pom, [{ nazwa: 'Pokój', m: 9.1, dop: false }], id);
  assert.equal(r2.pom.find((x) => x.id === 'a').mRzut, undefined);
  // bez karty w wyniku i z niejednoznacznym numerem — nowe pomieszczenie
  const r3 = scalPomieszczenia([{ id: 'a', nazwa: 'Pokój', a: 3, b: 3, m: 9 }], [{ nazwa: 'Pokój 1', m: 9 }, { nazwa: 'Pokój 2', m: 8 }], id);
  assert.equal(r3.pom.length, 3);
});
