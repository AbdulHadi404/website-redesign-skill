# Page audit

## /  (marketing)

### 1440px

**Fails**
- ✗ Contrast below WCAG AA on 7 of 22 text elements: `div.col > a.more` ×3 #c9a227 on #ffffff = 2.42:1 (needs 4.5, 13px); `div.accred > span` ×3 #999999 on #ffffff = 2.85:1 (needs 4.5, 13px); `div.wrap > footer` #999999 on #333333 = 4.43:1 (needs 4.5, 11px)
- ✗ Declared font families not available — the page renders in a fallback: Helvetica Neue, Georgia (font file blocked, 404, or never loaded).
- ✗ 2 h1 elements (expect exactly one).
- ✗ axe-core: color-contrast (serious, 7), heading-order (moderate, 1), landmark-one-main (moderate, 1), region (moderate, 5)

**Measurements and warnings**
- 2 text elements sit on an image or gradient — check by eye in the render: `div.slider > h1` (background-image), `div.slider > p` (background-image)
- Heading levels skipped: 1→3 at "Personal Tax"
- Missing landmarks: main.
- No skip link as the first focusable element.
- 4 images without width/height or aspect-ratio (layout shift): logo.svg, , , 
- Type sizes carrying text: 40 · 26 · 15 · 13 · 12 · 11 px (6 distinct). Families (declared): Helvetica Neue 92% — not loaded, a fallback rendered, Georgia 8% — not loaded, a fallback rendered. Weights: 400 93%, 700 7%.
- Long measure (> 85 characters per line): `div.content > p` ~124
- Text under 12px: `div.wrap > div.top` 11px "Call us: | info@hallamprice.co.uk", `div.top > a` 11px "0114 270 0418", `div.wrap > footer` 11px "© 2014 Hallam & Price Chartered Accounta"
- System: 11 distinct spacing values (36% on a 4px grid); radii pill×3; 0 distinct shadows.
- LCP: `h1` at 48 ms (local, unthrottled — use Lighthouse for a real number). CLS 0.000.
- Transfer: css 2 KB, img 1 KB, script 1 KB, html 2 KB; web fonts loaded: none.
- Near-miss alignment — text blocks whose left edges sit 1–4px apart (5 shared edges in all): 277px ×2 vs 280px ×2 — put them on one edge or separate them deliberately.
- Browser surfaces left at defaults: selection, accent-color, text-underline-offset, tabular numerals, focus-visible, color-scheme.

**Generic-look signals** (review, not rules)
- ◆ Saturated face(s) (list checked 2026-09-28): Helvetica Neue 92% [first-wave] — needs a documented reason: a brand asset, or a need no other face meets.
- ◆ 3 links/buttons end in an arrow glyph.

### 390px

**Fails**
- ✗ Phone layout viewport widened to 980px by overflowing content — the page loads zoomed out.
- ✗ Contrast below WCAG AA on 6 of 22 text elements: `div.col > a.more` ×3 #c9a227 on #ffffff = 2.42:1 (needs 4.5, 13px); `div.accred > span` ×3 #999999 on #ffffff = 2.85:1 (needs 4.5, 13px)
- ✗ Declared font families not available — the page renders in a fallback: Helvetica Neue, Georgia (font file blocked, 404, or never loaded).
- ✗ 2 h1 elements (expect exactly one).
- ✗ axe-core: color-contrast (serious, 6), heading-order (moderate, 1), landmark-one-main (moderate, 1), region (moderate, 5)

**Measurements and warnings**
- 2 text elements sit on an image or gradient — check by eye in the render: `div.slider > h1` (background-image), `div.slider > p` (background-image)
- 8 of 9 controls are under 44px in one dimension (fine for inline links; not for primary actions or nav): `nav > a` 64×34 "Home", `nav > a` 88×34 "Services", `nav > a` 59×34 "Fees", `nav > a` 92×34 "Our Team", `nav > a` 86×34 "Contact", `div.col > a.more` 78×15 "Read more »", …
- Heading levels skipped: 1→3 at "Personal Tax"
- Missing landmarks: main.
- 4 images without width/height or aspect-ratio (layout shift): logo.svg, , , 
- Type sizes carrying text: 48.5 · 40 · 35.5 · 30 · 15 · 13 · 12 px (7 distinct). Families (declared): Helvetica Neue 92% — not loaded, a fallback rendered, Georgia 8% — not loaded, a fallback rendered. Weights: 400 93%, 700 7%.
- System: 11 distinct spacing values (36% on a 4px grid); radii pill×3; 0 distinct shadows.
- LCP: `p` at 48 ms (local, unthrottled — use Lighthouse for a real number). CLS 0.000.
- Transfer: css 2 KB, img 1 KB, script 1 KB, html 2 KB; web fonts loaded: none.
- Near-miss alignment — text blocks whose left edges sit 1–4px apart (5 shared edges in all): 47px ×2 vs 50px ×2 — put them on one edge or separate them deliberately.

