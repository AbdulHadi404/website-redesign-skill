#!/usr/bin/env node
/**
 * libcheck.mjs — judge an npm CODE library in minutes before building hard UI on it: licence class with the restrictive
 * sentences quoted, releases, activity, adoption and size. Flags are triage for a human to read, never a gate.
 *
 *   node libcheck.mjs <package>[@version][=owner/repo] [<package> …]    # latest, or that version's tarball
 *   node libcheck.mjs react-resizable-panels --size                      # + bundle cost of `export * from '<package>'`
 *   node libcheck.mjs @dnd-kit/core --size --entry "export { DndContext } from '@dnd-kit/core';"   # a realistic import
 *   node libcheck.mjs some-lib --repo owner/name                         # when package.json names no GitHub repository
 *   node libcheck.mjs vaul lexical --json                                # machine-readable, one object per package
 *   node libcheck.mjs --search "resizable panels" [--size-limit 12]      # candidate NAMES only (see below)
 *
 * Scope: CODE libraries (npm packages you import). Icons, fonts, photos and other assets are checked by hand
 * (resources/README.md): libcheck recognises the OFL and Creative Commons texts only so that it does not mislabel them.
 * Licence readings are engineering triage, not legal advice.
 *
 * For each package, from primary sources only:
 *   release    latest version and date; in the last 12 months: stable releases, pre-releases (nightly/canary/beta,
 *              counted apart) and breaking-by-semver versions (a new 0.MINOR line before 1.0, a new MAJOR after);
 *              deprecation, direct dependencies, peers, install scripts
 *   adoption   weekly downloads and dependents (npm search API) — not a quality signal, only context
 *   licence    the licence text shipped in the tarball (npm pack), classified from its words. The package.json field is
 *              used only when no text exists, or when the shipped file is not this package's licence (third-party
 *              notices, a multi-licence repository notice) — and a field naming commercial terms beside a permissive
 *              file is reported as a conflict, not resolved. An SPDX OR expression in the field ("(MIT OR
 *              GPL-3.0-or-later)") is the licensee's choice: the class is the best alternative's, provided the file
 *              names no licence outside the expression and no commercial terms. AND expressions and prose ("Dual
 *              licensed under the MIT or GPL") are not read as a choice. A pointer file or a missing file falls back to
 *              the repository's root licence. Licence documents that are not text (a PDF EULA) are named, not read.
 *   activity   the repository over git (treeless, shallow since 12 months ago): commits, human authors, the top
 *              author's share (bus factor), last commit; "unmaintained/archived/deprecated" notices about THIS package
 *              in the package README or the repository README
 *   size       (--size) esbuild + gzip of a minimal entry (--entry for a realistic one), React/Vue/Svelte external:
 *              initial vs lazy JS, CSS, WASM and other assets, how many npm packages end up in the bundle
 * It ends with the licence class, as in resources/README.md — A ship · B ship with a condition (MPL/EPL notices,
 * CC BY credit) · C only with a human decision recorded in DESIGN.md (copyleft, brand decision, procurement) · D reject
 * (no licence anywhere, non-commercial only, placeholder package) · ? read it — and RED / AMBER flags:
 *   RED    do not adopt until someone has read the quoted evidence and decided (for a purchase, the client decides:
 *          write it into DESIGN.md as a question);
 *   AMBER  write it down and mitigate (pin the version, wrap it, lazy-load it).
 * The exit code is 0 whatever the flags; 1 only when a package could not be checked (not on npm, no such version,
 * network). Then read the README and the last three changelog entries, and try its keyboard and screen-reader
 * behaviour in a demo before committing.
 *
 * Evidence (research/stage2/streams/S4-capability-catalogue.md, F1 and "Changes after review"): 34 regression cases
 * (the reviewer's wrong verdicts and the F1 licence traps), 15/16 right on held-out packages at the first run. At
 * promotion, 52 more held-out packages (32 in common use, 20 commercial) turned up 8 wrong verdicts from 6 causes:
 * third-party notices read as the package's own licence (2), a commercial package.json field beside a permissive file
 * that was not the package's (2: a copied MIT file, an examples repository's root licence), a PDF EULA read as text, a
 * pointer to a purchase page, a licence folder that crashed it, and a sentence denying a licence key read as a paid
 * tier. Each is fixed and is a regression case (tools/regress.mjs, group libcheck), as is a README saying the build
 * runs in trial mode; add every future wrong verdict there. After the fixes 65 of the 68 held-out packages get the
 * verdict a careful reader gives; two stay cautious (a licence that only links to a licensing page reads "?", read
 * it; a commercial package with no licence text anywhere reads D) and one is not on the public registry. None of those
 * 68 had an OR expression: a review found jszip and node-forge read C and dompurify B. On 25 more packages (17 with
 * dual-licence fields, 8 controls: AND expressions, GPL with commercial terms), 16 matched a careful reader before the
 * OR rule and 23 after; ckeditor4 4.22.1 stays C (its file adds LTS commercial terms beside the choice) and
 * jquery-ui-touch-punch "?" (prose field, no text). The same review found that two versions of one package checked in
 * one run read each other's licence files; each check now has its own folder.
 *
 * --search ranks npm text-search results by weekly downloads (npm's own score fields are constant and carry no signal)
 * and prints the top ones with their last publish date. It yields candidate NAMES only, with a measured miss rate
 * (S4 lab, 18 designer queries: no recommended leader in the top 12 for 7, only some of them for 5 more), and surfaces
 * vendor subpackages, dormant packages and unrelated CLI tools. Look first in the skill's hard-ui.md, the component
 * lists of the primitive layer in use, and the dependency lists of products that already do it well.
 *
 * Needs Node 18+, npm and git, and network access to registry.npmjs.org, github.com and raw.githubusercontent.com;
 * --size runs `npm install` (scripts ignored) into a temporary folder.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readdir, readFile, writeFile, mkdir, rm, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const run = promisify(execFile);
const DAY = 86400000;
// Every request has a time limit: an unreachable host must end in an error line, not a hang.
const get = (url) => fetch(url, { signal: AbortSignal.timeout(30000) });
export const today = () => new Date();
export const cutoffDate = (months = 12) => new Date(Date.now() - months * 30.44 * DAY).toISOString().slice(0, 10);

// ── npm registry ────────────────────────────────────────────────────────────────────────────────
/** Registry facts for `name`; release counts are for the whole package, dependencies and fields for `version` (default latest). */
export async function registry(name, cutoff = cutoffDate(), version = null) {
  let r;
  try { r = await get('https://registry.npmjs.org/' + name.replace('/', '%2F')); } catch (e) { return { name, error: `registry.npmjs.org unreachable (${e.cause?.code || e.name})` }; }
  if (!r.ok) return { name, error: 'HTTP ' + r.status + (r.status === 404 ? ' (no such package on npm)' : '') };
  const j = await r.json();
  const latest = j['dist-tags']?.latest;
  const m = j.versions?.[version || latest] || {};
  const since = new Date(cutoff).getTime();
  const versions = Object.entries(j.time || {}).filter(([v]) => j.versions?.[v]).sort((a, b) => new Date(a[1]) - new Date(b[1]));
  const inWindow = versions.filter(([, t]) => new Date(t).getTime() >= since);
  const stable = (v) => !/-/.test(v);
  // Breaking-by-semver versions: a new 0.MINOR line before 1.0, a new MAJOR after it. A line counts when its
  // first stable release falls inside the window. Nightly/canary/beta tags are counted separately (preReleases12m).
  const lineOf = (v) => { const [ma, mi] = v.split('.'); return ma === '0' ? `0.${mi}` : ma; };
  const firstOfLine = new Map();
  for (const [v, t] of versions) if (stable(v) && !firstOfLine.has(lineOf(v))) firstOfLine.set(lineOf(v), new Date(t).getTime());
  const breaking12m = [...firstOfLine.values()].filter((t) => t >= since).length;
  const out = {
    name, latest, latestDate: (j.time?.[latest] || '').slice(0, 10),
    releases12m: inWindow.length, stableReleases12m: inWindow.filter(([v]) => stable(v)).length,
    preReleases12m: inWindow.filter(([v]) => !stable(v)).length, breaking12m,
    licenseField: typeof m.license === 'string' ? m.license : m.license?.type ?? null,
    deprecated: m.deprecated || null,
    deps: Object.keys(m.dependencies || {}).length, depNames: Object.keys(m.dependencies || {}), peerDeps: Object.keys(m.peerDependencies || {}),
    hasInstallScript: !!(m.scripts?.postinstall || m.scripts?.install || m.scripts?.preinstall),
    repository: String(m.repository?.url || m.repository || '').replace(/^git\+|\.git$/g, ''),
    firstPublished: (j.time?.created || '').slice(0, 10),
  };
  Object.defineProperty(out, 'hasVersion', { value: (v) => !!j.versions?.[v], enumerable: false }); // kept out of --json
  return out;
}

