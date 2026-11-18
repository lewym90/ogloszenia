# AM Oferty — notatki do kontynuacji

Repo: lewym90/ogloszenia (aplikacja: https://lewym90.github.io/ogloszenia/).
Stan: wersja 1.3.0 (Wyposażenie, Klienci, Wizyty, Dokumenty; przewinięcie zostaje po zmianie; spis mieści się na szerokość) (18.11.2026). Firma rusza ok. luty/marzec 2027 — do tego czasu aplikacja testowa.

## Zasady (od właściciela)
- Zero ściemy: ogłoszenie tylko z faktów, wizualizacje oznaczone + oryginał, bez pustych słów i presji.
- Nie płacimy za konto deweloperskie Otodom — publikacja przez kopiowanie pól jednym kliknięciem.
- Wszystko po polsku, sprawdzać wygląd na telefonie, tablecie i laptopie przed oddaniem.
- Na serwerze są inne aplikacje: nie ruszać Caddyfile ani cudzych plików w conf.d.

## Architektura
- Front: `index.html`, `css/app.css`, `js/app.js` (interfejs), `js/dane.js` (IndexedDB, kolejka zmian, SSE, zdjęcia, push), `js/model.js` (pola karty, generator, kontrola słów, checklista — czyste funkcje), `js/zip.js`, `sw.js`.
- Serwer: `serwer/amoferty.mjs` (Node 24, node:sqlite, bez bibliotek), port 127.0.0.1:18930, usługa `amoferty`, dane `/var/lib/amoferty` (amoferty.db, zdjecia/, pliki/, kopie/), trasa Caddy `/etc/caddy/conf.d/amoferty.caddy` → `https://188-68-247-201.sslip.io/am-api`.
- Konta: `amoferty-konto` (login, imię, telefon, hasło). Urządzenie loguje się raz (token).
- Synchronizacja: zmiana = łatka pól {cid, oid, pola}; serwer stosuje po kolei (ostatni wygrywa per pole), zapisuje historię (kto/co/kiedy), idempotencja po `cid`. Klient: widok = baza z serwera + niewysłane łatki. SSE `/na-zywo` wysyła numer zmiany, klient dociąga `/zmiany?od=`.
- Zdjęcia: `PUT /zdjecie/<id>?oferta=&rodzaj=mini|pelne` (tylko JPG), `GET`, `DELETE`. Kopie bazy co godzinę (48 ostatnich + 1 dziennie przez 60 dni). Zdjęcia nie są w kopii bazy.
- Push: powiadamia tylko konta wspólnika (nie autora): nowa oferta, zmiana statusu, nowa prezentacja (otwiera ekran Wizyty).
- Dokumenty (serwer 1.2.0): `PUT /plik/<id>?oferta=&nazwa=` (PDF/JPG/PNG po sygnaturze, maks. 30 MB), `GET` (Bearer albo `?k=`), `DELETE`, `GET /klucz-plikow`. Klucz `k` = id urządzenia + ważność 24 h + HMAC (sekret `sekret_plikow` w ustawieniach), wylogowanie urządzenia go unieważnia. Potrzebny, bo PDF otwiera się w przeglądarce telefonu (iPhone: okno z „Gotowe”) bez nagłówka Authorization. Pliki nie są w kopii bazy (jak zdjęcia).

## Interfejs — ważne
- `wstaw(el, html)` nie podmienia fragmentu, w którym ktoś pisze; po wyjściu z pola odświeża. Od 1.3.0 zapamiętuje i przywraca przewinięcie kolumny — Safari (iPhone) zeruje je przy podmianie treści, przez co każde stuknięcie (źródło, pigułka) wyrzucało na górę ekranu. Chrome tego nie robi, więc testować w WebKit (`test/ui_safari_test.py`).
- Pola wyboru plików dokumentów (`input[data-dok]`) mają słuchacza na samym elemencie (ustawiany w `wstaw`), żeby odświeżenie w trakcie wyboru nie zgubiło plików.
- Pliki w IndexedDB na Safari: zapisywać kopię w pamięci (`new Blob([await plik.arrayBuffer()])`), nie obiekt File.
- Pole wyboru plików (`#zdj-dodaj`) nie może zależeć od stanu (inaczej podmiana w trakcie wyboru gubi zdjęcia) — wartość selecta ustawiana po renderze.
- Status „Gotowa do publikacji” / „Opublikowana” blokowany, dopóki checklista ma braki.
- Prowizja od najemcy: zaznaczenie „równa miesięcznemu czynszowi (bez opłat adm.)” — kwota liczona na bieżąco z ceny (`prowizjaKlienta()` w model.js), od 1.0.3.
- Cały ekran: `.uklad` ma `position: fixed; inset: 0`, przewijają się tylko kolumny. NIE blokować przewijania dokumentu (overflow hidden) — iOS w aplikacji z ekranu początkowego skraca wtedy okno o pasek statusu (czarny pas na dole). Naprawia to niewidoczny `#docspacer` wyższy niż ekran (jak w Planerze AM 2027 i Globtroterze), od 1.0.2. Blokada powiększania: viewport `maximum-scale=1, user-scalable=no`, `touch-action: pan-x pan-y`, blokada gestów w `app.js` (od 1.0.1).

## Wygląd (od 1.1.0) — 1:1 z renderem właściciela
- Render i grafiki od właściciela: koncept trzech ekranów (lista, karta oferty, ogłoszenie), tło `img/tlo.jpg` (czerń + złoty rzut), arkusz 12 ikon pocięty na `img/ikony/<sekcja>.png` (przezroczyste), monogram `img/monogram.png` (z ikony marki).
- Czcionki: Cormorant Garamond 500/600 (OFL, latin + latin-ext, z cyframi równej wysokości `lnum`) do nagłówków i cen, Archivo do tekstu. Marcellus usunięty (okrągłe zera wyglądały jak „OOO”).
- Lista: duże karty ze zdjęciem (rozmiar `sr` 1400 px), cena złotą szeryfową, status w pigułce, pierścień gotowości, serce = wyróżnienie (pole `ulubiona`, wyróżnione na górze). Dolny pasek pływający, szklany, złoty „+”.
- Oferta: nagłówek ze zdjęciem głównym, tytuł, złota linia, cena, status (pigułka z ukrytym selectem), segment Karta | Zdjęcia | Ogłoszenie | Kontrola (przyklejony przy przewijaniu). Sekcje karty jako akordeony 01–12 z ikonami i licznikiem uzupełnienia. Pola: etykiety wersalikami z odstępami, wybory ≤3 opcji jako pigułki, tak/nie jako suwaki, źródło danych jako 4 przyciski z ikonami.
- Telefon: Ogłoszenie i Kontrola jako osobne ekrany z nagłówkiem (‹ Ogłoszenie [Kopiuj]). Ogłoszenie podzielone na bloki z osobnym „Kopiuj”.
- Dzwonek: zmiany wspólnika (`GET /aktywnosc`), złota kropka = coś nowego od ostatniego otwarcia.
- Serwer 1.1.0 (zdjęcie średnie `rodzaj=sr`, `/aktywnosc`) — wymaga aktualizacji serwera tym samym poleceniem co instalacja. Klient działa też ze starym serwerem (bez kropki na dzwonku).

## Karta (od 1.2.0) — wg drugiego renderu właściciela
- Karta = spis kafelków (ikona, numer, nazwa, jedna linijka podsumowania, wskaźnik). Kolejność: 01–11 sekcje danych, 12 Zdjęcia, 13 Ogłoszenie, 14 Kontrola. Nie ma już zakładek ani akordeonów (ściana pól była nieczytelna).
- Od 1.3.0 kolejność: 01 Podstawy … 05 Koszty, 06 Wyposażenie, 07–11, 12 Właściciel i umowa, 13 Zdjęcia, 14 Ogłoszenie, 15 Kontrola, 16 Klienci, 17 Wizyty, 18 Dokumenty. Kafelki tylko dla wspólników (12, 16–18) mają przerywaną ramkę. Ikony 06, 16–18 to złote SVG w stylu arkusza (właściciel może wygenerować grafiki).
- Spis: `.spis { grid-template-columns: minmax(0,1fr) }` — bez tego najdłuższy tytuł („CO WARTO WIEDZIEĆ”) rozpychał wszystkie kafelki poza ekran (1.2.0).
- Każda sekcja to osobny ekran (`#/o/<id>/s/<sekcja>`): nagłówek ‹ ikona nazwa wskaźnik, pola w panelach grup (GRUPY w app.js) na zmianę jaśniejszych/ciemniejszych, krótkie pola po dwa obok siebie (POL, KROTKIE), samotne pole połówkowe dostaje całą szerokość, na dole przyciski poprzednia/następna.
- Źródło danych = znacznik w polu („Pomiar ▾”, czerwony „Źródło?” gdy brak), wybór w arkuszu.
- „Brak informacji”: opcja `nieznane` w Budynek/Technologia/Ogrzewanie/Okna, rok budowy przycisk „Brak informacji” (`rokNieznany`). Nigdy nie trafia do ogłoszenia (`wybor()` zwraca pusto, `znane()`).
- Pomieszczenia: długość × szerokość (pola `a`, `b`) → metraż `m` liczony sam (`metrazZWymiarow`), wymiary trafiają do ogłoszenia „17,81 m² (4,2 × 4,24 m)”. Bez wymiarów metraż wpisuje się ręcznie.
- Własny tytuł i wstęp przeniesione na ekran Ogłoszenie. Status oferty zmienia się w Kontroli.

## Obsługa oferty (od 1.3.0)
- Wyposażenie (sekcja `wyp`): kafelki do zaznaczania (`wyp` = obiekt {klucz: true}, słownik `WYPOSAZENIE` w model.js), `wypInne` (lista), `wypUwagi`, `wypBrak`. W ogłoszeniu blok „WYPOSAŻENIE” (najem) / „W CENIE ZOSTAJE” (sprzedaż) i pole portalu. W najmie zalecane w checkliście.
- Klienci, Wizyty, Dokumenty: każdy wpis to OSOBNE pole oferty (`kl_<id>`, `wz_<id>`, `dk_<klucz|id>`), więc dwaj wspólnicy dodający wpisy jednocześnie się nie nadpisują (ostatni wygrywa tylko w obrębie jednego wpisu). Nic z tego nie trafia do ogłoszenia (test w model.test.mjs).
- Klient: imię, telefon (Zadzwoń/SMS), e-mail, źródło, finansowanie (sprzedaż) / wprowadzka od (najem), notatka, RODO, status (arkusz). „Umów prezentację” tworzy wizytę z klientem i ustawia mu status „Umówiony”; „Odbyła się” ustawia „Po prezentacji”.
- Wizyta: data i godzina, klient, kto prowadzi, status (pigułki), wrażenia klienta (po odbytej — do raportu dla właściciela), notatka. Nadchodzące rosnąco, odbyte malejąco.
- Dokumenty: lista zależna od transakcji/rodzaju/formy własności/rodzaju umowy najmu (`dokumentyWymagane`) + własne. Status w arkuszu (Brak/Zamówiony/Jest/Nie dotyczy), pliki PDF lub zdjęcia (zdjęcie skalowane do 2400 px). Dodanie pliku ustawia „Jest”. Zdjęcie dokumentu otwiera się w aplikacji, PDF w przeglądarce telefonu.

## Testy (wszystkie przechodzą 18.11.2026, wersja 1.3.0)
- model 12, serwer 15 (`node --experimental-sqlite` na Node 22), przeglądarka `test/ui_test.py`: pełny scenariusz telefon → laptop wspólnika (zmiana na żywo < 1 s), offline → online, ZIP 12 zdjęć, zero błędów konsoli.
- `test/ui_safari_test.py webkit`: silnik iPhone'a — spis na szerokość, przewinięcie po zmianie, wyposażenie, klient → prezentacja, dokumenty (PDF + zdjęcie). WebKit w trybie prywatnym nie zapisuje Blobów w IndexedDB, dlatego test używa profilu trwałego.

## Następne kroki (propozycje, nic nie przesądzone)
1. Raport dla właściciela z wizyt (liczba prezentacji, wrażenia klientów) — dane już są.
2. Wspólna baza klientów dla wszystkich ofert (teraz klient należy do oferty) i dopasowanie do nowych ofert.
3. Edytor rzutu 2D z wymiarami w aplikacji.
4. Obróbka zdjęć na serwerze (prostowanie pionów, balans bieli) — bez usuwania usterek.
5. Strona każdej oferty na amnieruchomosci + kod QR.
6. Wersja angielska ogłoszenia, spacer 360, wideo pionowe.
