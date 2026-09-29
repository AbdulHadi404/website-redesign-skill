// governor.js — a runtime quality governor for a continuously rendering scene (S11). Pairs with tier.js.
//
// Rules (realtime-3d.md §6, made concrete):
//   - judge only runs of continuous frames: a gap > idleGapMs (on-demand rendering, a hidden tab, a pause) ends the
//     run and is never counted as a slow frame;
//   - ignore the first settleMs after start and after every level change (shader compiles, texture uploads, JIT);
//   - the frame budget is the display's own refresh interval, measured (the fastest tenth of recent intervals), not
//     assumed 16.7 ms: a 120 Hz phone exists, and WebKit halves requestAnimationFrame to 30 fps in Low Power Mode,
//     under aggressive thermal mitigation and in a cross-origin iframe the person has not interacted with
//     (WebKit AnimationFrameRate.cpp) — judged against 16.7 ms, all of those would read as a slow device;
//   - step down when the window's p90 interval exceeds 1.25 × the refresh interval (a missed vsync in more than 1 frame
//     in 10) for `downWindows` consecutive windows; step up only after upAfterMs of p95 ≤ 1.1 × refresh interval
//     at the current level, and never back to a level that failed within the last `memoryMs`;
//   - the governor changes resolution, effect count and tessellation — never the look (same lights, materials, framing).
export function createGovernor({ levels = 4, start = 0, windowFrames = 45, downWindows = 2, settleMs = 1500, idleGapMs = 250, upAfterMs = 8000, memoryMs = 30000, onChange = () => {} } = {}) {
  let level = start;                  // 0 = highest quality
  let settleUntil = 0, win = [], bad = 0, goodSince = 0, last = 0;
  const failedAt = new Array(levels).fill(-Infinity);
  const intervals = [];               // for the refresh estimate
  let refresh = 1000 / 60;
  const pct = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
  const log = [];
  function set(l, now, why) {
    if (l === level) return;
    log.push({ t: Math.round(now), from: level, to: l, why });
    level = l; settleUntil = now + settleMs; win = []; bad = 0; goodSince = now;
    onChange(level, why);
  }
  return {
    get level() { return level; },
    get refresh() { return refresh; },
    log,
    // call once per rendered frame with the rAF timestamp
    frame(now) {
      if (!settleUntil) { settleUntil = now + settleMs; goodSince = now; }
      const dt = last ? now - last : 0;
      last = now;
      if (!dt) return;
      if (dt > idleGapMs) { win = []; return; } // a pause, not a slow frame
      intervals.push(dt); if (intervals.length > 240) intervals.shift();
      if (intervals.length >= 60) refresh = Math.max(4, pct(intervals, 0.1)); // the display's interval ≈ the fastest tenth
      if (now < settleUntil) return;
      win.push(dt);
      if (win.length < windowFrames) return;
      const p90 = pct(win, 0.9), p95 = pct(win, 0.95);
      win = [];
      if (p90 > refresh * 1.25) {
        goodSince = now;
        if (++bad >= downWindows && level < levels - 1) { failedAt[level] = now; set(level + 1, now, `p90 ${p90.toFixed(1)} ms > 1.25 × ${refresh.toFixed(1)} ms`); }
      } else {
        bad = 0;
        if (p95 <= refresh * 1.1 && level > 0 && now - goodSince >= upAfterMs && now - failedAt[level - 1] >= memoryMs) set(level - 1, now, `p95 ${p95.toFixed(1)} ms steady for ${Math.round((now - goodSince) / 1000)} s`);
      }
    },
  };
}
