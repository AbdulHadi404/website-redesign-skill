// Experiment 2: one page, one heavy interactive module below the fold, loaded seven ways, under Lighthouse's
// mobile profile (slow 4G: 150 ms RTT, 1.6 Mbps down; CPU 4×). Two scripted visitors:
//   quick  — taps Menu at 3 s, scrolls to the module at 5 s, taps "Try it live" at 6.5 s, then drags on it;
//   reader — taps Menu at 3 s, scrolls at 18 s, taps at 19.5 s, then drags.
// Plus the skill's own scripts/perf.mjs on every variant (a visitor who never interacts).
//   node run-loading.mjs [--runs 5] [--only eager,idle] [--skip-perf] [--skip-journeys]
import { spawn } from 'node:child_process';
import path from 'node:path';
import { launch, siteRoot, env, newPage, NETS, median, r0, r1, load, saveResult, readResult, sleep } from './lib/common.mjs';
import { serve } from './lib/serve.mjs';
import { buildLoading } from './lib/build-loading.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const RUNS = Number(opt('--runs', 5));
const built = await buildLoading();
const VARIANTS = opt('--only', null)?.split(',') || Object.keys(built.variants);
const JOURNEYS = { quick: { menu: 3000, scrollStart: 3500, scroll: 5000, click: 6500 }, reader: { menu: 3000, scrollStart: 10000, scroll: 18000, click: 19500 } };
const srv = await serve(siteRoot);
const base = `${srv.url}/loading`;
const prev = (await readResult('loading')) || {};
const out = { env: env(), built, profile: 'phone 390×844 @2x, CPU 4×, slow 4G (150 ms RTT, 1.6 Mbps down, 750 kbps up), fresh context per run (empty cache), HTTP/1.1 localhost with gzip', journeys: JOURNEYS, runs: prev.runs && args.includes('--skip-journeys') ? prev.runs : [], perf: prev.perf || null };

const { browser } = await launch();

// Layout: where the Menu button, the module and its button sit (identical on every variant).
const layout = await (async () => {
  const { ctx, page } = await newPage(browser, {});
  await page.goto(`${base}/interaction.html`);
  const l = await page.evaluate(() => {
    const c = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + scrollY + r.height / 2, top: r.top + scrollY, h: r.height }; };
    return { brand: c(document.querySelector('#brand')), menu: c(document.querySelector('#menu')), module: c(document.querySelector('#module')), start: c(document.querySelector('#start')), docH: document.documentElement.scrollHeight };
  });
  await ctx.close();
  return l;
})();
out.layout = layout;

