# Stream F: motion and interaction, 3D, data visualisation

*Research stream for broadening `website-redesign` from marketing sites to web apps, dashboards, SaaS and ecommerce. Written 2026-09-28. Nothing in `skills/` was edited.*

The question this stream answers is **when motion, 3D or a chart improves the experience, and when it is decoration that costs performance or accessibility.** Every version, licence and browser-support claim below was checked against a primary source on this date, or is marked as not re-verified. Sizes and timings come from experiments run here. The harness is in `research/experiments/F-motion-lab/` (§8).

---

## 0. The short version (what the skill should adopt)

1. **Motion has two registers, and the site type picks the default.** In IBM Carbon's terms, **productive** motion (efficient, subtle, out of the way) is the default for apps, dashboards, SaaS, checkout, settings and every control on a marketing site. **Expressive** motion (visible, fluid, sometimes springy) is for rare moments: a marketing hero, onboarding, a success state, a page-level transition. A dashboard that uses expressive motion is broken. A marketing page that uses only productive motion is fine.
2. **Frequency decides whether something moves at all.** If it is keyboard-initiated or happens 100+ times a day (a command palette, shortcuts, tab switching, row selection), it does not animate. If it happens tens of times a day, it gets ≤150 ms, or colour and opacity only. Occasional events get standard motion. Rare events may delight. This rule comes from Emil Kowalski and Apple's HIG: "generally avoid adding motion to UI interactions that occur frequently."
3. **Tokens, not magic numbers.** §2.4 proposes one duration and easing scale, reconciled across Material 3, Carbon, Fluent 2, NN/g and Kowalski. It replaces the current `ui-ux.md` §7 rule "ease-in for leaving". That rule conflicts with how practitioners work: exits may accelerate, but only when short, and nothing the user is waiting for eases in.
4. **Reduced motion means substitute, not delete.** Movement becomes a crossfade or an instant change. Essential feedback stays. Verified pitfalls:
   - **View Transitions are not skipped under `prefers-reduced-motion`** (tested in Chromium 141). Guard with `::view-transition-group(*) { animation-name: none }`, which keeps the crossfade and drops the movement (verified).
   - **Motion's `MotionConfig` defaults to `reducedMotion: "never"`** (read in source).
   - Chart.js 4.5 and ECharts 6 animate for 1000 ms by default and ignore the preference.
5. **CSS-first for web apps.** `@starting-style` and `transition-behavior: allow-discrete` (Baseline 2024) animate dialogs and popovers in and out. Same-document View Transitions are Baseline since Firefox 144 (2025-10-14). `linear()` springs are Baseline "widely available" (2026-06-11). Scroll-driven animations are still **not Baseline**: Chrome 115 and Safari 26 have them, Firefox only in preview. A JS library is justified for gesture-driven, interruptible, layout (FLIP) or orchestrated motion, not for fades.
6. **Measured weights (min+gzip).** A library must earn its place:

   | Library | min+gzip |
   | --- | --- |
   | Motion `motion/mini` | 3.8 KB |
   | Motion `animate` | 19.9 KB |
   | Motion `motion/react` | 42.7 KB (27.5 KB with `LazyMotion` + `domAnimation`) |
   | GSAP core | 27.0 KB |
   | GSAP core + ScrollTrigger | 44.2 KB |
   | anime.js `waapi` | 4.7 KB |
   | three.js, everything | 186 KB |
   | `<model-viewer>` | 297 KB |
   | Spline runtime | **1,062 KB** |
   | Recharts | 108 KB (+67 KB React) |
   | uPlot | 22.7 KB |
   | ECharts, full | 372 KB (167 KB tree-shaken to one line chart) |
   | AG Charts Community | 397 KB (registering modules did not tree-shake) |

7. **3D earns its place only when the object is the product or the data is spatial.** Examples: an ecommerce product viewer or AR, a configurator, a spatial or scientific dataset. For a product page, use `<model-viewer>` with a real poster image, `loading="lazy"` or `reveal="manual"`, no auto-rotate under reduced motion, and self-hosted decoders.
   - **A WebGL canvas can never be the LCP element** (verified). The poster becomes the LCP, so optimise the poster.
   - Decorative blobs, particles and spinning logos are anti-patterns.
