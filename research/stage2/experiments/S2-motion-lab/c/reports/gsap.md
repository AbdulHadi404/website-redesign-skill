# Motion check — http://127.0.0.1:37679/captures/c/gsap.html

2026-09-28 · desktop · Chromium 141.0.7390.37 · tokens from spec: micro 100, small 150, medium 240, large 300, page 400, hero 700

## Spec: 7/9 entries pass

| id | trigger | normal | duration | easing | reduced (spec → seen) | verdict |
| --- | --- | --- | --- | --- | --- | --- |
| cta-press | press | animates | ~82ms (spec micro) | ≈ __spec | keep → still moves | ✓ |
| cta-hover | hover | animates | 100ms (spec micro) | cubic-bezier(0.2, 0, 0, 1) | keep → substituted (fade/colour) | ✓ |
| plan-hover | hover | animates | ~86ms (spec small) | ≈ __spec | fade → substituted (fade/colour) | ✓ |
| sheet-open | click | animates | ~438ms (spec large) | — | fade → substituted (fade/colour) | ✗ layout jumps in one frame (width, height, left/margin, top/margin): a layout property changed without transitioning |
| toast | click | animates | ~233ms (spec medium) | ≈ __spec | fade → substituted (fade/colour) | ✓ |
| features-reveal | scroll | animates, stagger 27ms (sampled) | ~269ms (spec medium) | ≈ __spec | static → nothing changes | ✓ |
| stat-count | scroll | animates | ~793ms (spec 800) | ≈ __spec | instant → nothing changes | ✓ |
| hero-in | load | animates | ~425ms (spec hero) | ≈ __spec | fade → substituted (fade/colour) | ✓ |
| panel-swap | click | animates | ~556ms (spec page) | — | fade → substituted (fade/colour) | ✗ interrupted after 150ms: jumps |

Filmstrips: `filmstrip-cta-press.jpg`, `filmstrip-cta-hover.jpg`, `filmstrip-plan-hover.jpg`, `filmstrip-toast.jpg`, `filmstrip-features-reveal.jpg`, `filmstrip-stat-count.jpg`, `filmstrip-hero-in.jpg`, `filmstrip-panel-swap.jpg`

## Audit

- Elements with motion: 11 (11 transitions, 0 animations); under reduce: 11 (11, 0).
- Reduced-motion handling: 0 CSS `prefers-reduced-motion: reduce` block(s); JavaScript queried it 2×.
- At load: 0 CSS/WAAPI animation(s) normally, 0 under reduce; JS-driven inline-style motion on 1 element(s) normally, 0 under reduce.
- Hover: 10/10 controls change visibly · keyboard focus: 10/10 · press (:active): 7/7 buttons.

### Flags

None.


### Inventory (grouped by selector)

| selector | count | transitions | animations |
| --- | --- | --- | --- |
| `#nav a` | 3 | text-decoration-color 150ms cubic-bezier(0.2, 0, 0, 1) | — |
| `#cta` | 1 | background-color 100ms cubic-bezier(0.2, 0, 0, 1) | — |
| `#open-sheet` | 1 | background-color 100ms cubic-bezier(0.2, 0, 0, 1) | — |
| `#plan-basic a.btn` | 1 | background-color 100ms cubic-bezier(0.2, 0, 0, 1) | — |
| `#plan-pro a.btn` | 1 | background-color 100ms cubic-bezier(0.2, 0, 0, 1) | — |
| `#plan-team a.btn` | 1 | background-color 100ms cubic-bezier(0.2, 0, 0, 1) | — |
| `#next` | 1 | background-color 100ms cubic-bezier(0.2, 0, 0, 1) | — |
| `#save` | 1 | background-color 100ms cubic-bezier(0.2, 0, 0, 1) | — |
| `#close-sheet` | 1 | background-color 100ms cubic-bezier(0.2, 0, 0, 1) | — |

## Limits

- Computed styles only: canvas, WebGL, Lottie and Rive frames are invisible (their `<canvas>` is one element). JS libraries that animate inline styles (GSAP, anime.js, React Spring) are sampled, but their easing is estimated from samples, not declared.
- Timings are headless Chromium on this machine; judge feel on a real device (motion.md §7). A hover check needs a fine pointer; `--device phone` skips it.
