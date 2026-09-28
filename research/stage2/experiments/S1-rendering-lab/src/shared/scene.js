// The one scene every variant renders, and the measurement harness every variant reports to.
// Everything that decides what is on screen (item positions, bob, particle paths, sizes, the frozen
// pose used for screenshots) lives here, so the variants differ only in how they draw and hit-test.

export const W = 800, H = 600;
export const CELL = 48, RING = 64, SPARK = 16;
export const FRAMES = ['cherry', 'strawberry', 'star', 'heart', 'candle', 'flower', 'macaron', 'leaf'];
export const LABELS = { cherry: 'Cherry', strawberry: 'Strawberry', star: 'Star', heart: 'Heart', candle: 'Candle', flower: 'Flower', macaron: 'Macaron', leaf: 'Leaf' };
export const BOB_AMP = 4, BOB_PERIOD = 1600;          // px, ms
export const HOVER_SCALE = 1.12, SEL_SCALE = 1.18;
export const HIT_R = 22;                              // px, circular hit area
export const P_COUNT = 14, P_LIFE = 600, P_DIST = 56; // particles per drop, ms, px
export const AREA = { x0: 140, x1: 660, y0: 200, y1: 460 };
export const FREEZE = { t: 400, burst: { x: 400, y: 330, age: 200 } };
export const ASSETS = '/assets/';