export async function adoption(name) {
  // The search endpoint rate-limits bursts: retry with backoff instead of silently reporting nothing.
  let r = null;
  for (let i = 0; i < 4 && !r?.ok; i++) {
    if (i) await new Promise((ok) => setTimeout(ok, 1500 * 2 ** i));
    r = await get(`https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(name)}&size=20`).catch(() => null);
  }
  if (!r?.ok) return { error: 'npm search unavailable (HTTP ' + (r?.status ?? 'network') + ')' };
  const j = await r.json();
  const o = j.objects.find((x) => x.package.name === name);
  return o ? { weeklyDownloads: o.downloads?.weekly ?? null, monthlyDownloads: o.downloads?.monthly ?? null, dependents: o.dependents ?? null } : null;
}

export async function search(text, limit = 12) {
  const r = await get(`https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(text)}&size=250`);
  if (!r.ok) throw new Error(`npm search: HTTP ${r.status}`);
  const j = await r.json();
  // npm's own score fields are constant (1/1/1) and its ranking mixes in huge unrelated utilities when sorted by
  // downloads, so keep only packages whose name, description or keywords contain every query word (stemmed to
  // its first 5 letters: "resizable" matches "resize"), then rank those by weekly downloads.
  const words = text.toLowerCase().split(/\s+/).filter((w) => w.length > 2).map((w) => w.slice(0, 5));
  return j.objects
    .map((o) => ({ name: o.package.name, version: o.package.version, date: (o.package.date || '').slice(0, 10), weekly: o.downloads?.weekly ?? 0, dependents: o.dependents ?? 0, description: (o.package.description || '').slice(0, 90), hay: [o.package.name, o.package.description, ...(o.package.keywords || [])].join(' ').toLowerCase() }))
    .filter((o) => words.every((w) => o.hay.includes(w)))
    .sort((a, b) => b.weekly - a.weekly).slice(0, limit)
    .map(({ hay, ...o }) => o);
}

