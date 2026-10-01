# Phases 5–7 — Visual QA, polish and critique

You cannot judge a redesign from source. Every conclusion about how it looks comes from a render you actually looked at; everything that can be measured is measured. Script options and what their findings mean: `scripts/README.md`.

## Contents

- Capturing reliably
- The key-screen review (before rolling out)
- The width loop: sweep, capture, stress
- What to check, per width
- Polish pass
- The design QA matrix
- Inspecting custom artwork
- Rendering traps seen repeatedly
- 3D and WebGL experiences
- Critique
- Task walkthroughs (productive routes)
- Reporting captures

## Capturing reliably

Capture a production build served by the project's preview server; a dev server reloads, injects toolbars and serves unminified bundles.

```bash
node scripts/capture.mjs --base http://localhost:3000 --paths / /pricing /app --widths 1440,1280,1024,768,390 --out captures --label after
node scripts/capture.mjs … --element ".diagram, .product-fragment"    # artwork at 3×
node scripts/capture.mjs … --variant all                             # removal tests for the critique
node scripts/capture.mjs … --reduced-motion --label reduce ; … --dark --label dark ; … --no-js --label nojs
```

**Verify the verifier.** Before trusting a first batch, capture a known-good page with the same flags; if images come out grey there too, the harness is at fault. Open every capture once and confirm it shows what its name claims. If this session cannot see images, say so and switch to DOM evidence (`audit.mjs` output, bounding boxes, `naturalWidth`) without claiming a visual review.

**Every state of every widget** — loading, empty, error, offline, stale, disabled, long, many, zero, open, focused (the matrix in `app-ui.md` §2) — is rendered with `states.mjs`, from one JSON written in Phase 1 against the old build and run on both, so before/after pairs are like for like. A state that renders identically to another (loading, error and offline looking the same) is a finding.

**Every multi-step flow** (a builder, a booking, a checkout), on expressive and productive surfaces alike, is walked end to end on the phone device with `states.mjs --each`, stepping with `tap`: page captures cannot show a sticky preview covering the step title, a button under a fixed overlay, or validation that jumps to the wrong step. Keep the walk as a Playwright test in the project.

Keep the captures: the user should see before/after (`compare.mjs --dir captures`), and the critique needs them.

## The key-screen review (before rolling out)

The first thing built after tokens and base is the screen with the most risk: the homepage's first viewport and the section after it on an expressive route; the busiest top-task screen, with realistic data, on a productive one. It is where the direction meets reality, and where changing it is still cheap.

1. Capture it at 1440 and 390 (fold and full), plus 1280 × 800 for a productive screen.
2. Blur it beside the old site and the ledger captures: `compare.mjs --grid key-1440.png old-1440.png references/ledger/*.jpg --labels New Old --blur 6`. Write what the blurred sheet communicates before re-reading your own direction. Does the blur reproduce the content priority in `DESIGN.md`?
3. Answer critique checks 1, 3, 4, 7, 15 and 17 — plus 6 (expressive) or 25 (productive) — from these captures, ideally by a fresh reviewer.
4. Fix the direction, not just the screen, when a check fails; then roll the system out.

Where the user is engaged in the conversation, show them the key screen at this point: a rejection now costs one screen, not a site.

## The width loop: sweep, capture, stress

Five capture widths miss what breaks between them.

1. **Sweep** every template you touched: `node scripts/sweep.mjs --base … --paths …` checks every width from 320 to 1920 and 200%/400% zoom, merged into ranges with a contact sheet of the worst widths.
2. **Capture the worst widths** it names, and judge detail from its 1:1 crops, never from a full-page image.
3. **Stress** each key template before the critique: `node scripts/stress.mjs --url …` (pseudo-localisation, huge and negative numbers, blocked images, an RTL flip, empty lists, slow and failing networks), aimed at real data with `--targets` and `--list`. Dismiss a designed truncation in writing; fix the rest.
4. **Regressions while iterating**: diff the same page at the same width from the same browser build, stabilised, and open every changed region at 1:1. No percentage threshold separates a real 1 px shift from rendering noise; a stable build does.

## What to check, per width

- **Overflow** and which element causes it (`audit.mjs` names it; `100vw` plus padding overflows at every desktop width). A page that clips itself (`overflow-x: clip` or `hidden` on html, body or a section) hides overflow from `scrollWidth`: inspect element boxes, and read the audit's "Text past the viewport" and "Text cut off" lines.
- **Headlines**: no orphaned single word, no break inside an emphasised phrase, nothing overlapping a photograph's subject. Re-read every heading and lede break at 390, 768 and 1440 after any type change.
- **Photo crops**: subject visible; copy on its own ground at every width (the crop moves).
- **Dead bands**: a `100svh` hero on a tall screen (cap it with `min(100svh, 56rem)`; check `--widths 1440 --height 1600`), a parallax gap, an empty column.
- **Alignment and finish**: columns, rules and baselines line up; concentric radii; nothing a few pixels off.
- **Sizing**: nothing tiny at 390 (tables, diagrams, labels); nothing absurd at 1440.
- **Sticky and fixed elements**: header state on scroll, the **open** mobile menu, overlays, scroll lock released, focus never hidden under a sticky bar.
- **Contrast on image and dark sections** (`audit.mjs` lists text over images and gradients to check by eye).
- **Product screens**: one layout per kind of task, the same control heights and spacing steps; the busiest screen at 1280 × 800 shows the first rows of its main object (`app-ui.md` §3).

