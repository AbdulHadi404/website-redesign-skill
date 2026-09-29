// Playwright Test for the visual-regression comparison. Env: VR_BASE (server), VR_VARIANT (fixture variant),
// VR_MASK=1 (mask [data-dynamic]), VR_OUT (snapshot and results folder, under captures/).
import { defineConfig } from '@playwright/test';
import { chromePath, shellPath, BASE_ARGS } from '../../lib/browser.mjs';

const v = process.env.VR_VARIANT || 'baseline';
const out = process.env.VR_OUT;
const launchOptions = { executablePath: v === 'binary' ? shellPath() : chromePath(), args: v === 'p3' ? [...BASE_ARGS, '--force-color-profile=display-p3-d65'] : BASE_ARGS };

export default defineConfig({
  testDir: '.',
  outputDir: `${out}/test-results`,
  snapshotPathTemplate: `${out}/snapshots/{projectName}/{arg}{ext}`,
  reporter: [['json', { outputFile: `${out}/report-${v}.json` }]],
  workers: 1,
  retries: 0,
  use: { baseURL: process.env.VR_BASE, launchOptions },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 } },
    { name: 'phone', use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
  ],
});
