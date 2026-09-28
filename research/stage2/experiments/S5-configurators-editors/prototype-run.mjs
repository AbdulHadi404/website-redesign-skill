#!/usr/bin/env node
// The cake-configurator evidence prototype: model tests (Node), behaviour tests (headless Chromium), the skill's own
// QA scripts (capture, audit, a11y, states) and the JPEG sheets in shots/. Called by run.mjs; runnable alone:
//   node prototype-run.mjs            → prints the JSON it would store under results.prototype
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { serve } from './lab/serve.mjs';

const pexec = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
const proto = path.join(here, 'prototype');
const scripts = path.resolve(here, '../../../../skills/website-redesign/scripts');
const caps = path.join(here, 'captures'); // git-ignored: raw PNGs and reports
const shots = path.join(here, 'shots');
const median = (xs) => { const v = [...xs].sort((a, b) => a - b); const m = v.length >> 1; return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; };
const pct = (xs, p) => { const v = [...xs].sort((a, b) => a - b); return v[Math.min(v.length - 1, Math.floor(p * v.length))]; };
const r2 = (x) => Math.round(x * 100) / 100;
const M = await import(pathToFileURL(path.join(proto, 'model.js')).href);
const R = await import(pathToFileURL(path.join(proto, 'render.js')).href);
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ------------------------------------------------------------------------------------------------ 1. the model
export function modelTests() {
  const rnd = rng(2026);
  const universe = M.PRESETS.map((p) => structuredClone(p.config));
  const msgs = [['none', ''], ['piped', 'Happy 30th Maya'], ['plaque', 'Congratulations'], ['piped', 'Hi']];
  while (universe.length < 400) {
    const people = M.PEOPLE[Math.floor(rnd() * M.PEOPLE.length)].id;
    const [message, text] = msgs[Math.floor(rnd() * msgs.length)];
    universe.push(M.randomise({ ...M.DEFAULT, people, message, text }, rnd));
  }
  const invalidUniverse = universe.filter((c) => M.violations(c).length).length;
  // every single change a person can make from every configuration
  const values = { people: M.PEOPLE.map((p) => p.id), tiers: [1, 2, 3], shape: M.SHAPES.map((o) => o.id), sponge: M.SPONGES.map((o) => o.id), filling: M.FILLINGS.map((o) => o.id), finish: M.FINISHES.map((o) => o.id), colour: M.COLOURS.map((o) => o.id), ganache: M.GANACHE.map((o) => o.id), drip: M.DRIPS.map((o) => o.id), message: M.MESSAGES.map((o) => o.id) };
  let transitions = 0, repaired = 0, hinted = 0, invalidAfter = 0, overrodeChoice = 0, blocked = 0; const byRule = {};
  for (const c of universe) {
    const moves = [];
    for (const [k, vs] of Object.entries(values)) for (const v of vs) if (!M.same(c[k], v)) moves.push([k, v]);
    for (const d of M.DECORATIONS.map((o) => o.id)) moves.push(['decorations', c.decorations.includes(d) ? c.decorations.filter((x) => x !== d) : [...c.decorations, d]]);
    for (const [k, v] of moves) {
      if (k === 'tiers' && !M.allowedTiers(c.people).includes(v)) continue; // not offered (disclosure follows the dependency graph)
      const added = k === 'decorations' ? v.find((x) => !c.decorations.includes(x)) : v;
      if (M.unavailableReason(c, k, added)) { blocked++; continue; } // inactive + explained, not chosen
      transitions++;
      const { config, adjustments } = M.resolve({ ...c, [k]: v }, [k]);
      if (M.violations(config).length) invalidAfter++;
      if (!M.same(config[k], v)) overrodeChoice++;
      if (adjustments.length) { repaired++; if (M.sideEffectHint(c, k, v)) hinted++; for (const a of adjustments) byRule[a.reason] = (byRule[a.reason] ?? 0) + 1; }
    }
  }
  // "Surprise me": always valid; keeps the needs (people, message)
  let rInvalid = 0, rKept = 0; const distinct = new Set();
  for (let i = 0; i < 2000; i++) {
    const c = universe[i % universe.length]; const x = M.randomise(c, rnd);
    if (M.violations(x).length) rInvalid++;
    if (x.people === c.people && x.message === c.message && x.text === c.text) rKept++;
    distinct.add(M.encode(x));
  }
  // links: round trip, and hostile or stale links still open a valid cake
  let roundTrip = 0, maxLen = 0;
  for (const c of universe) { const e = M.encode(c); maxLen = Math.max(maxLen, e.length); if (M.same(M.decode(e), c)) roundTrip++; }
  const junk = ['p=999&t=9&sh=x', 'p=8&t=3&sh=heart&fn=fondant&d=drip.drip.flowers.goldleaf.sprinkles.macarons&m=piped&tx=' + 'x'.repeat(80), 'p=50&t=1&sh=heart&m=piped&tx=hi', 'p=12&fp=abc&h=-40'];
  const junkValid = junk.map((q) => { const c = M.decode(q); return !!c && M.violations(c).length === 0; });
  // render cost in Node (string building only)
  const times = [], sizes = [];
  for (const c of universe) { const t = performance.now(); const s = R.renderCake(c); times.push(performance.now() - t); sizes.push(s.length); }
  return {
    configsTested: universe.length, invalidConfigs: invalidUniverse,
    singleChangeTransitions: transitions, blockedAsInactive: blocked, transitionsNeedingRepair: repaired, repairShare: r2(repaired / transitions), repairsAnnouncedOnTheOptionBeforehand: hinted,
    invalidAfterRepair: invalidAfter, repairOverrodeTheChoice: overrodeChoice, repairsByReason: byRule,
    randomise: { runs: 2000, invalid: rInvalid, keptPeopleAndMessage: rKept, distinct: distinct.size },
    links: { roundTripExact: `${roundTrip}/${universe.length}`, longestQueryChars: maxLen, hostileLinksOpenValidCake: junkValid },
    renderNode: { medianMs: r2(median(times)), p95Ms: r2(pct(times, 0.95)), svgBytesMedian: median(sizes), svgBytesMax: Math.max(...sizes) },
  };
}

