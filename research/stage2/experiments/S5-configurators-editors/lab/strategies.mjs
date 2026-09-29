// History strategies behind one interface:
//   act(action) · beginGesture(ids) · dragUpdate(dx, dy) · endGesture(id) · cancelGesture()
//   undo() · redo() · canUndo() · canRedo() · depth() · canon() · serialize() · static restore(json, from)
//   applyRemote(action)   (a change that arrived from another user: never recorded in this user's history)
// Every strategy restores the selection that was current before an undone step (and after a redone one).
// Selection model used here (a design choice, not what the two editors read do): a selection-only change neither
// creates a step nor clears the redo stack. excalidraw and tldraw DO record a selection-only change as an undo step
// that keeps redo: excalidraw History.record pushes every non-empty delta, appState-only ones included, and clears
// redo only when elements changed (packages/excalidraw/history.ts ~117-131; tests/history.test.tsx ~889 walks the
// selection back one Ctrl+Z at a time); tldraw marks a stopping point before setSelectedShapes, which records with
// 'record-preserveRedoStack' (SelectTool/childStates/PointingShape.ts; Editor.setSelectedShapes).
//
// Option { skipMissing: true } (Command, ImmerPatches, RecordDiff): undo/redo skip changes to records that no longer
// exist (deleted by a collaborator). PropDiff has this guard always on, as benchmarked. The benchmark runs the other
// three WITHOUT it (the default), exactly as first measured; correctness.mjs runs the multi-user cases both ways.

import { produce, produceWithPatches, applyPatches, enablePatches, setAutoFreeze } from 'immer';
import { Map as IMap } from 'immutable';
import * as Y from 'yjs';
import { applyAction, canon, round, Reference, ITEM_KEYS } from './model.mjs';

enablePatches();
if (process.env.IMMER_AUTOFREEZE === '0') setAutoFreeze(false);

const id = (it) => it.id;
const selAfter = (a) => a.t === 'add' ? [a.item.id] : a.t === 'recolour' ? [...a.ids] : a.t === 'remove' ? [] : a.t === 'group' ? [a.group.id] : a.t === 'move' ? [a.id] : [...a.ids];

// ------------------------------------------------------------------ 0. naive full-copy snapshots (baseline)
export class Naive {
  static label = 'Naive full-copy snapshots';
  constructor(items, { history = true } = {}) { this.ref = new Reference(items); this.history = history; }
  act(a) { if (this.history) this.ref.do(a); else applyAction(this.ref.st, a); }
  beginGesture(ids) { this.g = { before: this.history ? this.ref.snap() : null, starts: ids.map((id) => [id, this.ref.st.items[id].x, this.ref.st.items[id].y]) }; }
  dragUpdate(dx, dy) { for (const [id, x, y] of this.g.starts) { const it = this.ref.st.items[id]; it.x = round(x + dx); it.y = round(y + dy); } }
  endGesture(id) { this.ref.st.selection = [id]; if (this.history) this.ref.commit(this.g.before); this.g = null; }
  cancelGesture() { this.dragUpdate(0, 0); this.g = null; }
  undo() { return this.ref.undo(); } redo() { return this.ref.redo(); }
  canUndo() { return this.ref.past.length > 0; } canRedo() { return this.ref.future.length > 0; }
  depth() { return { undo: this.ref.past.length, redo: this.ref.future.length }; }
  canon() { return this.ref.canon(); }
  serialize() { return JSON.stringify({ past: this.ref.past, future: this.ref.future }); }
  serializedBytes() { let n = 0; for (const s of this.ref.past) n += JSON.stringify(s).length; for (const s of this.ref.future) n += JSON.stringify(s).length; return n; }
  static restore(json, from) { const s = new Naive({}); s.ref.st = structuredClone(from.ref.st); const h = JSON.parse(json); s.ref.past = h.past; s.ref.future = h.future; return s; }
  applyRemote(a) { const sel = this.ref.st.selection; applyAction(this.ref.st, a); this.ref.st.selection = sel; }
  clearHistory() { this.ref.past = []; this.ref.future = []; }
}

