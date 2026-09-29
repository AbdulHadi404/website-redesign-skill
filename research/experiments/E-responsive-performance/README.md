# perf-lab — responsive & performance experiments (2026-09-28)

Environment: Node 22.22, Playwright 1.56.1, Chromium 141.0.7390.37 at
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, Lighthouse 13.5.0, LHCI 0.15.1 (bundles LH 12.6.1),
web-vitals 6.2.2, sharp 0.35.5, SVGO 4.1.0, capsize 4.x, utopia-core 1.6.0, web-features 3.40.0, BCD 8.1.3.

```bash
cd perf-lab && npm i                       # deps in package.json
export CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
npx serve site -l 5055 --no-clipboard &    # NOTE: serve 301-redirects /x.html -> /x ; use /bad, /good

# Lighthouse (lab), ~11-13 s per run with simulated throttling
npx lighthouse http://localhost:5055/bad --only-categories=performance \
  --output=json --output=html --output-path=reports/bad-mobile \
  --chrome-flags="--headless=new --no-sandbox --disable-gpu" --quiet
npx lighthouse http://localhost:5055/bad --preset=desktop ...          # desktop
npx lighthouse ... --throttling.cpuSlowdownMultiplier=10               # low-end Android from a fast host
node lh-summary.mjs reports/*.json                                      # score, metrics, LCP element, failing insights

# Lighthouse CI budgets (3 runs, median) — config in lighthouserc.json
npx lhci autorun
# Site-wide: unlighthouse (config in unlighthouse.config.mjs; PUPPETEER_SKIP_DOWNLOAD=1 at install)
npx unlighthouse-ci --config-file unlighthouse.config.mjs
# INP in the lab: Lighthouse user flow (navigation + timespan with real clicks)
node lh-flow.mjs http://localhost:5055/bad "#buy"

# Field-style vitals with attribution under cheap-Android emulation (Playwright + CDP)
node measure-vitals.mjs http://localhost:5055/bad --device "Moto G4" --cpu 4 --net slow4g --click "#buy" [--trace t.json] [--runs 3]

# Responsive sweep: 16 viewport classes, overflow root cause, targets, tiny text, scroll regions, zoom 100/200/400
node responsive-sweep.mjs http://localhost:5055/bad [--shots dir] [--widths 320,360,768]

# Fonts: metric-matched fallback from the real files; CLS of 5 fallback strategies
node font-fallback.mjs site/fonts/playfair-700-latin.woff2 "Playfair Display" /usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf
node gen-font-pages.mjs && node font-cls.mjs

# Fluid type/space tokens + WCAG 1.4.4 check per step (Utopia math)
node fluid-scale.mjs 360 1440 16 19 1.2 1.333 6 viewport

# DOM size / content-visibility vs render time and density-toggle INP
node dom-cost.mjs
# Bundle cost of UI deps (esbuild, min+gzip+brotli)
cd bundles && node measure-bundles.mjs
# Images: responsive widths in JPEG/WebP/AVIF; SVGO
node make-assets.mjs ; npx svgo --config svgo.config.mjs in.svg -o out.svg
# Capture-method test (viewport-unit trap, lazy images)
node capture-test.mjs ; node shot-vh-trap.mjs ; node mq-check.mjs
```

Test pages in `site/`: `bad.html` (every common mistake), `good.html` (same content fixed), `primitives.html`
(Every-Layout-style primitives, container-query card, two table strategies, bottom nav — 0 overflow 320–1920),
`font-*.html` (fallback strategies), `lazy-gallery.html` (capture test).

## Regenerating the binary assets (not committed)

```bash
node make-assets.mjs     # site/img/hero-{480..2400}.{jpg,webp,avif}, hero-raw.png (8.5 MB), fonts/display.ttf
node gen-js.mjs          # site/app-bad.js (500 KB CPU-burning bundle for bad.html)
curl -o site/fonts/playfair-700-latin.woff2 \
  https://fonts.gstatic.com/s/playfairdisplay/v40/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKeiunDXbtM.woff2
cd bundles && npm i esbuild react react-dom preact @mui/material @emotion/react @emotion/styled @radix-ui/react-dialog \
  @headlessui/react @base-ui/react react-aria-components lucide-react react-icons @phosphor-icons/react date-fns dayjs \
  moment luxon motion gsap chart.js recharts echarts @tanstack/react-table ag-grid-community ag-grid-react lodash lodash-es zod
```
Full report: `research/streams/E-responsive-mobile-performance.md`.
