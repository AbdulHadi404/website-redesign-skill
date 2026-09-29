#!/usr/bin/env node
// S10 lab: build every hero-background variant, capture posters, measure everything, write results.json.
//
//   npm install && node run.mjs                      # everything (≈ 3 h on 4 shared CPUs)
//   node run.mjs --runs 1                            # one run per cell, for a quick look
//   node run.mjs --phase main,post --only e1-webgl-vanilla,h-post
//   node run.mjs --phase post --label SMAA           # post-processing rows whose label contains "SMAA"
//   node run.mjs --phase video --reuse-frames        # re-encode the video loop from frames already rendered
//
//   node run.mjs --phase inp --inp-runs 9             # more INP rounds (default 7; rounds interleave the variants)
//
// Phases (default all, in this order): fetch build posters video bundles licences specs census caveat lcp main
//   firstframe offscreen hidden settle governor inp reduced nowebgl contextloss contrast fill libs post blacklevel
//   videocolour shots summary
// fetch clones the fluid demo (pinned) and downloads ffmpeg (imageio-ffmpeg wheel, PyPI) into /tmp/s2-S10.
// Results merge into results.json by phase and key, so a partial run replaces only what it measured.
// Environment: headless Chromium 141 (playwright-core from the skill's scripts), WebGL through SwiftShader:
// GPU work is CPU-emulated, so WebGL numbers compare only with each other — and so is compositing (CSS layers,
// filters, blending): ratios between different kinds of work (fill vs vertex vs compositing) do not transfer to a
// real GPU either. Process CPU % is meaningful at 1x only: CDP CPU throttling itself keeps the renderer ~64% busy
// (main phase, a-static@4x). Machine load changes magnitudes (INP 2.5-3.5x between two sessions); see phaseMeta.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
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
import { census } from './lib/census.mjs';
import { FLUID } from './fetch-sources.mjs';
import { renderFrames, encode, LOOP } from './lib/video.mjs';
import { fetchFfmpeg } from './fetch-sources.mjs';
import { specs } from './lib/specs.mjs';
import { ISOLATE_QUERY, startScreencast, analyse } from './lib/screencast.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const RUNS = Number(arg('runs', 5));
const ALL = ['fetch', 'build', 'posters', 'video', 'bundles', 'licences', 'specs', 'census', 'caveat', 'lcp', 'main', 'firstframe', 'offscreen', 'hidden', 'settle', 'governor', 'inp', 'reduced', 'nowebgl', 'contextloss', 'contrast', 'fill', 'libs', 'post', 'blacklevel', 'videocolour', 'shots', 'summary'];
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
  const reuse = argv.includes('--reuse-frames') && results.video?.frames && existsSync(path.join(frames, 'f0000.png'));
  const r = reuse ? { ...results.video, firstFrame: path.join(frames, 'f0000.png'), reused: true } : await withServer((srv) => withBrowser([], async (browser) => {
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
if (PHASES.includes('census')) { results.census = census(path.join(process.env.S10_SRC || '/tmp/s2-S10', 'census'), path.join(here, 'node_modules'), FLUID.dir); log('census', JSON.stringify(results.census['three.js examples'])); await save(); }
// Does failIfMajorPerformanceCaveat refuse a software renderer? (It is the documented way to skip slow GPUs.)
if (PHASES.includes('caveat')) await withBrowser([], async (browser) => {
  const { ctx, page } = await newPage(browser);
  await page.setContent('<canvas></canvas>');
  results.caveat = await page.evaluate(() => Object.fromEntries([['webgl2', {}], ['webgl2', { failIfMajorPerformanceCaveat: true }], ['webgl', {}], ['webgl', { failIfMajorPerformanceCaveat: true }]].map(([t, a]) => {
    const gl = document.createElement('canvas').getContext(t, a); const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
    return [`${t}${a.failIfMajorPerformanceCaveat ? ' + failIfMajorPerformanceCaveat' : ''}`, gl ? (ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'context') : null];
  })));
  log('caveat', JSON.stringify(results.caveat));
  await ctx.close();
  await save();
});
if (PHASES.includes('licences')) { results.licences = await licences(); log('licences', Object.keys(results.licences).length); await save(); }
if (PHASES.includes('specs')) { results.specs = await specs(); log('specs', JSON.stringify(Object.fromEntries(Object.entries(results.specs).map(([k, v]) => [k, v.allFound])))); await save(); }

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

// ---------- which element is the LCP: hero height x viewport x poster entropy ----------
// Chromium (largest_contentful_paint_calculator.cc, see results.specs) ignores an image whose visible area is
// >= the viewport's area, and one under 0.05 bits per visible CSS pixel. The skill's own hero rules
// (calc(100svh - header); min(100svh, 56rem)) produce heroes shorter than the viewport, so they are tested too.
const LCP_HEROES = [
  ['100svh', '.hero { min-height: 100svh !important; }'],
  ['110svh', '.hero { min-height: 110svh !important; }'],
  ['calc(100svh - 64px) under a 64px header', '.hero { min-height: calc(100svh - 64px) !important; margin-top: 64px; }'],
  ['min(100svh, 56rem)', '.hero { min-height: min(100svh, 56rem) !important; }'],
  ['80vh', '.hero { min-height: 80vh !important; }'],
];
const LCP_VIEWPORTS = [['1280x720', { width: 1280, height: 720 }, 1], ['1280x1100', { width: 1280, height: 1100 }, 1], ['390x844@3', { width: 390, height: 844 }, 3]];
if (PHASES.includes('lcp')) await withServer((srv) => withBrowser([], async (browser) => {
  results.lcp = {};
  for (const id of ['a-static', 'd-canvas2d', 'f-three-particles', 'h-post']) for (const [vp, viewport, dsf] of LCP_VIEWPORTS) for (const [hero, css] of LCP_HEROES) {
    const { ctx, page } = await newPage(browser, { viewport, dsf });
    await ctx.addInitScript((c) => { document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = c; document.head.append(s); }); }, css);
    await page.goto(variantUrl(srv, id), { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    const r = await page.evaluate(() => {
      const lcp = window.__lcp.at(-1);
      const i = document.querySelector('img.poster');
      const vw = document.documentElement.clientWidth, vh = window.innerHeight;
      let poster = null;
      if (i) {
        const e = performance.getEntriesByName(i.currentSrc)[0], b = i.getBoundingClientRect();
        const visible = Math.max(0, Math.min(b.right, vw) - Math.max(b.left, 0)) * Math.max(0, Math.min(b.bottom, vh) - Math.max(b.top, 0));
        let size = visible; const nat = i.naturalWidth * i.naturalHeight, box = b.width * b.height;
        if (box > nat) size = size * nat / box;      // Chromium's upscaling adjustment
        poster = { file: i.currentSrc.split('/').pop(), bytes: e?.encodedBodySize ?? null, visibleArea: Math.round(visible), viewportArea: vw * vh,
          coversViewport: visible >= vw * vh, bitsPerVisiblePx: e ? Math.round((e.encodedBodySize * 8 / size) * 1000) / 1000 : null };
      }
      return { lcpTag: lcp?.tag ?? null, lcpUrl: lcp?.url || null, lcpTime: lcp ? Math.round(lcp.t) : null, poster };
    });
    put('lcp', `${id}|${vp}|${hero}`, { id, viewport: vp, hero, ...r });
    log('lcp', id, vp, hero, r.lcpTag, r.poster?.coversViewport, r.poster?.bitsPerVisiblePx);
    await ctx.close();
  }
  await save();
}));

async function measuredRun(browser, srv, id, { query = '', throttle = 1, windowMs = 5000, probe = true, viewport, dsf, warm = 1000 } = {}) {
  const { ctx, page, cdp, errors } = await newPage(browser, { throttle, viewport, dsf });
  const i0 = srv.log.length;
  try {
    const ld = await load(page, variantUrl(srv, id, query), { kind: kindOf(id) });
    await page.waitForTimeout(warm);
    const w = await window_(browser, page, cdp, windowMs, { probe });
    const pay = await payloadOf(srv.log.slice(i0));
    return { ...ld, ...w, payload: pay, errors: errors.slice(0, 5), failReason: ld.failReason };
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

// ---------- first frame: when the effect is really on screen, not when its first draw call was issued ----------
// drawIssued = when the wrapper issued the first draw call (the old report's "ttff" was the rAF after it).
// crossfadeStart = when the wrapper starts the crossfade: a WebGL2 fence polled per frame says frame 1 is done
//              (WebGL1 variants, e1 and e3, fall back to the next animation frame).
// gpuFirst   = the same page with ?syncfirst: gl.finish() right after the first draw, i.e. when the GPU (here
//              SwiftShader) has really finished frame 1, shader compilation included. WebGL variants only.
// firstVisible = CDP screencast of the hero with poster, scrim and copy hidden and no crossfade: the first
//              presented frame that is not flat navy. blackFrames counts frames that were near-black (a flash).
// Rounds interleave the variants so machine-load drift spreads across all of them.
const FF_IDS = [['d-canvas2d'], ['e1-webgl-vanilla'], ['e1-webgl-vanilla', 'gl2'], ['e2-ogl'], ['e3-regl'], ['e4-twgl'], ['e5-three'], ['e6-paper'], ['f-three-particles'], ['h-post'], ['g-fluid-demo'], ['g-fluid-wrapped'], ['g-fluid-wrapped', 'nofence'], ['h-post', 'nofence'], ['i-video']];
// ?nofence: the wrapper as first written (crossfade and loop start on the next animation frame after the first
// draw call), to measure what waiting for the fence changes: first visible frame and the longest main-thread task.
async function screencastRun(browser, srv, id, { query = '', throttle = 1, until, maxMs = 16000, tailMs = 1200 } = {}) {
  const { ctx, page, cdp } = await newPage(browser, { throttle });
  try {
    const sc = await startScreencast(cdp);
    await page.goto(variantUrl(srv, id, query ? `${ISOLATE_QUERY}&${query}` : ISOLATE_QUERY), { waitUntil: 'load', timeout: 60000 });
    const t0 = Date.now();
    const timeOrigin = await page.evaluate(() => performance.timeOrigin);
    while (Date.now() - t0 < maxMs) {
      await page.waitForTimeout(400);
      const done = until === 'visible' ? (await analyse(sc.frames.slice(), timeOrigin)).firstVisible != null : await page.evaluate(until).catch(() => false);
      if (done) { await page.waitForTimeout(tailMs); break; }
    }
    const frames = await sc.stop();
    const a = await analyse(frames, timeOrigin);
    const lab = await page.evaluate(() => { const l = window.__lab || {}; return { initMs: l.initMs ?? null, firstDrawMs: l.firstDrawMs ?? null, longestTask5s: Math.round(window.__long.filter(([st]) => st < 5000).reduce((a, [, d]) => Math.max(a, d), 0)), drawIssued: l.drawIssued ?? l.ttff ?? null, crossfade: l.ttff ?? null, fenceMs: l.fenceMs ?? null, bootStart: l.bootStart ?? null, motionStart: l.motionStart ?? null, settled: l.settled ?? null, settledRunWall: l.settledRunWall ?? null, fallback: l.fallback ?? null, label: document.querySelector('.bg-toggle')?.textContent ?? null }; });
    return { page, ctx, cdp, ...a, ...lab };
  } catch (e) { await ctx.close(); return { failed: e.message.split('\n')[0] }; }
}
const spread = (xs) => { const v = xs.filter((x) => typeof x === 'number'); return v.length ? { median: r1(median(v)), min: r1(Math.min(...v)), max: r1(Math.max(...v)), n: v.length } : null; };
if (PHASES.includes('firstframe')) await withServer((srv) => withBrowser([], async (browser) => {
  const ids = FF_IDS.filter(([id]) => !ONLY || ONLY.includes(id));
  const acc = {};
  const ffRuns = Number(arg('ff-runs', RUNS));
  for (let i = 0; i < ffRuns; i++) for (const [id, query = ''] of ids) for (const throttle of [1, 4]) {
    const r = await screencastRun(browser, srv, id, { query, throttle, until: 'visible', maxMs: 15000, tailMs: 300 });
    if (r.ctx) await r.ctx.close();
    const k = `${id}${query ? `:${query}` : ''}@${throttle}x`;
    (acc[k] ||= { id, query, throttle, drawIssued: [], firstVisible: [], gpuFirst: [], bootStart: [], initMs: [], firstDrawMs: [], longest: [], black: 0, fallback: [] });
    acc[k].initMs.push(r.initMs); acc[k].firstDrawMs.push(r.firstDrawMs); acc[k].longest.push(r.longestTask5s);
    acc[k].drawIssued.push(r.drawIssued); (acc[k].crossfade ||= []).push(r.crossfade); acc[k].firstVisible.push(r.firstVisible); acc[k].bootStart.push(r.bootStart); acc[k].black += r.blackCount || 0;
    if (r.fallback || r.failed) acc[k].fallback.push(r.fallback || r.failed);
    if (throttle === 1 && !/^(d-|i-)/.test(id)) {       // WebGL: when is frame 1 really finished on the GPU?
      const { ctx, page } = await newPage(browser);
      try {
        await page.goto(variantUrl(srv, id, query ? `syncfirst&${query}` : 'syncfirst'), { waitUntil: 'load', timeout: 60000 });
        await page.waitForFunction(() => window.__lab?.gpuFirst != null || window.__lab?.fallback, null, { timeout: 30000, polling: 50 }).catch(() => {});
        acc[k].gpuFirst.push(await page.evaluate(() => window.__lab?.gpuFirst ?? null));
      } finally { await ctx.close(); }
    }
    log('firstframe', i, k, `drawIssued ${r1(r.drawIssued)} gpuFirst ${r1(acc[k].gpuFirst.at(-1))} visible ${r.firstVisible} black ${r.blackCount} frames ${r.frames}`);
  }
  for (const [k, a] of Object.entries(acc)) {
    put('firstframe', k, { id: a.id, query: a.query, throttle: a.throttle, drawIssued: spread(a.drawIssued), gpuFirst: spread(a.gpuFirst), firstVisible: spread(a.firstVisible), crossfadeStart: spread(a.crossfade), effectImportStart: spread(a.bootStart), initMs: spread(a.initMs), firstDrawMs: spread(a.firstDrawMs), longestTaskFirst5s: spread(a.longest), blackFrames: a.black, fallbacks: a.fallback, rawVisible: a.firstVisible, rawGpuFirst: a.gpuFirst.map(r1) });
  }
  await save();
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

// ---------- settle: a moment, not a loop — total motion within WCAG 2.2.2's 5 s, on a fast and a slow frame rate ----------
// ?settle=4 means 4 s of motion in total (the last 1.33 s easing out), wall-clock from the first animated frame.
// Measured twice over: the wrapper's own clock (motionStart → settled, when the last frame was issued) and the
// screen (CDP screencast: first presented frame of the effect → the last frame that still changed).
// e1 runs at ~4.6 fps in SwiftShader: the slow-device case the earlier version overran (10.7 s).
if (PHASES.includes('settle')) await withServer((srv) => withBrowser([], async (browser) => {
  for (const [id, query] of [['e1-webgl-vanilla', 'settle=4'], ['f-three-particles', 'settle=4']]) for (const throttle of [1, 4]) {
    if (ONLY && !ONLY.includes(id)) continue;
    const runs = [];
    for (let i = 0; i < Math.min(RUNS, 3); i++) {
      const r = await screencastRun(browser, srv, id, { query, throttle, until: () => window.__lab?.settled != null || !!window.__lab?.fallback, maxMs: 20000, tailMs: 1500 });
      if (r.failed) { runs.push(r); continue; }
      const after = await window_(browser, r.page, r.cdp, 2500);
      await r.ctx.close();
      runs.push({ ...r, page: undefined, ctx: undefined, cdp: undefined,
        wrapperMotionMs: r.settled != null && r.motionStart != null ? Math.round(r.settled - r.motionStart) : null,
        screenMotionMs: r.lastVisibleChange != null && r.firstVisible != null ? r.lastVisibleChange - r.firstVisible : null,
        afterRaf: after.rafPerSec, afterCpu: after.cpu?.total, afterBusy: after.busyPct });
    }
    const ok = runs.filter((r) => !r.failed);
    const s = { id, query, throttle, runs: ok.length, wrapperMotionMs: spread(ok.map((r) => r.wrapperMotionMs)), screenMotionMs: spread(ok.map((r) => r.screenMotionMs)),
      motionStartMs: spread(ok.map((r) => r.motionStart)), settledAtMs: spread(ok.map((r) => r.settled)), firstVisibleMs: spread(ok.map((r) => r.firstVisible)), lastChangeMs: spread(ok.map((r) => r.lastChange)), lastVisibleChangeMs: spread(ok.map((r) => r.lastVisibleChange)),
      // WCAG 2.2.2 clock on screen: from the first presented frame of the effect to its last presented change
      screenFirstToLastMs: spread(ok.map((r) => (r.lastChange != null && r.firstVisible != null ? r.lastChange - r.firstVisible : null))),
      afterRaf: r1(median(ok.map((r) => r.afterRaf))), afterBusy: r1(median(ok.map((r) => r.afterBusy))),
      // process CPU only at 1x: CDP CPU throttling itself keeps the renderer ~64% busy (main phase, a-static@4x)
      afterCpu: throttle === 1 ? r1(median(ok.map((r) => r.afterCpu))) : null, labelAfter: ok[0]?.label, failed: runs.filter((r) => r.failed).map((r) => r.failed) };
    put('settle', `${id}:${query}@${throttle}x`, s);
    log('settle', id, query, `${throttle}x`, JSON.stringify(s));
    await save();
  }
  for (const k of Object.keys(results.settle || {})) if (!k.includes('@')) delete results.settle[k];   // rows of the old 1.5-s-overrun version
  await save();
}));

// ---------- governor: the wrapper steps render scale down, then gives up to the poster, when frames are slow ----------
// SwiftShader stands in for a weak or absent GPU here, which is exactly the case a governor exists for.
if (PHASES.includes('governor')) await withServer((srv) => withBrowser([], async (browser) => {
  // burn=N adds a fixed N ms of CPU per frame to the cheap Canvas 2D effect: slow, but not fill-bound, so halving
  // the resolution cannot help. The governor should undo that halving, then keep running (28 ms, ~30 fps) or
  // give up to the poster (45 ms, ~20 fps). Deterministic, unlike SwiftShader's load-dependent speed.
  for (const [id, extra = ''] of [['e1-webgl-vanilla'], ['f-three-particles'], ['h-post'], ['g-fluid-wrapped'], ['d-canvas2d'], ['d-canvas2d', 'burn=28'], ['d-canvas2d', 'burn=45']]) {
    if (ONLY && !ONLY.includes(id)) continue;
    const runs = [];
    for (let i = 0; i < Math.min(RUNS, 3); i++) {
      const { ctx, page, cdp } = await newPage(browser);
      await load(page, variantUrl(srv, id, extra ? `gov&${extra}` : 'gov'), { kind: 'script' });
      const before = await window_(browser, page, cdp, 1500, { probe: true });
      await page.waitForTimeout(12000);
      const after = await window_(browser, page, cdp, 3000, { probe: true });
      const st = await page.evaluate(() => ({ steps: window.__lab.governor, fallback: window.__lab.fallback || null, reason: window.__lab.failReason || null, state: window.__lab.state?.() }));
      runs.push({ before, after, st });
      await ctx.close();
    }
    const m = (f) => r1(median(runs.map(f)));
    const s = { id, beforeEffectFps: m((r) => r.before.effectFps), beforeCpu: m((r) => r.before.cpu?.total), beforeProbeFps: m((r) => r.before.fps),
      afterEffectFps: m((r) => r.after.effectFps), afterCpu: m((r) => r.after.cpu?.total), afterProbeFps: m((r) => r.after.fps),
      outcomes: runs.map((r) => (r.st.fallback ? `poster (${r.st.steps.length} steps)` : `scale ${r.st.steps.at(-1)?.scale ?? 1}, canvas ${r.st.state?.canvas?.join('×')}`)), steps: runs[0].st.steps };
    s.query = extra; put('governor', extra ? `${id}:${extra}` : id, s);
    log('governor', id, JSON.stringify(s));
    await save();
  }
}));

// ---------- input responsiveness while the background runs: Event Timing at 4x CPU ----------
// A lab button over the hero is clicked 12 times through the browser's input pipeline; each interaction's
// duration (input delay + handler + presentation, rounded to 8 ms) is the max over its events. Interactions
// under the 16 ms reporting threshold count as 16. INP for < 50 interactions is the worst one.
// Rounds interleave the variants (round 1: every variant, round 2: every variant, ...) so machine-load drift is
// shared; the report uses bands (good <= 200 ms, needs improvement <= 500, poor > 500) and the spread across rounds.
const INP_IDS = [['a-static', ''], ['b1-css-blobs', ''], ['b2-css-property', ''], ['c1-svg-turbulence', ''], ['d-canvas2d', ''],
  ['e1-webgl-vanilla', ''], ['e1-webgl-vanilla', 'scale=0.5'], ['e1-webgl-vanilla', 'scale=0.5&fps=30'], ['e1-webgl-vanilla', 'scale=0.25'],
  ['e5-three', ''], ['e6-paper', ''], ['e6-paper', 'paperdpr=1'], ['f-three-particles', ''], ['h-post', ''], ['g-fluid-demo', ''], ['g-fluid-wrapped', ''], ['g-fluid-wrapped', 'lite'], ['i-video', '']];
const band = (ms) => (ms == null ? null : ms <= 200 ? 'good' : ms <= 500 ? 'needs improvement' : 'poor');
async function inpRun(browser, srv, id, query) {
  const { ctx, page } = await newPage(browser, { throttle: 4 });
  try {
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
    return { median: median(all), max: Math.max(...all), reported: durs.length };
  } finally { await ctx.close(); }
}
if (PHASES.includes('inp')) await withServer((srv) => withBrowser([], async (browser) => {
  const ids = INP_IDS.filter(([id]) => !ONLY || ONLY.includes(id));
  const rounds = Number(arg('inp-runs', 7));
  const acc = new Map();
  for (let i = 0; i < rounds; i++) {
    for (const [id, query] of ids) {
      const key = query ? `${id}:${query}` : id;
      const r = await inpRun(browser, srv, id, query).catch((e) => ({ failed: e.message.split('\n')[0] }));
      (acc.get(key) || acc.set(key, { id, query, runs: [] }).get(key)).runs.push(r);
      log('inp', i, key, r.max, r.failed || '');
    }
    for (const [key, a] of acc) {
      const ok = a.runs.filter((r) => !r.failed);
      const worst = ok.map((r) => r.max);
      put('inp', key, { id: a.id, query: a.query, rounds: ok.length, inp: median(worst), inpMin: Math.min(...worst), inpMax: Math.max(...worst), worstPerRound: worst,
        interactionMedian: median(ok.map((r) => r.median)), band: band(median(worst)), bandsSeen: [...new Set(worst.map(band))], loadavg: os.loadavg().map(r1) });
    }
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
      const btn = await page.evaluate(() => { const b = document.querySelector('.bg-toggle'); return b && !b.hidden ? { label: b.textContent, ariaPressed: b.getAttribute('aria-pressed') } : null; });
      const effectLoaded = srv.log.slice(i0).map((e) => e.path).some((p) => /effect\.js|script\.js/.test(p));
      if (btn && i === 0) {            // the opt-in: one click plays it, and the label then says what the next click does
        const r0 = await page.evaluate(() => window.__rafCount);
        await page.click('.bg-toggle');
        await page.waitForTimeout(2500);
        btn.afterClick = await page.evaluate((r) => { const b = document.querySelector('.bg-toggle'); return { label: b.textContent, ariaPressed: b.getAttribute('aria-pressed'), rafSince: window.__rafCount - r, runningAnimations: document.getAnimations().filter((a) => a.playState === 'running').length, smilPaused: document.querySelector('.turb')?.animationsPaused?.() ?? null }; }, r0);
      }
      runs.push({ ...w, lcp: ld.lcp, effectLoaded, btn, errors });
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
  ['h-post', 'chromatic aberration', 'fx=ca'], ['h-post', 'vignette', 'fx=vignette'], ['h-post', 'all four, one EffectPass', 'fx=all'], ['h-post', 'all four + SMAA (second EffectPass)', 'fx=allsmaa'], ['h-post', 'all four + SMAA merged into one pass (throws → poster)', 'fx=allsmaa1'],
  ['a-static', 'static poster (reference)', ''], ['c2-css-grain', 'CSS grain overlay on the poster', '']];
if (PHASES.includes('post')) await withServer((srv) => withBrowser([], async (browser) => {
  for (const [id, label, query] of POST) {
    if (ONLY && !ONLY.includes(id)) continue;
    if (arg('label') && !label.includes(arg('label'))) continue;
    const runs = [];
    for (let i = 0; i < RUNS; i++) runs.push(await measuredRun(browser, srv, id, { query, windowMs: 4000 }));
    const s = summarise(runs);
    put('post', `${id}:${label}`, { id, label, query, ...s, failReason: runs.find((r) => r.failReason)?.failReason ?? null });
    log('post', label, `effectFps ${s.effectFps} cpu ${s.cpuTotal} gpu ${s.cpuGpu} ttff ${s.ttff}`);
    await save();
  }
  const labels = new Set(POST.map(([i, l]) => `${i}:${l}`));
  for (const k of Object.keys(results.post || {})) if (!labels.has(k)) delete results.post[k];   // rows renamed or removed
  await save();
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

// ---------- black level after post-processing: does the EffectPass lift the brand navy? ----------
// Mean colour of an empty patch of the hero (no particles, no CSS scrim) against the navy #09122a (9, 18, 42).
if (PHASES.includes('blacklevel')) await withServer((srv) => withBrowser([], async (browser) => {
  const out = {};
  for (const fx of ['none', 'vignette', 'all']) for (const bg of ['clear colour only', 'scene.background']) for (const fbt of ['half', 'u8']) {
    const { ctx, page } = await newPage(browser);
    await page.goto(variantUrl(srv, 'h-post', `capture&noscrim&eager&still&t0=0&fx=${fx}${bg === 'clear colour only' ? '&bg=clear' : ''}${fbt === 'u8' ? '&fbt=u8' : ''}`), { waitUntil: 'load' });
    await page.waitForFunction(() => window.__lab?.ttff != null || window.__lab?.fallback, null, { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(500);
    const png = await page.screenshot({ type: 'png', clip: { x: 580, y: 40, width: 120, height: 60 } });
    const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const m = [0, 1, 2].map((c) => { let t = 0; for (let i = c; i < data.length; i += 3) t += data[i]; return Math.round(t / (info.width * info.height)); });
    out[`fx=${fx} ${bg} ${fbt}`] = { rgb: m, target: [9, 18, 42] };
    log('blacklevel', fx, bg, fbt, m.join(','));
    await ctx.close();
  }
  results.blacklevel = out;
  await save();
}));

// ---------- video colour: untagged vs BT.709-tagged encodes, decoded by Chromium, against the source frame ----------
if (PHASES.includes('videocolour')) {
  const ffmpeg = fetchFfmpeg();
  const frames = path.join(DIST, '_frames'), dir = path.join(DIST, '_colour');
  await mkdir(dir, { recursive: true });
  const base = ['-y', '-hide_banner', '-loglevel', 'error', '-framerate', '24', '-i', path.join(frames, 'f%04d.png'), '-frames:v', '24', '-c:v', 'libvpx-vp9', '-crf', '30', '-b:v', '0', '-pix_fmt', 'yuv420p', '-an'];
  const tag = ['-vf', 'scale=out_color_matrix=bt709:out_range=tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv'];
  execFileSync(ffmpeg, [...base, path.join(dir, 'untagged.webm')]);
  execFileSync(ffmpeg, [...base.slice(0, 8), ...tag, ...base.slice(8), path.join(dir, 'tagged.webm')]);
  await writeFile(path.join(dir, 'index.html'), `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#000}video{display:block;width:1280px;height:720px}</style><video muted playsinline preload="auto"></video><script>const v=document.querySelector('video');v.src=new URLSearchParams(location.search).get('src');v.addEventListener('loadeddata',()=>{v.currentTime=0;v.addEventListener('seeked',()=>{window.ready=true},{once:true});});</script>`);
  const patch = { left: 640, top: 200, width: 320, height: 200 };
  const mean = async (buf) => { const { data, info } = await sharp(buf).extract(patch).removeAlpha().raw().toBuffer({ resolveWithObject: true }); return [0, 1, 2].map((c) => { let t = 0; for (let i = c; i < data.length; i += 3) t += data[i]; return Math.round((t / (info.width * info.height)) * 10) / 10; }); };
  const src = await mean(await readFile(path.join(frames, 'f0000.png')));
  const out = { source: src };
  await withServer((srv) => withBrowser([], async (browser) => {
    for (const f of ['untagged.webm', 'tagged.webm']) {
      const { ctx, page } = await newPage(browser);
      await page.goto(`${srv.base}/_colour/?src=${f}`);
      await page.waitForFunction(() => window.ready, null, { timeout: 30000 });
      await page.waitForTimeout(300);
      const m = await mean(await page.screenshot({ type: 'png' }));
      out[f] = { rgb: m, maxDiff: Math.max(...m.map((x, i) => Math.abs(x - src[i]))) };
      log('videocolour', f, m.join(','), 'source', src.join(','));
      await ctx.close();
    }
  }));
  results.videocolour = out;
  await save();
}

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
      lcp1x: a.lcp, lcp4x: b.lcp, lcpEl: a.lcpEl, drawIssuedMain1x: a.ttff, drawIssuedMain4x: b.ttff, bootBlock4x: b.bootBlock,   // main-phase "ttff" = draw issued, not presented
      fps1x: a.fps, fps4x: b.fps, effectFps1x: a.effectFps, effectFps4x: b.effectFps, over25Pct4x: b.over25Pct,
      busy1x: a.busyPct, busy4x: b.busyPct, cpuTotal1x: a.cpuTotal, cpuGpu1x: a.cpuGpu, cpuRenderer1x: a.cpuRenderer, jsMs1x: a.jsMs, jsMs4x: b.jsMs,
      gpuMsPerFrame1x: a.gpuMsPerFrame, gpuMsPerDisplayFrame1x: a.gpuMsPerDisplayFrame,
      offscreenCpu: off.cpuTotal, offscreenRaf: off.rafPerSec, offscreenCpuNoPause: offNo.cpuTotal, offscreenRafNoPause: offNo.rafPerSec,
      reduced: results.reduced?.[v.id] && { cpu: results.reduced[v.id].cpuTotal, raf: results.reduced[v.id].rafPerSec, effectLoaded: results.reduced[v.id].effectLoaded },
      nowebgl: results.nowebgl?.[v.id] && { fallback: results.nowebgl[v.id].fallback, errors: results.nowebgl[v.id].errors?.length },
      contrast: results.contrast?.[v.id] && results.contrast[v.id].h1WorstP95,
      inp4x: results.inp?.[v.id]?.inp ?? null, inp4xRange: results.inp?.[v.id] ? [results.inp[v.id].inpMin, results.inp[v.id].inpMax] : null, inpBand: results.inp?.[v.id]?.band ?? null,
      drawIssued1x: results.firstframe?.[`${v.id}@1x`]?.drawIssued?.median ?? null, gpuFirst1x: results.firstframe?.[`${v.id}@1x`]?.gpuFirst?.median ?? null,
      firstVisible1x: results.firstframe?.[`${v.id}@1x`]?.firstVisible?.median ?? null, firstVisible4x: results.firstframe?.[`${v.id}@4x`]?.firstVisible?.median ?? null,
      // Deterministic payload of the current build at 1280×720, DPR 1 (text gzip -9; poster AVIF 1600w; AV1 video):
      // the measured payloadKB above is from the run's own requests and can lag a later rebuild by a few KB.
      buildKB: (() => {
        const b = results.build?.[v.id]; if (!b) return null;
        const post = v.poster && results.posters?.[v.poster]?.[1600]?.avif || (v.poster === 'video' ? results.video?.poster?.[1600]?.avif : 0) || 0;
        const vid = b.video?.['loop-av1.webm'] || 0;
        const js = (b.effect?.gzip || 0);
        return { html: r1(b.html.gzip / 1024), js: r1(js / 1024), poster: r1(post / 1024), video: r1(vid / 1024), total: r1((b.html.gzip + js + post + vid) / 1024) };
      })(),
    };
  });
  results.summary = rows;
  await save();
  console.table(rows.map((r) => ({ id: r.id, KB: r.payloadKB?.total, jsKB: r.payloadKB?.js, lcp4x: r.lcp4x, visible1x: r.firstVisible1x, inp: r.inp4x, fps4x: r.fps4x, eff1x: r.effectFps1x, busy4x: r.busy4x, cpu1x: r.cpuTotal1x, gpu1x: r.cpuGpu1x, offCpu: r.offscreenCpu, offCpuNP: r.offscreenCpuNoPause })));
}
log('done');
