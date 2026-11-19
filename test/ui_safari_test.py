# Test w silniku Safari (WebKit): python3 test/ui_safari_test.py [webkit|chromium]
# Spis mieści się na szerokość, przewinięcie zostaje po zmianie, wyposażenie, klienci, prezentacje, dokumenty.
# Wymaga tego samego co ui_test.py oraz `python3 -m playwright install webkit`. Profil trwały, bo prywatny WebKit nie zapisuje plików w IndexedDB.
from playwright.sync_api import sync_playwright
from pomoc import zaloguj, odblokuj, wpisz_pin, pin_danych
import sys, os
os.makedirs('/tmp/amshots', exist_ok=True)
open('/tmp/amtest-akt.pdf', 'wb').write(b'%PDF-1.4\n%%EOF')
URL = 'http://localhost:8766/?api=http://127.0.0.1:18931'
silnik = sys.argv[1] if len(sys.argv) > 1 else 'webkit'
bl = []
with sync_playwright() as p:
    import shutil; shutil.rmtree(f'/tmp/amshots/prof-{silnik}', ignore_errors=True)
    opc = dict(viewport={'width': 430, 'height': 932}, device_scale_factor=2, has_touch=True, locale='pl-PL')
    c = p.webkit.launch_persistent_context(f'/tmp/amshots/prof-{silnik}', **opc) if silnik == 'webkit' else p.chromium.launch_persistent_context(f'/tmp/amshots/prof-{silnik}', executable_path='/usr/bin/google-chrome', args=['--no-sandbox'], is_mobile=True, **opc)
    pg = c.new_page()
    pg.on('pageerror', lambda e: bl.append(f'pageerror {e}'))
    pg.on('console', lambda m: bl.append(f'console {m.type}: {m.text}') if m.type in ('error',) else None)
    zaloguj(pg, URL)
    pg.click('#dol [data-a=nowa]'); pg.wait_for_selector('#sek-podstawy')
    oid = pg.evaluate("location.hash.split('/')[2]")
    pg.fill('#f-roboczy','Granata 1/100'); pg.locator('#f-roboczy').blur()
    pg.click('[data-a=wybor][data-k=transakcja][data-v=najem]'); pg.fill('#f-cena','3500'); pg.locator('#f-cena').blur(); pg.wait_for_timeout(300)
    ed = lambda: pg.evaluate("(()=>{const e=document.querySelector('.kol-edytor');return [e.scrollTop,e.scrollWidth,e.clientWidth]})()")
    pg.evaluate(f"location.hash='#/o/{oid}'"); pg.wait_for_timeout(500)
    print('spis', ed(), 'kafle', len(pg.query_selector_all('.wiersz-spisu'))); assert ed()[1] <= ed()[2] and len(pg.query_selector_all('.wiersz-spisu')) == 18
    pg.screenshot(path=f'/tmp/amshots/{silnik}-spis.png')
    def srodek(sel): pg.evaluate(f"(()=>{{const e=document.querySelector('.kol-edytor'); const r=document.querySelector('{sel}').getBoundingClientRect(); e.scrollTop += r.top - 450;}})()"); pg.wait_for_timeout(200); return ed()[0]
    pg.evaluate(f"location.hash='#/o/{oid}/s/lokal'"); pg.wait_for_selector('#sek-lokal'); pg.wait_for_timeout(300)
    pg.fill('#f-rok','1990'); pg.locator('#f-rok').blur(); pg.wait_for_timeout(300)
    s=srodek('[data-a=wybor][data-k=winda][data-v=tak]'); pg.tap('[data-a=wybor][data-k=winda][data-v=tak]'); pg.wait_for_timeout(400); print('pigulka', s, '->', ed()[0]); assert abs(ed()[0] - s) < 2
    s=srodek('[data-a=zr-menu][data-k=rok]'); pg.tap('[data-a=zr-menu][data-k=rok]'); pg.wait_for_timeout(300); pg.tap('.okno-tlo [data-zr=dok]'); pg.wait_for_timeout(400); print('zrodlo', s, '->', ed()[0]); assert abs(ed()[0] - s) < 2
    # wyposażenie
    pg.evaluate(f"location.hash='#/o/{oid}/s/wyp'"); pg.wait_for_selector('.wyp-el'); pg.wait_for_timeout(200)
    for k in ['lodowka','zmywarka','pralka','szafy','internet']: pg.tap(f'[data-a=wyp-el][data-k={k}]'); pg.wait_for_timeout(120)
    s=srodek('[data-a=wyp-el][data-k=domofon]'); pg.tap('[data-a=wyp-el][data-k=domofon]'); pg.wait_for_timeout(300); print('wyp scroll', s, '->', ed()[0]); assert abs(ed()[0] - s) < 2
    pg.screenshot(path=f'/tmp/amshots/{silnik}-wyp.png')
    # klienci
    pg.evaluate(f"location.hash='#/o/{oid}/klienci'"); pin_danych(pg); pg.wait_for_selector('[data-a=kl-dodaj]'); pg.tap('[data-a=kl-dodaj]'); pg.wait_for_selector('[data-p=imie]')
    pg.fill('[data-p=imie]','Anna Kowalska'); pg.fill('[data-p=tel]','600 100 200'); pg.locator('[data-p=tel]').blur(); pg.wait_for_timeout(300)
    pg.select_option('select[data-p=zrodlo]','otodom'); pg.wait_for_timeout(200)
    pg.fill('textarea[data-p=notatka]','Para, bez zwierząt.'); pg.locator('textarea[data-p=notatka]').blur(); pg.wait_for_timeout(300)
    pg.screenshot(path=f'/tmp/amshots/{silnik}-klienci.png', full_page=False)
    pg.tap('[data-a=wz-dodaj][data-kl]'); pg.wait_for_selector('input[data-p=kiedy]'); pg.wait_for_timeout(300)
    print('hash po umow', pg.evaluate('location.hash'))
    pg.fill('input[data-p=kiedy]','2026-11-21T17:30'); pg.locator('input[data-p=kiedy]').blur(); pg.wait_for_timeout(500)
    pg.select_option('select[data-p=kto]','Marek'); pg.locator('select[data-p=kto]').blur(); pg.wait_for_timeout(400)
    print('wizyta tytul', pg.inner_text('.grupa .grupa-tyt')); assert '17:30' in pg.inner_text('.grupa .grupa-tyt')
    pg.screenshot(path=f'/tmp/amshots/{silnik}-wizyty.png')
    pg.tap('[data-a=wz-status][data-v=odbyla]'); pg.wait_for_selector('textarea[data-p=opinia]'); print('opinia ok')
    # dokumenty
    pg.evaluate(f"location.hash='#/o/{oid}/dokumenty'"); pin_danych(pg); pg.wait_for_selector('.dok'); pg.wait_for_timeout(300)
    pg.set_input_files('input[data-dok=dk_kw]', '/tmp/amtest-akt.pdf'); pg.wait_for_timeout(1500)
    pg.set_input_files('input[data-dok=dk_umowaPosr]', '/tmp/amtest/z01.jpg'); pg.wait_for_timeout(2500)
    pg.fill('#dk-nowy','Regulamin wspólnoty'); pg.tap('[data-a=dk-dodaj]'); pg.wait_for_timeout(500)
    pg.tap('[data-a=dk-status][data-e=dk_swiad]'); pg.tap('.okno-tlo [data-st=zamowiony]'); pg.wait_for_timeout(500)
    pg.screenshot(path=f'/tmp/amshots/{silnik}-dok.png')
    pl = pg.evaluate("[...document.querySelectorAll('.plik span')].map(x=>x.textContent)"); print('pliki', pl); assert 'tmp-akt.pdf' in ' '.join(pl) or len(pl) == 2
    pg.evaluate(f"location.hash='#/o/{oid}'"); pg.wait_for_timeout(600)
    print('podsumowania', pg.evaluate("[...document.querySelectorAll('.wiersz-spisu')].slice(-5).map(k=>k.querySelector('.ws-tyt').textContent+': '+k.querySelector('.ws-pod').textContent)"))
    pg.evaluate("document.querySelector('.kol-edytor').scrollTop=99999"); pg.wait_for_timeout(300)
    pg.screenshot(path=f'/tmp/amshots/{silnik}-spis-dol.png')
    print('spis szer', ed())
    # otwarcie PDF
    pg.evaluate(f"location.hash='#/o/{oid}/dokumenty'"); pin_danych(pg); pg.wait_for_selector('.plik'); pg.wait_for_timeout(1500)
    with c.expect_page(timeout=8000) as nowa:
        pg.click('[data-a=dk-otworz][data-e=dk_kw]')
    np_ = nowa.value; np_.wait_for_timeout(1500); print('pdf url', np_.url[:90].split('?')[0], np_.url.count('k='))
    print('BLEDY', bl); assert not bl
