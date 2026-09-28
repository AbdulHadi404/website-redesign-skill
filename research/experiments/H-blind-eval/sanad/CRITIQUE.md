# Critique — Sanad dashboard (`templates/critique.md`)

**Reviewer:** the builder. No subagent tool was available in this session, so a fresh-context reviewer could not be used (`visual-qa.md` §Critique step 1). As the template asks in that case, the first-impression block was written from `captures/after/home-1440-after-fold.png` and `captures/after/home-390-after-fold.png` before re-reading `DESIGN.md`. Treat every "yes" below as the builder's claim with its capture named, not as independent evidence.

## Round 1 (captures `captures/wip/*wip2*`, `*wip3*`, `*wip4*`, first `captures/after` run)

### First impression

- This page communicates: *you are owed about SAR 81.6k and almost all of it is late; here is who owes it.*
- First three things the eye lands on: 1. the red 80,625.35 in the summary; 2. the two long red ageing bars; 3. the dark-teal September column. Intended order: summary (awaiting → past due) → the late list → the table. Close: the ageing bars pull slightly ahead of the list items they summarise.
- One word: *exact*.
- Areas I cannot name within two seconds: the small "SAR / Invoices" headers over the ageing strip; the grey tick for "not yet due".

### Critique against objectives

- Know where the money stands → summary strip with a rule line under each figure → the owner reads four defined totals and what each counts → Few: context and the right measure; fixes A2/A3.
- Chase late payers → Past due panel with ageing + five most-late invoices with number and days late → a to-call list without leaving the page → dashboards: "deviations carry the weight".
- Exactness → every amount two decimals, Western tabular digits, right-aligned → the Net/VAT/Total columns align on the decimal point in both directions (`captures/after/home-1440-after.png`, `home-lang-en-1440-after.png`) → fixes A1, the complaint "numbers don't line up".
- Brand → mark + Plex wordmark, teal action, keystone as "you are here" → the app now looks like the logo file's company rather than a kit → Commitment 3.
- Phone → stacked rows with labels, net/VAT in a fixed label box → all eight values reachable at 390 (`captures/states-after-ar/phone-phone-after.png`) → fixes A5.

### Checks (round 1)

| # | Question | Yes / No | Evidence | Fix |
| --- | --- | --- | --- | --- |
| 1 | Appropriate to category | yes | `home-1440-after-fold.png`: 14 px body, 24 px figures, no motion, colour only on late items | — |
| 2 | Top tasks on phone and keyboard | **no** → fixed | 1024 px (`captures/after` first run, `home-1024-after.png`): client names broke letter by letter and the Status column was cut off; phone page 5,200 px long with 24 stacked rows | sidebar collapses below 1200 px; table min-width 800 px in a focusable scroll region; stacked rows below 900 px; phone shows 10 rows + "Show all" |
| 3 | Swap test (brand layer) | yes (does not fit a competitor) | top bar lockup and keystone marker (`home-1440-after-el-topbar-1.png`); the layout would suit any invoicing product, which is right for a productive surface | — |
| 4 | Generated tells | yes, none left | `audit/after/audit.md`: no generic-look signals; greeting out of the title slot, no emoji, no gradient, no KPI deltas | — |
| 7 | Typography scale used | **no** → fixed | first audit: 7 sizes incl. 13 px and a 22.5 px UA-default hidden h2 | sizes reduced to 12/14/16/20/24 (+15/20 on phones); all h2 set to the title size |
| 8 | One layout per task | yes | the four panels share one panel pattern | — |
| 9 | Cards rare, one elevation model | yes | summary is one surface divided by rules; only the dialog has a shadow (`dialog-open-desktop-after.png`) | — |
| 13 | Headlines only | yes | a11y outline: h1 Dashboard · h2 Summary · Past due · Monthly revenue · Recent invoices | — |
| 15 | One primary action; selected ≠ accent | yes | only New invoice is filled; selected nav and pressed chip use the neutral-teal fill + a second cue | — |
| 16 | States designed and rendered | **no** → fixed | no-JS render (`home-1440-nojs.png`, first run) showed an empty frame with no message; the chart's "Show as table" appeared while loading | `<noscript>` message; the disclosure is hidden until data exists |
| 17 | Colour budget, contrast, not colour alone | yes | `audit/contrast-tokens.txt`; greyscale render `audit/after-a11y-ar/vision-achromatopsia.png` keeps every status by icon + word | the ageing bars are flagged by `audit.mjs` as colour-only; justified in `REPORT.md` (each bar's row header states the period; the bar is `aria-hidden`) |
| 18 | Mobile designed | yes after #2 | `captures/after/home-390-after.png`, `home-lang-en-390-after.png` | — |
| 19 | Accessibility pass | **no** → fixed | forced colours (`audit/after-a11y-en/forced-colors.png`, first run): logo, chart labels and the Paid icon disappeared — SVG fills are not forced | forced-colours block mapping SVG fills to `CanvasText` |
| 20 | Performance | **no** → fixed | Lighthouse mobile: CLS 0.26–0.75 (`audit/perf`, first runs) from a font swap, data arriving into empty containers and the English page mirroring after first paint | `font-display: optional` + preload; skeletons in the static HTML; `dir` set in `<head>`; CLS now 0 in 6 of 6 runs |
| 21 | Copy | yes, with one known cost | two words for lateness: "Past due" (derived from the due date) and the API's "Overdue" status; both are defined on screen; the question goes to the user | — |
| 22 | Beside the references | yes | tables as exact as GOV.UK's numeric cells; Midday's "colour only on overdue" kept | — |

**Weakest screen:** the phone page — long, and the ageing strip's two long red bars shout louder than the figures they summarise.

**Fixes made in round 1 (one batch):** the six "no" rows above.

**Re-rendered at:** 1440 / 1280 / 1024 / 768 / 390, both languages — `captures/after/*-after.png`, plus `*-nojs.png`, `*-forced.png`, `home-390-reduced.png`.

## Round 2 — status of round 1's findings

| Finding | Status | Capture |
| --- | --- | --- |
| 1024 table squeezed | resolved | `captures/after/home-1024-after.png`, `home-lang-en-1024-after.png` — eight columns, no clipping |
| Phone page too long | resolved | `captures/after/home-390-after.png` 3,599 px (was 5,269) with "Show all 24 invoices" |
| Type sizes | resolved | `audit/after/audit.md`: 24 · 16 · 14 · 12 px at 1440 |
| No-JS blank | resolved | `captures/after/home-1440-nojs.png` shows the bilingual message |
| Forced colours | resolved | `captures/after/home-1440-forced.png`, `home-lang-en-1440-forced.png` — mark, chart and icons visible |
| CLS | resolved | `audit/perf/summary.txt` — 0 in all six post-fix runs |
| Ageing bars loud | open (judgement, not a "no") | `captures/compare/squint-1440-ar.png` — the red bars are the heaviest mark when blurred; consistent with principle 2 ("late money outranks earned money"); left for the user's reaction |

**Remaining "no" answers:** none.
