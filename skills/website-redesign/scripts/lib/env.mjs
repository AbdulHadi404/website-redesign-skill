/**
 * Shared helpers for the QA scripts: argument parsing, module resolution and
 * browser launch.
 *
 * Modules are resolved from, in order: the current project, this scripts
 * folder (run `npm install` in it once), and the global npm root. Playwright
 * is preferred; puppeteer is not used. The browser is found from --chrome,
 * CHROME_PATH, PLAYWRIGHT_BROWSERS_PATH, or Playwright's own install — and a
 * version mismatch between playwright-core and the installed browser (the
 * common "Executable doesn't exist at …chromium-1243" error) is handled by
 * falling back to any Chromium binary that exists on disk.
 */
import { createRequire } from 'node:module';
import { existsSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const scriptsDir = path.resolve(here, '..');

export function parseArgs(argv = process.argv.slice(2)) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { out._.push(a); continue; }
    const key = a.slice(2);
    const vals = [];
    while (i + 1 < argv.length && !argv[i + 1].startsWith('--')) vals.push(argv[++i]);
    out[key] = vals.length === 0 ? true : vals.length === 1 ? vals[0] : vals;
  }
  return out;
}

// Split on commas that are not inside parentheses, so rgba(0,0,0,.5) survives.
const splitTop = (s) => String(s).split(/,(?![^(]*\))/).map((x) => x.trim());
export const asList = (v, def = []) =>
  v === undefined || v === true ? def : (Array.isArray(v) ? v : [v]).flatMap(splitTop).filter(Boolean);

