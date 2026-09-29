#!/usr/bin/env node
// "Polished 2.5D vs live 3D" on one product: a 36-frame pre-rendered turntable (drag-to-rotate image sequence)
// against a live three.js viewer of the optimised GLB. Payload, requests and decoded memory for each.
// Needs run-gltf.mjs first (it uses FlightHelmet's built variants: CC0, so the sheet can sit in the repository).
// Writes results.json → "turntable".
import { build } from 'esbuild';
import { readFile, stat, mkdir } from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import sharp from 'sharp';
import { serve, BUILD, LAB } from './lib/serve.mjs';
import { mergeResults, launchLab } from './lib/common.mjs';

const N = 36, W = 480, H = 360;
const MODEL = 'FlightHelmet';
const srv = await serve();
const { browser } = await launchLab();
async function turntable(w, h) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(`${srv.url}/build/gltf-viewer.html`);
  await page.waitForFunction(() => window.viewReady === true);
  const r = await page.evaluate((p) => window.view(p), { url: `/build/gltf/${MODEL}/original.glb`, W: w, H: h, frames: 1, azimuths: Array.from({ length: N }, (_, i) => (i * 360) / N) });
  await page.close();
  if (r.error) { console.error(r); process.exit(1); }
  return r.turntable.map((d) => Buffer.from(d.split(',')[1], 'base64'));
}
const frames = await turntable(W, H);
// the same turntable for a 2× display (960×720 device pixels): frames only — one sheet would decode to ~100 MB
const frames2x = await turntable(W * 2, H * 2);
await browser.close(); await srv.close();
const dir = path.join(BUILD, 'turntable'); await mkdir(dir, { recursive: true });

const enc = { webp: (s) => s.webp({ quality: 80 }), avif: (s) => s.avif({ quality: 55 }), jpeg: (s) => s.jpeg({ quality: 80, mozjpeg: true }) };
const out = { frames: N, frameSize: `${W}x${H}`, individual: {}, sheet: {} };
for (const [f, e] of Object.entries(enc)) {
  let total = 0;
  for (const b of frames) total += (await e(sharp(b)).toBuffer()).length;
  out.individual[f] = { bytes: total, requests: N };
}
out.individual2x = { frameSize: `${W * 2}x${H * 2}` };
for (const [f, e] of Object.entries(enc)) {
  let total = 0;
  for (const b of frames2x) total += (await e(sharp(b)).toBuffer()).length;
  out.individual2x[f] = { bytes: total, requests: N, decodedRGBA: N * W * 2 * H * 2 * 4 };
}
const cols = 6, rows = N / cols;
const grid = await sharp({ create: { width: cols * W, height: rows * H, channels: 3, background: '#e8e6e1' } })
  .composite(frames.map((b, i) => ({ input: b, left: (i % cols) * W, top: Math.floor(i / cols) * H }))).png().toBuffer();
for (const [f, e] of Object.entries(enc)) out.sheet[f] = { bytes: (await e(sharp(grid)).toBuffer()).length, requests: 1, dims: `${cols * W}x${rows * H}`, decodedRGBA: cols * W * rows * H * 4 };
await sharp(grid).resize(1440).jpeg({ quality: 70 }).toFile(path.join(LAB, 'shots/turntable-sheet.jpg'));

// the live alternative: a minimal three.js product viewer + meshopt decoder + the optimised GLB
const code = `import { WebGLRenderer, Scene, PerspectiveCamera, PMREMGenerator, NeutralToneMapping } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
console.log(WebGLRenderer, Scene, PerspectiveCamera, PMREMGenerator, NeutralToneMapping, GLTFLoader, MeshoptDecoder, OrbitControls, RoomEnvironment);`;
const b = await build({ stdin: { contents: code, resolveDir: LAB, loader: 'js' }, bundle: true, minify: true, format: 'esm', write: false, logLevel: 'silent' });
const js = Buffer.from(b.outputFiles[0].contents);
const glbs = {};
for (const v of ['optimize_1k_webp', 'optimize_defaults_webp_', 'tex1k_ktx2', 'tex1k_avif', 'original']) {
  try { const buf = await readFile(path.join(BUILD, `gltf/${MODEL}/${v}.glb`)); glbs[v] = { bytes: buf.length, gzip: zlib.gzipSync(buf).length }; } catch { /* not built */ }
}
out.live = { threeViewerJs: { min: js.length, gzip: zlib.gzipSync(js, { level: 9 }).length }, glb: glbs, note: `plus GPU texture memory: see gltf results for ${MODEL}` };
out.model = MODEL;
out.sprite360Js = 'a drag-to-rotate image sequence needs ~1 KB of script (pointer x → frame index); a scroll-scrubbed one can be CSS only (a scroll-driven animation of transform: translate with steps() on an image strip — not background-position, which repaints every frame: see sprites.cssSprite)';
await mergeResults('turntable', out);
console.log(JSON.stringify(out, null, 1));
