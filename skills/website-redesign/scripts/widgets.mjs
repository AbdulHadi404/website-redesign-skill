#!/usr/bin/env node
/**
 * widget-contracts.mjs — drive interactive widgets with the KEYBOARD and check the contract a
 * screen-reader/keyboard user relies on (WAI-ARIA APG + GOV.UK error pattern).
 *
 *   node widgets.mjs <url> contracts.json [--device phone|tablet|desktop | --width 390 --height 844] [--storage seed.json]
 *
 * The viewport is 1280×800 unless --device/--width say otherwise, or a contract carries its own "device" or
 * "viewport" (a phone-only menu: { "type": "disclosure", "button": "#menu-toggle", "device": "phone" }).
 *
 * contracts.json is a list; selectors are Playwright selectors (CSS, text=…, role=…):
 *   { "type": "dialog",      "trigger": "#invite-open" }
 *   { "type": "tabs",        "tablist": "[role=tablist]" }
 *   { "type": "disclosure",  "button": "#adv-toggle" }
 *   { "type": "live",        "trigger": "#export" }                  // toast / async status
 *   { "type": "form-errors", "form": "#settings", "submit": "button[type=submit]" }   // submit: inside the form, or a full selector
 *   { "type": "live", "trigger": "#visit-form button", "before": [{ "fill": ["#name", "Aoife"] }] }   // steps first
 *   { "type": "live", "trigger": "#street", "keys": ["ArrowDown"] }   // a <select> feeding a status region
 *   { "type": "live", "trigger": "#length-6", "keys": ["Space"] }     // a radio: Enter would submit its form
 *   { "type": "menu-button", "button": "#account" }
 *
 * "before" steps run in order: { "fill": [sel, text] }, { "select": [sel, value or label] }, { "click": sel },
 * { "tap": sel } (touch devices), { "check": sel }, { "focus": sel }, { "press": key } or { "press": [sel, key] },
 * { "wait": ms }. A step that fails, or is not one of these, fails the contract: it did not start where it says.
 * "keys" (dialog, live): the keys pressed, in order, on the focused trigger to activate it (default ["Enter"]).
 * Browsers submit the form on Enter in a radio, checkbox or slider; a live contract on one without "keys" that
 * submits its form fails as not tested (give it "keys": ["Space"], or ["ArrowRight"] for a slider).
 *
 * live: the message counts as announced when it reaches a live region, or when focus moves (off the trigger) to the
 * message itself — a blocking error summary, accessibility.md §7.6 — so that what a screen reader says on focus
 * carries each new message. What it says is the focused element's accessible name, description and value from
 * Chromium's accessibility tree (and its aria-errormessage when invalid), the name of a dialog, named group or landmark
 * focus entered (and a dialog's or group's description), and the text inside a focused static container
 * (tabindex="-1") only when that container is mostly new text. The new text is grouped into message boxes, and at
 * least half of every box must be said, matched text node by text node (a <strong> or link mid-sentence is still the
 * same sentence). The focused control's own name is not a message (a new Retry button is not the error beside it)
 * unless nothing else is new, nor is a box of new controls, nor another field's error (its aria-describedby), which
 * that field announces when it takes focus (§6). So a link or button inside a silent box reads only its own name, a
 * wrapper of old text does not count, and a description that changes on the element that keeps focus is not re-read.
 * Focus moved to a toast fails (§7.4: never). A trigger that loads a new page (a server-rendered form) is judged on
 * that page, where text already there at load is not announced.
 *
 * Every step is keyboard-first. When a trigger cannot be reached or activated by keyboard the
 * test records the FAIL, then falls back to a mouse click so the rest of the contract is still checked.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { launch, open, parseArgs } from './lib/env.mjs';

const a = parseArgs();
const [url, file] = a._;
if (!url || !file) { console.error('usage: node widgets.mjs <url> contracts.json [--device phone | --width W --height H] [--storage seed.json]'); process.exit(2); }
const DEVICES = {
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  tablet: { viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  desktop: { viewport: { width: 1280, height: 800 } },
};
const deviceFor = (c) => {
  if (c.viewport) return { viewport: c.viewport };
  if (c.device) return DEVICES[c.device] || DEVICES.desktop;
  if (a.device) return DEVICES[a.device] || DEVICES.desktop;
  if (a.width) return { viewport: { width: Number(a.width), height: Number(a.height) || 844 } };
  return DEVICES.desktop;
};
const contracts = JSON.parse(await readFile(file, 'utf8'));
const { browser } = await launch({ chrome: process.env.CHROME_PATH });
const results = [];

// Records what a screen reader would be told: live-region changes and focus moves.
const RECORDER = () => {
  window.__announced = []; window.__silent = []; window.__focus = []; window.__mut = 0;
  // A token per document (a trigger that loads a new page leaves handles to the old one) and a count of form submits.
  window.__doc = Math.random(); window.__submits = 0;
  addEventListener('submit', () => { window.__submits++; }, true);
  const liveSel = '[aria-live]:not([aria-live="off"]),[role=status],[role=alert],[role=log],output';
  const start = () => new MutationObserver(ms => {
    window.__mut += ms.length;
    for (const m of ms) {
      const el = m.target.nodeType === 1 ? m.target : m.target.parentElement; if (!el) continue;
      const region = el.closest(liveSel);
      const txt = (region || el).innerText?.trim();
      if (region && txt) window.__announced.push(txt);
      else if (!region && m.type === 'childList') {
        // new text that looks like a toast/message but is silent — the added text only, never a whole container
        const added = [...m.addedNodes].filter(n => n.nodeType === 3 || (n.nodeType === 1 && !/^(SCRIPT|STYLE|LINK|META|TEMPLATE)$/.test(n.tagName))).map(n => (n.nodeType === 1 ? n.innerText : n.nodeValue) || '').join(' ').trim();
        const cs = getComputedStyle(el);
        if (added && added.length <= 200 && el.getBoundingClientRect().height > 0 && (cs.position === 'fixed' || cs.position === 'absolute' || /error|alert|toast|message|notice/i.test(el.className + el.id))) window.__silent.push(added);
      }
      if (m.type === 'attributes' && !region && m.target.nodeType === 1 && m.target !== document.body && m.target !== document.documentElement) {
        const t = m.target; const cs = getComputedStyle(t); const tt = t.innerText?.trim() || '';
        if (tt && tt.length <= 200 && cs.display !== 'none' && cs.visibility !== 'hidden' && t.getBoundingClientRect().height > 0 && (m.attributeName !== 'class' || /toast|message|alert|notice|error|snack|status|flash/i.test(t.className + t.id)) && t.children.length < 5) window.__silent.push(tt);
      }
    }
  }).observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
  document.readyState === 'loading' ? addEventListener('DOMContentLoaded', start) : start();
  addEventListener('focusin', e => window.__focus.push(e.target.outerHTML.slice(0, 60)));
};

const active = (page) => page.evaluate(() => { const a = document.activeElement; return a && a !== document.body ? `${a.id ? '#' + a.id : a.tagName.toLowerCase()} ${(a.innerText || a.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 30)}`.trim() : 'body'; }).catch(() => '?');
async function activate(page, sel, r, keys = ['Enter']) {
  const loc = page.locator(sel).first();
  await loc.waitFor({ state: 'attached', timeout: 3000 });
  const focusable = await loc.evaluate(el => { el.focus(); return document.activeElement === el; });
  if (!focusable) { r.fail('2.1.1', 'Trigger cannot receive keyboard focus'); await loc.click(); return 'click'; }
  const sig = () => page.evaluate(() => { const all = [...document.querySelectorAll('body *')]; return document.documentElement.innerHTML.length + '|' + all.map((e, i) => (e.matches('[open],[aria-expanded=true],:checked') ? i : '')).join('') + '|' + all.filter(e => (e.checkVisibility ? e.checkVisibility({ visibilityProperty: true }) : e.getClientRects().length)).length; });
  const before = await sig();
  let requests = 0; const onReq = () => { requests++; }; page.on('request', onReq);
  const mut0 = await page.evaluate(() => window.__mut || 0);
  for (const k of keys) await page.keyboard.press(k);
  await page.waitForTimeout(350);
  // A trigger that loads a new page can leave these mid-navigation: that is a change, not a test error.
  const after = await sig().catch(() => 'navigated');
  const mut1 = await page.evaluate(() => window.__mut || 0).catch(() => -1);
  page.off('request', onReq);
  // Something happened if the page changed, the DOM was rewritten (a refresh re-rendering identical text), or it fetched.
  if (before === after && mut1 === mut0 && requests === 0) { r.fail('2.1.1', `${keys.join(', ')} on the focused trigger does nothing — falling back to click`); await loc.click(); await page.waitForTimeout(350); return 'click'; }
  return 'keyboard';
}
// A contract's own activation keys: Enter on a radio submits its form, a <select> changes on the arrow keys.
const keysOf = (c) => (c.keys ? [].concat(c.keys) : ['Enter']);

// Roles whose accessible name is the control's own label (its content, <label> or aria-label): a screen reader says
// that name on focus, and it is the control, never the message.
const CONTROL_ROLES = new Set(['button', 'link', 'textbox', 'searchbox', 'combobox', 'checkbox', 'radio', 'switch', 'tab', 'menuitem', 'menuitemcheckbox', 'menuitemradio',
  'option', 'slider', 'spinbutton', 'listbox', 'treeitem', 'gridcell', 'menu', 'menubar', 'tree', 'grid', 'treegrid', 'tablist', 'radiogroup', 'toolbar', 'scrollbar',
  'PopUpButton', 'ComboBoxMenuButton']);
// Roles a screen reader announces by name (plus description and value) when they take focus. Any other focused
// element — a generic box, a region, a dialog, a landmark — is a container, and its text is read as well.
const NAMED_ROLES = new Set([...CONTROL_ROLES, 'heading', 'img', 'image', 'cell', 'row', 'columnheader', 'rowheader', 'separator', 'progressbar', 'meter']);
// Containers whose name a screen reader announces as focus enters them; a dialog's or a group's description (a
// fieldset's error, GOV.UK radios) is read too.
const ENTERED_ROLES = new Set(['dialog', 'alertdialog', 'group', 'region', 'radiogroup', 'form', 'main', 'navigation', 'complementary', 'banner', 'contentinfo', 'search', 'table', 'grid', 'tabpanel']);
const DESCRIBED_ROLES = new Set(['dialog', 'alertdialog', 'group', 'radiogroup']);

/**
 * What a screen reader says when focus has moved off the trigger (live contracts), and whether that is the message.
 * The new text on screen is grouped into message boxes; focus announces the message when what is said on that focus
 * carries at least half of every box, and at least one. Not messages: the focused control's own name (its content
 * and labels — a new Retry button is not the error beside it), a box of nothing but new controls, and another
 * field's error (its aria-describedby or aria-errormessage), which that field announces when it takes focus.
 * `t` is the trigger's handle (null after a new page loaded), `shown` every visible text run before activation.
 * Null when focus is on <body>, on the trigger or unreadable.
 */
