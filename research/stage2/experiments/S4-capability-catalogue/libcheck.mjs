#!/usr/bin/env node
/**
 * libcheck — judge an npm library in minutes before building hard UI on it.
 * (Proposed for skills/website-redesign/scripts/; written and tested in the S4 lab.)
 *
 *   node libcheck.mjs <package>[=owner/repo] [<package> …] [--repo owner/name] [--size] [--entry "<js>"] [--json]
 *   node libcheck.mjs --search "resizable panels" [--size-limit 12]
 *
 * For each package it reports, from primary sources only:
 *   release    latest version and date, releases in the last 12 months, deprecation, direct deps, peers
 *   adoption   weekly downloads and dependents (npm search API)
 *   licence    the LICENSE text shipped in the tarball (npm pack), classified from its words, never from
 *              package.json; a pointer file or a missing file falls back to the repository's root licence
 *   activity   the repository over git (treeless, shallow since 12 months ago): commits, human authors,
 *              the top author's share (bus factor), last commit; README "unmaintained" notices
 *   size       (--size) esbuild + gzip of a minimal entry, React/Vue/Svelte external; initial vs lazy JS,
 *              CSS, WASM/other assets, how many npm packages end up in the bundle
 * and ends with RED / AMBER flags. It never decides for you: licence text with restrictions is quoted.
 *
 * --search ranks npm text-search results by weekly downloads (npm's own score fields are constant 1/1/1
 * as of 2026-09 and carry no signal) and prints the top ones with their last publish date.
 *
 * Needs network (registry.npmjs.org, github.com, raw.githubusercontent.com) and git; --size runs
 * `npm install` into a temporary folder. Node 18+.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readdir, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const run = promisify(execFile);
const DAY = 86400000;
export const today = () => new Date();
export const cutoffDate = (months = 12) => new Date(Date.now() - months * 30.44 * DAY).toISOString().slice(0, 10);

// ── npm registry ────────────────────────────────────────────────────────────────────────────────
export async function registry(name, cutoff = cutoffDate()) {
  const r = await fetch('https://registry.npmjs.org/' + name.replace('/', '%2F'));
  if (!r.ok) return { name, error: 'HTTP ' + r.status };
  const j = await r.json();
  const latest = j['dist-tags']?.latest;
  const m = j.versions?.[latest] || {};
  const since = new Date(cutoff).getTime();
  const versions = Object.entries(j.time || {}).filter(([v]) => j.versions?.[v]);
  const inWindow = versions.filter(([, t]) => new Date(t).getTime() >= since);
  const stable = (v) => !/-/.test(v);
  return {
    name, latest, latestDate: (j.time?.[latest] || '').slice(0, 10),
    releases12m: inWindow.length, stableReleases12m: inWindow.filter(([v]) => stable(v)).length,
    licenseField: typeof m.license === 'string' ? m.license : m.license?.type ?? null,
    deprecated: m.deprecated || null,
    deps: Object.keys(m.dependencies || {}).length, peerDeps: Object.keys(m.peerDependencies || {}),
    hasInstallScript: !!(m.scripts?.postinstall || m.scripts?.install || m.scripts?.preinstall),
    repository: String(m.repository?.url || m.repository || '').replace(/^git\+|\.git$/g, ''),
    firstPublished: (j.time?.created || '').slice(0, 10),
  };
}

export async function adoption(name) {
  const r = await fetch(`https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(name)}&size=20`).catch(() => null);
  if (!r?.ok) return null;
  const j = await r.json();
  const o = j.objects.find((x) => x.package.name === name);
  return o ? { weeklyDownloads: o.downloads?.weekly ?? null, monthlyDownloads: o.downloads?.monthly ?? null, dependents: o.dependents ?? null } : null;
}

export async function search(text, limit = 12) {
  const r = await fetch(`https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(text)}&size=100`);
  const j = await r.json();
  return j.objects
    .map((o) => ({ name: o.package.name, version: o.package.version, date: (o.package.date || '').slice(0, 10), weekly: o.downloads?.weekly ?? 0, dependents: o.dependents ?? 0, description: (o.package.description || '').slice(0, 90) }))
    .sort((a, b) => b.weekly - a.weekly).slice(0, limit);
}

// ── Licence text ────────────────────────────────────────────────────────────────────────────────
const TESTS = [
  ['MPL-2.0', /Mozilla Public License,?\s*(Version|v\.?)\s*2\.0/i],
  ['EPL-2.0', /Eclipse Public License[^\n]{0,20}(v|version)\s*2\.0/i],
  ['AGPL-3.0', /GNU AFFERO GENERAL PUBLIC LICENSE|Affero General Public License v3/], // case-sensitive: GPL-3.0 §13 names the AGPL in mixed case
  ['LGPL-3.0', /GNU LESSER GENERAL PUBLIC LICENSE\s+Version 3/i],
  ['GPL-3.0', /GNU GENERAL PUBLIC LICENSE\s+Version 3/i],
  ['GPL-2.0', /GNU GENERAL PUBLIC LICENSE\s+Version 2|General Public License Version 2/i],
  ['Apache-2.0', /Apache License,?\s*(Version\s*)?2\.0/i],
  ['ISC', /Permission to use, copy, modify, and\/?or distribute this software for any\s+purpose/i],
  ['BSD-3-Clause', /Redistribution and use in source and binary forms[\s\S]*Neither the name/i],
  ['BSD-2-Clause', /Redistribution and use in source and binary forms/i],
  ['MIT', /Permission is hereby granted, free of charge/i],
  ['Unlicense', /This is free and unencumbered software released into the public domain/i],
];
const OSI = new Set(TESTS.map(([id]) => id));
const FLAGS = [
  ['licence-key', /licen[cs]e key/i], ['watermark', /watermark/i],
  ['revenue-cap', /(annual|gross) (revenue|turnover)|revenue (of|below|under|above|exceed)|\$\s?\d+\s?(k|m|million)\b.{0,40}(revenue|funding)/i],
  ['headcount-cap', /(up to|fewer than|less than|more than|over|under)\s*\d+\s*(employees|people|developers|individuals)|\d+ (or fewer|or less|or more) (employees|people|developers)|headcount/i],
  ['trial', /\btrial\b|evaluation (period|purposes|licen[cs]e)/i], ['non-commercial', /non-?commercial/i],
  ['keep-logo', /(logo|watermark|attribution|made with)[^.]{0,120}(must|shall|remain|visible|not be removed)/i],
  ['production-restricted', /(in|for) production|production (use|environment|deployment)/i],
  ['no-competing', /compet(e|ing|itor)/i], ['commercial', /\bcommercial licen[cs]e|paid licen[cs]e|purchase/i],
  ['proprietary', /\bproprietary\b/i],
];
const STRONG = new Set(['licence-key', 'watermark', 'revenue-cap', 'headcount-cap', 'trial', 'non-commercial', 'keep-logo']);

export function classifyLicenceText(text) {
  const flat = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const agplTitle = /GNU Affero General Public License/i.test(flat.slice(0, 400));
  const classes = TESTS.filter(([id, re]) => re.test(flat) || (id === 'AGPL-3.0' && agplTitle)).map(([id]) => id)
    .filter((id, i, a) => !(id === 'BSD-2-Clause' && a.includes('BSD-3-Clause')));
  const flags = FLAGS.filter(([, re]) => re.test(flat)).map(([id]) => id);
  // MPL-2.0 names the GPL family as "Secondary Licenses": those mentions are not a second licence.
  const own = classes.includes('MPL-2.0') ? ['MPL-2.0', ...classes.filter((c) => !/GPL/.test(c) && c !== 'MPL-2.0')] : classes;
  const gpl = own.find((c) => /GPL/.test(c));
  const dualCommercial = gpl && /or (a |the )?commercial|commercial licen[cs]e|Terms & Conditions of Use/i.test(flat);
  let classified;
  if (!own.length) classified = flags.some((f) => STRONG.has(f) || f === 'proprietary' || f === 'commercial') ? 'custom / proprietary' : 'custom';
  else if (dualCommercial) classified = `${gpl}${/or later|or-later|any later version/i.test(flat) ? '+' : ''} or commercial (dual)`;
  else if (own.length > 1) classified = own.join(' + ') + ' (several licences in one file)';
  else classified = own[0];
  let shown = own.length && OSI.has(own[0]) && !dualCommercial ? flags.filter((f) => STRONG.has(f)) : flags;
  if (gpl) shown = shown.filter((f) => !['non-commercial', 'proprietary', 'production-restricted', 'no-competing'].includes(f));
  if (own.length && shown.length && !dualCommercial) classified += ' + ' + shown.join(', ');
  const sentences = flat.split(/(?<=[.!?;])\s+/);
  const evidence = [];
  for (const [id, re] of FLAGS) {
    if (!shown.includes(id)) continue;
    const hits = sentences.filter((x) => re.test(x));
    const sn = hits.find((x) => /\d/.test(x)) || hits[0];
    if (sn) evidence.push(`[${id}] ${sn.slice(0, 280)}`);
  }
  return { classified, classes: own, flags: shown, head: flat.slice(0, 200), evidence: evidence.slice(0, 6) };
}

export const isLicenceFile = (f) => /(^|[-_.])(licen[cs]e|copying)([-_.]|$)/i.test(f) && !/\.(js|mjs|cjs|ts|map|json)$/i.test(f);

export async function repoLicence(repo) {
  if (!repo) return null;
  for (const f of ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENCE', 'LICENCE.md', 'license', 'license.md', 'License.md', 'COPYING']) {
    const r = await fetch(`https://raw.githubusercontent.com/${repo}/HEAD/${f}`).catch(() => null);
    if (r?.ok) return { file: `github.com/${repo}/${f}`, text: await r.text() };
  }
  return null;
}

/** Classify the licence files in an unpacked package folder (falls back to the repo root licence). */
export async function licenceFromDir(dir, repo) {
  const files = existsSync(dir) ? (await readdir(dir)).filter(isLicenceFile) : [];
  let source = 'package', file = files.join(', '), text = '';
  if (files.length) text = (await Promise.all(files.map((f) => readFile(path.join(dir, f), 'utf8')))).join('\n\n');
  if (files.length && text.length < 400 && /github\.com\/[^\s)]+licen[cs]e/i.test(text)) {
    const r = await repoLicence(repo);
    if (r) { source = 'repo root (package file is a pointer)'; file = r.file; text = r.text; }
  }
  if (!files.length) {
    const r = await repoLicence(repo);
    if (!r) return { source: 'none', file: null, classified: 'NO LICENCE FILE (package or repo root)', flags: [], evidence: [] };
    source = 'repo root (package ships none)'; file = r.file; text = r.text;
  }
  return { source, file, bytes: text.length, ...classifyLicenceText(text) };
}

