#!/usr/bin/env node
// Sprite pipeline lab: generate + pack sprites, then measure payload, requests, load under a phone network, decode,
// and per-frame cost in Canvas 2D and PixiJS (frames, parallax, tile map, 9-slice, skeletal vs frames), plus the
// payload of 2D animation runtimes. Writes results.json → "sprites". Needs `node fetch-assets.mjs` first (spineboy).
//
//   node run-sprites.mjs [--runs 5] [--skip-gen] [--only load,h2,decode,canvas,pixi,parallax,tilemap,nineslice,bleed,csspaint,spine,quality,runtimes]
import { build } from 'esbuild';
import { mkdir, writeFile, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import sharp from 'sharp';
import { packAsync } from 'free-tex-packer-core';
import pixelmatch from 'pixelmatch';
import { generate } from './sprites/gen.mjs';
import { serve, BUILD, CACHE, LAB } from './lib/serve.mjs';
import { median, round } from './lib/stats.mjs';
import { mergeResults, launchLab } from './lib/common.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const RUNS = Number(arg('runs', 5));
const ONLY = arg('only') ? arg('only').split(',') : null;
const want = (k) => !ONLY || ONLY.includes(k);
const SB = path.join(BUILD, 'sprites');
const out = { runs: RUNS, env: {} };

// 1. generate + pack
if (!argv.includes('--skip-gen') || !existsSync(path.join(SB, 'meta.json'))) out.meta = await generate(SB);
else out.meta = JSON.parse(await readFile(path.join(SB, 'meta.json'), 'utf8'));

// 2. bundle the lab page
await mkdir(BUILD, { recursive: true });
const b = await build({ entryPoints: [path.join(LAB, 'sprites/lab.js')], bundle: true, format: 'esm', minify: true, outfile: path.join(BUILD, 'sprite-lab.js'), logLevel: 'silent', metafile: true });
await writeFile(path.join(BUILD, 'sprite-lab.html'), `<!doctype html><meta charset=utf-8><style>body{margin:0;background:#111}canvas{display:block}</style><script type=module src="/build/sprite-lab.js"></script>`);
// CSS sprite demo page: a uniform grid animated with two steps() animations (x within a row, y across rows).
await writeFile(path.join(BUILD, 'css-sprite.html'), `<!doctype html><meta charset=utf-8><style>
body{margin:0;background:#1b1f33;display:flex;gap:24px;padding:24px;flex-wrap:wrap}
.s{width:128px;height:128px;background:url(/build/sprites/grid-png/grid.png) 0 0/1280px 768px;
animation:x .2s steps(10) infinite,y 2s steps(6) infinite}
@keyframes x{to{background-position-x:-1280px}}@keyframes y{to{background-position-y:-768px}}
@media (prefers-reduced-motion:reduce){.s{animation:none}}
</style>${'<div class=s></div>'.repeat(12)}`);

const srv = await serve();
const { browser, version } = await launchLab();
out.env = { chromium: version, note: 'headless Chromium, WebGL through SwiftShader (CPU): GPU-bound numbers are pessimistic and only comparable among themselves' };

async function onPage(fn, { throttle = false, viewport = { width: 1280, height: 720 } } = {}) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  if (throttle) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 100, downloadThroughput: (9e6 / 8), uploadThroughput: (2e6 / 8) });
  }
  await page.goto(`${srv.url}/build/sprite-lab.html`);
  await page.waitForFunction(() => window.labReady === true);
  try { return await fn(page); } catch (e) { return { error: String(e.message || e).slice(0, 300), pageErrors: errors }; } finally { await ctx.close(); }
}
const summarise = (label, rs) => {
  const ok = rs.filter((x) => x && !x.error);
  if (!ok.length) { console.error(label, rs[0]); return rs[0]; }
  const keys = Object.keys(ok[0]).filter((k) => typeof ok[0][k] === 'number');
  const res = Object.fromEntries(keys.map((k) => [k, round(median(ok.map((x) => x[k])), 2)]));
  res.n = ok.length;
  // per-run samples and min–max, so the spread behind each median can be checked
  res.range = Object.fromEntries(keys.map((k) => { const v = ok.map((x) => x[k]).filter(Number.isFinite); return [k, v.length ? [round(Math.min(...v), 2), round(Math.max(...v), 2)] : null]; }));
  res.samples = Object.fromEntries(keys.map((k) => [k, ok.map((x) => round(x[k], 2))]));
  console.error(label, JSON.stringify(res));
  return res;
};
// Variants are interleaved run by run (A B C A B C …), so drift in a shared machine's load hits all of them alike.
async function compare(label, variants, opts) {
  const acc = Object.fromEntries(Object.keys(variants).map((k) => [k, []]));
  for (let r = 0; r < RUNS; r++) for (const [k, fn] of Object.entries(variants)) acc[k].push(await onPage(fn, opts));
  return Object.fromEntries(Object.entries(acc).map(([k, rs]) => [k, summarise(`${label} ${k}`, rs)]));
}
const call = (name, a) => (p) => p.evaluate(([n, x]) => window.lab[n](x), [name, a]);

