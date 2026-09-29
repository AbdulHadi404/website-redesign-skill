#!/usr/bin/env node
/**
 * Lab Core Web Vitals under "cheap Android" emulation, with attribution, via Playwright + CDP.
 *
 *   CHROME_PATH=/path/to/chrome node measure-vitals.mjs http://localhost:5055/bad \
 *      [--device "Moto G4"] [--cpu 4] [--net slow4g|fast4g|none] [--click "#buy"] [--trace out.json] [--runs 3]
 *
 * - Network: Network.emulateNetworkConditions with Lighthouse's "applied" slow-4G numbers
 *   (562.5 ms request latency, 1.47 Mbps down, 675 kbps up). This is request-level throttling,
 *   not packet-level — it slows every request equally and ignores connection reuse.
 * - CPU: Emulation.setCPUThrottlingRate (4 = Lighthouse's mobile default on a fast desktop host;
 *   calibrate: a host with benchmarkIndex ~1000–1800 needs ~4x to approximate a Moto G Power).
 * - Metrics: web-vitals (attribution build) injected before any page script, reportAllChanges,
 *   plus a raw PerformanceObserver cross-check. INP needs real input: page.click() dispatches
 *   trusted events through CDP, so Event Timing entries are produced.
 * - --trace writes a Chrome trace you can drop into DevTools > Performance.
 */
import { chromium, devices } from 'playwright';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i === -1 ? d : args[i + 1]; };
const url = args.find((a) => /^https?:/.test(a)) ?? 'http://localhost:5055/';
const deviceName = opt('device', 'Moto G4');
const cpu = Number(opt('cpu', '4'));
const net = opt('net', 'slow4g');
const clickSel = opt('click', null);
const tracePath = opt('trace', null);
const runs = Number(opt('runs', '1'));

const executablePath = [process.env.CHROME_PATH, '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find((p) => p && existsSync(p));
// The IIFE build is not in the package "exports" map, so resolve the package root and read the file.
const require = createRequire(import.meta.url);
const wvRoot = path.dirname(require.resolve('web-vitals/attribution')); // -> node_modules/web-vitals/dist
const wv = readFileSync(path.join(wvRoot, 'web-vitals.attribution.iife.js'), 'utf8');

const NET = {
  slow4g: { latency: 562.5, downloadThroughput: (1474.56 * 1024) / 8, uploadThroughput: (675 * 1024) / 8 },
  fast4g: { latency: 150, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8 },
};

const init = `${wv}
window.__vitals = {};
const keep = (m) => {
  const a = m.attribution || {};
  window.__vitals[m.name] = { value: Math.round(m.name === 'CLS' ? m.value * 1000 : m.value) / (m.name === 'CLS' ? 1000 : 1), rating: m.rating,
    target: a.target || a.largestShiftTarget || a.interactionTarget || undefined,
    detail: m.name === 'LCP' ? { ttfb: Math.round(a.timeToFirstByte), loadDelay: Math.round(a.resourceLoadDelay), loadDuration: Math.round(a.resourceLoadDuration), renderDelay: Math.round(a.elementRenderDelay), url: a.url }
          : m.name === 'INP' ? { input: Math.round(a.inputDelay), processing: Math.round(a.processingDuration), presentation: Math.round(a.presentationDelay), type: a.interactionType }
          : m.name === 'CLS' ? { largestShiftTime: Math.round(a.largestShiftTime || 0), sources: (a.largestShiftEntry?.sources || []).length } : undefined };
};
for (const f of ['onLCP','onCLS','onINP','onFCP','onTTFB']) webVitals[f](keep, { reportAllChanges: true });
// Raw cross-check without the library
window.__raw = { lcp: 0, cls: 0, maxEvent: 0 };
new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__raw.lcp = Math.round(e.startTime); }).observe({ type: 'largest-contentful-paint', buffered: true });
new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__raw.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.interactionId) window.__raw.maxEvent = Math.max(window.__raw.maxEvent, e.duration); }).observe({ type: 'event', buffered: true, durationThreshold: 16 });
`;

const d = { ...devices[deviceName] };
delete d.defaultBrowserType; // webkit descriptors (iPhone/iPad) still work in Chromium for viewport/DPR/touch
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
const results = [];
for (let r = 0; r < runs; r++) {
  const context = await browser.newContext(d);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  if (NET[net]) await cdp.send('Network.emulateNetworkConditions', { offline: false, ...NET[net] });
  if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  await page.addInitScript(init);
  if (tracePath && r === 0) await browser.startTracing(page, { path: tracePath, screenshots: true });
  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'load', timeout: 120_000 });
  const loadMs = Date.now() - t0;
  await page.waitForTimeout(2500); // let late shifts (banners, fonts) happen
  if (clickSel) {
    for (let i = 0; i < 3; i++) { await page.click(clickSel); await page.waitForTimeout(600); }
  }
  // Hide the page so CLS/INP finalise as they would when a real user leaves.
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(200);
  const out = await page.evaluate(() => ({ vitals: window.__vitals, raw: { ...window.__raw, cls: Math.round(window.__raw.cls * 1000) / 1000 } }));
  if (tracePath && r === 0) await browser.stopTracing();
  results.push({ run: r + 1, loadMs, ...out });
  await context.close();
}
await browser.close();
console.log(JSON.stringify({ url, device: deviceName, cpu, net, results }, null, 2));
