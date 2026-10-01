# Page audit

## /order/  (app, as configurator)

### 1440px

**Fails**
- ✗ Contrast below WCAG AA on 1 of 16 text elements: `fieldset > p.small` #bbbbbb on #ffffff = 1.92:1 (needs 4.5, 11px)
- ✗ Declared font families not available — the page renders in a fallback: Poppins, Great Vibes (font file blocked, 404, or never loaded).
- ✗ No lang attribute on <html>.
- ✗ Console/page errors (4): request failed: https://fonts.googleapis.com/css2?family=Great+Vibes&family=Poppins:wght@300;400;600&display=swap (net::ERR_CERT_AUTHORITY_INVALID) | Failed to load resource: net::ERR_CERT_AUTHORITY_INVALID
- ✗ axe-core: color-contrast (serious, 21), html-has-lang (serious, 1), landmark-one-main (moderate, 1), region (moderate, 9), select-name (critical, 6)

**Measurements and warnings**
- 2 text elements sit on an image or gradient — check by eye in the render: `nav > a.cta` (gradient), `#order > button.submit` (gradient)
- Missing landmarks: main.
- No skip link as the first focusable element.
- 1 images without width/height or aspect-ratio (layout shift): logo.svg
- Type sizes carrying text: 64 · 18 · 16 · 14 · 13 · 12 · 11 px (7 distinct). Families (declared): Poppins 95% — not loaded, a fallback rendered, Great Vibes 5% — not loaded, a fallback rendered. Weights: 400 83%, 600 17%.
- Text under 12px: `fieldset > p.small` 11px "Choose up to 3 flower types. Enter the c"
- System: 9 distinct spacing values (44% on a 4px grid); radii 8px×20, 12px×6, pill×2; 1 distinct shadows.
- LCP: `h1` at 352 ms (local, unthrottled — use Lighthouse for a real number). CLS 0.025.
- Transfer: css 4 KB, img 1 KB, script 4 KB, fetch 3 KB, html 3 KB; web fonts loaded: none.
- Browser surfaces left at defaults: selection, accent-color, text-underline-offset, tabular numerals, focus-visible, color-scheme.

**Generic-look signals** (review, not rules)
- ◆ Emoji used as icons or in headings/controls: "Place Order 💐"
- ◆ 6 card containers (rounded + shadow/border) — check each holds card-shaped content.
- ◆ Saturated face(s) (list checked 2026-09-28): Poppins 95% [first-wave] — needs a documented reason: a brand asset, or a need no other face meets.
- ◆ Largest text is 64px in an app view — work tools rarely need more than 24–28px; the page title names the place and scope.
- ◆ 6 card containers hold 73% of the text — collections belong in tables and lists; name one elevation model.
- ◆ Body 16px with controls ≥ 40px — marketing density in a desk work tool (apps: 13–14px body, 28–32px controls; a field tool used with gloves is different: --kind field).

### 390px

**Fails**
- ✗ Phone layout viewport widened to 1101px by overflowing content — the page loads zoomed out.
- ✗ Horizontal overflow by 1px
- ✗ Contrast below WCAG AA on 1 of 16 text elements: `fieldset > p.small` #bbbbbb on #ffffff = 1.92:1 (needs 4.5, 11px)
- ✗ Declared font families not available — the page renders in a fallback: Poppins, Great Vibes (font file blocked, 404, or never loaded).
- ✗ No lang attribute on <html>.
- ✗ Console/page errors (4): request failed: https://fonts.googleapis.com/css2?family=Great+Vibes&family=Poppins:wght@300;400;600&display=swap (net::ERR_CERT_AUTHORITY_INVALID) | Failed to load resource: net::ERR_CERT_AUTHORITY_INVALID
- ✗ axe-core: color-contrast (serious, 21), html-has-lang (serious, 1), landmark-one-main (moderate, 1), region (moderate, 9), select-name (critical, 6)

