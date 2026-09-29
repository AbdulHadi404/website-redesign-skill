#!/usr/bin/env node
// S10 lab: build every hero-background variant, capture posters, measure everything, write results.json.
//
//   npm install && node run.mjs                      # everything (≈ 1.5 h on 4 shared CPUs)
//   node run.mjs --runs 1                            # one run per cell, for a quick look
//   node run.mjs --phase main,post --only e1-webgl-vanilla,h-post
//
// Phases (default all, in this order): fetch build posters video bundles licences main offscreen hidden settle governor inp reduced
//   nowebgl contextloss contrast fill libs post shots summary
// Results merge into results.json by phase and key, so a partial run replaces only what it measured.
// Environment: headless Chromium 141 (playwright-core from the skill's scripts), WebGL through SwiftShader:
// GPU work is CPU-emulated, so WebGL numbers compare only with each other.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { buildAll, VARIANTS, POSTERS, DIST, sizesOf } from './lib/build.mjs';
import { serve } from './lib/serve.mjs';
import { launchBrowser } from './lib/browser.mjs';
import { newPage, window_, load, median, r1, regionLuminance } from './lib/measure.mjs';
import { fetchSources } from './fetch-sources.mjs';
import { bundleSizes } from './lib/bundles.mjs';
import { licences } from './lib/licences.mjs';
import { renderFrames, encode, LOOP } from './lib/video.mjs';
import { fetchFfmpeg } from './fetch-sources.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const RUNS = Number(arg('runs', 5));
const ALL = ['fetch', 'build', 'posters', 'video', 'bundles', 'licences', 'main', 'offscreen', 'hidden', 'settle', 'governor', 'inp', 'reduced', 'nowebgl', 'contextloss', 'contrast', 'fill', 'libs', 'post', 'shots', 'summary'];
const PHASES = arg('phase') ? arg('phase').split(',') : ALL;
const ONLY = arg('only') ? arg('only').split(',') : null;
const pick = (vs) => (ONLY ? vs.filter((v) => ONLY.includes(v.id)) : vs);
const SHOTS = path.join(here, 'shots');
const RESULTS = path.join(here, 'results.json');
const results = existsSync(RESULTS) ? JSON.parse(await readFile(RESULTS, 'utf8')) : {};
const save = () => writeFile(RESULTS, JSON.stringify(results, null, 1));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const put = (phase, key, val) => { (results[phase] ||= {})[key] = val; };
const webglIds = VARIANTS.filter((v) => /^(e|f|h|g)/.test(v.id)).map((v) => v.id);
await mkdir(SHOTS, { recursive: true });

results.env = { date: new Date().toISOString().slice(0, 10), node: process.version, cpus: os.cpus().length, cpuModel: os.cpus()[0]?.model, runs: RUNS };
results.phaseMeta ||= {};
for (const ph of PHASES) results.phaseMeta[ph] = { runs: RUNS, at: new Date().toISOString(), only: ONLY, loadavg: os.loadavg().map((x) => r1(x)) };

// ---------- fetch / build / posters ----------
if (PHASES.includes('fetch')) { results.sources = fetchSources(); log('sources', results.sources.fluid.head); }
const posterFiles = () => Object.fromEntries([...Object.keys(POSTERS), 'video'].filter((n) => existsSync(path.join(DIST, 'posters', `${n}-1600.avif`))).map((n) => [n, true]));
if (PHASES.includes('build')) { results.build = await buildAll({ posters: posterFiles() }); log('built', Object.keys(results.build).length, 'variants'); await save(); }

async function withServer(fn) { const srv = await serve(DIST); try { return await fn(srv); } finally { await srv.close(); } }
async function withBrowser(args, fn) { const b = await launchBrowser(args); try { results.env.chromium = b.version(); return await fn(b); } finally { await b.close(); } }

if (PHASES.includes('posters')) {
  await mkdir(path.join(DIST, 'posters'), { recursive: true });
  await buildAll({ posters: null });
  await withServer((srv) => withBrowser([], async (browser) => {
    for (const [name, spec] of Object.entries(POSTERS)) {
      const { ctx, page } = await newPage(browser, { viewport: { width: 1600, height: 900 } });
      await page.goto(`${srv.base}/${spec.from}/?capture&noscrim&eager&${spec.query}`, { waitUntil: 'load' });
      await page.waitForFunction(() => window.__lab?.ttff != null, null, { timeout: 60000 }).catch(() => {});
      await page.waitForTimeout(spec.wait);
      const png = await page.locator('#bg').screenshot({ type: 'png' });
      const rec = {};
      for (const w of [1600, 800]) {
        const img = sharp(png).resize(w);
        await img.clone().avif({ quality: 50, effort: 6 }).toFile(path.join(DIST, 'posters', `${name}-${w}.avif`));
        await img.clone().webp({ quality: 72 }).toFile(path.join(DIST, 'posters', `${name}-${w}.webp`));
        rec[w] = { avif: (await sizesOf(path.join(DIST, 'posters', `${name}-${w}.avif`))).raw, webp: (await sizesOf(path.join(DIST, 'posters', `${name}-${w}.webp`))).raw };
      }
      // Chrome ignores an LCP image under 0.05 bits per displayed pixel (low-entropy); record where each poster sits.
      rec.bppAt1280x720 = { avif1600: r1((rec[1600].avif * 8) / (1280 * 720) * 1000) / 1000 };
      await sharp(png).resize(800).jpeg({ quality: 78 }).toFile(path.join(SHOTS, `poster-${name}.jpg`));
      put('posters', name, { from: spec.from, query: spec.query, ...rec });
      log('poster', name, JSON.stringify(rec));
      await ctx.close();
    }
  }));
  results.build = await buildAll({ posters: posterFiles() });
  await save();
}