async function focusHeard(page, t, shown, label) {
  const dom = await page.evaluate(({ t, shown, label }) => {
    const set = new Set(shown);
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const vis = (e) => (e.checkVisibility ? e.checkVisibility({ visibilityProperty: true, opacityProperty: true }) : e.getClientRects().length);
    const who = (e) => (e.id ? '#' + e.id : e.tagName.toLowerCase());
    const f = document.activeElement;
    if (!f || f === document.body || f === document.documentElement || f === t) return null;
    // The new text: every visible element whose own text was not on screen before, outside the trigger and not its
    // label. Kept as its text nodes too: a <strong>, <b> or <a> mid-sentence splits one sentence between two elements,
    // and each part is matched on its own against what is said.
    const fresh = [];
    for (const e of document.body.querySelectorAll('*')) {
      const nodes = [...e.childNodes].filter(x => x.nodeType === 3);
      const own = norm(nodes.map(x => x.nodeValue).join(' '));
      if (own && own !== label && !set.has(own) && !(t && t.contains(e)) && vis(e)) fresh.push({ e, own, segs: nodes.map(x => norm(x.nodeValue)).filter(Boolean) });
    }
    const freshIn = (el) => fresh.reduce((n, p) => n + (el.contains(p.e) ? p.own.length : 0), 0);
    const seen = new Map();
    const mostlyNew = (el) => { if (!seen.has(el)) { const all = norm(el.innerText); seen.set(el, all.length > 0 && freshIn(el) >= all.length / 2); } return seen.get(el); };
    const holdsT = (el) => !!(t?.isConnected && el.contains(t));
    // The boxes focus entered: the focused element and its ancestors short of one that holds the trigger.
    const chain = [f];
    for (let el = f.parentElement; el && el !== document.body && !holdsT(el); el = el.parentElement) chain.push(el);
    // A toast: a new, small fixed layer (or one named toast/snackbar) that is not a dialog or menu.
    const layer = chain.find(e => getComputedStyle(e).position === 'fixed') || chain.find(e => /toast|snack/i.test(`${e.getAttribute('class') || ''} ${e.id}`));
    const toast = layer && mostlyNew(layer) && !f.closest('dialog,[role=dialog],[role=alertdialog],[aria-modal=true],[role=menu],[role=listbox]') && layer.getBoundingClientRect().height < innerHeight * 0.4;
    // aria-errormessage is read on an invalid field (the ARIA rule), outside the description Chromium reports.
    const errmsg = f.getAttribute('aria-invalid') === 'true' ? (f.getAttribute('aria-errormessage') || '').split(/\s+/).map(i => i && document.getElementById(i)).filter(Boolean).map(e => norm(e.innerText)).join(' ') : '';
    // Each piece's message box: the element, widened while its parent is mostly new, short of the one holding the
    // trigger; a box inside another box belongs to the outer one.
    let boxes = fresh.map(p => { let b = p.e; for (let q = b.parentElement; q && q !== document.body && !holdsT(q) && mostlyNew(q); q = q.parentElement) b = q; return b; });
    boxes = boxes.map(b => boxes.reduce((o, x) => (x !== o && x.contains(o) ? x : o), b));
    const uniq = [...new Set(boxes)];
    // Another field's error: the description or error message of a field or group that focus did not reach.
    const bound = [];
    for (const fld of document.querySelectorAll('[aria-describedby],[aria-errormessage]')) {
      if (fld.contains(f) || !fld.matches('input,select,textarea,fieldset,[role=group],[role=radiogroup],[role=textbox],[role=searchbox],[role=combobox],[role=listbox],[role=spinbutton],[role=slider],[role=checkbox],[role=radio],[role=switch],[contenteditable=""],[contenteditable=true]')) continue;
      for (const id of `${fld.getAttribute('aria-describedby') || ''} ${fld.getAttribute('aria-errormessage') || ''}`.split(/\s+/)) { const el = id && document.getElementById(id); if (el) bound.push(el); }
    }
    // The focused element's labels: a new field's label is its name, not a message.
    const labels = [...(f.labels || []), ...(f.getAttribute('aria-labelledby') || '').split(/\s+/).map(i => i && document.getElementById(i)).filter(Boolean)];
    const CTL = 'a[href],button,input,select,textarea,summary,[role=button],[role=link],[role=menuitem],[role=tab],[role=option],[role=checkbox],[role=radio],[role=switch]';
    const pieces = fresh.map((p, i) => ({ segs: p.segs, len: p.own.length, box: uniq.indexOf(boxes[i]), own: f.contains(p.e) || labels.some(l => l.contains(p.e)), bound: bound.some(b => b.contains(p.e)), ctl: !!p.e.closest(CTL) }));
    window.__wcAx = chain;
    return { pieces, boxes: uniq.map(b => { const s = norm(b.innerText); return s.length > 80 ? `${s.slice(0, 79)}…` : s; }), who: who(f), n: chain.length, content: norm(f.innerText), errmsg, mostlyNew: mostlyNew(f), toast: toast ? `${who(layer)} "${norm(layer.innerText).slice(0, 60)}"` : null };
  }, { t, shown, label }).catch(() => null);
  if (!dom) return null;
  // Names and descriptions from Chromium's own accessibility tree (aria-labelledby, <label>, aria-describedby …).
  const cdp = await page.context().newCDPSession(page);
  const ax = [];
  try {
    for (let i = 0; i < dom.n; i++) {
      const { result } = await cdp.send('Runtime.evaluate', { expression: `window.__wcAx[${i}]` });
      const { nodes } = await cdp.send('Accessibility.getPartialAXTree', { objectId: result.objectId, fetchRelatives: false });
      ax.push(nodes[0] || {});
    }
  } catch { /* an element that went away mid-read: what was read stands */ }
  await cdp.send('Runtime.evaluate', { expression: 'delete window.__wcAx' }).catch(() => {});
  await cdp.detach().catch(() => {});
  const v = (x) => (x?.value != null ? String(x.value) : '');
  const [f = {}, ...up] = ax;
  const parts = [v(f.name), v(f.description), v(f.value), dom.errmsg];
  const via = [];
  if (v(f.description)) via.push('its description');
  if (dom.errmsg) via.push('its error message');
  // A focused static container that is itself the new message is read out; a wrapper of mostly old text is not.
  const container = !NAMED_ROLES.has(v(f.role));
  if (!f.ignored && container && dom.mostlyNew) { if (!v(f.name).includes(dom.content)) parts.push(dom.content); via.push('its text'); }
  for (const a of up) {
    const role = v(a.role);
    if (a.ignored || !ENTERED_ROLES.has(role) || !(v(a.name) || v(a.description))) continue;
    parts.push(v(a.name), DESCRIBED_ROLES.has(role) ? v(a.description) : '');
    via.push(`inside ${role} "${v(a.name).slice(0, 40)}"`);
  }
  const heard = parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  const low = heard.toLowerCase();
  // The message boxes and how much of each is said. A focused control's own name is not a message; nor is a box of
  // nothing but new controls unless what is said carries it; nor another field's error.
  const control = CONTROL_ROLES.has(v(f.role));
  const box = dom.boxes.map((text) => ({ text, len: 0, got: 0, ctl: true }));
  let own = 0, bound = 0;
  for (const p of dom.pieces) {
    if (control && p.own) { own += p.len; continue; }
    if (p.bound) { bound += p.len; continue; }
    const b = box[p.box];
    b.len += p.len; b.ctl &&= p.ctl;
    // Each text node on its own, weighted by the piece's length: a sentence split by inline markup still matches.
    const segLen = p.segs.reduce((n, s) => n + s.length, 0) || 1;
    b.got += p.len * p.segs.reduce((n, s) => n + (low.includes(s.toLowerCase()) ? s.length : 0), 0) / segLen;
  }
  const said = box.filter(b => b.len && b.got >= b.len / 2);
  const unsaid = box.filter(b => b.len && b.got < b.len / 2 && !b.ctl);
  // The focused control is itself the only new text (a download link that appeared): its name is the message.
  const byName = control && own > 0 && !bound && !box.some(b => b.len && !b.ctl);
  if (byName) via.unshift('its name');
  return { who: dom.who, heard, via: via.join(', '), toast: dom.toast, wrapper: container && !dom.mostlyNew, carries: byName || (said.length > 0 && !unsaid.length), partial: said.length > 0, unsaid: unsaid.map(b => b.text) };
}

