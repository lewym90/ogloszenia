# Filtr treści (CLIP, zero-shot): zostają tylko prawdziwe zdjęcia wnętrz — bez obrazów, rysunków, starych fotek, portretów, przedmiotów z bliska.
import open_clip, torch, glob, os, json, numpy as np
from PIL import Image
torch.set_num_threads(2)
m, _, pre = open_clip.create_model_and_transforms('ViT-B-32', pretrained='laion2b_s34b_b79k'); m.eval()
tok = open_clip.get_tokenizer('ViT-B-32')
DOBRE = ["a real estate photo of a living room", "a real estate photo of a kitchen", "a real estate photo of a bedroom",
         "a real estate photo of a bathroom", "a photo of a dining room interior", "a photo of a hallway in an apartment",
         "a photo of a home office room", "a photo of a hotel room interior"]
ZLE = ["a painting", "a drawing or illustration", "an old vintage photograph", "a portrait photo of a person",
       "a close-up photo of a single object", "a photo of a building exterior", "a museum exhibit", "a black and white photo",
       "a scanned document or postcard", "a church interior", "a restaurant or cafe", "a photo of people working on laptops", "a flower bouquet"]
NEUTR = ["a 3d rendering of an interior"]
with torch.no_grad():
    T = m.encode_text(tok(DOBRE + ZLE + NEUTR)); T /= T.norm(dim=-1, keepdim=True)
cache = json.load(open('meta/klip.json')) if os.path.exists('meta/klip.json') else {}
pliki = [p for p in sorted(glob.glob('surowe/*.jpg')) if os.path.basename(p)[:-4] not in cache]
for n in range(0, len(pliki), 16):
    grupa = pliki[n:n + 16]; ims = []
    for p in grupa:
        try: ims.append(pre(Image.open(p).convert('RGB')))
        except Exception: ims.append(None)
    ok = [i for i, x in enumerate(ims) if x is not None]
    if not ok: continue
    with torch.no_grad():
        I = m.encode_image(torch.stack([ims[i] for i in ok])); I /= I.norm(dim=-1, keepdim=True)
        P = (100 * I @ T.T).softmax(-1).numpy()
    for j, i in enumerate(ok):
        cache[os.path.basename(grupa[i])[:-4]] = {'dobre': float(P[j, :len(DOBRE)].sum()), 'render': float(P[j, -1]),
                                                   'zle': ZLE[int(P[j, len(DOBRE):len(DOBRE) + len(ZLE)].argmax())]}
json.dump(cache, open('meta/klip.json', 'w'))
print('ocenionych', len(cache), 'wnetrza(>0.6)', sum(1 for v in cache.values() if v['dobre'] > 0.6))
