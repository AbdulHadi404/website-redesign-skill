# Phases 6–7 — Visual QA and critique

You cannot judge a redesign from source. Every conclusion about how the product looks must come from a render you actually looked at; every conclusion that can be measured is measured.

## Capturing reliably

Prefer a production build served by the project's preview server; a dev server reloads while it optimises dependencies, injects its own toolbar, and serves unminified bundles. The scripts survive dev servers (they wait out reloads and hide known dev toolbars), but measure performance only on a build. Then:

```bash
node scripts/capture.mjs --base http://localhost:3000 --paths / /pricing /app \
     --widths 1440,1280,1024,768,390 --out captures --label after
node scripts/capture.mjs … --element ".diagram, .timeline svg, .product-fragment"   # artwork at 3×
node scripts/capture.mjs … --variant all          # removal tests for the critique
node scripts/capture.mjs … --reduced-motion --label reduce ; … --dark --label dark ; … --no-js --label nojs
```

What the script does, and why (each was a real failure): it scrolls through the page so observers fire and lazy images load, finishes every running animation, awaits every image bitmap, grows the viewport to the document with viewport-unit elements pinned (a `100vh` hero otherwise balloons to the whole new viewport), writes a fold and a full capture, and reports horizontal overflow, phone zoom-out and images that painted flat. `--mode fullpage` uses Playwright's full-page capture at the real viewport instead — in some environments that rasterises correctly and growing is unnecessary; in others it leaves grey boxes. Settle motion by removing the *hidden start state*, never by adding the "shown" class: headless advances compositor transitions unreliably.

**Verify the verifier.**

- **Control capture**: before trusting the first batch, capture a known-good page (the current production site, or a plain page) with the same script and flags. If images come out grey there too, the harness is at fault, not the page.
- **Open every capture once** and confirm it shows what its name claims: the right route, the top of the document, no blank bands, sensible dimensions. A capture that is invalid is recaptured, not judged.
- **If you cannot see images** (no vision in this session or provider), say so and switch to DOM evidence — `audit.mjs` output, bounding boxes, `naturalWidth`, overflow, console — without claiming a visual review.
- A flat-image warning means either the page covers the image or the capture failed to paint it; check in a browser before "fixing" the page.

**Driving widgets**: render every state of every widget (the matrix in `app-ui.md` §2) — idle, hover, focus, loading, success, empty, error, offline and stale, disabled/read-only, with long, many and zero items — with `states.mjs`: one JSON file of states, each a route to mock (delay, fail, 500, a fixture of 0 or 200 items), a storage seed, a device, and a few steps (click, fill, press, hover). Write it once in Phase 1 against the old build and run the same file on the new one: the before/after pairs are then like for like.

```bash
node scripts/states.mjs states.json --base http://localhost:3000 --out captures/states --label after
node scripts/compare.mjs --grid captures/states/*-after.png --out captures/states/sheet.png
```

It records console errors per state and flags a state that renders identical to the first one — the scenario did not take effect (a wrong selector, a route pattern that never matched), so the capture proves nothing. Clicks fall back to the element's own `click()` when a sticky bar intercepts the pointer.

Keep the captures; the user should see before/after (`compare.mjs --dir captures`), and the critique needs them.

## Measuring

```bash
node scripts/audit.mjs --base http://localhost:3000 --paths / /pricing --widths 1440,390 --kind marketing --out audit/after
node scripts/audit.mjs --base http://localhost:3000 --paths /app /app/settings --kind app --out audit/after-app
```

Compare with the Phase 1 run in `audit/before`. Every ✗ is fixed or justified in `DESIGN.md`; every ◆ signal is either gone or has a written reason (`anti-patterns.md`). Then run the accessibility pass — `a11y.mjs` per key template, whose reflow, text-spacing, forced-colours and colour-vision PNGs join the captures you look at, and `widgets.mjs` per custom widget (`accessibility.md` §10–11) — the responsive pass (`responsive.md` §8) and a performance run (`performance.md` §6).

## What to check, per width

- Horizontal overflow and which element causes it (`audit.mjs` names it; `100vw` plus padding overflows at every desktop width — delete `100vw`, block elements are already full width).
- Headline wrapping: no orphaned single words, no break inside an emphasised phrase, nothing overlapping the subject of a photograph.
- Photo crops: the subject visible and not decapitated; copy on its own ground.
- Whitespace: no dead bands (a `100svh` hero on a tall screen — cap it with `min(100svh, 56rem)` — a parallax gap, an empty column).
- Alignment: columns, rules and baselines line up; concentric radii; nothing a few pixels off.
- Sizing: nothing tiny at 390 (tables, diagrams, labels); nothing absurd at 1440.
- Sticky and fixed elements: header state on scroll; the **open** mobile menu; overlays; body scroll lock releases; focus never hidden under a sticky bar.
- Every widget in every state; hover and focus on desktop; targets on mobile (rendered size, not source).
- Dark and image chapters: text contrast on the actual background (`audit.mjs` lists text over images and gradients for you to check by eye).
- Density and consistency on product screens: one layout per kind of task, the same control heights, the same spacing steps.

Fix defects in source, re-capture, and look again. Do not close the loop on the assumption that a CSS change did what you intended.

## The design QA matrix

"Done" means every applicable cell was looked at in a render:

