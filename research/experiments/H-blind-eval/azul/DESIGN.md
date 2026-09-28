# Azul & Co. — design direction

Written 2026-09-28, before implementation, on branch `redesign` (from `master` at `d0f2789`). Benchmark for finish: the clarity of GOV.UK's form patterns in the checkout and the restraint of a good maker's shop everywhere else. This must read as *Azul & Co.'s* work — a Bristol studio selling tiles painted outside Lisbon — not as the references', not as the bought 2023 theme, and not as the model's default.

No one from Azul & Co. was available during this job. Every place the method says "ask the user" is written below as **Assumption** and repeated as a question in `REPORT.md`.

## Brief

| Route / group | Category | Frequency | Stakes | Posture | Intensity |
| --- | --- | --- | --- | --- | --- |
| `/` home | ecommerce — browse and trust | occasional (a few visits across one renovation project) | lost money (a wrong-looking wall; a few hundred pounds) | expressive (persuade) | **redesign** |
| `/collection/` | ecommerce — product list | occasional, task-driven | lost time | persuasive, list-productive | **redesign** (IA and filters kept) |
| `/product/?id=…` | ecommerce — product page | occasional, task-driven | lost money (wrong size, wrong quantity) | persuasive → productive at the buy box | **redesign** + refine of the buy box (radio groups, quantity, feedback) |
| `/cart/` | ecommerce — basket | once per order | lost money (surprise costs) | productive | **rethink** of the page's job (show the full cost, edit lines) |
| `/checkout/` | ecommerce — checkout | once per order | lost money; personal data | productive | **rethink** of the flow (guest first, delivery cost before paying); field names, POST and events kept |

The owners asked for two things: "make it feel like us" (a redesign of the expressive routes) and "make buying easier" (a rethink of cart and checkout, backed by their own numbers). The audit agrees with both and adds one thing they did not ask for: the product page gives no feedback when you add to basket and has keyboard-unreachable size and finish controls.

**Audience and context.** People doing up a kitchen splashback, bathroom, hallway or fireplace in the UK (and some in Ireland, France and Germany — the checkout's country list). They browse on a phone in the evening, often more than once, often with a partner or tiler, and buy on whichever device is to hand. They buy by the tile but think in square metres; they worry about how many to order, what delivery costs, breakage and how long it takes. **Assumption:** device split and audience are inferred from the category and the repo; there is no analytics export in the repo.

**Top tasks** (ranked):
1. **Find out what an order will really cost, delivery included** — evidence: README, "the most common support email is 'how much is delivery?'"; the old checkout says "Shipping and taxes will be calculated on the next page", and there is no next page.
2. **Pay without being forced to make an account** — evidence: README, "41% of checkouts are abandoned at the account step".
3. **Choose a design, size, finish and the right number of tiles** — evidence: the product data (3 sizes × 2 finishes, price per tile, `lead_time_days`), the quantity field labelled "Quantity (tiles)". The "how many for my wall" part is an **assumption** (no search logs or tickets in the repo).
4. **Browse the designs by pattern and colour** — evidence: the nav (Stars, Lattice) and the collection filters (pattern, colour, sort).
5. **Decide whether to trust a small maker** — evidence: the story and the one customer quote exist on the home page; **assumption** that it matters to conversion.

**Problems** (severity 0–4 × task importance; each traced to the audit below):
1. Delivery cost hidden until after payment is submitted; "next page" promise is false (4 × task 1).
2. Account creation (email + password + confirm) is the first thing checkout asks for, and is required (4 × task 2).
3. Checkout asks for 16 inputs, including date of birth "for our records", title and company; newsletter is pre-ticked (3 × task 2; the pre-tick is also a UK PECR/GDPR consent problem).
4. Size and finish "pills" are `<span>`s: unreachable by keyboard, no selected state for assistive tech (3 × task 3).
5. Adding to basket gives no feedback except a number in the header; the basket cannot change quantities or remove lines (3 × task 3).
6. Nothing on the site looks hand-painted, Portuguese or like Azul & Co.: the founder's mark is not used; Montserrat tracked capitals and a beige gradient (2 × identity, the owners' first complaint).
7. No visible focus anywhere (`*:focus { outline: none }`), placeholder-only labels, no `lang`, no `main`, no `h1` on three pages (3 × every task for keyboard and screen-reader users).

**Principles** (each can say no):
1. **The price you see is the price you pay.** Delivery cost sits next to every price and total; nothing is "calculated later". (A reasonable shop defers shipping to checkout — the bought theme does.)
2. **Show the tile laid, not just the tile.** Where a design appears large, it appears as a panel of tiles meeting at the joins, with its real size. (Most tile shops show a single square or a styled room.)
3. **Ask only what the order needs.** No account, date of birth or title to buy; everything optional is marked "(optional)" or one tap away.
4. **The founder's mark is the system.** Cobalt, white and one ochre corner come from the 2022 painted mark; no colour or device is added that the mark does not suggest.
5. **Checkout is plain.** Brand lives in type, colour and words there; controls are native and familiar.

**Non-goals.** No new routes or pages; no new products, sample ordering or accounts area; no change to the order system, Stripe integration, cart storage key or product data shape; no photography (none exists in the repo and photo hosts are blocked — see Imagery); no logo redesign.