async function journey(variant, jname) {
  const J = JOURNEYS[jname];
  const { ctx, page, cdp } = await newPage(browser, { cpu: 4, net: NETS.slow4g });
  // All input goes through CDP without waiting for the renderer's acknowledgement, so a blocked main thread delays
  // the event's handling (which Event Timing measures) but never the script's timeline.
  const mouse = (type, x, y, extra = {}) => cdp.send('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseWheel' || type === 'mouseMoved' ? 'none' : 'left', clickCount: 1, ...extra }).catch(() => {});
  const tap = (x, y) => { mouse('mousePressed', x, y); mouse('mouseReleased', x, y); };
  const t0 = Date.now();
  const la = load()[0];
  await page.goto(`${base}/${variant}.html`, { waitUntil: 'commit' });
  const now = () => Date.now() - t0;
  const at = async (ms) => { const w = ms - now(); if (w > 0) await sleep(w); };
  const acts = { taps: 0 };
  // background tapper: the brand text (no handler) every 250 ms from 1 s, paused around the Start tap
  let tapping = true;
  const tapper = (async () => { await at(1000); while (tapping) { if (Math.abs(now() - J.click) > 250 && Math.abs(now() - J.menu) > 150) { tap(layout.brand.x, layout.brand.y); acts.taps++; } await sleep(250); } })();
  await at(J.menu); acts.menu = now(); tap(layout.menu.x, layout.menu.y);
  await at(J.scrollStart); acts.scrollStart = now();
  const dy = Math.round(layout.module.top - 120);
  const steps = Math.max(1, Math.round((J.scroll - J.scrollStart) / 150));
  for (let i = 1; i <= steps; i++) { await at(J.scrollStart + i * 150); mouse('mouseWheel', 200, 500, { deltaX: 0, deltaY: dy / steps }); }
  await at(J.click); acts.click = now();
  tap(layout.start.x, layout.start.y - dy);
  // wait for the module on screen (60 s cap)
  let shown = false;
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    shown = await page.evaluate(() => performance.getEntriesByName('shown').length > 0).catch(() => false);
    if (shown) break;
    await sleep(250);
  }
  acts.shownSeen = now();
  if (shown) {
    await sleep(500);
    const cx = layout.module.x, cy = layout.module.top - dy + layout.module.h / 2;
    for (let d = 0; d < 3; d++) {
      await page.mouse.move(cx - 60, cy); await page.mouse.down();
      for (let s = 1; s <= 8; s++) await page.mouse.move(cx - 60 + s * 15, cy);
      await page.mouse.up(); await sleep(300);
    }
  }
  // then until full fidelity (staged builds keep streaming) or 40 s
  const d2 = Date.now() + 40000;
  while (Date.now() < d2 && !(await page.evaluate(() => performance.getEntriesByName('mod-ready').length > 0).catch(() => true))) await sleep(250);
  tapping = false; await tapper;
  await sleep(600);
  const r = await page.evaluate(() => {
    const marks = Object.fromEntries(performance.getEntriesByType('mark').map((m) => [m.name, m.startTime]));
    const res = performance.getEntriesByType('resource').map((r) => [r.responseStart || r.startTime, r.responseEnd, r.transferSize]);
    const n = performance.getEntriesByType('navigation')[0];
    if (n) res.push([n.responseStart, n.responseEnd, n.transferSize]);
    return { obs: window.__obs, marks, scrollY, res, timeOrigin: performance.timeOrigin };
  });
  await ctx.close();
  // Bytes on the wire by a moment: Resource Timing, each response spread evenly between its first and last byte.
  // (CDP dataReceived is no good here: a gzip script's chunks all reach it at the end of the download.)
  const off = r.timeOrigin - t0; // page time 0 in the script's clock
  const bytesBy = (ms) => { const T = ms - off; return r.res.reduce((s, [a, b, size]) => s + (T >= b ? size : T <= a ? 0 : size * (T - a) / Math.max(1, b - a)), 0); };
  const O = r.obs;
  const fcp = O.fcp || 0;
  const tbt = (until) => O.long.filter(([s]) => s >= fcp && s <= until).reduce((a, [, d]) => a + Math.max(0, d - 50), 0);
  // interactions: the longest event per interactionId
  const byId = new Map();
  for (const e of O.events) { if (!e.id) continue; const p = byId.get(e.id); if (!p || e.dur > p.dur) byId.set(e.id, e); }
  const inter = [...byId.values()];
  const loadingInter = inter.filter((e) => e.target !== 'cv' && e.target !== 'start' && e.start <= (r.marks['mod-ready'] ?? r.marks.shown ?? 1e9));
  const durs = loadingInter.map((e) => e.dur).sort((a, b) => b - a);
  const menuEv = inter.filter((e) => e.target === 'menu').sort((a, b) => b.dur - a.dur)[0];
  const startEv = inter.filter((e) => e.target === 'start').sort((a, b) => a.start - b.start)[0];
  const modEv = inter.filter((e) => e.target === 'cv').sort((a, b) => b.dur - a.dur)[0];
  const clickAt = startEv ? startEv.start : r.marks['start-click'];
  return {
    variant, journey: jname, loadavg1: la, acts, scrollY: r.scrollY,
    lcp: O.lcp?.t, lcpEl: O.lcp?.el, fcp, cls: O.cls,
    tbt10: tbt(10000), tbtSession: tbt(1e9), loafBlocking: O.loaf.reduce((a, l) => a + (l[2] || 0), 0),
    // taps ≥ 16 ms are recorded; the rest were fast. "worst" ≈ INP when there are fewer than 50 interactions.
    loadingTaps: acts.taps, slowTaps: durs.length, worstTap: durs[0] || 0, secondTap: durs[1] || 0, tapsOver200: durs.filter((d) => d > 200).length, tapsOver100: durs.filter((d) => d > 100).length,
    menu: menuEv ? { dur: menuEv.dur, delay: menuEv.delay } : { dur: 0, delay: 0 },
    startClick: startEv ? { dur: startEv.dur, delay: startEv.delay } : null,
    moduleInp: modEv ? modEv.dur : 0,
    marks: r.marks, reason: O.reason,
    clickAt, request: r.marks['mod-request'], warm: r.marks.warm, evaluated: r.marks['mod-evaluated'], usable: r.marks['mod-usable'], ready: r.marks['mod-ready'], shown: r.marks.shown,
    waitAfterClick: r.marks.shown != null && clickAt != null ? Math.max(0, r.marks.shown - clickAt) : null,
    fullAfterClick: r.marks['mod-ready'] != null && clickAt != null ? Math.max(0, r.marks['mod-ready'] - clickAt) : null,
    bytes: { beforeMenu: bytesBy(J.menu), beforeScroll: bytesBy(J.scrollStart), beforeClick: bytesBy(J.click), total: bytesBy(1e12) },
  };
}

