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
 * Flags (⚠) against the "good" thresholds: LCP ≤ 2.5 s, CLS ≤ 0.1, TBT ≤ 200 ms, and a page that answered with an
 * HTTP error; with --before, any page that got slower or shifts more.
 * Notes (◇, questions and caveats for the report, not failures):
 *   - requests that failed here, on either build: fonts (files, and the stylesheets and kits of font services),
 *     stylesheets, scripts, images, media, frames and data requests (cancellations, beacons and prefetches are left
 *     out). Network, TLS, DNS and proxy errors are this machine's; an HTTP error or a browser block may be the site's
 *     own, so it is worded as a possibility. With --before, the old pages are the "broken baseline"; the new build's
 *     are named too, with or without --before. Every lost file makes a page's transfer lighter than in production;
 *     only some make its LCP faster. These hold up the largest paint: fonts, render-blocking stylesheets,
 *     parser-blocking scripts, and an image or video in the first viewport at least as large as the element measured
 *     as largest. These might, on a page that draws its largest element from them: the site's own scripts that do not
 *     block rendering (async, deferred, module or loaded by a script), data requests, and an image in the first
 *     viewport whose size its failure hid. These cannot: non-blocking scripts from other sites (analytics, ads,
 *     widgets), stylesheets for other media, frames, and images outside the first viewport or smaller. A page slower
 *     than the baseline keeps its regression flag unless the old page lost a file that holds up its largest paint (or
 *     was an error page).
 *   - with --before, transfer growth of more than 50 KB, compared gzip-equivalent (text a server sent uncompressed is
 *     counted at its gzip size, since a production host compresses it), by type: what does it buy? And a note when
 *     one build's server compresses text and the other's does not, since that alone moves LCP on a throttled network.
 * A local server has no real network distance: the throttling adds it back, roughly. Lab numbers rank builds; they
 * do not predict field data (performance.md §6).
 *
 * The machine's load average (1 minute) is printed at the start and at the end of the run, with the CPU count, and in
 * perf.md's header. At or above one per CPU the line warns: the CPU throttle busy-waits on a core of its own, and on a
 * busy machine the timings (FCP, LCP, TBT) stretch by an amount that changes from run to run, so that run's numbers
 * are relative only: compare builds measured in the same run (--before), and judge the thresholds on an idle machine.
 * Windows reports no load average; the line says so.
 */
import { writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import os from 'node:os';
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
  window.__perf = { lcp: 0, lcpEl: '', lcpSize: 0, shifts: [], long: [], fcp: 0 };
  const P = window.__perf;
  // The resource timing buffer holds 250 entries by default: a heavy page would lose the rest of its bytes.
  try { performance.setResourceTimingBufferSize(10000); } catch { /* unsupported */ }
  const obs = (type, fn) => { try { new PerformanceObserver((l) => l.getEntries().forEach(fn)).observe({ type, buffered: true }); } catch { /* unsupported */ } };
  obs('paint', (e) => { if (e.name === 'first-contentful-paint') P.fcp = e.startTime; });
  obs('largest-contentful-paint', (e) => {
    P.lcp = e.startTime;
    P.lcpSize = e.size;
    const el = e.element;
    P.lcpEl = el ? el.tagName.toLowerCase() + (el.id ? '#' + el.id : el.classList[0] ? '.' + el.classList[0] : '') : '';
  });
  obs('layout-shift', (e) => { if (!e.hadRecentInput) P.shifts.push([e.startTime, e.value]); });
  obs('longtask', (e) => P.long.push([e.startTime, e.duration]));
};