// ── Licence text ────────────────────────────────────────────────────────────────────────────────
// Scope: code libraries. The asset licences that code packages commonly ship (OFL fonts, Creative Commons
// icons and images) are recognised so they are not mistaken for "no licence" or for MIT, but assets
// themselves are checked by hand (resources/README.md). Order matters: more specific texts first.
const TESTS = [
  ['MPL-2.0', /Mozilla Public License,?\s*(Version|v\.?)\s*2\.0/i],
  ['EPL-2.0', /Eclipse Public License[^\n]{0,20}(v|version)\s*2\.0/i],
  ['OFL-1.1', /SIL OPEN FONT LICEN[CS]E,?\s*(Version\s*)?1\.1/i], // before MIT: the OFL also says "Permission is hereby granted, free of charge"
  ['CC-BY-NC', /Creative Commons[^\n]{0,60}Non-?Commercial|\bCC[- ]BY[- ]NC\b/i],
  ['CC-BY-SA', /Creative Commons Attribution[- ]Share-?Alike|\bCC[- ]BY[- ]SA\b/i],
  ['CC-BY', /Creative Commons Attribution \d\.\d|Attribution \d\.\d International|\bCC[- ]BY[- ]\d\.\d/i],
  ['CC0-1.0', /\bCC0\b|Creative Commons Zero|CC0 1\.0 Universal/i],
  ['AGPL-3.0', /GNU AFFERO GENERAL PUBLIC LICENSE|Affero General Public License v3/], // case-sensitive: GPL-3.0 §13 names the AGPL in mixed case
  ['LGPL-3.0', /GNU LESSER GENERAL PUBLIC LICENSE\s+Version 3/i],
  ['GPL-3.0', /GNU GENERAL PUBLIC LICENSE\s+Version 3|\bGPLv3\b/i],
  ['GPL-2.0', /GNU GENERAL PUBLIC LICENSE\s+Version 2|General Public License Version 2/i],
  ['Apache-2.0', /Apache License,?\s*(Version\s*)?2\.0/i],
  ['ISC', /Permission to use, copy, modify, and\/?or distribute this software for any\s+purpose/i],
  ['BSD-3-Clause', /Redistribution and use in source and binary forms[\s\S]*Neither the name/i],
  ['BSD-2-Clause', /Redistribution and use in source and binary forms/i],
  // The MIT grant itself, not just its first words: Remotion's licence and the OFL open with the same phrase.
  ['MIT', /Permission is hereby granted, free of charge, to any person obtaining a copy\s+of this software/i],
  ['Unlicense', /This is free and unencumbered software released into the public domain/i],
];
const OSI = new Set(TESTS.map(([id]) => id).filter((id) => !/^CC|OFL/.test(id)));
const PERMISSIVE = /^(MIT|ISC|Apache-2\.0|BSD-[23]-Clause|0BSD|Unlicense|CC0-1\.0|OFL-1\.1)$/;
const FLAGS = [
  ['licence-key', /licen[cs]e key/i], ['watermark', /watermark/i],
  // Highcharts' file only points at "the Highsoft Standard License Agreement found at <url>".
  ['vendor-agreement', /(governed by|subject to)[^.]{0,60}(Licen[cs]e Agreement|EULA|End-User Licen[cs]e)/i],
  ['revenue-cap', /(annual|gross) (revenue|turnover)|revenue (of|below|under|above|exceed)|\$\s?\d+\s?(k|m|million)\b.{0,40}(revenue|funding)/i],
  ['headcount-cap', /(up to|fewer than|less than|more than|over|under)\s*\d+\s*(employees|people|developers|individuals)|\d+ (or fewer|or less|or more) (employees|people|developers)|headcount/i],
  ['trial', /\btrial\b|evaluation (period|purposes|licen[cs]e)/i],
  ['time-limited', /\bfor \d+ days\b|\b\d+[- ]day (trial|evaluation)|after \d+ days/i],
  // Not "licence fee" alone: the GPL-3.0 says "You may not impose a license fee".
  // …and a link to a purchase page (AnyChart's LICENCE: "available under different licenses … Read more at http://www.anychart.com/buy/").
  ['paid', /\bsubscription\b|\bper (developer|seat)\b|purchase (a |the )?(commercial )?licen[cs]e|licen[cs]e fees? (is|are) (payable|due)|https?:\/\/[^\s)>\]]*\/(buy|pricing|purchase)\b/i],
  // "Commercial and Non-Commercial Use" (a grant) is not a restriction: only NC-only wording counts.
  ['non-commercial', /non-?commercial (use |purposes )?only|only (for |in )?non-?commercial|for non-?commercial (use|purposes)|\bNonCommercial\b|not for commercial|non-?commercial licen[cs]e/i],
  ['keep-logo', /(logo|watermark|attribution|made with)[^.]{0,120}(must|shall|remain|visible|not be removed)/i],
  ['production-restricted', /(in|for) production|production (use|environment|deployment)/i],
  ['no-competing', /compet(e|ing|itor)/i], ['commercial', /\bcommercial licen[cs]e|paid licen[cs]e|purchase/i],
  ['proprietary', /\bproprietary\b|all rights reserved/i],
  // Remix Icon v1.0: "You may NOT use the Icons … as a logo, trademark, or brand identifier" (class C in resources/README.md).
  ['no-logo-use', /(may not|must not|shall not|prohibited)[^.]{0,160}\b(as )?(a )?(logo|brand identi\w*)/i],
];
// Flags that make a licence a purchase or a client decision even when an open-source phrase also matched.
export const PROCUREMENT = new Set(['licence-key', 'vendor-agreement', 'watermark', 'revenue-cap', 'headcount-cap', 'trial', 'time-limited', 'paid', 'keep-logo']);
const STRONG = new Set([...PROCUREMENT, 'non-commercial', 'no-logo-use']);
// A sentence that restricts is better evidence than one that grants.
const RESTRICTS = /\b(not|no|never|only|must|shall|prohibit\w*|requires?|without|after|unless|may not|cannot)\b/i;

export function classifyLicenceText(text) {
  // A file whose first section is a proprietary licence and whose later sections are notices for bundled
  // third-party code (mapbox-gl: "Mapbox TOS … All rights reserved", then BSD-3-Clause and MIT notices) is
  // the first section's licence.
  const sections = text.split(/\n\s*[-=_*]{10,}\s*\n/);
  if (sections.length > 1 && sections[0].trim().length > 200) {
    const head = classifyText(sections[0]);
    if (!head.classes.length && head.flags.length) return { ...head, classified: head.classified + ' (later sections: third-party notices)' };
  }
  return classifyText(text);
}

function classifyText(text) {
  const flat = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const agplTitle = /GNU Affero General Public License/i.test(flat.slice(0, 400));
  let classes = TESTS.filter(([id, re]) => re.test(flat) || (id === 'AGPL-3.0' && agplTitle)).map(([id]) => id)
    .filter((id, i, a) => !(id === 'BSD-2-Clause' && a.includes('BSD-3-Clause')));
  // Creative Commons variants contain each other's words: keep the most restrictive one named.
  if (classes.includes('CC-BY-NC')) classes = classes.filter((c) => c !== 'CC-BY-SA' && c !== 'CC-BY');
  if (classes.includes('CC-BY-SA')) classes = classes.filter((c) => c !== 'CC-BY');
  // The OFL is complete on its own; a font licence file that also quotes MIT-like words is still the OFL.
  if (classes.includes('OFL-1.1')) classes = ['OFL-1.1', ...classes.filter((c) => c !== 'OFL-1.1' && c !== 'MIT')];
  const flags = FLAGS.filter(([, re]) => re.test(flat)).map(([id]) => id);
  // MPL-2.0 names the GPL family as "Secondary Licenses": those mentions are not a second licence.
  const own = classes.includes('MPL-2.0') ? ['MPL-2.0', ...classes.filter((c) => !/GPL/.test(c) && c !== 'MPL-2.0')] : classes;
  const gpl = own.find((c) => /GPL/.test(c));
  const dualCommercial = gpl && /or (a |the )?commercial|commercial licen[cs]e|Terms & Conditions of Use/i.test(flat);
  let classified;
  if (!own.length) classified = flags.some((f) => PROCUREMENT.has(f) || ['proprietary', 'commercial', 'non-commercial'].includes(f)) ? 'custom / proprietary' : flags.includes('no-logo-use') ? 'custom (restricted use)' : 'custom';
  else if (dualCommercial) classified = `${gpl}${/or later|or-later|any later version/i.test(flat) ? '+' : ''} or commercial (dual)`;
  else if (own.length > 1) classified = own.join(' + ') + ' (several licences in one file)';
  else classified = own[0];
  let shown = own.length && !dualCommercial ? flags.filter((f) => STRONG.has(f)) : flags;
  if (gpl) shown = shown.filter((f) => !['non-commercial', 'proprietary', 'production-restricted', 'no-competing'].includes(f));
  if (own.length && shown.length && !dualCommercial) classified += ' + ' + shown.join(', ');
  // Evidence: the words around each match (licences in Markdown have lists, not sentences), preferring a
  // passage that restricts ("may NOT", "requires", "after 60 days") over one that grants.
  const evidence = [];
  for (const [id, re] of FLAGS) {
    if (!shown.includes(id)) continue;
    const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    const windows = [...flat.matchAll(g)].slice(0, 20).map((m) => {
      let a = Math.max(0, m.index - 110), b = Math.min(flat.length, m.index + m[0].length + 150);
      const dot = flat.lastIndexOf('. ', m.index); if (dot >= a) a = dot + 2;
      return flat.slice(a, b).trim();
    });
    const sn = windows.find((x) => RESTRICTS.test(x) && /\d/.test(x)) || windows.find((x) => RESTRICTS.test(x)) || windows[0];
    if (sn) evidence.push(`[${id}] …${sn}…`);
  }
  return { classified, classes: own, flags: shown, head: flat.slice(0, 200), evidence: evidence.slice(0, 6) };
}

