<!-- Stream S11, saved from the lab agent's hand-back (corrected after review). Experiment folder: research/stage2/experiments/S11-loading-tiers-offmain/. The skeptical review is in S11-loading-tiers-offmain.review.json. -->

# S11: Loading experiences, device tiers and progressive degradation, off-main-thread work

## What the skill already knew

`performance.md` already covers several things:
- Core Web Vitals targets, per-page-type budgets and a "signature experience" column.
- LCP rules: poster first, `fetchpriority`, never lazy-load the LCP image.
- Islands (`client:visible` / `client:idle`) and "yield, then chunk or use a Worker". The yield rule has one measurement behind it (INP 376 → 24 ms).
- `content-visibility`, and `perf.mjs`, which runs at 4× CPU on slow 4G.

`realtime-3d.md` §6 says:
- Tiers change resolution, effects and tessellation, never the look.
- Judge dropped frames against the display's refresh, over continuous frames only, and skip the settle period.
- Never let a frame-rate monitor judge an on-demand renderer.

`motion.md` §9 says: poster first, load late, render on demand, nothing running at rest, and have a failure path.

`app-ui.md` §8 has Primer's loading thresholds and skeletons.

A sibling stream, S10, already ships its own frame-time governor in `S10-shaders-generative/src/lib/hero.js`. It is not in the skill yet, and §C below reconciles it with this stream's governor.

What the skill lacked:
- How to detect a tier, and how far each signal can be trusted.
- Which lazy-load trigger fits which visitor and what it costs.
- Staged loading.
- Placeholders.
- When a Worker helps and when it hurts.
- OffscreenCanvas.
- What CDP throttling cannot tell you.
- A method for setting budgets.

## Findings (tagged; numbers where they exist)

### A. Device signals: what each really says

| Signal | Engines [V @mdn/browser-compat-data 8.1.3] | What it really reports | Use it for |
|---|---|---|---|
| `navigator.hardwareConcurrency` | all | WebKit returns **4 if the device has fewer than 8 cores, otherwise 8** (4 or 8 under tracking protection) [V WebKit `NavigatorBase.cpp`]. Phones report 8 at every price [K]. | Sizing a worker pool only. Never for tiering. |
| `navigator.deviceMemory` | Chromium only | A power of two, clamped to **1–8 GB on Android and 2–32 GB on desktop** [V `approximated_device_memory.cc`]. A 6 GB phone reports 4 and a 12 GB phone reports 8. | On Android, ≤ 2 means ≤ ~3 GB of RAM, a genuinely low-end phone. A missing value means unknown, not low. |
| WebGL renderer string | all | Chrome gives the full string. Firefox gives coarse families [S bugzilla 1722113]. Safari always says "Apple GPU" [V detect-gpu source]. | Detecting no WebGL and software renderers (SwiftShader, llvmpipe, Basic Render). A family hint on Android and Windows. |
| `failIfMajorPerformanceCaveat` | all | Did not refuse SwiftShader here [L `tiers.json`, `gl.caveat=false`]. | Only together with a renderer-string check. |
| `@pmndrs/detect-gpu` 6.0.24 | — | MIT, 3.7 KB gzip; data frozen since Dec 2025 [V README]. Returns the slowest possible chip on iOS 14+, and tier 3 hard-coded for Apple Silicon Macs [V source]. With overridden renderer strings: Mali-G710 (a flagship) FALLBACK tier 1; UHD 620 tier 0; PowerVR GE8320 tier 1; Adreno 610/619 and Mali-G52/G57 tier 2 [L]. Cost: 20–53 ms on a quiet page at 1–6×; **447–546 ms while the page boots** [L; the reviewer measured 14–63 and 274–553 ms]. | At most a start hint on Android and Windows. Never the verdict. |
| Frame-work probe (`tier.js`) | all | The share of the display's frame that the page's own per-frame JS takes. Quiet runs gave one tier in 10 of 10 at 1×, 2×, 3×, 4× and 6×. 5× sits on the 0.6 edge and flipped between tiers (§B). | The starting tier for CPU-bound scenes. |
| `prefers-reduced-motion` / `-transparency` | all / Chromium 118+ [V BCD] | Preferences. | Overlays (decision 1). |
| `prefers-reduced-data` | nowhere [V BCD] | — | Don't use it. |
| Save-Data | Chromium | Android's Data Saver still sends it [S BCD#20347]. | No prefetch or autoplay; show sizes. |
| `effectiveType`, `getBattery()` | Chromium | `effectiveType` is capped at "4g" [K]; `getBattery()` is deprecated. | At most: skip prefetch on 2g. |
| A 30 Hz `requestAnimationFrame` | WebKit | WebKit halves rAF to 30 fps for reasons that include, e.g., Low Power Mode, aggressive thermal mitigation, and a cross-origin iframe the person has not interacted with [V `AnimationFrameRate.cpp`]. | Once a scene runs, a 30 Hz display and a slow scene that misses every other vsync on a 60 Hz display both show 33 ms intervals. **Only empty frames measured before the scene tell them apart** (§C, hz30 cell). |

Creating a WebGL context for the probe cost 11 ms at 1×, 30 ms at 4× and 49 ms at 6× [L `tiers.json`, SwiftShader]. Reuse that context for the scene or release it.

### B. Tier probe: bands fixed in advance, intermediate throttles, 10 runs per cell [L `results/tiers.json`, host load 4–13]

The rule, in `tier.js`:
- Take the median per-frame work of the top tier's JS. The lab stand-in is 200k particles plus 1,000 rects.
- Divide it by the refresh interval, measured first with `measureRefresh()` (20 empty rAF frames, 0.31 s). It read 16.6–16.7 ms in all 95 runs.
- Below 0.3 → strong; below 0.6 → average; otherwise low.

