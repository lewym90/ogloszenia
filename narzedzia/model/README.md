# Trening modelu „Obróbka AM” (dalsza nauka)

Model w aplikacji: `modele/am1.bin` + `am1.json` (eksport z `am1.pt`). Tutaj wszystko, żeby uczyć go dalej.

## Co jest w repozytorium
- `baza.py` — sieć v1 i funkcje pomocnicze (sRGB↔liniowe, cechy, pola losowe).
- `trening.py` — trening właściwy (sieć 489 tys. wag, bezpieczniki `HY.naloz` w stracie, EMA). Uruchomienie:
  `python3 trening.py <kroki> <nazwa> [start.pt]`, np. `python3 trening.py 4000 am2 am1.pt` (CPU, 2 rdzenie: ~0,4 s/krok).
- `am1.pt` — wagi obecnego modelu (punkt startowy).
- `zbior.json` — 552 zdjęcia wnętrz CC0 (Openverse: rawpixel, StockSnap) z adresami miniatur.
- `szukaj4.py`, `pobierz.py` — szukanie i pobieranie (Openverse, nagłówek `User-Agent: curl/8.5.0`, limit 200 zapytań i ~1000 miniatur dziennie; Wikimedia przez Openverse nie działa).
- `kuracja2.py` + `klip.py` (CLIP: tylko prawdziwe zdjęcia wnętrz) — odsiew; wynik → lista do `zbior.json`.
- `eksport.py am2.pt ../../modele/am2` — wagi do aplikacji (float16); `amtest.mjs` — ten sam kod co w aplikacji, w node.

## Czego NIE ma w repozytorium (i nie wolno dodawać)
- `surowe/` — pobrane zdjęcia CC0 (~850 MB): `pobierz.py` odtwarza je z listy.
- `pary/` — prawdziwe pary przed/po ze zdjęć właściciela: `pary/<nazwa>-org.jpg` (oryginał) + `pary/<nazwa>-hyb.jpg` (wynik ChatGPT przepuszczony przez hybrydę: `HY.przygotuj` + `HY.naloz`, kolor 1,6). Zdjęcia prywatne — tylko lokalnie.
- `test/kuchnia-org.jpg` + `test/kuchnia-hyb.jpg` — para do uczciwego testu (model jej nie widzi).

## Zasady przy nowych parach
- Pary, w których ChatGPT zmienił materiał (np. granatowa ściana → biała, szare lamele → drewniane), wyrzucamy — model nauczyłby się zmyślać.
- Najbardziej brakuje: ciemnych, wieczornych zdjęć z różnych mieszkań.
- Po treningu: sprawdzić na zdjęciach właściciela, na profesjonalnych (mają się prawie nie zmieniać) i na obcych mieszkaniach; dopiero potem eksport i nowa wersja aplikacji.
