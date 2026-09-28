# Harbourside permits: system

For the start page and the application. Decisions and their reasons are in `DESIGN.md`; this file says how components carry them out. Tokens live at the top of `assets/site.css`.

## Foundations

**Stack:** static HTML, one stylesheet, one script, no framework, no component library, no build. Native elements for every control. Font: Atkinson Hyperlegible Next 400/700, self-hosted (`assets/fonts/`, OFL 1.1, `@fontsource/atkinson-hyperlegible-next@5.3.0`).

**Tokens** (primitive → semantic; components use only semantic names):

- Primitives: `--harbour-9 #0b4f6c`, `--harbour-10 #073a50`, `--harbour-2 #eef5f9`, `--gold #f2c14e`, `--ink-12 #0f2733`, `--ink-11 #3e5663`, `--ink-6 #b9c6cd`, `--red-9 #b42318`, `--white`.
- Colour roles: `--canvas`, `--surface-tint`, `--text`, `--text-secondary`, `--border-input` (= text), `--border-rule`, `--action`, `--action-hover`, `--on-action`, `--focus`, `--focus-ink`, `--danger`.
- Type (productive set, two breakpoints at 641 px): `--type-small 16px`, `--type-body 17px → 19px`, `--type-h2 22px → 27px`, `--type-h1 32px → 44px`; line heights 1.45 / 1.15; weights 400 and 700 only; `tabular-nums` in the price table and reference.
- Space: `--space-1 4px`, `-2 8px`, `-3 12px`, `-4 16px`, `-5 24px`, `-6 32px`, `-7 48px`, `-8 64px`. Control padding 8/12 px; gutter 16 px (phone) / 32 px.
- Radii: controls and panels 0; buttons 4 px.
- Elevation: one flat canvas; the tinted panel is the only second surface; no shadows except the button's 2 px bottom edge (`--action-hover`).
- Motion: none.
- Density: one mode (public service). Controls 48 px high; radio/checkbox boxes 32 px with the whole label clickable.

## Patterns

### Forms and validation
Validate when the resident presses Continue (or Send), never on blur. After a failed Continue, re-validate the failed fields as they change. Always show an error summary — even for one error — at the top of `main`, above the step's heading: heading "There is a problem", a list of links to each field (the first radio of a group), focused on show; prefix `document.title` with "Error: ". Beside each field: the same message, after the label and hint, with a visually hidden "Error:" prefix, `aria-invalid="true"` and the message id in `aria-describedby`; a 4 px `--danger` bar to the left of the whole field group (the message says it in words). Messages say how to fix it, in the question's words. Every field is required except proof of address, which says "(optional)". Never disable Continue or Send; while sending, the button reads "Sending…" and further presses are ignored.

### Notifications
Field message → error summary → the zone answer panel (`role="status"`, polite, present at load) → send failure (a message block at the top of the check page, focused) → full-page confirmation (panel with reference). No toasts, no modals.

### Loading, empty, error
`zones.json` is small: nothing is shown while it loads (under 1 s). If it fails: on the start page the zones section says "Zones and prices could not be loaded. Refresh the page to try again."; in the application the street question says the same and Continue explains why it cannot go on. Offline and server failure on Send are told apart ("You are not connected…" / "Your application was not sent…"), and both keep every answer.

### Tables
One table: zones and prices on the start page. `<caption>`, `th scope="col"` and a row header per zone; prices right-aligned, tabular figures. Below 480 px each zone row becomes a block (display: block on rows; each price cell carries its column name via a visible label), so nothing scrolls sideways.

### Navigation
Linear: header link to the start page, a Back link on every step (to the previous step, or to the start page from step 1), Change links on the check page that return to it. The step lives in the URL hash (`#street`, `#permit`, `#vehicle`, `#details`, `#proof`, `#check`, `#done`); browser Back works. On every step change: update `document.title` ("Which street do you live on? – Resident parking permits – Harbourside Council"), then move focus to the step's `h1` (`tabindex="-1"`).

## Components

## Button
The one action per screen.
**Use when** — continuing, sending, starting. **Don't use when** — going back or changing an answer → a link.
### Anatomy
1. label — verb first: "Start now", "Continue", "Send application", "Print this page" (secondary: link style).
### States
rest `--action` fill, `--on-action` text, 2 px bottom edge `--action-hover` · hover (pointer only) `--action-hover` fill · focus-visible `--focus` fill, `--focus-ink` text, 3 px `--focus-ink` bottom bar, outline in forced colours · pressed: moves down 2 px, edge removed · busy: label "Sending…", `aria-disabled="true"`, focus kept.
### Behaviour
Full width below 641 px; 48 px minimum height; transparent 2 px border so forced colours keeps its shape.

## Text input / select / file input
### Anatomy
label (700 when it is not the page heading) → hint (`--text-secondary`) → error message (`--danger`, 700) → control.
### States
rest 2 px `--border-input` · focus-visible 3 px `--focus` outline + 2 px inset `--focus-ink` · error 2 px `--danger` border (+ 2 px inset on focus) · filled: no change.
### Content
Widths hint at the answer: reg and postcode 10 ch, others full.

## Radios and checkboxes
Native inputs, `accent-color: var(--action)`, 32 px boxes, label beside, `fieldset` + `legend` per question. No custom drawing.

## Error summary
`div.error-summary` with `h2` "There is a problem" and a list of links; 4 px `--danger` border; `tabindex="-1"`; focused on show; hidden when empty.

## Zone answer panel
`--surface-tint` block, `role="status"`. Content: "Quay Street is in zone A, Old Harbour." + controlled hours. Empty until a street is chosen.

## Summary list (check answers)
`dl` of rows: question (`dt`), answer (`dd`), "Change" link with a visually hidden suffix naming the answer ("Change registration number"). "Not provided" for the optional file.

## Confirmation panel
`--action` panel, `--on-action` text: `h1` "Application sent", "Your reference number" + the reference in 700, `tabular-nums`, 27/32 px. Below: what happens next.

### Evidence and open questions
The patterns follow the GOV.UK Design System source read on 2026-09-28. Not verified with residents. Whether the file must be required, whether the back end has a session limit, and where the terms and conditions live are open (see `REPORT.md`).
