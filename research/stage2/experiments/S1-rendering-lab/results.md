# S1 rendering lab — results

Generated 2026-09-29T09:07 · Chromium 141.0.7390.37 headless · 4 × Intel(R) Xeon(R) Processor @ 2.10GHz (shared) · WebGL: ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)

**Every GPU-bound number here is CPU-emulated.** WebGL runs on SwiftShader and the display compositor runs in software (`SoftwareRenderer`), so frame rates of the WebGL variants — and, less so, of DOM/SVG compositing — are pessimistic and comparable only with each other. `JS ms/frame` (the scene's own update + render call) and `renderer ms/frame` (renderer-process CPU per displayed frame) are the GPU-independent columns. `busy %` (CDP TaskDuration) counts a main thread blocked waiting for the emulated GPU as busy, so it overstates WebGL main-thread load.

**"4×" is not a phone.** CDP `Emulation.setCPUThrottlingRate` slows only the page's main thread; the compositor, raster threads, GPU process and Workers run at full speed (see "What CPU throttling reaches" below). A 4× column therefore means "main thread 4× slower, everything else unchanged", which favours DOM/SVG (whose compositing and raster happen off the main thread) over Canvas 2D (which draws on the main thread), and would favour a Worker over everything, so Worker variants are measured at 1× only. Read 4× results as relative positions, not as object counts for a phone.

Fresh browser context per run; viewport 860×720 at DPR 1; stage 800×600. Warm-up 1 s after the first frame, then a 5 s window (rAF deltas, CDP Performance.getMetrics TaskDuration, SystemInfo.getProcessInfo CPU per process type), then a scripted drag of the top item (30 pointer moves 16 ms apart) while everything animates, then heap after GC. CPU throttle with CDP Emulation.setCPUThrottlingRate, which slows only the page's main thread: the compositor, raster threads, GPU process and Workers stay at full speed (throttleprobe), so "4×" = "main thread 4× slower", not a phone, and Worker variants run at 1× only. Medians across runs.

## What CPU throttling reaches

The same integer loop (4e+7 iterations) timed with performance.now() on the page's main thread and inside a dedicated Worker, with Emulation.setCPUThrottlingRate 1 and 4 sent to the page's CDP session. min and median of 5 runs each, alternating main/Worker. Then the throttling command sent directly to the Worker's DevTools target (Target.attachToTarget, non-flattened session).

| throttle | main thread min / median ms | Worker min / median ms |
| --- | --- | --- |
| 1× | 277 / 297 | 277 / 287 |
| 4× | 1229 / 1235 | 279 / 288 |

Emulation.setCPUThrottlingRate sent to the Worker's own target: error "Operation is only supported for pages, not workers".

## Production bundles (esbuild, minified; KB)

| variant | total min | total gzip | total br | runtime min | app min | app gzip | JS fetched at run time (gzip, per file) | chunks |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dom | 6.7 | 3.0 | 2.7 | 0.0 | 6.7 | 3.0 | 3.0 | 1 |
| svg | 6.8 | 3.1 | 2.8 | 0.0 | 6.8 | 3.1 | 3.1 | 1 |
| canvas2d | 6.2 | 2.9 | 2.6 | 0.0 | 6.2 | 2.9 | 2.9 | 1 |
| canvas2d-worker | 3.6 | 1.7 | 1.5 | 0.0 | 3.6 | 1.7 | 3.7 | 2 |
| pixi | 562.1 | 165.6 | 136.8 | 547.6 | 7.1 | 3.2 | 171.7 | 23 |
| phaser | 1362.9 | 364.1 | 291.7 | 1356.0 | 6.9 | 3.0 | 364.1 | 1 |
| three | 527.1 | 133.8 | 110.6 | 519.2 | 7.8 | 3.6 | 133.8 | 1 |
| three-instanced | 530.6 | 134.8 | 111.2 | 522.3 | 8.3 | 3.9 | 134.8 | 1 |
| r3f | 1126.3 | 312.7 | 250.7 | 1118.4 | 7.2 | 3.5 | 312.7 | 1 |
| dom-a11y | 10.2 | 4.4 | 3.9 | 0.0 | 10.2 | 4.4 | 4.4 | 1 |
| svg-a11y | 10.6 | 4.6 | 4.2 | 0.0 | 10.6 | 4.6 | 4.6 | 1 |
| pixi-a11y | 565.7 | 167.0 | 138.0 | 547.6 | 10.7 | 4.8 | — | 23 |
| pixi-pixia11y | 563.9 | 165.8 | 137.1 | 547.4 | 7.5 | 3.4 | — | 28 |
| r3f-instanced | 1128.8 | 313.7 | 251.6 | 1118.4 | 9.7 | 4.5 | — | 1 |

Runtime packages (min KB): pixi: pixi.js 524.3, @pixi/colord 9.0, earcut 7.1, eventemitter3 2.8; phaser: phaser 1356.0; three: three 519.2; three-instanced: three 522.3; r3f: three 726.5, react-dom 205.1, @react-three/fiber 166.3, react 8.3; pixi-a11y: pixi.js 524.3, @pixi/colord 9.0, earcut 7.1, eventemitter3 2.8; pixi-pixia11y: pixi.js 524.1, @pixi/colord 9.0, earcut 7.1, eventemitter3 2.8; r3f-instanced: three 726.5, react-dom 205.1, @react-three/fiber 166.3, react 8.3

## Steady state and drag, per N and CPU throttle (medians of runs)

### N=20, 1× CPU

| variant | renderer | first frame ms | fps | frame p50/p95 ms | JS ms/frame p50/p95 | renderer ms/frame | GPU-proc CPU % | busy % | drag move→frame p50/p95 ms | Event Timing max ms | heap MB | DOM nodes | draw calls | runs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dom | dom | 51 | 60.0 | 16.7 / 16.8 | — / — | 1.0 | 5 | 3 | 14.2 / 16.6 | 32 | 2.0 | 106 | — | 5 |
| svg | svg | 48 | 60.0 | 16.7 / 16.7 | — / — | 2.0 | 4 | 4 | 14.1 / 17.3 | 32 | 2.0 | 194 | — | 5 |
| canvas2d | canvas2d | 45 | 60.0 | 16.7 / 16.8 | 0.10 / 0.10 | 1.6 | 6 | 7 | 14.3 / 17.5 | 32 | 1.9 | 44 | — | 5 |
| canvas2d-worker | canvas2d-offscreen-worker | 71 | 60.0 | 16.7 / 16.7 | 0.10 / 0.10 | 1.5 | 6 | 1 | 29.4 / 32.5 | 16 | 1.8 | 42 | — | 5 |
| pixi | pixi-webgl | 290 | 42.7 | 16.7 / 33.4 | 0.20 / 0.40 | 1.7 | 239 | 100 | 47.7 / 78.2 | 48 | 4.0 | 44 | — | 5 |
| phaser | phaser-webgl | 256 | 45.2 | 16.7 / 33.4 | 0.20 / 0.50 | 1.8 | 212 | 99 | 43.0 / 92.8 | 48 | 5.6 | 49 | — | 5 |
| three | three-webgl2 | 128 | 40.1 | 16.7 / 49.9 | 0.20 / 1.20 | 1.8 | 244 | 99 | 42.6 / 83.2 | 40 | 3.8 | 44 | 21 | 5 |
| three-instanced | three-instanced-webgl2 | 125 | 40.3 | 16.7 / 50.0 | 0.20 / 1.20 | 1.7 | 244 | 100 | 52.2 / 131.1 | 80 | 3.8 | 44 | 2 | 5 |
| r3f | r3f-webgl2 | 585 | 43.1 | 16.7 / 33.4 | 0.30 / 0.60 | 1.8 | 264 | 100 | 50.3 / 74.9 | 40 | 5.8 | 48 | — | 5 |

### N=200, 1× CPU

| variant | renderer | first frame ms | fps | frame p50/p95 ms | JS ms/frame p50/p95 | renderer ms/frame | GPU-proc CPU % | busy % | drag move→frame p50/p95 ms | Event Timing max ms | heap MB | DOM nodes | draw calls | runs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dom | dom | 49 | 60.0 | 16.7 / 16.8 | — / — | 3.7 | 20 | 19 | 14.4 / 20.2 | 32 | 2.0 | 646 | — | 5 |
| svg | svg | 68 | 59.8 | 16.7 / 16.8 | — / — | 7.6 | 3 | 20 | 13.0 / 19.4 | 48 | 2.1 | 1274 | — | 5 |
| canvas2d | canvas2d | 48 | 60.0 | 16.7 / 16.8 | 0.20 / 0.40 | 3.4 | 5 | 20 | 14.8 / 19.6 | 32 | 1.9 | 44 | — | 5 |
| canvas2d-worker | canvas2d-offscreen-worker | 56 | 59.2 | 16.7 / 16.8 | 0.20 / 0.50 | 3.1 | 5 | 1 | 30.1 / 32.6 | 16 | 1.8 | 42 | — | 5 |
| pixi | pixi-webgl | 255 | 23.2 | 33.4 / 83.3 | 0.30 / 1.60 | 1.9 | 217 | 99 | 70.8 / 200.5 | 80 | 4.2 | 44 | — | 5 |
| phaser | phaser-webgl | 287 | 18.8 | 50.0 / 100.0 | 0.30 / 1.50 | 2.2 | 191 | 100 | 84.5 / 149.3 | 64 | 5.8 | 49 | — | 5 |
| three | three-webgl2 | 150 | 18.5 | 50.0 / 100.0 | 0.70 / 3.20 | 2.8 | 199 | 100 | 94.5 / 173.7 | 88 | 4.1 | 44 | 201 | 5 |
| three-instanced | three-instanced-webgl2 | 146 | 17.8 | 50.0 / 100.1 | 0.30 / 1.70 | 1.9 | 190 | 100 | 107.6 / 189.6 | 144 | 3.8 | 44 | 2 | 5 |
| r3f | r3f-webgl2 | 654 | 17.7 | 50.0 / 99.9 | 0.70 / 3.60 | 3.2 | 195 | 100 | 97.3 / 223.8 | 120 | 6.6 | 48 | — | 5 |

### N=2000, 1× CPU

| variant | renderer | first frame ms | fps | frame p50/p95 ms | JS ms/frame p50/p95 | renderer ms/frame | GPU-proc CPU % | busy % | drag move→frame p50/p95 ms | Event Timing max ms | heap MB | DOM nodes | draw calls | runs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dom | dom | 77 | 6.4 | 141.8 / 283.4 | — / — | 68.9 | 40 | 67 | 189.9 / 539.6 | 448 | 2.2 | 6046 | — | 5 |
| svg | svg | 125 | 16.3 | 50.0 / 133.4 | — / — | 60.7 | 2 | 97 | 134.1 / 336.9 | 256 | 2.3 | 12074 | — | 5 |
| canvas2d | canvas2d | 101 | 29.8 | 33.3 / 66.6 | 1.80 / 3.60 | 24.8 | 3 | 99 | 51.7 / 101.9 | 72 | 2.1 | 44 | — | 5 |
| canvas2d-worker | canvas2d-offscreen-worker | 147 | 26.5 | 33.3 / 83.5 | 2.20 / 6.60 | 22.4 | 3 | 1 | 36.7 / 63.9 | 16 | 1.8 | 42 | — | 5 |
| pixi | pixi-webgl | 490 | 2.3 | 433.3 / 766.6 | 1.00 / 6.30 | 5.7 | 111 | 100 | 854.0 / 1506.9 | 952 | 6.9 | 44 | — | 5 |
| phaser | phaser-webgl | 320 | 1.7 | 550.0 / 799.9 | 1.20 / 6.50 | 8.5 | 111 | 100 | 1282.9 / 1799.5 | 1152 | 8.6 | 49 | — | 5 |
| three | three-webgl2 | 217 | 1.8 | 549.9 / 749.9 | 6.90 / 15.60 | 16.7 | 113 | 100 | 1124.7 / 1792.8 | 984 | 6.9 | 44 | 2001 | 5 |
| three-instanced | three-instanced-webgl2 | 194 | 1.8 | 558.4 / 650.0 | 0.60 / 3.80 | 4.4 | 111 | 100 | 1292.0 / 1772.7 | 872 | 3.9 | 44 | 2 | 5 |
| r3f | r3f-webgl2 | 1351 | 1.6 | 583.3 / 899.9 | 8.25 / 14.60 | 18.6 | 106 | 100 | 1214.7 / 1923.4 | 1080 | 14.3 | 48 | — | 5 |

### N=20, 4× CPU (main thread only)

| variant | renderer | first frame ms | fps | frame p50/p95 ms | JS ms/frame p50/p95 | renderer ms/frame | GPU-proc CPU % | busy % | drag move→frame p50/p95 ms | Event Timing max ms | heap MB | DOM nodes | draw calls | runs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dom | dom | 125 | 59.8 | 16.7 / 16.8 | — / — | 12.2 | 5 | 15 | 13.1 / 22.1 | 56 | 2.0 | 106 | — | 5 |
| svg | svg | 116 | 59.4 | 16.7 / 16.8 | — / — | 13.6 | 3 | 17 | 12.4 / 20.4 | 40 | 2.0 | 194 | — | 5 |
| canvas2d | canvas2d | 165 | 59.0 | 16.7 / 16.8 | 0.10 / 0.70 | 12.9 | 5 | 30 | 13.1 / 33.0 | 40 | 1.9 | 44 | — | 5 |
| pixi | pixi-webgl | 716 | 21.1 | 49.9 / 83.4 | 0.80 / 3.30 | 25.9 | 118 | 99 | 90.0 / 202.2 | 88 | 3.9 | 44 | — | 5 |
| phaser | phaser-webgl | 797 | 19.5 | 50.0 / 100.0 | 0.90 / 3.60 | 27.3 | 98 | 99 | 90.2 / 176.0 | 104 | 5.5 | 49 | — | 5 |
| three | three-webgl2 | 446 | 20.9 | 50.0 / 83.4 | 1.00 / 3.90 | 29.6 | 130 | 99 | 91.4 / 227.2 | 120 | 3.8 | 44 | 21 | 5 |
| three-instanced | three-instanced-webgl2 | 390 | 16.7 | 50.0 / 116.6 | 0.90 / 4.30 | 30.6 | 100 | 98 | 80.9 / 165.5 | 144 | 3.7 | 44 | 2 | 5 |
| r3f | r3f-webgl2 | 1064 | 23.3 | 33.4 / 83.4 | 1.00 / 4.10 | 27.4 | 136 | 99 | 77.2 / 149.9 | 144 | 5.7 | 48 | — | 5 |

### N=200, 4× CPU (main thread only)

| variant | renderer | first frame ms | fps | frame p50/p95 ms | JS ms/frame p50/p95 | renderer ms/frame | GPU-proc CPU % | busy % | drag move→frame p50/p95 ms | Event Timing max ms | heap MB | DOM nodes | draw calls | runs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dom | dom | 135 | 53.6 | 16.7 / 33.3 | — / — | 14.1 | 19 | 65 | 28.3 / 85.4 | 104 | 2.0 | 646 | — | 5 |
| svg | svg | 197 | 47.2 | 16.7 / 49.9 | — / — | 18.0 | 3 | 71 | 21.8 / 63.8 | 56 | 2.1 | 1274 | — | 5 |
| canvas2d | canvas2d | 211 | 55.6 | 16.7 / 33.3 | 0.70 / 3.30 | 15.1 | 5 | 75 | 25.1 / 85.6 | 32 | 1.9 | 44 | — | 5 |
| pixi | pixi-webgl | 880 | 11.3 | 83.4 / 183.3 | 1.00 / 3.40 | 46.1 | 106 | 99 | 162.8 / 313.2 | 192 | 4.2 | 44 | — | 5 |
| phaser | phaser-webgl | 847 | 10.0 | 83.4 / 233.3 | 1.20 / 4.70 | 51.0 | 104 | 99 | 213.9 / 465.2 | 296 | 5.8 | 49 | — | 5 |
| three | three-webgl2 | 388 | 9.3 | 100.0 / 233.4 | 2.45 / 7.50 | 62.5 | 107 | 99 | 196.3 / 488.3 | 256 | 4.1 | 44 | 201 | 5 |
| three-instanced | three-instanced-webgl2 | 369 | 10.2 | 83.3 / 233.4 | 1.10 / 3.70 | 58.8 | 113 | 100 | 180.4 / 358.0 | 256 | 3.7 | 44 | 2 | 5 |
| r3f | r3f-webgl2 | 1124 | 11.4 | 83.3 / 166.7 | 2.90 / 7.40 | 51.9 | 129 | 99 | 163.7 / 389.4 | 184 | 6.6 | 48 | — | 5 |

### N=2000, 4× CPU (main thread only)

| variant | renderer | first frame ms | fps | frame p50/p95 ms | JS ms/frame p50/p95 | renderer ms/frame | GPU-proc CPU % | busy % | drag move→frame p50/p95 ms | Event Timing max ms | heap MB | DOM nodes | draw calls | runs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dom | dom | 226 | 3.3 | 258.3 / 699.9 | — / — | 247.6 | 41 | 83 | 447.3 / 1035.5 | 584 | 2.2 | 6074 | — | 5 |
| svg | svg | 318 | 7.0 | 133.4 / 233.4 | — / — | 161.3 | 1 | 99 | 303.2 / 661.2 | 528 | 2.3 | 12074 | — | 5 |
| canvas2d | canvas2d | 195 | 9.3 | 100.0 / 183.3 | 7.60 / 14.70 | 89.6 | 2 | 99 | 205.3 / 315.7 | 232 | 2.1 | 44 | — | 5 |
| pixi | pixi-webgl | 953 | 1.8 | 466.7 / 899.9 | 3.95 / 9.60 | 257.2 | 89 | 100 | 1144.1 / 2469.4 | 688 | 6.9 | 44 | — | 5 |
| phaser | phaser-webgl | 862 | 1.5 | 616.7 / 1249.9 | 6.25 / 14.30 | 368.3 | 105 | 100 | 1318.1 / 2097.6 | 1168 | 8.6 | 49 | — | 5 |
| three | three-webgl2 | 478 | 1.9 | 525.1 / 799.9 | 18.15 / 33.50 | 349.0 | 126 | 100 | 1283.3 / 2062.8 | 1360 | 6.9 | 44 | 2001 | 5 |
| three-instanced | three-instanced-webgl2 | 369 | 1.6 | 641.7 / 1050.0 | 2.05 / 4.90 | 397.5 | 95 | 100 | 1118.2 / 1645.5 | 816 | 3.9 | 44 | 2 | 5 |
| r3f | r3f-webgl2 | 2506 | 1.4 | 616.7 / 1149.9 | 18.20 / 39.40 | 407.1 | 88 | 100 | 1240.4 / 2046.6 | 1456 | 14.3 | 48 | — | 5 |

## Where the CPU renderers stop holding the frame rate (object-count sweep)

Same scene and method as the main matrix, measured as its own round-robin set per throttle. Each cell: fps · % of frames that missed a vsync (rAF delta > 25 ms) · frame p95 ms, medians of runs. **Holds** = at most 10 % of frames miss a vsync (median of runs); the limit is given as a bracket between the last count that holds and the first that does not, with how many runs held at each end. p95 is shown but not used: rAF deltas come in whole vsyncs (17 / 33 / 50 ms), so p95 flips on a single frame. For the Worker variant, fps is the Worker's. The CPU renderers' raster and compositing run in software here, so absolute fps is pessimistic; use the crossover points relative to each other.

### 1× CPU

1-minute load average during these runs: median 2.0, range 0.7–4.8 on 4 CPUs.

| variant | N=200 | N=300 | N=400 | N=550 | N=700 | N=1000 | N=1400 | N=1700 | N=2000 | holds up to (bracket) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dom | 60.0 · 0% · 17 | 60.0 · 0% · 17 | 60.0 · 0% · 17 | 60.0 · 0% · 17 | 60.0 · 0% · 17 | 57.4 · 4% · 17 | 25.4 · 99% · 50 | 22.0 · 100% · 67 | 19.8 · 100% · 67 | 1000 (4/5) – 1400 (0/5) |
| svg | 60.0 · 0% · 17 | 60.0 · 0% · 17 | 60.0 · 0% · 17 | 60.0 · 0% · 17 | 60.0 · 0% · 17 | 58.6 · 2% · 17 | 46.0 · 28% · 33 | 41.5 · 41% · 33 | 35.1 · 63% · 50 | 1000 (4/5) – 1400 (0/5) |
| canvas2d | 60.0 · 0% · 17 | 60.0 · 0% · 17 | 60.0 · 0% · 17 | 60.0 · 0% · 17 | 60.0 · 0% · 17 | 60.0 · 0% · 17 | 58.8 · 2% · 17 | 53.0 · 13% · 33 | 44.9 · 34% · 33 | 1400 (5/5) – 1700 (2/5) |
| canvas2d-worker | 60.0 · 0% · 17 | 60.0 · 0% · 17 | 60.0 · 0% · 17 | 60.0 · 0% · 17 | 60.0 · 0% · 17 | 59.4 · 1% · 17 | 57.8 · 4% · 17 | 48.8 · 23% · 33 | 43.9 · 37% · 33 | 1400 (4/5) – 1700 (0/5) |

GPU-process CPU % (software display compositor) and main-thread busy % at 1×:

| variant | N=200 | N=300 | N=400 | N=550 | N=700 | N=1000 | N=1400 | N=1700 | N=2000 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dom | GPU 19 · main 14 | GPU 29 · main 23 | GPU 36 · main 28 | GPU 50 · main 43 | GPU 61 · main 52 | GPU 88 · main 69 | GPU 72 · main 62 | GPU 73 · main 61 | GPU 66 · main 69 |
| svg | GPU 4 · main 17 | GPU 4 · main 21 | GPU 4 · main 26 | GPU 4 · main 38 | GPU 4 · main 48 | GPU 4 · main 69 | GPU 3 · main 98 | GPU 3 · main 98 | GPU 3 · main 99 |
| canvas2d | GPU 6 · main 18 | GPU 6 · main 25 | GPU 6 · main 31 | GPU 6 · main 43 | GPU 6 · main 51 | GPU 6 · main 72 | GPU 6 · main 97 | GPU 5 · main 100 | GPU 5 · main 100 |
| canvas2d-worker | GPU 6 · main 1 | GPU 6 · main 1 | GPU 6 · main 1 | GPU 6 · main 1 | GPU 6 · main 1 | GPU 7 · main 1 | GPU 6 · main 1 | GPU 6 · main 1 | GPU 5 · main 1 |

### 4× CPU (main thread only; compositor, raster and GPU process unthrottled)

1-minute load average during these runs: median 2.0, range 1.5–3.0 on 4 CPUs.

| variant | N=100 | N=200 | N=300 | N=400 | N=500 | N=700 | N=1000 | holds up to (bracket) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dom | 60.0 · 0% · 17 | 60.0 · 0% · 17 | 59.2 · 1% · 17 | 53.2 · 13% · 33 | 41.3 · 45% · 33 | 24.3 · 97% · 50 | 14.7 · 100% · 100 | 300 (5/5) – 400 (0/5) |
| svg | 60.0 · 0% · 17 | 60.0 · 0% · 17 | 59.2 · 1% · 17 | 55.4 · 8% · 33 | 41.7 · 44% · 33 | 32.0 · 83% · 34 | 16.9 · 100% · 67 | 400 (4/5) – 500 (0/5) |
| canvas2d | 60.0 · 0% · 17 | 60.0 · 0% · 17 | 58.8 · 2% · 17 | 44.1 · 36% · 33 | 37.7 · 59% · 33 | 26.7 · 98% · 50 | 19.0 · 100% · 67 | 300 (5/5) – 400 (0/5) |

GPU-process CPU % (software display compositor) and main-thread busy % at 4×:

| variant | N=100 | N=200 | N=300 | N=400 | N=500 | N=700 | N=1000 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| dom | GPU 11 · main 31 | GPU 19 · main 58 | GPU 27 · main 83 | GPU 35 · main 96 | GPU 43 · main 96 | GPU 60 · main 97 | GPU 84 · main 92 |
| svg | GPU 3 · main 36 | GPU 3 · main 67 | GPU 3 · main 77 | GPU 3 · main 94 | GPU 3 · main 97 | GPU 3 · main 99 | GPU 2 · main 100 |
| canvas2d | GPU 5 · main 44 | GPU 5 · main 75 | GPU 5 · main 96 | GPU 5 · main 99 | GPU 4 · main 99 | GPU 4 · main 100 | GPU 3 · main 100 |

### The same 1× cells with the machine busier

3 extra processes each spinning one CPU core for the whole phase, on top of whatever else the machine runs; compare with the same cells of the 1× sweep.

| variant | N | quiet sweep: fps · missed % | with burners: fps · missed % | load average (sweep / burners) |
| --- | --- | --- | --- | --- |
| dom | 400 | 60.0 · 0% | 59.0 · 1% | 1.4 / 5.6 |
| svg | 400 | 60.0 · 0% | 59.6 · 1% | 1.4 / 5.7 |
| canvas2d | 400 | 60.0 · 0% | 59.8 · 0% | 1.4 / 5.5 |
| canvas2d-worker | 400 | 60.0 · 0% | 60.0 · 0% | 1.4 / 5.4 |
| dom | 700 | 60.0 · 0% | 34.1 · 63% | 1.6 / 5.5 |
| svg | 700 | 60.0 · 0% | 47.6 · 24% | 1.6 / 5.7 |
| canvas2d | 700 | 60.0 · 0% | 59.8 · 0% | 1.4 / 5.7 |
| canvas2d-worker | 700 | 60.0 · 0% | 59.4 · 0% | 1.3 / 5.7 |
| dom | 1000 | 57.4 · 4% | 17.9 · 98% | 1.9 / 5.7 |
| svg | 1000 | 58.6 · 2% | 34.8 · 57% | 2.0 / 5.9 |
| canvas2d | 1000 | 60.0 · 0% | 59.8 · 0% | 2.0 / 5.5 |
| canvas2d-worker | 1000 | 59.4 · 1% | 59.6 · 1% | 2.0 / 5.3 |
| dom | 1400 | 25.4 · 99% | 12.5 · 100% | 2.3 / 5.6 |
| svg | 1400 | 46.0 · 28% | 25.9 · 78% | 2.7 / 6.1 |
| canvas2d | 1400 | 58.8 · 2% | 56.6 · 6% | 2.6 / 6.0 |
| canvas2d-worker | 1400 | 57.8 · 4% | 54.4 · 10% | 2.4 / 5.8 |

## One mesh per item vs one InstancedMesh, vanilla three.js vs React Three Fiber

Measured as one set (its own round-robin groups), so compare within this table. `JS ms/frame` is the GPU-independent column: the scene's update + render call on the main thread.

| variant | N | CPU | first frame ms | fps | JS ms/frame p50/p95 | draw calls | heap MB | drag move→frame p50/p95 | app+runtime gzip KB | runs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| three | 200 | 1× | 191 | 9.8 | 0.80 / 4.10 | 201 | 4.1 | 167.5 / 336.3 | 133.8 | 5 |
| three-instanced | 200 | 1× | 171 | 10.3 | 0.30 / 1.50 | 2 | 3.7 | 178.7 / 299.5 | 134.8 | 5 |
| r3f | 200 | 1× | 627 | 10.3 | 1.00 / 4.20 | — | 6.6 | 161.0 / 282.8 | 312.7 | 5 |
| r3f-instanced | 200 | 1× | 607 | 10.2 | 0.30 / 2.20 | 2 | 5.7 | 166.9 / 369.2 | 313.7 | 5 |
| three | 200 | 4× | 340 | 6.6 | 2.85 / 8.30 | 201 | 4.1 | 243.3 / 465.0 | 133.8 | 5 |
| three-instanced | 200 | 4× | 363 | 7.2 | 0.95 / 4.30 | 2 | 3.7 | 250.9 / 510.7 | 134.8 | 5 |
| r3f | 200 | 4× | 1040 | 6.5 | 2.80 / 8.50 | — | 6.6 | 235.2 / 489.3 | 312.7 | 5 |
| r3f-instanced | 200 | 4× | 1196 | 7.3 | 0.40 / 4.30 | 2 | 5.6 | 240.6 / 512.6 | 313.7 | 5 |
| three | 2000 | 1× | 221 | 2.1 | 6.90 / 13.20 | 2001 | 6.9 | 802.0 / 1147.2 | 133.8 | 5 |
| three-instanced | 2000 | 1× | 170 | 2.5 | 0.50 / 3.20 | 2 | 3.9 | 771.1 / 1151.1 | 134.8 | 5 |
| r3f | 2000 | 1× | 783 | 2.2 | 7.70 / 13.20 | — | 14.3 | 889.1 / 1183.6 | 312.7 | 5 |
| r3f-instanced | 2000 | 1× | 662 | 2.5 | 0.60 / 3.40 | 2 | 6.1 | 861.4 / 1253.9 | 313.7 | 5 |
| three | 2000 | 4× | 486 | 1.6 | 18.30 / 33.40 | 2001 | 6.9 | 1337.4 / 2228.9 | 133.8 | 5 |
| three-instanced | 2000 | 4× | 394 | 1.5 | 1.90 / 5.60 | 2 | 3.9 | 1228.5 / 1965.0 | 134.8 | 5 |
| r3f | 2000 | 4× | 2434 | 1.7 | 19.40 / 28.90 | — | 14.3 | 1176.7 / 1840.3 | 312.7 | 5 |
| r3f-instanced | 2000 | 4× | 1371 | 1.5 | 2.30 / 6.60 | 2 | 6.1 | 1085.7 / 1781.0 | 313.7 | 5 |

WebGL disabled: **r3f** renderer none, poster visible no, canvases 0, error "THREE.WebGLRenderer: Error creating WebGL context."; **r3f-instanced** renderer poster, poster visible yes, canvases 0.

## Main thread under load (50 ms busy every 100 ms): Canvas 2D on the main thread vs in a Worker (1× only)

| variant | N | CPU | scene fps | missed vsyncs % | scene frame p95 | main-thread fps | drag move→frame p50/p95 ms | move event delay p50/p95 ms | busy % | runs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| canvas2d | 200 | 1× | 49.9 | 20 | 33.4 | 49.9 | 15.9 / 60.7 | 12.3 / 53.5 | 66 | 5 |
| canvas2d-worker | 200 | 1× | 60.0 | 0 | 16.7 | 50.0 | 29.4 / 33.3 | 12.6 / 16.4 | 51 | 5 |
| dom | 200 | 1× | 49.7 | 20 | 33.4 | 49.7 | 13.5 / 57.2 | 9.8 / 49.8 | 64 | 5 |
| canvas2d | 700 | 1× | 40.0 | 25 | 50.0 | 40.0 | 15.0 / 69.2 | 6.7 / 51.1 | 84 | 5 |
| canvas2d-worker | 700 | 1× | 60.0 | 0 | 16.7 | 50.0 | 29.0 / 33.4 | 11.5 / 16.0 | 51 | 5 |
| dom | 700 | 1× | 39.7 | 26 | 50.0 | 39.7 | 24.0 / 76.2 | 11.5 / 58.5 | 88 | 5 |
| canvas2d | 2000 | 1× | 23.1 | 61 | 83.4 | 23.1 | 93.0 / 101.9 | 70.9 / 74.1 | 100 | 5 |
| canvas2d-worker | 2000 | 1× | 44.2 | 36 | 33.4 | 50.0 | 35.8 / 69.8 | 14.1 / 55.8 | 51 | 5 |
| dom | 2000 | 1× | 12.4 | 100 | 116.7 | 12.4 | 102.6 / 147.6 | 53.5 / 99.0 | 91 | 5 |

For the Worker variant, "scene fps" is the Worker's own rAF cadence and move→frame is measured in the Worker (event timestamp → the Worker finished drawing the frame that used it); "main-thread fps" is the page's rAF. Measured at 1× only, because CDP throttling does not slow the Worker.

## Frames that reached the screen (compositor), with and without main-thread load

viz Display::DrawAndSwap events per second over a 3 s trace, after 1.5 s warm-up, with the harness rAF loop off (?idle), so only the page's own work runs; busy % = main-thread TaskDuration share; median of runs. load = 50 ms of main-thread busy work every 100 ms.

| variant | N | no load: presented fps | no load: main busy % | load 50/100 ms: presented fps |
| --- | --- | --- | --- | --- |
| dom | 200 | 36.8 | 0.1 | 45.2 |
| svg | 200 | 38.8 | 23.4 | 34.3 |
| canvas2d | 200 | 39.9 | 20.2 | 32.3 |
| canvas2d-worker | 200 | 50.5 | 0.1 | 53.4 |
| pixi | 200 | 8.6 | 99.7 | 7.4 |
| dom | 2000 | 7.4 | 0.0 | 5.8 |
| svg | 2000 | 11.0 | 97.1 | 9.1 |
| canvas2d | 2000 | 10.8 | 99.0 | 7.5 |
| canvas2d-worker | 2000 | 32.8 | 0.1 | 27.7 |
| pixi | 2000 | 2.6 | 99.9 | 1.6 |

## Compositor-driven CSS animations and the main thread (plain divs)

Plain 40px divs, one looping 1.6 s bob each; 2 s trace after 0.8 s; style recalcs per second, mean ms each, and total style ms per second (median of runs). "+ rAF loop" adds an empty requestAnimationFrame loop elsewhere on the page; "+ moving one element (drag)" moves one (non-animated) div from a 16 ms timer, as pointermove handlers do during a drag, with no rAF loop.

| mode | N | style recalcs / s | ms each | style ms per s | main busy % | runs: style ms per s |
| --- | --- | --- | --- | --- | --- | --- |
| css translate | 200 | 0.0 | 0.00 | 0 | 0.1 | 0, 0, 0, 0, 0 |
| css transform | 200 | 0.0 | 0.00 | 0 | 0.1 | 0, 0, 0, 0, 0 |
| waapi transform | 200 | 0.0 | 0.00 | 0 | 0.1 | 0, 0, 0, 0, 0 |
| css translate + rAF loop | 200 | 60.0 | 0.78 | 47 | 10.0 | 47, 47, 45, 48, 47 |
| css transform + rAF loop | 200 | 60.0 | 0.71 | 42 | 8.5 | 43, 42, 41, 45, 42 |
| waapi transform + rAF loop | 200 | 60.0 | 0.66 | 40 | 7.8 | 41, 39, 38, 40, 40 |
| no animation + rAF loop | 200 | 0.0 | 0.00 | 0 | 0.9 | 0, 0, 0, 0, 0 |
| css translate + moving one element (drag) | 200 | 60.0 | 0.87 | 52 | 13.7 | 51, 52, 55, 52, 53 |
| no animation + moving one element (drag) | 200 | 60.5 | 0.07 | 4 | 2.0 | 4, 4, 4, 4, 4 |
| css translate | 2000 | 0.5 | 11.57 | 6 | 1.4 | 6, 6, 6, 6, 6 |
| css transform | 2000 | 0.5 | 12.07 | 6 | 1.4 | 6, 5, 7, 6, 6 |
| waapi transform | 2000 | 0.5 | 10.50 | 5 | 1.2 | 4, 5, 6, 5, 5 |
| css translate + rAF loop | 2000 | 26.0 | 10.23 | 266 | 52.6 | 266, 248, 268, 270, 246 |
| css transform + rAF loop | 2000 | 26.5 | 10.38 | 273 | 48.3 | 275, 287, 273, 266, 268 |
| waapi transform + rAF loop | 2000 | 28.0 | 9.09 | 250 | 43.0 | 259, 242, 266, 250, 250 |
| no animation + rAF loop | 2000 | 0.0 | 0.00 | 0 | 0.9 | 0, 0, 0, 0, 0 |
| css translate + moving one element (drag) | 2000 | 25.0 | 9.26 | 243 | 60.7 | 241, 274, 243, 232, 248 |
| no animation + moving one element (drag) | 2000 | 60.0 | 0.16 | 10 | 3.7 | 10, 10, 9, 10, 9 |

## Accessibility

| variant | focusable by Tab | tab stops (N=20) | buttons in tree | first focus | keyboard pick/move/drop | tree (first lines) |
| --- | --- | --- | --- | --- | --- | --- |
| dom | no | 0 | 0 | — | — | `(empty)` |
| svg | no | 0 | 0 | — | — | `- img` |
| canvas2d | no | 0 | 0 | — | — | `(empty)` |
| canvas2d-worker | no | 0 | 0 | — | — | `(empty)` |
| pixi | no | 0 | 0 | — | — | `(empty)` |
| phaser | no | 0 | 0 | — | — | `(empty)` |
| three | no | 0 | 0 | — | — | `(empty)` |
| three-instanced | no | 0 | 0 | — | — | `(empty)` |
| r3f | no | 0 | 0 | — | — | `(empty)` |
| dom-a11y | yes | 1 | 20 | div[role=button] "Candle 20 of 20" | pass (moved 24,16, counter 1, live "Placed Candle 20 of 20.") | `- group "Decorations on the cake": /   - button "Candle 1 of 20"` |
| svg-a11y | yes | 1 | 20 | g[role=button] "Candle 20 of 20" | pass (moved 24,16, counter 1, live "Placed Candle 20 of 20.") | `- img: /   - group "Decorations on the cake":` |
| pixi-a11y | yes | 1 | 20 | button "Candle 20 of 20" | pass (moved 24,16, counter 1, live "Placed Candle 20 of 20.") | `- group "Decorations on the cake": /   - button "Candle 1 of 20"` |
| pixi-pixia11y | yes | 20 | 20 | button "Candle 1 of 20" | no: Enter selects true, arrows move false | `- button "Candle 1 of 20" / - button "Strawberry 2 of 20"` |

### Single-pointer alternative (tap to pick up, tap a spot to place; WCAG 2.5.7)

| variant | pass | landed vs target (px off) | counter | announced after 1st / 2nd tap |
| --- | --- | --- | --- | --- |
| dom-a11y | yes | 456,223 vs 456,223 (0) | 0 → 1 | "Picked up Candle 20 of 20. Tap where it should go, or tap it again to put it down." / "Placed Candle 20 of 20." |
| svg-a11y | yes | 456,223 vs 456,223 (0) | 0 → 1 | "Picked up Candle 20 of 20. Tap where it should go, or tap it again to put it down." / "Placed Candle 20 of 20." |
| pixi-a11y | yes | 456,223 vs 456,223 (0) | 0 → 1 | "Picked up Candle 20 of 20. Tap where it should go, or tap it again to put it down." / "Placed Candle 20 of 20." |

### Is the keyboard control still over the object after a mouse drag?

| variant | result | object after drag | control centre | drift px |
| --- | --- | --- | --- | --- |
| dom-a11y | n/a (the control is the object) | — | — | — |
| svg-a11y | n/a (the control is the object) | — | — | — |
| pixi-a11y | yes | 716,373 | 716,373 | 0.0 |
| pixi-a11y ?nosync (earlier bug) | NO | 716,373 | 616,313 | 116.6 |

### Where the focus ring is drawn (`shots/focus-ring.jpg`)

| variant | pass | focused element box | ring box | drawn by | ring centre off object px |
| --- | --- | --- | --- | --- | --- |
| dom-a11y | yes | 48×48 | 48×48 | CSS outline on the element box | 0 |
| svg-a11y | yes | 512×74 | 60×60 | explicit ring shape | 0 |
| svg-a11y ?outline | NO | 512×72 | 512×72 | CSS outline on the element box | 134 |
| pixi-a11y | yes | 48×48 | 48×48 | CSS outline on the element box | 0 |

In SVG, a `<use>` of a `<symbol>` whose viewBox crops a sprite atlas reports the whole atlas strip as its box, so a CSS outline (and anything else that reads the element box) frames the wrong area; the keyboard build draws an explicit ring shape instead.

First Tab into the stage: **svg-a11y** → <g role=button> "Candle 20 of 20" (ok); **svg-a11y ?focusonsvg** → <g role=group> "Decorations on the cake" (wrong stop). In Chromium an SVG element with a focus/focusin listener becomes a Tab stop, so the listener belongs on an HTML ancestor.

### Cost of the keyboard/screen-reader layer: DOM and SVG (1× CPU)

| variant | N | CPU | first frame ms | fps | missed % | JS ms/frame | renderer ms/frame | busy % | drag: move→frame p50/p95 | drag: style+layout ms per move | drag: main ms per move | DOM nodes | heap MB | app gzip KB | runs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dom | 200 | 1× | 42 | 60.0 | 0 | — | 3.8 | 15 | 14.6 / 18.7 | 3.16 | 8.1 | 646 | 2.0 | 3.0 | 5 |
| dom-a11y | 200 | 1× | 58 | 60.0 | 0 | — | 3.8 | 15 | 14.7 / 19.2 | 3.30 | 8.3 | 650 | 2.0 | 4.4 | 5 |
| svg | 200 | 1× | 53 | 60.0 | 0 | — | 9.5 | 21 | 13.8 / 19.8 | 2.76 | 9.8 | 1274 | 2.1 | 3.1 | 5 |
| svg-a11y | 200 | 1× | 48 | 60.0 | 0 | — | 9.7 | 22 | 13.8 / 19.7 | 3.02 | 10.4 | 1279 | 2.1 | 4.6 | 5 |
| dom | 2000 | 1× | 49 | 20.0 | 100 | — | 56.1 | 69 | 98.3 / 144.6 | 44.58 | 107.6 | 6046 | 2.2 | 3.0 | 5 |
| dom-a11y | 2000 | 1× | 70 | 20.1 | 100 | — | 57.5 | 70 | 94.7 / 129.0 | 43.35 | 105.0 | 6050 | 2.2 | 4.4 | 5 |
| svg | 2000 | 1× | 67 | 27.0 | 91 | — | 80.2 | 95 | 65.5 / 81.8 | 44.41 | 114.0 | 12074 | 2.2 | 3.1 | 5 |
| svg-a11y | 2000 | 1× | 73 | 26.6 | 94 | — | 80.8 | 95 | 63.6 / 82.5 | 42.37 | 109.5 | 12079 | 2.4 | 4.6 | 5 |

### Cost of the keyboard/screen-reader layer: PixiJS on WebGL (SwiftShader; read JS and renderer ms/frame only)

PixiJS's built-in AccessibilitySystem registers only for the WebGL and WebGPU renderers, so its cost can only be measured here. Frame rate, busy % and drag latency are SwiftShader-bound and say nothing about the layer.

| variant | N | CPU | first frame ms | fps | missed % | JS ms/frame | renderer ms/frame | busy % | drag: move→frame p50/p95 | drag: style+layout ms per move | drag: main ms per move | DOM nodes | heap MB | app gzip KB | runs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pixi | 2000 | 1× | 243 | 6.3 | 100 | 0.90 | 4.9 | 100 | 296.3 / 421.7 | 0.01 | 504.9 | 44 | 6.9 | 3.2 | 5 |
| pixi-a11y | 2000 | 1× | 263 | 6.0 | 100 | 0.90 | 5.5 | 100 | 315.8 / 413.4 | 0.43 | 519.3 | 2049 | 7.0 | 4.8 | 5 |
| pixi-pixia11y | 2000 | 1× | 269 | 5.6 | 100 | 5.30 | 32.7 | 100 | 354.1 / 540.5 | 42.50 | 607.4 | 2045 | 8.0 | 3.4 | 5 |

### Cost of the keyboard/screen-reader layer: PixiJS on its Canvas 2D renderer (WebGL disabled)

WebGL is disabled so PixiJS runs on its own Canvas 2D renderer at a measurable frame rate (under SwiftShader it ran at 2–3 fps, where frame time, busy % and drag latency cannot show a small cost). `?nosync` = the keyboard build without the per-move overlay sync (the earlier bug); `?lefttop` = the sync writing left/top instead of transform. `pixi-pixia11y` is inert here: PixiJS registers its AccessibilitySystem only for WebGL and WebGPU, so on its Canvas fallback no accessibility DOM exists (compare DOM nodes). "drag: style+layout ms per move" is main-thread style recalc + layout time while the pointer is down, divided by the 30 moves.

| variant | N | CPU | first frame ms | fps | missed % | JS ms/frame | renderer ms/frame | busy % | drag: move→frame p50/p95 | drag: style+layout ms per move | drag: main ms per move | DOM nodes | heap MB | app gzip KB | runs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pixi | 200 | 1× | 155 | 60.0 | 0 | 0.50 | 4.3 | 22 | 14.5 / 20.4 | 0.01 | 10.8 | 43 | 4.1 | 3.2 | 5 |
| pixi-a11y | 200 | 1× | 153 | 60.0 | 0 | 0.50 | 4.1 | 22 | 14.7 / 19.7 | 0.14 | 10.3 | 248 | 4.2 | 4.8 | 5 |
| pixi-pixia11y | 200 | 1× | 156 | 60.0 | 0 | 0.50 | 4.2 | 21 | 14.8 / 20.4 | 0.01 | 10.4 | 43 | 4.2 | 3.4 | 5 |
| pixi-a11y ?nosync | 200 | 1× | 152 | 60.0 | 0 | 0.50 | 4.2 | 22 | 14.7 / 20.0 | 0.01 | 10.8 | 248 | 4.2 | 4.8 | 5 |
| pixi-a11y ?lefttop | 200 | 1× | 160 | 60.0 | 0 | 0.50 | 4.1 | 21 | 14.5 / 20.0 | 0.30 | 11.1 | 248 | 4.2 | 4.8 | 5 |
| pixi | 2000 | 1× | 199 | 39.7 | 51 | 3.90 | 25.8 | 100 | 51.2 / 71.5 | 0.01 | 92.0 | 43 | 6.8 | 3.2 | 5 |
| pixi-a11y | 2000 | 1× | 226 | 40.3 | 49 | 3.80 | 25.8 | 100 | 55.1 / 63.6 | 0.38 | 92.9 | 2048 | 6.9 | 4.8 | 5 |
| pixi-pixia11y | 2000 | 1× | 226 | 39.9 | 51 | 3.90 | 25.6 | 100 | 51.6 / 64.1 | 0.01 | 91.6 | 43 | 7.1 | 3.4 | 5 |
| pixi-a11y ?nosync | 2000 | 1× | 206 | 39.9 | 50 | 3.80 | 26.0 | 100 | 52.5 / 61.8 | 0.01 | 91.8 | 2048 | 6.8 | 4.8 | 5 |
| pixi-a11y ?lefttop | 2000 | 1× | 205 | 41.3 | 45 | 3.60 | 25.1 | 100 | 54.6 / 66.4 | 1.64 | 98.2 | 2048 | 6.8 | 4.8 | 5 |
| pixi | 200 | 4× | 503 | 59.4 | 1 | 2.40 | 18.8 | 95 | 35.8 / 51.8 | 0.05 | 80.4 | 43 | 4.1 | 3.2 | 5 |
| pixi-a11y | 200 | 4× | 536 | 59.0 | 2 | 2.40 | 18.8 | 94 | 37.6 / 50.1 | 0.74 | 83.1 | 248 | 4.2 | 4.8 | 5 |
| pixi-pixia11y | 200 | 4× | 541 | 59.4 | 1 | 2.40 | 18.7 | 94 | 34.0 / 48.9 | 0.04 | 78.4 | 43 | 4.2 | 3.4 | 5 |
| pixi-a11y ?nosync | 200 | 4× | 527 | 59.6 | 1 | 2.40 | 18.6 | 94 | 35.2 / 50.8 | 0.03 | 80.3 | 248 | 4.2 | 4.8 | 5 |
| pixi-a11y ?lefttop | 200 | 4× | 516 | 59.0 | 2 | 2.40 | 18.8 | 93 | 37.9 / 52.7 | 1.44 | 82.9 | 248 | 4.2 | 4.8 | 5 |
| pixi | 2000 | 4× | 630 | 8.3 | 100 | 20.00 | 132.8 | 100 | 251.2 / 295.1 | 0.04 | 409.9 | 43 | 7.1 | 3.2 | 5 |
| pixi-a11y | 2000 | 4× | 703 | 8.2 | 100 | 20.40 | 132.7 | 100 | 272.6 / 333.2 | 1.76 | 437.2 | 2048 | 7.3 | 4.8 | 5 |
| pixi-pixia11y | 2000 | 4× | 654 | 7.9 | 100 | 20.65 | 139.7 | 100 | 253.0 / 298.8 | 0.05 | 413.6 | 43 | 7.5 | 3.4 | 5 |
| pixi-a11y ?nosync | 2000 | 4× | 709 | 8.2 | 100 | 20.40 | 134.5 | 100 | 256.0 / 294.4 | 0.04 | 412.7 | 2048 | 7.3 | 4.8 | 5 |
| pixi-a11y ?lefttop | 2000 | 4× | 707 | 8.1 | 100 | 20.10 | 135.2 | 100 | 269.6 / 307.6 | 7.15 | 432.9 | 2048 | 7.2 | 4.8 | 5 |

## prefers-reduced-motion: reduce, at rest (N=200, 1×; no harness rAF loop)

| variant | rAF calls in 5 s | busy % | renderer CPU % | GPU-proc CPU % | drag still works | runs |
| --- | --- | --- | --- | --- | --- | --- |
| dom | 0 | 0.0 | 0.0 | 0.0 | yes | 3 |
| svg | 0 | 0.0 | 0.0 | 0.0 | yes | 3 |
| canvas2d | 0 | 0.0 | 0.2 | 0.0 | yes | 3 |
| canvas2d-worker | 0 | 0.0 | 0.0 | 0.2 | yes | 3 |
| pixi | 300 | 1.2 | 2.8 | 1.0 | yes | 3 |
| phaser | 0 | 0.0 | 0.0 | 0.0 | yes | 3 |
| three | 0 | 0.0 | 0.0 | 0.0 | yes | 3 |
| three-instanced | 0 | 0.0 | 0.2 | 0.0 | yes | 3 |
| r3f | 0 | 0.0 | 0.0 | 0.0 | yes | 3 |
| pixi+Ticker.system.stop() | 0 | 0.0 | 0.0 | 0.0 | yes | 3 |

## WebGL disabled (--disable-webgl --disable-3d-apis)

| variant | renderer chosen | first frame | fps | drag works | errors |
| --- | --- | --- | --- | --- | --- |
| dom | dom | 33 ms | 60.0 | yes |  |
| svg | svg | 67 ms | 60.0 | yes |  |
| canvas2d | canvas2d | 47 ms | 60.0 | yes |  |
| canvas2d-worker | canvas2d-offscreen-worker | 66 ms | 60.0 | yes |  |
| pixi | pixi-canvas | 181 ms | 60.0 | yes |  |
| phaser | phaser-canvas | 157 ms | 60.0 | yes |  |
| three | none | none | — | no | THREE.WebGLRenderer: A WebGL context could not be created. Reason:  disabled by enterprise policy or commandline switch; THREE.WebGLRenderer |
| three-instanced | none | none | — | no | THREE.WebGLRenderer: A WebGL context could not be created. Reason:  disabled by enterprise policy or commandline switch; THREE.WebGLRenderer |
| r3f | — | none | — | no | THREE.WebGLRenderer: A WebGL context could not be created. Reason:  disabled by enterprise policy or commandline switch; THREE.WebGLRenderer |

## WebGL context loss and restore (N=200, animating)

WEBGL_lose_context.loseContext(), 500 ms, restoreContext(), 1.5 s; pixel difference of the stage vs just before the loss (the bob animation alone moves a few %); frames = scene JS frames counted in the 1 s after restore.

| variant | recovered | lost / restored events | scene frames in 1 s after | % px differ vs before | errors |
| --- | --- | --- | --- | --- | --- |
| pixi | yes | 1 / 1 | 35 | 6.98 |  |
| phaser | yes | 1 / 1 | 30 | 8.17 | WebGL Context lost. Renderer disabled; WebGL Context restored. Renderer running again. |
| three | yes | 1 / 1 | 29 | 7.89 |  |
| three-instanced | yes | 1 / 1 | 29 | 7.70 |  |
| r3f | yes | 1 / 1 | 30 | 7.93 | THREE.Clock: This module has been deprecated. Please use THREE.Timer instead. |

### Engines on their Canvas 2D fallback vs vanilla Canvas 2D (WebGL disabled, 1× CPU)

| variant | N | renderer | fps | frame p95 | JS ms/frame p50/p95 | renderer ms/frame | busy % | drag move→frame p50/p95 | heap MB | runs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| canvas2d | 200 | canvas2d | 60.0 | 16.8 | 0.30 / 0.40 | 4.3 | 22 | 14.4 / 19.3 | 1.9 | 3 |
| pixi | 200 | pixi-canvas | 60.0 | 16.8 | 0.60 / 0.80 | 4.8 | 24 | 13.9 / 20.5 | 4.1 | 3 |
| phaser | 200 | phaser-canvas | 60.0 | 16.7 | 0.50 / 0.90 | 5.0 | 27 | 14.2 / 20.2 | 5.5 | 3 |
| canvas2d | 2000 | canvas2d | 37.2 | 33.4 | 1.90 / 2.70 | 27.6 | 100 | 49.8 / 78.3 | 2.1 | 3 |
| pixi | 2000 | pixi-canvas | 38.7 | 33.4 | 4.10 / 4.70 | 26.6 | 100 | 51.2 / 61.8 | 6.8 | 3 |
| phaser | 2000 | phaser-canvas | 35.3 | 33.4 | 3.50 / 5.10 | 29.8 | 100 | 57.8 / 66.4 | 7.5 | 3 |

## Visual parity

Frozen pose (same time, selection, hover and particle burst in every variant); pixel difference vs canvas2d with pixelmatch threshold 0.1.

| variant | N=200 % px differ | N=2000 % px differ |
| --- | --- | --- |
| canvas2d | 0.00 | 0.00 |
| dom | 0.00 | 0.00 |
| svg | 0.00 | 0.00 |
| canvas2d-worker | 0.00 | 0.00 |
| pixi | 0.00 | 0.00 |
| phaser | 0.00 | 0.00 |
| three | 0.02 | 0.02 |
| three-instanced | 0.02 | 0.02 |
| r3f | 0.02 | 0.02 |
| r3f-instanced | 0.02 | 0.02 |

Sheets: `shots/scene-n200.jpg`, `shots/scene-n2000.jpg`, `shots/no-webgl.jpg`, `shots/context-loss.jpg`.

## Engine survey: hello-world payload and boot (not built as the scene)

esbuild 0.28.2, minified ESM with code splitting, NODE_ENV=production; 'initial' = entry + statically imported chunks, 'all' = every chunk incl. dynamic import(); boot = navigation start → first frame the hello world rendered, 4× CPU throttle, median of 5 cold loads (no cache), Chromium headless with SwiftShader WebGL.

| entry | kind | initial gzip KB | all chunks gzip KB | fetched at boot gzip KB | WASM | boot to first frame (4× CPU) ms | renderer | licence (package.json · file) | latest (published) | React binding |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| react-baseline (+React) | baseline | 67.3 | 67.3 | 67.3 | — | 244 | react-only | react: MIT; react-dom: MIT | 19.3.0 (2026-09-09); 19.3.0 (2026-09-09) | — |
| pixi | 2D WebGL/WebGPU renderer | 162.2 | 162.8 | 169.0 | — | 680 | webgl | pixi.js: MIT | 8.21.0 (2026-09-17) | @pixi/react |
| pixi-react (+React) | React binding | 270.2 | 271.0 | 277.1 | — | 839 | webgl | @pixi/react: MIT; pixi.js: MIT | 8.0.5 (2025-12-01); 8.21.0 (2026-09-17) | — |
| phaser | 2D game framework | 361.5 | 361.5 | 361.5 | — | 726 | webgl | phaser: MIT | 4.2.1 (2026-07-09) | none official (the official React template bridges with an EventBus) |
| three | 3D WebGL/WebGPU library | 130.6 | 130.6 | 130.6 | — | 242 | webgl2 | three: MIT | 0.186.1 (2026-09-24) | @react-three/fiber |
| r3f (+React) | React renderer for three | 309.8 | 309.8 | 309.8 | — | 622 | webgl2 | @react-three/fiber: MIT (no file); three: MIT | 9.8.1 (2026-09-24); 0.186.1 (2026-09-24) | — |
| r3f-createroot (+React) | R3F createRoot + extend (no <Canvas>) | 188.6 | 188.6 | 188.6 | — | 415 | webgl2 | @react-three/fiber: MIT (no file); three: MIT | 9.8.1 (2026-09-24); 0.186.1 (2026-09-24) | — |
| babylon | 3D engine | 24.7 | 333.7 | 270.9 | — | 521 | webgl2 | @babylonjs/core: Apache-2.0 | 9.28.0 (2026-09-24) | react-babylonjs (community) |
| playcanvas | 3D engine (+ hosted editor) | 493.0 | 493.0 | 493.0 | — | 561 | webgl2 | playcanvas: MIT | 2.22.6 (2026-09-28) | @playcanvas/react |
| playcanvas-react (+React) | React binding | 592.8 | 592.8 | 592.8 | — | 1033 | webgl | @playcanvas/react: MIT; playcanvas: MIT | 0.11.7 (2026-09-25); 2.22.6 (2026-09-28) | — |
| ogl | minimal WebGL | 15.1 | 15.1 | 15.1 | — | 180 | webgl | ogl: Unlicense (no file) | 1.0.11 (2025-01-27) | none (react-ogl, community) |
| konva | 2D canvas scene graph (core + Image) | 33.2 | 33.2 | 33.2 | — | 187 | canvas2d | konva: MIT | 10.7.0 (2026-09-23) | react-konva |
| konva-full | 2D canvas scene graph (full import) | 56.5 | 56.5 | 56.5 | — | 201 | canvas2d | konva: MIT | 10.7.0 (2026-09-23) | — |
| react-konva (+React) | React binding | 166.9 | 166.9 | 166.9 | — | 602 | canvas2d | react-konva: MIT; konva: MIT | 19.3.0 (2026-09-15); 10.7.0 (2026-09-23) | — |
| fabric | 2D canvas object editor | 86.2 | 86.2 | 86.2 | — | 205 | canvas2d | fabric: MIT | 7.4.0 (2026-05-18) | none (imperative in an effect) |
| two | 2D drawing (SVG/Canvas/WebGL back ends) | 49.5 | 49.5 | 49.5 | — | 189 | canvas2d | two.js: MIT | 0.8.24 (2026-08-29) | none (react-two.js, community) |
| p5 | creative-coding sketchbook | 413.3 | 413.3 | 413.3 | — | 2903 | p5-2d | p5: LGPL-2.1 (no file) | 2.3.4 (2026-09-25) | none (instance mode in an effect) |
| excalibur | 2D game engine (TypeScript) | 122.5 | 122.5 | 122.5 | — | 2120 | webgl | excalibur: BSD-2-Clause | 0.32.0 (2025-12-23) | none |
| kaplay | 2D game library (Kaboom successor) | 68.2 | 68.2 | 68.2 | — | 896 | webgl | kaplay: MIT | 3001.0.19 (2025-06-15) | none |
| kaboom | 2D game library (superseded by KAPLAY) | 50.9 | 50.9 | 50.9 | — | 888 | webgl | kaboom: MIT | 3000.1.17 (2023-11-13) DEPRECATED | none |
| litecanvas | tiny 2D canvas game loop | 6.0 | 6.0 | 6.0 | — | 105 | canvas2d | litecanvas: MIT | 0.302.0 (2026-06-16) | none |
| littlejs | tiny 2D game engine | 24.6 | 24.6 | 24.6 | — | 244 | webgl | littlejsengine: MIT | 1.20.0 (2026-09-29) | none |
| melonjs | 2D game engine | 244.4 | 244.4 | 244.4 | — | 518 | WebGL2 | melonjs: MIT (no file) | 20.7.0 (2026-09-22) | none |
| matter | 2D physics (add-on) | 26.4 | 26.4 | 26.4 | — | 83 | physics-only | matter-js: MIT | 0.20.0 (2024-06-23) | — |
| rapier2d | 2D physics, WASM inlined as base64 (add-on) | 1251.2 | 1251.2 | 1251.2 | — | 538 | physics-only | @dimforge/rapier2d-compat: Apache-2.0 | 0.21.0 (2026-09-25) | @react-three/rapier (3D) |
| rive | vector animation runtime (JS only; WASM separate) | 56.0 | 56.0 | 56.0 | — | 146 | js-only | @rive-app/canvas: MIT (no file) | 2.43.1 (2026-09-23) | @rive-app/react-canvas |

### Engines that are not npm packages (published figures; tags as in the stream report)

| engine | minimum web payload | licence | React interop | latest | mobile notes | sources |
| --- | --- | --- | --- | --- | --- | --- |
| Godot 4 (web export) | 6.33 MB compressed for a small 3D+physics test project on 4.6.2 (5.34 MB on 4.3); the 4.3 wasm alone is ~40 MB raw / ~5 MB brotli; custom size-optimised export templates cut it much further [V repo README / S blog] | MIT [V LICENSE.txt] | none: an iframe or a <canvas> the engine owns; talk through JavaScriptBridge / postMessage | 4.6.x (demo builds 2026) [V repo] | runs in mobile browsers with caveats; WebGL 2 Compatibility renderer only (no Forward+/Mobile); C# projects cannot export to the web in Godot 4; since 4.3 a single-threaded export avoids the COOP/COEP (SharedArrayBuffer) requirement [V godot-docs exporting_for_web.rst]; screen-reader support (AccessKit, 4.5) is documented for desktop, not for the web [S] | github.com/JohannesDeml/Godot-Web-LoadingTest README (cloned 2026-09-28); godotengine/godot-docs tutorials/export/exporting_for_web.rst; godotengine.org/article/progress-report-web-export-in-4-3; godotengine.org/releases/4.5 |
| Unity 6 (Web platform) | 3.76 MB brotli for a small test scene on 6000.6 built-in pipeline, WebGL2 (3.29 MB 'min size' settings); URP adds ~2.5 MB (5.6–8.8 MB) [V repo README] | proprietary; Unity Personal free under US$200k revenue/funding, Runtime Fee cancelled (2024-09), splash screen optional in Unity 6 [S] | none official: an iframe or a <canvas> the Unity loader owns; community react-unity-webgl wraps the loader; messaging via SendMessage / jslib | 6000.6 (demo builds 2026-09) [V repo] | Unity 6 supports mobile browsers (WebGL2); performance well below native; brotli needs correct Content-Encoding on the host; screen-reader API covers Android, iOS, Windows, macOS — the Web is not listed [S] | github.com/JohannesDeml/UnityWebGL-LoadingTest README (cloned 2026-09-28); unity.com/blog/unity-is-canceling-the-runtime-fee; docs.unity3d.com Accessibility module |
| Defold | 1.02 MB for a complete empty HTML5 bundle (zip of wasm engine + loader + game archive) on 1.13.1; 1.22 MB on 1.13.2-beta [V defold/build-size bundle_report.csv] | Defold License 1.0 (Apache-2.0 plus a clause against selling the engine itself; games are free to sell; not OSI) [V LICENSE.txt, S defold.com/license] | none: an iframe or a canvas the engine owns; JS bridge via extensions | 1.13.x (build-size data updated 2026-09-28) [V] | designed for mobile first; smallest of the full engines on the web [V size] | github.com/defold/build-size (cloned 2026-09-28); raw.githubusercontent.com/defold/defold/dev/LICENSE.txt |
| PlayCanvas (engine + hosted editor) | measured here: see the playcanvas row (engine hello world, full engine; does not tree-shake to a small core) | engine MIT [V package]; the editor is a hosted service with paid plans for private projects [K] | @playcanvas/react (0.x) [V registry] | see survey rows [V registry] | engine built for mobile web; WebGPU and WebGL2 back ends [K] | npm registry; node_modules/playcanvas/package.json |
| Needle Engine (three.js + Unity/Blender export) | not measured: npm package @needle-tools/engine 6.0.0-alpha.3 unpacks to 92 MB and depends on three, three.quarks, peerjs, n8ao, flatbuffers [V registry]; ships a three.js runtime plus components, so expect more than three.js's 130 KB gzip | no licence field in package.json [V registry]; commercial use needs a paid Pro licence (from EUR 49 per user per month), Hobby is free for personal use [S needle.tools/pricing, engine.needle.tools FAQ] | none official; it is a web component / three.js scene you can drive from any framework [S engine.needle.tools/docs/three] | 6.0.0-alpha.3 (2026-08-13) on the latest tag [V registry] | web-first, WebXR [S] | registry.npmjs.org/@needle-tools/engine; needle.tools/pricing; engine.needle.tools/docs/reference/faq.html |
| Cocos Creator (web-mobile build) | ~1.8 MB for an empty project (2021 forum report, Creator 3.x) [S forum.cocosengine.org/t/cocos-creator-3-build-size/53154]; not re-measured | engine MIT [V cocos/cocos-engine LICENSE.md, HEAD 2026-09-21]; the Cocos Creator editor is a separate free download [K] | none: an engine-owned canvas | engine repo active (last commit 2026-09-21) [V git clone]; Creator 3.8.x docs [S] | built for mobile web and mini-games [K] | forum.cocosengine.org; docs.cocos.com/creator/3.8/manual/en/editor/publish/publish-web.html; github.com/cocos/cocos-engine (cloned 2026-09-29) |
| Rive (as a scene engine) | @rive-app/canvas JS 56 KB gzip [L survey] + WASM 787 KB gzip (stream F); one artboard with state machines, data binding and, since 2026-01, Luau scripting for game-like logic [S rive.app/blog/scripting-is-live-in-rive] | runtime MIT [V package]; the editor is a paid plan for export [S, stream F] | @rive-app/react-canvas | 2.43.1 (2026-09-23) [V registry] | native runtimes too; designer-authored, not N dynamic data-driven objects | npm registry; rive.app blog |
