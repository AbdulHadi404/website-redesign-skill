#!/usr/bin/env node
/**
 * Drive widgets into their states and capture each one: the state matrix
 * (app-ui.md §2) rendered, not imagined.
 *
 *   node states.mjs states.json [--base http://localhost:3000] [--out captures/states] [--label after] [--only name,name]
 *                   [--aria] [--each] [--axe] [--gpu] [--headed]
 *
 * --aria also writes what the screen offers as text next to each capture: the accessibility tree, with every node
 * a sighted user cannot read on that screen marked (below the fold, cut off by a card, in a sideways scroller,
 * covered by a sticky bar, transparent). That turns this script into a task-walkthrough driver (visual-qa.md,
 * "Task walkthroughs"): the tester judges from the capture, picks the next step from what is on screen, and re-runs.
 * --each (or "each": true on a state) captures after every step, so one run shows the whole path.
 * --axe (or "axe": true on a state or the whole file; "axe": false on a state opts it out) scans each state's final
 * screen with axe-core after its capture. Overlays exist only when open (a menu, a dialog, the command palette, the
 * phone drawer), so a scan of the route never sees them; here the steps open them, at any device:
 *   { "name": "palette", "device": "desktop", "steps": [{ "press": "Control+k" }] }
 *   { "name": "drawer",  "device": "phone",   "steps": [{ "tap": "button[aria-label=Menu]" }] }
 * The page is settled first (scrolled through and back, so lazy and scroll-revealed content is scanned as seen, then
 * motion frozen), and scanned with audit.mjs's rules: wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa, best-practice.
 * The result line gains "axe: id (impact, nodes), …", and <out>/<state>-<device>[-<label>].axe.json lists each
 * violation (id, impact, help, targets, what fails). A critical or serious violation fails the state (exit 1); its
 * capture is still written. If settling closed something (a menu that closes on scroll), the line says so;
 * "axe": "no-scroll" then scans without scrolling. --gpu and --headed are passed to the browser launch.
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
 * says why its target refused: not found; not rendered (display: none on what, inside a closed <details>,
 * hidden="until-found"); invisible (visibility); zero-size or visually hidden (act on what is drawn, e.g. its label);
 * disabled or read-only (only for steps that need it: hover does not); outside the viewport; ignoring the pointer
 * (pointer-events: none); covered (by what) or cut off (by which overflow); a select with no such option (and the
 * options it has); else Playwright's own reason. When the step itself worked and the capture after it failed, it
 * says that instead. Every failed step on a page laid out wider than the screen ends with "the page is 940 px wide
 * at a 390 px viewport — the layout overflows, itself a finding", or, on a phone page without <meta name="viewport"
 * content="width=device-width">, with that finding: both are about the product, not the scenario. On such a page
 * Playwright's own pointer check (check, click, hover) can miss a target nothing covers; that is the test tool, not
 * the product, and the message says so: a "tap" step acts on the target at the same device.
 * Routes: url (glob), delay (ms), abort, status, body, json, file (relative to this scenario file), contentType,
 * record; several routes as a list. A missing file fails that state only.
 * Payload contract: "record": true on a route, or "record": "<url glob>" (or a list) on a state or the whole file,
 * saves every matching request as <out>/requests/[<label>/]<state>-<device>[-<label>].json: method, URL, Content-Type
 * and body (parsed JSON; a urlencoded or multipart form as {name: value} in the order sent, a file as its name), in
 * full, with the body's byte length and SHA-256. A body that is not UTF-8 text (a file upload) or over 20 MB keeps
 * its hash in "raw" instead of its text, so two recordings still compare byte for byte. The route still mocks,
 * aborts or continues as configured; a state-level "record": true takes every request that is not a GET. Each
 * label records into its own folder, so two builds run into one --out never overwrite or pair with each other. Run
 * the same answers through the old and the new build, then
 *   node parity.mjs --payloads <out>/requests/<old label> <out>/requests/<new label>   (or two unlabelled out dirs)
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
import { createHash } from 'node:crypto';
import path from 'node:path';
import { parseArgs, asList, launch, open, settle, finishMotion, freezeMotion, decodeImages, importModule, resolveModule, scriptsDir, urlFor } from './lib/env.mjs';
import { seenTree } from './lib/seen.mjs';

const a = parseArgs();
const file = a._[0];
if (!file) { console.error('Usage: node states.mjs states.json [--base URL] [--out dir] [--label name] [--only a,b] [--aria] [--each] [--axe] [--gpu] [--headed]'); process.exit(2); }
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
// multipart boundary is replaced in the raw body, so the same form sent twice records the same bytes. Never cut:
// a body cut short compares "byte-identical" to another that differs after the cut. Text is kept whole; bytes that
// are not UTF-8 (a file upload, which the text would mangle) or a body over RAW_MAX keep their SHA-256 in "raw", so
// raw still differs exactly when the bytes do.
const RAW_MAX = 20e6;
const replaceBytes = (buf, from, to) => {
  const parts = [];
  for (let i = 0, j; ; i = j + from.length) { j = buf.indexOf(from, i); if (j < 0) { parts.push(buf.subarray(i)); break; } parts.push(buf.subarray(i, j), to); }
  return Buffer.concat(parts);
};
function snapshot(req) {
  const type = req.headers()['content-type'] || '';
  let raw = req.postData(), body = raw, format = raw == null ? 'none' : 'text';
  const boundary = (type.match(/boundary=("?)([^";]+)\1/i) || [])[2];
  let bytes = raw == null ? null : req.postDataBuffer() || Buffer.from(raw);
  if (raw != null && boundary) { raw = raw.split(boundary).join('{boundary}'); bytes = replaceBytes(bytes, Buffer.from(boundary), Buffer.from('{boundary}')); }
  const sha256 = bytes && createHash('sha256').update(bytes).digest('hex');
  const text = raw != null && Buffer.from(raw).equals(bytes);
  if (raw != null) try { body = JSON.parse(raw); format = 'json'; } catch {
    const pairs = /x-www-form-urlencoded/i.test(type) ? [...new URLSearchParams(raw)]
      : boundary ? raw.split('--{boundary}').slice(1, -1).map((part) => { const [head, ...rest] = part.split('\r\n\r\n'); const file = head.match(/filename="([^"]*)"/i); return [(head.match(/\bname="([^"]*)"/i) || [])[1], file ? `(file) ${file[1]}` : rest.join('\r\n\r\n').replace(/\r\n$/, '')]; })
        : null;
    if (pairs) { body = {}; format = boundary ? 'multipart' : 'form'; for (const [k, v] of pairs) body[k] = Object.hasOwn(body, k) ? [].concat(body[k], v) : v; }
  }
  const kept = raw == null || (text && raw.length <= RAW_MAX);
  if (!kept) {
    raw = `(not stored: ${bytes.length} bytes${text ? '' : ', not UTF-8 text'}; sha256 ${sha256})`;
    if (format === 'text') body = raw;
  }
  return { method: req.method(), url: req.url(), contentType: type || null, format, body, raw, bytes: bytes?.length ?? 0, sha256: sha256 || null, ...(kept ? {} : { rawStored: false }) };
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

// The page as a whole, whatever failed: a phone page laid out wider than the screen (content overflows it), or laid
// out at a desktop width because it has no <meta name="viewport" content="width=device-width">. Both are findings
// about the product, not the scenario, and on such a page Playwright's own pointer check can miss (see whyNot).
async function layoutNote(page) {
  const vp = page.viewportSize();
  const d = await page.evaluate(() => ({
    wide: Math.max(document.documentElement.scrollWidth, innerWidth), inner: innerWidth, scale: window.visualViewport?.scale ?? 1,
    meta: document.querySelector('meta[name=viewport]')?.getAttribute('content') ?? null,
  })).catch(() => null);
  if (!d || !vp) return '';
  if (!/width\s*=\s*device-width/i.test(d.meta || '') && d.inner > vp.width + 1) {
    return `the page has ${d.meta == null ? 'no <meta name="viewport">' : `<meta name="viewport" content="${d.meta}">`}: a phone lays it out ${d.inner} px wide and shows it at ${Math.round(d.scale * 100)}% — itself a finding`;
  }
  return d.wide > vp.width + 1 ? `the page is ${d.wide} px wide at a ${vp.width} px viewport — the layout overflows, itself a finding` : '';
}

// Steps whose Playwright action waits for the target to be enabled (hover, focus, wait, scroll, tap and swipe do not).
const NEEDS_ENABLED = /^(click|dblclick|check|uncheck|fill|type|select)$/;
// Steps that aim a pointer at the target, so it must be on screen, hit-testable and uncovered.
const POINTER = /^(click|dblclick|hover|check|uncheck|tap|swipe)$/;

// Why a step's target refused, in a tester's words, measured where the step gave up (Playwright has already scrolled
// it in): not found; not rendered (display: none, a closed <details>, hidden="until-found"); invisible; zero-size or
// visually hidden; disabled or read-only; a select without that option; outside the screen; covered (by what) or cut
// off (by which overflow); else Playwright's own reason. The caller adds layoutNote(): on a page wider than the
// screen Playwright's pointer check can miss a target nothing covers (old permit build: 940 px at 390), while a real
// touch tap at the same spot works.
async function whyNot(page, sel, e, op, want) {
  const n = await page.locator(sel).count().catch(() => -1);
  if (n === 0) return 'not found: nothing on the page matches the selector';
  const d = n > 0 && await page.locator(sel).first().evaluate((el, want) => {
    const tag = (x) => `<${x.tagName.toLowerCase()}${x.id ? `#${x.id}` : ''}${[...x.classList].slice(0, 2).map((c) => `.${c}`).join('')}>`;
    const short = (t) => { t = String(t || '').trim().replace(/\s+/g, ' '); return t ? `"${t.slice(0, 30)}${t.length > 30 ? '…' : ''}"` : ''; };
    const text = (x) => { const t = short(x.getAttribute('aria-label') || x.innerText); return t ? ` ${t}` : ''; };
    const cs = (x) => getComputedStyle(x);
    let hidden = '';
    for (let x = el; x && !hidden; x = x.parentElement) {
      const p = x.parentElement, self = x === el ? 'itself' : tag(x);
      if (cs(x).display === 'none') hidden = `display: none on ${self}${x.hidden ? ', from its hidden attribute' : ''}`;
      else if (x.getAttribute('hidden') === 'until-found') hidden = `hidden="until-found" on ${self}: shown only when find-in-page or a link to a fragment inside it reaches it`;
      // A closed <details> keeps its content in the layout tree (getClientRects is not empty) but never paints it.
      else if (p?.tagName === 'DETAILS' && !p.open && x !== p.querySelector(':scope > summary')) hidden = `inside a closed ${tag(p)}${text(p.querySelector(':scope > summary') || p)}: open it first (a step on its summary)`;
      else if (x !== el && cs(x).contentVisibility === 'hidden') hidden = `content-visibility: hidden on ${tag(x)}`;
    }
    // Screen coordinates: the visual viewport, which on an overflowing phone page is a window onto the layout one.
    const r = el.getBoundingClientRect(), v = window.visualViewport || { offsetLeft: 0, offsetTop: 0, width: innerWidth, height: innerHeight, scale: 1 };
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const inView = cx >= v.offsetLeft && cx <= v.offsetLeft + v.width && cy >= v.offsetTop && cy <= v.offsetTop + v.height;
    const hit = inView ? (el.getRootNode().elementFromPoint ? el.getRootNode() : document).elementFromPoint(cx, cy) : null;
    const inert = el.closest('[inert]');
    // What a user would act on instead of a hidden control: a label that is drawn.
    const label = [...(el.labels || [])].find((l) => { const b = l.getBoundingClientRect(); return b.width >= 4 && b.height >= 4 && cs(l).visibility === 'visible'; });
    // A hit on an ancestor with nothing over the target: the target's centre is cut off by an overflow clip.
    let cut = '';
    if (hit && hit !== el && hit.contains(el)) for (let x = el.parentElement; x && x !== hit.parentElement && !cut; x = x.parentElement) {
      const b = x.getBoundingClientRect(), o = `${cs(x).overflowX}/${cs(x).overflowY}`;
      if (o !== 'visible/visible' && (cx < b.left || cx > b.right || cy < b.top || cy > b.bottom)) cut = `${tag(x)}, overflow: ${cs(x).overflowX === cs(x).overflowY ? cs(x).overflowX : o}`;
    }
    const opts = el.tagName === 'SELECT' ? [...el.options].map((o) => [o.value, o.label.trim()]) : null;
    return {
      rendered: !hidden && el.getClientRects().length > 0 && el.checkVisibility?.() !== false, hidden, visibility: cs(el).visibility, inView,
      box: [r.left - v.offsetLeft, r.top - v.offsetTop, r.width, r.height].map(Math.round), screen: [v.width, v.height].map(Math.round), scale: v.scale ?? 1,
      disabled: el.matches(':disabled') ? (el.hasAttribute('disabled') ? 'disabled attribute' : 'inside a disabled <fieldset>') : el.closest('[aria-disabled=true]') ? 'aria-disabled="true"' : inert ? `inert${inert === el ? '' : `, inside ${tag(inert)}`}` : '',
      readOnly: el.readOnly ? 'readonly attribute' : el.closest('[aria-readonly=true]') ? 'aria-readonly="true"' : '',
      noPointer: cs(el).pointerEvents === 'none',
      cover: !hit || el.contains(hit) || hit.contains(el) || [...(el.labels || [])].some((l) => l.contains(hit)) ? '' : tag(hit) + text(hit),
      cut, label: label ? ` "${short(label.innerText).replace(/^"|"$/g, '')}"` : '',
      noOption: opts && want != null && !opts.some(([val, lab]) => val === want || lab === want) ? opts.slice(0, 8).map(([val, lab]) => (lab && lab !== val ? `"${val}" (${lab})` : `"${val}"`)).join(', ') + (opts.length > 8 ? ` and ${opts.length - 8} more` : '') || 'none' : null,
    };
  }, want == null ? null : String(want), { timeout: 2000 }).catch(() => null);
  if (!d) return '';
  const pw = pwReason(e), pointer = POINTER.test(op);
  const where = `box ${d.box[2]}×${d.box[3]} at ${d.box[0]},${d.box[1]} of the ${d.screen[0]}×${d.screen[1]} screen${d.scale < 0.99 ? `, in CSS px shown at ${Math.round(d.scale * 100)}%` : ''}`;
  const drawn = d.label ? `act on what is drawn: its label${d.label}` : 'a styled control hiding the real one? act on what is drawn, e.g. its label';
  if (d.rendered && d.noOption !== null && !(d.disabled && NEEDS_ENABLED.test(op))) return `the list has no option ${JSON.stringify(String(want))} (by value or label); it offers ${d.noOption}`;
  const why = !d.rendered ? `not rendered (${d.hidden || 'no box'})`
    : d.visibility !== 'visible' ? `invisible (visibility: ${d.visibility})`
    : d.box[2] < 1 || d.box[3] < 1 ? `zero-size (${where}): ${drawn}`
    : d.box[2] <= 2 && d.box[3] <= 2 ? `visually hidden (${where}): ${drawn}`
    // Hover, focus and wait do not need an enabled target: a disabled button's tooltip is a state worth capturing.
    : d.disabled && NEEDS_ENABLED.test(op) ? `disabled (${d.disabled})`
    : d.readOnly && /^(fill|type)$/.test(op) ? `read-only (${d.readOnly})`
    // Only a pointer needs it on screen and uncovered: fill, select and wait do not scroll, and do not care.
    : !pointer ? (pw ? `Playwright says "${pw}" (${where})` : '')
    : !d.inView ? `outside the viewport (${where}): scrolling does not bring it in${d.label ? `; its label${d.label} is drawn: act on that` : ''}`
    : d.noPointer ? 'it ignores the pointer (pointer-events: none)'
    : d.cover ? `covered by ${d.cover} (${where})`
    : d.cut ? `its centre is cut off by ${d.cut} (${where})`
    // Nothing covers it, yet Playwright's hit test lands elsewhere: on a page wider than the screen its aim is off.
    // A real touch tap at the same spot reaches the target (old permit build), so this is the tool, not the product.
    : /intercepts pointer events/.test(pw) && await layoutNote(page) ? { tool: `Playwright's pointer check missed it: it aims at ${pw.replace(/\s*intercepts pointer events.*/, '')} though nothing covers the target — the test tool, not the product (its aim is off on a layout wider than the screen); a "tap" step acts on it at this device (${where})` }
    : pw ? `Playwright says "${pw}" (${where})` : '';
  return why?.tool || (why ? `exists but ${op === 'wait' ? 'never showed' : 'is not actionable'}: ${why}` : '');
}

const firstLine = (e) => String(e?.message || e).split('\n')[0];

/** Run the steps; returns { trail, dead, lastTap }. onStep(i, lastTap) runs after each step (for --each captures). */
async function run(page, steps = [], { touch = true, onStep } = {}) {
  const trail = [], dead = [];
  let lastTap = null, cdp = null;
  const loc = (sel) => page.locator(sel).first();
  const center = async (sel) => { const b = await loc(sel).boundingBox({ timeout: 4000 }).catch(() => null); if (!b) throw new Error(`"${sel}": no such element on screen`); return [b.x + b.width / 2, b.y + b.height / 2]; };
  for (const [i, s] of steps.entries()) {
    const [op] = Object.keys(s).filter((k) => k !== 'times');
    const v = s[op];
    // Where an error came from: the step's own action, or the --each capture after it (which must not blame the target).
    let stage = 'act';
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
      stage = 'after';
      await page.waitForTimeout(ACTS.has(op) ? 350 : 60);
      if (before) {
        await finishMotion(page).catch(() => {});
        const after = await page.screenshot({ scale: 'css' }).catch(() => null);
        // A few pixels is a caret or a clock; a real response (a sheet, a ring, a new row) changes far more.
        if (after && changedPixels(before, after) <= 12) dead.push(`step ${i + 1} (${op} ${show(v)}) changed nothing on screen`);
      }
      if (!['wait', 'eval', 'offline'].includes(op) && !trail.some((t) => t.startsWith(`${i + 1}. `))) trail.push(`${i + 1}. ${op} ${show(v)}`);
      stage = 'capture';
      if (onStep) await onStep(i, lastTap);
    } catch (e) {
      // Say why the target refused, not "Timeout 4000ms exceeded" or "not found or not actionable" — but only when
      // the action is what failed: a capture that failed after the step worked says so, and blames nothing else.
      const sel = ['fill', 'type', 'select'].includes(op) ? v?.[0] : op === 'swipe' ? v?.at : /^(click|dblclick|hover|focus|check|uncheck|tap|wait|scroll)$/.test(op) ? v : null;
      const why = stage === 'capture' ? `done, but the capture after it failed: ${firstLine(e)}`
        : (stage === 'act' && typeof sel === 'string' ? await whyNot(page, sel, e, op, op === 'select' ? v?.[1] : null).catch(() => '') : '') || firstLine(e);
      const note = await layoutNote(page).catch(() => '');
      const err = new Error(`step ${i + 1} (${op} ${show(v)}): ${[why, note].filter(Boolean).join('; ')}`);
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

// --axe: state-level "axe" wins, then the flag, then the file's.
const axeMode = (st) => (st.axe !== undefined ? st.axe : a.axe ? true : spec.axe) || false;
const axeWanted = (spec.states || []).some((st) => (!only || only.includes(st.name)) && axeMode(st));
const axePath = axeWanted ? resolveModule('axe-core/axe.min.js') : null;
if (axeWanted && !axePath) console.error(`⚠ --axe: axe-core is not installed — run \`npm install\` in ${scriptsDir}. States are captured but not scanned, and the run exits 1.`);
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

