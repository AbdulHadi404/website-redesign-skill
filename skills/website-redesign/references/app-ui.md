# Product UI — apps, dashboards, admin, account areas, checkout

Read in Phases 3–5 whenever a route is a productive surface (`framing.md`). A marketing page is judged in five seconds; a product screen is judged over hundreds of uses. The rules here come from mature design systems and open-source products (`categories.md` for the per-category numbers, `design-systems.md` for tokens and the component layer). The brand layer carries over from a marketing site; its expressive devices do not (§1, §12). When a site is becoming an application with an operator behind it, design both sides around one record: the customer creates it, the operator acts on it, and both see the same words for its state (`discovery.md` §5).

## 1. Principles

1. **The user's object is the hero.** Their records, document, queue or canvas outranks the chrome. Dim navigation, shrink icons, remove decorative colour from chrome (Linear's 2024 redesign). Direct manipulation on a canvas: `ui-ux.md` §7b.
2. **Frequency sets the budget.** What is done a hundred times a day gets no animation, no confirmation dialog and a keyboard shortcut; what is done once a year gets guidance.
3. **Few sizes, used consistently.** Real systems use three to five type sizes on a screen (Primer's issues page: three, largest 16 px); a size used once is a smell. 13–14 px body (14/20 default), 20–28 px page titles, fixed (32 only for a dashboard or home screen whose title stands alone). Type roles: §3.
4. **One elevation model, named.** Canvas → sibling surfaces → layers inside a surface; overlays are a separate plane; never a surface nested in a surface (Plane's written model). Cards are an elevation for independent objects, not a layout primitive.
5. **Colour is information.** Neutral chrome on a work ground that is a low-chroma neutral tinted with the brand hue (`design-theory.md` B5) — not pure #fff, and not cream unless the brand owns it; no large saturated fields in the work area. One colour for action, and the accent marks action only; a *neutral* fill for selection (Spectrum 2 — an accent-coloured selected item competes with the primary action; a low-chroma tint of the brand hue, step 2–3 of its scale, counts as neutral when it is clearly not the action colour and a second cue — weight, a bar, a check — carries the state); semantic colours for status only, and live state is a status colour plus words; a separate data palette.
6. **Every state is designed** — including empty, error, loading, long, many and none (§2).
7. **Content is design.** Labels, states and instructions of 2–4 words (NN/g, UI copy), in the users' words; one name per thing; a verb that survives from button ("Publish") to confirmation ("Published"); statuses in sentence case, one status vocabulary across the product and its marketing site; product UI written as product UI, not as marketing.
8. **The brand layer carries over; the site's expressive devices do not.** Carry the mark, the colour roles and their meanings (action, status, ground), the display face for one job (§3), the status vocabulary, and the tone, made shorter. Leave display sizes and fluid type, eyebrow-plus-lead stacks, editorial chapters and chapter padding, photography as concept, decorative motion and persuasive copy on the marketing site. A product that copies its site's type scale looks right in a screenshot and wears its users out in a week. The seam test (`art-direction.md` §5) runs against the site's brand layer, not its layout.

## 2. The state matrix

Replace "five states" with the matrix; fill the applicable rows for every component, then render each in Phase 6 with `scripts/states.mjs` (mock the data to reach loading, empty, error, offline, many; `visual-qa.md`).

| Family | State | Visual change | Semantics / behaviour | Focusable | Contrast |
| --- | --- | --- | --- | --- | --- |
| Interaction | Rest | — | — | yes | text 4.5:1, UI 3:1 |
| | Hover | fill/tint shift, pointer only (`@media (hover: hover)`) | none; never on touch | — | keep text contrast |
| | Focus-visible | ring ≥ 2 px, 3:1 against the unfocused state; not on mouse click | keyboard and programmatic focus | yes | 3:1 |
| | Pressed | darker fill or slight scale | — | — | — |
| | Dragged | elevation | a single-pointer alternative (WCAG 2.5.7) | yes | — |
| Selection | Selected / checked | **neutral** fill by default | `aria-selected` / `aria-checked` / `aria-pressed` | yes | 3:1 indicator |
| | Indeterminate | dash | `aria-checked="mixed"` | yes | 3:1 |
| | Current | bar or underline | `aria-current="page"` | yes | 3:1 |
| | Expanded | chevron rotates | `aria-expanded` | yes | — |
| Validation | Error | border + icon + message — never colour alone | `aria-invalid`, `aria-describedby`; error summary on submit at three or more errors (§6) | yes | message 4.5:1 |
| | Warning / success | icon + message; success only when reassurance is needed | `aria-describedby` | yes | 4.5:1 |
| Availability | Disabled | reduced emphasis | `disabled` — avoid; say why nearby | no | exempt, but legible |
| | Inactive | muted, still responds (explains why on activation) | `aria-disabled` only if activation does nothing | yes | legible |
| | Read-only | no hover, no interactive colour | `readonly`; value selectable and copyable | yes | **4.5:1** |
| | Hidden (by permission) | not rendered | — | — | — |
| Async | Loading — container | skeleton after 1 s; determinate after 3 s | one polite announcement per cluster | — | — |
| | Loading — action | inline spinner, label kept | `aria-disabled="true"`, focus kept, live-region message ("Saving profile") | yes | — |
| | Refreshing / stale | subtle indicator; content stays | — | — | — |
| | Empty | first-use / no-results / cleared / error variant | heading + the next action | — | — |
| | Degraded | the failed part says so, with retry | — | — | — |

Rules that go with it: hide by permission, disable by dependency — and prefer "inactive + explanation" to disabled (GOV.UK, USWDS and Primer all advise avoiding disabled controls; they cannot be focused, so they cannot explain themselves). Never disable Save or Submit to signal an invalid form. Read-only is not disabled: it stays focusable and full-contrast. Hover does not exist on touch.

Never show read, archived or deleted by fading the row: opacity takes all its text under 4.5:1. Use a status word plus ink or weight (secondary ink, 400 instead of 500, strike-through for deleted); `audit.mjs` measures faded rows. Text keeps 4.5:1 on every state ground — hover, selected, zebra, secondary panel (`accessibility.md` §2).

Also render the **content extremes**: 0, 1, typical and 100+ items; 1-character and 70-character names; long words and URLs; missing images; large numbers and currencies; non-Latin text; RTL if supported.

## 3. Density, type and layout

- Controls (buttons, inputs) 32 px by default, 28 px compact, 36–40 px only on touch-first surfaces (field and frontline tools take their own numbers, targets of 48 px and 56 px for gloved or wet hands: `categories.md`); table rows 40 px comfortable (the default), 32 px compact; spacing on a 4 px step; radii 4–8 px by role, concentric (outer = inner + padding).
- **Density is a setting of the task**: raise it for lists, tables and long forms, where more rows give relational context (Material), and keep it lower for focused tasks. Offer it, don't impose it: comfortable default, compact per table or per user where people use a mouse and keyboard; phones and other touch surfaces stay comfortable, never compact; targets never under 24 × 24 px, and every target 44 × 44 px on coarse pointers — a touch-first control drawn at 36–40 px extends its hit area to 44 (Primer switches its minimum by pointer: 16 px fine, 44 px coarse; `accessibility.md` §2).
- Density changes heights and padding, not font size.
- **Type is fixed, not fluid.** Base 14/20 (13 px only in the densest tools); reading text in sentences (descriptions, notes) 15–16 px. Nothing a user must read under 12 px, with 11 px only for a single uppercase word. Page titles as in §1. Role sizes with Carbon and Material 3 numbers: `design-systems.md` §3.
- **The brand display face gets one job**: page titles, and the sign-in screen (§12). Panel titles, record names, numbers and labels use the UI face, where weight does the work: 500–600 at 14–16 px scans faster than a serif at 20. KPI numerals 24–32 px semibold in the UI face with tabular figures, never a decorative display cut (`dataviz.md` §4).
- **Caps** only for one- or two-word labels in isolation (short column heads, one-word nav-group labels), at 12 px (11 px only for a single word), tracked 0.05–0.06 em, in the UI face and never a condensed or hard grotesk. They count together as the page's one caps device (NN/g, glanceable type: uppercase is faster only for a word or two). Statuses, multi-word strings and anything scanned down a column stay in sentence case.
- **No monospace unless the users read code** (`SKILL.md` commitment 5). IDs, passwords, env names, `[placeholders]`, key hints and timers go in the UI face at 500 with tabular figures, with a copy button where a value is copied. The browser defaults for `code`, `kbd`, `samp` and `pre` count: set them in the UI face in the base styles, and point the framework's mono token at it. `audit.mjs` fails rendered mono unless `--allow-mono`.
- **The page header is one band** of 72–120 px: the title, an optional one-line description and the actions right-aligned. No eyebrow, display serif or two-line lead — that stack costs about 180 px on every page and is read once.
- **The fold**: on a 1280 × 800 laptop the first rows of the main object (table, board, form) are visible without scrolling. Check with `capture.mjs --widths 1280 --height 800`.
- Page padding 24–32 px on desktop and 16 px on phones; gaps between sections 20–32 px, not the 100–180 px chapter padding of a marketing page.
- One scroll region per page where possible; side panels scroll independently.
- An app frame has zones: global header, side navigation, content, a zone for global or view actions, and a zone for transient contextual actions (Spectrum 2). Give the content the width.

## 4. Navigation

- **Places** in a sidebar when there are five or more primary items or any second level; grouped by task, at most 7 items per group; at most two levels (Carbon's left panel does not support three — use tabs in the page); icon + label at the first level; width sized to the longest translated label. The current item is marked by more than colour (weight, background, `aria-current`).
- **Phones** follow `responsive.md` §5: a bottom tab bar for 3–5 destinations, a labelled "Menu" drawer for many tools or admin. The phone top bar is the `<header>` landmark.
- **Views of one object** in tabs. Tabs that change the URL are navigation; tabs that swap panels are tabs — never mix them in one set.
- **Commands** in a command palette (⌘K) that lists every page this user may open (permission-aware) and shows each command's shortcut, so users graduate to the shortcut; its focus rules are in `accessibility.md` §4. Keyboard shortcuts for top tasks; `?` to list them. Shortcut hints and `kbd` keycaps go in the UI face (§3).
- **A browser tab title per page** ("Campaigns · Product"), because people run several tabs.
- **State in the URL**: filters, sort, tabs, pagination, open panels. Back restores position.
- Parent → child always has a way back (breadcrumbs, back link). Primary–detail layouts for lists of records.
- A navigation item users know but whose destination is missing or out of scope (a route the repo does not have): keep it where it was as an inert label (no link, no pointer, no role), and ask where it should go. Never a fake link to `#`, and never silently removed: people navigate by position.
- Do not use ARIA `menu` / `menubar` roles for site or app navigation — they are for application command menus. Use links, and disclosure buttons for sub-lists.

## 5. Tables and lists

- **Four tasks** (NN/g): find (search and filters prominent, the active filter state obvious), compare (sticky headers, aligned tabular numerals, row hover), view or edit one (side panel or inline edit), act (selection + bulk actions).
- A title that says what the rows have in common; the first column a human-readable identifier; related columns adjacent; column titles of one or two words; header alignment follows the data; **numbers right-aligned with tabular figures** and consistent units.
- **Row actions**: one or two inline, in the last column as quiet icon buttons with names, and the rest in a menu. A clickable row never wraps a button (`accessibility.md` §3).
- **Status**: a dot plus a word, in the sentence-case status vocabulary (§1, §7).
- **Sorting**: one column at a time; first click ascending; only the sorted column shows its arrow; a default sort that serves the top task; `aria-sort` and a polite announcement of the new order.
- **Selection**: with nothing selected, show "Showing 1–25 of 1,240"; the bulk-action bar appears only once something is selected and replaces the toolbar with "{n} selected"; the header checkbox selects the page, then offers "Select all 1,240", then "Clear selection".
- **Pagination** for management tables — 25 rows by default, 10/25/50/100 offered, the choice remembered (Elastic EUI); infinite scroll only for browsing homogeneous feeds; "Load more" for product lists.
- **Zebra striping** only for very wide numeric tables; otherwise dividers + hover.
- **Phones**: a record list (one row per object) folds into a name plus a meta line and drops the columns the phone does not need. Only a genuine numeric comparison table scrolls sideways, inside a focusable, labelled container (`tabindex="0"`, a caption) with the identifier column sticky, as for a comparison matrix in `responsive.md` §6.

## 6. Forms

- **Validate on submit**, not on blur or while typing; after a failed submit, re-validate live as the user fixes (GOV.UK, Primer; React Hook Form's defaults already do this). Exceptions where live feedback helps: character counts, availability checks, password rules.
- **Error summary** for three or more errors (fewer: focus and scroll to the first invalid field): at the top of `main`, headed "There is a problem", focused on load, each error linking to its field; the page `<title>` prefixed "Error: "; the same message beside each field after label and hint, with a visually hidden "Error:" prefix; `aria-invalid` + `aria-describedby`. Do not use live regions for validation — manage focus. Turn off native validation bubbles (`novalidate`); keep server-side validation.
- **Required vs optional**: mark whichever is the minority, in words — "(optional)" on consumer forms, "(required)" on configuration forms (Carbon). No asterisks.
- **Error messages**: what happened and how to fix it, in the question's own words ("Enter how many hours you work a week"); no "invalid", "illegal", "oops", "please", "sorry", error codes or "This field is required".
- One column; labels above; width that hints at the answer's length; `type`, `inputmode` and `autocomplete` on every field; inputs ≥ 16 px on phones; never block paste; prevent double submission.
- **Saving**: never mix auto-save and explicit save in one form; one save button per page, primary if it saves everything; an active verb ("Save changes", "Create project"); warn on navigation with unsaved changes; drafts for long edits.
- **One primary on screen**: a header button that opens a form yields its primary styling to the form's submit while the form is open.
- Linear public services start with one question per page.

## 7. Notifications — choose the quietest that works

| Surface | For | Rules |
| --- | --- | --- |
| Field message | validation on one control | beside the field; same words as the summary |
| Inline / section message | the result of an action in one area | near the action; under two lines |
| Callout | information that loads with the page | not dismissible; not triggered by events |
| Banner | system state, account-wide issues, outages | top of the content; one at a time; never with an error summary |
| Toast | brief acknowledgement of something *not otherwise visible* | polite live region, never takes focus; ≥ ~500 ms per word; dismiss button; pause on hover *and* focus; no auto-dismiss if it holds an action; the information reachable elsewhere |
| Modal (alert dialog) | destructive or irreversible confirmation; a blocking problem | never for success or general information |
| Full-page confirmation | outcomes worth keeping (payment, submission with a reference) | the user may copy, print or screenshot it |

A toast or snackbar with an action keeps the action *outside* its live region: announce the message only, or "Undo Dismiss" is read aloud with it.

Default to **no message** when the interface already shows the result (the updated row is the confirmation; a temporary inline check beats a toast). Primer deprecated its toast over accessibility; auto-dismissing toasts collide with WCAG 2.2.1. "Completed" is quiet; colour belongs to what still needs doing. Status is colour + icon + words (in a table row, a dot plus the word: §5).

## 7b. Data freshness, offline and sync — say what is true

Any screen that shows data fetched from somewhere can be wrong about the present. Designing for that is part of the product, not an edge case (it decided the outcome in a blind test of this skill on a field tool):

- **Freshness is always visible** where decisions are made: "Updated 05:42", "Updating…", "No signal · saved 05:42". Never "Synced" unless a sync just succeeded.
- **Keep the last good copy and label it as a copy**; warn when it belongs to an earlier period (yesterday's milking, last week's stock). A cached copy shown as current is worse than no data.
- **Service workers cache the app shell, not the data as if it were live**; if data is cached for offline use, the UI says so on every view that shows it.
- **Actions taken offline** are kept locally, labelled ("on this phone"), undoable, and replayed or flagged when the connection returns; never silently dropped.
- **Refresh is real**: it re-fetches, shows progress, and reports failure with a retry.
- **Render these states** (offline on first load, offline with a saved copy, stale copy, server error, slow): `states.mjs` routes can abort, delay or fail the data request.

## 8. Loading, empty, error

- **Loading** (Primer, consistent with NN/g) has two rules. A *container* (table, list, tiles) shows nothing under 1 s — but *lay out* the skeleton from first paint (in the server or static HTML, `visibility: hidden` until 1 s), so the space is reserved and nothing shifts when data or the skeleton appears; 1–3 s a skeleton or an indeterminate indicator; 3–10 s determinate progress; over 10 s a background task the user can leave. An *action's* inline spinner, inside the pressed control, appears after a 150–300 ms delay and stays at least 300–500 ms once shown, to avoid flicker. Show each item as it arrives.
- **Skeletons** only for containers (tables, lists, tiles) and shaped like the final layout (no CLS); never for buttons, inputs, menus, toasts or modals.
- **Empty states**: *first use* — what will appear here and the one action that fills it; *no results* — how to adjust the filters; *cleared / done* — a quiet confirmation; *permission or error* — what went wrong and the corrective action. Never "No data". Each gets a small glyph from the mark family, one sentence saying why the state is empty, and one action; they are one of the product's few brand moments (§12). A canvas editor or configurator opens on a real, beautiful default (the client's signature piece), not an empty scene (`ui-ux.md` §7b).
- **Errors**: degrade the part, not the page ("This table could not be loaded — Retry"); separate pages for "Page not found", "There is a problem with the service" and "Service unavailable".

## 9. Dashboards

Decide operational (monitor and act) or analytical (explore and decide) before placing anything; three to five decision-driving metrics, each with a target or comparison, a period and a link to the records; deviations carry the weight — colour the deviating values or marks, not their containers, and keep the rest in a muted tint, so the squint sheet's heaviest thing is the one needing action; every chart with axis values, units and freshness; tabular numerals; drill-down. Charts, colour and library choices: `dataviz.md`.

**A redesign promotes numbers — check what they count.** Before shipping a number given new prominence (a new column, a danger-coloured count, a chart), query the stored records behind it; report a mismatch as a finding for the data owner instead of relabelling it in the UI (Brio3: "failed" included contacts never dialled, because ending a campaign wrote them as failed).

## 10. Feel

- Respond to input within 100 ms (hover, press, toggle); keep flow under 400 ms (Doherty); optimistic updates with a clear undo for reversible actions; confirmation dialogs only for the irreversible.
- Motion only to explain change (where something came from, what changed), 100–250 ms (a modal or sheet may take `--dur-large`, 300 ms, the productive ceiling in `motion.md` §4), none on keyboard-triggered actions or anything done 100+ times a day, and at most ≤ 150 ms colour or opacity on what is done tens of times a day (`motion.md` §2). Nothing animates for attention except live state, and a pulsing live-state indicator also says its state in words (`motion.md` §6).
- **Themes**: an all-day app offers light and dark, follows the OS by default and remembers the choice (NN/g: light reads better for most people; dark helps people with cataracts and in dim rooms). The theme control sits in the header or account menu on every page, not only in the footer.
- **Visual comfort over long sessions**: never pure black; lift text in dark mode (`design-theory.md` B8); consistency is comfort — the same component in the same place on every screen, so spatial memory does the work.
- No layout shift from late data: reserve space, match skeletons to the final layout. Two more sources the Sanad test measured (CLS 0.26–0.75 until fixed): a page that switches language or direction after first paint — set `lang` and `dir` in the server response, or hide the untranslated body until the strings are swapped, with a fail-safe; and web fonts swapping in — for a daily-use app, `font-display: optional` with the font preloaded (`performance.md`).
- Themed browser surfaces: `::selection`, `accent-color` on native controls, `caret-color`, `scrollbar-color` where it helps, `text-underline-offset`, `color-scheme` and `theme-color`.
- Tooltips on icon-only buttons show the name *and* the shortcut; every icon-only control has an accessible name.

## 11. App-UI tells

The generated-dashboard look is its own list (`anti-patterns.md` "App-UI tells"): marketing type and a greeting in the title slot, card soup, KPI tiles with "+20.1% from last month", decorative charts, low density, a toast for every save, modals for everything, icon-only toolbars, missing states. `audit.mjs --kind app` measures most of them. A marketing site's devices carried into the product have their own list: `anti-patterns.md` "Marketing expression transplanted into a productive surface".

## 12. Brand moments, doors and sign-in

- **A budget of two or three brand moments**: sign-in, first-run and empty states, success after a long task. Everything else is quiet and consistent. A greeting never takes the title slot, which names the place and scope; on a home screen it may appear only as a secondary line under a title that names the place.
- **Doors** (sign-in, empty states, onboarding): one brand moment, then out of the way. Hybrids take the rule of their job: docs keep the productive posture, with prose at a reading size and measure (`categories.md` "Developer tools and documentation"), and a calculator inside the app is a tool.
- **Sign-in is a utility screen.** The user is already a customer and wants in, so the form comes first, on its own ground (Linear, Vercel, Stripe, Attio, inspected 2026-09-25). Brand presence comes from the mark, the colours and at most one abstract graphic derived from the mark or the product (Stripe's ribbon) — never the marketing hero photograph or its tagline, which belong to the pitch and which a daily user would see every morning. On phones, drop the art band and show the field: squeezed into a strip under the logo, a large mark only repeats the logo. Sign-in mechanics: `accessibility.md` §2.
- **No photography in the work area.** It is decoration competing with data; product imagery (charts, the board) is the only imagery the app needs.

## 13. Traps that show up only while building

Found by the checker and the keyboard walk on the Brio3 app after the design itself was right. Each passes a visual review, so look for them on purpose.

- **The faint token leaks into text.** A palette's 'decorative' grey (for dots, disabled states and rules) ends up on timestamps and select placeholders at about 2.5:1. Name the token 'decorative' where it is defined and grep its text uses, placeholders included, before shipping (`design-systems.md` §2).
- **Dimming rows with opacity** (§2).
- **A clickable row that contains a button**, where screen readers announce one control and swallow the other (§5, `accessibility.md` §3).
- **Hover-only row actions**, invisible on a phone (`responsive.md` §4).
- **Tables that scroll sideways** (§5).
- **The phone top bar outside every landmark**, often a bare `<div>` (§4).
- **Command-palette focus** (`accessibility.md` §4).
- **Overlays only exist when open.** Automated checks of a route never see its palette, menus or dialogs; scan them open with `states.mjs --axe`.
- **Promoted numbers** (§9).
- **A CSS grid with `min-height: 100dvh` stretches its auto rows**, so a "short" band grows to a third of the screen; set the rows explicitly (`auto 1fr`). More in `visual-qa.md` "Rendering traps seen repeatedly".

## 14. Checklist before implementation (productive surfaces)

- [ ] Routes classified (`framing.md`); a marketing site, if any, sampled for its brand layer only (§1).
- [ ] Type roles fixed, with line heights, in `SYSTEM.md`: base 14/20, floor 12, the display face given one job (§3).
- [ ] Every text/ground pair at 4.5:1, including hover, selected, zebra, secondary panels and dark mode; input borders, the focus ring and switch tracks at 3:1.
- [ ] The page-header budget and the 1280 × 800 fold (§3).
- [ ] Density per surface (§3).
- [ ] Navigation: grouped sidebar, phone pattern, tab titles, palette and shortcuts (§4).
- [ ] The state matrix per component and data region (§2, §8).
- [ ] The brand-moment budget and the sign-in treatment (§12).
- [ ] After building: `audit.mjs --themes light,dark` on every route, `states.mjs --axe` with overlays open, `a11y.mjs` per key template, a keyboard walk of the top tasks, and §13 checked by hand.

## Sources read for this reference

IBM Carbon: typography and type sets (productive vs expressive, fixed vs fluid) and the `@carbon/type` source tokens (`styles.ts`). Material Design 3: `md-sys-typescale` tokens and "Using Material Density on the Web". NN/g: "Data Tables: Four Major User Tasks", "8 Design Guidelines for Complex Applications", "Dark Mode vs. Light Mode", "Typography for Glanceable Reading", "UI Copy". W3C: Understanding WCAG 2.2 SC 1.4.11 Non-text Contrast and 2.5.8 Target Size (Minimum). Sign-in screens of Linear, Vercel, Stripe and Attio, inspected live on 2026-09-25.