**Generic-look signals** (review, not rules)
- ◆ Saturated face(s) (list checked 2026-09-28): Helvetica Neue 92% [first-wave] — needs a documented reason: a brand asset, or a need no other face meets.
- ◆ 3 links/buttons end in an arrow glyph.

## /services/  (marketing)

### 1440px

**Fails**
- ✗ Contrast below WCAG AA on 4 of 22 text elements: `div.accred > span` ×3 #999999 on #ffffff = 2.85:1 (needs 4.5, 13px); `div.wrap > footer` #999999 on #333333 = 4.43:1 (needs 4.5, 11px)
- ✗ Declared font families not available — the page renders in a fallback: Helvetica Neue (font file blocked, 404, or never loaded).
- ✗ axe-core: color-contrast (serious, 4), heading-order (moderate, 1), landmark-one-main (moderate, 1), region (moderate, 3)

**Measurements and warnings**
- Heading levels skipped: 1→3 at "Personal tax"
- Missing landmarks: main.
- No skip link as the first focusable element.
- 1 images without width/height or aspect-ratio (layout shift): logo.svg
- Type sizes carrying text: 26 · 15 · 13 · 12 · 11 px (5 distinct). Families (declared): Helvetica Neue 98% — not loaded, a fallback rendered, Georgia 2%. Weights: 400 84%, 700 16%.
- Text under 12px: `div.wrap > div.top` 11px "Call us: | info@hallamprice.co.uk", `div.top > a` 11px "0114 270 0418", `div.wrap > footer` 11px "© 2014 Hallam & Price Chartered Accounta"
- System: 9 distinct spacing values (22% on a 4px grid); radii ; 0 distinct shadows.
- LCP: `img` at 56 ms (local, unthrottled — use Lighthouse for a real number). CLS 0.052.
- Transfer: css 2 KB, img 1 KB, script 1 KB, fetch 1 KB, html 1 KB; web fonts loaded: none.
- Browser surfaces left at defaults: selection, accent-color, text-underline-offset, tabular numerals, focus-visible, color-scheme.

**Generic-look signals** (review, not rules)
- ◆ Saturated face(s) (list checked 2026-09-28): Helvetica Neue 98% [first-wave] — needs a documented reason: a brand asset, or a need no other face meets.

### 390px

**Fails**
- ✗ Phone layout viewport widened to 980px by overflowing content — the page loads zoomed out.
- ✗ Contrast below WCAG AA on 4 of 22 text elements: `div.accred > span` ×3 #999999 on #ffffff = 2.85:1 (needs 4.5, 13px); `div.wrap > footer` #999999 on #333333 = 4.43:1 (needs 4.5, 11px)
- ✗ Declared font families not available — the page renders in a fallback: Helvetica Neue (font file blocked, 404, or never loaded).
- ✗ axe-core: color-contrast (serious, 4), heading-order (moderate, 1), landmark-one-main (moderate, 1), region (moderate, 3)

**Measurements and warnings**
- 5 of 6 controls are under 44px in one dimension (fine for inline links; not for primary actions or nav): `nav > a` 64×34 "Home", `nav > a` 88×34 "Services", `nav > a` 59×34 "Fees", `nav > a` 92×34 "Our Team", `nav > a` 86×34 "Contact"
- Heading levels skipped: 1→3 at "Personal tax"
- Missing landmarks: main.
- 1 images without width/height or aspect-ratio (layout shift): logo.svg
- Type sizes carrying text: 41.5 · 35.5 · 30 · 26 · 13 · 12 · 11 px (7 distinct). Families (declared): Helvetica Neue 98% — not loaded, a fallback rendered, Georgia 2%. Weights: 400 84%, 700 16%.
- Text under 12px: `div.wrap > footer` 11px "© 2014 Hallam & Price Chartered Accounta"
- System: 9 distinct spacing values (22% on a 4px grid); radii ; 0 distinct shadows.
- LCP: `p` at 36 ms (local, unthrottled — use Lighthouse for a real number). CLS 0.052.
- Transfer: css 2 KB, img 1 KB, script 1 KB, fetch 1 KB, html 1 KB; web fonts loaded: none.
- Heading sizes inverted: h3 42px > h1 26px — the visual outline contradicts the document outline.

