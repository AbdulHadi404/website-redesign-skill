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

In Git Bash on Windows, MSYS rewrites arguments that start with `/` into file paths (`/studio` becomes `C:/Program Files/Git/studio`) and the script captures the wrong page: pass paths without the leading slash or set `MSYS_NO_PATHCONV=1`; the scripts warn when a path looks rewritten.

What the script does, and why (each was a real failure): it scrolls through the page so observers fire and lazy images load, finishes every running animation, awaits every image bitmap, grows the viewport to the document with viewport-unit elements pinned (a `100vh` hero otherwise balloons to the whole new viewport), writes a fold and a full capture, and reports horizontal overflow, phone zoom-out, text cut at the viewport edge where no scroll reaches it (under an html or body clip, or past the start edge: left in a left-to-right page, right in a right-to-left one), and images that painted flat; the first page of a run that has a `<canvas>` also prints the WebGL renderer. `--mode fullpage` uses Playwright's full-page capture at the real viewport instead — in some environments that rasterises correctly and growing is unnecessary; in others it leaves grey boxes. At phone widths Chromium drops touch emulation for any shot beyond the viewport, so in `--mode fullpage` (and on pages taller than 16000 px) the full shot and its variants lose `(pointer: coarse)` and `(hover: none)` styles: judge those on the fold or in grow mode. Settle motion by removing the *hidden start state*, never by adding the "shown" class: headless advances compositor transitions unreliably.

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

It records console errors per state and flags a state that renders identical to the first one — the scenario did not take effect (a wrong selector, a route pattern that never matched), so the capture proves nothing. Clicks fall back to the element's own `click()` when a sticky bar intercepts the pointer. A failing step says why its target refused (not rendered, inside a closed `<details>`, inert, disabled, covered by what — a container's `::after` overlay included — cut off by an overflow or a clip-path, a select without that option) and leaves a `-failed.png`. On a page laid out wider than the phone screen, Playwright's own check, click and hover can miss a target that the page's own hit test reaches; only then does the message call it the tool, not the product: step it with `tap`. The overflow itself is a finding.

Recorded requests (`"record"` on a route or a state) go to `captures/states/requests/<label>/`, so two builds can share one `--out`; compare them with `node scripts/parity.mjs --payloads captures/states/requests/before captures/states/requests/after`.

`compare.mjs` pairs `--labels` with files by position, and a shell glob sorts by name. With fewer labels than files, the rest are captioned with their file names, and `-` skips one panel. A label that names another file from the same folder better than its own (`sanad` on `azul-home.jpg`, or `Old` on a `-after` capture) stops the run and, when the order is clear, prints the list it most likely meant; `--labels-as-given` draws the labels as typed. Your own captures are not checked against the ledger's files, so `--labels "Sanad new" "Sanad old"` is fine beside `references/ledger/*.jpg`. A grid is one row; `--cols N` wraps it N to a row.

**Flows**: walk every multi-step flow (a builder, a booking, a checkout) end to end on the phone device, on expressive and productive surfaces alike, with `states.mjs --each`: a capture per step. Page captures cannot show what goes wrong between steps: a sticky preview covering the step title after "Next", a button hidden behind a sticky or fixed overlay, a validation that jumps to the wrong step. Step with `tap`, not `click`: the click fallback above presses a button a finger cannot reach, while `tap` reports what it actually hit. `states.mjs --axe` (the accessibility pass in "Measuring") scans only the screen each state ends on; to scan a sheet or drawer mid-flow, add a state that stops there. Keep the walk as a Playwright e2e test in the project, so every later change runs it.

Keep the captures; the user should see before/after (`compare.mjs --dir captures`), and the critique needs them.

## Measuring

```bash
node scripts/audit.mjs --base http://localhost:3000 --paths / /pricing --widths 1440,390 --kind marketing --out audit/after
node scripts/audit.mjs --base http://localhost:3000 --paths /app /app/settings --kind app --out audit/after-app
```