const FMTS = ['png', 'png8', 'webp', 'avif'];
const SETS = ['files', 'grid', 'atlas'];
const combos = SETS.flatMap((set) => FMTS.map((fmt) => ({ set, fmt })));
if (want('load')) out.load = await compare('load', Object.fromEntries(combos.map((c) => [`${c.set}-${c.fmt}`, call('load', c)])), { throttle: true });
if (want('decode')) out.decode = await compare('decode', Object.fromEntries(combos.map((c) => [`${c.set}-${c.fmt}`, call('decode', c)])));
if (want('canvas')) out.canvasDraw = await compare('canvas', Object.fromEntries(['atlas', 'grid', 'files'].map((source) => [source, call('canvasDraw', { source, n: 300 })])));
if (want('pixi')) out.pixiDraw = await compare('pixi', Object.fromEntries(['atlas', 'grid', 'files'].map((source) => [source, call('pixiDraw', { source, n: 300 })])));
if (want('parallax')) out.parallax = await compare('parallax', Object.fromEntries(['canvas', 'pixi'].map((engine) => [engine, call('parallax', { engine })])));
if (want('tilemap')) out.tilemap = await compare('tilemap', Object.fromEntries(['canvas-tiles', 'canvas-chunks', 'pixi-all', 'pixi-visible'].map((mode) => [mode, call('tilemap', { mode })])));
if (want('nineslice')) {
  out.nineslice = await onPage(async (p) => {
    const r = await p.evaluate(() => window.lab.nineslice());
    await p.setViewportSize({ width: 1280, height: 1440 });
    await p.screenshot({ path: path.join(LAB, 'shots/nineslice-pixi-vs-css.jpg'), type: 'jpeg', quality: 70, fullPage: true });
    // top half = Pixi NineSliceSprite, bottom half = CSS border-image: how many pixels differ?
    const png = await sharp(await p.screenshot({ type: 'png', fullPage: true })).removeAlpha().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const half = 720 * png.info.width * 4;
    const a = png.data.subarray(0, half), b2 = png.data.subarray(half, 2 * half);
    r.cssVsPixiDiffPct = round((100 * pixelmatch(a, b2, null, png.info.width, 720, { threshold: 0.1 })) / (png.info.width * 720), 3);
    return r;
  });
  const ctx = await browser.newContext({ viewport: { width: 760, height: 330 } });
  const page = await ctx.newPage(); await page.goto(`${srv.url}/build/css-sprite.html`); await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(LAB, 'shots/css-sprite-steps.jpg'), type: 'jpeg', quality: 70 }); await ctx.close();
  // atlas vs grid, side by side
  const grid = await sharp(path.join(SB, 'grid-png/grid.png')).resize(640).flatten({ background: '#1b1f33' }).toBuffer();
  const atl = await sharp(path.join(SB, 'atlas-png/atlas.png')).resize(Math.round(out.meta.atlas.width / 2)).flatten({ background: '#1b1f33' }).toBuffer();
  await sharp({ create: { width: 1000, height: 400, channels: 3, background: '#0d0f1a' } }).composite([{ input: grid, left: 0, top: 0 }, { input: atl, left: 660, top: 0 }]).jpeg({ quality: 70 }).toFile(path.join(LAB, 'shots/sprite-grid-vs-atlas.jpg'));
}

