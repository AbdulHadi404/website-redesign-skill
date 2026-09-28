# Accessibility — decided in the design, proven in the render

A redesign is the moment accessibility is won or lost. About half of the WCAG 2.2 A/AA criteria are settled at art direction or in the design system — contrast, the focus token, target sizes, the 320 px layout, text that can grow, motion, colour-independent status, sticky-UI budgets, consistent help, the sign-in and timeout flows — long before anyone writes ARIA. And the defects a redesign most often *introduces* (removed focus rings, custom widgets, silent toasts, fixed-height cards, colour-only status, focus hidden under a new sticky header) are exactly the ones rule engines cannot see.

This file holds the standard (§1), the decisions that go into `DESIGN.md` (§2), the implementation rules (§3–9), the automated layer (§10), the manual procedure (§11) and reporting (§12). Evidence behind every number: `research/streams/D-accessibility.md` and the lab in `research/experiments/a11y-lab/`.

## Contents

1. Standard and scope
2. Design-time decisions (the Accessibility block of `DESIGN.md`)
3. Native first — component → element map and keyboard contracts
4. Keyboard and focus
5. Names and content
6. Forms and errors
7. Status messages and live regions
8. Visual: contrast, colour, reflow, spacing, forced colours, themes, targets
9. Tables, charts, dashboards, commerce, enterprise
10. Automated checks and what they cannot see
11. The manual procedure
12. Reporting
13. ARIA misuse — what to grep for

## 1. Standard and scope

- **WCAG 2.2 AA is the floor**, on every surface. It is ISO/IEC 40500:2025; the 2026 EN 301 549 behind the European Accessibility Act uses it; meeting 2.2 AA also meets the 2.1 AA the US ADA Title II rule cites and the 2.0 AA of Section 508. Any EU-facing storefront, bank, ticketing or SaaS service is in scope of the EAA (obligations since 28 June 2025; microenterprise service providers exempt). Check current legal dates before quoting them to a client.
- **Aim for two AAA criteria that are cheap when designed in**: 2.4.13 Focus Appearance and 2.3.3 Animation from Interactions.
- **WCAG 3 is a Working Draft** with an undecided contrast method; nothing in it can be conformed to. **APCA** is a design aid for weight, size and dark-mode tuning (`design-theory.md`), never the gate: where WCAG 2 fails, it fails.
- **Preserve what exists.** The audit lists the current site's accessibility features (skip link, live regions, labels, error pattern, reduced-motion code, `lang`, captions) alongside its barriers. A redesign must not regress; the Phase 1 run of `audit.mjs` and `a11y.mjs` is the proof.
- **Never an overlay.** "Accessibility widget" scripts do not repair source defects and can conflict with assistive technology. Fix the source.

## 2. Design-time decisions (the Accessibility block of `DESIGN.md`)

Fill this at Phase 3, before any code. **Gate:** no palette without its contrast table; no component without a mapped element or pattern; no motion without its reduced-motion substitute.

