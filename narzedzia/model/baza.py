# Własny model „Obróbka AM”: mała sieć przewiduje siatkę lokalnych modeli koloru (jak hybryda w aplikacji),
# więc z konstrukcji zmienia tylko światło i kolor — nie umie dorysować ani zmienić kształtu czy napisu.
# Pary uczące: ładne zdjęcia wnętrz (CC0/CC BY z Openverse) → sztucznie popsute jak wieczorne zdjęcie z telefonu.
import torch, torch.nn as nn, torch.nn.functional as F, numpy as np, cv2, json, glob, os, math, time, sys
torch.set_num_threads(2)
GY, GX, K = 12, 16, 10
H0, W0 = 192, 256

def srgb2lin(x): return torch.where(x <= 0.04045, x / 12.92, ((x + 0.055) / 1.055) ** 2.4)
def lin2srgb(x): x = x.clamp(0, 1); return torch.where(x <= 0.0031308, x * 12.92, 1.055 * x.clamp_min(1e-8) ** (1 / 2.4) - 0.055)

def cechy(x):  # x: B,3,H,W (RGB 0..1) → B,10,H,W — ta sama kolejność co w js/hybryda.js
    r, g, b = x[:, 0:1], x[:, 1:2], x[:, 2:3]
    return torch.cat([torch.ones_like(r), r, g, b, r * r, g * g, b * b, r * g, g * b, r * b], 1)

def naloz(x, M):  # M: B,30,GY,GX (k*3+c) → wynik B,3,H,W
    B, _, H, W = x.shape
    Mf = F.interpolate(M, size=(H, W), mode='bilinear', align_corners=False).view(B, K, 3, H, W)
    return (cechy(x).unsqueeze(2) * Mf).sum(1)

class Siec(nn.Module):
    def __init__(s):
        super().__init__()
        c = lambda i, o, st=1: nn.Conv2d(i, o, 3, st, 1)
        s.d1, s.d2, s.d3, s.d4 = c(3, 16, 2), c(16, 32, 2), c(32, 64, 2), c(64, 64, 2)   # 96x128 … 12x16
        s.g1, s.g2 = c(64, 64, 2), c(64, 64, 2)                                         # 6x8, 3x4
        s.f1, s.f2 = nn.Linear(64, 64), nn.Linear(64, 64)
        s.l1, s.l2 = c(64, 64), c(64, 64)
        s.wy = nn.Conv2d(64, K * 3, 1)
        nn.init.zeros_(s.wy.weight); nn.init.zeros_(s.wy.bias)
        ident = torch.zeros(K * 3); ident[1 * 3 + 0] = 1; ident[2 * 3 + 1] = 1; ident[3 * 3 + 2] = 1
        s.register_buffer('ident', ident.view(1, K * 3, 1, 1))
    def forward(s, x):  # x: B,3,192,256
        h = F.relu(s.d1(x)); h = F.relu(s.d2(h)); h = F.relu(s.d3(h)); h = F.relu(s.d4(h))
        g = F.relu(s.g1(h)); g = F.relu(s.g2(g)); g = g.mean((2, 3))
        g = s.f2(F.relu(s.f1(g)))
        l = s.l2(F.relu(s.l1(h)))
        return s.wy(F.relu(l + g[:, :, None, None])) + s.ident

# ---------- dane ----------
def wczytaj_cele(lista, ref=None):
    cele = []
    for p in lista:
        im = cv2.imread(p)
        if im is None: continue
        h, w = im.shape[:2]; sk = 384 / max(h, w)
        im = cv2.resize(im, (round(w * sk), round(h * sk)), interpolation=cv2.INTER_AREA)
        if ref is not None: im = styl(im, ref)
        cele.append(torch.from_numpy(cv2.cvtColor(im, cv2.COLOR_BGR2RGB)).permute(2, 0, 1).float() / 255)
    return cele

def styl(im, ref, sila=1.0):
    # „styl domu”: jasność częściowo do rozkładu 15 zdjęć wzorcowych, biel lekko do ciepłego kremu
    lab = cv2.cvtColor(im.astype(np.float32) / 255, cv2.COLOR_BGR2Lab); L, A, B = cv2.split(lab)
    q = np.linspace(0, 100, 101); s_, d_ = np.percentile(L, q), np.percentile(ref, q)
    for i in range(1, 101): s_[i] = max(s_[i], s_[i - 1] + 1e-3)
    L2 = L + (np.interp(L, s_, d_) - L) * sila
    C = np.hypot(A, B); w = np.clip((18 - C) / 8, 0, 1) * np.clip((L2 - 40) / 25, 0, 1)
    A = A + (2.2 - A) * w; B = B + (8.5 - B) * w
    # materiały (drewno, tkaniny, rośliny): bogatsze, ale bez zmiany odcienia
    wz = 1 + 0.45 * np.clip((C - 6) / 10, 0, 1) * np.clip(1 - C / 70, 0, 1)
    A = A * wz; B = B * wz
    out = cv2.cvtColor(cv2.merge([L2.astype(np.float32), A.astype(np.float32), B.astype(np.float32)]), cv2.COLOR_Lab2BGR)
    return (out.clip(0, 1) * 255 + 0.5).astype(np.uint8)

