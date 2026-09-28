# Milkline herd screen: system

Phase 4 companion to `DESIGN.md`. Scope: `app/`. Rules are short imperatives, with numbers where they exist.

## Foundations

**Stack:** static HTML + one CSS file + one vanilla JS file. No component library existed before and none is added. Native primitives: `<dialog>`, `<search>`, `<table>`, `<form>`, `:focus-visible`, `prefers-*` queries. One service worker (`app/sw.js`, no library). Fonts are self-hosted OFL files (see `app/fonts/LICENSE-*.txt`).

**Tokens** (all in `app/app.css` `:root`; grammar `--{category}-{role}[-{emphasis}][-{state}]`):

- *Primitive:* `--navy-900 #14365c`, `--sky-500 #2fa4d7`, `--sky-700 #0b5f8a`, `--sky-800 #094d70`, `--red-700 #b42318`, `--amber-400 #f0b429`, `--amber-800 #8a5300`, `--green-700 #1b6b3a`, and the neutral navy-tinted scale `--grey-0…900`. Components never use them directly.
- *Semantic colour:* `--color-canvas`, `--color-surface`, `--color-surface-sunk`, `--color-text-strong`, `--color-text`, `--color-text-muted`, `--color-border`, `--color-border-control`, `--color-action`, `--color-action-hover`, `--color-on-action`, `--color-action-text`, `--color-bar`, `--color-on-bar`, `--color-on-bar-muted`, `--color-selected`, `--color-focus`, `--color-focus-on-bar`, `--color-{alert|watch|checked|info}-{text|subtle|solid|on-solid|border}`. The dark theme re-maps these semantic tokens only.
- *Type* (productive, fixed): `--font-heading: Nunito`, `--font-text: "Atkinson Hyperlegible Next"`. Roles, as size/line-height: `detail` 14/20, `label` 15/20, `body` 17/24 (16/24 on a fine pointer), `title` 20/26, `heading` 24/30, `name` 28/32. Weights: text 400/700, heading 800. Every figure uses `tabular-nums`.
- *Space:* 4 · 8 · 12 · 16 · 24 · 32 · 48, as `--space-1…7`. Semantic names: `--space-control` 12/16, `--space-inset` 16 (phone) / 24 (desktop), `--space-gap` 8/12, `--space-gutter` 16/24.
- *Radii:* `--radius-control 10px`, `--radius-surface 14px`, `--radius-sheet 20px`, `--radius-pill 999px` (badges only). Concentric rule: a card inside a 16 px inset uses 14. Nothing is nested inside a card.
- *Elevation:* canvas → surface (1 px border, no shadow) → layer (dialog: `--shadow-layer`, scrim `rgb(8 20 33 / .55)`; snackbar: `--shadow-layer`). Never put a surface inside a surface.
- *Motion:* `--dur-fast 120ms`, `--dur-base 200ms`, `--ease-out cubic-bezier(.2,.8,.2,1)`. Animate only the sheet entrance, the snackbar opacity and the refresh icon while busy. Under reduced motion, use opacity only and no spin.
- *Targets / density:* `--target-min 48px`, `--target-row 56px` on `(pointer: coarse)`; on `(pointer: fine)`, `--target-min 36px` and `--target-row 44px`. There is one density; density changes heights only, never font size.

## Patterns

### Forms and validation
Validate on submit only. The note form's single rule (not empty) shows its message under the field and keeps focus there. Search is never validated. Never disable a submit button to signal invalid input. Label every field visibly; a placeholder is never the label.

### Notifications (quietest first)
1. **Inline result**, used where the change is visible: a checked cow's row and card change to "Checked 05:52"; a saved note shows "Saved on this phone at 05:52" under the form.
2. **Status chip** in the app bar, used for sync state. It is always present and uses `role=status`.
3. **Banner**, used for offline, error and stale data. There is one at a time, at the top of the content, with a heading, one sentence and a Retry button. It is not dismissible, because it clears itself when the data is fresh.
4. **Snackbar** (`#toast`), only after "Mark as checked", because the sheet closes and the action needs Undo. It is a polite live region and never takes focus. It stays 10 s, pauses while hovered or focused, and has a Dismiss button.
5. **Modal**, used for nothing except the cow detail sheet, which is content, not a message.

### Loading, empty, error
- **Loading** (first load, nothing saved): the list area shows "Loading the herd…" after 300 ms. The chip says "Updating…". After 10 s without a response, switch to the error banner.
- **Refreshing** (data already on screen): the content stays; the chip says "Updating…" and the refresh icon turns.
- **Offline, with a saved copy:** info banner "No signal. Showing the herd as saved on this phone at 05:42 (Morning milking, 28 Sep)." + Retry. The chip says "No signal · 05:42".
- **Offline, nothing saved:** a banner in the list's place, "No signal, and this phone has no saved copy of the herd yet. Connect once (Wi-Fi in the house or yard) and the herd will be kept for next time." + Retry.
- **Stale** (the saved copy is from an earlier date or milking): the banner title says "This is not this milking's data".
- **Server error or unreadable data:** the same as offline, but the heading reads "Couldn't update the herd".
- **Empty (no flags):** in the Needs attention area, "Nothing needs attention this milking." in muted text, with no illustration.
- **All flagged cows checked:** "All 5 flagged cows checked." (quiet success).
- **No search match:** "No cow matches '2999'. Check the tag number, or clear the search." + Clear search.

