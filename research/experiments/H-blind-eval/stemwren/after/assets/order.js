// The bouquet builder and order (/order/). Contract (README): POST /api/order with the old keys, and
// swTrack('order_start' | 'order_submit' | 'order_error' {field} | 'order_success' {order, total}).
import * as M from './bouquet-model.js';
import { BouquetView, bouquetSVG, stemSVG, defsSVG, palette } from './bouquet-art.js';

const track = (e, p) => { try { window.swTrack(e, p); } catch (_) { /* analytics never breaks the order */ } };
track('order_start');

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const CHAPTERS = ['flowers', 'wrap', 'delivery', 'details', 'check'];
const HASH = { flowers: 'flowers', wrap: 'wrap-card', delivery: 'delivery', details: 'details', check: 'check', done: 'sent' };
const TITLE = { flowers: 'Make your bouquet', wrap: 'Wrap & card', delivery: 'Delivery', details: 'You & them', check: 'Check & send', done: 'Order sent' };
const NEXT = { flowers: 'Next: wrap & card', wrap: 'Next: delivery', delivery: 'Next: you & them', details: 'Check your order' };
const DETAIL_FIELDS = ['recipient_name', 'recipient_address', 'sender_name', 'sender_email', 'sender_phone'];

let data, view, now = M.londonNow();
const state = {
  lines: [], wrap: 'kraft', ribbon: 'twine', seed: 1, card_message: '', postcode: '', date: '',
  recipient_name: '', recipient_address: '', sender_name: '', sender_email: '', sender_phone: '',
  chapter: 'flowers', reached: 0, trayColour: {}, sent: null,
};
let undoLines = null;

// ---- Storage (a draft on this phone; never the URL for words) -------------------------------------------
const store = {
  get(k, session) { try { return JSON.parse((session ? sessionStorage : localStorage).getItem(k) || 'null'); } catch (_) { return null; } },
  set(k, v, session) { try { (session ? sessionStorage : localStorage).setItem(k, JSON.stringify(v)); } catch (_) { /* private mode */ } },
  del(k, session) { try { (session ? sessionStorage : localStorage).removeItem(k); } catch (_) { /* */ } },
};
function saveDraft() {
  if (state.sent) return;
  store.set('sw-draft', { v: 1, lines: state.lines, wrap: state.wrap, ribbon: state.ribbon, seed: state.seed, card_message: state.card_message, postcode: state.postcode, date: state.date });
  store.set('sw-details', Object.fromEntries(DETAIL_FIELDS.map((k) => [k, state[k]])), true);
}
function syncUrl() {
  const q = M.encode(state);
  history.replaceState(history.state, '', `${location.pathname}${q ? '?' + q : ''}${location.hash}`);
}

// ---- Derived values ---------------------------------------------------------------------------------------
/** The date seasons are judged against: the chosen day, else the earliest day we could deliver. */
function refDate() {
  if (state.date) return state.date;
  const z = zone();
  return z && z.same_day && M.beforeCutoff(now, data.delivery.cutoff_same_day) ? now.iso : (z ? M.addDays(now.iso, 1) : now.iso);
}
const zone = () => M.zoneFor(state.postcode, data.delivery).zone;
const price = () => M.priceOf({ ...state, zone: zone() }, data.flowers, data.wraps);
const byId = () => M.indexFlowers(data.flowers);
function sizeWords() {
  const n = M.totalStems(state.lines), size = M.sizeFor(n);
  return { n, size, words: `${size || (n < M.MIN_STEMS ? 'Too few' : 'Too many')} · ${n} stem${n === 1 ? '' : 's'}` };
}
function describe() { return M.describe(state.lines, data.flowers, data.wraps, state.wrap, state.ribbon); }

// ---- Boot -------------------------------------------------------------------------------------------------
async function boot() {
  try {
    const [flowers, wraps, delivery] = await Promise.all(['flowers', 'wraps', 'delivery'].map((n) => fetch(`../data/${n}.json`).then((r) => { if (!r.ok) throw new Error(n); return r.json(); })));
    data = { flowers, wraps, delivery };
  } catch (e) {
    document.documentElement.classList.add('data-failed');
    $('#tray').innerHTML = `<p class="notice">Today’s stems didn’t load. Check your connection, then <button type="button" class="link-button" id="retry">try again</button>.</p>`;
    $('#retry').addEventListener('click', () => location.reload());
    return;
  }
  document.body.insertAdjacentHTML('afterbegin', defsSVG());
  restore();
  view = new BouquetView($('#stage'), data);
  buildTray(); buildStarters(); buildChoices(); buildZones();
  bind();
  renderPostcode(); renderDays();
  const fromHash = Object.keys(HASH).find((k) => `#${HASH[k]}` === location.hash);
  render({ quiet: true });
  goTo(fromHash && CHAPTERS.indexOf(fromHash) <= state.reached ? fromHash : 'flowers', { push: false, focus: false });
  history.replaceState({ chapter: state.chapter }, '', location.href);
  document.documentElement.classList.add('is-ready');
}

