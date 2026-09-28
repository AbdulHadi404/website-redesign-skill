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
 *   node compare.mjs --grid new.png old.png references/ledger/*.jpg --labels New Old --blur 6   # label your own panels only
 *
 * --labels  captions, paired with the files by position in the order the files arrive (a shell glob sorts
 *           by name, not in the order you had in mind). Several arguments are several labels, commas and
 *           all; a single argument lists them with commas, except on a one-file grid, where it is the
 *           whole caption. Fewer labels than files is fine: the rest keep their default caption (the file
 *           name; Before / After for a pair), and an empty label or "-" keeps it for one panel
 *           (--labels New - Azul). More labels than files is an error. So is a label that names another
 *           file of the sheet better than its own ("sanad" on azul-home.jpg beside sanad-dashboard.jpg):
 *           the run stops with the order it most likely meant; --labels-as-given draws them as typed.
 *           Every sheet prints its file -> caption pairing. A --dir sheet takes at most two labels, its
 *           before and after captions, used on every sheet.
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
const fail = (msg) => { console.error(msg); process.exit(1); };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const shellWord = (s) => (/^[\w.:/@+=-]+$/.test(s) ? s : `"${s.replace(/(["\\$`])/g, '\\$1')}"`);

// The captions typed after --labels, by position; null keeps that panel's default caption ("" or "-").
// Several arguments are several labels, commas and all; a single argument lists them with commas (not
// inside parentheses), unless there is only one panel, where splitting could only break the caption.
const splitLabels = (v, panels) => !Array.isArray(v) && panels > 1 && /,(?![^(]*\))/.test(String(v));
function typedLabels(panels) {
  const v = a.labels;
  if (v === undefined || v === true) return [];
  const list = (Array.isArray(v) ? v : splitLabels(v, panels) ? String(v).split(/,(?![^(]*\))/) : [v])
    .map((x) => String(x).trim()).map((x) => (x === '' || x === '-' ? null : x));
  while (list.length && list.at(-1) === null) list.pop();
  return list;
}

// Labels pair with files by position and a shell glob picks the file order, so a list typed in the order you
// had in mind names the wrong panels, and nothing on the sheet says so. Most such captions name another file
// of the same sheet: compare each typed label's words with every file's name (and folder), and stop when it
// matches another file better than its own. Words are runs of two or more letters or digits; a word matches
// a file-name word exactly, or as a prefix of four letters or more ("dash" ~ "dashboard").
const words = (s) => String(s).toLowerCase().normalize('NFKC').split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 1);
const lettered = (w) => /\p{L}/u.test(w);
const alike = (x, y) => x === y || (lettered(x) && lettered(y) && Math.min(x.length, y.length) >= 4 && (x.startsWith(y) || y.startsWith(x)));
function misnamed(files, typed) {
  const names = files.map((f) => words(`${path.basename(path.dirname(path.resolve(f)))} ${path.basename(f).replace(/\.[^.]+$/, '')}`));
  const flagged = new Map(); // label index -> the file indices it names better than its own
  const at = new Array(files.length).fill(null);
  let clean = true;
  typed.forEach((l, i) => {
    if (l == null) return;
    const lw = [...new Set(words(l))];
    const score = names.map((n) => lw.filter((w) => n.some((x) => alike(w, x))).length);
    const top = Math.max(...score);
    const tops = score.flatMap((s, j) => (s === top ? [j] : []));
    if (top > score[i]) flagged.set(i, tops);
    // The order that was probably meant: a flagged label moves to the one file it names best; the others stay
    // where they were typed. No suggestion when a label names two files equally or two labels want one panel.
    const j = top > score[i] ? (tops.length === 1 ? tops[0] : -1) : i;
    if (j < 0 || at[j] != null) clean = false; else at[j] = l;
  });
  if (!flagged.size) return null;
  const order = clean ? at.map((l) => l ?? '-') : null;
  while (order?.at(-1) === '-') order.pop();
  return { flagged, order };
}

// Every panel's caption, and the file -> caption lines to print; stops on a list that cannot be what was meant.
function captionsFor(files, defaults, typed = typedLabels(files.length)) {
  const caps = files.map((f, i) => typed[i] ?? defaults[i]);
  const mixed = typed.some((l) => l != null);
  const pairing = (note = () => '') => files.map((f, i) => `  ${f} -> ${caps[i]}${mixed && typed[i] == null ? '  (default)' : ''}${note(i)}`).join('\n');
  if (typed.length > files.length) {
    const split = splitLabels(a.labels, files.length) ? '\nA single --labels argument is split at commas: give a caption that contains a comma as its own argument (--labels "Permit, new" -).' : '';
    const byName = defaults.every((d, i) => d === path.basename(files[i]));
    fail(`--labels gives ${typed.length} label(s) for ${files.length} file(s). They pair by position, in this file order:\n${pairing()}\n  (unused: ${typed.slice(files.length).map((l) => l ?? '-').join(', ')})${split}\nGive at most one label per file, in that order, or leave out --labels to caption each panel with ${byName ? 'its file name' : defaults.join(' / ')}.`);
  }
  const bad = a['labels-as-given'] ? null : misnamed(files, typed);
  if (bad) {
    const name = (j) => (files.filter((f) => path.basename(f) === path.basename(files[j])).length > 1 ? files[j] : path.basename(files[j]));
    const glob = defaults.every((d, i) => d === path.basename(files[i])) ? ' (a shell glob sorts by name)' : '';
    fail(`--labels: ${bad.flagged.size} label(s) name a different file of this sheet than the one they caption. Labels pair with files by position, in this file order${glob}:\n${pairing((i) => (bad.flagged.has(i) ? `   ✗ names ${bad.flagged.get(i).map(name).join(' or ')}` : ''))}\n${bad.order
      ? `In this file order the labels read:\n  --labels ${bad.order.map(shellWord).join(' ')}\nRe-run with that list`
      : 'Give the labels in the file order above'} ("-" keeps a panel's default caption), or add --labels-as-given if the captions are meant as typed.`);
  }
  return { caps, pairing: pairing() };
}

async function mustBeFiles(files) {
  const missing = [];
  for (const f of files) if (!(await stat(f).catch(() => null))?.isFile()) missing.push(f);
  if (missing.length) fail(`Not found, or not a file: ${missing.join(', ')}${missing.some((f) => /[*?[{]/.test(f)) ? '\n(a pattern that reaches the script unexpanded matched no file)' : ''}`);
}

async function sheet(files, labels, out) {
  const imgs = await Promise.all(files.map(async (f) => `data:image/png;base64,${(await readFile(f)).toString('base64')}`));
  const { browser } = await launch({ chrome: a.chrome });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const cols = files.length;
  await page.setContent(`<!doctype html><html><body style="margin:0;background:#e9e9e7;font:600 15px/1.3 system-ui,sans-serif;color:#222">
    <div id="g" style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:24px;padding:24px;align-items:start;width:${Math.min(cols * 900, 2700)}px">
    ${imgs.map((src, i) => `<figure style="margin:0"><figcaption style="margin:0 0 10px">${esc(labels[i] ?? path.basename(files[i]))}</figcaption>
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
  if (!files.length) fail('--grid needs the image files to lay out: --grid a.png b.png [--labels x y]');
  await mustBeFiles(files);
  const { caps, pairing } = captionsFor(files, files.map((f) => path.basename(f)));
  console.log(pairing);
  await sheet(files, caps, a.out || 'sheet.png');
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
  const pairs = olds.flatMap((f) => (byKey.has(key(f)) ? [[f, byKey.get(key(f))]] : []));
  if (!pairs.length) { console.error(`No before/after pairs found (${olds.length} before, ${news.length} after). Name captures with --label before / --label after in one folder, or put them in before/ and after/ with the same file names.`); process.exit(1); }
  // Every sheet here has the same two panels, so --labels names their captions once; check them all before drawing.
  const typed = typedLabels(2);
  if (typed.length > 2) fail(`--labels gives ${typed.length} label(s), but every folder sheet has two panels: the before and the after capture of one page. Give those two captions (--labels Old New), or leave out --labels for Before / After.`);
  const sheets = pairs.map(([f, g]) => ({ files: [f, g], out: path.join(outDir, key(f)), ...captionsFor([f, g], ['Before', 'After'], typed) }));
  for (const s of sheets) { console.log(s.pairing); await sheet(s.files, s.caps, s.out); }
  console.log(`${pairs.length} before/after sheet(s) in ${outDir}`);
} else if (a.before && a.after) {
  const files = [String(a.before), String(a.after)];
  await mustBeFiles(files);
  // Check the labels before anything is written, so a refused run leaves no half of its output behind.
  const drawSheet = a.out || !a.diff;
  const shown = drawSheet ? captionsFor(files, ['Before', 'After']) : null;
  if (!drawSheet && a.labels !== undefined) console.error('--labels unused: --diff alone draws no sheet (add --out for one).');
  if (a.diff) await diff(files[0], files[1], a.diff);
  if (drawSheet) { console.log(shown.pairing); await sheet(files, shown.caps, a.out || 'compare.png'); }
} else {
  console.error('Usage: --before a.png --after b.png [--out sheet.png] [--diff diff.png] | --dir captures | --grid a.png b.png [--labels x y] (by position; fewer is fine, "-" keeps a file name; --labels-as-given skips the name check)');
  process.exit(1);
}
