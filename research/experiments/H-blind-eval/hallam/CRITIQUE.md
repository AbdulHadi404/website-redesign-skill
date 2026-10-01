# Critique — round 1 of at most 3 (then a re-check of the fixes)

**Who reviewed.** The skill asks for a fresh-context reviewer. This harness has no subagent tool (no Agent/Task tool; the remote-session tool starts a separate container that cannot see these captures, and pushing them anywhere was ruled out), so this is the builder's own review, made as blind as the tools allow (`visual-qa.md`, "Critique"): the blurred sheet and the content-free render were built and looked at first, the first impression below was written from those two images alone, then the task walkthroughs were run on both builds, and only then was `DESIGN.md` re-read. Treat every "yes" here as weaker evidence than a stranger's.

Captures used: `captures/review/critique-ledger-blur.png` (new and old 1440 first viewport, blurred, beside four ledger captures), `captures/review/critique-no-text.png`, `captures/after/*-after*.png` (all five pages at 1440, 1280, 1024, 768, 390), `captures/compare/*.png` (old beside new, every page and width), `captures/variants/` (no-JS, no-text, no-images, no-shadows), `captures/states/*-after.png` (19 states: form errors, prefill, sent, menu open, finder variants, slow and failed data, header scrolled, landscape, focus), `captures/walk/` (task walkthroughs, old and new), `captures/review/states-sheet-1.png`, `captures/review/critique-states-2.png`, `captures/review/walk-sheet.png`, `qa/fees-print.pdf`.

## First impression (written from the blurred sheet and the no-text render, before re-reading DESIGN.md)

- This page communicates: a confident, deep-blue page that leads with one very large number and one gold button; the rest is calm white lists divided by rules, a pale band of three big dates, and a blue close.
- The first three things my eye lands on: 1. the huge figure (£45) 2. the two-line serif headline 3. the gold button — the intended order was headline → figure → action; at 390 the eye goes headline first (it is above the figure), at 1440 the figure competes with the headline and slightly wins. Acceptable: both are the message.
- One word: straightforward.
- Areas I cannot name within two seconds: the thin bar with ticks in the pale band (it reads as a progress bar until you see "Today"); the gold underlined blanks read as "something to fill in" — which they are.

## Critique against objectives

- Top task 1 (what will it cost me) → the fee finder in the first viewport → a price in one tap, before any sales copy → principle 1, the 81% exit from `/fees/` (`captures/walk/new/fee-sole-60k-phone-02.png`: £65 after one change; old: three taps to a 404, `captures/walk/old/fee-sole-60k-phone-04.png`).
- Top task 2 (call) → Call in the sticky navy header on every page, gold whenever the page's own primary action is off screen → one tap from any scroll position, including landscape phones (`captures/states/landscape-scrolled-844x390-after.png`) → principle 2 and the README's "most clicked element".
- Top task 4 (enquire) → the finder hands business type, turnover and service to the form; labels, types and autofill; errors that say what to do → 6 inputs instead of 10, no `alert()` (`captures/walk/new/enquire-from-fee-phone-04.png`; payload `captures/walk/new/requests/enquire-from-fee-phone.json`) → GOV.UK pattern, NN/g form research.
- Brand → the 1988 lettermark's navy as a full field from the top edge, its gold only on what to press → the identity is recognisably theirs without being the 2014 site (`critique-ledger-blur.png`).
- "Modern" for younger clients → shown through what they expect online (a price, a phone-first layout, instant feedback) rather than through 3D → `DESIGN.md` Interaction value test.
- Weak point → the tax-year line is decoration-adjacent: it explains where the year has got to, but needs its "Today" label to be read. It stays (it is the one scroll-linked move and it is labelled), but it is the first thing to cut if the partners find it fussy.

## Checks

