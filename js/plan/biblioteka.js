// Biblioteka elementów rzutu — jedna dla wszystkich nieruchomości. Każdy element wygląda zawsze tak samo,
// różni się tylko wymiarem, miejscem i obrotem. Grafiki: img/plan/meble/<klucz>.webp i img/plan/podlogi/<klucz>.webp
// (wycięte z arkuszy właściciela narzędziem narzedzia/plan/tnij.py). Spis dostępnych grafik: img/plan/biblioteka.json.
// Gdy grafiki brak, element rysuje kod (pole „wektor” → rysunek w rysuj.js).
//
// a: [arkusz, pole] — miejsce w arkuszu (pola liczone od 1, od lewej do prawej, z góry na dół).
// skala: 'r' rozciągnij do wymiaru (domyślnie) | 'p' zachowaj proporcje grafiki | 'pow' powtarzaj odcinek wzdłuż szerokości
// Tył elementu (wezgłowie, oparcie, plecy szafki) jest u góry — przy ścianie.

const E = (nazwa, w, d, grupa, wektor, a, skala = 'r') => ({ nazwa, w, d, grupa, wektor, a, skala });
export const GRUPY = ['Sypialnia', 'Pokój dziecięcy', 'Salon', 'Jadalnia', 'Kuchnia', 'Łazienka', 'Pralnia i technika', 'Przedpokój', 'Gabinet', 'Biuro i lokal', 'Balkon i taras', 'Ogród', 'Garaż', 'Schody i budynek', 'Rekreacja'];

