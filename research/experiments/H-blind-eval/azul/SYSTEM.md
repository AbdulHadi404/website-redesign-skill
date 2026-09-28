# Azul & Co. — system

For the productive parts of the shop: the buy box on the product page, the basket and the checkout. Written in Phase 4 next to `DESIGN.md`. The repo has no component library — plain HTML, one stylesheet (`assets/shop.css`) and one script (`assets/shop.js`) — so this document *is* the component layer. It restyles and completes what exists; it adds no dependency.

## Foundations

**Stack:** static HTML; `assets/shop.css` (tokens at the top, then base, primitives, pages); `assets/shop.js` (vanilla, no build, no dependencies); fonts self-hosted in `assets/fonts/` (Alegreya, Alegreya Sans — SIL OFL 1.1, licence files beside them). Stripe Elements mounts into `#stripe-element` in production (not wired in this copy).

**Tokens** (three tiers; grammar `--{property}-{role}[-{state}]`, primitives prefixed `--p-`):

- Primitive: `--p-cobalt #1F3F8F`, `--p-cobalt-deep #123081`, `--p-cobalt-tint #EEF2FA`, `--p-ochre #E3B23C`, `--p-ink #15203D`, `--p-slate #46506B`, `--p-steel #6B7390`, `--p-grout #DFE3EA`, `--p-mist #F4F6F9`, `--p-cream-notice #FBF3DD`, `--p-red #B3261E`, `--p-red-tint #FCEEEE`, `--p-green #1E6B45`, `--p-green-tint #EAF4EE`, `--p-white #FFFFFF`.
- Semantic colour: `--color-bg` (page), `--color-bg-alt` (panels), `--color-bg-field` (the cobalt chapter), `--color-bg-notice`, `--color-text`, `--color-text-muted`, `--color-text-on-field`, `--color-text-on-field-muted`, `--color-action`, `--color-action-hover`, `--color-link`, `--color-border-control`, `--color-border-subtle`, `--color-grout`, `--color-selected` (= ink, neutral), `--color-danger`, `--color-danger-bg`, `--color-success`, `--color-success-bg`, `--color-accent` (ochre — non-text only), `--focus`.
- Type (productive set, fixed): `--text-title 1.75rem/1.2`, `--text-section 1.25rem/1.3`, `--text-body 1.0625rem/1.5`, `--text-label 1rem/1.35 (700)`, `--text-detail 0.9375rem/1.45`. Figures: `tabular-nums` on every price, quantity and total.
- Space: `--space-1…10` = 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128 px. Categories: control padding 12–16; inset 24 (panels), 16 on phones; gap 8–24; gutter 24 (16 under 480 px).
- Radii: `--radius-control 4px` (inputs, buttons, option tiles), `--radius-panel 4px`, `0` for tiles. No pills.
- Elevation: page → panel (alt ground, no border, no shadow) → nothing. Never a panel inside a panel; the only overlay is the native focus ring.
- Motion: `--dur-micro 120ms` for colour and border on hover/press; `0ms` for anything keyboard-initiated; nothing else moves in the productive surfaces.
- Density: one mode (touch-first consumer shop). Controls 48 px high; option tiles 48 px; stepper buttons 44 × 48 px.

## Patterns

### Forms and validation
- Labels above, in sentence case, Alegreya Sans 700 16 px. Hints under the label, muted. "(optional)" after the label text of every optional field; required fields are unmarked (the majority).
- Validate on submit (`novalidate` on the form). On failure: an error summary at the top of the form (`div[role=alert]` inside a focusable container, heading "There is a problem", one link per error to its field), focus moved to it, `document.title` prefixed "Error: ". Beside each field: the same words, a hidden "Error:" prefix, a red 2 px border, `aria-invalid="true"`, the message id in `aria-describedby`. After the first failed submit, each field re-validates as it is edited.
- Messages say what to do, in the field's words: "Enter your email address", "Enter an email address like name@example.com", "Enter your postcode", "The passwords do not match".
- Never disable the submit button to show invalidity. While posting: the button keeps its label, gets `aria-disabled="true"`, and the status region says "Placing your order…"; double submits are ignored.
- `autocomplete` on every personal field; `type=email`, `type=tel`; `spellcheck=false` on email and postcode; paste always allowed.

### Notifications
- Add to basket → inline confirmation under the button in a pre-existing `role=status` region, with the next action ("View basket and check out"). No toast, no dialog, no focus move.
- Basket changes (quantity, remove) → the line updates and the status region says "Removed Alfama Star (13 × 13 cm, Gloss)." / "Alfama Star: 12 tiles."
- Discount code → inline message under the field (the stub in this copy rejects every code: "We don't recognise that code").
- Sold out → words beside the price and on the button; activating the button explains in the status region instead of an `alert()`.
- Status = colour + icon + words.

