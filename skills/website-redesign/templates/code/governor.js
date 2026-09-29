// governor.js — the runtime quality governor for a rendering loop. It steps quality down when frames are slow, gives up
// (onFloor) when even the lowest level runs below ~27 fps, and can step back up. No dependencies, ~1.1 KB min+gzip.
// One governor for the whole skill: 3D scenes (realtime-3d.md §6) and generative backgrounds (hero-effect.js, with
// stepUp: false). Pairs with tier.js, whose measureRefresh() gives it its budget. Copy it into the project and keep
// this header.
//
// Contract
//   const refreshMs = await measureRefresh();   // tier.js, WHILE ONLY THE POSTER IS ON SCREEN (see "Budget" below)
//   const gov = createGovernor({ levels: 4, refreshMs, onChange: (level, why, stats) => applyLevel(level), onFloor: showPoster });
//   continuous loop:  function loop(now) { render(); gov.frame(now); requestAnimationFrame(loop); }
//   on-demand loop:   function tick(now) { render(); gov.frame(now); if (stillMoving()) requestAnimationFrame(tick); else gov.pause(); }
//   - frame(now): once per rendered frame, with the requestAnimationFrame timestamp.
//   - pause(): whenever the loop stops for any reason (settled, on-demand idle, off-screen, paused by the visitor). A
//     hidden tab pauses it by itself. Forgetting pause() in an on-demand loop walks a mostly idle scene down to the
//     lowest level (measured: 3 false step-downs from 4.2 s) and prints a console warning.
//   - onChange(level, why, stats): level 0 is full quality, levels − 1 the lowest. Change resolution, effect count or
//     tessellation, never the look (same lights, materials, framing, UI and actions). stats is the window that decided
//     it: { n, p50, p90, p95, budget } in ms.
//   - onFloor(why, stats): called once, at the lowest level, when the median is still below ~27 fps: stop the loop
//     and keep (or fade back to) the poster. A scene holding ~30 fps at the lowest level keeps running.
//   - level, refresh, floor (getters), log (every change), dispose() (removes the visibilitychange listener).
//
// Rules
//   - Every interval between two frames the loop asked for back to back is judged, a 300 ms one included: that is the
//     worst kind of slow frame, not a pause. Only the first interval after start, after pause() and after a hidden tab
//     is skipped. (Governor v1 skipped every interval over 250 ms as "a pause" and never judged a scene below ~4 fps.)
//     If the loop cannot report its pauses (e.g. hooked into third-party code), pass gapsArePauses: true and accept
//     that blind spot.
//   - Budget: the display refresh interval MEASURED BEFORE THE SCENE STARTS (refreshMs), or 1000/60 when none is
//     given. The scene's own intervals may lower it (a faster display) but never raise it: once a scene runs, a steady
//     30 fps scene on a 60 Hz display and a 30 Hz display (e.g. WebKit halving rAF in Low Power Mode, under thermal
//     mitigation or in an untouched cross-origin iframe) both give 33 ms intervals, and 33 ms alone cannot tell them
//     apart. capMs: the loop's own frame cap (a 30 fps cap → 33.3), which the budget never goes below.
//   - Windows close after windowFrames frames or windowMs of wall time, whichever comes first, so a slow scene is judged
//     in about a second. Step down when a window's p90 > 1.25 × budget for downWindows windows in a row, or at once when
//     its median > 2 × budget. settleMs after start and after every change is not judged (shader compiles, uploads).
//   - Floor: at the lowest level, still failing, and the median over 1.1 × max(budget, 1000/floorFps) → onFloor().
//   - Step up (stepUp: true) only after upAfterMs without a failing window, on a window whose p95 ≤ 1.1 × budget, and
//     never back to a level that failed in the last memoryMs. So recovery takes at least 30 s after a step-down by
//     design: a transient hitch costs ≥ 30 s of reduced quality. stepUp: false only ever steps down (decoration).
//
// What was tested [L, research/stage2/experiments/S11-loading-tiers-offmain: headless Chromium, CDP CPU throttling,
// 3 runs per cell, host load 4–12; SwiftShader for WebGL; no real GPU or phone]:
//   - 1× → 6× at 6 s → 1× at 18 s: down 1.6–1.7 s after the throttle, back up 19.8–20.0 s after the release (3/3).
//   - 6× from the first frame: first step-down at 2.5 s. 300/200/120/80 ms per frame (below 4 fps at every level):
//     lowest level, then onFloor at 9.8–9.9 s.
//   - On-demand bursts with pause(): 0 changes (a drei PerformanceMonitor port: 2 false step-downs in every run).
//   - A 30 Hz display with the refresh measured first: 0 changes (a fixed 16.7 ms budget, S10's first governor and
//     drei's 40 fps bound: 3 false walks to the lowest level).
//   - Held out, on pages it was not written on (three S10 hero builds and tools/regress/fixtures/capture-webgl.html at
//     CPU 1/4/6×, hooked into each page's own rAF, judging only): onFloor at 9.6–10.3 s on a 2–4 fps SwiftShader scene
//     in 6 of 6 runs (v1: 0 step-downs); steady 30 fps scenes kept running; no page errors. Recovery was not testable
//     there (the hook cannot change what the page renders).
//   - Synthetic frame streams in Node, deterministic: tools/regress.mjs, group templates.
// [K] set in emulation, not validated on devices: the 1.25 × p90 and 2 × median thresholds, 45 frames / 1 s windows,
// the 1.5 s settle, 8 s before a step up, the 30 s memory and the ~27 fps give-up. Not tested: 120 Hz displays,
// thermal throttling, and adapters for R3F frameloop="demand" or three's setAnimationLoop (both need pause()).
export function createGovernor({
  levels = 4, start = 0, refreshMs = 0, capMs = 0,
  windowFrames = 45, windowMs = 1000, downWindows = 2, settleMs = 1500,
  stepUp = true, upAfterMs = 8000, memoryMs = 30000, floorFps = 30,
  gapsArePauses = false, idleGapMs = 250,
  onChange = () => {}, onFloor = () => {},
} = {}) {
  let level = Math.min(start, levels - 1);
  const ceiling = refreshMs > 0 ? refreshMs : 1000 / 60;
  let refresh = ceiling;
  let settleUntil = 0, last = 0, win = [], winStart = 0, bad = 0, goodSince = 0, floorHit = false, warned = false;
  const failedAt = new Array(levels).fill(-Infinity);
  const recent = [];
  const log = [];
  const pct = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
  const budget = () => Math.max(refresh, capMs || 0);
  function set(l, now, why, stats) {
    log.push({ t: Math.round(now), from: level, to: l, why });
    level = l; settleUntil = now + settleMs; win = []; winStart = 0; bad = 0; goodSince = now;
    onChange(level, why, stats);
  }
  function pause() { last = 0; win = []; winStart = 0; }
  const onVis = () => { if (typeof document !== 'undefined' && document.hidden) pause(); };
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVis);
  return {
    get level() { return level; },
    get refresh() { return refresh; },
    get floor() { return floorHit; },
    log,
    pause,
    dispose() { if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVis); },
    frame(now) {
      if (!settleUntil) { settleUntil = now + settleMs; goodSince = now; }
      if (!last) { last = now; return; }                 // first frame of a run: no interval to judge
      const dt = now - last;
      last = now;
      if (!(dt > 0)) return;
      if (gapsArePauses && dt > idleGapMs) { win = []; winStart = 0; return; }
      recent.push(dt); if (recent.length > 240) recent.shift();
      if (recent.length >= 60) refresh = Math.min(ceiling, Math.max(4, pct(recent, 0.1))); // may fall, never rise
      if (now < settleUntil) return;
      if (!winStart) winStart = now - dt;
      win.push(dt);
      if (win.length < windowFrames && !(now - winStart >= windowMs && win.length >= 2)) return;
      const B = budget(), n = win.length, p50 = [...win].sort((a, b) => a - b)[(n - 1) >> 1], p90 = pct(win, 0.9), p95 = pct(win, 0.95); // lower median: conservative on small windows
      const stats = { n, p50, p90, p95, budget: B };
      win = []; winStart = 0;
      // Fast frames with long gaps between them: an on-demand loop that never calls pause(), or long tasks elsewhere.
      if (!warned && p50 <= B * 1.1 && p90 > idleGapMs && typeof console !== 'undefined') { warned = true; console.warn(`governor: fast frames separated by ${Math.round(p90)} ms gaps — if the loop stops between frames, call gov.pause() when it stops`); }
      if (p90 > B * 1.25) {
        goodSince = now;
        bad = p50 > B * 2 ? Math.max(bad + 1, downWindows) : bad + 1;
        if (bad < downWindows) return;
        const why = `${n} frames: p50 ${p50.toFixed(1)} / p90 ${p90.toFixed(1)} ms vs budget ${B.toFixed(1)} ms`;
        if (level < levels - 1) { failedAt[level] = now; set(level + 1, now, why, stats); }
        else if (!floorHit && p50 > 1.1 * Math.max(B, 1000 / floorFps)) { floorHit = true; log.push({ t: Math.round(now), from: level, to: level, floor: true, why }); onFloor(why, stats); }
      } else {
        bad = 0;
        if (stepUp && p95 <= B * 1.1 && level > 0 && now - goodSince >= upAfterMs && now - failedAt[level - 1] >= memoryMs) set(level - 1, now, `p95 ${p95.toFixed(1)} ms steady for ${Math.round((now - goodSince) / 1000)} s`, stats);
      }
    },
  };
}
