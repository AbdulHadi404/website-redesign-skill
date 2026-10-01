# Critique — rounds 1 and 2 of at most 3

**Reviewer: not fresh.** This run had no subagent tool and no separate model call; the remote-session tool starts a cloud session that cannot see these local files. Fallback per `visual-qa.md` "Critique": the blurred sheets and the no-text render were built first, and the first impression below was written from them alone before re-reading `DESIGN.md`. Then the task walkthroughs, then the checks. Every "yes" names a capture and was hunted for a counter-example; the hunt found five "no"s in round 1, all fixed and re-rendered for round 2. A fresh reviewer should still repeat this before launch (see `REPORT.md`).

Old beside new: `captures/compare/home-1440-fold.png`, `home-390-fold.png`, `order-1440-fold.png`, `order-390-fold.png`. Blurred beside the ledger: `captures/compare/home-blur-ledger.png`, `captures/key/blur-ledger.png`. States: `captures/states/*-after.png` (15 states, phone and desktop). Walkthroughs: `captures/walk/new/`, `captures/walk/old/`.

## First impression (from the blurred sheets and the no-text render only)

- This page communicates: a bouquet lying on a green cloth, and a place to make one — the order page a row of single flowers beside the picture, with one dark button.
- The first three things my eye lands on: 1. the peach bouquet 2. the dark green button 3. the headline (home) / the stem row (order) — intended: bouquet → headline → button (home); bouquet → stems → next (order). Close enough; the button wins over the stems on the order page because it is the darkest mass.
- One word: handmade.
- Areas I cannot name within two seconds: the chapter row on the order page (reads as tabs); the two pills on the stage.

## Critique against objectives

- Look like the Instagram → the whole first viewport is her sage linen with a flat lay seen from above → a stranger who follows the account recognises the staging → `discovery/brand-audit.md` (posts 1, 3, 6), `home-1440-fold.png`.
- See it before ordering → the bouquet is the largest object on every phone screen where choices are made → answers the README's most common question → `order-390-fold.png`, `ch-wrap-ribbon-phone-after.png`.
- No price surprises → total in the bar from the first second, delivery added the moment a postcode matches a zone → the third customer quote → `walk/new/t3-price-to-ls8-phone.png` (£41.25 with the £4.95 zone after two taps and a postcode).
- Only what the shop can get → resting stems in the tray with "Back in May"; dates that would break a chosen stem explained with a priced repair → the October peonies call → `walk/new/t2-peonies-in-october-phone.png`, `date-conflict-phone-after.png`.
- Short on a phone → five chapters, one visible, the bouquet in the bar → "the form is so long on my phone" → `ch-delivery-phone-after.png`, `empty-submit-phone-after.png`.
- Weak point → the hero lede on desktop sits in a paper box: a small card on the cloth; it reads as a label rather than a page block, which is acceptable, but it is the one "box" in the first viewport.

## Checks

