#!/usr/bin/env bash
# Fetch third-party inputs that are not committed: font binaries (OFL, from github.com/google/fonts),
# the served Google Fonts Arabic subsets (for byte sizes), and the Bootstrap RTL examples (MIT) used as
# the "open-source RTL-capable project" for the RTL checker. Run once before `node run.mjs`.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
fonts="$here/fonts"; ext="${S8_EXT:-/tmp/s2-S8}"
mkdir -p "$fonts/served" "$ext"
# google/fonts pinned to the commit measured on 2026-09-28
raw=https://raw.githubusercontent.com/google/fonts/23e54b51ddffbc7713c583748e3bd86f62b1fa4a/ofl
get() { [ -s "$fonts/$2" ] || curl -sSfL -o "$fonts/$2" "$raw/$1"; }
get 'notonaskharabic/NotoNaskhArabic%5Bwght%5D.ttf' NotoNaskhArabic.ttf
get 'notosansarabic/NotoSansArabic%5Bwdth,wght%5D.ttf' NotoSansArabic.ttf
get 'notokufiarabic/NotoKufiArabic%5Bwght%5D.ttf' NotoKufiArabic.ttf
get 'ibmplexsansarabic/IBMPlexSansArabic-Regular.ttf' IBMPlexSansArabic.ttf
get 'ibmplexsansarabic/IBMPlexSansArabic-Bold.ttf' IBMPlexSansArabic-Bold.ttf
get 'tajawal/Tajawal-Regular.ttf' Tajawal.ttf
get 'cairo/Cairo%5Bslnt,wght%5D.ttf' Cairo.ttf
get 'almarai/Almarai-Regular.ttf' Almarai.ttf
get 'readexpro/ReadexPro%5BHEXP,wght%5D.ttf' ReadexPro.ttf
get 'alexandria/Alexandria%5Bwght%5D.ttf' Alexandria.ttf
get 'vazirmatn/Vazirmatn%5Bwght%5D.ttf' Vazirmatn.ttf
get 'notonastaliqurdu/NotoNastaliqUrdu%5Bwght%5D.ttf' NotoNastaliqUrdu.ttf
get 'inter/Inter%5Bopsz,wght%5D.ttf' Inter.ttf
get 'ibmplexsans/IBMPlexSans%5Bwdth,wght%5D.ttf' IBMPlexSans.ttf
get 'notosans/NotoSans%5Bwdth,wght%5D.ttf' NotoSans.ttf

# What a page actually downloads: the Arabic and Latin subsets Google Fonts serves for weight 400.
UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36'
for fam in 'Noto Naskh Arabic' 'Noto Sans Arabic' 'Noto Kufi Arabic' 'IBM Plex Sans Arabic' 'Tajawal' 'Cairo' 'Almarai' 'Readex Pro' 'Alexandria' 'Vazirmatn' 'Noto Nastaliq Urdu'; do
  slug=$(echo "$fam" | tr -d ' ')
  [ -s "$fonts/served/$slug.css" ] || curl -sSf -A "$UA" -o "$fonts/served/$slug.css" "https://fonts.googleapis.com/css2?family=$(echo "$fam" | tr ' ' '+'):wght@400&display=swap"
  # one file per subset comment (/* arabic */, /* latin */ …)
  awk '/\/\* /{s=$2} /src: url/{match($0,/https:[^)]+/); print s, substr($0,RSTART,RLENGTH)}' "$fonts/served/$slug.css" | while read -r sub url; do
    f="$fonts/served/$slug-$sub.woff2"; [ -s "$f" ] || curl -sSf -o "$f" "$url"
  done
done
# Which Google families have the Saudi riyal sign U+20C1: ask the API for a one-character subset. The API answers 400
# when the family has no glyph for it, so a missing .woff2 means "no U+20C1". (These probes reflect the day they ran.)
mkdir -p "$fonts/riyal"
for fam in 'Noto Sans' 'Noto Sans Arabic' 'Noto Naskh Arabic' 'Noto Kufi Arabic' 'IBM Plex Sans Arabic' 'IBM Plex Sans' 'Tajawal' 'Cairo' 'Almarai' 'Readex Pro' 'Alexandria' 'Vazirmatn' 'Rubik' 'Inter' 'Roboto' 'Noto Sans Symbols' 'Noto Sans Symbols 2' 'Amiri' 'Beiruti' 'Baloo Bhaijaan 2' 'Changa' 'El Messiri' 'Mada' 'Markazi Text' 'Lalezar' 'Harmattan' 'Scheherazade New' 'Lateef' 'Reem Kufi' 'Zain' 'Kufam' 'Marhey' 'Blaka' 'Handjet' 'Playpen Sans Arabic' 'Noto Sans Math'; do
  slug=$(echo "$fam" | tr -d ' ')
  css="$fonts/riyal/$slug.css"
  [ -s "$css" ] || curl -sS -A "$UA" -o "$css" "https://fonts.googleapis.com/css2?family=$(echo "$fam" | tr ' ' '+')&text=%E2%83%81" || true
  url=$(grep -o 'https://fonts.gstatic.com[^)]*' "$css" | head -1 || true)
  [ -n "$url" ] && { [ -s "$fonts/riyal/$slug.woff2" ] || curl -sSf -o "$fonts/riyal/$slug.woff2" "$url" || true; }
done

