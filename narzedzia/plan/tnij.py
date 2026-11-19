#!/usr/bin/env python3
"""Tnie arkusz grafik właściciela na elementy biblioteki rzutu (Rzut AM).

Użycie:
  python3 narzedzia/plan/tnij.py <numer_arkusza> <plik_obrazu> [--podglad] [--pola 1,2,5]
  python3 narzedzia/plan/tnij.py --spis            # odbudowuje img/plan/biblioteka.json z plików

Arkusze 1–16 i 20: siatka 4×3 przedmiotów na magentowym (#FF00FF) albo przezroczystym tle.
Arkusze 17–19: siatka 3×3 próbek podłóg rozdzielonych białymi przerwami.
Które pole jest którym elementem — js/plan/biblioteka.js (pole „a: [arkusz, pole]”).
Wynik: img/plan/meble/<klucz>.webp, img/plan/podlogi/<klucz>.webp, img/plan/biblioteka.json (spis + wersja),
oraz /tmp/plan-podglad-<nr>.png do obejrzenia.
"""
import json, os, re, sys
import numpy as np
from PIL import Image, ImageFilter

KORZEN = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
BIB = os.path.join(KORZEN, 'js', 'plan', 'biblioteka.js')
MEBLE_DIR = os.path.join(KORZEN, 'img', 'plan', 'meble')
PODLOGI_DIR = os.path.join(KORZEN, 'img', 'plan', 'podlogi')
SPIS = os.path.join(KORZEN, 'img', 'plan', 'biblioteka.json')
ARKUSZE_PODLOG = {17, 18, 19}


def mapa():
    """(arkusz, pole) → (rodzaj, klucz) z biblioteka.js."""
    s = open(BIB, encoding='utf-8').read()
    m = {}
    for k, a, b in re.findall(r"^\s*(\w+): E\('[^']*', [\d.]+, [\d.]+, '[^']*', '\w+', \[(\d+), (\d+)\]", s, re.M):
        m[(int(a), int(b))] = ('mebel', k)
    for k, a, b in re.findall(r"^\s*(\w+): P\('[^']*', \[(\d+), (\d+)\]", s, re.M):
        m[(int(a), int(b))] = ('podloga', k)
    for (a, b), klucze in POPRAWKI.items():  # arkusze z poprawkami: jedno pole może zastąpić kilka elementów
        m[(a, b)] = ('mebel', klucze)
    return m


# Arkusz 21 (19.11.2026): przedmioty, które w arkuszach 1–20 wyszły od frontu zamiast z góry
POPRAWKI = {(21, 1): ['wieszak_ubrania'], (21, 2): ['pralka'], (21, 3): ['suszarka'], (21, 4): ['pralka_suszarka'], (21, 5): ['piec_gazowy'],
            (21, 6): ['regal_metalowy', 'regal_magazynowy'], (21, 7): ['regal_sklepowy'], (21, 8): ['hustawka'], (21, 9): ['szafka_narzedziowa'],
            (21, 10): ['pompa_ciepla', 'klimatyzator'], (21, 11): ['winiarka'], (21, 12): ['grzejnik', 'grzejnik_lazienkowy'],
            # arkusz 22: wyraźne fronty z arkuszy 1–21
            (22, 1): ['piec_gazowy'], (22, 2): ['hustawka'], (22, 3): ['kominek'], (22, 4): ['pianino'], (22, 5): ['szafka_lazienkowa'], (22, 6): ['bojler'],
            (22, 7): ['wieszak_lawka'], (22, 8): ['grill'], (22, 9): ['piec_co'], (22, 10): ['kartony'], (22, 11): ['szafka_niska'], (22, 12): ['skrzynia_lawka'],
            # arkusz 23: widoczne paski frontów i boki
            (23, 1): ['szafka_kuchenna'], (23, 2): ['slup_okragly'], (23, 3): ['slup_kwadratowy'], (23, 4): ['regal_garderoba'], (23, 5): ['toaletka'], (23, 6): ['kontener'],
            (23, 7): ['recepcja'], (23, 8): ['kuchenka'], (23, 9): ['zmywarka'], (23, 10): ['koza'], (23, 11): ['sauna'], (23, 12): ['lodowka']}