async function packLicence(name, version, repo, tmp) {
  const dest = path.join(tmp, 'pack-' + name.replace(/[@/]/g, '_'));
  await mkdir(dest, { recursive: true });
  const { stdout } = await run('npm', ['pack', `${name}@${version}`, '--pack-destination', dest, '--json', '--silent'], { maxBuffer: 32 << 20 });
  const tgz = path.join(dest, JSON.parse(stdout)[0].filename);
  await run('tar', ['-xzf', tgz, '-C', dest]);
  const pkgDir = path.join(dest, 'package');
  const readme = existsSync(pkgDir) ? (await readdir(pkgDir)).find((x) => /^readme(\.md)?$/i.test(x)) : null;
  const notice = readme ? ((await readFile(path.join(pkgDir, readme), 'utf8')).match(/[^\n]{0,80}(unmaintained|no longer (being )?maintained|not (actively )?maintained|looking for (new )?maintainers|deprecated in favou?r|placeholder package|archived)[^\n]{0,80}/i)?.[0]?.trim().slice(0, 200) ?? null) : null;
  const readmeText = readme ? await readFile(path.join(pkgDir, readme), 'utf8') : '';
  const commercial = readmeText.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).find((x) => /commercial licen[cs]e|licen[cs]e key|pro edition|enterprise (edition|features|licen)|pricing|premium/i.test(x));
  return { ...(await licenceFromDir(pkgDir, repo)), readmeNotice: notice, readmeCommercial: commercial ? commercial.slice(0, 220) : null };
}

