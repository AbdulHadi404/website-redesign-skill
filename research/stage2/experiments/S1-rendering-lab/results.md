# S1 rendering lab — results

Generated 2026-09-29T03:21 · Chromium 141.0.7390.37 headless · 4 × Intel(R) Xeon(R) Processor @ 2.10GHz (shared) · WebGL: ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)

**Every GPU-bound number here is CPU-emulated.** WebGL runs on SwiftShader and the display compositor runs in software (`SoftwareRenderer`), so frame rates of the WebGL variants — and, less so, of DOM/SVG compositing — are pessimistic and comparable only with each other. `JS ms/frame` (the scene's own update + render call) and `renderer ms/frame` (renderer-process CPU per displayed frame) are the GPU-independent columns. `busy %` (CDP TaskDuration) counts a main thread blocked waiting for the emulated GPU as busy, so it overstates WebGL main-thread load.

Fresh browser context per run; viewport 860×720 at DPR 1; stage 800×600. Warm-up 1 s after the first frame, then a 5 s window (rAF deltas, CDP Performance.getMetrics TaskDuration, SystemInfo.getProcessInfo CPU per process type), then a scripted drag of the top item (30 pointer moves 16 ms apart) while everything animates, then heap after GC. CPU throttle with Emulation.setCPUThrottlingRate (renderer main thread). Medians across runs.

## Production bundles (esbuild, minified; KB)

| variant | total min | total gzip | total br | runtime min | app min | app gzip | JS fetched at run time (gzip, per file) | chunks |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dom | 6.6 | 3.0 | 2.7 | 0.0 | 6.6 | 3.0 | 3.0 | 1 |
| svg | 6.5 | 3.0 | 2.7 | 0.0 | 6.5 | 3.0 | 3.0 | 1 |
| canvas2d | 6.2 | 2.9 | 2.6 | 0.0 | 6.2 | 2.9 | 2.9 | 1 |
| canvas2d-worker | 3.6 | 1.7 | 1.5 | 0.0 | 3.6 | 1.7 | 3.7 | 2 |
| pixi | 562.0 | 165.5 | 136.5 | 547.6 | 6.9 | 3.2 | 171.6 | 23 |
| phaser | 1362.9 | 364.1 | 291.7 | 1356.0 | 6.9 | 3.0 | 364.1 | 1 |
| three | 527.1 | 133.8 | 110.6 | 519.2 | 7.8 | 3.6 | 133.8 | 1 |
| three-instanced | 530.6 | 134.8 | 111.2 | 522.3 | 8.3 | 3.9 | 134.8 | 1 |
| r3f | 1126.3 | 312.7 | 250.7 | 1118.4 | 7.2 | 3.5 | 312.7 | 1 |
| dom-a11y | 9.6 | 4.1 | 3.7 | 0.0 | 9.5 | 4.1 | 4.1 | 1 |
| svg-a11y | 9.5 | 4.2 | 3.8 | 0.0 | 9.5 | 4.2 | 4.2 | 1 |
| pixi-a11y | 564.8 | 166.6 | 137.7 | 547.6 | 9.8 | 4.4 | 172.9 | 23 |
| pixi-pixia11y | 563.7 | 165.7 | 136.9 | 547.4 | 7.3 | 3.3 | 173.7 | 28 |
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

### N=20, 4× CPU

| variant | renderer | first frame ms | fps | frame p50/p95 ms | JS ms/frame p50/p95 | renderer ms/frame | GPU-proc CPU % | busy % | drag move→frame p50/p95 ms | Event Timing max ms | heap MB | DOM nodes | draw calls | runs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dom | dom | 125 | 59.8 | 16.7 / 16.8 | — / — | 12.2 | 5 | 15 | 13.1 / 22.1 | 56 | 2.0 | 106 | — | 5 |
| svg | svg | 116 | 59.4 | 16.7 / 16.8 | — / — | 13.6 | 3 | 17 | 12.4 / 20.4 | 40 | 2.0 | 194 | — | 5 |
| canvas2d | canvas2d | 165 | 59.0 | 16.7 / 16.8 | 0.10 / 0.70 | 12.9 | 5 | 30 | 13.1 / 33.0 | 40 | 1.9 | 44 | — | 5 |
| canvas2d-worker | canvas2d-offscreen-worker | 193 | 59.6 | 16.7 / 16.7 | 0.10 / 0.20 | 12.8 | 6 | 3 | 25.7 / 31.3 | 16 | 1.8 | 42 | — | 5 |
| pixi | pixi-webgl | 716 | 21.1 | 49.9 / 83.4 | 0.80 / 3.30 | 25.9 | 118 | 99 | 90.0 / 202.2 | 88 | 3.9 | 44 | — | 5 |
| phaser | phaser-webgl | 797 | 19.5 | 50.0 / 100.0 | 0.90 / 3.60 | 27.3 | 98 | 99 | 90.2 / 176.0 | 104 | 5.5 | 49 | — | 5 |
| three | three-webgl2 | 446 | 20.9 | 50.0 / 83.4 | 1.00 / 3.90 | 29.6 | 130 | 99 | 91.4 / 227.2 | 120 | 3.8 | 44 | 21 | 5 |
| three-instanced | three-instanced-webgl2 | 390 | 16.7 | 50.0 / 116.6 | 0.90 / 4.30 | 30.6 | 100 | 98 | 80.9 / 165.5 | 144 | 3.7 | 44 | 2 | 5 |
| r3f | r3f-webgl2 | 1064 | 23.3 | 33.4 / 83.4 | 1.00 / 4.10 | 27.4 | 136 | 99 | 77.2 / 149.9 | 144 | 5.7 | 48 | — | 5 |

### N=200, 4× CPU

| variant | renderer | first frame ms | fps | frame p50/p95 ms | JS ms/frame p50/p95 | renderer ms/frame | GPU-proc CPU % | busy % | drag move→frame p50/p95 ms | Event Timing max ms | heap MB | DOM nodes | draw calls | runs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dom | dom | 135 | 53.6 | 16.7 / 33.3 | — / — | 14.1 | 19 | 65 | 28.3 / 85.4 | 104 | 2.0 | 646 | — | 5 |
| svg | svg | 197 | 47.2 | 16.7 / 49.9 | — / — | 18.0 | 3 | 71 | 21.8 / 63.8 | 56 | 2.1 | 1274 | — | 5 |
| canvas2d | canvas2d | 211 | 55.6 | 16.7 / 33.3 | 0.70 / 3.30 | 15.1 | 5 | 75 | 25.1 / 85.6 | 32 | 1.9 | 44 | — | 5 |
| canvas2d-worker | canvas2d-offscreen-worker | 221 | 58.8 | 16.7 / 16.8 | 0.30 / 1.00 | 13.5 | 5 | 4 | 25.4 / 33.2 | 0 | 1.8 | 42 | — | 5 |
| pixi | pixi-webgl | 880 | 11.3 | 83.4 / 183.3 | 1.00 / 3.40 | 46.1 | 106 | 99 | 162.8 / 313.2 | 192 | 4.2 | 44 | — | 5 |
| phaser | phaser-webgl | 847 | 10.0 | 83.4 / 233.3 | 1.20 / 4.70 | 51.0 | 104 | 99 | 213.9 / 465.2 | 296 | 5.8 | 49 | — | 5 |
| three | three-webgl2 | 388 | 9.3 | 100.0 / 233.4 | 2.45 / 7.50 | 62.5 | 107 | 99 | 196.3 / 488.3 | 256 | 4.1 | 44 | 201 | 5 |
| three-instanced | three-instanced-webgl2 | 369 | 10.2 | 83.3 / 233.4 | 1.10 / 3.70 | 58.8 | 113 | 100 | 180.4 / 358.0 | 256 | 3.7 | 44 | 2 | 5 |
| r3f | r3f-webgl2 | 1124 | 11.4 | 83.3 / 166.7 | 2.90 / 7.40 | 51.9 | 129 | 99 | 163.7 / 389.4 | 184 | 6.6 | 48 | — | 5 |

### N=2000, 4× CPU

| variant | renderer | first frame ms | fps | frame p50/p95 ms | JS ms/frame p50/p95 | renderer ms/frame | GPU-proc CPU % | busy % | drag move→frame p50/p95 ms | Event Timing max ms | heap MB | DOM nodes | draw calls | runs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dom | dom | 226 | 3.3 | 258.3 / 699.9 | — / — | 247.6 | 41 | 83 | 447.3 / 1035.5 | 584 | 2.2 | 6074 | — | 5 |
| svg | svg | 318 | 7.0 | 133.4 / 233.4 | — / — | 161.3 | 1 | 99 | 303.2 / 661.2 | 528 | 2.3 | 12074 | — | 5 |
| canvas2d | canvas2d | 195 | 9.3 | 100.0 / 183.3 | 7.60 / 14.70 | 89.6 | 2 | 99 | 205.3 / 315.7 | 232 | 2.1 | 44 | — | 5 |
| canvas2d-worker | canvas2d-offscreen-worker | 286 | 19.9 | 33.4 / 116.7 | 2.40 / 10.20 | 42.4 | 3 | 5 | 33.2 / 92.1 | 16 | 1.8 | 42 | — | 5 |
| pixi | pixi-webgl | 953 | 1.8 | 466.7 / 899.9 | 3.95 / 9.60 | 257.2 | 89 | 100 | 1144.1 / 2469.4 | 688 | 6.9 | 44 | — | 5 |
| phaser | phaser-webgl | 862 | 1.5 | 616.7 / 1249.9 | 6.25 / 14.30 | 368.3 | 105 | 100 | 1318.1 / 2097.6 | 1168 | 8.6 | 49 | — | 5 |
| three | three-webgl2 | 478 | 1.9 | 525.1 / 799.9 | 18.15 / 33.50 | 349.0 | 126 | 100 | 1283.3 / 2062.8 | 1360 | 6.9 | 44 | 2001 | 5 |
| three-instanced | three-instanced-webgl2 | 369 | 1.6 | 641.7 / 1050.0 | 2.05 / 4.90 | 397.5 | 95 | 100 | 1118.2 / 1645.5 | 816 | 3.9 | 44 | 2 | 5 |
| r3f | r3f-webgl2 | 2506 | 1.4 | 616.7 / 1149.9 | 18.20 / 39.40 | 407.1 | 88 | 100 | 1240.4 / 2046.6 | 1456 | 14.3 | 48 | — | 5 |

## Where the CPU renderers stop holding the frame rate (object-count sweep)

Same scene and method as the main matrix, measured as its own round-robin set (so N = 200 and 2000 repeat the main matrix under this run's background load). Each cell: fps · frame p95 ms · main-thread busy % (for the Worker variant, fps is the Worker's and busy % is the page's main thread). The CPU renderers' raster and compositing run in software here, so absolute fps is pessimistic; use the crossover points relative to each other.

### 1× CPU

| variant | N=200 | N=400 | N=700 | N=1000 | N=1400 | N=2000 |
| --- | --- | --- | --- | --- | --- | --- |
| dom | 58.8 · 17 · 20% | 57.0 · 17 · 39% | 42.7 · 50 · 69% | 16.0 · 133 · 67% | 9.6 · 250 · 72% | 7.6 · 250 · 74% |
| svg | 51.8 · 33 · 26% | 55.4 · 33 · 37% | 45.3 · 50 · 78% | 29.9 · 83 · 95% | 18.8 · 117 · 97% | 14.5 · 167 · 96% |
| canvas2d | 57.5 · 17 · 22% | 59.6 · 17 · 38% | 58.4 · 17 · 56% | 55.6 · 17 · 77% | 53.6 · 17 · 96% | 34.7 · 50 · 99% |
| canvas2d-worker | 57.4 · 17 · 1% | 59.0 · 17 · 1% | 58.6 · 17 · 2% | 55.2 · 33 · 1% | 50.2 · 33 · 1% | 38.6 · 33 · 1% |

### 4× CPU

| variant | N=200 | N=400 | N=700 | N=1000 | N=1400 | N=2000 |
| --- | --- | --- | --- | --- | --- | --- |
| dom | 49.0 · 33 · 70% | 26.3 · 83 · 90% | 12.1 · 167 · 84% | 7.0 · 383 · 85% | 4.2 · 417 · 80% | 3.3 · 867 · 81% |
| svg | 49.0 · 33 · 70% | 39.3 · 50 · 84% | 21.3 · 83 · 96% | 13.5 · 167 · 98% | 8.4 · 217 · 99% | 6.2 · 283 · 100% |
| canvas2d | 50.8 · 33 · 76% | 42.3 · 33 · 91% | 31.0 · 50 · 98% | 20.0 · 83 · 99% | 15.3 · 100 · 99% | 10.9 · 150 · 100% |
| canvas2d-worker | 56.4 · 17 · 8% | 52.0 · 33 · 7% | 51.0 · 33 · 8% | 37.6 · 50 · 9% | 36.7 · 50 · 5% | 26.9 · 83 · 7% |

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

## Main thread under load (50 ms busy every 100 ms): Canvas 2D on the main thread vs in a Worker

| variant | N | CPU | scene fps | scene frame p95 | main-thread fps | drag move→frame p50/p95 ms | move event delay p50/p95 ms | busy % | runs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| canvas2d | 200 | 1× | 47.0 | 33.4 | 47.0 | 16.4 / 68.6 | 12.1 / 57.1 | 67 | 5 |
| canvas2d-worker | 200 | 1× | 59.0 | 16.8 | 49.4 | 26.0 / 63.4 | 10.6 / 60.2 | 52 | 5 |
| pixi | 200 | 1× | 10.1 | 166.6 | 10.1 | 183.2 / 273.4 | 91.8 / 162.9 | 100 | 5 |
| dom | 200 | 1× | 42.8 | 50.0 | 42.8 | 15.9 / 71.5 | 10.8 / 58.4 | 68 | 5 |
| canvas2d | 2000 | 1× | 17.3 | 100.0 | 17.3 | 97.1 / 165.6 | 70.1 / 85.0 | 100 | 5 |
| canvas2d-worker | 2000 | 1× | 33.4 | 50.1 | 47.6 | 42.7 / 90.5 | 14.4 / 63.9 | 53 | 5 |
| pixi | 2000 | 1× | 4.2 | 433.3 | 4.2 | 454.9 / 1026.9 | 233.7 / 567.0 | 100 | 5 |
| dom | 2000 | 1× | 8.3 | 200.0 | 8.3 | 182.1 / 425.7 | 85.6 / 213.9 | 96 | 5 |
| canvas2d | 200 | 4× | 37.9 | 50.1 | 37.9 | 50.5 / 121.1 | 13.6 / 63.0 | 96 | 5 |
| canvas2d-worker | 200 | 4× | 60.0 | 16.8 | 49.8 | 24.9 / 60.0 | 9.8 / 50.0 | 53 | 5 |
| pixi | 200 | 4× | 10.2 | 133.4 | 10.2 | 186.3 / 262.3 | 95.8 / 137.1 | 100 | 5 |
| dom | 200 | 4× | 38.8 | 50.1 | 38.8 | 32.5 / 95.4 | 13.5 / 66.5 | 89 | 5 |
| canvas2d | 2000 | 4× | 7.5 | 183.3 | 7.5 | 254.1 / 330.4 | 128.0 / 172.7 | 100 | 5 |
| canvas2d-worker | 2000 | 4× | 37.5 | 33.4 | 48.5 | 34.7 / 82.5 | 10.2 / 60.5 | 53 | 5 |
| pixi | 2000 | 4× | 2.5 | 700.0 | 2.5 | 706.5 / 1069.5 | 345.8 / 590.3 | 100 | 5 |
| dom | 2000 | 4× | 4.2 | 316.7 | 4.2 | 370.8 / 611.6 | 98.3 / 329.3 | 99 | 5 |

For the Worker variant, "scene fps" is the Worker's own rAF cadence and move→frame is measured in the Worker (event timestamp → the Worker finished drawing the frame that used it); "main-thread fps" is the page's rAF.

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

Plain 40px divs, one looping 1.6 s bob each; 2 s trace after 0.8 s; style recalcs per second and mean ms each (median of runs). "+ rAF loop" adds an empty requestAnimationFrame loop elsewhere on the page; "+ moving one element (drag)" moves one (non-animated) div from a 16 ms timer, as pointermove handlers do during a drag, with no rAF loop.

| mode | N | style recalcs / s | ms each | main busy % |
| --- | --- | --- | --- | --- |
| css translate | 200 | 0.0 | 0.00 | 0.3 |
| css transform | 200 | 0.0 | 0.00 | 0.1 |
| waapi transform | 200 | 0.0 | 0.00 | 0.1 |
| css translate + rAF loop | 200 | 59.0 | 0.75 | 14.7 |
| css transform + rAF loop | 200 | 60.0 | 0.78 | 10.9 |
| waapi transform + rAF loop | 200 | 60.0 | 0.86 | 13.6 |
| no animation + rAF loop | 200 | 0.0 | 0.00 | 0.8 |
| css translate + moving one element (drag) | 200 | 53.5 | 1.17 | 19.1 |
| no animation + moving one element (drag) | 200 | 56.0 | 0.09 | 2.8 |
| css translate | 2000 | 0.0 | 0.00 | 4.2 |
| css transform | 2000 | 0.5 | 10.95 | 1.1 |
| waapi transform | 2000 | 0.0 | 0.00 | 0.3 |
| css translate + rAF loop | 2000 | 13.5 | 24.90 | 62.3 |
| css transform + rAF loop | 2000 | 13.0 | 23.45 | 55.1 |
| waapi transform + rAF loop | 2000 | 15.5 | 19.63 | 49.0 |
| no animation + rAF loop | 2000 | 0.0 | 0.00 | 0.8 |
| css translate + moving one element (drag) | 2000 | 10.0 | 28.58 | 69.3 |
| no animation + moving one element (drag) | 2000 | 56.5 | 0.17 | 5.7 |

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

### Cost of the keyboard/screen-reader layer (1× CPU)

| variant | N | first frame ms | fps | frame p95 | JS ms/frame | renderer ms/frame | busy % | drag move→frame p50/p95 | DOM nodes | heap MB | app gzip KB |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dom | 200 | 65 | 60.0 | 16.7 | — | 3.6 | 16 | 13.9 / 18.9 | 646 | 2.0 | 3.0 |
| dom-a11y | 200 | 55 | 60.0 | 16.8 | — | 3.7 | 15 | 14.7 / 19.9 | 650 | 2.0 | 4.1 |
| svg | 200 | 46 | 60.0 | 16.7 | — | 7.8 | 18 | 14.2 / 19.5 | 1274 | 2.1 | 3.0 |
| svg-a11y | 200 | 65 | 60.0 | 16.8 | — | 7.8 | 19 | 13.3 / 19.1 | 1276 | 2.1 | 4.2 |
| pixi | 200 | 246 | 24.8 | 66.8 | 0.30 | 2.0 | 100 | 90.0 / 130.1 | 44 | 4.3 | 3.2 |
| pixi-a11y | 200 | 286 | 23.3 | 83.3 | 0.20 | 1.9 | 100 | 87.6 / 154.0 | 249 | 4.3 | 4.4 |
| pixi-pixia11y | 200 | 258 | 24.0 | 66.7 | 0.70 | 4.8 | 100 | 88.9 / 142.8 | 245 | 4.4 | 3.3 |
| dom | 2000 | 95 | 6.7 | 383.3 | — | 78.8 | 72 | 227.3 / 504.8 | 6046 | 2.2 | 3.0 |
| dom-a11y | 2000 | 85 | 5.8 | 333.4 | — | 84.7 | 71 | 231.5 / 400.5 | 6050 | 2.2 | 4.1 |
| svg | 2000 | 107 | 12.5 | 183.3 | — | 65.4 | 98 | 89.6 / 225.6 | 12074 | 2.3 | 3.0 |
| svg-a11y | 2000 | 92 | 16.2 | 133.3 | — | 66.5 | 97 | 83.7 / 223.1 | 12076 | 2.4 | 4.2 |
| pixi | 2000 | 357 | 2.8 | 483.3 | 0.90 | 5.0 | 100 | 800.9 / 1270.7 | 44 | 6.9 | 3.2 |
| pixi-a11y | 2000 | 396 | 2.3 | 566.5 | 0.90 | 5.8 | 100 | 784.1 / 1156.0 | 2049 | 7.0 | 4.4 |
| pixi-pixia11y | 2000 | 415 | 2.4 | 600.0 | 7.20 | 31.8 | 100 | 888.7 / 1195.4 | 2045 | 8.0 | 3.3 |

## prefers-reduced-motion: reduce, at rest (N=200, 1×; no harness rAF loop)

| variant | rAF calls in 5 s | busy % | renderer CPU % | GPU-proc CPU % | drag still works | runs |
| --- | --- | --- | --- | --- | --- | --- |
| dom | 0 | 0.0 | 0.0 | 0.0 | yes | 3 |
| svg | 0 | 0.0 | 0.0 | 0.0 | yes | 3 |
| canvas2d | 0 | 0.0 | 0.0 | 0.0 | yes | 3 |
| canvas2d-worker | 0 | 0.0 | 0.0 | 0.0 | yes | 3 |
| pixi | 300 | 0.9 | 1.2 | 0.6 | yes | 3 |
| phaser | 0 | 0.0 | 0.0 | 0.0 | yes | 3 |
| three | 0 | 0.0 | 0.0 | 0.0 | yes | 3 |
| three-instanced | 0 | 0.0 | 0.0 | 0.0 | yes | 3 |
| r3f | 0 | 0.0 | 0.0 | 0.0 | yes | 3 |
| pixi+Ticker.system.stop() | 0 | 0.0 | 0.0 | 0.0 | yes | 3 |

## WebGL disabled (--disable-webgl --disable-3d-apis)

| variant | renderer chosen | first frame | fps | drag works | errors |
| --- | --- | --- | --- | --- | --- |
| dom | dom | 222 ms | 59.5 | yes |  |
| svg | svg | 358 ms | 59.5 | yes |  |
| canvas2d | canvas2d | 78 ms | 60.0 | yes |  |
| canvas2d-worker | canvas2d-offscreen-worker | 289 ms | 60.0 | yes |  |
| pixi | pixi-canvas | 346 ms | 60.0 | yes |  |
| phaser | phaser-canvas | 176 ms | 60.0 | yes |  |
| three | none | none | — | no | THREE.WebGLRenderer: A WebGL context could not be created. Reason:  disabled by enterprise policy or commandline switch; THREE.WebGLRenderer |
| three-instanced | none | none | — | no | THREE.WebGLRenderer: A WebGL context could not be created. Reason:  disabled by enterprise policy or commandline switch; THREE.WebGLRenderer |
| r3f | — | none | — | no | THREE.WebGLRenderer: A WebGL context could not be created. Reason:  disabled by enterprise policy or commandline switch; THREE.WebGLRenderer |

## WebGL context loss and restore (N=200, animating)

WEBGL_lose_context.loseContext(), 500 ms, restoreContext(), 1.5 s; pixel difference of the stage vs just before the loss (the bob animation alone moves a few %); frames = scene JS frames counted in the 1 s after restore.

| variant | recovered | lost / restored events | scene frames in 1 s after | % px differ vs before | errors |
| --- | --- | --- | --- | --- | --- |
| pixi | yes | 1 / 1 | 19 | 4.56 | [.WebGL-0x393c00160e00]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels; [.WebGL-0x393c00160e00] |
| phaser | yes | 1 / 1 | 17 | 7.00 | WebGL Context lost. Renderer disabled; WebGL Context restored. Renderer running again. |
| three | yes | 1 / 1 | 20 | 6.81 |  |
| three-instanced | yes | 1 / 1 | 8 | 6.66 |  |
| r3f | yes | 1 / 1 | 29 | 7.76 | THREE.Clock: This module has been deprecated. Please use THREE.Timer instead. |

### Engines on their Canvas 2D fallback vs vanilla Canvas 2D (WebGL disabled, 1× CPU)

| variant | N | renderer | fps | frame p95 | JS ms/frame p50/p95 | renderer ms/frame | busy % | drag move→frame p50/p95 | heap MB | runs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| canvas2d | 200 | canvas2d | 59.6 | 16.8 | 0.20 / 0.30 | 3.2 | 19 | 14.6 / 19.0 | 1.9 | 3 |
| pixi | 200 | pixi-canvas | 60.0 | 16.8 | 0.50 / 0.70 | 3.4 | 20 | 15.1 / 19.5 | 4.1 | 3 |
| phaser | 200 | phaser-canvas | 60.0 | 16.7 | 0.40 / 0.70 | 3.9 | 24 | 14.7 / 23.1 | 5.5 | 3 |
| canvas2d | 2000 | canvas2d | 41.9 | 33.4 | 1.60 / 2.50 | 22.6 | 99 | 46.2 / 57.5 | 2.1 | 3 |
| pixi | 2000 | pixi-canvas | 42.2 | 33.4 | 3.50 / 4.70 | 22.7 | 100 | 47.0 / 57.7 | 6.8 | 3 |
| phaser | 2000 | phaser-canvas | 38.3 | 33.4 | 3.00 / 4.80 | 26.0 | 99 | 47.3 / 82.2 | 7.5 | 3 |

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
