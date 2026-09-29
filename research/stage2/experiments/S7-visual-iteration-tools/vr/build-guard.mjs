/**
 * Prototype for the capture.mjs / compare.mjs request: every capture records what rendered it in a sidecar
 * (<file>.build.json), and the diff refuses to compare two captures whose builds differ.
 *
 *   captureWithSidecar(browser, page, file)   screenshot + sidecar
 *   guardedDiff(a, b, { threshold })          { refused, why } or { px, regions } (pixelmatch, 8 px clusters)
 *   runGuard(base, outDir)                    the test: the vr fixture captured by full Chromium twice, by the
 *                                             headless shell once, and with a display-P3 profile once; what
 *                                             browser.version() says for each, and what the guard does.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { launchWith, BASE_ARGS, shellPath } from '../lib/browser.mjs';
import { browserBuild } from '../../../../../skills/website-redesign/scripts/sweep.mjs';
import { regions } from './engines.mjs';

export async function captureWithSidecar(browser, page, file) {
  await page.screenshot({ path: file, fullPage: true });
  const build = await browserBuild(browser);
  const vp = page.viewportSize();
  const dpr = await page.evaluate(() => devicePixelRatio);
  await writeFile(`${file}.build.json`, JSON.stringify({ ...build, version: browser.version(), viewport: vp, dpr }, null, 1));
}

const same = (x, y) => JSON.stringify([x.product, x.revision, x.executable, x.flags, x.platform, x.dpr]) === JSON.stringify([y.product, y.revision, y.executable, y.flags, y.platform, y.dpr]);

export async function guardedDiff(a, b, { threshold = 0 } = {}) {
  const [sa, sb] = await Promise.all([a, b].map((f) => readFile(`${f}.build.json`, 'utf8').then(JSON.parse).catch(() => null)));
  if (!sa || !sb) return { refused: true, why: 'no build sidecar: re-capture both with the same build' };
  if (!same(sa, sb)) {
    const diffs = ['product', 'revision', 'executable', 'flags', 'platform', 'dpr'].filter((k) => JSON.stringify(sa[k]) !== JSON.stringify(sb[k])).map((k) => `${k}: ${JSON.stringify(sa[k])} ≠ ${JSON.stringify(sb[k])}`);
    return { refused: true, why: `different builds — ${diffs.join('; ')}`, sameVersionString: sa.version === sb.version };
  }
  const [A, B] = [PNG.sync.read(await readFile(a)), PNG.sync.read(await readFile(b))];
  const w = Math.min(A.width, B.width), h = Math.min(A.height, B.height);
  const crop = (img) => { const o = new PNG({ width: w, height: h }); PNG.bitblt(img, o, 0, 0, w, h, 0, 0); return o; };
  const out = new PNG({ width: w, height: h });
  const px = pixelmatch(crop(A).data, crop(B).data, out.data, w, h, { threshold, diffMask: true });
  return { refused: false, px, sizeDiff: A.width !== B.width || A.height !== B.height, regions: regions(out, w, h).slice(0, 8) };
}

const STABLE_CSS = '*,*::before,*::after{animation-play-state:paused!important;caret-color:transparent!important}';
async function stableShot(browser, url, file, { width = 1280, height = 800, dpr = 1 } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: STABLE_CSS });
  await page.evaluate(() => { for (const a of document.getAnimations()) { try { if (a.effect.getComputedTiming().iterations === Infinity) { a.pause(); a.currentTime = 0; } else a.finish(); } catch {} } });
  await page.evaluate(() => { for (const el of document.querySelectorAll('[data-dynamic]')) { const r = el.getBoundingClientRect(); const m = document.createElement('div'); m.style.cssText = `position:absolute;left:${r.left + scrollX}px;top:${r.top + scrollY}px;width:${r.width}px;height:${r.height}px;background:#ff00ff;z-index:2147483647`; document.body.append(m); } });
  await captureWithSidecar(browser, page, file);
  await ctx.close();
}

export async function runGuard(base, outDir) {
  await mkdir(outDir, { recursive: true });
  const url = `${base}/fixtures/vr/index.html`;
  const f = (n) => path.join(outDir, `${n}.png`);
  const runs = [['baseline', BASE_ARGS, undefined], ['rerender', BASE_ARGS, undefined], ['shell', BASE_ARGS, shellPath()], ['p3', [...BASE_ARGS, '--force-color-profile=display-p3-d65'], undefined]];
  const versions = {};
  for (const [name, args, exe] of runs) {
    const b = await launchWith(args, exe);
    try { await stableShot(b, url, f(name)); versions[name] = { version: b.version(), ...(await browserBuild(b)) }; } finally { await b.close(); }
  }
  const out = { versions, pairs: {} };
  for (const n of ['rerender', 'shell', 'p3']) {
    const g = await guardedDiff(f('baseline'), f(n));
    // What an unguarded diff would have said (the same pair, pixelmatch t0.1 as compare.mjs calls it).
    const [A, B] = [PNG.sync.read(await readFile(f('baseline'))), PNG.sync.read(await readFile(f(n)))];
    const w = Math.min(A.width, B.width), h = Math.min(A.height, B.height);
    const crop = (img) => { const o = new PNG({ width: w, height: h }); PNG.bitblt(img, o, 0, 0, w, h, 0, 0); return o; };
    const unguarded = pixelmatch(crop(A).data, crop(B).data, null, w, h, { threshold: 0.1 });
    out.pairs[`baseline vs ${n}`] = { ...g, regions: g.regions?.length, unguardedPxT01: unguarded };
  }
  return out;
}
