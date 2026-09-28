// Cake configurator: UI wiring. The model (model.js) is the single source of options, rules and prices; the
// history (history.js) owns the configuration; everything on screen is derived from history.present.
import * as M from './model.js';
import { History } from './history.js';
import { renderCake, renderFlowers, renderSlice, layout, outline, fitViewBox, VIEW } from './render.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const money = (v) => `£${v.toFixed(v % 1 ? 2 : 0)}`;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const t0 = performance.now();
let firstChangeAt = null, changesBeforeReview = 0;

// ---------------------------------------------------------------- analytics (a dataLayer; no vendor)
window.dataLayer = window.dataLayer || [];
const track = (event, props = {}) => window.dataLayer.push({ event, ...props, ms: Math.round(performance.now() - t0) });

// ---------------------------------------------------------------- initial state: link > saved draft > default
const STORE = 'crumb-cake-draft-v1';
const fromUrl = M.decode(location.search.slice(1));
let saved = null;
try { saved = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch { saved = null; }
const fromSaved = saved?.config ? M.decode(M.encode({ ...M.DEFAULT, ...saved.config })) : null;
const entry = fromUrl ? 'link' : fromSaved ? 'resume' : 'default';
const hist = new History(fromUrl ?? fromSaved ?? M.DEFAULT, { onChange: onHistory });
window.__cake = { hist, M, fullRender: () => render() }; // for the scripted checks in prototype-run.mjs

// ---------------------------------------------------------------- the option panels, built from the model
const CHAPTERS = [
  { id: 'start', name: 'Start', value: () => presetMatch()?.name ?? 'Your own' },
  { id: 'size', name: 'Size', value: (c) => `${c.people} people` },
  { id: 'flavour', name: 'Flavour', value: (c) => M.nameOf('sponge', c.sponge) },
  { id: 'outside', name: 'Outside', value: (c) => M.nameOf('finish', c.finish) },
  { id: 'decorate', name: 'Decorate', value: (c) => (c.decorations.length ? `${c.decorations.length} chosen` : 'None') },
];
const KEY_LABEL = { people: 'People', tiers: 'Tiers', shape: 'Shape', sponge: 'Sponge', filling: 'Filling', finish: 'Finish', colour: 'Colour', hue: 'Colour', ganache: 'Chocolate', decorations: 'Decorations', drip: 'Drip colour', flowerPos: 'Flower position', message: 'Message', text: 'Message text' };
const KEY_CHAPTER = { people: 'size', tiers: 'size', shape: 'size', sponge: 'flavour', filling: 'flavour', finish: 'outside', colour: 'outside', hue: 'outside', ganache: 'outside', decorations: 'decorate', drip: 'decorate', flowerPos: 'decorate', message: 'decorate', text: 'decorate' };

const tierHint = (people, tiers) => { const s = M.PEOPLE.find((p) => p.id === people).tiers[tiers]; return `${s.join(' + ')}-inch · ${tiers} ${tiers === 1 ? 'tier' : 'tiers'}`; };
const peopleHint = (people) => { const t = M.allowedTiers(people); return t.map((n) => tierHint(people, n)).join(' or '); };

function radioGroup(key, legend, options, { hint, cls = '' } = {}) {
  return `<fieldset class="group ${cls}" data-key="${key}"><legend>${legend}</legend>${hint ? `<p class="group-hint">${hint}</p>` : ''}<div class="opts">${options.map((o) => `
    <label class="opt" data-value="${o.id}"><input type="radio" name="${key}" value="${o.id}">
      ${o.chip ? `<span class="chip" style="--chip:${o.chip}"></span>` : ''}${o.icon ?? ''}
      <span class="opt-text"><span class="opt-name">${o.name}</span>${o.sub ? `<span class="opt-sub">${o.sub}</span>` : ''}<span class="opt-why" hidden></span></span></label>`).join('')}</div></fieldset>`;
}
const shapeIcon = (id) => `<svg class="opt-icon" viewBox="-20 -14 40 28" aria-hidden="true"><path d="${pathOf(outline(id, 13, 48).map(([x, z]) => [x, z * 0.9]))}" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
const pathOf = (pts) => `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}Z`;

function buildPanels() {
  const tabs = $('.tabs'), panes = $('.panes');
  tabs.innerHTML = CHAPTERS.map((ch, i) => `<button type="button" role="tab" id="tab-${ch.id}" aria-controls="pane-${ch.id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}"><span class="tab-name">${ch.name}</span><span class="tab-value" data-chapter="${ch.id}"></span></button>`).join('');
  const next = (id, label) => `<div class="pane-next"><button type="button" class="secondary" data-goto="${id}">${label}</button></div>`;
  const pane = (id, html) => `<div class="pane" role="tabpanel" id="pane-${id}" aria-labelledby="tab-${id}" ${id === 'start' ? '' : 'hidden'}>${html}</div>`;
  panes.innerHTML = [
    pane('start', `<h2 class="pane-title">Start from one of ours</h2><p class="pane-lead">Pick the closest, then change anything.</p>
      <ul class="presets">${M.PRESETS.map((p) => `<li><button type="button" class="preset" data-preset="${p.id}" aria-describedby="preset-${p.id}-meta"><svg viewBox="${fitViewBox(p.config, 4)}" aria-hidden="true" class="preset-svg">${renderCake(p.config, `preset-${p.id}`)}</svg><span class="preset-name">${p.name}</span><span class="preset-meta" id="preset-${p.id}-meta">${p.config.people} people · from ${money(M.price(p.config).total)}</span></button></li>`).join('')}</ul>
      <div class="surprise"><button type="button" class="secondary" id="surprise">Surprise me</button><p class="group-hint">Changes flavours, finish and decorations. Keeps your number of people and your message.</p></div>
      ${next('size', 'Next: size')}`),
    pane('size', radioGroup('people', 'How many people?', M.PEOPLE.map((p) => ({ id: p.id, name: `${p.id} people`, sub: peopleHint(p.id) }))) +
      `<div data-slot="tiers"></div>` +
      radioGroup('shape', 'Shape', M.SHAPES.map((s) => ({ id: s.id, name: s.name, sub: s.price ? `+${money(s.price)}` : 'Included', icon: shapeIcon(s.id) })), { cls: 'cols-3', hint: 'Heart cakes are one tier, for up to 20 people.' }) + next('flavour', 'Next: flavour')),
    pane('flavour', radioGroup('sponge', 'Sponge', M.SPONGES.map((s) => ({ id: s.id, name: s.name, chip: s.colour })), { cls: 'cols-2' }) +
      radioGroup('filling', 'Filling', M.FILLINGS.map((s) => ({ id: s.id, name: s.name, chip: s.colour })), { cls: 'cols-2' }) +
      `<div class="slice slice-pane" aria-hidden="true"><svg viewBox="0 0 122 96" class="slice-svg"></svg><span class="slice-label"></span></div>` + next('outside', 'Next: outside')),
    pane('outside', radioGroup('finish', 'Finish', M.FINISHES.map((f) => ({ id: f.id, name: f.name, sub: `${f.note} · ${money(f.perPerson)} a person` }))) +
      radioGroup('colour', 'Colour', M.COLOURS.map((c) => ({ id: c.id, name: c.name, chip: c.colour ?? 'conic-gradient(#f1c3be,#f4e19e,#b7c9ad,#bcd2e5,#d3c3e3,#f1c3be)' })), { cls: 'cols-2 swatches' }) +
      `<div class="group hue-group" data-show="custom"><div class="field-row"><label for="hue" class="field-label">Your colour</label><output id="hue-out" class="field-out" for="hue"></output></div><input type="range" id="hue" min="0" max="359" step="1" aria-describedby="hue-out"></div>` +
      radioGroup('ganache', 'Chocolate', M.GANACHE.map((g) => ({ id: g.id, name: g.name, chip: g.colour })), { cls: 'cols-3' }) +
      `<p class="group-hint naked-note">A naked cake shows its sponge, so there is no colour to choose.</p>` + next('decorate', 'Next: decorate')),
    pane('decorate', `<fieldset class="group" data-key="decorations"><legend>Decorations</legend><p class="group-hint">Up to three. More than that crowds a cake this size.</p><div class="opts">${M.DECORATIONS.map((d) => `
      <label class="opt" data-value="${d.id}"><input type="checkbox" name="decorations" value="${d.id}"><span class="opt-text"><span class="opt-name">${d.name} <span class="opt-price">+${money(d.price)}</span></span><span class="opt-sub">${d.note}</span><span class="opt-why" hidden></span></span></label>`).join('')}</div></fieldset>` +
      radioGroup('drip', 'Drip colour', M.DRIPS.map((d) => ({ id: d.id, name: d.name, chip: d.colour })), { cls: 'cols-2 dep-drip' }) +
      `<div class="group dep-flowers"><div class="field-row"><label for="flowerPos" class="field-label">Where the flowers sit</label><output id="flower-out" class="field-out" for="flowerPos"></output></div><input type="range" id="flowerPos" min="-100" max="100" step="5" aria-describedby="flower-out flower-hint"><p class="group-hint" id="flower-hint">You can also drag the flowers on the cake.</p></div>` +
      radioGroup('message', 'Message', M.MESSAGES.map((m) => ({ id: m.id, name: m.name, sub: m.price ? `+${money(m.price)}` : m.id === 'none' ? '' : 'Included' })), { cls: 'cols-3' }) +
      `<div class="group dep-text"><label for="text" class="field-label">What should it say?</label><input type="text" id="text" maxlength="${M.MAX_TEXT}" autocomplete="off" aria-describedby="text-count"><p class="group-hint" id="text-count"></p></div>` +
      `<div class="pane-next"><button type="button" class="secondary" data-open-review>Next: review</button></div>`),
  ].join('');
}

// ---------------------------------------------------------------- rendering from state
const svg = $('#cake');
function render() {
  const c = hist.present;
  const vb = fitViewBox(c); if (svg.getAttribute('viewBox') !== vb) svg.setAttribute('viewBox', vb);
  svg.innerHTML = renderCake(c);
  $('#cake-desc').textContent = M.describe(c);
  const L = layout(c); const sizes = M.tierSizes(c);
  $('#dims').textContent = `Serves ${c.people} · ${Math.round(sizes[0] * 2.54)} cm across · ${c.tiers * 10} cm tall`;
  for (const s of $$('.slice-svg')) s.innerHTML = renderSlice(c);
  for (const s of $$('.slice-label')) s.textContent = `Inside: ${M.nameOf('sponge', c.sponge)} sponge, ${M.nameOf('filling', c.filling).toLowerCase()}`;
  const p = M.price(c);
  $('#price').textContent = money(p.total);
  $('#per').textContent = `${money(Math.round(p.perPerson * 100) / 100)} a person`;
  for (const el of $$('.tab-value')) el.textContent = CHAPTERS.find((ch) => ch.id === el.dataset.chapter).value(c);
  syncControls(c);
  $('#undo').disabled = !hist.canUndo; $('#redo').disabled = !hist.canRedo;
  $('#undo').title = hist.canUndo ? `Undo: ${hist.past[hist.past.length - 1].label} (Ctrl+Z)` : 'Nothing to undo';
  $('#redo').title = hist.canRedo ? `Redo: ${hist.future[hist.future.length - 1].label} (Ctrl+Shift+Z)` : 'Nothing to redo';
  if (!$('#review').hidden) renderReview();
  void L; void VIEW;
}

function syncControls(c) {
  // tiers: only the counts that suit the number of people are offered (disclosure follows the dependency graph)
  const slot = $('[data-slot="tiers"]');
  const allowed = M.allowedTiers(c.people);
  const want = allowed.join(',');
  if (slot.dataset.for !== want) {
    slot.dataset.for = want;
    slot.innerHTML = allowed.length > 1
      ? radioGroup('tiers', 'Tiers', allowed.map((t) => ({ id: t, name: `${t} ${t === 1 ? 'tier' : 'tiers'}`, sub: `${tierHint(c.people, t)}${M.TIER_PRICE[t] ? ` · +${money(M.TIER_PRICE[t])}` : ''}` })), { cls: 'cols-2' })
      : `<p class="group-hint tiers-fixed">${c.people} people is one ${M.PEOPLE.find((p) => p.id === c.people).tiers[allowed[0]].join(' + ')}-inch ${allowed[0] === 1 ? 'tier' : `stack of ${allowed[0]}`}. More tiers start at 20 people.</p>`;
  }
  for (const input of $$('input[type=radio]', $('.panes'))) {
    const key = input.name; const val = key === 'people' || key === 'tiers' ? Number(input.value) : input.value;
    input.checked = M.same(c[key], val);
    const opt = input.closest('.opt'); const why = opt.querySelector('.opt-why');
    const reason = M.unavailableReason(c, key, val); const effect = input.checked ? null : M.sideEffectHint(c, key, val);
    input.setAttribute('aria-disabled', reason ? 'true' : 'false'); opt.classList.toggle('is-inactive', !!reason);
    why.hidden = !(reason || effect); why.textContent = reason || effect || ''; why.classList.toggle('is-effect', !reason && !!effect);
  }
  for (const input of $$('input[name=decorations]')) {
    input.checked = c.decorations.includes(input.value);
    const opt = input.closest('.opt'); const why = opt.querySelector('.opt-why');
    const reason = M.unavailableReason(c, 'decorations', input.value); const effect = input.checked || reason ? null : M.sideEffectHint(c, 'decorations', M.DECORATIONS.map((d) => d.id).filter((d) => d === input.value || c.decorations.includes(d)));
    input.setAttribute('aria-disabled', reason ? 'true' : 'false'); opt.classList.toggle('is-inactive', !!reason);
    why.hidden = !(reason || effect); why.textContent = reason || effect || ''; why.classList.toggle('is-effect', !reason && !!effect);
  }
  const colourable = c.finish === 'buttercream' || c.finish === 'fondant';
  $('[data-key="colour"]').hidden = !colourable;
  $('.hue-group').hidden = !(colourable && c.colour === 'custom');
  $('[data-key="ganache"]').hidden = c.finish !== 'ganache';
  $('.naked-note').hidden = c.finish !== 'naked';
  $('[data-key="drip"]').hidden = !c.decorations.includes('drip');
  $('.dep-flowers').hidden = !c.decorations.includes('flowers');
  $('.dep-text').hidden = c.message === 'none';
  const hue = $('#hue'); if (document.activeElement !== hue && !hist.gesture) hue.value = c.hue;
  hue.style.setProperty('--swatch', M.hslHex(c.hue, 0.5, 0.8));
  $('#hue-out').textContent = cap(M.hueName(c.hue));
  const fp = $('#flowerPos'); if (!hist.gesture) fp.value = Math.round(c.flowerPos * 100);
  $('#flower-out').textContent = c.flowerPos < -0.25 ? 'Left' : c.flowerPos > 0.25 ? 'Right' : 'Centre';
  const text = $('#text'); if (document.activeElement !== text) text.value = c.text;
  $('#text-count').textContent = `${c.text.length} of ${M.MAX_TEXT} characters`;
  for (const b of $$('.preset')) b.setAttribute('aria-pressed', String(M.same(M.PRESETS.find((p) => p.id === b.dataset.preset).config, c)));
}
const presetMatch = () => M.PRESETS.find((p) => M.same(p.config, hist.present));

// ---------------------------------------------------------------- changes, repairs, notices
function choose(key, value, { source = 'control', mergeKey, mergeMs } = {}) {
  const cur = hist.present;
  if (M.same(cur[key], value)) return false;
  const reason = M.unavailableReason(cur, key, value);
  if (reason) { notice(`${reason}.`); track('inactive_option_tapped', { key, value, reason }); render(); return false; }
  const { config, adjustments } = M.resolve({ ...cur, [key]: value }, [key]);
  const label = `${KEY_LABEL[key]}: ${key === 'hue' ? M.hueName(value) : key === 'flowerPos' ? $('#flower-out').textContent : key === 'text' ? `“${value}”` : M.nameOf(key, value)}`;
  const changed = hist.commit(config, { label, mergeKey, mergeMs, source });
  if (!changed) return false;
  if (firstChangeAt === null) { firstChangeAt = Math.round(performance.now() - t0); track('first_change', { key, ms_to_first_change: firstChangeAt }); }
  changesBeforeReview++;
  // never send what a person typed (the message is personal data); its length is enough to learn from
  track('option_changed', { key, value: key === 'text' ? `${value.length} chars` : Array.isArray(value) ? value.join('.') : value, source });
  if (adjustments.length) {
    for (const a of adjustments) track('constraint_resolved', { key: a.key, reason: a.reason });
    const byReason = new Map();
    for (const a of adjustments) byReason.set(a.reason, [...(byReason.get(a.reason) ?? []), a]);
    notice([...byReason].map(([reason, as]) => `${cap(reason)}, so we ${phrases(as)}.`).join(' '), true);
  } else if (source !== 'keyboard-slider') clearNotice();
  return true;
}
// How a repair is said: what we changed, in the customer's words ("made it 20 people, one tier").
const NUM = ['zero', 'one', 'two', 'three'];
function phrases(as) {
  const made = [], other = [];
  for (const a of as) {
    if (a.key === 'people') made.push(`${a.to} people`);
    else if (a.key === 'tiers') made.push(`${NUM[a.to]} ${a.to === 1 ? 'tier' : 'tiers'}`);
    else if (a.key === 'shape') other.push(`switched to ${M.nameOf('shape', a.to).toLowerCase()}`);
    else if (a.key === 'finish') other.push(`switched the finish to ${M.nameOf('finish', a.to).toLowerCase()}`);
    else if (a.key === 'message') other.push('put the message on a plaque');
    else if (a.key === 'decorations') other.push(`removed the ${M.DECORATIONS.find((d) => d.id === a.from.find((x) => !a.to.includes(x))).name.toLowerCase()}`);
    else other.push(`changed the ${KEY_LABEL[a.key].toLowerCase()}`);
  }
  return M.listJoin([...(made.length ? [`made it ${made.join(', ')}`] : []), ...other]);
}
let noticeTimer = 0;
function notice(text, undoable = false, extra = '') {
  const n = $('#notice');
  n.innerHTML = `<p>${text}</p>${undoable ? '<button type="button" class="link" data-undo>Undo</button>' : ''}${extra}<button type="button" class="link dismiss" data-dismiss aria-label="Dismiss message">Dismiss</button>`;
  n.classList.add('is-on');
  clearTimeout(noticeTimer);
}
function clearNotice() { const n = $('#notice'); n.classList.remove('is-on'); n.innerHTML = ''; }
function announce(text) { const a = $('#announcer'); a.textContent = ''; requestAnimationFrame(() => { a.textContent = text; }); }

// ---------------------------------------------------------------- persistence: URL (shareable) + this device (resume)
let saveTimer = 0;
// During a gesture only what moves is repainted (the flowers; the cake itself for a colour); the panel, price,
// description and link catch up once, on release. Measured: a full render per pointer move cost 13.7 ms median at
// a 4x CPU slowdown; see results.json prototype.behaviour.renderCost.
function renderPreview() {
  const c = hist.present;
  const flowers = svg.querySelector('[data-part="flowers"]');
  const g = hist.gesture?.before;
  const onlyFlowers = g && flowers && Object.keys(c).every((k) => k === 'flowerPos' || M.same(c[k], g[k]));
  if (onlyFlowers) { flowers.outerHTML = renderFlowers(c); return; }
  svg.innerHTML = renderCake(c);
  for (const s of $$('.slice-svg')) s.innerHTML = renderSlice(c);
}
function onHistory(ev) {
  if (ev.type === 'preview') { renderPreview(); return; }
  render();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const q = M.encode(hist.present);
    history.replaceState(null, '', `${location.pathname}?${q}`);
    try { localStorage.setItem(STORE, JSON.stringify({ config: hist.present, at: Date.now() })); $('#saved').textContent = 'Saved on this device'; }
    catch { $('#saved').textContent = 'Not saved: this browser blocks storage. Copy the link to keep it.'; }
  }, 250);
}

// ---------------------------------------------------------------- tabs
function showTab(id, { focus = false } = {}) {
  closeReview();
  for (const t of $$('[role=tab]')) { const on = t.id === `tab-${id}`; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; if (on && focus) t.focus(); }
  for (const p of $$('.pane')) p.hidden = p.id !== `pane-${id}`;
  $('.panes').scrollTop = 0;
}
function wireTabs() {
  const tabs = $$('[role=tab]');
  $('.tabs').addEventListener('click', (e) => { const t = e.target.closest('[role=tab]'); if (t) showTab(t.id.slice(4)); });
  $('.tabs').addEventListener('keydown', (e) => {
    const i = tabs.indexOf(document.activeElement); if (i < 0) return;
    const j = e.key === 'ArrowRight' ? (i + 1) % tabs.length : e.key === 'ArrowLeft' ? (i - 1 + tabs.length) % tabs.length : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : -1;
    if (j >= 0) { e.preventDefault(); showTab(tabs[j].id.slice(4), { focus: true }); }
  });
}

// ---------------------------------------------------------------- controls
function wireControls() {
  const panes = $('.panes');
  panes.addEventListener('click', (e) => {
    const inactive = e.target.closest('input[aria-disabled="true"]');
    if (inactive) {
      e.preventDefault();
      const reason = M.unavailableReason(hist.present, inactive.name, inactive.name === 'people' || inactive.name === 'tiers' ? Number(inactive.value) : inactive.value);
      notice(`${reason}.`); track('inactive_option_tapped', { key: inactive.name, value: inactive.value, reason }); // demand for what is not offered
      return;
    }
    const go = e.target.closest('[data-goto]'); if (go) { showTab(go.dataset.goto, { focus: true }); return; }
    if (e.target.closest('[data-open-review]')) { openReview(); return; }
    const pre = e.target.closest('[data-preset]');
    if (pre) {
      const p = M.PRESETS.find((x) => x.id === pre.dataset.preset);
      if (hist.commit(structuredClone(p.config), { label: `Started from ${p.name}`, source: 'preset' })) { track('preset_applied', { preset: p.id }); notice(`Started from ${p.name}.`, true); }
      return;
    }
    if (e.target.closest('#surprise')) {
      const next = M.randomise(hist.present);
      if (hist.commit(next, { label: 'Surprise me', source: 'randomise' })) { track('randomised'); notice('Here is a surprise. Undo goes back to your cake.', true); announce(M.describe(next)); }
    }
  });
  panes.addEventListener('change', (e) => {
    const t = e.target;
    if (t.type === 'radio') { const v = t.name === 'people' || t.name === 'tiers' ? Number(t.value) : t.value; if (!choose(t.name, v)) render(); }
    if (t.type === 'checkbox' && t.name === 'decorations') {
      const cur = hist.present.decorations;
      const next = t.checked ? [...cur, t.value] : cur.filter((d) => d !== t.value);
      if (t.checked && M.unavailableReason(hist.present, 'decorations', t.value)) { t.checked = false; return; }
      choose('decorations', M.DECORATIONS.map((d) => d.id).filter((d) => next.includes(d)));
    }
  });
  // sliders: a pointer gesture is one step; keyboard nudges of the same slider merge into one step
  for (const [id, key, toValue] of [['hue', 'hue', (v) => Number(v)], ['flowerPos', 'flowerPos', (v) => Number(v) / 100]]) {
    const el = $(`#${id}`);
    el.addEventListener('pointerdown', () => hist.begin());
    el.addEventListener('input', () => {
      if (hist.gesture) hist.preview({ ...hist.present, [key]: toValue(el.value) });
      else choose(key, toValue(el.value), { source: 'keyboard-slider', mergeKey: key });
    });
    el.addEventListener('change', () => {
      if (hist.gesture && hist.end({ label: `${KEY_LABEL[key]}: ${key === 'hue' ? M.hueName(hist.present.hue) : $('#flower-out').textContent}`, source: 'control' })) { track('option_changed', { key, value: hist.present[key], source: 'slider-drag' }); changesBeforeReview++; }
    });
    el.addEventListener('keydown', (e) => { if (e.key === 'Escape' && hist.gesture) hist.cancel(); });
  }
  // text: one step per visit to the field, however many keystrokes
  let textVisit = 0;
  $('#text').addEventListener('focus', () => { textVisit++; });
  $('#text').addEventListener('input', (e) => choose('text', e.target.value.slice(0, M.MAX_TEXT), { mergeKey: `text-${textVisit}`, mergeMs: Infinity, source: 'keyboard-slider' }));
  $('#notice').addEventListener('click', (e) => {
    if (e.target.closest('[data-undo]')) { doUndo(); clearNotice(); $('#undo').disabled ? $('#panel').focus() : $('#undo').focus(); }
    if (e.target.closest('[data-dismiss]')) clearNotice();
    if (e.target.closest('[data-restart]')) { hist.commit(structuredClone(M.DEFAULT), { label: 'Started again', source: 'restart' }); track('restarted'); notice('Started again from Blush garden.', true); }
  });
}