// ── Repository activity over git ────────────────────────────────────────────────────────────────
const BOT = /\[bot\]|github-actions|dependabot|renovate|changeset|semantic-release|greenkeeper|actions-user|release-please|autofix|copilot/i;
export async function activity(repo, cacheDir, cutoff = cutoffDate()) {
  if (!repo) return null;
  const dir = path.join(cacheDir, repo.replace('/', '__'));
  const url = `https://github.com/${repo}`;
  await mkdir(cacheDir, { recursive: true });
  if (!existsSync(dir)) {
    try { await run('git', ['clone', '-q', '--bare', '--single-branch', '--filter=tree:0', `--shallow-since=${cutoff}`, url, dir], { timeout: 240000 }); }
    catch {
      // No commit since the cutoff makes --shallow-since fail: fetch the last commit only.
      try { await run('git', ['clone', '-q', '--bare', '--single-branch', '--filter=tree:0', '--depth=1', url, dir], { timeout: 240000 }); }
      catch (e2) { return { repo, error: String(e2.stderr || e2.message).split('\n')[0] }; }
    }
  }
  const { stdout } = await run('git', ['-C', dir, 'log', `--since=${cutoff}`, '--format=%an|%ae|%cI'], { maxBuffer: 64 << 20 });
  const last = (await run('git', ['-C', dir, 'log', '-1', '--format=%cI'])).stdout.trim().slice(0, 10);
  const rows = stdout.trim() ? stdout.trim().split('\n').map((l) => l.split('|')) : [];
  const human = rows.filter(([n, e]) => !BOT.test(n) && !BOT.test(e));
  const by = {};
  for (const [n] of human) by[n] = (by[n] || 0) + 1;
  const top = Object.entries(by).sort((a, b) => b[1] - a[1]);
  return { repo, commits12m: rows.length, humanCommits12m: human.length, authors12m: top.length, topAuthor: top[0]?.[0] || null, topShare: human.length ? Math.round((top[0][1] / human.length) * 100) : null, lastCommit: last };
}

