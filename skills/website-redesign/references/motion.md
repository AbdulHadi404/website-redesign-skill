# Motion, interaction and 3D

Read in Phase 3 (the motion language) and Phase 5 (building it). Motion is the easiest thing to add and the easiest to get wrong: it costs performance, it can hide content, it harms people with vestibular disorders, and on frequent actions it turns speed into waiting. Evidence and measurements: `research/streams/F-…` (Chromium 141, 4× CPU throttle, 2026-09-28).

## 1. What motion is for

Every animation names exactly one job; "it looks nice" is not a job on anything seen more than once.

| Job | Product example | Marketing example |
| --- | --- | --- |
| Orientation / spatial continuity | a detail panel opens beside the record it shows; a drawer slides from its edge | a page transition that keeps the nav still |
| Feedback | press `scale(.97)`, toggle knob, drag lift; a validation nudge | form submit state |
| State change | cart count ticks; item added | pricing toggle monthly/annual |
| Causality | a filter narrows the list; remaining items move into place | before/after slider |
| Attention | live state only (§6): a new-item dot | rarely justified — moving things read as ads |
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
7. **Vestibular and attention** — anything that would move or auto-update for more than 5 s stops within 5 s or gets a pause control placed before it (WCAG 2.2.2, A) — and reduced motion is respected on top of that, never instead: large-area movement, zoom, spin, parallax and scroll-linked movement are off or crossfaded under reduce (§6); never three flashes a second (2.3.1).

### The motion spec

Approved motion is lost between the plan and the build when it is prose. Every promised animation is a row in `DESIGN.md`, in a table `motion.mjs` reads (or a fenced `motion-spec` JSON block with the same fields); "subtle", "smooth" or "delightful" never stand without a row.

| id | trigger | on | target | properties | duration | easing | reduced |
| --- | --- | --- | --- | --- | --- | --- | --- |
| drawer-open | click | #menu-button | #drawer | transform, opacity | medium | out | fade |
| card-press | press | .plan-card button | .plan-card button | transform | micro | out | keep |
| section-reveal | scroll | .proof | .proof | opacity, transform | — | — | static |

`trigger` is hover, focus, press, click, scroll, load or `key:<Key>`; `on` and `target` are selectors that exist in the build; `duration` is a token name, milliseconds or a range; `reduced` is keep (essential feedback), fade, instant, static (already final) or pause (a loop that must not run). Optional columns: `stagger` and `interrupt` (re-trigger mid-flight, in ms, and check it continues). Steps that must run first (`"setup": [{ "click": "#menu" }]`) need the JSON form: a table cell cannot carry them.

**One spec per page and device.** `motion.mjs` runs every row against the one URL and device it is given, and a row whose target is not on that page fails. Keep the `DESIGN.md` table for the key page, and give every other page (and a phone-only move) its own JSON file with the same fields (`motion/pricing.json`). **Gate**, before Phase 5 is done: `node scripts/motion.mjs <url> --spec <that page's spec> [--device phone] --jpeg` for each — every row passes on its own page and device, or the row changes with a written reason. Attach the filmstrips to the critique.

## 3. Productive and expressive

IBM Carbon's split, the most useful single idea for broadening a marketing-trained eye: **productive** motion is efficient, subtle and out of the way — for task-focused moments; **expressive** motion is visible and enthusiastic — for occasional, significant moments.

| Surface | Default | Expressive allowed |
| --- | --- | --- |
| App / SaaS / admin | productive everywhere; nothing moves for attention except live state (§6) | first-run onboarding; success after a long task; an empty-state illustration |
| Dashboard | productive, minimal; value transitions ≤ 250 ms on update | nowhere |
| Ecommerce | productive for browse, filter, cart, checkout | product gallery; add-to-cart confirmation; campaign pages |
| Marketing / brand | productive for controls (nav, forms, tabs, accordions) | hero entrance; a reveal where it explains (written safely, §5); one signature page transition |
| Docs / content | productive; almost nothing | nowhere |

## 4. Tokens

Reconciled from Material 3, Carbon, Fluent 2, Kowalski and NN/g:

```css
:root {
  /* productive */
  --dur-0: 0ms;          /* keyboard-initiated or 100+/day */
  --dur-micro: 100ms;    /* press, toggle, checkbox, colour hover */
  --dur-small: 150ms;    /* tooltip, dropdown, menu, small expand */
  --dur-medium: 240ms;   /* popover, toast, panel, drawer */
  --dur-large: 300ms;    /* modal, sheet — the productive ceiling */
  /* expressive — rare moments only */
  --dur-page: 400ms;     /* page or view transition, large container transform */
  --dur-hero: 700ms;     /* one-off marketing entrance; never in apps */
  --stagger: 40ms;       /* 30–80 ms between siblings; total ≤ 300 ms; never blocks input */
  --delay: 0ms;          /* entrance or settle delay (a check mark after its ring); raised only under no-preference, below */

  --ease-out: cubic-bezier(0.2, 0, 0, 1);             /* default: entrances and on-screen moves */
  --ease-in-out: cubic-bezier(0.4, 0.14, 0.3, 1);     /* A → B while visible */
  --ease-exit: cubic-bezier(0.3, 0, 1, 1);            /* exits only, ≤ 200 ms, nobody waiting */
  --ease-emphasized: cubic-bezier(0.05, 0.7, 0.1, 1); /* expressive entrance */

  /* springs as linear(), from M3's spring parameters */
  --spring-productive: linear(0, 0.068, 0.214, 0.378, 0.531, 0.66, 0.762, 0.839, 0.894, 0.934, 0.96, 0.977, 0.988, 0.995, 0.998, 1, 1.001, 1.002, 1.001, 1.001, 1); /* 320ms, ~0.2% overshoot */
  --spring-expressive: linear(0, 0.103, 0.319, 0.55, 0.745, 0.887, 0.977, 1.025, 1.044, 1.045, 1.037, 1.026, 1.016, 1.008, 1.003, 1, 0.998, 0.998, 0.998, 0.999, 1); /* 560ms, ~4.6% overshoot — marketing only, spatial properties only */
}
@media (prefers-reduced-motion: reduce) {
  :root { --dur-page: 150ms; --dur-hero: 0ms; --stagger: 0ms; --delay: 0ms; --spring-expressive: var(--ease-out); }
}
```

Under reduce every delay is zero — `transition-delay`, `animation-delay`, stagger and delay tokens — so a settled state (a check mark after a click) arrives immediately; the substitutes (crossfades ≤ 150 ms, §6) keep running. Write every delay through `--stagger` or `--delay`, and raise `--delay` only inside `@media (prefers-reduced-motion: no-preference)`: a value set on a component outside it escapes this block. When only durations were reduced, a check mark still arrived 250 ms after the click (`lessons.md` 2026-09-28, CleoHR website).

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

- **View Transitions** — same-document is Baseline (2025-10), and React exposes it as `<ViewTransition>` (React 19.3+/Next 16 in the Cake Junction build, 2026-09-28; re-verify the version before relying on it); cross-document (`@view-transition { navigation: auto }`) works in Chromium and Safari and falls back to a normal navigation in Firefox, which is harmless. They **swallow input** for their whole duration (clicks go to the root), so keep them ≤ 400 ms and use them for route changes, not for swaps people repeat quickly (use transitions there). They are **not** skipped under reduced motion; guard them — and do not use `animation-duration: 0s`, which also kills the crossfade (verified):

```css
@media (prefers-reduced-motion: reduce) { ::view-transition-group(*) { animation-name: none; } }
```

  A shared-element morph animates size on the main thread, so do not start a 3D engine or any other heavy boot during it: engine start-up stretched a 0.56 s morph to 3.8 s. Mount it when the transition finishes, and give both sides the same image file, warmed on hover, focus or touch, so the morph lands on a decoded image (`interactive.md` §8).

- **Scroll-driven animations** (`animation-timeline: view()` or `scroll()`) — not Baseline (no Firefox); progressive enhancement only, inside `@supports`. A reveal's range must **end at `entry 100%`**: a range ending at a `cover` percentage left the last card on a page stuck at 0.65 opacity at maximum scroll (verified).

