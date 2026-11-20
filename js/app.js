// AM Oferty — interfejs (wygląd 1:1 z renderem właściciela).
import * as M from './model.js';
import * as D from './dane.js';
import * as Z from './sejf.js';
import { zrobZip } from './zip.js';
import * as K from './kopia.js';
import * as R from './rzut.js';
import * as KZ from './korekta.js';
import { otworzEdytor, obrobPelne, rozkoduj } from './edytorZdjec.js';
import * as U from './urzadzenia.js';
import * as HY from './hybryda.js';

export const WERSJA = '1.15.1';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const IK = {
  klodka: '<rect x="5.5" y="10.5" width="13" height="9.5" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  plus: '<path d="M12 4.5v15M4.5 12h15"/>', wstecz: '<path d="M14.5 5.5L8 12l6.5 6.5"/>', prawo: '<path d="M9.5 5.5L16 12l-6.5 6.5"/>', lewo: '<path d="M14.5 5.5L8 12l6.5 6.5"/>',
  dol: '<path d="M6 9.5l6 6 6-6"/>', kopiuj: '<rect x="8.5" y="8.5" width="11" height="12" rx="2"/><path d="M15.5 8.5V5.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2"/>',
  tarcza: '<path d="M12 3.5l7 2.6v5.4c0 4.4-3 7.8-7 9-4-1.2-7-4.6-7-9V6.1z"/><path d="M8.8 12.2l2.2 2.2 4.3-4.6"/>',
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
  olowek: '<path d="M15.2 4.8l4 4L8.6 19.4 4 20l.6-4.6z"/><path d="M13.3 6.7l4 4"/>',
  cofnij: '<path d="M9 7.5L4.5 12 9 16.5"/><path d="M5 12h9.5a5 5 0 0 1 0 10H12"/>',
  tel: '<path d="M6.6 3.8l2.6-.3 1.5 4-1.9 1.4a11 11 0 0 0 6.3 6.3l1.4-1.9 4 1.5-.3 2.6a2 2 0 0 1-2.1 1.8C10.5 18.8 5.2 13.5 4.8 5.9a2 2 0 0 1 1.8-2.1z"/>',
  sms: '<path d="M4 5.5h16v10.5h-9.5L6 19.5V16H4z"/><path d="M8 10.8h.01M12 10.8h.01M16 10.8h.01"/>',
  kal: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>',
  pdf: '<path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20z"/><path d="M14 3.5V8h4"/><path d="M9.5 13.5h5M9.5 16.5h3.5"/>',
  obraz: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M4 17l5-4.5 3.5 3 2.5-2 4.5 3.5"/>',
  spinacz: '<path d="M16.5 11.5l-5.6 5.6a3.6 3.6 0 0 1-5.1-5.1l6.3-6.3a2.4 2.4 0 0 1 3.4 3.4L9.4 15.2a1.2 1.2 0 0 1-1.7-1.7l5.6-5.6"/>',
};
const ik = (n, kl = '') => `<svg class="ik ${kl}" viewBox="0 0 24 24" aria-hidden="true">${IK[n]}</svg>`;

// ---------- stan interfejsu ----------
const S = { ekran: 'lista', id: null, tab: 'karta', sek: null, podglad: 'ogloszenie', edycja: null, q: '', filtr: 'aktywne', wiecej: false, pomDodawania: '', postep: '' };
const szeroki = matchMedia('(min-width: 1180px)');
const telefon = matchMedia('(max-width: 759px)');
const obrazy = new Map(); // `${id}:${rodzaj}` -> url
let zbudowany = false;
let odblok = null; // { oid, grupy } — grupy z danymi osobowymi otwarte PIN-em w tej ofercie (do wyjścia z oferty albo blokady)

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
  // PIN otwiera grupę z danymi osobowymi („Umowa i formalności” albo „Sprzedaż”) do wyjścia z oferty
  if (S.ekran !== 'oferta' || odblok?.oid !== S.id) odblok = null;
  odswiez();
}
const idzDo = (h) => { if (location.hash !== h) location.hash = h; else trasa(); };
function resetEdytora() {
  S.edycja = null;
  $$('[data-wstaw]').forEach((el) => { el.__html = null; });
  const t = $('#ed-tresc'); if (t) { t.__klucz = null; }
  const k = $('.kol-edytor'); if (k) k.scrollTop = 0;
}

// wstawia HTML tylko gdy się zmienił i nikt w tym fragmencie nie pisze
function wstaw(el, html) {
  if (!el || el.__html === html) return;
  const a = document.activeElement;
  if (a && a !== document.body && el.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && !['checkbox', 'radio'].includes(a.type)) { el.__czeka = true; return; }
  // Safari zeruje przewinięcie kontenera przy podmianie treści — zapamiętujemy i przywracamy
  const sc = el.closest('.kol-edytor, .kol-podglad, .kol-lista, .okno-tresc');
  const y = sc ? sc.scrollTop : 0;
  el.innerHTML = html; el.__html = html; el.__czeka = false;
  if (sc && sc.scrollTop !== y) sc.scrollTop = y;
  wypelnijObrazy(el);
  // pole wyboru pliku: słuchacz bezpośrednio na elemencie, żeby odświeżenie w trakcie wyboru nie zgubiło plików
  for (const i of $$('input[type=file][data-dok]', el)) i.onchange = () => dodajPlikiDok(i);
}
function wypelnijObrazy(el) {
  for (const img of $$('img[data-mini]', el)) {
    if (img.getAttribute('src')) continue;
    const id = img.dataset.mini;
    D.urlZdjecia(id, 'mini').then((u) => { if (u) { obrazy.set(`${id}:mini`, u); img.src = u; } }).catch(() => {});
  }
  for (const d of $$('[data-foto]', el)) {
    if (d.style.backgroundImage) continue;
    const id = d.dataset.foto, r = d.dataset.r || 'sr';
    D.urlZdjecia(id, r).then((u) => { if (u) { obrazy.set(`${id}:${r}`, u); d.style.backgroundImage = `url("${u}")`; d.classList.remove('puste'); } }).catch(() => {});
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
    const haslo = $('#l-haslo').value;
    try {
      const r = await D.zaloguj($('#l-login').value, haslo);
      if (r.oczekuje) ekranKodu(r, haslo); else await poZalogowaniu(r, haslo);
    } catch (er) { if ($('#l-blad')) $('#l-blad').textContent = bladSieci(er); }
    finally { b.disabled = false; }
  });
}
const bladSieci = (er) => (er.message === 'Failed to fetch' || er.message === 'Load failed' ? 'Brak połączenia z serwerem.' : er.message);
const formularz = (id, tresc) => `<div class="logowanie"><form id="${id}" class="szklo" autocomplete="off">
    <img class="znak" src="img/monogram.png" alt="AM"><h1 class="zloty-tekst">AM Oferty</h1>${tresc}</form></div>`;
