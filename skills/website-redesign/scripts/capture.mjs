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
 *   --forced-colors  capture in forced-colors mode (Windows High Contrast)
 *   --no-js        capture with JavaScript disabled (shows what fails without it)
 *   --element sel  also capture each element matching the selector(s) at DPR 3
 *                  (use for drawn artwork, diagrams, product fragments)
 *   --variant v    extra full captures for the critique's removal tests:
 *                  no-text (all text transparent), no-images (images, video,
 *                  background images hidden), no-shadows (box/text shadows off);
 *                  comma list or "all"
 *   --mode m       grow (default) or fullpage — see below
 *   --dir rtl      pseudo-RTL: html[dir] set before any page script runs (and kept if a script resets it; a dir on
 *                  body that says otherwise is removed), so a left-to-right build shows whether it serves RTL by
 *                  flipping dir. Top document only: embedded frames keep theirs. --dir ltr does the reverse.
 *                  Files get -rtl (or -ltr) after the width: home-390-rtl-after.png
 *   --lang code    html[lang] the same way (with --dir rtl: --lang ar, fa, he, ur), so :lang() rules, hyphenation and
 *                  the language's font fallback apply; adds -<code> to the file names
 *   --insets t,b[,l,r]  safe-area insets at phone widths (default 59,34: the status bar with the Dynamic Island and
 *                  the home indicator of a portrait iPhone), emulated through CDP only when the page's viewport meta
 *                  has viewport-fit=cover. Without cover the browser keeps the page inside the safe area and
 *                  env(safe-area-inset-*) is 0 on iOS, so emulating them would be stricter than any iPhone. With
 *                  cover, fixed and sticky bars show whether they pad with env(): the line says "safe-area insets
 *                  59/34 px emulated", and a bar's controls in the top 59 or bottom 34 px sit under the status bar
 *                  or the home indicator. --insets 0 turns it off
 *   --gpu          ask for hardware WebGL: full Chromium with the GPU blocklist ignored and GPU
 *                  rasterisation on (ANGLE on Windows and macOS); needs a machine with a GPU
 *   --headed       run a visible browser window (needs a display; on a Linux server xvfb-run
 *                  gives it one, but no GPU)
 *   --chrome path  Chromium binary (or CHROME_PATH)
 *
 * In Git Bash on Windows pass paths without the leading slash or set MSYS_NO_PATHCONV=1 (the scripts warn).
 *
 * WebGL: the first page of a run that has a <canvas> (in the page, in a shadow root, open or closed, or in
 * an iframe of any origin), or the first page at all with --gpu or --headed, prints
 * `renderer: <vendor> / <renderer>`. A software renderer (SwiftShader, llvmpipe) draws a 3D page correctly
 * but slowly, so its speed and motion cannot be judged from that run (visual-qa.md, "3D and WebGL
 * experiences"): capture again with --gpu or --headed on a machine with a GPU. Pages without a canvas
 * print nothing.
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
 * and prints overflow warnings with the offending elements: horizontal
 * overflow (the document is wider than the viewport), and text that runs past
 * the viewport edge where the page clips itself (overflow-x: hidden or clip on
 * html or body). With both html and body clipping, the document does not get
 * any wider, so only the second warning sees the cut. Text a reader can still
 * reach (the page scrolls sideways to it, or a phone shows the page zoomed
 * out) is left to the overflow and layout-viewport warnings. Text past the
 * start edge (left in a left-to-right page, right in a right-to-left one) is
 * never reachable, so it is reported with or without a clip ("where no scroll
 * reaches it").
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs, asList, launch, open, settle, decodeImages, finishMotion, growToDocument, slugFor, urlFor, importModule, rendererInfo } from './lib/env.mjs';
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
  // Text goes; icons drawn in currentColor keep their colour (SVG is excluded) and the logo is hidden, as the
  // critique's content-free test asks.
  'no-text': ':where(*:not(svg, svg *)), ::before, ::after { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; } svg text { fill: transparent !important; } [class*="logo" i], [id*="logo" i], [aria-label*="logo" i], header a[href="/"] img, header a[href="/"] svg, a[rel="home"] img, a[rel="home"] svg { visibility: hidden !important; }',
  'no-images': 'img, picture, video, canvas, svg image { visibility: hidden !important; } * { background-image: none !important; }',
  'no-shadows': '*, *::before, *::after { box-shadow: none !important; text-shadow: none !important; filter: none !important; }',
};
// no-text last: it changes inline styles that would leak into the other variants.
const variants = [...new Set(asList(a.variant).flatMap((v) => (v === 'all' ? Object.keys(VARIANTS) : [v])).filter((v) => VARIANTS[v]))].sort((x, y) => (x === 'no-text') - (y === 'no-text'));
const PNG = (await importModule('pngjs'))?.PNG ?? null;
const dir = a.dir === undefined ? null : String(a.dir).toLowerCase();
if (dir !== null && !['rtl', 'ltr'].includes(dir)) { console.error('--dir takes rtl or ltr'); process.exit(2); }
const lang = a.lang === undefined ? null : String(a.lang);
if (lang !== null && !/^[a-z]{2,3}(-[a-z0-9]{2,8})*$/i.test(lang)) { console.error('--lang takes a language tag: --lang ar'); process.exit(2); }
const tag = [dir, lang && lang.toLowerCase()].filter(Boolean).map((x) => `-${x}`).join('');
const insets = (() => {
  if (a.insets === undefined) return [59, 34, 0, 0];
  const v = asList(a.insets).map(Number);
  if (v.length === 1 && v[0] === 0) return null;
  if (v.length < 2 || v.length > 4 || v.some((x) => !Number.isFinite(x) || x < 0)) { console.error('--insets takes top,bottom[,left,right] in px (59,34 by default), or 0 to turn them off'); process.exit(2); }
  const [top, bottom, left = 0, right = left] = v;
  return top || bottom || left || right ? [top, bottom, left, right] : null;
})();

