#!/usr/bin/env node
/**
 * Before/after sheets for the critique and the report, and pixel diffs for
 * regressions while iterating.
 *
 *   node compare.mjs --before caps/home-1440-before-fold.png --after caps/home-1440-after-fold.png --out cmp/home-1440.png
 *   node compare.mjs --dir captures            # pairs every *-before*.png with its *-after*.png
 *   node compare.mjs --before a.png --after b.png --diff cmp/diff.png   # changed pixels in red
 *   node compare.mjs --grid a.png b.png c.png --labels old new ref --out sheet.png [--blur 6]
 *
 * --blur N  blurs every panel by N px: the squint test. What still reads when
 *           detail is gone is the hierarchy you actually shipped; two blurred
 *           panels that look alike are the same design.
 * Sheets are drawn by the browser (no native image dependency). Diffs need
 * pixelmatch + pngjs (`npm install` in this folder); a diff is only useful
 * between captures of the same page at the same width — a regression check,
 * not a way to judge a redesign.
 */
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs, asList, launch, importModule } from './lib/env.mjs';

const a = parseArgs();
const blur = Number(a.blur) || 0;

async function sheet(files, labels, out) {
  const imgs = await Promise.all(files.map(async (f) => `data:image/png;base64,${(await readFile(f)).toString('base64')}`));
  const { browser } = await launch({ chrome: a.chrome });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const cols = files.length;
  await page.setContent(`<!doctype html><html><body style="margin:0;background:#e9e9e7;font:600 15px/1.3 system-ui,sans-serif;color:#222">
    <div id="g" style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:24px;padding:24px;align-items:start;width:${Math.min(cols * 900, 2700)}px">
    ${imgs.map((src, i) => `<figure style="margin:0"><figcaption style="margin:0 0 10px">${labels[i] ?? path.basename(files[i])}</figcaption>
      <img src="${src}" style="width:100%;display:block;box-shadow:0 0 0 1px #0002;${blur ? `filter:blur(${blur}px)` : ''}"></figure>`).join('')}
    </div></body></html>`);
  await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode())));
  const g = await page.$('#g');
  const box = await g.boundingBox();
  await page.setViewportSize({ width: Math.ceil(box.width), height: Math.min(Math.ceil(box.height), 16000) });
  await mkdir(path.dirname(out), { recursive: true });
  await g.screenshot({ path: out });
  await browser.close();
  console.log(out);
}

async function diff(before, after, out) {
  const PNG = (await importModule('pngjs'))?.PNG;
  let pixelmatch = await importModule('pixelmatch');
  if (pixelmatch && typeof pixelmatch !== 'function') pixelmatch = pixelmatch.default;
  if (!PNG || !pixelmatch) { console.error('pixelmatch/pngjs not found — run `npm install` in the scripts folder.'); process.exit(1); }
  const A = PNG.sync.read(await readFile(before)), B = PNG.sync.read(await readFile(after));
  const w = Math.min(A.width, B.width), h = Math.min(A.height, B.height);
  const crop = (img) => { const o = new PNG({ width: w, height: h }); PNG.bitblt(img, o, 0, 0, w, h, 0, 0); return o; };
  const o = new PNG({ width: w, height: h });
  const n = pixelmatch(crop(A).data, crop(B).data, o.data, w, h, { threshold: 0.1 });
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, PNG.sync.write(o));
  const sizeNote = A.width !== B.width || A.height !== B.height ? ` (sizes differ: ${A.width}×${A.height} vs ${B.width}×${B.height}; compared the overlap)` : '';
  console.log(`${out}: ${n} pixels differ (${((n / (w * h)) * 100).toFixed(2)}%)${sizeNote}`);
}

if (a.grid) {
  const files = asList(a.grid);
  await sheet(files, asList(a.labels), a.out || 'sheet.png');
} else if (a.dir) {
  const dir = String(a.dir);
  const files = await readdir(dir);
  const outDir = a.out || path.join(dir, 'compare');
  for (const f of files.filter((x) => /-before(-fold)?\.png$/.test(x))) {
    const g = f.replace('-before', '-after');
    if (!files.includes(g)) continue;
    await sheet([path.join(dir, f), path.join(dir, g)], ['Before', 'After'], path.join(outDir, f.replace('-before', '')));
  }
} else if (a.before && a.after) {
  if (a.diff) await diff(a.before, a.after, a.diff);
  if (a.out || !a.diff) await sheet([a.before, a.after], asList(a.labels, ['Before', 'After']), a.out || 'compare.png');
} else {
  console.error('Usage: --before a.png --after b.png [--out sheet.png] [--diff diff.png] | --dir captures | --grid a.png b.png --labels x y');
  process.exit(1);
}
