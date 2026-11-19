// Edytor uczciwej korekty zdjęcia: jasność, cienie, balans bieli, prostowanie, piony, kadr.
// otworzEdytor({ blob, par, tytul, maOryginal, ik }) → Promise<{ par, blob, w, h } | { przywroc: true } | null>
import * as KZ from './korekta.js';

const PODGLAD = 1000; // dłuższy bok podglądu
const SUWAKI = [
  { g: 'Światło' },
  { k: 'ev', n: 'Jasność', min: -1.5, max: 1.5, krok: 0.05, pok: (v) => znak(v, 1) },
  { k: 'cienie', n: 'Cienie', min: 0, max: 1, krok: 0.05, pok: (v) => `${Math.round(v * 100)}%` },
  { g: 'Kolor (balans bieli)' },
  { k: 'temp', n: 'Temperatura', min: -1, max: 1, krok: 0.02, pok: (v) => (Math.abs(v) < 0.01 ? '0' : `${v > 0 ? 'cieplej' : 'chłodniej'} ${Math.round(Math.abs(v) * 100)}`) },
  { k: 'odcien', n: 'Odcień', min: -1, max: 1, krok: 0.02, pok: (v) => (Math.abs(v) < 0.01 ? '0' : `${v > 0 ? 'róż' : 'zieleń'} ${Math.round(Math.abs(v) * 100)}`) },
  { g: 'Piony' },
  { k: 'obrot', n: 'Prostowanie', min: -10, max: 10, krok: 0.1, pok: (v) => `${znak(v, 1)}°`, siatka: true },
  { k: 'piony', n: 'Zbieżność pionów', min: -0.4, max: 0.4, krok: 0.005, pok: (v) => znak(v * 250, 0), siatka: true },
  { g: 'Kadr' },
  { k: 'zoom', n: 'Przybliżenie', min: 0.5, max: 1, krok: 0.01, odwr: true, pok: (v) => `${Math.round((1 / v) * 100)}%` },
];
function znak(v, m) { const t = Math.abs(v).toFixed(m).replace('.', ','); return Math.abs(v) < 0.5 * 10 ** -m ? '0' : `${v > 0 ? '+' : '−'}${t}`; }

async function rozkoduj(blob, maks) {
  let zr;
  try { zr = await createImageBitmap(blob); } catch {
    zr = await new Promise((ok, zle) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => zle(new Error('Nie mogę odczytać zdjęcia.')); i.src = URL.createObjectURL(blob); });
  }
  const W = zr.width || zr.naturalWidth, H = zr.height || zr.naturalHeight;
  const sk = Math.min(1, maks / Math.max(W, H));
  const w = Math.max(1, Math.round(W * sk)), h = Math.max(1, Math.round(H * sk));
  // zmniejszanie po połowie — Safari przy dużym kroku gubi piksele i krawędzie robią się schodkowe
  let zr2 = zr, cw = W, ch = H;
  while (cw / 2 >= w * 1.05) {
    const t = document.createElement('canvas'); t.width = Math.round(cw / 2); t.height = Math.round(ch / 2);
    const tg = t.getContext('2d'); tg.imageSmoothingQuality = 'high'; tg.drawImage(zr2, 0, 0, t.width, t.height);
    if (zr2 !== zr) zr2.width = zr2.height = 0;
    zr2 = t; cw = t.width; ch = t.height;
  }
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true }); g.imageSmoothingQuality = 'high'; g.drawImage(zr2, 0, 0, w, h);
  if (zr2 !== zr) zr2.width = zr2.height = 0;
  zr.close?.();
  const d = g.getImageData(0, 0, w, h);
  c.width = c.height = 0;
  return { data: d.data, width: w, height: h };
}
// obróbka pełnego zdjęcia → JPEG
export async function obrobPelne(blob, par) {
  const pel = await rozkoduj(blob, 2560);
  const [w, h] = KZ.rozmiarWyniku(pel.width, pel.height, par, 2560);
  const wyn = KZ.obrob(pel, par, w, h);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  c.getContext('2d').putImageData(new ImageData(wyn.data, w, h), 0, 0);
  const out = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.9));
  c.width = c.height = 0;
  if (!out) throw new Error('Nie udało się zapisać zdjęcia.');
  return { blob: out, w, h };
}
// ustawienia automatyczne dla zdjęcia (bez okna)
export async function autoDlaBloba(blob) {
  const maly = await rozkoduj(blob, 520);
  return KZ.analiza(maly);
}

