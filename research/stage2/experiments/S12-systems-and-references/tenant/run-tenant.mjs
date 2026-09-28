#!/usr/bin/env node
// S12 white-label experiment: 12 tenant primaries × 8 derivation methods × light/dark.
// Measures every text/ground and non-text pair (WCAG 2 ratio + APCA Lc), brand fidelity
// (ΔE OK between the tenant's colour and the button fill), status-colour collisions, then
// cross-checks the text pairs with axe-core's color-contrast rule in Chromium and renders
// a contact sheet. Run through ../run.mjs (it registers the ESM resolve hook MCU needs).
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { launch } from '../../../../../skills/website-redesign/scripts/lib/env.mjs';
import { C, hex, wcag, apca, dE, oklch } from '../lib/color.mjs';
import { METHODS, PAIRS, NEUTRALS, loadRadix, loadMcu, S12_GATES, statusCollisions, labelOptions } from './methods.mjs';

const require = createRequire(import.meta.url);
const here = new URL('./', import.meta.url);

export const TENANTS = [
  { name: 'yellow', hex: '#FFFF00', note: 'pathological: lighter than any label ground' },
  { name: 'near-white', hex: '#F0F0F0', note: 'pathological: vanishes on a white page' },
  { name: 'black', hex: '#000000', note: 'pathological in dark mode' },
  { name: 'pure red', hex: '#FF0000', note: 'white label 4.0:1; collides with danger' },
  { name: 'grey', hex: '#8A8F98', note: 'low chroma: brand has no hue' },
  { name: 'blue', hex: '#1A3CF2', note: 'well-behaved control' },
  { name: 'jade', hex: '#00A86B', note: 'mid-light green; collides with success' },
  { name: 'orange', hex: '#FF7A00', note: 'classic white-label failure' },
  { name: 'cyan', hex: '#00D1FF', note: 'light, saturated' },
  { name: 'purple', hex: '#6B21A8', note: 'dark, fine in light mode' },
  { name: 'navy', hex: '#0B1F3A', note: 'vanishes on a dark page' },
  { name: 'pink', hex: '#FF69B4', note: 'mid-tone: neither label passes APCA' },
];

const r2 = (x) => Math.round(x * 100) / 100;
const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : null);
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

function measure(roles, mode) {
  const n = NEUTRALS[mode];
  const get = (k) => (k.startsWith('n.') ? n[k.slice(2)] : roles[k]);
  return PAIRS.map((p) => {
    if (p.id === 'N4') {
      const edge = Math.max(wcag(roles.accent, n.bg), roles.buttonBorder ? wcag(roles.buttonBorder, n.bg) : 0);
      return { id: p.id, kind: p.kind, fg: roles.buttonBorder ?? roles.accent, bg: n.bg, wcag: r2(edge), pass: edge >= 3 };
    }
    const fg = get(p.fg), bg = get(p.bg);
    const w = wcag(fg, bg), lc = apca(bg, fg);
    const pass = p.kind === 'text' ? w >= 4.5 : w >= 3;
    return { id: p.id, kind: p.kind, fg, bg, wcag: r2(w), lc: Math.round(lc), pass, passApca60: p.kind === 'text' ? pass && lc >= 60 : undefined, passApca75: p.kind === 'text' ? pass && lc >= 75 : undefined };
  });
}

// For any opaque sRGB colour, how good is the better of a white or black label?
function bestLabelSweep(step = 1 / 32) {
  let minW = 99, minWAt = null, n = 0, fail60 = 0, fail75 = 0, minLc = 999, minLcAt = null;
  for (let r = 0; r <= 1.0001; r += step) for (let g = 0; g <= 1.0001; g += step) for (let b = 0; b <= 1.0001; b += step) {
    const c = C(`rgb(${r * 100}% ${g * 100}% ${b * 100}%)`);
    const w = Math.max(wcag(c, '#FFFFFF'), wcag(c, '#000000'));
    const lc = Math.max(apca(c, '#FFFFFF'), apca(c, '#000000'));
    n++;
    if (w < minW) { minW = w; minWAt = hex(c); }
    if (lc < minLc) { minLc = lc; minLcAt = hex(c); }
    if (lc < 60) fail60++;
    if (lc < 75) fail75++;
  }
  return { colours: n, minBestWcag: r2(minW), minBestWcagAt: minWAt, minBestApcaLc: Math.round(minLc), minBestApcaAt: minLcAt, shareBestLabelBelowLc60: pct(fail60, n), shareBestLabelBelowLc75: pct(fail75, n) };
}