// ── Bundle cost ─────────────────────────────────────────────────────────────────────────────────
const EXTERNAL = ['react', 'react-dom', 'react/*', 'react-dom/*', 'vue', 'svelte', 'svelte/*', 'scheduler'];
export async function bundleCost(entryCode, { root, buildDir, assets = [], alias = {}, esbuild }) {
  esbuild ??= await import(pathToFileURL(path.join(root, 'node_modules', 'esbuild', 'lib', 'main.js')).href).then((m) => m.default ?? m);
  const dir = buildDir; await rm(dir, { recursive: true, force: true }); await mkdir(dir, { recursive: true });
  const entry = path.join(dir, 'entry.mjs'); await writeFile(entry, entryCode + '\n');
  let result;
  try {
    result = await esbuild.build({
      entryPoints: [entry], bundle: true, minify: true, format: 'esm', splitting: true, platform: 'browser', target: 'es2022',
      outdir: path.join(dir, 'out'), metafile: true, write: true, logLevel: 'silent', legalComments: 'none', external: EXTERNAL,
      define: { 'process.env.NODE_ENV': '"production"', global: 'globalThis' }, conditions: ['production'], nodePaths: [path.join(root, 'node_modules')],
      loader: { '.wasm': 'file', '.woff': 'file', '.woff2': 'file', '.ttf': 'file', '.eot': 'file', '.png': 'file', '.jpg': 'file', '.gif': 'file', '.svg': 'file' },
      absWorkingDir: dir, alias,
    });
  } catch (e) { return { ok: false, error: (e.errors || []).map((x) => x.text).slice(0, 3).join(' | ') || e.message }; }
  const gz = (b) => gzipSync(b, { level: 9 }).length;
  const outputs = result.metafile.outputs;
  const res = { ok: true, entryGz: 0, initialGz: 0, jsGz: 0, jsMin: 0, cssGz: 0, assetsRaw: 0, assetsGz: 0, chunks: 0, packages: 0 };
  for (const [file, meta] of Object.entries(outputs)) {
    const buf = await readFile(path.resolve(dir, file)); const g = gz(buf);
    if (file.endsWith('.js')) { res.jsMin += buf.length; res.jsGz += g; res.chunks++; if (meta.entryPoint?.endsWith('entry.mjs')) res.entryGz = g; }
    else if (file.endsWith('.css')) res.cssGz += g;
    else if (!file.endsWith('.map')) { res.assetsRaw += buf.length; res.assetsGz += g; }
  }
  const seen = new Set();
  const walk = (f) => { if (seen.has(f)) return; seen.add(f); for (const im of outputs[f]?.imports || []) if (im.kind === 'import-statement' && !im.external) walk(im.path); };
  const entryOut = Object.keys(outputs).find((f) => outputs[f].entryPoint?.endsWith('entry.mjs'));
  if (entryOut) walk(entryOut);
  for (const f of seen) res.initialGz += gz(await readFile(path.resolve(dir, f)));
  for (const a of assets) { const buf = await readFile(path.join(root, 'node_modules', a)); res.assetsRaw += buf.length; res.assetsGz += gz(buf); }
  const pkgs = new Set();
  for (const input of Object.keys(result.metafile.inputs)) { const m = input.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/g); if (m) pkgs.add(m[m.length - 1].replace('node_modules/', '')); }
  res.packages = pkgs.size;
  return res;
}

