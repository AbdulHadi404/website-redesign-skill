<!-- Stream S1, saved from the lab agent's hand-back (corrected after review). Experiment folder: research/stage2/experiments/S1-rendering-lab/. The skeptical review is in S1-rendering-lab.review.json. -->

# S1 — Rendering technology: DOM/CSS vs SVG vs Canvas vs PixiJS vs Phaser vs Three.js vs R3F, and the full engines

## What the skill already knew

`motion.md` §9 and `realtime-3d.md` cover 3D once it has been chosen:
- when 3D earns its place;
- a tool table: `<model-viewer>`, three.js 131 KB, R3F + drei 243 KB, OGL, Babylon deep imports vs the barrel, Spline;
- poster first, load late, render on demand, `role="img"` on a canvas, "if WebGL fails, keep the poster";
- judge frame rate on a real GPU, and build a benchmark harness before the fidelity pass.

`ui-ux.md` §7b already requires a tap-to-place alternative to every drag, and uses 6 px of pointer travel to tell a tap from a drag. `performance.md` gives a signature experience its own route and budget. Stream F measured 3D library sizes and SVG-versus-canvas limits for charts.

The skill had no rule for choosing, for an interactive scene, between DOM, SVG, Canvas 2D, a 2D WebGL engine, a 3D library and a full engine. It did not cover:
- the 2D scene engines;
- rendering in a Worker;
- keyboard and screen-reader operation of objects drawn on a canvas;
- which engines survive the loss of WebGL;
- when Unity or Godot is justified;
- what CDP CPU throttling does and does not emulate.

## Findings (tagged; numbers where they exist)

**Sources and setup.**
- [L] means `research/stage2/experiments/S1-rendering-lab/results.json` unless the tag names something else. Every table is also in `results.md`.
- Chromium 141 headless on 4 shared CPUs; stage 800×600 at DPR 1; median of 5 runs, or 3 where stated.
- Two sessions:
  - (a) Before review, load average 5–20: main matrix, instancing, present, survey.
  - (b) After review, mostly load 1–3: throttle probe, sweep, busy-machine sweep, Worker, DOM probe, accessibility, context loss, reduced motion, no-WebGL, shots.
- The first sweep is kept in git history (`results.json` at commit 938dac1).
- WebGL ran on SwiftShader and the compositor ran in software. **WebGL frame rates are pessimistic and can only be compared with each other.** The measures that do not depend on the GPU are JS ms/frame, main-thread busy % and style time.
- **"4×" means the main thread is 4× slower. It does not emulate a phone.**
  - CDP `Emulation.setCPUThrottlingRate` slows only the page's main thread [L throttleProbe]. The same loop went from 277–297 ms to 1229–1235 ms on the main thread, but stayed at 277–287 → 279–288 ms in a Worker.
  - The same command sent to the Worker's own target returns "Operation is only supported for pages, not workers". The reviewer measured this independently (Worker minimum 866 → 905 ms).
  - The compositor, raster threads, GPU process and Workers therefore run at full speed. That favours DOM and SVG, whose compositing and raster happen off the main thread, over Canvas 2D, which draws on the main thread. It would favour a Worker over everything.
  - So Worker variants are now measured at 1× only, and the runner drops any Worker cell above 1×.

**F1. Cost before anything moves.** [L build, main matrix. The 4× column is main-thread-only throttling.]

| | runtime gzip | app gzip | first frame N=200, 1× / 4× main thread | heap N=200 / 2000 |
|---|---|---|---|---|
| DOM + CSS | 0 | 3.0 KB | 49 / 135 ms | 2.0 / 2.2 MB |
| inline SVG | 0 | 3.1 | 68 / 197 | 2.1 / 2.3 |
| Canvas 2D | 0 | 2.9 | 48 / 211 | 1.9 / 2.1 |
| Canvas 2D in a Worker | 0 | 1.7 + 2.0 (worker) | 56 / — (not comparable at 4×) | 1.8 / 1.8 |
| PixiJS 8.21 | 162 KB | 3.2 | 255 / 880 | 4.2 / 6.9 |
| Phaser 4.2.1 | 361 | 3.0 | 287 / 847 | 5.8 / 8.6 |
| three.js r186 | 130 | 3.6 | 150 / 388 | 4.1 / 6.9 |
| R3F 9.8.1 + React 19.3 | 309 | 3.5 | 654 / 1124 | 6.6 / 14.3 |

- **Phaser cannot be tree-shaken.** Its `"module"` entry is `./dist/phaser.esm.js`, a prebuilt bundle [V phaser 4.2.1 package.json]. A hello world is 361 KB gzip, 2.2× PixiJS, and includes Arcade and Matter physics [L survey; V `src/physics/`].
- **R3F's `<Canvas>` pulls in all of three.js** through `extend(THREE)` [V @react-three/fiber 9.8.1 `dist/react-three-fiber.esm.js:40`].
  - `createRoot` + `extend({ Mesh, PlaneGeometry, MeshBasicMaterial })` brings a hello world from 309.8 KB to 188.6 KB gzip.
  - The first frame at 4× main thread then arrives at 415 ms instead of 622 [L survey].
- **`@pixi/react` 8.0.5** adds about 41 KB over PixiJS + React [L survey].
- **three.js r163 and later require WebGL 2** [V three r186 `src/renderers/WebGLRenderer.js:102`].

**F2. Where each CPU renderer stops holding the frame rate.** [L sweep, session (b)]
- Each cell is fps · % of frames that missed a vsync (rAF delta > 25 ms).
- **Holds** means at most 10% of frames miss a vsync (median of 5 runs). A limit is a bracket: the last count that holds, then the first that fails, each with how many of the 5 runs held.
- p95 is no longer used as the criterion. rAF deltas come in whole vsyncs (17 / 33 / 50 ms), so p95 flips on a single frame; that is why two cells landed on the other side of the line in the reviewer's rerun.

1× (load 0.7–4.8; every renderer ran at 60 fps with 0% missed from 200 to 700 objects):

| | 1000 | 1400 | 1700 | 2000 | holds up to |
|---|---|---|---|---|---|
| DOM | 57.4 · 4% | 25.4 · 99% | 22.0 · 100% | 19.8 · 100% | 1000 (4/5) – 1400 (0/5) |
| SVG | 58.6 · 2% | 46.0 · 28% | 41.5 · 41% | 35.1 · 63% | 1000 (4/5) – 1400 (0/5) |
| Canvas 2D | 60.0 · 0% | 58.8 · 2% | 53.0 · 13% | 44.9 · 34% | 1400 (5/5) – 1700 (2/5) |
| Canvas 2D in a Worker | 59.4 · 1% | 57.8 · 4% | 48.8 · 23% | 43.9 · 37% | 1400 (4/5) – 1700 (0/5) |

