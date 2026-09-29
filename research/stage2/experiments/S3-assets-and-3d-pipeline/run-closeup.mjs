#!/usr/bin/env node
// Visual cost of each glTF variant at hero size. run-gltf.mjs frames the whole model (it covers ~⅓ of an 800×600
// view, where 1K and 2K textures look alike); here the camera moves 2.5× closer, so the model fills and overflows
// the view, like a hero product shot, and every variant is compared with the original at that framing.
// Rendering is deterministic, so one render per variant. Needs run-gltf.mjs first (its built variants).
// Writes results.json → "closeup" and shots/closeup-<model>.jpg (not for DamagedHelmet: NC licence).
import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { MODELS, recipes } from './gltf/pipeline.mjs';
import { serve, BUILD, LAB } from './lib/serve.mjs';
import { round } from './lib/stats.mjs';
import { mergeResults, launchLab } from './lib/common.mjs';

const ZOOM = 2.5;
const argv = process.argv.slice(2);
const arg = (k) => { const i = argv.indexOf(`--${k}`); return i < 0 ? null : argv[i + 1]; };
const ONLY_M = arg('models')?.split(',');
const ONLY_V = arg('only-variants') ? ['original', ...arg('only-variants').split(',')] : null;
let prev = {};
try { prev = JSON.parse(await readFile(path.join(LAB, 'results.json'), 'utf8')).closeup?.models || {}; } catch { /* none */ }
if (!existsSync(path.join(BUILD, 'gltf-viewer.js'))) {
  await build({ entryPoints: [path.join(LAB, 'gltf/viewer.js')], bundle: true, format: 'esm', minify: true, outfile: path.join(BUILD, 'gltf-viewer.js'), logLevel: 'silent' });
  await writeFile(path.join(BUILD, 'gltf-viewer.html'), `<!doctype html><meta charset=utf-8><style>body{margin:0;background:#e8e6e1}canvas{display:block}</style><script type=module src="/build/gltf-viewer.js"></script>`);
}
const srv = await serve();
const { browser } = await launchLab();
async function view(url, params) {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  try {
    await page.goto(`${srv.url}/build/gltf-viewer.html`);
    await page.waitForFunction(() => window.viewReady === true);
    return await page.evaluate((p) => window.view(p), { url, ...params });
  } catch (e) { return { error: String(e.message).slice(0, 200) }; } finally { await page.close(); }
}
const toPNG = (d) => PNG.sync.read(Buffer.from(d.split(',')[1], 'base64'));
const BG = [0xe8, 0xe6, 0xe1];
// difference from a reference render: % of pixels (pixelmatch), PSNR over the whole view and over the object's pixels
function compare(ref, img) {
  const diff = new PNG({ width: ref.width, height: ref.height });
  const n = pixelmatch(ref.data, img.data, diff.data, ref.width, ref.height, { threshold: 0.1, includeAA: false });
  let se = 0, seObj = 0, cntObj = 0;
  for (let i = 0; i < ref.data.length; i += 4) {
    const obj = Math.abs(ref.data[i] - BG[0]) + Math.abs(ref.data[i + 1] - BG[1]) + Math.abs(ref.data[i + 2] - BG[2]) > 12 || Math.abs(img.data[i] - BG[0]) + Math.abs(img.data[i + 1] - BG[1]) + Math.abs(img.data[i + 2] - BG[2]) > 12;
    for (let c = 0; c < 3; c++) { const d = ref.data[i + c] - img.data[i + c]; se += d * d; if (obj) seObj += d * d; }
    if (obj) cntObj += 3;
  }
  const ps = (e, k) => (e ? round(10 * Math.log10((255 * 255) / (e / k)), 1) : null);
  return { diffPct: round((100 * n) / (ref.width * ref.height), 2), psnr: ps(se, ref.width * ref.height * 3), psnrObject: ps(seObj, Math.max(1, cntObj)) };
}
// The files model.mjs's own printed pipeline produced (run-modelcheck.mjs), next to the lab variants they resemble,
// at both framings: normal (the whole model in view, as run-gltf.mjs) and the hero close-up.
const PIPE = {
  DamagedHelmet: { 'model.mjs pipeline (1K WebP)': 'DamagedHelmet/DamagedHelmet.opt.glb' },
  FlightHelmet: { 'model.mjs pipeline (512 WebP)': 'FlightHelmet/FlightHelmet.opt.glb', 'model.mjs pipeline --ktx2 (1K KTX2)': 'FlightHelmet_ktx2/FlightHelmet.opt.glb' },
  ABeautifulGame: { 'model.mjs pipeline --tier scene (1K WebP, --instance false)': 'ABeautifulGame_tierscene/ABeautifulGame.opt.glb', 'model.mjs pipeline --tier scene --interactive': 'ABeautifulGame_tierscene_interactive/ABeautifulGame.opt.glb' },
};
const BOTH = ['tex1k-webp', 'tex1k-avif', 'tex1k-ktx2', 'optimize 1k webp'];
const out = { zoom: ZOOM, models: {}, pipelineOutputs: {} };
for (const name of Object.keys(MODELS)) {
  if (ONLY_M && !ONLY_M.includes(name)) continue;
  const m = { ...MODELS[name], name };
  const anim = m.animated ? { clip: 2, time: 0.4 } : null;
  const file = (v) => path.join(BUILD, 'gltf', name, `${v.replace(/[^a-z0-9]+/gi, '_')}.glb`);
  const rel = (v) => `/build/gltf/${name}/${v.replace(/[^a-z0-9]+/gi, '_')}.glb`;
  if (!existsSync(file('original'))) continue;
  const first = await view(rel('original'), { anim, frames: 1 });
  if (first.error) { console.error(name, first.error); continue; }
  const frame = { center: first.frame.center, size: first.frame.size.map((s) => s / ZOOM) };
  const base = await view(rel('original'), { anim, frames: 1, frame });
  const ref = toPNG(base.png);
  out.models[name] = {};
  const tiles = [];
  for (const v of Object.keys(recipes(m))) {
    if (!existsSync(file(v)) || (ONLY_V && !ONLY_V.includes(v))) continue;
    const needs = [];
    const head = await readFile(file(v));
    const json = head.toString('utf8', 20, 20 + head.readUInt32LE(12));
    if (json.includes('KHR_draco_mesh_compression')) needs.push('draco');
    if (json.includes('EXT_meshopt_compression')) needs.push('meshopt');
    if (json.includes('KHR_texture_basisu')) needs.push('ktx2');
    const r = v === 'original' ? base : await view(rel(v), { needs, anim, frames: 1, frame });
    if (r.error) { out.models[name][v] = { error: r.error }; continue; }
    const img = toPNG(r.png);
    const diff = new PNG({ width: ref.width, height: ref.height });
    const n = pixelmatch(ref.data, img.data, diff.data, ref.width, ref.height, { threshold: 0.1, includeAA: false });
    let se = 0;
    for (let i = 0; i < ref.data.length; i += 4) for (let c = 0; c < 3; c++) { const d = ref.data[i + c] - img.data[i + c]; se += d * d; }
    const mse = se / (ref.width * ref.height * 3);
    out.models[name][v] = { diffPct: round((100 * n) / (ref.width * ref.height), 2), psnr: mse ? round(10 * Math.log10((255 * 255) / mse), 1) : null };
    tiles.push({ v, img: Buffer.from(r.png.split(',')[1], 'base64') });
    console.error(`closeup ${name} ${v}`, JSON.stringify(out.models[name][v]));
  }
  // pipeline outputs and the closest lab variants, at both framings
  const po = {};
  const refNormal = toPNG(first.png);
  const entries = [...BOTH.filter((v) => existsSync(file(v))).map((v) => [v, rel(v), file(v)]), ...Object.entries(PIPE[name] || {}).map(([k, f]) => [k, `/build/modelcheck/${f}`, path.join(BUILD, 'modelcheck', f)]).filter(([, , f]) => existsSync(f))];
  for (const [label, url, f] of entries) {
    const head = await readFile(f);
    const json = head.toString('utf8', 20, 20 + head.readUInt32LE(12));
    const needs = [json.includes('KHR_draco_mesh_compression') && 'draco', json.includes('EXT_meshopt_compression') && 'meshopt', json.includes('KHR_texture_basisu') && 'ktx2'].filter(Boolean);
    const rn = await view(url, { needs, anim, frames: 1, frame: first.frame });
    const rc = await view(url, { needs, anim, frames: 1, frame });
    po[label] = { bytes: head.length, normal: rn.error ? { error: rn.error } : compare(refNormal, toPNG(rn.png)), closeup: rc.error ? { error: rc.error } : compare(ref, toPNG(rc.png)) };
    console.error(`pipeline-output ${name} ${label}`, JSON.stringify(po[label]));
  }
  if (Object.keys(po).length) out.pipelineOutputs[name] = po;
  if (m.shots === false || ONLY_V) continue;
  // detail sheet: centre crop 300×300 of selected variants at 1:1
  const pick = ['original', 'tex1k-webp', 'tex1k-avif', 'tex1k-ktx2', 'tex1k-ktx2-etc1s', 'optimize 1k webp', 'simplify50+meshopt'].filter((v) => tiles.find((t) => t.v === v));
  const comps = [];
  for (const [i, v] of pick.entries()) {
    const t = tiles.find((x) => x.v === v);
    comps.push({ input: await sharp(t.img).extract({ left: 250, top: 150, width: 300, height: 300 }).toBuffer(), left: i * 300, top: 22 });
    comps.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="22"><rect width="100%" height="100%" fill="#111"/><text x="6" y="16" font-family="sans-serif" font-size="13" fill="#fff">${v} · PSNR ${out.models[name][v].psnr ?? '∞'}</text></svg>`), left: i * 300, top: 0 });
  }
  await sharp({ create: { width: 300 * pick.length, height: 322, channels: 3, background: '#000' } }).composite(comps).jpeg({ quality: 78 }).toFile(path.join(LAB, `shots/closeup-${name}.jpg`));
}
await browser.close();
await srv.close();
// a --models / --only-variants subset keeps earlier results for everything else
for (const [name, vs] of Object.entries(prev)) out.models[name] = { ...vs, ...(out.models[name] || {}) };
// (pipelineOutputs are recomputed whole for the models measured)
await mergeResults('closeup', out);
console.log('closeup: done');