/**
 * Images whose region in the screenshot is flat although the image itself has detail. shift: where a shot that `shoot`
 * took through CDP starts, relative to the layout viewport (null: Playwright's, at the document's scroll origin).
 */
async function flatImages(page, file, dpr, shift = null) {
  if (!PNG) return null;
  const imgs = await page.evaluate((shift) => {
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    const sd = (d) => { let s = 0, s2 = 0, n = 0; for (let i = 0; i < d.length; i += 4) { const l = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; s += l; s2 += l * l; n++; } const m = s / n; return Math.sqrt(Math.max(0, s2 / n - m * m)); };
    return [...document.images].map((img) => {
      const r = img.getBoundingClientRect();
      if (r.width * r.height < 4000 || !img.naturalWidth || getComputedStyle(img).visibility === 'hidden' || parseFloat(getComputedStyle(img).opacity) < 0.5) return null;
      let own = null;
      try { ctx.clearRect(0, 0, 32, 32); ctx.drawImage(img, 0, 0, 32, 32); own = sd(ctx.getImageData(0, 0, 32, 32).data); } catch { return null; }
      // Only the part a clipping ancestor lets through is painted: a tile wall cut off by overflow: hidden, or a
      // carousel's off-screen slides, is flat in the capture on purpose.
      let x0 = r.left, y0 = r.top, x1 = r.right, y1 = r.bottom;
      for (let a = img.parentElement; a && a !== document.body; a = a.parentElement) {
        const cs = getComputedStyle(a);
        if (cs.position === 'fixed') break;
        if (!/hidden|clip|auto|scroll/.test(cs.overflowX + cs.overflowY)) continue;
        const ar = a.getBoundingClientRect();
        if (/hidden|clip|auto|scroll/.test(cs.overflowX)) { x0 = Math.max(x0, ar.left); x1 = Math.min(x1, ar.right); }
        if (/hidden|clip|auto|scroll/.test(cs.overflowY)) { y0 = Math.max(y0, ar.top); y1 = Math.min(y1, ar.bottom); }
      }
      if ((x1 - x0) * (y1 - y0) < Math.max(4000, r.width * r.height * 0.5)) return null;
      return { src: (img.currentSrc || img.src).split('/').pop().slice(0, 50), x: x0 + (shift ? shift.dx : scrollX), y: y0 + (shift ? shift.dy : scrollY), w: x1 - x0, h: y1 - y0, own };
    }).filter(Boolean);
  }, shift);
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

/**
 * A <canvas> anywhere in the page: in a shadow root, open or closed (3D viewers draw inside web components), or in an
 * iframe of any origin (the usual embed for Sketchfab, Spline and Matterport scenes). Read from the DevTools DOM tree,
 * which sees what page script cannot (closed roots, other sites' documents). A frame from another site runs in its
 * own process and has its own session; any other frame is already in its parent's tree.
 */
async function hasCanvas(page) {
  const found = (n) => n.nodeName === 'CANVAS' || [...(n.children || []), ...(n.shadowRoots || []), ...(n.contentDocument ? [n.contentDocument] : [])].some(found);
  const inTree = async (target) => { // null: no session of its own (or the frame went away)
    const s = await page.context().newCDPSession(target).catch(() => null);
    if (!s) return null;
    try { return found((await s.send('DOM.getDocument', { depth: -1, pierce: true })).root); }
    catch { return null; } finally { await s.detach().catch(() => {}); }
  };
  const top = await inTree(page);
  if (top === null) {
    // No DevTools tree: page script still sees every frame and the open shadow roots.
    const find = () => { const f = (r) => !!r.querySelector('canvas') || [...r.querySelectorAll('*')].some((e) => e.shadowRoot && f(e.shadowRoot)); return f(document); };
    for (const f of page.frames()) if (await f.evaluate(find).catch(() => false)) return true;
    return false;
  }
  if (top) return true;
  for (const f of page.frames().slice(1)) if (await inTree(f)) return true;
  return false;
}

/**
 * One line per run naming the WebGL renderer, so a 3D page captured in software is not judged for speed or motion.
 * Asked in a blank tab of the same context: the renderer belongs to the browser, and the page under capture then
 * gets no extra WebGL context (Chromium drops the oldest one past its limit).
 */
async function printRenderer(context) {
  const probe = await context.newPage();
  try {
    const r = await rendererInfo(probe);
    console.log(r
      ? `renderer: ${r.vendor} / ${r.renderer}${r.software ? ' — software rendering: WebGL speed and motion cannot be judged from this run (visual-qa.md, "3D and WebGL experiences"; try --gpu or --headed on a machine with a GPU)' : ''}`
      : 'renderer: none — WebGL is unavailable in this browser, so a WebGL canvas shows its fallback or nothing (try --gpu or --headed on a machine with a GPU)');
  } finally {
    await probe.close().catch(() => {});
  }
}

/**
 * Init script for --dir / --lang: sets them on the root before the page's scripts run and puts them back if a script
 * (a framework's locale code) resets them. The root does not exist yet when an init script runs, so it is caught as
 * the parser inserts it. A body whose own dir says otherwise would keep the page as it was: that attribute goes.
 */
function pseudoDir({ dir, lang }) {
  if (window !== window.top) return;
  let n = 0;
  const fix = () => {
    const h = document.documentElement;
    if (!h || n > 100) return; // a script that keeps fighting back wins after 100 rounds
    if (dir && h.getAttribute('dir') !== dir) { h.setAttribute('dir', dir); n++; }
    if (lang && h.getAttribute('lang') !== lang) { h.setAttribute('lang', lang); n++; }
    const b = document.body, bd = b?.getAttribute('dir');
    if (dir && bd && bd !== dir && bd !== 'auto') { b.removeAttribute('dir'); n++; }
  };
  let root = null, body = null;
  const mo = new MutationObserver(() => { fix(); watch(); });
  const watch = () => {
    const h = document.documentElement, b = document.body;
    if (h && h !== root) { root = h; mo.observe(h, { attributes: true, attributeFilter: ['dir', 'lang'], childList: true }); }
    if (b && b !== body) { body = b; mo.observe(b, { attributes: true, attributeFilter: ['dir'] }); }
  };
  mo.observe(document, { childList: true });
  fix(); watch();
}

/** A new context with --dir / --lang applied to every page it opens. */
async function newContext(options) {
  const context = await browser.newContext(options);
  if (dir || lang) await context.addInitScript(pseudoDir, { dir, lang });
  return context;
}

/**
 * A screenshot of a right-to-left page as it shows. Playwright places a shot at the scroll position the page reports,
 * which in a right-to-left page that overflows sideways counts from the start (right) edge, while Chromium's capture
 * counts from the far left of the overflow: the shot came out shifted by the overflow, the start of every line
 * missing, and an element shot blank. Such a page is shot through CDP from the start edge of its layout viewport (at
 * a phone width whose layout viewport widened, that is where a left-to-right capture starts too: the start edge).
 * Every other page is shot by Playwright as before. Returns null, or where the shot starts relative to the layout
 * viewport ({dx, dy}: a client x of 0 is at dx in the shot), so the flat-image check reads the right pixels.
 */
async function shoot(page, file, { fullPage = false, el = null } = {}) {
  const pw = async () => { await (el ? el.screenshot({ path: file }) : page.screenshot({ path: file, fullPage })); return null; };
  const rtl = await page.evaluate(() => getComputedStyle(document.body || document.documentElement).direction === 'rtl').catch(() => false);
  if (!rtl) return pw();
  const cdp = await page.context().newCDPSession(page).catch(() => null);
  try {
    const m = cdp && await cdp.send('Page.getLayoutMetrics').catch(() => null);
    if (!m) return await pw();
    const lv = m.cssLayoutViewport, vv = m.cssVisualViewport;
    const x = lv.pageX + lv.clientWidth - vv.clientWidth, y = lv.pageY + vv.offsetY;
    if (Math.abs(x - vv.pageX) < 1 && Math.abs(y - vv.pageY) < 1) return await pw();
    // This session does not carry Playwright's device scale factor: the clip scales by it, as Playwright's shots do.
    const dpr = await page.evaluate(() => devicePixelRatio).catch(() => 1);
    let clip = { x, y, width: vv.clientWidth, height: vv.clientHeight, scale: dpr * vv.scale };
    if (el) {
      const r = await el.boundingBox();
      if (!r?.width || !r?.height) throw new Error('element not visible');
      clip = { x: r.x + lv.pageX, y: r.y + lv.pageY, width: r.width, height: r.height, scale: dpr };
    } else if (fullPage) clip = { x, y: 0, width: vv.clientWidth, height: m.cssContentSize.height, scale: dpr };
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: true });
    await writeFile(file, Buffer.from(data, 'base64'));
    return { dx: lv.pageX - clip.x, dy: lv.pageY - clip.y };
  } finally {
    await cdp?.detach().catch(() => {});
  }
}

