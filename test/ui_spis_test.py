# Spis karty w grupach, karta „Co dalej”, jeden znak gotowości, status w nagłówku, spis w lewej kolumnie na szerokim ekranie.
# python3 test/ui_spis_test.py [chromium|webkit] [szer wys]; serwery jak test/ui_test.py
import sys, os
from playwright.sync_api import sync_playwright
from pomoc import zaloguj, PIN, pin_danych

silnik = sys.argv[1] if len(sys.argv) > 1 else 'chromium'
W, H = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) > 3 else (390, 844)
TAG = f'{silnik}-{W}'
URL = 'http://localhost:8766/?api=http://127.0.0.1:18931'
OUT = '/tmp/amshots'; os.makedirs(OUT, exist_ok=True)
wyniki = []
def ok(w, t):
    print(('OK  ' if w else 'BŁĄD'), t); wyniki.append(w); assert w, t
shot = lambda pg, n: pg.screenshot(path=f'{OUT}/spis-{TAG}-{n}.png')
D = "(async()=>{const D=await import('./js/dane.js'); %s})()"

with sync_playwright() as p:
    br = p.webkit.launch() if silnik == 'webkit' else p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    c = br.new_context(viewport={'width': W, 'height': H}, device_scale_factor=2 if W < 800 else 1, has_touch=W < 1000, locale='pl-PL')
    pg = c.new_page(); bl = []
    pg.on('pageerror', lambda e: bl.append(str(e)))
    zaloguj(pg, URL)
    pg.click('#dol [data-a=nowa]') if pg.locator('#dol [data-a=nowa]').is_visible() else pg.click('[data-a=nowa]')
    pg.wait_for_selector('#sek-podstawy')
    oid = pg.evaluate("location.hash.split('/')[2]")
    pg.evaluate(D % f"await D.zmien('{oid}', {{roboczy:'Spis test', transakcja:'najem', rodzaj:'mieszkanie', miasto:'Lublin', dzielnica:'Czuby', pow:52, zr:{{pow:'pom'}}}})")
    pg.evaluate(f"location.hash='#/o/{oid}'"); pg.wait_for_selector('.co-dalej')
    ok(pg.locator('.grupa-spisu').count() == 3, 'spis w trzech grupach')
    ok(pg.locator('.wiersz-spisu').count() == 18, '18 wierszy (Kontrola nie jest w spisie)')
    ok(not pg.locator('#ed-tresc .pierscien').count() or pg.locator('.co-dalej .pierscien').count() == pg.locator('#ed-tresc .pierscien').count(), 'jedyny pierścień w spisie: w „Co dalej”')
    cd = pg.inner_text('.co-dalej')
    ok('Przed publikacją uzupełnij' in cd and 'Cena' in cd, '„Co dalej” pokazuje braki do publikacji')
    lok = pg.inner_text('.wiersz-spisu[href$="/s/lokal"]')
    ok('liczba pokoi' in lok, f'wiersz Nieruchomość mówi, czego brakuje ({lok!r})')
    shot(pg, '01-spis')
    # punkt z „Co dalej” prowadzi do pola
    pg.click('.cd-pkt[data-id=cena]'); pg.wait_for_selector('.pole.podswietl', timeout=5000)
    ok('podstawy' in pg.evaluate('location.hash') and pg.locator('.pole.podswietl #f-cena').count() == 1, 'stuknięcie w brak → pole „Cena” podświetlone')
    ok(pg.locator('#sek-podstawy .wym').count() >= 3 and pg.locator('.legenda-wym').count() == 1, 'złote kropki przy polach wymaganych + legenda')
    shot(pg, '02-pole')
    # właściciel: notatki i wynagrodzenie nie blokują
    pg.evaluate(D % f"await D.zmien('{oid}', {{wlImie:'Jan Test', wlTel:'600100200', umowaNr:'7/27', umowaData:'2027-03-01'}})")
    pg.evaluate(f"location.hash='#/o/{oid}'"); pg.wait_for_selector('.co-dalej'); pg.wait_for_timeout(300)
    ok(pg.locator('.wiersz-spisu.ok[href$="/s/wlasciciel"]').count() == 1, 'Właściciel ✓ bez notatek i wynagrodzenia')
    ok('PIN' in pg.inner_text('.grupa-spisu:nth-of-type(2) .grupa-spisu-tyt') or 'PIN' in pg.inner_text('#ed-tresc'), 'grupa z danymi osobowymi oznaczona kłódką')
    # status w nagłówku
    pg.click('.pasek-oferty [data-a=status-menu]'); pg.wait_for_selector('.okno-tlo [data-st=opublikowana]')
    pg.click('.okno-tlo [data-st=opublikowana]'); pg.wait_for_timeout(500)
    st = pg.evaluate(D % f"return D.oferta('{oid}').status")
    lista = 'kontrola' in pg.evaluate('location.hash') or (W >= 1180 and 'wymagane' in pg.inner_text('#podglad').lower())
    ok(st == 'przygotowanie' and lista, 'status zablokowany przy brakach → lista kontrolna')
    # jeden PIN na grupę
    pg.evaluate(f"location.hash='#/o/{oid}/s/wlasciciel'"); pin_danych(pg); pg.wait_for_selector('#f-wlImie')
    pg.evaluate(f"location.hash='#/o/{oid}'"); pg.wait_for_selector('.co-dalej')
    pg.evaluate(f"location.hash='#/o/{oid}/dokumenty'"); pg.wait_for_timeout(400)
    ok(not pg.locator('#pin-dane').count(), 'Dokumenty (ta sama grupa) bez drugiego PIN-u')
    pg.evaluate(f"location.hash='#/o/{oid}/klienci'"); pg.wait_for_selector('#pin-dane')
    ok(True, 'Klienci (inna grupa) pytają o PIN')
    pg.fill('#pin-dane', PIN); pg.wait_for_selector('[data-a=kl-dodaj]', timeout=20000)
    if W >= 760:
        ok(pg.locator('#spis-boczny .wiersz-spisu').count() == 18 and pg.locator('#spis-boczny .wiersz-spisu.akt[href$="/klienci"]').count() == 1, 'szeroki ekran: spis w lewej kolumnie, bieżąca sekcja zaznaczona')
        ok(not pg.locator('#karty').is_visible(), 'w sekcji lista ofert schowana')
    shot(pg, '03-sekcja')
    print('BLEDY', bl); ok(not bl, 'bez błędów strony')
    pg.evaluate(D % f"await D.usunOferte('{oid}')")
    c.close(); br.close()
print(f'{sum(wyniki)}/{len(wyniki)} OK')
