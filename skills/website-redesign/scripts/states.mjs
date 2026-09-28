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
 *       { "name": "saved",    "storage": { "checked": "[\"IE1111\"]" } }
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
 * visible is reported ("dead tap"). A failing step still leaves a capture (…-failed.png) of where it stopped.
 * Routes: url (glob), delay (ms), abort, status, body, json, file, contentType; several routes as a list.
 * "shot": "viewport" (default) | "full" | a selector (element capture, 2× density).
 *
 * Every state gets a fresh context. Console and page errors are recorded per state. A state whose capture is
 * pixel-identical to the first state's (usually "idle") is flagged: the scenario most likely did not take
 * effect — a wrong selector, a route that never matched — and the capture proves nothing.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
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
const identical = (x, y) => {
  if (!PNG || !pixelmatch) return false;
  const p = PNG.sync.read(x), q = PNG.sync.read(y);
  if (p.width !== q.width || p.height !== q.height) return false;
  // Near-identical counts too: a clock ticking between loads changes a few hundred pixels; a real state change
  // (even one focus ring) changes thousands.
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

async function applyRoutes(page, routes) {
  for (const r of [].concat(routes || [])) {
    await page.route(r.url, async (route) => {
      if (r.delay) await new Promise((res) => setTimeout(res, r.delay));
      if (r.abort) return route.abort(typeof r.abort === 'string' ? r.abort : 'internetdisconnected').catch(() => {});
      if (r.status || r.body !== undefined || r.json !== undefined || r.file) {
        const body = r.file ? await readFile(path.resolve(path.dirname(file), r.file)) : r.json !== undefined ? JSON.stringify(r.json) : r.body ?? '';
        return route.fulfill({ status: r.status || 200, body, contentType: r.contentType || (r.json !== undefined || /\.json$/.test(r.file || '') ? 'application/json' : 'text/plain') }).catch(() => {});
      }
      return route.continue().catch(() => {});
    }, r.times ? { times: r.times } : undefined);
  }
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
          await loc(v)[op]({ timeout: 4000 }).catch(async () => {
            if (op === 'click' || op === 'focus') {
              await loc(v).evaluate((el, o) => el[o](), op, { timeout: 2000 }).catch(() => { throw new Error(`${op} "${v}": no such element`); });
              if (op === 'click') trail.push(`   ${op} ${show(v)} was blocked for a pointer (covered?) and was dispatched to the element directly`);
            } else throw new Error(`${op} "${v}": not found or not actionable`);
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
      const err = new Error(`step ${i + 1} (${op} ${show(v)}): ${String(e.message || e).split('\n')[0]}`);
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
let first = null;
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
    await applyRoutes(page, [].concat(spec.route || [], st.route || []));
    const url = urlFor(base, st.path || spec.path || '/');
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
      if (!first) first = { name: st.name, buf, shot, device: entry.device };
      else if (!(a.aria && r.lastTap) && first.shot === shot && first.device === entry.device && identical(first.buf, buf)) entry.note = `identical to "${first.name}" — the scenario probably did not take effect (selector, route pattern?)`;
    } catch (e) {
      entry.trail = e.trail || entry.trail; entry.dead = e.dead || entry.dead;
      entry.note = `failed: ${String(e.message || e).split('\n')[0]}`;
      // Show where it stopped: the next step is chosen from this screen.
      const f = `${stem}-failed.png`;
      if (await page.screenshot({ path: f }).then(() => true).catch(() => false)) {
        entry.note += ` — screen at failure: ${path.basename(f)}`;
        if (a.aria) await writeFile(f.replace(/\.png$/, '.aria.yml'), await seenTree(page).catch(() => ''));
      }
    }
    results.push(entry);
    console.log(`${entry.file ? '✓' : '✗'} ${st.name} (${entry.device})${entry.file ? `  ${entry.file}` : ''}${entry.note ? `\n   ⚠ ${entry.note}` : ''}${entry.dead.map((d) => `\n   ⚠ ${d}`).join('')}${errors.length ? `\n   ${errors.length} error(s): ${errors.slice(0, 2).join(' | ')}` : ''}${a.aria || each ? entry.trail.map((t) => `\n     ${t}`).join('') : ''}`);
    await ctx.close();
  }
} finally {
  await browser.close();
}

const md = ['# States', '', `${base} · ${results.length} states · ${new Date().toISOString().slice(0, 16)}`, '', '| State | Device | Capture | Errors | Note |', '| --- | --- | --- | --- | --- |',
  ...results.map((r) => `| ${r.name} | ${r.device} | ${r.file ? path.basename(r.file) : '—'} | ${r.errors.length || ''} | ${[r.note, ...r.dead].filter(Boolean).join('; ')} |`)];
const walked = results.filter((r) => r.trail.length);
if (walked.length) md.push('', '## Steps', '', ...walked.flatMap((r) => [`**${r.name}** (${r.device})`, '', ...r.trail.map((t) => `    ${t}`), '']));
await writeFile(path.join(outDir, `states${label}.md`), md.join('\n') + '\n');
console.log(`\n${results.filter((r) => r.file).length}/${results.length} captured · summary ${path.join(outDir, `states${label}.md`)} · sheet: node compare.mjs --grid ${outDir}/*.png --out ${outDir}/sheet.png`);
process.exitCode = results.some((r) => !r.file) ? 1 : 0;
