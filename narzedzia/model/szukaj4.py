import json, time, urllib.request, urllib.parse, os, sys
Q = ['bright apartment', 'sunny room', 'living area', 'kitchen interior design', 'bathroom design', 'bedroom design', 'modern home', 'nordic home', 'white kitchen cabinets', 'wood kitchen', 'marble bathroom', 'tile bathroom', 'cozy living room', 'contemporary kitchen', 'home staging', 'condo interior', 'penthouse', 'house for sale', 'rental apartment', 'dining area', 'open space interior', 'neutral interior', 'beige interior', 'grey interior', 'boho interior', 'industrial interior', 'country kitchen', 'farmhouse interior', 'guest bedroom', 'bunk bed room', 'nursery room', 'laundry room', 'dressing room', 'entrance hall', 'corridor home', 'fireplace living room', 'window seat', 'home library', 'reading nook', 'interior light']
os.makedirs('meta', exist_ok=True)
wyn = {}
if os.path.exists('meta/kandydaci.json'): wyn = json.load(open('meta/kandydaci.json'))
n = 0
for q in Q:
    for page in (1, 2, 3, 4, 5):
        url = "https://api.openverse.org/v1/images/?" + urllib.parse.urlencode({"q": q, "license": "cc0,pdm,by", "page_size": 20, "page": page, "size": "large", "mature": "false", "source": "rawpixel,stocksnap"})
        try:
            d = json.load(urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "curl/8.5.0"}), timeout=30))
        except Exception as e:
            print('blad', q, page, e); time.sleep(5); continue
        n += 1
        for r in d.get("results", []):
            if r["id"] in wyn: continue
            wyn[r["id"]] = {k: r.get(k) for k in ("title", "creator", "creator_url", "license", "license_version", "license_url", "foreign_landing_url", "provider", "width", "height", "thumbnail")}
            wyn[r["id"]]["q"] = q
        if page >= d.get("page_count", 1): break
        time.sleep(3.2)  # ≤ 20/min
    print(q, len(wyn), flush=True)
json.dump(wyn, open('meta/kandydaci.json', 'w'), ensure_ascii=False)
print('zapytan', n, 'kandydatow', len(wyn))