// ---------- video: render e1 offline to a seamless loop, encode, make its poster, rebuild ----------
if (PHASES.includes('video')) {
  const ffmpeg = fetchFfmpeg();
  const frames = path.join(DIST, '_frames');
  const r = await withServer((srv) => withBrowser([], async (browser) => {
    const { ctx, page } = await newPage(browser, { viewport: { width: LOOP.width, height: LOOP.height } });
    const out = await renderFrames(page, `${srv.base}/e1-webgl-vanilla/?capture&noscrim&eager&still&t0=0`, frames);
    await ctx.close();
    return out;
  }));
  const enc = await encode(ffmpeg, frames, path.join(DIST, 'video'));
  const rec = {};
  for (const w of [1600, 800]) {
    const img = sharp(r.firstFrame).resize(w);
    await img.clone().avif({ quality: 50, effort: 6 }).toFile(path.join(DIST, 'posters', `video-${w}.avif`));
    await img.clone().webp({ quality: 72 }).toFile(path.join(DIST, 'posters', `video-${w}.webp`));
    rec[w] = { avif: (await sizesOf(path.join(DIST, 'posters', `video-${w}.avif`))).raw };
  }
  results.video = { loop: LOOP, ...r, firstFrame: undefined, encodings: enc, poster: rec, ffmpeg: path.basename(ffmpeg) };
  results.build = await buildAll({ posters: posterFiles() });
  log('video', JSON.stringify(enc));
  await save();
}

if (PHASES.includes('bundles')) { results.bundles = await bundleSizes(); log('bundles', Object.keys(results.bundles).length); await save(); }
if (PHASES.includes('licences')) { results.licences = await licences(); log('licences', Object.keys(results.licences).length); await save(); }

// ---------- helpers for measured runs ----------
const fileSizes = new Map();
async function payloadOf(entries) {
  const out = { html: 0, poster: 0, js: 0, video: 0, other: 0, total: 0, files: [] };
  const seen = new Set();
  for (const e of entries) {
    const f = path.join(DIST, decodeURIComponent(e.path).replace(/\/$/, '/index.html'));
    if (!existsSync(f) || seen.has(f)) continue;     // a file counts once (media is fetched in ranges)
    seen.add(f);
    if (!fileSizes.has(f)) fileSizes.set(f, await sizesOf(f));
    const s = fileSizes.get(f);
    const text = /\.(html|js|css|svg|json)$/.test(f);
    const n = text ? s.gzip : s.raw;
    const k = f.endsWith('.html') ? 'html' : /posters\//.test(f) ? 'poster' : f.endsWith('.js') ? 'js' : /\.(webm|mp4)$/.test(f) ? 'video' : 'other';
    out[k] += n; out.total += n;
    out.files.push(`${path.relative(DIST, f)} ${n}`);
  }
  return out;
}
const variantUrl = (srv, id, query = '') => `${srv.base}/${id}/${query ? `?${query}` : ''}`;
const kindOf = (id) => VARIANTS.find((v) => v.id === id)?.kind;

async function measuredRun(browser, srv, id, { query = '', throttle = 1, windowMs = 5000, probe = true, viewport, dsf, warm = 1000 } = {}) {
  const { ctx, page, cdp, errors } = await newPage(browser, { throttle, viewport, dsf });
  const i0 = srv.log.length;
  try {
    const ld = await load(page, variantUrl(srv, id, query), { kind: kindOf(id) });
    await page.waitForTimeout(warm);
    const w = await window_(browser, page, cdp, windowMs, { probe });
    const pay = await payloadOf(srv.log.slice(i0));
    return { ...ld, ...w, payload: pay, errors: errors.slice(0, 5) };
  } catch (e) {
    return { failed: e.message.split('\n')[0], errors };
  } finally { await ctx.close(); }
}

