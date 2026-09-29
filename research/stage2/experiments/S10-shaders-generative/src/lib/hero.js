// The production wrapper every scripted variant shares — the part demos leave out.
//
//   run(bg, effect, opts)
//     bg      the .hero-bg element; it already holds the poster <picture> (the LCP candidate and the fallback)
//     effect  { kind: 'webgl'|'2d', init(canvas) → { gl?, info? } | throws, resize(w, h, dpr), frame(t, dt), dispose() }
//
// What it does, in order of importance:
//   1. never runs under prefers-reduced-motion (the page bootstrap does not even import this module) and
//      stops at once if the preference flips while running;
//   2. keeps the poster until the first real frame is on screen, then crossfades (no flash, no LCP change);
//   3. renders only while the hero is on screen, the tab is visible and the visitor has not paused it:
//      zero requestAnimationFrame callbacks otherwise;
//   4. time-based animation with a clamped dt, and time that does not advance while paused
//      (30 fps in iOS Low Power Mode and 120 Hz displays play the same motion);
//   5. device-pixel-ratio cap and an optional render scale (a soft gradient does not need native resolution);
//   6. WebGL context loss: show the poster, stop, rebuild on restore;
//   7. any failure (no WebGL, shader compile error, exception) leaves the poster — never a blank hero;
//   8. optional settle (opts.settle or ?settle=N): play N seconds, ease to a stop over 1.5 s, then render
//      nothing — "a moment, not a loop" (WCAG 2.2.2 needs no control for motion that stops within 5 s);
//   9. optional frame-time governor (opts.governor or ?gov): after a 1 s warm-up, judge the median frame
//      interval over 45 continuous frames; too slow → halve the render scale (down to 0.25); still under
//      ~30 fps at the floor → stop and keep the poster. It only steps down, never up.
//
// Lab-only query flags: ?nopause (ignore viewport/visibility), ?dpr=N (cap, default 2), ?scale=F, ?fps=N, ?settle=N.

const q = new URLSearchParams(location.search);
const lab = (window.__lab ||= {});
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
  let runTime = 0, settled = false;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const toggle = document.querySelector('.bg-toggle');
  let canvas, handle, raf = 0, last = 0, t = Number(q.get('t0') || 0), inView = true, visible = !document.hidden;
  let paused = false, lost = false, started = false, failed = false, lastDraw = 0;

  const still = q.has('still');   // lab: draw one deterministic frame (poster capture), never loop
  const want = () => !still && !failed && !lost && !paused && (!reduce.matches || lab.optIn) && (noPause || (inView && visible));
  const schedule = () => { if (!raf && want()) { last = performance.now(); gov.since = last; gov.intervals.length = 0; raf = requestAnimationFrame(tick); } };
  const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };

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
    runTime += Math.min(elapsed / 1000, 0.25);      // settle counts wall time: a slow device still stops on time
    let speed = 1;
    if (settleAt && !settled) { const k = Math.max(0, 1 - (runTime - settleAt) / 1.5); speed = runTime < settleAt ? 1 : k * k; }
    t += dt * speed;
    const t0 = performance.now();
    try { effect.frame(t, dt); } catch (e) { return fail(e.message); }
    lab.draws++;
    if (lab.recording) lab.jsTimes.push(performance.now() - t0);
    if (!started) firstFrame();
    if (governor && now - gov.since > 1000) {
      gov.intervals.push(elapsed);
      if (gov.intervals.length >= 45) {
        const s = [...gov.intervals].sort((a, b) => a - b), med = s[s.length >> 1];
        gov.intervals.length = 0; gov.since = now;
        const target = fpsCap ? 1000 / fpsCap : 1000 / 60;
        if (med > target * 1.25) {
          if (scale > 0.25 && !effect.ownsSize) { scale = Math.max(0.25, scale / 2); gov.steps.push({ at: Math.round(now), medianMs: Math.round(med * 10) / 10, scale }); sizeCanvas(); }
          else if (med > Math.max(target, 1000 / 30) * 1.1) { gov.steps.push({ at: Math.round(now), medianMs: Math.round(med * 10) / 10, gaveUp: true }); fail('governor: too slow at the lowest tier'); return; }
        }
      }
    }
    if (settleAt && !settled && speed === 0) {        // settled: the last frame stays on screen, the loop ends
      settled = true; paused = true; lab.settled = performance.now();
      if (toggle) { toggle.setAttribute('aria-pressed', 'true'); toggle.textContent = 'Play background'; }
      return;
    }
    raf = requestAnimationFrame(tick);
  }

  function firstFrame() {
    started = true;
    requestAnimationFrame(() => {
      lab.ttff = performance.now();
      canvas.style.opacity = '1';               // crossfade over the poster (CSS transition on .fx)
    });
  }

  function build() {
    canvas = document.createElement('canvas');
    canvas.className = 'fx';
    canvas.setAttribute('aria-hidden', 'true');
    bg.append(canvas);
    try {
      handle = effect.init(canvas) || {};
    } catch (e) { return fail(e.message); }
    lab.info = handle.info || lab.info;
    if (effect.kind === 'webgl') {
      canvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();                     // tells the browser we will handle restore
        lost = true; stop(); canvas.style.opacity = '0'; lab.contextLost = (lab.contextLost || 0) + 1;
      });
      canvas.addEventListener('webglcontextrestored', () => {
        try { effect.dispose?.(); } catch { /* the old context is gone anyway */ }
        const old = canvas; started = false; lost = false;
        build(); old.remove();                  // rebuild on a fresh canvas: simplest correct restore for any library
        lab.contextRestored = (lab.contextRestored || 0) + 1;
      });
    }
    sizeCanvas();
    // Mark the first frame even when rendering starts paused (reduced motion flipped, or off-screen at load).
    drawOnce(); firstFrame();
    schedule();
  }

  lab.bootStart ??= performance.now();
  build();
  if (failed) return;

  new ResizeObserver(() => canvas && sizeCanvas()).observe(bg);
  new IntersectionObserver(([e]) => { inView = e.isIntersecting; want() ? schedule() : stop(); }).observe(bg.closest('.hero') || bg);
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; want() ? schedule() : stop(); });
  reduce.addEventListener('change', () => (reduce.matches && !lab.optIn ? stop() : schedule()));
  if (toggle) {
    toggle.hidden = false;
    toggle.addEventListener('click', () => {
      paused = !paused;
      toggle.setAttribute('aria-pressed', String(paused));
      toggle.textContent = paused ? 'Play background' : 'Pause background';
      paused ? stop() : schedule();
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