| Decision | The rule | SC |
| --- | --- | --- |
| Contrast table | Every text/ground pair actually used, per theme and per chapter, measured on the real ground (`contrast.mjs`): 4.5:1 text, 3:1 large text (≥ 24 px, or ≥ 18.66 px bold). A darker accent-for-text token. White on a mid brand blue or orange is the classic miss (white on `#3b82f6` = 3.68:1) | 1.4.3 |
| Non-text pairs | 3:1 against adjacent colours for input borders, checkbox and toggle outlines, focus rings, meaningful icons, chart marks and series. A light-grey input border (`#e3e3e3` on white = 1.2:1) fails, and no rule engine reports it | 1.4.11 |
| Focus token | One ring: `outline` 2–3 px solid, 2 px offset, ≥ 3:1 against the control and every surface it lands on; a second colour for dark chapters. Never box-shadow alone (forced colours removes it) | 2.4.7, 2.4.13 |
| Sticky-UI budget | Heights of header, bottom bar, cookie banner and chat bubble, turned into `scroll-padding-top/bottom`; sticky bars become static on short viewports | 2.4.11 |
| Targets | 24 × 24 CSS px floor (or the spacing exception); 44 px for touch-primary actions. Dense tables: row actions ≥ 24 px with ≥ 8 px gaps, or one "Actions" menu button per row. A compact density mode still meets 24 | 2.5.8 |
| The 320 px state | Designed, not discovered: nav collapse, sidebars stacked, toolbars wrapping, tables in their own scroll region, dialogs `max-height: 100dvh`. Only genuinely two-dimensional content (tables, maps, diagrams, editors) may scroll both ways | 1.4.10 |
| Text that grows | No fixed heights or `overflow: hidden` on text containers; type in `rem`; zoom never blocked | 1.4.4, 1.4.12 |
| Colour independence | A second cue for status, trend, required, error, selected, links in text and chart series: icon + text, underline, dash or marker, direct label | 1.4.1 |
| Motion inventory | Each move with its reduced-motion substitute (`motion.md` §6); anything moving or auto-updating > 5 s gets a pause control placed before it; nothing flashes > 3×/s | 2.2.2, 2.3.1, 2.3.3 |
| Forced-colours plan | Controls with transparent borders, focus as outline, SVG in `currentColor`, selected/on states shown by border, underline or icon rather than fill | 1.4.11 in practice |
| Hover content | Tooltips and popovers dismissible (Esc), hoverable and persistent; essential information never only in a hover tooltip — use a toggletip | 1.4.13 |
| Consistency | Navigation and help (contact, chat, help links) in the same relative order on every page; one name and one icon per function across the product | 3.2.3, 3.2.4, 3.2.6 |
| Dragging and gestures | Every drag (kanban, reorder, slider, map, drop-zone) and every multi-finger gesture has a single-pointer alternative ("Move to…", ± buttons) | 2.5.7, 2.5.1 |
| Sign-in and time | Passkeys or email link; paste and password managers allowed; no puzzle or transcription step without an alternative. Timeouts warn ≥ 20 s ahead with a simple extend, and data survives re-authentication | 3.3.8, 2.2.1 |
| Transactions | Checkout, payment, deletion and data submission are reversible, checked, or confirmed on a review step; never ask for the same information twice in one process | 3.3.4, 3.3.7 |
| Media | Choosing video means budgeting captions, transcripts and audio description; no autoplay with sound | 1.2.x, 1.4.2 |
| Component map | The inventory filtered through §3: each component → native element or APG pattern, plus the app's keyboard shortcuts | 4.1.2, 2.1.1 |
| Forms | Error pattern (§6), optional/required convention, `autocomplete` map | 3.3.x, 1.3.5 |
| Announcements | Which messages are `status` and which `alert`; the SPA route-change choice (§4) | 4.1.3 |
| Data | Chart summary + table policy, non-colour encodings (§9) | 1.1.1, 1.4.1 |

## 3. Native first — component → element map and keyboard contracts

**Rules.** Use the native element when one exists (forced colours picks system colours from native semantics, not from ARIA roles). Do not change native semantics (`<h2 role="button">` destroys the heading; the one legitimate exception is `<ul role="list">` when `list-style: none` makes Safari drop list semantics). A role is a promise: every ARIA widget implements its full APG keyboard contract, or it is not an ARIA widget. Never hide focusable content from assistive technology. Every interactive element has a name — visible text first, `aria-label` only for icon-only controls.

