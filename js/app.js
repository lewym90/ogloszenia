// AM Oferty — interfejs (wygląd 1:1 z renderem właściciela).
import * as M from './model.js';
import * as D from './dane.js';
import { zrobZip } from './zip.js';

export const WERSJA = '1.2.0';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const IK = {
  plus: '<path d="M12 4.5v15M4.5 12h15"/>', wstecz: '<path d="M14.5 5.5L8 12l6.5 6.5"/>', prawo: '<path d="M9.5 5.5L16 12l-6.5 6.5"/>', lewo: '<path d="M14.5 5.5L8 12l6.5 6.5"/>',
  dol: '<path d="M6 9.5l6 6 6-6"/>', kopiuj: '<rect x="8.5" y="8.5" width="11" height="12" rx="2"/><path d="M15.5 8.5V5.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2"/>',
  gwiazda: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>', kosz: '<path d="M4 7h16M9 7V4.5h6V7M6 7l1 13h10l1-13"/>',
  aparat: '<path d="M4 8.5h3l1.8-2.5h6.4L17 8.5h3V19H4z"/><circle cx="12" cy="13.3" r="3.4"/>', ok: '<path d="M5 12.5l4.5 4.5L19 7"/>', x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  uwaga: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17.3v.4"/>', zegar: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>', pobierz: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  szukaj: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="M20 20l-4.4-4.4"/>', dom: '<path d="M4 10.5L12 4l8 6.5V20h-5.5v-6h-5v6H4z"/>',
  ust: '<circle cx="12" cy="12" r="3.1"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  wiz: '<path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z"/><path d="M18.5 14.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>', wysyla: '<path d="M12 19V7M7 12l5-5 5 5"/>',
  serce: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z"/>',
  dzwonek: '<path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 1.5h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  suwaki: '<path d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h11M19 17h1"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="17" r="2"/>',
  dok: '<path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20z"/><path d="M14 3.5V8h4M9.5 12h5M9.5 15h5M9.5 18h3"/>',
  linijka: '<rect x="2.8" y="8.5" width="18.4" height="7" rx="1" transform="rotate(-35 12 12)"/><path d="M8.4 9.3l1.2 1.7M10.9 7.5l1.2 1.7M13.3 5.8l1.2 1.7M6 11l1.2 1.7"/>',
  oko: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  osoba: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20c.8-3.8 3.6-5.6 7-5.6s6.2 1.8 7 5.6"/>',
  kropki: '<circle cx="5.5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18.5" cy="12" r="1.3"/>',
  okKolo: '<circle cx="12" cy="12" r="9"/><path d="M7.8 12.3l2.8 2.8 5.6-5.6"/>',
};
const ik = (n, kl = '') => `<svg class="ik ${kl}" viewBox="0 0 24 24" aria-hidden="true">${IK[n]}</svg>`;

// ---------- stan interfejsu ----------
const S = { ekran: 'lista', id: null, tab: 'karta', sek: null, podglad: 'ogloszenie', q: '', filtr: 'aktywne', wiecej: false, pomDodawania: '', postep: '' };
const szeroki = matchMedia('(min-width: 1180px)');
const telefon = matchMedia('(max-width: 759px)');
const obrazy = new Map(); // `${id}:${rodzaj}` -> url
let zbudowany = false;