const polePin = (id, et) => `<div class="pole"><label class="et" for="${id}">${et}</label><div class="wejscie"><input id="${id}" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" required></div></div>`;
// nowe urządzenie: kod pokazany na zalogowanym telefonie (własnym albo wspólnika)
function ekranKodu(r, haslo) {
  zbudowany = false;
  $('#app').innerHTML = formularz('f-kod', `<p>Nowe urządzenie. ${esc(r.gdzie[0].toUpperCase() + r.gdzie.slice(1))} pojawił się 6-cyfrowy kod (ważny 10 minut). Wpisz go tutaj.</p>
    ${polePin('l-kod', 'Kod')}
    <button class="btn zloty" type="submit">Potwierdź</button>
    <div class="blad" id="l-blad"></div>
    <button type="button" class="btn kontur maly" id="l-wroc" style="margin-top:6px">Wróć do logowania</button>`);
  $('#l-wroc').onclick = () => ekranLogowania();
  $('#l-kod').focus();
  $('#f-kod').addEventListener('submit', async (e) => {
    e.preventDefault();
    const b = $('#f-kod button[type=submit]'); b.disabled = true; $('#l-blad').textContent = '';
    try { await poZalogowaniu(await D.potwierdzKod(r.prosba, $('#l-kod').value), haslo); }
    catch (er) { if (er.kod === 410) { D.stan.blad = er.message; ekranLogowania(); return; } $('#l-blad').textContent = bladSieci(er); }
    finally { b.disabled = false; }
  });
}
async function poZalogowaniu(r, haslo) {
  if (r.zmienHaslo) await ekranNowegoHasla(haslo);
  await ekranPin('ustaw', 'Ustaw PIN do otwierania aplikacji na tym urządzeniu. Dane w telefonie będą nim zaszyfrowane.');
  await D.dokonczLogowanie();
  render(); trasa();
}
function ekranNowegoHasla(stare) {
  return new Promise((gotowe) => {
    zbudowany = false;
    $('#app').innerHTML = formularz('f-haslo', `<p>Twoje hasło jest za krótkie. Ustaw nowe — co najmniej 12 znaków (np. trzy słowa i cyfra). Wpisujesz je tylko raz na każdym urządzeniu.</p>
      <div class="pole"><label class="et" for="h-1">Nowe hasło</label><div class="wejscie"><input id="h-1" type="password" autocomplete="new-password" required></div></div>
      <div class="pole"><label class="et" for="h-2">Powtórz nowe hasło</label><div class="wejscie"><input id="h-2" type="password" autocomplete="new-password" required></div></div>
      <button class="btn zloty" type="submit">Zapisz hasło</button><div class="blad" id="h-blad"></div>`);
    $('#h-1').focus();
    $('#f-haslo').addEventListener('submit', async (e) => {
      e.preventDefault();
      const a = $('#h-1').value, b = $('#h-2').value, bl = $('#h-blad');
      if (a.length < 12) { bl.textContent = 'Co najmniej 12 znaków.'; return; }
      if (a !== b) { bl.textContent = 'Hasła się różnią.'; return; }
      try { await D.zmienHaslo(stare, a); gotowe(); } catch (er) { bl.textContent = bladSieci(er); }
    });
  });
}
const pinOk = (p) => /^\d{6}$/.test(p) && !/^(\d)\1{5}$/.test(p) && !['123456', '654321', '012345', '543210'].includes(p);
// PIN: 'ustaw' (nowe urządzenie / aktualizacja) albo 'otworz' (każde otwarcie aplikacji)
function ekranPin(tryb, opis = '') {
  return new Promise((gotowe) => {
    zbudowany = false;
    const ustaw = tryb === 'ustaw';
    $('#app').innerHTML = formularz('f-pin', `<p>${esc(opis || 'Wpisz PIN, żeby otworzyć aplikację.')}</p>
      ${polePin('pin', ustaw ? 'Nowy PIN (6 cyfr)' : 'PIN')}${ustaw ? polePin('pin2', 'Powtórz PIN') : ''}
      <button class="btn zloty" type="submit">${ustaw ? 'Ustaw PIN' : 'Otwórz'}</button>
      <div class="blad" id="pin-blad">${esc(D.stan.blad || '')}</div>
      ${ustaw ? '' : '<button type="button" class="btn kontur maly" id="pin-zapomnialem" style="margin-top:6px">Nie pamiętam PIN-u</button>'}`);
    D.stan.blad = '';
    const we = $('#pin'), bl = $('#pin-blad'), btn = $('#f-pin button[type=submit]');
    we.focus();
    const wyslij = async () => {
      const pin = we.value;
      if (ustaw) {
        if (!pinOk(pin)) { bl.textContent = 'PIN to 6 cyfr, nie same jedynki ani 123456.'; return; }
        if (pin !== $('#pin2').value) { bl.textContent = 'PIN-y się różnią.'; return; }
        btn.disabled = true; bl.textContent = 'Szyfruję dane na tym urządzeniu…';
        try { await D.ustawPin(pin); gotowe(); } catch (er) { bl.textContent = er.message; btn.disabled = false; }
        return;
      }
      if (!/^\d{6}$/.test(pin)) { bl.textContent = 'PIN to 6 cyfr.'; return; }
      btn.disabled = true; bl.textContent = '';
      const r = await D.odblokuj(pin);
      if (r.ok) { gotowe(); return; }
      btn.disabled = false; we.value = ''; we.focus();
      if (!r.wyczyszczono) bl.textContent = `Zły PIN. ${r.zostalo === 1 ? 'Została 1 próba — potem dane znikną z tego telefonu.' : `Zostały ${r.zostalo} próby.`}`;
    };
    $('#f-pin').addEventListener('submit', (e) => { e.preventDefault(); wyslij(); });
    if (!ustaw) we.addEventListener('input', () => { if (/^\d{6}$/.test(we.value)) wyslij(); });
    $('#pin-zapomnialem')?.addEventListener('click', async () => {
      if (await potwierdz('Nie pamiętasz PIN-u?', 'Dane znikną z tego telefonu (na serwerze zostają). Zalogujesz się hasłem i ustawisz nowy PIN. Niewysłane zmiany z tego telefonu przepadną.', 'Usuń i zaloguj')) D.wyczysc('');
    });
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
        <div id="przyp" data-wstaw></div>
      </div>
      <div class="karty" id="karty" data-wstaw></div>
      <div class="spis-boczny" id="spis-boczny" data-wstaw></div>
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
  if (!D.stan.token) { if (zbudowany || !$('.logowanie')) ekranLogowania(); return; }
  if (!zbudowany && $('.logowanie')) return; // trwa logowanie: kod, nowe hasło albo PIN — nie przykrywamy ekranu
  if (!zbudowany) szkielet();
  $('#uklad').dataset.ekran = S.ekran;
  $('#uklad').dataset.sekcja = S.ekran === 'oferta' && S.tab !== 'karta' ? '1' : '';
  odswiezPasek(); odswiezListe(); odswiezSpisuBocznego(); odswiezDol();
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
// tablet i laptop: w sekcji oferty lewa kolumna pokazuje spis tej oferty zamiast listy ofert
function odswiezSpisuBocznego() {
  const o = S.ekran === 'oferta' && S.tab !== 'karta' && !telefon.matches ? D.oferta(S.id) : null;
  wstaw($('#spis-boczny'), o ? `<a class="sb-wstecz" href="#/o/${o.id}">${ik('wstecz')}<span><b>${esc(o.roboczy || M.tytul(o))}</b><span>Spis karty</span></span></a>${grupySpisu(o, S.tab === 'sekcja' ? S.sek : S.tab)}` : '');
}
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
  // przypomnienie o kopii zapasowej (po 7 dniach bez kopii na komputerze)
  const dni = K.dniOdKopii();
  const ret = (D.stan.retencja || []).filter((w) => w.k.startsWith('kl_') && D.oferta(w.oid)?.[w.k]);
  const retOf = (D.stan.retencja || []).filter((w) => w.k === 'oferta' && D.oferta(w.oid));
  wstaw($('#przyp'), htmlProsb()
    + (ret.length ? `<a class="przypomnienie szklo" href="#/o/${ret[0].oid}/klienci">${ik('uwaga')}<span>${ret.length === 1 ? 'Dane 1 klienta znikną' : `Dane ${ret.length} klientów znikną`} w ciągu 30 dni (okres przechowywania). Zachowaj, jeśli nadal jesteście w kontakcie.</span>${ik('prawo')}</a>` : '')
    + retOf.map((w) => `<a class="przypomnienie szklo" href="#/o/${w.oid}">${ik('uwaga')}<span>Zakończona oferta „${esc(D.oferta(w.oid).roboczy || M.tytul(D.oferta(w.oid)))}” zniknie ${esc(dataKrotka(w.termin))} — minął okres przechowywania danych. Karty AML zostaną w archiwum.</span>${ik('prawo')}</a>`).join('')
    + (D.stan.konto && K.przeterminowana() && D.oferty().length ? `<a class="przypomnienie szklo" href="#/ustawienia">${ik('uwaga')}<span>${dni === null ? 'Nie ma jeszcze kopii zapasowej na komputerze' : `Ostatnia kopia zapasowa ${dni} dni temu`}</span>${ik('prawo')}</a>` : ''));
}
// prośba o zalogowanie nowego urządzenia — kod do przepisania na tamtym urządzeniu
function htmlProsb() {
  return (D.stan.prosby || []).map((p) => `<div class="przypomnienie szklo prosba">${ik('uwaga')}<span><b>Logowanie na nowym urządzeniu</b>${p.wlasne ? '' : ` (konto: ${esc(p.konto)})`} — ${esc(p.urzadzenie)}. Jeśli to Ty, wpisz tam kod <b class="kod-prosby">${esc(p.kod.slice(0, 3))} ${esc(p.kod.slice(3))}</b>. Jeśli nie — odrzuć i zmień hasło.</span><button class="btn kontur maly" data-a="prosba-odrzuc" data-id="${esc(p.id)}">Odrzuć</button></div>`).join('');
}
function odswiezPusty() {
  const e = $('#edytor'); e.dataset.tryb = 'pusty';
  wstaw(e, '<div class="pusto" style="padding-top:18vh"><h2>Wybierz ofertę</h2><p>albo dodaj nową przyciskiem +</p></div>');
  $('#podglad').innerHTML = ''; $('#podglad').__html = null;
}

// ---------- oferta ----------
// Karta = spis kafelków; każda sekcja, zdjęcia, ogłoszenie i kontrola to osobny ekran.
const SEK_KARTY = [
  ['podstawy', 'Podstawy'], ['lokalizacja', 'Lokalizacja'], ['lokal', 'Nieruchomość'], ['pom', 'Pomieszczenia'], ['koszty', 'Koszty'], ['wyp', 'Wyposażenie'],
  ['atuty', 'Atuty'], ['minusy', 'Co warto wiedzieć'], ['okolica', 'Okolica'], ['weryfikacja', 'Sprawdziliśmy'], ['energia', 'Świadectwo'],
  ['wlasciciel', 'Właściciel i umowa'],
];
const ZAKLADKI = ['zdjecia', 'ogloszenie', 'kontrola', 'klienci', 'wizyty', 'dokumenty', 'aml'];
// spis karty w trzech grupach, w kolejności pracy; Kontrola nie jest w spisie (jej rolę pełni karta „Co dalej”)
const GRUPY_SPISU = [
  { id: 'ogl', n: 'Oferta', ek: ['podstawy', 'lokalizacja', 'lokal', 'pom', 'koszty', 'energia', 'wyp', 'atuty', 'minusy', 'okolica', 'weryfikacja', 'zdjecia', 'ogloszenie'] },
  { id: 'form', n: 'Umowa i formalności', pryw: true, ek: ['wlasciciel', 'dokumenty', 'aml'] },
  { id: 'sprz', n: 'Sprzedaż', pryw: true, ek: ['klienci', 'wizyty'] },
];
const NAZWY_EKR = { ...Object.fromEntries(SEK_KARTY), zdjecia: 'Zdjęcia', ogloszenie: 'Ogłoszenie', kontrola: 'Kontrola', klienci: 'Klienci', wizyty: 'Wizyty', dokumenty: 'Dokumenty', aml: 'AML' };
const EKRANY = [...GRUPY_SPISU.flatMap((g) => g.ek.map((k) => ({ k, n: NAZWY_EKR[k], sek: SEK_KARTY.some(([x]) => x === k), grupa: g.id }))), { k: 'kontrola', n: 'Kontrola', ukryty: true }];
const EKRANY_NAW = EKRANY.filter((x) => !x.ukryty);
const GRUPA_EKR = Object.fromEntries(EKRANY.map((x) => [x.k, x.grupa]));
// ekrany z danymi osobowymi: tylko dla wspólników, każde otwarcie wymaga PIN-u
const PRYWATNE = new Set(['wlasciciel', 'klienci', 'wizyty', 'dokumenty', 'aml']);
const hashEkranu = (oid, k) => (ZAKLADKI.includes(k) ? `#/o/${oid}/${k}` : `#/o/${oid}/s/${k}`);
const odm = (n, a, b, c) => `${n} ${n === 1 ? a : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? b : c}`;
const DNI = ['nd', 'pn', 'wt', 'śr', 'cz', 'pt', 'sb'];
function dataWizyty(k, krotko = false) {
  const m = String(k || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (!m) return '';
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  const dz = new Date(); dz.setHours(0, 0, 0, 0);
  const roz = Math.round((d - dz) / 86400e3);
  const dzien = roz === 0 ? 'dziś' : roz === 1 ? 'jutro' : roz === -1 ? 'wczoraj' : `${DNI[d.getDay()]} ${m[3]}.${m[2]}${krotko || d.getFullYear() === dz.getFullYear() ? '' : `.${m[1]}`}`;
  return `${dzien}${m[4] ? `, ${m[4]}:${m[5]}` : ''}`;
}
// ikony kafelków bez grafiki z arkusza — złota linia w tym samym stylu
// wszystkie kafelki mają ikony z arkuszy właściciela (img/ikony/<klucz>.png); tu tylko awaryjne
const IK_ZLOTE = { aml: '<rect x="3.2" y="5.2" width="17.6" height="13.6" rx="2.2"/><circle cx="8.9" cy="10.9" r="2.2"/><path d="M5.6 16.2c.6-1.6 1.8-2.5 3.3-2.5s2.7.9 3.3 2.5M14.2 9.8h4.2M14.2 12.6h3.2"/>' };
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
const PODPOWIEDZI = { pietro: '0 = parter' };
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
  if (k === 'wyp') return { z: M.wyposazenie(o).length || o.wypBrak ? 1 : 0, w: 1 };
  if (k === 'klienci') return { z: M.klienci(o).length ? 1 : 0, w: 1 };
  if (k === 'wizyty') { const w = M.wizyty(o); return { z: w.nad.length + w.po.length ? 1 : 0, w: 1 }; }
  if (k === 'dokumenty') { const d = M.dokumenty(o); return { z: d.filter((x) => ['jest', 'nd'].includes(x.s)).length, w: d.length }; }
  if (k === 'aml') { const a = M.amlKarty(o); return { z: a.filter((x) => !M.amlBraki(x).length).length, w: Math.max(a.length, 1) }; }
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
    case 'wlasciciel': return j([o.umowaNr ? `umowa ${o.umowaNr}` : o.wlImie && 'dane wpisane', o.wylacznosc && 'wyłączność']) || 'brak'; // bez nazwiska — dane osobowe dopiero po PIN-ie
    case 'aml': { const a = M.amlKarty(o); if (!a.length) return o.transakcja === 'najem' ? 'najem poniżej 10 000 € — zwykle nie dotyczy' : 'brak kart'; const b = a.filter((x) => M.amlBraki(x).length).length; return j([odm(a.length, 'strona', 'strony', 'stron'), b ? `${b} niekompletne` : 'komplet']); }
    case 'wyp': { const n = M.wyposazenie(o).reduce((a, g) => a + g.el.length, 0); return n ? `${najem ? '' : 'w cenie: '}${odm(n, 'element', 'elementy', 'elementów')}` : o.wypBrak ? (najem ? 'bez wyposażenia' : 'nic nie zostaje') : 'brak'; }
    case 'klienci': { const L = M.klienci(o).filter((x) => x.status !== 'rezygnacja'); const um = L.filter((x) => x.status === 'umowiony').length; return L.length ? j([odm(L.length, 'zainteresowany', 'zainteresowanych', 'zainteresowanych'), um && odm(um, 'umówiony', 'umówionych', 'umówionych')]) : 'brak'; }
    case 'wizyty': { const w = M.wizyty(o); const od = w.po.filter((x) => x.status === 'odbyla').length; return w.nad.length ? j([`najbliższa: ${dataWizyty(w.nad[0].kiedy, true) || 'termin do ustalenia'}`, od && `${od} odbyte`]) : od ? odm(od, 'odbyta', 'odbyte', 'odbytych') : 'brak'; }
    case 'dokumenty': { const d = M.dokumenty(o); const n = d.reduce((a, x) => a + (x.pliki || []).length, 0); return j([n && odm(n, 'plik', 'pliki', 'plików'), `${d.filter((x) => x.s === 'jest').length} z ${d.filter((x) => x.s !== 'nd').length} jest`]); }
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
    e.dataset.tryb = 'oferta'; e.__klucz = klucz; e.scrollTop = 0; S.edycja = null;
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
      ? `<button class="btn kontur maly kopiuj-nagl" data-a="kopiuj" data-co="opis" aria-label="Kopiuj całe ogłoszenie">${ik('kopiuj')}<span>Kopiuj</span></button>`
      : k === 'kontrola' ? pierscien(M.gotowosc(o).procent) : `<span class="licz-ekranu">${stanSekcji(k, o).s === 'ok' ? ik('okKolo', 'sek-ok') : ''}</span>`;
    wstaw($('#of-gora'), `<div class="naglowek-ekranu"><a class="okragly" href="#/o/${o.id}" aria-label="Wróć do karty">${ik('wstecz')}</a>${ikonaEkranu(k)}<h1 class="zloty-tekst ${ekr.n.length > 13 ? 'dlugi' : ''}">${esc(ekr.n)}</h1>${prawy}</div>`);
    const zamkniete = PRYWATNE.has(k) && !(odblok?.oid === o.id && odblok.grupy.has(GRUPA_EKR[k])) && D.sejfUstawiony();
    if (zamkniete) {
      wstaw(t, ekranPinDanych(o.id, GRUPA_EKR[k])); wstaw($('#of-dol'), '');
      if (!t.contains(document.activeElement)) setTimeout(() => $('#pin-dane')?.focus(), 60);
    } else
    if (k === 'zdjecia') tabZdjecia(t, o);
    else if (k === 'ogloszenie') wstaw(t, htmlOgloszenie(o, false));
    else if (k === 'kontrola') wstaw(t, htmlKontrola(o));
    else if (k === 'klienci') wstaw(t, htmlKlienci(o));
    else if (k === 'wizyty') { D.zapiszDostep(o.id, 'wizyty', 'wizyty'); wstaw(t, htmlWizyty(o)); }
    else if (k === 'dokumenty') { wstaw(t, htmlDokumenty(o)); D.przygotujKluczPlikow(); }
    else if (k === 'aml') { D.zapiszDostep(o.id, 'aml', 'aml'); wstaw(t, htmlAml(o)); }
    else { if (k === 'wlasciciel') D.zapiszDostep(o.id, 'wlasciciel', 'wlasciciel'); wstaw(t, ekranSekcji(k, o)); }
    if (!zamkniete) {
    const i = EKRANY_NAW.findIndex((x) => x.k === k);
    const pop = i >= 0 ? EKRANY_NAW[i - 1] : null, nast = i >= 0 ? EKRANY_NAW[i + 1] : null;
    wstaw($('#of-dol'), `<nav class="nawigacja-sek">${pop ? `<a class="btn kontur" href="${hashEkranu(o.id, pop.k)}">${ik('lewo')}<span class="tx">${esc(pop.n)}</span></a>` : '<span></span>'}
      ${nast ? `<a class="btn kontur" href="${hashEkranu(o.id, nast.k)}"><span class="tx">${esc(nast.n)}</span>${ik('prawo')}</a>` : `<a class="btn kontur" href="#/o/${o.id}"><span class="tx">Spis karty</span>${ik('prawo')}</a>`}</nav>`);
    if (S.fokus) pokazPole();
    }
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
      <div class="pasek-oferty-tresc"><h2>${esc(o.roboczy || M.tytul(o))}</h2><div class="zlota-linia"></div>${cenaHTML(o, 'pasek-cena')}
        <button class="pig-status" data-a="status-menu" aria-label="Zmień status oferty">${statusHTML(o.status)}${ik('dol')}</button></div>
      <div class="pasek-oferty-akcje"><button class="okragly" data-a="menu" aria-label="Więcej">${ik('kropki')}</button><button class="serce ${o.ulubiona ? 'akt' : ''}" data-a="ulub" data-oid="${o.id}" aria-label="Wyróżnij">${ik('serce')}</button></div>
    </div>`;
}
// stan sekcji w spisie: ok (✓), brak (czego brakuje do publikacji / do umowy), zal (zalecane), '' (tylko informacja)
function stanSekcji(k, o) {
  const pod = () => { const t = podsumowanie(k, o); return t !== 'brak' ? t : k === 'klienci' ? 'nikt się jeszcze nie zgłosił' : k === 'wizyty' ? 'nic zaplanowanego' : 'nic nie wpisano'; };
  if (k === 'wlasciciel') {
    const b = [['wlImie', 'imię i nazwisko'], ['wlTel', 'telefon'], ['umowaNr', 'numer umowy'], ['umowaData', 'data umowy']].filter(([p]) => puste(o[p])).map(([, n]) => n);
    return b.length ? { s: 'brak', t: `brakuje: ${b.join(', ')}` } : { s: 'ok', t: pod() };
  }
  if (k === 'aml') {
    const a = M.amlKarty(o), nk = a.filter((x) => M.amlBraki(x).length).length;
    if (nk) return { s: 'brak', t: nk === 1 ? '1 karta niekompletna' : `${nk} karty niekompletne` };
    if (!a.length && o.transakcja !== 'najem' && (o.umowaNr || o.umowaData)) return { s: 'brak', t: 'brakuje karty właściciela' };
    return { s: a.length ? 'ok' : '', t: pod() };
  }
  if (k === 'dokumenty') { const d = M.dokumenty(o); return { s: d.length && d.every((x) => ['jest', 'nd'].includes(x.s)) ? 'ok' : '', t: pod() }; }
  if (k === 'klienci' || k === 'wizyty') return { s: '', t: pod() };
  const L = M.checklista(o).filter((x) => (M.CEL_PUNKTU[x.id] || [])[0] === k);
  const tw = L.filter((x) => x.twarde && !x.ok), zal = L.filter((x) => !x.twarde && !x.ok);
  const naz = (x) => M.CEL_PUNKTU[x.id][2];
  if (tw.length) return { s: 'brak', t: `brakuje: ${tw.map(naz).join(', ')}` };
  if (zal.length) return { s: 'zal', t: `zalecane: ${zal.map(naz).join(', ')}` };
  return { s: L.length ? 'ok' : '', t: pod() };
}
function wierszSpisu(o, x, akt = '') {
  const st = stanSekcji(x.k, o);
  const znak = st.s === 'ok' ? ik('okKolo', 'sek-ok') : st.s === 'brak' ? '<i class="kropka-brak" aria-label="Brakuje"></i>' : '';
  return `<a class="wiersz-spisu ${st.s} ${akt === x.k ? 'akt' : ''}" href="${hashEkranu(o.id, x.k)}">
    <span class="ws-ik">${ikonaEkranu(x.k)}</span>
    <span class="ws-tx"><span class="ws-tyt">${esc(x.n)}</span><span class="ws-pod">${esc(st.t || '')}</span></span>
    <span class="ws-st">${znak}</span><span class="strz">${ik('prawo')}</span></a>`;
}
function grupySpisu(o, akt = '') {
  return GRUPY_SPISU.map((g) => {
    const otw = !g.pryw || (odblok?.oid === o.id && odblok.grupy.has(g.id)) || !D.sejfUstawiony();
    return `<section class="grupa-spisu"><h2 class="grupa-spisu-tyt">${g.pryw ? ik(otw ? 'oko' : 'klodka') : ''}<span>${esc(g.n)}</span>${g.pryw ? `<span class="gs-info">${otw ? 'otwarte' : 'PIN'}</span>` : ''}</h2>
      <div class="spis szklo">${EKRANY.filter((x) => x.grupa === g.id).map((x) => wierszSpisu(o, x, akt)).join('')}</div></section>`;
  }).join('');
}
// karta „Co dalej”: co blokuje publikację — stuknięcie prowadzi prosto do pola
function coDalejHTML(o) {
  const g = M.gotowosc(o);
  const nazwa = (x) => { const n = M.CEL_PUNKTU[x.id]?.[2]; return n ? n[0].toUpperCase() + n.slice(1) : x.tekst; };
  const pkt = (x, kl = '') => `<li><button class="cd-pkt ${kl}" data-a="idz" data-id="${x.id}" data-zak="${x.zakladka}"><span>${esc(nazwa(x))}${x.info ? `<span class="cd-info">${esc(x.info)}</span>` : ''}</span>${ik('prawo')}</button></li>`;
  const zal = g.zalecane.length ? `<a class="cd-link" href="#/o/${o.id}/kontrola">${g.zalecane.length === 1 ? '1 rzecz zalecana' : `Zalecane: ${g.zalecane.length}`} — pełna lista kontrolna${ik('prawo')}</a>` : `<a class="cd-link" href="#/o/${o.id}/kontrola">Pełna lista kontrolna${ik('prawo')}</a>`;
  if (g.braki.length) {
    return `<section class="co-dalej szklo brak"><div class="cd-glowa"><div><h2>Przed publikacją uzupełnij</h2><p>Do uzupełnienia: ${g.braki.length} · gotowe ${g.procent}%</p></div>${pierscien(g.procent, 'maly')}</div>
      <ul>${g.braki.slice(0, 5).map((x) => pkt(x)).join('')}</ul>${g.braki.length > 5 ? `<p class="cd-wiecej">i jeszcze ${g.braki.length - 5} — na pełnej liście.</p>` : ''}${zal}</section>`;
  }
  const przyc = o.status === 'przygotowanie' ? `<button class="btn zloty maly" data-a="status-ustaw" data-v="gotowa">Oznacz: gotowa do publikacji</button>` : '';
  return `<section class="co-dalej szklo ok"><div class="cd-glowa"><div><h2>Wszystko wymagane jest</h2><p>${o.status === 'przygotowanie' ? 'Oferta nadaje się do publikacji.' : esc(M.STATUSY[o.status] || '')}</p></div>${ik('okKolo', 'sek-ok')}</div>${przyc}${zal}</section>`;
}
function spisHTML(o) {
  return `${coDalejHTML(o)}${grupySpisu(o)}`;
}
// pole wskazane z „Co dalej” albo z listy kontrolnej: przewiń, podświetl, ustaw kursor
function pokazPole() {
  const k = S.fokus; S.fokus = null;
  setTimeout(() => {
    const el = k && ($(`#ed-tresc [data-k="${k}"]`) || $(`#ed-tresc #f-${k}`));
    const cel = el?.closest('.pole') || el;
    if (!cel) return;
    cel.scrollIntoView({ block: 'center', behavior: 'smooth' });
    cel.classList.add('podswietl'); setTimeout(() => cel.classList.remove('podswietl'), 2200);
    if (el.matches('input, textarea') && !telefon.matches) el.focus({ preventScroll: true });
  }, 80);
}
function oknoStatusu(o) {
  const w = okno('Status oferty', `<div class="menu-lista">${Object.entries(M.STATUSY).map(([k, v]) => `<button data-st="${k}" class="${o.status === k ? 'akt' : ''}">${statusHTML(k)}${o.status === k ? ik('ok') : ''}</button>`).join('')}</div>
    <p class="info-pola" style="margin:10px 0 0">„Gotowa do publikacji” i „Opublikowana” da się ustawić dopiero, gdy wszystkie wymagane punkty są spełnione.</p>`);
  w.addEventListener('click', (ev) => { const el = ev.target.closest('[data-st]'); if (!el) return; w.remove(); const teraz = D.oferta(o.id); if (teraz && teraz.status !== el.dataset.st) zmienStatus(teraz, el.dataset.st); });
}
function ekranSekcji(k, o) {
  const opisy = {
    lokal: 'Przy polach ze źródłem stuknij znacznik i wybierz, skąd jest informacja. „Wg właściciela” pojawi się w ogłoszeniu jako dopisek.',
    energia: 'Jeśli świadectwo jest sporządzone, ustawa wymaga podania w ogłoszeniu wszystkich pięciu wskaźników.',
    wlasciciel: 'Te dane widzicie tylko Wy dwaj. Nigdy nie trafiają do ogłoszenia.',
  };
  let h = opisy[k] ? `<p class="sek-opis">${opisy[k]}</p>` : '';
  if (GRUPY[k] && GRUPY[k].some(([, kl]) => kl.some((x) => wymagane(o).has(x)))) h += '<p class="legenda-wym"><i class="wym"></i>wymagane do publikacji — reszta jest opcjonalna i niczego nie blokuje</p>';
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
    if (k === 'wlasciciel') h += rodoWlasciciela(o);
    if (k === 'lokalizacja') h += `<datalist id="dl-dzielnice">${M.DZIELNICE_LUBLIN.map((d) => `<option value="${d}">`).join('')}</datalist>`;
    return `<div id="sek-${k}">${h}</div>`;
  }
  if (k === 'pom') h = sekcjaPom(o);
  else if (k === 'wyp') h = sekcjaWyp(o);
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
let _wym = { o: null, z: null };
const wymagane = (o) => { if (_wym.o !== o) _wym = { o, z: M.polaWymagane(o) }; return _wym.z; };
const kropkaWym = (k, o) => (wymagane(o).has(k) ? '<i class="wym" title="Wymagane do publikacji" aria-label="wymagane"></i>' : '');
function poleHTML(p, o, calaSzerokosc = false) {
  const id = `f-${p.k}`;
  const v = wartoscPola(p, o);
  const pol = POL.has(p.k) && !calaSzerokosc ? 'pol' : '';
  if (p.t === 'b') {
    const inf = p.info ? p.info(o) : '';
    return `<div class="pole pelna"><label class="przel"><span class="tekst">${esc(p.e)}</span><input type="checkbox" data-k="${p.k}" data-t="b" ${o[p.k] ? 'checked' : ''}><span class="suwak"></span></label>${inf ? `<div class="info-pola">${esc(inf)}</div>` : ''}</div>`;
  }
  if (p.t === 'w' && pigulkiPasuja(p)) {
    return `<div class="pole pelna"><span class="et">${kropkaWym(p.k, o)}${esc(p.e)}</span><div class="pigulki" role="group" aria-label="${esc(p.e)}">${Object.entries(p.o).map(([k, n]) => `<button type="button" data-a="wybor" data-k="${p.k}" data-v="${k}" class="${v === k ? 'akt' : ''}" aria-pressed="${v === k}">${esc(n)}</button>`).join('')}</div></div>`;
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
  // długa jednostka w polu połówkowym zjadałaby miejsce na liczbę — idzie do etykiety
  const jednWEtykiecie = pol && jedn && jedn.length > 5;
  return `<div class="pole ${p.dlugi || p.zr ? 'pelna' : pol}"><label class="et" for="${id}" title="${esc(p.e)}">${kropkaWym(p.k, o)}${esc(et)}${jednWEtykiecie ? ` <span class="et-j">${esc(jedn)}</span>` : ''}</label><div class="wejscie">${we}${jedn && !jednWEtykiecie ? `<span class="jedn">${esc(jedn)}</span>` : ''}${zr}</div>${nieWiem}</div>`;
}
function sekcjaPom(o) {
  const pom = o.pom || [];
  const suma = pom.reduce((s, p) => s + (Number(p.mRzut ?? p.m) || 0), 0);
  const num = (v) => (puste(v) ? '' : String(v).replace('.', ','));
  return `${panelRzutu(o)}<p class="sek-opis">Wpisz długość i szerokość z dalmierza — od ściany do ściany przez całe pomieszczenie. Wnęki i załamania policzy rzut dopasowany do tych pomiarów. Bez rzutu, przy nieregularnym pomieszczeniu, zostaw wymiary puste i wpisz metraż ręcznie. Suma: <b style="color:var(--gold-l)">${M.m2(Math.round(suma * 100) / 100)}</b>${o.pow ? ` z ${M.m2(o.pow)}` : ''}.</p>
    <datalist id="dl-pom">${M.TYPY_POM.map((x) => `<option value="${x}">`).join('')}</datalist>
    ${pom.map((p, i) => grupa(p.nazwa || `Pomieszczenie ${i + 1}`, `<div class="siatka">
      <div class="pole pelna"><span class="et">Nazwa</span><div class="wejscie"><input data-l="pom" data-i="${i}" data-p="nazwa" data-t="t" list="dl-pom" placeholder="np. Sypialnia" value="${esc(p.nazwa || '')}" aria-label="Nazwa pomieszczenia"></div></div>
      <div class="pole pelna"><span class="et">Wymiary i metraż</span><div class="wymiary">
        <div class="wejscie"><input data-l="pom" data-i="${i}" data-p="a" data-t="n" inputmode="decimal" placeholder="długość" value="${esc(num(p.a))}" aria-label="Długość w metrach"><span class="jedn">m</span></div>
        <span class="razy">×</span>
        <div class="wejscie"><input data-l="pom" data-i="${i}" data-p="b" data-t="n" inputmode="decimal" placeholder="szerokość" value="${esc(num(p.b))}" aria-label="Szerokość w metrach"><span class="jedn">m</span></div>
        <span class="razy">=</span>
        <div class="wejscie ${p.a && p.b ? 'wyliczone' : ''}"><input data-l="pom" data-i="${i}" data-p="m" data-t="n" inputmode="decimal" placeholder="m²" value="${esc(num(p.m))}" aria-label="Metraż" ${p.a && p.b ? 'readonly' : ''}><span class="jedn">m²</span></div>
      </div>${p.mRzut != null && p.a && p.b && Math.abs(p.mRzut - (Number(p.m) || 0)) >= 0.05 ? `<p class="info-pola" style="margin:6px 0 0">Z rzutu dopasowanego do tego pomiaru (cały kształt, z wnękami i załamaniami): <b style="color:var(--gold-l)">${esc(M.m2(p.mRzut))}</b> — ten metraż trafia do ogłoszenia.</p>` : ''}</div>
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

// ----- wyposażenie -----
function sekcjaWyp(o) {
  const najem = o.transakcja === 'najem', w = o.wyp || {};
  const opis = najem ? 'Zaznacz, co najemca zastanie w lokalu. Trafi do ogłoszenia jako „Wyposażenie” i do pól portalu.'
    : 'Zaznacz tylko to, co zostaje w cenie. Resztę właściciel zabiera. W ogłoszeniu: „W cenie zostaje”.';
  let h = `<p class="sek-opis">${opis}</p>`;
  for (const g of M.WYPOSAZENIE) {
    h += grupa(g.g, `<div class="wyp-siatka">${Object.entries(g.el).map(([k, n]) => `<button type="button" class="wyp-el ${w[k] ? 'akt' : ''}" data-a="wyp-el" data-k="${k}" aria-pressed="${!!w[k]}"><span class="pt">${w[k] ? ik('ok') : ''}</span>${esc(n)}</button>`).join('')}</div>`);
  }
  h += grupa('Inne', sekcjaListy(o, 'wypInne', 'Czego nie ma na liście. Konkretnie, z marką lub rokiem, jeśli ją znasz.', 'np. robot sprzątający, 2023'));
  h += grupa('Uwagi', `<div class="siatka"><div class="pole pelna"><label class="et" for="f-wypUwagi">Uwagi do wyposażenia</label><div class="wejscie"><textarea id="f-wypUwagi" data-k="wypUwagi" data-t="t" rows="2" placeholder="${najem ? 'np. meble w sypialni można zabrać na życzenie najemcy' : 'np. szafa w przedpokoju do uzgodnienia'}">${esc(o.wypUwagi || '')}</textarea></div></div>
    <div class="pole pelna"><label class="przel"><span class="tekst">${najem ? 'Lokal bez wyposażenia' : 'Nic nie zostaje w cenie'}</span><input type="checkbox" data-k="wypBrak" data-t="b" ${o.wypBrak ? 'checked' : ''}><span class="suwak"></span></label></div></div>`);
  return h;
}

// ----- klienci, wizyty, dokumenty (tylko dla Was) -----
const grupaZ = (nazwa, prawy, tresc, kl = '') => `<section class="grupa szklo ${kl}"><div class="grupa-glowa"><h2 class="grupa-tyt">${esc(nazwa)}</h2>${prawy}</div>${tresc}</section>`;
const pole = (et, we, kl = 'pelna') => `<div class="pole ${kl}"><span class="et">${esc(et)}</span><div class="wejscie">${we}</div></div>`;
const inp = (k, p, v, typ = 'text', pl = '', dod = '') => `<input data-e="${k}" data-p="${p}" data-t="t" type="${typ}" value="${esc(v ?? '')}" placeholder="${esc(pl)}" autocomplete="off" aria-label="${esc(pl || p)}" ${dod}>`;
const sel = (k, p, v, opcje, pusta = '— wybierz —') => `<select data-e="${k}" data-p="${p}" data-t="w"><option value="">${pusta}</option>${Object.entries(opcje).map(([x, n]) => `<option value="${x}" ${v === x ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>`;
const telLink = (t) => String(t || '').replace(/[^\d+]/g, '');
function kiedyDodany(x) { return x.t ? `${new Date(x.t).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}${x.kto ? ` · ${x.kto}` : ''}` : ''; }

function htmlKlienci(o) {
  const najem = o.transakcja === 'najem';
  const L = M.klienci(o);
  let h = `<p class="sek-opis">Osoby zainteresowane tą ofertą. Widzicie je tylko Wy dwaj, nie trafiają do ogłoszenia. Przy pierwszym kontakcie przekaż informację o przetwarzaniu danych (RODO).</p>
    <button class="dodaj" data-a="kl-dodaj">${ik('plus')}Dodaj klienta</button>`;
  if (!L.length) return `${h}<div class="pusto maly">Nikt się jeszcze nie zgłosił.</div>`;
  for (const x of L) {
    const k = x._k, tel = telLink(x.tel);
    const st = x.status || 'nowy';
    D.zapiszDostep(o.id, k, 'klient');
    const ret = (D.stan.retencja || []).find((w) => w.oid === o.id && w.k === k);
    h += grupaZ(x.imie || 'Nowy klient', `<button type="button" class="zr-tag ${['umowiony', 'oferta', 'transakcja'].includes(st) ? 'akt' : st === 'rezygnacja' ? 'wyg' : ''}" data-a="kl-status" data-e="${k}">${esc(M.KLIENT_STATUSY[st])}${ik('dol')}</button>`, `<div class="siatka">
      ${pole('Imię i nazwisko', inp(k, 'imie', x.imie, 'text', 'jak się przedstawił'))}
      ${pole('Telefon', inp(k, 'tel', x.tel, 'tel', '600 000 000', 'inputmode="tel"'), 'pol')}
      ${pole('E-mail', inp(k, 'email', x.email, 'email', 'opcjonalnie', 'inputmode="email" autocapitalize="none"'), 'pol')}
      ${pole('Skąd', sel(k, 'zrodlo', x.zrodlo, M.KLIENT_ZRODLA), 'pol')}
      ${najem ? pole('Wprowadzka od', `<input data-e="${k}" data-p="od" data-t="d" type="date" value="${esc(x.od || '')}" aria-label="Wprowadzka od">`, 'pol') : pole('Finansowanie', sel(k, 'fin', x.fin, M.FINANSOWANIE), 'pol')}
      <div class="pole pelna"><span class="et">Czego szuka, pytania, ustalenia</span><div class="wejscie"><textarea data-e="${k}" data-p="notatka" data-t="t" rows="3" placeholder="${najem ? 'np. para, bez zwierząt, praca na Felinie' : 'np. budżet do 520 tys., sprzedaje swoje na Czubach'}">${esc(x.notatka || '')}</textarea></div></div>
      <div class="pole pelna"><label class="przel"><span class="tekst">Przekazana informacja o danych osobowych (RODO)</span><input type="checkbox" data-e="${k}" data-p="rodo" data-t="b" ${x.rodo ? 'checked' : ''}><span class="suwak"></span></label></div>
      ${ret ? `<div class="pole pelna"><p class="info-pola" style="margin:0">Dane tej osoby znikną ${new Date(ret.termin).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })} — ${x.status === 'transakcja' ? '5 lat od ostatniej zmiany' : '12 miesięcy bez kontaktu'}. <button class="btn kontur maly" data-a="kl-zachowaj" data-e="${k}">Zachowaj — nadal w kontakcie</button></p></div>` : ''}
      <div class="pole pelna akcje-wpisu">
        ${tel ? `<a class="btn kontur maly" href="tel:${tel}">${ik('tel')}Zadzwoń</a><a class="btn kontur maly" href="sms:${tel}">${ik('sms')}SMS</a>` : ''}
        <button class="btn kontur maly" data-a="wz-dodaj" data-kl="${k}">${ik('kal')}Umów prezentację</button>
        <span class="rozp"></span><span class="dodany">${esc(kiedyDodany(x))}</span>
        <button class="usun-w" data-a="wpis-usun" data-e="${k}" data-co="klienta" aria-label="Usuń klienta">${ik('kosz')}</button>
      </div>
      <div class="pole pelna akcje-wpisu rodo-wpisu"><button class="btn kontur maly" data-a="rodo-wyslij" data-e="${k}">${ik('sms')}Wyślij informację RODO</button><button class="btn kontur maly" data-a="am-z" data-e="${k}">${ik('tarcza')}${M.amlKarty(o).some((a) => a.klient === k) ? 'Karta AML' : 'Załóż kartę AML'}</button>${x.rodoKiedy ? `<span class="dodany">informacja RODO: ${esc(dataKrotka(x.rodoKiedy))}${x.rodoJak ? ` (${esc(x.rodoJak)})` : ''}</span>` : ''}</div>
      <div class="pole pelna akcje-wpisu rodo-wpisu"><button class="btn kontur maly" data-a="kl-eksport" data-e="${k}">${ik('pobierz')}Dane tej osoby</button><button class="btn kontur maly zly-tekst" data-a="kl-rodo-usun" data-e="${k}">Usuń na żądanie (RODO)</button></div></div>`, st === 'rezygnacja' ? 'wygaszona' : '');
  }
  return h;
}

function htmlWizyty(o) {
  const { nad, po } = M.wizyty(o);
  const kl = M.klienci(o);
  const opcjeKl = Object.fromEntries(kl.map((x) => [x._k, x.imie || 'Klient bez imienia']));
  const konta = Object.fromEntries((D.stan.konta || []).map((x) => [x.nazwa, x.nazwa]));
  const karta = (x) => {
    const k = x._k, st = x.status || 'plan', klient = o[x.klient];
    const tel = telLink(klient?.tel);
    return grupaZ(dataWizyty(x.kiedy) || 'Termin do ustalenia', `<span class="zr-tag ${st === 'plan' ? 'akt' : st === 'odwolana' ? 'wyg' : ''}">${esc(M.WIZYTA_STATUSY[st])}</span>`, `<div class="siatka">
      ${pole('Data i godzina', `<input data-e="${k}" data-p="kiedy" data-t="t" type="datetime-local" step="60" value="${esc(x.kiedy || '')}" aria-label="Data i godzina">`)}
      ${pole('Klient', sel(k, 'klient', x.klient, opcjeKl, kl.length ? '— brak —' : 'brak klientów'), 'pol')}
      ${pole('Prowadzi', sel(k, 'kto', x.kto, konta, '— kto? —'), 'pol')}
      <div class="pole pelna"><span class="et">Status</span><div class="pigulki male">${Object.entries(M.WIZYTA_STATUSY).map(([v, n]) => `<button type="button" data-a="wz-status" data-e="${k}" data-v="${v}" class="${st === v ? 'akt' : ''}" aria-pressed="${st === v}">${esc(n)}</button>`).join('')}</div></div>
      ${st === 'odbyla' ? `<div class="pole pelna"><span class="et">Wrażenia klienta</span><div class="wejscie"><textarea data-e="${k}" data-p="opinia" data-t="t" rows="3" placeholder="Co mówił: co mu się podobało, zastrzeżenia, pytania. Przyda się w raporcie dla właściciela.">${esc(x.opinia || '')}</textarea></div></div>` : ''}
      ${pole('Notatka', inp(k, 'notatka', x.notatka, 'text', st === 'plan' ? 'np. klucze od sąsiadki spod 4' : 'krótko'))}
      <div class="pole pelna akcje-wpisu">
        ${tel ? `<a class="btn kontur maly" href="tel:${tel}">${ik('tel')}${esc((klient.imie || 'Klient').split(' ')[0])}</a>` : ''}
        <span class="rozp"></span><span class="dodany">${esc(kiedyDodany(x))}</span>
        <button class="usun-w" data-a="wpis-usun" data-e="${k}" data-co="prezentację" aria-label="Usuń prezentację">${ik('kosz')}</button>
      </div></div>`, st === 'odwolana' ? 'wygaszona' : '');
  };
  let h = `<p class="sek-opis">Prezentacje tej nieruchomości. Wspólnik dostaje powiadomienie o każdej nowej. Po wizycie zapisz wrażenia klienta — z nich zrobicie raport dla właściciela.</p>
    <button class="dodaj" data-a="wz-dodaj">${ik('plus')}Zaplanuj prezentację</button>`;
  if (!nad.length && !po.length) return `${h}<div class="pusto maly">Nie ma jeszcze żadnej prezentacji.</div>`;
  if (nad.length) h += `<h3 class="podtytul">Nadchodzące</h3>${nad.map(karta).join('')}`;
  if (po.length) h += `<h3 class="podtytul">Odbyte i odwołane</h3>${po.map(karta).join('')}`;
  return h;
}

const IK_DOK = { brak: 'x', zamowiony: 'zegar', jest: 'ok', nd: 'kropki' };
function htmlDokumenty(o) {
  const d = M.dokumenty(o);
  const wiersz = (x) => {
    const s = x.s || 'brak';
    const pliki = x.pliki || [];
    return `<div class="dok ${s}">
      <div class="dok-gora"><span class="dok-n">${esc(x.n)}</span>
        <button type="button" class="zr-tag ${s === 'jest' ? 'akt' : s === 'nd' ? 'wyg' : ''}" data-a="dk-status" data-e="${x._k}" data-n="${esc(x.n)}">${ik(IK_DOK[s])}${esc(M.DOK_STATUSY[s])}${ik('dol')}</button></div>
      <div class="dok-pliki">${pliki.map((f) => `<span class="plik"><button type="button" data-a="dk-otworz" data-e="${x._k}" data-id="${f.id}">${ik(f.typ === 'pdf' ? 'pdf' : 'obraz')}<span>${esc(f.nazwa || 'dokument')}</span>${D.czekaNaWyslanie(f.id) ? ik('wysyla', 'czeka') : ''}</button><button type="button" class="x" data-a="dk-usun-plik" data-e="${x._k}" data-id="${f.id}" aria-label="Usuń plik">${ik('x')}</button></span>`).join('')}
        <label class="dodaj-plik">${ik('spinacz')}${pliki.length ? 'Dodaj' : 'Dodaj plik'}<input type="file" accept="image/*,application/pdf,.pdf" multiple data-dok="${x._k}"></label>
        ${x.std ? '' : `<button type="button" class="usun-w" data-a="wpis-usun" data-e="${x._k}" data-co="dokument" aria-label="Usuń dokument">${ik('kosz')}</button>`}
      </div></div>`;
  };
  const std = d.filter((x) => x.std), wl = d.filter((x) => !x.std);
  return `<p class="sek-opis">Skany i PDF-y trzyma serwer — otworzysz je na każdym urządzeniu. Zdjęcie dokumentu możesz zrobić aparatem prosto z listy. Lista dopasowuje się do rodzaju oferty.</p>
    ${grupa(o.transakcja === 'najem' ? 'Dokumenty do najmu' : 'Dokumenty do sprzedaży', `<div class="doki">${std.map(wiersz).join('')}</div>`)}
    ${grupa('Inne dokumenty', `${wl.length ? `<div class="doki">${wl.map(wiersz).join('')}</div>` : '<p class="sek-opis">Np. regulamin wspólnoty, protokół z przeglądu, faktury za remont.</p>'}
      <div class="dodaj-dok"><div class="wejscie"><input id="dk-nowy" placeholder="nazwa dokumentu" autocomplete="off" aria-label="Nazwa nowego dokumentu"></div><button class="btn kontur" data-a="dk-dodaj">${ik('plus')}Dodaj</button></div>`)}`;
}
let kolejkaDok = Promise.resolve();
function dodajPlikiDok(input) {
  const pliki = [...input.files], k = input.dataset.dok, oid = S.id;
  input.value = '';
  if (!pliki.length || !oid) return;
  kolejkaDok = kolejkaDok.then(async () => {
    for (const plik of pliki) {
      try {
        toast(`Dodaję ${plik.name || 'plik'}…`, 4000);
        const wpis = await D.przygotujPlik(oid, plik);
        const o = D.oferta(oid); if (!o) return;
        const x = { ...(o[k] || {}) };
        if (!x.nazwa && !M.dokumentyWymagane(o).some((d) => `dk_${d.k}` === k)) return;
        x.pliki = [...(x.pliki || []), wpis];
        if (!x.s || x.s === 'brak' || x.s === 'zamowiony') x.s = 'jest';
        await D.zmien(oid, { [k]: x });
        toast('Dodano');
      } catch (e) { toast(e?.message || 'Nie udało się dodać pliku', 3500); }
    }
  });
}
async function otworzPlikDok(f) {
  if (f.typ !== 'pdf') {
    const tlo = document.createElement('div');
    tlo.className = 'podglad-zdj';
    tlo.innerHTML = `<img alt="${esc(f.nazwa || 'Dokument')}"><button class="okragly" aria-label="Zamknij">${ik('x')}</button>`;
    tlo.addEventListener('click', () => tlo.remove());
    document.body.appendChild(tlo);
    try { $('img', tlo).src = URL.createObjectURL(await D.blobPliku(f.id)); } catch (e) { tlo.remove(); toast(navigator.onLine ? e.message : 'Połącz się z internetem, żeby otworzyć dokument.', 3500); }
    return;
  }
  // PDF: link z kluczem otwiera się w przeglądarce telefonu (na iPhonie okno z przyciskiem Gotowe)
  const u = !D.czekaNaWyslanie(f.id) && D.adresPliku(f.id);
  if (u) { window.open(u, '_blank', 'noopener'); return; }
  try {
    const b = await D.blobPliku(f.id);
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.target = '_blank'; a.rel = 'noopener'; a.download = f.nazwa || 'dokument.pdf';
    document.body.appendChild(a); a.click(); a.remove();
  } catch (e) { toast(navigator.onLine ? e.message : 'Połącz się z internetem, żeby otworzyć dokument.', 3500); }
}

// zdjęciem głównym może być tylko prawdziwe zdjęcie: nie wizualizacja i nie rzut
const mozeBycGlowne = (z) => !z.wiz && z.pom !== 'rzut';
// korekta tylko prawdziwych zdjęć — nie wizualizacji i nie rzutów z edytora
const doKorekty = (z) => !z.wiz && !z.rzutAuto && !z.rzutAuto3d;
function kafleZdjecia(z) {
  const p = KZ.normuj(z.kor?.par), maGeom = Math.abs(p.obrot) > 0.01 || Math.abs(p.piony) > 0.0005;
  const wyg = p.wariant ? KZ.WARIANTY[p.wariant] : KZ.WYGLAD.some((k) => k !== 'wariant' && p[k] !== KZ.DOMYSLNE[k]) ? 'własna' : '';
  const trwa = liczy.has(z.id), uw = uwagiZdjecia(z);
  return `<div class="zdj-kafle">
      <button class="kafel-zdj ${maGeom ? 'akt' : ''}" data-a="zdj-wyrownaj" data-z="${z.id}" ${trwa ? 'disabled' : ''}>${ik('linijka')}<span>Wyrównaj<small>${trwa ? 'liczę…' : maGeom ? 'piony proste' : 'piony i poziom'}</small></span></button>
      <button class="kafel-zdj ${wyg ? 'akt' : ''}" data-a="zdj-obrobka" data-z="${z.id}" ${trwa ? 'disabled' : ''}>${ik('wiz')}<span>Obróbka<small>${trwa ? 'liczę…' : wyg || 'światło i kolor'}</small></span></button>
      <button class="kafel-zdj szeroki ${z.kor?.ai ? 'akt' : ''}" data-a="zdj-ai" data-z="${z.id}" ${trwa ? 'disabled' : ''}>${ik('gwiazda')}<span>Obróbka AI<small>${trwa ? 'liczę…' : z.kor?.ai ? 'światło z AI, reszta prawdziwa' : 'jak od retuszera — przez Gemini'}</small></span></button>
    </div>${uw.length ? `<div class="uwagi-zdj">${uw.map((u) => `<span>${ik('uwaga')}${esc(UWAGI[u])}</span>`).join('')}</div>` : ''}`;
}

// ----- rzut z edytora -----
function panelRzutu(o) {
  const jest = !!o.rzutPlan;
  const zdj = (o.zdj || []).find((z) => z.rzutAuto) || (o.zdj || []).find((z) => z.rzutAuto3d);
  return `<div class="panel-rzut szklo">
    ${zdj ? `<div class="rzut-mini">${imgMini(zdj.id, 'Rzut')}</div>` : `<img class="rzut-ik" src="img/ikony/pom.png" alt="">`}
    <div class="rzut-tx"><b>${jest ? 'Rzut narysowany' : 'Rzut z wymiarami'}</b><span>${jest ? `zapisany ${kiedy(o.rzutPlan.t)}${o.rzutPlan.kto ? ` · ${esc(o.rzutPlan.kto)}` : ''}` : 'Narysuj ściany albo wczytaj skan z iPhone\'a — obraz trafi do zdjęć, a metraże do pomieszczeń.'}</span></div>
    <button class="btn ${jest ? 'kontur' : 'zloty'} maly" data-a="rzut-otworz">${ik(jest ? 'olowek' : 'plus')}${jest ? 'Edytuj' : 'Narysuj'}</button>
  </div>${jest && !odzyskSprawdzony(o.id) && (o.pom || []).some((p) => p.nazwa && !(p.a && p.b)) ? `<button class="dodaj odzysk" data-a="pom-odzyskaj">${ik('cofnij')}Przywróć wymiary z dalmierza (z historii zmian)</button>` : ''}`;
}
const odzyskSprawdzony = (oid) => { try { return localStorage.getItem(`am-odzysk:${oid}`) === '1'; } catch { return false; } };
async function otworzRzut(o) {
  let plan = null, brakNaSerwerze = false;
  if (o.rzutPlan?.id) {
    // planu może nie być na serwerze (np. zapisany przy starej wersji serwera) — edytor weźmie wtedy wersję z tego urządzenia
    try { plan = await (await D.blobPliku(o.rzutPlan.id)).text(); } catch { brakNaSerwerze = true; }
  }
  await R.wloz(`wejscie:${o.id}`, { plan, brakNaSerwerze, nazwa: o.roboczy || M.tytul(o), pom: (o.pom || []).map((p) => ({ nazwa: p.nazwa, a: p.a, b: p.b, m: p.m })), t: o.rzutPlan?.t ?? null });
  location.href = `plan.html?am=${encodeURIComponent(o.id)}`;
}
let odbieranie = false;
async function odbierzRzuty() {
  if (odbieranie || !D.stan.token) return;
  odbieranie = true;
  try {
    for (const w of await R.wyniki()) {
      const o = D.oferta(w.oid);
      if (!o || !(w.png || w.png3d)) { await R.usun(`wynik:${w.oid}`); continue; }
      toast('Zapisuję rzut w ofercie…', 4000);
      // 2D (rzutAuto) i 3D (rzutAuto3d) — każdy podmienia tylko swoje poprzednie zdjęcie
      const widoki = [[w.png, 'rzutAuto', 'rzut.png'], [w.png3d, 'rzutAuto3d', 'rzut-3d.png']].filter(([b]) => b);
      const nowe = await D.przygotujZdjecia(w.oid, widoki.map(([b, , n]) => new File([b], n, { type: b.type || 'image/png' })));
      const plan = await D.przygotujPlanRzutu(w.oid, w.plan);
      const o2 = D.oferta(w.oid);
      const zdj = [...(o2.zdj || [])];
      const stareL = [];
      widoki.forEach(([, flaga], k) => {
        const n = nowe[k]; n.pom = 'rzut'; n[flaga] = true;
        const i = zdj.findIndex((z) => z[flaga]);
        if (i >= 0) { stareL.push(zdj[i]); zdj.splice(i, 1, n); }
        else { const j = zdj.findIndex((z) => z.rzutAuto || z.rzutAuto3d); if (j >= 0) zdj.splice(flaga === 'rzutAuto' ? j : j + 1, 0, n); else zdj.push(n); }
      });
      if (!zdj.some((z) => z.glowne)) { const p = zdj.find(mozeBycGlowne); if (p) p.glowne = true; }
      const staryPlan = o2.rzutPlan?.id;
      await D.zmien(w.oid, { zdj: zdj.map((z) => JSON.parse(JSON.stringify(z))), rzutPlan: { id: plan.id, t: plan.t, kto: D.stan.konto?.nazwa || '' } });
      await R.usun(`wynik:${w.oid}`);
      for (const st of stareL) D.usunZdjeciePlik(st.id);
      if (staryPlan) D.usunPlik(staryPlan);
      const pokoje = R.nazwyPomieszczen((w.pokoje || []).filter((r) => r.m != null));
      if (pokoje.length) zaproponujPomieszczenia(w.oid, pokoje);
      else toast('Rzut zapisany w ofercie', 3000);
    }
  } catch (e) { toast(e?.message || 'Nie udało się zapisać rzutu', 4000); }
  finally { odbieranie = false; }
}
function zaproponujPomieszczenia(oid, pokoje) {
  const o = D.oferta(oid);
  const nazwane = pokoje.filter((r) => r.nazwa);
  const sk = R.scalPomieszczenia(o.pom || [], pokoje, M.noweId);
  const suma = nazwane.reduce((a, r) => a + r.m, 0);
  const zm = new Map(sk.porownanie.map((x) => [x.nazwaRzutu.toLowerCase(), x]));
  const wym = (p) => `${M.liczba(p.a)} × ${M.liczba(p.b)} m`;
  const w = okno('Pomieszczenia z rzutu', `<p class="sek-opis" style="margin-top:0">Rzut zapisany. Edytor policzył metraż wewnętrzny (podłoga między ścianami). Twoje pomiary dalmierzem zostają bez zmian.</p>
    <ul class="pom-rzut">${nazwane.map((r) => { const n = r.kond ? `${r.nazwa} (${r.kond})` : r.nazwa; const p = zm.get(n.toLowerCase()); const inna = p && p.nazwa.toLowerCase() !== n.toLowerCase() ? ` → w karcie „${esc(p.nazwa)}”` : '';
      return `<li><span>${esc(n)}${p ? `<small>${p.dop ? `Rzut dopasowany do Twojego pomiaru ${esc(wym(p))} — metraż z całego kształtu, z wnękami${inna}` : `Twój pomiar ${esc(M.m2(p.pomiar))} — zostaje${inna}${Math.abs(p.pomiar - p.rzut) >= 0.3 ? ` · rzut niedopasowany, różnica ${esc(M.liczba(Math.round((p.rzut - p.pomiar) * 100) / 100))} m²` : ''}`}</small>` : ''}</span><b>${esc(M.m2(r.m))}</b></li>`; }).join('')}<li class="suma"><span>Razem wg rzutu</span><b>${esc(M.m2(Math.round(suma * 100) / 100))}</b></li></ul>
    ${sk.bezNazwy ? `<p class="info-pola">${sk.bezNazwy} ${sk.bezNazwy === 1 ? 'pomieszczenie nie ma' : 'pomieszczenia nie mają'} nazwy — nadaj je w edytorze, żeby też trafiły do karty.</p>` : ''}
    <p class="info-pola">Pomieszczenia bez pomiaru dostaną metraż z rzutu, nowe zostaną dopisane.${sk.porownanie.some((p) => p.dop) ? ' Przy zmierzonych i dopasowanych metraż z rzutu zapisze się obok pomiaru i to on trafi do ogłoszenia (wymiary zostają Twoje).' : ''}</p>
    <div class="rzad" style="justify-content:flex-end;margin-top:14px"><button class="btn" data-n>Nie teraz</button><button class="btn zloty" data-t ${nazwane.length && (sk.zmienione || sk.dodane) ? '' : 'disabled'}>${sk.zmienione || sk.dodane ? 'Uzupełnij kartę' : 'Karta jest aktualna'}</button></div>`);
  w.addEventListener('click', async (e) => {
    if (e.target.closest('[data-n]')) { w.remove(); toast('Rzut zapisany w ofercie', 2500); }
    if (e.target.closest('[data-t]')) {
      w.remove();
      const of = D.oferta(oid); const s2 = R.scalPomieszczenia(of.pom || [], pokoje, M.noweId);
      await D.zmien(oid, { pom: s2.pom });
      toast(`Pomieszczenia: ${s2.zmienione} zaktualizowane, ${s2.dodane} dopisane`, 3500);
    }
  });
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
  if (!t.firstChild) t.innerHTML = '<div id="zdj-rzut" data-wstaw></div><div id="zdj-licznik" data-wstaw></div><div class="panel szklo"><div id="zdj-dodaj" data-wstaw></div><p class="postep" id="zdj-postep"></p></div><div id="zdj-braki" data-wstaw></div><div class="zdjecia" id="zdj-siatka" data-wstaw></div>';
  const zdj = o.zdj || [];
  const zwykle = zdj.filter((z) => !z.wiz).length;
  const L = M.checklista(o);
  const bez = L.find((x) => x.id === 'zdjPom');
  const brakRzutu = L.find((x) => x.id === 'rzut' && !x.ok);
  wstaw($('#zdj-rzut', t), panelRzutu(o));
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
      <span class="znaczki">${z.glowne ? '<span class="zn gl">Główne</span>' : ''}${z.wiz ? '<span class="zn wiz">Wizualizacja</span>' : ''}${z.kor ? `<span class="zn kor" title="Poprawione: ${esc(KZ.opisKorekty(z.kor.par))}">Poprawione</span>` : ''}${D.czekaNaWyslanie(z.id) ? `<span class="zn">${ik('wysyla')}</span>` : ''}</span></div>
    <div class="dane-zdj">
      <div class="wejscie"><select data-z="${z.id}" data-p="pom" aria-label="Miejsce zdjęcia">${opcjeMiejsc(o, z.pom)}</select></div>
      ${z.wiz ? `<div class="wejscie"><select data-z="${z.id}" data-p="oryg" aria-label="Oryginał wizualizacji"><option value="">— oryginał tej wizualizacji —</option>${oryginaly.map((x) => `<option value="${x.id}" ${z.oryg === x.id ? 'selected' : ''}>Zdjęcie ${zdj.indexOf(x) + 1}${x.pom ? ` · ${esc(nazwaMiejsca(x, o))}` : ''}</option>`).join('')}</select></div>` : ''}
      <div class="wejscie"><input data-z="${z.id}" data-p="opis" placeholder="Podpis (opcjonalnie)" value="${esc(z.opis || '')}" aria-label="Podpis"></div>
      ${doKorekty(z) ? kafleZdjecia(z) : ''}
    </div>
    <div class="akcje">
      <button data-a="zdj-ruch" data-z="${z.id}" data-v="-1" aria-label="Przesuń wcześniej" ${i === 0 ? 'disabled' : ''}>${ik('lewo')}</button>
      <button data-a="zdj-ruch" data-z="${z.id}" data-v="1" aria-label="Przesuń dalej" ${i === zdj.length - 1 ? 'disabled' : ''}>${ik('prawo')}</button>
      <button data-a="zdj-gl" data-z="${z.id}" class="${z.glowne ? 'akt' : ''}" aria-label="Zdjęcie główne" title="Zdjęcie główne">${ik('gwiazda')}</button>
      <button data-a="zdj-popraw" data-z="${z.id}" class="${z.kor ? 'akt' : ''}" aria-label="Edytor zdjęcia" title="Edytor: suwaki, kadr, przywrócenie oryginału" ${doKorekty(z) ? '' : 'disabled'}>${ik('suwaki')}</button>
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
    ${htmlTytulWstep(o, tyt, bloki)}
    <div class="karta-og szklo">${bloki.map((b, i) => b.tyt === 'WSTĘP' ? '' : `<div class="blok-og ${b.tyt === 'SPRAWDZILIŚMY' ? 'spr' : ''}">
      <div class="blok-glowa"><h3>${esc(b.tyt.toLowerCase().replace(/^./, (c) => c.toUpperCase()))}</h3><button class="btn kontur" data-a="kopiuj-blok" data-v="${i}">${ik('kopiuj')}Kopiuj</button></div>
      ${b.linie.some((l) => l.startsWith('– ')) ? `<ul>${b.linie.map((l) => liniaHTML(l, b.tyt)).join('')}</ul>` : b.linie.map((l) => liniaHTML(l, b.tyt)).join('')}
    </div>`).join('')}</div>
    <div class="karta-og szklo"><div class="blok-og"><div class="blok-glowa"><h3>Facebook, Instagram</h3><button class="btn kontur" data-a="kopiuj" data-co="krotki">${ik('kopiuj')}Kopiuj</button></div><pre class="tekst-og">${esc(kr)}</pre></div></div>
    <div class="karta-og szklo"><div class="blok-og"><div class="blok-glowa"><h3>Pola portalu</h3></div><div>${pola.map((p, i) => `<div class="pp"><span><small>${esc(p.e)}</small>${esc(p.v)}</span><button class="okragly" data-a="kopiuj" data-co="pole" data-v="${i}" aria-label="Kopiuj: ${esc(p.e)}">${ik('kopiuj')}</button></div>`).join('')}</div></div></div>`;
}
// tytuł i wstęp: złożone z danych, ołówek otwiera edycję; własny tekst zastępuje automatyczny
function htmlTytulWstep(o, tyt, bloki) {
  const iw = bloki.findIndex((b) => b.tyt === 'WSTĘP');
  const wstep = iw >= 0 ? bloki[iw].tekst : '';
  const blok = (k, nazwa, tekst, auto, kopiuj) => {
    const wlasny = !!(o[k] && String(o[k]).trim());
    const edycja = S.edycja === k;
    const info = wlasny ? `<div class="wlasny">${ik('olowek')}<span>Własny tekst — nie zmienia się razem z danymi.</span><button data-a="przywroc" data-k="${k}">${ik('cofnij')}Przywróć z danych</button></div>` : '';
    return `<div class="blok-og">
      <div class="blok-glowa"><h3>${nazwa}</h3>${k === 'tytul' ? `<span class="znaki">${tyt.length} zn.</span>` : ''}
        <button class="okragly olowek ${edycja ? 'akt' : ''}" data-a="edytuj" data-k="${k}" aria-label="${edycja ? 'Zakończ edycję' : `Edytuj: ${nazwa.toLowerCase()}`}">${ik(edycja ? 'ok' : 'olowek')}</button>${kopiuj}</div>
      ${edycja
    ? `<div class="wejscie"><textarea id="f-${k}" data-k="${k}" data-t="t" data-auto="${k}" rows="${k === 'tytul' ? 2 : 5}" aria-label="${nazwa}">${esc(o[k] || auto)}</textarea></div>
         <div class="rzad edycja-akcje">${wlasny ? `<button class="btn kontur maly" data-a="przywroc" data-k="${k}">${ik('cofnij')}Przywróć z danych</button>` : `<span class="wyc">Bez ocen i pustych słów — kontrola je wyłapie.</span>`}<span class="rozp"></span><button class="btn zloty maly" data-a="edytuj" data-k="${k}">Gotowe</button></div>`
    : `${k === 'tytul' ? `<div class="tytul-og">${esc(tekst)}</div>` : `<p class="wstep-og">${esc(tekst)}</p>`}${info}`}
    </div>`;
  };
  return `<div class="karta-og szklo">
    ${blok('tytul', 'Tytuł', tyt, M.tytulAuto(o), `<button class="btn kontur" data-a="kopiuj" data-co="tytul">${ik('kopiuj')}Kopiuj</button>`)}
    ${blok('lead', 'Wstęp', wstep, M.wstepAuto(o), iw >= 0 ? `<button class="btn kontur" data-a="kopiuj-blok" data-v="${iw}">${ik('kopiuj')}Kopiuj</button>` : '')}
  </div>`;
}
// ----- kontrola -----
function htmlKontrola(o) {
  const L = M.checklista(o);
  const tw = L.filter((x) => x.twarde), zal = L.filter((x) => !x.twarde);
  const g = M.gotowosc(o);
  const li = (x) => `<li data-a="idz" data-id="${x.id}" data-zak="${x.zakladka}"><span class="znak ${x.ok ? 'ok' : x.twarde ? 'nie' : 'zal'}">${ik(x.ok ? 'ok' : x.twarde ? 'x' : 'uwaga')}</span><span>${esc(x.tekst)}${x.info && !x.ok ? `<span class="info">${esc(x.info)}</span>` : ''}</span>${x.ok ? '' : `<span class="strz">${ik('prawo')}</span>`}</li>`;
  return `<div class="karta-og szklo"><div class="blok-og"><div class="blok-glowa"><h3>Status</h3></div>
      <button class="pig-status duza" data-a="status-menu">${statusHTML(o.status)}${ik('dol')}</button></div></div>
    <div class="karta-og szklo"><div class="blok-og"><div class="blok-glowa"><h3>Wymagane</h3><span class="sek-licz">${tw.filter((x) => x.ok).length}/${tw.length}</span>${pierscien(Math.round((tw.filter((x) => x.ok).length / Math.max(1, tw.length)) * 100), 'maly')}</div><ul class="check">${tw.map(li).join('')}</ul></div></div>
    <div class="karta-og szklo"><div class="blok-og"><div class="blok-glowa"><h3>Zalecane</h3></div><ul class="check">${zal.map(li).join('')}</ul></div></div>`;
}

// ----- PIN przy każdym otwarciu danych osobowych (właściciel, klienci, wizyty, dokumenty, AML, historia, archiwum) -----
const dataKrotka = (v) => { const d = new Date(typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T12:00` : v); return Number.isNaN(+d) ? '' : d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }); };
function ekranPinDanych(oid, grupa) {
  const g = GRUPY_SPISU.find((x) => x.id === grupa);
  return `<form class="pin-dane szklo" id="f-pin-dane" autocomplete="off">
    <span class="pin-dane-ik">${ik('klodka')}</span>
    <h2>${esc(g?.n || 'Dane osobowe')}</h2>
    <p>Tu są dane osobowe klientów i właścicieli. Wpisz PIN — otworzy całą grupę „${esc(g?.n || '')}” w tej ofercie.</p>
    <div class="wejscie"><input id="pin-dane" data-oid="${esc(oid)}" data-grupa="${esc(grupa || '')}" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" aria-label="PIN"></div>
    <p class="blad" id="pin-dane-blad"></p>
    <button class="btn zloty" type="submit">Otwórz</button>
  </form>`;
}
const komunikatPinu = (r) => (r.zostalo === 1 ? 'Zły PIN. Została 1 próba — potem dane znikną z tego urządzenia.' : `Zły PIN. Zostały ${r.zostalo} próby.`);
function otworzGrupe(oid, grupa) {
  odblok = { oid, grupy: new Set([...(odblok?.oid === oid ? odblok.grupy : []), grupa]) };
}
async function sprawdzPinDanych(pole) {
  if (pole.dataset.trwa || !/^\d{6}$/.test(pole.value)) return;
  pole.dataset.trwa = '1';
  const r = await D.odblokuj(pole.value);
  delete pole.dataset.trwa;
  if (r.ok) { otworzGrupe(pole.dataset.oid, pole.dataset.grupa); Z.aktywnosc(); pole.blur(); odswiez(); return; }
  if (r.wyczyszczono) return;
  pole.value = ''; $('#pin-dane-blad').textContent = komunikatPinu(r);
}
document.addEventListener('submit', (e) => { if (e.target.id !== 'f-pin-dane') return; e.preventDefault(); sprawdzPinDanych($('#pin-dane')); });
function pytajPin(powod, dalej) {
  formOkna('Wpisz PIN', `<p class="tekst-ust" style="padding:0 0 8px">${esc(powod)}.</p>${polePin('pin-okno', 'PIN')}`, 'Otwórz', async (v) => {
    const r = await D.odblokuj(v('pin-okno'));
    if (r.wyczyszczono) return '';
    if (!r.ok) { $('#pin-okno').value = ''; return komunikatPinu(r); }
    Z.aktywnosc(); setTimeout(dalej, 0);
  });
}

// ----- RODO: informacja dla właściciela i klienta -----
function rodoWlasciciela(o) {
  const ma = M.amlKarty(o).some((a) => a.wlasciciel);
  return grupa('Ochrona danych (RODO) i AML', `<div class="siatka">
    <div class="pole pelna"><label class="przel"><span class="tekst">Przekazana informacja o danych osobowych (RODO)${o.wlRodoKiedy ? ` — ${esc(dataKrotka(o.wlRodoKiedy))}` : ''}</span><input type="checkbox" data-k="wlRodo" ${o.wlRodo ? 'checked' : ''}><span class="suwak"></span></label></div>
    <div class="pole pelna akcje-wpisu rodo-wpisu"><button class="btn kontur maly" data-a="rodo-wyslij" data-e="wlasciciel">${ik('sms')}Wyślij informację RODO</button><button class="btn kontur maly" data-a="am-z" data-e="wlasciciel">${ik('tarcza')}${ma ? 'Karta AML właściciela' : 'Załóż kartę AML właściciela'}</button></div>
    <div class="pole pelna akcje-wpisu rodo-wpisu"><button class="btn kontur maly" data-a="kl-eksport" data-e="wlasciciel">${ik('pobierz')}Dane tej osoby</button><button class="btn kontur maly zly-tekst" data-a="kl-rodo-usun" data-e="wlasciciel">Usuń na żądanie (RODO)</button></div></div>`);
}
function oknoRodo(o, k) {
  const wl = k === 'wlasciciel';
  const x = wl ? { imie: o.wlImie, tel: o.wlTel, email: o.wlEmail } : o[k] || {};
  const f = D.stan.firma || {};
  const tekst = M.klauzula(f, wl ? 'wlasciciel' : 'klient');
  const tel = telLink(x.tel);
  const w = okno('Informacja o danych (RODO)', `${M.firmaUzupelniona(f) ? '' : '<p class="info-pola" style="margin:0 0 10px">Brakuje danych firmy — w tekście są miejsca [do uzupełnienia]. Uzupełnij je w Ustawieniach → Dane firmy.</p>'}
    <div class="klauzula">${esc(tekst).replace(/\n/g, '<br>')}</div>
    <div class="rzad" style="margin-top:12px;flex-wrap:wrap">
      ${x.email ? `<a class="btn zloty maly" data-jak="e-mail" href="mailto:${esc(x.email)}?subject=${encodeURIComponent('Informacja o przetwarzaniu danych osobowych')}&body=${encodeURIComponent(tekst)}">${ik('sms')}Wyślij e-mailem</a>` : ''}
      ${tel ? `<a class="btn ${x.email ? 'kontur' : 'zloty'} maly" data-jak="SMS" href="sms:${tel}${/iPhone|iPad/.test(navigator.userAgent) ? '&' : '?'}body=${encodeURIComponent(tekst)}">${ik('sms')}Wyślij SMS-em</a>` : ''}
      <button class="btn kontur maly" data-jak="kopia">${ik('kopiuj')}Kopiuj tekst</button>
      <button class="btn kontur maly" data-jak="osobiście">Przekazana osobiście / na papierze</button>
    </div>`);
  w.addEventListener('click', async (ev) => {
    const el = ev.target.closest('[data-jak]'); if (!el) return;
    const jak = el.dataset.jak;
    if (jak === 'kopia') await kopiuj(tekst);
    const dzis = new Date().toISOString().slice(0, 10);
    const teraz = D.oferta(o.id); if (!teraz) return;
    if (wl) await D.zmien(o.id, { wlRodo: true, wlRodoKiedy: dzis });
    else await D.zmien(o.id, { [k]: { ...(teraz[k] || {}), rodo: true, rodoKiedy: dzis, rodoJak: jak === 'kopia' ? 'skopiowano' : jak } });
    if (jak !== 'kopia') { w.remove(); toast('Zaznaczone: informacja RODO przekazana'); }
  });
}

// ----- AML: karty stron transakcji -----
const chk = (k, p, v, et) => `<div class="pole pelna"><label class="przel"><span class="tekst">${esc(et)}</span><input type="checkbox" data-e="${k}" data-p="${p}" data-t="b" ${v ? 'checked' : ''}><span class="suwak"></span></label></div>`;
const dataP = (k, p, v, et, kl = 'pol') => pole(et, `<input data-e="${k}" data-p="${p}" data-t="t" type="date" value="${esc(v || '')}" aria-label="${esc(et)}">`, kl);
const tekstP = (k, p, v, et, pl = '', rows = 2) => `<div class="pole pelna"><span class="et">${esc(et)}</span><div class="wejscie"><textarea data-e="${k}" data-p="${p}" data-t="t" rows="${rows}" placeholder="${esc(pl)}">${esc(v || '')}</textarea></div></div>`;
const podtyt = (t) => `<div class="pole pelna aml-pod"><span>${esc(t)}</span></div>`;
function htmlAml(o) {
  const najem = o.transakcja === 'najem';
  const L = M.amlKarty(o);
  const konta = Object.fromEntries((D.stan.konta || []).map((x) => [x.nazwa, x.nazwa]));
  let h = `<p class="sek-opis">Karty AML stron transakcji — dane wymagane przez ustawę o przeciwdziałaniu praniu pieniędzy (art. 33–46). Wypełnij przed podpisaniem umowy pośrednictwa. Skanów nie robimy: dane z dokumentu wpisz do pól. ${najem ? 'Najem z czynszem poniżej 10 000 € miesięcznie nie podlega AML.' : ''} Karty przechowujemy 5 lat od zakończenia współpracy.</p>
    <button class="dodaj" data-a="am-dodaj">${ik('plus')}Dodaj stronę transakcji</button>`;
  if (!L.length) return `${h}<div class="pusto maly">Nie ma jeszcze żadnej karty.</div>`;
  for (const x of L) {
    const k = x._k, typ = x.typ || 'osoba';
    const braki = M.amlBraki(x), poz = M.amlPoziom(x), usun = M.amlUsuniecie(x);
    const tag = braki.length ? `<span class="zr-tag wyg">brakuje: ${braki.length}</span>` : '<span class="zr-tag akt">komplet</span>';
    let b = `<div class="siatka">
      ${braki.length ? `<div class="pole pelna"><p class="info-pola" style="margin:0">Brakuje: ${esc(braki.join(', '))}.</p></div>` : ''}
      ${pole('Rola', sel(k, 'rola', x.rola, M.AML_ROLE), 'pol')}${pole('Typ', sel(k, 'typ', x.typ || 'osoba', M.AML_TYPY, '— typ —'), 'pol')}
      ${chk(k, 'umowa', x.umowa, 'Ma z nami umowę pośrednictwa (jest naszym klientem)')}`;
    if (typ !== 'firma') {
      b += `${podtyt('Dane identyfikacyjne (art. 36)')}
        ${pole('Imię i nazwisko', inp(k, 'imie', x.imie, 'text', 'jak w dokumencie'))}
        ${pole('Obywatelstwo', inp(k, 'obywatelstwo', x.obywatelstwo, 'text', 'np. polskie'), 'pol')}${pole('PESEL', inp(k, 'pesel', x.pesel, 'text', '11 cyfr', 'inputmode="numeric" maxlength="11"'), 'pol')}
        ${x.pesel ? '' : `${dataP(k, 'dataUr', x.dataUr, 'Data urodzenia (gdy brak PESEL)')}${pole('Państwo urodzenia', inp(k, 'krajUr', x.krajUr, 'text', 'gdy brak PESEL'), 'pol')}`}
        ${pole('Dokument', sel(k, 'dokRodzaj', x.dokRodzaj, M.AML_DOKUMENTY), 'pol')}${pole('Seria i numer', inp(k, 'dokNr', x.dokNr, 'text', 'np. ABC123456', 'autocapitalize="characters"'), 'pol')}
        ${pole('Adres zamieszkania', inp(k, 'adresZam', x.adresZam, 'text', 'jeśli go znamy'))}`;
      if (typ === 'jdg') b += `${pole('Firma działalności', inp(k, 'nazwa', x.nazwa, 'text', 'nazwa z CEIDG'))}${pole('NIP', inp(k, 'nip', x.nip, 'text', '10 cyfr', 'inputmode="numeric"'), 'pol')}${pole('Adres działalności', inp(k, 'adres', x.adres, 'text', 'główne miejsce'), 'pol')}`;
    } else {
      b += `${podtyt('Dane firmy (art. 36)')}
        ${pole('Nazwa', inp(k, 'nazwa', x.nazwa, 'text', 'jak w rejestrze'))}
        ${pole('Forma organizacyjna', inp(k, 'forma', x.forma, 'text', 'np. sp. z o.o.'), 'pol')}${pole('NIP', inp(k, 'nip', x.nip, 'text', '10 cyfr', 'inputmode="numeric"'), 'pol')}
        ${pole('Adres siedziby', inp(k, 'adres', x.adres, 'text', 'ulica, miasto'))}
        ${x.nip ? '' : `${pole('Rejestr i państwo (gdy brak NIP)', inp(k, 'rejestr', x.rejestr, 'text', 'np. Companies House, Wielka Brytania'))}${pole('Numer rejestru', inp(k, 'rejestrNr', x.rejestrNr, 'text', ''), 'pol')}${dataP(k, 'rejestrData', x.rejestrData, 'Data rejestracji')}`}
        ${podtyt('Osoba reprezentująca')}
        ${pole('Imię i nazwisko', inp(k, 'repImie', x.repImie, 'text', ''))}${pole('Obywatelstwo', inp(k, 'repObyw', x.repObyw, 'text', ''), 'pol')}${pole('PESEL / data ur.', inp(k, 'repPesel', x.repPesel, 'text', ''), 'pol')}
        ${podtyt('Beneficjent rzeczywisty (kto faktycznie kontroluje firmę)')}
        ${tekstP(k, 'beneficjenci', x.beneficjenci, 'Beneficjenci rzeczywiści', 'imię i nazwisko, obywatelstwo, PESEL — jedna osoba w wierszu', 3)}
        ${dataP(k, 'crbrData', x.crbrData, 'CRBR sprawdzono')}${pole('Zgodne z CRBR?', sel(k, 'crbr', x.crbr, { tak: 'Zgodne', nie: 'Rozbieżność' }), 'pol')}
        ${x.crbr === 'nie' ? tekstP(k, 'crbrRozb', x.crbrRozb, 'Rozbieżność z CRBR (art. 50 ust. 2 pkt 10)', 'co się nie zgadza') : ''}
        ${tekstP(k, 'benTrud', x.benTrud, 'Trudności w ustaleniu beneficjenta (art. 50 ust. 2 pkt 11)', 'jeśli były — co zrobiliście')}`;
    }
    b += `${chk(k, 'pelnomocnik', x.pelnomocnik, 'Działa przez pełnomocnika')}
      ${x.pelnomocnik ? `${pole('Pełnomocnik — imię i nazwisko', inp(k, 'pelImie', x.pelImie, 'text', ''))}${pole('Obywatelstwo', inp(k, 'pelObyw', x.pelObyw, 'text', ''), 'pol')}${pole('PESEL / data ur.', inp(k, 'pelPesel', x.pelPesel, 'text', ''), 'pol')}${pole('Dokument (seria, nr)', inp(k, 'pelDok', x.pelDok, 'text', ''), 'pol')}${pole('Podstawa umocowania', inp(k, 'pelPodstawa', x.pelPodstawa, 'text', 'np. pełnomocnictwo notarialne z dnia'), 'pol')}` : ''}
      ${podtyt('Weryfikacja tożsamości (art. 37)')}
      ${dataP(k, 'weryfData', x.weryfData, 'Sprawdzono')}${pole('Kto', sel(k, 'weryfKto', x.weryfKto, konta, '— kto? —'), 'pol')}
      ${pole('Sposób', sel(k, 'weryfSposob', x.weryfSposob, M.AML_SPOSOBY))}
      ${podtyt('Cel i źródło środków')}
      ${tekstP(k, 'cel', x.cel, 'Cel i charakter współpracy', `np. ${M.AML_ROLE[x.rola] || 'sprzedaż'} — ${M.tytul(o) || 'nieruchomość'}`)}
      ${pole('Źródło środków', inp(k, 'zrodlo', x.zrodlo, 'text', 'np. kredyt w banku X, sprzedaż mieszkania'))}
      ${podtyt('PEP (art. 46)')}
      ${pole('Status', sel(k, 'pep', x.pep, M.AML_PEP), 'pol')}${dataP(k, 'pepData', x.pepData, 'Oświadczenie')}
      ${x.pep && x.pep !== 'nie' ? `${pole('Zgoda wspólnika', sel(k, 'pepZgoda', x.pepZgoda, konta, '— kto? —'), 'pol')}${dataP(k, 'pepZgodaData', x.pepZgodaData, 'Zgoda z dnia')}${tekstP(k, 'pepMajatek', x.pepMajatek, 'Źródło majątku i środków', 'skąd pochodzą pieniądze na transakcję')}` : ''}
      ${podtyt('Listy sankcyjne: UE, ONZ, GIIF, MSWiA')}
      ${dataP(k, 'sankcjeData', x.sankcjeData, 'Sprawdzono')}${pole('Kto', sel(k, 'sankcjeKto', x.sankcjeKto, konta, '— kto? —'), 'pol')}
      ${pole('Wynik', sel(k, 'sankcje', x.sankcje, M.AML_SANKCJE))}
      ${x.sankcje === 'trafienie' ? '<div class="pole pelna"><p class="info-pola zle" style="margin:0">Nie podpisujcie umowy i niczego tej osobie nie udostępniajcie. Zawiadomcie GIIF niezwłocznie (szczególne środki ograniczające, art. 117–118).</p></div>' : ''}
      ${podtyt('Ocena ryzyka (art. 33, 43)')}
      ${Object.entries(M.AML_CZYNNIKI).map(([c, n]) => chk(k, c, x[c], n)).join('')}
      <div class="pole pelna"><p class="info-pola" style="margin:0">Poziom ryzyka: <b>${poz ? esc(M.AML_POZIOMY[poz]) : 'nieustalony'}</b>${poz === 'wysokie' ? ' — wzmożone środki: źródło majątku, zgoda drugiego wspólnika, częstsze monitorowanie.' : ''}</p></div>
      ${poz === 'wysokie' ? '' : pole('Poziom (bez czynników wyższego ryzyka)', sel(k, 'ryzyko', x.ryzyko, { standardowe: 'Standardowe', niskie: 'Niskie (art. 42 — np. jednostka publiczna, spółka giełdowa)' }))}
      ${tekstP(k, 'ryzykoUzas', x.ryzykoUzas, 'Uzasadnienie oceny', 'krótko, dlaczego taki poziom')}
      ${podtyt('Monitorowanie')}
      ${tekstP(k, 'monitor', x.monitor, 'Notatki ze współpracy', 'zmiany danych, nietypowe sytuacje — z datą')}
      ${chk(k, 'podej', x.podej, 'Okoliczności mogące wskazywać na pranie pieniędzy')}
      ${x.podej ? `<div class="pole pelna"><p class="info-pola" style="margin:0">Tajemnica: nikomu, także klientowi, nie mówcie o analizie ani o zawiadomieniu (art. 54). Potwierdzone podejrzenie zgłaszacie przez system GIIF najpóźniej w 2 dni robocze (art. 74).</p></div>
        ${dataP(k, 'podejData', x.podejData, 'Zauważono')}${pole('Decyzja', sel(k, 'podejDecyzja', x.podejDecyzja, M.AML_DECYZJE, '— ocena trwa —'), 'pol')}
        ${tekstP(k, 'podejOpis', x.podejOpis, 'Co zauważyliście', '', 3)}${tekstP(k, 'podejUzas', x.podejUzas, 'Uzasadnienie decyzji', '')}
        ${x.podejDecyzja === 'tak' ? `${dataP(k, 'giifData', x.giifData, 'Zawiadomiono')}${pole('Numer zawiadomienia', inp(k, 'giifNr', x.giifNr, 'text', 'z systemu GIIF'), 'pol')}` : ''}` : ''}
      ${chk(k, 'odmowa', x.odmowa, 'Odmowa lub rozwiązanie współpracy (art. 41)')}
      ${x.odmowa ? `${dataP(k, 'odmowaData', x.odmowaData, 'Data')}${pole('Powód', inp(k, 'odmowaPowod', x.odmowaPowod, 'text', 'np. odmówił podania danych'), 'pol')}` : ''}
      ${podtyt('Zakończenie współpracy')}
      ${dataP(k, 'zakonczenie', x.zakonczenie, 'Zakończono')}<div class="pole pol"><p class="info-pola" style="margin:22px 0 0">${usun ? `Karta zniknie ${esc(dataKrotka(usun))} (5 lat, art. 49).` : 'Od tej daty liczy się 5 lat przechowywania.'}</p></div>
      <div class="pole pelna akcje-wpisu">
        <button class="btn kontur maly" data-a="kl-eksport" data-e="${k}">${ik('pobierz')}Dane dla tej osoby</button>
        <span class="rozp"></span><span class="dodany">${esc(kiedyDodany(x))}</span>
        ${!x.imie && !x.nazwa && !x.pesel && !x.dokNr ? `<button class="usun-w" data-a="wpis-usun" data-e="${k}" data-co="pustą kartę" aria-label="Usuń pustą kartę">${ik('kosz')}</button>` : ''}
      </div></div>`;
    h += grupaZ(`${M.AML_ROLE[x.rola] ? `${M.AML_ROLE[x.rola]}: ` : ''}${M.amlNazwa(x)}`, tag, b, `karta-aml${braki.length ? '' : ' aml-ok'}`);
  }
  return h;
}
async function nowaKartaAml(o, z = {}) {
  const k = `am_${M.noweId(8)}`;
  await D.zmien(o.id, { [k]: { t: Date.now(), kto: D.stan.konto?.nazwa || '', typ: 'osoba', ...z } });
  return k;
}

// ----- ustawienia: dane firmy (do klauzuli RODO), archiwum i rejestr AML, urządzenia -----
function sekcjaFirmy() {
  const f = D.stan.firma || {};
  const p = (k, et, pl = '', typ = 'text') => `<div class="pole"><label class="et" for="f-${k}">${et}</label><div class="wejscie"><input id="f-${k}" data-f="${k}" type="${typ}" value="${esc(f[k] || '')}" placeholder="${esc(pl)}"></div></div>`;
  return `<section class="sek szklo"><h2>Dane firmy (RODO)</h2><div class="sek-tresc">
    <p class="tekst-ust" style="padding:0">Z tych danych aplikacja składa informację o przetwarzaniu danych dla klientów i właścicieli. Wspólne dla obu kont.</p>
    <div class="siatka" style="margin-top:10px">
      ${p('imie1', 'Wspólnik 1 — imię i nazwisko')}${p('firma1', 'Wspólnik 1 — firma')}${p('nip1', 'Wspólnik 1 — NIP', '', 'text')}
      ${p('imie2', 'Wspólnik 2 — imię i nazwisko')}${p('firma2', 'Wspólnik 2 — firma')}${p('nip2', 'Wspólnik 2 — NIP')}
      ${p('nazwaSc', 'Nazwa spółki cywilnej')}${p('adres', 'Adres biura / do korespondencji')}
      ${p('email', 'E-mail biura', '', 'email')}${p('telefon', 'Telefon biura', '', 'tel')}
      ${p('hosting', 'Dostawca serwera', 'Sprint S.A., Polska')}
    </div>
    ${M.firmaUzupelniona(f) ? '' : '<p class="info-pola" style="margin:10px 0 0">Uzupełnij wszystkie pola — do tego czasu informacja RODO ma w tekście miejsca do uzupełnienia.</p>'}
    </div></section>`;
}
async function wszystkieKartyAml() {
  const L = [];
  for (const o of D.oferty()) for (const x of M.amlKarty(o)) L.push({ oferta: M.tytul(o) || o.roboczy || '', adres: [o.ulica && `ul. ${o.ulica}`, o.miasto].filter(Boolean).join(', '), usunieta: false, ...x });
  const arch = await D.archiwumAml();
  for (const a of arch) for (const [k, x] of Object.entries(a.karty)) L.push({ oferta: a.tytul, adres: a.adres, usunieta: true, _k: k, ...x });
  return { L, arch };
}
function oknoArchiwum() {
  pytajPin('Archiwum AML zawiera dane osobowe', async () => {
    const w = okno('Archiwum AML', '<p class="wyc">Wczytuję…</p>');
    try {
      const arch = await D.archiwumAml();
      $('.okno-tresc', w).innerHTML = `<p class="tekst-ust" style="padding:0 0 8px">Karty AML z usuniętych ofert. Każda znika sama po 5 latach od zakończenia współpracy (art. 49 ustawy AML). Karty z bieżących ofert są w ofertach (ekran AML).</p>
        <div class="menu-lista dziennik">${arch.length ? arch.map((a) => Object.values(a.karty).map((x) => `<div class="wiersz-dz"><b>${esc(M.amlNazwa(x))}</b>${x.rola ? ` · ${esc(M.AML_ROLE[x.rola] || '')}` : ''}<br><span class="wyc">${esc(a.tytul)}${a.adres && a.adres !== a.tytul ? ` — ${esc(a.adres)}` : ''} · ${x.pesel ? `PESEL ${esc(x.pesel)} · ` : ''}${x.dokNr ? `dok. ${esc(x.dokNr)} · ` : ''}zakończenie ${esc(dataKrotka(x.zakonczenie))} · usunięcie ${esc(dataKrotka(x.usuniecie))}</span></div>`).join('')).join('') : '<p class="wyc">Pusto — nie ma kart z usuniętych ofert.</p>'}</div>`;
    } catch (er) { $('.okno-tresc', w).innerHTML = `<p class="wyc">${esc(bladSieci(er))}</p>`; }
  });
}
function rejestrAml() {
  pytajPin('Rejestr AML zawiera dane osobowe', async () => {
    try {
      const { L } = await wszystkieKartyAml();
      const kol = [['oferta', 'Oferta'], ['adres', 'Adres'], ['rola', 'Rola'], ['typ', 'Typ'], ['imie', 'Imię i nazwisko'], ['nazwa', 'Firma'], ['obywatelstwo', 'Obywatelstwo'], ['pesel', 'PESEL'], ['dataUr', 'Data urodzenia'], ['krajUr', 'Państwo urodzenia'],
        ['dokRodzaj', 'Dokument'], ['dokNr', 'Seria i numer'], ['adresZam', 'Adres zamieszkania'], ['nip', 'NIP'], ['adres', 'Adres firmy'], ['repImie', 'Reprezentant'], ['beneficjenci', 'Beneficjenci'], ['pelImie', 'Pełnomocnik'],
        ['weryfData', 'Weryfikacja'], ['weryfKto', 'Kto weryfikował'], ['weryfSposob', 'Sposób'], ['pep', 'PEP'], ['pepData', 'Oświadczenie PEP'], ['sankcjeData', 'Sankcje — data'], ['sankcje', 'Sankcje — wynik'],
        ['_poziom', 'Ryzyko'], ['cel', 'Cel'], ['zrodlo', 'Źródło środków'], ['zakonczenie', 'Zakończenie'], ['_braki', 'Braki'], ['_arch', 'Z usuniętej oferty']];
      const pole = (x, k) => (k === '_poziom' ? M.AML_POZIOMY[M.amlPoziom(x)] || '' : k === '_braki' ? M.amlBraki(x).join('; ') : k === '_arch' ? (x.usunieta ? 'tak' : '') : k === 'rola' ? M.AML_ROLE[x.rola] || '' : k === 'typ' ? M.AML_TYPY[x.typ || 'osoba'] : k === 'pep' ? M.AML_PEP[x.pep] || '' : k === 'sankcje' ? (x.sankcje === 'trafienie' ? 'trafienie' : x.sankcje ? 'brak trafień' : '') : k === 'dokRodzaj' ? M.AML_DOKUMENTY[x.dokRodzaj] || '' : k === 'weryfSposob' ? M.AML_SPOSOBY[x.weryfSposob] || '' : x[k] ?? '');
      const csv = (v) => `"${String(v).replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
      const tekst = `﻿${kol.map(([, n]) => csv(n)).join(';')}\r\n${L.map((x) => kol.map(([k]) => csv(pole(x, k))).join(';')).join('\r\n')}\r\n`;
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([tekst], { type: 'text/csv;charset=utf-8' }));
      a.download = `rejestr-aml-${new Date().toISOString().slice(0, 10)}.csv`; document.body.appendChild(a); a.click(); a.remove();
      toast(`Rejestr AML: ${L.length} kart. Plik zawiera dane osobowe — trzymaj go na zaszyfrowanym dysku.`, 4500);
    } catch (er) { toast(bladSieci(er), 4000); }
  });
}
async function oknoUrzadzen() {
  const w = okno('Urządzenia', '<p class="wyc">Wczytuję…</p>');
  const rysuj = async () => {
    try {
      const L = await D.urzadzenia();
      $('.okno-tresc', w).innerHTML = `<p class="tekst-ust" style="padding:0 0 8px">Zalogowane telefony i komputery obu kont. Zgubione urządzenie wyloguj tutaj — dane na nim same się nie skasują, ale nie połączy się już z serwerem, a bez PIN-u nikt ich nie odczyta.</p>
        <div class="menu-lista dziennik">${L.map((x) => `<div class="wiersz-dz urz"><span><b>${esc(x.nazwa)}</b>${x.to ? ' <span class="licznik" style="background:var(--gold);color:#1A1408">to urządzenie</span>' : ''}<br><span class="wyc">${esc(x.kto || '')} · ostatnio ${esc(kiedy(x.ostatnio))}</span></span>${x.to ? '' : `<button class="btn kontur maly zly-tekst" data-urz="${x.id}">Wyloguj</button>`}</div>`).join('')}</div>`;
    } catch (er) { $('.okno-tresc', w).innerHTML = `<p class="wyc">${esc(bladSieci(er))}</p>`; }
  };
  w.addEventListener('click', async (ev) => {
    const el = ev.target.closest('[data-urz]'); if (!el) return;
    if (!(await potwierdz('Wylogować to urządzenie?', 'Przestanie się łączyć z serwerem. Żeby znowu go używać, trzeba się zalogować hasłem i kodem z drugiego urządzenia.', 'Wyloguj'))) return;
    try { await D.wylogujUrzadzenie(el.dataset.urz); toast('Urządzenie wylogowane'); rysuj(); } catch (er) { toast(bladSieci(er), 4000); }
  });
  rysuj();
}