// What is open now: expanded disclosures, visible dialogs, open popovers. Compared before and after settling, it
// shows whether scrolling the page for the scan closed the very overlay the state opened.
const openThings = (page) => page.evaluate(() => {
  const shown = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
  let popovers = 0;
  try { popovers = document.querySelectorAll(':popover-open').length; } catch { /* no popover API */ }
  return { 'aria-expanded': document.querySelectorAll('[aria-expanded="true"]').length, dialogs: [...document.querySelectorAll('dialog[open], [role=dialog], [role=alertdialog], [aria-modal=true]')].filter(shown).length, popovers };
}).catch(() => null);

/** Scan the state's screen with axe-core, as audit.mjs does. Returns { violations, closed } (closed: what settling shut). */
async function axeScan(page, mode) {
  const before = await openThings(page);
  const at = await page.evaluate(() => [scrollX, scrollY]).catch(() => [0, 0]);
  if (mode === 'no-scroll') { await page.evaluate(async () => { await document.fonts?.ready; }).catch(() => {}); await decodeImages(page).catch(() => {}); }
  else await settle(page);
  // settle() ends at the top; the scan is of the state as the steps left it.
  await page.evaluate(([x, y]) => scrollTo(x, y), at).catch(() => {});
  await freezeMotion(page);
  const after = await openThings(page);
  const closed = before && after ? Object.keys(before).filter((k) => after[k] < before[k]).map((k) => `${k} ${before[k]} → ${after[k]}`) : [];
  await page.addScriptTag({ path: axePath }).catch(() => {});
  // A page whose Content-Security-Policy blocks the injected tag still takes the source through evaluate.
  if (!await page.evaluate(() => !!window.axe).catch(() => false)) await page.evaluate(await readFile(axePath, 'utf8'));
  const violations = await page.evaluate(async (tags) => {
    // The same two experimental rules as audit.mjs (tables without headers, name ≠ visible label), reported but never failing.
    const r = await window.axe.run(document, { runOnly: { type: 'tag', values: tags }, rules: { 'td-has-header': { enabled: true }, 'label-content-name-mismatch': { enabled: true } }, resultTypes: ['violations'] });
    const what = (s) => String(s || '').split('\n').map((l) => l.trim()).find((l) => l && !/^Fix (any|all) of the following:?$/i.test(l)) || '';
    return r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, experimental: v.tags.includes('experimental'), nodes: v.nodes.length, targets: v.nodes.map((n) => n.target.join(' ')), failureSummary: what(v.nodes[0]?.failureSummary) }));
  }, AXE_TAGS);
  return { violations, closed };
}
const axeBlocks = (v) => !v.experimental && (v.impact === 'critical' || v.impact === 'serious');
const axeLine = (vs) => `axe: ${vs.length ? vs.map((v) => `${v.id} (${v.impact}, ${v.nodes}${v.experimental ? ', experimental' : ''})`).join(', ') : 'no violations'}`;