### Tables and lists
- **Find:** search at the top, sticky. It matches tag digits (ignoring "IE", spaces and case) and names (prefix or substring). A `role=status` count says "3 cows match".
- **Compare:** tabular figures; numbers right-aligned; units in the header ("Yield (L)", "Cond. (mS/cm)").
- **View one:** the detail sheet. Row click is a pointer convenience; the name `button` is the real control.
- **Act:** mark checked from the sheet. There is no bulk action (non-goal).
- **Default sort:** tag ascending (the order the sync service sends, which is the order users know). Needs attention is sorted alert → watch, then by the largest yield drop.
- **Responsive:** at ≥ 1024 px, 9 columns; 768–1023, 5 columns (Tag, Cow, Yield, Cond., Status); < 768, 3 columns (Tag, Cow + status badge, Yield + change). No horizontal scroll at 320 px.

### Navigation
There is one place. On desktop the sidebar is `nav[aria-label=Main]` with Overview (`aria-current=page`) and Herd (`#herd`) as links, and Rota, Vet log and Settings as non-interactive "Coming soon" text. Phones have no navigation bar.

## Components

## App bar
The brand chrome, which also tells you whether the data is fresh.
**Use when:** always, once per screen.
### Anatomy
1. Mark (inline SVG, required, `aria-label="Milkline"`).
2. Farm name (required, from `data.farm`).
3. Status chip (required, `#sync-status`, `role=status`).
4. Refresh button (required, `#sync-btn`, icon + "Refresh").
### States
Chip: `fresh` "Updated 05:42" · `busy` "Updating…" · `offline` "No signal · saved 05:42" · `error` "Not updated · saved 05:42" · `none` "No data yet". Refresh: rest · hover (pointer) · focus-visible (white ring) · pressed · busy (`aria-disabled=true`, icon turns, the label stays "Refresh").
### Accessibility
Chip messages are announced politely. Refresh keeps focus while busy. How to test: Tab reaches Refresh; activating it announces "Updating…" then "Updated hh:mm".

## Search field
Find one cow by tag digits or name.
### Anatomy
1. Label "Find a cow" (visible).
2. Hint "Tag number or name".
3. `input#herd-search[type=search]`, 18 px, 56 px tall.
4. Keypad toggle `button#kbd-toggle[aria-pressed]`, "123" / "ABC".
5. Result status `p#search-status[role=status]`.
### States
rest · focus-visible (3 px ring) · filled (a clear button appears: native search cancel plus Esc) · no match (the empty-state message in the list) · numeric keypad on/off (`aria-pressed`, `inputmode` switches, the choice is remembered on this phone).
### Content
Match on tag digits: "1629", "ie1629" and "IE 1629" all find Hazel.

## Attention card
One flagged cow, with the reason in numbers.
**Use when:** status is `alert` or `watch`. **Don't use** for OK cows; they belong to the herd list.
### Anatomy
1. Status badge (word + shape).
2. Name (Nunito 800, 20 px).
3. Tag.
4. Reasons: "Yield 33.1 L (−8.8)", "Cond. 6.77".
5. Checked marker (optional).
6. Chevron.
The whole card is one `button` (`data-tag`).
### States
rest · hover (pointer: surface-sunk) · focus-visible · pressed (surface-sunk) · checked (muted card, "Checked 05:52" tick, moved to the end of the list, not counted in "to check").

## Status badge
### Variants
`alert` (solid red, white text, octagon) · `watch` (amber fill with amber-800 border, dark text, triangle) · `checked` (subtle green, tick) · `ok` (the plain word "OK" in muted text, no fill, no icon).
### Rules
Never show a badge without its word. Never colour an OK cow.

## Herd table
### Anatomy
`caption` "Herd, 40 cows, morning milking" (visually hidden on phones, where the heading says it). Columns: Tag, Name (button), Group, Yield (L), Change, Cond. (mS/cm), Status, Milked, Days in milk.
### States
rest · row hover (pointer) · focus-visible on the name button · checked row (tick + "Checked") · filtered (the count is announced) · no match · loading · offline (the saved copy renders normally under the banner).

## Cow detail (dialog)
### Anatomy
1. Status badge.
2. Name (28 px, `h2`, the dialog's label).
3. Tag and group.
4. A figures grid: Yield (with change), Conductivity (with "herd median x.xx this milking"), Days in milk, Last milked.
5. Primary: "Mark as checked" (becomes "Checked 05:52 · Undo").
6. "Saved on this phone" hint.
7. Close button (visible text).
### Behaviour
Opens with `showModal()` and focus goes to Close. Esc or Close shuts it, and focus returns to the invoking button. On phones it is a bottom sheet (full width, `max-height: 92dvh`, scrolls inside); on desktop a 440 px panel.
### Accessibility
`aria-labelledby` the name. How to test: open from the keyboard, Tab cycles inside, Esc closes, and focus returns to the same row.

## Snackbar (`#toast`)
### Anatomy
1. Message.
2. Undo button.
3. Dismiss button.
### Rules
Only for "checked". It is a polite live region, present at load. It stays 10 s, pauses on hover and focus, and never steals focus.

## Note form
### Anatomy
1. Label "Note for the relief milker".
2. Hint "Kept on this phone. Sharing notes with other phones isn't connected yet."
3. `input#note[data-track=note_add]`.
4. Submit "Save note".
5. Result status.
### States
rest · focus-visible · error (empty) · saved (inline, with time) · saved note shown under the form with Delete.

## Evidence and open questions
- What does `change` compare against: the previous milking, or the cow's average? It is shown as a signed number in litres next to yield, as before. **Assumption:** litres.
- What rule sets `alert` vs `watch`? The UI does not invent thresholds; it shows the two measures the product says it uses.
- Should "checked" and notes sync to other phones? That needs an API, which is outside this job. For now both are kept on the device and labelled as such.
