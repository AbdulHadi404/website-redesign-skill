#!/usr/bin/env node
/**
 * Full-page captures of a running site at several widths, for visual QA.
 *
 *   node capture.mjs --base http://localhost:3000 --out ./captures \
 *        --paths / /pricing /about --widths 1440,1280,1024,768,390
 *
 * Needs `puppeteer-core` resolvable from the current directory (npm i -D
 * puppeteer-core) and a Chrome/Chromium binary: pass --chrome <path> or set
 * CHROME_PATH; otherwise common locations are tried. Waits for fonts and for
 * scroll-reveal fail-safes before capturing, so nothing is hidden by motion.
 * Widths below 768 are captured with mobile emulation (touch, mobile UA).
 */
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? def : args[i + 1];
};
const list = (name) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return null;
  const out = [];
  for (let j = i + 1; j < args.length && !args[j].startsWith('--'); j++) out.push(args[j]);
  return out;
};

const base = opt('base', 'http://localhost:3000').replace(/\/$/, '');
const outDir = opt('out', './captures');
const paths = list('paths') ?? ['/'];
const widths = (opt('widths', '1440,1280,1024,768,390')).split(',').map((w) => parseInt(w, 10));
const settle = parseInt(opt('settle', '3200'), 10);

const candidates = [
  process.env.CHROME_PATH,
  opt('chrome'),
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean);
const executablePath = candidates.find((p) => existsSync(p));
if (!executablePath) {
  console.error('No Chrome binary found. Pass --chrome <path> or set CHROME_PATH.');
  process.exit(1);
}

let puppeteer;
try {
  puppeteer = (await import(createRequire(path.resolve('package.json')).resolve('puppeteer-core'))).default;
} catch {
  console.error('puppeteer-core not found. Install it in the project: npm i -D puppeteer-core');
  process.exit(1);
}

await mkdir(outDir, { recursive: true });
const browser = await puppeteer.launch({ executablePath, args: ['--no-sandbox', '--disable-gpu'] });
try {
  for (const p of paths) {
    for (const width of widths) {
      const mobile = width < 768;
      const page = await browser.newPage();
      await page.setViewport({ width, height: mobile ? 844 : 900, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
      const url = base + (p.startsWith('/') ? p : `/${p}`);
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
      await page.evaluate(() => document.fonts?.ready);
      await new Promise((r) => setTimeout(r, settle));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      const slug = p === '/' ? 'home' : p.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-');
      const file = path.join(outDir, `${slug}-${width}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log(`${file}${overflow ? '   ⚠ horizontal overflow' : ''}`);
      await page.close();
    }
  }
} finally {
  await browser.close();
}
