// Shared editor model for the history lab: items, a seeded workload generator and a reference oracle.
//
// The editor document is a set of items keyed by id. Z-order is a per-item number (`z`), the way excalidraw and
// tldraw store a fractional index on each element instead of an ordered array (an array position turns every
// insert or delete into a shift of every later element; see arrayPitfall() in run.mjs).
// Selection lives outside the document (it is view state, as in excalidraw appState and tldraw instance_page_state).

export const ITEM_KEYS = ['id', 'type', 'x', 'y', 'w', 'h', 'rot', 'fill', 'stroke', 'opacity', 'name', 'parentId', 'z'];
const FILLS = ['#f4c7c3', '#fce8b2', '#b7e1cd', '#c6dafc', '#e1bee7', '#ffffff', '#3c4043', '#d93025', '#188038', '#1a73e8'];
const TYPES = ['rect', 'ellipse', 'text', 'image'];

export function rng(seed) { // mulberry32
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const round = (v) => Math.round(v * 100) / 100;

export function makeItem(r, id, z) {
  return { id, type: pick(r, TYPES), x: round(r() * 1600), y: round(r() * 1000), w: round(20 + r() * 300), h: round(20 + r() * 200), rot: 0,
    fill: pick(r, FILLS), stroke: '#202124', opacity: 1, name: `Layer ${id}`, parentId: null, z };
}

export function initialScene(n, seed) {
  const r = rng(seed);
  const items = {};
  for (let i = 0; i < n; i++) { const id = `i${i}`; items[id] = makeItem(r, id, i); }
  return items;
}

// Canonical form for comparing states across strategies: sorted ids, fixed key order.
export function canon(items, selection) {
  const ids = Object.keys(items).sort();
  const out = ids.map((id) => ITEM_KEYS.map((k) => items[id][k]));
  return JSON.stringify({ items: out, selection: [...selection].sort() });
}

// ---------------------------------------------------------------------------------------------------------
// Pure op semantics on a mutable plain state { items, selection }. Used by the reference oracle and by the
// strategies that keep a mutable document (command, event-sourced).
export function applyAction(st, a, starts) {
  switch (a.t) {
    case 'add': st.items[a.item.id] = { ...a.item }; st.selection = [a.item.id]; break;
    case 'recolour': for (const id of a.ids) st.items[id].fill = a.fill; st.selection = [...a.ids]; break;
    case 'remove': for (const id of a.ids) delete st.items[id]; st.selection = []; break;
    case 'group':
      st.items[a.group.id] = { ...a.group };
      for (const id of a.ids) st.items[id].parentId = a.group.id;
      st.selection = [a.group.id]; break;
    case 'move': for (const m of a.moves) { st.items[m.id].x = m.x; st.items[m.id].y = m.y; } st.selection = [a.id]; break;
    case 'select': st.selection = [...a.ids]; break;
    case 'sync': for (const id of a.remove) delete st.items[id]; for (const it of a.put) st.items[it.id] = { ...it }; st.selection = [...a.selection]; break;
    default: throw new Error('unknown action ' + a.t);
  }
}

// ---------------------------------------------------------------------------------------------------------
// Reference oracle: naive full-copy snapshots (the thing people write first). It also drives the generator
// so that every generated action targets items that exist at that moment, including after undo and redo.
export class Reference {
  constructor(items) { this.st = { items: structuredClone(items), selection: [] }; this.past = []; this.future = []; this.gesture = null; }
  snap() { return structuredClone(this.st); }
  commit(before) { this.past.push(before); this.future.length = 0; }
  do(a) {
    if (a.t === 'select') { this.st.selection = [...a.ids]; return; } // view state: no history entry, keeps redo
    const before = this.snap(); applyAction(this.st, a); this.commit(before);
  }
  drag(a) { // a.path = list of [dx, dy] absolute deltas from the gesture start; one history entry
    const before = this.snap();
    const starts = a.ids.map((id) => [id, this.st.items[id].x, this.st.items[id].y]);
    for (const [dx, dy] of a.path) for (const [id, x, y] of starts) { this.st.items[id].x = round(x + dx); this.st.items[id].y = round(y + dy); }
    this.st.selection = [a.id];
    this.commit(before);
  }
  undo() { if (!this.past.length) return false; this.future.push(this.snap()); this.st = this.past.pop(); return true; }
  redo() { if (!this.future.length) return false; this.past.push(this.snap()); this.st = this.future.pop(); return true; }
  canon() { return canon(this.st.items, this.st.selection); }
}

export { round };

// Where run.mjs caches a generated workload (the generator replays a full-copy oracle, ~20 s at 5,000 items).
import os from 'node:os';
import path from 'node:path';
export const workloadCachePath = (sceneSize, ops, seed) => path.join(os.tmpdir(), `s5-workload-${sceneSize}-${ops}-seed${seed}.json`);

// ---------------------------------------------------------------------------------------------------------
// Workload: `ops` user operations. A drag is one operation made of `dragSteps` pointer updates.
// Mix: add 20%, drag 35%, recolour 17%, delete 8%, group 8%, select-only 4%, undo 6%, redo 2%.
export function generate({ sceneSize, ops, seed = 7, dragSteps = 20 }) {
  const r = rng(seed * 7919 + ops);
  const initial = initialScene(sceneSize, seed);
  const ref = new Reference(initial);
  const script = [];
  let next = sceneSize, z = sceneSize, updates = 0;
  const topLevel = () => Object.values(ref.st.items).filter((it) => it.parentId === null);
  const childrenOf = (gid) => Object.values(ref.st.items).filter((it) => it.parentId === gid).map((it) => it.id);
  const ids = () => Object.keys(ref.st.items);
  for (let i = 0; i < ops; i++) {
    const p = r();
    const n = ids().length;
    let a;
    if (p < 0.20 || n < 4) {
      const id = `n${next++}`; a = { t: 'add', item: makeItem(r, id, z++) };
    } else if (p < 0.55) {
      const tl = topLevel(); const it = pick(r, tl);
      const kids = it.type === 'group' ? childrenOf(it.id) : [];
      const path = []; const tx = (r() < 0.5 ? -1 : 1) * (10 + r() * 200), ty = (r() - 0.5) * 300;
      for (let s = 1; s <= dragSteps; s++) path.push([round(tx * s / dragSteps), round(ty * s / dragSteps)]);
      a = { t: 'drag', id: it.id, ids: [it.id, ...kids], path }; updates += dragSteps;
      ref.drag(a); script.push(a); continue;
    } else if (p < 0.72) {
      const k = 1 + Math.floor(r() * 3); const all = ids(); const sel = [...new Set(Array.from({ length: k }, () => pick(r, all)))];
      const used = new Set(sel.map((id) => ref.st.items[id].fill)); const free = FILLS.filter((f) => !used.has(f)); // never a no-op edit
      a = { t: 'recolour', ids: sel, fill: pick(r, free) };
    } else if (p < 0.80) {
      const it = pick(r, topLevel()); const kids = it.type === 'group' ? childrenOf(it.id) : [];
      a = { t: 'remove', ids: [it.id, ...kids] };
    } else if (p < 0.88) {
      const tl = topLevel().filter((it) => it.type !== 'group');
      if (tl.length < 3) { const id = `n${next++}`; a = { t: 'add', item: makeItem(r, id, z++) }; }
      else {
        const k = 2 + Math.floor(r() * 3); const members = [...new Set(Array.from({ length: k }, () => pick(r, tl).id))];
        const its = members.map((id) => ref.st.items[id]);
        const x = Math.min(...its.map((t) => t.x)), y = Math.min(...its.map((t) => t.y));
        const x2 = Math.max(...its.map((t) => t.x + t.w)), y2 = Math.max(...its.map((t) => t.y + t.h));
        const gid = `g${next++}`;
        a = { t: 'group', ids: members, group: { id: gid, type: 'group', x: round(x), y: round(y), w: round(x2 - x), h: round(y2 - y), rot: 0, fill: null, stroke: null, opacity: 1, name: `Group ${gid}`, parentId: null, z: z++ } };
      }
    } else if (p < 0.92) {
      const all = ids(); a = { t: 'select', ids: [pick(r, all)] };
    } else if (p < 0.98) {
      if (!ref.past.length) { i--; continue; }
      const prev = ref.st.items; ref.undo(); script.push({ t: 'undo', sync: syncOf(prev, ref.st) }); continue;
    } else {
      if (!ref.future.length) { i--; continue; }
      const prev = ref.st.items; ref.redo(); script.push({ t: 'redo', sync: syncOf(prev, ref.st) }); continue;
    }
    ref.do(a); script.push(a);
  }
  const finalCanon = ref.canon();
  const counts = {}; for (const a of script) counts[a.t] = (counts[a.t] || 0) + 1;
  return { initial, script, finalCanon, initialCanon: canon(initial, []), counts, dragUpdates: updates, undoDepth: ref.past.length, redoDepth: ref.future.length };
}

// The document change an undo or redo made, so that a run without history can follow the same states.
function syncOf(prevItems, st) {
  const put = [], remove = [];
  for (const id in prevItems) if (!st.items[id]) remove.push(id);
  for (const id in st.items) { const a = prevItems[id], b = st.items[id]; if (!a || ITEM_KEYS.some((k) => a[k] !== b[k])) put.push({ ...b }); }
  return { t: 'sync', put, remove, selection: [...st.selection] };
}

// Run a script against any strategy implementing the common interface.
export function play(s, script, onUpdate) {
  for (const a of script) {
    switch (a.t) {
      case 'drag':
        s.beginGesture(a.ids);
        for (const [dx, dy] of a.path) { s.dragUpdate(dx, dy); if (onUpdate) onUpdate(); }
        s.endGesture(a.id);
        break;
      case 'undo': s.undo(); break;
      case 'redo': s.redo(); break;
      default: s.act(a);
    }
  }
}