// ------------------------------------------------------------------ 1. command pattern (inverse data per command)
const CMD = {
  add: { do: (m, c) => m.set(c.item.id, { ...c.item }), undo: (m, c) => m.delete(c.item.id) },
  recolour: { do: (m, c) => c.ids.forEach((id) => { m.get(id).fill = c.to; }), undo: (m, c) => c.ids.forEach((id, i) => { m.get(id).fill = c.from[i]; }) },
  remove: { do: (m, c) => c.removed.forEach((it) => m.delete(it.id)), undo: (m, c) => c.removed.forEach((it) => m.set(it.id, { ...it })) },
  group: { do: (m, c) => { m.set(c.group.id, { ...c.group }); c.ids.forEach((id) => { m.get(id).parentId = c.group.id; }); },
    undo: (m, c) => { m.delete(c.group.id); c.ids.forEach((id) => { m.get(id).parentId = null; }); } },
  move: { do: (m, c) => c.moves.forEach(([id, , , tx, ty]) => { const it = m.get(id); it.x = tx; it.y = ty; }),
    undo: (m, c) => c.moves.forEach(([id, fx, fy]) => { const it = m.get(id); it.x = fx; it.y = fy; }) },
};
// the parts of a command whose targets still exist (skipMissing)
const liveCmd = (m, c) => {
  if (c.k === 'move') return { ...c, moves: c.moves.filter(([id]) => m.has(id)) };
  if (c.k === 'recolour') { const keep = c.ids.map((id, i) => [id, c.from[i]]).filter(([id]) => m.has(id)); return { ...c, ids: keep.map((x) => x[0]), from: keep.map((x) => x[1]) }; }
  if (c.k === 'group') return { ...c, ids: c.ids.filter((id) => m.has(id)) };
  return c;
};
export class Command {
  static label = 'Command pattern';
  constructor(items, { history = true, skipMissing = false } = {}) { this.m = new Map(Object.entries(structuredClone(items))); this.selection = []; this.history = history; this.skipMissing = skipMissing; this.undos = []; this.redos = []; }
  toCommand(a) {
    switch (a.t) {
      case 'add': return { k: 'add', item: { ...a.item } };
      case 'recolour': return { k: 'recolour', ids: a.ids, from: a.ids.map((id) => this.m.get(id).fill), to: a.fill };
      case 'remove': return { k: 'remove', removed: a.ids.map((id) => ({ ...this.m.get(id) })) };
      case 'group': return { k: 'group', group: { ...a.group }, ids: a.ids };
    }
  }
  act(a) {
    if (a.t === 'select') { this.selection = [...a.ids]; return; }
    if (a.t === 'sync') { for (const id of a.remove) this.m.delete(id); for (const it of a.put) this.m.set(it.id, { ...it }); this.selection = a.selection; return; }
    const c = this.toCommand(a); c.sb = this.selection; c.sa = selAfter(a);
    CMD[c.k].do(this.m, c); this.selection = c.sa;
    if (this.history) { this.undos.push(c); this.redos.length = 0; }
  }
  beginGesture(ids) { this.g = { sb: this.selection, starts: ids.map((id) => [id, this.m.get(id).x, this.m.get(id).y]) }; }
  dragUpdate(dx, dy) { for (const [id, x, y] of this.g.starts) { const it = this.m.get(id); it.x = round(x + dx); it.y = round(y + dy); } }
  endGesture(id) {
    const moves = this.g.starts.map(([mid, fx, fy]) => [mid, fx, fy, this.m.get(mid).x, this.m.get(mid).y]).filter((mv) => mv[1] !== mv[3] || mv[2] !== mv[4]);
    this.selection = [id];
    if (this.history && moves.length) { this.undos.push({ k: 'move', moves, sb: this.g.sb, sa: [id] }); this.redos.length = 0; }
    this.g = null;
  }
  cancelGesture() { this.dragUpdate(0, 0); this.g = null; }
  undo() { const c = this.undos.pop(); if (!c) return false; CMD[c.k].undo(this.m, this.skipMissing ? liveCmd(this.m, c) : c); this.selection = c.sb; this.redos.push(c); return true; }
  redo() { const c = this.redos.pop(); if (!c) return false; CMD[c.k].do(this.m, this.skipMissing ? liveCmd(this.m, c) : c); this.selection = c.sa; this.undos.push(c); return true; }
  canUndo() { return this.undos.length > 0; } canRedo() { return this.redos.length > 0; }
  depth() { return { undo: this.undos.length, redo: this.redos.length }; }
  canon() { return canon(Object.fromEntries(this.m), this.selection); }
  serialize() { return JSON.stringify({ undos: this.undos, redos: this.redos }); }
  serializedBytes() { return this.serialize().length; }
  static restore(json, from) { const s = new Command({}); s.m = new Map([...from.m].map(([k, v]) => [k, { ...v }])); s.selection = from.selection; Object.assign(s, JSON.parse(json)); return s; }
  applyRemote(a) { const st = { items: Object.fromEntries(this.m), selection: this.selection }; applyAction(st, a); this.m = new Map(Object.entries(st.items)); }
  clearHistory() { this.undos = []; this.redos = []; }
}