// ------------------------------------------------------------------------------------------------ 2. behaviour in a browser
export async function behaviour(url) {
  const { launch } = await import(pathToFileURL(path.join(scripts, 'lib/env.mjs')).href);
  const { browser } = await launch();
  const out = { consoleErrors: [] };
  const state = (page) => page.evaluate(() => ({ c: window.__cake.hist.present, undo: window.__cake.hist.past.length, redo: window.__cake.hist.future.length }));
  const newPage = async (opts = {}) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-GB', ...opts });
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error') out.consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => out.consoleErrors.push(String(e)));
    return { ctx, page };
  };
  try {
    // ---- constraint repair: one step, one undo, said in words
    {
      const { ctx, page } = await newPage();
      await page.goto(url); await page.waitForSelector('#tab-size');
      await page.click('#tab-size'); await page.click("[data-key=people] label.opt[data-value='30']");
      const before = await state(page);
      await page.click("[data-key=shape] label.opt[data-value='heart']");
      const after = await state(page);
      const noticeText = (await page.textContent('#notice')).trim();
      await page.click('#notice [data-undo]');
      const undone = await state(page);
      out.repair = { afterPeople30: { people: before.c.people, tiers: before.c.tiers }, afterHeart: { people: after.c.people, tiers: after.c.tiers, shape: after.c.shape }, steps: after.undo - before.undo, notice: noticeText, oneUndoRestores: JSON.stringify(undone.c) === JSON.stringify(before.c), announced: await page.textContent('#announcer') };
      // an option that is not available says why, and changes nothing
      await page.click('#tab-decorate');
      await page.click("[data-key=decorations] label.opt[data-value='sprinkles']"); // third decoration
      const s3 = await state(page);
      await page.click("[data-key=decorations] label.opt[data-value='macarons']", { force: true }); // a fourth: inactive (aria-disabled; Playwright would wait for it to become enabled)
      const s4 = await state(page);
      out.inactiveOption = { decorations: s4.c.decorations, changed: s4.undo !== s3.undo, notice: (await page.textContent('#notice')).trim() };
      // a no-op (choosing the chosen option) records nothing
      await page.click('#tab-flavour'); const n0 = await state(page);
      await page.click(`[data-key=sponge] label.opt[data-value='${n0.c.sponge}']`); const n1 = await state(page);
      out.noOpChoiceAddsStep = n1.undo !== n0.undo;
      // redo invalidation
      await page.click('#undo'); const r0 = await state(page);
      await page.click("[data-key=sponge] label.opt[data-value='lemon']"); const r1 = await state(page);
      out.redo = { redoAfterUndo: r0.redo, redoAfterNewChange: r1.redo };
      // typing a message: one step per visit to the field; the text never reaches analytics
      await page.click('#tab-decorate'); await page.click("[data-key=message] label.opt[data-value='plaque']");
      const t0 = await state(page);
      await page.click('#text'); await page.keyboard.type('Happy 30th Maya', { delay: 30 });
      const t1 = await state(page);
      const leaked = await page.evaluate(() => JSON.stringify(window.dataLayer).includes('Maya'));
      out.text = { typedChars: 15, steps: t1.undo - t0.undo, textInAnalytics: leaked, previewText: await page.locator('#cake [data-part=message] text').textContent() };
      await ctx.close();
    }
    // ---- sliders: a pointer drag is one step; keyboard nudges on one slider merge; Escape cancels
    {
      const { ctx, page } = await newPage();
      await page.goto(url); await page.waitForSelector('#tab-outside');
      await page.click('#tab-outside'); await page.click("[data-key=colour] label.opt[data-value='custom']");
      const box = await page.locator('#hue').boundingBox();
      const s0 = await state(page);
      await page.mouse.move(box.x + 10, box.y + box.height / 2); await page.mouse.down();
      for (let i = 1; i <= 25; i++) await page.mouse.move(box.x + 10 + ((box.width - 20) * i) / 25, box.y + box.height / 2);
      await page.mouse.up(); await page.waitForTimeout(50);
      const s1 = await state(page);
      await page.click('#undo'); const s2 = await state(page);
      await page.focus('#hue'); for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowRight');
      const k1 = await state(page);
      await page.waitForTimeout(1200); for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
      const k2 = await state(page);
      await page.mouse.move(box.x + 10, box.y + box.height / 2); await page.mouse.down();
      for (let i = 1; i <= 10; i++) await page.mouse.move(box.x + 10 + (box.width * i) / 20, box.y + box.height / 2);
      await page.keyboard.press('Escape'); await page.mouse.up(); await page.waitForTimeout(50);
      const k3 = await state(page);
      out.slider = { pointerDragSteps: s1.undo - s0.undo, hueMoved: s1.c.hue !== s0.c.hue, oneUndoRestores: s2.c.hue === s0.c.hue, tenArrowKeysSteps: k1.undo - s2.undo, afterPauseThreeKeysSteps: k2.undo - k1.undo, escapeMidDragSteps: k3.undo - k2.undo, escapeRestored: k3.c.hue === k2.c.hue };
      await ctx.close();
    }
    // ---- the canvas: drag the flowers (one step), a tap opens their controls, the view never moves
    {
      const { ctx, page } = await newPage();
      await page.goto(url); await page.waitForSelector('#cake [data-part=flowers]');
      const svgBox0 = await page.locator('#cake').boundingBox(); const vb0 = await page.getAttribute('#cake', 'viewBox');
      const fb = await page.locator('#cake [data-part=flowers] ellipse').first().boundingBox();
      const cx = fb.x + fb.width / 2, cy = fb.y + fb.height / 2;
      const s0 = await state(page);
      await page.mouse.move(cx, cy); await page.mouse.down();
      for (let i = 1; i <= 12; i++) await page.mouse.move(cx + i * 12, cy);
      await page.mouse.up(); await page.waitForTimeout(50);
      const s1 = await state(page);
      const fb2 = await page.locator('#cake [data-part=flowers] ellipse').first().boundingBox();
      await page.mouse.move(fb2.x + fb2.width / 2, fb2.y + fb2.height / 2); await page.mouse.down();
      for (let i = 1; i <= 6; i++) await page.mouse.move(fb2.x + fb2.width / 2 - i * 10, fb2.y + fb2.height / 2);
      await page.keyboard.press('Escape'); await page.mouse.up(); await page.waitForTimeout(50);
      const s2 = await state(page);
      // a 2 px wobble is still a tap
      await page.mouse.move(fb2.x + fb2.width / 2, fb2.y + fb2.height / 2); await page.mouse.down(); await page.mouse.move(fb2.x + fb2.width / 2 + 2, fb2.y + fb2.height / 2 + 1); await page.mouse.up();
      await page.waitForTimeout(80);
      const s3 = await state(page);
      const svgBox1 = await page.locator('#cake').boundingBox(); const vb1 = await page.getAttribute('#cake', 'viewBox');
      out.canvas = {
        dragSteps: s1.undo - s0.undo, flowerPos: [s0.c.flowerPos, s1.c.flowerPos], escapeMidDragSteps: s2.undo - s1.undo, escapeRestored: s2.c.flowerPos === s1.c.flowerPos,
        wobbleTapSteps: s3.undo - s2.undo, tapOpened: await page.getAttribute('#tab-decorate', 'aria-selected'), tapFocused: await page.evaluate(() => document.activeElement?.id),
        canvasMovedOnTap: JSON.stringify(svgBox0) !== JSON.stringify(svgBox1), viewBoxChangedByDecorationDrag: vb0 !== vb1,
      };
      // camera: a geometry choice reframes, a decoration never does
      await page.click('#tab-decorate'); const vbA = await page.getAttribute('#cake', 'viewBox');
      await page.click("[data-key=decorations] label.opt[data-value='sprinkles']"); const vbB = await page.getAttribute('#cake', 'viewBox');
      await page.click('#tab-size'); await page.click("[data-key=people] label.opt[data-value='50']"); const vbC = await page.getAttribute('#cake', 'viewBox');
      out.camera = { decorationMovedCamera: vbA !== vbB, sizeReframed: vbB !== vbC };
      await ctx.close();
    }
    // ---- links, reload, resume, share
    {
      const { ctx, page } = await newPage({ permissions: ['clipboard-read', 'clipboard-write'] });
      await page.goto(url); await page.waitForSelector('#tab-flavour');
      await page.click('#tab-flavour'); await page.click("[data-key=sponge] label.opt[data-value='chocolate']");
      await page.click('#tab-outside'); await page.click("[data-key=finish] label.opt[data-value='ganache']");
      await page.waitForTimeout(400);
      const s = await state(page); const search = await page.evaluate(() => location.search);
      await page.click('#share'); await page.waitForTimeout(100);
      const clip = await page.evaluate(() => navigator.clipboard.readText()).catch((e) => `error: ${e.message}`);
      const other = await browser.newContext({ viewport: { width: 390, height: 844 } }); const p2 = await other.newPage();
      await p2.goto(url + search); await p2.waitForSelector('#tab-size');
      const fromLink = await p2.evaluate(() => window.__cake.hist.present);
      const entryLink = await p2.evaluate(() => window.dataLayer.find((e) => e.event === 'configurator_viewed')?.entry);
      await other.close();
      await page.reload(); await page.waitForSelector('#tab-size'); const afterReload = await state(page);
      await page.goto(url); await page.waitForSelector('#tab-size'); await page.waitForTimeout(100);
      const resumed = await state(page); const resumeNotice = (await page.textContent('#notice')).trim();
      out.persistence = { queryChars: search.length, linkOpensSameCake: JSON.stringify(fromLink) === JSON.stringify(s.c), entryFromLink: entryLink, reloadKeepsCake: JSON.stringify(afterReload.c) === JSON.stringify(s.c), bareUrlResumes: JSON.stringify(resumed.c) === JSON.stringify(s.c), resumeNotice, historyAfterReload: afterReload.undo, clipboardHasLink: clip.includes(search.slice(1)) };
      await ctx.close();
    }
    // ---- keyboard only, from load to "Request sent"
    {
      const { ctx, page } = await newPage();
      await page.goto(url); await page.waitForSelector('#tab-start');
      let presses = 0; const press = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); presses++; } };
      const tabTo = async (pred, max = 60) => { for (let i = 0; i < max; i++) { await press('Tab'); if (await page.evaluate(pred)) return true; } return false; };
      const log = [];
      log.push(['tabs', await tabTo(() => document.activeElement?.getAttribute('role') === 'tab')]);
      await press('ArrowRight'); log.push(['size tab', await page.evaluate(() => document.activeElement?.id)]);
      log.push(['people radio', await tabTo(() => document.activeElement?.name === 'people')]);
      await press('ArrowDown'); log.push(['people', (await state(page)).c.people]);
      await press('Control+z'); log.push(['after undo', (await state(page)).c.people]);
      await press('Control+Shift+z'); log.push(['after redo', (await state(page)).c.people]);
      log.push(['review button', await tabTo(() => document.activeElement?.id === 'review-btn')]);
      await press('Enter'); await page.waitForTimeout(50);
      log.push(['review focus', await page.evaluate(() => document.activeElement?.textContent)]);
      log.push(['submit', await tabTo(() => document.activeElement?.type === 'submit')]);
      await press('Enter'); await page.waitForTimeout(50);
      const errFocus = await page.evaluate(() => ({ focused: document.activeElement?.className, title: document.title, errors: document.querySelectorAll('.error-summary li').length }));
      log.push(['empty submit', errFocus]);
      log.push(['date', await tabTo(() => document.activeElement?.id === 'f-date')]);
      const d = new Date(); d.setDate(d.getDate() + 20);
      const dd = String(d.getDate()).padStart(2, '0'), mm = String(d.getMonth() + 1).padStart(2, '0');
      let typed = 0;
      // a date field's segments follow the browser's own locale, not the page's: try day-first, then month-first
      // (this headless build lays the segments out month-first whatever the locale; a person types what they see)
      for (const ch of `${mm}${dd}${d.getFullYear()}`) { await press(ch); typed++; }
      log.push(['date value', await page.inputValue('#f-date')]);
      log.push(['name', await tabTo(() => document.activeElement?.id === 'f-name')]); for (const ch of 'Maya Patel') { await press(ch === ' ' ? 'Space' : ch); typed++; }
      log.push(['email', await tabTo(() => document.activeElement?.id === 'f-email')]); for (const ch of 'maya@example.com') { await press(ch); typed++; }
      out.keyboardTyped = typed;
      log.push(['submit again', await tabTo(() => document.activeElement?.type === 'submit')]);
      await press('Enter'); await page.waitForTimeout(80);
      const done = await page.evaluate(() => ({ heading: document.querySelector('#review h2')?.textContent, focused: document.activeElement?.textContent, title: document.title }));
      out.keyboard = { keyPresses: presses, navigationPresses: presses - out.keyboardTyped, log, done }; delete out.keyboardTyped;
      out.analytics = await page.evaluate(() => { const c = {}; for (const e of window.dataLayer) c[e.event] = (c[e.event] ?? 0) + 1; return { counts: c, sample: window.dataLayer.filter((e) => ['first_change', 'review_opened', 'request_submitted', 'validation_failed'].includes(e.event)) }; });
      await ctx.close();
    }
    // ---- render cost in the page (commit → full SVG re-render), unthrottled and at a 4× CPU slowdown
    {
      const { ctx, page } = await newPage();
      await page.goto(url); await page.waitForSelector('#tab-start');
      const cdp = await ctx.newCDPSession(page);
      out.renderCost = {};
      for (const rate of [1, 4]) {
        await cdp.send('Emulation.setCPUThrottlingRate', { rate });
        out.renderCost[`cpu${rate}x`] = await page.evaluate(() => {
          const { hist, M } = window.__cake; let a = 7; const rnd = () => { a = (a * 16807) % 2147483647; return a / 2147483647; };
          const commit = [], preview = [];
          for (let i = 0; i < 120; i++) { const next = M.randomise({ ...hist.present, people: M.PEOPLE[i % 5].id }, rnd); const t = performance.now(); hist.commit(next, { label: 'bench' }); commit.push(performance.now() - t); }
          hist.commit({ ...hist.present, people: 12, tiers: 1, decorations: ['flowers'] }, { label: 'bench' }); hist.begin();
          for (let i = 0; i < 120; i++) { const t = performance.now(); hist.preview({ ...hist.present, flowerPos: Math.sin(i / 10) }); preview.push(performance.now() - t); }
          // the same drag done the first way: the whole view (cake, slice, text, price, panel) re-rendered per move
          const full = [];
          for (let i = 0; i < 120; i++) { hist.present = { ...hist.present, flowerPos: Math.cos(i / 10) }; const t = performance.now(); window.__cake.fullRender(); full.push(performance.now() - t); }
          hist.end({ label: 'bench' });
          const q = (xs, p) => { const v = [...xs].sort((x, y) => x - y); return Math.round(v[Math.min(v.length - 1, Math.floor(p * v.length))] * 100) / 100; };
          return { commitMedianMs: q(commit, 0.5), commitP95Ms: q(commit, 0.95), dragPreviewMedianMs: q(preview, 0.5), dragPreviewP95Ms: q(preview, 0.95), dragFullRenderMedianMs: q(full, 0.5), dragFullRenderP95Ms: q(full, 0.95), svgNodes: document.querySelectorAll('#cake *').length };
        });
      }
      await ctx.close();
    }
    // ---- phone: layout of the shell, a finger drag and a finger tap on the preview
    {
      const { ctx, page } = await newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
      await page.goto(url); await page.waitForSelector('#cake [data-part=flowers]');
      const box = async (s) => page.locator(s).first().boundingBox();
      const layout = { stage: await box('.stage'), tabs: await box('.tabs'), buybar: await box('#buybar'), scrollWidth: await page.evaluate(() => document.documentElement.scrollWidth) };
      const cdp = await ctx.newCDPSession(page);
      const fb = await box('#cake [data-part=flowers] ellipse'); const x = fb.x + fb.width / 2, y = fb.y + fb.height / 2;
      const s0 = await state(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      for (let i = 1; i <= 10; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - i * 8, y }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(80);
      const s1 = await state(page);
      const stageBefore = await box('#cake');
      const fb2 = await box('#cake [data-part=flowers] ellipse');
      await page.touchscreen.tap(fb2.x + fb2.width / 2, fb2.y + fb2.height / 2); await page.waitForTimeout(80);
      const stageAfter = await box('#cake');
      out.phone = {
        stageHeightShare: r2(layout.stage.height / 844), buybarBottom: Math.round(layout.buybar.y + layout.buybar.height), buybarVisible: layout.buybar.y + layout.buybar.height <= 844, horizontalOverflow: layout.scrollWidth > 390,
        touchDragSteps: s1.undo - s0.undo, flowerPos: [s0.c.flowerPos, s1.c.flowerPos], tapOpensDecorate: await page.getAttribute('#tab-decorate', 'aria-selected'), canvasMovedOnTap: JSON.stringify(stageBefore) !== JSON.stringify(stageAfter),
      };
      await ctx.close();
    }
  } catch (e) { out.error = String(e.stack || e); }
  await browser.close();
  return out;
}

