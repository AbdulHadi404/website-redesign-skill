#!/usr/bin/env bash
# Re-run every tool on both lab pages. Needs the static server: node scripts/serve.mjs 4173 pages
set -u
export CHROME_PATH=${CHROME_PATH:-/opt/pw-browsers/chromium-1194/chrome-linux/chrome}
B=http://localhost:4173
t() { local s=$(date +%s.%N); "$@"; local rc=$?; printf '   [%s exit=%s %.1fs]\n' "$1 ${2:-}" $rc "$(echo "$(date +%s.%N) - $s" | bc)"; }
for p in flawed fixed; do
  echo "================ $p ================"
  t node scripts/run-axe.mjs $p.html --all-rules | head -3
  t npx pa11y --config ./pa11y.json --reporter json $B/$p.html > results/pa11y-$p.json
  t npx lighthouse $B/$p.html --only-categories=accessibility --output=json --output-path=results/lh-$p.json --chrome-flags="--headless=new --no-sandbox" --quiet
  t node scripts/run-ibm.mjs $p.html IBM_Accessibility | head -1
  t node scripts/a11y-audit.mjs $B/$p.html --out results/audit-$p > results/audit-$p/stdout.txt; head -2 results/audit-$p/stdout.txt | tail -1
  t node scripts/widget-contracts.mjs $B/$p.html contracts-$p.json > results/contracts-$p.txt; grep -c "^FAIL" results/contracts-$p.txt
done
