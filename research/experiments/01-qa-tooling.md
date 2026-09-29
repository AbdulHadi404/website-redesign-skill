# Experiment log — QA and workflow tooling (hands-on)

Environment: cloud container, Node 22.22, Chromium 141 (Playwright's bundled build under `/opt/pw-browsers`), global Playwright 1.56.1. Outbound network limited by policy to GitHub, npm, PyPI and Google Fonts; every other site returns a 403 at the proxy — so live reference sites could not be rendered, and all browser experiments ran against local fixtures.

## Fixtures built for the experiments

| Fixture | Built to contain |
| --- | --- |
| `slop.html` — generated-looking SaaS landing page | Inter only, violet→blue gradients, gradient text ×6, "✨ New" pill, pill buttons, emoji feature icons in tinted rounded tiles, six-card grid, fake stats (10x, 99.9%), "Trusted by" grey wordmarks, glowing "Most popular" plan, glass nav, `#9ca3af` body text, reveals hidden by default, lazy-loaded hero image with no alt/dimensions, 16px icon-only social links, `outline: none`, a 900px table, `min-height: 100vh` hero, cliché copy |
| `dashboard.html` — flawed admin dashboard | everything in rounded shadow cards, decorative sparklines, 18px unnamed icon buttons, status as coloured dots only, `#b0b5bd` labels at 11–12px, table clipped inside `overflow: hidden` card, clickable `div` nav, bare "No data" empty state, skipped heading level, no focus styles |
| `govuk.html` — GOV.UK Frontend 6.5.1 from npm | the known-good baseline: error summary, labelled fields with hints and errors, numeric table, skip link — used to measure false positives |

## Tools evaluated

| Tool | Licence (checked 2026-09-28) | Result | Verdict |
| --- | --- | --- | --- |
| **Playwright** (1.56 / 1.63) | Apache-2.0 | Drives everything below. Trap: a project-local `playwright`/`playwright-core` newer than the installed browser fails with "Executable doesn't exist at …chromium-1243"; launching with an explicit `executablePath` to any Chromium on disk works across versions. Trap: 1.56 ignores the proxy `bypass` for localhost (HTTP 405 from the proxy); 1.63 honours it. | Use; the skill's scripts are built on it. |
| **axe-core** 4.13 (injected; `@axe-core/playwright` not needed) | MPL-2.0 (use as a dependency, do not copy code) | Caught on the fixtures: contrast, missing lang, image-alt, link-name (unnamed icon links), button-name, target-size, heading-order, empty-table-header, landmark rules. Zero false positives on the GOV.UK baseline once the fixture markup was correct. Missed: invisible focus, reveal content hidden without JS, content clipped by `overflow: hidden`, status by colour alone, clickable divs, phone zoom-out, lazy LCP image. | Use as one input; never as the whole a11y check. |
| **dembrandt** 0.36 | MIT | Extracts a site's actual system from the render: colour palette with roles and OKLCH, typography styles, spacing scale, radii, borders, shadows, gradients, motion durations/easings, button/input styles, breakpoints, WCAG pairs; exports DTCG tokens, Tailwind `@theme`, shadcn theme and a DESIGN.md; has an MCP server and a CI drift gate. Ran in 10 s per page via `BROWSER_CDP_ENDPOINT` against a Chromium started with `--remote-debugging-port` (its own `install-browser` needs network). Quirks: role labels are heuristic (GOV.UK's focus yellow became "secondary", a grey became "surface"); a table border was reported with the wrong side's colour. | **Recommend** for Phase 1 (what system does the current site really have?) and Phase 2 (measure reference sites). Treat roles as guesses. |
| **colorjs.io** 0.7.1 | MIT | WCAG 2.1 and APCA contrast, OKLCH conversion, gamut mapping. **Trap:** APCA is order-sensitive — `background.contrast(text, 'APCA')` matches the reference `APCAcontrast(text, bg)`; the reverse call silently returns a different number (−54.9 vs 49.8 for `#9ca3af` on white). | Use (dependency of `contrast.mjs`, `palette.mjs`). |
| **apca-w3** 0.1.9 | "Limited W3 License" (not OSI) | Used once to verify colorjs.io's APCA numbers; not shipped. | Verify with it; don't vendor it. |
| **fontkit** 2.0.4 | MIT | Reads woff2/woff/ttf/otf: axes, features, scripts, metrics, glyph coverage. | Use (dependency of `fonts.mjs`). |
| **pixelmatch** 7.2 + **pngjs** 7 | ISC / MIT | Pixel diffs between two captures of the same page/width; 0 px on identical input. | Use for regression while iterating (not to judge a redesign). |
| odiff-bin, reg-cli, BackstopJS, Lost Pixel | MIT | Checked metadata only; BackstopJS last published 2024-09, Lost Pixel 2024-11 (quiet). Playwright's own `toHaveScreenshot` covers the same need in projects that already use Playwright Test. | Mention as options; no need to add. |
| Lighthouse 13.5, unlighthouse 0.18 | Apache-2.0 / MIT | Tested by the performance stream (see `streams/E-…`). | Use for the performance baseline and regression. |
| svgo 4.1, sharp 0.35 | MIT / Apache-2.0 | Installed; standard, well-maintained. | Recommend for SVG / raster asset optimisation. |
| @projectwallace/css-analyzer 9.9 | MIT | Static CSS complexity/specificity/token counts. | Optional for auditing a stylesheet's sprawl; dembrandt covers the rendered side. |
| purgecss 8, knip 6.38 | MIT / ISC | Dead CSS / dead code and dependency detection. | Mention in implementation cleanup. |

