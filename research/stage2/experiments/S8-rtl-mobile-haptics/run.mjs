#!/usr/bin/env node
// S8 runner: rebuilds every measurement of the stream and writes results.json (plus results/*.json and shots/*.jpg).
// Prerequisite once: `npm install` here and `bash fetch.sh` (fonts, Bootstrap examples, the riyal face, Chart.js).
//   node run.mjs            everything (~2–3 min)
//   node run.mjs rtl        only the named parts: compat vmetrics clip mixed bidi keys rtl mobile haptics files
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { launch } from '/home/user/website-redesign-skill/skills/website-redesign/scripts/lib/env.mjs';
import { serve, root, ext } from './lib/server.mjs';
import { compat } from './lib/compat.mjs';
import { build as buildBootstrap } from './lib/bootstrap-pages.mjs';
import { check as rtlCheck, print as rtlPrint } from './rtl-check.mjs';
import { mobileCheck, print as mobilePrint } from './mobile-check.mjs';
import * as vmetrics from './lab/vmetrics.mjs';
import * as clip from './lab/clip-probe.mjs';
import * as mixed from './lab/mixed.mjs';
import * as bidi from './lab/bidi.mjs';
import * as keys from './lab/keys.mjs';
import * as haptics from './lab/haptics.mjs';
import * as files from './lab/fontfiles.mjs';

const want = new Set(process.argv.slice(2));
const on = (k) => !want.size || want.has(k);
if (!existsSync(path.join(root, 'fonts', 'Inter.ttf')) || !existsSync(path.join(ext, 'bootstrap'))) { console.error('Run `bash fetch.sh` first.'); process.exit(2); }
await mkdir(path.join(root, 'results', 'rtl'), { recursive: true }); await mkdir(path.join(root, 'results', 'mobile'), { recursive: true }); await mkdir(path.join(root, 'shots'), { recursive: true });

const { server, base } = await serve();
const { browser } = await launch();
const results = { date: new Date().toISOString(), chromium: await browser.version(), node: process.version, parts: {} };
const time = async (k, fn) => { if (!on(k)) return; const t = Date.now(); process.stderr.write(`${k}… `); results.parts[k] = await fn(); process.stderr.write(`${((Date.now() - t) / 1000).toFixed(1)}s\n`); };

