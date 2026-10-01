// tier.js — the starting quality tier for a rich experience (a WebGL scene, a generative background, a heavy canvas),
// and measureRefresh(), the budget governor.js judges frames against. No dependencies, ~2.7 KB min+gzip. How to use
// the tiers: interactive.md §7. Copy it into the project and keep this header.
//
// The tier is two independent answers, never one number:
//   capability: 'strong' | 'average' | 'low' | 'none' | 'undetermined'   (how much the device can render and compute)
//   preference: { motion: 'full'|'reduced', transparency: 'full'|'reduced', data: 'full'|'save' }  (what the person asked for)
// A strong device with reduced motion keeps full fidelity and loses camera flights and autoplay; a low device without
// that preference keeps its motion at a lower resolution. Preferences never raise capability.
//
// Detection order (detectTier() runs 1–5; the governor owns 6):
//   1. ?tier=strong|average|low|none and ?motion=reduced force the answer, so every tier can be captured.
//   2. measureRefresh() WHILE ONLY THE POSTER IS ON SCREEN, before any scene: once a scene runs, a 30 Hz display and a
//      slow scene on a 60 Hz display both give 33 ms intervals. null (page busy, tab hidden) → 60 Hz assumed and
//      refreshUncertain: true.
//   3. No WebGL → 'none'. A software renderer → 'low'. failIfMajorPerformanceCaveat alone is not trusted (it did not
//      refuse SwiftShader in the lab): the renderer string backs it up.
//   4. start: a guess that only ever lowers (Save-Data or deviceMemory ≤ 2 → low; coarse pointer → average), for
//      choosing the first assets before the probe. Never hardwareConcurrency, battery or effectiveType.
//   5. For CPU-bound scenes, after hydration: time the TOP TIER'S OWN per-frame JS (pass one frame of it as `work`), and
//      divide the median by the refresh: < 0.3 strong, < 0.6 average, else low. It answers early once 24 frames sit
//      clearly inside one band (12 after warm-up, then 12 stable), else at the 1.5 s wall-clock cap from ≥ 12 frames.
//      - 'undetermined' (too few frames arrived: the page is busy, the GPU is the bottleneck): probe again once the
//        page is quiet; if it is still undetermined, start at 'low' and let the governor step up.
//      - nearEdge (within 10% of an edge): expect the tier to differ between visits. Proposal [K]: start at the lower
//        tier and let the governor step up after 8 s.
//   6. From then on createGovernor({ refreshMs, onChange, onFloor: showPoster }) (governor.js) owns the tier: the probe
//      is a first guess, not a verdict.
//
// What was tested [L, research/stage2/experiments/S11-loading-tiers-offmain: headless Chromium, CDP CPU throttling,
// 10 runs per cell, host load 4–13; no real phone or GPU]:
//   - measureRefresh() read 16.6–16.7 ms in 95 of 95 quiet runs. With a scene already running it read 33–133 ms in 7 of
//     24 calls, which is why it now returns null when the intervals disagree or exceed 34 ms. One case stays invisible:
//     a scene holding a steady 30 fps looks exactly like a 30 Hz display — measure before the scene.
//   - The probe with the default stand-in work: quiet 1× and 2× strong, 3× and 4× average, 6× low in 10 of 10 runs each;
//     5× (0.66 of the frame, on the 0.6 edge) split 5/5. Busy throttled runs (twelve ~50 ms boot tasks during the
//     probe): undetermined in 17 of 20, never a wrong tier. (Judged on 12 frames, an earlier run called 5× and 6×
//     "strong" in 1 and 2 of 10 runs, the throttler dropping out: hence 24 frames before an early answer.)
//   - Held out, on pages it was not written on (three S10 hero builds and tools/regress/fixtures/capture-webgl.html at
//     CPU 1/4/6×): a 2–4 fps SwiftShader scene → undetermined in 2.3–3.2 s in 6 of 6 (the first version took 6.3–8.9 s
//     and said "average"); a Canvas2D hero → strong / average / low; a page without a loop answered in 0.8–1.9 s.
//     Re-run at promotion, one run per cell: the same answers (the SwiftShader scene undetermined in 2.4–2.7 s at 1/4/6×).
//   - Rejected on measurement: an fps probe (called every quiet level from 1× to 6× "strong": vsync hides the work) and
//     a min-of-N burst (2–9 of 10 under CDP).
//   - tools/regress.mjs, group templates: the forced tier, the wall-clock cap on a page that renders at 3 fps, and a
//     heavy probe under CPU throttling.
// [K]: the 0.3 / 0.6 edges (from RAIL's "~10 ms of JS per 16.7 ms frame", fixed before the runs; which throttle level
// is called "average" is a labelling choice — doubling the work turned 3× and 4× into low), the start guess, and the
// software-renderer list. [V] device signals (engine source, BCD 8.1.3): WebKit reports hardwareConcurrency as 4 or 8;
// deviceMemory is Chromium-only and clamped to 1–8 GB on Android, 2–32 GB on desktop; Save-Data and
// prefers-reduced-transparency are Chromium-only; prefers-reduced-data ships nowhere. Not tested: real devices, and iOS
// beyond WebKit's source. The CPU probe cannot see a weak GPU: the governor has to catch that (it did, on the 2–4 fps
// SwiftShader scene).

