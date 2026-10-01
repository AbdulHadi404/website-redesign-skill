# Page audit

## /  (marketing)

### 1440px

**Measurements and warnings**
- 21 text elements sit on an image or gradient — check by eye in the render: `header.site-header > a.wordmark` (background-image), `li > a` (background-image), `li > a` (background-image), `li > a` (background-image)
- Type sizes carrying text: 64 · 41 · 32 · 28 · 21 · 18 · 17 · 14 px (10 distinct). Families (declared): Familjen Grotesk 94%, Kalam 6%. Weights: 400 87%, 600 6%, 700 6%.
- System: 16 distinct spacing values (56% on a 4px grid); radii 12px×13, 3px×12, 10px×3, 6px×1, 4px×1; 3 distinct shadows.
- LCP: `section.hero.linen` at 132 ms (local, unthrottled — use Lighthouse for a real number). CLS 0.000.
- Transfer: font 41 KB, css 20 KB, script 55 KB, fetch 3 KB, html 185 KB; web fonts loaded: Familjen Grotesk 400 700, Kalam 400.

**Generic-look signals** (review, not rules)
- ◆ Big-number claims — verify each is real and sourced: "14"

### 390px

**Measurements and warnings**
- 18 text elements sit on an image or gradient — check by eye in the render: `header.site-header > a.wordmark` (background-image), `header.site-header > button.menu-button` (background-image), `header.site-header > a.btn.header-cta` (background-image), `#hero-h` (background-image)
- Type sizes carrying text: 39 · 32 · 30 · 24 · 21 · 18 · 17 · 14 px (9 distinct). Families (declared): Familjen Grotesk 94%, Kalam 6%. Weights: 400 89%, 700 6%, 600 5%.
- System: 15 distinct spacing values (60% on a 4px grid); radii 12px×13, 3px×12, 10px×3, 6px×1, pill×1, 4px×1; 3 distinct shadows.
- LCP: `section.hero.linen` at 96 ms (local, unthrottled — use Lighthouse for a real number). CLS 0.000.
- Transfer: font 41 KB, css 20 KB, script 55 KB, fetch 3 KB, html 185 KB; web fonts loaded: Familjen Grotesk 400 700, Kalam 400.
- Phone [safe-area]: No viewport-fit=cover: the browser keeps the page inside the safe area, so the fixed bars cannot sit under the notch or the home indicator (choose cover only for an edge-to-edge design, then pad the bars with env()) — check the bars on a device (information)
- Phone [thumb]: Primary action pinned in the top third of the phone screen: a regrip for either thumb (1): a.btn.header-cta "Make a bouquet" — a bottom bar, or in flow after the content it acts on

**Generic-look signals** (review, not rules)
- ◆ Big-number claims — verify each is real and sourced: "14"

## axe across pages

No violations in 2 views.