| # | Question | Yes / No | Evidence (capture, what it shows) | Fix |
| --- | --- | --- | --- | --- |
| 1 | Surface appropriate to its category? | yes | `captures/after/home-390-after-fold.png`: marketing scale (40–88 px display, 17–18 px body), one idea per viewport; the form is a productive single column (`captures/states/contact-idle-phone-after.png`) | — |
| 2 | Each top task doable from this screen, phone and keyboard? | yes | price: `walk/new/fee-sole-60k-phone-02.png` (1 action); call: header in every capture; services: chapter 2; enquiry: `walk/new/enquire-from-fee-phone-*.png` (11 actions, 0 dead taps); deadlines: chapter 3. Keyboard: `a11y.mjs` 0 FAIL on all five pages, widget contracts pass (`qa/contracts-*.json`) | — |
| 3 | Swap test | no (passes), with a caveat | the page's hero is this practice's own fee schedule, deadlines, partners and address; the navy-and-gold palette and serif are the category's, kept because they are the 1988 lettermark (`DESIGN.md` Category test). A competitor with published fixed fees and a navy mark could wear the *layout*; it could not wear the content | — |
| 4 | Reading as generated? Every `audit.mjs` signal handled? | no (passes) | no eyebrows (the line above the h1 carries the category and place, once per page), no mono, no italic accent, no gradient, cards only for fee packages; the one signal, "big numbers: 31, 31, 31", is the three deadline days from `data/fees.json` | — |
| 5 | Two different companies' work? First-notice things changed? | yes | `captures/compare/home-1440.png`: typeface (Literata/Schibsted vs Georgia/Arial at 13 px), palette strategy (committed navy field vs grey page and box), hero (typographic finder vs empty slider), rhythm (full-width chapters vs boxed column and placeholder cards), imagery (figures at scale vs grey placeholders) all changed; navy and gold kept as the lettermark's colours, named in `DESIGN.md` | — |
| 6 | First viewport memorable without the copy; headline test; action continues the sentence? | yes | `critique-no-text.png`: navy field, gold blanks and button survive as the design; h1 + line above pass the headline test; "Ask about this fee" continues "£45 a month" | — |
| 7 | Typography distinctive where it should be, quiet elsewhere; real scale used? | yes | Literata only for statements, figures, dates and names; Schibsted for everything read; `audit/after/audit.md` lists 10 sizes at 390 (fluid steps), every step in use | — |
| 8 | Rhythm; blur reproduces the content priority? | yes | home: statement + finder (navy) → ruled index (white) → dates in columns (mist) → two-column people (white) → close (navy); blur shows statement → figure → action | — |
| 9 | Boxes and cards rare? | yes | only the four fee packages on `/fees/` are cards (`captures/after/fees-1440-after.png`) | — |
| 10 | Product shown, not described? | yes | the "product" is the fixed fee: shown live, with the full schedule one tap away | — |
| 11 | Images | n/a | no imagery, argued in `DESIGN.md`; the no-images variant is identical to the page | — |
| 12 | Content-free render recognisable; shadows removed still finished? | yes | `critique-no-text.png`; there are no shadows except the open phone menu's | — |
| 13 | Headlines only — does the story read? | yes | "Fixed fees, on the table. → What we do → Personal tax … Business advice → Dates to know → Who you'll deal with → David Hallam, Priya Price → Ring us, or tell us what you need." | — |
| 14 | Blurred beside old site and ledger: could a stranger mistake them? | no (passes) | `critique-ledger-blur.png`: the new page is the only full-bleed navy first viewport; all ledger captures are white pages. Round 0 (key screen) caught the old site's "white band + navy box" massing and changed it | — |
| 15 | One primary action per view, one colour; selected ≠ accent? | **no → fixed** | found: with the closing chapter on screen, the header's Call had turned gold beside the close's gold "Send an enquiry" (two primaries). Fixed by marking every closing "Send an enquiry" as the page's primary (`data-primary-cta`); re-rendered: `captures/states/close-in-view-desktop-after.png` shows Call outlined, one gold button. Selected radios use navy, not gold | done |
| 16 | Every widget's states designed and rendered? | yes | finder: default, changed, "from", "we'll quote you" (`captures/review/states-sheet-1.png`); form: idle, ≥ 3 errors with summary, 2 errors (focus to field), prefilled, sent; menu open; data slow and offline (`captures/states/home-slow-data-phone-after.png`, `fees-offline-phone-after.png`: the pre-rendered copy stands in); no-JS (`captures/variants/*-nojs*.png`) | — |
| 17 | Colour budget; contrast; no meaning by colour alone? | yes | Committed navy ≈ 40–45% of the home page; `audit.mjs` 0 contrast fails in 10 views; "Your fee" and "— yours" words beside the navy highlight; errors carry icon + "Error:" + text | — |
| 18 | Mobile designed; targets; navigation transformed? | yes, one justified exception | 390 captures; Menu disclosure; Call in header; radios are 48 px rows whose whole label is the target (the 22 px input inside is what `audit.mjs` counts) | — |
| 19 | Accessibility pass | yes, except real assistive technology | keyboard walk (`a11y.mjs` 0 FAIL, 0 WARN, five pages), reflow 320/640 and text spacing (`audit/after-a11y/*/`), forced colours (`audit/after-a11y/home/forced-colors.png`), reduced motion (`qa/motion-*`), widget contracts all PASS; no screen reader available here — deferred to the practice (see REPORT) | — |
| 20 | Performance within budget? | yes, slower than the old build | `qa/perf-report.md`: phone LCP 752–816 ms (old 428–448 ms), CLS ≤ 0.001, TBT 0; the old site loaded no web fonts and 2 KB of CSS; growth is 96 KB of fonts (two files) plus ≈ 7 KB gzip of CSS/JS | — |
| 21 | Copy short, no happy talk, one label per intent? | yes | "Ask about this fee" for the fee, "Send an enquiry" for the form, "Call" for the phone everywhere; the 2014 "personal, professional and proactive" paragraph is gone | — |
| 22 | Would it hold up beside the references; polish pass? | partial | finish is good at 390 and 1440; at 1024 the h1 sits small in a wide navy field (`captures/after/home-1024-after-fold.png`) — acceptable, not tuned further. The Apple reference is matched in its configure-and-see-the-price behaviour, not in production value (no photography exists) | not fixed: needs photography from the practice |
| 23 | Breaks if (1) a figure not in `fees.json`; (2) more than one tap to call; (3) motion without a job | holds | (1) `qa/parity.md`: every price traced to `data/fees.json` (the "£8" flag is a script false positive: `"price":8`, single digits are not matched); (2) sticky header with Call at every width including 844 × 390 (`landscape-scrolled`); only at 400% zoom does the header scroll away (by design, WCAG 2.4.11); (3) `qa/motion-home/motion.md`: 0 flags, nothing at rest | — |
| 24 | Images tell the truth | n/a | no images | — |

