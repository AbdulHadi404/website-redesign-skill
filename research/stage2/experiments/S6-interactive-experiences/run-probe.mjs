#!/usr/bin/env node
/**
 * run-probe.mjs — validate lib/probe-canvas.mjs (v2) on pages it must get right, including the
 * five cases where v1 gave false results in review (a WebGL canvas with the default drawing
 * buffer, a canvas below the fold, 70 links before the canvas, a link over an animated hero,
 * listeners on the wrapper div) and pages from other stage-2 experiments when present.
 *
 *   node run-probe.mjs [--only name,name] [--no-external]     writes results/probe.json
 *
 * Every case runs twice: with reduced motion (as run-toy.mjs uses it) and without.
 * "expected" is the verdict a careful human reviewer would give; "agree" compares it.
 */
import http from 'node:http';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { probeCanvas } from './lib/probe-canvas.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../../..');
const { launch } = await import(path.join(repo, 'skills/website-redesign/scripts/lib/env.mjs'));
const ONLY = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1].split(',') : null;
const EXTERNAL = !process.argv.includes('--no-external');
const PIXI = path.join(here, 'node_modules/pixi.js/dist/pixi.min.mjs');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm', '.riv': 'application/octet-stream', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

// Pages derived from the toy at serve time (so they cannot drift from it).
const NAV = `<nav style="font-size:10px;line-height:1">${Array.from({ length: 70 }, (_, i) => `<a href="#l${i + 1}">Link ${i + 1}</a>`).join(' ')}</nav>`;
const GEN = {
  '/toy/gen-b-below.html': ['b-proxies.html', (s) => s.replace('<h1>Top the cake</h1>', '<h1>Top the cake</h1><div style="height:1400px">Scroll down to the cake.</div>')],
  '/toy/gen-b-nav.html': ['b-proxies.html', (s) => s.replace('<body>', '<body>' + NAV)],
  '/toy/gen-b-juice-always.html': ['b-proxies.html', (s) => s.replace("juice: 'respect-reduced-motion'", "juice: 'always'")],
};
// The lab's own pages under /toy/ and /fx/; each external root on its own server at / (their pages use absolute URLs).
const roots = { '/toy/': path.join(here, 'toy'), '/fx/': path.join(here, 'probe-fixtures') };
const EXT_ROOTS = {
  s2: path.join(repo, 'research/stage2/experiments/S2-motion-lab'),
  s10: path.join(repo, 'research/stage2/experiments/S10-shaders-generative/dist'),
  regress: path.join(repo, 'tools/regress/fixtures'),
};
function start(mounts) {
  const server = http.createServer(async (req, res) => {
    const u = new URL(req.url, 'http://x');
    try {
      let body, p;
      if (u.pathname === '/vendor/pixi.mjs') p = PIXI;
      else if (GEN[u.pathname]) { const [src, fn] = GEN[u.pathname]; body = fn(await readFile(path.join(here, 'toy', src), 'utf8')); p = 'x.html'; }
      else {
        const [prefix, root] = Object.entries(mounts).find(([k]) => u.pathname.startsWith(k)) || [];
        if (!root) throw new Error('no root');
        p = path.join(root, decodeURIComponent(u.pathname.slice(prefix.length)));
        if (!p.startsWith(root)) throw new Error('outside');
      }
      body ??= await readFile(p);
      res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(body);
    } catch { res.writeHead(404).end('not found'); }
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r({ base: `http://127.0.0.1:${server.address().port}`, close: () => server.close() })));
}
const servers = { lab: await start(roots) };
for (const [k, root] of Object.entries(EXT_ROOTS)) servers[k] = await start({ '/': root });
const exists = async (p) => access(p).then(() => true, () => false);

