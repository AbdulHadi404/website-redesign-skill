# Motion, interaction and 3D

Read in Phase 3 (the motion language) and Phase 5 (building it). Motion is the easiest thing to add and the easiest to get wrong: it costs performance, it can hide content, it harms people with vestibular disorders, and on frequent actions it turns speed into waiting. Evidence and measurements: `research/streams/F-…` (Chromium 141, 4× CPU throttle, 2026-09-28).

## 1. What motion is for

Every animation names exactly one job; "it looks nice" is not a job on anything seen more than once.

| Job | Product example | Marketing example |
| --- | --- | --- |
| Orientation / spatial continuity | a row expands into a detail panel; a drawer slides from its edge | a page transition that keeps the nav still |
| Feedback | press `scale(.97)`, toggle knob, drag lift | form submit state |
| State change | cart count ticks; item added | pricing toggle monthly/annual |
| Causality | a filter narrows the list; remaining items move into place | before/after slider |
| Attention | a validation nudge; a new-item dot | rarely justified — moving things read as ads |
| Explanation | onboarding demonstration; empty-state loop | a product demo that shows the mechanism as it is described |
| Brand expression | almost never in productive UI | a hero entrance; one signature transition |

## 2. Should this move?

Run each candidate through these gates in order; the first "no" ends it.

