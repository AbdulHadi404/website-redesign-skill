#!/usr/bin/env node
// S12 small labs:
//  1. keyboard-wedge barcode input on a POS screen: a burst-gate detector vs onscan.js defaults,
//     scanner speeds vs human typing, with the search field focused (the realistic worst case);
//  2. post-launch RUM snippet: rage clicks, dead clicks, errors and INP attribution on scripted sessions,
//     then injected into three regression fixtures it was not written against (v2 and the first-round v1);
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

export async function wedge(browser) {
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
    let ok = 0, leaked = 0, detected = 0; const gapsSeen = [];
    const samples = [];
    for (let r = 0; r < RUNS; r++) {
      await page.goto(url(det.page, det.q));
      await page.focus('#search');
      await page.waitForTimeout(300); // let the page settle: the first keys after load arrive late
      await typeWithGaps(page, c.text.replace('\n', ''), c.gaps);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(250);
      const s = await page.evaluate(() => ({ scans: window.scans, value: document.getElementById('search').value, gaps: window.gaps || [] }));
      gapsSeen.push(...s.gaps.slice(0, -1));
      const isScan = s.scans.includes(c.text.trim());
      if (isScan) detected++;
      const leak = c.kind === 'scan' && /\d/.test(s.value);
      if (leak) leaked++;
      const good = c.kind === 'scan' ? isScan && !leak : !isScan && s.value === c.text.trim();
      if (good) ok++;
      if (r === 0) samples.push(s);
    }
    const gs = gapsSeen.sort((a, b) => a - b);
    rows.push({ detector: det.id, case: c.id, kind: c.kind, runs: RUNS, correct: ok, detectedAsScan: detected, leakedIntoField: leaked, gapMedian: gs.length ? gs[gs.length >> 1] : null, gapMax: gs.length ? gs[gs.length - 1] : null, sample: samples[0] });
  }
  await page.close();
  return rows;
}

// Sessions: the first seven are the first-round set; the rest were added after review (text fields,
// checkbox, label, scroll-only response, slower rage run, a truly dead button, and the masking limit).
const SESSIONS = [
  { id: 'dead control clicked 4× (150 ms apart)', expect: { rage_click: 1, dead_click: '≥1' }, act: async (p) => { for (let i = 0; i < 4; i++) { await p.click('#dead'); await p.waitForTimeout(150); } } },
  { id: 'slow pay button clicked 3× while waiting (250 ms apart; answers after 1.5 s)', expect: { rage_click: 1, dead_click: 0 }, act: async (p) => { for (let i = 0; i < 3; i++) { await p.click('#slow'); await p.waitForTimeout(250); } await p.waitForTimeout(1500); } },
  { id: 'double-click a word in a paragraph', expect: { rage_click: 0, dead_click: 0 }, act: async (p) => { await p.dblclick('#para'); } },
  { id: 'triple-click to select a paragraph', expect: { rage_click: 0, dead_click: 0, triple_click_select: 1 }, act: async (p) => { await p.click('#para', { clickCount: 3 }); } },
  { id: 'working button clicked once', expect: { rage_click: 0, dead_click: 0 }, act: async (p) => { await p.click('#ok'); } },
  { id: 'janky handler (350 ms busy loop)', sequential: true, expect: { inp_over_200ms: 1, inp_target: '#jank' }, act: async (p) => { await p.click('#jank'); await p.waitForTimeout(300); } },
  { id: 'handler that throws', expect: { js_error: 1 }, act: async (p) => { await p.click('#boom'); } },
  { id: 'rage: dead control clicked 3× 600 ms apart (PostHog rule: each < 1 s after the previous)', expect: { rage_click: 1 }, act: async (p) => { for (let i = 0; i < 3; i++) { await p.click('#dead'); if (i < 2) await p.waitForTimeout(600); } } },
  { id: 'click an email field and type', expect: { dead_click: 0, rage_click: 0 }, act: async (p) => { await p.click('#email'); await p.keyboard.type('ada@ex'); } },
  { id: 'click the label of the email field', expect: { dead_click: 0 }, act: async (p) => { await p.click('label[for=email]'); } },
  { id: 'toggle a checkbox', expect: { dead_click: 0 }, act: async (p) => { await p.click('#agree'); } },
  { id: 'control that answers by scrolling a list (no DOM change)', expect: { dead_click: 0 }, act: async (p) => { await p.click('#more'); } },
  { id: 'truly dead button clicked once', expect: { dead_click: 1 }, act: async (p) => { await p.click('#deadbtn'); } },
  { id: 'truly dead button, then a working button 400 ms later (known limit: the second masks the first)', expect: { dead_click: 0, note: 'true answer 1; PostHog has the same limit' }, act: async (p) => { await p.click('#deadbtn'); await p.waitForTimeout(400); await p.click('#ok'); } },
  { id: 'truly dead button on a page with a 1.5 s DOM ticker (known limit: background mutations mask it)', q: 'ticker=1', expect: { dead_click: 0, note: 'true answer 1; PostHog has the same limit' }, act: async (p) => { await p.click('#deadbtn'); } },
];
function countLog(log) {
  const c = {};
  for (const e of log) {
    if (e.type === 'web_vital') { if (e.name === 'INP') { c.inp_max = Math.max(c.inp_max ?? 0, e.value); c.inp_rating = e.rating; if (e.value > 200) c.inp_over_200ms = 1; c.inp_target = e.target; } continue; }
    c[e.type] = (c[e.type] ?? 0) + 1;
  }
  return c;
}
function meets(expect, c) {
  return Object.entries(expect).every(([k, v]) => {
    if (k === 'note') return true;
    if (k === 'inp_target') return c.inp_target === v;
    if (v === '≥1') return (c[k] ?? 0) >= 1;
    return (c[k] ?? 0) === v;
  });
}
async function rum(browser) {
  const rows = [];
  for (const version of ['v2', 'v1']) {
    for (const s of SESSIONS) {
      const once = async () => {
        const page = await browser.newPage();
        const q = [version === 'v1' ? 'v=1' : '', s.q ?? ''].filter(Boolean).join('&');
        await page.goto(url('rum-lab.html', q ? '?' + q : ''));
        await page.waitForTimeout(200);
        await s.act(page);
        await page.waitForTimeout(2800);
        const c = countLog(await page.evaluate(() => window.rumLog || []));
        await page.close();
        return c;
      };
      // runs of one session go in parallel pages (timer-based signals), except the INP session
      const counts = s.sequential ? [] : await Promise.all(Array.from({ length: RUNS }, once));
      if (s.sequential) for (let r = 0; r < RUNS; r++) counts.push(await once());
      rows.push({ version, session: s.id, expect: s.expect, matched: counts.filter((c) => meets(s.expect, c)).length, runs: counts });
    }
  }
  return rows;
}

