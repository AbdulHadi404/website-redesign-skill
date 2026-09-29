#!/usr/bin/env node
/**
 * a11y-audit.mjs — scripted checks for the things rule engines (axe, htmlcs, IBM) do not see.
 * Run it AFTER axe; it does not repeat axe's rules.
 *
 *   node a11y.mjs <url> [--out dir] [--tabs 80] [--width 1280 --height 720] [--storage seed.json]
 *
 * Browser: resolved like the other scripts (lib/env.mjs) — CHROME_PATH to choose one.
 * Output: <out>/audit.json, <out>/*.png, and a FAIL / WARN / INFO summary on stdout.
 *
 * Only rendered content is audited: elements under `hidden` / display: none, visibility: hidden, a closed <details>
 * or content-visibility: hidden are skipped by every check (the steps of a wizard other than the current one, a
 * closed drawer). Audit those states by opening them: a URL with the step's hash, --storage, or states.mjs.
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
 *             A clickable canvas that is not focusable is a WARN, not a FAIL, when the Tab walk stops on controls
 *             over it that stand in for it: a key on one changes the canvas's own pixels, or they are built as
 *             stand-ins (paint nothing until focused, let the pointer through). Check them against the canvas
 *             contract. A painted control that takes the pointer and changes nothing drawn (a Sound toggle, a
 *             header's Menu button over a hero) does not: the FAIL stays.
 *   canvas    per clickable canvas: controls over it at load, whether a key on one changes the canvas's own
 *             pixels (captured with everything over it made transparent), and whether anything is announced
 *             (live region, ariaNotify, focus on a new control)  [2.1.1 4.1.2 4.1.3]
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
import { createHash } from 'node:crypto';
import path from 'node:path';
import { launch, open, decodeImages } from './lib/env.mjs';

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
const clickableCanvases = []; // { ci: index among the page's canvases, signal, role, where, focusable }
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
// Is the element rendered? Every check that inspects elements asks this first. A wizard's other steps (`hidden`),
// a closed drawer (visibility: hidden), a closed <details> and a content-visibility: hidden panel are not: a finding
// there is about a state the page is not in (and innerText of a display: none element is its whole textContent).
// Opacity 0 does not count as hidden unless a check asks (opacityProperty): an opacity-0 radio under a styled one is
// still the control, and scroll-reveal content at opacity 0 is about to be seen. Content that content-visibility: auto
// skips off screen is rendered. An <option> is as visible as its <select>; display: contents as its parent.
// Visibility that a running animation toggles (a blink: `@keyframes blink { to { visibility: hidden } }`) is not a
// hidden state: the element is on screen for part of every cycle, so a check that samples once must not drop it when
// the sample lands in the off phase. That is decided by where the hiding comes from: the top of the run of
// visibility: hidden ancestors, if one of its running animations animates visibility. A blinking spinner inside a
// closed drawer is still hidden (the drawer is the top of the run).
const shownSrc = `(() => {
  let blinking;
  const animatesVisibility = (a) => { try { return a.playState === 'running' && !!a.effect?.target && a.effect.getKeyframes().some((k) => 'visibility' in k); } catch { return false; } };
  const blinks = (el) => {
    blinking ??= new Set(document.getAnimations().filter(animatesVisibility).map((a) => a.effect.target));
    let top = el;
    while (top.parentElement && getComputedStyle(top.parentElement).visibility === 'hidden') top = top.parentElement;
    return blinking.has(top);
  };
  return function shown(el, o) {
    if (!el || el.nodeType !== 1) return false;
    if (el.matches('option, optgroup')) el = el.closest('select') || el;
    if (!el.checkVisibility) return el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
    const opts = { visibilityProperty: true, ...(o || {}) };
    if (el.checkVisibility(opts)) return true;
    if (opts.visibilityProperty && el.checkVisibility({ ...opts, visibilityProperty: false }) && blinks(el)) return true;
    const cs = getComputedStyle(el);
    return cs.display === 'contents' && cs.visibility !== 'hidden' && !!el.parentElement && shown(el.parentElement, o);
  };
})()`;

// Full-page renders of a page with lazy images show blank squares below the fold unless the images are asked for.
async function loadEverything(page) {
  await page.evaluate(() => document.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.loading = 'eager'; })).catch(() => {});
  await decodeImages(page).catch(() => {});
}

async function newPage(opts = {}, init = null) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, ...opts });
  if (init) await ctx.addInitScript(init);
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
  // getFullAXTree's flat list is not in document order: walk the tree from the root so headings list as they read.
  const byId = new Map(nodes.map(n => [n.nodeId, n]));
  const ordered = [], seenIds = new Set(), stack = [nodes.find(n => !n.parentId) || nodes[0]];
  while (stack.length) {
    const n = stack.pop(); if (!n || seenIds.has(n.nodeId)) continue;
    seenIds.add(n.nodeId); ordered.push(n);
    const kids = (n.childIds || []).map(id => byId.get(id)).filter(Boolean);
    for (let i = kids.length - 1; i >= 0; i--) stack.push(kids[i]);
  }
  for (const n of nodes) if (!seenIds.has(n.nodeId)) ordered.push(n);
  for (const n of ordered) {
    if (n.ignored) continue;
    const role = n.role?.value, name = (n.name?.value || '').trim();
    const src = nameSource(n);
    if (interactive.has(role)) {
      if (!name) add('FAIL', 'names', '4.1.2', `${role} has no accessible name`, await domInfo(n.backendDOMNodeId));
      else if (src === 'placeholder') add('FAIL', 'names', '3.3.2', `${role} "${name}" is named only by its placeholder (disappears on input)`, await domInfo(n.backendDOMNodeId));
      else if (src === 'title') add('WARN', 'names', '4.1.2', `${role} "${name}" is named only by a title tooltip (not visible on touch/keyboard)`, await domInfo(n.backendDOMNodeId));
      if (name && ['aria-label', 'aria-labelledby'].includes(src) && ['button', 'link', 'menuitem', 'tab', 'checkbox', 'radio', 'switch'].includes(role)) {
        // A card link's visible label is its heading (or first line), not every word on the card.
        const visible = await domInfo(n.backendDOMNodeId, '(el)=> { const h = el.querySelector("h1,h2,h3,h4,h5,h6,[role=heading]"); const t = (h ? h.innerText : (el.innerText||"").split("\\n").find((l) => l.trim()) || "").trim(); return t.replace(/\\s+/g," "); }');
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
  const fakeHeadings = await page.evaluate((shownSrc) => { const shown = eval(shownSrc); return [...document.querySelectorAll('body div, body p, body span')].filter(el => {
    if (el.closest('h1,h2,h3,h4,h5,h6,[role=heading],button,a,label,th,legend,caption,summary')) return false;
    const t = (el.innerText || '').trim(); if (!t || t.length > 60 || el.children.length > 1) return false;
    const cs = getComputedStyle(el); const body = parseFloat(getComputedStyle(document.body).fontSize);
    return parseFloat(cs.fontSize) >= body * 1.25 && +cs.fontWeight >= 600 && !/^[~<>]?[\d$€£¥%.,\s▲▼+\-−×xKkMmBb]+$/.test(t) && !(/\d/.test(t) && t.length <= 16 && t.split(/\s+/).length <= 3) && cs.display === 'block' && shown(el);
  }).map(el => el.innerText.trim()); }, shownSrc);
  for (const t of fakeHeadings) add('WARN', 'outline', '1.3.1', `Looks like a heading but is not marked up as one: "${t}"`);
  const outline = await page.locator('body').ariaSnapshot();
  await writeFile(path.join(outDir, 'aria-snapshot.yml'), outline);

  // ---------- 5. pointer-only interactive elements ----------
  await page.evaluate(() => { let i = 0; for (const el of document.querySelectorAll('body *')) el.setAttribute('data-a11y-i', i++); });
  const candidates = await page.evaluate((shownSrc) => {
    const shown = eval(shownSrc);
    const native = 'a[href],button,input,select,textarea,summary,label,iframe,[contenteditable=""],[contenteditable=true],video[controls],audio[controls]';
    // A canvas, or a wrapper that is mostly one canvas (React Three Fiber listens on the canvas's parent): its index
    // among the page's canvases, so the keyboard walk can tell which Tab stops lie over it.
    const canvases = [...document.querySelectorAll('canvas')];
    const canvasOf = (el) => {
      if (el.tagName === 'CANVAS') return canvases.indexOf(el);
      const r = el.getBoundingClientRect(); let best = -1, area = 0;
      for (const c of el.querySelectorAll('canvas')) { const q = c.getBoundingClientRect(); if (q.width * q.height > area) { area = q.width * q.height; best = canvases.indexOf(c); } }
      return best >= 0 && area * 2 >= r.width * r.height ? best : -1;
    };
    return [...document.querySelectorAll('body *')].filter(el => !el.matches(native) && !el.closest('button,a[href],label,summary,select')
      && !['svg', 'path', 'circle', 'polyline', 'g', 'script', 'style', 'option'].includes(el.tagName.toLowerCase()))
      .filter(el => el.getClientRects().length > 0 && shown(el)) // rendered, with a box of its own
      .slice(0, 4000).map(el => ({ i: el.getAttribute('data-a11y-i'), pointer: getComputedStyle(el).cursor === 'pointer' && getComputedStyle(el.parentElement).cursor !== 'pointer', onclick: el.hasAttribute('onclick'), tabIndex: (el.tagName === 'A' && !el.hasAttribute('href') && !el.hasAttribute('tabindex')) ? -1 : el.tabIndex, role: el.getAttribute('role'), hasControls: !!el.querySelector('a[href],button,input,select,textarea,summary,[tabindex="0"]'), canvas: canvases.length ? canvasOf(el) : -1 }));
  }, shownSrc);
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
    // A clickable canvas is judged after the keyboard walk, once per canvas (it and its wrapper may both listen):
    // controls over it may be its stand-ins (section 4), and it has a keyboard path if it or its wrapper is focusable.
    if (c.canvas >= 0) {
      const k = clickableCanvases.find((x) => x.ci === c.canvas);
      if (!k) clickableCanvases.push({ ci: c.canvas, signal, role: c.role, where, focusable: c.tabIndex >= 0 });
      else k.focusable ||= c.tabIndex >= 0;
    }
    if (c.tabIndex < 0) { if (c.canvas < 0) add('FAIL', 'pointer', '2.1.1', `Clickable (${signal}) but not keyboard focusable${c.role ? ` (role=${c.role})` : ''}`, where); }
    else if (!c.role) add('FAIL', 'pointer', '4.1.2', `Clickable and focusable (${signal}) but has no role — screen readers do not announce it as a control`, where);
  }

  // ---------- 7. targets (2.5.8) ----------
  const small = await page.evaluate((shownSrc) => {
    const shown = eval(shownSrc);
    const sel = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=link],[role=checkbox],[role=radio],[role=tab],[role=menuitem],[role=switch],[tabindex]:not([tabindex="-1"])';
    // Not rendered is not a target, nor a neighbour: a closed <details> or content-visibility: hidden panel still
    // reports a layout box for its content, stacked over whatever is on screen.
    const els = [...document.querySelectorAll(sel)].filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && shown(el); });
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
  }, shownSrc);
  for (const s of small) add('FAIL', 'targets', '2.5.8', `Target ${s.w}×${s.h}px with neighbours closer than 24px`, s.where);

  // ---------- 8. non-text contrast of form controls (1.4.11) ----------
  const weak = await page.evaluate((shownSrc) => {
    const shown = eval(shownSrc);
    // Any CSS colour syntax through a canvas: Tailwind 4 and shadcn compute to oklch(), which a rgb() regex misses.
    const cx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    const parse = c => { if (!c) return null; cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const [r, g, b, a] = cx.getImageData(0, 0, 1, 1).data; return { r, g, b, a: a / 255 }; };
    const lum = ({ r, g, b }) => { const f = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const bgOf = el => { for (let n = el; n; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c && c.a > 0.5) return c; } return { r: 255, g: 255, b: 255, a: 1 }; };
    // Fill against what is behind the field, border against the fill (or what is behind); either at 3:1 passes.
    const boundary = (cs, outer) => {
      const own = parse(cs.backgroundColor), border = parse(cs.borderBottomColor), bw = parseFloat(cs.borderBottomWidth);
      return { fill: own && own.a > 0.5 ? ratio(own, outer) : 1, border: bw > 0 && border ? ratio(border, own && own.a > 0.5 ? own : outer) : 1 };
    };
    const out = [];
    for (const el of document.querySelectorAll('input:not([type=hidden]):not([type=radio]):not([type=checkbox]):not([type=submit]):not([type=button]), select, textarea')) {
      if (el.getBoundingClientRect().width === 0 || !shown(el)) continue;
      // A field drawn at opacity 0 under a styled replacement: the replacement's boundary is the one users see.
      if (getComputedStyle(el).opacity === '0') continue;
      let { fill: fillRatio, border: borderRatio } = boundary(getComputedStyle(el), bgOf(el.parentElement));
      // A file input draws no field of its own by default: its button (::file-selector-button, a 2px outset border)
      // is the boundary users see. Either one at 3:1 is enough.
      if (el.type === 'file') {
        const b = boundary(getComputedStyle(el, '::file-selector-button'), bgOf(el));
        if (Math.max(b.fill, b.border) > Math.max(fillRatio, borderRatio)) ({ fill: fillRatio, border: borderRatio } = b);
      }
      if (fillRatio < 3 && borderRatio < 3) out.push({ where: el.outerHTML.slice(0, 70), border: borderRatio.toFixed(2), fill: fillRatio.toFixed(2) });
    }
    return out;
  }, shownSrc);
  for (const w of weak) add('FAIL', 'nontext', '1.4.11', `Field boundary contrast too low (border ${w.border}:1, fill ${w.fill}:1; need 3:1)`, w.where);

  // ---------- 8b. structure heuristics axe does not flag by default ----------
  const struct = await page.evaluate(([describeSrc, shownSrc]) => {
    const d = eval(describeSrc), shown = eval(shownSrc); const out = [];
    // radio groups outside fieldset / radiogroup
    const groups = {};
    for (const r of document.querySelectorAll('input[type=radio][name]')) if (shown(r)) (groups[r.name] ??= []).push(r);
    for (const [n, rs] of Object.entries(groups)) if (rs.length > 1 && !rs[0].closest('fieldset,[role=radiogroup],[role=group]')) out.push(['WARN', '1.3.1', `Radio group "${n}" is not in a fieldset with a legend (group question is not announced)`, d(rs[0])]);
    // data tables with no header cells
    for (const t of document.querySelectorAll('table:not([role=presentation]):not([role=none])')) {
      if (!shown(t)) continue;
      if (t.rows.length >= 2 && (t.rows[0]?.cells.length || 0) >= 2 && !t.querySelector('th,[role=columnheader],[role=rowheader]')) out.push(['FAIL', '1.3.1', `Table (${t.rows.length}×${t.rows[0].cells.length}) has no header cells — use <th scope>`, d(t)]);
      if (t.querySelector('th') && !t.caption && !t.getAttribute('aria-label') && !t.getAttribute('aria-labelledby')) out.push(['INFO', '1.3.1', 'Data table has no caption/accessible name', d(t)]);
    }
    // graphics: svg with drawing content, not hidden, no name, not inside a named control
    for (const g of document.querySelectorAll('svg')) {
      if (g.closest('[aria-hidden=true]') || g.closest('a,button,[role=button],[role=link]') || !shown(g)) continue;
      const shapes = g.querySelectorAll('path,polyline,polygon,rect,circle,line,text').length;
      const named = g.getAttribute('aria-label') || g.getAttribute('aria-labelledby') || g.querySelector(':scope > title');
      const r = g.getBoundingClientRect();
      if (shapes && !named && r.width * r.height > 48 * 48) out.push(['WARN', '1.1.1', `SVG graphic (${Math.round(r.width)}×${Math.round(r.height)}, ${shapes} shapes) has no text alternative — role="img" + name, or a data table / text summary for charts`, d(g.parentElement) + ' > svg']);
    }
    // language of parts (3.1.2): a run in another script with no lang of its own. Arabic-script text on a
    // Latin-script page, and language names in the switcher ("English" on an Arabic page) — proper names and
    // mixed bilingual lockups ("سند · Sanad") are exempt.
    {
      const pageLang = (document.documentElement.lang || '').toLowerCase();
      const body = document.body.innerText || '';
      const rtlPage = pageLang ? /^(ar|fa|ur|ps|ku|sd|ug)\b/.test(pageLang) : (body.match(/[\u0600-\u06FF]/g) || []).length * 2 > (body.match(/[A-Za-z]/g) || []).length;
      const LANG_NAMES = /^(english|français|francais|español|espanol|deutsch|italiano|português|portugues|türkçe|nederlands|русский|中文|日本語|한국어)$/i;
      const seen = new Set();
      for (const el of document.querySelectorAll('a, button, span, p, li, label, option, h1, h2, h3, h4, td, th, div')) {
        const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.data).join(' ').replace(/\s+/g, ' ').trim();
        if (!own || seen.has(own) || el.closest('[lang]') !== document.documentElement && el.closest('[lang]')) continue;
        const arabicRun = /[\u0600-\u06FF]{2,}/.test(own) && !/[A-Za-z]{3,}/.test(own);
        if (((!rtlPage && arabicRun) || (rtlPage && LANG_NAMES.test(own))) && shown(el)) {
          seen.add(own);
          out.push(['WARN', '3.1.2', `"${own.slice(0, 40)}" is in another language than the page (${pageLang || 'no lang'}) and has no lang attribute — screen readers read it with the wrong voice`, d(el)]);
          if (seen.size >= 6) break;
        }
      }
    }
    // id references that point at nothing. aria-controls is left out: libraries (Radix and others) point it at
    // a popup that exists only while open.
    const missing = (el, attr) => (el.getAttribute(attr) || '').split(/\s+/).filter((id) => id && !document.getElementById(id));
    for (const el of document.querySelectorAll('[aria-labelledby]')) {
      const gone = missing(el, 'aria-labelledby');
      if (!gone.length || !shown(el)) continue;
      const all = gone.length === el.getAttribute('aria-labelledby').trim().split(/\s+/).length;
      const other = el.getAttribute('aria-label') || (el.innerText || '').trim() || el.getAttribute('title');
      out.push([all && !other ? 'FAIL' : 'WARN', '4.1.2', `aria-labelledby points at missing id${gone.length > 1 ? 's' : ''} ${gone.map((i) => `#${i}`).join(' ')}${all && !other ? ' — the element has no name' : ''}`, d(el)]);
    }
    for (const attr of ['aria-describedby', 'aria-errormessage', 'aria-activedescendant']) {
      for (const el of document.querySelectorAll(`[${attr}]`)) {
        const gone = missing(el, attr);
        if (gone.length && shown(el)) out.push(['WARN', attr === 'aria-activedescendant' ? '4.1.2' : '1.3.1', `${attr} points at missing id${gone.length > 1 ? 's' : ''} ${gone.map((i) => `#${i}`).join(' ')} — ${attr === 'aria-activedescendant' ? 'the active option is never announced' : 'that hint or error is never announced'}`, d(el)]);
      }
    }
    for (const l of document.querySelectorAll('label[for]')) {
      const t = document.getElementById(l.htmlFor);
      if (!t && !l.querySelector('input,select,textarea') && shown(l)) out.push(['WARN', '1.3.1', `<label for="${l.htmlFor}"> labels nothing (no element with that id)`, d(l)]);
    }
    // required fields: asterisk in label but no required/aria-required
    for (const el of document.querySelectorAll('input,select,textarea')) {
      if (!shown(el)) continue;
      const lab = el.labels ? [...el.labels].map(l => l.innerText).join(' ') : '';
      if (/\*/.test(lab) && !el.required && el.getAttribute('aria-required') !== 'true') out.push(['WARN', '3.3.2/1.3.1', `Label "${lab.trim()}" marks the field required with * only — add required and say "(required)" or explain * once`, d(el)]);
    }
    // ARIA menu roles used for site navigation (menus promise arrow keys + one tab stop)
    for (const m of document.querySelectorAll('[role=menu],[role=menubar]')) {
      if (!shown(m)) continue;
      // A closed submenu's items are not in the Tab sequence, whatever their tabIndex says.
      const items = [...m.querySelectorAll('[role^=menuitem]')].filter(i => shown(i));
      const links = items.filter(i => i.matches('a[href]')).length, tabbable = items.filter(i => i.tabIndex >= 0).length;
      if (links && links === items.length) out.push(['WARN', '4.1.2', `role=${m.getAttribute('role')} wraps ${links} ordinary links — site navigation should be <nav><ul> of links; menu roles are for app command menus`, d(m)]);
      if (tabbable > 1) out.push(['FAIL', '2.1.1/4.1.2', `role=${m.getAttribute('role')} has ${tabbable} items in the Tab sequence — APG menus use one tab stop and arrow keys`, d(m)]);
    }
    // password managers and paste (3.3.8)
    for (const el of document.querySelectorAll('input[type=password], input[autocomplete=one-time-code]')) {
      if (!shown(el)) continue;
      if (el.hasAttribute('onpaste') || el.hasAttribute('oncopy')) out.push(['FAIL', '3.3.8', 'Paste is blocked on a password/code field', d(el)]);
      if (el.getAttribute('autocomplete') === 'off') out.push(['WARN', '3.3.8', 'autocomplete="off" on a password field fights password managers', d(el)]);
    }
    // text already clipped at baseline
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el);
      if (!/(hidden|clip)/.test(cs.overflow + cs.overflowY) || !(el.innerText || '').trim() || el.getBoundingClientRect().width < 2 || !shown(el)) continue;
      if (el.scrollHeight > el.clientHeight + 2 && el.clientHeight > 0 && !el.matches('.visually-hidden,.sr-only,[class*=visually-hidden]')) out.push(['WARN', '1.4.12', 'Text already clipped by overflow:hidden at default spacing', d(el)]);
    }
    return out;
  }, [describe, shownSrc]);
  for (const [lvl, sc, msg, where] of struct) add(lvl, 'structure', sc, msg, where);
  // paste listeners registered with addEventListener
  for (const i of await page.evaluate((shownSrc) => { const shown = eval(shownSrc); return [...document.querySelectorAll('input[type=password]')].filter((el) => shown(el)).map((el, i) => { el.setAttribute('data-a11y-pw', i); return i; }); }, shownSrc)) {
    const { result } = await cdp.send('Runtime.evaluate', { expression: `document.querySelector('[data-a11y-pw="${i}"]')` });
    const r = await cdp.send('DOMDebugger.getEventListeners', { objectId: result.objectId, depth: 0 });
    if (r.listeners.some(l => l.type === 'paste')) add('WARN', 'structure', '3.3.8', 'Password field has a paste listener — confirm it does not block pasting', `input[type=password] #${i}`);
  }

  // ---------- 9. autocomplete (1.3.5) ----------
  const ac = await page.evaluate((shownSrc) => {
    const shown = eval(shownSrc);
    // [token, label pattern, a <select> can take it]. A select's options are the site's own list: autofill fills one
    // only from a value it can match to an option (a country, a town, a birth date), never a name, a phone number or
    // a street address — a select of street names takes no token, and a select is matched against those tokens only
    // (a country select whose label also says "address" is still a country). Addresses that are not postal (proof of
    // address, an IP, web or wallet address) are not street-address, and neither is "address" as the group a part
    // belongs to (Rails address[city], Shopify checkout[shipping_address][country], GOV.UK address-postcode): the
    // part names the field.
    const hints = [['name', /\b(full.?name|your.?name|^name$|fname|first.?name|lname|last.?name|surname)\b/i], ['email', /e-?mail/i], ['tel', /phone|tel\b|mobile/i],
      ['address-line1', /address[\s_-]*(line[\s_-]*)?1\b/i], ['address-line2', /address[\s_-]*(line[\s_-]*)?2\b/i],
      ['street-address', /(?<!(?:^|[^a-z])(?:proof[\s_-]*of|e-?mail|ip|web(?:site)?|mac|wallet|url)[\s_-]*)address(?![\s_\[\]-]*(?:line|level|city|town|post|zip|country|county|state|region|province|suburb|district|\d))|street/i], ['postal-code', /post.?code|zip/i],
      ['address-level2', /\bcity|town\b/i, true], ['country-name', /country/i, true], ['bday', /birth|dob\b/i, true], ['organization', /company|organi[sz]ation/i],
      ['username', /user.?name|login/i], ['current-password / new-password', /password/i], ['cc-number', /card.?number|cc.?num/i]];
    // Input types the autocomplete attribute does not apply to (HTML: file, buttons, checkboxes and radios), or that
    // never hold personal data.
    const noToken = new Set(['hidden', 'submit', 'button', 'reset', 'image', 'file', 'radio', 'checkbox', 'search', 'range', 'color']);
    const out = [];
    for (const el of document.querySelectorAll('input, select, textarea')) {
      if ((el.tagName === 'INPUT' && noToken.has(el.type)) || !shown(el)) continue;
      const named = [el.name, el.id, el.getAttribute('aria-label'), ...(el.labels ? [...el.labels].map(l => l.innerText) : [])].join(' ').trim();
      const label = named || (el.placeholder || '').replace(/\S+@\S+/g, '');
      const byType = { email: 'email', tel: 'tel', password: 'current-password / new-password' }[el.type];
      const hint = byType ? hints.find(([t]) => t === byType) : hints.find(([, re, sel]) => (el.tagName !== 'SELECT' || sel) && re.test(label));
      if (hint && !el.getAttribute('autocomplete')) out.push({ token: hint[0], label: (label.trim() || el.placeholder || el.type).slice(0, 50), type: el.type });
      if (hint && hint[0] === 'email' && el.type === 'text') out.push({ typeHint: 'email', label: label.trim().slice(0, 50) });
      if (hint && hint[0] === 'tel' && el.type === 'text') out.push({ typeHint: 'tel', label: label.trim().slice(0, 50) });
    }
    return out;
  }, shownSrc);
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
      // Sample inside the box, not at its corners: rounded corners are outside the hit-test shape.
      const at = (fx, fy) => [r.left + r.width * fx, r.top + r.height * fy];
      const pts = [at(0.5, 0.5), at(0.2, 0.25), at(0.8, 0.25), at(0.2, 0.75), at(0.8, 0.75)];
      let covered = 0, offscreen = 0;
      const root = el.getRootNode(); // works inside shadow DOM too
      const inside = (a, b) => { for (let n = b; n; n = n.parentNode || n.host) if (n === a) return true; return false; };
      // Stand-ins over a canvas take pointer-events: none so that the canvas keeps its drag; elementFromPoint then
      // sees through them to the canvas, and they read as hidden under it. Hit-test the focused element as if it
      // took the pointer (paint order is unchanged), then put its style attribute back as it was.
      const passThrough = getComputedStyle(el).pointerEvents === 'none', style = el.getAttribute('style');
      if (passThrough) el.style.setProperty('pointer-events', 'auto', 'important');
      try {
        for (const [x, y] of pts) {
          if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) { offscreen++; continue; }
          const top = (root.elementFromPoint ? root : document).elementFromPoint(x, y);
          if (top && top !== el && !inside(el, top) && !inside(top, el) && !(el.labels && [...el.labels].some(l => inside(l, top)))) covered++;
        }
      } finally { if (passThrough) { if (style === null) el.removeAttribute('style'); else el.setAttribute('style', style); } }
      // Which canvases the stop lies over (its centre in the canvas's box), and whether it is a control that could
      // stand in for something drawn there: not a link, a text field, an iframe or the canvas itself.
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const overCanvas = [...document.querySelectorAll('canvas')].flatMap((c, i) => { const b = c.getBoundingClientRect(); return c !== el && b.width * b.height > 0 && cx >= b.left && cx <= b.right && cy >= b.top && cy <= b.bottom ? [i] : []; });
      const role = (el.getAttribute('role') || '').toLowerCase(), type = (el.getAttribute('type') || '').toLowerCase(), tag = el.tagName.toLowerCase();
      const standIn = overCanvas.length > 0 && !(((tag === 'a' || tag === 'area') && el.hasAttribute('href')) || role === 'link' || tag === 'iframe' || tag === 'canvas' || tag === 'textarea' || el.isContentEditable
        || role === 'textbox' || role === 'searchbox' || (tag === 'input' && /^(|text|email|search|password|tel|url|date|time|datetime-local|month|week)$/.test(type)));
      if (!el.dataset.a11yStop) el.dataset.a11yStop = String(Math.random()).slice(2, 10);
      return { key: el.dataset.a11yStop, where: d(el), tag, href: el.getAttribute('href'), tabindex: el.getAttribute('tabindex'), rect: { x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height), vy: Math.round(r.y) }, covered, offscreen, iframe: el.tagName === 'IFRAME', focusVisible: el.matches(':focus-visible'), ...(passThrough ? { passThrough } : {}), ...(overCanvas.length ? { overCanvas, standIn } : {}) };
    }, describe);
    if (info.body) { stops.push({ body: true }); if (stops.filter(s => s.body).length > 1) break; continue; }
    if (stops.length && stops.some(s => s.key === info.key)) { info.repeat = true; stops.push(info); break; }
    if (shots && !info.iframe && info.rect.w > 0 && info.rect.h > 0 && !info.offscreen) {
      const pad = 8;
      // Tab scrolls an element that was partly out of view only until its box is in, so it can end flush with the
      // bottom edge. A focus bar under the box (or an outline outside it) is then below the viewport, the diff never
      // sees it, and a strong indicator reads as weak. Measure with the element scrolled to the middle of the
      // viewport, then put every scroll back where Tab left it: the walk goes on (and 2.4.11 is judged) as users get it.
      let box = info.rect, scrolled = false, recentred = false;
      const cut = box.vy - pad < 0 || box.vy + box.h + pad > H || box.x - pad < 0 || box.x + box.w + pad > W;
      if (cut && box.h + pad * 2 <= H && box.w + pad * 2 <= W) {
        const moved = await page.evaluate(() => {
          let el = document.activeElement; while (el && el.shadowRoot && el.shadowRoot.activeElement) el = el.shadowRoot.activeElement;
          const saved = [];
          for (let n = el.parentElement || el.getRootNode().host; n; n = n.parentElement || n.getRootNode().host) saved.push([n, n.scrollLeft, n.scrollTop]);
          window.__a11yScroll = { saved, x: scrollX, y: scrollY };
          el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
          const q = el.getBoundingClientRect();
          return { x: Math.round(q.x), vy: Math.round(q.y), w: Math.round(q.width), h: Math.round(q.height) };
        }).catch(() => null);
        if (moved) { scrolled = true; recentred = moved.vy !== box.vy || moved.x !== box.x; box = moved; }
      }
      const clip = { x: Math.max(0, box.x - pad), y: Math.max(0, box.vy - pad), width: Math.min(W, box.w + pad * 2), height: Math.min(H, box.h + pad * 2) };
      clip.width = Math.min(clip.width, W - clip.x); clip.height = Math.min(clip.height, H - clip.y);
      if (clip.width > 2 && clip.height > 2) {
        const a = await page.screenshot({ clip, animations: 'disabled', caret: 'hide' });
        await page.evaluate(() => { let a = document.activeElement; while (a && a.shadowRoot && a.shadowRoot.activeElement) a = a.shadowRoot.activeElement; window.__a11yEl = a; a.blur(); });
        const b = await page.screenshot({ clip, animations: 'disabled', caret: 'hide' });
        await page.evaluate(() => window.__a11yEl.focus({ preventScroll: true }));
        let d = await pixelDiff(a, b);
        let r = box;
        // A ring drawn on an ancestor (a card styled with :has(a:focus-visible) or :focus-within) falls outside the
        // element's own box: find the ancestor whose outline/shadow/border changes with focus and measure there.
        const host = await page.evaluate(() => {
          const el = window.__a11yEl, style = (n) => { const c = getComputedStyle(n); return [c.outlineStyle, c.outlineWidth, c.outlineColor, c.boxShadow, c.borderColor, c.backgroundColor].join('|'); };
          const chain = []; for (let n = el.parentElement, i = 0; n && n !== document.body && i < 4; n = n.parentElement, i++) chain.push([n, style(n)]);
          el.blur();
          const changed = chain.find(([n, s]) => style(n) !== s);
          el.focus({ preventScroll: true });
          if (!changed) return null;
          const q = changed[0].getBoundingClientRect();
          return { x: Math.round(q.x), vy: Math.round(q.y), w: Math.round(q.width), h: Math.round(q.height) };
        }).catch(() => null);
        if (host && host.w > r.w) {
          const c2 = { x: Math.max(0, host.x - pad), y: Math.max(0, host.vy - pad), width: Math.min(W, host.w + pad * 2), height: Math.min(H, host.h + pad * 2) };
          c2.width = Math.min(c2.width, W - c2.x); c2.height = Math.min(c2.height, H - c2.y);
          if (c2.width > 2 && c2.height > 2) {
            const a2 = await page.screenshot({ clip: c2, animations: 'disabled', caret: 'hide' });
            await page.evaluate(() => window.__a11yEl.blur());
            const b2 = await page.screenshot({ clip: c2, animations: 'disabled', caret: 'hide' });
            await page.evaluate(() => window.__a11yEl.focus({ preventScroll: true }));
            const d2 = await pixelDiff(a2, b2);
            if (d2.changed3 > d.changed3) { d = d2; r = { ...host, y: host.vy }; info.ringOn = 'ancestor'; }
          }
        }
        // 2.4.13: indicator area >= a 2 CSS px perimeter; count only the sides that are on screen
        const top = r.vy - pad >= 0, bottom = r.vy + r.h + pad <= H, left = r.x - pad >= 0, right = r.x + r.w + pad <= W;
        const vw = Math.min(r.w, W), vh = Math.min(r.h, H);
        const perimeterArea = 2 * (vw * (top + bottom) + vh * (left + right));
        info.indicator = { changed: d.changed, changed3: d.changed3, perimeterArea, ...(recentred ? { recentred: true } : {}) };
      }
      if (scrolled) await page.evaluate(() => {
        const s = window.__a11yScroll; if (!s) return;
        for (const [n, left, top] of s.saved) n.scrollTo({ left, top, behavior: 'instant' });
        window.scrollTo({ left: s.x, top: s.y, behavior: 'instant' });
      }).catch(() => {});
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
    // Only within one column: moving from the end of a left column to the top of the right one is reading order.
    const sameColumn = b.rect.x < a.rect.x + a.rect.w && b.rect.x + b.rect.w > a.rect.x;
    if (b.rect.y < a.rect.y - 150 && sameColumn) add('WARN', 'keyboard', '2.4.3', `Focus jumps back up the page (${a.where} → ${b.where}) — check order matches reading order`);
  }
  const last = stops[stops.length - 1];
  const walkCut = !last?.repeat && !last?.body && real.length >= maxTabs;
  if (walkCut) add('INFO', 'keyboard', '—', `Stopped after ${maxTabs} Tab presses without cycling (raise --tabs)`);
  report.data.tabOrder = real.map(s => `${s.aria}  ←  ${s.where}`);
  // A clickable canvas that is not focusable (section 5): Tab stops on controls over it may be its stand-ins, the
  // keyboard path of an accessible canvas. With none it FAILs here; with some, section 5b decides, because a control
  // over a canvas is not always a stand-in for it (a game's Sound toggle, a header's Menu button over a full-screen
  // hero).
  for (const k of clickableCanvases) {
    if (k.focusable) continue;
    k.standIns = real.filter(s => s.standIn && s.overCanvas.includes(k.ci));
    if (!k.standIns.length) add('FAIL', 'pointer', '2.1.1', `Clickable (${k.signal}) but not keyboard focusable${k.role ? ` (role=${k.role})` : ''}${walkCut ? ` — and no Tab stop over it in the first ${maxTabs} (raise --tabs)` : ''}`, k.where);
  }
  // reverse walk: sticky headers typically obscure focus when moving backwards
  let rev = 0;
  for (let i = 0; i < Math.min(real.length, maxTabs); i++) {
    await page.keyboard.press('Shift+Tab'); await page.waitForTimeout(40);
    const r = await page.evaluate((describeSrc) => {
      let el = document.activeElement; while (el && el.shadowRoot && el.shadowRoot.activeElement) el = el.shadowRoot.activeElement; if (!el || el === document.body) return null; const d = eval(describeSrc);
      const b = el.getBoundingClientRect(); if (!b.width || !b.height) return null;
      const pts = [[b.left + b.width / 2, b.top + b.height / 2], [b.left + b.width * 0.2, b.top + b.height * 0.25], [b.left + b.width * 0.8, b.top + b.height * 0.75]];
      const root = el.getRootNode(); const inside = (a, b) => { for (let n = b; n; n = n.parentNode || n.host) if (n === a) return true; return false; };
      // As in the forward walk: a pointer-events: none stand-in is hit-tested as if it took the pointer.
      const passThrough = getComputedStyle(el).pointerEvents === 'none', style = el.getAttribute('style');
      if (passThrough) el.style.setProperty('pointer-events', 'auto', 'important');
      try {
        const cov = pts.filter(([x, y]) => { const t = (root.elementFromPoint ? root : document).elementFromPoint(x, y); return t && t !== el && !inside(el, t) && !inside(t, el); }).length;
        return { cov, where: d(el) };
      } finally { if (passThrough) { if (style === null) el.removeAttribute('style'); else el.setAttribute('style', style); } }
    }, describe);
    if (r && r.cov === 3) { rev++; if (rev <= 5) add('FAIL', 'keyboard', '2.4.11', 'Hidden under other content when reached with Shift+Tab (add scroll-padding-top for sticky headers)', r.where); }
  }
  await page.context().close();
}