| Component | Use | Notes |
| --- | --- | --- |
| Action | `<button type="button">` | never `div`, `span`, or `<a>` without `href` |
| Navigation | `<a href>`; `aria-current="page"` on the current item | links go places; buttons do things |
| Toggle | `<button aria-pressed>`, or a checkbox styled as a switch; `role="switch"` + `aria-checked` for on/off settings | |
| Show/hide, FAQ | `<details>`/`<summary>`; exclusive accordion `<details name>` | or `button[aria-expanded][aria-controls]` |
| Site nav dropdown, mega menu | **disclosure navigation**: `nav > ul > li > button[aria-expanded] + ul` of links | never `role="menu"` — APG's own navigation example does not use it |
| App action menu ("⋯", account) | APG menu button (`aria-haspopup="menu"`, `menu`/`menuitem`, arrows, Esc), or a `popover` list of buttons | only real command menus get `role="menu"` |
| Modal | `<dialog>` + `showModal()`, `aria-labelledby` its heading | focus in, inert background, Esc and focus return come free (verified in Chromium) |
| Non-modal popup, toggletip | `popover` + `<button popovertarget>` (or `command="toggle-popover"`) | popover adds no role and no trap; give it the right semantics |
| Tabs | APG tabs: `tablist`/`tab`/`tabpanel`, roving tabindex, arrows, Home/End | tabs that change the URL are nav links with `aria-current` |
| Select | `<select>`; `appearance: base-select` only as enhancement | keeps native semantics and keyboard |
| Autocomplete | APG combobox (listbox popup, `aria-activedescendant`); `<datalist>` for simple suggestions | |
| Filters, multi-select | checkboxes in a `fieldset`; `<select multiple>` or APG listbox | |
| Data table | `<table>` + `<caption>` + `<th scope>`; sortable = `th[aria-sort]` > `button` | never `role="grid"` for read-only data |
| Editable cells | APG grid (arrows, Home/End, Ctrl+Home/End, PageUp/Down) | only when cells are interactive |
| Tree | APG treeview for files and folders; nested lists + disclosure for navigation trees | |
| Toolbar (≥ 3 related controls) | `role="toolbar"`, one Tab stop, arrows between controls | editors, bulk-action bars |
| Carousel | APG carousel: rotation control first, stops on focus and hover, slides as named groups | prefer no auto-rotation |
| Range, progress, meter | `<input type="range">`, `<progress>`, `<meter>` | custom slider = APG slider |
| Toast, save status, result count | `role="status"` present at load | `role="alert"` only for urgent errors |
| Breadcrumb, pagination, stepper | `nav[aria-label] > ol`, `aria-current="page"` / `"step"` | |
| Search | `<search>` + form + label | |
| Card with one destination | one real link (the title) with its hit area stretched by a pseudo-element | no links or buttons nested in a clickable card |

**Native primitives, September 2026.** Use now: `<dialog>`, `inert`, `:focus-visible`, `popover`, `<details name>`, `<search>`, `:user-invalid`, `field-sizing`, the `forced-colors` / `prefers-contrast` / `prefers-reduced-motion` queries, invoker commands (`command`/`commandfor`, with a script fallback for older browsers). Enhancement only: `dialog closedby` (no Safari), customisable select (no Firefox), `popover="hint"` (no Safari), `hidden="until-found"`. Not yet: interest invokers, `reading-flow`, `focusgroup` (roving tabindex still needs script).

**Keyboard contracts** (APG) that app redesigns break most:

- **Dialog**: focus moves inside on open; Tab cycles inside; Esc closes; focus returns to the invoker.
- **Disclosure**: Enter and Space toggle; `aria-expanded` on the button reflects it.
- **Tabs**: Tab enters on the active tab and the next Tab goes to the panel; Left/Right move and wrap; only the active tab has `tabindex="0"`; activation automatic or on Enter/Space.
- **Menu button**: Enter, Space or Down opens and focuses the first item (Up the last); arrows move; Esc closes and returns focus.
- **Combobox**: the input is the only Tab stop; Down enters the popup; Esc dismisses; Enter accepts; typing types.
- **Listbox**: Up/Down; Home/End above 5 options; type-ahead above 7.
- **Grid**: arrows cell to cell, stopping at edges; Home/End for the row, Ctrl+Home/End for the grid; Tab leaves.
- **Treeview**: Right opens or goes to the first child; Left closes or goes to the parent.
- **Toolbar**: one Tab stop; Left/Right between controls.
- **Carousel**: auto-rotation stops when anything inside is focused; the rotation control is first; Next/Previous do not move focus.

## 4. Keyboard and focus

