// Correctness of each history strategy: coalescing, selection restoration, redo invalidation, cancel,
// a 1,000-operation round trip against the oracle, persistence, and multi-user caveats.
// Also the Yjs time-based capture pitfalls (real waits: lib0's getUnixTime is Date.now bound at import).
import { STRATEGIES, Yjs } from './strategies.mjs';
import { initialScene, generate, play } from './model.mjs';

const items = (s) => JSON.parse(s.canon()).items;
const sel = (s) => JSON.parse(s.canon()).selection;
const itemOf = (s, id) => items(s).find((r) => r[0] === id);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const K = { x: 2, y: 3, fill: 7 }; // positions in the canonical row (ITEM_KEYS order)

function unit(S) {
  const r = {};
  // T1 one drag = one undo step
  let s = new S(initialScene(50, 1));
  const before = itemOf(s, 'i0');
  s.beginGesture(['i0']); for (let k = 1; k <= 30; k++) s.dragUpdate(k * 3, k * 2); s.endGesture('i0');
  const d1 = s.depth().undo; s.undo();
  r.dragIsOneStep = d1 === 1 && same(itemOf(s, 'i0'), before);
  // T2 selection restored with the step
  s = new S(initialScene(50, 1));
  s.act({ t: 'recolour', ids: ['i1'], fill: '#d93025' });
  s.act({ t: 'select', ids: ['i2'] });
  s.act({ t: 'remove', ids: ['i2'] });
  const u = [], rd = [];
  s.undo(); u.push(same(sel(s), ['i2']) && !!itemOf(s, 'i2'));
  s.undo(); u.push(same(sel(s), []) && itemOf(s, 'i1')[K.fill] !== '#d93025');
  s.redo(); rd.push(same(sel(s), ['i1'])); const afterRedo1 = sel(s);
  s.redo(); rd.push(same(sel(s), []) && !itemOf(s, 'i2'));
  r.undoRestoresSelection = u.every(Boolean);
  r.redoRestoresSelectionAfterOp = rd.every(Boolean) || `no: gives the selection current when undo was pressed (${JSON.stringify(afterRedo1)} instead of ["i1"])`;
  // T3 redo invalidation: a new edit clears redo, a selection change does not
  s = new S(initialScene(50, 1));
  s.act({ t: 'recolour', ids: ['i1'], fill: '#188038' }); s.act({ t: 'recolour', ids: ['i2'], fill: '#188038' }); s.undo();
  const a1 = s.canRedo(); s.act({ t: 'select', ids: ['i3'] }); const a2 = s.canRedo(); s.act({ t: 'recolour', ids: ['i4'], fill: '#1a73e8' });
  r.redoInvalidation = a1 && a2 && !s.canRedo();
  r.selectionKeepsRedo = a2;
  // T4 cancel (Escape mid-drag): state restored, no step recorded
  s = new S(initialScene(50, 1));
  s.act({ t: 'recolour', ids: ['i1'], fill: '#188038' });
  const c0 = s.canon(), dep0 = s.depth().undo;
  s.beginGesture(['i5']); for (let k = 1; k <= 10; k++) s.dragUpdate(k, k); s.cancelGesture();
  r.cancelRestores = s.canon() === c0 && s.depth().undo === dep0;
  // T7 an edit that changes nothing creates no step (excalidraw: History.record ignores an empty delta)
  s = new S(initialScene(50, 1));
  const f = itemOf(s, 'i1')[K.fill]; s.act({ t: 'recolour', ids: ['i1'], fill: f });
  s.beginGesture(['i3']); s.dragUpdate(4, 4); s.dragUpdate(0, 0); s.endGesture('i3');
  r.noOpEditCreatesNoStep = s.depth().undo === 0 || `no: ${s.depth().undo} empty step(s)`;
  // T5 round trip on a generated workload, T6 persistence
  const w = generate({ sceneSize: 200, ops: 1000, seed: 11 });
  s = new S(w.initial); play(s, w.script);
  r.finalMatchesOracle = same(JSON.parse(s.canon()).items, JSON.parse(w.finalCanon).items);
  r.finalSelectionMatchesOracle = same(JSON.parse(s.canon()).selection, JSON.parse(w.finalCanon).selection);
  while (s.redo()); const tipItems = items(s); // the far end of the redo stack
  const json = s.serialize();
  let steps = 0; while (s.undo()) steps++;
  r.undoAllMatchesInitial = same(items(s), JSON.parse(w.initialCanon).items);
  r.undoSteps = steps; r.oracleSteps = w.undoDepth + w.redoDepth;
  while (s.redo()); r.redoAllMatchesTip = same(items(s), tipItems);
  if (json === null) r.persistence = 'n/a: document persists, UndoManager stacks do not';
  else {
    const s2 = new S(w.initial); play(s2, w.script); while (s2.redo()); // the live document to restore the history into
    const t = S.restore(json, s2); while (t.undo());
    r.persistence = same(items(t), JSON.parse(w.initialCanon).items);
    r.historyJsonKB = Math.round(json.length / 1024);
  }
  return r;
}

