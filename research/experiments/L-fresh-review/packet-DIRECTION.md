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

