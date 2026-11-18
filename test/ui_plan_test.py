# Edytor Rzut AM: skan → zaznaczanie, przesuwanie, obrót, rozmiar, dodawanie, ściany, granica, drzwi, okna, nazwy, podłoga,
# wyprostowanie, szczypanie, zapis do oferty i ponowne otwarcie. python3 test/ui_plan_test.py [chromium|webkit] [szer wys]
# Wymaga: python3 test/serwer_jak_github.py (8767) i serwera API na 18931 (AM_ORIGINS z http://127.0.0.1:8767).
from playwright.sync_api import sync_playwright
import sys, shutil, os, json, math
silnik = sys.argv[1] if len(sys.argv) > 1 else 'chromium'
W, H = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) > 3 else (430, 932)
TAG = f'{silnik}-{W}'
URL = 'http://127.0.0.1:8767/ogloszenia/?api=http://127.0.0.1:18931'
SKAN = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dane', 'skan-roomplan.json')
def ok(w, opis): print(('OK   ' if w else 'BŁĄD ') + opis); assert w, opis
with sync_playwright() as p:
    shutil.rmtree(f'/tmp/amshots/prof-pt-{TAG}', ignore_errors=True)
    opc = dict(viewport={'width': W, 'height': H}, device_scale_factor=2, has_touch=True, locale='pl-PL')
    c = p.webkit.launch_persistent_context(f'/tmp/amshots/prof-pt-{TAG}', **opc) if silnik == 'webkit' else p.chromium.launch_persistent_context(f'/tmp/amshots/prof-pt-{TAG}', executable_path='/usr/bin/google-chrome', args=['--no-sandbox'], **opc)
    pg = c.new_page(); bl = []
    pg.on('pageerror', lambda e: bl.append(f'pageerror {e}'))
    pg.on('console', lambda m: bl.append(f'console {m.text}') if m.type == 'error' and 'favicon' not in m.text else None)
    shot = lambda n: pg.screenshot(path=f'/tmp/amshots/pt-{TAG}-{n}.png')
    pg.goto(URL); pg.fill('#l-login', 'marek'); pg.fill('#l-haslo', 'tajne123'); pg.click('#f-log button'); pg.wait_for_selector('#karty')
    pg.locator('[data-a=nowa]:visible').first.click(); pg.wait_for_selector('#sek-podstawy')
    oid = pg.evaluate("location.hash.split('/')[2]")
    pg.fill('#f-roboczy', 'Test rzutu'); pg.locator('#f-roboczy').blur(); pg.wait_for_timeout(300)
    pg.evaluate(f"location.hash='#/o/{oid}/s/pom'"); pg.wait_for_selector('[data-a=rzut-otworz]')
    pg.click('[data-a=rzut-otworz]'); pg.wait_for_url('**/plan.html**'); pg.wait_for_timeout(1200)
    with pg.expect_file_chooser() as fc: pg.click('#pusto [data-a=skan]')
    fc.value.set_files(SKAN); pg.wait_for_timeout(1500)
    J = lambda js: pg.evaluate(js)
    stan = lambda: J("JSON.stringify(window.__plan.projekt)")
    ekr = lambda x, y: J(f"(()=>{{const S=window.__plan, r=document.querySelector('#plotno').getBoundingClientRect(); return [{x}*S.widok.s+S.widok.ox+r.left, {y}*S.widok.s+S.widok.oy+r.top]}})()")
    def fl(): return J("(()=>{const S=window.__plan; return S.projekt.floors.find(f=>f.id===S.projekt.activeFloorId)||S.projekt.floors[0]})()")
    def akcja(a):  # przycisk akcji: na telefonie w pasku nad rzutem, na tablecie i laptopie w panelu po prawej
        pg.locator(f'#pasek-akcji [data-a={a}]:visible, #arkusz [data-a={a}]:visible').first.click(); pg.wait_for_timeout(150)
    def mysz_przeciagnij(a, b, kroki=8):
        pg.mouse.move(*a); pg.mouse.down(); pg.mouse.move(*b, steps=kroki); pg.mouse.up(); pg.wait_for_timeout(250)
    ok(len(fl()['walls']) == 20, 'skan wczytany (20 ścian)')
    shot('01-skan')
    # 1) przeciągnięcie po niezaznaczonym meblu = tylko widok
    f0 = [f for f in fl()['furniture'] if f['catalogId'] == 'bed_queen'][0]
    przed = stan(); s0 = J("({...window.__plan.widok})")
    a = ekr(f0['position']['x'], f0['position']['y']); mysz_przeciagnij(a, (a[0] + 70, a[1] + 40))
    ok(stan() == przed, 'przeciągnięcie po niezaznaczonym łóżku nic nie zmienia w rzucie')
    ok(J("window.__plan.widok.ox") != s0['ox'], 'przeciągnięcie przesuwa widok')
    # 2) stuknięcie zaznacza
    a = ekr(f0['position']['x'], f0['position']['y']); pg.mouse.click(*a); pg.wait_for_timeout(200)
    ok(J("window.__plan.zazn?.rodzaj") == 'mebel', 'stuknięcie zaznacza mebel')
    ok('Obróć 90°' in (pg.inner_text('#pasek-akcji') if W < 900 else pg.inner_text('#arkusz')), 'akcje mebla widoczne (pasek / panel)')
    shot('02-zaznaczony')
    # 3) przesunięcie zaznaczonego
    przed = stan(); mysz_przeciagnij(a, (a[0] - 50, a[1] + 30))
    ok(stan() != przed, 'zaznaczony mebel daje się przesunąć'); ok(not pg.is_disabled('[data-a=cofnij]'), 'Cofnij aktywne')
    pg.click('[data-a=cofnij]'); pg.wait_for_timeout(200); ok(stan() == przed, 'Cofnij przywraca położenie')
    # 4) obrót uchwytem
    f1 = [f for f in fl()['furniture'] if f['id'] == J("window.__plan.zazn.id")][0]
    rot0 = f1['rotation']
    uch = J("""(()=>{const S=window.__plan, r=document.querySelector('#plotno').getBoundingClientRect(); const f=(S.projekt.floors.find(x=>x.id===S.projekt.activeFloorId)||S.projekt.floors[0]).furniture.find(q=>q.id===S.zazn.id);
      const a=(f.rotation||0)*Math.PI/180, d=f.depth, c=Math.cos(a), s=Math.sin(a), o=34/S.widok.s, lx=0, ly=-d/2-o; return [ (f.position.x+lx*c-ly*s)*S.widok.s+S.widok.ox+r.left, (f.position.y+lx*s+ly*c)*S.widok.s+S.widok.oy+r.top, f.position.x*S.widok.s+S.widok.ox+r.left, f.position.y*S.widok.s+S.widok.oy+r.top]})()""")
    mysz_przeciagnij((uch[0], uch[1]), (uch[2] + 120, uch[3] + 10))
    f1 = [f for f in fl()['furniture'] if f['id'] == J("window.__plan.zazn.id")][0]
    ok(f1['rotation'] != rot0, f'uchwyt obraca ({rot0:.1f}° → {f1["rotation"]:.1f}°)')
    pg.click('[data-a=cofnij]'); pg.wait_for_timeout(150)
    # 5) zmiana rozmiaru krawędzią
    w0 = [f for f in fl()['furniture'] if f['id'] == J("window.__plan.zazn.id")][0]['width']
    kr = J("""(()=>{const S=window.__plan, r=document.querySelector('#plotno').getBoundingClientRect(); const f=(S.projekt.floors.find(x=>x.id===S.projekt.activeFloorId)||S.projekt.floors[0]).furniture.find(q=>q.id===S.zazn.id);
      const a=(f.rotation||0)*Math.PI/180, c=Math.cos(a), s=Math.sin(a), lx=f.width/2; return [(f.position.x+lx*c)*S.widok.s+S.widok.ox+r.left, (f.position.y+lx*s)*S.widok.s+S.widok.oy+r.top, c, s]})()""")
    mysz_przeciagnij((kr[0], kr[1]), (kr[0] + kr[2] * 30, kr[1] + kr[3] * 30))
    w1 = [f for f in fl()['furniture'] if f['id'] == J("window.__plan.zazn.id")][0]['width']
    ok(abs(w1 - w0) > 5, f'krawędź zmienia szerokość ({w0:.0f} → {w1:.0f} cm)')
    # 6) do ściany, obrót 90°, odbij, duplikuj, usuń
    akcja('wyrownaj')
    akcja('obroc')
    n0 = len(fl()['furniture']); akcja('duplikuj'); ok(len(fl()['furniture']) == n0 + 1, 'Duplikuj dodaje kopię')
    akcja('usun'); ok(len(fl()['furniture']) == n0, 'Usuń usuwa zaznaczony')
    ok(J("window.__plan.zazn") is None, 'po usunięciu nic nie jest zaznaczone')
    # 7) dodaj z katalogu
    pg.click('.plan-dol [data-a=dodaj]'); pg.wait_for_selector('.katalog button'); pg.wait_for_timeout(300)
    shot('03-katalog')
    pg.click('.chipy.grupy [data-v="Gabinet"]'); pg.wait_for_timeout(200)
    pg.click('.katalog [data-v="biurko_samo"]'); pg.wait_for_timeout(300)
    ok(J("window.__plan.zazn?.rodzaj") == 'mebel' and len(fl()['furniture']) == n0 + 1, 'Dodaj → biurko wstawione i zaznaczone')
    shot('04-dodane')
    # 8) pomieszczenie: nazwa i podłoga
    pok = J("window.__plan.sc.pokoje.map(p=>({id:p.room.id,n:p.nazwa,x:p.poly.reduce((a,q)=>a+q.x,0)/p.poly.length,y:p.poly.reduce((a,q)=>a+q.y,0)/p.poly.length}))")
    laz = [q for q in pok if q['n'].startswith('Łazienka')][0]
    J("window.__plan.zazn=null; window.__planUI.dopasuj()"); pg.wait_for_timeout(100)
    a = ekr(laz['x'] + 5, laz['y'] - 40); pg.mouse.click(*a); pg.wait_for_timeout(200)
    z = J("window.__plan.zazn"); ok(z and z['rodzaj'] in ('pokoj', 'mebel'), f'stuknięcie w łazienkę zaznacza ({z and z["rodzaj"]})')
    J(f"window.__plan.zazn={{rodzaj:'pokoj',id:'{laz['id']}'}}; window.__plan.arkusz=null; window.__planUI.interfejs()"); pg.wait_for_timeout(150)
    if W < 900:
        ok('Nazwa' in pg.inner_text('#pasek-akcji'), 'pasek akcji pomieszczenia: Nazwa, Podłoga'); akcja('ustawienia')
    pg.click('#arkusz [data-a=nazwa-pok][data-v="WC"]'); pg.wait_for_timeout(200)
    ok(any(q['nazwa'] == 'WC' for q in J("window.__plan.sc.pokoje.map(p=>({nazwa:p.nazwa}))")), 'nazwa pomieszczenia z podpowiedzi')
    pg.click('#arkusz [data-a=podloga-arkusz]'); pg.wait_for_timeout(250); shot('05-podlogi')
    pg.click('#arkusz [data-a=podloga][data-v="heksagon"]'); pg.wait_for_timeout(200)
    ok(any(q == 'heksagon' for q in J("window.__plan.sc.pokoje.map(p=>p.podloga)")), 'podłoga zmieniona')
    pg.evaluate("document.querySelector('#arkusz [data-a=zamknij]')?.click()"); J("window.__plan.zazn=null")
    # 9) ściana i granica
    nW = len(fl()['walls']); J("window.__planUI.dopasuj()")
    pg.click('.plan-dol [data-n=granica]'); pg.wait_for_timeout(150)
    sp = [q for q in pok if q['n'].startswith('Sypialnia 1')][0]
    sciany = fl()['walls']
    # granica w poprzek Sypialni 1: od lewej do prawej ściany na wysokości środka
    pk = J(f"(()=>{{const p=window.__plan.sc.pokoje.find(q=>q.room.id==='{sp['id']}'); const xs=p.poly.map(q=>q.x); return [Math.min(...xs), Math.max(...xs)]}})()")
    nP = len(J("window.__plan.sc.pokoje"))
    pg.mouse.click(*ekr(pk[0], sp['y'])); pg.wait_for_timeout(150); print('   rys po 1:', J("JSON.stringify(window.__plan.rys)"), J("window.__plan.narzedzie"))
    pg.mouse.click(*ekr(pk[1], sp['y'])); pg.wait_for_timeout(300); print('   rys po 2:', J("JSON.stringify(window.__plan.rys)"), bl[:3])
    ok(any(w.get('granica') for w in fl()['walls']), 'granica narysowana'); ok(len(J("window.__plan.sc.pokoje")) == nP + 1, 'granica dzieli pomieszczenie na dwa')
    shot('06-granica')
    pg.click('.plan-dol [data-n=sciana]'); pg.wait_for_timeout(150)
    b = J("window.__plan.sc.granice"); y = b['y1'] + 80
    pg.mouse.click(*ekr(b['x0'], y)); pg.mouse.click(*ekr(b['x0'] + 300, y + 4)); pg.wait_for_timeout(200)
    pg.click('#pasek-akcji [data-a=gotowe]'); pg.wait_for_timeout(150)
    nw = fl()['walls'][-1]; ok(abs(nw['start']['y'] - nw['end']['y']) < 0.01, 'nowa ściana prosta (kąt prosty przyciągnięty)')
    # 10) drzwi i okno w nowej ścianie
    pg.click('.plan-dol [data-n=drzwi]'); pg.wait_for_timeout(100)
    nD = len(fl()['doors']); pg.mouse.click(*ekr(b['x0'] + 150, y)); pg.wait_for_timeout(250)
    ok(len(fl()['doors']) == nD + 1 and J("window.__plan.zazn?.rodzaj") == 'drzwi', 'drzwi wstawione stuknięciem w ścianę')
    akcja('kierunek'); akcja('strona')
    pg.click('.plan-dol [data-n=okno]'); pg.wait_for_timeout(100)
    nO = len(fl()['windows']); pg.mouse.click(*ekr(b['x0'] + 260, y)); pg.wait_for_timeout(250)
    ok(len(fl()['windows']) == nO + 1, 'okno wstawione')
    shot('07-drzwi-okno')
    # 11) szczypanie dwoma palcami — tylko powiększenie
    przed = stan(); s0 = J("window.__plan.widok.s")
    J("""(()=>{const c=document.querySelector('#plotno'), r=c.getBoundingClientRect(), x=r.left+r.width/2, y=r.top+r.height/2;
      const ev=(t,id,px,py)=>c.dispatchEvent(new PointerEvent(t,{pointerId:id,pointerType:'touch',isPrimary:id===11,clientX:px,clientY:py,bubbles:true,cancelable:true}));
      ev('pointerdown',11,x-40,y); ev('pointerdown',12,x+40,y); for(let i=1;i<=10;i++){ev('pointermove',11,x-40-i*8,y);ev('pointermove',12,x+40+i*8,y);} ev('pointerup',11,x-120,y); ev('pointerup',12,x+120,y);})()""")
    pg.wait_for_timeout(200)
    ok(J("window.__plan.widok.s") > s0 * 1.5 and stan() == przed, 'szczypanie powiększa i nic nie zmienia')
    # 12) wyprostuj
    pg.click('.plan-dol [data-a=wiecej]'); pg.wait_for_timeout(150); pg.click('#arkusz [data-a=wyprostuj]'); pg.wait_for_timeout(400)
    krzywe = J("(()=>{const S=window.__plan, f=S.projekt.floors.find(x=>x.id===S.projekt.activeFloorId)||S.projekt.floors[0]; return f.walls.filter(w=>{const a=Math.atan2(w.end.y-w.start.y,w.end.x-w.start.x)*180/Math.PI; const r=((a%90)+90)%90; return Math.min(r,90-r)>0.6}).length})()")
    if krzywe: print('   krzywe:', J("(()=>{const S=window.__plan, f=S.projekt.floors.find(x=>x.id===S.projekt.activeFloorId)||S.projekt.floors[0]; return JSON.stringify(f.walls.filter(w=>{const a=Math.atan2(w.end.y-w.start.y,w.end.x-w.start.x)*180/Math.PI; const r=((a%90)+90)%90; return Math.min(r,90-r)>0.6}).map(w=>[w.start,w.end,w.granica]))})()"))
    ok(krzywe == 0, f'wyprostowane: krzywych ścian {krzywe}')
    shot('08-wyprostowany')
    # 13) zapis do oferty
    pg.click('[data-a=zapisz]'); pg.wait_for_url('**/ogloszenia/#/o/**', timeout=30000); pg.wait_for_selector('.okno', timeout=20000); pg.wait_for_timeout(400)
    shot('09-okno-oferty'); tx = pg.inner_text('.okno-tresc'); print('   okno:', tx.replace('\n', ' | ')[:200])
    ok('WC' in tx, 'pomieszczenia z rzutu przekazane do karty')
    pg.click('.okno [data-t]'); pg.wait_for_timeout(1500)
    pg.wait_for_function("!document.querySelector('.stan-sync')", timeout=30000); pg.wait_for_timeout(800)
    o = J(f"(async()=>{{const D=await import('./js/dane.js'); return D.oferta('{oid}')}})()")
    ok(o.get('rzutPlan') and any(z.get('pom') == 'rzut' for z in o['zdj']), 'rzut zapisany w ofercie (plan + obraz)')
    # 14) ponowne otwarcie: plan z serwera, nazwy zachowane
    pg.evaluate(f"location.hash='#/o/{oid}/zdjecia'"); pg.wait_for_selector('[data-a=rzut-otworz]'); pg.click('[data-a=rzut-otworz]')
    pg.wait_for_url('**/plan.html**'); pg.wait_for_timeout(1500)
    ok(any(q == 'WC' for q in J("window.__plan.sc ? window.__plan.sc.pokoje.map(p=>p.nazwa) : []")), 'po ponownym otwarciu nazwy pomieszczeń są')
    ok(any(w.get('granica') for w in fl()['walls']), 'granica zapisana w planie')
    shot('10-ponownie')
    print('BLEDY', bl[:8]); assert not bl
