# Tools for the work itself

Checked 2026-09-28. The scripts in this skill cover the common path; the rest are worth knowing when a project needs more. Tools report facts — a clean report is not a good design.

## This skill's scripts (`scripts/`, run `npm install` there once)

| Script | What it answers |
| --- | --- |
| `capture.mjs` | What does every page look like at each width, fold and full, with reveals finished and images decoded? Element shots at 3× for artwork; `--variant no-text,no-images,no-shadows` for the removal tests; `--reduced-motion`, `--dark`, `--no-js`, `--forced-colors`; self-checks for images that painted flat |
| `audit.mjs` | What is measurably wrong, and which generic-look signals are present? (`--kind` switches marketing, app, field, commerce, content, docs and service rules and accepts category names such as dashboard or fintech; a signature route's names, such as configurator or builder, run the app rules.) Includes the number and script checks for bilingual and financial screens. |
| `a11y.mjs` | What would a keyboard, screen-reader, zoom, forced-colours or colour-blind user hit that rule engines cannot see? |
| `widgets.mjs` | Does each custom widget keep its keyboard contract (dialog, tabs, disclosure, live region, form errors, menu button)? |
| `states.mjs` | What does each widget look like loading, empty, failing, offline, stale, with 200 items, open, focused — driven by mocked routes and steps, not imagined? With `--aria --each`: can a user do the top task from what is on screen (`visual-qa.md`, "Task walkthroughs")? |
| `perf.mjs` | How fast is each page on a throttled phone, old against new, when `npx lighthouse` is unavailable? |
| `parity.mjs` | What did the redesign add without a source, drop, or break (routes, ids, form fields, metadata)? |
| `contrast.mjs` | Does this text/ground pair pass WCAG 2, and what is its APCA Lc? |
| `palette.mjs` | What colours are in the logo (or a photo set), and what role scales follow from the brand colour? |
| `fonts.mjs` | Does this face have tabular figures, the scripts we need, the axes we want — in the file we will actually serve? |
| `compare.mjs` | Before/after sheets, blurred squint sheets, pixel diffs |

Traps they handle: a project-local Playwright newer than the installed browser (they fall back to any Chromium on disk; `CHROME_PATH` to choose, in every script that opens a browser, or `--chrome` in all of them but `a11y.mjs` and `widgets.mjs`); behind a TLS-intercepting proxy web fonts may fail silently (the audit reports declared families that are not available). `CAPTURE_PROXY` opts into a proxy explicitly — Playwright 1.56 ignores the localhost bypass, so it is never taken from `HTTPS_PROXY` automatically.

## Extracting a site's actual system

| Tool | Licence | Use |
| --- | --- | --- |
| **dembrandt** (`npx dembrandt <url>`) | MIT, active | palette with roles and OKLCH, type styles, spacing, radii, borders, shadows, gradients, motion, component styles, breakpoints, WCAG pairs; exports DTCG tokens, Tailwind `@theme`, a shadcn theme, a DESIGN.md; an MCP server; a CI drift gate (`--compare`). Connect it to an existing Chromium with `BROWSER_CDP_ENDPOINT` when it cannot download its own. Roles are heuristic guesses; one run is one page — crawl (`--crawl`) for a system. |
| extract-design-system (`npx extract-design-system <url>`) | MIT | a lighter alternative |
| @projectwallace/css-analyzer | MIT | static CSS complexity, specificity, distinct values — how sprawling the stylesheet is |
| Style Dictionary, Terrazzo, Tokens Studio | Apache-2.0 / MIT | DTCG tokens (format stable since 2025.10) → CSS, platforms, design tools |

## Accessibility

Three layers, because each misses what the next one catches (`accessibility.md` §10 has the measurements):

| Tool | Licence | Use |
| --- | --- | --- |
| axe-core (injected by `audit.mjs`; `@axe-core/playwright`) | MPL-2.0 | the standard rule engine and the one to gate on: no false positives at default tags on any page we tested. Catches contrast, names, alt, lang, landmarks, target size (its only WCAG 2.2 rule), heading order. `audit.mjs` also runs two experimental rules worth having — `td-has-header`, `label-content-name-mismatch` — as warnings. **Passes placeholder-as-label.** `@axe-core/playwright` needs a page from `browser.newContext()` |
| `a11y.mjs` + `widgets.mjs` (this skill) | — | the scripted layer: keyboard walk with pixel-diff focus detection, focus obscured, reflow, text spacing, forced colours, colour-vision renders, motion, names from Chromium's accessibility tree; keyboard contracts for custom widgets. With axe, they raised 85% of 60 seeded defects as failures (rule engines together: 55%) |
| IBM Equal Access engine (`accessibility-checker-engine`, inject `ace.js`) | Apache-2.0 | the best second opinion on keyboard and widget heuristics (clickable `div`s, untabbable widgets, unlabelled SVG charts, tables without headers). Noisy: skip link "not in a landmark", `tabindex="0"` on a scroll region and `clip-path`-only hidden labels are false positives. Its CLI downloads the engine from a CDN at runtime; the npm engine works offline |
| pa11y (htmlcs + axe runners) | LGPL-3.0 | CI runs over many URLs; htmlcs adds placeholder-only labels (F68) and onclick-without-keyboard warnings. Set `levelCapWhenNeedsReview: "warning"` (the default promotes axe's needs-review items to errors), and note its axe runner skips `wcag22aa` |
| Lighthouse accessibility category | Apache-2.0 | a subset of axe with a weighted score — not a conformance measure (46 → 100 between two pages sixty defects apart) |
| Playwright `ariaSnapshot()`, CDP `Accessibility.getFullAXTree` | Apache-2.0 | what a screen reader will be told: names, roles, states. Playwright computes its own tree; cross-check surprises with CDP (it reported `<summary>` as text) |
| Community-Access accessibility-agents | MIT | specialist prompts (forced colours, cognitive, ARIA) |

Rule engines alone surface roughly a third to a half of distinct barriers (axe ~30% of GOV.UK's 142 barriers; Deque's 57% is by issue volume). Meaning, order logic, screen-reader experience, cross-page consistency and flows stay manual — `accessibility.md` §11 has the procedure. Install with `--ignore-scripts` (or `PUPPETEER_SKIP_DOWNLOAD=1`) where browser downloads are blocked, and point every tool at the Chromium on disk.

## Performance

Lighthouse CLI 13 (median of 3–5 runs; same version before and after; read the LCP element), Lighthouse CI (budgets as assertions), unlighthouse (every route), Lighthouse user flows (lab INP), the web-vitals library (field data with attribution), Chrome DevTools traces; CrUX / PageSpeed Insights APIs need a key. Details: `performance.md` §6.

## Visual regression and comparison

Playwright's `toHaveScreenshot` (in projects already on Playwright Test); pixelmatch + pngjs (in `compare.mjs`); odiff, reg-cli (MIT, Wasm-backed); BackstopJS and Lost Pixel (MIT; quiet since 2024). Regression diffs compare the same page at the same width between iterations — they cannot judge a redesign.

## Assets

sharp (Apache-2.0) and squoosh for raster encoding (AVIF, WebP; build time or CDN); SVGO 4 (MIT; keep `viewBox`, remove exported titles); `@gltf-transform/cli` for 3D; `pyftsubset` (fontTools), glyphhanger and subfont for font subsetting; fontaine, Capsize and framework font modules for fallback metrics; `palette.mjs --from` samples a vector or raster logo and a photo set alike (PNG; convert a JPEG first: `discovery.md` §2); node-vibrant or colorthief are optional alternatives for photo palettes, never for logos.

## Code hygiene around a redesign

knip (unused files, exports, dependencies), PurgeCSS (dead CSS in static sites), stylelint, `npm view` / `npm pack` for licences and maintenance (`README.md`).

## Detectors and review skills

- **impeccable** (`npx impeccable detect <url> --json`, Apache-2.0): a deterministic detector with ~60 generated-design rules — a useful second opinion; treat findings as leads.
- **gstack `/design-review`** (MIT): a live audit-and-fix loop with grades — useful as a comparison.
- **Vercel Web Interface Guidelines** (MIT): a dense list of implementation rules; the checkable ones are folded into `technical-qa.md`.

## Browser tools for agents

Playwright MCP (Apache-2.0) and Chrome DevTools MCP (Apache-2.0: screenshots, DOM snapshots, emulation, console, CSS inspection, performance traces with CrUX insight, a Lighthouse audit that excludes performance). Either can replace `capture.mjs` for interactive inspection; keep the script for repeatable batches.
