# Motion check — http://127.0.0.1:4811/order/

2026-10-01 · phone · Chromium 141.0.7390.37 · tokens from page custom properties: micro 100, small 150, medium 240, large 300, settle 320

## Spec: 1/1 entries pass

| id | trigger | normal | duration | easing | reduced (spec → seen) | verdict |
| --- | --- | --- | --- | --- | --- | --- |
| wrap-crossfade | click | animates | 200ms (spec 200) | cubic-bezier(0.2, 0, 0, 1) | instant → nothing changes | ✓ |

Filmstrips: `filmstrip-wrap-crossfade.jpg`

## Audit

- Elements with motion: 68 (68 transitions, 0 animations); under reduce: 0 (0, 0).
- Reduced-motion handling: 2 CSS `prefers-reduced-motion: reduce` block(s); JavaScript queried it 0×.
- At rest (no input, after load): requestAnimationFrame 0×/s.
- At load: 0 CSS/WAAPI animation(s) normally, 0 under reduce; JS-driven inline-style motion on 0 element(s) normally, 0 under reduce.
- Hover: 0/0 controls change visibly · keyboard focus: 29/29 · press (:active): 0/0 buttons.

### Flags

None.


### Inventory (grouped by selector)

| selector | count | transitions | animations |
| --- | --- | --- | --- |
| `#stage g.bq-root` | 1 | transform 320ms linear(0 0%, 0.068 5%, 0.214 10%, 0.378 15%, 0.531 20%, 0.66 25%, 0.762 30%, 0.839 35%, 0.894 40%, 0.934 45%, 0.96 50%, 0.977 55%, 0.988 60%, 0.995 65%, 0.998 70%, 1 75%, 1.001 80%, 1.002 85%, 1.001 90%, 1.001 95%, 1 100%) | — |
| `#stage g.bq-sheet` | 2 | transform 320ms linear(0 0%, 0.068 5%, 0.214 10%, 0.378 15%, 0.531 20%, 0.66 25%, 0.762 30%, 0.839 35%, 0.894 40%, 0.934 45%, 0.96 50%, 0.977 55%, 0.988 60%, 0.995 65%, 0.998 70%, 1 75%, 1.001 80%, 1.002 85%, 1.001 90%, 1.001 95%, 1 100%) | — |
| `#stage g.bq-ends` | 1 | opacity 240ms cubic-bezier(0.2, 0, 0, 1) | — |
| `#stage g.stem` | 24 | transform 320ms linear(0 0%, 0.068 5%, 0.214 10%, 0.378 15%, 0.531 20%, 0.66 25%, 0.762 30%, 0.839 35%, 0.894 40%, 0.934 45%, 0.96 50%, 0.977 55%, 0.988 60%, 0.995 65%, 0.998 70%, 1 75%, 1.001 80%, 1.002 85%, 1.001 90%, 1.001 95%, 1 100%) | — |
| `#stage g.bq-stems` | 1 | opacity 240ms cubic-bezier(0.2, 0, 0, 1) | — |
| `#stage g.head` | 12 | transform 320ms linear(0 0%, 0.068 5%, 0.214 10%, 0.378 15%, 0.531 20%, 0.66 25%, 0.762 30%, 0.839 35%, 0.894 40%, 0.934 45%, 0.96 50%, 0.977 55%, 0.988 60%, 0.995 65%, 0.998 70%, 1 75%, 1.001 80%, 1.002 85%, 1.001 90%, 1.001 95%, 1 100%) | — |
| `#tray button.stem-add` | 12 | background-color 100ms cubic-bezier(0.2, 0, 0, 1) | — |
| `#tray span.stem-pic` | 12 | transform 100ms cubic-bezier(0.2, 0, 0, 1) | — |
| `#starter-list button.btn.btn--quiet` | 3 | background-color 100ms cubic-bezier(0.2, 0, 0, 1) | — |

## Limits

- Computed styles only: canvas, WebGL, Lottie and Rive frames are invisible (their `<canvas>` is one element). JS libraries that animate inline styles (GSAP, anime.js, React Spring) are sampled, but their easing is estimated from samples, not declared.
- Timings are headless Chromium on this machine; judge feel on a real device (motion.md §7). A hover check needs a fine pointer; `--device phone` skips it.