// ------------------------------------------------------------------ 2a. immutable snapshots, spread copies (zundo / redux-undo style)
function spreadApply(state, a) {
  const items = { ...state.items };
  switch (a.t) {
    case 'add': items[a.item.id] = { ...a.item }; break;
    case 'recolour': for (const id of a.ids) items[id] = { ...items[id], fill: a.fill }; break;
    case 'remove': for (const id of a.ids) delete items[id]; break;
    case 'group': items[a.group.id] = { ...a.group }; for (const id of a.ids) items[id] = { ...items[id], parentId: a.group.id }; break;
    case 'move': for (const m of a.moves) items[m.id] = { ...items[m.id], x: m.x, y: m.y }; break;
    case 'sync': for (const id of a.remove) delete items[id]; for (const it of a.put) items[it.id] = { ...it }; return { items, selection: a.selection };
  }
  return { items, selection: selAfter(a) };
}
export class SnapshotSpread {
  static label = 'Immutable snapshots (object spread)';
  constructor(items, { history = true } = {}) { this.s = { items: structuredClone(items), selection: [] }; this.history = history; this.past = []; this.future = []; }
  act(a) {
    if (a.t === 'select') { this.s = { ...this.s, selection: [...a.ids] }; return; }
    const prev = this.s; this.s = spreadApply(prev, a);
    if (this.history) { this.past.push(prev); this.future.length = 0; }
  }
  beginGesture(ids) { this.g = { start: this.s, starts: ids.map((id) => [id, this.s.items[id].x, this.s.items[id].y]) }; }
  dragUpdate(dx, dy) { const items = { ...this.s.items }; for (const [id, x, y] of this.g.starts) items[id] = { ...items[id], x: round(x + dx), y: round(y + dy) }; this.s = { ...this.s, items }; }
  endGesture(id) { this.s = { ...this.s, selection: [id] }; if (this.history && this.s.items !== this.g.start.items) { this.past.push(this.g.start); this.future.length = 0; } this.g = null; }
  cancelGesture() { this.s = this.g.start; this.g = null; }
  undo() { if (!this.past.length) return false; this.future.push(this.s); this.s = this.past.pop(); return true; }
  redo() { if (!this.future.length) return false; this.past.push(this.s); this.s = this.future.pop(); return true; }
  canUndo() { return this.past.length > 0; } canRedo() { return this.future.length > 0; }
  depth() { return { undo: this.past.length, redo: this.future.length }; }
  canon() { return canon(this.s.items, this.s.selection); }
  serialize() { return JSON.stringify({ past: this.past, future: this.future }); }
  serializedBytes() { let n = 0; for (const s of this.past) n += JSON.stringify(s).length; for (const s of this.future) n += JSON.stringify(s).length; return n; }
  static restore(json, from) { const s = new SnapshotSpread({}); s.s = from.s; Object.assign(s, JSON.parse(json)); return s; }
  applyRemote(a) { const sel = this.s.selection; this.s = { ...spreadApply(this.s, a), selection: sel }; }
  clearHistory() { this.past = []; this.future = []; }
}

