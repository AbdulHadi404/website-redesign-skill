# Product UI — when the surface is used, not visited

Read this whenever Phase 0 classifies the surface as an **application** (a logged-in product, an admin, a dashboard, a console) or a hybrid (sign-in, onboarding, docs, a configurator). Everything else in this skill was written for marketing pages, where a stranger forms an impression in seconds and may never return. An application is the opposite case: the same people spend hours in it, every day, doing the same tasks. The identity carries over; the expression does not.

> Carry the brand's **identity** into the product — mark, colours and their meanings, the voice of the display face, the status vocabulary. Leave its **expression** — display scale, editorial pacing, persuasive copy, photography, decorative motion — on the marketing site.

The published design systems say this outright. IBM Carbon keeps two type sets: a **productive** set "for product pages with high information density housed in containers", on a 14 px base with **fixed** headings, and an **expressive** set for web pages on a 16 px base with **fluid** headings — and warns not to use the fluid styles inside a container. Material 3 splits its scale into *display* and *headline* roles for expressive moments and *title*, *body* and *label* roles for the interface.

## 0. Classify the surface before anything else

| Signal | Marketing (visited) | Application (used) |
| --- | --- | --- |
| Who | strangers, once or twice | the same people, daily |
| Session | seconds to minutes, scrolling | minutes to hours, task after task |
| Success | remembered, persuaded, converted | the task done fast, correctly, without strain |
| Reading mode | glancing, then reading a story | scanning, comparing, entering data |
| Density | low; one idea per viewport | as high as comprehension allows |
| Navigation | a few pages, linear story | many tools, jumped between constantly |
| Copy | persuasive, memorable | labels, states, instructions, 2–4 words (NN/g) |
| Motion | can carry the concept | only feedback and live state |
| Imagery | photography can carry the concept | almost none; product, data, a brand graphic at the door |

A redesign that treats an application like a landing page fails its users slowly: every screen costs a scroll, every label is a little harder to read, every visit replays an entrance nobody needs. If the product has a marketing site, **the family test runs against that site's identity, not its layout**.

Hybrids get the rule of their job: sign-in, empty states and onboarding are **doors** — one brand moment, then out of the way. Docs are reading surfaces (body 16 px, measure 60–75 ch). A pricing calculator inside the app is a tool.

## 1. Type for daily use (fixed, not fluid)

Numbers from the systems' source files (Carbon `packages/type/src/styles.ts`, Material `md-sys-typescale` tokens):

| Role | Carbon (productive) | Material 3 | Use |
| --- | --- | --- | --- |
| Label / caption | label-01 12/16 | label-medium 12/16 · label-small 11/16 | helper text, meta, table captions — 12 px is the floor; 11 px only for a single uppercase word |
| Body (dense) | body-compact-01 14/18 | body-medium 14/20 | table cells, list rows, controls |
| Body (reading) | body-01 14/20 · body-02 16/24 | body-large 16/24 | descriptions, notes, anything read in sentences |
| Small heading | heading-compact-01 14/18 semibold · -02 16/22 semibold | title-small 14/20 · title-medium 16/24 (500) | panel titles, card titles, table group heads |
| Section heading | heading-03 20/28 | title-large 22/28 | the few section titles on a page |
| Page title | heading-04 28/36 · heading-05 32/40 | headline-small 24/32 · -medium 28/36 | one per screen |
| Display | expressive only (fluid, up to 60 px+) | display 36–57 | not in the product — sign-in at most |

Rules that follow:

- **Base 14 px, line height 20**; reading text 15–16 px. Nothing a user must read below 12 px. Minimum 4.5:1 on every surface the text sits on — including hover rows, zebra stripes, secondary panels and selected states (§6).
- **Fixed headings.** Page titles 24–32 px. The marketing site's 60–120 px display sizes never enter the product.
- **The brand's display face gets one job**, typically the page title (and the sign-in / greeting moment). Panel titles, record names in lists, numbers and labels use the UI face, where weight does the work: 500–600 at 14–16 px scans faster than a serif at 20 px.
- **Numbers**: tabular lining figures in the UI face, right-aligned in tables. KPI numerals 24–32 px, semibold — not a decorative display cut.
- **Caps.** NN/g's glanceable-type study found uppercase faster *for a word or two in isolation* — so short column heads and one-word nav group labels may be uppercase at 11–12 px with 0.04–0.06 em tracking. Multi-word strings, statuses read in sequence, window bars with sentences in them, and anything scanned down a column stay sentence case. Monospace only for code, IDs and values the user copies; timers can use tabular figures instead.
- **Italic emphasis, eyebrows over every heading, and long leads under every title are marketing devices.** In an app they cost height on every screen and are read once.

## 2. Density and layout

- **Density is a setting of the task.** Material: increase density for lists, tables and long forms, where seeing more rows gives "relational context"; keep it lower for focused tasks and small inputs. Default to comfortable (rows 40–48 px), offer compact (32–36 px) where tables dominate; phones stay comfortable.
- **The page header is one band**, 72–120 px: title, one-line description (optional), actions right-aligned. No eyebrow + serif display + two-line lead stack.
- **Content above the fold.** On a 1280 × 800 laptop the first rows of the page's main object (the table, the board, the form) are visible without scrolling.
- Page padding 24–32 px desktop, 16 px phone; gaps between sections 20–32 px — not the 100–180 px chapter padding of a marketing page.
- One scroll region per page where possible; side panels scroll independently.
- Cards only for objects that are card-shaped (a record with a few fields and actions). Lists of records are tables or ruled lists.

## 3. Navigation and efficiency

