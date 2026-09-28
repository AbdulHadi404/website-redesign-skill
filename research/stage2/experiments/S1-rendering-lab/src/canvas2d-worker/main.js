// Canvas 2D rendered in a dedicated Worker through OffscreenCanvas. The main thread only forwards
// pointer events and updates the DOM counter; drawing, hit testing and the animation loop live in
// the Worker, so main-thread work (a framework render, a parse) cannot stall the animation.
import { W, H, readParams, installHarness } from '../shared/scene.js';

const params = readParams();
const lab = installHarness(__VARIANT__, params);
lab.info.renderer = 'canvas2d-offscreen-worker';
const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
canvas.style.cssText = `width:${W}px;height:${H}px;display:block;touch-action:none`;
const dpr = Math.min(devicePixelRatio || 1, 2);
canvas.width = W * dpr; canvas.height = H * dpr;
stage.append(canvas);

const off = canvas.transferControlToOffscreen();
const worker = new Worker('worker.js');
const origin = performance.timeOrigin;
worker.postMessage({ type: 'init', canvas: off, n: params.n, reduced: params.reduced, freeze: params.freeze, dpr, base: location.origin }, [off]);

let statsResolve = null, pos = {};
worker.onmessage = ({ data }) => {
  if (data.type === 'first') lab.markFirstFrame();
  else if (data.type === 'drop') lab.drop();
  else if (data.type === 'picked') lab.picked.push(data.id);
  else if (data.type === 'cursor') canvas.style.cursor = data.pointer ? 'pointer' : 'default';
  else if (data.type === 'stats') statsResolve?.(data);
  else if (data.type === 'pos') pos = data.pos;
  else if (data.type === 'error') lab.errors.push(data.message);
};
const fwd = (e) => {
  lab.input(e);
  if (e.type === 'pointerdown') canvas.setPointerCapture(e.pointerId);
  worker.postMessage({ type: e.type, x: e.offsetX, y: e.offsetY, ts: origin + e.timeStamp, hs: origin + performance.now(), rec: lab.recording });
};
for (const t of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) canvas.addEventListener(t, fwd);

const origStart = lab.start, origStop = lab.stop;
lab.start = () => { origStart(); worker.postMessage({ type: 'start' }); };
lab.stop = () => { origStop(); worker.postMessage({ type: 'stop' }); };
lab.extraStats = () => new Promise((res) => {
  statsResolve = (d) => res({ mainFrames: lab.frames, frames: d.frames, mainLat: lab.lat, lat: d.lat, js: d.js });
  worker.postMessage({ type: 'stats' });
});
// The runner asks for an item's position; the Worker owns the state, so ask it (async).
lab.getItemAsync = (id) => new Promise((res) => {
  const h = ({ data }) => { if (data.type === 'item' && data.id === id) { worker.removeEventListener('message', h); res({ x: data.x, y: data.y }); } };
  worker.addEventListener('message', h);
  worker.postMessage({ type: 'item', id });
});
lab.topId = () => params.n - 1;
