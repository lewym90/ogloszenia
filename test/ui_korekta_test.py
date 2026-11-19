# Korekta zdjęć (1.13.0–1.14.0): kafelki „Wyrównaj” i „Obróbka” (wybór wersji), asystent, edytor (suwaki, kadr), oryginał zostaje, przywrócenie, „To urządzenie”.
# python3 test/ui_korekta_test.py [chromium|webkit] [szer wys]; serwery jak test/ui_test.py
import sys, os, math
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright
from pomoc import zaloguj

silnik = sys.argv[1] if len(sys.argv) > 1 else 'chromium'
W, H = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) > 3 else (390, 844)
TAG = f'{silnik}-{W}'
URL = 'http://localhost:8766/?api=http://127.0.0.1:18931'
OUT = '/tmp/amshots'; os.makedirs(OUT, exist_ok=True)
wyniki = []
def ok(w, t):
    print(('OK  ' if w else 'BŁĄD'), t); wyniki.append(w); assert w, t
shot = lambda pg, n: pg.screenshot(path=f'{OUT}/korekta-{TAG}-{n}.png')
D = "(async()=>{const D=await import('./js/dane.js'); %s})()"

# zdjęcie „zrobione krzywo”: ciemne, żółtawe, piony zbiegają się ku górze i lekko przechylone
def krzywe(sciezka, ciemne=0.55):
    w, h = 1600, 1200
    im = Image.new('RGB', (w, h), (int(225 * ciemne), int(200 * ciemne), int(150 * ciemne)))
    d = ImageDraw.Draw(im)
    for X in range(120, w, 170):
        dx = (X - w / 2)
        top = X - dx * 0.14 + 0.035 * h  # zbieżność + przechył
        d.line([(X, h), (top, 0)], fill=(int(70 * ciemne), int(60 * ciemne), int(45 * ciemne)), width=9)
    d.rectangle([600, 700, 1000, 1000], fill=(int(160 * ciemne), int(120 * ciemne), int(90 * ciemne)))
    im.save(sciezka, quality=92)
krzywe('/tmp/krzywe1.jpg'); krzywe('/tmp/krzywe2.jpg', 0.7); krzywe('/tmp/krzywe3.jpg', 0.6)

