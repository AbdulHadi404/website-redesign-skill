# Stream E — Responsive & mobile UX, and performance as a design constraint

Research date: **2026-09-28**. Scope: broadening `website-redesign` from marketing sites to web apps, dashboards, SaaS, ecommerce, enterprise and mobile-first products. Current coverage in the skill is `references/web-design.md` §4 (six bullets on responsiveness) and §5 (five bullets on performance), and `references/technical-qa.md` "Performance" (one Lighthouse instruction plus five bullets). Nothing covers app shells, navigation transformation, data tables, dashboards, density, viewport units, virtual keyboards, zoom, INP causes, JS budgets or field data.

**How to read the evidence tags**

- **[V]** = verified today from a primary source I could reach (package source code or data, W3C/MDN/Lighthouse repos on GitHub, Apple HIG JSON, HTTP Archive Almanac source).
- **[E]** = measured in this session's lab (commands and raw outputs in §8).
- **[K]** = from prior knowledge, **not re-fetched today**. The egress proxy blocked web.dev, developer.chrome.com, developer.mozilla.org, caniuse.com, nngroup.com, statcounter.com, every-layout.dev, utopia.fyi, adrianroselli.com, uxmatters.com and smashingmagazine.com, and the session's web-search budget was already used up. Treat every [K] number as needing a re-check before it goes into the skill as a hard rule.

Lab scripts are saved in `research/experiments/E-responsive-performance/` (a copy of the scratchpad `perf-lab/`, without node_modules or binaries).

---

## 1. Sources

### Primary, reached today
| Source | What it gave | Tag |
|---|---|---|
| `web-features` 3.40.0 (npm; W3C WebDX CG, published Sept 2026). The source of "Baseline". | Baseline status and dates for ~80 features (§3.2) | [V] |
| `@mdn/browser-compat-data` 8.1.3 (npm, 2026-09-24) | Per-browser detail below the Baseline level: font metric overrides in Safari, `interactive-widget`, `sizes=auto`, `scheduler.yield`, LoAF, Viewport Segments | [V] |
| `web-vitals` 6.2.2 source, README and CHANGELOG (GoogleChrome/web-vitals) | Thresholds (`LCPThresholds=[2500,4000]`, `INPThresholds=[200,500]`, `CLSThresholds=[0.1,0.25]`, FCP 1800/3000, TTFB 800/1800); soft navigations in Chrome 151; per-browser support | [V] |
| Lighthouse 13.5.0 source (`core/config/*.js`, metric audits) and `docs/throttling.md`, `docs/variability.md` | Score weights, emulated device, throttling constants, scoring curves, CPU calibration table, run-to-run variance advice | [V] |
| W3C WCAG "Understanding" 1.4.4, 1.4.10 and 2.5.8 (w3c/wcag on GitHub) | Zoom, reflow and target-size semantics | [V] |
| MDN content (mdn/content on GitHub): viewport meta, `<length>`, `content-visibility` | `interactive-widget` values; small/large/dynamic viewport semantics (`vh` = `lvh`); content-visibility accessibility | [V] |
| Apple HIG JSON (developer.apple.com): Buttons, Accessibility, Tab bars | 44×44 pt hit region; tab-bar rules | [V] |
| Material Components Android docs (GitHub): BottomNavigation, NavigationRail, BottomSheet | Navigation bar 3–5 destinations; rail 3–7; ≥600dp = medium | [V] |
| HTTP Archive Web Almanac 2025 (Performance, Page Weight, Fonts) and 2024 (JavaScript, Media), from the almanac repo source | Field pass rates and adoption statistics | [V] |
| Alex Russell, *The Performance Inequality Gap, 2026* (infrequently.org/2025/11/performance-inequality-gap-2026/) | 2026 test device, network and budgets | [V]* read through a verbatim transcription in a public GitHub repo (javausermiss/day_news, 2026-08-27), because infrequently.org was blocked. The budget table itself is an image, so the numbers below come from the text. |
| `utopia-core` 1.6.0 (npm; the maths behind utopia.fyi, including Maxwell Barvian's WCAG 1.4.4 check) | Fluid clamp generation and the zoom-compliance calculation | [V] |

### Secondary, from prior knowledge (not re-fetched)
Every Layout (Heydon Pickering & Andy Bell): the primitives and "algorithmic layout". Utopia (James Gilyead & Trys Mudford, Clearleft). Maxwell Barvian, "Addressing Accessibility Concerns With Using Fluid Type" (Smashing, 2023): the "max ≤ 2.5 × min" rule, which I re-derived with utopia-core in §3.3. Adrian Roselli, "Under-Engineered Responsive Tables" (2020) and "A Responsive Accessible Table" (2017). Steven Hoober, "How Do Users Really Hold Mobile Devices?" (UXmatters, 2013) and "Design for Fingers, Touch, and People" (2017). NN/g, "Hamburger Menus and Hidden Navigation Hurt UX Metrics" (2016), "Bottom Sheets", "Mobile Tables". Luke Wroblewski on priority+ and bottom navigation. web.dev: Optimize LCP / INP / CLS, "Font best practices", "Viewport units", bfcache. Chrome's HTTP cache partitioning (Chrome 86, Oct 2020). StatCounter screen-resolution statistics. Twitter Engineering's "capping image fidelity on ultra-high resolution devices".

---

## 2. Gap analysis — what the skill says versus what an app or ecommerce redesign needs

| Area | Skill today | Missing |
|---|---|---|
| Layout method | "fluid grids, content breakpoints" | Intrinsic primitives; container queries versus media queries; `:has()`, subgrid, logical properties; a way to choose between them |
| Type | vw nowhere mentioned | Fluid type with a rem anchor; the WCAG 1.4.4 zoom rule, which vw-only and over-steep clamps both fail |
| Viewport | `100svh` mentioned once, in visual QA | svh/lvh/dvh semantics; safe areas; virtual keyboard (`interactive-widget`, VisualViewport) |
| Navigation | "links behind a labelled Menu" | Transformation by product type and item count: tab bar, rail, sidebar, priority+, sheets |
| Data | none | Table strategies by data type; dashboards on phones; forms and keyboards; density modes |
| Touch | 24 px (WCAG 2.5.8) | 44 pt / 48 dp comfort sizes; hover-only UI; gestures; evidence on thumb reach |
| Testing | 5 widths | 16 viewport classes, 320 reflow, zoom 200/400%, landscape phones, foldables, cheap-Android CPU and network emulation, an overflow root-cause detector |
| Perf metrics | CWV thresholds, Lighthouse once | INP causes and how to measure them in the lab (timespan / Playwright); LCP subparts; field versus lab; soft navigations; Lighthouse 13 changes; run variance |
| JS weight | "no runtime framework for static content" | Budgets (Russell 2026), measured library costs, icon/date/chart traps, hydration and islands |
| Fonts | "swap, size-adjust" | Metric overrides computed from the real fallback (a wrong override made CLS 26× worse in the lab); Safari lacks ascent-override; cache partitioning; variable versus static |
| Capture | "grow the viewport to the document" | That method **breaks every vh/svh-sized section** (§8.10) |

---

## 3. Responsive and mobile — principles with numbers

### 3.1 Intrinsic ("algorithmic") layout before breakpoints

Every Layout's premise [K] is that a layout should state rules ("wrap when an item would drop below X", "cap the measure at 60ch") and let the browser find the arrangement for any container. Device-named breakpoints encode guesses about screens. These primitives cover roughly 90% of layouts. All of them are in `site/primitives.html`, which **the sweep verified has 0 px overflow at all 16 widths from 320 to 1920 [E]**:

| Primitive | Rule (core CSS) | Use for |
|---|---|---|
| **Stack** | `.stack > * + * { margin-block-start: var(--space) }` (the parent owns the rhythm) | Any vertical flow; nested stacks give section and element rhythm |
| **Center** | `box-sizing: content-box; max-inline-size: 65ch; margin-inline: auto; padding-inline: …` | Reading columns; page gutters |
| **Cluster** | `display:flex; flex-wrap:wrap; gap` | Tags, button groups, inline nav, meta rows |
| **Sidebar** | side `flex-basis: 16rem; flex-grow:1`; main `flex-basis:0; flex-grow:999; min-inline-size:50–55%` | Filters + results, nav + content, media + text. It wraps with no media query when main would be squeezed. |
| **Switcher** | `flex-basis: calc((var(--threshold) - 100%) * 999)` plus a quantity query that forces a stack beyond N items | 2–4 equal items that should be all in a row or all stacked, never 2+1: KPI tiles, plan cards, form button pairs |
| **Grid** | `grid-template-columns: repeat(auto-fit, minmax(min(15rem, 100%), 1fr))` (the `min()` guard stops overflow below 15rem) | Card and product grids; add **subgrid** when card internals must align across a row |
| **Cover** | `min-block-size: 100svh; display:flex; flex-direction:column`, principal element `margin-block:auto` | Splash or hero intro. Use **svh**, not dvh (§3.4). |
| **Reel** | `overflow-x:auto; scroll-snap-type:x mandatory; overscroll-behavior-inline: contain`, children `flex: 0 0 min(80%, 18rem)` | Rails of products, chips, a carousel substitute. It needs `role=region`, `tabindex=0`, `aria-labelledby` and a visible "peek". |
| **Frame** | `aspect-ratio: 16/9; overflow:hidden` + `object-fit: cover` | Media with a fixed ratio; reserves space, so no CLS |
| Box, Imposter, Icon | padding box; centred overlay; icon sized to `1cap`/`1em` | — |

Then **container queries** for components that live in different slots, and **media queries** only for page-level shell changes (navigation pattern, split panes, density defaults), because those really are about the viewport and the device posture.

### 3.2 Browser support (web-features 3.40.0 and BCD 8.1.3, as of 2026-09-28) [V]

"Widely" = Baseline widely available (30 months after the last engine shipped). "Newly" = in all core browsers.

| Feature | Status | Dates / versions | Implication for the skill |
|---|---|---|---|
| Container size queries (+ `cqi` units) | **Widely** | low 2023-02-14, **high 2025-08-14** (Chr 105, FF 110, Saf 16) | Default tool for components |
| Container **style** queries (custom props) | **Newly** | low **2026-05-19** (Chr 111, Saf 18, **FF 151**) | Use freely for new builds; guard with a fallback on long-tail audiences |
| Container name-only queries | Newly | 2026-05-07 | — |
| Scroll-state container queries | Not Baseline | Chrome 133 only | Enhancement only (stuck headers, snapped items) |
| `:has()` | **Widely** | high **2026-06-19** | Safe for parent-state styling |
| Subgrid | **Widely** | high **2026-03-15** | Safe for card-internal alignment |
| Logical properties | Widely | high 2024-03-20 | Use by default (RTL-ready) |
| `svh/lvh/dvh` | Widely | high 2025-06-05 | Safe; choose the right one (§3.4) |
| `clamp()/min()/max()` | Widely | 2023 | — |
| `env(safe-area-inset-*)` | Widely | 2022 | Needs `viewport-fit=cover` (iOS 11, Chrome Android 135) |
| `interactive-widget` viewport key | Not Baseline | Chrome Android 108, Firefox Android 133, **no Safari** | Progressive; iOS needs VisualViewport |
| VirtualKeyboard API | Chromium only (94) | — | Enhancement |
| VisualViewport API | Widely | 2024-02 | The cross-browser keyboard tool |
| `text-wrap: balance` | Newly | 2024-05 | Headings |
| `text-wrap: pretty` | Not Baseline | Chrome 117 / Safari 26, no Firefox | Enhancement |
| `content-visibility` | **Newly** | **2025-09-15** (Safari 26) | Long pages and lists (§4.8) |
| `contain-intrinsic-size` | Widely | 2026-03-18 | Pair it with content-visibility |
| Scroll-driven animations | **Not Baseline** | Chrome 115, Safari 26, Firefox preview only | Enhancement only, with a non-animated default |
| View transitions (same-document) | Newly | 2025-10-14 (FF 144) | — |
| Cross-document view transitions | Not Baseline | Chrome 126, Safari 18.2 | Enhancement |
| Anchor positioning | web-features: **not Baseline**; BCD: `anchor-name`/`position-area` in Chr 125/129, FF 147, Saf 26 | — | Usable with a fallback; a sub-feature holds it back |
| Popover | Newly | 2025-01 | — |
| `fetchpriority` | **Newly** | **2024-10-29** (FF 132, Saf 17.2) | Use on the LCP image |
| `loading=lazy` (img) | **Widely** | high 2026-06-19 | — |
| `sizes="auto"` | Not Baseline | Chrome 126, Firefox 150, Safari 27 (BCD) | Lazy images only, never the LCP image |
| AVIF | **Widely** | high 2026-07-25 | Default photographic format |
| `font-display` | Widely | — | — |
| **Font metric overrides** (`ascent-/descent-/line-gap-override`) | **Not Baseline**: Safari "preview" only | Chr 87, FF 89 | Fallback matching is partial on iOS/macOS Safari |
| `size-adjust` descriptor | All three (Saf 17) | — | Works everywhere |
| `font-size-adjust` | Newly | 2024-07 | Alternative fallback normaliser |
| `scheduler.yield()` | Not Baseline | Chrome 129, **Firefox 142**, no Safari | Use with a `setTimeout` fallback |
| Event Timing (INP) and LCP APIs | **Newly** | **2025-12-12** (**Safari 26.2**) | RUM for INP and LCP now works in Safari |
| Layout Instability (CLS) API | Chromium only | — | CLS is still Chrome-only in RUM |
| Long Animation Frames | Chromium 123 | — | INP attribution in Chrome |
| Soft navigations | Chrome **151** | web-vitals 6 `reportSoftNavs` | SPA route changes get their own CWV (§4.1) |
| Viewport Segments (foldables) | Chrome 138 | — | Enhancement |
| `field-sizing: content` | Newly | 2026-06-16 | Auto-growing textareas without JS |
| `overscroll-behavior` | Not Baseline (web-features definition); BCD Safari 16 partial | — | Test on iOS |
| `zstd` content-encoding | Newly | 2026-02-11 | — |

### 3.3 Fluid type and space, and the zoom trap

- **The failure.** `font-size: 5vw` does not grow when a user zooms. Zooming shrinks the CSS viewport by the same factor that it enlarges pixels, so the physical size stays constant. Measured [E]: a `5vw` h1 at a 1280 window renders at **64.0 physical px at 100%, 200% and 400% zoom (1.00×)**. That fails WCAG 1.4.4 [V].
- **What WCAG actually requires [V]:** text must *reach* 200% of its default size at some zoom level. It need not happen at exactly 200% zoom: "It is not required to achieve 200% text enlargement while remaining inside a specific breakpoint". The Understanding document's own example has text shrink in CSS px at 400% zoom and still count as 2× visually. Browsers zoom to 500%.
- **The rule [K, re-derived with utopia-core [V]]:** a `clamp(min, rem + vw, max)` passes if **max ≤ 2.5 × min** and the preferred value has a rem component. utopia-core's `checkWCAG` (Barvian's calculation) gave [E]:
  - 32→64 px (2.0×): ok. 36→88 px (2.44×): ok. 40→96 px (2.4×): ok.
  - **28→72 px (2.57×) fails** for viewports 1391–1898 px.
  - **32→120 px (3.75×) fails** for viewports 949–2782 px. This is the typical "giant hero headline".
  - A type scale of ratio 1.2→1.5 over 6 steps fails at steps 5–6.
