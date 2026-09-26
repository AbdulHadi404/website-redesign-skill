# Phases 6–7 — Visual QA and self-critique

You cannot judge a redesign from source. Every conclusion about how the site looks must come from a render you actually looked at.

## Capturing reliably

Run the project with its own dev server (use the environment's preview/browser tool if it has one). Then capture full pages at, at minimum: **1440, 1280, 1024, 768 and 390** px wide. Methods, in order of reliability:

1. **Headless browser script** — `scripts/capture.mjs` in this skill drives a locally installed Chrome through `puppeteer-core` (or adapt it to Playwright) and writes full-page PNGs per width. Full-page capture waits for fonts and lets scroll-reveal fail-safes fire, so nothing is hidden by animation. This is the most trustworthy method; use it when Node and a Chrome binary are available.
2. **Preview-browser tool** — resize to the target width and a tall height so the whole page (or a large chunk) is in view, then screenshot. Screenshot tools often capture from the top of the document rather than the scrolled position; a tall viewport avoids that. Very large captures may be dropped — split the page by removing upper sections with a one-line script and capturing again.
3. **Element screenshots** — for one chapter at one width, capture the element itself.

Whichever method: wait for fonts (`document.fonts.ready`) and for reveal animations, and disable nothing you would not disable for a visitor.

**Two things a capture script must do, or it will lie to you about images.**

1. **Grow the viewport to the whole document before the shot.** A `fullPage: true` screenshot in headless does not reliably rasterise images that were never composited in the viewport: they come out as empty grey boxes while the DOM reports loaded, `naturalWidth` correct, `opacity: 1` and the right box size. Measure `document.documentElement.scrollHeight`, `setViewportSize` to it (Chrome tolerates ~15,000px), `await` `img.decode()` on every image — which waits for the bitmap, not just the bytes — and then screenshot. Without this you will chase a page bug that does not exist, or worse, dismiss a real one as "the harness".
2. **Settle motion by removing the hidden start state, not by adding the "shown" class.** Opacity and transform transitions run on the compositor, which headless advances unreliably for content that has never been on screen — so an element with the reveal class applied can still screenshot at `opacity: 0`. Strip the class that *hides* things (see the reveal rule in `implementation.md`) rather than adding the one that shows them.

**Drive widgets with the element's own `click()`, not a synthetic pointer.** An opaque sticky masthead over a module the harness has just scrolled to will intercept the click, and the failure tells you nothing about the widget. `page.$eval(sel, el => el.click())` skips hit-testing; the states pass is about what the widget looks like in each state.

Keep the captures; the user should see before/after, and you need them for the critique.

**Flows are visual QA too.** For any site with a multi-step flow (a builder, a booking, a checkout), write an end-to-end test that walks the real flow on a phone profile and screenshots each step. It catches what page captures cannot: a sticky preview covering the step title after "Next", a button hidden behind a dev overlay, a validation that jumps to the wrong step. Add an automated accessibility pass (axe, WCAG 2.2 AA tags) over the main pages in the same suite.

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
- **An SVG with no `width`/`height` attributes, injected as a string into a flex row, lays out at the row's full width.** Icon helpers that return markup (`lucide`'s node-to-string, hand-written path strings) usually carry no intrinsic size, so a 13px map pin renders 56px tall beside every row of a list and nobody notices in the source. Size every injected SVG in CSS — `.thing svg { width: 12px; height: 12px }` — and add `svg { flex-shrink: 0 }` to the container.
- **A hero object laid over a photograph can cover almost all of it.** At the width you designed for it may read as a composition; one breakpoint over it reads as a border around a mistake. If the object is the point, give it a surface made of the design's own material (ruled paper, a panel, a band) rather than a photograph it will smother.
- Framework-scoped styles (Astro, Svelte, Vue) do not reach markup rendered by a child component: a decorative SVG given a class by its parent lays out in normal flow as a giant block. Position such elements with a global selector or a global utility class, and check the render.
- An absolutely positioned `<svg>` with `left` and `right` but no `width` keeps its intrinsic 300px: replaced elements resolve `width: auto` from intrinsic size, so `right` is ignored and the drawing ends wherever 300px lands. Give it an explicit `width` (a `calc()` if it must span between two nodes).
- A "stamp press" or any enter animation that starts scaled above 1 adds its overhang to the document's scroll width until it fires; wide labels near the right edge produce a phantom 10px horizontal scroll on phones. Clip the offending ancestor with `overflow-x: clip` (not `hidden`, which would break sticky children).
- A `body { overflow-x: hidden }` hides the scroll but not the fault, and it fools an overflow detector that stops at any clipping ancestor — stop the ancestor walk at `body`, or the detector reports nothing while `scrollWidth` still exceeds `clientWidth`.
- Third-party iframes (review widgets, badges, booking embeds) often paint blank in headless captures because of bot challenges; confirm in the preview browser before calling them broken, and give them a solid fallback so the band never reads as empty.
- **An SVG `<pattern>` or ornament stretched with `preserveAspectRatio="none"`** keeps its viewBox proportions only at one width; at 600px a row of small scallops becomes five giant bumps. Draw repeating ornaments at their true size with a CSS mask or background (`mask: url(shape.svg) repeat-x / 28px 18px; background: currentColor`), and look at them at 390 and 1440.
- **Procedurally generated SVG must be deterministic between server and browser.** Sorting shapes by a floating-point depth can order symmetric twins differently in Node and in the browser, which causes a hydration mismatch. Round before comparing and add a tiebreak.
- **On Windows Git Bash, arguments that start with `/` are rewritten into filesystem paths** (`/studio` becomes `C:/Program Files/Git/studio`), so a capture script silently captures `/` instead. Prefix with `MSYS_NO_PATHCONV=1`.
- **Rounded corners under an edge ornament** (a scalloped or piped top edge on a panel) leave gaps at both ends. Square the panel where the ornament forms the edge.

### 3D and WebGL experiences

- **Judge WebGL only on a real GPU, in a focused browser.** Embedded preview panes throttle `requestAnimationFrame` when the app window isn't focused (1 fps, and a 100ms timer taking a second), and the default headless shell renders WebGL in software (SwiftShader), so every frame takes seconds and input queues behind it. Neither can judge motion or speed. Capture with full Chromium and GPU flags (on Windows: `--use-angle=d3d11 --ignore-gpu-blocklist --enable-gpu`), and log `WEBGL_debug_renderer_info` with every capture so a software run can't pass for a real one. Run the e2e project the same way.
- **Check lighting before shape on generated geometry.** A dark, brown or faceted surface on something that should be pale is usually inverted winding: the computed normals point inward. The same fault makes a metal surface render black. Sweeps, lathes and extrusions each have a direction rule (for example, a lathe profile runs bottom to top). Only then judge the silhouette.
- **Procedural detail aliases.** A ridged profile twisted faster than about half a ridge per sample turns into spikes. Budget samples per unit length, not per path.
- **Calibrate against the client's own photographs at the same angle,** side by side, never from memory. Proportions (a tall cake), scale of details, what sits on what, and colours come from the photo.
- **Measure, then state the number.** Frame rate over three seconds at the target viewport and quality tier, with the renderer named, e.g. "144 fps at 1440×900, High tier, Radeon 680M". An unmeasured "it runs smoothly" isn't evidence.

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
