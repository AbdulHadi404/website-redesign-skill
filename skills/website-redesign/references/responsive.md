# Responsive and mobile

Read in Phase 3 (how each layout transforms) and Phase 6 (the responsive pass). "Works on mobile" means nothing overflows; *responsive* means each viewport class was designed — what comes first, what is cut, how navigation and tables transform, what a thumb can reach. Evidence and lab numbers: `research/streams/E-…` (browser support from `web-features` 3.40 / BCD 8.1, 2026-09-28).

## 1. Intrinsic layout before breakpoints

State rules ("wrap when an item would drop below 15 rem", "cap the measure at 65 ch") and let the browser find the arrangement for any container. Device-named breakpoints encode guesses. The primitives (Every Layout's vocabulary) cover most layouts:

| Primitive | Core CSS | Use for |
| --- | --- | --- |
| Stack | `.stack > * + * { margin-block-start: var(--space) }` | any vertical flow; the parent owns the rhythm |
| Center | `max-inline-size: 65ch; margin-inline: auto; padding-inline: …` | reading columns, page gutters |
| Cluster | `display: flex; flex-wrap: wrap; gap` | tags, button groups, inline nav, meta rows |
| Sidebar | side `flex: 1 1 16rem`; main `flex: 999 1 0; min-inline-size: 50%` | filters + results, nav + content, media + text — wraps with no media query |
| Switcher | `flex-basis: calc((var(--threshold) - 100%) * 999)` | 2–4 equal peers that are all in a row or all stacked, never 2 + 1 (KPI tiles, plans) |
| Grid | `repeat(auto-fit, minmax(min(15rem, 100%), 1fr))` | card and product grids; `subgrid` when card internals must align across a row |
| Cover | `min-block-size: 100svh` (or `min(100svh, 56rem)`) | a hero or intro |
| Reel | `overflow-x: auto; scroll-snap-type: x mandatory` + `role="region" tabindex="0" aria-labelledby` and a visible peek | horizontal rails instead of carousels |
| Frame | `aspect-ratio: 16/9; overflow: hidden` + `object-fit: cover` | media with a fixed ratio (reserves space: no CLS) |

Then: **container queries** (Baseline widely since 2025-08) for components that live in slots of different widths; **container style queries** (Baseline 2026-05) or `:has()` for variants decided by an ancestor or by their own content; **media queries** only for the page shell — navigation pattern, split panes, density defaults, input mode. Breakpoints go where the content breaks; for app shells align with window classes: compact < 600 · medium 600–839 · expanded 840–1199 · large ≥ 1200. Use logical properties throughout (RTL-ready).

## 2. Fluid type, and the zoom trap

- **Type sized in `vw` alone does not grow when people zoom** — zoom shrinks the CSS viewport by the same factor. Measured: a `5vw` headline stayed exactly 64 physical px at 100%, 200% and 400% zoom. That fails WCAG 1.4.4.
- A `clamp(min, rem + vw, max)` passes only if **max ≤ 2.5 × min** and the preferred value has a rem part. 32 → 64 px passes; **32 → 120 px (the typical giant hero) fails** across 949–2782 px viewports. Big display type must step up by breakpoint or container rather than stretch.
- Generate fluid tokens with Utopia-style maths (min/max viewport ~360–1440, base 16 → 19 px, ratio 1.2 → 1.333), with `cqi` versions for components. Body ≥ 16 px on phones; inputs ≥ 16 px (iOS Safari zooms smaller inputs on focus).

## 3. Viewport units, safe areas, keyboards

- `svh` is stable (browser UI expanded) — use it for heroes and covers; `lvh` can hide content under toolbars; `dvh` re-lays-out as toolbars move — only for fixed full-screen layers (a sheet, an app shell whose body scrolls inside). Every browser implements plain `vh` as `lvh`. Cap tall-screen dead bands: `min-block-size: min(100svh, 56rem)`.
- Safe areas: `viewport-fit=cover`, then pad fixed bars with `max(1rem, env(safe-area-inset-bottom))`; landscape needs the left/right insets.
- Virtual keyboard: by default a fixed bottom submit bar stays *under* the keyboard. For forms with sticky actions, `interactive-widget=resizes-content` (Chromium/Firefox Android) plus the VisualViewport API on iOS.
- **Never disable zoom** (`user-scalable=no`, `maximum-scale`): iOS ignores it and it violates 1.4.4.

## 4. Input modes

- **Default to no hover.** Hover-only reveals (row actions, dropdowns) go inside `@media (hover: hover) and (pointer: fine)` and also show on `:focus-within`; `any-hover` / `any-pointer` for hybrids.
- **Targets**: every target 44 × 44 px on coarse pointers (`@media (pointer: coarse)`; a touch-first control may be drawn at 36–40 px with its hit area extended to 44), never below 24 px anywhere (WCAG 2.5.8; `accessibility.md` §2); larger targets and spacing near the screen edges, where touch accuracy is worst.
- **Cascade trap (measured)**: a `@media (pointer: coarse) { .btn { min-block-size: 44px } }` placed *before* the base `.btn` rule is silently overridden (same specificity). Put input-mode overrides after the base rules or in a later cascade layer — and check the rendered height, not the source.
- **Gestures are accelerators**: every swipe, long-press or drag has a visible tap alternative (WCAG 2.5.7).
- **Keyboards**: `type` + `inputmode` + `autocomplete` + `enterkeyhint`; card numbers and one-time codes use `inputmode="numeric"` with `autocomplete="cc-number"` / `"one-time-code"`, never `type=number`; `field-sizing: content` for growing textareas.

## 5. Navigation transformation

| Product | Phone | Tablet | Desktop |
| --- | --- | --- | --- |
| Marketing, ≤ 5 links + CTA | logo, **the primary CTA visible**, a button labelled "Menu" → full-screen or sheet menu; 2–3 short links inline if they fit | links usually fit; else priority+ | inline links + CTA; the sticky header gains a rule after scroll |
| Marketing, 6–10 links / mega-menu | menu with accordion groups; search visible if it is a primary task | priority+ with "More" | mega-menu opening on **click**, keyboard-operable |
| Ecommerce | menu, logo, **a search field (not just an icon)** once the catalogue is too big to browse (a dozen products with working filters need none; a fake search icon is worse than none), cart with count; category drill-down; sticky "Filter · Sort" bar → **bottom sheet** whose apply button shows the count ("Show 132 results"); sticky add-to-cart once the in-flow one scrolls away | two-column listing; filters in a sheet or side panel | persistent filter sidebar; mega-menu; sticky header with search |
| App, 3–5 destinations | **bottom tab bar** (icon + one-word label, always visible, `aria-current`); top bar = title + contextual actions | navigation rail (3–7) | sidebar (collapsible to a rail) + command palette |
| App, 6+ destinations | 4 most-used tabs + "More", or a drawer with the top tasks on home | rail with top 5–7 + "More" | grouped sidebar with headings; ⌘K |
| Enterprise admin, 20+ sections | "Menu" drawer with search inside; home surfaces the phone tasks (approve, look up) | drawer or rail | multi-level sidebar, breadcrumbs, in-page tabs |
| Docs / content | menu + prominent search; on-page TOC in `<details>` | TOC as a drawer | left nav + sticky "On this page" |

Hard rules: hidden navigation is used far less than visible navigation — show the top 3–5 destinations when you can and hide only the long tail; never hide the only search behind an icon in a search-led product; tab bars navigate, toolbars act; at most five bottom tabs; the current location is always visible; mobile menus are labelled, trap focus, close on Escape, restore focus and lock body scroll; the primary action stays visible at every width (in the header it is styled secondary while the hero's own primary action is on screen: `web-design.md` §6). One sticky primary action per phone screen at most — padded so it never covers the end of the page or a focused element (`scroll-padding-block-end`), hidden while the in-flow CTA is visible. Bottom sheets (built on `<dialog>`) get a grab handle *and* a close button.

**One-handed use, evidence vs folklore**: roughly half of phone use is one-handed and grips change constantly (Hoober); people tap and look at the centre most accurately. Put primary content and actions near the centre and bottom, frequent destinations in a bottom bar, destructive actions away from busy tap zones — but don't cram everything into the lower third; the static "thumb zone" heat map is folklore.

## 6. Responsive data

**Tables** — WCAG 1.4.10 exempts content that needs two-dimensional layout, so a genuine table may scroll sideways; the *page* may not.

| Data shape | Narrow-container strategy |
| --- | --- |
| Comparison matrix (pricing, specs, timetables, statements) | keep the table: a scroll region (`role="region"`, `tabindex="0"`, `aria-labelledby` the caption, visible focus) + sticky first column + sticky header + an edge-shadow scroll cue |
| Entity list (orders, tickets, users, results) — one row per object | below ~34 rem of *container*, each row folds into the name plus one meta line (status and the one or two fields the phone needs), dropping the columns the phone does not need; the rest in the detail view (`app-ui.md` §5). Only a genuine numeric comparison keeps its columns and scrolls, as in the row above |
| Wide analytic table | priority columns (2–4 shown, a column chooser for the rest), frozen first column, tabular right-aligned numbers, sticky totals |
| Key → value (one entity) | a `<dl>` in two columns → stacked pairs |
| Very long (1k–100k rows) | pagination or virtualization; `content-visibility: auto` for low thousands |
| Editable grid | desktop-first; on phones edit one record at a time in a form |

If CSS changes `display` on table elements, re-add `role="table"`/`row`/`cell`/`columnheader` or test with VoiceOver and TalkBack — some browsers drop the semantics.

**Dashboards on phones** — decide what someone does with it on a phone (usually check status, triage, approve, look something up — not analyse), then: alerts first → KPI tiles as a Switcher (2-up, then stacked; value, delta, sparkline, no tooltip dependence) → one primary chart, full width, direct labels, fewer ticks, tap for detail → the actionable list, each row a name and a meta line → everything else behind "View full report"; filters in a bottom sheet with the date range visible; lazy-mount the rest.

**Forms** — one column, labels above, inputs ≥ 44 px tall (a product's touch-first controls may be drawn at 36–40 px with the hit area extended to 44, `app-ui.md` §3), the right keyboards, an error summary linking to fields, the submit button in flow or above the keyboard, never block paste.

**Density** — comfortable by default on coarse pointers; compact allowed on fine pointers in data-heavy tools (targets still ≥ 24 px); the user's choice persisted. A density toggle on a large view is expensive: measured INP 152 ms at 1k rows, 656 ms at 5k, 2,880 ms at 20k — 24–64 ms with `content-visibility: auto` on row groups.

**Long content** — a sticky, collapsible table of contents; `scroll-margin-top` on anchors; "Load more" instead of infinite scroll where a footer matters.

## 7. Which widths to test

| Class | CSS px | Why |
| --- | --- | --- |
| Reflow floor | **320** × 640 | WCAG 1.4.10 (1280 at 400% zoom) |
| Small Android | **360** × 780 | the most common Android width |
| Current iPhone | **390/393** × 844 | the default phone capture |
| Large Android | 412 × 915 | Lighthouse's Moto G Power |
| Landscape phone | **844 × 390** | short heights break sticky header + footer + keyboard |
| Tablet | **768**, 820/834 | two-column layouts start |
| Small laptop / tablet landscape | **1024** | two-column heroes squeeze here first |
| Laptops | **1280**, 1366, **1440**, 1536 | 1536 = 1920 at 125% Windows scaling |
| Desktop / wide | 1920, 2560 | max-width sanity, background bleed |
| Zoom | 1280 at **200%** and **400%** | 1.4.4 and 1.4.10 |

`capture.mjs` defaults to 1440 / 1280 / 1024 / 768 / 390; add `--widths 320,360,844` for the responsive pass (landscape: `--widths 844 --height 390`). Playwright's iPhone/iPad descriptors default to WebKit — with only Chromium installed, reuse their viewport, DPR and touch settings. For a cheap-Android feel use CPU throttling (4× mid-tier, ~10× low-end on a fast host) and slow-4G network emulation (`performance.md`).

## 8. The responsive pass (Phase 6)

- [ ] Captures at the widths above; no horizontal page scroll (`audit.mjs` names the element); no phone zoom-out from an overflowing child.
- [ ] Each viewport class looks *designed*: stack order chosen, sizes re-set, nothing squeezed; mid widths (1024, 768) checked as carefully as the ends.
- [ ] The hero object (photograph, product) is inside the 390 × 844 first viewport — open the `-fold.png`; a headline, lede, two stacked buttons and a facts row can push it below, leaving a paragraph as the hero. Order the hero head → object → body on narrow screens (grid areas on desktop).
- [ ] Navigation transformed per §5; the open mobile menu captured; primary action visible at every width.
- [ ] Tables per §6; charts per `dataviz.md` §6.
- [ ] Targets ≥ 44 px on coarse pointers (check the rendered size — `audit.mjs` counts them); hover-only affordances also reachable by focus and touch.
- [ ] 200% and 400% zoom at 1280: text grows, content reflows to one column, nothing clipped, no two-dimensional scrolling except inside genuine tables.
- [ ] Landscape phone: sticky header, footer and keyboard do not eat the screen.
- [ ] Long content, long words, translations (German-length labels), RTL if supported (`multilingual.md`).
