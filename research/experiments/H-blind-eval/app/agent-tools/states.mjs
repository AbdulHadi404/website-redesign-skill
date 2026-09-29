// Widget-state captures for the herd dashboard (Phase 1 "before" and Phase 6 "after").
// The skill's capture.mjs renders whole pages only; states have to be driven, so this
// script drives them (visual-qa.md: "Render every state of every widget").
//
//   PW=/path/to/playwright-core CHROME_PATH=... node audit/tools/states.mjs \
//      --base http://localhost:5762 --out captures/before-states --label before
//
// Every scenario uses ids that exist in both versions (#herd-search, #cow-panel,
// #mark-checked, #toast, #note) so the same script covers before and after.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]);
  return acc;
}, []));
const base = args.base || 'http://localhost:5762';
const out = args.out || 'captures/states';
const label = args.label || 'state';
const only = args.only ? String(args.only).split(',') : null;
mkdirSync(out, { recursive: true });

const require = createRequire(import.meta.url);
const pwPath = process.env.PW || '/home/user/website-redesign-skill/skills/website-redesign/scripts/node_modules/playwright-core';
const { chromium } = require(pwPath);
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });

const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const desk = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function open(ctxOpts, { route, scheme, offlineAfterLoad, storage } = {}) {
  const ctx = await browser.newContext({ ...ctxOpts, colorScheme: scheme || 'light', serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  if (storage) await page.addInitScript(storage);
  if (route) await page.route('**/data/herd.json', route);
  await page.goto(base + '/app/', { waitUntil: 'domcontentloaded' });
  await wait(600);
  return { ctx, page, errors };
}
async function shot(page, name, full = false) {
  const file = path.join(out, `${name}-${label}.png`);
  await page.screenshot({ path: file, fullPage: full });
  console.log(file);
}
const click = (page, sel) => page.$eval(sel, (el) => el.click());

const scenarios = {
  // Idle and first view
  async 'idle-390'() { const { page, ctx } = await open(phone); await shot(page, 'idle-390'); await ctx.close(); },
  // Loading: hold the JSON for 4 s and shoot at 300 ms
  async 'loading-390'() {
    const { page, ctx } = await open(phone, { route: async (r) => { await wait(4000); await r.continue(); } });
    await wait(100); await shot(page, 'loading-390'); await ctx.close();
  },
  // No signal on first load: the request fails, nothing cached
  async 'offline-nocache-390'() {
    const { page, ctx, errors } = await open(phone, { route: (r) => r.abort('internetdisconnected') });
    await wait(400); await shot(page, 'offline-nocache-390'); console.log('  page errors:', errors.join(' | ') || 'none'); await ctx.close();
  },
  // No signal but a copy from an earlier sync exists (after only; before has no cache)
  async 'offline-cached-390'() {
    // first visit online to fill the cache, then fail the request
    const ctx = await browser.newContext({ ...phone, serviceWorkers: 'block' });
    const page = await ctx.newPage();
    await page.goto(base + '/app/'); await wait(700);
    await page.route('**/data/herd.json', (r) => r.abort('internetdisconnected'));
    await page.reload(); await wait(700);
    await shot(page, 'offline-cached-390'); await ctx.close();
  },
  // Search by tag digits, by name, and with no match
  async 'search-390'() {
    const { page, ctx } = await open(phone);
    await page.fill('#herd-search', '1629'); await wait(200); await shot(page, 'search-tag-390');
    await page.fill('#herd-search', 'ros'); await wait(200); await shot(page, 'search-name-390');
    await page.fill('#herd-search', 'zzz'); await wait(200); await shot(page, 'search-empty-390');
    await ctx.close();
  },
  // Cow detail open, then mark checked (toast / undo)
  async 'detail-390'() {
    const { page, ctx } = await open(phone);
    const row = (await page.$('[data-tag="IE1111"] button, [data-tag="IE1111"]'));
    await row.evaluate((el) => el.click()); await wait(350);
    await shot(page, 'detail-open-390');
    await click(page, '#mark-checked'); await wait(350);
    await shot(page, 'detail-checked-390');
    await ctx.close();
  },
  async 'detail-1440'() {
    const { page, ctx } = await open(desk);
    const row = (await page.$('[data-tag="IE1111"] button, [data-tag="IE1111"]'));
    await row.evaluate((el) => el.click()); await wait(350);
    await shot(page, 'detail-open-1440');
    await ctx.close();
  },
  // Keyboard focus on the search field
  async 'focus-390'() {
    const { page, ctx } = await open(phone);
    await page.focus('#herd-search'); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab');
    await wait(150); await shot(page, 'focus-search-390'); await ctx.close();
  },
  async 'focus-1440'() {
    const { page, ctx } = await open(desk);
    for (let i = 0; i < 4; i++) await page.keyboard.press('Tab');
    await wait(150); await shot(page, 'focus-tab4-1440'); await ctx.close();
  },
  // Dark scheme (5 am, dark yard)
  async 'dark-390'() { const { page, ctx } = await open(phone, { scheme: 'dark' }); await shot(page, 'dark-390'); await ctx.close(); },
  // Note field filled
  async 'note-390'() {
    const { page, ctx } = await open(phone);
    await page.fill('#note', 'Rosie – strip front left quarter before cups on');
    await page.$eval('#note', (el) => el.scrollIntoView({ block: 'center' })); await wait(150);
    await shot(page, 'note-filled-390'); await ctx.close();
  },

  // ---- after-only scenarios (need the redesign's ids; they fail harmlessly on "before") ----
  async 'reopen-checked-390'() {
    const { page, ctx } = await open(phone);
    await page.$eval('#alerts [data-tag="IE1111"]', (el) => el.click()); await wait(300);
    await click(page, '#mark-checked'); await wait(400);
    await shot(page, 'toast-undo-390');
    await page.$eval('#alerts [data-tag="IE1111"]', (el) => el.click()); await wait(350);
    await shot(page, 'detail-already-checked-390');
    await ctx.close();
  },
  async 'kbd-numeric-390'() {
    const { page, ctx } = await open(phone);
    await click(page, '#kbd-toggle'); await page.fill('#herd-search', '2'); await wait(200);
    await shot(page, 'search-keypad-on-390'); await ctx.close();
  },
  async 'all-checked-390'() {
    const { page, ctx } = await open(phone, { storage: () => { try { localStorage.setItem('ml.checked.v1', JSON.stringify({ 'Hegarty Farm, Mallow|2026-09-28|Morning': { IE1111: '05:44', IE1629: '05:46', IE1296: '05:47', IE2147: '05:49', IE1814: '05:50' } })); } catch {} } });
    await shot(page, 'all-checked-390'); await ctx.close();
  },
  async 'no-flags-390'() {
    const { page, ctx } = await open(phone, { route: async (r) => { const res = await r.fetch(); const d = await res.json(); d.herd.forEach((c) => { c.status = 'ok'; }); await r.fulfill({ response: res, json: d }); } });
    await shot(page, 'no-flags-390'); await ctx.close();
  },
  async 'many-flags-long-names-390'() {
    const { page, ctx } = await open(phone, { route: async (r) => { const res = await r.fetch(); const d = await res.json(); d.herd.slice(0, 12).forEach((c, i) => { c.status = i % 3 ? 'watch' : 'alert'; }); d.herd[0].name = 'Ballymacoda Buttercup the Second of Knockmealdown View'; d.herd[1].tag = 'IE 12 3456 7890'; await r.fulfill({ response: res, json: d }); } });
    await shot(page, 'many-flags-long-names-390'); await page.screenshot({ path: path.join(out, `many-flags-long-names-390-full-${label}.png`), fullPage: true }); await ctx.close();
  },
  async 'error-500-cached-390'() {
    const ctx = await browser.newContext({ ...phone, serviceWorkers: 'block' });
    const page = await ctx.newPage();
    await page.goto(base + '/app/'); await wait(700);
    await page.route('**/data/herd.json', (r) => r.fulfill({ status: 500, body: 'oops' }));
    await page.reload(); await wait(700);
    await shot(page, 'error-500-cached-390'); await ctx.close();
  },
  async 'stale-cached-390'() {
    const ctx = await browser.newContext({ ...phone, serviceWorkers: 'block' });
    const page = await ctx.newPage();
    await page.addInitScript(() => { try { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); } } catch {} });
    await page.goto(base + '/app/'); await wait(700);
    await page.evaluate(() => { const v = JSON.parse(localStorage.getItem('ml.herd.v1')); v.data.date = '2026-09-27'; v.data.milking = 'Evening'; v.at = '2026-09-27T17:55:00.000Z'; localStorage.setItem('ml.herd.v1', JSON.stringify(v)); });
    await page.route('**/data/herd.json', (r) => r.abort('internetdisconnected'));
    await page.reload(); await wait(700);
    await shot(page, 'stale-cached-390'); await ctx.close();
  },
  async 'note-states-390'() {
    const { page, ctx } = await open(phone);
    await page.$eval('#note-form button[type=submit]', (el) => el.click()); await wait(150);
    await page.$eval('#note', (el) => el.scrollIntoView({ block: 'center' })); await shot(page, 'note-error-390');
    await page.fill('#note', 'Rosie: strip front left quarter before cups on'); await page.$eval('#note-form button[type=submit]', (el) => el.click()); await wait(200);
    await page.$eval('#note-form', (el) => el.scrollIntoView({ block: 'center' })); await shot(page, 'note-saved-390');
    await ctx.close();
  },
  async 'sw-offline-reload-390'() {
    const ctx = await browser.newContext({ ...phone, serviceWorkers: 'allow' });
    const page = await ctx.newPage();
    await page.goto(base + '/app/'); await wait(1500);
    await page.reload(); await wait(1200); // second load: service worker controls the page
    const controlled = await page.evaluate(() => !!navigator.serviceWorker && !!navigator.serviceWorker.controller);
    await ctx.setOffline(true);
    await page.reload().catch((e) => console.log('  reload offline failed:', e.message.split('\n')[0])); await wait(1200);
    console.log('  controlled by SW before going offline:', controlled);
    await shot(page, 'sw-offline-reload-390'); await ctx.close();
  },
  async 'dark-1440'() { const { page, ctx } = await open(desk, { scheme: 'dark' }); await shot(page, 'dark-1440'); await ctx.close(); },
  async 'hover-1440'() {
    const { page, ctx } = await open(desk);
    await page.hover('#herd-body tr:nth-child(3)'); await wait(100); await shot(page, 'hover-row-1440'); await ctx.close();
  },
  async 'refresh-busy-390'() {
    const { page, ctx } = await open(phone);
    await page.route('**/data/herd.json', async (r) => { await wait(3000); await r.continue(); });
    await click(page, '#sync-btn'); await wait(150); await shot(page, 'refresh-busy-390'); await ctx.close();
  },
};

for (const [name, fn] of Object.entries(scenarios)) {
  if (only && !only.some((o) => name.startsWith(o))) continue;
  try { await fn(); } catch (e) { console.log(`✗ ${name}: ${e.message.split('\n')[0]}`); }
}
await browser.close();
