// Fixtures for the placeholder and progressive-image experiments.
//  - For every test photo: BlurHash (4×3 and 6×4 components), ThumbHash, a 16 px WebP and AVIF LQIP, the dominant colour.
//  - A page of 24 cards that decodes 24 placeholders of one kind (to time the main-thread cost).
//  - The hero at 1600 px as baseline JPEG, progressive JPEG, WebP and AVIF, for a filmstrip under slow 4G.
import { mkdir, writeFile, readFile, cp } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import sharp from 'sharp';
import * as esbuild from 'esbuild';
import { encode as bhEncode } from 'blurhash';
import { rgbaToThumbHash } from 'thumbhash';
import { here, siteRoot } from './common.mjs';

const SRC = path.join(here, 'captures/src');
const PHOTOS = ['concert.jpg', 'hero.jpg', 'bh1.jpg', 'bh2.jpg', 'bh3.jpg', 'bh4.jpg', 'bh5.jpg', 'bh-wide.jpg'];

export async function buildPlaceholders() {
  const dir = path.join(siteRoot, 'placeholders');
  await mkdir(dir, { recursive: true });
  await cp(path.join(here, 'node_modules/blurhash/dist/esm/index.js'), path.join(siteRoot, 'vendor/blurhash.js'));
  await cp(path.join(here, 'node_modules/thumbhash/thumbhash.js'), path.join(siteRoot, 'vendor/thumbhash.js'));
  const items = [];
  for (const f of PHOTOS) {
    const img = sharp(path.join(SRC, f));
    const meta = await img.metadata();
    const t0 = performance.now();
    const b32 = await sharp(path.join(SRC, f)).resize(32, 32, { fit: 'fill' }).ensureAlpha().raw().toBuffer();
    const bh43 = bhEncode(new Uint8ClampedArray(b32), 32, 32, 4, 3);
    const bh64 = bhEncode(new Uint8ClampedArray(b32), 32, 32, 6, 4);
    const tEncBh = performance.now() - t0;
    const t1 = performance.now();
    const th = await sharp(path.join(SRC, f)).resize(100, 100, { fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const thHash = rgbaToThumbHash(th.info.width, th.info.height, th.data);
    const tEncTh = performance.now() - t1;
    const webp = await sharp(path.join(SRC, f)).resize(16).webp({ quality: 30 }).toBuffer();
    const avif = await sharp(path.join(SRC, f)).resize(16).avif({ quality: 30 }).toBuffer();
    const { dominant } = await sharp(path.join(SRC, f)).stats();
    items.push({
      file: f, w: meta.width, h: meta.height,
      bh43, bh64, th: Buffer.from(thHash).toString('base64'), thBytes: thHash.length,
      webp: 'data:image/webp;base64,' + webp.toString('base64'), webpBytes: webp.length,
      avif: 'data:image/avif;base64,' + avif.toString('base64'), avifBytes: avif.length,
      dominant: '#' + [dominant.r, dominant.g, dominant.b].map((x) => x.toString(16).padStart(2, '0')).join(''),
      encodeMs: { blurhash: +tEncBh.toFixed(1), thumbhash: +tEncTh.toFixed(1) },
    });
  }
  await writeFile(path.join(dir, 'items.json'), JSON.stringify(items));

  // Decoder bundle sizes (what a page ships to draw the placeholder itself).
  const bundle = async (code) => {
    const r = await esbuild.build({ stdin: { contents: code, resolveDir: here, loader: 'js' }, bundle: true, minify: true, format: 'esm', write: false });
    const b = r.outputFiles[0].contents;
    return { min: b.length, gzip: gzipSync(b, { level: 9 }).length };
  };
  const decoders = {
    blurhashDecode: await bundle("import { decode } from 'blurhash'; export { decode };"),
    thumbhashToDataURL: await bundle("import { thumbHashToDataURL } from 'thumbhash'; export { thumbHashToDataURL };"),
    thumbhashToRGBA: await bundle("import { thumbHashToRGBA } from 'thumbhash'; export { thumbHashToRGBA };"),
    comlink: await bundle("export * from 'comlink';"),
    detectGpu: await bundle("export { getGPUTier } from '@pmndrs/detect-gpu';"),
    tierJs: await bundle("export * from './lib/client/tier.js';"),
    governorJs: await bundle("export * from './lib/client/governor.js';"),
  };

  // The 24-card page: ?kind=blurhash|blurhash-dataurl|thumbhash|webp|avif|color
  await writeFile(path.join(dir, 'index.html'), `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width">
<title>placeholders</title><style>body{margin:0;font:14px system-ui}.g{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:6px}
.c{aspect-ratio:4/3;position:relative;overflow:hidden;background:#ddd}.c>*{position:absolute;inset:0;width:100%;height:100%;display:block}</style>
<div class=g id=g></div>
<script type=module>
import { decode } from '/vendor/blurhash.js';
import { thumbHashToDataURL, thumbHashToRGBA } from '/vendor/thumbhash.js';
const kind = new URLSearchParams(location.search).get('kind') || 'color';
const items = await (await fetch('items.json')).json();
await new Promise((r) => setTimeout(r, 300));
const g = document.getElementById('g');
const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const t0 = performance.now();
const imgs = [];
for (let i = 0; i < 24; i++) {
  const it = items[i % items.length];
  const c = document.createElement('div'); c.className = 'c';
  if (kind === 'color') c.style.background = it.dominant;
  else if (kind === 'blurhash' || kind === 'blurhash-6x4') {
    const px = decode(kind === 'blurhash' ? it.bh43 : it.bh64, 32, 32); const cv = document.createElement('canvas'); cv.width = cv.height = 32;
    const ctx = cv.getContext('2d'); const id = ctx.createImageData(32, 32); id.data.set(px); ctx.putImageData(id, 0, 0); c.append(cv);
  } else if (kind === 'blurhash-dataurl') {
    const px = decode(it.bh43, 32, 32); const cv = document.createElement('canvas'); cv.width = cv.height = 32;
    const ctx = cv.getContext('2d'); const id = ctx.createImageData(32, 32); id.data.set(px); ctx.putImageData(id, 0, 0);
    const im = new Image(); im.src = cv.toDataURL(); c.append(im); imgs.push(im);
  } else if (kind === 'thumbhash') { const im = new Image(); im.src = thumbHashToDataURL(b64(it.th)); c.append(im); imgs.push(im); }
  else if (kind === 'thumbhash-canvas') {
    const t = thumbHashToRGBA(b64(it.th)); const cv = document.createElement('canvas'); cv.width = t.w; cv.height = t.h;
    const ctx = cv.getContext('2d'); const id = ctx.createImageData(t.w, t.h); id.data.set(t.rgba); ctx.putImageData(id, 0, 0); c.append(cv);
  } else { const im = new Image(); im.src = kind === 'webp' ? it.webp : it.avif; im.style.filter = 'blur(8px)'; im.style.transform = 'scale(1.1)'; c.append(im); imgs.push(im); }
  g.append(c);
}
const sync = performance.now() - t0;
await Promise.all(imgs.map((im) => im.decode().catch(() => {})));
const decoded = performance.now() - t0;
requestAnimationFrame(() => requestAnimationFrame(() => { window.__r = { sync, decoded, painted: performance.now() - t0 }; }));
</script>`);

  // A visual comparison of one public-domain photo (concert.jpg): original, BlurHash 4×3, BlurHash 6×4, ThumbHash, WebP LQIP, colour.
  const concert = items[0];
  const orig = 'data:image/jpeg;base64,' + (await sharp(path.join(SRC, 'concert.jpg')).resize(400).jpeg({ quality: 80 }).toBuffer()).toString('base64');
  await writeFile(path.join(dir, 'sheet.html'), `<!doctype html><meta charset=utf-8><title>sheet</title>
<style>body{margin:0;background:#fff;font:13px system-ui;color:#222}.row{display:flex;gap:8px;padding:8px}.cell{width:200px}.cell>div{width:200px;height:134px;position:relative;overflow:hidden}
.cell>div>*{position:absolute;inset:0;width:100%;height:100%}.cell p{margin:4px 0 0}</style>
<div class=row id=row></div>
<script type=module>
import { decode } from '/vendor/blurhash.js';
import { thumbHashToDataURL } from '/vendor/thumbhash.js';
const it = ${JSON.stringify(concert)};
const row = document.getElementById('row');
const cell = (label, el) => { const d = document.createElement('div'); d.className = 'cell'; const b = document.createElement('div'); b.append(el); d.append(b); const p = document.createElement('p'); p.textContent = label; d.append(p); row.append(d); };
const img = (src, css = '') => { const i = new Image(); i.src = src; i.style.cssText = 'object-fit:cover;' + css; return i; };
const bh = (h) => { const px = decode(h, 32, 32); const cv = document.createElement('canvas'); cv.width = cv.height = 32; const ctx = cv.getContext('2d'); const id = ctx.createImageData(32, 32); id.data.set(px); ctx.putImageData(id, 0, 0); return cv; };
cell('Original (public domain)', img(${JSON.stringify(orig)}));
cell('BlurHash 4×3 · ' + it.bh43.length + ' chars', bh(it.bh43));
cell('BlurHash 6×4 · ' + it.bh64.length + ' chars', bh(it.bh64));
cell('ThumbHash · ' + it.thBytes + ' bytes', img(thumbHashToDataURL(Uint8Array.from(atob(it.th), (c) => c.charCodeAt(0)))));
cell('WebP 16 px + CSS blur · ' + it.webpBytes + ' bytes', img(it.webp, 'filter:blur(8px);transform:scale(1.1)'));
const d = document.createElement('div'); d.style.background = it.dominant; cell('Dominant colour · ' + it.dominant, d);
</script>`);

  // Progressive-image filmstrip fixtures: the hero at 1600 px in four encodings of similar visual quality.
  const hero = sharp(path.join(SRC, 'hero.jpg')).resize(1600);
  const enc = {
    'jpeg-baseline': await hero.clone().jpeg({ quality: 78, progressive: false, mozjpeg: false }).toBuffer(),
    'jpeg-progressive': await hero.clone().jpeg({ quality: 78, progressive: true, mozjpeg: true }).toBuffer(),
    webp: await hero.clone().webp({ quality: 75 }).toBuffer(),
    avif: await hero.clone().avif({ quality: 55, effort: 4 }).toBuffer(),
  };
  const ext = { 'jpeg-baseline': 'jpg', 'jpeg-progressive': 'jpg', webp: 'webp', avif: 'avif' };
  const prog = {};
  for (const [k, b] of Object.entries(enc)) {
    await writeFile(path.join(dir, `hero-${k}.${ext[k]}`), b);
    prog[k] = b.length;
    await writeFile(path.join(dir, `hero-${k}.html`), `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width"><title>${k}</title>
<style>body{margin:0;background:#fff}img{display:block;width:100%;height:auto}</style>
<img src="hero-${k}.${ext[k]}" width=1600 height=${Math.round(1600 * 2225 / 2725)} fetchpriority=high alt="">
<script>new PerformanceObserver((l)=>l.getEntries().forEach((e)=>{window.__lcp=e.startTime})).observe({type:'largest-contentful-paint',buffered:true});</script>`);
  }
  return { items: items.map(({ webp, avif, ...rest }) => ({ ...rest, webpUriChars: webp.length, avifUriChars: avif.length })), decoders, progressive: prog };
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(await buildPlaceholders(), null, 1));