let globalRoot;
function roots() {
  const r = [path.resolve('package.json'), path.join(scriptsDir, 'package.json')];
  if (globalRoot === undefined) {
    try { globalRoot = execSync('npm root -g', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { globalRoot = null; }
  }
  if (globalRoot) r.push(path.join(globalRoot, 'noop.js'));
  return r;
}

/** Resolve a package path (e.g. 'axe-core/axe.min.js') or return null. */
export function resolveModule(name) {
  for (const from of roots()) {
    try { return createRequire(from).resolve(name); } catch { /* next */ }
  }
  return null;
}

/** Import a package from the first root that has it; null if none does. */
export async function importModule(name) {
  const p = resolveModule(name);
  if (!p) return null;
  const mod = await import(pathToFileURL(p).href);
  return mod.default ?? mod;
}

function chromiumCandidates(explicit) {
  const c = [explicit, process.env.CHROME_PATH];
  const pw = process.env.PLAYWRIGHT_BROWSERS_PATH;
  const dirs = [pw, path.join(process.env.HOME || '', '.cache/ms-playwright')].filter(Boolean);
  for (const d of dirs) {
    if (!existsSync(d)) continue;
    for (const sub of readdirSync(d).filter((s) => /^chromium(-|_headless_shell-)\d+/.test(s)).sort().reverse()) {
      c.push(path.join(d, sub, 'chrome-linux/chrome'), path.join(d, sub, 'chrome-linux64/chrome'),
        path.join(d, sub, 'chrome-headless-shell-linux64/chrome-headless-shell'),
        path.join(d, sub, 'chrome-mac/Chromium.app/Contents/MacOS/Chromium'),
        path.join(d, sub, 'chrome-win/chrome.exe'));
    }
  }
  c.push('/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe');
  return c.filter(Boolean);
}

/** Launch Chromium through Playwright. Returns { browser, chromium }. */
export async function launch({ chrome, headless = true } = {}) {
  const pw = (await importModule('playwright')) ?? (await importModule('playwright-core'));
  if (!pw) {
    console.error('Playwright not found. Run `npm install` in ' + scriptsDir + ' (or `npm i -D playwright-core` in the project).');
    process.exit(1);
  }
  const { chromium } = pw;
  const args = ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none', '--hide-scrollbars'];
  // Opt-in proxy (CAPTURE_PROXY=http://host:port). Not taken from HTTPS_PROXY automatically:
  // some Playwright versions (1.56) ignore the localhost bypass and send the dev server's
  // traffic to the proxy (HTTP 405). Behind a TLS-intercepting proxy web fonts may still fail;
  // audit.mjs reports that as "declared font families not available".
  const proxy = process.env.CAPTURE_PROXY ? { server: process.env.CAPTURE_PROXY, bypass: 'localhost,127.0.0.1,::1' } : undefined;
  if (!chrome && !process.env.CHROME_PATH) {
    try { return { browser: await chromium.launch({ headless, args, proxy }), chromium }; } catch { /* fall through */ }
    try { return { browser: await chromium.launch({ headless, args, proxy, channel: 'chrome' }), chromium }; } catch { /* fall through to a binary on disk */ }
  }
  for (const executablePath of chromiumCandidates(chrome)) {
    if (!existsSync(executablePath)) continue;
    try { return { browser: await chromium.launch({ headless, args, proxy, executablePath }), chromium }; } catch { /* next */ }
  }
  console.error('No usable Chromium found. Install Google Chrome, run `npm run browser` in ' + scriptsDir + ', or pass --chrome <path> / set CHROME_PATH.');
  process.exit(1);
}

// "/" → home, "/pricing/" → pricing, "/?lang=en" → home-lang-en, "/app/?tab=2" → app-tab-2
export const slugFor = (p) => {
  const [pathPart, query = ''] = String(p).split('?');
  const base = pathPart.replace(/^\/+|\/+$/g, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'home';
  const q = query.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
  return q ? `${base}-${q}` : base;
};

export function urlFor(base, p) {
  if (/^https?:|^file:/.test(p)) return p;
  return base.replace(/\/$/, '') + (p.startsWith('/') ? p : `/${p}`);
}

/**
 * Bring a page to its "finished" state for a visitor who scrolled through it:
 * scroll in viewport steps so observers fire and lazy images load, make lazy
 * images eager, finish every running CSS/Web animation, wait for fonts and
 * for every image bitmap to decode.
 */
/**
 * Load a URL and wait until it stops reloading. Dev servers (Vite, Astro, Next)
 * reload the page — sometimes several times — while they optimise dependencies
 * discovered on first visit (prefetching links makes it worse); evaluating
 * during a reload throws "Execution context was destroyed". Only full loads
 * count: routers that call history.replaceState on scroll fire same-document
 * navigations constantly and are harmless. Returns the first response (or null).
 */
export async function open(page, url, { timeout = 60000, quietMs = 1500, maxWaitMs = 20000 } = {}) {
  let loads = 0;
  const onLoad = () => { loads++; };
  page.on('load', onLoad);
  const res = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 })
    .catch(() => page.goto(url, { waitUntil: 'load', timeout }).catch(() => null));
  const t0 = Date.now();
  for (let seen = loads; Date.now() - t0 < maxWaitMs;) {
    await page.waitForTimeout(quietMs);
    if (loads === seen) break;
    seen = loads;
    await page.waitForLoadState('load', { timeout }).catch(() => {});
  }
  page.off('load', onLoad);
  page.__reloads = loads - 1;
  // Framework dev toolbars are not part of the site: they sit over the page in captures, take focus
  // in keyboard walks and fail accessibility checks. Error overlays are left alone — they are findings.
  page.__devOverlays = await page.evaluate((sel) => {
    const found = [...document.querySelectorAll(sel)].map((e) => e.tagName.toLowerCase());
    document.querySelectorAll(sel).forEach((e) => e.remove());
    const s = document.createElement('style'); s.textContent = `${sel} { display: none !important; }`; document.head?.append(s);
    return found;
  }, DEV_TOOLBARS).catch(() => []);
  return res;
}

export const DEV_TOOLBARS = 'astro-dev-toolbar, astro-dev-overlay, nextjs-portal, #__nuxt-devtools-container, vercel-live-feedback, #__vconsole';

const destroyed = (e) => /Execution context was destroyed|Cannot find context|navigat/i.test(String(e?.message));
/** Run fn; if a late reload destroyed the page context, wait for the page to go quiet and try again. */
export async function retrying(page, fn, tries = 4) {
  for (let i = 0; ; i++) {
    try { return await fn(); } catch (e) {
      if (i >= tries - 1 || !destroyed(e)) throw e;
      await page.waitForLoadState('load').catch(() => {});
      await page.waitForTimeout(1500);
    }
  }
}

export async function settle(page, opts = {}) {
  // With JavaScript disabled, timers inside the page never fire: scroll and wait from Node instead.
  if (opts.js === false) return settleNoJs(page, opts);
  // A node-side deadline, so nothing inside the page can hang a run.
  let timer;
  const deadline = new Promise((resolve) => { timer = setTimeout(() => resolve('timeout'), opts.timeoutMs ?? 45000); });
  const r = await Promise.race([retrying(page, () => settleOnce(page, opts)), deadline]);
  clearTimeout(timer);
  if (r === 'timeout') console.error(`  ⚠ settle timed out on ${page.url()} — capturing as is`);
}

async function settleNoJs(page, { settleMs = 600 } = {}) {
  await page.waitForLoadState('load').catch(() => {});
  const h = await page.evaluate(() => document.documentElement.scrollHeight).catch(() => 0);
  const vh = page.viewportSize()?.height || 800;
  for (let y = 0; y < h; y += Math.floor(vh * 0.8)) { await page.mouse.wheel(0, Math.floor(vh * 0.8)); await page.waitForTimeout(80); }
  await page.mouse.wheel(0, -h - vh);
  await page.waitForTimeout(settleMs);
}

async function settleOnce(page, { settleMs = 600 } = {}) {
  await page.evaluate(async () => { await document.fonts?.ready; });
  await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    document.querySelectorAll('img[loading="lazy"]').forEach((img) => { img.loading = 'eager'; });
    const step = Math.max(200, Math.floor(innerHeight * 0.8));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) { scrollTo(0, y); await sleep(120); }
    scrollTo(0, document.documentElement.scrollHeight); await sleep(200);
    scrollTo(0, 0); await sleep(150);
  });
  await page.waitForTimeout(settleMs);
  await finishMotion(page);
  await decodeImages(page);
}