- **Measured zoom growth [E]:** `clamp(2rem, 1.2rem + 3.2vw, 4.5rem)` reaches 1.32× at 200% zoom and 2.13× at 400%, so it passes. A Utopia step reaches 1.52× and 2.61×.
- **Recipe.** Generate tokens with Utopia maths: min/max viewport around 360–1440, a base step of 16→19 px, a ratio of 1.2→1.333, and `--space-*` pairs for fluid spacing (`fluid-scale.mjs` prints them and flags violations). For components, use `relativeTo: container` to get `cqi`-based clamps. Keep body text ≥ 16 px on phones (inputs below 16 px make iOS Safari zoom on focus [K]).

### 3.4 Viewport units, safe areas and the virtual keyboard

- **Semantics [V, MDN]:** `sv*` = the viewport with browser UI expanded. It is stable and the safest. `lv*` = UI retracted; content can hide under the toolbars. `dv*` = tracks the toolbars. It is *not stable*, so it "can cause the content to resize while a user is scrolling… performance hit". **Every browser currently implements `vh` as `lvh`.**
- **Rules.**
  - Heroes and cover sections: `min-block-size: 100svh`, and never `height: 100vh`, which clips under the toolbar.
  - `dvh` only for fixed-position full-screen layers (a modal sheet, an app shell whose body scrolls internally). Never on in-flow sections, because it re-lays out on every toolbar change.
  - Dead bands on tall desktops (already a skill lesson): cap them, e.g. `min-block-size: min(100svh, 56rem)`.
- **Safe areas:** set `viewport-fit=cover`, then pad fixed bars with `max(1rem, env(safe-area-inset-bottom))`. Landscape phones need `inset-left/right` for the notch.
- **Virtual keyboard [V, MDN/BCD]:** `interactive-widget` takes one of three values:
  - `resizes-visual` (the default): only the visual viewport shrinks, so a `position:fixed; bottom:0` submit bar stays under the keyboard.
  - `resizes-content`: the layout viewport shrinks. Supported in Chrome Android and Firefox Android, not iOS Safari.
  - `overlays-content`: neither viewport shrinks.

  For forms with sticky actions, add `interactive-widget=resizes-content` and use the VisualViewport API (Baseline widely) to reposition the bar on iOS. The VirtualKeyboard API is Chromium-only.
- **Zoom must stay on.** `user-scalable=no` and `maximum-scale` are ignored by iOS 10+ and violate 1.4.4 [V MDN]. Never ship them, including in app shells.

### 3.5 Input modes: hover, pointer, touch targets, gestures, keyboards

- **Default to no hover.** Put hover-only reveals (row actions, dropdowns) inside `@media (hover: hover) and (pointer: fine)`, and always also show them on `:focus-within`. Use `any-hover`/`any-pointer` for hybrid devices. Playwright emulation reports these correctly: `hasTouch` gives `pointer: coarse` and `hover: none` [E].
- **Target sizes:** WCAG 2.5.8 AA needs 24×24 CSS px, or 24 px spacing circles; inline links and user-agent controls are exempt; the size does not scale with zoom [V]. 2.5.5 AAA is 44×44. Apple: "a hit region of at least 44x44 pt" [V]. Material: 48×48 dp [K]. **Skill rule: 44 px for touch targets (`@media (pointer: coarse)`), and never below 24 px anywhere.**
- **Cascade bug found in the lab [E]:** a `@media (pointer: coarse) { .btn { min-block-size: 44px } }` placed *before* the base `.btn { min-block-size: 36px }` is silently overridden, because both have the same specificity. The sweep flagged 6 targets at 36 px. Put input-mode overrides after the base rules, or in a later cascade layer.
- **Gestures:** every swipe, long-press or drag needs a visible tap alternative. Drag-only fails WCAG 2.5.7 (already in technical-qa). Swipe-to-delete needs a visible delete action; carousels need buttons. Swipe gestures are not discoverable, so treat them as accelerators [K NN/g].
- **Keyboards:**
  - Pick the keyboard with `type` + `inputmode` + `autocomplete` + `enterkeyhint` (inputmode and enterkeyhint are Baseline widely [V]).
  - Card numbers and OTP codes: `inputmode="numeric"` and `autocomplete="cc-number"` / `"one-time-code"`. Not `type=number`, which adds spinners and strips leading zeros.
  - `type=email`, `type=tel` and `type=url` give the right keyboards.
  - `field-sizing: content` (Baseline 2026) for auto-growing textareas.

