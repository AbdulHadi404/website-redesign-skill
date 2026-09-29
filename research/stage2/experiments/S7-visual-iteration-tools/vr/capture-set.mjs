/**
 * Captures the visual-regression fixture (fixtures/vr/index.html?v=…) for the engine comparison.
 *
 * Modes:
 *   raw     load, fonts ready, full-page screenshot — what a naive loop does (spinner running, clock live)
 *   stable  + animations finished/paused, caret hidden, [data-dynamic] covered by a solid box (Playwright-style mask)
 * Two "other machine" sets, no real change: "binary" is the base page captured by the headless-shell binary instead
 * of full Chromium (the usual dev-vs-CI difference: grayscale instead of LCD text anti-aliasing), "p3" by full
 * Chromium with --force-color-profile=display-p3-d65 (a wide-gamut display profile).
 *
 * Output: captures/vr/<mode>/<width>/<variant>.png  (captures/ is git-ignored; run.mjs rebuilds it)
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { launchWith, BASE_ARGS, shellPath } from '../lib/browser.mjs';

export const VARIANTS = ['control', 'aa', 'binary', 'p3', 'shift1', 'font', 'colour', 'colour-subtle', 'removed', 'reflow'];
// Ground truth: which variants are real regressions (true) and which are noise (false).
export const TRUTH = { control: false, aa: false, binary: false, p3: false, shift1: true, font: true, colour: true, 'colour-subtle': true, removed: true, reflow: true };
export const WIDTHS = [{ width: 1280, height: 800, dpr: 1 }, { width: 390, height: 844, dpr: 2, mobile: true }];

const STABLE_CSS = '*,*::before,*::after{animation-play-state:paused!important;caret-color:transparent!important}';

async function shoot(browser, url, { width, height, dpr, mobile }, mode, file) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr, isMobile: !!mobile, hasTouch: !!mobile });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  if (mode === 'stable') {
    await page.addStyleTag({ content: STABLE_CSS });
    // Finish finite animations, rewind infinite ones to t=0 (so every capture shows the same frame).
    await page.evaluate(() => { for (const a of document.getAnimations()) { try { if (a.effect.getComputedTiming().iterations === Infinity) { a.pause(); a.currentTime = 0; } else a.finish(); } catch {} } });
    await page.evaluate(() => {
      for (const el of document.querySelectorAll('[data-dynamic]')) {
        const r = el.getBoundingClientRect();
        const m = document.createElement('div');
        m.style.cssText = `position:absolute;left:${r.left + scrollX}px;top:${r.top + scrollY}px;width:${r.width}px;height:${r.height}px;background:#ff00ff;z-index:2147483647`;
        document.body.append(m);
      }
    });
  } else {
    await page.waitForTimeout(137); // an arbitrary moment: the spinner is wherever it is
  }
  await page.screenshot({ path: file, fullPage: true });
  await ctx.close();
}

export async function captureSet(base, outRoot) {
  const normal = await launchWith(BASE_ARGS);
  const shell = await launchWith(BASE_ARGS, shellPath());
  const p3 = await launchWith([...BASE_ARGS, '--force-color-profile=display-p3-d65']);
  const browserFor = (v) => (v === 'binary' ? shell : v === 'p3' ? p3 : normal);
  const url = (v) => `${base}/fixtures/vr/index.html${['baseline', 'control', 'binary', 'p3'].includes(v) ? '' : `?v=${v}`}`;
  try {
    for (const mode of ['raw', 'stable']) for (const w of WIDTHS) {
      const dir = path.join(outRoot, mode, String(w.width));
      await mkdir(dir, { recursive: true });
      for (const v of ['baseline', ...VARIANTS]) await shoot(browserFor(v), url(v), w, mode, path.join(dir, `${v}.png`));
    }
  } finally { await normal.close(); await shell.close(); await p3.close(); }
}
