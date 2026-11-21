# v4: bezpieczniki koloru z aplikacji wbudowane w trening (model uczy się dokładnie tego, co potem zobaczy użytkownik),
# strata w Lab, czystszy zbiór (filtr CLIP), wzorce z Otodom, para salonu z ChatGPT (kuchnia zostaje do uczciwego testu),
# częstsze ciemne wieczorne ujęcia przy LED-ach, większa sieć.
import torch, torch.nn as nn, torch.nn.functional as F, numpy as np, cv2, json, os, sys, time, math
from baza import pole, srgb2lin, lin2srgb, cechy
torch.set_num_threads(2)
GY, GX, K = 12, 16, 10
H0, W0 = 192, 256
KOLOR = 1.6
OCH = 0.7
XN, ZN = 0.950456, 1.088754
COS5, SIN5 = math.cos(math.radians(5)), math.sin(math.radians(5))


from scipy.interpolate import PchipInterpolator
def styl(im, ref=None):
    # v5 „styl domu”: rozjaśnione średnie tony i jasne światła, ale głęboka czerń zostaje (bez mgły),
    # biel/szarości → ciepły krem, materiały trochę żywsze — odcienie bez zmian
    lab = cv2.cvtColor(im.astype(np.float32) / 255, cv2.COLOR_BGR2Lab); L, A, B = cv2.split(lab)
    p2, p50, p97 = np.percentile(L, [2, 50, 97])
    q2 = min(p2, 10.0); q50 = max(p50, 78.0); q97 = min(max(p97, 95.5), 97.0)
    xs = [0, p2, p50, p97, 100]; ys = [0, q2, q50, q97, 100]
    xs, ys = np.maximum.accumulate(np.array(xs) + np.arange(5) * 1e-3), np.maximum.accumulate(np.array(ys) + np.arange(5) * 1e-3)
    L2 = PchipInterpolator(xs, ys)(L).astype(np.float32)
    C = np.hypot(A, B); w = np.clip((12 - C) / 6, 0, 1) * np.clip((L2 - 45) / 25, 0, 1) * 0.9
    A = A + (2.5 - A) * w; B = B + (8.3 - B) * w
    wz = 1 + 0.45 * np.clip((C - 6) / 10, 0, 1) * np.clip(1 - C / 70, 0, 1)
    A = A * wz; B = B * wz
    out = cv2.cvtColor(cv2.merge([L2, A.astype(np.float32), B.astype(np.float32)]), cv2.COLOR_Lab2BGR)
    return (out.clip(0, 1) * 255 + 0.5).astype(np.uint8)

def lab(x):  # x: B,3,H,W liniowe RGB → L,a,b (jak lab() w js/hybryda.js)
    r, g, b = x[:, 0], x[:, 1], x[:, 2]
    X = (0.412453 * r + 0.357580 * g + 0.180423 * b) / XN
    Y = 0.212671 * r + 0.715160 * g + 0.072169 * b
    Z = (0.019334 * r + 0.119193 * g + 0.950227 * b) / ZN
    f = lambda t: torch.where(t > 0.008856, t.clamp_min(1e-9) ** (1 / 3), 7.787 * t + 16 / 116)
    fx, fy, fz = f(X), f(Y), f(Z)
    L = torch.where(Y > 0.008856, 116 * fy - 16, 903.3 * Y)
    return L, 500 * (fx - fy), 200 * (fy - fz)

def zlab(L, a, b):  # Lab → sRGB 0..1
    fy = (L + 16) / 116; fx = fy + a / 500; fz = fy - b / 200
    fi = lambda t: torch.where(t > 0.206893, t ** 3, (t - 16 / 116) / 7.787)
    X = fi(fx) * XN; Y = torch.where(L > 8, fy ** 3, L / 903.3); Z = fi(fz) * ZN
    R = 3.240479 * X - 1.537150 * Y - 0.498535 * Z
    G = -0.969256 * X + 1.875992 * Y + 0.041556 * Z
    B = 0.055648 * X - 0.204043 * Y + 1.057311 * Z
    return lin2srgb(torch.stack([R, G, B], 1))

