#!/usr/bin/env node
/**
 * probe-canvas.mjs (v2) — check every large <canvas> (2D or WebGL) on a page for the
 * failures axe and a11y.mjs cannot see: a pointer-operated canvas with no keyboard
 * path, changes that are not narrated, animation that ignores reduced motion.
 *
 *   node lib/probe-canvas.mjs <url> [--reduce] [--viewport 1280x900]
 *
 * v2 fixes the five false results found in review (run-probe.mjs replays them):
 *   pixels     hashed from a compositor screenshot clipped to the canvas, not toDataURL,
 *              so WebGL with the default preserveDrawingBuffer: false is seen
 *   geometry   the canvas rect is re-read with every focus stop (the page scrolls)
 *   Tab walk   continues until an element repeats (a cycle), not a fixed 60 stops
 *   keys       pressed only on widgets (button, checkbox, radio, slider, select, a
 *              focusable canvas), never on links; main-frame navigations are aborted
 *   listeners  counted on the canvas, on same-size wrappers (R3F's event source) and in
 *              React props; body/document/window listeners are reported separately
 *   baseline   a no-input hash series first: a canvas that animates by itself cannot use
 *              pixel change as evidence, so only narration or a state change counts
 *
 * What a PASS means: a pointer-operated canvas has at least one keyboard path that
 * visibly changes it, and the change is narrated. It is a gate, not proof that every
 * task works: walk the top tasks by keyboard as well (accessibility.md §9b).
 */
import { createHash } from 'node:crypto';

const DOWN = /^(pointerdown|pointerup|mousedown|mouseup|touchstart|touchend|click|dblclick)$/;
const HOVER = /^(pointermove|mousemove|pointerover|mouseover|pointerenter|mouseenter)$/;
const KEYS = {
  button: ['Enter', 'ArrowRight', 'ArrowUp'], // stand-ins for objects often move with arrows
  checkbox: ['Space'], radio: ['ArrowDown', 'ArrowRight'], slider: ['ArrowRight', 'ArrowUp'],
  combobox: ['ArrowDown'], canvas: ['ArrowRight', 'ArrowUp', 'Space', 'Enter'],
};
const RANK = { PASS: 0, INFO: 0, WARN: 1, FAIL: 2, ERROR: 3 };

// Runs in the page: tag every focus stop with an id, classify it, read its rect and every canvas rect.
const PAGE_HELPERS = () => {
  if (window.__probe) return;
  const P = window.__probe = { ids: new WeakMap(), els: [], notify: [] };
  P.idOf = (e) => { if (!P.ids.has(e)) { P.ids.set(e, P.els.length); P.els.push(e); } return P.ids.get(e); };
  P.deepActive = () => { let e = document.activeElement; while (e?.shadowRoot?.activeElement) e = e.shadowRoot.activeElement; return e; };
  P.kind = (e) => {
    const role = (e.getAttribute('role') || '').toLowerCase(), t = (e.getAttribute('type') || '').toLowerCase(), tag = e.tagName.toLowerCase();
    if (tag === 'canvas' || e.querySelector?.(':scope > canvas')) return 'canvas';
    if ((tag === 'a' || tag === 'area') && e.hasAttribute('href') || role === 'link') return 'link';
    if (tag === 'iframe') return 'iframe';
    if (tag === 'textarea' || e.isContentEditable || role === 'textbox' || role === 'searchbox' || (tag === 'input' && /^(|text|email|search|password|tel|url|date|time|datetime-local|month|week)$/.test(t))) return 'text';
    if ((tag === 'input' && t === 'checkbox') || role === 'checkbox' || role === 'switch') return 'checkbox';
    if ((tag === 'input' && t === 'radio') || role === 'radio' || role === 'menuitemradio') return 'radio';
    if ((tag === 'input' && (t === 'range' || t === 'number')) || role === 'slider' || role === 'spinbutton' || role === 'scrollbar') return 'slider';
    if (tag === 'select' || role === 'combobox' || role === 'listbox') return 'combobox';
    return 'button'; // button, summary, [role=button|tab|menuitem|option|gridcell|treeitem], or a focusable div
  };
  P.stop = () => {
    const e = P.deepActive();
    if (!e || e === document.body || e === document.documentElement) return null;
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    const name = (e.getAttribute('aria-label') || e.textContent || e.title || e.value || '').trim().replace(/\s+/g, ' ').slice(0, 80);
    const state = [e.getAttribute('aria-pressed'), e.getAttribute('aria-checked'), e.getAttribute('aria-valuenow'), e.checked, e.value].join('|');
    const canvases = [...document.querySelectorAll('canvas')].map((c) => { const b = c.getBoundingClientRect(); return [b.x, b.y, b.width, b.height]; });
    return { id: P.idOf(e), kind: P.kind(e), name, state, x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height, pointerEvents: cs.pointerEvents, canvases };
  };
  P.live = () => [...document.querySelectorAll('[role=status],[role=alert],[role=log],output,[aria-live]')]
    .filter((e) => e.getAttribute('aria-live') !== 'off').map((e) => e.textContent.trim()).join(' | ');
  for (const proto of [window.Element?.prototype, window.Document?.prototype]) {
    if (proto && typeof proto.ariaNotify === 'function' && !proto.ariaNotify.__probe) {
      const orig = proto.ariaNotify;
      proto.ariaNotify = function (msg, ...rest) { P.notify.push(String(msg)); return orig.call(this, msg, ...rest); };
      proto.ariaNotify.__probe = true;
    }
  }
  let raf = 0; const origRaf = window.requestAnimationFrame;
  window.requestAnimationFrame = function (fn) { raf++; return origRaf.call(window, fn); };
  P.rafCount = () => raf;
};

