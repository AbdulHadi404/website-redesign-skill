#!/usr/bin/env node
/**
 * Drive widgets into their states and capture each one: the state matrix
 * (app-ui.md §2) rendered, not imagined.
 *
 *   node states.mjs states.json [--base http://localhost:3000] [--out captures/states] [--label after] [--only name,name] [--aria]
 *
 * --aria also writes what the screen offers as text next to each capture: the accessibility tree, with every node
 * a sighted user cannot read on that screen marked (below the fold, cut off by a card, in a sideways scroller,
 * covered by a sticky bar, transparent). That turns this script into a task-walkthrough driver (visual-qa.md,
 * "Task walkthroughs"): the tester judges from the capture, picks the next step from what is on screen, and re-runs.
 * --each (or "each": true on a state) captures after every step, so one run shows the whole path.
 *
 * states.json:
 *   {
 *     "path": "/app/",                          default route for every state
 *     "device": "phone",                        phone (390×844, touch) | tablet (768×1024) | desktop (1440×900) | {width,height,…}
 *     "states": [
 *       { "name": "idle" },
 *       { "name": "loading",  "route": { "url": "**\/api/herd*", "delay": 5000 }, "steps": [{ "wait": 300 }] },
 *       { "name": "offline",  "route": { "url": "**\/api/herd*", "abort": true } },
 *       { "name": "error",    "route": { "url": "**\/api/herd*", "status": 500, "body": "{}" } },
 *       { "name": "empty",    "route": { "url": "**\/api/herd*", "json": { "herd": [] } } },
 *       { "name": "many",     "route": { "url": "**\/api/herd*", "file": "fixtures/herd-200.json" } },
 *       { "name": "stale",    "steps": [{ "offline": true }, { "reload": true }] },
 *       { "name": "search",   "steps": [{ "fill": ["#search", "1629"] }, { "wait": 200 }] },
 *       { "name": "detail",   "steps": [{ "click": "#alerts button >> nth=0" }], "shot": "dialog" },
 *       { "name": "focus",    "device": "desktop", "steps": [{ "press": "Tab", "times": 4 }] },
 *       { "name": "hover",    "device": "desktop", "steps": [{ "hover": "tbody tr >> nth=2" }] },
 *       { "name": "dark",     "context": { "colorScheme": "dark" } },
 *       { "name": "saved",    "storage": { "checked": "[\"IE1111\"]" } },
 *       { "name": "sent",     "route": { "url": "**\/api/apply", "json": { "ok": true }, "record": true }, "steps": [{ "click": "#send" }, { "wait": 500 }] }
 *     ]
 *   }
 *
 * Steps: click, dblclick, hover, focus, fill [sel, text], type [sel, text], press (key, "times"), check, uncheck,
 * select [sel, value], wait (ms or selector), reload, offline (true/false), viewport {width, height},
 * eval (a JS expression run in the page — your own config, your own risk), and for walkthroughs:
 *   tap [x, y] | selector      a touch tap (a click without touch); the log names what was hit and its size
 *   swipe {at: [x, y] | selector, dx, dy}   a finger drag: dx -250 swipes left. It scrolls what a finger would —
 *                              the page or a real scroller — and nothing that is merely overflow: hidden
 *   scroll selector | y        scrolls an element into view, or the window to y (absolute). It reaches content a
 *                              finger cannot (a column cut off by overflow: hidden): state checks only, never walkthroughs
 * After each click, tap, press or swipe the screen is compared with the one before; a step that changed nothing
 * visible is reported ("dead tap"). A failing step still leaves a capture (…-failed.png) of where it stopped, and
 * says why its target refused: not found, not rendered (hidden by what), zero-size, disabled, outside the viewport,
 * covered (by what), else Playwright's own reason. On a page wider than the viewport it adds "the page is 940 px wide
 * at a 390 px viewport — the layout overflows, itself a finding": a finding about the product, not a scenario error,
 * and a pointer can miss a target nothing covers on such a page (run that state at desktop to get past it).
 * Routes: url (glob), delay (ms), abort, status, body, json, file (relative to this scenario file), contentType,
 * record; several routes as a list. A missing file fails that state only.
 * Payload contract: "record": true on a route, or "record": "<url glob>" (or a list) on a state or the whole file,
 * saves every matching request as <out>/requests/<state>-<device>[-<label>].json: method, URL, Content-Type and
 * body (parsed JSON; a urlencoded or multipart form as {name: value} in the order sent, a file as its name).
 * The route still mocks, aborts or continues as configured; a state-level "record": true takes every request
 * that is not a GET. Run the same answers through the old and the new build, then
 *   node parity.mjs --payloads <old out dir> <new out dir>
 * diffs what each build sends (keys, order, types, values). Add a wait after the submit: a request sent after
 * the last step is not recorded.
 * "shot": "viewport" (default) | "full" | a selector (element capture, 2× density).
 *
 * Every state gets a fresh context. Console and page errors are recorded per state. A state whose capture is
 * pixel-identical to any earlier state's is flagged: either the scenario did not take effect (a wrong selector,
 * a route that never matched) or the product draws both states the same way (loading, error and offline all
 * rendering as an empty page is the common case) — the capture proves nothing until you know which.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { parseArgs, asList, launch, open, finishMotion, importModule, urlFor } from './lib/env.mjs';
import { seenTree } from './lib/seen.mjs';

const a = parseArgs();
const file = a._[0];
if (!file) { console.error('Usage: node states.mjs states.json [--base URL] [--out dir] [--label name] [--only a,b] [--aria] [--each]'); process.exit(2); }
const spec = JSON.parse(await readFile(file, 'utf8'));
const base = String(a.base || spec.base || 'http://localhost:3000').replace(/\/$/, '');
const outDir = String(a.out || 'captures/states');
const label = a.label ? `-${a.label}` : '';
const only = a.only ? asList(a.only) : null;
await mkdir(outDir, { recursive: true });

const DEVICES = {
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  tablet: { viewport: { width: 768, height: 1024 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};
const device = (d) => (typeof d === 'object' ? { viewport: { width: d.width, height: d.height }, deviceScaleFactor: d.deviceScaleFactor || 1, isMobile: !!d.isMobile, hasTouch: !!d.hasTouch } : DEVICES[d || 'phone'] || DEVICES.phone);
const deviceName = (d) => (typeof d === 'object' ? `${d.width}x${d.height}` : d || 'phone');

const PNG = (await importModule('pngjs'))?.PNG ?? null;
const pixelmatch = await importModule('pixelmatch');
// Near-identical counts too: a clock ticking between loads changes a few hundred pixels; a real state change
// (even one focus ring) changes thousands.
const decoded = new WeakMap();
const decode = (b) => { if (!decoded.has(b)) decoded.set(b, PNG.sync.read(b)); return decoded.get(b); };
const identical = (x, y) => {
  if (!PNG || !pixelmatch) return false;
  if (x.equals(y)) return true;
  const p = decode(x), q = decode(y);
  if (p.width !== q.width || p.height !== q.height) return false;
  return pixelmatch(p.data, q.data, null, p.width, p.height, { threshold: 0.05 }) <= p.width * p.height * 0.0005;
};

// Device pixels that differ between two captures (Infinity when the sizes differ).
const changedPixels = (x, y) => {
  if (!PNG || !pixelmatch) return Infinity;
  const p = PNG.sync.read(x), q = PNG.sync.read(y);
  if (p.width !== q.width || p.height !== q.height) return Infinity;
  return pixelmatch(p.data, q.data, null, p.width, p.height, { threshold: 0.05 });
};

// What sits under a point, as a user would name it, with the size of the control that owns it.
const hitAt = (page, x, y, tap = true) => page.evaluate(([x, y, tap]) => {
  const el = document.elementFromPoint(x, y);
  if (!el) return 'nothing';
  const c = el.closest('a,button,input,select,textarea,summary,label,[role=button],[role=link],[role=tab],[role=checkbox],[role=menuitem],[onclick],[tabindex]') || el;
  const r = c.getBoundingClientRect();
  const name = (c.getAttribute('aria-label') || c.labels?.[0]?.innerText || c.innerText || c.getAttribute('placeholder') || c.value || c.getAttribute('title') || c.getAttribute('alt') || '').trim().replace(/\s+/g, ' ').slice(0, 40);
  const role = c.getAttribute('role') || c.tagName.toLowerCase();
  const actionable = c !== el || /^(A|BUTTON|INPUT|SELECT|TEXTAREA|SUMMARY|LABEL)$/.test(el.tagName);
  const note = !tap ? '' : !actionable ? ' (no control semantics)' : Math.min(r.width, r.height) < 44 ? ' (under 44px)' : '';
  return `${role}${name ? ` "${name}"` : ''} ${Math.round(r.width)}×${Math.round(r.height)}${note}`;
}, [x, y, tap]).catch(() => '?');

// Fixture files resolve relative to the scenario file, not the working directory.
const fixture = (f) => path.resolve(path.dirname(file), f);

async function applyRoutes(page, routes, rec) {
  for (const r of [].concat(routes || [])) {
    await page.route(r.url, async (route) => {
      if (r.record) rec(route.request());
      if (r.delay) await new Promise((res) => setTimeout(res, r.delay));
      if (r.abort) return route.abort(typeof r.abort === 'string' ? r.abort : 'internetdisconnected').catch(() => {});
      if (r.status || r.body !== undefined || r.json !== undefined || r.file) {
        const body = r.file ? await readFile(fixture(r.file)).catch(() => '') : r.json !== undefined ? JSON.stringify(r.json) : r.body ?? '';
        return route.fulfill({ status: r.status || 200, body, contentType: r.contentType || (r.json !== undefined || /\.json$/.test(r.file || '') ? 'application/json' : 'text/plain') }).catch(() => {});
      }
      return route.continue().catch(() => {});
    }, r.times ? { times: r.times } : undefined);
  }
}

// What a request sends, parsed so parity.mjs --payloads can diff it key by key. JSON as JSON; a urlencoded or
// multipart form as {name: value} in the order sent (a repeated name as a list, a file as "(file) name"). The random
// multipart boundary is replaced in the raw body, so the same form sent twice records the same bytes.
function snapshot(req) {
  const type = req.headers()['content-type'] || '';
  let raw = req.postData(), body = raw, format = raw == null ? 'none' : 'text';
  const boundary = (type.match(/boundary=("?)([^";]+)\1/i) || [])[2];
  if (raw != null && boundary) raw = raw.split(boundary).join('{boundary}');
  if (raw != null && raw.length > 200000) raw = raw.slice(0, 200000) + '…(truncated)';
  if (raw != null) try { body = JSON.parse(raw); format = 'json'; } catch {
    const pairs = /x-www-form-urlencoded/i.test(type) ? [...new URLSearchParams(raw)]
      : boundary ? raw.split('--{boundary}').slice(1, -1).map((part) => { const [head, ...rest] = part.split('\r\n\r\n'); const file = head.match(/filename="([^"]*)"/i); return [(head.match(/\bname="([^"]*)"/i) || [])[1], file ? `(file) ${file[1]}` : rest.join('\r\n\r\n').replace(/\r\n$/, '')]; })
        : null;
    if (pairs) { body = {}; format = boundary ? 'multipart' : 'form'; for (const [k, v] of pairs) body[k] = Object.hasOwn(body, k) ? [].concat(body[k], v) : v; }
  }
  return { method: req.method(), url: req.url(), contentType: type || null, format, body, raw };
}

async function swipe(page, cdp, x, y, dx, dy) {
  const n = 12;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= n; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + (dx * i) / n, y: y + (dy * i) / n }] });
    await page.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

const ACTS = new Set(['click', 'dblclick', 'tap', 'press', 'swipe']);
const show = (v) => (typeof v === 'string' ? v : JSON.stringify(v)).slice(0, 60);

// Playwright's last word on why it gave up, from the call log a "Timeout 4000ms exceeded" hides.
const pwReason = (e) => String(e?.cause?.message || e?.message || '').replace(/\x1b\[[\d;]*m/g, '').split('\n').map((l) => l.trim().replace(/^-\s*/, '')).reverse()
  .find((l) => /intercepts pointer events|is not (visible|enabled|editable|stable|attached)|outside of the viewport|did not find some options|did not change its state|not an? <|not a checkbox/i.test(l)) || '';

