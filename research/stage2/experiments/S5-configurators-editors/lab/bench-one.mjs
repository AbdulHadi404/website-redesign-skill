// One benchmark run in a fresh process (node --expose-gc lab/bench-one.mjs <strategy> <sceneSize> <ops> <history|none> [--serialize]).
// Prints one JSON line. Memory = heapUsed after full GC, minus the heap before the strategy was created
// (the generated workload is already in the heap in both modes). History cost = history mode − none mode.
import { readFileSync, existsSync } from 'node:fs';
import { STRATEGIES } from './strategies.mjs';
import { generate, workloadCachePath } from './model.mjs';

const [name, sceneSize, ops, mode] = process.argv.slice(2);
const serialize = process.argv.includes('--serialize');
const S = STRATEGIES[name];
const history = mode === 'history';
const gcAll = () => { for (let i = 0; i < 4; i++) global.gc(); };
const pct = (arr, p) => { if (!arr.length) return null; const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const us = (v) => (v == null ? null : Math.round(v * 1000 * 10) / 10);

// run.mjs writes each workload once to the OS temp folder (it is deterministic: seed 11); regenerate if absent
const cache = workloadCachePath(+sceneSize, +ops, 11);
let w = existsSync(cache) ? JSON.parse(readFileSync(cache, 'utf8')) : generate({ sceneSize: +sceneSize, ops: +ops, seed: 11 });
const { script, initial, finalCanon, initialCanon } = w; w = null;
gcAll();
const heap0 = process.memoryUsage().heapUsed;

const s = new S(initial, { history });
const upd = [], commit = [];
const t0 = performance.now();
for (const a of script) {
  if (a.t === 'drag') {
    s.beginGesture(a.ids);
    for (const [dx, dy] of a.path) { const u = performance.now(); s.dragUpdate(dx, dy); upd.push(performance.now() - u); }
    const c = performance.now(); s.endGesture(a.id); commit.push(performance.now() - c);
  } else if (a.t === 'undo') { if (history) s.undo(); else s.act(a.sync); }
  else if (a.t === 'redo') { if (history) s.redo(); else s.act(a.sync); }
  else { const c = performance.now(); s.act(a); if (a.t !== 'select') commit.push(performance.now() - c); }
}
const playMs = performance.now() - t0;
gcAll();
const heapMB = (process.memoryUsage().heapUsed - heap0) / 1048576;

const out = { name, sceneSize: +sceneSize, ops: +ops, mode, playMs, heapMB, updateP50us: us(pct(upd, 0.5)), updateP95us: us(pct(upd, 0.95)), commitP95us: us(pct(commit, 0.95)), commitMaxUs: us(Math.max(...commit)) };
if (history) {
  const d = s.depth(); out.entries = d.undo + d.redo;
  out.finalOk = JSON.stringify(JSON.parse(s.canon()).items) === JSON.stringify(JSON.parse(finalCanon).items);
  if (s.docBytes) out.docKB = Math.round(s.docBytes() / 1024);
  if (serialize) { const t = performance.now(); const b = s.serializedBytes(); out.serializeMs = b == null ? null : performance.now() - t; out.serializedKB = b == null ? null : Math.round(b / 1024); }
  const ud = []; let t; while (true) { t = performance.now(); if (!s.undo()) break; ud.push(performance.now() - t); }
  out.undoAllOk = JSON.stringify(JSON.parse(s.canon()).items) === JSON.stringify(JSON.parse(initialCanon).items);
  const rd = []; while (true) { t = performance.now(); if (!s.redo()) break; rd.push(performance.now() - t); }
  out.undoSteps = ud.length; out.undoMeanUs = us(ud.reduce((a, b) => a + b, 0) / ud.length); out.undoP95us = us(pct(ud, 0.95)); out.undoMaxUs = us(Math.max(...ud));
  out.redoMeanUs = us(rd.reduce((a, b) => a + b, 0) / rd.length);
} else {
  out.finalOk = JSON.stringify(JSON.parse(s.canon()).items) === JSON.stringify(JSON.parse(finalCanon).items);
  if (s.docBytes) out.docKB = Math.round(s.docBytes() / 1024);
}
console.log(JSON.stringify(out));