export const MEBLE = {
  // 1 — sypialnia
  lozko_160: E('Łóżko 160×200', 165, 210, 'Sypialnia', 'lozko2', [1, 1]),
  lozko_180: E('Łóżko 180×200', 185, 210, 'Sypialnia', 'lozko2', [1, 2]),
  lozko_90: E('Łóżko 90×200', 95, 205, 'Sypialnia', 'lozko1', [1, 3]),
  lozko_120: E('Łóżko 120×200', 125, 205, 'Sypialnia', 'lozko1', [1, 4]),
  szafka_nocna: E('Szafka nocna z lampką', 45, 40, 'Sypialnia', 'szafka_nocna', [1, 5]),
  szafka_nocna2: E('Szafka nocna z szufladą', 50, 40, 'Sypialnia', 'szafka_nocna', [1, 6]),
  szafa_2: E('Szafa dwudrzwiowa', 100, 60, 'Sypialnia', 'szafa', [1, 7]),
  szafa_przesuwna: E('Szafa przesuwna', 200, 65, 'Sypialnia', 'szafa', [1, 8]),
  komoda: E('Komoda', 100, 45, 'Sypialnia', 'komoda', [1, 9]),
  toaletka: E('Toaletka z taboretem', 100, 75, 'Sypialnia', 'biurko', [1, 10]),
  lawka: E('Ławka', 120, 40, 'Sypialnia', 'komoda', [1, 11]),
  fotel_sypialnia: E('Fotel do sypialni', 70, 75, 'Sypialnia', 'fotel', [1, 12], 'p'),
  // 2 — pokój dziecięcy i garderoba
  lozeczko: E('Łóżeczko dziecięce', 126, 66, 'Pokój dziecięcy', 'lozko1', [2, 1]),
  lozko_dzieciece: E('Łóżko dziecięce 80×160', 88, 168, 'Pokój dziecięcy', 'lozko1', [2, 2]),
  lozko_pietrowe: E('Łóżko piętrowe', 208, 98, 'Pokój dziecięcy', 'lozko1', [2, 3]),
  skrzynia_zabawki: E('Skrzynia na zabawki', 80, 45, 'Pokój dziecięcy', 'komoda', [2, 4]),
  biurko_dzieciece: E('Biurko dziecięce z krzesłem', 100, 95, 'Pokój dziecięcy', 'biurko', [2, 5]),
  przewijak: E('Przewijak', 80, 55, 'Pokój dziecięcy', 'komoda', [2, 6]),
  fotel_bujany: E('Fotel bujany', 65, 95, 'Pokój dziecięcy', 'fotel', [2, 7], 'p'),
  regal_garderoba: E('Regał garderobiany', 120, 42, 'Sypialnia', 'regal', [2, 8]),
  wieszak_ubrania: E('Wieszak na ubrania', 120, 50, 'Sypialnia', 'szafa', [2, 9]),
  lustro: E('Lustro stojące', 50, 14, 'Sypialnia', 'inny', [2, 10]),
  puf: E('Puf', 45, 45, 'Salon', 'kolo', [2, 11], 'p'),
  kosz_pranie: E('Kosz na pranie', 40, 40, 'Łazienka', 'kolo', [2, 12], 'p'),
  // 3 — salon, wypoczynek
  sofa_3: E('Sofa trzyosobowa', 220, 95, 'Salon', 'sofa', [3, 1]),
  sofa_2: E('Sofa dwuosobowa', 160, 90, 'Salon', 'sofa', [3, 2]),
  naroznik: E('Narożnik', 260, 170, 'Salon', 'naroznik', [3, 3]),
  sofa_u: E('Sofa w kształcie U', 300, 220, 'Salon', 'naroznik', [3, 4]),
  fotel: E('Fotel', 80, 85, 'Salon', 'fotel', [3, 5], 'p'),
  fotel_rozkladany: E('Fotel rozkładany', 85, 95, 'Salon', 'fotel', [3, 6], 'p'),
  szezlong: E('Szezlong', 80, 170, 'Salon', 'fotel', [3, 7]),
  stolik: E('Stolik kawowy', 110, 60, 'Salon', 'stolik', [3, 8]),
  stolik_okragly: E('Stolik okrągły', 80, 80, 'Salon', 'kolo', [3, 9], 'p'),
  stolik_boczny: E('Stolik boczny', 45, 45, 'Salon', 'szafka_nocna', [3, 10], 'p'),
  szafka_rtv: E('Szafka RTV z telewizorem', 180, 45, 'Salon', 'szafka_rtv', [3, 11]),
  kredens: E('Kredens', 160, 45, 'Salon', 'komoda', [3, 12]),
  // 4 — salon, dodatki
  regal: E('Regał na książki', 100, 35, 'Salon', 'regal', [4, 1]),
  witryna: E('Witryna', 90, 45, 'Salon', 'regal', [4, 2]),
  kominek: E('Kominek', 130, 72, 'Salon', 'kominek', [4, 3]),
  pianino: E('Pianino z ławą', 150, 95, 'Salon', 'komoda', [4, 4]),
  lampa: E('Lampa stojąca', 40, 40, 'Salon', 'lampa', [4, 5], 'p'),
  dywan: E('Dywan prostokątny', 300, 200, 'Salon', 'dywan', [4, 6]),
  dywan_okragly: E('Dywan okrągły', 160, 160, 'Salon', 'dywan_okragly', [4, 7], 'p'),
  chodnik: E('Chodnik', 80, 250, 'Przedpokój', 'dywan', [4, 8]),
  roslina_duza: E('Roślina duża', 70, 70, 'Salon', 'roslina', [4, 9], 'p'),
  roslina_srednia: E('Roślina średnia', 55, 55, 'Salon', 'roslina', [4, 10], 'p'),
  roslina_mala: E('Roślina mała', 35, 35, 'Salon', 'roslina', [4, 11], 'p'),
  legowisko: E('Legowisko dla zwierzaka', 70, 55, 'Salon', 'kolo', [4, 12], 'p'),
  // 5 — jadalnia
  stol_4: E('Stół z 4 krzesłami', 160, 150, 'Jadalnia', 'stol4', [5, 1]),
  stol_6: E('Stół z 6 krzesłami', 200, 190, 'Jadalnia', 'stol6', [5, 2]),
  stol_8: E('Stół z 8 krzesłami', 260, 190, 'Jadalnia', 'stol8', [5, 3]),
  stol_okragly_4: E('Stół okrągły z 4 krzesłami', 200, 200, 'Jadalnia', 'stolokr', [5, 4], 'p'),
  stol_2: E('Stolik z 2 krzesłami', 180, 80, 'Jadalnia', 'stol2', [5, 5]),
  krzeslo: E('Krzesło', 48, 55, 'Jadalnia', 'krzeslo', [5, 6], 'p'),
  hoker: E('Hoker', 40, 40, 'Jadalnia', 'kolo', [5, 7], 'p'),
  lawka_jadalnia: E('Ławka do stołu', 140, 55, 'Jadalnia', 'komoda', [5, 8]),
  wyspa_hokery: E('Wyspa z 3 hokerami', 200, 140, 'Kuchnia', 'blat', [5, 9]),
  stolik_bistro: E('Stolik bistro z 2 krzesłami', 150, 70, 'Jadalnia', 'stol2', [5, 10]),
  stol_barowy: E('Stół barowy', 120, 60, 'Jadalnia', 'stol', [5, 11]),
  kacik_jadalny: E('Kącik jadalny narożny', 180, 150, 'Jadalnia', 'naroznik', [5, 12]),
  // 6 — kuchnia, moduły 60 cm
  zlew: E('Zlewozmywak', 80, 60, 'Kuchnia', 'zlew', [6, 1]),
  zlew_podwojny: E('Zlewozmywak podwójny', 120, 60, 'Kuchnia', 'zlew', [6, 2]),
  plyta_indukcyjna: E('Płyta indukcyjna', 60, 60, 'Kuchnia', 'plyta', [6, 3]),
  plyta_gazowa: E('Płyta gazowa', 60, 60, 'Kuchnia', 'plyta', [6, 4]),
  blat: E('Blat kuchenny', 60, 60, 'Kuchnia', 'blat', [6, 5], 'pow'),
  blat_120: E('Blat kuchenny 120 cm', 120, 60, 'Kuchnia', 'blat', [6, 6]),
  blat_narozny: E('Blat narożny', 100, 100, 'Kuchnia', 'blat_l', [6, 7]),
  zmywarka: E('Zmywarka', 60, 60, 'Kuchnia', 'blat', [6, 8]),
  slupek_piekarnik: E('Słupek z piekarnikiem', 60, 60, 'Kuchnia', 'piekarnik', [6, 9]),
  lodowka: E('Lodówka wolnostojąca', 60, 65, 'Kuchnia', 'lodowka', [6, 10]),
  lodowka_zabudowa: E('Lodówka w zabudowie', 60, 60, 'Kuchnia', 'lodowka', [6, 11]),
  szafka_wysoka: E('Szafka wysoka', 60, 60, 'Kuchnia', 'szafa', [6, 12]),
  // 7 — kuchnia, wyspy i AGD
  wyspa: E('Wyspa kuchenna', 180, 90, 'Kuchnia', 'blat', [7, 1]),
  wyspa_zlew: E('Wyspa ze zlewem', 180, 90, 'Kuchnia', 'zlew', [7, 2]),
  wyspa_plyta: E('Wyspa z płytą', 180, 90, 'Kuchnia', 'plyta', [7, 3]),
  polwysep: E('Półwysep barowy', 160, 130, 'Kuchnia', 'blat', [7, 4]),
  kuchenka: E('Kuchenka wolnostojąca', 60, 60, 'Kuchnia', 'plyta', [7, 5]),
  winiarka: E('Winiarka', 60, 60, 'Kuchnia', 'lodowka', [7, 6]),
  zamrazarka: E('Zamrażarka skrzyniowa', 100, 60, 'Kuchnia', 'lodowka', [7, 7]),
  blat_40: E('Blat wąski 40 cm', 80, 40, 'Kuchnia', 'blat', [7, 8], 'pow'),
  blat_narozny_zlew: E('Blat narożny ze zlewem', 100, 100, 'Kuchnia', 'blat_l', [7, 9]),
  wozek: E('Wózek kuchenny', 50, 40, 'Kuchnia', 'komoda', [7, 10]),
  kacik_kawowy: E('Szafka z ekspresem', 60, 50, 'Kuchnia', 'blat', [7, 11]),
  kosze: E('Kosze na śmieci', 60, 40, 'Kuchnia', 'inny', [7, 12]),
  // 8 — łazienka, ceramika
  wc_podwieszane: E('WC podwieszane', 37, 54, 'Łazienka', 'wc', [8, 1], 'p'),
  wc_kompakt: E('WC kompakt', 38, 65, 'Łazienka', 'wc', [8, 2], 'p'),
  bidet: E('Bidet', 37, 54, 'Łazienka', 'wc', [8, 3], 'p'),
  umywalka_szafka: E('Umywalka z szafką', 60, 45, 'Łazienka', 'umywalka', [8, 4]),
  umywalka_podwojna: E('Umywalka podwójna', 120, 48, 'Łazienka', 'umywalka', [8, 5]),
  umywalka_mala: E('Umywalka mała', 45, 35, 'Łazienka', 'umywalka', [8, 6]),
  wanna: E('Wanna zabudowana', 170, 75, 'Łazienka', 'wanna', [8, 7]),
  wanna_wolnostojaca: E('Wanna wolnostojąca', 170, 105, 'Łazienka', 'wanna', [8, 8]),
  wanna_narozna: E('Wanna narożna', 140, 140, 'Łazienka', 'wanna', [8, 9]),
  prysznic: E('Kabina prysznicowa', 90, 90, 'Łazienka', 'prysznic', [8, 10]),
  prysznic_walkin: E('Prysznic walk-in', 120, 90, 'Łazienka', 'prysznic', [8, 11]),
  prysznic_polokragly: E('Kabina półokrągła', 90, 90, 'Łazienka', 'prysznic', [8, 12]),
  // 9 — pralnia i technika
  pralka: E('Pralka', 60, 60, 'Pralnia i technika', 'pralka', [9, 1], 'p'),
  suszarka: E('Suszarka', 60, 60, 'Pralnia i technika', 'pralka', [9, 2], 'p'),
  pralka_suszarka: E('Pralka z suszarką w słupku', 60, 65, 'Pralnia i technika', 'pralka', [9, 3]),
  szafka_lazienkowa: E('Szafka łazienkowa wysoka', 40, 35, 'Łazienka', 'szafa', [9, 4]),
  grzejnik_lazienkowy: E('Grzejnik łazienkowy', 50, 12, 'Łazienka', 'inny', [9, 5]),
  dywanik: E('Dywanik łazienkowy', 90, 60, 'Łazienka', 'dywan', [9, 6]),
  zlew_gospodarczy: E('Zlew gospodarczy', 50, 45, 'Pralnia i technika', 'umywalka', [9, 7]),
  piec_gazowy: E('Piec gazowy', 45, 28, 'Pralnia i technika', 'inny', [9, 8]),
  bojler: E('Bojler', 50, 50, 'Pralnia i technika', 'kolo', [9, 9], 'p'),
  pisuar: E('Pisuar', 40, 35, 'Łazienka', 'wc', [9, 10], 'p'),
  taboret: E('Taboret', 35, 35, 'Łazienka', 'kolo', [9, 11], 'p'),
  regal_pralnia: E('Regał z koszami', 90, 40, 'Pralnia i technika', 'regal', [9, 12]),
  // 10 — przedpokój i gabinet
  szafka_buty: E('Szafka na buty', 100, 35, 'Przedpokój', 'komoda', [10, 1]),
  wieszak_lawka: E('Wieszak z ławką', 120, 60, 'Przedpokój', 'komoda', [10, 2]),
  szafa_przedpokoj: E('Szafa w przedpokoju', 160, 60, 'Przedpokój', 'szafa', [10, 3]),
  konsola: E('Konsola', 100, 40, 'Przedpokój', 'komoda', [10, 4]),
  biurko: E('Biurko z krzesłem', 120, 110, 'Gabinet', 'biurko', [10, 5]),
  biurko_narozne: E('Biurko narożne', 160, 150, 'Gabinet', 'blat_l', [10, 6]),
  krzeslo_biurowe: E('Krzesło biurowe', 62, 62, 'Gabinet', 'krzeslo_biurowe', [10, 7], 'p'),
  kontener: E('Kontener z szufladami', 45, 55, 'Gabinet', 'komoda', [10, 8]),
  regal_szeroki: E('Regał szeroki', 160, 60, 'Gabinet', 'regal', [10, 9]),
  szafka_drukarka: E('Szafka na drukarkę', 60, 50, 'Gabinet', 'komoda', [10, 10]),
  fotel_lampa: E('Fotel z lampą', 110, 85, 'Gabinet', 'fotel', [10, 11]),
  stojak_parasole: E('Stojak na parasole', 30, 30, 'Przedpokój', 'kolo', [10, 12], 'p'),
  // 11 — biuro i lokal
  biurka_4: E('Zespół 4 biurek', 280, 220, 'Biuro i lokal', 'stol4', [11, 1]),
  stanowisko: E('Stanowisko pracy', 140, 120, 'Biuro i lokal', 'biurko', [11, 2]),
  stol_konferencyjny: E('Stół konferencyjny (8 osób)', 300, 200, 'Biuro i lokal', 'stol8', [11, 3]),
  stol_spotkan: E('Stół spotkań okrągły', 200, 200, 'Biuro i lokal', 'stolokr', [11, 4], 'p'),
  recepcja: E('Lada recepcji', 200, 140, 'Biuro i lokal', 'blat', [11, 5]),
  sofa_poczekalnia: E('Sofa w poczekalni', 200, 80, 'Biuro i lokal', 'sofa', [11, 6]),
  regal_metalowy: E('Regał metalowy', 120, 50, 'Biuro i lokal', 'regal', [11, 7]),
  lada_kasowa: E('Lada kasowa', 160, 70, 'Biuro i lokal', 'blat', [11, 8]),
  regal_sklepowy: E('Regał sklepowy', 120, 50, 'Biuro i lokal', 'regal', [11, 9]),
  stolik_2_rest: E('Stolik restauracyjny (2 os.)', 150, 70, 'Biuro i lokal', 'stol2', [11, 10]),
  stolik_4_rest: E('Stolik restauracyjny (4 os.)', 140, 150, 'Biuro i lokal', 'stol4', [11, 11]),
  bar: E('Lada barowa', 250, 150, 'Biuro i lokal', 'blat', [11, 12]),
  // 12 — balkon i taras
  zestaw_balkonowy: E('Zestaw balkonowy', 150, 70, 'Balkon i taras', 'stol2', [12, 1]),
  sofa_ogrodowa: E('Sofa ogrodowa', 180, 80, 'Balkon i taras', 'sofa', [12, 2]),
  fotel_ogrodowy: E('Fotel ogrodowy', 75, 75, 'Balkon i taras', 'fotel', [12, 3], 'p'),
  lezak: E('Leżak', 70, 190, 'Balkon i taras', 'fotel', [12, 4]),
  stol_ogrodowy: E('Stół ogrodowy z 6 krzesłami', 200, 200, 'Balkon i taras', 'stol6', [12, 5]),
  parasol: E('Parasol', 300, 300, 'Balkon i taras', 'kolo', [12, 6], 'p'),
  grill: E('Grill', 60, 60, 'Balkon i taras', 'kolo', [12, 7], 'p'),
  skrzynka_kwiaty: E('Skrzynka z kwiatami', 80, 40, 'Balkon i taras', 'roslina_pas', [12, 8]),
  donica_oliwka: E('Donica z drzewkiem', 70, 70, 'Balkon i taras', 'roslina', [12, 9], 'p'),
  donica_mala: E('Donica mała', 40, 40, 'Balkon i taras', 'roslina', [12, 10], 'p'),
  fotel_wiszacy: E('Fotel wiszący', 90, 90, 'Balkon i taras', 'kolo', [12, 11], 'p'),
  dywan_zewnetrzny: E('Dywan zewnętrzny', 230, 160, 'Balkon i taras', 'dywan', [12, 12]),
  // 13 — ogród
  drzewo_duze: E('Drzewo liściaste', 600, 600, 'Ogród', 'drzewo', [13, 1], 'p'),
  drzewo_male: E('Drzewko ozdobne', 300, 300, 'Ogród', 'drzewo', [13, 2], 'p'),
  iglak: E('Drzewo iglaste', 300, 300, 'Ogród', 'drzewo', [13, 3], 'p'),
  krzew: E('Krzew', 120, 120, 'Ogród', 'drzewo', [13, 4], 'p'),
  zywoplot: E('Żywopłot', 300, 80, 'Ogród', 'roslina_pas', [13, 5]),
  rabata: E('Rabata kwiatowa', 200, 100, 'Ogród', 'roslina_pas', [13, 6]),
  domek_ogrodowy: E('Domek narzędziowy', 250, 200, 'Ogród', 'inny', [13, 7]),
  pergola: E('Pergola', 300, 300, 'Ogród', 'inny', [13, 8]),
  trampolina: E('Trampolina', 300, 300, 'Ogród', 'kolo', [13, 9], 'p'),
  piaskownica: E('Piaskownica', 150, 150, 'Ogród', 'inny', [13, 10]),
  hustawka: E('Huśtawka', 250, 150, 'Ogród', 'inny', [13, 11]),
  oczko_wodne: E('Oczko wodne', 250, 180, 'Ogród', 'woda', [13, 12]),
  // 14 — garaż i pomieszczenia gospodarcze
  samochod: E('Samochód osobowy', 185, 460, 'Garaż', 'auto', [14, 1]),
  samochod_suv: E('SUV', 195, 480, 'Garaż', 'auto', [14, 2]),
  rower: E('Rower', 60, 175, 'Garaż', 'inny', [14, 3], 'p'),
  motocykl: E('Motocykl', 80, 210, 'Garaż', 'inny', [14, 4], 'p'),
  stol_warsztatowy: E('Stół warsztatowy', 160, 95, 'Garaż', 'biurko', [14, 5]),
  szafka_narzedziowa: E('Szafka narzędziowa', 80, 50, 'Garaż', 'szafa', [14, 6]),
  regal_magazynowy: E('Regał magazynowy', 120, 50, 'Garaż', 'regal', [14, 7]),
  pojemniki_smieci: E('Pojemniki na śmieci', 130, 70, 'Garaż', 'inny', [14, 8]),
  piec_co: E('Piec CO', 60, 80, 'Pralnia i technika', 'inny', [14, 9]),
  pompa_ciepla: E('Pompa ciepła', 110, 45, 'Pralnia i technika', 'inny', [14, 10]),
  klimatyzator: E('Klimatyzator (jednostka zewnętrzna)', 85, 35, 'Pralnia i technika', 'inny', [14, 11]),
  kartony: E('Kartony', 100, 85, 'Garaż', 'inny', [14, 12]),
  // 15 — schody i budynek
  schody_proste: E('Schody proste', 100, 300, 'Schody i budynek', 'schody', [15, 1]),
  schody_l: E('Schody zabiegowe (L)', 280, 260, 'Schody i budynek', 'schody', [15, 2]),
  schody_u: E('Schody dwubiegowe (U)', 220, 260, 'Schody i budynek', 'schody', [15, 3]),
  schody_krecone: E('Schody kręcone', 160, 160, 'Schody i budynek', 'kolo', [15, 4], 'p'),
  schody_betonowe: E('Schody betonowe', 120, 300, 'Schody i budynek', 'schody', [15, 5]),
  schody_strych: E('Schody strychowe', 70, 120, 'Schody i budynek', 'schody', [15, 6]),
  slup_okragly: E('Słup okrągły', 30, 30, 'Schody i budynek', 'kolo_ciemne', [15, 7], 'p'),
  slup_kwadratowy: E('Słup kwadratowy', 30, 30, 'Schody i budynek', 'ciemny', [15, 8]),
  komin: E('Komin', 45, 50, 'Schody i budynek', 'ciemny', [15, 9]),
  koza: E('Piec kominkowy (koza)', 60, 60, 'Salon', 'kolo_ciemne', [15, 10], 'p'),
  winda: E('Winda', 140, 160, 'Schody i budynek', 'inny', [15, 11]),
  wneka: E('Wnęka z półkami', 100, 45, 'Schody i budynek', 'regal', [15, 12]),
  // 16 — rekreacja
  jacuzzi: E('Jacuzzi', 220, 220, 'Rekreacja', 'woda', [16, 1]),
  basen: E('Basen', 800, 400, 'Rekreacja', 'woda', [16, 2]),
  sauna: E('Sauna', 200, 200, 'Rekreacja', 'komoda', [16, 3]),
  bieznia: E('Bieżnia', 80, 190, 'Rekreacja', 'inny', [16, 4]),
  rowerek: E('Rower stacjonarny', 60, 120, 'Rekreacja', 'inny', [16, 5], 'p'),
  laweczka: E('Ławka treningowa', 150, 150, 'Rekreacja', 'inny', [16, 6]),
  bilard: E('Stół bilardowy', 250, 140, 'Rekreacja', 'stol_zielony', [16, 7]),
  ping_pong: E('Stół do ping-ponga', 274, 152, 'Rekreacja', 'stol_zielony', [16, 8]),
  kino: E('Fotele kinowe', 270, 150, 'Rekreacja', 'sofa', [16, 9]),
  barek: E('Barek na kółkach', 70, 45, 'Rekreacja', 'komoda', [16, 10]),
  fotel_masujacy: E('Fotel masujący', 80, 150, 'Rekreacja', 'fotel', [16, 11]),
  mata: E('Mata do jogi', 61, 183, 'Rekreacja', 'dywan', [16, 12]),
  // 20 — elementy pojedyncze (dla skanów: stół bez krzeseł itp.)
  stol: E('Stół prostokątny', 160, 90, 'Jadalnia', 'stol', [20, 1]),
  stol_okragly: E('Stół okrągły', 110, 110, 'Jadalnia', 'stolokr0', [20, 2], 'p'),
  stol_kwadratowy: E('Stół kwadratowy', 90, 90, 'Jadalnia', 'stol', [20, 3]),
  biurko_samo: E('Biurko', 120, 60, 'Gabinet', 'biurko', [20, 4]),
  telewizor: E('Telewizor', 130, 10, 'Salon', 'telewizor', [20, 5]),
  szafka_niska: E('Szafka niska', 100, 52, 'Salon', 'komoda', [20, 6]),
  szafka_waska: E('Szafka wysoka wąska', 50, 40, 'Salon', 'szafa', [20, 7]),
  grzejnik: E('Grzejnik', 100, 10, 'Schody i budynek', 'inny', [20, 8]),
  sofa_rozkladana: E('Sofa rozkładana', 200, 205, 'Salon', 'sofa', [20, 9]),
  biurko_monitor: E('Biurko z monitorem', 140, 70, 'Gabinet', 'biurko', [20, 10]),
  szafka_kuchenna: E('Szafka kuchenna z szufladami', 60, 60, 'Kuchnia', 'blat', [20, 11]),
  skrzynia_lawka: E('Ławka ze schowkiem', 100, 48, 'Przedpokój', 'komoda', [20, 12]),
};

