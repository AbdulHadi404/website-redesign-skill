# Phase 4 — Imagery

Imagery is optional. Decide from the concept whether photography, product UI, illustration, diagrams or pure typography carries this brand — then execute that decision fully. What is never acceptable is imagery by default: a stock photo per section because sections "need something".

## When photography earns its place

- It shows the customer's world or the moment the product serves (people mid-task, the environment, the object).
- It embodies the concept abstractly (wires for signal, paper for records, light for speed).
- It opens or closes a chapter and gives the page a visible change of surface.
- It is treated consistently so three photos read as one series, not three sources.

## When it does not

- The product's own UI is the strongest visual asset — show that instead, large.
- The brand is typographic, technical or data-driven; photography would dilute it.
- Only generic stock is available for the subject.

## Sourcing

Use sources whose licence permits commercial use without attribution obligations you cannot meet. Unsplash (the standard Unsplash License), Pexels and Pixabay are the usual free options; check each site's current licence text before relying on it, and record it.

Watch for paid tiers mixed into results: on Unsplash, files served from `plus.unsplash.com` (`premium_photo-…`) are Unsplash+ and not free — only `images.unsplash.com/photo-…` files are under the free licence. Other sources have similar splits.

Search by *subject in the customer's world*, not by mood words. Inspect candidates at thumbnail size before downloading; pick for composition (where the subject sits, where copy could go), light, and how it will take the treatment.

## Sourcing in practice (when the search pages fight back)

Stock libraries defend their search pages against automation, and each one fails differently: Unsplash serves a proof-of-work bot wall to headless requests, its `napi` search returns nothing without a browser session, and Pexels answers a plain fetch with a Cloudflare challenge. What works:

- Drive a **real browser context** (headless is fine) with a desktop user agent, one search per fresh context, a pause of a few seconds after load, and a scroll to trigger the lazy grid. Read the image `src` values out of the DOM — the ids are in the path — rather than parsing markup.
- Pull the candidates at a working width and **build contact sheets** (a grid of thumbnails with their ids). Choose from the sheet, by composition and light — never from titles, and never one image at a time.
- Download the chosen frames at the width the design needs, then check the licence on each photo's own page before it ships.

If none of that is possible, say so and name the capability that would help; do not ship placeholders.

## Localise and process

- Download originals at the largest size you need (2000–2400px wide is enough for full-bleed at 2× density in most cases) into the project's asset system — never hot-link a search-result URL.
- **Bake the treatment, do not layer it.** A duotone (or black-and-white, or a tint) applied in code to every frame — convert to luminance, autocontrast, map black and white to two brand colours — is what makes eight photographs from four sources read as one series. Export two widths (a desktop and a phone one) in a modern format and let the markup pick with `<source media>`; a treatment left to CSS filters costs paint time and cannot be checked in a still.
- Apply one treatment to the whole set so it reads as a series: black and white, a duotone, a consistent crop, a consistent tint. Bake expensive treatments into the file; apply cheap ones (a colour overlay, a gradient fade) in CSS so they stay adjustable.
- Serve through the framework's image pipeline (responsive widths, modern formats, explicit width and height to avoid layout shift). Hero image eager with high fetch priority; everything below the fold lazy.
- Keep total image weight sane: one hero at ~150–300 KB in a modern format is normal; a page with several megabytes of photography is not.
- Record credits and licence in a `CREDITS.md` next to the assets even when attribution is not required — it is cheap and the user may need it later.

## Text over photographs

Copy needs its own ground. The reliable patterns:

- **Split composition**: copy on a solid surface for one part of the width, the photograph filling the rest and bleeding off the edge, with a soft gradient seam. Stack them on narrow screens.
- **Fade to surface**: the photograph dissolves into the surface colour under the copy area.
- **Panel over image**: a solid or near-solid panel behind the copy.

What does not work: copy placed on the busy or bright part of an image with a translucent overlay and hope. Check the render at every width, because the crop moves.

## If you cannot fetch images

Say so, name the capability that would help (a browser tool to search and preview, plus file download or a fetch-capable runtime), and ask the user to enable it or to provide images. Do not ship placeholders, and do not silently fall back to a design that needed the imagery.

## Other visual assets

- **Product UI**: prefer real screenshots captured from the running product; otherwise rebuild real screens as HTML fragments with obviously illustrative sample data.
- **Illustration / 3D**: only with real assets or a clear plan to produce them; never a mismatched free illustration set.
- **Diagrams**: draw the actual mechanism (what flows where); animate the flow if it helps understanding.
- **Logos and marks**: keep a motif with meaning, recolour it into the new system; regenerate favicon and social image so the identity is consistent everywhere.
