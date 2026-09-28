#!/usr/bin/env node
/**
 * run-toy.mjs — the accessible-canvas experiment.
 *
 * Four versions of one drag-and-drop toy ("top the cake") over one shared model:
 *   a  canvas only (the common build)
 *   b  canvas + parallel DOM: focusable proxies, keyboard moves, narration, tap-to-place
 *   c  form only: radios, selects, buttons; the canvas is a labelled picture
 *   d  b + c: proxies over the canvas and the list beside it
 *   e  PixiJS 8 with its built-in AccessibilitySystem on defaults (accessible = true,
 *      accessibleTitle on every object, click on a palette entry adds at the centre)
 *   f  e with accessibilityOptions.enabledByDefault = true (the overlay exists from load)
 * For each: accessibility tree at load and after the tasks, a keyboard walkthrough of
 * three tasks, drag and single-pointer walkthroughs, reduced-motion frames, idle rAF,
 * sound defaults, axe-core, the skill's a11y.mjs, a canvas probe, byte and line cost,
 * and (b) the per-frame cost of keeping proxies over moving objects (5 runs, median).
 *
 *   node run-toy.mjs [--quick]      writes results/toy.json and shots/*.jpg
 */
import { mkdir, readFile, writeFile, mkdtemp, rm, copyFile } from 'node:fs/promises';
import os from 'node:os';
import { gzipSync } from 'node:zlib';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './lib/serve.mjs';
import { probeCanvas } from './lib/probe-canvas.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const SKILL_SCRIPTS = path.resolve(here, '../../../../skills/website-redesign/scripts');
const { launch } = await import(path.join(SKILL_SCRIPTS, 'lib/env.mjs'));
const QUICK = process.argv.includes('--quick');
const RUNS = QUICK ? 1 : 5;
const ONLY = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1].split(',') : null;
const toyDir = path.join(here, 'toy');
const VARIANTS = [
  { id: 'a', file: 'a-canvas.html', label: 'canvas only' },
  { id: 'b', file: 'b-proxies.html', label: 'canvas + focusable proxies' },
  { id: 'c', file: 'c-form.html', label: 'form alternative only' },
  { id: 'd', file: 'd-hybrid.html', label: 'canvas + proxies + list' },
  { id: 'e', file: 'e-pixi.html', label: 'PixiJS 8 AccessibilitySystem defaults' },
  { id: 'f', file: 'f-pixi-enabled.html', label: 'PixiJS 8 AccessibilitySystem, enabledByDefault: true' },
];
const PIXI = path.join(here, 'node_modules/pixi.js/dist/pixi.min.mjs');
const PHONE_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36';
await mkdir(path.join(here, 'results'), { recursive: true });
await mkdir(path.join(here, 'shots'), { recursive: true });

