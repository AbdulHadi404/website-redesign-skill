# Imagery

Read in Phase 3 (the imagery strategy, `art-direction.md` §4) and Phase 5 (sourcing, processing and placing it). Imagery is optional. Decide from the concept whether photography, product UI, illustration, diagrams or pure typography carries this brand — then execute that decision fully. What is never acceptable is imagery by default: a stock photo per section because sections "need something".

## When photography earns its place

- It shows the customer's world or the moment the product serves (people mid-task, the environment, the object).
- It embodies the concept abstractly (wires for signal, paper for records, light for speed).
- It opens or closes a chapter and gives the page a visible change of surface.
- It is treated consistently so three photos read as one series, not three sources.

## When it does not

- The product's own UI is the strongest visual asset — show that instead, large.
- The brand is typographic, technical or data-driven; photography would dilute it.
- Only generic stock is available for the subject.
- The product is the maker's own work (tiles, ceramics, furniture, prints): a stock photograph shows *another* maker's product on this maker's shop — a truth problem, not a taste one. Draw or render the real product, or use the owners' photographs ("The client's own photographs") or wait for them.
- Inside a productive work area: photography there is decoration competing with data. Product imagery (charts, the board) is the only imagery an app needs, and sign-in gets at most one abstract graphic derived from the mark or the product, never the marketing hero photograph (`app-ui.md` §12).

## Sourcing

Use sources whose licence permits commercial use without attribution obligations you cannot meet (licence classes and the full list: `resources/README.md`, `resources/assets.md`). Unsplash (the standard Unsplash License), Pexels and Pixabay are the usual free options; check each site's current licence text before relying on it, and record it. Pixabay now accepts AI-generated uploads (filter them out) and its images showing trademarks cannot be used commercially; Kaboompics "Editorial Use Only" images are excluded from marketing; the Unsplash *API* requires hotlinking and credit, unlike a downloaded image used under the licence.

**The antidote to stock sameness is the archive.** Museum open-access collections — the Met, the Smithsonian, the Rijksmuseum (CC0 for marked works), the Library of Congress "Free to Use" sets — hold engravings, maps, botanical plates, industrial photography and posters. Under one baked treatment they read as art direction rather than stock, and suit editorial, heritage and industrial brands. NASA imagery is generally public domain (its insignia is not); ESA/Hubble and ESA/Webb images are CC BY 4.0 with a mandatory visible credit.

**AI-generated imagery**: never customers, team members, testimonials, offices or product results — it is dishonest, it is not copyrightable (US Copyright Office, 2025), and realistic AI images of real people, places or events must be disclosed in the EU from August 2026. Acceptable: abstract textures the brand owns the idea of, labelled as such.

Watch for paid tiers mixed into results: on Unsplash, files served from `plus.unsplash.com` (`premium_photo-…`) are Unsplash+ and not free — only `images.unsplash.com/photo-…` files are under the free licence. Other sources have similar splits.

Search by *subject in the customer's world*, not by mood words. Inspect candidates at thumbnail size before downloading; pick for composition (where the subject sits, where copy could go), light, and how it will take the treatment.

## Sourcing in practice (when the search pages fight back)

Stock libraries defend their search pages against automation, and each one fails differently: Unsplash serves a proof-of-work bot wall to headless requests, its `napi` search returns nothing without a browser session, and Pexels answers a plain fetch with a Cloudflare challenge. What works:

- Drive a **real browser context** (headless is fine) with a desktop user agent, one search per fresh context, a pause of a few seconds after load, and a scroll to trigger the lazy grid. Read the image `src` values out of the DOM — the ids are in the path — rather than parsing markup.
- Pull the candidates at a working width and **build contact sheets** (a grid of thumbnails with their ids). Choose from the sheet, by composition and light — never from titles, and never one image at a time.
- Download the chosen frames at the width the design needs, then check the licence on each photo's own page before it ships.

If none of that is possible, say so and name the capability that would help; do not ship placeholders.

## The client's own photographs

When the business's real work exists as social posts, it beats any library, with care:

- **Get permission, then collect everything** (`discovery.md` §2). Raw downloads go in `discovery/raw/`, which is listed in `.gitignore`: never committed, never shipped.
- **Check resolution before choosing a hero.** Platforms store some media small: video covers can be 540px wide while stills are 1440px. Put the high-resolution stills in the large placements and the small covers in thumbnails and cards. A 1440px still cannot meet the 2000–2400px full-bleed target below, so use it in a placement that is not full-bleed or as a 1× hero, or take frames from the original video, with permission.
- **Curate by era and set.** Accounts drift from phone-on-the-bench to a proper backdrop. The newest consistent set goes on first screens; the weakest era only deep in categories.
- **Stage photos on their own colour.** When the set shares a backdrop, a page ground sampled from it (`palette.mjs --from photo.png`; the sampler reads PNG, so convert a JPEG first) makes the photograph and the page one surface. Where that backdrop carries the brand better than an older logo, it counts as a brand asset beside the logo (`art-direction.md` §4, Colour).
- **Alt text describes only what is visible.** Never invent the occasion or the customer.
- **Process through a rebuildable script** that makes the widths and formats in "Localise and process" and records each image's source post index, so the set can be rebuilt when new work arrives.

## Localise and process

- Download originals at the largest size you need (2000–2400px wide is enough for full-bleed at 2× density in most cases) into the project's asset system — never hot-link a search-result URL.
- **Bake the treatment, do not layer it**, for a set from mixed sources; a set that already shares a backdrop has its treatment and gets no filter on top. A duotone (or black-and-white, or a tint) applied in code to every frame — convert to luminance, autocontrast, map black and white to two brand colours — is what makes eight photographs from four sources read as one series. Export two widths (a desktop and a phone one) in a modern format and let the markup pick with `<source media>`; a treatment left to CSS filters costs paint time and cannot be checked in a still.
- Apply one treatment to the whole set so it reads as a series: black and white, a duotone, a consistent crop, a consistent tint. Bake expensive treatments into the file; apply cheap ones (a colour overlay, a gradient fade) in CSS so they stay adjustable.
- Serve through the framework's image pipeline (responsive widths, modern formats, explicit width and height to avoid layout shift). Hero image eager with high fetch priority; everything below the fold lazy.
- Keep total image weight sane: the hero within the LCP-image budget and the first viewport within its image budget (`performance.md` §1); never several megabytes of photography on one page.
- Record credits in a `CREDITS.md` next to the assets even when attribution is not required — source URL, author, licence and its class (A–D), and the credit text if one is owed. It is cheap and the user may need it later.

## Text over photographs

Copy needs its own ground. The reliable patterns:

- **Split composition**: copy on a solid surface for one part of the width, the photograph filling the rest and bleeding off the edge, with a soft gradient seam. Stack them on narrow screens.
- **Fade to surface**: the photograph dissolves into the surface colour under the copy area.
- **Panel over image**: a solid or near-solid panel behind the copy.

What does not work: copy placed on the busy or bright part of an image with a translucent overlay and hope. Check the render at every width, because the crop moves.

## If you cannot fetch images

Say so, name the capability that would help (a browser tool to search and preview, plus file download or a fetch-capable runtime), and ask the user to enable it or to provide images. Do not ship placeholders, and do not silently fall back to a design that needed the imagery.

## Other visual assets

- **Product UI**: prefer real screenshots captured from the running product, and recapture them when the product improves; otherwise rebuild real screens as HTML fragments with obviously illustrative sample data.
- **Illustration**: decide in this order — none (photography, product, type); drawn in SVG from the brand's own geometry; commissioned when illustration is the identity; a library only as raw material, restyled into one stroke, palette and radius (`resources/assets.md`). Never a library scene as-is.
- **3D**: only when the object is the product or the data is spatial, with a real poster image as the LCP and the checklist in `motion.md` §9. When a live 3D product exists, marketing stills are rendered from it at its own camera angles, never mocked up, and the marketing pages around it carry no WebGL (`realtime-3d.md` §7, `motion.md` §9).
- **Diagrams**: draw the actual mechanism (what flows where); animate the flow if it helps understanding.
- **Logos and marks**: keep a motif with meaning, recolour it into the new system; regenerate favicon and social image so the identity is consistent everywhere.
