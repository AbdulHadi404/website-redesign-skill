#!/usr/bin/env node
/**
 * A throttled lab measurement for when Lighthouse cannot run (no npx, no network for its download), and a quick
 * before/after on every page when it can. Phone profile by default: 4× CPU slowdown and "slow 4G" (150 ms RTT,
 * 1.6 Mbps down, 750 kbps up — Lighthouse's mobile simulation), cache disabled, a fresh context per run.
 *
 *   node perf.mjs --base http://localhost:3000 --paths / /pricing [--before http://localhost:4000]
 *                 [--runs 3] [--device phone|desktop] [--cpu 4] [--net slow4g|fast4g|none] [--out perf.md] [--storage seed.json]
 *
 * Per page, the median of the runs (and the range) for:
 *   FCP, LCP (and its element), CLS (largest session window), TBT (long tasks between FCP and load settling,
 *   the lab stand-in for INP), transfer by type, requests, DOM nodes.
 * Flags against the "good" thresholds: LCP ≤ 2.5 s, CLS ≤ 0.1, TBT ≤ 200 ms; with --before, any page that got
 * slower. A local server has no real network distance: the throttling adds it back, roughly. Lab numbers rank
 * builds; they do not predict field data (performance.md §6).
 */
import { writeFile } from 'node:fs/promises';
import { parseArgs, asList, launch, urlFor } from './lib/env.mjs';

const a = parseArgs();
if (!a.base) { console.error('Usage: node perf.mjs --base URL --paths / /pricing [--before URL] [--runs 3] [--device phone|desktop] [--cpu 4] [--net slow4g|fast4g|none] [--out perf.md]'); process.exit(2); }
const paths = asList(a.paths, ['/']);
const runs = Math.max(1, Number(a.runs) || 3);
const device = a.device === 'desktop' ? 'desktop' : 'phone';
const cpu = Number(a.cpu) || (device === 'phone' ? 4 : 1);
const NETS = {
  slow4g: { latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 },
  fast4g: { latency: 40, downloadThroughput: (10 * 1024 * 1024) / 8, uploadThroughput: (3 * 1024 * 1024) / 8 },
  none: null,
};
const net = NETS[a.net || (device === 'phone' ? 'slow4g' : 'none')];
const CTX = device === 'phone'
  ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
  : { viewport: { width: 1350, height: 940 }, deviceScaleFactor: 1 };

// Collected in the page from the first byte: paint, LCP, layout shifts and long tasks.
const OBSERVE = () => {
  window.__perf = { lcp: 0, lcpEl: '', shifts: [], long: [], fcp: 0 };
  const P = window.__perf;
  const obs = (type, fn) => { try { new PerformanceObserver((l) => l.getEntries().forEach(fn)).observe({ type, buffered: true }); } catch { /* unsupported */ } };
  obs('paint', (e) => { if (e.name === 'first-contentful-paint') P.fcp = e.startTime; });
  obs('largest-contentful-paint', (e) => {
    P.lcp = e.startTime;
    const el = e.element;
    P.lcpEl = el ? el.tagName.toLowerCase() + (el.id ? '#' + el.id : el.classList[0] ? '.' + el.classList[0] : '') : '';
  });
  obs('layout-shift', (e) => { if (!e.hadRecentInput) P.shifts.push([e.startTime, e.value]); });
  obs('longtask', (e) => P.long.push([e.startTime, e.duration]));
};

const { browser } = await launch({ chrome: a.chrome });

