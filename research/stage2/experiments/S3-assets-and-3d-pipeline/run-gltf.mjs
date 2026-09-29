#!/usr/bin/env node
// glTF pipeline lab: build variants of four Khronos sample models with the gltf-transform CLI, inspect each with the
// skill's model.mjs, load each in three.js in headless Chromium (Draco / Meshopt / KTX2 decoders), and measure
// size, decode, first frame, steady frame, draw calls, triangles, texture memory and the pixel difference from the
// original at a fixed camera. Writes results.json → "gltf" and contact sheets to shots/.
//
//   node run-gltf.mjs [--runs 5] [--models DamagedHelmet,Fox] [--skip-build] [--only-variants a,b] [--slow-ktx]
//   node run-gltf.mjs --build-only      # build (and inspect) the variants, no browser
//   node run-gltf.mjs --refresh-model   # re-run only the skill's model.mjs on the built files and redo the comparison
//
// Timing protocol: every variant of a model is measured in the same session, runs interleaved and the order rotated
// each run (A B C, B C A, C A B, …), so load drift on the shared machine hits all variants alike. --only-variants and
// --skip-build limit the BUILD step only; the measurement always covers every built variant of each model measured,
// and results.json keeps the per-run samples (and min/max) next to each median.
import { build } from 'esbuild';
import { mkdir, writeFile, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import zlib from 'node:zlib';
import sharp from 'sharp';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { MODELS, recipes, buildModel, cmdString } from './gltf/pipeline.mjs';
import { serve, BUILD, LAB } from './lib/serve.mjs';
import { median, round } from './lib/stats.mjs';
import { mergeResults, launchLab, SKILL_SCRIPTS } from './lib/common.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const RUNS = Number(arg('runs', 5));
const MODEL_LIST = arg('models') ? arg('models').split(',') : Object.keys(MODELS);
const ONLY_V = arg('only-variants') ? arg('only-variants').split(',') : null; // build only these; measure all
const out = { runs: RUNS, models: {} };
let prev = {};
try { prev = JSON.parse(await readFile(path.join(LAB, 'results.json'), 'utf8')).gltf?.models || {}; } catch { /* none */ }

// model.mjs's static view of a built file (kept next to three.js's measured numbers, to check the script).
const modelFields = (file, name) => {
  const j = JSON.parse(execFileSync('node', [path.join(SKILL_SCRIPTS, 'model.mjs'), file, '--json', '--tier', name === 'ABeautifulGame' ? 'scene' : 'mobile'], { maxBuffer: 32 << 20 }).toString());
  return { trianglesDrawn: j.trianglesDrawn, drawCalls: j.drawCalls, textureGpuBytes: j.textureGpuBytes, geometryBytesStoredShare: j.bytes ? Math.round((100 * j.geometryBytesStored) / j.bytes) : null, geometryGpuBytes: j.geometryGpuBytes, maxTexture: j.maxTexture, compression: j.compression, textureBytes: j.textureBytes, geometryBytesStored: j.geometryBytesStored, animationBytesStored: j.animationBytesStored, materialsUsed: j.materialsUsed, instances: j.instances, flags: j.flags.map((f) => `${f.level}: ${f.what}`), ok: j.ok, imageFormats: [...new Set(j.images.map((i) => i.format + (i.codec ? '/' + i.codec : '')))] };
};
const scriptCheck = (models) => {
  const chk = {};
  for (const [name, m] of Object.entries(models)) for (const [v, r] of Object.entries(m.variants || {})) {
    if (!r.model || r.drawCalls == null) continue;
    const ratio = (a, b) => (b ? round(a / b, 2) : null);
    chk[`${name} / ${v}`] = {
      triangles: [r.model.trianglesDrawn, r.triangles, ratio(r.model.trianglesDrawn, r.triangles)],
      drawCalls: [r.model.drawCalls, r.drawCalls, ratio(r.model.drawCalls, r.drawCalls)],
      // measured = the texStorage2D/texImage2D allocations three.js made for the materials' textures (viewer.js)
      textureGpuBytes: [r.model.textureGpuBytes, r.textureAllocBytes, ratio(r.model.textureGpuBytes, r.textureAllocBytes)],
    };
  }
  return chk;
};
// --refresh-model: re-run only model.mjs on the built files (after a change to the script) and redo the comparison.
if (argv.includes('--refresh-model')) {
  for (const [name, m] of Object.entries(prev)) for (const [v, r] of Object.entries(m.variants || {})) {
    const file = path.join(BUILD, 'gltf', name, `${v.replace(/[^a-z0-9]+/gi, '_')}.glb`);
    if (existsSync(file)) r.model = modelFields(file, name);
  }
  await mergeResults('gltf', { models: prev, modelScriptCheck: scriptCheck(prev), modelRefreshedAt: new Date().toISOString() });
  console.log('gltf: model.mjs refreshed');
  process.exit(0);
}

// 1. build
const built = {};
for (const name of MODEL_LIST) {
  const slug = (v) => path.join(BUILD, 'gltf', name, `${v.replace(/[^a-z0-9]+/gi, '_')}.glb`);
  const m = { ...MODELS[name], name };
  const fresh = argv.includes('--skip-build') ? { variants: {} } : await buildModel(name, { only: ONLY_V });
  // variants not rebuilt in this call are measured from their earlier build (the build is deterministic)
  built[name] = { model: m, variants: Object.fromEntries(await Promise.all(Object.entries(recipes(m)).map(async ([v, steps]) => [v, fresh.variants[v] || (existsSync(slug(v)) ? { file: slug(v), bytes: (await stat(slug(v))).size, buildMs: prev[name]?.variants?.[v]?.buildMs, commands: cmdString(steps) } : { error: 'not built' })]))) };
}

// 2. compressibility + model.mjs on every variant
const modelScript = path.join(SKILL_SCRIPTS, 'model.mjs');
for (const [name, b] of Object.entries(built)) {
  for (const [v, r] of Object.entries(b.variants)) {
    if (r.error) continue;
    const buf = await readFile(r.file);
    r.gzip = zlib.gzipSync(buf, { level: 9 }).length;
    r.brotli = zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 9 } }).length;
    r.model = modelFields(r.file, name);
    const c = r.model.compression;
    r.needs = [c.includes('KHR_draco_mesh_compression') && 'draco', c.includes('EXT_meshopt_compression') && 'meshopt', c.includes('KHR_texture_basisu') && 'ktx2'].filter(Boolean);
  }
}

