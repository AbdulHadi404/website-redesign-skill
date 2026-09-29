#!/usr/bin/env node
// Which `gltf-transform optimize` default changed the chess scene? run-gltf.mjs found 'optimize 1k webp' 2.5 % of the
// object's pixels off (PSNR 26 dB) while plain meshopt, instance and 1K WebP each stayed near-identical. Here each
// optimize default is switched off in turn (textures left alone), rendered once at run-gltf's framing (deterministic),
// and diffed against the original. Needs run-gltf.mjs first (original.glb). Writes results.json → "isolate".
import { execFileSync } from 'node:child_process';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { serve, BUILD, LAB } from './lib/serve.mjs';
import { round } from './lib/stats.mjs';
import { mergeResults, launchLab, SKILL_SCRIPTS } from './lib/common.mjs';

const MODEL = 'ABeautifulGame';
const CLI = path.join(LAB, 'node_modules/.bin/gltf-transform');
const base = ['optimize', '--texture-compress', 'false'];
const VARIANTS = {
  'optimize (textures untouched)': [],
  'no simplify': ['--simplify', 'false'],
  'compress quantize (no meshopt)': ['--compress', 'quantize'],
  'compress draco': ['--compress', 'draco'],
  'compress false': ['--compress', 'false'],
  'no join/flatten': ['--join', 'false', '--flatten', 'false'],
  'no palette': ['--palette', 'false'],
  // hypothesis: quantization moves each mesh's scale into the node — for instanced glass that scale lands in the
  // instance attributes, which three.js's transmission shader ignores (it reads modelMatrix only), so the volume
  // renders ~1/scale times too thick. Without instancing the scale stays on the object and three.js applies it.
  'no instancing': ['--instance', 'false'],
  'no instancing, no simplify': ['--instance', 'false', '--simplify', 'false'],
  'no simplify, no join/flatten, instance-min 2': ['--simplify', 'false', '--join', 'false', '--flatten', 'false', '--instance-min', '2'],
};
const dir = path.join(BUILD, 'gltf', MODEL, 'isolate');
await mkdir(dir, { recursive: true });
const src = path.join(BUILD, 'gltf', MODEL, 'original.glb');
const out = { model: MODEL, variants: {} };
for (const [name, args] of Object.entries(VARIANTS)) {
  const file = path.join(dir, `${name.replace(/[^a-z0-9]+/gi, '_')}.glb`);
  execFileSync(CLI, [base[0], src, file, ...base.slice(1), ...args], { stdio: 'ignore' });
  const j = JSON.parse(execFileSync('node', [path.join(SKILL_SCRIPTS, 'model.mjs'), file, '--json', '--tier', 'scene']).toString());
  out.variants[name] = { command: `gltf-transform optimize in.glb out.glb ${[...base.slice(1), ...args].join(' ')}`, bytes: j.bytes, trianglesDrawn: j.trianglesDrawn, drawCalls: j.drawCalls, instances: j.instances, compression: j.compression, file };
}
const srv = await serve();
const { browser } = await launchLab();
async function render(url, needs) {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  try {
    await page.goto(`${srv.url}/build/gltf-viewer.html`);
    await page.waitForFunction(() => window.viewReady === true);
    return await page.evaluate((p) => window.view(p), { url, needs, frames: 1 });
  } finally { await page.close(); }
}
const ref = await render(`/build/gltf/${MODEL}/original.glb`, []);
const refPng = PNG.sync.read(Buffer.from(ref.png.split(',')[1], 'base64'));
for (const [name, v] of Object.entries(out.variants)) {
  const needs = v.compression.includes('EXT_meshopt_compression') ? ['meshopt'] : v.compression.includes('KHR_draco_mesh_compression') ? ['draco'] : [];
  const r = await render(`/build/${path.relative(BUILD, v.file)}`, needs);
  const img = PNG.sync.read(Buffer.from(r.png.split(',')[1], 'base64'));
  const n = pixelmatch(refPng.data, img.data, null, refPng.width, refPng.height, { threshold: 0.1, includeAA: false });
  let se = 0;
  for (let i = 0; i < img.data.length; i += 4) for (let c = 0; c < 3; c++) { const d = refPng.data[i + c] - img.data[i + c]; se += d * d; }
  const mse = se / (img.width * img.height * 3);
  Object.assign(v, { diffPctOfView: round((100 * n) / (img.width * img.height), 3), psnrView: mse ? round(10 * Math.log10((255 * 255) / mse), 1) : null });
  delete v.file;
  console.error('isolate', name, JSON.stringify(v));
}
await browser.close(); await srv.close();
await mergeResults('isolate', out);
console.log('isolate: done');
