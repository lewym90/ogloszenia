# Wspólne kroki testów UI: logowanie z PIN-em (od 1.10.0 dane w telefonie są zaszyfrowane PIN-em).
PIN = '482913'

def wpisz_pin(pg, pin=PIN, czekaj='#karty'):
    """Ekran PIN-u: ustawienie (dwa pola) albo otwarcie (jedno pole, samo się wysyła po 6 cyfrach)."""
    pg.wait_for_selector('#f-pin')
    if pg.locator('#pin2').count():
        pg.fill('#pin', pin); pg.fill('#pin2', pin); pg.click('#f-pin button[type=submit]')
    else:
        pg.fill('#pin', pin)
    if czekaj: pg.wait_for_selector(czekaj, timeout=30000)

def zaloguj(pg, url, login='marek', haslo='tajne123', pin=PIN):
    pg.goto(url)
    pg.fill('#l-login', login); pg.fill('#l-haslo', haslo); pg.click('#f-log button')
    wpisz_pin(pg, pin)

def odblokuj(pg, pin=PIN, czekaj='#karty'):
    """Po przeładowaniu w nowej karcie (albo po 10 min) aplikacja pyta o PIN."""
    pg.wait_for_selector('#f-pin, #karty', timeout=30000)
    if pg.locator('#f-pin').count(): wpisz_pin(pg, pin, czekaj)

def pin_danych(pg, pin=PIN):
    """Od 1.11.0 każde otwarcie danych osobowych (klienci, właściciel, wizyty, dokumenty, AML) pyta o PIN."""
    pg.wait_for_timeout(200)
    if pg.locator('#pin-dane').count():
        pg.fill('#pin-dane', pin); pg.wait_for_function("!document.querySelector('#pin-dane')", timeout=20000); pg.wait_for_timeout(150)

def pin_okna(pg, pin=PIN):
    """Historia zmian, archiwum i rejestr AML pytają o PIN w okienku."""
    pg.wait_for_selector('#pin-okno'); pg.fill('#pin-okno', pin); pg.click('.form-okna button[type=submit]')