export const isLicenceFile = (f) => /(^|[-_.])(licen[cs]e|copying|eula)([-_.]|$)/i.test(f) && !/\.(js|mjs|cjs|ts|map|json)$/i.test(f);
const BINARY_DOC = /\.(pdf|docx?|rtf|odt|pages)$/i;

// A licence file that says it covers only the third-party code bundled with the package is not the package's own
// licence (@mescius/spread-sheets: "This document applies to the third party software included with this package.
// See SpreadJS-EULA.txt for SPREADJS full End User License Agreement", followed by MIT notices for JSZip and others).
export function thirdPartyOnly(text) {
  const head = String(text).replace(/^\uFEFF/, '').slice(0, 400).replace(/\s+/g, ' ');
  const m = head.match(/[^.]*\b(?:(?:applies|apply|pertains|relates) to (?:the )?(?:third|3rd)[- ]party|(?:third|3rd)[- ]party (?:software )?notices?\b|licen[cs]es? (?:of|for) (?:the )?(?:third|3rd)[- ]party)[^.]*\.?/i);
  return m ? m[0].trim().slice(0, 200) : null;
}

// A package.json field that names commercial terms: "Commercial", "UNLICENSED", "proprietary", a EULA or a purchase
// page ("http://www.fusioncharts.com/buy/", "SEE LICENSE IN <http://www.anychart.com/buy>"). A field that only points
// at a file ("SEE LICENSE IN LICENSE.md") is not one.
export const restrictiveField = (f) => !!f && /^\s*(UNLICENSED|proprietary|commercial)\s*$|eula|\bbuy\b|purchase|pricing|commercial|proprietary|licen[cs]e[- _]?agreement/i.test(String(f));

export async function repoLicence(repo) {
  if (!repo) return null;
  for (const f of ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENCE', 'LICENCE.md', 'license', 'license.md', 'License.md', 'COPYING']) {
    const r = await get(`https://raw.githubusercontent.com/${repo}/HEAD/${f}`).catch(() => null);
    if (r?.ok) return { file: `github.com/${repo}/${f}`, text: await r.text() };
  }
  return null;
}

const SPDX_RE = /^[A-Za-z0-9.+-]+$/;
// An SPDX OR expression in package.json ("(MIT OR GPL-3.0-or-later)") lets the licensee pick one: its alternatives, or
// null (a single id, an AND expression, nested parentheses, prose such as "Dual licensed under the MIT or GPL").
export function spdxChoice(field) {
  const f = String(field || '').trim().replace(/^\((.*)\)$/, '$1');
  if (/[()]/.test(f) || /\sAND\s/i.test(f)) return null;
  const alts = f.split(/\s+OR\s+/i);
  return alts.length > 1 && alts.every((a) => /^[A-Za-z0-9.+-]+(\s+WITH\s+[A-Za-z0-9.+-]+)?$/i.test(a)) ? alts : null;
}
const family = (id) => String(id).replace(/\s+WITH\s+.*$/i, '').replace(/-(only|or-later)$|\+$/i, '').toUpperCase();
// Whether a licence the file names (a TESTS id) is one of the field's alternatives. The GPL family is matched loosely
// (an LGPL-2.1 text also matches the GPL-2.0 test); every member of it is class C anyway.
const sameLicence = (alt, cls) => { const a = family(alt), c = family(cls); return a === c || new RegExp(`^${c.replace(/[.+]/g, '\\$&')}-\\d`).test(a) || (/GPL/.test(a) && /GPL/.test(c) && /AGPL/.test(a) === /AGPL/.test(c)); };
const RANK = { A: 0, B: 1, '?': 2, C: 3, D: 4 };
/** The alternative a licensee would pick: the one with the best class (the first named among equals). */
export function bestChoice(alts) {
  return alts.map((id) => ({ id, lc: licenceClass({ classified: id, classes: [id], flags: [] }) })).sort((a, b) => RANK[a.lc.cls] - RANK[b.lc.cls])[0];
}
const choiceOf = (field, alts, extra = '') => { const best = bestChoice(alts); return { choice: alts, chosen: best.id, classified: `${best.id} (your choice: package.json ${String(field).trim()}${extra})` }; };

// When no licence text exists anywhere, the package.json field is all there is: an SPDX id (or an OR expression, as
// the licensee's pick) is reported as that licence with a warning (the text is missing, not the permission); anything
// else is a custom licence to read (GSAP: "Standard 'no charge' license: <url>"), never "all rights reserved" by default.
function fromField(field) {
  if (!field) return null;
  const f = String(field).trim();
  if (/^SEE LICEN[CS]E IN /i.test(f)) return null;
  const alts = spdxChoice(f);
  if (alts) { const c = choiceOf(f, alts); return { ...c, classes: [c.chosen], flags: [], evidence: [], fieldOnly: true, choiceTextMissing: true }; }
  if (SPDX_RE.test(f) && !/^(UNLICENSED|proprietary|commercial)$/i.test(f)) return { classified: f, classes: [f], flags: [], evidence: [], fieldOnly: true };
  return { classified: restrictiveField(f) ? 'custom / proprietary' : 'custom', classes: [], flags: [], evidence: [`[package.json] ${f.slice(0, 200)}`], fieldOnly: true };
}