// ---------- 4b. unreachable controls (in DOM, visible, but never in the Tab sequence) ----------
{
  const page = await newPage();
  const reached = new Set((report.data['tab-forward'] || []).filter(s => !s.body).map(s => s.where));
  const unreachable = await page.evaluate(([describeSrc, shownSrc]) => {
    const d = eval(describeSrc), shown = eval(shownSrc);
    const composite = '[role=tablist],[role=menu],[role=menubar],[role=listbox],[role=radiogroup],[role=toolbar],[role=grid],[role=tree],[role=treegrid]';
    return [...document.querySelectorAll('[role=button],[role=link],[role=tab],[role=menuitem],[role=checkbox],[role=switch],[role=radio],[role=option],[role=slider],a:not([href])[onclick]')]
      .filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && shown(el); })
      .filter(el => el.tabIndex < 0 && !(el.closest(composite) && [...el.closest(composite).querySelectorAll('*')].some(x => x.tabIndex >= 0 && x.getClientRects().length)))
      .map(el => d(el));
  }, [describe, shownSrc]);
  for (const u of unreachable) add('FAIL', 'keyboard', '2.1.1', 'Has a widget role but is not in the Tab sequence (and no roving-tabindex sibling is)', u);
  await page.context().close();
}

// ---------- 5b. clickable canvases: stand-ins at load, a key that changes the canvas, narration ----------
// Reduced from the S6 lab's canvas probe (research/stage2/experiments/S6-interactive-experiences/lib/probe-canvas.mjs)
// to what can be judged without false alarms. On a fresh page, before any input: the controls over each clickable
// canvas (stand-ins must exist from load: screen-reader browse mode and voice control never press Tab first), and
// whether each is built as a stand-in (it paints nothing until focused, or lets the pointer through). Then, on up to
// four of them (or the canvas itself when it takes focus), one key at a time: did the canvas's own pixels change, and
// was the change announced (live-region text, ariaNotify, a pressed/checked/value change, or focus on a new named
// control)? Keys go only to widgets, never to links; navigations and requests other than GET, HEAD and OPTIONS are
// aborted, so nothing is posted (a GET that has side effects is not stopped). A canvas that changes by itself is not
// judged by its pixels. Proof that one key works, not that every task does: walk the tasks by hand.
// It also settles the pointer finding for a canvas that takes no focus but has Tab stops over it (section 4): they
// may be its stand-ins (WARN, to check against the canvas contract) when a key on one changes the canvas or they are
// built as stand-ins. A painted control that takes the pointer and changes nothing drawn (a game's Sound toggle, a
// header's Menu button over a hero) is the page's, not the canvas's: the FAIL stays.
if (clickableCanvases.length) {
  const spy = () => {
    window.__a11yNotify = [];
    for (const proto of [window.Element?.prototype, window.Document?.prototype]) {
      const orig = proto?.ariaNotify;
      if (typeof orig === 'function') proto.ariaNotify = function (msg, ...rest) { window.__a11yNotify.push(String(msg)); return orig.call(this, msg, ...rest); };
    }
  };
  const page = await newPage({}, spy);
  page.on('dialog', (d) => d.dismiss().catch(() => {}));
  // One element's own pixels: for the capture, everything else is made transparent except its ancestors (their boxes
  // lie behind it). A compositor capture, so WebGL counts; and a menu that opens over the canvas, a toggle's new icon
  // or a focus ring is not read as the canvas changing. `own: false` hides the element too: what is there without it.
  const ISOLATE = 'body *:not(:has([data-a11y-leaf])):not([data-a11y-leaf]):not([data-a11y-leaf] *):not(#a11y-x#a11y-x), :has([data-a11y-leaf])::before, :has([data-a11y-leaf])::after, ::backdrop, [data-a11y-leaf=off] { opacity: 0 !important; transition: none !important; }';
  const isolated = async (sel, own = true) => {
    const clip = await page.evaluate(([sel, own, css]) => {
      const el = document.querySelector(sel); if (!el) return null;
      const r = el.getBoundingClientRect();
      const x = Math.max(0, r.left), y = Math.max(0, r.top), width = Math.min(r.right, innerWidth) - x, height = Math.min(r.bottom, innerHeight) - y;
      if (width < 2 || height < 2) return null;
      el.setAttribute('data-a11y-leaf', own ? '' : 'off');
      const s = document.createElement('style'); s.id = 'a11y-isolate'; s.textContent = css; (document.head || document.documentElement).append(s);
      return { x, y, width, height };
    }, [sel, own, ISOLATE]).catch(() => null);
    if (!clip) return null;
    const png = await page.screenshot({ clip, animations: 'disabled', caret: 'hide' }).catch(() => null);
    await page.evaluate(() => { document.getElementById('a11y-isolate')?.remove(); for (const n of document.querySelectorAll('[data-a11y-leaf]')) n.removeAttribute('data-a11y-leaf'); }).catch(() => {});
    return png ? createHash('sha1').update(png).digest('hex') : null;
  };
  const shot = (ci) => isolated(`[data-a11y-canvas="${ci}"]`);
  // In the page: the live-region text, the ariaNotify count, the scroll position, and the focused element against
  // the one a key was pressed on (window.__a11yTarget) and the elements that existed before (window.__a11yOld).
  const state = (before) => {
    let a = document.activeElement; while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement;
    const nameOf = (e) => (e?.getAttribute('aria-label') || (e?.getAttribute('aria-labelledby') || '').split(/\s+/).map((id) => document.getElementById(id)?.textContent || '').join(' ') || e?.textContent || e?.getAttribute('title') || e?.value || '').trim().replace(/\s+/g, ' ').slice(0, 100);
    const live = [...document.querySelectorAll('[role=status],[role=alert],[role=log],output,[aria-live]')].filter((e) => e.getAttribute('aria-live') !== 'off').map((e) => e.textContent.trim().replace(/\s+/g, ' '));
    const out = { live, notify: window.__a11yNotify?.length || 0, lastNotify: window.__a11yNotify?.at?.(-1) || '', sx: scrollX, sy: scrollY, same: a === window.__a11yTarget, isNew: !!a && a !== document.body && !!window.__a11yOld && !window.__a11yOld.has(a), name: nameOf(a),
      state: a ? ['aria-pressed', 'aria-checked', 'aria-selected', 'aria-expanded', 'aria-valuenow', 'aria-valuetext'].map((x) => a.getAttribute(x)).concat([a.checked, a.value]).join('|') : '' };
    if (before) window.__a11yOld = new WeakSet(document.querySelectorAll('*'));
    return out;
  };
  const KEYS = { button: ['Enter', 'ArrowRight'], checkbox: ['Space'], radio: ['ArrowDown'], slider: ['ArrowRight'], combobox: ['ArrowDown'], canvas: ['ArrowRight', 'Enter', 'Space'] };
  const contract = 'check them against the canvas contract (accessibility.md, "Canvas, WebGL and game-like interaction"): present from load, named, a key for every pointer action, outcomes announced';
  // The pointer finding for a canvas that takes no focus but has Tab stops over it. ev: { acts: a key on a Tab stop
  // over it changed the canvas, built: why the Tab stops over it look like stand-ins, painted: they were found to
  // paint, keys: the keys tried (none: not tested), animated: the canvas changes by itself }.
  const pointerVerdict = (k, ev) => {
    const names = `${k.standIns.slice(0, 3).map((s) => s.aria).join(', ')}${k.standIns.length > 3 ? ', …' : ''}`, n = k.standIns.length;
    const built = [...new Set([...(k.standIns.some((s) => s.passThrough) ? ['let the pointer through'] : []), ...ev.built])];
    const keys = ev.keys?.length ? ev.keys.join(', ') : '';
    if (ev.acts) add('WARN', 'pointer', '2.1.1', `Clickable canvas (${k.signal}) is not focusable; ${n} Tab stop(s) over it may be its stand-ins (${names}): ${ev.acts} changes the canvas — ${contract}`, k.where);
    else if (built.length) add('WARN', 'pointer', '2.1.1', `Clickable canvas (${k.signal}) is not focusable; ${n} Tab stop(s) over it may be its stand-ins (${names}): built as stand-ins (${built.join(', ')})${ev.animated ? '; the canvas changes by itself, so no key could be shown to change it' : keys ? `, though no key tried on them (${keys}) changed the canvas` : ''} — ${contract}`, k.where);
    else add('FAIL', 'pointer', '2.1.1', `Clickable (${k.signal}) but not keyboard focusable${k.role ? ` (role=${k.role})` : ''} — the ${n} Tab stop(s) over it (${names}) show no sign of standing in for it: they ${ev.painted ? 'are painted and ' : ''}take the pointer${ev.animated ? ', and the canvas changes by itself, so no key could be shown to change it' : keys ? `, and no key tried on them (${keys}) changed the canvas` : '; no key could be tried on them on a fresh page'}`, k.where);
    k.decided = true;
  };
  report.data.canvas = [];
  try {
    // Keys press real buttons. Navigations of the page and every request that is not a GET, HEAD or OPTIONS (a POST
    // from "Add to basket" over a product viewer) are aborted while they are tested.
    await page.route('**/*', (route) => { const q = route.request(); return (q.isNavigationRequest() && q.frame() === page.mainFrame()) || !/^(GET|HEAD|OPTIONS)$/.test(q.method()) ? route.abort('aborted') : route.continue(); });
    for (const k of clickableCanvases) {
      // The controls over the canvas now, before any key; tagged so the key test can focus them.
      const load = await page.evaluate(([ci, shownSrc]) => {
        const shown = eval(shownSrc);
        const c = document.querySelectorAll('canvas')[ci]; if (!c) return null;
        c.setAttribute('data-a11y-canvas', ci);
        c.scrollIntoView({ block: c.getBoundingClientRect().height > innerHeight ? 'start' : 'center', behavior: 'instant' });
        const b = c.getBoundingClientRect();
        const widgets = 'button, input:not([type=hidden]), select, summary, [role=button], [role=checkbox], [role=radio], [role=switch], [role=slider], [role=spinbutton], [role=option], [role=gridcell], [role=treeitem], [role=menuitem], [role=menuitemcheckbox], [role=menuitemradio], [role=tab]';
        const kind = (e) => { const role = e.getAttribute('role') || '', t = (e.getAttribute('type') || '').toLowerCase();
          return (e.matches('input') && t === 'checkbox') || /^(checkbox|switch|menuitemcheckbox)$/.test(role) ? 'checkbox' : (e.matches('input') && t === 'radio') || /^(radio|menuitemradio)$/.test(role) ? 'radio'
            : (e.matches('input') && /^(range|number)$/.test(t)) || /^(slider|spinbutton)$/.test(role) ? 'slider' : e.matches('select') ? 'combobox' : 'button'; };
        const out = [];
        for (const e of document.querySelectorAll(`${widgets}, [tabindex]`)) {
          if (e === c || e.disabled || e.closest('[inert]') || (!e.matches(widgets) && e.tabIndex < 0)) continue;
          if (e.matches('a[href], [role=link], iframe, textarea, [role=textbox], [role=searchbox], canvas') || e.isContentEditable
            || (e.matches('input') && /^(|text|email|search|password|tel|url|date|time|datetime-local|month|week)$/.test((e.getAttribute('type') || '').toLowerCase()))) continue;
          const fallback = c.contains(e); // focusable fallback content is a keyboard path of its own
          const r = e.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
          if (!fallback && (!shown(e) || x < b.left || x > b.right || y < b.top || y > b.bottom)) continue;
          e.setAttribute('data-a11y-standin', `${ci}-${out.length}`);
          out.push({ id: `${ci}-${out.length}`, kind: kind(e), name: (e.getAttribute('aria-label') || e.textContent || e.value || '').trim().replace(/\s+/g, ' ').slice(0, 60), tabbable: e.tabIndex >= 0,
            fallback, passThrough: getComputedStyle(e).pointerEvents === 'none' });
        }
        // The canvas (or its same-size wrapper) when it takes focus itself.
        let self = null;
        for (let e = c, i = 0; e && e !== document.body && i < 4; e = e.parentElement, i++) {
          const r = e.getBoundingClientRect();
          if (r.width * r.height > 2 * b.width * b.height + 1) break;
          if (e.tabIndex >= 0) { self = e; break; }
        }
        if (self) self.setAttribute('data-a11y-standin', `${ci}-self`);
        return { standIns: out, self: !!self };
      }, [k.ci, shownSrc]).catch(() => null);
      if (!load) continue;
      const r = { where: k.where, atLoad: load.standIns.length, tabbableAtLoad: load.standIns.filter((s) => s.tabbable).length, walked: (k.standIns || []).length, tried: [], path: null };
      // Built as a stand-in, judged before anything has focus: it paints nothing (its own pixels, alone, equal the
      // page's without it: transparent text, background and border over a box of its own), or it lets the pointer
      // through, or it is the canvas's fallback content. A Sound toggle or a Menu button is painted and takes the
      // pointer. A header that a script fades in after load is not transparent: while a control's opacity is below 1,
      // wait (up to 2.5 s). CSS animations and transitions are finished by the capture itself.
      const judged = load.standIns.filter((s) => s.tabbable).slice(0, 8);
      const opacities = () => page.evaluate((ids) => ids.map((id) => { let o = 1; for (let e = document.querySelector(`[data-a11y-standin="${id}"]`); e; e = e.parentElement) o *= +getComputedStyle(e).opacity; return Math.round(o * 100); }), judged.map((s) => s.id)).catch(() => []);
      for (let i = 0; i < 5 && (await opacities()).some((v) => v < 99); i++) await page.waitForTimeout(500);
      for (const s of judged) {
        const sel = `[data-a11y-standin="${s.id}"]`;
        await page.evaluate((sel) => document.querySelector(sel)?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' }), sel).catch(() => {});
        const a = await isolated(sel), b = a && await isolated(sel, false);
        s.paintsNothing = a ? a === b : null; // null: no box of its own on screen to capture
        s.built = s.fallback ? 'fallback content' : s.paintsNothing ? 'paint nothing until focused' : s.passThrough ? 'let the pointer through' : '';
      }
      await page.evaluate((ci) => { const c = document.querySelector(`[data-a11y-canvas="${ci}"]`); c?.scrollIntoView({ block: c.getBoundingClientRect().height > innerHeight ? 'start' : 'center', behavior: 'instant' }); }, k.ci).catch(() => {});
      const label = (s) => `${s.kind} "${s.name}"`;
      const tabbable = load.standIns.filter((s) => s.tabbable);
      const candidates = [...tabbable.filter((s) => s.built), ...tabbable.filter((s) => !s.built), ...load.standIns.filter((s) => !s.tabbable)].slice(0, 4).map((s) => ({ ...s, label: label(s) }));
      if (load.self) candidates.push({ id: `${k.ci}-self`, kind: 'canvas', label: 'the canvas itself', tabbable: true });
      // A canvas that changes with no input (an animated scene) cannot use its pixels as evidence.
      const base = new Set();
      if (candidates.length) for (let i = 0; i < 4; i++) { base.add(await shot(k.ci)); await page.waitForTimeout(120); }
      r.selfAnimating = base.size > 1;
      // One key at a time until one changes the canvas; a key that only toggles or renames its own control (a Sound
      // toggle) is noted, and the next control is tried.
      let first = null;
      for (const s of candidates) {
        for (const key of KEYS[s.kind]) {
          const focused = await page.evaluate((id) => {
            const e = document.querySelector(`[data-a11y-standin="${id}"]`); if (!e?.isConnected) return false;
            e.focus({ preventScroll: true, focusVisible: true });
            let a = document.activeElement; while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement;
            window.__a11yTarget = e; return a === e;
          }, s.id).catch(() => false);
          if (!focused) break;
          await page.waitForTimeout(150); // what focusing draws (a selection ring) belongs to the "before"
          const before = await page.evaluate(state, true);
          const h0 = r.selfAnimating ? null : await shot(k.ci);
          await page.keyboard.press(key);
          await page.waitForTimeout(500);
          // A key the page does not handle may scroll it (Space, arrows): put the scroll back so the capture compares
          // the same part of the canvas.
          await page.evaluate(([x, y]) => { if (scrollX !== x || scrollY !== y) window.scrollTo({ left: x, top: y, behavior: 'instant' }); }, [before.sx, before.sy]).catch(() => {});
          const h1 = r.selfAnimating ? null : await shot(k.ci);
          const after = await page.evaluate(state, false).catch(() => null);
          if (!after) break;
          const said = after.live.find((t, i) => t && t !== before.live[i]) || (after.notify > before.notify ? after.lastNotify || '(ariaNotify)' : '');
          const pixels = h0 && h1 ? h0 !== h1 : null;
          const newFocus = after.isNew && !after.same, stateChanged = after.same && after.state !== before.state, nameChanged = after.same && after.name !== before.name;
          // A pixel change counts when focus stayed, or moved to a control the key created; focus moving along a
          // toolbar can redraw the canvas too (its highlight), and is navigation, not a response.
          const acts = !!pixels && (after.same || newFocus);
          const narrated = !!said || stateChanged || (newFocus && !!after.name);
          const t = { control: s.label, key, pixels, said, stateChanged, nameChanged, newFocus: newFocus ? after.name : '' };
          r.tried.push(t);
          if (acts) { r.path = { ...t, narrated, acts, tabbable: !!s.tabbable }; break; }
          if (said || stateChanged || nameChanged) { first ||= { ...t, narrated }; break; }
        }
        if (r.path) break;
      }
      r.path ||= first;
      report.data.canvas.push(r);
      const p = r.path;
      const loadTxt = `${r.atLoad} control(s) over it at load${r.atLoad ? ` (${r.tabbableAtLoad} in the Tab order)` : ''}${load.self ? ', and it takes focus itself' : ''}`;
      const how = p ? `${p.key} on ${p.control}: ${p.pixels === null ? 'the canvas changes by itself, so its pixels prove nothing' : p.pixels ? 'the canvas changed' : 'the canvas did not change'}${p.stateChanged ? ', the control\'s state changed' : p.nameChanged ? ', the control was renamed' : ''}; announced: ${p.said ? `"${p.said.slice(0, 90)}"` : p.newFocus ? `focus moved to the new "${p.newFocus.slice(0, 60)}"` : p.stateChanged ? 'the state change' : 'nothing'}`
        : candidates.length ? `no key tried (${[...new Set(r.tried.map((t) => t.key))].join(', ')} on ${new Set(r.tried.map((t) => t.control)).size} control(s)) changed it or was announced — walk its tasks by hand` : 'no keyboard path to test';
      add('INFO', 'canvas', '—', `Clickable canvas: ${loadTxt}; ${how}`, k.where);
      if (p && !p.narrated) add('WARN', 'canvas', '4.1.3', `${p.key} on ${p.control} ${p.pixels ? 'changes the canvas' : 'renames the control'} but nothing is announced (no live-region text, ariaNotify, state change or focus on a new control) — say the outcome in a role="status" region that exists from load`, k.where);
      if (!r.atLoad && !load.self && r.walked) add('WARN', 'canvas', '4.1.2', `No controls over the canvas at load, but the Tab walk found ${r.walked}: stand-ins must exist from load (screen-reader browse mode and voice control never press Tab first)`, k.where);
      if (!k.focusable && k.standIns?.length) {
        const tabbableTried = new Set(candidates.filter((s) => s.tabbable).map((s) => s.label));
        r.pointer = { acts: p?.acts && p.tabbable ? `${p.key} on ${p.control}` : '', built: [...new Set(tabbable.map((s) => s.built).filter(Boolean))],
          painted: tabbable.some((s) => s.paintsNothing === false), keys: [...new Set(r.tried.filter((t) => tabbableTried.has(t.control)).map((t) => t.key))], animated: r.selfAnimating };
        pointerVerdict(k, r.pointer);
      }
    }
  } catch (e) {
    add('INFO', 'canvas', '—', `Canvas test stopped: ${String(e.message || e).split('\n')[0].slice(0, 120)}`);
  } finally {
    // Not tested (the canvas was not there on a fresh page, or the test broke): judged on what the walk saw.
    for (const k of clickableCanvases) if (!k.focusable && k.standIns?.length && !k.decided) pointerVerdict(k, { acts: '', built: [], painted: false, keys: [], animated: false });
    await page.unroute('**/*').catch(() => {});
    await page.context().close();
  }
}

// ---------- 10. reflow and zoom ----------
for (const [w, h, label] of [[320, 256, '400%'], [640, 512, '200%']]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage(); await open(page, url); await page.waitForTimeout(300);
  const r = await page.evaluate(([describeSrc, shownSrc]) => {
    const d = eval(describeSrc), shown = eval(shownSrc);
    const vw = document.documentElement.clientWidth;
    const scrollsOwnAxis = el => { for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) { const o = getComputedStyle(n).overflowX; if (o === 'auto' || o === 'scroll') return true; } return false; };
    // What widens the page: any laid-out box, visibility: hidden included (it still takes room), but not the content of
    // a closed <details> or content-visibility: hidden panel, which reports a box that takes none.
    const off = [...document.querySelectorAll('body *')].filter(el => { const r = el.getBoundingClientRect(); return r.right > vw + 1 && r.width > 0 && getComputedStyle(el).position !== 'fixed' && !scrollsOwnAxis(el) && shown(el, { visibilityProperty: false }); });
    const roots = off.filter(el => !off.includes(el.parentElement)).slice(0, 6).map(el => `${d(el)} (right edge ${Math.round(el.getBoundingClientRect().right)}px)`);
    // Content that does not scroll but is cut off: an ancestor with overflow hidden/clip (not a scroller) hides
    // more than half of it. Reflow passes on scroll width alone while a table loses six of eight columns.
    const cut = { controls: [], text: [] };
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width <= 2 || r.height <= 2) continue;
      const control = el.matches('a[href],button,input,select,textarea,[role=button],[tabindex="0"]');
      const ownText = [...el.childNodes].some(n => n.nodeType === 3 && n.data.trim().length > 1);
      if ((!control && !ownText) || !shown(el)) continue;
      let x0 = r.left, x1 = r.right, y0 = r.top, y1 = r.bottom, by = null;
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        const cs = getComputedStyle(a);
        if (cs.position === 'fixed') break;
        const hx = /hidden|clip/.test(cs.overflowX), hy = /hidden|clip/.test(cs.overflowY);
        if (!hx && !hy) continue;
        const ar = a.getBoundingClientRect();
        if (ar.width <= 2 || ar.height <= 2) { by = null; x0 = x1; break; } // the visually-hidden pattern
        if (hx) { x0 = Math.max(x0, ar.left); x1 = Math.min(x1, ar.right); }
        if (hy) { y0 = Math.max(y0, ar.top); y1 = Math.min(y1, ar.bottom); }
        by = by || a;
      }
      const area = Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
      if (by && area < r.width * r.height * 0.5) (control ? cut.controls : cut.text).push({ el: d(el), by: d(by) });
    }
    const parentsOnly = list => list.filter((x, i) => !list.slice(0, i).some(y => y.by === x.by && y.el === x.el));
    return { scrollWidth: document.documentElement.scrollWidth, vw, roots, cutControls: parentsOnly(cut.controls).slice(0, 6), cutText: cut.text.length, cutTextBy: [...new Set(cut.text.map(x => x.by))].slice(0, 3) };
  }, [describe, shownSrc]);
  await page.screenshot({ path: path.join(outDir, `reflow-${w}.png`), fullPage: true });
  if (r.scrollWidth > r.vw + 1) {
    const twoD = r.roots.length && r.roots.every(x => /^(table|pre|canvas|svg|iframe)|map/i.test(x));
    add(twoD ? 'WARN' : 'FAIL', 'reflow', w === 320 ? '1.4.10' : '1.4.4', `Horizontal scrolling at ${w}px (${label} zoom of 1280): page is ${r.scrollWidth}px wide${twoD ? ' — only 2-D content overflows (exception), but wrap it in its own scroll container' : ''}`, r.roots.join(' | '));
  }
  if (r.cutControls.length) add('FAIL', 'reflow', w === 320 ? '1.4.10' : '1.4.4', `${r.cutControls.length} control(s) cut off at ${w}px by overflow hidden — not reachable by scrolling`, r.cutControls.map(x => `${x.el} in ${x.by}`).join(' | '));
  if (r.cutText) add(r.cutText >= 10 ? 'FAIL' : 'WARN', 'reflow', w === 320 ? '1.4.10' : '1.4.4', `${r.cutText} text element(s) cut off at ${w}px by overflow hidden (not a scroller)`, r.cutTextBy.join(' | '));
  report.data[`reflow-${w}`] = r;
  await ctx.close();
}

