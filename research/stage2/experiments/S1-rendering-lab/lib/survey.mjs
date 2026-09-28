// Engine survey: a hello world per engine (one image or shape on an 800×600 canvas, made interactive
// where the engine has input), built the way the lab builds its variants (esbuild, minified, ESM,
// code splitting), then sized (min / gzip / brotli; initial chunks vs everything) and booted in the
// browser at 4× CPU throttle to its first rendered frame (median of runs). Package facts come from
// the installed package.json and the npm registry. Published sizes for engines that are not npm
// packages (Godot, Unity, Defold, …) are in survey/engines-published.json, gathered by search.
import * as esbuild from 'esbuild';
import { mkdir, writeFile, readFile, rm, cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launchBrowser, median } from './measure.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SDIR = path.join(root, 'survey');
const OUT = path.join(SDIR, 'dist');

// name → entry, the packages it measures, React interop facts. `react: true` entries include React +
// ReactDOM (subtract the react-baseline row for the binding's own cost).
export const ENTRIES = {
  'react-baseline': { entry: 'react-baseline.jsx', pkgs: ['react', 'react-dom'], kind: 'baseline', react: true },
  pixi: { entry: 'pixi.js', pkgs: ['pixi.js'], kind: '2D WebGL/WebGPU renderer', reactBinding: '@pixi/react' },
  'pixi-react': { entry: 'pixi-react.jsx', pkgs: ['@pixi/react', 'pixi.js'], kind: 'React binding', react: true },
  phaser: { entry: 'phaser.js', pkgs: ['phaser'], kind: '2D game framework', reactBinding: 'none official (the official React template bridges with an EventBus)' },
  three: { entry: 'three.js', pkgs: ['three'], kind: '3D WebGL/WebGPU library', reactBinding: '@react-three/fiber' },
  r3f: { entry: 'r3f.jsx', pkgs: ['@react-three/fiber', 'three'], kind: 'React renderer for three', react: true },
  'r3f-createroot': { entry: 'r3f-createroot.jsx', pkgs: ['@react-three/fiber', 'three'], kind: 'R3F createRoot + extend (no <Canvas>)', react: true },
  babylon: { entry: 'babylon.js', pkgs: ['@babylonjs/core'], kind: '3D engine', reactBinding: 'react-babylonjs (community)' },
  playcanvas: { entry: 'playcanvas.js', pkgs: ['playcanvas'], kind: '3D engine (+ hosted editor)', reactBinding: '@playcanvas/react' },
  'playcanvas-react': { entry: 'playcanvas-react.jsx', pkgs: ['@playcanvas/react', 'playcanvas'], kind: 'React binding', react: true },
  ogl: { entry: 'ogl.js', pkgs: ['ogl'], kind: 'minimal WebGL', reactBinding: 'none (react-ogl, community)' },
  konva: { entry: 'konva.js', pkgs: ['konva'], kind: '2D canvas scene graph (core + Image)', reactBinding: 'react-konva' },
  'konva-full': { entry: 'konva-full.js', pkgs: ['konva'], kind: '2D canvas scene graph (full import)' },
  'react-konva': { entry: 'react-konva.jsx', pkgs: ['react-konva', 'konva'], kind: 'React binding', react: true },
  fabric: { entry: 'fabric.js', pkgs: ['fabric'], kind: '2D canvas object editor', reactBinding: 'none (imperative in an effect)' },
  two: { entry: 'two.js', pkgs: ['two.js'], kind: '2D drawing (SVG/Canvas/WebGL back ends)', reactBinding: 'none (react-two.js, community)' },
  p5: { entry: 'p5.js', pkgs: ['p5'], kind: 'creative-coding sketchbook', reactBinding: 'none (instance mode in an effect)' },
  excalibur: { entry: 'excalibur.js', pkgs: ['excalibur'], kind: '2D game engine (TypeScript)', reactBinding: 'none' },
  kaplay: { entry: 'kaplay.js', pkgs: ['kaplay'], kind: '2D game library (Kaboom successor)', reactBinding: 'none' },
  kaboom: { entry: 'kaboom.js', pkgs: ['kaboom'], kind: '2D game library (superseded by KAPLAY)', reactBinding: 'none' },
  litecanvas: { entry: 'litecanvas.js', pkgs: ['litecanvas'], kind: 'tiny 2D canvas game loop', reactBinding: 'none' },
  littlejs: { entry: 'littlejs.js', pkgs: ['littlejsengine'], kind: 'tiny 2D game engine', reactBinding: 'none' },
  melonjs: { entry: 'melonjs.js', pkgs: ['melonjs'], kind: '2D game engine', reactBinding: 'none' },
  matter: { entry: 'matter.js', pkgs: ['matter-js'], kind: '2D physics (add-on)', reactBinding: '—' },
  rapier2d: { entry: 'rapier2d.js', pkgs: ['@dimforge/rapier2d-compat'], kind: '2D physics, WASM inlined as base64 (add-on)', reactBinding: '@react-three/rapier (3D)' },
  rive: { entry: 'rive.js', pkgs: ['@rive-app/canvas'], kind: 'vector animation runtime (JS only; WASM separate)', reactBinding: '@rive-app/react-canvas' },
};