// ----- bezpieczeństwo: zmiana PIN-u i hasła, dziennik dostępu -----
function formOkna(tytul, html, przycisk, wykonaj) {
  const w = okno(tytul, `<form class="form-okna">${html}<div class="blad" style="text-align:left"></div><div class="rzad" style="margin-top:12px"><button class="btn zloty" type="submit">${esc(przycisk)}</button></div></form>`);
  const f = w.querySelector('form'), bl = f.querySelector('.blad');
  f.querySelector('input')?.focus();
  f.addEventListener('submit', async (e) => {
    e.preventDefault(); bl.textContent = '';
    const v = (id) => f.querySelector(`#${id}`).value;
    try { const kom = await wykonaj(v); if (kom) { bl.textContent = kom; return; } w.remove(); } catch (er) { bl.textContent = bladSieci(er); }
  });
}
function zmianaPinu() {
  formOkna('Zmień PIN', polePin('zp-0', 'Obecny PIN') + polePin('zp-1', 'Nowy PIN (6 cyfr)') + polePin('zp-2', 'Powtórz nowy PIN'), 'Zmień PIN', async (v) => {
    if (!pinOk(v('zp-1'))) return 'Nowy PIN: 6 cyfr, nie same jedynki ani 123456.';
    if (v('zp-1') !== v('zp-2')) return 'Nowe PIN-y się różnią.';
    try { await D.zmienPin(v('zp-0'), v('zp-1')); } catch { return 'Obecny PIN się nie zgadza.'; }
    toast('PIN zmieniony');
  });
}
function zmianaHasla() {
  const p = (id, et, ac) => `<div class="pole"><label class="et" for="${id}">${et}</label><div class="wejscie"><input id="${id}" type="password" autocomplete="${ac}" required></div></div>`;
  formOkna('Zmień hasło', p('zh-0', 'Obecne hasło', 'current-password') + p('zh-1', 'Nowe hasło (min. 12 znaków)', 'new-password') + p('zh-2', 'Powtórz nowe hasło', 'new-password'), 'Zmień hasło', async (v) => {
    if (v('zh-1').length < 12) return 'Nowe hasło: co najmniej 12 znaków.';
    if (v('zh-1') !== v('zh-2')) return 'Nowe hasła się różnią.';
    await D.zmienHaslo(v('zh-0'), v('zh-1'));
    toast('Hasło zmienione. Zalogowane urządzenia działają dalej.', 3500);
  });
}
const CO_DZIENNIK = { klient: 'otwarcie danych klienta', wlasciciel: 'otwarcie danych właściciela', dokument: 'otwarcie dokumentu', eksport: 'wydanie danych osoby', usuniecie: 'usunięcie danych osoby', kopia: 'pobranie kopii bazy',
  aml: 'otwarcie kart AML', historia: 'otwarcie historii zmian', archiwum: 'otwarcie archiwum AML', wylogowanie: 'zdalne wylogowanie urządzenia', wizyty: 'otwarcie prezentacji' };
