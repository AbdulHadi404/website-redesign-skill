# Stem & Wren — design direction

Written 2026-10-01, before implementation. Benchmark for finish: the shop's own Instagram (as described in `social/posts.md`) — the site must look like the same shop. This must read as *this florist's* work: not a florist template, not the previous site, and not the model's default.

Product decisions live in `PRODUCT.md`; discovery in `discovery/brand-audit.md` and `discovery/domain.md`. Open questions are written as labelled assumptions (A1–A14), listed first in `REPORT.md`.

## Brief

| Route / group | Category | Frequency | Stakes | Posture | Intensity |
| --- | --- | --- | --- | --- | --- |
| `/order/` chapter 1–2 (the bouquet, wrap, card) | signature experience (configurator), mobile-first consumer | occasional (a few gifts a year per customer); arrives from the Instagram bio on a phone | money (a bouquet the shop can't make; a wrong expectation) | signature: expressive in the picture and feel, productive in controls | rethink |
| `/order/` chapter 3–5 (delivery, details, check & send) | ecommerce checkout, mobile-first | same | money, time (wrong date, address, unknown price) | productive | rethink of the flow; fields, values, events frozen |
| `/` home | marketing / local shop front | once to a few visits; Google, printed cards | none | expressive | rethink (structure and system) |

`PRODUCT.md` exists: the arrival situations and targets there are the source of the top tasks and success measures below.

**Audience and context:** people who have just fallen for a bouquet on Instagram, tapping "Order" in the bio inside Instagram's in-app browser on a phone, often buying for someone else (a birthday, Mum), sometimes for today. They are not florists and don't know what's in season or what things cost.

**Top tasks** (ranked; evidence from the README's customer messages and the owner's brief — not confirmed by the owner, so *assumption A1*):
1. See what my bouquet will look like before I order (README: "most common, several a day"; owner: "make their own bouquet… and actually enjoy it").
2. Know the full price as I go, not at the end (README: "I only found out the price at the very end").
3. Only choose stems the shop can actually get (README: "I picked peonies in October and then you rang me").
4. Get it to someone, quickly, from a phone — and know if today is possible (README: "The form is so long on my phone"; owner: "most orders come from Instagram on phones"; post 8: same-day rule).
5. Share or come back to a bouquet (owner: "something they'd want to play with and share").

**Problems** (severity 0–4 × task importance; traced to the audit below):
1. (4 × T1) No preview of any kind; the bouquet exists only as three dropdowns and free-text colours.
2. (4 × T4) Phones get the desktop page zoomed out to 1101 px (`<meta viewport width=1100>`); text renders ~5 px tall; every field is placeholder-only.
3. (4 × T3) Every stem is orderable in every month, including out-of-stock sweet peas; colours are free text.
4. (3 × T2) The price appears only in a `confirm()` at the very end; delivery zones invisible; postcodes typed without a space never match a zone (`split(' ')[0]` on "LS176AB"), so delivery is silently priced at £0.
5. (3 × T4) Size is a separate choice that can contradict the stem count; errors are a single `alert()` with no field named.
6. (3, brand) The site doesn't look like the shop: a pink-to-violet gradient, a script face that never loads, emoji, unverifiable testimonials.

**Principles** (each can say no):
1. **The bouquet is the page.** On `/order/` the customer's own bouquet is the largest thing on screen and stays in view in every chapter on a phone — never a form with a thumbnail.
2. **Only what the shop can make.** Out-of-season and out-of-stock stems are shown, resting, with when they're back — never selectable. (A reasonable team would show everything and fix it by phone, as now.)
3. **No price surprises.** The running total is always on screen; delivery joins it the moment the postcode is known; nothing appears at the end that wasn't shown before.
4. **Her materials, not a florist template.** Sage linen, kraft, twine, handwritten tags and the flowers' own colours carry the brand. No gradients, no emoji, no "lovingly handcrafted".
5. **Contract over pattern.** The order payload, its values and the analytics events keep their shape; where a better pattern wants a different field, the interface changes, not the payload.

**Non-goals:** accounts; online payment (no payment field in the contract); a fixed-bouquet catalogue; collection from the shop (no contract field — *A12*); new photography (the photos are on the owner's phone — *A9*); a new logo (proposal only); a CMS; changing `data/*.json`.

**Constraints:** static HTML/CSS/JS, no build step, no framework, no dependencies; `data/flowers.json` is exported daily and never edited by hand; `POST /api/order` JSON contract and `window.swTrack` events (README); `/order/` must keep working (Instagram bio, printed cards); anchors `#occasions` and `#about`; legal line "© 2019 Stem & Wren. All rights reserved." kept; WCAG 2.2 AA; performance on a phone over 4G inside Instagram's in-app browser: LCP ≤ 2.5 s, CLS ≤ 0.1, the builder usable without waiting for anything but its own small scripts; fonts self-hosted (the old Google Fonts request fails in the test browser with a certificate error and leaks visitor IPs to Google); English only; UK time for the 13:00 cut-off.

**Success measures** (baseline: the shop's `swTrack` data, which the owner holds; none in the repo):
- Order completion: `order_success` ÷ `order_start` on `/order/` — up from the current baseline.
- `order_error` by field — down, and `stems`/`size` errors near zero (size can no longer contradict the count).
- Phone calls to swap out-of-season or out-of-stock stems — zero (owner's count).
- "Can I see what it'll look like?" messages — down (owner's count).
- Shares of a bouquet link — new; needs one analytics event the owner must approve (*A14*).
- Phone performance: LCP ≤ 2.5 s, CLS ≤ 0.1 (perf.mjs, old vs new).

## Audit

**What the company sells, to whom:** hand-tied bouquets, built to order from a list of twelve stems, delivered across Leeds (same day to LS6, LS7, LS8, LS17 if ordered by 1pm) from a shop at 14 Harrogate Road, Chapel Allerton — to people buying flowers for someone, mostly found through Instagram.

**The one thing a visitor should be able to do:** make a bouquet they love, see it, know what it costs and when it can arrive, and send it in a few minutes on a phone.

**Real proof that exists:** the shop's address; the delivery zones, prices and same-day rule (`data/delivery.json`); every stem's price, season and stock (`data/flowers.json`); hand-written cards (post 4); the nine posts' captions. No verifiable testimonials (*A8*), no ratings, no press.

**Brand assets sampled:** logo (`palette.mjs --from assets/logo.svg`): `#d6336c` 40% (rose), `#2b8a3e` 40% (stem), `#a61e4d` 20% — Open Color pink 7, green 9, pink 9, i.e. framework defaults on bought clip art (2017). Wordmark: "Stem & Wren" set in Great Vibes (a formal copperplate script) as live SVG text, so it renders in whatever font the device has (Times-like serif in our captures). Brand family: no sibling sites; the Instagram account is the brand in practice — sage linen backdrop, kraft, jute twine, kraft tags in handwriting, white tissue, a hat box, a dark green shop door with a brass 14 (`discovery/brand-audit.md`). The photographs themselves were not available, so the sage was set from the description and drawn, not sampled (*A9*).

**Measured baseline** (`audit/before-home`, `audit/before-order`, `audit/before-a11y-order`, `captures/before`, `captures/states/*-before`):
- Phone: layout viewport widened to 1101 px — the page loads zoomed out on every phone; horizontal overflow 1 px.
- Fonts: Poppins and Great Vibes never load (request fails, `ERR_CERT_AUTHORITY_INVALID`); everything renders in fallbacks. 10 type sizes on the home page; heading sizes inverted (h3 36 px > h2 24 px); 100% of text centred.
- `/order/`: 47 a11y FAILs — 6 unnamed selects (axe critical), 12 placeholder-only fields, 21 contrast failures (`#999` on `#efefef` = 2.47:1, `#bbb` hint at 11 px = 1.92:1), field borders 1.01–1.16:1, reflow failure at 320 px, no `lang`, no `main`, no skip link; wrong keyboards for email and phone; no `autocomplete`.
- States: an empty submit changes nothing on screen (an `alert()` only); a server error is an `alert()`; success replaces the form with "Thank you! Order SW-…", no total, no summary.
- Payload recorded (`captures/states/requests/before/sent-phone-before.json`): keys `size, stems[{id, colour, count}], wrap, ribbon, card_message, delivery_date, delivery_postcode, recipient_name, recipient_address, sender_name, sender_email, sender_phone`, in that order; `count` a number; `delivery_date` as typed ("DD/MM/YYYY" placeholder).
- LCP 350–390 ms locally (an `h1`); CLS 0–0.025; ~12 KB total transfer (no fonts loaded).
- What already works (keep): native `<select>`, `<input>`, `<textarea>` and `<button type=submit>`; `<fieldset>` + `<legend>` per section; DOM order matches visual order; no motion beyond a testimonial fade.

**Must be preserved (functionality and truth):**
- Routes / anchors: `/`, `/order/` (Instagram bio, printed cards), `/#occasions`, `/#about`.
- Ids, fields and hooks: `form#order`; field names `size, card_message, delivery_date, delivery_postcode, recipient_name, recipient_address, sender_name, sender_email, sender_phone, wrap, ribbon` (and `#wrap`, `#ribbon`); `window.swTrack` stub in `assets/site.js`.
- Server contract: `POST /api/order`, JSON, the keys above in that order; `size` ∈ {Petite, Classic, Grand}; `stems` as `{id, colour, count}`; `wrap` and `ribbon` ids; response `{order, total}`.
- Analytics: `order_start` (on load of `/order/`), `order_submit`, `order_error` `{field}` with payload key names, `order_success` `{order, total}`.
- Legal and facts: "© 2019 Stem & Wren. All rights reserved."; Privacy and Terms links (they point to `#` today — *A13*); "14 Harrogate Road, Chapel Allerton, Leeds"; "free card with every order"; "same day delivery available".

**Why the current design fails** (severity): see Problems 1–6 in the Brief. In the customer's words: "the website doesn't look like the same shop", "the form is so long on my phone".

**The five things a stranger notices first** (old site):
1. Hot-pink script headings ("Welcome to Stem & Wren", 96 px Great Vibes — rendering as a fallback serif).
2. A full-viewport pink-to-violet gradient hero with centred copy and a glowing pill button ("Shop Now ✨").
3. Emoji everywhere: the 🌸 top bar, 🌷🚚💝 feature cards, "Place Order 💐".
4. No imagery at all: three icon cards and five gradient "occasion" tiles (pink, violet, red, lime, orange) that link nowhere.
5. Poppins with tracked uppercase nav and pink gradient pill buttons; a grey-on-white form of dropdowns.

All five change. **Kept, and why:** the name "Stem & Wren" and the stem-and-bloom motif of the 2017 mark (its only meaningful parts — `discovery.md` §2.5); the green of the stem survives as the family of the action colour (the shop door). The pink does not survive as UI colour: it is Open Color's default, and the owner's customers say the site doesn't look like her shop. Pink lives on only where it's true — in the pink and blush stems themselves.

## References

Live websites could not be loaded from this environment (only GitHub, npm, PyPI and Google Fonts are reachable: florist, configurator and GOV.UK sites all timed out). One reference was read from source; the rest are recalled from knowledge and marked so — none was inspected for this job.

| Reference | Problem it solves | Taken (as a principle) | Deliberately not taken |
| --- | --- | --- | --- |
| GOV.UK Design System — date input, addresses (read from `alphagov/govuk-design-system` source) | a first-time form that feels short; accepting messy postcodes | accept postcodes in any case, with or without spaces and stray punctuation; one textarea for an address when the parts aren't needed; the date input is for *memorable* dates — a delivery day is not one, so offer days to tap instead | the three-field date input; GOV.UK's zero-brand look |
| Food and grocery delivery apps — Deliveroo, Ocado slot pickers (recalled) | "when can it arrive?" on a phone | the next few days as tappable chips, today only when it's true, the cut-off said beside it | slot grids and fees per slot |
| Character creators and toy builders — Picrew-style makers, Townscaper (recalled) | something people play with and share | a real, finished default; every tap changes the picture within 100 ms; a "re-roll" that is safe to press; the result saved as a picture to post | game layers (points, unlocks), sound |
| Made-to-order configurators — Nike By You, ring builders (recalled) | configure a made-to-order product | one evolving picture of *their* object; options shown as pictures on that object; price beside every option | 3D/realism (an illustrated flat lay fits a brand that shoots from above); multi-page steppers |
| Baymard checkout research (recalled, `categories.md`) | price surprises, long checkout | total including delivery visible before the last step; review step restating everything; labels above; `autocomplete` everywhere | coupon fields, accounts |
| Contrary: florist template sites (the old site; recalled) | — | nothing: it is the page this category ships | pink script hero, occasion tiles, testimonial carousel |

## Direction

**Concept** — **"Her table, from above."** The site is the shop's worktable photographed the way she photographs everything: sage linen in window light, kraft, twine, single stems with handwritten tags — and the customer's bouquet comes together on it, stem by stem, as in her "25 stems in 60 seconds" reel. Surfaces are linen and paper; type is a plain, sturdy sans with her handwriting for names and cards; imagery is a drawn flat lay of real stems in their real colours; motion is a stem landing on the bouquet.

**Experiential quality bar** (the owner's words): "people… make their own bouquet on the site and actually enjoy it — something they'd want to play with and share… lovely on a phone." Tests: the first tap changes the picture; someone would screenshot their bouquet; the picture looks like her Instagram, not like a form.

**Candidates considered:**
1. *Her table, from above* (textile + paper: the sage-linen flat lay, tags, kraft) — **chosen**: it is literally her photo set, it makes the builder's output look like her posts (shareable), and it answers "doesn't look like the same shop".
2. *The green door* (painted wood + brass: the shop front at dusk, deep green fields, brass numerals, sign-painter lettering) — strong and local, but it is a place, and most customers never visit; its green survives as the action colour.
3. *Twelve tags* (paper + handwriting: post 9's flat lay of twelve labelled stems, "Which one are you?") — a great selector but not a whole site; it became the stem tray inside concept 1, which is the same table.
4. *Stem by stem* (motion/time: the reel; the build as a time-lapse) — the right *feel* for the builder, the wrong concept for a page; kept as the one signature motion.
5. *Pick & mix Saturday* (galvanised buckets on a pavement) — playful but sells tulips four months a year; reads as a market stall.

**Refuses:** the florist template (pink script hero, gradient "shop by occasion" tiles, a testimonial carousel, "lovingly handcrafted") — *and* its predictable opposite, the artisan-craft recipe (cream paper, a serif display with an italic word, terracotta, mono labels) that this skill and the model drift to for craft brands. Sage appears only because it is her backdrop, as a cloth texture, never as a flat "sage" wash on cream.

**Content priority:**
- `/order/`, chapter 1 (phone): 1. their bouquet, large, on linen · 2. the stems to tap, with price per stem · 3. running total, stem count and size · one step away: the list of what's in it (with − / +), re-tie, share, start-from.
- `/order/`, chapters 3–5: 1. the question in front of them (postcode, day, names) · 2. the running total including delivery · 3. a small picture of their bouquet in the bar · one step away: the zone list.
- Home: 1. what this is — hand-tied flowers from Chapel Allerton, make your own — and the button · 2. a bouquet, drawn on her linen · 3. what's in season this month · then: hand-written cards (occasions), delivery and same-day, the shop.

**Interaction** (`interactive.md` §1–§2):
- Value test. *Swap:* the best static equivalent is a photo per stem and a form; the visitor would lose seeing *their* combination, colours and wrap together — the README's most common question. *Result:* a bouquet they made, a price, a picture and link to share, and an order ready to send. *First ten seconds:* the page opens on a finished in-season bouquet; tapping any stem adds it to the picture at once. *Tenth time:* the tray is one row; no animation blocks the next tap. *Cost:* DOM + inline SVG, ~40 KB of our own JS, no libraries. *Evidence plan:* `order_start` → `order_success` rate against the old baseline; a share event if the owner approves (*A14*).
- Levels: the bouquet stage is level 3–4 (a manipulable picture of *their* result, re-tie, share in the URL); chrome and form chapters level 2; the home page level 2 with one level-3 element (the in-season stems, each linking into the builder with that stem added).
- Fidelity: **illustrated** — a drawn flat lay seen from above, flowers built from their real shapes and the data's colour names; matches a brand that shoots from above, and the skill's own lesson (an illustrated builder beat a realistic 3D one). Labelled as an illustration.
- Renderer: **DOM + inline SVG** — at most 25 heads plus foliage (a few hundred shapes), text stays in the DOM, accessible for free, instant first frame, works where WebGL fails. No canvas except to export the share picture.

**Key screen:** `/order/` chapter 1 at 390 × 844 — the stage with the default bouquet and the stem tray — then 1440 × 900. Review result: see "Key-screen review" at the end of this file.

**First viewport, exactly:**
- `/order/` at 390 × 844: sticky bar 56 px (wordmark "Stem & Wren" in her hand, left, linking home; the total "£34.70" right). The linen stage, full width, ~48svh: the bouquet lying slightly diagonal, heads top, kraft wrap and twine bow, stem ends cut at the bottom; a paper label bottom-left reads "Classic · 12 stems"; a quiet "Re-tie" button top-right. Below, the paper tray: heading "Pick your stems", then one sideways row of stem cards (drawing, kraft tag with the name in her hand, "£4.50 a stem", colour swatches, a count when in the bouquet). Bottom bar 72 px: "Classic · 12 stems / £34.70" left, the primary button "Next: wrap & card" right — the only primary action on screen.
- Home at 390 × 844: header (wordmark, "Make a bouquet" as a secondary button, Menu); the headline "Make your own bouquet. Hand-tied in Chapel Allerton." in ink on the linen; the drawn bouquet; the primary button "Make your bouquet" in the thumb zone.
- Home at 1440 × 900: full-bleed linen; the headline and a two-line lede in the left third, set directly on the linen at display size; the bouquet lying diagonally across the centre-right, large (≈ 640 px tall), its kraft tag carrying "Peach season" in her hand; the primary button under the lede. Not a copy/panel split: there is no panel, the object lies on the same cloth as the words.

**Productive surfaces** (chapters 3–5 and the builder's chrome):
- Interaction model: candidates — (a) the old single long form; (b) one question per page (GOV.UK); (c) a few chapters named after decisions, inside one route, with the bouquet bar pinned. (a) is what customers call "so long"; (b) adds a dozen page loads on a slow in-app browser and loses the picture; **(c) chosen**: five chapters — Flowers · Wrap & card · Delivery · You & them · Check & send — each a `<fieldset>` of the one `form#order`, one visible at a time, Back always keeps every answer, the browser back gesture moves between chapters.
- Brand layer: the action colour (door green), the ink, paper, her handwriting only for names and cards, the wordmark. Not carried into the forms: the linen texture (it stays on the stage), display sizes, the handwriting face for labels.
- Navigation: a named chapter list at the top of the form (links to earlier chapters only); the sticky bar shows the bouquet thumbnail and total on chapters 3–5; Back / Next in the bottom bar.
- Density: mobile-first consumer — body 17 px, inputs 48 px, targets ≥ 44 px; one column; fold budget at 390 × 844: header 56 + bottom bar 72.
- State language: plain sentences in her voice ("We don't deliver to LS29 yet."; "Dahlias finish in October."); errors say what to do.
- What users have learned that stays: the order link, the field order inside "delivery" and "your details", the size names.
- Brand moments: the first view of the default bouquet; the success screen ("Order SW-01234 is in. The card will be written by hand."); the share picture.

**Breaks if:** (1) the bouquet ever leaves the screen while the customer is choosing stems or the wrap on a phone; (2) a stem can be ordered for a date it isn't available, or a price appears that wasn't on screen before; (3) the site could be mistaken for any florist's — pink, script headings, a photo-less tile grid or cream-and-serif.

**Memory test:** "You make the bouquet on her green cloth and it looks like her Instagram — and it tells you peonies are back in May."

**Convergence checks:**
- Similar-brief test — the same plan for another florist would be: a "build your bouquet" stepper with product photos of stems on white and a basket. Ours depends on *this* shop's backdrop, wraps, tags and stem list; a different florist's materials would produce a different table.
- Category test — guessable from "florist": pink, script, photos of bouquets on white. From "florist + avoid the obvious": cream, serif italic, terracotta. Neither is this: a green cloth field, a sturdy grotesk, a drawn flat lay.
- Second-order test — the green ground is not chosen as "not pink"; it is the backdrop in posts 1, 3 and 6. The grotesk is not "not a serif"; it is chosen for tabular prices, narrow phone measure and 19 KB. The handwriting is the brand's own practice ("hand-written" in the bio, post 4, post 9).
- Ledger — in one sentence: *sage-linen textured field (Committed) · Familjen Grotesk 700 headlines, Kalam handwriting for names and the wordmark · no caps label device (sentence-case labels; handwritten kraft tags) · no dark chapters (one door-green footer) · door-green action, flowers as the only accents.* Against the ledger as a set (five Restrained, white or near-white grounds, blue-family actions, Atkinson twice; split and wall heroes): different strategy, ground, action hue family, faces and hero form. Blurred tile beside the ledger captures: `captures/direction/ledger-blur.png` — the only green field on the sheet.
- Seam test: not applicable — the builder *is* the product; the home page hands over by showing the same drawn bouquet that `/order/` opens on.

## Typography

- **Sets.** Expressive (home): 17 px base, ratio 1.25 steps used: 14 · 17 · 21 · 26 · 33 · 41 · 52 · 64 px; display clamps keep max ≤ 2.5 × min. Productive (`/order/` chrome and chapters): 17 px body, 15 px hints, 14 px small labels, 20 px chapter heading, 24 px page heading on phones (28 on desktop), 17 px inputs (≥ 16 px so iOS does not zoom).
- **Display and text:** **Familjen Grotesk** (OFL, Google Fonts, self-hosted latin subset, variable 400–700, 19 KB) for everything set in type: headlines at 700, tracking −0.01 em at display sizes, line-height 1.05–1.1; body 400, 1.5; prices with tabular figures (default in this face — `fonts.mjs --google`). Why: sturdy, plain-spoken, slightly quirky grotesk; narrow enough for a 390 px measure; tabular by default for prices; not on the saturated list; not a serif (the craft-brand prior).
- **Handwriting:** **Kalam** 400 (OFL, Google Fonts, latin subset, 22 KB) for one job: names the shop would write by hand — the wordmark, the kraft tags on stems, the card preview, the size label on the stage. Why: the old wordmark was a script; the brand's practice is handwriting ("Hand-tied, hand-written", post 4, post 9); Kalam reads as a felt pen and stays legible at 18 px. Never for prices, instructions or body text. Chosen over Nanum Pen Script (narrower, less legible small), Reenie Beanie (scrawl), Caveat (ubiquitous) and Gochi Hand (cartoonish) from the style tile `captures/direction/style-tile.png`.
- **Monospace:** none. `code, kbd, samp, pre` inherit Familjen Grotesk.
- **Caps/tracked-label device:** none. Labels are sentence case at 600.
- **Scripts and languages:** English only; `lang="en-GB"`.
- **Licence, source, loading:** both OFL, from Google Fonts' latin subsets, committed to `assets/fonts/`, `font-display: swap`, Familjen preloaded on both pages, Kalam preloaded on `/order/` only; total 41 KB.

## Colour

**Strategy: Committed.** Her sage linen carries 40–60% of the expressive surfaces (the home's first chapters, the builder's stage); paper surfaces carry the controls; one door-green action colour; the flowers supply every other colour as content. Why not Restrained: the brand's identity in her photos *is* a field of colour (the cloth), and the last five ledger outputs were all Restrained on white.

**Harmony and sources:** dominant sage (posts 1, 3, 6 backdrop); supporting kraft (wraps, tags, twine — posts 1, 4, 9); action door green (post 2, and the logo's stem green family `#2b8a3e` darkened); accents are the stems' own colours from `flowers.json` names. Split around green: sage (dominant), kraft orange-brown (support), flower pinks/peaches (accents).

**Use scene:** light — a phone in daylight or a lit room, scrolling Instagram; no dark theme (the photos and the cloth are daylight; the site follows no OS theme, and `color-scheme: light` is declared so form controls match).

**Scales:** sage `#8ea283` (ground) with its linen texture (lightness varies ±8% in the folds) and `#7b9070` for its rule lines; neutrals tinted green: paper `#f3f5ef`, paper-2 `#e6eadf`, line `#6b786e`, muted `#5c6a60`, ink-2 `#3d4b41`, ink `#18261d`; action `#1e3a2b`, hover `#2c5140`; kraft `#c9a77c`, kraft-dark `#8a6a45`; danger `#a3261f` (errors only); no success hue — confirmations are words. Flower colours are a separate illustration palette in `assets/bouquet-art.js`, never used for UI.

**Contrast table** (`contrast.mjs`; WCAG ratio / APCA Lc):

| Token (role) | Value | Use | Pairs measured |
| --- | --- | --- | --- |
| linen (surface, expressive) | `#8ea283` + texture | home chapters, builder stage | ink on linen 5.73:1 / Lc 47.6 → **headlines and ≥ 24 px only**; no body text on linen (it sits on paper labels) |
| paper / paper-2 (surface) | `#f3f5ef` / `#e6eadf` | panels, tray, forms, bars | ink 14.33 / 96; ink-2 8.38 / 85 (7.54 on paper-2); muted 5.19 / 72 (4.67 on paper-2) |
| ink / ink-2 / muted (text) | `#18261d` / `#3d4b41` / `#5c6a60` | text strong / body secondary / hints | as above; muted only ≥ 15 px |
| line (border, interactive) | `#6b786e` | input and swatch borders | 4.21:1 on paper, 3.79:1 on paper-2 (≥ 3:1, 1.4.11) |
| action / action-hover | `#1e3a2b` / `#2c5140` | primary buttons only, selected-radio ring | white on action 12.39 / −102; action on linen 4.51:1 and on paper 11.28:1 as a shape |
| kraft (tags) | `#c9a77c` | stem tags, the size label | ink on kraft 6.97 / 56 — tags carry names at ≥ 18 px only |
| danger | `#a3261f` | error text and the error mark | 6.70:1 on paper, 6.03:1 on paper-2 |
| selected | border 2 px action + check mark | chosen swatch, wrap, day | neutral fill, not accent |
| focus ring | ink `#18261d` 3 px, offset 2 px; `#f3f5ef` on the action-green footer | every focusable | 5.73:1 on linen, 14.33:1 on paper, 6.97:1 on kraft, 11.3:1 (paper on action) |

## Layout and space

Spacing scale 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96. Home: a 12-column container, max 1200 px, 24 px gutters (16 on phones); chapters separated by a change of ground (linen → paper → linen → action-green footer) because each does a different job. `/order/`: phone — one column, stage then paper panel; ≥ 1024 px — two columns, the stage sticky on the left (≈ 58%), chapters scrolling on the right (max 520 px), bottom bar within the right column. Cards exist only for independent objects: stem cards in the tray, wrap options, day chips. Radii: 6 px controls, 12 px panels, 999 px only for small chips and the primary button.

## Imagery and graphics

**Illustration, drawn for this shop** (no photographs available — *A9*). A flat lay seen from above: every stem drawn procedurally from its real shape (rose spiral, garden-rose cup, peony ruffle, ranunculus rings, dahlia points, tulip cup, lisianthus, sweet pea, chrysanthemum, eucalyptus coins, pittosporum, gypsophila cloud), in the data's colour names; four wraps and four ribbons from `wraps.json`; one light from the top left (the window), one soft shadow. Line style: filled shapes with a slightly darker edge, no outlines in black. A drawn shop door (green, brass 14) on the home page's shop chapter. When the owner's photographs arrive, they go in the home page's season and shop chapters (slots are designed so a photo can replace a drawing), never under copy. Credits: all drawn here; fonts OFL.

## Motion

Productive tokens from `motion.md` §4 (`--dur-micro` 100, `--dur-small` 150, `--dur-medium` 240, `--dur-large` 300) with `--ease-out`; the builder's stage uses `--spring-productive` (320 ms) for stems settling. Never moves: chapters (instant, focus to the heading), prices, form controls beyond a 100 ms colour change, anything keyboard-triggered beyond the stage itself. Concept moves: (1) a stem lands — the new head fades and grows from 0.92 while the rest glide to their new places; (2) re-tie — every head glides to a new arrangement; (3) the wrap changes — the new wrap crossfades. Home → builder: a cross-document view transition on the bouquet was planned and **not built**: the builder's stage is drawn after its data loads, so there is nothing to morph into at navigation time; the home page and the builder open on the same drawing instead (follow-up in `REPORT.md`). Under reduced motion everything is instant.

Rows for `/order/` (phone):

| id | trigger | on | target | properties | duration | easing | reduced |
| --- | --- | --- | --- | --- | --- | --- | --- |
| stem-lands | click | [data-add="rose"] | #stage .head.is-new > .head-art | scale, opacity | medium | out | instant |
| retie | click | #retie | #stage .bq-heads > .head | transform | 320 | --spring-productive | instant |

The wrap crossfade has its own JSON spec (`qa/motion-order-wrap.json`) because it needs setup steps (go to chapter 2).

## Interaction and performance

- **Primary action per key screen:** `/order/` — one door-green button in the bottom bar, its label continuing the sentence: "Next: wrap & card", "Next: delivery", "Next: you & them", "Check your order", "Send order · £46.65". Home — "Make your bouquet" (hero), header "Make a bouquet" secondary while the hero button is on screen.
- **Components and states:** stem card (rest, hover on fine pointers, pressed, in-bouquet with count, resting/unavailable with reason, at-limit), colour swatch radio (rest, checked, focus), stepper (rest, at 0 → line removed with status message, at 25 total → + inactive with reason), wrap/ribbon radio card, day chip radio (today / available / conflicts-with-season / disabled), postcode field (empty, zone found, outside area, malformed), text fields (rest, focus, invalid + message), bottom bar (enabled, explaining why not yet), send button (idle, sending, failed), success panel, network error panel.
- **Forms:** all old fields kept; labels above; validate when Next is pressed, then live; required by default, "(optional)" on the card message; error summary when three or more errors, else focus the first invalid field; `autocomplete` map below.
- **Targets and thumb zone:** primary action bottom-right in a sticky bar; every target ≥ 44 × 44 on touch; swatches 32 px drawn inside 44 px hit areas.
- **Performance budget:** no third parties; fonts 41 KB; linen texture 6 KB; JS ≤ 60 KB uncompressed for `/order/`; LCP element on `/order/` is the stage SVG (inline, rendered by script after data fetch — the HTML carries the size label and heading so text paints first); on home the headline.

## Accessibility

Filled before any code (`accessibility.md` §2). WCAG 2.2 AA; aiming for 2.4.13 and 2.3.3.

- **Contrast table:** above, in Colour. Non-text: input and swatch borders `#6b786e` 4.21:1 on paper; selected swatch ring action green 11.3:1 on paper; primary button `#1e3a2b` on linen 4.51:1 and on paper 11.28:1; stage stems are illustration (not information) — every stem's identity is also in text (the tray and the list).
- **Focus token:** 3 px solid ink, 2 px offset, on every surface; paper-coloured on the action-green footer; `outline` (never box-shadow), `Highlight` in forced colours. Sticky UI: header 56 px, bottom bar 72 px → `scroll-padding-top: 72px; scroll-padding-bottom: 88px`.
- **Targets:** 24 px floor; 44 px on coarse pointers (swatches drawn 32 px with a 44 px hit area; steppers 44 px).
- **320 px state:** the tray stays one sideways row (its own labelled scroll region, focusable); the chapter list wraps to two lines; the bottom bar stacks the total above the button below 360 px; day chips wrap; nothing scrolls the page sideways.
- **Colour independence:** selected = border + check mark; unavailable = "Back in May" / "None today" in words; errors = text + icon + border; the size is a word; links in text underlined.
- **Motion:** the three moves → instant under reduce; no auto-moving content anywhere (the old testimonial rotator is removed).
- **Forced colours:** controls keep 1 px transparent borders; selected states drawn with a border and check mark; the stage SVG is an image (`forced-color-adjust: none` on the stage only, so the flowers keep their colours on their own linen ground).
- **Component map:** stem add → `<button>` named "Add a garden rose, peach — £4.50"; colours → radio group in a `fieldset` per stem; bouquet list → `ul` with − / + `<button>`s named "One fewer peach garden rose" / "One more peach garden rose"; tray → `section` with an `h2` and a focusable scroll region; chapters → `fieldset`s with `legend`, one shown, the rest `hidden`; chapter list → `nav` + `ol` with `aria-current="step"`; wraps, ribbons, days → native radios; postcode → text input; date → day radios + `<input type="date">`; share → `<button>`; stage → `role="img"` with an `aria-label` written from the model ("Illustration of your bouquet: 5 peach garden roses, 4 white lisianthus, 3 eucalyptus, in kraft paper with jute twine"); home menu → disclosure button + list.
- **Forms:** error pattern per `accessibility.md` §6; required by default, "(optional)" marked; autocomplete: recipient name `section-recipient shipping name`, address `section-recipient shipping street-address`, postcode `section-recipient shipping postal-code`, sender `name`, `email` (type email), `tel` (type tel); paste allowed; `spellcheck="false"` on email and postcode.
- **Announcements:** one polite `role="status"` region in the builder present at load: "Garden rose added. 13 stems, Classic. £39.20."; the total line in the bar is not live (the status says it); errors move focus (summary or field); send failures use `role="alert"`; chapter change → focus the chapter heading and update `document.title`.
- **Data:** none (no charts). The delivery zones are a real `<table>` with a caption.
- **Preserved features:** native controls, fieldsets with legends, DOM order = visual order. Added: `lang`, `main`, skip link, labels, autocomplete, keyboards.

## Page narrative (home)

Headline test: **"Make your own bouquet. Hand-tied in Chapel Allerton."** — a stranger knows it's a florist where you choose the flowers, made by hand in a real place (the bio's own words: "Hand-tied, hand-written, delivered"; not "I'll tie it", which would claim the owner ties every order herself). Sub-line: "Hand-tied flowers from Chapel Allerton, Leeds, delivered across the city — same day to LS6, LS7, LS8 and LS17 if you order by 1pm."

1. **Hero on linen** — the drawn bouquet (the builder's default, same picture) and the button. Why: the product is the toy; showing it is better than describing it.
2. **In season now** (paper) — post 9 as a page: the twelve stems laid in a row with kraft tags; in-season ones link into the builder with that stem added; resting ones say when they're back. Why: it's live data, it answers the October-peonies problem before it happens, and it's the most-liked post's composition. Composition: a sideways flat lay, not a card grid.
3. **Occasions — the hand-written card** (linen; `#occasions`) — a drawn card reading "for Mum x" (post 4), her caption quoted, the occasions people send for, "free with every order". Why: occasions matter only through the card; the old tiles linked nowhere.
4. **Delivery** (paper) — a zones table from `delivery.json`: districts, price, same-day. Why: the most-asked logistics question, answered with real numbers.
5. **The shop** (`#about`, linen) — the drawn green door with brass 14, the address, Instagram. Why: real place, real proof.
6. **Footer** (action green) — wordmark, address, © line, Privacy, Terms.

## Keep / replace / remove / create

**Keep:** the name; the stem-and-bloom motif (in the drawn stems); routes `/`, `/order/`; anchors `#occasions`, `#about`; `form#order` and field names; the payload and events; the legal line; the address; the size names; the stem list, prices, seasons, zones (data, untouched).
**Replace:** fonts (Poppins, Great Vibes → Familjen Grotesk, Kalam); palette (Open Color pink → linen, paper, door green); the hero (gradient + welcome → the bouquet on linen); nav (uppercase + pill → sentence case, disclosure on phones); footer; the order form (one long form → five chapters around a live picture); the viewport meta; the success and error states; metadata and social image.
**Remove:** the emoji top bar (its two claims kept: "free card with every order" in the hero and card chapter, "same day" in the hero and delivery chapter); emoji feature cards ("Fresh Flowers", "Fast Delivery", "Made With Love" — puffery with no source); gradient occasion tiles (the occasions survive as words in `#occasions`); the testimonial carousel and its three quotes — "Absolutely stunning flowers, would recommend to anyone!" (Sarah), "Best florist in Leeds, amazing service!" (James), "The flowers lasted for weeks, so beautiful!" (Emma) — unverifiable, *A8*; "passionate team of florists… expert florists" copy (no source for a team); `alert()`/`confirm()`; the Google Fonts request; the old form's own fields `flower1–3`, `colour1–3`, `count1–3` and `#flower-rows` (inputs of the old script, never sent to the server: the server receives `stems`, unchanged).
**Create:** the bouquet model module; the illustrated bouquet renderer and stem drawings; the stem tray; chapters, day chips, postcode zone lookup; the review step; the share picture and link; the saved draft; the in-season chapter; the delivery table; the shop door drawing; favicon and social image; `qa/` tests.

Keep (11 items) is shorter than replace (9) + create (13) = 22.

## Secondary pages

None exist besides `/` and `/order/`. A `404.html` is not added (hosting unknown).

## Key-screen review (Phase 5, before rolling out)

Screen: `/order/` chapter 1 with the default bouquet. Captures: `captures/key/order-390-key-fold.png`, `order-1440-key-fold.png`, `order-1280-key-1280x800-fold.png`, `order-390-key-no-text.png`, `blur-ledger.png`; after fixes `order-390-key-after-fixes.png`.

Reviewer: **no fresh-context reviewer was available** in this run (no subagent tool; a remote session could not see these files). Fallback per `visual-qa.md` "Critique": the blurred sheet and the no-text render were built first and the first impression written from them alone, before re-reading this file.

First impression (from the blur and no-text renders only): "A bouquet lying on green cloth, a row of single flowers to pick from beside it, one dark button." Eye order: the peach bouquet → the dark green button bottom-right → the stem row (intended: bouquet → stems → action; acceptable, the action is where the thumb is). One word: *handmade*. Not nameable in two seconds: the chapter row and the two pills on the stage.

| # | Check | Answer | Evidence |
| --- | --- | --- | --- |
| 1 | Surface appropriate | yes | stage expressive, controls at mobile dials: 17 px body, 44 px steppers and swatch hit areas, one column (`order-390-key-fold.png`) |
| 3 | Swap test (brand layer) | yes | linen backdrop, kraft tags in handwriting and the flat lay of *her* stems are hers; another florist's name on this would describe her shop (`order-1440-key-fold.png`) |
| 4 | Reads as generated? | partial → fixed | the primary button was a pill: the old site's pink pill survived as a shape (first-notice thing 5). Now a 10 px radius; pills kept only on small tools (purpose-gated) |
| 6 | First viewport memorable without copy | yes | the no-text render is still unmistakably this bouquet on this cloth (`order-390-key-no-text.png`) |
| 7 | Type distinctive where it should be, quiet elsewhere | partial → fixed | Kalam only on tags, wordmark, size label; but the panel used 8 sizes; 13 px merged into 14, leaving 14 · 15 · 17 · 20 · 24 (+ 16/18 handwriting) |
| 15 | One primary action; selected ≠ accent | partial → fixed | one primary (Next); selected swatches used the action green — now ink |
| 17 | Colour budget; contrast; no colour-only meaning | yes | linen ≈ 50% of the 390 fold; resting stems are grey *and* say "Back in May" |
| 25 | Fold at 1280 × 800 | yes | stage, two rows of stems and the action bar above the fold; header 56 px (`order-1280-key-1280x800-fold.png`) |

Also fixed: the tray showed exactly three cards on a 390 phone with no sign it scrolls (cards narrowed to 104 px so a fourth peeks in); "5 in your bouquet" was said twice per card; the top eucalyptus stood bolt upright (sprigs now lean). An absolutely positioned hidden legend inside the tray widened the phone layout to 1058 px (found by probe, fixed with a positioned scroller).

Result: the direction holds; roll out.


## Verification record (Phase 6)

**Figures computed from data** (`parity.mjs --derived`): every price on the site is read from `data/*.json` at runtime. Line and running totals are computed, e.g. the default bouquet: 5 peach garden roses × £4.50 = £22.50; 4 white lisianthus × £2.40 = £9.60; 3 eucalyptus × £1.40 = £4.20; stems £36.30; + zone A delivery £4.95 = £41.25. Formula in `assets/bouquet-model.js` `priceOf()`; tested in `qa/model.test.mjs`.

**Findings disproved or dismissed, with evidence:**
- `audit.mjs --kind configurator` "Body 17px with controls ≥ 44px — marketing density in a desk work tool": the configurator alias maps to the desk app profile; this route is a phone-first consumer flow where 17 px and 44 px are the requirement (`categories.md` "Mobile-first consumer").
- `audit.mjs` "Big-number claims: 14": the door number of 14 Harrogate Road, from the README.
- `audit.mjs` "Primary action pinned in the top third" (home, phone): the header's "Make a bouquet"; it is styled secondary while the hero's button, in the thumb zone, is on screen.
- `a11y.mjs` "Text already clipped by overflow:hidden" on `section.hero`: only the visually hidden figure caption is clipped, by design (`qa/probe-hero-clip.out.txt`).
- `a11y.mjs` "button Show date picker is named only by a title tooltip": the button inside Chromium's own `<input type="date">` shadow DOM, not page markup.
- `sweep.mjs` "#order children drawn in order 1,3,2" at ≥ 1024 px: the sticky action bar drawn mid-page in a stitched capture; last in the DOM, pinned to the viewport bottom in use.
- `stress.mjs` RTL findings: the site is English-only (Brief: languages); the pseudo-localised header button overflow: the header fits from 380 px in English and the button is hidden below that.
- `capture.mjs` full capture of the home page at 390 loses the hero bouquet: a capture-tool defect (an `svh`-sized `<svg>` is not pinned when the viewport grows: `qa/probe-svh.out.txt`); the fold capture and `--mode fullpage` are correct.
- `parity.mjs` "form fields removed: delivery_date" (first run): the day radios were only rendered on entering chapter 3; they now render at load.

**Contracts proved:** payload byte-identical to the old form for the same order (`parity.mjs --payloads`, `captures/states/requests/`); analytics event names and property shapes identical (`qa/probe-analytics.out.txt`); `/order/`, `#occasions`, `#about`, `form#order`, `#wrap`, `#ribbon` and every server field name present (`audit/parity.md`).