**The 0.3 and 0.6 edges are a heuristic from RAIL's "~10 ms of JS per 16.7 ms frame" [K], fixed before these runs, not fitted to them. Calling 1× strong, 4× average and 6× low is a labelling choice.** The measured result is the fraction of the frame the work takes, and how stable that reading is.

In the "busy" condition, twelve ~50 ms boot tasks run during the probe.

| Condition | Delivered slowdown (before / after) | Work per frame, median (range) | Fraction of the frame (range) | Tier at 2 s | Tier with 24 frames | `tier.js` defaults: early exit, 1.5 s cap, ≥ 12 frames | fps probe | Min-of-5 burst |
|---|---|---|---|---|---|---|---|---|
| quiet 1× | 1.0 / 1.0 | 2.0 (1.7–2.4) | 0.12 (0.10–0.14) | strong 10 | strong 10 | strong 10, 0.43 s | strong 10 | 10/10 |
| quiet 2× | 2.1 / 2.3 | 4.4 (3.8–4.7) | 0.26 (0.23–0.28) | strong 10 | strong 10 | strong 10, 0.44 s | strong 10 | — |
| quiet 3× | 3.1 / 3.4 | 6.6 (6.2–7.1) | 0.39 (0.37–0.43) | average 10 | average 10 | average 10, 0.83 s | strong 10 | — |
| quiet 4× | 4.1 / 4.4 | 8.6 (7.7–9.3) | 0.52 (0.46–0.56) | average 10 | average 9, low 1 | average 10, 0.52 s | **strong 10** | 2/10 |
| quiet 5× | 5.1 / 5.1 | 11.0 (8.9–12.1) | **0.66 (0.53–0.73)** | low 9, average 1 | **low 5, average 5** | low 9, average 1, 1.5 s (cap) | strong 10 | — |
| quiet 6× | 6.8 / 6.9 | 13.8 (12.9–15.2) | 0.83 (0.78–0.91) | low 10 | low 9, average 1 | low 10, 0.73 s | **strong 10** | 6/10 |
| busy 1× | 1.0 / 1.1 | 2.2 | 0.13 | strong 10 | strong 10 | strong 10, 0.55 s | strong 10 | 10/10 |
| busy 4× | 4.5 / 4.5 | 8.9 (7.8–10.4) | 0.53 (0.47–0.62) | average 9, low 1 | average 9, low 1 | **undetermined 7**, average 3; 1.66 s | low 10 | 9/10 |
| busy 6× | 6.3 / 5.6 | 12.3 (6.7–13.4) | 0.74 (0.40–0.81) | low 8, average 2 | low 8, average 2 | **undetermined 10**; 1.66 s | low 10 | 4/10 |

- **Away from an edge the reading is stable; on an edge it is a coin toss.**
  - Every quiet cell whose fraction stayed ≥ ~7% from an edge got one tier in 10 of 10 runs at 2 s.
  - 5× (median 0.66, range 0.53–0.73) split 9/1 at 2 s and 5/5 with 24 frames.
  - In an earlier run this session (same probe, before the refresh check was added), 5× split 5/5 at 2 s (median 0.61), and 3× split 8/2 with 24 frames [L `probe.log`, not kept in results].
  - A real device that sits near an edge will get a different tier on different visits. The governor, not the probe, has to absorb that.
- **Use at least 24 frames.** With 12 frames, the earlier run called 5× and 6× "strong" in 1 and 2 of 10 runs, two tiers off; the cause was the throttler dropping out. With ≥ 24 frames in quiet runs, no result was ever two tiers off [L].
- **The labels mean nothing without the page's own work.** On the same runs, doubling the per-frame work turns 2× into average and 3×–6× into low (10 of 10 each) [L arithmetic, `rule2sDoubleWork`]. In-sample bands (midpoints of the 1× calibration: 3.6 and 8.8 ms) would have called 2× "average" and split 4× 6/4. So probe the top tier's own per-frame JS.
- **A busy page now returns "undetermined" instead of guessing.** With the template's defaults, 17 of 20 busy throttled runs returned undetermined in 1.5–1.8 s, and none returned a wrong tier.
  - Given 2 s and no frame minimum, the same runs gave 17 of 20 as labelled.
  - In the earlier run, 3 of 10 busy 6× runs came out "strong": the work dropped to 1.9 ms while the throttler stopped delivering.
  - Busy 6× was correct in 3–8 of 10 across four runs (first report 7, reviewer 6, this session 3 and 8).
- **Frame rate is the wrong probe.** The median interval was 16.7 ms at every quiet level from 1× to 6×, because vsync hides work that fits in the frame [L].
- **Min-of-N bursts are unreliable under CDP.** The burst probe scored 2–9 of 10 depending on cell and run: first report 3/10 and 4/10 at 4× and 6×, reviewer 5/10 and 2/10, this session 2/10 and 6/10. Chromium's throttler busy-waits in 200 µs quanta [V `thread_cpu_throttler.cc`], and short bursts slip through at full speed. Not measurable here; untested on hardware.
- **Throttle fidelity:** within ±30% of nominal in 48 of 70 throttled runs this session (44 of 70 earlier today; 25 of 40 in the first report) [L].

### C. Runtime governor: v1's blind spots, the revised governor, and S10's governor [L `results/governor.json`, 3 runs per cell, load 4–12]

The review found two blind spots in v1, the governor proposed in the first report:
- It skipped every interval over 250 ms as "a pause", so it never judged a scene running below 4 fps.
- It estimated the refresh from the scene's own fastest intervals, so a scene that was slow from its first frame raised its own budget.