// ---------- static cost ----------
async function cost(file) {
  const seen = new Set(), files = [];
  async function walk(f) {
    if (seen.has(f)) return; seen.add(f);
    const src = await readFile(path.join(toyDir, f), 'utf8'); files.push([f, src]);
    for (const m of src.matchAll(/(?:from\s+|import\s+)['"]\.\/([\w-]+\.js)['"]/g)) await walk(m[1]);
    for (const m of src.matchAll(/href="([\w-]+\.css)"/g)) await walk(m[1]);
  }
  await walk(file);
  const own = files.filter(([f]) => !['style.css', 'bench.js'].includes(f));
  const all = own.map(([, s]) => s).join('\n');
  const loc = own.reduce((n, [, s]) => n + s.split('\n').filter((l) => l.trim() && !/^\s*\/\//.test(l)).length, 0);
  const out = { files: own.map(([f]) => f), bytes: Buffer.byteLength(all), gzipBytes: gzipSync(all, { level: 9 }).length, nonBlankLines: loc };
  if (files.some(([, s]) => s.includes('/vendor/pixi.mjs'))) {
    const eng = await readFile(PIXI);
    out.engine = { file: 'pixi.js@8.21.0 dist/pixi.min.mjs', bytes: eng.length, gzipBytes: gzipSync(eng, { level: 9 }).length };
  }
  return out;
}

// ---------- page instrumentation ----------
const INIT = () => {
  window.__ann = []; window.__audioContexts = 0; window.__raf = 0;
  const AC = window.AudioContext;
  if (AC) window.AudioContext = class extends AC { constructor(...a) { super(...a); window.__audioContexts++; } };
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (fn) => { window.__raf++; return raf(fn); };
  const live = (n) => !n ? null : n.nodeType === 1 ? n.closest('[role=status],[role=alert],[role=log],[aria-live]:not([aria-live=off])') : live(n.parentNode);
  new MutationObserver((ms) => {
    for (const m of ms) {
      const r = live(m.target);
      if (!r) continue;
      const t = r.textContent.trim();
      if (t && window.__ann[window.__ann.length - 1] !== t) window.__ann.push(t);
    }
  }).observe(document, { subtree: true, childList: true, characterData: true });
};

async function newPage(browser, base, v, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 }, reducedMotion: opts.reduce ? 'reduce' : 'no-preference', ...opts.ctx });
  await ctx.addInitScript(INIT);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error(`[${v.id}] pageerror`, e.message));
  await page.goto(`${base}/${v.file}`);
  await page.waitForFunction(() => window.__toy?.ready);
  await page.waitForTimeout(300);
  return { ctx, page, cdp: await ctx.newCDPSession(page) };
}

const INTERACTIVE = new Set(['button', 'link', 'radio', 'checkbox', 'combobox', 'textbox', 'slider', 'spinbutton', 'menuitem', 'tab', 'switch', 'listbox', 'option']);
async function axSummary(cdp) {
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  const live = nodes.filter((n) => !n.ignored && (['status', 'alert', 'log'].includes(n.role?.value) || n.properties?.some((p) => p.name === 'live' && p.value.value !== 'off')));
  const inter = nodes.filter((n) => !n.ignored && INTERACTIVE.has(n.role?.value));
  const texts = nodes.filter((n) => !n.ignored).flatMap((n) => [n.name?.value, n.value?.value]).filter(Boolean);
  const canvas = nodes.find((n) => n.role?.value === 'Canvas' || (n.role?.value === 'img' && /cake/i.test(n.name?.value || '')));
  return { interactive: inter.length, namedInteractive: inter.filter((n) => n.name?.value).length, liveRegions: live.length, texts, canvasNode: canvas ? { role: canvas.role?.value, name: canvas.name?.value || '' } : null };
}
// Is every topping, and where it is, perceivable from the tree (names and values)?
function stateCoverage(model, texts) {
  const items = model.items;
  const hit = items.filter((it) => texts.some((t) => t.includes(it.label) && t.toLowerCase().includes(it.where))
    || texts.some((t) => t.includes(it.label)) && texts.some((t) => t.toLowerCase() === it.where));
  return { items: items.length, perceivable: hit.length };
}
const modelView = (page) => page.evaluate(() => ({ items: window.__toy.model.state.items.map((it) => ({ kind: it.kind, label: window.__toy.model.label(it), where: window.__toy.model.where(it) })) }));

async function focused(page, cdp) {
  const { result } = await cdp.send('Runtime.evaluate', { expression: 'document.activeElement' });
  const info = await page.evaluate(() => {
    const e = document.activeElement;
    if (!e || e === document.body) return { body: true };
    const b = e.getBoundingClientRect(), cs = getComputedStyle(e);
    const ring = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2) || /\d+px \d+px \d+px \d+px/.test(cs.boxShadow || '');
    return { body: false, tag: e.tagName.toLowerCase(), ring, onScreen: b.width > 0 && b.height > 0 && b.bottom > 0 && b.top < innerHeight };
  });
  if (info.body) return info;
  const ax = await cdp.send('Accessibility.getPartialAXTree', { objectId: result.objectId, fetchRelatives: false });
  const n = ax.nodes[0] || {};
  return { ...info, role: n.role?.value, name: n.name?.value || '' };
}