```css
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .reveal { animation: reveal linear both; animation-timeline: view(); animation-range: entry 0% entry 100%; }
  }
}
@keyframes reveal { from { opacity: 0; transform: translateY(16px); } }
```

  This is the preferred reveal where supported — no JavaScript, and content is finished without it. The JS fallback is in `implementation.md` ("The reveal, written safely"). Never on a photograph.

  Scroll storytelling (a sequence the scroll plays) is mapped to scroll position and reversible, pinned with `position: sticky` for at most ~2.5 screens, with the finished state as the fallback and as the reduced-motion state. The essential object is visible before the scroll starts.
- **FLIP / shared layout** — View Transitions for route changes (a matching `view-transition-name`); Motion's `layout`/`layoutId` for in-component reflow on a few elements (it measures layout — never on a 500-row table).
- **Accordions** — `grid-template-rows: 0fr → 1fr` or `::details-content` (Baseline 2025); `interpolate-size` is Chromium-only.
- **Gestures** — every drag has a single-pointer alternative (WCAG 2.5.7): reorder → up/down buttons or "Move to…"; swipe-to-delete → a visible delete button; carousel swipe → arrow buttons; slider → click on the track and arrow keys.
- **Loading** — optimistic updates with a specific revert message; skeletons static under reduced motion. A container shows nothing for the first second, then a skeleton or an indeterminate indicator; an action's spinner sits inside the pressed control, appears after a 150–300 ms delay and stays at least 300–500 ms once shown (`app-ui.md` §8).
- **Scroll-jacking and smooth-scroll libraries** — never site-wide; never in apps, docs, dashboards, checkout or content pages (NN/g found most people disoriented); never on a site that frames a signature product experience — its motion budget goes to the stage and the hand-over (`interactive.md` §3). Elsewhere, only inside a contained, skippable story (`anti-patterns.md`, purpose-gated techniques). `scroll-behavior: smooth` for anchor jumps, off under reduced motion. If such a story needs smoothed wheel input, Lenis (MIT, 5.5 KB) runs on native scroll and switches itself off under reduced motion — but it breaks CSS scroll-snap and stops over iframes.

## 6. Reduced motion — substitute, don't delete

Reduced motion means fewer and gentler animations, not zero, and never missing content.

| Motion | Under `prefers-reduced-motion: reduce` |
| --- | --- |
| Slide, zoom or morph transitions | crossfade ≤ 150 ms, or instant |
| Entrance and settle delays, stagger | zero (§4); the substitute still runs |
| Parallax, scroll-linked movement, smooth scroll | off |
| Scroll reveals | content simply present |
| Hover lift, scale, tilt | colour, shadow or outline only |
| Spring overshoot | none; short ease-out |
| Autoplaying 3D, Lottie/Rive loops, background video, auto-advancing carousels | paused on a meaningful first frame, with a play control |
| Number counters, chart build animations | final value immediately |
| Skeleton shimmer | static skeleton |
| Spinners and progress | keep (essential); prefer determinate bars |
| Live-state indicator (a pulsing dot) | may pulse gently (for at most 5 s, or with a pause control: §2 gate 7), and always says its state in words |
| Press state, focus ring, toggle knob, drag feedback | keep |

Library defaults (read from their source): **Motion for React defaults to `reducedMotion: "never"`** — wrap the app in `<MotionConfig reducedMotion="user">`; GSAP and anime.js do nothing — use `gsap.matchMedia()` / `matchMedia`; AutoAnimate, Lenis and Recharts 3 respect it automatically; Chart.js and ECharts ignore it and animate for 1000 ms — set `animation: false` under reduce (and consider always, on dashboards). `audit.mjs` renders under reduced motion and fails any content that disappears.

## 7. Performance