// ------------------------------------------------------------------------------------------------ 3. the skill's scripts
async function runScript(name, args, timeout = 600000) {
  const t = Date.now();
  try { const { stdout, stderr } = await pexec(process.execPath, [path.join(scripts, name), ...args], { cwd: here, timeout, maxBuffer: 1 << 26 }); return { code: 0, stdout, stderr, s: Math.round((Date.now() - t) / 1000) }; }
  catch (e) { return { code: e.code ?? 1, stdout: e.stdout ?? '', stderr: String(e.stderr ?? e.message), s: Math.round((Date.now() - t) / 1000) }; }
}
const lines = (txt, re) => txt.split('\n').filter((l) => re.test(l)).map((l) => l.trim().slice(0, 400));

export async function skillScripts(url) {
  const res = {};
  await rm(caps, { recursive: true, force: true }); await mkdir(caps, { recursive: true });
  const cap = await runScript('capture.mjs', ['--base', url, '--paths', '/', '--widths', '1440,768,390', '--out', path.join(caps, 'capture')]);
  res.capture = { code: cap.code, seconds: cap.s, files: existsSync(path.join(caps, 'capture')) ? (await readdir(path.join(caps, 'capture'))).filter((f) => f.endsWith('.png')) : [], warnings: lines(cap.stdout + cap.stderr, /overflow|warn|flat|renderer|✗|⚠/i) };
  const au = await runScript('audit.mjs', ['--base', url, '--paths', '/', '--kind', 'app', '--widths', '1440,390', '--out', path.join(caps, 'audit')]);
  res.audit = { code: au.code, seconds: au.s, fails: lines(au.stdout, /^- ✗/), warnings: lines(au.stdout, /^- (?!✗)/).length, signals: lines(au.stdout, /^- ◆/), axe: lines(au.stdout, /violation/i) };
  for (const [label, extra] of [['a11y1280', []], ['a11y390', ['--width', '390', '--height', '844']]]) {
    const a = await runScript('a11y.mjs', [`${url}/`, '--out', path.join(caps, label), '--tabs', '80', ...extra]);
    const head = a.stdout.match(/(\d+) FAIL, (\d+) WARN, (\d+) INFO/);
    res[label] = { code: a.code, seconds: a.s, fail: head ? +head[1] : null, warn: head ? +head[2] : null, findings: lines(a.stdout, /^(FAIL|WARN) /), tabStops: lines(a.stdout, /^\s+\d+\. /).length };
  }
  const st = await runScript('states.mjs', [path.join(here, 'prototype-states.json'), '--base', url, '--out', path.join(caps, 'states'), '--axe']);
  res.states = { code: st.code, seconds: st.s, summary: lines(st.stdout, /captured|axe:/).slice(-12) };
  return res;
}

