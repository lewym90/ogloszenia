# AM Oferty

Aplikacja PWA dla AM Nieruchomości: karta nieruchomości, zdjęcia, generator ogłoszenia z faktów (bez AI), kontrola pustych słów i checklista publikacji. Synchronizacja na żywo między urządzeniami obu wspólników, praca offline.

- Telefon: jedna kolumna, dolny pasek. Tablet: lista + oferta. Laptop: lista + oferta + podgląd ogłoszenia na żywo.
- Dane: najpierw na urządzeniu (IndexedDB), potem serwer (Node + SQLite). Zmiany offline wysyłają się same po powrocie sieci.
- Zdjęcia: zmniejszane na urządzeniu (2560 px, JPG), pełne trzyma serwer, na urządzeniu zostają miniatury.

## Publikacja aplikacji (GitHub Pages)

Settings → Pages → Source: *Deploy from a branch* → Branch: `main`, folder `/ (root)` → Save. Adres: `https://lewym90.github.io/ogloszenia/`.

## Serwer (jednorazowo, Termius)

```
curl -fsSL https://raw.githubusercontent.com/lewym90/ogloszenia/main/serwer/install.sh -o /tmp/amoferty-install.sh && sudo bash /tmp/amoferty-install.sh
```

Konto wspólnika albo zmiana hasła: `sudo amoferty-konto`.
Aktualizacja serwera: to samo polecenie co instalacja (dane zostają).

## Instalacja na urządzeniach

- iPhone / iPad (Safari): Udostępnij → Do ekranu początkowego.
- Android (Chrome): menu ⋮ → Zainstaluj aplikację.
- Windows (Edge / Chrome): ikona instalacji w pasku adresu.

## Testy

```
node test/model.test.mjs     # generator, kontrola słów, checklista
node test/serwer.test.mjs    # serwer: konta, zmiany, historia, zdjęcia, SSE, push
python3 test/ui_test.py      # przeglądarka: telefon, tablet, laptop (opis w pliku)
```

Po każdej zmianie plików aplikacji podnieś `WERSJA` w `sw.js` (i w `js/app.js`), inaczej urządzenia zostaną przy starej wersji.
