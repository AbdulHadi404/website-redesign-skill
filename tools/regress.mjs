#!/usr/bin/env node
/**
 * Regression set for the measurement scripts: what each one must find on pages with known defects, and must not
 * find on clean pages. Every script fix in this repository was checked against these pages by hand; this runs the
 * same checks so a change that alters what the scripts detect is seen before it ships.
 *
 *   node tools/regress.mjs            (needs `npm install` in skills/website-redesign/scripts and a Chromium)
 *   node tools/regress.mjs --only a11y,audit       (groups: a11y, widgets, audit, states, parity, capture, perf,
 *                                                   compare, contrast)
 *
 * Pages:
 *   research/experiments/a11y-lab/pages/{flawed,fixed}.html  60 seeded accessibility defects and their fixes
 *   tools/regress/fixtures/                                   AI-slop landing page, cluttered dashboard, GOV.UK
 *                                                             Frontend page (govuk-frontend 6.5.1, MIT, CSS only),
 *                                                             finish defects (radii, widows, dead band)
 *   tools/regress/fixtures/app-traps.html, audit-*.html       monospace (by the face rendered and its glyphs), text
 *                                                             past the viewport (page-level clips; what scroll and
 *                                                             phone zoom reach), the 11px floor for caps labels;
 *                                                             numeric columns by paint, values of one width included;
 *                                                             --kind service and a signature-route alias
 *   tools/regress/fixtures/capture-*.html                     the WebGL renderer line (page, iframe, closed shadow
 *                                                             root); text past the viewport, left-to-right and
 *                                                             right-to-left, with and without a clip on body
 *   tools/regress/fixtures/states-*.html                      why a step refused; --axe on open overlays; "record"
 *   tools/regress/fixtures/parity-{claims,greenfield,payloads,units}/
 *                                                             --removed by kind, a first site against its sources,
 *                                                             recorded submissions, units attached to their number
 *   tools/regress/fixtures/perf-old/, perf-new/               old and new builds for perf.mjs --before (failed
 *                                                             requests and whether they hold up LCP, gzip-equivalent
 *                                                             growth)
 *   tools/regress/fixtures/widgets-live.html, .json           live contracts: focus moves, toasts, form submits,
 *                                                             set-up steps
 *   tools/regress/fixtures/compare-ledger/, compare-pair/     ledger-named and -before/-after captures for the
 *                                                             compare.mjs label checks and --cols
 *   tools/regress/fixtures/a11y-wizard.html                   a wizard step with hidden steps, a closed drawer, a
 *                                                             blinking badge, Rails-style address fields and a focus
 *                                                             bar at the fold
 *   research/experiments/H-blind-eval/fixture/                the Milkline fixture (herd app for the walkthrough driver)
 *   research/experiments/H-blind-eval/sanad/fixture/          the old Sanad bilingual dashboard (numbers, scripts, states)
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
const sanad = `${base}/research/experiments/H-blind-eval/sanad/fixture`;
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
  { group: 'widgets', name: 'widgets.mjs: live contracts (focus moves, toasts, form submits, set-up steps)', run: () => run('widgets.mjs', [`${fx}/widgets-live.html`, path.join(root, 'tools/regress/fixtures/widgets-live.json')]),
    check: ({ out }) => {
      // One contract's block of output, from its PASS/FAIL line to the blank line after it.
      const block = (t) => { const i = out.indexOf(`live ${t}\n`); if (i < 5) return ''; const j = out.indexOf('\n\n', i); return out.slice(i - 5, j < 0 ? undefined : j); };
      return [
        [/^FAIL[^]*focus did not move to it \(focus: #code\)/.test(block('#code')), 'a description that changes on the trigger that keeps focus is not announced'],
        [/^FAIL[^]*focus moved to #retry, which reads only "Retry saving your address": "Could not save/.test(block('#save')), 'focus on a new button outside the message reads its name, not the message'],
        [/^FAIL[^]*focus moved to #go, which reads only "Go to your basket and check out": "Added\."/.test(block('#add')), 'a link name longer than the silent status does not carry it'],
        [/^FAIL[^]*Not all announced: focus moved to #next-h[^\n]*: "Published"/.test(block('#publish')), 'focus on the heading of other new content leaves the status unread'],
        [/^PASS[^]*\(#download, its name\)/.test(block('#export-csv')), 'a new link that is the only new text is its own message'],
        [/^FAIL[^]*focus moved to #help, which reads only "Get help"/.test(block('#pay')), 'a link inside a silent box reads only its own name'],
        [/^FAIL[^]*✗ \[2\.4\.3\] Focus moved to a toast/.test(block('#copy')), 'a toast that takes focus fails (accessibility.md §7.4)'],
        [/^PASS[^]*announced by moving focus to it \(#problem, its text/.test(block('#send')), 'a focused error summary announces the error (§7.6)'],
        [/^PASS[^]*\(#card-problem, its text\)/.test(block('#pay-card')), 'a focused summary whose sentence has a <strong> and a link mid-sentence'],
        [/^PASS[^]*\(#problem3, its text\)/.test(block('#send3')), 'a focused summary of three errors; each field error beside its field is that field\'s own message'],
        [/^PASS[^]*\(#phone, its description\)/.test(block('#check-phone')), 'focus moved to a field whose new error is its description'],
        [/^PASS[^]*\(#visit, its description\)/.test(block('#book')), 'the same with inline markup in the error'],
        [/^PASS[^]*inside group "How should we contact you\?"/.test(block('#next')), 'a fieldset\'s error (GOV.UK radios) is read as focus enters the group'],
        [/^PASS[^]*inside alertdialog "Could not delete"/.test(block('#del')), 'focus inside an alertdialog reads its name and description'],
        [/^FAIL[^]*Not tested: Enter on this radio submitted its form/.test(block('#len6')), 'Enter on a radio that submits its form fails as not tested'],
        [/^PASS[^]*announced via live region: "Your permit will cost £70\."/.test(block('input#len6')), '"keys": ["Space"] chooses the radio'],
        [/^FAIL[^]*\[4\.1\.3\][^\n]*Thanks, you are subscribed[^\n]*loaded a new page/.test(block('#sub')) && !/test error/.test(block('#sub')), 'a trigger that loads a new page is a finding, not a test error'],
        [/^FAIL[^]*✗ \[—\] before step \{"click":"#no-such-panel"\} failed/.test(block('#export')), 'a failed before step fails the contract'],
        [/^PASS/.test(block('button#export')), 'the same contract without the failing step passes'],
      ];
    } },
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
  { group: 'audit', name: 'audit.mjs --kind dashboard: the old Sanad bilingual dashboard', run: async () => {
      const r = await run('audit.mjs', ['--base', sanad, '--paths', '/', '/?lang=en', '--widths', '1440', '--kind', 'dashboard', '--no-axe', '--out', `${tmp}/audit-sanad`]);
      return { ...r, md: await readFile(`${tmp}/audit-sanad/audit.md`, 'utf8').catch(() => '') };
    },
    check: ({ md }) => {
      const ar = section(md, '/  '), en = section(md, '/?lang=en');
      return [
        [/## \/  \(app, as dashboard\)/.test(md), '--kind dashboard maps to the app rules'],
        [/✗ Two digit systems in one row/.test(ar), 'Arabic page: two digit systems in one row'],
        [/✗ 1 <input type="number"> on a right-to-left page/.test(ar), 'Arabic page: type=number on RTL'],
        [/Numeric columns:[^\n]*aligned left[^\n]*no tabular-nums[^\n]*decimals vary/.test(ar), 'Arabic page: numeric columns misaligned, proportional, mixed decimals'],
        [/A greeting/.test(ar), 'Arabic greeting detected'],
        [/Arabic-script text on a Latin-script page[^\n]*فاتورة جديدة/.test(en), 'English page: untranslated Arabic strings'],
      ];
    } },
  { group: 'a11y', name: 'a11y.mjs: old Sanad, English page (reflow clipping, language of parts)', run: () => run('a11y.mjs', [`${sanad}/?lang=en`, '--out', `${tmp}/a11y-sanad`]),
    check: ({ out }) => [
      [/FAIL reflow\s+1\.4\.10\s+1 control\(s\) cut off at 320px/.test(out), 'the New-invoice button cut off at 320px'],
      [/FAIL reflow\s+1\.4\.10\s+\d+ text element\(s\) cut off at 320px/.test(out), 'table text cut off at 320px'],
      [/3\.1\.2[^\n]*العربية/.test(out), 'language switcher "العربية" without lang'],
    ] },
  { group: 'states', name: 'states.mjs: identical pairs and a missing fixture on the old Sanad', run: async () => {
      const spec = path.join(tmp, 'sanad-states.json');
      await (await import('node:fs/promises')).writeFile(spec, JSON.stringify({ path: '/', device: 'desktop', states: [
        { name: 'idle' },
        { name: 'loading', route: { url: '**/data/invoices.json', delay: 6000 }, steps: [{ wait: 1500 }] },
        { name: 'error', route: { url: '**/data/invoices.json', status: 500, body: '{}' } },
        { name: 'offline', route: { url: '**/data/invoices.json', abort: true } },
        { name: 'missing', route: { url: '**/data/invoices.json', file: 'nope.json' } },
      ] }));
      return run('states.mjs', [spec, '--base', sanad, '--out', `${tmp}/sanad-states`]);
    },
    check: ({ out }) => [
      [/error \(desktop\)[^\n]*\n\s+⚠ identical to "loading"/.test(out), 'error renders identical to loading'],
      [/offline \(desktop\)[^\n]*\n\s+⚠ identical to "(loading|error)"/.test(out), 'offline renders identical to loading'],
      [/✗ missing[^\n]*\n\s+⚠ failed: fixture file not found/.test(out), 'a missing fixture file fails only its state'],
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
  { group: 'parity', name: 'parity.mjs --removed by kind, units beside their number, round figures', run: async () => {
      const r = await run('parity.mjs', ['--before', `${fx}/parity-claims/old`, '--after', `${fx}/parity-claims/new`, '--paths', '/', '--out', `${tmp}/parity-claims.md`,
        '--removed', '/old/page', '/about/us', '£35', 'hours', '#human', 'Renewing took me two minutes']);
      return { ...r, md: await readFile(`${tmp}/parity-claims.md`, 'utf8').catch(() => '') };
    },
    check: ({ code, md }) => {
      const dropped = section(md, 'Claims on the old site missing'), perPage = section(md, 'Per page');
      return [
        [code === 0 && /## Per page/.test(md), `a route with a lowercase last segment ("/old/page") is not read as a regex with flags "page" (exit ${code})`],
        [/declared removed[^\n]*`\/old\/page`[^\n]*`\/about\/us`/.test(md), '"/old/page" and "/about/us" are declared-removed routes'],
        [/⚠ quotation: “The council cares deeply/.test(dropped) && /⚠ ids gone[^\n]*#about-council/.test(perPage), '"/about/us" is not the regex /about/: the council quotation and #about-council stay warned'],
        [/declared removed[^\n]*"£35\.00"/.test(dropped) && /⚠ "£350"/.test(dropped), '"£35" declares "£35.00" removed, not "£350"'],
        [/declared removed[^\n]*#hours/.test(perPage) && /⚠ "48 hours"/.test(dropped), 'the id pattern "hours" does not declare the "48 hours" claim removed'],
        [/declared removed[^\n]*“Renewing took me two minutes/.test(dropped), 'three or more words of a quotation declare it removed'],
        [/⚠ "10 minutes"/.test(dropped) && /⚠ "3 days"/.test(dropped), '"Council minutes" and "Open days" in one footer item do not keep the numbers in the next item'],
        [/⚠ "10,000 customers"/.test(dropped), 'the round "10,000 customers" is dropped, not "same value" because "£10,000" is on the new page'],
        [/same value, new format[^\n]*"2,431 farms"/.test(dropped) && /same value, new format[^\n]*"£45"/.test(dropped), 'a specific figure anywhere, or one beside its currency, is still "same value, new format"'],
        [!/matched nothing/.test(md), 'every --removed pattern matched something'],
      ];
    } },
  { group: 'parity', name: 'parity.mjs --greenfield: every claim against the sources only', run: async () => {
      const g = path.join(root, 'tools/regress/fixtures/parity-greenfield');
      const r = await run('parity.mjs', ['--greenfield', '--after', `${fx}/parity-greenfield/site`, '--paths', '/', '/menu/', '--source', path.join(g, 'discovery'), path.join(g, 'owner-answers.txt'), '--out', `${tmp}/parity-green.md`]);
      const bare = await run('parity.mjs', ['--greenfield', '--after', `${fx}/parity-greenfield/site`]);
      return { ...r, bare, md: await readFile(`${tmp}/parity-green.md`, 'utf8').catch(() => '') };
    },
    check: ({ md, bare }) => [
      [md.includes('Greenfield: no old build — claims checked against --source only; route, id, field and metadata parity not applicable.'), 'the report says greenfield at the top'],
      [/Routes read: 2/.test(md) && /✗ "£3\.20"/.test(md), 'both routes are read (the menu price is checked)'],
      [/✗ "5,000 customers"/.test(md) && /✗ quotation: “The cinnamon buns/.test(md), 'an invented count and an invented quotation are unsourced'],
      [!/"£4\.50"|"2 days"|Best bread in Leeds/.test(md), 'claims in discovery/ and in a --source file (owner-answers.txt) count as sourced'],
      [!/## Routes|## Per page|Claims on the old site/.test(md), 'route, id, field and metadata comparisons are skipped'],
      [bare.code === 2 && /--source is required/.test(bare.out), `--greenfield without --source exits 2 with the usage (exit ${bare.code})`],
    ] },
  { group: 'parity', name: 'parity.mjs --payloads: cut bodies, a changed method, tokens, one folder for both builds', run: async () => {
      const pl = path.join(root, 'tools/regress/fixtures/parity-payloads');
      const r = await run('parity.mjs', ['--payloads', path.join(pl, 'old'), path.join(pl, 'new')]);
      const both = await run('parity.mjs', ['--payloads', path.join(pl, 'both'), path.join(pl, 'both')]);
      const self = await run('parity.mjs', ['--payloads', path.join(pl, 'old'), path.join(pl, 'old')]);
      return { ...r, both, self };
    },
    check: ({ out, both, self }) => [
      [/cannot compare in full/.test(out) && !/POST \/api\/upload: body byte-identical/.test(out) && /1 could not be compared in full/.test(out), 'bodies cut off in the recording are never called byte-identical'],
      [/✗ method changed: POST → PUT/.test(out) && /keys removed[^\n]*`zone`/.test(out), 'POST → PUT on the same path is paired: the method change and the removed key are reported'],
      [/✓ POST \/api\/apply: same body apart from values that change on every submission/.test(out), 'a CSRF token that differs does not fail the pair'],
      [/one folder for both builds/.test(both.out) && /`blue_badge` true → false/.test(both.out), 'one out dir given twice is split by label (before vs after), not paired with itself'],
      [self.code === 1 && /compared with itself/.test(self.out), `one unlabelled folder given twice is refused (exit ${self.code})`],
    ] },
  { group: 'parity', name: 'parity.mjs: a unit or currency counts only when attached to the same number', run: async () => {
      const r = await run('parity.mjs', ['--before', `${fx}/parity-units/old`, '--after', `${fx}/parity-units/new`, '--paths', '/', '--out', `${tmp}/parity-units.md`]);
      return { ...r, md: await readFile(`${tmp}/parity-units.md`, 'utf8').catch(() => '') };
    },
    check: ({ md }) => {
      const dropped = section(md, 'Claims on the old site missing'), unsourced = section(md, 'Claims on the new site');
      const same = (dropped.match(/same value, new format[^\n]*/) || [''])[0];
      const warned = (c) => dropped.includes(`⚠ "${c}"`);
      return [
        [['10 minutes', '3 days', '20 minutes', '4 days'].every(warned), 'a unit word in another link on the same line (spaces or commas) does not keep the number: "Council minutes" before "Zone 10 map"'],
        [['25 minutes', '6 days'].every(warned), 'inline spans after a heading are separate items'],
        [['30 minutes', '7 days'].every(warned), 'in loose text a unit two words after the number, or before it without a label separator, is not attached'],
        [['8 minutes', '2 days'].every(warned), 'a unit that starts the next list item ("Zone 8" then "Minutes of the council") is neither present nor "same value"'],
        [['£37', '£12', '£125'].every(warned), 'a price whose number survives beside another price ("Zone 37 permits now cost £40") is dropped, 3 digits too'],
        [warned('180 members') && warned('since 2019'), 'a 3-digit number or a year elsewhere on the page ("Room 180", "© 2019") is not the same figure'],
        [['16 minutes', '£28', '5 days', '42 hours', '£55', '45 minutes', '9 days', '50 minutes', '12,748 customers', '60 hours'].every((c) => same.includes(`"${c}"`)), 'real new formats stay "same value": row and column headers, <dt>, a stat card, "£55.00", "(minutes): 45", "9 working days", a <strong> value, a specific figure, a <br> in a stat'],
        [!/✓ none\./.test(dropped), 'the dropped-claims section does not say ✓ none'],
        [/✗ "70 minutes"/.test(unsourced), 'a new "70 minutes" is not sourced by "Bay 70" and "Minutes of the parking board" in two old list items'],
        [/✗ "£40"/.test(unsourced) && !/"75 hours"|"£55\.00"/.test(unsourced), 'a new claim is sourced by the same value with its unit attached on the old site: a stat card ("75" over "hours of advice"), "£55" for "£55.00"'],
      ];
    } },
  { group: 'a11y', name: 'a11y.mjs --storage: a basket that only has defects when filled', run: async () => {
      const seeded = await run('a11y.mjs', [`${fx}/basket.html`, '--out', `${tmp}/a11y-basket`, '--storage', path.join(root, 'tools/regress/fixtures/basket-seed.json')]);
      const empty = await run('a11y.mjs', [`${fx}/basket.html`, '--out', `${tmp}/a11y-basket-empty`]);
      return { out: seeded.out, empty: empty.out };
    },
    check: ({ out, empty }) => [
      [/storage seeded: 1 localStorage/.test(out), 'the seed is applied'],
      [/FAIL[^\n]*1\.3\.1[^\n]*Table \(2×3\) has no header cells/.test(out), 'the filled basket\'s table is audited'],
      [!/Table \(2×3\)/.test(empty), 'without the seed the table does not exist'],
    ] },
  { group: 'a11y', name: 'a11y.mjs: card links (ancestor focus ring, label in name)', run: () => run('a11y.mjs', [`${fx}/card.html`, '--out', `${tmp}/a11y-card`]),
    check: ({ out }) => [
      [!/2\.4\.13[^\n]*Alfama/.test(out) && !/2\.4\.7[^\n]*Alfama/.test(out), 'a ring drawn on the card (:has) counts as the link\'s focus indicator'],
      [!/2\.5\.3[^\n]*Tavira/.test(out), 'a name that starts with the card heading passes 2.5.3'],
      [/FAIL[^\n]*2\.5\.3[^\n]*"Bloom" is not part of accessible name "Buy now"/.test(out), '"Buy now" on a card headed "Bloom" fails 2.5.3'],
    ] },
  { group: 'a11y', name: 'a11y.mjs: wizard with hidden steps (rendered content only, blink, autocomplete, focus bar at the fold)', run: async () => {
      const r = await run('a11y.mjs', [`${fx}/a11y-wizard.html`, '--out', `${tmp}/a11y-wizard`]);
      return { ...r, json: JSON.parse(await readFile(`${tmp}/a11y-wizard/audit.json`, 'utf8').catch(() => '{}')) };
    },
    check: ({ out, json }) => [
      [!/^FAIL (?!motion[^\n]*"blink")/m.test(out), `no FAIL but the blink: nothing from the hidden steps, the closed drawer or the collapsed panel (got ${(out.match(/(\d+) FAIL/) || [])[1]} FAIL)`],
      [/^FAIL[^\n]*2\.3\.3[^\n]*"blink"[^\n]*span\.draft/m.test(out) && /^WARN[^\n]*2\.2\.2[^\n]*Infinite animation "blink"[^\n]*span\.draft/m.test(out), 'the "Draft" badge that blinks (hidden 92% of each cycle) is reported by both motion probes, whatever phase they sample'],
      [/^WARN[^\n]*Content changed on its own[^\n]*#saving/m.test(out), 'the status a script shows for 150ms at a time is reported as changing on its own'],
      [!/Mill Road is in zone|Your permit will cost|Menu and settings|Saved applications/.test(out), 'no heading lookalike reported from content that is not rendered'],
      [/Looks like a heading[^\n]*"Your answers are saved\."/.test(out), 'the visible heading lookalike is still reported'],
      [!/autocomplete[^\n]*address_document/.test(out), 'no token on a file input, even one whose label matches street-address ("a document showing your address")'],
      [!/autocomplete[^\n]*business_website/.test(out), '"Website address" is not a postal address'],
      [!/autocomplete[^\n]*(proof_of_address|"street |phone|email_hidden|mobile|surname)/.test(out), 'no autocomplete warning on proof of address, the select of streets or hidden fields'],
      [/autocomplete[^\n]*full_name[^\n]*autocomplete="name"/.test(out) && /autocomplete[^\n]*address_line1[^\n]*autocomplete="address-line1"/.test(out), 'visible text fields still warn ("Address line 1" → address-line1)'],
      [/autocomplete[^\n]*address\[postcode\][^\n]*autocomplete="postal-code"/.test(out), '"address" as the group: address[postcode] → postal-code, not street-address'],
      [/autocomplete[^\n]*address\[town\][^\n]*autocomplete="address-level2"/.test(out) && /autocomplete[^\n]*address\[country\][^\n]*autocomplete="country-name"/.test(out), 'the selects address[town] → address-level2 and address[country] → country-name (its label also says "address")'],
      [(json.data?.['tab-forward'] || []).some((s) => s.indicator?.recentred && /Change make/.test(s.where)), '"Change make" straddles the fold and is measured scrolled clear of it'],
      [!/2\.4\.13[^\n]*Change/.test(out), 'the gold fill + ink bar under "Change" passes 2.4.13, at the fold too'],
      [/2\.4\.13[^\n]*Help with this form/.test(out), 'the 1px grey dotted outline still warns 2.4.13'],
    ] },
  { group: 'capture', name: 'capture.mjs: flat-image self-check', run: async () => {
      const covered = await run('capture.mjs', ['--base', fx, '--paths', '/covered.html', '/wall.html', '--widths', '1440', '--out', `${tmp}/cap`]);
      return covered;
    },
    check: ({ out }) => [
      [/covered-html-1440\.png[^\n]*painted flat/.test(out), 'an image covered by an overlay is reported'],
      [/wall-html-1440\.png/.test(out) && !/wall-html-1440\.png[^\n]*painted flat/.test(out), 'a wall clipped by overflow: hidden on purpose is not'],
      [!/^renderer:/m.test(out), 'pages without a <canvas> print no renderer line'],
    ] },
  { group: 'capture', name: 'capture.mjs: WebGL renderer line, text past the viewport edge', run: async () => {
      const cap = (paths, width, dir) => run('capture.mjs', ['--base', fx, '--paths', ...paths, '--widths', width, '--out', `${tmp}/${dir}`]);
      const phone = await cap(['/capture-cut.html', '/capture-webgl.html', '/capture-reach-bodyclip.html'], '390', 'cap-390');
      const desk = await cap(['/capture-reach.html', '/capture-reach-rtl.html', '/capture-reach-bodyclip.html', '/capture-webgl-framed.html'], '1024', 'cap-1024');
      const closed = await cap(['/capture-webgl-closed.html'], '1024', 'cap-closed');
      return { code: phone.code || desk.code || closed.code, out: [phone.out, desk.out, closed.out].join('\n'), phone: phone.out, desk: desk.out, closed: closed.out };
    },
    check: ({ out, phone, desk, closed }) => {
      const renderer = (s) => s.match(/^renderer: [^\n]*/gm) || [];
      const line = (shot) => (out.match(new RegExp(`[^\\n]*${shot}\\.png[^\\n]*`)) || [''])[0];
      const first = renderer(phone)[0] || '';
      return [
        [renderer(phone).length === 1, `one renderer line per run (got ${renderer(phone).length})`],
        [/capture-cut-html-390\.png[^\n]*\nrenderer: [^\n]*\n[^\n]*capture-webgl-html-390\.png/.test(phone), 'it is printed for the first page with a <canvas>, not the first page of the run'],
        [!/swiftshader|llvmpipe/i.test(first) || /— software rendering: WebGL speed and motion cannot be judged from this run/.test(first), `a software renderer is called out (got: ${first.slice(0, 120)})`],
        [renderer(desk).length === 1 && /\nrenderer: [^\n]*\n[^\n]*capture-webgl-framed-html-1024\.png/.test(desk), 'a scene embedded in an iframe gets the renderer line'],
        [renderer(closed).length === 1, 'a canvas in a closed shadow root gets the renderer line'],
        [/⚠ text past the viewport under a page-level clip: [^\n]*span\.chip \(\d+px\)/.test(line('capture-cut-html-390')), 'the nowrap chip hidden by html, body { overflow-x: hidden } is reported with the px past the edge'],
        [!/horizontal overflow/.test(line('capture-cut-html-390')), 'html and body both clip, so there is no scrollWidth overflow to report'],
        [!/text past the viewport[^\n]*(div\.slide|\.rail)/.test(out), 'the off-screen slide and the tag inside a scroller are not reported'],
        [/horizontal overflow by \d+px: [^\n]*div\.box/.test(line('capture-reach-bodyclip-html-390')) && !/text past the viewport/.test(line('capture-reach-bodyclip-html-390')), 'body-only clip on a phone: text inside the widened layout viewport is named as overflow, not as cut'],
        [/horizontal overflow by \d+px: [^\n]*div\.box[^\n]*text past the viewport under a page-level clip: [^\n]*div\.box \(\d+px\)/.test(line('capture-reach-bodyclip-html-1024')), 'body-only clip on a desktop: nothing scrolls to the text, so it is cut (and the overflow line names it)'],
        [/horizontal overflow by \d+px: [^\n]*div\.box/.test(line('capture-reach-html-1024')) && !/text past the viewport[^\n]*div\.box/.test(line('capture-reach-html-1024')), 'left-to-right, no clip: text overflowing its own box to the right is named as overflow (the page scrolls to it), not as cut'],
        [/text past the viewport where no scroll reaches it: [^\n]*ul\.hang > li \(\d+px left\)/.test(line('capture-reach-html-1024')), 'left-to-right: text pulled past the left (start) edge is cut, clip or not'],
        [/horizontal overflow by \d+px: [^\n]*div\.box/.test(line('capture-reach-rtl-html-1024')) && !/text past the viewport[^\n]*div\.box/.test(line('capture-reach-rtl-html-1024')), 'right-to-left, no clip: text overflowing its own box to the left (end edge) is named as overflow, not as cut'],
        [/text past the viewport where no scroll reaches it: [^\n]*ul\.hang > li \(\d+px\)/.test(line('capture-reach-rtl-html-1024')), 'right-to-left: text pulled past the right (start) edge is cut'],
      ];
    } },
  { group: 'perf', name: 'perf.mjs: layout shift and long tasks', run: async () => {
      const r = await run('perf.mjs', ['--base', fx, '--paths', '/cls.html', '--runs', '1', '--out', `${tmp}/perf.md`]);
      return { ...r, md: await readFile(`${tmp}/perf.md`, 'utf8').catch(() => '') };
    },
    check: ({ md }) => [
      [/CLS 0\.1\d\d over 0\.1|CLS 0\.[2-9]\d* over 0\.1/.test(md), 'the late 300px insert is measured as CLS over 0.1'],
      [/TBT \d+ ms over 200 ms/.test(md), 'the 400 ms busy loop is measured as TBT over 200 ms'],
    ] },
  { group: 'perf', name: 'perf.mjs --before: broken baseline, the new build\'s failed requests, transfer growth', run: async () => {
      const r = await run('perf.mjs', ['--before', `${fx}/perf-old`, '--base', `${fx}/perf-new`, '--paths', '/', '/heavy.html', '--runs', '1', '--out', `${tmp}/perf-before.md`]);
      // The new build against itself: nothing failed, nothing grew, so no ◇ note (LCP noise may still flag a regression).
      const self = await run('perf.mjs', ['--before', `${fx}/perf-new`, '--base', `${fx}/perf-new`, '--paths', '/heavy.html', '--runs', '1', '--out', `${tmp}/perf-self.md`]);
      return { ...r, md: await readFile(`${tmp}/perf-before.md`, 'utf8').catch(() => ''), self: await readFile(`${tmp}/perf-self.md`, 'utf8').catch(() => '') };
    },
    check: ({ md, self }) => {
      const note = (start) => md.split('\n').find((l) => l.startsWith(`- ◇ ${start}`)) || '';
      const base = note('broken baseline'), fresh = note('new build measured'), heavy = note('/heavy.html: transfer');
      return [
        [/^\| \/ \(baseline broken; new build's requests failed here\) \|/m.test(md), 'against the baseline, / is marked: baseline broken, new build\'s requests failed'],
        [/^\| \/ \(requests failed here\) \|/m.test(md), 'the lab row of / is marked'],
        [/^\| \/heavy\.html \|/m.test(md) && !/\/heavy\.html \(/.test(md), '/heavy.html is not marked (nothing failed there)'],
        [/2 request\(s\) failed \((1 css, 1 font|1 font, 1 css)\) on the old build/.test(base), `baseline: the 404 font counts once and the refused stylesheet counts (got: ${base.slice(0, 110)})`],
        [/1 could not be fetched from this machine \(127\.0\.0\.1:2: net::ERR_CONNECTION_REFUSED\)/.test(base), 'baseline: the refused stylesheet is this machine\'s network failure'],
        [/1 failed in a way that may be the old site's own \([^)]*HTTP 404\)/.test(base), 'baseline: the 404 font is worded as a possibility'],
        [/On \/ the lost files hold up the largest paint \((1 render-blocking stylesheet, 1 font|1 font, 1 render-blocking stylesheet)\)/.test(base), 'baseline: the render-blocking stylesheet and the font hold up the largest paint on /'],
        [/on \/: 1 font request\(s\) failed/.test(fresh) && /ERR_CONNECTION_REFUSED/.test(fresh), 'new build: its refused font is named in perf.md'],
        [!md.split('\n').some((l) => l.startsWith('- ◇ /: transfer')), '/: 130 KB of uncompressed CSS is 16 KB gzip-equivalent, under the growth floor: no growth note'],
        [/The new build \([^)]*\) sent text[^\n]*uncompressed/.test(md), 'the uncompressed text is stated'],
        [/\+(7\d|8\d) KB/.test(heavy), `/heavy.html: +77 KB, less than double, gets a growth note (got: ${heavy.slice(0, 90) || 'none'})`],
        [/^## Flags/m.test(self) && !/^- ◇/m.test(self), 'the new build against itself: no ◇ note'],
      ];
    } },
  { group: 'perf', name: 'perf.mjs --before: only a lost file that holds up the largest paint excuses a slower page', run: async () => {
      const r = await run('perf.mjs', ['--before', `${fx}/perf-old`, '--base', `${fx}/perf-new`, '--paths', '/reg.html', '/hero.html', '--runs', '1', '--out', `${tmp}/perf-reg.md`]);
      return { ...r, md: await readFile(`${tmp}/perf-reg.md`, 'utf8').catch(() => '') };
    },
    check: ({ md }) => {
      const line = (start) => md.split('\n').find((l) => l.startsWith(start)) || '';
      const reg = line('- ⚠ /reg.html: slower than the baseline'), hero = line('- ⚠ /hero.html: slower than the baseline'), base = line('- ◇ broken baseline');
      const pixel = '1 image outside the first viewport or smaller than what was measured as largest', gtag = '1 non-blocking script from another site';
      return [
        [/^\| \/reg\.html \(baseline broken\) \|/m.test(md), 'against the baseline, /reg.html is marked: its transfer is skewed'],
        [/within budget is not enough when the old build was faster \(the old page's failed requests here cannot hold up its largest paint, so they do not explain it: /.test(reg) && reg.includes(pixel) && reg.includes(gtag), `/reg.html: a failed async script from another site and a 404 tracking pixel do not excuse 130 KB of render-blocking CSS (got: ${reg.slice(0, 200) || 'no flag'})`],
        [/but the old page was measured without files that hold up its largest paint \(1 image in the first viewport at least as large as what was measured as largest;/.test(hero), `/hero.html: a failed hero image that would fill the first viewport does (got: ${hero.slice(0, 200) || 'no flag'})`],
        [/On \/hero\.html the lost file holds up the largest paint \(1 image in the first viewport[^)]*\), so its LCP there is faster than the live site's:/.test(base), 'baseline: /hero.html\'s LCP is named as faster than live (the hero could not be fetched from this machine, so no "if those files load there")'],
        [/On \/reg\.html none of the lost files can hold up the largest paint \([^)]*\), so the LCP there stands/.test(base), 'baseline: /reg.html\'s LCP comparison stands'],
        [!/transfer and LCP/.test(base), 'baseline: the note no longer says every lost file makes LCP faster'],
      ];
    } },
  { group: 'states', name: 'states.mjs --aria after a navigation (frame-prefixed refs)', run: async () => {
      const spec = path.join(tmp, 'nav.json');
      await (await import('node:fs/promises')).writeFile(spec, JSON.stringify({ path: '/nav-a.html', device: 'phone', states: [{ name: 'nav', steps: [{ tap: '#go' }, { wait: 300 }] }] }));
      const r = await run('states.mjs', [spec, '--base', fx, '--out', `${tmp}/nav`, '--aria']);
      return { ...r, tree: await readFile(`${tmp}/nav/nav-phone.aria.yml`, 'utf8').catch(() => '') };
    },
    check: ({ tree }) => [
      [/Which street do you live on/.test(tree), 'the tree is of the page the tap navigated to'],
      [!/cannot mark/.test(tree), 'marks are computed after a navigation'],
      [/Contact us[^\n]*⟨below⟩|⟨below⟩[\s\S]*Contact us/.test(tree), 'content below the fold on the new page is marked'],
    ] },
  { group: 'audit', name: 'audit.mjs --kind app: monospace, text cut at the viewport edge, small caps labels (app-traps)', run: async () => {
      const r = await run('audit.mjs', ['--base', fx, '--paths', '/app-traps.html', '--widths', '390', '--kind', 'app', '--no-axe', '--out', `${tmp}/audit-traps`]);
      // With axe and both themes: the fixture is otherwise clean, and the matrix, its file names and the roll-up are kept.
      const allow = await run('audit.mjs', ['--base', fx, '--paths', '/app-traps.html', '--widths', '390', '--kind', 'app', '--allow-mono', '--themes', 'light,dark', '--out', `${tmp}/audit-traps-allow`]);
      return { ...r, md: await readFile(`${tmp}/audit-traps/audit.md`, 'utf8').catch(() => ''), allow: await readFile(`${tmp}/audit-traps-allow/audit.md`, 'utf8').catch(() => ''), dark: existsSync(`${tmp}/audit-traps-allow/app-traps-html-390-dark.json`) };
    },
    check: ({ code, md, allow, dark }) => {
      const s = section(md, '/app-traps.html');
      const small = (s.match(/Text under 12px:[^\n]*/) || [''])[0];
      return [
        [/✗ Monospace text rendered[^\n]*`p > kbd` "Ctrl K"[^\n]*`label > input` "ENV_PROD_42"/.test(s), 'traps: the default-monospace kbd and the monospace input value fail'],
        [/✗ Text past the viewport, hidden by a clipping ancestor \(the page clips itself[^\n]*span\.chip/.test(s), 'traps: the nowrap chip is cut at the viewport edge'],
        [!/Horizontal overflow|Phone layout viewport widened/.test(s), 'traps: html and body clip, so scrollWidth did not grow'],
        [/updated two minutes ago/.test(small) && !/"status"/.test(small), 'traps: the 11px note is small text; the one-word uppercase 11px label is not'],
        [code === 1, `traps: exit 1 when a page has a fail (got ${code})`],
        [!/Monospace text rendered/.test(allow) && /Monospace renders here[^\n]*kbd/.test(allow), 'traps --allow-mono: a warning instead of the fail'],
        [/### 390px · light/.test(allow) && /### 390px · dark/.test(allow) && dark, '--themes light,dark: both themes at phone width, <slug>-390-dark.json written'],
        [/## axe across pages\n\nNo violations in 2 views\./.test(allow), 'axe roll-up: no violations in 2 views'],
      ];
    } },
  { group: 'audit', name: 'audit.mjs: text past the viewport only where no scroll or zoom reaches it (audit-gutter, audit-reach, audit-reach-bodyclip)', run: async () => {
      const phone = await run('audit.mjs', ['--base', fx, '--paths', '/audit-gutter.html', '/audit-reach-bodyclip.html', '--widths', '390', '--kind', 'app', '--no-axe', '--out', `${tmp}/audit-edge-390`]);
      const desk = await run('audit.mjs', ['--base', fx, '--paths', '/audit-reach.html', '/audit-reach-bodyclip.html', '--widths', '1024', '--kind', 'app', '--no-axe', '--out', `${tmp}/audit-edge-1024`]);
      return { code: phone.code, out: phone.out + desk.out, phone: await readFile(`${tmp}/audit-edge-390/audit.md`, 'utf8').catch(() => ''), desk: await readFile(`${tmp}/audit-edge-1024/audit.md`, 'utf8').catch(() => '') };
    },
    check: ({ phone, desk }) => {
      const gutter = section(phone, '/audit-gutter.html'), clip390 = section(phone, '/audit-reach-bodyclip.html');
      const reach = section(desk, '/audit-reach.html'), clip1024 = section(desk, '/audit-reach-bodyclip.html');
      return [
        [/✗ Text past the viewport, hidden by a clipping ancestor \(the page clips itself, so scrollWidth did not grow\):[^\n]*span\.chip/.test(gutter), 'html { overflow-y: scroll } with body { overflow-x: hidden }: body clips itself, the chip is cut'],
        [!/Horizontal overflow|Phone layout viewport widened/.test(gutter), 'gutter: scrollWidth did not grow'],
        [/Phone layout viewport widened/.test(clip390) && /✗ Horizontal overflow by \d+px: [^\n]*div\.box/.test(clip390) && !/Text past the viewport/.test(clip390), 'body-only clip on a phone: the widened layout viewport shows the text zoomed out, so it is overflow, not cut'],
        [/✗ Horizontal overflow by \d+px: `main > div\.box` \(its text runs \d+px past the right edge\)/.test(reach), 'no clip: the text that widened the page is named on the overflow line'],
        [!/Text past the viewport[^\n]*div\.box/.test(reach), 'no clip: the page scrolls to the text past the right edge, so it is not cut'],
        [/✗ Text past the viewport, where no scroll reaches it: [^\n]*ul\.hang > li[^\n]*px past the left edge/.test(reach), 'no clip: text pulled past the left (start) edge is cut'],
        [/✗ Text past the viewport, where no scroll reaches it \(overflow-x on html or body[^\n]*div\.box/.test(clip1024) && /✗ Horizontal overflow by \d+px: [^\n]*div\.box/.test(clip1024), 'body-only clip on a desktop: nothing scrolls to the text, so it is cut'],
        [!/scrollWidth did not grow/.test(reach + clip1024 + clip390), 'the page-clips-itself explanation only where scrollWidth did not grow'],
      ];
    } },
  { group: 'audit', name: 'audit.mjs: numeric columns judged from paint, by column; --kind service landmarks and one family', run: async () => {
      const r = await run('audit.mjs', ['--base', fx, '--paths', '/audit-numbers.html', '--widths', '1440,390', '--kind', 'service', '--no-axe', '--out', `${tmp}/audit-numbers`]);
      const mkt = await run('audit.mjs', ['--base', fx, '--paths', '/audit-numbers.html', '--widths', '1440', '--kind', 'marketing', '--no-axe', '--out', `${tmp}/audit-numbers-mkt`]);
      return { ...r, md: await readFile(`${tmp}/audit-numbers/audit.md`, 'utf8').catch(() => ''), mkt: await readFile(`${tmp}/audit-numbers-mkt/audit.md`, 'utf8').catch(() => '') };
    },
    check: ({ md, mkt }) => {
      const at = (w) => { const i = md.indexOf(`### ${w}px`); if (i < 0) return ''; const j = md.indexOf('\n### ', i + 4); return md.slice(i, j < 0 ? undefined : j); };
      const cols = (w) => (at(w).match(/Numeric columns:[^\n]*/) || [''])[0];
      const named = (w, c) => cols(w).includes(`"${c}": aligned`);
      const out = [];
      for (const w of [1440, 390]) {
        for (const [c, how] of [['Grid', 'left'], ['Gap', 'left'], ['Mid', 'center'], ['Left', 'left'], ['Even', 'left']]) out.push([cols(w).includes(`"${c}": aligned ${how} (`), `${w}: "${c}" aligned ${how}`]);
        // Right edges constant from row to row: pills, a trailing icon, a ::after unit, padded links and boxes, accounting style.
        const wrong = ['Chip', 'Same', 'Icon', 'Unit', 'Link', 'Pad', 'Right', 'Acct', 'Start'].filter((c) => named(w, c));
        out.push([!wrong.length, `${w}: columns right-aligned in paint are not reported${wrong.length ? ` (got ${wrong.join(', ')})` : ''}`]);
      }
      out.push([named(1440, 'Stack') && !named(390, 'Stack'), 'Stack: left at 1440; stacked flex rows at 390 paint it right']);
      out.push([!/Missing landmarks|One family/.test(md), '--kind service: no nav landmark required, no one-family signal']);
      out.push([/Missing landmarks: nav\./.test(mkt) && /One family at one or two weights/.test(mkt), '--kind marketing: both still reported']);
      return out;
    } },
  { group: 'audit', name: 'audit.mjs: numeric columns whose values paint at one width (audit-numbers-even)', run: async () => {
      const r = await run('audit.mjs', ['--base', fx, '--paths', '/audit-numbers-even.html', '--widths', '1440,390', '--kind', 'app', '--no-axe', '--out', `${tmp}/audit-numbers-even`]);
      return { ...r, md: await readFile(`${tmp}/audit-numbers-even/audit.md`, 'utf8').catch(() => '') };
    },
    check: ({ md }) => {
      const at = (w) => { const i = md.indexOf(`### ${w}px`); if (i < 0) return ''; const j = md.indexOf('\n### ', i + 4); return md.slice(i, j < 0 ? undefined : j); };
      const cols = (w) => (at(w).match(/Numeric columns:[^\n]*/) || [''])[0];
      const out = [];
      for (const w of [1440, 390]) {
        for (const [c, how] of [['GridEq', 'left'], ['GapEq', 'left'], ['MidEq', 'center']]) out.push([cols(w).includes(`"${c}": aligned ${how} (`), `${w}: "${c}" aligned ${how}`]);
        // The edge that stays put when a value narrows: the right one, whatever holds it there.
        const wrong = ['PillEq', 'IconEq', 'LinkEq', 'FloatEq', 'EndEq', 'Change'].filter((c) => cols(w).includes(`"${c}": aligned`));
        out.push([!wrong.length, `${w}: right-aligned columns of one width are not reported${wrong.length ? ` (got ${wrong.join(', ')})` : ''}`]);
      }
      return out;
    } },
  { group: 'audit', name: 'audit.mjs --kind configurator: the 11px floor (one uppercase word), monospace by its glyphs, a wide panel with nothing to scroll sideways; a server that is down', run: async () => {
      const r = await run('audit.mjs', ['--base', fx, '--paths', '/audit-type.html', '--widths', '390', '--kind', 'configurator', '--no-axe', '--out', `${tmp}/audit-type`]);
      const down = await run('audit.mjs', ['--base', 'http://127.0.0.1:9', '--paths', '/', '--widths', '390', '--out', `${tmp}/audit-down`]);
      return { ...r, down, md: await readFile(`${tmp}/audit-type/audit.md`, 'utf8').catch(() => '') };
    },
    check: ({ md, down }) => {
      const s = section(md, '/audit-type.html');
      const small = (s.match(/Text under 12px:[^\n]*/) || [''])[0], mono = (s.match(/Monospace text rendered[^\n]*/) || [''])[0];
      return [
        [/^## \/audit-type\.html {2}\(app, as configurator\)/m.test(md), '--kind configurator (a signature route) runs the app rules'],
        [/"order status"/.test(small) && /"LAST SHIFT"/.test(small) && /10px "NEW"/.test(small), 'two-word uppercase labels at 11px, and one word at 10px, are small text'],
        [!/"status"|"PAID"/.test(small), 'a single uppercase word at 11px is not'],
        [/p\.serial/.test(mono) && !/h1|Code Next/.test(mono), 'DejaVu Sans Mono is monospace; "Code Next", a proportional face with a code-font name, is not'],
        [/✗ Text past the viewport[^\n]*div\.panel > p/.test(s), 'a 420px overflow-y: auto panel that has nothing to scroll sideways is cut by body\'s clip'],
        [down.code === 1 && /Could not audit \//.test(down.out) && /Nothing scanned/.test(down.out) && !/No violations in 0 views/.test(down.out), `a server that is down: exit 1, and the axe roll-up does not read as clean (exit ${down.code})`],
      ];
    } },
  { group: 'states', name: 'states.mjs: why a step refused (closed details, until-found, hover, select, clip, --each capture, overflow, no viewport meta)', run: async () => {
      const spec = path.join(tmp, 'reasons.json');
      await (await import('node:fs/promises')).writeFile(spec, JSON.stringify({ device: 'phone', states: [
        { name: 'details', path: '/states-reasons.html', steps: [{ check: '#indet' }] },
        { name: 'untilfound', path: '/states-reasons.html', steps: [{ check: '#uf' }] },
        { name: 'hover-disabled', path: '/states-reasons.html', device: 'desktop', steps: [{ hover: '#dbtn' }] },
        { name: 'no-option', path: '/states-reasons.html', steps: [{ select: ['#sel', 'xl'] }] },
        { name: 'pipes', path: '/states-reasons.html', steps: [{ check: '#undercrumbs' }] },
        { name: 'clipped', path: '/states-reasons.html', device: 'desktop', steps: [{ check: '#clipped' }] },
        { name: 'each-shot', path: '/states-reasons.html', each: true, shot: '#panel', steps: [{ click: '#next' }] },
        { name: 'overflow', path: '/states-overflow.html', steps: [{ check: '[name=consent]' }] },
        { name: 'overflow-tap', path: '/states-overflow.html', steps: [{ tap: '[name=consent]' }, { eval: "if (!document.querySelector('[name=consent]').checked) throw new Error('consent not checked')" }] },
        { name: 'overflow-nope', path: '/states-overflow.html', steps: [{ check: '#nope' }] },
        { name: 'noviewport', path: '/states-noviewport.html', steps: [{ check: '#under' }] },
      ] }));
      const r = await run('states.mjs', [spec, '--base', fx, '--out', `${tmp}/reasons`]);
      return { ...r, md: await readFile(`${tmp}/reasons/states.md`, 'utf8').catch(() => '') };
    },
    check: ({ out, md }) => {
      const why = (n) => (out.match(new RegExp(`^✗ ${n} \\([^\\n]*\\n\\s+⚠ failed: ([^\\n]*)`, 'm')) || [])[1] || '';
      const row = md.split('\n').find((l) => l.startsWith('| pipes ')) || '';
      return [
        [/not rendered \(inside a closed <details> "More options"/.test(why('details')), 'a target in a closed <details> is not rendered, not "covered by <body>"'],
        [/not rendered \(hidden="until-found"/.test(why('untilfound')), 'hidden="until-found" is named'],
        [/covered by <div\.bar>/.test(why('hover-disabled')) && !/disabled \(/.test(why('hover-disabled')), 'hover on a disabled button blames the banner over it, not "disabled"'],
        [/the list has no option "xl" \(by value or label\); it offers "s" \(Small\), "m" \(Medium\)/.test(why('no-option')) && !/not actionable/.test(why('no-option')), 'a select without that option lists the options it has'],
        [/Home \\\| Shop \\\| Help/.test(row) && (row.match(/(?<!\\)\|/g) || []).length === 6, 'a "|" in a covering element\'s text is escaped in states.md'],
        [/its centre is cut off by <div\.clip>, overflow: clip/.test(why('clipped')), 'a target clipped by its container is "cut off", not "covered by <main>"'],
        [/step 1 \(click #next\): done, but the capture after it failed: "shot": "#panel" matches nothing/.test(why('each-shot')), 'a failed --each capture does not blame the step\'s target'],
        [/Playwright's pointer check missed it[^\n]*the page's own hit test at the target's centre reaches the target[^\n]*the test tool, not the product[^\n]*"tap" step[^\n]*the page is 940 px wide at a 390 px viewport/.test(why('overflow')) && !/lands on/.test(why('overflow')), 'a hit-test miss on an overflowing page, where the page\'s own hit test reaches the target, is called the tool\'s, with the tap advice and the overflow finding'],
        [/^✓ overflow-tap \(phone\)/m.test(out), 'the tap the message advises checks the box'],
        [/^not found[^\n]*; the page is 940 px wide/.test(why('overflow-nope').replace(/^step 1 \([^)]*\): /, '')), 'the overflow finding is added to "not found" too'],
        [/no <meta name="viewport">: a phone lays it out 980 px wide/.test(why('noviewport')) && !/layout overflows/.test(why('noviewport')), 'a page without a viewport meta is named as such, not as overflowing'],
      ];
    } },
  { group: 'states', name: 'states.mjs: a blocker drawn by the target\'s own container is named, never blamed on the tool (wide and narrow pages)', run: async () => {
      const spec = path.join(tmp, 'blockers.json');
      await (await import('node:fs/promises')).writeFile(spec, JSON.stringify({ device: 'phone', path: '/states-blockers.html', states: [
        { name: 'locked', steps: [{ check: '#addon' }] },
        { name: 'locked-narrow', path: '/states-blockers.html#narrow', device: 'desktop', steps: [{ check: '#addon' }] },
        { name: 'clip-check', steps: [{ check: '#opt' }] },
        { name: 'clip-hover', steps: [{ hover: '#settings' }] },
        { name: 'inert-hover', steps: [{ hover: '#inertbtn' }] },
        { name: 'inert-narrow', path: '/states-blockers.html#narrow', steps: [{ hover: '#inertbtn' }] },
        { name: 'stacked', path: '/states-blockers.html#narrow', device: 'desktop', steps: [{ hover: '#under' }] },
      ] }));
      return run('states.mjs', [spec, '--base', fx, '--out', `${tmp}/blockers`]);
    },
    check: ({ out }) => {
      const why = (n) => (out.match(new RegExp(`^✗ ${n} \\([^\\n]*\\n\\s+⚠ failed: ([^\\n]*)`, 'm')) || [])[1] || '';
      const notTool = (n) => !!why(n) && !/Playwright's pointer check missed it|test tool|"tap" step/.test(why(n));
      return [
        [/covered by the ::after of <div\.card\.locked> "Premium plan Add support"/.test(why('locked')) && /the page is 900 px wide/.test(why('locked')) && notTool('locked'), 'a "locked" card\'s ::after overlay is named on an overflowing page, not blamed on the tool'],
        [/covered by the ::after of <div\.card\.locked>/.test(why('locked-narrow')) && notTool('locked-narrow'), 'the same overlay is named on a page that fits'],
        [/cut away by the clip-path on <ul#menu> \(clip-path: inset\(0px 0px 100%\)\): a pointer at its centre lands on <nav>/.test(why('clip-check')) && notTool('clip-check'), 'a menu closed with clip-path is named (check)'],
        [/cut away by the clip-path on <ul#menu>/.test(why('clip-hover')) && notTool('clip-hover'), 'a menu closed with clip-path is named (hover)'],
        [/inert, inside <div>: it takes no pointer, focus or keyboard input/.test(why('inert-hover')) && notTool('inert-hover'), 'hover on an inert target says inert (overflowing page)'],
        [/inert, inside <div>/.test(why('inert-narrow')), 'hover on an inert target says inert (page that fits)'],
        [/a pointer at its centre lands on its container <div\.stack> "Under its container", not on it/.test(why('stacked')) && notTool('stacked'), 'a target stacked below its own container names the container'],
      ];
    } },
  { group: 'states', name: 'states.mjs --axe: overlays scanned open (phone drawer, desktop palette); settling that closes one fails the state', run: async () => {
      const spec = path.join(tmp, 'axe.json');
      await (await import('node:fs/promises')).writeFile(spec, JSON.stringify({ path: '/states-axe.html', device: 'phone', states: [
        { name: 'closed' },
        { name: 'drawer', steps: [{ tap: '#menu' }] },
        { name: 'palette', device: 'desktop', steps: [{ press: 'Control+k' }] },
        { name: 'more', device: 'desktop', steps: [{ click: '#more' }] },
        { name: 'more-noscroll', device: 'desktop', axe: 'no-scroll', steps: [{ click: '#more' }] },
        { name: 'tools', device: 'desktop', steps: [{ click: '#tools' }] },
        { name: 'tools-noscroll', device: 'desktop', axe: 'no-scroll', steps: [{ click: '#tools' }] },
        { name: 'hint', device: 'desktop', path: '/states-axe.html#with-hint' },
        { name: 'unscanned', axe: false, steps: [{ tap: '#menu' }] },
      ] }));
      const r = await run('states.mjs', [spec, '--base', fx, '--out', `${tmp}/axe`, '--axe']);
      const json = (f) => readFile(`${tmp}/axe/${f}.axe.json`, 'utf8').then(JSON.parse).catch(() => ({}));
      return { ...r, json: await json('drawer-phone'), tools: await json('tools-desktop'), shot: existsSync(`${tmp}/axe/drawer-phone.png`) };
    },
    check: ({ out, code, json, tools, shot }) => [
      [/^✓ closed \(phone\)[^\n]*axe: no violations$/m.test(out), 'the closed page scans clean, with no warning'],
      [/^✗ drawer \(phone\)[^\n]*axe: button-name \(critical, 1\)/m.test(out), 'the open phone drawer\'s unnamed close button is found'],
      [shot && !!json.violations?.[0]?.targets?.includes('#close'), 'a failing state keeps its capture; the .axe.json names the target'],
      [/^✗ palette \(desktop\)[^\n]*axe: label \(critical, 1\)/m.test(out), 'the palette opened with Control+k is scanned open'],
      [/^✗ more \(desktop\)[^\n]*\n\s+⚠ what the state opened went while the page settled for the scan: <div#more-menu> "Settings" \(aria-expanded 1 → 0\) — the scan missed it, so the state fails/m.test(out), 'a menu that closes on scroll is named, and the state fails'],
      [/^✓ more-noscroll \(desktop\)[^\n]*axe: region \(moderate, 1\)$/m.test(out), '"axe": "no-scroll" scans it open; a moderate violation does not fail the state'],
      [/^✗ tools \(desktop\)[^\n]*axe: no violations\n\s+⚠ what the state opened went while the page settled for the scan: <div#tools-menu> "Export" — the scan missed it/m.test(out) && tools.missedWhatTheStateOpened === true, 'a menu without aria-expanded that closes on scroll is caught by what disappeared'],
      [/^✗ tools-noscroll \(desktop\)[^\n]*axe: button-name \(critical, 1\), region \(moderate, 1\)/m.test(out), 'scanned open, its unnamed button is found'],
      [/^✓ hint \(desktop\)[^\n]*axe: no violations\n\s+⚠ <p#scroll-hint> "Scroll for more" \(drawn since the page opened\) went while the page settled for the scan/m.test(out), 'something drawn from the start that settling hid is named without failing the state'],
      [/^✓ unscanned \(phone\)/m.test(out) && !/^✓ unscanned[^\n]*axe:/m.test(out), '"axe": false opts a state out'],
      [code === 1, 'exit 1 on a critical violation'],
    ] },
  { group: 'states', name: 'states.mjs "record": bodies kept whole, one folder per --label (parity.mjs --payloads)', run: async () => {
      const fs = await import('node:fs/promises');
      let out = '';
      for (const b of ['old', 'new']) {
        const spec = path.join(tmp, `pay-${b}.json`);
        await fs.writeFile(spec, JSON.stringify({ path: `/states-payload.html?build=${b}`, device: 'desktop', route: { url: '**/api/*', json: { ok: true }, record: true }, states: [
          { name: 'long-note', steps: [{ click: '#send-json' }, { wait: 500 }] },
          { name: 'upload', steps: [{ click: '#send-file' }, { wait: 500 }] },
        ] }));
        out += (await run('states.mjs', [spec, '--base', fx, '--out', `${tmp}/pay`, '--label', b])).out;
      }
      const p = await run('parity.mjs', ['--payloads', `${tmp}/pay/requests/old`, `${tmp}/pay/requests/new`]);
      const rec = JSON.parse(await fs.readFile(`${tmp}/pay/requests/new/long-note-desktop-new.json`, 'utf8').catch(() => '{}'));
      return { code: p.code, out: out + p.out, parity: p.out, rec, files: ['old/long-note-desktop-old', 'old/upload-desktop-old', 'new/upload-desktop-new'].map((f) => existsSync(`${tmp}/pay/requests/${f}.json`)) };
    },
    check: ({ parity, rec, files }) => {
      const r = rec.requests?.[0] || {};
      return [
        [files.every(Boolean), 'each --label records into its own folder under requests/'],
        [r.raw?.length > 250000 && !/truncated/.test(r.raw) && r.sha256?.length === 64 && r.bytes > 250000, 'a 250,000-character body is recorded whole, with its length and SHA-256'],
        [/2 request pair\(s\): 0 byte-identical/.test(parity) && !/cannot compare in full/.test(parity), 'a difference after character 200,000 and one non-UTF-8 byte in an upload are both found'],
      ];
    } },
  { group: 'compare', name: 'compare.mjs --grid: labels in the wrong order, leading labels only, placeholders', run: async () => {
      const L = (n) => path.join(root, 'tools/regress/fixtures/compare-ledger', `2026-09-28-${n}.png`);
      const P = (n) => path.join(root, 'tools/regress/fixtures/compare-pair', `home-1440-${n}.png`);
      const ledger = ['azul-home', 'milkline-herd', 'milkline-marketing', 'sanad-dashboard'].map(L); // shell-glob (name) order
      const wrong = await run('compare.mjs', ['--grid', ...ledger, '--labels', 'Milkline marketing', 'Milkline herd', 'Sanad', 'Azul', '--out', `${tmp}/cmp-wrong.png`]);
      const right = await run('compare.mjs', ['--grid', ...ledger, '--labels', 'Azul', 'Milkline herd', 'Milkline marketing', 'Sanad', '--out', `${tmp}/cmp-right.png`]);
      const lead = await run('compare.mjs', ['--grid', P('after'), P('before'), ...ledger, '--labels', 'New', 'Old', '--out', `${tmp}/cmp-lead.png`]);
      const skip = await run('compare.mjs', ['--grid', P('after'), P('before'), ...ledger, '--labels', 'New', '-', '', '-', '-', 'Sanad', '--out', `${tmp}/cmp-skip.png`]);
      const comma = await run('compare.mjs', ['--grid', L('azul-home'), '--labels', 'Azul, Lisbon', '--out', `${tmp}/cmp-comma.png`]);
      const none = await run('compare.mjs', ['--grid', '--out', `${tmp}/cmp-none.png`]);
      return { wrong, right, lead, skip, comma, none, drawn: (f) => existsSync(`${tmp}/${f}`) };
    },
    check: ({ wrong, right, lead, skip, comma, none, drawn }) => [
      [wrong.code === 1 && !drawn('cmp-wrong.png'), `labels in ledger.md order on glob-ordered files are refused, no sheet (exit ${wrong.code})`],
      [/2026-09-28-azul-home\.png -> Milkline marketing\s+✗ names 2026-09-28-milkline-marketing\.png/.test(wrong.out), 'the refusal names the file each wrong label belongs to'],
      [/--labels Azul "Milkline herd" "Milkline marketing" Sanad/.test(wrong.out), 'the refusal gives the list in file order'],
      [right.code === 0 && drawn('cmp-right.png') && /sanad-dashboard\.png -> Sanad/.test(right.out), `the list in file order draws the sheet (exit ${right.code})`],
      [lead.code === 0 && drawn('cmp-lead.png') && /home-1440-before\.png -> Old\n/.test(lead.out) && /azul-home\.png -> 2026-09-28-azul-home\.png  \(default\)/.test(lead.out), `labels for the leading panels only: the rest keep their file names (exit ${lead.code})`],
      [skip.code === 0 && /home-1440-before\.png -> home-1440-before\.png  \(default\)/.test(skip.out) && /milkline-herd\.png -> 2026-09-28-milkline-herd\.png  \(default\)/.test(skip.out) && /sanad-dashboard\.png -> Sanad\n/.test(skip.out), `"-" and "" keep a panel's file name (exit ${skip.code})`],
      [comma.code === 0 && /azul-home\.png -> Azul, Lisbon\n/.test(comma.out), `a one-file grid keeps a comma in its caption (exit ${comma.code})`],
      [none.code === 1 && !drawn('cmp-none.png') && /--grid needs the image files/.test(none.out), `--grid with no files is an error, not an empty sheet (exit ${none.code})`],
    ] },
  { group: 'compare', name: 'compare.mjs pairs: labels checked before the diff is written; --dir takes two captions', run: async () => {
      const P = (n) => path.join(root, 'tools/regress/fixtures/compare-pair', `home-1440-${n}.png`);
      const extra = await run('compare.mjs', ['--before', P('before'), '--after', P('after'), '--diff', `${tmp}/cmp-d1.png`, '--out', `${tmp}/cmp-s1.png`, '--labels', 'Old', 'New', 'Extra']);
      const swapped = await run('compare.mjs', ['--before', P('before'), '--after', P('after'), '--diff', `${tmp}/cmp-d2.png`, '--out', `${tmp}/cmp-s2.png`, '--labels', 'After', 'Before']);
      const dir3 = await run('compare.mjs', ['--dir', path.join(root, 'tools/regress/fixtures/compare-pair'), '--labels', 'x', 'y', 'z', '--out', `${tmp}/cmp-dir3`]);
      const dir2 = await run('compare.mjs', ['--dir', path.join(root, 'tools/regress/fixtures/compare-pair'), '--labels', 'Old', 'New', '--out', `${tmp}/cmp-dir2`]);
      return { extra, swapped, dir3, dir2, drawn: (f) => existsSync(`${tmp}/${f}`) };
    },
    check: ({ extra, swapped, dir3, dir2, drawn }) => [
      [extra.code === 1 && !drawn('cmp-d1.png') && !drawn('cmp-s1.png'), `three labels for a pair: refused before the diff is written (exit ${extra.code})`],
      [swapped.code === 1 && !drawn('cmp-d2.png') && /--labels Before After/.test(swapped.out), `"After" on the -before capture is refused with the order meant (exit ${swapped.code})`],
      [dir3.code === 1 && !drawn('cmp-dir3') && /every folder sheet has two panels/.test(dir3.out), `--dir with three labels is an error, not silently ignored (exit ${dir3.code})`],
      [dir2.code === 0 && /home-1440-before\.png -> Old\n[^\n]*home-1440-after\.png -> New\n/.test(dir2.out) && /1 before\/after sheet\(s\)/.test(dir2.out), `--dir with two labels captions every sheet with them (exit ${dir2.code})`],
    ] },
  { group: 'compare', name: 'compare.mjs --grid: own captures not checked against the ledger; a suggested list draws a right sheet', run: async () => {
      const L = (n) => path.join(root, 'tools/regress/fixtures/compare-ledger', `2026-09-28-${n}.png`);
      const P = (n) => path.join(root, 'tools/regress/fixtures/compare-pair', `home-1440-${n}.png`);
      const ledger = ['azul-home', 'harbourside-permits', 'milkline-herd', 'milkline-marketing', 'sanad-dashboard'].map(L); // shell-glob (name) order
      const own = [P('after'), P('before')]; // your own captures, from another folder
      const g = (name, files, labels) => run('compare.mjs', ['--grid', ...files, '--labels', ...labels, '--out', `${tmp}/${name}.png`]);
      const suggested = (out) => { const m = /In this file order the labels read:\n {2}--labels (.*)\n/.exec(out); return m ? [...m[1].matchAll(/"((?:[^"\\]|\\.)*)"|(\S+)/g)].map((x) => (x[1] !== undefined ? x[1].replace(/\\(.)/g, '$1') : x[2])) : null; };
      const follow = (r, name, files) => (suggested(r.out) ? g(name, files, suggested(r.out)) : { code: null, out: '' });
      const r = {
        permit: await g('cmp-permit', [...own, ...ledger], ['Permit new', 'Permit old', 'Azul', 'Harbourside permits', 'Milkline herd', 'Milkline marketing', 'Sanad']),
        dash: await g('cmp-dash', [...own, ...ledger], ['New dashboard', 'Old']),
        bare: await g('cmp-bare', [...own, ...ledger], ['Sanad', 'Sanad (2019)']),
        plain: await g('cmp-plain', [...own, ...ledger], ['Permit redesign', 'Permit today']),
        partial: await g('cmp-partial', ledger, ['Sanad (Riyadh)']),
        forgot: await g('cmp-forgot', [...own, ...ledger], ['Azul', 'Harbourside permits', 'Milkline herd', 'Milkline marketing', 'Sanad']),
        swapped: await g('cmp-swapped', [...own, ...ledger], ['Old', 'New']),
        mdOrder: await g('cmp-mdorder', [...own, ...ledger], ['Permit new', 'Permit old', 'Milkline marketing', 'Milkline herd', 'Sanad', 'Azul', 'Harbourside permits']),
        one: await g('cmp-one', ledger, ['Sanad']),
      };
      return { ...r, suggested, drawn: (f) => existsSync(`${tmp}/${f}`),
        swappedFix: await follow(r.swapped, 'cmp-swapped-fix', [...own, ...ledger]),
        mdOrderFix: await follow(r.mdOrder, 'cmp-mdorder-fix', [...own, ...ledger]),
        oneFix: await follow(r.one, 'cmp-one-fix', ledger) };
    },
    check: ({ permit, dash, bare, plain, partial, forgot, swapped, mdOrder, one, swappedFix, mdOrderFix, oneFix, suggested, drawn }) => [
      [permit.code === 0 && drawn('cmp-permit.png'), `"Permit new" / "Permit old" on your own captures beside the ledger's harbourside-permits: drawn (exit ${permit.code})`],
      [dash.code === 0 && /home-1440-after\.png -> New dashboard\n/.test(dash.out), `"New dashboard" on your own capture is not read as meant for the ledger's sanad-dashboard (exit ${dash.code})`],
      [bare.code === 0 && plain.code === 0, `a project name on your own captures ("Sanad", "Permit redesign") is not measured against the ledger files (exit ${bare.code}, ${plain.code})`],
      [partial.code === 1 && /-> Sanad \(Riyadh\)\s+✗ names 2026-09-28-sanad-dashboard\.png/.test(partial.out) && !suggested(partial.out), `a label that only shares a word with the file it names is refused without a suggested list (exit ${partial.code})`],
      [forgot.code === 1 && !drawn('cmp-forgot.png') && !suggested(forgot.out), `ledger captions typed without your own panels' captions: refused, and no list that keeps "Azul" on your capture (exit ${forgot.code})`],
      [swapped.code === 1 && /home-1440-after\.png -> Old\s+✗ names home-1440-before\.png/.test(swapped.out) && swappedFix.code === 0 && /home-1440-after\.png -> New\n[^\n]*home-1440-before\.png -> Old\n/.test(swappedFix.out), `"Old" / "New" on your -after / -before captures: refused, and the suggested list draws them right (exit ${swapped.code}, then ${swappedFix.code})`],
      [mdOrder.code === 1 && mdOrderFix.code === 0 && /home-1440-after\.png -> Permit new\n/.test(mdOrderFix.out) && ['azul-home.png -> Azul', 'harbourside-permits.png -> Harbourside permits', 'milkline-herd.png -> Milkline herd', 'milkline-marketing.png -> Milkline marketing', 'sanad-dashboard.png -> Sanad'].every((p) => mdOrderFix.out.includes(`${p}\n`)), `ledger labels in ledger.md order: refused, and the suggested list captions every panel with its own name (exit ${mdOrder.code}, then ${mdOrderFix.code})`],
      [one.code === 1 && oneFix.code === 0 && /sanad-dashboard\.png -> Sanad\n/.test(oneFix.out) && /azul-home\.png -> 2026-09-28-azul-home\.png {2}\(default\)/.test(oneFix.out), `one ledger label on the wrong ledger panel: the suggested list moves it to the file it names (exit ${one.code}, then ${oneFix.code})`],
    ] },
  { group: 'compare', name: 'compare.mjs --grid --cols: a contact sheet of 24 in rows of 6, labels still checked', run: async () => {
      const fs = await import('node:fs/promises');
      const src = ['compare-ledger/2026-09-28-azul-home', 'compare-ledger/2026-09-28-sanad-dashboard', 'compare-pair/home-1440-before'].map((f) => path.join(root, 'tools/regress/fixtures', `${f}.png`));
      const raw = path.join(tmp, 'contact');
      await fs.mkdir(raw, { recursive: true });
      const n = Array.from({ length: 24 }, (_, i) => String(i).padStart(3, '0'));
      for (const [i, x] of n.entries()) await fs.copyFile(src[i % src.length], path.join(raw, `${x}.png`));
      const g = (name, labels, extra = []) => run('compare.mjs', ['--grid', ...n.map((x) => path.join(raw, `${x}.png`)), '--labels', ...labels, ...extra, '--out', `${tmp}/${name}.png`]);
      const six = await g('cmp-cols6', n, ['--cols', '6']);
      const row = await g('cmp-row', n);
      const swapped = await g('cmp-cols-swapped', [...n.slice(0, 4), n[5], n[4], ...n.slice(6)], ['--cols', '6']);
      const bad = await g('cmp-cols-bad', n, ['--cols', '0']);
      const size = async (f) => { const b = await fs.readFile(`${tmp}/${f}.png`).catch(() => null); return b ? [b.readUInt32BE(16), b.readUInt32BE(20)] : [0, 0]; };
      return { six, row, swapped, bad, sixSize: await size('cmp-cols6'), rowSize: await size('cmp-row'), drawn: (f) => existsSync(`${tmp}/${f}.png`) };
    },
    check: ({ six, row, swapped, bad, sixSize, rowSize, drawn }) => [
      [six.code === 0 && row.code === 0 && /023\.png -> 023\n/.test(six.out), `--cols 6 draws the sheet, every panel with its label (exit ${six.code})`],
      [sixSize[0] > 0 && sixSize[0] === rowSize[0] && sixSize[1] > rowSize[1] * 4, `four rows of six, as wide as one row of 24 (got ${sixSize.join('×')} against ${rowSize.join('×')})`],
      [swapped.code === 1 && !drawn('cmp-cols-swapped') && /004\.png -> 005\s+✗ names 005\.png/.test(swapped.out), `two labels swapped are still refused with --cols, and nothing is drawn (exit ${swapped.code})`],
      [bad.code === 1 && /--cols needs one whole number/.test(bad.out), `--cols 0 is an error (exit ${bad.code})`],
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