// ---------------------------------------------------------------- undo / redo / share
function doUndo() { const e = hist.undo(); if (e) { announce(`Undone: ${e.label}`); track('undo', { label: e.label }); clearNotice(); } }
function doRedo() { const e = hist.redo(); if (e) { announce(`Redone: ${e.label}`); track('redo', { label: e.label }); clearNotice(); } }
function wireTools() {
  $('#undo').addEventListener('click', doUndo);
  $('#redo').addEventListener('click', doRedo);
  $('#share').addEventListener('click', async () => {
    const url = `${location.origin}${location.pathname}?${M.encode(hist.present)}`;
    let ok = true; try { await navigator.clipboard.writeText(url); } catch { ok = false; }
    $('#share-label').textContent = ok ? 'Link copied' : 'Copy failed';
    announce(ok ? 'Link to this cake copied' : 'Could not copy. The address bar has the link.');
    track('link_copied', { ok });
    setTimeout(() => { $('#share-label').textContent = 'Copy link'; }, 2500);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && hist.gesture) { hist.cancel(); dragging = null; return; }
    const mod = e.ctrlKey || e.metaKey; if (!mod) return;
    const typing = e.target.matches('input[type=text], input[type=email], input[type=tel], textarea, input[type=date]');
    if (typing) return; // the field's own undo
    const k = e.key.toLowerCase();
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); doUndo(); }
    else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); doRedo(); }
  });
}