// A repository-wide notice ("This repository contains software under two licenses … Each package's own
// LICENSE or package.json specifies its applicable license") is not this package's licence: take the notice
// section that names this package, else the package.json field when the notice names that licence.
function fromRepoNotice(text, name, field) {
  const flat = text.replace(/\s+/g, ' ');
  if (!/contains (software|code) under (two|three|several|multiple|\d+) (different )?licen[cs]es|each package'?s own licen[cs]e|package\.json specifies/i.test(flat)) return null;
  const sections = text.split(/\n\s*(?=\d+\.\s)/);
  const named = name && sections.find((sec) => sec.includes(name));
  if (named) { const c = classifyLicenceText(named); return { ...c, classified: `${c.classified} (repo notice names this package)`, notice: true }; }
  const f = fromField(field);
  if (f && !f.classified.startsWith('custom')) {
    const others = classifyLicenceText(text).classes.filter((c) => (f.choice ? !f.choice.some((a) => sameLicence(a, c)) : c !== f.classified));
    return { ...f, fieldOnly: false, classified: f.classified, notice: true, noticeOthers: others, evidence: others.length ? [`[repo notice] the repository also contains ${others.join(', ')} code (other packages)`] : [] };
  }
  return null;
}

/** Classify the licence files in an unpacked package folder (falls back to the repo root licence, then to the package.json field). */
export async function licenceFromDir(dir, repo) {
  // Regular files only (devextreme ships a `license/` folder of licence-key scripts, which once crashed this); licence
  // documents that are not text (@mescius/wijmo's COMMERCIAL-LICENSE.pdf) are named as evidence, never read as text.
  const names = existsSync(dir) ? (await readdir(dir)).filter(isLicenceFile) : [];
  const regular = [];
  for (const f of names) if ((await stat(path.join(dir, f)).catch(() => null))?.isFile()) regular.push(f);
  const docs = regular.filter((f) => BINARY_DOC.test(f)), files = regular.filter((f) => !BINARY_DOC.test(f));
  const pj = existsSync(path.join(dir, 'package.json')) ? JSON.parse(await readFile(path.join(dir, 'package.json'), 'utf8')) : {};
  const field = typeof pj.license === 'string' ? pj.license : pj.license?.type ?? (Array.isArray(pj.licenses) ? pj.licenses.map((l) => l.type || l).join(' OR ') : null);
  const vendorDoc = docs.some((f) => /eula|commercial|proprietary|agreement/i.test(f));
  const withDocs = (r) => {
    if (!docs.length) return r;
    const none = /NO LICENCE/.test(r.classified);
    return { ...r, docs, flags: [...new Set([...(r.flags || []), ...(vendorDoc ? ['vendor-agreement'] : [])])],
      classified: none ? `${vendorDoc ? 'custom / proprietary' : 'custom'} (licence document ${docs.join(', ')})` : r.classified,
      evidence: [`[licence document] the package ships ${docs.join(', ')}: not text, open it`, ...(r.evidence || [])] };
  };
  let source = 'package', file = files.join(', '), text = '';
  if (files.length) text = (await Promise.all(files.map((f) => readFile(path.join(dir, f), 'utf8')))).join('\n\n');
  // Third-party notices only: the package's own licence is the field (or nothing), never the bundled code's MIT.
  const tp = files.length ? thirdPartyOnly(text) : null;
  if (tp) {
    const f = fromField(field) || { classified: 'NO LICENCE for the package itself', classes: [], flags: [], evidence: [] };
    const r = withDocs({ source: `package.json field (${file} covers bundled third-party code only)`, file, ...f, thirdParty: true });
    return { ...r, evidence: [`[third-party notices] ${tp}`, ...r.evidence] };
  }
  if (files.length && text.length < 400 && /github\.com\/[^\s)]+licen[cs]e/i.test(text)) {
    const r = await repoLicence(repo);
    if (r) { source = 'repo root (package file is a pointer)'; file = r.file; text = r.text; }
  }
  if (!files.length) {
    const r = await repoLicence(repo);
    if (!r) {
      const f = fromField(field);
      if (f) return withDocs({ source: 'package.json field only (no licence text in package or repo root)', file: null, ...f });
      return withDocs({ source: 'none', file: null, classified: 'NO LICENCE FILE (package or repo root)', flags: [], evidence: [] });
    }
    source = 'repo root (package ships none)'; file = r.file; text = r.text;
  }
  const notice = fromRepoNotice(text, pj.name, field);
  if (notice) return withDocs({ source: source + '; multi-licence repo notice', file, bytes: text.length, ...notice });
  let res = withDocs({ source, file, bytes: text.length, ...classifyLicenceText(text) });
  // An OR expression in the field is the licensee's choice (jszip "(MIT OR GPL-3.0-or-later)" ships both texts in one
  // file, dompurify "(MPL-2.0 OR Apache-2.0)" two files): the class is the best alternative's, when the file names no
  // licence outside the expression and no commercial terms (ckeditor4 4.22 adds its LTS terms: left to a human).
  const alts = spdxChoice(field);
  if (alts && res.classes?.length && !(res.flags || []).some((f) => STRONG.has(f)) && !/\(dual\)/.test(res.classified)
      && res.classes.every((c) => alts.some((a) => sameLicence(a, c)))) {
    const c = choiceOf(field, alts, `; ${file} has ${res.classes.join(' + ')}`);
    if (RANK[licenceClass({ ...res, ...c }).cls] < RANK[licenceClass(res).cls]) res = { ...res, ...c, choiceTextMissing: !res.classes.some((x) => sameLicence(c.chosen, x)) };
  }
  // A field naming commercial terms beside a permissive file is a conflict for a human, not a permissive licence: the
  // file can be a copied one (fusioncharts ships Meta's MIT LICENSE.md, its field is ".../buy/") or the root licence of
  // an examples repository (scichart's field is its EULA URL).
  if (restrictiveField(field) && !res.choice && licenceClass(res).cls === 'A') {
    const holder = text.match(/Copyright[^\n]{0,80}/i)?.[0].trim();
    res = { ...res, conflict: String(field), evidence: [`[package.json] "${String(field).slice(0, 120)}", but ${file} is ${res.classified}${holder ? ` (${holder})` : ''}: it may cover copied or bundled code only`, ...(res.evidence || [])] };
  }
  return res;
}

/** Licence class in the terms of resources/README.md (A ship · B ship with a condition · C human decision · D reject; "?" read it). */
export function licenceClass(lic) {
  const c = lic?.classified || '';
  const flags = lic?.flags || [];
  if (!lic || /NO LICENCE/.test(c)) return { cls: 'D', why: 'no licence text or field anywhere: all rights reserved' };
  const buy = flags.filter((f) => (PROCUREMENT.has(f) && f !== 'watermark' && f !== 'keep-logo') || f === 'proprietary' || (f === 'commercial' && !(lic.classes || []).length));
  if (buy.length || /^custom \/ proprietary/.test(c)) return { cls: 'C', kind: 'procurement', why: 'source-available, paid, trial or capped: the client buys it or it is not used' };
  if (lic.choice) { const { id, lc } = bestChoice(lic.choice); return { ...lc, why: `${lc.why}: ${id}, chosen from ${lic.choice.join(' OR ')} (write the choice in CREDITS.md)` }; }
  if (lic.conflict) return { cls: 'C', kind: 'procurement', why: 'package.json names commercial terms but the licence file is permissive: read both' };
  if (flags.includes('watermark') || flags.includes('keep-logo')) return { cls: 'C', kind: 'brand decision', why: 'a third-party watermark or logo must stay visible in the product' };
  if (flags.includes('no-logo-use')) return { cls: 'C', kind: 'restricted use', why: 'forbids logo or identity use (and usually resale as a library)' };
  if (/CC-BY-NC/.test(c) || (flags.includes('non-commercial') && !/commercial \(dual\)/.test(c))) return { cls: 'D', why: 'non-commercial only' };
  if (/AGPL|LGPL|GPL|dual/.test(c)) return { cls: 'C', kind: 'copyleft', why: 'copyleft or dual licence: a closed-source product needs the commercial licence or legal sign-off' };
  if (/CC-BY-SA/.test(c)) return { cls: 'C', kind: 'share-alike', why: 'share-alike asset licence' };
  if (/MPL|EPL/.test(c)) return { cls: 'B', why: 'file-level copyleft: keep notices, publish changes to the library\'s own files; your code is unaffected' };
  if (/CC-BY/.test(c)) return { cls: 'B', why: 'credit visible to visitors required' };
  if (c.startsWith('custom')) return { cls: '?', why: 'custom licence: read it and classify by what it says' };
  const first = (lic.classes || [])[0] || c;
  if (PERMISSIVE.test(first) && (lic.classes || [first]).every((x) => PERMISSIVE.test(x))) return { cls: 'A', why: 'permissive' };
  return { cls: '?', why: 'read it: ' + c };
}