**Constraints.**
- Stack: static HTML + one CSS file + one vanilla JS file, served statically (production is "the same templates on a small Node server"). No build, no framework, no component library. No tests, lint or typecheck commands exist.
- Contracts to preserve: `data/products.json` shape; checkout `form#checkout-form[action="/api/checkout"][method=post]` and the field names `email password password_confirm title first_name last_name company address1 address2 city postcode country phone dob newsletter`; the JSON POST body `{...fields, cart}` with `content-type: application/json`; `#stripe-element`; `window.dataLayer` events `add_to_cart {item_id, quantity}` and `purchase_attempt`; `data-track` attributes `add_to_cart`, `begin_checkout`, `purchase`; localStorage key `azul-cart` and its item shape `{id, name, size, finish, qty, price}`; element ids used by the script (`cart-count`, `cart-link`, `featured`, `grid`, `f-pattern`, `f-colour`, `f-sort`, `pdp`, `p-img`, `p-name`, `p-price`, `p-sizes`, `p-finishes`, `p-qty`, `add`, `cart-rows`, `subtotal`, `coupon`, `apply`, `checkout-form`, `pay`, `checkout-msg`); anchor `/#about`; query `?pattern=` and `?id=`.
- Surviving brand assets: `assets/logo.svg` (mark + wordmark), the 12 tile scans. Legal copy: the footer company line.
- Accessibility: WCAG 2.2 AA floor; aim for 2.4.13 and 2.3.3. EU customers → the European Accessibility Act applies to the storefront.
- Performance budget: LCP ≤ 2.5 s on a mid phone; ≤ 120 KB of fonts; no new JS dependencies.
- Language: British English, Latin script only; Portuguese place names keep their accents (Belém, Évora, Óbidos, Nazaré, Inês).

**Success measures** (baselines from the owners where they exist):
- Checkout abandonment at the account step: 41% (2025) → the step no longer exists; measure `begin_checkout` → `purchase_attempt` → order.
- "How much is delivery?" support emails: the most common email (2025) → should fall; count per month.
- Add-to-basket rate on product pages and average order value (the free-delivery threshold is now visible).
- Accessibility: axe 0 violations, `a11y.mjs` 0 FAIL on all five pages (baseline: 5–69 FAIL per page).

## Audit

**What the company sells, to whom.** Hand-painted, tin-glazed Portuguese-style tiles — twelve designs (four patterns × three colourways), three sizes, gloss or matt, £6.50–£8.25 a tile — to UK home-owners (plus Ireland, France, Germany) doing a room. Painted in a small workshop outside Lisbon; founded 2019 by Inês Carvalho (tile painter, Aveiro) and Tom Walsh (joiner, Bristol); shipped from the Bristol studio.

**The one thing a visitor should remember / be able to do.** "Real Portuguese tiles painted by hand, and I know exactly what my order costs to get here."

**Real proof that exists.** The story paragraph (dates, names, places, technique); one customer quote ("The kitchen splashback is the first thing everyone mentions. The tiles arrived beautifully packed and not one was broken." — Hannah, Bath); the company registration line; the tile scans themselves. Nothing else — no review counts, press, ratings or numbers. "Best sellers" on the old home page is **not** proof: the script shows the first four products in the file (`P.slice(0, 4)`), so the label is unsourced and is dropped.

**Brand assets sampled.** `palette.mjs --from assets/logo.svg` (output in `audit/before/palette-logo.txt`): cobalt `#1F3F8F` (40%), white `#FFFFFF` (40%), ochre `#E3B23C` (20%). The mark: a cobalt tile quartered by a white cross with the bottom-right quarter in ochre, one rounded outer corner. The wordmark: hand-lettered and traced — in this file it is set as `<text>` in Georgia italic, so the SVG shows a stand-in, not the traced lettering (**Question:** the traced wordmark file). Construction: a calligraphic italic serif. The tile scans add: glaze grounds `#F7F4EE #FBF8F1 #F2EFE8 #EEF3FA`, colourway inks `#1F3F8F #15306E #2A2A2A #1F6E5B #7A1F3D`, highlights `#E3B23C #B8452E #6FA3D8`. **Brand family:** none in the repo — no parent company, no sibling surfaces, no social or packaging assets (**Question:** packaging, labels, stationery).

