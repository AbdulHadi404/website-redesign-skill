<!-- The fresh-context reviewer's critique, verbatim from its hand-back message. Paths are relative to the Azul evaluation's captures folder (session scratchpad); the comparison sheets it made are beside this file. -->

# Critique: Azul & Co. redesign (fresh-context review, judged from renders only)

Paths are relative to `.../blind-eval/eval-azul/captures/`. I made two sheets: `.../scratchpad/fresh-review/home-1440-fold-blur.png` (new vs old, blur 6) and `.../fresh-review/phone-folds.png` (PDP, collection and checkout folds at 390). I wrote no other files; I deleted my temporary crops.

**Scope.** I read only the files named `<page>-<width>-before|after[-fold].png`. `before/flow/` (walk-*, critique/, preferences/) was outside what I was allowed to read, so I did not open it. That leaves several states unseen: a filled basket, the add-to-basket confirmation, checkout errors and loading, and focus.

## First impression (written before reading BRIEF/DIRECTION)

- **This page communicates:** a small UK shop selling blue-and-white Portuguese patterned tiles, painted by hand, with delivery prices stated up front.
- **First three things my eye lands on (1440):** 1. the blue tile band (the lower half, highest contrast) 2. the cobalt italic headline 3. "Shop all 12 designs". At 390: headline, then button, then the top of the band. Intended order (from DIRECTION, "statement over a wall"): headline, then action, then wall. At 1440 the wall wins.
- **One word:** crisp.
- **Areas I cannot name within two seconds:**
  - Is the band a photo of real tiles, the product, or decorative wallpaper? It is flat vector, with 21 identical repeats.
  - The pale double lines between tiles read at first as a rendering seam, not grout.
  - The caption line sits right on the fold edge.

## Checks

| # | Question | Yes / No | Evidence (capture, what it shows) | Fix |
|---|---|---|---|---|
| 1 | Fits category | Yes | `after/collection-1440-after.png`: 4-up grid with name, colour, price per tile and lead time. `after/product-id-az-101-1440-after.png`: conventional buy box. | — |
| 2 | Top tasks, phone + keyboard | Partial | No account: `after/checkout-1440-after.png` has email first and "Save my details… (optional)". Size, finish, quantity: radio tiles and a stepper on the PDP. Browse: labelled filters on collection-390. **Task 1:** the basket was only captured empty, and the PDP running total has no delivery (F1). Keyboard can't be judged from renders. | F1; capture a filled basket |
| 3 | Swap test (brand layer) | Partly (caps) | With the logo swapped, cobalt, white and an italic serif fit any azulejo seller. Azul's own device (four squares, ochre corner) appears only in the logo and the story (`after/home-1440-after.png`). | Give the ochre corner one job in every view, e.g. marking "free over £150" in the delivery line |
| 4 | Reads as generated | Partly | The story's 2×2 boxes read as a feature-card grid. The cobalt numbered squares on checkout steps look like a UI kit. The hero layout (big h1 left, copy and CTA right, full-bleed band below) is a common template, saved by the product wall. | F3, F4 |
| 5 | Two different companies; first-notice things changed | Yes | `home-1440-fold-blur.png`: white and a cobalt pattern vs a beige gradient. Changed: logo, typeface, palette, hero image, announcement bar and nav case. | — |
| 6 | Memorable without copy; headline test | Yes | The blur sheet: the wall is recognisable. The h1 names what, how and where, and "Shop all 12 designs" continues it (`after/home-1440-after-fold.png`). | — |
| 7 | Typography distinctive / quiet, real scale | Yes, with a caveat | Alegreya italic display against a quiet sans. Steps seen: about 64, 40, 28, 19 and 17 px. The small text (delivery line, card captions) measures about 14 px on home-1440. | Raise small text to the stated 15 px |
| 8 | Rhythm | **No** | `after/home-1440-after.png`: the index, story and delivery chapters are all "heading left, content right", and the quote is left-only. | F3 |
| 9 | Boxes rare; one elevation model | Partly | The index and collection cards hold card-shaped content. The story puts prose in four boxes. Flat everywhere, no shadows. | F4 |
| 10 | Product shown | Yes | The hero wall; the 4×4 panel with its real size on the PDP. | — |
| 11 | Images purposeful, one treatment; image-removed test | Partly | Without the wall the first viewport loses the product, so the image does work. But sold-out tiles are faded (F5). | F5 |
| 12 | Content-free / no-shadow render | Not in my set | Blur used as a stand-in: still recognisable. No shadows exist. | — |
| 13 | Headlines only | Yes (visual) | h1, then "Four patterns, three colourways each", Star, Lattice, Bloom, Corners, "Our story" and its three quarters, then "What delivery costs". The story reads. Heading levels can't be checked from renders. | — |
| 14 | Blurred vs old / ledger | Yes vs old | `home-1440-fold-blur.png`. Ledger captures weren't provided. | — |
| 15 | One primary action; selected ≠ accent | Yes | One filled cobalt button per view: home, PDP, cart, checkout. Selected size, finish and hero design use an ink border and a check, not cobalt (`after/product-id-az-101-1440-after.png`). | — |
| 16 | States designed and rendered | **No** | Only the empty basket and empty checkout were captured. On empty checkout, "Your basket is empty" appears 3 times and "Place order" still looks enabled. The read-only "Delivery" line looks like an input (`after/checkout-1440-after.png`). | F6; capture filled, added, error and loading states |
| 17 | Colour budget, contrast, not colour alone | Yes (visual, not measured) | Mostly white, one cobalt field, ochre once per view. "Sold out" uses a word and an icon. Muted text looks dark enough. | — |
| 18 | Mobile designed | Partly | Menu and Basket buttons, stacked 48 px inputs, 2-up collection (`phone-folds.png`). But on phones the story's mark collapses into four stacked boxes, and Add to basket sits about 1.6 screens down the PDP. | F4, F8 |
| 19 | Accessibility pass | Can't judge from renders | Visible labels and "(optional)" in words (`after/checkout-390-after.png`). No focus captures. | Capture focus states |
| 20 | Performance | Can't judge from renders | — | — |
| 21 | Copy | Mostly yes | Plain and specific: "No account needed. Delivery is added before you pay, not after." The hero paragraph ends in a fragment ("and each tile slightly different") that the wall contradicts. | F2 |
| 22 | Beside the Phase 2 references | n/a | References not supplied. | — |

