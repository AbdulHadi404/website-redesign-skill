# Phases 6–7 — Visual QA and self-critique

You cannot judge a redesign from source. Every conclusion about how the site looks must come from a render you actually looked at.

## Capturing reliably

Run the project with its own dev server (use the environment's preview/browser tool if it has one). Then capture full pages at, at minimum: **1440, 1280, 1024, 768 and 390** px wide. Methods, in order of reliability:

1. **Headless browser script** — `scripts/capture.mjs` in this skill drives a locally installed Chrome through `puppeteer-core` (or adapt it to Playwright) and writes full-page PNGs per width. Full-page capture waits for fonts and lets scroll-reveal fail-safes fire, so nothing is hidden by animation. This is the most trustworthy method; use it when Node and a Chrome binary are available.
2. **Preview-browser tool** — resize to the target width and a tall height so the whole page (or a large chunk) is in view, then screenshot. Screenshot tools often capture from the top of the document rather than the scrolled position; a tall viewport avoids that. Very large captures may be dropped — split the page by removing upper sections with a one-line script and capturing again.
3. **Element screenshots** — for one chapter at one width, capture the element itself.

Whichever method: wait for fonts (`document.fonts.ready`) and for reveal animations, and disable nothing you would not disable for a visitor.

Keep the captures; the user should see before/after, and you need them for the critique.

## What to check, per width

- Horizontal overflow (`document.documentElement.scrollWidth > clientWidth`) and which element causes it.
- Headline wrapping: no orphaned single words, no line breaking inside an emphasised phrase, nothing overlapping the subject of a photograph.
- Photo crops: the subject visible and not decapitated; copy on its own ground.
- Whitespace: no dead bands (a `100svh` hero on a tall screen, a parallax gap, an empty column).
- Alignment: columns, rules and baselines line up; nothing floats a few pixels off.
- Sizing: nothing tiny (tables, diagrams, mono labels) at 390; nothing absurd at 1440.
- Sticky and fixed elements: header state on scroll, the **open** mobile menu, overlays; body scroll lock releases.
- Interactive widgets in every state (idle, loading, active, done, error) — drive them with a script if a real backend is not available.
- Hover and focus states on desktop; tap targets on mobile.
- Dark and image chapters: text contrast on the actual rendered background.

Fix defects in source, re-capture, and look again. Do not close the loop on the assumption that a CSS change did what you intended.

## Inspecting custom artwork

Full-page captures are the wrong instrument for illustration: at page scale a triangle overflowing its circle, a stamp covering a data block or a clipped label all look like texture. Any site with drawn artwork needs a second pass:

- Screenshot **each artwork element on its own**, at `deviceScaleFactor: 2–3`, using the element locator rather than a page crop.
- Look at every piece against a checklist: is anything outside its frame, is anything clipped by the viewBox, do labels collide, does any label cover data, do the parts of each object actually connect?
- Do the same for any SVG diagram at the **narrowest** width it renders at, where labels are largest relative to the drawing.
- Check decorative watermarks at every width: they are the most common source of "something spilled onto the page".

## Rendering traps seen repeatedly

- Dev servers may serve a heavy client bundle (an embedded CMS, a demo) blank on first load while dependencies pre-bundle; verify such routes on a production build.
- A `backdrop-filter` on a sticky header traps fixed descendants (mobile menu renders inside the 70px bar).
- `<picture>` wrappers have no height; images fall back to intrinsic size in narrow containers.
- Parallax layers without overscan expose the section background at the edges.
- Reveal classes on the same element as a scroll-driven transform fight each other; wrap one in the other.
- Preview tools sometimes report `innerWidth: 0` or time out on clicks when the pane is hidden; front the pane or use the headless script.
- Framework-scoped styles (Astro, Svelte, Vue) do not reach markup rendered by a child component: a decorative SVG given a class by its parent lays out in normal flow as a giant block. Position such elements with a global selector or a global utility class, and check the render.
- An absolutely positioned `<svg>` with `left` and `right` but no `width` keeps its intrinsic 300px: replaced elements resolve `width: auto` from intrinsic size, so `right` is ignored and the drawing ends wherever 300px lands. Give it an explicit `width` (a `calc()` if it must span between two nodes).
- A "stamp press" or any enter animation that starts scaled above 1 adds its overhang to the document's scroll width until it fires; wide labels near the right edge produce a phantom 10px horizontal scroll on phones. Clip the offending ancestor with `overflow-x: clip` (not `hidden`, which would break sticky children).
- A `body { overflow-x: hidden }` hides the scroll but not the fault, and it fools an overflow detector that stops at any clipping ancestor — stop the ancestor walk at `body`, or the detector reports nothing while `scrollWidth` still exceeds `clientWidth`.
- Third-party iframes (review widgets, badges, booking embeds) often paint blank in headless captures because of bot challenges; confirm in the preview browser before calling them broken, and give them a solid fallback so the band never reads as empty.

## Self-critique (Phase 7)

Put the old first viewport beside the new one. Then fill `templates/critique.md` honestly. The questions, and what a "no" means:

| Question | If no |
| --- | --- |
| Would a stranger call before/after two different companies' work? | The direction is a refresh. Return to art direction. |
| Is the first viewport memorable without the copy? | Rebuild the hero concept. |
| Is the typography distinctive, with a real scale? | Change families or sizes; the type carries the identity. |
| Does the page have rhythm — different compositions per chapter? | Merge or restructure repetitive chapters. |
| Are there too many cards or boxes? | Convert to lists, rules, tables, statements. |
| Does every image have a purpose and a consistent treatment? | Remove or replace it. |
| Is the product shown, not described? | Add faithful product fragments or the demo. |
| Does anything read as AI-generated (blobs, gradients, badges, filler copy)? | Remove it. |
| Is mobile intentionally designed, not squeezed? | Redesign the stack order and sizes at 390. |
| Would it hold up next to the references from Phase 2? | Identify the gap (finish, restraint, hierarchy) and close it. |

Every "no" becomes a change, then a re-render, then the question again. Expect at least one iteration; the first implementation almost always keeps something it should have replaced.

## Reporting captures

Send the user the before/after captures (first viewport and full page at desktop, full page at phone). Large images may need splitting or recompressing to upload; keep the originals.