Fix defects in source, re-capture, and look again. Do not close the loop on the assumption that a CSS change did what you intended.

## Polish pass

After the captures are stable at every width and the states are designed; before the critique. Polish never rescues a direction. Work macro to micro, because a macro change re-breaks everything below it:

1. **Glance**: the first viewport at 1440 and 390, plus a greyscale blurred sheet. Two or three value masses, the darkest or most saturated on the primary action; one large element; more space between groups than within them; depth planes staged per breakpoint (look at 390 on its own).
2. **Type**: display leading, then tracking with `text-wrap: balance`, `pretty` on body text; re-read every break at 390, 768 and 1440.
3. **Tokens, never per component**: one light direction for shadows, borders by role (inputs at 3:1), a radius scale with concentric nesting, tinted neutrals. In a perception test, macro space and a single accent were seen and preferred; alpha borders, radius nesting and layered tinted shadows were not perceptible at normal size. Set those once in tokens, where they cost nothing per screen, and do not spend a review round on them.
4. **Components from 2× crops**: one height per button size and one primary per view; one icon family with stroke tied to text weight; tabular figures in columns; a solid focus ring that follows the shape. Use crops to find defects, not to choose between near-identical variants.
5. **States and motion**, with `states.mjs` and `motion.mjs`.

**Stop** when every defect found is fixed or justified in one line, no line break regressed at 390, 768 or 1440, or after two rounds.

## The design QA matrix

"Done" means every applicable cell was looked at in a render:

| Axis | Values |
| --- | --- |
| State | default, hover, focus-visible, pressed, selected, disabled, read-only, loading, success, error, empty (first-use / no-results / cleared), permission-denied, offline |
| Content | 0, 1, typical, 100+ items; 1-character and 70-character names; long words and URLs; missing images; large numbers and currencies; translations; RTL if supported |
| Viewport and input | 390 / 768 / 1024 / 1280 / 1440 and the sweep; touch vs fine pointer; keyboard only; 200% and 400% zoom |
| Preferences | light / dark; reduced motion; forced colours; visible scrollbars (Windows) |
| Performance | throttled CPU and network; skeletons match the final layout; interaction latency |

## Inspecting custom artwork

Full-page captures are the wrong instrument for illustration: at page scale a glyph overflowing its circle, a stamp covering data or a clipped label all look like texture.

- Capture **each artwork element on its own** at 3× (`--element`).
- Check every piece: anything outside its frame or clipped by the viewBox, labels colliding or covering data, parts that should connect and do not, marks floating outside the object they belong to.
- Check SVG diagrams at the **narrowest** width they render at, and decorative watermarks at every width — the most common source of "something spilled onto the page". A watermark is a small, complete ornament inside a real element with `overflow: hidden`, never a wedge cropped across a headline.

## Rendering traps seen repeatedly

Each passed a visual review at page scale; look for them on purpose.

- **Fixed children trapped**: a `backdrop-filter`, `filter` or `transform` on a sticky header makes it the containing block for fixed descendants — the mobile menu renders inside the 70 px bar. Put the blur on a pseudo-element.
- **`grid-template-columns: 1fr` is `minmax(auto, 1fr)`**: one nowrap child widens the track past a 390 px viewport, and a page clip hides it. Write `minmax(0, 1fr)`; `min-width: 0` on grid and flex children holding nowrap text.
- **Unsized SVG**: injected into a flex row, it lays out at the row's full width (a 13 px pin rendered 56 px tall); an absolutely positioned `<svg>` with `left` and `right` keeps its intrinsic 300 px. Size every SVG in CSS; `svg { flex-shrink: 0 }`.
- **A glyph as a sized `<span>`** looks right inside flex and grid parents, which blockify it, and turns column-wide in a plain block. Make it `inline-block` with its own size.
- **Scoped styles** (Astro, Svelte, Vue) do not reach markup a child component renders: a decorative SVG given a class by its parent lays out as a giant block.
- **Ornaments stretched with `preserveAspectRatio="none"`** keep their proportions at one width only; draw repeating edges at true size with a CSS mask, on a square panel.
- **`<picture>` wrappers** have no height of their own; size the wrapper.
- **A hero object laid over a photograph** can smother it at one breakpoint; give the object a surface of the design's own material.
- **An enter animation scaled above 1** adds overhang to the scroll width until it fires (a phantom horizontal scroll on phones): clip the ancestor with `overflow-x: clip`, then check element boxes.
- **A grid with `min-height: 100dvh`** stretches its auto rows; set the rows explicitly.
- **A `@media (pointer: coarse)` rule placed before the base rule** is silently overridden; check rendered sizes.
- **Server and client must compute the same output**: procedural SVG sorted by float depth, or a date formatted with a default calendar, renders differently in Node and the browser (round and tie-break; set calendars explicitly).
- **Glyphs cut by a clipping box** (accents, Arabic marks, descenders under `overflow: hidden` or `line-clamp`): use the face's line-height floor from `fonts.mjs`.
- **A hidden or throttled preview pane** stops painting while its DOM still works; take visuals with `capture.mjs`.

