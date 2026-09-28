#!/usr/bin/env node
/**
 * a11y-audit.mjs — scripted checks for the things rule engines (axe, htmlcs, IBM) do not see.
 * Run it AFTER axe; it does not repeat axe's rules.
 *
 *   node a11y.mjs <url> [--out dir] [--tabs 80] [--width 1280 --height 720]
 *
 * Browser: resolved like the other scripts (lib/env.mjs) — CHROME_PATH to choose one.
 * Output: <out>/audit.json, <out>/*.png, and a FAIL / WARN / INFO summary on stdout.
 *
 * Sections (WCAG 2.2 SC in brackets):
 *   page      lang, title, zoom-blocking viewport                         [3.1.1 2.4.2 1.4.4]
 *   names     CDP accessibility tree: unnamed controls, placeholder- or title-only names,
 *             label-in-name mismatches, filename alts, ambiguous link text  [4.1.2 3.3.2 2.5.3 1.1.1 2.4.4]
 *   outline   headings and landmarks as a screen-reader user would list them [1.3.1 2.4.6 2.4.1]
 *   keyboard  Tab walk: order, focus visible (pixel diff), 2.4.13 area/contrast estimate,
 *             obscured by sticky UI, traps, skip link; reverse walk for obscuring
 *             [2.1.1 2.1.2 2.4.3 2.4.7 2.4.11 2.4.13 2.4.1]
 *   pointer   clickable things that keyboard users cannot reach (listeners / cursor:pointer)  [2.1.1 4.1.2]
 *   targets   targets < 24x24 without the spacing exception                  [2.5.8]
 *   nontext   form-control boundaries < 3:1 against their background         [1.4.11]
 *   autocomplete  personal-data fields without autocomplete tokens          [1.3.5]
 *   reflow    horizontal scrolling at 320 CSS px and 640 CSS px (400% / 200% of 1280) [1.4.10 1.4.4]
 *   spacing   text clipped after WCAG text-spacing overrides                 [1.4.12]
 *   forced    forced-colors: controls losing their boundary, focus lost      [1.4.11 2.4.7 in WHCM]
 *   colour    achromatopsia / deuteranopia screenshots for review of colour-only meaning [1.4.1]
 *   motion    animations still running under prefers-reduced-motion; auto-updating regions [2.3.3 2.2.2]
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { launch, open } from './lib/env.mjs';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i === -1 ? d : args[i + 1]; };
const url = args.find(a => /^https?:|^file:/.test(a));
if (!url) { console.error('usage: node a11y.mjs <url> [--out dir] [--tabs 80]'); process.exit(2); }
const outDir = opt('out', 'a11y-audit');
const maxTabs = +opt('tabs', 80);
const W = +opt('width', 1280), H = +opt('height', 720);
await mkdir(outDir, { recursive: true });

const { browser } = await launch({ chrome: process.env.CHROME_PATH });
const findings = [];
const add = (level, section, sc, msg, where = '') => findings.push({ level, section, sc, msg, where });
const report = { url, date: new Date().toISOString(), findings, data: {} };
const t0 = performance.now();

// ---------- helpers ----------
const calc = await (await browser.newContext()).newPage(); // scratch page for image maths
async function pixelDiff(a, b) {
  return calc.evaluate(async ([a, b]) => {
    const load = async (s) => createImageBitmap(await (await fetch('data:image/png;base64,' + s)).blob());
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    const w = Math.min(ia.width, ib.width), h = Math.min(ia.height, ib.height);
    const px = (img) => { const c = new OffscreenCanvas(w, h); const x = c.getContext('2d'); x.drawImage(img, 0, 0); return x.getImageData(0, 0, w, h).data; };
    const da = px(ia), db = px(ib);
    const lum = (r, g, b) => { const f = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    let changed = 0, changed3 = 0;
    for (let i = 0; i < da.length; i += 4) {
      if (da[i] !== db[i] || da[i + 1] !== db[i + 1] || da[i + 2] !== db[i + 2]) {
        changed++;
        const l1 = lum(da[i], da[i + 1], da[i + 2]), l2 = lum(db[i], db[i + 1], db[i + 2]);
        if ((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05) >= 3) changed3++;
      }
    }
    return { changed, changed3, w, h };
  }, [a.toString('base64'), b.toString('base64')]);
}
const describe = `(el) => {
  if (!el || el === document.body) return 'body';
  const id = el.id ? '#' + el.id : '';
  const cls = el.classList.length ? '.' + [...el.classList].slice(0, 2).join('.') : '';
  const txt = (el.innerText || el.getAttribute('aria-label') || el.value || '').trim().replace(/\\s+/g, ' ').slice(0, 40);
  return el.tagName.toLowerCase() + id + cls + (txt ? ' "' + txt + '"' : '');
}`;

async function newPage(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, ...opts });
  const page = await ctx.newPage();
  await open(page, url);
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(300);
  return page;
}

// ---------- 1. page-level ----------
{
  const page = await newPage();
  const p = await page.evaluate(() => ({
    lang: document.documentElement.getAttribute('lang'),
    title: document.title.trim(),
    viewport: document.querySelector('meta[name=viewport]')?.content || '',
  }));
  if (!p.lang) add('FAIL', 'page', '3.1.1', 'No lang attribute on <html>');
  if (!p.title) add('FAIL', 'page', '2.4.2', 'Empty or missing <title>');
  if (/user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*(1(\.0)?|0?\.\d+)\b/i.test(p.viewport)) add('FAIL', 'page', '1.4.4', `Viewport blocks zoom: "${p.viewport}"`);
  report.data.page = p;

  // ---------- 2. names, via Chromium's own accessibility tree ----------
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.getDocument', { depth: -1 });
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  const interactive = new Set(['button', 'link', 'textbox', 'searchbox', 'combobox', 'checkbox', 'radio', 'switch', 'tab', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'option', 'slider', 'spinbutton', 'listbox', 'treeitem']);
  const domInfo = async (backendNodeId, fn = describe) => {
    try {
      const { object } = await cdp.send('DOM.resolveNode', { backendNodeId });
      const r = await cdp.send('Runtime.callFunctionOn', { objectId: object.objectId, functionDeclaration: `function(){ const d=${fn}; return d(this.nodeType===1?this:this.parentElement); }`, returnByValue: true });
      return r.result.value;
    } catch { return '?'; }
  };
  const nameSource = (n) => {
    const s = (n.name?.sources || []).find(s => (s.value?.value ?? '') !== '' && !s.superseded);
    return s ? (s.attribute || s.nativeSource || s.type) : null;
  };
  const links = [];
  const headings = [], landmarks = [];
  const landmarkRoles = new Set(['banner', 'navigation', 'main', 'contentinfo', 'complementary', 'search', 'region', 'form']);
  for (const n of nodes) {
    if (n.ignored) continue;
    const role = n.role?.value, name = (n.name?.value || '').trim();
    const src = nameSource(n);
    if (interactive.has(role)) {
      if (!name) add('FAIL', 'names', '4.1.2', `${role} has no accessible name`, await domInfo(n.backendDOMNodeId));
      else if (src === 'placeholder') add('FAIL', 'names', '3.3.2', `${role} "${name}" is named only by its placeholder (disappears on input)`, await domInfo(n.backendDOMNodeId));
      else if (src === 'title') add('WARN', 'names', '4.1.2', `${role} "${name}" is named only by a title tooltip (not visible on touch/keyboard)`, await domInfo(n.backendDOMNodeId));
      if (name && ['aria-label', 'aria-labelledby'].includes(src) && ['button', 'link', 'menuitem', 'tab', 'checkbox', 'radio', 'switch'].includes(role)) {
        const visible = await domInfo(n.backendDOMNodeId, '(el)=> (el.innerText||"").trim().replace(/\\s+/g," ")');
        const words = (t) => t.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(' ').filter(Boolean);
        const inOrder = (a, b) => { let i = 0; for (const w of b) if (w === a[i]) i++; return i === a.length; };
        if (visible && visible.length > 1 && !inOrder(words(visible), words(name)))
          add('FAIL', 'names', '2.5.3', `Visible label "${visible}" is not part of accessible name "${name}"`, await domInfo(n.backendDOMNodeId));
      }
      if (role === 'link') links.push({ name, href: await domInfo(n.backendDOMNodeId, '(el)=> el.closest("a")?.getAttribute("href")||""'), where: n.backendDOMNodeId });
    }
    if ((role === 'image' || role === 'img') && name) {
      if (/\.(png|jpe?g|gif|svg|webp|avif)$|^(img|image|photo|picture|graphic|icon|logo)[\s_-]?\d*$|^IMG_\d+/i.test(name)) add('FAIL', 'names', '1.1.1', `Image alt looks like a filename or placeholder: "${name}"`, await domInfo(n.backendDOMNodeId));
      else if (/decorative|spacer|divider|swoosh|background/i.test(name)) add('WARN', 'names', '1.1.1', `Image alt "${name}" suggests a decorative image: use alt=""`, await domInfo(n.backendDOMNodeId));
    }
    if (role === 'heading') {
      const level = n.properties?.find(p => p.name === 'level')?.value?.value;
      headings.push({ level, name });
    }
    if (landmarkRoles.has(role) && !(['region', 'form'].includes(role) && !name)) landmarks.push({ role, name });
  }
  // link purpose: same text, different destinations, or generic text
  const byName = {};
  for (const l of links) (byName[l.name.toLowerCase()] ??= new Set()).add(l.href);
  for (const [nm, hrefs] of Object.entries(byName)) {
    if (/^(click here|here|read more|more|learn more|link|details|this)$/i.test(nm)) add('WARN', 'names', '2.4.4', `Generic link text "${nm}" (${hrefs.size} destination(s)) — make it describe the destination`);
    else if (hrefs.size > 1) add('WARN', 'names', '2.4.4', `Link text "${nm}" leads to ${hrefs.size} different destinations: ${[...hrefs].join(', ')}`);
  }
  // ---------- 3. outline ----------
  report.data.headings = headings; report.data.landmarks = landmarks;
  if (!landmarks.some(l => l.role === 'main')) add('FAIL', 'outline', '1.3.1/2.4.1', 'No main landmark');
  const navs = landmarks.filter(l => l.role === 'navigation');
  if (navs.length > 1 && navs.some(n => !n.name)) add('WARN', 'outline', '1.3.1', `${navs.length} navigation landmarks, not all named (aria-label="Primary", "Breadcrumb"…)`);
  if (!headings.some(h => h.level === 1)) add('FAIL', 'outline', '1.3.1', 'No h1');
  let prev = 0;
  for (const h of headings) {
    if (!h.name) add('FAIL', 'outline', '1.3.1/2.4.6', `Empty h${h.level}`);
    if (prev && h.level > prev + 1) add('WARN', 'outline', '1.3.1', `Heading level jumps h${prev} → h${h.level} ("${h.name}")`);
    prev = h.level;
  }
  // text styled like a heading but not one (large+bold short block, not a heading)
  const fakeHeadings = await page.evaluate(() => [...document.querySelectorAll('body div, body p, body span')].filter(el => {
    if (el.closest('h1,h2,h3,h4,h5,h6,[role=heading],button,a,label,th,legend,caption,summary')) return false;
    const t = (el.innerText || '').trim(); if (!t || t.length > 60 || el.children.length > 1) return false;
    const cs = getComputedStyle(el); const body = parseFloat(getComputedStyle(document.body).fontSize);
    return parseFloat(cs.fontSize) >= body * 1.25 && +cs.fontWeight >= 600 && !/^[~<>]?[\d$€£¥%.,\s▲▼+\-−×xKkMmBb]+$/.test(t) && cs.display === 'block';
  }).map(el => el.innerText.trim()));
  for (const t of fakeHeadings) add('WARN', 'outline', '1.3.1', `Looks like a heading but is not marked up as one: "${t}"`);
  const outline = await page.locator('body').ariaSnapshot();
  await writeFile(path.join(outDir, 'aria-snapshot.yml'), outline);

  // ---------- 5. pointer-only interactive elements ----------
  await page.evaluate(() => { let i = 0; for (const el of document.querySelectorAll('body *')) el.setAttribute('data-a11y-i', i++); });
  const candidates = await page.evaluate(() => {
    const native = 'a[href],button,input,select,textarea,summary,label,iframe,[contenteditable=""],[contenteditable=true],video[controls],audio[controls]';
    return [...document.querySelectorAll('body *')].filter(el => !el.matches(native) && !el.closest('button,a[href],label,summary,select')
      && !['svg', 'path', 'circle', 'polyline', 'g', 'script', 'style', 'option'].includes(el.tagName.toLowerCase()))
      .filter(el => el.getClientRects().length > 0) // rendered only
      .slice(0, 4000).map(el => ({ i: el.getAttribute('data-a11y-i'), pointer: getComputedStyle(el).cursor === 'pointer' && getComputedStyle(el.parentElement).cursor !== 'pointer', onclick: el.hasAttribute('onclick'), tabIndex: (el.tagName === 'A' && !el.hasAttribute('href') && !el.hasAttribute('tabindex')) ? -1 : el.tabIndex, role: el.getAttribute('role'), hasControls: !!el.querySelector('a[href],button,input,select,textarea,summary,[tabindex="0"]') }));
  });
  for (const c of candidates) {
    let listeners = [];
    if (!c.onclick && !c.pointer) {
      const { result } = await cdp.send('Runtime.evaluate', { expression: `document.querySelector('[data-a11y-i="${c.i}"]')` });
      const r = await cdp.send('DOMDebugger.getEventListeners', { objectId: result.objectId, depth: 0 });
      listeners = r.listeners.filter(l => ['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart', 'touchend'].includes(l.type));
    }
    if (!(c.onclick || c.pointer || listeners.length)) continue;
    if (c.hasControls) continue; // event delegation on a container of real controls
    const where = await page.evaluate(`(${describe})(document.querySelector('[data-a11y-i="${c.i}"]'))`);
    const signal = c.onclick ? 'onclick' : listeners.length ? `${listeners[0].type} listener` : 'cursor:pointer';
    if (c.tabIndex < 0) add('FAIL', 'pointer', '2.1.1', `Clickable (${signal}) but not keyboard focusable${c.role ? ` (role=${c.role})` : ''}`, where);
    else if (!c.role) add('FAIL', 'pointer', '4.1.2', `Clickable and focusable (${signal}) but has no role — screen readers do not announce it as a control`, where);
  }

  // ---------- 7. targets (2.5.8) ----------
  const small = await page.evaluate(() => {
    const sel = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=link],[role=checkbox],[role=radio],[role=tab],[role=menuitem],[role=switch],[tabindex]:not([tabindex="-1"])';
    const els = [...document.querySelectorAll(sel)].filter(el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden'; });
    const rects = els.map(el => el.getBoundingClientRect());
    const out = [];
    els.forEach((el, i) => {
      const r = rects[i];
      if (r.width >= 24 && r.height >= 24) return;
      // inline exception: a link inside a sentence
      const cs = getComputedStyle(el);
      if (cs.display === 'inline' && el.parentElement && (el.parentElement.innerText || '').trim().length > (el.innerText || '').trim().length + 10) return;
      // spacing exception: a 24px-diameter circle centred on the target must not intersect another target,
      // nor another undersized target's circle (centres ≥ 24px apart); touching is allowed
      const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
      const clash = rects.some((o, j) => {
        if (j === i || els[j].contains(el) || el.contains(els[j])) return false;
        if (Math.hypot(Math.max(o.left - cx, 0, cx - o.right), Math.max(o.top - cy, 0, cy - o.bottom)) < 12) return true;
        return (o.width < 24 || o.height < 24) && Math.hypot((o.x + o.width / 2) - cx, (o.y + o.height / 2) - cy) < 24;
      });
      if (clash) out.push({ w: Math.round(r.width), h: Math.round(r.height), where: el.outerHTML.slice(0, 80) });
    });
    return out;
  });
  for (const s of small) add('FAIL', 'targets', '2.5.8', `Target ${s.w}×${s.h}px with neighbours closer than 24px`, s.where);

  // ---------- 8. non-text contrast of form controls (1.4.11) ----------
  const weak = await page.evaluate(() => {
    // Any CSS colour syntax through a canvas: Tailwind 4 and shadcn compute to oklch(), which a rgb() regex misses.
    const cx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    const parse = c => { if (!c) return null; cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const [r, g, b, a] = cx.getImageData(0, 0, 1, 1).data; return { r, g, b, a: a / 255 }; };
    const lum = ({ r, g, b }) => { const f = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const bgOf = el => { for (let n = el; n; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c && c.a > 0.5) return c; } return { r: 255, g: 255, b: 255, a: 1 }; };
    const out = [];
    for (const el of document.querySelectorAll('input:not([type=hidden]):not([type=radio]):not([type=checkbox]):not([type=submit]):not([type=button]), select, textarea')) {
      const cs = getComputedStyle(el); if (el.getBoundingClientRect().width === 0) continue;
      const own = parse(cs.backgroundColor), outer = bgOf(el.parentElement);
      const border = parse(cs.borderBottomColor), bw = parseFloat(cs.borderBottomWidth);
      const fillRatio = own && own.a > 0.5 ? ratio(own, outer) : 1;
      const borderRatio = bw > 0 && border ? ratio(border, own && own.a > 0.5 ? own : outer) : 1;
      if (fillRatio < 3 && borderRatio < 3) out.push({ where: el.outerHTML.slice(0, 70), border: borderRatio.toFixed(2), fill: fillRatio.toFixed(2) });
    }
    return out;
  });
  for (const w of weak) add('FAIL', 'nontext', '1.4.11', `Field boundary contrast too low (border ${w.border}:1, fill ${w.fill}:1; need 3:1)`, w.where);

  // ---------- 8b. structure heuristics axe does not flag by default ----------
  const struct = await page.evaluate((describeSrc) => {
    const d = eval(describeSrc); const out = [];
    // radio groups outside fieldset / radiogroup
    const groups = {};
    for (const r of document.querySelectorAll('input[type=radio][name]')) (groups[r.name] ??= []).push(r);
    for (const [n, rs] of Object.entries(groups)) if (rs.length > 1 && !rs[0].closest('fieldset,[role=radiogroup],[role=group]')) out.push(['WARN', '1.3.1', `Radio group "${n}" is not in a fieldset with a legend (group question is not announced)`, d(rs[0])]);
    // data tables with no header cells
    for (const t of document.querySelectorAll('table:not([role=presentation]):not([role=none])')) {
      if (t.rows.length >= 2 && (t.rows[0]?.cells.length || 0) >= 2 && !t.querySelector('th,[role=columnheader],[role=rowheader]')) out.push(['FAIL', '1.3.1', `Table (${t.rows.length}×${t.rows[0].cells.length}) has no header cells — use <th scope>`, d(t)]);
      if (t.querySelector('th') && !t.caption && !t.getAttribute('aria-label') && !t.getAttribute('aria-labelledby')) out.push(['INFO', '1.3.1', 'Data table has no caption/accessible name', d(t)]);
    }
    // graphics: svg with drawing content, not hidden, no name, not inside a named control
    for (const g of document.querySelectorAll('svg')) {
      if (g.closest('[aria-hidden=true]') || g.closest('a,button,[role=button],[role=link]')) continue;
      const shapes = g.querySelectorAll('path,polyline,polygon,rect,circle,line,text').length;
      const named = g.getAttribute('aria-label') || g.getAttribute('aria-labelledby') || g.querySelector(':scope > title');
      const r = g.getBoundingClientRect();
      if (shapes && !named && r.width * r.height > 48 * 48) out.push(['WARN', '1.1.1', `SVG graphic (${Math.round(r.width)}×${Math.round(r.height)}, ${shapes} shapes) has no text alternative — role="img" + name, or a data table / text summary for charts`, d(g.parentElement) + ' > svg']);
    }
    // required fields: asterisk in label but no required/aria-required
    for (const el of document.querySelectorAll('input,select,textarea')) {
      const lab = el.labels ? [...el.labels].map(l => l.innerText).join(' ') : '';
      if (/\*/.test(lab) && !el.required && el.getAttribute('aria-required') !== 'true') out.push(['WARN', '3.3.2/1.3.1', `Label "${lab.trim()}" marks the field required with * only — add required and say "(required)" or explain * once`, d(el)]);
    }
    // ARIA menu roles used for site navigation (menus promise arrow keys + one tab stop)
    for (const m of document.querySelectorAll('[role=menu],[role=menubar]')) {
      const items = [...m.querySelectorAll('[role^=menuitem]')];
      const links = items.filter(i => i.matches('a[href]')).length, tabbable = items.filter(i => i.tabIndex >= 0).length;
      if (links && links === items.length) out.push(['WARN', '4.1.2', `role=${m.getAttribute('role')} wraps ${links} ordinary links — site navigation should be <nav><ul> of links; menu roles are for app command menus`, d(m)]);
      if (tabbable > 1) out.push(['FAIL', '2.1.1/4.1.2', `role=${m.getAttribute('role')} has ${tabbable} items in the Tab sequence — APG menus use one tab stop and arrow keys`, d(m)]);
    }
    // password managers and paste (3.3.8)
    for (const el of document.querySelectorAll('input[type=password], input[autocomplete=one-time-code]')) {
      if (el.hasAttribute('onpaste') || el.hasAttribute('oncopy')) out.push(['FAIL', '3.3.8', 'Paste is blocked on a password/code field', d(el)]);
      if (el.getAttribute('autocomplete') === 'off') out.push(['WARN', '3.3.8', 'autocomplete="off" on a password field fights password managers', d(el)]);
    }
    // text already clipped at baseline
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el);
      if (!/(hidden|clip)/.test(cs.overflow + cs.overflowY) || !(el.innerText || '').trim() || el.getBoundingClientRect().width < 2) continue;
      if (el.scrollHeight > el.clientHeight + 2 && el.clientHeight > 0 && !el.matches('.visually-hidden,.sr-only,[class*=visually-hidden]')) out.push(['WARN', '1.4.12', 'Text already clipped by overflow:hidden at default spacing', d(el)]);
    }
    return out;
  }, describe);
  for (const [lvl, sc, msg, where] of struct) add(lvl, 'structure', sc, msg, where);
  // paste listeners registered with addEventListener
  for (const i of await page.evaluate(() => [...document.querySelectorAll('input[type=password]')].map((el, i) => { el.setAttribute('data-a11y-pw', i); return i; }))) {
    const { result } = await cdp.send('Runtime.evaluate', { expression: `document.querySelector('[data-a11y-pw="${i}"]')` });
    const r = await cdp.send('DOMDebugger.getEventListeners', { objectId: result.objectId, depth: 0 });
    if (r.listeners.some(l => l.type === 'paste')) add('WARN', 'structure', '3.3.8', 'Password field has a paste listener — confirm it does not block pasting', `input[type=password] #${i}`);
  }

  // ---------- 9. autocomplete (1.3.5) ----------
  const ac = await page.evaluate(() => {
    const hints = [['name', /\b(full.?name|your.?name|^name$|fname|first.?name|lname|last.?name|surname)\b/i], ['email', /e-?mail/i], ['tel', /phone|tel\b|mobile/i], ['street-address', /address|street/i], ['postal-code', /post.?code|zip/i], ['address-level2', /\bcity|town\b/i], ['country-name', /country/i], ['bday', /birth|dob\b/i], ['organization', /company|organi[sz]ation/i], ['username', /user.?name|login/i], ['current-password / new-password', /password/i], ['cc-number', /card.?number|cc.?num/i]];
    const out = [];
    for (const el of document.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=radio]):not([type=checkbox]):not([type=search]), select, textarea')) {
      const named = [el.name, el.id, el.getAttribute('aria-label'), ...(el.labels ? [...el.labels].map(l => l.innerText) : [])].join(' ').trim();
      const label = named || (el.placeholder || '').replace(/\S+@\S+/g, '');
      const byType = { email: 'email', tel: 'tel', password: 'current-password / new-password' }[el.type];
      const hint = byType ? hints.find(([t]) => t === byType) : hints.find(([, re]) => re.test(label));
      if (hint && !el.getAttribute('autocomplete')) out.push({ token: hint[0], label: (label.trim() || el.placeholder || el.type).slice(0, 50), type: el.type });
      if (hint && hint[0] === 'email' && el.type === 'text') out.push({ typeHint: 'email', label: label.trim().slice(0, 50) });
      if (hint && hint[0] === 'tel' && el.type === 'text') out.push({ typeHint: 'tel', label: label.trim().slice(0, 50) });
    }
    return out;
  });
  for (const a of ac) a.token ? add('WARN', 'autocomplete', '1.3.5', `Field "${a.label}" collects personal data but has no autocomplete (suggest autocomplete="${a.token}")`)
    : add('INFO', 'autocomplete', '—', `Field "${a.label}" should be type="${a.typeHint}" for the right mobile keyboard`);
  await page.context().close();
}