// Median of each numeric field across runs (nested one level for cpu and lcp).
function summarise(runs) {
  const ok = runs.filter((r) => !r.failed);
  if (!ok.length) return { failed: runs[0]?.failed };
  const g = (f) => { const v = median(ok.map(f)); return v == null ? null : r1(v); };
  return {
    runs: ok.length,
    ttff: g((r) => r.ttff), fcp: g((r) => r.fcp), lcp: g((r) => r.lcp?.t), lcpEl: ok[0].lcp ? `${ok[0].lcp.tag}${ok[0].lcp.url ? ` ${ok[0].lcp.url}` : ''}` : null,
    bootBlock: g((r) => r.bootBlock), tbt: g((r) => r.tbt), longest: g((r) => r.longest),
    fps: g((r) => r.fps), frameMedian: g((r) => r.frameMedian), frameP95: g((r) => r.frameP95), over25Pct: g((r) => r.over25Pct),
    effectFps: g((r) => r.effectFps), rafPerSec: g((r) => r.rafPerSec), busyPct: g((r) => r.busyPct), scriptPct: g((r) => r.scriptPct),
    // CPU-emulated GPU time per rendered frame (SwiftShader): comparable across variants here, not with real GPUs.
    gpuMsPerFrame: g((r) => (r.cpu?.GPU != null && r.effectFps ? (r.cpu.GPU * 10) / r.effectFps : null)),
    gpuMsPerDisplayFrame: g((r) => (r.cpu?.GPU != null && r.fps ? (r.cpu.GPU * 10) / r.fps : null)),
    jsMs: median(ok.map((r) => r.jsMs)), cpuRenderer: g((r) => r.cpu?.renderer), cpuGpu: g((r) => r.cpu?.GPU), cpuBrowser: g((r) => r.cpu?.browser), cpuTotal: g((r) => r.cpu?.total),
    payload: ok[0].payload && { html: ok[0].payload.html, poster: ok[0].payload.poster, js: ok[0].payload.js, video: ok[0].payload.video, other: ok[0].payload.other, total: ok[0].payload.total },
    renderer: ok[0].info?.renderer, canvas: ok[0].state?.canvas, errors: [...new Set(ok.flatMap((r) => r.errors || []))].slice(0, 3),
  };
}

// ---------- main: every variant, 1x and 4x CPU ----------
if (PHASES.includes('main')) await withServer((srv) => withBrowser([], async (browser) => {
  for (const v of pick(VARIANTS)) for (const throttle of [1, 4]) {
    const runs = [];
    for (let i = 0; i < RUNS; i++) runs.push(await measuredRun(browser, srv, v.id, { throttle }));
    const s = summarise(runs);
    put('main', `${v.id}@${throttle}x`, { id: v.id, throttle, ...s, raw: runs.map((r) => ({ ttff: r.ttff, fps: r.fps, cpu: r.cpu, busyPct: r.busyPct, effectFps: r.effectFps, failed: r.failed })) });
    log('main', v.id, `${throttle}x`, `ttff ${s.ttff} fps ${s.fps} effect ${s.effectFps} busy ${s.busyPct}% cpu ${s.cpuTotal}% (gpu ${s.cpuGpu}) js ${s.jsMs} payload ${s.payload?.total}`);
    await save();
  }
}));

// ---------- off-screen: scrolled past the hero, with and without the pause wrapper ----------
if (PHASES.includes('offscreen')) await withServer((srv) => withBrowser([], async (browser) => {
  for (const v of pick(VARIANTS)) for (const mode of v.kind === 'static' || v.kind === 'fluid-demo' ? ['as-built'] : ['pause', 'nopause']) {
    const runs = [];
    for (let i = 0; i < Math.min(RUNS, 3); i++) {
      const { ctx, page, cdp } = await newPage(browser);
      await load(page, variantUrl(srv, v.id, mode === 'nopause' ? 'nopause' : ''), { kind: v.kind });
      await page.waitForTimeout(800);
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForTimeout(800);
      const w = await window_(browser, page, cdp, 3000);
      runs.push({ ...w, state: await page.evaluate(() => window.__lab?.state?.() ?? null) });
      await ctx.close();
    }
    const s = { rafPerSec: r1(median(runs.map((r) => r.rafPerSec))), effectFps: r1(median(runs.map((r) => r.effectFps))), busyPct: r1(median(runs.map((r) => r.busyPct))), cpuTotal: r1(median(runs.map((r) => r.cpu?.total))), cpuGpu: r1(median(runs.map((r) => r.cpu?.GPU))), cpuRenderer: r1(median(runs.map((r) => r.cpu?.renderer))) };
    put('offscreen', `${v.id}:${mode}`, { id: v.id, mode, ...s });
    log('offscreen', v.id, mode, JSON.stringify(s));
    await save();
  }
}));

