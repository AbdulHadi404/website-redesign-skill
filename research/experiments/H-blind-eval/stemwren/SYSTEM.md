# Stem & Wren — system

How the components carry out `DESIGN.md` (decisions and reasons) and `PRODUCT.md` (rules). Short imperatives; refer, don't repeat.

## Foundations

**Stack:** static HTML, one CSS file per surface (`assets/site.css` shared + home, `assets/order.css` builder), native ES modules, no dependencies, no build. Native primitives only: `<button>`, radio groups in `<fieldset>`, `<details>`, `<dialog>` (share sheet), `<input type="date">`. Data from `data/*.json` at runtime; `qa/tools/bake-home.mjs` bakes a no-JS copy of the home page's data-driven parts into `index.html`.

**Tokens** (custom properties at the top of `assets/site.css`; role names):

- Surfaces: `--linen` (with the texture `assets/img/linen.webp`, always together; expressive grounds and the builder stage only), `--paper` (panels, bars, forms), `--paper-2` (subtle rows, resting tags, dividers).
- Text: `--ink` (strong), `--ink-2` (secondary), `--muted` (hints ≥ 15 px only). Never body text directly on linen.
- Border: `--line` (field and swatch boundary, 4.21:1 on paper). Selected = 2 px `--ink` border + check mark, never the action colour.
- Action: `--action` / `--action-hover`, white text; primary buttons only, one per view.
- Materials: `--kraft` (tags, the size label), `--kraft-dark` (tag eyelet, notes).
- Status: `--danger` for errors only; there is no success colour (confirmation is words).
- Focus: 3 px `--focus` outline, 2 px offset; paper-coloured inside the footer; `Highlight` in forced colours.
- Type: Familjen Grotesk for all set text (tabular figures by default); Kalam only for names written by hand (wordmark, stem tags, size label, card preview, card text in the review). Order sizes: page title 24 px (28 desktop), section 20 px, body/inputs 17 px, hints 15 px, small 14 px. Home sizes: `--t-14` … `--t-64`.
- Space: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 (`--s-1` … `--s-9`); gutter 16 px phone, 24 px from 720 px.
- Radii: 6 px fields, 10 px buttons, 12 px panels and choice cards, 999 px only for the stage tools and count badges, 3/10 px for kraft tags (one square end, the eyelet end).
- Elevation: page → paper panel → sticky bars (one hairline + soft shadow) → dialog. No surface in a surface except the stage's labels.
- Motion: `--dur-micro` 100, `--dur-small` 150, `--dur-medium` 240, `--dur-large` 300, `--dur-settle` 320 with `--spring-productive`; all zero under reduced motion. Only the bouquet moves (stem lands, re-tie, wrap crossfade); chapters, prices and controls never animate beyond a 100 ms colour change.
- Targets: 44 × 44 px on every control on coarse pointers (swatches drawn 24 px in 34 × 44 hit areas); 24 px floor on fine pointers.
- Sticky budget (phone): bar 56 px + action bar 72 px; `scroll-padding` set from them; both become static under 500 px of height.

## Patterns

### Forms and validation
Validate when Next is pressed; then live on the fields that failed. Three or more errors: the error summary at the top of the panel, focused, `Error:` in the title, each message a link to its field. Fewer: focus the first invalid field. Messages sit between label and field, in the question's words, prefixed "Error:" for screen readers. Required by default; "(optional)" in words on the card message. Every `order_error` carries the payload key of the field (`stems`, `delivery_postcode`, `delivery_date`, `recipient_name`, …). Never disable Next or Send to signal errors.

### Constraints (season, stock, limits)
Prevent, explain, never silently: unavailable stems stay in the tray, resting (grey picture, paper tag) with their reason in words; tapping one shows the reason under the tray. A delivery day that would make a chosen stem unavailable says so on the day; choosing it shows the conflict with a priced repair ("take them out (−£32.10)"). Adding past 25 stems or 6 kinds is refused with the reason.

### Notifications
`#status` (visually hidden, present at load) announces every bouquet change: "Red rose added. 13 stems, Classic. £39.10." `#tray-note` (visible, its own status region) carries refusals. `#pc-result` (status) answers the postcode. Send failures go to `#send-error` (`role="alert"`) inside the action bar. No toasts.

### Loading, empty, error
Data loading: "Getting today's stems…" in the tray; failure: "Today's stems didn't load… try again". Empty bouquet: "Nothing yet. Tap a stem above to start." No JavaScript: a notice with the shop's address; dead controls hidden.

### Navigation
Five chapters inside `/order/`, each a `<fieldset>` with its title as the page's `h1`; only one shown. Chapter list (`nav > ol`, `aria-current="step"`) links only to chapters reached. The browser's back gesture moves between chapters (`history.pushState`); going back never loses an answer. URL: `?b=…&w=…&r=…&t=…` holds the bouquet (never words); `#flowers`, `#wrap-card`, `#delivery`, `#details`, `#check`, `#sent` hold the chapter.

## Components (state matrix)

| Component | Element | States designed and rendered |
| --- | --- | --- |
| Stem card | `<button class="stem-add">` + radio `fieldset.swatches` | rest, hover (fine pointer), pressed (stem dips 2 px), in bouquet (count badge), resting (season/stock words), bouquet full, too many kinds, nudged (tap on a resting stem) |
| Colour swatch | native radio, 24 px dot in 34 × 44 hit area | rest, checked (ink ring), focus-visible, disabled (resting stem) |
| Bouquet line | `li` + two `<button class="step">` | rest, at max (+ inactive with reason), removed (focus to the next line), conflict (red words) |
| Wrap / ribbon / day choice | native radio inside a `label.choice` / `label.day` | rest, checked (ink border + check), focus-visible, off (dashed, reason), conflict (red note) |
| Postcode field | `<input type="text" autocomplete="section-recipient shipping postal-code">` | empty, zone found (price + same-day), outside area, malformed, error |
| Text fields | `<input>` / `<textarea>` with labels above | rest, hover, focus-visible, invalid (2 px danger border + message) |
| Action bar | sticky `div` with Back and Next/Send | chapter 1 (no Back), later chapters, sending ("Sending…", `aria-disabled`), failed (alert above the buttons), hidden after sending |
| Stage | `role="img"` SVG with a model-written name | default bouquet, petite → grand, hat box (no stems), every wrap and ribbon, re-tied |
| Share sheet | `<dialog>` + `showModal()` | picture + link, link only (picture failed), copied |

Evidence for each row: `captures/states/*-after.png`, `audit/after-*`, `qa/*.contracts.json` results in `REPORT.md`.