/**
 * Safe-area insets at phone widths, only when the page opts in with viewport-fit=cover (S8: without it iOS keeps the
 * page inside the safe area and env() is 0, and the CDP override ignores viewport-fit). Returns the note for the line.
 */
async function safeArea(page, mobile) {
  if (!mobile || !insets) return null;
  const meta = await page.evaluate(() => [...document.querySelectorAll('meta[name="viewport" i]')].map((m) => m.content).join(',')).catch(() => '');
  if (!/viewport-fit\s*=\s*cover/i.test(meta)) return null;
  const [top, bottom, left, right] = insets;
  const cdp = await page.context().newCDPSession(page);
  const ok = await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top, topMax: top, bottom, bottomMax: bottom, left, leftMax: left, right, rightMax: right } }).then(() => true, () => false);
  if (!ok) return 'viewport-fit=cover, but this Chromium cannot emulate safe-area insets (no Emulation.setSafeAreaInsetsOverride): bars were captured with env() at 0';
  page.__cdp = cdp; // kept attached: the override lives as long as its session
  await page.waitForTimeout(150);
  return `safe-area insets ${top}/${bottom}${left || right ? `/${left}/${right}` : ''} px emulated (viewport-fit=cover): bar controls in the top ${top} or bottom ${bottom} px sit under the status bar or the home indicator`;
}