// ---------- hidden tab ----------
// Headless Chromium keeps every page "visible" (bringing another tab to the front does not change it), so the
// page is told it is hidden: document.hidden/visibilityState are overridden and visibilitychange is dispatched.
// This tests each variant's own handler. Real background tabs also stop requestAnimationFrame by themselves [K].
const setHidden = (page, hidden) => page.evaluate((h) => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') });
  document.dispatchEvent(new Event('visibilitychange'));
}, hidden);
if (PHASES.includes('hidden')) await withServer((srv) => withBrowser([], async (browser) => {
  for (const v of pick(VARIANTS)) {
    const { ctx, page, cdp } = await newPage(browser);
    await load(page, variantUrl(srv, v.id), { kind: v.kind });
    await page.waitForTimeout(800);
    await setHidden(page, true);
    await page.waitForTimeout(400);
    const w = await window_(browser, page, cdp, 3000);
    await setHidden(page, false);
    await page.waitForTimeout(1200);
    const w2 = await window_(browser, page, cdp, 1500);
    const back = await page.evaluate(() => window.__lab?.state?.() ?? null);
    put('hidden', v.id, { id: v.id, method: 'simulated visibilitychange', rafPerSec: w.rafPerSec, effectFps: w.effectFps, cpuTotal: w.cpu?.total, busyPct: w.busyPct, resumedRafPerSec: w2.rafPerSec, resumedCpu: w2.cpu?.total, state: back });
    log('hidden', v.id, w.rafPerSec, w.cpu?.total, '→ resumed', w2.rafPerSec);
    await ctx.close();
    await save();
  }
}));

// ---------- settle: play a few seconds, ease to a stop, then render nothing ("a moment, not a loop") ----------
if (PHASES.includes('settle')) await withServer((srv) => withBrowser([], async (browser) => {
  for (const [id, query] of [['e1-webgl-vanilla', 'settle=4'], ['f-three-particles', 'settle=4'], ['e1-webgl-vanilla', '']]) {
    if (ONLY && !ONLY.includes(id)) continue;
    const runs = [];
    for (let i = 0; i < Math.min(RUNS, 3); i++) {
      const { ctx, page, cdp } = await newPage(browser);
      await load(page, variantUrl(srv, id, query), { kind: 'script' });
      const during = await window_(browser, page, cdp, 2500);
      await page.waitForTimeout(4000);
      const after = await window_(browser, page, cdp, 3000);
      const st = await page.evaluate(() => ({ settledAt: window.__lab?.settled ? Math.round(window.__lab.settled) : null, state: window.__lab?.state?.(), toggle: document.querySelector('.bg-toggle')?.textContent }));
      runs.push({ during, after, st });
      await ctx.close();
    }
    const m = (f) => r1(median(runs.map(f)));
    const s = { id, query, duringRaf: m((r) => r.during.rafPerSec), duringCpu: m((r) => r.during.cpu?.total), afterRaf: m((r) => r.after.rafPerSec), afterCpu: m((r) => r.after.cpu?.total), afterBusy: m((r) => r.after.busyPct), settledAt: runs[0].st.settledAt, toggle: runs[0].st.toggle, state: runs[0].st.state };
    put('settle', `${id}:${query || 'loop'}`, s);
    log('settle', id, query, JSON.stringify(s));
    await save();
  }
}));

// ---------- governor: the wrapper steps render scale down, then gives up to the poster, when frames are slow ----------
// SwiftShader stands in for a weak or absent GPU here, which is exactly the case a governor exists for.
if (PHASES.includes('governor')) await withServer((srv) => withBrowser([], async (browser) => {
  for (const id of ['e1-webgl-vanilla', 'f-three-particles', 'h-post', 'g-fluid-wrapped', 'd-canvas2d']) {
    if (ONLY && !ONLY.includes(id)) continue;
    const runs = [];
    for (let i = 0; i < Math.min(RUNS, 3); i++) {
      const { ctx, page, cdp } = await newPage(browser);
      await load(page, variantUrl(srv, id, 'gov'), { kind: 'script' });
      const before = await window_(browser, page, cdp, 1500, { probe: true });
      await page.waitForTimeout(9000);
      const after = await window_(browser, page, cdp, 3000, { probe: true });
      const st = await page.evaluate(() => ({ steps: window.__lab.governor, fallback: window.__lab.fallback || null, reason: window.__lab.failReason || null, state: window.__lab.state?.() }));
      runs.push({ before, after, st });
      await ctx.close();
    }
    const m = (f) => r1(median(runs.map(f)));
    const s = { id, beforeEffectFps: m((r) => r.before.effectFps), beforeCpu: m((r) => r.before.cpu?.total), beforeProbeFps: m((r) => r.before.fps),
      afterEffectFps: m((r) => r.after.effectFps), afterCpu: m((r) => r.after.cpu?.total), afterProbeFps: m((r) => r.after.fps),
      outcomes: runs.map((r) => (r.st.fallback ? `poster (${r.st.steps.length} steps)` : `scale ${r.st.steps.at(-1)?.scale ?? 1}, canvas ${r.st.state?.canvas?.join('×')}`)), steps: runs[0].st.steps };
    put('governor', id, s);
    log('governor', id, JSON.stringify(s));
    await save();
  }
}));