// ---------- 11. text spacing (1.4.12) ----------
{
  const page = await newPage();
  const clipped = () => page.evaluate(([describeSrc, shownSrc]) => {
    const d = eval(describeSrc), shown = eval(shownSrc);
    return [...document.querySelectorAll('body *')].filter(el => {
      const cs = getComputedStyle(el); if (!/(hidden|clip)/.test(cs.overflow + cs.overflowX + cs.overflowY) && !(cs.textOverflow === 'ellipsis')) return false;
      if (!(el.innerText || '').trim() || el.getBoundingClientRect().width < 2 || !shown(el)) return false;
      return el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1;
    }).map(el => (getComputedStyle(el).textOverflow === 'ellipsis' ? '…' : '') + d(el));
  }, [describe, shownSrc]);
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
  await loadEverything(page);
  await page.screenshot({ path: path.join(outDir, 'forced-colors.png'), fullPage: true });
  const r = await page.evaluate(([describeSrc, shownSrc]) => {
    const d = eval(describeSrc), shown = eval(shownSrc);
    const out = { noBoundary: [], bgIcons: [], adjustNone: [] };
    for (const el of document.querySelectorAll('button, [role=button], input[type=submit], input[type=button], [role=tab], [role=checkbox], [role=switch]')) {
      const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); if (!r.width || !shown(el)) continue;
      const bw = ['Top', 'Right', 'Bottom', 'Left'].reduce((a, s) => a + (cs[`border${s}Style`] !== 'none' ? parseFloat(cs[`border${s}Width`]) : 0), 0);
      if (bw === 0 && !(el.innerText || '').trim()) out.noBoundary.push(d(el) + ' (icon-only, no border)');
      else if (bw === 0 && !el.matches('[role=tab]')) out.noBoundary.push(d(el));
      if (!(el.innerText || '').trim() && !el.querySelector('svg,img') && cs.backgroundImage !== 'none') out.bgIcons.push(d(el));
    }
    for (const el of document.querySelectorAll('body *')) if (getComputedStyle(el).forcedColorAdjust === 'none' && shown(el)) out.adjustNone.push(d(el));
    return out;
  }, [describe, shownSrc]);
  for (const n of r.noBoundary.slice(0, 10)) add('WARN', 'forced', '1.4.11', 'Control has no border in forced-colors mode — its shape disappears (use a transparent border, not only a background)', n);
  for (const n of r.bgIcons) add('FAIL', 'forced', '1.1.1/1.4.11', 'Icon drawn with background-image only; forced colors may hide it and it has no text', n);
  for (const n of r.adjustNone.slice(0, 5)) add('INFO', 'forced', '—', 'forced-color-adjust:none — verify this is deliberate (e.g. chart swatches)', n);
  const fstops = await keyboardWalk(page, { label: 'forced', limit: Math.min(maxTabs, 40) });
  for (const s of fstops.filter(s => s.indicator && s.indicator.changed === 0)) add('FAIL', 'forced', '2.4.7', 'No visible focus in forced-colors mode (box-shadow rings are removed there and `outline: none` leaves nothing — draw focus with an outline, transparent in normal mode if the design uses a ring)', s.where);
  await page.context().close();
}

