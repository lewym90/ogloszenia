import torch, numpy as np, json, sys
sd = torch.load(sys.argv[1]); man = {}; parts = []; off = 0
for k, v in sd.items():
    if k == 'ident': continue
    a = v.float().numpy().astype(np.float16).ravel(); man[k] = {'off': off, 'ksztalt': list(v.shape)}; parts.append(a); off += a.size
np.concatenate(parts).tofile(sys.argv[2] + '.bin'); json.dump(man, open(sys.argv[2] + '.json', 'w'))
print('wagi', off, 'bajtow', off * 2)