// ---------------------------------------------------------------- the preview: tap to open a chapter, drag the flowers
let dragging = null;
function svgPoint(e) { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); }
function wireCanvas() {
  svg.addEventListener('pointerdown', (e) => {
    const part = e.target.closest('[data-part]')?.dataset.part; if (!part) return;
    dragging = { part, x: e.clientX, y: e.clientY, id: e.pointerId, started: false, slop: e.pointerType === 'mouse' ? 4 : 6 };
    svg.setPointerCapture(e.pointerId);
  });
  svg.addEventListener('pointermove', (e) => {
    if (!dragging || dragging.id !== e.pointerId || dragging.part !== 'flowers') return;
    if (!dragging.started) { if (Math.hypot(e.clientX - dragging.x, e.clientY - dragging.y) < dragging.slop) return; dragging.started = true; hist.begin(); svg.classList.add('is-dragging'); }
    const c = hist.present; const L = layout(c); const top = L.tiers[L.tiers.length - 1];
    const pos = Math.max(-1, Math.min(1, (svgPoint(e).x - L.cx) / (top.r * 0.72)));
    hist.preview({ ...c, flowerPos: Math.round(pos * 20) / 20 });
  });
  const finish = (e) => {
    if (!dragging || dragging.id !== e.pointerId) return;
    const d = dragging; dragging = null; svg.classList.remove('is-dragging');
    if (d.started) {
      if (hist.end({ label: `Flower position: ${hist.present.flowerPos < -0.25 ? 'left' : hist.present.flowerPos > 0.25 ? 'right' : 'centre'}`, source: 'canvas' })) { track('option_changed', { key: 'flowerPos', value: hist.present.flowerPos, source: 'canvas' }); changesBeforeReview++; }
      return;
    }
    // a tap: open the chapter that owns what was tapped (the canvas never moves; the panel changes)
    const chapter = d.part === 'cake' || d.part === 'board' ? 'outside' : 'decorate';
    showTab(chapter);
    const target = d.part === 'flowers' ? '#flowerPos' : d.part === 'message' ? '#text' : chapter === 'outside' ? 'input[name=finish]:checked' : `input[value="${d.part}"]`;
    const el = $(target); if (el) { el.scrollIntoView({ block: 'nearest' }); el.focus({ preventScroll: true }); }
    track('canvas_tap', { part: d.part });
  };
  svg.addEventListener('pointerup', finish);
  svg.addEventListener('pointercancel', (e) => { if (dragging?.started) hist.cancel(); dragging = null; svg.classList.remove('is-dragging'); void e; });
}