function restore() {
  const shared = M.decode(location.search, data.flowers, data.wraps);
  const draft = store.get('sw-draft');
  const details = store.get('sw-details', true) || {};
  if (shared.lines.length) {
    Object.assign(state, { lines: shared.lines, wrap: shared.wrap || 'kraft', ribbon: shared.ribbon || 'none', seed: shared.seed || 1 });
  } else if (draft && draft.v === 1 && draft.lines && draft.lines.length) {
    const d = M.decode('?' + M.encode(draft), data.flowers, data.wraps);
    Object.assign(state, { lines: d.lines, wrap: d.wrap || 'kraft', ribbon: d.ribbon || 'none', seed: d.seed || 1, card_message: draft.card_message || '', postcode: draft.postcode || '', date: draft.date && draft.date >= now.iso ? draft.date : '' });
  } else {
    const b = M.defaultBouquet(now.iso, data.flowers);
    Object.assign(state, { lines: b.lines, wrap: b.wrap, ribbon: b.ribbon, seed: 7 });
  }
  if (shared.add) startWith(shared.add);
  for (const k of DETAIL_FIELDS) if (typeof details[k] === 'string') state[k] = details[k];
  if (!state.lines.length) state.lines = M.defaultBouquet(now.iso, data.flowers).lines;
  for (const f of data.flowers) state.trayColour[f.id] = f.colours[0];
  for (const l of state.lines) state.trayColour[l.id] = l.colour;
  // reached: as far as the saved answers go
  const detailsDone = DETAIL_FIELDS.every((k) => state[k].trim());
  state.reached = state.postcode && state.date ? (detailsDone ? 4 : 3) : state.card_message ? 2 : 0;
}

/** From the home page's "in season" stems: a bouquet that starts with that stem. */
function startWith(id) {
  const f = byId()[id];
  if (!f || !M.availability(f, now.iso).ok) return;
  const lines = [{ id, colour: f.colours[0], count: f.kind === 'foliage' ? 5 : 7 }];
  const green = data.flowers.find((x) => x.kind === 'foliage' && x.id !== id && M.availability(x, now.iso).ok);
  const flower = data.flowers.find((x) => x.kind === 'focal' && x.id !== id && M.availability(x, now.iso).ok);
  if (f.kind !== 'foliage' && green) lines.push({ id: green.id, colour: green.colours[0], count: 3 });
  if (f.kind === 'foliage' && flower) lines.unshift({ id: flower.id, colour: flower.colours[0], count: 5 });
  Object.assign(state, { lines, wrap: 'kraft', ribbon: 'twine', seed: 7 });
}

// ---- The tray ---------------------------------------------------------------------------------------------
function buildTray() {
  const groups = ['focal', 'filler', 'foliage'];
  let html = '';
  for (const kind of groups) {
    const fl = data.flowers.filter((f) => f.kind === kind);
    html += `<div class="tray-group" role="group" aria-label="${M.KIND_LABEL[kind]}"><p class="tray-group-name" aria-hidden="true">${M.KIND_LABEL[kind]}</p><ul class="tray-list">`;
    for (const f of fl) {
      const multi = f.colours.length > 1;
      html += `<li class="stem-card" data-id="${f.id}">
        <button type="button" class="stem-add" data-add="${f.id}" aria-describedby="sc-${f.id}">
          <span class="stem-pic">${stemSVG(f, state.trayColour[f.id])}</span>
          <span class="visually-hidden">Add a </span><span class="tag${f.name.length > 9 ? ' is-long' : ''}${f.name.length > 12 ? ' is-longest' : ''}">${esc(f.name)}</span><span class="visually-hidden stem-colour-name">, ${esc(state.trayColour[f.id])},</span>
          <span class="stem-price">${M.money(f.price)} a stem</span>
          <span class="stem-count" aria-hidden="true"></span><span class="visually-hidden stem-in"></span>
        </button>
        <p class="stem-state" id="sc-${f.id}"></p>
        ${multi ? `<fieldset class="swatches"><legend class="visually-hidden">${esc(f.name)} colour</legend>${f.colours.map((c) => `<label class="sw" title="${esc(c)}"><input type="radio" name="c-${f.id}" value="${esc(c)}"${c === state.trayColour[f.id] ? ' checked' : ''}><span class="sw-dot" style="--c:${palette(f, c)[0]};--e:${palette(f, c)[1]}"></span><span class="visually-hidden">${esc(c)}</span></label>`).join('')}</fieldset><p class="sw-name" aria-hidden="true">${esc(state.trayColour[f.id])}</p>` : `<p class="sw-name sw-name--only">${esc(f.colours[0])}</p>`}
      </li>`;
    }
    html += '</ul></div>';
  }
  $('#tray').innerHTML = html;
}

function updateTray() {
  const ref = refDate();
  const month = M.monthOf(ref);
  const n = M.totalStems(state.lines);
  const full = n >= M.MAX_STEMS;
  for (const f of data.flowers) {
    const card = $(`.stem-card[data-id="${f.id}"]`);
    const a = M.availability(f, ref);
    const inB = state.lines.filter((l) => l.id === f.id).reduce((s, l) => s + l.count, 0);
    const btn = $('.stem-add', card);
    const st = $('.stem-state', card);
    card.classList.toggle('is-resting', !a.ok);
    card.classList.toggle('is-in', inB > 0);
    $('.stem-count', card).textContent = inB ? `${inB} in` : '';
    $('.stem-in', card).textContent = inB ? `, ${inB} in your bouquet` : '';
    const lineFull = !state.lines.some((l) => l.id === f.id && l.colour === state.trayColour[f.id]) && state.lines.length >= M.MAX_LINES;
    const blocked = !a.ok || full || lineFull;
    btn.setAttribute('aria-disabled', blocked ? 'true' : 'false');
    const ends = a.ok ? M.seasonEnds(f, month) : null;
    st.textContent = !a.ok ? a.words : full ? 'Bouquet is full' : lineFull ? `Up to ${M.MAX_LINES} kinds` : ends ? `Until ${ends}` : 'All year';
    $$('input[type=radio]', card).forEach((r) => { r.disabled = !a.ok; });
  }
  const unavailable = data.flowers.filter((f) => !M.availability(f, ref).ok);
  $('#tray-season').textContent = `For delivery in ${M.MONTHS[month - 1]}. ${unavailable.length ? `Resting: ${unavailable.map((f) => f.name.toLowerCase()).join(', ')}.` : ''}`;
}

