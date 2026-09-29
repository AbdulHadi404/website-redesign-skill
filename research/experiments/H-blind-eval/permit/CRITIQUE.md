# Critique — rounds 1 and 2 (of at most 3)

**Reviewer:** the builder. No subagent or separate model call was available in this run, so the fresh-context review could not happen. Fallback used (`visual-qa.md` §Critique): first impression written from the blurred sheet and the no-text variant alone, then task walkthroughs judged from captures, then the direction re-read. Treat every "yes" below as the builder's claim with a capture attached, not as independent evidence.

Captures: `captures/before/`, `captures/after/` (1440 / 1280 / 1024 / 768 / 390, full and `-fold`), `captures/states-before/`, `captures/states-after/`, `captures/walk/`, `captures/critique-blur-1440.png`, `captures/variants/home-1440-after-no-text.png`, `captures/before-after-390.png`, `captures/sheet-a.png` … `sheet-d.png`.

## First impression (written from `critique-blur-1440.png` and the no-text variant, before re-reading DESIGN.md)

- This page communicates: an official form-like page — a heading block, one dark button, lists, a ruled table. Nothing is selling.
- The first three things my eye lands on: 1. the dark heading block top-left 2. the one teal-blue button 3. the ruled table lower down — the intended order was: heading → what it costs → Start now → zones. The cost sentence does not survive the blur (it is body text), which is acceptable because it sits directly above the button.
- One word: *official*.
- Areas I cannot name within two seconds: the right half of the 1440 viewport is empty (by design — a two-thirds reading column); in the blur it reads as unfinished rather than calm.
- Beside the ledger captures: not a sibling of Azul (pattern wall), Milkline herd (navy app chrome, cards), Sanad (dashboard) or Milkline marketing (split hero with navy product panel). The nearest in blur is Milkline marketing's white ground + dark button, but the composition (no hero panel, no second column) differs.

## Critique against objectives

- Top task 1 (is my street in a zone) → street question first + the zone answer panel (`states-after/1-street-chosen-phone-after.png`) → the answer arrives in one select, in words ("Quay Street is in zone A, Old Harbour.") → eligibility before effort (GOV.UK "check a service is suitable"; complaint 1).
- Top task 2 (what will it cost) → price range in the first viewport of `/` (`after/home-390-after-fold.png`), per-zone table below, prices on each radio (`states-after/2-permit-price-phone-after.png`) → the price is known before any personal field → complaint 5.
- Top task 3 (finish on a phone) → 48 px full-width buttons, single column, no page overflow at 390 (`audit/after/audit.md`: no overflow), no timer, answers kept across reload (`states-after/8-reload-keeps-answers-phone-after.png`) → complaints 3 and 4.
- Top task 4 (fix a mistake) → error summary focused at the top with links; red bar + message at each field (`states-after/4-details-errors-phone-after.png`) → complaint 2.
- Brand → crest colours as action and focus (`states-after/9-focus-continue-desktop-desktop-after.png`: gold focus fill) → the service is recognisably the council's without decoration.

## Checks