// ---------- 12b. colour-vision screenshots (for visual review of colour-only meaning, 1.4.1) ----------
{
  const page = await newPage();
  await loadEverything(page);
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
    // Whether an updating element is on screen is noted at each change, not only at the end: a script that flashes a
    // status (shown for 150ms, hidden again) is hidden at most sampling moments.
    await page.evaluate((shownSrc) => {
      const shown = eval(shownSrc);
      window.__mut = new Map(); window.__seen = new WeakSet(); const t0 = performance.now();
      new MutationObserver(ms => { if (performance.now() - t0 < 2000) return; for (const m of ms) { const el = m.target.nodeType === 1 ? m.target : m.target.parentElement; if (!el) continue; window.__mut.set(el, (window.__mut.get(el) || 0) + 1); if (!window.__seen.has(el) && shown(el)) window.__seen.add(el); } })
        .observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['style', 'class', 'src', 'aria-hidden', 'hidden'] });
    }, shownSrc);
    await page.waitForTimeout(6500);
    const r = await page.evaluate(([describeSrc, shownSrc]) => {
      const d = eval(describeSrc), shown = eval(shownSrc);
      // Motion nobody can see (a spinner in a closed drawer) is not a finding; motion that starts at opacity 0 may be,
      // and a blink sampled in its off phase is (shown() counts visibility that an animation toggles as shown).
      // `key` matches an animation across the two probes: `where` quotes innerText, which is empty in a blink's off phase.
      const key = (el) => el ? [el.tagName, el.id, el.getAttribute('class'), (el.textContent || '').trim().slice(0, 40)].join('|') : '';
      const anims = document.getAnimations().filter(a => a.playState === 'running' && (!a.effect?.target || shown(a.effect.target))).map(a => { const t = a.effect?.getTiming?.() || {}; const r = a.effect?.target?.getBoundingClientRect?.() || { width: 0, height: 0 }; return { where: d(a.effect?.target), key: key(a.effect?.target), infinite: t.iterations === Infinity, dur: +t.duration || 0, name: a.animationName || a.constructor.name, small: r.width <= 48 && r.height <= 48 }; });
      const updating = [...window.__mut.entries()].filter(([el, n]) => n >= 1 && el.isConnected && el.getBoundingClientRect().height > 0 && (window.__seen.has(el) || shown(el))).map(([el, n]) => ({ where: d(el), n }));
      const smooth = getComputedStyle(document.documentElement).scrollBehavior === 'smooth';
      const video = [...document.querySelectorAll('video[autoplay]')].filter(v => shown(v)).map(v => d(v));
      return { anims, updating, smooth, video };
    }, [describe, shownSrc]);
    await page.context().close();
    return r;
  };
  const normal = await probe('no-preference');
  const reduce = await probe('reduce');
  report.data.motion = { normal, reduce };
  for (const a of reduce.anims.filter(a => a.infinite || a.dur > 5000)) add('FAIL', 'motion', '2.3.3/2.2.2', `Animation "${a.name}" keeps running with prefers-reduced-motion: reduce${a.infinite ? ' (infinite)' : ''}`, a.where);
  const stillReduced = new Set(reduce.anims.map(a => a.key));
  for (const a of normal.anims.filter(a => a.infinite && a.dur >= 1000)) {
    const lvl = a.small && !stillReduced.has(a.key) ? 'INFO' : 'WARN';
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
