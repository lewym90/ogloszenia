#!/usr/bin/env bash
# Instaluje (albo aktualizuje) serwer AM Oferty obok istniejących aplikacji.
# Dodaje tylko: /opt/amoferty (własny Node + kod), /var/lib/amoferty (baza, zdjęcia, kopie), /etc/amoferty.env,
# użytkownika systemowego amoferty, usługę amoferty, polecenie amoferty-konto i własną trasę w /etc/caddy/conf.d.
# Niczego innego nie zmienia. Przy błędzie trasy Caddy wycofuje ją.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive NEEDRESTART_SUSPEND=1
DIR=/opt/amoferty
DANE=/var/lib/amoferty
PORT=18930

dodaj_konto() {
  local L N T H1 H2
  if ! ( : </dev/tty ) 2>/dev/null; then echo "Brak terminala. Konto dodasz poleceniem: amoferty-konto"; return 0; fi
  exec 3</dev/tty
  read -rp "Login (małe litery, np. marek): " L <&3
  read -rp "Imię i nazwisko (do stopki ogłoszeń): " N <&3
  read -rp "Telefon (do stopki ogłoszeń, można zostawić puste): " T <&3
  while :; do
    read -rsp "Hasło (min. 12 znaków): " H1 <&3; echo
    [ "${#H1}" -ge 12 ] || { echo "Za krótkie, spróbuj jeszcze raz."; continue; }
    read -rsp "Wpisz je jeszcze raz: " H2 <&3; echo
    [ "$H1" = "$H2" ] && break
    echo "Hasła się różnią, spróbuj jeszcze raz."
  done
  exec 3<&-
  printf '%s' "$H1" | runuser -u amoferty -- env AM_DANE="$DANE" "$DIR/node/bin/node" --no-warnings "$DIR/app/konto.mjs" "$L" "$N" "$T"
}

main() {
[ "$(id -u)" -eq 0 ] || { echo "Uruchom jako root."; exit 1; }
command -v caddy >/dev/null || { echo "STOP: ten skrypt wymaga działającego Caddy."; exit 2; }
CF=/etc/caddy/Caddyfile
grep -q 'conf.d' "$CF" || { echo "STOP: Caddyfile nie wczytuje conf.d. Nic nie zmieniam."; exit 2; }
IP=$(curl -4fsS https://api.ipify.org)
HOST="${IP//./-}.sslip.io"
if ss -ltnpH "( sport = :$PORT )" | grep -q . && ! systemctl is-active --quiet amoferty; then
  echo "STOP: port $PORT jest zajęty przez inną aplikację. Nic nie zmieniam."; exit 2
fi
WOLNE=$(df --output=avail -B1 / | tail -1)
[ "$WOLNE" -gt $((4 * 1024 * 1024 * 1024)) ] || { echo "STOP: na dysku jest mniej niż 4 GB wolnego. Nic nie zmieniam."; exit 2; }
mkdir -p "$DIR" "$DANE"

# --- własny Node (nie dotyka systemowego ani innych aplikacji) ---
case "$(uname -m)" in x86_64) ARCH=x64 ;; aarch64|arm64) ARCH=arm64 ;; *) echo "STOP: nieznany procesor $(uname -m)"; exit 2 ;; esac
NODE="$DIR/node/bin/node"
if [ ! -x "$NODE" ] || [ "$("$NODE" -p 'process.versions.node.split(".")[0]')" -lt 24 ]; then
  echo "Pobieram Node.js 24 (tylko dla AM Oferty)..."
  TMPN=$(mktemp -d)
  curl -fsSL https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt -o "$TMPN/SUMS"
  FILE=$(grep -o "node-v[0-9.]*-linux-$ARCH.tar.xz" "$TMPN/SUMS" | head -1)
  curl -fsSL "https://nodejs.org/dist/latest-v24.x/$FILE" -o "$TMPN/$FILE"
  (cd "$TMPN" && grep " $FILE\$" SUMS | sha256sum -c - >/dev/null) || { echo "STOP: suma kontrolna Node się nie zgadza."; exit 2; }
  rm -rf "$DIR/node"; mkdir -p "$DIR/node"
  tar -xJf "$TMPN/$FILE" -C "$DIR/node" --strip-components=1
  rm -rf "$TMPN"
fi
echo "Node: $("$NODE" -v)"

# --- kod serwera z GitHuba ---
echo "Pobieram najnowszą wersję z GitHuba..."
TMP=$(mktemp -d)
curl -fsSL https://codeload.github.com/lewym90/ogloszenia/tar.gz/main | tar -xz -C "$TMP"
rm -rf "$DIR/app"; mkdir -p "$DIR/app"
cp -r "$TMP"/ogloszenia-main/serwer/. "$DIR/app/"
rm -rf "$TMP"

# --- konto systemowe i dane ---
id amoferty >/dev/null 2>&1 || useradd --system --no-create-home --home-dir "$DANE" --shell /usr/sbin/nologin amoferty
chown -R amoferty:amoferty "$DANE"; chmod 750 "$DANE"
[ -f /etc/amoferty.env ] || ( umask 077; printf 'PORT=%s\nAM_DANE=%s\n' "$PORT" "$DANE" > /etc/amoferty.env )

