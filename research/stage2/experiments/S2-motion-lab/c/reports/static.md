# Motion check — http://127.0.0.1:34867/captures/c/static.html

2026-09-28 · desktop · Chromium 141.0.7390.37 · tokens from motion.md defaults: micro 100, small 150, medium 240, large 300, page 400, hero 700

## Spec: 0/9 entries pass

| id | trigger | normal | duration | easing | reduced (spec → seen) | verdict |
| --- | --- | --- | --- | --- | --- | --- |
| cta-press | press | none | — (spec micro) | — | keep → nothing changes | ✗ static: nothing changed after the trigger; reduced motion removed essential feedback (nothing changes) |
| cta-hover | hover | none | — (spec micro) | — | keep → nothing changes | ✗ static: nothing changed after the trigger; reduced motion removed essential feedback (nothing changes) |
| plan-hover | hover | none | — (spec small) | — | fade → nothing changes | ✗ static: nothing changed after the trigger |
| sheet-open | click | instant | — (spec large) | — | fade → stops (instant) | ✗ static: changed in one frame (no animation) |
| toast | click | instant | — (spec medium) | — | fade → stops (instant) | ✗ static: changed in one frame (no animation) |
| features-reveal | scroll | none | — (spec medium) | — | static → nothing changes | ✗ static: nothing changed after the trigger |
| stat-count | scroll | none | — (spec 800) | — | instant → nothing changes | ✗ static: nothing changed after the trigger |
| hero-in | load | none | — (spec hero) | — | fade → nothing changes | ✗ static: nothing changed after the trigger |
| panel-swap | click | none | — (spec page) | — | fade → nothing changes | ✗ static: nothing changed after the trigger |

Filmstrips: `filmstrip-cta-press.jpg`, `filmstrip-cta-hover.jpg`, `filmstrip-plan-hover.jpg`, `filmstrip-toast.jpg`, `filmstrip-features-reveal.jpg`, `filmstrip-stat-count.jpg`, `filmstrip-hero-in.jpg`, `filmstrip-panel-swap.jpg`

## Audit

- Elements with motion: 11 (11 transitions, 0 animations); under reduce: 63 (63, 0).
- Reduced-motion handling: 1 CSS `prefers-reduced-motion: reduce` block(s) including a universal kill rule; JavaScript queried it 0×.
- At load: 0 CSS/WAAPI animation(s) normally, 0 under reduce; JS-driven inline-style motion on 0 element(s) normally, 0 under reduce.
- Hover: 0/10 controls change visibly · keyboard focus: 10/10 · press (:active): 0/7 buttons.

### Flags

- **reduce-kills-all** (1): `page` — under reduce a universal rule removes every animation and transition, press and focus feedback included: *, ::before, ::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important;  }
- **transition-all** (11): `#cta` — transition: all 300ms — name the properties; `#open-sheet` — transition: all 300ms — name the properties; `#plan-basic` — transition: all 300ms — name the properties; `#plan-basic a.btn` — transition: all 300ms — name the properties; `#plan-pro` — transition: all 300ms — name the properties; `#plan-pro a.btn` — transition: all 300ms — name the properties; `#plan-team` — transition: all 300ms — name the properties; `#plan-team a.btn` — transition: all 300ms — name the properties; … 3 more
- **no-active** (7): `#cta` — no :active (press) feedback — scale(0.97) or a darker fill for 100 ms tells the user the press registered; `#open-sheet` — no :active (press) feedback — scale(0.97) or a darker fill for 100 ms tells the user the press registered; `#plan-basic a.btn` — no :active (press) feedback — scale(0.97) or a darker fill for 100 ms tells the user the press registered; `#plan-pro a.btn` — no :active (press) feedback — scale(0.97) or a darker fill for 100 ms tells the user the press registered; `#plan-team a.btn` — no :active (press) feedback — scale(0.97) or a darker fill for 100 ms tells the user the press registered; `#next` — no :active (press) feedback — scale(0.97) or a darker fill for 100 ms tells the user the press registered; `#save` — no :active (press) feedback — scale(0.97) or a darker fill for 100 ms tells the user the press registered
- **hover-none** (8): `#nav a` — hover changes nothing visible (colour, background, border, shadow, underline, opacity, transform); `#cta` — hover changes nothing visible (colour, background, border, shadow, underline, opacity, transform); `#open-sheet` — hover changes nothing visible (colour, background, border, shadow, underline, opacity, transform); `#plan-basic a.btn` — hover changes nothing visible (colour, background, border, shadow, underline, opacity, transform); `#plan-pro a.btn` — hover changes nothing visible (colour, background, border, shadow, underline, opacity, transform); `#plan-team a.btn` — hover changes nothing visible (colour, background, border, shadow, underline, opacity, transform); `#next` — hover changes nothing visible (colour, background, border, shadow, underline, opacity, transform); `#save` — hover changes nothing visible (colour, background, border, shadow, underline, opacity, transform)

### Inventory (grouped by selector)

| selector | count | transitions | animations |
| --- | --- | --- | --- |
| `#cta` | 1 | all 300ms ease | — |
| `#open-sheet` | 1 | all 300ms ease | — |
| `#plan-basic` | 1 | all 300ms ease | — |
| `#plan-basic a.btn` | 1 | all 300ms ease | — |
| `#plan-pro` | 1 | all 300ms ease | — |
| `#plan-pro a.btn` | 1 | all 300ms ease | — |
| `#plan-team` | 1 | all 300ms ease | — |
| `#plan-team a.btn` | 1 | all 300ms ease | — |
| `#next` | 1 | all 300ms ease | — |
| `#save` | 1 | all 300ms ease | — |
| `#close-sheet` | 1 | all 300ms ease | — |

## Limits

- Computed styles only: canvas, WebGL, Lottie and Rive frames are invisible (their `<canvas>` is one element). JS libraries that animate inline styles (GSAP, anime.js, React Spring) are sampled, but their easing is estimated from samples, not declared.
- Timings are headless Chromium on this machine; judge feel on a real device (motion.md §7). A hover check needs a fine pointer; `--device phone` skips it.