- `transform` and `opacity` can run on the compositor and keep playing while JavaScript is busy. Motion hardware-accelerates only `opacity`, `clipPath`, `filter`, `transform` and colours — its `x`/`y`/`scale` shorthands run on the main thread. Its transform-string path survives a blocked main thread but **jumps when interrupted** and starts from `scale(0)` without a from-keyframe: use it with explicit `[from, to]` keyframes, and only for moves the user cannot reverse. CSS transitions kept moving through a 400 ms main-thread block where the libraries froze.
- `will-change` just before an animation and removed after; never blanket-wide.
- No scroll handlers doing work: IntersectionObserver, scroll-driven CSS, `scrollend`, passive listeners.
- Library cost competes with input (INP): parse + evaluate at 4× throttle — `motion/mini` 11 ms, Motion `animate` 18 ms, GSAP core ~45 ms, three.js 67 ms, React + ReactDOM 146 ms, Spline 352 ms.
- Don't drive many children from one CSS variable; set `transform` on the element itself. CSS loops on hundreds of elements cost style work every frame once anything else animates: keep continuously animated elements to dozens and pause those off-screen.
- **Nothing runs at rest.** Scroll features in GSAP (ScrollTrigger), anime.js and React Spring keep `requestAnimationFrame` running 54–73 times a second while nothing moves; CSS scroll-driven animation and IntersectionObserver do not. Stop canvas loops when settled (three.js `setAnimationLoop(null)`, R3F `frameloop="demand"`, PixiJS `app.ticker.stop()` and `Ticker.system.stop()`, Rive `stopRendering()`, dotLottie `freeze()`).
- Judge motion on a phone and on the real GPU with filmstrips of the transitions (a CDP screencast), not screenshots and not on a desktop monitor alone. On a site that frames a signature product, no script measures the motion limits of its phone budget (`performance.md` §1): read them in DevTools (Performance for `requestAnimationFrame` at rest, Layers for the composited layers that move).

## 8. Tools by job (sizes min+gzip, measured)

Default to the platform; reach for a library only for a job it does that CSS and the Web Animations API cannot.

| Job | Use | Not |
| --- | --- | --- |
| State changes, hover, press, sheets, toasts, dialogs | CSS transitions; `@starting-style` for display changes (0 KB; the seven lab interactions cost 2 KB in all) | a library |
| Route and page changes | View Transitions, ≤ 400 ms | for in-component swaps people repeat (they swallow input) |
| Scroll progress and reveals | CSS scroll-driven animation, IntersectionObserver fallback | ScrollTrigger, anime.js `onScroll`, React Spring `useScroll` (never sleep) |
| List add, remove, reorder | hand-written WAAPI FLIP; AutoAnimate (3.1 KB); Motion `layout` in React | a View Transition where people re-sort quickly |
| Counters and tickers | a WAAPI or JS writer updating text through `Intl.NumberFormat`; the final value ends as DOM text, under reduced motion too | CSS `counter()` for anything but decorative integers |
| React exits, shared layout, drag with springs | Motion with `LazyMotion` + `domAnimation` (27.5 KB) under `<MotionConfig reducedMotion="user">`, plus `reduceMotion: false` on press feedback (otherwise "user" removes it) | React Spring for new work |
| Authored marketing timelines, scroll-scrubbed stories | GSAP core + ScrollTrigger (27–44 KB; free licence including commercial use, not OSI; barred in no-code tools competing with Webflow), marketing pages only | inside apps |
| Designer-authored vector animation | lottie-web light (77 KB) for a few illustrations; dotLottie (13.5 KB JS + 485 KB WASM) for a state machine, in a Worker | a WASM runtime for one decorative loop (use CSS, SVG, a sprite or a video) |
| Pointer- or data-driven illustrated state | Rive (56 KB JS + 787 KB WASM; runtime MIT, editor paid), stopped when it settles | — |

GSAP, Motion and anime.js cost the same order of script time, so do not choose among them on cost. Rive, dotLottie and lottie-web ignore reduced motion: pause them yourself. Self-host every WASM runtime and decoder (they default to public CDNs). Theatre.js studio is AGPL and unmaintained. `resources/libraries.md` has the rest.

## 9. 3D and advanced visuals

Building an interactive or real-time 3D product (a configurator, builder or studio people play with): `interactive.md`. This section is the page-level checklist and budgets, which apply there too.

**3D earns its place** when the user needs to see an object from more than one angle or change it — an ecommerce product viewer (with AR "view in your room"), a configurator, spatial data (buildings, terrain, anatomy, molecules), a hardware product as the hero object used once. **3D is decoration** when it is spinning blobs, particle fields, wireframe globes, a rotating logo, a 3D chart (perspective distorts length), or a scroll-scrubbed camera flight on an app page. A shader or generative background is decoration unless it passes the purpose gate in `interactive.md` §9. If a photograph, a short video or an image sequence answers the question, use that.

