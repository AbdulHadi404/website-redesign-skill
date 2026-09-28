#!/usr/bin/env node
/**
 * Drive widgets into their states and capture each one: the state matrix
 * (app-ui.md §2) rendered, not imagined.
 *
 *   node states.mjs states.json [--base http://localhost:3000] [--out captures/states] [--label after] [--only name,name]
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
 * select [sel, value], wait (ms or selector), scroll (selector, or a y offset), reload, offline (true/false),
 * viewport {width, height}, eval (a JS expression run in the page — your own config, your own risk).
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

const a = parseArgs();
const file = a._[0];
if (!file) { console.error('Usage: node states.mjs states.json [--base URL] [--out dir] [--label name] [--only a,b]'); process.exit(2); }
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

async function run(page, steps = []) {
  for (const s of steps) {
    const [op] = Object.keys(s).filter((k) => k !== 'times');
    const v = s[op];
    const loc = (sel) => page.locator(sel).first();
    switch (op) {
      case 'click': case 'dblclick': case 'hover': case 'focus': case 'check': case 'uncheck':
        // An opaque sticky bar over the target intercepts pointer clicks; fall back to the element's own method.
        await loc(v)[op]({ timeout: 4000 }).catch(async () => {
          if (op === 'click' || op === 'focus') await loc(v).evaluate((el, o) => el[o](), op, { timeout: 2000 }).catch(() => { throw new Error(`${op} "${v}": no such element`); });
          else throw new Error(`${op} "${v}": not found or not actionable`);
        });
        break;
      case 'fill': await loc(v[0]).fill(String(v[1]), { timeout: 4000 }); break;
      case 'type': await loc(v[0]).pressSequentially(String(v[1]), { delay: 30, timeout: 4000 }); break;
      case 'select': await loc(v[0]).selectOption(String(v[1]), { timeout: 4000 }); break;
      case 'press': for (let i = 0; i < (s.times || 1); i++) await page.keyboard.press(v); break;
      case 'wait': typeof v === 'number' ? await page.waitForTimeout(v) : await page.waitForSelector(v, { timeout: 8000 }); break;
      case 'scroll': typeof v === 'number' ? await page.evaluate((y) => scrollTo(0, y), v) : await loc(v).scrollIntoViewIfNeeded(); break;
      case 'reload': await page.reload({ waitUntil: 'load' }).catch(() => {}); await page.waitForTimeout(400); break;
      case 'offline': await page.context().setOffline(!!v); break;
      case 'viewport': await page.setViewportSize({ width: v.width, height: v.height }); break;
      case 'eval': await page.evaluate(v); break;
      default: throw new Error(`unknown step "${op}"`);
    }
    await page.waitForTimeout(60);
  }
}

const { browser } = await launch({ chrome: a.chrome });
const results = [];
let first = null;
try {
  for (const st of spec.states || []) {
    if (only && !only.includes(st.name)) continue;
    const dev = st.device || spec.device;
    const ctx = await browser.newContext({ ...device(dev), ...(spec.context || {}), ...(st.context || {}), serviceWorkers: st.serviceWorkers || 'allow' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(`page error: ${String(e.message || e).split('\n')[0]}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text().slice(0, 160)}`); });
    const storage = { ...(spec.storage || {}), ...(st.storage || {}) };
    if (Object.keys(storage).length) await ctx.addInitScript((kv) => { try { for (const [k, v] of Object.entries(kv)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); } catch { /* storage blocked */ } }, storage);
    await applyRoutes(page, [].concat(spec.route || [], st.route || []));
    const url = urlFor(base, st.path || spec.path || '/');
    const entry = { name: st.name, device: deviceName(dev), file: null, errors, note: '' };
    try {
      // A delayed route keeps the page "loading" on purpose: do not wait for the network to go quiet.
      if ([].concat(st.route || []).some((r) => r.delay)) await page.goto(url, { waitUntil: 'commit' }).catch(() => {});
      else await open(page, url);
      await page.waitForTimeout(st.settle ?? 300);
      await run(page, st.steps);
      await finishMotion(page).catch(() => {});
      const f = path.join(outDir, `${st.name}-${entry.device}${label}.png`);
      const shot = st.shot || 'viewport';
      let buf;
      if (shot === 'viewport' || shot === 'full') buf = await page.screenshot({ path: f, fullPage: shot === 'full' });
      else buf = await page.locator(shot).first().screenshot({ path: f, timeout: 5000 });
      entry.file = f;
      if (!first) first = { name: st.name, buf, shot, device: entry.device };
      else if (first.shot === shot && first.device === entry.device && identical(first.buf, buf)) entry.note = `identical to "${first.name}" — the scenario probably did not take effect (selector, route pattern?)`;
    } catch (e) {
      entry.note = `failed: ${String(e.message || e).split('\n')[0]}`;
    }
    results.push(entry);
    console.log(`${entry.file ? '✓' : '✗'} ${st.name} (${entry.device})${entry.file ? `  ${entry.file}` : ''}${entry.note ? `\n   ⚠ ${entry.note}` : ''}${errors.length ? `\n   ${errors.length} error(s): ${errors.slice(0, 2).join(' | ')}` : ''}`);
    await ctx.close();
  }
} finally {
  await browser.close();
}

const md = ['# States', '', `${base} · ${results.length} states · ${new Date().toISOString().slice(0, 16)}`, '', '| State | Device | Capture | Errors | Note |', '| --- | --- | --- | --- | --- |',
  ...results.map((r) => `| ${r.name} | ${r.device} | ${r.file ? path.basename(r.file) : '—'} | ${r.errors.length || ''} | ${r.note} |`)];
await writeFile(path.join(outDir, `states${label}.md`), md.join('\n') + '\n');
console.log(`\n${results.filter((r) => r.file).length}/${results.length} captured · summary ${path.join(outDir, `states${label}.md`)} · sheet: node compare.mjs --grid ${outDir}/*.png --out ${outDir}/sheet.png`);
process.exitCode = results.some((r) => !r.file) ? 1 : 0;