def naloz(x, M, kolor=KOLOR):  # wierna kopia HY.naloz (siła 1)
    B, _, H, W = x.shape
    Mf = F.interpolate(M, size=(H, W), mode='bilinear', align_corners=False).view(B, K, 3, H, W)
    t = (cechy(x).unsqueeze(2) * Mf).sum(1)
    Lo, Ao, Bo = lab(srgb2lin(x)); Lt, At, Bt = lab(srgb2lin(t.clamp(0, 1)))
    Co = torch.sqrt(Ao * Ao + Bo * Bo + 1e-12); Ct = torch.sqrt(At * At + Bt * Bt + 1e-12)
    m = ((Co / (Lo + 3) - 0.5) / 0.7).clamp(0, 1)
    Lt = torch.where(Lt > Lo, Lo + (Lt - Lo) * (1 - OCH * m), Lt)
    kom = ((Lt + 5) / (Lo + 5)).clamp(1, 1.8)
    Cc = torch.minimum(Ct, Co * kom * kolor + 1)
    ox, oy, tx, ty = Ao / Co, Bo / Co, At / Ct, Bt / Ct
    cos = ox * tx + oy * ty; sin = ox * ty - oy * tx
    s = torch.where(sin >= 0, torch.full_like(sin, SIN5), torch.full_like(sin, -SIN5))
    ux = torch.where(cos >= COS5, tx, ox * COS5 - oy * s); uy = torch.where(cos >= COS5, ty, ox * s + oy * COS5)
    Am, Bm = Cc * ux, Cc * uy
    neu = ((12 - Co) / 6).clamp(0, 1)
    An, Bn = At.clamp(-3, 4), Bt.clamp(-2, 9)
    return zlab(Lt.clamp(0, 100), neu * An + (1 - neu) * Am, neu * Bn + (1 - neu) * Bm)

class Siec(nn.Module):
    def __init__(s, c1=24, c2=48, c3=96):
        super().__init__()
        cv = lambda i, o, st=1: nn.Conv2d(i, o, 3, st, 1)
        s.d1, s.d2, s.d3, s.d4 = cv(3, c1, 2), cv(c1, c2, 2), cv(c2, c3, 2), cv(c3, c3, 2)
        s.g1, s.g2 = cv(c3, c3, 2), cv(c3, c3, 2)
        s.f1, s.f2 = nn.Linear(c3, c3), nn.Linear(c3, c3)
        s.l1, s.l2 = cv(c3, c3), cv(c3, c3)
        s.wy = nn.Conv2d(c3, K * 3, 1)
        nn.init.zeros_(s.wy.weight); nn.init.zeros_(s.wy.bias)
        ident = torch.zeros(K * 3); ident[3] = 1; ident[7] = 1; ident[11] = 1
        s.register_buffer('ident', ident.view(1, K * 3, 1, 1))
    def forward(s, x):
        h = F.relu(s.d1(x)); h = F.relu(s.d2(h)); h = F.relu(s.d3(h)); h = F.relu(s.d4(h))
        g = F.relu(s.g1(h)); g = F.relu(s.g2(g)); g = s.f2(F.relu(s.f1(g.mean((2, 3)))))
        l = s.l2(F.relu(s.l1(h)))
        return s.wy(F.relu(l + g[:, :, None, None])) + s.ident

def do_t(im): return torch.from_numpy(cv2.cvtColor(im, cv2.COLOR_BGR2RGB)).permute(2, 0, 1).float() / 255
def male(im, bok=384):
    h, w = im.shape[:2]; sk = bok / max(h, w)
    return cv2.resize(im, (round(w * sk), round(h * sk)), interpolation=cv2.INTER_AREA)