async function pokazDziennik() {
  let L;
  try { L = await D.dziennik(); } catch (er) { toast(bladSieci(er), 3500); return; }
  const nazwaW = (x) => { const o = x.oferta && D.oferta(x.oferta); if (!o) return x.oferta ? '(oferta usunięta)' : ''; const kl = x.pole?.startsWith('kl_') ? o[x.pole]?.imie : ''; return `${M.tytul(o) || o.roboczy || ''}${kl ? ` · ${kl}` : ''}`; };
  okno('Dziennik dostępu', `<p class="tekst-ust" style="padding:0 0 8px">Kto i kiedy oglądał dane osobowe (ostatnie 300 wpisów, przechowywane 5 lat).</p>
    <div class="menu-lista dziennik">${L.length ? L.map((x) => `<div class="wiersz-dz"><b>${esc(kiedy(x.kiedy))}</b> · ${esc(x.kto || '')}${x.urzadzenie ? ` (${esc(x.urzadzenie)})` : ''}<br><span class="wyc">${esc(CO_DZIENNIK[x.co] || x.co)}${nazwaW(x) ? ` — ${esc(nazwaW(x))}` : ''}</span></div>`).join('') : '<p class="wyc">Pusto.</p>'}</div>`);
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
    ${sekcjaUrzadzenia()}
    ${sekcjaKopii()}
    <section class="sek szklo"><h2>Synchronizacja</h2><div class="sek-tresc">
      <p class="tekst-ust" style="padding:0">Wszystko zapisuje się najpierw na urządzeniu, potem od razu na serwerze. Bez internetu pracujesz dalej — zmiany wyślą się same.</p>
      <p style="margin:12px 0 4px">Do wysłania: <b style="color:var(--gold-l)">${D.ileWKolejce()}</b> · stan danych ${D.stan.seq}</p>
      <div class="rzad"><button class="btn kontur maly" data-a="sync">Synchronizuj teraz</button></div></div></section>
    <section class="sek szklo"><h2>Bezpieczeństwo</h2><div class="sek-tresc">
      ${htmlProsb()}
      <p class="tekst-ust" style="padding:0">Dane na tym urządzeniu są zaszyfrowane PIN-em. Aplikacja blokuje się po 10 minutach bez używania. Pięć złych PIN-ów usuwa dane z tego urządzenia — na serwerze zostają. Nowe urządzenie zatwierdzasz kodem z zalogowanego telefonu.</p>
      <div class="rzad" style="margin-top:12px"><button class="btn kontur maly" data-a="pin-zmien">Zmień PIN</button><button class="btn kontur maly" data-a="haslo-zmien">Zmień hasło</button><button class="btn kontur maly" data-a="dziennik">Dziennik dostępu</button></div></div></section>
    ${sekcjaFirmy()}
    <section class="sek szklo"><h2>AML i urządzenia</h2><div class="sek-tresc">
      <p class="tekst-ust" style="padding:0">Archiwum AML to karty klientów także z usuniętych ofert — przechowywane 5 lat od zakończenia współpracy (art. 49 ustawy AML). Rejestr pobierzesz na wypadek kontroli. Zgubiony telefon wylogujesz zdalnie w „Urządzenia”.</p>
      <div class="rzad" style="margin-top:12px"><button class="btn kontur maly" data-a="aml-archiwum">${ik('tarcza')}Archiwum AML</button><button class="btn kontur maly" data-a="aml-rejestr">${ik('pobierz')}Rejestr AML (plik)</button><button class="btn kontur maly" data-a="urzadzenia">Urządzenia</button></div></div></section>
    <section class="sek szklo"><h2>Konto</h2><div class="sek-tresc">
      <p style="margin:6px 0">Zalogowany: <b>${esc(D.stan.konto?.nazwa || '')}</b> <span class="wyc">(${esc(D.stan.konto?.login || '')})</span></p>
      ${D.stan.konta.length > 1 ? `<p class="wyc male" style="margin:0 0 10px">W biurze: ${D.stan.konta.map((k) => esc(k.nazwa)).join(', ')}</p>` : ''}
      <button class="btn zly maly" data-a="wyloguj">Wyloguj to urządzenie</button></div></section>
    <p class="male wyc" style="text-align:center">AM Oferty ${WERSJA}</p>
  </div>`);
}

function sekcjaUrzadzenia() {
  const w = U.wybrane(), u = U.URZADZENIA[w.id], t = U.wynikTestu(), pz = U.POZIOMY[U.poziom()], uw = U.uwagaTestu();
  return `<section class="sek szklo" id="sek-urzadzenie"><h2>Obróbka zdjęć</h2><div class="sek-tresc">
    <p class="tekst-ust" style="padding:0">Wybierz, na czym jest teraz otwarta aplikacja. Przeglądarka nie podaje modelu, więc podpowiadasz go sam — każde urządzenie pamięta swój wybór.</p>
    <div class="siatka" style="padding-top:12px">
      <div class="pole"><label class="et" for="u-urz">To urządzenie</label><div class="wejscie"><select id="u-urz"><option value="">— wybierz —</option>${Object.entries(U.URZADZENIA).map(([k, x]) => `<option value="${k}" ${w.id === k ? 'selected' : ''}>${esc(x.n)}</option>`).join('')}<option value="inne" ${w.id === 'inne' ? 'selected' : ''}>Inne…</option></select></div></div>
      ${w.id === 'inne' ? `<div class="pole"><label class="et" for="u-urz-nazwa">Marka i model</label><div class="wejscie"><input id="u-urz-nazwa" value="${esc(w.nazwa)}" placeholder="np. Samsung Galaxy Tab S9"></div></div>` : ''}
    </div>
    ${u ? `<p class="male wyc" style="margin:4px 0 0">${esc(u.spec)}</p>` : ''}
    <p style="margin:10px 0 4px">Poziom: <b style="color:var(--gold-l)">${esc(pz.n)}</b> <span class="wyc">— ${esc(pz.opis)}</span></p>
    ${t ? `<p class="male wyc" style="margin:0">Test: próbne zdjęcie w ${(t.ms / 1000).toFixed(2).replace('.', ',')} s · karta graficzna w przeglądarce: ${t.gpu ? 'jest' : 'brak'}</p>` : '<p class="male wyc" style="margin:0">Test jeszcze nie był robiony na tym urządzeniu.</p>'}
    ${uw ? `<p class="info-pola" style="margin:8px 0 0">${esc(uw)}</p>` : ''}
    <div class="rzad" style="margin-top:12px"><button class="btn kontur maly" data-a="urz-test">Sprawdź to urządzenie</button></div></div></section>`;
}
async function testUrzadzenia(cicho = false) {
  if (!cicho) toast('Sprawdzam…', 1500);
  await new Promise((r) => setTimeout(r, 30));
  const t = await U.testuj(KZ);
  if (S.ekran === 'ustawienia') odswiezUstawienia();
  if (!cicho) toast(`Gotowe: ${(t.ms / 1000).toFixed(2).replace('.', ',')} s`, 2500);
}

function sekcjaKopii() {
  const k = D.stan.kopia, s = K.stan;
  const kiedyK = k ? `${kiedy(k.kiedy)} · ${esc(k.kto || '')}${k.urzadzenie ? ` (${esc(k.urzadzenie)})` : ''} · ${k.pliki} plików, ${(k.bajty / 1048576).toFixed(0)} MB` : 'jeszcze nie było';
  let tu;
  if (!K.obslugiwana) tu = '<p class="tekst-ust" style="padding:0">Kopię robi aplikacja otwarta na laptopie w Chrome albo Edge — tam wybierasz folder. Na telefonie nic nie trzeba robić.</p>';
  else if (!s.folder) tu = `<p class="tekst-ust" style="padding:0">Wybierz folder na tym komputerze (np. Dokumenty → „AM Oferty kopia”). Aplikacja będzie do niego ściągać nowe zdjęcia, dokumenty i bazę przy każdym otwarciu i co 6 godzin.</p>
    <div class="rzad" style="margin-top:12px"><button class="btn zloty" data-a="kopia-folder">${ik('pobierz')}Wybierz folder na kopię</button></div>`;
  else tu = `<p style="margin:6px 0">Folder na tym komputerze: <b style="color:var(--gold-l)">${esc(s.nazwa)}</b></p>
    ${s.zgoda !== 'granted' && !s.trwa ? '<p class="info-pola" style="margin:4px 0 8px">Przeglądarka prosi o ponowną zgodę na zapis w folderze — kliknij „Zrób kopię teraz”.</p>' : ''}
    ${s.postep || s.blad ? `<p class="${s.blad ? 'blad' : 'wyc'}" style="text-align:left;margin:4px 0 8px">${esc(s.blad || s.postep)}</p>` : ''}
    <div class="rzad"><button class="btn ${s.zgoda !== 'granted' ? 'zloty' : 'kontur'} maly" data-a="kopia-teraz" ${s.trwa ? 'disabled' : ''}>${ik('pobierz')}Zrób kopię teraz</button><button class="btn kontur maly" data-a="kopia-folder">Zmień folder</button></div>`;
  return `<section class="sek szklo"><h2>Kopia zapasowa</h2><div class="sek-tresc">
    <p class="tekst-ust" style="padding:0">Serwer co godzinę kopiuje bazę, a usunięte zdjęcia i dokumenty trzyma 30 dni w koszu. Żeby awaria serwera niczego nie zabrała, wszystko ląduje też na Waszym komputerze.</p>
    <p style="margin:12px 0 10px">Ostatnia kopia na komputerze: <b style="color:${K.przeterminowana() ? 'var(--zle)' : 'var(--gold-l)'}">${kiedyK}</b></p>
    ${tu}</div></section>`;
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
  if (el.dataset.f) { if ((D.stan.firma?.[el.dataset.f] || '') !== el.value.trim()) D.zapiszFirme({ [el.dataset.f]: el.value.trim() }).catch((er) => toast(bladSieci(er), 3500)); return; }
  if (!o) return;
  if (el.dataset.k) {
    const k = el.dataset.k;
    if (k === 'status') return zmienStatus(o, el.value, el);
    let v = wartosc(el);
    if (el.dataset.auto && v !== null && v.trim() === (k === 'tytul' ? M.tytulAuto(o) : M.wstepAuto(o)).trim()) v = null;
    if (JSON.stringify(o[k] ?? null) === JSON.stringify(v)) return;
    D.zmien(S.id, { [k]: v });
  } else if (el.dataset.l) {
    const l = el.dataset.l, i = Number(el.dataset.i), p = el.dataset.p;
    const arr = (o[l] || []).map((x) => ({ ...x }));
    if (!arr[i]) return;
    const v = wartosc(el);
    if (v === null) delete arr[i][p]; else arr[i][p] = v;
    if (l === 'pom' && (p === 'a' || p === 'b')) { const m = M.metrazZWymiarow(arr[i].a, arr[i].b); if (m !== null) arr[i].m = m; delete arr[i].mRzut; } // nowy pomiar — rzut trzeba dopasować od nowa
    D.zmien(S.id, { [l]: arr });
  } else if (el.dataset.e) {
    // wpis: klient / prezentacja / dokument — osobne pole oferty
    const k = el.dataset.e, p = el.dataset.p;
    const x = { ...(o[k] || {}) };
    const v = wartosc(el);
    if (v === null || v === false) delete x[p]; else x[p] = v;
    const kto = { weryfData: 'weryfKto', sankcjeData: 'sankcjeKto' }[p]; // karta AML: kto sprawdzał = zalogowany wspólnik
    if (k.startsWith('am_') && kto && v && !x[kto] && D.stan.konto?.nazwa) x[kto] = D.stan.konto.nazwa;
    if (JSON.stringify(o[k] || {}) === JSON.stringify(x)) return;
    D.zmien(S.id, { [k]: x });
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
const natychmiast = (el) => el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'date' || el.type === 'datetime-local';
const doZapisu = (el) => el.dataset.k || el.dataset.l || el.dataset.w || el.dataset.z || el.dataset.u || el.dataset.e || el.dataset.f;
document.addEventListener('input', (e) => {
  const el = e.target;
  if (el.id === 'pin-dane') { if (/^\d{6}$/.test(el.value)) sprawdzPinDanych(el); return; }
  if (!doZapisu(el) || natychmiast(el)) return;
  clearTimeout(timery.get(el));
  timery.set(el, setTimeout(() => zapisz(el), 450));
});
document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.id === 'pom-dodaj') { S.pomDodawania = el.value; return; }
  if (el.id === 'u-urz') { U.ustaw(el.value, U.wybrane().nazwa); odswiezUstawienia(); if (el.value && !U.wynikTestu()) testUrzadzenia(true); return; }
  if (el.id === 'u-urz-nazwa') { U.ustaw('inne', el.value.trim()); return; }
  if (el.id === 'dodaj-zdj') return dodajZdjecia(el);
  if (el.dataset.dok) return; // obsługuje słuchacz na elemencie (wstaw)
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
    if (!zdj.some((z) => z.glowne)) { const p = zdj.find(mozeBycGlowne); if (p) p.glowne = true; }
    await D.zmien(oid, { zdj });
    toast(`Dodano ${nowe.length} ${nowe.length === 1 ? 'zdjęcie' : nowe.length < 5 ? 'zdjęcia' : 'zdjęć'}`);
    ocenDodane(oid, nowe, pliki);
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

// ---------- korekta zdjęć (jasność, kolor, piony, kadr — bez retuszu; oryginał zostaje) ----------
// wpis zdjęcia po korekcie: nowy plik, w `kor` — id oryginału i ustawienia; odwołania wizualizacji przepięte
// `kor.ai` — id hybrydy z „Obróbki AI” (pełne zdjęcie bez geometrii); dalsze korekty liczą się od niej
async function zapiszKorekte(oid, stareId, wynik, par, org) {
  const nowe = await D.dodajGotoweZdjecie(oid, wynik.blob, wynik.w, wynik.h);
  return podepnijWersje(oid, stareId, nowe, par, org);
}
async function podepnijWersje(oid, stareId, nowe, par, org, ai) {
  const o = D.oferta(oid), z0 = (o.zdj || []).find((z) => z.id === stareId);
  const staraAi = z0?.kor?.ai, noweAi = ai === undefined ? staraAi : ai || undefined;
  const zdj = (o.zdj || []).map((z) => (z.id === stareId ? { ...z, id: nowe.id, w: nowe.w, h: nowe.h, kor: { org, ...(noweAi ? { ai: noweAi } : {}), par: wezPar(par), t: Date.now(), w: z.kor?.w ?? z.w, h: z.kor?.h ?? z.h } }
    : z.oryg === stareId ? { ...z, oryg: nowe.id } : z));
  await D.zmien(oid, { zdj });
  if (stareId !== org && stareId !== noweAi && stareId !== nowe.id) D.usunZdjeciePlik(stareId); // poprzednia wersja poprawionego — oryginał zostaje
  if (staraAi && staraAi !== noweAi && staraAi !== nowe.id) D.usunZdjeciePlik(staraAi);
  return nowe.id;
}
// tylko ustawienia różne od domyślnych (krócej w bazie)
function wezPar(par) { const p = KZ.normuj(par), w = {}; for (const [k, v] of Object.entries(p)) if (v !== KZ.DOMYSLNE[k]) w[k] = typeof v === 'number' ? Math.round(v * 10000) / 10000 : v; return w; }
async function przywrocOryginal(oid, id) {
  const o = D.oferta(oid), z0 = (o.zdj || []).find((z) => z.id === id);
  if (!z0?.kor) return;
  const org = z0.kor.org;
  const ai = z0.kor.ai;
  const zdj = (o.zdj || []).map((z) => (z.id === id ? JSON.parse(JSON.stringify({ ...z, id: org, kor: undefined, w: z.kor.w || z.w, h: z.kor.h || z.h })) : z.oryg === id ? { ...z, oryg: org } : z));
  await D.zmien(oid, { zdj });
  if (id !== org) D.usunZdjeciePlik(id);
  if (ai && ai !== id) D.usunZdjeciePlik(ai);
  toast('Przywrócono oryginał');
}
let edycjaZdjecia = false;
async function poprawZdjecie(oid, id) {
  if (edycjaZdjecia) return;
  const o = D.oferta(oid), z = (o.zdj || []).find((x) => x.id === id);
  if (!z || !doKorekty(z)) return;
  edycjaZdjecia = true;
  try {
    const org = z.kor?.org || id;
    let blob;
    try { blob = await D.blobZdjecia(z.kor?.ai || org); } catch { return toast('Oryginał jest na serwerze — połącz się z internetem, żeby poprawić zdjęcie.', 4000); }
    const w = await otworzEdytor({ blob, par: z.kor?.par, tytul: nazwaMiejsca(z, o), maOryginal: !!z.kor, ik, podglad: U.podglad(), wariant: ulubiona() || 'naturalna' });
    if (!w) return;
    if (w.przywroc) {
      if (await potwierdz('Przywrócić oryginał?', 'Poprawiona wersja zniknie, w ofercie wróci zdjęcie sprzed korekty.', 'Przywróć', 'zloty')) await przywrocOryginal(oid, id);
      return;
    }
    await zapiszKorekte(oid, id, w, w.par, org);
    toast('Zdjęcie poprawione — oryginał zostaje na serwerze', 3000);
  } catch (e) { toast(e.message || 'Nie udało się poprawić zdjęcia', 3500); }
  finally { edycjaZdjecia = false; }
}
// ----- kafelki „Wyrównaj” i „Obróbka” (jedno stuknięcie; edytor tylko do drobnych poprawek) -----
const liczy = new Set(); // id zdjęć, które właśnie się liczą
const tylko = (par, klucze) => Object.fromEntries(Object.entries(KZ.normuj(par)).filter(([k]) => klucze.includes(k)));
async function oryginalZdjecia(z) {
  try { return await D.blobZdjecia(z.kor?.ai || z.kor?.org || z.id); }
  catch { toast('Oryginał jest na serwerze — połącz się z internetem, żeby obrobić zdjęcie.', 4000); return null; }
}
async function zapiszParametry(oid, id, blob, par) {
  const z = (D.oferta(oid).zdj || []).find((x) => x.id === id);
  if (!z) return;
  if (!KZ.zmienia(par)) {
    if (z.kor?.ai) { if (id !== z.kor.ai) await podepnijWersje(oid, id, { id: z.kor.ai, w: z.kor.w || z.w, h: z.kor.h || z.h }, {}, z.kor.org); }
    else if (z.kor) await przywrocOryginal(oid, id);
    return;
  }
  const w = await obrobPelne(blob, par);
  await zapiszKorekte(oid, id, w, par, z.kor?.org || id);
}
async function wyrownajZdjecie(oid, id) {
  if (liczy.has(id)) return;
  const z = (D.oferta(oid).zdj || []).find((x) => x.id === id);
  if (!z || !doKorekty(z)) return;
  liczy.add(id); odswiez();
  try {
    const blob = await oryginalZdjecia(z);
    if (!blob) return;
    const g = KZ.autoWyrownanie(await rozkoduj(blob, 520));
    if (!g.obrot && !g.piony) { toast('Zdjęcie jest proste — nic do wyrównania', 3000); return; }
    const stare = KZ.normuj(z.kor?.par);
    if (Math.abs(stare.obrot - g.obrot) < 0.05 && Math.abs(stare.piony - g.piony) < 0.002) { toast('Już wyrównane', 2500); return; }
    await zapiszParametry(oid, id, blob, { ...(z.kor?.par || {}), obrot: g.obrot, piony: g.piony, px: 0, py: 0 });
    toast('Wyrównane — piony proste', 2500);
  } catch (e) { toast(e.message || 'Nie udało się wyrównać zdjęcia', 3500); }
  finally { liczy.delete(id); odswiez(); }
}
// styl: które wersje wybierasz — po 20 wyborach ulubiona idzie na początek (pamięta to urządzenie)
const STYL = 'am-styl';
function styl() { try { return JSON.parse(localStorage.getItem(STYL) || '{}'); } catch { return {}; } }
function zapiszWybor(w) { const s = styl(); s[w] = (s[w] || 0) + 1; try { localStorage.setItem(STYL, JSON.stringify(s)); } catch { /* trudno */ } }
function ulubiona() {
  const s = styl(), suma = Object.values(s).reduce((a, b) => a + b, 0);
  if (suma < 20) return '';
  const [n, ile] = Object.entries(s).filter(([k]) => KZ.WARIANTY[k]).sort((a, b) => b[1] - a[1])[0] || [];
  return n && ile / suma >= 0.5 ? n : '';
}
async function obrobkaZdjecia(oid, id) {
  if (liczy.has(id)) return;
  const o = D.oferta(oid), z = (o.zdj || []).find((x) => x.id === id);
  if (!z || !doKorekty(z)) return;
  const ul = ulubiona(), kolej = ul ? [ul, ...Object.keys(KZ.WARIANTY).filter((k) => k !== ul)] : Object.keys(KZ.WARIANTY);
  const teraz = KZ.normuj(z.kor?.par).wariant || (z.kor && Object.keys(tylko(z.kor.par, KZ.WYGLAD)).some((k) => KZ.normuj(z.kor.par)[k] !== KZ.DOMYSLNE[k]) ? 'wlasna' : 'oryginal');
  const kafel = (k, n, zn = '') => `<button class="ob-wersja ${teraz === k ? 'akt' : ''}" data-w="${k}" disabled><span class="ob-obraz"><canvas aria-hidden="true"></canvas><span class="ob-licz">Liczę…</span></span><span class="ob-nazwa">${esc(n)}${zn}</span></button>`;
  const w = okno('Obróbka zdjęcia', `<p class="wyc male" style="margin:0 0 12px">Wybierz wersję, która ci się podoba. Zmienia się tylko światło i kolor całego zdjęcia — oryginał zostaje na serwerze.</p>
    <div class="ob-wersje">${kafel('oryginal', 'Bez obróbki')}${kolej.map((k) => kafel(k, KZ.WARIANTY[k], k === ul ? ' <span class="zn styl">Twój styl</span>' : '')).join('')}</div>
    ${teraz === 'wlasna' ? '<p class="wyc male" style="margin:10px 0 0">Teraz: własne ustawienia z edytora.</p>' : ''}`);
  w.classList.add('okno-obrobki');
  let blob, warianty, geom;
  try {
    blob = await oryginalZdjecia(z);
    if (!blob) { w.remove(); return; }
    const prev = await rozkoduj(blob, 900);
    geom = tylko(z.kor?.par, KZ.GEOMETRIA);
    warianty = { oryginal: { ...geom }, ...Object.fromEntries(Object.entries(KZ.autoObrobka(prev)).map(([k, v]) => [k, { ...geom, ...v }])) };
    for (const b of w.querySelectorAll('.ob-wersja')) {
      if (!document.body.contains(w)) return;
      await new Promise((r) => setTimeout(r, 0)); // podgląd kafelek po kafelku — okno nie zamarza
      const par = warianty[b.dataset.w], [tw, th] = KZ.rozmiarWyniku(prev.width, prev.height, par, 640);
      const wyn = KZ.obrob(prev, par, tw, th), cv = b.querySelector('canvas');
      cv.width = tw; cv.height = th; cv.getContext('2d').putImageData(new ImageData(wyn.data, tw, th), 0, 0);
      b.querySelector('.ob-licz').remove(); b.disabled = false;
    }
  } catch (e) { w.remove(); toast(e.message || 'Nie udało się przygotować wersji', 3500); return; }
  w.addEventListener('click', async (e) => {
    const b = e.target.closest('.ob-wersja');
    if (!b || b.disabled) return;
    const k = b.dataset.w;
    w.remove();
    if (k === teraz) return;
    if (k !== 'oryginal') zapiszWybor(k);
    liczy.add(id); odswiez();
    try {
      await zapiszParametry(oid, id, blob, warianty[k]);
      toast(k === 'oryginal' ? 'Bez obróbki' : `Obróbka: ${KZ.WARIANTY[k]} — oryginał zostaje na serwerze`, 3000);
    } catch (er) { toast(er.message || 'Nie udało się zapisać zdjęcia', 3500); }
    finally { liczy.delete(id); odswiez(); }
  });
}
// ----- „Obróbka AI”: AI (np. Gemini) robi ładne światło, my bierzemy z niej tylko światło i kolor -----
// piksele, geometria, napisy i przedmioty zostają z oryginału; kolory materiałów nie mogą uciec od prawdziwych
const POLECENIE_AI = `Edit this real estate interior photo. Improve ONLY the light and colour, like a professional real estate photo retoucher in Lightroom.

Make it bright, airy and warm: walls and ceiling clean warm white (soft cream), wood warm and rich, natural soft daylight look, open the shadows, keep blacks deep, crisp and clean.

STRICT RULES:
- Keep the exact same framing, crop, camera angle and aspect ratio. Do not zoom, rotate or reframe.
- Do not add, remove, move or redesign any object.
- Do not change any text, lettering or logos.
- Do not add sun rays, light beams, shadows of blinds, reflections or glossy floor effects.
- Do not turn on lamps that are off, do not add light fixtures.
- Do not change materials, patterns, marble veins or wood grain.
- Output in the highest resolution possible.`;
function silnikHybrydy() {
  let w = null, zepsuty = false;
  try { w = new Worker(new URL('./hybrydaWorker.js', import.meta.url), { type: 'module' }); w.onerror = () => { zepsuty = true; }; } catch { w = null; }
  const czekaj = (typ) => new Promise((ok, zle) => {
    const f = (e) => { if (e.data.typ === 'blad') { off(); zle(new Error(e.data.blad)); } else if (e.data.typ === typ) { off(); ok(e.data); } };
    const er = () => { off(); zle(Object.assign(new Error('worker'), { worker: true })); };
    const off = () => { w.removeEventListener('message', f); w.removeEventListener('error', er); };
    w.addEventListener('message', f); w.addEventListener('error', er);
  });
  // zapas bez workera (stare przeglądarki)
  let org = null, podglad = null, nauka = null;
  const lokalnie = {
    async przygotuj(o, ai, ust, bok) { org = o; nauka = HY.przygotuj(o, ai); podglad = HY.zmniejsz(o, bok); return { zgodnosc: nauka.zgodnosc, pokrycie: nauka.pokrycie, org: podglad, wynik: HY.naloz(podglad, nauka, ust) }; },
    async podglad(ust) { return { wynik: HY.naloz(podglad, nauka, ust) }; },
    async pelne(ust) { return { wynik: HY.naloz(org, nauka, ust) }; },
  };
  let tryb = w ? 'worker' : 'lokalnie';
  return {
    async przygotuj(o, ai, ust, bok) {
      if (tryb === 'worker' && !zepsuty) {
        const kopia = { data: new Uint8ClampedArray(o.data), width: o.width, height: o.height }; // gdyby worker padł — mamy z czego liczyć
        try { const p = czekaj('gotowe'); w.postMessage({ typ: 'przygotuj', org: o, ai, ust, bokPodgladu: bok }, [o.data.buffer]); return await p; }
        catch (e) { if (!e.worker) throw e; tryb = 'lokalnie'; w.terminate(); return lokalnie.przygotuj(kopia, ai, ust, bok); }
      }
      tryb = 'lokalnie'; return lokalnie.przygotuj(o, ai, ust, bok);
    },
    podglad(ust) { if (tryb === 'lokalnie') return lokalnie.podglad(ust); const p = czekaj('podglad'); w.postMessage({ typ: 'podglad', ust }); return p; },
    pelne(ust) { if (tryb === 'lokalnie') return lokalnie.pelne(ust); const p = czekaj('pelne'); w.postMessage({ typ: 'pelne', ust }); return p; },
    zamknij() { w?.terminate(); },
  };
}
const naCanvas = (cv, img) => { cv.width = img.width; cv.height = img.height; cv.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(img.data.buffer, img.data.byteOffset, img.data.length), img.width, img.height), 0, 0); };
async function doJpeg(img, jakosc = 0.92) {
  const c = document.createElement('canvas'); naCanvas(c, img);
  const b = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', jakosc));
  c.width = c.height = 0;
  if (!b) throw new Error('Nie udało się zapisać zdjęcia.');
  return b;
}
async function obrobkaAI(oid, id) {
  if (liczy.has(id)) return;
  const o = D.oferta(oid), z = (o.zdj || []).find((x) => x.id === id);
  if (!z || !doKorekty(z)) return;
  const org = z.kor?.org || id;
  let blobOrg;
  try { blobOrg = await D.blobZdjecia(org); } catch { return toast('Oryginał jest na serwerze — połącz się z internetem.', 4000); }
  const ust = { ...HY.DOMYSLNE };
  const w = okno('Obróbka AI', `<div class="ai-kroki">
      <div class="ai-krok"><b>1</b><div><p>Wyślij oryginał do AI (np. aplikacja Gemini) z gotowym poleceniem — skopiuj je, udostępnij zdjęcie, wklej polecenie.</p>
        <div class="ai-przyciski"><button class="btn kontur maly" data-ai="kopiuj">${ik('dok')}Kopiuj polecenie</button><button class="btn kontur maly" data-ai="udostepnij">${ik('obraz')}Udostępnij zdjęcie</button></div></div></div>
      <div class="ai-krok"><b>2</b><div><p>Zapisz wynik z AI w telefonie i wgraj go tutaj.</p>
        <div class="ai-przyciski"><label class="btn zloty maly">${ik('plus')}Wgraj wynik z AI<input type="file" accept="image/*" data-ai="plik" hidden></label></div></div></div>
    </div>
    <div class="ai-wynik" hidden>
      <div class="ai-obraz"><canvas aria-label="Podgląd po obróbce"></canvas><span class="ai-stan">Liczę…</span></div>
      <p class="wyc male ai-info"></p>
      <label class="ai-suwak"><span>Siła <i data-ai-w="sila"></i></span><input type="range" min="0" max="1" step="0.05" value="${ust.sila}" data-ai-s="sila"></label>
      <label class="ai-suwak"><span>Kolory materiałów <i data-ai-w="kolor"></i></span><input type="range" min="1" max="1.8" step="0.05" value="${ust.kolor}" data-ai-s="kolor"></label>
      <div class="ai-przyciski"><button class="btn kontur maly" data-ai="przed">${ik('oko')}Przytrzymaj: przed</button><button class="btn zloty" data-ai="zapisz" disabled>${ik('ok')}Zapisz</button></div>
    </div>
    ${z.kor?.ai ? `<button class="dodaj" data-ai="usun">${ik('cofnij')}Usuń obróbkę AI z tego zdjęcia</button>` : ''}
    <p class="wyc male" style="margin:10px 0 0">Z wyniku AI bierzemy tylko światło i kolor. Kształty, napisy i przedmioty zostają z twojego zdjęcia, a kolory drewna, płytek i tkanin nie mogą odjechać od prawdziwych. Oryginał zostaje na serwerze.</p>`);
  w.classList.add('okno-ai');
  const $w = (q) => w.querySelector(q);
  const opisz = () => { $w('[data-ai-w="sila"]').textContent = `${Math.round(ust.sila * 100)}%`; $w('[data-ai-w="kolor"]').textContent = ust.kolor <= 1.05 ? 'wierne' : ust.kolor >= 1.6 ? 'żywe' : 'cieplejsze'; };
  opisz();
  let silnik = null, orgPodglad = null, wynikPodglad = null, liczyPodglad = false, znowu = false;
  const zamknij = () => { silnik?.zamknij(); silnik = null; };
  new MutationObserver((_, ob) => { if (!document.body.contains(w)) { zamknij(); ob.disconnect(); } }).observe(document.body, { childList: true });
  const cv = $w('.ai-obraz canvas');
  const odswiezPodglad = async () => {
    if (!silnik || !orgPodglad) return;
    if (liczyPodglad) { znowu = true; return; }
    liczyPodglad = true;
    try { wynikPodglad = (await silnik.podglad(ust)).wynik; naCanvas(cv, wynikPodglad); }
    catch (e) { toast(e.message, 3500); }
    finally { liczyPodglad = false; if (znowu) { znowu = false; odswiezPodglad(); } }
  };
  w.addEventListener('input', (e) => { const k = e.target.dataset?.aiS; if (!k) return; ust[k] = Number(e.target.value); opisz(); odswiezPodglad(); });
  const przed = (tak) => { if (orgPodglad && wynikPodglad) naCanvas(cv, tak ? orgPodglad : wynikPodglad); };
  const bp = $w('[data-ai="przed"]');
  for (const [ev, v] of [['pointerdown', true], ['pointerup', false], ['pointerleave', false], ['pointercancel', false]]) bp.addEventListener(ev, () => przed(v));
  w.addEventListener('change', async (e) => {
    if (e.target.dataset?.ai !== 'plik' || !e.target.files?.[0]) return;
    const plikAI = e.target.files[0];
    $w('.ai-wynik').hidden = false; $w('.ai-stan').hidden = false; $w('.ai-stan').textContent = 'Dopasowuję wynik z AI do zdjęcia…'; $w('[data-ai="zapisz"]').disabled = true;
    zamknij(); silnik = silnikHybrydy();
    try {
      const [pel, ai] = await Promise.all([rozkoduj(blobOrg, 4096), rozkoduj(plikAI, 1024)]);
      const r = await silnik.przygotuj(pel, ai, ust, U.podglad());
      orgPodglad = r.org; wynikPodglad = r.wynik; naCanvas(cv, wynikPodglad);
      $w('.ai-stan').hidden = true; $w('[data-ai="zapisz"]').disabled = false;
      const zg = r.zgodnosc >= 0.8 ? 'bardzo dobre (AI nie zmieniła kadru)' : r.zgodnosc >= 0.6 ? 'dobre (AI przerysowała drobne szczegóły — te zostają z twojego zdjęcia)' : r.zgodnosc >= 0.4 ? 'wystarczające (AI przerysowała część zdjęcia — tam zostaje światło oryginału)' : 'słabe (AI mocno zmieniła zdjęcie — sprawdź podgląd, najlepiej poproś AI jeszcze raz)';
      $w('.ai-info').textContent = `Dopasowanie: ${zg}.${r.pokrycie < 0.5 && r.zgodnosc >= 0.4 ? ' Część zdjęcia AI zmieniła mocniej — tam zostaje światło oryginału.' : ''}`;
    } catch (er) { $w('.ai-stan').textContent = er.message || 'Nie udało się połączyć zdjęć.'; zamknij(); }
  });
  w.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-ai]')?.dataset.ai;
    if (a === 'kopiuj') {
      await kopiuj(POLECENIE_AI); toast('Polecenie skopiowane — wklej je w AI razem ze zdjęciem', 3000);
    } else if (a === 'udostepnij') {
      const plik = new File([blobOrg], 'zdjecie.jpg', { type: blobOrg.type || 'image/jpeg' });
      if (navigator.canShare?.({ files: [plik] })) { try { await navigator.share({ files: [plik] }); } catch { /* anulowane */ } }
      else { const l = document.createElement('a'); l.href = URL.createObjectURL(plik); l.download = 'zdjecie.jpg'; document.body.appendChild(l); l.click(); l.remove(); toast('Zdjęcie pobrane — wgraj je do AI', 3000); }
    } else if (a === 'zapisz') {
      const b = e.target.closest('button'); b.disabled = true; $w('.ai-stan').hidden = false; $w('.ai-stan').textContent = 'Liczę pełne zdjęcie…';
      liczy.add(id); odswiez();
      try {
        const pel = (await silnik.pelne(ust)).wynik;
        const baza = await D.dodajGotoweZdjecie(oid, await doJpeg(pel), pel.width, pel.height);
        const zz = (D.oferta(oid).zdj || []).find((x) => x.id === id);
        const geom = tylko(zz?.kor?.par, KZ.GEOMETRIA);
        let nowe = baza;
        if (KZ.zmienia(geom)) { const wy = await obrobPelne(await doJpeg(pel, 0.95), geom); nowe = await D.dodajGotoweZdjecie(oid, wy.blob, wy.w, wy.h); }
        await podepnijWersje(oid, id, nowe, geom, org, baza.id);
        w.remove();
        toast('Obróbka AI zapisana — oryginał zostaje na serwerze', 3000);
      } catch (er) { toast(er.message || 'Nie udało się zapisać zdjęcia', 3500); b.disabled = false; $w('.ai-stan').hidden = true; }
      finally { liczy.delete(id); odswiez(); }
    } else if (a === 'usun') {
      w.remove();
      const zz = (D.oferta(oid).zdj || []).find((x) => x.id === id);
      if (!zz?.kor?.ai) return;
      const geom = tylko(zz.kor.par, KZ.GEOMETRIA);
      liczy.add(id); odswiez();
      try {
        if (KZ.zmienia(geom)) { const wy = await obrobPelne(blobOrg, geom); await podepnijWersje(oid, id, await D.dodajGotoweZdjecie(oid, wy.blob, wy.w, wy.h), geom, org, null); }
        else await przywrocOryginal(oid, id);
        toast('Obróbka AI usunięta', 2500);
      } catch (er) { toast(er.message || 'Nie udało się', 3500); }
      finally { liczy.delete(id); odswiez(); }
    }
  });
}
// asystent: zaraz po dodaniu — krzywo, ciemno, przepalone (nieostrości nie zgadujemy)
async function ocenDodane(oid, nowe, pliki) {
  const uwagi = {};
  for (let i = 0; i < nowe.length; i++) {
    try { const u = KZ.ocenaZdjecia(await rozkoduj(pliki[i], 520)); if (u.length) uwagi[nowe[i].id] = u; } catch { /* zdjęcie i tak dodane */ }
  }
  if (!Object.keys(uwagi).length) return;
  const o = D.oferta(oid);
  await D.zmien(oid, { zdj: (o.zdj || []).map((z) => (uwagi[z.id] ? { ...z, uwagi: uwagi[z.id] } : z)) });
}
const UWAGI = { krzywe: 'Krzywo — stuknij „Wyrównaj”', ciemne: 'Ciemno — spróbuj „Obróbki”, a następnym razem zapal światła', przepalone: 'Przepalone jasne miejsca — tego program nie odzyska' };
function uwagiZdjecia(z) {
  const p = KZ.normuj(z.kor?.par), maGeom = Math.abs(p.obrot) > 0.01 || Math.abs(p.piony) > 0.0005, maWyglad = !!(p.wariant || p.swiatlo || p.ev);
  return (z.uwagi || []).filter((u) => !(u === 'krzywe' && maGeom) && !(u === 'ciemne' && maWyglad));
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
  lead: 'Wstęp', tytul: 'Własny tytuł', status: 'Status', _usunieta: 'Usunięcie oferty', _usunieto: 'Usunięcie danych osoby', dataPublikacji: 'Data publikacji', utworzyl: 'Utworzenie', id: 'Utworzenie', ulubiona: 'Wyróżnienie' };
Object.assign(NAZWY_POL, { wyp: 'Wyposażenie', wypInne: 'Wyposażenie (inne)', wypUwagi: 'Uwagi do wyposażenia', wypBrak: 'Bez wyposażenia' });
Object.assign(NAZWY_POL, { wlRodo: 'Informacja RODO dla właściciela', wlRodoKiedy: 'Data informacji RODO' });
function etykieta(k) {
  for (const s of M.SEKCJE) for (const p of s.pola) if (p.k === k) return p.e;
  if (k.startsWith('kl_')) return 'Klient'; if (k.startsWith('wz_')) return 'Prezentacja'; if (k.startsWith('dk_')) return 'Dokumenty'; if (k.startsWith('am_')) return 'Karta AML';
  return NAZWY_POL[k] || k;
}
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
    const h = await D.historia(S.id, true);
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
    const nowe = (pref) => A.some((a) => a.oferta === g.oferta && a.kto === g.kto && a.pole.startsWith(pref) && a.stara === null && a.kiedy >= g.od && a.kiedy <= g.kiedy);
    const opis = g.pola.includes('_usunieta') ? 'usunął(-ęła) ofertę' : nowa ? 'dodał(a) ofertę' : nowe('wz_') ? 'zaplanował(a) prezentację' : nowe('kl_') ? 'dodał(a) klienta' : g.status ? `status → ${pokazWartosc('status', g.status)}` : `zmienił(a): ${[...new Set(g.pola.map(etykieta))].slice(0, 4).join(', ')}${g.pola.length > 4 ? '…' : ''}`;
    return `<li data-a="otworz" data-oid="${g.oferta}" style="cursor:pointer"><div class="of">${esc(g.nazwa || 'Oferta')}${g.kiedy > widziana ? ' <span class="licznik" style="background:var(--gold);color:#1A1408">nowe</span>' : ''}</div><div>${esc(g.kto || '')} ${opis}</div><div class="kiedy">${kiedy(g.kiedy)}</div></li>`;
  }).join('')}</ul>` : '<p class="wyc">Wspólnik nie wprowadzał jeszcze zmian.</p>');
  D.aktywnoscWidziana();
}
function potwierdz(tytul, tresc, przycisk, klasa = 'zly') {
  return new Promise((ok) => {
    const w = okno(tytul, `<p>${tresc}</p><div class="rzad" style="justify-content:flex-end;margin-top:16px"><button class="btn" data-n>Anuluj</button><button class="btn ${klasa}" data-t>${esc(przycisk)}</button></div>`);
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
  okolica: 'okolica', atuty: 'atuty', kw: 'weryfikacja', kwN: 'weryfikacja', wyp: 'wyp' };
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
    case 'prosba-odrzuc': await D.odrzucProsbe(b.dataset.id); toast('Odrzucone. Jeśli to nie Ty próbowałeś się zalogować — zmień hasło w Ustawieniach.', 5000); break;
    case 'pin-zmien': zmianaPinu(); break;
    case 'haslo-zmien': zmianaHasla(); break;
    case 'dziennik': pokazDziennik(); break;
    case 'aml-archiwum': oknoArchiwum(); break;
    case 'aml-rejestr': rejestrAml(); break;
    case 'urzadzenia': oknoUrzadzen(); break;
    case 'rodo-wyslij': if (o) oknoRodo(o, b.dataset.e); break;
    case 'am-dodaj': {
      const wl = o.wlImie, kl = M.klienci(o).filter((x) => x.imie && !M.amlKarty(o).some((a) => a.klient === x._k));
      const najem = o.transakcja === 'najem';
      const w = okno('Nowa karta AML', `<div class="menu-lista">
        ${wl && !M.amlKarty(o).some((a) => a.wlasciciel) ? `<button data-z="wl">${ik('dom')}Właściciel: ${esc(wl)}</button>` : ''}
        ${kl.map((x) => `<button data-z="${x._k}">${ik('osoba')}Klient: ${esc(x.imie)}</button>`).join('')}
        <button data-z="">${ik('plus')}Inna osoba lub firma</button></div>`);
      w.addEventListener('click', async (ev) => {
        const el = ev.target.closest('[data-z]'); if (!el) return; w.remove();
        const z = el.dataset.z;
        const dane = z === 'wl' ? { wlasciciel: true, imie: o.wlImie, rola: najem ? 'wynajmujacy' : 'sprzedajacy', umowa: !!(o.umowaNr || o.umowaData) }
          : z ? { klient: z, imie: o[z]?.imie, rola: najem ? 'najemca' : 'kupujacy' } : {};
        const k = await nowaKartaAml(o, JSON.parse(JSON.stringify(dane)));
        setTimeout(() => $(`[data-e="${k}"][data-p="imie"]`)?.focus(), 120);
      });
      break;
    }
    case 'am-z': { // z karty klienta / właściciela: otwórz albo załóż kartę AML
      const z = b.dataset.e, najem = o.transakcja === 'najem';
      const jest = M.amlKarty(o).find((a) => (z === 'wlasciciel' ? a.wlasciciel : a.klient === z));
      if (!jest) await nowaKartaAml(o, JSON.parse(JSON.stringify(z === 'wlasciciel' ? { wlasciciel: true, imie: o.wlImie, rola: najem ? 'wynajmujacy' : 'sprzedajacy', umowa: !!(o.umowaNr || o.umowaData) } : { klient: z, imie: o[z]?.imie, rola: najem ? 'najemca' : 'kupujacy' })));
      if (odblok?.oid === o.id) otworzGrupe(o.id, 'form');
      idzDo(`#/o/${o.id}/aml`);
      break;
    }
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
    case 'wyp-el': {
      const w = { ...(o.wyp || {}) }; const k = b.dataset.k;
      if (w[k]) delete w[k]; else w[k] = true;
      D.zmien(o.id, Object.keys(w).length ? { wyp: w, wypBrak: null } : { wyp: null });
      break;
    }
    case 'kl-dodaj': {
      const k = `kl_${M.noweId(8)}`;
      await D.zmien(o.id, { [k]: { t: Date.now(), kto: D.stan.konto?.nazwa || '', status: 'nowy' } });
      setTimeout(() => $(`[data-e="${k}"][data-p="imie"]`)?.focus(), 80);
      break;
    }
    case 'kl-zachowaj': {
      const k = b.dataset.e; if (!o[k]) return;
      await D.zmien(o.id, { [k]: { ...o[k], kontakt: Date.now() } });
      D.stan.retencja = (D.stan.retencja || []).filter((w) => !(w.oid === o.id && w.k === k));
      toast('Zachowane — kolejne 12 miesięcy od dziś'); break;
    }
    case 'kl-eksport': {
      const k = b.dataset.e;
      try {
        if (D.ileWKolejce()) await D.synchronizuj();
        const j = await D.daneOsoby(o.id, k);
        const tekst = JSON.stringify({ oferta: M.tytul(o), wydano: new Date().toISOString(), administrator: agent().firma || 'AM Nieruchomości', dane: j.dane, historiaZmian: j.historia }, null, 2);
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([tekst], { type: 'application/json' }));
        a.download = `dane-${slug(j.dane.imie || j.dane.wlImie || j.dane.nazwa || 'osoby')}.json`; document.body.appendChild(a); a.click(); a.remove();
        toast('Plik z danymi osoby gotowy — przekaż go jej na żądanie (RODO art. 15)', 4000);
      } catch (er) { toast(er.kod === 404 ? 'Ta osoba nie jest jeszcze na serwerze — połącz się z internetem.' : bladSieci(er), 4000); }
      break;
    }
    case 'kl-rodo-usun': {
      const k = b.dataset.e, x = k === 'wlasciciel' ? { imie: o.wlImie || 'właściciel' } : o[k] || {};
      if (!(await potwierdz(`Usunąć dane: ${x.imie || 'klient'}?`, 'Na żądanie osoby (RODO art. 17). Znikną z obu kont razem z całą historią zmian — tego nie da się cofnąć. Kopie zapasowe wygasają same po 60 dniach.', 'Usuń na zawsze'))) return;
      try { await D.usunOsobe(o.id, k); toast('Dane osoby usunięte'); } catch (er) { toast(bladSieci(er), 4000); }
      break;
    }
    case 'kl-status': {
      const k = b.dataset.e, akt = o[k]?.status || 'nowy';
      const w = okno('Status klienta', `<div class="menu-lista">${Object.entries(M.KLIENT_STATUSY).map(([v, n]) => `<button data-st="${v}" class="${akt === v ? 'akt' : ''}">${esc(n)}${akt === v ? ik('ok', 'ok') : ''}</button>`).join('')}</div>`);
      w.addEventListener('click', (ev) => {
        const x = ev.target.closest('[data-st]'); if (!x) return;
        const of = D.oferta(o.id); w.remove();
        if (of?.[k]) D.zmien(o.id, { [k]: { ...of[k], status: x.dataset.st } });
      });
      break;
    }
    case 'wz-dodaj': {
      const k = `wz_${M.noweId(8)}`, kl = b.dataset.kl;
      const pola = { [k]: JSON.parse(JSON.stringify({ t: Date.now(), kto: D.stan.konto?.nazwa || '', status: 'plan', klient: kl || undefined })) };
      if (kl && o[kl] && ['nowy', undefined].includes(o[kl].status)) pola[kl] = { ...o[kl], status: 'umowiony' };
      await D.zmien(o.id, pola);
      if (S.tab !== 'wizyty') idzDo(`#/o/${o.id}/wizyty`);
      setTimeout(() => { const i = $(`[data-e="${k}"][data-p="kiedy"]`); i?.scrollIntoView({ block: 'center' }); i?.focus(); }, 160);
      break;
    }
    case 'wz-status': {
      const k = b.dataset.e, v = b.dataset.v, x = o[k]; if (!x) return;
      const pola = { [k]: { ...x, status: v } };
      const kl = x.klient && o[x.klient];
      if (v === 'odbyla' && kl && ['nowy', 'umowiony'].includes(kl.status || 'nowy')) pola[x.klient] = { ...kl, status: 'po' };
      D.zmien(o.id, pola);
      break;
    }
    case 'wpis-usun': {
      const k = b.dataset.e;
      const x = o[k] || {};
      if ((x.pliki || []).length && !(await potwierdz('Usunąć dokument?', 'Razem z dołączonymi plikami, na obu kontach.', 'Usuń'))) return;
      if (!(x.pliki || []).length && (x.imie || x.kiedy || x.nazwa) && !(await potwierdz(`Usunąć ${b.dataset.co}?`, 'Zniknie na obu kontach. Zostanie ślad w historii zmian.', 'Usuń'))) return;
      // prezentacje usuwanego klienta zostają, tylko bez przypisania
      const pola = { [k]: null };
      if (k.startsWith('kl_')) for (const w of M.wpisy(o, 'wz_')) if (w.klient === k) { const { _k, ...r } = w; pola[_k] = { ...r, klient: undefined, notatka: [r.notatka, x.imie && `klient: ${x.imie}`].filter(Boolean).join(' · ') }; }
      await D.zmien(o.id, JSON.parse(JSON.stringify(pola)));
      for (const f of x.pliki || []) D.usunPlik(f.id);
      break;
    }
    case 'dk-status': {
      const k = b.dataset.e, akt = o[k]?.s || 'brak';
      const w = okno(b.dataset.n || 'Dokument', `<div class="menu-lista">${Object.entries(M.DOK_STATUSY).map(([v, n]) => `<button data-st="${v}" class="${akt === v ? 'akt' : ''}">${ik(IK_DOK[v])}${esc(n)}${akt === v ? ik('ok', 'ok') : ''}</button>`).join('')}</div>`);
      w.addEventListener('click', (ev) => {
        const x = ev.target.closest('[data-st]'); if (!x) return;
        const of = D.oferta(o.id); w.remove();
        const nw = { ...(of?.[k] || {}), s: x.dataset.st };
        if (nw.s === 'brak') delete nw.s;
        D.zmien(o.id, { [k]: Object.keys(nw).length ? nw : null });
      });
      break;
    }
    case 'dk-otworz': {
      const f = (o[b.dataset.e]?.pliki || []).find((x) => x.id === b.dataset.id);
      if (f) otworzPlikDok(f);
      break;
    }
    case 'dk-usun-plik': {
      const k = b.dataset.e, x = o[k] || {};
      const f = (x.pliki || []).find((y) => y.id === b.dataset.id); if (!f) return;
      if (!(await potwierdz('Usunąć plik?', `„${esc(f.nazwa || 'dokument')}” zniknie z serwera i z obu kont.`, 'Usuń'))) return;
      const of = D.oferta(o.id), y = { ...(of[k] || {}) };
      y.pliki = (y.pliki || []).filter((z) => z.id !== f.id);
      if (!y.pliki.length) delete y.pliki;
      await D.zmien(o.id, { [k]: Object.keys(y).length ? y : null });
      D.usunPlik(f.id);
      break;
    }
    case 'dk-dodaj': {
      const i = $('#dk-nowy'); const n = i?.value.trim();
      if (!n) { i?.focus(); toast('Wpisz nazwę dokumentu'); return; }
      i.value = '';
      await D.zmien(o.id, { [`dk_${M.noweId(8)}`]: { nazwa: n.slice(0, 120), t: Date.now() } });
      break;
    }
    case 'edytuj': {
      const k = b.dataset.k;
      if (S.edycja === k) {
        const ta = $(`textarea[data-auto="${k}"]`);
        if (ta) { clearTimeout(timery.get(ta)); timery.delete(ta); zapisz(ta); ta.blur(); }
        S.edycja = null;
      } else S.edycja = k;
      odswiez();
      if (S.edycja) setTimeout(() => { const ta = $(`textarea[data-auto="${k}"]`); if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); } }, 60);
      break;
    }
    case 'przywroc': {
      const k = b.dataset.k;
      const ta = $(`textarea[data-auto="${k}"]`); if (ta) { clearTimeout(timery.get(ta)); timery.delete(ta); ta.blur(); }
      S.edycja = null;
      await D.zmien(o.id, { [k]: null });
      odswiez();
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
      if ((o.zdj || []).find((z) => z.id === b.dataset.z)?.pom === 'rzut') return toast('Rzut nie może być zdjęciem głównym — okładką ma być prawdziwe zdjęcie.', 3500);
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
      const org = (o.zdj || []).find((z) => z.id === id)?.kor?.org;
      const zdj = (o.zdj || []).filter((z) => z.id !== id).map((z) => (z.oryg === id ? { ...z, oryg: undefined } : z)).map((z) => JSON.parse(JSON.stringify(z)));
      if (!zdj.some((z) => z.glowne)) { const p = zdj.find(mozeBycGlowne); if (p) p.glowne = true; }
      await D.zmien(o.id, { zdj });
      D.usunZdjeciePlik(id);
      if (org) D.usunZdjeciePlik(org);
      break;
    }
    case 'zdj-popraw': poprawZdjecie(o.id, b.dataset.z); break;
    case 'zdj-wyrownaj': wyrownajZdjecie(o.id, b.dataset.z); break;
    case 'zdj-obrobka': obrobkaZdjecia(o.id, b.dataset.z); break;
    case 'zdj-ai': obrobkaAI(o.id, b.dataset.z); break;
    case 'pobierz-zdj': pobierzZdjecia(o); break;
    case 'menu': {
      const w = okno(o.roboczy || M.tytul(o), `<div class="menu-lista"><button data-m="historia">${ik('zegar')}Historia zmian</button><button data-m="usun" class="zly">${ik('kosz')}Usuń ofertę</button></div>`);
      w.addEventListener('click', async (ev) => {
        const m = ev.target.closest('[data-m]')?.dataset.m; if (!m) return;
        w.remove();
        if (m === 'historia') pytajPin('Historia zmian zawiera dane osobowe', () => pokazHistorie());
        if (m === 'usun') {
          if (!(await potwierdz('Usunąć ofertę?', 'Oferta i jej zdjęcia znikną na obu kontach. Jeśli transakcja się zakończyła, lepiej ustaw status „Zakończona”.', 'Usuń na zawsze'))) return;
          await D.usunOferte(o.id); idzDo('#/'); toast('Oferta usunięta');
        }
      });
      break;
    }
    case 'idz': {
      const id = b.dataset.id, zak = b.dataset.zak;
      const [sekc, poleK] = M.CEL_PUNKTU[id] || [SEK_DLA[id]];
      S.fokus = poleK || null;
      if (zak === 'zdjecia') idzDo(`#/o/${o.id}/zdjecia`);
      else if (zak === 'ogloszenie') idzDo(`#/o/${o.id}/ogloszenie`);
      else idzDo(sekc ? hashEkranu(o.id, sekc) : `#/o/${o.id}`);
      break;
    }
    case 'status-menu': oknoStatusu(o); break;
    case 'status-ustaw': zmienStatus(o, b.dataset.v); break;
    case 'kopia-folder':
      try { const w = await K.wybierzFolder(); toast(w?.nowe ? `Kopia gotowa: ${w.nowe} plików` : 'Kopia gotowa', 3000); }
      catch (er) { if (er.name !== 'AbortError') toast(er.message || 'Kopia się nie udała', 4000); }
      break;
    case 'urz-test': testUrzadzenia(); break;
    case 'kopia-teraz':
      try { const w = await K.zrob(); if (w) toast(w.nowe ? `Kopia gotowa: ${w.nowe} nowych plików` : 'Kopia była aktualna', 3000); }
      catch (er) { toast(er.message || 'Kopia się nie udała', 4000); }
      break;
    case 'rzut-otworz': otworzRzut(o); break;
    case 'pom-odzyskaj': {
      try {
        const h = await D.historia(o.id);
        const w = R.odzyskajWymiary(D.oferta(o.id).pom || [], h);
        try { localStorage.setItem(`am-odzysk:${o.id}`, '1'); } catch { /* */ }
        if (!w.odzyskane) { toast('W historii nie ma wcześniejszych wymiarów tych pomieszczeń.', 3500); render(); break; }
        await D.zmien(o.id, { pom: w.pom });
        toast(`Przywrócono wymiary: ${w.odzyskane} ${w.odzyskane === 1 ? 'pomieszczenie' : w.odzyskane < 5 ? 'pomieszczenia' : 'pomieszczeń'}`, 3500);
      } catch { toast('Historia jest na serwerze — połącz się z internetem.', 3500); }
      break;
    }
    case 'push-on': try { await D.wlaczPush(); toast('Powiadomienia włączone'); } catch (er) { toast(er.message, 4500); } break;
    case 'push-off': try { await D.wylaczPush(); toast('Powiadomienia wyłączone'); } catch (er) { toast(er.message, 4500); } break;
    case 'wyloguj': {
      const n = D.ileWKolejce();
      if (!(await potwierdz('Wylogować to urządzenie?', `Wszystkie dane znikną z tego urządzenia (na serwerze zostają).${n ? ` UWAGA: ${n} niewysłanych zmian przepadnie — najpierw połącz się z internetem.` : ''}`, 'Wyloguj'))) return;
      await D.wyloguj(); break;
    }
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
D.naZmiane(() => { if (!$('.kol-lista') && !zbudowany) return; if (!D.stan.token && zbudowany) { render(); return; } odswiez(); });
try { const k = sessionStorage.getItem('am-komunikat'); if (k) { D.stan.blad = k; sessionStorage.removeItem('am-komunikat'); } } catch { /* */ }
const przyg = await D.przygotuj();
if (przyg.sejf && !(await Z.zSesji())) await ekranPin('otworz', przyg.bledy ? `Wpisz PIN. Złe próby: ${przyg.bledy} z ${Z.MAKS_PROB}.` : '');
await D.start();
if (D.stan.token && !D.sejfUstawiony()) await ekranPin('ustaw', 'Aplikacja chroni teraz dane klientów PIN-em. Ustaw 6 cyfr — będziesz je wpisywać przy otwarciu aplikacji i po 10 minutach przerwy.');
// blokada po 10 minutach bez używania: klucz znika z pamięci, przy powrocie PIN
const blokujPoPrzerwie = () => { if (D.sejfUstawiony() && Z.otwarty() && Date.now() - Z.ostatniaAktywnosc() > Z.BEZCZYNNOSC) { Z.zamknij(); location.reload(); } };
for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, () => Z.aktywnosc(), { capture: true, passive: true });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') Z.aktywnosc(); else blokujPoPrzerwie(); });
addEventListener('pageshow', blokujPoPrzerwie);
setInterval(blokujPoPrzerwie, 30e3);
K.naZmiane(() => { if (S.ekran === 'ustawienia') odswiezUstawienia(); });
K.start();
render();
odbierzRzuty();
addEventListener('pageshow', () => odbierzRzuty());
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
  navigator.serviceWorker.addEventListener('message', (e) => { if (e.data?.oid) idzDo(`#/o/${e.data.oid}/${ZAKLADKI.includes(e.data.ekran) ? e.data.ekran : 'karta'}`); });
}