**Generic-look signals** (review, not rules)
- ◆ Saturated face(s) (list checked 2026-09-28): Helvetica Neue 98% [first-wave] — needs a documented reason: a brand asset, or a need no other face meets.

## /fees/  (marketing)

### 1440px

**Fails**
- ✗ Contrast below WCAG AA on 5 of 14 text elements: `p > a.more` #c9a227 on #ffffff = 2.42:1 (needs 4.5, 13px); `div.accred > span` ×3 #999999 on #ffffff = 2.85:1 (needs 4.5, 13px); `div.wrap > footer` #999999 on #333333 = 4.43:1 (needs 4.5, 11px)
- ✗ Declared font families not available — the page renders in a fallback: Helvetica Neue (font file blocked, 404, or never loaded).
- ✗ Console/page errors (1): uncaught: hpTrack is not defined
- ✗ axe-core: color-contrast (serious, 5), landmark-one-main (moderate, 1), region (moderate, 5)

**Measurements and warnings**
- Missing landmarks: main.
- No skip link as the first focusable element.
- 1 images without width/height or aspect-ratio (layout shift): logo.svg
- Type sizes carrying text: 26 · 13 · 12 · 11 px (4 distinct). Families (declared): Helvetica Neue 98% — not loaded, a fallback rendered, Georgia 2%. Weights: 400 87%, 700 13%.
- Text under 12px: `div.wrap > div.top` 11px "Call us: | info@hallamprice.co.uk", `div.top > a` 11px "0114 270 0418", `div.wrap > footer` 11px "© 2014 Hallam & Price Chartered Accounta"
- System: 8 distinct spacing values (25% on a 4px grid); radii ; 0 distinct shadows.
- LCP: `p` at 40 ms (local, unthrottled — use Lighthouse for a real number). CLS 0.000.
- Transfer: css 2 KB, img 1 KB, script 1 KB, html 1 KB; web fonts loaded: none.
- Browser surfaces left at defaults: selection, accent-color, text-underline-offset, tabular numerals, focus-visible, color-scheme.

**Generic-look signals** (review, not rules)
- ◆ Saturated face(s) (list checked 2026-09-28): Helvetica Neue 98% [first-wave] — needs a documented reason: a brand asset, or a need no other face meets.

### 390px

**Fails**
- ✗ Phone layout viewport widened to 980px by overflowing content — the page loads zoomed out.
- ✗ Contrast below WCAG AA on 4 of 14 text elements: `p > a.more` #c9a227 on #ffffff = 2.42:1 (needs 3, 35.5px); `div.accred > span` ×3 #999999 on #ffffff = 2.85:1 (needs 4.5, 13px)
- ✗ Declared font families not available — the page renders in a fallback: Helvetica Neue (font file blocked, 404, or never loaded).
- ✗ Console/page errors (1): uncaught: hpTrack is not defined
- ✗ axe-core: color-contrast (serious, 4), landmark-one-main (moderate, 1), region (moderate, 5)

**Measurements and warnings**
- 6 of 7 controls are under 44px in one dimension (fine for inline links; not for primary actions or nav): `nav > a` 64×34 "Home", `nav > a` 88×34 "Services", `nav > a` 59×34 "Fees", `nav > a` 92×34 "Our Team", `nav > a` 86×34 "Contact", `p > a.more` 595×40 "Download our fee schedul"
- Missing landmarks: main.
- 1 images without width/height or aspect-ratio (layout shift): logo.svg
- Type sizes carrying text: 35.5 · 30 · 26 · 13 · 12 px (5 distinct). Families (declared): Helvetica Neue 98% — not loaded, a fallback rendered, Georgia 2%. Weights: 400 87%, 700 13%.
- System: 8 distinct spacing values (25% on a 4px grid); radii ; 0 distinct shadows.
- LCP: `footer` at 32 ms (local, unthrottled — use Lighthouse for a real number). CLS 0.000.
- Transfer: css 2 KB, img 1 KB, script 1 KB, html 1 KB; web fonts loaded: none.

