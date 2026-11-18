// AM Oferty — serwer. Bez zewnętrznych bibliotek: node:http, node:sqlite, node:crypto.
// Konta wspólników, oferty (karta nieruchomości), historia zmian pól, zdjęcia, synchronizacja na żywo (SSE),
// powiadomienia Web Push, kopie bazy co godzinę.
// Uruchomienie: PORT=18930 AM_DANE=/var/lib/amoferty node amoferty.mjs
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

export const WERSJA = '1.5.1';
const PORT = Number(process.env.PORT || 18930);
const DANE = process.env.AM_DANE || './dane';
const ORIGINS = (process.env.AM_ORIGINS || 'https://lewym90.github.io,http://localhost:8766,http://127.0.0.1:8766').split(',');
const MB = 1024 ** 2, GB = 1024 ** 3;
const MAX_ZDJECIE = 25 * MB;
const MAX_PLIK = 30 * MB;
const MIN_WOLNE = Number(process.env.AM_MIN_WOLNE || 3 * GB);
const MAX_JSON = 4 * MB;

const P_ZDJ = path.join(DANE, 'zdjecia');
const P_KOPIE = path.join(DANE, 'kopie');
const P_PLIKI = path.join(DANE, 'pliki');
const P_KOSZ = path.join(DANE, 'kosz');
const KOSZ_DNI = 30;
for (const d of [DANE, P_ZDJ, P_KOPIE, P_PLIKI, P_KOSZ]) fs.mkdirSync(d, { recursive: true });