// Failed requests, by what the page loses. Font services load through stylesheets and scripts (Google Fonts, Adobe
// Fonts/Typekit, Bunny, Font Awesome), so those count as fonts. Cancellations (net::ERR_ABORTED) are not failures:
// a 404 font is followed by one, and a swapped image source or an aborted fetch ends with one.
const FONT_URL = /\.(woff2?|ttf|otf|eot)(\?|#|$)|fonts\.googleapis\.com|fonts\.gstatic\.com|use\.typekit\.net|p\.typekit\.net|fonts\.bunny\.net|fonts\.cdnfonts\.com|fast\.fonts\.net|cloud\.typography\.com|fontawesome\.com|\/font-?awesome/i;
const KIND = { font: 'font', stylesheet: 'css', script: 'js', image: 'img', media: 'media', fetch: 'data', xhr: 'data' };
function failKind(req, page) {
  const t = req.resourceType();
  if (t === 'document') { try { return req.frame() === page.mainFrame() ? null : 'frame'; } catch { return null; } }
  if (t === 'font' || (['stylesheet', 'script', 'other'].includes(t) && FONT_URL.test(req.url()))) return 'font';
  return KIND[t] || null;
}
// Errors of this machine's network (no route out, a proxy, an untrusted certificate): the file loads in production.
// Anything else (an HTTP status, a CORS or ORB block, a CSP refusal) may be the site's own.
const LOCAL_ERR = /ERR_(CERT|SSL|TUNNEL|PROXY|NAME_NOT_RESOLVED|NAME_RESOLUTION|CONNECTION|ADDRESS|INTERNET_DISCONNECTED|NETWORK|TIMED_OUT|SOCKS|EMPTY_RESPONSE|HTTP2|QUIC)/;
const hostOf = (u) => { try { return new URL(u).host || u.slice(0, 40); } catch { return u.slice(0, 40); } };
// The site a URL belongs to, roughly (example.co.uk for www.example.co.uk; an IP address as it is; no port).
const siteOf = (u) => {
  try {
    const h = new URL(u).hostname, p = h.split('.');
    return /^[\d.]+$|:/.test(h) || p.length < 3 ? h : p.slice(p.at(-1).length === 2 && p.at(-2).length <= 3 ? -3 : -2).join('.');
  } catch { return ''; }
};
// Whether a lost file can hold up the largest paint (what LCP times): 'paint' (it can: the page measured without it
// painted sooner than it will where it loads), 'maybe' (only on a page that draws its largest element from it) or
// null (it cannot). Scripts and images are judged in the page (`where`); a stylesheet by the priority Chrome gave it:
// render-blocking ones get VeryHigh (a media query that does not match gets VeryLow). A script that does not block
// rendering may still draw the page if it is the site's own; from another site (analytics, ads, widgets) it cannot.
function holdOf(f, prio, where, page) {
  if (f.kind === 'font') return 'paint';
  if (f.kind === 'css') return !prio || /High/.test(prio) ? 'paint' : null;
  if (f.kind === 'data') return 'maybe';
  if (f.kind === 'js') return where === 'parser' && !/Low/.test(prio || '') ? 'paint' : siteOf(f.url) === siteOf(page) ? 'maybe' : null;
  if (f.kind === 'img' || f.kind === 'media') return where || null;
  return null; // a frame: its content is not part of this page's LCP
}
// In the page, after load: whether each lost script was parser-blocking, and each lost image's
// (does it show in the first viewport, and could it be larger than the largest paint measured?).
const WHERE = ({ scripts, imgs, lcpSize }) => {
  const bare = (u) => String(u).split('#')[0];
  const out = {};
  for (const u of scripts) {
    // Parser-blocking: a classic script the parser met, neither async nor deferred. One inserted by another script is
    // async unless told otherwise; one with no element was loaded some other way (import(), a worker).
    const s = [...document.scripts].find((x) => bare(x.src) === bare(u));
    out[u] = s && !s.async && !s.defer && s.type !== 'module' ? 'parser' : 'other';
  }
  if (!imgs.length) return out;
  const vw = innerWidth, vh = innerHeight;
  // The part of a box [left, top, width, height] (document coordinates) inside the first viewport.
  const inView = (x, y, w, h) => Math.max(0, Math.min(x + w, vw) - Math.max(x, 0)) * Math.max(0, Math.min(y + h, vh) - Math.max(y, 0));
  let bgs = null;
  for (const u of imgs) {
    const els = [...document.images].filter((i) => bare(i.currentSrc) === bare(u) || bare(i.src) === bare(u));
    for (const v of document.querySelectorAll('video')) if ([v.poster, v.currentSrc, v.src].some((x) => x && bare(x) === bare(u))) els.push(v);
    if (!els.length) {
      bgs ??= [...document.querySelectorAll('body, body *')].map((el) => [el, getComputedStyle(el).backgroundImage]).filter(([, b]) => b && b !== 'none');
      for (const [el, b] of bgs) if (b.includes(u)) els.push(el);
    }
    let hold = null;
    for (const el of els) {
      if (!el.getClientRects().length || getComputedStyle(el).visibility === 'hidden') continue;
      const r = el.getBoundingClientRect(), x = r.left + scrollX, y = r.top + scrollY;
      if (y >= vh || x >= vw || y + r.height < 0 || x + r.width < 0) continue; // outside the first viewport
      let area = inView(x, y, r.width, r.height);
      if (el.tagName === 'IMG') {
        // A failed image shrinks to its alt text, width and height attributes or not: estimate the box it would have
        // had from the attributes (as wide as they say, at most its container, in their proportions).
        const w = Number(el.getAttribute('width')), h = Number(el.getAttribute('height'));
        if (w > 0 && h > 0) { const cw = Math.min(w, el.parentElement?.clientWidth || vw); area = Math.max(area, inView(x, y, cw, (cw * h) / w)); }
        else if (area < lcpSize) { hold = 'maybe'; continue; } // no attributes: the size it would have is unknown
      }
      if (area > 0 && area >= lcpSize) { hold = 'paint'; break; }
    }
    out[u] = hold;
  }
  return out;
};
// Text a server may compress: counted at its gzip size for the growth check.
const TEXT = /^(text\/|application\/(javascript|x-javascript|ecmascript|json|ld\+json|manifest\+json|xml|xhtml\+xml)|image\/svg\+xml)/i;
const timed = (p, ms) => Promise.race([p.catch(() => null), new Promise((r) => setTimeout(r, ms, null).unref())]);
const kindOf = (name, init) => (/\.(woff2?|ttf|otf)(\?|$)/.test(name) ? 'font' : /\.css(\?|$)/.test(name) || init === 'css' && /css/.test(name) ? 'css' : init === 'script' ? 'js' : init === 'img' || /\.(png|jpe?g|webp|avif|gif|svg)(\?|$)/.test(name) ? 'img' : 'other');

// The host's load (S11: the throttler burns 55–88% of a core by itself; delivered slowdown moved with the host's load).
const CPUS = os.availableParallelism?.() || os.cpus().length || 1;
const load = (when) => {
  if (process.platform === 'win32') return { busy: false, value: null, line: `load average: not reported on Windows (${when}) — close other work before trusting the timings` };
  const value = os.loadavg()[0], busy = value >= CPUS;
  return { busy, value, line: `load average ${value.toFixed(2)} on ${CPUS} CPU${CPUS > 1 ? 's' : ''} (${when})${busy ? ' ⚠ busy machine: the timings of this run are relative only — compare builds measured in the same run (--before), and judge the thresholds on an idle machine' : ''}` };
};
const loadStart = load('start');

const { browser } = await launch({ chrome: a.chrome });

async function measure(url) {
  const ctx = await browser.newContext(CTX);
  await ctx.addInitScript(OBSERVE);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  const prio = new Map(); // url → the priority Chrome gave the request
  cdp.on('Network.requestWillBeSent', (e) => { if (!prio.has(e.request.url)) prio.set(e.request.url, e.request.initialPriority); });
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  if (net) await cdp.send('Network.emulateNetworkConditions', { offline: false, ...net });
  if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  const t0 = Date.now();
  let status = 0, packed = 0;
  // One entry per request, so an HTTP error and the cancellation that follows it count once.
  const failed = new Map();
  const fail = (req, why, local) => {
    if (failed.has(req)) return;
    const kind = failKind(req, page);
    if (kind) failed.set(req, { kind, host: hostOf(req.url()), url: req.url(), why, local });
  };
  const plain = []; // text sent uncompressed: [url, bytes, gzip bytes]
  page.on('requestfailed', (req) => { const why = req.failure()?.errorText || 'failed'; if (!/ERR_ABORTED/.test(why)) fail(req, why, LOCAL_ERR.test(why)); });
  page.on('response', (r) => {
    if (r.status() >= 400) fail(r.request(), `HTTP ${r.status()}`, false);
    const h = r.headers();
    if (r.status() !== 200 || !TEXT.test(h['content-type'] || '')) return;
    if (h['content-encoding'] && h['content-encoding'] !== 'identity') packed++;
    else plain.push(timed(r.body().then((b) => [r.url(), b.length, gzipSync(b).length]), 10000));
  });
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
    const entries = performance.getEntriesByType('resource').map((r) => [r.name, r.initiatorType, r.transferSize || r.encodedBodySize || 0]);
    const n = performance.getEntriesByType('navigation')[0];
    return { fcp: P.fcp, lcp: P.lcp || P.fcp, lcpEl: P.lcpEl, lcpSize: P.lcpSize, cls, tbt, entries, nav: n ? [n.name, n.transferSize || n.encodedBodySize || 0] : null, nodes: document.getElementsByTagName('*').length };
  });
  const fails = [...failed.values()];
  const urls = (...ks) => [...new Set(fails.filter((f) => ks.includes(f.kind)).map((f) => f.url))];
  const where = fails.some((f) => ['js', 'img', 'media'].includes(f.kind))
    ? await page.evaluate(WHERE, { scripts: urls('js'), imgs: urls('img', 'media'), lcpSize: m.lcpSize || 0 }).catch(() => ({}))
    : {};
  for (const f of fails) { f.hold = holdOf(f, prio.get(f.url), where[f.url], url); delete f.url; }
  const texts = (await Promise.all(plain)).filter(Boolean);
  await ctx.close();
  // Bytes by type as served, and gzip-equivalent: what an uncompressed text response would weigh compressed.
  const save = new Map(texts.map(([u, raw, gz]) => [u, Math.max(0, raw - gz)]));
  const bytes = { html: 0 }, gz = { html: 0 };
  const add = (k, name, size) => { bytes[k] = (bytes[k] || 0) + size; gz[k] = (gz[k] || 0) + size - Math.min(size, save.get(name) || 0); };
  for (const [name, init, size] of m.entries) add(kindOf(name, init), name, size);
  if (m.nav) add('html', m.nav[0], m.nav[1]);
  const big = texts.filter(([, raw]) => raw >= 1024); // servers leave text under 1 KB uncompressed on purpose
  const text = { raw: big.reduce((s, t) => s + t[1], 0), gz: big.reduce((s, t) => s + t[2], 0), plain: big.length, packed };
  return { fcp: m.fcp, lcp: m.lcp, lcpEl: m.lcpEl, cls: m.cls, tbt: m.tbt, bytes, gz, text, requests: m.entries.length + 1, nodes: m.nodes, status, failed: fails, wall: Date.now() - t0 };
}

