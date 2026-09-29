#!/usr/bin/env node
/**
 * Stream S7 runner: rebuilds and re-measures everything, and writes results.json.
 *
 *   npm install && ./fetch-sites.sh        once (the Astro example is the "real site"; skipped if missing)
 *   node run.mjs                           everything (about 25 min on 4 shared CPUs)
 *   node run.mjs vr | sweep | stress | sheets   one section; the others keep their last results in results.json
 *
 * vr      visual-regression tools on fixtures/vr (a page + 10 variants: 6 regressions, 4 kinds of noise), at 1280 and
 *         390: image engines on the same PNG pairs (pixelmatch as compare.mjs calls it, Playwright's comparator,
 *         odiff, resemble as BackstopJS uses it, reg-cli), end-to-end tools (Playwright Test toHaveScreenshot,
 *         BackstopJS, Lost Pixel) out of the box and with the dynamic region masked, a pixelmatch threshold sweep,
 *         and a structural (DOM + computed style) diff prototype.
 * sweep   skills/…/scripts/sweep.mjs on the seeded sweep-lab (recall against truth.json), the skill's regression
 *         fixtures, the H-blind-eval permit and Milkline fixtures, and the Astro portfolio build; precision from
 *         verdicts.json (each finding checked by eye in the crops and sheets).
 * stress  skills/…/scripts/stress.mjs on the seeded stress-lab (recall), fixtures and the Astro build; precision
 *         likewise.
 * sheets  copies the sheets the report cites into shots/ (JPEG).
 * motion  capture.mjs twice on a page whose only motion is infinite animations: identical pixels or not?
 * holdout sweep.mjs and stress.mjs on pages never used while their checks were written and tuned (the Hallam &
 *         Price fixture, two regression fixtures, two more Astro pages): precision after tuning, from verdicts.json.
 *         (holdout-sweep and holdout-stress run one half.)
 * holdout2  added after the review, scripts frozen first: 12 pages never used for tuning (Stem & Wren home and order,
 *         G-product-lab's Carbon and Primer pages with their CSS from npm, 4 Bootstrap examples LTR and 4 native RTL).
 * rtl     stress.mjs --only rtl on RTL controls with a truth list (fixtures/rtl-truth.json): S8's bilingual page in
 *         four variants (en/ar × right/broken) and Sanad (ar, en).
 * evidence  do the sheet cells and crops show the element each numbered box marks? legacy vs current code
 *         (evidence/evidence-test.mjs), on fixtures, Sanad (native RTL), Stemwren (width=1100) and a11y-wizard in RTL.
 * guard   captures that record their build (sidecar), and a diff that refuses two different builds (vr/build-guard.mjs).
 * control the same page captured twice in two browser launches, 10 pages × 2 widths × 3 repeats (vr/control.mjs).
 * timing  image-engine timing, interleaved rounds, 7 repeats (vr/timing.mjs).
 * score   re-applies verdicts.json (the by-eye verdicts) to the findings in results.json; runs last by default.
 * Timings are medians where repeated; the machine is shared, so compare them with each other, not with other runs.
 */