# --- klucz szyfrowania danych (poza katalogiem danych, tylko root; usługa dostaje go przez LoadCredential) ---
NOWY_KLUCZ=0
if [ ! -s /etc/amoferty/klucz ]; then
  mkdir -p /etc/amoferty; chmod 700 /etc/amoferty
  ( umask 077; head -c 32 /dev/urandom | base64 > /etc/amoferty/klucz )
  NOWY_KLUCZ=1
fi
chmod 600 /etc/amoferty/klucz; chown root:root /etc/amoferty/klucz

cat > /etc/systemd/system/amoferty.service <<EOF
[Unit]
Description=AM Oferty — karta nieruchomości i ogłoszenia
After=network-online.target
[Service]
User=amoferty
Group=amoferty
EnvironmentFile=/etc/amoferty.env
WorkingDirectory=$DIR/app
ExecStart=$NODE --no-warnings $DIR/app/amoferty.mjs
Restart=always
RestartSec=5
LoadCredential=klucz:/etc/amoferty/klucz
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=$DANE
ProtectHome=true
PrivateTmp=true
MemoryMax=400M
Nice=5
[Install]
WantedBy=multi-user.target
EOF

# --- polecenie do dodawania kont i zmiany haseł ---
cat > /usr/local/bin/amoferty-konto <<EOF
#!/usr/bin/env bash
# Dodaje konto wspólnika albo zmienia hasło istniejącego (zmiana hasła wylogowuje urządzenia tego konta).
set -euo pipefail
[ "\$(id -u)" -eq 0 ] || { echo "Uruchom jako root."; exit 1; }
DIR=$DIR; DANE=$DANE
$(declare -f dodaj_konto)
dodaj_konto
EOF
chmod 755 /usr/local/bin/amoferty-konto
cat > /usr/local/bin/amoferty-kod <<'EOF2'
#!/usr/bin/env bash
# Pokazuje kod odzyskiwania (klucz szyfrowania danych AM Oferty). Bez niego kopii nie da się odczytać.
[ "$(id -u)" -eq 0 ] || { echo "Uruchom jako root."; exit 1; }
echo "Kod odzyskiwania AM Oferty:"; cat /etc/amoferty/klucz
EOF2
chmod 700 /usr/local/bin/amoferty-kod

# --- trasa w Caddy: tylko własny plik w conf.d ---
LC=/etc/caddy/conf.d/amoferty.caddy
printf 'handle_path /am-api/* {\n\treverse_proxy 127.0.0.1:%s {\n\t\tflush_interval -1\n\t}\n}\n' "$PORT" > "$LC"
chown --reference="$CF" "$LC"; chmod 644 "$LC"
if ! caddy validate --config "$CF" --adapter caddyfile >/dev/null 2>&1; then rm -f "$LC"; echo "STOP: Caddy nie przyjął trasy. Wycofałem ją, nic się nie zmieniło."; exit 2; fi

systemctl daemon-reload
systemctl enable amoferty >/dev/null 2>&1
systemctl restart amoferty
if ! systemctl reload caddy; then
  rm -f "$LC"; systemctl reload caddy 2>/dev/null || true
  echo "STOP: Caddy nie przeładował konfiguracji. Wycofałem trasę AM Oferty, Twoje aplikacje działają jak wcześniej."
  journalctl -u caddy -n 3 --no-pager | cut -c1-200; exit 2
fi

sleep 3
echo
if curl -fsS --max-time 20 "https://$HOST/am-api/zdrowie" -o /tmp/amoferty-zdrowie.json; then
  echo "Status: OK  $(head -c 60 /tmp/amoferty-zdrowie.json)"
  if grep -q '"konta":0' /tmp/amoferty-zdrowie.json; then
    echo
    echo "=============================================="
    echo "  Teraz załóż swoje konto."
    echo "  Hasło nie będzie widoczne przy wpisywaniu, to normalne."
    echo "  Konto wspólnika dodasz później poleceniem: amoferty-konto"
    echo "=============================================="
    dodaj_konto
  else
    echo "Konta już są. Nowe konto albo zmiana hasła: amoferty-konto"
  fi
else
  echo "Status: BŁĄD, https://$HOST/am-api/zdrowie nie odpowiada."
  journalctl -u amoferty -n 15 --no-pager
fi
if [ "$NOWY_KLUCZ" = 1 ]; then
  echo
  echo "=============================================="
  echo "  KOD ODZYSKIWANIA — przepisz go na kartkę i schowaj w bezpiecznym miejscu."
  echo "  Dane i kopie zapasowe są zaszyfrowane. Bez tego kodu nie da się ich"
  echo "  odtworzyć na innym serwerze. Pokażesz go ponownie poleceniem: amoferty-kod"
  echo
  echo "  $(cat /etc/amoferty/klucz)"
  echo "=============================================="
fi
echo; echo "Twoje pozostałe aplikacje:"
for u in "https://$HOST/lacznik-api/zdrowie" "https://$HOST/lapa/health" "https://$HOST/midgard-api/zdrowie" "https://$HOST/trendo-api/zdrowie" "https://$HOST/smart-home-push/health"; do
  echo "  $(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$u")  $u"
done
echo; echo "Wolne miejsce na dysku: $(df -h --output=avail / | tail -1 | tr -d ' ')"
echo "Aplikacja: https://lewym90.github.io/ogloszenia/"
echo; echo "AM OFERTY GOTOWE"
}
main </dev/null