function setTrayColour(id, colour) {
  const f = byId()[id];
  state.trayColour[id] = colour;
  const card = $(`.stem-card[data-id="${id}"]`);
  $('.stem-pic', card).innerHTML = stemSVG(f, colour);
  $('.stem-colour-name', card).textContent = `, ${colour},`;
  const nm = $('.sw-name', card); if (nm) nm.textContent = colour;
  updateTray();
}

function addFromTray(id) {
  const f = byId()[id];
  const a = M.availability(f, refDate());
  if (!a.ok) {
    const card = $(`.stem-card[data-id="${id}"]`);
    card.classList.remove('is-nudged'); void card.offsetWidth; card.classList.add('is-nudged');
    return note(a.reason === 'stock' ? `${M.plural(f.name, 2)}: none in today, so they can’t go in a bouquet just now.` : `${M.plural(f.name, 2)} are ${M.lowerFirst(a.words)}: the shop can’t get them for a ${M.MONTHS[M.monthOf(refDate()) - 1]} delivery.`);
  }
  const colour = state.trayColour[id];
  const r = M.addStem(state.lines, id, colour);
  if (!r.added) return note(r.why);
  state.lines = r.lines;
  clearUndo();
  render();
  const s = sizeWords();
  say(`${capital(colour)} ${f.name.toLowerCase()} added. ${s.n} stems, ${s.size || 'not a bouquet yet'}. ${M.money(price().total)}.`);
}

function showStemsNote(text) {
  const e = $('#err-stems');
  e.textContent = text; e.hidden = !text;
}

// ---- The lines (an equivalent to the picture, with − and +) ----------------------------------------------
function renderLines() {
  const f = byId();
  const p = M.priceOf({ ...state, zone: null }, data.flowers, data.wraps);
  const conflicts = M.conflictsOn(state.lines, refDate(), data.flowers).map((c) => c.flower.id);
  $('#lines').innerHTML = state.lines.map((l, i) => {
    const fl = f[l.id];
    const name = `${l.colour} ${M.plural(fl.name.toLowerCase(), 1)}`;
    const c = palette(fl, l.colour);
    return `<li class="line${conflicts.includes(l.id) ? ' is-conflict' : ''}" data-i="${i}">
      <span class="line-dot" style="--c:${c[0]};--e:${c[1]}" aria-hidden="true"></span>
      <span class="line-name">${l.count} ${esc(l.colour)} ${esc(M.plural(fl.name.toLowerCase(), l.count))}${conflicts.includes(l.id) ? `<span class="line-warn"> — ${esc(M.lowerFirst(M.availability(fl, refDate()).words))}</span>` : ''}</span>
      <span class="line-price">${M.money(fl.price * l.count)}</span>
      <span class="stepper">
        <button type="button" class="step" data-step="-1" data-i="${i}" aria-label="One fewer ${esc(name)}">−</button>
        <button type="button" class="step" data-step="1" data-i="${i}" aria-label="One more ${esc(name)}"${M.totalStems(state.lines) >= M.MAX_STEMS ? ' aria-disabled="true"' : ''}>+</button>
      </span></li>`;
  }).join('') || '<li class="line line--empty">Nothing yet. Tap a stem above to start.</li>';
  $('#lines-total').innerHTML = `<span>${esc(sizeWords().words)}</span><span>Stems ${M.money(p.stems)}</span>`;
}

function step(i, d) {
  const l = state.lines[i];
  if (!l) return;
  const f = byId()[l.id];
  if (d > 0) {
    const r = M.addStem(state.lines, l.id, l.colour);
    if (!r.added) return say(r.why);
    state.lines = r.lines;
  } else {
    state.lines = M.removeStem(state.lines, l.id, l.colour);
  }
  clearUndo();
  render();
  const gone = !state.lines.some((x) => x.id === l.id && x.colour === l.colour);
  const s = sizeWords();
  say(`${gone ? `No ${l.colour} ${M.plural(f.name.toLowerCase(), 2)} now` : `${l.count + d} ${l.colour} ${M.plural(f.name.toLowerCase(), l.count + d)}`}. ${s.n} stems, ${s.size || (s.n < M.MIN_STEMS ? 'add ' + (M.MIN_STEMS - s.n) + ' more' : 'too many')}. ${M.money(price().total)}.`);
  // keep focus somewhere sensible
  const btn = $(`#lines .step[data-i="${gone ? Math.min(i, state.lines.length - 1) : i}"][data-step="${gone ? -1 : d}"]`);
  (btn || $('#tray-h')).focus?.();
  if (!btn) { $('#tray').focus(); }
}