// Where are the focusable stand-ins relative to what they stand for? (page px, worst case)
async function alignment(page) {
  return page.evaluate(() => {
    const t = window.__toy, v = t.view, m = t.model;
    const c = v.canvas.getBoundingClientRect(), k = c.width / v.W;
    const nameOf = (e) => (e.getAttribute('aria-label') || e.textContent.trim() || e.title || '');
    const btns = [...document.querySelectorAll('button')].filter((b) => b.offsetParent !== null || getComputedStyle(b).position === 'absolute');
    const centre = (e) => { const b = e.getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2, b.width, b.height]; };
    const errs = [], sizes = [];
    ['Strawberry', 'Candle', 'Flower', 'Star'].forEach((name, i) => {
      const b = btns.find((x) => nameOf(x) === name); if (!b) return;
      const [x, y] = centre(b);
      errs.push(Math.hypot(x - (c.x + v.PALETTE_X[i] * k), y - (c.y + (v.PALETTE_Y - 8) * k)));
    });
    for (const it of m.state.items) {
      const b = btns.find((x) => nameOf(x).startsWith(m.label(it) + ',') || nameOf(x) === m.label(it)); if (!b) continue;
      const [x, y, w, h] = centre(b); const [px, py] = v.toPx(it.x, it.y);
      errs.push(Math.hypot(x - (c.x + px * k), y - (c.y + py * k))); sizes.push(Math.round(Math.min(w, h)));
    }
    return errs.length ? { stand_ins: errs.length, maxErrorPx: +Math.max(...errs).toFixed(1), itemTargetMinCssPx: sizes.length ? Math.min(...sizes) : null } : null;
  });
}

// ---------- keyboard walkthrough ----------
function keyboard(page, cdp) {
  const log = { keys: 0, invisibleFocus: 0 };
  async function press(k) {
    await page.keyboard.press(k); log.keys++;
    await page.waitForTimeout(40);
    const f = await focused(page, cdp);
    if (!f.body && !(f.ring && f.onScreen)) log.invisibleFocus++;
    return f;
  }
  async function tabTo(match, { max = 40, shift = false } = {}) {
    for (let i = 0; i < max; i++) {
      const f = await press(shift ? 'Shift+Tab' : 'Tab');
      if (!f.body && match(f)) return f;
    }
    return null;
  }
  async function arrowTo(match, keys = ['ArrowRight', 'ArrowLeft'], max = 12) {
    // a knowledgeable user: try one direction, and if the target was passed, the other
    for (const k of keys) {
      for (let i = 0; i < max; i++) {
        const f = await focused(page, cdp);
        if (match(f)) return f;
        await press(k);
      }
    }
    return null;
  }
  return { log, press, tabTo, arrowTo };
}
const is = (role, re) => (f) => f.role === role && re.test(f.name);

