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
//   7. any failure (no WebGL, shader compile error, exception) leaves the poster — never a blank hero.
//
// Lab-only query flags: ?nopause (ignore viewport/visibility), ?dpr=N (cap, default 2), ?scale=F, ?fps=N.

const q = new URLSearchParams(location.search);
const lab = (window.__lab ||= {});
lab.draws = 0;
lab.jsTimes = [];

export function run(bg, effect, opts = {}) {
  const dprCap = Number(q.get('dpr') || opts.dprCap || 2);
  const scale = Number(q.get('scale') || opts.scale || 1);
  const fpsCap = Number(q.get('fps') || opts.fps || 0);
  const noPause = q.has('nopause');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const toggle = document.querySelector('.bg-toggle');
  let canvas, handle, raf = 0, last = 0, t = Number(q.get('t0') || 0), inView = true, visible = !document.hidden;
  let paused = false, lost = false, started = false, failed = false, lastDraw = 0;

  const still = q.has('still');   // lab: draw one deterministic frame (poster capture), never loop
  const want = () => !still && !failed && !lost && !paused && (!reduce.matches || lab.optIn) && (noPause || (inView && visible));
  const schedule = () => { if (!raf && want()) { last = performance.now(); raf = requestAnimationFrame(tick); } };
  const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };

  function fail(why) {
    failed = true; stop();
    lab.fallback = 'poster'; lab.failReason = String(why).slice(0, 200);
    if (canvas) canvas.remove();
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
    t += dt;
    const t0 = performance.now();
    try { effect.frame(t, dt); } catch (e) { return fail(e.message); }
    lab.draws++;
    if (lab.recording) lab.jsTimes.push(performance.now() - t0);
    if (!started) firstFrame();
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
  new IntersectionObserver(([e]) => { inView = e.isIntersecting; inView ? schedule() : stop(); }).observe(bg.closest('.hero') || bg);
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; visible ? schedule() : stop(); });
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
  lab.loseContext = () => handle?.gl?.getExtension('WEBGL_lose_context');
  lab.state = () => ({ running: !!raf, inView, visible, paused, lost, failed, t: Math.round(t * 100) / 100, canvas: canvas && [canvas.width, canvas.height] });
}

export function webglInfo(gl) {
  if (!gl) return null;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  return { renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), webgl2: typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext };
}