function previewHtml(roles, mode, { label = '', compact = false } = {}) {
  const n = NEUTRALS[mode];
  const edge = roles.buttonBorder ? `1px solid ${roles.buttonBorder}` : '1px solid transparent';
  return `<div class="pv" style="background:${n.bg};color:${n.text};font:500 14px/20px system-ui,sans-serif;padding:${compact ? 10 : 14}px;border:1px solid ${mode === 'light' ? '#e2e2e6' : '#2b2c31'};${compact ? 'width:250px;' : ''}">
  ${label ? `<div style="font:600 12px/16px system-ui;color:${n.muted};margin-bottom:8px">${label}</div>` : ''}
  <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">
    <button data-pair="T1" style="font:600 14px/20px system-ui;padding:6px 12px;border-radius:6px;border:${edge};background:${roles.accent};color:${roles.onAccent}">Save changes</button>
    <button data-pair="T2" style="font:600 14px/20px system-ui;padding:6px 12px;border-radius:6px;border:${edge};background:${roles.accentHover};color:${roles.onAccent}">Hovered</button>
  </div>
  <p style="margin:0 0 8px">Read the <a data-pair="T3" href="#" style="color:${roles.accentText};text-decoration:underline">billing guide</a> first.</p>
  <div style="background:${n.surface};padding:8px;border-radius:6px;margin-bottom:8px">On a card: <a data-pair="T4" href="#" style="color:${roles.accentText}">View invoice</a></div>
  <div data-pair="T5" style="background:${roles.accentSubtle};color:${roles.onSubtle};padding:6px 8px;border-radius:4px;margin-bottom:10px">Selected row · Acme Ltd</div>
  <div style="display:flex;gap:10px;align-items:center">
    <span aria-hidden="true" style="display:inline-block;width:16px;height:16px;border-radius:4px;background:${roles.indicator}"></span>
    <span aria-hidden="true" style="display:inline-block;width:28px;height:16px;border-radius:8px;background:${roles.indicator}"></span>
    <span aria-hidden="true" style="display:inline-block;padding:2px 6px;border-radius:4px;outline:2px solid ${roles.focusRing};outline-offset:2px">focus</span>
  </div>
</div>`;
}