try {
  await time('compat', async () => compat());
  await time('vmetrics', () => vmetrics.run(browser, base));
  await time('clip', () => clip.run(browser, base));
  await time('mixed', () => mixed.run(browser, base));
  await time('bidi', () => bidi.run(browser, base));
  await time('keys', () => keys.run(browser, base));
  await time('files', () => files.run());
  await time('haptics', () => haptics.run(browser, base));

  await time('rtl', async () => {
    const pages = await buildBootstrap();
    const runs = [
      ['fixture-ar-good', '/fixtures/bilingual.html?lang=ar', false], ['fixture-ar-broken', '/fixtures/bilingual.html?lang=ar&variant=broken', false],
      ['fixture-en-good-flip', '/fixtures/bilingual.html?lang=en', true], ['fixture-en-broken-flip', '/fixtures/bilingual.html?lang=en&variant=broken', true],
      ['bootstrap-dashboard-rtl', pages[1], false], ['bootstrap-checkout-rtl', pages[3], false],
      ['bootstrap-dashboard-flip', pages[0], true], ['bootstrap-checkout-flip', pages[2], true],
    ];
    const out = {};
    for (const [name, u, flip] of runs) {
      const t = Date.now();
      const r = await rtlCheck(browser, base + u, { flip });
      r.ms = Date.now() - t; r.url = u;
      await writeFile(path.join(root, 'results', 'rtl', `${name}.json`), JSON.stringify(r, null, 1));
      console.log(rtlPrint(r));
      out[name] = { mode: r.mode, summary: r.summary, mirror: r.mirror, css: r.css, ms: r.ms };
    }
    out.seeded = scoreSeeded();
    return out;
  });

  // What the skill's own audit.mjs reports on the Arabic fixture as built right and as usually shipped
  await time('auditBaseline', async () => {
    const { execFile } = await import('node:child_process'); const { promisify } = await import('node:util');
    const run$ = promisify(execFile); const out = {};
    for (const [n, q] of [['good', 'lang=ar'], ['broken', 'lang=ar&variant=broken']]) {
      let txt = '';
      try { ({ stdout: txt } = await run$('node', ['/home/user/website-redesign-skill/skills/website-redesign/scripts/audit.mjs', '--base', base, '--paths', `/fixtures/bilingual.html?${q}`, '--widths', '1280,390', '--kind', 'app', '--out', path.join((await import('node:os')).tmpdir(), 's8-audit-baseline', n)], { timeout: 300000, maxBuffer: 1e8 })); } catch (e) { txt = (e.stdout || '') + (e.stderr || ''); }
      const lines = txt.split('\n').filter((l) => /^- /.test(l.trim()) && !/LCP|bytes|fonts loaded|ms\b/.test(l)).map((l) => l.trim().replace(/variant=broken|&/g, ''));
      out[n] = { fails: lines.filter((l) => l.startsWith('- ✗')).length, lines };
    }
    const g = new Set(out.good.lines);
    out.onlyInBroken = out.broken.lines.filter((l) => !g.has(l));
    return { good: { fails: out.good.fails }, broken: { fails: out.broken.fails }, linesOnlyInBroken: out.onlyInBroken };
  });

  await time('mobile', async () => {
    const out = {};
    for (const [name, u, opts] of [
      ['good-portrait', '/fixtures/mobile.html', {}], ['broken-portrait', '/fixtures/mobile.html?variant=broken', {}],
      ['good-landscape', '/fixtures/mobile.html', { width: 844, height: 390, insets: [0, 21, 59, 59], keyboard: 200 }],
      ['broken-landscape', '/fixtures/mobile.html?variant=broken', { width: 844, height: 390, insets: [0, 21, 59, 59], keyboard: 200 }],
      ['bootstrap-checkout-rtl-phone', '/ext/bootstrap-built/checkout-rtl.html', {}],
    ]) {
      const t = Date.now();
      const r = await mobileCheck(browser, base + u, { ...opts, shot: name.endsWith('portrait') ? path.join(root, 'shots', `thumb-${name}.jpg`) : null });
      r.ms = Date.now() - t; r.url = u;
      await writeFile(path.join(root, 'results', 'mobile', `${name}.json`), JSON.stringify(r, null, 1));
      console.log(mobilePrint(r));
      out[name] = { summary: r.summary, thumb: r.thumb, findings: r.findings.map((f) => `${f.level} ${f.check}: ${f.count ?? ''}`), ms: r.ms };
    }
    return out;
  });

  if (on('rtl')) {
    // a sheet of the Arabic fixture as built right and as usually shipped
    const ctx = await browser.newContext({ viewport: { width: 1000, height: 900 }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    for (const [q, n] of [['lang=ar', 'bilingual-ar-good'], ['lang=ar&variant=broken', 'bilingual-ar-broken']]) {
      await p.goto(`${base}/fixtures/bilingual.html?${q}`); await p.evaluate(() => document.fonts.ready);
      await p.screenshot({ path: path.join(root, 'shots', `${n}.jpg`), type: 'jpeg', quality: 55, fullPage: true });
    }
    await ctx.close();
  }
} finally {
  await browser.close(); server.close();
}

// Seeded defects in the broken bilingual variant (bilingual-broken.css + the BROKEN markup switches): which run caught
// each one. Matchers run over the full JSON report text of each run.
function scoreSeeded() {
  const txt = (n) => readFileSync(path.join(root, 'results', 'rtl', `${n}.json`), 'utf8');
  const S = txt('fixture-ar-broken'), F = txt('fixture-en-broken-flip');
  const DEFECTS = {
    'brand margin-right': /\.brand \{ margin-right|a\.brand — margin/, 'search margin-left:auto': /\.search \{ margin-left|form\.search — margin/,
    'badge right:2px': /\.badge \{ right|span\.badge/, 'drawer left:0 + translateX(-100%)': /#drawer"|#drawer — translateX|\[drawers\]/,
    'due margin-left': /\.due \{ margin-left|span\.due — margin/, 'field padding-right for the icon': /with-icon input \{ padding-right|#f-iban: padding-left/,
    'field icon right:10px': /with-icon \.icon \{ right|svg\.icon\.icon-alert/, 'table cell padding 12/8': /\.orders th, \.orders td \{ padding-left|th: padding-left 12px/,
    'toast right:16px': /\.toast \{ right|div\.toast/, 'lede text-align:left': /"p\.lede"|p\.lede: text-align|\.lede \{ text-align/,
    'hint text-align:left': /"p\.hint"|p\.hint: text-align|\.hint \{ text-align/, 'caption text-align:left': /"caption"|caption: text-align|caption \{ text-align:left/,
    'th/td text-align:left': /"th"|th: .*text-align left|td \{ padding-left:12px\/padding-right:8px; text-align:left/,
    'eyebrow letter-spacing on Arabic': /p\.eyebrow \(0\.060em\)/, 'italic em on Arabic': /em \(italic\)/,
    'note line-height 1.1 clips harakat': /span\.note-text in self/, 'cell line-height 1.2 clips': /div\.cell-name in self/,
    'amount without bdi': /td\.num: \\"-310\.50\\"/, 'email field inherits RTL': /#f-email \[email\]/, 'phone type=text inherits RTL': /#f-phone \[text\]/,
    'tabs arrow keys backwards': /tablist \\"Order\\"/, 'toolbar arrow keys backwards': /toolbar \\"Actions\\"/,
    'slide-in keyframes along x': /"slide-in"/, 'shadow x-offset': /box-shadows with an x offset/,
  };
  const count = (T, re) => { const j = JSON.parse(T); return j.findings.filter((f) => re.test(f.message)).reduce((u, f) => u + (f.count || 0), 0); };
  // the strongest level at which each defect is reported (FAIL > WARN > INFO), or null when no finding names it
  const level = (T, re) => { const L = JSON.parse(T).findings.filter((f) => re.test(JSON.stringify(f))).map((f) => f.level); return ['FAIL', 'WARN', 'INFO'].find((l) => L.includes(l)) || null; };
  const rows = Object.entries(DEFECTS).map(([d, re]) => ({ defect: d, asServed: level(S, re), flip: level(F, re) }));
  return {
    defects: rows, total: rows.length,
    asServed: Object.fromEntries(['FAIL', 'WARN', 'INFO', null].map((l) => [String(l), rows.filter((r) => r.asServed === l).length])),
    flip: Object.fromEntries(['FAIL', 'WARN', 'INFO', null].map((l) => [String(l), rows.filter((r) => r.flip === l).length])),
    icons: { directionalExpected: 15, directionalFlaggedAsServed: count(S, /Directional icons|point against/), directionalFlaggedFlip: count(F, /Directional icons/),
      neverExpected: 5, neverFlaggedAsServed: count(S, /must not mirror/), neverFlaggedFlip: count(F, /must not mirror/) },
    goodVariantFalseAlarms: { asServed: JSON.parse(txt('fixture-ar-good')).findings.filter((f) => f.level !== 'INFO').length, flip: JSON.parse(txt('fixture-en-good-flip')).findings.filter((f) => f.level !== 'INFO').length },
  };
}

// a partial run (named parts) updates those parts of an existing results.json and keeps the rest
if (want.size && existsSync(path.join(root, 'results.json'))) {
  const prev = JSON.parse(readFileSync(path.join(root, 'results.json'), 'utf8'));
  results.parts = { ...prev.parts, ...results.parts };
}
await writeFile(path.join(root, 'results.json'), JSON.stringify(results, null, 1));
console.error('wrote results.json');