def maska_tla(rgba):
    """1 = tło. Przezroczystość, a gdy jej brak — magenta (z tolerancją na kompresję i cienie)."""
    a = rgba[..., 3].astype(np.float32)
    if (a < 250).mean() > 0.05:
        return a < 40
    r, g, b = [rgba[..., i].astype(np.float32) for i in range(3)]
    magenta = (r > 150) & (b > 150) & (g < 0.62 * np.minimum(r, b)) & (np.abs(r - b) < 90)
    return magenta


def alfa_i_odmagentowanie(rgba):
    """Miękka krawędź i usunięcie różowej poświaty na brzegach."""
    out = rgba.astype(np.float32).copy()
    if (rgba[..., 3] < 250).mean() > 0.05:
        return rgba
    r, g, b = out[..., 0], out[..., 1], out[..., 2]
    # „magentowość”: ile r i b przewyższają g
    mg = np.clip(np.minimum(r, b) - g, 0, 255)
    alfa = np.clip(1.0 - (mg - 10) / 235.0, 0, 1)  # piksel = α·przedmiot + (1−α)·magenta; przedmioty są neutralne (r,b ≈ g)
    tlo = maska_tla(rgba)
    alfa[tlo] = 0
    # odmieszanie: piksel brzegu = α·kolor + (1−α)·magenta → odzyskaj kolor przedmiotu
    A = np.clip(alfa, 0.05, 1)[..., None]
    M = np.array([255.0, 0.0, 255.0])
    czysty = (out[..., :3] - (1 - A) * M) / A
    out[..., :3] = np.where((alfa < 0.999)[..., None], czysty, out[..., :3])
    # resztkowy różowy nalot zbij do poziomu zieleni
    r, g, b = out[..., 0], out[..., 1], out[..., 2]
    nadmiar = np.clip(np.minimum(r, b) - g, 0, None) * (alfa < 0.999)
    out[..., 0] = r - nadmiar * 0.6
    out[..., 2] = b - nadmiar * 0.6
    out[..., 3] = alfa * 255
    return np.clip(out, 0, 255).astype(np.uint8)


def podzialy(profil, n):
    """Pozycje n-1 cięć: najmniejsza zawartość w pobliżu równych podziałów."""
    L = len(profil); cięcia = [0]
    wygl = np.convolve(profil, np.ones(9) / 9, mode='same')
    for k in range(1, n):
        c = int(L * k / n); r = int(L * 0.12)
        lo, hi = max(1, c - r), min(L - 1, c + r)
        cięcia.append(lo + int(np.argmin(wygl[lo:hi])))
    cięcia.append(L)
    return cięcia


# kwiaty i rośliny z prawdziwym różem/fioletem — bez zbijania różowego nalotu w całym obrazie
NATURALNY_ROZ = {'rabata', 'donica_mala', 'drzewo_male', 'oczko_wodne', 'skrzynka_kwiaty', 'roslina_mala'}
POLA = None  # --pola 1,2,5 — tnie tylko wybrane pola (reszta arkusza do ponownego wygenerowania)


