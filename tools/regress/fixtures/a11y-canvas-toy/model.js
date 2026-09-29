// Shared state model for the "top the cake" toy. Every view (canvas, proxies,
// list/form) reads this model and changes it only through these commands, so
// an accessible alternative is a second view, not a second implementation.
export const KINDS = [
  { id: 'strawberry', name: 'Strawberry' },
  { id: 'candle', name: 'Candle' },
  { id: 'flower', name: 'Flower' },
  { id: 'star', name: 'Star' },
];
export const kindName = (k) => KINDS.find((x) => x.id === k).name;

// Positions are in cake units: x, y in [-1, 1], (0, 0) the centre, y down.
export const ZONES = [
  ['top-left', 'top left', -0.55, -0.55], ['top', 'top', 0, -0.6], ['top-right', 'top right', 0.55, -0.55],
  ['left', 'left', -0.6, 0], ['centre', 'centre', 0, 0], ['right', 'right', 0.6, 0],
  ['bottom-left', 'bottom left', -0.55, 0.55], ['bottom', 'bottom', 0, 0.6], ['bottom-right', 'bottom right', 0.55, 0.55],
];
export const zoneOf = (x, y) => {
  const col = x < -0.33 ? 0 : x > 0.33 ? 2 : 1;
  const row = y < -0.33 ? 0 : y > 0.33 ? 2 : 1;
  return ZONES[row * 3 + col];
};
export const onCake = (x, y) => x * x + y * y <= 1.0;
const clampToCake = (x, y) => {
  const r = Math.hypot(x, y), max = 0.92;
  return r > max ? [x / r * max, y / r * max] : [x, y];
};

export function createModel() {
  const state = { items: [], seq: 1, perKind: {}, selected: null, limit: 40 };
  const listeners = new Set();
  const emit = (evt) => { for (const fn of listeners) fn(evt, state); };
  const find = (id) => state.items.find((i) => i.id === id);
  const label = (it) => `${kindName(it.kind)} ${it.n}`;
  const where = (it) => zoneOf(it.x, it.y)[1];
  const describe = (it) => `${label(it)}, near the ${where(it)}`;
  const count = () => `${state.items.length} ${state.items.length === 1 ? 'topping' : 'toppings'} on the cake`;
  // A free spot near a point: spiral outwards so new items do not stack exactly.
  const freeSpot = (x, y) => {
    for (let k = 0; k < 24; k++) {
      const a = k * 2.4, r = k === 0 ? 0 : 0.12 + 0.03 * k;
      const [px, py] = clampToCake(x + Math.cos(a) * r, y + Math.sin(a) * r);
      if (!state.items.some((i) => Math.hypot(i.x - px, i.y - py) < 0.12)) return [px, py];
    }
    return clampToCake(x, y);
  };
  return {
    state, find, label, where, describe, count,
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    add(kind, x = 0, y = 0, { exact = false } = {}) {
      if (state.items.length >= state.limit) { emit({ type: 'full' }); return null; }
      const [px, py] = exact ? clampToCake(x, y) : freeSpot(x, y);
      state.perKind[kind] = (state.perKind[kind] || 0) + 1;
      const it = { id: state.seq++, kind, n: state.perKind[kind], x: px, y: py, born: performance.now() };
      state.items.push(it);
      emit({ type: 'add', item: it });
      return it;
    },
    addToZone(kind, zoneId) {
      const z = ZONES.find((q) => q[0] === zoneId);
      return this.add(kind, z[2], z[3]);
    },
    move(id, x, y, { source = 'pointer' } = {}) {
      const it = find(id); if (!it) return;
      const before = zoneOf(it.x, it.y)[0];
      [it.x, it.y] = clampToCake(x, y);
      emit({ type: 'move', item: it, zoneChanged: before !== zoneOf(it.x, it.y)[0], source });
    },
    moveToZone(id, zoneId) {
      const z = ZONES.find((q) => q[0] === zoneId);
      const it = find(id); if (!it) return;
      const [px, py] = freeSpot(z[2], z[3]);
      this.move(id, px, py, { source: 'form' });
    },
    remove(id) {
      const idx = state.items.findIndex((i) => i.id === id);
      if (idx < 0) return;
      const [it] = state.items.splice(idx, 1);
      if (state.selected === id) state.selected = null;
      emit({ type: 'remove', item: it, index: idx });
    },
    select(id) { state.selected = id; emit({ type: 'select', id }); },
    summary() {
      if (!state.items.length) return 'An empty cake';
      return `Cake with ${count().replace(' on the cake', '')}: ` + state.items.map(describe).join('; ');
    },
  };
}