**Generic-look signals** (review, not rules)
- ◆ Saturated face(s) (list checked 2026-09-28): Helvetica Neue 98% [first-wave] — needs a documented reason: a brand asset, or a need no other face meets.

## /team/  (marketing)

### 1440px

**Fails**
- ✗ Contrast below WCAG AA on 4 of 17 text elements: `div.accred > span` ×3 #999999 on #ffffff = 2.85:1 (needs 4.5, 13px); `div.wrap > footer` #999999 on #333333 = 4.43:1 (needs 4.5, 11px)
- ✗ Declared font families not available — the page renders in a fallback: Helvetica Neue (font file blocked, 404, or never loaded).
- ✗ axe-core: color-contrast (serious, 4), heading-order (moderate, 1), landmark-one-main (moderate, 1), region (moderate, 3)

**Measurements and warnings**
- Heading levels skipped: 1→3 at "David Hallam FCA — Partner"
- Missing landmarks: main.
- No skip link as the first focusable element.
- 1 images without width/height or aspect-ratio (layout shift): logo.svg
- Type sizes carrying text: 26 · 15 · 13 · 12 · 11 px (5 distinct). Families (declared): Helvetica Neue 99% — not loaded, a fallback rendered, Georgia 1%. Weights: 400 86%, 700 14%.
- Text under 12px: `div.wrap > div.top` 11px "Call us: | info@hallamprice.co.uk", `div.top > a` 11px "0114 270 0418", `div.wrap > footer` 11px "© 2014 Hallam & Price Chartered Accounta"
- System: 9 distinct spacing values (22% on a 4px grid); radii ; 0 distinct shadows.
- LCP: `img` at 36 ms (local, unthrottled — use Lighthouse for a real number). CLS 0.000.
- Transfer: css 2 KB, img 1 KB, script 1 KB, html 2 KB; web fonts loaded: none.
- Browser surfaces left at defaults: selection, accent-color, text-underline-offset, tabular numerals, focus-visible, color-scheme.

**Generic-look signals** (review, not rules)
- ◆ Saturated face(s) (list checked 2026-09-28): Helvetica Neue 99% [first-wave] — needs a documented reason: a brand asset, or a need no other face meets.

### 390px

**Fails**
- ✗ Phone layout viewport widened to 980px by overflowing content — the page loads zoomed out.
- ✗ Contrast below WCAG AA on 3 of 17 text elements: `div.accred > span` ×3 #999999 on #ffffff = 2.85:1 (needs 4.5, 13px)
- ✗ Declared font families not available — the page renders in a fallback: Helvetica Neue (font file blocked, 404, or never loaded).
- ✗ axe-core: color-contrast (serious, 3), heading-order (moderate, 1), landmark-one-main (moderate, 1), region (moderate, 3)

**Measurements and warnings**
- 5 of 6 controls are under 44px in one dimension (fine for inline links; not for primary actions or nav): `nav > a` 64×34 "Home", `nav > a` 88×34 "Services", `nav > a` 59×34 "Fees", `nav > a` 92×34 "Our Team", `nav > a` 86×34 "Contact"
- Heading levels skipped: 1→3 at "David Hallam FCA — Partner"
- Missing landmarks: main.
- 1 images without width/height or aspect-ratio (layout shift): logo.svg
- Type sizes carrying text: 48.5 · 41.5 · 35.5 · 30 · 13 · 12 px (6 distinct). Families (declared): Helvetica Neue 99% — not loaded, a fallback rendered, Georgia 1%. Weights: 400 86%, 700 14%.
- System: 9 distinct spacing values (22% on a 4px grid); radii ; 0 distinct shadows.
- LCP: `p` at 36 ms (local, unthrottled — use Lighthouse for a real number). CLS 0.000.
- Transfer: css 2 KB, img 1 KB, script 1 KB, html 2 KB; web fonts loaded: none.
- Heading sizes closer than 1.2× apart: 49→42 — levels that do not read as different.

**Generic-look signals** (review, not rules)
- ◆ Saturated face(s) (list checked 2026-09-28): Helvetica Neue 99% [first-wave] — needs a documented reason: a brand asset, or a need no other face meets.