async function keyboardTasks(page, cdp, strategy) {
  const kb = keyboard(page, cdp);
  const tasks = [];
  const has = async (fn) => page.evaluate(fn);
  async function task(name, run, check) {
    const k0 = kb.log.keys, a0 = await page.evaluate(() => window.__ann.length);
    let ok = false, err = null;
    try { await run(); await page.waitForTimeout(250); ok = await check(); } catch (e) { err = e.message; }
    const ann = await page.evaluate((n) => window.__ann.slice(n), a0);
    tasks.push({ name, ok, keys: kb.log.keys - k0, announcements: ann, ...(err ? { err } : {}) });
  }
  const strawberryAtCentre = () => has(() => window.__toy.model.state.items.some((i) => i.kind === 'strawberry' && window.__toy.model.where(i) === 'centre'));
  const candleTopLeft = () => has(() => window.__toy.model.state.items.some((i) => i.kind === 'candle' && window.__toy.model.where(i) === 'top left'));
  const noStrawberry = () => has(() => window.__toy.model.state.items.length > 0 && !window.__toy.model.state.items.some((i) => i.kind === 'strawberry'));

  if (strategy === 'none') {
    await task('T1 add a strawberry to the centre', async () => { if (!await kb.tabTo(() => true, { max: 10 })) throw new Error('nothing focusable'); }, strawberryAtCentre);
    await task('T2 add a candle at the top left', async () => {}, candleTopLeft);
    await task('T3 remove the strawberry', async () => {}, noStrawberry);
  }
  if (strategy === 'proxies') {
    await task('T1 add a strawberry to the centre', async () => {
      if (!await kb.tabTo(is('button', /^Strawberry$/))) throw new Error('palette not reached');
      await kb.press('Enter');
    }, strawberryAtCentre);
    await task('T2 add a candle at the top left', async () => {
      if (!await kb.tabTo(is('button', /^(Strawberry|Candle|Flower|Star)$/), { shift: true, max: 10 })) throw new Error('toolbar not reached');
      if (!await kb.arrowTo(is('button', /^Candle$/))) throw new Error('candle not reached');
      await kb.press('Enter');
      await page.waitForTimeout(100);
      for (let i = 0; i < 8; i++) {
        if (await candleTopLeft()) break;
        const where = await page.evaluate(() => { const m = window.__toy.model; const c = m.state.items.filter((x) => x.kind === 'candle').at(-1); return [c.x, c.y]; });
        await kb.press(where[1] > -0.4 ? 'Shift+ArrowUp' : 'Shift+ArrowLeft');
      }
    }, candleTopLeft);
    await task('T3 remove the strawberry', async () => {
      const f = await kb.tabTo(is('button', /^Strawberry 1/), { shift: true, max: 10 }) || await kb.tabTo(is('button', /^Strawberry 1/), { max: 20 });
      if (!f) throw new Error('strawberry not reached');
      await kb.press('Delete');
    }, noStrawberry);
  }
  if (strategy === 'form') {
    await task('T1 add a strawberry to the centre', async () => {
      if (!await kb.tabTo(is('radio', /^Strawberry$/))) throw new Error('kind group not reached');
      if (!await kb.tabTo(is('radio', /^Centre$/), { max: 3 })) throw new Error('zone group not reached');
      if (!await kb.tabTo(is('button', /^Add to cake$/), { max: 3 })) throw new Error('add not reached');
      await kb.press('Enter');
    }, strawberryAtCentre);
    await task('T2 add a candle at the top left', async () => {
      if (!await kb.tabTo(is('radio', /^(Strawberry|Candle|Flower|Star)$/), { shift: true, max: 4 })) throw new Error('kind group not reached');
      if (!await kb.arrowTo(is('radio', /^Candle$/))) throw new Error('candle not reached');
      if (!await kb.tabTo((f) => f.role === 'radio' && /^(Top|Left|Right|Bottom|Centre)/.test(f.name), { max: 3 })) throw new Error('zone group not reached');
      if (!await kb.arrowTo(is('radio', /^Top left$/), ['ArrowLeft', 'ArrowRight'])) throw new Error('top left not reached');
      if (!await kb.tabTo(is('button', /^Add to cake$/), { max: 3 })) throw new Error('add not reached');
      await kb.press('Enter');
    }, candleTopLeft);
    await task('T3 remove the strawberry', async () => {
      if (!await kb.tabTo(is('button', /^Remove Strawberry 1$/), { max: 20 })) throw new Error('remove not reached');
      await kb.press('Enter');
    }, noStrawberry);
  }
  if (strategy === 'engine') {
    // Pixi's layer appears on the first Tab; Enter on its <button> is a click.
    await task('T1 add a strawberry to the centre', async () => {
      if (!await kb.tabTo(is('button', /^Strawberry$/))) throw new Error('palette not reached');
      await kb.press('Enter');
    }, strawberryAtCentre);
    await task('T2 add a candle at the top left', async () => {
      if (!await kb.tabTo(is('button', /^Candle$/), { shift: true, max: 12 }) && !await kb.tabTo(is('button', /^Candle$/), { max: 12 })) throw new Error('candle not reached');
      await kb.press('Enter');
      await page.waitForTimeout(100);
      const f = await kb.tabTo(is('button', /^Candle 1/), { max: 12 });
      if (!f) throw new Error('added candle not reached');
      for (const k of ['Shift+ArrowUp', 'Shift+ArrowLeft', 'ArrowUp', 'ArrowLeft']) await kb.press(k);
    }, candleTopLeft);
    await task('T3 remove the strawberry', async () => {
      const f = await kb.tabTo(is('button', /^Strawberry 1/), { shift: true, max: 12 }) || await kb.tabTo(is('button', /^Strawberry 1/), { max: 12 });
      if (!f) throw new Error('strawberry not reached');
      await kb.press('Delete'); await kb.press('Enter');
    }, noStrawberry);
  }
  return { tasks, totalKeys: kb.log.keys, invisibleFocusStops: kb.log.invisibleFocus, completed: tasks.filter((t) => t.ok).length };
}

