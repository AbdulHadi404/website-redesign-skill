// Registry, licence-file and repository-activity readers for the catalogue.
// Needs network for the npm registry and GitHub over git (no GitHub API: it is not reachable here).
import { readFile, readdir, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
const run = promisify(execFile);

export const CUTOFF = '2025-09-28'; // twelve months before the lab date (2026-09-28)

// ── npm registry: version, publish dates, releases in the last 12 months, dependencies, deprecation
export async function registry(name) {
  const r = await fetch('https://registry.npmjs.org/' + name.replace('/', '%2F'));
  if (!r.ok) return { name, error: 'HTTP ' + r.status };
  const j = await r.json();
  const latest = j['dist-tags']?.latest;
  const m = j.versions?.[latest] || {};
  const since = new Date(CUTOFF).getTime();
  const versions = Object.entries(j.time || {}).filter(([v]) => v !== 'created' && v !== 'modified' && j.versions?.[v]);
  const inWindow = versions.filter(([, t]) => new Date(t).getTime() >= since);
  const stable = (v) => !/-/.test(v);
  const lastStable = versions.filter(([v]) => stable(v)).sort((a, b) => new Date(b[1]) - new Date(a[1]))[0];
  return {
    name, latest, latestDate: (j.time?.[latest] || '').slice(0, 10),
    lastStable: lastStable?.[0] || null, lastStableDate: lastStable?.[1]?.slice(0, 10) || null,
    releases12m: inWindow.length, stableReleases12m: inWindow.filter(([v]) => stable(v)).length,
    licenseField: typeof m.license === 'string' ? m.license : m.license?.type ?? null,
    deprecated: m.deprecated || null,
    deps: Object.keys(m.dependencies || {}).length, peerDeps: Object.keys(m.peerDependencies || {}),
    unpackedSize: m.dist?.unpackedSize ?? null,
    repository: String(m.repository?.url || m.repository || '').replace(/^git\+|\.git$/g, ''),
    firstPublished: (j.time?.created || '').slice(0, 10),
  };
}

// ── Licence: read the file shipped in the installed package (= the npm tarball) and classify its text.
// When the package ships no licence file, fall back to the repository's root licence (raw.githubusercontent.com)
// and say so: what the package.json field claims is not evidence.
const isLicenceFile = (f) => /(^|[-_.])(licen[cs]e|copying)([-_.]|$)/i.test(f) && !/\.(js|mjs|cjs|ts|map|json)$/i.test(f);
const TESTS = [
  ['MPL-2.0', /Mozilla Public License,?\s*(Version|v\.?)\s*2\.0/i],
  ['EPL-2.0', /Eclipse Public License[^\n]{0,20}(v|version)\s*2\.0/i],
  ['AGPL-3.0', /GNU AFFERO GENERAL PUBLIC LICENSE|Affero General Public License v3/],  // case-sensitive: GPL-3.0 §13 names the AGPL in mixed case
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
const OSI = new Set(['MPL-2.0', 'EPL-2.0', 'AGPL-3.0', 'LGPL-3.0', 'GPL-3.0', 'GPL-2.0', 'Apache-2.0', 'ISC', 'BSD-3-Clause', 'BSD-2-Clause', 'MIT', 'Unlicense']);
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
  // Title check for markdown copies of the AGPL ("# GNU Affero General Public License / Version 3").
  const agplTitle = /GNU Affero General Public License/i.test(flat.slice(0, 400));
  const classes = TESTS.filter(([id, re]) => re.test(flat) || (id === 'AGPL-3.0' && agplTitle)).map(([id]) => id).filter((id, i, a) => !(id === 'BSD-2-Clause' && a.includes('BSD-3-Clause')));
  const flags = FLAGS.filter(([, re]) => re.test(flat)).map(([id]) => id);
  // MPL-2.0 names GPL/LGPL/AGPL as "Secondary Licenses": those mentions are not a second licence.
  const own = classes.includes('MPL-2.0') ? ['MPL-2.0', ...classes.filter((c) => !/GPL/.test(c) && c !== 'MPL-2.0')] : classes;
  const gpl = own.find((c) => /GPL/.test(c));
  const dualCommercial = gpl && /or (a |the )?commercial|commercial licen[cs]e|Terms & Conditions of Use/i.test(flat);
  let classified;
  if (!own.length) classified = flags.some((f) => STRONG.has(f) || f === 'proprietary' || f === 'commercial') ? 'custom / proprietary' : 'custom';
  else if (dualCommercial) classified = `${gpl}${/or later|or-later|any later version/i.test(flat) ? '+' : ''} or commercial (dual)`;
  else if (own.length > 1) classified = own.join(' + ') + ' (several licences in one file)';
  else classified = own[0];
  // For a plain OSI text, only strong signals are worth a reader's attention (every licence says "commercial").
  let shown = own.length && OSI.has(own[0]) && !dualCommercial ? flags.filter((f) => STRONG.has(f)) : flags;
  // The GPL texts themselves say "noncommercially", "proprietary" and "production"; those are not restrictions.
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

async function repoLicence(repo) {
  if (!repo) return null;
  for (const f of ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENCE', 'LICENCE.md', 'license', 'license.md', 'License.md', 'COPYING']) {
    const r = await fetch(`https://raw.githubusercontent.com/${repo}/HEAD/${f}`).catch(() => null);
    if (r?.ok) return { file: `github.com/${repo}/${f}`, text: await r.text() };
  }
  return null;
}

export async function licence(root, pkg, repo) {
  const dir = path.join(root, 'node_modules', pkg);
  if (!existsSync(dir)) return { pkg, error: 'not installed' };
  const files = (await readdir(dir)).filter(isLicenceFile);
  let source = 'package', file = files.join(', '), text;
  if (files.length) text = (await Promise.all(files.map((f) => readFile(path.join(dir, f), 'utf8')))).join('\n\n');
  // A shipped file that only points at the repository licence ("licensed under the [x license](github…)") is followed.
  if (files.length && text.length < 400 && /github\.com\/[^\s)]+licen[cs]e/i.test(text)) {
    const r = await repoLicence(repo);
    if (r) { source = 'repo root (package file is a pointer)'; file = r.file; text = r.text; }
  }
  if (!files.length) {
    const r = await repoLicence(repo);
    if (!r) return { pkg, source: 'none', file: null, classified: 'NO LICENCE FILE (package or repo root)' };
    source = 'repo root (package ships none)'; file = r.file; text = r.text;
  }
  return { pkg, source, file, bytes: text.length, ...classifyLicenceText(text) };
}

// ── Repository activity over git (treeless, shallow-since): commits on the default branch in the last
// 12 months, distinct human authors, top author's share, last commit date.
const BOT = /\[bot\]|github-actions|dependabot|renovate|changeset|semantic-release|greenkeeper|actions-user|release-please|autofix|copilot/i;
export async function activity(repo, cacheDir) {
  if (!repo) return null;
  const dir = path.join(cacheDir, repo.replace('/', '__'));
  const url = `https://github.com/${repo}`;
  await mkdir(cacheDir, { recursive: true });
  if (!existsSync(dir)) {
    try {
      await run('git', ['clone', '-q', '--bare', '--single-branch', '--filter=tree:0', `--shallow-since=${CUTOFF}`, url, dir], { timeout: 240000 });
    } catch (e) {
      // No commit since the cutoff makes --shallow-since fail: fetch the last commit only.
      try { await run('git', ['clone', '-q', '--bare', '--single-branch', '--filter=tree:0', '--depth=1', url, dir], { timeout: 240000 }); }
      catch (e2) { return { repo, error: String(e2.stderr || e2.message).split('\n')[0] }; }
    }
  }
  const { stdout } = await run('git', ['-C', dir, 'log', `--since=${CUTOFF}`, '--format=%an|%ae|%cI'], { maxBuffer: 64 << 20 });
  const last = (await run('git', ['-C', dir, 'log', '-1', '--format=%cI'])).stdout.trim().slice(0, 10);
  const rows = stdout.trim() ? stdout.trim().split('\n').map((l) => l.split('|')) : [];
  const human = rows.filter(([n, e]) => !BOT.test(n) && !BOT.test(e));
  const by = {};
  for (const [n] of human) by[n] = (by[n] || 0) + 1;
  const top = Object.entries(by).sort((a, b) => b[1] - a[1]);
  return {
    repo, commits12m: rows.length, humanCommits12m: human.length, authors12m: top.length,
    topAuthor: top[0]?.[0] || null, topShare: human.length ? Math.round((top[0][1] / human.length) * 100) : null,
    lastCommit: last,
  };
}

// ── README maintenance notices shipped in the package
export async function readmeNotice(root, pkg) {
  const dir = path.join(root, 'node_modules', pkg);
  if (!existsSync(dir)) return null;
  const f = (await readdir(dir)).find((x) => /^readme(\.md)?$/i.test(x));
  if (!f) return null;
  const t = await readFile(path.join(dir, f), 'utf8');
  const m = t.match(/[^\n]{0,80}(unmaintained|no longer (being )?maintained|not (actively )?maintained|looking for (new )?maintainers|deprecated in favou?r|archived)[^\n]{0,80}/i);
  return m ? m[0].trim().slice(0, 200) : null;
}