// Why a step's target refused, in a tester's words, measured where the step gave up (Playwright has already scrolled
// it in): not found, not rendered, zero-size, disabled, outside the screen, covered (by what); else Playwright's own
// reason. A page wider than the viewport is named whatever the reason: the phone then shows a window onto a wider
// layout and Playwright's pointer can land beside a target nothing covers (old permit build: 940 px at 390).
async function whyNot(page, sel, e, op) {
  const n = await page.locator(sel).count().catch(() => -1);
  if (n === 0) return 'not found: nothing on the page matches the selector';
  const d = n > 0 && await page.locator(sel).first().evaluate((el) => {
    const tag = (x) => `<${x.tagName.toLowerCase()}${x.id ? `#${x.id}` : ''}${[...x.classList].slice(0, 2).map((c) => `.${c}`).join('')}>`;
    const text = (x) => { const t = (x.getAttribute('aria-label') || x.innerText || '').trim().replace(/\s+/g, ' '); return t ? ` "${t.slice(0, 30)}${t.length > 30 ? '…' : ''}"` : ''; };
    let hidden = '';
    for (let x = el; x && !hidden; x = x.parentElement) if (getComputedStyle(x).display === 'none') hidden = `display: none on ${x === el ? 'itself' : tag(x)}${x.hidden ? ', from its hidden attribute' : ''}`;
    // Screen coordinates: the visual viewport, which on an overflowing phone page is a window onto the layout one.
    const r = el.getBoundingClientRect(), v = window.visualViewport || { offsetLeft: 0, offsetTop: 0, width: innerWidth, height: innerHeight };
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const inView = cx >= v.offsetLeft && cx <= v.offsetLeft + v.width && cy >= v.offsetTop && cy <= v.offsetTop + v.height;
    const hit = inView ? (el.getRootNode().elementFromPoint ? el.getRootNode() : document).elementFromPoint(cx, cy) : null;
    const inert = el.closest('[inert]');
    return {
      rendered: el.getClientRects().length > 0, hidden, visibility: getComputedStyle(el).visibility, inView,
      box: [r.left - v.offsetLeft, r.top - v.offsetTop, r.width, r.height].map(Math.round), screen: [v.width, v.height].map(Math.round),
      disabled: el.matches(':disabled') ? (el.hasAttribute('disabled') ? 'disabled attribute' : 'inside a disabled <fieldset>') : el.closest('[aria-disabled=true]') ? 'aria-disabled="true"' : inert ? `inert${inert === el ? '' : `, inside ${tag(inert)}`}` : '',
      noPointer: getComputedStyle(el).pointerEvents === 'none',
      cover: !hit || el.contains(hit) || [...(el.labels || [])].some((l) => l.contains(hit)) ? '' : tag(hit) + text(hit),
      wide: Math.max(document.documentElement.scrollWidth, innerWidth),
    };
  }, undefined, { timeout: 2000 }).catch(() => null);
  if (!d) return '';
  const vp = page.viewportSize(), pw = pwReason(e), pointer = /^(click|dblclick|hover|check|uncheck|tap|swipe)$/.test(op);
  const where = `box ${d.box[2]}×${d.box[3]} at ${d.box[0]},${d.box[1]} of the ${d.screen[0]}×${d.screen[1]} screen`;
  const overflow = vp && d.wide > vp.width + 1 ? `the page is ${d.wide} px wide at a ${vp.width} px viewport — the layout overflows, itself a finding` : '';
  const why = !d.rendered ? `not rendered (${d.hidden || 'no box'})`
    : d.visibility !== 'visible' ? `invisible (visibility: ${d.visibility})`
    : d.box[2] < 1 || d.box[3] < 1 ? `zero-size (${where}): a styled control hiding the real one? act on what is drawn, e.g. its label`
    : d.disabled ? `disabled (${d.disabled})`
    // Only a pointer needs it on screen and uncovered: fill, select and wait do not scroll, and do not care.
    : !pointer ? (pw ? `Playwright says "${pw}" (${where})` : '')
    : !d.inView ? `outside the viewport (${where}): scrolling does not bring it in`
    : d.noPointer ? 'it ignores the pointer (pointer-events: none)'
    : d.cover ? `covered by ${d.cover} (${where})`
    // Nothing covers it, yet Playwright's pointer hits something else: on an overflowing page its coordinates are off.
    : /intercepts pointer events/.test(pw) && overflow ? `a pointer aimed at it lands on ${pw.replace(/\s*intercepts pointer events.*/, '')} though nothing covers it (${where})`
    : pw ? `Playwright says "${pw}" (${where})` : '';
  if (why) return `exists but ${op === 'wait' ? 'never showed' : 'is not actionable'}: ${[why, overflow].filter(Boolean).join('; ')}`;
  return overflow ? `${String(e.message || e).split('\n')[0]}; ${overflow}` : '';
}

