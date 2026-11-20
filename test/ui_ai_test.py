# „Obróbka AI” (1.15.0): kafelek, polecenie, wgranie wyniku z AI, podgląd i suwaki, zapis (oryginał + hybryda zostają), wyrównanie po AI, usunięcie AI; pełna rozdzielczość przy dodawaniu.
# python3 test/ui_ai_test.py [chromium|webkit] [szer wys]; serwery jak test/ui_test.py
import sys, os
from PIL import Image, ImageDraw, ImageEnhance
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
shot = lambda pg, n: pg.screenshot(path=f'{OUT}/ai-{TAG}-{n}.png')
D = "(async()=>{const D=await import('./js/dane.js'); %s})()"

# „zdjęcie z telefonu” 4800×3600 (większe niż 4096) i „wynik z AI”: mniejszy, jaśniejszy, cieplejszy, drewno pomarańczowe
def pokoj(sciezka, w=4800, h=3600):
    im = Image.new('RGB', (w, h), (140, 142, 148)); d = ImageDraw.Draw(im)
    for x in range(0, int(w * 0.18), 60): d.rectangle([x, 0, x + 40, h], fill=(115, 90, 66))
    d.rectangle([int(w * .82), 0, w, h], fill=(30, 38, 70))
    d.rectangle([int(w * .35), int(h * .2), int(w * .6), int(h * .45)], fill=(232, 232, 232))
    for i in range(30): d.rectangle([int(w * .37) + i * 70, int(h * .25), int(w * .37) + i * 70 + 25, int(h * .3)], fill=(20, 20, 20))
    d.rectangle([0, int(h * .7), w, h], fill=(172, 170, 167))
    for i in range(12): d.line([(i * 420, int(h * .7)), (i * 420 + 900, h)], fill=(120, 104, 86), width=14)
    im.save(sciezka, quality=93); return im
org = pokoj('/tmp/ai-org.jpg')
ai = org.resize((1448, 1086), Image.LANCZOS)
ai = ImageEnhance.Brightness(ai).enhance(1.35); r, g, b = ai.split(); ai = Image.merge('RGB', (r.point(lambda v: min(255, v * 1.08)), g, b.point(lambda v: v * 0.9)))
ImageDraw.Draw(ai).rectangle([900, 50, 980, 700], fill=(255, 255, 255))  # zmyślony promień słońca
ai.save('/tmp/ai-wynik.jpg', quality=90)

