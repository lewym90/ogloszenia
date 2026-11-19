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
  const nazwy = [[200 * k, 150 * k, 'Pokój 2'], [500 * k, 350 * k, 'Przedpokój'], [200 * k, 400 * k, 'Sypialnia']];
  for (const t of G.resolveRoomGeometry(f, f.rooms)) { const q = t.polygon; for (const [x, y, nm] of nazwy) { let w = false; for (let i = 0, j = q.length - 1; i < q.length; j = i++) if ((q[i].y > y) !== (q[j].y > y) && x < ((q[j].x - q[i].x) * (y - q[i].y)) / (q[j].y - q[i].y) + q[i].x) w = !w; if (w) { const r = f.rooms.find((z) => z.id === t.room.id); r.name = nm; } } }
  const pom = [{ nazwa: 'Pokój', a: 3.84, b: 2.84, m: 10.91 }, { nazwa: 'Przedpokój', a: 2.84, b: 1.84, m: 5.23 }, { nazwa: 'Łazienka', a: 1.84, b: 1.84, m: 3.39 }];
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
    J(f"""(async()=>{{const D=await import('./js/dane.js'); await D.zmien('{oid}', {{ pom: [{{id:'p1',nazwa:'Pokój',a:3.84,b:2.84,m:10.91}},{{id:'p2',nazwa:'Przedpokój',a:2.84,b:1.84,m:5.23}},{{id:'p3',nazwa:'Łazienka',a:1.84,b:1.84,m:3.39}}] }});}})()""")
    pg.wait_for_timeout(400)
    J("location.hash='#/o/" + oid + "/s/pom'"); pg.wait_for_selector('[data-a=rzut-otworz]')
    J(f"({BUDUJ})('{oid}')")
    pg.goto(f'http://127.0.0.1:8767/ogloszenia/plan.html?am={oid}'); pg.wait_for_timeout(1800)
    fl = lambda: J("(()=>{const S=window.__plan; return S.projekt.floors.find(f=>f.id===S.projekt.activeFloorId)||S.projekt.floors[0]})()")
    akcja = lambda a: (pg.locator(f'#pasek-akcji [data-a={a}]:visible, #arkusz [data-a={a}]:visible').first.click(), pg.wait_for_timeout(200))
    ok(pg.is_visible('#podpowiedz [data-a=kalibruj]'), 'propozycja: „Dopasuj” po otwarciu rzutu z pomiarami w karcie')
    nz = sorted(J("window.__plan.sc.pokoje.map(p=>p.nazwa)")); print('   nazwy:', nz)
    ok('Pokój' in nz and 'Pokój 2' not in nz, 'nazwa z karty: „Pokój 2” ze skanu → „Pokój”')
    ok('Łazienka' in nz, 'pomieszczenie bez nazwy rozpoznane po wymiarach z karty → „Łazienka”')
    shot('01-propozycja')
    przed = {q['nazwa']: q['m'] for q in J("window.__plan.sc.pokoje.map(p=>({nazwa:p.nazwa, m:p.m}))")}
    pg.click('#podpowiedz [data-a=kalibruj]'); pg.wait_for_timeout(500)
    tx = pg.inner_text('#arkusz'); print('   raport:', tx.replace('\n', ' | ')[:300])
    ok('Dopasowanie do pomiarów' in tx and tx.count('✓') == 6, 'raport: 6 pomiarów dopasowanych ✓')
    shot('02-raport')
    po = {q['nazwa']: (q['m'], q['dop']) for q in J("window.__plan.sc.pokoje.map(p=>({nazwa:p.nazwa, m:p.m, dop:p.dop}))")}
    print('   metraże:', przed, '→', po)
    ok(abs(po['Pokój'][0] - 10.91) < 0.03 and po['Pokój'][1], f"pokój po dopasowaniu = pomiar ({po['Pokój'][0]})")
    ok(abs(po['Przedpokój'][0] - 6.10) < 0.12 and po['Przedpokój'][1], f"przedpokój z wnęką ≈ 6,1 m² (pomiar prostokąta 5,23) → {po['Przedpokój'][0]}")
    krzywe = J("(()=>{const S=window.__plan, f=S.projekt.floors[0]; return f.walls.filter(w=>{const a=Math.atan2(w.end.y-w.start.y,w.end.x-w.start.x)*180/Math.PI; const r=((a%90)+90)%90; return Math.min(r,90-r)>0.2}).length})()")
    ok(krzywe == 0, 'po dopasowaniu wszystkie kąty proste')
    akcja('zamknij') if W < 900 else None
    ok(not pg.is_visible('#podpowiedz [data-a=kalibruj]'), 'propozycja znika po dopasowaniu')
    # długość w świetle: ścianka wnęki (górna, pozioma 600→660 przy y=250)
    J("""(()=>{const S=window.__plan, f=S.projekt.floors[0]; const w=f.walls.find(q=>q.id==='w2'); S.zazn={rodzaj:'sciana', id:w.id}; S.arkusz={typ:'element'}; window.__planUI.interfejs(); window.__planUI.odswiez();})()""")
    pg.wait_for_timeout(250)
    v0 = pg.input_value('#p-l'); print('   ścianka wnęki w świetle:', v0)
    ok(abs(float(v0) - 62) <= 2, f'pole długości = wymiar w świetle od strony pomieszczenia — od lica ściany korytarza do tyłu wnęki ({v0} cm)')
    chipy = pg.inner_text('#arkusz .chipy'); ok('prawy koniec' in chipy, f'wybór końca: domyślnie przesuwa się tył wnęki ({chipy})')
    pg.fill('#p-l', '55'); pg.press('#p-l', 'Enter'); pg.wait_for_timeout(400)
    w2 = [w for w in fl()['walls'] if w['id'] == 'w2'][0]; w3 = [w for w in fl()['walls'] if w['id'] == 'w3'][0]; w4 = [w for w in fl()['walls'] if w['id'] == 'w4'][0]
    ok(abs(w3['start']['x'] - w3['end']['x']) < 0.2, 'tył wnęki przesunięty równolegle — nie krzywi się')
    ok(abs(w2['end']['y'] - w2['start']['y']) < 0.2 and abs(w4['end']['y'] - w4['start']['y']) < 0.2, 'obie ścianki wnęki dalej poziome')
    g = J("(async()=>{const R=await import('./js/plan/rysuj.js'); const S=window.__plan; return S.sc.sciany.filter(q=>q.w.id==='w2'||q.w.id==='w4').map(q=>Math.round(R.dlugoscCzysta(q,S.sc.sciany,S.sc.pokoje)))})()")
    ok(g == [55, 55], f'obie ścianki wnęki mają teraz 55 cm w świetle ({g})')
    shot('03-wneka')
    # grubość ściany zewnętrznej: wymiar pokoju w świetle bez zmian
    m0 = J("window.__plan.sc.pokoje.find(p=>p.nazwa==='Pokój').m")
    J("""(()=>{const S=window.__plan; S.zazn={rodzaj:'sciana', id:'w0'}; S.arkusz={typ:'element'}; window.__planUI.interfejs();})()"""); pg.wait_for_timeout(200)
    pg.locator('#arkusz [data-a=grubosc][data-v="38"]').click(); pg.wait_for_timeout(300)
    m1 = J("window.__plan.sc.pokoje.find(p=>p.nazwa==='Pokój').m")
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
    J("""(()=>{const S=window.__plan; const p=S.sc.pokoje.find(q=>q.nazwa==='Pokój'); S.zazn={rodzaj:'pokoj', id:p.room.id}; S.arkusz={typ:'element'}; window.__planUI.interfejs();})()"""); pg.wait_for_timeout(200)
    t2 = pg.inner_text('#arkusz'); ok('Rzut dopasowany do Twojego pomiaru 3,84 × 2,84 m' in t2 and 'Wymiary na obrazie' in t2, 'arkusz pokoju: dopasowanie i przełącznik wymiarów')
    shot('04-pokoj')
    b64 = J("(async()=>{const R=await import('./js/plan/rysuj.js'); const S=window.__plan; const b=await R.eksportPNG(S.sc,{obrazy:S.obrazy, wymiary:false, wymiaryPokoi:true}); const a=new Uint8Array(await b.arrayBuffer()); let s=''; for(let i=0;i<a.length;i+=8192) s+=String.fromCharCode(...a.subarray(i,i+8192)); return btoa(s)})()")
    import base64; open(f'/tmp/amshots/d-{TAG}-eksport.png', 'wb').write(base64.b64decode(b64))
    # zapis → karta: mRzut obok pomiaru, bez duplikatu
    pg.click('[data-a=zapisz]'); pg.click('.okno-tlo [data-w=oba]'); pg.wait_for_url('**/ogloszenia/#/o/**', timeout=30000); pg.wait_for_selector('.okno', timeout=20000); pg.wait_for_timeout(400)
    t3 = pg.inner_text('.okno-tresc'); print('   okno:', t3.replace('\n', ' | ')[:260])
    shot('05-okno'); pg.click('.okno [data-t]'); pg.wait_for_timeout(1200)
    o = J(f"(async()=>{{const D=await import('./js/dane.js'); return D.oferta('{oid}')}})()")
    pom = {q['nazwa']: q for q in o['pom']}; print('   karta:', o['pom'])
    ok('Pokój 2' not in pom and pom['Pokój']['a'] == 3.84 and abs(pom['Pokój']['mRzut'] - 10.91) < 0.03, 'karta: pomiar nietknięty, metraż z rzutu obok, bez duplikatu')
    ok(5.8 < pom['Przedpokój']['mRzut'] < 6.4 and pom['Przedpokój']['m'] == 5.23, 'przedpokój: metraż z rzutu z wnęką obok prostokąta z dalmierza')
    J(f"location.hash='#/o/{oid}/s/pom'"); pg.wait_for_timeout(600)
    ok('ten metraż trafia do ogłoszenia' in pg.inner_text('#sek-pom') if pg.locator('#sek-pom').count() else 'ten metraż trafia do ogłoszenia' in pg.inner_text('body'), 'karta pokazuje metraż z rzutu')
    shot('06-karta')
    # szafa we wnęce (front skanera wzięty za drzwi) w ścianie między pokojem a sypialnią
    pg.goto(URL); pg.wait_for_selector('#karty'); J(f"location.hash='#/o/{oid}/s/pom'"); pg.wait_for_selector('[data-a=rzut-otworz]')
    pg.click('[data-a=rzut-otworz]'); pg.wait_for_url('**/plan.html**'); pg.wait_for_timeout(1800)
    if pg.is_visible('#podpowiedz [data-a=propozycja-nie]'): pg.click('#podpowiedz [data-a=propozycja-nie]')
    m0 = {q[0]: q[1] for q in J("window.__plan.sc.pokoje.map(p=>[p.nazwa,p.m])")}
    J("(()=>{const S=window.__plan, f=S.projekt.floors[0]; f.doors.push({id:'sz1', wallId:'w10', position:0.5, width:90, height:205, type:'single', swingDirection:'left', flipSide:false}); window.__planUI.przebuduj(); S.zazn={rodzaj:'drzwi', id:'sz1'}; S.arkusz={typ:'element'}; window.__planUI.interfejs(); window.__planUI.odswiez();})()"); pg.wait_for_timeout(200)
    pg.locator('#arkusz [data-a=szafa-z-drzwi]').click(); pg.wait_for_timeout(300)
    ok(pg.locator('#arkusz [data-a=szafa-strona]').count() == 2, 'szafa w ścianie między dwoma pokojami: jedno pytanie — do którego należy')
    shot('07a-wneka')
    pg.locator('#arkusz [data-a=szafa-strona]', has_text='Pokój').click(); pg.wait_for_timeout(500)
    m1 = {q[0]: q[1] for q in J("window.__plan.sc.pokoje.map(p=>[p.nazwa,p.m])")}; print('   wnęka:', m0, '→', m1)
    ok(len(m1) == 4 and len(J("window.__planUI.wolneKonce()")) == 0, 'wnęka: pomieszczenia zamknięte, ściany się stykają')
    ok(abs((m1['Pokój'] - m0['Pokój']) - 0.54) < 0.06 and m1['Sypialnia'] < m0['Sypialnia'] - 0.4, f"szafa 90 × 60 doszła do pokoju (+{m1['Pokój'] - m0['Pokój']:.2f} m²) kosztem sypialni")
    shot('07b-po-wnece')
    # ponowne stuknięcie: to, co pod spodem (otwór → ściana)
    J("(()=>{const S=window.__plan, f=S.projekt.floors[0]; f.doors.push({id:'o1', wallId:'w8', position:0.5, width:90, height:205, type:'opening', swingDirection:'left', flipSide:false}); window.__planUI.przebuduj(); S.zazn=null; window.__planUI.interfejs(); window.__planUI.odswiez();})()")
    w8 = [w for w in fl()['walls'] if w['id'] == 'w8'][0]; ekr = lambda x, y: J(f"(()=>{{const S=window.__plan, r=document.querySelector('#plotno').getBoundingClientRect(); return [{x}*S.widok.s+S.widok.ox+r.left, {y}*S.widok.s+S.widok.oy+r.top]}})()")
    pt = ekr((w8['start']['x'] + w8['end']['x']) / 2, (w8['start']['y'] + w8['end']['y']) / 2)
    pg.mouse.click(*pt); pg.wait_for_timeout(250); r1 = J("window.__plan.zazn?.rodzaj")
    pg.mouse.click(*pt); pg.wait_for_timeout(250); r2 = J("window.__plan.zazn?.rodzaj")
    ok(r1 == 'drzwi' and r2 == 'sciana', f'stuknięcie w otwór zaznacza otwór, ponowne — ścianę pod nim ({r1} → {r2})')
    pg.click('[data-a=cofnij]'); pg.wait_for_timeout(200)
    # zniszczenia jak po 1.8.0: przerwa w prostej ścianie (pokój otwarty), przerwa w ścianie łazienki (zlana z przedpokojem),
    # rozjechany narożnik (oba końce wolne); nazwy zgubione bez pamięci → „Napraw” zamyka, nazwy wracają z karty po wymiarach
    pg.goto(URL); pg.wait_for_selector('#karty'); J(f"location.hash='#/o/{oid}/s/pom'"); pg.wait_for_selector('[data-a=rzut-otworz]')
    pg.click('[data-a=rzut-otworz]'); pg.wait_for_url('**/plan.html**'); pg.wait_for_timeout(1800)
    J(r'''(()=>{const S=window.__plan, f=S.projekt.floors[0], W=(id)=>f.walls.find(q=>q.id===id);
      const l=W('w7'); const s0={...l.start}, e0={...l.end}; const yM=s0.y+(e0.y-s0.y)*0.85;
      l.end={x:e0.x+(s0.x-e0.x)*0, y:yM+14}; f.walls.push({id:'w7b', start:{x:e0.x, y:yM-14}, end:{...e0}, thickness:l.thickness, height:260});
      const b=W('w9'); const m={x:(b.start.x+b.end.x)/2, y:(b.start.y+b.end.y)/2}; const be={...b.end}; b.end={x:m.x-11, y:m.y}; f.walls.push({id:'w9b', start:{x:m.x+11, y:m.y}, end:be, thickness:b.thickness, height:260});
      const g=W('w0'), r=W('w1'); g.end={x:g.end.x-9, y:g.end.y}; r.start={x:r.start.x, y:r.start.y+7};
      window.__planUI.przebuduj(); delete f.amZnikniete; for (const x of f.rooms) if (x.name==='Pokój'||x.name==='Łazienka') x.name=''; window.__planUI.przebuduj(); window.__planUI.odswiez(); window.__planUI.propozycja();})()''')
    pg.wait_for_timeout(300)
    n1 = len(J("window.__planUI.wolneKonce()")); print('   wolne końce:', n1, J("window.__plan.sc.pokoje.map(p=>p.nazwa)"))
    ok(n1 >= 4 and pg.is_visible('#podpowiedz [data-a=napraw]'), f'niestykające się ściany wykryte ({n1}) i „Napraw” proponowane')
    shot('07-pekniete')
    pg.click('#podpowiedz [data-a=napraw]'); pg.wait_for_timeout(800)
    print('   po naprawie:', J("window.__plan.sc.pokoje.map(p=>[p.nazwa,p.m])"))
    print('   wymiary:', J("(async()=>{const D=await import('./js/plan/dopasuj.js'); const S=window.__plan, f=S.projekt.floors[0]; return [S.sc.pokoje.map(p=>[p.nazwa, D.glowneWymiary(f,p.poly)]), S.pomKarty, D.nazwyPoWymiarach(f, S.sc.pokoje.filter(p=>!p.nazwa), S.pomKarty.filter(k=>k.a&&k.b)).map(x=>x.k.nazwa)]})()"))
    ok(len(J("window.__planUI.wolneKonce()")) == 0, '„Napraw” łączy ściany: przerwy w prostej, rozjechany narożnik')
    ok(sorted(q for q in J("window.__plan.sc.pokoje.map(p=>p.nazwa)") if q) == ['Pokój', 'Przedpokój', 'Sypialnia', 'Łazienka'], 'po naprawie pomieszczenia zamknięte, nazwy z karty wróciły')
    shot('08-naprawione')
    print('BLEDY', bl[:8]); assert not bl