// HTTP/2: the same 60 files vs one atlas over a single multiplexed TLS connection (production CDNs speak h2/h3),
// so the request penalty measured above over HTTP/1.1 (6 connections) is not over-read.
if (want('h2')) {
  const s2 = await serve(0, { h2: true });
  const acc = {};
  for (let r = 0; r < RUNS; r++) {
    for (const key of ['files-webp', 'atlas-webp', 'files-png', 'atlas-png']) {
      const [set, fmt] = key.split('-');
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, ignoreHTTPSErrors: true });
      const page = await ctx.newPage();
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 100, downloadThroughput: (9e6 / 8), uploadThroughput: (2e6 / 8) });
      await page.goto(`${s2.url}/build/sprite-lab.html`);
      await page.waitForFunction(() => window.labReady === true);
      const res = await page.evaluate((a) => window.lab.load(a), { set, fmt });
      res.protocol = await page.evaluate(() => performance.getEntriesByType('resource').map((e) => e.nextHopProtocol).find(Boolean));
      (acc[key] ||= []).push(res);
      await ctx.close();
    }
  }
  out.loadH2 = Object.fromEntries(Object.entries(acc).map(([k, rs]) => { const x = summarise(`load-h2 ${k}`, rs); x.protocol = rs[0].protocol; return [k, x]; }));
  await s2.close();
}

// Atlas bleeding: padding / extrusion variants × the transforms a page applies.
if (want('bleed')) {
  const { BLEED_VARIANTS } = await import('./sprites/gen.mjs');
  const modes = ['canvas:0.8:0.37', 'canvas:1:0.5', 'pixi:0.8:0.37', 'pixi:1:0.5', 'pixi-mip:0.3:0.37', 'pixi-nearest:2:0'];
  out.bleed = {};
  for (const variant of Object.keys(BLEED_VARIANTS)) {
    out.bleed[variant] = {};
    for (const mode of modes) {
      const r = await onPage((p) => p.evaluate((a) => window.lab.bleed(a), { variant, mode }));
      out.bleed[variant][mode] = r.error ? r : { bleedPct: round(r.bleedPct, 2), seamPct: round(r.seamPct, 2) };
    }
    console.error('bleed', variant, JSON.stringify(out.bleed[variant]));
  }
}