4×, main thread only (load 1.5–3.0):

| | 200 | 300 | 400 | 500 | 700 | holds up to |
|---|---|---|---|---|---|---|
| DOM | 60.0 · 0% | 59.2 · 1% | 53.2 · 13% | 41.3 · 45% | 24.3 · 97% | 300 (5/5) – 400 (0/5) |
| SVG | 60.0 · 0% | 59.2 · 1% | 55.4 · 8% | 41.7 · 44% | 32.0 · 83% | 400 (4/5) – 500 (0/5) |
| Canvas 2D | 60.0 · 0% | 58.8 · 2% | 44.1 · 36% | 37.7 · 59% | 26.7 · 98% | 300 (5/5) – 400 (0/5) |

- **The limits depend heavily on what else the machine is doing, and DOM and SVG are hit hardest.**
  - With 3 spinning processes (load 5.3–6.1) [L sweepLoad, 3 runs]:
    - DOM at 700 fell to 34.1 fps (63% missed) and at 1000 to 17.9 fps.
    - SVG at 700 fell to 47.6 fps (24% missed).
    - Canvas 2D held 1000 at 59.8 fps and 1400 at 56.6 (6% missed).
  - The first sweep, at load 12–17 (commit 938dac1, recomputed with the same criterion), shows the same pattern: DOM and SVG held 400 and failed at 700 at 1×, while Canvas 2D held 1400.
  - The GPU-process CPU column explains it: at 1000 objects, DOM's software compositor used 88% of a core against 6% for Canvas 2D. DOM spreads its cost over the main thread plus other processes that need free cores; Canvas 2D's cost stays on the main thread.
- **Read these as relative positions.**
  - At full speed on a quiet machine, the three CPU renderers stop within 1.4× of each other: 1000–1400 for DOM and SVG, 1400–1700 for Canvas 2D.
  - On a busy machine, Canvas 2D holds about 2–2.5× the DOM's count.
  - With only the main thread slowed, all three stop at 300–500, and Canvas 2D is slightly the worst (36% missed at 400 against 13% for DOM and 8% for SVG), because it is the only one drawing on the throttled thread.
  - On a phone, DOM compositing runs on the GPU and Chrome's Canvas 2D is usually GPU-accelerated [K], so the real-device gap is unknown. These brackets are provisional until measured on a mid-tier Android.
- **Drag latency at 1×** (pointer move → frame, median) [L sweep]:
  - DOM: 15 ms up to 700 objects, 34 at 1000, 51 at 1400.
  - Canvas 2D: 15 ms up to 1000, 31 at 1400, 44 at 2000.
  - Worker: 31 ms almost flat (37 at 2000), one frame more than the main thread.

**F3. JS per frame at N=2000.** [L: three/R3F from the instancing set, the others from the main matrix]

This is main-thread JavaScript, so the main-thread throttle applies to it fully and fairly.

| | 1× | 4× main thread | draw calls |
|---|---|---|---|
| three.js, one mesh per object | 6.9 ms | 18.3 ms | 2001 |
| R3F, one `<mesh>` per object | 7.7 | 19.4 | — |
| Phaser | 1.2 | 6.3 | — |
| PixiJS | 1.0 | 4.0 | batched |
| three.js, one InstancedMesh | 0.5 | 1.9 | 2 |
| R3F, one `<instancedMesh>` | 0.6 | 2.3 | 2 |
| Canvas 2D (drawImage per object) | 1.8 | 7.6 | — |

- **One mesh or component per object does not scale.** At 2000 objects with a 4× slower main thread, 18–19 ms of JS per frame is over the 60 Hz budget before any GPU work.
  - Instancing cuts it 8–14×. The reviewer reproduced 9–14×.
  - Once instanced, R3F stays within 0.1–0.5 ms of vanilla three.js [L instancing].
- **PixiJS's automatic batching was the cheapest scene graph measured.** On their Canvas 2D fallbacks at N=2000 (session b): Canvas 2D 37.2 fps (JS 1.9 ms), PixiJS 38.7 (4.1 ms), Phaser 35.3 (3.5 ms) [L nowebglPerf]. The earlier run and the reviewer's agree within 10%. In a 2D scene, the time goes into drawing, not the scene graph.
- **SwiftShader turns the ranking upside down.** Every WebGL variant was the slowest here (18–23 fps at N=200). The expectation that PixiJS and instanced three/R3F hold 60 fps at 2000 objects on real hardware is an inference from the JS column. It is also why the step that changes the order of magnitude is GPU batching, not DOM → Canvas 2D (F2) [inference].

**F4. CSS animations cost the main thread nothing only while nothing else produces frames.** [L domProbe, session (b), 5 runs]
- **Idle page** with 200 or 2000 elements animating in CSS or WAAPI: 0–0.5 style recalcs a second, about 6 ms of style work per second at 2000 elements.
- **One `requestAnimationFrame` loop anywhere on the page** makes Chromium recalculate style for every animated element on every frame:
  - 200 elements: 40–47 ms of style work per second (0.66–0.78 ms a frame).
  - 2000 elements: 250–273 ms per second (26–28 recalcs a second at 9–10 ms each); main thread 43–53% busy.
