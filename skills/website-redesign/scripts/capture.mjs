#!/usr/bin/env node
/**
 * Full-page and first-viewport captures of a running site at several widths.
 *
 *   node capture.mjs --base http://localhost:3000 --paths / /pricing \
 *        --widths 1440,1280,1024,768,390 --out ./captures [--label after]
 *
 * Options
 *   --widths       comma list (default 1440,1280,1024,768,390); widths < 768 use
 *                  mobile emulation (touch, mobile UA, DPR 2 unless --dpr)
 *   --height       first-viewport height (default 900 desktop / 844 phone)
 *   --dpr          device scale factor (default 1 desktop, 2 phone)
 *   --label        suffix for file names, e.g. "before" / "after"
 *   --reduced-motion   capture with prefers-reduced-motion: reduce
 *   --dark         capture with prefers-color-scheme: dark
 *   --no-js        capture with JavaScript disabled (shows what fails without it)
 *   --element sel  also capture each element matching the selector(s) at DPR 3
 *                  (use for drawn artwork, diagrams, product fragments)
 *   --variant v    extra full captures for the critique's removal tests:
 *                  no-text (all text transparent), no-images (images, video,
 *                  background images hidden), no-shadows (box/text shadows off);
 *                  comma list or "all"
 *   --mode m       grow (default) or fullpage — see below
 *   --chrome path  Chromium binary (or CHROME_PATH)
 *
 * Why it works the way it does (each of these was a real failure):
 * - In some environments `fullPage: true` does not rasterise images that were
 *   never composited in the viewport: grey boxes while the DOM says they
 *   loaded. So by default the viewport is grown to the document height and
 *   every bitmap is awaited with img.decode() before the shot (--mode grow).
 *   In others (Chromium 141 here) plain fullPage paints them correctly; use
 *   --mode fullpage if growing misbehaves on a page.
 * - Growing the viewport makes `100vh`/`svh` sections balloon (a hero with
 *   min-height: 100vh becomes as tall as the page). So heights are recorded at
 *   the normal viewport, and anything that changes when the viewport grows is
 *   pinned back, until the document height is stable.
 * - Scroll reveals that start hidden stay hidden in headless. So the page is
 *   scrolled through in steps (observers fire, lazy images load) and every
 *   running animation/transition is finished via document.getAnimations().
 * - Then the capture checks itself: every visible image's region in the
 *   screenshot is compared with the image's own pixels; a detailed image that
 *   painted flat is reported — either the page covers it, or the capture
 *   failed to rasterise it (a grey box). (Needs pngjs; cross-origin images are skipped.)
 * Outputs <slug>-<width>[-label].png (full) and …-fold.png (first viewport),
 * and prints overflow warnings with the offending elements.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs, asList, launch, settle, decodeImages, finishMotion, growToDocument, slugFor, urlFor, importModule } from './lib/env.mjs';
import { overflowCulprits } from './lib/probes.mjs';

const a = parseArgs();
const base = a.base || 'http://localhost:3000';
const paths = asList(a.paths, ['/']);
const widths = asList(a.widths, ['1440', '1280', '1024', '768', '390']).map(Number);
const outDir = a.out || './captures';
const label = a.label ? `-${a.label}` : '';
const MAX_H = 16000;
const mode = a.mode === 'fullpage' ? 'fullpage' : 'grow';
const VARIANTS = {
  'no-text': '*, *::before, *::after { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; }',
  'no-images': 'img, picture, video, canvas, svg image { visibility: hidden !important; } * { background-image: none !important; }',
  'no-shadows': '*, *::before, *::after { box-shadow: none !important; text-shadow: none !important; filter: none !important; }',
};
// no-text last: it changes inline styles that would leak into the other variants.
const variants = [...new Set(asList(a.variant).flatMap((v) => (v === 'all' ? Object.keys(VARIANTS) : [v])).filter((v) => VARIANTS[v]))].sort((x, y) => (x === 'no-text') - (y === 'no-text'));
const PNG = (await importModule('pngjs'))?.PNG ?? null;

/** Images whose region in the screenshot is flat although the image itself has detail. */
async function flatImages(page, file, dpr) {
  if (!PNG) return null;
  const imgs = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    const sd = (d) => { let s = 0, s2 = 0, n = 0; for (let i = 0; i < d.length; i += 4) { const l = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; s += l; s2 += l * l; n++; } const m = s / n; return Math.sqrt(Math.max(0, s2 / n - m * m)); };
    return [...document.images].map((img) => {
      const r = img.getBoundingClientRect();
      if (r.width * r.height < 4000 || !img.naturalWidth || getComputedStyle(img).visibility === 'hidden' || parseFloat(getComputedStyle(img).opacity) < 0.5) return null;
      let own = null;
      try { ctx.clearRect(0, 0, 32, 32); ctx.drawImage(img, 0, 0, 32, 32); own = sd(ctx.getImageData(0, 0, 32, 32).data); } catch { return null; }
      return { src: (img.currentSrc || img.src).split('/').pop().slice(0, 50), x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height, own };
    }).filter(Boolean);
  });
  const png = PNG.sync.read(await readFile(file));
  const out = [];
  for (const im of imgs) {
    if (im.own < 12) continue; // a flat image is allowed to look flat
    const x0 = Math.max(0, Math.round(im.x * dpr)), y0 = Math.max(0, Math.round(im.y * dpr));
    const x1 = Math.min(png.width, Math.round((im.x + im.w) * dpr)), y1 = Math.min(png.height, Math.round((im.y + im.h) * dpr));
    if (x1 - x0 < 8 || y1 - y0 < 8) continue;
    let s = 0, s2 = 0, n = 0;
    const step = Math.max(1, Math.floor(Math.sqrt(((x1 - x0) * (y1 - y0)) / 4000)));
    for (let y = y0; y < y1; y += step) for (let x = x0; x < x1; x += step) {
      const i = (y * png.width + x) * 4; const l = png.data[i] * 0.3 + png.data[i + 1] * 0.59 + png.data[i + 2] * 0.11; s += l; s2 += l * l; n++;
    }
    const m = s / n; const shot = Math.sqrt(Math.max(0, s2 / n - m * m));
    if (shot < 3) out.push(im.src);
  }
  return out;
}