export async function runTenant({ axe = true, sheet = true } = {}) {
  await loadRadix();
  await loadMcu();
  const cases = [];
  for (const m of METHODS) for (const t of TENANTS) for (const mode of ['light', 'dark']) {
    const roles = m.fn(t.hex, mode);
    const pairs = measure(roles, mode);
    cases.push({ method: m.id, tenant: t.name, tenantHex: t.hex, mode, roles: Object.fromEntries(Object.entries(roles).filter(([k]) => k !== 'flags')), flags: roles.flags ?? [], pairs,
      fidelityDE: Math.round(dE(t.hex, roles.accent) * 1000) / 10, exactFill: hex(t.hex) === hex(roles.accent) });
  }

  // ----- aggregate per method
  const summary = METHODS.map((m) => {
    const cs = cases.filter((c) => c.method === m.id);
    const ps = cs.flatMap((c) => c.pairs);
    const T = ps.filter((p) => p.kind === 'text'), N = ps.filter((p) => p.kind === 'nontext'), A = ps.filter((p) => p.kind === 'advisory');
    const allGates = cs.filter((c) => c.pairs.filter((p) => p.kind !== 'advisory').every((p) => p.pass)).length;
    const byMode = (mode) => { const x = cs.filter((c) => c.mode === mode); return { textPass: pct(x.flatMap((c) => c.pairs).filter((p) => p.kind === 'text' && p.pass).length, x.length * 5), fidelityMedianDE: median(x.map((c) => c.fidelityDE)), fidelityMaxDE: Math.max(...x.map((c) => c.fidelityDE)), exactFill: x.filter((c) => c.exactFill).length }; };
    const failing = {};
    for (const c of cs) for (const p of c.pairs) if (!p.pass && p.kind !== 'advisory') (failing[p.id] ??= []).push(`${c.tenant}/${c.mode}`);
    return {
      method: m.id, label: m.label,
      textPairs: T.length, textPassWcag: pct(T.filter((p) => p.pass).length, T.length), textPassWcagAndLc60: pct(T.filter((p) => p.passApca60).length, T.length), textPassWcagAndLc75: pct(T.filter((p) => p.passApca75).length, T.length),
      nonTextPairs: N.length, nonTextPass: pct(N.filter((p) => p.pass).length, N.length),
      buttonBoundaryPass: pct(A.filter((p) => p.pass).length, A.length),
      tenantModesAllGates: `${allGates}/${cs.length}`,
      light: byMode('light'), dark: byMode('dark'),
      failingPairs: Object.fromEntries(Object.entries(failing).map(([k, v]) => [k, v.length])),
    };
  });

  // ----- status collisions (tenant colour close to the locked danger/success colours)
  const collisions = TENANTS.map((t) => ({ tenant: t.name, hex: t.hex, light: statusCollisions([t.hex], 'light'), dark: statusCollisions([t.hex], 'dark') })).filter((x) => x.light.length || x.dark.length);

  // ----- the two choices a tenant admin preview would offer
  const adminOptions = TENANTS.flatMap((t) => ['light', 'dark'].map((mode) => ({ tenant: t.name, hex: t.hex, mode, ...labelOptions(t.hex, mode) })));

  // ----- universal label fact
  const labelSweep = bestLabelSweep();

  // ----- axe cross-check (text pairs only; axe measures what the browser paints)
  let axeCheck = null;
  if (axe) {
    const axeSrc = await readFile(require.resolve('axe-core/axe.min.js'), 'utf8');
    const { browser } = await launch();
    const page = await browser.newPage({ viewport: { width: 420, height: 400 } });
    let agree = 0, total = 0, axeFailNodes = 0, computedFails = 0;
    const disagreements = [];
    for (const c of cases) {
      await page.setContent(`<!doctype html><html lang="en"><head><title>t</title></head><body style="margin:0"><main>${previewHtml(c.roles, c.mode)}</main></body></html>`);
      await page.addScriptTag({ content: axeSrc });
      const res = await page.evaluate(async () => {
        const r = await window.axe.run(document, { runOnly: ['color-contrast'] });
        return r.violations.flatMap((v) => v.nodes.map((n) => n.target.join(' ')));
      });
      const axePairs = new Set();
      for (const sel of res) {
        const id = await page.evaluate((s) => document.querySelector(s)?.closest('[data-pair]')?.dataset.pair ?? null, sel);
        if (id) axePairs.add(id);
      }
      const comp = new Set(c.pairs.filter((p) => p.kind === 'text' && !p.pass).map((p) => p.id));
      for (const id of ['T1', 'T2', 'T3', 'T4', 'T5']) {
        total++;
        if (axePairs.has(id) === comp.has(id)) agree++;
        else disagreements.push({ method: c.method, tenant: c.tenant, mode: c.mode, pair: id, axe: axePairs.has(id), computed: comp.has(id), wcag: c.pairs.find((p) => p.id === id).wcag });
      }
      axeFailNodes += axePairs.size; computedFails += comp.size;
    }
    const axePerMethod = Object.fromEntries(METHODS.map((m) => [m.id, 0]));
    axeCheck = { axeVersion: require('axe-core/package.json').version, pairChecks: total, agreement: pct(agree, total), axeFailingPairs: axeFailNodes, computedFailingPairs: computedFails, disagreements: disagreements.slice(0, 20) };
    // ----- contact sheet
    if (sheet) {
      const showT = ['yellow', 'near-white', 'pure red', 'pink', 'navy'];
      const showM = [['M0-naive', 'naive'], ['M1b-wcag-on', 'auto label'], ['M3-atlassian', 'Atlassian'], ['M4-m3-tonalspot', 'M3 tonal spot'], ['M6-s12', 'S12 rules']];
      let html = '<!doctype html><html><body style="margin:0;background:#fff;font:12px system-ui"><table style="border-collapse:collapse">';
      html += '<tr><td></td>' + showM.map(([, l]) => `<td colspan="2" style="padding:6px;font:600 13px system-ui;text-align:center">${l}</td>`).join('') + '</tr>';
      for (const tn of showT) {
        const t = TENANTS.find((x) => x.name === tn);
        html += `<tr><td style="padding:6px;vertical-align:top;width:90px"><div style="width:40px;height:40px;background:${t.hex};border:1px solid #ccc"></div><b>${t.name}</b><br>${t.hex}</td>`;
        for (const [id] of showM) for (const mode of ['light', 'dark']) {
          const c = cases.find((x) => x.method === id && x.tenant === tn && x.mode === mode);
          const fails = c.pairs.filter((p) => !p.pass && p.kind !== 'advisory').map((p) => p.id).join(' ');
          html += `<td style="padding:3px;vertical-align:top">${previewHtml(c.roles, mode, { compact: true, label: `${mode} · ${fails ? 'fails ' + fails : 'all gates pass'} · ΔE ${c.fidelityDE}` })}</td>`;
        }
        html += '</tr>';
      }
      html += '</table></body></html>';
      const p2 = await browser.newPage({ viewport: { width: 2900, height: 1600 }, deviceScaleFactor: 1 });
      await p2.setContent(html);
      await mkdir(new URL('../shots/', here), { recursive: true });
      const box = await p2.evaluate(() => { const t = document.querySelector('table').getBoundingClientRect(); return { width: Math.ceil(t.width), height: Math.ceil(t.height) }; });
      await p2.screenshot({ path: new URL('../shots/tenant-sheet.jpg', here).pathname, type: 'jpeg', quality: 72, clip: { x: 0, y: 0, ...box } });
    }
    await browser.close();
  }
  return { tenants: TENANTS, gates: S12_GATES, neutrals: NEUTRALS, summary, collisions, adminOptions, labelSweep, axeCheck, cases };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await runTenant({ axe: !process.argv.includes('--no-axe') });
  await writeFile(new URL('./tenant-results.json', here), JSON.stringify(r, null, 1));
  console.table(r.summary.map(({ failingPairs, light, dark, label, ...x }) => ({ ...x, fidL: light.fidelityMedianDE, fidD: dark.fidelityMedianDE, exactL: light.exactFill, exactD: dark.exactFill })));
  console.log(r.labelSweep, r.axeCheck && { ...r.axeCheck, disagreements: r.axeCheck.disagreements.length });
}
