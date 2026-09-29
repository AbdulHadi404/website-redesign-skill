// The production wrapper every scripted variant shares — the part demos leave out.
//
//   run(bg, effect, opts)
//     bg      the .hero-bg element; it already holds the poster <picture> (the LCP candidate and the fallback)
//     effect  { kind: 'webgl'|'2d', init(canvas) → { gl?, info? } | throws, resize(w, h, dpr), frame(t, dt), dispose() }
//
// What it does, in order of importance:
//   1. never runs under prefers-reduced-motion (the page bootstrap does not even import this module) and
//      stops at once if the preference flips while running;
//   2. keeps the poster until the GPU has finished the first frame (WebGL2 fence), then crossfades (no flash,
//      no pop-in, no LCP change);
//   3. renders only while the hero is on screen, the tab is visible and the visitor has not paused it:
//      zero requestAnimationFrame callbacks otherwise;
//   4. time-based animation with a clamped dt, and time that does not advance while paused
//      (30 fps in iOS Low Power Mode and 120 Hz displays play the same motion);
//   5. device-pixel-ratio cap and an optional render scale (a soft gradient does not need native resolution);
//   6. WebGL context loss: show the poster, stop, rebuild on restore;
//   7. any failure (no WebGL, shader compile error, exception) leaves the poster — never a blank hero;
//   8. optional settle (opts.settle or ?settle=N): N seconds of motion IN TOTAL, wall-clock (performance.now()),
//      counted from the first animated frame and excluding time paused; the last min(1.5 s, N/3) of it eases to
//      a stop, and the loop ends before a frame would start past N. Keep N ≤ 4 so the last frame is presented
//      within WCAG 2.2.2's 5 s even on a slow device (GPU lag ≈ one frame). The pause control stays anyway;
//      pressing Play after the settle replays the moment;
//   9. optional frame-time governor (opts.governor or ?gov): after a 1 s warm-up, judge the median frame
//      interval over 45 continuous frames or 2 s, whichever comes first; too slow → halve the render scale
//      (down to 0.25); still under ~30 fps at the floor → stop and keep the poster. Only steps down.
//
//  10. the visitor's control is a plain button whose label says what it will do ("Pause background animation" /
//      "Play background animation"), with no aria-pressed: a toggle whose label changes must not also announce a
//      pressed state (WAI-ARIA APG button pattern).
//
// Lab-only query flags: ?nopause (ignore viewport/visibility), ?dpr=N (cap, default 2), ?scale=F, ?fps=N, ?settle=N,
// ?syncfirst (block on the GPU after the first draw to time when the first frame is really finished).

const q = new URLSearchParams(location.search);
const lab = (window.__lab ||= {});
export const LABEL = { pause: 'Pause background animation', play: 'Play background animation' };
lab.draws = 0;
lab.jsTimes = [];

