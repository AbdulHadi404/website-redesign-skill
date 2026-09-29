// Canvas 2D on the main thread: one drawImage per sprite from the atlas, own hit testing, own loop.
import { W, H, FREEZE, ASSETS, readParams, installHarness, Model, loadImage, loadAtlas } from '../shared/scene.js';
import { draw2d } from '../shared/draw2d.js';

const params = readParams();
const lab = installHarness(__VARIANT__, params);
const stage = document.getElementById('stage');
const [{ frames }, atlas, bg] = await Promise.all([loadAtlas(), loadImage(ASSETS + 'atlas.png'), loadImage(ASSETS + 'bg.png')]);

const dpr = Math.min(devicePixelRatio || 1, 2);
const canvas = document.createElement('canvas');
canvas.width = W * dpr; canvas.height = H * dpr;
canvas.style.cssText = `width:${W}px;height:${H}px;display:block;touch-action:none`;
stage.append(canvas);
const ctx = canvas.getContext('2d', { alpha: false });
lab.info.renderer = ctx ? 'canvas2d' : null;
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

const m = new Model(params.n, params.reduced);
if (params.freeze) m.freeze();
const now = () => (params.freeze ? FREEZE.t : performance.now());

let scheduled = false;
function frame() {
  scheduled = false;
  const t0 = performance.now();
  const t = now();
  m.prune(t);
  draw2d(ctx, m, t, atlas, bg, frames);
  m.dirty = false;
  lab.cpu(performance.now() - t0);
  lab.markFirstFrame();
  if (!params.reduced && !params.freeze) schedule();
}
function schedule() { if (!scheduled) { scheduled = true; requestAnimationFrame(frame); } }
const invalidate = () => { if (params.reduced || params.freeze) schedule(); };

canvas.addEventListener('pointerdown', (e) => {
  lab.input(e);
  const id = m.down(e.offsetX, e.offsetY, now());
  if (id >= 0) { canvas.setPointerCapture(e.pointerId); lab.picked.push(id); }
  invalidate();
});
canvas.addEventListener('pointermove', (e) => {
  lab.input(e);
  m.move(e.offsetX, e.offsetY, now());
  canvas.style.cursor = m.drag || m.hovered >= 0 ? 'pointer' : 'default';
  if (m.dirty) invalidate();
});
const end = (e) => { lab.input(e); if (m.up(now())) lab.drop(); invalidate(); };
canvas.addEventListener('pointerup', end);
canvas.addEventListener('pointercancel', end);

lab.getItem = (id) => ({ x: m.items[id].x, y: m.items[id].y });
lab.topId = () => m.order[m.order.length - 1];
schedule();