// ---------- input responsiveness while the background runs: Event Timing at 4x CPU ----------
// A lab button over the hero is clicked 12 times through the browser's input pipeline; each interaction's
// duration (input delay + handler + presentation, rounded to 8 ms) is the max over its events. Interactions
// under the 16 ms reporting threshold count as 16. INP for < 50 interactions is the worst one.
const INP_IDS = [['a-static', ''], ['b1-css-blobs', ''], ['b2-css-property', ''], ['c1-svg-turbulence', ''], ['d-canvas2d', ''],
  ['e1-webgl-vanilla', ''], ['e1-webgl-vanilla', 'scale=0.5'], ['e1-webgl-vanilla', 'scale=0.5&fps=30'], ['e1-webgl-vanilla', 'scale=0.25'],
  ['e5-three', ''], ['e6-paper', ''], ['e6-paper', 'paperdpr=1'], ['f-three-particles', ''], ['h-post', ''], ['g-fluid-demo', ''], ['g-fluid-wrapped', ''], ['g-fluid-wrapped', 'lite'], ['i-video', '']];
if (PHASES.includes('inp')) await withServer((srv) => withBrowser([], async (browser) => {
  for (const [id, query] of INP_IDS) {
    if (ONLY && !ONLY.includes(id)) continue;
    const runs = [];
    for (let i = 0; i < Math.min(RUNS, 3); i++) {
      const { ctx, page } = await newPage(browser, { throttle: 4 });
      await load(page, variantUrl(srv, id, query), { kind: kindOf(id) });
      await page.waitForTimeout(1500);
      await page.evaluate(() => {
        window.__ev = new Map();
        new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.interactionId) window.__ev.set(e.interactionId, Math.max(window.__ev.get(e.interactionId) || 0, e.duration)); }).observe({ type: 'event', durationThreshold: 16, buffered: true });
        const b = document.createElement('button');
        b.id = 'probe'; b.textContent = 'Clicked 0'; b.style.cssText = 'position:fixed;left:40px;top:90px;z-index:9;padding:10px 16px';
        let n = 0; b.onclick = () => { n++; b.textContent = `Clicked ${n}`; document.body.classList.toggle('odd', n % 2 === 1); };
        document.body.append(b);
      });
      for (let k = 0; k < 12; k++) { await page.mouse.click(70, 105); await page.waitForTimeout(300); }
      await page.waitForTimeout(500);
      const durs = await page.evaluate(() => [...window.__ev.values()]);
      const all = [...durs, ...Array(Math.max(0, 12 - durs.length)).fill(16)];
      runs.push({ median: median(all), max: Math.max(...all), reported: durs.length });
      await ctx.close();
    }
    const s = { id, query, interactionMedian: median(runs.map((r) => r.median)), inp: median(runs.map((r) => r.max)), reportedOver16: runs.map((r) => r.reported) };
    put('inp', query ? `${id}:${query}` : id, s);
    log('inp', id, JSON.stringify(s));
    await save();
  }
}));

// ---------- reduced motion ----------
if (PHASES.includes('reduced')) await withServer((srv) => withBrowser([], async (browser) => {
  const shots = [];
  for (const v of pick(VARIANTS)) {
    const runs = [];
    for (let i = 0; i < Math.min(RUNS, 3); i++) {
      const { ctx, page, cdp, errors } = await newPage(browser, { reduced: true });
      const i0 = srv.log.length;
      const ld = await load(page, variantUrl(srv, v.id), { kind: v.kind });
      await page.waitForTimeout(1500);
      const w = await window_(browser, page, cdp, 3000);
      const req = srv.log.slice(i0).map((e) => e.path);
      if (i === 0) { const f = path.join(DIST, `_reduced-${v.id}.png`); await page.screenshot({ path: f }); shots.push([v.id, f]); }
      const btn = await page.evaluate(() => { const b = document.querySelector('.bg-toggle'); return b && !b.hidden ? `${b.textContent} (aria-pressed=${b.getAttribute('aria-pressed')})` : null; });
      runs.push({ ...w, lcp: ld.lcp, effectLoaded: req.some((p) => /effect\.js|script\.js/.test(p)), btn, errors });
      await ctx.close();
    }
    const s = { rafPerSec: r1(median(runs.map((r) => r.rafPerSec))), cpuTotal: r1(median(runs.map((r) => r.cpu?.total))), busyPct: r1(median(runs.map((r) => r.busyPct))), effectLoaded: runs[0].effectLoaded, lcp: runs[0].lcp, button: runs[0].btn, errors: runs[0].errors.slice(0, 2) };
    put('reduced', v.id, { id: v.id, ...s });
    log('reduced', v.id, JSON.stringify(s));
    await save();
  }
  await sheet(shots, path.join(SHOTS, 'sheet-reduced-motion.jpg'));
}));