- **The recalc rate and the time per recalc trade off, but their product is stable.** Across three sessions (session a, the reviewer's rerun, session b) the rate varied 13–28 a second and the time 9–25 ms, but the product stayed at **250–340 ms of style work per second**: a quarter to a third of the main thread.
- **A drag with no loop costs the same** (one element moved every 16 ms):
  - 2000 animated siblings: 243 ms of style work per second, main thread 61% busy;
  - the same drag without the sibling animations: 9.5 ms per second;
  - 200 siblings: 52 against 4.1 ms per second.

**F5. SVG and touch.**
- **SVG children are not composited individually.** At N=200 and 1× the renderer used 7.8 ms of CPU per frame for SVG against 3.7 for DOM, and SVG needs twice the nodes [L sweep].
- **`touch-action` is taken from the element the finger lands on** [V W3C Pointer Events §touch-action]. DOM and SVG objects can block panning while the gaps between them keep `pan-y`. A canvas either blocks scrolling over its whole area or loses drags to scrolling.

**F6. Worker (OffscreenCanvas). Measured at 1× only.** [L worker, session (b); the main thread busy for 50 ms every 100 ms]

| N | Canvas 2D on the main thread: fps · missed · drag p50/p95 | Canvas 2D in a Worker | DOM |
|---|---|---|---|
| 200 | 49.9 · 20% · 16 / 61 ms | 60.0 · 0% · 29 / 33 ms | 49.7 · 20% · 14 / 57 ms |
| 700 | 40.0 · 25% · 15 / 69 | 60.0 · 0% · 29 / 33 | 39.7 · 26% · 24 / 76 |
| 2000 | 23.1 · 61% · 93 / 102 | 44.2 · 36% · 36 / 70 | 12.4 · 100% · 103 / 148 |

- **Heavy scene on a busy main thread:** about 1.9× the frame rate (44 against 23 fps) and a 2.6× faster typical drag (36 against 93 ms). The reviewer's rerun: 38.8 against 21.6 fps.
- **Light scene on a busy main thread:** the animation stays smooth (60 against 40–50 fps) and the worst-case drag improves (p95 33 against 61–69 ms). The typical drag is one frame slower (29 against 15–16 ms): every move takes a postMessage hop and waits for the Worker's next frame. The reviewer saw the same (23.7 against 13.3 ms).
- **Idle page:** no capacity gain (both hold 1400–1700 at 1×, F2) and one frame of added latency (31 against 15 ms) [L sweep].
- **Input still arrives on the main thread.** A Worker cannot handle input faster than the page's longest task.
- **Deleted:** the earlier 4× Worker claims (about 700 objects "on a phone", 37.5 against 7.5 fps, drags at 24 ms). Their Worker ran unthrottled. How a Worker performs on a phone is unmeasured.
- **Support:** OffscreenCanvas has been Baseline since 2023 [S MDN]. Branch on what `getContext()` returns, not on the constructor [S testmuai.com].

**F7. Accessibility.**
- **With no extra work,** DOM exposes nothing, SVG a single `img`, and every canvas nothing; none of them is reachable with Tab [L a11y tree].
- **The keyboard and screen-reader layer** covers WCAG 2.1.1 Keyboard and 4.1.2 Name, Role, Value [L a11y keyboard: passes on DOM, SVG and the PixiJS overlay]:
  - one Tab stop (roving tabindex, `role="group"` with a name), arrow keys to move focus;
  - Enter or Space to pick up, arrow keys to move (Shift for larger steps), Enter to drop with the pointer's feedback, Escape to put it back;
  - a polite live region.
- **It does not satisfy WCAG 2.5.7.** The Understanding document says keyboard equivalence "does not automatically meet this success criterion unless that equivalent keyboard operation also provides controls that can be clicked or tapped with a pointer", and that the two requirements "are evaluated independently" [V w3c/wcag `understanding/22/dragging-movements.html`].
- **Tap-to-place is now built and tested** [L a11y tapToPlace]:
  - A press with under 6 px of travel is a tap (the value `ui-ux.md` §7b uses).
  - Tap an object → "Picked up …". Tap a spot → it lands exactly there (0 px off), the counter goes up, and "Placed …" is announced. Tap it again → it is put down where it is.
  - Passes on DOM, SVG and PixiJS. It adds about 0.2–0.3 KB gzip to the layer's roughly 1.2 KB.
- **The overlay must be synced from the one function that moves objects.**
  - In the earlier PixiJS build only the keyboard path synced. After a mouse drag, the button (and the focus ring and screen-reader focus rectangle with it) stayed 116.6 px from the object. The reviewer found it; `?nosync` reproduces it [L a11y overlaySync].
  - Routing pointer drag, keyboard and tap-to-place through one `moveItem()` that syncs gives 0 px drift.
- **Position overlay buttons with `transform`, not `left`/`top`.** Style and layout per pointer move at 2000 objects on PixiJS's Canvas renderer [L a11yPerfCanvas]:

  | | 1× | 4× main thread |
  |---|---|---|
  | `transform` | 0.38 ms | 1.76 ms |
  | `left`/`top` | 1.64 ms | 7.15 ms |
  | no sync | 0.01 ms | 0.04 ms |

  - At rest the layer costs nothing: JS 3.8 against 3.9 ms/frame, renderer 25.8 against 25.8 ms/frame.
  - It adds N+5 DOM nodes and 1.6 KB gzip.
  - On DOM and SVG, which use native elements, there is no measurable cost at 200 or 2000 objects (for example SVG at 2000: 26.6 against 27.0 fps, renderer 80.8 against 80.2 ms/frame).
- **SVG traps found in this session:**
  - A `<use>` of a `<symbol>` whose viewBox crops a sprite atlas reports the whole atlas strip as its box: 512×74 for a 48 px sprite. A CSS outline frames the wrong area (134 px off), shown in `shots/focus-ring.jpg` [L a11y focusRing].
    - The fix is one explicit ring shape, moved into the focused item.
    - An earlier version with a ring per item added 2 nodes per item and cost about 13% of the frame rate at 2000 objects (30.3 against 34.7 fps); the shared ring costs nothing measurable.
    - Screen readers may use the same wrong box [K, untested].
  - In Chromium, an SVG element with a `focusin` listener becomes a Tab stop. With the listener on the `<g>` layer, the first Tab landed on the group instead of an item [L a11y firstTab, `?focusonsvg`]. Listen on an HTML ancestor instead.
- **PixiJS's AccessibilitySystem does not fit a scene people manipulate.**
  - One Tab stop per object, Enter only clicks, and there is no keyboard move [L].
  - It rewrites overlay positions every frame. At 2000 objects: JS 5.3 against 0.9 ms/frame; renderer 32.7 against 4.9 ms/frame; 42.5 ms of style and layout per pointer move [L a11yPerfWebgl]. The reviewer measured 6.55 against 1.35 ms.
  - It registers only for the WebGL and WebGPU renderers [V pixi.js 8.21 `lib/accessibility/AccessibilitySystem.mjs:533–535`]. On the Canvas fallback no accessibility DOM exists (43 nodes) [L a11yPerfCanvas].
- **Full engines:**
  - AccessKit, used by Godot 4.5 for screen readers, has released adapters for Android, iOS, macOS, Unix and Windows; the web adapter is "planned" [V AccessKit/accesskit README]. So Godot's screen-reader support does not reach a web export.
  - Unity's screen-reader API does not list the Web [S docs.unity3d.com].
  - Both engines can exchange messages with the page: Unity through `SendMessage` [V JohannesDeml/UnityWebGL-LoadingTest `Assets/WebGLTemplates/Develop/index.html:164`, `WebEventListeners.jslib:12`], Godot through `JavaScriptBridge` [V godot-docs `tutorials/platform/web/javascript_bridge.rst`].
  - So the parallel DOM layer is possible over an engine canvas, but costly: positions must be bridged out on every move and keyboard input bridged back in [inference; untested].

**F8. When WebGL is unavailable or lost.** [L nowebgl, session (b); `shots/no-webgl.jpg`]
- DOM, SVG, Canvas 2D and the Worker are unaffected.
- PixiJS falls back to `pixi-canvas` and Phaser.AUTO to `phaser-canvas`, both at 60 fps [V `autoDetectRenderer`; `src/core/CreateRenderer.js:44`].
- three.js, three-instanced and R3F render nothing ("Error creating WebGL context").
- R3F's `<Canvas fallback>` is rendered as children of the `<canvas>` element, so it does not cover a WebGL failure [V fiber `react-three-fiber.esm.js:55–61, 180–183`].
- A WebGL check plus an error boundary with the poster works [L `instancingNoWebgl`, session a].
- Context lost and restored: 5 of 5 variants recovered [L contextLoss, session b].

**F9. At rest and under reduced motion.** [L reduced, session b]
- 0 animation-frame requests in 5 s everywhere, except PixiJS at 300.
- PixiJS's EventsTicker runs on `Ticker.system` [V `lib/events/EventTicker.mjs:39`]. `Ticker.system.stop()` brings it to 0, and the drag still works.

**F10. Engines not built as the scene.** [L survey, session a; the reviewer reproduced every size]

| engine | gzip at boot | boot at 4× main thread | licence | React | latest | note |
|---|---|---|---|---|---|---|
| Konva (core + Image) | 33.2 KB (full 56.5) | 187 ms | MIT | react-konva 19.3 (166.9 KB with React) | 10.7.0, 2026-09 | Canvas 2D scene graph: hit testing, drag, transformer [K] |
| Fabric | 86.2 | 205 | MIT | none | 7.4.0, 2026-05 | object editor |
| Two.js | 49.5 | 189 | MIT | community | 0.8.24, 2026-08 | SVG, Canvas or WebGL back end |
| p5.js | 413.3 | 2903 | LGPL-2.1 (no licence file) | none | 2.3.4, 2026-09 | sketchbook, not a product runtime |
| OGL | 15.1 | 180 | Unlicense | community | 1.0.11, 2025-01 | one shader plane |
| Babylon.js (deep imports) | 24.7 initial, **270.9 fetched before the first frame** | 521 | Apache-2.0 | react-babylonjs 4.0.2 | 9.28.0, 2026-09 | shaders load as dynamic chunks |
| PlayCanvas engine | 493.0 | 561 | MIT | @playcanvas/react 0.11.7 (592.8 KB with React) | 2.22.6, 2026-09 | no small core; hosted editor free for public projects only [S playcanvas.com/plans] |
| Excalibur | 122.5 | 2120 | BSD-2-Clause | none | 0.32.0, 2025-12 | 2D game engine |
| KAPLAY | 68.2 | 896 | MIT | none | 3001.0.19, 2025-06 | Kaboom is deprecated [V registry] |
| LittleJS / litecanvas | 24.6 / 6.0 | 244 / 105 | MIT | none | 2026 | tiny game loops |
| melonJS | 244.4 | 518 | MIT | none | 20.7.0, 2026-09 | 2D game engine |
| matter-js | 26.4 | — | MIT | — | 0.20.0, **2024-06** | enough physics for a toy |
| Rapier 2D (compat) | **1251** (WASM as base64) | 538 | Apache-2.0 | @react-three/rapier (3D) | 0.21.0, 2026-09 | use the non-compat build |
| Rive (as a scene engine) | 56 JS + 787 WASM (stream F) | — | runtime MIT | @rive-app/react-canvas | 2.43.1, 2026-09 | designer-authored artboards; not for N data-driven objects |

Full engines (not npm packages):

| engine | minimum web payload | licence | React | notes |
|---|---|---|---|---|
| Unity 6 | 3.29–3.76 MB brotli for a small scene; +~2.5 MB with URP [V JohannesDeml/UnityWebGL-LoadingTest README] | proprietary; Personal free under US$200k [S] | iframe or engine-owned canvas; `SendMessage` / jslib [V] | mobile browsers: high-end devices only [S unity.com] |
| Godot 4 | 6.33 MB small 3D + physics on 4.6.2 [V JohannesDeml/Godot-Web-LoadingTest README] | MIT [V] | `JavaScriptBridge` [V] | Compatibility renderer only; no C# on the web; single-threaded export avoids COOP/COEP since 4.3 [V godot-docs] |
| Defold | 1.02–1.22 MB empty [V defold/build-size `bundle_report.csv`] | Defold License 1.0 (not OSI) [V] | none | smallest full engine |
| Cocos Creator | ~1.8 MB empty (2021 report) [S forum.cocosengine.org] | engine MIT [V] | none | mobile web and mini-games |
| Needle Engine | not measured | commercial use needs a paid licence [S needle.tools/pricing] | none official | Unity/Blender to three.js |

## Experiments

**Folder:** `research/stage2/experiments/S1-rendering-lab/`, about 3.5 MB without `node_modules`, `dist` and `survey/dist`.
- `run.mjs` is the single runner. `lib/` holds build, measure (including `throttleprobe.mjs` and `domprobe.mjs`), report, survey and contact sheets.
- `src/` has one folder per variant plus `shared/` (scene model, Canvas 2D drawing, the keyboard and tap-to-place layer in `a11y.js`).
- `survey/`, `shots/` (JPEG), `results.json` and `results.md`.
- The art is generated by `lib/atlas.mjs`, so there are no third-party assets.

**Re-run.**
- Everything: `npm install && node run.mjs`, about 3.5 h. The browser comes from the skill's `scripts/node_modules/playwright-core`, or from `CHROME_PATH`.
- Quick look: `node run.mjs --runs 1`.
- Phases: build, shots, throttleprobe, main, sweep, sweepload, instancing, worker, present, domprobe, a11y, a11ywebgl, contextloss, reduced, nowebgl, survey, report.
- A subset, for example: `node run.mjs --phase sweep --only dom,canvas2d --throttle 1 --sweepn 700,1000,1400`.
- A full run of a phase replaces that phase's section. `--only`, `--n`, `--throttle` and `--sweepn` merge instead.
- Switches that reproduce the failure modes:
  - `?nosync`: the unsynced overlay;
  - `?lefttop`: overlay positioned with `left`/`top`;
  - `?outline`: CSS outline on SVG sprites;
  - `?focusonsvg`: focus listener on an SVG element;
  - `?stopSystemTicker`.
- Session (b) re-ran or added: build, shots, throttleprobe, sweep (new steps and criterion), sweepload (3 spinning processes), worker (1× only), domprobe (5 runs, style ms per second), a11y (plus tap-to-place, overlay sync, focus ring and first-Tab tests; DOM/SVG cost; PixiJS cost on the Canvas renderer and on WebGL), contextloss, reduced, nowebgl.
- The main matrix, instancing, present and survey are from session (a). The code changes since then alter non-keyboard bundles by at most 0.03 KB, and visual parity is unchanged: 0.00% / 0.02% [L shots].

**Scene and method** (unchanged apart from the points below):
- One scene in every variant (`src/shared/scene.js`), N decorations from one atlas, seed 42.
- Hover and select scaling, a bob, drag with raise-to-top, a 14-spark burst and a DOM counter.
- A production esbuild build, a fresh browser context per run, 1 s warm-up and a 5 s window: rAF deltas, CDP metrics, CPU per process, the scene's JS per frame.
- A scripted 30-move drag timed from input to frame, then heap after GC. Variants run round-robin.
- New in session (b):
  - the missed-vsync share, and how many runs held per cell;
  - drag-window CPU: style + layout per move and main-thread ms per move;
  - the load average stored with every run.

**Main matrix** (session a; WebGL rows are SwiftShader; the Worker is shown at 1× only). Each cell is fps · frame p95 ms · JS ms/frame · main busy % · drag move→frame p50 ms.

1× CPU:

| variant | N=20 | N=200 | N=2000 |
|---|---|---|---|
| dom | 60.0 · 17 · — · 3% · 14 | 60.0 · 17 · — · 19% · 14 | 6.4 · 283 · — · 67% · 190 |
| svg | 60.0 · 17 · — · 4% · 14 | 59.8 · 17 · — · 20% · 13 | 16.3 · 133 · — · 97% · 134 |
| canvas2d | 60.0 · 17 · 0.1 · 7% · 14 | 60.0 · 17 · 0.2 · 20% · 15 | 29.8 · 67 · 1.8 · 99% · 52 |
| canvas2d-worker | 60.0 · 17 · 0.1 · 1% · 29 | 59.2 · 17 · 0.2 · 1% · 30 | 26.5 · 84 · 2.2 · 1% · 37 |
| pixi | 42.7 · 33 · 0.2 · 100% · 48 | 23.2 · 83 · 0.3 · 99% · 71 | 2.3 · 767 · 1.0 · 100% · 854 |
| phaser | 45.2 · 33 · 0.2 · 99% · 43 | 18.8 · 100 · 0.3 · 100% · 85 | 1.7 · 800 · 1.2 · 100% · 1283 |
| three | 40.1 · 50 · 0.2 · 99% · 43 | 18.5 · 100 · 0.7 · 100% · 95 | 1.8 · 750 · 6.9 · 100% · 1125 |
| three-instanced | 40.3 · 50 · 0.2 · 100% · 52 | 17.8 · 100 · 0.3 · 100% · 108 | 1.8 · 650 · 0.6 · 100% · 1292 |
| r3f | 43.1 · 33 · 0.3 · 100% · 50 | 17.7 · 100 · 0.7 · 100% · 97 | 1.6 · 900 · 8.3 · 100% · 1215 |

4×, main thread only:

| variant | N=20 | N=200 | N=2000 |
|---|---|---|---|
| dom | 59.8 · 17 · — · 15% · 13 | 53.6 · 33 · — · 65% · 28 | 3.3 · 700 · — · 83% · 447 |
| svg | 59.4 · 17 · — · 17% · 12 | 47.2 · 50 · — · 71% · 22 | 7.0 · 233 · — · 99% · 303 |
| canvas2d | 59.0 · 17 · 0.1 · 30% · 13 | 55.6 · 33 · 0.7 · 75% · 25 | 9.3 · 183 · 7.6 · 99% · 205 |
| pixi | 21.1 · 83 · 0.8 · 99% · 90 | 11.3 · 183 · 1.0 · 99% · 163 | 1.8 · 900 · 4.0 · 100% · 1144 |
| phaser | 19.5 · 100 · 0.9 · 99% · 90 | 10.0 · 233 · 1.2 · 99% · 214 | 1.5 · 1250 · 6.3 · 100% · 1318 |
| three | 20.9 · 83 · 1.0 · 99% · 91 | 9.3 · 233 · 2.5 · 99% · 196 | 1.9 · 800 · 18.1 · 100% · 1283 |
| three-instanced | 16.7 · 117 · 0.9 · 98% · 81 | 10.2 · 233 · 1.1 · 100% · 180 | 1.6 · 1050 · 2.0 · 100% · 1118 |
| r3f | 23.3 · 83 · 1.0 · 99% · 77 | 11.4 · 167 · 2.9 · 99% · 164 | 1.4 · 1150 · 18.2 · 100% · 1240 |

**Instancing set** (session a). Each cell is JS ms/frame · first frame ms · heap MB.

| | N=200, 1× | N=200, 4× | N=2000, 1× | N=2000, 4× |
|---|---|---|---|---|
| three, mesh per object | 0.80 · 191 · 4.1 | 2.85 · 340 · 4.1 | 6.9 · 221 · 6.9 | 18.3 · 486 · 6.9 |
| three, InstancedMesh | 0.30 · 171 · 3.7 | 0.95 · 363 · 3.7 | 0.5 · 170 · 3.9 | 1.9 · 394 · 3.9 |
| R3F, `<mesh>` per object | 1.00 · 627 · 6.6 | 2.80 · 1040 · 6.6 | 7.7 · 783 · 14.3 | 19.4 · 2434 · 14.3 |
| R3F, `<instancedMesh>` | 0.30 · 607 · 5.7 | 0.40 · 1196 · 5.6 | 0.6 · 662 · 6.1 | 2.3 · 1371 · 6.1 |

**Cost of the keyboard layer** (session b). "Style + layout per move" is per pointer move during a drag.

| | N | fps | JS ms/frame | renderer ms/frame | style + layout per move | DOM nodes | app gzip KB |
|---|---|---|---|---|---|---|---|
| DOM / + layer | 2000 | 20.0 / 20.1 | — | 56.1 / 57.5 | 44.6 / 43.4 ms | 6046 / 6050 | 3.0 / 4.4 |
| SVG / + layer (one shared ring) | 2000 | 27.0 / 26.6 | — | 80.2 / 80.8 | 44.4 / 42.4 | 12074 / 12079 | 3.1 / 4.6 |
| PixiJS Canvas renderer / + layer / + layer with `left`/`top` | 2000, 1× | 39.7 / 40.3 / 41.3 | 3.9 / 3.8 / 3.6 | 25.8 / 25.8 / 25.1 | 0.01 / 0.38 / 1.64 | 43 / 2048 / 2048 | 3.2 / 4.8 |
| same | 2000, 4× main thread | 8.3 / 8.2 / 8.1 | 20.0 / 20.4 / 20.1 | 132.8 / 132.7 / 135.2 | 0.04 / 1.76 / 7.15 | | |
| PixiJS WebGL (SwiftShader) / + layer / + AccessibilitySystem | 2000, 1× | (SwiftShader-bound) | 0.9 / 0.9 / 5.3 | 4.9 / 5.5 / 32.7 | 0.01 / 0.43 / 42.5 | 44 / 2049 / 2045 | 3.2 / 4.8 / 3.4 |

## Decision guidance for the skill

### G1. NEW `realtime-3d.md` §1a "Choose what renders the scene" (and a one-line pointer from `motion.md` §9, EXTENDS)

Widen the file's first line to "real-time 2D or 3D". Choose from the design requirement and write one line per question into `DESIGN.md`:

1. **Objects:** at peak, how many move at the same time?
2. **Depth:** are perspective, lighting and materials needed, or does a flat illustration read correctly?
3. **Effects:** filters, blend modes, masks or shaders on many objects? Thousands of particles?
4. **Text in the scene:** labels people read, edit, translate or select?
5. **Operability:**
   - keyboard and screen reader (WCAG 2.1.1, 4.1.2);
   - a single-pointer alternative to every drag (2.5.7: tap to pick up, tap to place, `ui-ux.md` §7b).

   For a product: all of these.
6. **Game loop:** collisions, gravity, levels, a win state?
7. **Host:** its own route, a busy React app, or a section of a scrolling page (touch scrolling, F5)?
8. **Budget:** the route's first frame and JavaScript (`performance.md` §1).
9. **Failure:** must it work where WebGL is blocked or lost?

Walk down the table and stop at the first level that satisfies every answer.

| Level | Take it when | Move down when (measured) | React pattern |
|---|---|---|---|
| **1. DOM + CSS** (default) | A few hundred objects animating at once (held 300 with the main thread 4× slower; 1000 at full speed on a quiet machine; 400 when the machine was busy). Images, text or controls; translation or selection matters; keyboard and screen reader needed; instant first frame (49 ms, 3 KB). | More objects than that animate at once. Or the page also runs a frame loop or drags over hundreds of CSS-animated objects (250–340 ms of style work a second at 2000, F4). Or effects CSS cannot do per object. | One component per object with `memo`. A drag writes `style.transform` through a ref and commits on drop. Idle motion is a CSS/WAAPI animation of `translate`. Use two elements per object. Scope `touch-action: none` to the objects. |
| **1b. Inline SVG** | Vector geometry (paths, connectors, diagrams, maps); crisp zoom or SVG export. | The same bracket as DOM, at twice the renderer CPU and nodes. Raster sprites belong in DOM or canvas: an atlas-cropping `<use>` reports the wrong element box (F7). | A JSX `<g>` per object; `<symbol>`/`<use>` for vector art; one shared focus ring; focus listeners on an HTML ancestor. |
| **2. Canvas 2D** (hand-written; Konva 33 KB or Fabric 86 KB for an object model) | Pixel work (brush, trails, per-frame image effects). A scene on a page that also does heavy work: Canvas 2D held 1000–1400 objects with three cores busy while DOM fell to 400–700. DOM heading past ~1,500 elements. A Worker may be needed later. | GPU effects, or more than ~1000–1400 moving objects at full speed (1400–1700 quiet; 300–400 with the main thread 4× slower). Object count alone rarely justifies leaving DOM for Canvas 2D: on a quiet machine the two stop within 1.4× of each other. | One `<canvas ref>`; state outside React; the loop in an effect with cleanup; React renders only the chrome and the keyboard layer (G2). |
| **2w. Canvas 2D in a Worker** | Level 2 on a page whose main thread is busy. At 1× with the main thread 50% busy: 1.9× the frame rate at 2000 objects (44 against 23 fps) with drags 2.6× faster (36 against 93 ms); at 200–700 objects, 60 fps against 40–50 and worst-case drags 33 against 61–69 ms. | An idle page: no capacity gain (both 1400–1700) and one frame of added latency (31 against 15 ms). A light scene where typical drag latency matters most (29 against 15 ms). The DOM needs scene state synchronously. Phone behaviour is unmeasured. | `transferControlToOffscreen()` once (guard against StrictMode running the effect twice); post pointer events; the Worker owns state and hit testing and posts back the counter, cursor and positions for the keyboard layer. |
| **3. PixiJS 8** (162 KB) | Thousands of sprites or particles; filters, blend modes, masks; 1.0 ms JS per frame at 2000 sprites (4.0 with the main thread 4× slower). Falls back to Canvas 2D on its own. | Depth, lighting or models (→ 4); a real game (→ 3g). | `@pixi/react` 8 (+41 KB) or an imperative `Application` in an effect; per-frame values in refs or `useTick`. Its built-in AccessibilitySystem is not the accessibility answer (G2). |
| **3g. Phaser 4** (361 KB, not tree-shakeable) | The scene *is* a game: scenes, physics, tilemaps, cameras, audio. | A product toy with no game loop: PixiJS has the same fallback at under half the bytes. | `Game` created in `useLayoutEffect` and destroyed on unmount; an EventEmitter bus [V phaserjs/template-react]. |
| **4. three.js** (130 KB) / **R3F** | Depth, perspective, lighting, materials, orbit, glTF, placement in 3D. | Flat sprites (use 3: same bytes, 4.5–7× the JS per frame unless instanced, no fallback). More than a few hundred meshes or components → `InstancedMesh` / `<instancedMesh>` (18–19 → 1.9–2.3 ms at 2000 with the main thread 4× slower). | `frameloop="demand"`; mutate in `useFrame` through refs; `<instancedMesh>`; `createRoot` + `extend({...})` on tight budgets (188.6 against 309.8 KB); guard WebGL yourself (G3). |
| **5. Full engine** (Unity, Godot, Defold, Cocos, the PlayCanvas editor) | The content is authored in that engine by a game or 3D team, or already exists there; or a game with sessions long enough for 1–6 MB behind an explicit "Play". | A configurator, builder, viewer or toy with standard materials (three/R3F do it in 130–310 KB); anything sharing live state with the DOM UI; anything that must be operable, unless the accessibility bridge below is budgeted. | An iframe or an engine-owned canvas; messages via `postMessage`, Unity `SendMessage`/jslib or Godot `JavaScriptBridge`; state duplicated on both sides. |

Rules of thumb:
- **Accessibility weighs as much as frame rate.**
  - Levels 1 and 1b are operable with native elements.
  - Levels 2–4 need the parallel keyboard layer plus tap-to-place (G2). It is cheap: nothing at rest, 0.4–1.8 ms per pointer move at 2000 objects.
  - No full engine provides DOM accessibility on the web: Godot's AccessKit has no web adapter [V], and Unity's screen-reader API does not list the Web [S]. Making one operable means bridging object positions out to a parallel DOM layer on every move and keyboard input back in [K/inference]. Budget for that, or choose levels 1–4.
- **Text stays in the DOM** [V PixiJS `Text`/`BitmapText`/`HTMLText`; K for the canvas limits].
- **Physics:** matter-js (26 KB) for a toy; Rapier for real 3D physics; never the Rapier 2D compat build (1.25 MB).
- **No engine on a marketing page.** First frame with the main thread 4× slower: DOM 135 ms, three.js 388, PixiJS 880, R3F 1124.
- **Object-count limits are relative positions from a lab without a GPU and with the main thread throttled alone.** They are provisional until measured on a mid-tier Android and an iPhone (G5).

### G2. EXTENDS `accessibility.md` ("Dragging and gestures" row) and `ui-ux.md` §7b (keeps its tap-to-place rule): operating a scene without dragging

Two requirements, tested separately:

1. **Single pointer (WCAG 2.5.7).** Keep §7b's rule.
   - A press with under 6 px of travel is a tap. Tap an object to pick it up (announce it); tap a spot to place it there with the same feedback as a drop; tap it again to put it down.
   - A keyboard path does not satisfy 2.5.7 [V Understanding 2.5.7].
   - Test: tap the object, tap a target, and assert that the object landed on the target and the counter went up.
2. **Keyboard and screen reader (2.1.1, 4.1.2).**
   - One Tab stop (roving tabindex, `role="group"` with a name); arrow keys move focus.
   - Enter or Space picks up; arrow keys move it (Shift for larger steps); Enter or Space places it; Escape puts it back.
   - A polite live region, and instructions through `aria-describedby`.
3. **On a canvas:** a parallel layer of transparent native `<button>`s with `pointer-events: none`.
   - **Sync the layer from the one function that moves an object** (pointer drag, keyboard, tap-to-place, undo), never every frame.
   - **Position the buttons with `transform`, not `left`/`top`:** 0.38 against 1.64 ms per move at 2000 objects; 1.76 against 7.15 with the main thread 4× slower.
   - Test: after a mouse drag, the button's box is still over the object (the unsynced build drifted 117 px).
4. **On SVG:**
   - Draw focus with one ring shape moved into the focused item, not a CSS outline: atlas crops report the whole atlas as their box.
   - Put focus listeners on an HTML ancestor: in Chromium an SVG element with a focus listener becomes a Tab stop.
5. **Do not use PixiJS's AccessibilitySystem** for a manipulable scene. It gives one Tab stop per object, no keyboard move, 5.3 against 0.9 ms of JS per frame at 2000, and does not exist on the Canvas fallback.
6. **Past a few hundred objects,** expose groups with a search, then the objects of the chosen group [K].

### G3. EXTENDS `motion.md` §9 checklist, "Failure path" (unchanged)

- PixiJS and Phaser.AUTO fall back to Canvas 2D; three.js and R3F throw.
- For three.js or R3F: check for WebGL before mounting, and wrap the canvas in an error boundary whose fallback is the poster. R3F's `<Canvas fallback>` does not show when only WebGL is missing.
- r163 and later need WebGL 2.
- Handle context loss, and keep the poster under the canvas.

### G4. EXTENDS `motion.md` §9 "Nothing runs at rest" and §7 Performance

| technology | stop all work at rest and under reduced motion |
|---|---|
| DOM/SVG | `@media (prefers-reduced-motion: reduce) { .bob { animation: none } }`; create no particles |
| Canvas 2D / Worker | read `matchMedia` once and pass the result to the Worker; render only when invalidated |
| PixiJS | `app.ticker.stop()` **and** `Ticker.system.stop()` (otherwise 60 calls/s keep running); `app.render()` when invalidated |
| Phaser | `game.loop.sleep()`, `wake()` on input |
| three.js | `renderer.setAnimationLoop(null)` |
| R3F | `frameloop="demand"` + `invalidate()` |

Add to §7: CSS/WAAPI loops on hundreds of elements cost style work on every frame as soon as anything else produces frames: 250–340 ms a second at 2000 elements (F4). Keep continuously animated elements to dozens and pause the ones off-screen.

### G5. EXTENDS `realtime-3d.md` §3 ("Measure before and after, always"), `visual-qa.md` "3D and WebGL experiences" and `performance.md` §6

- **CDP CPU throttling slows only the main thread.** Workers, compositor, raster threads and the GPU process keep full speed.
  - Label the result "main thread N× slower", never "phone".
  - Compare Worker variants at 1× only.
  - Judge phone limits on a real device.
  - Verify with `node run.mjs --phase throttleprobe`.
- **Record more than fps:** JS ms per frame, draw calls, main-thread busy %, heap, and style + layout per pointer move. Under SwiftShader, only these carry over.
- **"Smooth" means at most 10% of frames miss a vsync,** not a p95 (p95 moves in whole vsyncs). Give each limit as a bracket between two tested counts, with the runs that held.
- **Record the load average and test on a busy machine too** (`--phase sweepload`). DOM and SVG limits halved with three cores busy; Canvas 2D's did not.
- Measure with the page's other loops and interactions running; run variants round-robin; take medians of at least 5 runs.

### G6. EXTENDS `resources/libraries.md` "3D" into "Scene engines (2D and 3D)"

Add the F10 sizes, licences and verdicts:
- **use:** PixiJS, Konva, three/R3F;
- **games only:** Phaser;
- **avoid:** Kaboom; p5.js in production;
- **check the licence:** Needle Engine, Unity.

Add the R3F `createRoot` + `extend` note.

### G7. EXTENDS `performance.md` §1, signature column

An engine's first frame takes 3–13× as long as the DOM's. Show the DOM version or the poster first.

## Rejected ideas and why

- **CDP 4× throttling as phone emulation.** The Worker ran at full speed (277 → 279 ms), and so did the compositor, raster and GPU process. It skews results towards DOM/SVG and Workers.
- **p95 ≤ 33 ms as "holds".** It moves in whole vsyncs, and the reviewer's rerun flipped two cells. The missed-vsync share is continuous.
- **Fixed object counts per renderer.** The DOM/SVG limit moved about 2.5× with machine load (1000–1400 quiet; 400–700 busy); only the relative positions and brackets are kept.
- **A keyboard layer as the answer to WCAG 2.5.7.** The two requirements are evaluated independently [V].
- **An overlay synced only from keyboard actions** (drifted 117 px), and **`left`/`top` positioning** (4× the style and layout cost of `transform`).
- **CSS outline on SVG sprites cropped from an atlas** (frames a 512×72 box), **a focus ring per SVG item** (about 13% of the frame rate at 2000), and **focus listeners on SVG elements** (they become a Tab stop).
- **PixiJS's AccessibilitySystem** (one Tab stop per object, no keyboard move, per-frame DOM writes, WebGL/WebGPU only).
- **Ranking WebGL engines by lab fps** (SwiftShader), and **"presented frames" as a metric** (the software compositor caps them).
- **A Worker by default.** No capacity gain on an idle page, and one frame of typical drag latency. It pays off only on a busy main thread.
- **three.js for flat sprites; Phaser for a product toy; R3F `<Canvas fallback>` as the failure path; R3F `<Canvas>` on a tight budget.**
- **Full engines for configurators and toys** (1–6 MB, no web accessibility, duplicated state).
- **"CSS animations are free"** as a blanket rule; **Rapier 2D compat** for a toy; **one run per cell.**

## Open questions and limits of this evidence

- **No real GPU and no real phone.**
  - Every object-count bracket comes from software compositing, software Canvas 2D and a throttle that reaches only the main thread.
  - The real-GPU ordering (PixiJS ≈ instanced three/R3F > Phaser > Canvas 2D ≈ SVG ≈ DOM > mesh-per-object three/R3F at 2000 objects) is inferred from JS per frame.
  - The runner works with a GPU Chromium (`CHROME_PATH=… node run.mjs --phase main,sweep,instancing,worker`). It should run on a desktop GPU, a mid-tier Android and an iPhone. WebKit is not covered.
- **Load sensitivity is large and only partly controlled.** The busy-machine phase makes it reproducible, but other agents' load varied as well (load 0.7–6 in session b, 5–20 in session a).
- **The Worker on a phone is unmeasured.** No CDP control slows a Worker. Scripted input is self-paced (each dispatch waits for an acknowledgement), so latency under real input bursts may be worse.
- **Session (a) numbers** (main matrix, instancing, present, survey) were not re-run. The reviewer reproduced them within noise.
- **Real screen readers were not used.** Tests used scripted keys, taps and Playwright's accessibility snapshot. Whether VoiceOver or NVDA use the wrong SVG box is untested.
- **Not measured:** text-heavy scenes, filters and blends, physics cost, WebGPU, texture memory, battery and thermals; the engine accessibility bridge; Konva, Fabric and Babylon as the full scene.

## Changes after review

1. **Blocking: the Worker ran unthrottled in every 4× cell.**
   - Confirmed and made reproducible [L throttleProbe]: the main thread went 277–297 → 1229–1235 ms, the Worker 277–287 → 279–288 ms; the Worker target returns "Operation is only supported for pages, not workers".
   - Deleted every 4× Worker claim (about 700 "on a phone", 37.5 against 7.5 fps, drags at 24 ms). The runner now never runs a Worker above 1× and prunes the old cells.
   - Re-measured the Worker at 1× under load at 200, 700 and 2000 objects. Rewrote F6 and row 2w: 1.9× the frame rate for a heavy scene; a better worst case but a one-frame-worse typical drag for a light scene; no gain on an idle page.
   - Added the throttle rule to G5.
2. **4× labelled as a phone.**
   - Relabelled everywhere (report, `results.md`, runner comments) as "main thread 4× slower only", with the asymmetry stated.
   - The new sweep shows it: at 4×, Canvas 2D is the worst of the three CPU renderers at 400 objects, the opposite of 1×.
   - The phone limits are marked provisional, and G1 gives relative positions and brackets.
3. **Thresholds sat on one p95 step, and the gloss was wrong.**
   - Replaced p95 with the missed-vsync share (≤ 10%, median of 5).
   - Added steps: 300, 550, 1700 at 1×; 100, 300, 500 at 4×. Every limit is now a bracket with a per-run count.
   - Removed "never two frames missed in a row".
   - Re-running on a quieter machine moved the brackets (DOM/SVG 1000–1400 at 1×), so I added a reproducible busy-machine phase. It shows DOM and SVG falling to 400–700 while Canvas 2D holds 1000–1400, which changed G1: object count alone rarely justifies moving from DOM to Canvas 2D.
4. **The keyboard layer was cited for 2.5.7.**
   - Verified the Understanding text [V]. The keyboard layer now cites 2.1.1 and 4.1.2 only.
   - Built tap-to-place in DOM, SVG and PixiJS (6 px tap threshold, as in §7b) and tested it: lands 0 px off target, counter +1, both taps announced.
   - G2 keeps §7b's rule as a separate requirement.
5. **The overlay was not synced on pointer drags; the cost was measured under SwiftShader.**
   - Confirmed: `?nosync` reproduces 116.6 px drift. Fixed with one `moveItem()` that syncs (0 px).
   - Re-measured on PixiJS's Canvas renderer (40 fps at 2000 objects, not 2–3), reporting JS ms/frame, renderer ms/frame and style + layout per move.
   - Found and fixed a cost trap: `left`/`top` positioning costs 4× what `transform` does.
   - Found that the AccessibilitySystem is WebGL/WebGPU only [V], so its cost is now measured on WebGL, citing JS and renderer ms only (5.3 against 0.9; 32.7 against 4.9).
6. **"A level-5 engine cannot be made operable" was an untested absolute.**
   - Restated as costly, not impossible.
   - Verified the bridges: Unity `SendMessage` [V] and Godot `JavaScriptBridge` [V].
   - Verified that AccessKit's web adapter is only planned [V]. The Unity claim stays [S] and the bridge's cost is marked inference.

Also changed in this pass:
- **DOM probe magnitude.** The reviewer's figures differed (24/s at 10.4 ms against 13.5/s at 24.9 ms). Re-ran with 5 runs and added total style ms per second. The recalc rate and per-recalc time trade off, and the product is stable at 250–340 ms/s across three sessions; F4 now cites that.
- **Found while fixing:** CSS outline on atlas-cropped SVG frames a 512×72 box, and an SVG focus listener creates a Tab stop. Both are fixed in `svg-a11y` and reproducible with `?outline` and `?focusonsvg` (`shots/focus-ring.jpg`). The first version of the ring fix, one ring per item, cost about 13% of the frame rate at 2000; it was replaced by one shared ring, which costs nothing measurable.