**Measured baseline** (`audit.mjs --kind commerce` at 1440 and 390, `audit/before/`; `a11y.mjs` per page, `audit/before-a11y/`):
- Type: 6–8 sizes per page (56 · 22 · 18 · 14 · 13 · 12 · 11 · 10 px), 91–98% at weight 400; one family declared — **Montserrat (on the saturated list), which never loaded**: the Google Fonts request fails (`ERR_CERT_AUTHORITY_INVALID` in this environment), so every capture shows Arial/Helvetica. Tracked uppercase for the announcement, nav, headings and buttons. Text under 12 px: announcement 11 px, badges 10 px, option labels 11 px, the checkout note 11 px.
- Contrast: `#777` on white 4.48:1 (prices, option labels); `#777` on `#f7f7f7` 4.18:1 (footer); `#aaa` on white 2.32:1 (the checkout note and the Stripe placeholder). Input borders `#ddd` 1.36:1 (1.4.11 fail on all 13 checkout fields).
- Focus: invisible on every control on every page (`*:focus { outline: none }`), including in forced colours.
- Semantics: no `lang`; no `main`; no `h1` on collection, cart, checkout; three unlabelled selects; placeholder-only names on all checkout inputs; unnamed quantity spinbutton; five pointer-only `span.pill` controls.
- Targets at 390: search, wishlist and cart icons 10–37 × 20 px.
- Layout: no overflow; CLS 0.097 on the collection (lazy images above the fold without dimensions).
- Signals: emoji as icons (🛒 ♡ ⌕); 100% centred text blocks on home; cliché "Elevate"; Montserrat saturated.
- **Already working (to keep):** native `<select>`s for filters; `<details>` for product description and shipping; a real `<table>` in the basket; a real `<form>` with a real `action`; the viewport meta allows zoom; LCP ~0.3–0.4 s locally; 4 KB CSS and 4 KB JS.
- Performance: no Lighthouse available (running downloaded packages was blocked); local LCP and transfer from `audit.mjs` stand in.
- Not run: dembrandt (`npx dembrandt` was refused by the environment's permission policy; the stylesheet is 45 lines, so `audit.mjs` covers it).

**Walkthrough of the top three tasks** (390 px, old site, `captures/before/flow/`):
- *Task 1, delivery cost.* Home: "Free UK shipping on orders over £150" in 11 px tracked caps in a black bar (banner-shaped: easy to skip). Product page: "Shipping — Calculated at checkout." Basket: subtotal only. Checkout: "Shipping and taxes will be calculated on the next page." → Continue posts the order. **The UK standard rate (£7.95) and the EU rate (£18) are in `data/products.json` and appear nowhere.** Q2 (will they notice?) fails at every step.
- *Task 2, pay.* The first heading is "Create an account to continue"; the script refuses to submit without a password. Q1 (will they try the right thing?) fails for anyone who wanted to buy once.
- *Task 3, choose and add.* Size and finish can be changed only by mouse; quantity has no label; "Add to cart" gives no message, and a second add of the same tile makes a second basket line. Q4 (will they see progress?) fails.

**Must be preserved (functionality and truth):**
- Routes / anchors: `/`, `/collection/` (+ `?pattern=star|lattice|bloom|corners`), `/product/?id=AZ-1xx`, `/cart/`, `/checkout/`, `/#about`.
- Element ids, data attributes and form fields: listed in Constraints above; plus `data-track="add_to_cart"` on `#add`, `data-track="begin_checkout"` on the basket's checkout link, `data-track="purchase"` on the form.
- Server contracts: `POST /api/checkout`, JSON body of every form field plus `cart`; Stripe Elements mount on `#stripe-element`; `window.dataLayer` events as they are pushed today.
- Legal copy: "© 2026 Azul & Co. Ltd · Company no. 12345678 · 14 Tile Yard, Bristol BS1 4XX". The "Delivery & returns" and "Privacy" footer links point to `#` today (no pages exist).

**Why the current design fails** (rated separately from discovery; severity 0–4):
| # | Finding | Heuristic / rule | Sev. |
| --- | --- | --- | --- |
| 1 | Delivery cost not shown anywhere before the order is posted; the checkout note promises a next page that does not exist | visibility of status; hidden costs (dark pattern by omission); Baymard top abandonment reason | 4 |
| 2 | Forced account creation first | user control; Baymard 26% | 4 |
| 3 | 16 inputs incl. date of birth "for our records", title, company; newsletter pre-ticked | minimalist design; pre-ticked consent | 3 |
| 4 | Size/finish controls pointer-only; no focus indicator anywhere | WCAG 2.1.1, 2.4.7 | 3 |
| 5 | No add-to-basket feedback; basket lines cannot be edited or removed; duplicate lines | visibility of status; user control | 3 |
| 6 | Placeholder-only labels; no error messages except one generic red line; `alert()` for sold out and coupon | error recovery; WCAG 3.3.2 | 3 |
| 7 | The brand is absent: mark unused, theme typography, beige gradient hero, "Timeless tiles for modern living" | match with the real world; credibility | 2 |
| 8 | Page title reads "Azul __T__ Co" on every page (a template token never replaced) | credibility: "avoid errors of every kind" | 2 |
| 9 | "Best sellers" is unsourced; "From £6.50" suggests size-dependent prices the data does not have | honesty | 2 |
| 10 | Search and wishlist icons link to `#` (features that do not exist); footer links to `#` | consistency; broken links | 2 |
| 11 | Collection: lazy-loaded images in the first viewport, no dimensions (CLS 0.097), unlabelled selects, no result count or empty-state action | performance; WCAG 1.3.1 | 2 |

**The five things a stranger notices first** (home, expressive + redesign — all five change):
1. Montserrat (rendering as Arial) in wide-tracked capitals everywhere — the wordmark, nav, headings, buttons.
2. Black, white and grey with a beige-to-brown gradient: no cobalt, no ochre.
3. A full-viewport gradient hero with a centred uppercase slogan and one white button.
4. Section rhythm: centred tracked-caps heading → content, four times, everything centred and one width.
5. Imagery: single tile scans on grey squares in a uniform four-column card grid.

## References

Live competitor sites, Baymard and the GOV.UK Design System website could not be loaded (the network allows only GitHub, npm, PyPI and Google Fonts). What was inspected is design-system and theme **source code**; the rest is knowledge, marked as such.

| Reference | Problem it solves | Taken (as a principle) | Deliberately not taken |
| --- | --- | --- | --- |
| **Shopify Dawn theme** (source, `github.com/Shopify/dawn`, inspected: `product-variant-picker.liquid`, `cart-notification.liquid`, `main-cart-footer.liquid`, `base.css`) — the family the bought theme descends from | what the category ships; variant pickers; add-to-cart confirmation | variants are **radio inputs in a `fieldset` with a `legend`** (the bought theme broke this with spans); after adding, confirm *what* was added and offer the next step | the tracked caption styles (`caption-with-letter-spacing`), the centred everything, and the footer's "Taxes included and **shipping calculated at checkout**" — the exact sentence behind the owners' most common support email |
| **GOV.UK Frontend** (source, `alphagov/govuk-frontend`, inspected: `error-summary` template and JS, `settings/_measurements.scss`) | a form that fails well | error summary with `role="alert"`, links to each field, focus moved to the summary, the label scrolled into view before focusing the input; labels above; "(optional)" in words; a 3 px focus outline | its typeface, its black-and-yellow focus and its no-brand stance |
| **Shopify Checkout and Baymard's checkout research** (knowledge; Baymard figures as cited in the skill's `categories.md`) | guest checkout and cost transparency | guest first, account as an afterthought; the order summary with delivery as its own line before the pay button; Address line 2 and Company behind links; one column | Shop Pay / express buttons (not in this stack) and the two-column desktop checkout chrome |
| **Tile retailers' coverage calculators** (knowledge only, not inspected — e.g. UK tile merchants) | people buy per tile but think per m² | an "area → tiles" helper in the buy box, rounding up | recommending a waste percentage (a claim Azul & Co. has not made) |
| **Museum collection records** (contrary; knowledge only — azulejo collections catalogue a tile by name, origin, technique and size) | show a crafted object as an object, not as a lifestyle shot | each tile captioned plainly with pattern, colourway, size and technique; the tile shown flat and whole | museum austerity and the absence of a price |

## Direction

**Concept — "Where four tiles meet."** The founder's mark is four tiles meeting at a white cross, one corner painted differently. Azulejo patterns only appear at the joins: the Corners designs draw a full circle only when four tiles touch; the Lattice lines only run on from tile to tile. The site shows every design the way a customer will see it on the wall — laid, with the joins — and uses the mark's white cross and single ochre corner as its layout and emphasis device.

