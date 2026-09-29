# Motion check — http://127.0.0.1:42223/captures/c/over.html

2026-09-29 · desktop · Chromium 141.0.7390.37 · tokens from spec: micro 100, small 150, medium 240, large 300, page 400, hero 700

## Spec: 0/9 entries pass

| id | trigger | normal | duration | easing | reduced (spec → seen) | verdict |
| --- | --- | --- | --- | --- | --- | --- |
| cta-press | press | none | — (spec micro) | — | keep → nothing changes | ✗ static: nothing changed after the trigger; reduced motion removed essential feedback (nothing changes) |
| cta-hover | hover | animates | 600ms (spec micro) | cubic-bezier(0.68, -0.55, 0.27, 1.55) | keep → still moves | ✗ duration 600ms outside micro (100ms); easing cubic-bezier(0.68, -0.55, 0.27, 1.55) is not out (cubic-bezier(0.2, 0, 0, 1)); animates layout properties not in the spec: width, height, padding-bottom, padding-left, padding-right, padding-top |
| plan-hover | hover | animates | 600ms (spec small) | cubic-bezier(0.68, -0.55, 0.27, 1.55) | fade → substituted (fade/colour) | ✗ duration 600ms outside small (150ms); layout jumps in one frame (width, top/margin): a layout property changed without transitioning; easing cubic-bezier(0.68, -0.55, 0.27, 1.55) is not out (cubic-bezier(0.2, 0, 0, 1)); spec'd properties that did not change: transform; reduced motion: the fade takes 600ms (≤ 200 ms) |
| sheet-open | click | animates | 800ms (spec large) | cubic-bezier(0.68, -0.55, 0.27, 1.55) / ease | fade → still moves | ✗ duration 800ms outside large (300ms); easing cubic-bezier(0.68, -0.55, 0.27, 1.55) / ease is not out (cubic-bezier(0.2, 0, 0, 1)); animates layout properties not in the spec: height, top/margin, padding-bottom, padding-top; spec'd properties that did not change: transform; reduced motion: still moves — spec says fade |
| toast | click | animates | 900ms (spec medium) | cubic-bezier(0.68, -0.55, 0.27, 1.55) | fade → still moves | ✗ duration 900ms outside medium (240ms); easing cubic-bezier(0.68, -0.55, 0.27, 1.55) is not out (cubic-bezier(0.2, 0, 0, 1)); animates layout properties not in the spec: top/margin, margin-bottom; spec'd properties that did not change: transform; reduced motion: still moves — spec says fade |
| features-reveal | scroll | animates, stagger 200ms (declared) | 1200ms (spec medium) | cubic-bezier(0.68, -0.55, 0.27, 1.55) | static → still moves | ✗ duration 1200ms outside medium (240ms); easing cubic-bezier(0.68, -0.55, 0.27, 1.55) is not out (cubic-bezier(0.2, 0, 0, 1)); stagger 200ms, spec 40ms; reduced motion: still moves — spec says static |
| stat-count | scroll | animates | ~2503ms (spec 800) | ≈ linear | instant → still animates (text or custom property) | ✗ duration ~2482–2503ms (sampled: last visible change – fitted) outside 800ms; sampled curve fits linear better than out (rms 0.072 vs 0.002); reduced motion: still animates (text or custom property) — spec says instant |
| hero-in | load | animates | 1500ms (spec hero) | ease-in | fade → still moves | ✗ duration 1500ms outside hero (700ms); easing ease-in is not emphasized (cubic-bezier(0.05, 0.7, 0.1, 1)); reduced motion: still moves — spec says fade |
| panel-swap | click | animates (view transition) | 600ms (spec page) | ease / ease-in | fade → still moves | ✗ duration 600ms outside page (400ms); easing ease / ease-in is not out (cubic-bezier(0.2, 0, 0, 1)); reduced motion: still moves — spec says fade; interrupted after 150ms: input swallowed (the second click landed on <html>; a view transition hit-tests the root for its whole duration) |

Filmstrips: `filmstrip-cta-press.jpg`, `filmstrip-cta-hover.jpg`, `filmstrip-plan-hover.jpg`, `filmstrip-sheet-open.jpg`, `filmstrip-toast.jpg`, `filmstrip-features-reveal.jpg`, `filmstrip-stat-count.jpg`, `filmstrip-hero-in.jpg`, `filmstrip-panel-swap.jpg`

## Audit

- Elements with motion: 23 (23 transitions, 2 animations); under reduce: 23 (23, 2).
- Reduced-motion handling: 0 CSS `prefers-reduced-motion: reduce` block(s); JavaScript queried it 0×.
- At rest (no input, after load): requestAnimationFrame 56×/s.
- At load: 2 CSS/WAAPI animation(s) normally, 2 under reduce; JS-driven inline-style motion on 1 element(s) normally, 1 under reduce.
- Hover: 10/10 controls change visibly · keyboard focus: 11/11 · press (:active): 0/7 buttons.

### Flags

