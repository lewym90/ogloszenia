# automatyczny wybór „ładnych” zdjęć wnętrz na cele: jasne, czyste, kolorowe (nie cz-b), bez przepaleń, dość ostre
import cv2, numpy as np, json, glob, os
k = json.load(open('meta/kandydaci.json'))
dobre, oceny = [], {}
for p in sorted(glob.glob('surowe/*.jpg')):
    i = os.path.basename(p)[:-4]
    im = cv2.imread(p)
    if im is None or min(im.shape[:2]) < 450: continue
    lab = cv2.cvtColor(im, cv2.COLOR_BGR2Lab).astype(np.float32); L = lab[..., 0] * 100 / 255
    a, b = lab[..., 1] - 128, lab[..., 2] - 128; C = np.hypot(a, b)
    p5, p50, p95 = np.percentile(L, [5, 50, 95])
    przep = (im.max(2) >= 250).mean()
    sat = np.median(C)
    g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
    ostr = cv2.Laplacian(cv2.resize(g, (512, int(512 * g.shape[0] / g.shape[1]))), cv2.CV_32F).var()
    neu = (C < 10) & (L > 65)
    wb = (np.median(b[neu]) if neu.sum() > 2000 else 0)
    hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV); H = hsv[...,0].astype(np.float32); S = hsv[...,1]
    kol = S > 40
    hstd = float(np.std(np.where(H[kol] > 90, H[kol] - 180, H[kol]))) if kol.sum() > 1000 else 0
    sepia = hstd < 6
    b0 = np.concatenate([im[:6].reshape(-1,3), im[-6:].reshape(-1,3), im[:, :6].reshape(-1,3), im[:, -6:].reshape(-1,3)]).astype(np.float32)
    ramka = b0.std(0).mean() < 6 and b0.mean() > 150
    ok = (not sepia) and (not ramka) and p50 > 30 and p95 > 70 and przep < 0.08 and sat > 3 and ostr > 40 and -6 < wb < 16
    oceny[i] = dict(p5=float(round(p5)), p50=float(round(p50)), p95=float(round(p95)), przep=float(round(przep, 3)), sat=float(round(sat, 1)), ostr=float(round(ostr)), wb=round(float(wb), 1), ok=bool(ok))
    if ok: dobre.append(i)
json.dump(oceny, open('meta/oceny2.json', 'w'))
print('wszystkich', len(oceny), 'dobrych', len(dobre))
# arkusz kontrolny
from PIL import Image
import random; stare=set(json.load(open('meta/dobre.json'))); nowe=[i for i in dobre if i not in stare]; random.seed(1); random.shuffle(nowe); print('nowych', len(nowe))
th = [Image.open(f'surowe/{i}.jpg').convert('RGB') for i in nowe[:96]]
for t in th: t.thumbnail((200, 150))
s = Image.new('RGB', (12 * 204, 8 * 154), (30, 30, 30))
for n, t in enumerate(th): s.paste(t, ((n % 12) * 204, (n // 12) * 154))
s.save('meta/arkusz2.jpg', quality=80)
json.dump(dobre, open('meta/dobre2.json', 'w'))