export async function finishMotion(page) {
  await page.evaluate(() => {
    for (const a of document.getAnimations?.() ?? []) {
      try { if (a.effect?.getComputedTiming?.().iterations === Infinity) a.pause(); else a.finish(); } catch { /* ignore */ }
    }
  });
}

export async function decodeImages(page) {
  await page.evaluate(async () => {
    await Promise.all([...document.images].map((img) =>
      img.complete && img.naturalWidth ? img.decode().catch(() => {}) :
        new Promise((r) => { img.addEventListener('load', () => img.decode().then(r, r), { once: true }); img.addEventListener('error', r, { once: true }); setTimeout(r, 4000); })));
  });
}

/**
 * Grow the viewport to the document height without letting viewport-relative
 * sizes (100vh heroes, min-height: 100svh wrappers) grow with it. Heights are
 * recorded at the normal viewport, the viewport is grown, anything whose height
 * changed is pinned back, and the loop repeats until the document height is
 * stable. (Probing at a slightly taller viewport is not enough: a hero whose
 * content already exceeds 100vh only reveals its min-height at the grown size.)
 */
export async function growToDocument(page, width, MAX_H = 16000) {
  await page.evaluate(() => {
    window.__cap = [...document.querySelectorAll('body, body *')].filter((e) => e instanceof HTMLElement);
    window.__base = window.__cap.map((e) => e.offsetHeight);
  });
  // Content height, not scrollHeight: on a phone whose layout viewport has been
  // widened by overflow, scrollHeight never drops below innerHeight × zoom-out.
  const contentHeight = () => page.evaluate(() => {
    const b = document.body;
    const bottoms = [...b.children].filter((e) => getComputedStyle(e).position !== 'fixed').map((e) => e.getBoundingClientRect().bottom + scrollY);
    return Math.ceil(Math.max(b.getBoundingClientRect().bottom + scrollY, ...bottoms) + parseFloat(getComputedStyle(b).marginBottom || 0));
  });
  let pinned = 0;
  let H = await contentHeight();
  for (let i = 0; i < 5; i++) {
    await page.setViewportSize({ width, height: Math.min(H, MAX_H) });
    await page.waitForTimeout(150);
    const n = await page.evaluate(() => {
      let n = 0;
      window.__cap.forEach((e, i) => {
        if (Math.abs(e.offsetHeight - window.__base[i]) > 1) {
          n++;
          for (const [k, v] of [['height', window.__base[i] + 'px'], ['min-height', '0px'], ['max-height', 'none'], ['box-sizing', 'border-box']]) e.style.setProperty(k, v, 'important');
        }
      });
      return n;
    });
    pinned += n;
    const H2 = await contentHeight();
    if (n === 0 && Math.abs(H2 - Math.min(H, MAX_H)) <= 1) break;
    H = H2;
  }
  return { pinned, height: H };
}