// ------------------------------------------------------------------ 2b. immutable snapshots, persistent map (Immutable.js HAMT)
function hamtApply(state, a) {
  let items = state.items;
  switch (a.t) {
    case 'add': items = items.set(a.item.id, { ...a.item }); break;
    case 'recolour': items = items.withMutations((m) => { for (const id of a.ids) m.set(id, { ...m.get(id), fill: a.fill }); }); break;
    case 'remove': items = items.withMutations((m) => { for (const id of a.ids) m.delete(id); }); break;
    case 'group': items = items.withMutations((m) => { m.set(a.group.id, { ...a.group }); for (const id of a.ids) m.set(id, { ...m.get(id), parentId: a.group.id }); }); break;
    case 'move': items = items.withMutations((m) => { for (const mv of a.moves) m.set(mv.id, { ...m.get(mv.id), x: mv.x, y: mv.y }); }); break;
    case 'sync': items = items.withMutations((m) => { for (const id of a.remove) m.delete(id); for (const it of a.put) m.set(it.id, { ...it }); }); return { items, selection: a.selection };
  }
  return { items, selection: selAfter(a) };
}
export class SnapshotHamt extends SnapshotSpread {
  static label = 'Immutable snapshots (persistent map)';
  constructor(items, opts = {}) { super({}, opts); this.s = { items: IMap(structuredClone(items)), selection: [] }; }
  act(a) {
    if (a.t === 'select') { this.s = { ...this.s, selection: [...a.ids] }; return; }
    const prev = this.s; this.s = hamtApply(prev, a);
    if (this.history) { this.past.push(prev); this.future.length = 0; }
  }
  beginGesture(ids) { this.g = { start: this.s, starts: ids.map((id) => [id, this.s.items.get(id).x, this.s.items.get(id).y]) }; }
  dragUpdate(dx, dy) { const items = this.s.items.withMutations((m) => { for (const [id, x, y] of this.g.starts) m.set(id, { ...m.get(id), x: round(x + dx), y: round(y + dy) }); }); this.s = { ...this.s, items }; }
  canon() { return canon(this.s.items.toObject(), this.s.selection); }
  serialize() { return JSON.stringify({ past: this.past.map((s) => ({ items: s.items.toObject(), selection: s.selection })), future: this.future.map((s) => ({ items: s.items.toObject(), selection: s.selection })) }); }
  serializedBytes() { let n = 0; for (const s of [...this.past, ...this.future]) n += JSON.stringify({ items: s.items.toObject(), selection: s.selection }).length; return n; }
  static restore(json, from) { const s = new SnapshotHamt({}); s.s = from.s; const h = JSON.parse(json); const rev = (x) => ({ items: IMap(x.items), selection: x.selection }); s.past = h.past.map(rev); s.future = h.future.map(rev); return s; }
  applyRemote(a) { const sel = this.s.selection; this.s = { ...hamtApply(this.s, a), selection: sel }; }
}

// ------------------------------------------------------------------ 3a. patches (immer produceWithPatches; a gesture's patches squashed)
const immerRecipe = (a) => (d) => {
  switch (a.t) {
    case 'add': d.items[a.item.id] = { ...a.item }; break;
    case 'recolour': for (const id of a.ids) d.items[id].fill = a.fill; break;
    case 'remove': for (const id of a.ids) delete d.items[id]; break;
    case 'group': d.items[a.group.id] = { ...a.group }; for (const id of a.ids) d.items[id].parentId = a.group.id; break;
    case 'move': for (const m of a.moves) { d.items[m.id].x = m.x; d.items[m.id].y = m.y; } break;
    case 'sync': for (const id of a.remove) delete d.items[id]; for (const it of a.put) d.items[it.id] = { ...it }; break;
  }
};
// patches that address a property of an item that no longer exists are dropped (skipMissing)
const livePatches = (doc, ps) => ps.filter((q) => q.path[0] !== 'items' || q.path.length <= 2 || doc.items[q.path[1]] !== undefined);
export class ImmerPatches {
  static label = 'Patches (immer)';
  constructor(items, { history = true, skipMissing = false } = {}) { this.doc = produce({ items: structuredClone(items) }, () => {}); this.selection = []; this.history = history; this.skipMissing = skipMissing; this.undos = []; this.redos = []; }
  act(a) {
    if (a.t === 'select') { this.selection = [...a.ids]; return; }
    const sb = this.selection;
    if (a.t === 'sync') { this.doc = produce(this.doc, immerRecipe(a)); this.selection = a.selection; return; }
    if (this.history) { const [next, p, i] = produceWithPatches(this.doc, immerRecipe(a)); this.doc = next; this.undos.push({ p, i, sb, sa: selAfter(a) }); this.redos.length = 0; }
    else this.doc = produce(this.doc, immerRecipe(a));
    this.selection = selAfter(a);
  }
  beginGesture(ids) { this.g = { sb: this.selection, starts: ids.map((id) => [id, this.doc.items[id].x, this.doc.items[id].y]), p: [], i: [] }; }
  dragUpdate(dx, dy) {
    const recipe = (d) => { for (const [id, x, y] of this.g.starts) { d.items[id].x = round(x + dx); d.items[id].y = round(y + dy); } };
    if (this.history) { const [next, p, i] = produceWithPatches(this.doc, recipe); this.doc = next; this.g.p.push(...p); this.g.i.push(...i); }
    else this.doc = produce(this.doc, recipe);
  }
  endGesture(id) {
    if (this.history && this.g.p.length) {
      // squash: per path keep the last forward value and the first inverse value (a drag only replaces values)
      const fwd = new Map(), inv = new Map();
      for (const q of this.g.p) fwd.set(q.path.join('\u0000'), q);
      for (const q of this.g.i) { const k = q.path.join('\u0000'); if (!inv.has(k)) inv.set(k, q); }
      this.undos.push({ p: [...fwd.values()], i: [...inv.values()].reverse(), sb: this.g.sb, sa: [id] }); this.redos.length = 0;
    }
    this.selection = [id]; this.g = null;
  }
  cancelGesture() { this.dragUpdate(0, 0); this.g = null; }
  undo() { const e = this.undos.pop(); if (!e) return false; this.doc = applyPatches(this.doc, this.skipMissing ? livePatches(this.doc, e.i) : e.i); this.selection = e.sb; this.redos.push(e); return true; }
  redo() { const e = this.redos.pop(); if (!e) return false; this.doc = applyPatches(this.doc, this.skipMissing ? livePatches(this.doc, e.p) : e.p); this.selection = e.sa; this.undos.push(e); return true; }
  canUndo() { return this.undos.length > 0; } canRedo() { return this.redos.length > 0; }
  depth() { return { undo: this.undos.length, redo: this.redos.length }; }
  canon() { return canon(this.doc.items, this.selection); }
  serialize() { return JSON.stringify({ undos: this.undos, redos: this.redos }); }
  serializedBytes() { return this.serialize().length; }
  static restore(json, from) { const s = new ImmerPatches({}); s.doc = from.doc; s.selection = from.selection; Object.assign(s, JSON.parse(json)); return s; }
  applyRemote(a) { this.doc = produce(this.doc, immerRecipe(a)); }
  clearHistory() { this.undos = []; this.redos = []; }
}

