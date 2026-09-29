#!/usr/bin/env node
/**
 * Responsive sweep: loads a URL at a set of viewport classes and reports, per width,
 *   - horizontal overflow and the ROOT-CAUSE elements (outermost element whose box passes the
 *     viewport edge while its parent's does not), with selector, width and right edge;
 *   - touch targets under 24x24 CSS px (WCAG 2.2 SC 2.5.8 minimum) and under 44x44 (comfort);
 *   - text rendered under 12px;
 *   - scroll containers that are not keyboard-reachable (no tabindex, no focusable child);
 *   - hover-only affordances are NOT auto-detectable; check them by hand on touch widths.
 * Then a zoom check: for each h1/h2, the physical size at 100/200/400% browser zoom
 * (zoom = viewport width / z at DPR z). If text cannot reach 2x its 100% size at any zoom,
 * it fails WCAG 1.4.4 (typical cause: font-size in vw with no rem component).
 *
 *   CHROME_PATH=... node responsive-sweep.mjs http://localhost:5055/bad [--shots dir] [--widths 320,360,...]
 */
import { chromium, devices } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i === -1 ? d : args[i + 1]; };
const url = args.find((a) => /^https?:/.test(a)) ?? 'http://localhost:5055/';
const shots = opt('shots', null);
const executablePath = [process.env.CHROME_PATH, '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find((p) => p && existsSync(p));

// Viewport classes (CSS px). Phones use touch + mobile emulation; the rest are desktop.
const CLASSES = [
  { name: 'reflow-320 (WCAG 1.4.10 / 1280@400%)', w: 320, h: 640, mobile: true },
  { name: 'android-360', w: 360, h: 780, mobile: true },
  { name: 'iphone-375 (SE/mini)', w: 375, h: 667, mobile: true },
  { name: 'iphone-390/393', w: 393, h: 852, mobile: true },
  { name: 'android-412 (Pixel/Galaxy+)', w: 412, h: 915, mobile: true },
  { name: 'iphone-430 (Pro Max)', w: 430, h: 932, mobile: true },
  { name: 'phone-landscape-844x390', w: 844, h: 390, mobile: true },
  { name: 'fold-inner-~673', w: 673, h: 841, mobile: true },
  { name: 'tablet-768', w: 768, h: 1024, mobile: true },
  { name: 'tablet-820/834', w: 820, h: 1180, mobile: true },
  { name: 'tablet-land/small-laptop-1024', w: 1024, h: 768, mobile: false },
  { name: 'laptop-1280', w: 1280, h: 800, mobile: false },
  { name: 'laptop-1366', w: 1366, h: 768, mobile: false },
  { name: 'laptop-1440', w: 1440, h: 900, mobile: false },
  { name: 'laptop-1536 (1920@125%)', w: 1536, h: 864, mobile: false },
  { name: 'desktop-1920', w: 1920, h: 1080, mobile: false },
];
const only = opt('widths', null)?.split(',').map(Number);
const classes = only ? CLASSES.filter((c) => only.includes(c.w)) : CLASSES;

const probe = () => {
  const vw = document.documentElement.clientWidth;
  const sel = (el) => {
    if (el.id) return `#${el.id}`;
    const cls = [...el.classList].slice(0, 2).map((c) => `.${c}`).join('');
    const parent = el.parentElement && el.parentElement !== document.body ? sel(el.parentElement) + ' > ' : '';
    return parent + el.tagName.toLowerCase() + cls;
  };
  // An element inside a scroll/clip container (below body) is not a page-overflow cause.
  const clippedBelowBody = (el) => {
    for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX;
      if (ox !== 'visible') return true;
    }
    return false;
  };
  const overflowing = [];
  for (const el of document.body.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || getComputedStyle(el).position === 'fixed') continue;
    if ((r.right > vw + 1 || r.left < -1) && !clippedBelowBody(el)) overflowing.push(el);
  }
  // Root causes: overflowing elements whose parent does not itself overflow.
  const set = new Set(overflowing);
  const roots = overflowing.filter((el) => !set.has(el.parentElement)).slice(0, 6).map((el) => {
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    const ps = el.parentElement ? getComputedStyle(el.parentElement) : null;
    const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    const why = [];
    if (parseFloat(cs.minWidth) > vw) why.push(`min-width:${cs.minWidth}`);
    if (Math.round(r.width) >= vw && cs.boxSizing === 'content-box' && pad > 0) why.push('full width + padding in content-box (100vw/100% + padding?)');
    if (ps && ps.display.includes('flex') && ps.flexWrap === 'nowrap') why.push('child of a non-wrapping flex row');
    if (ps && ps.display.includes('grid')) why.push(`grid track (${ps.gridTemplateColumns.slice(0, 40)})`);
    if (cs.whiteSpace === 'nowrap') why.push('white-space:nowrap');
    if (el.tagName === 'IMG' || el.tagName === 'VIDEO' || el.tagName === 'IFRAME') why.push('media without max-width:100%');
    if (el.tagName === 'PRE' || el.tagName === 'TABLE') why.push(`${el.tagName.toLowerCase()} needs its own scroll container`);
    return { el: sel(el), width: Math.round(r.width), right: Math.round(r.right), why: why.join('; ') };
  });
  // Targets
  const interactive = [...document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, [role=button], [tabindex]:not([tabindex="-1"])')]
    .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
  const inline = (el) => el.tagName === 'A' && getComputedStyle(el).display === 'inline' && el.closest('p, li, td');
  const small24 = [], small44 = [];
  for (const el of interactive) {
    if (inline(el)) continue; // SC 2.5.8 exempts targets in a sentence
    const r = el.getBoundingClientRect();
    if (r.width < 24 || r.height < 24) small24.push(`${sel(el)} ${Math.round(r.width)}x${Math.round(r.height)}`);
    else if (r.width < 44 || r.height < 44) small44.push(`${sel(el)} ${Math.round(r.width)}x${Math.round(r.height)}`);
  }
  // Tiny text
  const tiny = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const n = walker.currentNode; if (!n.textContent.trim()) continue;
    const fs = parseFloat(getComputedStyle(n.parentElement).fontSize);
    if (fs < 12) tiny.add(`${sel(n.parentElement)} ${fs}px`);
  }
  // Scroll regions without keyboard access
  const scrollers = [...document.querySelectorAll('body *')].filter((el) => {
    const ox = getComputedStyle(el).overflowX; return (ox === 'auto' || ox === 'scroll') && el.scrollWidth > el.clientWidth + 1;
  }).map((el) => ({ el: sel(el), focusable: el.tabIndex >= 0 || !!el.querySelector('a[href],button,input,select,textarea,[tabindex]'), labelled: !!(el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')) }));
  return {
    overflowPx: document.documentElement.scrollWidth - vw,
    roots, small24: small24.length, small24eg: small24.slice(0, 3), small44: small44.length, tinyText: [...tiny].slice(0, 3),
    scrollers,
  };
};

const zoomProbe = () => [...document.querySelectorAll('h1, h2')].slice(0, 3).map((el) => ({
  text: el.textContent.trim().slice(0, 30), px: parseFloat(getComputedStyle(el).fontSize) }));

const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
if (shots) await mkdir(shots, { recursive: true });
console.log(`Responsive sweep: ${url}`);
for (const c of classes) {
  const ctx = await browser.newContext({ viewport: { width: c.w, height: c.h }, deviceScaleFactor: c.mobile ? 2 : 1, isMobile: c.mobile, hasTouch: c.mobile,
    userAgent: c.mobile ? devices['Pixel 7'].userAgent : undefined });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200); // late banners/injections
  const r = await page.evaluate(probe);
  if (shots) await page.screenshot({ path: `${shots}/${c.w}x${c.h}.png` });
  const flag = r.overflowPx > 0 ? `OVERFLOW +${r.overflowPx}px` : 'ok';
  console.log(`\n[${String(c.w).padStart(4)}] ${c.name.padEnd(38)} ${flag}`);
  for (const o of r.roots) console.log(`       cause: ${o.el}  width=${o.width} right=${o.right} ${o.why}`);
  if (c.mobile && (r.small24 || r.small44)) console.log(`       targets <24px: ${r.small24} ${r.small24eg.join(' | ')}; 24–44px: ${r.small44}`);
  if (r.tinyText.length) console.log(`       text <12px: ${r.tinyText.join(' | ')}`);
  for (const s of r.scrollers) if (!s.focusable || !s.labelled) console.log(`       scroll region ${s.el}: focusable=${s.focusable} labelled=${s.labelled}`);
  await ctx.close();
}

// Zoom check at a 1280 window: zoom z => CSS viewport 1280/z, DPR z; physical size = css px * z.
const base = {};
console.log('\nZoom check (1280 window; physical px = CSS px x zoom):');
for (const z of [1, 2, 4]) {
  const ctx = await browser.newContext({ viewport: { width: Math.round(1280 / z), height: Math.round(800 / z) }, deviceScaleFactor: z });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'load' });
  const hs = await page.evaluate(zoomProbe);
  for (const h of hs) {
    base[h.text] ??= h.px;
    const phys = h.px * z;
    console.log(`  ${String(z * 100).padStart(3)}%  "${h.text}"  ${h.px.toFixed(1)} CSS px -> ${phys.toFixed(1)} physical (${(phys / base[h.text]).toFixed(2)}x)`);
  }
  await ctx.close();
}
await browser.close();
