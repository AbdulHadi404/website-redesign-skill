# Motion check — http://127.0.0.1:4820/

2026-10-01 · phone · Chromium 141.0.7390.37 · tokens from page custom properties: micro 100, small 150, medium 240

## Spec: 1/1 entries pass

| id | trigger | normal | duration | easing | reduced (spec → seen) | verdict |
| --- | --- | --- | --- | --- | --- | --- |
| menu-open | click | animates | 240ms (spec medium) | cubic-bezier(0.2, 0, 0, 1) | fade → stops (instant) | ✓ |

Filmstrips: `filmstrip-menu-open.jpg`

## Audit

- Elements with motion: 6 (9 transitions, 1 animations); under reduce: 4 (4, 0).
- Reduced-motion handling: 2 CSS `prefers-reduced-motion: reduce` block(s); JavaScript queried it 1×.
- At rest (no input, after load): requestAnimationFrame 0×/s.
- At load: 1 CSS/WAAPI animation(s) normally, 0 under reduce; JS-driven inline-style motion on 0 element(s) normally, 0 under reduce.
- Hover: 0/0 controls change visibly · keyboard focus: 24/24 · press (:active): 0/0 buttons.

### Flags

None.


### Inventory (grouped by selector)

| selector | count | transitions | animations |
| --- | --- | --- | --- |
| `header.site-header` | 1 | border-color 150ms cubic-bezier(0.2, 0, 0, 1) | — |
| `a.btn.btn-primary` | 1 | background-color 150ms cubic-bezier(0.2, 0, 0, 1); transform 100ms cubic-bezier(0.2, 0, 0, 1) | — |
| `button.btn.menu-btn` | 1 | background-color 150ms cubic-bezier(0.2, 0, 0, 1); transform 100ms cubic-bezier(0.2, 0, 0, 1) | — |
| `#main a.btn.btn-primary` | 2 | background-color 150ms cubic-bezier(0.2, 0, 0, 1); transform 100ms cubic-bezier(0.2, 0, 0, 1) | — |
| `#main div.ty-fill` | 1 | — | ty-draw 0ms linear timeline:view() |

## Limits

- Computed styles only: canvas, WebGL, Lottie and Rive frames are invisible (their `<canvas>` is one element). JS libraries that animate inline styles (GSAP, anime.js, React Spring) are sampled, but their easing is estimated from samples, not declared.
- Timings are headless Chromium on this machine; judge feel on a real device (motion.md §7). A hover check needs a fine pointer; `--device phone` skips it.