await mkdir(outDir, { recursive: true });
if (a.headed && process.platform === 'linux' && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) {
  console.error('--headed needs a display and none is set (DISPLAY is empty): run under xvfb-run, or drop --headed');
}
const { browser } = await launch({ chrome: a.chrome, gpu: !!a.gpu, headless: !a.headed });
const askRenderer = !!(a.gpu || a.headed);
let rendererShown = false;

try {
  for (const p of paths) {
    for (const width of widths) {
     try {
      const mobile = width < 768;
      const h0 = Number(a.height) || (mobile ? 844 : 900);
      const context = await newContext({
        viewport: { width, height: h0 },
        deviceScaleFactor: Number(a.dpr) || (mobile ? 2 : 1),
        isMobile: mobile,
        hasTouch: mobile,
        reducedMotion: a['reduced-motion'] ? 'reduce' : 'no-preference',
        colorScheme: a.dark ? 'dark' : 'light',
        forcedColors: a['forced-colors'] ? 'active' : 'none',
        javaScriptEnabled: !a['no-js'],
      });
      const page = await context.newPage();
      const url = urlFor(base, p);
      await open(page, url);
      // A bare SVG (the logo, opened directly) has no body for the capture steps to work on: re-host it in a
      // minimal HTML page with the same base URL, so its own references still resolve.
      const svgDoc = await page.evaluate(() => (document.documentElement instanceof SVGElement ? document.documentElement.outerHTML : null)).catch(() => null);
      if (svgDoc && /<text[\s>]/.test(svgDoc)) {
        const fams = [...new Set([...svgDoc.matchAll(/font-family\s*[:=]\s*"?([^;">]+)/g)].map((m) => m[1].replace(/['"]/g, '').trim()))].join(', ');
        console.log(`  ⚠ ${p} draws text with live <text>${fams ? ` in ${fams}` : ''}: it renders in whatever font the viewer has. Outline the wordmark for a logo.`);
      }
      if (svgDoc) await page.goto('about:blank').then(() => page.setContent(`<!doctype html><html><head><base href="${url}"><style>html,body{margin:0;background:#fff}svg{display:block;max-width:100%;height:auto}</style></head><body>${svgDoc}</body></html>`, { waitUntil: 'load' }));
      // With JavaScript off no init script runs: set them once the page is parsed (its own scripts do not run either).
      if ((dir || lang) && a['no-js']) await page.evaluate(pseudoDir, { dir, lang }).catch(() => {});
      const inset = await safeArea(page, mobile);
      await settle(page, { js: !a['no-js'] });
      const slug = slugFor(p);
      const stem = path.join(outDir, `${slug}-${width}${tag}${label}`);

      await shoot(page, `${stem}-fold.png`);

      let pinned = 0, fullH;
      if (mode === 'grow') {
        ({ pinned, height: fullH } = await growToDocument(page, width, MAX_H));
        await page.waitForTimeout(250);
      } else {
        fullH = await page.evaluate(() => document.documentElement.scrollHeight);
      }
      await finishMotion(page);
      if (!a['no-js']) await decodeImages(page); // its in-page timers never fire without JavaScript
      const shift = await shoot(page, `${stem}.png`, { fullPage: mode === 'fullpage' || fullH > MAX_H });
      const dpr = Number(a.dpr) || (mobile ? 2 : 1);
      const flat = await flatImages(page, `${stem}.png`, dpr, shift).catch(() => null);
      for (const v of variants) {
        // Pin colours first: once text is transparent, currentColor resolves to transparent too.
        if (v === 'no-text') await page.evaluate(() => {
          for (const el of document.querySelectorAll('body *')) {
            const cs = getComputedStyle(el);
            if ((cs.webkitBackgroundClip || cs.backgroundClip) === 'text') { el.style.setProperty('background', 'none', 'important'); continue; }
            // Everything drawn in currentColor that is not a glyph keeps its colour: SVG keeps its own `color`
            // (icons, marks), other elements keep their background, border and outline colours (masked shapes).
            if (el.closest('symbol, defs')) continue; // sprite sources: <use> clones inherit from where they are used
            const props = el instanceof SVGElement ? ['color'] : ['background-color', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'outline-color'];
            for (const prop of props) el.style.setProperty(prop, cs.getPropertyValue(prop), 'important');
          }
        });
        const tag = await page.addStyleTag({ content: VARIANTS[v] });
        // Gradient text is painted as a clipped background, which CSS colour cannot remove.
        await page.waitForTimeout(100);
        await shoot(page, `${stem}-${v}.png`, { fullPage: mode === 'fullpage' || fullH > MAX_H });
        await tag.evaluate((n) => n.remove());
      }

      await page.setViewportSize({ width, height: h0 });
      const over = await page.evaluate(overflowCulprits);
      const layoutW = await page.evaluate(() => innerWidth);
      if (!rendererShown && (askRenderer || await hasCanvas(page))) {
        rendererShown = true;
        await printRenderer(context);
      }
      // Text past the viewport edge with nothing but html/body (or nothing) clipping it. What the reader can still
      // reach is not cut: without a page-level clip the page scrolls sideways to it (the overflow warning names it),
      // and a phone whose layout viewport widened shows it zoomed out. Past the start edge (left in a left-to-right
      // page) nothing scrolls, clip or not.
      const edge = over.cutAtEdge?.length ? await page.evaluate(() => ({
        clip: [document.documentElement, document.body].some((e) => e && getComputedStyle(e).overflowX !== 'visible'),
        rtl: getComputedStyle(document.body || document.documentElement).direction === 'rtl',
      })).catch(() => ({ clip: true, rtl: false })) : { clip: false, rtl: false };
      const reach = edge.clip ? Math.max(0, layoutW - over.viewport) : Math.max(0, over.by); // px past the end edge still in reach
      const past = (over.cutAtEdge || []).map((c) => {
        const side = c.edge === 'left' || !(c.right > over.viewport + 1) ? 'left' : 'right';
        const px = Math.abs(c.past ?? (side === 'right' ? c.right - over.viewport : NaN)); // px past that edge
        return { ...c, side, px: px > 0 ? px : null };
      });
      // Start edge: always cut. End edge: cut when it lies beyond what the reader can reach.
      const isCut = (c) => (c.side === 'right') === edge.rtl || (c.px == null ? edge.clip && reach === 0 : c.px > reach + 1);
      const cut = past.filter(isCut);
      // Text that overflows its own box widens the page without any element box doing so: name it there (the text the
      // reader can reach, or else the cut text, which a body-only clip lets widen the document all the same).
      const reachable = past.filter((c) => !isCut(c));
      const culprits = over.culprits.length ? over.culprits : reachable.length ? reachable : past;
      const note = [`${fullH}px tall`, dir || lang ? `html ${[dir && `dir="${dir}"`, lang && `lang="${lang}"`].filter(Boolean).join(' ')} set by the capture` : null, inset,
        pinned ? `${pinned} viewport-height elements pinned` : null,
        mobile && layoutW > width ? `⚠ layout viewport widened to ${layoutW}px — phones show this page zoomed out` : null,
        over.overflow ? `⚠ horizontal overflow by ${over.by}px${culprits.length ? `: ${culprits.map((c) => c.selector).join(', ')}` : ''}` : null,
        cut.length ? `⚠ text past the viewport ${edge.clip ? 'under a page-level clip' : 'where no scroll reaches it'}: ${cut.map((c) => `${c.selector} (${c.px == null ? `${c.side} edge` : `${Math.round(c.px)}px${c.side === 'left' ? ' left' : ''}`})`).join(', ')}` : null,
        flat?.length ? `⚠ ${flat.length} image(s) painted flat (${flat.slice(0, 3).join(', ')}) — either something on the page covers them, or the capture failed to rasterise them: check in a browser, or retry with --mode ${mode === 'grow' ? 'fullpage' : 'grow'}` : null,
        variants.length ? `variants: ${variants.join(', ')}` : null].filter(Boolean).join(' · ');
      console.log(`${stem}.png  (${note})`);

      await context.close();

      const selectors = asList(a.element);
      if (selectors.length) {
        // Artwork is judged element by element at high density — at page scale a
        // clipped label or a mark outside its frame looks like texture.
        const hi = await newContext({ viewport: { width, height: h0 }, deviceScaleFactor: 3, isMobile: mobile, hasTouch: mobile });
        const ep = await hi.newPage();
        await open(ep, url);
        if (inset) await safeArea(ep, mobile);
        await settle(ep, { js: !a['no-js'] });
        for (const sel of selectors) {
          const els = await ep.$$(sel);
          for (const [i, el] of els.entries()) {
            const f = `${stem}-el-${sel.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '')}-${i + 1}.png`;
            // Sticky and fixed bars that are not part of the element would be painted across it.
            await el.evaluate((t) => { for (const o of document.querySelectorAll('body *')) { const p = getComputedStyle(o).position; if ((p === 'fixed' || p === 'sticky') && !o.contains(t) && !t.contains(o)) { o.dataset.capHidden = o.style.visibility; o.style.visibility = 'hidden'; } } });
            const ok = await shoot(ep, f, { el }).then(() => true, () => false);
            await el.evaluate(() => { for (const o of document.querySelectorAll('[data-cap-hidden]')) { o.style.visibility = o.dataset.capHidden; delete o.dataset.capHidden; } });
            if (ok) console.log(`  ${f}`);
          }
        }
        await hi.close();
      }
     } catch (e) {
      for (const c of browser.contexts()) await c.close().catch(() => {});
      const why = /Execution context was destroyed|navigat/i.test(String(e?.message))
        ? 'the page kept reloading (a dev server optimising dependencies?) — capture a production build, or open the page once first'
        : String(e?.message || e).split('\n')[0];
      console.error(`✗ ${p} at ${width}px not captured: ${why}`);
     }
    }
  }
} finally {
  await browser.close();
}