// A Markdown table cell: a "|" in a covering element's text (breadcrumbs, nav separators) would split the row.
const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');

const { browser } = await launch({ chrome: a.chrome, gpu: !!a.gpu, headless: !a.headed });
const results = [];
const shots = []; // every capture so far, for the identical-pair check
let anyRecorded = false;
const reqDir = path.join(outDir, 'requests', ...(a.label ? [String(a.label)] : []));
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
      const element = shot !== 'viewport' && shot !== 'full';
      if (element && !await page.locator(shot).count().catch(() => 0)) { await unmarkTap(page); throw new Error(`"shot": "${shot}" matches nothing on this screen (did a step remove or replace it?)`); }
      const buf = !element ? await page.screenshot({ path: f, fullPage: shot === 'full' }) : await page.locator(shot).first().screenshot({ path: f, timeout: 5000 });
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
      // After the capture, so the scan never changes what was captured.
      const mode = axeMode(st);
      if (mode && axePath) {
        try {
          const { violations, closed } = await axeScan(page, mode);
          entry.axe = { violations, fail: violations.some(axeBlocks), file: `${stem}.axe.json` };
          if (closed.length) entry.axe.closed = `settling for the scan closed something (${closed.join(', ')}): the scan is of the screen after that — "axe": "no-scroll" scans without scrolling`;
          await writeFile(entry.axe.file, JSON.stringify({ state: st.name, device: entry.device, label: a.label || null, url: page.url(), tags: AXE_TAGS, ...(closed.length ? { closedBySettling: closed } : {}), violations }, null, 1) + '\n');
        } catch (e) {
          entry.axe = { violations: [], fail: true, error: `axe scan failed: ${firstLine(e)}` };
        }
      } else if (mode) entry.axe = { violations: [], fail: true, error: 'axe-core not installed: not scanned' };
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
      // One folder per label: the old and the new build run into the same --out never overwrite each other's
      // recordings, and parity.mjs --payloads is given two different folders, so a build never pairs with itself.
      const f = path.join(reqDir, `${st.name}-${entry.device}${label}.json`);
      await mkdir(path.dirname(f), { recursive: true });
      const prev = await readFile(f, 'utf8').then(JSON.parse).catch(() => null);
      await writeFile(f, JSON.stringify({ state: st.name, device: entry.device, label: a.label || null, base, requests }, null, 1) + '\n');
      entry.recorded = requests.length ? `◇ recorded ${requests.map((r) => `${r.method} ${new URL(r.url).pathname}`).join(', ')} → ${path.relative(outDir, f)}`
        : `⚠ recorded nothing: no request matched ${[...recordGlobs.map((g) => (g === true ? 'any non-GET' : g)), ...routes.filter((r) => r.record).map((r) => r.url)].join(', ')} (wrong glob, or the submit never happened)`;
      if (prev?.base && prev.base !== base) entry.recorded += `\n   ⚠ replaced a recording of ${prev.base}${prev.label ? ` labelled "${prev.label}"` : ''}: give each build its own --label (or --out), or the old build's payloads are lost`;
      anyRecorded = true;
    }
    results.push(entry);
    const ax = entry.axe;
    console.log(`${entry.file && !ax?.fail ? '✓' : '✗'} ${st.name} (${entry.device})${entry.file ? `  ${entry.file}` : ''}${ax && !ax.error ? `  ${axeLine(ax.violations)}` : ''}${ax?.error ? `\n   ⚠ ${ax.error}` : ''}${ax?.closed ? `\n   ⚠ ${ax.closed}` : ''}${ax?.fail && !ax.error ? `\n   ⚠ axe: critical or serious violation — the state fails; details in ${path.basename(ax.file)}` : ''}${entry.note ? `\n   ⚠ ${entry.note}` : ''}${entry.dead.map((d) => `\n   ⚠ ${d}`).join('')}${entry.recorded ? `\n   ${entry.recorded}` : ''}${errors.length ? `\n   ${errors.length} error(s): ${errors.slice(0, 2).join(' | ')}` : ''}${a.aria || each ? entry.trail.map((t) => `\n     ${t}`).join('') : ''}`);
    await ctx.close();
  }
} finally {
  await browser.close();
}