// ------------------------------------------------------------------ 3b. record diffs squashed between marks (tldraw HistoryManager / excalidraw deltas)
export class RecordDiff {
  static label = 'Record diffs (tldraw-style)';
  constructor(items, { history = true, skipMissing = false } = {}) { this.m = new Map(Object.entries(structuredClone(items))); this.selection = []; this.history = history; this.skipMissing = skipMissing; this.undos = []; this.redos = []; this.pending = RecordDiff.empty(); }
  static empty() { return { added: {}, updated: {}, removed: {} }; }
  put(next) { // records are immutable: every change replaces the record
    const id = next.id, prev = this.m.get(id); this.m.set(id, next);
    if (!this.history) return;
    const d = this.pending;
    if (prev) { if (d.added[id]) d.added[id] = next; else if (d.updated[id]) d.updated[id][1] = next; else d.updated[id] = [prev, next]; }
    else if (d.removed[id]) { d.updated[id] = [d.removed[id], next]; delete d.removed[id]; }
    else d.added[id] = next;
  }
  del(id) {
    const prev = this.m.get(id); this.m.delete(id);
    if (!this.history) return;
    const d = this.pending;
    if (d.added[id]) delete d.added[id]; else if (d.updated[id]) { d.removed[id] = d.updated[id][0]; delete d.updated[id]; } else d.removed[id] = prev;
  }
  mark(sb, sa) {
    const d = this.pending; this.pending = RecordDiff.empty();
    if (!this.history) return;
    if (!Object.keys(d.added).length && !Object.keys(d.updated).length && !Object.keys(d.removed).length) return;
    this.undos.push({ d, sb, sa }); this.redos.length = 0;
  }
  act(a) {
    if (a.t === 'select') { this.selection = [...a.ids]; return; }
    const sb = this.selection;
    switch (a.t) {
      case 'add': this.put({ ...a.item }); break;
      case 'recolour': for (const id of a.ids) this.put({ ...this.m.get(id), fill: a.fill }); break;
      case 'remove': for (const id of a.ids) this.del(id); break;
      case 'group': this.put({ ...a.group }); for (const id of a.ids) this.put({ ...this.m.get(id), parentId: a.group.id }); break;
      case 'move': for (const m of a.moves) this.put({ ...this.m.get(m.id), x: m.x, y: m.y }); break;
      case 'sync': for (const id of a.remove) this.del(id); for (const it of a.put) this.put({ ...it }); this.selection = a.selection; this.pending = RecordDiff.empty(); return;
    }
    this.selection = selAfter(a); this.mark(sb, this.selection);
  }
  beginGesture(ids) { this.g = { sb: this.selection, starts: ids.map((id) => [id, this.m.get(id).x, this.m.get(id).y]) }; }
  dragUpdate(dx, dy) { for (const [id, x, y] of this.g.starts) this.put({ ...this.m.get(id), x: round(x + dx), y: round(y + dy) }); }
  endGesture(id) { this.selection = [id]; this.mark(this.g.sb, [id]); this.g = null; }
  cancelGesture() { // tldraw bailToMark: revert the pending diff, record nothing, keep redo
    const d = this.pending; this.pending = RecordDiff.empty();
    for (const [id, [from]] of Object.entries(d.updated)) this.m.set(id, from);
    this.g = null;
  }
  applyDiff(d, reverse) {
    const added = reverse ? d.removed : d.added, removed = reverse ? d.added : d.removed;
    for (const id in removed) this.m.delete(id);
    for (const id in added) this.m.set(id, added[id]);
    for (const id in d.updated) if (!this.skipMissing || this.m.has(id)) this.m.set(id, d.updated[id][reverse ? 0 : 1]);
  }
  undo() { const e = this.undos.pop(); if (!e) return false; this.applyDiff(e.d, true); this.selection = e.sb; this.redos.push(e); return true; }
  redo() { const e = this.redos.pop(); if (!e) return false; this.applyDiff(e.d, false); this.selection = e.sa; this.undos.push(e); return true; }
  canUndo() { return this.undos.length > 0; } canRedo() { return this.redos.length > 0; }
  depth() { return { undo: this.undos.length, redo: this.redos.length }; }
  canon() { return canon(Object.fromEntries(this.m), this.selection); }
  serialize() { return JSON.stringify({ undos: this.undos, redos: this.redos }); }
  serializedBytes() { return this.serialize().length; }
  static restore(json, from) { const s = new RecordDiff({}); s.m = new Map(from.m); s.selection = from.selection; Object.assign(s, JSON.parse(json)); return s; }
  applyRemote(a) { // a remote change is applied without recording (tldraw: source 'remote' is ignored by the history interceptor)
    const h = this.history; this.history = false; const sel = this.selection; this.act(a); this.selection = sel; this.history = h;
  }
  clearHistory() { this.undos = []; this.redos = []; }
}