// Skan (RoomPlan) i plany openPlan3D → element biblioteki. Gdy rozmiar wskazuje inny mebel, bierzemy pasujący.
export function rodzajMebla(f) {
  if (f.amRodzaj && MEBLE[f.amRodzaj]) return f.amRodzaj;
  const k = f.catalogId === 'imported_object' ? String(f.sourceCategory || '').toLowerCase() : String(f.catalogId || '');
  const w = f.width || 0, d = f.depth || 0, dl = Math.max(w, d), kr = Math.min(w, d);
  switch (k) {
    case 'bed_queen': case 'bed_king': case 'bed_double': case 'bed': return w > 172 ? 'lozko_180' : w > 110 ? (w > 140 ? 'lozko_160' : 'lozko_120') : 'lozko_90';
    case 'bed_twin': case 'bed_single': return w > 105 ? 'lozko_120' : 'lozko_90';
    case 'sofa': case 'sectional': return kr > 140 ? 'naroznik' : w < 180 ? 'sofa_2' : 'sofa_3';
    case 'loveseat': return 'sofa_2';
    case 'chair': case 'armchair': return dl < 58 ? 'krzeslo' : 'fotel';
    case 'dining_chair': return 'krzeslo';
    case 'office_chair': return 'krzeslo_biurowe';
    case 'coffee_table': return 'stolik';
    case 'side_table': return 'stolik_boczny';
    case 'table': case 'dining_table':
      if (dl < 70) return 'stolik_boczny';
      if (Math.abs(w - d) < 12 && dl < 130) return 'stol_okragly';
      if (Math.max(f.height || 75, 0) < 55) return 'stolik';
      return 'stol';
    case 'desk': return 'biurko_samo';
    case 'tv_stand': return 'szafka_rtv';
    case 'television': case 'tv': return 'telewizor';
    case 'bookshelf': return 'regal';
    case 'nightstand': return 'szafka_nocna';
    case 'dresser': return 'komoda';
    case 'wardrobe': return dl >= 150 ? 'szafa_przesuwna' : 'szafa_2';
    case 'storage':
      if (dl < 60 && kr < 50) return 'szafka_nocna';
      if (kr >= 50) return dl >= 150 ? 'szafa_przesuwna' : 'szafa_2';
      return 'szafka_niska';
    case 'fireplace': return 'kominek';
    case 'rug': return 'dywan';
    case 'round_rug': return 'dywan_okragly';
    case 'runner_rug': return 'chodnik';
    case 'potted_plant': case 'floor_plant': case 'hanging_plant': case 'plant': return dl > 60 ? 'roslina_duza' : dl > 40 ? 'roslina_srednia' : 'roslina_mala';
    case 'floor_lamp': return 'lampa';
    case 'stove': return 'plyta_indukcyjna';
    case 'oven': return 'slupek_piekarnik';
    case 'fridge': case 'refrigerator': return 'lodowka';
    case 'sink_k': return w > 100 ? 'zlew_podwojny' : 'zlew';
    case 'counter': return 'blat';
    case 'dishwasher': return 'zmywarka';
    case 'toilet': return 'wc_kompakt';
    case 'sink_b': case 'sink': return w > 100 ? 'umywalka_podwojna' : w < 50 ? 'umywalka_mala' : 'umywalka_szafka';
    case 'bathtub': return 'wanna';
    case 'shower': return 'prysznic';
    case 'washer_dryer': case 'washerdryer': case 'washer': return 'pralka';
    case 'stairs': return 'schody_proste';
    case 'car_sedan': return 'samochod';
    case 'car_suv': return 'samochod_suv';
    case 'bike': return 'rower';
    case 'workbench': return 'stol_warsztatowy';
    case 'hot_tub': return 'jacuzzi';
    case 'pool_rectangular': return 'basen';
    default: return 'inny';
  }
}
MEBLE.inny = E('Element', 60, 60, 'Inne', 'inny', null);
export const nazwaMebla = (f) => MEBLE[rodzajMebla(f)].nazwa;

