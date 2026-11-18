#!/usr/bin/env bash
# Buduje edytor rzutów (openPlan3D, MIT) z łatkami AM Oferty i wkłada go do ../../rzut
# Użycie: bash narzedzia/rzut/zbuduj.sh   (wymaga git, node 20+, npm, python3)
set -euo pipefail
WERSJA=771c9e1ad30bd1c3cc7584d6eca74deb2e14943d   # przypięty commit laanlabs/openPlan3D (14.11.2026)
TU="$(cd "$(dirname "$0")" && pwd)"; CEL="$TU/../../rzut"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
git clone -q https://github.com/laanlabs/openPlan3D "$TMP/op3d"
git -C "$TMP/op3d" checkout -q "$WERSJA"
python3 "$TU/lataj.py" "$TMP/op3d"
cd "$TMP/op3d"
npm ci --no-audit --no-fund
npm i -D --no-audit --no-fund @sveltejs/adapter-static@3
PUBLIC_ENABLE_ANALYTICS=false npx vite build
cp 404.html index.html 2>/dev/null || true
rm -rf "$CEL"; mkdir -p "$CEL"; cp -r build/. "$CEL/"
cp "$CEL/404.html" "$CEL/index.html"
# GitHub Pages: podstrony projektu nie dostają 404.html z podkatalogu, ale /rzut/editor obsłuży editor.html
cp "$CEL/404.html" "$CEL/editor.html"
rm -f "$CEL"/test-*.json
cp LICENSE "$CEL/LICENSE-openPlan3D.txt"
for f in static/models/*License*.txt static/textures/CREDITS.md; do [ -f "$f" ] && cp "$f" "$CEL/"; done
echo "Gotowe: $CEL ($(du -sh "$CEL" | cut -f1))"