### 3.6 Mobile navigation and information hierarchy

- **Hidden navigation costs discoverability.** NN/g (2016) found hidden navigation was used much less than visible or "combo" navigation, with slower tasks and higher perceived difficulty, on desktop and phones. My memory of the figures is ≈57% versus 86% on mobile and 27% versus 48% on desktop [K: verify]. Conclusion for the skill: **show the top 3–5 destinations when you can** (tab bar, visible links, priority+), and hide only the long tail.
- **Platform conventions [V]:**
  - Apple tab bars: for navigation, not actions (use a toolbar for actions). Keep the bar visible across sections (modals excepted). Avoid overflow "More" tabs because hidden tabs are "harder to reach and notice". Use single-word labels. Never disable or hide tabs; explain empty states instead. iOS 26 lets a tab bar minimise on scroll when it carries an accessory.
  - Material: navigation bar for **3–5** destinations on compact and medium windows; navigation rail for **3–7** on tablet and desktop; ≥600 dp is "medium".
- **One-handed use: evidence versus folklore [K].**
  - Hoober (2013, 1,333 observations): ~49% one-handed, ~36% cradled, ~15% two-handed. People shift grip constantly.
  - His 2017 touch studies: people prefer to tap and look at the **centre**. Accuracy is best at centre (~7 mm targets) and worst at top and bottom edges (~11–12 mm).
  - Folklore: the "thumb zone" heat map (reach modelled from a static grip) and "never put anything top-left". The iOS back button lives there, and people regrip.
  - Evidence-backed rules:
    - Primary content and actions near the centre and bottom.
    - Larger targets and spacing at the screen edges.
    - Persistent bottom navigation for frequent destinations.
    - Destructive actions away from high-traffic tap zones.
    - Don't cram everything into the lower third.
- **Sticky CTAs:** one sticky primary action per screen on phones (buy, apply, checkout). It must not cover content at the end of the page: pad the body by its height plus the safe area. It must not obscure focused elements (WCAG 2.4.11), so use `scroll-padding-block-end`. Hide it when the in-flow CTA is visible (IntersectionObserver).
- **Bottom sheets:** for filters, sort, quick detail and pickers. Use a modal sheet (scrim, focus trap, Escape, a grab handle *plus* a close button) or a standard sheet (co-exists with content). The apply button should show the result count ("Show 132 results"). Full-screen when the content is long [K NN/g]. Build with `<dialog>` (Baseline widely), `dvh` for the max height, and the safe-area inset.
- **Off-canvas drawers** are fine for deep hierarchies (enterprise admin, taxonomies of more than 7 items). Label the button "Menu", give it an accessible name, `aria-expanded` and a focus trap, and keep the current section visible in the top bar.
- **Priority+** (Scharnagl; Wroblewski [K]): show as many top-level links as fit and put the rest in "More". Implement it with a ResizeObserver, or with CSS only by setting a fixed number of visible items per container query.

### 3.7 Responsive data: tables, dashboards, forms, long content, density

**Tables.** WCAG 1.4.10 exempts content "that requires two-dimensional layout for understanding", such as data tables, from reflow, but each *cell* must still reflow [V]. So horizontal scrolling of a genuine table is allowed. It is not allowed for the page.

- **Roselli's under-engineered pattern [K]:** wrap the table in `<div role="region" aria-labelledby="caption-id" tabindex="0">` with `overflow-x:auto`. That makes it keyboard-scrollable and announced, with a visible focus style.
- **Sticky first column** (`position:sticky; inset-inline-start:0`, needs `border-collapse: separate`) and a sticky header.
- **If you restyle table elements with `display:block/grid`**, some browsers drop table semantics. Either re-add `role=table/row/cell/columnheader`, or restyle only inside a container query and test with a screen reader.
- **Lab [E]:** the scroll-region table plus a container-query "stacking" table (rows become 2-column grids with `data-label` pseudo-labels below 34rem of container) both rendered with 0 page overflow from 320 to 1920. The sweep reports scroll regions that are not focusable or not labelled.

**Dashboards on phones.** Decide what a person does on a phone with this product. It is usually "check status, triage, approve, look something up", not "analyse". Then:

1. Reorder: alerts and anomalies → KPI tiles (Switcher: 2-up, then stack) → the one most important trend → the actionable list.
2. Cut: secondary charts and wide tables go behind "View report". Replace tooltip-dependent charts with charts that label values directly (no hover on touch).
3. Charts: keep the aspect ratio (Frame) and reduce ticks; use sparklines in tiles. Legends go above or directly on the chart.
4. Filters: one date-range chip in the top bar; the rest in a bottom sheet.
5. Performance: charts are heavy (§4.7). Lazy-mount below-the-fold widgets with `content-visibility:auto` or on intersection.

**Forms.**
- Single column, labels above, full-width inputs at ≥ 44 px, correct keyboards (§3.5), `autocomplete` everywhere.
- Error messages under the field, with a summary at the top linking to each field.
- For multi-step forms, a step indicator and saved progress.
- The submit button stays in flow or sticky above the keyboard (§3.4).
- Never block paste; nothing asked twice (3.3.7).

**Long content.**
- Sticky, collapsible in-page table of contents (a `<details>` summary on phones).
- `content-visibility:auto` on sections (§4.8). Chapters' anchors get `scroll-margin-top`.
- Avoid infinite scroll where a footer matters; use "Load more".

**Adaptive density** (apps, admin, data tools):
- Offer comfortable and compact modes as tokens (`--row-pad`, `--control-h`: 44/36/28 px). Default by pointer: coarse means comfortable, fine allows compact.
- Persist the user's choice; per-user preference beats device detection.
- Compact must still meet 24 px targets. Row click areas count.
- **Cost [E]:** a density toggle that re-lays out every row took **152 ms INP at 1,000 rows (7k nodes), 656 ms at 5,000 rows and 2,880 ms at 20,000 rows** at 4× CPU. With `content-visibility:auto` on row groups it took 24, 32 and 64 ms. Density toggles on big views need virtualization or content-visibility.

### 3.8 Which widths, zoom levels and devices to test

**Viewport classes** (CSS px). The device widths come from Playwright's 143 descriptors [V]; the popularity ranking is StatCounter 2025 [K]:

| Class | Width × height | Why |
|---|---|---|
| Reflow floor | **320**×640 | WCAG 1.4.10 = 1280 at 400% [V]; old iPhone SE |
| Small Android | **360**×780–800 | Most common Android CSS width [K]; Galaxy S24 = 360×780 [V] |
| iPhone SE/mini | 375×667 | Short height |
| Current iPhone | **390/393**×844–852 | iPhone 12–16. Playwright iPhone 15 = 393×659 *visible* [V]. |
| Large Android | **412**×915 | Pixel 7 412×839 @2.625 [V]; **Lighthouse's Moto G Power = 412×823 @1.75** [V] |
| Pro Max/Plus | 430×932 | — |
| Landscape phone | **844×390**, 915×412 | Short heights break sticky header + footer + keyboard combinations |
| Foldable inner / small tablet | ~600–720 | Galaxy Tab S9 640×1024 [V]; hinge through Viewport Segments (Chrome 138) |
| Tablet portrait | **768**, 810, **820/834** | iPad mini/Air/Pro 11 [V] |
| Tablet landscape / small laptop | **1024**×768 | Two-column layouts squeeze here first |
| Laptops | **1280**, **1366**, 1440, **1536** | 1536 = 1920 at 125% Windows scaling, a very common desktop width [K] |
| Desktop | **1920**×1080 | Most common desktop [K] |
| Wide | 2560 | Max-width sanity, background bleed |
| Zoom | 1280 at 200% (=640 CSS px, DPR 2) and 400% (=320, DPR 4) | 1.4.4 and 1.4.10 |

**Playwright descriptor traps [E/V]:**
- iPhone and iPad descriptors default to WebKit. With only Chromium installed, delete `defaultBrowserType` and reuse the viewport, DPR and touch settings.
- "Galaxy S9+" is 320×658 @4.5 (display-zoomed).
- iPhone heights are the *visible* area, not the screen.
- `isMobile` is not supported in Firefox.