def popsuj(T):  # v5: dodatkowo „telefon HDR wieczorem”: ciemne średnie tony przy jasnych lampach/oknach, plamy światła
    B, _, h, w = T.shape
    L = srgb2lin(T)
    ill = pole(B, h, w, 3, 0.3, 1.0) ** (torch.rand(B, 1, 1, 1) * 1.3)
    plamy = (torch.rand(B, 1, 1, 1) < 0.4).float()
    ill = ill * (1 - plamy) + plamy * (pole(B, h, w, 3, 0.2, 1.0) ** 1.3)          # światło z lamp, ciemne kąty
    wiecz = (torch.rand(B, 1, 1, 1) < 0.35).float()
    ekspo = 2 ** (torch.rand(B, 1, 1, 1) * 2.6 - 2.2 - wiecz * 0.6)
    t1 = (torch.rand(B, 1, 1, 1) * 2 - 1) * 0.35
    t1 = t1 * (1 - wiecz) + wiecz * (-0.05 - torch.rand(B, 1, 1, 1) * 0.25)
    gain1 = torch.cat([1 + t1, torch.ones_like(t1), 1 - t1], 1)
    t2 = (torch.rand(B, 1, 1, 1) * 2 - 1) * 0.3
    gain2 = torch.cat([1 + t2, torch.ones_like(t2), 1 - t2], 1)
    mix = pole(B, h, w, 2, 0, 1) * (torch.rand(B, 1, 1, 1) < 0.5)
    gain = gain1 * (1 - mix) + gain2 * mix
    tint = 1 + (torch.rand(B, 3, 1, 1) - 0.5) * 0.08
    hdr = (torch.rand(B, 1, 1, 1) < 0.5).float()
    e = ekspo * (1 - hdr) + hdr * torch.ones_like(ekspo)
    X = lin2srgb((L * ill * e * gain * tint).clamp(0, 1))
    gam = 1 + hdr * torch.rand(B, 1, 1, 1) * 1.3                                       # ciemne średnie tony, światła zostają jasne
    X = X.clamp(1e-6, 1) ** gam
    g = 0.85 + torch.rand(B, 1, 1, 1) * 0.3; X = X.clamp(1e-6, 1) ** g
    s = (torch.rand(B, 1, 1, 1) - 0.5) * 0.6; X = (X + s * X * (1 - X) * (2 * X - 1) * -2).clamp(0, 1)
    Y = X.mean(1, keepdim=True); X = (Y + (X - Y) * (0.55 + torch.rand(B, 1, 1, 1) * 0.5)).clamp(0, 1)
    X = X + torch.randn_like(X) * (torch.rand(B, 1, 1, 1) * 0.02) * (1.3 - X.mean(1, keepdim=True))
    return X.clamp(0, 1)

def wycinek(ts, ch_s=(0.6, 1.0), flip=True):
    _, h, w = ts[0].shape
    s = np.random.uniform(*ch_s); ch, cw = int(h * s), int(min(w, h * s * 4 / 3))
    y, x = np.random.randint(0, h - ch + 1), np.random.randint(0, w - cw + 1)
    f = flip and np.random.rand() < 0.5
    out = []
    for t in ts:
        c = F.interpolate(t[:, y:y + ch, x:x + cw].unsqueeze(0), size=(H0, W0), mode='bilinear', align_corners=False, antialias=True)
        out.append(c.flip(3) if f else c)
    return out

def strata(wy, T):
    Lw, aw, bw = lab(srgb2lin(wy)); Lt, at, bt = lab(srgb2lin(T))
    d = ((Lw - Lt).abs() + 0.7 * (aw - at).abs() + 0.7 * (bw - bt).abs()).mean() / 100
    pw, pt = F.avg_pool2d(wy, 8), F.avg_pool2d(T, 8)
    return d + 0.5 * (pw - pt).abs().mean()

def dE(a, b):
    La, aa, ba = lab(srgb2lin(a)); Lb, ab, bb = lab(srgb2lin(b))
    return torch.sqrt((La - Lb) ** 2 + (aa - ab) ** 2 + (ba - bb) ** 2).mean().item()

