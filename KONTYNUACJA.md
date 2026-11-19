# AM Oferty — notatki do kontynuacji

Repo: lewym90/ogloszenia (aplikacja: https://lewym90.github.io/ogloszenia/).
Stan: wersja 1.5.0 (rzut z edytora openPlan3D po polsku, połączony z ofertą; wcześniej 1.4.0: kopia zapasowa, kosz) (18.11.2026). Serwer 1.3.0. Firma rusza ok. luty/marzec 2027 — do tego czasu aplikacja testowa.

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

## Rzut (od 1.5.0) — openPlan3D (MIT, laanlabs) z naszymi łatkami
- Zbudowany edytor leży w `rzut/` (16 MB, ten sam adres co aplikacja: /ogloszenia/rzut/). Budowanie: `bash narzedzia/rzut/zbuduj.sh` — klonuje oryginał w przypiętym commicie, nakłada `narzedzia/rzut/lataj.py`, buduje statycznie, kopiuje licencje (LICENSE-openPlan3D.txt, Kenney/ambientCG CC0). Aktualizacja edytora = zmiana commita w zbuduj.sh + przebudowa + sprawdzenie łatek.
- Łatki: adapter statyczny (base /ogloszenia/rzut), usunięte trasy serwerowe (asystent, przekazywanie przez chmurę autorów), Firebase/analityka wyłączone, polski język domyślny (`pliki/pl.ts` — 1567 tekstów, `meble-pl.txt` — 191 nazw mebli), daty pl-PL, most `amMost.ts` + pasek `AmMost.svelte` („‹ Oferta” / „Zapisz w ofercie”), przechwycenie pobrania PNG w `export.ts` (`globalThis.__amPobranie`).
- GitHub Pages nie podaje 404.html z podkatalogu → `rzut/editor.html` (kopia powłoki) obsługuje adres /rzut/editor. Serwer testowy `test/serwer_jak_github.py` naśladuje to zachowanie.
- Wymiana danych: wspólna baza IndexedDB `am-rzut` (`js/rzut.js` po stronie aplikacji): `wejscie:<oid>` = plan z serwera (aplikacja → edytor), `wynik:<oid>` = plan JSON + PNG + pomieszczenia (edytor → aplikacja, odbiór w `odbierzRzuty()` po powrocie).
- W ofercie: zdjęcie z `pom: 'rzut', rzutAuto: true` (podmieniane przy każdym zapisie, nigdy zdjęcie główne — `mozeBycGlowne`, checklista też to sprawdza), plan jako plik JSON na serwerze (`rzutPlan: {id, t, kto}`, typ `json` w /plik), więc wspólnik otwiera ten sam plan na swoim urządzeniu.
- Pomieszczenia: metraż WEWNĘTRZNY (`interiorRoomArea`, bez ścian; „po osiach” zawyża), nazwy ze skanu tłumaczone (Bedroom → Sypialnia), powtórzone numerowane (Sypialnia 1, 2), scalanie po nazwie, okno z potwierdzeniem.
- Service worker: `/rzut/` ma osobną pamięć `amoferty-rzut` (nie nadpisuje index.html aplikacji; raz otwarty edytor działa offline).
- Znane: eksport PDF z samego edytora używa czcionki bez polskich znaków (jsPDF helvetica) — do oferty idzie PNG, więc nas to nie dotyczy.
- Test: `test/ui_rzut_test.py [chromium|webkit]` (skan `test/dane/skan-roomplan.json`).

## Kopia zapasowa (od 1.4.0, serwer 1.3.0)
- Serwer: baza co godzinę (`kopie/`), usunięte zdjęcia i dokumenty idą do `kosz/` (nazwa `zdjecia--<plik>` / `pliki--<plik>`) i znikają po 30 dniach (`oproznijKosz` w `kopia()`). Przywrócenie z kosza ręcznie: `sudo mv /var/lib/amoferty/kosz/zdjecia--X.jpg /var/lib/amoferty/zdjecia/X.jpg`.
- Kopia na komputer (`js/kopia.js`): aplikacja w Chrome/Edge na laptopie, folder wybrany raz (uchwyt w IndexedDB `meta.kopiaFolder`), przy starcie (+8 s) i co 6 h ściąga brakujące pliki (`GET /kopia/spis`, `/kopia/plik?s=`, `/kopia/baza`), trzyma 14 baz, pisze `CZYTAJ-MNIE.txt` z instrukcją odtworzenia serwera. Pliki usunięte w aplikacji zostają w kopii. Stan kopii na serwerze (`POST /kopia/zrobiona`, `/ja` → `kopia`) — przypomnienie na liście po 7 dniach bez kopii, na każdym urządzeniu.
- Gdy przeglądarka cofnie zgodę na folder (Chrome po restarcie), kopia czeka na kliknięcie „Zrób kopię teraz” w Ustawieniach.
- Odtworzenie przetestowane: folder kopii → nowy katalog danych → serwer → 32/32 oferty identyczne, zdjęcia i dokumenty bajt w bajt. Klient po odtworzeniu (niższy `seq` na serwerze) pobiera wszystko od nowa.

## Interfejs — ważne
- `wstaw(el, html)` nie podmienia fragmentu, w którym ktoś pisze; po wyjściu z pola odświeża. Od 1.3.0 zapamiętuje i przywraca przewinięcie kolumny — Safari (iPhone) zeruje je przy podmianie treści, przez co każde stuknięcie (źródło, pigułka) wyrzucało na górę ekranu. Chrome tego nie robi, więc testować w WebKit (`test/ui_safari_test.py`).
- Pola wyboru plików dokumentów (`input[data-dok]`) mają słuchacza na samym elemencie (ustawiany w `wstaw`), żeby odświeżenie w trakcie wyboru nie zgubiło plików.
- Pola daty/godziny (1.3.1): iOS nakłada na nie własny styl (szerokość 100% + padding liczone jako content-box, własna minimalna szerokość) — pole wystawało poza panel. Globalnie `appearance: none; min-width: 0; box-sizing: border-box` dla date/datetime-local/time. Testowy WebKit na Linuksie tego nie odtwarza — sprawdzać na iPhonie.
- Napisy: nagłówki bloków i pigułki skalują się z szerokością kolumny (`cqi`); poniżej 360 px pigułki przechodzą do drugiego rzędu zamiast ucinać słowo. Długie jednostki (kWh/(m²·rok)) w polach połówkowych idą do etykiety.
- `test/audyt_szerokosci.py`: każdy ekran na 320/390/430 px — nic nie wystaje poza panel, napisy nieucięte. Uruchamiać po każdej zmianie wyglądu.
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
- Ekran Ogłoszenie zaczyna się od tytułu i wstępu złożonych z danych, przy każdym ołówek → pole z gotowym tekstem do poprawienia, „Gotowe”, „Przywróć z danych”. Własny wstęp (`lead`) ZASTĘPUJE automatyczny (`wstepAuto`), własny tytuł (`tytul`) zastępuje `tytulAuto`. Tekst identyczny z automatycznym nie zapisuje się jako własny. Własny tekst nie aktualizuje się z danymi — pokazana adnotacja. Status oferty zmienia się w Kontroli.

## Obsługa oferty (od 1.3.0)
- Wyposażenie (sekcja `wyp`): kafelki do zaznaczania (`wyp` = obiekt {klucz: true}, słownik `WYPOSAZENIE` w model.js), `wypInne` (lista), `wypUwagi`, `wypBrak`. W ogłoszeniu blok „WYPOSAŻENIE” (najem) / „W CENIE ZOSTAJE” (sprzedaż) i pole portalu. W najmie zalecane w checkliście.
- Klienci, Wizyty, Dokumenty: każdy wpis to OSOBNE pole oferty (`kl_<id>`, `wz_<id>`, `dk_<klucz|id>`), więc dwaj wspólnicy dodający wpisy jednocześnie się nie nadpisują (ostatni wygrywa tylko w obrębie jednego wpisu). Nic z tego nie trafia do ogłoszenia (test w model.test.mjs).
- Klient: imię, telefon (Zadzwoń/SMS), e-mail, źródło, finansowanie (sprzedaż) / wprowadzka od (najem), notatka, RODO, status (arkusz). „Umów prezentację” tworzy wizytę z klientem i ustawia mu status „Umówiony”; „Odbyła się” ustawia „Po prezentacji”.
- Wizyta: data i godzina, klient, kto prowadzi, status (pigułki), wrażenia klienta (po odbytej — do raportu dla właściciela), notatka. Nadchodzące rosnąco, odbyte malejąco.
- Dokumenty: lista zależna od transakcji/rodzaju/formy własności/rodzaju umowy najmu (`dokumentyWymagane`) + własne. Status w arkuszu (Brak/Zamówiony/Jest/Nie dotyczy), pliki PDF lub zdjęcia (zdjęcie skalowane do 2400 px). Dodanie pliku ustawia „Jest”. Zdjęcie dokumentu otwiera się w aplikacji, PDF w przeglądarce telefonu.

## Testy (wszystkie przechodzą 18.11.2026, wersja 1.3.0)
- model 13, serwer 16 (`node --experimental-sqlite` na Node 22), przeglądarka `test/ui_test.py`: pełny scenariusz telefon → laptop wspólnika (zmiana na żywo < 1 s), offline → online, ZIP 12 zdjęć, zero błędów konsoli.
- `test/ui_safari_test.py webkit`: silnik iPhone'a — spis na szerokość, przewinięcie po zmianie, wyposażenie, klient → prezentacja, dokumenty (PDF + zdjęcie). WebKit w trybie prywatnym nie zapisuje Blobów w IndexedDB, dlatego test używa profilu trwałego.

## Plan dalszej pracy (uzgodniony 18.11.2026, kolejność proponowana — każdy punkt wymaga zgody właściciela przed budową)
Ocena repozytoriów z GitHuba: claude/nieruchomosci-ogloszenia-plan.md → „Ocena repozytoriów”. Bierzemy openPlan3D (rzut) i StaticTour (spacer 360). Nie bierzemy: MiniPaint, Reframe, FFmpeg.wasm (GPL, słaby na iPhonie), Freehold (ELv2).

Po stronie właściciela: zaktualizować serwer (install.sh) do 1.2.0, sprawdzić pola dat na iPhonie, opcjonalnie wygenerować złote ikony dla Wyposażenia/Klientów/Wizyt/Dokumentów.

A. Przed startem firmy
1. ZROBIONE (1.4.0): kopia na komputer + kosz 30 dni.
2. ZROBIONE (1.5.0): rzut z openPlan3D (po polsku, pod adresem aplikacji, bez cudzej chmury), skan LiDAR → pomieszczenia z metrażem wewnętrznym.
3. Raport dla właściciela: strona na link / PDF — wizyty, wrażenia klientów, kontakty, zmiany ceny (obiecany na stronie amnieruchomosci).
4. Uczciwa korekta zdjęć (sharp na serwerze): kadr pod portale, piony, jasność, balans bieli; zamknięta lista operacji, bez retuszu.
5. RODO i AML: retencja danych klientów (przypomnienie o usunięciu po czasie), eksport danych osoby; karta klienta AML przy transakcji (biuro pośrednictwa = instytucja obowiązana).
6. Wizyty: przypomnienie push przed prezentacją, dodanie do kalendarza telefonu.

B. Po starcie
7. Strona każdej oferty na amnieruchomosci + kod QR na baner.
8. Wspólna baza klientów dla wszystkich ofert + dopasowanie do nowych ofert.
9. Tryb „Sesja” zdjęciowa: lista ujęć z pomieszczeń, odhaczanie.
10. Analiza cenowa z operatszacunkowy (RCN) jako załącznik dla sprzedającego.
11. Wersja angielska ogłoszenia.

C. Gdy będzie sprzęt / potrzeba
12. Spacer 360 (StaticTour + Pannellum, na naszym serwerze) — po zakupie kamery 360.
13. Wideo pionowe: FFmpeg na serwerze lub laptopie, napisy whisper.cpp.
14. Skan 3D (splatting) dla droższych ofert, dron dla domów/działek.
15. Otodom API — tylko jeśli zmieni się decyzja (dziś: kopiowanie pól).

## 1.5.1–1.5.2 (18.11.2026)
- Scalanie pomieszczeń z rzutu: pomiar a×b z dalmierza nienaruszalny (`scalPomieszczenia`), przycisk przywracania wymiarów z historii (`odzyskajWymiary`). Plan rzutu nie ginie przy 415 (zostaje w kolejce). Serwer ma teraz numer 1.5.1 (wcześniej został 1.3.0 mimo zmian).
- Edytor: „Granica pomieszczeń (bez ściany)” w ustawieniach ściany (pole `granica: true`, grubość 1 cm) — dzieli otwartą przestrzeń (przedpokój/salon) na osobne pomieszczenia i metraże, na rzucie i w PNG przerywana linia bez wymiaru, w 3D pomijana. Test: `test/ui_granica_test.py`.
- Edytor nie pokazuje już fałszywego konfliktu („zmienił się w innej karcie”) przy otwieraniu planu z serwera/urządzenia (`localStore.load(id)` przed zapisem). Domyślne nazwy po polsku: Parter, Piętro N, Piwnica, Pomieszczenie N.

## 1.6.0–1.6.1 (19.11.2026) — Rzut AM
Własny edytor rzutów `plan.html` (js/plan/: edytor.js, rysuj.js, biblioteka.js, geom.js z openPlan3D). Pełny opis: dokument projektu claude/rzut-am-projekt.md.
Biblioteka grafik: `python3 narzedzia/plan/tnij.py <nr arkusza> <plik> --podglad` → img/plan/meble|podlogi + img/plan/biblioteka.json.
Testy: test/ui_plan_test.py, ui_rzut_test.py, ui_granica_test.py, ui_plan_pietra_test.py.

## Widok 3D (wersja 1.7.0, 19.11.2026)
- `js/plan/rysuj3d.js`: widok z lotu ptaka z perspektywą. Kamera stoi nad środkiem rzutu na wysokości 3,3 × dłuższy bok; to ustalone z właścicielem („pochyl trochę bardziej” — jest dobrze). Ściany mają 260 cm: widać boki zwrócone do kamery i ciemne wierzchy. Okno to parapet 90 cm, jasna szyba z ramą i słupkiem oraz jasny pasek u góry. W miejscu drzwi ściana jest otwarta. Szafy, regały, AGD, zabudowa kuchni i szafki są bryłami z bokami (wysokości w `BRYLY`, kolor boków to średni kolor brzegu grafiki). Pozostałe meble są płaskie jak w 2D. Ściany i bryły rzucają cienie. Są nazwy i metraż, bez wymiarów ścian. Stopka: „Wizualizacja 3D · metraż z pomiaru · aranżacja poglądowa”.
- Używa tych samych grafik z biblioteki co 2D (`rysuj()` z opcjami `bezScian`, `pomin`, `tylkoNapisy`). Nie trzeba nowych grafik.
- W edytorze przełącznik 2D | 3D jest w lewym górnym rogu płótna. 3D to sam podgląd: stuknięcie niczego nie zmienia, dolne narzędzia są wyszarzone, przesuwanie i powiększanie działa. Edytor otwiera się zawsze w 2D.
- „Zapisz” pyta: oba widoki / tylko 2D / tylko 3D. `wynik:<oid>` = { plan, png, png3d, pokoje, t }. Aplikacja zapisuje 2D jako zdjęcie `rzutAuto`, a 3D jako `rzutAuto3d` (oba mają pom 'rzut', żadne nie jest główne). Każde podmienia tylko swoje poprzednie zdjęcie. Kilka pięter = jeden obraz na widok, piętra jedno pod drugim.
- Test: `test/ui_plan_test.py` kroki 12b i 15. Edytor zaawansowany (openPlan3D) jest w menu jako „Edytor zaawansowany”.

## Wymiary i dopasowanie do pomiarów (1.8.0, 19.11.2026)
- Zasada od właściciela: mierzy raz (karta: długość × szerokość z dalmierza), nie mierzy drugi raz w edytorze; metraż ma być rzeczywisty (z wnękami/załomami).
- `js/plan/dopasuj.js` (czyste funkcje, test `test/dopasuj.test.mjs`): `dopasujNazwy` (rzut ↔ karta: ta sama nazwa, potem bez numeru, tylko jednoznacznie), `dopasujDoPomiarow(fl, pokoje, pomiary)` — układ wyprostowany (kąt główny), linie ścian = zmienne (współliniowe razem), pomiar = rozpiętość w świetle między „widzącymi się” krawędziami pomieszczenia (waga 1e4, dopasowanie a/b do osi wg najmniejszego błędu, tolerancja max(20 cm, 7%)), skan = odległości linii połączonych ścianą prostopadłą (waga 1/(L²+0,05), L w m — krótkie odcinki sztywne). Najmniejsze kwadraty, potem przesunięcie końców ścian, mebli (interpolacja), napisów. Ręczne pary ścian: `room.amPary = { a: [id, id], b: [...] }`.
- Edytor: propozycja „Dopasuj” po otwarciu (gdy karta ma pomiary, a rzut niedopasowany), menu „Dopasuj rzut do pomiarów z karty”, raport (skan → po, ✓ / sprzeczny / „Wskaż ściany”). Znacznik `room.amDopasowanie = {a, b}` (m) — `scena()` daje `p.dop`, `p.wym`, `p.karta`, `p.kartaPrzybl`; dopasowany pokazuje metraż z rzutu, niedopasowany zmierzony — pomiar.
- Ściany: liczby i pole „Długość w świetle” = `dlugoscCzysta` (jak na rzucie). Zmiana długości/przeciągnięcie narożnika = równoległe przesunięcie linii ściany na wybranym końcu (`przesunKoniec`, `liniaSciany`, `przesunLinie`, domyślnie koniec z krótszą ścianą, wybór „lewy/prawy koniec”). Grubość ściany zewnętrznej rośnie na zewnątrz. Przeciąganie ściany przesuwa całą jej linię. Narożniki rysowane do lica ściany prostopadłej (`przedluzenia`).
- Obraz: nazwa + metraż + „a × b m” z karty (przełączniki: menu „Wymiary pokoi na obrazie” = `floor.amBezWymiarowPokoi`, pokój = `room.amBezWymiarow`); wymiary ścian tylko w edytorze.
- Karta: `pom[].mRzut` = metraż z dopasowanego rzutu obok nietkniętego a × b × m; ogłoszenie i suma używają `mRzut ?? m`; zmiana a/b kasuje mRzut. `scalPomieszczenia` łączy po `karta` z edytora / po nazwie / „Pokój 2” ↔ „Pokój” (jednoznacznie) — bez duplikatów.

## 1.8.1 (19.11.2026) — po zgłoszeniu właściciela (biały pokój, łazienka bez nazwy, krzywa ściana)
- Przyczyna: dopasowanie 1.8.0 przesuwało końce ścian punkt po punkcie; przy ścianach skanu krzywych o 1–5° (i ścianie skrzywionej starym błędem długości) rozchodziły się narożniki/„T” → pokój bez podłogi i nazwy, łazienka zlana z przedpokojem.
- Teraz: proste ścian (pionowe/poziome do 3°) przesuwane jako linie, każdy narożnik i „T” liczony od nowa jako przecięcie prostych (topologia zachowana); przed dopasowaniem automatyczne „Wyprostuj”, gdy ściany są krzywe o 0,2–6°; bezpiecznik — jeśli po dopasowaniu zmieni się liczba lub nazwy pomieszczeń, rzut wraca do stanu sprzed i jest komunikat.
- Wolne końce ścian blisko innej ściany (do 40 cm) = czerwone kółka + propozycja „Napraw” (dociągnięcie do przecięcia prostych do 40 cm + Wyprostuj). „Nie teraz” zapamiętane per oferta (localStorage `am-plan-nie-teraz:<oid>`), wraca, gdy zmieni się liczba.
- Nazwy: karta jest ważniejsza — „Pokój 2” ze skanu zmienia się na „Pokój” z karty, pomieszczenie bez nazwy dostaje nazwę z karty, gdy pasuje po wymiarach (jednoznacznie, tolerancja max 25 cm / 8%). Arkusz pokoju: najpierw nazwy z karty. Pamięć nazw (`floor.amZnikniete`): nazwa/podłoga/dopasowanie znikającego pomieszczenia czekają w jego miejscu i wracają, gdy się zamknie.
- 1.8.2: „Napraw” łączy też przerwy w prostej ścianie (dwa współliniowe wolne końce do 60 cm — w połowie) i rozjechane narożniki (oba końce wolne — obie ściany do przecięcia), kilka przebiegów + Wyprostuj + jeszcze raz. Nazwy po wymiarach: a i b z karty muszą pasować do KTÓREJŚ rozpiętości pomieszczenia (nie tylko największej — dalmierz mierzy np. obok wnęki), tolerancja max(15 cm, 6%), przypisywanie kolejno pewnych par. Menu: „Pobierz plik rzutu (.json) — do sprawdzenia”.

## 1.9.0 (19.11.2026) — model skan + dalmierz dla każdego mieszkania (po analizie surowego skanu właściciela)
- Surowy skan RoomPlan: ściany = płaszczyzny bez grubości, kąty 90°, wszystko się styka. Na 9 pomiarach właściciela: płaszczyzna ściany zewnętrznej = lico wewnętrzne, działowej ≈ środek. Stary import (15 cm na środku płaszczyzny) zaniżał każde pomieszczenie (średnio −10 cm na wymiar), nowy: średni błąd 4–5 cm w obie strony.
- `poprawImport` (dopasuj.js) przy wczytaniu skanu: sklejenie równoległych kawałków ≤ 6 cm (duplikaty skanera), ściany zewnętrzne 25 cm na zewnątrz, działowe 12 cm symetrycznie. Nazwy ze skanu oznaczone `room.amNazwaSkan` (zgadywane — nie łączą się z kartą po nazwie).
- `dopasujDoPomiarow` v2: niewiadome = oba lica każdej linii ściany (grubość z pomiarów, np. salon = pokój + ściana + łazienka), skan σ 1 cm + 1,5%·d, grubość działowej σ 4, zewnętrzna stała, granica bez położenia ze skanu (ustawia ją pomiar). Para do pomiaru: ściany naprzeciw na największej części pomieszczenia (dalmierz), inaczej najbliższa (np. przez wnękę). Długość/szerokość bez kierunku — oba ułożenia, przy prawie kwadracie rozstrzyga całość (najmniejsze „naginanie” skanu); niepewne oznaczone + „Zamień długość z szerokością” (`room.amOsA`). Raport: pomiary, grubości ścian (podejrzane < 5 / > 45 cm). Każdy koniec ściany osobno na przecięciu prostych (granica i ściana w jednej linii mogą się rozejść).
- Nazwy: karta jest prawdą; pomieszczenia z nazwą ze skanu/bez nazwy dostają nazwę z karty po wymiarach (oba ułożenia, tolerancja max(15 cm, 6%), ostatnie pomieszczenie luźniej 15%); przy starcie bez oznaczania jako zmiana.
- Czerwone kółka tylko dla końców „niedochodzących” (przedłużenie ≤ 40 cm trafia w ścianę albo ≤ 60 cm dalszy ciąg prostej).
- Walidacja: `test/symulacja.mjs` — losowe mieszkania (podział gilotynowy, szachty, granice, grubości 8–25/25–45, skaner: skala ±0,7%, szum 2,5 cm/linię): stary import średnio 3,8% błędu metrażu, nowy 2,3%, po dopasowaniu zmierzone 0,22% (95% ≤ 0,6–0,9%), niezmierzone ~2,2%, 0 pęknięć. Test w `test/dopasuj.test.mjs`.
- Skan właściciela (nie w repo — prywatny): 10/10 pomiarów przypisanych ✓, nazwy z karty po wymiarach, metraże: Pokój 9,64, Łazienka 5,26, Sypialnia 10,24, Salon 17,92, Przedpokój 8,38 (granica wg pomiaru 5,23 m).

## 1.9.1 (19.11.2026) — drzwi ze skanu, wnęka, elementy pod spodem
- Zgłoszenie: zgubione drzwi do Pokoju i Łazienki, nie da się narysować wnęki na szafę (po dorysowaniu ścian i usunięciu „drzwi” znikał przedpokój), nakładające się elementy.
- Przyczyna drzwi: RoomPlan zapisuje część drzwi jako „opening” (otwór bez skrzydła). `porzadkujSkan` (dopasuj.js, po `poprawImport`): otwór między dwoma pomieszczeniami o szerokości 55–125 cm → drzwi `single` (`amZOtworu`), szersze zostają przejściem; drzwi > 135 cm → `double`; szerokość skrzydła do typowej (60/70/80/90/100) z (w − 7)/n; meble skanera nachodzące > 60% — zostaje jeden (najpierw usuwany `storage`).
- „Drzwi” przy łazience w przedpokoju to była szafa (skaner widzi front szafy jako drzwi). Narzędzie wnęki: arkusz ściany „Dodaj wnękę (np. na szafę)”, arkusz drzwi „To nie drzwi — wnęka (np. szafa)”. Pola: szerokość, głębokość (dom. 60), odstęp od narożnika, strona („Należy do: X (wchodzi w Y)”), złoty podgląd. Wstawienie rozcina ścianę i dokłada 3 ściany (≤ 12 cm) dokładnie w narożnikach — pomieszczenie zostaje zamknięte; nazwa i znaczniki pokoju przechodzą na nowy kształt.
- Stuknięcie drugi raz w to samo miejsce zaznacza element pod spodem (otwór → ściana → …), toast „Pod spodem: …” (`trafienie` z `op.pomin`).
- Test: `ui_dopasuj_test.py` (wnęka 120 × 50: +0,60 m² pokoju kosztem sypialni, 0 wolnych końców; cykl stuknięć), `dopasuj.test.mjs` (porządki po skanie). Skan właściciela: B5BFC2 łazienka 90, 8F58DC pokój 100; wnęka 60 × 50 z drzwi 86CA04 → Przedpokój 8,65 m², 0 wolnych końców.

## 1.9.2 (19.11.2026) — szafa we wnęce bez pytań, drzwi przy narożniku, wymiary ścian od strony pokoju
- Zgłoszenie właściciela: wnęka 1.9.1 dokładała własną ściankę obok ściany łazienki (odstęp 12 cm), głębokość z palca, pytanie „wchodzi w / na zewnątrz” bez sensu; za ścianą jest klatka schodowa, mieszkanie po obrysie to prostokąt — wnęka kończy się na linii obrysu (ani na klatkę, ani płycej); kawałek wcięty w mieszkanie obok szafy to obudowa pionów (poza mieszkaniem). W skanie front szafy dolega do ściany łazienki.
- `frontSzafy(fl, scianaId, drzwiId)` + `szafaWeWnece(fl, pokoje, zakres, noweId, strona)` (dopasuj.js): szerokość = „drzwi” szafy ze skanu (surowa szerokość `amSzerSkanu`) ∪ cienki obiekt frontu przy ścianie; dociągnięcie do lica ściany poprzecznej, gdy brakuje < 20 cm (wtedy ta ściana jest bokiem wnęki — wydłużona do tyłu, bez nowej ścianki). Tył: równoległa ściana za frontem (15–130 cm) — najpierw ściana tego samego pomieszczenia połączona z frontem jedną ścianką poprzeczną (obrys, np. ściana z drzwiami wejściowymi), inaczej ściana zachodząca na front; brak → 60 cm. Strona: tam, gdzie nie ma pomieszczenia; tylko gdy po obu stronach są pokoje — jedno pytanie „do którego należy szafa”. Przyciski: drzwi „To nie drzwi — szafa we wnęce”, ściana (gdy jest front ze skanu) „To front szafy — szafa we wnęce”. Stare narzędzie z polami usunięte.
- Drzwi przy narożniku: krawędź ≤ 12 cm od lica ściany poprzecznej w skanie → `door.amNaroznik = 'a'|'b'`; `przyklejDrzwi` trzyma je równo z licem po zmianie szerokości (typowe skrzydła), dopasowaniu, przesuwaniu ścian (wywoływane w `przebuduj`). Ręczne przesunięcie drzwi zdejmuje znacznik.
- `dlugoscCzysta(g, sciany, pokoje)`: długość w świetle od strony pomieszczenia — w narożniku wypukłym (ścianka wystająca w głąb pokoju) do zewnętrznego lica poprzecznej, czyli tyle, ile mierzy taśma (np. ścianka przy wejściu 61 cm, nie 35).
- Skan właściciela: szafa 84 × 61 cm przy ścianie łazienki, Przedpokój 8,86 m², 0 wolnych końców; drzwi wejściowe, do Pokoju, do Sypialni i front szafy przyklejone do narożników jak w skanie.

## 1.9.3 (19.11.2026) — nowe elementy biblioteki (złożone z istniejących grafik)
- Właściciel: to ogólny rzut mieszkania, nie projektowanie wnętrz — bez konfigurowania elementów (szkło, odpływ, wkładki w blacie). Tylko uzupełnić bibliotekę; brakowało owalnego stołu.
- `narzedzia/plan/zloz.py` składa nowe grafiki z tych, które są (ten sam styl, bez nowego arkusza), potem `tnij.py --spis`:
  stół owalny (sam blat) i z 4 / 6 / 8 krzesłami (drewno stołu prostokątnego, „Krzesło”, kwiaty ze stołu okrągłego);
  ciąg kuchenny 180 / 240 / 300 cm — jeden ciągły blat z wpuszczonym zlewem i płytą (nie rozciągać, wybrać długość);
  prysznic walk-in z jedną szybą, deszczownica i odpływ liniowy przy ścianie (górna krawędź; drugi bok — lustro);
  łóżko 140×200 (grafika 160) — skaner: łóżko 133–152 cm → 140.
- W bibliotece `a: null` (nie z arkusza). 3D: ciąg kuchenny = bryła 90 cm.
