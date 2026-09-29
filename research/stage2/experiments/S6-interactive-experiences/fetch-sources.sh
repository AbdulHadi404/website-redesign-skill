#!/usr/bin/env sh
# Clone the open-source games and experiences S6 reads, at the commits it read
# (shallow; outside the repo). Nothing here is redistributed in this folder.
#   sh fetch-sources.sh [dir]        default dir: /tmp/s2-S6
set -e
DIR="${1:-${S6_SOURCES:-/tmp/s2-S6}}"
mkdir -p "$DIR"
fetch() { # name url commit
  if [ ! -d "$DIR/$1/.git" ]; then git clone --depth 50 "$2" "$DIR/$1"; fi
  git -C "$DIR/$1" checkout -q "$3" 2>/dev/null || { git -C "$DIR/$1" fetch -q --depth 50 origin "$3" && git -C "$DIR/$1" checkout -q "$3"; } || echo "warn: $1 not at $3 (read the current HEAD instead)"
}
fetch adarkroom       https://github.com/doublespeakgames/adarkroom.git            1fada4620b6c66bd07bf15a3f1eb8223df8bc1d7
fetch 2048            https://github.com/gabrielecirulli/2048.git                  478b6ec346e3787f589e4af751378d06ded4cbbc
fetch juicy-breakout  https://github.com/grapefrukt/juicy-breakout.git             e8f271018b91120e1d4243e418614ff581532ed1
fetch trust           https://github.com/ncase/trust.git                           6ec45d73befdb922bd40654dd1c1c903a953562f
fetch polygons        https://github.com/ncase/polygons.git                        3ec3fd74a52ce24f74790a47f117d1a3abefbbb7
fetch chrome-music-lab https://github.com/googlecreativelab/chrome-music-lab.git   e54bb414908da2b6286a6ad6431a5fcf8b68dc3f
fetch folio-2019      https://github.com/brunosimon/folio-2019.git                 540f13573a6da282eae942a4c67335b97cd18970
fetch hextris         https://github.com/hextris/hextris.git                       3f4847dc8fd7dab3d1c87e6324b9159d92fbd396
fetch BrowserQuest    https://github.com/mozilla/BrowserQuest.git                  af32d247cac3495ca430d0effbb88dd5f3250b2c
fetch react-three-a11y https://github.com/pmndrs/react-three-a11y.git              0a412c3774a010fcb928cc378a9bee54ba05209a
fetch post--communicating-with-interactive-articles https://github.com/distillpub/post--communicating-with-interactive-articles.git fcf99f53bfe564c1e82d85a1c5b530e8471ba76c
# Archie Tse, "Why we are doing fewer interactives" (Malofiej 2016), slides as PDF
mkdir -p "$DIR/tse" && [ -f "$DIR/tse/tse.pdf" ] || curl -sSL -o "$DIR/tse/tse.pdf" https://raw.githubusercontent.com/archietse/malofiej-2016/master/tse-malofiej-2016-slides.pdf
echo "sources in $DIR"