## 3D and WebGL experiences

- **Judge only on a real GPU in a focused browser.** Embedded preview panes throttle `requestAnimationFrame` when unfocused (1 fps where the GPU gave 144), and the default headless shell renders WebGL in software. Capture with `capture.mjs --gpu`, which prints the renderer and flags a software one; run e2e tests in full Chromium with GPU flags.
- **Lighting before shape** on generated geometry: a dark, faceted surface on something pale usually means inward normals (inverted winding; a lathe profile runs bottom to top).
- **Procedural detail aliases**: budget samples per unit length, not per path.
- **Calibrate against the client's own photographs** at the same angle, side by side, never from memory.
- **Measure, then state the number**: frame rate over 3 s at the target viewport and tier, with the renderer — "144 fps at 1440×900, High tier, Radeon 680M". "It runs smoothly" is not evidence. Benchmark discipline: `interactive.md` §7.

## Critique

Fill `templates/critique.md` from the renders.

1. **A fresh-context reviewer.** When subagents are available this is not optional: give one only the brief and direction from `DESIGN.md`, the capture paths (old and new, pages *and* state captures — filled, error, loading, seeded), and the template, never the build conversation. In the one test where both ran on the same captures, the fresh reviewer found the direction's own first "breaks if" violated and two "no" answers where the builder had answered 22 of 22 "yes". The reviewer writes a first impression (what the page communicates, the first three things the eye lands on, one word) *before* reading `DESIGN.md`. Without a subagent, say so and make the self-review as blind as possible: build the blurred sheet and the no-text variant first, write the first impression from those images alone, then the walkthroughs, and only then re-read your own direction. If any separate model call exists, send it the captures and the brief, never the transcript.
2. **Objective → element → effect → why** for every point: analysis against the brief, not taste.
3. **Removal and swap tests** from the variant captures: content-free, image-free, shadow-free; the name swap; headlines only; the blurred first viewport beside the old site and the ledger.
4. **Evidence per answer**: a "yes" names the capture and what in it shows the answer, and is then hunted. Give reviewers diff regions and 1:1 crops, never "what changed?": a model finds only a third of single-property changes by eye.
5. **Bounded rounds**: each round is one batch of fixes and one full recapture, re-scoring the previous round's findings as resolved, partial or unresolved from the new captures. At most three; if a "no" survives the third, or a round resolves nothing, stop and put the table in front of the user.

**Signature routes**: check 27 judges the experience against its written quality bar, from captures and filmstrips taken on a real GPU, with the frame rate and renderer stated; its chrome and controls answer the productive rows and get task walkthroughs.

Expect at least one round of fixes; the first implementation almost always keeps something it should have replaced.

## Task walkthroughs (productive routes)

On a work tool, "can the user do the task?" is answered by attempting it. Do it on the old build and the new one, with the same tasks, on the device the user holds.

1. **Write each top task as the user would say it, with the answer they need** ("Which cows do I check before letting them out?"), never as a route ("use the alerts panel").
2. **Start from a scenario with no steps** and look at the capture: `node scripts/states.mjs walk.json --aria --each --out captures/walk/new`. Beside each capture, the accessibility tree marks every node a sighted user cannot read on that screen (below, cut off, in a sideways scroller, covered, transparent, inert).
3. **Choose the next step from what the capture shows**: `tap` what you can see, `swipe` to scroll, `fill` what a keyboard would type. Never `scroll` to a selector — it reaches content no finger can — and never act on a marked node until a step has brought it on screen. Append the step and run again.
4. **Stop when you can state the answer**, or after three steps without progress (a failure).
5. **Record per task and build**: the result (yes / partial / no, with the answer), the number of actions, dead taps, doubts (each a capture and the moment a user would hesitate), and what was named but not readable. An answer assembled by cross-referencing screens is "partial": a model reads more patiently than someone at 5 am.
6. **Say what it cannot show**: reach, tap accuracy, gloves, glare, fatigue and real assistive technology. It is a walkthrough, not a usability test.

The first run of this method, on an old and a redesigned field-tool screen, found what no checklist asks about: a KPI tile saying "Alerts 5" above a panel saying "No data", the answer sitting in a clipped column, the record's name scrolling away as its status came into view, and a backdrop tap that opened another record instead of closing the sheet.

## Reporting captures

Send the user the before/after sheets (first viewport and full page at desktop, full page at phone) and any removal-test sheet that made a point. Large images may need splitting or recompressing to upload; keep the originals.
