# Experiment J: the scripts on a real codebase

**Question.** The QA scripts had been tuned on hand-made fixtures, the a11y lab and W3C APG pages. What breaks, and what is misreported, on a real, popular, framework-built site?

**Subject.** [AstroWind](https://github.com/onwidget/astrowind) (MIT), commit `14e1a69` (2026-09-12). It is the most-starred Astro landing template: Astro 7, Tailwind 4, `ClientRouter`, prefetching, and Astro's native Fonts API. It also makes a realistic "templated site" baseline for a redesign.

**Setup.**

- Served with `astro dev`. `astro build` fails here because it must fetch remote Unsplash and Pixabay images, and this sandbox blocks those hosts.
- Commands: `audit.mjs` on `/`, `/pricing` and `/homes/saas` at 1440 and 390; `a11y.mjs` on `/`; `capture.mjs` on `/` and `/pricing`.
- Regression set after every fix: `a11y.mjs` on the lab's flawed/fixed pages and GOV.UK Frontend; `audit.mjs` on the slop, dashboard and GOV.UK fixtures. The results were unchanged (92 / 0 / 0 FAIL; the same ✗ lines).

## What broke, and what changed

| # | Symptom on the real site | Cause | Fix (in `scripts/`) |
| --- | --- | --- | --- |
| 1 | `audit.mjs` crashed: "Execution context was destroyed" | Vite and Astro dev servers **reload the page**, sometimes several times, while they optimise dependencies. Astro's link prefetching triggers more reloads. | `open()` in `lib/env.mjs` waits until no *full* load happens for 1.5 s (max 20 s). It counts `load` events, not `framenavigated`, because Astro's router calls `history.replaceState` on every scroll. `settle()` retries after a reload. All scripts use `open()`. |
| 2 | One bad page ended the whole run | No error isolation | `audit.mjs` isolates failures per page and `capture.mjs` per width. Each failure is reported with the reason and the remedy: "audit a production build, or open each page once first". |
| 3 | axe reported **29 contrast failures** where our own check found 1 | Growing the viewport to capture the full page fires scroll-reveal observers. axe then measured the text mid-fade. The failures were ours, not the site's. | `audit.mjs` finishes animations again after growing, before running the inventory and axe. |
| 4 | **19 small-target FAILs** on footer links that axe passes | The 2.5.8 spacing exception was implemented as "no target within 24 px". The criterion's actual test is a 24 px-diameter circle that intersects no other target and no other undersized target's circle; touching is allowed. | Correct geometry in `lib/inventory.mjs` and `a11y.mjs`. The fixtures' genuinely cramped 18 px icon buttons still fail. |
| 5 | "White on white, 1:1" on a blue button | At 390 the page is over 16,000 px tall, beyond the capture viewport cap. `elementsFromPoint` sees only the viewport, so the ground defaulted to white. | Text below the viewport is scrolled into view before its ground is sampled. The scroll is instant, so a CSS `scroll-behavior: smooth` cannot leave it mid-scroll. |
| 6 | "Colour-only status" on three dots | These were the red, amber and green window controls on a code-sample mock | A row of two or more dots with no text is treated as window chrome. |
| 7 | **~25 "focused element is invisible/off-screen" FAILs** in `a11y.mjs` | `scroll-behavior: smooth`: each newly focused element was measured before the smooth scroll reached it | The keyboard walk forces `scroll-behavior: auto`. The reduced-motion check still sees the site's own setting. |
| 8 | "Focusable but hidden from AT", plus partly covered focus, on "Menu", "Inspect", "Audit" and "Settings" | **Astro's dev toolbar**, injected by the dev server. It also floats over captures. | `open()` removes and hides known dev toolbars (Astro, Next, Nuxt, Vercel Live) and records which it found. Error overlays are left visible, because they are findings. |
| 9 | "Looks like a heading": `6K`, `1.7K` | Stat numbers with K/M suffixes slipped past the numeric filter | The filter accepts K/M/B, ×, x, ~ and similar. |

**`widgets.mjs` on AstroWind's own widgets** (header dropdown, FAQ `<details>`, copy button) — three more process errors, fixed:

| # | Symptom | Cause | Fix |
| --- | --- | --- | --- |
| 10 | Native `<details>` FAQ: "Enter does not toggle the content" | In current Chromium the content of a *closed* `<details>` keeps its layout boxes (`::details-content` hides it with `content-visibility`), so `getClientRects()` says "visible" either way | Visibility by `checkVisibility()`; `<summary>` state from `details.open` |
| 11 | "Visible message not in a live region" quoting half the page, then the logo, then a stat | The mutation recorder reported the text of whatever container changed; sticky-header scroll classes and reveal-animation inline styles change constantly | Silent messages are found by diffing the short texts visible just before and just after the action (trigger scrolled into view and settled first); the trigger's own relabelling ("Copy" → "Copied") is reported separately |
| 12 | Copy button "does nothing, nothing announced" | Headless Chromium denies clipboard access, so the site's handler failed silently | Contexts get `clipboard-read`/`clipboard-write`; the button then announces "Copied" through its live region — PASS |
| 13 | Header dropdown "Enter does nothing — falling back to click … toggles on click" | The menu opens on `:focus-within`/`:hover`: focusing it already opened it, and the "click" was really a hover | Detects open-on-focus and says so (keyboard-reachable; no state exposed; opens on every Tab) — the real failure, no `aria-expanded`, stays |

**`parity.mjs` against a doctored copy** (the "after" site had a planted "trusted by 12,000+ teams, 99.99% uptime", a renamed consent field and a deleted `/about`):

| # | Symptom | Cause | Fix |
| --- | --- | --- | --- |
| 14 | "12,000+ teams" not reported | Claims were bare numbers matched site-wide; the old site said "12,000+ active subscribers (sample)" on another page | A claim keeps the noun it counts ("12,000+ teams", "340 farms", "2,300 reviews"); the same number counting something else is a new claim |
| 15 | "36 SECONDS" unsourced and "43 SECONDS" dropped | A live countdown, and count-up statistics read mid-animation | Each page is read twice, 1.5 s apart; values that change are listed as "changing" and left out |
| 16 | 25 routes took 7 min 12 s | Sequential loads, and the crawl did a full settle per page | Link-only crawl; four routes at a time with old and new loaded in parallel: 1 min 27 s |

After the fixes all four plants are caught (both claims, the route, the field on its three pages) and nothing else is reported except the two claims that genuinely disappeared with `/about`.

**Real-site FAIL counts after the fixes:**

- `a11y.mjs`: 5, down from 33.
- `audit.mjs` on `/`: no axe contrast failures (29 before); no target or dot false positives.
- `widgets.mjs`: 1 of 3 contracts fails, down from 3; the remaining failure is genuine.

The remaining findings were checked and look genuine:

- Tailwind `focus:ring` (box-shadow) focus indicators vanish in forced colours on the theme toggle, RSS and Copy buttons.
- The sticky header hides focused links on reverse Tab (no `scroll-padding-top`).
- The Copy button shows no focus change.
- Line-number text in the code mock is 3.74:1.
- `region` (content outside landmarks).
- Undefined `--shiki-dark` properties.
- The declared "Inter" family never loads in this sandbox: Astro's Fonts API could not fetch it, so the page renders in a fallback. This is correct in this environment.

## Lessons for the skill

- **Audit a production build when you can.** Dev servers reload, inject toolbars, serve unminified bundles (performance numbers are meaningless) and sometimes error on prefetch. The scripts now survive dev servers, but `visual-qa.md` and `technical-qa.md` should say to prefer `build` + `preview`.
- **The measuring process can create the defect it reports** (findings 3, 5, 7). Every new check needs a real-site run, not only fixtures, before it is trusted. This is logged in `lessons.md`.