// The same snippets injected into three regression fixtures they were not written against
// (tools/regress/fixtures: a11y-wizard, dashboard, app-traps). No script in them answers a click (the one
// script is a ticker), so only native behaviour can answer: links navigate, labels forward, form controls
// change; every other clickable-looking element is truly dead. Each visible clickable-looking element is clicked
// (text fields are then typed into), once in its own page ("isolated") and once in a 400 ms sequence
// on one page ("sequence", the reviewer's probe).
// Pinned copies in ./fixtures (the originals changed during this stream): a11y-wizard gained a 1.5 s
// "saving" ticker, so it is run as committed AND with that one script removed (a11y-wizard-noticker).
const FIXTURES = ['a11y-wizard-noticker.html', 'a11y-wizard.html', 'dashboard.html', 'app-traps.html'];
const FX_DIR = new URL('fixtures/', import.meta.url);
async function fixtures(browser) {
  const wv = await readFile(new URL('../node_modules/web-vitals/dist/web-vitals.attribution.iife.js', here), 'utf8');
  const src = { v1: await readFile(new URL('rum-v1.js', here), 'utf8'), v2: await readFile(new URL('rum.js', here), 'utf8') };
  const open = async (f, version) => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.addInitScript({ content: wv });
    await page.addInitScript({ content: `document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('script');s.textContent=${JSON.stringify(src[version])};document.head.append(s);});` });
    await page.goto(new URL(f, FX_DIR).href);
    await page.waitForTimeout(300);
    return page;
  };
  // candidates and ground truth, computed in the page
  const survey = () => {
    const out = [];
    const all = [...document.querySelectorAll('body *')];
    for (const el of all) {
      const cs = getComputedStyle(el);
      const native = el.matches('a[href],button,input,select,textarea,summary,label,[contenteditable=""],[contenteditable="true"]');
      const affordance = native || el.matches('[onclick],[role=button],[role=link],[role=tab],[role=menuitem],[tabindex]') || (cs.cursor === 'pointer' && getComputedStyle(el.parentElement).cursor !== 'pointer');
      if (!affordance) continue;
      const r = el.getBoundingClientRect();
      if (!(r.width > 0 && r.height > 0) || !el.checkVisibility({ visibilityProperty: true, contentVisibilityAuto: true })) continue;
      if (el.closest('label') && el.tagName === 'INPUT' && el.closest('label') !== el) { /* input inside a label: keep both */ }
      let truth;
      if (el.matches('a[href],input,select,textarea,summary,[contenteditable=""],[contenteditable="true"]') || (el.tagName === 'LABEL' && el.control)) truth = 'responds';
      else if (el.matches('[tabindex="-1"]') && !el.matches('button,[onclick],[role=button]') && cs.cursor !== 'pointer') truth = 'not an affordance';
      else truth = 'dead';
      el.setAttribute('data-fx', out.length);
      out.push({ i: out.length, tag: el.tagName.toLowerCase(), type: el.getAttribute('type') || el.getAttribute('role') || '', truth, textEntry: el.matches('input:not([type]),input[type=text],input[type=email],input[type=tel],input[type=password],input[type=search],textarea') });
    }
    return out;
  };
  const act = async (page, c) => {
    // scroll first and let it settle, so a scroll caused by the harness is not read as the page's answer
    await page.$eval(`[data-fx="${c.i}"]`, (el) => el.scrollIntoView({ block: 'center' })).catch(() => {});
    await page.waitForTimeout(250);
    try { await page.click(`[data-fx="${c.i}"]`, { timeout: 1500 }); } catch { return false; }
    if (c.textEntry) await page.keyboard.type('ab');
    return true;
  };
  const res = {};
  for (const f of FIXTURES) {
    const probe = await open(f, 'v2');
    const cands = await probe.evaluate(survey);
    await probe.close();
    res[f] = { candidates: cands.map((c) => `${c.tag}${c.type ? '[' + c.type + ']' : ''}: ${c.truth}`), isolated: {}, sequence: {} };
    for (const version of ['v1', 'v2']) {
      // isolated: one page per element, 6 at a time
      const iso = [];
      for (let k = 0; k < cands.length; k += 6) {
        iso.push(...(await Promise.all(cands.slice(k, k + 6).map(async (c) => {
          const page = await open(f, version);
          await page.evaluate(survey);
          const clicked = await act(page, c);
          await page.waitForTimeout(2800);
          const log = (await page.evaluate(() => window.rumLog || [])).filter((e) => e.type !== 'web_vital');
          await page.close();
          return { ...c, clicked, dead: log.filter((e) => e.type === 'dead_click').length, other: log.filter((e) => e.type !== 'dead_click').map((e) => e.type) };
        }))));
      }
      const clicked = iso.filter((x) => x.clicked);
      res[f].isolated[version] = {
        clicked: clicked.length,
        trulyDead: clicked.filter((x) => x.truth === 'dead').length,
        deadReportedOnDead: clicked.filter((x) => x.truth === 'dead' && x.dead > 0).length,
        falseDeadOnResponding: clicked.filter((x) => x.truth !== 'dead' && x.dead > 0).map((x) => `${x.tag}${x.type ? '[' + x.type + ']' : ''}`),
        missedDead: clicked.filter((x) => x.truth === 'dead' && x.dead === 0).map((x) => `${x.tag}${x.type ? '[' + x.type + ']' : ''}`),
        otherEvents: clicked.flatMap((x) => x.other),
      };
      // sequence: one page, 400 ms apart
      const page = await open(f, version);
      await page.evaluate(survey);
      let n = 0;
      for (const c of cands) { if (await act(page, c)) n++; await page.waitForTimeout(400); }
      await page.waitForTimeout(3000);
      const log = (await page.evaluate(() => window.rumLog || [])).filter((e) => e.type !== 'web_vital');
      await page.close();
      res[f].sequence[version] = { clicked: n, trulyDead: cands.filter((c) => c.truth === 'dead').length, events: log.map((e) => `${e.type} ${e.target || e.message || ''}`) };
    }
  }
  return res;
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

