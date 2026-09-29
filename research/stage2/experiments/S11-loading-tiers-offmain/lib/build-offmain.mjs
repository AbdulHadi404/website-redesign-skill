// Fixtures for the off-main-thread experiment: a ~22 MB JSON dataset (200k records), the same as NDJSON, and a
// ~2.6 MB columnar binary; one page that runs the same job seven ways while the harness taps a button every 100 ms.
import { mkdir, writeFile, cp, stat } from 'node:fs/promises';
import { gzipSync, constants } from 'node:zlib';
import path from 'node:path';
import { here, siteRoot } from './common.mjs';

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const CATS = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel'];

export async function buildOffmain({ n = 200000 } = {}) {
  const dir = path.join(siteRoot, 'offmain');
  await mkdir(dir, { recursive: true });
  await cp(path.join(here, 'node_modules/comlink/dist/esm/comlink.mjs'), path.join(siteRoot, 'vendor/comlink.mjs'));
  const r = rng(7);
  const recs = [];
  const lat = new Float32Array(n), lon = new Float32Array(n), val = new Float32Array(n), cat = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const c = Math.floor(r() * 8);
    const rec = { id: 100000 + i, t: 1719000000000 + i * 1000, lat: +(48 + r() * 6).toFixed(6), lon: +(2 + r() * 12).toFixed(6), v: +(r() * r() * 1000).toFixed(3), cat: CATS[c], ok: r() > 0.1, tags: ['t' + Math.floor(r() * 20), 't' + Math.floor(r() * 20)] };
    recs.push(rec); lat[i] = rec.lat; lon[i] = rec.lon; val[i] = rec.v; cat[i] = c;
  }
  const json = JSON.stringify(recs);
  // Added after review: the same data with only the four fields the view uses, as objects and as columns, to split the
  // binary's speed-up into "fewer fields" and "typed columnar layout".
  const json4 = JSON.stringify(recs.map((x) => ({ lat: x.lat, lon: x.lon, v: x.v, cat: x.cat })));
  const json4c = JSON.stringify({ n, lat: recs.map((x) => x.lat), lon: recs.map((x) => x.lon), v: recs.map((x) => x.v), cat: Array.from(cat) });
  const ndjson = recs.map((x) => JSON.stringify(x)).join('\n') + '\n';
  const bin = Buffer.concat([Buffer.from(new Uint32Array([n]).buffer), Buffer.from(lat.buffer), Buffer.from(lon.buffer), Buffer.from(val.buffer), Buffer.from(cat.buffer)]);
  const put = async (name, data, compress = true) => { await writeFile(path.join(dir, name), data); if (compress) await writeFile(path.join(dir, name + '.gz'), gzipSync(data, { level: constants.Z_BEST_SPEED })); };
  await put('data.json', json); await put('data.ndjson', ndjson); await put('data.bin', bin);
  await put('data4.json', json4); await put('data4c.json', json4c);

  // The job, shared by the page and the workers: aggregates per category, a 64-bin histogram of v, a 128×128
  // density grid, the top 50 by v, and the points as a Float32Array for drawing.
  await writeFile(path.join(dir, 'job.js'), `
export const CATS = ${JSON.stringify(CATS)};
export function makeAcc(n) { return { n: 0, count: new Float64Array(8), sum: new Float64Array(8), hist: new Uint32Array(64), grid: new Uint32Array(128 * 128), top: [], pts: new Float32Array(n * 2) }; }
const ci = Object.fromEntries(${JSON.stringify(CATS)}.map((c, i) => [c, i]));
export function addRecords(A, recs, from = 0, to = recs.length) {
  for (let i = from; i < to; i++) { const r = recs[i]; addOne(A, r.lat, r.lon, r.v, ci[r.cat]); }
}
export function addOne(A, la, lo, v, c) {
  const i = A.n++;
  A.count[c]++; A.sum[c] += v;
  A.hist[Math.min(63, Math.floor(v / 1000 * 64))]++;
  const gx = Math.min(127, Math.floor((lo - 2) / 12 * 128)), gy = Math.min(127, Math.floor((la - 48) / 6 * 128));
  A.grid[gy * 128 + gx]++;
  A.pts[i * 2] = lo; A.pts[i * 2 + 1] = la;
  if (A.top.length < 50 || v > A.top[A.top.length - 1]) { A.top.push(v); A.top.sort((a, b) => b - a); if (A.top.length > 50) A.top.pop(); }
}
export function addBinary(A, buf) {
  const n = new Uint32Array(buf, 0, 1)[0];
  const la = new Float32Array(buf, 4, n), lo = new Float32Array(buf, 4 + n * 4, n), v = new Float32Array(buf, 4 + n * 8, n), c = new Uint8Array(buf, 4 + n * 12, n);
  for (let i = 0; i < n; i++) addOne(A, la[i], lo[i], v[i], c[i]);
}
export function summary(A) { return { n: A.n, mean: Array.from(A.sum, (s, i) => s / (A.count[i] || 1)), hist: Array.from(A.hist), top: A.top.slice(0, 5), gridMax: Math.max(...A.grid) }; }
`);

  // Worker (Comlink): fetch + parse + job; returns the summary and transfers the points.
  await writeFile(path.join(dir, 'worker-comlink.js'), `import * as Comlink from '/vendor/comlink.mjs';
import { makeAcc, addRecords, summary } from './job.js';
Comlink.expose({
  async run(url) {
    const recs = await (await fetch(url)).json();
    const A = makeAcc(recs.length); addRecords(A, recs);
    return Comlink.transfer({ summary: summary(A), pts: A.pts }, [A.pts.buffer]);
  },
});`);
  // Worker that hands the whole parsed array back (the structured-clone trap).
  await writeFile(path.join(dir, 'worker-clone.js'), `self.onmessage = async (e) => { const recs = await (await fetch(e.data)).json(); self.postMessage(recs); };`);
  // Streaming worker: NDJSON through the body stream, partial summaries every 20k records.
  await writeFile(path.join(dir, 'worker-stream.js'), `import { makeAcc, addOne, summary, CATS } from './job.js';
const ci = Object.fromEntries(CATS.map((c, i) => [c, i]));
self.onmessage = async (e) => {
  const res = await fetch(e.data.url);
  const A = makeAcc(e.data.n);
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = '', next = 20000;
  for (;;) {
    const { value, done } = await reader.read();
    if (value) buf += value;
    let nl;
    while ((nl = buf.indexOf('\\n')) >= 0) { const line = buf.slice(0, nl); buf = buf.slice(nl + 1); if (!line) continue; const r = JSON.parse(line); addOne(A, r.lat, r.lon, r.v, ci[r.cat]); }
    if (A.n >= next || done) { next += 20000; self.postMessage({ partial: !done, summary: summary(A) }); }
    if (done) break;
  }
  self.postMessage({ final: true, summary: summary(A), pts: A.pts }, [A.pts.buffer]);
};`);
  // Throttle check: a fixed loop in a worker and on the main thread.
  await writeFile(path.join(dir, 'worker-spin.js'), `self.onmessage = () => { const t = performance.now(); let s = 0; for (let i = 0; i < 3e7; i++) s += Math.sqrt(i) * 1e-9; self.postMessage(performance.now() - t); };`);
  // postMessage cost: the worker sends a payload; the page times reading e.data (deserialisation happens there).
  await writeFile(path.join(dir, 'worker-payload.js'), `let recs = null;
self.onmessage = async (e) => {
  const kind = e.data;
  if (!recs) recs = await (await fetch('data.json')).json();
  if (kind === 'objects') self.postMessage(recs);
  else if (kind === 'objects-20k') self.postMessage(recs.slice(0, 20000));
  else if (kind === 'json-string') self.postMessage(JSON.stringify(recs));
  else { const f = new Float32Array(recs.length * 2); for (let i = 0; i < recs.length; i++) { f[i * 2] = recs[i].lon; f[i * 2 + 1] = recs[i].lat; }
    if (kind === 'typed-copy') self.postMessage(f); else self.postMessage(f, [f.buffer]); }
};`);

  await writeFile(path.join(dir, 'index.html'), `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width">
<title>off main thread</title>
<style>body{margin:0;font:16px system-ui;padding:16px}#tap{font:inherit;padding:10px 16px}#spin{width:40px;height:40px;background:#e8b04a;animation:r 1s linear infinite}@keyframes r{to{transform:rotate(360deg)}}</style>
<button id=tap>Tap me <span id=count>0</span></button><div id=spin></div><p id=status>idle</p><pre id=out></pre>
<script type=module>
import { makeAcc, addRecords, addBinary, addOne, summary, CATS } from './job.js';
const ci = Object.fromEntries(CATS.map((c, i) => [c, i]));
const $ = (s) => document.querySelector(s);
let taps = 0;
$('#tap').addEventListener('click', () => { $('#count').textContent = ++taps; });
const W = window.__w = { events: [], gaps: [], loaf: [] };
new PerformanceObserver((l) => l.getEntries().forEach((e) => W.events.push({ name: e.name, start: e.startTime, dur: e.duration, delay: e.processingStart - e.startTime, id: e.interactionId }))).observe({ type: 'event', durationThreshold: 16, buffered: true });
try { new PerformanceObserver((l) => l.getEntries().forEach((e) => W.loaf.push([e.startTime, e.duration, e.blockingDuration]))).observe({ type: 'long-animation-frame', buffered: true }); } catch {}
let last = 0; const frame = (t) => { if (last) W.gaps.push([t, t - last]); last = t; requestAnimationFrame(frame); }; requestAnimationFrame(frame);
const show = (s, partial) => { $('#out').textContent = JSON.stringify(s).slice(0, 300); if (!W.first) W.first = performance.now(); if (!partial) $('#status').textContent = 'done'; };
const yieldNow = () => (globalThis.scheduler?.yield ? scheduler.yield() : new Promise((r) => setTimeout(r, 0)));
const JOBS = {
  async main() { const recs = await (await fetch('data.json')).json(); const A = makeAcc(recs.length); addRecords(A, recs); show(summary(A)); },
  async 'main-yield'() { const text = await (await fetch('data.json')).text(); const recs = JSON.parse(text); const A = makeAcc(recs.length);
    for (let i = 0; i < recs.length; i += 5000) { addRecords(A, recs, i, Math.min(recs.length, i + 5000)); await yieldNow(); } show(summary(A)); },
  async worker() { const Comlink = await import('/vendor/comlink.mjs'); const w = Comlink.wrap(new Worker('worker-comlink.js', { type: 'module' }));
    const r = await w.run(new URL('data.json', location.href).href); W.ptsBytes = r.pts.byteLength; show(r.summary); },
  async 'worker-clone'() { const w = new Worker('worker-clone.js'); const recs = await new Promise((res) => { w.onmessage = (e) => { const t = performance.now(); const d = e.data; W.deser = performance.now() - t; res(d); }; w.postMessage(new URL('data.json', location.href).href); });
    const A = makeAcc(recs.length); addRecords(A, recs); show(summary(A)); },
  async 'worker-stream'() { const w = new Worker('worker-stream.js', { type: 'module' }); await new Promise((res) => { w.onmessage = (e) => { if (e.data.final) { W.ptsBytes = e.data.pts.byteLength; show(e.data.summary); res(); } else show(e.data.summary, true); }; w.postMessage({ url: new URL('data.ndjson', location.href).href, n: 200000 }); }); },
  async 'main-stream'() { const res = await fetch('data.ndjson'); const A = makeAcc(200000); const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buf = '', next = 20000, t = performance.now();
    for (;;) { const { value, done } = await reader.read(); if (value) buf += value; let nl;
      while ((nl = buf.indexOf('\\n')) >= 0) { const line = buf.slice(0, nl); buf = buf.slice(nl + 1); if (!line) continue; const r = JSON.parse(line); addOne(A, r.lat, r.lon, r.v, ci[r.cat]);
        if (performance.now() - t > 8) { await yieldNow(); t = performance.now(); } }
      if (A.n >= next || done) { next += 20000; show(summary(A), !done); } if (done) break; } },
  async 'json4-main'() { const recs = await (await fetch('data4.json')).json(); const A = makeAcc(recs.length); addRecords(A, recs); show(summary(A)); },
  async 'json4col-main'() { const d = await (await fetch('data4c.json')).json(); const A = makeAcc(d.n); for (let i = 0; i < d.n; i++) addOne(A, d.lat[i], d.lon[i], d.v[i], d.cat[i]); show(summary(A)); },
  async 'binary-main'() { const buf = await (await fetch('data.bin')).arrayBuffer(); const A = makeAcc(new Uint32Array(buf, 0, 1)[0]); addBinary(A, buf); show(summary(A)); },
};
window.__run = async (name) => { W.first = 0; $('#status').textContent = 'working'; const t = performance.now(); W.t0 = t; await JOBS[name](); W.t1 = performance.now(); return { ms: W.t1 - t, first: W.first - t }; };
window.__spin = async () => { const w = new Worker('worker-spin.js'); const wk = await new Promise((r) => { w.onmessage = (e) => r(e.data); w.postMessage(0); });
  const t = performance.now(); let s = 0; for (let i = 0; i < 3e7; i++) s += Math.sqrt(i) * 1e-9; return { worker: wk, main: performance.now() - t }; };
window.__payload = async (kind) => { const w = window.__pw ||= new Worker('worker-payload.js');
  return new Promise((res) => { const t0 = performance.now(); w.onmessage = (e) => { const t = performance.now(); let d = e.data; const deser = performance.now() - t; let parse = 0; if (typeof d === 'string') { const p = performance.now(); d = JSON.parse(d); parse = performance.now() - p; } res({ deser, parse, total: performance.now() - t0 }); }; w.postMessage(kind); }); };
</script>`);
  // Heavy visuals: the same particle animation drawn on the main thread or in a worker through OffscreenCanvas,
  // while the harness taps a button. ?mode=main|offscreen&n=<points>&ms=<duration>
  const ANIM = `
function makeScene(n, w, h) { const P = new Float32Array(n * 4); let s = 7; const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < n; i++) { P[i * 4] = r() * w; P[i * 4 + 1] = r() * h; P[i * 4 + 2] = r() - 0.5; P[i * 4 + 3] = r() - 0.5; }
  return function draw(g) { g.fillStyle = '#15171d'; g.fillRect(0, 0, w, h); g.fillStyle = '#e8b04a';
    for (let i = 0; i < n; i++) { const k = i * 4; let x = P[k] + P[k + 2], y = P[k + 1] + P[k + 3];
      if (x < 0 || x > w) { P[k + 2] = -P[k + 2]; x = P[k]; } if (y < 0 || y > h) { P[k + 3] = -P[k + 3]; y = P[k + 1]; }
      P[k] = x; P[k + 1] = y; g.fillRect(x, y, 2, 2); } }; }
function animate(g, n, w, h, ms, raf, done) { const draw = makeScene(n, w, h); const t0 = performance.now(); const iv = []; let last = 0, work = [];
  const loop = (t) => { if (last) iv.push(t - last); last = t; const s = performance.now(); draw(g); work.push(performance.now() - s);
    if (performance.now() - t0 < ms) raf(loop); else done({ frames: iv.length + 1, ms: performance.now() - t0, intervals: iv, workMedian: work.sort((a, b) => a - b)[work.length >> 1] }); };
  raf(loop); }`;
  await writeFile(path.join(dir, 'anim.js'), ANIM + '\nexport { makeScene, animate };');
  await writeFile(path.join(dir, 'worker-visual.js'), `import { animate } from './anim.js';
self.onmessage = (e) => { const { canvas, n, ms } = e.data; const g = canvas.getContext('2d');
  animate(g, n, canvas.width, canvas.height, ms, (f) => (self.requestAnimationFrame ? self.requestAnimationFrame(f) : setTimeout(() => f(performance.now()), 16)), (r) => self.postMessage(r)); };`);
  await writeFile(path.join(dir, 'visual.html'), `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width">
<title>heavy visual</title>
<style>body{margin:0;font:16px system-ui;padding:16px}#tap{font:inherit;padding:10px 16px}canvas{display:block;width:390px;height:300px;margin-top:12px}</style>
<button id=tap>Tap me <span id=count>0</span></button><canvas id=cv width=390 height=300></canvas>
<script type=module>
import { animate } from './anim.js';
const q = new URLSearchParams(location.search);
const $ = (s) => document.querySelector(s);
let taps = 0;
$('#tap').addEventListener('click', () => { $('#count').textContent = ++taps; });
const W = window.__w = { events: [], gaps: [], loaf: [] };
new PerformanceObserver((l) => l.getEntries().forEach((e) => W.events.push({ name: e.name, start: e.startTime, dur: e.duration, delay: e.processingStart - e.startTime, id: e.interactionId }))).observe({ type: 'event', durationThreshold: 16, buffered: true });
try { new PerformanceObserver((l) => l.getEntries().forEach((e) => W.loaf.push([e.startTime, e.duration, e.blockingDuration]))).observe({ type: 'long-animation-frame', buffered: true }); } catch {}
let last = 0; const frame = (t) => { if (last) W.gaps.push([t, t - last]); last = t; requestAnimationFrame(frame); }; requestAnimationFrame(frame);
window.__run = (mode, n, ms) => new Promise((res) => {
  W.t0 = performance.now();
  const fin = (r) => { W.t1 = performance.now(); res(r); };
  if (mode === 'main') animate($('#cv').getContext('2d'), n, 390, 300, ms, requestAnimationFrame, fin);
  // settle: the same animation plays 1.2 s, eases out and stops (motion.md §9: a moment, not a loop); taps continue to ms
  else if (mode === 'settle') animate($('#cv').getContext('2d'), n, 390, 300, 1200, requestAnimationFrame, (r) => setTimeout(() => fin(r), Math.max(0, ms - (performance.now() - W.t0))));
  else { const off = $('#cv').transferControlToOffscreen(); const w = new Worker('worker-visual.js', { type: 'module' }); w.onmessage = (e) => fin(e.data); w.postMessage({ canvas: off, n, ms }, [off]); }
});
</script>`);

  const sizes = {};
  for (const f of ['data.json', 'data4.json', 'data4c.json', 'data.ndjson', 'data.bin']) sizes[f] = { raw: (await stat(path.join(dir, f))).size, gzip: (await stat(path.join(dir, f + '.gz'))).size };
  return { n, sizes };
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(await buildOffmain(), null, 1));