// ------------------------------------------------------------------ 3c. property-level deltas (excalidraw ElementsDelta: only changed keys)
export class PropDiff extends RecordDiff {
  static label = 'Property deltas (excalidraw-style)';
  mark(sb, sa) {
    const d = this.pending; this.pending = RecordDiff.empty();
    if (!this.history) return;
    const updated = {};
    for (const [id, [from, to]] of Object.entries(d.updated)) {
      const b = {}, f = {};
      for (const k in to) if (from[k] !== to[k]) { b[k] = from[k]; f[k] = to[k]; }
      if (Object.keys(f).length) updated[id] = [b, f];
    }
    if (!Object.keys(d.added).length && !Object.keys(updated).length && !Object.keys(d.removed).length) return;
    this.undos.push({ d: { added: d.added, removed: d.removed, updated }, sb, sa }); this.redos.length = 0;
  }
  applyDiff(d, reverse) {
    const added = reverse ? d.removed : d.added, removed = reverse ? d.added : d.removed;
    for (const id in removed) this.m.delete(id);
    for (const id in added) this.m.set(id, added[id]);
    for (const id in d.updated) { const cur = this.m.get(id); if (cur) this.m.set(id, { ...cur, ...d.updated[id][reverse ? 0 : 1] }); } // missing (deleted by someone else): skip
  }
  static restore(json, from) { const s = new PropDiff({}); s.m = new Map(from.m); s.selection = from.selection; Object.assign(s, JSON.parse(json)); return s; }
}