// [name, url, expected {reduce, noPreference}, why, ready-check]
const toyReady = () => window.__toy?.ready;
const CASES = [
  ['toy a canvas only', '/toy/a-canvas.html', ['FAIL', 'FAIL'], 'mouse-only drag toy', toyReady],
  ['toy b proxies', '/toy/b-proxies.html', ['PASS', 'PASS'], 'stand-ins, keys, status; juice off under reduce (INFO-free)', toyReady],
  ['toy c form', '/toy/c-form.html', ['PASS', 'PASS'], 'canvas is role=img named by the model', toyReady],
  ['toy d hybrid', '/toy/d-hybrid.html', ['PASS', 'PASS'], 'b + c', toyReady],
  ['toy e Pixi defaults (default drawing buffer)', '/toy/e-pixi.html', ['FAIL', 'FAIL'], 'Tab adds no layer in 8.21.0', toyReady],
  ['toy f Pixi enabledByDefault (default drawing buffer)', '/toy/f-pixi-enabled.html', ['WARN', 'WARN'], 'Enter on a palette button adds a topping, silently; stand-ins take the pointer', toyReady],
  ['review: b below the fold', '/toy/gen-b-below.html', ['PASS', 'PASS'], 'v1 false FAIL (stale canvas box)', toyReady],
  ['review: b after 70 links', '/toy/gen-b-nav.html', ['PASS', 'PASS'], 'v1 false FAIL (Tab walk stopped at 60)', toyReady],
  ['b with juice that ignores reduced motion', '/toy/gen-b-juice-always.html', ['WARN', 'PASS'], 'the reduced-motion check must see the juice', toyReady],
  ['review: WebGL, keyboard + status, default buffer', '/fx/webgl-kb.html', ['PASS', 'PASS'], 'v1 false FAIL (toDataURL blank)'],
  ['review: WebGL, keyboard + status, preserveDrawingBuffer', '/fx/webgl-kb.html?preserve', ['PASS', 'PASS'], 'control'],
  ['WebGL, mouse only, default buffer', '/fx/webgl-mouse.html', ['FAIL', 'FAIL'], 'true negative through the screenshot path'],
  ['review: animated hero, link over canvas, hue on pointerdown', '/fx/hero-link.html', ['FAIL', 'FAIL'], 'v1 crashed (pressed Enter on the link); pointer effect has no keyboard path (probe cannot know it is decorative); must not navigate'],
  ['animated hero, hover only, aria-hidden, still under reduce', '/fx/hero-hover.html', ['PASS', 'PASS'], 'hover-reactive decoration is not a FAIL'],
  ['review: drag toy, listeners on wrapper div', '/fx/wrapper-listener.html', ['FAIL', 'FAIL'], 'v1 false PASS (R3F-style event source)'],
  ['React-style synthetic handler (simulated)', '/fx/react-props.html', ['FAIL', 'FAIL'], 'handler only in __reactProps$'],
  ['animated canvas + stand-in + status', '/fx/spinner-kb.html', ['PASS', 'PASS'], 'self-animating without reduce: narration is the evidence'],
  ['focusable game canvas, arrows, silent', '/fx/canvas-keys.html', ['WARN', 'WARN'], 'keys work, no objects, no narration'],
  ['configurator, radios beside, drag-to-spin', '/fx/configurator-beside.html', ['WARN', 'WARN'], 'keyboard path beside; drag verb unmatched'],
  ['static canvas, no name', '/fx/static-unnamed.html', ['WARN', 'WARN'], '1.1.1'],
  ['static WebGL canvas, fallback content', '/fx/static-fallback.html', ['PASS', 'PASS'], 'fallback content is its text alternative'],
];
const EXT = [
  ['S2 Rive rating', 's2:/captures/b/rive-rating.html', 'research/stage2/experiments/S2-motion-lab/captures/b/rive-rating.html', ['FAIL', 'FAIL'], 'mouse only (S2)'],
  ['S2 Rive semantics', 's2:/captures/b/rive-semantics.html', 'research/stage2/experiments/S2-motion-lab/captures/b/rive-semantics.html', ['FAIL', 'FAIL'], 'S2: keyboardToggles false'],
  ['S10 fluid demo', 's10:/g-fluid-demo/index.html', 'research/stage2/experiments/S10-shaders-generative/dist/g-fluid-demo/index.html', ['FAIL', 'FAIL'], 'decorative pointer fluid with links over it; pointer-only (decorative exemption is a human call); must not navigate'],
  ['regress capture-webgl', 'regress:/capture-webgl.html', 'tools/regress/fixtures/capture-webgl.html', ['PASS', 'PASS'], 'static WebGL with fallback text (reviewer: WARN under v1, which ignored fallback content)'],
];
const cases = CASES.map(([n, u, e, why, ready]) => ({ name: n, url: u, expected: e, why, ready }));
const abs = (u) => { const m = /^(\w+):(\/.*)$/.exec(u); return m ? servers[m[1]].base + m[2] : servers.lab.base + u; };
if (EXTERNAL) for (const [n, u, f, e, why] of EXT) if (await exists(path.join(repo, f))) cases.push({ name: n, url: u, expected: e, why, external: true });
const run = cases.filter((c) => !ONLY || ONLY.some((o) => c.name.includes(o)));