// ---- Starters ---------------------------------------------------------------------------------------------
function buildStarters() {
  const ref = refDate();
  $('#starter-list').innerHTML = M.STARTERS.map((s) => {
    const a = M.starterAvailability(s, ref, data.flowers);
    return `<li class="starter${a.ok ? '' : ' is-resting'}"><span class="starter-pic">${bouquetSVG({ lines: s.lines, wrap: s.wrap, ribbon: s.ribbon, seed: 7 }, data, { cls: 'starter-art' })}</span>
      <span class="starter-text"><span class="starter-name">${esc(s.name)}</span><span class="starter-note">${esc(s.note)}${a.ok ? '' : ` · ${esc(a.words)}`}</span></span>
      ${a.ok ? `<button type="button" class="btn btn--quiet btn--small" data-starter="${s.id}">Start from this<span class="visually-hidden">: ${esc(s.name)}</span></button>` : ''}</li>`;
  }).join('') + '<li class="starter-undo" id="starter-undo" hidden><span id="undo-text"></span> <button type="button" class="link-button" id="undo">Undo</button></li>';
}
function applyStarter(id) {
  const s = M.STARTERS.find((x) => x.id === id);
  undoLines = { lines: state.lines, wrap: state.wrap, ribbon: state.ribbon };
  Object.assign(state, { lines: s.lines.map((l) => ({ ...l })), wrap: s.wrap, ribbon: s.ribbon });
  for (const l of state.lines) state.trayColour[l.id] = l.colour;
  render();
  syncChoices();
  $('#undo-text').textContent = `Started again from ${s.name}.`;
  $('#starter-undo').hidden = false;
  say(`Started again from ${s.name}: ${describe()}. Undo is next to the list.`);
  $('#undo').focus();
}
function clearUndo() { undoLines = null; const u = $('#starter-undo'); if (u) u.hidden = true; }

// ---- Wrap, ribbon, card -----------------------------------------------------------------------------------
function buildChoices() {
  const choice = (name, o) => `<label class="choice"><input type="radio" name="${name}" value="${o.id}"${state[name] === o.id ? ' checked' : ''}><span class="choice-pic choice-pic--${o.id}" aria-hidden="true"></span><span class="choice-name">${esc(o.name)}</span><span class="choice-price">${o.price ? '+' + M.money(o.price) : 'Free'}</span></label>`;
  $('#wrap-choices').innerHTML = data.wraps.wraps.map((o) => choice('wrap', o)).join('');
  $('#ribbon-choices').innerHTML = data.wraps.ribbons.map((o) => choice('ribbon', o)).join('');
  $('#card_message').value = state.card_message;
  for (const k of DETAIL_FIELDS) $(`#${k}`).value = state[k];
  $('#delivery_postcode').value = state.postcode;
  cardPreview();
}
function syncChoices() {
  $$('input[name=wrap]').forEach((r) => { r.checked = r.value === state.wrap; });
  $$('input[name=ribbon]').forEach((r) => { r.checked = r.value === state.ribbon; });
}
function cardPreview() {
  $('#card-preview-text').textContent = state.card_message.trim() || 'No message — just the flowers.';
  $('.card-preview').classList.toggle('is-empty', !state.card_message.trim());
}

// ---- Delivery ---------------------------------------------------------------------------------------------
function buildZones() {
  $('#zones-body').innerHTML = data.delivery.zones.map((z) => `<tr><th scope="row">${esc(z.name)}${z.same_day ? '<span class="sameday"> · same day by ' + M.cutoffWords(data.delivery.cutoff_same_day) + '</span>' : ''}</th><td>${M.sortDistricts(z.districts).join(', ')}</td><td class="num">${M.money(z.price)}</td></tr>`).join('');
}
function renderPostcode() {
  const { postcode, zone: z } = M.zoneFor(state.postcode, data.delivery);
  const out = $('#pc-result');
  let text = '', cls = '';
  if (!state.postcode.trim() || !postcode) text = '';
  else if (!z) { text = `We don’t deliver to ${postcode.district} yet.`; cls = 'is-off'; }
  else text = `${postcode.district}: ${z.name}, delivery ${M.money(z.price)}.${z.same_day ? ` Same day if you order by ${M.cutoffWords(data.delivery.cutoff_same_day)}.` : ''}`;
  out.textContent = text;
  out.className = 'pc-result ' + cls;
  $('#addr-postcode').textContent = postcode && postcode.full ? postcode.formatted : 'add it on the delivery page';
}
function renderDays() {
  now = M.londonNow();
  const z = zone();
  const pc = M.parsePostcode(state.postcode);
  const days = M.deliveryDays({ now, zone: z, cutoff: data.delivery.cutoff_same_day, n: 14, lines: state.lines, flowers: data.flowers });
  if (state.date === now.iso && !days[0].ok) state.date = '';
  $('#days-hint').textContent = !z
    ? `Same day to ${M.list(M.sortDistricts(data.delivery.zones.filter((x) => x.same_day).flatMap((x) => x.districts)))} if you order by ${M.cutoffWords(data.delivery.cutoff_same_day)}. Enter the postcode to see if today is possible.`
    : z.same_day ? `Same day to ${pc.district} if you order by ${M.cutoffWords(data.delivery.cutoff_same_day)} (UK time).` : `${z.name} deliveries start tomorrow.`;
  const other = !days.some((d) => d.iso === state.date) && state.date;
  $('#day-list').innerHTML = days.map((d, i) => {
    const note = !d.ok ? d.why : d.conflicts.length ? `No ${M.list(d.conflicts.map((c) => M.plural(c.flower.name.toLowerCase(), 2)))}` : '';
    return `<label class="day${d.ok ? '' : ' is-off'}${d.conflicts.length ? ' has-conflict' : ''}"><input type="radio" name="delivery_date" id="day-${i}" value="${d.iso}"${d.ok ? '' : ' disabled'}${state.date === d.iso ? ' checked' : ''}${note ? ` aria-describedby="day-note-${i}"` : ''}><span class="day-dow">${d.today ? 'Today' : d.label.dow}</span><span class="day-date">${d.label.day} ${d.label.mon}</span>${note ? `<span class="day-note" id="day-note-${i}">${esc(note)}</span>` : ''}</label>`;
  }).join('');
  const od = $('#other-date');
  od.min = now.iso; od.value = other ? state.date : '';
  renderConflict();
}
function renderConflict() {
  const box = $('#err-delivery_date');
  const c = state.date ? M.conflictsOn(state.lines, state.date, data.flowers) : [];
  if (!c.length) { if (box.dataset.kind === 'conflict') { box.hidden = true; box.dataset.kind = ''; } return; }
  const names = M.list(c.map((x) => M.plural(x.flower.name.toLowerCase(), 2)));
  const cost = state.lines.filter((l) => c.some((x) => x.flower.id === l.id)).reduce((s, l) => s + byId()[l.id].price * l.count, 0);
  box.dataset.kind = 'conflict';
  box.hidden = false;
  const why = M.list(c.map((x) => `${M.plural(x.flower.name.toLowerCase(), 2)} (${M.lowerFirst(x.words)})`));
  box.innerHTML = `<span class="visually-hidden">Error: </span>${esc(capital(why))} can’t be had on ${M.dayLabel(state.date).long}. Choose another day, or <button type="button" class="link-button" id="drop-conflicts">take them out (−${M.money(cost)})</button>.`;
}