# The one-glyph Saudi riyal face (OFL-1.1, @emran-alhaddad/saudi-riyal-font) for the U+20C1 fallback test.
if [ ! -d "$ext/riyalpkg/package" ]; then mkdir -p "$ext/riyalpkg" && (cd "$ext/riyalpkg" && npm pack --silent @emran-alhaddad/saudi-riyal-font@1.1.0 >/dev/null && tar xzf ./*.tgz); fi

# Chart.js for the Bootstrap dashboard examples (they load it from a CDN the lab cannot reach).
[ -d "$here/node_modules/chart.js" ] || (cd "$here" && npm install --no-audit --no-fund chart.js@4.3.2 >/dev/null)

# Bootstrap RTL examples (MIT). Sparse and shallow; built into static HTML by lib/bootstrap-pages.mjs.
BS=46a88042b323d78c580352085ca60afca5c6c405   # twbs/bootstrap main on 2026-09-22
if [ ! -d "$ext/bootstrap/.git" ]; then
  git clone -q --depth 1 --filter=blob:none --sparse https://github.com/twbs/bootstrap.git "$ext/bootstrap"
  (cd "$ext/bootstrap" && git sparse-checkout set dist/css dist/js site/src/assets/examples)
fi
(cd "$ext/bootstrap" && { [ "$(git rev-parse HEAD)" = "$BS" ] || { git fetch -q --depth 1 origin "$BS" && git checkout -q "$BS"; }; })
# Icon metadata the RTL icon classifier is generated from (lab/icon-lists.mjs → lib/icon-names.json), pinned.
mkdir -p "$ext/sources"
[ -s "$ext/sources/codex-icons.ts" ] || curl -sSfL -o "$ext/sources/codex-icons.ts" https://raw.githubusercontent.com/wikimedia/design-codex/8a1caafc584ac3b22e4b87bd02593b3f5346b28e/packages/codex-icons/src/icons.ts
[ -s "$ext/sources/flutter-icons.dart" ] || curl -sSfL -o "$ext/sources/flutter-icons.dart" https://raw.githubusercontent.com/flutter/flutter/929df566a7c3800cb44bfadbac4de6f718ca0377/packages/flutter/lib/src/material/icons.dart
# aegov (MIT) tab keyboard handler, for lab/keys.mjs
[ -s "$ext/sources/aegov-custom.js" ] || curl -sSfL -o "$ext/sources/aegov-custom.js" https://raw.githubusercontent.com/TDRA-ae/aegov-dls/d309bb51cf061e3d10844598748b256c39df2f16/js/src/components/custom.js

# Out-of-sample pages for the checkers (run.mjs part "oos"). GOV-SA's 2020 design system (licence: "gpl-3.0" in its
# package.json only; used here as a test input, not redistributed): its dist page, as shipped (LTR) and with dir=rtl.
if [ ! -d "$ext/design-system-gov.sa/.git" ]; then
  git clone -q --depth 1 --filter=blob:none --sparse https://github.com/GOV-SA/design-system-gov.sa.git "$ext/design-system-gov.sa"
  (cd "$ext/design-system-gov.sa" && git sparse-checkout set dist)
fi
GOVSA=babbe608c242b70d4f3074e0cda8a5fdb719d30a
(cd "$ext/design-system-gov.sa" && { [ "$(git rev-parse HEAD)" = "$GOVSA" ] || { git fetch -q --depth 1 origin "$GOVSA" && git checkout -q "$GOVSA"; }; })
for d in ltr rtl; do
  mkdir -p "$ext/govsa-$d" && cp -r "$ext/design-system-gov.sa/dist/." "$ext/govsa-$d/"
  # the dist page ships without its stylesheet and script tags; add them, and set the direction for the RTL copy
  node -e 'const fs=require("fs");const [f,d]=process.argv.slice(1);let h=fs.readFileSync(f,"utf8");if(!h.includes("govsa-ds.css"))h=h.replace("</head>","<link rel=\"stylesheet\" href=\"css/govsa-ds.css\"></head>").replace("</body>","<script src=\"js/govsa-ds.js\"></script></body>");if(d==="rtl")h=h.replace("<html dir=\"ltr\">","<html dir=\"rtl\" lang=\"ar\">");fs.writeFileSync(f,h)' "$ext/govsa-$d/index.html" "$d"
done

# Pages from this repository's tools/regress fixtures, read at a pinned commit (git show; the working tree is left alone).
REPO="$(cd "$here/../../../.." && pwd)"; RC=f62da940d83bec304072008e0a3328ae5afb9e78
mkdir -p "$ext/regress/govuk" "$ext/regress/parity"
for f in govuk.html govuk/govuk-frontend.min.css govuk/LICENSE.txt dashboard.html app-traps.html audit-numbers.html capture-reach-rtl.html; do
  [ -s "$ext/regress/$f" ] || git -C "$REPO" show "$RC:tools/regress/fixtures/$f" > "$ext/regress/$f"
done
for v in new old; do [ -s "$ext/regress/parity/$v.html" ] || git -C "$REPO" show "$RC:tools/regress/fixtures/parity/$v/index.html" > "$ext/regress/parity/$v.html"; done

echo "fetched: $(ls "$fonts"/*.ttf | wc -l) fonts, $(ls "$fonts"/served/*.woff2 | wc -l) served subsets, riyal probes $(ls "$fonts"/riyal/*.woff2 2>/dev/null | wc -l); bootstrap $(cd "$ext/bootstrap" && git log -1 --format=%h)"