// ── Verdict flags ───────────────────────────────────────────────────────────────────────────────
export function flagsFor({ reg, lic, act, size, adopt }) {
  const red = [], amber = [];
  const osiPlain = /^(MIT|ISC|Apache-2\.0|BSD-[23]-Clause|Unlicense)$/.test(lic?.classified || '');
  if (!lic || /NO LICENCE/.test(lic.classified)) red.push('no licence file anywhere: all rights reserved by default');
  else if (/custom|proprietary/.test(lic.classified)) red.push(`licence is not open source (${lic.classified}): read it; ${lic.evidence?.[0] || ''}`.trim());
  else if (/AGPL|GPL-|GPL\+|EPL|dual/.test(lic.classified)) red.push(`copyleft or dual licence (${lic.classified}): a closed-source product needs a commercial licence or legal sign-off`);
  else if (!osiPlain) amber.push(`licence needs reading: ${lic.classified}${lic.evidence?.length ? ' — ' + lic.evidence[0] : ''}`);
  if (lic && reg?.licenseField && osiPlain && reg.licenseField !== lic.classified && !String(reg.licenseField).includes(lic.classified)) amber.push(`package.json says ${reg.licenseField} but the file says ${lic.classified}`);
  if (/MPL/.test(lic?.classified || '')) amber.push('MPL-2.0: file-level copyleft — changes to the library files must be published; your own code is unaffected');
  if (lic?.readmeCommercial) amber.push('README mentions a paid tier: ' + lic.readmeCommercial);
  if (!act) amber.push('no GitHub repository in package.json: activity unknown (pass --repo owner/name)');
  if (reg?.deprecated) red.push('deprecated on npm: ' + reg.deprecated.slice(0, 120));
  if (lic?.readmeNotice) red.push('README: ' + lic.readmeNotice);
  if (reg?.hasInstallScript) amber.push('runs an install script (check what it does)');
  const ageDays = reg?.latestDate ? (Date.now() - new Date(reg.latestDate)) / DAY : 0;
  if (act && !act.error) {
    if (act.commits12m === 0 && ageDays > 365) red.push(`dormant: no commit in 12 months, last release ${reg.latestDate}`);
    else if (act.humanCommits12m < 12 && ageDays > 270) amber.push(`low activity: ${act.humanCommits12m} human commits in 12 months, last release ${reg.latestDate}`);
    if (act.topShare >= 90 && act.humanCommits12m >= 10) amber.push(`bus factor 1: ${act.topAuthor} made ${act.topShare}% of human commits`);
  }
  if (/^0\./.test(reg?.latest || '') && reg?.releases12m > 30) amber.push(`pre-1.0 with ${reg.releases12m} releases in 12 months: expect breaking changes`);
  if (size?.ok && size.initialGz > 150 * 1024) amber.push(`heavy: ${(size.initialGz / 1024).toFixed(0)} KB gz initial JS — lazy-load it behind the route or interaction that needs it`);
  if (size?.ok && size.assetsGz > 300 * 1024) amber.push(`ships ${(size.assetsGz / 1024).toFixed(0)} KB gz of WASM/assets`);
  if (adopt && adopt.weeklyDownloads != null && adopt.weeklyDownloads < 2000) amber.push(`little adoption: ${adopt.weeklyDownloads} downloads a week`);
  return { red, amber };
}