// ---- Rendering --------------------------------------------------------------------------------------------
function render({ quiet } = {}) {
  const s = sizeWords();
  const p = price();
  $('#size').value = s.size || '';
  const z = zone();
  view.update(state, { label: `Illustration of your bouquet: ${describe()}.` });
  $('#stage-size').innerHTML = `<span>${esc(s.size || (s.n < M.MIN_STEMS ? 'Not yet a bouquet' : 'Too many stems'))}</span> <span>${s.n} stem${s.n === 1 ? '' : 's'}</span>`;
  $('#stage-size').classList.toggle('is-short', !s.size);
  $('#bar-total').textContent = M.money(p.total);
  $('#ab-size').textContent = ['flowers', 'wrap'].includes(state.chapter) ? s.words : 'Total';
  $('#ab-total').innerHTML = `${M.money(p.total)}${z ? '' : ' <small>+ delivery</small>'}`;
  updateTray();
  renderLines();
  if (s.size || s.n === 0) showStemsNote(''); else if (!quiet && s.n < M.MIN_STEMS) showStemsNote('');
  if (state.chapter === 'delivery') renderConflict();
  if (state.chapter === 'check') renderReview();
  updateNext();
  updateThumb();
  syncUrl();
  saveDraft();
}

/** The bouquet stays on screen on phones: when the stage scrolls away (or is hidden), it rides in the bar. */
let stageOut = false;
function updateThumb() {
  const show = ['delivery', 'details'].includes(state.chapter) || (stageOut && ['flowers', 'wrap', 'check'].includes(state.chapter));
  const t = $('#bar-thumb');
  if (show) {
    const key = M.encode(state);
    if (t.dataset.key !== key) { $('#bar-thumb-art').innerHTML = bouquetSVG(state, data, { cls: 'thumb-art' }); t.dataset.key = key; }
  }
  t.hidden = !show;
}

function updateNext() {
  const next = $('#next');
  if (state.chapter === 'check') next.textContent = `Send order · ${M.money(price().total)}`;
  else next.textContent = NEXT[state.chapter] || 'Next';
}

function renderReview() {
  const p = price(), z = zone(), pc = M.parsePostcode(state.postcode);
  const s = sizeWords();
  const w = data.wraps.wraps.find((x) => x.id === state.wrap), r = data.wraps.ribbons.find((x) => x.id === state.ribbon);
  const row = (dt, dd, to, what) => `<div class="review-row"><dt>${dt}</dt><dd>${dd}</dd><dd class="review-change"><a href="#${HASH[to]}" data-to="${to}">Change<span class="visually-hidden"> ${what}</span></a></dd></div>`;
  $('#review').innerHTML =
    row('Flowers', `${esc(capital(M.list(state.lines.map((l) => `${l.count} ${l.colour} ${M.plural(byId()[l.id].name.toLowerCase(), l.count)}`))))}<br><span class="muted">${esc(s.size)}, ${s.n} stems</span>`, 'flowers', 'the flowers') +
    row('Wrap', `${esc(w.name)}${r && r.id !== 'none' ? `<br><span class="muted">Ribbon: ${esc(r.name.toLowerCase())}</span>` : ''}`, 'wrap', 'the wrap') +
    row('Card', state.card_message.trim() ? `<span class="hand">${esc(state.card_message.trim())}</span>` : '<span class="muted">No message</span>', 'wrap', 'the card') +
    row('Delivery', `${state.date ? esc(M.dayLabel(state.date).long) : ''} to ${esc(pc ? pc.formatted : state.postcode)}${z ? `<br><span class="muted">${esc(z.name)}</span>` : ''}`, 'delivery', 'the delivery') +
    row('For', `${esc(state.recipient_name)}<br>${esc(state.recipient_address).replace(/\n/g, '<br>')}`, 'details', 'who it is for') +
    row('From', `${esc(state.sender_name)}<br>${esc(state.sender_email)}<br>${esc(state.sender_phone)}`, 'details', 'your details');
  const tr = (k, v, cls = '') => `<tr class="${cls}"><th scope="row">${k}</th><td class="num">${v}</td></tr>`;
  $('#totals tbody').innerHTML = tr(`Stems (${s.n})`, M.money(p.stems)) + tr(esc(w.name), p.wrap ? M.money(p.wrap) : 'Free') + (r && r.id !== 'none' ? tr(esc(r.name), p.ribbon ? M.money(p.ribbon) : 'Free') : '') + tr('Card', 'Free') + tr(`Delivery${z ? ', ' + esc(z.name) : ''}`, p.delivery != null ? M.money(p.delivery) : '—') + tr('Total', M.money(p.total), 'total');
}