const median = (xs) => { const s = [...xs].sort((p, q) => p - q); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const kb = (b) => `${Math.round(b / 1024)} KB`;
const sum = (o) => Object.values(o).reduce((s, v) => s + v, 0);
// Transfer growth worth a question: more than 50 KB more, gzip-equivalent — about a quarter second on slow 4G. No
// ratio: a tiny old page cannot trip a 50 KB floor on one icon, and a heavy page that grows by hundreds of KB (where
// the seconds are) must not hide behind "less than double". A question for the report, not a failure.
const GROW = 50 * 1024;
const SLOW4G = NETS.slow4g.downloadThroughput;
const byKind = (fs) => Object.entries(fs.reduce((o, f) => ({ ...o, [f.kind]: (o[f.kind] || 0) + 1 }), {})).sort((p, q) => q[1] - p[1]);
// "fonts.googleapis.com: net::ERR_CERT_AUTHORITY_INVALID; use.typekit.net, fonts.bunny.net: net::ERR_TUNNEL_CONNECTION_FAILED"
const reasons = (fs) => {
  const by = new Map();
  for (const f of fs) by.set(f.why, (by.get(f.why) || new Set()).add(f.host));
  const w = [...by].map(([why, hs]) => { const h = [...hs]; return `${h.slice(0, 4).join(', ')}${h.length > 4 ? ` and ${h.length - 4} more` : ''}: ${why}`; });
  return w.slice(0, 4).join('; ') + (w.length > 4 ? `; ${w.length - 4} other error(s)` : '');
};
// "1 font request(s) failed (host: error)" or "3 request(s) failed (2 font, 1 css; host: error; …)"
const failText = (fs) => {
  const k = byKind(fs);
  return k.length === 1 ? `${fs.length} ${k[0][0]} request(s) failed (${reasons(fs)})` : `${fs.length} request(s) failed (${k.map(([n, c]) => `${c} ${n}`).join(', ')}; ${reasons(fs)})`;
};
// The same without the reasons, for a note that gives them per cause: "3 request(s) failed (2 font, 1 css)"
const lostText = (fs) => { const k = byKind(fs); return k.length === 1 ? `${fs.length} ${k[0][0]} request(s) failed` : `${fs.length} request(s) failed (${k.map(([n, c]) => `${c} ${n}`).join(', ')})`; };
// The subject of a clause about part of the failures: a count, or "It"/"They" when the part is all of them.
const subj = (part, all) => (part.length < all.length ? String(part.length) : all.length === 1 ? 'It' : 'They');
const holding = (fs, h) => fs.filter((f) => f.hold === h);
// Each lost file by what it does to the largest paint, singular and plural: "1 render-blocking stylesheet, 2 frames".
const LARGEST = 'at least as large as what was measured as largest', HID = 'whose size the failure hid', SMALL = 'outside the first viewport or smaller than what was measured as largest';
const WHAT = {
  paint: { font: ['font', 'fonts'], css: ['render-blocking stylesheet', 'render-blocking stylesheets'], js: ['parser-blocking script', 'parser-blocking scripts'], img: [`image in the first viewport ${LARGEST}`, `images in the first viewport ${LARGEST}`], media: [`video in the first viewport ${LARGEST}`, `videos in the first viewport ${LARGEST}`] },
  maybe: { js: ['non-blocking script of its own', 'non-blocking scripts of its own'], data: ['data request', 'data requests'], img: [`image in the first viewport ${HID}`, `images in the first viewport ${HID}`], media: [`video in the first viewport ${HID}`, `videos in the first viewport ${HID}`] },
  null: { js: ['non-blocking script from another site', 'non-blocking scripts from other sites'], css: ['stylesheet for another medium', 'stylesheets for other media'], frame: ['frame', 'frames'], img: [`image ${SMALL}`, `images ${SMALL}`], media: [`video ${SMALL}`, `videos ${SMALL}`] },
};
const said = (fs) => {
  const n = new Map();
  for (const f of fs) { const k = `${f.hold}|${f.kind}`; n.set(k, (n.get(k) || 0) + 1); }
  return [...n].sort((p, q) => q[1] - p[1]).map(([k, c]) => { const [h, kind] = k.split('|'); const w = WHAT[h]?.[kind]; return `${c} ${w ? w[c > 1 ? 1 : 0] : kind}`; }).join(', ');
};

async function site(base) {
  const out = [];
  for (const p of paths) {
    const url = urlFor(base, p);
    const rs = [];
    for (let i = 0; i < runs; i++) rs.push(await measure(url));
    const ok = rs.filter((r) => !r.error);
    if (!ok.length) { out.push({ p, error: rs[0].error }); console.log(`✗ ${p}: ${rs[0].error}`); continue; }
    const pick = (k) => ok.map((r) => r[k]);
    const res = {
      p, lcp: median(pick('lcp')), lcpRange: [Math.min(...pick('lcp')), Math.max(...pick('lcp'))], lcpEl: ok[0].lcpEl,
      fcp: median(pick('fcp')), cls: median(pick('cls')), clsMax: Math.max(...pick('cls')), tbt: median(pick('tbt')),
      bytes: ok[0].bytes, gz: ok[0].gz, total: median(ok.map((r) => sum(r.bytes))), gzTotal: median(ok.map((r) => sum(r.gz))), text: ok[0].text,
      requests: ok[0].requests, nodes: ok[0].nodes, runs: ok.length, status: ok[0].status,
      // The run that lost the most requests speaks for the page.
      failed: ok.reduce((w, r) => (r.failed.length > w.length ? r.failed : w), []),
    };
    out.push(res);
    const held = holding(res.failed, 'paint').length;
    const lost = res.failed.length ? `  ⚠ ${failText(res.failed)}: measured without ${byKind(res.failed).length === 1 && res.failed[0].kind === 'font' ? 'its fonts' : 'them'}${held ? `, ${held < res.failed.length ? `${held} of which` : 'which'} ${held > 1 ? 'hold' : 'holds'} up its largest paint` : ''}` : '';
    console.log(`${res.lcp > 2500 || res.cls > 0.1 || res.tbt > 200 || res.status >= 400 ? '⚠' : '✓'} ${p}  ${res.status >= 400 ? `HTTP ${res.status}  ` : ''}LCP ${Math.round(res.lcp)} ms (${res.lcpEl || '?'})  CLS ${res.cls.toFixed(3)}${res.clsMax > res.cls + 0.05 ? ` (up to ${res.clsMax.toFixed(2)})` : ''}  TBT ${Math.round(res.tbt)} ms  ${kb(res.total)}${res.total - res.gzTotal >= 1024 ? ` (${kb(res.gzTotal)} gzipped)` : ''}${lost}`);
  }
  return out;
}

const profile = `${device}, CPU ×${cpu}, ${a.net || (device === 'phone' ? 'slow4g' : 'no network throttling')}, cache off, median of ${runs}`;
console.log(`perf — ${profile}`);
console.log(loadStart.line);
let before = null;
if (a.before) { console.log(`\nbefore: ${a.before}`); before = await site(a.before); console.log(`\nafter: ${a.base}`); }
const after = await site(a.base);
await browser.close();
const loadEnd = load('end');

const good = (rows) => (rows || []).filter((r) => !r.error);
// A server that sent text uncompressed: the page that would save the most, for the preamble.
const plainLine = (url, rows) => {
  const w = good(rows).reduce((m, r) => (r.text.raw - r.text.gz > (m ? m.text.raw - m.text.gz : 0) ? r : m), null);
  return w && w.text.raw - w.text.gz >= 5 * 1024 ? `${url} sent text (HTML, CSS, JS, SVG, JSON) uncompressed: up to ${kb(w.text.raw)} a page, ${kb(w.text.gz)} gzipped (${w.p}).` : null;
};
const compresses = (rows) => { const g = good(rows); return g.reduce((s, r) => s + r.text.packed, 0) > g.reduce((s, r) => s + r.text.plain, 0); };
const plainNotes = [plainLine(before ? `The new build (${a.base})` : a.base, after), before && plainLine(`The old build (${a.before})`, before)].filter(Boolean);
const loadNote = loadStart.value == null ? 'load average not reported (Windows)'
  : `load average ${loadStart.value.toFixed(2)} → ${loadEnd.value.toFixed(2)} on ${CPUS} CPUs${loadStart.busy || loadEnd.busy ? ' (busy machine: these numbers are relative only)' : ''}`;
const md = ['# Performance (lab)', '', `${a.base}${a.before ? ` against ${a.before}` : ''} · ${profile} · ${loadNote} · ${new Date().toISOString().slice(0, 16)}`, '',
  'Lab numbers from emulated throttling on a local server: they rank builds and catch regressions; they do not predict field data. LCP ≤ 2.5 s, CLS ≤ 0.1, TBT ≤ 200 ms are the "good" thresholds.', '',
  ...(plainNotes.length ? [`${plainNotes.join(' ')} Transfer below is as served; the transfer-growth check compares gzip-equivalent sizes, since a production host compresses text.`, ''] : []),
  '| Page | LCP (range) | LCP element | FCP | CLS | TBT | Transfer (html / css / js / font / img) | Requests | DOM nodes |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ...after.map((r) => (r.error ? `| ${r.p} | failed: ${r.error} | | | | | | | |` : `| ${r.p}${r.status >= 400 ? ` (HTTP ${r.status})` : ''}${r.failed.length ? ' (requests failed here)' : ''} | ${Math.round(r.lcp)} ms (${Math.round(r.lcpRange[0])}–${Math.round(r.lcpRange[1])}) | \`${r.lcpEl}\` | ${Math.round(r.fcp)} ms | ${r.cls.toFixed(3)} | ${Math.round(r.tbt)} ms | ${kb(r.total)} (${['html', 'css', 'js', 'font', 'img'].map((k) => kb(r.bytes[k] || 0)).join(' / ')}) | ${r.requests} | ${r.nodes} |`))];
const flags = good(after).flatMap((r) => [
  r.status >= 400 && `${r.p}: the page answered HTTP ${r.status}: these are the error page's numbers`,
  r.lcp > 2500 && `${r.p}: LCP ${Math.round(r.lcp)} ms over 2.5 s (element \`${r.lcpEl}\`)`,
  r.cls > 0.1 && `${r.p}: CLS ${r.cls.toFixed(3)} over 0.1`,
  r.clsMax > 0.1 && r.cls <= 0.1 && `${r.p}: CLS reached ${r.clsMax.toFixed(2)} in one run — intermittent; find the late element`,
  r.tbt > 200 && `${r.p}: TBT ${Math.round(r.tbt)} ms over 200 ms (long main-thread tasks: INP risk)`,
].filter(Boolean));
const notes = []; // ◇ questions and caveats for the report, not failures
const names = (rows) => rows.map((r) => r.p).join(', ');
const those = (rows) => (rows.length > 1 ? 'those pages' : 'that page');
// What the lost files do to LCP, page by page. `faster` ends the sentence for pages whose LCP they sped up.
const lcpEffect = (rows, faster) => {
  const paint = rows.filter((r) => holding(r.failed, 'paint').length);
  const maybe = rows.filter((r) => !paint.includes(r) && holding(r.failed, 'maybe').length);
  const none = rows.filter((r) => r.failed.length && !paint.includes(r) && !maybe.includes(r));
  const of = (rs) => rs.flatMap((r) => r.failed);
  const held = holding(of(paint), 'paint'), one = of(maybe).length === 1;
  return [
    paint.length && `On ${names(paint)} ${held.length < of(paint).length ? 'some of the lost files hold' : held.length > 1 ? 'the lost files hold' : 'the lost file holds'} up the largest paint (${said(held)}), so ${faster}`,
    maybe.length && `On ${names(maybe)} ${one ? 'the lost file blocks' : 'the lost files block'} no rendering (${said(of(maybe))}): LCP is faster here only if ${one ? 'it' : 'one of them'} is or draws the page's largest element, so check what its LCP element is`,
    none.length && `On ${names(none)} ${of(none).length === 1 ? 'the lost file cannot' : 'none of the lost files can'} hold up the largest paint (${said(of(none))}), so the LCP there stands`,
  ].filter(Boolean);
};
// The new build's own failed requests, with or without --before: its figures are not production figures either.
const incomplete = good(after).filter((r) => r.failed.length);
if (incomplete.length) {
  const all = incomplete.flatMap((r) => r.failed), local = all.filter((f) => f.local), own = all.filter((f) => !f.local);
  notes.push([`new build measured without some of its files on ${names(incomplete)}: ${lostText(all)}`,
    local.length && `${subj(local, all)} could not be fetched from this machine (${reasons(local)}), so its transfer on ${those(incomplete)} is lighter than it will be in production. Self-host what it can (fonts: performance.md §4) or measure where those hosts load`,
    own.length && `${subj(own, all)} failed in a way that is the build's own (${reasons(own)}): a file it references that was not served or was blocked. Fix or remove the reference; until then its figures leave the file out`,
    ...lcpEffect(incomplete, `its LCP there is faster than it will be once those files load, and does not show that it meets the budget${before ? ' or keeps up with the baseline' : ''}`),
  ].filter(Boolean).join('. '));
}
if (before) {
  // Said whenever the baseline lost requests, not only when it would excuse a regression: it skews every comparison
  // (the old pages look lighter than the live site, and faster where a lost file holds up the largest paint),
  // including a new build that "got heavier".
  const broken = good(before).filter((b) => b.failed.length || b.status >= 400);
  if (broken.length) {
    const all = broken.flatMap((b) => b.failed), local = all.filter((f) => f.local), own = all.filter((f) => !f.local);
    const errPages = broken.filter((b) => b.status >= 400);
    const both = broken.filter((b) => incomplete.some((r) => r.p === b.p));
    notes.push([`broken baseline on ${names(broken)}${all.length ? `: ${lostText(all)} on the old build` : ''}`,
      errPages.length && `The old build answered ${errPages.map((b) => `HTTP ${b.status} for ${b.p}`).join(', ')} itself: its figures there are its error page's; compare with the old URL that serves the page`,
      local.length && `${subj(local, all)} could not be fetched from this machine (${reasons(local)}), so the old build was measured without files it downloads in production: its transfer on ${those(broken.filter((b) => b.failed.some((f) => f.local)))} is lighter than the live site's`,
      own.length && `${subj(own, all)} failed in a way that may be the old site's own (${reasons(own)}): missing or blocked in production too (then those figures stand) or only in this copy of it; check one against the live site`,
      ...lcpEffect(broken, `its LCP there is faster than the live site's${broken.some((b) => b.failed.some((f) => f.hold === 'paint' && f.local)) ? '' : ' if those files load there'}: an LCP comparison on ${those(broken.filter((b) => holding(b.failed, 'paint').length))} is not a verdict`),
      `${broken.some((b) => b.status >= 400 || holding(b.failed, 'paint').length) ? 'Judge the new build against the budget as well as the baseline, and say' : 'Say'} so in the report${both.length ? ` (on ${names(both)} the new build's own requests failed too: see its note)` : ''}`,
    ].filter(Boolean).join('. '));
  }
  // Compression changes the bytes on a throttled wire, so it moves FCP and LCP: part of the difference is the servers'.
  if (compresses(before) !== compresses(after)) {
    const [side, rows, other] = compresses(before) ? ['new', after, 'old'] : ['old', before, 'new'];
    const w = good(rows).reduce((m, r) => Math.max(m, r.text.raw - r.text.gz), 0);
    if (w >= 5 * 1024) notes.push(`compression differs: the ${side} build's server sent text uncompressed (gzip would save up to ${kb(w)} a page) and the ${other} build's compressed it. On a throttled network that alone moves FCP and LCP, so part of the difference is the servers', not the builds'. Serve both the same way, or say so in the report; the transfer-growth check already compares gzip-equivalent sizes`);
  }
  md.push('', '## Against the baseline', '', '| Page | LCP | CLS | TBT | Transfer |', '| --- | --- | --- | --- | --- |');
  for (const r of after) {
    const b = before.find((x) => x.p === r.p);
    if (!b || b.error || r.error) continue;
    const bad = b.failed.length || b.status >= 400;
    const d = (x, y, u = 'ms') => `${Math.round(y)} → ${Math.round(x)} ${u}`;
    const mark = [bad && 'baseline broken', r.failed.length && "new build's requests failed here"].filter(Boolean).join('; ');
    md.push(`| ${r.p}${mark ? ` (${mark})` : ''} | ${d(r.lcp, b.lcp)} | ${b.cls.toFixed(3)} → ${r.cls.toFixed(3)} | ${d(r.tbt, b.tbt)} | ${kb(b.total)} → ${kb(r.total)} |`);
    // Only a lost file that holds up the largest paint (or an error page) excuses a slower page; any other failure
    // leaves the old LCP as it is live, and the regression stands.
    const slower = `${r.p}: slower than the baseline (LCP ${Math.round(b.lcp)} → ${Math.round(r.lcp)} ms)`;
    const held = holding(b.failed, 'paint'), maybe = holding(b.failed, 'maybe');
    if (r.lcp > b.lcp * 1.1 + 100) flags.push(b.status >= 400
      ? `${slower}, but the old URL answered HTTP ${b.status}: that baseline is its error page (see its note). Judge this page against the budget`
      : held.length
        ? `${slower}, but the old page was measured without files that hold up its largest paint (${said(held)}; see the broken-baseline note), so its LCP here is faster than live. Measure the old page where they load before calling this a regression; until then judge this page against the budget`
        : `${slower} — within budget is not enough when the old build was faster${!b.failed.length ? ''
          : maybe.length ? ` (the old page's failed requests here block no rendering: ${said(b.failed)}; they explain this only if one of them is or draws its largest element)`
            : ` (the old page's failed requests here cannot hold up its largest paint, so they do not explain it: ${said(b.failed)})`}`);
    if (r.cls > b.cls + 0.05) flags.push(`${r.p}: more layout shift than the baseline (${b.cls.toFixed(3)} → ${r.cls.toFixed(3)})`);
    const grow = r.gzTotal - b.gzTotal;
    if (grow > GROW) {
      // Where the growth is, by type (first run of each, gzip-equivalent; ≥ 5 KB), so the question points at something.
      const by = [...new Set([...Object.keys(r.gz), ...Object.keys(b.gz)])].map((k) => [k, (r.gz[k] || 0) - (b.gz[k] || 0)])
        .filter(([, v]) => v >= 5 * 1024).sort((p, q) => q[1] - p[1]);
      const served = Math.abs(r.total - r.gzTotal) >= 1024 || Math.abs(b.total - b.gzTotal) >= 1024
        ? `${kb(b.total)} → ${kb(r.total)} as served, ${kb(b.gzTotal)} → ${kb(r.gzTotal)} gzip-equivalent` : `${kb(b.total)} → ${kb(r.total)}`;
      notes.push(`${r.p}: transfer ${served} (+${kb(grow)}, about ${(grow / SLOW4G).toFixed(1)} s more on slow 4G${by.length ? `: ${by.map(([k, v]) => `${k} +${kb(v)}`).join(', ')}` : ''}) — what does it buy? Are the fonts self-hosted, woff2, subset and only the weights used; is every script needed on this page; are images sized to their box? Growth can be right; answer it in the report${bad ? ' (part of the gap is what the broken baseline never downloaded)' : ''}${r.failed.length ? " (and the new build's failed requests are not in its figure)" : ''}`);
    }
  }
}
md.push('', '## Flags', '', ...(flags.length || notes.length ? [...flags.map((f) => `- ⚠ ${f}`), ...notes.map((n) => `- ◇ ${n}`)] : ['- ✓ none']));
const outFile = String(a.out || 'perf.md');
await writeFile(outFile, md.join('\n') + '\n');
console.log(`\n${loadEnd.line}`);
console.log(`${flags.length ? `${flags.length} flag(s)` : 'no flags'}${notes.length ? `, ${notes.length} note(s) to answer in the report (◇)` : ''} · ${outFile}`);
