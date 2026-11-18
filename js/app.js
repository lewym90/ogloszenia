// AM Oferty — interfejs.
import * as M from './model.js';
import * as D from './dane.js';
import { zrobZip } from './zip.js';

export const WERSJA = '1.0.1';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const IK = {
  plus: '<path d="M12 5v14M5 12h14"/>', wstecz: '<path d="M15 18l-6-6 6-6"/>', kopiuj: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  gwiazda: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>', kosz: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  lewo: '<path d="M15 18l-6-6 6-6"/>', prawo: '<path d="M9 6l6 6-6 6"/>', aparat: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  ok: '<path d="M5 12.5l4.5 4.5L19 7"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>', uwaga: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17.5v.5"/>',
  zegar: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', pobierz: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  szukaj: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>', dom: '<path d="M3 11l9-7 9 7v9H3z"/><path d="M9 20v-6h6v6"/>',
  ust: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  wiz: '<path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z"/><path d="M18.5 14.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
  wysyla: '<path d="M12 19V7M7 12l5-5 5 5"/>', lista: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
};
const ik = (n, kl = '') => `<svg class="ik ${kl}" viewBox="0 0 24 24" aria-hidden="true">${IK[n]}</svg>`;

// ---------- stan interfejsu ----------
const S = { ekran: 'lista', id: null, tab: 'karta', podglad: 'ogloszenie', q: '', filtr: 'aktywne', pomDodawania: '', postep: '' };
const szeroki = matchMedia('(min-width: 1180px)');
const miniUrl = new Map();
let zbudowany = false;

