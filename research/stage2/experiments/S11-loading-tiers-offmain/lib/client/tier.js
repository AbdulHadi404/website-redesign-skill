// tier.js — an initial quality tier for a rich experience (S11). ~2 KB min+gzip, no dependencies.
//
// The tier is two independent answers, never one number:
//   capability: 'strong' | 'average' | 'low' | 'none'   (how much the device can render and compute)
//   preference: { motion: 'full'|'reduced', transparency: 'full'|'reduced', data: 'full'|'save' }  (what the person asked for)
// A strong device with reduced motion keeps full fidelity and loses camera flights and autoplay; a low device
// without that preference keeps motion at lower resolution. Preferences never raise capability.
//
// Order: URL override (?tier=low, so every tier can be captured) → no WebGL / software WebGL → a frame-time probe
// of the page's own kind of work → cheap signals only as a tie-breaker. After start, a runtime governor (governor.js)
// owns the tier: the probe is a first guess, not a verdict.

export function readSignals() {
  const n = navigator, c = n.connection, mq = (q) => { try { return matchMedia(q).matches; } catch { return false; } };
  return {
    cores: n.hardwareConcurrency ?? null,          // all engines; Safari reports a clamped value; phones say 8 at every price
    memoryGB: n.deviceMemory ?? null,              // Chromium only; rounded to a power of two and clamped (0.25–8)
    saveData: c ? !!c.saveData : null,             // Chromium only (the Save-Data header reaches the server too)
    effectiveType: c?.effectiveType ?? null,       // Chromium only; from recent RTT/throughput, not the radio
    reducedMotion: mq('(prefers-reduced-motion: reduce)'),
    reducedTransparency: mq('(prefers-reduced-transparency: reduce)'),
    reducedData: mq('(prefers-reduced-data: reduce)'),
    coarsePointer: mq('(pointer: coarse)'),
    dpr: globalThis.devicePixelRatio || 1,
  };
}

// WebGL availability and whether it is software-rendered. failIfMajorPerformanceCaveat refuses a context the
// browser knows will be slow (software rasteriser, blocklisted driver); the renderer string backs it up.
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

// The default probe work: the kind of JS a rich scene runs per frame (integrate particles, build a draw list) plus a
// small 2D draw. Replace it with one frame of the experience's own cheapest tier when you have it.
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

// Runs `work` once per animation frame for up to maxMs. Measures the work's own duration (robust to other tasks on
// the thread) and the frame interval (not robust: any long task in between inflates it). Exits early once the
// median has sat clearly inside one band for `stableFrames` frames.
export function frameProbe({ work = makeWork(), maxMs = 1500, minFrames = 12, warmup = 3, bands = [4, 10], stableFrames = 12, earlyExit = true } = {}) {
  return new Promise((resolve) => {
    const works = [], gaps = [];
    let last = 0, t0 = 0, sameSince = 0, prevBand = -1;
    const band = (ms) => (ms < bands[0] ? 0 : ms < bands[1] ? 1 : 2);
    function frame(now) {
      if (!t0) t0 = now;
      if (last) gaps.push(now - last);
      last = now;
      const s = performance.now(); work(); works.push(performance.now() - s);
      const kept = works.slice(warmup);
      if (kept.length >= minFrames) {
        const m = median(kept), b = band(m);
        // "clearly inside": at least 25% away from the nearest band edge
        const edge = bands.reduce((d, e) => Math.min(d, Math.abs(Math.log(m / e))), Infinity);
        if (b === prevBand && edge > Math.log(1.25)) sameSince++; else sameSince = 0;
        prevBand = b;
        if ((earlyExit && sameSince >= stableFrames) || now - t0 >= maxMs) {
          return resolve({ frames: works.length, ms: Math.round(performance.now() - t0), workMedian: m, workAll: works, gapMedian: median(gaps.slice(warmup)), gaps });
        }
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
}

// A millisecond-scale alternative: the same work run back to back five times, the fastest run kept (fastest is
// robust to preemption). Blocks the thread for ~5× one work unit, so run it before the page is interactive or in idle time.
export function burstProbe({ work = makeWork(), reps = 5 } = {}) {
  work(); work(); // JIT warm-up
  let best = Infinity;
  const t0 = performance.now();
  for (let i = 0; i < reps; i++) { const s = performance.now(); work(); best = Math.min(best, performance.now() - s); }
  return { workBest: best, ms: performance.now() - t0 };
}

// capability from probe milliseconds (per unit of the page's own work) and the WebGL answer.
export function classify({ probeMs, gl, signals, bands = [4, 10], needsWebGL = true }) {
  if (needsWebGL && (!gl || gl.webgl === 0)) return { capability: 'none', why: 'no WebGL context' };
  if (needsWebGL && gl.software) return { capability: 'low', why: `software WebGL (${gl.caveat ? 'failIfMajorPerformanceCaveat refused' : gl.renderer})` };
  let capability = probeMs < bands[0] ? 'strong' : probeMs < bands[1] ? 'average' : 'low';
  let why = `probe ${probeMs.toFixed(1)} ms per work unit`;
  // Cheap signals only pull down, and only when they are unambiguous: tiny memory or very few cores.
  if (signals && capability === 'strong' && ((signals.memoryGB && signals.memoryGB <= 2) || (signals.cores && signals.cores <= 2))) { capability = 'average'; why += '; ≤ 2 GB or ≤ 2 cores'; }
  return { capability, why };
}

export function preferences(signals = readSignals()) {
  return {
    motion: signals.reducedMotion ? 'reduced' : 'full',
    transparency: signals.reducedTransparency ? 'reduced' : 'full',
    data: signals.saveData || signals.reducedData ? 'save' : 'full',
  };
}

// The whole decision. `?tier=strong|average|low|none` and `?motion=reduced` force the answer for captures.
export async function detectTier(opts = {}) {
  const t0 = performance.now();
  const q = new URLSearchParams(location.search);
  const signals = readSignals();
  const prefs = preferences(signals);
  if (q.get('motion') === 'reduced') prefs.motion = 'reduced';
  const forced = q.get('tier');
  if (forced) return { capability: forced, why: 'forced by ?tier', prefs, signals, ms: 0 };
  const gl = opts.needsWebGL === false ? null : probeWebGL();
  if (opts.needsWebGL !== false && (gl.webgl === 0 || gl.software)) return { ...classify({ gl, signals, probeMs: NaN }), prefs, signals, gl, ms: Math.round(performance.now() - t0) };
  const probe = await frameProbe(opts);
  const c = classify({ probeMs: probe.workMedian, gl, signals, bands: opts.bands, needsWebGL: opts.needsWebGL !== false });
  return { ...c, prefs, signals, gl, probe: { frames: probe.frames, ms: probe.ms, workMedian: probe.workMedian }, ms: Math.round(performance.now() - t0) };
}