function multiUser(S) {
  const r = {};
  const scene = () => initialScene(20, 3);
  // M1: I move an item, someone recolours it, I undo
  let s = new S(scene()); const p0 = itemOf(s, 'i0');
  s.beginGesture(['i0']); for (let k = 1; k <= 10; k++) s.dragUpdate(k * 5, 0); s.endGesture('i0');
  s.applyRemote({ t: 'recolour', ids: ['i0'], fill: '#123456' }); s.undo();
  const p1 = itemOf(s, 'i0');
  r.M1_undoMyMove_keepsTheirColour = p1[K.x] === p0[K.x] && p1[K.fill] === '#123456';
  // M2: I recolour, they recolour the same item after me, I undo
  s = new S(scene()); const f0 = itemOf(s, 'i1')[K.fill];
  s.act({ t: 'recolour', ids: ['i1'], fill: '#d93025' }); s.applyRemote({ t: 'recolour', ids: ['i1'], fill: '#123456' }); s.undo();
  const f1 = itemOf(s, 'i1')[K.fill];
  r.M2_sameProperty = f1 === '#123456' ? 'their change kept (my undo skipped)' : f1 === f0 ? 'my original restored (their change overwritten)' : `other: ${f1}`;
  // M3: I move an item, they delete it, I undo
  s = new S(scene());
  s.beginGesture(['i2']); for (let k = 1; k <= 10; k++) s.dragUpdate(0, k * 5); s.endGesture('i2');
  s.applyRemote({ t: 'remove', ids: ['i2'] });
  try { s.undo(); const it = itemOf(s, 'i2'); r.M3_undoOnDeleted = !it ? 'no-op (stays deleted)' : it[K.fill] === undefined || it[1] === undefined ? 'resurrected a partial record' : 'resurrected the item'; }
  catch (e) { r.M3_undoOnDeleted = `throws (${e.constructor.name})`; }
  return r;
}

const wait = (ms) => new Promise((res) => setTimeout(res, ms));
async function yjsCapture() {
  const out = {};
  const configs = { 'default (captureTimeout 500, no stopCapturing)': { stopCapturing: false }, 'stopCapturing at boundaries, timeout 500': { stopCapturing: true }, 'stopCapturing at boundaries, timeout Infinity': { stopCapturing: true, captureTimeout: Infinity } };
  for (const [name, opt] of Object.entries(configs)) {
    const r = {};
    let s = new Yjs(initialScene(10, 1), opt);
    s.act({ t: 'recolour', ids: ['i1'], fill: '#d93025' }); await wait(50); s.act({ t: 'recolour', ids: ['i2'], fill: '#188038' });
    r.twoClicks50msApart_steps = s.depth().undo;
    s = new Yjs(initialScene(10, 1), opt);
    s.beginGesture(['i0']); for (let k = 1; k <= 5; k++) s.dragUpdate(k, 0); await wait(650); for (let k = 6; k <= 10; k++) s.dragUpdate(k, 0); s.endGesture('i0');
    r.dragWith650msPause_steps = s.depth().undo;
    out[name] = r;
  }
  return out;
}

export async function correctness() {
  const res = {};
  for (const [k, S] of Object.entries(STRATEGIES)) {
    res[k] = { label: S.label, ...unit(S), ...multiUser(S) };
  }
  res.yjsCapture = await yjsCapture();
  return res;
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(await correctness(), null, 2));
