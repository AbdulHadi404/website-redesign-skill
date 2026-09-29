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
 *   { "type": "roving",      "group": "[role=toolbar]" }             // toolbar, radio group, menubar: one Tab stop, arrows
 *   { "type": "slider",      "slider": "#price" }                    // role=slider or <input type=range>
 *   { "type": "palette",     "trigger": "#search", "keys": ["Control+k"] }   // command palette
 *   { "type": "sortable",    "list": "#stages" }                     // keyboard reordering; "handle", "items", "keys"
 *   { "type": "splitter",    "separator": "[role=separator]" }       // resizable panes (window splitter)
 *
 * Arrow keys follow the visual arrow (accessibility.md §3): in a row of tabs, toolbar buttons, radios or menubar items,
 * the key that points at the next item moves focus there — ArrowRight in a left-to-right widget, ArrowLeft in a
 * right-to-left one, where the next item is on the left (Radix, React Aria, Firefox's RTL guideline and Chromium's
 * native radios and ranges do this; APG says nothing about RTL; some systems, aegov among them, use DOM order, which
 * fails here as "the arrow keys run backwards"). The direction is the widget's computed `direction`, and every arrow
 * line says which one was assumed. The walk starts on the first tab (tabs) or the current item (roving) and moves to
 * its neighbour, then back: with three or more items a wrap-around cannot pass for a move (with two, a wrap and a
 * move are the same thing). The orientation is aria-orientation, else the ARIA default of the role (a tablist, toolbar
 * or menubar is horizontal however CSS stacks its items; a menu, listbox or tree vertical), else the layout (radios in
 * a column are a column); vertical widgets use ArrowDown/ArrowUp. A row laid out against its direction (row-reverse)
 * follows the eye, and a neighbour that wrapped onto the next line (a narrow screen) is reached with the key along the
 * row. When neither arrow of the pair moves but the other pair does, the line says so (a stacked tablist that answers
 * only Up/Down needs aria-orientation="vertical"). The items are found again after every key, so a widget that
 * re-renders them on each move is followed. Keys are held for 40 ms, as a person presses them. Tab stops (tabs,
 * roving) are counted by pressing Tab from a focusable marker placed just before the widget for the count (so an
 * iframe before it does not take Tab into its own links), and a group that is itself the stop and hands focus on
 * (Radix) or items that take focus out on Tab themselves (React Aria) count as one.
 *
 * tabs: "tablist" is the [role=tablist], or a wrapper around it (the tablist inside is driven).
 * roving: "group" is a toolbar, radiogroup, menubar, horizontal menu or fieldset of radios; its items are its tabs,
 * radios, menu items or focusable controls, not those of a composite nested inside it (a radio group inside a toolbar
 * is part of the toolbar's row; "items" overrides). One Tab stop (more warns); the arrow toward the neighbour moves
 * there and the other comes back; in a radio group the radio that takes focus is checked (warns).
 * slider: role=slider or <input type=range>; a name, aria-valuenow (min/max missing warns); the arrows change the value
 * and move the thumb the way they point — in RTL, ArrowLeft raises a slider whose minimum is on the right. A custom
 * thumb is whatever small box keeps its size and moves one way as the value rises and back as it falls; with none
 * found a left-to-right slider must rise on ArrowRight, and a right-to-left one is only checked for a change. A visible
 * native range is moved by Chromium with the arrow; a visually hidden one (MUI, React Aria: clipped, 1 px, or inside
 * a wrapper that clips it) is judged by the thumb drawn for it. ArrowUp raises it and Home/End reach its limits (APG;
 * warn).
 * palette: the trigger (focused, then "keys", default Enter) opens a dialog with a name (no dialog role fails; the page
 * behind left in the accessibility tree warns); focus moves into its search field, which has a name; typing "query"
 * (default: the first three letters of the last result shown) filters the results and a screen reader hears it (a
 * count in a live region, or the first result through aria-activedescendant; silence warns); ArrowDown makes a result
 * active for a screen reader; a query that matches nothing ("none", default "zqxjzq") must announce its message — a
 * visible "No results" outside a live region fails (WCAG 4.1.3); Escape closes it (a second Escape when the first
 * only cleared the field) and focus returns to the trigger. Results are never run: a command could navigate, sign
 * out or delete.
 * sortable: "list" holds the items (its children, or "items" inside it). The first item's handle ("handle" inside each
 * item, found the same way in every item after) needs a name, one that says which item it moves ("Reorder Brief";
 * warns) and instructions (aria-describedby; warns). Without "handle" the handle is the item when it takes focus and
 * is not a link or another control, else its first focusable control marked as a handle (aria-roledescription
 * "sortable" or "draggable", draggable="true", a drag-handle data attribute or class) or named for one (drag, reorder,
 * move, grip) and not for another action (delete, remove, close…); nothing else is pressed, since Space and Enter run
 * whatever control they land on (a Delete button deletes, a link navigates): no such control is "not tested" (give
 * "handle"), and a grip that does not take focus fails as pointer-only. Space picks it up (Enter when Space does
 * nothing), the arrow toward the next item (ArrowDown in a list, ArrowLeft in a right-to-left row) moves it two
 * places, Space (or Enter) drops it: the order must change with the same items (keys that add or remove items, or load
 * another page, are not a reorder), focus must stay on the moved item, something must be announced, and the
 * announcements must name the item or its neighbours — internal ids ("i1 was moved over i2") fail, positions alone
 * warn. Escape during a move must put the item back. "keys" replaces the sequence, for a move menu (["Enter",
 * "ArrowDown", "Enter"]); Escape is then not tested.
 * splitter: "separator" is the divider: focusable, role=separator, named, with aria-valuenow (min/max missing warns),
 * and an aria-orientation that matches it (the ARIA default is horizontal). A divider is vertical when it is a tall
 * bar (at least twice as long as it is thick), or, for a squarish grip, when the panes on either side of it sit side
 * by side. The
 * arrows move it the way they point, whatever the direction (APG), and change aria-valuenow; Home/End reach its
 * limits and Enter collapses or restores the pane (APG; warn).
 *
 * "before" steps run in order: { "fill": [sel, text] }, { "select": [sel, value or label] }, { "click": sel },
 * { "tap": sel } (touch devices), { "check": sel }, { "focus": sel }, { "press": key } or { "press": [sel, key] },
 * { "wait": ms }. A step that fails, or is not one of these, fails the contract: it did not start where it says.
 * "keys" (dialog, live, palette): the keys pressed, in order, on the focused trigger to activate it (default ["Enter"]).
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

// What Chromium's accessibility tree says about one element: role, name, description, value, and whether it is
// ignored (aria-hidden, inert, or outside an open modal dialog).
async function axOf(page, handle) {
  if (!handle) return {};
  const cdp = await page.context().newCDPSession(page);
  try {
    await handle.evaluate((e) => { window.__wcAxOne = e; });
    const { result } = await cdp.send('Runtime.evaluate', { expression: 'window.__wcAxOne' });
    const { nodes } = await cdp.send('Accessibility.getPartialAXTree', { objectId: result.objectId, fetchRelatives: false });
    const n = nodes[0] || {};
    const v = (x) => (x?.value != null ? String(x.value) : '');
    return { role: v(n.role), name: v(n.name).replace(/\s+/g, ' ').trim(), description: v(n.description).replace(/\s+/g, ' ').trim(), value: v(n.value), ignored: !!n.ignored };
  } catch { return {}; } finally {
    await cdp.send('Runtime.evaluate', { expression: 'delete window.__wcAxOne' }).catch(() => {});
    await cdp.detach().catch(() => {});
  }
}
const OPPOSITE = { ArrowLeft: 'ArrowRight', ArrowRight: 'ArrowLeft', ArrowUp: 'ArrowDown', ArrowDown: 'ArrowUp' };
const quote = (s, n = 80) => { const t = String(s).replace(/\s+/g, ' ').trim(); return `"${t.length > n ? `${t.slice(0, n - 1)}…` : t}"`; };

// A key held for 40 ms, as a person presses it: libraries that move focus in a timer and act on it only while the
// key is down (Radix radios check the radio that takes focus) miss a keyup that follows the keydown at once.
const key = (page, k) => page.keyboard.press(k, { delay: 40 });