// ---------- no WebGL ----------
if (PHASES.includes('nowebgl')) await withServer((srv) => withBrowser(['--disable-webgl', '--disable-webgl2', '--disable-3d-apis'], async (browser) => {
  const shots = [];
  for (const v of pick(VARIANTS)) {
    const { ctx, page, errors } = await newPage(browser);
    const ld = await load(page, variantUrl(srv, v.id), { kind: v.kind, timeout: 20000 });
    await page.waitForTimeout(1500);
    const f = path.join(DIST, `_nowebgl-${v.id}.png`); await page.screenshot({ path: f }); shots.push([v.id, f]);
    const st = await page.evaluate(() => ({ fallback: window.__lab?.fallback || null, reason: window.__lab?.failReason || null, posterVisible: !!document.querySelector('.hero-bg img.poster'), toggleVisible: !!document.querySelector('.bg-toggle:not([hidden])') }));
    put('nowebgl', v.id, { id: v.id, ...st, lcp: ld.lcp, errors: errors.slice(0, 3) });
    log('nowebgl', v.id, JSON.stringify(st), errors.length);
    await ctx.close();
    await save();
  }
  await sheet(shots, path.join(SHOTS, 'sheet-no-webgl.jpg'));
}));

// ---------- WebGL context loss and restore ----------
if (PHASES.includes('contextloss')) await withServer((srv) => withBrowser([], async (browser) => {
  const shots = [];
  for (const v of pick(VARIANTS).filter((x) => webglIds.includes(x.id))) {
    const { ctx, page, errors } = await newPage(browser);
    await load(page, variantUrl(srv, v.id), { kind: v.kind });
    await page.waitForTimeout(800);
    const lose = await page.evaluate(() => {
      const ext = window.__lab?.loseContext?.() || document.querySelector('canvas')?.getContext('webgl2')?.getExtension('WEBGL_lose_context') || document.querySelector('canvas')?.getContext('webgl')?.getExtension('WEBGL_lose_context');
      if (!ext) return 'no extension handle';
      window.__ext = ext; window.__d0 = window.__lab?.draws ?? null; ext.loseContext(); return 'lost';
    });
    await page.waitForTimeout(700);
    const fd = path.join(DIST, `_ctxlost-${v.id}.png`); await page.screenshot({ path: fd }); shots.push([`${v.id} (context lost)`, fd]);
    const during = await page.evaluate(() => { const c = document.querySelector('.hero-bg canvas'); return { canvasOpacity: c ? getComputedStyle(c).opacity : null, draws: window.__lab?.draws ?? null, state: window.__lab?.state?.() ?? null }; });
    await page.evaluate(() => window.__ext?.restoreContext?.());
    await page.waitForFunction(() => { const c = [...document.querySelectorAll('.hero-bg canvas')].at(-1); return c && getComputedStyle(c).opacity === '1' && (window.__lab?.contextRestored ?? 0) > 0; }, null, { timeout: 12000, polling: 200 }).catch(() => {});
    await page.waitForTimeout(800);
    const after = await page.evaluate(() => { const c = [...document.querySelectorAll('.hero-bg canvas')].at(-1); return { canvasOpacity: c ? getComputedStyle(c).opacity : null, draws: window.__lab?.draws ?? null, restored: window.__lab?.contextRestored ?? 0, state: window.__lab?.state?.() ?? null }; });
    const f = path.join(DIST, `_ctx-${v.id}.png`); await page.screenshot({ path: f });
    put('contextloss', v.id, { id: v.id, lose, during, after, errors: errors.slice(0, 3) });
    log('contextloss', v.id, lose, JSON.stringify(during), JSON.stringify(after), errors.length);
    await ctx.close();
    await save();
  }
  await sheet(shots, path.join(SHOTS, 'sheet-context-lost.jpg'));
}));

// ---------- contrast of white copy over the moving background (worst frame) ----------
if (PHASES.includes('contrast')) await withServer((srv) => withBrowser([], async (browser) => {
  for (const v of pick(VARIANTS)) {
    const { ctx, page } = await newPage(browser);
    await load(page, variantUrl(srv, v.id), { kind: v.kind });
    const boxes = await page.evaluate(() => ['#h1', '.lede'].map((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }));
    await page.evaluate(() => document.documentElement.classList.add('capture'));
    const frames = [];
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(900);
      const png = await page.screenshot({ type: 'png' });
      frames.push(boxes.map((b) => regionLuminance(png, b)));
    }
    const worst = (k) => Math.min(...frames.map((f) => f[k].contrastP95));
    put('contrast', v.id, { id: v.id, h1WorstP95: worst(0), ledeWorstP95: worst(1), h1WorstMax: Math.min(...frames.map((f) => f[0].contrastMax)) });
    log('contrast', v.id, worst(0), worst(1));
    await ctx.close();
    await save();
  }
}));