| Axis | Values |
| --- | --- |
| State | default, hover, focus-visible, pressed, selected, disabled, read-only, loading, success, error, empty (first-use / no-results / cleared), permission-denied, offline |
| Content | 0, 1, typical, 100+ items; 1-character and 70-character names; long words and URLs; missing images; large numbers and currencies; translations; RTL if supported |
| Viewport and input | 390 / 768 / 1024 / 1280 / 1440 (+ 320, 360, 844×390 for the responsive pass); touch vs fine pointer; keyboard only; 200% and 400% zoom |
| Preferences | light / dark; reduced motion; forced colours; visible scrollbars (Windows) |
| Performance | throttled CPU and network; skeletons match the final layout; interaction latency |

## Inspecting custom artwork

Full-page captures are the wrong instrument for illustration: at page scale a triangle overflowing its circle, a stamp covering a data block or a clipped label all look like texture. For drawn artwork:

- Capture **each artwork element on its own** at 3× (`--element`).
- Check every piece: anything outside its frame, anything clipped by the viewBox, labels colliding, a label covering data, parts that should connect and do not.
- Check SVG diagrams at the **narrowest** width they render at, where labels are largest relative to the drawing.
- Check decorative watermarks at every width — the most common source of "something spilled onto the page".

## Rendering traps seen repeatedly

- Dev servers may serve a heavy client bundle (an embedded CMS, a demo) blank on first load while dependencies pre-bundle, and Vite-based servers reload the page — repeatedly, when link prefetching discovers new routes — during the first visits; verify such routes on a production build. A script report of "the page kept reloading" means exactly this.
- A `backdrop-filter`, `filter` or `transform` on a sticky header makes it the containing block for fixed descendants — the mobile menu renders inside the 70 px bar. Put the blur on a pseudo-element.
- `<picture>` wrappers have no height of their own; `height: 100%` on the image falls back to intrinsic size — size the wrapper.
- Parallax layers without overscan expose the section background at the edges.
- Reveal classes on the same element as a scroll-driven transform fight each other; wrap one in the other.
- Preview tools sometimes report `innerWidth: 0` or time out on clicks when the pane is hidden; front the pane or use the script.
- **An SVG with no `width`/`height`, injected as a string into a flex row, lays out at the row's full width** — a 13 px map pin renders 56 px tall. Size every injected SVG in CSS and add `svg { flex-shrink: 0 }`.
- **A hero object laid over a photograph can cover almost all of it** — at one width a composition, one breakpoint over a border around a mistake. Give the object a surface made of the design's own material.
- Framework-scoped styles (Astro, Svelte, Vue) do not reach markup rendered by a child component; a decorative SVG given a class by its parent lays out as a giant block. Use a global selector and check the render.
- An absolutely positioned `<svg>` with `left` and `right` but no `width` keeps its intrinsic 300 px. Give it an explicit width.
- An enter animation that starts scaled above 1 adds overhang to the scroll width until it fires — a phantom 10 px horizontal scroll on phones. Clip the ancestor with `overflow-x: clip` (not `hidden`, which breaks sticky children).
- `body { overflow-x: hidden }` hides the scrollbar, not the fault — and fools an overflow detector that stops at any clipping ancestor. Stop the walk at `body` (`audit.mjs` does).
- **One overflowing element makes phones load the page zoomed out**: under mobile emulation a 900 px table widened the layout viewport to 924 px at a 390 device width. `capture.mjs` and `audit.mjs` report "layout viewport widened".
- A `@media (pointer: coarse)` rule placed *before* the base rule is silently overridden — touch buttons stayed 36 px. Check rendered sizes.
- Text clipped by an `overflow: hidden` card (a table inside a rounded card) is invisible to axe and to overflow detectors; `audit.mjs` reports it.
- Third-party iframes (reviews, badges, booking) often paint blank in headless captures because of bot challenges; confirm in a browser and give them a solid fallback.
- Behind a TLS-intercepting proxy (CI, some corporate networks, cloud sandboxes) web fonts can fail silently and every capture renders in fallback fonts; `audit.mjs` reports declared families that are not available.

## Critique (Phase 7)

Fill `templates/critique.md` from the renders. The method:

1. **A fresh-context reviewer.** When subagents are available, give one only the brief and the direction from `DESIGN.md`, the capture paths (old and new) and the critique template — never the build conversation. It writes its first impression (what the page communicates, the first three things the eye lands on, one word) *before* reading `DESIGN.md`, then critiques. A reviewer that inherits the builder's transcript inherits its optimism. If no subagent exists, say so in the report and do the first-impression step before re-reading your own direction.
2. **Objective → element → effect → why** for every point — analysis against the brief, not taste.
3. **Removal and swap tests** from the variant captures (`--variant all`): content-free, image-free, shadow-free; the name swap; headlines only; the blurred first viewport beside the old site and the last `ledger.md` project (`compare.mjs --grid … --blur 6`).
4. **Evidence per answer**: a "yes" names the capture file and what in it shows the answer; hierarchy and clarity cannot be answered from source. Before hand-off, re-open each cited capture and try to prove the "yes" wrong.
5. **Bounded rounds**: each round produces one batch of fixes and one full recapture, and re-scores the previous round's findings as resolved / partial / unresolved from the new captures (the builder's narration of a fix is not evidence). At most three rounds; if a "no" survives the third, or a round resolves nothing, stop and put the table in front of the user.

Expect at least one round of fixes; the first implementation almost always keeps something it should have replaced.

## Reporting captures

Send the user the before/after sheets (first viewport and full page at desktop, full page at phone) and the removal-test sheet if it made a point. Large images may need splitting or recompressing to upload; keep the originals.
