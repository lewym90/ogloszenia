# Rzut AM: drugi skan jako piętro, nazwa piętra, pokój z wymiarów, zapis — obraz z dwoma piętrami i pomieszczenia z kondygnacją.
from playwright.sync_api import sync_playwright
import sys, shutil, os, base64, io
from PIL import Image
silnik = sys.argv[1] if len(sys.argv) > 1 else 'chromium'
URL = 'http://127.0.0.1:8767/ogloszenia/?api=http://127.0.0.1:18931'
SKAN = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dane', 'skan-roomplan.json')
def ok(w, opis): print(('OK   ' if w else 'BŁĄD ') + opis); assert w, opis
with sync_playwright() as p:
    shutil.rmtree(f'/tmp/amshots/prof-pp-{silnik}', ignore_errors=True)
    opc = dict(viewport={'width': 430, 'height': 932}, device_scale_factor=2, has_touch=True, locale='pl-PL')
    c = p.webkit.launch_persistent_context(f'/tmp/amshots/prof-pp-{silnik}', **opc) if silnik == 'webkit' else p.chromium.launch_persistent_context(f'/tmp/amshots/prof-pp-{silnik}', executable_path='/usr/bin/google-chrome', args=['--no-sandbox'], **opc)
    pg = c.new_page(); bl = []; J = pg.evaluate
    pg.on('pageerror', lambda e: bl.append(f'pageerror {e}'))
    pg.goto(URL); pg.fill('#l-login', 'marek'); pg.fill('#l-haslo', 'tajne123'); pg.click('#f-log button'); pg.wait_for_selector('#karty')
    pg.locator('[data-a=nowa]:visible').first.click(); pg.wait_for_selector('#sek-podstawy')
    oid = J("location.hash.split('/')[2]")
    J(f"location.hash='#/o/{oid}/s/pom'"); pg.wait_for_selector('[data-a=rzut-otworz]'); pg.click('[data-a=rzut-otworz]'); pg.wait_for_url('**/plan.html**'); pg.wait_for_timeout(1000)
    # pokój z wymiarów na pustym rzucie
    pg.click('#pusto [data-a=pokoj-nowy]'); pg.wait_for_selector('#np-a')
    pg.fill('#np-a', '420'); pg.fill('#np-b', '310'); pg.fill('#np-n', 'Salon'); pg.click('[data-a=pokoj-wstaw]'); pg.wait_for_timeout(400)
    sal = J("window.__plan.sc.pokoje.find(p=>p.nazwa==='Salon')"); ok(sal and abs(sal['m'] - 13.02) < 0.01, f'pokój 420×310 = 13,02 m² ({sal and sal["m"]})')
    pg.screenshot(path=f'/tmp/amshots/pp-{silnik}-1-pokoj.png')
    # drugi plik jako piętro
    pg.click('.plan-dol [data-a=wiecej]'); pg.wait_for_timeout(150)
    with pg.expect_file_chooser() as fc: pg.click('#arkusz [data-a=skan]')
    fc.value.set_files(SKAN); pg.wait_for_selector('[data-w=pietro]'); pg.click('[data-w=pietro]'); pg.wait_for_timeout(800)
    ok(J("window.__plan.projekt.floors.length") == 2, 'skan dodany jako drugie piętro')
    pg.click('.plan-dol [data-a=wiecej]'); pg.wait_for_timeout(150)
    pg.fill('#arkusz input[data-pole=nazwa-pietra]', 'Poddasze'); pg.locator('#arkusz input[data-pole=nazwa-pietra]').blur(); pg.wait_for_timeout(200)
    ok(J("window.__plan.projekt.floors.some(f=>f.name==='Poddasze')"), 'nazwa piętra zmieniona')
    pg.screenshot(path=f'/tmp/amshots/pp-{silnik}-2-menu.png')
    pg.click('#arkusz [data-a=zamknij]')
    pg.click('[data-a=zapisz]'); pg.wait_for_url('**/ogloszenia/#/o/**', timeout=30000); pg.wait_for_selector('.okno', timeout=20000); pg.wait_for_timeout(400)
    tx = pg.inner_text('.okno-tresc'); print('   okno:', tx.replace('\n', ' | ')[:240])
    ok('Salon' in tx and 'Poddasze' in tx, 'pomieszczenia z obu pięter z kondygnacją')
    pg.click('.okno [data-t]'); pg.wait_for_timeout(1200)
    b64 = J(f"(async()=>{{const D=await import('./js/dane.js'); const o=D.oferta('{oid}'); const z=o.zdj.find(z=>z.pom==='rzut'); const b=await D.blobZdjecia(z.id); const a=new Uint8Array(await b.arrayBuffer()); let s=''; for(let i=0;i<a.length;i+=8192) s+=String.fromCharCode(...a.subarray(i,i+8192)); return btoa(s)}})()")
    im = Image.open(io.BytesIO(base64.b64decode(b64))); im.save(f'/tmp/amshots/pp-{silnik}-rzut.jpg'); print('   obraz:', im.size)
    ok(im.size[1] > im.size[0] * 1.3, 'obraz rzutu zawiera oba piętra (jedno pod drugim)')
    print('BLEDY', bl[:6]); assert not bl
