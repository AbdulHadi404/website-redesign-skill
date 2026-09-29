#!/usr/bin/env node
// Blender (bpy from PyPI, headless) export lab: runs blender/pipeline.py, inspects every export with the skill's
// model.mjs, and renders plain vs baked-AO vs baked-lighting (unlit) in the three.js viewer for one contact sheet.
// Needs Python 3.11 with bpy: BPY_PYTHON=/path/to/python, or `node run-blender.mjs --install` to create
// /tmp/s2-S3/bpyenv (pip install bpy==4.5.14, ~1 GB). Writes results.json → "blender".
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';
import sharp from 'sharp';
import { serve, BUILD, LAB } from './lib/serve.mjs';
import { mergeResults, launchLab, SKILL_SCRIPTS } from './lib/common.mjs';

const PY = process.env.BPY_PYTHON || '/tmp/s2-S3/bpyenv/bin/python';
const OUT = path.join(BUILD, 'blender');
const hasBpy = () => { try { execFileSync(PY, ['-c', 'import bpy'], { stdio: 'ignore' }); return true; } catch { return false; } };
if (!hasBpy() && process.argv.includes('--install')) {
  execFileSync('python3.11', ['-m', 'venv', '/tmp/s2-S3/bpyenv'], { stdio: 'inherit' });
  execFileSync('/tmp/s2-S3/bpyenv/bin/pip', ['install', '--quiet', 'bpy==4.5.14'], { stdio: 'inherit' });
}
if (!hasBpy()) { console.error(`no bpy at ${PY}: set BPY_PYTHON or run with --install`); await mergeResults('blender', { skipped: 'bpy not available' }); process.exit(0); }

execFileSync(PY, [path.join(LAB, 'blender/pipeline.py'), OUT], { stdio: ['ignore', 'ignore', 'inherit'], maxBuffer: 64 << 20 });
const log = JSON.parse(await readFile(path.join(OUT, 'blender.json'), 'utf8'));
const inspect = {};
for (const name of Object.keys(log.exports)) {
  const j = JSON.parse(execFileSync('node', [path.join(SKILL_SCRIPTS, 'model.mjs'), path.join(OUT, `${name}.glb`), '--json']).toString());
  inspect[name] = { bytes: j.bytes, meshes: j.meshes, nodes: j.nodes, drawCalls: j.drawCalls, instances: j.instances, triangles: j.trianglesDrawn, extensions: j.extensionsUsed, images: j.images.map((i) => `${i.format} ${i.width}² → ${i.slots.join('/')}`), animations: j.animations, cameras: j.cameras, lights: j.lights };
}

// The exporter samples animation at every frame; gltf-transform's resample (part of `optimize`) drops the redundant keys.
{
  const CLI = path.join(LAB, 'node_modules/.bin/gltf-transform');
  const src = path.join(OUT, 'scene-camera-anim.glb'), dst = path.join(OUT, 'scene-camera-anim.resampled.glb');
  execFileSync(CLI, ['resample', src, dst], { stdio: 'ignore' });
  const j = JSON.parse(execFileSync('node', [path.join(SKILL_SCRIPTS, 'model.mjs'), dst, '--json']).toString());
  inspect['scene-camera-anim → gltf-transform resample'] = { bytes: j.bytes, animations: j.animations, animationBytesStored: j.animationBytesStored };
  inspect['scene-camera-anim'].animationBytesStored = JSON.parse(execFileSync('node', [path.join(SKILL_SCRIPTS, 'model.mjs'), src, '--json']).toString()).animationBytesStored;
  // Exporter's own Draco vs exporting plain and compressing afterwards with gltf-transform.
  for (const [name, args] of [['product-plain → gltf-transform meshopt', ['meshopt']], ['product-plain → gltf-transform draco', ['draco']], ['product-ao-png → gltf-transform optimize webp', ['optimize', '--compress', 'meshopt', '--texture-compress', 'webp', '--simplify', 'false']]]) {
    const [cmd, ...rest] = args;
    const input = path.join(OUT, `${name.split(' ')[0]}.glb`), outFile = path.join(OUT, `${name.replace(/[^a-z0-9]+/gi, '_')}.glb`);
    execFileSync(CLI, [cmd, input, outFile, ...rest], { stdio: 'ignore' });
    const j = JSON.parse(execFileSync('node', [path.join(SKILL_SCRIPTS, 'model.mjs'), outFile, '--json']).toString());
    inspect[name] = { bytes: j.bytes, triangles: j.trianglesDrawn, extensions: j.extensionsUsed, images: j.images.map((i) => `${i.format} ${i.width}²`) };
  }
}

// render plain / baked AO / baked lighting (unlit) from the same camera
if (!existsSync(path.join(BUILD, 'gltf-viewer.js'))) {
  await build({ entryPoints: [path.join(LAB, 'gltf/viewer.js')], bundle: true, format: 'esm', minify: true, outfile: path.join(BUILD, 'gltf-viewer.js'), logLevel: 'silent' });
  await writeFile(path.join(BUILD, 'gltf-viewer.html'), `<!doctype html><meta charset=utf-8><style>body{margin:0;background:#e8e6e1}canvas{display:block}</style><script type=module src="/build/gltf-viewer.js"></script>`);
}
const srv = await serve();
const { browser } = await launchLab();
const shots = [];
let frame = null;
for (const name of ['product-plain', 'product-ao-webp', 'product-baked-unlit']) {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  await page.goto(`${srv.url}/build/gltf-viewer.html`);
  await page.waitForFunction(() => window.viewReady === true);
  const r = await page.evaluate((p) => window.view(p), { url: `/build/blender/${name}.glb`, frame, frames: 1 });
  await page.close();
  if (r.error) { console.error(name, r.error); continue; }
  frame = frame || r.frame;
  shots.push({ name, png: Buffer.from(r.png.split(',')[1], 'base64') });
}
await browser.close(); await srv.close();
const TW = 400, TH = 300;
const comps = [];
for (const [i, s] of shots.entries()) {
  comps.push({ input: await sharp(s.png).resize(TW, TH).toBuffer(), left: i * TW, top: 22 });
  comps.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${TW}" height="22"><rect width="100%" height="100%" fill="#111"/><text x="6" y="16" font-family="sans-serif" font-size="13" fill="#fff">${s.name}</text></svg>`), left: i * TW, top: 0 });
}
await sharp({ create: { width: TW * shots.length, height: TH + 22, channels: 3, background: '#000' } }).composite(comps).jpeg({ quality: 72 }).toFile(path.join(LAB, 'shots/blender-plain-ao-baked.jpg'));
await mergeResults('blender', { ...log, inspect });
console.log('blender: done');
