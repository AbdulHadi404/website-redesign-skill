// hero-effect.js — the production wrapper for a generative hero background (a shader, particles, a Canvas 2D field):
// the part demos leave out. ~2.0 KB min+gzip; ~3.0 KB with governor.js and tier.js's measureRefresh, which it imports.
// It is research/stage2/experiments/S10-shaders-generative/src/lib/hero.js without its lab-only query flags and
// instrumentation, with S10's inline governor replaced by governor.js (stepUp: false), as S11 decided. Read
// interactive.md §9 first: its purpose gate decides whether a moving background is warranted at all. Copy the three files into
// the project and keep this header. No third-party code is borrowed here; credit the effect's own borrowed functions
// (a noise function, a shader) in CREDITS.md.
//
// Page bootstrap (inline, in the page) — under reduced motion the effect is never imported: the poster stays, and a
// button offers to play it:
//   <div class="hero-bg" aria-hidden="true"><img class="poster" src="poster.webp" fetchpriority="high" alt=""></div>
//   <button class="bg-toggle" type="button" hidden>Pause background animation</button>   <!-- before the copy in DOM order -->
//   <script type="module">
//     const bg = document.querySelector('.hero-bg'), btn = document.querySelector('.bg-toggle');
//     const start = (optIn) => Promise.all([import('/js/hero-effect.js'), import('/js/effect.js')])
//       .then(([h, e]) => h.run(bg, e.effect, { toggle: btn, optIn })).catch(() => { btn.hidden = true; });   // the poster stays
//     if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
//       btn.hidden = false; btn.textContent = 'Play background animation';
//       btn.addEventListener('click', () => start(true), { once: true });
//     } else addEventListener('load', () => (window.requestIdleCallback || setTimeout)(() => start(false)), { once: true });
//   </script>
//   CSS: .fx { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; transition: opacity .6s ease-out }
//
// run(bg, effect, opts) → Promise<controller>
//   bg      the element holding the poster (the LCP candidate and the fallback); the canvas is added inside it
//   effect  { kind: 'webgl' | '2d', init(canvas) → { gl } (throw on any failure), resize(w, h, dpr), frame(t, dt),
//             dispose(), ownsSize? }. For the fence, create a WebGL2 context: powerPreference 'low-power', no
//             antialias, depth or stencil for a full-screen quad.
//   opts    toggle (the pause button), optIn (started by the Play button under reduced motion), dprCap 2, scale 1
//           (render scale; 0.5 is enough for a soft field), fps 0 (a frame cap: 30 is enough for slow fields),
//           settle 0 (seconds of motion in total, see 6), governor true, refreshMs (default: measured here, while
//           only the poster is on screen), onFallback(why)
//   controller  { state, pause(), play(), dispose() }
//
// What it does:
//   1. Poster first. The canvas crossfades in only when a WebGL2 fence says the GPU has finished frame 1 (polled once per
//      animation frame, never blocking); the loop starts then too. The draw call returns long before the frame exists:
//      a crossfade started there pops in, and frames queued behind a compiling GPU block the main thread (S10, fluid:
//      the longest main-thread task was 1,379 ms without the fence, 210 ms with it). WebGL1 and 2D have no fence:
//      revealed on the next frame.
//   2. Renders only while the hero is on screen (IntersectionObserver), the tab is visible and nobody paused it: zero
//      requestAnimationFrame callbacks otherwise. Browsers do not pause JavaScript loops off-screen.
//   3. Time-based motion with a clamped step; paused time does not advance (30 Hz Low Power Mode and 120 Hz play alike).
//   4. Pixel ratio capped (default 2) × render scale; ResizeObserver keeps the buffer matched to the box. Resizing clears
//      the buffer, so a running loop applies a new size just before its next draw and a stopped one redraws at once: no
//      frame is painted blank (black for WebGL with alpha: false) and no frame draws twice.
//   5. governor.js with stepUp: false and the refresh measured before the effect starts: each step down halves the render
//      scale (to 0.25 at most); a halving that cut the mean frame interval by less than 15 % is undone and resolution
//      is left alone (the effect is not fill-bound: S10's particles once dropped to 320×180 for +14 %); below ~27 fps
//      at the lowest level it fades back to the poster.
//   6. settle: N seconds of motion in total, wall clock, easing included (the last min(1.5 s, N/3) eases to a stop); the
//      loop ends before a frame would start past N. Keep N ≤ 4 so the last frame lands inside WCAG 2.2.2's 5 s. The
//      pause control stays either way; Play after settling replays the moment.
//   7. The control is a plain button whose label says what it will do ("Pause background animation" / "Play background
//      animation"), with no aria-pressed: a label that changes must not also announce a pressed state (APG).
//   8. webglcontextlost: preventDefault, show the poster, rebuild on a fresh canvas on restore (the fence again); a
//      second loss keeps the poster. Any failure (no context, a shader error, an exception in frame) → the poster,
//      never a blank hero.
// Tested: the S10 lab ran hero.js on ten effects (raw WebGL, OGL, regl, twgl, three.js, Paper, particles, fluid, post)
// in headless Chromium on SwiftShader, 1× and 4× CPU: no black frame in 162 runs, settle measured 3.7–4.0 s on screen
// for N = 4. This file: tools/regress.mjs, group templates (fence, off-screen, hidden, reduced motion, context loss,
// governor give-up, pixel-ratio cap, settle; no blank or doubled frame at a scale change or a window resize). [K] set in
// emulation, not on a real GPU: the ×1.25 budget, the 15 % rule, the ~27 fps give-up; the fence's benefit on real GPUs
// (which mostly compile at link time) is unmeasured.
import { createGovernor } from './governor.js';
import { measureRefresh } from './tier.js';

