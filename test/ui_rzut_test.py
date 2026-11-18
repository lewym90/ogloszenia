# Rzut: karta → edytor Rzut AM (plan.html) → skan → widok 3D / edytor zaawansowany (rzut/, openPlan3D) → „Gotowe”
# wraca do Rzut AM → „Zapisz” → oferta: pomiar z dalmierza zostaje, odzyskanie wymiarów z historii, ponowne otwarcie z serwera.
# python3 test/ui_rzut_test.py [chromium|webkit]; wymaga: python3 test/serwer_jak_github.py (8767) i serwera API na 18931.
from playwright.sync_api import sync_playwright
import sys, shutil, os
silnik = sys.argv[1] if len(sys.argv) > 1 else 'chromium'
URL = 'http://127.0.0.1:8767/ogloszenia/?api=http://127.0.0.1:18931'
SKAN = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dane', 'skan-roomplan.json')
def ok(w, opis): print(('OK   ' if w else 'BŁĄD ') + opis); assert w, opis
with sync_playwright() as p:
    shutil.rmtree(f'/tmp/amshots/prof-r-{silnik}', ignore_errors=True)
    opc = dict(viewport={'width': 430, 'height': 932}, device_scale_factor=2, has_touch=True, locale='pl-PL')
    c = p.webkit.launch_persistent_context(f'/tmp/amshots/prof-r-{silnik}', **opc) if silnik == 'webkit' else p.chromium.launch_persistent_context(f'/tmp/amshots/prof-r-{silnik}', executable_path='/usr/bin/google-chrome', args=['--no-sandbox'], is_mobile=True, **opc)
    pg = c.new_page(); bl = []
    pg.on('pageerror', lambda e: bl.append(f'pageerror {e}'))
    J = pg.evaluate
    pg.goto(URL); pg.fill('#l-login', 'marek'); pg.fill('#l-haslo', 'tajne123'); pg.click('#f-log button'); pg.wait_for_selector('#karty')
    pg.locator('[data-a=nowa]:visible').first.click(); pg.wait_for_selector('#sek-podstawy')
    oid = J("location.hash.split('/')[2]")
    pg.fill('#f-roboczy', 'Granata 1/100'); pg.locator('#f-roboczy').blur(); pg.wait_for_timeout(300)
    pg.evaluate(f"location.hash='#/o/{oid}/s/pom'"); pg.wait_for_selector('[data-a=rzut-otworz]')
    # pomieszczenie zmierzone dalmierzem — rzut nie może ruszyć jego wymiarów
    pg.click('[data-a=dodaj-wiersz][data-l=pom]'); pg.wait_for_timeout(200); pg.fill('input[data-l=pom][data-p=nazwa]', 'Sypialnia 1'); pg.locator('input[data-l=pom][data-p=nazwa]').blur(); pg.wait_for_timeout(300)
    pg.fill('input[data-l=pom][data-p=a]', '4,1'); pg.locator('input[data-l=pom][data-p=a]').blur(); pg.wait_for_timeout(300)
    pg.fill('input[data-l=pom][data-p=b]', '3,5'); pg.locator('input[data-l=pom][data-p=b]').blur(); pg.wait_for_timeout(600)
    pg.click('[data-a=rzut-otworz]'); pg.wait_for_url('**/plan.html**'); pg.wait_for_timeout(1200)
    with pg.expect_file_chooser() as fc: pg.click('#pusto [data-a=skan]')
    fc.value.set_files(SKAN); pg.wait_for_timeout(1500)
    ok(J("window.__plan.sc.pokoje.some(p=>p.nazwa==='Sypialnia 1' && p.mKarta===14.35)"), 'na rzucie Sypialnia 1 ma metraż z dalmierza (14,35)')
    # edytor zaawansowany i powrót
    pg.click('.plan-dol [data-a=wiecej]'); pg.wait_for_timeout(150); pg.click('#arkusz [data-a=zaawansowany]')
    pg.wait_for_url('**/rzut/editor**', timeout=20000); pg.wait_for_selector('.am-most', timeout=30000); pg.wait_for_timeout(2500)
    sc = J("document.body.innerText.match(/Ściany: \\d+/)?.[0]"); ok(sc == 'Ściany: 20', f'plan otwarty w edytorze zaawansowanym ({sc})')
    ok('Pobierz kopię JSON' not in J("document.body.innerText"), 'bez komunikatu o konflikcie')
    pg.click('.am-zapisz'); pg.wait_for_url('**/plan.html**', timeout=30000); pg.wait_for_timeout(1500)
    ok(J("window.__plan.projekt.floors[0].walls.length") == 20 and J("window.__plan.zmienione"), 'Gotowe wraca do Rzut AM z planem')
    pg.click('[data-a=zapisz]'); pg.wait_for_url('**/ogloszenia/#/o/**', timeout=30000); pg.wait_for_selector('.okno', timeout=20000); pg.wait_for_timeout(500)
    tx = pg.inner_text('.okno-tresc'); ok('Twój pomiar 14,35' in tx, 'okno pokazuje, że pomiar zostaje')
    pg.click('.okno [data-t]'); pg.wait_for_timeout(1500)
    o = J(f"(async()=>{{const D=await import('./js/dane.js'); return D.oferta('{oid}')}})()")
    s1 = [x for x in o['pom'] if x['nazwa'] == 'Sypialnia 1'][0]
    ok((s1.get('a'), s1.get('b'), s1.get('m')) == (4.1, 3.5, 14.35), 'wymiary z dalmierza nietknięte')
    ok([z.get('pom') for z in o['zdj']] == ['rzut'] and not o['zdj'][0].get('glowne'), 'obraz rzutu w zdjęciach, nie jako główne')
    pg.wait_for_function("!document.querySelector('.stan-sync')", timeout=30000); pg.wait_for_timeout(800)
    # odzyskanie wymiarów skasowanych przez wersję 1.5.0
    J(f"(async()=>{{const D=await import('./js/dane.js'); const o=D.oferta('{oid}'); await D.zmien('{oid}', {{pom: o.pom.map(({{a,b,...r}})=>({{...r, m: 14.26}}))}});}})()")
    pg.wait_for_function("!document.querySelector('.stan-sync')", timeout=30000); pg.wait_for_timeout(800)
    J(f"location.hash='#/o/{oid}/zdjecia'"); pg.wait_for_timeout(300); J(f"location.hash='#/o/{oid}/s/pom'"); pg.wait_for_selector('[data-a=pom-odzyskaj]', timeout=10000)
    pg.click('[data-a=pom-odzyskaj]'); pg.wait_for_timeout(1500)
    o = J(f"(async()=>{{const D=await import('./js/dane.js'); return D.oferta('{oid}')}})()")
    s1 = [x for x in o['pom'] if x['nazwa'] == 'Sypialnia 1'][0]
    ok((s1.get('a'), s1.get('b'), s1.get('m')) == (4.1, 3.5, 14.35), 'wymiary odzyskane z historii')
    # ponowne otwarcie: plan z serwera
    pg.wait_for_function("!document.querySelector('.stan-sync')", timeout=30000); pg.wait_for_timeout(500)
    J(f"location.hash='#/o/{oid}/zdjecia'"); pg.wait_for_selector('[data-a=rzut-otworz]'); pg.click('[data-a=rzut-otworz]')
    pg.wait_for_url('**/plan.html**'); pg.wait_for_timeout(1500)
    ok(J("window.__plan.projekt?.floors[0].walls.length") == 20 and not J("window.__plan.zmienione"), 'plan wczytany z serwera, bez niezapisanych zmian')
    # plan, którego nie ma na serwerze → wersja z urządzenia
    pg.goto(URL + f"#/o/{oid}/zdjecia"); pg.wait_for_selector('[data-a=rzut-otworz]'); pg.wait_for_timeout(500)
    J(f"(async()=>{{const D=await import('./js/dane.js'); const o=D.oferta('{oid}'); await D.zmien('{oid}', {{rzutPlan: {{...o.rzutPlan, id: 'brakplanu01'}}}});}})()"); pg.wait_for_timeout(500)
    J("(async()=>{const R=await import('./js/rzut.js'); await R.usun('szkic:" + oid + "');})()")
    pg.click('[data-a=rzut-otworz]'); pg.wait_for_url('**/plan.html**'); pg.wait_for_timeout(1800)
    ok(J("window.__plan.projekt?.floors[0].walls.length") == 20, 'brak planu na serwerze → plan z urządzenia')
    print('BLEDY', bl[:6]); assert not bl
