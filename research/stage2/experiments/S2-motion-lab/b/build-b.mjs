// Build Part B: one page per runtime (captures/b/<variant>.html), self-hosted WASM, the sprite strip, and the size table.
import { build } from 'esbuild';
import { mkdir, writeFile, readFile, copyFile, stat } from 'node:fs/promises';
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';
import path from 'node:path';
import { labRoot } from '../lib/server.mjs';
import { BODY } from './pages.mjs';
import { LOOPS } from './impl/loops.mjs';
import { fetchAssets } from '../fetch-assets.mjs';
const out = path.join(labRoot, 'captures/b');
const nm = (p) => path.join(labRoot, 'node_modules', p);
export const WASM = { 'rive-canvas.wasm': '@rive-app/canvas/rive.wasm', 'rive-canvas-lite.wasm': '@rive-app/canvas-lite/rive.wasm', 'rive-webgl2.wasm': '@rive-app/webgl2/rive.wasm', 'dotlottie-player.wasm': '@lottiefiles/dotlottie-web/dist/dotlottie-player.wasm' };
const USES = { 'rive-canvas': 'rive-canvas.wasm', 'rive-canvas-lite': 'rive-canvas-lite.wasm', 'rive-webgl2': 'rive-webgl2.wasm', 'rive-react': 'rive-canvas.wasm', dotlottie: 'dotlottie-player.wasm', 'dotlottie-worker': 'dotlottie-player.wasm',
  'loop-rive': 'rive-canvas.wasm', 'loop-dotlottie': 'dotlottie-player.wasm', 'loop-dotlottie-worker': 'dotlottie-player.wasm', 'rive-semantics': 'rive-canvas.wasm' };
const ASSET = { 'rive-canvas': 'switch.riv', 'rive-canvas-lite': 'switch.riv', 'rive-webgl2': 'switch.riv', 'rive-react': 'switch.riv', 'lottie-svg': 'toggle.json', 'lottie-light': 'toggle.json', dotlottie: 'toggle-sm.lottie', 'dotlottie-worker': 'toggle-sm.lottie', sprite: '../b/sprite.webp',
  'loop-rive': 'truck.riv', 'loop-lottie-svg': 'hamster.json', 'loop-lottie-canvas': 'hamster.json', 'loop-dotlottie': 'hamster.lottie', 'loop-dotlottie-worker': 'hamster.lottie', 'rive-semantics': 'semantic.riv' };
const gz = (b) => gzipSync(b, { level: 9 }).length, br = (b) => brotliCompressSync(b, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length;
const common = { bundle: true, format: 'esm', platform: 'browser', target: 'es2022', jsx: 'automatic', minify: true, logLevel: 'silent', define: { 'process.env.NODE_ENV': '"production"' } };
const page = (v, js, body, css) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${v}</title><link rel="icon" href="data:,">
<style>html,body{margin:0;background:#fff}body{padding:20px}${css}</style></head><body><main>${body}</main>${js ? `<script type="module" src="/captures/b/${v}.js"></script>` : ''}</body></html>`;
export async function buildB(browser, base) {
  await fetchAssets();
  await mkdir(path.join(out, 'wasm'), { recursive: true });
  for (const [k, p] of Object.entries(WASM)) await copyFile(nm(p), path.join(out, 'wasm', k));
  const sizes = {};
  const entries = { ...Object.fromEntries(Object.keys(BODY).map((v) => [v, { file: path.join(labRoot, 'b/impl', `${v}${v === 'rive-react' ? '.jsx' : '.js'}`) }])), ...Object.fromEntries(Object.entries(LOOPS).map(([v, src]) => [v, { src }])) };
  for (const [v, e] of Object.entries(entries)) {
    const opts = e.file ? { entryPoints: [e.file] } : { stdin: { contents: e.src, resolveDir: labRoot, loader: 'js' } };
    await build({ ...common, ...opts, outfile: path.join(out, `${v}.js`) });
    const js = await readFile(path.join(out, `${v}.js`));
    let noReact = null;
    if (v === 'rive-react') { const r = await build({ ...common, ...opts, write: false, external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime'] }); noReact = gz(Buffer.from(r.outputFiles[0].contents)); }
    const w = USES[v] ? await readFile(path.join(out, 'wasm', USES[v])) : null;
    const assetPath = ASSET[v] ? path.join(labRoot, 'captures/b-assets', ASSET[v]) : null;
    const asset = assetPath ? await readFile(assetPath).catch(() => null) : null;
    sizes[v] = { jsMin: js.length, jsGz: gz(js), jsGzWithoutReact: noReact, wasmRaw: w?.length ?? 0, wasmGz: w ? gz(w) : 0, wasmBr: w ? br(w) : 0, asset: ASSET[v], assetRaw: asset?.length ?? null, assetGz: asset ? gz(asset) : null };
    const b = BODY[v] || { body: /rive|dotlottie/.test(v) ? '<canvas id="c" width="600" height="300" style="width:300px;height:150px"></canvas>' : '<div id="stage" style="width:300px;height:150px"></div>', css: '' };
    await writeFile(path.join(out, `${v}.html`), page(v, true, b.body, b.css));
  }
  // the sprite strip: render the toggle JSON with lottie-web's canvas renderer, 31 frames at 2x
  if (browser) {
    const p = await browser.newPage();
    await build({ ...common, stdin: { contents: `import lottie from 'lottie-web'; window.lottie = lottie;`, resolveDir: labRoot }, outfile: path.join(out, 'lottie-global.js') });
    await p.goto(`${base}/captures/b/rive-canvas.html`); // same origin; body replaced below
    await p.setContent('<div id="s" style="width:200px;height:200px"></div>');
    await p.addScriptTag({ url: `${base}/captures/b/lottie-global.js`, type: 'module' });
    await p.waitForFunction(() => window.lottie);
    const dataUrl = await p.evaluate(async (src) => {
      const a = window.lottie.loadAnimation({ container: document.getElementById('s'), renderer: 'canvas', loop: false, autoplay: false, path: src, rendererSettings: { clearCanvas: true } });
      await new Promise((r) => a.addEventListener('DOMLoaded', r));
      const strip = document.createElement('canvas'); strip.width = 200 * 31; strip.height = 200; const g = strip.getContext('2d');
      for (let i = 0; i < 31; i++) { a.goToAndStop(Math.min(a.totalFrames - 1, i * 2), true); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); g.drawImage(document.querySelector('#s canvas'), i * 200, 0, 200, 200); }
      return strip.toDataURL('image/webp', 0.9);
    }, '/captures/b-assets/toggle.json');
    await writeFile(path.join(out, 'sprite.webp'), Buffer.from(dataUrl.split(',')[1], 'base64'));
    await p.close();
    const s = await readFile(path.join(out, 'sprite.webp')); sizes.sprite.assetRaw = s.length; sizes.sprite.assetGz = gz(s);
  }
  return sizes;
}