- A persistent sidebar grouped by task (≤ 7 items per group); the current item marked by more than colour (weight, background, `aria-current`). On phones, a top bar with a labelled **Menu** drawer.
- Browser tab titles per page (`Campaigns · Product`) — people run several tabs.
- **Accelerators for experts** (Nielsen heuristic 7; NN/g's complex-application guideline "help users adopt more efficient methods"): a command palette (⌘K / Ctrl K) that jumps to any page the user may open, keyboard shortcuts for frequent actions, and hints that teach them in context. Invisible to novices, fast for everyone after week one.
- Staged disclosure: advanced settings behind a clear "More options"; never more than two levels.
- Record detail in a **side panel** over the list, not a modal that hides the data being referred to (NN/g, data tables).

## 4. Components and states

- **Every control has hover, active, focus-visible, disabled and — for anything that talks to a server — busy states.** Every data region has loading (skeleton), empty (why + one action), error (what happened + how to recover) and populated states.
- Buttons 32–40 px tall; one primary per view. A header button that opens a form yields primacy to the form's submit while it is open.
- Inputs: visible boundary **≥ 3:1** against the surface (WCAG 1.4.11 — a 24 % grey hairline is not enough), label above, helper text below, error text next to the field.
- Focus ring 2 px, ≥ 3:1 against the adjacent colours (WCAG 1.4.11 / 2.4.13); the brand accent often fails this on a light ground — use its darker text variant for the ring.
- Switches: the off-track ≥ 3:1 against the surface; state shown by position and colour.
- Tables (NN/g's four tasks: find, compare, view/edit, act): first column a human-readable identifier; related columns adjacent; numbers right-aligned; hover highlight; 1–2 inline actions per row, the rest in a menu; batch actions via checkboxes; filters visible and their active state obvious; sticky header on long tables; on phones, rows become stacked records rather than a sideways-scrolling grid.
- Status: a dot + a word (never colour alone), sentence case, consistent vocabulary across the product.
- Notifications: inline notices next to what they concern; toasts only for background confirmations; `role="status"` / `role="alert"` so assistive tech hears them (WCAG 4.1.3).

## 5. Accessibility baseline (WCAG 2.2 AA, plus what heavy use adds)

- Text 4.5:1 (large 3:1) on every real ground; non-text 3:1 for input borders, focus rings, switch tracks, chart marks, icons that carry meaning.
- Targets ≥ 24 × 24 CSS px or spaced so a 24 px circle around each does not overlap its neighbour (2.5.8); 44 px on touch layouts.
- Keyboard for everything: logical order, visible focus never hidden by sticky bars (2.4.11), Escape closes overlays, arrow keys inside composite widgets, a keyboard path for every drag interaction (2.5.7).
- Skip link to the main region; landmarks; one `h1`; named icon-only buttons.
- Reflow at 320 CSS px (1.4.10), 200 % zoom (1.4.4), user text-spacing overrides (1.4.12) without loss.
- `prefers-reduced-motion` removes decorative motion; live-state indicators may pulse but must also say it in words.
- Run an automated checker (axe-core) on every route in both themes, then walk the top tasks with the keyboard. The checker finds perhaps a third of real problems; the walk finds the rest.

## 6. Visual comfort for long sessions

- **Light mode performs better for most people's reading acuity; dark mode helps people with cataracts or cloudy optics and in dim rooms** (NN/g). Offer both, follow the OS by default, remember the choice. Never pure black; lift text in dark mode (not pure white on near-black — halation).
- A warm or off-white ground reads calmer than #fff over hours; keep large fields of saturated colour out of the work area — the accent marks action and live state only.
- Consistency is comfort: the same component in the same place on every screen, so spatial memory does the work.
- Nothing animates for attention except live state; transitions ≤ 200 ms.

## 7. Imagery and brand moments in a product

- **Budget two or three brand moments** — sign-in, the first-run/empty states, perhaps the dashboard greeting. Everything else is quiet and consistent.
- **Sign-in is a utility screen** (Linear, Vercel, Stripe, Attio all put the form first on its own ground): the user is already a customer and wants in. Brand presence comes from the mark, the colours and at most one **abstract brand graphic derived from the mark or the product** (Stripe's ribbon). Do not reuse the marketing hero photograph or its persuasive headline — it belongs to the pitch, and a daily user sees it every morning.
- Empty states: a small glyph from the mark family, one sentence that says why it is empty, one action.
- Photography inside the work area is decoration competing with data; product imagery (charts, the board) is the only imagery the app needs.

## 8. Checklist before implementation (app surfaces)

- [ ] Surface classified; the marketing site (if any) sampled for identity only.
- [ ] Type roles written as fixed sizes with line heights; base 14/20; minimum 12; display face assigned to one job.
- [ ] Every text/ground pair used — including hover, selected, zebra, secondary panels, dark mode — at 4.5:1; every input border, focus ring and switch track at 3:1.
- [ ] Page header height budget; first rows of the main object above the fold at 1280 × 800.
- [ ] Density per surface (comfortable default, compact for tables).
- [ ] Navigation: grouped sidebar, phone drawer, tab titles, command palette or shortcuts.
- [ ] State inventory: every control's five interaction states; every data region's four content states.
- [ ] Brand-moment budget and the sign-in treatment decided.

## Sources read for this reference

IBM Carbon — typography overview and type sets (productive vs expressive, fixed vs fluid) and `@carbon/type` source tokens; Material Design 3 — `md-sys-typescale` tokens and density guidance ("Using Material Density on the Web"); NN/g — "Data Tables: Four Major User Tasks", "8 Design Guidelines for Complex Applications", "Dark Mode vs. Light Mode", "Typography for Glanceable Reading", "UI Copy"; W3C — Understanding WCAG 2.2 SC 1.4.11 Non-text Contrast and 2.5.8 Target Size (Minimum); product sign-in screens inspected live: Linear, Vercel, Stripe, Attio (2026-09-25).