export function run(bg, effect, opts = {}) {
  const dprCap = Number(q.get('dpr') || opts.dprCap || 2);
  let scale = Number(q.get('scale') || opts.scale || 1);
  const governor = q.has('gov') || !!opts.governor;
  const gov = { intervals: [], since: 0, steps: [] };
  lab.governor = gov.steps;
  const fpsCap = Number(q.get('fps') || opts.fps || 0);
  const noPause = q.has('nopause');
  const settleAt = Number(q.get('settle') || opts.settle || 0);
  const easeFor = Math.min(1.5, settleAt / 3);
  let runWall = 0, lastInterval = 0, settled = false;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const toggle = document.querySelector('.bg-toggle');
  let canvas, handle, raf = 0, last = 0, t = Number(q.get('t0') || 0), inView = true, visible = !document.hidden;
  let paused = false, lost = false, started = false, failed = false, lastDraw = 0, ready = false;

  const still = q.has('still');   // lab: draw one deterministic frame (poster capture), never loop
  const want = () => ready && !still && !failed && !lost && !paused && (!reduce.matches || lab.optIn) && (noPause || (inView && visible));
  const schedule = () => { if (!raf && want()) { last = performance.now(); gov.since = last; gov.intervals.length = 0; gov.sum = 0; raf = requestAnimationFrame(tick); } };
  const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };

  // Not moving because of the visitor (or their reduced-motion preference), as opposed to off-screen or hidden.
  function halted() { return paused || settled || (reduce.matches && !lab.optIn); }
  function syncLabel() { if (toggle) toggle.textContent = halted() ? LABEL.play : LABEL.pause; }

  function fail(why) {
    failed = true; stop();
    lab.fallback = 'poster'; lab.failReason = String(why).slice(0, 200);
    if (canvas) { const c = canvas; c.style.opacity = '0'; setTimeout(() => { try { effect.dispose?.(); } catch {} c.remove(); }, started ? 700 : 0); }
    if (toggle) toggle.hidden = true;     // nothing to pause: the poster is static
  }

  function sizeCanvas() {
    if (effect.ownsSize) return;               // e.g. the fluid sim sizes its own canvas and framebuffers
    const dpr = Math.min(window.devicePixelRatio || 1, dprCap) * scale;
    const w = Math.max(1, Math.round(bg.clientWidth * dpr)), h = Math.max(1, Math.round(bg.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; effect.resize?.(w, h, dpr); if (started && !raf) drawOnce(); }
  }

  function drawOnce() {
    const t0 = performance.now();
    effect.frame(t, 0);
    lab.draws++;
    if (lab.recording) lab.jsTimes.push(performance.now() - t0);
  }

  function tick(now) {
    raf = 0;
    if (!want()) return;
    const elapsed = Math.max(0, now - last);   // a rAF timestamp can precede the performance.now() taken when scheduling
    if (fpsCap && elapsed < 1000 / fpsCap - 2) { raf = requestAnimationFrame(tick); return; }
    last = now;
    const dt = Math.min(elapsed / 1000, 1 / 20);    // clamp: a long pause never becomes one huge step
    // settle counts real wall time (unclamped; `last` is reset on resume, so paused time is excluded)
    if (lab.motionStart == null) lab.motionStart = now;
    runWall += elapsed / 1000; lastInterval = elapsed / 1000;
    let speed = 1, lastFrame = false;
    if (settleAt && !settled) {
      const left = settleAt - runWall;
      speed = left >= easeFor ? 1 : Math.max(0, left / easeFor) ** 2;
      lastFrame = runWall + Math.max(lastInterval, 1 / 60) >= settleAt;   // the next frame would start too late
    }
    t += dt * speed;
    const t0 = performance.now();
    try { effect.frame(t, dt); } catch (e) { return fail(e.message); }
    lab.draws++;
    if (lab.recording) lab.jsTimes.push(performance.now() - t0);
    if (!started) firstFrame();
    if (governor && now - gov.since > 1000) {
      gov.intervals.push(elapsed);
      gov.sum = (gov.sum || 0) + elapsed;
      if (gov.intervals.length >= 45 || (gov.sum >= 2000 && gov.intervals.length >= 5)) {
        gov.sum = 0;
        const s = [...gov.intervals].sort((a, b) => a - b), med = s[s.length >> 1];
        gov.intervals.length = 0; gov.since = now;
        const target = fpsCap ? 1000 / fpsCap : 1000 / 60;
        if (med > target * 1.25) {
          if (scale > 0.25 && !effect.ownsSize) { scale = Math.max(0.25, scale / 2); gov.steps.push({ at: Math.round(now), medianMs: Math.round(med * 10) / 10, scale }); sizeCanvas(); }
          else if (med > Math.max(target, 1000 / 30) * 1.1) { gov.steps.push({ at: Math.round(now), medianMs: Math.round(med * 10) / 10, gaveUp: true }); fail('governor: too slow at the lowest tier'); return; }
        }
      }
    }
    if (lastFrame) {                                    // settled: the last frame stays on screen, the loop ends
      settled = true; paused = true; lab.settled = performance.now(); lab.settledRunWall = runWall;
      syncLabel();
      return;
    }
    raf = requestAnimationFrame(tick);
  }

  // Crossfade over the poster, and start the loop, only once the GPU has really finished the first frame. The draw
  // call returns long before that (shader compilation can take seconds on a weak GPU): a CSS crossfade started at
  // the draw call is over before the frame exists (the effect pops in), and frames queued behind a compiling GPU
  // block the main thread. WebGL2: a fence polled once per animation frame (never blocks). WebGL1 has no fence:
  // reveal on the next animation frame and start at once.
  function firstFrame() {
    started = true;
    lab.drawIssued ??= performance.now();
    const gl = handle?.gl, cv = canvas;
    const reveal = () => { lab.ttff = performance.now(); cv.style.opacity = '1'; ready = true; schedule(); };   // CSS transition on .fx
    if (!(typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext) || q.has('nofence')) { ready = true; requestAnimationFrame(() => { lab.ttff = performance.now(); cv.style.opacity = '1'; }); return; }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const t0 = performance.now();
    const poll = () => {
      if (gl.isContextLost() || cv !== canvas) return;
      if (gl.getSyncParameter(sync, gl.SYNC_STATUS) === gl.SIGNALED || performance.now() - t0 > 10000) {
        gl.deleteSync(sync); lab.fenceMs = performance.now() - t0; reveal();
      } else requestAnimationFrame(poll);
    };
    requestAnimationFrame(poll);
  }

  function build() {
    canvas = document.createElement('canvas');
    canvas.className = 'fx';
    canvas.setAttribute('aria-hidden', 'true');
    bg.append(canvas);
    const ti = performance.now();
    try {
      handle = effect.init(canvas) || {};
    } catch (e) { return fail(e.message); }
    lab.initMs ??= performance.now() - ti;       // lab: context + shader/program setup, synchronous on the main thread
    lab.info = handle.info || lab.info;
    if (effect.kind === 'webgl') {
      canvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();                     // tells the browser we will handle restore
        lost = true; stop(); canvas.style.opacity = '0'; lab.contextLost = (lab.contextLost || 0) + 1;
      });
      canvas.addEventListener('webglcontextrestored', () => {
        try { effect.dispose?.(); } catch { /* the old context is gone anyway */ }
        const old = canvas; started = false; lost = false; ready = false;
        build(); old.remove();                  // rebuild on a fresh canvas: simplest correct restore for any library
        lab.contextRestored = (lab.contextRestored || 0) + 1;
      });
    }
    sizeCanvas();
    // Mark the first frame even when rendering starts paused (reduced motion flipped, or off-screen at load).
    const td = performance.now();
    drawOnce();
    lab.firstDrawMs ??= performance.now() - td;  // lab: the first frame's JS, including any GL call that waits on the GPU
    if (q.has('syncfirst') && handle.gl && lab.gpuFirst == null) {   // lab: wait for the GPU to finish frame 1
      const gl = handle.gl;
      gl.finish();
      try { if (!gl.getParameter(gl.FRAMEBUFFER_BINDING)) gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); } catch {}
      lab.gpuFirst = performance.now();
    }
    firstFrame();
    schedule();
  }

  lab.bootStart ??= performance.now();
  build();
  if (failed) return;

  new ResizeObserver(() => canvas && sizeCanvas()).observe(bg);
  new IntersectionObserver(([e]) => { inView = e.isIntersecting; want() ? schedule() : stop(); }).observe(bg.closest('.hero') || bg);
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; want() ? schedule() : stop(); });
  reduce.addEventListener('change', () => { reduce.matches && !lab.optIn ? stop() : schedule(); syncLabel(); });
  if (toggle) {
    toggle.hidden = false;
    toggle.removeAttribute('aria-pressed');
    syncLabel();
    toggle.addEventListener('click', () => {
      if (halted()) {                               // play: also the reduced-motion opt-in, and a replay after settling
        paused = false; lab.optIn = true;
        if (settled) { settled = false; runWall = 0; }
        schedule();
      } else { paused = true; stop(); }
      syncLabel();
    });
  }
  lab.pause = () => { paused = true; stop(); };
  lab.renderAt = (tt) => { t = tt; drawOnce(); };   // lab: render a given time (frames for the video variant)
  lab.loseContext = () => handle?.gl?.getExtension('WEBGL_lose_context');
  lab.state = () => ({ running: !!raf, inView, visible, paused, lost, failed, settled, t: Math.round(t * 100) / 100, canvas: canvas && [canvas.width, canvas.height] });
}

export function webglInfo(gl) {
  if (!gl) return null;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  return { renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), webgl2: typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext };
}
