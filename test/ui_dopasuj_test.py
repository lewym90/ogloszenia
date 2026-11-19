# Dopasowanie rzutu do pomiarów z karty + poprawione wymiary ścian (w świetle, przesunięcie równoległe, grubość na zewnątrz).
# python3 test/ui_dopasuj_test.py [chromium|webkit] [szer wys]; serwery jak test/ui_plan_test.py
from playwright.sync_api import sync_playwright
import sys, shutil, json, math
silnik = sys.argv[1] if len(sys.argv) > 1 else 'chromium'
W, H = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) > 3 else (430, 932)
URL = 'http://127.0.0.1:8767/ogloszenia/?api=http://127.0.0.1:18931'
TAG = f'{silnik}-{W}'
BUDUJ = r"""
async (oid) => {
  const G = await import('./js/plan/geom.js'); const R = await import('./js/rzut.js');
  const p = G.createDefaultProject('Dopasowanie'); const f = p.floors[0]; let n = 0; const k = 0.97;
  const W = (a, b, t) => f.walls.push({ id: 'w' + n++, start: { x: a[0] * k, y: a[1] * k }, end: { x: b[0] * k, y: b[1] * k }, thickness: t, height: 260 });
  W([0, 0], [600, 0], 20); W([600, 0], [600, 250], 20); W([600, 250], [660, 250], 12); W([660, 250], [660, 400], 12); W([660, 400], [600, 400], 12);
  W([600, 400], [600, 500], 20); W([600, 500], [0, 500], 20); W([0, 500], [0, 0], 20);
  W([400, 0], [400, 500], 12); W([400, 200], [600, 200], 12); W([0, 300], [400, 300], 12);
  f.rooms = G.resolveRooms(f, []);
  const nazwy = [[200 * k, 150 * k, 'Pokój 2'], [500 * k, 350 * k, 'Przedpokój'], [500 * k, 100 * k, 'Łazienka'], [200 * k, 400 * k, 'Sypialnia']];
  for (const t of G.resolveRoomGeometry(f, f.rooms)) { const q = t.polygon; for (const [x, y, nm] of nazwy) { let w = false; for (let i = 0, j = q.length - 1; i < q.length; j = i++) if ((q[i].y > y) !== (q[j].y > y) && x < ((q[j].x - q[i].x) * (y - q[i].y)) / (q[j].y - q[i].y) + q[i].x) w = !w; if (w) { const r = f.rooms.find((z) => z.id === t.room.id); r.name = nm; } } }
  const pom = [{ nazwa: 'Pokój', a: 3.84, b: 2.84, m: 10.91 }, { nazwa: 'Przedpokój', a: 2.84, b: 1.84, m: 5.23 }];
  await R.wloz('wejscie:' + oid, { plan: JSON.stringify(p), nazwa: 'Dopasowanie', pom, t: null });
  return pom;
}"""
with sync_playwright() as p:
    shutil.rmtree(f'/tmp/amshots/prof-d-{TAG}', ignore_errors=True)
    opc = dict(viewport={'width': W, 'height': H}, device_scale_factor=2, has_touch=True, locale='pl-PL')
    c = p.webkit.launch_persistent_context(f'/tmp/amshots/prof-d-{TAG}', **opc) if silnik == 'webkit' else p.chromium.launch_persistent_context(f'/tmp/amshots/prof-d-{TAG}', executable_path='/usr/bin/google-chrome', args=['--no-sandbox'], **opc)
    pg = c.new_page(); bl = []
    pg.on('pageerror', lambda e: bl.append(f'pageerror {e}'))
    pg.on('console', lambda m: bl.append(f'console {m.text}') if m.type == 'error' else None)
    J = lambda js: pg.evaluate(js)
    shot = lambda n: pg.screenshot(path=f'/tmp/amshots/d-{TAG}-{n}.png')
    def ok(w, t):
        print(('OK  ' if w else 'BŁĄD'), t); assert w, t
    pg.goto(URL); pg.fill('#l-login', 'marek'); pg.fill('#l-haslo', 'tajne123'); pg.click('#f-log button'); pg.wait_for_selector('#karty')
    pg.locator('[data-a=nowa]:visible').first.click(); pg.wait_for_selector('#sek-podstawy')
    oid = J("location.hash.split('/')[2]")
    # karta: pomiary dalmierzem
    J(f"""(async()=>{{const D=await import('./js/dane.js'); await D.zmien('{oid}', {{ pom: [{{id:'p1',nazwa:'Pokój',a:3.84,b:2.84,m:10.91}},{{id:'p2',nazwa:'Przedpokój',a:2.84,b:1.84,m:5.23}}] }});}})()""")
    pg.wait_for_timeout(400)
    J("location.hash='#/o/" + oid + "/s/pom'"); pg.wait_for_selector('[data-a=rzut-otworz]')
    J(f"({BUDUJ})('{oid}')")
    pg.goto(f'http://127.0.0.1:8767/ogloszenia/plan.html?am={oid}'); pg.wait_for_timeout(1800)
    fl = lambda: J("(()=>{const S=window.__plan; return S.projekt.floors.find(f=>f.id===S.projekt.activeFloorId)||S.projekt.floors[0]})()")
    akcja = lambda a: (pg.locator(f'#pasek-akcji [data-a={a}]:visible, #arkusz [data-a={a}]:visible').first.click(), pg.wait_for_timeout(200))
    ok(pg.is_visible('#podpowiedz [data-a=kalibruj]'), 'propozycja: „Dopasuj” po otwarciu rzutu z pomiarami w karcie')
    shot('01-propozycja')
    przed = {q['nazwa']: q['m'] for q in J("window.__plan.sc.pokoje.map(p=>({nazwa:p.nazwa, m:p.m}))")}
    pg.click('#podpowiedz [data-a=kalibruj]'); pg.wait_for_timeout(500)
    tx = pg.inner_text('#arkusz'); print('   raport:', tx.replace('\n', ' | ')[:300])
    ok('Dopasowanie do pomiarów' in tx and tx.count('✓') == 4, 'raport: 4 pomiary dopasowane ✓')
    ok('w karcie: Pokój' in tx, 'raport pokazuje „Pokój 2” ↔ „Pokój” z karty')
    shot('02-raport')
    po = {q['nazwa']: (q['m'], q['dop']) for q in J("window.__plan.sc.pokoje.map(p=>({nazwa:p.nazwa, m:p.m, dop:p.dop}))")}
    print('   metraże:', przed, '→', po)
    ok(abs(po['Pokój 2'][0] - 10.91) < 0.03 and po['Pokój 2'][1], f"pokój po dopasowaniu = pomiar ({po['Pokój 2'][0]})")
    ok(abs(po['Przedpokój'][0] - 6.10) < 0.12 and po['Przedpokój'][1], f"przedpokój z wnęką ≈ 6,1 m² (pomiar prostokąta 5,23) → {po['Przedpokój'][0]}")
    krzywe = J("(()=>{const S=window.__plan, f=S.projekt.floors[0]; return f.walls.filter(w=>{const a=Math.atan2(w.end.y-w.start.y,w.end.x-w.start.x)*180/Math.PI; const r=((a%90)+90)%90; return Math.min(r,90-r)>0.2}).length})()")
    ok(krzywe == 0, 'po dopasowaniu wszystkie kąty proste')
    akcja('zamknij') if W < 900 else None
    ok(not pg.is_visible('#podpowiedz [data-a=kalibruj]'), 'propozycja znika po dopasowaniu')
    # długość w świetle: ścianka wnęki (górna, pozioma 600→660 przy y=250)
    J("""(()=>{const S=window.__plan, f=S.projekt.floors[0]; const w=f.walls.find(q=>q.id==='w2'); S.zazn={rodzaj:'sciana', id:w.id}; S.arkusz={typ:'element'}; window.__planUI.interfejs(); window.__planUI.odswiez();})()""")
    pg.wait_for_timeout(250)
    v0 = pg.input_value('#p-l'); print('   ścianka wnęki w świetle:', v0)
    ok(abs(float(v0) - 44) <= 2, f'pole długości = wymiar w świetle jak na rzucie ({v0} cm, oś ≈ 60)')
    chipy = pg.inner_text('#arkusz .chipy'); ok('prawy koniec' in chipy, f'wybór końca: domyślnie przesuwa się tył wnęki ({chipy})')
    pg.fill('#p-l', '55'); pg.press('#p-l', 'Enter'); pg.wait_for_timeout(400)
    w2 = [w for w in fl()['walls'] if w['id'] == 'w2'][0]; w3 = [w for w in fl()['walls'] if w['id'] == 'w3'][0]; w4 = [w for w in fl()['walls'] if w['id'] == 'w4'][0]
    ok(abs(w3['start']['x'] - w3['end']['x']) < 0.2, 'tył wnęki przesunięty równolegle — nie krzywi się')
    ok(abs(w2['end']['y'] - w2['start']['y']) < 0.2 and abs(w4['end']['y'] - w4['start']['y']) < 0.2, 'obie ścianki wnęki dalej poziome')
    g = J("(async()=>{const R=await import('./js/plan/rysuj.js'); const S=window.__plan; return S.sc.sciany.filter(q=>q.w.id==='w2'||q.w.id==='w4').map(q=>Math.round(R.dlugoscCzysta(q,S.sc.sciany)))})()")
    ok(g == [55, 55], f'obie ścianki wnęki mają teraz 55 cm w świetle ({g})')
    shot('03-wneka')
    # grubość ściany zewnętrznej: wymiar pokoju w świetle bez zmian
    m0 = J("window.__plan.sc.pokoje.find(p=>p.nazwa==='Pokój 2').m")
    J("""(()=>{const S=window.__plan; S.zazn={rodzaj:'sciana', id:'w0'}; S.arkusz={typ:'element'}; window.__planUI.interfejs();})()"""); pg.wait_for_timeout(200)
    pg.locator('#arkusz [data-a=grubosc][data-v="38"]').click(); pg.wait_for_timeout(300)
    m1 = J("window.__plan.sc.pokoje.find(p=>p.nazwa==='Pokój 2').m")
    ok(abs(m1 - m0) < 0.005, f'grubsza ściana zewnętrzna nie zmienia metrażu pokoju ({m0} → {m1})')
    # przeciągnięcie narożnika: tylko wzdłuż ściany, nic się nie krzywi
    ekr = lambda x, y: J(f"(()=>{{const S=window.__plan, r=document.querySelector('#plotno').getBoundingClientRect(); return [{x}*S.widok.s+S.widok.ox+r.left, {y}*S.widok.s+S.widok.oy+r.top]}})()")
    J("""(()=>{const S=window.__plan; S.zazn={rodzaj:'sciana', id:'w2'}; S.arkusz=null; window.__planUI.interfejs(); window.__planUI.odswiez();})()"""); pg.wait_for_timeout(200)
    w2 = [w for w in fl()['walls'] if w['id'] == 'w2'][0]
    a = ekr(w2['end']['x'], w2['end']['y']); pg.mouse.move(*a); pg.mouse.down(); pg.mouse.move(a[0] + 30, a[1] + 25, steps=6); pg.mouse.up(); pg.wait_for_timeout(300)
    krzywe = J("(()=>{const f=window.__plan.projekt.floors[0]; return f.walls.filter(w=>{const a=Math.atan2(w.end.y-w.start.y,w.end.x-w.start.x)*180/Math.PI; const r=((a%90)+90)%90; return Math.min(r,90-r)>0.2}).length})()")
    ok(krzywe == 0, 'przeciągnięty narożnik nie krzywi ścian')
    pg.click('[data-a=cofnij]'); pg.wait_for_timeout(200)
    # przełączniki wymiarów pokoi
    J("""(()=>{const S=window.__plan; const p=S.sc.pokoje.find(q=>q.nazwa==='Pokój 2'); S.zazn={rodzaj:'pokoj', id:p.room.id}; S.arkusz={typ:'element'}; window.__planUI.interfejs();})()"""); pg.wait_for_timeout(200)
    t2 = pg.inner_text('#arkusz'); ok('Rzut dopasowany do Twojego pomiaru 3,84 × 2,84 m' in t2 and 'Wymiary na obrazie' in t2, 'arkusz pokoju: dopasowanie i przełącznik wymiarów')
    shot('04-pokoj')
    b64 = J("(async()=>{const R=await import('./js/plan/rysuj.js'); const S=window.__plan; const b=await R.eksportPNG(S.sc,{obrazy:S.obrazy, wymiary:false, wymiaryPokoi:true}); const a=new Uint8Array(await b.arrayBuffer()); let s=''; for(let i=0;i<a.length;i+=8192) s+=String.fromCharCode(...a.subarray(i,i+8192)); return btoa(s)})()")
    import base64; open(f'/tmp/amshots/d-{TAG}-eksport.png', 'wb').write(base64.b64decode(b64))
    # zapis → karta: mRzut obok pomiaru, bez duplikatu
    pg.click('[data-a=zapisz]'); pg.click('.okno-tlo [data-w=oba]'); pg.wait_for_url('**/ogloszenia/#/o/**', timeout=30000); pg.wait_for_selector('.okno', timeout=20000); pg.wait_for_timeout(400)
    t3 = pg.inner_text('.okno-tresc'); print('   okno:', t3.replace('\n', ' | ')[:260])
    ok('w karcie „Pokój”' in t3, 'okno: „Pokój 2” z rzutu trafia do „Pokój” z karty')
    shot('05-okno'); pg.click('.okno [data-t]'); pg.wait_for_timeout(1200)
    o = J(f"(async()=>{{const D=await import('./js/dane.js'); return D.oferta('{oid}')}})()")
    pom = {q['nazwa']: q for q in o['pom']}; print('   karta:', o['pom'])
    ok('Pokój 2' not in pom and pom['Pokój']['a'] == 3.84 and abs(pom['Pokój']['mRzut'] - 10.91) < 0.03, 'karta: pomiar nietknięty, metraż z rzutu obok, bez duplikatu')
    ok(abs(pom['Przedpokój']['mRzut'] - 6.1) < 0.12 and pom['Przedpokój']['m'] == 5.23, 'przedpokój: metraż z rzutu z wnęką obok prostokąta z dalmierza')
    J(f"location.hash='#/o/{oid}/s/pom'"); pg.wait_for_timeout(600)
    ok('ten metraż trafia do ogłoszenia' in pg.inner_text('#sek-pom') if pg.locator('#sek-pom').count() else 'ten metraż trafia do ogłoszenia' in pg.inner_text('body'), 'karta pokazuje metraż z rzutu')
    shot('06-karta')
    print('BLEDY', bl[:8]); assert not bl
