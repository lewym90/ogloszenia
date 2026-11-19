#!/usr/bin/env python3
"""Składa nowe elementy biblioteki rzutu z grafik, które już są (te same blaty, krzesła, drewno, zlew, płyta).
Nie trzeba nowego arkusza — styl zostaje ten sam.  Użycie:  python3 narzedzia/plan/zloz.py  (potem tnij.py --spis)

stol_owalny, stol_owalny_4/6/8   — blat owalny z drewna stołu prostokątnego, krzesła z „Krzesło”, kwiaty ze stołu okrągłego
ciag_kuchenny_180/240/300        — jeden ciągły blat (kamień z „Blat kuchenny 120”) z wpuszczonym zlewem i płytą
prysznic_walkin_szyba            — prysznic walk-in: jedna szyba, deszczownica i odpływ liniowy przy ścianie (u góry)
lozko_140                        — grafika łóżka 160 (rysowana w wymiarze 140×200)
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

KORZEN = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
D = os.path.join(KORZEN, 'img', 'plan', 'meble')
PX = 3  # px na cm


def wczytaj(k):
    return Image.open(os.path.join(D, k + '.webp')).convert('RGBA')


def zapisz(img, k):
    img.save(os.path.join(D, k + '.webp'), 'WEBP', quality=88, method=6)
    print('zapisano', k, img.size)


def elipsa(w, h, k=4):
    m = Image.new('L', (w * k, h * k), 0)
    ImageDraw.Draw(m).ellipse((0, 0, w * k - 1, h * k - 1), fill=255)
    return m.resize((w, h), Image.LANCZOS)


def blat_owalny(wcm, dcm):
    w, h = wcm * PX, dcm * PX
    drewno = wczytaj('stol')
    drewno = drewno.crop((6, 6, drewno.width - 6, drewno.height - 6)).resize((w, h), Image.LANCZOS)
    m = elipsa(w, h)
    # brzeg blatu: lekko ciemniejszy pierścień + delikatne światło przy górnej krawędzi (jak na stole okrągłym)
    a = np.array(drewno).astype(float)
    yy, xx = np.mgrid[0:h, 0:w]
    r = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2)
    brzeg = np.clip((r - 0.955) / 0.045, 0, 1)
    a[..., :3] *= (1 - 0.18 * brzeg)[..., None]
    out = Image.fromarray(a.clip(0, 255).astype('uint8'), 'RGBA')
    out.putalpha(m)
    return out


def kwiaty(srednica_cm):
    s = wczytaj('stol_okragly_4')
    cx, cy, r = s.width // 2, s.height // 2, int(s.width * 0.16)
    k = s.crop((cx - r, cy - r, cx + r, cy + r))
    n = int(srednica_cm * PX)
    k = k.resize((n, n), Image.LANCZOS)
    m = elipsa(n, n).filter(ImageFilter.GaussianBlur(n * 0.04))
    m = Image.fromarray((np.array(m).astype(float) * 1.0).clip(0, 255).astype('uint8'))
    k.putalpha(m)
    return k


def krzeslo(obrot):
    k = wczytaj('krzeslo').resize((48 * PX, 55 * PX), Image.LANCZOS)  # oparcie u góry, siedzisko do stołu w dół
    return k.rotate(obrot, expand=True, resample=Image.BICUBIC)


def stol_owalny(wst, dst, bok, konce, kwiat=True):
    """wst×dst — blat; bok — krzeseł na każdym długim boku; konce — po jednym krześle na końcach."""
    wsz = 40 if konce else 0  # krzesło wystaje 40 cm poza blat (wsunięte 15 cm)
    gora = 40 if bok else 0
    W, H = (wst + 2 * wsz) * PX, (dst + 2 * gora) * PX
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    x0, y0 = wsz * PX, gora * PX
    poz = {1: [0.5], 2: [0.29, 0.71], 3: [0.2, 0.5, 0.8]}.get(bok, [])
    for f in poz:  # krzesło wsunięte 15 cm pod krawędź elipsy w tym miejscu
        x = x0 + wst * PX * f
        ugiecie = (dst * PX / 2) * (1 - np.sqrt(max(0.0, 1 - (2 * f - 1) ** 2)))
        g = krzeslo(0); img.alpha_composite(g, (int(x - g.width / 2), int(y0 + ugiecie - 40 * PX)))
        d = krzeslo(180); img.alpha_composite(d, (int(x - d.width / 2), int(y0 + dst * PX - ugiecie - 15 * PX)))
    if konce:
        l = krzeslo(90); img.alpha_composite(l, (0, int(y0 + dst * PX / 2 - l.height / 2)))
        p = krzeslo(-90); img.alpha_composite(p, (int(W - p.width), int(y0 + dst * PX / 2 - p.height / 2)))
    b = blat_owalny(wst, dst); img.alpha_composite(b, (x0, y0))
    if kwiat:
        k = kwiaty(min(34, dst * 0.38)); img.alpha_composite(k, (x0 + b.width // 2 - k.width // 2, y0 + b.height // 2 - k.height // 2))
    return img


def wycinek_inny_niz_tlo(img, prog=175, marg=2):
    """Zlew / płyta z kafelka: sam przedmiot (największy ciemny kształt + to, co z nim połączone, np. bateria), bez kamienia wokół."""
    from scipy import ndimage
    a = np.array(img).astype(int)
    ciemne = (a[..., :3].mean(-1) < prog) & (a[..., 3] > 250)
    h = a.shape[0]; ciemne[:int(h * 0.05)] = False; ciemne[int(h * 0.9):] = False  # krawędzie kafelka (przód blatu, brzeg grafiki)
    ciemne = ndimage.binary_opening(ciemne, iterations=1)
    lab, n = ndimage.label(ndimage.binary_dilation(ciemne, iterations=3))
    if not n: raise SystemExit('nie znalazłem przedmiotu')
    duzy = lab == (np.argmax(ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))) + 1)
    ys, xs = np.where(duzy)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    # prostokąt przedmiotu (zlew, płyta) wypełniony w całości — w środku są też jasne miejsca (stal, odbicia)
    rdzen = np.zeros_like(duzy)
    gl = ndimage.binary_fill_holes(duzy)
    rows = gl.sum(1); pr = rows > 0.6 * rows.max()  # wiersze, w których przedmiot jest szeroki — korpus bez baterii
    ry = np.where(pr)[0]; cols = gl[ry.min():ry.max() + 1].sum(0); rx = np.where(cols > 0.5 * cols.max())[0]
    r = max(2, int((rx.max() - rx.min()) * 0.05))
    mr = Image.new('L', (a.shape[1], a.shape[0]), 0)
    ImageDraw.Draw(mr).rounded_rectangle((rx.min(), ry.min(), rx.max(), ry.max()), radius=r, fill=255)
    nad = duzy.copy(); nad[ry.min():] = False  # bateria nad zlewem (od ściany) — reszta poza prostokątem to cień, pomijamy
    maska = (np.array(mr) > 127) | nad
    m = Image.fromarray((maska * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(0.8))
    out = img.copy(); out.putalpha(m)
    y0 = min(y0, ry.min()); x0, x1 = min(rx.min(), np.where(nad.any(0))[0].min() if nad.any() else rx.min()), max(rx.max(), np.where(nad.any(0))[0].max() if nad.any() else rx.max())
    y1 = ry.max()
    c = out.crop((x0 - marg, y0 - marg, x1 + marg, y1 + marg))
    c.info['srodek_y'] = ((ry.min() + ry.max()) / 2 - (y0 - marg)) / c.height  # środek korpusu (bez baterii), 0..1
    return c


def ciag_kuchenny(lcm):
    W, H = lcm * PX, 60 * PX
    o = wczytaj('blat_120'); a = np.array(o).astype(int)
    krawedz = tuple(int(v) for v in np.median(a[o.height - 5:o.height - 2, o.width // 4:o.width * 3 // 4, :3].reshape(-1, 3), axis=0))
    t = o.crop((7, 7, o.width - 7, o.height - 10))
    blat = t.resize((W, H), Image.LANCZOS).convert('RGB')  # jeden kamień na całą długość — bez szwów i odbić
    d = ImageDraw.Draw(blat)
    d.rectangle((0, H - 2 * PX, W, H), fill=krawedz)  # przednia krawędź blatu — jedna, przez całą długość
    d.line((0, H - 2 * PX, W, H - 2 * PX), fill=tuple(max(0, c - 18) for c in krawedz), width=1)
    blat = blat.convert('RGBA')
    zlew = wczytaj('zlew'); z = wycinek_inny_niz_tlo(zlew); kz = (80 * PX) / zlew.width
    zlew = z.resize((int(z.width * kz), int(z.height * kz)), Image.LANCZOS); zlew.info['srodek_y'] = z.info['srodek_y']
    pl = wczytaj('plyta_indukcyjna'); kp = (60 * PX) / pl.width; p = wycinek_inny_niz_tlo(pl, prog=90)
    pl = p.resize((int(p.width * kp), int(p.height * kp)), Image.LANCZOS); pl.info['srodek_y'] = p.info['srodek_y']
    xs = {180: (45, 132), 240: (55, 180), 300: (65, 225)}[lcm]
    for el, xc in ((zlew, xs[0]), (pl, xs[1])):
        blat.alpha_composite(el, (int(xc * PX - el.width / 2), int(H * 0.52 - el.height * el.info['srodek_y'])))  # korpus na środku głębokości
    return blat


def walkin_szyba():
    """Walk-in 120×90: jedna szyba (lewy bok, od ściany), deszczownica i odpływ liniowy przy ścianie (górna krawędź = ściana).
    Kolory jak w „Prysznic walk-in”. Drugi bok — lustrzane odbicie w edytorze."""
    o = wczytaj('prysznic_walkin')
    tlo = (237, 233, 227)
    K = 4 * PX  # rysujemy 4× większe i zmniejszamy — gładkie krawędzie
    W, H = 120 * K, 90 * K
    img = Image.new('RGBA', (W, H), tlo + (255,))
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, W - 1, H - 1), outline=(246, 243, 240, 255), width=int(1.3 * K))
    stal, stal_c, stal_j = (196, 193, 188, 255), (128, 125, 120, 255), (226, 224, 220, 255)
    # odpływ liniowy 80 × 7 cm, 6 cm od ściany
    x0, y0 = (W - 80 * K) // 2, 6 * K
    d.rounded_rectangle((x0, y0, x0 + 80 * K, y0 + 7 * K), radius=K, fill=stal, outline=stal_c, width=max(2, K // 3))
    d.rounded_rectangle((x0 + 2 * K, y0 + 2.4 * K, x0 + 78 * K, y0 + 4.6 * K), radius=K // 2, fill=(170, 167, 162, 255), outline=stal_c, width=max(1, K // 5))
    # ramię deszczownicy ze ściany i tarcza Ø 25 cm, środek 27 cm od ściany
    cx, cy, r = W // 2, 27 * K, 12.5 * K
    cien = Image.new('L', (W, H), 0); ImageDraw.Draw(cien).ellipse((cx - r + K, cy - r + 1.5 * K, cx + r + K, cy + r + 1.5 * K), fill=90)
    img = Image.composite(Image.new('RGBA', (W, H), (60, 55, 50, 255)), img, cien.filter(ImageFilter.GaussianBlur(1.5 * K)).point(lambda v: int(v * 0.5)))
    d = ImageDraw.Draw(img)
    d.rectangle((cx - 1.1 * K, 0, cx + 1.1 * K, cy), fill=stal_c); d.rectangle((cx - 0.4 * K, 0, cx + 0.2 * K, cy), fill=stal_j)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=stal, outline=stal_c, width=max(2, K // 3))
    rng = np.random.default_rng(7)
    for _ in range(140):
        a, q = rng.uniform(0, 2 * np.pi), r * 0.85 * np.sqrt(rng.uniform())
        px, py = cx + q * np.cos(a), cy + q * np.sin(a); d.ellipse((px - K * 0.35, py - K * 0.35, px + K * 0.35, py + K * 0.35), fill=(160, 157, 152, 255))
    d.ellipse((cx - 1.6 * K, cy - 1.6 * K, cx + 1.6 * K, cy + 1.6 * K), fill=stal_c)
    # jedna szyba wzdłuż lewego boku, od ściany przez całą głębokość, dwa mocowania
    sz, jas, x = (95, 160, 145, 255), (205, 228, 222, 255), int(1.5 * K)
    d.rectangle((x, 0, x + 1.4 * K, H - 2 * K), fill=jas); d.line((x, 0, x, H - 2 * K), fill=sz, width=K // 2); d.line((x + 1.4 * K, 0, x + 1.4 * K, H - 2 * K), fill=sz, width=K // 2)
    for y in (2 * K, H - 10 * K):
        d.rounded_rectangle((x - 1.2 * K, y, x + 2.6 * K, y + 4.5 * K), radius=K // 2, fill=(150, 146, 140, 255), outline=(110, 106, 100, 255), width=max(1, K // 4))
    return img.resize((120 * PX, 90 * PX), Image.LANCZOS)


def main():
    zapisz(stol_owalny(180, 100, 0, False, kwiat=False), 'stol_owalny')
    zapisz(stol_owalny(170, 95, 2, False), 'stol_owalny_4')
    zapisz(stol_owalny(200, 105, 2, True), 'stol_owalny_6')
    zapisz(stol_owalny(250, 110, 3, True), 'stol_owalny_8')
    for l in (180, 240, 300):
        zapisz(ciag_kuchenny(l), f'ciag_kuchenny_{l}')
    zapisz(walkin_szyba(), 'prysznic_walkin_szyba')
    zapisz(wczytaj('lozko_160'), 'lozko_140')


if __name__ == '__main__':
    main()
