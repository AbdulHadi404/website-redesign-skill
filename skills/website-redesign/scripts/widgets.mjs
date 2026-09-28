#!/usr/bin/env node
/**
 * widget-contracts.mjs — drive interactive widgets with the KEYBOARD and check the contract a
 * screen-reader/keyboard user relies on (WAI-ARIA APG + GOV.UK error pattern).
 *
 *   node widgets.mjs <url> contracts.json
 *
 * contracts.json is a list; selectors are Playwright selectors (CSS, text=…, role=…):
 *   { "type": "dialog",      "trigger": "#invite-open" }
 *   { "type": "tabs",        "tablist": "[role=tablist]" }
 *   { "type": "disclosure",  "button": "#adv-toggle" }
 *   { "type": "live",        "trigger": "#export" }                  // toast / async status
 *   { "type": "form-errors", "form": "#settings", "submit": "button[type=submit]" }   // submit: inside the form, or a full selector
 *   { "type": "live", "trigger": "#visit-form button", "before": [{ "fill": ["#name", "Aoife"] }] }   // steps first
 *   { "type": "menu-button", "button": "#account" }
 *
 * Every step is keyboard-first. When a trigger cannot be reached or activated by keyboard the
 * test records the FAIL, then falls back to a mouse click so the rest of the contract is still checked.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { launch, open } from './lib/env.mjs';

const [url, file] = process.argv.slice(2);
if (!url || !file) { console.error('usage: node widgets.mjs <url> contracts.json'); process.exit(2); }
const contracts = JSON.parse(await readFile(file, 'utf8'));
const { browser } = await launch({ chrome: process.env.CHROME_PATH });
const results = [];

// Records what a screen reader would be told: live-region changes and focus moves.
const RECORDER = () => {
  window.__announced = []; window.__silent = []; window.__focus = []; window.__mut = 0;
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

const active = (page) => page.evaluate(() => { const a = document.activeElement; return a && a !== document.body ? (a.id ? '#' + a.id : a.tagName.toLowerCase()) + ' ' + (a.innerText || a.getAttribute('aria-label') || '').trim().slice(0, 30) : 'body'; });
async function activate(page, sel, r, keys = ['Enter']) {
  const loc = page.locator(sel).first();
  await loc.waitFor({ state: 'attached', timeout: 3000 });
  const focusable = await loc.evaluate(el => { el.focus(); return document.activeElement === el; });
  if (!focusable) { r.fail('2.1.1', 'Trigger cannot receive keyboard focus'); await loc.click(); return 'click'; }
  const sig = () => page.evaluate(() => { const all = [...document.querySelectorAll('body *')]; return document.documentElement.innerHTML.length + '|' + all.map((e, i) => (e.matches('[open],[aria-expanded=true]') ? i : '')).join('') + '|' + all.filter(e => (e.checkVisibility ? e.checkVisibility({ visibilityProperty: true }) : e.getClientRects().length)).length; });
  const before = await sig();
  let requests = 0; const onReq = () => { requests++; }; page.on('request', onReq);
  const mut0 = await page.evaluate(() => window.__mut || 0);
  for (const k of keys) await page.keyboard.press(k);
  await page.waitForTimeout(350);
  const after = await sig();
  const mut1 = await page.evaluate(() => window.__mut || 0);
  page.off('request', onReq);
  // Something happened if the page changed, the DOM was rewritten (a refresh re-rendering identical text), or it fetched.
  if (before === after && mut1 === mut0 && requests === 0) { r.fail('2.1.1', `${keys.join('+')} on the focused trigger does nothing — falling back to click`); await loc.click(); await page.waitForTimeout(350); return 'click'; }
  return 'keyboard';
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
    await activate(page, c.trigger, r);
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
    const label = () => page.locator(c.trigger).first().evaluate(el => (el.innerText || el.getAttribute('aria-label') || '').trim()).catch(() => '');
    const label0 = await label();
    // What newly became visible is compared, not what mutated: animation libraries, sticky headers and scroll
    // states rewrite classes and inline styles constantly. Scroll the trigger into view and let that settle first.
    const texts = () => page.evaluate(() => {
      const live = '[aria-live]:not([aria-live="off"]),[role=status],[role=alert],[role=log],output';
      const out = [];
      for (const el of document.body.querySelectorAll('*')) {
        const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.nodeValue).join(' ').replace(/\s+/g, ' ').trim();
        if (!own || own.length > 200 || el.closest(live) || !(el.checkVisibility ? el.checkVisibility({ visibilityProperty: true, opacityProperty: true }) : el.getClientRects().length)) continue;
        out.push(own);
      }
      return out;
    });
    await page.locator(c.trigger).first().evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' })).catch(() => {});
    await page.waitForTimeout(600);
    const seen0 = new Set(await texts());
    await page.evaluate(() => { window.__announced = []; window.__silent = []; });
    await activate(page, c.trigger, r);
    await page.waitForTimeout(400);
    const label1 = await label();
    const appeared = (await texts()).filter(t => !seen0.has(t) && t !== label1);
    await page.waitForTimeout(800);
    const { announced } = await page.evaluate(() => ({ announced: [...new Set(window.__announced)] }));
    const silent = [...new Set(appeared)].slice(0, 3);
    const relabel = label1 && label1 !== label0 ? `; the trigger's own label changed ("${label0}" → "${label1}"), which screen readers do not reliably announce` : '';
    announced.length ? r.ok(`announced via live region: "${announced.join(' / ')}"`) : r.fail('4.1.3', `Nothing announced${silent.length ? `; visible message not in a live region: "${silent.join(' / ')}"` : ''}${relabel}`);
    const regionsAtLoad = await page.evaluate(() => document.querySelectorAll('[aria-live]:not([aria-live="off"]),[role=status],[role=alert],[role=log]').length);
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
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, permissions: ['clipboard-read', 'clipboard-write'] });
  await ctx.addInitScript(RECORDER);
  const page = await ctx.newPage();
  await open(page, url);
  // Optional set-up steps before the contract runs (fill a form so its async status can be tested, open a panel).
  for (const s of c.before || []) {
    if (s.fill) await page.locator(s.fill[0]).first().fill(String(s.fill[1])).catch(() => {});
    else if (s.click) await page.locator(s.click).first().click({ timeout: 4000 }).catch(() => {});
    else if (s.check) await page.locator(s.check).first().check({ timeout: 4000 }).catch(() => {});
    else if (s.wait) await page.waitForTimeout(s.wait);
  }
  try { results.push(await tests[c.type](page, c)); }
  catch (e) { results.push({ type: c.type, target: c.trigger || c.tablist || c.button || c.form, passes: [], fails: [`test error: ${e.message.split('\n')[0]}`], warns: [] }); }
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