const { browser } = await launch();
const results = { date: new Date().toISOString(), chromium: browser.version(), cases: [] };
try {
  for (const c of run) {
    const row = { name: c.name, url: c.url, why: c.why, external: !!c.external };
    for (const [mi, reduce] of [[0, true], [1, false]]) {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: reduce ? 'reduce' : 'no-preference' });
      const page = await ctx.newPage();
      const errs = []; page.on('pageerror', (e) => errs.push(e.message.slice(0, 120)));
      const t0 = Date.now();
      const key = reduce ? 'reduce' : 'noPreference';
      try {
        await page.goto(abs(c.url), { waitUntil: 'load' });
        if (c.ready) await page.waitForFunction(c.ready, null, { timeout: 15000 });
        await page.waitForTimeout(1200);
        const r = await probeCanvas(page, { reduce });
        const verdict = r.length ? r.reduce((a, x) => (['PASS', 'WARN', 'FAIL', 'ERROR'].indexOf(x.verdict) > ['PASS', 'WARN', 'FAIL', 'ERROR'].indexOf(a) ? x.verdict : a), 'PASS') : 'no canvas';
        row[key] = {
          verdict, expected: c.expected[mi], agree: verdict === c.expected[mi], seconds: Math.round((Date.now() - t0) / 1000),
          finalPathSame: new URL(page.url()).pathname === new URL(abs(c.url)).pathname,
          canvases: r.map((x) => ({ verdict: x.verdict, findings: x.findings.map((f) => `${f.level}: ${f.msg}`), operable: x.operable, documentLevelOnly: x.documentLevelOnly, hover: x.hoverReactive, listeners: x.listeners, exposure: x.exposure, selfAnimating: x.selfAnimating, baseline: x.baseline, rafPerSecondAtRest: x.rafPerSecondAtRest, walk: x.walk, stops: x.stops, standIns: x.standIns, keyboardPath: x.keyboardPath, tried: x.tried.length })),
          pageErrors: errs.slice(0, 3),
        };
      } catch (e) {
        row[key] = { verdict: 'CRASH', expected: c.expected[mi], agree: false, error: e.message.split('\n')[0], finalUrl: page.url() };
      }
      console.error(`${c.name} [${key}] ${row[key].verdict} (expected ${c.expected[mi]}) ${row[key].seconds ?? ''}s`);
      await ctx.close();
    }
    results.cases.push(row);
  }
} finally { await browser.close(); for (const s of Object.values(servers)) s.close(); }
const both = results.cases.flatMap((c) => [c.reduce, c.noPreference]);
results.summary = { cases: results.cases.length, runs: both.length, agree: both.filter((x) => x.agree).length, crashes: both.filter((x) => x.verdict === 'CRASH').length, navigatedAway: both.filter((x) => x.finalPathSame === false).length };
await mkdir(path.join(here, 'results'), { recursive: true });
await writeFile(path.join(here, 'results', ONLY ? 'probe-only.json' : 'probe.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results.summary));
for (const c of results.cases) console.log(`${c.reduce.agree && c.noPreference.agree ? 'ok ' : 'NO '} ${c.name}: reduce ${c.reduce.verdict}/${c.reduce.expected}, no-pref ${c.noPreference.verdict}/${c.noPreference.expected}`);