function recorder(type, target) {
  const r = { type, target, passes: [], fails: [], warns: [] };
  r.ok = (m) => r.passes.push(m);
  r.fail = (sc, m) => r.fails.push(`[${sc}] ${m}`);
  r.warnf = (sc, m) => r.warns.push(`[${sc}] ${m}`);
  return r;
}

const tests = {
  async dialog(page, c) {
    const r = recorder('dialog', c.trigger);
    const trigger = await page.locator(c.trigger).first().elementHandle();
    await activate(page, c.trigger, r, keysOf(c));
    const dlg = page.locator('dialog[open], [role=dialog]:visible, [role=alertdialog]:visible').first();
    if (!(await dlg.count())) {
      const layer = await page.evaluate(() => [...document.querySelectorAll('body *')].find(e => { const cs = getComputedStyle(e); return cs.position === 'fixed' && e.getBoundingClientRect().height > 100 && cs.display !== 'none'; })?.outerHTML.slice(0, 80));
      r.fail('4.1.2', `No element with dialog semantics opened${layer ? ` (a fixed layer appeared: ${layer})` : ''}`);
      if (!layer) return r;
      // continue on the visual layer to test focus behaviour
      const inside = await page.evaluate(() => { const l = [...document.querySelectorAll('body *')].find(e => getComputedStyle(e).position === 'fixed' && e.getBoundingClientRect().height > 100 && getComputedStyle(e).display !== 'none'); return l.contains(document.activeElement); });
      inside ? r.ok('focus moved into the layer') : r.fail('2.4.3', `Focus did not move into the modal (focus is on ${await active(page)})`);
      await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
      const stillInside = await page.evaluate(() => { const l = [...document.querySelectorAll('body *')].find(e => getComputedStyle(e).position === 'fixed' && e.getBoundingClientRect().height > 100 && getComputedStyle(e).display !== 'none'); return l.contains(document.activeElement); });
      if (!stillInside) r.fail('2.4.3', `Tab leaves the modal layer into the page behind (now on ${await active(page)})`);
      await page.keyboard.press('Escape'); await page.waitForTimeout(200);
      const open = await page.evaluate(() => !![...document.querySelectorAll('body *')].find(e => getComputedStyle(e).position === 'fixed' && e.getBoundingClientRect().height > 100 && getComputedStyle(e).display !== 'none'));
      open ? r.fail('2.1.2', 'Escape does not close the modal') : r.ok('Escape closes');
      return r;
    }
    const snap = (await dlg.ariaSnapshot()).split('\n')[0];
    /dialog "[^"]+"/.test(snap) ? r.ok(`named: ${snap}`) : r.fail('4.1.2', `Dialog has no accessible name (${snap}) — aria-labelledby its heading`);
    const modal = await dlg.evaluate(d => d.matches(':modal') || d.getAttribute('aria-modal') === 'true');
    modal ? r.ok('modal (:modal or aria-modal)') : r.warnf('1.3.2', 'Dialog is not modal — background stays reachable');
    const inDialog = () => dlg.evaluate(d => d.contains(document.activeElement));
    (await inDialog()) ? r.ok(`focus moved into dialog (${await active(page)})`) : r.fail('2.4.3', `Focus stayed outside the dialog (${await active(page)})`);
    let escaped = null;
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      const where = await page.evaluate(() => document.activeElement === document.body ? 'body' : 'el');
      if (where === 'el' && !(await inDialog())) { escaped = await active(page); break; }
    }
    escaped ? r.fail('2.4.3', `Tab escapes the modal to "${escaped}" (background not inert)`) : r.ok('Tab stays inside (background inert)');
    await page.keyboard.press('Escape'); await page.waitForTimeout(250);
    const open = await dlg.isVisible().catch(() => false);
    open ? r.fail('2.1.2', 'Escape does not close the dialog') : r.ok('Escape closes');
    const back = await page.evaluate(t => document.activeElement === t, trigger);
    back ? r.ok('focus returned to trigger') : r.fail('2.4.3', `Focus not returned to the trigger on close (now on ${await active(page)})`);
    return r;
  },

  async tabs(page, c) {
    const r = recorder('tabs', c.tablist);
    const list = page.locator(c.tablist).first();
    const info = await list.evaluate(l => [...l.querySelectorAll('[role=tab]')].map(t => ({ id: t.id, sel: t.getAttribute('aria-selected'), ctrl: t.getAttribute('aria-controls'), panel: !!document.getElementById(t.getAttribute('aria-controls') || '_')?.matches('[role=tabpanel]'), ti: t.tabIndex })));
    if (!info.length) { r.fail('4.1.2', 'No role=tab children'); return r; }
    const selected = info.filter(t => t.sel === 'true');
    selected.length === 1 ? r.ok('exactly one aria-selected=true') : r.fail('4.1.2', `${selected.length} tabs have aria-selected=true (need exactly 1)`);
    info.every(t => t.ctrl && t.panel) ? r.ok('every tab aria-controls a tabpanel') : r.fail('1.3.1', 'Tabs missing aria-controls → role=tabpanel');
    const inSeq = info.filter(t => t.ti >= 0).length;
    inSeq === 1 ? r.ok('roving tabindex: one tab in the Tab sequence') : r.fail('2.1.1', `${inSeq} tabs in the Tab sequence (APG: only the selected tab, arrows move between tabs)`);
    const first = list.locator('[role=tab]').first();
    const focused = await first.evaluate(t => { t.focus(); return document.activeElement === t; });
    if (!focused) { r.fail('2.1.1', 'Tabs cannot receive focus'); return r; }
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(150);
    const moved = await list.evaluate(l => { const tabs = [...l.querySelectorAll('[role=tab]')]; return { idx: tabs.indexOf(document.activeElement), selIdx: tabs.findIndex(t => t.getAttribute('aria-selected') === 'true') }; });
    moved.idx === 1 ? r.ok('ArrowRight moves focus to next tab') : r.fail('2.1.1', 'ArrowRight does not move focus between tabs');
    moved.selIdx === 1 ? r.ok('selection follows focus (automatic activation)') : r.warnf('—', 'Selection does not follow focus — acceptable only if Enter/Space activates (manual activation)');
    await page.keyboard.press('End'); const end = await list.evaluate(l => [...l.querySelectorAll('[role=tab]')].indexOf(document.activeElement));
    end === info.length - 1 ? r.ok('End → last tab') : r.warnf('—', 'End key not supported');
    await page.keyboard.press('Home'); const home = await list.evaluate(l => [...l.querySelectorAll('[role=tab]')].indexOf(document.activeElement));
    home === 0 ? r.ok('Home → first tab') : r.warnf('—', 'Home key not supported');
    const panelVisible = await list.evaluate(l => { const t = l.querySelector('[role=tab][aria-selected=true]'); const p = t && document.getElementById(t.getAttribute('aria-controls')); return p && p.getClientRects().length > 0; });
    panelVisible ? r.ok('selected tab\'s panel is visible') : r.fail('1.3.1', 'Selected tab\'s panel is not visible');
    return r;
  },

  async disclosure(page, c) {
    const r = recorder('disclosure', c.button);
    const btn = page.locator(c.button).first();
    // Visibility by checkVisibility(): the content of a closed <details> keeps its layout boxes in current Chromium
    // (::details-content hides it with content-visibility), so getClientRects() cannot tell open from closed.
    const state = () => btn.evaluate(b => ({ exp: b.getAttribute('aria-expanded'), tag: b.tagName, role: b.getAttribute('role'), ctrl: b.getAttribute('aria-controls'),
      vis: b.tagName === 'SUMMARY' ? b.parentElement.open : (() => { const t = document.getElementById(b.getAttribute('aria-controls') || '') || b.nextElementSibling; return t ? (t.checkVisibility ? t.checkVisibility({ visibilityProperty: true }) : t.getClientRects().length > 0) : null; })() }));
    const s0 = await state();
    s0.tag === 'BUTTON' || s0.role === 'button' || s0.tag === 'SUMMARY' ? r.ok('is a button') : r.fail('4.1.2', `Disclosure trigger is <${s0.tag.toLowerCase()}> without role=button`);
    if (s0.tag === 'SUMMARY') r.ok('native <details>/<summary> — the browser exposes the expanded state');
    else s0.exp !== null ? r.ok(`aria-expanded="${s0.exp}"`) : r.fail('4.1.2', 'No aria-expanded — screen readers cannot tell it is collapsed/expanded');
    // Menus that open on :focus-within / :hover are keyboard-reachable but expose no state and open on every Tab past.
    await btn.evaluate(b => b.focus()); await page.waitForTimeout(250);
    const sf = await state();
    if (sf.vis !== s0.vis) {
      r.warnf('4.1.2', 'Content opens on focus (CSS :focus-within or :hover), not on activation — reachable by keyboard, but it opens on every Tab past and exposes no expanded state; use a button that toggles aria-expanded (APG disclosure navigation)');
      return r;
    }
    await btn.evaluate(b => b.blur());
    const how = await activate(page, c.button, r, ['Enter']);
    const s1 = await state();
    if (how === 'keyboard') s1.vis !== s0.vis ? r.ok('Enter toggles the content') : r.fail('2.1.1', 'Enter does not toggle the content');
    else s1.vis !== s0.vis ? r.ok('the content toggles on click (not by keyboard — see above)') : r.fail('2.1.1', 'The content does not toggle, by keyboard or click (hover-only?)');
    if (s0.exp !== null) s1.exp !== s0.exp ? r.ok(`aria-expanded now "${s1.exp}"`) : r.fail('4.1.2', 'aria-expanded does not change when toggled');
    await btn.evaluate(b => b.focus()); await page.keyboard.press('Space'); await page.waitForTimeout(150);
    const s2 = await state();
    s2.vis === s0.vis ? r.ok('Space toggles back') : r.warnf('2.1.1', 'Space does not toggle');
    return r;
  },

  async live(page, c) {
    const r = recorder('live', c.trigger);
    const loc = page.locator(c.trigger).first();
    // The trigger's handle without Playwright's 5 s auto-wait (a missing trigger fails after 3 s, not 5 + 3).
    let trigger = await page.$(c.trigger).catch(() => null);
    if (!trigger) { await loc.waitFor({ state: 'attached', timeout: 3000 }); trigger = await page.$(c.trigger); }
    const label = () => loc.evaluate(el => (el.innerText || el.getAttribute('aria-label') || '').trim(), null, { timeout: 1000 }).catch(() => '');
    const label0 = await label();
    // What newly became visible is compared, not what mutated: animation libraries, sticky headers and scroll
    // states rewrite classes and inline styles constantly. Scroll the trigger into view and let that settle first.
    // every: all visible text, live regions and long paragraphs included (the baseline for the focus check below)
    const texts = (every = false) => page.evaluate((every) => {
      const live = '[aria-live]:not([aria-live="off"]),[role=status],[role=alert],[role=log],output';
      const out = [];
      for (const el of document.body.querySelectorAll('*')) {
        const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.nodeValue).join(' ').replace(/\s+/g, ' ').trim();
        if (!own || (!every && (own.length > 200 || el.closest(live))) || !(el.checkVisibility ? el.checkVisibility({ visibilityProperty: true, opacityProperty: true }) : el.getClientRects().length)) continue;
        out.push(own);
      }
      return out;
    }, every);
    await loc.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' })).catch(() => {});
    await page.waitForTimeout(600);
    const seen0 = new Set(await texts());
    const shown0 = await texts(true);
    // Browsers submit the form on Enter in a radio, checkbox or slider (implicit submission), which never operates it.
    const kind = c.keys ? null : await trigger.evaluate(el => (el.form && el.matches('input[type=radio],input[type=checkbox],input[type=range]') ? el.type : null)).catch(() => null);
    const doc0 = await page.evaluate(() => { window.__announced = []; window.__silent = []; window.__submits = 0; return window.__doc; });
    let loads = 0; const onReq = (q) => { if (q.isNavigationRequest() && q.frame() === page.mainFrame()) loads++; };
    page.on('request', onReq);
    await activate(page, c.trigger, r, keysOf(c));
    await page.waitForTimeout(400);
    page.off('request', onReq);
    // A trigger that loads a new page (a server-rendered form, a reload): wait for it, and drop the old page's handle.
    let after = await page.evaluate(() => ({ doc: window.__doc, submits: window.__submits })).catch(() => ({}));
    for (let i = 0; loads && after.doc === doc0 && i < 20; i++) { await page.waitForTimeout(250); after = await page.evaluate(() => ({ doc: window.__doc, submits: window.__submits })).catch(() => ({})); }
    const newPage = after.doc !== doc0;
    if (newPage) await page.waitForLoadState('load').catch(() => {});
    if (kind && (newPage || after.submits)) {
      const keys = kind === 'range' ? '["ArrowRight"]' : '["Space"]';
      r.fail('—', `Not tested: Enter on this ${kind} submitted its form (browsers do that on Enter in a ${kind}), so it was never ${kind === 'range' ? 'moved' : kind === 'radio' ? 'chosen' : 'ticked'} and what followed is the form's response${newPage ? ' (a new page loaded)' : ''} — give the contract "keys": ${keys}`);
      return r;
    }
    const label1 = await label();
    const appeared = (await texts().catch(() => [])).filter(t => !seen0.has(t) && t !== label1);
    await page.waitForTimeout(800);
    const { announced } = await page.evaluate(() => ({ announced: [...new Set(window.__announced)] })).catch(() => ({ announced: [] }));
    // Focus moved to the message itself (a focused error summary, accessibility.md §7.6) announces it too, when what a
    // screen reader says on that focus carries each new message: see focusHeard() and the header. Focus that stays on the
    // re-rendered trigger has not moved.
    const onTrigger = newPage ? false : await loc.evaluate(el => el === document.activeElement, null, { timeout: 1000 }).catch(() => false);
    const heard = onTrigger ? null : await focusHeard(page, newPage ? null : trigger, shown0, label1);
    const silent = [...new Set(appeared)].slice(0, 3);
    const relabel = label1 && label1 !== label0 ? `; the trigger's own label changed ("${label0}" → "${label1}"), which screen readers do not reliably announce` : '';
    if (heard?.toast) r.fail('2.4.3', `Focus moved to a toast (${heard.toast}) — focus never moves to a toast (accessibility.md §7.4): the reader loses their place and focus drops to the page when it closes; announce it from a role="status" region that exists before`);
    if (announced.length) r.ok(`announced via live region: "${announced.join(' / ')}"`);
    else if (heard?.carries && !heard.toast) r.ok(`announced by moving focus to it (${heard.who}${heard.via ? `, ${heard.via}` : ''}): "${heard.heard.slice(0, 160)}"`);
    else if (!heard?.toast) {
      // The messages focus did not read, whole (a sentence split by a link stays one), else the new text runs.
      const msgs = heard?.unsaid?.length ? heard.unsaid.slice(0, 3) : silent;
      const focus = !heard?.who ? `focus did not move to it (focus: ${await active(page)})`
        : heard.wrapper ? `focus moved to ${heard.who}, a box of mostly older text, not to the message itself`
        : `focus moved to ${heard.who}, which reads ${heard.heard ? `only "${heard.heard.slice(0, 80)}"` : 'nothing'}`;
      if (heard?.partial) r.fail('4.1.3', `Not all announced: focus moved to ${heard.who}, which reads "${heard.heard.slice(0, 80)}", but this other new text is not in a live region and focus does not read it: "${msgs.join(' / ')}"${newPage ? '; the trigger loaded a new page' : ''}${relabel}`);
      else r.fail('4.1.3', `Nothing announced${msgs.length ? `; visible message not in a live region, and ${focus}: "${msgs.join(' / ')}"` : ''}${newPage ? '; the trigger loaded a new page, where text already there at load is not announced' : ''}${relabel}`);
    }
    const regionsAtLoad = await page.evaluate(() => document.querySelectorAll('[aria-live]:not([aria-live="off"]),[role=status],[role=alert],[role=log]').length).catch(() => '?');
    r.ok(`${regionsAtLoad} live region(s) in the DOM`);
    return r;
  },

  async 'form-errors'(page, c) {
    const r = recorder('form-errors', c.form);
    await page.evaluate(() => { window.__announced = []; window.__silent = []; });
    const form = page.locator(c.form).first();
    const title0 = await page.title();
    const scoped = `${c.form} ${c.submit}`;
    await activate(page, (await page.locator(scoped).count()) ? scoped : c.submit, r);
    await page.waitForTimeout(500);
    const res = await page.evaluate((formSel) => {
      const form = document.querySelector(formSel);
      const invalid = [...document.querySelectorAll('[aria-invalid=true]')];
      const described = invalid.map(el => {
        const ids = ((el.getAttribute('aria-describedby') || '') + ' ' + (el.getAttribute('aria-errormessage') || '')).trim().split(/\s+/).filter(Boolean);
        return { id: el.id, desc: ids.map(i => document.getElementById(i)?.innerText?.trim()).filter(Boolean).join(' ') };
      });
      const a = document.activeElement;
      const summaryLinks = a && a !== document.body ? [...a.querySelectorAll('a[href^="#"]')].map(l => l.getAttribute('href')).filter(h => document.getElementById(h.slice(1))?.matches('input,select,textarea')) : [];
      const fields = [...form.querySelectorAll('input,select,textarea')].filter(f => f.type !== 'hidden' && f.getClientRects().length);
      return { invalid: invalid.length, described, focus: a === document.body ? 'body' : (a.id ? '#' + a.id : a.tagName.toLowerCase()), focusIsField: a?.matches('input,select,textarea'), summaryLinks, fields: fields.length, title: document.title };
    }, c.form);
    const { announced, silent } = await page.evaluate(() => ({ announced: [...new Set(window.__announced)], silent: [...new Set(window.__silent)] }));
    if (res.summaryLinks.length) r.ok(`focus moved to an error summary with ${res.summaryLinks.length} link(s) to fields (GOV.UK pattern)`);
    else if (res.focusIsField) r.ok(`focus moved to the first invalid field (${res.focus})`);
    else r.fail('3.3.1', `Focus did not move to an error summary or the first invalid field (focus: ${res.focus}) — the error is easy to miss`);
    res.invalid ? r.ok(`${res.invalid} field(s) aria-invalid=true`) : r.fail('3.3.1/4.1.2', 'No field marked aria-invalid=true');
    for (const d of res.described) d.desc ? r.ok(`#${d.id} error text is in its description: "${d.desc.slice(0, 60)}"`) : r.fail('3.3.1', `#${d.id} is invalid but no error text is associated (aria-describedby)`);
    if (!res.invalid && silent.length) r.fail('3.3.1', `Error text appeared but is not tied to any field: "${silent.join(' / ').slice(0, 80)}"`);
    // Moving focus to an invalid field announces it (name, invalid state, description): that already informs the user.
    if (!res.summaryLinks.length && !res.focusIsField && !announced.length) r.warnf('4.1.3', 'Errors were neither focused nor announced via a live region');
    res.title !== title0 && /error/i.test(res.title) ? r.ok(`title updated: "${res.title}"`) : r.warnf('—', 'Page title not prefixed with "Error:" (GOV.UK recommends it)');
    if (res.summaryLinks.length) {
      await page.locator(`a[href="${res.summaryLinks[0]}"]`).first().focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(150);
      const onField = await page.evaluate(h => document.activeElement === document.getElementById(h.slice(1)), res.summaryLinks[0]);
      onField ? r.ok('summary link moves focus to the field') : r.fail('2.4.3', 'Summary link does not move focus to its field');
    }
    return r;
  },

  async 'menu-button'(page, c) {
    const r = recorder('menu-button', c.button);
    const s0 = await page.locator(c.button).first().evaluate(b => ({ popup: b.getAttribute('aria-haspopup'), exp: b.getAttribute('aria-expanded') }));
    s0.exp !== null ? r.ok('aria-expanded present') : r.fail('4.1.2', 'Menu button lacks aria-expanded');
    await activate(page, c.button, r, ['Enter']);
    const m = await page.evaluate(() => { const a = document.activeElement; return { role: a?.getAttribute('role'), inMenu: !!a?.closest('[role=menu]') }; });
    if (s0.popup === 'menu' || s0.popup === 'true') m.inMenu ? r.ok('focus moved to first menuitem') : r.fail('2.1.1', 'aria-haspopup=menu but focus did not move into the menu');
    await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    const back = await page.locator(c.button).first().evaluate(b => document.activeElement === b);
    back ? r.ok('Escape returns focus to the button') : r.fail('2.4.3', 'Escape does not return focus to the menu button');
    return r;
  },
};

