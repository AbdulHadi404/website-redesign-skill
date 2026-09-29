<!-- Stream S10, saved from the lab agent's hand-back (corrected after review). Experiment folder: research/stage2/experiments/S10-shaders-generative/. The skeptical review is in S10-shaders-generative.review.json. -->

# S10: Shader and generative visuals, creative-dev communities (capability, cost, when valuable)

## What the skill already knew

`motion.md` §9 and stream F already classed "a perpetual background shader", particle fields and blobs as decoration. They already required a poster, and said "a WebGL canvas never becomes the LCP; the poster does". They also required:
- pausing off-screen and on `visibilitychange`;
- a device-pixel-ratio cap of 2;
- no `requestAnimationFrame` at rest;
- a static frame under reduced motion;
- the poster when WebGL fails.

They listed OGL (13.8 KB, Unlicense) for "one shader plane" and noted that Shadertoy code is CC BY-NC-SA by default. `anti-patterns.md` §3D/WebGL allows WebGL only when "the object is the product, or the data is spatial". It rejects mesh gradients, aurora and grain "as a substitute for composition".

The skill did not have:
- a measured cost for each medium;
- a reusable production wrapper;
- a way to time when an effect really reaches the screen;
- the real risks: fill rate, library pixel-ratio defaults, input starvation, main-thread blocking during the first frame, context loss, touch capture, lifted blacks;
- a census of whether community code ships production features, or the licences of the places people copy shader code from;
- a narrow test for when a generative visual is justified.

This report adds those. It also corrects the skill's LCP sentence: which element becomes the LCP depends on whether the poster's visible box covers the whole viewport.

## Findings (tagged; numbers where they exist)

**How to read the numbers**
- Setup: headless Chromium 141, 1280×720, device pixel ratio (DPR) 1 unless stated. Every [L] number is in `results.json`.
- SwiftShader emulates all GPU and compositor work on the CPU. Only compare results inside one kind of work: the same shader at different sizes, or the same scene with and without one effect.
  - Ratios between different kinds of work (fill-rate against vertex work against compositing against CSS filters) do not carry over to a real GPU.
  - Absolute frame rates are far below any real GPU.
- Machine load changes the magnitudes. INP was 2.5–3.5× lower in this session (load 8–12) than in the first (13–15); per-phase load is in `results.phaseMeta`.
- Process CPU % is reported at 1× only. CDP CPU throttling itself keeps the renderer about 64% busy [L main a-static@4x: 63.9–75.5%].

**Cost of each medium**