export function readParams(search = (typeof location !== 'undefined' ? location.search : '')) {
  const q = new URLSearchParams(search);
  return {
    n: Number(q.get('n')) || 200,
    freeze: q.has('freeze'),
    load: Number(q.get('load')) || 0,
    idle: q.has('idle'),
    reduced: typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
}

export function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeItems(n) {
  const r = mulberry32(42);
  const items = [];
  for (let i = 0; i < n; i++) {
    items.push({
      id: i,
      frame: FRAMES[Math.floor(r() * FRAMES.length)],
      x: Math.round(AREA.x0 + r() * (AREA.x1 - AREA.x0)),
      y: Math.round(AREA.y0 + r() * (AREA.y1 - AREA.y0)),
      phase: r(),
    });
  }
  return items;
}

export const bobY = (it, t) => -BOB_AMP * Math.sin(2 * Math.PI * (t / BOB_PERIOD + it.phase));
export const itemLabel = (it, n) => `${LABELS[it.frame]} ${it.id + 1} of ${n}`;

/** Particle i of a burst at `age` ms: offset, alpha, scale; null when finished. */
export function particle(i, age) {
  const u = age / P_LIFE;
  if (u >= 1 || u < 0) return null;
  const e = 1 - (1 - u) ** 3;
  const a = (2 * Math.PI * i) / P_COUNT;
  return { dx: Math.cos(a) * P_DIST * e, dy: Math.sin(a) * P_DIST * e, alpha: 1 - u, scale: 1 - 0.5 * u };
}

export const clampX = (x) => Math.max(24, Math.min(W - 24, x));
export const clampY = (y) => Math.max(24, Math.min(H - 24, y));

/**
 * Plain scene state, used by the variants that do their own hit testing (Canvas 2D, the Worker, three.js).
 * `order` is the draw order, bottom to top; picking an item raises it.
 */
export class Model {
  constructor(n, reduced = false) {
    this.n = n; this.reduced = reduced;
    this.items = makeItems(n);
    this.order = this.items.map((it) => it.id);
    this.hovered = -1; this.selected = -1; this.drag = null; this.bursts = [];
    this.dirty = true;
  }
  scale(id) {
    if (this.drag?.id === id || this.selected === id) return SEL_SCALE;
    return this.hovered === id ? HOVER_SCALE : 1;
  }
  y(it, t) { return it.y + (this.reduced || this.drag?.id === it.id ? 0 : bobY(it, t)); }
  hit(px, py, t) {
    for (let k = this.order.length - 1; k >= 0; k--) {
      const it = this.items[this.order[k]];
      const dx = px - it.x, dy = py - this.y(it, t);
      if (dx * dx + dy * dy <= HIT_R * HIT_R) return it.id;
    }
    return -1;
  }
  raise(id) {
    const k = this.order.indexOf(id);
    if (k >= 0) { this.order.splice(k, 1); this.order.push(id); }
  }
  down(px, py, t) {
    const id = this.hit(px, py, t);
    this.dirty = true;
    if (id < 0) { this.selected = -1; return -1; }
    const it = this.items[id];
    this.selected = id; this.hovered = id;
    this.drag = { id, ox: px - it.x, oy: py - it.y };
    this.raise(id);
    return id;
  }
  move(px, py, t) {
    if (this.drag) {
      const it = this.items[this.drag.id];
      it.x = clampX(px - this.drag.ox); it.y = clampY(py - this.drag.oy);
      this.dirty = true;
      return true;
    }
    const h = this.hit(px, py, t);
    if (h !== this.hovered) { this.hovered = h; this.dirty = true; }
    return false;
  }
  up(t) {
    if (!this.drag) return null;
    const it = this.items[this.drag.id];
    this.drag = null; this.dirty = true;
    if (!this.reduced) this.bursts.push({ x: it.x, y: it.y, t0: t });
    return it;
  }
  prune(t) { if (this.bursts.length) this.bursts = this.bursts.filter((b) => t - b.t0 < P_LIFE); }
  freeze() {
    // The pose every variant shows for screenshots: top item selected, the one below hovered, one burst.
    this.selected = this.n - 1; this.hovered = this.n > 1 ? this.n - 2 : -1;
    this.bursts = [{ x: FREEZE.burst.x, y: FREEZE.burst.y, t0: FREEZE.t - FREEZE.burst.age }];
  }
}

// ---------------------------------------------------------------------------------------------
// Measurement harness: window.__lab. The runner (lib/measure.mjs) reads it.
// ---------------------------------------------------------------------------------------------
export function installHarness(variant, params) {
  const lab = {
    variant, params, info: { renderer: null }, ttff: null, errors: [],
    frames: [], recording: false, lat: [], pending: [], ev: [], drops: 0, picked: [], js: [], rafCalls: 0,
    getItem: null, extraStats: null,
  };
  if (typeof window === 'undefined') return lab;
  window.__lab = lab;
  addEventListener('error', (e) => lab.errors.push(String(e.message || e.error)));
  addEventListener('unhandledrejection', (e) => lab.errors.push(String(e.reason?.message || e.reason)));
  lab.markFirstFrame = () => { if (lab.ttff == null) lab.ttff = performance.now(); };
  lab.start = () => { lab.frames = []; lab.lat = []; lab.ev = []; lab.js = []; lab.rafCalls = 0; lab.recording = true; };
  // JS time the scene spends per frame in its own update + render call (engine CPU cost, GPU-independent:
  // WebGL calls are queued to the GPU process, so this excludes GPU work and waits for it).
  lab.cpu = (ms) => { if (lab.recording) lab.js.push(ms); };
  // Count requestAnimationFrame calls made by the page (the harness's own loop is not counted).
  const raf = window.requestAnimationFrame.bind(window);
  lab.raf = raf;
  window.requestAnimationFrame = (cb) => { if (lab.recording) lab.rafCalls++; return raf(cb); };
  lab.stop = () => { lab.recording = false; };
  // Input → frame: pending inputs resolve in a task posted after the next frame's rendering work.
  const ch = new MessageChannel();
  let batch = [];
  ch.port1.onmessage = () => {
    const now = performance.now();
    for (const p of batch) lab.lat.push({ type: p.type, delay: p.hs - p.ts, toFrame: now - p.ts });
    batch = [];
  };
  lab.input = (ev) => { if (lab.recording) lab.pending.push({ type: ev.type, ts: ev.timeStamp, hs: performance.now() }); };
  if (!params.idle) {
    let last;
    const loop = (t) => {
      if (lab.recording && last !== undefined) lab.frames.push(t - last);
      last = t;
      if (lab.pending.length) { batch.push(...lab.pending); lab.pending = []; ch.port2.postMessage(0); }
      raf(loop);
    };
    raf(loop);
  }
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (!lab.recording) continue;
        lab.ev.push({ name: e.name, dur: e.duration, delay: e.processingStart - e.startTime, proc: e.processingEnd - e.processingStart, id: e.interactionId });
      }
    }).observe({ type: 'event', durationThreshold: 16, buffered: false });
  } catch { /* Event Timing unsupported */ }
  lab.drop = () => {
    lab.drops++;
    const out = document.getElementById('count');
    if (out) out.textContent = String(lab.drops);
  };
  lab.stats = async () => {
    const base = { variant, info: lab.info, ttff: lab.ttff, frames: lab.frames, lat: lab.lat, ev: lab.ev, drops: lab.drops, picked: lab.picked, errors: lab.errors, js: lab.js, rafCalls: lab.rafCalls };
    return lab.extraStats ? { ...base, ...(await lab.extraStats()) } : base;
  };
  if (params.load) {
    // Simulated app work on the main thread (a framework re-render, a JSON parse): `load` ms every 100 ms.
    setInterval(() => { const end = performance.now() + params.load; while (performance.now() < end) { /* busy */ } }, 100);
  }
  return lab;
}

export function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => img.decode().then(() => res(img), () => res(img));
    img.onerror = rej;
    img.src = src;
  });
}

export async function loadAtlas() {
  const r = await fetch(ASSETS + 'atlas.json');
  const j = await r.json();
  const frames = {};
  for (const [k, v] of Object.entries(j.frames)) frames[k] = v.frame;
  return { frames, w: j.meta.size.w, h: j.meta.size.h };
}