// ---------- fill rate: pixels, DPR, render scale, frame-rate cap, library defaults, quality tier ----------
const FILL = [
  ['e1-webgl-vanilla', 'scale 1 (1280×720 px)', ''], ['e1-webgl-vanilla', 'scale 0.5', 'scale=0.5'], ['e1-webgl-vanilla', 'scale 0.25', 'scale=0.25'],
  ['e1-webgl-vanilla', 'scale 0.5, 30 fps cap', 'scale=0.5&fps=30'],
  ['e1-webgl-vanilla', 'DPR 2 screen, cap 2 (2560×1440 px)', '', 2], ['e1-webgl-vanilla', 'DPR 2 screen, cap 1', 'dpr=1', 2],
  ['e6-paper', 'library default (minPixelRatio 2 → 2560×1440 px)', ''], ['e6-paper', 'minPixelRatio 1', 'paperdpr=1'],
  ['g-fluid-wrapped', 'demo quality (dye 1024, bloom, sunrays)', ''], ['g-fluid-wrapped', 'lite tier (dye 512, no bloom/sunrays)', 'lite'],
  ['d-canvas2d', 'DPR 1', ''], ['d-canvas2d', 'DPR 2 screen', '', 2],
  ['b1-css-blobs', 'no filter', ''], ['b1-css-blobs', 'filter: blur(60px) on each blob', 'blur'],
];
if (PHASES.includes('fill')) await withServer((srv) => withBrowser([], async (browser) => {
  for (const [id, label, query, dsf = 1] of FILL) {
    if (ONLY && !ONLY.includes(id)) continue;
    const runs = [];
    for (let i = 0; i < Math.min(RUNS, 3); i++) runs.push(await measuredRun(browser, srv, id, { query, dsf, windowMs: 4000 }));
    const s = summarise(runs);
    put('fill', `${id}:${label}`, { id, label, query, dsf, ...s });
    log('fill', id, label, `effectFps ${s.effectFps} cpu ${s.cpuTotal} gpu ${s.cpuGpu} canvas ${s.canvas}`);
    await save();
  }
}));

// ---------- library overhead: the same shader at a tiny render size, so fill cost does not hide JS cost ----------
if (PHASES.includes('libs')) await withServer((srv) => withBrowser([], async (browser) => {
  for (const id of ['e1-webgl-vanilla', 'e2-ogl', 'e3-regl', 'e4-twgl', 'e5-three', 'e6-paper']) {
    if (ONLY && !ONLY.includes(id)) continue;
    const runs = [];
    const query = id === 'e6-paper' ? 'paperdpr=1' : 'scale=0.25';
    for (let i = 0; i < RUNS; i++) runs.push(await measuredRun(browser, srv, id, { throttle: 4, query, windowMs: 4000, viewport: id === 'e6-paper' ? { width: 320, height: 180 } : undefined }));
    const s = summarise(runs);
    put('libs', id, { id, query, ...s });
    log('libs', id, `ttff ${s.ttff} boot ${s.bootBlock} js ${s.jsMs} busy ${s.busyPct} effectFps ${s.effectFps}`);
    await save();
  }
}));

// ---------- post-processing ----------
const POST = [['f-three-particles', 'f baseline (no composer)', ''], ['h-post', 'composer, no effects', 'fx=none'], ['h-post', 'bloom', 'fx=bloom'], ['h-post', 'grain (NoiseEffect)', 'fx=grain'],
  ['h-post', 'chromatic aberration', 'fx=ca'], ['h-post', 'vignette', 'fx=vignette'], ['h-post', 'all four, one EffectPass', 'fx=all'], ['h-post', 'all four + SMAA', 'fx=allsmaa'],
  ['a-static', 'static poster (reference)', ''], ['c2-css-grain', 'CSS grain overlay on the poster', '']];