// ---- Chapters ---------------------------------------------------------------------------------------------
function goTo(ch, { push = true, focus = true } = {}) {
  const i = CHAPTERS.indexOf(ch);
  if (ch !== 'done' && i > state.reached) ch = CHAPTERS[state.reached];
  state.chapter = ch;
  $('#main').dataset.chapter = ch;
  for (const el of $$('.chapter')) el.hidden = el.dataset.chapter !== ch;
  $('#back').hidden = ch === 'flowers' || ch === 'done';
  $('#actionbar').hidden = ch === 'done';
  $('#stage-tools').hidden = ch === 'done';
  $$('#chapter-list a').forEach((a) => {
    const j = CHAPTERS.indexOf(a.dataset.to);
    a.toggleAttribute('aria-current', a.dataset.to === ch);
    if (a.dataset.to === ch) a.setAttribute('aria-current', 'step');
    a.classList.toggle('is-locked', j > state.reached);
    if (j > state.reached) a.setAttribute('aria-disabled', 'true'); else a.removeAttribute('aria-disabled');
  });
  $('#chapter-list').closest('nav').hidden = ch === 'done';
  if (ch === 'delivery') { renderPostcode(); renderDays(); }
  if (ch === 'check') renderReview();
  updateThumb();
  clearErrors();
  $('#ab-size').textContent = ['flowers', 'wrap'].includes(ch) ? sizeWords().words : 'Total';
  updateNext();
  document.title = `${TITLE[ch]} – Stem & Wren`;
  if (push) history.pushState({ chapter: ch }, '', `${location.pathname}${location.search}#${HASH[ch]}`);
  else history.replaceState({ chapter: ch }, '', `${location.pathname}${location.search}#${HASH[ch]}`);
  if (focus) {
    window.scrollTo({ top: 0, behavior: 'instant' });
    const t = $(`.chapter[data-chapter="${ch}"] .chapter-title`);
    t && t.focus({ preventScroll: true });
  }
}

function next() {
  const ch = state.chapter;
  if (ch === 'check') return send();
  const errs = validate(ch);
  if (errs.length) return showErrors(errs);
  const i = CHAPTERS.indexOf(ch);
  state.reached = Math.max(state.reached, i + 1);
  goTo(CHAPTERS[i + 1]);
}

function validate(ch) {
  const ctx = { delivery: data.delivery, flowers: data.flowers, now: M.londonNow() };
  const errs = M.validate(ch === 'check' ? 'all' : ch, state, ctx);
  if ((ch === 'flowers' || ch === 'check') && M.totalStems(state.lines) >= M.MIN_STEMS) {
    const c = M.conflictsOn(state.lines, refDate(), data.flowers);
    if (c.length) errs.unshift({ field: 'stems', target: 'lines', message: `${capital(M.list(c.map((x) => `${M.plural(x.flower.name.toLowerCase(), 2)} (${M.lowerFirst(x.words)})`)))} can’t be had for this delivery. Take them out to carry on.` });
  }
  return errs;
}

function clearErrors() {
  $('#error-summary').hidden = true;
  $$('.field-error').forEach((e) => { if (e.dataset.kind !== 'conflict') { e.hidden = true; e.textContent = ''; } });
  $$('[aria-invalid]').forEach((e) => e.removeAttribute('aria-invalid'));
  if (document.title.startsWith('Error: ')) document.title = document.title.slice(7);
}

function showErrors(errs) {
  clearErrors();
  for (const e of errs) track('order_error', { field: e.field });
  const seen = new Set();
  for (const e of errs) {
    if (seen.has(e.field)) continue;
    seen.add(e.field);
    const box = $(`#err-${e.field}`);
    if (box) { box.dataset.kind = ''; box.hidden = false; box.innerHTML = `<span class="visually-hidden">Error: </span>${esc(e.message)}`; }
    const input = $(`#${e.field}`);
    if (input && input.matches('input, textarea')) {
      input.setAttribute('aria-invalid', 'true');
      const ids = new Set((input.getAttribute('aria-describedby') || '').split(' ').filter(Boolean)); ids.add(`err-${e.field}`);
      input.setAttribute('aria-describedby', [...ids].join(' '));
    }
  }
  document.title = 'Error: ' + document.title;
  const targetOf = (e) => {
    if (e.target === 'day-0') return $('#day-list input:not(:disabled)') || $('#other-date');
    return document.getElementById(e.target) || document.getElementById(e.field);
  };
  if (seen.size >= 3) {
    $('#error-list').innerHTML = errs.filter((e, i) => errs.findIndex((x) => x.field === e.field) === i).map((e) => `<li><a href="#${targetOf(e)?.id || e.field}">${esc(e.message)}</a></li>`).join('');
    $('#error-summary').hidden = false;
    $('#error-summary').focus();
  } else {
    const t = targetOf(errs[0]);
    if (t) { t.scrollIntoView({ block: 'center' }); t.focus({ preventScroll: true }); }
    if (errs[0].field === 'stems') say(errs[0].message);
  }
}

