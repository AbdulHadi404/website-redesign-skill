// Synthetic frame streams through governor.js in Node (no browser, deterministic): the cases the review asked for,
// plus the misuse. Writes results/governor-unit.json.   node lib/governor-unit.mjs
import { createGovernor } from './client/governor.js';
import { saveResult } from './common.mjs';

const every = (ms) => function* () { for (;;) yield ms; };
const CASES = {
  '60 fps on 60 Hz': [{}, every(16.7)],
  '300 ms frames (< 4 fps)': [{}, every(300)],
  '30 fps scene on a 60 Hz display': [{}, every(33.3)],
  '30 Hz display, refreshMs 33.3 measured before the scene': [{ refreshMs: 33.3 }, every(33.3)],
  'on-demand bursts, pause() called': [{}, function* () { for (;;) { yield 650; yield 16.7; yield 16.7; yield 'pause'; } }],
  'on-demand bursts, pause() never called (misuse)': [{}, function* () { for (;;) { yield 650; yield 16.7; yield 16.7; } }],
  '300 ms frames with gapsArePauses (v1 behaviour)': [{ gapsArePauses: true }, every(300)],
};
const out = {};
const warn = console.warn; let warnings = 0; console.warn = () => { warnings++; };
for (const [name, [opts, gen]] of Object.entries(CASES)) {
  let floor = 0; warnings = 0;
  const g = createGovernor({ ...opts, onFloor: () => floor++ });
  let t = 1000;
  for (const step of gen()) { if (step === 'pause') { g.pause(); continue; } t += step; if (t > 31000) break; g.frame(t); }
  out[name] = { finalLevel: g.level, onFloor: floor, warned: warnings > 0, changes: g.log.map((e) => ({ t: e.t - 1000, from: e.from, to: e.to, floor: !!e.floor })) };
}
console.warn = warn;
await saveResult('governor-unit', out);
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(58), 'level', v.finalLevel, 'onFloor', v.onFloor, 'warned', v.warned, v.changes.map((c) => `${c.t}:${c.from}>${c.to}${c.floor ? 'F' : ''}`).join(' '));