/** Run the steps; returns { trail, dead, lastTap }. onStep(i, lastTap) runs after each step (for --each captures). */
async function run(page, steps = [], { touch = true, onStep } = {}) {
  const trail = [], dead = [];
  let lastTap = null, cdp = null;
  const loc = (sel) => page.locator(sel).first();
  const center = async (sel) => { const b = await loc(sel).boundingBox({ timeout: 4000 }).catch(() => null); if (!b) throw new Error(`"${sel}": no such element on screen`); return [b.x + b.width / 2, b.y + b.height / 2]; };
  for (const [i, s] of steps.entries()) {
    const [op] = Object.keys(s).filter((k) => k !== 'times');
    const v = s[op];
    try {
      let before = null;
      if (ACTS.has(op)) {
        // Bring a selector target into view first, so the comparison sees the step, not Playwright's scroll.
        if (typeof v === 'string' && op !== 'press') await loc(v).scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {});
        before = await page.screenshot({ scale: 'css' }).catch(() => null);
      }
      switch (op) {
        case 'click': case 'dblclick': case 'hover': case 'focus': case 'check': case 'uncheck': {
          if (op === 'click' || op === 'dblclick') { const [x, y] = await center(v).catch(() => [null, null]); if (x !== null) { lastTap = [x, y]; trail.push(`${i + 1}. ${op} ${show(v)} → ${await hitAt(page, x, y)}`); } }
          // An opaque sticky bar over the target intercepts pointer clicks; fall back to the element's own method.
          await loc(v)[op]({ timeout: 4000 }).catch(async (pe) => {
            if (op === 'click' || op === 'focus') {
              await loc(v).evaluate((el, o) => el[o](), op, { timeout: 2000 }).catch(() => { throw new Error(`${op} "${v}": no such element`, { cause: pe }); });
              if (op === 'click') trail.push(`   ${op} ${show(v)} was blocked for a pointer (covered?) and was dispatched to the element directly`);
            } else throw new Error(`${op} "${v}": not found or not actionable`, { cause: pe });
          });
          break;
        }
        case 'tap': {
          const [x, y] = Array.isArray(v) ? v : await center(v);
          trail.push(`${i + 1}. tap ${Array.isArray(v) ? `[${v}]` : show(v)} → ${await hitAt(page, x, y)}`);
          lastTap = [x, y];
          if (touch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y);
          break;
        }
        case 'swipe': {
          const [x, y] = Array.isArray(v.at) ? v.at : v.at ? await center(v.at) : [(page.viewportSize()?.width || 390) / 2, (page.viewportSize()?.height || 844) / 2];
          cdp ??= await page.context().newCDPSession(page);
          trail.push(`${i + 1}. swipe from [${Math.round(x)},${Math.round(y)}] by [${v.dx || 0},${v.dy || 0}] → on ${await hitAt(page, x, y, false)}`);
          await swipe(page, cdp, x, y, v.dx || 0, v.dy || 0);
          break;
        }
        case 'fill': await loc(v[0]).fill(String(v[1]), { timeout: 4000 }); break;
        case 'type': await loc(v[0]).pressSequentially(String(v[1]), { delay: 30, timeout: 4000 }); break;
        case 'select': await loc(v[0]).selectOption(String(v[1]), { timeout: 4000 }); break;
        case 'press': for (let k = 0; k < (s.times || 1); k++) await page.keyboard.press(v); break;
        case 'wait': typeof v === 'number' ? await page.waitForTimeout(v) : await page.waitForSelector(v, { timeout: 8000 }); break;
        case 'scroll': typeof v === 'number' ? await page.evaluate((y) => scrollTo(0, y), v) : await loc(v).scrollIntoViewIfNeeded(); break;
        case 'reload': await page.reload({ waitUntil: 'load' }).catch(() => {}); await page.waitForTimeout(400); break;
        case 'offline': await page.context().setOffline(!!v); break;
        case 'viewport': await page.setViewportSize({ width: v.width, height: v.height }); break;
        case 'eval': await page.evaluate(v); break;
        default: throw new Error(`unknown step "${op}"`);
      }
      await page.waitForTimeout(ACTS.has(op) ? 350 : 60);
      if (before) {
        await finishMotion(page).catch(() => {});
        const after = await page.screenshot({ scale: 'css' }).catch(() => null);
        // A few pixels is a caret or a clock; a real response (a sheet, a ring, a new row) changes far more.
        if (after && changedPixels(before, after) <= 12) dead.push(`step ${i + 1} (${op} ${show(v)}) changed nothing on screen`);
      }
      if (!['wait', 'eval', 'offline'].includes(op) && !trail.some((t) => t.startsWith(`${i + 1}. `))) trail.push(`${i + 1}. ${op} ${show(v)}`);
      if (onStep) await onStep(i, lastTap);
    } catch (e) {
      // Say why the target refused, not "Timeout 4000ms exceeded" or "not found or not actionable".
      const sel = ['fill', 'type', 'select'].includes(op) ? v?.[0] : op === 'swipe' ? v?.at : /^(click|dblclick|hover|focus|check|uncheck|tap|wait|scroll)$/.test(op) ? v : null;
      const why = typeof sel === 'string' ? await whyNot(page, sel, e, op).catch(() => '') : '';
      const err = new Error(`step ${i + 1} (${op} ${show(v)}): ${why || String(e.message || e).split('\n')[0]}`);
      err.trail = trail; err.dead = dead;
      throw err;
    }
  }
  return { trail, dead, lastTap };
}