// ------------------------------------------------------------------------------------------------ 4. JPEG sheets for shots/
async function sheets() {
  await mkdir(shots, { recursive: true });
  const gallery = [
    { ...M.DEFAULT },
    { ...M.DEFAULT, shape: 'heart', people: 20, tiers: 1, decorations: ['drip', 'flowers'], drip: 'pink', message: 'piped', text: 'Happy 30th Maya' },
    { ...M.DEFAULT, shape: 'square', people: 30, tiers: 2, finish: 'fondant', colour: 'sky', decorations: ['goldleaf', 'macarons'], message: 'plaque', text: 'Well done Sam' },
    { ...M.DEFAULT, people: 50, tiers: 3, finish: 'naked', sponge: 'chocolate', filling: 'raspberry', decorations: ['flowers', 'sprinkles'], flowerPos: 0.6 },
    { ...M.DEFAULT, people: 20, tiers: 2, finish: 'ganache', ganache: 'white', decorations: ['drip', 'sprinkles', 'macarons'], drip: 'chocolate' },
    { ...M.DEFAULT, people: 30, tiers: 3, finish: 'fondant', colour: 'charcoal', decorations: ['goldleaf', 'flowers'], flowerPos: -0.8, message: 'plaque', text: 'Congratulations' },
  ];
  const html = `<!doctype html><link rel="stylesheet" href="fonts/fonts.css"><style>body{margin:0;display:grid;grid-template-columns:repeat(3,1fr);gap:6px;background:#ddd}svg{width:100%;height:auto;background:radial-gradient(#f7eee4,#e7d7c7)}</style>` + gallery.map((c, i) => `<svg viewBox="${R.fitViewBox(c)}">${R.renderCake(c, `g${i}`)}</svg>`).join('');
  await writeFile(path.join(proto, '_gallery.html'), html);
  const py = `
import sys, glob, os
from PIL import Image
caps, shots = sys.argv[1], sys.argv[2]
def save(img, name, w):
    img = img.convert('RGB'); r = w / img.width
    img.resize((w, int(img.height * r)), Image.LANCZOS).save(os.path.join(shots, name), 'JPEG', quality=80, optimize=True, progressive=True)
cap = os.path.join(caps, 'capture')
for f in sorted(glob.glob(os.path.join(cap, '*-fold.png'))):
    w = int(f.split('-')[-2]) if f.split('-')[-2].isdigit() else 0
    save(Image.open(f), f'prototype-{w}.jpg', 1200 if w > 800 else (768 if w > 400 else 390))
st = os.path.join(caps, 'states')
names = ['start','size','flavour','outside-custom','decorate','repair-notice','review-errors','sent']
ims = [Image.open(p) for n in names for p in glob.glob(os.path.join(st, f'{n}-phone*.png'))[:1]]
if ims:
    tw = 300; th = max(int(i.height * tw / i.width) for i in ims); th = min(th, 650)
    sheet = Image.new('RGB', (tw * 4 + 30, th * 2 + 30), (221, 221, 221))
    for k, im in enumerate(ims):
        im = im.convert('RGB'); im = im.resize((tw, int(im.height * tw / im.width)), Image.LANCZOS).crop((0, 0, tw, th))
        sheet.paste(im, (6 + (k % 4) * (tw + 6), 6 + (k // 4) * (th + 6)))
    sheet.save(os.path.join(shots, 'states-phone-sheet.jpg'), 'JPEG', quality=78, optimize=True, progressive=True)
for n in ['repair-desktop', 'review-desktop']:
    for p in glob.glob(os.path.join(st, f'{n}*.png'))[:1]: save(Image.open(p), f'{n}.jpg', 1200)
g = os.path.join(caps, 'gallery.png')
if os.path.exists(g): save(Image.open(g), 'renderer-gallery.jpg', 1200)
`;
  const { launch } = await import(pathToFileURL(path.join(scripts, 'lib/env.mjs')).href);
  const srv = await serve(proto); const { browser } = await launch();
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  await page.goto(`${srv.url}/_gallery.html`); await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(caps, 'gallery.png'), fullPage: true });
  await browser.close(); await srv.close(); await rm(path.join(proto, '_gallery.html'));
  await writeFile(path.join(caps, 'sheets.py'), py);
  await pexec('python3', [path.join(caps, 'sheets.py'), caps, shots]);
  const files = (await readdir(shots)).filter((f) => f.endsWith('.jpg'));
  return files;
}

// ------------------------------------------------------------------------------------------------
export async function prototypeLab() {
  const res = {};
  if (!existsSync(path.join(proto, 'fonts', 'fonts.css'))) {
    try { await pexec(process.execPath, [path.join(here, 'fetch-fonts.mjs')], { env: { ...process.env, NODE_USE_ENV_PROXY: '1' } }); res.fonts = 'fetched'; }
    catch (e) { res.fonts = `not fetched (${e.message.split('\n')[0]}): captures use fallback faces`; }
  } else res.fonts = 'present';
  console.log('== prototype: model'); res.model = modelTests();
  const srv = await serve(proto);
  console.log('== prototype: behaviour'); res.behaviour = await behaviour(srv.url);
  console.log('== prototype: skill scripts'); res.scripts = await skillScripts(srv.url);
  await srv.close();
  console.log('== prototype: sheets'); res.shots = await sheets();
  const bytes = {}; for (const f of ['index.html', 'styles.css', 'app.js', 'model.js', 'history.js', 'render.js']) bytes[f] = (await readFile(path.join(proto, f))).length;
  res.sourceBytes = bytes;
  return res;
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(await prototypeLab(), null, 2));