/** licenceClass plus what the README says about the published build (a test build, a placeholder). */
export function effectiveClass(lic) {
  if (/placeholder/i.test(lic?.readmeNotice || '') || /placeholder/i.test(lic?.readmeProcurement || '')) return { cls: 'D', why: 'placeholder package: the real one is not on the public registry' };
  if (lic?.readmeProcurement) return { cls: 'C', kind: 'procurement', why: 'the README says this build is for testing or watermarked: ' + lic.readmeProcurement };
  return licenceClass(lic);
}

// README notices about THIS package only ("This repo is unmaintained", "`name` is deprecated"), never about a
// predecessor ("mxGraph (archived in 2020)") or an option ("deprecated in favor of the merged option").
const STATE = String.raw`(?:is|has been|was|will be)\s+(?:now\s+|currently\s+|officially\s+|effectively\s+)?(?:no longer (?:being |actively )?(?:maintained|developed|supported)|unmaintained|not (?:actively |being |currently )?maintained|archived|deprecated|abandoned|in maintenance[- ]only mode|a placeholder|discontinued|end[- ]of[- ]life)`;
const SELF = String.raw`\b(?:this|the)\s+(?:repo(?:sitory)?|package|project|library|lib|module|component|plugin|fork|codebase)`;
export function readmeNotice(text, name) {
  if (!text) return null;
  const esc = (x) => x.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  const res = [new RegExp(`${SELF}\\s+${STATE}`, 'i'), /\blooking for (?:a |new |more )*maintainers?\b/i, /\bplaceholder package\b/i];
  if (name) res.push(new RegExp(`\`?${esc(name)}\`?\\s+${STATE}`, 'i'));
  const head = text.slice(0, 800);
  const banner = head.match(/^\s*(?:#+|>|\*\*|⚠️)[^\n]{0,24}\b(deprecated|unmaintained|archived|no longer maintained)\b[^\n]{0,80}$/im);
  if (banner) return banner[0].trim().slice(0, 200);
  for (const re of res) {
    const m = text.match(new RegExp(`[^\\n]{0,80}(?:${re.source})[^\\n]{0,80}`, re.flags));
    if (m) return m[0].trim().slice(0, 200);
  }
  return null;
}

// A README that says the published build is for testing or watermarks its output (Pintura) makes the package
// a purchase whatever its licence field says.
export function readmeProcurement(text) {
  if (!text) return null;
  const flat = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  // …or runs in trial mode until a licence is set (@pdftron/webviewer: "WebViewer will run in trial mode until a license is provided").
  const re = /(will|may|does) (overlay|add|show|display|place|render)[^.]{0,40}watermark|watermark[^.]{0,80}(unless|until|without) (a |you )?[^.]{0,20}(licen[cs]e|key|purchas)|\bfor (testing|evaluation) (only|purposes only)\b|this package is for (testing|evaluation)|placeholder package|\b(runs?|will run|operates?) in (trial|evaluation|demo) mode\b/i;
  const s = flat.split(/(?<=[.!?])\s+/).find((x) => re.test(x));
  return s ? s.slice(0, 220) : null;
}

// Weaker than a notice (AMBER, not RED): "Moment.js is a legacy project, now in maintenance mode".
export function readmeMaintenance(text) {
  if (!text) return null;
  const m = text.slice(0, 6000).match(/[^\n]{0,80}\b(legacy project|(now |is )?in maintenance(-only)? mode|feature[- ]complete and (only )?(receives|gets) (bug|security) fixes)\b[^\n]{0,80}/i);
  return m ? m[0].trim().slice(0, 200) : null;
}

// A README sentence about a paid tier (AMBER): "ag-grid-enterprise is available under a commercial license". Not a
// sentence that denies one (konva: "Konva is MIT licensed and does not require a license key").
export function readmeCommercial(text) {
  if (!text) return null;
  const s = text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).find((x) => /commercial licen[cs]e|licen[cs]e key|pro edition|enterprise (edition|features|licen)|pricing|premium/i.test(x) && !/\b(does not|doesn't|do not|don't|never|no need to) (require|need)s? (a |any )?(commercial licen[cs]e|licen[cs]e key)/i.test(x));
  return s ? s.slice(0, 220) : null;
}

export async function repoReadme(repo) {
  if (!repo) return null;
  for (const f of ['README.md', 'readme.md', 'Readme.md', 'README']) {
    const r = await get(`https://raw.githubusercontent.com/${repo}/HEAD/${f}`).catch(() => null);
    if (r?.ok) return await r.text();
  }
  return null;
}

// A fresh folder per check, removed afterwards: two versions of one package checked in one run (has the licence
// changed?) once shared a folder, and each read the other's licence file (ua-parser-js 1.0.40 ships license.md, 2.0.0
// LICENSE.md: 1.0.40 read "AGPL-3.0 + MIT", class C).
export const workDir = (tmp, name) => mkdir(tmp, { recursive: true }).then(() => mkdtemp(path.join(tmp, name.replace(/[@/]/g, '_') + '-')));
async function packLicence(name, version, repo, tmp) {
  const dest = await workDir(tmp, 'pack-' + name);
  try {
    const { stdout } = await run('npm', ['pack', `${name}@${version}`, '--pack-destination', dest, '--json', '--silent'], { maxBuffer: 32 << 20 });
    const tgz = path.join(dest, JSON.parse(stdout)[0].filename);
    // Only the top-level files are read (licence files, README, package.json): @progress/kendo-ui unpacks to 210 MB.
    await run('tar', ['-xzf', tgz, '-C', dest, '--exclude=*/*/*']);
    await rm(tgz, { force: true });
    const pkgDir = path.join(dest, 'package');
    const readme = existsSync(pkgDir) ? (await readdir(pkgDir)).find((x) => /^readme(\.md)?$/i.test(x)) : null;
    const readmeText = readme ? await readFile(path.join(pkgDir, readme), 'utf8') : '';
    // The tarball README can be older than the repository's (vaul 1.1.2 ships none of the "unmaintained" note).
    const rootReadme = await repoReadme(repo);
    const notice = readmeNotice(readmeText, name) || (rootReadme && readmeNotice(rootReadme, name));
    const noticeSource = readmeNotice(readmeText, name) ? 'package README' : notice ? `github.com/${repo} README` : null;
    return { ...(await licenceFromDir(pkgDir, repo)), readmeNotice: notice, readmeNoticeSource: noticeSource, readmeMaintenance: readmeMaintenance(readmeText) || readmeMaintenance(rootReadme), readmeProcurement: readmeProcurement(readmeText), readmeCommercial: readmeCommercial(readmeText + '\n' + (rootReadme || '')) };
  } finally { await rm(dest, { recursive: true, force: true }); }
}

// ── Repository activity over git ────────────────────────────────────────────────────────────────
const BOT = /\[bot\]|github-actions|dependabot|renovate|changeset|semantic-release|greenkeeper|actions-user|release-please|autofix|copilot/i;
// One clone per repository, even when several packages of one monorepo are checked at the same time.
const clones = new Map();
const NO_PROMPT = { ...process.env, GIT_TERMINAL_PROMPT: '0' };   // a private or missing repository fails, it never asks for a password
async function cloneOnce(repo, dir, cutoff) {
  if (existsSync(dir)) return null;
  const url = `https://github.com/${repo}`;
  let shallowOk = false;
  for (let i = 0; i < 2 && !shallowOk; i++) {
    try { await run('git', ['clone', '-q', '--bare', '--single-branch', '--filter=tree:0', `--shallow-since=${cutoff}`, url, dir], { timeout: 240000, env: NO_PROMPT }); shallowOk = true; }
    catch { await rm(dir, { recursive: true, force: true }); }
  }
  if (shallowOk) return null;
  // No commit since the cutoff makes --shallow-since fail: fetch the last commit only. If that commit is inside the
  // window, the first clone failed for another reason (network): report an error, not "0 commits".
  try { await run('git', ['clone', '-q', '--bare', '--single-branch', '--filter=tree:0', '--depth=1', url, dir], { timeout: 240000, env: NO_PROMPT }); }
  catch (e2) { return String(e2.stderr || e2.message).trim().split('\n')[0]; }
  const lastIso = (await run('git', ['-C', dir, 'log', '-1', '--format=%cI'])).stdout.trim();
  if (lastIso && lastIso.slice(0, 10) >= cutoff) { await rm(dir, { recursive: true, force: true }); return 'shallow clone failed although the repository has recent commits; re-run'; }
  return null;
}
export async function activity(repo, cacheDir, cutoff = cutoffDate()) {
  if (!repo) return null;
  const dir = path.join(cacheDir, repo.replace('/', '__'));
  await mkdir(cacheDir, { recursive: true });
  if (!clones.has(dir)) clones.set(dir, cloneOnce(repo, dir, cutoff).catch((e) => String(e.message)));
  const err = await clones.get(dir);
  if (err) return { repo, error: err };
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
  // Input files that contributed bytes to the output (for attributing what the bundle contains to packages).
  const used = new Set();
  for (const o of Object.values(outputs)) for (const [f, v] of Object.entries(o.inputs || {})) if (v.bytesInOutput > 0) used.add(path.resolve(dir, f));
  Object.defineProperty(res, 'inputFiles', { value: [...used], enumerable: false });
  res.outDir = path.join(dir, 'out');
  return res;
}

// ── Verdict flags ───────────────────────────────────────────────────────────────────────────────
// Triage for a human to read, not a gate: RED means "do not adopt until someone has read the quoted evidence
// and decided" (usually the client, for a licence purchase); AMBER means "write it down and mitigate".
export function flagsFor({ reg, lic, act, size, adopt }) {
  const red = [], amber = [];
  const lc = effectiveClass(lic);
  const ev = lic?.evidence?.[0] ? ' — ' + lic.evidence[0] : '';
  if (lc.cls === 'D') red.push(`licence class D (${lc.why}): ${lic?.classified || 'none'}${ev}`);
  else if (lc.cls === 'C') red.push(`licence class C, ${lc.kind} (${lc.why}): ${lic.classified}${ev}`);
  else if (lc.cls === 'B') amber.push(`licence class B (${lc.why}): ${lic.classified}`);
  else if (lc.cls === '?') amber.push(`licence needs reading (${lc.why}): ${lic.classified}${ev}`);
  if (lic?.fieldOnly && lc.cls !== 'D') amber.push(`no licence text in the package or the repository root: only the package.json field (${reg?.licenseField}) — record the source in CREDITS.md`);
  if (lic && !lic.fieldOnly && !lic.notice && !lic.choice && reg?.licenseField && lc.cls === 'A' && !String(reg.licenseField).includes((lic.classes || [])[0] || lic.classified)) amber.push(`package.json says ${reg.licenseField} but the file says ${lic.classified}`);
  if (lic?.choice && lic.choiceTextMissing && !lic.fieldOnly) amber.push(`${lic.chosen} is chosen from package.json (${lic.choice.join(' OR ')}), but the licence file has no ${lic.chosen} text — record the source in CREDITS.md`);
  if (lic?.notice && lic.noticeOthers?.length) amber.push(`the licence file is a repository notice: this package is ${lic.classified} (package.json), other packages in the repo are ${lic.noticeOthers.join(', ')}`);
  if (lic?.readmeCommercial) amber.push('README mentions a paid tier: ' + lic.readmeCommercial);
  if (act === null) amber.push('no GitHub repository in package.json: activity unknown (pass --repo owner/name)');
  if (reg?.deprecated) red.push('deprecated on npm: ' + reg.deprecated.slice(0, 120));
  if (lic?.readmeNotice) red.push(`${lic.readmeNoticeSource || 'README'}: ${lic.readmeNotice}`);
  else if (lic?.readmeMaintenance) amber.push(`README: ${lic.readmeMaintenance}`);
  if (reg?.hasInstallScript) amber.push('runs an install script (check what it does)');
  const ageDays = reg?.latestDate ? (Date.now() - new Date(reg.latestDate)) / DAY : 0;
  if (act && !act.error) {
    if (act.commits12m === 0 && ageDays > 365) red.push(`dormant: no commit in 12 months, last release ${reg.latestDate}`);
    else if (act.humanCommits12m < 12 && ageDays > 270) amber.push(`low activity: ${act.humanCommits12m} human commits in 12 months, last release ${reg.latestDate}`);
    if (act.topShare >= 90 && act.humanCommits12m >= 10) amber.push(`bus factor 1: ${act.topAuthor} made ${act.topShare}% of human commits`);
  }
  // Churn is counted in breaking-by-semver versions (new 0.MINOR lines before 1.0, new majors after), not in
  // tags: Lexical publishes nightlies, so "releases" alone overstates it.
  if (/^0\./.test(reg?.latest || '') && reg?.breaking12m >= 4) amber.push(`pre-1.0 with ${reg.breaking12m} breaking (0.x minor) versions in 12 months: pin exact versions and budget upgrades`);
  else if (!/^0\./.test(reg?.latest || '') && reg?.breaking12m >= 3) amber.push(`${reg.breaking12m} major versions in 12 months: budget upgrades`);
  if (size?.ok && size.initialGz > 150 * 1024) amber.push(`heavy: ${(size.initialGz / 1024).toFixed(0)} KB gz initial JS — lazy-load it behind the route or interaction that needs it`);
  if (size?.ok && size.assetsGz > 300 * 1024) amber.push(`ships ${(size.assetsGz / 1024).toFixed(0)} KB gz of WASM/assets`);
  if (adopt && adopt.weeklyDownloads != null && adopt.weeklyDownloads < 2000) amber.push(`little adoption: ${adopt.weeklyDownloads} downloads a week`);
  return { licenceClass: lc, red, amber };
}

// ── One package ─────────────────────────────────────────────────────────────────────────────────
/** Check one package spec: `name`, `name@1.2.3` (that version's tarball) and/or `name=owner/repo`. */
export async function check(arg, { tmp, repo: repoOpt = null, size: withSize = false, entry = null, withActivity = true } = {}) {
  const [spec, repoArg] = arg.split('=');
  const at = spec.lastIndexOf('@');
  const [name, pinned] = at > 0 ? [spec.slice(0, at), spec.slice(at + 1)] : [spec, null];
  const reg = await registry(name, undefined, pinned);
  if (reg.error) return { name, error: reg.error };
  if (pinned && !reg.hasVersion(pinned)) return { name, error: `no version ${pinned} on npm (latest ${reg.latest})` };
  const version = pinned || reg.latest;
  // repository.url forms: git+https://github.com/o/r.git, git@github.com:o/r, github:o/r (moment), o/r
  const repo = repoArg || repoOpt || (reg.repository.match(/github\.com[/:]([^/]+\/[^/#]+)|^github:([^/]+\/[^/#]+)|^([\w.-]+\/[\w.-]+)$/)?.slice(1).find(Boolean) ?? null);
  let lic, act, adopt;
  try { [lic, act, adopt] = await Promise.all([packLicence(name, version, repo, tmp), withActivity ? activity(repo, path.join(tmp, 'git')) : undefined, adoption(name)]); }
  catch (e) { return { name, version, error: `could not fetch the package (${String(e.stderr || e.message).trim().split('\n')[0].slice(0, 160)})` }; }
  let size = null;
  if (withSize) {
    const root = await workDir(tmp, 'size-' + name);                // one per check, as for the licence
    await writeFile(path.join(root, 'package.json'), '{"private":true}');
    try {
      await run('npm', ['install', '--silent', '--ignore-scripts', '--no-audit', '--no-fund', '--legacy-peer-deps', `${name}@${version}`, 'esbuild'], { cwd: root, maxBuffer: 64 << 20, timeout: 600000 });
      size = await bundleCost(entry || `export * from '${name}';`, { root, buildDir: path.join(root, 'build') });
    } catch (e) { size = { ok: false, error: `npm install failed: ${String(e.stderr || e.message).trim().split('\n')[0].slice(0, 160)}` }; }
  }
  return { name, version, registry: reg, adoption: adopt, licence: lic, activity: act, size, ...flagsFor({ reg, lic, act, size, adopt }) };
}

// ── CLI ─────────────────────────────────────────────────────────────────────────────────────────
async function main() {
  const argv = process.argv.slice(2);
  const opt = (k) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : null);
  const json = argv.includes('--json');
  if (argv.includes('--search')) {
    const words = opt('--search');
    if (!words || words.startsWith('--')) { console.log('usage: node libcheck.mjs --search "<words>" [--size-limit 12] [--json]'); process.exit(1); }
    const rows = await search(words, +(opt('--size-limit') || 12));
    if (json) return console.log(JSON.stringify(rows, null, 1));
    for (const r of rows) console.log(`${String(r.weekly).padStart(10)}/wk  ${r.date}  ${r.name}@${r.version}  — ${r.description}`);
    return;
  }
  const names = argv.filter((a, i) => !a.startsWith('--') && !['--repo', '--entry', '--size-limit', '--search'].includes(argv[i - 1]));
  if (!names.length) { console.log('usage: node libcheck.mjs <package>[@version][=owner/repo] … [--repo owner/name] [--size] [--entry "<js>"] [--json] | --search "<words>"'); process.exit(1); }
  if (opt('--repo') && names.length > 1) console.error('--repo applies to one package; with several, write each as <package>=owner/repo');
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'libcheck-'));
  // Three packages at a time, printed in the order given.
  const out = new Array(names.length);
  let next = 0;
  const worker = async () => { for (let i = next++; i < names.length; i = next++) out[i] = await check(names[i], { tmp, repo: names.length === 1 ? opt('--repo') : null, size: argv.includes('--size'), entry: opt('--entry') }).catch((e) => ({ name: names[i], error: 'crash: ' + e.message })); };
  try { await Promise.all([worker(), worker(), worker()]); } finally { await rm(tmp, { recursive: true, force: true }); }
  if (out.some((r) => r.error)) process.exitCode = 1;   // could not check; flags never change the exit code
  if (json) return console.log(JSON.stringify(out, null, 1));
  const kb = (b) => (b / 1024).toFixed(1) + ' KB';
  for (const r of out) {
    if (r.error) { console.log(`\n${r.name}: ${r.error}`); continue; }
    const { registry: g, licence: l, activity: a, size: s, adoption: d } = r;
    console.log(`\n${r.name}@${r.version}  (latest ${g.latest}, ${g.latestDate}; 12 months: ${g.stableReleases12m} stable + ${g.preReleases12m} pre-releases, ${g.breaking12m} breaking-by-semver; ${g.deps} deps${g.peerDeps.length ? '; peers ' + g.peerDeps.join(', ') : ''})`);
    if (d) console.log(`  adoption  ${d.weeklyDownloads?.toLocaleString('en')} downloads/week · ${d.dependents ?? '?'} dependents`);
    console.log(`  licence   class ${r.licenceClass.cls}: ${l.classified}  [${l.source}: ${l.file ?? '—'}]  package.json: ${g.licenseField}`);
    for (const e of l.evidence || []) console.log(`            ${e}`);
    if (a && !a.error) console.log(`  activity  ${a.repo}: ${a.humanCommits12m} human commits / 12 months, ${a.authors12m} authors, top ${a.topAuthor} ${a.topShare ?? '—'}%, last commit ${a.lastCommit}`);
    else if (a?.error) console.log(`  activity  ${a.repo}: ${a.error}`);
    if (s) console.log(s.ok ? `  size      initial ${kb(s.initialGz)} gz · all JS ${kb(s.jsGz)} · CSS ${kb(s.cssGz)} · assets ${kb(s.assetsGz)} · ${s.packages} package${s.packages === 1 ? '' : 's'}` : `  size      build failed: ${s.error} (pass --entry with a real import)`);
    for (const x of r.red) console.log(`  RED       ${x}`);
    for (const x of r.amber) console.log(`  AMBER     ${x}`);
    if (!r.red.length && !r.amber.length) console.log('  no flags');
    console.log('  (triage, not a verdict: read the quoted evidence; try its keyboard and screen-reader behaviour in a demo before committing)');
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main().catch((e) => { console.error(e); process.exit(1); });
