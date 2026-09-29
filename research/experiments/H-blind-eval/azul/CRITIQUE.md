# Critique — rounds 1 and 2 (of at most 3)

**Who reviewed.** The skill prefers a fresh-context reviewer (a subagent given only the brief, `DESIGN.md` and the capture paths). This environment gave me no tool to start one, so the builder reviewed its own work. To limit that bias, the first impression below was written from the blurred and full captures *before* re-reading `DESIGN.md`, and every "yes" names the capture that shows it. Treat this as weaker evidence than an independent review.

Captures: `captures/after/` (5 widths × 5 pages, fold + full), `captures/states/*-after.png` (31 widget states), `captures/responsive/` (320, 360, 844 × 390), `captures/preferences/` (no-JS, forced colours, reduced motion), `captures/critique/` (blur sheets, removal variants), `captures/compare/` (before/after pairs).

## First impression (round 1, written before re-reading DESIGN.md)

- This page communicates: a Portuguese tile maker who sells online and tells you delivery up front.
- The first three things my eye lands on: 1. the blue-and-white tile panel, 2. the italic cobalt headline, 3. the cobalt button — intended order: headline → product → action. Close enough; the product winning over the headline is acceptable on a shop.
- One word: *tiled*.
- Areas I cannot name within two seconds: none at 1440; at 390 (round 1) the first screen was headline + paragraph + facts table, with no product and the button half-way down.

Round 2 first impression (after the hero rebuild, `captures/after/home-1440-after-fold.png`): a headline, then a wall — "this is what it looks like on your wall". One word: *wall*.

## Critique against objectives

- Make it feel like us → the founder's mark in the header and as the story chapter's shape (`captures/after/home-1440-after.png`, story field) → the mark stops being a file nobody used and becomes the site's structure → brand assets first (Commitment 3); the quartered block reads as the mark even with every word removed (`captures/critique/home-1440-variants-no-text.png`).
- Make it feel hand-painted/Portuguese → the product laid as a wall in the first viewport → a visitor sees the pattern the way it will look installed, not a lone square → web-design §2 "the visual is the product doing the thing"; Baymard's in-scale image finding.
- People don't know what delivery costs → the delivery line under the header on every page, beside the price on the product page, as a line in basket and checkout totals, with a free-delivery meter → the most common support question is answered before it is asked → Baymard: extra costs are the top abandonment reason.
- The account step loses 41% → guest checkout, account as an optional disclosure after the email field (`captures/states/checkout-idle-phone-after.png`) → the first thing asked is an email, not a password → categories.md checkout hard constraints.
- Buying the right amount → an area helper that turns m² into whole tiles, and a running line total with coverage (`captures/states/product-area-helper-desktop-after.png`) → fewer wrong orders and "how many do I need?" emails → people buy per tile but think per m².

## Checks