if (!args.includes('--skip-journeys')) {
  out.runs = out.runs.filter((x) => !VARIANTS.includes(x.variant));
  for (const jname of Object.keys(JOURNEYS)) for (const v of VARIANTS) for (let i = 0; i < RUNS; i++) {
    const r = await journey(v, jname);
    out.runs.push(r);
    console.log(jname, v, i, `LCP ${r0(r.lcp)} TBT10 ${r0(r.tbt10)} menu ${r0(r.menu.dur)} worstTap ${r0(r.worstTap)} >200 ${r.tapsOver200} usable ${r0(r.usable)} shown ${r0(r.shown)} wait ${r0(r.waitAfterClick)} full ${r0(r.fullAfterClick)} modINP ${r0(r.moduleInp)} bytes<menu ${r0(r.bytes.beforeMenu / 1024)}K total ${r0(r.bytes.total / 1024)}K la ${r.loadavg1}`);
  }
}
await browser.close();

// perf.mjs from the skill: LCP, CLS, TBT, transfer, median of RUNS, for a visitor who never interacts.
if (!args.includes('--skip-perf')) {
  const perfJs = '/home/user/website-redesign-skill/skills/website-redesign/scripts/perf.mjs';
  const text = await new Promise((res) => {
    const p = spawn(process.execPath, [perfJs, '--base', base, '--paths', ...VARIANTS.map((v) => `/${v}.html`), '--runs', String(RUNS), '--out', path.join(siteRoot, '..', 'perf-loading.md')], { stdio: ['ignore', 'pipe', 'inherit'] });
    let s = ''; p.stdout.on('data', (d) => { s += d; process.stdout.write(d); }); p.on('close', () => res(s));
  });
  const rows = {};
  for (const line of text.split('\n')) {
    const m = line.match(/\/([\w-]+)\.html\s+LCP (\d+) ms \(([^)]*)\)\s+CLS ([\d.]+).*?TBT (\d+) ms\s+(\d+) KB/);
    if (m) rows[m[1]] = { lcp: +m[2], lcpEl: m[3], cls: +m[4], tbt: +m[5], transferKB: +m[6] };
  }
  out.perf = { ...(out.perf || {}), ...rows, raw: text.split('\n').filter((l) => l.includes('.html')) };
}
await srv.close();

// summary
const S = {};
for (const jname of Object.keys(JOURNEYS)) for (const v of Object.keys(built.variants)) {
  const rs = out.runs.filter((r) => r.variant === v && r.journey === jname);
  if (!rs.length) continue;
  const m = (f) => r0(median(rs.map(f)));
  S[`${jname}|${v}`] = {
    runs: rs.length, lcp: m((r) => r.lcp), lcpEl: rs[0].lcpEl, tbt10: m((r) => r.tbt10), tbtSession: m((r) => r.tbtSession), loafBlocking: m((r) => r.loafBlocking),
    worstTap: m((r) => r.worstTap), secondTap: m((r) => r.secondTap), tapsOver200: m((r) => r.tapsOver200), tapsOver100: m((r) => r.tapsOver100), taps: m((r) => r.loadingTaps),
    menuInp: m((r) => r.menu.dur), menuDelay: m((r) => r.menu.delay), startClickInp: m((r) => r.startClick?.dur ?? 0), moduleInp: m((r) => r.moduleInp),
    request: m((r) => r.request), usable: m((r) => r.usable), ready: m((r) => r.ready), shown: m((r) => r.shown), clickAt: m((r) => r.clickAt),
    waitAfterClick: m((r) => r.waitAfterClick), fullAfterClick: m((r) => r.fullAfterClick), waitRange: [r0(Math.min(...rs.map((r) => r.waitAfterClick ?? NaN))), r0(Math.max(...rs.map((r) => r.waitAfterClick ?? NaN)))],
    kbBeforeMenu: m((r) => r.bytes.beforeMenu / 1024), kbBeforeScroll: m((r) => r.bytes.beforeScroll / 1024), kbBeforeClick: m((r) => r.bytes.beforeClick / 1024), kbTotal: m((r) => r.bytes.total / 1024),
    loadavg1: r1(median(rs.map((r) => r.loadavg1))),
  };
}
out.summary = S;
out.env.loadavgAtEnd = load();
await saveResult('loading', out);
console.table(S);
