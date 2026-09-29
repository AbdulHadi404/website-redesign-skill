#!/usr/bin/env node
/**
 * Regression set for the measurement scripts: what each one must find on pages with known defects, and must not
 * find on clean pages. Every script fix in this repository was checked against these pages by hand; this runs the
 * same checks so a change that alters what the scripts detect is seen before it ships.
 *
 *   node tools/regress.mjs            (needs `npm install` in skills/website-redesign/scripts and a Chromium)
 *   node tools/regress.mjs --only a11y,audit       (groups: a11y, widgets, audit, states, parity, capture, perf,
 *                                                   compare, contrast, fonts, palette, libcheck, templates, motion,
 *                                                   sweep, stress, model)
 *   REGRESS_OFFLINE=1 node tools/regress.mjs       (skips libcheck's network cases, as when the npm registry or
 *                                                   GitHub cannot be reached)
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
 *   tools/regress/fixtures/widgets-rtl-*.html, .json          arrow keys in RTL (tabs, toolbars, radios, sliders,
 *                                                             thumbs drawn for hidden ranges) and on wrapped, stacked,
 *                                                             re-rendered and wrapped-in-a-box widgets; palette,
 *                                                             sortable (a Delete button or link never pressed) and
 *                                                             splitter contracts, each passing and failing
 *   tools/regress/fixtures/a11y-canvas-toy/                   the S6 accessible-canvas toy: a (canvas only), b
 *                                                             (stand-ins with pointer-events: none), d (stand-ins and
 *                                                             a list)
 *   tools/regress/fixtures/a11y-canvas-over.html              controls over canvases that take no focus: a Menu
 *                                                             button over a hero, Sound and Music toggles (FAIL),
 *                                                             transparent stand-ins (WARN)
 *   tools/regress/fixtures/a11y-canvas-seen.html              inert, aria-hidden and outside-a-modal content for
 *                                                             states.mjs --aria
 *   tools/regress/fixtures/capture-fonts-perf-*.html          right-to-left pages that overflow sideways, with covered
 *                                                             images and a (pointer: coarse) band; safe-area insets;
 *                                                             a zoomed-out phone page
 *   tools/regress/fixtures/capture-fonts-perf-*-arabic.woff2  three OFL Arabic subsets for fonts.mjs (licence:
 *                                                             capture-fonts-perf-OFL.txt)
 *   tools/regress/fixtures/audit-rtl-*.html                   the RTL and phone blocks (copies of the S8 bilingual and
 *                                                             mobile pages, bidi wrap, fallback fonts via local()
 *                                                             faces, a Bootstrap-shaped RTL page with the
 *                                                             out-of-sample false alarms beside true findings, hover
 *                                                             rules under media queries, a CSP that refuses inline
 *                                                             styles), concentric radii with a play disc, chart
 *                                                             labels, clipping by ink, ink as drawn (text-transform,
 *                                                             small caps, scaled previews)
 *   tools/regress/fixtures/palette-tenants*.txt               the 12 pathological tenant colours (S12 E1); untrusted
 *                                                             tenant input
 *   tools/regress/fixtures/promote-*.html                     templates/code: hero-effect.js (fence, pauses, reduced
 *                                                             motion, context loss, governor give-up, settle; no blank
 *                                                             or doubled frame at a scale change or resize); tier.js
 *                                                             and governor.js under CDP throttling
 *   tools/regress/fixtures/sweep-lab/, stress-lab/            seeded width and content-fragility defects with their
 *                                                             truth.json (copied from research/stage2/experiments/
 *                                                             S7-visual-iteration-tools)
 *   tools/regress/fixtures/motion-ticker.html, .json          a counter() ticker and its motion spec (S2-motion-lab)
 *   tools/regress/fixtures/model-quads.gltf                   five blended, double-sided quads (1 KB, hand-written)
 *   research/experiments/H-blind-eval/fixture/                the Milkline fixture (herd app for the walkthrough driver)
 *   research/experiments/H-blind-eval/sanad/fixture/          the old Sanad bilingual dashboard (numbers, scripts, states)
 *   research/experiments/H-blind-eval/stemwren/fixture/       a phone page with a width=1100 viewport (flat images)
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
// libcheck's network cases read the npm registry, raw.githubusercontent.com and GitHub over git: without any of them
// (or with REGRESS_OFFLINE set) they are skipped, and say so. Asked once per run.
let reach;
const reachable = () => (reach ??= process.env.REGRESS_OFFLINE ? Promise.resolve(false) : Promise.all([
  fetch('https://registry.npmjs.org/-/ping', { signal: AbortSignal.timeout(8000) }).then((r) => r.ok, () => false),
  ...['https://github.com/', 'https://raw.githubusercontent.com/emilkowalski/sonner/HEAD/README.md'].map((u) => fetch(u, { method: 'HEAD', signal: AbortSignal.timeout(8000) }).then((r) => r.ok, () => false)),
]).then((ok) => ok.every(Boolean)));

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
  { group: 'widgets', name: 'widgets.mjs: arrow keys follow the visual arrow (RTL tabs, toolbars, radios, sliders)', run: () => run('widgets.mjs', [`${fx}/widgets-rtl-arrows.html`, path.join(root, 'tools/regress/fixtures/widgets-rtl-arrows.json')]),
    check: ({ out }) => {
      // One contract's block of output, from its PASS/FAIL line to the blank line after it (the i-th for a target named twice).
      const block = (t, i = 0) => out.split('\n\n').filter((b) => b.split('\n')[0].endsWith(` ${t}`))[i] || '';
      return [
        [/^PASS tabs[^]*✓ ArrowLeft moves focus to the next tab, on its left \(direction: rtl/.test(block('#tabs-aware')), 'an RTL tablist whose ArrowLeft reaches the next tab passes, and says it assumed rtl'],
        [/^FAIL tabs[^]*✗ \[2\.1\.1\] The arrow keys run backwards: ArrowLeft does not move to the next tab/.test(block('#tabs-dom')), 'an RTL tablist with DOM-order arrows (ArrowRight = next) fails as backwards'],
        [/^PASS tabs[^]*✓ ArrowRight moves focus to the next tab, on its right \(direction: ltr/.test(block('#tabs-ltr')), 'a left-to-right tablist in an RTL page is judged left to right'],
        [/^PASS roving[^]*✓ ArrowLeft moves focus to the next item[^]*✓ one Tab stop for the toolbar/.test(block('#tools-aware')), 'an RTL toolbar that follows the arrow passes, with one Tab stop'],
        [/^FAIL roving[^]*✗ \[2\.1\.1\] The arrow keys run backwards/.test(block('#tools-dom')), 'an RTL toolbar with DOM-order arrows fails'],
        [/^PASS roving[^]*✓ ArrowLeft moves focus to the next item[^]*native radios[^]*✓ the radio that takes focus is checked/.test(block('#radios')), 'native radios in RTL pass: ArrowLeft is next, and the radio is checked'],
        [/^PASS slider[^]*✓ ArrowRight moves the thumb right and ArrowLeft left[^\n]*direction: rtl/.test(block('#vol-aware')), 'a mirrored RTL slider whose thumb follows the arrow passes'],
        [/^FAIL slider[^]*✗ \[2\.1\.1\] The arrow keys run backwards: ArrowRight moves the thumb left/.test(block('#vol-dom')), 'a slider whose thumb moves against the arrow fails'],
        [/^PASS slider[^]*✓ ArrowRight moves the thumb right and ArrowLeft left[^\n]*direction: rtl/.test(block('#range-drawn')), 'a visually hidden native range is judged by the thumb the page draws for it (mirrored: passes)'],
        [/^FAIL slider[^]*✗ \[2\.1\.1\] The arrow keys run backwards: ArrowRight moves the thumb left/.test(block('#range-drawn-dom')) && !/a visible native range/.test(block('#range-drawn-dom')), 'a visually hidden native range whose drawn thumb sits at a physical left: value% fails as backwards in RTL'],
      ];
    } },
  { group: 'widgets', name: 'widgets.mjs: arrow keys on wrapped, stacked, re-rendered and wrapped-in-a-box widgets', run: () => run('widgets.mjs', [`${fx}/widgets-rtl-layouts.html`, path.join(root, 'tools/regress/fixtures/widgets-rtl-layouts.json')]),
    check: ({ out }) => {
      const block = (t, i = 0) => out.split('\n\n').filter((b) => b.split('\n')[0].endsWith(` ${t}`))[i] || '';
      return [
        [/^PASS tabs[^]*✓ ArrowRight moves focus to the next tab, on the next line \(direction: ltr[^\n]*wrapped onto another line/.test(block('#tabs-wrap')), 'a left-to-right tablist that wraps onto a second line: ArrowRight still reaches the next tab'],
        [/^PASS roving[^]*✓ ArrowRight moves focus to the next item, on the next line/.test(block('#tools-wrap')), 'a wrapped toolbar passes the same way'],
        [/^PASS tabs[^]*✓ ArrowRight moves focus to the next tab, below it \([^\n]*stacked, but the tablist is horizontal: the ARIA default/.test(block('#tabs-stack')), 'a tablist stacked by CSS without aria-orientation is horizontal (ARIA default): Left/Right pass'],
        [/^FAIL tabs[^]*✗ \[4\.1\.2\] ArrowRight does not move focus[^\n]*nor does ArrowLeft, but ArrowDown does[^\n]*set aria-orientation="vertical"/.test(block('#tabs-stack-ud')), 'a stacked tablist that answers only Up/Down fails with the aria-orientation fix'],
        [/^PASS tabs[^]*✓ ArrowRight moves focus to the next tab[^]*✓ selection follows focus/.test(block('#tabs-rerender')), 'a tablist that re-renders its tabs on every selection passes, selection following focus included'],
        [/^PASS roving[^]*✓ ArrowRight moves focus to the next item/.test(block('#menubar-rerender')), 'a re-rendered menubar passes'],
        [/^PASS tabs[^]*✓ roving tabindex: one tab in the Tab sequence/.test(block('#tabs-after-frame')), 'an iframe with links of its own before the tablist does not hide its Tab stop'],
        [/^FAIL tabs[^]*✗ \[2\.1\.1\] ArrowRight does not move focus to the next tab[^\n]*nor does ArrowLeft/.test(block('#tabs-wrapper')), 'a contract naming a wrapper drives the tablist inside it: no arrow handling fails'],
        [/^PASS tabs[^]*✓ ArrowRight moves focus to the next tab[^]*✓ ArrowLeft moves back/.test(block('#tabs-wrapper-ok')), 'a correct tablist named by its wrapper passes with its arrow lines'],
      ];
    } },
  { group: 'widgets', name: 'widgets.mjs: command palette contract', run: () => run('widgets.mjs', [`${fx}/widgets-rtl-palette.html`, path.join(root, 'tools/regress/fixtures/widgets-rtl-palette.json')]),
    check: ({ out }) => {
      const block = (t, i = 0) => out.split('\n\n').filter((b) => b.split('\n')[0].endsWith(` ${t}`))[i] || '';
      const good = block('#open-good'), bad = block('#open-bad');
      return [
        [/^PASS palette/.test(good) && !/\n {3}!/.test(good), 'a modal, named palette with a status region passes without warnings'],
        [/✓ results announced via live region: "[^"]*1 result"/.test(good) && /✓ no match announced via live region: "No results found\."/.test(good), 'result counts and the empty state are announced'],
        [/✓ ArrowDown makes a result active for a screen reader \(aria-activedescendant: "Sign out"\)/.test(good), 'the active result is exposed through aria-activedescendant'],
        [/✓ Escape closes it\n[^]*✓ focus returned to the trigger/.test(good), 'Escape closes and focus returns to the opener'],
        [/^FAIL palette/.test(bad) && /✗ \[4\.1\.2\] The palette has no dialog semantics/.test(bad), 'a plain fixed layer fails: no dialog semantics (kbar)'],
        [/! \[1\.3\.2\] The page behind stays in the accessibility tree/.test(bad), 'the page behind left exposed warns'],
        [/✗ \[4\.1\.2\] ArrowDown makes no result active/.test(bad), 'a result highlighted by class only fails'],
        [/✗ \[4\.1\.3\] No match: "No results" is shown but not announced/.test(bad), 'a visible "No results" outside a live region fails (cmdk, React Aria)'],
        [/✗ \[2\.4\.3\] Focus not returned to the trigger on close \(now on body\)/.test(bad), 'focus dropped to body on close fails (cmdk)'],
      ];
    } },
  { group: 'widgets', name: 'widgets.mjs: sortable contract (keyboard reordering)', run: () => run('widgets.mjs', [`${fx}/widgets-rtl-sortable.html`, path.join(root, 'tools/regress/fixtures/widgets-rtl-sortable.json')]),
    check: ({ out }) => {
      const block = (t, i = 0) => out.split('\n\n').filter((b) => b.split('\n')[0].endsWith(` ${t}`))[i] || '';
      const good = block('#stages-good'), bad = block('#stages-bad'), row = block('#stages-row');
      const del = block('#stages-delete'), delH = block('#stages-delete', 1), link = block('#stages-link'), linkH = block('#stages-link', 1);
      return [
        [/^PASS sortable/.test(good) && !/\n {3}!/.test(good), 'a named handle with instructions, announcements by name and Escape passes without warnings'],
        [/✓ Space, ArrowDown, ArrowDown, Space moves "Brief" from position 1 to 3 of 5/.test(good) && /✓ focus stays on "Brief"/.test(good), 'Space, arrows, Space reorders and keeps focus on the item'],
        [/✓ announcements name the items: "Picked up Brief/.test(good) && /✓ Escape during a move puts "Brief" back/.test(good), 'announcements name the item; Escape cancels'],
        [/^FAIL sortable/.test(bad) && /✗ \[4\.1\.3\] The announcements name internal ids \(item-1/.test(bad), 'announcements with internal ids fail (dnd-kit defaults)'],
        [/✗ \[2\.4\.3\] Focus did not stay on the moved item \(now on body\)/.test(bad), 'a drop that loses focus fails'],
        [/✗ \[—\] Escape does not cancel a move/.test(bad), 'an Escape that drops instead of cancelling fails'],
        [/! \[2\.4\.6\] The handle's name "Drag" does not say which item it moves/.test(bad) && /! \[—\] The handle has no instructions/.test(bad), 'a generic handle name and no instructions warn'],
        [/^PASS sortable[^]*✓ Space, ArrowLeft, ArrowLeft, Space moves[^\n]*direction: rtl[^\n]*next item is on the left/.test(row), 'a right-to-left row moves with ArrowLeft, and says so'],
        [/^FAIL sortable[^]*✗ \[2\.1\.1\] "Brief" can only be dragged with a pointer: its handle \(span\.grip/.test(del) && !/moves "|deleted|handle named "Delete/.test(del), 'a Delete button first in the row is never pressed: the pointer-only grip fails, nothing is deleted'],
        [/^FAIL sortable[^]*✗ \[—\] Not a reorder: [^\n]*changed which items are in the list \(gone: "Brief", "Wireframes"\)/.test(delH) && !/moves "Brief"/.test(delH), 'a "handle" that deletes rows is not reported as a move'],
        [/^PASS sortable[^]*✓ handle named "Reorder Plan"[^]*✓ Space, ArrowDown, ArrowDown, Space moves "Plan" from position 1 to 3 of 4/.test(link), 'a link first in the row is passed over for the "Reorder" handle'],
        [/^FAIL sortable[^]*✗ \[—\] Not tested: Enter, ArrowDown, ArrowDown, Enter on the handle of "Plan" loaded another page \([^)]*widgets-rtl-away\.html/.test(linkH), 'a "handle" that navigates is reported as such, not as a missing list'],
      ];
    } },
  { group: 'widgets', name: 'widgets.mjs: splitter contract (window splitter)', run: () => run('widgets.mjs', [`${fx}/widgets-rtl-splitter.html`, path.join(root, 'tools/regress/fixtures/widgets-rtl-splitter.json')]),
    check: ({ out }) => {
      const block = (t, i = 0) => out.split('\n\n').filter((b) => b.split('\n')[0].endsWith(` ${t}`))[i] || '';
      const good = block('#sep-good'), bad = block('#sep-bad'), ptr = block('#sep-pointer'), edge = block('#sep-edge');
      return [
        [/^PASS splitter/.test(good) && !/\n {3}!/.test(good), 'a focusable, named, valued separator passes without warnings'],
        [/✓ aria-orientation "vertical" matches the vertical divider/.test(good) && /✓ ArrowRight moves the divider right[^\n]*ArrowLeft moves the divider left[^\n]*direction: rtl/.test(good), 'in RTL the divider still moves the way the arrow points'],
        [/✓ Home and End move the divider/.test(good) && /✓ Enter collapses or restores the pane/.test(good), 'Home/End and Enter'],
        [/^FAIL splitter/.test(bad) && /✗ \[4\.1\.2\] aria-orientation is missing \(the default is horizontal\) on a vertical divider/.test(bad), 'the default horizontal orientation on a vertical divider fails (Ark)'],
        [/✗ \[2\.1\.1\] The arrow keys run backwards: ArrowRight moves the divider left/.test(bad), 'arrows wired backwards fail'],
        [/✗ \[4\.1\.2\] aria-valuenow stays 30 while the divider moves/.test(bad), 'a value that does not follow the divider fails'],
        [/^FAIL splitter/.test(ptr) && /✗ \[2\.1\.1\] The divider cannot receive keyboard focus/.test(ptr) && /✗ \[4\.1\.2\] The divider is <div>, not role="separator"/.test(ptr), 'a pointer-only sash fails (allotment)'],
        [/^PASS splitter/.test(edge) && /✓ aria-orientation "vertical" matches the vertical divider/.test(edge) && /✓ ArrowRight moves the divider right/.test(edge), 'a tall bar at a sidebar\'s edge, between the sidebar\'s nav and footer, is judged by its own shape (vertical)'],
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
  { group: 'capture', name: 'capture.mjs --dir rtl: pseudo-RTL of a left-to-right page; right-to-left pages shot where they show', run: async () => {
      const cap = (paths, width, dir, extra = []) => run('capture.mjs', ['--base', fx, '--paths', ...paths, '--widths', width, '--out', `${tmp}/${dir}`, ...extra]);
      const flip = await cap(['/capture-reach.html'], '1024', 'cap-rtl', ['--dir', 'rtl', '--lang', 'ar']);
      const imgs = await cap(['/capture-fonts-perf-rtl-images.html'], '1024,390', 'cap-rtl-img');
      const bad = await cap(['/capture-reach.html'], '1024', 'cap-rtl-bad', ['--dir', 'sideways']);
      const { PNG } = (await import('node:module')).createRequire(path.join(scripts, 'package.json'))('pngjs');
      // The columns (CSS px) with dark ink in the band y0–y1 of a capture: [first, last], or null.
      const ink = async (f, y0, y1, dpr = 1) => {
        const b = await readFile(f).catch(() => null);
        if (!b) return null;
        const p = PNG.sync.read(b);
        let lo = Infinity, hi = -1;
        for (let y = y0 * dpr; y < Math.min(p.height, y1 * dpr); y++) for (let x = 0; x < p.width; x++) if (p.data[(y * p.width + x) * 4] < 100) { lo = Math.min(lo, x); hi = Math.max(hi, x); }
        return hi < 0 ? null : [lo / dpr, hi / dpr];
      };
      return { code: flip.code || imgs.code, out: [flip.out, imgs.out].join('\n'), flip: flip.out, imgs: imgs.out, bad,
        h1: await ink(`${tmp}/cap-rtl/capture-reach-html-1024-rtl-ar.png`, 20, 60), rtlH1: await ink(`${tmp}/cap-rtl-img/capture-fonts-perf-rtl-images-html-1024.png`, 30, 80) };
    },
    check: ({ flip, imgs, bad, h1, rtlH1 }) => [
      [/capture-reach-html-1024-rtl-ar\.png {2}\([^\n]*html dir="rtl" lang="ar" set by the capture/.test(flip), 'the files carry -rtl-ar and the line says what the capture set'],
      [/capture-reach-html-1024-rtl-ar\.png[^\n]*horizontal overflow by \d+px: [^\n]*div\.box/.test(flip) && !/text past the viewport[^\n]*div\.box/.test(flip), 'flipped, the nowrap box runs past the end (left) edge, which the page scrolls to: overflow, not cut'],
      [/text past the viewport where no scroll reaches it: [^\n]*ul\.hang > li \(\d+px\)/.test(flip), 'flipped, the hanging indent passes the right (start) edge: cut, and not "px left" as without --dir'],
      [!!h1 && h1[0] > 512, `the heading is drawn in the right half of the flipped shot (ink x ${h1 ? h1.map(Math.round).join('–') : 'none'})`],
      [/capture-fonts-perf-rtl-images-html-1024\.png[^\n]*horizontal overflow by \d+px: [^\n]*div\.wide/.test(imgs) && /capture-fonts-perf-rtl-images-html-390\.png/.test(imgs) && !/painted flat/.test(imgs), 'a right-to-left page that overflows sideways: no image reported flat at 1024 or 390 (Playwright\'s shifted shot reported 1 and 2)'],
      [!!rtlH1 && rtlH1[1] > 900, `its heading is in the shot, at the right edge (ink x ${rtlH1 ? rtlH1.map(Math.round).join('–') : 'none'}; the shifted shot had none)`],
      [bad.code === 2 && /--dir takes rtl or ltr/.test(bad.out), `--dir sideways is refused (exit ${bad.code})`],
    ] },
  { group: 'capture', name: 'capture.mjs: safe-area insets at phone widths only with viewport-fit=cover; --insets 0 turns them off', run: async () => {
      const cap = (paths, width, dir, extra = []) => run('capture.mjs', ['--base', fx, '--paths', ...paths, '--widths', width, '--out', `${tmp}/${dir}`, ...extra]);
      const on = await cap(['/capture-fonts-perf-insets.html', '/capture-fonts-perf-insets.html?meta=plain'], '390,1024', 'cap-ins');
      const off = await cap(['/capture-fonts-perf-insets.html'], '390', 'cap-ins-off', ['--insets', '0']);
      const { PNG } = (await import('node:module')).createRequire(path.join(scripts, 'package.json'))('pngjs');
      // The colour at x = 10, y = 770 (CSS px) of a 390 fold (DPR 2): the tab bar's green only if it padded for the home indicator.
      const at = async (f) => { const b = await readFile(f).catch(() => null); if (!b) return null; const p = PNG.sync.read(b); const i = (770 * 2 * p.width + 20) * 4; return [p.data[i], p.data[i + 1], p.data[i + 2]]; };
      return { code: on.code || off.code, out: [on.out, off.out].join('\n'), on: on.out, off: off.out,
        cover: await at(`${tmp}/cap-ins/capture-fonts-perf-insets-html-390-fold.png`), plain: await at(`${tmp}/cap-ins/capture-fonts-perf-insets-html-meta-plain-390-fold.png`), zero: await at(`${tmp}/cap-ins-off/capture-fonts-perf-insets-html-390-fold.png`) };
    },
    check: ({ on, off, cover, plain, zero }) => {
      const line = (s, shot) => (s.match(new RegExp(`[^\\n]*${shot}\\.png[^\\n]*`)) || [''])[0];
      const green = (c) => !!c && c[1] > 150 && c[0] < 60;
      return [
        [/safe-area insets 59\/34 px emulated \(viewport-fit=cover\)/.test(line(on, 'capture-fonts-perf-insets-html-390')), 'viewport-fit=cover at 390: the default insets are emulated, and the line says so'],
        [green(cover), `…and the tab bar that pads with env(safe-area-inset-bottom) grows into y = 770 (colour ${cover})`],
        [/capture-fonts-perf-insets-html-meta-plain-390\.png/.test(on) && !/safe-area/.test(line(on, 'capture-fonts-perf-insets-html-meta-plain-390')) && !green(plain), `without viewport-fit=cover: no insets, as on an iPhone (colour ${plain})`],
        [/capture-fonts-perf-insets-html-1024\.png/.test(on) && !/safe-area/.test(line(on, 'capture-fonts-perf-insets-html-1024')), 'not at desktop widths'],
        [/capture-fonts-perf-insets-html-390\.png/.test(off) && !/safe-area/.test(off) && !green(zero), `--insets 0 turns them off (colour ${zero})`],
      ];
    } },
  { group: 'capture', name: 'capture.mjs: flat-image self-check on a phone page shown zoomed out (fixed-width viewport meta)', run: async () => {
      const zoomed = await run('capture.mjs', ['--base', fx, '--paths', '/capture-fonts-perf-zoomed.html', '--widths', '390', '--out', `${tmp}/cap-zoom`]);
      const wren = await run('capture.mjs', ['--base', `${base}/research/experiments/H-blind-eval/stemwren/fixture`, '--paths', '/', '--widths', '390', '--out', `${tmp}/cap-wren`]);
      return { code: zoomed.code || wren.code, out: [zoomed.out, wren.out].join('\n'), zoomed: zoomed.out, wren: wren.out };
    },
    check: ({ zoomed, wren }) => [
      [/capture-fonts-perf-zoomed-html-390\.png[^\n]*⚠ 1 image\(s\) painted flat \(dashboard\.png\?covered\)/.test(zoomed), 'the covered image is found in the zoomed-out shot, and only it (it was missed)'],
      [/home-390\.png/.test(wren) && !/painted flat/.test(wren), 'Stem & Wren at 390 (width=1100): its visible logo is no longer reported flat'],
    ] },
  { group: 'capture', name: 'capture.mjs: right-to-left pages that overflow sideways keep the capture\'s emulation in every shot (variants, elements, --mode fullpage)', run: async () => {
      const pages = ['/capture-fonts-perf-rtl-images.html', '/capture-fonts-perf-rtl-covered.html'];
      const cap = (dir, extra, p = pages) => run('capture.mjs', ['--base', fx, '--paths', ...p, '--widths', '1024,390', '--out', `${tmp}/${dir}`, ...extra]);
      const grow = await cap('cap-emu', ['--variant', 'no-images', '--element', '.wide,.band,img']);
      const full = await cap('cap-emu-full', ['--mode', 'fullpage', '--variant', 'no-images']);
      // The same page flipped to left-to-right: Playwright's own element shots, or CDP's where Playwright would misplace them.
      const ltr = await cap('cap-emu-ltr', ['--dir', 'ltr', '--element', 'img'], pages.slice(0, 1));
      // --no-js with a variant hung: addStyleTag waits for a load event that never fires without JavaScript. Stopped after 90s.
      const t0 = Date.now();
      const nojs = await new Promise((resolve) => {
        const p = spawn(process.execPath, ['capture.mjs', '--base', fx, '--paths', pages[1], '--widths', '390', '--no-js', '--variant', 'no-text', '--out', `${tmp}/cap-emu-nojs`], { cwd: scripts, timeout: 90000 });
        let out = '';
        p.stdout.on('data', (d) => (out += d));
        p.stderr.on('data', (d) => (out += d));
        p.on('close', (code) => resolve({ code, out, s: Math.round((Date.now() - t0) / 1000) }));
      });
      const { PNG } = (await import('node:module')).createRequire(path.join(scripts, 'package.json'))('pngjs');
      const { readdir } = await import('node:fs/promises');
      // Every shot's size; the pixels of the ones the checks read.
      const sizes = {}, shots = {};
      const img = 'capture-fonts-perf-rtl-images-html', cov = 'capture-fonts-perf-rtl-covered-html';
      const read = [`cap-emu/${img}-390-no-images`, `cap-emu/${cov}-1024`, `cap-emu-full/${cov}-390-fold`, `cap-emu-full/${img}-390`,
        ...['', '-fold', '-no-images', '-el-band-1'].map((s) => `cap-emu/${cov}-390${s}`),
        ...['1024', '390'].flatMap((w) => ['img-1', 'img-2'].flatMap((e) => [`cap-emu/${img}-${w}-el-${e}`, `cap-emu-ltr/${img}-${w}-ltr-el-${e}`]))];
      for (const dir of ['cap-emu', 'cap-emu-full', 'cap-emu-ltr', 'cap-emu-nojs']) for (const f of await readdir(`${tmp}/${dir}`).catch(() => [])) {
        const k = `${dir}/${f.replace(/\.png$/, '')}`, b = await readFile(`${tmp}/${dir}/${f}`);
        sizes[k] = `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`;
        if (read.includes(k)) shots[k] = PNG.sync.read(b);
      }
      return { code: grow.code || full.code || ltr.code, out: [grow.out, full.out, ltr.out, nojs.out].join('\n'), grow: grow.out, full: full.out, nojs, sizes, shots };
    },
    check: ({ grow, full, nojs, sizes, shots }) => {
      const size = (k) => sizes[k] || 'none';
      // An element shot at DPR 3 of a w×h CSS px box (whole device pixels around it: one more row when it starts mid-pixel).
      const at3 = (k, w, h) => [`${w * 3}x${h * 3}`, `${w * 3}x${h * 3 + 3}`].includes(size(k));
      // Pure red and pure blue pixels: the band is red under (pointer: coarse), blue without touch.
      const band = (k) => { const p = shots[k]; let r = 0, b = 0; if (p) for (let i = 0; i < p.data.length; i += 4) { const [R, G, B] = [p.data[i], p.data[i + 1], p.data[i + 2]]; if (R > 240 && G < 15 && B < 15) r++; else if (B > 240 && R < 15 && G < 15) b++; } return r && !b ? 'red' : b && !r ? 'blue' : `red ${r} blue ${b}`; };
      // Mean luminance of the 6 device-px columns at each side: the dashboard image is dark to its edges, the page white.
      const edges = (k) => { const p = shots[k]; if (!p) return [255, 255]; const col = (x0) => { let s = 0, n = 0; for (let y = 0; y < p.height; y++) for (let x = x0; x < x0 + 6; x++) { const i = (y * p.width + x) * 4; s += p.data[i] * 0.3 + p.data[i + 1] * 0.59 + p.data[i + 2] * 0.11; n++; } return Math.round(s / n); }; return [col(0), col(p.width - 6)]; };
      const same = (a, b) => { const p = shots[a], q = shots[b]; if (!p || !q || p.width !== q.width || p.height !== q.height) return Infinity; let d = 0; for (let i = 0; i < p.data.length; i++) if (i % 4 !== 3) d += Math.abs(p.data[i] - q.data[i]); return d / (p.data.length * 0.75); };
      // The columns (CSS px) with dark ink in the band y0–y1 of a shot: [first, last], or null.
      const ink = (k, y0, y1, dpr) => { const p = shots[k]; if (!p) return null; let lo = Infinity, hi = -1; for (let y = y0 * dpr; y < Math.min(p.height, y1 * dpr); y++) for (let x = 0; x < p.width; x++) if (p.data[(y * p.width + x) * 4] < 100) { lo = Math.min(lo, x); hi = Math.max(hi, x); } return hi < 0 ? null : [lo / dpr, hi / dpr]; };
      const line = (s, shot) => (s.match(new RegExp(`[^\\n]*${shot}\\.png {2}[^\\n]*`)) || [''])[0];
      const img = 'cap-emu/capture-fonts-perf-rtl-images-html', cov = 'cap-emu/capture-fonts-perf-rtl-covered-html';
      const fimg = 'cap-emu-full/capture-fonts-perf-rtl-images-html', fcov = 'cap-emu-full/capture-fonts-perf-rtl-covered-html';
      const fullH1 = ink(`${fimg}-390`, 20, 80, 2);
      return [
        [size(`${img}-1024-fold`) === '1024x900' && size(`${img}-390-fold`) === '780x1688' && size(`${img}-1024-no-images`) === size(`${img}-1024`) && size(`${img}-390-no-images`) === size(`${img}-390`) && /^780x/.test(size(`${img}-390`)),
          `every shot at the context's DPR: folds 1024x900 and 780x1688, the variant as large as the main shot (390: ${size(`${img}-390-no-images`)} and ${size(`${img}-390`)}; a CDP shot without the emulation left 390x805 against 780x1610)`],
        [!!ink(`${img}-390-no-images`, 20, 80, 2) && ink(`${img}-390-no-images`, 20, 80, 2)[1] > 330, `…and the variant shows the heading at the start (right) edge (ink x ${ink(`${img}-390-no-images`, 20, 80, 2)?.map(Math.round).join('–') ?? 'none'})`],
        [['1024', '390'].every((w) => at3(`${img}-${w}-el-img-1`, 600, 350) && at3(`${img}-${w}-el-img-2`, 400, 233) && at3(`${cov}-${w}-el-wide-1`, 1500, 10) && at3(`${cov}-${w}-el-band-1`, 300, 60) && at3(`${cov}-${w}-el-img-1`, 300, 175) && at3(`${cov}-${w}-el-img-2`, 300, 175)),
          `every element shot at DPR 3, the second and later ones too (390: ${['img-1', 'img-2'].map((e) => size(`${img}-390-el-${e}`)).join(', ')}; after a CDP shot without the emulation the second came out 400x233)`],
        [['1024', '390'].every((w) => ['img-1', 'img-2'].every((e) => edges(`${img}-${w}-el-${e}`).every((l) => l < 150))), `each image shot holds its image edge to edge, not a crop beside it (edge luminance ${['1024', '390'].flatMap((w) => ['img-1', 'img-2'].map((e) => edges(`${img}-${w}-el-${e}`).join('/'))).join(', ')})`],
        [['1024', '390'].every((w) => ['img-1', 'img-2'].every((e) => same(`${img}-${w}-el-${e}`, `cap-emu-ltr/capture-fonts-perf-rtl-images-html-${w}-ltr-el-${e}`) < 0.5)),
          `…and equals the shot of the same image in the page flipped to left-to-right (mean difference ${['1024', '390'].flatMap((w) => ['img-1', 'img-2'].map((e) => same(`${img}-${w}-el-${e}`, `cap-emu-ltr/capture-fonts-perf-rtl-images-html-${w}-ltr-el-${e}`).toFixed(2))).join(', ')})`],
        [edges('cap-emu-ltr/capture-fonts-perf-rtl-images-html-390-ltr-el-img-2').every((l) => l < 150), `left-to-right at 390 (layout viewport widened, the image reached by scrolling the visual viewport): the image edge to edge, where Playwright's shot was 24px off (edge luminance ${edges('cap-emu-ltr/capture-fonts-perf-rtl-images-html-390-ltr-el-img-2').join('/')})`],
        [['-fold', '', '-no-images', '-el-band-1'].every((s) => band(`${cov}-390${s}`) === 'red') && band(`${cov}-1024`) === 'blue', `touch kept at 390 in the fold, the shot, the variant and the element shot after a wider-than-viewport one (${['-fold', '', '-no-images', '-el-band-1'].map((s) => band(`${cov}-390${s}`)).join(', ')}; 1024: ${band(`${cov}-1024`)})`],
        [['1024', '390'].every((w) => /⚠ 1 image\(s\) painted flat \(dashboard\.png\?covered\)/.test(line(grow, `capture-fonts-perf-rtl-covered-html-${w}`)) && /⚠ 1 image\(s\) painted flat \(dashboard\.png\?covered\)/.test(line(full, `capture-fonts-perf-rtl-covered-html-${w}`))) && !/capture-fonts-perf-rtl-images[^\n]*painted flat/.test(grow + full),
          'the covered image, and only it, reported flat at 1024 and 390 in grow and fullpage mode (fullpage at 390 reported nothing)'],
        [/3299px tall · ⚠ layout viewport widened to 1524px/.test(line(full, 'capture-fonts-perf-rtl-images-html-390')) && size(`${fimg}-390`) === '3048x6598' && size(`${fimg}-390-no-images`) === '3048x6598' && size(`${fimg}-390-fold`) === '780x1688' && band(`${fcov}-390-fold`) === 'red',
          `--mode fullpage at 390: the widened layout viewport kept (3299px tall, its warning), the whole document at DPR 2 (${size(`${fimg}-390`)}, variant ${size(`${fimg}-390-no-images`)}; it came out 390x844), the fold with touch`],
        [nojs.code === 0 && size('cap-emu-nojs/capture-fonts-perf-rtl-covered-html-390-no-text') === size('cap-emu-nojs/capture-fonts-perf-rtl-covered-html-390') && /^780x/.test(size('cap-emu-nojs/capture-fonts-perf-rtl-covered-html-390-no-text')), `--no-js with --variant finishes and shoots the variant (exit ${nojs.code} after ${nojs.s}s; variant ${size('cap-emu-nojs/capture-fonts-perf-rtl-covered-html-390-no-text')})`],
        [!!fullH1 && fullH1[1] > 1400, `…and the heading at the document's start (right) edge (ink x ${fullH1?.map(Math.round).join('–') ?? 'none'})`],
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
  { group: 'perf', name: 'perf.mjs: load average at the start and the end, and a warning at one per CPU or more', run: async () => {
      const fs = await import('node:fs/promises');
      // The warning needs a busy machine: a preload makes os.loadavg() report one (and an idle one), whatever the host's load.
      const fake = async (n, v) => { const f = path.join(tmp, `load-${n}.mjs`); await fs.writeFile(f, `import os from 'node:os'; os.loadavg = () => [${v}, ${v}, ${v}];`); return (await import('node:url')).pathToFileURL(f).href; };
      const withLoad = async (url, out) => {
        const prev = process.env.NODE_OPTIONS;
        process.env.NODE_OPTIONS = `${prev ? `${prev} ` : ''}--import=${url}`;
        try { return await run('perf.mjs', ['--base', fx, '--paths', '/cls.html', '--runs', '1', '--out', out]); } finally { if (prev === undefined) delete process.env.NODE_OPTIONS; else process.env.NODE_OPTIONS = prev; }
      };
      const real = await run('perf.mjs', ['--base', fx, '--paths', '/cls.html', '--runs', '1', '--out', `${tmp}/perf-load.md`]);
      const busy = await withLoad(await fake('busy', 512), `${tmp}/perf-busy.md`);
      const idle = await withLoad(await fake('idle', 0.01), `${tmp}/perf-idle.md`);
      return { code: real.code || busy.code || idle.code, out: [real.out, busy.out, idle.out].join('\n'), real: real.out, busy: busy.out, idle: idle.out,
        busyMd: await readFile(`${tmp}/perf-busy.md`, 'utf8').catch(() => ''), idleMd: await readFile(`${tmp}/perf-idle.md`, 'utf8').catch(() => '') };
    },
    check: ({ real, busy, idle, busyMd, idleMd }) => {
      const lines = (s) => [...s.matchAll(/^load average ([\d.]+) on (\d+) CPUs? \((start|end)\)([^\n]*)$/gm)];
      const consistent = (s) => lines(s).every((m) => (+m[1] >= +m[2]) === /⚠ busy machine/.test(m[4]));
      return [
        [lines(real).map((m) => m[3]).join(',') === 'start,end' && consistent(real), `the host's load average at the start and at the end, warning only at one per CPU or more (got: ${lines(real).map((m) => m[0].slice(0, 44)).join(' | ') || 'none'})`],
        [lines(busy).length === 2 && lines(busy).every((m) => /⚠ busy machine: the timings of this run are relative only/.test(m[4])), 'a load of 512: both lines warn that the timings are relative only'],
        [/ · load average 512\.00 → 512\.00 on \d+ CPUs \(busy machine: these numbers are relative only\) · /.test(busyMd), 'perf.md\'s header carries the load and the warning'],
        [lines(idle).length === 2 && !/⚠ busy/.test(idle) && / · load average 0\.01 → 0\.01 on \d+ CPUs · /.test(idleMd), 'an idle machine: the lines and the header, no warning'],
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
  { group: 'audit', name: 'audit.mjs RTL block: the S8 bilingual page built right, and with 24 seeded RTL mistakes (audit-rtl-bilingual)', run: async () => {
      const r = await run('audit.mjs', ['--base', fx, '--paths', '/audit-rtl-bilingual.html?lang=ar', '/audit-rtl-bilingual.html?lang=ar&variant=broken', '--widths', '1440,390', '--no-axe', '--out', `${tmp}/audit-rtl`]);
      return { ...r, md: await readFile(`${tmp}/audit-rtl/audit.md`, 'utf8').catch(() => '') };
    },
    check: ({ md }) => {
      const good = section(md, '/audit-rtl-bilingual.html?lang=ar  ('), bad = section(md, '/audit-rtl-bilingual.html?lang=ar&variant=broken');
      // each seeded mistake at both widths
      const both = (re) => count(new RegExp(re.source, 'gm'), bad) === 2;
      const firstFail = (good.match(/✗[^\n]{0,100}/) || [''])[0];
      return [
        [/### 390px/.test(good) && !firstFail, `built right: no fail at either width${firstFail ? ` (got: ${firstFail})` : ''}`],
        [!/(RTL|Phone) \[(?!icons)/.test(good) && !/Directional icons|must not mirror|against the reading/.test(good), 'built right: no RTL or phone warning, only the icon decisions to record'],
        [count(/RTL \[icons\]: Icons the sources disagree on[^\n]*help[^\n]*logout[^\n]*\(information\)/g, good) === 2, 'built right: help and log-out listed as decisions (INFO) at both widths'],
        [both(/✗ Glyphs cut by their clipping box[^\n]*span\.note-text[^\n]*div\.cell-name/), 'broken: harakat cut at line-height 1.1 (note) and 1.2 (table cell)'],
        [both(/✗ RTL \[align\]:[^\n]*p\.lede; p\.hint; table\.orders > caption/), 'broken: text-align: left on the lede, the hint, the caption and the cells'],
        [both(/✗ RTL \[arabic\]: Letter-spacing[^\n]*p\.eyebrow/) && both(/✗ RTL \[arabic\]: Italic[^\n]*p\.lede > em/), 'broken: tracking and italics on Arabic'],
        [both(/✗ RTL \[bidi\]: Left-to-right data shown out of order[^\n]*"-310\.50" reads as "310 \. 50 -"/), 'broken: a signed amount without <bdi>'],
        [both(/✗ RTL \[bidi\]: Fields[^\n]*#f-email[^\n]*#f-phone/) && both(/- RTL \[bidi\]: Email\/phone\/URL\/IBAN fields[^\n]*#f-iban/), 'broken: email and phone fields scrambled (FAIL), the IBAN field laid out RTL (WARN)'],
        [both(/✗ RTL \[drawers\][^\n]*#drawer/), 'broken: the drawer parked off the left'],
        [both(/✗ RTL \[icons\]: Arrows that point against[^\n]*\(5\)/) && both(/✗ RTL \[icons\]: Icons that must not mirror but are flipped[^\n]*\(5\): refresh[^\n]*clock[^\n]*play[^\n]*skip-forward[^\n]*check/), 'broken: 5 arrows against their label, 5 never-mirror icons flipped (15/15 directional, 5/5 never)'],
        [both(/- RTL \[icons\]: Directional icons with no flip in RTL \(10\)/), 'broken: the other 10 directional icons not flipped (WARN)'],
        [both(/- RTL \[css\]: Keyframes that move along x[^\n]*slide-in/) && both(/- RTL \[css\]: 12 of \d+ rules set physical[^\n]*\(information\)/), 'broken: x keyframes on RTL content (WARN), 12 physical rules (INFO)'],
      ];
    } },
  { group: 'audit', name: 'audit.mjs RTL block: LTR text that wraps is not scrambled, LTR data out of order is (audit-rtl-bidi)', run: async () => {
      const r = await run('audit.mjs', ['--base', fx, '--paths', '/audit-rtl-bidi.html', '--widths', '1440', '--no-axe', '--out', `${tmp}/audit-rtl-bidi`]);
      return { ...r, md: await readFile(`${tmp}/audit-rtl-bidi/audit.md`, 'utf8').catch(() => '') };
    },
    check: ({ md }) => {
      const fail = (md.match(/✗ RTL \[bidi\][^\n]*/) || [''])[0], warn = (md.match(/^- RTL \[bidi\][^\n]*/m) || [''])[0];
      return [
        [/\(3\): #f-phone: [^\n]*#f-hours: "09:00 - 17:00" reads as "17 : 00 - 09 : 00"[^\n]*#f-change: "-4\.2%"/.test(fail), 'a wrapped phone number, a time range and a signed percentage fail'],
        [/\(1\): #w-para/.test(warn), 'wrapped English sentences: a warning, only their end punctuation moves'],
        [!/#n-/.test(fail + warn), 'a wrapped cell, sentence and brand name, and isolated phrases, are not reported'],
      ];
    } },
  { group: 'audit', name: 'audit.mjs RTL block: glyphs drawn by a system fallback font (audit-rtl-fonts; local() faces from the Linux fonts)', run: async () => {
      const r = await run('audit.mjs', ['--base', fx, '--paths', '/audit-rtl-fonts.html', '/audit-rtl-fonts.html?face=latin', '/audit-rtl-fonts.html?face=gap', '/audit-rtl-fonts.html?face=weight', '--widths', '1440', '--no-axe', '--out', `${tmp}/audit-rtl-fonts`]);
      return { ...r, md: await readFile(`${tmp}/audit-rtl-fonts/audit.md`, 'utf8').catch(() => '') };
    },
    check: ({ md }) => {
      const at = (q) => (section(md, `/audit-rtl-fonts.html${q}  (`).match(/RTL \[fonts\][^\n]*/) || [''])[0];
      return [
        [/### 1440px/.test(section(md, '/audit-rtl-fonts.html  (')) && !at(''), 'one face that covers the Arabic: nothing reported'],
        [/\(most of the text\)[^\n]*do not cover this script/.test(at('?face=latin')), 'a Latin-only face: the Arabic falls back, most of the text'],
        [/U\+20C1/.test(at('?face=gap')) && !/most of the text/.test(at('?face=gap')), 'a face without the Saudi riyal sign: U+20C1 named'],
        [/never loaded: "brand" 400/.test(at('?face=weight')), 'an Arabic face at 400 outranked by the family\'s 100–700 Latin face: named as never loaded'],
      ];
    } },
  { group: 'audit', name: 'audit.mjs phone block: hover-only, pressed states, keyboards, insets only with cover, the keyboard model, a top-third primary (audit-rtl-mobile)', run: async () => {
      const r = await run('audit.mjs', ['--base', fx, '--paths', '/audit-rtl-mobile.html', '/audit-rtl-mobile.html?variant=broken', '/audit-rtl-mobile.html?variant=broken&meta=plain', '--widths', '390', '--kind', 'commerce', '--no-axe', '--out', `${tmp}/audit-rtl-mobile`]);
      return { ...r, md: await readFile(`${tmp}/audit-rtl-mobile/audit.md`, 'utf8').catch(() => '') };
    },
    check: ({ md }) => {
      const good = section(md, '/audit-rtl-mobile.html  ('), bad = section(md, '/audit-rtl-mobile.html?variant=broken  ('), plain = section(md, '/audit-rtl-mobile.html?variant=broken&meta=plain');
      return [
        [/### 390px/.test(good) && !/Phone \[/.test(good), 'built right: no phone finding'],
        [/✗ Phone \[hover\][^\n]*\.row:hover \.actions/.test(bad), 'broken: row actions revealed only on :hover'],
        [/✗ Phone \[keyboards\]: Fields whose type breaks input \(5\)[^\n]*#phone[^\n]*#card[^\n]*#cvc[^\n]*#post[^\n]*#otp/.test(bad), 'broken: type=number for phone, card, CVC, postcode and OTP'],
        [/- Phone \[keyboards\]: Fields that bring the wrong keyboard[^\n]*#email \(Email\): email field brings the "text" keyboard/.test(bad), 'broken: the wrong keyboard, missing autocomplete, 14px fields (WARN)'],
        [/✗ Phone \[safe-area\][^\n]*viewport-fit=cover[^\n]*\(8\)[^\n]*under the status bar[^\n]*home-indicator zone/.test(bad), 'broken with cover: 8 bar controls under the island and in the home-indicator zone'],
        [/- Phone \[pressed\][^\n]*button\.icon-btn\[Back\]/.test(bad), 'broken: no pressed state with the tap highlight off (WARN)'],
        [/- Phone \[keyboard\][^\n]*\(3\): #card under div\.buybar; #cvc under div\.buybar; #store under div\.buybar/.test(bad), 'broken with resizes-content: the buy bar covers 3 focused fields'],
        [/- Phone \[thumb\][^\n]*a\.fab-top\.primary "Buy now"/.test(bad), 'broken: Buy now pinned in the top third'],
        [!/✗ Phone \[safe-area\]/.test(plain) && /- Phone \[safe-area\]: No viewport-fit=cover[^\n]*\(information\)/.test(plain) && !/Phone \[keyboard\]:/.test(plain), 'without cover or resizes-content: one INFO, no safe-area fail, no keyboard model'],
        [/✗ Phone \[hover\]/.test(plain) && /✗ Phone \[keyboards\]/.test(plain), 'without cover: the hover and field fails remain'],
      ];
    } },
  { group: 'audit', name: 'audit.mjs: concentric radii on four corners with discs skipped, charts named by aria-labelledby or role="img", clipping by ink, ink as drawn (audit-rtl-concentric, -charts, -ink, -ink-transform)', run: async () => {
      const r = await run('audit.mjs', ['--base', fx, '--paths', '/audit-rtl-concentric.html', '/audit-rtl-charts.html', '/audit-rtl-ink.html', '/audit-rtl-ink-transform.html', '--widths', '1440', '--kind', 'app', '--no-axe', '--out', `${tmp}/audit-rtl-finish`]);
      return { ...r, md: await readFile(`${tmp}/audit-rtl-finish/audit.md`, 'utf8').catch(() => '') };
    },
    check: ({ md }) => {
      const nested = (section(md, '/audit-rtl-concentric.html').match(/Nested corners not concentric:[^\n]*/) || [''])[0];
      const charts = section(md, '/audit-rtl-charts.html'), ink = section(md, '/audit-rtl-ink.html'), drawn = section(md, '/audit-rtl-ink-transform.html');
      const cut = (drawn.match(/✗ Glyphs cut by their clipping box[^\n]*/) || [''])[0];
      return [
        [/`div\.card > a\.swollen` 24px inside `main > div\.card` 24px, 8px in \(≈16px\)/.test(nested), 'concentric: the swollen top-left corner'],
        [/`div\.foot > button\.publish` 12px inside `main > div\.foot` 12px, 12px in \(≈0px, bottom-right corner\)/.test(nested), 'concentric: a bottom-right corner at gap = R (v1 checked top-left only)'],
        [!/button\.play|input\.field|a\.concentric|div\.inner/.test(nested), `concentric: no play disc, no gap > R, no concentric nesting, no unpainted wrapper${nested ? ` (got: ${nested.slice(0, 160)})` : ''}`],
        [/◆ 1 chart\(s\) with no text/.test(charts), `charts: only the bare one of five is unlabelled (got: ${(charts.match(/◆ \d+ chart\(s\)/) || ['none'])[0]})`],
        [/✗ Glyphs cut by their clipping box \(1;[^\n]*`span\.chip` top \d+(\.\d)?px and bottom/.test(ink) && !/span\.fixed/.test(ink), 'ink: the accents of a line-height 1 chip are cut; overflow-y: visible fixes it'],
        [/✗ Text cut off by an overflow:hidden\/clip container \(1\): `div\.crop > p\.cropped`/.test(ink) && !/p\.padded|div\.scroll/.test(ink), 'ink: whole lines hidden are still cut off; padding past the frame and a scroller are not'],
        [/\(2;[^\n]*`#lowered` bottom \d+(\.\d)?px cut[^\n]*`#scaled-tag` top \d+(\.\d)?px and bottom/.test(cut), `ink as drawn: capitals drawn lower case lose their descenders; accents cut in a half-size preview${cut ? '' : ' (no glyph-cut line)'}`],
        [/### 1440px/.test(drawn) && !/#upper|#smallcaps|#control|#scaled-h|#zoomed-h/.test(cut) && !/Text cut off by an overflow/.test(drawn), 'ink as drawn: uppercase and small-caps text (no descenders drawn) and quarter-size previews (transform: scale, zoom) are not cut'],
      ];
    } },
  { group: 'audit', name: 'audit.mjs RTL block out of sample: Bootstrap-shaped false alarms stay silent beside the true findings; rotate, seek and back-to-top icons (audit-rtl-oos)', run: async () => {
      const r = await run('audit.mjs', ['--base', fx, '--paths', '/audit-rtl-oos.html', '--widths', '1440,390', '--no-axe', '--out', `${tmp}/audit-rtl-oos`]);
      return { ...r, md: await readFile(`${tmp}/audit-rtl-oos/audit.md`, 'utf8').catch(() => '') };
    },
    check: ({ md }) => {
      const oos = section(md, '/audit-rtl-oos.html'), phone = oos.slice(oos.indexOf('### 390px'));
      const both = (re) => count(new RegExp(re.source, 'gm'), oos) === 2;
      const icons = (oos.match(/RTL \[icons\][^\n]*/g) || []).join('\n');
      return [
        [/### 390px/.test(oos) && both(/✗ RTL \[drawers\][^\n]*\(1\): #filters/) && !/RTL \[drawers\][^\n]*(#sidebarMenu|#cart)/.test(oos), 'drawers: the start drawer parked off the left fails; the offcanvas-end opened from the left and a drawer-end are silent'],
        [both(/✗ RTL \[icons\]: Arrows that point against[^\n]*\(1\): bi-chevron-right in "المزيد"/), 'icons: "more" pointing right fails; arrows turned by rotate: 180deg or transform point left and pass'],
        [both(/- RTL \[icons\]: Directional icons with no flip in RTL \(1\): bi-reply in "رد"/), 'icons: only the reply arrow is unconfirmed (not the menu toggle\'s list, the chevrons their label confirms, or the disclosure chevron turned down)'],
        [both(/- RTL \[icons\]: Icons that must not mirror but are flipped \(one source[^\n]*\(1\): forward_30/) && !/forward_10|replay_10|play_arrow|back-to-top/.test(icons), 'icons: a flipped seek icon warns; forward_10 is media, not the mail forward arrow; back-to-top points up'],
        [both(/- RTL \[bidi\]: Email\/phone\/URL\/IBAN fields laid out right to left[^\n]*\(1\): #iban \[text\]/) && !/✗ RTL \[bidi\]/.test(oos), 'bidi: the IBAN field warns; the email field Bootstrap sets to LTR does not; icon-font ligatures are not text'],
        [/- Phone \[thumb\][^\n]*\(1\): a\.btn\.btn-primary "اشترك"/.test(phone), 'thumb: the filled subscribe button in the sticky bar warns; the brand link painted bg-primary does not'],
      ];
    } },
  { group: 'audit', name: 'audit.mjs phone block: hover rules judged where their media query applies and on what they hide; a page whose CSP refuses inline styles (audit-rtl-hover, audit-rtl-csp)', run: async () => {
      const r = await run('audit.mjs', ['--base', fx, '--paths', '/audit-rtl-hover.html', '/audit-rtl-csp.html', '--widths', '390', '--no-axe', '--out', `${tmp}/audit-rtl-hover`]);
      return { ...r, md: await readFile(`${tmp}/audit-rtl-hover/audit.md`, 'utf8').catch(() => '') };
    },
    check: ({ md }) => {
      const hov = section(md, '/audit-rtl-hover.html'), csp = section(md, '/audit-rtl-csp.html');
      const line = (hov.match(/Phone \[hover\][^\n]*/g) || []).join('\n');
      return [
        [/✗ Phone \[hover\]: Content revealed only on :hover[^\n]*\(2\): \.row:hover \.actions \(1 hidden\); \.tip-host:hover \.tip \(1 hidden\)/.test(hov), 'hover: row actions, and a tip inside a media query that matches phones, fail'],
        [/### 390px/.test(hov) && !/\.menu|\.mega|\.logo|\.overlay|\.shine|zoom-note/.test(line), `hover: not a desktop-only rule (@media min-width 1024px, or a sheet linked with that media), a decorative colour logo, an empty overlay or shine, or a (hover: hover) rule${line ? ` (got: ${line.slice(0, 160)})` : ''}`],
        [/✗ Phone \[hover\][^\n]*\.row:hover \.actions/.test(csp) && /✗ Phone \[keyboards\][^\n]*#p \(Phone\): type=number for tel/.test(csp), 'CSP style-src \'self\': the hover and keyboard fails stand'],
        [/- Phone \[pressed\][^\n]*\(1\): button\.go "Refresh orders"/.test(csp) && !/could not run|stopped early|not checked/.test(csp), 'CSP: pressed states read with transitions off through a constructed sheet (Save\'s :active behind a 0.3s transition is seen)'],
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
  { group: 'a11y', name: 'a11y.mjs: accessible-canvas toy (a canvas only; b stand-ins with pointer-events: none; d stand-ins and a list)', run: async () => {
      const toy = `${fx}/a11y-canvas-toy`;
      const a = await run('a11y.mjs', [`${toy}/a.html`, '--out', `${tmp}/a11y-canvas-a`]);
      const b = await run('a11y.mjs', [`${toy}/b.html`, '--out', `${tmp}/a11y-canvas-b`]);
      const d = await run('a11y.mjs', [`${toy}/d.html`, '--out', `${tmp}/a11y-canvas-d`]);
      return { code: a.code, out: [a.out, b.out, d.out].join('\n'), a: a.out, b: b.out, d: d.out };
    },
    check: ({ a, b, d }) => {
      const fails = (s) => (s.match(/(\d+) FAIL/) || [])[1];
      const standIns = /^WARN pointer\s+2\.1\.1\s+Clickable canvas \(pointerdown listener\) is not focusable; 1 Tab stop\(s\) over it may be its stand-ins \(button "Strawberry"\): Enter on button "Strawberry" changes the canvas — check them against the canvas contract[^\n]*canvas#cake/m;
      return [
        [fails(a) === '2' && /^FAIL pointer\s+2\.1\.1\s+Clickable \(pointerdown listener\) but not keyboard focusable\s+⟶ canvas#cake/m.test(a) && /^FAIL keyboard\s+2\.1\.1\s+Nothing on the page receives keyboard focus/m.test(a), `a (canvas only): 2 FAIL, the clickable canvas and no focus at all (got ${fails(a)})`],
        [/^INFO canvas[^\n]*0 control\(s\) over it at load; no keyboard path to test/m.test(a), 'a: the canvas section finds nothing over the canvas'],
        [fails(b) === '0' && fails(d) === '0', `b and d (stand-ins over the canvas): 0 FAIL (got ${fails(b)} and ${fails(d)})`],
        [!/2\.4\.11/.test(b + d), 'b and d: stand-ins with pointer-events: none over the canvas are not "hidden by other content" (either walk)'],
        [standIns.test(b) && standIns.test(d), 'b and d: the clickable canvas is a WARN naming the Tab stop over it, the key that changes the canvas, and the canvas contract'],
        [/^INFO canvas[^\n]*4 control\(s\) over it at load \(1 in the Tab order\); Enter on button "Strawberry": the canvas changed; announced: "Strawberry 1 added near the centre/m.test(b), 'b: stand-ins exist at load, Enter changes the canvas and the status region says so'],
        [!/^WARN canvas/m.test(b + d), 'b and d: no canvas warning (stand-ins at load, the change is announced)'],
      ];
    } },
  { group: 'a11y', name: 'a11y.mjs: controls over a canvas stand in for it only if a key on one changes it or they are built as stand-ins (a Menu, Sound or Music button is not)', run: () => run('a11y.mjs', [`${fx}/a11y-canvas-over.html`, '--out', `${tmp}/a11y-canvas-over`]),
    check: ({ out }) => {
      const line = (level, id) => (out.match(new RegExp(`^${level} pointer\\s+2\\.1\\.1\\s[^\\n]*⟶ canvas#${id}$`, 'm')) || [''])[0];
      const kept = (name, id) => line('FAIL', id).includes(`Clickable (pointerdown listener) but not keyboard focusable — the 1 Tab stop(s) over it (button "${name}") show no sign of standing in for it: they are painted and take the pointer`);
      return [
        [kept('Menu', 'hero') && line('FAIL', 'hero').includes('no key tried on them (Enter) changed the canvas'), 'hero: the header\'s Menu button over it is not its stand-in, so the FAIL stays'],
        [/^INFO canvas[^\n]*Enter on button "Menu": the canvas did not change[^\n]*canvas#hero$/m.test(out), 'hero: the drawer that Menu opens over the canvas is not read as the canvas changing'],
        [kept('Sound', 'dots') && /^INFO canvas[^\n]*Enter on button "Sound": the canvas did not change[^\n]*canvas#dots$/m.test(out), 'dots: a Sound toggle whose look changes when pressed is not its stand-in (FAIL)'],
        [kept('Music', 'stars') && line('FAIL', 'stars').includes('the canvas changes by itself, so no key could be shown to change it'), 'stars (moves by itself): a painted Music toggle is not its stand-in (FAIL)'],
        [line('WARN', 'lamp').includes('2 Tab stop(s) over it may be its stand-ins (button "Sound", button "Lamp, off"): Enter on button "Lamp, off" changes the canvas — check them against the canvas contract'), 'lamp: the transparent stand-in is tried before the Sound toggle next to it, and its Enter changes the canvas (WARN)'],
        [line('WARN', 'wheel').includes('may be its stand-ins (button "Next slice"): built as stand-ins (paint nothing until focused); the canvas changes by itself'), 'wheel (turns by itself): a transparent button over it is a stand-in by construction (WARN)'],
        [count(/^FAIL pointer/gm, out) === 3 && count(/^WARN pointer/gm, out) === 2 && !/^WARN canvas/m.test(out), `3 pointer FAILs, 2 pointer WARNs, no canvas warning (got ${count(/^FAIL pointer/gm, out)}, ${count(/^WARN pointer/gm, out)})`],
      ];
    } },
  { group: 'states', name: 'states.mjs --aria: inert, aria-hidden and outside-a-modal content is marked (lib/seen.mjs)', run: async () => {
      const spec = path.join(tmp, 'seen-inert.json');
      await (await import('node:fs/promises')).writeFile(spec, JSON.stringify({ path: '/a11y-canvas-seen.html', device: 'desktop', states: [{ name: 'panel' }, { name: 'modal', steps: [{ click: '#check' }] }] }));
      const r = await run('states.mjs', [spec, '--base', fx, '--out', `${tmp}/seen-inert`, '--aria']);
      const tree = (n) => readFile(`${tmp}/seen-inert/${n}-desktop.aria.yml`, 'utf8').catch(() => '');
      return { ...r, panel: await tree('panel'), modal: await tree('modal') };
    },
    check: ({ panel, modal }) => [
      [/- main ⟨inert: #app⟩:/.test(panel) && /Renew permit/.test(panel), 'the content of the inert #app is marked (Playwright lists it; the accessibility tree does not)'],
      [/⟨aria-hidden: div\.art⟩/.test(panel), 'the aria-hidden artwork and its button are marked'],
      [/# Named but not readable here:[^\n]*aria-hidden: div\.art[^\n]*inert: #app/.test(panel) && /not in the accessibility tree/.test(panel), 'the header counts them and says why'],
      [/^\s*- button "Start now"$/m.test(panel) && /^\s*- button "Close filters"$/m.test(panel), 'controls outside them are not marked'],
      [/- banner ⟨inert: outside #confirm⟩/.test(modal) && /- complementary "Filters" ⟨inert: outside #confirm⟩/.test(modal) && /- main ⟨inert: #app⟩/.test(modal), 'with the modal dialog open, everything outside it is marked'],
      [/- dialog:/.test(modal) && /button "Confirm"/.test(modal) && !/(dialog|Confirm)[^\n]*⟨/.test(modal), 'the dialog and its button are not'],
    ] },
  { group: 'fonts', name: 'fonts.mjs: line box per platform, line-height: normal, clip floors, Arabic coverage (three Arabic subsets, OFL)', run: () => run('fonts.mjs', ['tajawal', 'readexpro', 'vazirmatn'].map((f) => path.join(root, `tools/regress/fixtures/capture-fonts-perf-${f}-arabic.woff2`))),
    check: ({ out }) => {
      const face = (n) => { const i = out.indexOf(`capture-fonts-perf-${n}-arabic.woff2`); const j = out.indexOf('\ncapture-fonts-perf-', i + 10); return i < 0 ? '' : out.slice(i, j < 0 ? undefined : j); };
      const taj = face('tajawal'), rdx = face('readexpro'), vaz = face('vazirmatn');
      const floors = (s, on) => (s.match(new RegExp(`${on}: Arabic: plain ([\\d.]+), vocalised ([\\d.]+), stacked ([\\d.]+)`)) || []).slice(1).map(Number);
      // S8's floors came from Chromium's canvas ink; fontkit's shaping is within about 0.013 em of it.
      const near = (got, want) => got.length === want.length && got.every((g, i) => Math.abs(g - want[i]) <= 0.03);
      return [
        [/USE_TYPO_METRICS off/.test(taj) && /⚠ the line box differs by platform: 0\.643\/0\.357 from hhea on macOS, iOS, Linux, Android; 1\.016\/0\.375 from win on Windows/.test(taj), 'Tajawal: USE_TYPO_METRICS off and win ≠ hhea, so Windows builds another line box'],
        [/line-height: normal = 1\.20 \(macOS, iOS, Linux, Android\) · 1\.39 \(Windows\)/.test(taj), 'Tajawal: line-height: normal per platform'],
        [near(floors(taj, '    macOS, iOS, Linux, Android'), [1.04, 1.65, 1.92]) && near(floors(taj, '    Windows'), [1.40, 1.42, 1.56]), `Tajawal: clip floors near S8's 1.04/1.65/1.92, and 1.40/1.42/1.56 on Windows (got ${floors(taj, '    macOS, iOS, Linux, Android').join('/')} and ${floors(taj, '    Windows').join('/')})`],
        [/Arabic block U\+0600–06FF: 67 of 256 glyphs · missing گ چ ی ک ٫ ٬ ﷼ /.test(taj) && /⚠ no ٫ ٬ \(Arabic decimal and group separators\)/.test(taj), 'Tajawal: 67 glyphs in the Arabic block, the letters it lacks, and the separators Intl uses'],
        [/⚠ line-height: normal \(1\.25\) is below the Arabic plain floor \(1\.6\d\)/.test(rdx) && /missing گ پ چ ی ک ﷼ /.test(rdx), 'Readex Pro: line-height: normal 1.25 under its plain floor (S8: 1.67); no Persian letters'],
        [!/⚠/.test(vaz) && /one line box on every platform/.test(vaz) && near(floors(vaz, 'reading rule\\)'), [1.17, 1.48, 1.85]) && /has ڤ گ پ چ ی ک ٫ ٬ ﷼ ؟ ٪/.test(vaz), `Vazirmatn: nothing flagged, floors near S8's 1.17/1.48/1.85 (got ${floors(vaz, 'reading rule\\)').join('/')}), every letter checked`],
        [[taj, rdx, vaz].every((s) => /riyal sign U\+20C1 no/.test(s)), 'none of the three has U+20C1'],
      ];
    } },
  { group: 'palette', name: 'palette.mjs --brand: the step-9 label passes WCAG (APCA breaks ties); step 11 holds 4.5:1 on steps 2 and 3', run: async () => {
      // The 12 tenant colours of S12 E1, plus a mid grey on which neither white nor #111 reaches 4.5:1.
      const brands = ['#FFFF00', '#F0F0F0', '#000000', '#FF0000', '#8A8F98', '#1A3CF2', '#00A86B', '#FF7A00', '#00D1FF', '#6B21A8', '#0B1F3A', '#FF69B4'];
      const one = async (hex, i) => {
        const css = `${tmp}/palette-${i}.css`;
        const r = await run('palette.mjs', ['--brand', hex, '--name', 'b', '--dark', '--css', css]);
        return { hex, ...r, css: await readFile(css, 'utf8').catch(() => '') };
      };
      const out = [];
      for (const [i, hex] of brands.entries()) out.push(await one(hex, i));
      return { out, grey: await run('palette.mjs', ['--brand', '#777777']) };
    },
    check: ({ out, grey }) => {
      // WCAG 2 ratio of two #rrggbb values, computed here from the hex the script ships (not from its own report).
      const lum = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)).reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
      const ratio = (x, y) => { const [a, b] = [lum(x), lum(y)].sort((p, q) => q - p); return (a + 0.05) / (b + 0.05); };
      const t1 = [], t2 = [], s11 = [];
      for (const r of out) {
        const [light, dark] = r.css.split('@media');
        const labels = [...r.out.matchAll(/text on step 9: (#[0-9a-f]{6})/g)].map((m) => m[1]); // brand L, neutral L, brand D, neutral D
        [[light, 'b', labels[0]], [light, 'neutral', labels[1]], [dark || '', 'b', labels[2]], [dark || '', 'neutral', labels[3]]].forEach(([blk, name, label], k) => {
          const s = Array.from({ length: 12 }, (_, i) => (new RegExp(`--${name}-${i + 1}: [^;]+; /\\* (#[0-9a-f]{6})`).exec(blk) || [])[1]);
          if (s.some((x) => !x) || !label) { t1.push(`${r.hex}: no scale parsed`); return; }
          const tag = `${r.hex} ${k < 2 ? 'light' : 'dark'} ${name}`;
          if (ratio(s[8], label) < 4.5) t1.push(`${tag} ${ratio(s[8], label).toFixed(2)}`);
          if (ratio(s[9], label) < 4.5) t2.push(`${tag} ${ratio(s[9], label).toFixed(2)}`);
          for (const g of [1, 2]) if (ratio(s[10], s[g]) < 4.5) s11.push(`${tag} on step ${g + 1} ${ratio(s[10], s[g]).toFixed(2)}`);
        });
      }
      return [
        [out.every((r) => r.code === 0), `every --brand run exits 0 (got ${out.map((r) => r.code).join(',')})`],
        [/text on step 9: #111111 \(WCAG 7\.\d\d:1/.test(out[7].out), '#FF7A00: the label on step 9 is #111 at about 7:1, not white at 2.61:1'],
        [!t1.length, `the step-9 label reaches 4.5:1 on all 48 scales (was 14 of 24 brand scales failing)${t1.length ? `; fails: ${t1.join(', ')}` : ''}`],
        [!t2.length, `the same label reaches 4.5:1 on step 10, the hover fill${t2.length ? `; fails: ${t2.join(', ')}` : ''}`],
        [!s11.length, `step 11 reaches 4.5:1 on steps 2 and 3 as shipped (was 4.11–4.19:1 on step 3 in 12/12 light brand scales)${s11.length ? `; fails: ${s11.join(', ')}` : ''}`],
        [grey.code === 0 && /text on step 9: #ffffff \(WCAG 4\.48:1[^\n]*neither #ffffff nor #111111 reaches 4\.5:1 on step 9[^\n]*small-text labels go on step 10 #[0-9a-f]{6} with #ffffff \(5\.\d\d:1\)/.test(grey.out), '#777777: neither label passes on step 9 — said so, and step 10 named with its passing label'],
      ];
    } },
  { group: 'palette', name: 'palette.mjs --tenant-set: the 12 pathological tenant colours pass WCAG; APCA warns, never gates', run: async () => {
      const r = await run('palette.mjs', ['--tenant-set', path.join(root, 'tools/regress/fixtures/palette-tenants.txt'), '--dark', '--json']);
      let j = null;
      try { j = JSON.parse(r.out); } catch { /* reported below */ }
      return { ...r, j, text: await run('palette.mjs', ['--tenant-set', path.join(root, 'tools/regress/fixtures/palette-tenants.txt'), '--dark']) };
    },
    check: ({ code, j, text }) => {
      if (!j) return [[false, `--json output parses (exit ${code})`]];
      const lum = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)).reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
      const ratio = (x, y) => { const [a, b] = [lum(x), lum(y)].sort((p, q) => q - p); return (a + 0.05) / (b + 0.05); };
      const modes = j.tenants.flatMap((t) => t.modes.map((m) => ({ ...m, key: `${t.tenant}/${m.mode}` })));
      const get = (k) => modes.find((m) => m.key === k);
      // Recomputed here from the shipped hex: every text pair ≥ 4.5:1, every non-text pair ≥ 3:1.
      const bad = modes.flatMap((m) => {
        const R = m.roles, grounds = m.grounds;
        const text = [[R.onBrand, R.brand], [R.onBrand, R.brandHover], [R.accentStrong, R.accentSubtle], ...grounds.map((g) => [R.accentStrong, g])];
        const edge = grounds.map((g) => [R.brandBorder ?? R.brand, g]);
        return [...text.filter(([f, b]) => ratio(f, b) < 4.5), ...edge.filter(([f, b]) => ratio(f, b) < 3)].map(([f, b]) => `${m.key} ${f} on ${b} ${ratio(f, b).toFixed(2)}`);
      });
      const warned = modes.filter((m) => m.warnings.some((w) => /^label reads weak/.test(w))).map((m) => m.key).sort();
      const expectWarned = ['#00A86B/dark', '#00A86B/light', '#00D1FF/dark', '#00D1FF/light', '#8A8F98/dark', '#8A8F98/light', '#F0F0F0/light', '#FF0000/dark', '#FF0000/light', '#FF69B4/dark', '#FF69B4/light', '#FF7A00/dark', '#FF7A00/light'];
      const moved = modes.filter((m) => m.moved).map((m) => `${m.key}→${m.roles.brand}`).sort();
      const red = get('#FF0000/light');
      return [
        [code === 0 && j.pass && j.summary.tenantModes === 24 && j.summary.fail === 0 && j.summary.refused === 0, `exit 0, 24 tenant-modes, all pass WCAG (exit ${code}, ${JSON.stringify(j.summary)})`],
        [!bad.length, `every pair recomputed from the hex passes (text 4.5:1, brand edge 3:1)${bad.length ? `; fails: ${bad.join(', ')}` : ''}`],
        [JSON.stringify(warned) === JSON.stringify(expectWarned), `APCA label warnings on exactly the 13 tenant-modes of the report (got ${warned.length}: ${warned.join(' ')})`],
        [JSON.stringify(moved) === JSON.stringify(['#000000/dark→#626262', '#0B1F3A/dark→#4B6281', '#F0F0F0/light→#949494']), `the fill moves only near the page ground: #F0F0F0 light, black and navy dark (got ${moved.join(' ')})`],
        [red && red.roles.brand === '#FF0000' && red.roles.onBrand === '#22110E' && red.options.whiteLabelReadsWell?.fill === '#E80000' && red.options.whiteLabelReadsWell?.dE === 4.7, 'pure red keeps #FF0000 with a dark label (4.55:1); the admin option is #E80000 with white, ΔE 4.7'],
        [get('#FFFF00/light')?.roles.brandBorder && !get('#1A3CF2/light')?.roles.brandBorder, 'a fill under 3:1 on the page (yellow) gets an accent-strong border; blue does not'],
        [text.code === 0 && /24 pass WCAG, 0 fail, 0 refused; 13 with APCA warnings/.test(text.out) && /^✓ #FF0000 light pure red[^\n]*\n[^]*?! label reads weak: APCA Lc 39 < 75 for 14px\/600 — reads well: #E80000 with #FFFFFF \(ΔE 4\.7\)/m.test(text.out), 'the text report: one line per tenant-mode, warnings with the nearest fill that reads well'],
      ];
    } },
  { group: 'palette', name: 'palette.mjs --tenant: untrusted input refused, WCAG failures exit 1, APCA level by label size', run: async () => {
      const fx = (f) => path.join(root, 'tools/regress/fixtures', f);
      return {
        set: await run('palette.mjs', ['--tenant-set', fx('palette-tenants-untrusted.txt')]),
        alpha: await run('palette.mjs', ['--tenant', '#0000FF80']),
        short: await run('palette.mjs', ['--tenant', '#F00', '--json']),
        split: await run('palette.mjs', ['--tenant', '#1A3CF2', '--ground', '#FFFFFF', '#1C1D21']),
        body: await run('palette.mjs', ['--tenant', '#00D1FF', '--json']),
        large: await run('palette.mjs', ['--tenant', '#00D1FF', '--label', '24/400', '--json']),
      };
    },
    check: ({ set, alpha, short, split, body, large }) => {
      const js = (r) => { try { return JSON.parse(r.out); } catch { return null; } };
      const refusedLines = [...set.out.matchAll(/^✗ line (\d+): [^\n]* refused — /gm)].map((m) => +m[1]);
      const b = js(body), l = js(large);
      return [
        [set.code === 1 && JSON.stringify(refusedLines) === '[3,4,5,6,7,8,9]', `translucent, keyword, short-hex, rgba() and oklch() lines and a bad dark override are refused, exit 1 (exit ${set.code}, lines ${refusedLines.join(',')})`],
        [/^✓ #1A3CF2 light Acme/m.test(set.out) && /^✓ #4B6281 dark {2}Acme/m.test(set.out), 'a valid line in the same file is still checked, its dark override in dark mode'],
        [alpha.code === 1 && /"#0000FF80" refused — tenant colour must be an opaque 6-digit hex/.test(alpha.out), `--tenant '#0000FF80' is refused, not measured as opaque blue (exit ${alpha.code})`],
        [short.code === 1 && js(short)?.refused && js(short).pass === false, `--tenant '#F00' --json: refused, exit 1 (exit ${short.code})`],
        [split.code === 1 && /✗ accent-strong text on surface #1C1D21/.test(split.out) && /white text reaches only 1\.00:1 on #FFFFFF, black only 1\.25:1 on #1C1D21: grounds on both sides of mid-grey/.test(split.out), `a light page and a dark surface cannot share one accent: WCAG fails, exit 1, and the flag names the ground each end fails on (exit ${split.code})`],
        [b && l && body.code === 0 && large.code === 0 && b.modes[0].warnings.some((w) => /label reads weak: APCA Lc 69 < 75 for 14px\/600/.test(w)) && !l.modes[0].warnings.some((w) => /label reads weak/.test(w)), 'cyan\'s label (Lc 69) warns for 14px/600 labels (Lc 75) and not for 24px/400 (Lc 60)'],
      ];
    } },
  { group: 'palette', name: 'palette.mjs --tenant --ground: on a mid-tone page accent text goes to the side that reaches 4.5:1, not by OKLCH L 0.5', run: async () => {
      // Grey pages #626262–#787878 (OKLCH L 0.50–0.57) and saturated mid-tone bands from real pages: GOV.UK blue,
      // green and red (fixtures/govuk), #2563EB (fixtures/states-overflow.html), #4F46E5 (the blind-eval app), plus
      // #C15632. The 12 tenant colours on each. Black reaches only 3.4–4.5:1 on most, so accent text must go lighter.
      const set = path.join(root, 'tools/regress/fixtures/palette-tenants.txt');
      const pages = [...Array.from({ length: 12 }, (_, i) => `#${(0x62 + 2 * i).toString(16).toUpperCase().repeat(3)}`), '#1D70B8', '#0F7A52', '#CA3535', '#2563EB', '#4F46E5', '#C15632'];
      const sweep = [];
      for (const g of pages) sweep.push({ g, ...(await run('palette.mjs', ['--tenant-set', set, '--json', '--ground', g])) });
      return {
        sweep,
        blue: await run('palette.mjs', ['--tenant', '#1A3CF2', '--ground', '#6E6E6E']),
        straddle: await run('palette.mjs', ['--tenant', '#1A3CF2', '--json', '--ground', '#777777', '#6A6A6A']),
      };
    },
    check: ({ sweep, blue, straddle }) => {
      const lum = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)).reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
      const ratio = (x, y) => { const [a, b] = [lum(x), lum(y)].sort((p, q) => q - p); return (a + 0.05) / (b + 0.05); };
      const js = (r) => { try { return JSON.parse(r.out); } catch { return null; } };
      const fails = [], side = [], weak = [], parse = [];
      for (const s of sweep) {
        const j = js(s);
        if (!j) { parse.push(s.g); continue; }
        for (const t of j.tenants) {
          const m = t.modes[0], R = m.roles;
          // Recomputed from the shipped hex: accent-strong ≥ 4.5:1 on the page and on accent-subtle.
          for (const bg of [s.g, R.accentSubtle]) if (ratio(R.accentStrong, bg) < 4.5) fails.push(`${t.tenant} on ${s.g}: ${R.accentStrong} on ${bg} ${ratio(R.accentStrong, bg).toFixed(2)}`);
          // Where black cannot reach 4.5:1 on the page, accent text is lighter than it and accent-subtle darker.
          if (ratio('#000000', s.g) < 4.5 && !(lum(R.accentStrong) > lum(s.g) && lum(R.accentSubtle) < lum(s.g))) side.push(`${t.tenant} on ${s.g}: ${R.accentStrong} / ${R.accentSubtle}`);
          // Near the WCAG crossover both ends pass, but only light text reaches APCA Lc 75 (black: Lc 32–33).
          if (['#767676', '#C15632'].includes(s.g) && m.warnings.some((w) => /^accent-strong reads below/.test(w))) weak.push(`${t.tenant} on ${s.g}`);
        }
      }
      const st = js(straddle);
      const exit1 = sweep.filter((s) => s.code).map((s) => s.g);
      return [
        [!parse.length && !exit1.length, `every single mid-tone page passes WCAG for all 12 tenants, exit 0 (was 14 of 18 pages failing all 12: #646464–#747474 and the five real bands)${parse.length ? `; no JSON for ${parse.join(', ')}` : ''}${exit1.length ? `; exit 1 on ${exit1.join(', ')}` : ''}`],
        [!fails.length, `accent-strong reaches 4.5:1 on the page and on accent-subtle, recomputed from the hex${fails.length ? `; fails: ${fails.slice(0, 6).join('; ')}` : ''}`],
        [!side.length, `where black cannot reach 4.5:1 on the page, accent-strong is lighter than the page and accent-subtle darker${side.length ? `; not so: ${side.slice(0, 6).join('; ')}` : ''}`],
        [!weak.length, `on #767676 and #C15632 accent-strong takes the light side, which also reaches APCA Lc 75 (was black-ish at Lc 32–33)${weak.length ? `; still weak: ${weak.join(', ')}` : ''}`],
        [blue.code === 0 && /✓ accent-strong text on page #6E6E6E\s+#F4F9FF on #6E6E6E\s+4\.82:1/.test(blue.out) && !/mid-grey|far apart/.test(blue.out), `#1A3CF2 on a #6E6E6E page: accent-strong #F4F9FF at 4.82:1 (was the raw #1A3CF2 at 1.39:1, exit 1, blamed on "a light page and a dark band") (exit ${blue.code})`],
        [straddle.code === 1 && st?.modes[0].flags.some((f) => /white text reaches only 4\.48:1 on #777777, black only 3\.88:1 on #6A6A6A: grounds on both sides of mid-grey/.test(f)), `grounds on both sides of mid-grey (#777777 page, #6A6A6A surface) still fail, and the flag names where each end falls short (exit ${straddle.code})`],
      ];
    } },
  { group: 'libcheck', name: 'libcheck.mjs: 46 pinned packages and one package at two versions, verdicts a careful reader gives (npm registry and GitHub; skipped offline)', async run() {
      // Pinned versions fix the tarball (licence file, README); registry data and repository READMEs are live; git
      // activity is skipped (no expectation depends on it). Sources: S4 report F1 and its review; stage-2 promotion.
      const online = await reachable();
      if (!online) { this.name += ' — skipped: offline'; return { skipped: true, code: 0, out: '' }; }
      const { check } = await import((await import('node:url')).pathToFileURL(path.join(scripts, 'libcheck.mjs')).href);
      const L = [
        // README lines about a predecessor or an option, not the package (false RED in the S4 review).
        { spec: 'wavesurfer.js@8.0.1', cls: 'A', noRed: true, why: '"deprecated in favor of the merged option" is about an option' },
        { spec: '@maxgraph/core@0.24.0', cls: 'A', noRed: true, why: '"mxGraph (archived in 2020)" is the predecessor' },
        // A repository-wide notice naming two licences: the package's own is in package.json.
        { spec: '@liveblocks/client@3.24.2', cls: 'A', classified: /^Apache-2\.0$/, noRed: true, amber: /other packages in the repo are AGPL/, why: 'repo notice: Apache-2.0 here, AGPL elsewhere' },
        { spec: '@liveblocks/server@1.9.0', cls: 'C', kind: 'copyleft', red: /AGPL/ },
        // The MIT opening phrase inside a custom licence with a headcount cap.
        { spec: '@remotion/player@4.0.529', cls: 'C', kind: 'procurement', red: /headcount-cap/, why: 'MIT-like opening, headcount cap' },
        // "Unmaintained" only in the repository README, not in the 1.1.2 tarball.
        { spec: 'vaul@1.1.2', red: /README: .*unmaintained/i, why: 'unmaintained notice in the repository README only' },
        // Asset licences shipped by npm packages: recognised, not mislabelled.
        { spec: '@fontsource/inter@5.3.0', cls: 'A', classified: /^OFL-1\.1$/, noAmber: /file says/ },
        { spec: '@fontsource-variable/inter@5.3.0', cls: 'A', classified: /^OFL-1\.1$/, noAmber: /file says/ },
        { spec: '@iconify-json/solar@1.2.13', cls: 'B', classified: /^CC-BY-4\.0$/, noRed: true },
        { spec: 'remixicon@4.9.1', cls: 'C', kind: 'restricted use', red: /no-logo-use|no-competing/, noRed2: /\[non-commercial\]/, why: 'the prohibitions quoted, not the grant' },
        // A custom licence named only in package.json: read it (free for commercial use since 3.13).
        { spec: 'gsap@3.15.0', cls: '?', noRed: true, amber: /standard-license/ },
        // Proprietary licences that must stay RED.
        { spec: 'highcharts@13.1.1', cls: 'C', kind: 'procurement', red: /vendor-agreement/ },
        { spec: 'ag-grid-enterprise@36.2.0', cls: 'C', kind: 'procurement' },
        { spec: 'tldraw@5.4.2', cls: 'C', kind: 'procurement', red: /licence-key|Production/ },
        { spec: 'polotno@4.14.1', cls: 'C', kind: 'procurement', red: /60 days/ },
        { spec: 'handsontable@18.1.1', cls: 'C', kind: 'procurement' },
        { spec: 'gojs@4.0.4', cls: 'C', kind: 'procurement' },
        { spec: 'dockview-enterprise@8.3.1', cls: 'C', kind: 'procurement' },
        { spec: '@fullcalendar/resource-timeline@6.1.21', cls: 'C', kind: 'procurement' },
        { spec: '@pqina/pintura@8.100.4', cls: 'C', kind: 'procurement', red: /testing|watermark/ },
        { spec: '@bryntum/gantt@7.3.7', cls: 'D', red: /placeholder/ },
        { spec: 'bpmn-js@18.30.1', cls: 'C', kind: 'brand decision', red: /watermark/ },
        // Copyleft and file-level copyleft.
        { spec: 'swapy@1.0.5', cls: 'C', kind: 'copyleft' },
        { spec: 'dragselect@3.1.2', cls: 'C', kind: 'copyleft' },
        { spec: 'ckeditor5@48.5.2', cls: 'C', kind: 'copyleft' },
        { spec: '@imgly/background-removal@1.7.0', cls: 'C', kind: 'copyleft' },
        { spec: '@blocknote/core@0.55.0', cls: 'B', classified: /^MPL-2\.0$/, noRed: true },
        { spec: 'elkjs@0.12.0', cls: 'B', classified: /^EPL-2\.0$/, noRed: true },
        // Permissive, with the traps F1 lists (licence only in the repository root) and churn read from semver.
        { spec: '@excalidraw/excalidraw@0.18.1', cls: 'A', noRed: true },
        { spec: 'react-resizable-panels@4.14.1', cls: 'A', noRed: true },
        { spec: 'sonner@2.0.8', cls: 'A', noRed: true },
        { spec: 'embla-carousel-react@8.6.0', cls: 'A', noRed: true },
        { spec: 'lexical@0.52.0', cls: 'A', noRed: true, amber: /breaking \(0\.x minor\)/, noAmber: /releases in 12 months/, why: 'churn from breaking versions, not nightlies' },
        // Held-out packages at promotion, each a wrong verdict before its fix.
        { spec: '@mescius/spread-sheets@19.2.3', cls: 'C', kind: 'procurement', red: /third-party notices/, why: 'LICENSE covers bundled third-party code only; field "Commercial"; ships a PDF EULA (was A: "BSD-2-Clause + MIT")' },
        { spec: 'fusioncharts@4.2.2', cls: 'C', kind: 'procurement', red: /fusioncharts\.com\/buy/, why: 'field is a purchase page; LICENSE.md is Meta\'s MIT (was A)' },
        { spec: 'scichart@6.0.1', cls: 'C', kind: 'procurement', red: /scichart-eula/, why: 'field is its EULA; the MIT is the examples repository\'s (was A)' },
        { spec: '@mescius/wijmo@5.20261.52', cls: 'C', kind: 'procurement', red: /COMMERCIAL-LICENSE\.pdf/, why: 'a PDF licence named, not read as text (was "custom", read it)' },
        { spec: 'anychart@8.14.1', cls: 'C', kind: 'procurement', red: /anychart\.com\/buy/, why: 'LICENCE points at a purchase page (was "custom", read it)' },
        { spec: 'konva@10.7.0', cls: 'A', noRed: true, noAmber: /paid tier/, why: '"does not require a license key" is not a paid tier (was AMBER)' },
        // SPDX OR expressions in package.json are the licensee's choice (stage-2 skeptic: jszip and node-forge read C
        // copyleft from the file holding both texts, dompurify B).
        { spec: 'jszip@3.10.2', cls: 'A', classified: /^MIT \(your choice/, noRed: true, why: '(MIT OR GPL-3.0-or-later), both texts in one file (was C copyleft)' },
        { spec: 'node-forge@1.4.0', cls: 'A', classified: /^BSD-3-Clause \(your choice/, noRed: true, why: '(BSD-3-Clause OR GPL-2.0) (was C copyleft)' },
        { spec: 'dompurify@3.4.16', cls: 'A', classified: /^Apache-2\.0 \(your choice/, noRed: true, noAmber: /class B/, why: '(MPL-2.0 OR Apache-2.0), two licence files (was B)' },
        { spec: 'jsxgraph@1.13.3', cls: 'A', noRed: true, why: '(MIT OR LGPL-3.0-or-later) (was C copyleft)' },
        { spec: 'tablesorter@2.32.0', cls: 'A', noRed: true, amber: /only the package\.json field/, why: '(MIT OR GPL-2.0) and no licence text anywhere (was "custom", read it)' },
        // …but not when the file adds terms outside the expression: ckeditor4 4.22.1's file adds its LTS commercial terms.
        { spec: 'ckeditor4@4.22.1', cls: 'C', why: '(GPL-2.0 OR LGPL-2.1 OR MPL-1.1) beside commercial terms: left to a human' },
        // A package that does not exist.
        { spec: 's4-lab-no-such-package-2026@1.0.0', error: /404/ },
      ];
      const rows = [];
      for (const c of L) {
        let r;
        try { r = await check(c.spec, { tmp: path.join(tmp, 'libcheck'), withActivity: false }); } catch (e) { r = { error: 'crash: ' + e.message }; }
        const reds = (r.red || []).join('\n'), ambers = (r.amber || []).join('\n'), f = [];
        if (c.error) { if (!c.error.test(r.error || '')) f.push(`expected error ${c.error}, got ${r.error || 'none'}`); }
        else if (r.error) f.push(`error: ${r.error}`);
        else {
          if (c.cls && r.licenceClass.cls !== c.cls) f.push(`class ${r.licenceClass.cls}`);
          if (c.kind && r.licenceClass.kind !== c.kind) f.push(`kind ${r.licenceClass.kind}`);
          if (c.classified && !c.classified.test(r.licence.classified)) f.push(`classified "${r.licence.classified}"`);
          if (c.noRed && r.red.length) f.push(`RED: ${reds.slice(0, 160)}`);
          if (c.red && !c.red.test(reds)) f.push(`RED lacks ${c.red}`);
          if (c.noRed2 && c.noRed2.test(reds)) f.push(`RED quotes ${c.noRed2}`);
          if (c.amber && !c.amber.test(ambers)) f.push(`AMBER lacks ${c.amber}`);
          if (c.noAmber && c.noAmber.test(ambers)) f.push(`AMBER has ${c.noAmber}`);
        }
        rows.push([!f.length, `${c.spec}: ${c.error ? 'error ' + c.error : `class ${c.cls ?? 'any'}${c.kind ? ' ' + c.kind : ''}`}${c.why ? ` (${c.why})` : ''}${f.length ? ` — got ${f.join('; ')}` : ''}`]);
      }
      // Two versions of one package in one run (has the licence changed?) must each read only their own tarball. They
      // once shared a folder: 1.0.40 ships license.md, 2.0.0 LICENSE.md, and each read both (1.0.40: "AGPL-3.0 + MIT", C).
      const pair = path.join(tmp, 'libcheck-pair');
      const one = (s) => check(s, { tmp: pair, withActivity: false }).catch((e) => ({ error: 'crash: ' + e.message }));
      const seq = [];
      for (const s of ['ua-parser-js@1.0.40', 'ua-parser-js@2.0.0', 'ua-parser-js@1.0.40']) seq.push(await one(s));
      const par = await Promise.all(['ua-parser-js@2.0.0', 'ua-parser-js@1.0.40'].map(one));
      const v = (r) => (r.error ? 'error ' + r.error : `${r.licenceClass.cls} ${r.licence.classified} [${r.licence.file}]`);
      const mit = (r) => !r.error && r.licenceClass.cls === 'A' && r.licence.classified === 'MIT' && r.licence.file === 'license.md';
      const agpl = (r) => !r.error && r.licenceClass.cls === 'C' && r.licence.classified === 'AGPL-3.0' && r.licence.file === 'LICENSE.md';
      rows.push([mit(seq[0]) && agpl(seq[1]) && mit(seq[2]), `ua-parser-js 1.0.40, 2.0.0, 1.0.40 in one run, one after another: A MIT, C AGPL-3.0, A MIT, each from its own file (got ${seq.map(v).join('; ')})`]);
      rows.push([agpl(par[0]) && mit(par[1]), `…and 2.0.0 and 1.0.40 at the same time (got ${par.map(v).join('; ')})`]);
      return { rows, code: 0, out: '' };
    },
    check: ({ skipped, rows }) => (skipped ? [[true, 'skipped: offline (the npm registry or GitHub unreachable, or REGRESS_OFFLINE set)']] : rows) },
  { group: 'libcheck', name: 'libcheck.mjs: licence heuristics on quoted texts (offline)', run: async () => {
      const L = await import((await import('node:url')).pathToFileURL(path.join(scripts, 'libcheck.mjs')).href);
      const fs = await import('node:fs/promises');
      const pkg = async (name, files) => { const d = path.join(tmp, 'libcheck-dirs', name); await fs.mkdir(d, { recursive: true }); for (const [f, body] of Object.entries(files)) { await fs.mkdir(path.dirname(path.join(d, f)), { recursive: true }); await fs.writeFile(path.join(d, f), body); } return d; };
      const MIT = (who) => `MIT License\n\nCopyright (c) ${who}\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the "Software"), to deal\nin the Software without restriction, including without limitation the rights\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software.\n`;
      const TP = '\uFEFFThis document applies to the third party software included with this package. See SpreadJS-EULA.txt for SPREADJS full End User License Agreement.\n' + '-'.repeat(80) + '\nJSZip <https://stuk.github.io/jszip/>\n\n' + MIT('2009-2016 Stuart Knightley');
      const safe = (p) => p.then((r) => r, (e) => ({ crash: e.message }));
      const r = {
        // devextreme 26.1.5 ships a license/ folder of licence-key scripts: it crashed with EISDIR.
        folder: await safe(L.licenceFromDir(await pkg('folder', { 'license/devextreme-license.js': '// key check', 'package.json': JSON.stringify({ name: 'folder', license: 'SEE LICENSE IN README.md' }) }), null)),
        // @mescius/spread-sheets 19.2.3: third-party notices, a PDF EULA, field "Commercial".
        notices: await safe(L.licenceFromDir(await pkg('notices', { LICENSE: TP, 'SPREADJS-EULA.pdf': '%PDF-1.7\n%\u00e2\u00e3', 'package.json': JSON.stringify({ name: 'notices', license: 'Commercial' }) }), null)),
        // The same notices with an SPDX field: the field is the package's licence.
        noticesMit: await safe(L.licenceFromDir(await pkg('notices-mit', { LICENSE: TP, 'package.json': JSON.stringify({ name: 'notices-mit', license: 'MIT' }) }), null)),
        // fusioncharts 4.2.2: Meta's MIT LICENSE.md, field a purchase page.
        copied: await safe(L.licenceFromDir(await pkg('copied', { 'LICENSE.md': MIT('Meta Platforms, Inc. and affiliates.'), 'package.json': JSON.stringify({ name: 'copied', license: 'http://www.fusioncharts.com/buy/' }) }), null)),
        // An ordinary MIT package pointing its field at the file: unchanged.
        plain: await safe(L.licenceFromDir(await pkg('plain', { LICENSE: MIT('2024 Someone'), 'package.json': JSON.stringify({ name: 'plain', license: 'SEE LICENSE IN LICENSE' }) }), null)),
        tpPlain: L.thirdPartyOnly(MIT('2024 Someone')), tpHeading: L.thirdPartyOnly('# Third-party notices\n\nThis package bundles …'),
        // SPDX OR expressions: the licensee's choice, when the file agrees with the expression.
        dual: await safe(L.licenceFromDir(await pkg('dual', { 'LICENSE.markdown': 'JSZip is dual licensed. At your choice you may use it under the MIT license *or* GPLv3 license.\n\n' + MIT('2009-2016 Stuart Knightley') + '\n\nGNU GENERAL PUBLIC LICENSE\n   Version 3, 29 June 2007\n', 'package.json': JSON.stringify({ name: 'dual', license: '(MIT OR GPL-3.0-or-later)' }) }), null)),
        dualTwo: await safe(L.licenceFromDir(await pkg('dual-two', { LICENSE: 'Apache License\nVersion 2.0, January 2004\nhttp://www.apache.org/licenses/', 'LICENSE-MPL': 'Mozilla Public License Version 2.0\n==================================\n', 'package.json': JSON.stringify({ name: 'dual-two', license: '(MPL-2.0 OR Apache-2.0)' }) }), null)),
        dualOutside: await safe(L.licenceFromDir(await pkg('dual-outside', { LICENSE: MIT('2024 Someone') + '\n\nGNU AFFERO GENERAL PUBLIC LICENSE\nVersion 3, 19 November 2007\n', 'package.json': JSON.stringify({ name: 'dual-outside', license: '(MIT OR GPL-3.0)' }) }), null)),
        dualCommercial: await safe(L.licenceFromDir(await pkg('dual-commercial', { 'LICENSE.md': 'Software License Agreement\n\nLicensed under the terms of any of the following licenses at your choice: GNU General Public License Version 2 or later (the "GPL"). [Contact us](https://example.com/contact/) to obtain a commercial license.\n', 'package.json': JSON.stringify({ name: 'dual-commercial', license: '(GPL-2.0 OR LGPL-2.1 OR MPL-1.1)' }) }), null)),
        dualGplText: await safe(L.licenceFromDir(await pkg('dual-gpl-text', { COPYING: 'GNU GENERAL PUBLIC LICENSE\n   Version 2, June 1991\n', 'package.json': JSON.stringify({ name: 'dual-gpl-text', license: '(MIT OR GPL-2.0)' }) }), null)),
        dualField: await safe(L.licenceFromDir(await pkg('dual-field', { 'package.json': JSON.stringify({ name: 'dual-field', license: '(MIT OR GPL-2.0)' }) }), null)),
        andField: await safe(L.licenceFromDir(await pkg('and-field', { LICENSE: MIT('2024 Someone') + '\n\nGNU GENERAL PUBLIC LICENSE\n   Version 3, 29 June 2007\n', 'package.json': JSON.stringify({ name: 'and-field', license: '(MIT AND GPL-3.0)' }) }), null)),
        // Each check unpacks into a folder of its own (two versions of one package once shared one).
        dirs: await (async () => { try { const d = path.join(tmp, 'libcheck-wd'), a = await L.workDir(d, 'pack-ua-parser-js'); await fs.writeFile(path.join(a, 'license.md'), 'x'); const b = await L.workDir(d, 'pack-ua-parser-js'); return { a, b, emptyB: (await fs.readdir(b)).length === 0 }; } catch (e) { return { crash: e.message }; } })(),
        exprs: (() => { try { return ['(MIT AND Zlib)', 'Dual licensed under the MIT or GPL Version 2 licenses.', 'MIT', '((MIT OR X) AND Y)'].map(L.spdxChoice); } catch (e) { return ['crash: ' + e.message]; } })(),
        best: (() => { try { return ['(GPL-2.0 OR LGPL-2.1 OR MPL-1.1)', 'GPL-2.0 WITH Classpath-exception-2.0 OR MIT', '(MIT OR Apache-2.0)'].map((f) => L.bestChoice(L.spdxChoice(f))).map((b) => `${b.id} ${b.lc.cls}`); } catch (e) { return ['crash: ' + e.message]; } })(),
      };
      return { r, L, code: 0, out: '' };
    },
    check: ({ r, L }) => {
      const cls = (x) => (x.crash ? `crash ${x.crash}` : `${L.licenceClass(x).cls}${L.licenceClass(x).kind ? ' ' + L.licenceClass(x).kind : ''}`);
      return [
        [!r.folder.crash && L.licenceClass(r.folder).cls !== 'A', `a licence folder is skipped, not read as a file (devextreme crashed with EISDIR): ${cls(r.folder)}`],
        [cls(r.notices) === 'C procurement' && /third-party notices/.test(r.notices.evidence?.join(' ')) && /SPREADJS-EULA\.pdf/.test(r.notices.evidence?.join(' ')), `third-party notices + PDF EULA + field "Commercial" → C procurement, both quoted: ${cls(r.notices)}`],
        [cls(r.noticesMit) === 'A' && r.noticesMit.fieldOnly === true, `third-party notices + field "MIT" → A from the field, marked field-only: ${cls(r.noticesMit)}`],
        [cls(r.copied) === 'C procurement' && /Meta Platforms/.test(r.copied.evidence?.join(' ')), `permissive file + field naming a purchase page → C procurement, copyright holder quoted: ${cls(r.copied)}`],
        [cls(r.plain) === 'A' && !r.plain.conflict, `MIT file + "SEE LICENSE IN LICENSE" stays A: ${cls(r.plain)}`],
        [!!L.readmeProcurement('## Licensing WebViewer will run in trial mode until a license is provided. For more information on licensing, please visit our website.'), 'a README saying the build runs in trial mode → procurement (@pdftron/webviewer 12.1.0; its 183 MB tarball is not fetched here)'],
        [!L.readmeCommercial('Konva is MIT licensed and does not require a license key.') && !!L.readmeCommercial('`ag-grid-enterprise` is available under a commercial license and comes with advanced features.'), 'a sentence denying a licence key is not a paid tier; one stating a commercial licence is'],
        [['Commercial', 'UNLICENSED', 'http://www.fusioncharts.com/buy/', 'SEE LICENSE IN <http://www.anychart.com/buy>', 'https://www.scichart.com/scichart-eula'].every(L.restrictiveField) && !['MIT', 'SEE LICENSE IN LICENSE.md', "Standard 'no charge' license: https://gsap.com/standard-license.", 'Apache-2.0 OR MIT'].some(L.restrictiveField), 'which package.json fields name commercial terms'],
        [r.tpPlain === null && r.tpHeading !== null, 'third-party notices are recognised by their opening, an ordinary MIT file is not'],
        [cls(r.dual) === 'A' && /^MIT \(your choice: package\.json \(MIT OR GPL-3\.0-or-later\)/.test(r.dual.classified) && /MIT, chosen from MIT OR GPL-3\.0-or-later/.test(L.licenceClass(r.dual).why), `field (MIT OR GPL-3.0-or-later), both texts in one file → A, MIT chosen (was C copyleft): ${cls(r.dual)} ${r.dual.classified}`],
        [cls(r.dualTwo) === 'A' && r.dualTwo.chosen === 'Apache-2.0', `field (MPL-2.0 OR Apache-2.0), one file each → A, Apache-2.0 chosen (was B): ${cls(r.dualTwo)}`],
        [cls(r.dualOutside) === 'C copyleft' && !r.dualOutside.choice, `a file naming a licence outside the expression (AGPL beside (MIT OR GPL-3.0)) is not a choice: ${cls(r.dualOutside)}`],
        [L.licenceClass(r.dualCommercial).cls === 'C' && !r.dualCommercial.choice, `a file adding commercial terms (ckeditor4 4.22.1) is not a choice: ${cls(r.dualCommercial)}`],
        [cls(r.dualGplText) === 'A' && r.dualGplText.choiceTextMissing && L.flagsFor({ reg: { licenseField: '(MIT OR GPL-2.0)' }, lic: r.dualGplText }).amber.some((x) => /no MIT text/.test(x)), `field (MIT OR GPL-2.0) with only the GPL text shipped → A, with an AMBER that the MIT text is missing: ${cls(r.dualGplText)}`],
        [cls(r.dualField) === 'A' && r.dualField.fieldOnly && r.dualField.chosen === 'MIT', `no licence text, field (MIT OR GPL-2.0) → A from the field, field-only (was "custom", read it): ${cls(r.dualField)}`],
        [cls(r.andField) === 'C copyleft' && !r.andField.choice, `an AND expression is not a choice: (MIT AND GPL-3.0) stays C: ${cls(r.andField)}`],
        [!r.dirs.crash && r.dirs.a !== r.dirs.b && r.dirs.emptyB, `each check gets an empty folder of its own, even for the same package name (${r.dirs.crash || 'ok'})`],
        [r.exprs.every((x) => x === null) && r.best.join() === 'MPL-1.1 B,MIT A,MIT A', `AND, prose, a single id and nested expressions are not choices; the best alternative is picked (got ${r.best.join(', ')})`],
      ];
    } },
  { group: 'libcheck', name: 'libcheck.mjs CLI: the report, --size --entry, --json, --search, packages it cannot check (network; skipped offline)', async run() {
      const online = await reachable();
      if (!online) { this.name += ' — skipped: offline'; return { skipped: true, code: 0, out: '' }; }
      const text = await run('libcheck.mjs', ['sonner@2.0.8', '--size', '--entry', "export { toast } from 'sonner';"]);
      const json = await run('libcheck.mjs', ['vaul@1.1.2', 'konva@10.7.0', '--json']);
      const search = await run('libcheck.mjs', ['--search', 'resizable panels', '--size-limit', '5']);
      const missing = await run('libcheck.mjs', ['s4-lab-no-such-package-2026', 'sonner@99.0.0']);
      let parsed = null; try { parsed = JSON.parse(json.out); } catch { /* checked below */ }
      return { text, json, parsed, search, missing, code: 0, out: '' };
    },
    check: ({ skipped, text, json, parsed, search, missing }) => (skipped ? [[true, 'skipped: offline (the npm registry or GitHub unreachable, or REGRESS_OFFLINE set)']] : [
      [text.code === 0 && /^sonner@2\.0\.8 {2}\(latest \S+, \d{4}-\d\d-\d\d; 12 months: \d+ stable \+ \d+ pre-releases, \d+ breaking-by-semver; \d+ deps/m.test(text.out), `the report's first line: version, stable and pre-release counts, breaking versions (exit ${text.code})`],
      [/^ {2}licence {3}class A: MIT {2}\[package: LICENSE\.md\]/m.test(text.out) && /^ {2}activity {2}emilkowalski\/sonner: \d+ human commits \/ 12 months, \d+ authors, top .+ \d+%, last commit \d{4}/m.test(text.out) && /^ {2}adoption {2}[\d,]+ downloads\/week/m.test(text.out), 'licence class, activity (bus factor) and adoption lines'],
      [/^ {2}size {6}initial [\d.]+ KB gz · all JS [\d.]+ KB · CSS [\d.]+ KB · assets [\d.]+ KB · \d+ packages?$/m.test(text.out), '--size --entry builds the realistic import'],
      [/\(triage, not a verdict/.test(text.out), 'every report ends with the triage reminder'],
      [json.code === 0 && Array.isArray(parsed) && parsed.map((x) => x.name).join() === 'vaul,konva' && parsed.every((x) => x.licenceClass?.cls && Array.isArray(x.red) && Array.isArray(x.amber) && Number.isInteger(x.registry?.stableReleases12m) && !('hasVersion' in x.registry)), '--json: one object per package, in the order given'],
      [/README: .*unmaintained/i.test(parsed?.[0]?.red?.join(' ') || '') && json.code === 0, 'a RED flag never changes the exit code (vaul is RED, exit 0)'],
      [search.code === 0 && (search.out.match(/^ +\d+\/wk {2}\d{4}-\d\d-\d\d {2}\S+@\S+ {2}— /gm) || []).length >= 1 && search.out.trim().split('\n').length <= 5, '--search: names with weekly downloads and last publish date, at most --size-limit rows'],
      [missing.code === 1 && /s4-lab-no-such-package-2026: HTTP 404 \(no such package on npm\)/.test(missing.out) && /sonner: no version 99\.0\.0 on npm \(latest /.test(missing.out), `a missing package or version is reported by name and exits 1 (exit ${missing.code})`],
    ]) },
  { group: 'templates', name: 'templates/code/governor.js: its state machine on synthetic frame times (Node, deterministic)', run: async () => {
      const { createGovernor } = await import((await import('node:url')).pathToFileURL(path.join(root, 'skills/website-redesign/templates/code/governor.js')).href);
      // Feed intervals (ms) from t = 1000; 'pause' calls pause(); a function of t gives a time-varying stream.
      const feed = (opts, step, untilMs = 31000) => {
        const floors = [], stats = [];
        const g = createGovernor({ ...opts, onChange: (l, w, s) => stats.push(s), onFloor: (w, s) => floors.push(s) });
        const warn = console.warn; let warned = 0; console.warn = () => { warned++; };
        try { for (let t = 1000, i = 0; t < 1000 + untilMs; i++) { const d = step(t - 1000, i); if (d === 'pause') { g.pause(); continue; } t += d; g.frame(t); } } finally { console.warn = warn; }
        return { level: g.level, floors: floors.length, floorAt: g.log.find((e) => e.floor)?.t - 1000, downs: g.log.filter((e) => e.to > e.from).map((e) => e.t - 1000), ups: g.log.filter((e) => e.to < e.from).map((e) => e.t - 1000), warned, stats, refresh: g.refresh };
      };
      const burst = (x, i) => [650, 16.7, 16.7, 'pause'][i % 4];
      return {
        r: {
          smooth: feed({}, () => 16.7),
          sub4fps: feed({}, () => 300),
          v1: feed({ gapsArePauses: true }, () => 300),
          thirty: feed({}, () => 33.3),
          hz30: feed({ refreshMs: 33.3 }, () => 33.3),
          onDemand: feed({}, burst),
          misuse: feed({}, (x, i) => [650, 16.7, 16.7][i % 3]),
          // 50 ms frames for 6 s, then 16.7 ms: steps down, then back up only after the 30 s memory
          recover: feed({}, (x) => (x < 6000 ? 50 : 16.7), 60000),
          onlyDown: feed({ stepUp: false }, (x) => (x < 6000 ? 50 : 16.7), 60000),
          // a 120 Hz display measured before the scene: 12 ms frames are slow there
          hz120: feed({ refreshMs: 8.33 }, () => 12),
        },
        code: 0, out: '',
      };
    },
    check: ({ r }) => [
      [r.smooth.downs.length === 0 && r.smooth.floors === 0, `60 fps on 60 Hz: no change (got ${r.smooth.downs.length} step-downs)`],
      [r.sub4fps.level === 3 && r.sub4fps.floors === 1 && r.sub4fps.downs[0] < 3000 && r.sub4fps.floorAt > 9000 && r.sub4fps.floorAt < 11000, `300 ms frames (< 4 fps): first step-down < 3 s, lowest level, onFloor once at ~9.9 s (got downs ${r.sub4fps.downs}, floor ${r.sub4fps.floorAt})`],
      [r.v1.downs.length === 0, 'gapsArePauses: true (governor v1) never judges 300 ms frames: the documented blind spot'],
      [r.thirty.level === 3 && r.thirty.floors === 0, `a 30 fps scene on a 60 Hz budget: lowest level, keeps running (got level ${r.thirty.level}, ${r.thirty.floors} floor)`],
      [r.hz30.downs.length === 0 && Math.abs(r.hz30.refresh - 33.3) < 0.1, 'a 30 Hz display with the refresh measured before the scene: no change, budget stays 33.3 ms'],
      [r.onDemand.downs.length === 0 && r.onDemand.warned === 0, `on-demand bursts that call pause(): no change, no warning (got ${r.onDemand.downs.length})`],
      [r.misuse.downs.length >= 1 && r.misuse.warned === 1, `the same bursts without pause(): false step-downs and one console warning (got ${r.misuse.downs.length}, warned ${r.misuse.warned})`],
      [r.recover.downs.length >= 1 && r.recover.ups.length >= 1 && r.recover.ups[0] - r.recover.downs.at(-1) >= 30000, `recovery: back up only ≥ 30 s after the last step-down (got down ${r.recover.downs}, up ${r.recover.ups})`],
      [r.onlyDown.downs.length >= 1 && r.onlyDown.ups.length === 0, 'stepUp: false (hero-effect.js) never steps back up'],
      [r.hz120.downs.length >= 1, `a 120 Hz budget judges 12 ms frames as slow (got ${r.hz120.downs.length} step-downs)`],
      [r.sub4fps.stats.length === 3 && r.sub4fps.stats.every((s) => s.p50 === 300 && s.mean === 300 && s.budget > 16 && s.budget < 17 && s.n >= 2), 'onChange receives the deciding window: { n, p50, p90, p95, mean, budget }'],
    ] },
  { group: 'templates', name: 'templates/code/tier.js + governor.js on a page under CDP CPU throttling', run: async () => {
      const { launch } = await import((await import('node:url')).pathToFileURL(path.join(scripts, 'lib/env.mjs')).href);
      const { browser } = await launch();
      const open = async (qs = '') => {
        const ctx = await browser.newContext({ viewport: { width: 800, height: 600 } });
        const page = await ctx.newPage();
        const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
        await page.goto(`${fx}/promote-governor.html${qs}`);
        await page.waitForFunction(() => window.__g?.ready, null, { timeout: 20000 });
        return { ctx, page, errs, cdp: await ctx.newCDPSession(page) };
      };
      try {
        // A loop doing 12 ms of work per frame at 1× (divided by 4 per level), throttled to 6× once it is ready. CDP's
        // throttler often delivers less than asked (S11: within ±30 % in about two runs of three), so the work keeps a
        // margin: it misses the frame even if 6× delivers only 2×.
        const a = await open();
        await a.cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
        await a.page.evaluate(() => window.__g.start(12));
        await a.page.waitForTimeout(9000);
        const loop = await a.page.evaluate(() => ({ changes: window.__g.changes, floor: window.__g.floor, level: window.__g.level, frames: window.__g.frames, refresh: window.__g.refreshMs }));
        await a.ctx.close();
        // The probe: 6 ms of work per frame at 1× (0.36 of the frame: average) is 36 ms at 6×, and still over the 0.6 ×
        // refresh edge if the throttler delivers only 2×.
        const b = await open();
        await b.cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
        const heavy = await b.page.evaluate(() => window.__g.detect(6));
        await b.ctx.close();
        const once = async (qs, fn, arg) => { const x = await open(qs); try { return await x.page.evaluate(fn, arg); } finally { await x.ctx.close(); } };
        const forced = await once('?tier=low', (ms) => window.__g.detect(ms), 3);
        const bogus = await once('?tier=ultra', async (ms) => (await window.__g.detect(ms)).why, 0.1);
        // A page whose own scene takes 300 ms a frame (~3 fps, like a weak GPU): too few frames, stopped on the wall clock.
        const c = await open('?block=300');
        const w0 = Date.now();
        const slow = await c.page.evaluate(() => window.__g.detect(1));
        slow.wall = Date.now() - w0;
        return { loop, heavy, forced, bogus, slow, errs: [...a.errs, ...b.errs, ...c.errs], code: 0, out: '' };
      } finally { await browser.close(); }
    },
    check: ({ loop, heavy, forced, bogus, slow, errs }) => [
      [loop.changes.length >= 1 && loop.changes[0].t < 4500, `governor: 12 ms of work at CPU 6× steps down within 4.5 s of the start (got ${JSON.stringify(loop.changes)})`],
      [loop.floor == null && loop.level >= 1, `…and keeps running once the work fits a lower level, no onFloor (level ${loop.level}, floor ${loop.floor})`],
      [heavy.capability === 'low' && heavy.probe.kept >= 24, `detectTier: 6 ms of work at 1× probed at CPU 6× is "low", from ≥ 24 frames (got ${heavy.capability}: ${heavy.why})`],
      [forced.capability === 'low' && forced.why === 'forced by ?tier' && typeof forced.refreshMs === 'number', `?tier=low forces the answer and still returns refreshMs (got ${forced.capability})`],
      [!/forced/.test(bogus), '?tier=ultra is not a tier: ignored'],
      [slow.capability === 'undetermined' && slow.refreshUncertain && slow.wall < 5000, `a scene at ~3 fps: undetermined, refresh not trusted, in ${slow.wall} ms (got ${slow.capability}; cap: refresh ≤ 0.8 s + probe ≤ 1.55 s + one 300 ms frame each)`],
      [errs.length === 0, `no page errors (${errs.join('; ').slice(0, 200)})`],
    ] },
  { group: 'templates', name: 'templates/code/hero-effect.js: poster first, fence, pauses, reduced motion, context loss, governor', run: async () => {
      const { launch } = await import((await import('node:url')).pathToFileURL(path.join(scripts, 'lib/env.mjs')).href);
      const { browser } = await launch();
      const errs = [];
      const open = async (qs = '', o = {}) => {
        const ctx = await browser.newContext({ viewport: { width: 600, height: 400 }, deviceScaleFactor: 3, ...o });
        const page = await ctx.newPage();
        const requests = [];
        page.on('request', (r) => requests.push(r.url()));
        page.on('pageerror', (e) => errs.push(String(e)));
        await page.goto(`${fx}/promote-hero.html${qs}`);
        return { ctx, page, requests };
      };
      const st = (p) => p.evaluate(() => ({ ...(window.__hero?.state || {}), frames: window.__t.frames, fence: window.__t.fence, fallback: window.__t.fallback ?? null, err: window.__t.err, imported: window.__t.imported, label: document.querySelector('.bg-toggle').textContent, toggleHidden: document.querySelector('.bg-toggle').hidden, pressed: document.querySelector('.bg-toggle').getAttribute('aria-pressed'), canvases: document.querySelectorAll('canvas.fx').length, opacity: document.querySelector('canvas.fx')?.style.opacity ?? null, hidden: document.querySelector('canvas.fx')?.getAttribute('aria-hidden') ?? null, cssW: document.querySelector('.hero-bg').clientWidth }));
      const revealed = (p) => p.waitForFunction(() => window.__hero?.state.revealed, null, { timeout: 20000 }).then(() => true, () => false);
      const frames = (p) => p.evaluate(() => window.__t.frames);
      const still = async (p) => { const a = await frames(p); await p.waitForTimeout(1000); return (await frames(p)) - a; };   // frames drawn in 1 s
      try {
        const r = {};
        const a = await open();
        r.revealed = await revealed(a.page);
        r.first = await st(a.page);
        r.runningFrames = await still(a.page);
        await a.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await a.page.waitForTimeout(300);
        r.offscreen = { ...(await st(a.page)), moved: await still(a.page) };
        await a.page.evaluate(() => window.scrollTo(0, 0));
        await a.page.waitForTimeout(300);
        r.back = { ...(await st(a.page)), moved: await still(a.page) };
        await a.page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
        await a.page.waitForTimeout(200);
        r.hidden = { ...(await st(a.page)), moved: await still(a.page) };
        await a.page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
        await a.page.waitForTimeout(200);
        await a.page.click('.bg-toggle');
        await a.page.waitForTimeout(200);
        r.paused = { ...(await st(a.page)), moved: await still(a.page) };
        await a.page.click('.bg-toggle');
        await a.page.waitForTimeout(200);
        r.playing = { ...(await st(a.page)), moved: await still(a.page) };
        // Context loss, then restore: poster during the loss, a fresh canvas after it.
        await a.page.evaluate(() => { window.__ext = window.__gl.getExtension('WEBGL_lose_context'); window.__oldCanvas = document.querySelector('canvas.fx'); window.__ext.loseContext(); });
        await a.page.waitForTimeout(300);
        r.lost = { ...(await st(a.page)), moved: await still(a.page) };
        await a.page.evaluate(() => window.__ext.restoreContext());
        r.restoredRevealed = await revealed(a.page);
        await a.page.waitForTimeout(300);
        r.restored = { ...(await st(a.page)), moved: await still(a.page), fresh: await a.page.evaluate(() => document.querySelector('canvas.fx') !== window.__oldCanvas && document.contains(document.querySelector('canvas.fx'))) };
        await a.ctx.close();   // each page closed when done: a running hero elsewhere would load the timing checks
        // Reduced motion: never imported until the visitor presses Play.
        const b = await open('', { reducedMotion: 'reduce' });
        await b.page.waitForTimeout(1500);
        r.reduced = { ...(await st(b.page)), requested: b.requests.some((u) => /hero-effect\.js/.test(u)) };
        await b.page.click('.bg-toggle');
        r.reducedPlayRevealed = await revealed(b.page);
        await b.page.waitForTimeout(300);
        r.reducedPlay = { ...(await st(b.page)), moved: await still(b.page) };
        await b.ctx.close();
        // An effect that fewer pixels cannot speed up (70 ms of CPU per frame, 13 ms short of the next vsync, on a buffer
        // small enough that fill costs next to nothing even in SwiftShader): the halving is undone, then the poster.
        const c = await open('?slow=70', { viewport: { width: 400, height: 300 }, deviceScaleFactor: 1 });
        await c.page.waitForFunction(() => window.__hero?.state.failed || window.__t.err, null, { timeout: 30000 }).catch(() => {});
        await c.page.waitForTimeout(1000);   // the canvas fades out (0.6 s) before it is removed
        r.slow = await st(c.page);
        await c.ctx.close();
        const d = await open('?fail');
        await d.page.waitForTimeout(1500);
        r.fail = await st(d.page);
        await d.ctx.close();
        const e = await open('?gl1');
        r.gl1Revealed = await revealed(e.page);
        r.gl1 = { ...(await st(e.page)), moved: await still(e.page) };
        await e.ctx.close();
        const f = await open('?settle=2');
        await revealed(f.page);
        await f.page.waitForTimeout(3000);
        r.settled = { ...(await st(f.page)), moved: await still(f.page) };
        await f.page.click('.bg-toggle');
        await f.page.waitForTimeout(200);
        r.replay = { ...(await st(f.page)), moved: await still(f.page) };
        return { r, errs, code: 0, out: '' };
      } finally { await browser.close(); }
    },
    check: ({ r, errs }) => [
      [r.revealed && r.first.fence.calls >= 1 && r.first.fence.signaledAtLast === true && r.first.opacity === '1', `the canvas fades in only after the WebGL2 fence signalled (fence read ${r.first.fence.calls}×, last ${r.first.fence.signaledAtLast})`],
      [r.first.hidden === 'true' && r.first.label === 'Pause background animation' && r.first.pressed === null && !r.first.toggleHidden, 'aria-hidden canvas; a visible "Pause background animation" button with no aria-pressed'],
      [r.first.canvas?.[0] === r.first.cssW * 2, `pixel ratio capped at 2 on a 3× screen (buffer ${r.first.canvas?.[0]} for ${r.first.cssW} CSS px)`],
      [r.runningFrames >= 2, `renders while on screen (${r.runningFrames} frames in 1 s)`],
      [r.offscreen.moved === 0 && !r.offscreen.running && r.back.moved >= 2, `off-screen: no frames (${r.offscreen.moved}); back on screen: running (${r.back.moved})`],
      [r.hidden.moved === 0 && !r.hidden.running, `hidden tab: no frames (${r.hidden.moved})`],
      [r.paused.moved === 0 && r.paused.label === 'Play background animation' && r.playing.moved >= 2 && r.playing.label === 'Pause background animation', 'the button pauses and plays, its label saying what it will do'],
      [r.lost.lost && r.lost.moved === 0 && r.lost.opacity === '0', 'context lost: the loop stops and the poster shows'],
      [r.restoredRevealed && r.restored.fresh && r.restored.moved >= 2 && r.restored.canvases === 1, 'context restored: rebuilt on a fresh canvas, revealed after the fence, running'],
      [!r.reduced.requested && !r.reduced.imported && r.reduced.label === 'Play background animation' && !r.reduced.toggleHidden, 'reduced motion: hero-effect.js is never requested; the poster and a "Play background animation" button'],
      [r.reducedPlayRevealed && r.reducedPlay.moved >= 2 && r.reducedPlay.label === 'Pause background animation', 'pressing Play under reduced motion loads and runs it (the opt-in)'],
      [r.slow.failed && /^governor/.test(r.slow.why) && r.slow.scale === 1 && r.slow.canvases === 0 && r.slow.toggleHidden && r.slow.fallback, `70 ms of CPU per frame: the resolution halving is undone (scale ${r.slow.scale}), then the poster (${r.slow.why?.slice(0, 80)})`],
      [r.fail.failed && r.fail.canvases === 0 && r.fail.toggleHidden && /on purpose/.test(r.fail.why), 'init throws: the poster stays, no canvas, no button'],
      [r.gl1Revealed && r.gl1.fence.calls === 0 && r.gl1.moved >= 2, `WebGL1 (no fence): revealed on the next frame and running (${r.gl1.moved} frames in 1 s)`],
      [r.settled.settled && r.settled.moved === 0 && r.settled.label === 'Play background animation' && r.replay.moved >= 2, `settle=2: motion stops by itself, the button offers Play, and Play replays (${r.replay.moved} frames)`],
      [errs.length === 0, `no page errors (${errs.join('; ').slice(0, 200)})`],
    ] },
  { group: 'templates', name: 'templates/code/hero-effect.js: a new render scale or box size never paints a cleared canvas, and costs no extra draw', run: async () => {
      // Resizing a canvas clears its buffer. The fixture records every animation frame that ends with the buffer resized
      // after its last draw while the canvas shows (the frame is painted blank: black for WebGL with alpha: false, the
      // poster for 2D), and the most draws in one frame. Stage-2 skeptic: the promoted file painted one blank frame at
      // every governor step-down (webgl px 0,0,0,255; 2d 0,0,0,0); the lab rule it replaced drew twice in that frame.
      const { launch } = await import((await import('node:url')).pathToFileURL(path.join(scripts, 'lib/env.mjs')).href);
      const { browser } = await launch();
      const errs = [];
      const open = async (qs) => {
        const ctx = await browser.newContext({ viewport: { width: 800, height: 600 }, deviceScaleFactor: 1 });
        const page = await ctx.newPage();
        page.on('pageerror', (e) => errs.push(String(e)));
        await page.goto(`${fx}/promote-hero-paint.html${qs}`);
        await page.waitForFunction(() => window.__hero?.state.revealed, null, { timeout: 20000 });
        return { ctx, page };
      };
      const w = (p) => p.evaluate(() => ({ ...window.__w, state: window.__hero.state }));
      try {
        const r = {};
        // A fill-bound effect (0.12 µs of work per pixel: ~58 ms a frame at 800×600): the governor halves the scale.
        for (const kind of ['webgl', '2d']) {
          const a = await open(`?kind=${kind}`);
          await a.page.waitForFunction(() => window.__w.resizes >= 2 && window.__w.frames > window.__w.resizes + 30, null, { timeout: 20000 }).catch(() => {});
          r[kind] = await w(a.page);
          await a.ctx.close();
        }
        // What the visitor sees: pause in the frame that applied the new scale, then read the screen.
        const f = await open('?kind=webgl&freeze');
        await f.page.waitForFunction(() => window.__w.froze, null, { timeout: 20000 }).catch(() => {});
        await f.page.waitForTimeout(300);
        const shot = await f.page.screenshot({ clip: { x: 390, y: 290, width: 20, height: 20 } });
        r.screen = await f.page.evaluate(async (b64) => { const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode(); const c = document.createElement('canvas'); c.width = c.height = 20; const g = c.getContext('2d'); g.drawImage(img, 0, 0); return [...g.getImageData(10, 10, 1, 1).data].slice(0, 3); }, shot.toString('base64'));
        r.froze = (await w(f.page)).froze;
        await f.ctx.close();
        // The box resized (a window resize): while running, and while paused.
        const g = await open('?kind=webgl&ro&perpx=0.00001');
        await g.page.waitForFunction(() => window.__hero.state.running, null, { timeout: 20000 });
        await g.page.waitForTimeout(300);
        await g.page.setViewportSize({ width: 700, height: 500 });
        await g.page.waitForTimeout(400);
        r.roRunning = await w(g.page);
        await g.page.evaluate(() => window.__hero.pause());
        await g.page.setViewportSize({ width: 640, height: 480 });
        await g.page.waitForTimeout(400);
        r.roPaused = await w(g.page);
        await g.ctx.close();
        return { r, errs, code: 0, out: '' };
      } finally { await browser.close(); }
    },
    check: ({ r, errs }) => {
      const cleared = (px) => !px || (px[0] === 0 && px[1] === 0 && px[2] === 0);
      const scaled = (x) => `scale ${x.state.scale}, ${x.resizes - 1} resize(s), ${x.frames} frames`;
      return [
        ...['webgl', '2d'].map((k) => [r[k].resizes >= 2 && r[k].state.scale < 1 && r[k].blank.length === 0 && r[k].maxDraws === 1, `${k}: the governor's halving is applied at the start of a frame, before its draw: no frame painted cleared, one draw per frame (${scaled(r[k])}; cleared ${JSON.stringify(r[k].blank)}; most draws in a frame ${r[k].maxDraws})`]),
        [r.froze && !(r.screen[0] < 12 && r.screen[1] < 12 && r.screen[2] < 12) && !(r.screen[0] === 10 && r.screen[1] === 52 && r.screen[2] === 64), `on screen after that frame: the effect, not black or the poster (rgb ${r.screen})`],
        [r.roRunning.ro.length >= 1 && r.roRunning.ro.every((x) => x.running && !cleared(x.px)) && r.roRunning.blank.length === 0 && r.roRunning.state.canvas[0] === 700, `a window resize while running: the new size waits for the next frame's draw (buffer at paint ${JSON.stringify(r.roRunning.ro.map((x) => x.px))}, then ${r.roRunning.state.canvas})`],
        [r.roPaused.ro.length > r.roRunning.ro.length && r.roPaused.ro.slice(r.roRunning.ro.length).every((x) => !x.running && !cleared(x.px) && x.size[0] === 640) && r.roPaused.state.canvas[0] === 640, `a window resize while paused: resized and redrawn at once (${JSON.stringify(r.roPaused.ro.slice(r.roRunning.ro.length))})`],
        [errs.length === 0, `no page errors (${errs.join('; ').slice(0, 200)})`],
      ];
    } },
  { group: 'motion', name: 'motion.mjs --spec: a ticker whose screen text is CSS generated content, and that still counts under reduced motion (motion-ticker)', run: async () => {
      const r = await run('motion.mjs', [`${fx}/motion-ticker.html`, '--spec', path.join(root, 'tools/regress/fixtures/motion-ticker.json'), '--filmstrip', 'none', '--out', `${tmp}/motion-ticker`]);
      return { ...r, md: await readFile(`${tmp}/motion-ticker/motion.md`, 'utf8').catch(() => '') };
    },
    check: ({ code, out, md }) => [
      [code === 1 && /spec 0\/1 pass/.test(out), `a failing spec entry exits 1 (exit ${code})`],
      [/✗ ticker — text on screen "01000" is not the DOM text "0" when it settles/.test(out), 'the counter() the eye reads ("01000") is not the DOM text ("0")'],
      [/\| ticker \| click \| animates \| 800ms \(spec 800\) \|/.test(md), 'the 800 ms transition of --n is read from its Animation object'],
      [/instant → still animates/.test(md), 'reduced motion: still animates, where the spec says instant'],
      [/\*\*no-reduced-motion\*\* \(1\)/.test(md) && /\*\*off-token\*\* \(1\): `#ticker`/.test(md), 'the audit flags no reduced-motion handling and the off-token 800 ms'],
    ] },
  { group: 'sweep', name: 'sweep.mjs: every seeded width-dependent defect found in its band (sweep-lab, truth.json)', run: async () => {
      const r = await run('sweep.mjs', ['--url', `${fx}/sweep-lab/`, '--out', `${tmp}/sweep-lab`]);
      const f = `${tmp}/sweep-lab/tools-regress-fixtures-sweep-lab.json`;
      return { ...r, json: JSON.parse(await readFile(f, 'utf8').catch(() => '{}')), truth: JSON.parse(await readFile(path.join(root, 'tools/regress/fixtures/sweep-lab/truth.json'), 'utf8')), sheet: existsSync(`${tmp}/sweep-lab/tools-regress-fixtures-sweep-lab-sheet.jpg`) };
    },
    check: ({ code, json, truth, sheet }) => {
      // The S7 lab's rule: a seeded defect is found when a range with its check, on a selector matching `sel`, overlaps its band.
      const num = (w) => Number(String(w).split(' ')[0]);
      const ranges = (json.ranges || []).filter((x) => x.sev !== 'info');
      const missed = truth.seeded.filter((d) => { const rx = new RegExp(d.sel); return !ranges.some((x) => x.check === d.check && (rx.test(x.sel) || rx.test(x.sel.replace(/:nth-of-type\(\d+\)/g, ''))) && num(x.to) >= d.widths[0] && num(x.from) <= d.widths[1]); });
      return [
        [json.widths === 147, `147 widths at the default --step 8,16 (got ${json.widths})`],
        [!missed.length, `all ${truth.seeded.length} seeded defects found in their band${missed.length ? ` (missed ${missed.map((d) => `${d.id} ${d.check}`).join(', ')})` : ''}`],
        [code === 1 && sheet, `exit 1 on the ✗ ranges, and the contact sheet is written (exit ${code})`],
      ];
    } },
  { group: 'stress', name: 'stress.mjs: the seeded content-fragility defects a phone width shows (stress-lab, truth.json; slow and 768 px left out)', run: async () => {
      const r = await run('stress.mjs', ['--url', `${fx}/stress-lab/`, '--widths', '390', '--only', 'pseudo,long,numbers,no-images,rtl,list-0,errors,offline', '--no-full', '--out', `${tmp}/stress-lab`]);
      return { ...r, json: JSON.parse(await readFile(`${tmp}/stress-lab/tools-regress-fixtures-stress-lab-stress.json`, 'utf8').catch(() => '{}')), truth: JSON.parse(await readFile(path.join(root, 'tools/regress/fixtures/stress-lab/truth.json'), 'utf8')) };
    },
    check: ({ code, json, truth }) => {
      // The S7 lab's rule: found when the mutation reports a new finding with one of the checks on a selector matching `sel`.
      // S12 needs the lab server's delayed API (slow) and S14 shows at 768 px: neither runs here.
      const findings = (json.results || []).filter((x) => x.new).flatMap((x) => x.new.filter((f) => f.sev !== 'info').map((f) => ({ mutation: x.mutation, check: f.check, sel: f.sel })));
      const seeded = truth.seeded.filter((d) => !['S12', 'S14'].includes(d.id));
      const missed = seeded.filter((d) => { const rx = new RegExp(d.sel), mx = new RegExp(`^(${d.mutation})$`); return !findings.some((f) => mx.test(f.mutation) && d.checks.includes(f.check) && (rx.test(f.sel) || rx.test(f.sel.replace(/:nth-of-type\(\d+\)/g, '')))); });
      return [
        [(json.results || []).filter((x) => x.mutation !== 'none').length === 8, `eight mutations at one width (got ${(json.results || []).filter((x) => x.mutation !== 'none').map((x) => x.mutation).join(', ')})`],
        [!missed.length, `${seeded.length} seeded defects found under their mutation${missed.length ? ` (missed ${missed.map((d) => `${d.id} ${d.mutation}`).join(', ')})` : ''}`],
        [code === 1, `exit 1 when a mutation produced a ✗ (exit ${code})`],
      ];
    } },
  { group: 'model', name: 'model.mjs: a 1 KB glTF of five blended, double-sided quads (draws, reuse, prune, --fail, a missing .bin, --json)', run: async () => {
      const fs = await import('node:fs/promises');
      const quads = path.join(root, 'tools/regress/fixtures/model-quads.gltf');
      // The same file with its buffer moved out to a .bin that is not there.
      const lost = path.join(tmp, 'model-lost.gltf');
      const g = JSON.parse(await fs.readFile(quads, 'utf8'));
      g.buffers[0].uri = 'model-lost.bin';
      await fs.writeFile(lost, JSON.stringify(g));
      const plain = await run('model.mjs', [quads]);
      const calls = await run('model.mjs', [quads, '--max-calls', '4', '--fail']);
      const missing = await run('model.mjs', [lost]);
      const json = await run('model.mjs', [quads, '--json']);
      const tier = await run('model.mjs', [quads, '--tier', 'watch']);
      let j = null; try { j = JSON.parse(json.out); } catch { /* checked below */ }
      return { code: plain.code, out: [plain.out, calls.out, missing.out].join('\n'), plain, calls, missing, j, tier };
    },
    check: ({ plain, calls, missing, j, tier }) => [
      [plain.code === 0 && /\[tier: mobile\] {2}within budget/.test(plain.out), `within the mobile budget, exit 0 (exit ${plain.code})`],
      [/1 meshes, 1 primitives, 2 triangles stored, 20 drawn, ~10 draw calls/.test(plain.out), 'one quad on five nodes, blended and double-sided: drawn twice per node (20 triangles, 10 draws)'],
      [/→ 4 nodes reuse a mesh without GPU instancing\n\s+gltf-transform instance /.test(plain.out) && /→ unreferenced data: 1 materials\n\s+gltf-transform prune /.test(plain.out), 'the reused mesh and the unused material come with their gltf-transform commands'],
      [calls.code === 1 && /OVER BUDGET/.test(calls.out) && /✗ ~10 draw calls > 4\n\s+gltf-transform instance [^\n]*--min 2/.test(calls.out), `--max-calls 4 --fail: over budget, the instance command, exit 1 (exit ${calls.code})`],
      [missing.code === 0 && /OVER BUDGET/.test(missing.out) && /✗ 1 referenced file\(s\) missing next to the \.gltf \(model-lost\.bin\)/.test(missing.out), 'a .gltf whose .bin is missing is named, and over budget'],
      [j && j.trianglesDrawn === 20 && j.drawCalls === 10 && j.doubleSidedBlendPrimitives === 5 && j.unused?.materials === 1 && j.ok === true, '--json carries the same numbers'],
      [tier.code === 1 && /unknown tier watch/.test(tier.out), `an unknown --tier exits 1 (exit ${tier.code})`],
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