Gates: is there a real asset (a low-poly placeholder is worse than photographs)? Can the page afford it (runtime and model load after the page is usable)? Is every fact shown in 3D also in text? When a live 3D product exists, the marketing pages around it carry no WebGL: they use stills rendered by the product and hand over to it (`interactive.md` §8); otherwise the purpose test above ("3D earns its place") and these gates apply.

Don't turn a site into one canvas to prove it can be done; choose the tool per effect (§8 and below).

A generative background that passes `interactive.md` §9 starts from `templates/code/hero-effect.js`.

| Tool | Size | Use for |
| --- | --- | --- |
| `<model-viewer>` (Apache-2.0) | 297 KB incl. three | product viewer and AR with no 3D code: `poster`, `loading="lazy"`, `reveal="manual"`, `camera-controls`, `alt`, `ar` |
| three.js (MIT) | 131 KB basic scene (tree-shakes poorly) | custom scenes, configurators |
| React Three Fiber + drei (MIT) | 243 KB + React | declarative scenes in React apps |
| OGL (Unlicense) | 13.8 KB | one shader plane or a light effect |
| Babylon.js (Apache-2.0) | 259 KB with deep imports — **1,550 KB from the root barrel** | game-like scenes, physics |
| Spline runtime (proprietary, no licence field) | 1,062 KB, 352 ms evaluate | prototypes only |

Checklist for any 3D on a page:

- [ ] **Poster first** — a real render in the same framing, sized, eager with `fetchpriority="high"` if above the fold. A canvas is never the LCP; the poster is, whenever its visible box is smaller than the viewport (a header above it, a height cap, content below it) — on phones even a soft 3 KB poster. Only a poster covering the whole viewport is ignored, and then the headline is the LCP.
- [ ] **Load late** — `loading="lazy"` or tap-to-load; `import()` on IntersectionObserver or first interaction; never in the critical path.
- [ ] **Render only when needed** — `frameloop="demand"`; pause offscreen and on `visibilitychange`; cap device pixel ratio at 2.
- [ ] **Nothing runs at rest** — zero `requestAnimationFrame` callbacks while nothing moves (check in DevTools Performance, §7); remove idle loops and frame-rate monitors that keep firing.
- [ ] **Reduced motion** — no auto-rotate, fly-ins or tilt; a static, well-lit frame with working controls.
- [ ] **Don't trap scrolling** — `<model-viewer>` defaults to `touch-action="none"`, which swallows vertical scrolling on phones: set `touch-action="pan-y"`; no wheel-zoom without a modifier.
- [ ] **Accessibility** — `alt` on model-viewer; rotate and zoom buttons (WCAG 2.5.7) and keyboard support. `role="img"` + `aria-label` only for a canvas that is a picture; an operable canvas needs the contract in `accessibility.md` §9b.
- [ ] **Failure path** — if WebGL fails, keep the poster and hide the controls. three.js and R3F throw without WebGL (check before mounting, wrap the canvas in an error boundary whose fallback is the poster); PixiJS and Phaser fall back to Canvas 2D. Handle context loss.
- [ ] **Self-host decoders and WASM** (model-viewer defaults to gstatic; dotLottie and Rive to jsDelivr/unpkg).
- [ ] **Assets** — glTF binary through `@gltf-transform/cli`; textures dominate the weight (a 3.7 MB model fell to 532 KB mostly by resizing textures to 1024 and converting to WebP; geometry compression alone saved 10%); Meshopt by default (8 KB decoder against Draco's 75 KB gzip). Budget: ≤ ~1.5 MB GLB for a product model, textures ≤ 2048² (1024² on mobile).
- [ ] **Licences** — Poly Haven and Kenney are CC0; Sketchfab is per model (BY needs credit, NC and Editorial forbid commercial use); Khronos sample models are mixed (DamagedHelmet includes CC BY-NC); **Shadertoy code is CC BY-NC-SA by default** — never paste it into a commercial site.