const sha = (buf) => createHash('sha1').update(buf).digest('hex').slice(0, 16);

export async function probeCanvas(page, { reduce = false, maxStops = 1500, maxWidgets = 10 } = {}) {
  const cdp = await page.context().newCDPSession(page);
  const startUrl = page.url();
  const out = [];
  const navigated = () => page.url().split('#')[0] !== startUrl.split('#')[0];
  await page.evaluate(PAGE_HELPERS);
  const all = await page.$$('canvas');
  const targets = [];
  for (const [ci, handle] of all.entries()) {
    const size = await handle.evaluate((c) => [c.offsetWidth, c.offsetHeight, getComputedStyle(c).visibility, getComputedStyle(c).display]);
    if (size[0] * size[1] < 40000 || size[2] === 'hidden' || size[3] === 'none') continue;
    targets.push({ ci, handle });
  }
  if (!targets.length) { await cdp.detach(); return out; }

  // Pixels: a compositor screenshot (CDP) clipped to the canvas box, in page coordinates read at capture
  // time. It sees WebGL drawn with the default preserveDrawingBuffer: false, which toDataURL does not.
  const hash = async (ci) => {
    try {
      const clip = await page.evaluate((i) => {
        const c = document.querySelectorAll('canvas')[i]; let r = c.getBoundingClientRect();
        if (r.top < 0 || r.bottom > innerHeight || r.left < 0 || r.right > innerWidth) { c.scrollIntoView({ block: 'nearest', inline: 'nearest' }); r = c.getBoundingClientRect(); }
        const x = Math.max(0, r.x), y = Math.max(0, r.y);
        return { x: x + scrollX, y: y + scrollY, width: Math.max(1, Math.min(r.right, innerWidth) - x), height: Math.max(1, Math.min(r.bottom, innerHeight) - y), scale: 1 };
      }, ci);
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', clip });
      return sha(Buffer.from(data, 'base64'));
    } catch (e) { return 'err:' + e.message.slice(0, 40); }
  };
  // At least `min` captures, however slow they are (a heavy WebGL page under SwiftShader: seconds each).
  const series = async (ci, ms, min = 5) => { const seen = new Set(); const t0 = Date.now(); let n = 0; do { seen.add(await hash(ci)); n++; } while (Date.now() - t0 < ms || n < min); return { distinct: seen.size, captures: n, ms: Date.now() - t0 }; };

  // Per canvas: listeners, exposure, a no-input baseline.
  for (const t of targets) {
    const { result: cObj } = await cdp.send('Runtime.evaluate', { expression: `document.querySelectorAll('canvas')[${t.ci}]` });
    // Playwright's own injected script registers window listeners (pointerdown, click, …) after the first
    // element action; drop every listener from the script that registers its marker event.
    const raw = async (objectId) => (await cdp.send('DOMDebugger.getEventListeners', { objectId })).listeners;
    const { result: winObj } = await cdp.send('Runtime.evaluate', { expression: 'window' });
    const tool = new Set((await raw(winObj.objectId)).filter((l) => l.type.startsWith('__playwright')).map((l) => l.scriptId));
    const listenersOf = async (objectId) => (await raw(objectId)).filter((l) => !tool.has(l.scriptId)).map((l) => l.type);
    const own = await listenersOf(cObj.objectId);
    // same-size wrappers (≤ 2× the canvas area), stopping at body: R3F attaches its events to the parent div
    const wrappers = [];
    for (let k = 1; k < 8; k++) {
      const { result } = await cdp.send('Runtime.evaluate', { expression: `(() => { const c = document.querySelectorAll('canvas')[${t.ci}]; let e = c; for (let j = 0; j < ${k}; j++) e = e && e.parentElement; if (!e || e === document.body || e === document.documentElement) return null; const a = e.getBoundingClientRect(), b = c.getBoundingClientRect(); return a.width * a.height <= 2 * b.width * b.height + 1 ? e : null; })()` });
      if (!result.objectId) break;
      wrappers.push(...await listenersOf(result.objectId));
    }
    const docLevel = [];
    for (const expr of ['document.body', 'document', 'window']) {
      const { result } = await cdp.send('Runtime.evaluate', { expression: expr });
      docLevel.push(...await listenersOf(result.objectId));
    }
    // React attaches synthetic handlers at the root; read them from the element's props instead.
    const reactProps = await t.handle.evaluate((c) => {
      const hits = []; let e = c;
      for (let k = 0; e && k < 4 && e !== document.body; k++, e = e.parentElement) {
        const key = Object.keys(e).find((x) => x.startsWith('__reactProps$'));
        if (key) for (const p of Object.keys(e[key] || {})) if (/^on(Pointer|Mouse|Touch)(Down|Up)$|^onClick$/.test(p)) hits.push(p);
      }
      return hits;
    });
    const near = [...own, ...wrappers];
    t.listeners = { canvas: [...new Set(own)], wrapper: [...new Set(wrappers)], documentLevel: [...new Set(docLevel)].filter((x) => DOWN.test(x) || HOVER.test(x)), react: reactProps };
    t.operable = near.some((x) => DOWN.test(x)) || reactProps.length > 0;
    t.docOnly = !t.operable && docLevel.some((x) => DOWN.test(x));
    t.hover = near.some((x) => HOVER.test(x));
    const ax = await cdp.send('Accessibility.getPartialAXTree', { objectId: cObj.objectId, fetchRelatives: false });
    const node = ax.nodes[0] || {};
    const fallback = await t.handle.evaluate((c) => c.textContent.trim().slice(0, 80));
    t.exposure = { ignored: !!node.ignored, role: node.role?.value, name: node.name?.value || '', fallbackText: fallback };
    t.baseline = await series(t.ci, 700);
    t.selfAnimating = t.baseline.distinct > 1;
    const r0 = await page.evaluate(() => window.__probe.rafCount());
    await page.waitForTimeout(1000);
    t.rafPerSecondAtRest = (await page.evaluate(() => window.__probe.rafCount())) - r0;
  }

  // One Tab walk for the page, until an element repeats.
  await page.evaluate(() => { window.__probe.deepActive()?.blur?.(); window.scrollTo(0, 0); });
  const stops = []; const seen = new Set(); let empties = 0, tabs = 0, cycled = false;
  while (tabs < maxStops) {
    await page.keyboard.press('Tab'); tabs++;
    if (navigated()) break;
    const s = await page.evaluate(() => window.__probe.stop());
    if (!s) { if (++empties >= 3) break; continue; }
    if (seen.has(s.id)) { cycled = true; break; }
    seen.add(s.id); stops.push(s);
  }
  const walk = { tabs, uniqueStops: stops.length, cycled };

  // Per canvas: which stops sit over it (in the geometry read with that stop), and test keys on widgets.
  await page.route('**/*', (route) => (route.request().isNavigationRequest() && route.request().frame() === page.mainFrame()) ? route.abort('aborted') : route.continue());
  try {
    for (const t of targets) {
      const inside = (s) => { const [x, y, w, h] = s.canvases[t.ci]; return s.x >= x && s.x <= x + w && s.y >= y && s.y <= y + h; };
      const over = stops.filter(inside);
      const standIns = over.filter((s) => !['link', 'text', 'iframe', 'canvas'].includes(s.kind));
      const selfFocus = stops.filter((s) => s.kind === 'canvas' && inside(s));
      const beside = stops.filter((s) => !inside(s) && !['link', 'text', 'iframe', 'canvas'].includes(s.kind));
      t.stops = { overCanvas: over.length, standIns: standIns.length, linksOverCanvas: over.filter((s) => s.kind === 'link').length, canvasFocusable: selfFocus.length > 0, widgetsBeside: beside.length };
      if (standIns.length) {
        const sizes = standIns.map((s) => Math.min(s.w, s.h));
        const pointerTargets = standIns.filter((s) => s.pointerEvents !== 'none');
        t.standIns = { minSizePx: Math.round(Math.min(...sizes)), receivePointer: pointerTargets.length, minPointerTargetPx: pointerTargets.length ? Math.round(Math.min(...pointerTargets.map((s) => Math.min(s.w, s.h)))) : null };
      }
      const candidates = [...standIns.map((s) => ['over', s]), ...selfFocus.map((s) => ['canvas', s]), ...beside.map((s) => ['beside', s])].slice(0, maxWidgets);
      t.path = null; t.tried = [];
      // Keys are pressed only where a pointer-operable canvas needs a keyboard path.
      for (const [where, s] of (t.operable || t.docOnly) ? candidates : []) {
        if (navigated()) break;
        const keys = KEYS[s.kind === 'canvas' ? 'canvas' : s.kind] || KEYS.button;
        for (const key of keys) {
          const ok = await page.evaluate((id) => { const e = window.__probe.els[id]; if (!e || !e.isConnected) return false; e.focus({ focusVisible: true }); return window.__probe.deepActive() === e; }, s.id);
          if (!ok) break;
          const before = await page.evaluate(() => ({ live: window.__probe.live(), notify: window.__probe.notify.length, stop: window.__probe.stop() }));
          const h0 = t.selfAnimating ? null : await hash(t.ci);
          await page.keyboard.press(key);
          // Sample from the moment of the key: whether the pixels changed, and how many distinct frames follow
          // (juice that ignores reduced motion shows as several). A self-animating canvas is not sampled.
          let pixels = null, framesAfter = null;
          if (!t.selfAnimating) {
            const post = new Set(); let n = 0; const t0 = Date.now();
            do { const h = await hash(t.ci); if (h !== h0 || post.size) post.add(h); n++; } while (Date.now() - t0 < 700 || n < 6);
            pixels = post.size > 0; framesAfter = post.size;
          } else await page.waitForTimeout(500);
          await page.waitForTimeout(100);
          if (navigated()) { t.tried.push({ where, kind: s.kind, name: s.name, key, navigated: true }); break; }
          const after = await page.evaluate(() => ({ live: window.__probe.live(), notify: window.__probe.notify.length, stop: window.__probe.stop() }));
          const spoken = after.live !== before.live || after.notify > before.notify;
          const sameEl = after.stop && after.stop.id === s.id;
          const newEl = after.stop && !seen.has(after.stop.id); // focus moved to an element the action created
          const stateChanged = sameEl && after.stop.state !== before.stop?.state; // pressed/checked/value: announced by AT
          const nameChanged = sameEl && after.stop.name !== before.stop?.name;
          // Pixel change counts when focus stayed or moved to a new element; roving focus to an old one is navigation.
          const response = spoken || stateChanged || nameChanged || (pixels && (sameEl || newEl));
          t.tried.push({ where, kind: s.kind, name: s.name, key, pixels, spoken, stateChanged, nameChanged, focusMoved: !sameEl });
          if (response) {
            t.path = { where, kind: s.kind, name: s.name, key, pixelsChanged: pixels, narrated: spoken || stateChanged, liveOrNotify: spoken, stateChanged, nameChanged, distinctFramesAfterChange: framesAfter };
            break;
          }
        }
        if (t.path) break;
      }
    }
  } finally {
    await page.unroute('**/*').catch(() => {});
  }

  for (const t of targets) {
    const f = [];
    const add = (level, msg) => f.push({ level, msg });
    if (!t.operable && !t.docOnly) {
      if (t.exposure.ignored || t.exposure.name || t.exposure.fallbackText) add('PASS', t.exposure.ignored ? 'static canvas hidden from assistive technology' : 'static canvas with a name or fallback content');
      else add('WARN', 'static canvas without a name, fallback content or aria-hidden (1.1.1)');
      if (t.hover) add('INFO', 'reacts to pointer movement (hover): decorative unless it carries function');
    } else if (!t.path) {
      if (t.operable) add('FAIL', 'pointer-operated canvas with no keyboard path (2.1.1): no focusable control over or beside it changed it. If the pointer effect is decorative only, record that and hide the canvas from assistive technology');
      else add('WARN', 'pointer listeners on body/document/window only: cannot tell whether this canvas is operable, and no keyboard control changed it');
    } else {
      if (!t.path.narrated) add('WARN', 'the keyboard changes the canvas but nothing is narrated (4.1.3): no live region, ariaNotify or state change on the focused control');
      if (t.selfAnimating && !t.path.pixelsChanged && !t.path.liveOrNotify) add('WARN', 'the canvas animates by itself, so the probe could not confirm that the key changed it (only the control\'s own state or name changed): check by hand');
      if (t.path.where === 'beside') add('WARN', 'no stand-ins over the canvas: the keyboard path is controls beside it; confirm every pointer verb on the canvas (drag, orbit, pick) has an equivalent');
      if (t.path.where === 'canvas') add('WARN', 'the canvas itself takes keys: screen readers get no objects; add stand-ins or an equivalent (4.1.2)');
      if (!f.length) add('PASS', `keyboard path over the canvas (${t.path.key} on ${t.path.kind} "${t.path.name}") changes it and is narrated`);
    }
    if (t.standIns?.receivePointer && t.standIns.minPointerTargetPx < 24) add('WARN', `stand-ins receive the pointer and the smallest is ${t.standIns.minPointerTargetPx} px (2.5.8 needs 24)`);
    if (reduce && t.selfAnimating) add('WARN', 'animates at rest under reduced motion (2.2.2 pause control, 2.3.3)');
    else if (reduce && t.path?.distinctFramesAfterChange > 2) add('WARN', `still animating after a change under reduced motion: ${t.path.distinctFramesAfterChange} distinct frames in the 0.6 s after it (2.3.3)`);
    if (!t.selfAnimating && t.rafPerSecondAtRest > 5) add('INFO', `requestAnimationFrame runs at rest (${t.rafPerSecondAtRest}/s): render on demand`);
    const worst = f.reduce((a, b) => (RANK[b.level] > RANK[a] ? b.level : a), 'PASS');
    out.push({
      index: t.ci, verdict: worst, findings: f, listeners: t.listeners, operable: t.operable, documentLevelOnly: t.docOnly, hoverReactive: t.hover,
      exposure: t.exposure, selfAnimating: t.selfAnimating, baseline: t.baseline, rafPerSecondAtRest: t.rafPerSecondAtRest,
      walk, stops: t.stops, standIns: t.standIns || null, keyboardPath: t.path, tried: t.tried, reduce, navigatedAway: navigated(),
    });
  }
  await cdp.detach().catch(() => {});
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.argv[2];
  if (!url) { console.error('usage: node lib/probe-canvas.mjs <url> [--reduce] [--viewport 1280x900]'); process.exit(2); }
  const reduce = process.argv.includes('--reduce');
  const vp = (process.argv.includes('--viewport') ? process.argv[process.argv.indexOf('--viewport') + 1] : '1280x900').split('x').map(Number);
  const { fileURLToPath } = await import('node:url');
  const path = await import('node:path');
  const env = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../../skills/website-redesign/scripts/lib/env.mjs');
  const { launch } = await import(env);
  const { browser } = await launch();
  const ctx = await browser.newContext({ viewport: { width: vp[0], height: vp[1] }, reducedMotion: reduce ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  const r = await probeCanvas(page, { reduce });
  console.log(JSON.stringify(r, null, 2));
  await browser.close();
  process.exit(r.some((x) => x.verdict === 'FAIL') ? 1 : 0);
}