On a productive surface the app run covers every route (the route list, from the router or pages directory or the sitemap), and every run takes `--themes light,dark` when the site has both. Compare with the Phase 1 run in `audit/before`. Every ✗ is fixed, or disproved as a false positive with its evidence (a capture, a probe) written in `DESIGN.md`; every warning is fixed or justified in writing; every ◆ signal is either gone or has a written reason (`anti-patterns.md`). Then run the accessibility pass — `states.mjs --axe` on every overlay and stepped state (the phone drawer included), `a11y.mjs` per key template, whose reflow, text-spacing, forced-colours and colour-vision PNGs join the captures you look at, and `widgets.mjs` per custom widget (`accessibility.md` §10–11) — the responsive pass (`responsive.md` §8) and a performance run (`performance.md` §6).

## What to check, per width

- Horizontal overflow and which element causes it (`audit.mjs` names it; `100vw` plus padding overflows at every desktop width — delete `100vw`, block elements are already full width).
- Headline wrapping: no orphaned single words (`audit.mjs` reports headings whose last line holds one word, per width), no break inside an emphasised phrase, nothing overlapping the subject of a photograph.
- Photo crops: the subject visible and not decapitated; copy on its own ground.
- Whitespace: no dead bands (a `100svh` hero on a tall screen — cap it with `min(100svh, 56rem)` — a parallax gap, an empty column). `audit.mjs` reports horizontal strips taller than about half a screen with no text, media, controls or background image, and the element they sit in; when a hero is viewport-sized, run it once more at `--widths 1440 --height 1600` for tall screens.
- Alignment: columns, rules and baselines line up; concentric radii; nothing a few pixels off. `audit.mjs` reports text blocks whose left edges sit 1–4 px apart (usually two copies of one component with drifted spacing) and a rounded element whose radius at a corner is more than 4 px above the outer radius minus the gap, measured against its nearest painted rounded ancestor on all four corners and only where the gap is at most the outer radius; discs and pills are skipped (a round button in a card is a role, not a nesting), and nestings further in (up to 1.5 R) appear only in the view's JSON (`radiusFarIn`).
- Sizing: nothing tiny at 390 (tables, diagrams, labels); nothing absurd at 1440.
- Sticky and fixed elements: header state on scroll; the **open** mobile menu; overlays; body scroll lock releases; focus never hidden under a sticky bar.
- Every widget in every state; hover and focus on desktop; targets on mobile (rendered size, not source).
- Dark and image chapters: text contrast on the actual background (`audit.mjs` lists text over images and gradients for you to check by eye).
- Density and consistency on product screens: one layout per kind of task, the same control heights, the same spacing steps.
- The busiest productive screen at 1280 × 800 (`--widths 1280 --height 800`): the first rows of its main object (table, board, form) in the `-fold.png` (`app-ui.md` §3).

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
- A hidden or throttled preview pane stops painting while its DOM still works: tools report `innerWidth: 0`, time out on clicks or return stale screenshots. Front the pane; until then read the page text and structure, and take the visuals with `capture.mjs` (`--gpu` for a WebGL page: "3D and WebGL experiences").
- **An SVG with no `width`/`height`, injected as a string into a flex row, lays out at the row's full width** — a 13 px map pin renders 56 px tall. Size every injected SVG in CSS and add `svg { flex-shrink: 0 }`.
- **A hero object laid over a photograph can cover almost all of it** — at one width a composition, one breakpoint over a border around a mistake. Give the object a surface made of the design's own material.
- Framework-scoped styles (Astro, Svelte, Vue) do not reach markup rendered by a child component; a decorative SVG given a class by its parent lays out as a giant block. Use a global selector and check the render.
- An absolutely positioned `<svg>` with `left` and `right` but no `width` keeps its intrinsic 300 px. Give it an explicit width.
- A drawn glyph as a sized `<span>` looks right inside flex and grid parents, which blockify it, and turns column-wide in a plain block (a status dot became a column-wide circle on a value list). Make the component `inline-block` (or `inline-flex`) with its own size, and look at it in one block context.
- An SVG pattern or ornament stretched with `preserveAspectRatio="none"` keeps its proportions at one width only: at 600 px a row of scallops became five giant bumps. Draw repeating ornaments at true size with a CSS mask (`mask: url(shape.svg) repeat-x / 28px 18px; background: currentColor`) and look at them at 390 and 1440.
- Square the panel under an edge ornament (a scalloped or piped edge); rounded corners leave gaps at both ends.
- Server and client must compute the same output. Procedural SVG sorted by float depth ordered symmetric twins differently in Node and in the browser: a hydration mismatch. Round before comparing and add a tiebreak. It is the same class of fault as the calendar mismatch in `multilingual.md` §2a.
- An enter animation that starts scaled above 1 adds overhang to the scroll width until it fires — a phantom 10 px horizontal scroll on phones. Clip the ancestor with `overflow-x: clip` (not `hidden`, which breaks sticky children), then check element boxes: the clip hides real faults too (next trap).
- **A page that clips itself lies about overflow.** `overflow-x: clip` or `hidden` on html and body together, or on a hero or a section, stops a fault reaching `scrollWidth`, so the harness says "no overflow" while the render shows copy cut at the viewport edge (a 390 px hero ran 40 px past it). In Chromium, a clip on `html` is applied to the viewport, and so is a clip on `body` while `html`'s overflow is visible. In both cases `scrollWidth` still grows and phones still zoom out, so `audit.mjs` reports "Horizontal overflow", naming the element that widened the page, or the text that runs out of its own box; but a desktop cannot scroll to that text. When `html`'s overflow is not visible, `body` clips its own box and `scrollWidth` stays at the viewport width. That happens with `html, body { overflow-x: hidden }`, and just as much with the always-show-the-scrollbar `html { overflow-y: scroll }` plus `body { overflow-x: hidden }`. `audit.mjs` and `capture.mjs` then report "Text past the viewport". They list text there only when no scroll reaches it: under a page-level clip, past the start edge (a negative margin, text-indent or translate), or in a fixed bar past the edge. Text the page scrolls to, or that a phone shows zoomed out, stays on the overflow lines. A clipping section below body is reported as "Text cut off by an overflow:hidden/clip container". `body { overflow-x: hidden }` hides the scrollbar, not the fault, and fools a detector that stops at any clipping ancestor; stop the walk at `body` (`audit.mjs` does). Inspect element boxes: readable text cut at the viewport edge is a fault unless it is inside a real horizontal scroller (one that scrolls sideways: `overflow-y: auto` alone makes a box that clips, not one that scrolls) or is a single-line ellipsis whose own box fits. `capture.mjs` and `audit.mjs` report text cut by a body- or html-level clip even when `scrollWidth` did not grow.
- **One overflowing element makes phones load the page zoomed out**: under mobile emulation a 900 px table widened the layout viewport to 924 px at a 390 device width. `capture.mjs` and `audit.mjs` report "layout viewport widened".
- **`grid-template-columns: 1fr` is `minmax(auto, 1fr)`**: one nowrap child (a search prompt, a URL chip) widens the track past the viewport at 390 and stretches everything else in it. Write `minmax(0, 1fr)`, and give grid or flex children that hold nowrap text `min-width: 0`.
- A CSS grid with `min-height: 100dvh` stretches its auto rows, so a "short" band grows to a third of the screen. Set the rows explicitly (`auto 1fr`).
- A `@media (pointer: coarse)` rule placed *before* the base rule is silently overridden — touch buttons stayed 36 px. Check rendered sizes.
- Text clipped by an `overflow: hidden` card (a table inside a rounded card) is invisible to axe and to overflow detectors; `audit.mjs` reports it.
- `audit.mjs` measures ink, not boxes: "Glyphs cut by their clipping box" names text in any script whose accents, Arabic marks or descenders are cut by 1 px or more by a box that clips it (`overflow` hidden/clip/auto/scroll, `line-clamp`), with the letters as drawn (text-transform, small caps, a preview scaled down with `zoom` or `transform`). Fix it with a line-height at the face's floor for that content (`fonts.mjs`), or with `overflow-x: clip; overflow-y: visible` and the ellipsis.
- Third-party iframes (reviews, badges, booking) often paint blank in headless captures because of bot challenges; confirm in a browser and give them a solid fallback.
- Behind a TLS-intercepting proxy (CI, some corporate networks, cloud sandboxes) web fonts can fail silently and every capture renders in fallback fonts; `audit.mjs` reports declared families that are not available.

