# Performance is design

Read in Phase 3 (the budget belongs in `DESIGN.md`), Phase 5 (the decisions that spend it) and Phase 6 (measurement). A beautiful redesign that is slower than the site it replaces has failed. Evidence: `research/streams/E-…` (web-vitals 6.2, Lighthouse 13.5, HTTP Archive Web Almanac 2025, Russell's *Performance Inequality Gap 2026*; lab numbers measured 2026-09-28).

## 1. Targets

Core Web Vitals at the 75th percentile, phone and desktop separately: **LCP ≤ 2.5 s** (poor > 4 s), **INP ≤ 200 ms** (poor > 500 ms), **CLS ≤ 0.1** (poor > 0.25). Only ~48% of origins pass on phones (Almanac 2025). The realistic phone is a mid-tier Android on 9 Mbps / 100 ms (Russell 2026), not the developer's laptop.

| Budget (phone, compressed) | Marketing / content | Ecommerce | App / dashboard (per route) | Signature experience (its own route) |
| --- | --- | --- | --- | --- |
| JavaScript, initial | **≤ 100 KB** (islands only; 0 for static pages) | ≤ 200 KB | **≤ 300 KB** | chrome and controls as an app; the engine and scene load late, after a poster, and are not counted against the initial budget of the marketing page that links here (that page stays within its own column) |
| CSS | ≤ 50 KB | ≤ 75 KB | ≤ 100 KB | as an app |
| Fonts | ≤ 2 files preloaded, ≤ 100 KB WOFF2 in total | same | same (a system UI font is a valid choice) | same |
| LCP image | ≤ 150–250 KB at the rendered width, AVIF | ≤ 200 KB | usually text | the poster: a real render in the first frame's framing, AVIF, ≤ 150–250 KB as on a marketing page (`motion.md` §9) |
| Images in the first viewport | ≤ 300 KB | ≤ 400 KB | — | ≤ 300 KB, the poster included |
| Third parties on the critical path | 1–2 | ≤ 3 | ≤ 2 | as an app |
| DOM in an interactive view | — | ≤ ~1,500 elements on a listing before virtualising | virtualise or `content-visibility` beyond ~2–3k rows | — |
| 3D models and textures | `motion.md` §9 | same | same | `motion.md` §9's budgets, enforced per asset by the build (`realtime-3d.md` §5) |
| Frame time | — | — | — | no dropped frames against the display's own refresh, judged over runs of continuous frames, never in the first seconds after load or a tier change; measured on a real GPU (`visual-qa.md` "3D and WebGL experiences"); over budget, step down a quality tier, never design a smaller experience (`realtime-3d.md` §6) |

**Pages around a signature product (lab, phone profile).** When the site frames a signature experience, the marketing pages around it carry no WebGL (stills rendered by the product hand over to it, `motion.md` §9) and meet a stricter lab budget: **LCP ≤ 2.0 s, INP ≤ 150 ms, CLS ≤ 0.05, zero `requestAnimationFrame` at rest, ≤ 6 composited layers moving per frame**. It is measured in the lab, with `perf.mjs` or Lighthouse on a throttled phone (INP from a user flow, §6). It is stricter than the field thresholds at p75 above and does not replace them: both apply. No script here measures the last two items (`perf.mjs` reports LCP, CLS and TBT; `audit.mjs` is an unthrottled smoke test), so check them by hand in DevTools: the Performance panel for `requestAnimationFrame` callbacks while nothing moves, the Layers panel (or Rendering → Layer borders) for the composited layers that move, and Rendering → paint flashing for anything that repaints instead. Evidence: the 2026-09-28 Cake Junction (website around the Cake Studio) row in `lessons.md`.

Write the budget into `DESIGN.md`; the redesign must not be slower than the audit baseline. Compare like with like: when the baseline was broken (its web fonts never loaded, an image 404'd, a script failed), it is flatteringly fast — report both numbers, say what the baseline skipped, and hold the redesign to the budget rather than to the broken number.

## 2. What each UI decision costs

| Decision | Hurts | Mitigation |
| --- | --- | --- |
| Full-bleed photo hero | LCP (and CLS if unsized) | `<picture>` AVIF with `srcset`/`sizes`, `fetchpriority="high"`, width/height, never lazy, ≤ 200 KB |
| Hero carousel | LCP (JS-rendered first slide), INP, CLS | a static first slide in the HTML, no autoplay — or no carousel |
| Hero video | LCP (the poster is the candidate) | an optimised poster; `preload="none"`; a click-to-play facade |
| Display web font on a text hero | LCP, CLS (swap) | preload one WOFF2; fallback metrics computed from the *actual* fallback file, or `font-display: optional` |
| Hero entrance fading from opacity 0 | LCP (the element paints late) | start visible; animate transform only |
| Client-rendered page / full hydration for one widget | LCP, INP | static or server rendering with islands |
| A big component kit on a marketing page | INP, JS weight (one MUI Button = 37 KB) | native HTML; headless primitives; per-component imports |
| Icons via `import *` or string lookup | JS weight (lucide-react `import *` = **192 KB** vs 2 KB for three named icons) | named imports or a sprite |
| Chart library on a landing route | LCP, INP, CLS | tree-shake (ECharts core + one line chart 172 KB vs 375 KB full); lazy-mount; reserve the aspect ratio |
| Data grid with thousands of rows; density or theme toggles on big views | INP | pagination, virtualisation, `content-visibility: auto` |
| Filters re-rendering a large list per keystroke | INP | debounce, yield, `startTransition`, a Worker |
| Cookie / promo banner inserted at the top | CLS | a fixed overlay at the bottom, animated with transform |
| Ads, embeds, review widgets | CLS, INP | reserved min-height; facades; load on idle |
| Sticky header that changes height on scroll | CLS | fixed height; animate transform/opacity |
| Skeletons or accordions that differ from the final height | CLS | skeleton = final dimensions |
| `backdrop-filter` blur on large sticky or scrolling panels; many big shadows; `will-change` everywhere | INP (presentation), GPU memory | small blur areas only; pseudo-element shadows; `will-change` only while animating |
| Scroll-linked JS effects | INP, CLS | CSS scroll-driven animation as enhancement, or none |
| Chat widgets, tag managers | INP, LCP | load after interaction; a facade |
| Fonts with many weights, TTF, no subset | LCP, CLS | 1–2 WOFF2 files, variable from the second weight on, `unicode-range` subsets |
| A long page of many sections | rendering cost | `content-visibility: auto` + `contain-intrinsic-size: auto <estimate>` (measured: 20k-row render 7.7 s → 0.7 s) |

## 3. Images

- Formats: AVIF by default (Baseline widely, 2026-07) with WebP/JPEG fallbacks through `<picture>` or an image CDN. WebP can be *larger* than a good JPEG on grainy photos — measure. Encode at build time or on a CDN, never per request.
- `srcset` width ladders (full-bleed: 480/800/1200/1600/2000–2400; content images: 1× and 2× the maximum rendered width); `sizes` that match the layout (`sizes="100vw"` on a half-width image doubles the bytes); consider capping photos at 2× density.
- The LCP image is never lazy, carries `fetchpriority="high"` and lives in the HTML (not a CSS background, not a `data-src` loader — the preload scanner cannot see those). ~16% of pages still lazy-load their LCP image. Everything below the fold: `loading="lazy"`, explicit dimensions, `decoding="async"`.
- Art direction with `<picture><source media=…>`: each source keeps its own aspect ratio (`width`/`height` on `<source>`).
- SVG through SVGO (keep `viewBox`; remove exported `<title>` file names such as "illustration-final-v7", which screen readers announce). Inline only small styled icons; reference large illustrations as `<img>`.
- Never ship a design-tool export: the lab's "export" PNG was 8.5 MB.

## 4. Fonts

- **Self-host** (cache partitioning since 2020 means a CDN font is never shared across sites; self-hosting also keeps OpenType features and avoids the EU privacy problem — `resources/type-and-colour.md`). WOFF2 only; keep at least a Latin `unicode-range` subset; keep full layout features when subsetting scripts that need shaping (Arabic, Devanagari).
- Preload at most the one or two files used above the fold (`crossorigin` even on the same origin). `font-display: swap` for text, `optional` where a first-visit fallback is acceptable (0 CLS), never `block` for body. A daily-use app is that case: preload its one or two files and use `optional`, so the first visit may render in the fallback and no visit shifts.
- **Fallback metrics** (`scripts/fonts.mjs <file> --fallback arial` prints the `@font-face`; or fontaine, Capsize, `next/font`, Astro's Fonts API): compute overrides from the exact fallback face *and weight*; a wrong override is worse than none (measured CLS 0.0029 → 0.0753). Safari honours `size-adjust` but not `ascent-/descent-/line-gap-override`. Measure CLS after adding them.
- A variable font pays off from the second weight (Playfair latin: one static weight 23 KB, the 400–900 variable 38 KB).

## 5. JavaScript

- Marketing and content: zero client JavaScript by default; islands (`client:visible`, `client:idle`) for the widget that needs it. Commerce: server rendering with islands for cart, search and filters. Apps: route-level splitting; charts, editors and grids lazy-loaded on use; Workers for data crunching.
- Prefer the platform: `Intl.DateTimeFormat` (0.1 KB) over date libraries; `zod/mini` (5 KB) over classic zod (90 KB); `motion/mini` (4 KB) over full animation libraries; named imports always.
- INP work: update the UI first, then yield (`await scheduler.yield()` with a `setTimeout` fallback) — measured INP 376 → 24 ms. Yielding once does not free the thread for the *next* input; chunk long work or move it to a Worker.
- Every third-party tag is audited; video and chat get facades; analytics loads after first interaction or idle; embeds get reserved space.
- Keep back/forward cache eligibility (no `unload` handlers).

## 6. Measuring

```bash
node scripts/perf.mjs --base http://localhost:3000 --before http://localhost:4000 --paths / /pricing   # always available
export CHROME_PATH=/path/to/chrome          # Playwright's Chromium works
npx lighthouse http://localhost:3000/ --only-categories=performance --output=json --output=html \
  --output-path=perf/home --chrome-flags="--headless=new --no-sandbox" --quiet        # phone emulation by default
npx lighthouse … --preset=desktop
npx lhci autorun                             # budgets as assertions (Lighthouse 13 removed --budget-path)
npx unlighthouse-ci --site http://localhost:3000   # every route
```

- `perf.mjs` needs nothing beyond the scripts' own Playwright, so it runs where `npx lighthouse` cannot (no network for the download, a sandbox that refuses it). It uses Lighthouse's mobile profile (4× CPU, slow 4G, cache off) and reports the median of runs for LCP and its element, FCP, CLS, TBT (the lab stand-in for INP), transfer by type, requests and DOM size, old against new with `--before`. It says when a baseline is broken: an old page whose font requests failed here looks faster than it is. Its numbers track Lighthouse's closely enough to rank builds (measured on the Azul fixture: LCP 580 → 1164 ms against a hand-written probe's 604 → 1152 ms). Use Lighthouse too where it runs, for the audits that come with the score.
- Lighthouse is one synthetic load: take the **median of 3–5 runs**, compare before and after **with the same Lighthouse version** (the same page scored 54 on 13.5 and 65 on 12.6), and read the reported **LCP element**, not only the number — with `devtools` throttling a broken page reported LCP 1.7 s on `<nav>` because the 8.5 MB hero never painted.
- Lighthouse navigation mode cannot measure INP; use a user flow (navigate + timespan with real clicks) or Playwright with the web-vitals library and CPU/network throttling.
- Render-blocking head scripts don't show in TBT (it counts after FCP) — watch FCP.
- Field data (CrUX, PageSpeed Insights API, Search Console) needs an API key; real-user monitoring with web-vitals v6 attribution covers Chrome, Firefox and Safari 26.2+ for LCP and INP (CLS is Chromium-only); `reportSoftNavs` measures SPA route changes (Chrome 151+).
- `audit.mjs` reports the LCP element, CLS and bytes by type from an unthrottled local load — a smoke test, not a performance number.
- GPU costs (blur, shadows, layers) cannot be measured headless; check on a real mid-tier Android via remote debugging when the design leans on them.