if (argv.includes('--build-only')) { console.log('gltf: built'); process.exit(0); }

// 3. viewer bundle
await build({ entryPoints: [path.join(LAB, 'gltf/viewer.js')], bundle: true, format: 'esm', minify: true, outfile: path.join(BUILD, 'gltf-viewer.js'), logLevel: 'silent' });
await writeFile(path.join(BUILD, 'gltf-viewer.html'), `<!doctype html><meta charset=utf-8><style>body{margin:0;background:#e8e6e1}canvas{display:block}</style><script type=module src="/build/gltf-viewer.js"></script>`);
const srv = await serve();
const { browser, version } = await launchLab();
out.env = { protocol: 'per model: every built variant measured in one session, runs interleaved with the order rotated each run; samples kept', chromium: version, gpu: 'SwiftShader (CPU): frame times are pessimistic and only comparable among themselves', three: JSON.parse(await readFile(path.join(LAB, 'node_modules/three/package.json'), 'utf8')).version, gltfTransform: '4.5.1', ktxSoftware: '4.4.2' };

async function view(url, params) {
  const ctx = await browser.newContext({ viewport: { width: 800, height: 600 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  try {
    await page.goto(`${srv.url}/build/gltf-viewer.html`);
    await page.waitForFunction(() => window.viewReady === true);
    return await page.evaluate((p) => window.view(p), { url, ...params });
  } catch (e) { return { error: String(e.message).slice(0, 300), errs: errs.slice(0, 3) }; } finally { await ctx.close(); }
}
const toPNG = (dataUrl) => PNG.sync.read(Buffer.from(dataUrl.split(',')[1], 'base64'));

for (const [name, b] of Object.entries(built)) {
  const anim = b.model.animated ? { clip: 2, time: 0.4 } : null;
  const frames = name === 'ABeautifulGame' ? 2 : 3; // steady frames (SwiftShader: pessimistic, not used for conclusions)
  const vs = Object.entries(b.variants).filter(([, r]) => !r.error);
  const rel = (f) => `/build/${path.relative(BUILD, f)}`;
  const first = await view(rel(b.variants.original.file), { needs: [], anim, frames: 1 });
  if (first.error) { console.error(name, 'original failed', first); continue; }
  const frame = first.frame;
  out.env.webgl = { WEBGL_multisampled_render_to_texture: first.msrtt, EXT_texture_compression_bptc: first.bptc };
  const acc = Object.fromEntries(vs.map(([v]) => [v, []]));
  const pngs = {};
  for (let r = 0; r < RUNS; r++) {
    const order = vs.map((_, i) => vs[(i + r) % vs.length]); // rotate the order each run
    for (const [v, rr] of order) {
      const res = await view(rel(rr.file), { needs: rr.needs, frame, anim, frames, repeat: v.startsWith('geo-only') });
      if (res.error) { console.error(name, v, res.error, res.errs); acc[v].push(res); continue; }
      if (r === 0) pngs[v] = res.png;
      delete res.png;
      acc[v].push(res);
    }
  }
  // pixel diff against the original, over the pixels the object covers
  const base = toPNG(pngs.original);
  const bg = [0xe8, 0xe6, 0xe1];
  const mask = new Uint8Array(base.width * base.height);
  for (let i = 0; i < mask.length; i++) mask[i] = Math.abs(base.data[i * 4] - bg[0]) + Math.abs(base.data[i * 4 + 1] - bg[1]) + Math.abs(base.data[i * 4 + 2] - bg[2]) > 12 ? 1 : 0;
  const covered = mask.reduce((s, x) => s + x, 0);
  const diffs = {};
  const tiles = [];
  for (const [v, png] of Object.entries(pngs)) {
    const img = toPNG(png);
    const diff = new PNG({ width: base.width, height: base.height });
    const n = pixelmatch(base.data, img.data, diff.data, base.width, base.height, { threshold: 0.1, includeAA: false });
    let se = 0, cnt = 0;
    for (let i = 0; i < mask.length; i++) {
      const m = mask[i] || (Math.abs(img.data[i * 4] - bg[0]) + Math.abs(img.data[i * 4 + 1] - bg[1]) + Math.abs(img.data[i * 4 + 2] - bg[2]) > 12);
      if (!m) continue;
      for (let c = 0; c < 3; c++) { const d = base.data[i * 4 + c] - img.data[i * 4 + c]; se += d * d; }
      cnt += 3;
    }
    const mse = cnt ? se / cnt : 0;
    diffs[v] = { diffPixels: n, diffPctOfObject: round((100 * n) / Math.max(1, covered), 2), psnr: mse ? round(10 * Math.log10((255 * 255) / mse), 1) : Infinity };
    await writeFile(path.join(BUILD, 'gltf', name, `${v.replace(/[^a-z0-9]+/gi, '_')}.png`), PNG.sync.write(img));
    tiles.push({ v, img: Buffer.from(png.split(',')[1], 'base64'), diff: PNG.sync.write(diff) });
  }
  // contact sheet: selected variants, render on top, pixelmatch diff below
  const pick = ['original', 'meshopt', 'draco', 'simplify50+meshopt', 'tex1k-webp', 'tex1k-ktx2', 'optimize 1k webp', 'instance'].filter((v) => tiles.find((t) => t.v === v));
  const TW = 320, TH = 240;
  const comps = [];
  for (const [i, v] of pick.entries()) {
    const t = tiles.find((x) => x.v === v);
    const label = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${TW}" height="22"><rect width="100%" height="100%" fill="#111"/><text x="6" y="16" font-family="sans-serif" font-size="13" fill="#fff">${v} · ${(b.variants[v].bytes / 1e6).toFixed(2)} MB · Δ ${diffs[v].diffPctOfObject}%</text></svg>`);
    comps.push({ input: await sharp(t.img).resize(TW, TH).toBuffer(), left: i * TW, top: 22 }, { input: label, left: i * TW, top: 0 }, { input: await sharp(t.diff).resize(TW, TH).toBuffer(), left: i * TW, top: 22 + TH });
  }
  // Renders of a model whose licence includes NC (DamagedHelmet) stay out of the repository: its sheet goes to BUILD.
  const sheetDir = b.model.shots === false ? path.join(BUILD, 'gltf') : path.join(LAB, 'shots');
  await sharp({ create: { width: pick.length * TW, height: 22 + TH * 2, channels: 3, background: '#000' } }).composite(comps).jpeg({ quality: 68 }).toFile(path.join(sheetDir, `gltf-${name}.jpg`));

  out.models[name] = {
    kind: b.model.kind, licence: b.model.licence, frame,
    variants: Object.fromEntries(vs.map(([v, rr]) => {
      const ok = acc[v].filter((x) => !x.error);
      const T = ['initMs', 'loadMs', 'loadMs2', 'firstFrameMs', 'frameMs'].filter((k) => ok.some((x) => x[k] != null));
      const med = (k) => round(median(ok.map((x) => x[k])), 1);
      const samples = Object.fromEntries(T.map((k) => [k, ok.map((x) => round(x[k], 1))]));
      const range = Object.fromEntries(T.map((k) => [k, [round(Math.min(...samples[k]), 1), round(Math.max(...samples[k]), 1)]]));
      const one = ok[0] || {};
      return [v, {
        commands: rr.commands, bytes: rr.bytes, gzip: rr.gzip, brotli: rr.brotli, buildMs: rr.buildMs, needs: rr.needs,
        ...Object.fromEntries(T.map((k) => [k, med(k)])), n: ok.length, range, samples,
        drawCalls: one.info?.calls, triangles: one.info?.triangles, programs: one.info?.programs, textureCount: one.textureCount, compressedTextures: one.compressedTextures, maxTexture: one.maxTexture,
        textureAllocBytes: one.textureAllocBytes, textureAllocFormats: one.textureAllocFormats, glTextures: one.glTextures, glTexturesNotAllocated: one.glTexturesNotAllocated,
        textureGpuBytesFormula: one.textureBytes, geometryGpuBytes: one.geometryBytes, instances: one.instances, ...diffs[v], model: rr.model,
        errors: acc[v].filter((x) => x.error).map((x) => x.error).slice(0, 1),
      }];
    })),
  };
  console.error(`${name}: measured ${vs.length} variants`);
}
await browser.close();
await srv.close();

// decoder payloads a page pays for each compression choice
const libs = path.join(LAB, 'node_modules/three/examples/jsm/libs');
const sz = async (f) => { const b = await readFile(path.join(libs, f)); return { bytes: b.length, gzip: zlib.gzipSync(b, { level: 9 }).length, brotli: zlib.brotliCompressSync(b).length }; };
out.decoders = {
  'draco (draco_wasm_wrapper.js + draco_decoder.wasm)': [await sz('draco/gltf/draco_wasm_wrapper.js'), await sz('draco/gltf/draco_decoder.wasm')],
  'draco JS fallback (draco_decoder.js)': [await sz('draco/gltf/draco_decoder.js')],
  'meshopt (meshopt_decoder.module.js)': [await sz('meshopt_decoder.module.js')],
  'basis (basis_transcoder.js + .wasm)': [await sz('basis/basis_transcoder.js'), await sz('basis/basis_transcoder.wasm')],
};
// A --models subset keeps the other models' earlier results (each model's table comes from one session).
out.models = { ...prev, ...out.models };
// ...but a variant whose recipe no longer exists (e.g. a dropped slow encode) is removed.
for (const [name, m] of Object.entries(out.models)) {
  const live = recipes({ ...MODELS[name], name });
  for (const v of Object.keys(m.variants)) if (!live[v]) delete m.variants[v];
}

// How close the skill's model.mjs (static estimate from the file) comes to what three.js actually allocated and drew.
out.modelScriptCheck = scriptCheck(out.models);
await mergeResults('gltf', out);
console.log('gltf: done');