// Podłogi: arkusze 17–19 (pola 1–9). Do czasu grafik rysowane proceduralnie (rodzaj, kolor HSL, rozmiar płytki).
const P = (nazwa, a, rodzaj, kolor, extra = {}) => ({ nazwa, a, rodzaj, kolor, ...extra });
export const PODLOGI = {
  dab: P('Dąb jasny', [17, 1], 'deski', [36, 46, 80]),
  dab_miodowy: P('Dąb miodowy', [17, 2], 'deski', [33, 52, 70]),
  dab_szary: P('Dąb szary', [17, 3], 'deski', [35, 10, 74]),
  orzech: P('Orzech', [17, 4], 'deski', [25, 30, 38]),
  jodelka: P('Jodełka dębowa', [17, 5], 'jodelka', [36, 44, 77]),
  jodelka_fr: P('Jodełka francuska', [17, 6], 'jodelka', [36, 40, 79]),
  laminat: P('Panele jasne', [17, 7], 'deski', [38, 34, 82]),
  winyl: P('Winyl szary', [17, 8], 'deski', [30, 6, 80]),
  wykladzina: P('Wykładzina', [17, 9], 'gladka', [40, 30, 88]),
  plytka: P('Płytka beżowa 60×60', [18, 1], 'plytki', [36, 26, 88], { bok: 60 }),
  gres: P('Gres szary 60×120', [18, 2], 'plytki', [30, 6, 84], { bok: 60, dlugi: 120 }),
  marmur: P('Marmur biały', [18, 3], 'plytki', [30, 8, 92], { bok: 60, zylki: true }),
  lastryko: P('Lastryko', [18, 4], 'lastryko', [35, 14, 88]),
  heksagon: P('Heksagon biały', [18, 5], 'plytki', [0, 0, 94], { bok: 15 }),
  szachownica: P('Szachownica', [18, 6], 'szachownica', [0, 0, 90], { bok: 30 }),
  mikrocement: P('Mikrocement', [18, 7], 'gladka', [30, 5, 84]),
  beton: P('Beton polerowany', [18, 8], 'gladka', [210, 3, 70]),
  lupek: P('Łupek ciemny', [18, 9], 'plytki', [210, 6, 30], { bok: 60 }),
  deska_tarasowa: P('Deska tarasowa', [19, 1], 'deski', [28, 34, 58], { szer: 14 }),
  kompozyt: P('Deska kompozytowa', [19, 2], 'deski', [30, 5, 55], { szer: 14 }),
  kostka: P('Kostka betonowa', [19, 3], 'plytki', [30, 4, 66], { bok: 20 }),
  granit: P('Kostka granitowa', [19, 4], 'plytki', [220, 4, 55], { bok: 10 }),
  zwir: P('Żwir', [19, 5], 'gladka', [35, 12, 80]),
  trawa: P('Trawnik', [19, 6], 'gladka', [95, 35, 45]),
  ziemia: P('Kora i ziemia', [19, 7], 'gladka', [22, 35, 28]),
  plyty_tarasowe: P('Płyty tarasowe', [19, 8], 'plytki', [36, 22, 80], { bok: 60 }),
  plytki_balkonowe: P('Płytki balkonowe', [19, 9], 'plytki', [30, 4, 68], { bok: 30 }),
};
export const GRUPY_PODLOG = [['Drewno i miękkie', 17], ['Płytki i kamień', 18], ['Na zewnątrz', 19]];

