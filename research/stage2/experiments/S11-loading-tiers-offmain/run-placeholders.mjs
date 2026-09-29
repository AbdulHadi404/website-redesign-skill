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

const KINDS = ['color', 'blurhash', 'blurhash-6x4', 'blurhash-dataurl', 'thumbhash', 'webp', 'avif'];
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

// filmstrips
async function film(k) {
  const { ctx, page, cdp } = await newPage(browser, { cpu: 4, net: NETS.slow4g, phone: false, cache: false });
  await page.setViewportSize({ width: 800, height: 653 });
  const frames = [];
  cdp.on('Page.screencastFrame', async (f) => { frames.push({ t: f.metadata.timestamp, data: f.data }); cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
  await cdp.send('Page.enable');
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 70, maxWidth: 400, maxHeight: 400, everyNthFrame: 1 });
  let navT = 0;
  cdp.on('Page.frameStartedLoading', () => { if (!navT) navT = Date.now() / 1000; });
  const t0 = Date.now() / 1000;
  await page.goto(`${srv.url}/placeholders/hero-${k}.html`, { waitUntil: 'load', timeout: 90000 });
  await sleep(800);
  const lcp = await page.evaluate(() => window.__lcp);
  await cdp.send('Page.stopScreencast');
  await ctx.close();
  // Compare every frame with the last one over the image area: first frame with any image pixels, first at ≥ 90% similar, last change.
  const dec = await Promise.all(frames.map(async (f) => ({ t: f.t, px: await sharp(Buffer.from(f.data, 'base64')).resize(100, 82, { fit: 'fill' }).greyscale().raw().toBuffer() })));
  const final = dec[dec.length - 1].px;
  const white = 255;
  const diff = (a) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - final[i]); return s / a.length; };
  const blankDiff = (() => { let s = 0; for (let i = 0; i < final.length; i++) s += Math.abs(white - final[i]); return s / final.length; })();
  const start = t0;
  let first = null, ninety = null, done = null;
  for (const f of dec) {
    const d = diff(f.px);
    const shown = 1 - d / blankDiff; // 0 = blank page, 1 = final image
    if (first == null && shown > 0.05) first = f.t - start;
    if (ninety == null && shown >= 0.9) ninety = f.t - start;
  }
  for (let i = dec.length - 1; i > 0; i--) if (diff(dec[i - 1].px) > 0.5) { done = dec[i].t - start; break; }
  return { k, bytes: built.progressive[k], frames: dec.length, firstMs: first * 1000, ninetyMs: ninety * 1000, completeMs: done * 1000, lcp };
}
for (const k of Object.keys(built.progressive)) for (let i = 0; i < RUNS; i++) { const f = await film(k); out.film.push(f); console.log(f); }

await browser.close();
await srv.close();
const D = {};
for (const cpu of [1, 4]) for (const kind of KINDS) { const s = out.decode.filter((x) => x.cpu === cpu && x.kind === kind); D[`${cpu}x|${kind}`] = { syncMs: r1(median(s.map((x) => x.sync))), decodedMs: r1(median(s.map((x) => x.decoded))), paintedMs: r1(median(s.map((x) => x.painted))) }; }
const F = {};
for (const k of Object.keys(built.progressive)) { const s = out.film.filter((x) => x.k === k); F[k] = { kb: r0(built.progressive[k] / 1024), firstMs: r0(median(s.map((x) => x.firstMs))), ninetyMs: r0(median(s.map((x) => x.ninetyMs))), completeMs: r0(median(s.map((x) => x.completeMs))), lcp: r0(median(s.map((x) => x.lcp))) }; }
out.decodeSummary = D; out.filmSummary = F; out.env.loadavgAtEnd = load();
await saveResult('placeholders', out);
console.table(D); console.table(F);