async function measure(url) {
  const ctx = await browser.newContext(CTX);
  await ctx.addInitScript(OBSERVE);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  if (net) await cdp.send('Network.emulateNetworkConditions', { offline: false, ...net });
  if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  const t0 = Date.now();
  let status = 0, fontsFailed = 0;
  page.on('requestfailed', (r) => { if (r.resourceType() === 'font' || /fonts\.googleapis|\.woff2?(\?|$)/.test(r.url())) fontsFailed++; });
  page.on('response', (r) => { if (r.status() >= 400 && (r.request().resourceType() === 'font' || /fonts\.googleapis/.test(r.url()))) fontsFailed++; });
  try {
    const res = await page.goto(url, { waitUntil: 'load', timeout: 90000 });
    status = res?.status() || 0;
    // Let late work land (hydration, late fonts, lazy content) — and its shifts and long tasks with it.
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);
  } catch (e) {
    await ctx.close();
    return { error: String(e.message || e).split('\n')[0] };
  }
  const m = await page.evaluate(() => {
    const P = window.__perf;
    // CLS: the largest session window (shifts < 1 s apart, window ≤ 5 s).
    let cls = 0, win = 0, start = 0, last = 0;
    for (const [t, v] of P.shifts) { if (t - last > 1000 || t - start > 5000) { win = 0; start = t; } win += v; last = t; cls = Math.max(cls, win); }
    const tbt = P.long.filter(([t]) => t >= P.fcp).reduce((s, [, d]) => s + Math.max(0, d - 50), 0);
    const bytes = {};
    let requests = 0;
    for (const r of performance.getEntriesByType('resource')) {
      requests++;
      const k = /\.(woff2?|ttf|otf)(\?|$)/.test(r.name) ? 'font' : /\.css(\?|$)/.test(r.name) || r.initiatorType === 'css' && /css/.test(r.name) ? 'css' : r.initiatorType === 'script' ? 'js' : r.initiatorType === 'img' || /\.(png|jpe?g|webp|avif|gif|svg)(\?|$)/.test(r.name) ? 'img' : 'other';
      bytes[k] = (bytes[k] || 0) + (r.transferSize || r.encodedBodySize || 0);
    }
    const nav = performance.getEntriesByType('navigation')[0];
    bytes.html = nav ? nav.transferSize || nav.encodedBodySize || 0 : 0;
    return { fcp: P.fcp, lcp: P.lcp || P.fcp, lcpEl: P.lcpEl, cls, tbt, bytes, requests: requests + 1, nodes: document.getElementsByTagName('*').length };
  });
  await ctx.close();
  return { ...m, status, fontsFailed, wall: Date.now() - t0 };
}

