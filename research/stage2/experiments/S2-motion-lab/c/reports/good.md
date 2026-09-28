# Motion check — http://127.0.0.1:45933/captures/c/good.html

2026-09-28 · desktop · Chromium 141.0.7390.37 · tokens from page custom properties: micro 100, small 150, medium 240, large 300, page 400, hero 700, count 800

## Spec: 8/9 entries pass

| id | trigger | normal | duration | easing | reduced (spec → seen) | verdict |
| --- | --- | --- | --- | --- | --- | --- |
| cta-press | press | animates | 100ms (spec micro) | cubic-bezier(0.2, 0, 0, 1) | keep → still moves | ✓ |
| cta-hover | hover | animates | 100ms (spec micro) | cubic-bezier(0.2, 0, 0, 1) | keep → substituted (fade/colour) | ✓ |
| plan-hover | hover | animates | 150ms (spec small) | cubic-bezier(0.2, 0, 0, 1) | fade → substituted (fade/colour) | ✓ |
| sheet-open | click | animates | 300ms (spec large) | cubic-bezier(0.2, 0, 0, 1) / ease | fade → substituted (fade/colour) | ✓ |
| toast | click | animates | 240ms (spec medium) | cubic-bezier(0.2, 0, 0, 1) | fade → substituted (fade/colour) | ✓ |
| features-reveal | scroll | animates, stagger 40ms (declared) | 240ms (spec medium) | cubic-bezier(0.2, 0, 0, 1) | static → nothing changes | ✓ |
| stat-count | scroll | animates | ~343ms (spec 800) | ≈ ease-out | instant → nothing changes | ✗ duration 343ms (sampled) outside 800ms; sampled curve fits ease-out better than out (rms 0.281 vs 0.216); animates layout properties not in the spec: width |
| hero-in | load | animates | 700ms (spec hero) | cubic-bezier(0.05, 0.7, 0.1, 1) | fade → substituted (fade/colour) | ✓ |
| panel-swap | click | animates | 400ms (spec page) | cubic-bezier(0.2, 0, 0, 1) | fade → substituted (fade/colour) | ✓ |

Filmstrips: `filmstrip-cta-press.jpg`, `filmstrip-cta-hover.jpg`, `filmstrip-plan-hover.jpg`, `filmstrip-toast.jpg`, `filmstrip-features-reveal.jpg`, `filmstrip-stat-count.jpg`, `filmstrip-hero-in.jpg`, `filmstrip-panel-swap.jpg`

## Audit

- Elements with motion: 25 (46 transitions, 1 animations); under reduce: 19 (30, 1).
- Reduced-motion handling: 1 CSS `prefers-reduced-motion: reduce` block(s); JavaScript queried it 1×.
- At load: 1 CSS/WAAPI animation(s) normally, 1 under reduce; JS-driven inline-style motion on 0 element(s) normally, 0 under reduce.
- Hover: 10/10 controls change visibly · keyboard focus: 10/10 · press (:active): 7/7 buttons.

### Flags

None.


### Inventory (grouped by selector)

| selector | count | transitions | animations |
| --- | --- | --- | --- |
| `#nav a` | 3 | text-decoration-color 150ms cubic-bezier(0.2, 0, 0, 1) | — |
| `#hero-title` | 1 | — | rise 700ms cubic-bezier(0.05, 0.7, 0.1, 1) |
| `#cta` | 1 | background-color 100ms cubic-bezier(0.2, 0, 0, 1); transform 100ms cubic-bezier(0.2, 0, 0, 1) | — |
| `#open-sheet` | 1 | background-color 100ms cubic-bezier(0.2, 0, 0, 1); transform 100ms cubic-bezier(0.2, 0, 0, 1) | — |
| `#plan-basic` | 1 | transform 150ms cubic-bezier(0.2, 0, 0, 1); box-shadow 150ms cubic-bezier(0.2, 0, 0, 1) | — |
| `#plan-basic a.btn` | 1 | background-color 100ms cubic-bezier(0.2, 0, 0, 1); transform 100ms cubic-bezier(0.2, 0, 0, 1) | — |
| `#plan-pro` | 1 | transform 150ms cubic-bezier(0.2, 0, 0, 1); box-shadow 150ms cubic-bezier(0.2, 0, 0, 1) | — |
| `#plan-pro a.btn` | 1 | background-color 100ms cubic-bezier(0.2, 0, 0, 1); transform 100ms cubic-bezier(0.2, 0, 0, 1) | — |
| `#plan-team` | 1 | transform 150ms cubic-bezier(0.2, 0, 0, 1); box-shadow 150ms cubic-bezier(0.2, 0, 0, 1) | — |
| `#plan-team a.btn` | 1 | background-color 100ms cubic-bezier(0.2, 0, 0, 1); transform 100ms cubic-bezier(0.2, 0, 0, 1) | — |
| `#features div.feature` | 6 | opacity 240ms cubic-bezier(0.2, 0, 0, 1); transform 240ms cubic-bezier(0.2, 0, 0, 1) | — |
| `#view-a` | 1 | opacity 400ms cubic-bezier(0.2, 0, 0, 1); transform 400ms cubic-bezier(0.2, 0, 0, 1) | — |
| `#view-b` | 1 | opacity 400ms cubic-bezier(0.2, 0, 0, 1); transform 400ms cubic-bezier(0.2, 0, 0, 1) | — |
| `#next` | 1 | background-color 100ms cubic-bezier(0.2, 0, 0, 1); transform 100ms cubic-bezier(0.2, 0, 0, 1) | — |
| `#save` | 1 | background-color 100ms cubic-bezier(0.2, 0, 0, 1); transform 100ms cubic-bezier(0.2, 0, 0, 1) | — |
| `#toast` | 1 | opacity 240ms cubic-bezier(0.2, 0, 0, 1); transform 240ms cubic-bezier(0.2, 0, 0, 1) | — |
| `#sheet` | 1 | transform 300ms cubic-bezier(0.2, 0, 0, 1); opacity 300ms cubic-bezier(0.2, 0, 0, 1); display 300ms ease | — |
| `#close-sheet` | 1 | background-color 100ms cubic-bezier(0.2, 0, 0, 1); transform 100ms cubic-bezier(0.2, 0, 0, 1) | — |

## Limits

- Computed styles only: canvas, WebGL, Lottie and Rive frames are invisible (their `<canvas>` is one element). JS libraries that animate inline styles (GSAP, anime.js, React Spring) are sampled, but their easing is estimated from samples, not declared.
- Timings are headless Chromium on this machine; judge feel on a real device (motion.md §7). A hover check needs a fine pointer; `--device phone` skips it.
