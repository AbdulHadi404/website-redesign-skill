# Page audit

## /order/  (app, as configurator)

### 1440px

**Measurements and warnings**
- 12 text elements sit on an image or gradient — check by eye in the render: `g.head > g.head-art` (background-image), `g.head > g.head-art` (background-image), `g.head > g.head-art` (background-image), `g.head > g.head-art` (background-image)
- Type sizes carrying text: 28 · 26 · 25.5 · 20 · 18 · 17 · 16 · 15 · 14 px (10 distinct). Families (declared): Familjen Grotesk 93%, Kalam 7%. Weights: 400 83%, 600 11%, 700 5%.
- System: 15 distinct spacing values (40% on a 4px grid); radii pill×40, 3px×13, 12px×12, 8px×5, 10px×4, 6px×1; 7 distinct shadows.
- LCP: `div#stage-wrap.stage.linen` at 104 ms (local, unthrottled — use Lighthouse for a real number). CLS 0.049.
- Transfer: font 41 KB, other 88 KB, css 44 KB, script 2 KB, fetch 3 KB, html 13 KB; web fonts loaded: Familjen Grotesk 400 700, Kalam 400.

**Generic-look signals** (review, not rules)
- ◆ Body 17px with controls ≥ 44px — marketing density in a desk work tool (apps: 13–14px body, 28–32px controls; a field tool used with gloves is different: --kind field).

### 390px

**Measurements and warnings**
- 12 text elements sit on an image or gradient — check by eye in the render: `g.head > g.head-art` (background-image), `g.head > g.head-art` (background-image), `g.head > g.head-art` (background-image), `g.head > g.head-art` (background-image)
- 2 of 29 controls are under 44px in one dimension (fine for inline links; not for primary actions or nav): `li > a.is-locked` 43×45 "Wrap", `li > a.is-locked` 41×45 "Send"
- Type sizes carrying text: 26 · 25.5 · 24 · 20 · 18 · 17 · 16 · 15 · 14 px (10 distinct). Families (declared): Familjen Grotesk 93%, Kalam 7%. Weights: 400 83%, 600 11%, 700 5%.
- System: 15 distinct spacing values (40% on a 4px grid); radii pill×40, 3px×13, 12px×12, 8px×5, 10px×4, 6px×1; 6 distinct shadows.
- LCP: `div#stage-wrap.stage.linen` at 188 ms (local, unthrottled — use Lighthouse for a real number). CLS 0.000.
- Transfer: font 41 KB, other 88 KB, css 44 KB, script 2 KB, fetch 3 KB, html 13 KB; web fonts loaded: Familjen Grotesk 400 700, Kalam 400.
- Phone [safe-area]: No viewport-fit=cover: the browser keeps the page inside the safe area, so the fixed bars cannot sit under the notch or the home indicator (choose cover only for an edge-to-edge design, then pad the bars with env()) — check the bars on a device (information)

**Generic-look signals** (review, not rules)
- ◆ Body 17px with controls ≥ 44px — marketing density in a desk work tool (apps: 13–14px body, 28–32px controls; a field tool used with gloves is different: --kind field).

## axe across pages

No violations in 2 views.

