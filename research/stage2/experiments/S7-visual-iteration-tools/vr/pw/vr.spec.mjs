import { test, expect } from '@playwright/test';

const v = process.env.VR_VARIANT || 'baseline';
const query = ['baseline', 'control', 'binary', 'p3'].includes(v) ? '' : `?v=${v}`;

test('home', async ({ page }) => {
  await page.goto(`/fixtures/vr/index.html${query}`);
  // toHaveScreenshot's own defaults: animations "disabled", caret "hide", scale "css", threshold 0.2, maxDiffPixels 0,
  // and it retakes the shot until two consecutive captures match.
  const opts = { fullPage: true };
  if (process.env.VR_MASK === '1') opts.mask = [page.locator('[data-dynamic]')];
  await expect(page).toHaveScreenshot('home.png', opts);
});
