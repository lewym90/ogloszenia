# „Obróbka AM” (1.16.0): własny model w telefonie — kafelek, podgląd od razu, suwaki Siła/Jasność/Kolory, „przed”, zapis
# (oryginał zostaje, pełna rozdzielczość), wyrównanie po AM, usunięcie AM, „Obróbka AM — wszystkie” dla całej oferty.
# python3 test/ui_am_test.py [chromium|webkit] [szer wys]; serwery jak test/ui_test.py
import sys, os
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
shot = lambda pg, n: pg.screenshot(path=f'{OUT}/am-{TAG}-{n}.png')
D = "(async()=>{const D=await import('./js/dane.js'); %s})()"

# ciemne „wieczorne” zdjęcie pokoju 4800×3600: szara ściana, drewno, granatowa ściana, biały napis na tabliczce
def pokoj(sciezka, w=4800, h=3600, jas=0.45):
    im = Image.new('RGB', (w, h), (140, 142, 148)); d = ImageDraw.Draw(im)
    for x in range(0, int(w * 0.18), 60): d.rectangle([x, 0, x + 40, h], fill=(115, 90, 66))
    d.rectangle([int(w * .82), 0, w, h], fill=(30, 38, 70))
    d.rectangle([int(w * .35), int(h * .2), int(w * .6), int(h * .45)], fill=(232, 232, 232))
    for i in range(30): d.rectangle([int(w * .37) + i * 70, int(h * .25), int(w * .37) + i * 70 + 25, int(h * .3)], fill=(20, 20, 20))
    d.rectangle([0, int(h * .7), w, h], fill=(172, 170, 167))
    im = im.point(lambda v: v * jas)
    im.save(sciezka, quality=93); return im
pokoj('/tmp/am-org.jpg'); pokoj('/tmp/am-org2.jpg', 3000, 4000, 0.55)