if __name__ == '__main__':
    kroki = int(sys.argv[1]) if len(sys.argv) > 1 else 15000
    nazwa = sys.argv[2] if len(sys.argv) > 2 else 'model4'
    # zdjęcia CC0 (narzedzia/model/surowe/<id>.jpg, lista: zbior.json) → cele „styl domu”
    zb = json.load(open('zbior.json')); zb = [z['id'] for z in zb]; np.random.seed(0); np.random.shuffle(zb)
    nval = 24
    wczyt = lambda i: cv2.imread(f'surowe/{i}.jpg')
    cele = [do_t(styl(male(wczyt(i)))) for i in zb[nval:] if wczyt(i) is not None]
    val = [do_t(styl(male(wczyt(i)))) for i in zb[:nval] if wczyt(i) is not None]
    # prawdziwe pary przed/po (zdjęcia właściciela → ChatGPT + hybryda): pary/<nazwa>-org.jpg + pary/<nazwa>-hyb.jpg — NIE w repozytorium
    import glob as _g
    PARY = [(do_t(male(cv2.imread(o), 512)), do_t(male(cv2.imread(o.replace('-org.jpg', '-hyb.jpg')), 512))) for o in sorted(_g.glob('pary/*-org.jpg')) if os.path.exists(o.replace('-org.jpg', '-hyb.jpg'))]
    # para testowa (nieuczona), jeśli jest: test/kuchnia-org.jpg + test/kuchnia-hyb.jpg
    if os.path.exists('test/kuchnia-org.jpg'):
        ko = do_t(male(cv2.imread('test/kuchnia-org.jpg'), 512)); kh = do_t(male(cv2.imread('test/kuchnia-hyb.jpg'), 512))
    else:
        ko = kh = val[0]
    ema = Siec()
    print('cele', len(cele), 'walidacja', len(val), 'pary', len(PARY), flush=True)
    torch.manual_seed(0); np.random.seed(1)
    VT = torch.cat([wycinek([val[i % nval]])[0] for i in range(48)]); VX = popsuj(VT)
    KX = F.interpolate(ko.unsqueeze(0), size=(H0, W0), mode='bilinear', antialias=True); KH = F.interpolate(kh.unsqueeze(0), size=(H0, W0), mode='bilinear', antialias=True)
    net = Siec(); (net.load_state_dict(torch.load(sys.argv[3])) if len(sys.argv) > 3 else None); print('parametry', sum(p.numel() for p in net.parameters()), flush=True)
    ema.load_state_dict(net.state_dict()); [p.requires_grad_(False) for p in ema.parameters()]
    opt = torch.optim.Adam(net.parameters(), 1e-3)
    sch = torch.optim.lr_scheduler.OneCycleLR(opt, 5e-4, total_steps=kroki, pct_start=0.05)
    t0 = time.time(); best = 9
    for it in range(1, kroki + 1):
        T = []
        for _ in range(12):
            T.append(wycinek([cele[np.random.randint(len(cele))]])[0])  # bez zdjęć z Otodom (cudze, chronione)
        T = torch.cat(T).clamp(0, 1); X = popsuj(T)
        for j in range(2):  # prawdziwe pary przed/po (zdjęcia użytkownika → ChatGPT+hybryda)
            if PARY and np.random.rand() < 0.35:
                a, b = wycinek(list(PARY[np.random.randint(len(PARY))]), (0.7, 1.0)); X[j:j + 1] = a; T[j:j + 1] = b
        l = strata(naloz(X, net(X)), T); opt.zero_grad(); l.backward()
        torch.nn.utils.clip_grad_norm_(net.parameters(), 1.0); opt.step(); sch.step()
        with torch.no_grad():
            for pe, pn in zip(ema.parameters(), net.parameters()): pe.mul_(0.998).add_(pn, alpha=0.002)
        if it % 500 == 0 or it == 1:
            with torch.no_grad():
                vl = strata(naloz(VX, ema(VX)), VT).item(); kd = dE(naloz(KX, ema(KX)), KH)
            print(f'{it} strata {l.item():.4f} walidacja {vl:.4f} kuchnia dE {kd:.2f} (bez modelu {dE(KX, KH):.2f}) {time.time() - t0:.0f}s', flush=True)
            torch.save(ema.state_dict(), nazwa + '.pt')
    torch.save(ema.state_dict(), nazwa + '.pt')