// ---------- 4. keyboard walk ----------
async function keyboardWalk(page, { shots = true, label = 'default', limit = maxTabs } = {}) {
  const stops = [];
  // Smooth scrolling would leave each newly focused element mid-scroll, and "off-screen", when it is measured.
  await page.addStyleTag({ content: 'html, body { scroll-behavior: auto !important; }' });
  await page.mouse.move(0, 0);
  await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
  for (let i = 0; i < limit; i++) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(60);
    // Skip links that slide in and rings that fade in are measured where they end up, not mid-transition.
    await page.evaluate(() => { for (const a of document.getAnimations()) { try { if (a.effect?.getComputedTiming?.().iterations !== Infinity) a.finish(); } catch { /* ignore */ } } });
    const info = await page.evaluate((describeSrc) => {
      const d = eval(describeSrc); let el = document.activeElement; while (el && el.shadowRoot && el.shadowRoot.activeElement) el = el.shadowRoot.activeElement;
      if (!el || el === document.body) return { body: true };
      const r = el.getBoundingClientRect();
      const pts = [[r.left + r.width / 2, r.top + r.height / 2], [r.left + 2, r.top + 2], [r.right - 2, r.top + 2], [r.left + 2, r.bottom - 2], [r.right - 2, r.bottom - 2]];
      let covered = 0, offscreen = 0;
      const root = el.getRootNode(); // works inside shadow DOM too
      const inside = (a, b) => { for (let n = b; n; n = n.parentNode || n.host) if (n === a) return true; return false; };
      for (const [x, y] of pts) {
        if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) { offscreen++; continue; }
        const top = (root.elementFromPoint ? root : document).elementFromPoint(x, y);
        if (top && top !== el && !inside(el, top) && !inside(top, el) && !(el.labels && [...el.labels].some(l => inside(l, top)))) covered++;
      }
      if (!el.dataset.a11yStop) el.dataset.a11yStop = String(Math.random()).slice(2, 10);
      return { key: el.dataset.a11yStop, where: d(el), tag: el.tagName.toLowerCase(), href: el.getAttribute('href'), tabindex: el.getAttribute('tabindex'), rect: { x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height), vy: Math.round(r.y) }, covered, offscreen, iframe: el.tagName === 'IFRAME', focusVisible: el.matches(':focus-visible') };
    }, describe);
    if (info.body) { stops.push({ body: true }); if (stops.filter(s => s.body).length > 1) break; continue; }
    if (stops.length && stops.some(s => s.key === info.key)) { info.repeat = true; stops.push(info); break; }
    if (shots && !info.iframe && info.rect.w > 0 && info.rect.h > 0 && !info.offscreen) {
      const pad = 8;
      const clip = { x: Math.max(0, info.rect.x - pad), y: Math.max(0, info.rect.vy - pad), width: Math.min(W, info.rect.w + pad * 2), height: Math.min(H, info.rect.h + pad * 2) };
      clip.width = Math.min(clip.width, W - clip.x); clip.height = Math.min(clip.height, H - clip.y);
      if (clip.width > 2 && clip.height > 2) {
        const a = await page.screenshot({ clip, animations: 'disabled', caret: 'hide' });
        await page.evaluate(() => { let a = document.activeElement; while (a && a.shadowRoot && a.shadowRoot.activeElement) a = a.shadowRoot.activeElement; window.__a11yEl = a; a.blur(); });
        const b = await page.screenshot({ clip, animations: 'disabled', caret: 'hide' });
        await page.evaluate(() => window.__a11yEl.focus({ preventScroll: true }));
        const d = await pixelDiff(a, b);
        // 2.4.13: indicator area >= a 2 CSS px perimeter; count only the sides that are on screen
        const r = info.rect, top = r.vy - pad >= 0, bottom = r.vy + r.h + pad <= H, left = r.x - pad >= 0, right = r.x + r.w + pad <= W;
        const vw = Math.min(r.w, W), vh = Math.min(r.h, H);
        const perimeterArea = 2 * (vw * (top + bottom) + vh * (left + right));
        info.indicator = { changed: d.changed, changed3: d.changed3, perimeterArea };
      }
    }
    try { info.aria = (await page.locator(':focus').first().ariaSnapshot({ timeout: 1000 })).split('\n')[0].replace(/^- /, '').trim(); } catch { info.aria = '?'; }
    stops.push(info);
  }
  report.data[`tab-${label}`] = stops;
  return stops;
}
{
  const page = await newPage();
  const stops = await keyboardWalk(page, { label: 'forward' });
  const real = stops.filter(s => !s.body && !s.repeat);
  if (!real.length) add('FAIL', 'keyboard', '2.1.1', 'Nothing on the page receives keyboard focus');
  const first = real[0];
  if (first && !(first.tag === 'a' && /^#./.test(first.href || '')) && !/skip/i.test(first.where)) add('WARN', 'keyboard', '2.4.1', `First focus stop is not a skip link (${first.where})`);
  if (first && first.tag === 'a' && /^#./.test(first.href || '') && (first.offscreen || first.rect.w < 2 || (first.indicator && first.indicator.changed === 0)))
    add('FAIL', 'keyboard', '2.4.7', `Skip link never becomes visible on focus (${first.where})`);
  for (const s of real) {
    if (s.offscreen >= 5 || s.rect.w < 2 || s.rect.h < 2) add('FAIL', 'keyboard', '2.4.7', 'Focused element is invisible/off-screen', s.where);
    else if (s.covered >= 5 - s.offscreen && s.covered > 0) add('FAIL', 'keyboard', '2.4.11', 'Focused element fully hidden by other content (sticky/fixed UI?)', s.where);
    else if (s.covered > 0) add('WARN', 'keyboard', '2.4.12', `Focused element partly covered (${s.covered}/5 sample points)`, s.where);
    if (s.indicator) {
      if (s.indicator.changed === 0) add('FAIL', 'keyboard', '2.4.7', 'No visible focus indicator (focused and unfocused pixels identical)', s.where);
      else if (s.indicator.changed3 < 0.8 * s.indicator.perimeterArea) add('WARN', 'keyboard', '2.4.13', `Focus indicator weak: ${s.indicator.changed3}px changed by ≥3:1, a 2px perimeter is ${s.indicator.perimeterArea}px`, s.where);
    }
    if (s.tabindex && +s.tabindex > 0) add('FAIL', 'keyboard', '2.4.3', `Positive tabindex=${s.tabindex} reorders focus`, s.where);
    if (!s.iframe && s.tag !== 'summary') {
      if (s.aria === '') add('FAIL', 'keyboard', '4.1.2', 'Focusable but hidden from assistive technology (aria-hidden ancestor?) — screen readers land on nothing', s.where);
      else if (/^(generic|group|paragraph|text|listitem)\b/.test(s.aria)) add('WARN', 'keyboard', '4.1.2', `Focusable element exposes role "${s.aria.split(' ')[0]}" — no control role`, s.where);
    }
  }
  for (let i = 1; i < real.length; i++) {
    const a = real[i - 1], b = real[i];
    if (b.rect.y < a.rect.y - 150 && Math.abs(b.rect.x - a.rect.x) < 400) add('WARN', 'keyboard', '2.4.3', `Focus jumps back up the page (${a.where} → ${b.where}) — check order matches reading order`);
  }
  const last = stops[stops.length - 1];
  if (!last?.repeat && !last?.body && real.length >= maxTabs) add('INFO', 'keyboard', '—', `Stopped after ${maxTabs} Tab presses without cycling (raise --tabs)`);
  report.data.tabOrder = real.map(s => `${s.aria}  ←  ${s.where}`);
  // reverse walk: sticky headers typically obscure focus when moving backwards
  let rev = 0;
  for (let i = 0; i < Math.min(real.length, maxTabs); i++) {
    await page.keyboard.press('Shift+Tab'); await page.waitForTimeout(40);
    const r = await page.evaluate((describeSrc) => {
      let el = document.activeElement; while (el && el.shadowRoot && el.shadowRoot.activeElement) el = el.shadowRoot.activeElement; if (!el || el === document.body) return null; const d = eval(describeSrc);
      const b = el.getBoundingClientRect(); if (!b.width || !b.height) return null;
      const pts = [[b.left + b.width / 2, b.top + b.height / 2], [b.left + 2, b.top + 2], [b.right - 2, b.bottom - 2]];
      const root = el.getRootNode(); const inside = (a, b) => { for (let n = b; n; n = n.parentNode || n.host) if (n === a) return true; return false; };
      const cov = pts.filter(([x, y]) => { const t = (root.elementFromPoint ? root : document).elementFromPoint(x, y); return t && t !== el && !inside(el, t) && !inside(t, el); }).length;
      return { cov, where: d(el) };
    }, describe);
    if (r && r.cov === 3) { rev++; if (rev <= 5) add('FAIL', 'keyboard', '2.4.11', 'Hidden under other content when reached with Shift+Tab (add scroll-padding-top for sticky headers)', r.where); }
  }
  await page.context().close();
}

// ---------- 4b. unreachable controls (in DOM, visible, but never in the Tab sequence) ----------
{
  const page = await newPage();
  const reached = new Set((report.data['tab-forward'] || []).filter(s => !s.body).map(s => s.where));
  const unreachable = await page.evaluate((describeSrc) => {
    const d = eval(describeSrc);
    const composite = '[role=tablist],[role=menu],[role=menubar],[role=listbox],[role=radiogroup],[role=toolbar],[role=grid],[role=tree],[role=treegrid]';
    return [...document.querySelectorAll('[role=button],[role=link],[role=tab],[role=menuitem],[role=checkbox],[role=switch],[role=radio],[role=option],[role=slider],a:not([href])[onclick]')]
      .filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
      .filter(el => el.tabIndex < 0 && !(el.closest(composite) && [...el.closest(composite).querySelectorAll('*')].some(x => x.tabIndex >= 0 && x.getClientRects().length)))
      .map(el => d(el));
  }, describe);
  for (const u of unreachable) add('FAIL', 'keyboard', '2.1.1', 'Has a widget role but is not in the Tab sequence (and no roving-tabindex sibling is)', u);
  await page.context().close();
}

// ---------- 10. reflow and zoom ----------
for (const [w, h, label] of [[320, 256, '400%'], [640, 512, '200%']]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage(); await open(page, url); await page.waitForTimeout(300);
  const r = await page.evaluate((describeSrc) => {
    const d = eval(describeSrc);
    const vw = document.documentElement.clientWidth;
    const scrollsOwnAxis = el => { for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) { const o = getComputedStyle(n).overflowX; if (o === 'auto' || o === 'scroll') return true; } return false; };
    const off = [...document.querySelectorAll('body *')].filter(el => { const r = el.getBoundingClientRect(); return r.right > vw + 1 && r.width > 0 && getComputedStyle(el).position !== 'fixed' && !scrollsOwnAxis(el); });
    const roots = off.filter(el => !off.includes(el.parentElement)).slice(0, 6).map(el => `${d(el)} (right edge ${Math.round(el.getBoundingClientRect().right)}px)`);
    return { scrollWidth: document.documentElement.scrollWidth, vw, roots };
  }, describe);
  await page.screenshot({ path: path.join(outDir, `reflow-${w}.png`), fullPage: true });
  if (r.scrollWidth > r.vw + 1) {
    const twoD = r.roots.length && r.roots.every(x => /^(table|pre|canvas|svg|iframe)|map/i.test(x));
    add(twoD ? 'WARN' : 'FAIL', 'reflow', w === 320 ? '1.4.10' : '1.4.4', `Horizontal scrolling at ${w}px (${label} zoom of 1280): page is ${r.scrollWidth}px wide${twoD ? ' — only 2-D content overflows (exception), but wrap it in its own scroll container' : ''}`, r.roots.join(' | '));
  }
  report.data[`reflow-${w}`] = r;
  await ctx.close();
}

// ---------- 11. text spacing (1.4.12) ----------
{
  const page = await newPage();
  const clipped = () => page.evaluate((describeSrc) => {
    const d = eval(describeSrc);
    return [...document.querySelectorAll('body *')].filter(el => {
      const cs = getComputedStyle(el); if (!/(hidden|clip)/.test(cs.overflow + cs.overflowX + cs.overflowY) && !(cs.textOverflow === 'ellipsis')) return false;
      if (!(el.innerText || '').trim() || el.getBoundingClientRect().width < 2) return false;
      return el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1;
    }).map(el => (getComputedStyle(el).textOverflow === 'ellipsis' ? '…' : '') + d(el));
  }, describe);
  const before = new Set(await clipped());
  await page.addStyleTag({ content: '*,*::before,*::after{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}' });
  await page.waitForTimeout(200);
  const after = (await clipped()).filter(x => !before.has(x));
  for (const c of after) c.startsWith('…')
    ? add('WARN', 'spacing', '1.4.12', 'Ellipsis truncation hides more text under WCAG text-spacing — confirm the full value is available (tooltip, detail view)', c.slice(1))
    : add('FAIL', 'spacing', '1.4.12', 'Text clipped when WCAG text-spacing is applied (fixed height + overflow hidden?)', c);
  await page.screenshot({ path: path.join(outDir, 'text-spacing.png'), fullPage: true });
  await page.context().close();
}

// ---------- 12. forced colors ----------
{
  const page = await newPage({ forcedColors: 'active', colorScheme: 'dark' });
  await page.screenshot({ path: path.join(outDir, 'forced-colors.png'), fullPage: true });
  const r = await page.evaluate((describeSrc) => {
    const d = eval(describeSrc);
    const out = { noBoundary: [], bgIcons: [], adjustNone: [] };
    for (const el of document.querySelectorAll('button, [role=button], input[type=submit], input[type=button], [role=tab], [role=checkbox], [role=switch]')) {
      const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); if (!r.width) continue;
      const bw = ['Top', 'Right', 'Bottom', 'Left'].reduce((a, s) => a + (cs[`border${s}Style`] !== 'none' ? parseFloat(cs[`border${s}Width`]) : 0), 0);
      if (bw === 0 && !(el.innerText || '').trim()) out.noBoundary.push(d(el) + ' (icon-only, no border)');
      else if (bw === 0 && !el.matches('[role=tab]')) out.noBoundary.push(d(el));
      if (!(el.innerText || '').trim() && !el.querySelector('svg,img') && cs.backgroundImage !== 'none') out.bgIcons.push(d(el));
    }
    for (const el of document.querySelectorAll('body *')) if (getComputedStyle(el).forcedColorAdjust === 'none') out.adjustNone.push(d(el));
    return out;
  }, describe);
  for (const n of r.noBoundary.slice(0, 10)) add('WARN', 'forced', '1.4.11', 'Control has no border in forced-colors mode — its shape disappears (use a transparent border, not only a background)', n);
  for (const n of r.bgIcons) add('FAIL', 'forced', '1.1.1/1.4.11', 'Icon drawn with background-image only; forced colors may hide it and it has no text', n);
  for (const n of r.adjustNone.slice(0, 5)) add('INFO', 'forced', '—', 'forced-color-adjust:none — verify this is deliberate (e.g. chart swatches)', n);
  const fstops = await keyboardWalk(page, { label: 'forced', limit: Math.min(maxTabs, 40) });
  for (const s of fstops.filter(s => s.indicator && s.indicator.changed === 0)) add('FAIL', 'forced', '2.4.7', 'No visible focus in forced-colors mode (box-shadow focus rings are removed — use outline)', s.where);
  await page.context().close();
}

// ---------- 12b. colour-vision screenshots (for visual review of colour-only meaning, 1.4.1) ----------
{
  const page = await newPage();
  const cdp = await page.context().newCDPSession(page);
  for (const type of ['achromatopsia', 'deuteranopia']) {
    await cdp.send('Emulation.setEmulatedVisionDeficiency', { type });
    await page.screenshot({ path: path.join(outDir, `vision-${type}.png`), fullPage: true });
  }
  add('INFO', 'colour', '1.4.1', `Review ${outDir}/vision-achromatopsia.png and forced-colors.png: every status, trend, series, required marker and link must still be distinguishable`);
  await page.context().close();
}

// ---------- 13. motion ----------
{
  const probe = async (reducedMotion) => {
    const page = await newPage({ reducedMotion });
    await page.evaluate(() => {
      window.__mut = new Map(); const t0 = performance.now();
      new MutationObserver(ms => { if (performance.now() - t0 < 2000) return; for (const m of ms) { const el = m.target.nodeType === 1 ? m.target : m.target.parentElement; if (!el) continue; window.__mut.set(el, (window.__mut.get(el) || 0) + 1); } })
        .observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['style', 'class', 'src', 'aria-hidden', 'hidden'] });
    });
    await page.waitForTimeout(6500);
    const r = await page.evaluate((describeSrc) => {
      const d = eval(describeSrc);
      const anims = document.getAnimations().filter(a => a.playState === 'running').map(a => { const t = a.effect?.getTiming?.() || {}; const r = a.effect?.target?.getBoundingClientRect?.() || { width: 0, height: 0 }; return { where: d(a.effect?.target), infinite: t.iterations === Infinity, dur: +t.duration || 0, name: a.animationName || a.constructor.name, small: r.width <= 48 && r.height <= 48 }; });
      const updating = [...window.__mut.entries()].filter(([el, n]) => n >= 1 && el.isConnected && el.getBoundingClientRect().height > 0).map(([el, n]) => ({ where: d(el), n }));
      const smooth = getComputedStyle(document.documentElement).scrollBehavior === 'smooth';
      const video = [...document.querySelectorAll('video[autoplay]')].map(v => d(v));
      return { anims, updating, smooth, video };
    }, describe);
    await page.context().close();
    return r;
  };
  const normal = await probe('no-preference');
  const reduce = await probe('reduce');
  report.data.motion = { normal, reduce };
  for (const a of reduce.anims.filter(a => a.infinite || a.dur > 5000)) add('FAIL', 'motion', '2.3.3/2.2.2', `Animation "${a.name}" keeps running with prefers-reduced-motion: reduce${a.infinite ? ' (infinite)' : ''}`, a.where);
  const stillReduced = new Set(reduce.anims.map(a => a.where));
  for (const a of normal.anims.filter(a => a.infinite && a.dur >= 1000)) {
    const lvl = a.small && !stillReduced.has(a.where) ? 'INFO' : 'WARN';
    add(lvl, 'motion', '2.2.2', `Infinite animation "${a.name}"${a.small ? ' (small indicator)' : ''} — moving content shown >5s beside other content needs pause/stop/hide`, a.where);
  }
  for (const u of normal.updating) add('WARN', 'motion', '2.2.2', `Content changed on its own ${u.n}× in 6.5s — auto-updating content needs a visible pause/stop control (confirm one exists)`, u.where);
  if (reduce.smooth) add('WARN', 'motion', '2.3.3', 'scroll-behavior: smooth not disabled under reduced motion');
  for (const v of reduce.video) add('WARN', 'motion', '2.2.2', 'Autoplaying video — provide pause and respect reduced motion', v);
}