const sizes = (buf) => ({
  min: buf.length,
  gzip: gzipSync(buf, { level: 9 }).length,
  br: brotliCompressSync(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length,
});

const page = (name) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${name}</title><link rel="icon" href="data:,">
<style>body{margin:0;background:#faf6f1}#host{width:800px;height:600px}</style></head>
<body><div id="host"></div><script type="module" src="app.js"></script></body></html>`;

async function buildEntry(name, e) {
  const out = path.join(OUT, name);
  await mkdir(out, { recursive: true });
  const r = await esbuild.build({
    entryPoints: { app: path.join(SDIR, 'entries', e.entry) }, bundle: true, minify: true, format: 'esm', splitting: true,
    platform: 'browser', target: 'es2022', legalComments: 'none', jsx: 'automatic', metafile: true, write: false,
    outdir: out, chunkNames: 'chunk-[hash]', logLevel: 'silent', absWorkingDir: root,
    define: { 'process.env.NODE_ENV': '"production"' },
    loader: { '.wasm': 'file' }, external: ['node:worker_threads'],
  });
  const byFile = {};
  for (const f of r.outputFiles) { await writeFile(f.path, f.contents); byFile[path.relative(out, f.path)] = f.contents; }
  await writeFile(path.join(out, 'index.html'), page(name));
  // Initial = the entry chunk plus the chunks it imports statically; lazy = dynamic import() chunks.
  const outputs = r.metafile.outputs;
  const key = (p) => path.relative(out, path.join(root, p));
  const entryKey = Object.keys(outputs).find((k) => outputs[k].entryPoint);
  const initial = new Set();
  const walk = (k) => { if (initial.has(k)) return; initial.add(k); for (const im of outputs[k].imports || []) if (im.kind === 'import-statement' && outputs[im.path]) walk(im.path); };
  walk(entryKey);
  const js = (keys) => Buffer.concat(keys.filter((k) => k.endsWith('.js')).map((k) => Buffer.from(byFile[key(k)])));
  const all = Object.keys(outputs);
  const wasm = all.filter((k) => k.endsWith('.wasm')).map((k) => ({ file: key(k), ...sizes(Buffer.from(byFile[key(k)])) }));
  const files = Object.fromEntries(Object.entries(byFile).map(([f, b]) => [path.basename(f), gzipSync(Buffer.from(b), { level: 9 }).length]));
  return { initial: sizes(js([...initial])), all: sizes(js(all)), chunks: all.filter((k) => k.endsWith('.js')).length, wasm, files };
}

function registry(pkg) {
  try {
    const j = JSON.parse(execFileSync('curl', ['-sS', '-m', '20', `https://registry.npmjs.org/${pkg.replace('/', '%2F')}`], { maxBuffer: 256 * 1024 * 1024 }).toString());
    const latest = j['dist-tags']?.latest;
    return { latest, published: j.time?.[latest]?.slice(0, 10), modified: j.time?.modified?.slice(0, 10), license: j.versions?.[latest]?.license ?? j.license, deprecated: j.versions?.[latest]?.deprecated || null };
  } catch (err) { return { error: String(err.message).slice(0, 120) }; }
}

