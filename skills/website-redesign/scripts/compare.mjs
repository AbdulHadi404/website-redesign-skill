#!/usr/bin/env node
/**
 * Before/after sheets for the critique and the report, and pixel diffs for
 * regressions while iterating.
 *
 *   node compare.mjs --before caps/home-1440-before-fold.png --after caps/home-1440-after-fold.png --out cmp/home-1440.png
 *   node compare.mjs --dir captures            # pairs *-before*.png with *-after*.png, or before/ with after/
 *   node compare.mjs --before captures/old --after captures/new --out cmp   # two folders, same file names
 *   node compare.mjs --before a.png --after b.png --diff cmp/diff.png   # changed pixels in red
 *   node compare.mjs --grid a.png b.png c.png --labels old new ref --out sheet.png [--blur 6]
 *   node compare.mjs --grid new.png references/ledger/*.jpg --blur 6   # no --labels: each panel is captioned with its file name
 *
 * --labels  one per file, paired by position in the order the files arrive (a shell glob sorts by name,
 *           not in the order you had in mind). A count that differs from the file count is an error;
 *           every run prints the file -> label pairing it drew.
 * --blur N  blurs every panel by N px: the squint test. What still reads when
 *           detail is gone is the hierarchy you actually shipped; two blurred
 *           panels that look alike are the same design.
 * Sheets are drawn by the browser (no native image dependency). Diffs need
 * pixelmatch + pngjs (`npm install` in this folder); a diff is only useful
 * between captures of the same page at the same width — a regression check,
 * not a way to judge a redesign.
 */
import { readFile, writeFile, readdir, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs, asList, launch, importModule } from './lib/env.mjs';

const a = parseArgs();
const blur = Number(a.blur) || 0;
// Several --labels arguments are several labels, commas and all; a single argument may list them with commas.
const labelList = (v, def = []) => (Array.isArray(v) ? v : v && v !== true ? asList(v) : def);
// Labels pair with files by position and a shell glob picks the file order, so a list of the wrong length
// (or in a guessed order) silently names the wrong panel: refuse a count mismatch, and print the pairing.
function labelsFor(files, def = files.map((f) => path.basename(f))) {
  const labels = labelList(a.labels, def);
  const pairs = files.map((f, i) => `  ${f} -> ${labels[i] ?? '(no label)'}`).join('\n');
  if (labels.length !== files.length) {
    console.error(`--labels gives ${labels.length} label(s) for ${files.length} file(s). They pair by position, in this file order:\n${pairs}${labels.length > files.length ? `\n  (unused: ${labels.slice(files.length).join(', ')})` : ''}\nGive one label per file in that order, or leave out --labels to caption each panel with its file name.`);
    process.exit(1);
  }
  console.log(pairs);
  return labels;
}

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
  await sheet(files, labelsFor(files), a.out || 'sheet.png');
} else if (a.dir || (a.before && a.after && (await stat(String(a.before)).catch(() => null))?.isDirectory())) {
  // Pairs by name with the -before/-after label removed, from one folder (the --label convention), from
  // before/ and after/ subfolders, or from --before <dir> --after <dir>.
  const dir = String(a.dir || '.');
  const pngs = async (d) => (await readdir(d).catch(() => [])).filter((x) => x.endsWith('.png')).map((x) => path.join(d, x));
  let olds, news;
  if (a.before && a.after) [olds, news] = [await pngs(String(a.before)), await pngs(String(a.after))];
  else if ((await stat(path.join(dir, 'before')).catch(() => null))?.isDirectory()) [olds, news] = [await pngs(path.join(dir, 'before')), await pngs(path.join(dir, 'after'))];
  else { const all = await pngs(dir); [olds, news] = [all.filter((f) => /-before(?=[-.])/.test(path.basename(f))), all.filter((f) => /-after(?=[-.])/.test(path.basename(f)))]; }
  const key = (f) => path.basename(f).replace(/-(before|after)(?=[-.])/, '');
  const byKey = new Map(news.map((f) => [key(f), f]));
  const outDir = a.out || path.join(dir, 'compare');
  let n = 0;
  for (const f of olds) { const g = byKey.get(key(f)); if (!g) continue; await sheet([f, g], ['Before', 'After'], path.join(outDir, key(f))); n++; }
  if (!n) { console.error(`No before/after pairs found (${olds.length} before, ${news.length} after). Name captures with --label before / --label after in one folder, or put them in before/ and after/ with the same file names.`); process.exit(1); }
  console.log(`${n} before/after sheet(s) in ${outDir}`);
} else if (a.before && a.after) {
  if (a.diff) await diff(a.before, a.after, a.diff);
  if (a.out || !a.diff) await sheet([a.before, a.after], labelsFor([a.before, a.after], ['Before', 'After']), a.out || 'compare.png');
} else {
  console.error('Usage: --before a.png --after b.png [--out sheet.png] [--diff diff.png] | --dir captures | --grid a.png b.png [--labels x y] (one label per file; default: file names)');
  process.exit(1);
}
