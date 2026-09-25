#!/usr/bin/env node
/**
 * axe-core accessibility scan of a running site or app, per route, per theme,
 * per width — the automated half of the application QA in technical-qa.md.
 *
 *   node a11y.mjs --base http://localhost:3000 --paths /dashboard /settings \
 *        --themes light,dark --widths 1440,390 [--cookies cookies.json] \
 *        [--open "/dashboard=Control+k"]
 *
 * Needs `puppeteer-core` and `axe-core` resolvable from the current directory
 * (npm i -D puppeteer-core axe-core) and a Chrome/Chromium binary (--chrome or
 * CHROME_PATH, as capture.mjs). Themes are emulated with prefers-color-scheme;
 * if the app stores an explicit choice, pass --theme-key <localStorage key>
 * and it is set to the theme name before each load. --cookies takes a JSON
 * array of puppeteer cookies for signed-in routes (mint a session server-side;
 * never type credentials into the page). --open presses a key chord on a path
 * and scans again, because palettes, menus and dialogs only exist when open.
 *
 * It also reads the computed font of every element that renders text and
 * fails on any monospace face (a code font reads as "code" to anyone who is
 * not a developer — lessons.md). Pass --allow-mono only for a product whose
 * users read code. Browsers set code / kbd / samp / pre in monospace by
 * default, so this catches faces nobody chose as well as ones somebody did.
 *
 * In Git Bash on Windows, pass paths without the leading slash (MSYS rewrites
 * "/x" into a Windows path); the script adds it.
 *
 * Rules: WCAG 2.0/2.1/2.2 A + AA and axe best practice. Exits 1 on any
 * serious or critical violation, or on monospace text without --allow-mono. Dark mode is scanned at the widest width
 * only; the phone widths run in the first theme.
 */
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

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
const paths = list('paths') ?? ['/'];
const themes = opt('themes', 'light,dark').split(',');
const widths = opt('widths', '1440,390').split(',').map((w) => parseInt(w, 10));
const themeKey = opt('theme-key');
const cookies = opt('cookies') ? JSON.parse(readFileSync(opt('cookies'), 'utf8')) : [];
const opens = Object.fromEntries((list('open') ?? []).map((s) => s.split('=')));
const allowMono = args.includes('--allow-mono');

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
const req = createRequire(path.resolve('package.json'));
let puppeteer, axeSource;
try {
  puppeteer = (await import(pathToFileURL(req.resolve('puppeteer-core')).href)).default;
  axeSource = readFileSync(req.resolve('axe-core/axe.min.js'), 'utf8');
} catch {
  console.error('Install the tools in the project first: npm i -D puppeteer-core axe-core');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const byRule = new Map();
let serious = 0;
let monoViews = 0;
const faces = new Set();

// Faces actually rendered: the first family of every element with its own text.
async function fontAudit(page) {
  const { fams, mono } = await page.evaluate(() => {
    const MONO = /mono|courier|consolas|menlo|monaco|code/i;
    const fams = new Set();
    const mono = new Set();
    for (const el of document.querySelectorAll('body *:not(script):not(style):not(noscript):not(template)')) {
      const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!ownText) continue;
      const first = getComputedStyle(el).fontFamily.split(',')[0].replace(/["']/g, '').trim();
      fams.add(first);
      if (MONO.test(first) || first === 'monospace') {
        const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
        mono.add(`${el.tagName.toLowerCase()}${cls ? '.' + cls : ''} "${el.textContent.trim().slice(0, 24)}" (${first})`);
      }
    }
    return { fams: [...fams], mono: [...mono].slice(0, 6) };
  });
  fams.forEach((f) => faces.add(f));
  if (mono.length) {
    monoViews++;
    console.log(`${' '.repeat(40)} ${allowMono ? 'note' : '⚠'} monospace: ${mono.join('; ')}`);
  }
}

async function scan(page, label) {
  await page.addScriptTag({ content: axeSource });
  const violations = await page.evaluate(async () => {
    // eslint-disable-next-line no-undef
    const r = await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] },
    });
    return r.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.map((n) => ({ target: n.target.join(' '), why: (n.failureSummary ?? '').split('\n').slice(1, 2).join('').trim() })),
    }));
  });
  for (const v of violations) {
    if (v.impact === 'serious' || v.impact === 'critical') serious++;
    const e = byRule.get(v.id) ?? { ...v, views: [], nodes: [] };
    e.views.push(label);
    for (const n of v.nodes) if (e.nodes.length < 5) e.nodes.push({ ...n, at: label });
    byRule.set(v.id, e);
  }
  console.log(label.padEnd(40), violations.length ? violations.map((v) => `${v.id}(${v.impact}×${v.nodes.length})`).join(' ') : 'clean');
  await fontAudit(page);
}

const browser = await puppeteer.launch({ executablePath, args: ['--no-sandbox', '--disable-gpu'] });
try {
  for (const p of paths) {
    for (const theme of themes) {
      for (const width of widths) {
        if (theme !== themes[0] && width !== Math.max(...widths)) continue;
        const mobile = width < 768;
        const page = await browser.newPage();
        if (cookies.length) await page.setCookie(...cookies);
        if (themeKey) await page.evaluateOnNewDocument((k, t) => { try { localStorage.setItem(k, t); } catch {} }, themeKey, theme);
        await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }]);
        await page.setViewport({ width, height: mobile ? 844 : 900, isMobile: mobile, hasTouch: mobile });
        await page.goto(base + (p.startsWith('/') ? p : `/${p}`), { waitUntil: 'networkidle0', timeout: 60000 });
        await page.evaluate(() => document.fonts?.ready);
        // Finish entrance animations first: a scan taken mid-fade reads
        // half-transparent text as low contrast (seen on a live site at 390).
        await page.addStyleTag({ content: '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important;transition-delay:0s!important}' });
        await sleep(500);
        await scan(page, `${p} ${theme} ${width}`);
        if (opens[p] && !mobile) {
          const keys = opens[p].split('+');
          for (const k of keys.slice(0, -1)) await page.keyboard.down(k);
          await page.keyboard.press(keys.at(-1));
          for (const k of keys.slice(0, -1).reverse()) await page.keyboard.up(k);
          await sleep(400);
          await scan(page, `${p} ${theme} ${width} +open`);
        }
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
}

const order = { critical: 0, serious: 1, moderate: 2, minor: 3 };
for (const [id, e] of [...byRule].sort((a, b) => order[a[1].impact] - order[b[1].impact])) {
  console.log(`\n[${e.impact}] ${id} — ${e.help} (${e.views.length} views)`);
  for (const n of e.nodes) console.log(`  ${n.at} :: ${n.target}\n    ${n.why}`);
}
console.log(`\nfaces rendered: ${[...faces].join(', ')}`);
if (monoViews) console.log(`monospace text in ${monoViews} view(s)${allowMono ? ' (allowed)' : ''}`);
console.log(serious ? `${serious} serious/critical violation(s)` : 'no serious or critical violations');
process.exit(serious || (monoViews && !allowMono) ? 1 : 0);
