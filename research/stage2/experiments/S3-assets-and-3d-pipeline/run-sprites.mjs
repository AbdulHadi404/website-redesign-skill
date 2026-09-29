#!/usr/bin/env node
// Sprite pipeline lab: generate + pack sprites, then measure payload, requests, load under a phone network, decode,
// and per-frame cost in Canvas 2D and PixiJS (frames, parallax, tile map, 9-slice, skeletal vs frames), plus the
// payload of 2D animation runtimes. Writes results.json → "sprites". Needs `node fetch-assets.mjs` first (spineboy).
//
//   node run-sprites.mjs [--runs 5] [--skip-gen] [--only load,decode,canvas,pixi,parallax,tilemap,spine,nineslice,runtimes]
import { build } from 'esbuild';
import { mkdir, writeFile, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import sharp from 'sharp';
import { packAsync } from 'free-tex-packer-core';
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
if (want('pixi')) out.pixiDraw = await compare('pixi', Object.fromEntries(['atlas', 'files'].map((source) => [source, call('pixiDraw', { source, n: 300 })])));
if (want('parallax')) out.parallax = await compare('parallax', Object.fromEntries(['canvas', 'pixi'].map((engine) => [engine, call('parallax', { engine })])));
if (want('tilemap')) out.tilemap = await compare('tilemap', Object.fromEntries(['canvas-tiles', 'canvas-chunks', 'pixi-all', 'pixi-visible'].map((mode) => [mode, call('tilemap', { mode })])));
if (want('nineslice')) {
  out.nineslice = await onPage(async (p) => {
    const r = await p.evaluate(() => window.lab.nineslice());
    await p.setViewportSize({ width: 1280, height: 1440 });
    await p.screenshot({ path: path.join(LAB, 'shots/nineslice-pixi-vs-css.jpg'), type: 'jpeg', quality: 70, fullPage: true });
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
    await sharp(png).flatten({ background: '#1b1f33' }).resize({ width: 900, withoutEnlargement: true }).jpeg({ quality: 70 }).toFile(path.join(LAB, 'shots/spineboy-run-frames.jpg'));
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
