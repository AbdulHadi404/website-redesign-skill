/**
 * End-to-end runs of the tools that capture as well as compare: Playwright Test toHaveScreenshot, BackstopJS
 * (Playwright engine) and Lost Pixel (OSS "generateOnly" mode). Each: make a baseline from the base page, then one
 * test run per variant, in two configurations — out of the box, and with the dynamic region masked.
 * Records the verdict per variant and width, the wall time of each test run, and what each leaves for an agent.
 */
import { spawn } from 'node:child_process';
import { mkdir, writeFile, readFile, rm, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { chromePath, shellPath, BASE_ARGS } from '../lib/browser.mjs';
import { VARIANTS, TRUTH } from './capture-set.mjs';

const here = path.dirname(new URL(import.meta.url).pathname);
const root = path.resolve(here, '..');
const bin = (n) => path.join(root, 'node_modules/.bin', n);
const q = (v) => (['baseline', 'control', 'binary', 'p3'].includes(v) ? '' : `?v=${v}`);
const launchFor = (v) => ({ executablePath: v === 'binary' ? shellPath() : chromePath(), args: v === 'p3' ? [...BASE_ARGS, '--force-color-profile=display-p3-d65'] : BASE_ARGS });
// Asynchronous on purpose: the fixture server runs in this process and must keep answering while the tool runs.
const timed = (cmd, args, opts) => new Promise((resolve) => {
  const t0 = Date.now();
  const p = spawn(cmd, args, opts);
  let stdout = '', stderr = '';
  p.stdout.on('data', (d) => (stdout += d)); p.stderr.on('data', (d) => (stderr += d));
  p.on('close', (status) => resolve({ status, stdout, stderr, ms: Date.now() - t0 }));
});

async function playwrightTest(base, masked) {
  const out = path.join(root, 'captures/pipelines', `pw-${masked ? 'masked' : 'default'}`);
  await rm(out, { recursive: true, force: true });
  const run = async (v, update) => timed(bin('playwright'), ['test', '-c', path.join(here, 'pw/playwright.config.mjs'), ...(update ? ['--update-snapshots'] : [])],
    { cwd: path.join(here, 'pw'), env: { ...process.env, VR_BASE: base, VR_VARIANT: v, VR_MASK: masked ? '1' : '0', VR_OUT: out } });
  const b = await run('baseline', true);
  const rows = [];
  for (const v of VARIANTS) {
    const r = await run(v, false);
    let rep = null;
    try { rep = JSON.parse(await readFile(path.join(out, `report-${v}.json`), 'utf8')); } catch { /* no report */ }
    const tests = rep?.suites?.flatMap((s) => s.specs.flatMap((sp) => sp.tests)) || [];
    for (const t of tests) {
      const res = t.results[0];
      const msg = res?.errors?.map((e) => e.message).join(' ') || '';
      rows.push({ tool: 'Playwright Test toHaveScreenshot', config: masked ? 'mask [data-dynamic]' : 'defaults', variant: v, regression: TRUTH[v], width: t.projectName === 'desktop' ? 1280 : 390,
        fail: res?.status !== 'passed', diffPixels: Number((msg.match(/(\d+) pixels/) || [])[1]) || null, runMs: r.ms,
        artefacts: (res?.attachments || []).map((a) => a.name).join(',') });
    }
    if (!tests.length) rows.push({ tool: 'Playwright Test toHaveScreenshot', config: masked ? 'mask' : 'defaults', variant: v, error: (r.stderr || r.stdout).slice(-400) });
  }
  return { rows, baselineMs: b.ms, baselineOk: b.status === 0, baselineLog: b.status ? (b.stdout + b.stderr).slice(-600) : '' };
}

async function backstop(base, masked) {
  const out = path.join(root, 'captures/pipelines', `backstop-${masked ? 'masked' : 'default'}`);
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  const cfg = (v) => ({
    id: 'vr', viewports: [{ label: 'desktop', width: 1280, height: 800 }, { label: 'phone', width: 390, height: 844 }],
    scenarios: [{ label: 'home', url: `${base}/fixtures/vr/index.html${q(v)}`, misMatchThreshold: 0.1, requireSameDimensions: true, ...(masked ? { hideSelectors: ['[data-dynamic]'] } : {}) }],
    paths: { bitmaps_reference: `${out}/reference`, bitmaps_test: `${out}/test`, engine_scripts: `${out}/engine`, html_report: `${out}/html`, ci_report: `${out}/ci`, json_report: `${out}/json` },
    report: ['json'], engine: 'playwright', engineOptions: { browser: 'chromium', ...launchFor(v) }, asyncCaptureLimit: 1, asyncCompareLimit: 1, debug: false,
  });
  const run = async (cmd, v) => { const f = path.join(out, `backstop-${v}.json`); await writeFile(f, JSON.stringify(cfg(v), null, 1)); return timed(bin('backstop'), [cmd, `--config=${f}`], { cwd: out }); };
  const b = await run('reference', 'baseline');
  const rows = [];
  for (const v of VARIANTS) {
    const r = await run('test', v);
    let rep = null;
    try { rep = JSON.parse(await readFile(path.join(out, 'json/jsonReport.json'), 'utf8')); } catch { /* none */ }
    for (const t of rep?.tests || []) {
      rows.push({ tool: 'BackstopJS 6.3 (Playwright engine)', config: masked ? 'hideSelectors [data-dynamic]' : 'defaults', variant: v, regression: TRUTH[v], width: t.pair.viewportLabel === 'desktop' ? 1280 : 390,
        fail: t.status !== 'pass', pct: Number(t.pair.diff?.misMatchPercentage ?? t.pair.diff?.rawMisMatchPercentage ?? NaN), runMs: r.ms,
        artefacts: ['reference', 'test', t.pair.diffImage ? 'diff' : null, t.pair.diff?.diffBounds ? `diffBounds ${JSON.stringify(t.pair.diff.diffBounds)}` : null].filter(Boolean).join(',') });
    }
    if (!rep) rows.push({ tool: 'BackstopJS', config: masked ? 'hideSelectors' : 'defaults', variant: v, error: (r.stderr || r.stdout).slice(-400) });
  }
  return { rows, baselineMs: b.ms, baselineOk: b.status === 0, baselineLog: b.status ? (b.stdout + b.stderr).slice(-600) : '' };
}

async function lostPixel(base, masked) {
  const out = path.join(root, 'captures/pipelines', `lostpixel-${masked ? 'masked' : 'default'}`);
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  // Lost Pixel 3.22 pins playwright-core 1.47, which launches Chromium with the old headless mode that Chromium 132+
  // removed from the full binary: only the headless shell starts. Every Lost Pixel run uses it, so its "binary"
  // variant is a plain re-render (reported as n/a).
  const lpLaunch = (v) => ({ ...launchFor(v), executablePath: shellPath() });
  const write = async (v) => writeFile(path.join(out, 'lostpixel.config.cjs'), `module.exports = ${JSON.stringify({
    pageShots: { pages: [{ path: `/fixtures/vr/index.html${q(v)}`, name: 'home', ...(masked ? { mask: [{ selector: '[data-dynamic]' }] } : {}) }], baseUrl: base, breakpoints: [390, 1280] },
    generateOnly: true, failOnDifference: true, compareEngine: 'pixelmatch',
    imagePathBaseline: `${out}/baseline/`, imagePathCurrent: `${out}/current/`, imagePathDifference: `${out}/difference/`,
    browserLaunchOptions: { chromium: lpLaunch(v) },
  }, null, 1)};\n`);
  const env = { ...process.env, LOST_PIXEL_DISABLE_TELEMETRY: '1' };
  await write('baseline');
  const b = await timed(bin('lost-pixel'), ['update'], { cwd: out, env });
  const rows = [];
  for (const v of VARIANTS) {
    await write(v);
    await rm(path.join(out, 'difference'), { recursive: true, force: true });
    const r = await timed(bin('lost-pixel'), [], { cwd: out, env });
    const log = r.stdout + r.stderr;
    const diffs = existsSync(path.join(out, 'difference')) ? await readdir(path.join(out, 'difference')) : [];
    for (const w of [390, 1280]) {
      const failed = diffs.some((f) => f.includes(`${w}`));
      const m = [...log.matchAll(/Difference of (\d+) pixels[^\n]*\(home__\[w(\d+)px\]\)/g)].find((x) => Number(x[2]) === w);
      rows.push({ tool: 'Lost Pixel 3.22 (OSS generateOnly)', config: masked ? 'mask [data-dynamic]' : 'defaults', variant: v, regression: TRUTH[v], width: w, fail: failed, runMs: r.ms, exit: r.status,
        na: v === 'binary' ? 'both sides in the headless shell (its Playwright 1.47 cannot start the full Chromium 141 binary)' : undefined,
        diffPixels: failed && m ? Number(m[1]) : null, artefacts: 'baseline,current,difference png' });
    }
  }
  return { rows, baselineMs: b.ms, baselineOk: b.status === 0, baselineLog: (b.stdout + b.stderr).slice(-800) };
}

export async function runPipelines(base) {
  const results = {};
  for (const [name, fn] of [['playwright', playwrightTest], ['backstop', backstop], ['lostpixel', lostPixel]]) {
    for (const masked of [false, true]) {
      try { results[`${name}-${masked ? 'masked' : 'default'}`] = await fn(base, masked); }
      catch (e) { results[`${name}-${masked ? 'masked' : 'default'}`] = { error: String(e.message || e).slice(0, 400) }; }
    }
  }
  return results;
}

export async function runOne(name, base, masked) {
  return ({ pw: playwrightTest, backstop, lp: lostPixel })[name](base, masked);
}