How it translates:
- **Surfaces:** white (the logo's white, the glaze) as the page; one cobalt field per page for the story; a pale cool grey for the delivery and basket panels. Tile panels sit on a thin grout-grey ground so the joins show.
- **Type:** Alegreya italic for display, because the wordmark is a hand-lettered italic serif; Alegreya Sans for everything else — the same designer's humanist sans, calligraphic stress, tabular figures for prices.
- **Imagery:** the twelve tile scans, laid as a wall (home), as a 4 × 4 panel with its real dimensions (product page), and as single tiles (collection). No photography.
- **Motion:** almost none — a quick cross-fade when the hero panel switches design; nothing on scroll.

**Candidates considered** (from the company's own world):
| Candidate | Family | Why it lost / won |
| --- | --- | --- |
| **Where four tiles meet** — repeat panels, the mark's cross as layout, ochre corner as emphasis | product / pattern geometry | **won**: comes from the mark *and* the product, answers the in-scale problem (Baymard: people judge size from images), and needs no assets the company does not have |
| The blue glaze — the page drenched in cobalt, tiles as white objects | colour field | lost at style-tile stage (`design/style-tiles/`): five of twelve products are cobalt and disappear on a cobalt ground; it is the first thing anyone would guess for "azulejo shop" |
| The painter's bench — brush strokes, hand-drawn underlines, a workshop diary | craft / hand | lost: needs photographs of Inês painting that do not exist; drawn brush marks would fake the hand |
| The parcel from Bristol — packing, labels, delivery as the story | paper / packaging | lost as a look (kraft paper is the warm-paper prior); **kept as content**: delivery facts in the hero and every total |
| The street-name plaque — Lisbon's painted blue-and-white sign panels as headers | vernacular / signage | lost: costume; the owners are selling tiles, not Lisbon |
| The pattern book — numbered plates like a catalogue (AZ-101…) | archive / catalogue | lost: SKUs are internal codes; the broadsheet/catalogue look is a model default |
| The joiner and the painter — Tom and Inês as the story | people | lost for lack of photographs; the story chapter still names them |

**Refuses.** The page this category always ships: a full-bleed lifestyle photo (or gradient) with a centred "Timeless tiles for modern living", a "Best sellers" card row, and "shipping calculated at checkout". And its predictable opposite: a cream-paper "artisan" site with italic serif accents, kraft textures and a terracotta button.

**First viewport, exactly** (1440 × 900) — *revised in critique round 1*: header (80 px): the full logo (mark + wordmark) left; nav (All tiles, Star, Lattice, Bloom, Corners, Our story); "Basket (n)" right; under it a 36 px plain-text line: "UK delivery £7.95, free on orders over £150. Ireland, France and Germany £18.00. Handmade in Portugal." Body: an 8/4 row — left, the `h1` in Alegreya italic 64 px, cobalt, three lines; right, a three-line paragraph (19 px), the primary button "Shop all 12 designs" and a "What delivery costs" link. Below, full-bleed, **a wall of one design laid edge to edge** (7 tiles across at 1440, cropped at ~430 px so it reads as continuing), then a caption and a radio group of four designs to change the wall. At 390: header with mark, Menu and Basket; the delivery line; the `h1` at 36 px; the button; the wall (3 across); then the paragraph.
(The first build used a 5/7 split — copy left, a 4 × 4 panel right. In the blurred comparison it read as a sibling of the ledger's Milkline hero, which `web-design.md` §3 warns about; the statement-over-wall composition replaced it. `captures/critique/home-1440-fold-blur-vs-ledger.png`.)

**Productive surfaces** (cart, checkout, the buy box):
- Interaction-model candidates: (a) multi-step checkout (contact → delivery → payment → review); (b) one page with sections and a live order summary; (c) a drawer checkout. **Chosen: (b)** — the form is short once the account step goes (8 visible fields), a single page keeps everything visible (no "next page" to trust), and it posts once to the unchanged `/api/checkout`. The review requirement is met by an in-page review panel directly above the pay button that restates items, delivery destination, delivery cost and total.
- Navigation: the site header stays on basket and checkout (people go back to change a size); the checkout gets a "Back to basket" link.
- Density: consumer, touch-first — 17 px body, 48 px inputs, 16 px minimum input text.
- Elevation: page → panel (order summary, delivery, review) → nothing on top except the native focus. No cards inside panels. No shadows.
- State language: messages in the owners' voice, plain: "Enter your postcode", "Added 12 Alfama Star tiles to your basket".
- What people have learned that stays: basket at `/cart/`, checkout button bottom-right of the basket, the same field order (contact, name, address, country, phone, payment).
- Where brand shows: type, cobalt action colour, the ochre corner on the free-delivery meter, the tile thumbnails in the summary, the confirmation copy.

**Breaks if:** (1) a price or total appears without the delivery cost beside it; (2) any design is shown large as a single tile floating on white instead of laid with its joins, or a photograph of someone else's tiles appears; (3) ochre is used for more than one thing per view, or as text.

**Memory test:** "The blue-and-white tile shop where you can see the tiles laid out as a wall, and it told me delivery was £7.95 before I'd even picked one."

**Convergence checks:**
- *Similar-brief test* — this plan for a different tile shop (say, a Moroccan zellige importer) would be: its own mark and colours, zellige shown as irregular hand-cut pieces, not a repeat panel of a single pattern. The repeat panel works here because azulejo patterns are designed to repeat at the joins and the mark itself is four tiles meeting — it would not transfer as-is. **Honest caveat:** "cobalt and white for a Portuguese tile company" *is* guessable from the category. It stays because it is the brand's own asset (the logo is 40% cobalt, 40% white; the company is called *Azul*) and the skill's rule is to keep the brand's hue family unless the identity is the problem. Distance comes from composition (repeat panels, the mark's cross as layout, delivery facts as identity), not from the palette.
- *Category test* — from the category alone you would guess blue/white and a lifestyle photo hero; you would not guess the repeat-panel hero with a design switcher, the pattern × colourway index, or the delivery line in the header. From "avoid the obvious" you would guess cream paper and serif italic — refused.
- *Second-order test* — every choice points at the company: cobalt/white/ochre from the mark; italic serif from the wordmark; panels from the product; no photography because none exists (not "to avoid stock").
- *Ledger* — one sentence: "white glaze page with one cobalt field, Alegreya italic display from the hand-lettered wordmark, Alegreya Sans labels in sentence case (no caps device), a cobalt story field as the dark chapter, ochre as a single-corner accent; hero = a statement over a full-bleed, switchable wall of the product." Compared with `ledger.md`: brio3 (paper + serif italic + mono eyebrows + ink chapters) — shares an italic serif display, but the brand's wordmark is built that way (allowed by `anti-patterns.md`), ground is white not paper, no mono or tracked labels, the dark chapter is the brand cobalt not ink, accent from the logo; Brandigade (logo blues, calendar on a sky panel) — shares "blue from the logo"; different face, no sky panel, product panel instead of a UI mock; CleoHR (Bricolage, photography duotone) — different on every axis; Milkline (Fira/Nunito, navy/sky split hero with a product panel) — the first build shared its *split hero with a product panel on the right*; the blurred comparison confirmed it, so the hero became a statement over a full-bleed wall of the product (critique round 1). Now different on surfaces, type voice, hero form and imagery.

## Typography

- **Expressive set** (home, collection and product headings) — ratio ≈ 1.25, fluid: display `clamp(2.25rem, 1.4rem + 3.2vw, 4rem)` (36 → 64 px; max/min 1.78), h2 `clamp(1.75rem, 1.3rem + 1.6vw, 2.5rem)` (28 → 40), h3-display 1.75rem (28, italic: pattern names, the story statement, the wordmark), h3 1.5rem (24: story quarters), lead 1.1875rem (19), body 1.0625rem (17), small 0.9375rem (15). Every step is used: display (home `h1`), h2 (chapter heads, product, collection, basket and checkout `h1`), h3-display, h3, lead (hero paragraph), body, small (captions, notes). (Verification found 10 sizes on the home page — 34, 32 and 26 px were one-offs; they were folded into this scale.)
- **Productive set** (basket, checkout, buy box) — fixed: title 1.75rem (28), section 1.25rem (20), body 1.0625rem (17), label 1rem/600 (16), detail 0.9375rem (15). Inputs 1.0625rem (never under 16 px).
- **Display: Alegreya** (Juan Pablo del Peral, Huerta Tipográfica; SIL OFL 1.1; variable `wght` 400–900; italic). Used only in *italic* (500–700) for display, because the founder's wordmark is a hand-lettered italic serif. Tracking −0.01 em at display sizes; line-height 1.05. Italic descenders (g, p, y) get line-height ≥ 1.05 and bottom room.
- **Text / UI: Alegreya Sans** (same designer; OFL). 400 and 700. Humanist, calligraphic stress, concordant x-height with Alegreya (0.458 vs 0.452 em, `fonts.mjs`). **Tabular figures available with `tnum`** (proportional by default) — every price, quantity and total is set with `font-variant-numeric: tabular-nums`. The small x-height is why body is 17 px, not 16.
- Data / code face: none.
- Caps / tracked-label device: **none**. Labels are sentence case in Alegreya Sans 700.
- Scripts: Latin; the Google `latin` subset covers é É Ó ê ã £ × – — · ’ (U+0000–00FF, U+2000–206F).
- Licence, source, loading: both families OFL (licence files in `assets/fonts/`), downloaded from Google Fonts' CSS API (latin subset, woff2) and **self-hosted**: Alegreya italic variable (44 KB) and Alegreya Sans 400 + 700 (24 KB each) — **92 KB, 3 files**, inside the 100 KB budget. Upright Alegreya, Alegreya Sans 500 and italic were dropped in verification to meet it (the story's pull statement is italic; weight 500 became 400/700). `font-display: swap`; metric-matched fallbacks from `fonts.mjs --fallback`; `<link rel=preload>` for Alegreya Sans 400 and Alegreya italic. The Google Fonts `<link>` to Montserrat is removed (it also leaked visitor IPs to Google).
- Checked against `saturated-fonts.json`: neither face is listed.

## Colour

**Strategy: Restrained (60/30/10), with one cobalt field per page.** White carries the page; the pale grey panel and the one cobalt chapter make the 30; cobalt buttons and links and the single ochre corner are the 10. Tiles bring their own colour and must not compete with a coloured ground.

**Harmony and sources.** From the mark: cobalt dominates (action, headings, the field), white is the ground, ochre is the accent — a near-complementary pair (hue 264 vs 85), used in the mark's own 2 : 2 : 1 spirit but budgeted far smaller on the page.

**Use scene.** Light only: people browse in the evening on a phone and in daylight at a desk with a tape measure; tiles must be judged against white, as they would be in a white-grouted kitchen. No dark theme (a dark ground would misrepresent the glaze).

**Scales.** `palette.mjs --brand '#1F3F8F'` and `'#E3B23C'` (outputs in `audit/palette-*.txt`). Ink is a dark cobalt tint, not black. Neutrals tinted at hue 264. Status colours reserved; red and green chosen away from the product colourways (wine `#7A1F3D`, green `#1F6E5B`).

**Contrast table** (`contrast.mjs`, WCAG 2 / APCA Lc):

| Token (role) | Value | Pairs measured | Use |
| --- | --- | --- | --- |
| `--surface` | `#FFFFFF` | — | page |
| `--surface-alt` | `#F4F6F9` | — | delivery panel, basket summary, checkout summary |
| `--notice` | `#FBF3DD` | — | the free-delivery note ground |
| `--text` (strong) | `#15203D` | 16.08:1 / 102.9 on white; 14.85 / 97.4 on alt; 14.52 / 95.9 on notice | body, labels |
| `--text-muted` | `#46506B` | 8.01 / 87.8 on white; 7.40 / 82.3 on alt; 7.24 / 80.8 on notice | captions, secondary lines |
| `--cobalt` (accent, action, link, headings) | `#1F3F8F` | 9.70 / 92.0 on white; 8.96 / 86.5 on alt; 8.76 / 85.0 on notice | primary button fill, links, headings, focus ring on light grounds |
| `--cobalt-hover` | `#123081` | white on it 11.89 / −100.3 | button hover/pressed |
| `--on-cobalt` | `#FFFFFF` | 9.70 / −96.3 on cobalt | button text, field text |
| `--on-cobalt-muted` | `#D9E3F7` | 7.52 / −77.8 on cobalt | secondary text in the story field |
| `--ochre` (accent, non-text) | `#E3B23C` | 4.94 / −53.2 on cobalt (focus ring and mark on the field); 1.83 on white → **never text, never a meaningful edge on white** | the mark's corner, the free-delivery meter fill (with text beside it), focus ring inside the cobalt field |
| `--border-control` | `#6B7390` | 4.69:1 on white, 4.33:1 on alt (≥ 3:1) | input, select and checkbox boundaries, option tiles |
| `--grout` | `#DFE3EA` | 1.29:1 — **decorative only** | the gaps between tiles in panels; dividers that carry no meaning |
| selected | `--text` border 2 px + check icon | 16:1 | chosen size/finish — neutral ink, not the action colour |
| `--danger` | `#B3261E` | 6.54 / 80.8 on white; 6.04 on alt | error text, error border, with an icon and words |
| `--success` | `#1E6B45` | 6.47 / 81.8 on white | "Added to basket" confirmation, with an icon and words |
| focus ring | `--cobalt` on light, `--ochre` on cobalt | 9.70:1 and 4.94:1 against their grounds; offset 2 px from the control | every focusable element |

## Layout and space

- Spacing scale (px): 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128, as `--space-1…10`. Chapters 96 (64 on phones); inside chapters 32–48; components 8–24.
- Container: max 1240 px, gutters 24 px (16 px under 480). Grid: 12 columns ≥ 1024; 6 at 600–1023; 1–2 below.
- Home chapters: hero (statement over a full-bleed wall) → the designs (an index: one row per pattern) → story (cobalt field, the quartered-mark composition) → delivery (a two-column table on the pale panel) → the quote (a single statement on white) → footer. No two adjacent chapters share a composition; the field appears once.
- Cards: only the collection's product tiles are card-shaped (one link each, the title as the link with its hit area stretched). No cards elsewhere; panels are divided by space and ground.
- Radii: 0 on tiles (tiles are square; the scans carry their own painted border); 4 px on controls and panels. (Considered and rejected: echoing the mark's single rounded corner on buttons — on a button it would read as a rendering bug, not a reference.)
- One deliberate grid break: the home hero wall bleeds to both edges of the viewport at every width.

## Imagery and graphics

- **No photography — argued.** The company's world is photographable (the workshop, Inês painting, installed kitchens), but none of it is in the repo, photo hosts are blocked here, and stock photographs of azulejos would show *another maker's* tiles on a maker's shop — misrepresentation. **Question for the owners:** workshop and installed-room photographs (the customer in Bath, with permission).
- **Product imagery:** the twelve SVG scans (the studio's own), shown four ways: single tile (collection, basket, summary), a full-bleed wall (home hero), a 4 × 4 panel with its real size (product page: "laid 4 × 4 at 13 × 13 cm: about 52 × 52 cm, before grout"), and a strip of three colourways (home index). Walls and panels are grids of `<img>` of the same SVG on a 4 px grout ground — no new image files, exact to the scans.
- **Drawn graphics layer:** the mark, rebuilt as an inline SVG component in the logo's own geometry, used three times: the header logo, the quartered-story composition, and the favicon. Line style: none (flat fills only, like the mark). Nothing else is drawn.
- Licences: all first-party. No credits needed. Fonts: OFL (licence files kept in `assets/fonts/`).

## Motion

- Productive tokens: 120 ms for colour/border changes on hover and press; 0 ms for anything keyboard-driven.
- Expressive: one move — the hero panel cross-fades (200 ms, ease-out) when a different design is chosen. Reduced motion: the swap is instant.
- Never moves: content on scroll (no reveals), images, the basket count, totals.
- Nothing starts hidden; no script is needed for any content to appear.

## Interaction

- **Primary action per screen:** home — "Shop all 12 designs" (cobalt, in the hero); collection — none (the tiles are the links); product — "Add to basket" (cobalt, full-width in the buy box); basket — "Go to checkout" (cobalt, under the total, `data-track="begin_checkout"`); checkout — "Place order and pay £xx.xx" (cobalt, below the review panel, `#pay`).
- **Components and states** (full matrix in `SYSTEM.md`): header + basket link (count in its name); delivery line; option group (radio tiles: rest, hover, focus, checked, disabled-for-sold-out); quantity stepper (number input + two named buttons); area helper (disclosure); add-to-basket status (polite region); panel switcher (radio group); filters (native selects + result count + clear); basket lines (quantity, remove, empty state); discount-code disclosure (inline error, not `alert`); free-delivery meter (`<meter>`-like text + bar); checkout sections; error summary; order summary disclosure on phones; review panel; submit loading state.
- **Forms:** fields kept by name. Visible by default: email, first name, last name, address, town/city, postcode, country, phone (optional), newsletter (unticked). One tap away: "Add a company name" (company), "Add flat, suite or building" (address2), "Save my details for next time" (reveals password + confirm; `new-password`). `title` and `dob` stay in the form as empty hidden inputs so the POST keeps every key (they were never required). Labels above; "(optional)" in words; validate on submit, then live; error summary for any error at the top of the form, focused; `aria-invalid` + `aria-describedby`; `novalidate`; double-submit prevented.
- **Targets:** 44 px minimum for every control on phones; 48 px inputs; the basket link 44 × 44.
- **Mobile navigation:** below 900 px the six nav links go behind a labelled "Menu" disclosure button (`aria-expanded`) that opens a full-width list with 48 px rows; "Basket (n)" stays visible outside the menu. (A horizontally scrolling link row was considered and rejected: hidden overflow is low-discoverability.)
- **Performance budget:** LCP = the hero `h1` text (measured: `audit/perf/perf-throttled.txt`); fonts preloaded (2 of 3 files, 92 KB total); JS: the existing script, grown but still dependency-free (27 KB unminified); CSS 38 KB unminified — both inside the ecommerce budget (≤ 200 KB JS, ≤ 75 KB CSS).

## Accessibility

WCAG 2.2 AA; aiming for 2.4.13 and 2.3.3.

- **Contrast table:** above. Non-text pairs: input/select/checkbox borders `#6B7390` 4.69:1 on white; focus ring cobalt 9.70:1 on white, ochre 4.94:1 on cobalt; selected option border `#15203D` 16:1; meter fill ochre 1.83:1 on white → the meter always has a text equivalent ("£37.50 more for free UK delivery") and a `#6B7390` outline, so the bar is decoration.
- **Focus token:** `outline: 3px solid var(--focus)`, `outline-offset: 2px`; `--focus: #1F3F8F`, `.field { --focus: #E3B23C }`. Forced colours: `outline-color: Highlight`. The header is not sticky → no `scroll-padding` needed beyond 16 px; the error summary and `#main` get `scroll-margin-top: 16px`.
- **Targets:** 24 px floor everywhere; 44 px for every touch control (nav links, basket link, option tiles, stepper buttons, remove buttons).
- **320 px state:** header = mark + "Menu" + "Basket"; the delivery line wraps to two lines; hero stacks; panels full width; basket table becomes stacked rows (label–value) without `display:block` on the table — the basket is a list of lines, not a data table, so it becomes an `ul` of line items with a separate totals `dl`; checkout single column; the order summary collapses into a disclosure "Show order summary · £xx.xx".
- **Colour independence:** sold out = the words "Sold out" (not a badge colour); selected option = border + check icon + `checked`; errors = icon + text + border; links in running text underlined; the free-delivery meter has text.
- **Motion:** one cross-fade → instant under `prefers-reduced-motion`; nothing auto-moves.
- **Forced colours:** buttons and option tiles carry a 1–2 px border (transparent where the design hides it); the mark and tile images keep their colours (`forced-color-adjust: none` on the mark only, with its own white ground); focus as outline.
- **Component map:** nav → `nav > ul > li > a` with `aria-current="page"`; mobile menu → disclosure `button[aria-expanded][aria-controls]`; hero design switcher → radio group in a `fieldset`; size and finish → radio groups in `fieldset/legend`; quantity → `input type=number` with `<label>` and two `<button>`s named "Fewer tiles" / "More tiles"; area helper → `<details>`; description/delivery → `<details>` (kept); filters → labelled `<select>`s + a `role=status` result count; basket remove → `<button>` "Remove Alfama Star, 13 × 13 cm, Gloss"; discount → `<details>` with a form; order summary on phones → `<details>`; add-to-basket confirmation → pre-existing `role=status` region; error summary → `div[role=alert]` focused (GOV.UK pattern). No ARIA widgets beyond these; no tabs (the product image uses a radio switch, not a tablist).
- **Forms:** GOV.UK error pattern; "(optional)" marking; `autocomplete`: `email`, `given-name`, `family-name`, `organization`, `address-line1`, `address-line2`, `address-level2`, `postal-code`, `country-name`, `tel`, `new-password`; `type=email`, `type=tel`; `spellcheck=false` on email and postcode; paste allowed; show-password toggle on the optional account fields.
- **Announcements:** `role=status` for add-to-basket, basket updates (line removed, quantity changed), filter result counts, discount-code result; `role=alert` only in the error summary; submit shows "Placing your order…" in the status region.
- **Transactions:** the review panel restates what will be charged; the submit button carries the total.
- **Data:** no charts.
- **Preserved features:** `<details>` disclosures, native selects, zoom allowed. The old basket was a real `<table>`; the new one is an `ol` of line items, each headed by the product name with labelled values — chosen because each line now holds controls (stepper, remove) and must stack at 320 px without stripping table semantics. Justified change, not a regression: every value keeps a visible label.

## Page narrative (home)

Headline test: **"Portuguese tiles, painted by hand near Lisbon, sent from Bristol."** A stranger knows what is sold, how it is made and where it comes from. The action continues it: "Shop all 12 designs".

1. **Hero (statement over a wall)** — what it is, no account needed, the delivery link, the product laid as a wall. Why: the two things people ask (what is it, what does delivery cost) answered before a scroll.
2. **The designs (index)** — four rows, one per pattern; each row: the pattern name and one line, then its three colourways as tiles with name, colour, price per tile and "Sold out" where true. Why: the catalogue *is* a 4 × 3 matrix; showing it as one replaces an unsourced "Best sellers" row with the whole range in one glance.
3. **Our story (cobalt field)** — the story paragraph, split into its facts; the mark enlarged with its ochre corner; the statement "Each tile is slightly different — that is the point." in the ochre quarter. Why: the only proof of craft the company has; the field is the page's one identity moment.
4. **Delivery (table on the pale panel)** — UK standard £7.95; UK over £150 free; Ireland, France, Germany £18; samples arrive in two working days (from the story); lead times per design "3, 10 or 21 days" (from the data). Why: the most common support email.
5. **A customer (statement)** — Hannah's quote, large, on white. Why: real, specific, about packing — the fear of breakage.
6. **Footer** — company line, links, the delivery line again.

## Keep / replace / remove / create

**Keep:** routes and query parameters; every id, `data-track`, field name, event and the POST; the cart storage format; the story text and the quote verbatim; the product names, prices and data; the tile scans; the logo file; native selects and `<details>`; the static stack; the footer company line.

**Replace:** Montserrat → Alegreya italic + Alegreya Sans, self-hosted; black/grey/beige → cobalt, white, ochre from the mark; the text wordmark in the header → the logo; the gradient hero → the repeat-panel hero; "Best sellers" → the pattern index; centred tracked-caps section heads → left-aligned sentence-case headings; the uniform 4-up card grid → a laid tile grid with plain captions; span pills → radio groups; the announcement bar → a plain delivery line; `alert()`s → inline messages; the basket table → editable line items with a delivery-inclusive total; the account-first checkout → guest checkout with a review panel; the "Azul __T__ Co" titles → real titles; emoji icons → text labels.

**Remove:** the search and wishlist icons (link to `#`, no such features); "Best sellers" (unsourced); "From" before prices (no size-dependent price exists); the pre-ticked newsletter box; the visible date-of-birth and title fields (kept hidden and empty); "Shipping and taxes will be calculated on the next page"; `*:focus { outline: none }`; the Google Fonts request; the cliché hero copy.

**Create:** tokens (`assets/tokens.css` section of `shop.css`); the mark as an inline SVG and a favicon; repeat panels; the hero design switcher; the pattern index; the delivery table and the reusable delivery line; the area → tiles helper; add-to-basket confirmation; the free-delivery meter; basket line editing and empty state; the checkout error summary, optional-account disclosure, order summary and review panel; a skip link, `main`, `lang`, one `h1` per page; meta descriptions and Open Graph tags; `SYSTEM.md`.

(Home is expressive + redesign: *keep* is about contracts and facts; *replace* + *create* are longer, as required.)

## Secondary pages

- **Collection:** `h1` "All tiles" (or "Star tiles" when filtered); filters as labelled selects on one row with a live result count and "Clear filters"; tiles laid in a 4/3/2-column grid with 8 px grout gaps, each captioned name · colour · £ a tile · lead time; "Sold out" in words under the price; an empty state that says which filters matched nothing and offers "Clear filters"; the `?pattern=` URL kept and updated on change.
- **Product:** two columns ≥ 1024 (panel 7 / buy box 5); image switch "Laid 4 × 4 / One tile"; the caption states the laid size for the chosen tile size; buy box: name (display italic), "£6.50 a tile" (tabular), colour and pattern, the delivery line and lead time, size and finish radio tiles, quantity stepper + area helper, the running line total, "Add to basket", the confirmation region, then `<details>` for description and delivery.
- **Basket:** `h1` "Your basket"; line items (thumbnail, name, size · finish, price a tile, quantity stepper, line total, remove); summary panel: subtotal, UK delivery (£7.95 or Free), the free-delivery meter, "Ireland, France & Germany: £18.00 — choose at checkout", total, "Go to checkout", discount-code disclosure; empty state with a link to all tiles.
- **Checkout:** `h1` "Checkout"; "Back to basket"; sections: 1 Contact (email; newsletter opt-in, unticked), 2 Delivery (name, address, city, postcode, country, phone optional; company and address line 2 behind links), 3 Payment (`#stripe-element`), then "Save my details for next time (optional)" disclosure with password fields, the review panel, and the pay button with the total. Order summary: right column ≥ 1024, a disclosure at the top on phones. Delivery cost updates when the country changes.

## Verification record (Phase 6–8): script findings fixed or justified

Every ✗ and ◆ left in `audit/after/stdout.txt`, `audit/after-a11y/`, `audit/widgets/` and `audit/parity.md`, with the evidence that disproves it.

| Script finding | Verdict | Evidence |
| --- | --- | --- |
| `audit.mjs` product page: "`#area-calc` #1f3f8f on #1f3f8f = 1:1" | **False positive** (script defect) | The button sits inside a *closed* `<details>`; Chromium still returns a client rect for its text, so the script samples the "Add to basket" button painted beneath it. Computed style: white ground, cobalt text (9.70:1). `audit/evidence/probe-fonts-and-area-calc.txt` (the `elementsFromPoint` stack shows `BUTTON#add`), `audit/evidence/area-calc-open.png` |
| `audit.mjs` (first after-run): "Declared font families not available: Alegreya" on collection, cart, checkout | **False positive** (script defect), gone after the upright face was removed | The probe measures the family in *normal* style only; Alegreya was served italic-only on those pages and had loaded (`document.fonts`: "Alegreya italic 400 900 loaded"). `audit/evidence/probe-fonts-and-area-calc.txt` |
| `audit.mjs` checkout ◆ "Headline with one accented word ×4: 1Contact" | **Justified** | The "accent" is the step number of a real four-step sequence (purpose-gated "numbered markers" in `anti-patterns.md`), `aria-hidden`, not a styled word |
| `capture.mjs` home: "2 image(s) painted flat (tile-08.svg)" | **By design** | The wall is cropped with `overflow: hidden`; the flagged tiles are the ones fully below the crop. `audit/evidence/wall-clipping-probe.txt` (e.g. 1440 px: 21 tiles visible, the rest clipped) |
| `a11y.mjs` home WARN "Looks like a heading: 'Each tile is slightly different — that is the point.'" | **Justified** | It is a pull statement quoted from the story, set large in the mark's ochre quarter; it heads nothing |
| `widgets.mjs` FAIL disclosure `#menu-toggle` (timeout) | **Script limitation** | `widgets.mjs` runs at a fixed 1280 × 800, where the Menu button is not displayed. Checked at 390 px by keyboard instead: `audit/widgets/menu-probe-390.txt` (Enter/Space toggle `aria-expanded`, next Tab enters the list, Escape closes and returns focus) |
| `parity.mjs` unsourced "£150." "£18.00" "£18.00." | **Sourced** | `data/products.json` `shipping.uk_free_over: 150`, `shipping.eu: 18.0`; rendered from the file by `fillShipping()` (the script matches strings, not formatted numbers) |
| `parity.mjs` unsourced "3 days" (and ⚠ "10 days", "21 days") | **Sourced** | `lead_time_days` in `data/products.json` |
| `parity.mjs` unsourced "4 ×", "52 ×", "0.02 m" | **Derived arithmetic, labelled** | "laid 4 × 4 at 13 × 13 cm: about 52 × 52 cm, before grout"; "(about 0.02 m²)" = tiles × side². No claim about the company |
| `parity.mjs` unsourced "4 Review" | **False positive** | Step number "4" beside the heading "Review and pay" |
| `parity.mjs` dropped "£0.00" | **Deliberate** | The old empty basket printed "Subtotal £0.00"; the new empty basket shows an empty state instead |