1. **Pixels are the cost; the host library adds nothing on the GPU** [L main, fill]. The same shader (5 simplex-noise calls per pixel) cost 219–229 ms of emulated GPU time per frame in raw WebGL, OGL, regl, twgl and three.js (the reviewer's re-run: 219–227). Choose the host by bytes and features.

   Cost follows pixel count for the same shader (this scaling is within one workload, so its direction transfers):

   | Canvas | ms per frame (mine / reviewer) |
   | --- | --- |
   | 1280×720 | 224 / 211 |
   | scale 0.5 | 63 / 61 |
   | scale 0.25 | 19.7 / 19 |
   | DPR 2 (2560×1440) | 718 / 734 |

2. **Library pixel-ratio defaults set the cost, not the designer.**
   - [V `@paper-design/shaders` `dist/shader-mount.js`] Paper's `ShaderMount` defaults to `minPixelRatio = 2` and `maxPixelCount = 1920·1080·4`. On a 1× screen it renders 2560×1440: [L fill] 976 ms per frame, against 252 ms at `minPixelRatio` 1. [L inp] INP 912–2,056 ms (poor in all 7 rounds) against 312–712 ms.
   - [V] regl uses raw `window.devicePixelRatio`. Vanta calls `setPixelRatio(devicePixelRatio / scale)`. The fluid demo multiplies by the raw ratio (line 1633).
   - [V] OGL and three.js default to 1; twgl's resize multiplier defaults to 1.

3. **CSS and SVG** [L main, fill].

   | Technique | Main thread busy, 1× / 4× CPU | fps, 1× / 4× |
   | --- | --- | --- |
   | Transform-animated gradient blobs | 2.1% / 11% | 59 / 57 |
   | `@property`-animated mesh gradient | 16% / 58% | 57 / 40 |
   | SMIL-animated SVG `feTurbulence` | 78% / 89% (reviewer: 86 / 91) | 28 / 17 |

   - `@property` and animated SVG filters repaint on the main thread every frame. That is the reproducible reason to reject them for large areas.
   - Compositing figures are SwiftShader's compositor running on the CPU. Only the direction transfers:
     - `filter: blur(60px)` on the blobs raised compositing from 7.3 to 88 ms per frame (reviewer: 79), and fps from 54 to 10;
     - an animated CSS grain overlay cost about 45% of a core.

4. **Canvas 2D** (1,400 flow strokes) [L main, fill]. 25% main thread at 1× and 70% at 4×. At DPR 2, CPU went from 25% to 51% (reviewer: 58) and fps from 57 to 48.

5. **three.js particles** (40k points, motion in the vertex shader) [L main]. 48 ms of emulated GPU time per frame (reviewer: 43–50). The download is 150 KB, of which three.js is 134 KB.
   - In SwiftShader the work is not fill-bound. The governor halved the canvas twice, to 320×180, for +14% fps (23.9 → 27.2) [L governor, first session]. See #19.
   - I no longer compare it with the full-screen shader: that would be vertex work against fill work.

6. **The pre-rendered video loop is the cheap moving option** [L video, main, inp]. It is the same shader rendered offline to an 8 s, 720p, 24 fps loop that closes with a crossfade.
   - Sizes: AV1 94.5 KB, VP9 118 KB, H.264 458 KB.
   - Runtime: main thread 1.2% (reviewer 1.6), software AV1 decode 14% CPU, INP good in all 7 rounds (16–72 ms).
   - It gives up response to input and resolution independence.
   - [L videocolour] Chromium decoded tagged and untagged VP9 within 1/255 of the source. Only ffmpeg's own frame dump drifted purple.

7. **Post-processing: mechanism, not multipliers.**
   - [V postprocessing 6.39.5, `build/index.js`] `EffectComposer` ping-pongs two screen-sized buffers (`frameBufferType` defaults to `UnsignedByteType`, lines 945–953). Every `EffectPass` therefore reads and writes one full-screen buffer, and bloom adds its own chain of blur passes.
   - [V] `EffectPass.updateMaterial` merges compatible effects into one shader. It throws "Convolution effects cannot be merged" when two effects carry `EffectAttribute.CONVOLUTION`: chromatic aberration, SMAA, Bokeh and RealisticBokeh. In the lab the wrapper turned that throw into the poster [L post fx=allsmaa1, reproduced].
   - [L post] Order of emulated GPU time against the particle scene, in both sessions: vignette ≈ grain < chromatic aberration < bloom < all four merged < all four + SMAA.
     - First session: grain ×2.8, vignette ×2.9, chromatic aberration ×3.6, bloom ×7.6, all four ×9.0, + SMAA ×13.3.
     - Reviewer: ×2.5, ×2.4, ×3.0, ×7.0, ×7.5, ×10.8.
   - These magnitudes are summed SwiftShader thread time for fill and bandwidth work, compared with a vertex-bound scene. The vignette row used 2.5 cores and still ran at the baseline's 20 fps. They do not transfer, so they are not guidance.
   - [L blacklevel] With `renderer.setClearColor`, any `EffectPass` lifted the brand navy (9,18,42) to (49,70,106). With `scene.background` it stayed at (8,16,39), which raised copy contrast from 7.7 to 10.6.
   - [L posters] Baked grain is incompressible: the post poster is 44.8 KB, against 13.9 KB for the same scene without grain.

8. **Fluid simulation** [L fill]. 467 ms emulated per frame. A lite tier (dye 512, no bloom or sunrays) cuts that to 201 ms (the same workload, so the direction holds). INP drops from 584–1,576 ms to 256–608 ms.

9. **Input starvation: coarse bands only** [L inp]. When a background's GPU work overruns the frame, the renderer waits on the GPU (back-pressure). Input is delayed for the whole page, even though the effect's own JavaScript was 0–1 ms per frame. The mechanism is real; SwiftShader exaggerates the size.

   The table below is 7 interleaved rounds (every variant in round 1, then round 2, and so on), 12 clicks per round, 4× CPU. The first number is the median of each round's worst interaction; the range covers the 7 rounds.

   | Band | Variants: median (range) |
   | --- | --- |
   | Good in every round | static poster 16 (16–32); video 24 (16–72); Canvas 2D 40 (32–104); CSS blobs 48 (32–88); shader at scale 0.25: 72 (40–96); particles 136 (64–184) |
   | Usually good | shader at scale 0.5: 184 (104–224); scale 0.5 with a 30 fps cap: 168 (136–232); `@property` 64 (48–360); SVG turbulence 160 (104–600) |
   | Needs improvement to poor | full-resolution shader, raw 480 (256–632) or three.js 528 (272–920); Paper at `minPixelRatio` 1: 480 (312–712); fluid lite 512 (256–608) |
   | Poor in (nearly) every round | post-processing 720 (360–992); fluid demo 856 (568–1,608); fluid wrapped 952 (584–1,576); Paper at defaults 1,664 (912–2,056) |

   What held across both sessions and the reviewer's re-run:
   - static and video are lowest;
   - for the same shader, scale 1 > 0.5 > 0.25;
   - full-resolution WebGL, post-processing, fluid and Paper's defaults are the worst.

   Order within a band, and any ranking of CSS/SVG against emulated WebGL, is not stable, so none is given.

**First frame and main-thread blocking** (new; replaces the old #19)

10. **The first draw call is not the first frame** [L firstframe].
    - In the old report, "ttff" was the animation frame after the first draw call. The draw call returns quickly, but the GPU finishes frame 1 150–1,200 ms later in SwiftShader, and seconds later under load (the reviewer measured about 4 s for the fluid at load 12–16).
    - The lab now measures this three ways:
      - *GPU done:* `gl.finish()` right after the first draw (`?syncfirst`);
      - *first visible:* a CDP screencast of the hero with poster, scrim and copy hidden, looking for the first frame that is not flat navy (`lib/screencast.mjs`);
      - *longest main-thread task:* the longest single task in the first 5 s.

11. **Both fluid builds need the same time to show their first frame** [L firstframe]. At 1× they became visible at 1,255 ms (demo) and 1,271 ms (wrapped); at 4×, at 2,059 and 1,513 ms.
    - The old "144 against 4,508 ms" was a measurement artefact. I withdraw it, along with the dat.gui / synchronous-scripts explanation.
    - What the wrapper really adds: the poster stays visible while the shaders compile, where the demo shows a blank hero.
    - [K] SwiftShader compiles pipelines at the first draw; real GPUs mostly compile at link time. So absolute first-frame times here do not transfer.

12. **Starting the crossfade and the loop on a WebGL2 fence removes most of the blocking** [L firstframe; V KhronosGroup/WebGL `specs/latest/2.0/index.html` @ main: "sync objects may only transition to the signaled state when the user agent's event loop is not executing a task"].
    - The first wrapper crossfaded, and started its rAF loop, on the animation frame after the first draw. Frames 2, 3 and so on then queued behind a GPU still compiling, and the main thread blocked.
    - Setup work (`initMs` 12–37 ms) and the first draw call (`firstDrawMs` ≤ 70 ms) are short, so the long task lies in those queued frames.
    - The new wrapper places `gl.fenceSync` after frame 1 and polls it once per animation frame. It reveals the canvas and starts the loop only when the fence signals.
    - Longest main-thread task, first 5 s, 1× / 4×:
      - fluid: 1,379 / 1,621 ms without the fence, 210 / 269 ms with it;
      - post-processing: 486 / 533 → 181 / 310 ms;
      - e1 in WebGL1: 244 / 309 ms; the same shader in WebGL2 with the fence: 97 / 130 ms.
    - The first visible frame did not come later: fluid 1,453 → 1,271 ms, post-processing 687 → 479 ms.
    - None of the 162 screencast runs had a near-black frame.
    - WebGL1 has no fence: e1–e4 as built fall back to the old behaviour.

**Off-screen, hidden, reduced motion, failure**

13. **Browsers pause declarative animation off-screen, not JavaScript loops** [L offscreen, reproduced by the reviewer].
    - Without pause code: CSS/SVG 1.2–4.3% CPU; JavaScript loops kept full cost (Canvas 2D 19%, shaders 89–101%, particles 107–131%, video 8%).
    - With the IntersectionObserver pause: every variant ≤ 0.3%.
    - [S WebKit, "How Web Content Can Affect Power Usage", 2019] says the same.

14. **Hidden tab** [L hidden, re-run with the final wrapper]. `document.hidden` is simulated, because headless Chromium never hides a page.
    - Every wrapped variant: 0 rAF, ≤ 1.3% CPU, and it resumed afterwards.
    - The fluid demo kept running (5.1 rAF/s, 105% CPU).

15. **Reduced motion** [L reduced, re-run; V w3c/aria-practices `button-pattern.html` @3f094fd].
    - Wrapped variants never import the effect: 0 bytes, 0 rAF, ≤ 0.6% CPU.
    - The button reads "Play background animation" with no `aria-pressed`. One click starts the effect (rAF resumes, CSS animations run, SMIL unpauses) and the label becomes "Pause background animation".
    - The APG says "it is critical the label on a toggle does not change when its state changes", and that a label that changes needs no `aria-pressed`. The old build did both, so a paused button announced "Play background, pressed".
    - The fluid demo under reduced motion: main thread 100% busy, 3.5 cores across processes.

16. **No WebGL** [L nowebgl]. Every wrapped variant showed the poster and hid its control.
    - OGL threw "Cannot set properties of null (setting 'renderer')".
    - three.js logged 3 console errors; Paper threw a clear message.
    - The fluid demo left the hero blank.

17. **Context loss** [L contextloss, re-run with the fence gate]. Every wrapped WebGL variant hid its canvas, showed the poster and rebuilt on restore. Paper froze on its last frame. The fluid demo went blank; neither ever recovered.

18. **`failIfMajorPerformanceCaveat` does not reject SwiftShader** [L caveat, reproduced]. It passed in both webgl and webgl2.

19. **Governor: resolution helps only fill-bound effects** [L governor].
    - Shader: 1 → 0.5 → 0.25 in 3 of 3 runs (median frame 67 → 33 ms), ending at 60 fps.
    - Post-processing: gave up to the poster in 2 of 3 runs at 16.9 s; 1 run stayed at 0.25 (load-dependent).
    - Fluid (it sizes its own canvas): poster at 4.2 s.
    - Canvas 2D: untouched.
    - The first session also took the particles down to 320×180 for +14% fps (the reviewer saw the same; the old report left it out).
    - New rule: a halving that saves less than 15% is undone, and resolution is then left alone.
    - Deterministic check, adding a fixed CPU cost per frame to the cheap Canvas 2D effect:
      - 28 ms per frame: 1 → 0.5 → undone → keeps running at full resolution, 31 fps (3 of 3 runs);
      - 45 ms per frame: 1 → 0.5 → undone → poster at 9.1 s (3 of 3).
    - Particles at this session's lower load: 1 of 3 runs stepped down and undid it.

20. **Settle: a moment within WCAG 2.2.2** [L settle; V w3c/wcag `pause-stop-hide.html` @71c891a: "(1) starts automatically, (2) lasts more than five seconds"].
    - The old `settle=4` played 4 s and then eased for another 1.5 s, and its clock capped each frame at 0.25 s. It moved for 5.8 s (particles) and 10.7 s (the slow shader) (reviewer: 5.7 and 5.9 s). It did not qualify for the 5 s exception.
    - Now `settle=N` is N seconds in total, wall-clock (`performance.now()`), counted from the first animated frame and excluding pauses. The last min(1.5 s, N/3) eases out, and no frame starts past N.

    | `settle=4` | Wrapper clock: motion start → last frame | Screen: first presented frame → last presented change |
    | --- | --- | --- |
    | shader, 1× | 3,934 (3,921–4,003) | 3,741 (3,704–3,762) |
    | shader, 4× | 3,919 (3,910–3,974) | 3,706 (3,585–3,714) |
    | particles, 1× | 3,993 (3,993–4,004) | 4,002 (4,000–4,008) |
    | particles, 4× | 3,937 (3,927–4,004) | 3,972 (3,960–3,973) |

    Afterwards: 0 rAF and 0% main-thread busy. The button reads "Play background animation", which replays the moment.

**First paint and copy**

21. **Which element is the LCP depends on whether the poster covers the viewport** [L lcp: 4 posters × 5 hero heights × 3 viewports; V chromium `largest_contentful_paint_calculator.cc` @059e864: `if (size >= viewport_area)` → `is_viewport_covered`, ineligible; `kMinimumEntropyForLCP = 0.05` over the visible size].
    - Hero covers the viewport (100svh; 110svh; `min(100svh, 56rem)` where the cap is at least the viewport): the H1 was the LCP in 24 of 24 cells.
    - Poster box smaller than the viewport (`calc(100svh - 64px)` under a 64 px header; `min(100svh, 56rem)` at 1280×1100; 80vh):
      - every high-entropy poster (Canvas 2D, particles, post) was the LCP (18 of 18);
      - the soft 3.4 KB shader poster stayed below the threshold on desktop (H1), but on the 390×844 phone it was the LCP.
    - [L lcp, my estimate of Chrome's upscaling adjustment; K that the natural size is density-corrected] The phone's visible area is a third of the desktop's, so the same file is about 0.08–0.32 bits per visible pixel there, against 0.03 on desktop.

22. **Copy contrast over motion** [L contrast]: white H1 over the 95th-percentile luminance of the worst of 6 frames.
    - Self-authored shader with a calm zone built into it: 15.7:1.
    - Video: 14.7. Wrapped fluid: 10.5. Post-processing after the black-level fix: 10.6.
    - `@property` gradient: 8.5. SVG turbulence: 6.9.
    - Paper's stock mesh gradient: 3.9 (lede 5.3), with the same scrim as every other variant.
    - Fluid demo colours: 3.4.
    - Moving particles produce worst single pixels of 1.8–4.8.

23. **Phone** [L `shots/sheet-phone.jpg`]. A shader composed for landscape shows almost nothing at 390×844, so it needs art direction per aspect ratio. At DPR 3 capped to 2 the canvas renders 780×1688.

**Battery and thermal** (not measurable here)

24. What little evidence exists:
    - [S WebKit bug 168837; Motion Magazine] iOS Low Power Mode throttles rAF and CSS animation to 30 fps, and pages cannot detect it.
    - [S developer.chrome.com] Chrome Energy Saver (Chrome 108 and later) lowers frame rates.
    - [S, weak: abratabia / volume-shader blog] One phone fell from 60 to 46 fps after 8 minutes of sustained WebGL.
    - [K estimate] About 400 ALU operations per pixel × 780×1688 × 60 fps ≈ 32 GFLOP/s, against a low-end phone GPU of about 50–120 GFLOPS. At scale 0.5 and 30 fps it is about 4 GFLOP/s.

**Community code: demo or production?**

25. **The code people copy leaves out production features** [V census; three.js at commit ec28dfc].

    | Source | Result |
    | --- | --- |
    | 610 three.js example pages | 576 uncapped `devicePixelRatio`; none use IntersectionObserver, `visibilitychange`, context-loss handling, reduced motion or `powerPreference`; 160 debug GUIs, 163 stats panels |
    | 4 sample Codrops repos | none pause off-screen or handle context loss or reduced motion; 2 of 3 WebGL repos cap the pixel ratio |
    | Background libraries | Paper, NEAT and tsParticles pause by themselves (tsParticles: `pauseOnBlur` and `pauseOnOutsideViewport` true, [V `Options.js`]); none handle context loss or reduced motion; Vanta pauses nothing |

26. **The WebGL fluid demo as published** [V `script.js`, PavelDoGreat/WebGL-Fluid-Simulation @a2d2929; line numbers confirmed by the reviewer].
    - Touch `preventDefault` (lines 1485–1498) blocks page scrolling on phones.
    - Global Space and `P` key handlers (line 1519).
    - Uncapped pixel ratio (line 1633); quality chosen by user-agent sniffing (line 283).
    - `ga(...)` analytics calls; dat.gui.
    - No pause, context-loss handling or reduced motion.

27. **NEAT** (@firecms/neat 1.1.0) [V source and LICENSE; confirmed by the reviewer]. MIT + Commons Clause. It draws a watermark unless a paid key verifies for the domain, and injects `<meta name="generator">`.

**Bundle sizes** [L bundles, build], gzip, named imports

| Library | Size | Licence |
| --- | --- | --- |
| Raw WebGL + shader + wrapper | 4.4 KB (wrapper alone 2.5 KB, including lab-only flags) | — |
| granim | 5.3 KB | MIT |
| Paper Shaders (mesh gradient) | 6.6 KB | Apache-2.0 |
| twgl.js | 10.4 KB | MIT |
| OGL (Renderer, Program, Mesh, Triangle) | 12.5 KB | Unlicense |
| curtainsjs | 20.8 KB | MIT |
| NEAT | 27.2 KB | MIT + Commons Clause |
| regl | 40.5 KB | MIT |
| tsParticles slim | 48.3 KB | MIT |
| three.js (shader plane) | 129.5 KB | MIT |
| three.js + postprocessing | 144.8 KB | MIT / Zlib |
| Vanta FOG (+ all of three.js) | 189.6 KB | MIT |
| p5 | 414 KB | LGPL-2.1 |

## Experiments (what you built, how to re-run, results tables)

**What was built** (in `research/stage2/experiments/S10-shaders-generative/`): one fictional brand page (Halcyon, water-quality sensors) with 17 hero-background variants:
- a static AVIF poster;
- b1 CSS blobs; b2 `@property` mesh gradient; c1 SVG `feTurbulence`; c2 poster with animated CSS grain;
- d Canvas 2D;
- e1–e5 the same shader in raw WebGL, OGL, regl, twgl and three.js (plus `e1?gl2`, the same shader in a WebGL2 context); e6 Paper Shaders;
- f three.js particles; h particles + postprocessing (`?fx=`);
- g the MIT fluid demo, as published and production-wrapped (credited, fetched at a pinned commit, not redistributed);
- i the shader pre-rendered to a video loop.

**The wrapper**, `src/lib/hero.js` (2.5 KB gzip), runs every scripted variant. It handles:
- poster first; crossfade and loop start on a WebGL2 fence;
- lazy import after `load` and idle, and none under reduced motion;
- pause off-screen, when hidden and by the visitor; the control sits before the copy in DOM order and swaps its label, with no `aria-pressed`;
- time-based animation with a clamped time step;
- pixel-ratio cap and render scale;
- context loss;
- the poster on any failure;
- `?settle=N` (total wall-clock time);
- a `?gov` governor that undoes a step that did not help.

**What changed in this revision:**
- New phases: `specs` (primary-source quotes with commits), `firstframe` (screencast plus `gl.finish()`, with and without the fence).
- Rewritten phases: `lcp` (a 60-cell matrix), `settle` (wrapper clock and screen), `inp` (7 interleaved rounds, bands).
- `reduced` now clicks the opt-in and checks the label and `aria-pressed`.
- `governor` adds the burn tests.
- Re-run on the final wrapper: `hidden` and `contextloss`.
- Not re-run: `main`, `fill`, `post`, `offscreen`, `contrast`, `caveat`, `nowebgl`, `video` and `bundles` are first-session numbers; the reviewer reproduced them within noise. The wrapper changes (fence gate, label, settle, governor) do not touch steady-state rendering, and a full `node run.mjs` re-measures everything anyway.

**Re-run:**
```
cd research/stage2/experiments/S10-shaders-generative && npm install && node run.mjs      # ≈3 h on 4 shared CPUs
node run.mjs --phase firstframe,settle --only g-fluid-wrapped,h-post                      # partial; results merge by phase and key
node run.mjs --phase inp --inp-runs 9
```
`fetch-sources.mjs` clones the fluid demo at commit a2d2929 and fetches ffmpeg 7.0.2 (the imageio-ffmpeg wheel from PyPI) into `/tmp/s2-S10`. The folder is 1.5 MB without `node_modules` and `dist`.

**Table A: load and runtime.** 1× CPU unless marked. Visible = screencast. Emulated GPU = SwiftShader ms per frame (first session / reviewer). INP = band and 7-round range at 4×.

| Variant | JS gz / page KB | First frame visible, 1× / 4× ms | Main thread busy, 1× / 4× % | fps | Emulated GPU | INP |
| --- | --- | --- | --- | --- | --- | --- |
| a static poster | 0 / 5.6 | first contentful paint ~90 | 0.8 / 2.1 | 60 | — | good (16–32) |
| b1 CSS blobs | 0 / 3.0 | — | 2.1 / 11 | 59 | compositing 7.5 | good (32–88) |
| b2 `@property` | 0 / 2.9 | — | 16 / 58 | 57 / 40 | raster 91% | good, one needs-improvement round (48–360) |
| c1 SVG turbulence | 0 / 3.0 | — | 78 / 89 | 28 / 17 | raster 94% | good, one poor round (104–600) |
| d Canvas 2D | 3.0 / 34.8 | 111 / 265 | 25 / 70 | 59 | 1.3 | good (32–104) |
| e1 raw WebGL1 | 4.4 / 10.6 | 312 / 482 | 99.5* | 4.6 | 228 / 219 | needs improvement to poor (256–632) |
| e1 in WebGL2 + fence | 4.4 / 10.6 | 249 / 373 | — | — | — | — |
| e2 OGL / e4 twgl / e3 regl | 16.5 / 14.4 / 44.6 | 312–359 / 493–563 | 99* | 4.4–5.4 | 222–229 | — |
| e5 three.js + fence | 133.4 / 139.7 | 277 / 458 | 99.7* | 4.6 | 219 / 227 | needs improvement to poor (272–920) |
| e6 Paper (defaults) | 7.2 / 11.7 | 918 / 1,297 | 99.9* | 0.8 | 946 at 2560×1440 | poor (912–2,056) |
| f particles + fence | 134.5 / 150.9 | 224 / 435 | 98* | 25 | 48 / 43–50 | good (64–184) |
| h particles + 4 post effects + fence | 205.5 / 252.2 | 479 / 817 | 100* | 3.0 | 374 / 360 | poor (360–992) |
| g fluid demo as published | 25.2 / 27.6 | 1,255 / 2,059 | 99.9* | 1.8 | 537 | poor (568–1,608) |
| g fluid wrapped + fence | 10.6 / 25.2 | 1,271 / 1,513 | 99.9* | 1.7 | 467 | poor (584–1,576); lite: 256–608 |
| i video loop (AV1) | 0 / 101.3 | 97 / 193 | 1.2 / 6.7 | 58 | 1.9 | good (16–72) |

\* Near-100% on WebGL is SwiftShader back-pressure; the effect's own JavaScript was 0–1 ms per frame.

**Table A2: first frame** [L firstframe], 5 rounds, median ms from navigation, 1× (4×).

| Variant | Draw issued | GPU done with frame 1 | Crossfade starts | Visible | Longest task, first 5 s |
| --- | --- | --- | --- | --- | --- |
| e1 WebGL1 (no fence possible) | 48 (154) | 239 | 48 (156) | 312 (482) | 244 (309) |
| e1 WebGL2 + fence | 65 (137) | 215 | 229 (332) | 249 (373) | 97 (130) |
| e5 three.js + fence | 92 (242) | 265 | 256 (421) | 277 (458) | 98 (136) |
| h post, no fence / fence | 181 / 162 | 501 / 473 | 181 / 458 | 687 / 479 | 486 / 181 |
| g fluid wrapped, no fence / fence | 66 / 70 | 1,028 / 919 | 68 / 1,250 | 1,453 / 1,271 | 1,379 / 210 |
| g fluid demo | (1,505)† | 1,200 | — | 1,255 (2,059) | 1,173 (1,808) |

† Two animation frames after its synchronous scripts.

No near-black frame appeared in any run.

**Table B: behaviour** (CPU = % of one core, all processes)

| Variant | Off-screen: paused / not paused | Hidden | Reduced motion | No WebGL | Context loss | Copy contrast (worst frame, p95) |
| --- | --- | --- | --- | --- | --- | --- |
| CSS/SVG (b1, b2, c1, c2) | 0–0.3 / 2–4.3 | 0 rAF | static + Play button | n/a | n/a | 11.4 / 8.5 / 6.9 / 14.5 |
| d Canvas 2D | 0.3 / 19 | 0 | not loaded; Play works | works | n/a | 17.1 |
| e1–e5 | 0–0.3 / 89–101 | 0 | not loaded | poster | poster, then rebuilt | 15.7–15.8 |
| e6 Paper | 0 / 0.3 (library pauses) | 0 | not loaded | poster | frozen | 3.9 |
| f / h | 0.3 / 107, 77 | 0 | not loaded | poster | rebuilt | 16.3 / 10.6 |
| g demo | 65 (no pause) | 105% | runs, main thread 100% | blank | blank | 3.4 |
| g wrapped | 0.3 / 71 | 0 | not loaded | poster | rebuilt | 10.5 |
| i video | 0 / 8.3 | 0 | not loaded | works | n/a | 14.7 |

**Table C: fill and settings** [L fill]
- Shader: scale 1 / 0.5 / 0.25 gives 224 / 63 / 19.7 ms. DPR 2 gives 718 ms; capped to 1, 220 ms.
- Paper: `minPixelRatio` 2 → 976 ms; 1 → 252 ms.
- Fluid: demo quality 482 ms; lite 201 ms.
- Canvas 2D: DPR 1 → 25% CPU; DPR 2 → 51%.
- Blobs: 7.3 ms compositing; with `blur(60px)`, 88 ms.

**Table D: licences of code sources.** Unchanged, and confirmed by the reviewer (npm metadata, and the LICENSE texts of LYGIA, The Book of Shaders and NEAT).

| Source | Licence | Use on a client site |
| --- | --- | --- |
| three.js (repo and examples) | MIT [V] | yes, keep the notice |
| pmndrs/postprocessing | Zlib [V] | yes |
| stegu/webgl-noise | MIT [V] | yes |
| PavelDoGreat fluid demo | MIT [V] | yes, with the notice |
| Paper Shaders | Apache-2.0 [V] | yes |
| LYGIA | Prosperity 3.0.0 + Patron [V] | only with the Patron licence or a purchased one |
| The Book of Shaders | all rights reserved [V] | learn from it; take functions from their MIT origins |
| Shadertoy | CC BY-NC-SA 3.0 by default [S] | never paste without a permissive header |
| iquilezles.org | MIT [S] | ok with the notice |
| CodePen public pens | MIT [S]; how CodePen 2.0 displays it is questioned [S dbushell 2026-09-08] | check provenance |
| OpenProcessing | BY-NC-SA by default [S] | non-commercial unless the author chose otherwise |
| p5.js | LGPL-2.1 [V] | legal but 414 KB |
| Codrops classic demos | "build upon… don't redistribute as-is" [V] | ok to build upon |
| Codrops guest-author repos | per repo [V] | check each repo |
| NEAT | MIT + Commons Clause, watermark [V] | paid key required |
| ShaderGradient | README "MIT ©" [V] | acceptable; record the README |
| whatamesh | no licence, Stripe-derived [V] | no |
| Vanta | MIT [V] | legal but heavy |
| Awwwards / FWA | proprietary showcases [S] | inspiration only |

## Decision guidance for the skill (which skill file and section each belongs in; replaces, extends or new)

**1. New file: `references/generative-visuals.md`.** Read it in Phase 3 when a concept proposes moving or generative imagery, and in Phase 5 when building it.

*§1 Purpose gate* [K: design judgement, not measured].

This is a **partial reversal** of `motion.md` §9 ("a perpetual background shader… particle fields" are decoration) and of the `anti-patterns.md` 3D/WebGL row. It adds one allowed case, and only after a still and a loop have been rejected in writing.

A shader, particle or generative background passes only when both of these are recorded in `DESIGN.md`:
- **(a) Source.** It is driven by the company's real data (a named feed or dataset: the probes' river readings, a network's traffic) or by a documented material or behaviour of the product (name the reference photo, footage or spec). Otherwise the product itself is visual (a graphics or creative tool): show its real output.
- **(b) Why not a still or a loop.** A still (a render or photograph) and a pre-rendered loop were considered and rejected for a stated reason: it must respond to input or live data, must never repeat, or must stay sharp at sizes a video cannot carry. "It feels alive" is not a reason.

Never behind productive surfaces (apps, dashboards, docs, checkout). Never on pages around a live 3D product. A one-off moment (a transition, a success state) falls under `motion.md` §2's gates, not this one.

Worked example: the lab's own Halcyon shader is generic simplex noise and **fails** this gate as built. It would pass only if the probes' latest readings drove it (flow speed and turbidity setting the field), with (b) "the hero shows today's river; a loop cannot".

*§2 Pick the medium from the requirement:*
1. No need to move → a still. The poster is a render of the effect, with grain baked in.
2. Moves, but does not respond to input or data → a loop.
   - Soft colour drift: CSS transform/opacity on pre-softened radial gradients. Never animate `filter: blur()`.
   - Rich motion: a pre-rendered AV1 loop (about 95 KB for 8 s at 720p) with a VP9 or H.264 fallback.
   - Never animate SVG filters or `@property` gradients over large areas. They repaint on the main thread every frame [L 78–89% busy, 17 fps at 4×]. A static `feTurbulence` is fine.
3. Responds to pointer, scroll or data, or must never repeat → a fragment shader in the wrapper, in a **WebGL2** context (for the fence).
   - Raw WebGL + wrapper: 4.4 KB.
   - Paper: 6.6 KB, only when its stock look fits the brand; set `minPixelRatio` to 1.
   - OGL or twgl: when there are several programs.
   - three.js: only if the page already ships it.
4. Many points → GPU points with motion in the vertex shader. Canvas 2D only for about 1–2k strokes or fewer, at DPR ≤ 2.
5. Simulation (fluid) → only as the product or a playable moment, with a lite tier and the governor. Never ambient wallpaper.
6. Post-processing → only where the concept needs it (bloom for subjects that emit light).
   - The mechanism [V postprocessing]: each `EffectPass` reads and writes a full-screen buffer; bloom adds a blur chain; compatible effects merge into one pass; only one convolution effect (SMAA, chromatic aberration, bokeh) per pass.
   - Bake grain and vignette into the shader or poster. Use `scene.background`, not the clear colour.
   - No per-effect cost figures until they are measured on a real GPU.

*§3 Budgets:*
- Background JavaScript ≤ 10 KB gzip on a marketing page.
- Soft fields render at scale 0.5 with the pixel ratio capped at 2. Never inherit a library's pixel-ratio default.
- 30 fps is enough for slow fields; time-based motion hides Low Power Mode.
- Poster ≤ 30 KB, and it is the effect's first frame.
- Fill estimate [K]: ALU operations × pixels × fps, compared with a low-end phone GPU.

*§4 Production checklist* (each item traces to a measured failure):
- [ ] The poster is the effect's first frame (same `t0`), and it loads **eager with `fetchpriority="high"`**. It is the LCP whenever its visible box is smaller than the viewport:
  - `calc(100svh - header)`, `min(100svh, 56rem)` on tall screens, 80vh, anything below the hero;
  - on phones, even a 3.4 KB soft poster.
  
  Only a hero that covers the whole viewport hands the LCP to the headline.
- [ ] Load after `load` + idle with `import()`. Under reduced motion, never import. Show the poster and a button reading "Play background animation" that becomes "Pause background animation". Use either a swapping label or a fixed label with `aria-pressed`, never both (APG).
- [ ] Motion that starts by itself either stops within 5 s wall-clock of its first visible frame, easing included, or has a pause control placed before it in DOM order. `settle ≤ 4` total leaves room for one slow last frame. Keep the control in both cases.
- [ ] Crossfade and start the loop only when a WebGL2 fence says frame 1 is done (`fenceSync` + `getSyncParameter` once per animation frame). Never time "first frame" from the draw call.
- [ ] Pause off-screen (IntersectionObserver) and on `visibilitychange`. Browsers do not pause JavaScript loops off-screen.
- [ ] Time-based motion with a clamped time step; paused time does not advance.
- [ ] Pixel-ratio cap 2, render scale, ResizeObserver.
- [ ] Governor: 1 s warm-up; judge 45 frames or 2 s; halve the scale down to 0.25; undo a halving that saved less than 15%; below about 30 fps fade to the poster. Do not rely on `failIfMajorPerformanceCaveat`.
- [ ] `webglcontextlost`: call `preventDefault`, show the poster, rebuild on restore (wait for the fence again).
- [ ] Any failure, library throws included → the poster, never a blank hero.
- [ ] Context options: `powerPreference: 'low-power'`; no antialias, depth or stencil for a full-screen quad.
- [ ] No touch `preventDefault`, wheel capture, global key handlers, debug GUI, stats panel or analytics.
- [ ] A calm zone under the copy, designed into the shader; measure worst-frame contrast.
- [ ] Art direction per aspect ratio (composition through uniforms).
- [ ] `aria-hidden` on a decorative canvas.
- [ ] The source and licence of every borrowed function in `CREDITS.md`.

*§5 Demo tells:*
- `setPixelRatio(window.devicePixelRatio)`;
- a loop started at load and never stopped;
- no poster;
- GUI or stats panels;
- touch `preventDefault`; global key handlers;
- user-agent quality sniffing;
- rainbow colours;
- a whole library for one effect (Vanta pulls in all of three.js);
- no licence header;
- a crossfade started at the draw call.

*§6 Licence table:* Table D.

*§7 Measuring:*
- SwiftShader emulates WebGL **and** compositing (CSS layers, filters, blending) on the CPU. Only within-workload ratios carry direction; magnitudes shift with machine load (INP 2.5–3.5× between sessions).
- Report INP in bands with the spread across interleaved rounds.
- Process CPU only at 1× (CDP throttling itself costs about 64%).
- Time the first visible frame and the end of motion from composited frames (a screencast), not from JavaScript timestamps.
- Take real-GPU and phone numbers before stating any per-effect cost.

**2. `motion.md` §9**
- **Replaces** "A WebGL canvas never becomes the LCP element; the poster does (verified), and a flat single-colour poster is ignored — optimise the poster" with:

  > "A canvas is never the LCP. The poster is the LCP whenever its visible box is smaller than the viewport (a header above it, a height cap, content below it), and on phones even a soft 3 KB poster exceeds Chrome's 0.05 bits-per-pixel floor. Only a poster covering the entire viewport is ignored, and then the headline is the LCP. Either way: eager, `fetchpriority="high"`, ≤ 30 KB."
- **Extends** the "3D is decoration" sentence: "…unless it passes `generative-visuals.md` §1 (a partial reversal, recorded in `DESIGN.md`); then it ships with §4 there."
- **Extends** the tool table: raw WebGL + wrapper 4.4 KB; Paper Shaders 6.6 KB (Apache-2.0, `minPixelRatio` 2 by default); twgl 10.4 KB; regl 40.5 KB (raw pixel ratio); postprocessing +15 KB (Zlib); OGL 12.5 KB for a shader plane.
- **Extends** the checklist with: the fence, context loss, the governor, no input capture, and "`failIfMajorPerformanceCaveat` did not reject SwiftShader".

**3. `motion.md` §6 table (extends).** New row: "Shader, particle, fluid or video backgrounds → the poster; the code or video is never loaded; a 'Play background animation' button opts in."

**4. `anti-patterns.md` purpose-gated table**
- **Replaces** the 3D/WebGL row's "Allowed when" cell with: "the object *is* the product, or the data is spatial; or a 2D generative field driven by the company's real data or a documented material, after a still and a pre-rendered loop were rejected for a stated reason (`generative-visuals.md` §1); not on the marketing pages around a live 3D product…" (rest unchanged).
- **Extends** the grain row: "baked into the poster or shader; an animated grain overlay composites a full-screen layer every frame."

**5. `performance.md` §2 table (extends).** New rows:
- animated SVG filters / `@property` gradients → main-thread paint every frame;
- a full-resolution shader → cost ∝ pixels, and GPU back-pressure delays input;
- library pixel-ratio defaults;
- animated `filter: blur()` on large layers;
- WebGL first frame → the draw call is not the frame; frames queued behind the compile block the main thread; gate on a fence.

**6. `accessibility.md` motion inventory (extends).** "A pause/play control either swaps its label or keeps a fixed label with `aria-pressed`, never both; the 5 s clock runs from the first visible frame to the last visible change, easing included."

**7. `resources/assets.md` (extends)** with Table D and the static-`feTurbulence` rule. **`resources/libraries.md` 3D line (extends)** with the background libraries, their sizes and licences, and the NEAT watermark.

**8. `visual-qa.md` "3D and WebGL experiences" (extends).** Add:
- worst-frame copy contrast over motion;
- rAF = 0 off-screen, when hidden and under reduced motion;
- first visible frame and motion duration measured from composited frames.

**9. `templates/DESIGN.md` (extends).** One line per generative visual:
`source (data or material) · why not a still or loop · medium · poster · pause/settle · reduced-motion substitute · JS KB, render scale, pixel-ratio cap · licences`.

**10. Scripts** (proposed; my brief named none, so none were created):
- *New* `templates/hero-effect.js`: the lab's `hero.js` without its lab-only flags, about 2.5 KB.
- *Extend* `motion.mjs`:
  - add `--motion-end`, the screencast method from `lib/screencast.mjs`: it fails when a hero moves for more than 5 s from its first visible frame to its last presented change without a pause control before it;
  - extend its rAF-at-rest check to scrolled-away, hidden and reduced-motion states.
- *Extend* `contrast.mjs` with a moving mode: sample N frames and report the worst p95.

## Rejected ideas and why

- **Choosing the WebGL host for speed.** GPU cost was the same across hosts (219–229 ms).
- **SVG `feTurbulence` / `@property` animation for large areas.** Main-thread paint every frame: 78–89% and 16–58% busy; SVG at 17 fps under 4× CPU. (Rejected on these reproducible numbers, not on INP magnitudes.)
- **Animated `filter: blur()` blobs and animated CSS grain.** A large layer filtered or blended every frame, for texture a poster bakes in.
- **Post-processing for a "cinematic" hero.** One or more full-screen passes per effect. The washed-out look was an integration bug (clear colour + `EffectPass`).
- **Crossfading and starting the loop at the first draw call.** The frame does not exist yet. Frames queued behind the compile blocked the main thread for 1.4 s (fluid) and 0.5 s (post), where the fence gate kept it to 0.21 and 0.18 s.
- **Resolution as the only governor knob.** It dropped a vertex-bound scene to 320×180 for +14% fps.
- **"Play N s, then ease" as settle.** 5.7–10.7 s of motion.
- **A toggle with a swapping label *and* `aria-pressed`.** It announces the opposite state.
- **"Keep the poster non-blocking".** With the skill's own hero-height rules, the poster is usually the LCP.
- **NEAT** (watermark, Commons Clause), **whatamesh** (no licence), **LYGIA** without Patron, **Book of Shaders** code, **Vanta** (all of three.js, no pause), **p5.js** for a hero (414 KB).
- **`failIfMajorPerformanceCaveat` as a slow-device gate** (SwiftShader passed it). **Trusting the browser to pause off-screen** (true only for CSS and SVG). **A ping-pong video loop.** **A governor that climbs back up.** **Colour tags as a fix for hue drift.** **Headless tab switching to test hidden pages.**

## Open questions and limits of this evidence

- **Emulated GPU and compositor.**
  - No real GPU or phone was available.
  - First-frame times are dominated by SwiftShader compiling at first draw [K]. On real GPUs, compilation mostly happens at link time, so the fence's benefit there is unmeasured.
  - `KHR_parallel_shader_compile` is untested.
  - WebGL1 has no fence (e1–e4 fall back).
- **Load.** The machine's load average ranged from 2 to 17. INP magnitudes moved 2.5–3.5× between sessions. Screencast timestamps are compositor swap times in headless mode; a real display adds latency.
- **LCP bits-per-pixel on phones** uses my reading of Chrome's upscaling adjustment [K]. The measured outcomes (IMG against H1) do not depend on it.
- **Governor thresholds** (×1.25 frame budget, 15% gain, give up below about 30 fps) were set in emulation and tested with synthetic CPU cost. Validate them at 120 Hz and on devices capped at 30 fps.
- **Not measured:** battery and thermal (only snippets and a [K] estimate); Safari and Firefox (Low Power Mode, video colour); H.264 playback in this Chromium.
- **Samples:** 4 Codrops repos; contrast from 6 frames over about 5 s.

Files are in `/home/user/website-redesign-skill/research/stage2/experiments/S10-shaders-generative/`:
- `run.mjs`, `results.json`, `fetch-sources.mjs`, `src/lib/hero.js`, `src/variants/`;
- `lib/` (build, measure, serve, video, licences, census, bundles, and the new `screencast.mjs` and `specs.mjs`);
- `shots/` (sheets, posters).

## Changes after review

1. **First frame measured the draw call, not the frame (agreed).**
   - Added the `firstframe` phase: `gl.finish()` after the first draw, plus a CDP screencast of the isolated hero, plus the longest main-thread task.
   - The old "ttff" is renamed "draw issued" everywhere, and the old column is replaced.
   - #11 is restated: both fluid builds show their first frame at the same time (1,255 against 1,271 ms at 1×). The wrapper's real gain is the poster during compile. The dat.gui explanation is removed.
   - Beyond the request: the wrapper now crossfades and starts its loop on a WebGL2 fence, which cut the longest main-thread task from 1,379 to 210 ms (fluid) and from 486 to 181 ms (post), without delaying the first visible frame. No black frame in 162 runs.
2. **Settle exceeded 5 s (agreed).**
   - `settle=N` is now total wall-clock time, easing included, with a predicted last frame.
   - Measured 3.9–4.0 s on the wrapper's clock and 3.7–4.0 s on screen, at 1× and 4×. The old version's 5.7–10.7 s is explained.
   - The pause control stays, and Play replays the moment. The `hero.js` comment and the checklist are corrected.
3. **`aria-pressed` with a swapping label (agreed).**
   - `hero.js`, the Paper variant and the CSS and video bootstraps now use "Play/Pause background animation" with no `aria-pressed`. The APG quote is verified in `specs`.
   - The `reduced` phase now clicks the button and asserts the label, no `aria-pressed`, and that the effect starts.
4. **LCP rule too broad (agreed).**
   - A 60-cell matrix (4 posters × 5 hero heights × 3 viewports) plus the Chromium source.
   - The rule is scoped to "covers the entire viewport". "Non-blocking" is dropped; the poster is eager with `fetchpriority="high"`.
   - New finding: on phones even the 3.4 KB soft poster becomes the LCP.
5. **Post-processing ×N and cross-workload ratios (agreed).**
   - The multipliers are removed from all guidance and kept only as a two-session order, marked emulator-specific.
   - The mechanism is verified from postprocessing's source (buffer ping-pong, convolution merge rule).
   - The SwiftShader caveat now covers CSS compositing, filters and cross-workload comparisons. The "0.2× / 2× the noise shader" comparisons are removed.
   - A real-GPU check is required before stating any per-effect cost.
6. **The purpose gate loosened two rules without saying so (agreed).**
   - It is now called a partial reversal and tagged [K]. It requires real data or a documented material, plus a written rejection of a still and a loop. "Growth", "traffic" and "signal" are dropped.
   - The `anti-patterns.md` row is reconciled.
   - The lab's own shader is shown to fail the gate.
7. **INP too noisy to rank (agreed).**
   - Re-measured over 7 interleaved rounds and reported in bands with ranges. This session's values are 2.5–3.5× lower than the first session's, which confirms the reviewer's point.
   - There is no ranking inside a band and no ranking of CSS/SVG against WebGL. The SVG/`@property` rejection now rests on main-thread busy % and fps.
8. **Also fixed:**
   - The particles' step-down to 320×180, which the old report left out, is now reported, and the governor now undoes an ineffective step; verified deterministically with the burn tests.
   - The 2.3× first-frame variance is replaced by the screencast measure, with ranges.
   - Documented that CPU % under 4× throttling is an artefact (static page about 64%).
   - Added the `specs` phase so every new [V] quote (APG, WCAG 2.2.2, WebGL2 sync, Chromium LCP) is re-fetched and pinned to a commit.