function toast(t, ms = 2200) {
  const el = $('#toast'); el.textContent = t; el.classList.add('wid');
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('wid'), ms);
}
function trasa() {
  const h = location.hash.replace(/^#\/?/, '').split('/');
  if (h[0] === 'o' && h[1]) { S.ekran = 'oferta'; if (S.id !== h[1]) { S.id = h[1]; resetEdytora(); } S.tab = h[2] || 'karta'; }
  else if (h[0] === 'ustawienia') { S.ekran = 'ustawienia'; S.id = null; resetEdytora(); }
  else { S.ekran = 'lista'; S.id = null; resetEdytora(); }
  if (szeroki.matches && ['ogloszenie', 'kontrola'].includes(S.tab)) { S.podglad = S.tab; S.tab = 'karta'; }
  odswiez();
}
const idzDo = (h) => { if (location.hash !== h) location.hash = h; else trasa(); };
function resetEdytora() { $$('[data-wstaw]').forEach((el) => { el.__html = null; }); const t = $('#ed-tresc'); if (t) { t.__klucz = null; t.scrollTop = 0; } const k = $('.kol-edytor'); if (k) k.scrollTop = 0; }

// wstawia HTML tylko gdy się zmienił i nikt nie pisze w tym fragmencie
function wstaw(el, html) {
  if (!el || el.__html === html) return;
  const a = document.activeElement;
  if (a && a !== document.body && el.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) { el.__czeka = true; return; }
  el.innerHTML = html; el.__html = html; el.__czeka = false;
  wypelnijObrazy(el);
}
function wypelnijObrazy(el) {
  for (const img of $$('img[data-mini]', el)) {
    if (img.getAttribute('src')) continue;
    const id = img.dataset.mini;
    D.urlZdjecia(id, 'mini').then((u) => { if (u) { miniUrl.set(id, u); img.src = u; } });
  }
  for (const d of $$('[data-tlo]', el)) {
    if (d.style.backgroundImage) continue;
    const id = d.dataset.tlo;
    D.urlZdjecia(id, 'mini').then((u) => { if (u) { miniUrl.set(id, u); d.style.backgroundImage = `url("${u}")`; d.innerHTML = ''; } });
  }
}
const imgMini = (id, alt = '') => `<img data-mini="${esc(id)}" alt="${esc(alt)}" ${miniUrl.has(id) ? `src="${miniUrl.get(id)}"` : ''} loading="lazy">`;
const agent = () => ({ firma: D.stan.agent.firma || 'AM Nieruchomości', haslo: D.stan.agent.haslo ?? 'Sprawdzone do końca.', nazwa: D.stan.agent.nazwa || D.stan.konto?.nazwa || '', telefon: D.stan.agent.telefon || D.stan.konto?.telefon || '' });

// ---------- logowanie ----------
function ekranLogowania() {
  zbudowany = false;
  $('#app').innerHTML = `<div class="logowanie"><form id="f-log" autocomplete="on">
    <img class="znak" src="ikony/icon-192.png" alt="">
    <h1>AM Oferty</h1>
    <p>Karta nieruchomości i ogłoszenia</p>
    <div class="pole"><label class="et" for="l-login">Login</label><div class="wejscie"><input id="l-login" name="username" autocomplete="username" autocapitalize="none" autocorrect="off" required></div></div>
    <div class="pole"><label class="et" for="l-haslo">Hasło</label><div class="wejscie"><input id="l-haslo" name="password" type="password" autocomplete="current-password" required></div></div>
    <button class="btn zloty" type="submit">Zaloguj</button>
    <div class="blad" id="l-blad">${esc(D.stan.blad)}</div>
    <p class="male wyc">Serwer: ${esc(D.API.replace(/^https?:\/\//, ''))}</p>
  </form></div>`;
  $('#f-log').addEventListener('submit', async (e) => {
    e.preventDefault();
    const b = $('#f-log button'); b.disabled = true; $('#l-blad').textContent = '';
    try { await D.zaloguj($('#l-login').value, $('#l-haslo').value); render(); }
    catch (er) { $('#l-blad').textContent = er.message === 'Failed to fetch' ? 'Brak połączenia z serwerem.' : er.message; }
    finally { b.disabled = false; }
  });
}

// ---------- szkielet ----------
function szkielet() {
  $('#app').innerHTML = `<div class="uklad" id="uklad">
    <header class="pasek">
      <a class="logo" href="#/"><img src="ikony/icon-192.png" alt=""><span><b>AM Oferty</b></span></a>
      <span class="rozp"></span>
      <button class="sync" id="sync" data-a="sync" type="button"></button>
      <a class="ikbtn nie-telefon" href="#/ustawienia" title="Ustawienia" aria-label="Ustawienia">${ik('ust')}</a>
    </header>
    <aside class="kol-lista">
      <div class="lista-gora">
        <div class="rzad" style="flex-wrap:nowrap">
          <label class="szukaj" style="flex:1">${ik('szukaj', 'wyc')}<input id="szukaj" type="search" placeholder="Szukaj: ulica, dzielnica, właściciel" aria-label="Szukaj"></label>
          <button class="ikbtn nie-telefon" data-a="nowa" title="Nowa oferta" aria-label="Nowa oferta">${ik('plus')}</button>
        </div>
        <div class="chipy" id="filtry" data-wstaw></div>
      </div>
      <div class="karty" id="karty" data-wstaw></div>
    </aside>
    <main class="kol-edytor" id="edytor"></main>
    <section class="kol-podglad" id="podglad"></section>
    <nav class="dol" id="dol" data-wstaw></nav>
  </div>`;
  $('#szukaj').addEventListener('input', (e) => { S.q = e.target.value; odswiezListe(); });
  zbudowany = true;
}

function render() {
  if (!D.stan.token) return ekranLogowania();
  if (!zbudowany) szkielet();
  odswiez();
}
function odswiez() {
  if (!D.stan.token) { if (zbudowany || !$('#f-log')) ekranLogowania(); return; }
  if (!zbudowany) szkielet();
  $('#uklad').dataset.ekran = S.ekran;
  odswiezSync(); odswiezListe(); odswiezDol();
  if (S.ekran === 'oferta') odswiezOferte();
  else if (S.ekran === 'ustawienia') odswiezUstawienia();
  else odswiezPusty();
}
function odswiezSync() {
  const el = $('#sync'); const n = D.ileWKolejce();
  let kl = 'ok', t = 'Na żywo';
  if (!D.stan.online) { kl = 'czeka'; t = n ? `Offline · ${n} czeka` : 'Offline'; }
  else if (D.stan.blad) { kl = 'zle'; t = D.stan.blad; }
  else if (n) { kl = 'czeka'; t = `Wysyłam ${n}`; }
  else if (!D.stan.polaczony) { kl = 'czeka'; t = 'Łączę…'; }
  el.className = `sync ${kl}`; el.innerHTML = `<i></i>${esc(t)}`; el.title = 'Kliknij, aby zsynchronizować teraz';
}
function odswiezDol() {
  wstaw($('#dol'), `<a href="#/" class="${S.ekran === 'lista' ? 'akt' : ''}">${ik('lista')}Oferty</a>
    <a href="#" data-a="nowa" class="nowa">${ik('plus')}Nowa</a>
    <a href="#/ustawienia" class="${S.ekran === 'ustawienia' ? 'akt' : ''}">${ik('ust')}Ustawienia</a>`);
}

// ---------- lista ----------
const FILTRY = { aktywne: 'Aktywne', ...M.STATUSY, wszystkie: 'Wszystkie' };
function odswiezListe() {
  wstaw($('#filtry'), Object.entries(FILTRY).map(([k, v]) => `<button class="chip ${S.filtr === k ? 'akt' : ''}" data-a="filtr" data-v="${k}">${esc(v)}</button>`).join(''));
  const q = S.q.trim().toLowerCase();
  const lista = D.oferty()
    .filter((o) => S.filtr === 'wszystkie' || (S.filtr === 'aktywne' ? o.status !== 'zakonczona' : o.status === S.filtr))
    .filter((o) => !q || [o.roboczy, o.ulica, o.dzielnica, o.miasto, o.wlImie, M.tytul(o)].join(' ').toLowerCase().includes(q))
    .sort((a, b) => (b._zmieniona || Date.now()) - (a._zmieniona || Date.now()));
  let html;
  if (!lista.length) {
    html = D.oferty().length
      ? '<div class="pusto">Brak ofert dla tego filtra.</div>'
      : `<div class="pusto"><h2>Pierwsza oferta</h2><p>Dodaj nieruchomość, uzupełnij kartę i zdjęcia. Ogłoszenie złoży się samo z faktów.</p><button class="btn zloty" data-a="nowa">${ik('plus')}Nowa oferta</button></div>`;
  } else {
    html = lista.map((o) => {
      const gl = (o.zdj || []).find((z) => z.glowne) || (o.zdj || [])[0];
      const g = M.gotowosc(o);
      const najem = o.transakcja === 'najem';
      return `<a class="karta ${o.id === S.id ? 'akt' : ''}" href="#/o/${o.id}/${S.tab || 'karta'}">
        <div class="min" ${gl ? `data-tlo="${gl.id}" ${miniUrl.has(gl.id) ? `style="background-image:url('${miniUrl.get(gl.id)}')"` : ''}` : ''}>${gl && miniUrl.has(gl.id) ? '' : ik('dom')}</div>
        <div style="min-width:0">
          <h3>${esc(o.roboczy || M.tytul(o))}</h3>
          <div class="cena">${o.cena ? `${M.zl(o.cena)}${najem ? ' / mies.' : ''}` : '<span class="wyc">bez ceny</span>'} <span class="wyc">· ${esc(M.TRANSAKCJE[o.transakcja] || '')}</span></div>
          <div class="info"><span class="st st-${o.status}">${esc(M.STATUSY[o.status] || o.status)}</span><span class="pasek-got" title="Kompletność ${g.procent}%"><i style="width:${g.procent}%"></i></span>${g.procent}%${o._lokalne ? ` · ${ik('wysyla')}` : ''}</div>
        </div></a>`;
    }).join('');
  }
  wstaw($('#karty'), html);
}

function odswiezPusty() {
  const e = $('#edytor'); e.dataset.tryb = 'pusty';
  wstaw(e, '<div class="pusto tylko-szeroki-ed"><h2>Wybierz ofertę</h2><p>albo dodaj nową przyciskiem +</p></div>');
  $('#podglad').innerHTML = ''; $('#podglad').__html = null;
}

// ---------- edytor oferty ----------
const ZAKLADKI = { karta: 'Karta', zdjecia: 'Zdjęcia', ogloszenie: 'Ogłoszenie', kontrola: 'Kontrola' };
function odswiezOferte() {
  const o = D.oferta(S.id);
  const e = $('#edytor');
  if (!o) {
    e.dataset.tryb = 'brak';
    wstaw(e, `<div class="pusto"><h2>Nie ma tej oferty</h2><p>Mogła zostać usunięta.</p><a class="btn" href="#/">Wróć do listy</a></div>`);
    return;
  }
  if (e.dataset.tryb !== 'oferta') {
    e.dataset.tryb = 'oferta'; e.__html = null;
    e.innerHTML = '<div class="of-gora" id="of-gora" data-wstaw></div><div class="tresc" id="ed-tresc"></div>';
  }
  const g = M.gotowosc(o);
  const slowa = M.kontrolaSlow(o).length;
  const zak = szeroki.matches ? ['karta', 'zdjecia'] : Object.keys(ZAKLADKI);
  const nZdj = (o.zdj || []).length;
  wstaw($('#of-gora'), `
    <div class="of-naglowek">
      <a class="ikbtn wstecz" href="#/" aria-label="Wróć do listy">${ik('wstecz')}</a>
      <h1>${esc(o.roboczy || M.tytul(o))}</h1>
      <button class="ikbtn" data-a="historia" title="Historia zmian" aria-label="Historia zmian">${ik('zegar')}</button>
      <button class="ikbtn" data-a="usun-oferte" title="Usuń ofertę" aria-label="Usuń ofertę">${ik('kosz')}</button>
    </div>
    <div class="of-status">
      <select data-k="status" aria-label="Status oferty">${Object.entries(M.STATUSY).map(([k, v]) => `<option value="${k}" ${o.status === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select>
      <span class="gotowosc"><span class="pasek-got"><i style="width:${g.procent}%"></i></span>${g.procent}%${g.braki.length ? ` · <span style="color:var(--zle)">${g.braki.length} do uzupełnienia</span>` : ' · <span style="color:var(--ok)">gotowa</span>'}</span>
    </div>
    <nav class="zakladki">${zak.map((k) => `<a href="#/o/${o.id}/${k}" class="${S.tab === k ? 'akt' : ''}">${ZAKLADKI[k]}${k === 'zdjecia' ? ` <span class="wyc male">${nZdj}</span>` : ''}${k === 'kontrola' && g.braki.length ? ` <span class="licznik">${g.braki.length}</span>` : ''}${k === 'ogloszenie' && slowa ? ` <span class="licznik">${slowa}</span>` : ''}</a>`).join('')}</nav>`);
  const t = $('#ed-tresc');
  const klucz = `${o.id}:${S.tab}`;
  if (t.__klucz !== klucz) { t.__klucz = klucz; t.innerHTML = ''; t.__html = null; }
  if (S.tab === 'karta') tabKarta(t, o);
  else if (S.tab === 'zdjecia') tabZdjecia(t, o);
  else if (S.tab === 'ogloszenie') wstaw(t, htmlOgloszenie(o));
  else if (S.tab === 'kontrola') wstaw(t, htmlKontrola(o));
  // podgląd na laptopie
  const p = $('#podglad');
  if (szeroki.matches) {
    const zk = `<nav class="podglad-zakl"><a href="#" data-a="podglad" data-v="ogloszenie" class="${S.podglad === 'ogloszenie' ? 'akt' : ''}">Ogłoszenie${slowa ? ` <span class="licznik">${slowa}</span>` : ''}</a><a href="#" data-a="podglad" data-v="kontrola" class="${S.podglad === 'kontrola' ? 'akt' : ''}">Kontrola${g.braki.length ? ` <span class="licznik">${g.braki.length}</span>` : ''}</a></nav>`;
    wstaw(p, `${zk}<div class="tresc">${S.podglad === 'kontrola' ? htmlKontrola(o) : htmlOgloszenie(o)}</div>`);
  }
}

// ----- zakładka: karta -----
const SEK_KARTY = [
  ['podstawy', 'Podstawy'], ['lokalizacja', 'Lokalizacja'], ['lokal', 'Nieruchomość'], ['pom', 'Pomieszczenia'], ['koszty', 'Koszty'],
  ['atuty', 'Atuty'], ['minusy', 'Co warto wiedzieć'], ['okolica', 'Okolica'], ['weryfikacja', 'Sprawdziliśmy'], ['energia', 'Świadectwo'],
  ['tekst', 'Tytuł i wstęp'], ['wlasciciel', 'Właściciel'],
];
function tabKarta(t, o) {
  if (!t.firstChild) {
    t.innerHTML = `<div class="skoki">${SEK_KARTY.map(([k, v]) => `<button class="chip" data-a="skok" data-v="${k}">${v}</button>`).join('')}</div>`
      + SEK_KARTY.map(([k]) => `<section class="sekcja ${k === 'wlasciciel' ? 'prywatna' : ''}" id="sek-${k}" data-wstaw></section>`).join('');
  }
  const sek = Object.fromEntries(M.SEKCJE.map((s) => [s.id, s]));
  for (const [k] of SEK_KARTY) {
    let h = '';
    if (sek[k]) h = sekcjaPol(sek[k], o);
    else if (k === 'pom') h = sekcjaPom(o);
    else if (k === 'atuty') h = sekcjaListy(o, 'atuty', 'Atuty', 'Tylko fakty, które da się sprawdzić: co, kiedy, ile. Bez ocen.', 'np. okna wymienione w 2019 r.');
    else if (k === 'minusy') h = sekcjaListy(o, 'minusy', 'Co warto wiedzieć', 'Uczciwe minusy, zanim ktoś je odkryje na prezentacji. To buduje zaufanie i oszczędza czas obu stronom.', 'np. brak windy, 4. piętro');
    else if (k === 'okolica') h = sekcjaOkolicy(o);
    else if (k === 'weryfikacja') h = sekcjaWeryfikacji(o);
    else if (k === 'tekst') h = sekcjaTekstu(o);
    wstaw($(`#sek-${k}`, t), h);
  }
}
function wartoscPola(p, o) {
  const v = o[p.k];
  if (v === undefined || v === null) return '';
  if (p.t === 'n') return Math.abs(Number(v)) >= 10000 ? M.liczba(v).replace(/\u00a0/g, ' ') : String(v).replace('.', ',');
  return String(v);
}
function poleHTML(p, o) {
  const id = `f-${p.k}`;
  const v = wartoscPola(p, o);
  let we;
  const jedn = p.k === 'cena' && o.transakcja === 'najem' ? p.jNajem : p.j;
  if (p.t === 'b') {
    return `<div class="pole"><label class="tnk"><input type="checkbox" data-k="${p.k}" data-t="b" ${o[p.k] ? 'checked' : ''}><span>${esc(p.e)}</span></label></div>`;
  }
  if (p.t === 'w') {
    we = `<select id="${id}" data-k="${p.k}" data-t="w"><option value="">— wybierz —</option>${Object.entries(p.o).map(([k, n]) => `<option value="${k}" ${v === k ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>`;
  } else if (p.t === 'n') {
    we = `<input id="${id}" data-k="${p.k}" data-t="n" inputmode="decimal" autocomplete="off" value="${esc(v)}">`;
  } else if (p.t === 'd') {
    we = `<input id="${id}" data-k="${p.k}" data-t="d" type="date" value="${esc(v)}">`;
  } else if (p.dlugi) {
    we = `<textarea id="${id}" data-k="${p.k}" data-t="t" rows="3">${esc(v)}</textarea>`;
  } else {
    we = `<input id="${id}" data-k="${p.k}" data-t="t" type="${p.typ || 'text'}" ${p.lista ? `list="dl-${p.lista}"` : ''} placeholder="${esc(p.pl || '')}" value="${esc(v)}" autocomplete="off">`;
  }
  let zr = '';
  if (p.zr) {
    const akt = o.zr?.[p.k];
    const brak = !akt && v !== '';
    zr = `<div class="zrodla ${brak ? 'brak' : ''}" title="Skąd to wiemy?">${Object.entries(M.ZRODLA).map(([k, n]) => `<button type="button" data-a="zr" data-k="${p.k}" data-v="${k}" class="${akt === k ? 'akt' : ''}">${n}</button>`).join('')}</div>`;
  }
  return `<div class="pole ${p.dlugi ? 'pelna' : ''}"><label class="et" for="${id}">${esc(p.e)}</label><div class="wejscie">${we}${jedn ? `<span class="jedn">${esc(jedn)}</span>` : ''}</div>${zr}</div>`;
}
function sekcjaPol(s, o) {
  const pola = s.pola.filter((p) => M.poleWidoczne(p, o));
  let opisSek = '';
  if (s.id === 'lokal') opisSek = '<p class="opis-sek">Przy polach z wyborem źródła zaznacz, skąd jest informacja. „Wg właściciela” pojawi się w ogłoszeniu jako dopisek.</p>';
  if (s.id === 'energia') opisSek = '<p class="opis-sek">Jeśli świadectwo jest sporządzone, ustawa wymaga podania w ogłoszeniu wszystkich pięciu wskaźników.</p>';
  if (s.id === 'wlasciciel') opisSek = '<p class="opis-sek">Te dane widzicie tylko Wy dwaj. Nigdy nie trafiają do ogłoszenia.</p>';
  const dl = pola.some((p) => p.lista === 'dzielnice') ? `<datalist id="dl-dzielnice">${M.DZIELNICE_LUBLIN.map((d) => `<option value="${d}">`).join('')}</datalist>` : '';
  return `<h2>${esc(s.tytul)}</h2>${opisSek}<div class="siatka">${pola.map((p) => poleHTML(p, o)).join('')}</div>${dl}`;
}
function sekcjaPom(o) {
  const pom = o.pom || [];
  const suma = pom.reduce((s, p) => s + (Number(p.m) || 0), 0);
  return `<h2>Pomieszczenia</h2><p class="opis-sek">Każde pomieszczenie dostanie swoje zdjęcia. Suma: <b>${M.m2(Math.round(suma * 100) / 100)}</b>${o.pow ? ` z ${M.m2(o.pow)}` : ''}.</p>
    <datalist id="dl-pom">${M.TYPY_POM.map((x) => `<option value="${x}">`).join('')}</datalist>
    <div class="wiersze">${pom.map((p, i) => `<div class="wiersz"><div class="pola pom">
      <div class="wejscie"><input data-l="pom" data-i="${i}" data-p="nazwa" data-t="t" list="dl-pom" placeholder="Nazwa, np. Sypialnia" value="${esc(p.nazwa || '')}" aria-label="Nazwa pomieszczenia"></div>
      <div class="wejscie"><input data-l="pom" data-i="${i}" data-p="m" data-t="n" inputmode="decimal" placeholder="m²" value="${esc(p.m === undefined || p.m === null ? '' : String(p.m).replace('.', ','))}" aria-label="Metraż"><span class="jedn">m²</span></div>
      <div class="wejscie op"><input data-l="pom" data-i="${i}" data-p="opis" data-t="t" placeholder="Krótko, faktami: okno na zachód, zabudowa 2021" value="${esc(p.opis || '')}" aria-label="Opis"></div>
    </div><button class="ikbtn" data-a="usun-wiersz" data-l="pom" data-i="${i}" aria-label="Usuń pomieszczenie">${ik('x')}</button></div>`).join('')}</div>
    <button class="dodaj" data-a="dodaj-wiersz" data-l="pom">${ik('plus')}Dodaj pomieszczenie</button>`;
}
function sekcjaListy(o, l, tyt, opis, pl) {
  const L = o[l] || [];
  return `<h2>${tyt}</h2><p class="opis-sek">${opis}</p><div class="wiersze">${L.map((a, i) => `<div class="wiersz"><div class="pola">
    <div class="wejscie"><input data-l="${l}" data-i="${i}" data-p="t" data-t="t" placeholder="${esc(pl)}" value="${esc(a.t || '')}" aria-label="${tyt} ${i + 1}"></div></div>
    <button class="ikbtn" data-a="usun-wiersz" data-l="${l}" data-i="${i}" aria-label="Usuń">${ik('x')}</button></div>`).join('')}</div>
    <button class="dodaj" data-a="dodaj-wiersz" data-l="${l}">${ik('plus')}Dodaj</button>`;
}
function sekcjaOkolicy(o) {
  const L = o.okolica || [];
  const jak = { pieszo: 'pieszo', rower: 'rowerem', auto: 'autem', mpk: 'komunikacją' };
  return `<h2>Okolica</h2><p class="opis-sek">Czas zmierz na mapie albo przejdź sam. Podawaj tylko to, co sprawdzone.</p><div class="wiersze">${L.map((a, i) => `<div class="wiersz"><div class="pola okol">
    <div class="wejscie"><input data-l="okolica" data-i="${i}" data-p="nazwa" data-t="t" placeholder="np. przystanek MPK, szkoła nr 51" value="${esc(a.nazwa || '')}" aria-label="Miejsce"></div>
    <div class="wejscie"><input data-l="okolica" data-i="${i}" data-p="min" data-t="n" inputmode="numeric" placeholder="min" value="${esc(a.min ?? '')}" aria-label="Minuty"><span class="jedn">min</span></div>
    <div class="wejscie"><select data-l="okolica" data-i="${i}" data-p="jak" data-t="w" aria-label="Jak">${Object.entries(jak).map(([k, v]) => `<option value="${k}" ${(a.jak || 'pieszo') === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
    </div><button class="ikbtn" data-a="usun-wiersz" data-l="okolica" data-i="${i}" aria-label="Usuń">${ik('x')}</button></div>`).join('')}</div>
    <button class="dodaj" data-a="dodaj-wiersz" data-l="okolica">${ik('plus')}Dodaj miejsce</button>`;
}
function sekcjaWeryfikacji(o) {
  const w = o.weryf || {};
  const lista = M.WERYFIKACJA.filter((x) => !x.dla || x.dla === o.transakcja);
  return `<h2>Sprawdziliśmy</h2><p class="opis-sek">Zaznaczone punkty pojawią się w ogłoszeniu w sekcji „Sprawdziliśmy” z datą. To przekłada „Sprawdzone do końca” na konkret.</p>
    <div class="weryf">${lista.map((x) => `<div class="w"><label><input type="checkbox" data-w="${x.k}" data-p="ok" ${w[x.k]?.ok ? 'checked' : ''}><span>${esc(x.t)}</span></label>
    <input type="date" data-w="${x.k}" data-p="d" value="${esc(w[x.k]?.d || '')}" aria-label="Data: ${esc(x.t)}"></div>`).join('')}</div>`;
}
function sekcjaTekstu(o) {
  return `<h2>Tytuł i wstęp</h2><p class="opis-sek">Opcjonalnie. Puste pola = tytuł i wstęp złożą się same z faktów. Wstęp to 1–2 zdania od Was, bez ocen.</p>
    <div class="siatka">
      <div class="pole pelna"><label class="et" for="f-tytul">Własny tytuł (zamiast automatycznego)</label><div class="wejscie"><input id="f-tytul" data-k="tytul" data-t="t" placeholder="${esc(M.tytul({ ...o, tytul: '' }))}" value="${esc(o.tytul || '')}"></div></div>
      <div class="pole pelna"><label class="et" for="f-lead">Wstęp</label><div class="wejscie"><textarea id="f-lead" data-k="lead" data-t="t" rows="3" placeholder="np. Mieszkanie po jednym właścicielu, regularnie remontowane.">${esc(o.lead || '')}</textarea></div></div>
    </div>`;
}

// ----- zakładka: zdjęcia -----
function nazwaMiejsca(z, o) {
  if (!z.pom) return '';
  const p = (o.pom || []).find((x) => x.id === z.pom);
  return p ? (p.nazwa || p.typ || 'Pomieszczenie') : M.MIEJSCA_ZDJEC[z.pom] || '';
}
function opcjeMiejsc(o, wybrane, pusta = '— gdzie zrobione? —') {
  const pom = (o.pom || []).filter((p) => p.nazwa || p.typ);
  return `<option value="">${pusta}</option>${pom.length ? `<optgroup label="Pomieszczenia">${pom.map((p) => `<option value="${p.id}" ${wybrane === p.id ? 'selected' : ''}>${esc(p.nazwa || p.typ)}</option>`).join('')}</optgroup>` : ''}
    <optgroup label="Inne">${Object.entries(M.MIEJSCA_ZDJEC).map(([k, v]) => `<option value="${k}" ${wybrane === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</optgroup>`;
}
function tabZdjecia(t, o) {
  if (!t.firstChild) t.innerHTML = '<div id="zdj-licznik" data-wstaw></div><div class="sekcja" style="margin-bottom:12px"><div id="zdj-dodaj" data-wstaw></div><p class="postep" id="zdj-postep"></p></div><div id="zdj-braki" data-wstaw></div><div class="zdjecia" id="zdj-siatka" data-wstaw></div>';
  const zdj = o.zdj || [];
  const zwykle = zdj.filter((z) => !z.wiz).length;
  const L = M.checklista(o);
  const bez = L.find((x) => x.id === 'zdjPom');
  const brakRzutu = L.find((x) => x.id === 'rzut' && !x.ok);
  wstaw($('#zdj-licznik', t), `<div class="zdj-gora">
      <div><b>${zdj.length}</b> zdjęć <span class="wyc">· prawdziwych ${zwykle}, minimum ${M.minZdjec(o)}</span></div>
      <div class="rzad">${zdj.length ? `<button class="btn maly" data-a="pobierz-zdj">${ik('pobierz')}Pobierz w kolejności</button>` : ''}</div>
    </div>`);
  // ten fragment zawiera pole wyboru plików — odświeżany tylko, gdy zmieni się lista pomieszczeń
  wstaw($('#zdj-dodaj', t), `<div class="siatka">
      <div class="pole"><label class="et" for="pom-dodaj">Dodawane zdjęcia przypisz do</label><div class="wejscie"><select id="pom-dodaj">${opcjeMiejsc(o, null, 'później wybiorę')}</select></div></div>
      <div class="pole" style="display:flex;align-items:flex-end"><label class="btn zloty wybierz-plik" style="width:100%">${ik('aparat')}Dodaj zdjęcia<input type="file" id="dodaj-zdj" accept="image/*" multiple></label></div>
    </div>`);
  const sel = $('#pom-dodaj', t);
  if (sel && document.activeElement !== sel) sel.value = [...sel.options].some((x) => x.value === S.pomDodawania) ? S.pomDodawania : '';
  $('#zdj-postep', t).textContent = S.postep;
  wstaw($('#zdj-braki', t), `${bez && !bez.ok && bez.info ? `<div class="braki-zdj">${ik('uwaga')} ${esc(bez.info)}</div>` : ''}
    ${brakRzutu ? `<div class="braki-zdj">${ik('uwaga')} Brak rzutu. Dodaj go jako zdjęcie i przypisz do „Rzut”.</div>` : ''}
    <p class="male wyc">Kolejność tutaj = kolejność w ogłoszeniu. Pierwsze zdjęcie najlepiej ustaw jako główne. Wizualizacje (meble dodane cyfrowo) muszą mieć przypięty oryginał i nie mogą być zdjęciem głównym.</p>`);
  const oryginaly = zdj.filter((z) => !z.wiz);
  wstaw($('#zdj-siatka', t), zdj.map((z, i) => `<div class="zdj ${z.glowne ? 'glowne' : ''}">
    <div class="obraz">${imgMini(z.id, nazwaMiejsca(z, o))}<span class="nr">${i + 1}</span>
      <span class="znaczki">${z.glowne ? '<span class="zn gl">Główne</span>' : ''}${z.wiz ? '<span class="zn wiz">Wizualizacja</span>' : ''}${D.czekaNaWyslanie(z.id) ? `<span class="zn">${ik('wysyla')}</span>` : ''}</span></div>
    <div class="dane-zdj">
      <div class="wejscie"><select data-z="${z.id}" data-p="pom" aria-label="Miejsce zdjęcia">${opcjeMiejsc(o, z.pom)}</select></div>
      ${z.wiz ? `<div class="wejscie"><select data-z="${z.id}" data-p="oryg" aria-label="Oryginał wizualizacji"><option value="">— oryginał tej wizualizacji —</option>${oryginaly.map((x) => `<option value="${x.id}" ${z.oryg === x.id ? 'selected' : ''}>Zdjęcie ${zdj.indexOf(x) + 1}${x.pom ? ` · ${esc(nazwaMiejsca(x, o))}` : ''}</option>`).join('')}</select></div>` : ''}
      <div class="wejscie"><input data-z="${z.id}" data-p="opis" placeholder="Podpis (opcjonalnie)" value="${esc(z.opis || '')}" aria-label="Podpis"></div>
    </div>
    <div class="akcje">
      <button data-a="zdj-ruch" data-z="${z.id}" data-v="-1" aria-label="Przesuń wcześniej" ${i === 0 ? 'disabled' : ''}>${ik('lewo')}</button>
      <button data-a="zdj-ruch" data-z="${z.id}" data-v="1" aria-label="Przesuń dalej" ${i === zdj.length - 1 ? 'disabled' : ''}>${ik('prawo')}</button>
      <button data-a="zdj-gl" data-z="${z.id}" class="${z.glowne ? 'akt' : ''}" aria-label="Zdjęcie główne" title="Zdjęcie główne">${ik('gwiazda')}</button>
      <button data-a="zdj-wiz" data-z="${z.id}" class="${z.wiz ? 'akt' : ''}" aria-label="Wizualizacja" title="Oznacz jako wizualizację">${ik('wiz')}</button>
      <button data-a="zdj-usun" data-z="${z.id}" aria-label="Usuń zdjęcie" title="Usuń">${ik('kosz')}</button>
    </div></div>`).join('') || '<div class="pusto">Brak zdjęć. Wybierz pomieszczenie i dodaj zdjęcia z aparatu albo galerii.</div>');
}

// ----- ogłoszenie -----
function htmlOgloszenie(o) {
  const uw = M.kontrolaSlow(o);
  const tyt = M.tytul(o), op = M.opis(o, { agent: agent() }), kr = M.krotki(o, { agent: agent() });
  const pola = M.polaPortalu(o);
  return `${uw.length ? `<div class="uwagi"><h3>${ik('uwaga')} Do poprawy przed publikacją (${uw.length})</h3><ul>${uw.map((u) => `<li><b>${esc(u.gdzie)}:</b> „${esc(u.fraza)}” — ${esc(u.porada)}</li>`).join('')}</ul></div>` : ''}
    <div class="blok"><div class="blok-gora"><h3>Tytuł</h3><span class="wyc male">${tyt.length} zn.</span><button class="btn maly" data-a="kopiuj" data-co="tytul">${ik('kopiuj')}Kopiuj</button></div><div class="tytul-og">${esc(tyt)}</div></div>
    <div class="blok"><div class="blok-gora"><h3>Opis — Otodom, OLX, strona</h3><span class="wyc male">${op.length} zn.</span><button class="btn maly" data-a="kopiuj" data-co="opis">${ik('kopiuj')}Kopiuj</button></div><pre class="tekst-og">${esc(op)}</pre></div>
    <div class="blok"><div class="blok-gora"><h3>Krótka wersja — Facebook, Instagram</h3><button class="btn maly" data-a="kopiuj" data-co="krotki">${ik('kopiuj')}Kopiuj</button></div><pre class="tekst-og">${esc(kr)}</pre></div>
    <div class="blok"><div class="blok-gora"><h3>Pola formularza portalu</h3></div><div class="pola-portalu">${pola.map((p, i) => `<div class="pp"><span><small>${esc(p.e)}</small>${esc(p.v)}</span><button class="ikbtn" data-a="kopiuj" data-co="pole" data-v="${i}" aria-label="Kopiuj: ${esc(p.e)}">${ik('kopiuj')}</button></div>`).join('')}</div></div>`;
}
// ----- kontrola -----
function htmlKontrola(o) {
  const L = M.checklista(o);
  const tw = L.filter((x) => x.twarde), zal = L.filter((x) => !x.twarde);
  const g = M.gotowosc(o);
  const li = (x) => `<li data-a="idz" data-id="${x.id}" data-zak="${x.zakladka}"><span class="${x.ok ? 'ok' : x.twarde ? 'nie' : 'zal'}">${ik(x.ok ? 'ok' : x.twarde ? 'x' : 'uwaga')}</span><span>${esc(x.tekst)}${x.info && !x.ok ? `<br><span class="info">${esc(x.info)}</span>` : ''}</span></li>`;
  return `<div class="blok"><div class="blok-gora"><h3>${g.wszystkieTwarde ? 'Gotowa do publikacji' : `Wymagane: brakuje ${g.braki.length}`}</h3><span class="wyc male">${g.procent}%</span></div>
    <ul class="check">${tw.map(li).join('')}</ul></div>
    <div class="blok"><div class="blok-gora"><h3>Zalecane</h3></div><ul class="check">${zal.map(li).join('')}</ul></div>
    <p class="male wyc">Status „Gotowa do publikacji” i „Opublikowana” da się ustawić dopiero, gdy wszystkie wymagane punkty są spełnione.</p>`;
}

// ----- ustawienia -----
function odswiezUstawienia() {
  const e = $('#edytor'); e.dataset.tryb = 'ustawienia';
  const a = agent();
  const pushOk = 'PushManager' in window;
  wstaw(e, `<div class="tresc ust">
    <h1 style="font-size:26px;margin:4px 0 14px;color:var(--gold-l)">Ustawienia</h1>
    <section class="sekcja"><h2>Stopka ogłoszeń</h2>
      <div class="siatka">
        <div class="pole"><label class="et" for="u-nazwa">Twoje imię i nazwisko</label><div class="wejscie"><input id="u-nazwa" data-u="nazwa" value="${esc(a.nazwa)}"></div></div>
        <div class="pole"><label class="et" for="u-tel">Telefon w ogłoszeniach</label><div class="wejscie"><input id="u-tel" data-u="telefon" type="tel" value="${esc(a.telefon)}"></div></div>
        <div class="pole"><label class="et" for="u-firma">Nazwa firmy</label><div class="wejscie"><input id="u-firma" data-u="firma" value="${esc(a.firma)}"></div></div>
        <div class="pole"><label class="et" for="u-haslo">Hasło pod nazwą</label><div class="wejscie"><input id="u-haslo" data-u="haslo" value="${esc(a.haslo)}"></div></div>
      </div></section>
    <section class="sekcja"><h2>Powiadomienia</h2>
      <p class="opis-sek">Dostaniesz powiadomienie, gdy wspólnik doda ofertę albo zmieni jej status. Na iPhonie działa tylko w aplikacji dodanej do ekranu początkowego.</p>
      <div class="rzad">${pushOk ? (D.stan.push ? '<span style="color:var(--ok)">Włączone na tym urządzeniu</span><button class="btn maly" data-a="push-off">Wyłącz</button>' : '<button class="btn" data-a="push-on">Włącz powiadomienia</button>') : '<span class="wyc">To urządzenie nie obsługuje powiadomień w tej formie. Dodaj aplikację do ekranu początkowego.</span>'}</div></section>
    <section class="sekcja"><h2>Synchronizacja</h2>
      <p class="opis-sek">Wszystko zapisuje się najpierw na tym urządzeniu, a potem od razu na serwerze. Bez internetu możesz dalej pracować — zmiany wyślą się same.</p>
      <div>Do wysłania: <b>${D.ileWKolejce()}</b> · stan danych: ${D.stan.seq}</div>
      <div class="wyc male">Serwer: ${esc(D.API)}</div>
      <div class="rzad"><button class="btn maly" data-a="sync">Synchronizuj teraz</button></div></section>
    <section class="sekcja"><h2>Konto</h2>
      <div>Zalogowany: <b>${esc(D.stan.konto?.nazwa || '')}</b> <span class="wyc">(${esc(D.stan.konto?.login || '')})</span></div>
      ${D.stan.konta.length > 1 ? `<div class="wyc male">Konta w biurze: ${D.stan.konta.map((k) => esc(k.nazwa)).join(', ')}</div>` : ''}
      <div class="rzad"><button class="btn maly zly" data-a="wyloguj">Wyloguj to urządzenie</button></div></section>
    <p class="male wyc">AM Oferty ${WERSJA}</p>
  </div>`);
}

// ---------- zapis pól ----------
const timery = new Map();
function wartosc(el) {
  const t = el.dataset.t;
  if (t === 'b' || el.type === 'checkbox') return el.checked;
  if (t === 'n') return M.parsujLiczbe(el.value);
  const v = el.value;
  if (t === 't') return v.trim() === '' ? null : v;
  return v === '' ? null : v;
}
function zapisz(el) {
  timery.delete(el);
  const o = D.oferta(S.id); if (!o) return;
  if (el.dataset.k) {
    const k = el.dataset.k;
    if (k === 'status') return zmienStatus(o, el);
    const v = wartosc(el);
    if (JSON.stringify(o[k] ?? null) === JSON.stringify(v)) return;
    const pola = { [k]: v };
    // zmiana transakcji: cena z innego trybu nie ma sensu bez sprawdzenia
    D.zmien(S.id, pola);
  } else if (el.dataset.l) {
    const l = el.dataset.l, i = Number(el.dataset.i), p = el.dataset.p;
    const arr = (o[l] || []).map((x) => ({ ...x }));
    if (!arr[i]) return;
    const v = wartosc(el);
    if (v === null) delete arr[i][p]; else arr[i][p] = v;
    D.zmien(S.id, { [l]: arr });
  } else if (el.dataset.w) {
    const w = { ...(o.weryf || {}) };
    const x = { ...(w[el.dataset.w] || {}) };
    if (el.dataset.p === 'ok') { x.ok = el.checked; if (el.checked && !x.d) x.d = new Date().toISOString().slice(0, 10); }
    else x.d = el.value || null;
    w[el.dataset.w] = x;
    D.zmien(S.id, { weryf: w });
  } else if (el.dataset.z) {
    const zdj = (o.zdj || []).map((z) => (z.id === el.dataset.z ? { ...z, [el.dataset.p]: el.value || undefined } : z));
    D.zmien(S.id, { zdj: zdj.map((z) => JSON.parse(JSON.stringify(z))) });
  } else if (el.dataset.u) {
    D.ustawAgenta({ [el.dataset.u]: el.value.trim() });
  }
}
function zmienStatus(o, el) {
  const v = el.value;
  if (M.STATUSY_WYMAGAJACE.includes(v)) {
    const g = M.gotowosc(o);
    if (!g.wszystkieTwarde) {
      el.value = o.status;
      toast(`Najpierw uzupełnij wymagane punkty (${g.braki.length}).`, 3000);
      if (szeroki.matches) { S.podglad = 'kontrola'; odswiez(); } else idzDo(`#/o/${o.id}/kontrola`);
      return;
    }
  }
  const pola = { status: v };
  if (v === 'opublikowana' && !o.dataPublikacji) pola.dataPublikacji = new Date().toISOString().slice(0, 10);
  D.zmien(o.id, pola);
}
const natychmiast = (el) => el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'date';
document.addEventListener('input', (e) => {
  const el = e.target;
  if (!(el.dataset.k || el.dataset.l || el.dataset.w || el.dataset.z || el.dataset.u)) return;
  if (natychmiast(el)) return; // obsłuży 'change'
  clearTimeout(timery.get(el));
  timery.set(el, setTimeout(() => zapisz(el), 450));
});
document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.id === 'pom-dodaj') { S.pomDodawania = el.value; return; }
  if (el.id === 'dodaj-zdj') return dodajZdjecia(el);
  if (!(el.dataset.k || el.dataset.l || el.dataset.w || el.dataset.z || el.dataset.u)) return;
  clearTimeout(timery.get(el));
  zapisz(el);
});
document.addEventListener('focusout', (e) => {
  const el = e.target;
  if (timery.has(el)) { clearTimeout(timery.get(el)); zapisz(el); }
  setTimeout(() => { if (!document.activeElement || !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) odswiez(); }, 30);
});

// ---------- zdjęcia: dodawanie, kolejność, pobieranie ----------
let kolejkaDodawania = Promise.resolve();
function dodajZdjecia(input) {
  const pliki = [...input.files];
  input.value = '';
  if (!pliki.length || !S.id) return;
  const oid = S.id, pom = S.pomDodawania;
  kolejkaDodawania = kolejkaDodawania.then(() => dodajPaczke(oid, pliki, pom));
}
async function dodajPaczke(oid, pliki, pom) {
  try {
    const nowe = await D.przygotujZdjecia(oid, pliki, (i, n) => { S.postep = `Przygotowuję zdjęcie ${i} z ${n}…`; odswiez(); });
    const o = D.oferta(oid);
    const zdj = [...(o.zdj || [])];
    for (const z of nowe) { if (pom) z.pom = pom; zdj.push(z); }
    if (!zdj.some((z) => z.glowne)) { const p = zdj.find((z) => !z.wiz); if (p) p.glowne = true; }
    await D.zmien(oid, { zdj });
    toast(`Dodano ${nowe.length} ${nowe.length === 1 ? 'zdjęcie' : nowe.length < 5 ? 'zdjęcia' : 'zdjęć'}`);
  } catch (e) { toast(e.message || 'Nie udało się dodać zdjęć', 3500); }
  finally { S.postep = ''; odswiez(); }
}
function slug(s) {
  return String(s || 'zdjecie').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'zdjecie';
}
async function pobierzZdjecia(o) {
  const zdj = o.zdj || [];
  if (!zdj.length) return;
  toast('Przygotowuję zdjęcia…', 6000);
  try {
    const pliki = [];
    for (let i = 0; i < zdj.length; i++) {
      const z = zdj[i];
      const blob = await D.blobZdjecia(z.id);
      pliki.push({ nazwa: `${String(i + 1).padStart(2, '0')}-${slug(nazwaMiejsca(z, o))}${z.wiz ? '-wizualizacja' : ''}.jpg`, blob });
    }
    const mobilny = /iPhone|iPad|Android/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
    const files = pliki.map((p) => new File([p.blob], p.nazwa, { type: 'image/jpeg' }));
    if (mobilny && navigator.canShare?.({ files })) {
      await navigator.share({ files, title: o.roboczy || M.tytul(o) });
    } else {
      const zip = await zrobZip(pliki);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(zip); a.download = `${slug(o.roboczy || M.tytul(o))}-zdjecia.zip`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 60e3);
    }
    toast('Gotowe');
  } catch (e) { if (e.name !== 'AbortError') toast(e.message || 'Nie udało się pobrać zdjęć', 3500); }
}
async function podgladZdjecia(id) {
  const tlo = document.createElement('div');
  tlo.className = 'podglad-zdj';
  tlo.innerHTML = `<img alt="Zdjęcie" src="${miniUrl.get(id) || ''}"><button class="ikbtn" aria-label="Zamknij">${ik('x')}</button>`;
  tlo.addEventListener('click', () => tlo.remove());
  document.body.appendChild(tlo);
  try { const b = await D.blobZdjecia(id); $('img', tlo).src = URL.createObjectURL(b); } catch { /* zostaje miniatura */ }
}

// ---------- okna ----------
function okno(tytul, html) {
  const tlo = document.createElement('div');
  tlo.className = 'okno-tlo';
  tlo.innerHTML = `<div class="okno" role="dialog" aria-modal="true" aria-label="${esc(tytul)}"><div class="okno-gora"><h2>${esc(tytul)}</h2><button class="ikbtn" data-zamknij aria-label="Zamknij">${ik('x')}</button></div><div class="okno-tresc">${html}</div></div>`;
  tlo.addEventListener('click', (e) => { if (e.target === tlo || e.target.closest('[data-zamknij]')) tlo.remove(); });
  document.body.appendChild(tlo);
  return tlo;
}
const NAZWY_POL = { pom: 'Pomieszczenia', atuty: 'Atuty', minusy: 'Co warto wiedzieć', okolica: 'Okolica', zdj: 'Zdjęcia', weryf: 'Sprawdziliśmy', zr: 'Źródła danych',
  lead: 'Wstęp', tytul: 'Własny tytuł', status: 'Status', _usunieta: 'Usunięcie oferty', dataPublikacji: 'Data publikacji', utworzyl: 'Utworzył(a)', id: 'Utworzenie' };
function etykieta(k) { for (const s of M.SEKCJE) for (const p of s.pola) if (p.k === k) return p.e; return NAZWY_POL[k] || k; }
function pokazWartosc(k, j) {
  if (j === null || j === undefined) return '—';
  let v; try { v = JSON.parse(j); } catch { return esc(j); }
  if (typeof v === 'object') return 'zmienione';
  if (k === 'status') return esc(M.STATUSY[v] || v);
  for (const s of M.SEKCJE) for (const p of s.pola) if (p.k === k) { if (p.o) return esc(p.o[v] || v); if (p.t === 'b') return v ? 'tak' : 'nie'; }
  if (typeof v === 'boolean') return v ? 'tak' : 'nie';
  return esc(String(v).slice(0, 80));
}
async function pokazHistorie() {
  const w = okno('Historia zmian', '<p class="wyc">Wczytuję…</p>');
  try {
    const h = await D.historia(S.id);
    $('.okno-tresc', w).innerHTML = h.length ? `<ul class="hist">${h.map((x) => `<li><div><b>${esc(etykieta(x.pole))}</b>: ${pokazWartosc(x.pole, x.stara)} → ${pokazWartosc(x.pole, x.nowa)}</div><div class="kiedy">${esc(x.kto || '')} · ${new Date(x.kiedy).toLocaleString('pl-PL', { dateStyle: 'medium', timeStyle: 'short' })}</div></li>`).join('')}</ul>` : '<p class="wyc">Brak zapisanych zmian (albo nie dotarły jeszcze na serwer).</p>';
  } catch { $('.okno-tresc', w).innerHTML = '<p class="wyc">Historia jest na serwerze. Połącz się z internetem, żeby ją zobaczyć.</p>'; }
}
function potwierdz(tytul, tresc, przycisk) {
  return new Promise((ok) => {
    const w = okno(tytul, `<p>${tresc}</p><div class="rzad" style="justify-content:flex-end;margin-top:14px"><button class="btn" data-n>Anuluj</button><button class="btn zly" data-t>${esc(przycisk)}</button></div>`);
    w.addEventListener('click', (e) => { if (e.target.closest('[data-t]')) { w.remove(); ok(true); } else if (e.target.closest('[data-n]') || !document.body.contains(w)) { w.remove(); ok(false); } });
  });
}
async function kopiuj(tekst) {
  try { await navigator.clipboard.writeText(tekst); }
  catch {
    const t = document.createElement('textarea'); t.value = tekst; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove();
  }
  toast('Skopiowano');
}

// ---------- kliknięcia ----------
const SEK_DLA = { podstawy: 'podstawy', cena: 'podstawy', prowizja: 'podstawy', pow: 'lokal', pokoje: 'lokal', pietro: 'lokal', wlasnosc: 'lokal', rok: 'lokal', ogrzewanie: 'lokal',
  lokalizacja: 'lokalizacja', czynsz: 'koszty', kaucja: 'koszty', dostepne: 'koszty', swiad: 'energia', swiadPola: 'energia', pomieszczenia: 'pom', minusy: 'minusy',
  okolica: 'okolica', atuty: 'atuty', kw: 'weryfikacja', kwN: 'weryfikacja' };
document.addEventListener('click', async (e) => {
  const zdjImg = e.target.closest('.zdj .obraz img');
  if (zdjImg) return podgladZdjecia(zdjImg.dataset.mini);
  const b = e.target.closest('[data-a]');
  if (!b) return;
  const a = b.dataset.a;
  if (b.tagName === 'A' && b.getAttribute('href') === '#') e.preventDefault();
  const o = S.id ? D.oferta(S.id) : null;
  switch (a) {
    case 'nowa': {
      e.preventDefault();
      const id = M.noweId(10);
      await D.zmien(id, M.nowaOferta(id, D.stan.konto?.nazwa));
      idzDo(`#/o/${id}/karta`);
      setTimeout(() => $('#f-roboczy')?.focus(), 80);
      break;
    }
    case 'filtr': S.filtr = b.dataset.v; odswiezListe(); break;
    case 'sync': D.synchronizuj().then(() => toast(D.stan.blad || 'Zsynchronizowano')); break;
    case 'skok': $(`#sek-${b.dataset.v}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); break;
    case 'podglad': e.preventDefault(); S.podglad = b.dataset.v; odswiez(); break;
    case 'zr': {
      const zr = { ...(o.zr || {}) };
      zr[b.dataset.k] = zr[b.dataset.k] === b.dataset.v ? undefined : b.dataset.v;
      D.zmien(o.id, { zr: JSON.parse(JSON.stringify(zr)) });
      break;
    }
    case 'dodaj-wiersz': {
      const l = b.dataset.l;
      D.zmien(o.id, { [l]: [...(o[l] || []), { id: M.noweId(6) }] });
      setTimeout(() => { const w = $$(`#sek-${l} .wiersz`); w[w.length - 1]?.querySelector('input')?.focus(); }, 60);
      break;
    }
    case 'usun-wiersz': {
      const l = b.dataset.l, i = Number(b.dataset.i);
      const arr = [...(o[l] || [])];
      const el = arr[i];
      if (l === 'pom' && (o.zdj || []).some((z) => z.pom === el?.id)) {
        if (!(await potwierdz('Usunąć pomieszczenie?', 'Ma przypisane zdjęcia. Zdjęcia zostaną, ale bez przypisania.', 'Usuń'))) return;
        D.zmien(o.id, { zdj: (o.zdj || []).map((z) => (z.pom === el.id ? { ...z, pom: undefined } : z)).map((z) => JSON.parse(JSON.stringify(z))) });
      }
      arr.splice(i, 1);
      D.zmien(o.id, { [l]: arr });
      break;
    }
    case 'kopiuj': {
      const co = b.dataset.co;
      const t = co === 'tytul' ? M.tytul(o) : co === 'opis' ? M.opis(o, { agent: agent() }) : co === 'krotki' ? M.krotki(o, { agent: agent() }) : M.polaPortalu(o)[Number(b.dataset.v)]?.v;
      if (t) kopiuj(t);
      break;
    }
    case 'zdj-ruch': {
      const zdj = [...(o.zdj || [])];
      const i = zdj.findIndex((z) => z.id === b.dataset.z), j = i + Number(b.dataset.v);
      if (i < 0 || j < 0 || j >= zdj.length) return;
      [zdj[i], zdj[j]] = [zdj[j], zdj[i]];
      D.zmien(o.id, { zdj });
      break;
    }
    case 'zdj-gl': {
      const z0 = (o.zdj || []).find((z) => z.id === b.dataset.z);
      if (z0?.wiz) return toast('Wizualizacja nie może być zdjęciem głównym.', 3000);
      D.zmien(o.id, { zdj: (o.zdj || []).map((z) => ({ ...z, glowne: z.id === b.dataset.z })) });
      break;
    }
    case 'zdj-wiz': {
      const z0 = (o.zdj || []).find((z) => z.id === b.dataset.z);
      if (!z0) return;
      if (!z0.wiz && !(await potwierdz('Oznaczyć jako wizualizację?', 'Wizualizacja to zdjęcie z meblami lub wystrojem dodanym cyfrowo. W ogłoszeniu dostanie podpis „Wizualizacja”, a obok musi być oryginalne zdjęcie tego samego pomieszczenia.', 'Oznacz'))) return;
      D.zmien(o.id, { zdj: (o.zdj || []).map((z) => (z.id === z0.id ? JSON.parse(JSON.stringify({ ...z, wiz: !z.wiz || undefined, glowne: z.wiz ? z.glowne : undefined, oryg: z.wiz ? undefined : z.oryg })) : z)) });
      break;
    }
    case 'zdj-usun': {
      if (!(await potwierdz('Usunąć zdjęcie?', 'Zniknie z oferty na wszystkich urządzeniach i z serwera.', 'Usuń'))) return;
      const id = b.dataset.z;
      const zdj = (o.zdj || []).filter((z) => z.id !== id).map((z) => (z.oryg === id ? { ...z, oryg: undefined } : z)).map((z) => JSON.parse(JSON.stringify(z)));
      if (!zdj.some((z) => z.glowne)) { const p = zdj.find((z) => !z.wiz); if (p) p.glowne = true; }
      await D.zmien(o.id, { zdj });
      D.usunZdjeciePlik(id);
      break;
    }
    case 'pobierz-zdj': pobierzZdjecia(o); break;
    case 'historia': pokazHistorie(); break;
    case 'usun-oferte': {
      if (!(await potwierdz('Usunąć ofertę?', 'Oferta i jej zdjęcia znikną na obu kontach. Jeśli transakcja się zakończyła, lepiej ustaw status „Zakończona”.', 'Usuń na zawsze'))) return;
      await D.usunOferte(o.id);
      idzDo('#/');
      toast('Oferta usunięta');
      break;
    }
    case 'idz': {
      const id = b.dataset.id, zak = b.dataset.zak;
      const sekc = SEK_DLA[id];
      if (zak === 'zdjecia') idzDo(`#/o/${o.id}/zdjecia`);
      else if (zak === 'ogloszenie') { if (szeroki.matches) { S.podglad = 'ogloszenie'; odswiez(); } else idzDo(`#/o/${o.id}/ogloszenie`); }
      else {
        idzDo(`#/o/${o.id}/karta`);
        if (sekc) setTimeout(() => { const s = $(`#sek-${sekc}`); s?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 80);
      }
      break;
    }
    case 'push-on': try { await D.wlaczPush(); toast('Powiadomienia włączone'); } catch (er) { toast(er.message, 4500); } break;
    case 'push-off': try { await D.wylaczPush(); toast('Powiadomienia wyłączone'); } catch (er) { toast(er.message, 4500); } break;
    case 'wyloguj':
      if (!(await potwierdz('Wylogować to urządzenie?', 'Niewysłane zmiany z tego urządzenia zostaną wysłane po ponownym zalogowaniu.', 'Wyloguj'))) return;
      await D.wyloguj(); render(); break;
  }
});

// ---------- bez powiększania (szczypanie, podwójne stuknięcie) ----------
for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });

// ---------- start ----------
addEventListener('hashchange', trasa);
szeroki.addEventListener('change', () => { resetEdytora(); trasa(); });
D.naZmiane(() => { if (!D.stan.token && zbudowany) { render(); return; } odswiez(); });
await D.start();
render();
trasa();
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
  let przeladowano = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (przeladowano) return;
    const odswiezTeraz = () => { przeladowano = true; location.reload(); };
    if (/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || '')) document.addEventListener('focusout', odswiezTeraz, { once: true });
    else odswiezTeraz();
  });
  navigator.serviceWorker.addEventListener('message', (e) => { if (e.data?.oid) idzDo(`#/o/${e.data.oid}/karta`); });
}