## 3D and WebGL experiences

- **Judge only on a real GPU in a focused browser.** Embedded preview panes throttle `requestAnimationFrame` when the window is not focused (1 fps where the GPU gave 144; front the window), and the default headless shell renders WebGL in software (SwiftShader). Neither can judge motion or speed. Capture with `capture.mjs --gpu` (or `--headed`), which prints the renderer (`WEBGL_debug_renderer_info`) and flags a software one. Without those flags `capture.mjs` still prints the renderer on the first page of a run that has a `<canvas>` (in the page, in a shadow root, open or closed, or in an embedded iframe, the way Sketchfab, Spline and Matterport scenes arrive), so a 3D page captured in software says so. A canvas the page creates only after a click (a "View in 3D" button) is not there at capture time: pass `--gpu` to get the line. `--headed` on a Linux server needs `xvfb-run`, which gives a display but no GPU: the line still reads SwiftShader. Run the project's e2e tests the same way: full Chromium, not the headless shell, with GPU flags (on Windows `--use-angle=d3d11 --ignore-gpu-blocklist --enable-gpu`).
- **Check lighting before shape on generated geometry.** A dark, brown, faceted or black surface on something pale or metal usually means inverted winding: the normals point inward. Sweeps, lathes and extrusions each have a direction rule (a lathe profile runs bottom to top). Judge the silhouette once the lighting is right.
- **Procedural detail aliases.** A ridged profile twisted faster than about half a ridge per sample becomes spikes. Budget samples per unit length, not per path.
- **Calibrate against the client's own photographs** at the same angle, side by side, never from memory. Proportions, the scale of details, what sits on what and the colours come from the photo.
- **Measure, then state the number.** Measure the frame rate over 3 s at the target viewport and quality tier, and state it with the renderer: "144 fps at 1440×900, High tier, Radeon 680M". "It runs smoothly" is not evidence. Benchmark discipline: `realtime-3d.md` §3.

