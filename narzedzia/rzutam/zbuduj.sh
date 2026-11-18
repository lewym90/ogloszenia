#!/usr/bin/env bash
# Buduje js/plan/geom.js — logikę z openPlan3D (MIT) dla edytora Rzut AM: walidacja planu, wykrywanie pomieszczeń,
# metraż wewnętrzny, import skanu RoomPlan, symbol drzwi, katalog mebli. Użycie: bash narzedzia/rzutam/zbuduj.sh
set -euo pipefail
WERSJA=771c9e1ad30bd1c3cc7584d6eca74deb2e14943d   # ten sam commit co edytor w rzut/
TU="$(cd "$(dirname "$0")" && pwd)"; CEL="$TU/../../js/plan/geom.js"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
git clone -q https://github.com/laanlabs/openPlan3D "$TMP/op3d"; git -C "$TMP/op3d" checkout -q "$WERSJA"
cd "$TMP/op3d"; npm ci --no-audit --no-fund --ignore-scripts >/dev/null
echo "export const base = ''; export const assets = '';" > "$TMP/paths.js"; echo "export default {};" > "$TMP/cat.js"
cp "$TU/wejscie.ts" src/amwejscie.ts
mkdir -p "$(dirname "$CEL")"
npx esbuild src/amwejscie.ts --bundle --format=esm --minify --legal-comments=none \
  --alias:\$lib=./src/lib --alias:\$app/paths="$TMP/paths.js" --alias:virtual:catalog-assets="$TMP/cat.js" \
  --banner:js="/* Fragmenty openPlan3D (c) laanlabs, licencja MIT — rzut/LICENSE-openPlan3D.txt; JSZip (MIT/GPLv3, używany na MIT). */" \
  --outfile="$CEL"
echo "Gotowe: $CEL ($(du -h "$CEL" | cut -f1))"