## Task walkthroughs (the form is a productive route)

| Task (in the user's words) | Build | Result | User actions | Dead taps | Doubts | Named but not readable |
| --- | --- | --- | --- | --- | --- | --- |
| "What would you charge me for accounts — sole trader, about £60k?" | old | **no**: "Fees" → "Download our fee schedule (PDF)" → 404 | 2 taps, both under 44 px (nav 59×34) | 0 | the whole page | the fees were never on the site |
| | new | **yes**: £65 a month + VAT, sole trader accounts and tax return | 1 (change turnover) | 0 | none | — |
| "Ask them about that fee" | old | form reachable; 10 unlabelled fields; in this repo an empty form posts ten empty fields (validation never attaches) | 10 fields + submit | 0 | which fields are needed for an individual | — |
| | new | **yes**: lands on the form with business type, turnover and service filled; 4 fields + 2 choices + submit; payload identical in shape to the old one | 11 steps (1 finder change, 1 tap to the form, 4 fills, 2 taps, submit) | 0 | the prefilled radio is below the fold when the form opens (the note above the form says the answers were filled in) | — |

**Weakest chapter and why:** the tax-year line on the home page — the only element that needs its label to be understood; and the 1024 px hero, where the type does not fill the field.

**Fixes made in this round** (one batch, then one full recapture): one primary action per view (closing buttons marked as primary); header stays sticky on landscape phones (only ≤ 320 px tall screens release it); services fold to two columns on tablets so "Ask about …" no longer wraps; footer and inline link targets ≥ 44 px; fee schedule print layout (`qa/fees-print.pdf`, two A4 pages, no highlighting).

**Re-rendered at:** 1440 / 1280 / 1024 / 768 / 390 — `captures/after/`; states `captures/states/*-after.png` (19/19, axe clean).

**Status of last round's findings** (the key-screen round, `DESIGN.md`): old hero massing — resolved (`critique-ledger-blur.png`); finder wrapping at desktop — resolved; colon spacing in fee lines — resolved.

**Remaining "no" answers:** none. One "partial" (22) needs the practice's own photographs, which only they can supply.
