// Build every hero-background variant into dist/<id>/index.html (+ effect.js), with the same page around it.
import { build as esbuild } from 'esbuild';
import { readFile, writeFile, mkdir, copyFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';
import { FLUID } from '../fetch-sources.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, '..');
export const DIST = path.join(ROOT, 'dist');
const SRC = path.join(ROOT, 'src');

// poster: which captured still the page shows first (null = the variant paints its own first frame in CSS).
export const VARIANTS = [
  { id: 'a-static', label: 'a · static poster (AVIF)', kind: 'static', poster: 'shader' },
  { id: 'b1-css-blobs', label: 'b1 · CSS gradient blobs, transform-animated', kind: 'css', poster: null },
  { id: 'b2-css-property', label: 'b2 · CSS mesh gradient, @property-animated', kind: 'css', poster: null },
  { id: 'c1-svg-turbulence', label: 'c1 · SVG feTurbulence, SMIL-animated', kind: 'css', poster: null },
  { id: 'c2-css-grain', label: 'c2 · static poster + CSS grain overlay', kind: 'css', poster: 'shader' },
  { id: 'd-canvas2d', label: 'd · Canvas 2D flow particles', kind: 'script', entry: 'd-canvas2d.js', poster: 'canvas2d' },
  { id: 'e1-webgl-vanilla', label: 'e1 · fragment shader, raw WebGL', kind: 'script', entry: 'e1-webgl-vanilla.js', poster: 'shader' },
  { id: 'e2-ogl', label: 'e2 · fragment shader, OGL', kind: 'script', entry: 'e2-ogl.js', poster: 'shader' },
  { id: 'e3-regl', label: 'e3 · fragment shader, regl', kind: 'script', entry: 'e3-regl.js', poster: 'shader' },
  { id: 'e4-twgl', label: 'e4 · fragment shader, twgl.js', kind: 'script', entry: 'e4-twgl.js', poster: 'shader' },
  { id: 'e5-three', label: 'e5 · fragment shader, three.js', kind: 'script', entry: 'e5-three.js', poster: 'shader' },
  { id: 'e6-paper', label: 'e6 · Paper Shaders MeshGradient (library)', kind: 'script', entry: 'e6-paper.js', poster: 'paper' },
  { id: 'f-three-particles', label: 'f · three.js 40k GPU particles', kind: 'script', entry: 'f-three-particles.js', poster: 'particles' },
  { id: 'h-post', label: 'h · f + postprocessing (?fx=)', kind: 'script', entry: 'h-post.js', poster: 'post' },
  { id: 'g-fluid-demo', label: 'g · fluid sim, demo as published', kind: 'fluid-demo', poster: null },
  { id: 'g-fluid-wrapped', label: 'g · fluid sim, production-wrapped', kind: 'script', entry: 'g-fluid-wrapped.js', poster: 'fluid' },
];

// How each poster is captured: the page, query and wait. Deterministic stills where the effect allows.
export const POSTERS = {
  shader: { from: 'e1-webgl-vanilla', query: 'still&t0=0', wait: 300 },
  canvas2d: { from: 'd-canvas2d', query: '', wait: 3500 },
  paper: { from: 'e6-paper', query: 'still&t0=0', wait: 600 },
  particles: { from: 'f-three-particles', query: 'still&t0=3', wait: 600 },
  post: { from: 'h-post', query: 'still&t0=3&fx=all', wait: 800 },
  fluid: { from: 'g-fluid-wrapped', query: '', wait: 3000 },
};

const PAGE_CSS = /* css */ `
:root { --navy: #09122a; --ink: #13202b; --paper: #f6f4ef; }
* { box-sizing: border-box; }
html { color-scheme: light; }
body { margin: 0; font: 17px/1.55 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; background: var(--paper); color: var(--ink); }
.nav { position: absolute; inset: 0 0 auto 0; display: flex; justify-content: space-between; align-items: center; padding: 22px 40px; color: #fff; z-index: 2; font-weight: 600; }
.nav nav { display: flex; gap: 28px; font-weight: 500; opacity: .9; }
.hero { position: relative; min-height: 100vh; min-height: 100svh; display: grid; align-items: end; color: #fff; overflow: hidden; background: var(--navy); isolation: isolate; }
.hero-bg { position: absolute; inset: 0; z-index: -1; }
.hero-bg picture, .hero-bg .poster { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
.hero-bg::after { content: ''; position: absolute; inset: 0; z-index: 1; pointer-events: none;   /* one static scrim for every variant */
  background: linear-gradient(90deg, rgba(9,18,42,.55) 0%, rgba(9,18,42,.2) 45%, rgba(9,18,42,0) 70%), linear-gradient(0deg, rgba(9,18,42,.4) 0%, rgba(9,18,42,0) 50%); }
html.noscrim .hero-bg::after { display: none; }
.fx { position: absolute; inset: 0; width: 100%; height: 100%; display: block; opacity: 0; transition: opacity .6s ease-out; touch-action: pan-y; }
.hero-copy { padding: 0 40px 13vh; max-width: 820px; position: relative; }
.eyebrow { text-transform: uppercase; letter-spacing: .14em; font-size: 13px; opacity: .8; margin: 0 0 18px; }
h1 { font-size: clamp(42px, 6.4vw, 88px); line-height: 1.02; letter-spacing: -.025em; margin: 0 0 22px; font-weight: 650; }
.lede { font-size: 20px; max-width: 34em; opacity: .88; margin: 0 0 32px; }
.cta { display: inline-block; background: #fff; color: var(--navy); padding: 14px 24px; border-radius: 999px; text-decoration: none; font-weight: 600; }
.bg-toggle { position: absolute; right: 24px; bottom: 24px; z-index: 2; background: rgba(9,18,42,.55); color: #fff; border: 1px solid rgba(255,255,255,.4); border-radius: 999px; padding: 8px 14px; font: 500 13px system-ui, sans-serif; cursor: pointer; }
.bg-toggle:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }
main section { max-width: 980px; margin: 0 auto; padding: 96px 40px; }
main h2 { font-size: 40px; letter-spacing: -.02em; margin: 0 0 16px; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
.grid div { background: #fff; border-radius: 16px; padding: 24px; min-height: 180px; }
html.capture .nav, html.capture .hero-copy, html.capture .bg-toggle { visibility: hidden; }
@media (max-width: 700px) { .nav { padding: 18px 20px; } .nav nav { display: none; } .hero-copy { padding: 0 20px 10vh; } main section { padding: 64px 20px; } .grid { grid-template-columns: 1fr; } .lede { font-size: 18px; } }
@media (prefers-reduced-motion: reduce) { .fx { transition: none; } }
`;

const CONTENT = `
<main>
  <section><h2>Sensors that read the river, not the lab.</h2><p>Halcyon probes sit in the water all year and report turbidity, nitrate and temperature every ten minutes. The dashboard shows what changed, where, and what it will cost if nobody acts.</p></section>
  <section><div class="grid"><div><h3>Deploy in a day</h3><p>Solar-powered probes, no trenching.</p></div><div><h3>Alerts that matter</h3><p>Thresholds set with your regulator's limits.</p></div><div><h3>Reports that file themselves</h3><p>Monthly compliance PDFs, signed.</p></div></div></section>
  <section><h2>Talk to a hydrologist</h2><p>Every account starts with a site survey. We will tell you when a probe is not the answer.</p><p style="height:60vh"></p></section>
</main>`;

function posterHtml(name, posters) {
  const p = name && posters?.[name];
  if (!p) return '';
  return `<picture><source type="image/avif" srcset="../posters/${name}-800.avif 800w, ../posters/${name}-1600.avif 1600w" sizes="100vw"><img class="poster" src="../posters/${name}-1600.webp" srcset="../posters/${name}-800.webp 800w, ../posters/${name}-1600.webp 1600w" sizes="100vw" width="1600" height="900" alt="" fetchpriority="high"></picture>`;
}

// The page bootstrap for scripted variants: load the effect after load + idle, never under reduced motion
// (the poster is the design there; the visitor can opt in with the button).
const BOOT = /* js */ `
const q = new URLSearchParams(location.search);
const lab = (window.__lab ||= {});
const bg = document.getElementById('bg'), btn = document.querySelector('.bg-toggle');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let loaded = false;
const load = () => {
  if (loaded) return; loaded = true; lab.bootStart = performance.now();
  import('./effect.js').then((m) => m.default(bg)).catch((e) => { lab.fallback = 'poster'; lab.failReason = String(e).slice(0, 200); btn.hidden = true; });
};
if (reduce && !q.has('forcemotion')) {
  lab.reducedSkip = true;
  btn.hidden = false; btn.textContent = 'Play background'; btn.setAttribute('aria-pressed', 'true');
  btn.addEventListener('click', () => { lab.optIn = true; btn.textContent = 'Pause background'; btn.setAttribute('aria-pressed', 'false'); load(); }, { once: true });
} else if (q.has('eager')) load();
else {
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 1));
  const go = () => idle(load, { timeout: 1500 });
  document.readyState === 'complete' ? go() : addEventListener('load', go, { once: true });
}`;

// CSS variants: pause off-screen and on request with animation-play-state; reduced motion → static, opt-in.
const CSS_BOOT = /* js */ `
const q = new URLSearchParams(location.search);
const hero = document.getElementById('hero'), btn = document.querySelector('.bg-toggle');
if (q.has('blur')) document.documentElement.classList.add('with-blur');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
btn.hidden = false;
if (reduce) { btn.textContent = 'Play background'; btn.setAttribute('aria-pressed', 'true'); }
btn.addEventListener('click', () => {
  const paused = btn.getAttribute('aria-pressed') !== 'true';
  if (reduce) hero.toggleAttribute('data-play', !paused);
  hero.toggleAttribute('data-paused', paused);
  btn.setAttribute('aria-pressed', String(paused));
  btn.textContent = paused ? 'Play background' : 'Pause background';
});
if (!q.has('nopause')) {
  new IntersectionObserver(([e]) => hero.toggleAttribute('data-offscreen', !e.isIntersecting)).observe(hero);
  document.addEventListener('visibilitychange', () => hero.toggleAttribute('data-hidden', document.hidden));
}`;
const CSS_PAUSE = `.hero[data-offscreen] .anim, .hero[data-hidden] .anim, .hero[data-paused] .anim { animation-play-state: paused; }
@media (prefers-reduced-motion: reduce) { .hero:not([data-play]) .anim { animation: none; } }`;

const hexToRow = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
function turbulenceMatrix(dark, light) {
  // fractalNoise R channel (~0.25–0.75) → dark…light, with contrast; alpha forced to 1
  const a = hexToRow(dark), b = hexToRow(light), k = 2.2;
  const row = (i) => `${((b[i] - a[i]) * k).toFixed(3)} 0 0 0 ${(a[i] - (b[i] - a[i]) * k * 0.28).toFixed(3)}`;
  return `${row(0)}  ${row(1)}  ${row(2)}  0 0 0 0 1`;
}

const CSS_VARIANTS = {
  'b1-css-blobs': {
    bg: `<div class="blobs"><i class="b b1 anim"></i><i class="b b2 anim"></i><i class="b b3 anim"></i><i class="b b4 anim"></i></div>`,
    css: `.blobs { position: absolute; inset: 0; background: radial-gradient(120% 90% at 20% 80%, #0b3a4a 0%, #09122a 62%); overflow: hidden; }
.b { position: absolute; width: 70vmax; height: 70vmax; border-radius: 50%; will-change: transform; }
.with-blur .b { filter: blur(60px); }
.b1 { background: radial-gradient(closest-side, rgba(14,122,134,.9), transparent); left: -15vmax; top: -25vmax; animation: d1 26s ease-in-out infinite alternate; }
.b2 { background: radial-gradient(closest-side, rgba(118,219,214,.5), transparent); right: -25vmax; top: 5vmax; animation: d2 32s ease-in-out infinite alternate; }
.b3 { background: radial-gradient(closest-side, rgba(250,133,107,.38), transparent); left: 25vmax; bottom: -45vmax; animation: d3 38s ease-in-out infinite alternate; }
.b4 { background: radial-gradient(closest-side, rgba(8,92,110,.8), transparent); left: 5vmax; top: 15vmax; animation: d4 30s ease-in-out infinite alternate; }
@keyframes d1 { to { transform: translate(22vmax, 14vmax) scale(1.2); } }
@keyframes d2 { to { transform: translate(-18vmax, 16vmax) scale(.85); } }
@keyframes d3 { to { transform: translate(-20vmax, -12vmax) scale(1.15); } }
@keyframes d4 { to { transform: translate(16vmax, -10vmax) rotate(40deg) scale(1.1); } }`,
  },
  'b2-css-property': {
    bg: `<div class="mesh anim"></div>`,
    css: `@property --a { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
@property --x { syntax: '<percentage>'; inherits: false; initial-value: 18%; }
@property --y { syntax: '<percentage>'; inherits: false; initial-value: 30%; }
.mesh { position: absolute; inset: 0;
  background: radial-gradient(55% 50% at var(--x) 28%, rgba(118,219,214,.5), transparent 70%),
              radial-gradient(45% 55% at 82% var(--y), rgba(250,133,107,.32), transparent 70%),
              conic-gradient(from var(--a) at 45% 65%, #09122a, #085c6e, #0c2d4a, #0a3440, #09122a);
  animation: spin 24s linear infinite, wander 14s ease-in-out infinite alternate; }
@keyframes spin { to { --a: 360deg; } }
@keyframes wander { to { --x: 70%; --y: 72%; } }`,
  },
  'c1-svg-turbulence': {
    bg: `<svg class="turb" width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true"><filter id="t" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.0022 0.0036" numOctaves="3" seed="7"><animate class="smil" attributeName="baseFrequency" dur="40s" values="0.0022 0.0036;0.0034 0.0024;0.0022 0.0036" repeatCount="indefinite"/></feTurbulence><feColorMatrix type="matrix" values="${turbulenceMatrix('#09122a', '#1d8f99')}"/></filter><rect width="100%" height="100%" filter="url(#t)"/></svg>`,
    css: `.turb { position: absolute; inset: 0; display: block; }`,
    // SMIL is not a CSS animation: pause it through the SVG element's own API.
    extraJs: `const svg = document.querySelector('.turb'); const sync = () => (hero.matches('[data-offscreen],[data-hidden],[data-paused]') || (reduce && !hero.hasAttribute('data-play')) ? svg.pauseAnimations() : svg.unpauseAnimations());
new MutationObserver(sync).observe(hero, { attributes: true }); sync();`,
  },
  'c2-css-grain': {
    bg: `<div class="grain anim"></div>`,
    css: `.grain { position: absolute; inset: -100%; width: 300%; height: 300%; opacity: .16; mix-blend-mode: overlay; pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  animation: grain 1s steps(6) infinite; will-change: transform; }
@keyframes grain { 0% { transform: translate(0, 0); } 20% { transform: translate(-3%, 2%); } 40% { transform: translate(2%, -4%); } 60% { transform: translate(-4%, -1%); } 80% { transform: translate(3%, 3%); } 100% { transform: translate(-1%, 4%); } }`,
  },
};

function shell({ v, bgInner, headCss = '', scripts = '', toggle = true }) {
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Halcyon — ${v.label}</title>
<style>${PAGE_CSS}${headCss}</style>
<script>if (location.search.includes('capture')) document.documentElement.classList.add('capture'); if (location.search.includes('noscrim')) document.documentElement.classList.add('noscrim');</script>
</head><body>
<header class="nav"><span>Halcyon</span><nav><a style="color:inherit;text-decoration:none" href="#">Product</a><a style="color:inherit;text-decoration:none" href="#">Rivers</a><a style="color:inherit;text-decoration:none" href="#">Pricing</a></nav></header>
<section class="hero" id="hero" aria-labelledby="h1">
  <div class="hero-bg" id="bg" aria-hidden="true">${bgInner}</div>
  <div class="hero-copy"><p class="eyebrow">Water quality, continuously</p><h1 id="h1">Every drop, accounted for.</h1><p class="lede">Live readings from probes in your river, turned into decisions before the regulator asks.</p><a class="cta" href="#">Book a site survey</a></div>
  ${toggle ? '<button class="bg-toggle" type="button" aria-pressed="false" hidden>Pause background</button>' : ''}
</section>
${CONTENT}
${scripts}
</body></html>`;
}

export function patchFluid(src) {
  const rep = (from, to) => { if (!src.includes(from)) throw new Error(`fluid patch did not apply: ${from.slice(0, 60)}`); src = src.replace(from, to); };
  const a = src.indexOf('// Mobile promo section'), b = src.indexOf('// Simulation section');
  if (a < 0 || b < 0) throw new Error('fluid patch: promo markers missing');
  src = src.slice(0, a) + src.slice(b);
  rep("const canvas = document.getElementsByTagName('canvas')[0];", 'const canvas = __canvas;');
  rep('startGUI();', 'if (__hooks.back) config.BACK_COLOR = __hooks.back;\nif (__hooks.lite) { config.DYE_RESOLUTION = 512; config.BLOOM = false; config.SUNRAYS = false; }');
  rep("gl = canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params);",
    "gl = canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params);\n    if (!gl) throw new Error('no WebGL');");
  rep('let pixelRatio = window.devicePixelRatio || 1;', 'let pixelRatio = Math.min(window.devicePixelRatio || 1, __hooks.dprCap);');
  const pd = src.split('    e.preventDefault();\n').length - 1;
  if (pd !== 2) throw new Error(`fluid patch: expected 2 touch preventDefault, found ${pd}`);
  src = src.replaceAll('    e.preventDefault();\n', '');
  rep("window.addEventListener('keydown', e => {", "if (false) window.addEventListener('keydown', e => {");
  rep('    render(null);\n    requestAnimationFrame(update);', '    render(null);');
  rep('update();\n\nfunction update', '\nfunction update');
  rep('let c = HSVtoRGB(Math.random(), 1.0, 1.0);', 'let c = __hooks.color ? __hooks.color() : HSVtoRGB(Math.random(), 1.0, 1.0);');
  rep("createTextureAsync('LDR_LLL1_0.png')", 'createTextureAsync(__hooks.ditherUrl)');
  src = src.replace(/\bga\(/g, '__noop(');
  return `// Generated by lib/build.mjs from ${FLUID.repo} @ ${FLUID.commit} (MIT, © 2017 Pavel Dobryakov). Not committed.\nexport default function fluid(__canvas, __hooks) {\nconst __noop = () => {};\n${src}\nreturn { update, splats: (n) => splatStack.push(n), config, gl };\n}\n`;
}

const gz = (buf) => zlib.gzipSync(buf, { level: 9 }).length;
const br = (buf) => zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }).length;
export async function sizesOf(file) {
  const buf = await readFile(file);
  return { raw: buf.length, gzip: gz(buf), brotli: br(buf) };
}