export function otworzEdytor({ blob, par, tytul = '', maOryginal = false, ik = () => '' }) {
  return new Promise((zwroc) => {
    let p = KZ.normuj(par), prev = null, maly = null, porownaj = false, koniec = false, plan = 0;
    const el = document.createElement('div');
    el.className = 'edytor-zdj';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Popraw zdjęcie');
    el.innerHTML = `<div class="ez-gora">
        <button class="okragly" data-ez="anuluj" aria-label="Zamknij bez zapisu">${ik('x')}</button>
        <div class="ez-tytul"><h2>Popraw zdjęcie</h2>${tytul ? `<span>${tytul.replace(/[<>&"]/g, '')}</span>` : ''}</div>
        <button class="btn zloty maly" data-ez="zapisz" disabled>${ik('ok')}Zapisz</button></div>
      <div class="ez-obraz"><div class="ez-ramka"><canvas aria-label="Podgląd zdjęcia"></canvas></div><p class="ez-stan">Wczytuję zdjęcie…</p></div>
      <div class="ez-panel szklo">
        <div class="ez-przyciski">
          <button class="btn zloty maly" data-ez="auto" disabled>${ik('wiz')}Automatycznie</button>
          <button class="btn kontur maly" data-ez="przed" disabled aria-label="Przytrzymaj, żeby zobaczyć przed korektą">Przed</button>
          <button class="btn kontur maly" data-ez="zeruj" disabled>Wyzeruj</button>
        </div>
        ${SUWAKI.map((s) => (s.g ? `<h3 class="ez-grupa">${s.g}</h3>` : `<label class="ez-suwak" data-k="${s.k}"><span class="ez-et"><span>${s.n}</span><b data-wart="${s.k}"></b></span>
          <input type="range" data-s="${s.k}" min="${s.odwr ? 1 / s.max - 1 : s.min}" max="${s.odwr ? 1 / s.min - 1 : s.max}" step="${s.odwr ? 0.02 : s.krok}" ${s.siatka ? 'data-siatka' : ''}></label>`)).join('')}
        <div class="ez-proporcje" role="group" aria-label="Proporcje kadru">${Object.entries(KZ.PROPORCJE).map(([k, n]) => `<button class="pig" data-prop="${k}">${n}</button>`).join('')}</div>
        <p class="ez-wsk">Przesuń palcem po zdjęciu, żeby ustawić kadr. Dwukrotne stuknięcie w nazwę suwaka — powrót do zera.</p>
        ${maOryginal ? `<button class="btn kontur ez-oryg" data-ez="oryginal">${ik('wstecz')}Przywróć oryginał</button>` : ''}
        <p class="ez-info">${ik('tarcza')}<span>Bez retuszu: tylko jasność, kolor, piony i kadr całego zdjęcia. Oryginał zostaje na serwerze — zawsze możesz do niego wrócić.</span></p>
      </div>`;
    document.body.appendChild(el);
    const cv = el.querySelector('canvas'), ramka = el.querySelector('.ez-ramka'), obraz = el.querySelector('.ez-obraz'), stan = el.querySelector('.ez-stan');
    const g = cv.getContext('2d');

    const zamknij = (w) => { if (koniec) return; koniec = true; removeEventListener('resize', rysuj); removeEventListener('keydown', klawisz); el.remove(); zwroc(w); };
    const klawisz = (e) => { if (e.key === 'Escape') zamknij(null); };
    addEventListener('keydown', klawisz);
    addEventListener('resize', rysuj);

    function ustawSuwaki() {
      for (const s of SUWAKI) {
        if (!s.k) continue;
        const inp = el.querySelector(`[data-s="${s.k}"]`);
        if (document.activeElement !== inp) inp.value = s.odwr ? 1 / p[s.k] - 1 : p[s.k];
        el.querySelector(`[data-wart="${s.k}"]`).textContent = s.pok(p[s.k]);
        el.querySelector(`.ez-suwak[data-k="${s.k}"]`).classList.toggle('zmieniony', Math.abs(p[s.k] - KZ.DOMYSLNE[s.k]) > 1e-4);
      }
      el.querySelectorAll('[data-prop]').forEach((b) => b.classList.toggle('akt', b.dataset.prop === p.proporcje));
    }
    function dopasuj(w, h) {
      const mw = obraz.clientWidth - 20, mh = obraz.clientHeight - 20;
      const sk = Math.min(mw / w, mh / h);
      ramka.style.width = `${Math.max(10, Math.floor(w * sk))}px`; ramka.style.height = `${Math.max(10, Math.floor(h * sk))}px`;
    }
    function rysuj() {
      if (!prev || plan) return;
      plan = requestAnimationFrame(() => {
        plan = 0;
        if (koniec) return;
        let wyn;
        if (porownaj) wyn = prev;
        else { const [w, h] = KZ.rozmiarWyniku(prev.width, prev.height, p, PODGLAD); wyn = KZ.obrob(prev, p, w, h); }
        if (cv.width !== wyn.width || cv.height !== wyn.height) { cv.width = wyn.width; cv.height = wyn.height; }
        g.putImageData(new ImageData(wyn.data, wyn.width, wyn.height), 0, 0);
        dopasuj(wyn.width, wyn.height);
        const opis = KZ.opisKorekty(p);
        stan.textContent = porownaj ? 'Przed korektą' : opis ? `Poprawione: ${opis}` : 'Bez zmian';
      });
    }
    const zmien = (zm) => {
      p = KZ.normuj({ ...p, ...zm });
      // przesunięcie kadru przycięte do krawędzi — zapamiętujemy przycięte
      const k = KZ.kadr(prev.width, prev.height, p); p.px = k.px; p.py = k.py;
      ustawSuwaki(); rysuj();
    };

    el.addEventListener('input', (e) => {
      const s = SUWAKI.find((x) => x.k === e.target.dataset.s);
      if (!s || !prev) return;
      const v = Number(e.target.value);
      zmien({ [s.k]: s.odwr ? 1 / (v + 1) : v });
    });
    // siatka przy prostowaniu i kadrowaniu
    const siatka = (on) => ramka.classList.toggle('siatka', on);
    el.addEventListener('pointerdown', (e) => { if (e.target.matches('[data-siatka]')) siatka(true); });
    el.addEventListener('pointerup', () => { if (!przesuw) siatka(false); });
    el.addEventListener('focusin', (e) => { if (e.target.matches('[data-siatka]')) siatka(true); });
    el.addEventListener('focusout', (e) => { if (e.target.matches('[data-siatka]')) siatka(false); });
    el.addEventListener('dblclick', (e) => {
      const l = e.target.closest('.ez-et'); if (!l || !prev) return;
      const k = l.parentElement.dataset.k; zmien({ [k]: KZ.DOMYSLNE[k] });
    });
    el.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-ez], [data-prop]');
      if (!b || b.disabled) return;
      if (b.dataset.prop) { zmien({ proporcje: b.dataset.prop, px: 0, py: 0 }); return; }
      const a = b.dataset.ez;
      if (a === 'anuluj') zamknij(null);
      else if (a === 'zeruj') zmien({ ...KZ.DOMYSLNE });
      else if (a === 'oryginal') zamknij({ przywroc: true });
      else if (a === 'auto') {
        if (!maly) maly = await rozkoduj(blob, 520);
        const auto = KZ.analiza(maly);
        zmien({ ...auto, proporcje: p.proporcje, zoom: p.zoom, px: 0, py: 0 });
      } else if (a === 'zapisz') {
        if (!KZ.zmienia(p)) { zamknij(maOryginal ? { przywroc: true } : null); return; }
        el.querySelectorAll('button, input').forEach((x) => { x.disabled = true; });
        stan.textContent = 'Zapisuję zdjęcie w pełnej rozdzielczości…';
        await new Promise((r) => setTimeout(r, 30));
        try { const w = await obrobPelne(blob, p); zamknij({ par: p, ...w }); }
        catch (er) { stan.textContent = er.message || 'Nie udało się zapisać.'; el.querySelectorAll('button, input').forEach((x) => { x.disabled = false; }); }
      }
    });
    // „Przed” — przytrzymaj
    const przed = el.querySelector('[data-ez=przed]');
    const pokazPrzed = (on) => { porownaj = on; przed.classList.toggle('akt', on); rysuj(); };
    przed.addEventListener('pointerdown', (e) => { e.preventDefault(); pokazPrzed(true); });
    for (const t of ['pointerup', 'pointerleave', 'pointercancel']) przed.addEventListener(t, () => { if (porownaj) pokazPrzed(false); });
    przed.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') pokazPrzed(true); });
    przed.addEventListener('keyup', () => pokazPrzed(false));
    // przesuwanie kadru palcem / myszą
    let przesuw = null;
    cv.addEventListener('pointerdown', (e) => { if (!prev) return; przesuw = { x: e.clientX, y: e.clientY, px: p.px, py: p.py }; cv.setPointerCapture?.(e.pointerId); siatka(true); });
    cv.addEventListener('pointermove', (e) => {
      if (!przesuw) return;
      const k = KZ.kadr(prev.width, prev.height, p), sz = ramka.clientWidth || 1;
      const naPiksel = k.w / sz; // płaszczyzna zdjęcia na piksel ekranu
      p = KZ.normuj({ ...p, px: przesuw.px - ((e.clientX - przesuw.x) * naPiksel) / prev.width, py: przesuw.py - ((e.clientY - przesuw.y) * naPiksel) / prev.height });
      const k2 = KZ.kadr(prev.width, prev.height, p); p.px = k2.px; p.py = k2.py;
      ustawSuwaki(); rysuj();
    });
    const koniecPrzesuwu = () => { if (przesuw) { przesuw = null; siatka(false); } };
    cv.addEventListener('pointerup', koniecPrzesuwu); cv.addEventListener('pointercancel', koniecPrzesuwu);

    ustawSuwaki();
    rozkoduj(blob, PODGLAD).then((src) => {
      if (koniec) return;
      prev = src;
      el.querySelectorAll('[data-ez]').forEach((x) => { x.disabled = false; });
      el.classList.add('gotowy');
      zmien({});
    }).catch((er) => { stan.textContent = er.message || 'Nie mogę odczytać zdjęcia.'; });
  });
}