## Critique (Phase 7)

Fill `templates/critique.md` from the renders. The method:

1. **A fresh-context reviewer.** When subagents are available, this is not optional: give one only the brief and the direction from `DESIGN.md`, the capture paths (old and new — the pages *and* the state captures: filled, error, loading, anything seeded with `--storage`; a reviewer shown only empty pages cannot judge the flows) and the critique template, never the build conversation. In the one test where both were run on the same captures, the fresh reviewer found the direction's own first "breaks if" violated and two "no" answers, where the builder had answered all 22 checks "yes" (`research/experiments/L-fresh-review`). It writes its first impression (what the page communicates, the first three things the eye lands on, one word) *before* reading `DESIGN.md`, then critiques. A reviewer that inherits the builder's transcript inherits its optimism. If no subagent exists, say so in the report and make the self-review as blind as the tools allow: build the blurred sheet (`compare.mjs --blur 6`) and the no-text variant first, write the first impression from those two images alone, then the task walkthroughs (productive routes) judged from captures; only then re-read your own direction. If the environment offers any separate model call (an API, another agent), send it the captures and the brief, never the transcript.
2. **Objective → element → effect → why** for every point — analysis against the brief, not taste.
3. **Removal and swap tests** from the variant captures (`--variant all`): content-free, image-free, shadow-free; the name swap; headlines only; the blurred first viewport beside the old site and the last `ledger.md` project (`compare.mjs --grid … --blur 6`).
4. **Evidence per answer**: a "yes" names the capture file and what in it shows the answer; hierarchy and clarity cannot be answered from source. Before hand-off, re-open each cited capture and try to prove the "yes" wrong.
5. **Bounded rounds**: each round produces one batch of fixes and one full recapture, and re-scores the previous round's findings as resolved / partial / unresolved from the new captures (the builder's narration of a fix is not evidence). At most three rounds; if a "no" survives the third, or a round resolves nothing, stop and put the table in front of the user.

