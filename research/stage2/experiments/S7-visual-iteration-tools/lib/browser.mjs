/**
 * Browser launch for the experiments. Normal runs use the skill's own launch() (same flags as the skill's scripts);
 * launchWith(args) swaps flags (e.g. a different font hinting, to simulate another machine's anti-aliasing).
 */
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

export const SKILL = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../../../skills/website-redesign');

export function chromePath() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  for (const d of [process.env.PLAYWRIGHT_BROWSERS_PATH, '/opt/pw-browsers', path.join(process.env.HOME || '', '.cache/ms-playwright')].filter(Boolean)) {
    if (!existsSync(d)) continue;
    for (const sub of readdirSync(d).filter((s) => /^chromium-\d+/.test(s)).sort().reverse()) {
      const p = path.join(d, sub, 'chrome-linux/chrome');
      if (existsSync(p)) return p;
    }
  }
  return undefined;
}

/** The headless shell binary next to the full Chromium (another raster path: the usual dev-vs-CI difference). */
export function shellPath() {
  const full = chromePath();
  if (!full) return undefined;
  const d = path.dirname(path.dirname(path.dirname(full)));
  for (const sub of readdirSync(d).filter((s) => /^chromium_headless_shell-\d+/.test(s)).sort().reverse()) {
    const p = path.join(d, sub, 'chrome-linux/headless_shell');
    if (existsSync(p)) return p;
  }
  return undefined;
}

export const BASE_ARGS = ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none', '--hide-scrollbars'];

export async function launchWith(args = BASE_ARGS, executablePath = chromePath()) {
  return chromium.launch({ headless: true, args, executablePath });
}