**Cheap-Android emulation:**
- Lighthouse's default is Moto G Power 412×823 @1.75, slow 4G (150 ms RTT, 1.6 Mbps, simulated) and **4× CPU**.
- The CPU multiplier is relative to the host. Lighthouse's calibration table [V]: a high-end desktop (benchmarkIndex 1500–2000; this container scored **1769.5** [E]) needs 4× (2–10) for mid-tier mobile and **10× (5–20) for low-end mobile**.
- Russell's 2026 P75 target is **9 Mbps down, 3 Mbps up, 100 ms RTT, Samsung Galaxy A24 4G (Helio G99 / Exynos 1330 class)** [V*]. That makes Lighthouse's slow 4G a *stress* test and Russell's numbers the realistic P75 test.
- For Playwright + CDP use `Network.emulateNetworkConditions` (request-level; Lighthouse's "applied" slow-4G values are 562.5 ms latency, 1474.56 kbps down, 675 kbps up) and `Emulation.setCPUThrottlingRate` [E].

---

## 4. Performance — principles with numbers

### 4.1 Metrics, thresholds, lab versus field

- **Core Web Vitals** (web-vitals 6.2.2 constants [V]):

  | Metric | Good | Needs improvement | Poor |
  |---|---|---|---|
  | LCP | ≤ 2500 ms | ≤ 4000 ms | > 4000 ms |
  | INP | ≤ 200 ms | ≤ 500 ms | > 500 ms |
  | CLS | ≤ 0.1 | ≤ 0.25 | > 0.25 |

  Diagnostics: FCP 1800/3000 ms, TTFB 800/1800 ms. Assessed at the 75th percentile of page loads, mobile and desktop separately [K web.dev; the Almanac restates "at least 75% of sessions" for INP [V]].
- **Where the web stands (Almanac 2025, CrUX) [V]:**
  - Mobile CWV pass rate 36% (2023) → 44% (2024) → **48% (2025)**.
  - Good LCP: 62% mobile, 74% desktop. Good INP: 77% mobile, 97% desktop. Good CLS: 81% mobile, 72% desktop.
  - Top 1k mobile sites pass at 51%. Secondary pages pass 11 points more often than home pages on mobile.
  - Russell 2026: "not even half of origins" pass on mobile, and progress is plateauing [V*].
- **Lab ≠ field.** Lighthouse is one synthetic load on one emulated device. CrUX is 28 days of real Chrome users, and the web-vitals library measures your real users.
  - `onCLS` is Chromium-only. LCP and INP now work in Firefox and **Safari 26.2+** [V].
  - web-vitals can't see into iframes; CrUX can [V].
  - Lighthouse navigation mode **cannot measure INP**. It reports TBT as a proxy. INP needs a user flow (timespan) or scripted input [V/E].
- **SPAs:** Chrome 151 ships **soft-navigation** measurement. A soft navigation is a user interaction plus a URL change plus a paint. web-vitals v6 `reportSoftNavs:true` reports per-route LCP, CLS and INP; TTFB is reported as 0 [V]. Whether CrUX aggregates soft navigations is unconfirmed [K?]. Treat it as RUM-only for now.
- **Lighthouse 13.5 scoring [V]:**
  - Weights: FCP 10, SI 10, **LCP 25, TBT 30, CLS 25**; INP weight 0 (timespan only).
  - Mobile LCP curve: p10 = 2.5 s, median = 4.0 s. Desktop: 1.2 / 2.4 s.
  - TBT mobile: 200 / 600 ms. Desktop: 150 / 350 ms.
  - Lighthouse 13 replaced many legacy audits with DevTools-style **insights** (`lcp-discovery-insight`, `render-blocking-insight`, `cls-culprits-insight`, `image-delivery-insight`, `font-display-insight`, `dom-size-insight`, `inp-breakdown-insight`, `third-parties-insight`…) and **removed `--budget-path`** [E]. Budgets now live in LHCI assertions.
  - The median of 5 runs is "twice as stable as 1 run" [V]. Never compare scores across Lighthouse versions: the same bad page scored **54 on LH 13.5 and 65 on LH 12.6** [E].

### 4.2 LCP: what drives it

- **LCP subparts** (Lighthouse and web-vitals attribution): TTFB → resource load delay → resource load duration → element render delay [V]. web.dev's guidance is that the delays should be small and most of the time should be TTFB plus load duration [K].
- **Lab [E]:** the bad page's LCP image was lazy, undiscoverable and without `fetchpriority`. Lighthouse's `lcp-discovery-insight` checklist flagged all three: `priorityHinted:false`, `requestDiscoverable:false`, `eagerlyLoaded:false`. The resulting LCP was **44.9 s** (simulated; an 8.5 MB PNG). The fixed page reached **2.0 s** (mobile) and 0.5 s (desktop) with a `<picture>` AVIF srcset, `fetchpriority=high`, explicit width and height, and no lazy loading. Under Playwright slow-4G + 4× the good page gave LCP 1380 ms: load delay 653, load duration 691, render delay 28 [E].
- **Field [V Almanac 2025]:**
  - Images are the LCP element on **76% of mobile pages** (text on 23.7%). Mobile is more often text because heroes get removed or shrunk.
  - **~16% of pages still lazy-load their LCP image.**
  - Only **17%** of mobile pages with an LCP image use `fetchpriority="high"`; preload is at 2.1–2.2%.
  - LCP image formats: JPG 57%, PNG 26%.
  - 16–18% serve the LCP image cross-origin, which costs a connection unless preconnected.
- **UI decisions that set LCP:**
  1. What the hero *is*. Text renders as soon as the font is ready; an image needs a fetch. A video poster or a carousel's first slide rendered by JS adds render delay.
  2. Whether the hero is in the HTML. Client-rendered heroes, CSS `background-image` heroes and `data-src` lazy loaders are all undiscoverable to the preload scanner.
  3. Hero size in bytes at the rendered width.
  4. Render-blocking CSS and JS in `<head>`. In the lab the 500 KB synchronous head script **did not show in TBT** (it runs before FCP) but pushed FCP to 1.7–2.1 s and cost 420 ms in render-blocking [E].
  5. Font strategy for text LCP. `font-display:block` delays it.
  6. Hero animations: an entrance fade from opacity 0 delays LCP until the element paints.

### 4.3 INP: what drives it

- **INP = input delay + processing duration + presentation delay** (web-vitals attribution) [V].
- **Lab [E]:** a click handler with 350 ms of synchronous work gave **INP 376 ms** (processing 353). Updating the UI first and then `await scheduler.yield()` (with a `setTimeout` fallback) gave **INP 24 ms** (7 / 2 / 14). Lighthouse user-flow timespan agreed: **390 ms versus 20 ms** [E].
  - But TBT was ~910 ms in both, because the long task still ran. Yielding once fixes *that* interaction's paint; it doesn't free the thread for the *next* input. Chunk the work (yield inside loops) or move it to a Worker.
- **UI decisions that set INP:**
  - **Hydration.** Buttons don't respond until the JS owning them boots, and each input waits behind boot tasks.
  - **Big DOMs.** Style and layout scale with the number of nodes; see the density toggle in §3.7. Lighthouse's `dom-size-insight` fires when a style recalc touches >300 elements or a layout >100 objects and takes >40 ms [V trace_engine].
  - Global state changes that re-render large trees (theme or density switches, filters over large lists).
  - Synchronous analytics in handlers; third-party tag managers.
  - Layout thrash (read-after-write).
  - Heavy CSS such as large blurs on the changed area (presentation delay).
  - Rich-text editors, maps and chart re-renders on filter changes.
- **Field [V]:** mobile INP is good for 77% of sites, but TBT rose 58% between 2024 and 2025. Pages are shipping more JS even as interaction handling improves.

### 4.4 CLS: what drives it

- **Lab [E]:** the bad page scored **0.353–0.469**. The causes were an unsized image (Lighthouse cause "Unsized image element") and a cookie banner prepended at the top 900 ms after load. The good page's fix: the banner is a fixed overlay at the bottom that animates with `transform`, and images carry width and height.
- The *good* page still measured **0.027** in Playwright: the web-font swap moved the hero. That led to the font experiment in §4.6.
- **Field [V]:** **62% of mobile pages** have at least one image without dimensions (66% in 2024).
- **UI decisions that set CLS:**
  - Media without `width`/`height` or `aspect-ratio`.
  - Banners (cookie, promo, app-install) inserted above content.
  - Late ads and embeds without reserved space; skeletons whose height differs from the content.
  - Web-font swaps with unmatched fallbacks.
  - Animating `top`/`height`/`margin` instead of `transform`.
  - Accordions opening on load; sticky headers that change height on scroll.
  - Carousels that size to their first slide after JS.
  - Also: preserve bfcache eligibility (no `unload` handlers), so back/forward restores don't re-shift [K].

### 4.5 Images

- **Format.**
  - AVIF is Baseline widely (July 2026) [V]; serve it through `<picture>` with WebP and JPEG fallbacks, or let an image CDN negotiate.
  - Lab encodes (sharp 0.35.5; mozjpeg q80, WebP q75, AVIF q50 effort 4) [E], sizes in KB:

    | Width | JPEG | WebP | AVIF |
    |---|---|---|---|
    | 480 | 7.3 | 3.5 | 3.6 |
    | 800 | 15.1 | 6.7 | 6.6 |
    | 1200 | 29.7 | 12.9 | 10.6 |
    | 1600 | 57.2 | 31.8 | 16.0 |
    | 2400 | 202 | **214.5** | **81.2** |

    The "design-tool export" PNG was **8,529 KB**.
  - Two lessons. WebP can be *larger* than mozjpeg on grainy images, as at 2400 here. AVIF encoding is slow: ~25 s for 5 widths × 3 formats on this host. Build images at build time or on a CDN, never per request. The image is synthetic, so treat these as ratios, not budgets.
- **Responsive.**
  - `srcset` width ladder: for full-bleed images 480/800/1200/1600/2000(–2400); for content images, 1× and 2× of the maximum rendered width.
  - `sizes` must match the layout. `sizes="100vw"` on a half-width image doubles the bytes.
  - In the lab, a Moto G4 (360 CSS px @3) picked **hero-1200.avif**. DPR 3 phones fetch about 3× the CSS width. Consider capping at 2× for photos: others have found above-2× fidelity rarely perceptible [K Twitter eng.]. Do it by dropping the largest candidate for small `sizes`.
  - `sizes="auto"` only with `loading=lazy`, and it is not in Safari ≤ 26 [V].
- **Loading.**
  - LCP image: never lazy, `fetchpriority="high"`, in the HTML (not CSS or JS).
  - Everything below the fold: `loading="lazy"` with explicit dimensions.
  - `decoding="async"` for non-LCP images.
  - Preload only when the LCP image is not in the HTML (a CSS background, or an art-directed `<picture>`). Use `imagesrcset`/`imagesizes` (Baseline widely [V]).
- **Art direction:** `<picture><source media="(max-width: 40rem)" srcset="crop-portrait…">`. Every source needs the same aspect ratio as its `<img>` width and height, or the source sets its own `width` and `height` (supported on `<source>`) [K].
- **Pipelines:** framework image components (next/image, astro:assets, nuxt/image), image CDNs (Cloudinary, imgix, Cloudflare Images, Vercel), or sharp at build time. Sanity: one source of truth, generated widths, AVIF/WebP, dimensions emitted into the HTML.
- **SVG:** SVGO 4.1 on a design-tool-style illustration: **20.0 → 12.5 KiB (−37.5%)**, gzip 8.2 → 4.6 KB [E].
  - Keep `viewBox` (`removeViewBox: false`).
  - SVGO *kept* `data-name` attributes and an exported `<title>illustration-final-v7</title>`, which leaks a file name to screen readers. Remove it, or write a real title.
  - Inline only small, styled icons. Reference big illustrations as `<img>` so they cache and don't bloat the HTML.
- **Budgets:**
  - LCP hero ≤ ~150–250 KB at the rendered width on phones (AVIF usually far less).
  - Total image bytes in the first viewport ≤ ~300 KB.
  - Whole page ≤ ~1 MB of images on first view. Field context: the median mobile page loads 911 KB of images; the p90 *home page* 6.9 MB [V Almanac 2025].

### 4.6 Fonts

- **Self-host by default.**
  - Since HTTP cache partitioning (Chrome 86, 2020; the other engines similar) a CDN font is never shared across sites [K]. The Almanac notes cache partitioning "removed some of the old performance advantage", and 72% of sites now self-host at least partly [V].
  - Google Fonts' CSS already splits each family into `unicode-range` subsets (cyrillic, vietnamese, latin-ext, latin: seen in the fetched CSS [E]). Self-hosting should keep a latin subset at minimum.
- **Formats and variable fonts.**
  - WOFF2 only; 65% of font requests are WOFF2 [V].
  - Lab: Playfair Display latin **700 static = 23 KB; 400–900 variable = 38 KB** [E]. A variable font wins from the second weight on.
  - The lab's "good" page preloaded a 348 KB TTF (187 KB gzipped) and LHCI flagged it [E]. Convert and subset.
- **Loading.**
  - Preload at most the 1–2 files used above the fold, with `crossorigin` even on the same origin.
  - `font-display: swap` for text (50% of pages use it [V]).
  - `optional` when the brand can tolerate a fallback on the first visit: **0 CLS in the lab** [E].
  - Never `block` for body text.
- **Metric-matched fallbacks.** Lab under slow-4G, 4× CPU, 360 px, identical across 3 runs each [E]:

  | Fallback strategy | CLS |
  |---|---|
  | Generic `serif` fallback (on this Linux) | 0.0029 |
  | Overrides computed for **Times New Roman Regular** (capsize metrics), applied to a **bold** local fallback | **0.0753** (26× worse) |
  | Overrides pointing only at `local("Times New Roman")` (absent on Linux, so silently unused) | 0.0029 |
  | Overrides computed **from the actual local bold file** (`@capsizecss/unpack` → `createFontStack`) | **0.000** |
  | `font-display: optional` | **0.000** |

  Rules:
  - Compute overrides from the exact fallback face *and weight* you will use (`font-fallback.mjs`, i.e. fontaine / next/font / capsize). List `local()` names for each platform (Times New Roman / Georgia on Apple and Windows; Liberation, DejaVu or Noto on Linux and Android).
  - **Measure CLS after adding overrides.** A wrong override is worse than none.
  - Safari ignores `ascent-/descent-/line-gap-override` (BCD: preview only). It honours `size-adjust` (Safari 17) [V]. On iOS the vertical metrics won't match; `font-size-adjust` (Baseline newly) is a partial complement.

### 4.7 JavaScript weight

- **Budgets.**
  - Russell 2026 [V*]: for P75 (Galaxy A24 4G, 9/3 Mbps, 100 ms RTT), with **four** connections, a 3 s target allows **1.5 MiB critical-path total for JS-light pages (15% JS) or 935 KiB for JS-heavy pages (50% JS)**; a 5 s target allows 3.2 / 1.9 MiB. Two connections add about 350 KiB at 3 s and about 0.5 MiB at 5 s.
  - Derived JS ceilings at 3 s (budget × JS share): JS-light ≈ **~230–280 KiB of JS**; JS-heavy ≈ **~470–640 KiB of JS** (compressed; the range is four vs two connections). Budgets have grown ~600 KiB since 2024, and "most sites should be able to put up interactive content much sooner".
  - Field: median mobile JS is **646 KB** (Almanac 2025) or 680 KiB (Russell); P75 is 1.3 MiB; p90 1.9 MB [V].
- **Measured library costs** (esbuild, ESM, minified, `NODE_ENV=production`, gzip -9; React external unless it is the baseline) [E]:

| Dependency (version) | gzip KB | Note |
|---|---|---|
| react + react-dom 19.3 (client root) | **67.3** | Framework floor |
| preact 10.29 | **4.3** | 15× smaller floor |
| MUI 9.4 `Button` | 37.4 | One button pulls in Emotion and the theme system |
| MUI Button + Dialog + TextField | 65.1 | — |
| Radix Dialog 1.1 | 13.3 | Headless |
| Headless UI 2.2 Dialog | 16.3 | — |
| Base UI 1.8 Dialog | 23.0 | (package renamed `@base-ui/react`) |
| React Aria Components 1.21 Dialog + Modal + Button | 26.5 | Strongest a11y out of the box |
| lucide-react 1.48, 3 named icons | 2.0 | — |
| **lucide-react `import * as Icons` + dynamic lookup** | **192.4** | The tree-shaking trap: string lookups defeat it |
| react-icons/fa, 3 named | 1.6 | — |
| Phosphor, 3 named | 1.6 | — |
| `Intl.DateTimeFormat` | 0.1 | Built in; prefer it |
| date-fns 4 (format + addDays) | 5.6 | — |
| dayjs | 3.3 | — |
| luxon | 21.5 | — |
| moment (no locales) | 20.3 | — |
| motion 13 `<motion.div>` | 40.9 | — |
| motion `LazyMotion + m + domAnimation` | 27.5 | Recommended React path |
| motion `animate()` (vanilla) | 19.9 | — |
| **motion/mini `animate()` (WAAPI)** | **3.8** | — |
| GSAP 3.15 core / + ScrollTrigger | 27.0 / 44.2 | — |
| chart.js/auto / tree-shaken line only | 68.7 / 48.2 | — |
| recharts 3.10 LineChart | 102.7 | — |
| **echarts 6 full / core + line + canvas** | **374.6 / 172.3** | — |
| TanStack Table v9 core | 10.5 | (v9 API: `useTable`, `coreFeatures`) |
| **AG Grid 36 community (all modules) + react** | **320.8** | Register only the modules you use |
| lodash default import / lodash-es `{debounce}` | 26.2 / 1.4 | — |
| **zod 4 classic / zod/mini** | **90.5 / 4.6** | — |

- **Architecture choices, by product type [K]:**
  - **Static or marketing:** zero client JS by default; islands (Astro `client:visible`/`client:idle`) for the widget that needs it.
  - **Content + commerce:** server rendering (RSC or a traditional server) with islands for the cart, search and filters. Product listing pages stream HTML. Avoid hydrating the whole page to power one "Add to cart".
  - **Apps and dashboards:** route-level code splitting; lazy-load charts, editors and grids on intersection or first use; prefer headless primitives over full design-system kits when the budget is tight; Workers for data crunching.
  - **Third parties:** audit every tag. Use facades for video and chat (a static poster with a click to load). Load analytics after first interaction or idle. Reserve space for embeds.

### 4.8 Rendering and GPU

- **Animate only compositor-friendly properties** (`transform`, `opacity`; `filter` sometimes). `will-change` only just before and during an animation: permanent `will-change` on many elements causes "layer explosion", with memory pressure and slow compositing on low-end Android [K].
- **Expensive paints [K]:**
  - `backdrop-filter: blur()` over scrolling content: blurs are recomputed every frame. Keep them small in area, and never on large scrolling panels or lists.
  - Large-radius `box-shadow` on many cards during scroll or animation: use a pseudo-element shadow and animate its opacity.
  - Big `filter: blur()` on backgrounds: pre-render to an image.
  - Fixed full-screen gradients with `background-attachment: fixed`.
  - Headless Chromium runs with the GPU off here, so **the lab cannot measure compositing costs**. Validate on a real mid-tier Android through remote debugging.
- **`content-visibility: auto` + `contain-intrinsic-size: auto <estimate>`** on repeated sections [E]:
  - Initial render **394 → 89 ms (1k rows), 2171 → 206 ms (5k rows), 7701 → 711 ms (20k rows)**.
  - Density-toggle INP 152 → 24, 656 → 32, 2880 → 64 ms.
  - Off-screen content stays in the accessibility tree and in find-in-page [V MDN]. Baseline newly available since 2025-09-15 [V].
  - Cost: the scrollbar can jump when estimates are wrong. The `auto` keyword remembers the rendered size.
- **Scroll-linked effects:** JS scroll listeners run on the main thread and jank under load; use IntersectionObserver for reveals. CSS scroll-driven animations (Chrome 115, Safari 26, not Firefox) run off-thread for compositor properties. They must be an enhancement, and content must be visible without them (the skill's "reveals that fail visible" lesson).

### 4.9 Measurement toolbox

| Need | Tool | Status here |
|---|---|---|
| Lab audit, one page | Lighthouse CLI 13.5 (`--preset=desktop`, `--throttling.cpuSlowdownMultiplier`) | Works, 11–13 s/run [E] |
| Lab INP | Lighthouse **user flow** (navigate + timespan with real clicks); Playwright + web-vitals | Works [E] |
| Budgets in CI | LHCI `autorun` with assertions (`resource-summary:script:size`, `largest-contentful-paint`, `lcp-discovery-insight`…) | Works; bundles LH 12.6.1 [E] |
| Site-wide | unlighthouse-ci (`urls` list or crawl) | Works: 4 routes in 26 s [E] |
| Field data | CrUX API / PageSpeed Insights API / CrUX Vis / Search Console CWV | PSI answered 429 without a key; CrUX API 403 without a key [E]. Both need an API key. |
| Real users | web-vitals 6 attribution build → analytics endpoint; `reportSoftNavs` for SPAs | — |
| Deep traces | Playwright `browser.startTracing(page,{screenshots:true})` → DevTools Performance panel | Works; 6.7 MB good / **102 MB** bad trace [E] |
| WebPageTest | Filmstrips, real devices, connection-level shaping | Not reachable here [K] |

---

## 5. Decision guides

### 5.1 Layout primitive choice

```
Is it the page shell (nav pattern, split panes, global density)?        → media query on viewport (+ pointer/hover)
Is it a component that appears in slots of different widths?            → container size query (+ cqi fluid type)
Is its variant decided by an ancestor's state/theme?                     → container style query (Baseline 2026-05) or :has()
Is it styled by its own children/state (has image, has error, empty)?    → :has()
Otherwise pick the primitive by content shape:
  vertical sequence ............................ Stack
  readable text ................................ Center (60–75ch)
  inline set of variable-width things .......... Cluster
  fixed-ish side + fluid main .................. Sidebar (wraps < ~50% main)
  2–4 equal peers, all-in-a-row or all-stacked . Switcher (quantity-capped)
  many similar items ........................... Grid auto-fit minmax(min(Xrem,100%),1fr); subgrid for inner alignment
  full-height intro ............................ Cover (100svh)
  browse horizontally .......................... Reel (snap, focusable region, visible peek)
  fixed-ratio media ............................ Frame (aspect-ratio)
Breakpoints: only where content breaks. For app shells, align with window classes
  compact < 600 · medium 600–839 · expanded 840–1199 · large ≥ 1200 (Material [V for 600; K for the rest]).
```

### 5.2 Navigation transformation

| Product / item count | Phone (compact) | Tablet (medium) | Desktop (expanded+) |
|---|---|---|---|
| **Marketing site**, ≤ 5 links + 1 CTA | Logo, **visible primary CTA**, labelled "Menu" button → full-screen or sheet menu. If 2–3 links are short, show them inline (priority+). | Often all links fit inline; otherwise priority+ | Inline links + CTA; sticky header gains a rule after scroll |
| Marketing site, 6–10 links / mega-menu | Menu → accordion groups; search visible if it is a primary task | Priority+ with "More" | Mega-menu that opens on **click** (hover-intent only as an enhancement), keyboard operable |
| **Ecommerce** (deep taxonomy) | Top bar: menu, logo, **search field (not just an icon)**, cart with count. Category drill-down panel. Optional app-like bottom bar (Home, Categories, Search, Cart, Account). Product listings: sticky "Filter · Sort" bar → **bottom sheet** with a results-count apply button. Product page: **sticky add-to-cart** once the in-flow button scrolls out. | Same + 2-column product listing; filters in a sheet or collapsible side panel | Persistent filter sidebar (Sidebar primitive), mega-menu, sticky header with search |
| **SaaS / web app**, 3–5 primary destinations | **Bottom tab bar** (icon + one-word label, always visible, safe-area padded, current tab `aria-current`); top app bar = page title + contextual actions (a toolbar, not tabs) | **Navigation rail** (3–7) | **Sidebar** (collapsible to a rail), global search / command palette, account menu top-right |
| SaaS, 6+ destinations | 4 most-used tabs + "More" (Apple warns overflow tabs hide content, so keep the long tail genuinely long-tail) or a drawer with the top tasks on home | Rail with the top 5–7 + "More" | Grouped sidebar with section headings; Cmd/Ctrl-K palette as an accelerator |
| **Enterprise admin** (20+ sections, deep) | Drawer ("Menu") with search inside; home screen surfaces the mobile tasks (approve, look up, notifications); breadcrumbs collapse to a back link | Drawer or rail | Multi-level sidebar + breadcrumbs + in-page tabs; remember collapsed state |
| **Dashboard** | Top bar with a date-range chip; KPI tiles → primary chart → actionable list; the rest behind "View report" | 2-column tiles, one main chart | Grid of widgets (container queries per widget) |
| Content / docs | Menu + prominent search; in-page TOC in `<details>` | TOC as a drawer | Left nav + right "On this page" TOC (sticky) |

Hard rules:
- Never hide the only search behind an icon in search-led products.
- Tab bars navigate; toolbars act.
- Never more than 5 bottom tabs.
- The current location is always visible.
- Mobile menus are labelled, trap focus, close on Escape, restore focus and lock body scroll.
- On phones the primary action stays visible at every width (already in the skill).

### 5.3 Table strategy by data type

| Data shape | Examples | Strategy on narrow containers | Why |
|---|---|---|---|
| **Comparison matrix** (users compare across rows *and* columns) | Pricing plans, spec comparison, timetables, financial statements | **Keep the table**. Scroll region (`role=region`, `tabindex=0`, `aria-labelledby`, focus ring) + sticky first column + sticky header + a visible scroll cue (edge shadow). Optionally "compare 2 of N" pickers on phones. | The 2-D relationship *is* the content; WCAG 1.4.10 exempts it [V] |
| **Entity list** (scan, pick one, act) | Orders, invoices, tickets, users, search results | **Transform to a list of cards** below a *container* width (~34rem): identifier as heading, 2–4 key fields, status, one primary action; the rest in the detail view | People read one record at a time; cards remove sideways scanning |
| **Wide analytic table** (many numeric columns) | Reports, analytics exports | **Priority columns**: show 2–4 by default, column chooser for the rest; freeze the first column; `font-variant-numeric: tabular-nums`, right-aligned numbers, sticky totals | Keeps comparability for the chosen metrics |
| **Key → value** (one entity, many attributes) | Spec sheets, account details | `<dl>` in 2 columns → stacked pairs | Not tabular in the first place |
| **Very long** (1k–100k rows) | Logs, transactions | Pagination or virtualization; `content-visibility:auto` for low thousands; true virtualization (TanStack Virtual, AG Grid) beyond | DOM cost (§3.7 lab numbers) |
| **Editable grid** | Spreadsheet-like admin | Desktop-first; on phones edit one record at a time in a form | Cell editing on touch is error-prone |

The implementation must keep table semantics. If CSS changes `display` on table elements, re-add ARIA roles or test with VoiceOver and TalkBack [K Roselli].

### 5.4 Dashboards on mobile (triage order)

1. What decision does someone make on a phone? Show that first (alerts, today's numbers, approvals).
2. KPI tiles as a Switcher (2-up, then stacked). Each tile shows value, delta, and a sparkline without tooltips.
3. One primary chart, full width, with direct labels and fewer ticks; tap for detail rather than hover.
4. The actionable list as cards (§5.3).
5. Everything else behind "View full report" (desktop-grade).
6. Filters in a bottom sheet. Date range stays visible.
7. Performance: lazy-mount charts; tree-shake the chart library (echarts core + line = 172 KB gz versus 375 KB full [E]); content-visibility on off-screen widgets.

### 5.5 Density

| Signal | Default | User control |
|---|---|---|
| `pointer: coarse` | Comfortable (44 px controls, 12–16 px row padding) | Toggle persisted per user |
| `pointer: fine`, data-heavy app | Comfortable or compact (36 px; 28 px only in dense grids with 24 px targets kept) | Toggle; remember it |
| Marketing / ecommerce | Comfortable only | — |

Implement density as tokens (`[data-density=compact] { --control-h: 36px; --row-pad: 6px }`). Keep the toggle cheap on big views (§3.7).

---

## 6. Performance budgets and the UI decision → metric map

### 6.1 Proposed budgets for the skill

All at p75, phone, measured *and* lab-checked.

| | Marketing / content | Ecommerce (PLP/PDP) | SaaS / dashboard (per route) |
|---|---|---|---|
| LCP (field p75) | ≤ 2.5 s (aim ≤ 2.0) | ≤ 2.5 s | ≤ 2.5 s for the first route; soft navs ≤ 1.0 s |
| INP (field p75) | ≤ 200 ms | ≤ 200 ms | ≤ 200 ms (aim ≤ 100 for core actions) |
| CLS | ≤ 0.1 (aim ≤ 0.05) | ≤ 0.1 | ≤ 0.1 |
| Lab (Lighthouse mobile, median of 3–5) | LCP ≤ 2.5 s, TBT ≤ 200 ms, CLS ≤ 0.1 | same | same + user-flow INP ≤ 200 ms on the 3 core interactions |
| HTML (compressed) | ≤ 50 KB | ≤ 100 KB | ≤ 50 KB shell |
| CSS (compressed) | ≤ 50 KB total; critical ≤ ~14 KB inline | ≤ 75 KB | ≤ 100 KB |
| JS (compressed, initial) | **≤ 100 KB** (islands only); zero for static pages | ≤ 200 KB | **≤ 300 KB** per route (Russell 2026 JS-heavy ceiling ≈ 470–640 KiB at 3 s; leave room for third parties) |
| Fonts | ≤ 2 files preloaded, ≤ 100 KB WOFF2 total | same | same (system UI font is a valid choice for apps) |
| LCP image | ≤ 150–250 KB at rendered width, AVIF | ≤ 200 KB | n/a (usually text) |
| Images in first viewport | ≤ 300 KB | ≤ 400 KB | — |
| Third parties on critical path | ≤ 1–2 (consent manager) | ≤ 3 | ≤ 2 |
| DOM per view | — | ≤ ~1,500 elements on PLP before virtualization | Virtualize or content-visibility beyond ~2–3k rows or elements in an interactive view |

LHCI assertion equivalents are in `lighthouserc.json` (§8.3).

### 6.2 UI decision → metric map

| UI decision | LCP | INP | CLS | Mitigation |
|---|---|---|---|---|
| Full-bleed photo hero | ●●● | | ● (if unsized) | `<picture>` AVIF, srcset/sizes, `fetchpriority=high`, width/height, no lazy, ≤ 200 KB |
| Hero carousel / slider | ●●● (JS-rendered first slide) | ●● | ●● | Static first slide in HTML; no autoplay; or no carousel |
| Hero video | ●● (poster) | ● | ● | Poster image is the LCP candidate; `preload="none"`; facade |
| Text-only hero with web display font | ● | | ●● (swap) | Preload one WOFF2; computed fallback overrides or `optional` |
| Entrance animation on the hero (fade from 0) | ●● | | | Animate transform only, or start visible |
| Client-rendered page (SPA shell) | ●●● | ●● | ● | SSR/SSG + islands; soft-nav RUM |
| Full-page hydration for one widget | ● | ●●● | | Islands / partial hydration |
| Big design-system kit (MUI + Emotion) | ● | ●● | | Headless primitives; per-component imports |
| Icon library via `import *` or string lookup | ● | ● | | Named imports; icon sprite |
| Chart library on the dashboard landing | ●● | ●● | ● (no reserved height) | Tree-shake; lazy-mount; reserve the aspect ratio |
| Data grid with thousands of rows | ● | ●●● | | Pagination, virtualization, content-visibility |
| Density or theme toggle re-styling everything | | ●●● on big DOMs | | content-visibility; scope changes to containers |
| Filters that re-render a large list on each keystroke | | ●●● | | Debounce; yield; `startTransition`; Worker |
| Cookie / promo banner at the top | | ● | ●●● | Overlay at the bottom (fixed), transform animation; reserve space if in-flow |
| Ads / embeds / reviews widget | ● | ●● | ●●● | Reserve min-height; facades; load on idle |
| Sticky header that changes height on scroll | | | ●● | Animate transform/opacity; fixed height |
| Accordion or skeleton that differs from the content height | | | ●● | Skeleton = final dimensions |
| Unsized images / iframes | | | ●●● | width/height or aspect-ratio |
| `backdrop-filter` blur on a big sticky/scrolling panel | | ●● (presentation) | | Small areas only; solid fallback |
| Many large box-shadows / `will-change` everywhere | | ●● | | Pseudo-element shadows; will-change only while animating |
| Scroll-linked JS effects (parallax) | | ●● | ● | CSS scroll-driven animation (enhancement) or none |
| Third-party chat / tag manager | ● | ●●● | ● | Load after interaction; facade |
| Web font: many weights / TTF / no subset | ●● | | ●● | 1–2 WOFF2 files, variable if ≥ 2 weights, unicode-range |
| Long page, many sections | ● | ● | | content-visibility:auto + contain-intrinsic-size |

---

## 7. Mistakes the lab exposed (for the skill's lessons file)

1. **Grow-viewport captures break viewport-unit layouts [E].** The skill's `visual-qa.md` says to set the viewport to the document height before a full-page shot. With a `min-block-size: 60svh` cover, the section went from **480 → 2167 px**. With a `100svh` hero it went **844 → 5034 px**, and the capture was cut off. Playwright `fullPage: true` at the real viewport kept the hero at 844 px and **rasterised all 12 lazy AVIF images** (pixel stdev 90, not flat) in Chromium 141. The skill's grey-box problem did not reproduce with this stack.
   - Recommendation: scroll through the page in viewport steps, `await img.decode()` for every image, then `fullPage:true` at the real viewport. Verify image boxes by pixel variance (`capture-test.mjs`). Grow the viewport only as a fallback, and only when no element's height depends on viewport units: measure `scrollHeight` before and after growing, and if it changed, don't.
   - A remaining `fullPage` artefact: **fixed elements (a bottom nav) paint at their first-viewport position**, mid-page. Capture them separately, or hide them for the full-page shot and screenshot the viewport for the sticky states.
2. **`devtools` throttling can make a terrible page look fine [E].** With request-level throttling, Lighthouse's run ended before the 8.5 MB lazy hero painted. It reported **LCP 1.7 s with `<nav>` as the LCP element and a score of 74**, against simulate's 44.9 s and a score of 54. The run also took 60 s instead of 13. Check the reported LCP *element*, not only the number.
3. **Run-to-run variance is large on broken pages [E].** LHCI's 3 runs of the same bad page gave LCP 2.4 s (score 86) once and 44.9 s (65) twice. Use the median of ≥ 3 (5 is better), and the same Lighthouse version for before and after.
4. **Render-blocking head JS doesn't show up in TBT [E].** A 250 ms-busy, 500 KB synchronous head script gave TBT 100 ms but FCP 2.1 s. TBT only counts after FCP.
5. **A wrong font-metric override is worse than none** (CLS 0.0029 → 0.0753) [E]. See §4.6.
6. **Input-mode media queries lose to later base rules** (§3.5) [E].
7. **`body { overflow-x: hidden }` / `100vw` + padding.** A `width:100vw` block with padding overflowed by 48 px at *every* width from 1024 to 1920, not just on phones [E]. Block elements are already full width, so delete `100vw`.

---

## 8. Tool experiment log

Host: Linux container, Node 22.22.2, Chromium 141.0.7390.37 (`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`), Lighthouse benchmarkIndex 1769.5. Lab directory: `…/scratchpad/perf-lab/`, copied to `research/experiments/E-responsive-performance/`.

### 8.1 Setup (works; ~11 s)
```bash
cd perf-lab && npm init -y && npm i lighthouse@latest playwright@1.56.1 web-vitals sharp svgo \
  @capsizecss/unpack @capsizecss/core @capsizecss/metrics @lhci/cli utopia-core web-features @mdn/browser-compat-data
PUPPETEER_SKIP_DOWNLOAD=1 npm i -D unlighthouse @unlighthouse/cli      # 47 s; don't let it download Chrome
export CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
npx serve site -l 5055 --no-clipboard            # run in background
```
Gotchas:
- `serve` 301-redirects `/bad.html` → `/bad`; use the clean URLs.
- Pin `playwright@1.56.1` to match the bundled Chromium, and pass `executablePath`.
- Chromium's background services try google.com and get denied by the proxy. They're harmless; add `--disable-background-networking`.

### 8.2 Lighthouse CLI (works; 11–13 s/run simulated, 60 s devtools)
```bash
npx lighthouse http://localhost:5055/bad --only-categories=performance \
  --output=json --output=html --output-path=reports/bad-mobile \
  --chrome-flags="--headless=new --no-sandbox --disable-gpu" --quiet
npx lighthouse <url> --preset=desktop ...                      # desktop
npx lighthouse <url> --throttling-method=devtools ...          # request-level; see §7.2
npx lighthouse <url> --throttling.cpuSlowdownMultiplier=10 ... # low-end Android from a fast host
node lh-summary.mjs reports/*.json                             # score, metrics, LCP element, failing insights
```
Results:

| Page | Score | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|
| bad mobile | 54 | 2.1 s | **44.9 s** | 100 ms | 0.365 |
| good mobile | **99** | 0.6 s | 2.0 s | 0 | 0 |
| bad desktop | 55 | — | 7.3 s | — | 0.469 |
| good desktop | 100 | — | 0.5 s | — | — |
| bad devtools-throttled | 74 | — | 1.7 s (`<nav>`) | — | — |

Insight audits that fired on the bad page: `lcp-discovery-insight` (checklist), `render-blocking-insight` 420 ms, `image-delivery-insight` 8,481 KiB, `cls-culprits-insight` ("Unsized image element"), `font-display-insight`, `unsized-images`, `total-byte-weight` 8,727 KiB.

### 8.3 Lighthouse CI budgets (works; 75 s for 2 URLs × 3 runs)
`lighthouserc.json`: `collect.url[]`, `numberOfRuns: 3`, `chromePath`, `settings.chromeFlags`. Assertions:
- `categories:performance ≥ 0.9`
- `largest-contentful-paint ≤ 2500 (median-run)`
- `cumulative-layout-shift ≤ 0.1`
- `total-blocking-time ≤ 200`
- `resource-summary:script:size ≤ 150000`
- `resource-summary:font:size ≤ 100000`
- `resource-summary:image:size ≤ 500000`
- `resource-summary:third-party:count ≤ 5`
- `unsized-images`
- `lcp-discovery-insight`

Upload target: `filesystem`.

```bash
npx lhci autorun         # exit 1 when an "error" assertion fails
```
The bad page failed perf, LCP, CLS, lcp-discovery and unsized-images; the good page failed only the font budget (its TTF) [E]. **LHCI 0.15.1 bundles Lighthouse 12.6.1**, not 13.

### 8.4 unlighthouse (works; 4 routes in 26 s)
```bash
npx unlighthouse-ci --config-file unlighthouse.config.mjs
# config: site, urls[], scanner {device:'mobile', throttle:true, crawler:false},
#         puppeteerOptions.executablePath, ci.budget {performance:90, accessibility:90}, ci.reporter:'jsonExpanded'
```
Result: "/bad has invalid score 0.58 for category performance" → exit ≠ 0.

### 8.5 Lab INP with a Lighthouse user flow (works; ~15 s)
```bash
node lh-flow.mjs http://localhost:5055/bad "#buy"     # navigation + timespan(3 clicks)
```
Results: bad timespan INP 390 ms (TBT 920). Good timespan INP 20 ms (TBT 910; see §4.3). The flow report is at `reports/flow.html`.

### 8.6 Playwright + CDP vitals with attribution (works; ~10 s good, ~67 s bad)
```bash
node measure-vitals.mjs http://localhost:5055/good --device "Moto G4" --cpu 4 --net slow4g --click "#buy" --trace reports/good-trace.json
```
Mechanics:
- web-vitals **attribution IIFE** injected with `page.addInitScript`. The file isn't in the package `exports` map: resolve `web-vitals/attribution` and read `../dist/web-vitals.attribution.iife.js` beside it.
- `reportAllChanges:true`, plus a raw PerformanceObserver cross-check. Raw LCP, CLS and max event duration matched the library exactly.
- `page.click()` produces trusted input, so Event Timing fires.
- Finalise CLS and INP by dispatching `visibilitychange` with `visibilityState='hidden'`.

Results:

| Page | FCP | LCP | CLS | INP |
|---|---|---|---|---|
| good | 820 | 1380 (hero-1200.avif; TTFB 8, load delay 653, load duration 691, render delay 28) | 0.027 (font swap) | 24 (7 / 2 / 14) |
| bad | 1728 | 49,584 (load duration 47,821) | 0.353 (target `section.card`) | 376 (processing 353) |

`browser.startTracing(page,{screenshots:true})` writes a DevTools-loadable trace: 6.7 MB for the good page, **102 MB** for the bad one, so don't trace long loads with screenshots.

### 8.7 Responsive sweep with an overflow root-cause detector (works; ~30 s for 16 widths + 3 zoom levels)
```bash
node responsive-sweep.mjs http://localhost:5055/bad --shots reports/shots-bad
```
Per width it reports:
- **Root-cause overflow elements**: elements past the viewport edge whose parent is not, ignoring those inside a clipping or scrolling ancestor below `body`. Each comes with a likely reason: `min-width`, full width + padding in content-box, child of a non-wrapping flex row, grid track, nowrap, media without `max-width`, a table or pre that needs its own scroller.
- Targets under 24 px and 24–44 px (inline links exempt, as in 2.5.8).
- Text under 12 px.
- Scroll regions that aren't focusable or labelled.

Then a zoom check at 1280 → 640@2 → 320@4 that reports the physical growth of h1/h2.

Bad page at 360: **+540 px**, from three causes:
- `header > nav` (482 px, a non-wrapping flex row)
- `div.promo` (100vw + padding)
- `table` (min-width 900 px)

It also found 6 targets under 24 px, and the `promo` overflow of +48 px persisted up to 1920. The vw h1 grew 1.00× at 400%.

Good page and primitives page: **0 overflow at all 16 widths**. Zoom growth 2.13× and 2.61× at 400%.

### 8.8 Fonts (works)
```bash
node font-fallback.mjs site/fonts/playfair-700-latin.woff2 "Playfair Display" /usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf
# → size-adjust:107.023%; ascent-override:101.0997%; descent-override:23.4529%; line-gap-override:0%
node gen-font-pages.mjs && node font-cls.mjs      # 5 variants × 3 runs, ~75 s
```
`@capsizecss/unpack` v4 moved `fromFile` to `@capsizecss/unpack/fs`. The Google Fonts CSS API (`fonts.googleapis.com`) and `fonts.gstatic.com` are reachable from this container.

### 8.9 Other experiments (all work)
- `fluid-scale.mjs` — Utopia tokens + WCAG 1.4.4 per step (utopia-core returns `[]` for "passes"; check `.length`).
- `dom-cost.mjs` — content-visibility and DOM-size numbers (§4.8). `page.setContent()` wipes `addInitScript` globals, so put observers in the page itself. A fixed button that comes before later-painted sections in the DOM is click-intercepted: give it a `z-index`.
- `bundles/measure-bundles.mjs` — the library table (§4.7), 17 s. Traps: `@base-ui-components/react` → `@base-ui/react`; TanStack Table v9 renamed `useReactTable` → `useTable`.
- `make-assets.mjs` — the format table (§4.5), 25 s.
- `npx svgo --config svgo.config.mjs in.svg -o out.svg` — −37.5%.
- `mq-check.mjs` — interaction media queries under emulation.
- `capture-test.mjs`, `shot-vh-trap.mjs` — the capture findings (§7.1).
- Baseline queries: `node -e "const F=require('web-features/data.json').features; console.log(F['container-style-queries'].status)"`, plus BCD path lookups (§3.2).

### 8.10 Not possible here
- WebPageTest and real-device runs.
- GPU compositing costs: headless has no GPU, so backdrop-filter, shadow and layer costs can't be measured.
- Virtual-keyboard behaviour: `interactive-widget` and iOS can't be emulated.
- The PSI and CrUX APIs without a key (429 and 403).
- StatCounter data (blocked).

---

## 9. Proposed skill modules

The skill should gain two reference files. They would be read in Phase 3 (the decisions) and Phase 5 (implementation), with their checklists run in Phases 6 and 8. It should also gain two scripts. The recommended script additions are `scripts/responsive-sweep.mjs` and `scripts/measure-vitals.mjs`, adapted from the lab. A fix to `visual-qa.md`'s capture method (§7.1) and to `scripts/capture.mjs` should be made by whoever owns `skills/`. No edits were made there.

### 9.1 `references/responsive.md`: outline
1. **Principle:** intrinsic first, container queries for components, media queries for the shell. Breakpoints come from content. Nothing is hidden by device; it is reordered, collapsed or deferred.
2. **Primitives:** the §3.1 table with copy-paste CSS (Stack, Center, Cluster, Sidebar, Switcher, Grid + subgrid, Cover with svh, Reel, Frame), taken from the tested `primitives.html`.
3. **Modern CSS with Baseline status** (§3.2, re-checked with `web-features` at use time): container size and style queries and cq units; `:has()`; subgrid; logical properties; `text-wrap`; `field-sizing`. Name the enhancement-only features: scroll-driven animations, anchor positioning, `text-wrap: pretty`, `interactive-widget`.
4. **Fluid type and space:** Utopia recipe; rem-anchored clamps; the max ≤ 2.5× min rule; checking it with `fluid-scale.mjs`; container-relative type for components.
5. **Viewport units, safe areas, keyboard:** svh/lvh/dvh rules; `viewport-fit=cover` + `env()`; `interactive-widget=resizes-content` + the VisualViewport fallback; never disable zoom.
6. **Input modes:** hover/pointer queries (default: no hover); 44 px touch / 24 px minimum; the cascade-order trap; gesture alternatives; input types, inputmode, autocomplete, enterkeyhint; 16 px inputs.
7. **Navigation transformation:** the §5.2 table plus the hard rules. Tab bar vs rail vs sidebar vs drawer vs priority+; bottom sheets; sticky CTAs; the evidence on one-handed use (with the folklore labelled).
8. **Responsive data:** the §5.3 table decision guide + the region-scroll and stacking patterns; dashboards (§5.4); forms; long content; density (§5.5).
9. **Test matrix:** the §3.8 viewport classes; 1280 at 200/400%; landscape phones; foldables; Playwright descriptor traps; how to run `responsive-sweep.mjs`.
10. **Checklist:**
    - 0 overflow at 320–1920.
    - No targets under 24 px, and touch targets at 44.
    - Text reaches 2× under zoom.
    - svh heroes.
    - Safe areas padded.
    - Sticky bars clear of focus and the keyboard.
    - Tables are focusable, labelled regions or transformed lists.
    - Hover-only UI has a focus/tap equivalent.
    - Nav follows §5.2.
    - Density is tokenised.

### 9.2 `references/performance.md`: outline
1. **Performance is a design input:** decide the hero, fonts, component kit, charts and third parties with their metric cost in view (§6.2 map). Record the budgets in `DESIGN.md`.
2. **Metrics:** CWV thresholds (web-vitals constants), p75 by device, field vs lab, what Lighthouse can't see (INP, iframes, real devices), soft navigations for SPAs (Chrome 151, web-vitals 6), Safari RUM for LCP and INP (26.2).
3. **Budgets:** the §6.1 table per product type; Russell 2026 test device and network; LHCI assertions snippet.
4. **LCP playbook:** the four subparts; hero rules (in HTML, eager, `fetchpriority`, sized, AVIF, srcset/sizes, ≤ 200 KB); render-blocking; text LCP and fonts; no entrance fade on the LCP element.
5. **INP playbook:** input, processing and presentation; yield (`scheduler.yield` + fallback), chunking, Workers; hydration/islands/RSC; DOM size and content-visibility; third parties; measuring with a user flow and Playwright.
6. **CLS playbook:** dimensions and aspect-ratio; banners as overlays; reserved embed slots; skeleton = final size; transform-only animation; bfcache.
7. **Images:** formats (AVIF widely), width ladders, `sizes` discipline, DPR cap, art direction, lazy rules, pipelines, SVGO config (keep the viewBox, strip exported titles).
8. **Fonts:** self-host; WOFF2 + unicode-range subsets; variable vs static (the 23 KB / 38 KB example); preload 1–2; swap vs optional; **computed** metric fallbacks (`font-fallback.mjs`), then measure; Safari's override gap.
9. **JavaScript:** the measured library table and traps (icons `import *`, echarts full, AG Grid all-modules, zod classic, moment, MUI for one button); architecture by product type; third-party policy.
10. **Rendering:** compositor-only animation; will-change hygiene; blur and shadow costs; content-visibility; scroll-driven animations as enhancement; test on a real mid-tier Android because headless has no GPU.
11. **Measurement workflow:** exact commands (Lighthouse mobile + desktop, median of 3–5, pinned version; `lh-summary.mjs`; `lh-flow.mjs` for INP; `measure-vitals.mjs` for attribution; LHCI; unlighthouse; PSI/CrUX with an API key). Read the LCP *element*, not only the number. Traps: devtools throttling, TBT blind to head scripts, version drift.
12. **Checklist:** replaces technical-qa's Performance section, pointing here.

### 9.3 Edits suggested to existing files (for the skill owner)
- `web-design.md` §4–5: shrink them to a summary that links to the two new modules.
- `visual-qa.md`:
  - Replace "grow the viewport to the whole document" with: scroll through in steps, decode images, `fullPage:true` at the real viewport, verify with pixel variance; grow only if `scrollHeight` is unchanged after growing (§7.1). Note that fixed elements paint at their first-viewport position.
  - Extend the widths to include 320, 360 and 1536, and add the zoom checks.
- `technical-qa.md` "Performance": add the commands in §8, the LHCI assertions, and user-flow INP.
- `lessons.md`: add §7.
- `SKILL.md` description: drop "Not for … application UI inside a product" once the app modules land.

---

## 10. Open items to verify before hard-coding

- NN/g hidden-navigation percentages; Hoober's grip and accuracy numbers; Material's 48 dp and the window size classes above 600 dp; StatCounter's current top resolutions and the mobile share. All [K].
- Whether CrUX includes soft-navigation metrics. Whether iPadOS with a trackpad reports `hover:hover`.
- Russell 2026 budget table values. The text gives 3 s = 1.5 MiB / 935 KiB and 5 s = 3.2 / 1.9 MiB with four connections; confirm the two-connection figures against the published table image.
- Real-device check of backdrop-filter and shadow costs on a Helio G99-class phone.
