# Sanad — system

For the dashboard (`/`, `/?lang=en`) and every product screen that follows it. Written in Phase 4, next to `DESIGN.md`. Short imperatives. There was no component library to restyle: the repo is plain HTML, CSS and one script, so this document *is* the component layer, implemented in `assets/tokens.css` (tokens) and `assets/app.css` (components).

## Foundations

**Stack:** native HTML elements only — `<dialog>`, `<details>`, `<table>`, `<search>`, `<datalist>`, `<button aria-pressed>`; no primitive library (every widget here has a native element). Vanilla JS (`assets/app.js`, no dependencies). Icons: IBM Carbon icons 11.89.0 (Apache-2.0) as an SVG sprite (`assets/icons.svg`). Font: IBM Plex Sans Arabic 5.3.0 via Fontsource (OFL-1.1), self-hosted.

**Tokens** (`assets/tokens.css`; primitive → semantic → component; grammar `--<role>[-<emphasis>]`):

- Colour roles: `--canvas`, `--surface`, `--surface-sunken`, `--surface-hover` · `--text-strong`, `--text`, `--text-muted`, `--text-on-accent` · `--border-subtle` (decorative only), `--border-control` (≥ 3:1) · `--accent`, `--accent-hover`, `--accent-text` · `--selected`, `--selected-text` (neutral-teal fill + a second cue) · `--keystone` (brand spot; never text, never status) · `--danger`, `--danger-strong`, `--danger-subtle`, `--danger-border` · `--focus` · data: `--chart-bar`, `--chart-bar-latest`, `--chart-grid`.
- **No success or warning colours.** Paid is quiet (neutral + check icon). Colour means "late".
- Type (productive set, fixed px): label 12/16 · body 14/20 (Arabic line-height 24) · title 16/24 · heading 20/28 · metric 24/32. Weights 400 and 600. Western digits, tabular by default in Plex (`font-variant-numeric: tabular-nums` set anyway on every number).
- Space: 4 · 8 · 12 · 16 · 24 · 32. Categories: control padding 8–12; inset 16 (panels), 24 (dialog); gap 8–16; gutter 24 desk / 16 phone.
- Radii: control 6 · container 8 · overlay 12 · tag 999 (status tags only). Concentric: dialog 12 = field 6 + inset.
- Elevation: canvas → surface (border, no shadow) → overlay (`--shadow-overlay`, dialog only). Never a surface inside a surface; the summary strip is one surface divided by 1 px rules.
- Motion: `--duration-fast` 120 ms, `--ease-out`; only the dialog backdrop fades; nothing else moves; `prefers-reduced-motion: reduce` removes it.
- Density: one mode. Desk: control 36 px, row 40 px. Coarse pointer: control 44 px. Phone (< 720 px): the table becomes stacked rows ≥ 56 px tall.

**Direction decisions** (`multilingual.md`):
- `lang` + `dir` on `<html>` in the static markup (Arabic default), switched by `?lang=en`.
- Logical properties everywhere; the only physical property is `text-align: right` on numbers, on purpose.
- Numbers: Western digits in both languages (`ar-SA-u-nu-latn`, `en-GB`); always two decimals through one formatter (`fmtMoney`); never built by hand; each number in `<bdi>`/`dir="ltr"` inside RTL text. **Numeric columns are `text-align: right` in both directions.** Currency in the column header or as a unit after the value, never in each cell.
- Dates: Gregorian (`-u-ca-gregory`), day month-name year, parsed as calendar dates (no UTC shift).
- Chart time axis: **left-to-right (oldest → newest) in both languages**, as in most Arabic financial products; the y-axis and its labels stay on the left in both. Recorded here as the single rule.
- Icons: directional icons would mirror (`[dir=rtl] .icon-dir`); none of the current set is directional (sort arrows are vertical).

## Patterns

### Forms and validation
Validate on submit, then live after a failed submit. Two fields → no error summary: focus the first invalid field. Message beside the field, linked by `aria-describedby`, field `aria-invalid="true"`, icon + words, danger colour. Both fields are required, so neither is marked; one hint line says "Both fields are required". Never disable Save. Amount: `type="text" inputmode="decimal"`, accepts `0–9`, `٠–٩`, `٫`, `,` and spaces, normalised before validating. After a successful save, replace the form with a saved state (prevents double submission) and focus its heading.

### Notifications
Field message → section message (load failure, with Retry) → none. No toasts. Filtering announces its result count through one `role="status"` line. Success is the saved state inside the dialog.

### Loading, empty, error
Under 1 s show nothing; then skeleton rows shaped like the final content (no shimmer). Error: the part says what failed and offers Retry; nothing else on the page pretends to have data. Offline: "You're offline" instead of the server message. Empty: first use ("No invoices yet" + New invoice) · no results ("No invoices match …" + Clear filters) · nothing late ("Nothing is past due"). Never "No data".

### Tables and lists
Find: search (id, client in both languages) + status filter chips above the table. Compare: right-aligned tabular numbers, header aligned with its column, 40 px rows, dividers + hover. Sort: one column at a time via a button in the header, `aria-sort`, first click ascending, arrow only on the sorted column. Totals footer sums what is shown (integer halalas). 25 rows, then "Show all N". Below 720 px: each row stacks into label–value pairs, amounts right-aligned in a fixed column.

