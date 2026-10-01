# Page audit

## /order/#details  (app, as configurator)

### 390px

**Measurements and warnings**
- 1 of 15 controls are under 44px in one dimension (fine for inline links; not for primary actions or nav): `li > a.is-locked` 41×45 "Send"
- Type sizes carrying text: 26 · 24 · 20 · 18 · 17 · 15 · 14 px (7 distinct). Families (declared): Familjen Grotesk 95%, Kalam 5%. Weights: 400 49%, 700 33%, 600 18%.
- System: 10 distinct spacing values (50% on a 4px grid); radii 6px×6, 10px×2, 8px×1; 2 distinct shadows.
- LCP: `p#addr-hint.hint` at 48 ms (local, unthrottled — use Lighthouse for a real number). CLS 0.000.
- Transfer: font 41 KB, other 88 KB, css 44 KB, script 2 KB, fetch 3 KB, html 13 KB; web fonts loaded: Familjen Grotesk 400 700, Kalam 400.
- Phone [safe-area]: No viewport-fit=cover: the browser keeps the page inside the safe area, so the fixed bars cannot sit under the notch or the home indicator (choose cover only for an edge-to-edge design, then pad the bars with env()) — check the bars on a device (information)

### 1440px

**Measurements and warnings**
- 12 text elements sit on an image or gradient — check by eye in the render: `g.head > g.head-art` (background-image), `g.head > g.head-art` (background-image), `g.head > g.head-art` (background-image), `g.head > g.head-art` (background-image)
- Type sizes carrying text: 28 · 26 · 20 · 18 · 17 · 15 · 14 px (7 distinct). Families (declared): Familjen Grotesk 97%, Kalam 3%. Weights: 400 67%, 700 20%, 600 13%.
- System: 11 distinct spacing values (45% on a 4px grid); radii 6px×6, pill×2, 10px×2, 8px×1, 3px×1; 4 distinct shadows.
- LCP: `div#stage-wrap.stage.linen` at 168 ms (local, unthrottled — use Lighthouse for a real number). CLS 0.001.
- Transfer: font 41 KB, other 88 KB, css 44 KB, script 2 KB, fetch 3 KB, html 13 KB; web fonts loaded: Familjen Grotesk 400 700, Kalam 400.

**Generic-look signals** (review, not rules)
- ◆ Body 17px with controls ≥ 44px — marketing density in a desk work tool (apps: 13–14px body, 28–32px controls; a field tool used with gloves is different: --kind field).

## axe across pages

No violations in 2 views.

