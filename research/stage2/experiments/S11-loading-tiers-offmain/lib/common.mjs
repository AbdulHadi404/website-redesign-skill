// Shared helpers for the S11 runners.
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

export const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const siteRoot = path.join(here, 'captures/site');
export const resultsDir = path.join(here, 'results');
export const { launch } = await import('/home/user/website-redesign-skill/skills/website-redesign/scripts/lib/env.mjs');

export const median = (xs) => { const s = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
export const pct = (xs, p) => { const s = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b); if (!s.length) return null; return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
export const r1 = (x) => (x == null || !Number.isFinite(x) ? x : Math.round(x * 10) / 10);
export const r0 = (x) => (x == null || !Number.isFinite(x) ? x : Math.round(x));
export const load = () => os.loadavg().map((x) => Math.round(x * 10) / 10);
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function saveResult(name, data) {
  await mkdir(resultsDir, { recursive: true });
  await writeFile(path.join(resultsDir, `${name}.json`), JSON.stringify(data, null, 1));
}
export async function readResult(name) {
  try { return JSON.parse(await readFile(path.join(resultsDir, `${name}.json`), 'utf8')); } catch { return null; }
}

export function env() {
  return { date: new Date().toISOString(), node: process.version, cpus: os.cpus().length, cpuModel: os.cpus()[0]?.model, loadavgAtStart: load() };
}

// A fresh context per run with optional CPU and network throttling.
export const NETS = {
  slow4g: { latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 },
  none: null,
};
export async function newPage(browser, { cpu = 1, net = null, phone = true, cache = true } = {}) {
  const ctx = await browser.newContext(phone ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  if (!cache) await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  if (net) await cdp.send('Network.emulateNetworkConditions', { offline: false, ...net });
  if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  return { ctx, page, cdp };
}
