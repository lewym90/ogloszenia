# Test rzutu: aplikacja → edytor (skan RoomPlan) → zapis w ofercie → pomieszczenia → ponowne otwarcie planu z serwera.
# python3 test/ui_rzut_test.py [chromium|webkit]; wymaga: python3 test/serwer_jak_github.py (8767) i serwera API na 18931
# z AM_ORIGINS zawierającym http://127.0.0.1:8767. Skan testowy: test/dane/skan-roomplan.json (z openPlan3D, MIT).
from playwright.sync_api import sync_playwright
import sys, shutil, json, urllib.request, os
os.makedirs('/tmp/amshots', exist_ok=True)
silnik = sys.argv[1] if len(sys.argv) > 1 else 'chromium'
URL = 'http://127.0.0.1:8767/ogloszenia/?api=http://127.0.0.1:18931'
with sync_playwright() as p:
    shutil.rmtree(f'/tmp/amshots/prof-r-{silnik}', ignore_errors=True)
    opc = dict(viewport={'width': 430, 'height': 932}, device_scale_factor=2, has_touch=True, locale='pl-PL')
    c = p.webkit.launch_persistent_context(f'/tmp/amshots/prof-r-{silnik}', **opc) if silnik=='webkit' else p.chromium.launch_persistent_context(f'/tmp/amshots/prof-r-{silnik}', executable_path='/usr/bin/google-chrome', args=['--no-sandbox'], is_mobile=True, **opc)
    pg = c.new_page(); bl=[]
    pg.on('pageerror', lambda e: bl.append(f'pageerror {e}'))
    pg.goto(URL); pg.fill('#l-login','marek'); pg.fill('#l-haslo','tajne123'); pg.click('#f-log button'); pg.wait_for_selector('#karty')
    pg.click('#dol [data-a=nowa]'); pg.wait_for_selector('#sek-podstawy')
    oid = pg.evaluate("location.hash.split('/')[2]")
    pg.fill('#f-roboczy','Granata 1/100'); pg.locator('#f-roboczy').blur(); pg.wait_for_timeout(300)
    pg.evaluate(f"location.hash='#/o/{oid}/s/pom'"); pg.wait_for_selector('[data-a=rzut-otworz]')
    # jedno pomieszczenie już jest, zmierzone dalmierzem — rzut NIE może ruszyć tych wymiarów
    pg.click('[data-a=dodaj-wiersz][data-l=pom]'); pg.wait_for_timeout(200); pg.fill('input[data-l=pom][data-p=nazwa]', 'Sypialnia 1'); pg.locator('input[data-l=pom][data-p=nazwa]').blur(); pg.wait_for_timeout(300)
    pg.fill('input[data-l=pom][data-p=a]', '4,1'); pg.locator('input[data-l=pom][data-p=a]').blur(); pg.wait_for_timeout(300)
    pg.fill('input[data-l=pom][data-p=b]', '3,5'); pg.locator('input[data-l=pom][data-p=b]').blur(); pg.wait_for_timeout(600)
    pg.click('[data-a=rzut-otworz]'); pg.wait_for_url('**/rzut/editor**', timeout=20000); pg.wait_for_selector('.am-most', timeout=30000); pg.wait_for_timeout(1500)
    # narzędzia → Wczytaj RoomPlan
    pg.click('button[aria-label="Panel narzędzi wł./wył."]') if pg.query_selector('button[aria-label="Panel narzędzi wł./wył."]') else None
    pg.wait_for_timeout(600)
    pg.screenshot(path=f'/tmp/amshots/r-{silnik}-3-narzedzia.png')
    btn = pg.get_by_text('Wczytaj RoomPlan').first
    with pg.expect_file_chooser() as fc: btn.click()
    fc.value.set_files(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dane', 'skan-roomplan.json')); pg.wait_for_timeout(800)
    pg.screenshot(path=f'/tmp/amshots/r-{silnik}-4-dialog.png')
    pg.get_by_role('button', name='Wczytaj', exact=True).last.click(); pg.wait_for_timeout(2500)
    pg.screenshot(path=f'/tmp/amshots/r-{silnik}-5-plan.png')
    pg.click('.am-zapisz'); pg.wait_for_url('**/ogloszenia/#/o/**', timeout=30000)
    pg.wait_for_selector('.okno', timeout=20000); pg.wait_for_timeout(500)
    pg.screenshot(path=f'/tmp/amshots/r-{silnik}-6-propozycja.png')
    tx = pg.inner_text('.okno-tresc'); print('okno:', tx[:400]); assert 'Twój pomiar 14,35' in tx, tx
    pg.click('.okno [data-t]'); pg.wait_for_timeout(1500)
    pg.evaluate(f"location.hash='#/o/{oid}/s/pom'"); pg.wait_for_timeout(800)
    pg.screenshot(path=f'/tmp/amshots/r-{silnik}-7-pom.png')
    o = pg.evaluate(f"(async()=>{{const D=await import('./js/dane.js'); return D.oferta('{oid}')}})()")
    pom = [(x.get('nazwa'), x.get('m')) for x in o.get('pom',[])]; print('pom:', pom)
    assert pom == [('Sypialnia 1', 14.35), ('Sypialnia 2', 9.73), ('Łazienka', 4.12)], pom
    assert (o['pom'][0].get('a'), o['pom'][0].get('b')) == (4.1, 3.5), o['pom'][0]
    assert [z.get('pom') for z in o['zdj']] == ['rzut'] and not o['zdj'][0].get('glowne'), 'rzut nie jest zdjęciem głównym'
    print('zdj rzut:', [(z.get('pom'), z.get('rzutAuto')) for z in o.get('zdj',[])], 'plan:', o.get('rzutPlan'))
    pg.wait_for_function("!document.querySelector('.stan-sync')", timeout=30000); pg.wait_for_timeout(1000)
    # ponowna edycja: plan z serwera wraca do edytora
    pg.evaluate(f"location.hash='#/o/{oid}/zdjecia'"); pg.wait_for_selector('[data-a=rzut-otworz]'); pg.wait_for_timeout(500)
    pg.screenshot(path=f'/tmp/amshots/r-{silnik}-8-zdjecia.png')
    pg.click('[data-a=rzut-otworz]'); pg.wait_for_url('**/rzut/editor**'); pg.wait_for_selector('.am-most'); pg.wait_for_timeout(2500)
    sc = pg.evaluate("document.body.innerText.match(/Ściany: \\d+/)?.[0]"); print('po ponownym otwarciu:', sc); assert sc == 'Ściany: 20'
    pg.screenshot(path=f'/tmp/amshots/r-{silnik}-9-ponownie.png')
    # odzyskanie wymiarów skasowanych przez wersję 1.5.0 — z historii zmian na serwerze
    pg.click('.am-wroc') if pg.query_selector('.am-wroc') else pg.goto(URL)
    pg.wait_for_url('**/ogloszenia/#/o/**', timeout=20000); pg.wait_for_selector('[data-a=rzut-otworz]', timeout=20000)
    pg.evaluate(f"(async()=>{{const D=await import('./js/dane.js'); const o=D.oferta('{oid}'); await D.zmien('{oid}', {{pom: o.pom.map(({{a,b,...r}})=>({{...r, m: 14.26}}))}});}})()")
    pg.wait_for_function("!document.querySelector('.stan-sync')", timeout=30000); pg.wait_for_timeout(800)
    pg.evaluate(f"location.hash='#/o/{oid}/s/pom'"); pg.wait_for_selector('[data-a=pom-odzyskaj]', timeout=10000)
    pg.screenshot(path=f'/tmp/amshots/r-{silnik}-10-odzysk.png')
    pg.click('[data-a=pom-odzyskaj]'); pg.wait_for_timeout(1500)
    o = pg.evaluate(f"(async()=>{{const D=await import('./js/dane.js'); return D.oferta('{oid}')}})()")
    print('po odzyskaniu:', o['pom'][0]); assert (o['pom'][0].get('a'), o['pom'][0].get('b'), o['pom'][0].get('m')) == (4.1, 3.5, 14.35)
    assert not pg.query_selector('[data-a=pom-odzyskaj]'), 'przycisk znika po użyciu'
    pg.screenshot(path=f'/tmp/amshots/r-{silnik}-11-odzyskane.png')
    # plan, którego nie ma na serwerze → edytor otwiera wersję z urządzenia
    pg.evaluate(f"(async()=>{{const D=await import('./js/dane.js'); const o=D.oferta('{oid}'); await D.zmien('{oid}', {{rzutPlan: {{...o.rzutPlan, id: 'brakplanu01'}}}});}})()"); pg.wait_for_timeout(500)
    pg.evaluate(f"location.hash='#/o/{oid}/zdjecia'"); pg.wait_for_selector('[data-a=rzut-otworz]'); pg.wait_for_timeout(300)
    pg.click('[data-a=rzut-otworz]'); pg.wait_for_selector('.okno [data-t]', timeout=15000)
    pg.screenshot(path=f'/tmp/amshots/r-{silnik}-12-brak-planu.png')
    pg.click('.okno [data-t]'); pg.wait_for_url('**/rzut/editor**'); pg.wait_for_selector('.am-most'); pg.wait_for_timeout(2500)
    sc = pg.evaluate("document.body.innerText.match(/Ściany: \\d+/)?.[0]"); print('plan z urządzenia:', sc); assert sc == 'Ściany: 20'
    print('BLEDY', bl[:6]); assert not bl