1. **Purpose** — name its job (above).
2. **Frequency** (Emil Kowalski's rule; Apple: "avoid adding motion to UI interactions that occur frequently"):
   - 100+ times a day, or **keyboard-initiated** (shortcuts, command palette, tab switching, list navigation) → **no animation**, instant;
   - tens of times a day (hover, selection, sort, expanding a row in a table you live in) → remove, or ≤ 150 ms opacity/colour only;
   - occasional (modal, drawer, toast, popover, page change) → productive motion;
   - rare or first-time (onboarding, success after a long task, a marketing hero) → expressive allowed.
3. **Register** — productive surface or expressive moment (`framing.md`); take tokens from that column.
4. **Never block** — input is accepted while it runs; transitions are interruptible (CSS transitions and springs retarget; keyframes restart from zero); content is visible by default (§5).
5. **Cost** — animate `transform` and `opacity` (and sparingly `filter`, `clip-path`); nothing that re-lays-out many elements; no work in scroll handlers; a library only if CSS or the Web Animations API cannot do it.
6. **Reduced motion** — the substitute is defined before shipping (§6).
7. **Vestibular and attention** — large-area movement, zoom, spin, parallax, scroll-linked movement, or anything auto-playing for more than 5 s needs a pause control (WCAG 2.2.2, A) or goes under reduced motion; never three flashes a second (2.3.1).

Write one line per animation into `DESIGN.md`: `trigger · job · properties · duration token · easing token · reduced-motion substitute` — e.g. `row click · orientation · transform, opacity · --dur-medium · --ease-out · crossfade 150 ms`.

## 3. Productive and expressive

IBM Carbon's split, the most useful single idea for broadening a marketing-trained eye: **productive** motion is efficient, subtle and out of the way — for task-focused moments; **expressive** motion is visible and enthusiastic — for occasional, significant moments.

| Surface | Default | Expressive allowed |
| --- | --- | --- |
| App / SaaS / admin | productive everywhere | first-run onboarding; success after a long task; an empty-state illustration |
| Dashboard | productive, minimal; value transitions ≤ 250 ms on update | nowhere |
| Ecommerce | productive for browse, filter, cart, checkout | product gallery; add-to-cart confirmation; campaign pages |
| Marketing / brand | productive for controls (nav, forms, tabs, accordions) | hero entrance; safe section reveals; one signature page transition |
| Docs / content | productive; almost nothing | nowhere |

## 4. Tokens

Reconciled from Material 3, Carbon, Fluent 2, Kowalski and NN/g:

```css
:root {
  /* productive */
  --dur-0: 0ms;          /* keyboard-initiated or 100+/day */
  --dur-micro: 100ms;    /* press, toggle, checkbox, colour hover */
  --dur-small: 150ms;    /* tooltip, dropdown, menu, small expand */
  --dur-medium: 240ms;   /* popover, toast, panel, drawer, row expand */
  --dur-large: 300ms;    /* modal, sheet — the productive ceiling */
  /* expressive — rare moments only */
  --dur-page: 400ms;     /* page or view transition, large container transform */
  --dur-hero: 700ms;     /* one-off marketing entrance; never in apps */
  --stagger: 40ms;       /* 30–80 ms between siblings; total ≤ 300 ms; never blocks input */

  --ease-out: cubic-bezier(0.2, 0, 0, 1);             /* default: entrances and on-screen moves */
  --ease-in-out: cubic-bezier(0.4, 0.14, 0.3, 1);     /* A → B while visible */
  --ease-exit: cubic-bezier(0.3, 0, 1, 1);            /* exits only, ≤ 200 ms, nobody waiting */
  --ease-emphasized: cubic-bezier(0.05, 0.7, 0.1, 1); /* expressive entrance */

  /* springs as linear(), from M3's spring parameters */
  --spring-productive: linear(0, 0.068, 0.214, 0.378, 0.531, 0.66, 0.762, 0.839, 0.894, 0.934, 0.96, 0.977, 0.988, 0.995, 0.998, 1, 1.001, 1.002, 1.001, 1.001, 1); /* 320ms, ~0.2% overshoot */
  --spring-expressive: linear(0, 0.103, 0.319, 0.55, 0.745, 0.887, 0.977, 1.025, 1.044, 1.045, 1.037, 1.026, 1.016, 1.008, 1.003, 1, 0.998, 0.998, 0.998, 0.999, 1); /* 560ms, ~4.6% overshoot — marketing only, spatial properties only */
}
@media (prefers-reduced-motion: reduce) {
  :root { --dur-page: 150ms; --dur-hero: 0ms; --stagger: 0ms; --spring-expressive: var(--ease-out); }
}
```

Rules: entrances decelerate; **never `ease-in` on anything the user is waiting to see** (an exit may accelerate only when short and nobody waits on it — otherwise exit with the ease-out at ~70% of the entrance duration); never linear for movement (only for progress and scrubbed timelines); never enter from `scale(0)` — start at 0.9–0.97 with opacity 0; popovers scale from their trigger, modals from the centre; opacity and colour never bounce; bounce 0.1–0.3 only for gesture-driven or playful motion; hover motion only under `@media (hover: hover) and (pointer: fine)` (touch fires false hovers); never `transition: all`; switching theme triggers no transitions. For JS springs: Motion `{ type: "spring", stiffness: 700, damping: 47.6 }` (productive) or `{ stiffness: 340, damping: 25.8 }` (expressive). Springs keep velocity when interrupted — use them for drag and anything reversible mid-flight.

## 5. Techniques (support checked 2026-09-28)

- **CSS transitions** — the default for UI state (interruptible). **Keyframes** — loops and one-shots; avoid for rapidly re-triggered UI.
- **`@starting-style` + `transition-behavior: allow-discrete`** (Baseline 2024) — dialogs, popovers and toasts animate in *and out* of `display: none` with no JavaScript:

```css
dialog, [popover] {
  opacity: 1; transform: none;
  transition: opacity var(--dur-medium) var(--ease-out), transform var(--dur-medium) var(--ease-out),
              display var(--dur-medium) allow-discrete, overlay var(--dur-medium) allow-discrete;
}
dialog:not([open]), [popover]:not(:popover-open) { opacity: 0; transform: scale(.97); }
@starting-style { dialog[open], [popover]:popover-open { opacity: 0; transform: scale(.97); } }
```

- **View Transitions** — same-document is Baseline (2025-10); cross-document (`@view-transition { navigation: auto }`) works in Chromium and Safari and falls back to a normal navigation in Firefox, which is harmless. They are **not** skipped under reduced motion; guard them — and do not use `animation-duration: 0s`, which also kills the crossfade (verified):

```css
@media (prefers-reduced-motion: reduce) { ::view-transition-group(*) { animation-name: none; } }
```

- **Scroll-driven animations** (`animation-timeline: view()`) — not Baseline (no Firefox); progressive enhancement only, inside `@supports`. A reveal's range must **end at `entry 100%`**: a range ending at a `cover` percentage left the last card on a page stuck at 0.65 opacity at maximum scroll (verified).

```css
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .reveal { animation: reveal linear both; animation-timeline: view(); animation-range: entry 0% entry 100%; }
  }
}
@keyframes reveal { from { opacity: 0; transform: translateY(16px); } }
```

  This is the preferred reveal where supported — no JavaScript, and content is finished without it. The JS fallback is in `implementation.md` ("The reveal, written safely"). Never on a photograph.
- **FLIP / shared layout** — View Transitions for route changes (a matching `view-transition-name`); Motion's `layout`/`layoutId` for in-component reflow on a few elements (it measures layout — never on a 500-row table).
- **Accordions** — `grid-template-rows: 0fr → 1fr` or `::details-content` (Baseline 2025); `interpolate-size` is Chromium-only.
- **Gestures** — every drag has a single-pointer alternative (WCAG 2.5.7): reorder → up/down buttons or "Move to…"; swipe-to-delete → a visible delete button; carousel swipe → arrow buttons; slider → click on the track and arrow keys.
- **Loading** — optimistic updates with a specific revert message; skeletons static under reduced motion; show nothing for waits under ~300 ms; spinners inside the pressed control.
- **Scroll-jacking** — never in apps, docs, dashboards or checkout (NN/g found most people disoriented). `scroll-behavior: smooth` for anchor jumps, off under reduced motion. If a marketing site insists on smooth wheel scrolling, Lenis (MIT, 5.5 KB) runs on native scroll and switches itself off under reduced motion — but it breaks CSS scroll-snap and stops over iframes.

## 6. Reduced motion — substitute, don't delete

Reduced motion means fewer and gentler animations, not zero, and never missing content.

| Motion | Under `prefers-reduced-motion: reduce` |
| --- | --- |
| Slide, zoom or morph transitions | crossfade ≤ 150 ms, or instant |
| Parallax, scroll-linked movement, smooth scroll | off |
| Scroll reveals | content simply present |
| Hover lift, scale, tilt | colour, shadow or outline only |
| Spring overshoot | none; short ease-out |
| Autoplaying 3D, Lottie/Rive loops, background video, auto-advancing carousels | paused on a meaningful first frame, with a play control |
| Number counters, chart build animations | final value immediately |
| Skeleton shimmer | static skeleton |
| Spinners and progress | keep (essential); prefer determinate bars |
| Press state, focus ring, toggle knob, drag feedback | keep |

Library defaults (read from their source): **Motion for React defaults to `reducedMotion: "never"`** — wrap the app in `<MotionConfig reducedMotion="user">`; GSAP and anime.js do nothing — use `gsap.matchMedia()` / `matchMedia`; AutoAnimate, Lenis and Recharts 3 respect it automatically; Chart.js and ECharts ignore it and animate for 1000 ms — set `animation: false` under reduce (and consider always, on dashboards). `audit.mjs` renders under reduced motion and fails any content that disappears.

## 7. Performance

- `transform` and `opacity` can run on the compositor and keep playing while JavaScript is busy. Motion hardware-accelerates only `opacity`, `clipPath`, `filter`, `transform` and colours — its `x`/`y`/`scale` shorthands run on the main thread; animate the `transform` string when smoothness under load matters.
- `will-change` just before an animation and removed after; never blanket-wide.
- No scroll handlers doing work: IntersectionObserver, scroll-driven CSS, `scrollend`, passive listeners.
- Library cost competes with input (INP): parse + evaluate at 4× throttle — `motion/mini` 11 ms, Motion `animate` 18 ms, GSAP core ~45 ms, three.js 67 ms, React + ReactDOM 146 ms, Spline 352 ms.
- Don't drive many children from one CSS variable; set `transform` on the element itself.

## 8. Libraries (sizes min+gzip, measured)

| Need | Choose | Size | Licence |
| --- | --- | --- | --- |
| Most UI state changes, dialogs, popovers, page transitions | CSS + Web Animations API | 0 KB | — |
| Vanilla one-offs with nicer syntax | `motion/mini` `animate` · anime.js `waapi` | 3.8 KB · 4.7 KB | MIT |
| List add/remove/reorder in any framework | AutoAnimate | 3.1 KB | MIT |
| React exit animations, shared layout, drag with springs | Motion (`LazyMotion` + `domAnimation`) | 27.5 KB (full 42.7) | MIT |
| Marketing timelines, scroll-scrubbed storytelling, SVG morphing | GSAP core (+ ScrollTrigger) | 27.0 KB (44.2) | free "no charge" licence incl. commercial and all plugins since 3.13 (2025-04); not OSI; barred in no-code tools competing with Webflow |
| Designer-authored vector animation | dotLottie (13.5 KB JS + **485 KB WASM**) or lottie-web (77 KB) | — | MIT; self-host the WASM (defaults to jsDelivr) |
| Interactive, state-machine vector animation | Rive (56 KB JS + **787 KB WASM**) | — | runtime MIT; exporting needs a paid editor plan |

A 485–787 KB runtime for one decorative loop is never worth it. Theatre.js studio is AGPL and unmaintained since 2024-05. `resources/libraries.md` has the rest.

## 9. 3D and advanced visuals

**3D earns its place** when the user needs to see an object from more than one angle or change it — an ecommerce product viewer (with AR "view in your room"), a configurator, spatial data (buildings, terrain, anatomy, molecules), a hardware product as the hero object used once. **3D is decoration** when it is spinning blobs, particle fields, wireframe globes, a rotating logo, a 3D chart (perspective distorts length), a perpetual background shader, or a scroll-scrubbed camera flight on an app page. If a photograph, a short video or an image sequence answers the question, use that.

Gates: is there a real asset (a low-poly placeholder is worse than photographs)? Can the page afford it (runtime and model load after the page is usable)? Is every fact shown in 3D also in text?

| Tool | Size | Use for |
| --- | --- | --- |
| `<model-viewer>` (Apache-2.0) | 297 KB incl. three | product viewer and AR with no 3D code: `poster`, `loading="lazy"`, `reveal="manual"`, `camera-controls`, `alt`, `ar` |
| three.js (MIT) | 131 KB basic scene (tree-shakes poorly) | custom scenes, configurators |
| React Three Fiber + drei (MIT) | 243 KB + React | declarative scenes in React apps |
| OGL (Unlicense) | 13.8 KB | one shader plane or a light effect |
| Babylon.js (Apache-2.0) | 259 KB with deep imports — **1,550 KB from the root barrel** | game-like scenes, physics |
| Spline runtime (proprietary, no licence field) | 1,062 KB, 352 ms evaluate | prototypes only |

Checklist for any 3D on a page:

- [ ] **Poster first** — a real render in the same framing, sized, eager if above the fold. A WebGL canvas never becomes the LCP element; the poster does (verified), and a flat single-colour poster is ignored — optimise the poster.
- [ ] **Load late** — `loading="lazy"` or tap-to-load; `import()` on IntersectionObserver or first interaction; never in the critical path.
- [ ] **Render only when needed** — `frameloop="demand"`; pause offscreen and on `visibilitychange`; cap device pixel ratio at 2.
- [ ] **Reduced motion** — no auto-rotate, fly-ins or tilt; a static, well-lit frame with working controls.
- [ ] **Don't trap scrolling** — `<model-viewer>` defaults to `touch-action="none"`, which swallows vertical scrolling on phones: set `touch-action="pan-y"`; no wheel-zoom without a modifier.
- [ ] **Accessibility** — `alt` on model-viewer, or `role="img"` + `aria-label` on a canvas; rotate and zoom buttons (WCAG 2.5.7) and keyboard support.
- [ ] **Failure path** — if WebGL fails, keep the poster and hide the controls.
- [ ] **Self-host decoders and WASM** (model-viewer defaults to gstatic; dotLottie and Rive to jsDelivr/unpkg).
- [ ] **Assets** — glTF binary through `@gltf-transform/cli`; textures dominate the weight (a 3.7 MB model fell to 532 KB mostly by resizing textures to 1024 and converting to WebP; geometry compression alone saved 10%); Meshopt by default (7 KB decoder vs Draco's 73 KB). Budget: ≤ ~1.5 MB GLB for a product model, textures ≤ 2048² (1024² on mobile).
- [ ] **Licences** — Poly Haven and Kenney are CC0; Sketchfab is per model (BY needs credit, NC and Editorial forbid commercial use); Khronos sample models are mixed (DamagedHelmet includes CC BY-NC); **Shadertoy code is CC BY-NC-SA by default** — never paste it into a commercial site.