// CSS sprite animation: background-position steps() (a repaint per frame on the main thread) vs transform steps()
// on an <img> inside an overflow:hidden box (composited). Counts Paint / style-recalc events over 3 s, and reads the
// compositor's layer tree (CDP LayerTree): each transform-animated <img> becomes its own composited layer the size of
// the WHOLE image, so the memory side of the trade is measured too (layer area × 4 B/px, an upper bound on raster
// memory). Two sheet shapes: the 1280×768 grid (60 frames, animated on two axes) and a one-row strip (1280×128,
// 10 frames), the shape the skill recommends.
if (want('csspaint')) {
  const common = `body{margin:0;background:#1b1f33;display:flex;gap:24px;padding:24px;flex-wrap:wrap}`;
  await sharp(path.join(SB, 'grid-png/grid.png')).extract({ left: 0, top: 0, width: 1280, height: 128 }).png().toFile(path.join(SB, 'strip.png'));
  await writeFile(path.join(BUILD, 'css-sprite-transform.html'), `<!doctype html><meta charset=utf-8><style>${common}
.s{width:128px;height:128px;overflow:hidden;contain:strict}
.s .r{animation:y 2s steps(6) infinite}
.s img{display:block;width:1280px;height:768px;max-width:none;animation:x .2s steps(10) infinite}
@keyframes x{to{transform:translateX(-1280px)}}@keyframes y{to{transform:translateY(-768px)}}
@media (prefers-reduced-motion:reduce){.s .r,.s img{animation:none}}
</style>${'<div class=s><div class=r><img src="/build/sprites/grid-png/grid.png" alt="" width=1280 height=768></div></div>'.repeat(12)}`);
  await writeFile(path.join(BUILD, 'css-sprite-strip-transform.html'), `<!doctype html><meta charset=utf-8><style>${common}
.s{width:128px;height:128px;overflow:hidden;contain:strict}
.s img{display:block;width:1280px;height:128px;max-width:none;animation:x .5s steps(10) infinite}
@keyframes x{to{transform:translateX(-1280px)}}
@media (prefers-reduced-motion:reduce){.s img{animation:none}}
</style>${'<div class=s><img src="/build/sprites/strip.png" alt="" width=1280 height=128></div>'.repeat(12)}`);
  await writeFile(path.join(BUILD, 'css-sprite-strip-bgpos.html'), `<!doctype html><meta charset=utf-8><style>${common}
.s{width:128px;height:128px;background:url(/build/sprites/strip.png) 0 0/1280px 128px;animation:x .5s steps(10) infinite}
@keyframes x{to{background-position-x:-1280px}}
@media (prefers-reduced-motion:reduce){.s{animation:none}}
</style>${'<div class=s></div>'.repeat(12)}`);
  const VARIANTS = [
    ['background-position, grid 1280×768', 'css-sprite.html'], ['transform, <img> grid 1280×768', 'css-sprite-transform.html'],
    ['background-position, strip 1280×128', 'css-sprite-strip-bgpos.html'], ['transform, <img> strip 1280×128', 'css-sprite-strip-transform.html'],
  ];
  const acc = Object.fromEntries(VARIANTS.map(([k]) => [k, []]));
  for (let r = 0; r < RUNS; r++) {
    for (const [k, file] of VARIANTS) {
      const page = await browser.newPage({ viewport: { width: 760, height: 330 } });
      const cdp = await page.context().newCDPSession(page);
      let layers = [];
      cdp.on('LayerTree.layerTreeDidChange', (e) => { if (e.layers) layers = e.layers; });
      await cdp.send('LayerTree.enable');
      await page.goto(`${srv.url}/build/${file}`);
      await page.waitForTimeout(800);
      await browser.startTracing(page, { categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline'] });
      await page.waitForTimeout(3000);
      const trace = JSON.parse((await browser.stopTracing()).toString());
      const ev = trace.traceEvents || trace;
      const main = ev.filter((e) => e.ph === 'X' && ['Paint', 'UpdateLayoutTree', 'Layout', 'PrePaint', 'Layerize'].includes(e.name));
      const count = (n) => main.filter((e) => e.name === n).length;
      const ms = main.reduce((s2, e) => s2 + (e.dur || 0), 0) / 1000;
      // memory side: layers that draw content, their area at 4 B/px (the root/document layer included in both)
      const drawn = layers.filter((l) => l.drawsContent);
      const areaBytes = drawn.reduce((s2, l) => s2 + l.width * l.height * 4, 0);
      const largest = drawn.reduce((m, l) => (l.width * l.height > m.width * m.height ? l : m), { width: 0, height: 0 });
      acc[k].push({ paintsPerSec: count('Paint') / 3, styleRecalcsPerSec: count('UpdateLayoutTree') / 3, mainThreadMsPerSec: ms / 3, layers: drawn.length, layerAreaMB: areaBytes / 1e6, largestLayerW: largest.width, largestLayerH: largest.height });
      await cdp.send('LayerTree.disable').catch(() => {});
      await page.close();
    }
  }
  out.cssSprite = Object.fromEntries(Object.entries(acc).map(([k, rs]) => [k, summarise(`csspaint ${k}`, rs)]));
}

if (want('spine')) {
  const dir = path.join(BUILD, 'spineboy-run');
  await mkdir(dir, { recursive: true });
  const cap = await onPage((p) => p.evaluate(() => window.lab.spineCapture({ fps: 30, scale: 0.4 })));
  if (cap.error) { out.spine = cap; console.error('spine capture', cap); } else {
    const frames = cap.frames.map((d, i) => ({ path: `run${String(i).padStart(2, '0')}.png`, contents: Buffer.from(d.split(',')[1], 'base64') }));
    const packed = await packAsync(frames, { textureName: 'atlas', width: 4096, height: 4096, padding: 2, allowRotation: false, allowTrim: true, detectIdentical: true, removeFileExtension: true, prependFolderName: false, exporter: 'JsonHash', packer: 'MaxRectsPacker' });
    const png = packed.find((f) => f.name.endsWith('.png')).buffer;
    const json = JSON.parse(packed.find((f) => f.name.endsWith('.json')).buffer.toString());
    json.animations = { run: Object.keys(json.frames).sort() };
    await writeFile(path.join(dir, 'atlas.png'), png);
    await writeFile(path.join(dir, 'atlas.json'), JSON.stringify(json));
    const meta = await sharp(png).metadata();
    const enc = {
      png: png.length,
      png8: (await sharp(png).png({ palette: true, compressionLevel: 9 }).toBuffer()).length,
      webp: (await sharp(png).webp({ quality: 85, alphaQuality: 90 }).toBuffer()).length,
      avif: (await sharp(png).avif({ quality: 60 }).toBuffer()).length,
    };
    const src = {};
    for (const f of ['spineboy-pro.skel', 'spineboy-pro.json', 'spineboy-pma.atlas', 'spineboy-pma.png']) src[f] = (await stat(path.join(CACHE, 'spine', f))).size;
    const skelGz = zlib.gzipSync(await readFile(path.join(CACHE, 'spine/spineboy-pro.skel'))).length;
    out.spine = {
      animations: cap.animations, runDuration: cap.duration, frameCount: frames.length, frameBox: '360x320 at skeleton scale 0.4',
      frameAtlas: { width: meta.width, height: meta.height, bytes: enc, decodedRGBA: meta.width * meta.height * 4, json: Buffer.byteLength(JSON.stringify(json)) },
      skeletal: { files: src, skelGzip: skelGz, total: src['spineboy-pro.skel'] + src['spineboy-pma.atlas'] + src['spineboy-pma.png'], note: 'the .skel holds every animation (' + cap.animations.length + '); the PNG holds every part' },
    };
    await sharp(png).flatten({ background: '#1b1f33' }).resize({ width: 900, withoutEnlargement: true }).jpeg({ quality: 70 }).toFile(path.join(BUILD, 'spineboy-run-frames.jpg')); // Esoteric's example art: no licence stated for it, so the sheet stays out of the repository
    out.spineDraw = await compare('spine', Object.fromEntries([50, 200].flatMap((n) => ['skeletal', 'frames'].map((mode) => [`${mode}-${n}`, call('spineDraw', { mode, n })]))));
    const lt = [];
    for (let r = 0; r < RUNS; r++) lt.push(await onPage((p) => p.evaluate(() => window.lab.spineLoad())));
    out.spine.loadParseMs = round(median(lt), 1);
  }
}

await browser.close();
await srv.close();

if (want('quality')) {
  // How much each lossy format changes the sprite art: PSNR against the lossless PNG, composited on mid-grey,
  // plus a 3x zoom of one frame's edge per format (shots/sprite-format-edges.jpg).
  const ref = await sharp(path.join(SB, 'atlas-png/atlas.png')).flatten({ background: '#808080' }).raw().toBuffer({ resolveWithObject: true });
  out.quality = {};
  const crops = [];
  const exts = { png: 'png', png8: 'png', webp: 'webp', avif: 'avif' };
  for (const fmt of FMTS) {
    const file = path.join(SB, `atlas-${fmt}/atlas.${exts[fmt]}`);
    const img = await sharp(file).flatten({ background: '#808080' }).raw().toBuffer();
    let se = 0;
    for (let i = 0; i < img.length; i++) { const d = img[i] - ref.data[i]; se += d * d; }
    const mse = se / img.length;
    out.quality[fmt] = { psnr: mse ? round(10 * Math.log10(255 * 255 / mse), 1) : null };
    crops.push({ input: await sharp(file).extract({ left: 0, top: 0, width: 120, height: 120 }).resize(360, 360, { kernel: 'nearest' }).flatten({ background: '#808080' }).toBuffer(), left: crops.length * 370, top: 0 });
  }
  await sharp({ create: { width: 370 * FMTS.length, height: 360, channels: 3, background: '#000' } }).composite(crops).jpeg({ quality: 80 }).toFile(path.join(LAB, 'shots/sprite-format-edges.jpg'));
  console.error('quality', JSON.stringify(out.quality));
}

if (want('runtimes')) {
  // Payload of each runtime as a minified ESM bundle of the import a project would write (+ its WASM).
  const entries = {
    'pixi.js (sprites, spritesheet, animated sprite)': `import { Application, Sprite, AnimatedSprite, Assets, Spritesheet } from 'pixi.js'; console.log(Application, Sprite, AnimatedSprite, Assets, Spritesheet);`,
    'pixi.js + spine-pixi-v8': `import { Application, Assets } from 'pixi.js'; import { Spine } from '@esotericsoftware/spine-pixi-v8'; console.log(Application, Assets, Spine);`,
    'pixi.js + pixi-dragonbones-runtime': `import { Application, Assets } from 'pixi.js'; import { PixiFactory } from 'pixi-dragonbones-runtime'; console.log(Application, Assets, PixiFactory);`,
    '@rive-app/canvas': `import { Rive } from '@rive-app/canvas'; console.log(Rive);`,
    '@rive-app/canvas-lite': `import { Rive } from '@rive-app/canvas-lite'; console.log(Rive);`,
    '@rive-app/webgl2': `import { Rive } from '@rive-app/webgl2'; console.log(Rive);`,
    'lottie-web (full)': `import lottie from 'lottie-web'; console.log(lottie);`,
    'lottie-web light (svg only)': `import lottie from 'lottie-web/build/player/lottie_light'; console.log(lottie);`,
    '@lottiefiles/dotlottie-web': `import { DotLottie } from '@lottiefiles/dotlottie-web'; console.log(DotLottie);`,
  };
  const wasm = {
    '@rive-app/canvas': 'node_modules/@rive-app/canvas/rive.wasm', '@rive-app/canvas-lite': 'node_modules/@rive-app/canvas-lite/rive.wasm',
    '@rive-app/webgl2': 'node_modules/@rive-app/webgl2/rive.wasm', '@lottiefiles/dotlottie-web': 'node_modules/@lottiefiles/dotlottie-web/dist/dotlottie-player.wasm',
  };
  const sizes = (buf) => ({ min: buf.length, gzip: zlib.gzipSync(buf, { level: 9 }).length, brotli: zlib.brotliCompressSync(buf).length });
  out.runtimes = {};
  for (const [name, code] of Object.entries(entries)) {
    try {
      const r = await build({ stdin: { contents: code, resolveDir: LAB, loader: 'js' }, bundle: true, minify: true, format: 'esm', write: false, logLevel: 'silent', platform: 'browser', loader: { '.wasm': 'empty' } });
      const js = sizes(Buffer.from(r.outputFiles[0].contents));
      const w = wasm[name] ? sizes(await readFile(path.join(LAB, wasm[name]))) : null;
      out.runtimes[name] = { js, wasm: w };
    } catch (e) { out.runtimes[name] = { error: e.message.slice(0, 200) }; }
  }
  for (const f of ['truck.riv', 'birb.riv']) out.runtimes[`sample ${f}`] = { bytes: (await stat(path.join(CACHE, 'rive', f))).size };
  const ver = async (p) => JSON.parse(await readFile(path.join(LAB, 'node_modules', p, 'package.json'), 'utf8')).version;
  out.runtimeVersions = Object.fromEntries(await Promise.all(['pixi.js', '@esotericsoftware/spine-pixi-v8', 'pixi-dragonbones-runtime', '@rive-app/canvas', 'lottie-web', '@lottiefiles/dotlottie-web', 'free-tex-packer-core'].map(async (p) => [p, await ver(p)])));
}

await mergeResults('sprites', out);
console.log('sprites: done');
