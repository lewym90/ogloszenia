# Granica pomieszczeń (przerywana linia bez ściany) dzieli otwartą przestrzeń na dwa pomieszczenia; brak konfliktu przy ponownym otwarciu.
# python3 test/ui_granica_test.py [chromium|webkit]; wymaga serwerów jak test/ui_rzut_test.py
from playwright.sync_api import sync_playwright
from pomoc import zaloguj, odblokuj, wpisz_pin
import sys, shutil, json, glob, os
silnik = sys.argv[1] if len(sys.argv) > 1 else 'chromium'
URL = 'http://127.0.0.1:8767/ogloszenia/?api=http://127.0.0.1:18931'
import subprocess
# pliki na serwerze są zaszyfrowane (AME1|iv|tag|treść) — odszyfrowujemy kluczem testowym
_odszyfruj = """const c=require('crypto'),fs=require('fs');const k=Buffer.from(fs.readFileSync('/tmp/amdane/klucz-testowy','utf8').trim(),'base64');const b=fs.readFileSync(process.argv[1]);
if(b.subarray(0,4).toString()!=='AME1'){process.stdout.write(b);process.exit()}const d=c.createDecipheriv('aes-256-gcm',k,b.subarray(4,16));d.setAuthTag(b.subarray(16,32));process.stdout.write(Buffer.concat([d.update(b.subarray(32)),d.final()]))"""
def _czytaj(p): return subprocess.run(['node', '-e', _odszyfruj, p], capture_output=True, check=True).stdout.decode('utf-8')
_wzory = []
for p in sorted(glob.glob('/tmp/amdane/pliki/*.json'), key=os.path.getmtime, reverse=True):
    try:
        j = json.loads(_czytaj(p))
        if j.get('floors'): _wzory.append(j); break
    except Exception: pass
wzor = _wzory[0]
fl = wzor['floors'][0]; wzor['floors'] = [fl]; wzor['activeFloorId'] = fl['id']  # jedno piętro, niezależnie od tego, który test zostawił ostatni plik
def sc(i, a, b, gr=False):
    w = {'id': f'w{i}', 'start': {'x': a[0], 'y': a[1]}, 'end': {'x': b[0], 'y': b[1]}, 'thickness': 1 if gr else 15, 'height': 260, 'color': '#444444'}
    if gr: w['granica'] = True
    return w
# 600 × 400 cm, granica na x = 200: przedpokój 2 × 4 m i salon 4 × 4 m
fl.update(walls=[sc(1,(0,0),(600,0)), sc(2,(600,0),(600,400)), sc(3,(600,400),(0,400)), sc(4,(0,400),(0,0)), sc(5,(200,0),(200,400),True)],
          rooms=[], doors=[], windows=[], furniture=[], stairs=[], columns=[], measurements=[], annotations=[], textAnnotations=[], groups=[])
wzor.pop('interchange', None)
with sync_playwright() as p:
    shutil.rmtree(f'/tmp/amshots/prof-g-{silnik}', ignore_errors=True)
    opc = dict(viewport={'width': 430, 'height': 932}, device_scale_factor=2, has_touch=True, locale='pl-PL')
    c = p.webkit.launch_persistent_context(f'/tmp/amshots/prof-g-{silnik}', **opc) if silnik=='webkit' else p.chromium.launch_persistent_context(f'/tmp/amshots/prof-g-{silnik}', executable_path='/usr/bin/google-chrome', args=['--no-sandbox'], is_mobile=True, **opc)
    pg = c.new_page(); bl=[]
    pg.on('pageerror', lambda e: bl.append(f'pageerror {e}'))
    zaloguj(pg, URL)
    pg.click('#dol [data-a=nowa]'); pg.wait_for_selector('#sek-podstawy')
    oid = pg.evaluate("location.hash.split('/')[2]")
    pg.evaluate("(async([oid, plan])=>{const R=await import('./js/rzut.js'); await R.wloz('wejscie:'+oid, {plan, nazwa:'Granica test'});})", [oid, json.dumps(wzor)])
    pg.goto(f'http://127.0.0.1:8767/ogloszenia/rzut/editor?am={oid}'); pg.wait_for_selector('.am-most', timeout=30000); pg.wait_for_timeout(2500)
    tx = pg.evaluate("document.body.innerText"); pom = tx[tx.find('Pomieszczenia:'):][:40].split('\n')[0]; print('pasek:', pom)
    assert 'Pomieszczenia: 2' in pom, pom
    assert 'Pobierz kopię JSON' not in tx, 'konflikt przy otwarciu'
    pg.screenshot(path=f'/tmp/amshots/g-{silnik}-1-edytor.png')
    pg.click('.am-zapisz'); pg.wait_for_url('**/plan.html**', timeout=30000); pg.wait_for_timeout(1500)
    n = pg.evaluate("window.__plan.sc.pokoje.length"); print('Rzut AM pomieszczeń:', n); assert n == 2
    pg.screenshot(path=f'/tmp/amshots/g-{silnik}-2-rzutam.png')
    pg.click('[data-a=zapisz]'); pg.click('.okno-tlo [data-w=oba]'); pg.wait_for_url('**/ogloszenia/#/o/**', timeout=30000); pg.wait_for_selector('.okno', timeout=20000); pg.wait_for_timeout(500)
    t = pg.inner_text('.okno-tresc'); print('okno:', t[:200].replace(chr(10), ' | '))
    assert 'nie mają nazw' in t, t
    print('BLEDY', bl[:6]); assert not bl