**Measurements and warnings**
- 2 text elements sit on an image or gradient — check by eye in the render: `nav > a.cta` (gradient), `#order > button.submit` (gradient)
- 22 of 27 controls are under 44px in one dimension (fine for inline links; not for primary actions or nav): `nav > a` 50×16 "Home", `nav > a` 102×16 "Occasions", `nav > a` 58×16 "About", `nav > a.cta` 151×36 "Order Now", `div.field > select` 638×41 "-- Choose size --PetiteC", `div.field > select` 205×41 "-- Flower 1 --Garden ros", …
- Missing landmarks: main.
- 1 images without width/height or aspect-ratio (layout shift): logo.svg
- Type sizes carrying text: 64 · 18 · 16 · 14 · 13 · 12 · 11 px (7 distinct). Families (declared): Poppins 95% — not loaded, a fallback rendered, Great Vibes 5% — not loaded, a fallback rendered. Weights: 400 83%, 600 17%.
- Text under 12px: `fieldset > p.small` 11px "Choose up to 3 flower types. Enter the c"
- System: 9 distinct spacing values (44% on a 4px grid); radii 8px×20, 12px×6, pill×2; 1 distinct shadows.
- LCP: `h1` at 368 ms (local, unthrottled — use Lighthouse for a real number). CLS 0.000.
- Transfer: css 4 KB, img 1 KB, script 4 KB, fetch 3 KB, html 3 KB; web fonts loaded: none.
- Phone [keyboards]: Fields that bring the wrong keyboard, miss autofill, or zoom the page on focus (5): [name=delivery_postcode] (Postcode): autocomplete="postal-code" missing (autofill); [name=sender_email] (Email): email field brings the "text" keyboard; expected email; [name=sender_email] (Email): autocomplete="email" missing (autofill); [name=sender_phone] (Phone): tel field brings the "text" keyboard; expected tel; [name=sender_phone] (Phone): autocomplete="tel" missing (autofill)
- Phone [safe-area]: No viewport-fit=cover: the browser keeps the page inside the safe area, so the fixed bars cannot sit under the notch or the home indicator (choose cover only for an edge-to-edge design, then pad the bars with env()) — check the bars on a device (information)
- Phone [thumb]: Primary action pinned in the top third of the phone screen: a regrip for either thumb (1): a.cta "Order Now" — a bottom bar, or in flow after the content it acts on

**Generic-look signals** (review, not rules)
- ◆ Emoji used as icons or in headings/controls: "Place Order 💐"
- ◆ 6 card containers (rounded + shadow/border) — check each holds card-shaped content.
- ◆ Saturated face(s) (list checked 2026-09-28): Poppins 95% [first-wave] — needs a documented reason: a brand asset, or a need no other face meets.
- ◆ Largest text is 64px in an app view — work tools rarely need more than 24–28px; the page title names the place and scope.
- ◆ 6 card containers hold 73% of the text — collections belong in tables and lists; name one elevation model.
- ◆ Body 16px with controls ≥ 40px — marketing density in a desk work tool (apps: 13–14px body, 28–32px controls; a field tool used with gloves is different: --kind field).

## axe across pages

- [critical] select-name — Select element must have an accessible name (2 views)
  - /order/ 1440 (+1 more view): `select[name="size"]` — Element does not have an implicit (wrapped) <label>
  - /order/ 1440 (+1 more view): `select[name="flower1"]` — Element does not have an implicit (wrapped) <label>
  - /order/ 1440 (+1 more view): `select[name="flower2"]` — Element does not have an implicit (wrapped) <label>
  - /order/ 1440 (+1 more view): `select[name="flower3"]` — Element does not have an implicit (wrapped) <label>
  - /order/ 1440 (+1 more view): `#wrap` — Element does not have an implicit (wrapped) <label>
  - … 1 more node (each view's JSON has them all)
- [serious] color-contrast — Elements must meet minimum color contrast ratio thresholds (2 views)
  - /order/ 1440 (+1 more view): `select[name="size"]` — Element has insufficient color contrast of 2.47 (foreground color: #999999, background color: #efefef, font size: 12.0pt (16px), font weight: normal). Expected contrast ratio of 4.5:1
  - /order/ 1440 (+1 more view): `select[name="flower1"]` — Element has insufficient color contrast of 2.47 (foreground color: #999999, background color: #efefef, font size: 12.0pt (16px), font weight: normal). Expected contrast ratio of 4.5:1
  - /order/ 1440 (+1 more view): `input[name="colour1"]` — Element has insufficient color contrast of 2.84 (foreground color: #999999, background color: #ffffff, font size: 12.0pt (16px), font weight: normal). Expected contrast ratio of 4.5:1
  - /order/ 1440 (+1 more view): `input[name="count1"]` — Element has insufficient color contrast of 2.84 (foreground color: #999999, background color: #ffffff, font size: 12.0pt (16px), font weight: normal). Expected contrast ratio of 4.5:1
  - /order/ 1440 (+1 more view): `select[name="flower2"]` — Element has insufficient color contrast of 2.47 (foreground color: #999999, background color: #efefef, font size: 12.0pt (16px), font weight: normal). Expected contrast ratio of 4.5:1
  - … 16 more nodes (each view's JSON has them all)
- [serious] html-has-lang — <html> element must have a lang attribute (2 views)
  - /order/ 1440 (+1 more view): `html` — The <html> element does not have a lang attribute
- [moderate] landmark-one-main — Document should have one main landmark (2 views)
  - /order/ 1440 (+1 more view): `html` — Document does not have a main landmark
- [moderate] region — All page content should be contained by landmarks (2 views)
  - /order/ 1440 (+1 more view): `.topbar` — Some page content is not contained by landmarks
  - /order/ 1440 (+1 more view): `h1` — Some page content is not contained by landmarks
  - /order/ 1440 (+1 more view): `.form-wrap > p` — Some page content is not contained by landmarks
  - /order/ 1440 (+1 more view): `fieldset:nth-child(1)` — Some page content is not contained by landmarks
  - /order/ 1440 (+1 more view): `fieldset:nth-child(2)` — Some page content is not contained by landmarks
  - … 4 more nodes (each view's JSON has them all)