**Signature routes.** Check 27 judges the experience itself against its written quality bar (`discovery.md` §5b), from captures and filmstrips taken on a real GPU ("3D and WebGL experiences" above, `motion.md` §7), with the measured frame rate and the renderer stated. Its chrome and controls answer the productive rows and get task walkthroughs.

Expect at least one round of fixes; the first implementation almost always keeps something it should have replaced.

## Task walkthroughs (productive routes)

On a work tool, "can the user do the task?" is answered by attempting it, not by looking at the screen. Do it on the old build and the new one, with the same tasks, on the device the user holds.

1. **Write each top task as the user would say it, with the answer they need.** For example: "Which cows do I check before letting them out?" Do not write "use the alerts panel": naming the route gives the answer away.
2. **Start from a scenario with no steps** and look at the capture:
   `node scripts/states.mjs walk.json --aria --each --out captures/walk/new`
   Beside each capture, `--aria` writes the accessibility tree. Every node a sighted user cannot read on that screen is marked: ⟨below⟩, ⟨cut off by …⟩, ⟨in a sideways scroller: …⟩, ⟨covered by …⟩, ⟨transparent⟩, and ⟨inert: …⟩ or ⟨aria-hidden: …⟩ for content the snapshot lists but the accessibility tree does not have (inside `inert`, outside an open modal dialog, under `aria-hidden="true"`). The header counts what is named but not readable.
3. **Choose the next step from what the capture shows**, the way the user would:
   - `tap` a point you can see, or a visible control's role and name
   - `swipe` to scroll
   - `fill` what a keyboard would type

   Never `scroll` to a selector. It reaches content no finger can, such as a column cut off by `overflow: hidden`. Never act on a marked node until a step has brought it on screen. Append the step and run again: every run replays from a fresh load, and `--each` gives the whole path as numbered captures, with a ring where each tap landed.
4. **Stop when you can state the answer the user needed**, or when three steps in a row make no progress (a failure). The driver reports:
   - "changed nothing on screen" for a dead tap or a swipe on something that does not scroll
   - what each tap hit and its size
   - a capture of where a failing step stopped
5. **Record per task and build:**
   - the result: yes / partial / no, with the answer as you would give it
   - the number of user actions
   - the dead taps
   - the doubts: each one a capture and the moment a user would hesitate
   - what was named but not readable

   An answer you had to assemble by cross-referencing screens (counting rows across four captures, matching dots to names) is "partial". A model reads more patiently than someone at 5 am.
6. **Say what it cannot show.** Reach, tap accuracy, gloves, glare, fatigue and real assistive technology are outside it. It is a walkthrough, not a usability test with users, and the report says so.

The first run of this method compared an old and a redesigned field-tool screen on a phone (research experiment K; four attempts, about six minutes). It found things no checklist asks about:

- a KPI tile saying "Alerts 5" above an Alerts panel saying "No data"
- the answer to the first task sitting in a clipped column
- the cow's name scrolling away exactly when the status came into view
- a backdrop tap that opened another record instead of closing the sheet
- a reading with no time on it

It also overstated the old build's success. The tester had used the tree to find hidden columns and a selector scroll to reveal them, which no user could do. The ⟨…⟩ marks, touch swipes and dead-tap reports exist because of that.

## Reporting captures

Send the user the before/after sheets (first viewport and full page at desktop, full page at phone) and the removal-test sheet if it made a point. Large images may need splitting or recompressing to upload; keep the originals.
