# Pobiera zdjęcia z listy zbior.json do surowe/<id>.jpg (Openverse, pełny rozmiar miniatury ~1024 px).
import json, urllib.request, os, time
os.makedirs('surowe', exist_ok=True)
ok = bl = 0
for r in json.load(open('zbior.json')):
    p = f"surowe/{r['id']}.jpg"
    if os.path.exists(p): continue
    try:
        d = urllib.request.urlopen(urllib.request.Request(r['miniatura'] + '?full_size=true', headers={'User-Agent': 'curl/8.5.0'}), timeout=40).read()
        open(p, 'wb').write(d); ok += 1
    except Exception as e:
        bl += 1
        if '429' in str(e): print('limit dzienny — dokończ jutro', ok); break
    time.sleep(0.4)
print('pobrane', ok, 'błędy', bl)