def tnij_meble(nr, img, podglad):
    """Elementy = spójne kawałki obrazu (po lekkim pogrubieniu, żeby stół i krzesła były jednym). Kawałek należy do pola,
    w którym leży jego środek — szerokie przedmioty mogą wychodzić poza „swoją” kolumnę i nie zostaną przecięte."""
    from scipy import ndimage
    M = mapa()
    rgba = np.array(img.convert('RGBA'))
    H, W = rgba.shape[:2]
    fg = ~maska_tla(rgba)
    fg = ndimage.binary_opening(fg, iterations=1)  # szum JPEG
    zl = ndimage.binary_dilation(fg, iterations=max(4, W // 140))  # łączy części jednego przedmiotu
    etyk, n = ndimage.label(zl)
    obiekty = ndimage.find_objects(etyk)
    pola = {}
    for k, sl in enumerate(obiekty, 1):
        maska = (etyk[sl] == k) & fg[sl]
        if maska.sum() < (W * H) * 0.0004:
            continue
        cy = (sl[0].start + sl[0].stop) / 2; cx = (sl[1].start + sl[1].stop) / 2
        pole = int(cy // (H / 3)) * 4 + int(cx // (W / 4)) + 1
        pola.setdefault(pole, []).append(sl)
    os.makedirs(MEBLE_DIR, exist_ok=True)
    zapisane, kafle = [], []
    for pole in range(1, 13):
        if (nr, pole) not in M or (POLA and pole not in POLA):
            continue
        _, klucz = M[(nr, pole)]
        klucze = klucz if isinstance(klucz, list) else [klucz]; klucz = klucze[0]
        if pole not in pola:
            print(f'  pole {pole} ({klucz}): pusto — pomijam'); continue
        y0 = min(s_[0].start for s_ in pola[pole]); y1 = max(s_[0].stop for s_ in pola[pole])
        x0 = min(s_[1].start for s_ in pola[pole]); x1 = max(s_[1].stop for s_ in pola[pole])
        # dokładny obrys z maski bez pogrubienia
        f = fg[y0:y1, x0:x1]
        yy, xx = np.where(f)
        pad = 2
        a0, a1 = max(0, y0 + yy.min() - pad), min(H, y0 + yy.max() + pad + 1)
        b0, b1 = max(0, x0 + xx.min() - pad), min(W, x0 + xx.max() + pad + 1)
        # tylko piksele należące do kawałków tego pola (sąsiad wchodzący w prostokąt zostaje przezroczysty)
        ids = set()
        for s_ in pola[pole]:
            w_ = etyk[s_]; ids.update(np.unique(w_[w_ > 0]).tolist())
        wyc = alfa_i_odmagentowanie(rgba[a0:a1, b0:b1])
        if klucz not in NATURALNY_ROZ:  # magenta odbita w wiklinie, drewnie, frędzlach — zbij w całym przedmiocie
            f_ = wyc[..., :3].astype(np.float32); nad = np.clip(np.minimum(f_[..., 0], f_[..., 2]) - f_[..., 1] - 4, 0, None)
            f_[..., 0] -= nad * 1.0; f_[..., 2] -= nad * 1.0; wyc[..., :3] = np.clip(f_, 0, 255).astype(np.uint8)
        swoje = np.isin(etyk[a0:a1, b0:b1], list(ids))
        wyc[..., 3] = np.where(swoje, wyc[..., 3], 0)
        im = Image.fromarray(wyc, 'RGBA')
        im.thumbnail((900, 900), Image.LANCZOS)
        for k_ in klucze:
            im.save(os.path.join(MEBLE_DIR, f'{k_}.webp'), 'WEBP', quality=88, method=6)
        zapisane.extend(klucze); kafle.append((klucz, im))
        print(f'  pole {pole:2d} → {", ".join(klucze):22s} {im.size[0]}×{im.size[1]}')
    if podglad:
        zapisz_podglad(nr, kafle)
    return zapisane


def bez_szwu(t):
    """Tekstura powtarzalna: środek z oryginału, brzegi z wersji przesuniętej o pół (ciągłe przy powtarzaniu)."""
    a = np.array(t.convert('RGB')).astype(np.float32)
    h, w = a.shape[:2]
    b = np.roll(np.roll(a, h // 2, axis=0), w // 2, axis=1)
    yy, xx = np.mgrid[0:h, 0:w]
    dy = 1 - np.abs(yy - h / 2) / (h / 2); dx = 1 - np.abs(xx - w / 2) / (w / 2)
    m = np.clip(np.minimum(dx, dy) * 3.2, 0, 1)[..., None]  # 1 w środku, 0 przy brzegach
    return Image.fromarray((a * m + b * (1 - m)).astype(np.uint8))


# Podłogi z wyraźnymi fugami / łączeniami: kafel przycinany dokładnie na liniach — powtarza się bez szwu i bez „podwójnych” fug.
# Pozostałe (dywan, beton, żwir, trawa…) — przejście miękkie (bez_szwu).
LINIE_Y = {'dab', 'dab_miodowy', 'dab_szary', 'orzech', 'laminat', 'winyl', 'deska_tarasowa', 'kompozyt',
           'plytka', 'gres', 'marmur', 'szachownica', 'kostka', 'plyty_tarasowe', 'plytki_balkonowe', 'lupek', 'heksagon'}
LINIE_X = {'plytka', 'marmur', 'szachownica', 'plytki_balkonowe', 'plyty_tarasowe'}


def linie(gray, os_):
    """Środki ciemnych linii (fug, łączeń desek) wzdłuż osi: 0 = wiersze, 1 = kolumny. Pomija linie przy samym brzegu."""
    from scipy import ndimage
    prof = gray.mean(axis=1 - os_)
    hp = prof - ndimage.uniform_filter1d(prof, 15)
    prog = -max(6.0, hp.std() * 2.5)
    etyk, n = ndimage.label(hp < prog)
    L = [int(round(np.mean(np.where(etyk == k)[0]))) for k in range(1, n + 1)]
    return [x for x in L if 4 <= x <= len(prof) - 5]


def zakres(L, rozmiar):
    """Przycięcie na liniach: od pierwszej do ostatniej (całe okresy wzoru); przy jednej linii — od niej do dalszego brzegu."""
    if len(L) >= 2 and L[-1] - L[0] > rozmiar * 0.2:
        return L[0], L[-1]
    if len(L) == 1:
        return (L[0], rozmiar) if L[0] < rozmiar / 2 + rozmiar * 0.1 and rozmiar - L[0] > rozmiar * 0.3 else (0, L[0])
    return None


def tnij_podlogi(nr, img, podglad):
    M = mapa()
    rgb = np.array(img.convert('RGB')).astype(np.float32)
    biale = (rgb.min(axis=2) > 236)
    zaw = ~biale
    xs = podzialy(zaw.sum(axis=0).astype(np.float32), 3)
    ys = podzialy(zaw.sum(axis=1).astype(np.float32), 3)
    os.makedirs(PODLOGI_DIR, exist_ok=True)
    zapisane, kafle, rozmiary = [], [], {}
    for j in range(3):
        for i in range(3):
            pole = j * 3 + i + 1
            if (nr, pole) not in M or (POLA and pole not in POLA):
                continue
            _, klucz = M[(nr, pole)]
            x0, x1, y0, y1 = xs[i], xs[i + 1], ys[j], ys[j + 1]
            k = zaw[y0:y1, x0:x1]
            yy, xx = np.where(k)
            if len(yy) < 500:
                print(f'  pole {pole} ({klucz}): pusto — pomijam'); continue
            a0, a1, b0, b1 = y0 + yy.min() + 3, y0 + yy.max() - 3, x0 + xx.min() + 3, x0 + xx.max() - 3
            probka = img.convert('RGB').crop((b0, a0, b1, a1))
            pelny = probka.size[0]  # szerokość całej próbki = ok. 200 cm
            g = np.array(probka.convert('L')).astype(np.float32)
            c0, c1, r0, r1 = 0, probka.size[0], 0, probka.size[1]
            if klucz in LINIE_Y:
                z = zakres(linie(g, 0), probka.size[1])
                if z: r0, r1 = z
            if klucz in LINIE_X:
                z = zakres(linie(g, 1), probka.size[0])
                if z: c0, c1 = z
            sposob = 'na liniach' if (r0, r1, c0, c1) != (0, probka.size[1], 0, probka.size[0]) else 'miękkie przejście'
            t = probka.crop((c0, r0, c1, r1))
            if sposob == 'miękkie przejście':
                bok = min(t.size); t = bez_szwu(wyrownaj_swiatlo(t.crop((0, 0, bok, bok))))
            elif klucz not in LINIE_X:  # deski: w poziomie przejście miękkie (styk desek i tak bywa w dowolnym miejscu)
                t = bez_szwu_x(t)
            skala = 1024 / t.size[0]
            t = t.resize((1024, max(8, round(t.size[1] * skala))), Image.LANCZOS)
            cm = round(200 * (c1 - c0) / pelny)
            rozmiary[klucz] = cm
            t.save(os.path.join(PODLOGI_DIR, f'{klucz}.webp'), 'WEBP', quality=86, method=6)
            zapisane.append(klucz); kafle.append((klucz, t))
            print(f'  pole {pole} → {klucz:18s} {sposob}, kafel {cm} cm szerokości')
    if rozmiary:
        plik = os.path.join(PODLOGI_DIR, 'rozmiary.json')
        try: stare = json.load(open(plik, encoding='utf-8'))
        except Exception: stare = {}
        stare.update(rozmiary); json.dump(stare, open(plik, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    if podglad:
        zapisz_podglad(nr, kafle, powtorz=True)
    return zapisane


def wyrownaj_swiatlo(t):
    """Usuwa plamy światła i ciemniejsze rogi (inaczej powtarzają się na całej podłodze jak wzór)."""
    from scipy import ndimage
    a = np.array(t.convert('RGB')).astype(np.float32)
    jas = a.mean(axis=2)
    tlo = ndimage.gaussian_filter(jas, sigma=max(8, min(a.shape[:2]) / 6))
    a *= (jas.mean() / np.maximum(tlo, 1))[..., None]
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def bez_szwu_x(t):
    """Tylko w poziomie: prawy brzeg płynnie przechodzi w lewy."""
    a = np.array(t.convert('RGB')).astype(np.float32)
    h, w = a.shape[:2]
    b = np.roll(a, w // 2, axis=1)
    xx = np.arange(w)
    m = np.clip((1 - np.abs(xx - w / 2) / (w / 2)) * 3.2, 0, 1)[None, :, None]
    return Image.fromarray((a * m + b * (1 - m)).astype(np.uint8))


def zapisz_podglad(nr, kafle, powtorz=False):
    if not kafle:
        return
    K = 220
    o = Image.new('RGB', (K * 4, K * ((len(kafle) + 3) // 4)), (243, 240, 234))
    for n, (k, im) in enumerate(kafle):
        if powtorz:  # 2×2 powtórzenia — widać, czy jest szew
            t = im.resize((K // 2, max(4, round(K // 2 * im.size[1] / im.size[0])))); c = Image.new('RGB', (K, K))
            for a in range(2):
                for b in range(2):
                    c.paste(t, (a * K // 2, b * t.size[1]))
        else:
            c = Image.new('RGBA', (K, K), (243, 240, 234, 255)); t = im.copy(); t.thumbnail((K - 10, K - 10))
            c.alpha_composite(t, ((K - t.size[0]) // 2, (K - t.size[1]) // 2)); c = c.convert('RGB')
        o.paste(c, ((n % 4) * K, (n // 4) * K))
    sciezka = f'/tmp/plan-podglad-{nr}.png'; o.save(sciezka); print(f'  podgląd: {sciezka}')


def spis():
    meble = sorted(f[:-5] for f in os.listdir(MEBLE_DIR) if f.endswith('.webp')) if os.path.isdir(MEBLE_DIR) else []
    podlogi = sorted(f[:-5] for f in os.listdir(PODLOGI_DIR) if f.endswith('.webp')) if os.path.isdir(PODLOGI_DIR) else []
    stary = {}
    try:
        stary = json.load(open(SPIS, encoding='utf-8'))
    except Exception:
        pass
    wersja = int(stary.get('wersja', 0)) + 1
    try: rozm = json.load(open(os.path.join(PODLOGI_DIR, 'rozmiary.json'), encoding='utf-8'))
    except Exception: rozm = {}
    json.dump({'wersja': wersja, 'meble': meble, 'podlogi': podlogi, 'cmPodlog': rozm}, open(SPIS, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'Spis: {len(meble)} mebli, {len(podlogi)} podłóg (wersja {wersja}) → {SPIS}')


if __name__ == '__main__':
    if len(sys.argv) >= 2 and sys.argv[1] == '--spis':
        spis(); sys.exit(0)
    if len(sys.argv) < 3:
        print(__doc__); sys.exit(1)
    nr, plik = int(sys.argv[1]), sys.argv[2]
    if '--pola' in sys.argv:
        POLA = {int(x) for x in sys.argv[sys.argv.index('--pola') + 1].split(',')}
    img = Image.open(plik)
    print(f'Arkusz {nr}: {img.size[0]}×{img.size[1]}')
    (tnij_podlogi if nr in ARKUSZE_PODLOG else tnij_meble)(nr, img, '--podglad' in sys.argv)
    spis()