| # | Question | Applies to | Yes / No | Evidence (capture, what it shows) | Fix |
| --- | --- | --- | --- | --- | --- |
| 1 | Appropriate to category (density, sizes, motion, colour's job)? | all | Yes | `after/apply-390-after.png`: 17 px body, 32 px h1, one action, no motion, colour only for action/error/focus | — |
| 2 | Each top task doable with obvious next steps, on a phone and by keyboard? | all | Yes | walkthroughs below; `audit/after-widgets.txt` (keyboard contracts pass); `audit/after-a11y-*.txt` tab orders | — |
| 3 | Swap test (brand layer only) | all | Yes, passes — with a caveat | name-swapped, the crest palette + gold focus still point at this council; the interaction model is deliberately the category's | — |
| 4 | Reading as generated / model's prior / `audit.mjs` signals justified? | all | Yes (justified) | only signal: "one family at one or two weights carries every level — on a marketing page…": this is a service page with no display level by design (DESIGN.md Typography). Footer's middle-dot line is the council's legal copy kept verbatim | — |
| 5 | Two different companies' work, before/after? | expressive + redesign | n/a (productive) — but yes | `before-after-390.png` | — |
| 6 | First viewport memorable / headline test | expressive | n/a | — | — |
| 7 | Typography distinctive where it should be, quiet where it should be; real scale used? | all | **Round 1: No** → Round 2: Yes | Round 1 audit at 390 showed 5 sizes (32 · 22 · 19 · 17 · 16): the council name and the start button were 19 px on phones, off the scale. Round 2 `audit/after/audit.md`: 32 · 22 · 17 · 16 | set both to `--type-body` |
| 8 | One layout per kind of task, applied consistently? | all | Yes | every step: back link → caption → h1 → fields → button (`sheet-a.png`, `sheet-c.png`) | — |
| 9 | Boxes and cards rare? One elevation model? | all | Yes | two tinted panels only (zone answer, footer) + the confirmation panel; no shadows | — |
| 10 | Product shown | expressive | n/a | — | — |
| 11 | Imagery purposeful | where imagery | n/a (crest only) | — | — |
| 12 | Content-free render still this design? | expressive | n/a — recorded anyway | `variants/home-1440-after-no-text.png`: crest, blue rule, one button, table rules. Recognisable only by the crest — intended for a public service | — |
| 13 | Headlines only: does the structure read? | all | **Round 1: No** → Round 2: Yes | Round 1 `after-a11y-start.txt` headings: h1 · Before you start · After you apply — the zones-and-prices table (the answer to tasks 1–2) was only a `<caption>`, invisible to heading navigation. Round 2: h1 · Before you start · Zones, streets and prices · After you apply | real `h2` added; caption made descriptive and visually hidden |
| 14 | Blurred first viewport vs old and ledger | expressive | n/a — done anyway | `critique-blur-1440.png` | — |
| 15 | One primary action per view, one colour; selected ≠ accent? | all | Yes | every step has one filled button; radios/checkboxes native with `accent-color` (selection is the native control's own state) | — |
| 16 | Every widget state designed and rendered? | all with widgets | Yes | `captures/states-after/`: idle, chosen, error, not-listed, price, Blue Badge, errors while fixing, check, no consent, sending, success, server error, offline, zones failed (apply and start), reload, long content | — |
| 17 | Colour budget; every text pair ≥ 4.5:1; no meaning by colour alone? | all | Yes | `audit/after/audit.md` no contrast fails; errors carry words + hidden "Error:" prefix | — |
| 18 | Mobile designed: stack order, targets ≥ 44 px for primary actions, tables handled? | all | Yes | `after/home-390-after.png` (table stacks per zone), buttons 358×48 (`walk/new/states.md`) | — |
| 19 | Accessibility pass done? | all | Yes, except a real screen reader | see REPORT.md "Accessibility" | deferred: NVDA/VoiceOver smoke test |
| 20 | Performance within budget? | all | Yes | `audit/perf.md`: LCP 652 / 704 ms (slow 4G, 4× CPU), CLS 0, TBT 0; ≈ 39 KB compressed | — |
| 21 | Copy short, no happy talk, one label per intent? | all | Yes | "Start now", "Continue", "Send application"; happy talk from the old page removed | — |
| 22 | Holds up beside the references (GOV.UK patterns)? | all | Yes | the error pattern, check answers and confirmation match the pattern source; the focus fill is as strong as GOV.UK's | — |

## Task walkthroughs (productive routes)

Driven with `states.mjs --aria --each` on a 390 × 844 phone (`captures/walk/old/`, `captures/walk/new/`), choosing each step from the capture. The `--aria` "not readable on screen" marks did not work in this environment ("This Playwright cannot mark what is readable on screen (needs ai-mode snapshots)"), so readability was judged from the captures alone.

| Task (in the user's words) | Build | Result, and the answer given | User actions | Dead taps | Doubts (capture, moment) | Named but not readable |
| --- | --- | --- | --- | --- | --- | --- |
| "Is Mill Road in a parking zone, and which one?" | old | **Partial.** Mill Road is cut off in the table's Streets column ("Castle Street, Green Lane, M…"); a sideways swipe pans the whole zoomed-out page and leaves blank screen | 3 (tap Get Started, swipe up, swipe left) | 0 reported | `walk/old/…-04.png`: the Streets column ends mid-word; `…-06.png`: after swiping left the form is gone | Mill Road (in the accessibility tree, not on screen) |
| | new | **Yes.** "Mill Road is in zone C, Castle Green." — from the start page table (2 swipes) or from step 1 (tap Start now, choose the street) | 2 | 0 | none | none observed |
| "How much is a 6-month permit for me?" | old | **Partial.** After choosing CPZ C and 6 months, "Fee: £70" appears below the Submit button, off screen | 5 | 0 | `walk/old/…-10.png` shows no price | the fee paragraph |
| | new | **Yes.** £70 — in the zone answer ("£40 for 3 months, £70 for 6 months…") and on the 6-month radio | 2 | 0 | none | none |
| "Apply for a 12-month permit" (keyboard only) | old | **No.** "I am not a robot" is a `span` that Tab never reaches (`audit/before-a11y-apply/`: tab order has 13 stops, none of them the robot check); the submit always fails | — | — | — | — |
| | new | **Yes.** Reference HPP-104233 shown (mocked API), focus on "Application sent" (`qa/payload-probe.txt`) | 8 Continue/Send + fields | 0 | none | none |
| "I pressed submit and it says there's a problem — what?" | old | **No.** Message appears at the top, out of view; `states.mjs` reported the click "changed nothing on screen" | — | 1 | `states-before/submit-empty-phone-before.png` | — |
| | new | **Yes.** Focus jumps to "There is a problem" with a link per field; each field shows its message (`states-after/4-details-errors-phone-after.png`) | 1 | 0 | none | none |

What this cannot show: reach, real tap accuracy, a real screen reader, how residents actually read "controlled hours", and whether the 6-step length feels long. It is a walkthrough, not a usability test.

**Weakest screen and why:** the start page at 1440 — the right half of the viewport is empty, and "Before you start" and the table push "After you apply" below two screens. It is the GOV.UK two-thirds convention and the right trade for a reading column, but a council with a site-wide layout would place its own navigation or related links there (none exist in this repo).

**Fixes made in round 1** (one batch, then one full recapture): real `h2` for "Zones, streets and prices" (check 13); council name and start button back on the type scale (check 7). Earlier, during Phase 6, several defects found by the scripts were also fixed before this critique: send-failure copy that told server-error users to "check your connection"; programmatic focus ring on the confirmation heading; the Price row's misleading "Change" link; a 22 px-tall header link; link focus bars thickened from 4 to 6 px for 2.4.13; the print button's missing forced-colours boundary; both error boxes wrapped in `role="alert"` as GOV.UK does.

**Re-rendered at:** 1440 / 1280 / 1024 / 768 / 390 — `captures/after/`; states — `captures/states-after/` (23 + 3 states).

**Status of round 1 findings (round 2):** check 7 resolved (`audit/after/audit.md`, 390: 32 · 22 · 17 · 16); check 13 resolved (`audit/after-a11y-start.txt` headings line).

**Remaining "no" answers:** none.