## /contact/  (marketing)

### 1440px

**Fails**
- ✗ Contrast below WCAG AA on 4 of 25 text elements: `div.accred > span` ×3 #999999 on #ffffff = 2.85:1 (needs 4.5, 13px); `div.wrap > footer` #999999 on #333333 = 4.43:1 (needs 4.5, 11px)
- ✗ Declared font families not available — the page renders in a fallback: Helvetica Neue (font file blocked, 404, or never loaded).
- ✗ Console/page errors (1): uncaught: hpTrack is not defined
- ✗ axe-core: color-contrast (serious, 4), heading-order (moderate, 1), label (critical, 5), landmark-one-main (moderate, 1), region (moderate, 16), select-name (critical, 5)

**Measurements and warnings**
- Heading levels skipped: 1→3 at "Find us"
- Missing landmarks: main.
- No skip link as the first focusable element.
- 1 images without width/height or aspect-ratio (layout shift): logo.svg
- Type sizes carrying text: 26 · 15 · 13 · 12 · 11 px (5 distinct). Families (declared): Helvetica Neue 98% — not loaded, a fallback rendered, Georgia 2%. Weights: 400 93%, 700 7%.
- Text under 12px: `div.wrap > div.top` 11px "Call us: | info@hallamprice.co.uk", `div.top > a` 11px "0114 270 0418", `div.wrap > footer` 11px "© 2014 Hallam & Price Chartered Accounta"
- System: 9 distinct spacing values (22% on a 4px grid); radii ; 0 distinct shadows.
- LCP: `img` at 56 ms (local, unthrottled — use Lighthouse for a real number). CLS 0.000.
- Transfer: css 2 KB, img 1 KB, script 1 KB, html 3 KB; web fonts loaded: none.
- Browser surfaces left at defaults: selection, accent-color, text-underline-offset, tabular numerals, focus-visible, color-scheme.

**Generic-look signals** (review, not rules)
- ◆ Saturated face(s) (list checked 2026-09-28): Helvetica Neue 98% [first-wave] — needs a documented reason: a brand asset, or a need no other face meets.

### 390px

**Fails**
- ✗ Phone layout viewport widened to 980px by overflowing content — the page loads zoomed out.
- ✗ Contrast below WCAG AA on 3 of 25 text elements: `div.accred > span` ×3 #999999 on #ffffff = 2.85:1 (needs 4.5, 13px)
- ✗ Declared font families not available — the page renders in a fallback: Helvetica Neue (font file blocked, 404, or never loaded).
- ✗ Console/page errors (1): uncaught: hpTrack is not defined
- ✗ axe-core: color-contrast (serious, 3), heading-order (moderate, 1), label (critical, 5), landmark-one-main (moderate, 1), region (moderate, 16), select-name (critical, 5)

**Measurements and warnings**
- 15 of 17 controls are under 44px in one dimension (fine for inline links; not for primary actions or nav): `nav > a` 64×34 "Home", `nav > a` 88×34 "Services", `nav > a` 59×34 "Fees", `nav > a` 92×34 "Our Team", `nav > a` 86×34 "Contact", `td > input` 314×28, …
- Heading levels skipped: 1→3 at "Find us"
- Missing landmarks: main.
- 1 images without width/height or aspect-ratio (layout shift): logo.svg
- Type sizes carrying text: 48.5 · 41.5 · 35.5 · 30 · 13 · 12 px (6 distinct). Families (declared): Helvetica Neue 98% — not loaded, a fallback rendered, Georgia 2%. Weights: 400 93%, 700 7%.
- System: 9 distinct spacing values (22% on a 4px grid); radii ; 0 distinct shadows.
- LCP: `footer` at 44 ms (local, unthrottled — use Lighthouse for a real number). CLS 0.000.
- Transfer: css 2 KB, img 1 KB, script 1 KB, html 3 KB; web fonts loaded: none.
- Phone [keyboards]: Fields that bring the wrong keyboard, miss autofill, or zoom the page on focus (9): [name=name] (name): font-size 12px: iOS Safari zooms the page on focus; [name=email] (email): email field brings the "text" keyboard; expected email; [name=email] (email): autocomplete="email" missing (autofill); [name=email] (email): font-size 12px: iOS Safari zooms the page on focus; [name=phone] (phone): tel field brings the "text" keyboard; expected tel; [name=phone] (phone): autocomplete="tel" missing (autofill); … 3 more
- Heading sizes closer than 1.2× apart: 49→42 — levels that do not read as different.