## Findings that changed the skill

1. **The shipped capture script still had the bug its own lessons describe.** `capture.mjs` used `fullPage: true` at an 844/900 viewport — exactly what `visual-qa.md` says produces grey boxes. Rewritten.
2. **"Grow the viewport to the document height" (the lesson's fix) breaks on `100vh` heroes.** First attempt: the hero grew to 4,097px — the full new viewport — and pushed every chapter out of the shot. Probing at a slightly taller viewport does not detect it when the hero's content already exceeds 100vh; the min-height only bites at the grown size. Fix: record every element's height at the normal viewport, grow, pin anything that changed back to its recorded height, repeat until the document height is stable.
3. **Horizontal overflow on a phone is worse than a scrollbar.** Under mobile emulation, one 900px table widened the layout viewport to 924px (`innerWidth` 924 at a 390 device width): the page loads zoomed out, and `scrollHeight` can never fall below `innerHeight × zoom`, so any capture loop based on it never converges. Chrome on Android behaves the same way. The capture and audit now report "layout viewport widened — phones show this page zoomed out".
4. **Scroll-reveal content is settled generically** by scrolling through in steps (observers fire, lazy images load) and calling `finish()` on every entry in `document.getAnimations()` (CSS transitions and animations included); infinite animations are paused instead.
5. **Contrast must be measured against the painted ground, not the ancestor chain.** `elementsFromPoint` at the text's first line box, walking down the paint stack, finds the real ground and detects text over images and gradients (reported as "check by eye" rather than guessed).
6. **Focus visibility can be measured.** Real Tab presses, then compare the focused element's outline/box-shadow/border/background/colour with its blurred state. Found 14 of 15 controls with no visible change on the slop page (`outline: none`), zero on GOV.UK.
7. **Content cut off by `overflow: hidden`** (the dashboard table) is invisible to axe and to overflow detectors; a dedicated check found 11 clipped cells at desktop and 24 at phone width.
8. **Web fonts can fail silently.** Behind a TLS-intercepting proxy Chromium rejected Google Fonts (`ERR_CERT_AUTHORITY_INVALID`); computed `font-family` still said "Inter". A width-comparison probe (text in `"Family", monospace` vs `monospace`, and serif, and sans-serif) now reports declared families that are not actually available.
9. **WCAG overstates contrast on dark grounds — measured.** On `#0f0f23`: `oklch(0.62 0.19 264)` passes WCAG AA at 5.02:1 but is APCA Lc −36 (spot text only); white at 60% passes AAA at 7.18:1 but is Lc −50 (headlines only). `contrast.mjs` prints both.
10. **An APCA-only solve for text steps fails WCAG.** The first palette build solved step 11 for Lc 60 and got `#4e7bf3` at 3.56:1 — fails AA for small text. Steps 11/12 are now solved for Lc 60 ∧ 4.5:1 and Lc 90 ∧ 7:1.
11. **Google Fonts and Fontsource serve reduced files.** Google's Latin Inter (47 KB) has `tnum pnum frac calt` only — no `zero`, `case`, `sups/subs/ordn`, `ss01–ss08` or any of its 14 character variants, and no `opsz` axis unless requested; the upstream release (344 KB) has all of them. A design that relies on an OpenType feature must be checked against the file actually served (`fonts.mjs`).
12. **Default-tabular figures are common in Arabic families**: Cairo, IBM Plex Sans Arabic and Source Serif 4 have tabular figures by default; Inter and Bricolage Grotesque need `font-variant-numeric: tabular-nums`. IBM Plex Sans Arabic is static (no variable axes); Cairo is variable (wght 200–1000).
13. **Playwright as an image compositor.** Before/after sheets and blurred "squint" sheets are rendered by laying images out in a page and screenshotting it — no native image dependency.

## Scripts produced (all in `skills/website-redesign/scripts/`, tested on the fixtures)

- `capture.mjs` — rewritten: Playwright, viewport growth with viewport-unit pinning, step scroll + animation finishing + image decode, fold and full captures, element captures at DPR 3, overflow and zoom-out warnings, `--reduced-motion`, `--dark`, `--no-js`, `--label`.
- `audit.mjs` — measures a rendered page: overflow, zoom-out, contrast on painted ground, invisible focus, focus under sticky bars, targets < 24 (with the 2.5.8 spacing exception), fake controls, clipped content, colour-only status, headings/landmarks/lang, images (alt, dimensions, lazy LCP, oversize), no-JS hidden content, type inventory (sizes by share, families, weights, measure, centred/justified, leading, small text, caps), system inventory (spacing values, radii, shadows), unavailable fonts, LCP/CLS/bytes, axe-core, and generic-look signals.
- `contrast.mjs` — WCAG + APCA for any CSS colour, matrices, CSS custom-property files.
- `palette.mjs` — logo colour sampling (SVG by use, PNG by area) and 12-step OKLCH role scales (light/dark, tinted neutrals, solved text steps, on-solid text check), CSS output.
- `fonts.mjs` — axes, features, figures, scripts/coverage, x-height, file size; local files or Google Fonts families.
- `compare.mjs` — before/after sheets, multi-panel grids, blurred squint sheets, pixel diffs.

## Run times (local fixtures)

- `audit.mjs`, 3 pages × 2 widths with axe and no-JS pass: ~28 s.
- `capture.mjs`, 3 pages × 2 widths (+12 element shots): ~31 s.
- dembrandt, 1 page: ~10 s.
