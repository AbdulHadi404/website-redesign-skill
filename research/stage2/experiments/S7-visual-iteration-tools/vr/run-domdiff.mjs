/**
 * Structural diff on the same fixture variants as the pixel engines, plus pixel regions mapped to the element
 * that owns them (what an agent needs: a name to grep for, not a red smear).
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { launchWith, BASE_ARGS, shellPath } from '../lib/browser.mjs';
import { snapshot, diff } from './domdiff.mjs';
import { VARIANTS, TRUTH, WIDTHS } from './capture-set.mjs';
import { regions } from './engines.mjs';

const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const FREEZE = '*,*::before,*::after{animation-play-state:paused!important;caret-color:transparent!important}';

async function load(browser, url, w) {
  const ctx = await browser.newContext({ viewport: { width: w.width, height: w.height }, deviceScaleFactor: w.dpr, isMobile: !!w.mobile, hasTouch: !!w.mobile });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: FREEZE });
  await page.evaluate(() => { for (const a of document.getAnimations()) { try { a.pause(); a.currentTime = 0; } catch {} } });
  return { ctx, page };
}

/** Which element owns each changed region: the smallest visible element whose box contains the region's centre. */
function owners(boxes) {
  const els = [...document.body.querySelectorAll('*')].filter((e) => !/^(SCRIPT|STYLE)$/.test(e.tagName));
  const name = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + [...el.classList].slice(0, 2).map((c) => '.' + c).join('');
  return boxes.map((b) => {
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    let best = null, area = Infinity;
    for (const e of els) {
      const r = e.getBoundingClientRect(); const x = r.left + scrollX, y = r.top + scrollY;
      if (r.width < 1 || r.height < 1 || cx < x || cx > x + r.width || cy < y || cy > y + r.height) continue;
      if (r.width * r.height < area) { area = r.width * r.height; best = e; }
    }
    return { ...b, owner: best ? name(best) : null };
  });
}

export async function runDomDiff(base, capRoot) {
  const normal = await launchWith(BASE_ARGS);
  const shell = await launchWith(BASE_ARGS, shellPath());
  const p3 = await launchWith([...BASE_ARGS, '--force-color-profile=display-p3-d65']);
  const browserFor = (v) => (v === 'binary' ? shell : v === 'p3' ? p3 : normal);
  const url = (v) => `${base}/fixtures/vr/index.html${['baseline', 'control', 'binary', 'p3'].includes(v) ? '' : `?v=${v}`}`;
  const rows = [];
  try {
    for (const w of WIDTHS) {
      const A = await load(normal, url('baseline'), w);
      const snapA = await A.page.evaluate(snapshot, {});
      await A.ctx.close();
      for (const v of VARIANTS) {
        const B = await load(browserFor(v), url(v), w);
        const times = [];
        let d;
        for (let i = 0; i < (v === 'colour' ? 5 : 1); i++) {
          const t0 = performance.now();
          const snapB = await B.page.evaluate(snapshot, {});
          d = diff(snapA, snapB);
          times.push(performance.now() - t0);
        }
        // Pixel regions (stable captures) mapped to elements in the variant page.
        const dir = path.join(capRoot, 'stable', String(w.width));
        const [PA, PB] = [PNG.sync.read(await readFile(path.join(dir, 'baseline.png'))), PNG.sync.read(await readFile(path.join(dir, `${v}.png`)))];
        const W = Math.min(PA.width, PB.width), H = Math.min(PA.height, PB.height);
        const crop = (img) => { const o = new PNG({ width: W, height: H }); PNG.bitblt(img, o, 0, 0, W, H, 0, 0); return o; };
        const out = new PNG({ width: W, height: H });
        pixelmatch(crop(PA).data, crop(PB).data, out.data, W, H, { threshold: 0.1, diffMask: true });
        const boxes = regions(out, W, H).slice(0, 5).map((b) => ({ x: b.x / w.dpr, y: b.y / w.dpr, w: b.w / w.dpr, h: b.h / w.dpr, px: b.px }));
        const owned = await B.page.evaluate(owners, boxes);
        await B.ctx.close();
        rows.push({ variant: v, width: w.width, regression: TRUTH[v], changed: d.changed, counts: d.counts, lines: d.lines, ms: v === 'colour' ? Math.round(median(times)) : null,
          pixelRegions: owned.map((b) => `${Math.round(b.w)}×${Math.round(b.h)} at (${Math.round(b.x)},${Math.round(b.y)}) → ${b.owner}`) });
      }
    }
  } finally { await normal.close(); await shell.close(); await p3.close(); }
  return rows;
}