// The display's refresh interval, from empty animation frames. Returns the 25th-percentile interval when the intervals
// agree (p75 ≤ 1.15 × p25) and sit between 4 and 34 ms (240 Hz … 30 Hz); otherwise null — the page was busy, the tab is
// hidden, or frames stopped — and the caller should assume 1000/60 and not trust a relative band.
export function measureRefresh({ frames = 20, maxMs = 700 } = {}) {
  return new Promise((resolve) => {
    const iv = []; let last = 0, t0 = 0, done = false;
    const finish = () => {
      if (done) return; done = true; clearTimeout(timer);
      const s = iv.sort((a, b) => a - b); if (s.length < 5) return resolve(null);
      const p25 = s[Math.floor(s.length / 4)], p75 = s[Math.floor(s.length * 3 / 4)];
      resolve(p75 <= p25 * 1.15 && p25 >= 4 && p25 <= 34 ? p25 : null);
    };
    const timer = setTimeout(finish, maxMs + 100);
    function f(now) { if (done) return; if (!t0) t0 = now; if (last) iv.push(now - last); last = now; if (iv.length >= frames || now - t0 >= maxMs) return finish(); requestAnimationFrame(f); }
    requestAnimationFrame(f);
  });
}

export function readSignals() {
  const n = navigator, c = n.connection, mq = (q) => { try { return matchMedia(q).matches; } catch { return false; } };
  return {
    cores: n.hardwareConcurrency ?? null,          // all engines; WebKit reports 4 (< 8 cores) or 8; phones say 8 at every price. Worker pools only, never tiering
    memoryGB: n.deviceMemory ?? null,              // Chromium only; a power of two, clamped: Android 1–8, desktop 2–32. Missing = unknown, not low
    saveData: c ? !!c.saveData : null,             // Chromium only (the Save-Data header reaches the server too)
    effectiveType: c?.effectiveType ?? null,       // Chromium only; from recent RTT/throughput, not the radio; capped at "4g"
    reducedMotion: mq('(prefers-reduced-motion: reduce)'),
    reducedTransparency: mq('(prefers-reduced-transparency: reduce)'),   // Chromium 118+
    reducedData: mq('(prefers-reduced-data: reduce)'),                   // ships nowhere yet: always false today
    coarsePointer: mq('(pointer: coarse)'),
    dpr: globalThis.devicePixelRatio || 1,
  };
}

