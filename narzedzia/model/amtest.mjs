import fs from 'fs'; import * as AM from '../../js/obrobkaAM.js'; import * as S from '../../js/obrobkaSiec.js';
const wagi = S.wczytajWagi(JSON.parse(fs.readFileSync(new URL('../../modele/am1.json', import.meta.url))), fs.readFileSync(new URL('../../modele/am1.bin', import.meta.url)).buffer.slice(0));
const [raw, w, h, out, jas] = process.argv.slice(2);
const org = { data: new Uint8ClampedArray(fs.readFileSync(raw)), width: +w, height: +h };
let t = Date.now(); const p = AM.przygotujAM(wagi, org); const t1 = Date.now() - t;
t = Date.now(); const ex = {}; if (process.env.NAS) ex.nasycenie = +process.env.NAS; if (process.env.ZYW) ex.zywosc = +process.env.ZYW; const r = AM.nalozAM(org, p.pre, p, { jasnosc: +(jas || 0), ...ex }); const t2 = Date.now() - t;
fs.writeFileSync(out, r.data); console.error(`przygotuj ${t1} ms, naloz+wykoncz ${t2} ms`);
