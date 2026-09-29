// Fixtures for the loading experiment: one marketing-style page with a heavy interactive module below the fold,
// loaded seven ways. The module is simulated but does real work: ~2 MB of generated JS (≈ 600 KB gzip) whose boot
// compiles and runs a third of its functions, then 4 × 512 KB incompressible assets (2 MB) each "decoded" by a CPU
// loop, then a canvas scene. The staged build splits it: a core (≈ 25% of the code) plus a 128 KB low-res asset
// makes it usable; the rest and the full assets stream in behind, processed in yielded chunks.
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { gzipSync, constants } from 'node:zlib';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';
import { here, siteRoot } from './common.mjs';

// Deterministic pseudo-random so every rebuild is byte-identical.
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function genCode(prefix, count, seed) {
  const r = rng(seed);
  const id = (n) => Array.from({ length: n }, () => ALPHA[Math.floor(r() * 52)]).join('');
  const str = (n) => Array.from({ length: n }, () => ALPHA[Math.floor(r() * 62)]).join('');
  const lines = [];
  const names = [];
  for (let i = 0; i < count; i++) {
    const name = `${prefix}_${id(6)}${i}`;
    names.push(name);
    lines.push(`function ${name}(a,b){const k=${JSON.stringify(str(48))};let s=a*${r().toFixed(6)}+b;for(let i=0;i<${8 + Math.floor(r() * 16)};i++){s=(s*1.00001+k.charCodeAt(i%48)*${r().toFixed(4)})%${10007 + Math.floor(r() * 90000)}}return (s|0)^${Math.floor(r() * 65535)}}`);
  }
  return { code: lines.join('\n'), names };
}

const gz = (buf) => gzipSync(buf, { level: constants.Z_BEST_COMPRESSION });
async function writeText(file, text) { await writeFile(file, text); await writeFile(file + '.gz', gz(Buffer.from(text))); }

// Shared runtime pieces (as text, inserted into the modules).
const WORK = `
function cpu(ms1x){ /* a fixed amount of work: ~ms1x milliseconds unthrottled on the lab machine; scales with CPU speed */
  let s=0; const n=ms1x*${'__ITER__'}; for(let i=0;i<n;i++){ s+=Math.sqrt(i)*1e-9 } return s }
function decode(buf, ms1x){ const v=new Uint8Array(buf); let h=0; const step=Math.max(1, Math.floor(v.length/2e5)); for(let i=0;i<v.length;i+=step){ h=(h*31+v[i])|0 } return h+cpu(ms1x) }
function drawScene(cv, fidelity){ const g=cv.getContext('2d'); const w=cv.width=cv.clientWidth*devicePixelRatio, h=cv.height=cv.clientHeight*devicePixelRatio;
  const grd=g.createLinearGradient(0,0,0,h); grd.addColorStop(0,'#2b2f3a'); grd.addColorStop(1,'#11131a'); g.fillStyle=grd; g.fillRect(0,0,w,h);
  const n = fidelity==='full'? 1400 : 250; for(let i=0;i<n;i++){ const a=i/n*Math.PI*2, r=(0.18+0.12*Math.sin(i*1.7))*Math.min(w,h);
    g.fillStyle='hsl('+(30+i%40)+' 70% '+(fidelity==='full'?55:45)+'%)'; g.beginPath(); g.arc(w/2+Math.cos(a)*r, h/2+Math.sin(a)*r*0.6, fidelity==='full'?3*devicePixelRatio:6*devicePixelRatio, 0, 7); g.fill() }
  g.fillStyle='#fff'; g.font=(14*devicePixelRatio)+'px system-ui'; g.fillText(fidelity==='full'?'Full detail':'Preview detail · loading more…', 12*devicePixelRatio, h-14*devicePixelRatio) }
function interactive(cv, fidelity){ let rot=0; const onMove=(e)=>{ rot+=e.movementX||1; cpu(4); drawScene(cv, fidelity()) };
  cv.addEventListener('pointerdown', ()=>{ cpu(3); drawScene(cv, fidelity()); cv.addEventListener('pointermove', onMove) });
  addEventListener('pointerup', ()=>cv.removeEventListener('pointermove', onMove)) }
const yieldNow = () => (globalThis.scheduler?.yield ? scheduler.yield() : new Promise((r) => setTimeout(r, 0)));
`;