const median = (xs) => { const s = [...xs].sort((p, q) => p - q); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const kb = (b) => `${Math.round(b / 1024)} KB`;

async function site(base) {
  const out = [];
  for (const p of paths) {
    const url = urlFor(base, p);
    const rs = [];
    for (let i = 0; i < runs; i++) rs.push(await measure(url));
    const ok = rs.filter((r) => !r.error);
    if (!ok.length) { out.push({ p, error: rs[0].error }); console.log(`✗ ${p}: ${rs[0].error}`); continue; }
    const pick = (k) => ok.map((r) => r[k]);
    const total = (r) => Object.values(r.bytes).reduce((s, v) => s + v, 0);
    const res = {
      p, lcp: median(pick('lcp')), lcpRange: [Math.min(...pick('lcp')), Math.max(...pick('lcp'))], lcpEl: ok[0].lcpEl,
      fcp: median(pick('fcp')), cls: median(pick('cls')), clsMax: Math.max(...pick('cls')), tbt: median(pick('tbt')),
      bytes: ok[0].bytes, total: median(ok.map(total)), requests: ok[0].requests, nodes: ok[0].nodes, runs: ok.length, fontsFailed: Math.max(...pick('fontsFailed')),
    };
    out.push(res);
    console.log(`${res.lcp > 2500 || res.cls > 0.1 || res.tbt > 200 ? '⚠' : '✓'} ${p}  LCP ${Math.round(res.lcp)} ms (${res.lcpEl || '?'})  CLS ${res.cls.toFixed(3)}${res.clsMax > res.cls + 0.05 ? ` (up to ${res.clsMax.toFixed(2)})` : ''}  TBT ${Math.round(res.tbt)} ms  ${kb(res.total)}`);
  }
  return out;
}

const profile = `${device}, CPU ×${cpu}, ${a.net || (device === 'phone' ? 'slow4g' : 'no network throttling')}, cache off, median of ${runs}`;
console.log(`perf — ${profile}`);
let before = null;
if (a.before) { console.log(`\nbefore: ${a.before}`); before = await site(a.before); console.log(`\nafter: ${a.base}`); }
const after = await site(a.base);
await browser.close();

const md = ['# Performance (lab)', '', `${a.base}${a.before ? ` against ${a.before}` : ''} · ${profile} · ${new Date().toISOString().slice(0, 16)}`, '',
  'Lab numbers from emulated throttling on a local server: they rank builds and catch regressions; they do not predict field data. LCP ≤ 2.5 s, CLS ≤ 0.1, TBT ≤ 200 ms are the "good" thresholds.', '',
  '| Page | LCP (range) | LCP element | FCP | CLS | TBT | Transfer (html / css / js / font / img) | Requests | DOM nodes |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ...after.map((r) => (r.error ? `| ${r.p} | failed: ${r.error} | | | | | | | |` : `| ${r.p} | ${Math.round(r.lcp)} ms (${Math.round(r.lcpRange[0])}–${Math.round(r.lcpRange[1])}) | \`${r.lcpEl}\` | ${Math.round(r.fcp)} ms | ${r.cls.toFixed(3)} | ${Math.round(r.tbt)} ms | ${kb(r.total)} (${['html', 'css', 'js', 'font', 'img'].map((k) => kb(r.bytes[k] || 0)).join(' / ')}) | ${r.requests} | ${r.nodes} |`))];
const flags = after.filter((r) => !r.error).flatMap((r) => [
  r.lcp > 2500 && `${r.p}: LCP ${Math.round(r.lcp)} ms over 2.5 s (element \`${r.lcpEl}\`)`,
  r.cls > 0.1 && `${r.p}: CLS ${r.cls.toFixed(3)} over 0.1`,
  r.clsMax > 0.1 && r.cls <= 0.1 && `${r.p}: CLS reached ${r.clsMax.toFixed(2)} in one run — intermittent; find the late element`,
  r.tbt > 200 && `${r.p}: TBT ${Math.round(r.tbt)} ms over 200 ms (long main-thread tasks: INP risk)`,
].filter(Boolean));
if (before) {
  md.push('', '## Against the baseline', '', '| Page | LCP | CLS | TBT | Transfer |', '| --- | --- | --- | --- | --- |');
  for (const r of after) {
    const b = before.find((x) => x.p === r.p);
    if (!b || b.error || r.error) continue;
    const d = (x, y, u = 'ms') => `${Math.round(y)} → ${Math.round(x)} ${u}`;
    md.push(`| ${r.p} | ${d(r.lcp, b.lcp)} | ${b.cls.toFixed(3)} → ${r.cls.toFixed(3)} | ${d(r.tbt, b.tbt)} | ${kb(b.total)} → ${kb(r.total)} |`);
    if (r.lcp > b.lcp * 1.1 + 100) flags.push(b.fontsFailed
      ? `${r.p}: slower than the baseline (LCP ${Math.round(b.lcp)} → ${Math.round(r.lcp)} ms), but the baseline is broken: ${b.fontsFailed} of its font request(s) failed here, so the old page never paid for its fonts. Judge the new build against the budget, and say so in the report`
      : `${r.p}: slower than the baseline (LCP ${Math.round(b.lcp)} → ${Math.round(r.lcp)} ms) — within budget is not enough when the old build was faster`);
    if (r.cls > b.cls + 0.05) flags.push(`${r.p}: more layout shift than the baseline (${b.cls.toFixed(3)} → ${r.cls.toFixed(3)})`);
  }
}
md.push('', '## Flags', '', ...(flags.length ? flags.map((f) => `- ⚠ ${f}`) : ['- ✓ none']));
const outFile = String(a.out || 'perf.md');
await writeFile(outFile, md.join('\n') + '\n');
console.log(`\n${flags.length ? `${flags.length} flag(s)` : 'no flags'} · ${outFile}`);