| # | Question | Applies to | Yes / No | Evidence (capture, what it shows) | Fix |
| --- | --- | --- | --- | --- | --- |
| 1 | Surface appropriate to its category? | all | Yes | `captures/after/checkout-1440-after.png`: 17 px body, 48 px fields, single column, no motion; home at display scale (`home-1440-after-fold.png`) | — |
| 2 | Each top task doable with obvious next steps, phone and keyboard? | all | Yes (round 2) | Round 1 **No**: at 390 the product and CTA were below the fold; PDP name/price below a 4×4 panel. Now `captures/after/home-390-after-fold.png` (CTA + wall), `captures/responsive/product-id-az-101-360-after-fold.png` (name, price, delivery before the image). Keyboard: `audit/after-a11y/*/` tab orders; `audit/widgets/*.txt` all PASS | reordered hero and PDP |
| 3 | Swap test (brand layer on productive routes) | all | Yes, with a caveat | Name-swapped, the blue-and-white wall would still fit another azulejo seller — but only by showing *their* tiles; everything else that is not product (the quartered mark as layout, the ochre corner, the four-fact story, delivery-first copy) belongs to this company. On checkout/basket the familiar model is deliberate. Caveat written in `DESIGN.md` convergence checks | — |
| 4 | Reads as generated? Signals fixed or justified? | all | Yes | `audit/after/stdout.txt`: the only ◆ left is the numbered checkout steps (a real sequence; justified in DESIGN.md). Middle-dot meta strings removed in round 1. No eyebrows, no mono, no caps labels | — |
| 5 | Before/after two different companies? Five first-notice things changed? | expressive | Yes | `captures/compare/home-1440-fold.png`: Montserrat caps → Alegreya italic; black/beige → cobalt/white/ochre; gradient hero → headline over a tile wall; centred single-template sections → varied chapters; grey-box card row → laid panels | — |
| 6 | First viewport memorable without copy; headline test; CTA continues it? | expressive | Yes | `captures/critique/home-1440-variants-no-text.png` still shows the wall and the mark. Headline: "Portuguese tiles, painted by hand near Lisbon, sent from Bristol." → "Shop all 12 designs" | — |
| 7 | Typography distinctive where it should be, quiet where it should be; scale used? | all | Yes | Italic display only for h1/h2 and the story; productive pages in Alegreya Sans at fixed sizes (`checkout-1440-after.png`) | — |
| 8 | Rhythm: no two adjacent chapters alike (home); one layout per task (productive)? | all | Yes (round 2) | Home: statement+wall → index rows → cobalt field → split panel → statement quote. Round 2 **No** for spacing: the index heading sat against the switcher → `.chapter.designs` top padding | spacing fixed |
| 9 | Boxes and cards rare, only where card-shaped? One elevation model? | all | Yes | Cards only for products; panels (delivery, summaries) are grounds without shadows; no card in a card | — |
| 10 | Product shown, not described? | expressive | Yes | Wall in hero, index of all 12, 4×4 panel on PDP with its real size | — |
| 11 | Every image has a purpose; image removed loses information? | where imagery | Yes | `captures/critique/home-1440-variants-no-images.png`: the first viewport loses the product entirely | — |
| 12 | Content-free render still this design? Shadows removed still finished? | expressive | Yes | `home-1440-variants-no-text.png` (wall, mark, ochre corner survive); `-no-shadows.png` identical (no shadows used) | — |
| 13 | Headlines only: does the story read? | all | Yes | `audit/after-a11y/a11y-home.txt` heading list: h1 promise → Four patterns (Star, Lattice, Bloom, Corners) → Our story (Painted near Lisbon, Inês and Tom, Sent from Bristol) → What delivery costs | — |
| 14 | Blurred first viewport vs old site and last ledger capture | expressive | Yes (round 2) | Round 1 **No**: `captures/critique/home-1440-fold-blur-vs-ledger.png` (earlier version) — copy-left/object-right split read as a sibling of the Milkline row. Rebuilt as a headline over a full-bleed wall; re-blurred sheet regenerated in round 2 | hero rebuilt |
| 15 | One primary action per view, one colour; selected ≠ accent? | all | Yes | Cobalt filled button once per view; selected options use an ink border + check (`states/product-one-tile-20cm-desktop-after.png`), not cobalt fill | — |
| 16 | Every widget state designed and rendered? | widgets | Yes | 31 states in `captures/states/states-after.md`: empty/filled/long/many basket, coupon error, sold out, added, area helper, no results, data error, slow data, checkout errors/EU/placing/success/server error/empty basket, mobile menu open | — |
| 17 | Colour budget; text pairs ≥ 4.5:1; no meaning by colour alone? | all | Yes | Contrast table in DESIGN.md (all ≥ 6.5:1 for text); `audit.mjs` after: one reported failure, a proven false positive (`audit/evidence/probe-fonts-and-area-calc.txt`); sold out, errors and selection carry words/icons | — |
| 18 | Mobile designed, not squeezed? | all | Yes (round 2) | 320 header wrapped in round 1 (`captures/responsive/checkout-320-after-fold.png` before fix) → mark-only below 375 px; basket lines stack; checkout summary becomes a disclosure | fixed |
| 19 | Accessibility pass done? | all | Yes, except screen reader | a11y.mjs 0 FAIL on all 8 page states; widgets.mjs all PASS (menu checked by `audit/widgets/menu-probe-390.txt`); reflow/text-spacing/forced-colours PNGs looked at. Real screen-reader test not possible here — deferred | — |
| 20 | Performance within budget? | all | Yes | `audit/perf/perf-throttled.txt`: LCP 1.1–1.4 s at 4× CPU / slow 4G, CLS 0; fonts 92 KB (3 files) | — |
| 21 | Copy short, no happy talk, product UI as product UI? | all | Yes | Cliché "Elevate" and "Timeless tiles for modern living" gone; checkout copy is instructions only | — |
| 22 | Holds up beside the references in finish and restraint? | all | Yes | Beside Dawn's product page, the buy box has the same native radio groups plus the delivery line and area helper; the checkout follows GOV.UK's error pattern (`states/checkout-errors-phone-after.png`) | — |

**Weakest screen or chapter and why:** the collection page. It is correct and clean but it is the least "Azul" page — a grid of tiles with filters, like any shop. A laid-panel toggle for the whole grid (see every design as a wall) would bring the concept here; left as a recommendation because it needs a decision about how many tiles the grid shows per design.

**Fixes made in round 1** (one batch): hero rebuilt from split to headline-over-wall; mobile hero order (CTA before the wall); PDP heading before the image on phones; product cards made single block links (focus ring on the whole card; label in name); stepper and text buttons get boundaries for 1.4.11 and forced colours; header DOM reordered so the opened menu's links follow the Menu button; sections unlabelled so the landmark list is short; meta strings rewritten; fonts trimmed to budget; first eight collection images eager and the grid's space reserved (CLS 0.37 → 0).

**Fixes made in round 2:** index chapter spacing; 320 px header (mark only); order-summary toggle text; product price line.

**Re-rendered at:** 1440 / 1280 / 1024 / 768 / 390 (+ 360, 320, 844 × 390) — `captures/after/`, `captures/responsive/`.

**Status of round 1 findings:** all resolved, each shown by the capture named in the table.

**Remaining "no" answers:** none. One open caveat (check 3) is a judgement for the owners, recorded in `REPORT.md`.