with sync_playwright() as p:
    br = p.webkit.launch() if silnik == 'webkit' else p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    c = br.new_context(viewport={'width': W, 'height': H}, device_scale_factor=2 if W < 800 else 1, has_touch=W < 1000, locale='pl-PL')
    pg = c.new_page(); bl = []
    pg.on('pageerror', lambda e: bl.append(str(e)))
    zaloguj(pg, URL)
    pg.click('#dol [data-a=nowa]') if pg.locator('#dol [data-a=nowa]').is_visible() else pg.click('[data-a=nowa]')
    pg.wait_for_selector('#sek-podstawy')
    oid = pg.evaluate("location.hash.split('/')[2]")
    pg.evaluate(D % f"await D.zmien('{oid}', {{roboczy:'Korekta test', transakcja:'najem', rodzaj:'mieszkanie', miasto:'Lublin'}})")
    pg.evaluate(f"location.hash = '#/o/{oid}/zdjecia'"); pg.wait_for_selector('#dodaj-zdj', state='attached')
    pg.set_input_files('#dodaj-zdj', ['/tmp/krzywe1.jpg']); pg.wait_for_selector('.zdj', timeout=30000)
    id0 = pg.evaluate(D % f"return D.oferta('{oid}').zdj[0].id")
    ok(pg.locator('.zdj [data-a=zdj-popraw]').count() == 1, 'na karcie zdjęcia jest przycisk edytora')
    ok(pg.locator('.zdj [data-a=zdj-wyrownaj]').count() == 1 and pg.locator('.zdj [data-a=zdj-obrobka]').count() == 1, 'dwa kafelki: „Wyrównaj” i „Obróbka”')
    pg.wait_for_selector('.uwagi-zdj', timeout=15000)
    ok('Krzywo' in pg.inner_text('.uwagi-zdj'), f'asystent po dodaniu: „{pg.inner_text(".uwagi-zdj")}”')
    ok(pg.evaluate("[...document.querySelectorAll('.zdj-kafle, .uwagi-zdj, .zdj-kafle *')].every(e => e.getBoundingClientRect().right <= e.closest('.zdj').getBoundingClientRect().right + 1)"), 'kafelki mieszczą się na karcie')
    ok(pg.evaluate("[...document.querySelectorAll('.zdj .akcje button')].every(b => b.getBoundingClientRect().width >= 30 && b.getBoundingClientRect().right <= b.closest('.zdj').getBoundingClientRect().right)"), 'sześć przycisków karty zdjęcia mieści się (min. 30 px)')
    ok(pg.locator('[data-a=zdj-auto-wszystkie]').count() == 0, 'bez zbiorczego „Popraw automatycznie”')

    # edytor
    pg.click('.zdj [data-a=zdj-popraw]'); pg.wait_for_selector('.edytor-zdj.gotowy', timeout=20000); pg.wait_for_timeout(300)
    ok(pg.locator('.ez-suwak').count() == 10 and pg.locator('[data-prop]').count() == 4, 'edytor: 10 suwaków (w tym wyrównanie światła, klarowność, ostrość) i 4 proporcje')
    ok('Bez retuszu' in pg.inner_text('.ez-info') and pg.locator('[data-ez=oryginal]').count() == 0, 'informacja „bez retuszu, oryginał zostaje”; bez „Przywróć” przy pierwszej korekcie')
    rk = pg.locator('.ez-ramka').bounding_box(); ob = pg.locator('.ez-obraz').bounding_box()
    ok(rk['width'] > 100 and rk['x'] >= ob['x'] - 1 and rk['x'] + rk['width'] <= ob['x'] + ob['width'] + 1 and rk['y'] + rk['height'] <= ob['y'] + ob['height'] + 1, f'podgląd mieści się w polu obrazu ({int(rk["width"])}×{int(rk["height"])})')
    ok(pg.evaluate("[...document.querySelectorAll('.ez-panel, .ez-gora, .ez-panel *')].every(e => e.scrollWidth <= e.clientWidth + 1 || getComputedStyle(e).overflowX === 'visible' && e.getBoundingClientRect().right <= innerWidth + 1)"), 'panel edytora mieści się w szerokości ekranu')
    shot(pg, '01-edytor')
    pg.click('[data-ez=wyrownaj]'); pg.wait_for_timeout(600)
    pg.click('[data-ez=obrobka]'); pg.wait_for_timeout(600)
    wart = {k: pg.inner_text(f'[data-wart={k}]') for k in ['ev', 'temp', 'obrot', 'piony', 'klar', 'ostr']}
    ok(wart['obrot'].startswith('−') and wart['piony'].startswith('+') and wart['ostr'] != '0%' and wart['klar'] != '0%', f'„Wyrównaj” i „Obróbka” w edytorze: piony, klarowność, ostrość {wart}')
    ok(pg.inner_text('.ez-stan').startswith('Poprawione:'), 'pod podglądem opis korekty')
    shot(pg, '02-auto')
    # przybliżenie i przesunięcie kadru palcem
    pg.evaluate("(()=>{const i=document.querySelector('[data-s=zoom]'); i.value=0.5; i.dispatchEvent(new Event('input',{bubbles:true}));})()")
    pg.wait_for_timeout(200)
    ok(pg.inner_text('[data-wart=zoom]') == '150%', 'przybliżenie 150%')
    b = pg.locator('.ez-ramka canvas').bounding_box()
    pg.mouse.move(b['x'] + b['width'] / 2, b['y'] + b['height'] / 2); pg.mouse.down()
    pg.mouse.move(b['x'] + b['width'] / 2 + 60, b['y'] + b['height'] / 2, steps=5)
    ok('siatka' in pg.get_attribute('.ez-ramka', 'class'), 'podczas przesuwania widać siatkę')
    pg.mouse.up(); pg.wait_for_timeout(200)
    # przytrzymanie „Przed”
    pb = pg.locator('[data-ez=przed]').bounding_box()
    pg.mouse.move(pb['x'] + 10, pb['y'] + 10); pg.mouse.down(); pg.wait_for_timeout(250)
    ok(pg.inner_text('.ez-stan') == 'Przed korektą', '„Przed” pokazuje zdjęcie sprzed korekty')
    pg.mouse.up(); pg.wait_for_timeout(250)
    ok(pg.inner_text('.ez-stan').startswith('Poprawione'), 'po puszczeniu wraca korekta')
    pg.click('[data-prop="4:3"]'); pg.wait_for_timeout(200)
    shot(pg, '03-kadr')
    pg.click('[data-ez=zapisz]'); pg.wait_for_selector('.edytor-zdj', state='detached', timeout=30000); pg.wait_for_timeout(800)
    z = pg.evaluate(D % f"return D.oferta('{oid}').zdj[0]")
    ok(z['id'] != id0 and z['kor']['org'] == id0 and z['kor']['par'].get('proporcje') == '4:3', 'zapis: nowe zdjęcie, oryginał zapamiętany, ustawienia w ofercie')
    ok(abs(z['w'] / z['h'] - 4 / 3) < 0.01 and max(z['w'], z['h']) <= 2560, f'wynik w proporcjach 4:3 ({z["w"]}×{z["h"]})')
    ok(pg.locator('.zdj .zn.kor').count() == 1 and pg.locator('.zdj [data-a=zdj-popraw].akt').count() == 1, 'na karcie znaczek „Poprawione”')
    pg.wait_for_function(f"document.querySelector('.zdj img[data-mini=\"{z['id']}\"]')?.src", timeout=15000)
    # serwer dostał nowe zdjęcie, oryginał został
    pg.wait_for_function("(async()=>{const D=await import('./js/dane.js'); return !D.czekaNaWyslanie('%s');})()" % z['id'], timeout=30000)
    pg.wait_for_timeout(500)
    pliki = os.listdir('/tmp/amdane/zdjecia')
    ok(f"{id0}.jpg" in pliki and f"{z['id']}.jpg" in pliki, 'na serwerze są oba: oryginał i poprawione')
    shot(pg, '04-karta')

    # ponowna edycja zaczyna od oryginału z zapisanymi ustawieniami; przywrócenie oryginału
    pg.click('.zdj [data-a=zdj-popraw]'); pg.wait_for_selector('.edytor-zdj.gotowy', timeout=20000); pg.wait_for_timeout(300)
    ok(pg.locator('[data-prop="4:3"].akt').count() == 1 and pg.inner_text('[data-wart=zoom]') == '150%', 'ponowna edycja: wracają poprzednie ustawienia')
    ok(pg.locator('[data-ez=oryginal]').count() == 1, 'jest „Przywróć oryginał”')
    pg.click('[data-ez=oryginal]'); pg.wait_for_selector('.okno-tlo [data-t]'); pg.click('.okno-tlo [data-t]'); pg.wait_for_timeout(800)
    z2 = pg.evaluate(D % f"return D.oferta('{oid}').zdj[0]")
    ok(z2['id'] == id0 and 'kor' not in z2 and z2['w'] == 1600, 'przywrócony oryginał (id i wymiary sprzed korekty)')
    ok(pg.locator('.zdj .zn.kor').count() == 0, 'znaczek „Poprawione” zniknął')

    # anulowanie nic nie zmienia
    pg.click('.zdj [data-a=zdj-popraw]'); pg.wait_for_selector('.edytor-zdj.gotowy', timeout=20000)
    pg.click('[data-ez=obrobka]'); pg.click('[data-ez=anuluj]'); pg.wait_for_timeout(300)
    ok(pg.evaluate(D % f"return D.oferta('{oid}').zdj[0].id") == id0, 'zamknięcie bez zapisu nic nie zmienia')

    # kafelki: „Wyrównaj” jednym stuknięciem, „Obróbka” — wybór jednej z wersji
    pg.set_input_files('#dodaj-zdj', ['/tmp/krzywe2.jpg', '/tmp/krzywe3.jpg']); pg.wait_for_function("document.querySelectorAll('.zdj').length === 3", timeout=30000)
    pg.wait_for_function("document.querySelectorAll('.uwagi-zdj').length >= 2", timeout=20000)
    id2 = pg.evaluate(D % f"return D.oferta('{oid}').zdj[1].id")
    pg.click(f'.zdj [data-a=zdj-wyrownaj][data-z="{id2}"]')
    pg.wait_for_selector('.zdj:nth-child(2) .kafel-zdj.akt[data-a=zdj-wyrownaj]', timeout=60000)
    z = pg.evaluate(D % f"return D.oferta('{oid}').zdj[1]")
    ok(abs(z['kor']['par'].get('obrot', 0)) > 0.5 and 'ev' not in z['kor']['par'], f'„Wyrównaj”: tylko geometria {z["kor"]["par"]}')
    pg.wait_for_timeout(400)
    ok(pg.locator(f'.zdj:nth-child(2) .kafel-zdj.akt[data-a=zdj-wyrownaj]').count() == 1 and pg.locator('.zdj:nth-child(2) .uwagi-zdj').count() == 0, 'po wyrównaniu kafelek złoty, uwaga „Krzywo” znika')
    # ulubiona wersja: po 20 wyborach na początku
    pg.evaluate("localStorage.setItem('am-styl', JSON.stringify({jasna: 15, naturalna: 5}))")
    id3 = pg.evaluate(D % f"return D.oferta('{oid}').zdj[2].id")
    pg.click(f'.zdj [data-a=zdj-obrobka][data-z="{id3}"]'); pg.wait_for_selector('.okno-obrobki')
    pg.wait_for_function("document.querySelectorAll('.okno-obrobki .ob-wersja:not([disabled])').length === 4", timeout=60000)
    nazwy = [pg.inner_text(f'.okno-obrobki .ob-wersja:nth-child({i}) .ob-nazwa') for i in range(1, 5)]
    ok(nazwy[0] == 'Bez obróbki' and nazwy[1].startswith('Jasna') and 'Twój styl' in nazwy[1], f'okno wersji: {nazwy}')
    ok(pg.evaluate("[...document.querySelectorAll('.okno-obrobki canvas')].every(c => c.width > 100)"), 'cztery podglądy wersji')
    ok(pg.evaluate("(()=>{const o=document.querySelector('.okno-obrobki .okno').getBoundingClientRect(); return o.right <= innerWidth + 1 && o.left >= -1;})()"), 'okno wersji mieści się na ekranie')
    shot(pg, '05-wersje')
    pg.click('.okno-obrobki .ob-wersja[data-w=jasna]')
    pg.wait_for_function("document.querySelector('.zdj:nth-child(3) [data-a=zdj-obrobka]')?.innerText.includes('Jasna')", timeout=60000)
    ok(pg.evaluate(D % f"return D.oferta('{oid}').zdj[2].kor.par.wariant") == 'jasna', 'zapisana wersja Jasna')
    pg.wait_for_timeout(400)
    ok('Jasna' in pg.inner_text(f'.zdj:nth-child(3) [data-a=zdj-obrobka]'), 'kafelek „Obróbka” pokazuje wybraną wersję')
    ok(pg.evaluate("JSON.parse(localStorage.getItem('am-styl')).jasna") == 16, 'wybór zapamiętany (styl)')
    zs = pg.evaluate(D % f"return D.oferta('{oid}').zdj")
    shot(pg, '06-kafelki')

    # usunięcie poprawionego usuwa też oryginał
    pg.wait_for_function("(async()=>{const D=await import('./js/dane.js'); return !D.oferta('%s').zdj.some(z=>D.czekaNaWyslanie(z.id));})()" % oid, timeout=30000)
    pierwsze = zs[2]
    pg.click(f'.zdj [data-a=zdj-usun][data-z="{pierwsze["id"]}"]'); pg.wait_for_selector('.okno-tlo [data-t]'); pg.click('.okno-tlo [data-t]'); pg.wait_for_timeout(1500)
    pliki = os.listdir('/tmp/amdane/zdjecia')
    ok(f"{pierwsze['id']}.jpg" not in pliki and f"{pierwsze['kor']['org']}.jpg" not in pliki, 'usunięcie zdjęcia usuwa z serwera także oryginał')

    # pobieranie w kolejności daje poprawione pliki
    nb = pg.evaluate(D % f"const z=D.oferta('{oid}').zdj[0]; const b=await D.blobZdjecia(z.id); const i=await createImageBitmap(b); return [i.width,i.height,z.w,z.h]")
    ok(nb[0] == nb[2] and nb[1] == nb[3], 'plik do ogłoszenia = wersja poprawiona')
    # Ustawienia: „To urządzenie”
    pg.evaluate("location.hash = '#/ustawienia'"); pg.wait_for_selector('#u-urz')
    pg.select_option('#u-urz', 'iphone-17-pro-max')
    pg.wait_for_function("document.querySelector('#sek-urzadzenie') && document.querySelector('#sek-urzadzenie').innerText.includes('Test: próbne')", timeout=30000)
    tu = pg.inner_text('#sek-urzadzenie')
    ok('A19 Pro' in tu and 'Poziom:' in tu, f'„To urządzenie”: specyfikacja i poziom ({tu.splitlines()[-2] if len(tu.splitlines()) > 1 else tu})')
    ok(pg.evaluate("JSON.parse(localStorage.getItem('am-urzadzenie')).id") == 'iphone-17-pro-max', 'wybór zapamiętany na tym urządzeniu')
    pg.select_option('#u-urz', 'inne'); pg.wait_for_selector('#u-urz-nazwa'); pg.fill('#u-urz-nazwa', 'Samsung Galaxy Tab S9'); pg.press('#u-urz-nazwa', 'Tab')
    ok(pg.evaluate("JSON.parse(localStorage.getItem('am-urzadzenie')).nazwa") == 'Samsung Galaxy Tab S9', '„Inne” z własną nazwą')
    shot(pg, '07-urzadzenie')
    ok(not bl, f'brak błędów strony {bl}')
    br.close()
print(f'\n{sum(wyniki)}/{len(wyniki)} OK ({TAG})')
