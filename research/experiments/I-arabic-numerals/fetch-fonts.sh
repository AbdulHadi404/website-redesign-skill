#!/usr/bin/env bash
# Re-download the Google Fonts subsets used by lab.mjs, digit-swap.mjs and the sweep (binaries are not committed).
set -euo pipefail
cd "$(dirname "$0")"
UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36'
get() { # family, subset, outfile
  local css url
  css=$(curl -sS -A "$UA" "https://fonts.googleapis.com/css2?family=${1// /+}")
  url=$(echo "$css" | awk -v s="/\\\\* $2 \\\\*/" '$0 ~ s {f=1} f && /src:/ {match($0,/https:[^)]*/); print substr($0,RSTART,RLENGTH); exit}')
  [ -n "$url" ] && curl -sS -o "$3" "$url" || echo "no $2 subset for $1"
}
mkdir -p fonts sweep
get "IBM Plex Sans Arabic" arabic fonts/plex-arabic.woff2;  get "IBM Plex Sans Arabic" latin fonts/ibm-plex-sans-arabic-latin.woff2
get "Noto Sans Arabic" arabic fonts/noto-arabic.woff2;      get "Noto Sans Arabic" latin fonts/noto-sans-arabic-latin.woff2
for f in Cairo Tajawal Almarai; do l=$(echo $f | tr A-Z a-z); get "$f" arabic fonts/$l-arabic.woff2; get "$f" latin fonts/$l-latin.woff2; done
for fam in "Readex Pro" "Alexandria" "Beiruti" "Vazirmatn" "Rubik" "Mada" "Amiri" "Markazi Text" "Noto Kufi Arabic" "Noto Naskh Arabic" \
  "Changa" "El Messiri" "Reem Kufi" "Lalezar" "Baloo Bhaijaan 2" "Harmattan" "Lateef" "Scheherazade New" "Zain" "IBM Plex Sans Arabic" \
  "Cairo" "Almarai" "Tajawal" "Noto Sans Arabic" "Kufam" "Blaka" "Marhey" "Handjet" "Playpen Sans Arabic" "Rubik Mono One"; do
  n=$(echo "$fam" | tr 'A-Z ' 'a-z-'); get "$fam" arabic "sweep/$n-arabic.woff2"; get "$fam" latin "sweep/$n-latin.woff2"
done
