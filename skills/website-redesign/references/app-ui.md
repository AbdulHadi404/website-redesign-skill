# Product UI — apps, dashboards, admin, account areas, checkout

Read in Phases 3–5 whenever a route is a productive surface (`framing.md`). A marketing page is judged in five seconds; a product screen is judged over hundreds of uses. The rules here come from mature design systems and open-source products (`categories.md` for the per-category numbers, `design-systems.md` for tokens and the component layer).

## 1. Principles

1. **The user's object is the hero.** Their records, document, queue or canvas outranks the chrome. Dim navigation, shrink icons, remove decorative colour from chrome (Linear's 2024 redesign).
2. **Frequency sets the budget.** What is done a hundred times a day gets no animation, no confirmation dialog and a keyboard shortcut; what is done once a year gets guidance.
3. **Few sizes, used consistently.** Real systems use three to five type sizes on a screen (Primer's issues page: three, largest 16 px); a size used once is a smell. 13–14 px body, 20–28 px page titles.
4. **One elevation model, named.** Canvas → sibling surfaces → layers inside a surface; overlays are a separate plane; never a surface nested in a surface (Plane's written model). Cards are an elevation for independent objects, not a layout primitive.
5. **Colour is information.** Neutral chrome; one colour for action; a *neutral* fill for selection (Spectrum 2 — an accent-coloured selected item competes with the primary action); semantic colours for status only; a separate data palette.
6. **Every state is designed** — including empty, error, loading, long, many and none (§2).
7. **Content is design.** Labels in the users' words; one name per thing; a verb that survives from button ("Publish") to confirmation ("Published"); product UI written as product UI, not as marketing.

## 2. The state matrix

Replace "five states" with the matrix; fill the applicable rows for every component, then render each in Phase 6.

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
| Validation | Error | border + icon + message — never colour alone | `aria-invalid`, `aria-describedby`; error summary on submit | yes | message 4.5:1 |
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

Also render the **content extremes**: 0, 1, typical and 100+ items; 1-character and 70-character names; long words and URLs; missing images; large numbers and currencies; non-Latin text; RTL if supported.

## 3. Density and layout

- Body 13–14 px; controls 28–32 px (36 on touch-first surfaces); table rows 32–40 px; spacing on a 4 px step; radii 4–8 px by role, concentric (outer = inner + padding).
- Offer density, don't impose it: comfortable default, compact per table or per user where people use a mouse and keyboard; never compact on touch; targets never under 24 × 24 px (44 on touch) — Primer switches its minimum by pointer (16 px fine, 44 px coarse).
- Density changes heights and padding, not font size.
- An app frame has zones: global header, side navigation, content, a zone for global or view actions, and a zone for transient contextual actions (Spectrum 2). Give the content the width.

## 4. Navigation

- **Places** in a sidebar when there are five or more primary items or any second level; at most two levels (Carbon's left panel does not support three — use tabs in the page); icon + label at the first level; width sized to the longest translated label.
- **Views of one object** in tabs. Tabs that change the URL are navigation; tabs that swap panels are tabs — never mix them in one set.
- **Commands** in a command palette (⌘K) that shows each command's shortcut, so users graduate to the shortcut. Keyboard shortcuts for top tasks; `?` to list them.
- **State in the URL**: filters, sort, tabs, pagination, open panels. Back restores position.
- Parent → child always has a way back (breadcrumbs, back link). Primary–detail layouts for lists of records.
- Do not use ARIA `menu` / `menubar` roles for site or app navigation — they are for application command menus. Use links, and disclosure buttons for sub-lists.

## 5. Tables and lists

- **Four tasks** (NN/g): find (search and filters prominent), compare (sticky headers, aligned tabular numerals, row hover), view or edit one (side panel or inline edit), act (selection + bulk actions).
- A title that says what the rows have in common; column titles of one or two words; header alignment follows the data; **numbers right-aligned with tabular figures** and consistent units; row actions in the last column as quiet icon buttons with names.
- **Sorting**: one column at a time; first click ascending; only the sorted column shows its arrow; a default sort that serves the top task; `aria-sort` and a polite announcement of the new order.
- **Selection**: with nothing selected, show "Showing 1–25 of 1,240"; the bulk-action bar appears only once something is selected and replaces the toolbar with "{n} selected"; the header checkbox selects the page, then offers "Select all 1,240", then "Clear selection".
- **Pagination** for management tables — 25 rows by default, 10/25/50/100 offered, the choice remembered (Elastic EUI); infinite scroll only for browsing homogeneous feeds; "Load more" for product lists.
- **Zebra striping** only for very wide numeric tables; otherwise dividers + hover.
- **Responsive**: numeric tables scroll horizontally inside a focusable, labelled container (`tabindex="0"`, a caption), with the identifier column sticky; directory-like tables stack each row into label–value pairs (`responsive.md`).

## 6. Forms

- **Validate on submit**, not on blur or while typing; after a failed submit, re-validate live as the user fixes (GOV.UK, Primer; React Hook Form's defaults already do this). Exceptions where live feedback helps: character counts, availability checks, password rules.
- **Error summary** for three or more errors (fewer: focus and scroll to the first invalid field): at the top of `main`, headed "There is a problem", focused on load, each error linking to its field; the page `<title>` prefixed "Error: "; the same message beside each field after label and hint, with a visually hidden "Error:" prefix; `aria-invalid` + `aria-describedby`. Do not use live regions for validation — manage focus. Turn off native validation bubbles (`novalidate`); keep server-side validation.
- **Required vs optional**: mark whichever is the minority, in words — "(optional)" on consumer forms, "(required)" on configuration forms (Carbon). No lone asterisks.
- **Error messages**: what happened and how to fix it, in the question's own words ("Enter how many hours you work a week"); no "invalid", "illegal", "oops", "please", "sorry", error codes or "This field is required".
- One column; labels above; width that hints at the answer's length; `type`, `inputmode` and `autocomplete` on every field; inputs ≥ 16 px on phones; never block paste; prevent double submission.
- **Saving**: never mix auto-save and explicit save in one form; one save button per page, primary if it saves everything; an active verb ("Save changes", "Create project"); warn on navigation with unsaved changes; drafts for long edits.
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

Default to **no message** when the interface already shows the result (the updated row is the confirmation; a temporary inline check beats a toast). Primer deprecated its toast over accessibility; auto-dismissing toasts collide with WCAG 2.2.1. "Completed" is quiet; colour belongs to what still needs doing. Status is colour + icon + words.

## 8. Loading, empty, error

- **Loading** (Primer, consistent with NN/g): under 1 s show nothing; 1–3 s an indeterminate spinner or skeleton; 3–10 s determinate progress; over 10 s a background task the user can leave. Delay spinners ~150–300 ms and keep them ~300–500 ms once shown to avoid flicker. Show each item as it arrives.
- **Skeletons** only for containers (tables, lists, tiles) and shaped like the final layout (no CLS); never for buttons, inputs, menus, toasts or modals.
- **Empty states**: *first use* — what will appear here and the one action that fills it; *no results* — how to adjust the filters; *cleared / done* — a quiet confirmation; *permission or error* — what went wrong and the corrective action. Never "No data".
- **Errors**: degrade the part, not the page ("This table could not be loaded — Retry"); separate pages for "Page not found", "There is a problem with the service" and "Service unavailable".

## 9. Dashboards

Decide operational (monitor and act) or analytical (explore and decide) before placing anything; three to five decision-driving metrics, each with a target or comparison, a period and a link to the records; deviations carry the weight; every chart with axis values, units and freshness; tabular numerals; drill-down. Charts, colour and library choices: `dataviz.md`.

## 10. Feel

- Respond to input within 100 ms (hover, press, toggle); keep flow under 400 ms (Doherty); optimistic updates with a clear undo for reversible actions; confirmation dialogs only for the irreversible.
- Motion only to explain change (where something came from, what changed), 100–250 ms, none on keyboard-triggered actions or anything done tens of times a day (`motion.md`).
- No layout shift from late data: reserve space, match skeletons to the final layout.
- Themed browser surfaces: `::selection`, `accent-color` on native controls, `caret-color`, `scrollbar-color` where it helps, `text-underline-offset`, `color-scheme` and `theme-color`.
- Tooltips on icon-only buttons show the name *and* the shortcut; every icon-only control has an accessible name.

## 11. App-UI tells

The generated-dashboard look is its own list (`anti-patterns.md` "App-UI tells"): marketing type and a greeting in the title slot, card soup, KPI tiles with "+20.1% from last month", decorative charts, low density, a toast for every save, modals for everything, icon-only toolbars, missing states. `audit.mjs --kind app` measures most of them.
