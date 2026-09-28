#!/usr/bin/env node
// S12 small labs:
//  1. keyboard-wedge barcode input on a POS screen: a burst-gate detector vs onscan.js defaults,
//     scanner speeds vs human typing, with the search field focused (the realistic worst case);
//  2. post-launch RUM snippet: rage clicks, dead clicks, errors and INP attribution on scripted sessions;
//  3. how large a change a staged rollout can detect (minimum detectable effect), by traffic.
import { readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { launch } from '../../../../../skills/website-redesign/scripts/lib/env.mjs';

const here = new URL('./', import.meta.url);
const url = (f, q = '') => new URL(f, here).href + q;
const RUNS = 5;
const CODE = '4006381333931'; // an EAN-13

async function typeWithGaps(page, text, gaps) {
  for (let i = 0; i < text.length; i++) {
    await page.keyboard.press(text[i]);
    if (gaps[i]) await page.waitForTimeout(gaps[i]);
  }
}

async function wedge(browser) {
  const page = await browser.newPage();
  const cases = [
    ...[4, 15, 25, 40].map((d) => ({ id: `scanner ${d} ms/key`, kind: 'scan', text: CODE + '\n', gaps: Array(CODE.length + 1).fill(d) })),
    ...[60, 90, 150].map((d) => ({ id: `person ${d} ms/key`, kind: 'human', text: 'coffee\n', gaps: Array(7).fill(d) })),
    { id: 'person with one 20 ms rollover', kind: 'human', text: 'coffee\n', gaps: [120, 20, 130, 110, 140, 120, 100] },
    { id: 'person typing a 6-digit code at 70 ms', kind: 'human', text: '400638\n', gaps: Array(7).fill(70) },
  ];
  const detectors = [
    { id: 'burst-gate 35 ms', page: 'pos-scan.html', q: '?gap=35' },
    { id: 'burst-gate 50 ms', page: 'pos-scan.html', q: '?gap=50' },
    { id: 'onscan.js 1.5.2 defaults', page: 'pos-onscan.html', q: '' },
  ];
  const rows = [];
  for (const det of detectors) for (const c of cases) {
    let ok = 0, leaked = 0, detected = 0;
    const samples = [];
    for (let r = 0; r < RUNS; r++) {
      await page.goto(url(det.page, det.q));
      await page.focus('#search');
      await typeWithGaps(page, c.text.replace('\n', ''), c.gaps);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(250);
      const s = await page.evaluate(() => ({ scans: window.scans, value: document.getElementById('search').value }));
      const isScan = s.scans.includes(c.text.trim());
      if (isScan) detected++;
      const leak = c.kind === 'scan' && /\d/.test(s.value);
      if (leak) leaked++;
      const good = c.kind === 'scan' ? isScan && !leak : !isScan && s.value === c.text.trim();
      if (good) ok++;
      if (r === 0) samples.push(s);
    }
    rows.push({ detector: det.id, case: c.id, kind: c.kind, runs: RUNS, correct: ok, detectedAsScan: detected, leakedIntoField: leaked, sample: samples[0] });
  }
  await page.close();
  return rows;
}

async function rum(browser) {
  const page = await browser.newPage();
  const sessions = [
    { id: 'dead control clicked 4× (150 ms apart)', expect: { rage_click: 1, dead_click: '≥1' }, act: async () => { for (let i = 0; i < 4; i++) { await page.click('#dead'); await page.waitForTimeout(150); } } },
    { id: 'slow pay button clicked 3× while waiting (250 ms apart)', expect: { rage_click: 1, dead_click: '≥1' }, act: async () => { for (let i = 0; i < 3; i++) { await page.click('#slow'); await page.waitForTimeout(250); } await page.waitForTimeout(1500); } },
    { id: 'double-click a word in a paragraph', expect: { rage_click: 0, dead_click: 0 }, act: async () => { await page.dblclick('#para'); } },
    { id: 'triple-click to select a paragraph', expect: { rage_click: 0, dead_click: 0, triple_click_select: 1 }, act: async () => { await page.click('#para', { clickCount: 3 }); } },
    { id: 'working button clicked once', expect: { rage_click: 0, dead_click: 0 }, act: async () => { await page.click('#ok'); } },
    { id: 'janky handler (350 ms busy loop)', expect: { inp_poor: 1 }, act: async () => { await page.click('#jank'); await page.waitForTimeout(300); } },
    { id: 'handler that throws', expect: { js_error: 1 }, act: async () => { await page.click('#boom'); } },
  ];
  const rows = [];
  for (const s of sessions) {
    const counts = [];
    for (let r = 0; r < RUNS; r++) {
      await page.goto(url('rum-lab.html'));
      await page.waitForTimeout(200);
      await s.act();
      await page.waitForTimeout(1300);
      const log = await page.evaluate(() => window.rumLog || []);
      const c = {};
      for (const e of log) {
        if (e.type === 'web_vital') { if (e.name === 'INP') { c.inp_max = Math.max(c.inp_max ?? 0, e.value); if (e.rating === 'poor') c.inp_poor = 1; c.inp_target = e.target; } continue; }
        c[e.type] = (c[e.type] ?? 0) + 1;
      }
      counts.push(c);
    }
    rows.push({ session: s.id, expect: s.expect, runs: counts });
  }
  await page.close();
  return rows;
}

// Two-proportion test, α = 0.05 two-sided, power 0.8: the smallest relative change detectable.
function mde({ p, dailyVisitors, days, shareNew }) {
  const N = dailyVisitors * days, n2 = N * shareNew, n1 = N - n2;
  const abs = (1.959964 + 0.841621) * Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2));
  return Math.round((abs / p) * 1000) / 10; // % relative
}
function mdeTable() {
  const rows = [];
  for (const p of [0.02, 0.1, 0.5, 0.8]) for (const v of [300, 3000, 30000]) for (const share of [0.5, 0.1]) {
    rows.push({ baselineRate: p, dailyVisitors: v, shareOnNewDesign: share, mde14dRelativePct: mde({ p, dailyVisitors: v, days: 14, shareNew: share }), mde28dRelativePct: mde({ p, dailyVisitors: v, days: 28, shareNew: share }) });
  }
  return rows;
}

export async function runLabs() {
  const { browser } = await launch();
  const wedgeRows = await wedge(browser);
  const rumRows = await rum(browser);
  await browser.close();
  const rumSrc = await readFile(new URL('rum.js', here));
  const wv = await readFile(new URL('../node_modules/web-vitals/dist/web-vitals.attribution.iife.js', here));
  return {
    wedge: wedgeRows,
    rum: rumRows,
    sizes: { rumSnippetGzipBytes: gzipSync(rumSrc).length, webVitalsAttributionGzipBytes: gzipSync(wv).length, webVitalsVersion: JSON.parse(await readFile(new URL('../node_modules/web-vitals/package.json', here))).version },
    mde: mdeTable(),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await runLabs();
  await writeFile(new URL('./labs-results.json', here), JSON.stringify(r, null, 1));
  console.table(r.wedge.map(({ sample, ...x }) => x));
  for (const s of r.rum) console.log(s.session, JSON.stringify(s.expect), JSON.stringify(s.runs));
  console.log(r.sizes);
  console.table(r.mde);
}
