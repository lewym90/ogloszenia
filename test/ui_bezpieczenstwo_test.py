# Bezpieczeństwo (1.10.0): PIN i szyfrowanie w telefonie, blokada, 5 złych PIN-ów, wylogowanie czyści telefon,
# nowe urządzenie zatwierdzane kodem, wymuszona zmiana krótkiego hasła, RODO (wydanie i usunięcie danych osoby),
# zmiana PIN-u, dziennik dostępu.
# Uruchamia własny serwer API w trybie produkcyjnym (bez AM_TRYB_TESTOWY) na porcie 18932.
# python3 test/ui_bezpieczenstwo_test.py [chromium|webkit] [szer wys]
import os, sys, json, shutil, subprocess, time, tempfile, urllib.request
from playwright.sync_api import sync_playwright
from pomoc import wpisz_pin, odblokuj, PIN

silnik = sys.argv[1] if len(sys.argv) > 1 else 'chromium'
W, H = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) > 3 else (390, 844)
TAG = f'{silnik}-{W}'
KORZEN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DANE = tempfile.mkdtemp(prefix='am-bezp-')
KLUCZ = os.path.join(tempfile.mkdtemp(prefix='am-klucz-'), 'klucz')
PORT = 18932
URL = f'http://127.0.0.1:8767/ogloszenia/?api=http://127.0.0.1:{PORT}'
OUT = '/tmp/amshots'; os.makedirs(OUT, exist_ok=True)
srodowisko = {**os.environ, 'AM_DANE': DANE, 'AM_KLUCZ_PLIK': KLUCZ, 'PORT': str(PORT), 'AM_ORIGINS': 'http://127.0.0.1:8767'}
srodowisko.pop('AM_TRYB_TESTOWY', None)
# konto z krótkim hasłem (z czasów przed 1.10.0) — zakładamy w trybie testowym, serwer chodzi już produkcyjnie
subprocess.run(['node', '-e', "import('./serwer/amoferty.mjs').then(S=>S.zapiszKonto('jan','Jan Testowy','krotkie1','600000000'))"], cwd=KORZEN, env={**srodowisko, 'AM_TRYB_TESTOWY': '1', 'AM_KONTO_CLI': '1'}, check=True)
serwer = subprocess.Popen(['node', 'serwer/amoferty.mjs'], cwd=KORZEN, env=srodowisko, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
for _ in range(40):
    try: urllib.request.urlopen(f'http://127.0.0.1:{PORT}/zdrowie'); break
    except Exception: time.sleep(0.25)

wyniki = []
def ok(w, t):
    print(('OK  ' if w else 'BŁĄD'), t); wyniki.append(w); assert w, t

NOWE = 'dlugiehaslo-2026'
try:
    with sync_playwright() as p:
        def kontekst(nazwa):
            d = f'/tmp/amshots/prof-b-{TAG}-{nazwa}'; shutil.rmtree(d, ignore_errors=True)
            opc = dict(viewport={'width': W, 'height': H}, device_scale_factor=2, has_touch=True, locale='pl-PL', accept_downloads=True)
            return p.webkit.launch_persistent_context(d, **opc) if silnik == 'webkit' else p.chromium.launch_persistent_context(d, executable_path='/usr/bin/google-chrome', args=['--no-sandbox'], **opc)
        bl = []
        cA = kontekst('A'); A = cA.new_page()
        A.on('pageerror', lambda e: bl.append(f'A {e}'))
        shot = lambda pg, n: pg.screenshot(path=f'{OUT}/b-{TAG}-{n}.png')
        # 1) pierwsze urządzenie: krótkie hasło → wymuszona zmiana → PIN
        A.goto(URL); A.fill('#l-login', 'jan'); A.fill('#l-haslo', 'krotkie1'); A.click('#f-log button')
        A.wait_for_selector('#f-haslo'); shot(A, '01-nowe-haslo')
        A.fill('#h-1', 'zakrotkie'); A.fill('#h-2', 'zakrotkie'); A.click('#f-haslo button'); A.wait_for_timeout(200)
        ok('12' in A.inner_text('#h-blad'), 'hasło krótsze niż 12 znaków odrzucone')
        A.fill('#h-1', NOWE); A.fill('#h-2', NOWE); A.click('#f-haslo button')
        A.wait_for_selector('#f-pin'); shot(A, '02-ustaw-pin')
        A.fill('#pin', '111111'); A.fill('#pin2', '111111'); A.click('#f-pin button[type=submit]'); A.wait_for_timeout(200)
        ok('6 cyfr' in A.inner_text('#pin-blad'), 'zbyt prosty PIN odrzucony')
        wpisz_pin(A)
        ok(A.is_visible('#karty'), 'po PIN-ie aplikacja otwarta')
        # oferta z klientem
        A.locator('[data-a=nowa]:visible').first.click(); A.wait_for_selector('#sek-podstawy')
        oid = A.evaluate("location.hash.split('/')[2]")
        A.fill('#f-roboczy', 'Testowa Lipowa 7'); A.locator('#f-roboczy').blur()
        A.evaluate(f"location.hash='#/o/{oid}/s/klienci'"); A.wait_for_selector('[data-a=kl-dodaj]')
        A.click('[data-a=kl-dodaj]'); A.wait_for_timeout(300)
        A.locator('[data-p=imie]').first.fill('Ewa Poufna'); A.locator('[data-p=tel]').first.fill('600111222'); A.locator('[data-p=tel]').first.blur()
        A.wait_for_timeout(1500)
        # 2) w telefonie wszystko zaszyfrowane
        surowe = A.evaluate("""() => new Promise((ok) => { const r = indexedDB.open('amoferty'); r.onsuccess = () => { const d = r.result; const t = d.transaction(['baza', 'meta'], 'readonly');
          const a = t.objectStore('baza').getAll(); const m = t.objectStore('meta').get('token'); t.oncomplete = () => ok({ baza: a.result, token: m.result }); }; })""")
        tekst = json.dumps(surowe, default=str)
        ok(len(surowe['baza']) >= 1 and all('z' in x and 'dane' not in x for x in surowe['baza']), 'oferty w IndexedDB tylko zaszyfrowane')
        ok('Ewa Poufna' not in tekst and 'Lipowa' not in tekst, 'w pamięci telefonu nie ma jawnych danych klienta')
        ok(isinstance(surowe['token'], dict) and 'z' in surowe['token'], 'token logowania zaszyfrowany')
        # 3) nowe urządzenie: kod z zalogowanego
        cB = kontekst('B'); B = cB.new_page(); B.on('pageerror', lambda e: bl.append(f'B {e}'))
        B.goto(URL); B.fill('#l-login', 'jan'); B.fill('#l-haslo', NOWE); B.click('#f-log button')
        B.wait_for_selector('#f-kod'); shot(B, '03-kod-nowe-urzadzenie')
        A.evaluate("location.hash='#/'"); A.wait_for_selector('.przypomnienie.prosba', timeout=15000)
        kod = A.inner_text('.kod-prosby').replace(' ', '')
        shot(A, '04-prosba-z-kodem')
        ok(len(kod) == 6 and kod.isdigit(), f'zalogowany telefon pokazuje kod ({kod})')
        B.fill('#l-kod', '000000' if kod != '000000' else '111111'); B.click('#f-kod button[type=submit]'); B.wait_for_function("document.querySelector('#l-blad')?.textContent.length > 0", timeout=10000)
        print('   blad:', B.inner_text('#l-blad')); ok('kod' in B.inner_text('#l-blad').lower(), 'zły kod odrzucony')
        B.fill('#l-kod', kod); B.click('#f-kod button[type=submit]')
        wpisz_pin(B)
        B.wait_for_function("document.querySelectorAll('#karty [data-a=otworz], #karty .karta, #karty a').length > 0", timeout=15000)
        ileB = B.evaluate("(async()=>{const D=await import('./js/dane.js'); return D.oferty().map(o=>o.roboczy)})()")
        ok('Testowa Lipowa 7' in ileB, f'nowe urządzenie po kodzie i PIN-ie widzi oferty ({ileB})')
        A.wait_for_timeout(1500)
        ok(not A.locator('.przypomnienie.prosba').count(), 'prośba znika po zatwierdzeniu')
        # 4) ponowne otwarcie w nowej karcie: PIN; zły PIN liczy próby
        A2 = cA.new_page(); A2.goto(URL); A2.wait_for_selector('#f-pin')
        shot(A2, '05-pin-otwarcie')
        A2.fill('#pin', '135790'); A2.wait_for_timeout(1500)
        ok('Zostały 4' in A2.inner_text('#pin-blad'), f'zły PIN: zostały 4 próby ({A2.inner_text("#pin-blad")})')
        A2.fill('#pin', PIN); A2.wait_for_selector('#karty', timeout=20000)
        ok(True, 'dobry PIN otwiera')
        # 5) blokada po 10 minutach bez używania
        A2.evaluate("sessionStorage.setItem('am-sejf-t', String(Date.now() - 11 * 60e3)); dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))"); A2.wait_for_selector('#f-pin')
        ok(True, 'po 10 min przerwy aplikacja pyta o PIN')
        odblokuj(A2)
        # 6) RODO: wydanie danych osoby i usunięcie na żądanie
        A2.evaluate(f"location.hash='#/o/{oid}/s/klienci'"); A2.wait_for_selector('[data-a=kl-eksport]')
        shot(A2, '06-klient-rodo')
        with A2.expect_download() as dl: A2.click('[data-a=kl-eksport]')
        dane = json.loads(open(dl.value.path(), encoding='utf-8').read())
        ok(dane['dane']['imie'] == 'Ewa Poufna' and len(dane['historiaZmian']) >= 1, 'plik z danymi osoby (RODO art. 15)')
        A2.click('[data-a=kl-rodo-usun]'); A2.wait_for_selector('.okno'); A2.locator('.okno button', has_text='Usuń na zawsze').click(); A2.wait_for_timeout(1500)
        ok(not A2.locator('[data-a=kl-eksport]').count(), 'osoba usunięta na żądanie (RODO art. 17)')
        hist = A2.evaluate(f"(async()=>{{const D=await import('./js/dane.js'); return JSON.stringify(await D.historia('{oid}'))}})()")
        ok('Ewa Poufna' not in hist, 'w historii zmian nie ma już danych osoby')
        # 7) zmiana PIN-u i dziennik dostępu
        A2.evaluate("location.hash='#/ustawienia'"); A2.wait_for_selector('[data-a=pin-zmien]')
        shot(A2, '07-ustawienia-bezpieczenstwo')
        A2.click('[data-a=pin-zmien]'); A2.fill('#zp-0', PIN); A2.fill('#zp-1', '246813'); A2.fill('#zp-2', '246813'); A2.click('.form-okna button[type=submit]'); A2.wait_for_timeout(1500)
        ok(not A2.locator('.form-okna').count(), 'PIN zmieniony')
        A2.click('[data-a=dziennik]'); A2.wait_for_selector('.dziennik'); A2.wait_for_timeout(200)
        dz = A2.inner_text('.dziennik'); shot(A2, '08-dziennik')
        ok('otwarcie danych klienta' in dz and 'wydanie danych osoby' in dz and 'usunięcie danych osoby' in dz, 'dziennik: kto oglądał, wydał i usunął dane')
        A2.locator('.okno-tlo').first.click(position={'x': 5, 'y': 5}); A2.wait_for_timeout(200)
        A3 = cA.new_page(); A3.goto(URL); A3.wait_for_selector('#f-pin'); A3.fill('#pin', '246813'); A3.wait_for_selector('#karty', timeout=20000)
        ok(True, 'nowy PIN otwiera aplikację')
        # 8) 5 złych PIN-ów: dane znikają z telefonu
        A4 = cA.new_page(); A4.goto(URL)
        for i in range(5):
            A4.wait_for_selector('#f-pin, #f-log');
            if A4.locator('#f-log').count(): break
            A4.fill('#pin', f'90817{i}'); A4.wait_for_timeout(1300)
            print('   pin', i, A4.locator('#pin-blad').inner_text() if A4.locator('#pin-blad').count() else '-')
        A4.wait_for_selector('#f-log', timeout=20000)
        ok('5 razy' in A4.inner_text('#l-blad'), 'po 5 złych PIN-ach dane usunięte, logowanie hasłem')
        ile = A4.evaluate("() => new Promise((ok) => { const r = indexedDB.open('amoferty'); r.onsuccess = () => { const d = r.result; if (!d.objectStoreNames.contains('baza')) return ok(0); const q = d.transaction('baza').objectStore('baza').count(); q.onsuccess = () => ok(q.result); }; })")
        ok(ile == 0, 'w telefonie nie ma już ofert')
        # 9) wylogowanie na B czyści telefon
        B.evaluate("location.hash='#/ustawienia'"); B.wait_for_selector('[data-a=wyloguj]')
        B.click('[data-a=wyloguj]'); B.wait_for_selector('.okno'); B.locator('.okno button', has_text='Wyloguj').click()
        B.wait_for_selector('#f-log', timeout=20000)
        ile = B.evaluate("() => new Promise((ok) => { const r = indexedDB.open('amoferty'); r.onsuccess = () => { const d = r.result; if (!d.objectStoreNames.contains('baza')) return ok(0); const q = d.transaction('baza').objectStore('baza').count(); q.onsuccess = () => ok(q.result); }; })")
        ok(ile == 0, 'wylogowanie usuwa dane z urządzenia')
        print('BLEDY', bl); ok(not bl, 'bez błędów strony')
        cA.close(); cB.close()
finally:
    serwer.terminate()
    shutil.rmtree(DANE, ignore_errors=True)
print(f'{sum(wyniki)}/{len(wyniki)} OK')