// WebGL availability and whether it is software-rendered. failIfMajorPerformanceCaveat refuses a context the browser
// knows will be slow (software rasteriser, blocklisted driver); the renderer string backs it up.
export function probeWebGL() {
  const make = (type, attrs) => { try { return document.createElement('canvas').getContext(type, attrs); } catch { return null; } };
  let gl = make('webgl2', { failIfMajorPerformanceCaveat: true }) || make('webgl', { failIfMajorPerformanceCaveat: true });
  const caveat = !gl;
  if (!gl) gl = make('webgl2') || make('webgl');
  if (!gl) return { webgl: 0, caveat: true, software: true, renderer: '' };
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = String(dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
  const software = caveat || /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/i.test(renderer);
  const out = { webgl: typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext ? 2 : 1, caveat, software, renderer, maxTexture: gl.getParameter(gl.MAX_TEXTURE_SIZE) };
  gl.getExtension('WEBGL_lose_context')?.loseContext(); // release the probe's context at once (browsers cap live contexts)
  return out;
}

// The default probe work, a stand-in for what a rich scene runs per frame (integrate particles, build a draw list)
// plus a small 2D draw. Replace it with one frame of the experience's own top tier: the labels mean nothing without it.
export function makeWork(n = 200000, rects = 1000) {
  const p = new Float32Array(n * 4);
  for (let i = 0; i < p.length; i++) p[i] = Math.random();
  const cv = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(128, 128) : Object.assign(document.createElement('canvas'), { width: 128, height: 128 });
  const g = cv.getContext('2d');
  return function work() {
    for (let i = 0; i < n; i++) {
      const k = i * 4;
      p[k + 2] += (0.5 - p[k]) * 0.01; p[k + 3] += (0.5 - p[k + 1]) * 0.01;
      p[k] += p[k + 2] * 0.016; p[k + 1] += p[k + 3] * 0.016;
      if (p[k] < 0 || p[k] > 1) p[k + 2] *= -0.9;
      if (p[k + 1] < 0 || p[k + 1] > 1) p[k + 3] *= -0.9;
    }
    g.clearRect(0, 0, 128, 128);
    for (let i = 0; i < rects; i++) { const k = i * 4; g.fillRect(p[k] * 128, p[k + 1] * 128, 2, 2); }
  };
}

const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[s.length >> 1] : NaN; };

