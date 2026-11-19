# Karta AML, PIN przy każdym otwarciu danych osobowych, informacja RODO z danych firmy, archiwum i rejestr AML, urządzenia.
# python3 test/ui_aml_test.py [chromium|webkit] [szer wys]; wymaga serwerów jak test/ui_test.py (API 18931 w trybie testowym, statyczny 8766)
import sys, os, json
from playwright.sync_api import sync_playwright
from pomoc import zaloguj, PIN

silnik = sys.argv[1] if len(sys.argv) > 1 else 'chromium'
W, H = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) > 3 else (390, 844)
TAG = f'{silnik}-{W}'
URL = 'http://localhost:8766/?api=http://127.0.0.1:18931'
OUT = '/tmp/amshots'; os.makedirs(OUT, exist_ok=True)
wyniki = []
def ok(w, t):
    print(('OK  ' if w else 'BŁĄD'), t); wyniki.append(w); assert w, t
shot = lambda pg, n: pg.screenshot(path=f'{OUT}/aml-{TAG}-{n}.png')

with sync_playwright() as p:
    opc = dict(viewport={'width': W, 'height': H}, device_scale_factor=2, has_touch=True, locale='pl-PL', accept_downloads=True)
    br = p.webkit.launch() if silnik == 'webkit' else p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    c = br.new_context(**opc)
    pg = c.new_page(); bl = []
    pg.on('pageerror', lambda e: bl.append(str(e)))
    zaloguj(pg, URL)
    # dane firmy do klauzuli
    pg.evaluate("location.hash='#/ustawienia'"); pg.wait_for_selector('#f-imie1')
    for k, v in [('imie1', 'Marek Lewandowski'), ('firma1', 'ML Nieruchomości Marek Lewandowski'), ('nip1', '7120000001'), ('imie2', 'Anna Wspólnik'), ('firma2', 'AW Anna Wspólnik'), ('nip2', '7120000002'),
                 ('nazwaSc', 'AM Nieruchomości s.c.'), ('adres', 'ul. Testowa 1, 20-001 Lublin'), ('email', 'biuro@am.test'), ('telefon', '600 100 200'), ('hosting', 'Sprint S.A., Polska')]:
        pg.fill(f'#f-{k}', v); pg.locator(f'#f-{k}').blur()
    pg.wait_for_timeout(800)
    shot(pg, '01-ustawienia-firma')
    # nowa oferta z właścicielem i klientem
    pg.click('#dol [data-a=nowa]') if pg.locator('#dol [data-a=nowa]').is_visible() else pg.click('[data-a=nowa]')
    pg.wait_for_selector('#sek-podstawy')
    oid = pg.evaluate("location.hash.split('/')[2]")
    pg.evaluate(f"(async()=>{{const D=await import('./js/dane.js'); await D.zmien('{oid}', {{roboczy:'Lipowa 7 AML', transakcja:'sprzedaz', ulica:'Lipowa 7', miasto:'Lublin', wlImie:'Jan Właściciel', wlTel:'600111222', wlEmail:'jan@x.pl', umowaNr:'5/2027', kl_kup00001:{{imie:'Ewa Kupiec', tel:'600333444', status:'umowiony', t:Date.now()}}}})}})()")
    pg.evaluate(f"location.hash='#/o/{oid}'"); pg.wait_for_selector('.spis')
    pod = pg.inner_text('.spis')
    ok('Jan Właściciel' not in pod, 'spis karty nie pokazuje nazwiska właściciela')
    ok('AML' in pod, 'kafelek AML w spisie')
    # PIN przy wejściu w klientów
    pg.evaluate(f"location.hash='#/o/{oid}/klienci'"); pg.wait_for_selector('#pin-dane')
    ok('Ewa Kupiec' not in pg.inner_text('#ed-tresc'), 'bez PIN-u nie widać danych klienta')
    shot(pg, '02-pin-danych')
    pg.fill('#pin-dane', '111222'); pg.wait_for_timeout(1500)
    ok('Zostały 4' in pg.inner_text('#pin-dane-blad'), 'zły PIN liczy próby')
    pg.fill('#pin-dane', PIN); pg.wait_for_selector('[data-a=kl-dodaj]', timeout=20000)
    ok('Ewa Kupiec' in pg.evaluate("[...document.querySelectorAll('#ed-tresc input')].map(i=>i.value).join(' ')"), 'po PIN-ie dane klienta widoczne')
    # przejście między ekranami z danymi tej oferty bez ponownego PIN-u
    pg.evaluate(f"location.hash='#/o/{oid}/wizyty'"); pg.wait_for_timeout(400)
    ok(not pg.locator('#pin-dane').count(), 'wizyty tej samej oferty bez ponownego PIN-u')
    pg.evaluate(f"location.hash='#/o/{oid}/klienci'"); pg.wait_for_selector('[data-a=rodo-wyslij]')
    # informacja RODO z danymi firmy
    pg.click('[data-a=rodo-wyslij][data-e=kl_kup00001]'); pg.wait_for_selector('.klauzula')
    kl = pg.inner_text('.klauzula'); print(kl[:600])
    ok('AM Nieruchomości s.c.' in kl and 'Marek Lewandowski' in kl and '[' not in kl, 'klauzula z danych firmy, bez miejsc do uzupełnienia')
    shot(pg, '03-klauzula')
    pg.click('.okno [data-jak="osobiście"]'); pg.wait_for_timeout(600)
    d = pg.evaluate(f"(async()=>{{const D=await import('./js/dane.js'); return D.oferta('{oid}').kl_kup00001}})()")
    ok(d.get('rodo') and d.get('rodoKiedy') and d.get('rodoJak') == 'osobiście', 'zaznaczone przekazanie informacji RODO')
    # karta AML z klienta
    pg.click('[data-a=am-z][data-e=kl_kup00001]'); pg.wait_for_selector('[data-a=am-dodaj]')
    ok(not pg.locator('#pin-dane').count(), 'karta AML otwarta bez ponownego PIN-u (ta sama oferta)')
    k = pg.evaluate(f"(async()=>{{const D=await import('./js/dane.js'); return Object.keys(D.oferta('{oid}')).find(x=>x.startsWith('am_'))}})()")
    ok(bool(k), 'karta AML założona z karty klienta')
    ok(pg.input_value(f'[data-e="{k}"][data-p="imie"]') == 'Ewa Kupiec', 'imię przepisane z karty klienta')
    braki0 = pg.inner_text('#ed-tresc')
    ok('brakuje' in braki0.lower(), 'karta pokazuje braki')
    def wpisz(p_, v):
        pg.fill(f'[data-e="{k}"][data-p="{p_}"]', v); pg.locator(f'[data-e="{k}"][data-p="{p_}"]').blur(); pg.wait_for_timeout(250)
    def wybierz(p_, v):
        pg.select_option(f'[data-e="{k}"][data-p="{p_}"]', v); pg.wait_for_timeout(250)
    wpisz('obywatelstwo', 'polskie'); wpisz('pesel', '85010112345'); wybierz('dokRodzaj', 'dowod'); wpisz('dokNr', 'ABC123456')
    wpisz('weryfData', '2027-03-01'); wybierz('weryfSposob', 'osobiscie')
    wybierz('pep', 'nie'); wpisz('pepData', '2027-03-01')
    wpisz('sankcjeData', '2027-03-01'); wybierz('sankcje', 'brak'); wybierz('ryzyko', 'standardowe')
    pg.wait_for_timeout(500)
    ok(pg.locator('.grupa.aml-ok').count() == 1, 'po uzupełnieniu karta kompletna')
    shot(pg, '04-karta-aml')
    pg.check(f'[data-e="{k}"][data-p="cz_gotowka"]'); pg.wait_for_timeout(400)
    ok('Wysokie' in pg.inner_text('#ed-tresc'), 'czynnik wyższego ryzyka = ryzyko wysokie')
    # eksport dla osoby bez oceny ryzyka
    pg.evaluate("(async()=>{const D=await import('./js/dane.js'); await D.synchronizuj()})()"); pg.wait_for_timeout(800)
    with pg.expect_download() as dl: pg.click(f'[data-a=kl-eksport][data-e="{k}"]')
    dane = json.loads(open(dl.value.path(), encoding='utf-8').read())['dane']
    ok(dane.get('pesel') == '85010112345' and 'cz_gotowka' not in dane, 'dane dla osoby: z PESEL-em, bez oceny ryzyka (art. 54)')
    # wyjście do spisu i powrót = PIN znowu
    pg.evaluate(f"location.hash='#/o/{oid}'"); pg.wait_for_selector('.spis')
    pg.evaluate(f"location.hash='#/o/{oid}/aml'"); pg.wait_for_selector('#pin-dane')
    ok(True, 'po wyjściu z danych osobowych — znowu PIN')
    pg.fill('#pin-dane', PIN); pg.wait_for_selector('[data-a=am-dodaj]', timeout=20000)
    # właściciel: PIN, RODO, karta AML właściciela
    pg.evaluate(f"location.hash='#/o/{oid}/s/wlasciciel'"); pg.wait_for_timeout(500)
    ok(not pg.locator('#pin-dane').count(), 'właściciel tej samej oferty bez ponownego PIN-u')
    pg.wait_for_selector('[data-a=am-z][data-e=wlasciciel]')
    shot(pg, '05-wlasciciel-rodo')
    pg.click('[data-a=am-z][data-e=wlasciciel]'); pg.wait_for_timeout(800)
    n = pg.evaluate(f"(async()=>{{const D=await import('./js/dane.js'); const o=D.oferta('{oid}'); return Object.keys(o).filter(x=>x.startsWith('am_')).map(x=>o[x]).filter(x=>x.wlasciciel&&x.rola==='sprzedajacy'&&x.umowa).length}})()")
    ok(n == 1, 'karta AML właściciela: rola sprzedający, z umową')
    # historia zmian przez PIN
    pg.evaluate(f"location.hash='#/o/{oid}'"); pg.wait_for_selector('.spis')
    pg.click('[data-a=menu]'); pg.click('[data-m=historia]'); pg.wait_for_selector('#pin-okno')
    pg.fill('#pin-okno', PIN); pg.click('.form-okna button[type=submit]'); pg.wait_for_selector('.hist', timeout=20000)
    ok('Karta AML' in pg.inner_text('.hist'), 'historia zmian po PIN-ie')
    pg.locator('.okno-tlo').first.click(position={'x': 5, 'y': 5})
    # ustawienia: archiwum, rejestr, urządzenia
    pg.evaluate("location.hash='#/ustawienia'"); pg.wait_for_selector('[data-a=aml-rejestr]')
    shot(pg, '06-ustawienia-aml')
    pg.click('[data-a=aml-rejestr]'); pg.wait_for_selector('#pin-okno'); pg.fill('#pin-okno', PIN)
    with pg.expect_download() as dl: pg.click('.form-okna button[type=submit]')
    csv = open(dl.value.path(), encoding='utf-8-sig').read()
    ok('85010112345' in csv and 'Ewa Kupiec' in csv and 'Jan Właściciel' in csv, 'rejestr AML (CSV) z kartami')
    pg.click('[data-a=aml-archiwum]'); pg.wait_for_selector('#pin-okno'); pg.fill('#pin-okno', PIN); pg.click('.form-okna button[type=submit]')
    pg.wait_for_selector('.okno .dziennik', timeout=20000)
    ok('Archiwum' in pg.inner_text('.okno'), 'archiwum AML po PIN-ie')
    pg.locator('.okno-tlo').first.click(position={'x': 5, 'y': 5}); pg.wait_for_timeout(200)
    pg.click('[data-a=urzadzenia]'); pg.wait_for_selector('.wiersz-dz.urz')
    ok('to urządzenie' in pg.inner_text('.okno'), 'lista urządzeń')
    shot(pg, '07-urzadzenia')
    pg.locator('.okno-tlo').first.click(position={'x': 5, 'y': 5}); pg.wait_for_timeout(200)
    pg.click('[data-a=dziennik]'); pg.wait_for_selector('.dziennik .wiersz-dz')
    dz = pg.inner_text('.dziennik')
    ok('otwarcie kart AML' in dz and 'otwarcie historii zmian' in dz and 'otwarcie archiwum AML' in dz, 'dziennik: AML, historia, archiwum')
    print('BLEDY', bl); ok(not bl, 'bez błędów strony')
    c.close(); br.close()
print(f'{sum(wyniki)}/{len(wyniki)} OK')