The revised `lib/client/governor.js` (1.1 KB gzip) changes the contract and the rules:
- **Contract:** call `gov.frame(now)` on every rendered frame and **`gov.pause()` whenever the loop stops** (on-demand idle, settled, off-screen). Hidden tabs pause it automatically.
- **Every interval** between frames the loop asked for back to back is judged, including a 300 ms one.
- **The budget is the refresh measured before the scene starts** (`refreshMs` from `measureRefresh()`, or 60 Hz if absent). The scene can lower it but never raise it.
- **Windows** close after 45 frames or 1 s, whichever comes first (from S10). Step down when p90 > 1.25 × budget for 2 windows, or at once when the median > 2 × budget. A 1.5 s settle follows start and every change.
- **At the lowest level**, it calls `onFloor()` (stop and show the poster) only when the median is also below ~27 fps (S10's criterion).
- It steps up after 8 s without a failing window, and never to a level that failed in the last 30 s. `stepUp: false` gives S10's "only down" behaviour.

The table compares it with v1, a port of drei `PerformanceMonitor`'s defaults, and a port of S10 `hero.js`'s governor. S10's rule: the median over 45 frames or 2 s after a 1 s warm-up, against a fixed 1000/60 target; only steps down; gives up at the floor below ~27 fps.

| Cell | governor.js (revised) | v1 (first report) | drei defaults | S10 hero.js rule |
|---|---|---|---|---|
| **switch:** 1× → 6× at 6 s → 1× at 18 s | down 1.6–1.7 s after the throttle; back up 19.8–20.0 s after release (3/3) | 2.6–2.8 s; back up 20.7–21.1 s (3/3) | stepped in 1 of 3 (8.3 s), then flapped back up while still throttled | 1.7 s; never back up (by design) |
| **slowstart:** 6× from the first frame | first down at 2.5 s; ends at level 1–2 | 3.9–4.1 s; level 1–2 | 20–23 s in 2 of 3, never in 1 (stayed at p90 33 ms) | 2.4–2.6 s; level 1 |
| **steady:** 300/200/120/80 ms of work per frame, below 4 fps at every level | lowest level, then **gives up at 9.8–9.9 s** | **0 step-downs** | lowest level at 16.1–16.4 s; never gives up | lowest level; gives up at 12.0–12.1 s |
| **ondemand:** 3-frame bursts every 0.7 s and a 1 s drag every 6 s, with `pause()` | 0 changes | 0 | **2 false step-downs** in every run | 0 |
| ondemand **without** `pause()` (the misuse) | 3 false step-downs from 4.2 s; keeps running at the lowest level; `console.warn` fires | — | — | — |
| **hz30:** light scene on a simulated 30 Hz display (rAF serviced every other vsync) | 0 (measured 33.3 ms) | 0 | **3 false, down to the lowest level** | **3 false, down to the lowest level, from 2.5 s** |

A Node unit check (`lib/governor-unit.mjs`, deterministic) gives the same verdicts on synthetic streams [L `results/governor-unit.json`]:
- 300 ms frames: lowest level and give-up at 9.9 s.
- A 30 fps scene on a 60 Hz budget: lowest level, no give-up.
- A 30 Hz display with the refresh measured beforehand: nothing.
- `gapsArePauses: true` (v1 behaviour) at 300 ms frames: nothing.

**Held-out pages** [L `results/heldout.json`, 2 runs per cell, load 4–12]:
- The pages are three S10 hero builds and the skill's `tools/regress/fixtures/capture-webgl.html`, at 1×, 4× and 6×.
- The governor is hooked into each page's own rAF: `pause()` is called when a frame was not requested from inside the previous frame, and no refresh is given (60 Hz assumed).
- The hook cannot change what these pages render, so this tests when the governor would act, not recovery.

| Page (frame interval p50) | governor.js | v1 | `detectTier()` run on the running page (a misuse on purpose) |
|---|---|---|---|
| e5-three, SwiftShader, 2–4 fps (230–390 ms) | 3 step-downs from 2.0–2.8 s; **gives up at 9.6–10.3 s in 6 of 6** | **0 in 6 of 6** | **undetermined** in 6 of 6, 2.3–3.2 s (the first report's code took 6.3–8.9 s and said "average") |
| d-canvas2d 1× (16.7) | 0, 0 | 0, 1 | strong |
| d-canvas2d 4× (p90 25) | 0, 3 | 2, 3 | average |
| d-canvas2d 6× (33) | 3, 3; keeps running (holds 30 fps) | 3, 3 | low (refresh not measurable, flagged) |
| f-three-particles 1× (33 on SwiftShader) | 3, 3; keeps running | 3, 2 (refresh estimate rose to 33 in 1 run) | strong (read 33.3 ms: see below) |
| f-three-particles 4×–6× (50–58) | 3 step-downs; gives up at 9.9–10.1 s | 1–2 step-downs; its refresh estimate rose to 33 ms in 4 of 4 runs; never gives up | average / strong (throttler dropout: 2.2 ms work) at 4×; low at 6× |
| capture-webgl (no rAF loop) | idle | idle | strong / average / low at 1/4/6×, 0.8–1.9 s |

There were no page errors.

The first revision of the templates, run on these pages, exposed two more defects, both fixed and re-measured [L `results/heldout-first-revision.json`]:
- It gave up on a steady 30 fps animation: S10's canvas hero at 6× and f-three-particles at 1×, in 2 of 2 runs each.
- `measureRefresh()` read 33–133 ms in 7 of 24 calls on pages whose scene was already running. That inflated the budget: f-three-particles at 4× was called "strong" with 8.3 ms of work judged against 33.3 ms.

`measureRefresh()` now returns null when the intervals disagree (p75 > 1.15 × p25) or exceed 34 ms. One case cannot be caught: a scene that holds a steady 30 fps looks exactly like a 30 Hz display (f-three-particles 1× still read 33.3). **That is why the refresh must be measured while only the poster is on screen.**

**Reconciling with S10:**
- S10's governor steps down as fast (1.7 vs 1.6–1.7 s) and gives up on sub-4 fps scenes as well (12.0 vs 9.8 s).
- **Its fixed 1000/60 target walked a 30 Hz display to the lowest level in 3 of 3 runs.**
- `governor.js` takes S10's time-bounded windows, its give-up criterion and its only-down option (`stepUp: false`), and keeps the measured budget and the `pause()` contract.
- The skill should carry one governor: `governor.js`, with S10's hero wrapper calling it with `{ stepUp: false, onFloor: showPoster }` in place of its inline rule.

### D. Loading a heavy module: nine strategies, two visitors [L `results/loading.json`, `shots/loading-journeys.jpg`]

Setup:
- Page: 2.7 KB of HTML plus a 52 KB AVIF hero.
- **Heavy module:** 597 KB gzip of JS plus 4 × 512 KB of assets. The staged build has a 150 KB core plus a 128 KB low-res asset.
- **Small island (new):** 31 KB gzip of JS plus a 16 KB asset.
- Profile: phone, slow 4G, 4× CPU, empty cache, 5 runs per cell.
- The "quick" visitor taps at 6.5 s; the "reader" taps at 19.5 s.
- Heavy variants were measured earlier today at load 10–24; the small ones this session at load 4–10.

| Strategy | `perf.mjs`: LCP / TBT / transfer | Bytes before the first tap | Session TBT (quick / reader) | Wait from tap to usable: quick | Wait: reader |
|---|---|---|---|---|---|
| eager (`modulepreload` + boot) | **972** / 201 / 2,687 KB | 551 KB | 241 / 265 | 7.8 s | 0 |
| idle | 660 / **195** / 2,687 KB | 511 KB | 259 / 225 | 8.1 s | 0 |
| visible (IntersectionObserver) | 632 / 0 / 54 KB | 54 KB | 236 / 193 | 12.0 s | 10.1 s |
| interaction (poster + button) | 680 / 0 / 54 KB | 54 KB | 235 / 352 | 13.7 s | 13.8 s |
| prefetch on approach, boot on tap | 644 / 0 / 54 KB | 54 KB | 291 / 360 | 11.4 s | 7.5 s |
| **staged**, on tap | 652 / 0 / 54 KB | 54 KB | **42 / 32** | **1.9 s** | **1.9 s** |
| **staged + prefetch on approach** | 656 / 0 / 54 KB | 54 KB (375 KB on approach) | 33 / 46 | **0.18 s** | **0.24 s** |
| **small island, idle** | 652 / 0 / 101 KB | 101 KB | 0 / 0 | **0 s** (ready at 1.2 s) | 0 s |
| small island, on interaction | 648 / 0 / 54 KB | 54 KB | 0 / 0 | 0.62 s | 0.61 s |

The reviewer reproduced the heavy rows within ~10%: waits of 7.9–8.5 s eager, 13.6–13.7 s interaction, 1.8–2.0 s staged and 0.10–0.15 s staged + prefetch; LCP 908 ms eager against 636–686 ms for the rest.

- **For a heavy module on slow 4G, the bytes decide the wait.** No trigger fixes it; only staging does.
- **Idle-booting a heavy module acts like "eager after the LCP":** every visitor paid 2.7 MB and ~200–260 ms of TBT. Safari has no `requestIdleCallback` [V BCD].
- **A small island is the opposite case.** On idle it was ready at 1.2 s, cost 0 TBT and added 47 KB for every visitor, and nobody ever waited. On interaction it saved those 47 KB but made every tapper wait 0.6 s.
- The line between the two is where the module stops fitting the network's ~1 s budget (78–137 KB on slow 4G). Only the two end points were measured.
- Everything was measured on slow 4G only.

### E. HTML streaming vs buffered SSR vs client rendering [L `results/streaming.json`]

Unchanged from the first report. With a 1.2 s backend:
- Streaming the head, hero and skeleton gave FCP 228 and LCP 640 ms, against 1,324 and 1,712 ms buffered, with the list at the same moment (~1.23 s).
- Client fetching put the list at 2,366 ms (+1.1 s).
- CLS was 0 everywhere with skeletons at final geometry.
- React Fizz uses the same inline-script swap [V `ReactDOMFizzInstructionSetShared.js`].

### F. Placeholders and progressive images [L `results/placeholders.json`]

Unchanged from the first report:
- A 16 px WebP data URI is 72–132 bytes and costs ~0 JS.
- BlurHash decoded at card size cost 351 ms at 1× and 1,100 ms at 4× for 24 cards; decoded at 32 px it cost 31 / 89 ms.
- AVIF placeholders are ~300 bytes.
- The placeholder never became the LCP (Chromium's 0.05 bits-per-pixel rule [V `largest_contentful_paint_calculator.cc:758`]).
- Blink repaints a loading image at most once a second [V `image_resource.cc`, `kFlushDelay`], so progressive JPEG only shows an early frame when the image takes more than ~1 s.

### G. Off the main thread [L `results/offmain.json`, this session, load 5–13]

The dataset is 200k records. The job fetches, parses, aggregates, builds a histogram and a grid, finds the top 50, and produces points; a tap arrives every 100 ms throughout.

| Approach (1× / 4×) | Wire size (gzip) | Done (ms) | First result | Worst tap | LoAF blocking |
|---|---|---|---|---|---|
| main thread, full JSON (8 fields) | 6.1 MB | 371 / 981 | same | 144 / 560 | 119 / 663 |
| main, yield every 5k | 6.1 MB | 370 / 1,018 | same | 128 / 528 (no better) | 120 / 746 |
| main, streaming NDJSON, yield every 8 ms | 6.1 MB | 386 / 1,389 | **65 / 271** | 32 / 40 | 0 / 11 |
| worker (Comlink): summary + transferred points | 6.1 MB | 396 / 442† | same | **32 / 32** | 0 / 0 |
| **worker that posts the parsed objects back** | 6.1 MB | **741 / 1,305** | same | **232 / 736** | 205 / 700 |
| worker, streaming NDJSON | 6.1 MB | 275 / 422† | 53 / 116 | 16 / 24 | 0 / 0 |
| **main, only the 4 fields the view uses, as objects** (new) | 3.8 MB | 230 / 782 | same | 104 / 472 | 75 / 544 |
| **main, the 4 fields as JSON columns** (new) | 2.6 MB | 98 / 339 | same | 0 / 136 | 0 / 174 |
| main, the 4 fields as typed binary columns | 2.2 MB | **62 / 142** | same | 0 / 0 | 0 / 3 |

† CDP does not throttle workers: the same spin loop took 58/59 ms in a worker at 1×/4×, against 57/234 ms on the main thread.

- **Splitting the credit for "columnar binary":** 6.0× at 1× and 6.9× at 4× this session. The first report and the reviewer measured 4.8–5.4×.
  - Dropping the four unused fields: 1.6× / 1.25×.
  - Objects → columns: 2.3× / 2.3×.
  - JSON columns → typed binary: 1.6× / 2.4×.
  - Columnar JSON alone removed every tap over 100 ms at 1×.
  - Over the wire, most of the saving comes from fields and columns (6.1 → 2.6 MB). Binary adds little there (2.2 MB), because Float32 barely compresses.
- **Posting 200k objects through structured clone** cost 158 / 607 ms to deserialise on the main thread (158–350 / 574–620 across three sessions). A JSON string plus `JSON.parse` cost 15 + 99 / 64 + 457 ms. A 1.6 MB `Float32Array` cost 1 / 4 ms copied and 0 transferred.

**Heavy visuals and input** (1×; the heavy scene stands in for a weak device because CDP cannot slow a worker):

| Scene | fps | Taps over 100 ms (of ~44), median [range] | Worst tap, median [range] | LoAF blocking per 4 s |
|---|---|---|---|---|
| light (10 ms per frame), main thread | 59.5 | 0 [0–2] | 40 [40–112] | 0 [0–43] |
| light, OffscreenCanvas worker | 56.7 | 0 | 24 [16–40] | 0 |
| heavy (47 ms per frame), main thread | 20.3 | 2 [0–6] | 104 [96–192] | 78 [32–164] |
| heavy, OffscreenCanvas worker | 20.7 | 0 | 16 [16–24] | 0 |
| **heavy, plays 1.2 s then settles** (main thread, new) | — | 0 [0–1] | 96 [88–112] | 47 [3–115] |
| light at CDP 4× (main thread) | 18.7 | 9 [3–10] | 128 [104–152] | 67 [7–107] |

**The main-thread penalty scales with host load; the worker result does not.**
- At load 16–19, the heavy main-thread scene gave 14–16 taps over 100 ms, worst 384 ms, and 521–660 ms of LoAF per 4 s (first report and reviewer).
- The light scene gave 5 taps over 100 ms, worst 220 ms (reviewer), where the first report said "none".
- In a worker, the worst tap stayed ≤ 64 ms in all three sessions.
- **Settling the animation removed the penalty after the motion stopped**, with no worker and no Safari floor.

Support, and what three.js already does, are unchanged from the first report [V BCD; three.js 0.186 source]:
- OffscreenCanvas: Chrome 69, Firefox 105, Safari 16.4.
- **WebGL2 in OffscreenCanvas: Safari 17.**
- rAF in workers: Firefox 99.
- DRACOLoader and KTX2Loader use pools of 4 workers.
- Meshopt decodes on the main thread unless `useWorkers(n)` is called.
- `compileAsync` uses `KHR_parallel_shader_compile`.
- On context loss, three.js calls `preventDefault()`.

### H. Lab-method findings

- An idle page under CDP throttling burns **55–88% of a core** at 4–6× (81 / 88% this session, 61–62% first, 55–57% reviewer) [L `throttlerIdleBurn`], because the throttler busy-waits [V].
- Delivered slowdown was within ±30% in 48 of 70, 44 of 70 and 25 of 40 throttled runs across three sessions.
- **The first report's governor timings were biased low.** The harness timed the throttle on Node's clock and the step-down on the page's clock, so the page-load offset (0.3–0.9 s) went missing. That is why the reviewer measured v1 at 2.4–2.75 s where the report said 1.5–2.4 s. Both are now timed on the page's clock, and v1 measures 2.6–2.8 s.
- Emulated latency did not show in TTFB.

### I. How games hide loading, mapped to the web

Unchanged from the first report [S Road to VR, TV Tropes, Needle docs; K]:

| Game technique | Web equivalent |
|---|---|
| Load behind something the player is doing | Load behind the poster or a real first choice |
| Proximity streaming | Prefetch within one viewport |
| Low mips and LODs first | Staged core plus low-res assets |
| Playable while loading | 1.9 s vs 13.7 s here |
| Shader pre-warm | `compileAsync` / `initTexture` |
| Byte-weighted progress | Progress by bytes, with honest sizes |

## Experiments

```
cd research/stage2/experiments/S11-loading-tiers-offmain && npm install && node run.mjs
```

A full run takes about 2 h (tiers ~35 min, loading ~50 min). One part can be run with `node run.mjs unit|tiers|heldout|loading|placeholders|offmain|streaming|support|budget`. `node run.mjs merge` rebuilds `results.json` and `shots/*.jpg`. One browser runs at a time, and every run records the load average.

| Runner | What it does |
|---|---|
| `run-tiers.mjs` | Probe: quiet 1–6× and busy 1/4/6×, 10 runs each plus 5 calibration runs, with a fidelity check per run → `results/tiers.json`. Five governor cells × {governor.js, v1, drei port, S10 port} (+ the misuse) × 3 runs → `results/governor.json`. detect-gpu on 17 renderer strings. |
| `lib/governor-unit.mjs` | Deterministic synthetic streams → `results/governor-unit.json`. |
| `run-heldout.mjs` (new) | The templates on three S10 dist pages and `capture-webgl.html` (served read-only) × 1/4/6× × 2 governors × 2 runs → `results/heldout.json`. |
| `run-loading.mjs` | 9 strategies × 2 journeys × 5 runs, plus `perf.mjs --runs 5`. `--only` now keeps the other variants' stored runs (it used to drop them: fixed, and the heavy runs were restored from the unmodified copy). |
| `run-offmain.mjs` | 9 data approaches × 2 rates × 5 runs; 6 visual cells × 5 runs; spin loop; `postMessage` costs; throttler burn. |
| `run-streaming.mjs`, `run-placeholders.mjs`, `lib/support.mjs`, `lib/budget.mjs` | Unchanged. |

Budget arithmetic [L `results/budget.json`]:
- **KiB deliverable in 1 / 2.5 / 5 s:** slow 4G 137–78 / 430–371 / 918–859; 9 Mbps at 100 ms 879–659 / 2,527–2,307 / 5,273–5,054; slow 3G 10–0 / 83–44 / 205–166.
- **GPU memory with mips:** 2048² costs 21.3 MiB as RGBA, 5.3 MiB at 1 B/px and 2.7 MiB at 0.5 B/px.

Candidate templates:
- `lib/client/tier.js` (2.7 KB gzip)
- `lib/client/governor.js` (1.1 KB gzip)
- `lib/client/governor-v1.js` is kept only for the comparison. Do not copy it.

## Decision guidance for the skill

**1. `realtime-3d.md` §6 (extends).** Replace the bullet "Start from a device guess (touch, memory), then judge dropped frames…" with the detection order below. Extend the on-demand bullet with the `pause()` contract. Add new `templates/tier.js` and `templates/governor.js` from `lib/client/`. S10's inline governor gives way to `governor.js` with `stepUp: false`.

- A tier is capability × preference, never one number.
- **Detection order:**
  1. `?tier=` and `?motion=reduced` overrides, so every tier can be captured.
  2. `measureRefresh()` **while only the poster is on screen**, before any scene. If it returns null (busy or hidden), assume 60 Hz and flag it.
  3. No WebGL → none. A software renderer → low. Never trust `failIfMajorPerformanceCaveat` alone.
  4. A start guess that only lowers: Save-Data or `deviceMemory` ≤ 2 → low; coarse pointer → average. Never `hardwareConcurrency`, battery or `effectiveType`. detect-gpu is a self-hosted hint on Android and Windows at most.
  5. For CPU-bound scenes, after hydration: probe the **top tier's own per-frame JS** for ≥ 24 frames (0.75–1.8 s including the refresh). Judge the median against the measured refresh: < 0.3 strong, < 0.6 average, else low. **The edges are a RAIL-derived heuristic [K], not a lab result.**
     - Within ~10% of an edge, expect the tier to differ between visits. Proposal [K]: start at the lower tier and let the governor step up after 8 s.
     - `undetermined` → probe again once the page is quiet. If it is still undetermined, start at min(start guess, low).
  6. From then on the governor owns the tier: `createGovernor({ refreshMs, onChange, onFloor: showPoster })`.
     - Call `frame(now)` on every rendered frame and `pause()` whenever the loop stops. Forgetting `pause()` degrades an on-demand scene to the lowest level (measured) and triggers a console warning.
     - Hand over from the poster after ~1.5 s plus one window.
  7. On `webglcontextlost`: keep the poster and restore. A second loss drops a tier.
- **Keep/drop per tier:** keep the first report's table (resolution, anti-aliasing, shadows, post-processing, LOD, textures, on-demand rendering on low; stills on none). **Mark it [K]: a proposal; none of its per-tier choices was measured.** Every tier keeps lights, materials, framing, the UI and every action.
- **Overlays:**
  - Reduced motion: no auto-rotate, flights or idle loops.
  - Reduced transparency (Chromium only): solid surfaces instead of glass.
  - Save-Data: no warming; show the size.
  - A measured 30 Hz refresh: budget against the measured interval (e.g. 33 ms) and prefer on-demand rendering.
  - A 33 ms interval seen only after the scene started says nothing about the display.

**2. `performance.md`: new section "Loading a heavy experience". It amends §2 ("Ads, embeds, review widgets … load on idle") and §5 (islands with `client:idle`) for heavy modules only.**

- "Heavy" means the bytes needed before the module is usable exceed what the target network delivers in ~1 s (78–137 KB on slow 4G, 659–879 KB at 9 Mbps / 100 ms). Measured end points: 597 KB + 2 MB on one side, 31 KB + 16 KB on the other; the line between them is interpolated [K].
- **Small islands keep `client:idle`:** ready at 1.2 s, zero wait, 0 TBT, +47 KB for every visitor. On interaction, every tapper waits 0.6 s.
- **Heavy module that is the reason for its own route:** poster as the LCP; the core (≤ the ~1 s budget) plus low-res assets right after the LCP; the rest at low priority in yielded chunks; progress by bytes.
- **Heavy module as a section on a content page:**
  - Never eager (+300 ms LCP, 2.7 MB for everyone) and never idle-boot (same TBT and bytes as eager on slow 4G).
  - Use a poster plus a start control, stage the module, and warm it on approach: `modulepreload` plus `fetch(…, {priority:'low'})` within one viewport or on `pointerenter`/`focus`. Skip warming on Save-Data or the low tier. Safari has no `rel=prefetch` [V BCD].
  - Measured: waits of 0.18–0.24 s against 7.5–13.8 s; session TBT 33–46 against 190–360 ms. Slow 4G only.

**3. `performance.md` §1: "Setting a budget for a rich experience" (extends).** The same eight steps as the first report (device and network from evidence; waits as design decisions; waits → bytes via the budget table; frame → ms using the measured refresh; memory; thermals; value; when to stop), with these tags:
- The "≤ 0.3 × refresh for top-tier JS" line is [K].
- Thermals: a 10-minute run with p95 per 30 s window, passing if the last window is ≤ 1.2 × the first and there was no step-down. This is **a proposal to validate on a device [K]; not tested here.**
- The stop rule (< ~100 ms of wait, < ~1 ms of frame) is [K].
- The "~4× host vs mid-tier phone" rule is [K] (Lighthouse convention).
- The iOS memory ceiling is [S], unverified.

**4. `performance.md` §3** (extends; unchanged from the first report): placeholders and progressive images as in §F.

**5. `app-ui.md` §8** (extends; unchanged): stream the shell, and send the data when it is ready.

**6. `performance.md` §5: off-main-thread rules (extends; reordered).**
1. **Send only the columns the view needs, in a columnar layout, before adding threads.** Across the measured steps: fields 1.25–1.6×, objects → columns 2.3×, typed binary another 1.6–2.4×. Columnar JSON alone removed every tap over 100 ms at 1× (1 left at 4×).
2. `JSON.parse` of a large payload is one long task, and yielding around it does nothing (worst tap 128 / 528 ms vs 144 / 560 ms). Stream NDJSON (first result in 53–65 ms) or parse in a worker.
3. A worker returns summaries and transferred typed arrays, never an object graph. Posting 200k objects back was slower than doing the whole job on the main thread (741 vs 371 ms at 1×).
4. **A visual that competes with input: first ask whether it must keep moving.** `motion.md` §9: stop, settle, render on demand; settling after 1.2 s ended the penalty. Only a visual that must animate while people interact moves to OffscreenCanvas in a worker:
   - Canvas2D from Safari 16.4; **WebGL2 in OffscreenCanvas from Safari 17** [V BCD].
   - Input must be forwarded by `postMessage`, and the accessible name stays on the DOM canvas [K].
   - Evidence scope: Canvas2D particles at 1× with a spare host core; the size of the gain depends on load.
5. Call `MeshoptDecoder.useWorkers(n)`; run `compileAsync` and `initTexture` before the reveal [V three.js].
6. Cap worker pools at min(4, cores − 1) [K]; three.js defaults to 4 [V]. On WebKit, cores reads 4 or 8.
7. Avoid `SharedArrayBuffer` unless a WASM threads library needs it; COOP and COEP break embeds [K].
8. **Recognising harm:** Long Animation Frames with `blockingDuration > 0` while a visual runs means taps wait. Measured: 32–164 ms of blocking per 4 s went with worst taps of 96–192 ms (521–660 ms and up to 384 ms on a loaded host).

**7. `performance.md` §6: lab caveats (extends).**
- CDP slows only the main thread: scale the work, not the throttle, to judge a worker.
- An idle throttled browser burns 55–88% of a core: run one at a time and record `uptime`.
- Time throttle changes and frame timestamps on the page's clock.
- Frame rate is the wrong probe.

**8. `motion.md` §9 checklist (extends "Load late" and "Failure path").**
- Choose the trigger from item 2.
- Detect failure (no WebGL, software rendering, context loss, `onFloor`).
- New item: "every tier captured via `?tier=`".
- New item: "the loop calls `pause()` when it stops".

**9. `realtime-3d.md` §7 and `visual-qa.md` (extends).** Staged boot, the tier search behind the poster, per-tier captures, and the sustained run [K].

**10. Script proposals (not created).**
- `perf.mjs`: print the load average and a delivered-slowdown check.
- A `journey.mjs` generalised from `run-loading.mjs`.
- A `governor-check.mjs` generalised from `run-heldout.mjs`, which hooks a page's rAF and reports when the governor would step down or give up at 1/4/6×.

## Rejected ideas and why

- **An fps probe:** it called every quiet level from 1× to 6× "strong".
- **A min-of-N burst probe:** 2–9 of 10 depending on run; cannot be validated under CDP.
- **Absolute millisecond bands, a pull-down on ≤ 2 cores, and in-sample bands fitted to the calibration:** the labels move with the band choice (in-sample, 2× reads average).
- **detect-gpu as the verdict:** frozen data, the slowest-chip answer on iOS, tier 1 for unknown flagships, 447–546 ms during boot.
- **Governor v1 (long gaps treated as pauses, refresh from the scene's own intervals):** 0 step-downs at 300 ms per frame in 3 of 3 runs, and 0 on S10's e5-three at 2–4 fps in 6 of 6.
- **A fixed 16.7 ms budget (S10's rule, drei's 40 fps bound):** 3 of 3 false walks to the lowest level on a 30 Hz display.
- **Giving up at the lowest level on any failing window:** it replaced a steady 30 fps animation with the poster.
- **Measuring the refresh while a scene runs:** it read 33–133 ms and inflated the budget.
- **fps-averaging governors on on-demand renderers:** 2 false step-downs in every run.
- **Eager or idle boot for heavy below-the-fold modules; autostart on visible; poster + button without staging:** the costs are in §D.
- **Hash placeholders on server-rendered pages; AVIF placeholders; progressive JPEG for early paint on fast links.**
- **Posting parsed objects from a worker; yielding around `JSON.parse`; judging worker offloading with CDP throttling.**
- **OffscreenCanvas as the first answer to a janky animation:** settling or rendering on demand comes first.

## Open questions and limits of this evidence

- **No real devices; WebGL on SwiftShader.** The governor was tested on CPU slowdowns, a synthetic 30 Hz display and software-GL pages. On the held-out pages the hook cannot change rendering, so recovery there is untested. Real GPU-bound and thermal behaviour is untested.
- **The `pause()` contract needs adapters.** R3F's `frameloop="demand"` and three's `setAnimationLoop` were not integrated here; forgetting `pause()` degrades a scene.
- **The probe bands are a heuristic**, and results near an edge flip between runs. The "start at the lower tier" rule is a proposal. The CPU probe cannot see a weak GPU; the governor has to catch that (it did on e5-three).
- **A steady 30 fps scene is indistinguishable from a 30 Hz display** once it runs. Only measuring the refresh before the scene avoids that.
- **iOS behaviour comes from source only.** Throttler fidelity was 63–69% of runs; busy-page accuracy is dominated by it.
- **The main-thread INP penalty depends on host load** (worst taps 96–384 ms across sessions). Waits and bytes are robust; TBT and taps are indicative.
- **Loading rules were measured on slow 4G only**, with request-level emulation over HTTP/1.1. The heavy/small line between the two measured points is interpolated.
- **Not measured:** WASM decoder cost, KTX2 transcode, progressive AVIF.

## Changes after review

1. **Blocking: governor blind spots.** Confirmed, and fixed.
   - Redesigned `governor.js`: an explicit `pause()` contract, so every requested interval is judged; a budget measured before the scene that can never rise; windows of 45 frames or 1 s; a severe-window rule; give-up at the floor (S10's criterion).
   - Added cells for slow-from-the-first-frame, below 4 fps, a 30 Hz display and the on-demand misuse, plus a deterministic Node unit check.
   - Ran the templates on the reviewer's four held-out pages (new `run-heldout.mjs`). That run exposed two further defects (giving up at a steady 30 fps; the refresh read while a scene runs). I fixed both and re-measured everything with the final code.
   - Results: v1 made 0 step-downs at 300 ms per frame and on e5-three; the revised governor gave up at 9.6–10.3 s. Timing on the switch cell: 1.6–1.7 s.
2. **Probe bands in-sample.**
   - Bands are now 0.3 / 0.6 × the measured refresh, fixed in advance and tagged as a [K] heuristic.
   - Added 2×, 3× and 5× cells. 5× flips (5/5 with 24 frames); 2× and 3× are stable.
   - Stated that the labels are a choice, and showed that doubling the work moves 3× and 4× to low.
   - Kept "probe the top tier's own JS".
3. **`tier.js` contradictions.**
   - Bands derived from the refresh.
   - Cores pull-down removed; `deviceMemory` and cores comments corrected.
   - `maxMs` enforced on the wall clock, with a timer for when frames stop.
   - Added `undetermined` and a plausibility check in `measureRefresh()`.
   - On e5-three, `detectTier` now returns undetermined in 2.3–3.2 s (was 6.3–8.9 s and "average").
4. **Conflict with S10's governor.** Named it, ported it and measured it. Its fixed 1000/60 target made 3 of 3 false walks at 30 Hz. The skill should adopt one template, `governor.js`, which takes S10's windows, give-up and only-down option; S10's wrapper should call it with `stepUp: false`.
5. **Decision 2 too broad.**
   - Scoped it to modules above the ~1 s network budget, and stated that it amends §2 and §5 for heavy modules only.
   - Measured a small island: idle gives 0 s wait and 0 TBT for +47 KB; interaction gives a 0.6 s wait.
   - Noted it is slow-4G only.
   - Fixed a runner bug where `--only` dropped the other variants' runs.
6. **OffscreenCanvas advice technology-first.**
   - Reordered: stop, settle or render on demand first. Measured a settle cell (0–1 taps over 100 ms).
   - Noted the Safari 16.4 / 17 floors, input forwarding and the narrow evidence.
   - Corrected the light-scene claim, which did not reproduce: I now give 0–5 taps over 100 ms and worst taps of 40–220 ms across sessions, and show that the main-thread penalty scales with host load.
7. **Columnar speed-up mixes two changes.**
   - Added JSON variants with only the four fields, as objects and as columns.
   - The credit splits into fields 1.25–1.6×, layout 2.3× and typed binary 1.6–2.4×.
   - The rule now reads "send only the columns the view needs, in a columnar layout".
8. **Rules resting on [K].**
   - Tagged the thermal pass (a proposal to validate on a device), the probe bands, the worker-pool cap and the tier table as [K].
   - The 30 Hz causes now say "e.g.", and I state that 33 ms intervals alone cannot tell a slow scene from a 30 Hz display; the hz30 cell shows that measuring the refresh before the scene can.

The reviewer's other reproduction differences are now reported as ranges across sessions:
- **Governor timing:** the first report's v1 figures were biased low by a clock mismatch in the harness, now fixed; v1 measures 2.6–2.8 s.
- **drei port stepping down on the switch cell:** 1 of 3 runs again.
- **Busy 6×:** 3–8 of 10.
- **Burst probe:** 2–9 of 10.
- **Idle burn:** 55–88% of a core.

Files are in `/home/user/website-redesign-skill/research/stage2/experiments/S11-loading-tiers-offmain/`:
- Templates: `lib/client/tier.js`, `lib/client/governor.js` (`governor-v1.js` is superseded and kept only for comparison)
- Runners: `run-tiers.mjs`, `run-heldout.mjs`, `lib/governor-unit.mjs`, `run-offmain.mjs`, `run-loading.mjs`, `run.mjs`
- Results: `results.json`, and in `results/`: `tiers.json`, `governor.json`, `governor-unit.json`, `heldout.json`, `heldout-first-revision.json`, `offmain.json`, `loading.json`
- Chart: `shots/loading-journeys.jpg`
