#!/usr/bin/env node
/**
 * Regression set for the measurement scripts: what each one must find on pages with known defects, and must not
 * find on clean pages. Every script fix in this repository was checked against these pages by hand; this runs the
 * same checks so a change that alters what the scripts detect is seen before it ships.
 *
 *   node tools/regress.mjs            (needs `npm install` in skills/website-redesign/scripts and a Chromium)
 *   node tools/regress.mjs --only a11y,audit
 *
 * Pages:
 *   research/experiments/a11y-lab/pages/{flawed,fixed}.html  60 seeded accessibility defects and their fixes
 *   tools/regress/fixtures/                                   AI-slop landing page, cluttered dashboard, GOV.UK
 *                                                             Frontend page (govuk-frontend 6.5.1, MIT, CSS only),
 *                                                             finish defects (radii, widows, dead band)
 *   research/experiments/H-blind-eval/fixture/                the Milkline fixture (herd app for the walkthrough driver)
 *
 * If a change is meant to alter a result, update the expectation here in the same commit and say why.
 */
import { createServer } from 'node:http';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scripts = path.join(root, 'skills/website-redesign/scripts');
const only = (() => { const i = process.argv.indexOf('--only'); return i > 0 ? process.argv[i + 1].split(',') : null; })();

// ---- a static server over the repository ------------------------------------------------------------
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, path.normalize(p));
  if (!f.startsWith(root) || !existsSync(f)) { res.writeHead(404); return res.end('not found'); }
  try { res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(await readFile(f)); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const tmp = await mkdtemp(path.join(tmpdir(), 'regress-'));

const run = (file, args) => new Promise((resolve) => {
  const p = spawn(process.execPath, [file, ...args], { cwd: scripts });
  let out = '';
  p.stdout.on('data', (d) => (out += d));
  p.stderr.on('data', (d) => (out += d));
  p.on('close', (code) => resolve({ code, out }));
});

// ---- the cases ----------------------------------------------------------------------------------------
const lab = `${base}/research/experiments/a11y-lab/pages`;
const fx = `${base}/tools/regress/fixtures`;
const contracts = (n) => path.join(root, `research/experiments/a11y-lab/contracts-${n}.json`);
const count = (re, s) => (s.match(re) || []).length;
const section = (md, page) => { const i = md.indexOf(`## ${page}`); if (i < 0) return ''; const j = md.indexOf('\n## ', i + 3); return md.slice(i, j < 0 ? undefined : j); };

const cases = [
  { group: 'a11y', name: 'a11y.mjs: seeded defects', run: () => run('a11y.mjs', [`${lab}/flawed.html`, '--out', `${tmp}/a11y-flawed`]),
    check: ({ out }) => [[+(out.match(/(\d+) FAIL/) || [])[1] === 92, `92 FAIL (got ${(out.match(/(\d+) FAIL/) || [])[1]})`]] },
  { group: 'a11y', name: 'a11y.mjs: fixed page', run: () => run('a11y.mjs', [`${lab}/fixed.html`, '--out', `${tmp}/a11y-fixed`]),
    check: ({ out }) => [[/\b0 FAIL/.test(out), `0 FAIL (got ${(out.match(/(\d+) FAIL/) || [])[1]})`]] },
  { group: 'a11y', name: 'a11y.mjs: GOV.UK Frontend', run: () => run('a11y.mjs', [`${fx}/govuk.html`, '--out', `${tmp}/a11y-govuk`]),
    check: ({ out }) => [[/\b0 FAIL/.test(out), `0 FAIL (got ${(out.match(/(\d+) FAIL/) || [])[1]})`]] },
  { group: 'widgets', name: 'widgets.mjs: broken contracts', run: () => run('widgets.mjs', [`${lab}/flawed.html`, contracts('flawed')]),
    check: ({ out }) => [[count(/^FAIL /gm, out) === 5 && count(/^PASS /gm, out) === 0, `5 FAIL, 0 PASS (got ${count(/^FAIL /gm, out)} / ${count(/^PASS /gm, out)})`]] },
  { group: 'widgets', name: 'widgets.mjs: kept contracts', run: () => run('widgets.mjs', [`${lab}/fixed.html`, contracts('fixed')]),
    check: ({ out }) => [[count(/^PASS /gm, out) === 5 && count(/^FAIL /gm, out) === 0, `5 PASS, 0 FAIL (got ${count(/^PASS /gm, out)} / ${count(/^FAIL /gm, out)})`]] },
  { group: 'audit', name: 'audit.mjs: marketing fixtures', run: async () => {
      const r = await run('audit.mjs', ['--base', fx, '--paths', '/slop.html', '/govuk.html', '/finish.html', '--widths', '1440,390', '--no-axe', '--out', `${tmp}/audit`]);
      return { ...r, md: await readFile(`${tmp}/audit/audit.md`, 'utf8').catch(() => '') };
    },
    check: ({ md }) => {
      const slop = section(md, '/slop.html'), gov = section(md, '/govuk.html'), fin = section(md, '/finish.html');
      const must = (s, re, label) => [re.test(s), label];
      return [
        ...['Invisible without JavaScript', 'Contrast below WCAG AA', 'No visible focus change', 'No lang attribute', 'images without an alt', 'Lazy-loaded image in the first viewport',
          'Phone layout viewport widened', 'Horizontal overflow', 'Gradient-filled text', 'Violet/indigo gradients', 'icon tiles', 'Cliché copy', 'Big-number claims', 'pill badge']
          .map((t) => must(slop, new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `slop: "${t}"`)),
        [count(/^- ◆/gm, slop) >= 24, `slop: ≥ 24 generic-look signals over two widths (got ${count(/^- ◆/gm, slop)})`],
        // The clean page: only the missing GDS Transport font files (not shipped here) may fail.
        [!/✗ (?!Declared font families|Console\/page errors)/.test(gov), `govuk: no ✗ other than the unshipped fonts${(gov.match(/✗ (?!Declared font families|Console\/page errors)[^\n]{0,80}/) || [''])[0] ? ` (got: ${(gov.match(/✗ (?!Declared font families|Console\/page errors)[^\n]{0,80}/) || [''])[0]})` : ''}`],
        // Wrapping and text-sized targets on slop.html depend on the machine's fonts (CI loads Inter; the sandbox
        // cannot), so those expectations live on finish.html, whose monospace headline and icon links do not.
        must(fin, /targets under 24×24px[^\n]*div\.icons|targets under 24×24px[^\n]*span\.icons/, 'finish: 16px icon links 4px apart fail 2.5.8'),
        must(fin, /Nested corners not concentric: `div\.card > a\.swollen`/, 'finish: swollen inner radius reported'),
        [!/a\.concentric/.test(fin), 'finish: the concentric nesting is not reported'],
        must(fin, /Dead bands at 1440px[^\n]*div\.hero/, 'finish: tall hero reported as a dead band'),
        [!/Dead bands[^\n]*photo/.test(fin), 'finish: the background-image band is not a dead band'],
        must(fin, /Headline widows at 390px: h1 "Every cow/, 'finish: h1 widow reported'),
        [!/widows[^\n]*h2 "Every cow/.test(fin), 'finish: the balanced h2 is not reported'],
      ];
    } },
  { group: 'audit', name: 'audit.mjs --kind app: dashboard fixture', run: async () => {
      const r = await run('audit.mjs', ['--base', fx, '--paths', '/dashboard.html', '--widths', '1440', '--kind', 'app', '--no-axe', '--out', `${tmp}/audit-app`]);
      return { ...r, md: await readFile(`${tmp}/audit-app/audit.md`, 'utf8').catch(() => '') };
    },
    check: ({ md }) => ['Status carried by colour alone', 'Text cut off by an overflow', 'pointer-cursor elements that are not controls', 'greeting', 'KPI tiles', 'chart(s) with no text', 'Empty state written as a bare phrase']
      .map((t) => [md.includes(t), `dashboard: "${t}"`]) },
  { group: 'states', name: 'states.mjs: walkthrough driver on the Milkline herd app', run: async () => {
      const spec = path.join(tmp, 'walk.json');
      await (await import('node:fs/promises')).writeFile(spec, JSON.stringify({ path: '/app/', device: 'phone', states: [
        { name: 'walk', steps: [{ tap: 'text=Alerts >> nth=0' }, { swipe: { at: "role=cell[name='Bella']", dx: -250, dy: 0 } }, { swipe: { dx: 0, dy: -2500 } }] },
        { name: 'broken', steps: [{ click: '#does-not-exist' }] },
      ] }));
      const r = await run('states.mjs', [spec, '--base', `${base}/research/experiments/H-blind-eval/fixture`, '--out', `${tmp}/walk`, '--aria']);
      return { ...r, tree: await readFile(`${tmp}/walk/walk-phone.aria.yml`, 'utf8').catch(() => '') };
    },
    check: ({ out, tree }) => [
      [/step 1 \(tap[^\n]*changed nothing/.test(out), 'dead tap on the Alerts tile reported'],
      [/step 2 \(swipe[^\n]*changed nothing/.test(out), 'swipe on the overflow:hidden table reported as changing nothing'],
      [!/step 3 \(swipe[^\n]*changed nothing/.test(out), 'the page swipe scrolls'],
      [/cut off by #herd/.test(tree), 'marked tree: herd columns cut off by #herd'],
      [/Alerts[^\n]*\n[^\n]*No data/.test(tree) || /No data/.test(tree), 'marked tree lists the Alerts panel'],
      [/broken-phone-failed\.png/.test(out), 'a failing step leaves a capture'],
    ] },
  { group: 'parity', name: 'parity.mjs: Arabic digits, reformatted values, --derived', run: async () => {
      const r = await run('parity.mjs', ['--before', `${fx}/parity/old`, '--after', `${fx}/parity/new`, '--paths', '/', '--out', `${tmp}/parity.md`, '--derived', '/^\\d+ days$/']);
      return { ...r, md: await readFile(`${tmp}/parity.md`, 'utf8').catch(() => '') };
    },
    check: ({ md }) => [
      [/✗ "10,000 customers"/.test(md), 'invented "10,000 customers" is unsourced'],
      [/same value, new format[^\n]*55,484 ر\.س/.test(md), '٥٥٬٤٨٤ ر.س (Eastern digits) is recognised as the reformatted 55,484.00'],
      [/⚠ "54,822 ر\.س"/.test(md) && /⚠ "12\.4%"/.test(md), 'the removed total and delta are dropped'],
      [!/"9\/5"/.test(md), 'the date 9/5/2026 is not read as a 9/5 rating'],
      [/declared as computed from data[^\n]*"30 days"/.test(md), '--derived moves "30 days" out of the failures'],
      [/every id, form field/.test(md), 'form and ids kept'],
    ] },
  { group: 'contrast', name: 'contrast.mjs', run: () => run('contrast.mjs', ['#767676', '#ffffff']),
    check: ({ out }) => [[/4\.54:1/.test(out), '#767676 on white = 4.54:1']] },
];

// ---- run ---------------------------------------------------------------------------------------------
let failed = 0;
const t0 = Date.now();
try {
  for (const c of cases) {
    if (only && !only.includes(c.group)) continue;
    const t = Date.now();
    const r = await c.run();
    const results = c.check(r);
    const bad = results.filter(([ok]) => !ok);
    failed += bad.length;
    console.log(`${bad.length ? '✗' : '✓'} ${c.name}  (${((Date.now() - t) / 1000).toFixed(0)}s)`);
    for (const [ok, label] of results) if (!ok || process.argv.includes('--verbose')) console.log(`   ${ok ? '✓' : '✗'} ${label}`);
    if (bad.length && r.code) console.log(`   exit ${r.code}; last output:\n${r.out.split('\n').slice(-8).map((l) => `     ${l}`).join('\n')}`);
  }
} finally {
  server.close();
  await rm(tmp, { recursive: true, force: true });
}
console.log(`\n${failed ? `${failed} expectation(s) failed` : 'all expectations met'} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
process.exitCode = failed ? 1 : 0;
