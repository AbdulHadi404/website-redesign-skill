# Page audit

## /order/#wrap-card  (app, as configurator)

### 390px

**Measurements and warnings**
- 12 text elements sit on an image or gradient — check by eye in the render: `g.head > g.head-art` (background-image), `g.head > g.head-art` (background-image), `g.head > g.head-art` (background-image), `g.head > g.head-art` (background-image)
- 1 of 12 controls are under 44px in one dimension (fine for inline links; not for primary actions or nav): `li > a.is-locked` 41×45 "Send"
- Type sizes carrying text: 26 · 24 · 20 · 18 · 17 · 15 · 14 px (7 distinct). Families (declared): Familjen Grotesk 97%, Kalam 3%. Weights: 400 64%, 600 26%, 700 9%.
- System: 12 distinct spacing values (50% on a 4px grid); radii 6px×9, 12px×8, pill×3, 10px×2, 3px×1, 4px×1; 5 distinct shadows.
- LCP: `div#stage-wrap.stage.linen` at 136 ms (local, unthrottled — use Lighthouse for a real number). CLS 0.000.
- Transfer: font 41 KB, other 88 KB, css 44 KB, script 2 KB, fetch 3 KB, html 13 KB; web fonts loaded: Familjen Grotesk 400 700, Kalam 400.
- Nested corners not concentric: `label.choice > span.choice-pic.choice-pic--silk-sage` 6px inside `#ribbon-choices > label.choice` 12px, 12px in (≈0px); `label.choice > span.choice-pic.choice-pic--silk-blush` 6px inside `#ribbon-choices > label.choice` 12px, 12px in (≈0px) — an inner radius near its parent's corner should be about the outer radius minus the gap, or the corners read as two shapes.
- Near-miss alignment — text blocks whose left edges sit 1–4px apart (5 shared edges in all): 81px ×6 vs 82px ×2; 264px ×6 vs 265px ×2 — put them on one edge or separate them deliberately.
- Phone [safe-area]: No viewport-fit=cover: the browser keeps the page inside the safe area, so the fixed bars cannot sit under the notch or the home indicator (choose cover only for an edge-to-edge design, then pad the bars with env()) — check the bars on a device (information)

**Generic-look signals** (review, not rules)
- ◆ 8 gradient backgrounds.
- ◆ 4 icon tiles (small tinted rounded squares holding an icon) — the generated feature-grid signature.
- ◆ Body 17px with controls ≥ 44px — marketing density in a desk work tool (apps: 13–14px body, 28–32px controls; a field tool used with gloves is different: --kind field).

### 1440px

**Measurements and warnings**
- 12 text elements sit on an image or gradient — check by eye in the render: `g.head > g.head-art` (background-image), `g.head > g.head-art` (background-image), `g.head > g.head-art` (background-image), `g.head > g.head-art` (background-image)
- Type sizes carrying text: 28 · 26 · 20 · 18 · 17 · 15 · 14 px (7 distinct). Families (declared): Familjen Grotesk 97%, Kalam 3%. Weights: 400 64%, 600 26%, 700 9%.
- System: 11 distinct spacing values (45% on a 4px grid); radii 6px×9, 12px×8, pill×3, 10px×2, 3px×1, 4px×1; 6 distinct shadows.
- LCP: `div#stage-wrap.stage.linen` at 144 ms (local, unthrottled — use Lighthouse for a real number). CLS 0.000.
- Transfer: font 41 KB, other 88 KB, css 44 KB, script 2 KB, fetch 3 KB, html 13 KB; web fonts loaded: Familjen Grotesk 400 700, Kalam 400.
- Nested corners not concentric: `label.choice > span.choice-pic.choice-pic--tissue` 6px inside `#wrap-choices > label.choice` 12px, 12px in (≈0px); `label.choice > span.choice-pic.choice-pic--silk-sage` 6px inside `#ribbon-choices > label.choice` 12px, 12px in (≈0px); `label.choice > span.choice-pic.choice-pic--silk-blush` 6px inside `#ribbon-choices > label.choice` 12px, 12px in (≈0px) — an inner radius near its parent's corner should be about the outer radius minus the gap, or the corners read as two shapes.
- Near-miss alignment — text blocks whose left edges sit 1–4px apart (6 shared edges in all): 1017px ×6 vs 1018px ×2; 1249px ×6 vs 1250px ×2 — put them on one edge or separate them deliberately.

**Generic-look signals** (review, not rules)
- ◆ 8 gradient backgrounds.
- ◆ 4 icon tiles (small tinted rounded squares holding an icon) — the generated feature-grid signature.
- ◆ Body 17px with controls ≥ 44px — marketing density in a desk work tool (apps: 13–14px body, 28–32px controls; a field tool used with gloves is different: --kind field).

## axe across pages

No violations in 2 views.