// A ring where the finger landed, drawn only for the capture.
const markTap = (page, at) => (at ? page.evaluate(([x, y]) => {
  const m = document.createElement('div');
  m.id = '__tap_mark';
  m.setAttribute('aria-hidden', 'true');
  m.style.cssText = `position:fixed;left:${x - 14}px;top:${y - 14}px;width:28px;height:28px;border-radius:50%;border:3px solid #ff00aa;box-shadow:0 0 0 2px #fff;pointer-events:none;z-index:2147483647`;
  document.documentElement.appendChild(m);
}, at).catch(() => {}) : null);
const unmarkTap = (page) => page.evaluate(() => document.getElementById('__tap_mark')?.remove()).catch(() => {});

const { browser } = await launch({ chrome: a.chrome });
const results = [];
const shots = []; // every capture so far, for the identical-pair check
let anyRecorded = false;
try {
  for (const st of spec.states || []) {
    if (only && !only.includes(st.name)) continue;
    const dev = st.device || spec.device;
    const opts = { ...device(dev), ...(spec.context || {}), ...(st.context || {}) };
    const ctx = await browser.newContext({ ...opts, serviceWorkers: st.serviceWorkers || 'allow' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(`page error: ${String(e.message || e).split('\n')[0]}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text().slice(0, 160)}`); });
    const storage = { ...(spec.storage || {}), ...(st.storage || {}) };
    if (Object.keys(storage).length) await ctx.addInitScript((kv) => { try { for (const [k, v] of Object.entries(kv)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); } catch { /* storage blocked */ } }, storage);
    // Requests to record: routes marked "record" (in applyRoutes) and the state's or file's "record" globs. The glob
    // routes are registered last, so they run first and fall back to the mocks above (or the network).
    const requests = [], recorded = new WeakSet();
    const rec = (req) => { if (!recorded.has(req)) { recorded.add(req); requests.push(snapshot(req)); } };
    const routes = [].concat(spec.route || [], st.route || []);
    await applyRoutes(page, routes, rec);
    const recordGlobs = [].concat(st.record ?? spec.record ?? []).filter(Boolean);
    for (const g of recordGlobs) await page.route(g === true ? '**/*' : g, (route) => { if (g !== true || !/^(GET|HEAD|OPTIONS)$/.test(route.request().method())) rec(route.request()); return route.fallback(); });
    const recording = recordGlobs.length > 0 || routes.some((r) => r.record);
    const url = urlFor(base, st.path || spec.path || '/');
    const missingFiles = [].concat(spec.route || [], st.route || []).filter((r) => r.file && !existsSync(fixture(r.file))).map((r) => fixture(r.file));
    const entry = { name: st.name, device: deviceName(dev), file: null, errors, note: '', trail: [], dead: [] };
    const stem = path.join(outDir, `${st.name}-${entry.device}${label}`);
    const shot = st.shot || 'viewport';
    // Walkthrough captures show where the finger landed; state captures stay clean for the identical-state check.
    const capture = async (f, tap) => {
      if (a.aria && tap) await markTap(page, tap);
      const buf = shot === 'viewport' || shot === 'full' ? await page.screenshot({ path: f, fullPage: shot === 'full' }) : await page.locator(shot).first().screenshot({ path: f, timeout: 5000 });
      await unmarkTap(page);
      if (a.aria) await writeFile(f.replace(/\.png$/, '.aria.yml'), await seenTree(page));
      return buf;
    };
    const each = a.each || st.each || spec.each;
    try {
      if (missingFiles.length) throw new Error(`fixture file not found: ${missingFiles.join(', ')} (route files resolve relative to the scenario file)`);
      // A delayed route keeps the page "loading" on purpose: do not wait for the network to go quiet.
      if ([].concat(st.route || []).some((r) => r.delay)) await page.goto(url, { waitUntil: 'commit' }).catch(() => {});
      else await open(page, url);
      await page.waitForTimeout(st.settle ?? 300);
      if (each && st.steps?.length) await capture(`${stem}-00.png`);
      const r = await run(page, st.steps, {
        touch: !!opts.hasTouch,
        onStep: each ? async (i, tap) => { await finishMotion(page).catch(() => {}); await capture(`${stem}-${String(i + 1).padStart(2, '0')}.png`, tap); } : null,
      });
      entry.trail = r.trail; entry.dead = r.dead;
      await finishMotion(page).catch(() => {});
      const f = `${stem}.png`;
      const buf = await capture(f, r.lastTap);
      entry.file = f;
      // Compared with every earlier state, not only the first: loading, error and offline rendering the same
      // is a finding about the product (it has no such states), not only about the scenario.
      if (!(a.aria && r.lastTap)) {
        const twin = shots.find((o) => o.shot === shot && o.device === entry.device && identical(o.buf, buf));
        if (twin) entry.note = twin === shots[0]
          ? `identical to "${twin.name}" — the scenario did not take effect (selector, route pattern?), or the product has no such state`
          : `identical to "${twin.name}" — the product shows these two states the same way, or one scenario did not take effect`;
        shots.push({ name: st.name, buf, shot, device: entry.device });
      }
    } catch (e) {
      entry.trail = e.trail || entry.trail; entry.dead = e.dead || entry.dead;
      entry.note = `failed: ${String(e.message || e).split('\n')[0]}`;
      // Show where it stopped: the next step is chosen from this screen.
      const f = `${stem}-failed.png`;
      if (page.url() !== 'about:blank' && await page.screenshot({ path: f }).then(() => true).catch(() => false)) {
        entry.note += ` — screen at failure: ${path.basename(f)}`;
        if (a.aria) await writeFile(f.replace(/\.png$/, '.aria.yml'), await seenTree(page).catch(() => ''));
      }
    }
    // Written for failed states too: what was sent before the failure is still evidence.
    if (recording) {
      const f = path.join(outDir, 'requests', `${st.name}-${entry.device}${label}.json`);
      await mkdir(path.dirname(f), { recursive: true });
      await writeFile(f, JSON.stringify({ state: st.name, device: entry.device, label: a.label || null, base, requests }, null, 1) + '\n');
      entry.recorded = requests.length ? `◇ recorded ${requests.map((r) => `${r.method} ${new URL(r.url).pathname}`).join(', ')} → requests/${path.basename(f)}`
        : `⚠ recorded nothing: no request matched ${[...recordGlobs.map((g) => (g === true ? 'any non-GET' : g)), ...routes.filter((r) => r.record).map((r) => r.url)].join(', ')} (wrong glob, or the submit never happened)`;
      anyRecorded = true;
    }
    results.push(entry);
    console.log(`${entry.file ? '✓' : '✗'} ${st.name} (${entry.device})${entry.file ? `  ${entry.file}` : ''}${entry.note ? `\n   ⚠ ${entry.note}` : ''}${entry.dead.map((d) => `\n   ⚠ ${d}`).join('')}${entry.recorded ? `\n   ${entry.recorded}` : ''}${errors.length ? `\n   ${errors.length} error(s): ${errors.slice(0, 2).join(' | ')}` : ''}${a.aria || each ? entry.trail.map((t) => `\n     ${t}`).join('') : ''}`);
    await ctx.close();
  }
} finally {
  await browser.close();
}

const md = ['# States', '', `${base} · ${results.length} states · ${new Date().toISOString().slice(0, 16)}`, '', '| State | Device | Capture | Errors | Note |', '| --- | --- | --- | --- | --- |',
  ...results.map((r) => `| ${r.name} | ${r.device} | ${r.file ? path.basename(r.file) : '—'} | ${r.errors.length || ''} | ${[r.note, ...r.dead, r.recorded].filter(Boolean).join('; ')} |`)];
const walked = results.filter((r) => r.trail.length);
if (walked.length) md.push('', '## Steps', '', ...walked.flatMap((r) => [`**${r.name}** (${r.device})`, '', ...r.trail.map((t) => `    ${t}`), '']));
await writeFile(path.join(outDir, `states${label}.md`), md.join('\n') + '\n');
console.log(`\n${results.filter((r) => r.file).length}/${results.length} captured · summary ${path.join(outDir, `states${label}.md`)} · sheet: node compare.mjs --grid ${outDir}/*.png --out ${outDir}/sheet.png`);
if (anyRecorded) console.log(`requests: ${path.join(outDir, 'requests')} · diff with the other build's: node parity.mjs --payloads <old out dir> <new out dir>`);
process.exitCode = results.some((r) => !r.file) ? 1 : 0;