await mkdir(outDir, { recursive: true });
const { browser } = await launch({ chrome: a.chrome });

try {
  for (const p of paths) {
    for (const width of widths) {
      const mobile = width < 768;
      const h0 = Number(a.height) || (mobile ? 844 : 900);
      const context = await browser.newContext({
        viewport: { width, height: h0 },
        deviceScaleFactor: Number(a.dpr) || (mobile ? 2 : 1),
        isMobile: mobile,
        hasTouch: mobile,
        reducedMotion: a['reduced-motion'] ? 'reduce' : 'no-preference',
        colorScheme: a.dark ? 'dark' : 'light',
        javaScriptEnabled: !a['no-js'],
      });
      const page = await context.newPage();
      const url = urlFor(base, p);
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
      } catch {
        await page.goto(url, { waitUntil: 'load', timeout: 60000 });
      }
      await settle(page);
      const slug = slugFor(p);
      const stem = path.join(outDir, `${slug}-${width}${label}`);

      await page.screenshot({ path: `${stem}-fold.png` });

      let pinned = 0, fullH;
      if (mode === 'grow') {
        ({ pinned, height: fullH } = await growToDocument(page, width, MAX_H));
        await page.waitForTimeout(250);
      } else {
        fullH = await page.evaluate(() => document.documentElement.scrollHeight);
      }
      await finishMotion(page);
      await decodeImages(page);
      await page.screenshot({ path: `${stem}.png`, fullPage: mode === 'fullpage' || fullH > MAX_H });
      const dpr = Number(a.dpr) || (mobile ? 2 : 1);
      const flat = await flatImages(page, `${stem}.png`, dpr).catch(() => null);
      for (const v of variants) {
        const tag = await page.addStyleTag({ content: VARIANTS[v] });
        // Gradient text is painted as a clipped background, which CSS colour cannot remove.
        if (v === 'no-text') await page.evaluate(() => { for (const el of document.querySelectorAll('body *')) { const cs = getComputedStyle(el); if ((cs.webkitBackgroundClip || cs.backgroundClip) === 'text') el.style.setProperty('background', 'none', 'important'); } });
        await page.waitForTimeout(100);
        await page.screenshot({ path: `${stem}-${v}.png`, fullPage: mode === 'fullpage' || fullH > MAX_H });
        await tag.evaluate((n) => n.remove());
      }

      await page.setViewportSize({ width, height: h0 });
      const over = await page.evaluate(overflowCulprits);
      const layoutW = await page.evaluate(() => innerWidth);
      const note = [`${fullH}px tall`, pinned ? `${pinned} viewport-height elements pinned` : null,
        mobile && layoutW > width ? `⚠ layout viewport widened to ${layoutW}px — phones show this page zoomed out` : null,
        over.overflow ? `⚠ horizontal overflow by ${over.by}px: ${over.culprits.map((c) => c.selector).join(', ')}` : null,
        flat?.length ? `⚠ ${flat.length} image(s) painted flat (${flat.slice(0, 3).join(', ')}) — either something on the page covers them, or the capture failed to rasterise them: check in a browser, or retry with --mode ${mode === 'grow' ? 'fullpage' : 'grow'}` : null,
        variants.length ? `variants: ${variants.join(', ')}` : null].filter(Boolean).join(' · ');
      console.log(`${stem}.png  (${note})`);

      await context.close();

      const selectors = asList(a.element);
      if (selectors.length) {
        // Artwork is judged element by element at high density — at page scale a
        // clipped label or a mark outside its frame looks like texture.
        const hi = await browser.newContext({ viewport: { width, height: h0 }, deviceScaleFactor: 3, isMobile: mobile, hasTouch: mobile });
        const ep = await hi.newPage();
        await ep.goto(url, { waitUntil: 'load', timeout: 60000 });
        await settle(ep);
        for (const sel of selectors) {
          const els = await ep.$$(sel);
          for (const [i, el] of els.entries()) {
            const f = `${stem}-el-${sel.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '')}-${i + 1}.png`;
            const ok = await el.screenshot({ path: f }).then(() => true, () => false);
            if (ok) console.log(`  ${f}`);
          }
        }
        await hi.close();
      }
    }
  }
} finally {
  await browser.close();
}