### Loading, empty, error
- Product data loads in well under a second locally; no skeletons. If `products.json` fails, lists show "We couldn't load the tiles just now. Refresh the page to try again." in place.
- Empty basket: heading "Your basket is empty", one line, and "Browse all 12 designs".
- No filter results: "No tiles match {pattern} in {colour}." + "Clear filters".
- Checkout with an empty basket: a notice above the form linking back to the tiles; submit shows the error "Your basket is empty".

### Lists
- The basket is an ordered list of line items (not a table): thumbnail, name (link), size · finish, price a tile, stepper, line total, remove. Numbers right-aligned with tabular figures.
- The collection is a grid of tile cards, one link per card (the name, its hit area stretched over the image).

### Navigation
- Site nav: `nav > ul > li > a`, `aria-current="page"` on the current place. Below 900 px: a "Menu" disclosure button (`aria-expanded`, `aria-controls`). The basket link stays outside the menu at every width and carries the count in its name.
- Collection filter state lives in the URL (`?pattern=`, `?colour=`, `?sort=`).

## Components

## Button
The one action per view.
**Use when** — the primary action (Add to basket, Go to checkout, Place order and pay, Shop all 12 designs). **Don't use when** — navigation inside text → a link; secondary actions → a text button.
### Anatomy
1. Label — verb first, ≤ 5 words, may carry a total ("Place order and pay £85.95").
### States
rest (cobalt, white text) · hover (pointer only: cobalt-deep) · focus-visible (3 px cobalt outline, 2 px offset) · pressed (cobalt-deep) · busy (`aria-disabled`, label kept, status text) · "unavailable" (sold out: ink outline, muted fill, `aria-disabled`, explanation in the status region).
### Accessibility
Native `<button>`/`<a>`; 2 px transparent border so it keeps its shape in forced colours.

## Option group (size, finish; hero design switch; product view switch)
Choose one of a few visible options.
### Anatomy
`fieldset` + `legend`; each option = `input[type=radio]` visually replaced by its `label` tile (the input stays in the accessibility tree and keyboard order; arrow keys move).
### States
rest (steel border) · hover (tint fill) · focus-visible (outline on the label via `:has(:focus-visible)`) · checked (2 px ink border + check glyph + bold label — neutral, not the action colour) · disabled not used.

## Quantity stepper
Set a number of tiles.
### Anatomy
`label` · `button` "−" (name "Fewer tiles" / "Fewer {product} tiles") · `input type=number min=1 inputmode=numeric` · `button` "+" (name "More tiles" / "More {product} tiles").
### Behaviour
Buttons step by 1; typing any whole number works; blank or 0 falls back to 1 on blur; the line total and coverage update as the value changes.

## Area helper
`details` "Work out how many tiles you need" → area in m² → "Use {n} tiles" button that fills the stepper. Copy: "Rounded up to whole tiles. Allow extra for cuts — your tiler will know how many." Arithmetic only (area ÷ tile face); no waste percentage is claimed.

## Delivery line / delivery facts
Delivery costs rendered from `data/products.json` (`shipping.uk_standard`, `uk_free_over`, `eu`) into any `[data-ship]` element; the HTML carries today's values as the no-JS fallback. Rule: UK orders over £150 (strictly over) are free; Ireland, France and Germany pay the EU rate.

## Free-delivery meter
Under the basket and checkout subtotals when the destination is the UK and the subtotal is under the threshold: a bar (ochre fill in a steel outline, decorative, `aria-hidden`) and the words "Add £{n} more for free UK delivery". At or over: "Free UK delivery on this order".

## Error summary
GOV.UK pattern as above; `widgets.mjs` contract `form-errors` on `#checkout-form`.

## Order summary (checkout)
Right column ≥ 1024 px; on narrower screens a `details` at the top of the page whose summary shows the total. Lines: thumbnail, name, size · finish, qty × price, line total; then subtotal, delivery (with destination), total.

## Review panel (checkout)
Directly above the pay button: "You're ordering {n} tiles ({m} designs), delivered to {country} by {method} for {cost}. Total to pay: {total}." Updates when the country or basket changes.

### Evidence and open questions
- Guest checkout relies on the order system accepting an empty `password` and `password_confirm` — **not verified** (no server in this copy). Question for the owners.
- `title` and `dob` are posted empty. They were never required before; confirm the order system tolerates blanks.
- Free delivery "over £150": strictly greater than £150 is assumed; confirm.
- Screen-reader testing (NVDA/VoiceOver) not done — no assistive technology in this environment.
