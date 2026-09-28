// Worker side of the OffscreenCanvas variant: the same Model and draw2d as the main-thread Canvas 2D.
import { W, H, FREEZE, ASSETS, Model } from '../shared/scene.js';
import { draw2d } from '../shared/draw2d.js';

let m, ctx, atlas, bg, frames, reduced, freeze;
let recording = false, frames_ = [], lat = [], pending = [], last;
const origin = performance.timeOrigin;
const now = () => (freeze ? FREEZE.t : performance.now());

async function init(d) {
  reduced = d.reduced; freeze = d.freeze;
  const get = async (p) => createImageBitmap(await (await fetch(d.base + ASSETS + p)).blob());
  const [j, a, b] = await Promise.all([fetch(d.base + ASSETS + 'atlas.json').then((r) => r.json()), get('atlas.png'), get('bg.png')]);
  frames = {}; for (const [k, v] of Object.entries(j.frames)) frames[k] = v.frame;
  atlas = a; bg = b;
  ctx = d.canvas.getContext('2d', { alpha: false });
  ctx.setTransform(d.dpr, 0, 0, d.dpr, 0, 0);
  m = new Model(d.n, reduced);
  if (freeze) m.freeze();
  schedule();
}

let scheduled = false, first = true;
function frame(ts) {
  scheduled = false;
  if (recording && last !== undefined) frames_.push(ts - last);
  last = ts;
  const t = now();
  m.prune(t);
  draw2d(ctx, m, t, atlas, bg, frames);
  if (pending.length) {
    const done = origin + performance.now();
    for (const p of pending) lat.push({ type: p.type, delay: p.hs - p.ts, toFrame: done - p.ts });
    pending = [];
  }
  if (first) { first = false; postMessage({ type: 'first' }); }
  if (!reduced && !freeze) schedule();
}
function schedule() { if (!scheduled) { scheduled = true; requestAnimationFrame(frame); } }

onmessage = ({ data: d }) => {
  try {
    if (d.type === 'init') return void init(d).catch((e) => postMessage({ type: 'error', message: String(e) }));
    if (d.type === 'start') { recording = true; frames_ = []; lat = []; pending = []; return; }
    if (d.type === 'stop') { recording = false; return; }
    if (d.type === 'stats') return postMessage({ type: 'stats', frames: frames_, lat });
    if (d.type === 'item') return postMessage({ type: 'item', id: d.id, x: m.items[d.id].x, y: m.items[d.id].y });
    if (!m) return;
    const t = now();
    if (d.rec && recording) pending.push({ type: d.type, ts: d.ts, hs: d.hs });
    if (d.type === 'pointerdown') { const id = m.down(d.x, d.y, t); if (id >= 0) postMessage({ type: 'picked', id }); }
    else if (d.type === 'pointermove') { const was = m.hovered; m.move(d.x, d.y, t); if (was !== m.hovered) postMessage({ type: 'cursor', pointer: m.hovered >= 0 }); }
    else if (d.type === 'pointerup' || d.type === 'pointercancel') { if (m.up(t)) postMessage({ type: 'drop' }); }
    if (reduced || freeze) schedule();
  } catch (e) { postMessage({ type: 'error', message: String(e) }); }
};