import { readFile, writeFile, mkdir, rm, cp, stat } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import { spawn, execFileSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { serve, here, repo } from './lib/server.mjs';
import { SITES as EXT, BOOTSTRAP_LTR, BOOTSTRAP_RTL } from './lib/extra-pages.mjs';

const SKILL = path.join(repo, 'skills/website-redesign/scripts');
const CAP = path.join(here, 'captures');
const SITES = process.env.S7_SITES || '/tmp/s2-S7';
const ASTRO = path.join(SITES, 'portfolio/dist');
const RESULTS = path.join(here, 'results.json');
const S8 = path.join(repo, 'research/stage2/experiments/S8-rtl-mobile-haptics');
const scriptHashes = async () => Object.fromEntries(await Promise.all(['sweep.mjs', 'stress.mjs'].map(async (f) => [f, createHash('sha256').update(await readFile(path.join(SKILL, f))).digest('hex').slice(0, 12)])));
const median = (xs) => { const s = [...xs].filter((x) => x != null).sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

const run = (cmd, args, opts = {}) => new Promise((resolve) => {
  const t0 = Date.now();
  const p = spawn(cmd, args, { ...opts, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '', err = '';
  p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (err += d));
  p.on('close', (code) => resolve({ code, out, err, ms: Date.now() - t0 }));
});

/* ---------------------------------------------------------------- vr */
async function sectionVr(base) {
  const { captureSet, VARIANTS, TRUTH, WIDTHS } = await import('./vr/capture-set.mjs');
  const { runEngines, summarise, thresholdSweep } = await import('./vr/engines.mjs');
  const { runPipelines } = await import('./vr/pipelines.mjs');
  const { runDomDiff } = await import('./vr/run-domdiff.mjs');
  const out = { fixture: 'fixtures/vr/index.html', variants: VARIANTS, truth: TRUTH, widths: WIDTHS.map((w) => w.width) };
  let t0 = Date.now();
  await rm(path.join(CAP, 'vr'), { recursive: true, force: true });
  await captureSet(base, path.join(CAP, 'vr'));
  out.captureMs = Date.now() - t0;
  log('vr: captured', out.captureMs, 'ms');
  const rows = await runEngines(path.join(CAP, 'vr'), path.join(CAP, 'vr-engines'));
  out.engines = summarise(rows);
  out.engineRows = rows.map(({ boxes, ...r }) => ({ ...r, boxes: boxes?.slice(0, 3) }));
  out.thresholdSweep = await thresholdSweep(path.join(CAP, 'vr'));
  log('vr: engines done');
  const pipes = await runPipelines(base);
  out.pipelines = {};
  for (const [k, v] of Object.entries(pipes)) {
    if (v.error) { out.pipelines[k] = { error: v.error }; continue; }
    const rs = v.rows.filter((r) => !r.error);
    const reg = rs.filter((r) => r.regression), noise = rs.filter((r) => !r.regression && !r.na);
    out.pipelines[k] = {
      tool: rs[0]?.tool, config: rs[0]?.config, baselineOk: v.baselineOk, baselineMs: v.baselineMs,
      caught: reg.filter((r) => r.fail).length, regressions: reg.length, missed: reg.filter((r) => !r.fail).map((r) => `${r.variant}@${r.width}`),
      falseAlarms: noise.filter((r) => r.fail).length, noise: noise.length, flaggedNoise: noise.filter((r) => r.fail).map((r) => `${r.variant}@${r.width}`),
      runMsMedian: median([...new Set(rs.map((r) => r.runMs))]), artefacts: rs[0]?.artefacts, errors: v.rows.filter((r) => r.error).map((r) => `${r.variant}: ${r.error.slice(0, 160)}`),
      rows: rs.map((r) => ({ variant: r.variant, width: r.width, fail: r.fail, diffPixels: r.diffPixels ?? null, pct: r.pct ?? null })),
    };
  }
  log('vr: pipelines done');
  const dd = await runDomDiff(base, path.join(CAP, 'vr'));
  out.domDiff = dd;
  // The combination the report proposes: the structural diff decides whether the page changed and names the cause;
  // pixels at threshold 0.05 on stable, masked captures say where and whether it is visible.
  const px = new Map(out.thresholdSweep.map((r) => [`${r.variant}@${r.width}`, r['t0.05']]));
  out.hybrid = dd.map((r) => {
    const p = px.get(`${r.variant}@${r.width}`) ?? null;
    const verdict = r.changed && p > 0 ? 'changed (visible)' : r.changed ? 'changed in code, not in pixels at t0.05' : p > 0 ? 'pixels only: environment or raster noise (or canvas/image content)' : 'unchanged';
    return { variant: r.variant, width: r.width, regression: r.regression, domChanged: r.changed, pixelsT005: p, verdict, cause: r.lines.slice(0, 3) };
  });
  // Setup cost: registry metadata (size unpacked, direct dependencies), recorded when the registry answers.
  out.packages = {};
  for (const p of ['pixelmatch', 'odiff-bin', '@playwright/test', 'backstopjs', 'lost-pixel', 'reg-cli', 'reg-suit', 'loki', '@storybook/test-runner', '@argos-ci/playwright', 'chromatic', '@percy/cli']) {
    try {
      const j = JSON.parse(execFileSync('npm', ['view', p, 'version', 'license', 'dist.unpackedSize', 'dependencies', 'time', '--json'], { stdio: ['ignore', 'pipe', 'ignore'], timeout: 60000 }).toString());
      out.packages[p] = { version: j.version, license: j.license, unpackedKB: Math.round((j['dist.unpackedSize'] || 0) / 1024), directDeps: Object.keys(j.dependencies || {}).length, published: j.time?.[j.version]?.slice(0, 10) };
    } catch { out.packages[p] = { error: 'registry not reachable' }; }
  }
  return out;
}

/* ---------------------------------------------------------------- targets */
function targets(base, astro) {
  const R = `${base}/repo`;
  const t = [
    { name: 'sweep-lab', kind: 'seeded', url: `${base}/fixtures/sweep-lab/`, tools: ['sweep'] },
    { name: 'stress-lab', kind: 'seeded', url: `${base}/fixtures/stress-lab/`, tools: ['stress'] },
    { name: 'slop', kind: 'fixture', url: `${R}/tools/regress/fixtures/slop.html`, tools: ['sweep'] },
    { name: 'dashboard', kind: 'fixture', url: `${R}/tools/regress/fixtures/dashboard.html`, tools: ['sweep', 'stress'] },
    { name: 'govuk', kind: 'fixture', url: `${R}/tools/regress/fixtures/govuk.html`, tools: ['sweep', 'stress'] },
    { name: 'card', kind: 'fixture', url: `${R}/tools/regress/fixtures/card.html`, tools: ['sweep'] },
    { name: 'app-traps', kind: 'fixture', url: `${R}/tools/regress/fixtures/app-traps.html`, tools: ['sweep'] },
    { name: 'states-overflow', kind: 'fixture', url: `${R}/tools/regress/fixtures/states-overflow.html`, tools: ['sweep'] },
    { name: 'permit-home', kind: 'fixture (H-blind-eval old build)', url: `${R}/research/experiments/H-blind-eval/permit/fixture/`, tools: ['sweep', 'stress'] },
    { name: 'permit-apply', kind: 'fixture (H-blind-eval old build)', url: `${R}/research/experiments/H-blind-eval/permit/fixture/apply/`, tools: ['sweep', 'stress'] },
    { name: 'milkline-home', kind: 'fixture (H-blind-eval)', url: `${R}/research/experiments/H-blind-eval/fixture/`, tools: ['sweep'] },
    { name: 'milkline-app', kind: 'fixture (H-blind-eval)', url: `${R}/research/experiments/H-blind-eval/fixture/app/`, tools: ['sweep', 'stress'] },
  ];
  if (astro) t.push(
    { name: 'astro-home', kind: 'real site (Astro portfolio example)', url: `${astro}/`, tools: ['sweep', 'stress'] },
    { name: 'astro-about', kind: 'real site (Astro portfolio example)', url: `${astro}/about/`, tools: ['sweep'] },
    { name: 'astro-work', kind: 'real site (Astro portfolio example)', url: `${astro}/work/`, tools: ['sweep', 'stress'] },
    { name: 'astro-project', kind: 'real site (Astro portfolio example)', url: `${astro}/work/bloom-box/`, tools: ['sweep'] },
  );
  return t;
}

/** Pages never used while the checks were written and tuned: a check on precision after tuning. */
function holdoutTargets(base, astro) {
  const R = `${base}/repo`, H = `${R}/research/experiments/H-blind-eval/hallam/fixture`;
  const t = [
    { name: 'hallam-home', kind: 'holdout fixture (H-blind-eval Hallam & Price, a 2014 Bootstrap-style site)', url: `${H}/`, tools: ['sweep', 'stress'] },
    { name: 'hallam-fees', kind: 'holdout fixture (H-blind-eval Hallam & Price)', url: `${H}/fees/`, tools: ['sweep', 'stress'] },
    { name: 'hallam-services', kind: 'holdout fixture (H-blind-eval Hallam & Price)', url: `${H}/services/`, tools: ['sweep'] },
    { name: 'hallam-contact', kind: 'holdout fixture (H-blind-eval Hallam & Price)', url: `${H}/contact/`, tools: ['sweep', 'stress'] },
    { name: 'basket', kind: 'holdout fixture', url: `${R}/tools/regress/fixtures/basket.html`, tools: ['sweep'] },
    { name: 'a11y-wizard', kind: 'holdout fixture', url: `${R}/tools/regress/fixtures/a11y-wizard.html`, tools: ['sweep', 'stress'] },
  ];
  if (astro) t.push({ name: 'astro-h20', kind: 'holdout real site (Astro portfolio example)', url: `${astro}/work/h20/`, tools: ['sweep'] },
    { name: 'astro-about', kind: 'holdout real site (Astro portfolio example)', url: `${astro}/about/`, tools: ['stress'] });
  return t;
}

/** Added after the review, with sweep.mjs and stress.mjs frozen before the first run: pages never used for tuning. */
function holdout2Targets(base) {
  const R = `${base}/repo`, X = `${base}/ext`, SW = `${R}/research/experiments/H-blind-eval/stemwren/fixture`;
  return [
    { name: 'stemwren-home', kind: 'holdout-2 fixture (H-blind-eval Stem & Wren: a florist site with a width=1100 viewport)', url: `${SW}/`, tools: ['sweep', 'stress'] },
    { name: 'stemwren-order', kind: 'holdout-2 fixture (H-blind-eval Stem & Wren order form, data from JSON)', url: `${SW}/order/`, tools: ['sweep', 'stress'] },
    { name: 'carbon-table', kind: 'holdout-2 product page (G-product-lab, IBM Carbon CSS from npm)', url: `${X}/product-lab/carbon-table.html`, tools: ['sweep', 'stress'] },
    { name: 'primer-issues', kind: 'holdout-2 product page (G-product-lab, GitHub Primer CSS from npm)', url: `${X}/product-lab/primer-issues.html`, tools: ['sweep', 'stress'] },
    ...BOOTSTRAP_LTR.map((n) => ({ name: `bs-${n}`, kind: 'holdout-2 real open-source page (Bootstrap example, LTR)', url: `${X}/bootstrap-built/${n}.html`, tools: ['sweep', 'stress'] })),
    ...BOOTSTRAP_RTL.map((n) => ({ name: `bs-${n}`, kind: 'holdout-2 real open-source page (Bootstrap example, native RTL)', url: `${X}/bootstrap-built/${n}.html`, tools: ['sweep', 'stress'] })),
  ];
}

/* ---------------------------------------------------------------- rtl controls */
async function sectionRtl(base, s8base) {
  const T = JSON.parse(await readFile(path.join(here, 'fixtures/rtl-truth.json'), 'utf8'));
  const V = (await verdicts()).rtl || {};
  const out = { scripts: await scriptHashes(), targets: [] };
  for (const [name, t] of Object.entries(T.pages)) {
    const expect = t.sameAs ? T.pages[t.sameAs].expect : t.expect;
    const url = (t.server === 's8' ? s8base : base) + t.url;
    const dir = path.join(CAP, 'rtl', name);
    await rm(dir, { recursive: true, force: true });
    const r = await run('node', [path.join(SKILL, 'stress.mjs'), '--url', url, '--only', 'rtl', '--out', dir], { cwd: here });
    const jf = existsSync(dir) && readdirSync(dir).find((f) => f.endsWith('-stress.json'));
    if (!jf) { out.targets.push({ name, error: (r.err || r.out).slice(-400) }); continue; }
    const j = JSON.parse(await readFile(path.join(dir, jf), 'utf8'));
    const findings = j.results.filter((x) => x.new).flatMap((x) => x.new.filter((f) => f.sev !== 'info').map((f) => ({ width: x.width, check: f.check, sel: f.sel, detail: String(f.detail).slice(0, 140) })));
    const keys = [...new Map(findings.map((f) => [`${f.check}|${normSel(f.sel)}`, f])).values()];
    const matched = (f) => expect.find((e) => new RegExp(e.sel).test(normSel(f.sel)));
    const recall = expect.map((e) => ({ id: e.id, css: e.css, found: keys.some((f) => new RegExp(e.sel).test(normSel(f.sel))) }));
    const extra = keys.filter((f) => !matched(f)).map((f) => ({ key: `${f.check}|${normSel(f.sel)}`, detail: f.detail, verdict: V[`${name}|${f.check}|${normSel(f.sel)}`] || null }));
    out.targets.push({ name, url: t.url, applied: j.results.filter((x) => x.mutation === 'rtl').map((x) => `${x.width}: ${x.applied}`), ms: j.ms, keys: keys.length, recall, found: `${recall.filter((x) => x.found).length}/${recall.length}`, extra, outOfScope: (t.sameAs ? T.pages[t.sameAs] : t).outOfScope || [] });
    log('rtl', name, `${keys.length} keys`, `${recall.filter((x) => x.found).length}/${recall.length} expected`, `${extra.length} other`);
  }
  return out;
}

async function verdicts() {
  try { return JSON.parse(await readFile(path.join(here, 'verdicts.json'), 'utf8')); } catch { return {}; }
}
const normSel = (s) => String(s).replace(/:nth-of-type\(\d+\)/g, ':nth-of-type(n)').replace(/ \(\d+×\)$/, '');
const CAPTURE_WIDTHS = [1440, 1280, 1024, 768, 390];

/* ---------------------------------------------------------------- sweep */
async function sectionSweep(base, astro, list = targets(base, astro), dirName = 'sweep') {
  const V = (await verdicts()).sweep || {};
  const out = { scripts: await scriptHashes(), targets: [] };
  const truth = JSON.parse(await readFile(path.join(here, 'fixtures/sweep-lab/truth.json'), 'utf8'));
  for (const t of list.filter((x) => x.tools.includes('sweep'))) {
    const dir = path.join(CAP, dirName, t.name);
    await rm(dir, { recursive: true, force: true });
    const r = await run('node', [path.join(SKILL, 'sweep.mjs'), '--url', t.url, '--out', dir], { cwd: here });
    const jf = readdirSync(dir).find((f) => f.endsWith('.json'));
    if (!jf) { out.targets.push({ name: t.name, error: (r.err || r.out).slice(-400) }); continue; }
    const j = JSON.parse(await readFile(path.join(dir, jf), 'utf8'));
    const ranges = j.ranges.filter((x) => x.sev !== 'info').map((x) => ({ check: x.check, sev: x.sev, sel: x.sel, from: x.from, to: x.to, pass: x.pass, detail: String(x.detail).slice(0, 140) }));
    const num = (w) => Number(String(w).split(' ')[0]);
    const inCaptures = (x) => x.pass !== 'zoom' && CAPTURE_WIDTHS.some((w) => w >= num(x.from) && w <= num(x.to));
    const labelled = ranges.map((x) => ({ ...x, verdict: V[`${t.name}|${x.check}|${normSel(x.sel)}`] || null }));
    // Per finding (check + element): would a capture run at the skill's default widths have shown it? And with the
    // responsive pass's extra widths (320, 360, 844)? Zoom-only findings need the 200%/400% pass.
    const keys = new Map();
    for (const x of ranges) { const k = `${x.check}|${normSel(x.sel)}`; const e = keys.get(k) || { zoomOnly: true, seen5: false, seen8: false }; if (x.pass !== 'zoom') { e.zoomOnly = false; if (CAPTURE_WIDTHS.some((w) => w >= num(x.from) && w <= num(x.to))) e.seen5 = true; if ([...CAPTURE_WIDTHS, 320, 360, 844].some((w) => w >= num(x.from) && w <= num(x.to))) e.seen8 = true; } keys.set(k, e); }
    const kv = [...keys.values()];
    const row = { name: t.name, kind: t.kind, url: t.url.replace(base, '').replace(astro || '§', '(astro)'), widths: j.widths, ms: j.ms, msPerWidth: j.msPerWidth, wallMs: r.ms, loads: j.loads,
      errors: ranges.filter((x) => x.sev === 'error').length, warnings: ranges.filter((x) => x.sev === 'warn').length,
      findingKeys: kv.length, notAtDefaultWidths: kv.filter((e) => !e.zoomOnly && !e.seen5).length, notAtResponsiveWidths: kv.filter((e) => !e.zoomOnly && !e.seen8).length, zoomOnly: kv.filter((e) => e.zoomOnly).length,
      missedByCaptureWidths: ranges.filter((x) => !inCaptures(x)).length, breakpoints: j.breakpoints.length, flips: j.flips,
      verdicts: { TP: labelled.filter((x) => x.verdict?.v === 'TP').length, INT: labelled.filter((x) => x.verdict?.v === 'INT').length, FP: labelled.filter((x) => x.verdict?.v === 'FP').length, unlabelled: labelled.filter((x) => !x.verdict).length },
      ranges: labelled };
    if (t.name === 'sweep-lab') {
      row.recall = truth.seeded.map((d) => {
        const rx = new RegExp(d.sel);
        const hit = ranges.find((x) => x.check === d.check && (rx.test(x.sel) || rx.test(x.sel.replace(/:nth-of-type\(\d+\)/g, ''))) && num(x.to) >= d.widths[0] && num(x.from) <= d.widths[1]);
        return { id: d.id, check: d.check, found: !!hit, at: hit ? `${hit.from}–${hit.to}` : null };
      });
    }
    out.targets.push(row);
    log('sweep', t.name, `${j.widths} widths`, `${j.ms} ms`, `${row.errors} ✗ ${row.warnings} △`);
  }
  const all = out.targets.filter((x) => x.ranges).flatMap((x) => x.ranges);
  out.totals = { ranges: all.length, TP: all.filter((x) => x.verdict?.v === 'TP').length, INT: all.filter((x) => x.verdict?.v === 'INT').length, FP: all.filter((x) => x.verdict?.v === 'FP').length, unlabelled: all.filter((x) => !x.verdict).length,
    msPerWidthMedian: median(out.targets.map((x) => x.msPerWidth)), wallMsMedian: median(out.targets.map((x) => x.wallMs)), missedByCaptureWidths: out.targets.reduce((s, x) => s + (x.missedByCaptureWidths || 0), 0),
    findingKeys: out.targets.reduce((s, x) => s + (x.findingKeys || 0), 0), notAtDefaultWidths: out.targets.reduce((s, x) => s + (x.notAtDefaultWidths || 0), 0),
    notAtResponsiveWidths: out.targets.reduce((s, x) => s + (x.notAtResponsiveWidths || 0), 0), zoomOnly: out.targets.reduce((s, x) => s + (x.zoomOnly || 0), 0),
    seededRecall: (() => { const r = out.targets.find((x) => x.recall)?.recall; return r ? `${r.filter((x) => x.found).length}/${r.length}` : null; })() };
  // Precision per finding key (a key's verdict covers all its widths).
  const byKey = new Map();
  for (const t of out.targets.filter((x) => x.ranges)) for (const x of t.ranges) byKey.set(`${t.name}|${x.check}|${normSel(x.sel)}`, { v: x.verdict?.v || null, kind: t.kind });
  const kv2 = [...byKey.values()];
  out.totals.keys = { all: kv2.length, TP: kv2.filter((x) => x.v === 'TP').length, INT: kv2.filter((x) => x.v === 'INT').length, FP: kv2.filter((x) => x.v === 'FP').length, unlabelled: kv2.filter((x) => !x.v).length,
    unseeded: (() => { const u = kv2.filter((x) => x.kind !== 'seeded'); return { all: u.length, TP: u.filter((x) => x.v === 'TP').length, INT: u.filter((x) => x.v === 'INT').length, FP: u.filter((x) => x.v === 'FP').length }; })() };
  return out;
}

/* ---------------------------------------------------------------- stress */
async function sectionStress(base, astro, list = targets(base, astro), dirName = 'stress') {
  const V = (await verdicts()).stress || {};
  const out = { scripts: await scriptHashes(), targets: [] };
  const truth = JSON.parse(await readFile(path.join(here, 'fixtures/stress-lab/truth.json'), 'utf8'));
  for (const t of list.filter((x) => x.tools.includes('stress'))) {
    const dir = path.join(CAP, dirName, t.name);
    await rm(dir, { recursive: true, force: true });
    const r = await run('node', [path.join(SKILL, 'stress.mjs'), '--url', t.url, '--out', dir], { cwd: here });
    const jf = existsSync(dir) && readdirSync(dir).find((f) => f.endsWith('-stress.json'));
    if (!jf) { out.targets.push({ name: t.name, error: (r.err || r.out).slice(-400) }); continue; }
    const j = JSON.parse(await readFile(path.join(dir, jf), 'utf8'));
    const findings = j.results.filter((x) => x.new).flatMap((x) => x.new.filter((f) => f.sev !== 'info').map((f) => ({ mutation: x.mutation, width: x.width, check: f.check, sev: f.sev, sel: f.sel, count: f.count || 1, detail: String(f.detail).slice(0, 160) })));
    const labelled = findings.map((f) => ({ ...f, verdict: V[`${t.name}|${f.mutation}|${f.check}|${normSel(f.sel)}`] || null }));
    const row = { name: t.name, kind: t.kind, url: t.url.replace(base, '').replace(astro || '§', '(astro)'), ms: j.ms, wallMs: r.ms,
      perMutation: j.results.filter((x) => x.mutation !== 'none').map((x) => ({ mutation: x.mutation, width: x.width, ms: x.ms, applied: x.applied, errors: (x.new || []).filter((f) => f.sev === 'error').length, warnings: (x.new || []).filter((f) => f.sev === 'warn').length })),
      verdicts: { TP: labelled.filter((x) => x.verdict?.v === 'TP').length, INT: labelled.filter((x) => x.verdict?.v === 'INT').length, FP: labelled.filter((x) => x.verdict?.v === 'FP').length, unlabelled: labelled.filter((x) => !x.verdict).length },
      findings: labelled };
    if (t.name === 'stress-lab') {
      row.recall = truth.seeded.map((d) => {
        const rx = new RegExp(d.sel), mx = new RegExp(`^(${d.mutation})$`);
        const hit = findings.find((f) => mx.test(f.mutation) && d.checks.includes(f.check) && (rx.test(f.sel) || rx.test(f.sel.replace(/:nth-of-type\(\d+\)/g, ''))));
        return { id: d.id, what: d.what, mutation: d.mutation, found: !!hit, as: hit ? `${hit.check} @ ${hit.width} on ${hit.sel}` : null };
      });
    }
    out.targets.push(row);
    log('stress', t.name, `${Math.round(j.ms / 1000)} s`, `${findings.length} findings`);
  }
  const all = out.targets.filter((x) => x.findings).flatMap((x) => x.findings);
  out.totals = { findings: all.length, TP: all.filter((x) => x.verdict?.v === 'TP').length, INT: all.filter((x) => x.verdict?.v === 'INT').length, FP: all.filter((x) => x.verdict?.v === 'FP').length, unlabelled: all.filter((x) => !x.verdict).length,
    seededRecall: (() => { const r = out.targets.find((x) => x.recall)?.recall; return r ? `${r.filter((x) => x.found).length}/${r.length}` : null; })() };
  const byKey = new Map();
  for (const t of out.targets.filter((x) => x.findings)) for (const f of t.findings) byKey.set(`${t.name}|${f.mutation}|${f.check}|${normSel(f.sel)}`, { v: f.verdict?.v || null, kind: t.kind });
  const kv2 = [...byKey.values()];
  out.totals.keys = { all: kv2.length, TP: kv2.filter((x) => x.v === 'TP').length, INT: kv2.filter((x) => x.v === 'INT').length, FP: kv2.filter((x) => x.v === 'FP').length, unlabelled: kv2.filter((x) => !x.v).length,
    unseeded: (() => { const u = kv2.filter((x) => x.kind !== 'seeded'); return { all: u.length, TP: u.filter((x) => x.v === 'TP').length, INT: u.filter((x) => x.v === 'INT').length, FP: u.filter((x) => x.v === 'FP').length }; })() };
  return out;
}

/* ---------------------------------------------------------------- recall against the seeded truth */
const numW = (w) => Number(String(w).split(' ')[0]);
const selMatch = (rx, sel) => rx.test(sel) || rx.test(String(sel).replace(/:nth-of-type\(\d+\)/g, ''));
function recallSweep(ranges, truth) {
  return truth.seeded.map((d) => {
    const rx = new RegExp(d.sel);
    const hit = ranges.find((x) => x.check === d.check && selMatch(rx, x.sel) && numW(x.to) >= d.widths[0] && numW(x.from) <= d.widths[1]);
    return { id: d.id, check: d.check, found: !!hit, at: hit ? `${hit.from}–${hit.to}` : null };
  });
}
function recallStress(findings, truth) {
  return truth.seeded.map((d) => {
    const rx = new RegExp(d.sel), mx = new RegExp(`^(${d.mutation})$`);
    const hit = findings.find((f) => mx.test(f.mutation) && d.checks.includes(f.check) && selMatch(rx, f.sel));
    return { id: d.id, what: d.what, mutation: d.mutation, found: !!hit, as: hit ? `${hit.check} @ ${hit.width} on ${hit.sel}` : null };
  });
}

/* ---------------------------------------------------------------- score */
/** Re-applies verdicts.json to the findings already in results.json (after labelling), without re-running the tools. */
async function sectionScore(results) {
  const V = await verdicts();
  for (const [sec, list, keyOf, holder] of [['sweep', 'ranges', (t, x) => `${t.name}|${x.check}|${normSel(x.sel)}`, results], ['stress', 'findings', (t, f) => `${t.name}|${f.mutation}|${f.check}|${normSel(f.sel)}`, results],
    ['sweep', 'ranges', (t, x) => `${t.name}|${x.check}|${normSel(x.sel)}`, results.holdout || {}], ['stress', 'findings', (t, f) => `${t.name}|${f.mutation}|${f.check}|${normSel(f.sel)}`, results.holdout || {}],
    ['sweep', 'ranges', (t, x) => `${t.name}|${x.check}|${normSel(x.sel)}`, results.holdout2 || {}], ['stress', 'findings', (t, f) => `${t.name}|${f.mutation}|${f.check}|${normSel(f.sel)}`, results.holdout2 || {}]]) {
    const R = holder[sec];
    if (!R) continue;
    const truth = JSON.parse(await readFile(path.join(here, `fixtures/${sec}-lab/truth.json`), 'utf8'));
    const lab = R.targets.find((x) => x.name === `${sec}-lab` && x[list]);
    if (lab) { lab.recall = (sec === 'sweep' ? recallSweep : recallStress)(lab[list], truth); R.totals.seededRecall = `${lab.recall.filter((x) => x.found).length}/${lab.recall.length}`; }
    for (const t of R.targets.filter((x) => x[list])) {
      t[list] = t[list].map((x) => ({ ...x, verdict: V[sec]?.[keyOf(t, x)] || null }));
      t.verdicts = { TP: t[list].filter((x) => x.verdict?.v === 'TP').length, INT: t[list].filter((x) => x.verdict?.v === 'INT').length, FP: t[list].filter((x) => x.verdict?.v === 'FP').length, unlabelled: t[list].filter((x) => !x.verdict).length };
    }
    const all = R.targets.filter((x) => x[list]).flatMap((x) => x[list]);
    Object.assign(R.totals, { TP: all.filter((x) => x.verdict?.v === 'TP').length, INT: all.filter((x) => x.verdict?.v === 'INT').length, FP: all.filter((x) => x.verdict?.v === 'FP').length, unlabelled: all.filter((x) => !x.verdict).length });
    const byKey = new Map();
    for (const t of R.targets.filter((x) => x[list])) for (const x of t[list]) byKey.set(keyOf(t, x), { v: x.verdict?.v || null, kind: t.kind, name: t.name });
    const kv = [...byKey.values()];
    // Headline: actionable precision = TP ÷ all keys (INT and FP are both a cost to the reader), with the shares.
    const count = (xs) => { const n = xs.length, TP = xs.filter((x) => x.v === 'TP').length, INT = xs.filter((x) => x.v === 'INT').length, FP = xs.filter((x) => x.v === 'FP').length;
      return { all: n, TP, INT, FP, unlabelled: n - TP - INT - FP, actionable: n ? Math.round((TP / n) * 100) : null, intShare: n ? Math.round((INT / n) * 100) : null, fpShare: n ? Math.round((FP / n) * 100) : null, fpToolCaused: xs.filter((x) => x.v === 'FP' && x.cause === 'tool').length }; };
    for (const t of R.targets.filter((x) => x[list])) for (const x of t[list]) { const k = keyOf(t, x); const e = byKey.get(k); if (e) e.cause = V[sec]?.[k]?.cause || null; }
    R.totals.keys = { ...count(kv), unseeded: count(kv.filter((x) => x.kind !== 'seeded')), realSite: count(kv.filter((x) => /real site/.test(x.kind))), nativeRtl: count(kv.filter((x) => /native RTL/.test(x.kind))) };
    if (sec === 'sweep') {
      // Keys a capture at the default widths (1440/1280/1024/768/390) would not have shown, and their verdicts.
      const off = new Map();
      for (const t of R.targets.filter((x) => x.ranges)) for (const x of t.ranges) {
        const k = keyOf(t, x); const e = off.get(k) || { v: x.verdict?.v || null, seen5: false, zoomOnly: true };
        if (x.pass !== 'zoom') { e.zoomOnly = false; if (CAPTURE_WIDTHS.some((w) => w >= numW(x.from) && w <= numW(x.to))) e.seen5 = true; }
        off.set(k, e);
      }
      const o = [...off.values()].filter((e) => !e.zoomOnly && !e.seen5);
      R.totals.keys.notAtDefaultWidths = { all: o.length, TP: o.filter((e) => e.v === 'TP').length, INT: o.filter((e) => e.v === 'INT').length, FP: o.filter((e) => e.v === 'FP').length };
      R.totals.keys.zoomOnly = [...off.values()].filter((e) => e.zoomOnly).length;
    }
  }
  if (results.rtl) for (const t of results.rtl.targets.filter((x) => x.extra)) for (const e of t.extra) e.verdict = V.rtl?.[`${t.name}|${e.key}`] || null;
  return { at: new Date().toISOString() };
}

/* ---------------------------------------------------------------- sheets */
async function sectionSheets() {
  // Only pages whose content may be redistributed: this repository's fixtures. The Astro example's photographs carry
  // no licence of their own, so its sheets stay in captures/ (git-ignored).
  const shots = path.join(here, 'shots');
  await rm(shots, { recursive: true, force: true });
  await mkdir(shots, { recursive: true });
  const pick = [
    ['sweep/sweep-lab', /-sheet\.jpg$/, 'sweep-lab-sheet.jpg'],
    ['sweep/slop', /-sheet\.jpg$/, 'sweep-slop-sheet.jpg'],
    ['sweep/permit-apply', /-sheet\.jpg$/, 'sweep-permit-apply-sheet.jpg'],
    ['stress/stress-lab', /-stress-sheet\.jpg$/, 'stress-lab-sheet.jpg'],
    ['stress/stress-lab', /-slow\.jpg$/, 'stress-lab-slow.jpg'],
    ['stress/permit-apply', /-stress-sheet\.jpg$/, 'stress-permit-apply-sheet.jpg'],
    ['stress/milkline-app', /-stress-sheet\.jpg$/, 'stress-milkline-app-sheet.jpg'],
    ['rtl/sanad-ar', /-stress-sheet\.jpg$/, 'rtl-sanad-ar-sheet.jpg'],
    ['rtl/s8-en-broken', /-stress-sheet\.jpg$/, 'rtl-s8-en-broken-sheet.jpg'],
    ['holdout2-sweep/stemwren-home', /-sheet\.jpg$/, 'holdout2-sweep-stemwren-home-sheet.jpg'],
  ];
  const copied = [];
  for (const [dir, rx, name] of pick) {
    const d = path.join(CAP, dir);
    const f = existsSync(d) && readdirSync(d).find((x) => rx.test(x));
    if (!f) continue;
    await cp(path.join(d, f), path.join(shots, name));
    copied.push({ file: `shots/${name}`, kb: Math.round((await stat(path.join(shots, name))).size / 1024) });
  }
  // Evidence before/after the review fix: the same finding, legacy code vs current, three pages (JPEG).
  try {
    const ev = path.join(CAP, 'evidence');
    const pick2 = [['fixture-rtl-overflow-320', 1, 'RTL page overflowing left, 320 px phone'], ['sanad-native-rtl-344', 2, 'Sanad (native RTL), 344 px'], ['stemwren-width-1100-autosized-344', 1, 'Stem & Wren (width=1100, text-autosized), 344 px']];
    const cells = [];
    for (const [slug, i, label] of pick2) for (const impl of ['legacy', 'current']) {
      const f = path.join(ev, `${slug}-${impl}-${i}-cell.png`);
      if (existsSync(f)) cells.push({ label: `${label} — ${impl === 'legacy' ? 'before' : 'after'} the fix (lime box = the finding; magenta = its element)`, png: await readFile(f), cellW: 300 });
    }
    if (cells.length) {
      const { launch } = await import(path.join(SKILL, 'lib/env.mjs'));
      const { drawSheet } = await import(path.join(SKILL, 'sweep.mjs'));
      const { browser } = await launch({});
      await drawSheet(browser, cells, path.join(shots, 'evidence-before-after.jpg'), { title: 'Sheet cells before and after the evidence fix: the mark must sit on its element' });
      await browser.close();
      copied.push({ file: 'shots/evidence-before-after.jpg', kb: Math.round((await stat(path.join(shots, 'evidence-before-after.jpg'))).size / 1024) });
    }
  } catch (e) { copied.push({ error: String(e.message).slice(0, 200) }); }
  // The visual-regression diff images, side by side, for three variants at 390 (JPEG).
  try {
    const { launch } = await import(path.join(SKILL, 'lib/env.mjs'));
    const { drawSheet } = await import(path.join(SKILL, 'sweep.mjs'));
    const { PNG } = await import('pngjs');
    const pixelmatch = (await import('pixelmatch')).default;
    const cells = [];
    for (const v of ['shift1', 'colour', 'aa']) {
      const A = PNG.sync.read(await readFile(path.join(CAP, 'vr/stable/390/baseline.png'))), B = PNG.sync.read(await readFile(path.join(CAP, `vr/stable/390/${v}.png`)));
      const w = Math.min(A.width, B.width), h = Math.min(A.height, B.height, 1500);
      const crop = (img) => { const o = new PNG({ width: w, height: h }); PNG.bitblt(img, o, 0, 0, w, h, 0, 0); return o; };
      for (const t of [0.1, 0.05]) {
        const o = new PNG({ width: w, height: h });
        const n = pixelmatch(crop(A).data, crop(B).data, o.data, w, h, { threshold: t });
        cells.push({ label: `${v} — pixelmatch t${t}: ${n} px`, png: PNG.sync.write(o), cellW: 260 });
      }
    }
    const { browser } = await launch({});
    await drawSheet(browser, cells, path.join(shots, 'vr-diffs-390.jpg'), { title: 'pixelmatch diff images (390 px, DPR 2, top 750 CSS px): a 1 px shift, a token colour change, sub-pixel text noise' });
    await browser.close();
    copied.push({ file: 'shots/vr-diffs-390.jpg', kb: Math.round((await stat(path.join(shots, 'vr-diffs-390.jpg'))).size / 1024) });
  } catch (e) { copied.push({ error: String(e.message).slice(0, 200) }); }
  return { copied };
}

/* ---------------------------------------------------------------- main */
const want = process.argv.slice(2).length ? process.argv.slice(2) : ['vr', 'motion', 'guard', 'control', 'timing', 'evidence', 'rtl', 'sweep', 'stress', 'holdout', 'holdout2', 'sheets', 'score'];
let results = {};
try { results = JSON.parse(await readFile(RESULTS, 'utf8')); } catch { /* first run */ }
const s = await serve({ mounts: { '/ext/': EXT } });
const s8 = await serve({ mounts: { '/': S8 }, only: true });
const astro = existsSync(ASTRO) ? await serve({ mounts: { '/': ASTRO } }) : null;
if (!astro) log(`no Astro build at ${ASTRO}: run ./fetch-sites.sh for the real-site targets`);
const chromium = (() => { try { const d = '/opt/pw-browsers'; return readdirSync(d).filter((x) => /^chromium-\d+/.test(x)).join(', '); } catch { return null; } })();
results.meta = { ...(results.meta || {}), updated: new Date().toISOString(), scripts: await scriptHashes(), node: process.version, cpus: os.cpus().length, loadavg: os.loadavg().map((x) => Math.round(x * 10) / 10),
  playwrightCore: JSON.parse(await readFile(path.join(here, 'node_modules/playwright-core/package.json'), 'utf8')).version, chromiumBuilds: chromium,
  note: 'Shared 4-CPU container; other agents were running. Timings are relative (same machine, same run), not absolute.' };
try {
  for (const sec of want) {
    const t0 = Date.now();
    if (sec === 'vr') results.vr = await sectionVr(s.base);
    else if (sec === 'sweep') results.sweep = await sectionSweep(s.base, astro?.base);
    else if (sec === 'stress') results.stress = await sectionStress(s.base, astro?.base);
    else if (sec === 'sheets') results.sheets = await sectionSheets();
    else if (sec === 'score') results.scored = await sectionScore(results);
    else if (sec === 'holdout') { const H = holdoutTargets(s.base, astro?.base); results.holdout = { sweep: await sectionSweep(s.base, astro?.base, H, 'holdout-sweep'), stress: await sectionStress(s.base, astro?.base, H, 'holdout-stress') }; }
    else if (sec === 'holdout-sweep') { results.holdout = { ...(results.holdout || {}), sweep: await sectionSweep(s.base, astro?.base, holdoutTargets(s.base, astro?.base), 'holdout-sweep') }; }
    else if (sec === 'holdout-stress') { results.holdout = { ...(results.holdout || {}), stress: await sectionStress(s.base, astro?.base, holdoutTargets(s.base, astro?.base), 'holdout-stress') }; }
    else if (sec === 'motion') results.motion = await (await import('./vr/capture-motion.mjs')).captureMotion(s.base);
    else if (sec === 'holdout2') { const H = holdout2Targets(s.base); results.holdout2 = { sweep: await sectionSweep(s.base, null, H, 'holdout2-sweep'), stress: await sectionStress(s.base, null, H, 'holdout2-stress') }; }
    else if (sec === 'holdout2-sweep') results.holdout2 = { ...(results.holdout2 || {}), sweep: await sectionSweep(s.base, null, holdout2Targets(s.base), 'holdout2-sweep') };
    else if (sec === 'holdout2-stress') results.holdout2 = { ...(results.holdout2 || {}), stress: await sectionStress(s.base, null, holdout2Targets(s.base), 'holdout2-stress') };
    else if (sec === 'rtl') results.rtl = await sectionRtl(s.base, s8.base);
    else if (sec === 'evidence') { const { runEvidence } = await import('./evidence/evidence-test.mjs'); await rm(path.join(CAP, 'evidence'), { recursive: true, force: true }); const { rows, ...e } = await runEvidence(s.base, `${s.base}/repo`, path.join(CAP, 'evidence')); results.evidence = { ...e, scripts: await scriptHashes(), rows: rows.map((r) => ({ ...r, cell: r.cell && { ok: r.cell.ok, mark: r.cell.mark, aligned: r.cell.aligned, blank: r.cell.blank }, crop: r.crop && { ok: r.crop.ok, mark: r.crop.mark, aligned: r.crop.aligned, blank: r.crop.blank } })) }; }
    else if (sec === 'guard') results.guard = await (await import('./vr/build-guard.mjs')).runGuard(s.base, path.join(CAP, 'guard'));
    else if (sec === 'control') {
      const A = astro?.base;
      const pages = [['vr-fixture', `${s.base}/fixtures/vr/index.html`], ...(A ? [['astro-home', `${A}/`], ['astro-project', `${A}/work/bloom-box/`]] : []),
        ['stemwren', `${s.base}/repo/research/experiments/H-blind-eval/stemwren/fixture/`], ['sanad', `${s.base}/repo/research/experiments/H-blind-eval/sanad/fixture/`],
        ['milkline', `${s.base}/repo/research/experiments/H-blind-eval/fixture/`], ['govuk', `${s.base}/repo/tools/regress/fixtures/govuk.html`],
        ['hallam', `${s.base}/repo/research/experiments/H-blind-eval/hallam/fixture/`], ['bs-album', `${s.base}/ext/bootstrap-built/album.html`], ['carbon-table', `${s.base}/ext/product-lab/carbon-table.html`]];
      results.control = await (await import('./vr/control.mjs')).runControl(pages, path.join(CAP, 'control'), { repeats: 3 });
    }
    else if (sec === 'timing') results.timing = await (await import('./vr/timing.mjs')).runTiming(path.join(CAP, 'vr'));
    else { console.error(`unknown section ${sec}`); continue; }
    results.meta[`${sec}Ms`] = Date.now() - t0;
    await writeFile(RESULTS, JSON.stringify(results, null, 1));
    log(sec, 'done in', Math.round((Date.now() - t0) / 1000), 's');
  }
} finally { await s.close(); await s8.close(); await astro?.close(); }