- **no-reduced-motion** (1): `page` — no prefers-reduced-motion rule in readable CSS and no matchMedia query from JavaScript, and 26 thing(s) move (#nav a, #hero-title, #cta…)
- **moves-under-reduce** (3): `#hero-title` — animation heroin (opacity, transform, 1500ms) still runs at load under reduce; `#cta` — animation pulse (box-shadow, 1500ms, infinite) still runs at load under reduce; `#hero div.blob` — inline style changed 153× in the first 4 s under reduce (JavaScript-driven motion)
- **raf-at-rest** (1): `page` — requestAnimationFrame fires 56×/s with no input — a JS loop runs at rest (seen in the lab: GSAP ScrollTrigger once registered, anime.js onScroll, React Spring useScroll, Motion scroll() with x/y/scale values, Rive and dotLottie until stopRendering()/freeze(), hand-written loops); stop it when nothing moves
- **transition-all** (14): `#nav a` — transition: all 600ms — name the properties; `#cta` — transition: all 600ms — name the properties; `#open-sheet` — transition: all 600ms — name the properties; `#plan-basic` — transition: all 600ms — name the properties; `#plan-basic a.btn` — transition: all 600ms — name the properties; `#plan-pro` — transition: all 600ms — name the properties; `#plan-pro a.btn` — transition: all 600ms — name the properties; `#plan-team` — transition: all 600ms — name the properties; … 6 more
- **layout-transition** (1): `#sheet` — transition on height (800ms) — re-lays-out every frame; animate transform/opacity (grid-template-rows 0fr→1fr for accordions)
- **layout-keyframes** (1): `@keyframes toastin` — @keyframes toastin animates margin-bottom (not running at load)
- **scale-zero** (1): `@keyframes pop` — @keyframes pop enters from scale(0) — start at 0.9–0.97 with opacity 0 (not running at load)
- **off-token** (16): `#nav a` — transition all 600ms is not a token (100/150/240/300/400/700); `#hero-title` — animation heroin 1500ms is not a token (100/150/240/300/400/700); `#cta` — transition all 600ms is not a token (100/150/240/300/400/700); `#open-sheet` — transition all 600ms is not a token (100/150/240/300/400/700); `#plan-basic` — transition all 600ms is not a token (100/150/240/300/400/700); `#plan-basic a.btn` — transition all 600ms is not a token (100/150/240/300/400/700); `#plan-pro` — transition all 600ms is not a token (100/150/240/300/400/700); `#plan-pro a.btn` — transition all 600ms is not a token (100/150/240/300/400/700); … 8 more
- **long** (2): `#hero-title` — animation heroin 1500ms is longer than the largest token (700ms); `#sheet` — transition height 800ms is longer than the largest token (700ms)
- **no-active** (7): `#cta` — no :active (press) feedback — scale(0.97) or a darker fill for 100 ms tells the user the press registered; `#open-sheet` — no :active (press) feedback — scale(0.97) or a darker fill for 100 ms tells the user the press registered; `#plan-basic a.btn` — no :active (press) feedback — scale(0.97) or a darker fill for 100 ms tells the user the press registered; `#plan-pro a.btn` — no :active (press) feedback — scale(0.97) or a darker fill for 100 ms tells the user the press registered; `#plan-team a.btn` — no :active (press) feedback — scale(0.97) or a darker fill for 100 ms tells the user the press registered; `#next` — no :active (press) feedback — scale(0.97) or a darker fill for 100 ms tells the user the press registered; `#save` — no :active (press) feedback — scale(0.97) or a darker fill for 100 ms tells the user the press registered
- **infinite** (1): `#cta` — @keyframes pulse loops forever (1500ms) — pause control or stop within 5 s (WCAG 2.2.2), off under reduce

### Inventory (grouped by selector)

| selector | count | transitions | animations |
| --- | --- | --- | --- |
| `#nav a` | 3 | all 600ms cubic-bezier(0.68, -0.55, 0.27, 1.55) | — |
| `#hero-title` | 1 | — | heroin 1500ms ease-in |
| `#cta` | 1 | all 600ms cubic-bezier(0.68, -0.55, 0.27, 1.55) | pulse 1500ms ease-in-out ×infinite |
| `#open-sheet` | 1 | all 600ms cubic-bezier(0.68, -0.55, 0.27, 1.55) | — |
| `#plan-basic` | 1 | all 600ms cubic-bezier(0.68, -0.55, 0.27, 1.55) | — |
| `#plan-basic a.btn` | 1 | all 600ms cubic-bezier(0.68, -0.55, 0.27, 1.55) | — |
| `#plan-pro` | 1 | all 600ms cubic-bezier(0.68, -0.55, 0.27, 1.55) | — |
| `#plan-pro a.btn` | 1 | all 600ms cubic-bezier(0.68, -0.55, 0.27, 1.55) | — |
| `#plan-team` | 1 | all 600ms cubic-bezier(0.68, -0.55, 0.27, 1.55) | — |
| `#plan-team a.btn` | 1 | all 600ms cubic-bezier(0.68, -0.55, 0.27, 1.55) | — |
| `#features div.feature` | 6 | all 600ms cubic-bezier(0.68, -0.55, 0.27, 1.55) | — |
| `#next` | 1 | all 600ms cubic-bezier(0.68, -0.55, 0.27, 1.55) | — |
| `#save` | 1 | all 600ms cubic-bezier(0.68, -0.55, 0.27, 1.55) | — |
| `#toast` | 1 | all 600ms cubic-bezier(0.68, -0.55, 0.27, 1.55) | — |
| `#sheet` | 1 | height 800ms cubic-bezier(0.68, -0.55, 0.27, 1.55); padding 800ms ease | — |
| `#close-sheet` | 1 | all 600ms cubic-bezier(0.68, -0.55, 0.27, 1.55) | — |

## Limits

- Computed styles only: canvas, WebGL, Lottie and Rive frames are invisible (their `<canvas>` is one element). JS libraries that animate inline styles (GSAP, anime.js, React Spring) are sampled, but their easing is estimated from samples, not declared.
- Timings are headless Chromium on this machine; judge feel on a real device (motion.md §7). A hover check needs a fine pointer; `--device phone` skips it.
