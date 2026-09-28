// Production builds of every variant with esbuild (minified), sizes split into runtime (node_modules)
// and app code (src/), plus the shared page template and assets.
import * as esbuild from 'esbuild';
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAssets } from './atlas.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DIST = path.join(root, 'dist');

// name → entry and flags. Every variant draws the same scene (src/shared/scene.js).
export const VARIANTS = {
  dom: { entry: 'src/dom/main.js', label: 'DOM + CSS' },
  svg: { entry: 'src/svg/main.js', label: 'Inline SVG' },
  canvas2d: { entry: 'src/canvas2d/main.js', label: 'Canvas 2D' },
  'canvas2d-worker': { entry: 'src/canvas2d-worker/main.js', worker: 'src/canvas2d-worker/worker.js', label: 'Canvas 2D in a Worker (OffscreenCanvas)' },
  pixi: { entry: 'src/pixi/main.js', label: 'PixiJS 8' },
  phaser: { entry: 'src/phaser/main.js', label: 'Phaser 4' },
  three: { entry: 'src/three/main.js', label: 'three.js (mesh per item)' },
  'three-instanced': { entry: 'src/three-instanced/main.js', label: 'three.js (one InstancedMesh)' },
  r3f: { entry: 'src/r3f/main.jsx', label: 'React Three Fiber' },
  // accessibility builds (same scene + keyboard/screen-reader operation)
  'dom-a11y': { entry: 'src/dom/main.js', a11y: true, label: 'DOM + keyboard layer (native elements)' },
  'svg-a11y': { entry: 'src/svg/main.js', a11y: true, label: 'SVG + keyboard layer (native elements)' },
  'pixi-a11y': { entry: 'src/pixi/main.js', a11y: true, label: 'PixiJS + parallel DOM keyboard layer' },
  'pixi-pixia11y': { entry: 'src/pixi/main.js', pixia11y: true, label: 'PixiJS + built-in AccessibilitySystem' },
};
export const MAIN = ['dom', 'svg', 'canvas2d', 'canvas2d-worker', 'pixi', 'phaser', 'three', 'three-instanced', 'r3f'];
export const A11Y = ['dom-a11y', 'svg-a11y', 'pixi-a11y', 'pixi-pixia11y'];

const template = (name, label) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="icon" href="data:,">
<title>S1 lab: ${label}</title>
<style>
:root{color-scheme:light}
body{margin:0;background:#faf6f1;color:#2b2118;font:16px/1.45 system-ui,sans-serif}
main{padding:16px 24px}
h1{font-size:20px;margin:0 0 4px}
.bar{display:flex;gap:24px;align-items:baseline;margin:0 0 12px}
#stage{position:relative;width:800px;height:600px;overflow:hidden;border-radius:12px;background:#f3e3cf}
.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
</style>
</head>
<body>
<main>
<h1>Decorate the cake</h1>
<p class="bar"><span>Decorations placed: <output id="count">0</output></span><span class="variant">${label}</span></p>
<div id="stage"></div>
<div id="live" class="sr-only" aria-live="polite"></div>
</main>
<script type="module" src="app.js"></script>
</body>
</html>
`;

const sizes = (buf) => ({
  min: buf.length,
  gzip: gzipSync(buf, { level: 9 }).length,
  br: brotliCompressSync(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length,
});

function common(v, name) {
  return {
    bundle: true, minify: true, platform: 'browser', target: 'es2022', legalComments: 'none',
    jsx: 'automatic', metafile: true, write: false, absWorkingDir: root, logLevel: 'error',
    define: {
      __A11Y__: String(!!v.a11y), __PIXIA11Y__: String(!!v.pixia11y), __VARIANT__: JSON.stringify(name),
      'process.env.NODE_ENV': '"production"',
    },
  };
}

// Bytes attributed per input (minified output), grouped into runtime packages and app code.
function attribute(meta) {
  const by = { app: 0, runtime: 0, packages: {} };
  for (const out of Object.values(meta.outputs)) {
    for (const [file, info] of Object.entries(out.inputs)) {
      const m = file.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/);
      if (m) { by.runtime += info.bytesInOutput; by.packages[m[1]] = (by.packages[m[1]] || 0) + info.bytesInOutput; } else by.app += info.bytesInOutput;
    }
  }
  return by;
}

export async function buildVariant(name) {
  const v = VARIANTS[name];
  const out = path.join(DIST, name);
  await mkdir(out, { recursive: true });
  // Code splitting on, as a Vite/Rollup production build would: an engine's dynamic import()s (PixiJS's
  // WebGPU and Canvas renderers, for instance) become chunks that load only when used.
  const r = await esbuild.build({ ...common(v, name), entryPoints: { app: v.entry }, format: 'esm', splitting: true, outdir: out, chunkNames: 'chunk-[hash]' });
  const files = {};
  for (const f of r.outputFiles) { await writeFile(f.path, f.contents); files[path.basename(f.path)] = sizes(f.contents); }
  const js = Buffer.concat(r.outputFiles.map((f) => Buffer.from(f.contents)));
  const attr = attribute(r.metafile);
  // App code alone: the same entry with every package external.
  const ra = await esbuild.build({ ...common(v, name), entryPoints: [v.entry], format: 'esm', packages: 'external', outfile: path.join(out, 'app-only.js') });
  const appOnly = sizes(ra.outputFiles[0].contents);
  let worker = null;
  if (v.worker) {
    const rw = await esbuild.build({ ...common(v, name), entryPoints: [v.worker], format: 'iife', outfile: path.join(out, 'worker.js') });
    await writeFile(path.join(out, 'worker.js'), rw.outputFiles[0].contents);
    worker = { ...sizes(rw.outputFiles[0].contents), attr: attribute(rw.metafile) };
  }
  await writeFile(path.join(out, 'index.html'), template(name, v.label));
  const total = sizes(js);
  return {
    name, label: v.label, total, files, worker,
    app: { min: attr.app, gzip: appOnly.gzip, note: 'min = bytes of src/ in the bundle; gzip = the app built with packages external' },
    runtime: { min: attr.runtime, gzipApprox: total.gzip - appOnly.gzip, packages: attr.packages },
  };
}

export async function buildAll(names = Object.keys(VARIANTS)) {
  await rm(DIST, { recursive: true, force: true });
  await buildAssets(path.join(DIST, 'assets'));
  const out = {};
  for (const n of names) out[n] = await buildVariant(n);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const res = await buildAll();
  for (const [k, v] of Object.entries(res)) console.log(k.padEnd(18), 'min', (v.total.min / 1024).toFixed(1), 'gz', (v.total.gzip / 1024).toFixed(1), 'app gz', (v.app.gzip / 1024).toFixed(1));
}
