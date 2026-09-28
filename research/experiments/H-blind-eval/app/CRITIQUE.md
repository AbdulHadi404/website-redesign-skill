# Critique: herd screen, rounds 1–2 (of at most 3)

**Reviewer: the builder. No fresh-context reviewer was available**, because this session has no subagent tool. As `visual-qa.md` asks, the first impression was written from the blurred before/after sheet (`captures/compare/squint-390.png`) before re-reading `DESIGN.md`. Treat every "yes" below as the builder's claim, backed by the capture it names.

## First impression (from `captures/compare/squint-390.png`, before re-reading DESIGN.md)

- **This page communicates:** "a farm's herd screen: here are the cows with problems, and here is where you look one up".
- **First three things the eye lands on:** 1. the navy bar with the farm name; 2. the two red "Alert" cards; 3. the search field. **Intended order:** flagged cows, then search, then freshness. The bar comes first because of its mass. It is chrome, but it carries the freshness chip, so it is accepted (see check 1).
- **One word:** "checklist" (the old screen's word would be "greeting").
- **Areas I cannot name within two seconds:** none on the new screen. On the old screen, the four sparklines (they carry no data).

## Critique against objectives

- Task 1 (see flagged cows) → the "Needs attention" cards directly under search → all 5 flagged cows are in the 390 × 844 first viewport, each with a word + shape + colour badge and its two numbers → exceptions before inventory; von Restorff works because the 35 normal cows are uncoloured (`captures/after/app-390-after-fold.png`).
- Task 2 (vet rings about 1629) → sticky search with the tag-digit match and a "123" keypad toggle → typing "1629" leaves one row directly under the box showing Alert, yield 28.3 (−8.8) and cond. 6.42, so no tap is needed (`captures/after/states/search-tag-390-after.png`). In round 1 that row was below the five cards, off-screen.
- Task 3 (mark checked) → full-width 56 px primary in the bottom sheet, snackbar with Undo, card moves to the end marked "Checked 15:35" → a visible, persistent result and a way back (`toast-undo-390-after.png`, `detail-already-checked-390-after.png`, `all-checked-390-after.png`).
- Task 4 (is this current?) → the chip in the bar and a banner when the copy is saved or stale → the screen is never blank and never falsely "Updated" (`offline-cached-390-after.png`, `stale-cached-390-after.png`, `error-500-cached-390-after.png`, `offline-nocache-390-after.png`, `sw-offline-reload-390-after.png`).
- Task 5 (note) → labelled field, Save button, inline result, and an honest "kept on this phone" hint → nothing typed is silently lost (`note-error-390-after.png`, `note-saved-390-after.png`).
- Honesty → the fabricated deltas and sparklines are gone. The totals are the JSON's own. The herd median is labelled as computed from the same list (`detail-open-390-after.png`).

## Checks

| # | Question | Yes / No | Evidence (capture, what it shows) | Fix |
| --- | --- | --- | --- | --- |
| 1 | Surface appropriate to its category? | Yes, by deliberate departure | `app-390-after-fold.png`: body 17 px and 56 px rows on touch; `app-1440-after-fold.png`: 16 px and 44 px rows on a fine pointer. It is denser than the mobile norm and looser than the dashboard norm, justified by gloves (DESIGN.md Principle 2). The app bar takes about 130 px on phones (two rows), which is accepted because it holds the freshness chip and all 5 cards still fit | — |
| 2 | Each top task doable on a phone and by keyboard? | Yes | the task list above; `widgets.mjs` dialog ×2 PASS (focus in, trap, Esc, return); `focus-row-390-after.png` | — |
| 3 | Swap test (fits a competitor)? | Partly, and intended | The structure (exceptions → search → list → sheet) would suit any herd app; on a productive surface that is Jakob's law. The navy bar with the droplet mark, the wordmark in Nunito and the milking/conductivity language are Milkline's. See EVAL-NOTES on this check versus "familiarity is an asset" | — |
| 4 | Anything generated-looking; every audit signal fixed or justified? | Yes (justified) | The only remaining signal is "17 px body / ≥ 48 px controls", justified in DESIGN.md. Gone: greeting, emoji, KPI tiles, sparklines, card soup, indigo, "No data" | — |
| 5, 6, 10, 11, 12, 14 | Expressive-only checks | n/a | productive surface; no imagery | — |
| 7 | Typography: a real scale, used? | Yes | audit: 4 sizes at 390 (20 · 17 · 15 · 14), 6 at 1440 (24 · 20 · 18 · 16 · 15 · 14; 18 is the search input), down from 8–9. Nunito only for names and headings (4–6 %). Tags are distinguishable I/l/1/0 (`audit/font-specimen.png`) | — |
| 8 | One layout per kind of task, consistently? | Yes | flagged cow = card everywhere; cow in the herd = table row everywhere; any cow = the same sheet (`detail-open-390-after.png`, `detail-open-1440-after.png`) | — |
| 9 | Cards rare, one elevation model? | Yes, after a fix | Round 1: the sheet's four figures were bordered tiles inside the dialog (surface in a layer), with red borders as a colour-only cue. Fixed: flat tinted grid, no borders (`detail-open-390-after.png`) | R1-8 |
| 13 | Headlines only: does the structure read? | Yes | `audit/after-a11y.txt`: h1 Hegarty Farm, Mallow · h2 Needs attention · h2 Herd · h2 Notes for the relief milker | — |
| 15 | One primary action per view, one colour; selected ≠ accent? | Yes | the list view has no filled button; the sheet has one ("Mark as checked", `#0b5f8a`). Keypad-pressed and the current nav item use neutral/ink, not the accent (`search-keypad-on-390-after.png`) | — |
| 16 | Every state rendered? | Yes | 30 captures in `captures/after/states/`: idle, loading, refreshing, offline (saved / none / via service worker), server error, stale, search (tag / name / none / keypad), detail (open / checked / reopened), snackbar, all checked, no flags, 15 flags + a 52-character name, note (error / saved), hover, focus (row, 1440 tab), dark ×2. Disabled: none exists by design (Refresh is `aria-disabled` while busy: `refresh-busy-390-after.png`) | — |
| 17 | Colour budget, contrast, no colour-only meaning? | Yes | audit: 0 real contrast failures (the one listed is an off-screen skip link, see DESIGN.md). Status = word + shape + colour; `audit/after-a11y/vision-deuteranopia.png` | — |
| 18 | Mobile designed, not squeezed? | Yes | 390: its own stack order and a 4-column table; 320 reflow passes after round 1 (`audit/after-a11y/reflow-320.png`); 768 has its own 5-column table (`app-768-after-fold.png`) | R1-4 |
| 19 | Accessibility pass? | Yes, except for a screen-reader test | `a11y.mjs` at 1280 and 390: 0 FAIL; forced colours, reduced motion and no-JS renders in `captures/after/prefs/`. **Not done:** NVDA / VoiceOver / TalkBack (not available) | — |
| 20 | Performance within budget? | Partly (justified) | Lighthouse mobile median: LCP 1.58 s (budget 2.5 s; old 1.38 s, but the old page's webfont never loaded), FCP 1.05 s (old 1.38), CLS 0.001 after round 1 (it was 0.114). `audit/perf/lighthouse.md` | R1-5 |
| 21 | Copy short, product-like, one label per intent? | Yes | "Needs attention", "Find a cow", "Mark as checked", "No signal · saved 15:56", "Try again". The offline banner copy was cut in round 1 | R1-2 |
| 22 | Holds up beside the Phase 2 references? | Yes | the banner follows GOV.UK's heading + sentence + action; touch targets exceed Primer's coarse 44 px; connection states follow farmOS Field Kit's model, with words and times added | — |

## Round 1: found from renders, fixed in one batch

- **R1-1** Search results for "1629" sat below the five cards, so the vet-call task still needed scrolling. Fix: hide "Needs attention" while a query is active (< 1024 px); show Cond. on phones.
- **R1-2** The offline banner was about 300 px tall. Fix: shorter copy, 17 px heading, action beside the text from 480 px.
- **R1-3** Reopening a checked cow showed both "Mark as checked" and "Checked · Undo" (`.btn { display:inline-flex }` beat `[hidden]`). Fix: a global `[hidden] { display:none !important }`.
- **R1-4** 320 px reflow: page 377 px wide (grid min-content, a `nowrap` header). Fix: `minmax(0,1fr)`, a wrapping unit, tighter padding below 360.
- **R1-5** CLS 0.114: the herd section moved when cards arrived. Fix: herd and notes stay hidden until the first render.
- **R1-6** Keypad toggle visible "123" vs name "Number keypad" (2.5.3). Fix: name "123 keypad", and the label no longer swaps.
- **R1-7** A 28 × 34 px mark link on phones. Fix: the mark is an image, not a link.
- **R1-8** Figure tiles in the sheet (surface in a layer, colour-only borders). Fix: flattened.
- **R1-9** The primary button crowded the hint text. Fix: spacing.

**Re-rendered at:** 1440 / 1280 / 1024 / 768 / 390 (`captures/after/app-*-after*.png`), plus all 30 states and the preference renders.

## Round 2: re-scored from the new captures

R1-1 resolved (`search-tag-390-after.png`) · R1-2 resolved (`offline-cached-390-after.png`) · R1-3 resolved (`detail-already-checked-390-after.png`) · R1-4 resolved (`audit/after-a11y/reflow-320.png`; a11y 0 FAIL) · R1-5 resolved (Lighthouse CLS 0.001; audit CLS 0.000) · R1-6 resolved (axe experimental no longer lists it) · R1-7 resolved (no control under 44 px at 390) · R1-8 resolved (`detail-open-390-after.png`) · R1-9 resolved (same capture).

**Weakest screen:** the desktop, 1024–1440. It keeps the learned frame (table left, attention right), so a keyboard user tabs through the right-hand cards before the table. That is the DOM order, deliberately exceptions-first, but it differs from the visual left-to-right order. It is acceptable under 2.4.3 because the order is meaningful. It would be the first thing to test with real desktop users.

**Remaining "no" answers:** none. Two partials are accepted with reasons: the app-bar height on phones (check 1) and LCP +0.2 s against a page whose fonts never loaded (check 20).