const md = ['# States', '', `${base} · ${results.length} states · ${new Date().toISOString().slice(0, 16)}`, '', '| State | Device | Capture | Errors | Note |', '| --- | --- | --- | --- | --- |',
  ...results.map((r) => {
    const ax = r.axe && (r.axe.error ? r.axe.error : `${r.axe.fail ? '✗ ' : ''}${axeLine(r.axe.violations)}${r.axe.closed ? ` (${r.axe.closed})` : ''}`);
    return `| ${cell(r.name)} | ${cell(r.device)} | ${r.file ? cell(path.basename(r.file)) : '—'} | ${r.errors.length || ''} | ${cell([r.note, ax, ...r.dead, r.recorded].filter(Boolean).join('; '))} |`;
  })];
const walked = results.filter((r) => r.trail.length);
if (walked.length) md.push('', '## Steps', '', ...walked.flatMap((r) => [`**${r.name}** (${r.device})`, '', ...r.trail.map((t) => `    ${t}`), '']));
await writeFile(path.join(outDir, `states${label}.md`), md.join('\n') + '\n');
const scanned = results.filter((r) => r.axe), axeFailed = scanned.filter((r) => r.axe.fail);
console.log(`\n${results.filter((r) => r.file).length}/${results.length} captured${scanned.length ? ` · axe: ${axeFailed.length ? `${axeFailed.length} of ${scanned.length} scanned state(s) fail (${axeFailed.map((r) => r.name).join(', ')})` : `${scanned.length} scanned, none with a critical or serious violation`}` : ''} · summary ${path.join(outDir, `states${label}.md`)} · sheet: node compare.mjs --grid ${outDir}/*.png --out ${outDir}/sheet.png`);
if (anyRecorded) console.log(`requests: ${reqDir} · diff two builds' recordings: node parity.mjs --payloads ${a.label ? `${path.join(outDir, 'requests', '<old label>')} ${path.join(outDir, 'requests', '<new label>')}` : '<old out dir> <new out dir>'}`);
process.exitCode = results.some((r) => !r.file || r.axe?.fail) || (axeWanted && !axePath) ? 1 : 0;