// ---------- summary ----------
report.seconds = +((performance.now() - t0) / 1000).toFixed(1);
await writeFile(path.join(outDir, 'audit.json'), JSON.stringify(report, null, 2));
const order = { FAIL: 0, WARN: 1, INFO: 2 };
findings.sort((a, b) => order[a.level] - order[b.level] || a.section.localeCompare(b.section));
const count = l => findings.filter(f => f.level === l).length;
console.log(`a11y-audit ${url}\n${count('FAIL')} FAIL, ${count('WARN')} WARN, ${count('INFO')} INFO in ${report.seconds}s — details ${path.join(outDir, 'audit.json')}\n`);
// One line per distinct finding; repeats are counted, with the first three places (audit.json has every one).
const groups = new Map();
for (const f of findings) { const k = [f.level, f.section, f.sc, f.msg].join('|'); if (!groups.has(k)) groups.set(k, { ...f, wheres: [] }); if (f.where) groups.get(k).wheres.push(f.where); }
for (const g of groups.values()) {
  const n = g.wheres.length;
  console.log(`${g.level.padEnd(4)} ${g.section.padEnd(12)} ${g.sc.padEnd(12)} ${g.msg}${n > 1 ? ` (×${n})` : ''}${n ? `  ⟶ ${g.wheres.slice(0, 3).join(' · ')}${n > 3 ? ' · …' : ''}` : ''}`);
}
console.log('\nTab order (role "name" ← element):'); (report.data.tabOrder || []).forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}. ${s}`));
console.log('\nHeadings:', report.data.headings.map(h => `h${h.level} ${h.name || '(empty)'}`).join(' · '));
console.log('Landmarks:', report.data.landmarks.map(l => l.role + (l.name ? ` "${l.name}"` : '')).join(' · ') || '(none)');
await browser.close();
process.exitCode = count('FAIL') ? 1 : 0;