// ---- Sending ----------------------------------------------------------------------------------------------
let sending = false;
async function send() {
  if (sending) return;
  const errs = validate('check');
  if (errs.length) {
    showErrors(errs);
    const first = errs[0].field;
    const to = first === 'stems' ? 'flowers' : first.startsWith('delivery') ? 'delivery' : 'details';
    goTo(to, { focus: false });
    showErrors(errs);
    return;
  }
  const body = M.payload(state);
  const btn = $('#next');
  sending = true;
  btn.setAttribute('aria-disabled', 'true');
  btn.textContent = 'Sending…';
  $('#send-error').textContent = '';
  track('order_submit');
  try {
    const r = await fetch('/api/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error('status ' + r.status);
    const res = await r.json();
    track('order_success', { order: res.order, total: res.total });
    done(res);
  } catch (e) {
    $('#send-error').innerHTML = `Your order didn’t go through, and nothing has been lost. Check your connection and press Send again.`;
    $('#actionbar').scrollIntoView({ block: 'end' });
    btn.removeAttribute('aria-disabled');
    updateNext();
  } finally {
    sending = false;
  }
}

function done(res) {
  const ours = price().total;
  const theirs = typeof res.total === 'number' && res.total > 0 ? res.total : null;
  state.sent = res;
  store.del('sw-draft'); store.del('sw-details', true);
  $('#done-number').innerHTML = `Order <strong>${esc(res.order || '')}</strong> is in.`;
  $('#done-text').textContent = `${theirs != null ? `The shop's total is ${M.money(theirs)}.` : `Your total was ${M.money(ours)}; the shop confirms the final price.`} ${state.date ? `It's going to ${state.recipient_name} on ${M.dayLabel(state.date).long}.` : ''}${state.card_message.trim() ? ' The card will be written by hand.' : ''} Keep the order number in case you need to get in touch.`;
  goTo('done', { push: true });
}

// ---- Sharing ----------------------------------------------------------------------------------------------
function shareUrl() {
  const q = M.encode(state);
  return `${location.origin}${location.pathname}${q ? '?' + q : ''}`;
}
async function picture() {
  const W = 1080, H = 1350;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const linen = await img('../assets/img/linen.webp');
  x.fillStyle = '#8ea283'; x.fillRect(0, 0, W, H);
  const pat = x.createPattern(linen, 'repeat');
  if (pat) { x.save(); x.scale(1.4, 1.4); x.fillStyle = pat; x.fillRect(0, 0, W / 1.4, H / 1.4); x.restore(); }
  const svg = bouquetSVG(state, data).replace('<svg ', '<svg width="857" height="1200" ');
  const art = await img(URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })));
  x.drawImage(art, 112, 10, 857, 1200);
  x.fillStyle = '#f3f5ef'; x.fillRect(0, H - 150, W, 150);
  await document.fonts.ready;
  x.fillStyle = '#18261d';
  x.font = '400 64px Kalam, cursive'; x.textBaseline = 'middle';
  x.fillText('Stem & Wren', 56, H - 82);
  x.font = '600 30px "Familjen Grotesk", sans-serif'; x.textAlign = 'right';
  const s = sizeWords();
  x.fillText(`${s.size || ''} · ${s.n} stems`, W - 56, H - 100);
  x.font = '400 26px "Familjen Grotesk", sans-serif';
  x.fillText('Made at stemandwren.co.uk/order', W - 56, H - 62);
  return new Promise((ok) => c.toBlob(ok, 'image/png'));
}
const img = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });

async function share() {
  const url = shareUrl();
  let blob = null;
  try { blob = await picture(); } catch (_) { /* the link still works */ }
  const text = `My bouquet from Stem & Wren: ${describe()}.`;
  if (blob && navigator.canShare) {
    const file = new File([blob], 'my-stem-and-wren-bouquet.png', { type: 'image/png' });
    if (navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'My bouquet', text: `${text} ${url}` }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
  }
  const d = $('#share-sheet');
  if (blob) { const u = URL.createObjectURL(blob); $('#share-img').src = u; $('#share-save').href = u; $('#share-img').alt = `Picture of your bouquet: ${describe()}.`; }
  $('#share-img').hidden = !blob; $('#share-save').hidden = !blob;
  $('#share-how').textContent = blob ? 'Press and hold the picture to save it, or copy the link to send it.' : 'Copy the link to send your bouquet to someone.';
  d.dataset.url = url;
  d.showModal();
}
async function copyLink() {
  const url = $('#share-sheet').dataset.url;
  try { await navigator.clipboard.writeText(url); $('#share-status').textContent = 'Link copied.'; }
  catch (_) { prompt('Copy this link:', url); }
}

