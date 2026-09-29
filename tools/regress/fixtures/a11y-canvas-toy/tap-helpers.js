// Single-pointer alternative to dragging (WCAG 2.5.7): tap a source, then a
// target. A visible hint says what the next tap will do, and a real Remove
// button appears beside a topping selected by tap.
export function attachTapHelpers(model, view, layer, hint, sound) {
  const rm = document.createElement('button');
  rm.type = 'button'; rm.className = 'remove-float'; rm.hidden = true;
  layer.appendChild(rm);
  let current = null;
  rm.addEventListener('click', () => {
    if (current == null) return;
    model.remove(current); sound?.play('remove');
    current = null; rm.hidden = true; hint.textContent = '';
  });
  const place = () => {
    const it = current != null && model.find(current);
    if (!it) { rm.hidden = true; return; }
    const [x, y] = view.toPx(it.x, it.y);
    rm.style.left = x + 'px'; rm.style.top = (y + view.ITEM + 10) + 'px';
  };
  view.onFrame(place);
  model.on((evt) => { if (evt.type === 'remove' && evt.item.id === current) { current = null; rm.hidden = true; hint.textContent = ''; } });
  return function onTapState({ armed, selected }) {
    if (armed) { current = null; rm.hidden = true; hint.textContent = `Tap the cake to place the ${armed}.`; return; }
    if (selected != null) {
      const it = model.find(selected);
      current = selected;
      rm.innerHTML = `Remove <span class="sr-only">${model.label(it)}</span>`;
      rm.hidden = false; place();
      hint.textContent = `Tap the cake to move ${model.label(it)} there, or remove it.`;
      return;
    }
    current = null; rm.hidden = true; hint.textContent = '';
  };
}