def pole(B, h, w, n, lo, hi):  # gładkie losowe pole (oświetlenie / mieszane światło)
    z = torch.rand(B, 1, n, n)
    return lo + (hi - lo) * F.interpolate(z, size=(h, w), mode='bicubic', align_corners=False).clamp(0, 1)

def popsuj(T):  # T: B,3,H,W sRGB 0..1 → zdjęcie „jak wieczorem z telefonu”
    B, _, h, w = T.shape
    L = srgb2lin(T)
    ill = pole(B, h, w, 3, 0.35, 1.0) ** torch.rand(B, 1, 1, 1)                 # nierówne światło, ciemne kąty
    ekspo = 2 ** (torch.rand(B, 1, 1, 1) * 2.6 - 2.2)                           # ciemniej (do −2,2 EV) lub lekko jaśniej
    t1 = (torch.rand(B, 1, 1, 1) * 2 - 1) * 0.35                                # zabarwienie: + ciepłe (żarówki), − zimne
    gain1 = torch.cat([1 + t1, torch.ones_like(t1), 1 - t1], 1)
    t2 = (torch.rand(B, 1, 1, 1) * 2 - 1) * 0.3
    gain2 = torch.cat([1 + t2, torch.ones_like(t2), 1 - t2], 1)
    mix = pole(B, h, w, 2, 0, 1) * (torch.rand(B, 1, 1, 1) < 0.5)               # mieszane światło w połowie przykładów
    gain = gain1 * (1 - mix) + gain2 * mix
    tint = 1 + (torch.rand(B, 3, 1, 1) - 0.5) * 0.08
    X = lin2srgb((L * ill * ekspo * gain * tint).clamp(0, 1))
    g = 0.85 + torch.rand(B, 1, 1, 1) * 0.3; X = X.clamp(1e-6, 1) ** g
    s = (torch.rand(B, 1, 1, 1) - 0.5) * 0.6; X = (X + s * X * (1 - X) * (2 * X - 1) * -2).clamp(0, 1)   # krzywa S / odwrotna
    Y = X.mean(1, keepdim=True); X = (Y + (X - Y) * (0.6 + torch.rand(B, 1, 1, 1) * 0.45)).clamp(0, 1)
    X = X + torch.randn_like(X) * (torch.rand(B, 1, 1, 1) * 0.018) * (1.3 - X.mean(1, keepdim=True))
    return X.clamp(0, 1)

def paczka(cele, B):
    out = []
    for _ in range(B):
        t = cele[np.random.randint(len(cele))]; _, h, w = t.shape
        s = np.random.uniform(0.6, 1.0); ch, cw = int(h * s), int(min(w, h * s * 4 / 3))
        y, x = np.random.randint(0, h - ch + 1), np.random.randint(0, w - cw + 1)
        c = t[:, y:y + ch, x:x + cw].unsqueeze(0)
        c = F.interpolate(c, size=(H0, W0), mode='bilinear', align_corners=False, antialias=True)
        if np.random.rand() < 0.5: c = c.flip(3)
        out.append(c)
    return torch.cat(out).clamp(0, 1)

def strata(wy, T):
    l1 = (wy - T).abs().mean()
    # dodatkowo jasność na dużą skalę (żeby światło całego pokoju się zgadzało)
    pw, pt = F.avg_pool2d(wy, 8), F.avg_pool2d(T, 8)
    return l1 + 0.5 * (pw - pt).abs().mean()

if __name__ == '__main__':
    kroki = int(sys.argv[1]) if len(sys.argv) > 1 else 12000
    ref = np.load('/tmp/wz/refL.npy')
    dobre = json.load(open('meta/dobre.json'))
    lista = [f'surowe/{i}.jpg' for i in dobre]
    np.random.seed(0); np.random.shuffle(lista)
    nval = max(8, len(lista) // 10)
    cele, val = wczytaj_cele(lista[nval:], ref), wczytaj_cele(lista[:nval], ref)
    print('cele', len(cele), 'walidacja', len(val), flush=True)
    torch.manual_seed(0)
    VT = paczka(val, 64); VX = popsuj(VT)
    net = Siec(); net.load_state_dict(torch.load('model_v2.pt')) if os.path.exists('model_v2.pt') else None; print('parametry', sum(p.numel() for p in net.parameters()), flush=True)
    opt = torch.optim.Adam(net.parameters(), 1e-3)
    sch = torch.optim.lr_scheduler.OneCycleLR(opt, 8e-4, total_steps=kroki, pct_start=0.05)
    t0 = time.time()
    for it in range(1, kroki + 1):
        T = paczka(cele, 12); X = popsuj(T)
        wy = naloz(X, net(X))
        l = strata(wy, T); opt.zero_grad(); l.backward(); opt.step(); sch.step()
        if it % 250 == 0 or it == 1:
            with torch.no_grad():
                vw = naloz(VX, net(VX)); vl = strata(vw, VT).item(); v0 = strata(VX, VT).item()
            print(f'{it} strata {l.item():.4f} walidacja {vl:.4f} (bez modelu {v0:.4f}) {time.time() - t0:.0f}s', flush=True)
            torch.save(net.state_dict(), 'model3.pt')
    torch.save(net.state_dict(), 'model3.pt')
