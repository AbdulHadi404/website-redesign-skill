// Undo history for a configurator: whole-configuration snapshots (the document is ~15 fields, so a snapshot per
// step costs a few hundred bytes; the history lab in ../lab shows when that stops being true).
//
// Rules it implements (each one measured or read in the lab):
//  - one gesture = one step: begin() at pointerdown, preview() while it moves (no history), end() on release,
//    cancel() on Escape (restores, records nothing, keeps redo)
//  - a step that changes nothing is not recorded (excalidraw History.record skips an empty delta)
//  - repeated keyboard nudges of the SAME control within `mergeMs` merge into one step (a slider walked with arrow
//    keys is one change), never time-based merging across different controls (the Yjs captureTimeout pitfall)
//  - a new change clears redo; navigation (tabs) never enters history
//  - every step carries a label, so undo can say what it undid
import { same } from './model.js';

export class History {
  constructor(initial, { limit = 200, mergeMs = 1000, onChange = () => {} } = {}) {
    this.present = initial; this.past = []; this.future = []; this.gesture = null;
    this.limit = limit; this.mergeMs = mergeMs; this.onChange = onChange;
  }
  // Record a finished change. meta: { label, mergeKey, mergeMs, source }
  commit(next, meta = {}) {
    if (this.gesture) this.gesture = null;
    if (same(next, this.present)) return false;
    const last = this.past[this.past.length - 1];
    const now = performance.now();
    if (meta.mergeKey && last && last.mergeKey === meta.mergeKey && now - last.at < (meta.mergeMs ?? this.mergeMs) && !this.future.length) {
      last.after = next; last.at = now; last.label = meta.label ?? last.label;
      if (same(last.before, next)) this.past.pop(); // walked back to where it started: no step at all
    } else {
      this.past.push({ before: this.present, after: next, label: meta.label ?? 'Change', mergeKey: meta.mergeKey ?? null, source: meta.source ?? 'control', at: now });
      if (this.past.length > this.limit) this.past.shift();
    }
    this.future = [];
    this.present = next;
    this.onChange({ type: 'commit', label: meta.label });
    return true;
  }
  begin() { this.gesture = { before: this.present }; }
  preview(next) { this.present = next; this.onChange({ type: 'preview' }); }
  end(meta = {}) {
    if (!this.gesture) return false;
    const before = this.gesture.before; this.gesture = null;
    if (same(before, this.present)) return false;
    this.past.push({ before, after: this.present, label: meta.label ?? 'Change', mergeKey: null, source: meta.source ?? 'canvas', at: performance.now() });
    if (this.past.length > this.limit) this.past.shift();
    this.future = [];
    this.onChange({ type: 'commit', label: meta.label });
    return true;
  }
  cancel() { if (!this.gesture) return; this.present = this.gesture.before; this.gesture = null; this.onChange({ type: 'cancel' }); }
  undo() {
    const e = this.past.pop(); if (!e) return null;
    this.future.push(e); this.present = e.before; this.onChange({ type: 'undo', label: e.label }); return e;
  }
  redo() {
    const e = this.future.pop(); if (!e) return null;
    this.past.push(e); this.present = e.after; this.onChange({ type: 'redo', label: e.label }); return e;
  }
  get canUndo() { return this.past.length > 0; }
  get canRedo() { return this.future.length > 0; }
}
