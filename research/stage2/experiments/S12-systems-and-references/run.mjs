#!/usr/bin/env node
// S12 runner: rebuilds and re-measures everything and writes results.json.
//   npm install && node run.mjs            (all: ~9 min, one browser at a time)
//   node run.mjs --only tenant|lint|labs   (one part; the other parts are kept from results.json)
// Third-party source is fetched into ./vendor (git-ignored) by fetch-vendor.mjs.
import './lib/register-ext.mjs'; // must come first: material-color-utilities needs it
import { writeFile, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import os from 'node:os';

const here = new URL('./', import.meta.url);
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
let prev = {};
try { prev = JSON.parse(await readFile(new URL('results.json', here), 'utf8')); } catch {}

execFileSync(process.execPath, [new URL('fetch-vendor.mjs', here).pathname], { stdio: 'inherit' });

const out = { ...prev, generated: new Date().toISOString(), node: process.version, cpus: os.cpus().length };

if (!only || only === 'tenant') {
  const { runTenant } = await import('./tenant/run-tenant.mjs');
  const t = await runTenant({ axe: true, sheet: true });
  await writeFile(new URL('tenant/tenant-results.json', here), JSON.stringify(t, null, 1));
  out.tenant = {
    note: 'Full per-case records (roles, every pair) are in tenant/tenant-results.json. Contact sheet: shots/tenant-sheet.jpg.',
    tenants: t.tenants, gates: t.gates, gatesFirstRound: t.gatesFirstRound, neutrals: t.neutrals, summary: t.summary, collisions: t.collisions,
    labelSweep: t.labelSweep, random: t.random, inputProbe: t.inputProbe, tailwindTenant: t.tailwindTenant, axeCheck: t.axeCheck, adminOptions: t.adminOptions,
    s12Cases: t.cases.filter((c) => c.method === 'M6-s12').map((c) => ({ tenant: c.tenant, mode: c.mode, in: c.tenantHex, accent: c.roles.accent, onAccent: c.roles.onAccent, strong: c.roles.accentText, subtle: c.roles.accentSubtle, buttonBorder: c.roles.buttonBorder, fidelityDE: c.fidelityDE, flags: c.flags, warnings: c.warnings })),
    paletteCases: t.cases.filter((c) => c.method === 'M7-palette-mjs').map((c) => ({ tenant: c.tenant, mode: c.mode, step9: c.roles.accent, label: c.roles.onAccent, step11: c.roles.accentText, focus: c.roles.focusRing, failing: c.pairs.filter((p) => !p.pass && p.kind !== 'advisory').map((p) => `${p.id} ${p.wcag}:1`) })),
  };
  console.log('tenant: done');
}
if (!only || only === 'lint') {
  const { runLint } = await import('./lint/run-lint.mjs');
  const l = await runLint();
  await writeFile(new URL('lint/lint-results.json', here), JSON.stringify(l, null, 1));
  const strip = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { ...v, messages: undefined, sample: undefined }]));
  const held = (sets) => Object.fromEntries(Object.entries(sets).map(([n, x]) => [n, { ...x, referenceSample: undefined, setups: strip(x.setups) }]));
  out.lint = { note: 'Full messages, every held-out flag with its category/verdict, and the reference set are in lint/lint-results.json.', versions: l.versions, fixture: { stylelint: strip(l.stylelint), eslint: strip(l.eslint) }, tailwind: l.tailwind,
    heldOut: { tsx: held(l.heldOut.tsx), css: held(l.heldOut.css) } };
  console.log('lint: done');
}
if (!only || only === 'labs') {
  const { runLabs } = await import('./labs/run-labs.mjs');
  const r = await runLabs();
  await writeFile(new URL('labs/labs-results.json', here), JSON.stringify(r, null, 1));
  out.labs = { ...r, wedge: r.wedge.map(({ sample, ...x }) => x) };
  console.log('labs: done');
}
await writeFile(new URL('results.json', here), JSON.stringify(out, null, 1));
console.log('wrote results.json');