// ---- Events -----------------------------------------------------------------------------------------------
function bind() {
  $('#tray').addEventListener('click', (e) => {
    const b = e.target.closest('[data-add]');
    if (b) addFromTray(b.dataset.add);
  });
  $('#tray').addEventListener('change', (e) => {
    if (e.target.name?.startsWith('c-')) setTrayColour(e.target.name.slice(2), e.target.value);
  });
  $('#lines').addEventListener('click', (e) => {
    const b = e.target.closest('[data-step]');
    if (b && b.getAttribute('aria-disabled') !== 'true') step(+b.dataset.i, +b.dataset.step);
    else if (b) note(`A bouquet holds up to ${M.MAX_STEMS} stems.`);
  });
  $('#starter-list').addEventListener('click', (e) => {
    const b = e.target.closest('[data-starter]');
    if (b) applyStarter(b.dataset.starter);
    if (e.target.id === 'undo' && undoLines) {
      Object.assign(state, undoLines); undoLines = null;
      for (const l of state.lines) state.trayColour[l.id] = l.colour;
      render(); syncChoices();
      $('#starter-undo').hidden = true;
      say(`Back to your bouquet: ${describe()}.`);
      $('#starters summary').focus();
    }
  });
  $('#retie').addEventListener('click', () => { state.seed = 1 + Math.floor(Math.random() * 999999); render(); say('Re-tied. Same stems, a new arrangement.'); });
  $('#share').addEventListener('click', share);
  $('#share-done').addEventListener('click', share);
  $('#share-copy').addEventListener('click', copyLink);
  $('#share-close').addEventListener('click', () => $('#share-sheet').close());
  $('#order').addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'wrap' || t.name === 'ribbon') { state[t.name] = t.value; render(); say(`${t.name === 'wrap' ? 'Wrap' : 'Ribbon'}: ${(t.name === 'wrap' ? data.wraps.wraps : data.wraps.ribbons).find((x) => x.id === t.value).name}. ${M.money(price().total)}.`); }
    if (t.name === 'delivery_date') { state.date = t.value; $('#other-date').value = ''; render(); renderConflict(); }
    if (t.id === 'other-date') {
      if (t.value && t.value >= M.londonNow().iso) { state.date = t.value; $$('#day-list input').forEach((r) => { r.checked = r.value === t.value; }); render(); renderConflict(); }
    }
  });
  $('#order').addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'card_message') { state.card_message = t.value; cardPreview(); saveDraft(); }
    if (DETAIL_FIELDS.includes(t.id)) { state[t.id] = t.value; saveDraft(); if (t.getAttribute('aria-invalid')) liveCheck(t.id); }
    if (t.id === 'delivery_postcode') {
      state.postcode = t.value;
      clearTimeout(t._d);
      t._d = setTimeout(() => { renderPostcode(); renderDays(); render(); if (t.getAttribute('aria-invalid')) liveCheck('delivery_postcode'); }, 250);
    }
  });
  $('#order').addEventListener('click', (e) => {
    const a = e.target.closest('[data-to]');
    if (a) {
      e.preventDefault();
      if (a.getAttribute('aria-disabled') === 'true') return;
      goTo(a.dataset.to);
    }
    if (e.target.id === 'drop-conflicts') {
      const ids = M.conflictsOn(state.lines, state.date, data.flowers).map((c) => c.flower.id);
      state.lines = M.dropFlowers(state.lines, ids);
      render(); renderDays();
      say(`Taken out. ${sizeWords().words}. ${M.money(price().total)}.`);
      $('#day-list input:checked')?.focus();
    }
  });
  $('#bar-thumb').addEventListener('click', (e) => {
    e.preventDefault();
    if (['flowers', 'wrap', 'check'].includes(state.chapter)) { $('#stage-wrap').scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth' }); return; }
    goTo('flowers');
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => { stageOut = es[0].intersectionRatio < 0.35; updateThumb(); }, { threshold: [0, 0.35, 1], rootMargin: `-${56}px 0px 0px 0px` }).observe($('#stage-wrap'));
  }
  $('#order').addEventListener('submit', (e) => { e.preventDefault(); next(); });
  $('#back').addEventListener('click', () => history.back());
  $('#error-summary').addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    e.preventDefault();
    const t = document.getElementById(a.getAttribute('href').slice(1));
    if (t) { t.scrollIntoView({ block: 'center' }); t.focus({ preventScroll: true }); }
  });
  window.addEventListener('popstate', (e) => {
    const ch = (e.state && e.state.chapter) || Object.keys(HASH).find((k) => `#${HASH[k]}` === location.hash) || 'flowers';
    if (state.sent && ch !== 'done') { location.href = location.pathname; return; }
    goTo(ch, { push: false });
  });
}

function liveCheck(field) {
  const ch = state.chapter;
  const errs = M.validate(ch, state, { delivery: data.delivery, flowers: data.flowers, now: M.londonNow() }).filter((e) => e.field === field);
  const box = $(`#err-${field}`), input = $(`#${field}`);
  if (!errs.length) { box.hidden = true; input.removeAttribute('aria-invalid'); }
  else { box.hidden = false; box.innerHTML = `<span class="visually-hidden">Error: </span>${esc(errs[0].message)}`; }
}

// ---- Announcements ----------------------------------------------------------------------------------------
/** A visible note under the tray that is also its own polite status region (no double announcement). */
let noteTimer;
function note(text) {
  const n = $('#tray-note');
  n.textContent = '';
  clearTimeout(noteTimer);
  setTimeout(() => { n.textContent = text; }, 60);
  noteTimer = setTimeout(() => { n.textContent = ''; }, 8000);
}
let sayTimer;
function say(text) {
  const s = $('#status');
  s.textContent = '';
  clearTimeout(sayTimer);
  sayTimer = setTimeout(() => { s.textContent = text; }, 60);
}
const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);

boot();
