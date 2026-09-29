#!/usr/bin/env bash
# Fetches and builds the third-party pages the scripts are tested on (not committed).
#  1. Astro's "portfolio" example (MIT, github.com/withastro/astro, examples/portfolio), pinned: the "real site".
#  2. Bootstrap's examples (MIT, github.com/twbs/bootstrap, the commit S8 pinned), LTR and RTL: held-out pages added
#     after the review (lib/extra-pages.mjs turns the Astro sources into static pages).
#  3. The CSS the G-product-lab pages were written for, from npm (@carbon/styles 1.116.0 Apache-2.0, @primer/css
#     21.5.1 MIT), so those pages render styled.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
DEST=${S7_SITES:-/tmp/s2-S7}
COMMIT=faac481dc86efdd2e4987069a7298f2aea3f1c6c
mkdir -p "$DEST"
if [ ! -d "$DEST/portfolio/dist" ]; then
  if [ ! -d "$DEST/astro/.git" ]; then
    git clone --depth 1 --filter=blob:none --sparse https://github.com/withastro/astro "$DEST/astro"
    git -C "$DEST/astro" sparse-checkout set examples/portfolio
  fi
  git -C "$DEST/astro" fetch --depth 1 origin "$COMMIT" 2>/dev/null && git -C "$DEST/astro" checkout -q "$COMMIT" || echo "(pinned commit not fetched; using the clone's HEAD $(git -C "$DEST/astro" rev-parse --short HEAD))"
  rm -rf "$DEST/portfolio" && cp -r "$DEST/astro/examples/portfolio" "$DEST/portfolio"
  (cd "$DEST/portfolio" && npm install --no-audit --no-fund >/dev/null && npx astro build >/dev/null)
fi
echo "astro: $DEST/portfolio/dist"

BS=46a88042b323d78c580352085ca60afca5c6c405
if [ ! -d "$DEST/bootstrap/.git" ]; then
  git clone -q --depth 1 --filter=blob:none --sparse https://github.com/twbs/bootstrap.git "$DEST/bootstrap"
  git -C "$DEST/bootstrap" sparse-checkout set dist/css dist/js site/src/assets/examples
fi
[ "$(git -C "$DEST/bootstrap" rev-parse HEAD)" = "$BS" ] || { git -C "$DEST/bootstrap" fetch -q --depth 1 origin "$BS" && git -C "$DEST/bootstrap" checkout -q "$BS"; }

mkdir -p "$DEST/pkgs"
for spec in "carbon @carbon/styles@1.116.0" "primer @primer/css@21.5.1"; do
  set -- $spec
  if [ ! -d "$DEST/pkgs/$1/package" ]; then mkdir -p "$DEST/pkgs/$1" && (cd "$DEST/pkgs/$1" && npm pack --silent "$2" >/dev/null && tar xzf ./*.tgz); fi
done
node "$here/lib/extra-pages.mjs"