// ---------- pointer walkthroughs ----------
async function geometry(page) {
  return page.evaluate(() => {
    const v = window.__toy.view, r = v.canvas.getBoundingClientRect(), k = r.width / v.W;
    return { x: r.x, y: r.y, k, px: v.PALETTE_X, py: v.PALETTE_Y - 8, cx: 240, cy: 220, R: v.R };
  });
}
const at = (g, x, y) => [g.x + x * g.k, g.y + y * g.k];
const cake = (g, x, y) => at(g, g.cx + x * g.R, g.cy + y * g.R);
async function dragFromTo(page, [x0, y0], [x1, y1]) {
  await page.mouse.move(x0, y0); await page.mouse.down();
  await page.mouse.move(x1, y1, { steps: 12 }); await page.mouse.up();
  await page.waitForTimeout(150);
}
async function clickAt(page, [x, y]) { await page.mouse.click(x, y); await page.waitForTimeout(120); }
async function pointerTasks(page, mode) {
  const g = await geometry(page);
  const items = () => page.evaluate(() => window.__toy.model.state.items.map((i) => ({ kind: i.kind, x: i.x, y: i.y, where: window.__toy.model.where(i) })));
  const res = [];
  const check = async (name, fn, actions) => res.push({ name, ok: await fn(await items()), actions });
  if (mode === 'drag') {
    await dragFromTo(page, at(g, g.px[0], g.py), cake(g, 0, 0));
    await check('T1 drag strawberry to centre', (s) => s.some((i) => i.kind === 'strawberry' && i.where === 'centre'), 1);
    await dragFromTo(page, at(g, g.px[1], g.py), cake(g, -0.5, -0.5));
    await check('T2 drag candle to top left', (s) => s.some((i) => i.kind === 'candle' && i.where === 'top left'), 1);
    const s = (await items()).find((i) => i.kind === 'strawberry');
    if (s) await dragFromTo(page, cake(g, s.x, s.y), cake(g, 1.25, -1.05));
    await check('T3 drag strawberry off the cake', (s2) => !s2.some((i) => i.kind === 'strawberry') && s2.length > 0, 1);
  } else if (mode === 'tap') {
    await clickAt(page, at(g, g.px[0], g.py)); await clickAt(page, cake(g, 0, 0));
    await check('T1 tap strawberry, tap centre', (s) => s.some((i) => i.kind === 'strawberry' && i.where === 'centre'), 2);
    await clickAt(page, at(g, g.px[1], g.py)); await clickAt(page, cake(g, -0.5, -0.5));
    await check('T2 tap candle, tap top left', (s) => s.some((i) => i.kind === 'candle' && i.where === 'top left'), 2);
    const s = (await items()).find((i) => i.kind === 'strawberry');
    let n = 0;
    if (s) {
      await clickAt(page, cake(g, s.x, s.y)); n++;
      const rm = page.locator('.remove-float:not([hidden])');
      if (await rm.count()) { await rm.click(); n++; await page.waitForTimeout(120); }
    }
    await check('T3 tap strawberry, tap Remove', (s2) => !s2.some((i) => i.kind === 'strawberry') && s2.length > 0, n);
  } else if (mode === 'form') {
    await page.getByRole('button', { name: 'Add to cake' }).click();
    await check('T1 click Add to cake (defaults)', (s) => s.some((i) => i.kind === 'strawberry' && i.where === 'centre'), 1);
    await page.getByRole('radio', { name: 'Candle' }).click(); await page.getByRole('radio', { name: 'Top left' }).click();
    await page.getByRole('button', { name: 'Add to cake' }).click();
    await check('T2 click Candle, Top left, Add', (s) => s.some((i) => i.kind === 'candle' && i.where === 'top left'), 3);
    await page.getByRole('button', { name: 'Remove Strawberry 1' }).click();
    await check('T3 click Remove Strawberry 1', (s) => !s.some((i) => i.kind === 'strawberry') && s.length > 0, 1);
  }
  return res;
}