| # | Question | Yes / No | Evidence (capture, what it shows) | Fix |
| --- | --- | --- | --- | --- |
| 1 | Surface appropriate to its category | yes | `order-390-after-fold.png`: mobile-consumer dials (17 px body, 44 px targets, one column); `home-1440-after-fold.png`: expressive, one idea per viewport. `audit.mjs --kind configurator`'s "desk density" signal is dismissed: this is a phone configurator, not a desk tool | — |
| 2 | Top tasks doable on a phone and by keyboard | yes | walkthroughs below; `widgets.mjs` dialog, live, form-errors, disclosure all PASS; `a11y.mjs` 0 FAIL on `/order/` (ch 1, 3, 4) | — |
| 3 | Swap test (brand layer) | yes | another florist's name on `home-1440-after-fold.png` would describe this shop's backdrop, wraps and tags. Hunted: the sage tone is drawn from her description, not sampled from her photos — if her linen is a different sage, the match weakens (open item in `REPORT.md`) | — |
| 4 | Reads as generated? Signals fixed or justified | yes (after round 1) | round 1: pill primary buttons kept a first-notice shape of the old site → 10 px radius. Remaining `audit.mjs` signals: "Big-number claims: 14" (the shop's door number, real); "desk density" (dismissed above). Alternating linen/paper chapters checked: each chapter changes composition with its content (flat lay row, card, table, door) | — |
| 5 | Two different companies' work? First-notice things changed | yes | `home-1440-fold.png` before/after: pink gradient → linen; script → grotesk + handwriting; emoji → drawings; no imagery → illustrated flat lay; pink pills → green buttons. Kept: the name and the stem motif only | — |
| 6 | First viewport memorable without copy; headline test | yes | `variants/home-390-after-no-text.png` (fold) still reads as a bouquet on cloth; "Make your own bouquet." + lede says florist, hand-tied, Chapel Allerton; the button continues it ("Make a bouquet") | — |
| 7 | Typography distinctive where it should be, quiet elsewhere | yes | Kalam only on names written by hand; Familjen for everything else; order sizes 14 · 15 · 17 · 20 · 24 (+ hand 16/18/24); home uses 10 sizes including hand sizes — at the edge, every one used | — |
| 8 | Rhythm; blur reproduces content priority | yes | `home-390-after.png`: hero → flat lay row → card → table → door, each composition follows its content; blur: bouquet first, button second | — |
| 9 | Cards rare and card-shaped; one elevation model | yes | stem cards, choice cards, day chips are independent objects; panels divided by space; `SYSTEM.md` elevation | — |
| 10 | Product shown, not described | yes | the home hero *is* the builder's default bouquet, same drawing (`home-1440-after-fold.png`, `order-1440-after-fold.png`) | — |
| 11 | Every image has a purpose | yes | bouquet (the product), stems (the stock and season), card (the hand-written card), door (the shop). No-images variant: `variants/home-390-after-no-images.png` loses nothing (all drawings are inline SVG) | — |
| 12 | Content-free and shadow-free renders | yes | `variants/home-390-after-no-text.png`, `-no-shadows.png`: linen, tags, door still this design. (The full no-text capture loses the hero art: a capture-tool defect with `svh`-sized SVG, disproved in `qa/probe-svh.out.txt`; the fold is correct) | — |
| 13 | Headlines only | yes | Make your own bouquet. / In season this month / Whatever it's for, the card is written by hand / Delivered across Leeds / The shop — reads as a story | — |
| 14 | Blurred beside old site and ledger | yes | `captures/compare/home-blur-ledger.png`: the only green field; no split panel; the ledger's white grounds and blue actions are absent | — |
| 15 | One primary action per view; one colour; selected ≠ accent | yes (after round 1) | round 1 "no": the home page used "Make a bouquet" and "Make your bouquet" for one action → one label. Header button quiet while the hero's is on screen (`home-390-after-fold.png`); selected = ink border + check | — |
| 16 | Every state designed and rendered | yes (after round 1) | 15 states in `captures/states/` incl. empty-submit, outside-area, date-conflict, stems-too-few, server-error, sent, share-open, data-offline. Round 1 "no": data-offline showed dead controls and £0.00 → hidden | — |
| 17 | Colour budget; contrast; no colour-only meaning | yes | axe clean on 15 states and 7 audited views; body text never on linen; resting = grey + words | — |
| 18 | Mobile designed | yes | 390 captures; targets 44 px (chapter links fixed in round 1); tray as a sideways row with a peeking card; sticky budget 128 px | — |
| 19 | Accessibility pass | partial | keyboard contracts PASS, a11y.mjs 0 FAIL, forced colours and no-JS rendered (`captures/variants/`), reduced motion via `motion.mjs`. Not done: a real screen reader (none available here) | listed in `REPORT.md` |
| 20 | Performance within budget | yes | `audit/perf/perf.md`: LCP 1.0 s / 1.23 s on slow 4G ×4 CPU, CLS 0, TBT ≤ 47 ms | — |
| 21 | Copy short; one label per intent | yes (after round 1) | see 15. Season and error messages in plain words; month names fixed ("back in may" → "back in May") | — |
| 22 | Holds up; polish pass | partial | type breaks re-read at 390, 768, 1440; tags no longer break mid-word; the hand-drawn tulip reads as a blob at small sizes (`qa/art-sheet.html`) — acceptable for an illustration, improvable | art polish listed as a follow-up |
| 23 | **Breaks if** | yes (after round 1) | (1) round 1 **no**: on a phone the bouquet scrolled away while choosing ribbon and card (`ch-wrap-phone-after.png`, round 1) → wrap chapter fits picture + all choices (`ch-wrap-ribbon-phone-after.png`), and the bouquet rides in the bar when scrolled (`ch-wrap-scrolled-phone-after.png`). (2) holds: no out-of-season stem can be sent (`date-conflict`, tests); every price was on screen before Send (`ch-check`). (3) holds: no pink, script, tile grid or cream-and-serif (`home-1440-after-fold.png`) | — |
| 24 | Images tell the truth | yes | every bouquet picture is labelled "An illustration: yours is tied by hand"; starters are labelled by content, not as Wren's posts; the home "for Mum x" card echoes post 4 without claiming to be it | — |
| 25 | Fold at 1280 × 800 | yes | `captures/key/order-1280-key-1280x800-fold.png`: stage, two rows of stems, the action bar | — |
| 26 | Seam test | yes | home → builder: same drawing, same cloth, same wordmark; the builder calmer (paper panel, one action) | — |
| 27 | Quality bar ("play with and share", "lovely on a phone") | partial | stems land and glide (motion spec PASS), re-tie, share picture (`share-open-phone-after.png`); not verified inside Instagram's in-app browser or on a real phone (no device here) | real-device check in `REPORT.md` |

## Task walkthroughs

| Task (in the user's words) | Build | Result | Actions | Dead taps | Doubts | Named but not readable |
| --- | --- | --- | --- | --- | --- | --- |
| "Can I see what it'll look like before I order?" | old | **no** — no picture anywhere (`walk/old/t1-see-it-phone.png`) | — | — | the page loads zoomed out to 1101 px | everything |
| | new | **yes** — the bouquet is the first thing on screen (`walk/new/t1-see-it-phone.png`) | 0 | 0 | — | — |
| "I want peonies for Mum" (in October) | old | **no** — peony selected without a word (`walk/old/t2-peonies-in-october-phone.png`): the shop rings later | 1 | — | — | — |
| | new (round 1) | partial — "Back in May" on the card, but the tap changed nothing visible | 2 | **1** | tapping the grey peony | — |
| | new (round 2) | **yes** — the reason lights up on the card and is written under the tray (`walk/new/t2-peonies-in-october-phone.png`) | 2 | 0 | — | — |
| "How much will it be, delivered to LS8?" | old | **no** — "Please fill in all required fields!" (`walk/old/t3-price-to-ls8-phone.png`) | 8 | — | price only in a confirm() after every field | — |
| | new | **yes** — £4.95 delivery, £41.25 total (`walk/new/t3-price-to-ls8-phone.png`) | 2 taps + postcode | 0 | — | — |
| "Can it get there today?" (LS7, after 1pm) | new | **yes** — "Same-day closed at 1pm", earliest Fri 2 Oct (`walk/new/t4-today-phone.png`) | 2 taps + postcode | 0 | — | — |

What the walkthroughs cannot show: reach and grip on a real phone, Instagram's in-app browser chrome, screen-reader speech, glare.

**Weakest chapter and why:** Wrap & card on a small phone with the keyboard open: typing the card message hides the picture behind the keyboard (the thumbnail stays in the bar). Acceptable: the card is words, not the picture.

**Fixes made in round 1** (one batch, then one full recapture): bouquet kept in view in the wrap chapter (shorter stage, compact choices, thumbnail in the bar when scrolled); visible reason for refused stems; one label for the one home action; dead controls hidden on data failure and without JavaScript; chapter links 44 px wide; month names capitalised; long stem names wrap at spaces.

**Re-rendered at:** 1440 / 1280 / 1024 / 768 / 390 — `captures/after/`; states `captures/states/*-after.png`.

**Status of round 1's findings:** all resolved, each with the capture named in its row above.

**Remaining "no" answers:** none. Partials (19, 22, 27) need things this environment does not have — a screen reader, a real phone in Instagram's in-app browser, the owner's photographs — and are listed for the owner in `REPORT.md`.