// ------------------------------------------------------------------ 4. CRDT: Yjs UndoManager (Y.Map per item)
export class Yjs {
  static label = 'CRDT (Yjs UndoManager)';
  constructor(items, { history = true, stopCapturing = true, captureTimeout = 500 } = {}) {
    this.doc = new Y.Doc(); this.y = this.doc.getMap('items'); this.selection = []; this.history = history; this.stop = stopCapturing;
    this.doc.transact(() => { for (const [id, it] of Object.entries(items)) this.y.set(id, Yjs.toY(it)); }, 'init');
    if (history) {
      this.um = new Y.UndoManager(this.y, { trackedOrigins: new Set(['local']), captureTimeout });
      // documented pattern: keep view state (cursor/selection) in stackItem.meta
      this.um.on('stack-item-added', (e) => { if (e.type === 'undo' && !this.replaying) { e.stackItem.meta.set('sb', this.pendingSb); e.stackItem.meta.set('sa', this.pendingSa); } });
    }
  }
  static toY(it) { const m = new Y.Map(); for (const k of ITEM_KEYS) m.set(k, it[k]); return m; }
  tx(fn) { this.doc.transact(fn, 'local'); }
  mutate(a) {
    const y = this.y;
    switch (a.t) {
      case 'add': y.set(a.item.id, Yjs.toY(a.item)); break;
      case 'recolour': for (const id of a.ids) y.get(id).set('fill', a.fill); break;
      case 'remove': for (const id of a.ids) y.delete(id); break;
      case 'group': y.set(a.group.id, Yjs.toY(a.group)); for (const id of a.ids) y.get(id).set('parentId', a.group.id); break;
      case 'sync': // what an undo/redo would have written: changed properties only
        for (const id of a.remove) y.delete(id);
        for (const it of a.put) { const m = y.get(id(it)); if (!m) y.set(it.id, Yjs.toY(it)); else for (const k of ITEM_KEYS) if (m.get(k) !== it[k]) m.set(k, it[k]); }
        break;
    }
  }
  act(a) {
    if (a.t === 'select') { this.selection = [...a.ids]; return; }
    if (a.t === 'sync') { this.doc.transact(() => this.mutate(a), 'sync'); this.selection = a.selection; return; }
    this.pendingSb = this.selection; this.pendingSa = selAfter(a);
    this.tx(() => this.mutate(a));
    if (this.um && this.stop) this.um.stopCapturing();
    this.selection = this.pendingSa;
  }
  beginGesture(ids) {
    if (this.um && this.stop) this.um.stopCapturing();
    this.g = { depth: this.um ? this.um.undoStack.length : 0, starts: ids.map((id) => [id, this.y.get(id).get('x'), this.y.get(id).get('y')]) };
    this.pendingSb = this.selection; this.pendingSa = [ids[0]];
  }
  dragUpdate(dx, dy) { this.tx(() => { for (const [id, x, y] of this.g.starts) { const m = this.y.get(id); m.set('x', round(x + dx)); m.set('y', round(y + dy)); } }); }
  endGesture(id) { if (this.um && this.stop) this.um.stopCapturing(); this.selection = [id]; this.g = null; }
  cancelGesture() { // Yjs has no bail-to-mark: undo the gesture's own stack item, then drop the redo entry it leaves
    this.um.stopCapturing();
    if (this.um.undoStack.length > this.g.depth) { this.replaying = true; this.um.undo(); this.replaying = false; this.um.redoStack.pop(); }
    this.g = null;
  }
  moveMeta(fromTop, toStack) { const t = toStack[toStack.length - 1]; if (t && fromTop) for (const [k, v] of fromTop.meta) t.meta.set(k, v); }
  undo() {
    const it = this.um.undoStack[this.um.undoStack.length - 1]; if (!it) return false;
    this.replaying = true; this.um.undo(); this.replaying = false;
    this.moveMeta(it, this.um.redoStack); this.selection = it.meta.get('sb') ?? this.selection; return true;
  }
  redo() {
    const it = this.um.redoStack[this.um.redoStack.length - 1]; if (!it) return false;
    this.replaying = true; this.um.redo(); this.replaying = false;
    this.moveMeta(it, this.um.undoStack); this.selection = it.meta.get('sa') ?? this.selection; return true;
  }
  canUndo() { return this.um.undoStack.length > 0; } canRedo() { return this.um.redoStack.length > 0; }
  depth() { return { undo: this.um ? this.um.undoStack.length : 0, redo: this.um ? this.um.redoStack.length : 0 }; }
  canon() { return canon(this.y.toJSON(), this.selection); }
  serialize() { return null; } // UndoManager stacks hold in-memory id sets; the document persists, the history does not
  serializedBytes() { return null; }
  docBytes() { return Y.encodeStateAsUpdate(this.doc).length; }
  connectPeer() { // a second user, synced both ways
    const peer = new Y.Doc();
    Y.applyUpdate(peer, Y.encodeStateAsUpdate(this.doc));
    this.doc.on('update', (u, origin) => { if (origin !== 'remote') Y.applyUpdate(peer, u, 'remote'); });
    peer.on('update', (u, origin) => { if (origin !== 'remote') Y.applyUpdate(this.doc, u, 'remote'); });
    this.peer = peer; return peer;
  }
  applyRemote(a) { // performed by the peer, arrives with origin 'remote' (untracked)
    if (!this.peer) this.connectPeer();
    const y = this.peer.getMap('items');
    this.peer.transact(() => {
      switch (a.t) {
        case 'recolour': for (const id of a.ids) y.get(id).set('fill', a.fill); break;
        case 'remove': for (const id of a.ids) y.delete(id); break;
        case 'move': for (const m of a.moves) { y.get(m.id).set('x', m.x); y.get(m.id).set('y', m.y); } break;
        case 'add': y.set(a.item.id, Yjs.toY(a.item)); break;
      }
    }, 'peer');
  }
  clearHistory() { if (this.um) this.um.clear(); }
}