export const db = new DatabaseSync(path.join(DANE, 'amoferty.db'));
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA busy_timeout = 4000;
  CREATE TABLE IF NOT EXISTS ustawienia (klucz TEXT PRIMARY KEY, wartosc TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS konta (id INTEGER PRIMARY KEY, login TEXT NOT NULL UNIQUE, nazwa TEXT NOT NULL, haslo TEXT NOT NULL,
    telefon TEXT NOT NULL DEFAULT '', utworzone INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS urzadzenia (id INTEGER PRIMARY KEY, token TEXT NOT NULL UNIQUE, konto INTEGER NOT NULL, nazwa TEXT NOT NULL,
    utworzone INTEGER NOT NULL, ostatnio INTEGER NOT NULL, push TEXT);
  CREATE TABLE IF NOT EXISTS oferty (id TEXT PRIMARY KEY, dane TEXT NOT NULL, seq INTEGER NOT NULL, utworzona INTEGER NOT NULL,
    zmieniona INTEGER NOT NULL, kto INTEGER, usunieta INTEGER NOT NULL DEFAULT 0);
  CREATE INDEX IF NOT EXISTS oferty_seq ON oferty(seq);
  CREATE TABLE IF NOT EXISTS historia (id INTEGER PRIMARY KEY, oferta TEXT NOT NULL, pole TEXT NOT NULL, stara TEXT, nowa TEXT,
    kto INTEGER, kiedy INTEGER NOT NULL);
  CREATE INDEX IF NOT EXISTS historia_oferta ON historia(oferta, kiedy);
  CREATE TABLE IF NOT EXISTS zdjecia (id TEXT PRIMARY KEY, oferta TEXT NOT NULL, rozmiar INTEGER NOT NULL DEFAULT 0, mini INTEGER NOT NULL DEFAULT 0,
    pelne INTEGER NOT NULL DEFAULT 0, kto INTEGER, utworzone INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS przyjete (cid TEXT PRIMARY KEY, kiedy INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS pliki (id TEXT PRIMARY KEY, oferta TEXT NOT NULL, typ TEXT NOT NULL, nazwa TEXT NOT NULL DEFAULT '', rozmiar INTEGER NOT NULL,
    kto INTEGER, utworzone INTEGER NOT NULL);
`);
// 1.1.0: zdjęcie średnie (karty i nagłówek oferty)
try { db.exec('ALTER TABLE zdjecia ADD COLUMN sr INTEGER NOT NULL DEFAULT 0'); } catch { /* już jest */ }

const teraz = () => Date.now();
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const losowe = (n = 24) => crypto.randomBytes(n).toString('base64url');
const ust = (k) => db.prepare('SELECT wartosc FROM ustawienia WHERE klucz = ?').get(k)?.wartosc ?? null;
const ustaw = (k, v) => db.prepare('INSERT INTO ustawienia (klucz, wartosc) VALUES (?, ?) ON CONFLICT(klucz) DO UPDATE SET wartosc = excluded.wartosc').run(k, String(v));
function nastepnySeq() { const s = Number(ust('seq') || 0) + 1; ustaw('seq', s); return s; }

// ---------- linki do dokumentów ----------
// Dokument otwiera się w przeglądarce telefonu (PDF), więc link nie może wymagać nagłówka Authorization.
// Klucz jest podpisany, związany z urządzeniem i ważny 24 h; wylogowanie urządzenia go unieważnia.
if (!ust('sekret_plikow')) ustaw('sekret_plikow', crypto.randomBytes(32).toString('base64'));
const SEKRET_PLIKOW = Buffer.from(ust('sekret_plikow'), 'base64');
const podpis = (t) => crypto.createHmac('sha256', SEKRET_PLIKOW).update(t).digest('base64url').slice(0, 32);
export function kluczPlikow(devId, waznosc = 24 * 3600e3) { const t = `${devId}.${teraz() + waznosc}`; return { k: `${t}.${podpis(t)}`, do: teraz() + waznosc }; }
function sprawdzKluczPlikow(k) {
  const [d, e, sig] = String(k || '').split('.');
  if (!d || !e || !sig) return false;
  const t = `${d}.${e}`, ok = podpis(t);
  if (sig.length !== ok.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(ok))) return false;
  if (Number(e) < teraz()) return false;
  return !!db.prepare('SELECT 1 FROM urzadzenia WHERE id = ?').get(Number(d));
}
const TYPY_PLIKOW = { pdf: 'application/pdf', jpg: 'image/jpeg', png: 'image/png', json: 'application/json' };
function typPliku(b) {
  if (b.length > 4 && b.subarray(0, 4).toString('latin1') === '%PDF') return 'pdf';
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8) return 'jpg';
  if (b.length > 8 && b.readUInt32BE(0) === 0x89504e47) return 'png';
  // plan rzutu z edytora (JSON) — musi się dać sparsować
  if (b.length > 1 && b[0] === 0x7b) { try { JSON.parse(b.toString('utf8')); return 'json'; } catch { return null; } }
  return null;
}

// ---------- hasła (scrypt) ----------
export function hashHasla(haslo) {
  const sol = crypto.randomBytes(16);
  const h = crypto.scryptSync(String(haslo), sol, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${sol.toString('base64')}$${h.toString('base64')}`;
}
function sprawdzHaslo(haslo, zapis) {
  const [alg, s, h] = String(zapis || '').split('$');
  if (alg !== 'scrypt' || !s || !h) return false;
  const oczek = Buffer.from(h, 'base64');
  const got = crypto.scryptSync(String(haslo), Buffer.from(s, 'base64'), oczek.length, { N: 16384, r: 8, p: 1 });
  return crypto.timingSafeEqual(oczek, got);
}
export function zapiszKonto(login, nazwa, haslo, telefon = '') {
  login = String(login || '').trim().toLowerCase();
  if (!/^[a-z0-9._-]{2,30}$/.test(login)) throw new Error('Login: 2–30 znaków, małe litery, cyfry, kropka, myślnik.');
  if (String(haslo || '').length < 6) throw new Error('Hasło musi mieć co najmniej 6 znaków.');
  const ist = db.prepare('SELECT id FROM konta WHERE login = ?').get(login);
  if (ist) {
    db.prepare('UPDATE konta SET haslo = ?, nazwa = ?, telefon = ? WHERE id = ?').run(hashHasla(haslo), nazwa || login, telefon, ist.id);
    db.prepare('DELETE FROM urzadzenia WHERE konto = ?').run(ist.id);
    return { id: ist.id, nowe: false };
  }
  const r = db.prepare('INSERT INTO konta (login, nazwa, haslo, telefon, utworzone) VALUES (?, ?, ?, ?, ?)').run(login, nazwa || login, hashHasla(haslo), telefon, teraz());
  return { id: Number(r.lastInsertRowid), nowe: true };
}

// ---------- Web Push (VAPID + aes128gcm) bez bibliotek ----------
if (!ust('vapid_priv')) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  ustaw('vapid_priv', privateKey.export({ format: 'pem', type: 'pkcs8' }));
  ustaw('vapid_pub', publicKey.export({ format: 'der', type: 'spki' }).subarray(-65).toString('base64url'));
}
const VAPID_PRIV = crypto.createPrivateKey(ust('vapid_priv'));
export const VAPID_PUB = ust('vapid_pub');
const hmac = (k, d) => crypto.createHmac('sha256', k).update(d).digest();
export function szyfrujPush(dane, p256dh, auth) {
  const ua = Buffer.from(p256dh, 'base64url');
  const sekretAuth = Buffer.from(auth, 'base64url');
  const ecdh = crypto.createECDH('prime256v1');
  const asPub = ecdh.generateKeys();
  const wspolny = ecdh.computeSecret(ua);
  const ikm = hmac(hmac(sekretAuth, wspolny), Buffer.concat([Buffer.from('WebPush: info\0'), ua, asPub, Buffer.from([1])]));
  const sol = crypto.randomBytes(16);
  const prk = hmac(sol, ikm);
  const cek = hmac(prk, Buffer.from('Content-Encoding: aes128gcm\0\x01')).subarray(0, 16);
  const nonce = hmac(prk, Buffer.from('Content-Encoding: nonce\0\x01')).subarray(0, 12);
  const c = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const zaszyfr = Buffer.concat([c.update(Buffer.concat([Buffer.from(dane), Buffer.from([2])])), c.final(), c.getAuthTag()]);
  const rs = Buffer.alloc(4); rs.writeUInt32BE(4096);
  return Buffer.concat([sol, rs, Buffer.from([asPub.length]), asPub, zaszyfr]);
}
function jwtVapid(aud) {
  const b = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const tresc = `${b({ typ: 'JWT', alg: 'ES256' })}.${b({ aud, exp: Math.floor(teraz() / 1000) + 12 * 3600, sub: 'mailto:amoferty@localhost' })}`;
  const sig = crypto.sign('sha256', Buffer.from(tresc), { key: VAPID_PRIV, dsaEncoding: 'ieee-p1363' });
  return `${tresc}.${sig.toString('base64url')}`;
}
async function wyslijPush(dev, dane) {
  let sub; try { sub = JSON.parse(dev.push); } catch { return; }
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return;
  try {
    const u = new URL(sub.endpoint);
    if (u.protocol !== 'https:') return;
    const r = await fetch(sub.endpoint, {
      method: 'POST', signal: AbortSignal.timeout(10000),
      headers: { Authorization: `vapid t=${jwtVapid(u.origin)}, k=${VAPID_PUB}`, 'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream', TTL: '86400', Urgency: 'normal' },
      body: szyfrujPush(JSON.stringify(dane), sub.keys.p256dh, sub.keys.auth),
    });
    if (r.status === 404 || r.status === 410) db.prepare('UPDATE urzadzenia SET push = NULL WHERE id = ?').run(dev.id);
  } catch { /* sieć — następnym razem */ }
}
// powiadamia urządzenia INNYCH kont (wspólnika), nie autora zmiany
export const wyslanePush = [];
function powiadomInnych(konto, dane) {
  const devs = db.prepare('SELECT * FROM urzadzenia WHERE konto != ? AND push IS NOT NULL').all(konto);
  for (const d of devs) { wyslanePush.push({ dev: d.id, dane }); if (wyslanePush.length > 50) wyslanePush.shift(); wyslijPush(d, dane); }
}

// ---------- pomocnicze ----------
function ipKlienta(req) {
  const xf = String(req.headers['x-forwarded-for'] || '').split(',').map((s) => s.trim()).filter(Boolean);
  return xf.length ? xf[xf.length - 1] : req.socket.remoteAddress || '?';
}
const proby = new Map();
const OKNO = 15 * 60e3, MAX_PROB = 8;
function zablokowany(ip) {
  const p = proby.get(ip); if (!p) return 0;
  if (teraz() - p.t > OKNO) { proby.delete(ip); return 0; }
  return p.n >= MAX_PROB ? Math.ceil((OKNO - (teraz() - p.t)) / 60e3) : 0;
}
function nieudana(ip) { const p = proby.get(ip); if (!p || teraz() - p.t > OKNO) proby.set(ip, { n: 1, t: teraz() }); else p.n++; }
function urzadzenieZTokenu(t) {
  if (!t) return null;
  const d = db.prepare('SELECT u.*, k.nazwa AS konto_nazwa, k.login FROM urzadzenia u JOIN konta k ON k.id = u.konto WHERE u.token = ?').get(sha(String(t)));
  if (d && teraz() - d.ostatnio > 60e3) { db.prepare('UPDATE urzadzenia SET ostatnio = ? WHERE id = ?').run(teraz(), d.id); d.ostatnio = teraz(); }
  return d || null;
}
const czysty = (s, dl = 60) => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, dl);
const okId = (s) => typeof s === 'string' && /^[A-Za-z0-9_-]{6,40}$/.test(s);
function wolneNaDysku() { try { const s = fs.statfsSync(DANE); return s.bavail * s.bsize; } catch { return Infinity; } }

function cors(req) {
  const o = req.headers.origin;
  const h = { 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400', 'Access-Control-Expose-Headers': 'X-Nazwa', Vary: 'Origin' };
  if (o && ORIGINS.includes(o)) h['Access-Control-Allow-Origin'] = o;
  return h;
}
function json(res, nag, kod, obj) {
  res.writeHead(kod, { ...nag, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}
function cialo(req, max) {
  return new Promise((ok, zle) => {
    const cz = []; let n = 0;
    req.on('data', (c) => { n += c.length; if (n > max) { zle(Object.assign(new Error('Za duże dane.'), { kod: 413 })); req.destroy(); } else cz.push(c); });
    req.on('end', () => ok(Buffer.concat(cz)));
    req.on('error', zle);
  });
}
async function cialoJson(req) {
  const b = await cialo(req, MAX_JSON);
  try { return JSON.parse(b.toString('utf8') || '{}'); } catch { throw Object.assign(new Error('Błędny JSON.'), { kod: 400 }); }
}

// ---------- na żywo (SSE) ----------
const sluchacze = new Set();
function rozglos(seq) {
  for (const s of sluchacze) { try { s.write(`event: seq\ndata: ${seq}\n\n`); } catch { /* zamknięty */ } }
}
setInterval(() => { for (const s of sluchacze) { try { s.write(': ping\n\n'); } catch { /* */ } } }, 25e3).unref();

// ---------- logika ofert ----------
const POLA_ZAKAZANE = new Set(['__proto__', 'constructor', 'prototype']);
export function zastosujZmiany(konto, zmiany) {
  if (!Array.isArray(zmiany)) throw Object.assign(new Error('Brak listy zmian.'), { kod: 400 });
  const wyniki = [];
  const statusy = [];
  db.exec('BEGIN');
  try {
    for (const z of zmiany.slice(0, 500)) {
      if (!z || !okId(z.oid) || typeof z.cid !== 'string' || z.cid.length > 60) { wyniki.push({ cid: z?.cid, ok: false, blad: 'Błędna zmiana.' }); continue; }
      if (db.prepare('SELECT 1 FROM przyjete WHERE cid = ?').get(z.cid)) { wyniki.push({ cid: z.cid, ok: true, juz: true }); continue; }
      const ist = db.prepare('SELECT * FROM oferty WHERE id = ?').get(z.oid);
      const t = teraz();
      const dane = ist ? JSON.parse(ist.dane) : {};
      let zmienione = 0;
      if (z.usun) {
        if (ist && !ist.usunieta) {
          const seq = nastepnySeq();
          db.prepare('UPDATE oferty SET usunieta = 1, seq = ?, zmieniona = ?, kto = ? WHERE id = ?').run(seq, t, konto, z.oid);
          db.prepare('INSERT INTO historia (oferta, pole, stara, nowa, kto, kiedy) VALUES (?, ?, ?, ?, ?, ?)').run(z.oid, '_usunieta', null, 'tak', konto, t);
          zmienione = 1;
        }
      } else {
        const pola = z.pola && typeof z.pola === 'object' ? z.pola : {};
        for (const [k, v] of Object.entries(pola)) {
          if (POLA_ZAKAZANE.has(k) || k.length > 60) continue;
          const stara = dane[k] === undefined ? null : JSON.stringify(dane[k]);
          const nowa = v === null || v === undefined ? null : JSON.stringify(v);
          if (stara === nowa) continue;
          if (nowa === null) delete dane[k]; else dane[k] = v;
          db.prepare('INSERT INTO historia (oferta, pole, stara, nowa, kto, kiedy) VALUES (?, ?, ?, ?, ?, ?)').run(z.oid, k, stara, nowa, konto, t);
          if (k === 'status') statusy.push({ oid: z.oid, status: v, tytul: dane.roboczy || dane.ulica || 'oferta' });
          if (k.startsWith('wz_') && stara === null && v && typeof v === 'object') statusy.push({ oid: z.oid, wizyta: String(v.kiedy || ''), tytul: dane.roboczy || dane.ulica || 'oferta' });
          zmienione++;
        }
        if (!ist) {
          const seq = nastepnySeq();
          db.prepare('INSERT INTO oferty (id, dane, seq, utworzona, zmieniona, kto) VALUES (?, ?, ?, ?, ?, ?)').run(z.oid, JSON.stringify(dane), seq, t, t, konto);
          statusy.push({ oid: z.oid, nowa: true, tytul: dane.roboczy || 'nowa oferta' });
        } else if (zmienione || ist.usunieta) {
          const seq = nastepnySeq();
          db.prepare('UPDATE oferty SET dane = ?, seq = ?, zmieniona = ?, kto = ?, usunieta = 0 WHERE id = ?').run(JSON.stringify(dane), seq, t, konto, z.oid);
        }
      }
      db.prepare('INSERT INTO przyjete (cid, kiedy) VALUES (?, ?)').run(z.cid, t);
      wyniki.push({ cid: z.cid, ok: true, zmienione });
    }
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  rozglos(Number(ust('seq') || 0));
  const nazwa = db.prepare('SELECT nazwa FROM konta WHERE id = ?').get(konto)?.nazwa || 'Wspólnik';
  for (const s of statusy) {
    if (s.wizyta !== undefined) {
      const m = s.wizyta.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
      const kiedy = m ? ` — ${m[3]}.${m[2]}${m[4] ? `, ${m[4]}:${m[5]}` : ''}` : '';
      powiadomInnych(konto, { tytul: 'Nowa prezentacja', tresc: `${nazwa}: ${s.tytul}${kiedy}`, oid: s.oid, ekran: 'wizyty' });
      continue;
    }
    powiadomInnych(konto, s.nowa
      ? { tytul: 'Nowa oferta', tresc: `${nazwa} dodał(a): ${s.tytul}`, oid: s.oid }
      : { tytul: 'Zmiana statusu', tresc: `${nazwa}: ${s.tytul} → ${s.status}`, oid: s.oid });
  }
  return { seq: Number(ust('seq') || 0), wyniki };
}
export function zmianyOd(od) {
  const rows = db.prepare('SELECT id, dane, seq, utworzona, zmieniona, kto, usunieta FROM oferty WHERE seq > ? ORDER BY seq').all(Number(od) || 0);
  return { seq: Number(ust('seq') || 0), oferty: rows.map((r) => ({ id: r.id, dane: r.usunieta ? null : JSON.parse(r.dane), seq: r.seq, utworzona: r.utworzona, zmieniona: r.zmieniona, kto: r.kto, usunieta: !!r.usunieta })) };
}

// ---------- kosz: usunięte zdjęcia i dokumenty czekają 30 dni ----------
function doKosza(plik, rodzaj) {
  if (!fs.existsSync(plik)) return;
  const cel = path.join(P_KOSZ, `${rodzaj}--${path.basename(plik)}`);
  fs.renameSync(plik, cel);
  const t = new Date(); fs.utimesSync(cel, t, t); // data wrzucenia do kosza
}
function oproznijKosz() {
  for (const f of fs.readdirSync(P_KOSZ)) {
    const p = path.join(P_KOSZ, f);
    try { if (teraz() - fs.statSync(p).mtimeMs > KOSZ_DNI * 86400e3) fs.rmSync(p, { force: true }); } catch { /* */ }
  }
}
// przywrócenie z kosza ręcznie: mv kosz/zdjecia--<plik> zdjecia/<plik> (patrz KONTYNUACJA.md)

// ---------- kopia na komputer wspólnika (aplikacja na laptopie ściąga brakujące pliki) ----------
const RE_PLIK_KOPII = /^(zdjecia|pliki)\/[A-Za-z0-9_-]{6,40}(\.(mini|sr))?\.(jpg|pdf|png|json)$/;
export function spisKopii() {
  const pliki = [];
  for (const [kat, P] of [['zdjecia', P_ZDJ], ['pliki', P_PLIKI]]) {
    for (const f of fs.readdirSync(P)) {
      const s = `${kat}/${f}`;
      if (!RE_PLIK_KOPII.test(s)) continue;
      try { pliki.push({ s, r: fs.statSync(path.join(P, f)).size }); } catch { /* */ }
    }
  }
  return pliki;
}
function najnowszaKopiaBazy() {
  kopia();
  const f = fs.readdirSync(P_KOPIE).filter((x) => /^amoferty-\d{10}\.db$/.test(x)).sort().pop();
  return f ? path.join(P_KOPIE, f) : null;
}

// ---------- kopie bazy ----------
export function kopia() {
  const d = new Date();
  const nazwa = `amoferty-${d.toISOString().slice(0, 13).replace(/[-T:]/g, '')}.db`;
  const cel = path.join(P_KOPIE, nazwa);
  if (!fs.existsSync(cel)) db.exec(`VACUUM INTO '${cel.replace(/'/g, "''")}'`);
  // zostaw 48 ostatnich godzinowych + po jednej na dzień przez 60 dni
  const pliki = fs.readdirSync(P_KOPIE).filter((f) => /^amoferty-\d{10}\.db$/.test(f)).sort().reverse();
  const dni = new Set();
  pliki.forEach((f, i) => {
    const dzien = f.slice(9, 17);
    const wiek = (teraz() - Date.UTC(+dzien.slice(0, 4), +dzien.slice(4, 6) - 1, +dzien.slice(6, 8))) / 86400e3;
    if (i < 48) { dni.add(dzien); return; }
    if (!dni.has(dzien) && wiek <= 60) { dni.add(dzien); return; }
    fs.rmSync(path.join(P_KOPIE, f), { force: true });
  });
  db.prepare('DELETE FROM przyjete WHERE kiedy < ?').run(teraz() - 30 * 86400e3);
  oproznijKosz();
}

function wyslijPlik(res, nag, id) {
  const r = db.prepare('SELECT typ, nazwa FROM pliki WHERE id = ?').get(id);
  const plik = r && path.join(P_PLIKI, `${id}.${r.typ}`);
  if (!r || !fs.existsSync(plik)) return json(res, nag, 404, { blad: 'Brak pliku na serwerze.' });
  const st = fs.statSync(plik);
  const nazwa = (r.nazwa || `dokument.${r.typ}`).replace(/["\\\r\n]/g, '');
  res.writeHead(200, { ...nag, 'Content-Type': TYPY_PLIKOW[r.typ], 'Content-Length': st.size, 'Cache-Control': 'private, no-store',
    'Content-Disposition': `inline; filename="${nazwa.replace(/[^\x20-\x7e]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(nazwa)}`,
    'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
  fs.createReadStream(plik).pipe(res);
}

// ---------- serwer ----------
export function utworzSerwer() {
  return http.createServer(async (req, res) => {
    const nag = cors(req);
    if (req.method === 'OPTIONS') { res.writeHead(204, nag); return res.end(); }
    const u = new URL(req.url, 'http://x');
    const p = u.pathname.replace(/\/+$/, '') || '/';
    try {
      if (p === '/zdrowie') {
        return json(res, nag, 200, { ok: true, wersja: WERSJA, konta: db.prepare('SELECT COUNT(*) AS n FROM konta').get().n, vapid: VAPID_PUB });
      }
      if (p === '/logowanie' && req.method === 'POST') {
        const ip = ipKlienta(req);
        const blok = zablokowany(ip);
        if (blok) return json(res, nag, 429, { blad: `Za dużo prób. Spróbuj za ${blok} min.` });
        const b = await cialoJson(req);
        const k = db.prepare('SELECT * FROM konta WHERE login = ?').get(String(b.login || '').trim().toLowerCase());
        if (!k || !sprawdzHaslo(b.haslo, k.haslo)) { nieudana(ip); return json(res, nag, 401, { blad: 'Błędny login lub hasło.' }); }
        proby.delete(ip);
        const token = losowe(32);
        db.prepare('INSERT INTO urzadzenia (token, konto, nazwa, utworzone, ostatnio) VALUES (?, ?, ?, ?, ?)').run(sha(token), k.id, czysty(b.urzadzenie, 40) || 'urządzenie', teraz(), teraz());
        return json(res, nag, 200, { token, konto: { id: k.id, login: k.login, nazwa: k.nazwa, telefon: k.telefon } });
      }

      const mp = p.match(/^\/plik\/([A-Za-z0-9_-]{6,40})$/);
      if (mp && req.method === 'GET' && u.searchParams.get('k')) {
        if (!sprawdzKluczPlikow(u.searchParams.get('k'))) return json(res, nag, 403, { blad: 'Link wygasł. Otwórz dokument jeszcze raz z aplikacji.' });
        return wyslijPlik(res, nag, mp[1]);
      }

      // wszystko dalej wymaga zalogowanego urządzenia
      const auth = String(req.headers.authorization || '');
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : u.searchParams.get('t');
      const dev = urzadzenieZTokenu(token);
      if (!dev) return json(res, nag, 401, { blad: 'Urządzenie nie jest zalogowane.' });

      if (p === '/ja' && req.method === 'GET') {
        const konta = db.prepare('SELECT id, login, nazwa, telefon FROM konta ORDER BY id').all();
        let kopiaKomp = null; try { kopiaKomp = JSON.parse(ust('kopia_komputer') || 'null'); } catch { /* */ }
        return json(res, nag, 200, { konto: konta.find((k) => k.id === dev.konto), konta, urzadzenie: dev.nazwa, push: !!dev.push, vapid: VAPID_PUB, kopia: kopiaKomp });
      }
      if (p === '/ja' && req.method === 'POST') {
        const b = await cialoJson(req);
        const nazwa = czysty(b.nazwa, 60), tel = czysty(b.telefon, 30);
        if (nazwa) db.prepare('UPDATE konta SET nazwa = ? WHERE id = ?').run(nazwa, dev.konto);
        if (b.telefon !== undefined) db.prepare('UPDATE konta SET telefon = ? WHERE id = ?').run(tel, dev.konto);
        return json(res, nag, 200, { ok: true });
      }
      if (p === '/wyloguj' && req.method === 'POST') {
        db.prepare('DELETE FROM urzadzenia WHERE id = ?').run(dev.id);
        return json(res, nag, 200, { ok: true });
      }
      if (p === '/push' && req.method === 'POST') {
        const b = await cialoJson(req);
        const sub = b.sub && b.sub.endpoint ? JSON.stringify({ endpoint: String(b.sub.endpoint), keys: b.sub.keys }) : null;
        db.prepare('UPDATE urzadzenia SET push = ? WHERE id = ?').run(sub, dev.id);
        return json(res, nag, 200, { ok: true, push: !!sub });
      }
      if (p === '/zmiany' && req.method === 'GET') {
        return json(res, nag, 200, zmianyOd(u.searchParams.get('od')));
      }
      if (p === '/zmiany' && req.method === 'POST') {
        const b = await cialoJson(req);
        return json(res, nag, 200, zastosujZmiany(dev.konto, b.zmiany));
      }
      if (p === '/historia' && req.method === 'GET') {
        const oid = u.searchParams.get('oferta');
        if (!okId(oid)) return json(res, nag, 400, { blad: 'Brak oferty.' });
        const rows = db.prepare('SELECT h.pole, h.stara, h.nowa, h.kiedy, k.nazwa AS kto FROM historia h LEFT JOIN konta k ON k.id = h.kto WHERE h.oferta = ? ORDER BY h.kiedy DESC, h.id DESC LIMIT 300').all(oid);
        return json(res, nag, 200, { historia: rows });
      }
      if (p === '/aktywnosc' && req.method === 'GET') {
        // ostatnie zmiany wspólnika (innych kont) we wszystkich ofertach
        const rows = db.prepare(`SELECT h.oferta, h.pole, h.stara, h.nowa, h.kiedy, k.nazwa AS kto, o.dane FROM historia h
          LEFT JOIN konta k ON k.id = h.kto LEFT JOIN oferty o ON o.id = h.oferta
          WHERE h.kto != ? AND h.pole NOT IN ('zr', 'id', 'utworzyl') ORDER BY h.kiedy DESC, h.id DESC LIMIT 120`).all(dev.konto);
        return json(res, nag, 200, { aktywnosc: rows.map((r) => {
          let n = ''; try { const d = JSON.parse(r.dane || '{}'); n = d.roboczy || d.ulica || d.dzielnica || ''; } catch { /* */ }
          return { oferta: r.oferta, nazwa: n, pole: r.pole, stara: r.stara, nowa: r.nowa, kiedy: r.kiedy, kto: r.kto };
        }) });
      }
      if (p === '/na-zywo' && req.method === 'GET') {
        res.writeHead(200, { ...nag, 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
        res.write(`retry: 4000\nevent: seq\ndata: ${Number(ust('seq') || 0)}\n\n`);
        sluchacze.add(res);
        req.on('close', () => sluchacze.delete(res));
        return;
      }
      // zdjęcia: /zdjecie/<id>?oferta=<oid>&rodzaj=pelne|sr|mini
      const mz = p.match(/^\/zdjecie\/([A-Za-z0-9_-]{6,40})$/);
      if (mz) {
        const id = mz[1];
        const rodzaj = ['mini', 'sr'].includes(u.searchParams.get('rodzaj')) ? u.searchParams.get('rodzaj') : 'pelne';
        const plik = path.join(P_ZDJ, `${id}${rodzaj === 'pelne' ? '' : `.${rodzaj}`}.jpg`);
        if (req.method === 'PUT') {
          const oid = u.searchParams.get('oferta');
          if (!okId(oid)) return json(res, nag, 400, { blad: 'Brak oferty.' });
          const dl = Number(req.headers['content-length'] || 0);
          if (dl > MAX_ZDJECIE) return json(res, nag, 413, { blad: 'Zdjęcie jest za duże.' });
          if (wolneNaDysku() < MIN_WOLNE) return json(res, nag, 507, { blad: 'Na serwerze kończy się miejsce. Zdjęcie zostaje na urządzeniu i wyśle się później.' });
          const b = await cialo(req, MAX_ZDJECIE);
          if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return json(res, nag, 415, { blad: 'To nie jest plik JPG.' });
          const tmp = `${plik}.${losowe(6)}.tmp`;
          fs.writeFileSync(tmp, b); fs.renameSync(tmp, plik);
          const ist = db.prepare('SELECT * FROM zdjecia WHERE id = ?').get(id);
          if (!ist) db.prepare(`INSERT INTO zdjecia (id, oferta, rozmiar, ${rodzaj}, kto, utworzone) VALUES (?, ?, ?, 1, ?, ?)`).run(id, oid, rodzaj === 'pelne' ? b.length : 0, dev.konto, teraz());
          else db.prepare(`UPDATE zdjecia SET ${rodzaj} = 1, rozmiar = CASE WHEN ? = 'pelne' THEN ? ELSE rozmiar END WHERE id = ?`).run(rodzaj, b.length, id);
          return json(res, nag, 200, { ok: true, id, rodzaj, rozmiar: b.length });
        }
        if (req.method === 'GET') {
          if (!fs.existsSync(plik)) return json(res, nag, 404, { blad: 'Brak zdjęcia na serwerze.' });
          const st = fs.statSync(plik);
          res.writeHead(200, { ...nag, 'Content-Type': 'image/jpeg', 'Content-Length': st.size, 'Cache-Control': 'private, max-age=31536000, immutable' });
          return fs.createReadStream(plik).pipe(res);
        }
        if (req.method === 'DELETE') {
          for (const f of [`${id}.jpg`, `${id}.sr.jpg`, `${id}.mini.jpg`]) doKosza(path.join(P_ZDJ, f), 'zdjecia');
          db.prepare('DELETE FROM zdjecia WHERE id = ?').run(id);
          return json(res, nag, 200, { ok: true });
        }
      }
      if (p === '/kopia/spis' && req.method === 'GET') {
        const b = najnowszaKopiaBazy();
        return json(res, nag, 200, { pliki: spisKopii(), baza: b ? { nazwa: path.basename(b), r: fs.statSync(b).size } : null });
      }
      if (p === '/kopia/plik' && req.method === 'GET') {
        const sc = String(u.searchParams.get('s') || '');
        if (!RE_PLIK_KOPII.test(sc)) return json(res, nag, 400, { blad: 'Zła ścieżka.' });
        const plik = path.join(DANE, sc);
        if (!fs.existsSync(plik)) return json(res, nag, 404, { blad: 'Brak pliku.' });
        res.writeHead(200, { ...nag, 'Content-Type': 'application/octet-stream', 'Content-Length': fs.statSync(plik).size, 'Cache-Control': 'no-store' });
        return fs.createReadStream(plik).pipe(res);
      }
      if (p === '/kopia/baza' && req.method === 'GET') {
        const b = najnowszaKopiaBazy();
        if (!b) return json(res, nag, 404, { blad: 'Brak kopii bazy.' });
        res.writeHead(200, { ...nag, 'Content-Type': 'application/octet-stream', 'Content-Length': fs.statSync(b).size, 'Cache-Control': 'no-store', 'X-Nazwa': path.basename(b) });
        return fs.createReadStream(b).pipe(res);
      }
      if (p === '/kopia/zrobiona' && req.method === 'POST') {
        const b = await cialoJson(req);
        const zapis = { kiedy: teraz(), kto: dev.konto_nazwa, urzadzenie: dev.nazwa, pliki: Number(b.pliki) || 0, bajty: Number(b.bajty) || 0, nowe: Number(b.nowe) || 0 };
        ustaw('kopia_komputer', JSON.stringify(zapis));
        return json(res, nag, 200, { ok: true, kopia: zapis });
      }
      if (p === '/klucz-plikow' && req.method === 'GET') return json(res, nag, 200, kluczPlikow(dev.id));
      // dokumenty: /plik/<id>?oferta=<oid>&nazwa=<nazwa> — PDF, JPG lub PNG
      if (mp) {
        const id = mp[1];
        if (req.method === 'PUT') {
          const oid = u.searchParams.get('oferta');
          if (!okId(oid)) return json(res, nag, 400, { blad: 'Brak oferty.' });
          if (Number(req.headers['content-length'] || 0) > MAX_PLIK) return json(res, nag, 413, { blad: 'Plik jest za duży (maks. 30 MB).' });
          if (wolneNaDysku() < MIN_WOLNE) return json(res, nag, 507, { blad: 'Na serwerze kończy się miejsce. Plik zostaje na urządzeniu i wyśle się później.' });
          const b = await cialo(req, MAX_PLIK);
          const typ = typPliku(b);
          if (!typ) return json(res, nag, 415, { blad: 'Obsługiwane są pliki PDF, JPG i PNG.' });
          const plik = path.join(P_PLIKI, `${id}.${typ}`);
          const tmp = `${plik}.${losowe(6)}.tmp`;
          fs.writeFileSync(tmp, b); fs.renameSync(tmp, plik);
          db.prepare(`INSERT INTO pliki (id, oferta, typ, nazwa, rozmiar, kto, utworzone) VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET typ = excluded.typ, nazwa = excluded.nazwa, rozmiar = excluded.rozmiar`).run(id, oid, typ, czysty(u.searchParams.get('nazwa'), 120), b.length, dev.konto, teraz());
          return json(res, nag, 200, { ok: true, id, typ, rozmiar: b.length });
        }
        if (req.method === 'GET') return wyslijPlik(res, nag, id);
        if (req.method === 'DELETE') {
          const r = db.prepare('SELECT typ FROM pliki WHERE id = ?').get(id);
          if (r) doKosza(path.join(P_PLIKI, `${id}.${r.typ}`), 'pliki');
          db.prepare('DELETE FROM pliki WHERE id = ?').run(id);
          return json(res, nag, 200, { ok: true });
        }
      }
      if (p === '/miejsce' && req.method === 'GET') {
        const u2 = db.prepare('SELECT COALESCE(SUM(rozmiar),0) AS s, COUNT(*) AS n FROM zdjecia').get();
        const u3 = db.prepare('SELECT COALESCE(SUM(rozmiar),0) AS s, COUNT(*) AS n FROM pliki').get();
        return json(res, nag, 200, { zdjecia: u2.n, bajty: u2.s, dokumenty: u3.n, bajtyDokumentow: u3.s, wolne: wolneNaDysku() });
      }
      return json(res, nag, 404, { blad: 'Nie ma takiego adresu.' });
    } catch (e) {
      return json(res, nag, e.kod || 500, { blad: e.kod ? e.message : 'Błąd serwera.' });
    }
  });
}

// uruchomienie bezpośrednie
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const s = utworzSerwer();
  s.listen(PORT, '127.0.0.1', () => console.log(`AM Oferty ${WERSJA} na 127.0.0.1:${PORT}, dane: ${DANE}`));
  try { kopia(); } catch (e) { console.error('kopia:', e.message); }
  setInterval(() => { try { kopia(); } catch (e) { console.error('kopia:', e.message); } }, 3600e3).unref();
}
