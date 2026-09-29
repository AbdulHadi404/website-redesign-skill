// Experiment 2b: image placeholders and progressive formats.
//  (a) Sizes of BlurHash / ThumbHash / 16 px WebP and AVIF LQIPs / dominant colour for 8 photos, and their decoders.
//  (b) Main-thread cost of drawing 24 placeholders of each kind, at CPU 1× and 4× (median of 5).
//  (c) A filmstrip of the same 1600 px hero as baseline JPEG, progressive JPEG, WebP and AVIF under slow 4G (CDP
//      screencast): when the first pixels show, when it is 90% there, when it is complete, and what LCP reports.
//  (d) shots/placeholders-concert.jpg: one public-domain photo and its placeholders side by side.
//   node run-placeholders.mjs [--runs 5]
import path from 'node:path';
import sharp from 'sharp';
import { launch, siteRoot, here, env, newPage, NETS, median, r0, r1, load, saveResult, sleep } from './lib/common.mjs';
import { serve } from './lib/serve.mjs';
import { buildPlaceholders } from './lib/build-placeholders.mjs';

const args = process.argv.slice(2);
const RUNS = Number(args[args.indexOf('--runs') + 1]) || 5;
const built = await buildPlaceholders();
const srv = await serve(siteRoot);
const { browser } = await launch();
const out = { env: env(), built, decode: [], film: [] };

const KINDS = ['color', 'blurhash', 'blurhash-6x4', 'blurhash-full', 'blurhash-dataurl', 'thumbhash', 'thumbhash-canvas', 'webp', 'avif'];
// warm-up: one throwaway load so the first measured kind does not pay the browser's own start-up costs
{ const { ctx, page } = await newPage(browser, {}); await page.goto(`${srv.url}/placeholders/?kind=avif`); await page.waitForFunction(() => window.__r, null, { timeout: 30000 }); await ctx.close(); }
for (const cpu of [1, 4]) for (const kind of KINDS) for (let i = 0; i < RUNS; i++) {
  const { ctx, page } = await newPage(browser, { cpu });
  await page.goto(`${srv.url}/placeholders/?kind=${kind}`);
  await page.waitForFunction(() => window.__r, null, { timeout: 30000 });
  out.decode.push({ cpu, kind, ...(await page.evaluate(() => window.__r)) });
  await ctx.close();
}

// visual sheet
{
  const { ctx, page } = await newPage(browser, { phone: false });
  await page.setViewportSize({ width: 1260, height: 190 });
  await page.goto(`${srv.url}/placeholders/sheet.html`);
  await sleep(800);
  const png = await page.screenshot();
  await sharp(png).jpeg({ quality: 82 }).toFile(path.join(here, 'shots/placeholders-concert.jpg'));
  await ctx.close();
}

// filmstrips: screenshots polled every ~100 ms (the screencast sent too few frames headless). The viewport is taller
// than the image: Chromium drops an image that covers the whole viewport from LCP (largest_contentful_paint_calculator.cc, spec step 7).
const FILM_NETS = { slow4g: NETS.slow4g, slow3g: { latency: 400, downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8 } };
async function film(k, netName) {
  const { ctx, page, cdp } = await newPage(browser, { cpu: 4, net: FILM_NETS[netName], phone: false, cache: false });
  await page.setViewportSize({ width: 800, height: 900 });
  const frames = [];
  const t0 = Date.now();
  let loaded = false;
  const nav = page.goto(`${srv.url}/placeholders/hero-${k}.html`, { waitUntil: 'load', timeout: 120000 }).then(() => { loaded = true; });
  let after = 0;
  while (after < 6) {
    const s = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 60, clip: { x: 0, y: 0, width: 800, height: 653, scale: 0.25 } }).catch(() => null);
    if (s) frames.push({ t: (Date.now() - t0) / 1000, data: s.data });
    if (loaded) after++;
    await sleep(80);
    if (Date.now() - t0 > 60000) break;
  }
  await nav;
  const { lcp, lcpEl } = await page.evaluate(() => ({ lcp: window.__lcp, lcpEl: window.__lcpEl }));
  await ctx.close();
  const dec = await Promise.all(frames.map(async (f) => ({ t: f.t, px: await sharp(Buffer.from(f.data, 'base64')).resize(100, 82, { fit: 'fill' }).greyscale().raw().toBuffer() })));
  const final = dec[dec.length - 1].px;
  const diff = (a) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - final[i]); return s / a.length; };
  const blankDiff = (() => { let s = 0; for (let i = 0; i < final.length; i++) s += Math.abs(255 - final[i]); return s / final.length; })();
  let first = null, half = null, ninety = null, done = null, steps = 0, prevShown = 0;
  const curve = [];
  for (const f of dec) {
    const shown = 1 - diff(f.px) / blankDiff; // 0 = blank page, 1 = final image
    curve.push([Math.round(f.t * 1000), +shown.toFixed(3)]);
    if (first == null && shown > 0.05) first = f.t;
    if (half == null && shown >= 0.5) half = f.t;
    if (ninety == null && shown >= 0.9) ninety = f.t;
    if (shown - prevShown > 0.02) steps++;
    prevShown = shown;
  }
  for (let i = dec.length - 1; i > 0; i--) if (diff(dec[i - 1].px) > 0.5) { done = dec[i].t; break; }
  return { k, net: netName, bytes: built.progressive[k], frames: dec.length, visibleSteps: steps, firstMs: first * 1000, halfMs: half * 1000, ninetyMs: ninety * 1000, completeMs: (done ?? first) * 1000, lcp, lcpEl, curve };
}
for (const netName of Object.keys(FILM_NETS)) for (const k of Object.keys(built.progressive)) for (let i = 0; i < RUNS; i++) { const f = await film(k, netName); out.film.push(f); const { curve, ...rest } = f; console.log(JSON.stringify(rest)); }

await browser.close();
await srv.close();
const D = {};
for (const cpu of [1, 4]) for (const kind of KINDS) { const s = out.decode.filter((x) => x.cpu === cpu && x.kind === kind); D[`${cpu}x|${kind}`] = { syncMs: r1(median(s.map((x) => x.sync))), decodedMs: r1(median(s.map((x) => x.decoded))), paintedMs: r1(median(s.map((x) => x.painted))) }; }
const F = {};
for (const netName of Object.keys(FILM_NETS)) for (const k of Object.keys(built.progressive)) { const s = out.film.filter((x) => x.k === k && x.net === netName); F[`${netName}|${k}`] = { kb: r0(built.progressive[k] / 1024), visibleSteps: r0(median(s.map((x) => x.visibleSteps))), firstMs: r0(median(s.map((x) => x.firstMs))), halfMs: r0(median(s.map((x) => x.halfMs))), ninetyMs: r0(median(s.map((x) => x.ninetyMs))), completeMs: r0(median(s.map((x) => x.completeMs))), lcp: r0(median(s.map((x) => x.lcp))), lcpEl: s[0]?.lcpEl }; }
// keep one similarity curve per cell (the median run by completion time) and drop the rest
const keepCurve = new Set(Object.keys(F).map((key) => { const [n, k] = key.split('|'); const s = out.film.filter((x) => x.k === k && x.net === n).sort((a, b) => a.completeMs - b.completeMs); return s[s.length >> 1]; }));
out.film = out.film.map((f) => (keepCurve.has(f) ? f : { ...f, curve: undefined }));
out.decodeSummary = D; out.filmSummary = F; out.env.loadavgAtEnd = load();
await saveResult('placeholders', out);
console.table(D); console.table(F);
