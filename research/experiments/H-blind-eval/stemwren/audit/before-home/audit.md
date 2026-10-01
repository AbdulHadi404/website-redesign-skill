# Page audit

## /  (marketing)

### 1440px

**Fails**
- ✗ Declared font families not available — the page renders in a fallback: Poppins, Great Vibes (font file blocked, 404, or never loaded).
- ✗ No lang attribute on <html>.
- ✗ Console/page errors (4): request failed: https://fonts.googleapis.com/css2?family=Great+Vibes&family=Poppins:wght@300;400;600&display=swap (net::ERR_CERT_AUTHORITY_INVALID) | Failed to load resource: net::ERR_CERT_AUTHORITY_INVALID
- ✗ axe-core: heading-order (moderate, 1), html-has-lang (serious, 1), landmark-one-main (moderate, 1), region (moderate, 7)

**Measurements and warnings**
- 9 text elements sit on an image or gradient — check by eye in the render: `nav > a.cta` (gradient), `section.hero > h1` (gradient), `section.hero > p` (gradient), `section.hero > a.btn` (gradient)
- Heading levels skipped: 1→3 at "Fresh Flowers"
- Missing landmarks: main.
- No skip link as the first focusable element.
- 1 images without width/height or aspect-ratio (layout shift): logo.svg
- Type sizes carrying text: 96 · 48 · 36 · 24 · 22 · 20 · 16 · 14 · 13 · 12 px (10 distinct). Families (declared): Poppins 93% — not loaded, a fallback rendered, Great Vibes 7% — not loaded, a fallback rendered. Weights: 400 95%, 700 5%.
- System: 9 distinct spacing values (56% on a 4px grid); radii 20px×8, pill×2; 3 distinct shadows.
- LCP: `h1` at 364 ms (local, unthrottled — use Lighthouse for a real number). CLS 0.000.
- Transfer: css 4 KB, img 1 KB, script 1 KB, html 3 KB; web fonts loaded: none.
- Dead bands at 1440px (tall strips with no text, media or controls): 464px empty from y=672 — cap tall heroes (`min(100svh, 56rem)`), remove spacers, or give the space a job.
- Heading sizes inverted: h3 36px > h2 24px — the visual outline contradicts the document outline.
- Browser surfaces left at defaults: selection, accent-color, text-underline-offset, tabular numerals, focus-visible, color-scheme.

**Generic-look signals** (review, not rules)
- ◆ Violet/indigo gradients ×2 (of 8 gradients).
- ◆ Emoji used as icons or in headings/controls: "Shop Now ✨", "🌷", "🚚", "💝"
- ◆ Saturated face(s) (list checked 2026-09-28): Poppins 93% [first-wave] — needs a documented reason: a brand asset, or a need no other face meets.
- ◆ One radius (20px) on over 80% of rounded elements — the card-kit look.
- ◆ 100% of text blocks are centred.

### 390px

**Fails**
- ✗ Phone layout viewport widened to 1101px by overflowing content — the page loads zoomed out.
- ✗ Horizontal overflow by 1px
- ✗ Declared font families not available — the page renders in a fallback: Poppins, Great Vibes (font file blocked, 404, or never loaded).
- ✗ No lang attribute on <html>.
- ✗ Console/page errors (4): request failed: https://fonts.googleapis.com/css2?family=Great+Vibes&family=Poppins:wght@300;400;600&display=swap (net::ERR_CERT_AUTHORITY_INVALID) | Failed to load resource: net::ERR_CERT_AUTHORITY_INVALID
- ✗ axe-core: heading-order (moderate, 1), html-has-lang (serious, 1), landmark-one-main (moderate, 1), region (moderate, 7)

**Measurements and warnings**
- 9 text elements sit on an image or gradient — check by eye in the render: `nav > a.cta` (gradient), `section.hero > h1` (gradient), `section.hero > p` (gradient), `section.hero > a.btn` (gradient)
- 4 of 7 controls are under 44px in one dimension (fine for inline links; not for primary actions or nav): `nav > a` 50×16 "Home", `nav > a` 102×16 "Occasions", `nav > a` 58×16 "About", `nav > a.cta` 151×36 "Order Now"
- Heading levels skipped: 1→3 at "Fresh Flowers"
- Missing landmarks: main.
- 1 images without width/height or aspect-ratio (layout shift): logo.svg
- Type sizes carrying text: 96 · 61 · 55 · 49 · 48 · 45 · 36.5 · 34 · 20 · 16 · 14 px (11 distinct). Families (declared): Poppins 93% — not loaded, a fallback rendered, Great Vibes 7% — not loaded, a fallback rendered. Weights: 400 95%, 700 5%.
- Centred text of 3+ lines: `#about > p` (4 lines)
- System: 9 distinct spacing values (56% on a 4px grid); radii 20px×8, pill×2; 3 distinct shadows.
- LCP: `h1` at 392 ms (local, unthrottled — use Lighthouse for a real number). CLS 0.000.
- Transfer: css 4 KB, img 1 KB, script 1 KB, html 3 KB; web fonts loaded: none.
- Phone [thumb]: Primary action pinned in the top third of the phone screen: a regrip for either thumb (1): a.cta "Order Now" — a bottom bar, or in flow after the content it acts on
- Dead bands at 390px (tall strips with no text, media or controls): 1064px empty from y=176; 1200px empty from y=1480 — cap tall heroes (`min(100svh, 56rem)`), remove spacers, or give the space a job.
- Heading sizes inverted: h3 55px > h2 49px — the visual outline contradicts the document outline.
- Heading sizes closer than 1.2× apart: 55→49 — levels that do not read as different.

**Generic-look signals** (review, not rules)
- ◆ Violet/indigo gradients ×2 (of 8 gradients).
- ◆ Emoji used as icons or in headings/controls: "Shop Now ✨", "🌷", "🚚", "💝"
- ◆ Saturated face(s) (list checked 2026-09-28): Poppins 93% [first-wave] — needs a documented reason: a brand asset, or a need no other face meets.
- ◆ One radius (20px) on over 80% of rounded elements — the card-kit look.
- ◆ 100% of text blocks are centred.

## axe across pages

- [serious] html-has-lang — <html> element must have a lang attribute (2 views)
  - / 1440 (+1 more view): `html` — The <html> element does not have a lang attribute
- [moderate] heading-order — Heading levels should only increase by one (2 views)
  - / 1440 (+1 more view): `.card:nth-child(1) > h3` — Heading order invalid
- [moderate] landmark-one-main — Document should have one main landmark (2 views)
  - / 1440 (+1 more view): `html` — Document does not have a main landmark
- [moderate] region — All page content should be contained by landmarks (2 views)
  - / 1440 (+1 more view): `.topbar` — Some page content is not contained by landmarks
  - / 1440 (+1 more view): `.hero` — Some page content is not contained by landmarks
  - / 1440 (+1 more view): `.features` — Some page content is not contained by landmarks
  - / 1440 (+1 more view): `#occasions` — Some page content is not contained by landmarks
  - / 1440 (+1 more view): `.testimonials > h2` — Some page content is not contained by landmarks
  - … 2 more nodes (each view's JSON has them all)