function toast(t, ms = 2200) {
  const el = $('#toast'); el.textContent = t; el.classList.add('wid');
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('wid'), ms);
}
function trasa() {
  const h = location.hash.replace(/^#\/?/, '').split('/');
  if (h[0] === 'o' && h[1]) {
    S.ekran = 'oferta'; if (S.id !== h[1]) { S.id = h[1]; resetEdytora(); }
    if (h[2] === 's' && h[3]) { S.tab = 'sekcja'; S.sek = h[3]; } else { S.tab = h[2] || 'karta'; S.sek = null; }
  }
  else if (h[0] === 'ustawienia') { S.ekran = 'ustawienia'; S.id = null; resetEdytora(); }
  else { S.ekran = 'lista'; S.id = null; resetEdytora(); }
  odswiez();
}
const idzDo = (h) => { if (location.hash !== h) location.hash = h; else trasa(); };
function resetEdytora() {
  $$('[data-wstaw]').forEach((el) => { el.__html = null; });
  const t = $('#ed-tresc'); if (t) { t.__klucz = null; }
  const k = $('.kol-edytor'); if (k) k.scrollTop = 0;
}

// wstawia HTML tylko gdy się zmienił i nikt w tym fragmencie nie pisze
function wstaw(el, html) {
  if (!el || el.__html === html) return;
  const a = document.activeElement;
  if (a && a !== document.body && el.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && !['checkbox', 'radio'].includes(a.type)) { el.__czeka = true; return; }
  el.innerHTML = html; el.__html = html; el.__czeka = false;
  wypelnijObrazy(el);
}
function wypelnijObrazy(el) {
  for (const img of $$('img[data-mini]', el)) {
    if (img.getAttribute('src')) continue;
    const id = img.dataset.mini;
    D.urlZdjecia(id, 'mini').then((u) => { if (u) { obrazy.set(`${id}:mini`, u); img.src = u; } });
  }
  for (const d of $$('[data-foto]', el)) {
    if (d.style.backgroundImage) continue;
    const id = d.dataset.foto, r = d.dataset.r || 'sr';
    D.urlZdjecia(id, r).then((u) => { if (u) { obrazy.set(`${id}:${r}`, u); d.style.backgroundImage = `url("${u}")`; d.classList.remove('puste'); } });
  }
}
const imgMini = (id, alt = '') => `<img data-mini="${esc(id)}" alt="${esc(alt)}" ${obrazy.has(`${id}:mini`) ? `src="${obrazy.get(`${id}:mini`)}"` : ''} loading="lazy">`;
function glowneZdjecie(o) { const z = o.zdj || []; return z.find((x) => x.glowne) || z.find((x) => !x.wiz) || null; }
function fotoHTML(o, kl = '') {
  const gl = glowneZdjecie(o);
  if (!gl) return `<div class="foto puste ${kl}"></div>`;
  const u = obrazy.get(`${gl.id}:sr`);
  return `<div class="foto ${u ? '' : 'puste'} ${kl}" data-foto="${gl.id}" data-r="sr" ${u ? `style="background-image:url('${u}')"` : ''}></div>`;
}
const agent = () => ({ firma: D.stan.agent.firma || 'AM Nieruchomości', haslo: D.stan.agent.haslo ?? 'Sprawdzone do końca.', nazwa: D.stan.agent.nazwa || D.stan.konto?.nazwa || '', telefon: D.stan.agent.telefon || D.stan.konto?.telefon || '' });
function pierscien(p, kl = '') {
  const c = 2 * Math.PI * 25;
  if (kl.includes('maly') && p >= 100) return ik('okKolo', 'sek-ok');
  return `<span class="pierscien ${kl}"><svg viewBox="0 0 58 58"><circle class="tor" cx="29" cy="29" r="25" fill="none" stroke-width="3"/><circle class="pas" cx="29" cy="29" r="25" fill="none" stroke-width="3.4" stroke-linecap="round" stroke-dasharray="${(c * Math.max(0, Math.min(100, p))) / 100} ${c}"/></svg>${kl.includes('maly') ? '' : `<span>${p}%</span>`}</span>`;
}
const IK_STATUS = { przygotowanie: 'zegar', gotowa: 'okKolo', opublikowana: 'okKolo', rezerwacja: 'zegar', zakonczona: 'ok' };
const statusHTML = (s, dod = '') => `<span class="status st-${s}">${ik(IK_STATUS[s] || 'zegar')}${esc(M.STATUSY[s] || s)}${dod}</span>`;
function cenaHTML(o, kl) {
  if (!o.cena) return `<div class="${kl} brak">Bez ceny</div>`;
  return `<div class="${kl} zloty-tekst">${esc(M.zl(o.cena))}${o.transakcja === 'najem' ? '<small>/ mies.</small>' : ''}</div>`;
}
function parametry(o) {
  const p = [];
  if (o.pokoje) p.push(`${o.pokoje} ${M.pokojeSlowo(o.pokoje)}`);
  else if (o.rodzaj) p.push(M.RODZAJE[o.rodzaj]);
  if (o.pow) p.push(M.m2(o.pow));
  if (o.dzielnica) p.push(o.dzielnica); else if (o.miasto) p.push(o.miasto);
  return p.join('  •  ');
}

// ---------- logowanie ----------
function ekranLogowania() {
  zbudowany = false;
  $('#app').innerHTML = `<div class="logowanie"><form id="f-log" class="szklo" autocomplete="on">
    <img class="znak" src="img/monogram.png" alt="AM">
    <h1 class="zloty-tekst">AM Oferty</h1>
    <p>Karta nieruchomości i ogłoszenia</p>
    <div class="pole"><label class="et" for="l-login">Login</label><div class="wejscie"><input id="l-login" name="username" autocomplete="username" autocapitalize="none" autocorrect="off" required></div></div>
    <div class="pole"><label class="et" for="l-haslo">Hasło</label><div class="wejscie"><input id="l-haslo" name="password" type="password" autocomplete="current-password" required></div></div>
    <button class="btn zloty" type="submit">Zaloguj</button>
    <div class="blad" id="l-blad">${esc(D.stan.blad)}</div>
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
    <header class="pasek" id="pasek" data-wstaw></header>
    <aside class="kol-lista">
      <div class="lista-gora">
        <label class="szukaj szklo">${ik('szukaj')}<input id="szukaj" type="search" placeholder="Szukaj oferty, adresu, dzielnicy…" aria-label="Szukaj" autocomplete="off"><button type="button" data-a="wiecej" aria-label="Więcej filtrów">${ik('suwaki')}</button></label>
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
  odswiezPasek(); odswiezListe(); odswiezDol();
  if (S.ekran === 'oferta') odswiezOferte();
  else if (S.ekran === 'ustawienia') odswiezUstawienia();
  else odswiezPusty();
}
function syncHTML() {
  const n = D.ileWKolejce();
  if (!D.stan.online) return `<span class="stan-sync"><i></i>Offline${n ? ` · ${n} czeka` : ''}</span>`;
  if (D.stan.blad) return `<button class="stan-sync zle" data-a="sync"><i></i>${esc(D.stan.blad)}</button>`;
  if (n) return `<span class="stan-sync"><i></i>Wysyłam ${n}</span>`;
  return '';
}
function odswiezPasek() {
  const tyt = S.ekran === 'ustawienia' && telefon.matches ? 'Ustawienia' : 'Oferty';
  wstaw($('#pasek'), `<a class="marka" href="#/"><img src="img/monogram.png" alt="AM"><i></i><h1 class="zloty-tekst">${tyt}</h1></a>
    <span class="rozp"></span>${syncHTML()}
    <button class="dzwonek" data-a="aktywnosc" aria-label="Zmiany wspólnika">${ik('dzwonek')}${D.nowaAktywnosc() ? '<b></b>' : ''}</button>
    <button class="okragly nie-telefon" data-a="nowa" title="Nowa oferta" aria-label="Nowa oferta">${ik('plus')}</button>
    <a class="okragly nie-telefon" href="#/ustawienia" title="Ustawienia" aria-label="Ustawienia">${ik('ust')}</a>`);
}
function odswiezDol() {
  wstaw($('#dol'), `<a href="#/" class="${S.ekran === 'lista' ? 'akt' : ''}">${ik('dom')}Oferty</a>
    <a href="#" data-a="nowa" class="nowa" aria-label="Nowa oferta"><span>${ik('plus')}</span></a>
    <a href="#/ustawienia" class="${S.ekran === 'ustawienia' ? 'akt' : ''}">${ik('ust')}Ustawienia</a>`);
}

// ---------- lista ----------
const FILTRY_GL = { aktywne: 'Aktywne', przygotowanie: 'W przygotowaniu', opublikowana: 'Opublikowane' };
const FILTRY_DOD = { gotowa: 'Gotowe do publikacji', rezerwacja: 'Rezerwacja', zakonczona: 'Zakończone', wszystkie: 'Wszystkie' };
function odswiezListe() {
  const f = { ...FILTRY_GL, ...(S.wiecej || FILTRY_DOD[S.filtr] ? FILTRY_DOD : {}) };
  wstaw($('#filtry'), Object.entries(f).map(([k, v]) => `<button class="chip ${S.filtr === k ? 'akt' : ''}" data-a="filtr" data-v="${k}">${esc(v)}</button>`).join(''));
  const q = S.q.trim().toLowerCase();
  const lista = D.oferty()
    .filter((o) => S.filtr === 'wszystkie' || (S.filtr === 'aktywne' ? o.status !== 'zakonczona' : o.status === S.filtr))
    .filter((o) => !q || [o.roboczy, o.ulica, o.dzielnica, o.miasto, o.wlImie, M.tytul(o)].join(' ').toLowerCase().includes(q))
    .sort((a, b) => (b.ulubiona ? 1 : 0) - (a.ulubiona ? 1 : 0) || (b._zmieniona || Date.now()) - (a._zmieniona || Date.now()));
  let html;
  if (!lista.length) {
    html = D.oferty().length
      ? '<div class="pusto">Brak ofert dla tego filtra.</div>'
      : `<div class="pusto szklo"><h2>Pierwsza oferta</h2><p>Dodaj nieruchomość, uzupełnij kartę i zdjęcia. Ogłoszenie złoży się samo z faktów.</p><button class="btn zloty" data-a="nowa">${ik('plus')}Nowa oferta</button></div>`;
  } else {
    html = lista.map((o) => {
      const g = M.gotowosc(o);
      return `<a class="karta ${o.id === S.id ? 'akt' : ''}" href="#/o/${o.id}">
        ${fotoHTML(o)}
        <button class="serce ${o.ulubiona ? 'akt' : ''}" data-a="ulub" data-oid="${o.id}" aria-label="${o.ulubiona ? 'Usuń z wyróżnionych' : 'Wyróżnij'}">${ik('serce')}</button>
        <div class="karta-tresc">
          ${o.roboczy ? `<div class="karta-nazwa">${esc(o.roboczy)}</div>` : ''}
          ${cenaHTML(o, 'cena-duza')}
          <div class="parametry">${esc(parametry(o))}</div>
          <div class="karta-stopka">${statusHTML(o.status)}<span class="rozp"></span>${pierscien(g.procent)}<span class="strz">${ik('prawo')}</span></div>
        </div></a>`;
    }).join('');
  }
  wstaw($('#karty'), html);
}
function odswiezPusty() {
  const e = $('#edytor'); e.dataset.tryb = 'pusty';
  wstaw(e, '<div class="pusto" style="padding-top:18vh"><h2>Wybierz ofertę</h2><p>albo dodaj nową przyciskiem +</p></div>');
  $('#podglad').innerHTML = ''; $('#podglad').__html = null;
}

// ---------- oferta ----------
// Karta = spis kafelków; każda sekcja, zdjęcia, ogłoszenie i kontrola to osobny ekran.
const SEK_KARTY = [
  ['podstawy', 'Podstawy'], ['lokalizacja', 'Lokalizacja'], ['lokal', 'Nieruchomość'], ['pom', 'Pomieszczenia'], ['koszty', 'Koszty'],
  ['atuty', 'Atuty'], ['minusy', 'Co warto wiedzieć'], ['okolica', 'Okolica'], ['weryfikacja', 'Sprawdziliśmy'], ['energia', 'Świadectwo'],
  ['wlasciciel', 'Właściciel i umowa'],
];
const EKRANY = [...SEK_KARTY.map(([k, n]) => ({ k, n, sek: true })), { k: 'zdjecia', n: 'Zdjęcia' }, { k: 'ogloszenie', n: 'Ogłoszenie' }, { k: 'kontrola', n: 'Kontrola' }];
const hashEkranu = (oid, k) => (['zdjecia', 'ogloszenie', 'kontrola'].includes(k) ? `#/o/${oid}/${k}` : `#/o/${oid}/s/${k}`);
// ikony kafelków bez grafiki z arkusza — złota linia w tym samym stylu
const IK_ZLOTE = {
  zdjecia: '<path d="M4 8.5h3.2l1.9-2.6h5.8l1.9 2.6H20V19H4z"/><circle cx="12" cy="13.4" r="3.6"/><path d="M17.3 10.6h.01"/>',
  ogloszenie: '<path d="M6.5 3.5h8l3.5 3.5v13.5h-11.5z"/><path d="M14.5 3.5V7H18M9 10.5h6M9 13.5h6M9 16.5h4"/>',
  kontrola: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3.2"/>',
};
const ikonaEkranu = (k) => (IK_ZLOTE[k]
  ? `<svg class="ik-zlota" viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="url(#zloto)" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round">${IK_ZLOTE[k]}</g></svg>`
  : `<img class="ik-zlota" src="img/ikony/${k}.png" alt="">`);

// grupy pól w sekcjach; pola z POL stają po dwa obok siebie
const GRUPY = {
  podstawy: [['Oferta', ['transakcja', 'rodzaj', 'roboczy']], ['Cena', ['cena', 'cenaNeg']], ['Prowizja od klienta', ['prowizjaKl', 'prowizjaKlCzynsz', 'prowizjaKlTekst']]],
  lokalizacja: [['Adres', ['miasto', 'dzielnica', 'ulica', 'pokazUlice']]],
  lokal: [['Wielkość', ['pow', 'dzialkaPow', 'pokoje', 'nieprzechodnie']], ['Piętro', ['pietro', 'pieter', 'winda']], ['Budynek', ['rok', 'material', 'technologia']],
    ['Stan i wnętrze', ['stan', 'ogrzewanie', 'okna', 'ekspozycja', 'umeblowanie']], ['Dodatki', ['balkon', 'balkonPow', 'piwnica', 'parking', 'parkingCena']], ['Własność', ['wlasnosc']]],
  koszty: [['Opłaty miesięczne', ['czynsz', 'czynszObejmuje', 'media']], ['Dostępność', ['dostepneOd', 'minOkres', 'umowaNajmu']], ['Najemca', ['kaucja', 'zwierzeta']]],
  energia: [['Świadectwo', ['swiad']], ['Wskaźniki', ['eu', 'ek', 'ep', 'oze', 'co2']], ['Dokument', ['swiadNr', 'swiadDo']]],
  wlasciciel: [['Właściciel', ['wlImie', 'wlTel', 'wlEmail']], ['Umowa pośrednictwa', ['umowaNr', 'umowaData', 'umowaDo', 'wylacznosc', 'prowizjaWl']], ['Notatki', ['notatki']]],
};
// krótkie etykiety dla pól stojących po dwa obok siebie
const KROTKIE = { pietro: 'Piętro', pieter: 'Pięter', material: 'Rodzaj', balkonPow: 'Powierzchnia', parkingCena: 'Dopłata', dostepneOd: 'Dostępne od', minOkres: 'Min. okres',
  umowaData: 'Data umowy', umowaDo: 'Ważna do', swiadNr: 'Numer', swiadDo: 'Ważne do', eu: 'EU', ek: 'EK', ep: 'EP', oze: 'Udział OZE', co2: 'Emisja CO₂', umowaNr: 'Numer umowy', dzielnica: 'Dzielnica', parking: 'Parking', ogrzewanie: 'Ogrzewanie', technologia: 'Technologia' };
const PODPOWIEDZI = { pietro: '0 = parter', eu: 'kWh/(m²·rok)', ek: 'kWh/(m²·rok)', ep: 'kWh/(m²·rok)' };
const POL = new Set(['pietro', 'pieter', 'rok', 'material', 'technologia', 'stan', 'ogrzewanie', 'okna', 'balkonPow', 'parkingCena', 'dostepneOd', 'minOkres',
  'kaucja', 'eu', 'ek', 'ep', 'oze', 'co2', 'swiadNr', 'swiadDo', 'umowaNr', 'umowaData', 'umowaDo', 'miasto', 'dzielnica', 'piwnica', 'parking', 'umeblowanie']);
const POLE = Object.fromEntries(M.SEKCJE.flatMap((s) => s.pola.map((p) => [p.k, p])));
const puste = (v) => v === undefined || v === null || v === '';

function licznikSekcji(k, o) {
  const sek = M.SEKCJE.find((s) => s.id === k);
  if (sek) {
    const pola = sek.pola.filter((p) => M.poleWidoczne(p, o) && p.t !== 'b');
    return { z: pola.filter((p) => !puste(o[p.k]) || (p.nieWiem && o[p.nieWiem])).length, w: pola.length };
  }
  if (k === 'pom') { const p = (o.pom || []).filter((x) => x.nazwa); return { z: p.filter((x) => !puste(x.m)).length, w: Math.max(p.length, 1) }; }
  if (k === 'atuty') return { z: Math.min(2, (o.atuty || []).filter((a) => a.t).length), w: 2 };
  if (k === 'minusy') return { z: Math.min(1, (o.minusy || []).filter((a) => a.t).length), w: 1 };
  if (k === 'okolica') return { z: Math.min(3, (o.okolica || []).filter((a) => a.nazwa && a.min).length), w: 3 };
  if (k === 'weryfikacja') { const l = M.WERYFIKACJA.filter((x) => !x.dla || x.dla === o.transakcja); return { z: l.filter((x) => o.weryf?.[x.k]?.ok).length, w: l.length }; }
  const L = M.checklista(o);
  if (k === 'zdjecia') { const z = L.filter((x) => x.zakladka === 'zdjecia'); return { z: z.filter((x) => x.ok).length, w: z.length }; }
  if (k === 'ogloszenie') { const n = M.kontrolaSlow(o).length; return { z: n ? 0 : 1, w: 1 }; }
  if (k === 'kontrola') { const t = L.filter((x) => x.twarde); return { z: t.filter((x) => x.ok).length, w: t.length }; }
  return null;
}
const wsk = (l) => (!l ? '' : l.z >= l.w && l.w > 0 ? ik('okKolo', 'sek-ok') : pierscien(Math.round((l.z / Math.max(1, l.w)) * 100), 'maly'));
function podsumowanie(k, o) {
  const najem = o.transakcja === 'najem';
  const j = (a) => a.filter(Boolean).join('  ·  ');
  switch (k) {
    case 'podstawy': return j([M.TRANSAKCJE[o.transakcja] && (najem ? 'Wynajem' : 'Sprzedaż'), M.RODZAJE[o.rodzaj], o.cena && `${M.zl(o.cena)}${najem ? '/mies.' : ''}`]);
    case 'lokalizacja': return j([o.miasto, o.dzielnica, o.ulica && `ul. ${o.ulica}`]);
    case 'lokal': return j([o.pow && M.m2(o.pow), o.pokoje && `${o.pokoje} ${M.pokojeSlowo(o.pokoje)}`, !puste(o.pietro) && `${Number(o.pietro) === 0 ? 'parter' : o.pietro}${o.pieter ? `/${o.pieter}` : ''}`, o.winda === 'tak' && 'winda', o.rok]);
    case 'pom': { const p = (o.pom || []).filter((x) => x.nazwa); const s = p.reduce((a, x) => a + (Number(x.m) || 0), 0); return p.length ? j([`${p.length} ${p.length === 1 ? 'pomieszczenie' : p.length < 5 ? 'pomieszczenia' : 'pomieszczeń'}`, s && M.m2(Math.round(s * 100) / 100)]) : 'brak'; }
    case 'koszty': return j([!puste(o.czynsz) && `czynsz ${M.zl(o.czynsz)}`, o.media && `media ${M.zl(o.media)}`, najem && o.kaucja && `kaucja ${M.zl(o.kaucja)}`]) || 'brak';
    case 'atuty': case 'minusy': { const n = (o[k] || []).filter((a) => a.t).length; return n ? `${n} ${n === 1 ? 'punkt' : n < 5 ? 'punkty' : 'punktów'}` : 'brak'; }
    case 'okolica': { const n = (o.okolica || []).filter((a) => a.nazwa).length; return n ? `${n} ${n === 1 ? 'miejsce' : n < 5 ? 'miejsca' : 'miejsc'}` : 'brak'; }
    case 'weryfikacja': { const l = licznikSekcji(k, o); return `${l.z} z ${l.w} sprawdzone`; }
    case 'energia': return o.swiad === 'tak' ? j(['sporządzone', !puste(o.ep) && `EP ${M.liczba(o.ep)}`]) : o.swiad === 'nie' ? 'w przygotowaniu' : 'brak odpowiedzi';
    case 'wlasciciel': return j([o.wlImie, o.umowaNr && `umowa ${o.umowaNr}`, o.wylacznosc && 'wyłączność']) || 'brak';
    case 'zdjecia': { const z = o.zdj || []; return z.length ? j([`${z.length} zdjęć`, z.some((x) => x.pom === 'rzut') && 'rzut', z.some((x) => x.wiz) && 'wizualizacje']) : 'brak'; }
    case 'ogloszenie': { const n = M.kontrolaSlow(o).length; return j([`${M.opis(o, { agent: agent() }).length} znaków`, n ? `${n} do poprawy` : 'bez uwag']); }
    case 'kontrola': { const g = M.gotowosc(o); return j([M.STATUSY[o.status], g.braki.length ? `${g.braki.length} do uzupełnienia` : 'komplet']); }
  }
  return '';
}

function odswiezOferte() {
  const o = D.oferta(S.id);
  const e = $('#edytor');
  if (!o) {
    e.dataset.tryb = 'brak'; e.__html = null;
    e.innerHTML = `<div class="naglowek-ekranu"><a class="okragly" href="#/">${ik('wstecz')}</a></div><div class="pusto"><h2>Nie ma tej oferty</h2><p>Mogła zostać usunięta.</p><a class="btn" href="#/">Wróć do listy</a></div>`;
    return;
  }
  const klucz = `${o.id}:${S.tab}:${S.sek || ''}`;
  if (e.dataset.tryb !== 'oferta' || e.__klucz !== klucz) {
    e.dataset.tryb = 'oferta'; e.__klucz = klucz; e.scrollTop = 0;
    e.innerHTML = '<div id="of-gora" data-wstaw></div><div class="tresc" id="ed-tresc"></div><div id="of-dol" data-wstaw></div>';
  }
  const t = $('#ed-tresc');
  if (S.tab === 'karta') {
    wstaw($('#of-gora'), naglowekSpisu(o));
    wstaw(t, spisHTML(o));
    wstaw($('#of-dol'), '');
  } else {
    const k = S.tab === 'sekcja' ? S.sek : S.tab;
    const ekr = EKRANY.find((x) => x.k === k);
    if (!ekr) { idzDo(`#/o/${o.id}`); return; }
    const prawy = k === 'ogloszenie'
      ? `<button class="btn kontur maly" data-a="kopiuj" data-co="opis">${ik('kopiuj')}Kopiuj</button>`
      : k === 'kontrola' ? pierscien(M.gotowosc(o).procent) : `<span class="licz-ekranu">${(() => { const l = licznikSekcji(k, o); return l ? `${wsk(l)}` : ''; })()}</span>`;
    wstaw($('#of-gora'), `<div class="naglowek-ekranu"><a class="okragly" href="#/o/${o.id}" aria-label="Wróć do karty">${ik('wstecz')}</a>${ikonaEkranu(k)}<h1 class="zloty-tekst">${esc(ekr.n)}</h1>${prawy}</div>`);
    if (k === 'zdjecia') tabZdjecia(t, o);
    else if (k === 'ogloszenie') wstaw(t, htmlTekstOgloszenia(o) + htmlOgloszenie(o, false));
    else if (k === 'kontrola') wstaw(t, htmlKontrola(o));
    else wstaw(t, ekranSekcji(k, o));
    const i = EKRANY.findIndex((x) => x.k === k);
    const pop = EKRANY[i - 1], nast = EKRANY[i + 1];
    wstaw($('#of-dol'), `<nav class="nawigacja-sek">${pop ? `<a class="btn kontur" href="${hashEkranu(o.id, pop.k)}">${ik('lewo')}<span class="nr">${String(i).padStart(2, '0')}</span><span class="tx">${esc(pop.n)}</span></a>` : '<span></span>'}
      ${nast ? `<a class="btn kontur" href="${hashEkranu(o.id, nast.k)}"><span class="nr">${String(i + 2).padStart(2, '0')}</span><span class="tx">${esc(nast.n)}</span>${ik('prawo')}</a>` : `<a class="btn kontur" href="#/o/${o.id}"><span class="tx">Spis karty</span>${ik('prawo')}</a>`}</nav>`);
  }
  const p = $('#podglad');
  if (szeroki.matches) {
    const g = M.gotowosc(o), slowa = M.kontrolaSlow(o).length;
    const zk = `<div class="podglad-zakl"><nav class="segment"><button data-a="podglad" data-v="ogloszenie" class="${S.podglad === 'ogloszenie' ? 'akt' : ''}">Ogłoszenie${slowa ? ` <span class="licznik">${slowa}</span>` : ''}</button><button data-a="podglad" data-v="kontrola" class="${S.podglad === 'kontrola' ? 'akt' : ''}">Kontrola${g.braki.length ? ` <span class="licznik">${g.braki.length}</span>` : ''}</button></nav></div>`;
    wstaw(p, `${zk}<div class="tresc">${S.podglad === 'kontrola' ? htmlKontrola(o) : htmlOgloszenie(o)}</div>`);
  }
}
function naglowekSpisu(o) {
  return `<div class="naglowek-spisu"><a class="marka" href="#/" aria-label="Wróć do listy ofert"><span class="wstecz-maly">${ik('wstecz')}</span><img src="img/monogram.png" alt="AM"><i></i><h1 class="zloty-tekst">Karta</h1></a><span class="rozp"></span>
    <button class="dzwonek" data-a="aktywnosc" aria-label="Zmiany wspólnika">${ik('dzwonek')}${D.nowaAktywnosc() ? '<b></b>' : ''}</button></div>
    <div class="pasek-oferty">${fotoHTML(o)}
      <div class="pasek-oferty-tresc"><h2>${esc(o.roboczy || M.tytul(o))}</h2><div class="zlota-linia"></div>${cenaHTML(o, 'pasek-cena')}</div>
      <div class="pasek-oferty-akcje"><button class="okragly" data-a="menu" aria-label="Więcej">${ik('kropki')}</button><button class="serce ${o.ulubiona ? 'akt' : ''}" data-a="ulub" data-oid="${o.id}" aria-label="Wyróżnij">${ik('serce')}</button></div>
    </div>`;
}
function spisHTML(o) {
  return `<div class="spis">${EKRANY.map((x, i) => {
    const l = licznikSekcji(x.k, o);
    return `<a class="kafel szklo ${x.k === 'wlasciciel' ? 'prywatna' : ''}" href="${hashEkranu(o.id, x.k)}">
      <span class="kafel-ik">${ikonaEkranu(x.k)}</span><i class="kafel-kreska"></i>
      <span class="sek-nr">${String(i + 1).padStart(2, '0')}</span>
      <span class="kafel-tx"><span class="sek-tyt">${esc(x.n)}</span><span class="kafel-pod">${esc(podsumowanie(x.k, o))}</span></span>
      ${wsk(l)}<span class="strz">${ik('prawo')}</span></a>`;
  }).join('')}</div>`;
}
function ekranSekcji(k, o) {
  const opisy = {
    lokal: 'Przy polach ze źródłem stuknij znacznik i wybierz, skąd jest informacja. „Wg właściciela” pojawi się w ogłoszeniu jako dopisek.',
    energia: 'Jeśli świadectwo jest sporządzone, ustawa wymaga podania w ogłoszeniu wszystkich pięciu wskaźników.',
    wlasciciel: 'Te dane widzicie tylko Wy dwaj. Nigdy nie trafiają do ogłoszenia.',
  };
  let h = opisy[k] ? `<p class="sek-opis">${opisy[k]}</p>` : '';
  if (GRUPY[k]) {
    for (const [nazwa, klucze] of GRUPY[k]) {
      const pola = klucze.map((x) => POLE[x]).filter((p) => p && M.poleWidoczne(p, o));
      if (!pola.length) continue;
      // pola „połówkowe” łączymy w pary; jeśli któreś zostaje samo, dostaje całą szerokość
      const html = []; let seria = [];
      const zamknij = () => { seria.forEach((p, i) => html.push(poleHTML(p, o, seria.length % 2 === 1 && i === seria.length - 1))); seria = []; };
      for (const p of pola) { if (POL.has(p.k) && !p.zr && p.t !== 'b' && !(p.t === 'w' && pigulkiPasuja(p))) seria.push(p); else { zamknij(); html.push(poleHTML(p, o)); } }
      zamknij();
      h += grupa(nazwa, `<div class="siatka">${html.join('')}</div>`);
    }
    if (k === 'lokalizacja') h += `<datalist id="dl-dzielnice">${M.DZIELNICE_LUBLIN.map((d) => `<option value="${d}">`).join('')}</datalist>`;
    return `<div id="sek-${k}">${h}</div>`;
  }
  if (k === 'pom') h = sekcjaPom(o);
  else if (k === 'atuty') h = grupa('Atuty', sekcjaListy(o, 'atuty', 'Tylko fakty, które da się sprawdzić: co, kiedy, ile. Bez ocen.', 'np. okna wymienione w 2019 r.'));
  else if (k === 'minusy') h = grupa('Uczciwe minusy', sekcjaListy(o, 'minusy', 'Zanim ktoś je odkryje na prezentacji. To buduje zaufanie i oszczędza czas obu stronom.', 'np. brak windy, 4. piętro'));
  else if (k === 'okolica') h = grupa('Miejsca w pobliżu', sekcjaOkolicy(o));
  else if (k === 'weryfikacja') h = grupa('Sprawdzone dokumenty i fakty', sekcjaWeryfikacji(o));
  return `<div id="sek-${k}">${h}</div>`;
}
const grupa = (nazwa, tresc) => `<section class="grupa szklo"><h2 class="grupa-tyt">${esc(nazwa)}</h2>${tresc}</section>`;
function wartoscPola(p, o) {
  const v = o[p.k];
  if (v === undefined || v === null) return '';
  if (p.t === 'n') return Math.abs(Number(v)) >= 10000 ? M.liczba(v).replace(/ /g, ' ') : String(v).replace('.', ',');
  return String(v);
}
const ZR_IK = { dok: 'dok', pom: 'linijka', ogl: 'oko', wl: 'osoba' };
function pigulkiPasuja(p) { const w = Object.values(p.o); return w.length <= 3 && w.join('').length <= 30; }
function poleHTML(p, o, calaSzerokosc = false) {
  const id = `f-${p.k}`;
  const v = wartoscPola(p, o);
  const pol = POL.has(p.k) && !calaSzerokosc ? 'pol' : '';
  if (p.t === 'b') {
    const inf = p.info ? p.info(o) : '';
    return `<div class="pole pelna"><label class="przel"><span class="tekst">${esc(p.e)}</span><input type="checkbox" data-k="${p.k}" data-t="b" ${o[p.k] ? 'checked' : ''}><span class="suwak"></span></label>${inf ? `<div class="info-pola">${esc(inf)}</div>` : ''}</div>`;
  }
  if (p.t === 'w' && pigulkiPasuja(p)) {
    return `<div class="pole pelna"><span class="et">${esc(p.e)}</span><div class="pigulki" role="group" aria-label="${esc(p.e)}">${Object.entries(p.o).map(([k, n]) => `<button type="button" data-a="wybor" data-k="${p.k}" data-v="${k}" class="${v === k ? 'akt' : ''}" aria-pressed="${v === k}">${esc(n)}</button>`).join('')}</div></div>`;
  }
  let we;
  const jedn = p.k === 'cena' && o.transakcja === 'najem' ? p.jNajem : p.j;
  if (p.t === 'w') we = `<select id="${id}" data-k="${p.k}" data-t="w"><option value="">— wybierz —</option>${Object.entries(p.o).map(([k, n]) => `<option value="${k}" ${v === k ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>`;
  else if (p.t === 'n') we = `<input id="${id}" data-k="${p.k}" data-t="n" inputmode="decimal" autocomplete="off" value="${esc(v)}" placeholder="${p.nieWiem && o[p.nieWiem] ? 'brak informacji' : esc(PODPOWIEDZI[p.k] || '')}">`;
  else if (p.t === 'd') we = `<input id="${id}" data-k="${p.k}" data-t="d" type="date" value="${esc(v)}">`;
  else if (p.dlugi) we = `<textarea id="${id}" data-k="${p.k}" data-t="t" rows="3">${esc(v)}</textarea>`;
  else we = `<input id="${id}" data-k="${p.k}" data-t="t" type="${p.typ || 'text'}" ${p.lista ? `list="dl-${p.lista}"` : ''} placeholder="${esc(p.pl || '')}" value="${esc(v)}" autocomplete="off">`;
  let zr = '';
  if (p.zr && !(p.nieWiem && o[p.nieWiem])) {
    const akt = o.zr?.[p.k];
    const brak = !akt && v !== '' && v !== 'nieznane';
    zr = `<button type="button" class="zr-tag ${akt ? 'akt' : brak ? 'brak' : ''}" data-a="zr-menu" data-k="${p.k}" aria-label="Źródło: ${akt ? M.ZRODLA[akt] : 'nie wybrano'}">${akt ? ik(ZR_IK[akt]) : ''}<span>${akt ? M.ZRODLA[akt] : brak ? 'Źródło?' : 'Źródło'}</span>${ik('dol')}</button>`;
  }
  const nieWiem = p.nieWiem ? `<button type="button" class="nie-wiem ${o[p.nieWiem] ? 'akt' : ''}" data-a="nie-wiem" data-k="${p.k}" data-f="${p.nieWiem}">${o[p.nieWiem] ? ik('ok') : ''}Brak informacji</button>` : '';
  const et = (pol && KROTKIE[p.k]) || p.e;
  return `<div class="pole ${p.dlugi || p.zr ? 'pelna' : pol}"><label class="et" for="${id}" title="${esc(p.e)}">${esc(et)}</label><div class="wejscie">${we}${jedn ? `<span class="jedn">${esc(jedn)}</span>` : ''}${zr}</div>${nieWiem}</div>`;
}
function sekcjaPom(o) {
  const pom = o.pom || [];
  const suma = pom.reduce((s, p) => s + (Number(p.m) || 0), 0);
  const num = (v) => (puste(v) ? '' : String(v).replace('.', ','));
  return `<p class="sek-opis">Wpisz długość i szerokość — metraż policzy się sam. Pomieszczenie nieregularne? Zostaw wymiary puste i wpisz metraż ręcznie. Suma: <b style="color:var(--gold-l)">${M.m2(Math.round(suma * 100) / 100)}</b>${o.pow ? ` z ${M.m2(o.pow)}` : ''}.</p>
    <datalist id="dl-pom">${M.TYPY_POM.map((x) => `<option value="${x}">`).join('')}</datalist>
    ${pom.map((p, i) => grupa(p.nazwa || `Pomieszczenie ${i + 1}`, `<div class="siatka">
      <div class="pole pelna"><span class="et">Nazwa</span><div class="wejscie"><input data-l="pom" data-i="${i}" data-p="nazwa" data-t="t" list="dl-pom" placeholder="np. Sypialnia" value="${esc(p.nazwa || '')}" aria-label="Nazwa pomieszczenia"></div></div>
      <div class="pole pelna"><span class="et">Wymiary i metraż</span><div class="wymiary">
        <div class="wejscie"><input data-l="pom" data-i="${i}" data-p="a" data-t="n" inputmode="decimal" placeholder="długość" value="${esc(num(p.a))}" aria-label="Długość w metrach"><span class="jedn">m</span></div>
        <span class="razy">×</span>
        <div class="wejscie"><input data-l="pom" data-i="${i}" data-p="b" data-t="n" inputmode="decimal" placeholder="szerokość" value="${esc(num(p.b))}" aria-label="Szerokość w metrach"><span class="jedn">m</span></div>
        <span class="razy">=</span>
        <div class="wejscie ${p.a && p.b ? 'wyliczone' : ''}"><input data-l="pom" data-i="${i}" data-p="m" data-t="n" inputmode="decimal" placeholder="m²" value="${esc(num(p.m))}" aria-label="Metraż" ${p.a && p.b ? 'readonly' : ''}><span class="jedn">m²</span></div>
      </div></div>
      <div class="pole pelna"><span class="et">Opis</span><div class="wejscie"><input data-l="pom" data-i="${i}" data-p="opis" data-t="t" placeholder="Krótko, faktami: okno na zachód, zabudowa 2021" value="${esc(p.opis || '')}" aria-label="Opis"></div></div>
      <div class="pole pelna"><button class="btn zly maly" data-a="usun-wiersz" data-l="pom" data-i="${i}">${ik('kosz')}Usuń pomieszczenie</button></div>
    </div>`)).join('')}
    <button class="dodaj" data-a="dodaj-wiersz" data-l="pom">${ik('plus')}Dodaj pomieszczenie</button>`;
}
function sekcjaListy(o, l, opis, pl) {
  const L = o[l] || [];
  return `<p class="sek-opis">${opis}</p><div class="wiersze">${L.map((a, i) => `<div class="wiersz"><div class="pola">
    <div class="wejscie"><input data-l="${l}" data-i="${i}" data-p="t" data-t="t" placeholder="${esc(pl)}" value="${esc(a.t || '')}" aria-label="Punkt ${i + 1}"></div></div>
    <button class="usun-w" data-a="usun-wiersz" data-l="${l}" data-i="${i}" aria-label="Usuń">${ik('x')}</button></div>`).join('')}</div>
    <button class="dodaj" data-a="dodaj-wiersz" data-l="${l}">${ik('plus')}Dodaj</button>`;
}
function sekcjaOkolicy(o) {
  const L = o.okolica || [];
  const jak = { pieszo: 'pieszo', rower: 'rowerem', auto: 'autem', mpk: 'komunikacją' };
  return `<p class="sek-opis">Czas zmierz na mapie albo przejdź sam. Podawaj tylko to, co sprawdzone.</p><div class="wiersze">${L.map((a, i) => `<div class="wiersz"><div class="pola okol">
    <div class="wejscie"><input data-l="okolica" data-i="${i}" data-p="nazwa" data-t="t" placeholder="np. przystanek MPK, szkoła nr 51" value="${esc(a.nazwa || '')}" aria-label="Miejsce"></div>
    <div class="dwa"><div class="wejscie"><input data-l="okolica" data-i="${i}" data-p="min" data-t="n" inputmode="numeric" placeholder="czas" value="${esc(a.min ?? '')}" aria-label="Minuty"><span class="jedn">min</span></div>
    <div class="wejscie"><select data-l="okolica" data-i="${i}" data-p="jak" data-t="w" aria-label="Jak">${Object.entries(jak).map(([k, v]) => `<option value="${k}" ${(a.jak || 'pieszo') === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div></div>
    </div><button class="usun-w" data-a="usun-wiersz" data-l="okolica" data-i="${i}" aria-label="Usuń">${ik('x')}</button></div>`).join('')}</div>
    <button class="dodaj" data-a="dodaj-wiersz" data-l="okolica">${ik('plus')}Dodaj miejsce</button>`;
}
function sekcjaWeryfikacji(o) {
  const w = o.weryf || {};
  const lista = M.WERYFIKACJA.filter((x) => !x.dla || x.dla === o.transakcja);
  return `<p class="sek-opis">Zaznaczone punkty trafią do ogłoszenia jako „Sprawdziliśmy” z datą. Tak „Sprawdzone do końca” staje się konkretem.</p>
    <div class="weryf">${lista.map((x) => `<div class="w ${w[x.k]?.ok ? 'zazn' : ''}"><label><span class="ptaszek"><input type="checkbox" data-w="${x.k}" data-p="ok" ${w[x.k]?.ok ? 'checked' : ''}><i></i></span><span>${esc(x.t)}</span></label>
    ${w[x.k]?.ok ? `<input type="date" data-w="${x.k}" data-p="d" value="${esc(w[x.k]?.d || '')}" aria-label="Data: ${esc(x.t)}">` : ''}</div>`).join('')}</div>`;
}
function htmlTekstOgloszenia(o) {
  return grupa('Własny tytuł i wstęp', `<p class="sek-opis">Opcjonalnie. Puste = tytuł i wstęp złożą się same z faktów. Wstęp to 1–2 zdania od Was, bez ocen.</p><div class="siatka">
      <div class="pole pelna"><label class="et" for="f-tytul">Własny tytuł</label><div class="wejscie"><input id="f-tytul" data-k="tytul" data-t="t" placeholder="${esc(M.tytul({ ...o, tytul: '' }))}" value="${esc(o.tytul || '')}"></div></div>
      <div class="pole pelna"><label class="et" for="f-lead">Wstęp</label><div class="wejscie"><textarea id="f-lead" data-k="lead" data-t="t" rows="3" placeholder="np. Mieszkanie po jednym właścicielu, regularnie remontowane.">${esc(o.lead || '')}</textarea></div></div>
    </div>`);
}

// ----- zdjęcia -----
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
  if (!t.firstChild) t.innerHTML = '<div id="zdj-licznik" data-wstaw></div><div class="panel szklo"><div id="zdj-dodaj" data-wstaw></div><p class="postep" id="zdj-postep"></p></div><div id="zdj-braki" data-wstaw></div><div class="zdjecia" id="zdj-siatka" data-wstaw></div>';
  const zdj = o.zdj || [];
  const zwykle = zdj.filter((z) => !z.wiz).length;
  const L = M.checklista(o);
  const bez = L.find((x) => x.id === 'zdjPom');
  const brakRzutu = L.find((x) => x.id === 'rzut' && !x.ok);
  wstaw($('#zdj-licznik', t), `<div class="zdj-licznik"><b>${zdj.length}</b><span class="wyc">zdjęć · prawdziwych ${zwykle}, minimum ${M.minZdjec(o)}</span><span class="rozp"></span>
    ${zdj.length ? `<button class="btn kontur maly" data-a="pobierz-zdj">${ik('pobierz')}Pobierz w kolejności</button>` : ''}</div>`);
  // pole wyboru plików — odświeżane tylko, gdy zmieni się lista pomieszczeń
  wstaw($('#zdj-dodaj', t), `<div class="siatka" style="padding-top:0">
      <div class="pole"><label class="et" for="pom-dodaj">Przypisz dodawane do</label><div class="wejscie"><select id="pom-dodaj">${opcjeMiejsc(o, null, 'później wybiorę')}</select></div></div>
      <div class="pole" style="display:flex;align-items:flex-end"><label class="btn zloty wybierz-plik" style="width:100%">${ik('aparat')}Dodaj zdjęcia<input type="file" id="dodaj-zdj" accept="image/*" multiple></label></div>
    </div>`);
  const sel = $('#pom-dodaj', t);
  if (sel && document.activeElement !== sel) sel.value = [...sel.options].some((x) => x.value === S.pomDodawania) ? S.pomDodawania : '';
  $('#zdj-postep', t).textContent = S.postep;
  wstaw($('#zdj-braki', t), `${bez && !bez.ok && bez.info ? `<div class="braki-zdj">${ik('uwaga')}<span>${esc(bez.info)}</span></div>` : ''}
    ${brakRzutu ? `<div class="braki-zdj">${ik('uwaga')}<span>Brak rzutu. Dodaj go jako zdjęcie i przypisz do „Rzut”.</span></div>` : ''}`);
  const oryginaly = zdj.filter((z) => !z.wiz);
  wstaw($('#zdj-siatka', t), zdj.map((z, i) => `<div class="zdj szklo ${z.glowne ? 'glowne' : ''}">
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
const NAGLOWEK = /^[A-ZĄĆĘŁŃÓŚŹŻ][A-ZĄĆĘŁŃÓŚŹŻ ,]+$/;
function blokiOpisu(tekst) {
  const surowe = tekst.split('\n\n');
  const bloki = [];
  surowe.forEach((b, i) => {
    const linie = b.split('\n');
    if (NAGLOWEK.test(linie[0].trim()) && linie.length > 1) { bloki.push({ tyt: linie[0].trim(), linie: linie.slice(1), tekst: b }); return; }
    const tyt = i === surowe.length - 1 ? 'KONTAKT' : !bloki.length || bloki[bloki.length - 1].tyt === 'WSTĘP' ? 'WSTĘP' : 'INFORMACJE';
    const ost = bloki[bloki.length - 1];
    if (ost && ost.tyt === tyt) { ost.linie.push('', ...linie); ost.tekst += `\n\n${b}`; }
    else bloki.push({ tyt, linie, tekst: b });
  });
  return bloki;
}
function liniaHTML(l, tyt) {
  if (l.startsWith('– ')) {
    let t = esc(l.slice(2));
    if (tyt === 'KOSZTY') {
      const m = l.slice(2).match(/^([^:]+): ([^—(]+?)(\s*[—(].*)?$/);
      if (m) t = `${esc(m[1])}: <b>${esc(m[2])}</b>${esc(m[3] || '')}`;
    }
    return `<li>${t}</li>`;
  }
  return l.trim() ? `<p>${esc(l)}</p>` : '';
}
function htmlOgloszenie(o, zGora = true) {
  const uw = M.kontrolaSlow(o);
  const tyt = M.tytul(o), op = M.opis(o, { agent: agent() }), kr = M.krotki(o, { agent: agent() });
  const pola = M.polaPortalu(o);
  const bloki = blokiOpisu(op);
  const gora = !zGora ? '' : `<div class="rzad" style="margin:0 0 12px"><span class="znaki">Opis: ${op.length} znaków</span><span class="rozp"></span><button class="btn kontur maly" data-a="kopiuj" data-co="opis">${ik('kopiuj')}Kopiuj całość</button></div>`;
  return `${uw.length ? `<div class="uwagi szklo"><h3>${ik('uwaga')}Do poprawy (${uw.length})</h3><ul>${uw.map((u) => `<li><b>${esc(u.gdzie)}:</b> „${esc(u.fraza)}” — ${esc(u.porada)}</li>`).join('')}</ul></div>` : ''}
    ${gora}
    <div class="karta-og szklo">${bloki.map((b, i) => `<div class="blok-og ${b.tyt === 'SPRAWDZILIŚMY' ? 'spr' : ''}">
      <div class="blok-glowa"><h3>${esc(b.tyt.toLowerCase().replace(/^./, (c) => c.toUpperCase()))}</h3><button class="btn kontur" data-a="kopiuj-blok" data-v="${i}">${ik('kopiuj')}Kopiuj</button></div>
      ${b.linie.some((l) => l.startsWith('– ')) ? `<ul>${b.linie.map((l) => liniaHTML(l, b.tyt)).join('')}</ul>` : b.linie.map((l) => liniaHTML(l, b.tyt)).join('')}
    </div>`).join('')}</div>
    <div class="karta-og szklo"><div class="blok-og"><div class="blok-glowa"><h3>Tytuł</h3><span class="znaki">${tyt.length} zn.</span><button class="btn kontur" data-a="kopiuj" data-co="tytul">${ik('kopiuj')}Kopiuj</button></div><div class="tytul-og">${esc(tyt)}</div></div></div>
    <div class="karta-og szklo"><div class="blok-og"><div class="blok-glowa"><h3>Facebook, Instagram</h3><button class="btn kontur" data-a="kopiuj" data-co="krotki">${ik('kopiuj')}Kopiuj</button></div><pre class="tekst-og">${esc(kr)}</pre></div></div>
    <div class="karta-og szklo"><div class="blok-og"><div class="blok-glowa"><h3>Pola portalu</h3></div><div>${pola.map((p, i) => `<div class="pp"><span><small>${esc(p.e)}</small>${esc(p.v)}</span><button class="okragly" data-a="kopiuj" data-co="pole" data-v="${i}" aria-label="Kopiuj: ${esc(p.e)}">${ik('kopiuj')}</button></div>`).join('')}</div></div></div>`;
}
// ----- kontrola -----
function htmlKontrola(o) {
  const L = M.checklista(o);
  const tw = L.filter((x) => x.twarde), zal = L.filter((x) => !x.twarde);
  const g = M.gotowosc(o);
  const li = (x) => `<li data-a="idz" data-id="${x.id}" data-zak="${x.zakladka}"><span class="znak ${x.ok ? 'ok' : x.twarde ? 'nie' : 'zal'}">${ik(x.ok ? 'ok' : x.twarde ? 'x' : 'uwaga')}</span><span>${esc(x.tekst)}${x.info && !x.ok ? `<span class="info">${esc(x.info)}</span>` : ''}</span>${x.ok ? '' : `<span class="strz">${ik('prawo')}</span>`}</li>`;
  return `<div class="karta-og szklo"><div class="blok-og"><div class="blok-glowa"><h3>Status</h3></div>
      <div class="wejscie"><select data-k="status" aria-label="Status oferty">${Object.entries(M.STATUSY).map(([k, v]) => `<option value="${k}" ${o.status === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></div>
      <p class="info-pola">„Gotowa do publikacji” i „Opublikowana” da się ustawić dopiero, gdy wszystkie wymagane punkty są spełnione.</p></div></div>
    <div class="karta-og szklo"><div class="blok-og"><div class="blok-glowa"><h3>Wymagane</h3><span class="sek-licz">${tw.filter((x) => x.ok).length}/${tw.length}</span>${pierscien(Math.round((tw.filter((x) => x.ok).length / Math.max(1, tw.length)) * 100), 'maly')}</div><ul class="check">${tw.map(li).join('')}</ul></div></div>
    <div class="karta-og szklo"><div class="blok-og"><div class="blok-glowa"><h3>Zalecane</h3></div><ul class="check">${zal.map(li).join('')}</ul></div></div>`;
}

// ----- ustawienia -----
function odswiezUstawienia() {
  const e = $('#edytor'); e.dataset.tryb = 'ustawienia';
  const a = agent();
  const pushOk = 'PushManager' in window;
  wstaw(e, `<div class="ust">
    <section class="sek szklo"><h2>Stopka ogłoszeń</h2><div class="sek-tresc"><div class="siatka">
        <div class="pole"><label class="et" for="u-nazwa">Imię i nazwisko</label><div class="wejscie"><input id="u-nazwa" data-u="nazwa" value="${esc(a.nazwa)}"></div></div>
        <div class="pole"><label class="et" for="u-tel">Telefon</label><div class="wejscie"><input id="u-tel" data-u="telefon" type="tel" value="${esc(a.telefon)}"></div></div>
        <div class="pole"><label class="et" for="u-firma">Nazwa firmy</label><div class="wejscie"><input id="u-firma" data-u="firma" value="${esc(a.firma)}"></div></div>
        <div class="pole"><label class="et" for="u-haslo">Hasło pod nazwą</label><div class="wejscie"><input id="u-haslo" data-u="haslo" value="${esc(a.haslo)}"></div></div>
      </div></div></section>
    <section class="sek szklo"><h2>Powiadomienia</h2><div class="sek-tresc">
      <p class="tekst-ust" style="padding:0">Powiadomienie, gdy wspólnik doda ofertę albo zmieni jej status. Na iPhonie działa w aplikacji dodanej do ekranu początkowego.</p>
      <div class="rzad" style="margin-top:12px">${pushOk ? (D.stan.push ? '<span style="color:var(--ok)">Włączone na tym urządzeniu</span><button class="btn kontur maly" data-a="push-off">Wyłącz</button>' : '<button class="btn zloty" data-a="push-on">Włącz powiadomienia</button>') : '<span class="wyc">To urządzenie nie obsługuje powiadomień w tej formie.</span>'}</div></div></section>
    <section class="sek szklo"><h2>Synchronizacja</h2><div class="sek-tresc">
      <p class="tekst-ust" style="padding:0">Wszystko zapisuje się najpierw na urządzeniu, potem od razu na serwerze. Bez internetu pracujesz dalej — zmiany wyślą się same.</p>
      <p style="margin:12px 0 4px">Do wysłania: <b style="color:var(--gold-l)">${D.ileWKolejce()}</b> · stan danych ${D.stan.seq}</p>
      <div class="rzad"><button class="btn kontur maly" data-a="sync">Synchronizuj teraz</button></div></div></section>
    <section class="sek szklo"><h2>Konto</h2><div class="sek-tresc">
      <p style="margin:6px 0">Zalogowany: <b>${esc(D.stan.konto?.nazwa || '')}</b> <span class="wyc">(${esc(D.stan.konto?.login || '')})</span></p>
      ${D.stan.konta.length > 1 ? `<p class="wyc male" style="margin:0 0 10px">W biurze: ${D.stan.konta.map((k) => esc(k.nazwa)).join(', ')}</p>` : ''}
      <button class="btn zly maly" data-a="wyloguj">Wyloguj to urządzenie</button></div></section>
    <p class="male wyc" style="text-align:center">AM Oferty ${WERSJA}</p>
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
  const o = D.oferta(S.id);
  if (el.dataset.u) return D.ustawAgenta({ [el.dataset.u]: el.value.trim() });
  if (!o) return;
  if (el.dataset.k) {
    const k = el.dataset.k;
    if (k === 'status') return zmienStatus(o, el.value, el);
    const v = wartosc(el);
    if (JSON.stringify(o[k] ?? null) === JSON.stringify(v)) return;
    D.zmien(S.id, { [k]: v });
  } else if (el.dataset.l) {
    const l = el.dataset.l, i = Number(el.dataset.i), p = el.dataset.p;
    const arr = (o[l] || []).map((x) => ({ ...x }));
    if (!arr[i]) return;
    const v = wartosc(el);
    if (v === null) delete arr[i][p]; else arr[i][p] = v;
    if (l === 'pom' && (p === 'a' || p === 'b')) { const m = M.metrazZWymiarow(arr[i].a, arr[i].b); if (m !== null) arr[i].m = m; }
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
  }
}
function zmienStatus(o, v, el) {
  if (M.STATUSY_WYMAGAJACE.includes(v)) {
    const g = M.gotowosc(o);
    if (!g.wszystkieTwarde) {
      if (el) el.value = o.status;
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
const doZapisu = (el) => el.dataset.k || el.dataset.l || el.dataset.w || el.dataset.z || el.dataset.u;
document.addEventListener('input', (e) => {
  const el = e.target;
  if (!doZapisu(el) || natychmiast(el)) return;
  clearTimeout(timery.get(el));
  timery.set(el, setTimeout(() => zapisz(el), 450));
});
document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.id === 'pom-dodaj') { S.pomDodawania = el.value; return; }
  if (el.id === 'dodaj-zdj') return dodajZdjecia(el);
  if (!doZapisu(el)) return;
  clearTimeout(timery.get(el));
  zapisz(el);
});
document.addEventListener('focusout', (e) => {
  const el = e.target;
  if (timery.has(el)) { clearTimeout(timery.get(el)); zapisz(el); }
  setTimeout(() => { if (!document.activeElement || !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) odswiez(); }, 30);
});

// ---------- zdjęcia: dodawanie, pobieranie, podgląd ----------
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
      pliki.push({ nazwa: `${String(i + 1).padStart(2, '0')}-${slug(nazwaMiejsca(z, o))}${z.wiz ? '-wizualizacja' : ''}.jpg`, blob: await D.blobZdjecia(z.id) });
    }
    const mobilny = /iPhone|iPad|Android/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
    const files = pliki.map((p) => new File([p.blob], p.nazwa, { type: 'image/jpeg' }));
    if (mobilny && navigator.canShare?.({ files })) await navigator.share({ files, title: o.roboczy || M.tytul(o) });
    else {
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
  tlo.innerHTML = `<img alt="Zdjęcie" src="${obrazy.get(`${id}:mini`) || ''}"><button class="okragly" aria-label="Zamknij">${ik('x')}</button>`;
  tlo.addEventListener('click', () => tlo.remove());
  document.body.appendChild(tlo);
  try { const b = await D.blobZdjecia(id); $('img', tlo).src = URL.createObjectURL(b); } catch { /* zostaje miniatura */ }
}

// ---------- okna ----------
function okno(tytul, html) {
  const tlo = document.createElement('div');
  tlo.className = 'okno-tlo';
  tlo.innerHTML = `<div class="okno szklo" role="dialog" aria-modal="true" aria-label="${esc(tytul)}"><div class="okno-gora"><h2>${esc(tytul)}</h2><button class="okragly" data-zamknij aria-label="Zamknij">${ik('x')}</button></div><div class="okno-tresc">${html}</div></div>`;
  tlo.addEventListener('click', (e) => { if (e.target === tlo || e.target.closest('[data-zamknij]')) tlo.remove(); });
  document.body.appendChild(tlo);
  return tlo;
}
const NAZWY_POL = { pom: 'Pomieszczenia', atuty: 'Atuty', minusy: 'Co warto wiedzieć', okolica: 'Okolica', zdj: 'Zdjęcia', weryf: 'Sprawdziliśmy', zr: 'Źródła danych',
  lead: 'Wstęp', tytul: 'Własny tytuł', status: 'Status', _usunieta: 'Usunięcie oferty', dataPublikacji: 'Data publikacji', utworzyl: 'Utworzenie', id: 'Utworzenie', ulubiona: 'Wyróżnienie' };
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
const kiedy = (t) => new Date(t).toLocaleString('pl-PL', { dateStyle: 'medium', timeStyle: 'short' });
async function pokazHistorie() {
  const w = okno('Historia zmian', '<p class="wyc">Wczytuję…</p>');
  try {
    const h = await D.historia(S.id);
    $('.okno-tresc', w).innerHTML = h.length ? `<ul class="hist">${h.map((x) => `<li><div><b>${esc(etykieta(x.pole))}</b>: ${pokazWartosc(x.pole, x.stara)} → ${pokazWartosc(x.pole, x.nowa)}</div><div class="kiedy">${esc(x.kto || '')} · ${kiedy(x.kiedy)}</div></li>`).join('')}</ul>` : '<p class="wyc">Brak zapisanych zmian.</p>';
  } catch { $('.okno-tresc', w).innerHTML = '<p class="wyc">Historia jest na serwerze. Połącz się z internetem, żeby ją zobaczyć.</p>'; }
}
function pokazAktywnosc() {
  const A = D.stan.aktywnosc || [];
  // grupowanie: ta sama oferta i osoba w odstępie do 10 minut = jedna pozycja
  const grupy = [];
  for (const a of A) {
    const g = grupy[grupy.length - 1];
    if (g && g.oferta === a.oferta && g.kto === a.kto && g.od - a.kiedy < 10 * 60e3) { g.od = a.kiedy; if (!g.pola.includes(a.pole)) g.pola.push(a.pole); if (a.pole === 'status') g.status = a.nowa; continue; }
    grupy.push({ oferta: a.oferta, nazwa: a.nazwa, kto: a.kto, kiedy: a.kiedy, od: a.kiedy, pola: [a.pole], status: a.pole === 'status' ? a.nowa : null });
  }
  const widziana = D.stan.aktywnoscWidziana;
  okno('Zmiany wspólnika', grupy.length ? `<ul class="hist">${grupy.slice(0, 40).map((g) => {
    const nowa = g.pola.includes('id') || g.pola.includes('transakcja') && g.pola.includes('rodzaj') && g.pola.length > 4;
    const opis = g.pola.includes('_usunieta') ? 'usunął(-ęła) ofertę' : nowa ? 'dodał(a) ofertę' : g.status ? `status → ${pokazWartosc('status', g.status)}` : `zmienił(a): ${[...new Set(g.pola.map(etykieta))].slice(0, 4).join(', ')}${g.pola.length > 4 ? '…' : ''}`;
    return `<li data-a="otworz" data-oid="${g.oferta}" style="cursor:pointer"><div class="of">${esc(g.nazwa || 'Oferta')}${g.kiedy > widziana ? ' <span class="licznik" style="background:var(--gold);color:#1A1408">nowe</span>' : ''}</div><div>${esc(g.kto || '')} ${opis}</div><div class="kiedy">${kiedy(g.kiedy)}</div></li>`;
  }).join('')}</ul>` : '<p class="wyc">Wspólnik nie wprowadzał jeszcze zmian.</p>');
  D.aktywnoscWidziana();
}
function potwierdz(tytul, tresc, przycisk) {
  return new Promise((ok) => {
    const w = okno(tytul, `<p>${tresc}</p><div class="rzad" style="justify-content:flex-end;margin-top:16px"><button class="btn" data-n>Anuluj</button><button class="btn zly" data-t>${esc(przycisk)}</button></div>`);
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
  if (a === 'ulub') { e.preventDefault(); e.stopPropagation(); }
  const o = S.id ? D.oferta(S.id) : null;
  switch (a) {
    case 'nowa': {
      e.preventDefault();
      const id = M.noweId(10);
      await D.zmien(id, M.nowaOferta(id, D.stan.konto?.nazwa));
      idzDo(`#/o/${id}/s/podstawy`);
      break;
    }
    case 'filtr': S.filtr = b.dataset.v; odswiezListe(); break;
    case 'wiecej': S.wiecej = !S.wiecej; odswiezListe(); break;
    case 'sync': D.synchronizuj().then(() => toast(D.stan.blad || 'Zsynchronizowano')); break;
    case 'aktywnosc': pokazAktywnosc(); break;
    case 'otworz': $$('.okno-tlo').forEach((x) => x.remove()); idzDo(`#/o/${b.dataset.oid}/karta`); break;
    case 'podglad': e.preventDefault(); S.podglad = b.dataset.v; odswiez(); break;
    case 'ulub': { const x = D.oferta(b.dataset.oid); if (x) D.zmien(x.id, { ulubiona: x.ulubiona ? null : true }); break; }
    case 'zr-menu': {
      const k = b.dataset.k, akt = o.zr?.[k];
      const w = okno(`Źródło: ${POLE[k]?.e || ''}`, `<p class="sek-opis" style="margin-top:0">Skąd wiemy, że to prawda?</p><div class="menu-lista">${Object.entries(M.ZRODLA).map(([z, n]) => `<button data-zr="${z}" class="${akt === z ? 'akt' : ''}">${ik(ZR_IK[z])}${n}${akt === z ? ik('ok', 'ok') : ''}</button>`).join('')}${akt ? `<button data-zr="">${ik('x')}Usuń źródło</button>` : ''}</div>`);
      w.addEventListener('click', (ev) => {
        const z = ev.target.closest('[data-zr]'); if (!z) return;
        const zr = { ...(D.oferta(o.id).zr || {}) }; zr[k] = z.dataset.zr || undefined;
        D.zmien(o.id, { zr: JSON.parse(JSON.stringify(zr)) }); w.remove();
      });
      break;
    }
    case 'nie-wiem': {
      const f = b.dataset.f, k = b.dataset.k;
      D.zmien(o.id, o[f] ? { [f]: null } : { [f]: true, [k]: null });
      break;
    }
    case 'wybor': D.zmien(o.id, { [b.dataset.k]: o[b.dataset.k] === b.dataset.v && b.dataset.k !== 'transakcja' ? null : b.dataset.v }); break;
    case 'zr': {
      const zr = { ...(o.zr || {}) };
      zr[b.dataset.k] = zr[b.dataset.k] === b.dataset.v ? undefined : b.dataset.v;
      D.zmien(o.id, { zr: JSON.parse(JSON.stringify(zr)) });
      break;
    }
    case 'dodaj-wiersz': {
      const l = b.dataset.l;
      D.zmien(o.id, { [l]: [...(o[l] || []), { id: M.noweId(6) }] });
      setTimeout(() => { const w = $$(`#sek-${l} input[data-l="${l}"][data-p="${l === 'pom' ? 'nazwa' : l === 'okolica' ? 'nazwa' : 't'}"]`); w[w.length - 1]?.focus(); }, 80);
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
    case 'kopiuj-blok': { const bl = blokiOpisu(M.opis(o, { agent: agent() }))[Number(b.dataset.v)]; if (bl) kopiuj(bl.tekst); break; }
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
    case 'menu': {
      const w = okno(o.roboczy || M.tytul(o), `<div class="menu-lista"><button data-m="historia">${ik('zegar')}Historia zmian</button><button data-m="usun" class="zly">${ik('kosz')}Usuń ofertę</button></div>`);
      w.addEventListener('click', async (ev) => {
        const m = ev.target.closest('[data-m]')?.dataset.m; if (!m) return;
        w.remove();
        if (m === 'historia') pokazHistorie();
        if (m === 'usun') {
          if (!(await potwierdz('Usunąć ofertę?', 'Oferta i jej zdjęcia znikną na obu kontach. Jeśli transakcja się zakończyła, lepiej ustaw status „Zakończona”.', 'Usuń na zawsze'))) return;
          await D.usunOferte(o.id); idzDo('#/'); toast('Oferta usunięta');
        }
      });
      break;
    }
    case 'idz': {
      const id = b.dataset.id, zak = b.dataset.zak;
      const sekc = SEK_DLA[id];
      if (zak === 'zdjecia') idzDo(`#/o/${o.id}/zdjecia`);
      else if (zak === 'ogloszenie') idzDo(`#/o/${o.id}/ogloszenie`);
      else idzDo(sekc ? `#/o/${o.id}/s/${sekc}` : `#/o/${o.id}`);
      break;
    }
    case 'push-on': try { await D.wlaczPush(); toast('Powiadomienia włączone'); } catch (er) { toast(er.message, 4500); } break;
    case 'push-off': try { await D.wylaczPush(); toast('Powiadomienia wyłączone'); } catch (er) { toast(er.message, 4500); } break;
    case 'wyloguj':
      if (!(await potwierdz('Wylogować to urządzenie?', 'Niewysłane zmiany z tego urządzenia wyślą się po ponownym zalogowaniu.', 'Wyloguj'))) return;
      await D.wyloguj(); render(); break;
  }
});

// ---------- bez powiększania (szczypanie, podwójne stuknięcie) ----------
for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });

// ---------- start ----------
addEventListener('hashchange', trasa);
szeroki.addEventListener('change', () => { resetEdytora(); const e = $('#edytor'); if (e) e.dataset.tryb = ''; trasa(); });
telefon.addEventListener('change', () => { resetEdytora(); const e = $('#edytor'); if (e) e.dataset.tryb = ''; trasa(); });
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