8. **Charts are for reading, not decorating.** Classify every chart before designing it: **monitoring** (dashboard, at a glance), **analytical** (exploration), or **explanatory** (marketing or editorial: the title states the finding).
   - Use position on a common scale first (Cleveland & McGill).
   - Grey plus one highlight colour. Categorical palettes ≤ 7 hues.
   - Direct labels over legends. Tabular numerals.
   - A data table or summary for every chart (Chartability's critical "No table" test).
   - Never a fabricated chart on a marketing page.
9. **Licences changed. The skill must check them before recommending:**

   | Library | Current terms |
   | --- | --- |
   | **ApexCharts** | Proprietary since **5.3.0 (2025-07-21)**. Free only under $2M annual revenue; OEM licence for platforms. |
   | **Highcharts** | Commercial licence for any commercial or internal business use. |
   | **GSAP** | Free, including commercial use and all plugins, since 3.13.0 (2025-04-30). Its "Standard No Charge" licence is **not OSI open source** and bans use in no-code animation builders that compete with Webflow. |
   | **Spline runtime** | No licence field; © Spline, Inc. Code or self-hosted export needs a paid plan. |
   | **Rive** | Runtimes are MIT; exporting needs a paid plan. |
   | **Theatre.js** | Studio is **AGPL-3.0**. No release since 2024-05. |
   | **Shadertoy code** | **CC BY-NC-SA 3.0 by default.** |
   | **Tremor** | `@tremor/react` has not been published since 2025-01 and pins deprecated Recharts 2. Tremor now lives as copy-paste components (Vercel acquisition, MIT). |

---

## 1. Method and verification notes

**Egress was restricted in this session.** Direct fetches to most documentation hosts (motion.dev, gsap.com, MDN, web.dev, caniuse, m3.material.io, carbondesignsystem.com, datawrapper.de and others) were blocked by policy, and I did not route around the block. I used these instead:

- **npm packages, as the primary source for code facts.** I installed the current versions of every library and read the shipped `LICENSE`, `package.json` and source. This is how I verified reduced-motion behaviour, animation defaults, hardware-acceleration sets and default CDN URLs.
- **`web-features` 3.40.0** (the Baseline source of truth, published 2026-09-25) and **`@mdn/browser-compat-data` 8.1.3** (2026-09-24) for browser support. MDN and caniuse are generated from these.
- **GitHub raw files** (reachable) for:
  - Carbon's DTCG motion tokens
  - Fluent 2 tokens
  - Material's Android motion docs
  - Chartability's workbook
  - the FT Visual Vocabulary
  - Emil Kowalski's published animation standards
  - the WCAG Understanding documents
  - READMEs for uPlot, Lenis, model-viewer and R3F
- **developer.apple.com**, which is reachable, for the HIG Motion page's JSON.
- **Web search** for claims only available on blocked sites: Rive and Spline pricing, the Highcharts EULA, Shadertoy's terms, Poly Haven, Kenney and Sketchfab licences, the NN/g scrolljacking study, the Tremor acquisition and Motion's independence. These are marked *(via search)*.
- **Experiments** in headless Chromium 141.0.7390.37 (Playwright 1.56.1) and esbuild 0.28.2 on Node 22.22.2.

Where a claim could not be verified, it says so.

---

## 2. Motion

### 2.1 What motion is for

The practitioner literature agrees on a short list. Val Head (*Designing Interface Animation*, 2016): motion should "improve feedback, aid in orientation, direct attention, show causality, and express your brand's personality." She also says "have a known purpose for every animation." Rachel Nabors (*Animation at Work*, 2017) separates **feedback** (the user caused it) from **causality** (the system caused it) and names these patterns:

- transitions
- supplements (content entering or leaving without a change of task)
- feedback
- demonstrations

Apple's HIG (Motion page, read from developer.apple.com):

- "Add motion purposefully … Don't add motion for the sake of adding motion."
- "Make motion optional … avoid using it as the only way to communicate important information."
- "Aim for brevity and precision in feedback animations."
- "In apps, generally avoid adding motion to UI interactions that occur frequently."
- "Let people cancel motion … don't make people wait for an animation to complete."

The skill should use this taxonomy. Each animation must name exactly one job:

| Job | What it does | App example | Marketing example |
| --- | --- | --- | --- |
| **Orientation / spatial continuity** | Shows where something came from or went; keeps the mental map | Row expands into a detail panel (container transform); drawer slides from its edge | Page-to-page View Transition that keeps the nav still |
| **Feedback** | Confirms the input was received | Button press `scale(.97)`, toggle knob, drag lift | Form submit state |
| **State change** | Makes a change noticeable | Item added to cart (count ticks); toast | Pricing toggle monthly/annual |
| **Causality / relationship** | Shows that A caused B | Filter chip narrows the list (items leave, remaining ones FLIP into place) | Before/after slider |
| **Attention** | Draws the eye to something that needs action | Validation error nudge; new notification dot | (rarely justified; see banner blindness in `ui-ux.md` §3) |
| **Explanation / demonstration** | Shows how something works | Onboarding coach-mark; empty-state loop | Product demo sequence |
| **Brand expression** | Personality | Almost never in productive UI | Hero entrance, one signature transition |

### 2.2 "Should this move?" decision framework

Run each candidate animation through these gates in order. The first "no" ends it.

1. **Purpose.** Name its job from §2.1. "It looks nice" is not a job on anything seen more than once.
2. **Frequency** (Kowalski's table, from his published `review-animations/STANDARDS.md`):

   | How often a person sees it | Decision |
   | --- | --- |
   | 100+ times a day, or **keyboard-initiated** (shortcuts, command palette, tab switching, list navigation) | **No animation. Instant.** Raycast has no open/close animation. |
   | Tens of times a day (hover, list selection, sort, row expand in a table you live in) | Remove, or ≤ 150 ms with opacity or colour only |
   | Occasional (modal, drawer, toast, popover, page change) | Standard productive motion (§2.4) |
   | Rare or first-time (onboarding, success, empty state, marketing hero) | Expressive allowed |

3. **Register.** Is this surface productive (app, dashboard, table, form, checkout, settings, nav and controls anywhere) or expressive (marketing section, onboarding, celebration)? Pick tokens from that column.
4. **Never block.** Input is accepted while the animation runs. Animations are interruptible: use CSS transitions or springs, not keyframes that restart from zero. Nothing the user needs waits for an animation. Content is visible by default; the existing "reveal written safely" rule stands.
5. **Cost.** Animate `transform` and `opacity` (plus `filter` and `clip-path` sparingly). Nothing that triggers layout on many elements. No scroll handlers on the main thread. Add a library only if CSS or WAAPI cannot do it (§2.8).
6. **Reduced motion.** Define the substitute before shipping (§2.7).
7. **Vestibular and attention check.** Large-area movement, zoom, spin, parallax, scroll-linked movement at different speeds, or anything auto-playing for more than 5 s needs a pause control (WCAG 2.2.2, Level A) or must go under reduced motion (WCAG 2.3.3, AAA). Never three flashes a second (2.3.1).

**Output: a one-line motion spec per animation**, written into `DESIGN.md`:

`trigger · job · properties · duration token · easing token · reduced-motion substitute`

Example: `row click · orientation · transform, opacity · --dur-medium · --ease-enter · crossfade 150 ms`.

### 2.3 Productive and expressive motion

This split is the most useful single idea for broadening the skill.

**IBM Carbon** (motion overview, via search; token values read from Carbon's DTCG source):

- "**Productive motion** creates a sense of efficiency and responsiveness, while remaining subtle and out of the way … appropriate for moments when the user needs to focus on completing tasks." Carbon designed "button states, dropdowns, revealing additional information, or rendering data tables and visualizations" with productive motion.
- "**Expressive motion** delivers enthusiastic, vibrant, and highly visible movement. Use expressive motion for significant moments such as opening a new page, clicking the primary action button, or when the movement itself conveys a meaning." It should be reserved "for occasional, important moments … a rhythmic break to the productive experience."

**Material 3 Expressive** (2025) moved components to a **spring** system. It has **spatial** springs (position, size, shape; may overshoot) and **effects** springs (colour, opacity; critically damped, never overshoot), each at fast, default and slow speeds.

| Site type | Default register | Where expressive is allowed |
| --- | --- | --- |
| Web app / SaaS / admin | Productive everywhere | First-run onboarding; a success state after a long task; empty-state illustration |
| Dashboard / monitoring | Productive, minimal. Data updates do not animate beyond a ≤ 250 ms value transition | Nowhere |
| Ecommerce | Productive for browse, filter, cart and checkout | PDP gallery transitions; add-to-cart confirmation; campaign landing pages |
| Marketing / brand | Productive for controls (nav, forms, accordions, tabs) | Hero entrance, section-level reveals (safely, §2.6), one signature page transition |
| Docs / content | Productive; almost nothing | Nowhere |

### 2.4 Motion tokens proposal

**Verified token sources:**

| System | Durations | Easing | Source |
| --- | --- | --- | --- |
| **Material 3** (`@material/web` 2.5.0 CSS) | short1–4 = 50/100/150/200 ms; medium1–4 = 250/300/350/400; long1–4 = 450/500/550/600; extra-long1–4 = 700/800/900/1000 | standard `cubic-bezier(0.2,0,0,1)`; standard-decelerate `(0,0,0,1)`; standard-accelerate `(0.3,0,1,1)`; emphasized-decelerate `(0.05,0.7,0.1,1)`; emphasized-accelerate `(0.3,0,0.8,0.15)`. The web package approximates "emphasized" as `(0.2,0,0,1)`. | `labs/gb/styles/motion/md-motion-tokens-easing.css` |
| **M3 springs** (Android) | fast spatial ζ 0.9 / k 1400; default spatial 0.9 / 700; slow spatial 0.9 / 300; fast effects 1 / 3800; default effects 1 / 1600; slow effects 1 / 800 | n/a | `material-components-android/docs/theming/Motion.md` |
| **Carbon** | fast-01 70 ms (button, toggle); fast-02 110 (fade in); moderate-01 150 ("default transition speed"); moderate-02 240 (expansion, toast); slow-01 400 (large expansion); slow-02 700 (background dimming, hero) | standard productive `(0.2,0,0.38,0.9)` / expressive `(0.4,0.14,0.3,1)`; entrance productive `(0,0,0.38,0.9)` / expressive `(0,0,0.3,1)`; exit productive `(0.2,0,1,0.9)` / expressive `(0.4,0.14,1,1)`. Surfaces: disclosure = moderate-01 + entrance-productive; contextual = fast-02 + entrance-expressive; expand = moderate-02 + standard-productive; invoke = moderate-02 + standard-expressive | `carbon/packages/motion/src/dtcg/motion.json`, `surfaces.json` |
| **Fluent 2** | ultraFast 50, faster 100, fast 150, normal 200, gentle 250, slow 300, slower 400, ultraSlow 500 | decelerateMax `(0.1,0.9,0.2,1)`, decelerateMid `(0,0,0,1)`, accelerateMid `(1,0,1,1)`, easyEase `(0.33,0,0.67,1)` | `fluentui/packages/tokens/src/global/{durations,curves}.ts` |
| **Kowalski** | press 100–160; tooltip 125–200; dropdown 150–250; modal/drawer 200–500; "UI animations stay under 300 ms" | ease-out `(0.23,1,0.32,1)`; ease-in-out `(0.77,0,0.175,1)`; drawer `(0.32,0.72,0,1)`; **"Never `ease-in` on UI"** | `emilkowalski/skills/.../STANDARDS.md` |
| **NN/g** (current skill) | ~100 feedback; 200–300 moderate; ≤ 400 large; ≥ 500 feels slow | ease-out enter, ease-in exit | existing `ui-ux.md` §7 |

**Reconciling "ease-in on exit".** Material and Carbon both define accelerating exit curves, NN/g says ease-in for exits, and Kowalski says never ease-in. They agree once you add a condition: **an exit may accelerate only when nobody is waiting on it and it is short (≤ 200 ms). Anything that responds to input, or brings in what the user wants to see, decelerates.** When in doubt, exit with the same ease-out at about 70% of the enter duration.

**Proposed tokens** (for `templates/DESIGN.md` and a revised `ui-ux.md` §7):

```css
:root {
  /* Durations: the productive scale */
  --dur-0:       0ms;    /* keyboard-initiated or 100+/day: command palette, shortcuts, tab switch */
  --dur-micro:   100ms;  /* press, toggle, checkbox, colour hover    (M3 short2, Fluent faster, Carbon 70-110) */
  --dur-small:   150ms;  /* tooltip, dropdown, menu, small expand    (M3 short3, Fluent fast, Carbon moderate-01) */
  --dur-medium:  240ms;  /* popover, toast, panel, drawer, row expand (Carbon moderate-02, M3 medium1, Fluent gentle) */
  --dur-large:   300ms;  /* modal, sheet, full-width panel: productive ceiling (Kowalski, Fluent slow) */
  /* Durations: expressive, used on rare moments only */
  --dur-page:    400ms;  /* page or view transition, large container transform (M3 medium4, Carbon slow-01) */
  --dur-hero:    700ms;  /* one-off marketing entrance, background dim (Carbon slow-02, M3 extra-long1); never in apps */
  --stagger:     40ms;   /* between siblings; 30-80 ms, total stagger <= 300 ms, never blocks input */

  /* Easing */
  --ease-out:      cubic-bezier(0.2, 0, 0, 1);        /* default: enter and on-screen moves (M3 standard, close to Kowalski's strong ease-out) */
  --ease-in-out:   cubic-bezier(0.4, 0.14, 0.3, 1);   /* a thing moving from A to B while visible (Carbon standard-expressive) */
  --ease-exit:     cubic-bezier(0.3, 0, 1, 1);        /* exits only, <= 200 ms (M3 standard-accelerate) */
  --ease-emphasized: cubic-bezier(0.05, 0.7, 0.1, 1); /* expressive enter (M3 emphasized-decelerate) */
  --ease-linear:   linear;                            /* only for constant motion: progress, marquee, scrubbed timelines */

  /* Springs as CSS linear(), generated from the damped-oscillator equation (§8, springs.mjs) */
  /* M3 default spatial (k 700, zeta 0.9): settles in ~317 ms, 0.2% overshoot. Productive-safe. */
  --spring-productive: linear(0, 0.068, 0.214, 0.378, 0.531, 0.66, 0.762, 0.839, 0.894, 0.934, 0.96, 0.977, 0.988, 0.995, 0.998, 1, 1.001, 1.002, 1.001, 1.001, 1);
  --spring-productive-dur: 320ms;
  /* Expressive (k 340, zeta 0.7): settles in ~558 ms, 4.6% overshoot. Marketing and onboarding only; spatial properties only. */
  --spring-expressive: linear(0, 0.103, 0.319, 0.55, 0.745, 0.887, 0.977, 1.025, 1.044, 1.045, 1.037, 1.026, 1.016, 1.008, 1.003, 1, 0.998, 0.998, 0.998, 0.999, 1);
  --spring-expressive-dur: 560ms;
}
@media (prefers-reduced-motion: reduce) {
  :root { --dur-page: 150ms; --dur-hero: 0ms; --stagger: 0ms; --spring-expressive: var(--ease-out); }
}
```

The same springs for JS libraries: Motion `{type:"spring", stiffness:700, damping:47.6}` (productive) and `{stiffness:340, damping:25.8}` (expressive), with damping = 2ζ√k at mass 1. Or use Motion's `{type:"spring", duration, bounce}`, where Kowalski keeps bounce at 0.1–0.3 and only for gesture-driven or playful motion.

**Springs vs curves.** Springs keep velocity when interrupted and suit drag, flick-to-dismiss and anything reversible mid-flight. Josh Comeau notes that CSS transitions shorten interrupted animations (the "reversing shortening factor"), which is fine for Béziers but unphysical for springs. `linear()` gives CSS a spring's shape but not its interruption physics. Use a JS spring for gestures and `linear()` for fire-and-forget. **Effects (opacity, colour) never bounce** (M3). The M3 springs settle in 224/317/484 ms (fast/default/slow spatial), which is why M3's time-based tokens sit in the same range.

### 2.5 Techniques and their current browser support

Source: `web-features` 3.40.0 / BCD 8.1.3. "Baseline low" means newly available in all core browsers on that date. "Widely" means 30 months later.

| Technique | Status (2026-09-28) | Chrome / Firefox / Safari | Use it for | Notes |
| --- | --- | --- | --- | --- |
| CSS transitions | Baseline | all | Most UI state changes | Interruptible and retargetable, so they are the right default for dynamic UI (Sonner's rationale) |
| CSS `@keyframes` | Baseline | all | Loops, one-shot entrances | Restart from zero when interrupted, so avoid them for rapidly re-triggered UI |
| Web Animations API | Baseline widely | 84 / 75 / 14 | JS-controlled, compositor-run animation without a library | anime.js `waapi` is 4.7 KB gz on top of it |
| `@starting-style` | **Baseline 2024-08-06** | 117 / 129 / 17.5 | Entry animation from `display:none` without JS: dialogs, popovers, toasts, list items | |
| `transition-behavior: allow-discrete` | **Baseline 2024-08-06** | 117 / 129 / 17.4 | Animating out to `display:none`; `overlay` for top-layer exit | `overlay` is **Chromium-only** (117), so elsewhere the exit is not kept in the top layer. Progressive enhancement. |
| `popover` | Baseline 2025-01-27 | 114 / 125 / 17 | Menus, tooltips, pickers with light-dismiss | Pair with `@starting-style` |
| `<dialog>` | Baseline widely | 37 / 98 / 15.4 | Modals | `closedby` is not Baseline (no Safari) |
| `linear()` easing | **Baseline widely 2026-06-11** | 113 / 112 / 17.2 | Springs and bounces in CSS | |
| Same-document View Transitions (`startViewTransition`) | **Baseline 2025-10-14** | 111 / 144 / 18 | SPA route changes, list reorder, shared element, tab content swap | `view-transition-class` Baseline 2025-10-14; VT types Baseline 2026-01-13 (Firefox 147) |
| Cross-document View Transitions (`@view-transition { navigation: auto }`) | **Not Baseline** | 126 / **no** / 18.2 | MPA page transitions as progressive enhancement | Firefox falls back to a normal navigation. Harmless. |
| Element-scoped View Transitions | Not Baseline | 147 / no / no | (future) concurrent component transitions | Chromium-only |
| Scroll-driven animations (`animation-timeline: scroll()/view()`) | **Not Baseline** | 115 / *preview only* / **26** | Reading progress, scrubbed sequences, reveal-on-scroll as enhancement | Must sit inside `@supports`; see the range footgun in §2.6 |
| `animation-trigger` (scroll-triggered, not scrubbed) | Not Baseline | 146 / no / no | (future) replaces IntersectionObserver reveals | Chromium-only |
| `interpolate-size` / `calc-size()` (animate to `height:auto`) | Not Baseline | 129 / no / no | Accordions (enhancement) | Widely supported alternatives: `grid-template-rows: 0fr → 1fr` (Chrome 107 / Firefox 66 / Safari 16) and `::details-content` (Baseline 2025-09-16) |
| `scrollend` event | Baseline 2025-12-12 | 114 / 109 / 26.2 | Post-scroll work without polling | |
| `prefers-reduced-motion` | Baseline widely | 74 / 63 / 10.1 | Always | `prefers-reduced-data` is flag-only in Chrome; don't rely on it |
| WebGPU | **Not Baseline** | 113 partial, 144 full / 141 Windows, 145 macOS Apple silicon / 26 | 3D compute and rendering | three.js `WebGPURenderer` falls back to WebGL2 (§3) |

**Patterns worth putting in `implementation.md`:**

```css
/* Dialog and popover in AND out, no JS. Baseline 2024 except `overlay` (Chromium). */
dialog, [popover] {
  opacity: 1; transform: none;
  transition: opacity var(--dur-medium) var(--ease-out),
              transform var(--dur-medium) var(--ease-out),
              display var(--dur-medium) allow-discrete,
              overlay var(--dur-medium) allow-discrete;
}
dialog:not([open]), [popover]:not(:popover-open) { opacity: 0; transform: scale(.97); }
@starting-style { dialog[open], [popover]:popover-open { opacity: 0; transform: scale(.97); } }
dialog::backdrop { background: rgb(0 0 0 / .4); transition: opacity var(--dur-medium), display var(--dur-medium) allow-discrete, overlay var(--dur-medium) allow-discrete; }
@starting-style { dialog[open]::backdrop { opacity: 0; } }
```

```css
/* View Transitions: reduced motion keeps the crossfade and drops the movement (verified in Chromium 141). */
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*) { animation-name: none; }
  /* NOT animation-duration: 0s. The old/new pseudos inherit duration from the group, so that kills the fade too (verified). */
}
```

```js
// Same-document VT with a fallback. Firefox < 144 or old Safari just swaps.
function transition(update) {
  if (!document.startViewTransition) return update();
  return document.startViewTransition(update);
}
```

**FLIP and shared layout.** First, Last, Invert, Play: measure before, apply the change, measure after, animate the inverted transform back to none.

- **View Transitions** are now FLIP for free across frameworks: give the element a matching `view-transition-name` in both states.
- **Motion's `layout` / `layoutId`** does the same inside React, with scale correction for children and border-radius. It needs `domMax` (41.1 KB gz vs 27.5 KB for `domAnimation`), and every layout animation measures layout (a forced reflow). Use it on a few elements (a selected tab indicator, a card expanding to a detail view), not on a 500-row table.
- **Use View Transitions for page and route changes** and Motion `layout` for in-component reflow.

**Gestures.** Drag, swipe and flick patterns from Kowalski:

- momentum dismissal (velocity > ~0.11 px/ms instead of a distance threshold)
- rising resistance past edges
- pointer capture
- ignore extra touches once dragging

**WCAG 2.5.7 Dragging Movements (AA)** requires a single-pointer alternative for every drag:

| Drag | Alternative |
| --- | --- |
| Reorder | Up/down buttons or a "Move to…" menu |
| Swipe-to-delete | Visible delete button |
| Swipe carousel | Arrow buttons |
| Slider | Also works by click or tap on the track, and by arrow keys |
| Map pan | Arrow buttons |

Gate hover-only motion behind `@media (hover:hover) and (pointer:fine)`, because touch fires false hovers.

**Microinteractions** (Dan Saffer, *Microinteractions*, 2013). Design each one as **trigger** (user or system) → **rules** (what happens) → **feedback** (what the user perceives: usually visual, sometimes motion) → **loops and modes** (what changes over time or repeated use). The loops-and-modes step is where frequency lives: the tenth time a user sees it, it should be quieter than the first. Examples for apps: optimistic "Saved" state, copy-to-clipboard confirmation, inline validation, like/star toggles, drag handles.

**Loading and optimistic UI.**

- Nielsen's 0.1 s / 1 s / 10 s limits already in `ui-ux.md` §4 still hold.
- Skeletons should be **static** under reduced motion (no shimmer sweep).
- Show nothing for waits under ~300 ms, then a skeleton, to avoid a flash of loader.
- **Optimistic UI** (update immediately, reconcile or roll back on error) removes the wait and the animation. The error path needs a visible, specific revert ("Couldn't save. Your change was undone. Retry").
- Spinners belong inside the pressed control.

### 2.6 Scroll-linked motion, scroll-jacking and reveals

- **Scroll-jacking** is changing scroll speed, direction or snapping of the wheel/touch scroll. NN/g's study (via search) found most participants experienced at least mild disorientation, some read it as a bug, and the worst cases combined altered scrolling with reading. A 2025 usability study (Springer, via search) measured lower accuracy and satisfaction with scrolljacking. **Default: never in apps, dashboards, docs or checkout. On marketing pages only as a deliberate art-direction choice, and even then respect reduced motion.**
- **Lenis** 1.3.26 (MIT, 5.5 KB gz) is the "least bad" smooth scroller:
  - It runs on native scroll, so `position: sticky`, anchors and assistive technology keep working.
  - It **honours reduced motion by default** (`respectReducedMotion: true`: smoothing off with `lerp` forced to 1, programmatic scrolls instant). Verified in source.
  - Its README lists limitations: no CSS `scroll-snap`, capped at 60 fps on Safari and 30 fps in Low Power Mode, stops over iframes, fixed-position lag on pre-M1 Safari.
  - It still runs a rAF loop on the main thread during scroll.
  - For in-page anchor jumps, `scroll-behavior: smooth` (Baseline) is enough, turned off under reduced motion.
- **Reveals.** Keep the existing "finished by default, `.motion` hides" rule. Scroll-driven CSS reveals remove the JavaScript failure mode but add a new one, **verified**: with `animation-range: entry 0% cover 30%`, the last card on a page could not scroll far enough to finish and **stayed at 0.65 opacity** at maximum scroll. With `animation-range: entry 0% entry 100%` it reached 1.0. **Rule: a reveal's range ends at `entry 100%`** (fully entered), never at a `cover` percentage. Wrap it in `@supports (animation-timeline: view())` and `@media (prefers-reduced-motion: no-preference)`. Only `transform` and `opacity` move, and never on a photograph.

```css
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .reveal { animation: reveal linear both; animation-timeline: view(); animation-range: entry 0% entry 100%; }
  }
}
@keyframes reveal { from { opacity: 0; transform: translateY(16px); } }
```

### 2.7 Reduced motion done right

WCAG's Understanding doc for 2.3.3: "Users are not harmed or distracted by motion … Support user preferences for motion, and eliminate unnecessary motion effects." Vestibular reactions "include nausea, migraine headaches, and potentially needing bed rest to recover." Kowalski: "Reduced motion means fewer and gentler animations, not zero."

| Motion | Under `prefers-reduced-motion: reduce` |
| --- | --- |
| Slide, zoom or morph page and view transitions | Crossfade ≤ 150 ms, or instant (VT: `::view-transition-group(*){animation-name:none}`) |
| Parallax, scroll-linked movement, scroll-jacking, smooth scroll | Off (static; `scroll-behavior:auto`; Lenis turns itself off) |
| Scroll reveals | Content simply present. No fade, no translate |
| Hover lift, scale or tilt | Colour, shadow or outline change only |
| Spring bounce and overshoot | None; short ease-out or instant |
| Auto-rotating 3D, Lottie/Rive loops, background video, auto-advancing carousels | Paused on a meaningful first frame, with a play control |
| Number counters (tweening 0 → 1,234) | Final value immediately |
| Chart build animations | Final state immediately |
| Skeleton shimmer | Static skeleton |
| Spinners / progress | **Keep** (essential), but prefer a determinate bar or an opacity pulse over rotation |
| Press state, focus ring, toggle knob, drag feedback, caret | **Keep** (essential, user-driven, small) |
| Toast / popover enter | Opacity only |

**What each library does about reduced motion** (verified by reading the installed source; "none" means no `prefers-reduced-motion` handling found in the package):

| Library (version) | Built-in behaviour | What you do |
| --- | --- | --- |
| Motion for React 13.4.4 | **Default `reducedMotion: "never"`** (`MotionConfigContext.mjs`). With `<MotionConfig reducedMotion="user">`, positional values (`x`, `y`, `scale`, `rotate`, `width`, `height`, `top`, `left` …) and layout animations become instant; opacity and colour still animate | Wrap the app in `<MotionConfig reducedMotion="user">`; use `useReducedMotion()` for custom substitutes |
| Motion vanilla `animate()` | Honours a per-call `reduceMotion` transition option, which makes positional values instant (same rule as React) | Check `matchMedia` and pass `reduceMotion: true` |
| GSAP 3.15.0 | None | `gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => { … })` |
| anime.js 4.5.0 | None | Check `matchMedia` |
| AutoAnimate 0.10.0 | **Disabled automatically** under reduce (unless `disrespectUserMotionPreference`) | Nothing |
| react-spring 10.1.2 | Exports `useReducedMotion` | Use it, or `Globals.assign({ skipAnimation: true })` |
| Lenis 1.3.26 | **Smoothing off by default** under reduce | Nothing |
| lottie-web / dotLottie / Rive / three / R3F / model-viewer | None | Don't autoplay; pause; remove auto-rotate |
| Recharts 3.10.1 | `isAnimationActive: 'auto'` = **off under reduce and during SSR**. Default duration 1500 ms (too long) | Set `animationDuration` ≤ 300 |
| Chart.js 4.5.1 | 1000 ms default animation; **ignores** the preference | `animation: false` under reduce (and consider always) |
| ECharts 6.1.0 | 1000 ms default; **ignores** the preference | `animation: false` under reduce |
| ApexCharts 7.6.1 | Has reduced-motion handling | Check it |
| View Transitions (Chromium 141) | **Not skipped**. Default 250 ms morph + crossfade still runs | The CSS guard above |

### 2.8 Performance

- **Compositor-only properties.** `transform` and `opacity` (and usually `filter`) can run off the main thread when animated with CSS or WAAPI. They keep playing while JavaScript is busy (web.dev via search; Kowalski's standards).
  - Width, height, top, left, margin and padding trigger layout. Colour and shadow trigger paint.
  - **Motion hardware-accelerates only `opacity`, `clipPath`, `filter`, `transform` and `backgroundColor`/colours** (`acceleratedValues` in `motion-dom`). Its independent-transform shorthands (`x`, `y`, `scale`) run on the main thread via rAF.
  - When smoothness under load matters (animation during a data fetch or a React render), animate the `transform` string.
- **`will-change`**: apply just before the animation and remove it after. Each promoted layer costs GPU memory; never apply it blanket-wide.
- **Scroll**: no `scroll` event handlers doing work. Use IntersectionObserver (Baseline since 2019), CSS scroll-driven animations (compositor-driven where supported) or `scrollend`. Passive listeners only.
- **INP**: animation work competes with input when it runs on the main thread. That includes library initialisation, per-frame JS, layout animations that measure the DOM, and React re-renders during motion. Long tasks > 50 ms hurt INP. Measured parse+evaluate costs at 4× CPU throttle (§8.2):

  | Library | Parse + evaluate |
  | --- | --- |
  | `motion/mini` | 11 ms |
  | Lenis | 11 ms |
  | anime.js `animate` | 14 ms |
  | Motion `animate` | 18 ms |
  | GSAP core | ~45 ms |
  | three.js (everything) | 67 ms |
  | model-viewer | 134 ms |
  | React + ReactDOM | 146 ms |
  | Spline runtime | **352 ms** |

- **Don't drive many children from one CSS variable** (restyles every child). Set `transform` on the element itself (Kowalski).
- **Background tabs**: rAF stops. CSS animations keep their timeline. The skill's rule already covers content that waits on an animation.

### 2.9 Motion library table

Licences are read from the installed package. Sizes are esbuild `--bundle --minify`, production, React externalised, gzip -9. Evaluation time is the median of 7 runs in Chromium 141 at 4× CPU throttle (§8).

| Library | Version | Licence (verified) | Typical import → min+gzip | Use when | Don't use when |
| --- | --- | --- | --- | --- | --- |
| **CSS + WAAPI** | platform | n/a | 0 KB | Default for everything: state changes, dialogs, popovers, toasts, VT page transitions | Physics gestures, orchestration of dozens of elements |
| **Motion** (ex-Framer Motion; independent since Nov 2024, `motion.dev`) | 13.4.4 (`framer-motion` 13.4.4 is the same code) | MIT | `motion/mini` `animate` **3.8 KB**; `animate` (hybrid WAAPI+JS) **19.9 KB**; `+scroll+inView` 22.5 KB; `motion/react` `motion`+`AnimatePresence` **42.7 KB**; `LazyMotion`+`domAnimation`+`m` **27.5 KB**; `domMax` (layout, drag) 41.1 KB; `motion/react-mini` `useAnimate` 4.0 KB | React apps needing exit animations (`AnimatePresence`), shared layout (`layoutId`), drag with springs, gesture-interruptible motion. Also has Vue and vanilla APIs | Fades and slides CSS can do. Big lists with `layout`. Forgetting `MotionConfig reducedMotion="user"` |
| **GSAP** (+ ScrollTrigger, SplitText, Flip, MorphSVG, all plugins) | 3.15.0 | **"Standard 'no charge' license"**: free incl. commercial use and all plugins since 3.13.0 (2025-04-30) after the Webflow acquisition. Prohibited: use in no-code visual animation builders that compete with Webflow. IP remains Webflow's. **Not OSI open source** | core **27.0 KB**; +ScrollTrigger **44.2 KB**; +ScrollTrigger+SplitText 47.2 KB; +Flip 35.6 KB | Marketing and editorial timelines, scroll-scrubbed storytelling, SVG morphing, complex sequencing; framework-agnostic | App UI state transitions (overkill). Projects that require OSI licences. Building a no-code animation tool |
| **anime.js** | 4.5.0 (v4.0.0 on 2025-04-03) | MIT | `waapi` **4.7 KB**; `animate` 12.5 KB; animate+timeline+onScroll+stagger 19.6 KB; everything 42.0 KB | Lightweight vanilla sequencing, staggers, SVG; `waapi` module for compositor-run motion with nicer syntax | React apps already on Motion |
| **AutoAnimate** | 0.10.0 | MIT | **3.1 KB** | One line to animate list add, remove and reorder (FLIP) in any framework; auto-respects reduced motion | Custom choreography |
| **react-spring** | 10.1.2 | MIT | `useSpring`+`animated` **17.0 KB** | Physics-first React animation, R3F integration | New projects where Motion covers it |
| **Lenis** | 1.3.26 | MIT | **5.5 KB** | Art-directed marketing sites that insist on smooth wheel scrolling | Apps, docs, dashboards, checkout, anything with iframes or scroll-snap |
| **Theatre.js** | 0.7.2 (last publish 2024-05-19) | core Apache-2.0; **studio AGPL-3.0-only** | core 34.5 KB | Keyframe-authoring 3D/cinematic sequences (studio as a dev tool only) | Anything needing an active project; shipping studio in production (AGPL) |
| **lottie-web** | 5.13.0 (last publish 2025-05) | MIT | full **77.1 KB**; `lottie_light` (SVG only) 48.0 KB; parse+eval 75 ms | Designer-authored vector animation from After Effects, if only a few | Many on a page (SVG renderer is main-thread and CPU-heavy on matte-heavy files); a loop used as decoration |
| **dotLottie web** | 0.80.0 | MIT | JS **13.5 KB** + **WASM 1,209 KB raw / 485 KB gzip / 379 KB brotli** | Many Lottie animations, `.lottie` (zipped, multi-animation, theming, state machines); `DotLottieWorker` renders off-main-thread via OffscreenCanvas | A single small icon animation, where the 485 KB WASM dwarfs it (use CSS or SVG). Default WASM URL is **jsDelivr/unpkg**, so self-host via `setWasmUrl` for CSP and privacy |
| **Rive** | `@rive-app/canvas` 2.43.1 | Runtime MIT. Editor: exporting requires a paid plan (Cadet $9/mo, via search) | JS **56.0 KB** + **WASM 1,909 KB raw / 787 KB gzip / 613 KB brotli** | Interactive, state-machine-driven vector animation (onboarding characters, interactive illustrations, game-like UI) with data binding | Simple icons; pages that can't afford ~850 KB; default WASM URL is jsDelivr, so self-host |

**Not re-verified:** Motion+ (Motion's paid add-on for premium components) exists as a separate paid product. The library itself is MIT.

---

## 3. 3D and advanced visuals

### 3.1 When 3D helps

| 3D earns its place | 3D is decoration |
| --- | --- |
| **Ecommerce product viewer**: rotate, inspect materials, see the back, **AR "view in your room"** (model-viewer: WebXR, Scene Viewer, Quick Look) | Spinning abstract blobs, particle fields, "tech" wireframe globes behind a headline |
| **Configurator**: colour, material, option changes visible on the object (furniture, bikes, cars, shoes) | A 3D logo that rotates |
| **Spatial data**: buildings and BIM, terrain, anatomy, molecular structures, networks where depth encodes something | 3D bar or pie charts (a data-ink violation; perspective distorts length and area) |
| **The object IS the product** in a brand hero (hardware, a physical good), used once, with a poster fallback | Scroll-scrubbed 3D camera fly-throughs on an app or docs page |
| Education and explanation where rotation answers a question | Background shaders that run forever |

Four gating questions:

1. **Does the user need to see it from more than one angle, or change it?** If no, a photograph or a short video (or an image sequence) does the job at a fraction of the cost.
2. **Is there a real asset?** A 3D viewer with a low-poly placeholder is worse than photographs.
3. **Can the page afford it?** The runtime and model load after the page is usable (lazy or on interaction). The poster is the LCP.
4. **Is there a non-3D path to the same information?** Dimensions, materials and colours in text, and photos for AT and reduced-motion users.

### 3.2 Options

| Tool | Version | Licence (verified) | min+gzip (measured) | Use for | Watch out |
| --- | --- | --- | --- | --- | --- |
| **`<model-viewer>`** (Google) | 4.3.1 (depends on three ^0.183) | Apache-2.0 | **297 KB** (includes three); eval 134 ms | Ecommerce PDP viewer and AR with no 3D code: `poster`, `loading="lazy\|eager\|auto"`, `reveal="auto\|manual"` (click-to-load), `camera-controls` (keyboard-accessible), `alt`, `ar ar-modes="webxr scene-viewer quick-look"`, IntersectionObserver-based offscreen handling | Loads Draco and KTX2 decoders from **gstatic.com** by default (self-host for CSP). `auto-rotate` must go under reduced motion. **`touch-action` defaults to `none`** (verified in `controls.ts`), so on touch devices the viewer swallows vertical page scrolling unless you set `touch-action="pan-y"`. Keyboard: arrow keys and PageUp/PageDown orbit and zoom (`SmoothControls.ts`) |
| **three.js** | r186 (0.186.1) | MIT | everything 186 KB; basic scene (named imports) **131 KB**, so it tree-shakes poorly; + GLTFLoader + DRACOLoader + OrbitControls **159 KB**; `three/webgpu` everything **291 KB**; eval 67–70 ms | Custom scenes, configurators, data-driven 3D | Bundle weight; disposal of GPU resources; `OrbitControls` captures the wheel (disable zoom-on-wheel or require a modifier) |
| **React Three Fiber + drei** | fiber 9.8.1, drei 10.7.9 | MIT | `Canvas` (pulls all of three) **243 KB** + React; + `useGLTF`, `OrbitControls`, `Environment` **287 KB**; eval +~195 ms over React | React apps: declarative scenes, `frameloop="demand"`, `dpr={[1,2]}`, `PerformanceMonitor`/`AdaptiveDpr`, Suspense-loaded models | Imports all of three. Not for a single product viewer (model-viewer is simpler) |
| **OGL** | 1.0.11 (last publish 2025-01) | Unlicense | **13.8 KB** | Minimal WebGL: one shader plane, a gradient, a lightweight effect | No loaders or controls ecosystem; you write GLSL |
| **Babylon.js** | 9.28.0 | Apache-2.0 | root import **1,550 KB (!)**; deep imports **259 KB** | Game-like, physics, full engine, tooling (inspector, playground) | Import from deep paths (`@babylonjs/core/…`), never the root barrel: a 6× difference |
| **Spline** runtime | 2.0.59 | **No licence field; "© 2026 Spline, Inc."** Free plan web exports carry a watermark; code and self-hosted export on paid plans (via search) | **1,062 KB**; eval **352 ms** (4× throttle), plus the `.splinecode` scene | Rapid prototypes; designer-owned scenes where the team accepts the weight | Production pages that care about INP/LCP, CSP, vendor lock-in or licence clarity |
| **Rive / Lottie** | see §2.9 | | | 2D vector interactivity, often the right answer when "3D" was really "illustration that moves" | |

**WebGPU**: not Baseline (Chrome 113 on some platforms, 144 more broadly; Firefox 141 on Windows, 145 on macOS Apple silicon; Safari 26). Since r171, three.js's `three/webgpu` `WebGPURenderer` falls back to WebGL2 automatically, and TSL shaders compile to WGSL or GLSL (via search). It costs about +105 KB gz over the classic build. Use it for compute-heavy scenes; for a product viewer, WebGL2 (Baseline widely since 2024-03) is enough.

### 3.3 Fallbacks and performance checklist for any 3D on a page

- [ ] **Poster first.** Use a real render of the model in the same framing, sized, `fetchpriority="high"` if above the fold. **Verified: a WebGL `<canvas>` never produces an LCP entry.** A page with only a canvas reported *no* LCP; add a headline and the H1 becomes the LCP; add a poster `<img>` under the canvas and the image becomes the LCP. The poster is what LCP measures, so optimise it. (A flat single-colour poster is ignored as low-entropy, per Chrome's 0.05 bits-per-pixel rule. It must be a real image.)
- [ ] **Load late.**
  - model-viewer: `loading="lazy"` (loads near the viewport), or `reveal="manual"` for tap-to-load.
  - three / R3F: `import()` on IntersectionObserver or first interaction.
  - Never in the critical path.
- [ ] **Render only when needed.**
  - R3F `frameloop="demand"`; three `renderer.setAnimationLoop(null)` when idle.
  - Pause on IntersectionObserver exit and `visibilitychange`.
  - No perpetual loops for decoration.
- [ ] **Cap device pixel ratio**: `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))` / `dpr={[1, 2]}`. Degrade adaptively (drei `PerformanceMonitor`).
- [ ] **Reduced motion**: no auto-rotate, camera fly-ins, parallax tilt or looping animation. A static, well-lit frame; controls still work.
- [ ] **Low-power heuristics** are unreliable across browsers. `navigator.connection.saveData` and `deviceMemory` are Chromium-only; `getBattery` has no Safari. Use them only to *reduce* quality, never as the only gate. Use `powerPreference: "low-power"` for anything non-essential.
- [ ] **Failure path**: if WebGL context creation fails (or `failIfMajorPerformanceCaveat` trips), keep the poster and hide the controls.
- [ ] **Don't trap scrolling on touch**: model-viewer's `touch-action` default is `none`, so set `touch-action="pan-y"`; for three/R3F, set CSS `touch-action: pan-y` on the canvas and don't bind wheel-zoom without a modifier.
- [ ] **Accessibility**:
  - A canvas is opaque to assistive technology. model-viewer takes `alt`; for three/R3F, give the canvas `role="img"` and `aria-label`, or put a description next to it.
  - Every fact shown in 3D (dimensions, colours, options) is also in text.
  - Rotate and zoom have buttons (WCAG 2.5.7) and keyboard support.
  - Don't trap page scroll or pinch-zoom.
- [ ] **CSP and privacy**: self-host decoders and WASM. model-viewer defaults to gstatic; dotLottie and Rive default to jsDelivr/unpkg.
- [ ] **Memory**: dispose geometries, materials, textures and render targets on unmount; one renderer per page.
- [ ] **Budget** (proposal, not an external standard):
  - The 3D runtime is not in the initial JS.
  - A PDP model ≤ ~1.5 MB GLB transferred, with textures ≤ 2048² (1024² on mobile).
  - Hero scenes: first frame within 1 s of the poster on a mid-tier phone, or don't ship it.

### 3.4 Asset pipeline

- **Format**: glTF 2.0 binary (`.glb`). Pipeline: `@gltf-transform/cli` 4.5.1 (MIT). Defaults verified from `--help`: `--compress` accepts `draco|meshopt|quantize|false`, default **meshopt**; `--texture-compress` accepts `ktx2|webp|avif|auto|false`; `--texture-size` sets maximum pixels. `--simplify`, `--join`, `--instance`, `--prune`, `--weld` and `--resample` are on by default in `optimize`.
- **Measured on Khronos DamagedHelmet.glb** (3,685 KB; five 2048² JPEG textures):

  | Command | Output | gzip | Change |
  | --- | --- | --- | --- |
  | `optimize --compress meshopt --texture-compress false` | 3,316 KB | 3,168 | −10% (**geometry is not the problem**) |
  | `--compress meshopt --texture-compress webp` (2048) | 1,409 KB | 1,366 | −62% |
  | `--compress meshopt --texture-compress webp --texture-size 1024` | **532 KB** | 494 | −86% |
  | `--compress draco --texture-compress webp --texture-size 1024` | **432 KB** | 427 | −88% |

  **Decoder cost reverses the geometry codec choice.** The Draco glTF decoder is 61.8 KB gz WASM + 11.3 KB gz wrapper. The Meshopt decoder is **7.1 KB gz**. Total transfer: Draco 427 + 73 = 500 KB; Meshopt 494 + 7 = 501 KB, which is identical. **Textures dominate: resize and recompress them first.** Choose Meshopt by default (smaller decoder, faster decode, also compresses animation). Choose Draco for geometry-heavy, texture-light scans. **KTX2/Basis** cuts GPU memory but its transcoder is 240 KB gz, so it pays off only for texture-heavy scenes or many models.
- **Asset licences.** Record every asset's licence in `DESIGN.md`.

  | Source | Licence | Notes |
  | --- | --- | --- |
  | **Poly Haven** (HDRIs, textures, models) | CC0 | No attribution; commercial OK (via search) |
  | **Kenney** | CC0 | Via search |
  | **Sketchfab** | **Per model**: CC BY (attribution required), CC0, CC BY-NC (non-commercial), Sketchfab **Standard** (store purchase, some restrictions) and **Editorial** (no commercial or promotional use) | Via search. Check each model |
  | **Khronos glTF-Sample-Assets** | Mixed | Verified: DamagedHelmet is **CC-BY-4.0 *and* CC-BY-NC-4.0**, so it is not usable commercially. "Sample" does not mean "free" |
  | **Shadertoy** code | **CC BY-NC-SA 3.0 Unported** unless the shader's header states otherwise | Via search of shadertoy.com/terms. Copying a Shadertoy shader into a commercial site is a licence violation by default. Write your own GLSL or use permissively licensed sources (e.g. `lygia`, not re-verified here) |
  | three.js example models | Varied | Check each file's licence |

---

## 4. Data visualisation

### 4.1 Three kinds of chart, three rulebooks

| | **Monitoring** (dashboard) | **Analytical** (exploration) | **Explanatory** (marketing, editorial, reports) |
| --- | --- | --- | --- |
| Question | "Is anything wrong or changing?" | "Why? Where? Which?" | "What should I take away?" |
| Canonical source | Stephen Few: "a visual display of the most important information needed to achieve one or more objectives; consolidated and arranged on a single screen so the information can be monitored at a glance" | Shneiderman/Few: overview first, zoom and filter, details on demand | Datawrapper / FT: the title states the finding; annotate; highlight |
| Density | High but calm. Many small multiples, sparklines, bullet graphs | Medium to high, interactive | Low: one message per chart |
| Colour | Neutral greys; colour **only** for exceptions and status | Categorical for series, sequential for magnitude | Grey + one highlight colour |
| Interaction | Minimal. Drill-down links, a time-range control | Filter, brush, zoom, linked views, sortable tables, export | Usually none; tooltips optional; must read as a static image |
| Motion | None beyond a ≤ 250 ms value transition on update; no build-in animations | Short (≤ 300 ms) transitions that preserve object constancy on filter/sort | Optional reveal that *explains* (a line drawing in step with the narrative); otherwise none |
| Failure mode | Gauges, 3D, decorative KPI cards with no comparison | Everything-at-once, no defaults | **Fake or decorative charts**; unlabelled "up and to the right" |

### 4.2 Principles

- **Tufte**: maximise the data-ink ratio; erase non-data ink (heavy gridlines, borders, backgrounds, 3D, shadows); avoid **chartjunk**. Small multiples beat one overloaded chart. Sparklines are "data-intense, design-simple, word-sized graphics."
- **Cleveland & McGill (1984)**, the perceptual accuracy ranking:
  1. position on a common scale
  2. position on non-aligned scales
  3. length, direction, angle
  4. area
  5. volume, curvature
  6. shading and colour saturation

  **Consequences:** bars and dots beat pies and donuts; aligned small multiples beat stacked bars (only the bottom segment is on a common baseline); colour encodes category or status, not precise quantity.
- **Stephen Few** (dashboards): a single screen, no scrolling for the core picture. Most important at top-left. Every number needs context: target, previous period or benchmark. A number alone is not information. **Bullet graphs** replace gauges (measure, target, qualitative ranges, in a fraction of the space). **Sparklines** give trend context next to a KPI. Avoid gauges, speedometers, 3D, pies with many slices and decorative imagery.
- **Datawrapper** (Lisa Charlotte Muth): "Consider the color grey as the most important color in Data Vis. Using grey for less important elements … makes your highlight colors … stick out even more." Direct-label lines instead of a legend; Datawrapper's own charts switch direct labels to a colour key when the chart gets too narrow. Use fewer colours. On mobile, turn columns into horizontal bars so labels stay horizontal.
- **FT Visual Vocabulary** (read from GitHub). Choose the chart from the *relationship* you want to show: deviation, correlation, ranking, distribution, change over time, part-to-whole, magnitude, spatial, flow. Its warnings are worth quoting in the skill:
  - Correlation: "many readers will assume the relationships you show them to be causal."
  - Spatial: use maps "only when precise locations or geographical patterns … are more important to the reader than anything else."
  - Part-to-whole: "if the reader's interest is solely in the size of the components, consider a magnitude-type chart instead."
- **Observable Plot**'s philosophy (a concise grammar of marks and scales; you describe the chart, the library picks sensible defaults) is the right default mental model for exploratory and editorial charts.

### 4.3 Chart-choice guide

| You want to show | Default | Good alternatives | Avoid |
| --- | --- | --- | --- |
| **Change over time** (few series) | Line chart, direct-labelled | Area (single series), column (few periods, discrete) | Pie per period; dual-axis lines (implies false correlation) |
| Change over time (many series) | Small multiples of lines; or grey lines + highlighted one | Heatmap (series × time) | Spaghetti with a 12-colour legend |
| **Magnitude / comparison** | Horizontal bar, sorted | Dot plot (when zero isn't meaningful), lollipop | 3D bars; radial bars; bars not starting at zero |
| **Ranking** | Ordered bar | Slope chart (two points in time), dot strip | Unordered bars |
| **Part-to-whole** | Stacked bar (100%) or a single bar with ≤ 5 segments | Treemap (many parts), waffle | Pie or donut with > 3–5 slices; 3D pie; multiple pies to compare |
| **Deviation** (vs zero, target, average) | Diverging bar | Surplus/deficit filled line; bullet graph (vs target) | Colour-only encoding of good and bad |
| **Distribution** | Histogram | Box plot, violin, dot/strip/beeswarm, cumulative curve | Mean-only bar with no spread |
| **Correlation** | Scatterplot | Connected scatter (over time), XY heatmap (dense) | Dual-axis line (reads as correlation that isn't tested) |
| **Flow** | Sankey (few nodes) | Chord, network | Sankey with 40 nodes |
| **Spatial** | Choropleth (normalised rates, not counts) or proportional symbols | Hex/tile map (equal-area) | Choropleth of raw counts (maps population) |
| **Single KPI** | Big number + delta vs comparison + sparkline | Bullet graph vs target | Gauge/speedometer; number with no comparison |
| **Exact values the user will look up** | **A table** (right-aligned, tabular numerals, sortable) | Table with inline bars or sparklines | A chart when people need the numbers |

### 4.4 Dashboard-specific rules

The skill should apply these whenever the product is an app or dashboard.

1. **One screen for the core picture** at the primary breakpoint. Details go one click away (progressive disclosure, ≤ 2 levels, per `ui-ux.md` §4).
2. **KPI tile anatomy**:
   - label (plain words)
   - value (tabular numerals, sensible precision)
   - comparison (Δ vs previous period or target, with sign **and** arrow **and** colour, never colour alone)
   - period
   - optional sparkline
   Tiles never animate their counters.
3. **Status colour is reserved.** Red, amber and green mean status only, never series identity. Series use a categorical palette that has no red/green pair, or greys plus one accent.
4. **Tables are first-class.** Right-align numbers, `font-variant-numeric: tabular-nums` (Baseline since 2020), units in the header not every cell, sticky header, sortable columns with `aria-sort`, zebra or row lines (not both), density toggle.
5. **Consistent scales across comparable small multiples.** Say explicitly when they are independent.
6. **Time ranges and refresh**: show "Updated 2 min ago". Updates transition values in ≤ 250 ms, or not at all. Never re-run a build animation on refresh (Recharts' 1500 ms default, ECharts' and Chart.js's 1000 ms defaults must be overridden).
7. **Empty, loading, error and partial-data states** for every chart. A skeleton in the chart's shape; "No data for this period" with a next step. Never a zero line pretending to be data.
8. **Bullet graphs over gauges; sparklines over mini-charts with axes.**
9. **Performance**: a dashboard with 10+ charts and live data needs canvas for dense series (uPlot, ECharts, Chart.js with decimation). Many small SVG charts of ≤ 1–2k points are fine (§8.3 numbers).

### 4.5 Colour for data

- **Categorical**: ≤ 7 hues (a practical limit; beyond that, group into "Other" or use small multiples). Put a neutral grey on context series.
  - **Okabe-Ito** (Okabe & Ito, *Color Universal Design*, 2008) is the reference colour-blind-safe set: `#E69F00 #56B4E9 #009E73 #F0E442 #0072B2 #D55E00 #CC79A7 #000000`.
  - `#F0E442` fails contrast on white for thin lines, so use it for fills only.
- **Sequential**: one hue light → dark, or perceptually uniform multi-hue (**viridis**, cividis). ColorBrewer's sequential schemes (Brewer) are also safe.
- **Diverging**: two hues around a meaningful neutral midpoint (zero, target, average), e.g. ColorBrewer RdBu/PuOr. Avoid red-green.
- **Don't rely on colour alone**: direct labels, shapes and markers, dash patterns, or ECharts' `aria.decal` patterns (built in, verified in `globalDefault.js`).
- **Contrast** (Chartability, critical): marks and large text ≥ 3:1 against the background; regular text ≥ 4.5:1. Text in charts ≥ 12 px ("not smaller than 9pt/12px").
- **Dark mode**:
  - Don't invert. Re-tune the palette (lighter, slightly desaturated hues on dark surfaces).
  - Lower gridline contrast. Keep marks ≥ 3:1. Avoid pure-black backgrounds.
  - Check the highlight colour in both themes.
  - ECharts 6 defaults to `darkMode: 'auto'` (verified), but its palette still needs checking.
- The brand accent is rarely a good data colour. The design system should hold a **separate data palette** (see the `dataviz` skill available in this environment for a validated palette method).

### 4.6 Numbers and text

- **Titles state the finding** in explanatory charts ("Churn halved after onboarding redesign"), with a subtitle for the measure and unit. In dashboards, titles name the metric plainly.
- **Direct labels** over legends. Label the last point of each line. A legend is the fallback at narrow widths.
- **Number formatting**:
  - `Intl.NumberFormat` with the locale.
  - Compact notation for axes and KPI tiles (`{notation:'compact', maximumSignificantDigits:3}` → "1.2M").
  - Full precision in tables and tooltips.
  - Consistent decimals within a column.
  - Units once.
  - Percentages vs percentage points distinguished.
  - A true minus sign where typography matters.
- **Tabular numerals** anywhere numbers align or update: tables, KPI tiles, axes, tickers.
- **Axes**: bars start at zero; lines may not (say so). Round tick values; ~5 ticks. Dates formatted for the range (hours → days → months).
- **Annotations** carry the story (events, targets, anomalies). Chartability's "No explanation for purpose or for how to read" is a critical failure.

### 4.7 Responsive charts

- Fewer ticks as width shrinks (e.g. `ticks(Math.max(2, width / 80))`).
- Rotate to **horizontal bars** on narrow screens, never rotated labels.
- Direct labels become a legend or key when there's no room.
- Taller aspect ratio on mobile. Tooltips become tap targets ≥ 24 px (WCAG 2.5.8) or a tap-to-show value row.
- Offer "Show as table".
- Avoid horizontal scrolling of the chart itself. Small multiples stack vertically.

### 4.8 Accessible charts: Chartability as the checklist

**Chartability** (Frank Elavsky; workbook read from `Chartability/POUR-CAF`) has seven principle groups: Perceivable, Operable, Understandable, Robust, plus **C**ompromising, **A**ssistive, **F**lexible. Its stance: "You cannot 'pass' Chartability 100% … a good audit finds evidence of risk and failure." The **critical** tests, which the skill should require for any app or dashboard chart:

| Test | Requirement |
| --- | --- |
| Low contrast | Marks ≥ 3:1, text ≥ 4.5:1 |
| Content is only visual | All information available to screen readers. Test JAWS+Chrome, NVDA+Firefox, VoiceOver+Safari (macOS, iOS) |
| Small text size | ≥ 12 px |
| Visual presents seizure risk | No red flashes |
| Interaction modality only has one input type | Keyboard mirrors mouse: focus = hover, Enter/Space = click |
| No interaction cues or instructions | |
| Controls override AT controls | Custom keys only while the chart is focused |
| No explanation for purpose or for how to read | |
| No title, summary, or caption | |
| Reading level inappropriate | Grade ≤ 9 |
| **No table** | A human-readable table of the data, unless the text already conveys everything |
| Data density is inappropriate | |
| Navigation and interaction is tedious | |
| User style change not respected | |

Its non-critical tests include "Long animations cannot be controlled" and "Scrolling experiences cannot be altered", which line up with §2.7.

**Implementation minimum:**

- **Static SVG chart**: `role="img"`, an `aria-label` that states the takeaway, plus `<title>`/`<desc>`. Hide the decorative internals (`aria-hidden` on axes and marks) if a table follows.
- **Canvas chart** (Chart.js, uPlot, ECharts canvas): the canvas is invisible to AT. Add `role="img"` + `aria-label`, and put fallback content inside `<canvas>` or a table next to it.
- **Interactive chart**: keyboard focus into the chart, arrow keys between points, focused-point announcement, visible focus. Libraries that do this: Highcharts accessibility module, AG Charts, Recharts `accessibilityLayer`.
- **Always**: a "View data as table" disclosure, a text summary of the trend, units and definitions.

### 4.9 Chart library table

Sizes are measured (min+gzip, React external; add **67.3 KB** gz for React + ReactDOM 19.3.0 when comparing to vanilla). "Eval" is parse+evaluate, median of 7, at 4× CPU throttle, including React where noted. "Render" is time to first frame for a line with 1k / 10k / 100k points at 4× throttle (§8.3).

| Library | Version | Licence (verified) | min+gzip | Eval | Render 1k / 10k / 100k | Renderer, SSR | Accessibility | Use when | Don't use when |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **uPlot** | 1.6.32 | MIT | **22.7 KB** (+0.8 KB CSS) | 68 ms | **82 / 97 / 110 ms** | Canvas; no SSR | None built in (add table and label) | Time series, monitoring, live streaming, 10k–1M points; README claims 166,650 points cold-start interactive and 60 fps streaming | Bar/pie variety, rich annotation, an out-of-the-box design system look |
| **Chart.js** | 4.5.1 | MIT | `chart.js/auto` 69.1 KB; tree-shaken line **53.2 KB** | 37 ms | default 191 / 517 / **4,056 ms**; with `parsing:false` + `normalized` + LTTB **decimation** 141 / 166 / 159 ms | Canvas; no SSR | None in core (canvas); plugins exist | Simple, familiar charts in any framework; mid-size data with decimation | Accessibility-critical contexts without extra work; reduced motion ignored by default (1000 ms animation) |
| **Apache ECharts** | 6.1.0 | Apache-2.0 | full **371.5 KB**; core + line + grid + tooltip + canvas **167.3 KB**; + aria, SVG 172.0 KB | full 196 ms; core 87 ms | canvas 263 / 381 / 1,190; canvas + `sampling:'lttb'` 224 / 291 / 571; SVG 207 / 265 / 573 | Canvas or SVG; **SSR** via `ssr:true` + `renderToSVGString()` (verified) | `aria.enabled` auto-generates descriptions; `aria.decal` patterns; `darkMode:'auto'` | Big analytical dashboards, huge chart-type range (maps, graphs, sankey), large data | Small sites (weight); always import from `echarts/core` |
| **Recharts** | 3.10.1 | MIT | line chart **107.8 KB** | +~150 ms over React | 415 / 606 / **3,216 ms** | SVG (React); SSR-aware (skips animation during SSR, verified); `ResponsiveContainer` measures on the client | **`accessibilityLayer` default true in v3** (keyboard + screen-reader announcements); animation `'auto'` respects reduced motion | React apps with standard business charts; the base of **shadcn/ui charts** (now on Recharts v3) and Tremor | > ~5k points per chart; bundle-sensitive pages. Set `animationDuration` (1500 ms default) |
| **shadcn/ui charts** | copy-paste | MIT | ≈ Recharts | | | SVG | Inherits Recharts; the design-system look | shadcn/Tailwind apps | Same limits as Recharts |
| **Tremor** | `@tremor/react` 3.18.7 (last publish **2025-01-13**) | Apache-2.0 (npm); Tremor copy-paste components and Blocks MIT after **Vercel acquired Tremor, 2025-01-22** (via search) | `AreaChart` **234.3 KB** (pulls Recharts **2.15.4**, now deprecated, plus headlessui, date-fns, react-day-picker); eval +~305 ms | | | SVG | Via Recharts 2 | Only via the copy-paste components (tremor.so) | Don't install `@tremor/react` for new work: stale, heavy |
| **visx** (Airbnb) | 4.0.0 | MIT | primitives (shape+scale+axis) **22.6 KB**; `@visx/xychart` 60.9 KB | xychart +~87 ms | (≈ d3 SVG) | SVG (React); SSR-friendly | You build it | Custom, bespoke React charts with a design system; full control | Teams wanting charts out of the box |
| **D3** | 7.9.0 (last publish 2024-03) | ISC | line-chart subset **24.0 KB**; everything 100.9 KB | 23 ms (subset) | single SVG path **49 / 81 / 389 ms** | SVG/Canvas; you render | You build it | Bespoke and editorial graphics; the primitives under Plot and visx | Standard dashboards (time sink) |
| **Observable Plot** | 0.6.17 (last publish 2025-02) | ISC | **95.4 KB** (includes the d3 it needs) | 96 ms | 93 / 137 / 524 ms | SVG; SSR by passing a `document` (e.g. linkedom) | `ariaLabel`/`ariaDescription` options; semantic marks | Exploratory and editorial charts with sensible defaults; concise grammar | Heavily interactive app widgets |
| **Vega-Lite** (+ vega-embed) | 6.4.3 | BSD-3-Clause | **296.6 KB** | 134 ms | | SVG/Canvas; server rendering via Vega CLI or Node | ARIA attributes on the scenegraph (`aria-roledescription`, descriptions) | Declarative JSON specs, notebooks, charts from config or an LLM | Bundle-sensitive pages |
| **Nivo** | 0.99.0 (last publish 2025-05) | MIT | `ResponsiveLine` **94.4 KB** | +~110 ms | | SVG/Canvas/HTML; SSR via `@nivo/static` | Some ARIA props | React, good-looking defaults, many chart types | Large data; bundle-sensitive pages |
| **Victory** | 37.3.6 (last publish 2025-01) | MIT | line **80.3 KB** | | | SVG (React + React Native) | Basic | React + React Native parity | New web-only work |
| **Unovis** | 1.7.0 | Apache-2.0 | `XYContainer`+Line+Axis **59.2 KB** | | | SVG/Canvas; framework-agnostic (React/Vue/Svelte/Angular wrappers) | Some | Framework-agnostic apps, network graphs, maps | |
| **LayerChart** (Svelte) | 2.5.0 | MIT | (not measured) | | | SVG/Canvas (Svelte) | | Svelte/SvelteKit apps | |
| **AG Charts Community** | 14.2.0 | MIT (Enterprise features commercial) | **397.4 KB**. Registering only line modules via `ModuleRegistry` did **not** reduce it (single-file ESM bundle) | **529 ms** | | Canvas | Keyboard navigation built in | Teams already on AG Grid | Weight-sensitive pages |
| **Highcharts** | 13.1.1 | **Proprietary**: "Commercial use … governed by the Highsoft Standard License Agreement"; non-commercial under the EULA. Commercial *and internal business* use needs a paid licence | core **102.2 KB**; + accessibility module **142.3 KB** | 217 ms | | SVG | **Best-in-class accessibility module** (keyboard, screen readers, sonification), separate file | Enterprises with a licence and strict accessibility needs | Any commercial project without a licence |
| **ApexCharts** | 7.6.1 | **Proprietary dual licence since 5.3.0 (2025-07-21)**; MIT up to 5.2.0. Community licence free only under **$2M annual revenue**; **OEM licence** for products or platforms where others configure charts; premium chart types in opt-in imports | **275.7 KB** | 45 ms | | SVG | Has reduced-motion handling | Only if the licence fits | By default (the licence change is easy to miss; pinning 5.2.0 freezes you on old code) |

**Picking one (default guidance for the skill):**

| Situation | Choice |
| --- | --- |
| React app with standard business charts | shadcn/ui charts or Recharts 3 (accessible by default, reduced-motion aware). Override animation durations |
| Dense time series, monitoring, real-time | **uPlot** (22.7 KB, flat render cost to 100k points). Add a table and label yourself |
| Big analytical app with many chart types or maps | ECharts (tree-shaken core, `aria`, SVG SSR) |
| Editorial or explanatory charts on a marketing or content site | **Observable Plot**, or static SVG rendered at build time (Plot with a server document, or ECharts `renderToSVGString`). **Zero JS shipped** is the best chart performance |
| Bespoke, branded, interactive | visx (React) or D3 |
| Strict accessibility requirement with budget | Highcharts + accessibility module (licensed) |

### 4.10 Charts on marketing sites

The existing anti-pattern ("Fabricated dashboards, numbers, customers…") extends to charts:

- **No fake charts.** "Growth" curves with no axis, no data and no source; illustrative sparklines in feature cards; animated counters that count to invented numbers.
- **A product screenshot of a real dashboard** with realistic, clearly sample data (not customer data) is the honest way to show a product. A chart is used only when it carries a *true, sourced claim*. Then it follows the explanatory rules: title states the finding, source line, direct labels, one highlight, static render, table or text equivalent.
- **Animated number counters** need a reason. Under reduced motion they show the final value. They never delay the number's visibility.

---

## 5. Anti-patterns

The "Motion" section of `anti-patterns.md` can absorb these, plus new "3D" and "Charts" sections.

**Motion**

- Animating keyboard-initiated or 100+/day actions (command palette, tab switches, row selection).
- Expressive motion (bounce, long durations, staggers) in productive UI: dashboards, tables, forms, checkout.
- `ease-in` on anything the user is waiting to see; linear easing on UI movement.
- Keyframe animations for rapidly re-triggered UI (they restart instead of retargeting).
- `scale(0)` entrances. Start at 0.9–0.97 + opacity 0.
- Staggers that block input or exceed ~300 ms in total.
- Scroll-jacking and smooth-scroll libraries on apps, docs or checkout.
- Scroll-driven reveals whose `animation-range` ends at a `cover` percentage. Content near the page end stays half-faded (measured 0.65 opacity).
- View Transitions without a reduced-motion guard (they are not skipped automatically). Guarding with `animation-duration: 0s` on the group also kills the crossfade.
- Motion for React without `<MotionConfig reducedMotion="user">`.
- Chart.js, ECharts or Recharts default build animations (1000–1500 ms) on dashboards, and re-running them on every data refresh.
- Motion that is the only carrier of information (HIG: "Make motion optional").
- Drag-only interactions with no single-pointer alternative (WCAG 2.5.7).
- A 485–787 KB WASM runtime (dotLottie, Rive) for one decorative loop.
- Loading animation runtimes from third-party CDNs by default (dotLottie, Rive, model-viewer decoders) on a site with a CSP or privacy commitments.

**3D**

- 3D as decoration: blobs, particles, rotating logos, perpetual background shaders.
- A 3D hero with no poster (no LCP image, blank box until the runtime loads) or with a flat-colour poster (ignored by LCP).
- Spline embeds on performance-critical pages (1 MB+ runtime plus scene).
- Babylon imported from the root barrel (1.5 MB gz vs 259 KB with deep imports).
- Uncapped devicePixelRatio; rendering every frame while idle or offscreen.
- Auto-rotate under reduced motion; `OrbitControls` hijacking the page wheel or pinch; `<model-viewer>` left at its default `touch-action="none"`, which traps vertical scrolling on phones.
- Shadertoy code pasted into a commercial site (CC BY-NC-SA by default); "sample" models used commercially without checking (DamagedHelmet is CC-BY-NC).
- Uncompressed 2048² (or larger) textures. Textures, not geometry, are the weight.

**Charts**

- Pie or donut with more than ~5 slices; any 3D chart; dual-axis charts; gauges.
- Colour as the only encoding; red/green pairs; brand colours reused as series colours without a colour-blind check.
- A legend where direct labels fit; rotated axis labels (use horizontal bars).
- KPI numbers without a comparison; counters that animate.
- A chart with no title, summary or table (Chartability critical); canvas charts with no text alternative.
- Proportional-font numbers in tables and KPI tiles; inconsistent decimals.
- Installing ApexCharts or Highcharts without checking the licence; installing `@tremor/react` (stale, pulls deprecated Recharts 2).
- SVG charts with 10k+ points (Recharts measured 3.2 s for 100k at 4× throttle). Use canvas or decimation.
- Fabricated or decorative charts on marketing pages.

---

## 6. Proposed changes to the skill

These are suggestions for the integrating session; nothing was edited here.

| File | Change |
| --- | --- |
| `references/ui-ux.md` §7 Motion | Replace with: the purposes table (§2.1); the frequency gate; productive vs expressive by site type; the token set (§2.4) with the exit-easing reconciliation; the reduced-motion substitution table (§2.7). Keep NN/g's duration bands; they agree with the tokens |
| `references/implementation.md` | Add the patterns next to "The reveal, written safely": `@starting-style`/`allow-discrete` dialogs and popovers; the View Transitions reduced-motion guard (`animation-name:none` on the group, **not** `duration:0`); the scroll-driven reveal with `entry 100%`; `MotionConfig reducedMotion="user"`; chart animation overrides |
| `references/anti-patterns.md` | Extend "Motion"; add "3D" and "Charts" sections (§5) |
| `references/technical-qa.md` | QA steps: (1) toggle reduced motion (DevTools rendering emulation) and walk every transition; (2) confirm the LCP element on 3D pages is the poster or headline; (3) check that no animation runtime loads WASM from a third-party CDN; (4) keyboard-walk every interactive chart; (5) check that each chart has a table or summary |
| `templates/DESIGN.md` | Add: motion register per surface; the motion token block; the per-animation spec line; data palette (categorical, sequential, diverging + status colours kept separate); asset licence log for 3D, shaders and Lottie |
| New reference, e.g. `references/data-and-motion.md` (or split into two) | Hold §3's 3D decision guide and checklist and §4's dataviz rules and library table, so `ui-ux.md` stays short |
| `SKILL.md` | A routing line: "for apps and dashboards, read the dataviz and productive-motion sections; for PDPs, the 3D checklist" |

---

## 7. Sources

**Primary: code, packages, data (read directly)**

- npm packages as installed 2026-09-28 (versions in the tables): each package's `package.json` licence field and shipped `LICENSE`:
  - `node_modules/apexcharts/LICENSE` (dual licence text)
  - `node_modules/highcharts/LICENSE.txt`
  - `node_modules/gsap/README.md` plus the licence field history (`npm view gsap@3.12.7 license` vs `@3.13.0`)
  - `@splinetool/runtime/package.json` (no licence; "© 2026 Spline, Inc.")
  - `@theatre/studio` (AGPL-3.0-only)
- npm registry publish dates (`npm view <pkg> time`), including ApexCharts' licence field across 5.0.0 (MIT) → 5.3.0 ("ApexCharts License") → 5.3.5+ ("SEE LICENSE IN LICENSE").
- Library source read for behaviour:
  - Motion: `motion-dom/dist/es/render/VisualElement.mjs`, `animation/interfaces/visual-element-target.mjs`, `render/utils/keys-position.mjs`, `animation/waapi/utils/accelerated-values.mjs`; `framer-motion/dist/es/context/MotionConfigContext.mjs`
  - Lenis: `lenis/dist/lenis.mjs` and README (Limitations, Reduced motion)
  - AutoAnimate: `@formkit/auto-animate/index.mjs`
  - Recharts: `recharts/es6/animation/*.js`, `chart/CartesianChart.js`
  - Chart.js: `chart.js/dist/chunks/helpers.dataset.js`
  - ECharts: `echarts/lib/model/globalDefault.js`, `lib/core/echarts.js`
  - model-viewer: `@google/model-viewer/src/features/loading.ts`, `staging.ts`, `model-viewer-base.ts`
  - Observable Plot: `@observablehq/plot/src/plot.js`
  - Default CDN URLs in dotlottie-web, Rive and model-viewer dist files
- `web-features` 3.40.0 and `@mdn/browser-compat-data` 8.1.3: all browser-support rows in §2.5.
- `@material/web` 2.5.0: `labs/gb/styles/motion/md-motion-tokens-easing.css` (M3 duration and easing tokens).
- `@gltf-transform/cli` 4.5.1 `optimize --help`.

**Primary: GitHub raw files**

- Carbon motion tokens: `carbon-design-system/carbon/main/packages/motion/src/dtcg/motion.json`, `surfaces.json`, `src/tokens.ts`
- Fluent 2 tokens: `microsoft/fluentui/master/packages/tokens/src/global/curves.ts`, `durations.ts`
- Material Android motion and springs: `material-components/material-components-android/master/docs/theming/Motion.md`
- Emil Kowalski, animation standards: `emilkowalski/skills/main/skills/review-animations/STANDARDS.md`, `skills/emil-design-eng/SKILL.md`
- Chartability workbook: `Chartability/POUR-CAF/main/README.md`
- FT Visual Vocabulary: `Financial-Times/chart-doctor/main/visual-vocabulary/README.md`
- WCAG Understanding: `w3c/wcag/main/understanding/21/animation-from-interactions.html`, `understanding/20/pause-stop-hide.html`
- uPlot README (`leeoniya/uPlot`); model-viewer README (`google/model-viewer`); Lenis README (`darkroomengineering/lenis`); R3F README (`pmndrs/react-three-fiber`)
- Khronos `glTF-Sample-Assets/.../DamagedHelmet/LICENSE.md` and `.glb`

**Primary: Apple**

- Apple Human Interface Guidelines, Motion: `developer.apple.com/tutorials/data/design/human-interface-guidelines/motion.json`

**Via web search** (direct fetch blocked; the claim is attributed where used)

- GSAP licence text excerpts ("Permitted Uses" and "Prohibited Uses"): [GSAP Standard License](https://gsap.com/community/standard-license/), [Webflow makes GSAP 100% free](https://webflow.com/updates/gsap-becomes-free)
- [Framer Motion is now independent, introducing Motion](https://motion.dev/blog/framer-motion-is-now-independent-introducing-motion) (Nov 2024)
- [Vercel acquires Tremor](https://vercel.com/blog/vercel-acquires-tremor) (2025-01-22)
- [anime.js GitHub](https://github.com/juliangarnier/anime) (v4, MIT)
- [Rive: New pricing](https://rive.app/blog/new-pricing), [Rive pricing docs](https://rive.app/docs/account-admin/pricing)
- [Spline pricing](https://spline.design/pricing), [Spline terms](https://spline.design/terms)
- [Highcharts EULA update](https://www.highcharts.com/blog/news/our-new-eula-makes-free-usage-clearer/), [Highcharts Standard License](https://shop.highcharts.com/license), [Highcharts accessibility module](https://www.highcharts.com/docs/accessibility/accessibility-module)
- [Shadertoy terms](https://www.shadertoy.com/terms)
- [Poly Haven license](https://polyhaven.com/license), [Kenney support](https://kenney.nl/support), [Sketchfab licenses](https://sketchfab.com/licenses)
- [Three.js WebGPURenderer manual](https://threejs.org/manual/en/webgpurenderer.html)
- [dotLottie-web (GitHub)](https://github.com/LottieFiles/dotlottie-web), [LottieFiles: dotlottie-web ships WebGL and WebGPU](https://lottiefiles.com/blog/working-with-lottie-animations/hardware-accelerated-lottie-on-the-web-dotlottie-web-now-ships-webgl-webgpu)
- [NN/g Scrolljacking 101](https://www.nngroup.com/articles/scrolljacking-101/), [Springer: scrolljacking usability study](https://link.springer.com/chapter/10.1007/978-3-032-16454-4_6)
- [Josh Comeau: A Friendly Introduction to Spring Physics](https://www.joshwcomeau.com/animation/a-friendly-introduction-to-spring-physics/), [Josh Comeau: Springs and Bounces in Native CSS](https://www.joshwcomeau.com/animation/linear-timing-function/)
- [Emil Kowalski: You Don't Need Animations](https://emilkowal.ski/ui/you-dont-need-animations), [7 Practical Animation Tips](https://emilkowal.ski/ui/7-practical-animation-tips)
- [Carbon Motion overview](https://carbondesignsystem.com/elements/motion/overview/)
- [M3: Adding Motion Physics](https://m3.material.io/blog/m3-expressive-motion-theming), [M3 easing and duration tokens](https://m3.material.io/styles/motion/easing-and-duration/tokens-specs)
- Val Head, [*Designing Interface Animation*](https://rosenfeldmedia.com/books/designing-interface-animation/); Rachel Nabors, [*Animation at Work*, excerpt "Patterns and Purpose"](https://alistapart.com/article/patterns-and-purpose/)
- Stephen Few, [Common Pitfalls in Dashboard Design](https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf); [Dashboard confusion revisited](http://perceptualedge.com/articles/visual_business_intelligence/dboard_confusion_revisited.pdf)
- Cleveland & McGill 1984, [*Graphical Perception* (PDF)](http://euclid.psych.yorku.ca/www/psy6135/papers/ClevelandMcGill1984.pdf)
- Datawrapper: [What to consider when choosing colors](https://www.datawrapper.de/blog/colors), [Customizing your line chart](https://www.datawrapper.de/academy/customizing-your-line-chart), [10 ways to use fewer colors](https://www.datawrapper.de/blog/10-ways-to-use-fewer-colors-in-your-data-visualizations)
- [shadcn/ui Chart (Recharts v3)](https://ui.shadcn.com/docs/components/base/chart)
- [web.dev: Optimize INP](https://web.dev/articles/optimize-inp)
- Okabe-Ito palette: [see::scale_color_okabeito](https://easystats.github.io/see/reference/scale_color_okabeito.html) (Okabe & Ito 2008)

**Could not verify** (blocked, not found, or out of scope):

- Exact current Rive and Spline plan prices.
- Motion+ pricing.
- Whether Highcharts' accessibility module is bundled in any v13 build (it ships as a separate module file, verified).
- `lygia` shader library licence.
- Current M3 Expressive "expressive" spring values for web (only Android's six standard springs verified).

---

## 8. Experiment log

All scripts are in `research/experiments/F-motion-lab/`. To reproduce: copy it to a scratch directory, `npm i` with the packages in `package.json`, then run the named script. Environment: Linux container, Node 22.22.2, esbuild 0.28.2, Playwright 1.56.1 with Chromium 141.0.7390.37 (headless), 2026-09-28.

### 8.1 Bundle sizes (`measure.mjs`, `measure2.mjs`)

**Method:** one entry file per typical import (`entries/*.js[x]`); `esbuild --bundle --minify --format=esm --platform=browser --target=es2020`; `process.env.NODE_ENV="production"`; `react`, `react-dom`, `react/jsx-runtime` external; CSS emptied; WASM not bundled (listed separately). Gzip level 9 and brotli quality 11 via Node zlib. KB = 1024 bytes. Entries contain real usage (so tree-shaking reflects a typical import), not just `import *`.

| Entry (what it imports) | Version | min KB | gzip KB | br KB |
| --- | --- | ---: | ---: | ---: |
| **Motion & animation** | | | | |
| `motion/mini` `animate` | motion 13.4.4 | 9.5 | **3.8** | 3.5 |
| `motion` `animate` | 13.4.4 | 54.0 | **19.9** | 18.1 |
| `motion` `animate`+`spring` | 13.4.4 | 54.0 | 19.9 | 18.2 |
| `motion` `animate`+`scroll`+`inView` | 13.4.4 | 60.9 | 22.5 | 20.5 |
| `motion/react` `motion`+`AnimatePresence` | 13.4.4 | 128.1 | **42.7** | 38.1 |
| `motion/react` `LazyMotion`+`domAnimation`+`m` | 13.4.4 | 77.6 | **27.5** | 25.0 |
| `motion/react` `LazyMotion`+`domMax` (layout, drag) | 13.4.4 | 124.3 | 41.1 | 36.8 |
| `motion/react-mini` `useAnimate` | 13.4.4 | 9.9 | 4.0 | 3.6 |
| `framer-motion` `motion`+`AnimatePresence` | 13.4.4 | 128.1 | 42.7 | 38.0 |
| `gsap` core | 3.15.0 | 69.0 | **27.0** | 24.4 |
| `gsap` + ScrollTrigger | 3.15.0 | 112.5 | **44.2** | 39.7 |
| `gsap` + ScrollTrigger + SplitText | 3.15.0 | 119.8 | 47.2 | 42.4 |
| `gsap` + Flip | 3.15.0 | 93.6 | 35.6 | 32.0 |
| `animejs` `waapi` | 4.5.0 | 10.8 | **4.7** | 4.3 |
| `animejs` `animate` | 4.5.0 | 31.6 | 12.5 | 11.3 |
| `animejs` animate+timeline+onScroll+stagger | 4.5.0 | 51.3 | 19.6 | 17.7 |
| `animejs` everything | 4.5.0 | 120.1 | 42.0 | 37.1 |
| `@formkit/auto-animate` | 0.10.0 | 7.7 | 3.1 | 2.7 |
| `@react-spring/web` `useSpring`+`animated` | 10.1.2 | 41.8 | 17.0 | 15.3 |
| `lenis` | 1.3.26 | 19.0 | 5.5 | 4.9 |
| `@theatre/core` | 0.7.2 | 104.9 | 34.5 | 30.3 |
| `lottie-web` (full) | 5.13.0 | 301.7 | **77.1** | 64.4 |
| `lottie-web` `lottie_light` | 5.13.0 | 168.2 | 48.0 | 41.5 |
| `@lottiefiles/dotlottie-web` (JS only) | 0.80.0 | 60.2 | 13.5 | 12.0 |
| └ `dotlottie-player.wasm` (canvas / webgl / webgpu builds) | 0.80.0 | 1,209 / 1,334 / 1,366 raw | **485** / 529 / 535 | 379 / 412 / 415 |
| `@rive-app/canvas` (JS only) | 2.43.1 | 195.9 | 56.0 | 49.1 |
| └ `rive.wasm` | 2.43.1 | 1,909 raw | **787** | 613 |
| **3D** | | | | |
| `three` everything | 0.186.1 | 725.5 | **186.0** | 151.5 |
| `three` basic scene (named imports) | 0.186.1 | 521.3 | 130.6 | 107.6 |
| `three` + GLTFLoader + DRACOLoader + OrbitControls | 0.186.1 | 627.7 | 159.1 | 131.3 |
| `three/webgpu` everything | 0.186.1 | 1,057.3 | 291.1 | 233.6 |
| └ Draco decoder (glTF build) wasm + wrapper | three 0.186.1 | 188 + 57 raw | 61.8 + 11.3 | 47.6 + 9.8 |
| └ Meshopt decoder | three 0.186.1 | 25.9 | **7.1** | 6.3 |
| └ Basis/KTX2 transcoder wasm | three 0.186.1 | 515 raw | 239.7 | 198.8 |
| `@react-three/fiber` `Canvas` | 9.8.1 | 903.6 | 242.8 | 200.7 |
| R3F + drei `useGLTF`+`OrbitControls`+`Environment` | 9.8.1 / 10.7.9 | 1,043.5 | 286.9 | 236.8 |
| `ogl` basic mesh | 1.0.11 | 47.6 | 13.8 | 11.6 |
| `@babylonjs/core` root barrel | 9.28.0 | 7,013.4 | **1,549.6** | 1,109.1 |
| `@babylonjs/core` deep imports | 9.28.0 | 1,060.1 | 259.3 | 208.0 |
| `@google/model-viewer` | 4.3.1 | 1,047.9 | **297.0** | 243.2 |
| `@splinetool/runtime` | 2.0.59 | 3,945.5 | **1,061.5** | 834.0 |
| **Charts** (React external; React + ReactDOM 19.3.0 = 217.4 min / **67.3 gz** / 57.9 br) | | | | |
| `uplot` | 1.6.32 | 50.9 | **22.7** | 20.4 |
| `chart.js/auto` | 4.5.1 | 200.2 | 69.1 | 59.8 |
| `chart.js` tree-shaken line | 4.5.1 | 151.4 | 53.2 | 46.7 |
| `d3` line-chart subset | 7.9.0 | 72.0 | 24.0 | 21.0 |
| `d3` everything | 7.9.0 | 298.3 | 100.9 | 81.3 |
| `@observablehq/plot` | 0.6.17 | 282.5 | 95.4 | 78.1 |
| `@visx/shape`+`scale`+`axis` | 4.x | 62.8 | 22.6 | 20.0 |
| `@visx/xychart` | 4.0.0 | 173.5 | 60.9 | 52.7 |
| `@unovis/ts` XY line | 1.7.0 | 179.0 | 59.2 | 51.6 |
| `victory` line | 37.3.6 | 256.1 | 80.3 | 69.1 |
| `@nivo/line` `ResponsiveLine` | 0.99.0 | 269.8 | 94.4 | 79.9 |
| `recharts` line chart | 3.10.1 | 366.7 | **107.8** | 90.2 |
| `highcharts` core | 13.1.1 | 274.7 | 102.2 | 89.2 |
| `highcharts` + accessibility module | 13.1.1 | 411.6 | 142.3 | 122.4 |
| `echarts/core` line + grid + tooltip + Canvas | 6.1.0 | 490.6 | **167.3** | 142.6 |
| `echarts/core` line + grid + tooltip + aria + SVG | 6.1.0 | 500.8 | 172.0 | 146.5 |
| `echarts` full | 6.1.0 | 1,107.7 | **371.5** | 302.2 |
| `@tremor/react` `AreaChart` | 3.18.7 | 846.1 | 234.3 | 193.5 |
| `apexcharts` | 7.6.1 | 942.3 | 275.7 | 221.4 |
| `vega-embed` (+vega, vega-lite) | 7.3.0 / 6.4.0 / 6.4.3 | 859.6 | 296.6 | 243.6 |
| `ag-charts-community` (all, or only line modules registered) | 14.2.0 | 1,319.5 | **397.4** | 318.0 |

### 8.2 Parse + evaluate cost (`build-eval.mjs`, `evalcost.cjs`)

**Method:** import-only entries (`eval-entries/`, no side effects beyond assigning exports to `window`), bundled self-contained with React inlined where noted. Each run uses a fresh browser context, `Emulation.setCPUThrottlingRate(4)`, then `performance.now()` around `await import(url)` from localhost (includes a negligible local fetch). Median of 7. Noise is roughly ±10–20%, so read these as bands.

| Bundle | ms |
| --- | ---: |
| motion/mini | 11 |
| lenis | 11 |
| animejs animate | 14 |
| dotlottie-web JS (WASM not loaded) | 14 |
| ogl | 17 |
| motion animate+scroll+inView | 18 |
| d3 subset | 23 |
| chart.js/auto | 37 |
| gsap + ScrollTrigger | 44 |
| apexcharts | 45 |
| gsap core | 48 |
| lottie-web light | 54 |
| three everything | 67 |
| uplot | 68 |
| three + loaders + controls | 70 |
| lottie-web full | 75 |
| echarts core line | 87 |
| observable plot | 96 |
| model-viewer | 134 |
| vega-embed | 134 |
| **react + react-dom (baseline)** | **146** |
| motion/react + React | 184 |
| echarts full | 196 |
| highcharts | 217 |
| visx xychart + React | 233 |
| nivo line + React | 256 |
| recharts + React | 297 |
| r3f + React | 341 |
| spline runtime | 352 |
| tremor + React | 451 |
| ag-charts-community | 529 |

### 8.3 Chart first-render time vs data size (`chartbench.jsx`, `runbench.cjs`)

**Method:**

- One random-walk line series of n points in an 800×400 container.
- Library bundles pre-loaded; timing starts at chart construction and ends after the next frame (rAF + setTimeout 0).
- Recharts measured with `flushSync` plus two frames.
- Animations disabled in all libraries.
- 4× CPU throttle, fresh context per run, median of 3.

| Library / mode | 1,000 | 10,000 | 100,000 |
| --- | ---: | ---: | ---: |
| uPlot | 82 ms | 97 ms | **110 ms** |
| Chart.js (default: category labels, parsing on) | 191 | 517 | **4,056** |
| Chart.js (`parsing:false`, linear x, LTTB decimation to 800 samples) | 141 | 166 | 159 |
| ECharts canvas | 263 | 381 | 1,190 |
| ECharts canvas + `sampling:'lttb'` | 224 | 291 | 571 |
| ECharts SVG | 207 | 265 | 573 |
| Observable Plot (SVG) | 93 | 137 | 524 |
| D3, single SVG path + axes | 49 | 81 | 389 |
| Recharts (SVG, React) | 415 | 606 | **3,216** |

**Reading:**

- For ≤ 1k points, everything is fine and SVG is simplest (and accessible).
- At 10k, Recharts and default Chart.js start to hurt INP-sized budgets.
- At 100k, only uPlot, decimated Chart.js and down-sampled ECharts stay interactive.
- One d3 `<path>` is cheap. Per-point SVG elements are what cost.

### 8.4 Reduced motion and View Transitions (`vt.cjs`, `vt3.cjs`)

**Method:** Chromium 141, `page.emulateMedia({ reducedMotion })`; call `document.startViewTransition()` that changes a named element's width; list `document.getAnimations()` whose `pseudoElement` starts with `::view-transition`.

| `prefers-reduced-motion` | Author CSS | VT animations running |
| --- | --- | --- |
| no-preference | none | 10 (group, old and new for root and box; 250 ms each) |
| **reduce** | **none** | **10, not skipped** |
| reduce | `::view-transition-group(*), -old(*), -new(*) { animation: none }` | 0 (instant swap) |
| reduce | `::view-transition-group(*) { animation-duration: 0s }` | 10 at **0 ms**: old and new inherit duration, so the **crossfade is lost too** |
| reduce | `::view-transition-group(*) { animation-name: none }` | **8: crossfades at 250 ms kept, movement and resize removed** (recommended) |

### 8.5 LCP with a WebGL canvas (`lcp2.cjs`)

**Method:** Chromium 141 with SwiftShader WebGL2 (context created and cleared red in every case); `PerformanceObserver` for `largest-contentful-paint`, buffered; 1280×800 viewport; 1200×700 canvas.

| Page | LCP entries |
| --- | --- |
| Canvas only, no text | **none** |
| Canvas + short `<h1>` | `H1` (size 7,452) |
| `<h1>` + detailed poster `<img>` under the canvas | `IMG` (size 840,000) |

A first attempt with a solid-colour SVG poster produced no IMG entry, which is consistent with Chrome ignoring low-entropy images. So a poster must be a real image.

### 8.6 Scroll-driven reveal range (`sda.cjs`)

**Method:** the last `.reveal` card sits just above a 40 px footer at the page end; scroll to the maximum; read computed opacity.

| `animation-range` | no-preference | reduce |
| --- | --- | --- |
| `entry 0% cover 30%` | **0.65 (stuck partly faded)** | 1.00 |
| `entry 0% entry 100%` | 1.00 | 1.00 |

### 8.7 glTF compression (DamagedHelmet.glb, Khronos; `@gltf-transform/cli` 4.5.1)

See §3.4. Original 3,685 KB. Meshopt only: 3,316 KB. Meshopt + WebP 2048: 1,409 KB. Meshopt + WebP 1024: 532 KB (494 gz). Draco + WebP 1024: 432 KB (427 gz). With decoders counted, the transfer is equal (≈ 500 KB).

### 8.8 Springs (`springs.mjs`)

Analytic damped oscillator (mass 1, x from 0 to 1, v₀ = 0). Settle is |1 − x| < 0.1%.

| Spring | Settles in | Overshoot |
| --- | --- | --- |
| M3 fast spatial (k 1400, ζ 0.9) | 224 ms | 0.2% |
| M3 default spatial (700, 0.9) | 317 ms | 0.2% |
| M3 slow spatial (300, 0.9) | 484 ms | 0.2% |
| M3 fast effects (3800, 1) | 150 ms | 0 |
| M3 default effects (1600, 1) | 231 ms | 0 |
| Expressive (340, 0.7) | 558 ms | 4.6% |
| Playful (300, 0.5) | 734 ms | 16.3% |

`linear()` strings with 21 samples are in §2.4. Motion damping = 2ζ√k.

### 8.9 Browser support queries (`wf.mjs`, `bcd.mjs`, `bcd2.mjs`)

These print Baseline status and per-browser versions from `web-features` 3.40.0 and BCD 8.1.3. Their output is the source of §2.5.
