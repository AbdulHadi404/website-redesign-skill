/**
 * The "control first" rule on real pages: the same page captured twice, each capture in its own browser launch
 * (same binary, same flags). Two stabilisation recipes:
 *   once    as the report first proposed and capture-set.mjs's "stable" mode does: after load, finite animations
 *           finished, infinite ones rewound to t=0 and paused, caret hidden, [data-dynamic] covered, fonts and images
 *           ready; then 300 ms and the screenshot
 *   strict  the same, plus transitions switched off (transition: none) and the finishing repeated right before the
 *           screenshot, so a transition or animation that starts after the first pass cannot be caught half-way
 * Differences at threshold 0 and 0.1, and the changed regions (8 px clusters), per page × width × repeat × recipe.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { launchWith, BASE_ARGS } from '../lib/browser.mjs';
import { regions } from './engines.mjs';

const STABLE_CSS = '*,*::before,*::after{animation-play-state:paused!important;caret-color:transparent!important}';
const STRICT_CSS = '*,*::before,*::after{transition:none!important}';
const finish = () => { for (const a of document.getAnimations()) { try { if (a.effect.getComputedTiming().iterations === Infinity) { a.pause(); a.currentTime = 0; } else a.finish(); } catch {} } };
const cover = () => { for (const el of document.querySelectorAll('[data-dynamic]')) { const r = el.getBoundingClientRect(); const m = document.createElement('div'); m.style.cssText = `position:absolute;left:${r.left + scrollX}px;top:${r.top + scrollY}px;width:${r.width}px;height:${r.height}px;background:#ff00ff;z-index:2147483647`; document.body.append(m); } };
const WIDTHS = [{ width: 1280, height: 800, dpr: 1 }, { width: 390, height: 844, dpr: 2, mobile: true }];

async function shoot(url, w, recipe) {
  const b = await launchWith(BASE_ARGS);
  try {
    const ctx = await b.newContext({ viewport: { width: w.width, height: w.height }, deviceScaleFactor: w.dpr, isMobile: !!w.mobile, hasTouch: !!w.mobile });
    const p = await ctx.newPage();
    await p.goto(url, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    await p.evaluate(async () => { await Promise.all([...document.images].map((i) => i.decode().catch(() => {}))); });
    await p.addStyleTag({ content: STABLE_CSS + (recipe === 'strict' ? STRICT_CSS : '') });
    await p.evaluate(finish);
    await p.evaluate(cover);
    await p.waitForTimeout(300);
    if (recipe === 'strict') await p.evaluate(finish);
    return PNG.sync.read(await p.screenshot({ fullPage: true }));
  } finally { await b.close(); }
}

export async function runControl(pages, outDir, { repeats = 3, recipes = ['once', 'strict'] } = {}) {
  await mkdir(outDir, { recursive: true });
  const rows = [];
  for (const recipe of recipes) for (const [name, url] of pages) for (const w of WIDTHS) for (let k = 0; k < repeats; k++) {
    const A = await shoot(url, w, recipe), B = await shoot(url, w, recipe);
    const ww = Math.min(A.width, B.width), hh = Math.min(A.height, B.height);
    const crop = (img) => { const o = new PNG({ width: ww, height: hh }); PNG.bitblt(img, o, 0, 0, ww, hh, 0, 0); return o; };
    const out = new PNG({ width: ww, height: hh });
    const t0 = pixelmatch(crop(A).data, crop(B).data, out.data, ww, hh, { threshold: 0, diffMask: true });
    const t01 = pixelmatch(crop(A).data, crop(B).data, null, ww, hh, { threshold: 0.1 });
    const boxes = t0 ? regions(out, ww, hh) : [];
    if (t0) await writeFile(path.join(outDir, `${recipe}-${name}-${w.width}-${k + 1}-diff.png`), PNG.sync.write(out));
    rows.push({ recipe, page: name, width: w.width, repeat: k + 1, sizeA: `${A.width}x${A.height}`, sizeB: `${B.width}x${B.height}`, t0, t01, regions: boxes.length, boxes: boxes.slice(0, 4) });
  }
  const sum = (rs) => ({ pairs: rs.length, zeroAtT0: rs.filter((r) => r.t0 === 0 && r.sizeA === r.sizeB).length, under10pxAtT0: rs.filter((r) => r.t0 > 0 && r.t0 < 10).length,
    zeroAtT01: rs.filter((r) => r.t01 === 0 && r.sizeA === r.sizeB).length, maxT0: Math.max(...rs.map((r) => r.t0)), sizeChanged: rs.filter((r) => r.sizeA !== r.sizeB).length,
    nonZero: rs.filter((r) => r.t0 || r.sizeA !== r.sizeB).map((r) => `${r.page}@${r.width}#${r.repeat}: ${r.t0} px (${r.t01} at t0.1), ${r.regions} region(s)`) });
  return { byRecipe: Object.fromEntries(recipes.map((x) => [x, sum(rows.filter((r) => r.recipe === x))])), rows };
}