// ---------- motion, idle, sound ----------
async function motionFrames(page) {
  return page.evaluate(async () => {
    const t = window.__toy, c = t.view.canvas;
    await new Promise((r) => setTimeout(r, 600));
    const f0 = t.view.frames;
    t.model.add('flower', 0.3, 0.3, { exact: true });
    await new Promise((r) => setTimeout(r, 60));
    const seen = new Set();
    for (let i = 0; i < 12; i++) { seen.add(c.toDataURL().length + ':' + c.toDataURL().slice(-64)); await new Promise((r) => setTimeout(r, 40)); }
    return { distinctFrames60to540ms: seen.size, framesRendered: t.view.frames - f0 };
  });
}
async function idleRaf(page) {
  return page.evaluate(async () => { await new Promise((r) => setTimeout(r, 1500)); const a = window.__raf; await new Promise((r) => setTimeout(r, 1000)); return window.__raf - a; });
}

// ---------- axe and the skill's a11y.mjs ----------
async function axe(page) {
  const src = await readFile(path.join(SKILL_SCRIPTS, 'node_modules/axe-core/axe.min.js'), 'utf8');
  await page.addScriptTag({ content: src });
  return page.evaluate(async () => {
    const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } });
    return { violations: r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })), passes: r.passes.length, incomplete: r.incomplete.map((v) => v.id) };
  });
}
const exec = promisify(execFile);
async function skillA11y(url, out) {
  // a11y.mjs writes PNG evidence too; keep only its JSON and ARIA snapshot in the repo.
  const tmp = await mkdtemp(path.join(os.tmpdir(), 's6-a11y-'));
  try {
    await exec(process.execPath, [path.join(SKILL_SCRIPTS, 'a11y.mjs'), url, '--out', tmp, '--tabs', '40'], { timeout: 240000, maxBuffer: 1 << 24 });
  } catch (e) { /* exits non-zero on FAIL; audit.json is still written */ }
  await rm(out, { recursive: true, force: true }); await mkdir(out, { recursive: true });
  for (const f of ['audit.json', 'aria-snapshot.yml']) await copyFile(path.join(tmp, f), path.join(out, f)).catch(() => {});
  await rm(tmp, { recursive: true, force: true });
  try {
    const j = JSON.parse(await readFile(path.join(out, 'audit.json'), 'utf8'));
    const by = (lvl) => j.findings.filter((f) => f.level === lvl);
    return { FAIL: by('FAIL').length, WARN: by('WARN').length, fails: by('FAIL').map((f) => `${f.section} ${f.sc}: ${f.msg}`.slice(0, 160)), warns: by('WARN').map((f) => `${f.section} ${f.sc}: ${f.msg}`.slice(0, 160)) };
  } catch (e) { return { error: e.message }; }
}