export async function runLabs({ only } = {}) {
  const { browser } = await launch();
  const wedgeRows = only === 'rum' ? [] : await wedge(browser);
  const rumRows = await rum(browser);
  const fixtureRows = await fixtures(browser);
  await browser.close();
  const rumSrc = await readFile(new URL('rum.js', here));
  const wv = await readFile(new URL('../node_modules/web-vitals/dist/web-vitals.attribution.iife.js', here));
  return {
    wedge: wedgeRows,
    rum: rumRows,
    rumFixtures: fixtureRows,
    sizes: { rumSnippetGzipBytes: gzipSync(rumSrc).length, rumV1SnippetGzipBytes: gzipSync(await readFile(new URL('rum-v1.js', here))).length, webVitalsAttributionGzipBytes: gzipSync(wv).length, webVitalsVersion: JSON.parse(await readFile(new URL('../node_modules/web-vitals/package.json', here))).version },
    mde: mdeTable(),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await runLabs();
  await writeFile(new URL('./labs-results.json', here), JSON.stringify(r, null, 1));
  console.table(r.wedge.map(({ sample, ...x }) => x));
  for (const s of r.rum) console.log(s.version, `${s.matched}/${s.runs.length}`, s.session, JSON.stringify(s.runs[0]));
  console.log(JSON.stringify(r.rumFixtures, null, 1));
  console.log(r.sizes);
  console.table(r.mde);
}
