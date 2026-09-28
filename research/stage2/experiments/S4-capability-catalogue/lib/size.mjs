// Bundle-cost measurement: esbuild (minify, ESM, splitting, browser, production) of a minimal-usage
// entry, with React / Vue / Svelte external (the stage-1 stream-B method), then gzip -9 per output file.
// Reports: entry chunk, all JS (lazy chunks included), CSS, other assets (WASM, fonts), and the
// number of distinct npm packages that ended up in the bundle (a transitive-dependency signal).
import * as esbuild from 'esbuild';
import { gzipSync } from 'node:zlib';
import { mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';

const EXTERNAL = ['react', 'react-dom', 'react/*', 'react-dom/*', 'vue', 'svelte', 'svelte/*', 'scheduler'];
const gz = (buf) => gzipSync(buf, { level: 9 }).length;

export async function measure(id, entryCode, { buildDir, root, assets = [], alias = {} }) {
  const dir = path.join(buildDir, id);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  const entry = path.join(dir, 'entry.mjs');
  await writeFile(entry, entryCode + '\n');
  const out = path.join(dir, 'out');
  let result;
  try {
    result = await esbuild.build({
      entryPoints: [entry], bundle: true, minify: true, format: 'esm', splitting: true, platform: 'browser',
      target: 'es2022', outdir: out, metafile: true, write: true, logLevel: 'silent', legalComments: 'none',
      external: EXTERNAL, define: { 'process.env.NODE_ENV': '"production"', global: 'globalThis' },
      conditions: ['production'], nodePaths: [path.join(root, 'node_modules')],
      loader: { '.wasm': 'file', '.woff': 'file', '.woff2': 'file', '.ttf': 'file', '.eot': 'file', '.png': 'file', '.jpg': 'file', '.gif': 'file', '.svg': 'file', '.json': 'json' },
      absWorkingDir: dir, alias,
    });
  } catch (e) {
    return { ok: false, error: (e.errors || []).map((x) => x.text).slice(0, 3).join(' | ') || e.message };
  }
  const outputs = result.metafile.outputs;
  const res = { ok: true, entryMin: 0, entryGz: 0, jsMin: 0, jsGz: 0, cssGz: 0, assetsRaw: 0, assetsGz: 0, chunks: 0, packages: 0 };
  for (const [file, meta] of Object.entries(outputs)) {
    const buf = await readFile(path.resolve(dir, file));
    const g = gz(buf);
    if (file.endsWith('.js')) {
      res.jsMin += buf.length; res.jsGz += g; res.chunks++;
      if (meta.entryPoint && meta.entryPoint.endsWith('entry.mjs')) { res.entryMin = buf.length; res.entryGz = g; }
    } else if (file.endsWith('.css')) res.cssGz += g;
    else if (!file.endsWith('.map')) { res.assetsRaw += buf.length; res.assetsGz += g; }
  }
  // Initial JS = the entry chunk plus every chunk it imports statically (lazy `import()` chunks excluded).
  const seen = new Set();
  const walk = (file) => { if (seen.has(file)) return; seen.add(file); for (const im of outputs[file]?.imports || []) if (im.kind === 'import-statement' && !im.external) walk(im.path); };
  const entryOut = Object.keys(outputs).find((f) => outputs[f].entryPoint?.endsWith('entry.mjs'));
  if (entryOut) walk(entryOut);
  res.initialMin = 0; res.initialGz = 0;
  for (const f of seen) { const buf = await readFile(path.resolve(dir, f)); res.initialMin += buf.length; res.initialGz += gz(buf); }
  // Assets the package fetches at runtime via new URL(..., import.meta.url), which esbuild does not follow.
  for (const a of assets) { const buf = await readFile(path.join(root, 'node_modules', a)); res.assetsRaw += buf.length; res.assetsGz += gz(buf); }
  const pkgs = new Set();
  for (const input of Object.keys(result.metafile.inputs)) {
    const m = input.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/g);
    if (m) pkgs.add(m[m.length - 1].replace('node_modules/', ''));
  }
  res.packages = pkgs.size;
  res.packageList = [...pkgs].sort();
  return res;
}