export async function buildLoading({ iterPerMs = 190000 } = {}) {
  const dir = path.join(siteRoot, 'loading');
  await mkdir(path.join(dir, 'assets'), { recursive: true });
  const work = WORK.replace("${'__ITER__'}", String(iterPerMs)).replace('__ITER__', String(iterPerMs));

  // Code: the full module = core + rest; the staged build ships them as two files.
  const core = genCode('c', 2000, 11), rest = genCode('r', 6000, 23);
  const init = (names, step) => `let acc=0;const FNS=[${names.join(',')}];for(let i=0;i<FNS.length;i+=${step})acc+=FNS[i](i,acc);`;
  const ASSETS = ['a0', 'a1', 'a2', 'a3'];
  const heavy = `${core.code}\n${rest.code}\n${work}
export async function boot(cv, { onProgress = () => {}, priority = 'auto' } = {}) {
  performance.mark('mod-eval-start');
  ${init([...core.names, ...rest.names], 3)}
  cpu(40); /* scene graph, materials, shader setup */
  performance.mark('mod-evaluated');
  let done = 0;
  await Promise.all(${JSON.stringify(ASSETS)}.map(async (a) => { const b = await (await fetch('assets/' + a + '.bin', { priority })).arrayBuffer(); await new Promise((r) => setTimeout(r, 0)); decode(b, 25); onProgress(++done / 4) }));
  drawScene(cv, 'full'); interactive(cv, () => 'full');
  performance.mark('mod-ready'); performance.mark('mod-usable');
  return acc;
}`;
  await writeText(path.join(dir, 'heavy.js'), heavy);

  const coreMod = `${core.code}\n${work}
export async function boot(cv, { onProgress = () => {}, priority = 'auto' } = {}) {
  performance.mark('mod-eval-start');
  ${init(core.names, 3)}
  cpu(10);
  performance.mark('mod-evaluated');
  let fidelity = 'preview';
  const lo = await (await fetch('assets/lowres.bin', { priority })).arrayBuffer(); decode(lo, 6);
  drawScene(cv, fidelity); interactive(cv, () => fidelity);
  performance.mark('mod-usable'); onProgress(0.25);
  // everything else streams in behind, low priority, in yielded chunks: the preview stays interactive
  const restP = import('./rest.js');
  let done = 0;
  const bufs = await Promise.all(${JSON.stringify(ASSETS)}.map(async (a) => { const b = await (await fetch('assets/' + a + '.bin', { priority: 'low' })).arrayBuffer(); onProgress(0.25 + 0.75 * (++done / 4)); return b }));
  const rest = await restP; await rest.init();
  for (const b of bufs) for (let k = 0; k < 5; k++) { decode(b.slice(0, 1), 5); await yieldNow() }
  fidelity = 'full'; drawScene(cv, fidelity);
  performance.mark('mod-ready');
}`;
  await writeText(path.join(dir, 'core.js'), coreMod);
  await writeText(path.join(dir, 'rest.js'), `${rest.code}\nconst yieldNow = () => (globalThis.scheduler?.yield ? scheduler.yield() : new Promise((r) => setTimeout(r, 0)));
export async function init(){ const FNS=[${rest.names.join(',')}]; let acc=0; for(let i=0;i<FNS.length;i+=3){ acc+=FNS[i](i,acc); if(i%300===0) await yieldNow() } return acc }`);

  for (const a of ASSETS) await writeFile(path.join(dir, 'assets', a + '.bin'), randomBytes(512 * 1024));
  await writeFile(path.join(dir, 'assets', 'lowres.bin'), randomBytes(128 * 1024));

  // Images: a hero (the LCP) and the module's poster, AVIF at the phone's rendered width × DPR 2.
  const src = path.join(here, 'captures/src/hero.jpg');
  await sharp(src).resize({ width: 780, height: 520, fit: 'cover' }).avif({ quality: 72, effort: 4 }).toFile(path.join(dir, "hero.avif"));
  await sharp(src).extract({ left: 900, top: 700, width: 1600, height: 1200 }).resize({ width: 716, height: 537 }).avif({ quality: 68, effort: 4 }).toFile(path.join(dir, "poster.avif"));

  const VARIANTS = {
    eager: 'Vite-style: <link rel=modulepreload> + an entry that boots at once',
    visible: 'import() when the module section enters the viewport (IntersectionObserver, rootMargin 0)',
    idle: 'import() in requestIdleCallback after load (timeout 4 s; setTimeout fallback)',
    interaction: 'poster + button; import() on click',
    prefetch: 'poster + button; modulepreload + asset prefetch (low priority) when the section is one viewport away or the button gets pointerdown/focus; boot on click',
    staged: 'poster + button; on click a core (25% of the code) + a 128 KB low-res asset make it usable, the rest streams in behind',
    'prefetch-staged': 'staged, with the core and the low-res asset prefetched on approach',
  };
  const para = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere erat a ante venenatis dapibus posuere velit aliquet. Donec ullamcorper nulla non metus auctor fringilla. Vestibulum id ligula porta felis euismod semper.';
  for (const [v, desc] of Object.entries(VARIANTS)) {
    const staged = v.includes('staged');
    const entry = staged ? './core.js' : './heavy.js';
    const html = `<!doctype html><html lang=en><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
<title>Loading — ${v}</title>
${v === 'eager' ? '<link rel=modulepreload href="./heavy.js">' : ''}
<style>
body{margin:0;font:16px/1.55 system-ui,sans-serif;color:#1d1d1f;background:#fbfaf7}
header{display:flex;justify-content:space-between;align-items:center;padding:10px 16px;position:sticky;top:0;background:#fbfaf7;z-index:3;border-bottom:1px solid #e6e2da;height:44px;box-sizing:border-box}
#menu{font:inherit;padding:4px 12px;border:1px solid #bbb;border-radius:6px;background:#fff}
#menu-panel{position:fixed;top:44px;right:0;left:0;background:#fff;border-bottom:1px solid #ddd;padding:12px 16px;z-index:2}
#menu-panel[hidden]{display:none}
main{padding:0 16px}
h1{font-size:30px;line-height:1.15;margin:20px 0 8px}
.hero img{width:100%;height:auto;display:block;border-radius:8px;aspect-ratio:3/2}
.cards{display:grid;gap:12px}.card{border:1px solid #e6e2da;border-radius:8px;padding:12px;background:#fff}
#module{position:relative;aspect-ratio:4/3;border-radius:10px;overflow:hidden;background:#20232b;margin:24px 0}
#module img,#module canvas{position:absolute;inset:0;width:100%;height:100%;display:block;object-fit:cover}
#module canvas{touch-action:none}
#start{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font:600 17px system-ui;padding:12px 22px;border-radius:999px;border:0;background:#fff;color:#111;min-width:180px}
#status{position:absolute;left:12px;bottom:10px;margin:0;color:#fff;font-size:13px}
</style></head><body>
<header><strong id=brand>Northwind</strong><button id=menu aria-expanded=false aria-controls=menu-panel>Menu</button></header>
<nav id=menu-panel hidden><a href="#">Products</a> · <a href="#">Pricing</a> · <a href="#">About</a></nav>
<main>
<section class=hero><h1>Design your own in minutes</h1><p>${para}</p>
<img src="hero.avif" width=780 height=520 fetchpriority=high alt="A product photograph"></section>
<section><h2>Why it works</h2><p>${para}</p><div class=cards>${[1, 2, 3].map((i) => `<div class=card><strong>Point ${i}</strong><p>${para.slice(0, 120)}</p></div>`).join('')}</div><p>${para}</p><p>${para}</p></section>
<section><h2>How people use it</h2><p>${para}</p><p>${para}</p><div class=cards>${[4, 5, 6].map((i) => `<div class=card><strong>Story ${i}</strong><p>${para}</p></div>`).join('')}</div></section>
<section id=module aria-label="Interactive configurator"><img id=poster src="poster.avif" width=716 height=537 loading=lazy decoding=async alt="The configurator, showing a finished design"><canvas id=cv hidden></canvas>
<button id=start>Try it live</button><p id=status aria-live=polite></p></section>
<section><h2>Details</h2><p>${para}</p><p>${para}</p><p>${para}</p></section>
</main>
<script type=module>
const V = ${JSON.stringify(v)};
const $ = (s) => document.querySelector(s);
const cv = $('#cv'), start = $('#start'), status = $('#status');
window.__obs = { events: [], long: [], loaf: [], lcp: null, cls: 0 };
const O = window.__obs;
const obs = (type, fn, extra = {}) => { try { new PerformanceObserver((l) => l.getEntries().forEach(fn)).observe({ type, buffered: true, ...extra }); } catch {} };
obs('event', (e) => O.events.push({ name: e.name, id: e.interactionId, start: e.startTime, dur: e.duration, delay: e.processingStart - e.startTime, proc: e.processingEnd - e.processingStart, target: e.target?.id || e.target?.tagName }), { durationThreshold: 16 });
obs('longtask', (e) => O.long.push([e.startTime, e.duration]));
obs('long-animation-frame', (e) => O.loaf.push([e.startTime, e.duration, e.blockingDuration]));
obs('largest-contentful-paint', (e) => { O.lcp = { t: e.startTime, el: e.element?.id || e.element?.tagName }; });
obs('layout-shift', (e) => { if (!e.hadRecentInput) O.cls += e.value; });
obs('paint', (e) => { if (e.name === 'first-contentful-paint') O.fcp = e.startTime; });
$('#menu').addEventListener('click', (e) => { const p = $('#menu-panel'); p.hidden = !p.hidden; e.currentTarget.setAttribute('aria-expanded', String(!p.hidden)); });

let modP = null, ready = false, wantShow = false;
function show() { if (!ready || !wantShow || !cv.hidden) return; cv.hidden = false; $('#poster').hidden = true; start.hidden = true; status.textContent = ''; performance.mark('shown'); }
function load(reason, priority = 'auto') {
  if (modP) return modP;
  performance.mark('mod-request');
  O.reason = reason;
  modP = import(${JSON.stringify(entry)}).then((m) => m.boot(cv, { priority, onProgress: (p) => { if (wantShow) status.textContent = 'Loading ' + Math.round(p * 100) + '%'; } }));
  ${staged ? "const poll = setInterval(() => { if (performance.getEntriesByName('mod-usable').length) { clearInterval(poll); ready = true; show(); } }, 16);" : 'modP.then(() => { ready = true; show(); });'}
  return modP;
}
let warmed = false;
function warm() {
  if (warmed || modP) return; warmed = true; performance.mark('warm');
  const l = document.createElement('link'); l.rel = 'modulepreload'; l.href = ${JSON.stringify(entry)}; document.head.append(l);
  for (const a of ${JSON.stringify(staged ? ['lowres'] : ['a0', 'a1', 'a2', 'a3'])}) fetch('assets/' + a + '.bin', { priority: 'low' }).catch(() => {});
}
start.addEventListener('click', () => { performance.mark('start-click'); wantShow = true; if (!modP) { status.textContent = 'Loading…'; load('click'); } show(); });
if (V === 'eager') load('eager');
if (V === 'visible') new IntersectionObserver((es, io) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); load('visible'); } }).observe($('#module'));
if (V === 'idle') addEventListener('load', () => (window.requestIdleCallback || ((f) => setTimeout(f, 1)))(() => load('idle'), { timeout: 4000 }));
if (V === 'prefetch' || V === 'prefetch-staged') {
  new IntersectionObserver((es, io) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); warm(); } }, { rootMargin: '100% 0px' }).observe($('#module'));
  for (const ev of ['pointerdown', 'focus', 'pointerenter']) start.addEventListener(ev, warm, { once: true });
}
</script></body></html>`;
    await writeText(path.join(dir, `${v}.html`), html);
  }
  const sizes = {};
  for (const f of ['heavy.js', 'core.js', 'rest.js']) {
    const raw = await readFile(path.join(dir, f));
    sizes[f] = { raw: raw.length, gzip: gz(raw).length };
  }
  for (const f of ['hero.avif', 'poster.avif']) sizes[f] = { raw: (await readFile(path.join(dir, f))).length };
  sizes.assets = { full: 4 * 512 * 1024, lowres: 128 * 1024 };
  return { variants: VARIANTS, sizes };
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(await buildLoading(), null, 1));