// ── CLI ─────────────────────────────────────────────────────────────────────────────────────────
async function main() {
  const argv = process.argv.slice(2);
  const opt = (k) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : null);
  const json = argv.includes('--json');
  if (argv.includes('--search')) {
    const rows = await search(opt('--search'), +(opt('--size-limit') || 12));
    if (json) return console.log(JSON.stringify(rows, null, 1));
    for (const r of rows) console.log(`${String(r.weekly).padStart(10)}/wk  ${r.date}  ${r.name}@${r.version}  — ${r.description}`);
    return;
  }
  const names = argv.filter((a, i) => !a.startsWith('--') && !['--repo', '--entry', '--size-limit', '--search'].includes(argv[i - 1]));
  if (!names.length) { console.log('usage: node libcheck.mjs <package> [--repo owner/name] [--size] [--entry "<js>"] [--json] | --search "<words>"'); process.exit(1); }
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'libcheck-'));
  const out = [];
  for (const arg of names) {
    // `name=owner/repo` overrides the repository for one package; --repo does so when only one is given.
    const [name, repoArg] = arg.split('=');
    const reg = await registry(name);
    if (reg.error) { out.push({ name, error: reg.error }); continue; }
    const repo = repoArg || (names.length === 1 && opt('--repo')) || (reg.repository.match(/github\.com[/:]([^/]+\/[^/#]+)/)?.[1] ?? null);
    const [lic, act, adopt] = await Promise.all([packLicence(name, reg.latest, repo, tmp), activity(repo, path.join(tmp, 'git')), adoption(name)]);
    let size = null;
    if (argv.includes('--size')) {
      const root = path.join(tmp, 'size-' + name.replace(/[@/]/g, '_'));
      await mkdir(root, { recursive: true });
      await writeFile(path.join(root, 'package.json'), '{"private":true}');
      await run('npm', ['install', '--silent', '--ignore-scripts', '--no-audit', '--no-fund', '--legacy-peer-deps', `${name}@${reg.latest}`, 'esbuild'], { cwd: root, maxBuffer: 64 << 20, timeout: 600000 });
      size = await bundleCost(opt('--entry') || `export * from '${name}';`, { root, buildDir: path.join(root, 'build') });
    }
    const flags = flagsFor({ reg, lic, act, size, adopt });
    out.push({ name, registry: reg, adoption: adopt, licence: lic, activity: act, size, ...flags });
  }
  await rm(tmp, { recursive: true, force: true });
  if (json) return console.log(JSON.stringify(out, null, 1));
  const kb = (b) => (b / 1024).toFixed(1) + ' KB';
  for (const r of out) {
    if (r.error) { console.log(`\n${r.name}: ${r.error}`); continue; }
    const { registry: g, licence: l, activity: a, size: s, adoption: d } = r;
    console.log(`\n${r.name}@${g.latest}  (${g.latestDate}; ${g.releases12m} releases in 12 months; ${g.deps} deps${g.peerDeps.length ? '; peers ' + g.peerDeps.join(', ') : ''})`);
    if (d) console.log(`  adoption  ${d.weeklyDownloads?.toLocaleString('en')} downloads/week · ${d.dependents ?? '?'} dependents`);
    console.log(`  licence   ${l.classified}  [${l.source}: ${l.file ?? '—'}]  package.json: ${g.licenseField}`);
    for (const e of l.evidence || []) console.log(`            ${e}`);
    if (a && !a.error) console.log(`  activity  ${a.repo}: ${a.humanCommits12m} human commits / 12 months, ${a.authors12m} authors, top ${a.topAuthor} ${a.topShare ?? '—'}%, last commit ${a.lastCommit}`);
    else if (a?.error) console.log(`  activity  ${a.repo}: ${a.error}`);
    if (s) console.log(s.ok ? `  size      initial ${kb(s.initialGz)} gz · all JS ${kb(s.jsGz)} · CSS ${kb(s.cssGz)} · assets ${kb(s.assetsGz)} · ${s.packages} packages` : `  size      build failed: ${s.error} (pass --entry with a real import)`);
    for (const x of r.red) console.log(`  RED       ${x}`);
    for (const x of r.amber) console.log(`  AMBER     ${x}`);
    if (!r.red.length && !r.amber.length) console.log('  no flags  (still try its keyboard and screen-reader behaviour in a demo before committing)');
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main().catch((e) => { console.error(e); process.exit(1); });