with sync_playwright() as p:
    br = p.webkit.launch() if silnik == 'webkit' else p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    c = br.new_context(viewport={'width': W, 'height': H}, device_scale_factor=2 if W < 800 else 1, has_touch=W < 1000, locale='pl-PL')
    c.grant_permissions(['clipboard-read', 'clipboard-write']) if silnik == 'chromium' else None
    pg = c.new_page(); bl = []
    pg.on('pageerror', lambda e: bl.append(str(e)))
    zaloguj(pg, URL)
    pg.click('#dol [data-a=nowa]') if pg.locator('#dol [data-a=nowa]').is_visible() else pg.click('[data-a=nowa]')
    pg.wait_for_selector('#sek-podstawy')
    oid = pg.evaluate("location.hash.split('/')[2]")
    pg.evaluate(D % f"await D.zmien('{oid}', {{roboczy:'AI test', transakcja:'najem', rodzaj:'mieszkanie', miasto:'Lublin'}})")
    pg.evaluate(f"location.hash = '#/o/{oid}/zdjecia'"); pg.wait_for_selector('#dodaj-zdj', state='attached')
    pg.set_input_files('#dodaj-zdj', ['/tmp/ai-org.jpg']); pg.wait_for_selector('.zdj', timeout=60000)
    z0 = pg.evaluate(D % f"return D.oferta('{oid}').zdj[0]")
    ok(max(z0['w'], z0['h']) == 4096, f'pełna rozdzielczość przy dodawaniu: {z0["w"]}×{z0["h"]} (było 2560)')

    ok(pg.locator('.zdj [data-a=zdj-ai]').count() == 1, 'trzeci kafelek „Obróbka AI”')
    ok(pg.evaluate("[...document.querySelectorAll('.zdj-kafle *')].every(e => e.getBoundingClientRect().right <= e.closest('.zdj').getBoundingClientRect().right + 1)"), 'kafelki mieszczą się na karcie')
    shot(pg, '01-kafle')
    pg.click('.zdj [data-a=zdj-ai]'); pg.wait_for_selector('.okno-ai')
    ok(pg.locator('[data-ai=kopiuj]').count() == 1 and pg.locator('[data-ai=udostepnij]').count() == 1, 'krok 1: kopiuj polecenie i udostępnij zdjęcie')
    ok(not pg.locator('.ai-wynik').is_visible(), 'przed wgraniem wyniku nie widać podglądu ani suwaków')
    if silnik == 'chromium':
        pg.click('[data-ai=kopiuj]'); pg.wait_for_timeout(200)
        sch = pg.evaluate('navigator.clipboard.readText()')
        ok('Do not change any text' in sch and 'same framing' in sch, 'polecenie w schowku (z zakazami zmian)')
    ok(pg.evaluate("[...document.querySelectorAll('.okno-ai .okno *')].every(e => e.getBoundingClientRect().right <= innerWidth + 1)"), 'okno mieści się w szerokości ekranu')
    shot(pg, '02-okno')
    pg.set_input_files('[data-ai=plik]', ['/tmp/ai-wynik.jpg'])
    pg.wait_for_selector('[data-ai=zapisz]:not([disabled])', timeout=90000)
    info = pg.inner_text('.ai-info')
    ok('Dopasowanie' in info, f'dopasowanie policzone: „{info}”')
    jas = "(()=>{const c=document.querySelector('.ai-obraz canvas'),g=c.getContext('2d'),d=g.getImageData(0,0,c.width,c.height).data;let s=0;for(let i=0;i<d.length;i+=40)s+=d[i]+d[i+1]+d[i+2];return s/(d.length/40)/3})()"
    po = pg.evaluate(jas)
    pb = pg.locator('[data-ai=przed]').bounding_box()
    pg.locator('[data-ai=przed]').scroll_into_view_if_needed(); pb = pg.locator('[data-ai=przed]').bounding_box()
    pg.mouse.move(pb['x'] + 10, pb['y'] + 10); pg.mouse.down(); pg.wait_for_timeout(150)
    przed = pg.evaluate(jas); pg.mouse.up(); pg.wait_for_timeout(150)
    ok(po > przed + 12, f'podgląd jaśniejszy niż oryginał ({przed:.0f} → {po:.0f}); „Przytrzymaj: przed” działa')
    pg.evaluate("(()=>{const i=document.querySelector('[data-ai-s=sila]'); i.value=0; i.dispatchEvent(new Event('input',{bubbles:true}));})()"); pg.wait_for_timeout(1500)
    zero = pg.evaluate(jas)
    ok(abs(zero - przed) < 2, f'suwak „Siła” 0% = oryginał ({zero:.0f})')
    pg.evaluate("(()=>{const i=document.querySelector('[data-ai-s=sila]'); i.value=1; i.dispatchEvent(new Event('input',{bubbles:true}));})()"); pg.wait_for_timeout(1500)
    shot(pg, '03-podglad')
    pg.click('[data-ai=zapisz]')
    pg.wait_for_selector('.okno-ai', state='detached', timeout=120000)
    pg.wait_for_timeout(500)
    z1 = pg.evaluate(D % f"return D.oferta('{oid}').zdj[0]")
    ok(z1.get('kor', {}).get('ai') and z1['kor']['org'] == z0['id'], 'zapisane: oryginał i hybryda zapamiętane (kor.org, kor.ai)')
    ok(max(z1['w'], z1['h']) == 4096, f'hybryda w pełnej rozdzielczości {z1["w"]}×{z1["h"]}')
    ok(pg.locator('.zdj [data-a=zdj-ai].akt').count() == 1, 'kafelek „Obróbka AI” oznaczony')
    # pas „słońca” z AI nie przeszedł na zdjęcie
    pas = pg.evaluate(D % f"""const b=await D.blobZdjecia('{z1["id"]}');const bm=await createImageBitmap(b);const c=document.createElement('canvas');c.width=bm.width;c.height=bm.height;const g=c.getContext('2d');g.drawImage(bm,0,0);
      const sr=(x0,x1)=>{{const d=g.getImageData(Math.round(x0*c.width),Math.round(.1*c.height),Math.round((x1-x0)*c.width),Math.round(.05*c.height)).data;let s=0;for(let i=0;i<d.length;i+=4)s+=d[i]+d[i+1]+d[i+2];return s/(d.length/4)/3}};
      return [sr(.63,.66), sr(.70,.74)]""")
    ok(abs(pas[0] - pas[1]) < 10, f'zmyślony przez AI promień nie przeszedł na zdjęcie ({pas[0]:.0f} vs {pas[1]:.0f})')
    # wyrównanie po AI liczy się od hybrydy, hybryda zostaje
    pg.evaluate(D % f"""const o=D.oferta('{oid}');await D.zmien('{oid}',{{zdj:o.zdj.map(z=>({{...z,kor:{{...z.kor,par:{{obrot:1.5}}}}}}))}})""")
    pg.click('.zdj [data-a=zdj-obrobka]'); pg.wait_for_selector('.ob-wersja[data-w=naturalna]:not([disabled])', timeout=60000)
    pg.click('.ob-wersja[data-w=naturalna]'); pg.wait_for_timeout(500); pg.wait_for_selector('.zdj [data-a=zdj-obrobka]:not([disabled])', timeout=60000); pg.wait_for_timeout(500)
    z2 = pg.evaluate(D % f"return D.oferta('{oid}').zdj[0]")
    ok(z2['kor'].get('ai') == z1['kor']['ai'] and z2['id'] != z1['id'], '„Obróbka” po AI: nowa wersja liczona od hybrydy, hybryda zostaje')
    # usunięcie obróbki AI
    pg.click('.zdj [data-a=zdj-ai]'); pg.wait_for_selector('[data-ai=usun]')
    pg.click('[data-ai=usun]'); pg.wait_for_timeout(500); pg.wait_for_selector('.zdj [data-a=zdj-ai]:not([disabled])', timeout=60000); pg.wait_for_timeout(500)
    z3 = pg.evaluate(D % f"return D.oferta('{oid}').zdj[0]")
    ok(not (z3.get('kor') or {}).get('ai'), '„Usuń obróbkę AI” — hybryda zdjęta')
    shot(pg, '04-po')
    ok(not bl, f'bez błędów strony {bl[:2]}')
    br.close()
print(f'{sum(wyniki)}/{len(wyniki)} OK')
