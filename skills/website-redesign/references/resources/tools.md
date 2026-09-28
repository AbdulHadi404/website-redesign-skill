# Tools for the work itself

Checked 2026-09-28. The scripts in this skill cover the common path; the rest are worth knowing when a project needs more. Tools report facts — a clean report is not a good design.

## This skill's scripts (`scripts/`, run `npm install` there once)

| Script | What it answers |
| --- | --- |
| `capture.mjs` | What does every page look like at each width, fold and full, with reveals finished and images decoded? Element shots at 3× for artwork; `--variant no-text,no-images,no-shadows` for the removal tests; `--reduced-motion`, `--dark`, `--no-js`; self-checks for images that painted flat |
| `audit.mjs` | What is measurably wrong, and which generic-look signals are present? (`--kind` switches marketing vs app rules) |
| `parity.mjs` | What did the redesign add without a source, drop, or break (routes, ids, form fields, metadata)? |
| `contrast.mjs` | Does this text/ground pair pass WCAG 2, and what is its APCA Lc? |
| `palette.mjs` | What colours are in the logo, and what role scales follow from the brand colour? |
| `fonts.mjs` | Does this face have tabular figures, the scripts we need, the axes we want — in the file we will actually serve? |
| `compare.mjs` | Before/after sheets, blurred squint sheets, pixel diffs |

Traps they handle: a project-local Playwright newer than the installed browser (they fall back to any Chromium on disk; `CHROME_PATH` or `--chrome` to choose); behind a TLS-intercepting proxy web fonts may fail silently (the audit reports declared families that are not available). `CAPTURE_PROXY` opts into a proxy explicitly — Playwright 1.56 ignores the localhost bypass, so it is never taken from `HTTPS_PROXY` automatically.

## Extracting a site's actual system

| Tool | Licence | Use |
| --- | --- | --- |
| **dembrandt** (`npx dembrandt <url>`) | MIT, active | palette with roles and OKLCH, type styles, spacing, radii, borders, shadows, gradients, motion, component styles, breakpoints, WCAG pairs; exports DTCG tokens, Tailwind `@theme`, a shadcn theme, a DESIGN.md; an MCP server; a CI drift gate (`--compare`). Connect it to an existing Chromium with `BROWSER_CDP_ENDPOINT` when it cannot download its own. Roles are heuristic guesses; one run is one page — crawl (`--crawl`) for a system. |
| extract-design-system (`npx extract-design-system <url>`) | MIT | a lighter alternative |
| @projectwallace/css-analyzer | MIT | static CSS complexity, specificity, distinct values — how sprawling the stylesheet is |
| Style Dictionary, Terrazzo, Tokens Studio | Apache-2.0 / MIT | DTCG tokens (format stable since 2025.10) → CSS, platforms, design tools |

## Accessibility

| Tool | Licence | Use |
| --- | --- | --- |
| axe-core (injected by `audit.mjs`; `@axe-core/playwright`) | MPL-2.0 | the standard rule engine; zero false positives on the GOV.UK baseline in our tests; catches contrast, names, alt, lang, landmarks, target size, heading order |
| pa11y (htmlcs + axe runners) | LGPL-3.0 | CLI and CI runs over many URLs |
| IBM Equal Access checker (`accessibility-checker`) | Apache-2.0 | a second rule set |
| Lighthouse accessibility category | Apache-2.0 | a subset of axe |
| Playwright `ariaSnapshot()` / accessibility tree | Apache-2.0 | what a screen reader will be told: names, roles, states — test it like any other output |
| Community-Access accessibility-agents | MIT | specialist prompts (forced colours, cognitive, ARIA) |

Automated tools find a minority of issues (estimates range from about a third to a little over half of real problems). Keyboard, focus order, zoom and reflow, screen-reader names in context, cognitive load and content quality stay manual — `accessibility.md` has the procedure.

## Performance

Lighthouse CLI 13 (median of 3–5 runs; same version before and after; read the LCP element), Lighthouse CI (budgets as assertions), unlighthouse (every route), Lighthouse user flows (lab INP), the web-vitals library (field data with attribution), Chrome DevTools traces; CrUX / PageSpeed Insights APIs need a key. Details: `performance.md` §6.

## Visual regression and comparison

Playwright's `toHaveScreenshot` (in projects already on Playwright Test); pixelmatch + pngjs (in `compare.mjs`); odiff, reg-cli (MIT, Wasm-backed); BackstopJS and Lost Pixel (MIT; quiet since 2024). Regression diffs compare the same page at the same width between iterations — they cannot judge a redesign.

## Assets

sharp (Apache-2.0) and squoosh for raster encoding (AVIF, WebP; build time or CDN); SVGO 4 (MIT; keep `viewBox`, remove exported titles); `@gltf-transform/cli` for 3D; `pyftsubset` (fontTools), glyphhanger and subfont for font subsetting; fontaine, Capsize and framework font modules for fallback metrics; node-vibrant or colorthief for photo palettes (not for logos — sample vectors with `palette.mjs`).

## Code hygiene around a redesign

knip (unused files, exports, dependencies), PurgeCSS (dead CSS in static sites), stylelint, `npm view` / `npm pack` for licences and maintenance (`README.md`).

## Detectors and review skills

- **impeccable** (`npx impeccable detect <url> --json`, Apache-2.0): a deterministic detector with ~60 generated-design rules — a useful second opinion; treat findings as leads.
- **gstack `/design-review`** (MIT): a live audit-and-fix loop with grades — useful as a comparison.
- **Vercel Web Interface Guidelines** (MIT): a dense list of implementation rules; the checkable ones are folded into `technical-qa.md`.

## Browser tools for agents

Playwright MCP (Apache-2.0) and Chrome DevTools MCP (Apache-2.0: screenshots, DOM snapshots, emulation, console, CSS inspection, performance traces with CrUX insight, a Lighthouse audit that excludes performance). Either can replace `capture.mjs` for interactive inspection; keep the script for repeatable batches.
