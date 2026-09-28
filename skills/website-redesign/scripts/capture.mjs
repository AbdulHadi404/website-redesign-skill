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
 *   --chrome path  Chromium binary (or CHROME_PATH)
 *
 * Why it works the way it does (each of these was a real, repeated failure):
 * - `fullPage: true` does not reliably rasterise images that were never
 *   composited in the viewport — they come out as grey boxes while the DOM says
 *   they loaded. So the viewport is grown to the document height and every
 *   bitmap is awaited with img.decode() before the shot.
 * - Growing the viewport makes `100vh`/`svh`/`dvh` sections balloon (a hero
 *   with min-height: 100vh becomes as tall as the page). So elements whose
 *   height depends on the viewport are found by measuring at two heights and
 *   pinned to their normal-viewport height first.
 * - Scroll reveals that start hidden stay hidden in headless. So the page is
 *   scrolled through in steps (observers fire, lazy images load) and every
 *   running animation/transition is finished via document.getAnimations().
 * Outputs <slug>-<width>[-label].png (full) and …-fold.png (first viewport),
 * and prints overflow warnings with the offending elements.
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs, asList, launch, settle, decodeImages, finishMotion, growToDocument, slugFor, urlFor } from './lib/env.mjs';
import { overflowCulprits } from './lib/probes.mjs';

const a = parseArgs();
const base = a.base || 'http://localhost:3000';
const paths = asList(a.paths, ['/']);
const widths = asList(a.widths, ['1440', '1280', '1024', '768', '390']).map(Number);
const outDir = a.out || './captures';
const label = a.label ? `-${a.label}` : '';
const MAX_H = 16000;

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

      const { pinned, height: fullH } = await growToDocument(page, width, MAX_H);
      await page.waitForTimeout(250);
      await finishMotion(page);
      await decodeImages(page);
      await page.screenshot({ path: `${stem}.png`, fullPage: fullH > MAX_H });

      await page.setViewportSize({ width, height: h0 });
      const over = await page.evaluate(overflowCulprits);
      const layoutW = await page.evaluate(() => innerWidth);
      const note = [`${fullH}px tall`, pinned ? `${pinned} viewport-height elements pinned` : null,
        mobile && layoutW > width ? `⚠ layout viewport widened to ${layoutW}px — phones show this page zoomed out` : null,
        over.overflow ? `⚠ horizontal overflow by ${over.by}px: ${over.culprits.map((c) => c.selector).join(', ')}` : null].filter(Boolean).join(' · ');
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
