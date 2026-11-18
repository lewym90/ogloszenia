# Test interfejsu w prawdziwej przeglądarce: python3 test/ui_test.py
# Wymaga: serwer API na 127.0.0.1:18931 (konta marek/tajne123, anna/haslo456), statyczny na localhost:8766, zdjęcia w /tmp/amtest.
import json, time, urllib.request, sys, os
from playwright.sync_api import sync_playwright, expect

URL = 'http://localhost:8766/?api=http://127.0.0.1:18931'
OUT = '/tmp/amshots'; os.makedirs(OUT, exist_ok=True)
FOTY = sorted(f'/tmp/amtest/{f}' for f in os.listdir('/tmp/amtest'))
bledy = []

def loguj_bledy(page, nazwa):
    page.on('console', lambda m: bledy.append(f'{nazwa} console.{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
    page.on('pageerror', lambda e: bledy.append(f'{nazwa} pageerror: {e}'))

def zaloguj(page, login, haslo):
    page.goto(URL)
    page.fill('#l-login', login); page.fill('#l-haslo', haslo)
    page.click('#f-log button')
    page.wait_for_selector('#karty')

def zrzut_kontenera(page, sel, nazwa, ile=4):
    """Zrzuty kolejnych ekranów przewijanego kontenera."""
    page.evaluate(f"document.querySelector('{sel}').scrollTop = 0")
    for i in range(ile):
        page.wait_for_timeout(250)
        page.screenshot(path=f'{OUT}/{nazwa}-{i+1}.png')
        koniec = page.evaluate(f"(() => {{ const e = document.querySelector('{sel}'); const p = e.scrollTop; e.scrollTop += e.clientHeight - 120; return e.scrollTop === p; }})()")
        if koniec: break

def wpisz(page, sel, tekst):
    page.fill(sel, ''); page.type(sel, tekst, delay=5); page.locator(sel).blur()

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    tel = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True, locale='pl-PL')
    pg = tel.new_page(); loguj_bledy(pg, 'telefon')
    zaloguj(pg, 'marek', 'tajne123')
    pg.wait_for_timeout(500)
    pg.screenshot(path=f'{OUT}/01-telefon-lista-pusta.png')

    # nowa oferta
    pg.click('#dol [data-a=nowa]')
    pg.wait_for_selector('#sek-podstawy input[data-k=roboczy]')
    oid = pg.evaluate("location.hash.split('/')[2]")
    def sekcja(k): pg.evaluate(f"location.hash = '#/o/{oid}/s/{k}'"); pg.wait_for_selector(f'#sek-{k}'); pg.wait_for_timeout(150)
    def zrodlo(k, v): pg.click(f'[data-a=zr-menu][data-k={k}]'); pg.click(f'[data-zr={v}]'); pg.wait_for_timeout(150)
    wpisz(pg, '#f-roboczy', 'Wileńska 7/12')
    pg.click('[data-a=wybor][data-k=transakcja][data-v=sprzedaz]'); pg.select_option('#f-rodzaj', 'mieszkanie')
    wpisz(pg, '#f-cena', '489 000')
    pg.click('[data-a=wybor][data-k=prowizjaKl][data-v=brak]')
    sekcja('lokalizacja'); wpisz(pg, '#f-dzielnica', 'Czuby Północne'); wpisz(pg, '#f-ulica', 'Wileńska')
    sekcja('lokal'); wpisz(pg, '#f-pow', '52,4'); zrodlo('pow', 'pom')
    wpisz(pg, '#f-pokoje', '3'); pg.click('#sek-lokal label.przel:has(input[data-k=nieprzechodnie])')
    wpisz(pg, '#f-pietro', '3'); wpisz(pg, '#f-pieter', '4'); pg.click('[data-a=wybor][data-k=winda][data-v=nie]')
    wpisz(pg, '#f-rok', '1978'); zrodlo('rok', 'dok')
    pg.select_option('#f-material', 'blok'); pg.select_option('#f-technologia', 'wielka_plyta'); pg.select_option('#f-stan', 'odswiezenie')
    pg.select_option('#f-ogrzewanie', 'miejskie'); pg.select_option('#f-balkon', 'balkon')
    pg.wait_for_selector('#f-balkonPow'); wpisz(pg, '#f-balkonPow', '3,2')
    pg.select_option('#f-wlasnosc', 'spoldzielcze'); zrodlo('wlasnosc', 'dok')
    sekcja('koszty'); wpisz(pg, '#f-czynsz', '640'); zrodlo('czynsz', 'dok')
    wpisz(pg, '#f-media', '180'); zrodlo('media', 'wl')
    sekcja('pom')
    # pomieszczenia
    pomy = [('Pokój dzienny', '17,8', 'wyjście na balkon'), ('Sypialnia', '11,2', ''), ('Pokój', '8,9', ''), ('Kuchnia', '6,1', 'z oknem'), ('Łazienka z WC', '3,4', 'remont 2021')]
    for i, (n, m, o) in enumerate(pomy):
        pg.click('#sek-pom [data-a=dodaj-wiersz]')
        pg.wait_for_selector(f'#sek-pom input[data-i="{i}"][data-p=nazwa]')
        wpisz(pg, f'#sek-pom input[data-i="{i}"][data-p=nazwa]', n)
        wpisz(pg, f'#sek-pom input[data-i="{i}"][data-p=m]', m)
        if o: wpisz(pg, f'#sek-pom input[data-i="{i}"][data-p=opis]', o)
    for l, teksty in (('atuty', ['okna wymienione w 2019', 'piony wymienione w 2023']), ('minusy', ['brak windy, 3. piętro'])):
        sekcja(l)
        for i, t in enumerate(teksty):
            pg.click(f'#sek-{l} [data-a=dodaj-wiersz]'); pg.wait_for_selector(f'#sek-{l} input[data-i="{i}"]')
            wpisz(pg, f'#sek-{l} input[data-i="{i}"]', t)
    sekcja('okolica')
    for i, (n, m) in enumerate([('przystanek MPK', '3'), ('szkoła podstawowa nr 51', '7'), ('Biedronka', '4')]):
        pg.click('#sek-okolica [data-a=dodaj-wiersz]'); pg.wait_for_selector(f'#sek-okolica input[data-i="{i}"][data-p=nazwa]')
        wpisz(pg, f'#sek-okolica input[data-i="{i}"][data-p=nazwa]', n); wpisz(pg, f'#sek-okolica input[data-i="{i}"][data-p=min]', m)
    sekcja('weryfikacja'); pg.click('#sek-weryfikacja label:has(input[data-w=kw][data-p=ok])')
    sekcja('energia'); pg.click('[data-a=wybor][data-k=swiad][data-v=tak]')
    for k, v in (('eu', '98,4'), ('ek', '120,1'), ('ep', '145,7'), ('oze', '0'), ('co2', '0,0412')):
        pg.wait_for_selector(f'#f-{k}'); wpisz(pg, f'#f-{k}', v)
    pg.evaluate(f"location.hash = '#/o/{oid}/ogloszenie'"); pg.wait_for_selector('#f-lead')
    wpisz(pg, '#f-lead', 'Prawdziwa perełka! Okazja')
    pg.wait_for_timeout(1200)
    zrzut_kontenera(pg, '.kol-edytor', '02-telefon-karta', 8)

    # zdjęcia: po 2 na pomieszczenie + rzut
    pg.evaluate(f"location.hash = '#/o/{oid}/zdjecia'"); pg.wait_for_selector('#dodaj-zdj', state='attached')
    pom_ids = pg.evaluate("[...document.querySelectorAll('#pom-dodaj optgroup[label=Pomieszczenia] option')].map(o => o.value)")
    k = 0
    for pid in pom_ids:
        pg.select_option('#pom-dodaj', pid)
        t1 = time.time()
        pg.set_input_files('#dodaj-zdj', FOTY[k:k + 2]); k += 2
        try:
            pg.wait_for_function(f"document.querySelectorAll('.zdj').length >= {k}", timeout=90000)
        except Exception:
            print('TIMEOUT: zdjęć', pg.evaluate("document.querySelectorAll('.zdj').length"), 'oczekiwano', k, 'postęp:', pg.inner_text('#zdj-postep'), 'sync:', pg.inner_text('#sync')); pg.screenshot(path=f'{OUT}/blad.png'); raise
        print(f'paczka {k//2}: {time.time()-t1:.1f} s')
    pg.select_option('#pom-dodaj', 'rzut'); pg.set_input_files('#dodaj-zdj', FOTY[k:k + 1]); k += 1
    pg.wait_for_function(f"document.querySelectorAll('.zdj').length >= {k}", timeout=30000)
    pg.select_option('#pom-dodaj', 'budynek'); pg.set_input_files('#dodaj-zdj', FOTY[k:k + 1]); k += 1
    pg.wait_for_function(f"document.querySelectorAll('.zdj').length >= {k}", timeout=30000)
    pg.wait_for_timeout(1500)
    zrzut_kontenera(pg, '.kol-edytor', '03-telefon-zdjecia', 3)

    # ogłoszenie z pustymi słowami -> status zablokowany
    pg.evaluate(f"location.hash = '#/o/{oid}/ogloszenie'"); pg.wait_for_selector('.uwagi')
    zrzut_kontenera(pg, '.kol-edytor', '04-telefon-ogloszenie-z-uwagami', 2)
    pg.evaluate(f"location.hash = '#/o/{oid}/kontrola'"); pg.wait_for_selector('select[data-k=status]')
    pg.select_option('select[data-k=status]', 'gotowa')
    pg.wait_for_timeout(500)
    assert 'kontrola' in pg.evaluate('location.hash'), 'status powinien przenieść do kontroli'
    pg.screenshot(path=f'{OUT}/05-telefon-kontrola-blokada.png')
    # poprawka wstępu -> gotowa
    pg.evaluate(f"location.hash = '#/o/{oid}/ogloszenie'"); pg.wait_for_selector('#f-lead')
    wpisz(pg, '#f-lead', 'Mieszkanie po jednym właścicielu, regularnie remontowane.')
    pg.wait_for_timeout(800)
    pg.evaluate(f"location.hash = '#/o/{oid}/kontrola'"); pg.wait_for_selector('.check')
    pg.screenshot(path=f'{OUT}/06-telefon-kontrola.png')
    braki = pg.evaluate("[...document.querySelectorAll('.check .nie')].map(e => e.closest('li').innerText)")
    print('braki wymagane:', braki)
    pg.select_option('.check ~ * select, .karta-og select[data-k=status]', 'gotowa'); pg.wait_for_timeout(800)
    status = pg.evaluate("document.querySelector('select[data-k=status]').value")
    print('status po ustawieniu:', status)

    # serwer ma dane
    pg.wait_for_function("!document.querySelector('.stan-sync')", timeout=30000)
    pg.wait_for_timeout(1500)
    def serwer(login='anna', haslo='haslo456'):
        r = urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:18931/logowanie', data=json.dumps({'login': login, 'haslo': haslo}).encode(), headers={'Content-Type': 'application/json'}))
        t = json.load(r)['token']
        return t, json.load(urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:18931/zmiany?od=0', headers={'Authorization': f'Bearer {t}'})))
    _, z = serwer()
    d = z['oferty'][0]['dane']
    print('serwer: cena', d.get('cena'), 'pow', d.get('pow'), 'pom', len(d.get('pom', [])), 'zdj', len(d.get('zdj', [])), 'status', d.get('status'), 'zr', d.get('zr'))
    assert d['cena'] == 489000 and d['pow'] == 52.4 and len(d['zdj']) == 12 and d['status'] == 'gotowa'
    pliki = os.listdir('/tmp/amdane/zdjecia'); print('zdjęcia na serwerze:', len(pliki))

    # wspólnik na laptopie widzi ofertę i zmianę na żywo
    lap = b.new_context(viewport={'width': 1440, 'height': 900}, device_scale_factor=1, locale='pl-PL')
    pl = lap.new_page(); loguj_bledy(pl, 'laptop')
    zaloguj(pl, 'anna', 'haslo456')
    pl.wait_for_selector('.karta'); pl.wait_for_timeout(1500)
    pl.click('.karta'); pl.wait_for_selector('.spis'); pl.wait_for_timeout(1200)
    pl.screenshot(path=f'{OUT}/07-laptop-karta-podglad.png')
    pl.click('[data-a=podglad][data-v=kontrola]'); pl.wait_for_timeout(400)
    pl.screenshot(path=f'{OUT}/08-laptop-kontrola.png')
    pl.click('.kafel[href$="/zdjecia"]'); pl.wait_for_timeout(1500)
    pl.screenshot(path=f'{OUT}/09-laptop-zdjecia.png')
    pl.evaluate(f"location.hash = '#/o/{oid}/s/podstawy'"); pl.wait_for_selector('#f-cena')
    t0 = time.time()
    sekcja('podstawy')
    wpisz(pg, '#f-cena', '479 000')
    pl.wait_for_function("document.querySelector('#f-cena').value.replace(/\\s/g, '') === '479000'", timeout=10000)
    print(f'zmiana ceny dotarła na laptop po {time.time() - t0:.1f} s')

    # offline na telefonie
    sekcja('koszty')
    tel.set_offline(True)
    pg.wait_for_timeout(300)
    wpisz(pg, '#f-media', '200')
    pg.wait_for_timeout(1200)
    print('pasek offline:', pg.evaluate("document.querySelector('.stan-sync')?.textContent"))
    pg.screenshot(path=f'{OUT}/10-telefon-offline.png')
    tel.set_offline(False)
    pg.evaluate("dispatchEvent(new Event('online'))")
    pg.wait_for_function("!document.querySelector('.stan-sync')", timeout=20000)
    _, z = serwer()
    print('media po powrocie sieci:', z['oferty'][0]['dane'].get('media'))
    assert z['oferty'][0]['dane'].get('media') == 200

    # tablet
    tab = b.new_context(viewport={'width': 820, 'height': 1180}, device_scale_factor=2, has_touch=True, locale='pl-PL')
    pt = tab.new_page(); loguj_bledy(pt, 'tablet')
    zaloguj(pt, 'marek', 'tajne123'); pt.wait_for_selector('.karta'); pt.wait_for_timeout(1000)
    pt.click('.karta'); pt.wait_for_selector('.spis'); pt.wait_for_timeout(1200)
    pt.screenshot(path=f'{OUT}/11-tablet-karta.png')
    pt.click('.kafel[href$="/ogloszenie"]'); pt.wait_for_timeout(600)
    pt.screenshot(path=f'{OUT}/12-tablet-ogloszenie.png')
    # lista i ustawienia na telefonie
    pg.goto(URL + '#/'); pg.wait_for_selector('.karta'); pg.wait_for_timeout(1500)
    pg.screenshot(path=f'{OUT}/13-telefon-lista.png')
    pg.click('#dol a[href="#/ustawienia"]'); pg.wait_for_timeout(500)
    pg.screenshot(path=f'{OUT}/14-telefon-ustawienia.png')
    # historia
    pl.evaluate(f"location.hash = '#/o/{oid}'"); pl.wait_for_selector('[data-a=menu]'); pl.click('[data-a=menu]'); pl.click('[data-m=historia]'); pl.wait_for_selector('.hist li', timeout=8000); pl.wait_for_timeout(300)
    pl.screenshot(path=f'{OUT}/15-laptop-historia.png')
    # pobieranie ZIP na laptopie
    pl.keyboard.press('Escape'); pl.click('.okno-tlo [data-zamknij]')
    pl.evaluate(f"location.hash = '#/o/{oid}/zdjecia'"); pl.wait_for_selector('[data-a=pobierz-zdj]')
    with pl.expect_download(timeout=30000) as dl:
        pl.click('[data-a=pobierz-zdj]')
    sciezka = dl.value.path(); import zipfile
    nazwy = zipfile.ZipFile(sciezka).namelist(); print('ZIP:', len(nazwy), nazwy[:4], '...')
    assert zipfile.ZipFile(sciezka).testzip() is None
    b.close()

print('\nBłędy konsoli:' if bledy else '\nBłędy konsoli: brak')
for x in bledy: print(' ', x)
