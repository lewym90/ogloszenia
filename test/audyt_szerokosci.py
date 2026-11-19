# Audyt szerokości: python3 test/audyt_szerokosci.py [webkit|chromium]
# Każdy ekran aplikacji na 320, 390 i 430 px: nic nie wystaje poza panel ani ekran, napisy w przyciskach nie są ucięte.
# Wymaga serwera testowego jak ui_test.py.
# Audyt: żaden element nie wystaje poza swój panel ani poza ekran, na każdym ekranie aplikacji.
from playwright.sync_api import sync_playwright
from pomoc import zaloguj, odblokuj, wpisz_pin, PIN
import sys, shutil, os
os.makedirs('/tmp/amshots', exist_ok=True)
URL = 'http://localhost:8766/?api=http://127.0.0.1:18931'
silnik = sys.argv[1] if len(sys.argv) > 1 else 'webkit'
JS = """() => {
  const vw = document.documentElement.clientWidth, zle = [];
  const kont = '.w, .wejscie, .pole, .grupa, .karta-og, .szklo, .dok, .wiersz, .kafel, .nawigacja-sek, .okno';
  for (const el of document.querySelectorAll('#edytor *, #pasek *, .okno *')) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const st = getComputedStyle(el); if (st.position === 'fixed' || st.visibility === 'hidden') continue;
    if (el.closest('.chipy')) continue;
    if (['BUTTON','A','LABEL','H1','H2','H3','SPAN'].includes(el.tagName) && el.children.length <= 3 && el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0 && st.textOverflow !== 'ellipsis' && !el.closest('.et') && !el.matches('.dodaj-plik') && !el.closest('.dodaj-plik'))
      zle.push(`tekst się nie mieści: ${el.tagName}.${String(el.className).slice(0,25)} „${el.textContent.trim().slice(0,30)}”`);
    if (r.right > vw + 0.5 || r.left < -0.5) { zle.push(`poza ekranem: ${el.tagName}.${el.className} ${Math.round(r.left)}..${Math.round(r.right)} / ${vw}`); continue; }
    const a = el.parentElement && el.parentElement.closest(kont);
    if (!a) continue;
    const ra = a.getBoundingClientRect(), sa = getComputedStyle(a);
    if ((sa.overflowX === 'auto' || sa.overflowX === 'scroll') && a.scrollWidth > a.clientWidth) { zle.push(`przewija w bok: ${a.tagName}.${a.className}`); continue; }
    if (sa.overflowX === 'hidden') continue;
    if (r.right > ra.right + 1 || r.left < ra.left - 1) zle.push(`wystaje z ${a.className.split(' ')[0]}: ${el.tagName}.${String(el.className).slice(0,30)} [${el.getAttribute('type')||''}] o ${Math.round(Math.max(r.right-ra.right, ra.left-r.left))}px`);
  }
  const e = document.querySelector('.kol-edytor'); if (e && e.scrollWidth > e.clientWidth) zle.push('kolumna przewija się w bok');
  return [...new Set(zle)];
}"""
with sync_playwright() as p:
    shutil.rmtree(f'/tmp/amshots/prof-a-{silnik}', ignore_errors=True)
    opc = dict(viewport={'width': 390, 'height': 844}, has_touch=True, locale='pl-PL')
    c = p.webkit.launch_persistent_context(f'/tmp/amshots/prof-a-{silnik}', **opc) if silnik == 'webkit' else p.chromium.launch_persistent_context(f'/tmp/amshots/prof-a-{silnik}', executable_path='/usr/bin/google-chrome', args=['--no-sandbox'], is_mobile=True, **opc)
    pg = c.new_page()
    bl = []; pg.on('pageerror', lambda e: bl.append(str(e) + ' @ ' + (e.stack or '')[:300]))
    zaloguj(pg, URL)
    pg.click('#dol [data-a=nowa]'); pg.wait_for_selector('#sek-podstawy')
    oid = pg.evaluate("location.hash.split('/')[2]")
    # pełna oferta najmu z datami wszędzie
    pg.evaluate("""(async () => { const D = await import('./js/dane.js'); const id = location.hash.split('/')[2];
      await D.zmien(id, { transakcja: 'najem', roboczy: 'Granata 1/100 — bardzo długa nazwa robocza do testu', cena: 3500, pow: 52, pokoje: 3, pietro: 1, pieter: 5, winda: 'tak', rok: 2025,
        dzielnica: 'Wrotków', ulica: 'Granata', czynsz: 450, kaucja: 7000, dostepneOd: '2026-12-01', minOkres: 12, umowaNajmu: 'okazjonalny', swiad: 'tak', eu: 50, ek: 60, ep: 70, oze: 10, co2: 0.012, swiadNr: '12345/2025', swiadDo: '2035-01-01',
        wlImie: 'Jan Kowalski', umowaNr: 'AM/1/2026', umowaData: '2026-11-18', umowaDo: '2027-05-18', prowizjaKl: 'tak', prowizjaKlCzynsz: true,
        pom: [{ id: 'p1', nazwa: 'Salon z aneksem kuchennym', a: 5.1, b: 4.2, m: 21.42, opis: 'okno na zachód' }], atuty: [{ t: 'Okna wymienione w 2019' }], minusy: [{ t: 'Brak piwnicy' }], okolica: [{ nazwa: 'Przystanek MPK Granata', min: 3, jak: 'pieszo' }],
        weryf: { kwN: { ok: true, d: '2026-11-18' }, oplaty: { ok: true, d: '2026-11-17' }, pomiar: { ok: true, d: '2026-11-16' } }, wyp: { lodowka: true, drzwiAntyw: true },
        kl_a: { imie: 'Anna Kowalska-Wiśniewska', tel: '600100200', email: 'anna.kowalska.wisniewska@example.com', od: '2026-12-15', status: 'umowiony', t: Date.now() },
        wz_a: { kiedy: '2026-11-21T17:30', klient: 'kl_a', kto: 'Marek', status: 'odbyla', opinia: 'Podobało się', t: Date.now() }, wz_b: { kiedy: '2026-11-28T10:00', status: 'plan', t: Date.now() },
        am_a: { t: Date.now(), kto: 'Marek', rola: 'kupujacy', typ: 'jdg', umowa: true, imie: 'Anna Kowalska-Wiśniewska', obywatelstwo: 'polskie', dokRodzaj: 'dowod', dokNr: 'ABC123456', adresZam: 'ul. Bardzo Długa Nazwa Ulicy 123/45, 20-001 Lublin', nazwa: 'Firma Handlowo-Usługowa Anna Kowalska-Wiśniewska', nip: '7120000001', adres: 'Lublin', pelnomocnik: true, weryfData: '2026-11-18', pep: 'pep', podej: true, podejDecyzja: 'tak', odmowa: true, zakonczenie: '2026-12-01', cz_gotowka: true },
        am_b: { t: Date.now(), kto: 'Marek', rola: 'sprzedajacy', typ: 'firma', nazwa: 'Spółka Testowa sp. z o.o.', crbr: 'nie' },
        dk_kw: { s: 'jest', pliki: [{ id: 'xxxxxxxx1', nazwa: 'Odpis z księgi wieczystej LU1I-00012345-6 bardzo długa nazwa.pdf', typ: 'pdf' }] }, dk_q: { nazwa: 'Regulamin wspólnoty mieszkaniowej przy ulicy Granata', t: 1 } }); })()""")
    pg.wait_for_timeout(800)
    ekrany = [''] + [f's/{k}' for k in ['podstawy','lokalizacja','lokal','pom','koszty','wyp','atuty','minusy','okolica','weryfikacja','energia','wlasciciel']] + ['zdjecia','ogloszenie','kontrola','klienci','wizyty','dokumenty','aml']
    wynik = {}
    for w in [320, 390, 430]:
        pg.set_viewport_size({'width': w, 'height': 844}); pg.wait_for_timeout(300)
        for e in ekrany:
            pg.evaluate(f"location.hash='#/o/{oid}'"); pg.wait_for_timeout(150)  # wyjście z danych osobowych — każde wejście pyta o PIN
            pg.evaluate(f"location.hash='#/o/{oid}/{e}'"); pg.wait_for_timeout(450)
            if pg.locator('#pin-dane').count():
                z = pg.evaluate(JS)
                if z: wynik[f'{w} {e} (PIN)'] = z
                if w == 320 and e == 'klienci': pg.screenshot(path=f"/tmp/amshots/a-{silnik}-pin-320.png")
                pg.fill('#pin-dane', PIN); pg.wait_for_function("!document.querySelector('#pin-dane')", timeout=20000); pg.wait_for_timeout(300)
            z = pg.evaluate(JS)
            if z: wynik[f'{w} {e or "spis"}'] = z
            if w in (320, 390) and e in ('s/weryfikacja', 's/koszty', 's/wlasciciel', 'wizyty', 'ogloszenie', 'aml'): pg.screenshot(path=f"/tmp/amshots/a-{silnik}-{w}-{e.replace('/','-')}.png", full_page=False)
        # edycja wstępu
        pg.evaluate(f"location.hash='#/o/{oid}/ogloszenie'"); pg.wait_for_timeout(400)
        if pg.query_selector('[data-a=edytuj][data-k=lead]'):
            pg.click('[data-a=edytuj][data-k=lead]'); pg.wait_for_timeout(300)
            z = pg.evaluate(JS)
            if z: wynik[f'{w} ogloszenie-edycja'] = z
            pg.click('[data-a=edytuj][data-k=lead]'); pg.wait_for_timeout(300)
        for e in ['#/', '#/ustawienia']:
            pg.evaluate(f"location.hash='{e}'"); pg.wait_for_timeout(400); z = pg.evaluate(JS)
            if z: wynik[f'{w} {e}'] = z
    for k, v in wynik.items(): print(k, v[:6])
    print('BLEDY JS', bl[:5], len(bl))
    assert not wynik and not bl, 'są problemy'
    print('EKRANÓW BEZ PROBLEMÓW:', 3 * (len(ekrany) + 3) - len(wynik), 'z', 3 * (len(ekrany) + 3), '| błędy JS:', bl)