if (PHASES.includes('post')) await withServer((srv) => withBrowser([], async (browser) => {
  for (const [id, label, query] of POST) {
    if (ONLY && !ONLY.includes(id)) continue;
    const runs = [];
    for (let i = 0; i < RUNS; i++) runs.push(await measuredRun(browser, srv, id, { query, windowMs: 4000 }));
    const s = summarise(runs);
    put('post', `${id}:${label}`, { id, label, query, ...s });
    log('post', label, `effectFps ${s.effectFps} cpu ${s.cpuTotal} gpu ${s.cpuGpu} ttff ${s.ttff}`);
    await save();
  }
  // Captures of each post look, on the same frame.
  const shots = [];
  for (const [id, label, query] of POST.filter(([i]) => i !== 'a-static' && i !== 'c2-css-grain')) {
    const { ctx, page } = await newPage(browser);
    await page.goto(variantUrl(srv, id, `still&t0=3&eager&${query}`), { waitUntil: 'load' });
    await page.waitForFunction(() => window.__lab?.ttff != null, null, { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(700);
    const f = path.join(DIST, `_post-${label.replace(/\W+/g, '-')}.png`); await page.screenshot({ path: f }); shots.push([label, f]);
    await ctx.close();
  }
  await sheet(shots, path.join(SHOTS, 'sheet-postprocessing.jpg'));
}));

// ---------- captures of every variant ----------
if (PHASES.includes('shots')) await withServer((srv) => withBrowser([], async (browser) => {
  const shots = [];
  for (const v of pick(VARIANTS)) {
    const { ctx, page } = await newPage(browser);
    await load(page, variantUrl(srv, v.id), { kind: v.kind });
    await page.waitForTimeout(2500);
    const f = path.join(DIST, `_shot-${v.id}.png`); await page.screenshot({ path: f }); shots.push([v.id, f]);
    await ctx.close();
  }
  await sheet(shots, path.join(SHOTS, 'sheet-variants.jpg'));
  // Phone: 390×844 at DPR 3 — the pixel count a phone asks a background shader to fill.
  const phone = [];
  for (const id of ['a-static', 'b1-css-blobs', 'e1-webgl-vanilla', 'f-three-particles']) {
    const { ctx, page } = await newPage(browser, { viewport: { width: 390, height: 844 }, dsf: 3 });
    await load(page, variantUrl(srv, id), { kind: kindOf(id) });
    await page.waitForTimeout(2500);
    const f = path.join(DIST, `_phone-${id}.png`); await page.screenshot({ path: f }); phone.push([id, f]);
    phone.at(-1).push(await page.evaluate(() => window.__lab?.state?.()?.canvas ?? null));
    await ctx.close();
  }
  put('shots', 'phoneCanvas', Object.fromEntries(phone.map(([id, , c]) => [id, c])));
  await sheet(phone.map(([a, b]) => [a, b]), path.join(SHOTS, 'sheet-phone.jpg'), { w: 260, h: 563, cols: 4 });
  await save();
}));

async function sheet(items, out, { w = 480, h = 270, cols = 4 } = {}) {
  const rows = Math.ceil(items.length / cols), pad = 26;
  const comps = [];
  for (let i = 0; i < items.length; i++) {
    const [label, file] = items[i];
    const x = (i % cols) * w, y = Math.floor(i / cols) * (h + pad);
    comps.push({ input: await sharp(file).resize(w, h, { fit: 'cover', position: 'top' }).toBuffer(), left: x, top: y + pad });
    const esc = String(label).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    comps.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${pad}"><text x="6" y="18" font-family="sans-serif" font-size="14" fill="#111">${esc}</text></svg>`), left: x, top: y });
  }
  await sharp({ create: { width: cols * w, height: rows * (h + pad), channels: 3, background: '#ffffff' } }).composite(comps).jpeg({ quality: 72 }).toFile(out);
  log('sheet', path.relative(here, out));
}

// ---------- summary tables ----------
if (PHASES.includes('summary')) {
  const m = results.main || {};
  const rows = VARIANTS.map((v) => {
    const a = m[`${v.id}@1x`] || {}, b = m[`${v.id}@4x`] || {};
    const off = results.offscreen?.[`${v.id}:pause`] || results.offscreen?.[`${v.id}:as-built`] || {};
    const offNo = results.offscreen?.[`${v.id}:nopause`] || {};
    return {
      id: v.id, label: v.label,
      payloadKB: a.payload && { total: r1(a.payload.total / 1024), js: r1(a.payload.js / 1024), poster: r1(a.payload.poster / 1024), html: r1(a.payload.html / 1024), video: r1((a.payload.video || 0) / 1024), other: r1(a.payload.other / 1024) },
      lcp1x: a.lcp, lcp4x: b.lcp, lcpEl: a.lcpEl, ttff1x: a.ttff, ttff4x: b.ttff, bootBlock4x: b.bootBlock,
      fps1x: a.fps, fps4x: b.fps, effectFps1x: a.effectFps, effectFps4x: b.effectFps, over25Pct4x: b.over25Pct,
      busy1x: a.busyPct, busy4x: b.busyPct, cpuTotal1x: a.cpuTotal, cpuGpu1x: a.cpuGpu, cpuRenderer1x: a.cpuRenderer, jsMs1x: a.jsMs, jsMs4x: b.jsMs,
      gpuMsPerFrame1x: a.gpuMsPerFrame, gpuMsPerDisplayFrame1x: a.gpuMsPerDisplayFrame,
      offscreenCpu: off.cpuTotal, offscreenRaf: off.rafPerSec, offscreenCpuNoPause: offNo.cpuTotal, offscreenRafNoPause: offNo.rafPerSec,
      reduced: results.reduced?.[v.id] && { cpu: results.reduced[v.id].cpuTotal, raf: results.reduced[v.id].rafPerSec, effectLoaded: results.reduced[v.id].effectLoaded },
      nowebgl: results.nowebgl?.[v.id] && { fallback: results.nowebgl[v.id].fallback, errors: results.nowebgl[v.id].errors?.length },
      contrast: results.contrast?.[v.id] && results.contrast[v.id].h1WorstP95,
      inp4x: results.inp?.[v.id]?.inp ?? null,
    };
  });
  results.summary = rows;
  await save();
  console.table(rows.map((r) => ({ id: r.id, KB: r.payloadKB?.total, jsKB: r.payloadKB?.js, lcp4x: r.lcp4x, ttff4x: r.ttff4x, fps4x: r.fps4x, eff1x: r.effectFps1x, busy4x: r.busy4x, cpu1x: r.cpuTotal1x, gpu1x: r.cpuGpu1x, offCpu: r.offscreenCpu, offCpuNP: r.offscreenCpuNoPause })));
}
log('done');