export const LABEL = { pause: 'Pause background animation', play: 'Play background animation' };
const SCALES = [1, 0.5, 0.25];

export async function run(bg, effect, opts = {}) {
  const { dprCap = 2, fps = 0, settle = 0, governor = true, onFallback = () => {} } = opts;
  const toggle = opts.toggle ?? (bg.closest('.hero') || document).querySelector('.bg-toggle');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const easeFor = Math.min(1.5, settle / 3);
  let scale = opts.scale || 1, base = scale, fillBound = true, pending = null, resizeDue = false;
  let canvas, handle, gov, raf = 0, last = 0, t = 0, runWall = 0, inView = true, visible = !document.hidden;
  let paused = false, settled = false, lost = false, losses = 0, failed = false, ready = false, revealed = false, why = '';
  let optIn = !!opts.optIn, ro, io, onVis, onReduce, onToggle;
  const refreshMs = opts.refreshMs ?? await measureRefresh();   // while only the poster is on screen

  const want = () => ready && !failed && !lost && !paused && !settled && (!reduce.matches || optIn) && inView && visible;
  const schedule = () => { if (!raf && want()) { last = performance.now(); raf = requestAnimationFrame(tick); } };
  const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; gov?.pause(); if (resizeDue) resizeNow(); };
  const halted = () => paused || settled || (reduce.matches && !optIn);
  const syncLabel = () => { if (toggle) toggle.textContent = halted() ? LABEL.play : LABEL.pause; };
  const update = () => { want() ? schedule() : stop(); };

  function fail(reason) {
    if (failed) return;
    failed = true; why = String(reason).slice(0, 200); stop(); gov?.dispose();
    if (canvas) { const c = canvas; c.style.opacity = '0'; setTimeout(() => { try { effect.dispose?.(); } catch {} c.remove(); }, revealed ? 700 : 0); }
    if (toggle) toggle.hidden = true;                                 // nothing left to pause: the poster is static
    onFallback(why);
  }

  // Setting canvas.width clears the buffer, and a frame that ends with nothing drawn after it is painted blank (black for
  // WebGL with alpha: false, the poster for 2D). So a running loop applies a new size at the start of its next frame,
  // just before it draws (resizeDue); a stopped one resizes and redraws at once. Either way one draw per frame.
  function sizeCanvas() {                                             // true when the buffer changed (and was cleared)
    if (effect.ownsSize || !canvas) return false;
    const dpr = Math.min(devicePixelRatio || 1, dprCap) * scale;
    const w = Math.max(1, Math.round(bg.clientWidth * dpr)), h = Math.max(1, Math.round(bg.clientHeight * dpr));
    if (canvas.width === w && canvas.height === h) return false;
    canvas.width = w; canvas.height = h; effect.resize?.(w, h, dpr); return true;
  }
  const draw = () => { try { effect.frame(t, 0); } catch (e) { fail(e.message); } };
  const resizeNow = () => { resizeDue = false; if (!failed && !lost && sizeCanvas()) draw(); };   // a lost or fading canvas is left alone
  const resized = () => { if (raf) resizeDue = true; else resizeNow(); };   // ResizeObserver

  // governor.js levels 0–2 halve the render scale; level 3 only checks whether the last halving paid off. The mean
  // interval, not the median: intervals come in whole vsyncs, and a 70 ms effect's median flips between 66.7 and 83.3 ms
  // from one window to the next, which credits a halving with a 20 % saving it did not make.
  function onLevel(level, _why, s) {
    if (fillBound && pending && s.mean > pending.mean * 0.85) { scale = pending.scale; fillBound = false; }   // saved < 15 %: undo, leave resolution alone
    else if (fillBound && level < SCALES.length && !effect.ownsSize) { pending = { scale, mean: s.mean }; scale = base * SCALES[level]; }
    resizeDue = true;                                                 // called inside tick, after this frame's draw
  }
  const makeGov = (start) => governor ? createGovernor({ levels: SCALES.length + 1, start, refreshMs: refreshMs || 0, capMs: fps ? 1000 / fps : 0, stepUp: false, onChange: onLevel, onFloor: (w) => fail('governor: ' + w) }) : null;

  function tick(now) {
    raf = 0;
    if (!want()) return gov?.pause();
    const elapsed = Math.max(0, now - last);
    if (fps && elapsed < 1000 / fps - 2) { raf = requestAnimationFrame(tick); return; }
    last = now;
    const dt = Math.min(elapsed / 1000, 1 / 20);                      // a long pause never becomes one huge step
    runWall += elapsed / 1000;                                        // settle counts wall time; `last` resets on resume
    let speed = 1, final = false;
    if (settle) {
      const left = settle - runWall;
      speed = left >= easeFor ? 1 : Math.max(0, left / easeFor) ** 2;
      final = runWall + Math.max(elapsed / 1000, 1 / 60) >= settle;   // the next frame would start too late
    }
    t += dt * speed;
    if (resizeDue) { resizeDue = false; sizeCanvas(); }               // cleared here, drawn on the next line
    try { effect.frame(t, dt); } catch (e) { return fail(e.message); }
    gov?.frame(now);
    if (failed) return;
    if (final) { settled = true; gov?.pause(); syncLabel(); return; }  // the last frame stays on screen
    raf = requestAnimationFrame(tick);
  }

  function reveal() { revealed = true; canvas.style.opacity = '1'; ready = true; schedule(); }
  function firstFrame() {
    const gl = handle.gl, cv = canvas;
    if (!(typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext)) return requestAnimationFrame(() => cv === canvas && !failed && reveal());
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const t0 = performance.now();
    const poll = () => {
      if (gl.isContextLost() || cv !== canvas || failed) return;
      if (gl.getSyncParameter(sync, gl.SYNC_STATUS) === gl.SIGNALED || performance.now() - t0 > 10000) { gl.deleteSync(sync); reveal(); }
      else requestAnimationFrame(poll);
    };
    requestAnimationFrame(poll);
  }

  function build() {
    canvas = document.createElement('canvas');
    canvas.className = 'fx';
    canvas.setAttribute('aria-hidden', 'true');
    bg.append(canvas);
    try { handle = effect.init(canvas) || {}; } catch (e) { return fail(e.message); }
    if (effect.kind === 'webgl') {
      canvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();                                           // we restore it ourselves
        lost = true; revealed = false; stop(); canvas.style.opacity = '0';
        if (++losses > 1) fail('WebGL context lost twice');
      });
      canvas.addEventListener('webglcontextrestored', () => {
        if (failed) return;
        try { effect.dispose?.(); } catch { /* the old context is gone anyway */ }
        const old = canvas; lost = false; ready = false;
        gov?.dispose(); gov = makeGov(gov?.level ?? 0);               // a fresh settle for the recompile
        build(); old.remove();                                        // a fresh canvas: the simplest correct restore for any library
      });
    }
    sizeCanvas();
    draw();                                                           // frame 1, even when starting paused or off-screen
    if (!failed) firstFrame();
  }

  gov = makeGov(0);
  build();
  if (failed) return controller();
  ro = new ResizeObserver(resized); ro.observe(bg);
  io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; update(); }); io.observe(bg.closest('.hero') || bg);
  onVis = () => { visible = !document.hidden; update(); };
  onReduce = () => { update(); syncLabel(); };
  onToggle = () => { halted() ? api.play() : api.pause(); };
  document.addEventListener('visibilitychange', onVis);
  reduce.addEventListener('change', onReduce);
  if (toggle) { toggle.hidden = false; toggle.removeAttribute('aria-pressed'); toggle.addEventListener('click', onToggle); syncLabel(); }
  const api = controller();
  return api;

  function controller() {
    return {
      get state() { return { running: !!raf, revealed, paused, settled, lost, failed, why, inView, visible, level: gov?.level ?? 0, scale, canvas: canvas ? [canvas.width, canvas.height] : null }; },
      pause() { paused = true; stop(); syncLabel(); },
      play() { paused = false; optIn = true; if (settled) { settled = false; runWall = 0; } schedule(); syncLabel(); },   // also the reduced-motion opt-in
      dispose() {
        stop(); gov?.dispose(); ro?.disconnect(); io?.disconnect();
        if (onVis) { document.removeEventListener('visibilitychange', onVis); reduce.removeEventListener('change', onReduce); toggle?.removeEventListener('click', onToggle); }
        try { effect.dispose?.(); } catch {}
        canvas?.remove(); failed = true;
      },
    };
  }
}
