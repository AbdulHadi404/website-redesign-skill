# Page audit

## /  (app, as configurator)

### 1440px

**Measurements and warnings**
- 16 text elements sit on an image or gradient — check by eye in the render: `header.site-header > a.wordmark` (background-image), `li > a` (background-image), `li > a` (background-image), `li > a` (background-image)
- Type sizes carrying text: 64 · 41 · 32 · 28 · 21 · 18 · 17 · 14 px (10 distinct). Families (declared): Familjen Grotesk 93%, Kalam 7%. Weights: 400 86%, 600 7%, 700 7%.
- System: 16 distinct spacing values (56% on a 4px grid); radii 12px×13, 3px×12, 10px×3, 6px×1, 4px×1; 3 distinct shadows.
- LCP: `section.hero.linen` at 168 ms (local, unthrottled — use Lighthouse for a real number). CLS 0.000.
- Transfer: font 41 KB, css 21 KB, script 55 KB, fetch 3 KB, html 184 KB; web fonts loaded: Familjen Grotesk 400 700, Kalam 400.

**Generic-look signals** (review, not rules)
- ◆ Largest text is 64px in an app view — work tools rarely need more than 24–28px; the page title names the place and scope.
- ◆ Big-number claims — verify each is real and sourced: "14"

### 390px

**Measurements and warnings**
- 13 text elements sit on an image or gradient — check by eye in the render: `header.site-header > a.wordmark` (background-image), `header.site-header > button.menu-button` (background-image), `header.site-header > a.btn.header-cta` (background-image), `#hero-h` (background-image)
- Type sizes carrying text: 39 · 32 · 30 · 24 · 21 · 18 · 17 · 14 px (9 distinct). Families (declared): Familjen Grotesk 93%, Kalam 7%. Weights: 400 87%, 700 7%, 600 6%.
- System: 15 distinct spacing values (60% on a 4px grid); radii 12px×13, 3px×12, 10px×3, 6px×1, pill×1, 4px×1; 3 distinct shadows.
- LCP: `section.hero.linen` at 88 ms (local, unthrottled — use Lighthouse for a real number). CLS 0.000.
- Transfer: font 41 KB, css 21 KB, script 55 KB, fetch 3 KB, html 184 KB; web fonts loaded: Familjen Grotesk 400 700, Kalam 400.
- Phone [safe-area]: No viewport-fit=cover: the browser keeps the page inside the safe area, so the fixed bars cannot sit under the notch or the home indicator (choose cover only for an edge-to-edge design, then pad the bars with env()) — check the bars on a device (information)
- Phone [thumb]: Primary action pinned in the top third of the phone screen: a regrip for either thumb (1): a.btn.header-cta "Make a bouquet" — a bottom bar, or in flow after the content it acts on

**Generic-look signals** (review, not rules)
- ◆ Largest text is 46px in an app view — work tools rarely need more than 24–28px; the page title names the place and scope.
- ◆ Body 17px with controls ≥ 44px — marketing density in a desk work tool (apps: 13–14px body, 28–32px controls; a field tool used with gloves is different: --kind field).
- ◆ Big-number claims — verify each is real and sourced: "14"

## /order/  (app, as configurator)

### 1440px

**Measurements and warnings**
- 3 text elements sit on an image or gradient — check by eye in the render: `#retie` (background-image), `#share` (background-image), `#stage-wrap > p.stage-note` (background-image)
- Type sizes carrying text: 28 · 26 · 25.5 · 20 · 18 · 17 · 16 · 15 · 14 px (10 distinct). Families (declared): Familjen Grotesk 92%, Kalam 8%. Weights: 400 82%, 600 13%, 700 6%.
- System: 15 distinct spacing values (40% on a 4px grid); radii pill×40, 3px×13, 12px×12, 8px×5, 10px×4, 6px×1; 7 distinct shadows.
- LCP: `div#stage-wrap.stage.linen` at 180 ms (local, unthrottled — use Lighthouse for a real number). CLS 0.046.
- Transfer: font 41 KB, other 88 KB, css 45 KB, script 2 KB, fetch 3 KB, html 13 KB; web fonts loaded: Familjen Grotesk 400 700, Kalam 400.

**Generic-look signals** (review, not rules)
- ◆ Body 17px with controls ≥ 44px — marketing density in a desk work tool (apps: 13–14px body, 28–32px controls; a field tool used with gloves is different: --kind field).

### 390px

**Measurements and warnings**
- 3 text elements sit on an image or gradient — check by eye in the render: `#retie` (background-image), `#share` (background-image), `#stage-wrap > p.stage-note` (background-image)
- Type sizes carrying text: 26 · 25.5 · 24 · 20 · 18 · 17 · 16 · 15 · 14 px (10 distinct). Families (declared): Familjen Grotesk 92%, Kalam 8%. Weights: 400 82%, 600 13%, 700 6%.
- System: 15 distinct spacing values (40% on a 4px grid); radii pill×40, 3px×13, 12px×12, 8px×5, 10px×4, 6px×1; 6 distinct shadows.
- LCP: `div#stage-wrap.stage.linen` at 132 ms (local, unthrottled — use Lighthouse for a real number). CLS 0.000.
- Transfer: font 41 KB, other 88 KB, css 45 KB, script 2 KB, fetch 3 KB, html 13 KB; web fonts loaded: Familjen Grotesk 400 700, Kalam 400.
- Phone [safe-area]: No viewport-fit=cover: the browser keeps the page inside the safe area, so the fixed bars cannot sit under the notch or the home indicator (choose cover only for an edge-to-edge design, then pad the bars with env()) — check the bars on a device (information)

**Generic-look signals** (review, not rules)
- ◆ Body 17px with controls ≥ 44px — marketing density in a desk work tool (apps: 13–14px body, 28–32px controls; a field tool used with gloves is different: --kind field).

## axe across pages

No violations in 4 views.