// ---------------------------------------------------------------- review, request, confirmation
const fmtDate = (d) => d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const earliest = () => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + M.leadDays(hist.present)); return d; };
let form = { date: '', name: '', email: '', phone: '', notes: '' }, errors = {}, sent = null;
function openReview() {
  $('#editor').hidden = true; $('#review').hidden = false; $('#buybar').hidden = true;
  renderReview();
  $('#review h2').focus();
  track('review_opened', { estimate: M.price(hist.present).total, changes_before_review: changesBeforeReview });
}
function closeReview() { if ($('#review').hidden) return; $('#review').hidden = true; $('#editor').hidden = false; $('#buybar').hidden = false; }
function renderReview() {
  const c = hist.present; const p = M.price(c); const min = earliest();
  const r = $('#review');
  if (sent) {
    r.innerHTML = `<h2 tabindex="-1" class="review-title">Request sent</h2>
      <p class="lead">Thank you, ${escapeHtml(sent.name)}. Your reference is <strong>${sent.ref}</strong>.</p>
      <h3 class="review-sub">What happens next</h3>
      <ol class="next-steps"><li>We check ${escapeHtml(fmtDate(new Date(`${sent.date}T12:00`)))} and reply to ${escapeHtml(sent.email)} within one working day with the final price.</li><li>A 30% deposit holds your date.</li><li>We send photos of your cake before collection.</li></ol>
      <div class="review-actions"><button type="button" class="secondary" id="copy-sent">Copy link to this cake</button><button type="button" class="link" id="again">Design another cake</button></div>`;
    $('#copy-sent').addEventListener('click', () => $('#share').click());
    $('#again').addEventListener('click', () => { sent = null; closeReview(); showTab('start', { focus: true }); });
    return;
  }
  const rows = [
    ['Size', `${c.people} people · ${tierHint(c.people, c.tiers)} · ${M.nameOf('shape', c.shape).toLowerCase()}`, 'size'],
    ['Inside', `${M.nameOf('sponge', c.sponge)} sponge, ${M.nameOf('filling', c.filling).toLowerCase()}`, 'flavour'],
    ['Outside', cap(`${c.finish === 'naked' ? '' : c.finish === 'ganache' ? `${M.nameOf('ganache', c.ganache).toLowerCase()} chocolate ` : c.colour === 'custom' ? `${M.hueName(c.hue)} ` : `${M.nameOf('colour', c.colour).toLowerCase()} `}${M.nameOf('finish', c.finish).toLowerCase()}`), 'outside'],
    ['Decorations', c.decorations.length ? cap(M.nameOf('decorations', c.decorations)) : 'None', 'decorate'],
    ['Message', c.message === 'none' || !c.text ? 'None' : `“${escapeHtml(c.text)}”, ${c.message === 'piped' ? 'piped on top' : 'on a plaque'}`, 'decorate'],
  ];
  const errList = Object.entries(errors);
  r.innerHTML = `<h2 tabindex="-1" class="review-title">Your cake</h2>
    ${errList.length >= 3 ? `<div class="error-summary" role="alert" tabindex="-1"><h3>There is a problem</h3><ul>${errList.map(([k, m]) => `<li><a href="#f-${k}">${m}</a></li>`).join('')}</ul></div>` : ''}
    <dl class="spec">${rows.map(([k, v, ch]) => `<div class="spec-row"><dt>${k}</dt><dd>${v}</dd><dd class="spec-edit"><button type="button" class="link" data-edit="${ch}" aria-label="Change ${k.toLowerCase()}">Change</button></dd></div>`).join('')}</dl>
    <table class="price-table"><caption>Estimate</caption><tbody>${p.lines.map(([k, v]) => `<tr><th scope="row">${k}</th><td>${money(v)}</td></tr>`).join('')}</tbody><tfoot><tr><th scope="row">Estimate</th><td>${money(p.total)}</td></tr></tfoot></table>
    <p class="group-hint">Sample prices for this prototype. We confirm the final price when we reply.</p>
    <form class="request" id="request" novalidate>
      <h3 class="review-sub">When and who</h3>
      ${field('date', 'Collection date', `<input type="date" id="f-date" name="date" min="${isoDate(min)}" value="${form.date}" aria-describedby="date-hint${errors.date ? ' date-err' : ''}"${errors.date ? ' aria-invalid="true"' : ''}>`, `This cake needs ${M.leadDays(c)} days. The earliest date is ${fmtDate(min)}.`)}
      ${field('name', 'Your name', `<input type="text" id="f-name" name="name" autocomplete="name" value="${escapeHtml(form.name)}"${errors.name ? ' aria-invalid="true" aria-describedby="name-err"' : ''}>`)}
      ${field('email', 'Email', `<input type="email" id="f-email" name="email" autocomplete="email" inputmode="email" value="${escapeHtml(form.email)}"${errors.email ? ' aria-invalid="true" aria-describedby="email-err"' : ''}>`)}
      ${field('phone', 'Phone (optional)', `<input type="tel" id="f-phone" name="phone" autocomplete="tel" inputmode="tel" value="${escapeHtml(form.phone)}">`)}
      <div class="review-actions"><button type="submit" class="primary">Send request · ${money(p.total)} estimate</button><button type="button" class="link" id="back-edit">Back to your cake</button></div>
      <p class="group-hint">Nothing is charged now. We reply within one working day.</p>
    </form>`;
  r.querySelector('#request').addEventListener('input', (e) => { form[e.target.name] = e.target.value; if (Object.keys(errors).length) { errors = validate(); paintErrors(); } });
  r.querySelector('#request').addEventListener('submit', (e) => { e.preventDefault(); submit(); });
  r.querySelector('#back-edit').addEventListener('click', () => { closeReview(); showTab('start'); $('[role=tab][aria-selected=true]').focus(); });
  for (const b of r.querySelectorAll('[data-edit]')) b.addEventListener('click', () => showTab(b.dataset.edit, { focus: true }));
}
function field(name, label, input, hint) {
  return `<div class="field${errors[name] ? ' has-error' : ''}"><label for="f-${name}" class="field-label">${label}</label>${hint ? `<p class="field-hint" id="${name}-hint">${hint}</p>` : ''}${errors[name] ? `<p class="field-error" id="${name}-err"><span class="visually-hidden">Error: </span>${errors[name]}</p>` : ''}${input}</div>`;
}
function validate() {
  const e = {}; const min = isoDate(earliest());
  if (!form.date) e.date = 'Choose a collection date';
  else if (form.date < min) e.date = `Choose ${fmtDate(new Date(`${min}T12:00`))} or later: this cake needs ${M.leadDays(hist.present)} days`;
  if (!form.name.trim()) e.name = 'Enter your name';
  if (!form.email.trim()) e.email = 'Enter your email address, so we can reply';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Enter an email address like name@example.com';
  return e;
}
// Live re-validation after a failed submit updates the messages IN PLACE. Re-rendering the form on each keystroke
// (the first version did) loses the caret and a date field's half-typed segments: found by the keyboard test.
function paintErrors() {
  for (const name of ['date', 'name', 'email']) {
    const input = document.getElementById(`f-${name}`); if (!input) continue;
    const box = input.closest('.field'); let err = box.querySelector('.field-error');
    const ids = new Set((input.getAttribute('aria-describedby') || '').split(' ').filter(Boolean));
    if (errors[name]) {
      if (!err) { err = document.createElement('p'); err.className = 'field-error'; err.id = `${name}-err`; input.before(err); }
      err.innerHTML = `<span class="visually-hidden">Error: </span>${errors[name]}`;
      input.setAttribute('aria-invalid', 'true'); ids.add(`${name}-err`);
    } else { err?.remove(); input.removeAttribute('aria-invalid'); ids.delete(`${name}-err`); }
    if (ids.size) input.setAttribute('aria-describedby', [...ids].join(' ')); else input.removeAttribute('aria-describedby');
    box.classList.toggle('has-error', !!errors[name]);
  }
  const sum = $('.error-summary'), list = Object.entries(errors);
  if (sum && !list.length) sum.remove();
  else if (sum) sum.querySelector('ul').innerHTML = list.map(([k, m]) => `<li><a href="#f-${k}">${m}</a></li>`).join('');
  if (!list.length) document.title = 'Design your cake · Crumb & Co.';
}
function submit() {
  errors = validate();
  const keys = Object.keys(errors);
  if (keys.length) {
    track('validation_failed', { fields: keys.join(',') });
    document.title = `Error: Design your cake · Crumb & Co.`;
    renderReview();
    if (keys.length >= 3) $('.error-summary').focus(); else document.getElementById(`f-${keys[0]}`).focus();
    return;
  }
  document.title = 'Design your cake · Crumb & Co.';
  const ref = `CK-${(Math.abs([...M.encode(hist.present) + form.date].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) | 0, 7)) % 1e6).toString(36).toUpperCase().padStart(4, '0')}`;
  sent = { ref, name: form.name.trim(), email: form.email.trim(), date: form.date };
  track('request_submitted', { estimate: M.price(hist.present).total, lead_days: M.leadDays(hist.present), changes_before_review: changesBeforeReview });
  renderReview(); $('#review h2').focus();
}
const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

// ---------------------------------------------------------------- start
buildPanels(); wireTabs(); wireControls(); wireTools(); wireCanvas();
$('#review-btn').addEventListener('click', openReview);
render();
if (entry === 'resume') notice('Welcome back. This is the cake you were designing.', false, '<button type="button" class="link" data-restart>Start again</button>');
if (entry === 'link') history.replaceState(null, '', `${location.pathname}?${M.encode(hist.present)}`);
track('configurator_viewed', { entry });