// ---------- main ----------
const srv = await serve(toyDir, { '/vendor/pixi.mjs': PIXI });
const { browser } = await launch();
const results = { date: new Date().toISOString(), chromium: browser.version(), runs: RUNS, variants: {} };
try {
  for (const v of VARIANTS.filter((x) => !ONLY || ONLY.includes(x.id))) {
    const r = { label: v.label, cost: await cost(v.file) };
    console.error(`--- ${v.id}: ${v.label}`);
    // accessibility tree at load, idle rAF, sound
    { const { ctx, page, cdp } = await newPage(browser, srv.base, v);
      const ax = await axSummary(cdp);
      r.axAtLoad = { interactive: ax.interactive, namedInteractive: ax.namedInteractive, liveRegions: ax.liveRegions, canvasNode: ax.canvasNode };
      // Does the accessible layer exist before any key (screen-reader browse mode), survive a mouse move, and come back on Tab?
      await page.mouse.move(200, 200); await page.mouse.move(260, 240, { steps: 4 }); await page.waitForTimeout(250);
      const afterMouse = await axSummary(cdp);
      await page.keyboard.press('Tab'); await page.waitForTimeout(250);
      const afterTab = await axSummary(cdp);
      r.axLifecycle = { atLoad: ax.interactive, afterMouseMove: afterMouse.interactive, afterThenTab: afterTab.interactive,
        genericNames: afterTab.texts.filter((t) => /^container \d+$/.test(t)).length };
      r.idleRafPerSecond = await idleRaf(page);
      r.audioContextsAtLoad = await page.evaluate(() => window.__audioContexts);
      await ctx.close(); }
    // keyboard
    const strategies = { a: ['none'], b: ['proxies'], c: ['form'], d: ['proxies', 'form'], e: ['engine'], f: ['engine'] }[v.id];
    r.keyboard = {};
    for (const s of strategies) {
      const { ctx, page, cdp } = await newPage(browser, srv.base, v);
      r.keyboard[s] = await keyboardTasks(page, cdp, s);
      const ax = await axSummary(cdp);
      r.keyboard[s].stateFromTree = stateCoverage(await modelView(page), ax.texts);
      if (s === strategies[0]) {
        r.audioContextsAfterTasks = await page.evaluate(() => window.__audioContexts);
        const snd = page.getByRole('button', { name: 'Sound' });
        if (await snd.count()) {
          await snd.click();
          r.sound = { contextsAfterToggle: await page.evaluate(() => window.__audioContexts), ariaPressed: await snd.getAttribute('aria-pressed') };
        }
        // leave a visible keyboard focus on a topping for the screenshot
        if (s === 'proxies') { await page.keyboard.press('Shift+Tab'); await page.waitForTimeout(100); }
        await page.screenshot({ path: path.join(here, 'shots', `toy-${v.id}.jpg`), type: 'jpeg', quality: 72 });
      }
      await ctx.close();
    }
    // pointer
    r.pointer = {};
    for (const m of v.id === 'c' ? ['form'] : ['drag', 'tap']) {
      const { ctx, page } = await newPage(browser, srv.base, v);
      r.pointer[m] = await pointerTasks(page, m);
      await ctx.close();
    }
    // reduced motion vs default
    r.motion = {};
    for (const reduce of [false, true]) {
      const { ctx, page } = await newPage(browser, srv.base, v, { reduce });
      r.motion[reduce ? 'reduce' : 'noPreference'] = await motionFrames(page);
      await ctx.close();
    }
    // is a seeded state (three toppings) perceivable from the accessibility tree?
    { const { ctx, page, cdp } = await newPage(browser, srv.base, v);
      await page.evaluate(() => { const m = window.__toy.model; m.addToZone('strawberry', 'centre'); m.addToZone('candle', 'top-left'); m.addToZone('star', 'bottom-right'); });
      await page.waitForTimeout(500);
      await page.keyboard.press('Tab'); await page.waitForTimeout(300); // engine layers appear on Tab
      const ax = await axSummary(cdp);
      r.seededStateFromTree = stateCoverage(await modelView(page), ax.texts);
      r.alignment = await alignment(page);
      // Do names follow the state? Move Strawberry 1 from the centre to the top left (as a drag would).
      await page.evaluate(() => { const m = window.__toy.model; const s = m.state.items.find((i) => i.kind === 'strawberry'); m.move(s.id, -0.55, -0.5); });
      await page.waitForTimeout(400);
      const ax2 = await axSummary(cdp);
      const said = ax2.texts.filter((t) => /Strawberry 1/.test(t));
      r.namesTrackState = { strawberryNames: [...new Set(said)], current: said.some((t) => /top left/.test(t)), stale: said.some((t) => /centre/.test(t)) };
      await ctx.close(); }
    // phone: 390 px, touch; overflow, proxy alignment after scaling, touch tap and touch drag
    { const { ctx, page, cdp } = await newPage(browser, srv.base, v, { ctx: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, userAgent: PHONE_UA } });
      const ph = { horizontalOverflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth) };
      { const a = await axSummary(cdp); ph.axInteractiveAtLoad = a.interactive; ph.axNames = a.texts.slice(0, 12); }
      if (v.id !== 'c') {
        await page.evaluate(() => { const m = window.__toy.model; m.addToZone('strawberry', 'centre'); m.addToZone('candle', 'top-left'); });
        await page.waitForTimeout(500);
        ph.alignment = await alignment(page);
        await page.evaluate(() => { const m = window.__toy.model; for (const it of [...m.state.items]) m.remove(it.id); });
        await page.waitForTimeout(500);
        const g = await geometry(page);
        const [px, py] = at(g, g.px[0], g.py), [cx, cy] = cake(g, 0, 0);
        await page.touchscreen.tap(px, py); await page.waitForTimeout(120);
        await page.touchscreen.tap(cx, cy); await page.waitForTimeout(200);
        ph.touchTapPlace = await page.evaluate(() => window.__toy.model.state.items.length === 1);
        const [qx, qy] = at(g, g.px[1], g.py), [tx, ty] = cake(g, -0.5, -0.5);
        const pt = (x, y) => [{ x, y, id: 1 }];
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(qx, qy) });
        for (let i = 1; i <= 10; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(qx + (tx - qx) * i / 10, qy + (ty - qy) * i / 10) });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await page.waitForTimeout(200);
        ph.touchDragPlace = await page.evaluate(() => window.__toy.model.state.items.some((i) => i.kind === 'candle'));
      } else {
        await page.getByRole('button', { name: 'Add to cake' }).tap(); await page.waitForTimeout(150);
        ph.touchTapPlace = await page.evaluate(() => window.__toy.model.state.items.length === 1);
      }
      await page.screenshot({ path: path.join(here, 'shots', `toy-${v.id}-phone.jpg`), type: 'jpeg', quality: 70 });
      r.phone = ph;
      await ctx.close(); }
    // automated checkers on a populated state
    { const { ctx, page } = await newPage(browser, srv.base, v);
      await page.evaluate(() => { const m = window.__toy.model; m.add('strawberry', 0, 0); m.add('candle', -0.5, -0.5); });
      await page.waitForTimeout(600);
      r.axe = await axe(page);
      await ctx.close(); }
    { const { ctx, page } = await newPage(browser, srv.base, v, { reduce: true });
      r.probe = await probeCanvas(page, { reduce: true });
      await ctx.close(); }
    r.skillA11y = await skillA11y(`${srv.base}/${v.file}`, path.join(here, 'results', 'a11y', v.id));
    results.variants[v.id] = r;
  }
  // proxy sync cost: b with proxies on vs off, n toppings all moving every frame
  const bench = [];
  for (const n of !ONLY || ONLY.includes('b') ? [10, 50, 200] : []) {
    for (const on of [false, true]) {
      const js = [], style = [], layout = [], gap = [];
      for (let i = 0; i < RUNS; i++) {
        const { ctx, page, cdp } = await newPage(browser, srv.base, VARIANTS[1]);
        await cdp.send('Performance.enable');
        const m0 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
        const b = await page.evaluate(([n, on]) => window.__toy.bench(n, 180, on), [n, on]);
        const m1 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
        js.push(b.jsMedianMs); gap.push(b.frameGapMedianMs);
        style.push((m1.RecalcStyleDuration - m0.RecalcStyleDuration) * 1000 / 180);
        layout.push((m1.LayoutDuration - m0.LayoutDuration) * 1000 / 180);
        await ctx.close();
      }
      const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
      bench.push({ n, proxies: on, jsPerFrameMs: +med(js).toFixed(3), styleRecalcPerFrameMs: +med(style).toFixed(3), layoutPerFrameMs: +med(layout).toFixed(3), frameGapMs: +med(gap).toFixed(2), runs: RUNS });
      console.error(`bench n=${n} proxies=${on}`, bench.at(-1));
    }
  }
  results.proxyBench = bench;
} finally {
  await browser.close(); await srv.close();
}
await writeFile(path.join(here, 'results', ONLY ? `toy-only-${ONLY.join('')}.json` : 'toy.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify(Object.fromEntries(Object.entries(results.variants).map(([k, r]) => [k, { cost: r.cost.gzipBytes, kb: Object.fromEntries(Object.entries(r.keyboard).map(([s, x]) => [s, `${x.completed}/3 in ${x.totalKeys} keys`])), axe: r.axe.violations.length, a11yFail: r.skillA11y.FAIL, probe: r.probe.map((p) => p.verdict) }])), null, 1));