/**
 * The Tab stops inside a group, counted by pressing Tab as a person does: from a focusable marker placed just before
 * the group for the count (removed after), Tab once to enter it, then count the presses that keep focus inside. The
 * marker makes the count independent of what precedes the group: an iframe (a map, a video, a form embed) would take
 * Tab into its own links first. A library that makes the group the stop and forwards focus to the current item
 * (Radix), or gives every item tabindex="0" and takes focus out itself on Tab (React Aria's toolbar), is counted by
 * what it does. `how` says what took focus on entering: the group pointing at an item (aria-activedescendant) or an
 * item. When the marker cannot take focus (a page that moves focus away from it), Tab starts from the focusable
 * element before the group, with up to three presses to enter.
 */
async function tabStops(page, g) {
  const marker = await g.evaluate((g) => {
    const m = document.createElement('span');
    m.tabIndex = 0; m.setAttribute('data-widgets-tab-start', '');
    m.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';
    if (g.parentNode) { g.parentNode.insertBefore(m, g); m.focus(); }
    if (document.activeElement === m) { window.__wcTabStart = m; return true; }
    m.remove();
    const vis = (e) => (e.checkVisibility ? e.checkVisibility({ visibilityProperty: true }) : e.getClientRects().length > 0);
    const before = [...document.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,summary,iframe,[tabindex],[contenteditable=""],[contenteditable=true]')]
      .filter((e) => e.tabIndex >= 0 && !e.matches(':disabled') && !g.contains(e) && !e.contains(g) && vis(e) && (e.compareDocumentPosition(g) & Node.DOCUMENT_POSITION_FOLLOWING));
    const p = before.pop();
    if (p) p.focus(); else document.activeElement?.blur?.();
    return false;
  });
  let stops = 0, how = null;
  try {
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab'); await page.waitForTimeout(60);
      const w = await g.evaluate((g) => { const a = document.activeElement; return { inside: g.contains(a), how: a === g && g.hasAttribute('aria-activedescendant') ? 'aria-activedescendant' : a?.matches('input[type=radio]') ? 'native radios' : 'roving tabindex' }; }).catch(() => ({}));
      if (w.inside) { stops++; how ||= w.how; } else if (stops || i >= (marker ? 0 : 2)) break;
    }
  } finally {
    await page.evaluate(() => { window.__wcTabStart?.remove(); delete window.__wcTabStart; }).catch(() => {});
  }
  return { stops, how };
}

// ARIA's default orientation by role: a tablist, toolbar or menubar is horizontal and a menu, listbox or tree vertical
// until aria-orientation says otherwise, however CSS lays the items out. A radio group or a plain group has none: its
// layout decides (radios in a column are a column).
const ORIENT = { tablist: 'horizontal', toolbar: 'horizontal', menubar: 'horizontal', menu: 'vertical', listbox: 'vertical', tree: 'vertical' };

/**
 * Arrow keys across the items of a composite widget (tabs, toolbar buttons, radios, menubar items), keyboard-first.
 * The arrow key follows the visual arrow (see the header): the key that points along the row from the current item to
 * its neighbour must move focus there, and the opposite key must come back. The direction is the group's computed
 * `direction`; the way the row runs on screen is read from the neighbours that share a line (a row-reversed row
 * follows the eye), and a neighbour that wrapped onto another line is reached with the key along the row. The
 * orientation is aria-orientation, else the role's ARIA default (ORIENT), else the layout. Every line names what was
 * assumed. `sel` picks the items inside the group (default: by the group's role, else its focusable controls, leaving
 * out those of a composite nested inside it); `start` is 'first' (tabs) or 'current' (the roving item, the checked
 * radio). The group and its items are found again before every read: a widget that re-renders its items on each move
 * (innerHTML templating, htmx swaps, re-keyed lists) replaces the nodes, and the n-th item is still the n-th item.
 * Returns what happened, for the caller's own checks (selection following focus, a radio checked by the move).
 */