async function localPkg(pkg) {
  const dir = path.join(root, 'node_modules', pkg);
  const pj = JSON.parse(await readFile(path.join(dir, 'package.json'), 'utf8'));
  const lic = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'license', 'license.md', 'LICENCE', 'LICENSE-MIT'].find((f) => existsSync(path.join(dir, f)));
  let licenseHead = null;
  if (lic) licenseHead = (await readFile(path.join(dir, lic), 'utf8')).split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 1).join(' ').slice(0, 80);
  return { version: pj.version, license: pj.license, licenseFile: lic || null, licenseHead, peer: pj.peerDependencies ? Object.keys(pj.peerDependencies) : [] };
}

export async function runSurvey({ runs = 5, throttle = 4 } = {}) {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  await cp(path.join(root, 'dist', 'assets'), path.join(OUT, 'assets'), { recursive: true });
  const res = { method: `esbuild ${esbuild.version}, minified ESM with code splitting, NODE_ENV=production; 'initial' = entry + statically imported chunks, 'all' = every chunk incl. dynamic import(); boot = navigation start → first frame the hello world rendered, ${throttle}× CPU throttle, median of ${runs} cold loads (no cache), Chromium headless with SwiftShader WebGL.`, entries: {} };
  for (const [name, e] of Object.entries(ENTRIES)) {
    const row = { kind: e.kind, entry: e.entry, reactBinding: e.reactBinding ?? null, includesReact: !!e.react };
    try { row.size = await buildEntry(name, e); } catch (err) { row.buildError = String(err.message).split('\n').slice(0, 3).join(' '); }
    row.packages = {};
    for (const p of e.pkgs) row.packages[p] = { ...(await localPkg(p)), registry: registry(p) };
    res.entries[name] = row;
    console.log('survey build', name, row.size ? `${(row.size.initial.gzip / 1024).toFixed(1)} KB gz initial, ${(row.size.all.gzip / 1024).toFixed(1)} all` : row.buildError);
  }
  // Boot each hello world.
  const { server, base } = await serve(OUT);
  const browser = await launchBrowser();
  for (const [name, row] of Object.entries(res.entries)) {
    if (!row.size) continue;
    const times = []; let what = null; const errors = [];
    for (let i = 0; i < runs; i++) {
      const ctx = await browser.newContext({ viewport: { width: 860, height: 720 }, deviceScaleFactor: 1 });
      const pg = await ctx.newPage();
      pg.on('pageerror', (er) => errors.push(er.message.slice(0, 160)));
      const cdp = await ctx.newCDPSession(pg);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
      try {
        await pg.goto(`${base}/${name}/`, { waitUntil: 'load', timeout: 60000 });
        await pg.waitForFunction(() => window.__ready != null, null, { timeout: 30000, polling: 50 });
        const r = await pg.evaluate(() => ({ t: window.__ready, what: window.__what, res: performance.getEntriesByType('resource').map((x) => x.name.split('/').pop()) }));
        times.push(r.t); what = r.what;
        if (i === 0) row.fetched = { files: r.res.filter((f) => /\.(js|wasm)$/.test(f)), gzip: r.res.reduce((a, f) => a + (row.size.files[f] || 0), 0) };
      } catch (er) { errors.push(`no first frame: ${er.message.split('\n')[0].slice(0, 120)}`); await ctx.close(); break; }
      await ctx.close();
    }
    row.boot = { ms: times.length ? Math.round(median(times)) : null, runs: times.length, renderer: what, errors: [...new Set(errors)].slice(0, 3) };
    console.log('survey boot', name, JSON.stringify(row.boot));
  }
  await browser.close();
  server.close();
  const pub = path.join(SDIR, 'engines-published.json');
  if (existsSync(pub)) res.published = JSON.parse(await readFile(pub, 'utf8'));
  return res;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await runSurvey({ runs: Number(process.argv[2] || 1) });
  console.log(JSON.stringify(Object.fromEntries(Object.entries(r.entries).map(([k, v]) => [k, v.size?.initial.gzip])), null, 1));
}