// podłoga domyślna wg nazwy pomieszczenia
export function podlogaDla(nazwa) {
  const n = String(nazwa || '').toLowerCase();
  if (/łazien|lazien|\bwc\b|toalet|łaźn|natrysk/.test(n)) return 'kamien_lazienka';
  if (/przedpok|korytarz|\bhol\b|wiatroł|wiatrol|sień|klatk/.test(n)) return 'plytka';
  if (/^kuchnia|pralnia|spiżarn|spizarn|kotłown|kotlown|gospodarcz/.test(n)) return 'plytka';
  if (/balkon|loggia/.test(n)) return 'plytki_balkonowe';
  if (/taras/.test(n)) return 'deska_tarasowa';
  if (/ogród|ogrod/.test(n)) return 'trawa';
  if (/garaż|garaz|piwnic|strych|komórk|komork|warsztat/.test(n)) return 'beton';
  return 'dab';
}
PODLOGI.kamien_lazienka = P('Kamień jasny (łazienka)', null, 'plytki', [30, 14, 88], { bok: 60, zylki: true });
// nazwy pomieszczeń do podpowiedzi
export const NAZWY_POMIESZCZEN = ['Salon', 'Salon z aneksem kuchennym', 'Pokój', 'Sypialnia', 'Pokój dziecięcy', 'Gabinet', 'Kuchnia', 'Jadalnia',
  'Łazienka', 'WC', 'Przedpokój', 'Korytarz', 'Garderoba', 'Spiżarnia', 'Pralnia', 'Balkon', 'Taras', 'Loggia', 'Garaż', 'Piwnica', 'Komórka lokatorska', 'Kotłownia', 'Hol', 'Antresola'];