with sync_playwright() as p:
    br = p.webkit.launch() if silnik == 'webkit' else p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    c = br.new_context(viewport={'width': W, 'height': H}, device_scale_factor=2 if W < 800 else 1, has_touch=W < 1000, locale='pl-PL')
    pg = c.new_page(); bl = []
    pg.on('pageerror', lambda e: bl.append(str(e)))
    zaloguj(pg, URL)
    pg.click('#dol [data-a=nowa]') if pg.locator('#dol [data-a=nowa]').is_visible() else pg.click('[data-a=nowa]')
    pg.wait_for_selector('#sek-podstawy')
    oid = pg.evaluate("location.hash.split('/')[2]")
    pg.evaluate(D % f"await D.zmien('{oid}', {{roboczy:'AM test', transakcja:'najem', rodzaj:'mieszkanie', miasto:'Lublin'}})")
    pg.evaluate(f"location.hash = '#/o/{oid}/zdjecia'"); pg.wait_for_selector('#dodaj-zdj', state='attached')
    pg.set_input_files('#dodaj-zdj', ['/tmp/am-org.jpg']); pg.wait_for_selector('.zdj', timeout=60000)
    z0 = pg.evaluate(D % f"return D.oferta('{oid}').zdj[0]")

    ok(pg.locator('.zdj [data-a=zdj-am]').count() == 1 and pg.locator('.zdj [data-a=zdj-wyrownaj]').count() == 1 and pg.locator('.zdj .kafel-zdj').count() == 2, 'dwa kafelki: „Wyrównaj” i „Obróbka AM”')
    ok(pg.evaluate("[...document.querySelectorAll('.zdj-kafle *')].every(e => e.getBoundingClientRect().right <= e.closest('.zdj').getBoundingClientRect().right + 1)"), 'kafelki mieszczą się na karcie')
    ok(pg.evaluate("[...document.querySelectorAll('.zdj-licznik *')].every(e => e.getBoundingClientRect().right <= innerWidth + 1)"), 'pasek z „Obróbka AM — wszystkie” mieści się w szerokości')
    shot(pg, '01-kafle')
    pg.click('.zdj [data-a=zdj-am]'); pg.wait_for_selector('.okno-ai')
    pg.wait_for_selector('[data-ai=zapisz]:not([disabled])', timeout=120000)
    ok(pg.evaluate("[...document.querySelectorAll('.okno-ai .okno *')].every(e => e.getBoundingClientRect().right <= innerWidth + 1)"), 'okno mieści się w szerokości ekranu')
    jas = "(()=>{const c=document.querySelector('.ai-obraz canvas'),g=c.getContext('2d'),d=g.getImageData(0,0,c.width,c.height).data;let s=0;for(let i=0;i<d.length;i+=40)s+=d[i]+d[i+1]+d[i+2];return s/(d.length/40)/3})()"
    po = pg.evaluate(jas)
    pg.locator('[data-ai=przed]').scroll_into_view_if_needed(); pb = pg.locator('[data-ai=przed]').bounding_box()
    pg.mouse.move(pb['x'] + 10, pb['y'] + 10); pg.mouse.down(); pg.wait_for_timeout(150)
    przed = pg.evaluate(jas); pg.mouse.up(); pg.wait_for_timeout(150)
    ok(po > przed + 15, f'od razu podgląd, jaśniejszy niż ciemny oryginał ({przed:.0f} → {po:.0f}); „Przytrzymaj: przed” działa')
    ust = lambda k, v: pg.evaluate(f"(()=>{{const i=document.querySelector('[data-ai-s={k}]'); i.value={v}; i.dispatchEvent(new Event('input',{{bubbles:true}}));}})()")
    ust('jasnosc', 0.8); pg.wait_for_timeout(2500); jasniej = pg.evaluate(jas)
    ok(jasniej > po + 3 and 'jaśniej' in pg.inner_text('[data-ai-w=jasnosc]'), f'suwak „Jasność” rozjaśnia ({po:.0f} → {jasniej:.0f})')
    ust('jasnosc', 0); ust('sila', 0); pg.wait_for_timeout(2500); zero = pg.evaluate(jas)
    ok(abs(zero - przed) < 2, f'„Siła” 0% = oryginał ({zero:.0f} vs {przed:.0f})')
    ust('sila', 1); pg.wait_for_timeout(2500)
    shot(pg, '02-podglad')
    pg.click('[data-ai=zapisz]')
    pg.wait_for_selector('.okno-ai', state='detached', timeout=180000); pg.wait_for_timeout(500)
    z1 = pg.evaluate(D % f"return D.oferta('{oid}').zdj[0]")
    ok(z1.get('kor', {}).get('ai') and z1['kor'].get('zrodlo') == 'am' and z1['kor']['org'] == z0['id'], 'zapisane: oryginał zostaje, wersja AM zapamiętana (kor.org, kor.ai, zrodlo=am)')
    ok(max(z1['w'], z1['h']) == 4096, f'wynik w pełnej rozdzielczości {z1["w"]}×{z1["h"]}')
    ok(pg.locator('.zdj [data-a=zdj-am].akt').count() == 1, 'oznaczony kafelek „Obróbka AM”')
    # napis na tabliczce zostaje: czarne paski nadal ciemne, biel jasna (kontrast nie zniknął)
    kon = pg.evaluate(D % f"""const b=await D.blobZdjecia('{z1["id"]}');const bm=await createImageBitmap(b);const c=document.createElement('canvas');c.width=bm.width;c.height=bm.height;const g=c.getContext('2d');g.drawImage(bm,0,0);
      const sr=(x0,y0,x1,y1)=>{{const d=g.getImageData(Math.round(x0*c.width),Math.round(y0*c.height),Math.max(1,Math.round((x1-x0)*c.width)),Math.max(1,Math.round((y1-y0)*c.height))).data;let s=0;for(let i=0;i<d.length;i+=4)s+=d[i]+d[i+1]+d[i+2];return s/(d.length/4)/3}};
      return [sr(.371,.26,.375,.29), sr(.40,.36,.55,.42), sr(.86,.3,.98,.6)]""")
    ok(kon[1] - kon[0] > 120, f'„napis” zostaje wyraźny (pasek {kon[0]:.0f}, biel {kon[1]:.0f})')
    ok(kon[2] < 80, f'granatowa ściana zostaje ciemna ({kon[2]:.0f})')
    # wyrównanie zostaje przy ponownej obróbce AM (geometria liczona od wersji AM)
    pg.evaluate(D % f"""const o=D.oferta('{oid}');await D.zmien('{oid}',{{zdj:o.zdj.map(z=>({{...z,kor:{{...z.kor,par:{{obrot:1.5}}}}}}))}})""")
    pg.click('.zdj [data-a=zdj-am]'); pg.wait_for_selector('[data-ai=zapisz]:not([disabled])', timeout=120000)
    pg.click('[data-ai=zapisz]'); pg.wait_for_selector('.okno-ai', state='detached', timeout=180000); pg.wait_for_timeout(500)
    z2 = pg.evaluate(D % f"return D.oferta('{oid}').zdj[0]")
    ok(z2['kor'].get('zrodlo') == 'am' and z2['kor'].get('par', {}).get('obrot') == 1.5 and z2['id'] != z2['kor']['ai'], 'AM ponownie: wyrównanie zostaje, wersja AM pod spodem')
    # usunięcie AM
    pg.click('.zdj [data-a=zdj-am]'); pg.wait_for_selector('[data-ai=usun]')
    pg.click('[data-ai=usun]'); pg.wait_for_timeout(500); pg.wait_for_selector('.zdj [data-a=zdj-am]:not([disabled])', timeout=60000); pg.wait_for_timeout(500)
    z3 = pg.evaluate(D % f"return D.oferta('{oid}').zdj[0]")
    ok(not (z3.get('kor') or {}).get('ai') and not (z3.get('kor') or {}).get('zrodlo'), '„Usuń obróbkę AM” — wersja AM zdjęta')
    # wszystkie naraz
    pg.set_input_files('#dodaj-zdj', ['/tmp/am-org2.jpg']); pg.wait_for_function("document.querySelectorAll('.zdj').length==2", timeout=60000)
    pg.click('[data-a=zdj-am-wszystkie]'); pg.wait_for_selector('.okno [data-a]:has-text("Obrób"), .okno button:has-text("Obrób")', timeout=10000)
    pg.click('.okno button:has-text("Obrób")')
    pg.wait_for_function("(()=>{const b=document.querySelector('[data-a=zdj-am-wszystkie]');return b&&!b.disabled})()", timeout=300000); pg.wait_for_timeout(800)
    zz = pg.evaluate(D % f"return D.oferta('{oid}').zdj")
    ok(all((z.get('kor') or {}).get('zrodlo') == 'am' for z in zz), f'„Obróbka AM — wszystkie”: obrobione {sum((z.get("kor") or {}).get("zrodlo") == "am" for z in zz)}/{len(zz)}')
    shot(pg, '03-po')
    ok(not bl, f'bez błędów strony {bl[:2]}')
    br.close()
print(f'{sum(wyniki)}/{len(wyniki)} OK')