export async function buildAll({ posters = null } = {}) {
  await mkdir(DIST, { recursive: true });
  const out = {};
  const fluidDir = FLUID.dir;
  const haveFluid = existsSync(path.join(fluidDir, 'script.js'));
  if (haveFluid) {
    await mkdir(path.join(DIST, '_gen'), { recursive: true });
    await writeFile(path.join(DIST, '_gen/fluid-module.js'), patchFluid(await readFile(path.join(fluidDir, 'script.js'), 'utf8')));
  }
  const fluidAlias = { name: 'fluid-alias', setup(b) { b.onResolve({ filter: /^fluid-sim$/ }, () => ({ path: path.join(DIST, '_gen/fluid-module.js') })); } };

  for (const v of VARIANTS) {
    const dir = path.join(DIST, v.id);
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
    const rec = { id: v.id, label: v.label, kind: v.kind, poster: v.poster };
    if (v.kind === 'script') {
      if (v.id.startsWith('g-') && !haveFluid) { rec.skipped = 'run fetch-sources.mjs first'; out[v.id] = rec; continue; }
      const r = await esbuild({
        entryPoints: [path.join(SRC, 'variants', v.entry)], bundle: true, minify: true, format: 'esm', target: 'es2020',
        outfile: path.join(dir, 'effect.js'), metafile: true, legalComments: 'none', logLevel: 'silent', plugins: [fluidAlias],
        define: { 'process.env.NODE_ENV': '"production"' },
      });
      rec.effect = await sizesOf(path.join(dir, 'effect.js'));
      rec.inputs = Object.entries(r.metafile.outputs[Object.keys(r.metafile.outputs)[0]].inputs)
        .map(([k, x]) => [k.replace(/^.*node_modules\//, '').replace(/^src\//, ''), x.bytesInOutput])
        .reduce((acc, [k, n]) => { const pkg = k.startsWith('@') ? k.split('/').slice(0, 2).join('/') : k.split('/')[0]; acc[pkg] = (acc[pkg] || 0) + n; return acc; }, {});
      if (v.id.startsWith('g-')) await copyFile(path.join(fluidDir, 'LDR_LLL1_0.png'), path.join(dir, 'LDR_LLL1_0.png'));
      await writeFile(path.join(dir, 'index.html'), shell({ v, bgInner: posterHtml(v.poster, posters), scripts: `<script type="module">${BOOT}</script>` }));
    } else if (v.kind === 'css') {
      const c = CSS_VARIANTS[v.id];
      const bgInner = posterHtml(v.poster, posters) + c.bg;
      await writeFile(path.join(dir, 'index.html'), shell({ v, bgInner, headCss: c.css + CSS_PAUSE, scripts: `<script type="module">${CSS_BOOT}\n${c.extraJs || ''}</script>` }));
    } else if (v.kind === 'static') {
      await writeFile(path.join(dir, 'index.html'), shell({ v, bgInner: posterHtml(v.poster, posters), toggle: false }));
    } else if (v.kind === 'fluid-demo') {
      if (!haveFluid) { rec.skipped = 'run fetch-sources.mjs first'; out[v.id] = rec; continue; }
      // As published: classic scripts at the end of <body>, dat.gui, analytics call sites, promo markup, fullscreen canvas.
      for (const f of ['script.js', 'dat.gui.min.js', 'LDR_LLL1_0.png']) await copyFile(path.join(fluidDir, f), path.join(dir, f));
      const promo = `<div class="promo" style="display:none"><span class="promo-close"></span><a id="apple_link"></a><a id="google_link"></a></div>`;
      const scripts = `${promo}<script>window.ga = function () {}; window.__lab = { bootStart: performance.now() };</script><script src="dat.gui.min.js"></script><script src="script.js"></script>
<script>requestAnimationFrame(() => requestAnimationFrame(() => { __lab.ttff = performance.now(); }));</script>`;
      await writeFile(path.join(dir, 'index.html'), shell({ v, bgInner: '<canvas class="fx" style="opacity:1"></canvas>', headCss: '.dg.ac { display: none; }', scripts, toggle: false }));
      rec.effect = { raw: 0, gzip: 0, brotli: 0 };
      for (const f of ['script.js', 'dat.gui.min.js']) { const s = await sizesOf(path.join(dir, f)); for (const k of Object.keys(s)) rec.effect[k] += s[k]; }
    }
    rec.html = await sizesOf(path.join(dir, 'index.html'));
    out[v.id] = rec;
  }
  return out;
}
