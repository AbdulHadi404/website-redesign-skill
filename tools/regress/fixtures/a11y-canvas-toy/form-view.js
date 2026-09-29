// The equivalent without dragging: native radios, selects and buttons over the
// same model. Works in a screen reader's browse mode, by keyboard, by switch
// access and by voice ("click Add to cake").
import { KINDS, ZONES, zoneOf } from './model.js';

export function createFormView(model, root, announce, { sound, idPrefix = 'f' } = {}) {
  const zoneOptions = ZONES.map(([id, name]) => `<option value="${id}">${name[0].toUpperCase() + name.slice(1)}</option>`).join('');
  root.innerHTML = `
    <form class="add-form" novalidate>
      <fieldset class="kinds"><legend>Topping</legend>
        ${KINDS.map((k, i) => `<label><input type="radio" name="${idPrefix}-kind" value="${k.id}" ${i === 0 ? 'checked' : ''}> <span class="dot dot-${k.id}" aria-hidden="true"></span>${k.name}</label>`).join('')}
      </fieldset>
      <fieldset class="zones"><legend>Where on the cake</legend>
        ${ZONES.map(([id, name]) => `<label><input type="radio" name="${idPrefix}-zone" value="${id}" ${id === 'centre' ? 'checked' : ''}> ${name[0].toUpperCase() + name.slice(1)}</label>`).join('')}
      </fieldset>
      <button type="submit" class="primary">Add to cake</button>
    </form>
    <h2 class="list-h" tabindex="-1">On the cake (<span class="n">0</span>)</h2>
    <p class="empty">Nothing on the cake yet. Choose a topping and where it goes, then Add to cake.</p>
    <ol class="items"></ol>`;
  const form = root.querySelector('form'), list = root.querySelector('.items');
  const heading = root.querySelector('.list-h'), empty = root.querySelector('.empty'), n = root.querySelector('.n');
  const rows = new Map();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const kind = form.querySelector(`input[name="${idPrefix}-kind"]:checked`).value;
    const zone = form.querySelector(`input[name="${idPrefix}-zone"]:checked`).value;
    const it = model.addToZone(kind, zone);
    if (it) sound?.play('add');
    // focus stays on "Add to cake"; the result is announced by the model listener
  });

  function row(it) {
    const li = document.createElement('li');
    const name = model.label(it);
    li.innerHTML = `<span class="name">${name}</span>
      <label>Position <span class="sr-only">of ${name}</span> <select>${zoneOptions}</select></label>
      <button type="button" class="remove">Remove <span class="sr-only">${name}</span></button>`;
    const sel = li.querySelector('select');
    sel.value = zoneOf(it.x, it.y)[0];
    sel.addEventListener('change', () => model.moveToZone(it.id, sel.value));
    li.querySelector('.remove').addEventListener('click', () => {
      const ids = model.state.items.map((i) => i.id), k = ids.indexOf(it.id);
      const next = ids[k + 1] ?? ids[k - 1];
      model.remove(it.id);
      sound?.play('remove');
      (next !== undefined ? rows.get(next)?.querySelector('.remove') : heading)?.focus();
    });
    list.appendChild(li);
    rows.set(it.id, li);
  }
  function counts() { n.textContent = model.state.items.length; empty.hidden = model.state.items.length > 0; }

  model.on((evt) => {
    if (evt.type === 'add') { row(evt.item); counts(); if (!root.dataset.quiet) announce(`${model.label(evt.item)} added near the ${model.where(evt.item)}. ${model.count()}.`); }
    if (evt.type === 'move') {
      const sel = rows.get(evt.item.id)?.querySelector('select');
      if (sel && document.activeElement !== sel) sel.value = zoneOf(evt.item.x, evt.item.y)[0];
      if (evt.source === 'form') announce(`${model.describe(evt.item)}.`);
    }
    if (evt.type === 'remove') { rows.get(evt.item.id)?.remove(); rows.delete(evt.item.id); counts(); if (!root.dataset.quiet) announce(`${model.label(evt.item)} removed. ${model.count()}.`); }
  });
  counts();
  return { form, list, rows };
}