## Findings (ranked)

1. **Task 1 (the real cost) → the buy-box running total "1 tile: £6.50 (about 0.02 m²)" → the total shown while choosing quantity has no delivery beside it and doesn't show how far off free delivery is.**
   - Why: this breaks DIRECTION's own "Breaks if (1)", right where order value is decided. The delivery panel 300 px higher only lists general rates.
   - Fix: "60 tiles: £390.00 · UK delivery free". Below the threshold: "+ £7.95 UK delivery · £143.50 more for free delivery".
   - Capture: `after/product-id-az-101-1440-after.png`.
2. **Trust (task 5, brief problem 6) → the hero wall → 21 pixel-identical vector tiles sit under "painted by hand… each tile slightly different", so the image disproves the claim and reads as digital wallpaper.**
   - Why: the owners' first complaint was that nothing looks hand-painted. Composition can't fix what the imagery is.
   - Fix: keep "slightly different" out of the hero (the story already carries it). Get even a few phone photos of real painted tiles from the owners for the caption or story. Don't fake variation.
   - Capture: `after/home-1440-after-fold.png`.
3. **Persuasion and rhythm → home chapters 2–4 → the index, story and delivery all use "heading left, content right", and the quote is left-only.**
   - The page below the hero becomes one repeated column. In the story, the "Our story" heading sits alone above about 450 × 450 px of empty cobalt.
   - Why: the "no two adjacent chapters share a composition" rule is broken.
   - Fix: make the story full width, with the mark composition carrying its own heading inside a quarter. Make delivery a full-width strip.
   - Capture: `after/home-1440-after.png`, story at about y 1900–2500.
4. **Identity → the "quartered mark" story panel → at 1440 it reads as a 2×2 grid of feature cards. At 390 it becomes four stacked boxes in a white frame and the mark reference disappears.**
   - Why: boxes are used for prose, and the brand's one device stops being recognisable on the audience's main device.
   - Fix: keep a real 2×2 on phones (short text, statement quarter first), or draw the mark once and set the facts beside it.
   - Captures: `after/home-1440-after.png`, `after/home-390-after.png`.
5. **Choosing a design (task 3) → sold-out images are faded → Óbidos "Charcoal" shows as light grey with a pink centre, and Sintra "Indigo" as a washed lavender. The old site showed their true colours with a badge.**
   - Why: it misrepresents the glaze on a site whose principle is "show it as it will look".
   - Fix: keep full colour and mark sold out in words plus a non-opacity treatment.
   - Captures: `after/collection-1440-after.png` vs `before/collection-1440-before.png`.
6. **Checkout clarity (task 2) → the read-only "Delivery" line is drawn exactly like an input; in the empty state "Place order" looks active and "Your basket is empty" appears three times.**
   - Why: a false affordance on the one line that answers task 1, plus a submit that can only fail.
   - Fix: show delivery as text on the panel ground, not in a bordered box. Disable or hide "Place order" and keep a single empty-basket message.
   - Captures: `after/checkout-1440-after.png`, `after/checkout-390-after.png`.
7. **Memory test ("told me delivery was £7.95") → the header delivery line is about 14 px muted text and nearly vanishes in the blur sheet at 1440. On the 390 PDP the same sentence appears twice in the first viewport (header plus buy-box panel).**
   - Fix: bring it up to body size with an ochre-corner marker. On the PDP, replace the duplicate with the calculated line from F1.
   - Captures: `home-1440-fold-blur.png`, `phone-folds.png`.
8. **Buying on a phone → the PDP order: breadcrumb, title, price, delivery panel, Laid/One toggle, full-width 4×4 panel, then size and finish → Add to basket sits about 1.6 screens down and no action is visible in the first viewport.**
   - Fix: consider putting size and finish before the panel, or a compact panel on phones.
   - Capture: `after/product-id-az-101-390-after.png`.
9. **Polish.**
   - The index intro ("Star, Lattice, Bloom and Corners…") floats at x ≈ 700, aligned to nothing in the grid (`after/home-1440-after.png`).
   - Corners scans fill their cell while the others have a margin, so the right-hand column looks larger (`after/collection-1440-after.png`).
   - On phones the footer link spacing makes a very long footer (`after/home-390-after.png`).

**Remaining "no" answers:** checks 8 and 16. Checks 3, 4, 9, 11 and 18 are partial.