const t0 = performance.now();
for (const c of contracts) {
  // Clipboard permission: copy buttons otherwise fail silently in headless Chromium and look inert.
  const ctx = await browser.newContext({ ...deviceFor(c), permissions: ['clipboard-read', 'clipboard-write'] });
  await ctx.addInitScript(RECORDER);
  const page = await ctx.newPage();
  // A widget that is not there should fail in seconds, not after Playwright's 30 s default.
  page.setDefaultTimeout(5000);
  await open(page, url);
  // Optional set-up steps before the contract runs (fill a form so its async status can be tested, open a panel,
  // choose a street). A step that fails or is unknown fails the contract: the widget was not tested in the state the
  // contract describes, and skipped silently it reads as a widget defect (or passes a widget that was never reached).
  const setup = [];
  for (const s of c.before || []) {
    const one = (l) => page.locator(l).first();
    const step = s.fill ? one(s.fill[0]).fill(String(s.fill[1]), { timeout: 4000 })
      : s.select ? one(s.select[0]).selectOption([].concat(s.select[1]).map(String), { timeout: 4000 })
      : s.click ? one(s.click).click({ timeout: 4000 })
      : s.tap ? one(s.tap).tap({ timeout: 4000 })
      : s.check ? one(s.check).check({ timeout: 4000 })
      : s.focus ? one(s.focus).focus({ timeout: 4000 })
      : s.press ? (Array.isArray(s.press) ? one(s.press[0]).press(s.press[1], { timeout: 4000 }) : page.keyboard.press(s.press))
      : 'wait' in s ? page.waitForTimeout(s.wait)
      : Promise.reject(new Error('not a step (fill, select, click, tap, check, focus, press, wait)'));
    await step.catch((e) => setup.push(`[—] before step ${JSON.stringify(s)} failed: ${e.message.split('\n')[0]}`));
  }
  try { const r = await tests[c.type](page, c); r.fails.unshift(...setup); results.push(r); }
  catch (e) {
    const target = c.trigger || c.tablist || c.button || c.form;
    const vp = page.viewportSize();
    // The commonest cause: a control that exists only at another width (a phone menu tested on a desktop viewport).
    const hidden = await page.locator(target).first().evaluate((el) => !el.checkVisibility?.({ checkVisibilityCSS: true }), null, { timeout: 1000 }).catch(() => null);
    const stepFailed = setup.length ? ' (a before step failed, see below)' : '';
    const why = hidden === true ? `${target} exists but is not visible at ${vp.width}×${vp.height}${stepFailed || ' — give the contract "device": "phone" (or run with --device phone)'}`
      : hidden === null ? `${target} not found on the page${stepFailed}` : e.message.split('\n')[0];
    results.push({ type: c.type, target, passes: [], fails: [`test error: ${why}`, ...setup], warns: [] });
  }
  await ctx.close();
}
await browser.close();
let fails = 0;
console.log(`widget-contracts ${url} (${((performance.now() - t0) / 1000).toFixed(1)}s)`);
for (const r of results) {
  fails += r.fails.length;
  console.log(`\n${r.fails.length ? 'FAIL' : 'PASS'} ${r.type} ${r.target}`);
  r.fails.forEach(m => console.log(`   ✗ ${m}`)); r.warns.forEach(m => console.log(`   ! ${m}`)); r.passes.forEach(m => console.log(`   ✓ ${m}`));
}
process.exitCode = fails ? 1 : 0;