**Generic-look signals** (review, not rules)
- ◆ Saturated face(s) (list checked 2026-09-28): Helvetica Neue 98% [first-wave] — needs a documented reason: a brand asset, or a need no other face meets.

## axe across pages

- [critical] label — Form elements must have labels (2 views)
  - /contact/ 1440 (+1 more view): `input[name="name"]` — Element does not have an implicit (wrapped) <label>
  - /contact/ 1440 (+1 more view): `input[name="email"]` — Element does not have an implicit (wrapped) <label>
  - /contact/ 1440 (+1 more view): `input[name="phone"]` — Element does not have an implicit (wrapped) <label>
  - /contact/ 1440 (+1 more view): `input[name="business_name"]` — Element does not have an implicit (wrapped) <label>
  - /contact/ 1440 (+1 more view): `textarea` — Element does not have an implicit (wrapped) <label>
- [critical] select-name — Select element must have an accessible name (2 views)
  - /contact/ 1440 (+1 more view): `select[name="business_type"]` — Element does not have an implicit (wrapped) <label>
  - /contact/ 1440 (+1 more view): `select[name="turnover"]` — Element does not have an implicit (wrapped) <label>
  - /contact/ 1440 (+1 more view): `select[name="service"]` — Element does not have an implicit (wrapped) <label>
  - /contact/ 1440 (+1 more view): `select[name="preferred_contact"]` — Element does not have an implicit (wrapped) <label>
  - /contact/ 1440 (+1 more view): `select[name="how_heard"]` — Element does not have an implicit (wrapped) <label>
- [serious] color-contrast — Elements must meet minimum color contrast ratio thresholds (10 views)
  - / 1440 (+1 more view): `.col:nth-child(1) > .more[href$="services/"]` — Element has insufficient color contrast of 2.41 (foreground color: #c9a227, background color: #ffffff, font size: 9.8pt (13px), font weight: bold). Expected contrast ratio of 4.5:1
  - / 1440 (+1 more view): `.col:nth-child(2) > .more[href$="services/"]` — Element has insufficient color contrast of 2.41 (foreground color: #c9a227, background color: #ffffff, font size: 9.8pt (13px), font weight: bold). Expected contrast ratio of 4.5:1
  - / 1440 (+1 more view): `a[href="#"]` — Element has insufficient color contrast of 2.41 (foreground color: #c9a227, background color: #ffffff, font size: 9.8pt (13px), font weight: bold). Expected contrast ratio of 4.5:1
  - / 1440 (+1 more view): `.accred > span:nth-child(1)` — Element has insufficient color contrast of 2.84 (foreground color: #999999, background color: #ffffff, font size: 9.8pt (13px), font weight: normal). Expected contrast ratio of 4.5:1
  - / 1440 (+1 more view): `.accred > span:nth-child(2)` — Element has insufficient color contrast of 2.84 (foreground color: #999999, background color: #ffffff, font size: 9.8pt (13px), font weight: normal). Expected contrast ratio of 4.5:1
  - … 7 more nodes (each view's JSON has them all)
- [moderate] landmark-one-main — Document should have one main landmark (10 views)
  - / 1440 (+9 more views): `html` — Document does not have a main landmark
- [moderate] region — All page content should be contained by landmarks (10 views)
  - / 1440 (+9 more views): `.top` — Some page content is not contained by landmarks
  - / 1440 (+1 more view): `.slider` — Some page content is not contained by landmarks
  - / 1440 (+1 more view): `.cols` — Some page content is not contained by landmarks
  - / 1440 (+5 more views): `.content` — Some page content is not contained by landmarks
  - / 1440 (+9 more views): `.accred` — Some page content is not contained by landmarks
  - … 15 more nodes (each view's JSON has them all)
- [moderate] heading-order — Heading levels should only increase by one (8 views)
  - / 1440 (+1 more view): `.col:nth-child(1) > h3` — Heading order invalid
  - /services/ 1440 (+1 more view): `h3:nth-child(1)` — Heading order invalid
  - /team/ 1440 (+1 more view): `h3:nth-child(2)` — Heading order invalid
  - /contact/ 1440 (+1 more view): `h3` — Heading order invalid