- Every pointer action has a keyboard equivalent; focus order follows reading order (`order`, grid placement and `row-reverse` must not scramble it); no positive `tabindex`.
- Content that is off-canvas, collapsed or on a hidden slide is not focusable: `hidden`, `inert` or `display: none` — never just `opacity: 0` or a transform.
- **Skip link** first, visible on focus, targeting `<main id tabindex="-1">`; activating it lands in `main` below the sticky header.

```css
:root { --focus: #1f5fd1; }                 /* ≥ 3:1 against every surface it lands on */
.on-dark { --focus: #fff; }
:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
@media (forced-colors: active) { :focus-visible { outline-color: Highlight; } }
html { scroll-padding-top: calc(var(--header-h) + 1rem); }   /* 2.4.11 */
```

Never `outline: none` without a replacement. A box-shadow ring is decoration: it disappears in forced colours and is usually too faint for 2.4.13 (the lab's `rgba(59,130,246,.4)` ring changed zero pixels by 3:1).

**Where focus goes**

| Moment | Focus |
| --- | --- |
| Dialog opens / closes | inside (first control or `autofocus`) / back to the invoker, or a logical fallback if it is gone |
| Item deleted from a list | the next item's primary control, else the previous, else the list heading — never `body` |
| Inline edit saved | back to the edit trigger |
| Submit with errors | the error summary |
| "Load more" | the first new item |
| Wizard step | the step heading |
| SPA route change | update `document.title`, then move focus to the new `h1` (`tabindex="-1"`) *or* announce "Navigated to …" in a polite region — one choice, everywhere |
| Filter, sort, paginate in place | focus stays on the control; the result count is announced |

**Roving tabindex** for tabs, toolbars, radio-like groups, menus and grids: one item `tabindex="0"`, the rest `-1`, arrows move both `tabindex` and focus, Home/End jump (the lab's `fixed.html` has a 15-line version).

**Shortcuts** (enterprise): documented in a `?` dialog; never hijacking screen-reader or browser keys; single-character shortcuts can be turned off or remapped, or work only while a component has focus (2.1.4).

## 5. Names and content

- **Images, decided one by one**: informative → say what matters in it; decorative → `alt=""`; functional → say what the control does; complex (chart, diagram) → a short alt plus a summary or table. Never a filename (`a11y.mjs` flags `IMG_2931.png`). Product photos describe the variant shown.
- **Icon-only controls**: `aria-label` on the control, `aria-hidden="true" focusable="false"` on the SVG. `title` alone is not a name.
- **Label in name** (2.5.3): the accessible name contains the visible words, in order, ideally first — a button showing "Search" is not named "Go". Repeated row actions include the row: "Edit Contoso invoice".
- **Link text** says where it goes; no run of "Read more" to different places.
- **Titles**: "Specific page – Product", updated on every SPA route, prefixed "Error: " after a failed submit.
- **Headings and labels** descriptive and unique, the first two words carrying the meaning; real `h1`–`h6`, never styled `div`s.
- **Language**: `<html lang>`; `lang` on phrases, names and language-switcher items in another language (`Deutsch` with `lang="de"`) — missed by every tool in the lab.
- **Instructions** never rely on shape, position, colour or sound alone ("the green button on the right").
- **Visually hidden utility**: ship both `clip: rect(0 0 0 0)` and `clip-path: inset(50%)` — the `clip-path`-only form is reported as an unlabelled field by IBM's checker.
- **Plain language** (W3C COGA): one instruction per step, literal words, no double negatives, numbers with an alternative, fees stated up front, the most important tasks easy to find, an easy route home, human help findable.

## 6. Forms and errors

The GOV.UK pattern, which is the most tested error design in public:

- A visible `<label for>` above every field; hints as separate text tied by `aria-describedby`; radio and checkbox groups in `<fieldset><legend>`. **Never placeholder as label** — axe passes it; `a11y.mjs` does not.
- Mark **optional** fields "(optional)"; if asterisks are used, explain them once and set `required`. Never colour alone.
- **Validate on submit.** Not on blur; live only after the first submit, or for a character count.
- On error: keep every answer; prefix `<title>` with "Error: "; put an **error summary** at the top of `main` (above the `h1`) headed "There is a problem", **move focus to it**, and link each message to its field (the first field of a group, the first radio). Beside each field: the same words, a hidden "Error:" prefix, `aria-invalid="true"` and the message id in `aria-describedby`.
- **Wording**: what happened and how to fix it, in the label's words ("Enter how many hours you work a week"); separate messages for empty, too long and wrong format; no "invalid", "please", "sorry", "oops" or codes.
- Accept varied formats; strip spaces and punctuation from numbers and codes.
- `type` and `inputmode` right (`inputmode="numeric"` for codes and card numbers); `autocomplete` tokens on every personal-data field (`name`, `email`, `tel`, `street-address`, `postal-code`, `country-name`, `bday`, `organization`, `username`, `current-password`, `new-password`, `one-time-code`, `cc-*`); `spellcheck="false"` on emails and codes.
- Paste allowed everywhere (never `onpaste="return false"`); a show-password toggle; `one-time-code` on OTP fields.
- **Checkout**: `cc-*` and address tokens; a review step before payment; "Billing same as shipping"; price changes announced; strikethrough prices carry words ("Was $40, now $30"), because `<del>` is not announced by default.

## 7. Status messages and live regions

1. The region **exists, empty, before** the update; text goes in later. A region inserted together with its text is often not announced.
2. `role="status"` for toasts, "Saved", result counts, cart updates, loading → loaded. `role="alert"` only for urgent, blocking problems. No `aria-live` on tickers, live charts or chat logs without throttling — announce summaries.
3. Short and self-contained ("Export started. We'll email the file."). To repeat an identical message, clear the region first.
4. Focus never moves to a toast. A toast with an action (Undo) stays until dismissed, or the action is reachable elsewhere.
5. Async: "Loading…" in the status region after ~1 s, then "12 results"; `aria-busy="true"` on the region being replaced.
6. Blocking form errors move focus to the summary — focus does the announcing.
7. A spinner is silent on its own: `<p role="status"><span class="spinner" aria-hidden="true"></span> Syncing…</p>`.

## 8. Visual: contrast, colour, reflow, spacing, forced colours, themes, targets

- **Contrast on the real render**: image chapters, tints, gradients, dark mode. `audit.mjs` measures text on the painted ground; `a11y.mjs` measures form-control boundaries (1.4.11).
- **Non-text contrast failures** to look for: light input borders, ghost buttons, toggles whose states differ only in hue, gridlines carrying meaning, selected rows shown by a pale tint alone.
- **Links in running text are underlined.** Status dots and trend arrows have words; `a11y.mjs` writes achromatopsia and deuteranopia renders — look at them.
- **Reflow** at 320 × 256 and 640 × 512 CSS px: no horizontal page scroll except two-dimensional content in its own labelled, focusable scroll region (`role="region" aria-labelledby tabindex="0"`); embeds `max-width: 100%`; nothing clipped or overlapping; sticky bars do not eat the screen.
- **Text spacing** (line-height 1.5, paragraph spacing 2em, letter 0.12em, word 0.16em): nothing clipped — `a11y.mjs` injects it and captures the result.
- **Forced colours** (Windows contrast themes) override text, background, border, outline and SVG colours, remove `box-shadow`, `text-shadow` and non-URL background images, and put a backplate behind text. Observed: background-only buttons lose their shape, box-shadow checkboxes vanish, colour status dots flatten to one colour, hard-coded dark SVG strokes disappear on the black canvas. Recipe: `border: 1px solid transparent` on controls, focus as outline, SVG in `currentColor`, selected states with a border or icon, native checkboxes with `accent-color`, `forced-color-adjust: none` only on small labelled swatches. Tweak; never build a separate high-contrast theme.
- **`prefers-contrast: more`**: thicker borders, no translucency or blur, muted text promoted to full text colour.
- **Dark theme**: re-table contrast; lighter accent tints on dark grounds; elevation by surface steps and borders, not shadows; logos and transparent images checked; a focus colour per theme; `color-scheme` set so native controls and scrollbars follow.
- **Targets**: measured at 390 in the render, not in source. Stacked text links with a 17 px line height fail the spacing exception.

## 9. Tables, charts, dashboards, commerce, enterprise

**Tables**: `<caption>` (visible or hidden); `<th scope="col">` and `<th scope="row">` for the row key; complex headers split into simpler tables before reaching for `headers`/`id`; numbers right-aligned with `tabular-nums`. Sortable: `aria-sort` only on the sorted `<th>`, a `<button>` named by the column inside each sortable header, direction shown by icon *and* attribute, optionally "Sorted by Amount, descending" in a status region. Row selection: a checkbox per row named by the row, "Select all" with the mixed state. Expandable rows: a button with `aria-expanded` in the first cell. Empty and filtered states in words, announced. Narrow screens: the table scrolls in its own region — never `display: block` on a table, which strips its semantics.

**Charts** (`dataviz.md`): a title that states the insight ("Revenue up 55% since March"); a one- or two-sentence summary; units and period; the data as a table (visible, or in `<details>`); static SVG as `role="img"` named by `<title>`/`<desc>` so hundreds of paths are not exposed; series distinguishable without colour (direct labels, dashes, markers) and ≥ 3:1 against the ground and each other; tooltips reachable by keyboard and touch and compliant with 1.4.13. A good static chart plus its table is the cheap accessible default; an interactive chart needs keyboard navigation between points and a described structure.

**Dashboards**: `h1` = the dashboard's name; each widget a `<section aria-labelledby>` with an `h2`; landmarks for major panels only. **A KPI tile is text**: label, value, change in words ("up 4.2% vs August") with the arrow `aria-hidden`. Filters are a form with fieldsets; the time range a radio group, segmented control or `<select>`; results announce a count. Loading: `aria-busy` plus a status message after ~1 s. Errors per widget, in text. Auto-refresh: a pause control and "Last updated 10:32" — never announce every tick. Notification badges: the count in the link's name ("Notifications, 3 unread").

**Commerce**: colour swatches are radio groups with text names; quantity steppers are named buttons ("Increase quantity of Blue mug") or a labelled number input; add-to-cart confirms through status and updates the cart link's name; faceted filters are checkbox groups that announce result counts; checkout per §6.

**Enterprise**: drag alternatives; a shortcut help dialog; bulk-action toolbars that announce results; wizards as an `ol` with `aria-current="step"`; long forms with section headings, save-draft and data kept across timeouts; ask vendors of embedded components for an Accessibility Conformance Report (VPAT) rather than assume.

## 10. Automated checks and what they cannot see

Three layers, all run at Phase 1 (baseline) and Phase 6/8 (proof):

```bash
node scripts/audit.mjs --base http://localhost:3000 --paths / /app --widths 1440,390 --kind app --out audit/after
node scripts/a11y.mjs http://localhost:3000/app --out a11y/app              # per key template
node scripts/widgets.mjs http://localhost:3000/app a11y/app.contracts.json  # per custom widget
```

- **`audit.mjs`** runs axe-core (WCAG 2.0–2.2 A/AA + best practice, plus the experimental `td-has-header` and `label-content-name-mismatch`) alongside its own checks: contrast on the painted ground, invisible focus, targets, fake controls, clipped text, colour-only status, no-JS and reduced-motion hidden content.
- **`a11y.mjs`** checks what rule engines miss, and writes evidence: names from Chromium's own accessibility tree (placeholder-only and title-only names, label-in-name, filename alts), the heading and landmark outline, a keyboard walk with pixel-diff focus detection (invisible and weak rings, focus hidden under sticky UI on the reverse walk, traps, unreachable controls), pointer-only controls, targets, form-control boundary contrast, `autocomplete` and paste blocking, reflow at 320 and 640, text spacing, forced colours, colour-vision renders and motion (infinite animations, no reduced-motion response, auto-updating content without pause). Output: FAIL / WARN / INFO lines with the criterion and element, `audit.json`, and PNGs to look at (`reflow-320.png`, `text-spacing.png`, `forced-colors.png`, `vision-*.png`).
- **`widgets.mjs`** drives each custom widget by keyboard and checks its contract: dialog (focus in, trap, Esc, return), tabs (roving tabindex, arrows, selection), disclosure (`aria-expanded` toggles), live (the message reaches a region that existed before), form-errors (summary focused and linked, `aria-invalid`, `aria-describedby`), menu-button. Write the contracts file from the component inventory:

```json
[
  { "type": "dialog", "trigger": "#invite-open" },
  { "type": "tabs", "tablist": "[role=tablist]" },
  { "type": "disclosure", "button": "#filters-toggle" },
  { "type": "live", "trigger": "#export" },
  { "type": "form-errors", "form": "#settings", "submit": "button[type=submit]" },
  { "type": "menu-button", "button": "#account" }
]
```

**Coverage, measured.** On a dashboard page seeded with 60 distinct defects, axe alone raised 35–40%; four rule engines together (axe, HTML_CodeSniffer, Lighthouse, IBM Equal Access) raised 55% as failures; adding the two scripts raised 85% (95% with warnings). Calibration on independent W3C APG example pages produced only true positives. A GOV.UK audit of 142 barriers found axe alone caught about 30%. Deque's "57%" is by issue *volume*, dominated by contrast, names and labels. So: a clean rule-engine run is roughly half the story, and a Lighthouse score is not a conformance measure (46 → 100 between two pages that differ by sixty defects, most of which it cannot see).

**Never automated** — the residue §11 exists for: whether alt text, link text, headings and error messages are *right*; whether bold text should be a heading or a grid a table; whether focus lands somewhere sensible after each action; screen-reader verbosity and whether state changes are spoken; whether motion is vestibular-triggering; captions' accuracy; consistency across pages; gesture alternatives; sign-in and transaction flows.

**Tool gotchas.** `@axe-core/playwright` needs a page from `browser.newContext()`, not `browser.newPage()`, and hoists its own newer `playwright-core` (launch with an explicit `executablePath`). pa11y's axe runner does not run the `wcag22aa` tag (no target-size) and, by default, promotes axe's needs-review items to errors — set `levelCapWhenNeedsReview: "warning"`. IBM's checker (inject `accessibility-checker-engine`'s `ace.js` with Playwright; its CLI downloads the engine at runtime) catches keyboard and widget heuristics axe lacks but is noisy: skip link "not in a landmark", `tabindex="0"` on a scroll region and `clip-path`-only hidden labels are false positives. Tools treat hidden content differently: axe skips closed dialogs, so contracts must open things to test them.

## 11. The manual procedure

Per key template (landing, list/table, detail, form or checkout, dashboard) and per critical flow. Fix every FAIL from §10 first; record each step's result in the report.

1. **Keyboard walk.** Tab from the top: the first stop is a visible skip link that lands in `main` below the header; every pointer-usable control is reached in reading order with a visible indicator; nothing invisible takes focus; focus never sticks. Shift+Tab back: nothing focused is hidden under sticky UI. Operate each widget by its contract (§3): Enter and Space, arrows, Esc closes and focus returns, deleting a row moves focus sensibly. At 390: the menu toggle has a name and `aria-expanded`, Esc closes it, the background is inert while it covers the page.
2. **Names, roles, states** from the accessibility tree (`a11y.mjs` prints it; `locator.ariaSnapshot()` for regression tests): every control has a meaningful, unique name containing its visible label; states present and updating (expanded, selected, pressed, checked, current, invalid, required); the heading outline reads like a table of contents; one `main`, named `nav`s; decorative images absent.
3. **Announcements**: every async action (save, add to cart, filter, delete, export, copy) produces a message in a pre-existing region; loading longer than a second says so.
4. **Forms**: submit empty, then with wrong formats — §6 end to end, including paste, show-password and no validation on blur.
5. **Zoom and reflow**: 320 × 256 and 640 × 512, and 200% zoom at 1280.
6. **Text spacing** render: nothing clipped or overlapping.
7. **Forced colours**, dark and light: every control has a boundary; focus, icons, selected states and charts visible.
8. **Colour vision** renders: every status, trend, series, required marker and error still distinguishable.
9. **Motion**: under reduced motion no parallax, auto-rotation, large movement or smooth scrolling; without it, anything moving > 5 s has a pause control before it.
10. **Contrast on real renders**: dark mode and image or tinted chapters; non-text pairs against the `DESIGN.md` table.
11. **Content pass**: unique titles, descriptive headings, link purpose, alt right for each image's role, `lang` on foreign phrases, error wording, plain language.
12. **Across pages**: compare the banner, navigation and footer trees of 3–5 routes — same order, same names for the same functions, help in the same place.
13. **Screen-reader smoke test** if NVDA, JAWS or VoiceOver is available (10 minutes per template): the headings list reads as an outline; the landmarks list is short and named; each field announces label, required, hint and error; each custom widget announces role, name and state changes; toasts are spoken once; dialogs announce their name and return focus. Otherwise list it as a recommended follow-up — an agent cannot reproduce browse mode, verbosity or VoiceOver + Safari behaviour. Minimum matrix for a product: NVDA with Chrome or Firefox, VoiceOver with Safari on macOS and iOS; add JAWS for enterprise buyers and TalkBack for Android-heavy audiences.

## 12. Reporting

The hand-off states: tool versions and counts before and after (axe violations, `a11y.mjs` FAIL/WARN, contracts passed); the manual steps run and their results; known issues with their criterion and severity; what still needs verification with real assistive technology. **Gates**: axe 0 violations at WCAG 2.2 A/AA; `a11y.mjs` 0 FAIL, every WARN triaged in writing; every custom widget's contract passing; the manual procedure recorded; the screen-reader smoke test done or explicitly deferred. For EU-facing services and public-sector sites, offer a draft accessibility statement.

## 13. ARIA misuse — what to grep for

| Misuse | Fix |
| --- | --- |
| `role="button"` (or any widget role) on `div`/`span` without `tabindex="0"` and Enter/Space; clickable `div`, `span`, `img` or `td` | `<button>` or a link |
| `<a>` without `href`, `href="#"` or `javascript:` as an action | `<button type="button">` |
| `aria-label` on a generic `div`, `span` or `p` | visible text, a heading, or a real role with a name |
| `aria-hidden="true"` on focusable elements or their ancestors | `inert` or `hidden` |
| `role="menu"` / `menubar` / `menuitem` for site navigation; `aria-haspopup="true"` on disclosure buttons | `nav > ul` of links + disclosure buttons with `aria-expanded` |
| `role="tablist"` for links to other pages; tabs without `aria-selected`/`aria-controls`, all in the Tab order, no arrows | nav links + `aria-current`; APG tabs with roving tabindex |
| Redundant or overriding roles (`<nav role="navigation">`, `<h2 role="button">`) | remove |
| `aria-label` contradicting the visible text | name = visible label, extra words after |
| `aria-labelledby` / `describedby` / `controls` pointing at missing or duplicate ids | unique ids that exist |
| Invalid values or attributes on the wrong role (`aria-sort="up"`, `aria-sort` on a `td`) | valid tokens on the right role |
| `aria-expanded` missing, never updated, or on the panel | on the controlling button, updated |
| `role="dialog"` without a name, focus management or inert background | `<dialog>.showModal()` + `aria-labelledby` |
| `aria-live` added with its text, on huge containers, or `role="alert"` for routine toasts | a pre-existing `role="status"` |
| `role="presentation"` on data tables or focusable elements; `role="grid"` on read-only tables; `role="application"` | remove |
| Unhidden SVG icons inside named buttons; `role="img"` SVG without a name | `aria-hidden="true" focusable="false"` on the icon; name on the control |
| `tabindex` > 0; `tabindex="0"` on static text | remove (`0` only on scroll regions and widgets) |
| `title` or placeholder as the only name | `aria-label` or visible text; `<label>` |
