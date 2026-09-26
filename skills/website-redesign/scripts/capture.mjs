#!/usr/bin/env node
/**
 * Full-page captures of a running site at several widths, for visual QA.
 *
 *   node capture.mjs --base http://localhost:3000 --out ./captures \
 *        --paths / /pricing /about --widths 1440,1280,1024,768,390 [--clip 900]
 *
 * Needs `puppeteer-core` resolvable from the current directory (npm i -D
 * puppeteer-core) and a Chrome/Chromium binary: pass --chrome <path> or set
 * CHROME_PATH; otherwise common locations are tried. Widths below 768 are captured
 * with mobile emulation (touch, mobile UA, 2x density).
 *
 * It applies the two rules from references/visual-qa.md: every image is forced eager
 * and decoded, and the viewport grows to the document height before the shot, because
 * `fullPage` alone can leave never-composited images as grey boxes. --clip N captures
 * only the first N px (a first-viewport check, e.g. --clip 844 at 390 wide).
 *
 * Windows Git Bash rewrites arguments that start with "/" into file paths; run with
 * MSYS_NO_PATHCONV=1 or pass paths without the leading slash.
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
const paths = (list('paths') ?? ['/']).map((p) => (/^[A-Za-z]:[\\/]/.test(p) ? (console.warn(`"${p}" looks like a rewritten path (Git Bash); set MSYS_NO_PATHCONV=1`), p) : p));
const widths = opt('widths', '1440,1280,1024,768,390').split(',').map((w) => parseInt(w, 10));
const settle = parseInt(opt('settle', '1200'), 10);
const clip = opt('clip', null);

const candidates = [
  process.env.CHROME_PATH,
  opt('chrome'),
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
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

const decodeAll = () =>
  Promise.all(
    [...document.images].map((img) => {
      img.loading = 'eager';
      return img.decode().catch(() => {});
    }),
  );

await mkdir(outDir, { recursive: true });
const browser = await puppeteer.launch({ executablePath, args: ['--no-sandbox', '--disable-gpu'] });
try {
  for (const p of paths) {
    for (const width of widths) {
      const mobile = width < 768;
      const page = await browser.newPage();
      const height = mobile ? 844 : 900;
      await page.setViewport({ width, height, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
      const url = base + (p.startsWith('/') ? p : `/${p}`);
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
      await page.evaluate(() => document.fonts?.ready);
      await page.evaluate(decodeAll);
      if (!clip) {
        // Rule 1: grow the viewport to the document so every image is composited, then decode again.
        const docHeight = await page.evaluate(() => document.documentElement.scrollHeight);
        await page.setViewport({ width, height: Math.min(docHeight, 15000), deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
        await page.evaluate(decodeAll);
      }
      await new Promise((r) => setTimeout(r, settle));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      const slug = p === '/' ? 'home' : p.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-');
      const file = path.join(outDir, `${slug}-${width}${clip ? '-top' : ''}.png`);
      await page.screenshot({ path: file, fullPage: !clip, clip: clip ? { x: 0, y: 0, width, height: Number(clip) } : undefined });
      console.log(`${file}${overflow ? '   ⚠ horizontal overflow' : ''}`);
      await page.close();
    }
  }
} finally {
  await browser.close();
}