### Navigation
Places in the sidebar (≤ 5), current marked with `aria-current="page"` + weight + `--selected` fill + the keystone square. Destinations that do not exist in this build are inert labels, never fake links. State (search, status, sort) is in the URL; the language link keeps it.

## Components

## Top bar
Identity and global controls. **Use** once per page.
### Anatomy
1. Mark + wordmark link (home, current language) — required. 2. Greeting `#hello` — optional, 12–14 px muted. 3. Notifications `#bell` — icon-only button with a name. 4. Language link `#lang-toggle` — the other language, in its own script, `lang`/`hreflang`. 5. Avatar — decorative initials.
### States
link/button: rest · hover (pointer) · focus-visible ring · pressed.
### Accessibility
`<header>`; the mark's `<svg>` is `aria-hidden`, the link's name is "Sanad — Dashboard". Test: Tab order mark → notifications → language.

## Sidebar nav
Places. **Don't use** for actions.
### Anatomy
`nav[aria-label] > ul > li`; item = icon (decorative) + label; current item = link with `aria-current="page"`.
### States
rest · hover · focus-visible · current (fill + 600 + keystone) · inert (no destination: plain text, muted, no pointer cursor).
### Behaviour
Desk: 216 px column at the inline start. < 1024 px: horizontal list under the top bar, wraps.

## Summary cell (`#kpis > .stat`)
One defined total. **Use** for 3–5 figures that drive a decision.
### Anatomy
1. Label (12 px muted, sentence case) — required. 2. Value (24 px 600, tabular, two decimals) + unit ("SAR"/"ر.س", 12 px) — required. 3. Rule line — required: what it counts ("14 invoices · sent + overdue"). 4. Icon — only on the late cell.
### Content
No deltas unless a real comparison period exists in the data. Never compact notation for money.
### States
loading (skeleton bar) · error (value "—", rule line says "Not available") · empty (0.00 with "No invoices").

## Status tag (`.tag`)
The API's status, as word + shape + colour.
| Status | Icon | Colour |
| --- | --- | --- |
| paid / مدفوعة | filled check | neutral text |
| sent / مرسلة | clock | neutral text |
| overdue / متأخرة | filled triangle | danger text on danger-subtle |
| draft / مسودة | dashed circle | muted text, dashed border |
12 px 600 text, 24 px tall, radius tag. Not interactive. Lateness is a separate line in the Due cell ("62 days late"), shown for unpaid invoices whose due date has passed.

## Filter chips (`.chips`)
Filter the table by status. `div[role=group][aria-labelledby]` of `button[aria-pressed]`; one pressed at a time (All is the default). Pressed = `--selected` fill + check icon + `aria-pressed="true"`. 32 px (44 px coarse). Counts in the label ("Past due 13").

## Invoice table (`#invoices`)
### Anatomy
caption (title + count) · `thead` sortable headers · `tbody#rows > tr.inv-row[data-id]` · `tfoot` totals of the shown rows.
### States
rest · row hover (pointer) · loading (5 skeleton rows) · empty · no results · error · many (25 + "Show all").
### Accessibility
`th[scope=col][aria-sort]` with a `<button>` inside; the sort result is announced by the status line. Stacked mode keeps table semantics (CSS only) and adds `data-label` for visible labels.

## Past-due panel (`#overdue-list`)
The invoices to chase. Ageing strip (not yet due · 1–30 · 31–60 · 61–90 · 90+ days, amount and count, bars by length) → ordered list of past-due invoices, most late first: client, number, days late, total. "Marked overdue" tag on those the API flags. Empty: "Nothing is past due."

## Revenue chart (`#chart`)
Single series, six months. Columns ≤ 24 px, 4 px rounded top, square at the baseline, `--chart-bar`; the latest month `--chart-bar-latest` with its value on the cap. Y-axis: 5 round ticks, compact ("80K" / "80 ألف") — the only compact numbers on the page. Months under the columns. `figure` + `svg[role=img]` named by the caption, which states the latest month and its change vs the previous month; "Show as table" `details` with every value to two decimals. Tooltip on hover *and* focus per column. The current month is marked "to date".

## New-invoice dialog (`#modal`)
### Anatomy
heading · close button (inline end) · form: Client (`#f-client`, datalist) · Amount before VAT (`#f-amount`) · preview (VAT 15 %, Total — `output` elements) · hint · Save (`#f-save`, submit) + Cancel · `#f-msg` status line.
### Behaviour
`showModal()`; focus to the first field; Esc and Cancel close; focus returns to New invoice. Save → validate → `window.sanadTrack('invoice_create', { amount })` → saved state (heading focused) with Close and New invoice.
### Content
Buttons are verbs: "Save invoice", "Cancel", "Close". Errors: "Enter the client's name", "Enter the amount before VAT, for example 1,250.00", "Enter an amount greater than zero", "Use at most two decimal places".

## Evidence and open questions

- Western digits, Gregorian dates, the net-amount reading of the dialog, and the destinations of Clients/Reports/Settings are **assumptions** (see `DESIGN.md`).
- VAT preview rounds half-up on integer halalas; the API's INV-2026-1050 is one halala lower than half-up — the backend's rule needs confirming.
- Not verified with real users or a screen reader; verified with `a11y.mjs`, `widgets.mjs`, keyboard walks in Chromium and forced-colours renders.