// ------------------------------------------------------------------ 5. event-sourced: an op log + checkpoints, undo = replay
export class EventSourced {
  static label = 'Event log + checkpoints';
  static K = 100;
  constructor(items, { history = true } = {}) { this.st = { items: structuredClone(items), selection: [] }; this.history = history; this.log = []; this.cursor = 0; this.cps = new Map([[0, structuredClone(items)]]); }
  record(e) {
    if (!this.history) return;
    if (this.cursor < this.log.length) { this.log.length = this.cursor; for (const k of [...this.cps.keys()]) if (k > this.cursor) this.cps.delete(k); }
    this.log.push(e); this.cursor++;
    if (this.cursor % EventSourced.K === 0) this.cps.set(this.cursor, structuredClone(this.st.items));
  }
  act(a) {
    if (a.t === 'select' || a.t === 'sync') { applyAction(this.st, a); return; }
    const sb = this.st.selection; applyAction(this.st, a); this.record({ a, sb, sa: this.st.selection });
  }
  beginGesture(ids) { this.g = { sb: this.st.selection, starts: ids.map((id) => [id, this.st.items[id].x, this.st.items[id].y]) }; }
  dragUpdate(dx, dy) { for (const [id, x, y] of this.g.starts) { const it = this.st.items[id]; it.x = round(x + dx); it.y = round(y + dy); } }
  endGesture(id) {
    this.st.selection = [id];
    const moves = this.g.starts.map(([mid]) => ({ id: mid, x: this.st.items[mid].x, y: this.st.items[mid].y }));
    this.record({ a: { t: 'move', id, moves }, sb: this.g.sb, sa: [id] }); this.g = null;
  }
  cancelGesture() { this.dragUpdate(0, 0); this.g = null; }
  undo() {
    if (this.cursor === 0) return false;
    const e = this.log[--this.cursor];
    let base = Math.floor(this.cursor / EventSourced.K) * EventSourced.K; while (!this.cps.has(base)) base -= EventSourced.K;
    const st = { items: structuredClone(this.cps.get(base)), selection: [] };
    for (let i = base; i < this.cursor; i++) applyAction(st, this.log[i].a);
    this.st = { items: st.items, selection: e.sb }; return true;
  }
  redo() {
    if (this.cursor >= this.log.length) return false;
    const e = this.log[this.cursor++]; applyAction(this.st, e.a); this.st.selection = e.sa;
    if (this.cursor % EventSourced.K === 0 && !this.cps.has(this.cursor)) this.cps.set(this.cursor, structuredClone(this.st.items));
    return true;
  }
  canUndo() { return this.cursor > 0; } canRedo() { return this.cursor < this.log.length; }
  depth() { return { undo: this.cursor, redo: this.log.length - this.cursor }; }
  canon() { return canon(this.st.items, this.st.selection); }
  serialize() { return JSON.stringify({ log: this.log, cursor: this.cursor, cp0: this.cps.get(0) }); }
  serializedBytes() { return JSON.stringify({ log: this.log, cursor: this.cursor }).length; }
  static restore(json, from) {
    const h = JSON.parse(json); const s = new EventSourced(h.cp0); s.log = h.log; s.cursor = h.cursor;
    s.st = { items: structuredClone(from.st.items), selection: from.st.selection };
    // rebuild checkpoints by replay (they are a cache, not state)
    const st = { items: structuredClone(h.cp0), selection: [] };
    for (let i = 0; i < s.log.length; i++) { applyAction(st, s.log[i].a); if ((i + 1) % EventSourced.K === 0) s.cps.set(i + 1, structuredClone(st.items)); }
    return s;
  }
  applyRemote(a) { const sel = this.st.selection; applyAction(this.st, a); this.st.selection = sel; }
  clearHistory() { this.log = []; this.cursor = 0; this.cps = new Map([[0, structuredClone(this.st.items)]]); }
}

export const STRATEGIES = { naive: Naive, command: Command, snapshotSpread: SnapshotSpread, snapshotHamt: SnapshotHamt, immerPatches: ImmerPatches, recordDiff: RecordDiff, propDiff: PropDiff, yjs: Yjs, eventSourced: EventSourced };
