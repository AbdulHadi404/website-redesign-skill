// governor.js — a runtime quality governor for a rendering loop (S11, revised after review; supersedes
// governor-v1.js and reconciles it with S10's hero.js governor). Pairs with tier.js. ~1.1 KB min+gzip.
//
// Usage
//   const { refreshMs } = await detectTier();                 // or: const refreshMs = await measureRefresh();
//   const gov = createGovernor({ levels: 4, refreshMs, onChange: (lvl) => applyLevel(lvl), onFloor: showPoster });
//   continuous loop:  function loop(now) { render(); gov.frame(now); requestAnimationFrame(loop); }
//   on-demand loop:   function tick(now) { render(); gov.frame(now); if (stillMoving()) requestAnimationFrame(tick); else gov.pause(); }
//   also call gov.pause() whenever the loop stops for any reason (settled, off-screen, paused by the visitor);
//   a hidden tab pauses it automatically.
//
// Rules
//   - Judge every interval between two frames the loop asked for back to back. A long interval there is the worst kind of
//     slow frame, not a pause: a device running at 3 fps must be caught. The only intervals not judged are the first one
//     after start, after pause() and after the tab was hidden. (v1 skipped every interval > 250 ms as "a pause" and
//     so never judged a scene below ~4 fps.) If the loop cannot report its pauses (e.g. injected into third-party code),
//     pass gapsArePauses: true and accept that blind spot.
//   - The budget is the display's refresh interval MEASURED BEFORE THE SCENE STARTS (tier.js measureRefresh: empty rAF
//     frames), or 1000/60 if none is given; the scene's own intervals may lower that estimate (a faster display) but never
//     raise it. (v1 estimated the refresh from the scene's own fastest intervals, so a scene slow from its first frame
//     raised its own budget and was never judged slow.) Measuring before the scene is what tells a 30 Hz display
//     (WebKit halves rAF in Low Power Mode, under thermal mitigation, in an untouched cross-origin iframe) from a slow
//     scene on a 60 Hz display: both give 33 ms intervals once the scene runs. capMs: the loop's own frame cap.
//   - A window closes after windowFrames frames or windowMs of wall time, whichever comes first (from S10's hero.js),
//     so a slow scene is judged in about a second, not after 45 slow frames.
//   - Step down when the window's p90 > 1.25 × budget (more than 1 frame in 10 missed a refresh) for downWindows windows
//     in a row, or at once when its median > 2 × budget (most frames missed). Ignore settleMs after start and after
//     every change (shader compiles, uploads, JIT).
//   - At the lowest level, still failing, and its median interval over 1.1 × max(budget, 1000/floorFps) (i.e. below
//     ~27 fps at the default floorFps 30 — S10's criterion): call onFloor() once (stop and keep the poster). A scene
//     that holds ~30 fps at the lowest level keeps running. (The first revision gave up on any failing window at the
//     floor; on S10's canvas hero at CPU 6x, a steady 30 fps, that replaced a working animation with the poster.)
//   - Step up (stepUp: true) only after upAfterMs without a failing window, on a window whose p95 ≤ 1.1 × budget, and
//     never back to a level that failed in the last memoryMs. stepUp: false = S10's "only ever step down", fine for decoration.
//   - The governor changes resolution, effect count and tessellation, never the look (same lights, materials, framing).
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
  function set(l, now, why) {
    log.push({ t: Math.round(now), from: level, to: l, why });
    level = l; settleUntil = now + settleMs; win = []; winStart = 0; bad = 0; goodSince = now;
    onChange(level, why);
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
    // call once per rendered frame with the rAF timestamp
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
      win = []; winStart = 0;
      // Fast frames with long gaps between them is the signature of an on-demand loop that never calls pause() (in the
      // lab it walked a mostly idle scene to the lowest level in ~16 s) — or of long tasks from elsewhere on the page.
      if (!warned && p50 <= B * 1.1 && p90 > idleGapMs && typeof console !== 'undefined') { warned = true; console.warn(`governor: fast frames separated by ${Math.round(p90)} ms gaps — if the loop stops between frames, call gov.pause() when it stops`); }
      if (p90 > B * 1.25) {
        goodSince = now;
        bad = p50 > B * 2 ? Math.max(bad + 1, downWindows) : bad + 1;
        if (bad < downWindows) return;
        const why = `${n} frames: p50 ${p50.toFixed(1)} / p90 ${p90.toFixed(1)} ms vs budget ${B.toFixed(1)} ms`;
        if (level < levels - 1) { failedAt[level] = now; set(level + 1, now, why); }
        else if (!floorHit && p50 > 1.1 * Math.max(B, 1000 / floorFps)) { floorHit = true; log.push({ t: Math.round(now), from: level, to: level, floor: true, why }); onFloor(why); }
      } else {
        bad = 0;
        if (stepUp && p95 <= B * 1.1 && level > 0 && now - goodSince >= upAfterMs && now - failedAt[level - 1] >= memoryMs) set(level - 1, now, `p95 ${p95.toFixed(1)} ms steady for ${Math.round((now - goodSince) / 1000)} s`);
      }
    },
  };
}