async function arrowWalk(page, r, group, { sel, noun, what, start = 'first' }) {
  const inGroup = async (fn, arg) => (await group.elementHandle()).evaluate(fn, arg);
  const s0 = await inGroup((g, { sel, start }) => {
    const vis = (e) => (e.checkVisibility ? e.checkVisibility({ visibilityProperty: true }) : e.getClientRects().length > 0);
    const MI = '[role=menuitem],[role=menuitemradio],[role=menuitemcheckbox]';
    const BY_ROLE = { tablist: '[role=tab]', radiogroup: '[role=radio],input[type=radio]', menubar: MI, menu: MI, listbox: '[role=option]', tree: '[role=treeitem]' };
    const FOCUSABLE = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[tabindex],[contenteditable=""],[contenteditable=true],[role=button],[role=link],[role=checkbox],[role=radio],[role=switch],[role=tab],[role=option],[role=spinbutton],[role=slider],[role=combobox],[role=textbox],' + MI;
    // Composites with arrow keys of their own; a radio group inside a toolbar is part of the toolbar's row (APG).
    const COMPOSITE = '[role=toolbar],[role=menubar],[role=menu],[role=tablist],[role=listbox],[role=grid],[role=treegrid],[role=tree]';
    const role = g.getAttribute('role') || '';
    const q = sel || BY_ROLE[role] || (g.querySelector('input[type=radio]') && !g.querySelector(`${MI},[role=radio],[role=tab]`) ? 'input[type=radio]' : FOCUSABLE);
    // Nested matches: a control wins over a generic [tabindex] box around or inside it.
    const control = (e) => e.matches('a[href],button,input,select,textarea,summary') || /^(button|link|checkbox|radio|switch|tab|option|spinbutton|slider|combobox|textbox|menuitem|menuitemradio|menuitemcheckbox)$/.test(e.getAttribute('role') || '');
    window.__wcNavItems = (g) => {
      const items = [...g.querySelectorAll(q)].filter((e) => vis(e) && !e.matches(':disabled') && (() => { const k = e.parentElement?.closest(COMPOSITE); return !k || k === g || !g.contains(k); })());
      return items.filter((e) => !(items.some((o) => o !== e && e.contains(o)) && !control(e)) && !items.some((o) => o !== e && o.contains(e) && control(o)));
    };
    const items = window.__wcNavItems(g);
    // A visually hidden native radio is placed by its label.
    const box = (e) => { let b = e.getBoundingClientRect(); if ((b.width < 4 || b.height < 4) && e.labels?.[0]) b = e.labels[0].getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width, h: b.height }; };
    const boxes = items.map(box);
    // The way the row runs on screen: the majority step of neighbours that share a line (+1 rightward, -1 leftward;
    // 0 when no two neighbours share one, a column).
    let run = 0, rows = 0;
    for (let i = 0; i + 1 < boxes.length; i++) {
      const p = boxes[i], n = boxes[i + 1];
      if (Math.abs(n.y - p.y) < Math.min(p.h, n.h) / 2 && Math.abs(n.x - p.x) > 1) { rows++; run += Math.sign(n.x - p.x); }
    }
    // A group in the Tab sequence whose items are not: it points at them (aria-activedescendant) or hands focus on.
    const viaGroup = g.hasAttribute('aria-activedescendant') || (g.tabIndex >= 0 && items.length > 0 && !items.some((e) => e.tabIndex >= 0));
    const on = (e) => e.matches(':checked,[aria-checked=true],[aria-selected=true],[aria-pressed=true]');
    let cur = 0;
    if (start === 'current') { const i = items.findIndex((e) => e.tabIndex >= 0 && (!e.matches('input[type=radio]') || e.checked)); const j = items.findIndex((e) => e.matches('input[type=radio]:checked') || on(e)); cur = Math.max(0, i >= 0 ? i : j); }
    return { n: items.length, dir: getComputedStyle(g).direction, orient: g.getAttribute('aria-orientation'), role, viaGroup, boxes, cur, run: Math.sign(run), rows };
  }, { sel, start });
  const out = { ...s0, moved: false };
  if (s0.n < 2) return out;
  const where = () => inGroup((g) => {
    const items = window.__wcNavItems(g); let a = document.activeElement;
    const id = a?.getAttribute('aria-activedescendant'); if (id) a = document.getElementById(id) || a;
    return { idx: items.findIndex((e) => e === a || e.contains(a)), sel: items.findIndex((e) => e.matches(':checked,[aria-checked=true],[aria-selected=true]')) };
  }).catch(() => ({ idx: -1, sel: -1 }));
  const focusItem = (i) => inGroup((g, i) => { const it = window.__wcNavItems(g)[i]; it?.focus(); return !!it?.contains(document.activeElement); }, i).catch(() => false);
  // Focus the start. A group that is itself the stop either hands focus to an item (Radix) or keeps it and points at
  // the current item with aria-activedescendant; only the second is driven through the group.
  let ad = false, s = s0.cur;
  if (s0.viaGroup) {
    const w = await inGroup((g) => { g.focus(); return new Promise((ok) => setTimeout(() => ok(document.activeElement === g), 60)); });
    if (w) { ad = true; s = Math.max(0, (await where()).idx); }
  }
  if (!ad && !(await focusItem(s))) { out.unfocusable = true; return out; }
  const t = s < s0.n - 1 ? s + 1 : s - 1;
  const rel = t > s ? 'next' : 'previous';
  const a0 = s0.boxes[s], a1 = s0.boxes[t], dx = a1.x - a0.x, dy = a1.y - a0.y;
  const sameLine = Math.abs(dy) < Math.min(a0.h, a1.h) / 2;
  const stacked = !s0.rows;
  const orient = /^(horizontal|vertical)$/.test(s0.orient || '') ? s0.orient : ORIENT[s0.role] || (stacked ? 'vertical' : 'horizontal');
  const why = /^(horizontal|vertical)$/.test(s0.orient || '') ? 'aria-orientation' : ORIENT[s0.role] ? `the ARIA default for a ${s0.role} without aria-orientation` : 'its layout';
  const vertical = orient === 'vertical';
  // The key along the row toward the next item: the direction's, unless the row runs against it (row-reverse).
  const dirSign = s0.dir === 'rtl' ? -1 : 1;
  const fwd = (s0.run || dirSign) > 0 ? 'ArrowRight' : 'ArrowLeft';
  const toward = vertical ? (!sameLine ? (dy < 0 ? 'ArrowUp' : 'ArrowDown') : t > s ? 'ArrowDown' : 'ArrowUp')
    : sameLine && Math.abs(dx) > 1 ? (dx < 0 ? 'ArrowLeft' : 'ArrowRight') : t > s ? fwd : OPPOSITE[fwd];
  const away = OPPOSITE[toward];
  const place = sameLine ? `on its ${dx < 0 ? 'left' : 'right'}` : vertical || stacked ? (dy > 0 ? 'below it' : 'above it') : dy > 0 ? 'on the next line' : 'on the line above';
  const assumed = vertical ? `vertical ${what}, from ${why}`
    : `direction: ${s0.dir}, read from the ${what}${s0.run && s0.run !== dirSign ? '; its items run against that direction, and the key follows the eye' : ''}`
      + (stacked ? `; its ${noun}s are stacked, but the ${what} is horizontal: ${why}` : !sameLine ? `; the ${rel} ${noun} wrapped onto another line, and the key is the one along the row` : '');
  Object.assign(out, { toward, away, vertical, s, t, ad, assumed });
  await key(page, toward); await page.waitForTimeout(150);
  const w1 = await where();
  out.selAfter = w1.sel; out.idxAfter = w1.idx;
  if (w1.idx === t) {
    out.moved = true;
    r.ok(`${toward} moves focus to the ${rel} ${noun}, ${place} (${assumed})`);
    await key(page, away); await page.waitForTimeout(150);
    const w2 = await where();
    w2.idx === s ? r.ok(`${away} moves back`) : r.fail('2.1.1', `${away} does not move focus back to the ${rel === 'next' ? 'previous' : 'next'} ${noun} (${assumed})`);
    return out;
  }
  // Wrong: find out whether the other arrow does the job (the arrows run backwards), the other axis does (the
  // orientation is wrong), or nothing moves.
  const went = w1.idx >= 0 && w1.idx !== s ? `; it went to ${noun} ${w1.idx + 1} of ${s0.n}` : w1.idx === s ? '; focus stayed' : '';
  // Back to the start: focus it again, or (aria-activedescendant, which focus does not reset) press the opposite key
  // once when the last key moved the pointer.
  const reset = async (k, w) => { if (!ad) await focusItem(s); else if (w.idx !== s && w.idx >= 0) { await key(page, OPPOSITE[k]); await page.waitForTimeout(150); } };
  await reset(toward, w1);
  await key(page, away); await page.waitForTimeout(150);
  const w2 = await where();
  if (!vertical && w2.idx === t) {
    r.fail('2.1.1', `The arrow keys run backwards: ${toward} does not move to the ${rel} ${noun}, ${place}${went}, and ${away} does (${assumed}). The arrow key follows the visual arrow: in ${s0.dir === 'rtl' ? 'right-to-left' : 'left-to-right'} text ${s0.dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight'} moves to the next ${noun} (Radix, React Aria, Firefox's RTL guideline and native radios and ranges do this; APG says nothing about RTL)`);
    return out;
  }
  if (w2.idx === t) { r.fail('2.1.1', `${toward} does not move focus to the ${rel} ${noun}, ${place}${went} (${assumed}); ${away} does`); return out; }
  // The other axis: a tablist stacked by CSS but horizontal to assistive technology that answers only Up/Down.
  await reset(away, w2);
  const other = vertical ? (t > s ? fwd : OPPOSITE[fwd]) : t > s ? 'ArrowDown' : 'ArrowUp';
  await key(page, other); await page.waitForTimeout(150);
  const w3 = await where();
  if (w3.idx === t) {
    const [keys, flip] = vertical ? ['ArrowDown/ArrowUp', 'horizontal'] : ['ArrowLeft/ArrowRight', 'vertical'];
    const fix = why === 'its layout' ? `a ${what} laid out in a ${vertical ? 'column' : 'row'} is moved with ${keys}`
      : why === 'aria-orientation' ? `aria-orientation="${orient}" tells screen reader users to use ${keys}: make those move${vertical ? ', or remove it' : ''}`
      : `a ${s0.role} is ${orient} unless aria-orientation says otherwise, so screen reader users are told to use ${keys}: make those move, or set aria-orientation="${flip}"`;
    r.fail(why === 'its layout' ? '2.1.1' : '4.1.2', `${toward} does not move focus to the ${rel} ${noun}, ${place}${went}; nor does ${away}, but ${other} does (${assumed}) — ${fix}`);
  } else r.fail('2.1.1', `${toward} does not move focus to the ${rel} ${noun}, ${place}${went} (${assumed}); nor does ${away}`);
  return out;
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
    // A contract that names a wrapper is about the tablist inside it: its keys, its orientation, its Tab stop.
    const tl = (await list.evaluate(l => l.matches('[role=tablist]') || !l.querySelector('[role=tablist]'))) ? list : list.locator('[role=tablist]').first();
    // Counted by pressing Tab: Radix makes the tablist the stop and hands focus to the selected tab.
    const inSeq = (await tabStops(page, await tl.elementHandle())).stops;
    inSeq === 1 ? r.ok('roving tabindex: one tab in the Tab sequence') : r.fail('2.1.1', `${inSeq} tabs in the Tab sequence (APG: only the selected tab, arrows move between tabs)`);
    const first = list.locator('[role=tab]').first();
    const focused = await first.evaluate(t => { t.focus(); return document.activeElement === t; });
    if (!focused) { r.fail('2.1.1', 'Tabs cannot receive focus'); return r; }
    // The arrow toward the next tab (ArrowLeft in a right-to-left tablist) moves focus there, and the other comes back.
    const nav = await arrowWalk(page, r, tl, { sel: '[role=tab]', noun: 'tab', what: 'tablist' });
    if (nav.n < 2) r.fail('—', `Arrow keys not tested: ${nav.n} visible tab(s) found in the ${tl === list ? 'tablist' : `tablist inside ${c.tablist}`} (need two)`);
    else if (nav.unfocusable) r.fail('2.1.1', 'Arrow keys not tested: the first visible tab does not take focus');
    // Selection following focus is judged on whatever tab the first arrow reached (a backwards one included).
    if (nav.idxAfter >= 0 && nav.idxAfter !== nav.s) nav.selAfter === nav.idxAfter ? r.ok('selection follows focus (automatic activation)') : r.warnf('—', 'Selection does not follow focus — acceptable only if Enter/Space activates (manual activation)');
    await first.evaluate(t => t.focus());
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

  // A toolbar, radio group, menubar or horizontal menu: one Tab stop, arrows that follow the visual arrow.
  async roving(page, c) {
    const r = recorder('roving', c.group);
    const group = page.locator(c.group).first();
    await group.waitFor({ state: 'attached', timeout: 3000 });
    const role = (await group.getAttribute('role')) || await group.evaluate((g) => g.tagName.toLowerCase());
    const tab = await tabStops(page, await group.elementHandle());
    const nav = await arrowWalk(page, r, group, { sel: c.items, noun: 'item', what: role, start: 'current' });
    if (nav.n < 2) { r.fail('—', `Not tested: ${nav.n} item(s) found in the ${role} (need two; give the contract "items")`); return r; }
    if (tab.stops === 1) r.ok(`one Tab stop for the ${role} (${tab.how})`);
    else if (tab.stops === 0) r.fail('2.1.1', `Tab does not reach the ${role} — keyboard users cannot get to it`);
    else r.warnf('—', `${tab.stops} Tab stops inside the ${role} — APG: one Tab stop, the arrow keys move between items`);
    if (nav.unfocusable) { r.fail('2.1.1', `The ${role}'s items cannot receive focus`); return r; }
    // Radios are checked as focus moves (APG radio group; native radios do it).
    const radios = !/toolbar|menubar|menu/.test(role) && await group.evaluate((g) => !!g.querySelector('[role=radio],input[type=radio]'));
    if (radios && nav.idxAfter >= 0 && nav.idxAfter !== nav.s) nav.selAfter === nav.idxAfter ? r.ok('the radio that takes focus is checked') : r.warnf('—', 'Moving focus with the arrow keys does not check the radio (APG radio group: arrows move focus and check)');
    return r;
  },

  // role=slider or <input type=range>: a name, a value, arrows that move the thumb the way they point, Home/End.
  async slider(page, c) {
    const r = recorder('slider', c.slider);
    const el = page.locator(c.slider).first();
    await el.waitFor({ state: 'attached', timeout: 3000 });
    const h = await el.elementHandle();
    const read = () => h.evaluate((e) => {
      const native = e.matches('input[type=range]');
      const num = (a) => { const v = e.getAttribute(a); return v != null && v.trim() !== '' && Number.isFinite(+v) ? +v : null; };
      const cs = getComputedStyle(e);
      // A native range drawn by the page instead (MUI, React Aria): the input is visually hidden, itself or by a
      // wrapper (a 1 px box that clips it, clip, clip-path, opacity), and a custom thumb shows the value.
      const b = e.getBoundingClientRect();
      const clipped = (x) => {
        const xs = getComputedStyle(x), xb = x.getBoundingClientRect();
        const r = xs.clip.match(/rect\(([-\d.]+)px,?\s*([-\d.]+)px,?\s*([-\d.]+)px,?\s*([-\d.]+)px/);
        return (r && (r[2] - r[4] < 2 || r[3] - r[1] < 2)) || /inset\(\s*50%/.test(xs.clipPath) || (x !== e && xs.overflow !== 'visible' && (xb.width < 4 || xb.height < 4));
      };
      let hidden = native && (b.width < 8 || b.height < 4 || !(e.checkVisibility ? e.checkVisibility({ opacityProperty: true, visibilityProperty: true }) : true));
      for (let x = e, i = 0; native && !hidden && x && x !== document.body && i < 6; x = x.parentElement, i++) hidden = clipped(x);
      return { native, hidden, role: e.getAttribute('role'), tag: e.tagName.toLowerCase(), now: native ? +e.value : num('aria-valuenow'), min: native ? +(e.min || 0) : num('aria-valuemin'), max: native ? +(e.max || 100) : num('aria-valuemax'),
        orient: e.getAttribute('aria-orientation'), dir: cs.direction, writing: cs.writingMode };
    });
    const s0 = await read();
    if (!s0.native && s0.role !== 'slider') { r.fail('4.1.2', `${c.slider} is <${s0.tag}> without role="slider"`); return r; }
    const ax = await axOf(page, h);
    ax.name ? r.ok(`named: "${ax.name}"`) : r.fail('4.1.2', 'The slider has no accessible name');
    if (!s0.native && s0.now == null) r.fail('4.1.2', 'No aria-valuenow — screen readers cannot say the value');
    if (!s0.native && (s0.min == null || s0.max == null)) r.warnf('4.1.2', 'No aria-valuemin/aria-valuemax — 0 and 100 are assumed');
    const focused = await h.evaluate((e) => { e.focus(); return document.activeElement === e; });
    if (!focused) { r.fail('2.1.1', 'The slider cannot receive keyboard focus'); return r; }
    // ARIA's default orientation for a slider is horizontal: a tall one without aria-orientation is driven as one. A
    // visible native range is vertical by its writing mode.
    const own = s0.native && !s0.hidden;
    const vertical = own ? /vertical/.test(s0.writing) : s0.orient === 'vertical' || /vertical/.test(s0.writing);
    // A custom thumb is a box near the slider (up to 120 px: a thumb, its focus ring, its value bubble) that keeps its
    // size and moves one way when the value rises and back when it falls; of those, the one that moves furthest
    // (Radix puts the role on the thumb, MUI and React Aria a visually hidden native range inside it; neighbours that
    // shift a few pixels as the current mark grows lose). A visible native range's thumb lives in the browser's shadow
    // tree; Chromium moves it with the arrow in either direction (measured, S8): its value is read.
    const boxes = () => (own ? [] : h.evaluate((e) => {
      if (!window.__wcThumbs) {
        let root = e; for (let i = 0; i < 3 && root.parentElement && root.parentElement !== document.body; i++) root = root.parentElement;
        window.__wcThumbs = [e, ...root.querySelectorAll('*')].filter((x) => { const b = x.getBoundingClientRect(); return b.width > 0 && b.height > 0 && b.width <= 120 && b.height <= 120; });
      }
      return window.__wcThumbs.map((x) => { const b = x.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2, b.width, b.height]; });
    }));
    const press = async (k, n = 1) => { for (let i = 0; i < n; i++) { await key(page, k); await page.waitForTimeout(60); } await page.waitForTimeout(200); return (await read()).now; };
    const thumb = (B0, B1, B2) => {
      const ax = vertical ? 1 : 0; let best = null;
      for (let i = 0; i < B0.length; i++) {
        if ([B1, B2].some((B) => Math.abs(B[i][2] - B0[i][2]) >= 1 || Math.abs(B[i][3] - B0[i][3]) >= 1)) continue;
        const da = B1[i][ax] - B0[i][ax], db = B2[i][ax] - B1[i][ax], m = Math.min(Math.abs(da), Math.abs(db));
        if (m >= 1 && Math.sign(da) !== Math.sign(db) && (!best || m > best.m)) best = { m, da, db };
      }
      return best;
    };
    const [inc, dec] = vertical ? ['ArrowUp', 'ArrowDown'] : ['ArrowRight', 'ArrowLeft'];
    const assumed = vertical ? 'vertical slider' : `direction: ${s0.dir}, read from the slider`;
    // Start away from both ends, so that either arrow can move it.
    if (s0.now != null && s0.min != null && s0.max != null && s0.max > s0.min && (s0.now <= s0.min || s0.now >= s0.max)) {
      for (const k of s0.now <= s0.min ? ['ArrowUp', inc, dec] : ['ArrowDown', dec, inc]) { const v = (await read()).now; if (v > s0.min && v < s0.max) break; await press(k, 3); }
    }
    const v0 = (await read()).now;
    const B0 = await boxes();
    const a = { now: await press(inc, 2) };
    const B1 = await boxes();
    const b = { now: await press(dec, 2) };
    const th = thumb(B0, B1, await boxes());
    a.d = th ? th.da : 0; b.d = th ? th.db : 0;
    const vals = `value ${v0} → ${a.now} → ${b.now}`;
    const way = (d) => (vertical ? (d < 0 ? 'up' : 'down') : d < 0 ? 'left' : 'right');
    const want = { ArrowRight: 'right', ArrowLeft: 'left', ArrowUp: 'up', ArrowDown: 'down' };
    if (a.now === v0 && b.now === a.now && !a.d && !b.d) r.fail('2.1.1', `${inc} and ${dec} do not change the value (${vals}; ${assumed})`);
    else if (own) r.ok(`${inc} and ${dec} change the value (${vals}; a visible native range, whose thumb Chromium moves the way the arrow points; ${assumed})`);
    else if (a.d || b.d) {
      const bad = [[inc, a.d], [dec, b.d]].filter(([k, d]) => d && way(d) !== want[k]);
      if (bad.length) r.fail('2.1.1', `The arrow keys run backwards: ${bad.map(([k, d]) => `${k} moves the thumb ${way(d)}`).join(', ')} (${vals}; ${assumed}). The arrow key follows the visual arrow${vertical ? '' : `: ArrowLeft moves the thumb left${s0.dir === 'rtl' ? ' (on a right-to-left track, whose minimum is on the right, that raises the value)' : ''}`}`);
      else r.ok(`${inc} moves the thumb ${want[inc]} and ${dec} ${want[dec]} (${vals}; ${assumed})`);
      if (a.now === v0 && b.now === a.now) r.fail('4.1.2', 'The thumb moves but aria-valuenow does not change');
    } else if (!vertical && s0.dir === 'rtl') r.ok(`${inc} and ${dec} change the value (${vals}; no moving thumb was found${s0.hidden ? ' for this visually hidden native range' : ''}, so their direction was not checked; ${assumed})`);
    else if (a.now > v0 && b.now < a.now) r.ok(`${inc} raises the value and ${dec} lowers it (${vals}; no moving thumb was found, so the track is taken to run ${vertical ? 'bottom to top' : 'left to right'}; ${assumed})`);
    else r.fail('2.1.1', `${inc} does not raise the value (${vals}; no moving thumb was found; ${assumed}; APG: Right and Up raise it)`);
    if (!vertical) { const u0 = (await read()).now; const u = await press('ArrowUp'); u > u0 ? r.ok('ArrowUp raises the value') : r.warnf('—', `ArrowUp does not raise the value (APG slider: Up raises it in either direction; ${u0} → ${u})`); }
    const lim = await read();
    if (lim.min != null && lim.max != null) {
      const e = { now: await press('End') }, hm = { now: await press('Home') };
      e.now === lim.max && hm.now === lim.min ? r.ok(`Home and End reach the minimum and maximum (${lim.min}, ${lim.max})`) : r.warnf('—', `Home/End do not reach the minimum and maximum (End → ${e.now}, Home → ${hm.now}; range ${lim.min}–${lim.max})`);
    }
    await h.evaluate(() => { delete window.__wcThumbs; }).catch(() => {});
    return r;
  },

  // A command palette: a named dialog, focus in its field, results and "no results" announced, Escape, focus back.
  async palette(page, c) {
    const r = recorder('palette', c.trigger);
    const trigger = await page.locator(c.trigger).first().elementHandle();
    const DIALOGS = 'dialog[open],[role=dialog],[role=alertdialog]';
    // Dialogs already open (a cookie banner) are not the palette.
    await page.evaluate((sel) => { window.__wcPalBefore = new Set([...document.querySelectorAll(sel)].filter((e) => (e.checkVisibility ? e.checkVisibility({ visibilityProperty: true }) : e.getClientRects().length > 0))); }, DIALOGS);
    await activate(page, c.trigger, r, keysOf(c));
    await page.waitForTimeout(300);
    // The palette: the dialog holding focus or that opened, else the layer around a text field that took focus (the
    // outermost fixed box).
    const found = await page.evaluate(({ t, DIALOGS }) => {
      const vis = (e) => (e.checkVisibility ? e.checkVisibility({ visibilityProperty: true }) : e.getClientRects().length > 0);
      const who = (e) => (e.id ? '#' + e.id : e.tagName.toLowerCase() + (e.getAttribute('role') ? `[role=${e.getAttribute('role')}]` : ''));
      const FIELD = 'input:not([type]),input[type=text],input[type=search],textarea,[role=combobox],[role=searchbox],[role=textbox],[contenteditable=""],[contenteditable=true]';
      const isField = (e) => !!e && e !== t && e.matches(FIELD) && vis(e);
      const open = [...document.querySelectorAll(DIALOGS)].filter(vis);
      const dlg = open.find((d) => d.contains(document.activeElement)) || open.filter((d) => !window.__wcPalBefore?.has(d)).pop() || null;
      const a = document.activeElement;
      const field = isField(a) && (!dlg || dlg.contains(a)) ? a : (dlg && [...dlg.querySelectorAll(FIELD)].find(isField)) || null;
      let layer = dlg;
      if (!layer && field) { layer = document.body; for (let e = field; e && e !== document.body; e = e.parentElement) if (getComputedStyle(e).position === 'fixed') layer = e; }
      window.__wcPal = { dlg, field, layer };
      return { dialog: !!dlg, modal: !!dlg && (dlg.matches(':modal') || dlg.getAttribute('aria-modal') === 'true'), field: !!field, focusIn: !!field && a === field, focus: a && a !== document.body ? who(a) : 'body', layer: layer ? who(layer) : null };
    }, { t: trigger, DIALOGS });
    if (!found.dialog && !found.field) { r.fail('4.1.2', `No dialog opened, and no search field took focus (focus: ${found.focus})`); return r; }
    const part = (k) => page.evaluateHandle((k) => window.__wcPal[k], k);
    if (!found.dialog) r.fail('4.1.2', `The palette has no dialog semantics: its search field sits in a plain layer (${found.layer}), so screen readers are not told a dialog opened — use a named role="dialog" (or <dialog>) that is modal`);
    else { const d = await axOf(page, await part('dlg')); d.name ? r.ok(`dialog named "${d.name}"`) : r.fail('4.1.2', 'The palette dialog has no accessible name — aria-label it ("Command palette")'); }
    // The page behind is hidden from assistive technology while the palette is open (a modal dialog, inert, aria-hidden).
    const behind = await axOf(page, trigger);
    found.modal || behind.ignored ? r.ok(`the page behind is hidden from assistive technology (${found.modal ? 'a modal dialog' : 'the opener has left the accessibility tree'})`)
      : r.warnf('1.3.2', 'The page behind stays in the accessibility tree while the palette is open (the opener is still exposed) — make it modal (showModal(), or aria-modal with the rest inert)');
    if (!found.field) { r.fail('2.4.3', `No search field in the palette (focus: ${found.focus})`); return r; }
    const f = await axOf(page, await part('field'));
    if (found.focusIn) r.ok(`focus moved into the search field (${f.role || 'field'} "${f.name}")`);
    else { r.fail('2.4.3', `Focus did not move into the palette's search field (focus: ${found.focus})`); await page.evaluate(() => window.__wcPal.field.focus()); }
    if (!f.name) r.fail('4.1.2', 'The search field has no accessible name');
    const view = () => page.evaluate(() => {
      const { dlg, layer, field } = window.__wcPal;
      const vis = (e) => (e.checkVisibility ? e.checkVisibility({ visibilityProperty: true }) : e.getClientRects().length > 0);
      const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
      // Text in a display: contents box (React Aria's empty state) has no box of its own: its parent's decides.
      const shows = (e) => vis(e) || (getComputedStyle(e).display === 'contents' && !!e.parentElement && shows(e.parentElement));
      const OPT = '[role=option],[role=menuitem],[role=menuitemradio],[role=menuitemcheckbox],[role=gridcell]';
      const scopes = [layer, ...`${field?.getAttribute('aria-controls') || ''} ${field?.getAttribute('aria-owns') || ''}`.split(/\s+/).map((i) => i && document.getElementById(i))].filter((e) => e?.isConnected);
      const opts = new Set(); const texts = new Set();
      for (const s of scopes) {
        for (const o of s.querySelectorAll(OPT)) if (vis(o)) opts.add(o);
        for (const e of s.querySelectorAll('*')) { const own = norm([...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.nodeValue).join(' ')); if (own && shows(e)) texts.add(own); }
      }
      const a = document.activeElement; const id = a?.getAttribute('aria-activedescendant'); const ad = id ? document.getElementById(id) : null;
      const active = ad && vis(ad) ? norm(ad.innerText || ad.getAttribute('aria-label')) : a?.matches(OPT) ? norm(a.innerText || a.getAttribute('aria-label')) : null;
      const open = [dlg, layer !== document.body && layer, field].some((e) => e && e.isConnected && vis(e));
      return { options: [...opts].map((o) => norm(o.innerText || o.getAttribute('aria-label'))).filter(Boolean), active, via: ad && active ? 'aria-activedescendant' : active ? 'focus' : null, texts: [...texts], open, inField: a === field };
    });
    // Results: typing filters them, and a screen reader hears it (a count in a live region, or the active result).
    const v0 = await view();
    const word = (s) => (s.split(/\s+/).find((w) => /^\p{L}{3}/u.test(w)) || s).slice(0, 3).toLowerCase();
    const q = c.query != null ? String(c.query) : v0.options.length ? word(v0.options[v0.options.length - 1]) : 'a';
    await page.evaluate(() => { window.__announced = []; });
    await page.keyboard.type(q, { delay: 40 }); await page.waitForTimeout(700);
    const v1 = await view();
    const heard1 = await page.evaluate(() => [...new Set(window.__announced)]);
    const filtered = `typing "${q}" leaves ${v1.options.length} of ${v0.options.length} result(s)`;
    if (heard1.length) r.ok(`results announced via live region: ${quote(heard1.join(' / '))} (${filtered})`);
    else if (v1.active) r.ok(`the first result is read through ${v1.via}: "${v1.active}" (${filtered}; no count is announced)`);
    else if (!v1.options.length) r.warnf('—', `Results not tested: ${filtered} — give the contract a "query" that matches a command`);
    else r.warnf('4.1.3', `The results change silently (${filtered}): no count in a live region, and no result made active (aria-activedescendant)`);
    if (v1.options.length) {
      await page.keyboard.press('ArrowDown'); await page.waitForTimeout(400);
      const v2 = await view();
      v2.active ? r.ok(`ArrowDown makes a result active for a screen reader (${v2.via}: "${v2.active}")`) : r.fail('4.1.2', 'ArrowDown makes no result active for a screen reader: no aria-activedescendant on the field, and focus did not move to a result');
      if (!v2.inField) await page.evaluate(() => window.__wcPal.field?.focus());
    }
    // A query that matches nothing: its message must be announced (a visible status message, WCAG 4.1.3).
    for (let i = 0; i < q.length + 2; i++) await page.keyboard.press('Backspace');
    await page.waitForTimeout(400);
    const shown = new Set((await view()).texts);
    const none = c.none != null ? String(c.none) : 'zqxjzq';
    await page.evaluate(() => { window.__announced = []; });
    await page.keyboard.type(none, { delay: 40 }); await page.waitForTimeout(800);
    const v3 = await view();
    const heard3 = await page.evaluate(() => [...new Set(window.__announced)]);
    const msg = v3.texts.filter((t) => !shown.has(t) && t !== none);
    if (v3.options.length) r.warnf('—', `"No results" not tested: "${none}" still leaves ${v3.options.length} result(s)`);
    else if (heard3.length) r.ok(`no match announced via live region: ${quote(heard3.join(' / '))}`);
    else if (msg.length) r.fail('4.1.3', `No match: ${quote(msg.join(' / '))} is shown but not announced — put it (or a result count) in a role="status" region that exists before the first keystroke`);
    else r.warnf('4.1.3', `A query that matches nothing ("${none}") shows no message and announces nothing`);
    // Escape closes the palette (React Aria's first Escape clears the field) and focus returns to the trigger.
    await page.keyboard.press('Escape'); await page.waitForTimeout(350);
    let open = (await view().catch(() => ({ open: false }))).open, twice = false;
    if (open) { await page.keyboard.press('Escape'); await page.waitForTimeout(350); open = (await view().catch(() => ({ open: false }))).open; twice = !open; }
    if (open) { r.fail('2.1.2', 'Escape does not close the palette'); return r; }
    r.ok(`Escape closes it${twice ? ' (the first Escape cleared the field, the second closed it)' : ''}`);
    (await page.evaluate((t) => document.activeElement === t, trigger)) ? r.ok('focus returned to the trigger') : r.fail('2.4.3', `Focus not returned to the trigger on close (now on ${await active(page)})`);
    return r;
  },

  // Keyboard reordering: a named handle, pick up / move / drop, focus kept, moves announced by name, Escape cancels.
  async sortable(page, c) {
    const r = recorder('sortable', c.list);
    const list = page.locator(c.list).first();
    await list.waitFor({ state: 'attached', timeout: 3000 });
    const lh = await list.elementHandle();
    // The items in order, each with its label (its first line of text) and its handle; kept in the page for the steps.
    // The handle is chosen once, on the first item, and found the same way in every item after (the item itself, or
    // its n-th focusable control): a grid moves its roving tabindex onto the rows while it is used. Without "handle",
    // only a control marked or named as a handle is pressed (see the header): Space and Enter run whatever control they
    // land on, and a Delete button or a link first in the row would delete or navigate.
    let pin = null;
    const state = () => lh.evaluate((l, { isel, hsel, pin }) => {
      const vis = (e) => (e.checkVisibility ? e.checkVisibility({ visibilityProperty: true }) : e.getClientRects().length > 0);
      const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
      // The items' container is found once (the list, or the single wrapper inside it): a list that loses items
      // during the test must not be read one level down, as the parts of its last item.
      let items = null;
      if (isel) items = [...l.querySelectorAll(isel)].filter(vis);
      else if (window.__wcSortBox?.isConnected && l.contains(window.__wcSortBox)) items = [...window.__wcSortBox.children].filter((e) => vis(e) && norm(e.innerText));
      else for (let box = l, i = 0; i < 4 && !items; i++) { const kids = [...box.children].filter((e) => vis(e) && norm(e.innerText)); if (kids.length === 1 && kids[0].children.length) box = kids[0]; else { items = kids; window.__wcSortBox = box; } }
      items ||= [];
      const label = (e) => (e.innerText || '').split('\n').map(norm).find((s) => /[\p{L}\p{N}]/u.test(s)) || norm(e.getAttribute('aria-label'));
      const F = 'a[href],button,input,select,textarea,summary,[tabindex],[role=button]';
      const focusable = (x) => x.tabIndex >= 0 || x.hasAttribute('tabindex');
      const CONTROL = 'a[href],button,input,select,textarea,summary,[role=button],[role=link],[role=checkbox],[role=switch],[role=menuitem],[role=tab]';
      const name = (x) => norm(x.getAttribute('aria-label') || (x.getAttribute('aria-labelledby') || '').split(/\s+/).map((i) => (i && document.getElementById(i)?.textContent) || '').join(' ') || x.getAttribute('title') || x.innerText);
      // Marked as a handle (aria-roledescription "sortable"/"draggable", a drag-handle data attribute or class, an icon
      // named for it, draggable="true") or named for it, and not named for another action.
      const HINT = /drag|reorder|re-order|sortable|\bsort\b|\bmove\b|grip|handle|rearrange|\u283f|\u28ff/i;
      const OTHER = /delete|remove|trash|discard|archive|close|dismiss|clear|destroy|erase|cancel|edit|rename|duplicate|share/i;
      // `deep`: the classes inside it count too (an icon button whose <svg> is the grip).
      const marks = (x, deep) => [x.getAttribute('aria-roledescription'), name(x).slice(0, 60), x.id, ...(deep ? [x, ...x.querySelectorAll('*')].slice(0, 12) : [x]).map((y) => y.getAttribute('class')),
        ...[...x.attributes].filter((a) => a.name.startsWith('data-')).map((a) => a.name)].filter(Boolean).join(' ').replace(/[_-]/g, ' ');
      const handleLike = (x, deep = true) => (x.getAttribute('draggable') === 'true' || HINT.test(marks(x, deep))) && !OTHER.test(name(x)) && !x.matches('a[href]');
      // The item itself when it takes focus and is not a link or another control (a row, a listbox option), or is one
      // marked as a handle (dnd-kit, pangea); else its first focusable control marked or named as a handle.
      const guess = (e) => (focusable(e) && !e.matches('a[href]') && (!e.matches(CONTROL) || handleLike(e)) ? e
        : [...e.querySelectorAll(F)].find((x) => focusable(x) && vis(x) && handleLike(x))) || null;
      if (!hsel && pin == null && items[0]) { const h = guess(items[0]); pin = !h ? null : h === items[0] ? -1 : [...items[0].querySelectorAll(F)].indexOf(h); }
      const handle = (e) => (hsel ? e.querySelector(hsel) : pin == null ? null : pin < 0 ? e : e.querySelectorAll(F)[pin]) || null;
      window.__wcSort = { items, handles: items.map(handle), label };
      const box = (e) => { const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; };
      // Without a handle: a grip that only a pointer can use, else the controls that were passed over.
      const e0 = items[0];
      const grip = e0 && !handle(e0) ? [e0, ...e0.querySelectorAll('*')].find((x) => vis(x) && !focusable(x) && (x === e0 ? x.getAttribute('draggable') === 'true' : handleLike(x, false))) : null;
      const controls = e0 && !handle(e0) ? [...e0.querySelectorAll(F)].filter((x) => focusable(x) && vis(x)).slice(0, 4).map((x) => `${x.getAttribute('role') || x.tagName.toLowerCase()} "${name(x).slice(0, 40)}"`) : [];
      return { labels: items.map(label), boxes: items.map(box), handles: items.map((e) => !!handle(e)), dir: getComputedStyle(l).direction, pin,
        grip: grip ? (grip === e0 ? 'the item itself (draggable)' : `${grip.tagName.toLowerCase()}${grip.getAttribute('class') ? `.${grip.getAttribute('class').trim().split(/\s+/)[0]}` : ''} ${JSON.stringify(name(grip).slice(0, 30))}`) : null, controls };
    }, { isel: c.items, hsel: c.handle, pin }).then((s) => { pin = s.pin; return s; });
    const s0 = await state();
    if (s0.labels.length < 2) { r.fail('—', `Not tested: ${s0.labels.length} item(s) found in ${c.list} (give the contract "items")`); return r; }
    const moved = s0.labels[0];
    if (!s0.handles[0]) {
      if (c.handle) r.fail('—', `Not tested: no "${c.handle}" in "${moved}"`);
      else if (s0.grip) r.fail('2.1.1', `"${moved}" can only be dragged with a pointer: its handle (${s0.grip}) does not take keyboard focus`);
      else if (s0.controls.length) r.fail('—', `Not tested: no drag handle found in "${moved}" — the item does not take focus, and none of its controls (${s0.controls.join(', ')}) is marked or named as one (aria-roledescription, draggable, a name or class with drag, reorder, move or grip). Space and Enter would run whichever control it is (a Delete button, a link), so none was pressed; give the contract "handle"`);
      else r.fail('2.1.1', `"${moved}" has nothing that takes keyboard focus: it can only be dragged with a pointer`);
      return r;
    }
    const hax = await axOf(page, await page.evaluateHandle(() => window.__wcSort.handles[0]));
    // Labels and names are compared by their words: a numbered row ("1. Brief ≡") is named "Reorder Brief".
    const words = (t) => (String(t).match(/\p{L}[\p{L}\p{M}'’]*/gu) || []).join(' ').toLowerCase();
    const plain = words(moved) ? (String(moved).match(/\p{L}[\p{L}\p{M}\p{N}'’]*/gu) || []).join(' ') : moved;
    const says = (hay, l) => (words(l) ? words(hay).includes(words(l)) : !!l && hay.toLowerCase().includes(l.toLowerCase()));
    if (!hax.name) r.fail('4.1.2', 'The drag handle has no accessible name');
    else says(hax.name, moved) ? r.ok(`handle named "${hax.name}"`) : r.warnf('2.4.6', `The handle's name "${hax.name}" does not say which item it moves — name it "Reorder ${plain}"`);
    if (!c.keys) hax.description ? r.ok(`instructions: ${quote(hax.description, 100)}`) : r.warnf('—', 'The handle has no instructions (aria-describedby): how to pick up, move, drop and cancel');
    // The move key points at the next item: ArrowDown in a list, ArrowLeft in a right-to-left row.
    const a0 = s0.boxes[0], a1 = s0.boxes[1], dx = a1.x - a0.x, dy = a1.y - a0.y;
    const mv = Math.abs(dy) >= Math.abs(dx) ? (dy < 0 ? 'ArrowUp' : 'ArrowDown') : dx < 0 ? 'ArrowLeft' : 'ArrowRight';
    const layout = /Up|Down/.test(mv) ? 'a vertical list' : `a row, direction: ${s0.dir}, read from the list; the next item is on the ${dx < 0 ? 'left' : 'right'}`;
    const same = (x, y) => x.join('\n') === y.join('\n');
    const tries = c.keys ? [[].concat(c.keys)] : [['Space', mv, mv, 'Space'], ['Enter', mv, mv, 'Enter']];
    // A handle that loads a new document (a link, a submit button) is caught, not reported as a missing list: the
    // recorder's per-document token changes (a history-API route change or a #hash keeps the document and is not).
    const doc0 = await page.evaluate(() => window.__doc);
    const away = async () => (await page.evaluate(() => window.__doc).catch(() => null)) !== doc0;
    let got = null, used = null, left = false;
    for (const keys of tries) {
      await state();
      await page.evaluate(() => { window.__announced = []; window.__wcSort.handles[0]?.focus(); });
      used = keys;
      for (const k of keys) { await page.keyboard.press(k); await page.waitForTimeout(250); if ((left = await away())) break; }
      if (!left) await page.waitForTimeout(1200); // Pragmatic drag and drop announces after 1000 ms
      if (left || (left = await away())) break;
      got = { s: await state(), heard: await page.evaluate(() => [...new Set(window.__announced)]) };
      if (!same(got.s.labels, s0.labels)) break;
      await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    }
    if (left) { await page.waitForLoadState('load').catch(() => {}); r.fail('—', `Not tested: ${used.join(', ')} on the handle of "${moved}" loaded another page (${page.url()}) — give the contract the "handle" that reorders`); return r; }
    const after = got.s.labels, heard = got.heard, text = heard.join(' / ');
    if (same(after, s0.labels)) { r.fail('2.1.1', `The keyboard does not reorder the list: ${tries.map((k) => k.join(', ')).join(', then ')} on the handle of "${moved}" left the order as it was (${layout})${heard.length ? `; announced: ${quote(text)}` : ''}`); return r; }
    // A reorder keeps the same items: keys that add or remove items ran another command. Items are compared without
    // their digits, so a numbered list ("1. Brief" becoming "3. Brief") is still the same items.
    const K = (l) => l.replace(/\p{Nd}+/gu, '#');
    const bag = (x) => x.map(K).sort().join('\n');
    if (bag(after) !== bag(s0.labels)) {
      const gone = s0.labels.filter((l) => !after.map(K).includes(K(l))), added = after.filter((l) => !s0.labels.map(K).includes(K(l)));
      r.fail('—', `Not a reorder: ${used.join(', ')} on the handle of "${moved}" changed which items are in the list (${[gone.length ? `gone: ${gone.map((l) => quote(l, 30)).join(', ')}` : '', added.length ? `new: ${added.map((l) => quote(l, 30)).join(', ')}` : ''].filter(Boolean).join('; ') || `${s0.labels.length} → ${after.length} items`}) — the handle ran another command; give the contract the "handle" that reorders`);
      return r;
    }
    const to = after.map(K).indexOf(K(moved));
    r.ok(`${used.join(', ')} moves "${moved}" from position 1 to ${to + 1} of ${after.length} (${layout})`);
    const kept = await page.evaluate((moved) => {
      const a = document.activeElement; if (!a || a === document.body) return false;
      const K = (l) => l.replace(/\p{Nd}+/gu, '#');
      const { items, label } = window.__wcSort; const it = items.find((e) => e.contains(a));
      return (it && K(label(it)) === K(moved)) || `${a.getAttribute('aria-label') || ''} ${a.innerText || ''}`.includes(moved);
    }, moved);
    kept ? r.ok(`focus stays on "${moved}"`) : r.fail('2.4.3', `Focus did not stay on the moved item (now on ${await active(page)})`);
    // Announcements: an item's name (or its neighbours'), never an internal id; positions alone leave out which item.
    const low = text.toLowerCase();
    const names = s0.labels.filter((l) => says(text, l));
    const ids = [...new Set((text.match(/[\p{L}\p{N}_-]+/gu) || []).filter((t) => /\d/.test(t) && /[a-z_]/i.test(t) && !/^\d+(st|nd|rd|th|px)$/i.test(t) && !s0.labels.some((l) => l.toLowerCase().includes(t.toLowerCase()))))];
    const say = `"${plain} moved to position ${to + 1} of ${after.length}"`;
    if (!heard.length) r.fail('4.1.3', 'Nothing was announced during the move (pick up, moves, drop)');
    else if (names.length) r.ok(`announcements name the items: ${quote(text, 120)}`);
    else if (ids.length) r.fail('4.1.3', `The announcements name internal ids (${ids.slice(0, 3).join(', ')}), not the items: ${quote(text, 120)} — give the library announcements that use the item's label (${say})`);
    else if (/\d/.test(text)) r.warnf('4.1.3', `The announcements give positions but not the item: ${quote(text, 120)} — name it (${say})`);
    else r.warnf('4.1.3', `The announcements name neither the item nor its position: ${quote(text, 120)}`);
    // Escape during a move puts the item back (only with the default keys: a move menu has its own way out).
    const s1 = c.keys ? null : await state();
    const i = s1 ? s1.labels.map(K).indexOf(K(moved)) : -1;
    if (s1 && i >= 0) {
      const k = i < s1.labels.length - 1 ? mv : OPPOSITE[mv];
      await page.evaluate((i) => window.__wcSort.handles[i]?.focus(), i);
      for (const key of [used[0], k, 'Escape']) { await page.keyboard.press(key); await page.waitForTimeout(250); }
      await page.waitForTimeout(800);
      const s2 = await state();
      same(s2.labels, s1.labels) ? r.ok(`Escape during a move puts "${moved}" back`) : r.fail('—', `Escape does not cancel a move: ${used[0]}, ${k}, Escape left "${moved}" at position ${s2.labels.map(K).indexOf(K(moved)) + 1} (it was at ${i + 1})`);
    }
    return r;
  },

  // Resizable panes: a focusable, named separator with a value and the right orientation, moved by the arrows.
  async splitter(page, c) {
    const r = recorder('splitter', c.separator);
    const sep = page.locator(c.separator).first();
    await sep.waitFor({ state: 'attached', timeout: 3000 });
    const h = await sep.elementHandle();
    const read = () => h.evaluate((e) => {
      const num = (a) => { const v = e.getAttribute(a); return v != null && v.trim() !== '' && Number.isFinite(+v) ? +v : null; };
      const vis = (x) => (x.checkVisibility ? x.checkVisibility() : x.getClientRects().length > 0);
      const cen = (x) => { const b = x.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; };
      // The divider's orientation: its own shape when it is a bar (at least twice as long as it is thick: tall is
      // vertical); a squarish grip takes it from the panes on either side of it (side by side: vertical), else from its
      // shape. Neighbours that do not flank it (a bar positioned at a sidebar's edge, between the sidebar's nav and
      // footer) say nothing.
      let p = e.previousElementSibling; while (p && !vis(p)) p = p.previousElementSibling;
      let n = e.nextElementSibling; while (n && !vis(n)) n = n.nextElementSibling;
      const b = e.getBoundingClientRect(), [x, y] = cen(e);
      const shape = b.height > b.width ? 'vertical' : 'horizontal';
      const bar = Math.max(b.width, b.height) >= 2 * Math.min(b.width, b.height) && Math.max(b.width, b.height) > 0;
      let side = null;
      if (p && n) {
        const [px, py] = cen(p), [nx, ny] = cen(n);
        if ((px - x) * (nx - x) < 0 && Math.abs(px - nx) > Math.abs(py - ny)) side = 'vertical';
        else if ((py - y) * (ny - y) < 0 && Math.abs(py - ny) > Math.abs(px - nx)) side = 'horizontal';
      }
      return { x, y, now: num('aria-valuenow'), min: num('aria-valuemin'), max: num('aria-valuemax'), orient: e.getAttribute('aria-orientation'), role: e.getAttribute('role'), tag: e.tagName.toLowerCase(), dir: getComputedStyle(e).direction, divider: bar || !side ? shape : side };
    });
    const s0 = await read();
    s0.role === 'separator' ? r.ok('role="separator"') : r.fail('4.1.2', `The divider is <${s0.tag}>${s0.role ? ` with role="${s0.role}"` : ''}, not role="separator" — screen readers are not told it resizes the panes`);
    const focused = await h.evaluate((e) => { e.focus(); return document.activeElement === e; });
    if (!focused) { r.fail('2.1.1', 'The divider cannot receive keyboard focus — the panes can only be resized with a pointer (tabindex="0" and arrow keys)'); return r; }
    const ax = await axOf(page, h);
    ax.name ? r.ok(`named: "${ax.name}"`) : r.fail('4.1.2', 'The divider has no accessible name — name it after the pane it resizes (APG: aria-labelledby that pane\'s label, or aria-label)');
    if (s0.now == null) r.fail('4.1.2', 'No aria-valuenow — screen readers cannot say where the divider is');
    else if (s0.min == null || s0.max == null) r.warnf('4.1.2', `No aria-valuemin/aria-valuemax — 0 and 100 are assumed (aria-valuenow ${s0.now})`);
    else s0.now >= s0.min && s0.now <= s0.max ? r.ok(`aria-valuenow ${s0.now} in ${s0.min}–${s0.max}`) : r.fail('4.1.2', `aria-valuenow ${s0.now} is outside ${s0.min}–${s0.max}`);
    (s0.orient || 'horizontal') === s0.divider ? r.ok(`aria-orientation ${s0.orient ? `"${s0.orient}"` : '(default horizontal)'} matches the ${s0.divider} divider`)
      : r.fail('4.1.2', `aria-orientation ${s0.orient ? `"${s0.orient}"` : 'is missing (the default is horizontal)'} on a ${s0.divider} divider — screen readers name the wrong arrow keys; set aria-orientation="${s0.divider}"`);
    const [fwd, back] = s0.divider === 'vertical' ? ['ArrowRight', 'ArrowLeft'] : ['ArrowDown', 'ArrowUp'];
    const axis = s0.divider === 'vertical' ? 'x' : 'y';
    const word = { ArrowRight: 'right', ArrowLeft: 'left', ArrowDown: 'down', ArrowUp: 'up' };
    const way = (d) => (axis === 'x' ? (d > 0 ? 'right' : 'left') : d > 0 ? 'down' : 'up');
    const step = async (k, n = 3) => { const a = await read(); for (let i = 0; i < n; i++) { await page.keyboard.press(k); await page.waitForTimeout(100); } await page.waitForTimeout(200); const b = await read(); return { d: Math.abs(b[axis] - a[axis]) >= 1 ? b[axis] - a[axis] : 0, from: a.now, to: b.now }; };
    // Forward, back past the start, forward again (a divider at its limit moves only one way).
    let f = await step(fwd); const bk = await step(back, f.d || f.from !== f.to ? 3 : 6); if (!f.d && f.from === f.to) f = await step(fwd);
    const assumed = `direction: ${s0.dir}, and a divider moves the way the arrow points in either direction, APG`;
    const moves = [[fwd, f], [back, bk]];
    const wrong = moves.filter(([k, m]) => m.d && way(m.d) !== word[k]);
    const still = moves.filter(([, m]) => !m.d);
    const valued = f.from !== f.to || bk.from !== bk.to;
    if (still.length === 2 && !valued) r.fail('2.1.1', `${fwd} and ${back} do not move the divider (${assumed})`);
    else if (wrong.length) r.fail('2.1.1', `The arrow keys run backwards: ${wrong.map(([k, m]) => `${k} moves the divider ${way(m.d)}`).join(', ')} (${assumed})`);
    else if (still.length === 2) r.warnf('—', `The arrows change aria-valuenow (${f.from} → ${f.to}, ${bk.from} → ${bk.to}) but the divider does not move`);
    else r.ok(`${moves.filter(([, m]) => m.d).map(([k, m]) => `${k} moves the divider ${word[k]} (${m.d > 0 ? '+' : ''}${Math.round(m.d)} px, aria-valuenow ${m.from} → ${m.to})`).join(', ')} (${assumed})`);
    if (still.length < 2 && s0.now != null && !valued) r.fail('4.1.2', `aria-valuenow stays ${s0.now} while the divider moves`);
    const e = await step('End', 1), hm = await step('Home', 1);
    const moved = (m) => m.d || m.from !== m.to;
    moved(e) && moved(hm) ? r.ok(`Home and End move the divider to its limits (aria-valuenow ${hm.to}, ${e.to})`) : r.warnf('—', `Home/End do not move the divider (APG: optional; End → ${e.to}, Home → ${hm.to})`);
    const en = await step('Enter', 1);
    if (moved(en)) { r.ok(`Enter collapses or restores the pane (aria-valuenow ${en.from} → ${en.to})`); await step('Enter', 1); }
    else r.warnf('—', 'Enter does not collapse or restore the pane (APG window splitter)');
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
  try {
    if (!tests[c.type]) throw new Error(`unknown contract type "${c.type}" (${Object.keys(tests).join(', ')})`);
    const r = await tests[c.type](page, c); r.fails.unshift(...setup); results.push(r);
  }
  catch (e) {
    const target = c.trigger || c.tablist || c.button || c.form || c.group || c.slider || c.list || c.separator;
    const vp = page.viewportSize();
    // The commonest cause: a control that exists only at another width (a phone menu tested on a desktop viewport).
    const hidden = await page.locator(target).first().evaluate((el) => !el.checkVisibility?.({ checkVisibilityCSS: true }), null, { timeout: 1000 }).catch(() => null);
    const stepFailed = setup.length ? ' (a before step failed, see below)' : '';
    const why = !tests[c.type] ? e.message : hidden === true ? `${target} exists but is not visible at ${vp.width}×${vp.height}${stepFailed || ' — give the contract "device": "phone" (or run with --device phone)'}`
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