// Runs `work` once per animation frame for at most maxMs of wall-clock time (a timer also ends it if frames stop coming).
// Measures the work's own duration (robust to other tasks on the thread), not the frame rate (vsync hides work that
// fits in the frame). Exits early once the median has sat clearly inside one band for `stableFrames` frames.
// bands are fractions of refreshMs. enough = false when fewer than minFrames frames (after warm-up) arrived in time.
export function frameProbe({ work = makeWork(), refreshMs = 1000 / 60, maxMs = 1500, minFrames = 12, warmup = 3, bands = [0.3, 0.6], stableFrames = 12, earlyExit = true } = {}) {
  return new Promise((resolve) => {
    const works = [], gaps = [], edges = bands.map((b) => b * refreshMs);
    let last = 0, sameSince = 0, prevBand = -1, done = false;
    const band = (ms) => (ms < edges[0] ? 0 : ms < edges[1] ? 1 : 2);
    const wall0 = performance.now();
    function finish() {
      if (done) return; done = true; clearTimeout(timer);
      const kept = works.slice(warmup);
      resolve({ frames: works.length, kept: kept.length, enough: kept.length >= minFrames, ms: Math.round(performance.now() - wall0), refreshMs, edges,
        workMedian: kept.length ? median(kept) : NaN, workMin: kept.length ? Math.min(...kept) : NaN, workAll: works, gapMedian: median(gaps.slice(warmup)), gaps });
    }
    const timer = setTimeout(finish, maxMs + 50);
    function frame(now) {
      if (done) return;
      if (last) gaps.push(now - last);
      last = now;
      const s = performance.now(); work(); works.push(performance.now() - s);
      if (performance.now() - wall0 >= maxMs) return finish();
      const kept = works.slice(warmup);
      if (earlyExit && kept.length >= minFrames) {
        const m = median(kept), b = band(m);
        // "clearly inside": at least 25% away from the nearest band edge
        const edge = edges.reduce((d, e) => Math.min(d, Math.abs(Math.log(m / e))), Infinity);
        if (b === prevBand && edge > Math.log(1.25)) sameSince++; else sameSince = 0;
        prevBand = b;
        if (sameSince >= stableFrames) return finish();
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
}

// Capability from the probe (per-frame work as a fraction of the refresh interval) and the WebGL answer.
export function classify({ probe, gl, signals, bands = [0.3, 0.6], needsWebGL = true }) {
  if (needsWebGL && (!gl || gl.webgl === 0)) return { capability: 'none', why: 'no WebGL context' };
  if (needsWebGL && gl.software) return { capability: 'low', why: `software WebGL (${gl.caveat ? 'failIfMajorPerformanceCaveat refused' : gl.renderer})` };
  const R = probe.refreshMs || 1000 / 60;
  if (!probe.enough) {
    if (probe.kept >= 3 && probe.workMin >= bands[1] * R) return { capability: 'low', why: `only ${probe.kept} frames in ${probe.ms} ms, every one's work ≥ ${bands[1]} × ${R.toFixed(1)} ms` };
    return { capability: 'undetermined', why: `only ${probe.frames} frames (${probe.kept} after warm-up) in ${probe.ms} ms (frames ~${Math.round(probe.gapMedian || 0)} ms apart, work ${Number.isFinite(probe.workMedian) ? probe.workMedian.toFixed(1) : '?'} ms)` };
  }
  const f = probe.workMedian / R;
  let capability = f < bands[0] ? 'strong' : f < bands[1] ? 'average' : 'low';
  let why = `probe work ${probe.workMedian.toFixed(1)} ms = ${f.toFixed(2)} × the ${R.toFixed(1)} ms refresh`;
  const nearEdge = bands.some((b) => Math.abs(f / b - 1) < 0.1);
  if (nearEdge) why += ' (within 10% of an edge)';
  // deviceMemory only pulls down, and only when unambiguous (Android reports ≤ 2 for ≤ ~3 GB of RAM). Never cores.
  if (signals && capability === 'strong' && signals.memoryGB && signals.memoryGB <= 2) { capability = 'average'; why += '; deviceMemory ≤ 2'; }
  return { capability, why, nearEdge };
}

// A first guess before any probe has run (to pick which assets to fetch first). Heuristic, not measured: every input is
// coarse (Chromium on Android reports 1, 2, 4 or 8 GB; others nothing), so it only ever lowers the start, and the
// probe and the governor correct it.
export function startGuess(signals = readSignals(), gl = probeWebGL(), needsWebGL = true) {
  if (needsWebGL && (!gl || gl.webgl === 0)) return 'none';
  if (needsWebGL && gl.software) return 'low';
  if (signals.saveData || (signals.memoryGB && signals.memoryGB <= 2)) return 'low'; // ≤ 2 GB (Chromium) ≈ ≤ 3 GB RAM
  if (signals.coarsePointer) return 'average';                                        // phones and tablets start mid
  return 'strong';
}

// WebGL context loss (GPU reset, memory pressure, too many contexts): keep the poster visible, stop the loop, and
// restore; a second loss in one session drops a tier (three.js WebGLRenderer already calls preventDefault()).
export function watchContextLoss(canvas, { onLost = () => {}, onRestored = () => {} } = {}) {
  let losses = 0;
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); losses++; onLost(losses); }, false);
  canvas.addEventListener('webglcontextrestored', () => onRestored(losses), false);
  return { get losses() { return losses; } };
}

export function preferences(signals = readSignals()) {
  return {
    motion: signals.reducedMotion ? 'reduced' : 'full',
    transparency: signals.reducedTransparency ? 'reduced' : 'full',
    data: signals.saveData || signals.reducedData ? 'save' : 'full',
  };
}

// The whole decision (steps 1–5 above). Options: work (one frame of the top tier's JS), needsWebGL (default true),
// bands, and frameProbe's maxMs / minFrames. Returns refreshMs too: hand it to createGovernor({ refreshMs }).
export async function detectTier(opts = {}) {
  const t0 = performance.now();
  const q = new URLSearchParams(location.search);
  const signals = readSignals();
  const prefs = preferences(signals);
  if (q.get('motion') === 'reduced') prefs.motion = 'reduced';
  const measured = await measureRefresh();
  const refreshMs = measured || 1000 / 60, refreshUncertain = !measured;
  const forced = q.get('tier');
  if (['strong', 'average', 'low', 'none'].includes(forced)) return { capability: forced, start: forced, why: 'forced by ?tier', prefs, signals, refreshMs, refreshUncertain, ms: Math.round(performance.now() - t0) };
  const needsWebGL = opts.needsWebGL !== false;
  const gl = needsWebGL ? probeWebGL() : null;
  const start = startGuess(signals, gl, needsWebGL);
  if (needsWebGL && (gl.webgl === 0 || gl.software)) return { ...classify({ gl, signals, probe: {} }), start, prefs, signals, gl, refreshMs, refreshUncertain, ms: Math.round(performance.now() - t0) };
  const probe = await frameProbe({ ...opts, refreshMs });
  const c = classify({ probe, gl, signals, bands: opts.bands, needsWebGL });
  if (refreshUncertain) c.why += '; refresh not measurable (page busy?), 60 Hz assumed';
  return { ...c, start, prefs, signals, gl, refreshMs, refreshUncertain, probe: { frames: probe.frames, kept: probe.kept, ms: probe.ms, workMedian: probe.workMedian, gapMedian: probe.gapMedian }, ms: Math.round(performance.now() - t0) };
}
