// Parallel DOM over the canvas: a real <button> for every palette entry and for
// every topping, positioned over what it stands for, so keyboard focus is
// visible on the object itself; arrow keys move, Delete removes; a status
// region narrates. Proxies ignore the pointer (pointer-events: none) so the
// canvas keeps its drag handling. Always present (not created on first Tab),
// so a screen reader's browse mode finds them too.
import { KINDS, zoneOf } from './model.js';

export function createProxyLayer(model, view, wrap, announce, { instructionsId, sound } = {}) {
  const layer = document.createElement('div');
  layer.className = 'proxies';
  layer.style.width = view.W + 'px'; layer.style.height = view.H + 'px'; layer.style.transformOrigin = '0 0';
  wrap.appendChild(layer);
  // The canvas scales with its column; the layer scales with it, so proxies stay in canvas units.
  new ResizeObserver(() => { layer.style.transform = `scale(${view.canvas.clientWidth / view.W})`; }).observe(view.canvas);

  // Palette: an APG toolbar with roving tabindex.
  const bar = document.createElement('div');
  bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'Add a topping');
  layer.appendChild(bar);
  const pbtns = KINDS.map((k, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'proxy palette'; b.textContent = k.name; b.tabIndex = i === 0 ? 0 : -1;
    b.style.transform = `translate(${view.PALETTE_X[i] - 40}px, ${view.PALETTE_Y - 44}px)`;
    b.addEventListener('keydown', (e) => {
      const n = { ArrowRight: 1, ArrowLeft: -1, Home: -99, End: 99 }[e.key];
      if (n === undefined) return;
      e.preventDefault();
      const j = Math.max(0, Math.min(KINDS.length - 1, n === -99 ? 0 : n === 99 ? KINDS.length - 1 : i + n));
      pbtns.forEach((x, q) => { x.tabIndex = q === j ? 0 : -1; });
      pbtns[j].focus();
    });
    b.addEventListener('click', () => {
      const it = model.add(k.id, 0, 0);
      if (!it) return;
      sound?.play('add');
      pendingFocus = it.id;
    });
    bar.appendChild(b);
    return b;
  });

  // Toppings on the cake: a list of buttons.
  const group = document.createElement('div');
  group.setAttribute('role', 'group'); group.setAttribute('aria-label', 'Toppings on the cake');
  const list = document.createElement('ul'); list.setAttribute('role', 'list');
  group.appendChild(list); layer.appendChild(group);
  const byId = new Map();
  let pendingFocus = null, moveTimer = 0;

  function makeProxy(it) {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'proxy item';
    if (instructionsId) b.setAttribute('aria-describedby', instructionsId);
    b.addEventListener('focus', () => model.select(it.id));
    b.addEventListener('blur', () => { if (model.state.selected === it.id) model.select(null); });
    b.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 0.25 : 0.08;
      const d = { ArrowUp: [0, -step], ArrowDown: [0, step], ArrowLeft: [-step, 0], ArrowRight: [step, 0] }[e.key];
      if (d) {
        e.preventDefault();
        model.move(it.id, it.x + d[0], it.y + d[1], { source: 'keyboard' });
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removeWithFocus(it.id); }
    });
    li.appendChild(b); list.appendChild(li);
    const p = { li, b, last: '' };
    byId.set(it.id, p);
    label(it);
    return p;
  }
  function label(it) { const p = byId.get(it.id); if (p) p.b.textContent = model.describe(it); }
  function removeWithFocus(id) {
    const ids = model.state.items.map((i) => i.id), k = ids.indexOf(id);
    const next = ids[k + 1] ?? ids[k - 1];
    model.remove(id);
    sound?.play('remove');
    if (next !== undefined) byId.get(next)?.b.focus();
    else pbtns.find((b) => b.tabIndex === 0).focus();
  }

  model.on((evt) => {
    if (evt.type === 'add') {
      makeProxy(evt.item);
      announce(`${model.label(evt.item)} added near the ${model.where(evt.item)}. ${model.count()}.`);
    } else if (evt.type === 'move') {
      label(evt.item);
      if (evt.source === 'keyboard') {
        // Narrate zone changes at once; otherwise only the resting position, once.
        clearTimeout(moveTimer);
        if (evt.zoneChanged) announce(model.describe(evt.item));
        else moveTimer = setTimeout(() => announce(model.describe(evt.item)), 700);
      } else if (evt.source !== 'form') announce(`${model.describe(evt.item)}.`);
    } else if (evt.type === 'remove') {
      const p = byId.get(evt.item.id); p?.li.remove(); byId.delete(evt.item.id);
      announce(`${model.label(evt.item)} removed. ${model.count()}.`);
    } else if (evt.type === 'full') announce('The cake is full. Remove a topping first.');
  });

  // Keep proxies over their objects: write transforms only, never read layout.
  let enabled = true;
  view.onFrame(() => {
    if (!enabled) return;
    // The stand-in's box covers the object's pointer hit area (it carries the focus ring and is what
    // explore-by-touch finds); pointer input itself goes to the canvas (pointer-events: none).
    const d = view.legacyHit ? 44 : 2 * view.hitRadius();
    for (const it of model.state.items) {
      const p = byId.get(it.id); if (!p) continue;
      const [x, y] = view.toPx(it.x, it.y);
      const t = `translate(${(x - d / 2).toFixed(1)}px, ${(y - d / 2).toFixed(1)}px)`;
      if (t !== p.last) { p.b.style.transform = t; p.last = t; }
      if (d !== p.size) { p.b.style.width = p.b.style.height = d.toFixed(1) + 'px'; p.size = d; } // size only on change: it re-lays-out
    }
    if (pendingFocus !== null) { byId.get(pendingFocus)?.b.focus(); pendingFocus = null; }
  });

  return {
    layer, byId,
    setEnabled(v) { enabled = v; layer.style.display = v ? '' : 'none'; },
  };
}

export { zoneOf };
