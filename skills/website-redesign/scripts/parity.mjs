#!/usr/bin/env node
/**
 * Old site vs new site: what the redesign added, dropped or broke.
 *
 *   node parity.mjs --before http://localhost:4000 --after http://localhost:3000 \
 *        [--paths / /pricing /about | --crawl 40] [--source src content README.md] [--out parity.md]
 *        [--derived "days late" "/^\d{1,3} days$/" …]   values computed from the data (listed, not failed)
 *        [--removed "10 minutes" "#human" "captcha" "/old-page/" …]   deliberate removals (listed, not warned)
 *   node parity.mjs --greenfield --after http://localhost:3000 --source discovery src \
 *        [--paths …|--crawl 40] [--derived …] [--out parity.md]   a first site: no old build
 *   node parity.mjs --payloads <old states out dir> <new states out dir> [--ignore submitted_at …] [--out payloads.md]
 *
 * Run the old build (main branch) and the new build (redesign branch) side by
 * side. For every route it compares:
 *  - claims: numbers with units, prices, percentages, multipliers ("10x"),
 *    "N+" counts, quotations. A claim on the new site that appears nowhere on
 *    the old site and nowhere in --source is UNSOURCED: find where it
 *    came from or remove it. A claim on the old site missing from every new
 *    page is DROPPED: confirm the removal was deliberate (DESIGN.md "Remove").
 *  - routes: every old route (given or crawled) must still answer on the new
 *    site; same-origin links the old site had and the new site no longer links
 *    to are reported as orphaned.
 *  - element ids (anchors, script and analytics hooks) and form field names
 *    present on the old page and missing on the new one.
 *  - title, meta description, canonical, og:image, h1.
 * --source: folders are searched for text files (md, json, yaml, js/ts, html, csv, txt…); a file named directly is
 * read whatever its extension, except binary formats (pdf, docx, images), which must be transcribed first. A source
 * that is missing or unreadable is reported under the first line.
 * A claim is on the other site only within one block (as claims are read: "Zone 10" in one list item and
 * "Minutes of the council" in the next is not "10 minutes"). A new claim is also sourced by the old site when the
 * same value is there with its own unit attached, as below ("£45" there, "£45.00" here; "33.1" under a "Yield (L)"
 * column there, "33.1 L" here). A dropped claim whose value is still on the new page
 * counts as "same value, new format" only when it is surely the same figure: specific (4+ significant digits once
 * trailing zeros are dropped, and not a year: "55,484.00" and "2,431" are; "10,000", "£35.00", "£125" and "2019" are
 * not), or its own unit or currency is attached to that number on the new page: a currency symbol or code right
 * beside it ("£35.00 a year"), a unit word right after it with at most one word between ("3 working days"), a label
 * ending in ":" or a dash just before it ("Processing time (minutes): 10"), or the label of a bare value (its table
 * row or column header, its <dt>, the rest of a small stat card). A unit outside the number's own item (the nearest
 * element with words that holds it: another link, span or list item, as "Council minutes" before "Zone 10 map"), in
 * another link or button inside it, two words away, or attached to another number ("Zone 35 permits now cost £40")
 * does not count.
 * --removed declares what was taken out on purpose; each is listed as "declared removed" (DESIGN.md "Remove" lists
 * it) instead of warned about. One pattern per argument, commas kept (--derived too). A string matches by kind: one
 * with a digit matches a claim that contains it as whole words or states the same figure ("£35" matches "£35.00",
 * not "£350"); three or more words match a quotation that contains them; an id ("#human" or "human"), a field
 * ("name" or "form › name") or a route ("/old/page") matches only exactly. A /regex/ needs a regex character in it
 * (\ ^ $ * + ? ( ) [ ] { } |) and tests all of them, so "/old/page" and "/about/us" stay routes: write /^about/i.
 * A pattern that matched nothing is reported.
 *
 * --greenfield: a first site, no old build. --after and --source are required (the discovery/ transcriptions, the
 * owner's answers, content and data files). The old side is empty: every claim and quotation on the new site must be
 * found in --source (a bare number in the sources, --derived and data keys count as there) or it is UNSOURCED.
 * --crawl starts from the new site. Dropped claims, routes, orphaned links, ids, form fields, data-* hooks, form
 * submissions and metadata have nothing to be compared with; the report says so at the top.
 *
 * --payloads: the payload contract, what a form actually sends. states.mjs records requests ("record" on a route
 * or a state) into <out>/requests/, one folder per --label (requests/<label>/); run the same answers through the old
 * and the new build, then pass the two folders (an out dir, its requests/ or one label's folder). States pair by name
 * (devices may differ), requests by method and path in the order sent, then by path (the method changed), then by
 * method (the endpoint moved). Per request: byte-identical (by SHA-256 when the recording has it), or keys
 * removed/added, key order, value types and values that changed, plus a changed method, path, query or Content-Type.
 * A recording is never compared with itself: one out dir given twice is split into its --label before and --label
 * after runs (old/new also work), a side holding several runs is refused, and so is a pair that is the same file or
 * has the same label and base URL. A body an older recording cut off (…(truncated)) cannot be compared in full and is
 * never called identical; a binary body kept only as its size and hash is compared by hash. Values that change on
 * every submission (CSRF tokens, nonces, idempotency keys, captcha responses; --ignore <key…> for more, such as a
 * timestamp or a cache-busting query value) are checked for presence and type only. No browser is started.
 * Eastern Arabic and Persian digits are normalised first, so claims on an Arabic page are compared too.
 * This turns "never invent proof" and the audit's preserved-list into checks.
 * It cannot tell a true claim from a false one — only whether it has a source.
 */
import { readdir, readFile, realpath, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { parseArgs, asList, launch, open, settle, urlFor } from './lib/env.mjs';

const a = parseArgs();
// One value per argument: a pattern may itself contain commas ("10,000 customers", /^\d{1,3} days$/).
const each = (v) => [].concat(v ?? []).filter((x) => typeof x === 'string' && x !== '');
if (a.payloads) {
  const dirs = each(a.payloads);
  if (dirs.length !== 2) { console.error('Usage: node parity.mjs --payloads <old states out dir> <new states out dir> [--ignore key …] [--out payloads.md]'); process.exit(1); }
  // A states.mjs out dir, its requests/ folder or one label's folder in it; one recording per state and device.
  // states.mjs records each --label into requests/<label>/, so one level of folders below is read too.
  const readRecs = async (d) => {
    const dir = existsSync(path.join(d, 'requests')) ? path.join(d, 'requests') : d;
    const real = await realpath(dir).catch(() => path.resolve(dir));
    const recs = [];
    const readIn = async (sub) => {
      const entries = await readdir(sub, { withFileTypes: true }).catch(() => []);
      for (const f of entries.filter((e) => e.isFile() && e.name.endsWith('.json')).map((e) => e.name).sort()) {
        try { const j = JSON.parse(await readFile(path.join(sub, f), 'utf8')); if (Array.isArray(j.requests)) recs.push({ ...j, state: j.state ?? f.replace(/\.json$/, ''), file: path.join(sub, f) }); } catch { /* not a recording */ }
      }
      return entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
    };
    for (const sub of await readIn(real)) await readIn(path.join(real, sub));
    return { dir, real, recs };
  };
  let [A, B] = await Promise.all(dirs.map(readRecs));
  if (!A.recs.length || !B.recs.length) { console.error(`No recordings in ${[A, B].filter((x) => !x.recs.length).map((x) => x.dir).join(' and ')} — run states.mjs with "record" on the submit route (see its header).`); process.exit(1); }
  const labelsOf = (R) => [...new Set(R.recs.map((r) => r.label ?? null))];
  const notes = [];
  if (A.real === B.real) {
    // One folder on both sides compares every recording with itself. Both builds recorded into one --out (states.mjs's
    // default) are told apart by their --label: before/old is the old build, after/new the new one.
    const labels = labelsOf(A).filter(Boolean);
    const lo = labels.filter((l) => /^(before|old)$/i.test(l)), ln = labels.filter((l) => /^(after|new)$/i.test(l));
    if (lo.length !== 1 || ln.length !== 1) {
      console.error(`${A.dir} is given as both the old and the new side: every recording would be compared with itself.\n${labels.length === 2 ? `It holds two labelled runs: pass each one's folder, --payloads ${path.join(A.dir, labels[0])} ${path.join(A.dir, labels[1])} (old first).` : 'Record each build with its own --label (states.mjs spec.json --base <old> --label before, then --base <new> --label after) and pass the two label folders under requests/, or record each build into its own --out and pass both.'}`);
      process.exit(1);
    }
    const rest = A.recs.filter((r) => r.label !== lo[0] && r.label !== ln[0]).length;
    A = { ...A, recs: A.recs.filter((r) => r.label === lo[0]) };
    B = { ...B, recs: B.recs.filter((r) => r.label === ln[0]) };
    notes.push(`◇ one folder for both builds: the recordings labelled "${lo[0]}" are the old build, "${ln[0]}" the new${rest ? ` (${rest} other recording(s) left out)` : ''}.`);
  }
  // A side holding several runs (labels) would pair a state with each of them: ask for one run per side.
  for (const [S, side] of [[A, 'old'], [B, 'new']]) {
    const ls = labelsOf(S);
    if (ls.length > 1) { console.error(`${S.dir} (the ${side} side) holds recordings of ${ls.length} runs (labels: ${ls.map((l) => (l === null ? '(none)' : `"${l}"`)).join(', ')}): pass one run's folder per side${ls.every(Boolean) ? `, such as ${path.join(S.dir, String(ls[0]))}` : ''}.`); process.exit(1); }
  }
  const baseSet = (R) => new Set(R.recs.map((r) => r.base).filter(Boolean));
  const sharedBase = [...baseSet(A)].filter((b) => baseSet(B).has(b));
  if (sharedBase.length) notes.push(`◇ both sides were recorded from ${sharedBase.join(', ')}: if the two builds did not take turns at that address, this compares one build with itself.`);
  // Values that change on every submission: compared for presence and type, never for value.
  const PER_SUBMIT = /^(csrfmiddlewaretoken|authenticity_token|_token|_csrf|csrf[_-]?token|xsrf[_-]?token|__requestverificationtoken|_wpnonce|nonce|idempotency[_-]?key|g-recaptcha-response|h-captcha-response|cf-turnstile-response)$/i;
  const ignoreKeys = each(a.ignore).map((k) => k.toLowerCase());
  const perSubmit = (at) => { const last = at.split('.').pop().replace(/(\[\d+\])+$/, '').toLowerCase(); return PER_SUBMIT.test(last) || ignoreKeys.includes(last) || ignoreKeys.includes(at.toLowerCase()); };
  const kind = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);
  const val = (v) => { const t = JSON.stringify(v) ?? String(v); return t.length > 70 ? `${t.slice(0, 67)}…` : t; };
  // Two long strings (a data URL, a file's text): show where they first differ, not two identical 70-character starts.
  const change = (x, y) => {
    if (typeof x !== 'string' || typeof y !== 'string' || (x.length <= 70 && y.length <= 70)) return `${val(x)} → ${val(y)}`;
    let i = 0; while (i < x.length && x[i] === y[i]) i++;
    const s = Math.max(0, i - 24), cut = (t) => JSON.stringify(`${s ? '…' : ''}${t.slice(s, i + 24)}${t.length > i + 24 ? '…' : ''}`);
    return `${cut(x)} → ${cut(y)} (first difference at character ${i + 1} of ${x.length} → ${y.length})`;
  };
  const fresh = () => ({ removed: [], added: [], order: [], types: [], values: [], ignored: [] });
  // Key by key, recursively: d collects removed, added, order, types, values as readable lines.
  const diff = (x, y, at, d) => {
    const tx = kind(x), ty = kind(y), here = at || '(body)', sub = (k) => (at ? `${at}.${k}` : k);
    if (tx !== ty) return d.types.push(`\`${here}\` ${tx} → ${ty} (${val(x)} → ${val(y)})`);
    if (at && perSubmit(at)) { if (JSON.stringify(x) !== JSON.stringify(y)) d.ignored.push(`\`${here}\``); return; }
    if (tx === 'object') {
      const kx = Object.keys(x), ky = Object.keys(y);
      kx.filter((k) => !Object.hasOwn(y, k)).forEach((k) => d.removed.push(`\`${sub(k)}\` (was ${val(x[k])})`));
      ky.filter((k) => !Object.hasOwn(x, k)).forEach((k) => d.added.push(`\`${sub(k)}\` = ${val(y[k])}`));
      const cx = kx.filter((k) => Object.hasOwn(y, k)), cy = ky.filter((k) => Object.hasOwn(x, k));
      if (cx.join('\n') !== cy.join('\n')) d.order.push(`${here}: ${cx.join(', ')} → ${cy.join(', ')}`);
      cx.forEach((k) => diff(x[k], y[k], sub(k), d));
    } else if (tx === 'array') {
      if (x.length !== y.length) d.values.push(`\`${here}\` ${x.length} item(s) → ${y.length}`);
      for (let i = 0; i < Math.min(x.length, y.length); i++) diff(x[i], y[i], `${here}[${i}]`, d);
    } else if (x !== y) d.values.push(`\`${here}\` ${change(x, y)}`);
  };
  const query = (u) => { const o = {}; for (const [k, v] of new URL(u).searchParams) o[k] = Object.hasOwn(o, k) ? [].concat(o[k], v) : v; return o; };
  const mediaType = (c) => String(c || 'none').split(';')[0].trim().toLowerCase();
  // A body over states.mjs's size limit is recorded cut off: what came after the cut (a large file and every field
  // after it) is unknown, so equal cut bodies prove nothing. A full-body digest, when the recording has one, decides.
  const TRUNC = /…\(truncated\)$/;
  const isCut = (r) => !!(r.truncated || r.bodyTruncated || (typeof r.raw === 'string' && TRUNC.test(r.raw)));
  const kept = (r) => (typeof r.raw === 'string' ? r.raw.replace(TRUNC, '').length : 0).toLocaleString('en-GB');
  const digest = (r) => r.sha256 || r.digest || r.hash || null;
  // states.mjs keeps only the size and SHA-256 of a body that is not UTF-8 text (a binary upload) or over 20 MB.
  const opaque = (r) => r.rawStored === false;
  const bytesOf = (r) => (Number.isFinite(r.bytes) ? `${r.bytes.toLocaleString('en-GB')} bytes` : 'size unknown');
  // A text body that is JSON (the recording could not parse it only because it was cut) is compared as JSON.
  const bodyOf = (r) => { if (r.format === 'text' && typeof r.body === 'string') try { return JSON.parse(r.body); } catch { /* text */ } return r.body; };
  const out = [], md = (x = '') => out.push(x);
  const tally = { same: 0, equal: 0, differ: 0, cut: 0, alone: 0, refused: 0 };
  const compare = (x, y) => {
    const lines = [], px = new URL(x.url), py = new URL(y.url), d = fresh(), dq = fresh();
    if (px.pathname !== py.pathname) lines.push(`✗ sent to a different endpoint: ${x.method} ${px.pathname} → ${y.method} ${py.pathname}`);
    else if (x.method !== y.method) lines.push(`✗ method changed: ${x.method} → ${y.method} (a server routes by method: the old handler no longer receives it)`);
    const cx = String(x.contentType || 'none').replace(/;\s*boundary=[^;]+/i, ''), cy = String(y.contentType || 'none').replace(/;\s*boundary=[^;]+/i, '');
    if (cx.toLowerCase() !== cy.toLowerCase()) lines.push(`${mediaType(cx) !== mediaType(cy) ? '✗' : '⚠'} Content-Type: ${cx} → ${cy}${x.format !== y.format ? ` (the body is now ${y.format}, was ${x.format}: the server parses it differently)` : ''}`);
    diff(query(x.url), query(y.url), '', dq);
    const q = [...dq.removed, ...dq.added, ...dq.types, ...dq.values];
    if (q.length || dq.order.length) lines.push(`⚠ query: ${[...dq.removed.map((k) => `removed ${k}`), ...dq.added.map((k) => `added ${k}`), ...dq.types, ...dq.values, ...dq.order.map((o) => `order ${o}`)].join('; ')}`);
    const cut = isCut(x) || isCut(y), dx = digest(x), dy = digest(y);
    const same = cut ? !!(dx && dy && dx === dy) : x.sha256 && y.sha256 ? x.sha256 === y.sha256 : x.raw === y.raw;
    if (!same && (opaque(x) || opaque(y)) && typeof x.body === 'string' && typeof y.body === 'string') {
      lines.push(`⚠ body differs (${bytesOf(x)} → ${bytesOf(y)}, SHA-256 differs); it was not stored as text (a binary upload or a body over 20 MB), so compare what was sent by hand`);
    } else if (!same) {
      diff(bodyOf(x), bodyOf(y), '', d);
      const found = d.removed.length + d.types.length + d.added.length + d.values.length + d.order.length;
      // After a cut, a key missing on one side may only be past the cut: the findings are warnings, not failures.
      if (cut) lines.push(`⚠ cannot compare in full: the recording cut off the ${[isCut(x) && `old body (${kept(x)} characters kept)`, isCut(y) && `new body (${kept(y)} characters kept)`].filter(Boolean).join(' and ')}, so what came after the cut (a large file and every field after it) was not compared. ${found ? 'The differences below are in the part kept.' : 'The part kept does not differ'}${dx && dy ? `${found ? ' The' : ', but the'} digests show the full bodies differ.` : found ? '' : '.'} Check the full request in the browser's network panel, or record it with a smaller file.`);
      const F = cut ? '⚠' : '✗';
      if (d.removed.length) lines.push(`${F} keys removed (the server no longer receives them): ${d.removed.join(', ')}`);
      if (d.types.length) lines.push(`${F} value type changed: ${d.types.join(', ')}`);
      if (d.added.length) lines.push(`⚠ keys added (a strict server rejects unknown keys): ${d.added.join(', ')}`);
      if (d.values.length) lines.push(`⚠ value changed: ${d.values.join(', ')}`);
      if (d.order.length) lines.push(`◇ key order changed (matters only to code that hashes, signs or compares the raw body): ${d.order.join('; ')}`);
      // A binary body keeps only its hash: equal fields with different bytes mean the file itself changed, unless a
      // per-submission value (a token) already explains the difference.
      if (!found && !cut && (opaque(x) || opaque(y))) lines.push(d.ignored.length ? '◇ the bytes differ, as the values that change on every submission make them; the uploaded file itself could not be compared (the body was not stored as text)'
        : `⚠ same keys, types and values, but the bytes differ (${bytesOf(x)} → ${bytesOf(y)}): an uploaded file's content or encoding changed (the new build resizes or re-encodes it?); the body was not stored as text, so compare the files by hand`);
      if (!lines.length && !d.ignored.length && !dq.ignored.length) lines.push('◇ same keys, types and values; the bytes differ (whitespace or escaping)');
    }
    const ignored = [...dq.ignored.map((k) => `query ${k}`), ...d.ignored], real = lines.length;
    const equal = !same && !cut && !real && ignored.length > 0;
    if (ignored.length) lines.push(`◇ changes on every submission, so only its presence and type were compared: ${ignored.join(', ')}`);
    const mark = lines.some((l) => l.startsWith('✗')) ? '✗' : lines.some((l) => l.startsWith('⚠')) ? '⚠' : (same && !real) || equal ? '✓' : '◇';
    tally[cut && !same ? 'cut' : same && !real ? 'same' : equal ? 'equal' : 'differ']++;
    const size = kind(x.body) === 'object' ? ` (${Object.keys(x.body).length} keys, ${x.format})` : x.raw == null ? ' (no body)' : ` (${x.format})`;
    md(`- ${mark} ${x.method} ${px.pathname}${same ? `: body ${cut ? `identical by ${String(dx).length === 64 ? 'SHA-256' : 'digest'} (the recording kept only part of it)` : 'byte-identical'}${size}` : equal ? `: same body apart from values that change on every submission${size}` : ''}`);
    lines.forEach((l) => md(`  - ${l}`));
    return d.values.length > 0;
  };
  md(`# Payloads: ${A.dir} → ${B.dir}`);
  md();
  notes.forEach((n) => md(n));
  if (notes.length) md();
  const names = [...new Set([...A.recs, ...B.recs].map((r) => r.state))];
  const onlyA = names.filter((n) => !B.recs.some((r) => r.state === n)), onlyB = names.filter((n) => !A.recs.some((r) => r.state === n));
  md(`States recorded on both sides: ${names.length - onlyA.length - onlyB.length}${onlyA.length ? ` · old only: ${onlyA.join(', ')}` : ''}${onlyB.length ? ` · new only: ${onlyB.join(', ')}` : ''}`);
  let valuesDiffer = false;
  for (const x of A.recs) {
    // Never the recording itself: not the same file, and not one with the same label taken from the same address.
    const peers = B.recs.filter((r) => r.state === x.state);
    const itself = (r) => r.file === x.file || (x.label && r.label === x.label && r.base === x.base);
    const y = peers.filter((r) => !itself(r)).find((r) => r.device === x.device) || peers.filter((r) => !itself(r))[0];
    if (!y) {
      if (peers.length) {
        tally.refused++;
        md();
        md(`## ${x.state}  (old: ${x.device || '?'})`);
        md(`- ✗ not compared: the new side's recording is ${peers[0].file === x.file ? 'the same file' : `labelled "${x.label}" and taken from ${x.base || 'the same address'} too, so it is the same build recorded twice`}. Record the new build with its own --out or --label.`);
      }
      continue;
    }
    md();
    md(`## ${x.state}  (old: ${x.device || '?'} · new: ${y.device || '?'})`);
    if (!x.requests.length && !y.requests.length) { md('- ⚠ no request recorded on either side: check the record glob and that the submit happened (a wait after it).'); continue; }
    // Pair by method and path in the order sent; then by path (the method changed); then by method (the endpoint moved).
    const left = [...y.requests], pairs = [], alone = [];
    const take = (r, same) => { const i = left.findIndex(same); return i >= 0 ? pairs.push([r, left.splice(i, 1)[0]]) : 0; };
    const pathOf = (r) => new URL(r.url).pathname;
    for (const r of x.requests) if (!take(r, (q) => q.method === r.method && pathOf(q) === pathOf(r))) alone.push(r);
    for (const r of alone.splice(0)) if (!take(r, (q) => pathOf(q) === pathOf(r))) alone.push(r);
    for (const r of alone.splice(0)) if (!take(r, (q) => q.method === r.method)) alone.push(r);
    for (const [r, q] of pairs) if (compare(r, q)) valuesDiffer = true;
    alone.forEach((r) => { tally.alone++; md(`- ✗ ${r.method} ${pathOf(r)}: sent by the old build only`); });
    left.forEach((r) => { tally.alone++; md(`- ⚠ ${r.method} ${pathOf(r)}: sent by the new build only`); });
  }
  md();
  md(`${tally.same + tally.equal + tally.differ + tally.cut} request pair(s): ${tally.same} byte-identical${tally.equal ? `, ${tally.equal} identical apart from values that change on every submission` : ''}, ${tally.differ} differ${tally.cut ? `, ${tally.cut} could not be compared in full (body cut off in the recording)` : ''}${tally.alone ? `, ${tally.alone} sent by one build only` : ''}${tally.refused ? `, ${tally.refused} state(s) not compared (the same recording on both sides)` : ''}.`);
  if (valuesDiffer) md('\nA changed value with the same answers means the new build transforms what was entered (trims, re-cases, reformats), or the two scenarios did not enter the same answers: check which. A value that changes on every submission (a token, a timestamp) is not a difference: pass its key to --ignore.');
  const report = out.join('\n');
  if (a.out) await writeFile(String(a.out), report + '\n');
  console.log(report);
  process.exit(0);
}
const green = !!a.greenfield;
const sources = asList(a.source);
if (green) {
  if (typeof a.after !== 'string' || !sources.length) { console.error('Usage: node parity.mjs --greenfield --after <new base URL> --source <dirs or files…> [--paths …|--crawl N] [--derived …] [--out parity.md]\n--greenfield checks every claim on the new site against --source (the discovery/ transcriptions, the owner\'s answers, content files): --source is required.'); process.exit(2); }
  if (a.before) { console.error('--greenfield is for a first site with no old build: drop --before, or drop --greenfield to compare the two builds.'); process.exit(2); }
} else if (!a.before || !a.after) { console.error('Usage: --before <old base URL> --after <new base URL> [--paths …|--crawl N] [--source dirs…] [--removed …]  |  --greenfield --after <new base URL> --source <dirs…>  |  --payloads <old dir> <new dir>'); process.exit(1); }
const before = green ? null : String(a.before).replace(/\/$/, ''), after = String(a.after).replace(/\/$/, '');
const crawlN = a.crawl ? Number(a.crawl) || 30 : 0;
let paths = asList(a.paths, ['/']);

// Patterns first, so a malformed one stops the run before a browser starts. A /…/ in --removed is a regex only with
// a regex character in it and valid flags ("/old/page" and "/about/us" are routes); g and y are dropped (they make
// test() stateful). --derived never names a route, so any /…/ there is a regex.
const regexOf = (opt, d, strict) => {
  const m = d.match(/^\/(.+)\/([a-z]*)$/);
  if (!m) return null;
  const flagsOk = /^(?!.*(.).*\1)[dgimsuyv]*$/.test(m[2]);
  if (strict && (!/[\\^$*+?()[\]{}|]/.test(m[1]) || !flagsOk)) return null;
  const fail = (why) => { console.error(`--${opt} "${d}": not a valid regular expression (${why}). ${strict ? 'A route is written "/old/page", a regex "/^old/i".' : 'Write a regex as "/^\\d+ days$/i".'}`); process.exit(2); };
  if (!flagsOk) fail(`"${m[2]}" are not regex flags`);
  try { return new RegExp(m[1], m[2].replace(/[gy]/g, '')); } catch (e) { return fail(e.message.split(': ').pop()); }
};
const removedPats = each(a.removed).map((d) => ({ d, re: regexOf('removed', d, true) }));
const derivedPats = each(a.derived).map((d) => regexOf('derived', d, false) || d.toLowerCase());

// Sources: folders are walked for text files; a file named directly is read whatever its extension, unless binary.
let sourceText = '', sourceFiles = 0;
const sourceNotes = [];
const walk = async (d) => {
  for (const f of await readdir(d).catch(() => [])) {
    if (/^(node_modules|\.git|dist|build|\.next|\.astro|coverage|\.cache)$/.test(f)) continue;
    const fp = path.join(d, f);
    const st = await stat(fp).catch(() => null);
    if (!st) continue;
    if (st.isDirectory()) await walk(fp);
    else if (/\.(md|mdx|json|ya?ml|tsx?|jsx?|astro|html?|vue|svelte|txt|csv)$/i.test(f) && st.size < 2e6) { sourceText += (await readFile(fp, 'utf8')) + '\n'; sourceFiles++; }
  }
};
for (const src of sources) {
  const st = await stat(src).catch(() => null);
  if (!st) sourceNotes.push(`⚠ --source ${src}: not found, not searched`);
  else if (st.isDirectory()) await walk(src);
  else if (/\.(pdf|docx?|xlsx?|pptx?|odt|rtf|pages|key|png|jpe?g|gif|webp|avif|heic|mp4|mov|zip)$/i.test(src)) sourceNotes.push(`⚠ --source ${src}: a binary file, not searched — transcribe what it says into a .md or .txt file`);
  else if (st.size >= 2e6) sourceNotes.push(`⚠ --source ${src}: over 2 MB, not searched`);
  else { sourceText += (await readFile(src, 'utf8')) + '\n'; sourceFiles++; }
}
if (green && !sourceText.trim()) { console.error(`--source ${sources.join(', ')}: no readable text found${sourceNotes.length ? ` (${sourceNotes.map((n) => n.replace(/^⚠ --source /, '')).join('; ')})` : ''}. --greenfield checks every claim against the sources; with none, every claim would be unsourced.`); process.exit(2); }

const { browser } = await launch({ chrome: a.chrome });

function extract(opts) {
  // One digit system for comparison: Eastern Arabic and Persian digits, Arabic separators and bidi marks are
  // normalised, so a claim written ٥٥٬٤٨٤ on the old Arabic page is the same claim as 55,484 on the new one.
  const clean = (s) => s
    .replace(/[\u0660-\u0669]/g, (d) => d.charCodeAt(0) - 0x660).replace(/[\u06F0-\u06F9]/g, (d) => d.charCodeAt(0) - 0x6F0)
    .replace(/\u066B/g, '.').replace(/\u066C/g, ',').replace(/\u066A/g, '%').replace(/\u2212/g, '-')
    .replace(/[\u200E\u200F\u061C\u202A-\u202E\u2066-\u2069]/g, '');
  const text = clean(document.body.innerText || '');
  // Where each number on the page sits, for the same value in a new format: the text around it inside its own item,
  // and the label a bare value has (its table headers, its <dt>, the rest of a small stat card). The item is the
  // number's nearest element with words in it (climbing through wrappers such as <strong>10</strong>); inside it,
  // block edges and <br> end the text, and another link or button with words in it is left out (a separate item),
  // so "Council minutes" in the link before "Zone 10 map" is never the 10's unit.
  const nums = [];
  if (opts && opts.contexts) {
    const LET = /\p{L}/u, NUM = /\d(?:[\d,]|[\u202f\u00a0](?=\d{3}(?!\d)))*(?:\.\d+)?/g;
    const ITEM = 'a[href], button, [role=link], [role=button], [role=tab], [role=menuitem], summary, option';
    const SKIP = /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/i;
    const styles = new Map(), letters = new Map(), toks = new Map(), labels = new Map(), texts = new Map(), heads = new Map(), vis = new Map();
    const st = (el) => { let s = styles.get(el); if (!s) { const c = getComputedStyle(el); s = { d: c.display, v: c.visibility }; styles.set(el, s); } return s; };
    const isBlock = (el) => !/^(inline|contents)/.test(st(el).d);
    const lettered = (el) => { let l = letters.get(el); if (l === undefined) { l = LET.test(el.textContent); letters.set(el, l); } return l; };
    const shown = (el) => {
      if (vis.has(el)) return vis.get(el);
      let v = el; while (v && v !== document.body && st(v).d === 'contents') v = v.parentElement;
      const r = !v || !v.checkVisibility || v.checkVisibility({ checkVisibilityCSS: true, visibilityProperty: true });
      vis.set(el, r); return r;
    };
    const tokensOf = (c) => {
      let t = toks.get(c); if (t) return t;
      t = { s: [], at: new Map() };
      const rec = (el) => {
        for (const n of el.childNodes) {
          if (n.nodeType === 3) { if (st(el).v === 'visible') { t.at.set(n, t.s.length); t.s.push(clean(n.data)); } continue; }
          if (n.nodeType !== 1 || SKIP.test(n.tagName) || st(n).d === 'none') continue;
          if (/^br$/i.test(n.tagName)) { t.s.push(' '); continue; }   // "10<br>minutes" in a stat: one item
          if (n.matches(ITEM) && lettered(n)) { t.s.push('\n'); continue; }
          const b = isBlock(n);
          if (b) t.s.push('\n');
          rec(n);
          if (b) t.s.push('\n');
        }
      };
      rec(c); toks.set(c, t); return t;
    };
    const text1 = (el) => { let t = texts.get(el); if (t === undefined) { t = clean(el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim(); texts.set(el, t); } return t; };
    // A table's header row: the last row of <thead>, or else the first row made only of <th> (found once per table).
    const headRowOf = (tbl) => {
      if (!heads.has(tbl)) heads.set(tbl, (tbl.tHead && tbl.tHead.rows[tbl.tHead.rows.length - 1]) || [...tbl.rows].find((r) => r.cells.length && [...r.cells].every((k) => k.tagName === 'TH')) || null);
      return heads.get(tbl);
    };
    // A bare value (a cell, <dd> or block holding only the number) takes its label from the markup around it.
    const labelOf = (c) => {
      if (labels.has(c)) return labels.get(c);
      let l = '';
      const cell = c.closest('td, th'), dd = c.closest('dd');
      if (lettered(c) || c === document.body) l = '';
      else if (cell && !lettered(cell) && cell.parentElement) {
        const row = cell.parentElement, tbl = cell.closest('table');
        let x = 0; for (const k of row.cells || []) { if (k === cell) break; x += k.colSpan; }
        const at = (r, i) => { let j = 0; for (const k of r.cells) { if (i < j + k.colSpan) return k; j += k.colSpan; } return null; };
        const rowHead = [...(row.cells || [])].find((k) => k !== cell && k.tagName === 'TH') || (row.cells?.[0] !== cell && row.cells?.[0] && lettered(row.cells[0]) ? row.cells[0] : null);
        const headRow = tbl && headRowOf(tbl);
        const colHead = headRow && headRow !== row ? at(headRow, x) : null;
        l = [rowHead, colHead].filter((k) => k && k !== cell).map(text1).join(' | ');
      } else if (dd && !lettered(dd)) {
        let e = dd.previousElementSibling; while (e && e.tagName !== 'DT') e = e.previousElementSibling;
        l = e ? text1(e) : '';
      } else if (c.parentElement && c.parentElement !== document.body) {
        // A stat card: the value's container is short and holds no other number ("10" over "minutes to apply").
        const t = text1(c.parentElement);
        if (t.length <= 80 && [...t.matchAll(NUM)].length === 1) l = t;
      }
      labels.set(c, l); return l;
    };
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n && nums.length < 20000; n = walker.nextNode()) {
      const el = n.parentElement;
      if (!el || !/[\d\u0660-\u0669\u06F0-\u06F9]/.test(n.data) || SKIP.test(el.tagName) || el.closest('script, style, noscript, template') || !shown(el)) continue;
      let c = el; while (c !== document.body && c.parentElement && !isBlock(c) && !lettered(c)) c = c.parentElement;
      const t = tokensOf(c), i = t.at.get(n);
      if (i === undefined) continue;
      const own = t.s[i], label = labelOf(c);
      for (const m of own.matchAll(NUM)) {
        let pre = own.slice(0, m.index), post = own.slice(m.index + m[0].length);
        for (let k = i - 1; k >= 0 && pre.length < 40; k--) pre = t.s[k] + pre;
        for (let k = i + 1; k < t.s.length && post.length < 40; k++) post += t.s[k];
        nums.push({ v: parseFloat(m[0].replace(/[,\u202f\u00a0]/g, '')), pre: pre.slice(-40), post: post.slice(0, 40), label });
      }
    }
  }
  // A claim keeps the noun it counts ("12,000+ teams"): the same number counting something else is a new claim.
  // Same-line spaces only: "4\nReview and pay" is a step number beside a heading, not "4 reviews".
  const NOUN = '(?:[ \\t\\u00a0](?:active\\s|happy\\s|paying\\s|monthly\\s)?(?:users?|customers?|clients?|teams?|companies|businesses|brands|countries|languages|integrations|reviews?|ratings?|stars?|downloads|installs|employees|people|members|subscribers|developers|partners|farms|stores|shops|orders|projects|sites|websites|apps|hours?|days?|weeks?|months?|years?|minutes?|seconds?))';
  const CUR = '(?:SAR|AED|USD|EUR|GBP|QAR|KWD|BHD|OMR|EGP|MAD|INR|ر\\.س|د\\.إ|ريال|درهم|جنيه)';
  // Ratings ("4.8/5") but not dates ("9/5/2026", "15/9"); amounts with a currency code or Arabic symbol either side.
  const claimRe = new RegExp(`(?:(?<![\\d/.])\\d(?:\\.\\d)?\\s?\\/\\s?(?:5|10)\\b(?!\\s?\\/\\s?\\d)|${CUR}\\s?\\d[\\d,.]*|\\b\\d[\\d,.]*\\s?${CUR}|\\b\\d(?:\\.\\d)?\\s?(?:out of|of)\\s?(?:5|10)\\b|[$€£¥₹]\\s?\\d[\\d,.]*(?:\\s?(?:k|m|bn|million|billion))?(?:\\s?\\/\\s?\\w+)?|\\b\\d[\\d,.]*[ \\u00a0]?(?:%|x\\b(?![ \\u00a0]?\\d)|×(?![ \\u00a0]?\\d)|\\+(?!\\s?\\d)|m²|m2\\b|cm\\b|mm\\b|k\\+?\\b|m\\+?\\b|ms\\b(?!\\/)|(?:L|kg|km|kWh|GB|TB|lb|mph|km\\/h)\\b)${NOUN}?|\\b\\d[\\d,.]*${NOUN}\\b|[↑↓▲▼]\\s?[+−-]?\\d[\\d,.]*\\s?%?|\\b(?:since|founded in|est\\.?)\\s+\\d{4}\\b)`, 'gi');
  const claims = [...new Set([...text.matchAll(claimRe)].map((m) => m[0].replace(/\s+/g, ' ').trim().replace(/(\d)[.,]+$/, '$1')).filter((c) => !/\dmS$|\d mS$/.test(c)))];
  const quotes = [...new Set([
    ...[...document.querySelectorAll('blockquote, q')].map((q) => q.innerText.replace(/\s+/g, ' ').trim()),
    ...[...text.matchAll(/[“"]([^”"\n]{25,280})[”"]/g)].map((m) => m[1].trim()),
  ].filter((q) => q.length >= 25))];
  const links = [...new Set([...document.querySelectorAll('a[href]')].map((l) => { try { const u = new URL(l.href, location.href); return u.origin === location.origin ? u.pathname.replace(/\/$/, '') || '/' : null; } catch { return null; } }).filter(Boolean))];
  const ids = [...new Set([...document.querySelectorAll('[id]')].map((e) => e.id).filter((id) => id && !/^(__|radix-|headlessui-|react-|:r|mui-|astro-|svelte-)/.test(id) && !/[0-9a-f]{6,}/.test(id)))];
  const fields = [...new Set([...document.querySelectorAll('form [name]')].map((e) => `${e.closest('form')?.getAttribute('action') || e.closest('form')?.id || 'form'} › ${e.getAttribute('name')}`))];
  // Analytics and script hooks: data-* attributes (name=value) on forms and controls; form action + method.
  const hooks = [...new Set([...document.querySelectorAll('form, a[href], button, input, select, textarea, [role=button]')].flatMap((e) =>
    [...e.attributes].filter((at) => at.name.startsWith('data-') && !/^data-(astro|v-|reactroot|radix|state|orientation|slot|headlessui|aria|theme|testid$)/.test(at.name) && !/[0-9a-f]{8,}/.test(at.value)).map((at) => `${at.name}="${at.value.slice(0, 60)}"`)))];
  const forms = [...document.querySelectorAll('form')].map((f) => `${f.id ? '#' + f.id : 'form'} ${String(f.getAttribute('method') || 'get').toLowerCase()} ${f.getAttribute('action') || '(same page)'}`);
  const meta = {
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.content || null,
    canonical: document.querySelector('link[rel="canonical"]')?.href || null,
    ogImage: document.querySelector('meta[property="og:image"]')?.content || null,
    h1: [...document.querySelectorAll('h1')].map((h) => h.innerText.trim()).join(' | ') || null,
  };
  return { text, claims, quotes, links, ids, fields, hooks, forms, meta, nums };
}

// contexts: where each number sits (both builds; greenfield skips it), for the same value in a new format.
async function load(base, p, contexts = false) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    const res = await open(page, urlFor(base, p));
    const status = res ? res.status() : 0;
    if (status >= 400) return { status };
    await settle(page, { settleMs: 300 });
    // Read twice: countdowns, clocks and count-up animations change between reads and are not claims to compare.
    const r1 = await page.evaluate(extract, {});
    await page.waitForTimeout(1500);
    const r2 = await page.evaluate(extract, { contexts });
    const stable = r2.claims.filter((c) => r1.claims.includes(c));
    const changing = [...r1.claims, ...r2.claims].filter((c) => !stable.includes(c));
    return { status, ...r2, claims: stable, changing };
  } catch (e) {
    return { status: 0, error: String(e.message).split('\n')[0] };
  } finally {
    await page.close();
  }
}

// Crawl the old site to find its routes (the new site in greenfield mode: there is no old one).
if (crawlN) {
  const seen = new Set(paths), queue = [...paths];
  while (queue.length && seen.size < crawlN) {
    const p = queue.shift();
    const page = await browser.newPage();
    const links = await open(page, urlFor(green ? after : before, p)).then(() => page.evaluate(() => [...new Set([...document.querySelectorAll('a[href]')].map((l) => { try { const u = new URL(l.href, location.href); return u.origin === location.origin ? u.pathname.replace(/\/$/, '') || '/' : null; } catch { return null; } }).filter(Boolean))])).catch(() => []);
    await page.close();
    for (const l of links) if (!seen.has(l) && !/\.(pdf|zip|png|jpe?g|svg|webp|xml|txt)$/i.test(l) && seen.size < crawlN) { seen.add(l); queue.push(l); }
  }
  paths = [...seen];
}

// Whitespace collapses to one space (never removed: "05:31", "daysInMilk" must not read as "31 days");
// thousands separators go; quotes and × are unified.
const norm = (s) => s.toLowerCase().replace(/(\d)[,\u202f\u00a0](?=\d{3}\b)/g, '$1').replace(/[“”"']/g, '').replace(/×/g, 'x').replace(/\s+/g, ' ');
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
// A claim is present only as a whole token run: "31 days" does not match inside "31 daysinmilk".
// Edges depend on the claim: a noun at the end needs a word boundary; a digit or symbol only needs no digit next to it
// (innerText runs "€79" into "per month" when a <small> follows, and "9.9%" must not match inside "99.9%").
const has = (text, claim) => {
  const c = norm(claim).trim(); if (!c) return false;
  const before = /^[\p{L}]/u.test(c) ? '(^|[^\\p{L}\\p{N}])' : '(^|[^\\p{N}.,])';
  const after = /[\p{L}]$/u.test(c) ? '(?![\\p{L}\\p{N}])' : '(?![\\p{N}]|[.,]\\p{N})';
  return new RegExp(`${before}${esc(c)}${after}`, 'u').test(text);
};
const sourceNorm = norm(sourceText);
// --removed: taken out on purpose. A string matches by kind, so an id pattern ("hours") never swallows a claim
// ("48 hours") and "£35" never swallows "£350": a claim needs a digit in the pattern and a whole-word match or the
// same figure; a quotation needs three or more of its words; ids, fields and routes match exactly.
const removedUsed = new Set();
const figure = (s) => { const t = norm(s).trim(), m = t.match(/\d+(?:\.\d+)?/); return m ? { v: parseFloat(m[0]), u: t.replace(m[0], ' ').replace(/\s+/g, ' ').trim() } : null; };
const matchesAs = (kind, n, d) => {
  if (kind === 'claim') { if (!/\d/.test(d)) return false; const f = figure(n), g = figure(d); return has(norm(n), d) || !!(f && g && f.v === g.v && f.u === g.u); }
  if (kind === 'quote') return d.trim().split(/\s+/).length >= 3 && has(norm(n), d);
  return n.toLowerCase() === d.toLowerCase().replace(/(.)\/$/, '$1');
};
// names: the ways an item can be written (an id with and without #).
const isRemoved = (kind, names) => {
  const hits = removedPats.filter((p) => names.filter(Boolean).some((n) => (p.re ? p.re.test(n) : matchesAs(kind, n, p.d))));
  hits.forEach((p) => removedUsed.add(p.d));
  return hits.length > 0;
};
const route = (p) => p.replace(/(.)\/$/, '$1');
const declared = (xs) => `- ◇ declared removed (--removed): ${xs.join(', ')} — DESIGN.md "Remove" should list each.`;

const out = [];
const md = (s = '') => out.push(s);
const oldAll = { text: '', claims: new Set(), quotes: new Set(), links: new Set() };
const newAll = { text: '', claims: new Set(), quotes: new Set(), links: new Set() };
const perPage = [];
const changingAll = new Set();
// Four routes at a time, old and new side by side (greenfield: the new side only).
for (let i = 0; i < paths.length; i += 4) {
  const batch = await Promise.all(paths.slice(i, i + 4).map(async (p) => { const [o, n] = await Promise.all([green ? { status: 0 } : load(before, p, true), load(after, p, !green)]); return { p, o, n }; }));
  perPage.push(...batch);
}
for (const { o, n } of perPage) {
  for (const r of [o, n]) (r.changing || []).forEach((c) => changingAll.add(c));
  for (const [acc, r] of [[oldAll, o], [newAll, n]]) {
    if (!r.text) continue;
    acc.text += r.text + '\n';
    r.claims.forEach((c) => acc.claims.add(c));
    r.quotes.forEach((c) => acc.quotes.add(c));
    r.links.forEach((c) => acc.links.add(c));
  }
}
const oldNorm = norm(oldAll.text), newNorm = norm(newAll.text);
// Line by line: a claim is on a page only within one block, as claims are read ("Zone 10" in one list item and
// "Minutes of the council" in the next is not "10 minutes").
const oldLines = oldAll.text.split('\n').map(norm).join('\n'), newLines = newAll.text.split('\n').map(norm).join('\n');
// The same value in another format (the unit moved to a column header, "12,748.5" now "12,748.50") counts only when it
// is surely the same figure:
//  - specific enough not to be a coincidence: 4+ significant digits once trailing zeros go, and not a year
//    ("55,484.00" and "2,431" yes; "10,000", "£35.00", "£125" and "2019" no). It may sit anywhere on the page. This
//    is used for dropped claims only: a new claim needs its own unit on the old site to be sourced from it.
//  - or its own unit or currency is attached to that very number (read from the DOM, see extract): a currency symbol
//    or code right beside it ("£35.00 a year", "35 GBP"); a unit word right after it, at most one word between
//    ("3 working days"); a label ending in ":" or a dash just before it ("Processing time (minutes): 10"); or the
//    label of a bare value (its table row or column header, its <dt>, the rest of a small stat card).
// A unit outside the number's own item ("Council minutes" in the link before "Zone 10 map"), two words away ("Zone 3
// map … Open days") or attached to another number ("Zone 35 permits now cost £40") does not count. Percentages and
// multipliers must keep their unit to count.
const numRe = /\d[\d,]*(?:\.\d+)?/g;
const oldNums = perPage.flatMap(({ o }) => o.nums || []), newNums = perPage.flatMap(({ n }) => n.nums || []);
const digits = (c) => (c.match(/\d[\d,]*(?:\.\d+)?/) || [''])[0];
const value = (c) => parseFloat(digits(c).replace(/,/g, ''));
const significant = (c) => { const [i, f = ''] = digits(c).replace(/,/g, '').split('.'), fr = f.replace(/0+$/, ''), int = i.replace(/^0+/, ''); return fr ? `${int}${fr}`.replace(/^0+/, '').length : int.replace(/0+$/, '').length; };
const specific = (c) => significant(c) >= 4 && !/^(?:1[89]|20)\d\d$/.test(digits(c).replace(/,/g, ''));
// The text next to a number ends at another number, a block or item edge, an inline separator (· • |) or the end of a
// sentence.
const cutBefore = (s) => norm(s.replace(/^[\s\S]*(?:\d|\n|[·•|]|[.!?;](?=\s))/, ''));
const cutAfter = (s) => norm(s.replace(/(?:\d|\n|[·•|]|[.!?;](?=\s|$))[\s\S]*$/, ''));
const attached = (c, nums) => {
  const n = norm(c), u = n.replace(digits(n), ' ').replace(/[+~≈]/g, ' ').trim();
  const cur = u.match(/[$€£¥₹]|ر\.س|د\.إ|ريال|درهم|جنيه|\b(?:sar|aed|usd|eur|gbp|qar|kwd|bhd|omr|egp|mad|inr)\b/);
  const word = cur ? null : u.split(/\s+/).pop();
  if (!cur && !word) return false;
  // A currency as written; a noun in any number ("minute", "minutes"); a short unit ("%", "x", "kg") as a whole token.
  const unit = cur ? `${esc(cur[0])}${/\p{L}$/u.test(cur[0]) ? '(?![\\p{L}])' : ''}`
    : `${esc(word.length >= 4 ? word.replace(/(?:ies|s)$/, '') : word)}${word.length >= 4 ? '\\p{L}{0,3}' : ''}(?![\\p{L}])`;
  const re = new RegExp(`(^|[^\\p{L}])${unit}`, 'u'), besideBefore = new RegExp(`(^|[^\\p{L}])${unit}\\s?$`, 'u'), besideAfter = new RegExp(`^\\s?${unit}`, 'u');
  return nums.some(({ v, pre, post, label }) => {
    if (v !== value(c)) return false;
    if (label && re.test(norm(label))) return true;
    const p = cutBefore(pre), q = cutAfter(post);
    if (/(?:[:=–—]|\s-)\s*$/.test(p) && re.test(p)) return true;
    return cur ? besideBefore.test(p) || besideAfter.test(q) : re.test(q.trim().split(/\s+/).slice(0, 2).join(' '));
  });
};

md(green ? `# Parity (greenfield): ${after}` : `# Parity: ${before} → ${after}`);
md();
if (green) { md('Greenfield: no old build — claims checked against --source only; route, id, field and metadata parity not applicable.'); md(); }
md(`Routes ${green ? 'read' : 'compared'}: ${paths.length}${crawlN ? ` (crawled from the ${green ? 'new' : 'old'} site)` : ''}${sources.length ? ` · sources searched: ${sources.join(', ')} (${sourceFiles} file${sourceFiles === 1 ? '' : 's'})` : ''}`);
sourceNotes.forEach((n) => md(`- ${n}`));
md();
if (green) {
  const unread = perPage.filter(({ n }) => !n.text);
  if (unread.length) { md(unread.map(({ p, n }) => `- ⚠ \`${p}\` ${n.status >= 400 ? `returns ${n.status}` : `fails (${n.error || 'no response'})`} on the new site: its claims were not checked.`).join('\n')); md(); }
  if (removedPats.length) { md('- ◇ --removed does not apply with --greenfield: there is no old site to remove anything from.'); md(); }
} else {
  const missingAll = perPage.filter(({ o, n }) => o.status && o.status < 400 && (!n.status || n.status >= 400));
  const missing = missingAll.filter(({ p }) => !isRemoved('route', [route(p)]));
  md('## Routes');
  md(missing.length ? missing.map(({ p, n }) => `- ✗ \`${p}\` answered on the old site, ${n.status ? `returns ${n.status}` : `fails (${n.error || 'no response'})`} on the new one — keep it or redirect it.`).join('\n') : '- ✓ every compared route answers on the new site.');
  const orphanedAll = [...oldAll.links].filter((l) => !newAll.links.has(l));
  const orphaned = orphanedAll.filter((l) => !isRemoved('route', [l]));
  const routesRemoved = [...new Set([...missingAll.filter((x) => !missing.includes(x)).map(({ p }) => route(p)), ...orphanedAll.filter((l) => !orphaned.includes(l))])];
  if (routesRemoved.length) md(declared(routesRemoved.map((l) => `\`${l}\``)));
  if (orphaned.length) md(`- ⚠ linked from the old pages but not from any new page: ${orphaned.slice(0, 20).map((l) => `\`${l}\``).join(', ')}`);
  md();
}

md('## Claims on the new site with no source');
// On the old site as written, or as the same value with its own unit attached ("£45" there, "£45.00" here).
const unsourcedAll = [...newAll.claims].filter((c) => !has(oldLines, c) && !attached(c, oldNums) && !(sourceNorm && has(sourceNorm, c)));
// A number that appears in the source files without its unit (sample data in JSON, a figure in a CMS field) is likely
// sourced; it is listed for a look rather than failed.
const bareNumber = (c) => (c.match(/\d[\d,.]*/) || [''])[0].replace(/,/g, '');
// By value as well as by string: "£18.00" on the page is 18.0 in products.json.
const sourceValues = sourceNorm ? new Set([...sourceNorm.matchAll(/\d[\d,]*(?:\.\d+)?/g)].map((m) => parseFloat(m[0].replace(/,/g, '')))) : new Set();
const numberInSources = unsourcedAll.filter((c) => sourceNorm && bareNumber(c).length >= 2 && (new RegExp(`(^|[^\\d.])${bareNumber(c).replace('.', '\\.')}([^\\d]|$)`).test(sourceNorm) || sourceValues.has(parseFloat(bareNumber(c)))));
// --derived: values the new build computes from data it already had (days late, bucket limits, axis ticks, a
// month-on-month change). Declared, they are listed as such instead of failing; say in DESIGN.md how each is computed.
const isDerived = (c) => derivedPats.some((p) => (p instanceof RegExp ? p.test(c) : c.toLowerCase().includes(p)));
const derived = unsourcedAll.filter((c) => !numberInSources.includes(c) && isDerived(c));
// "3 days" is sourced by a data field named for its noun ("lead_time_days": 3), however short the number.
const keyed = (c) => { const m = c.match(/^(\d[\d,.]*)\s+([a-z]+?)s?$/i); return !!(m && sourceNorm && new RegExp(`${m[2].toLowerCase()}[a-z_]*["']?\\s*[:=]\\s*${m[1].replace(/,/g, '').replace('.', '\\.')}\\b`).test(sourceNorm)); };
for (const c of unsourcedAll) if (!numberInSources.includes(c) && keyed(c)) numberInSources.push(c);
const unsourced = unsourcedAll.filter((c) => !numberInSources.includes(c) && !derived.includes(c));
const unsourcedQuotes = [...newAll.quotes].filter((q) => !oldNorm.includes(norm(q).slice(0, 60)) && !(sourceNorm && sourceNorm.includes(norm(q).slice(0, 60))));
md(unsourced.length || unsourcedQuotes.length ? [
  ...unsourced.map((c) => `- ✗ "${c}"`),
  ...unsourcedQuotes.map((q) => `- ✗ quotation: “${q.slice(0, 140)}${q.length > 140 ? '…' : ''}”`),
].join('\n') + '\n\nEach needs a source (the user, the repo, a document) or it comes out. Sample data in a product fragment must read as obviously illustrative.'
  : `- ✓ none — every number and quotation on the new site ${green ? 'is in the sources' : 'exists on the old site or in the sources'}.`);
if (numberInSources.length) md(`\n- ⚠ the number (without its unit) appears in the source files — check it is the same figure: ${numberInSources.map((c) => `"${c}"`).join(', ')}`);
if (derived.length) md(`\n- ◇ declared as computed from data (--derived): ${derived.map((c) => `"${c}"`).join(', ')} — DESIGN.md should say how each is calculated.`);
md();

if (changingAll.size) { md(`Changing values (timers, clocks, count-up animations) left out of the comparison: ${[...changingAll].slice(0, 8).map((c) => `"${c.replace(/\s+/g, ' ')}"`).join(', ')}`); md(); }
if (!green) {
  md('## Claims on the old site missing from the new one');
  const droppedAll = [...oldAll.claims].filter((c) => !has(newLines, c) && !changingAll.has(c));
  const claimsRemoved = droppedAll.filter((c) => isRemoved('claim', [c]));
  const newValues = new Set([...newNorm.matchAll(numRe)].map((m) => parseFloat(m[0].replace(/,/g, ''))));
  const reformatted = droppedAll.filter((c) => !claimsRemoved.includes(c) && newValues.has(value(c)) && ((!/%|x\b|×/i.test(c) && value(c) >= 10 && specific(c)) || attached(c, newNums)));
  const dropped = droppedAll.filter((c) => !reformatted.includes(c) && !claimsRemoved.includes(c));
  const droppedQuotesAll = [...oldAll.quotes].filter((q) => !newNorm.includes(norm(q).slice(0, 60)));
  const droppedQuotes = droppedQuotesAll.filter((q) => !isRemoved('quote', [q]));
  const quotesRemoved = droppedQuotesAll.filter((q) => !droppedQuotes.includes(q));
  if (claimsRemoved.length || quotesRemoved.length) md(declared([...claimsRemoved.map((c) => `"${c}"`), ...quotesRemoved.map((q) => `“${q.slice(0, 60)}${q.length > 60 ? '…' : ''}”`)]) + '\n');
  if (reformatted.length) md(`- ◇ same value, new format (check the unit is still stated nearby): ${reformatted.slice(0, 15).map((c) => `"${c}"`).join(', ')}${reformatted.length > 15 ? ` and ${reformatted.length - 15} more` : ''}\n`);
  md(dropped.length || droppedQuotes.length ? [
    ...dropped.map((c) => `- ⚠ "${c}"`),
    ...droppedQuotes.map((q) => `- ⚠ quotation: “${q.slice(0, 140)}${q.length > 140 ? '…' : ''}”`),
  ].join('\n') + '\n\nEach should be a deliberate "Remove" in DESIGN.md, or restored.' : '- ✓ none.');
  md();

  md('## Per page: ids, form fields, metadata');
  let allKept = true;
  for (const { p, o, n } of perPage) {
    if (!o.text || !n.text) continue;
    const lines = [];
    const lostIdsAll = o.ids.filter((id) => !n.ids.includes(id));
    const lostIds = lostIdsAll.filter((id) => !isRemoved('id', [`#${id}`, id]));
    const lostFieldsAll = o.fields.filter((f) => !n.fields.includes(f));
    const lostFields = lostFieldsAll.filter((f) => !isRemoved('field', [f, f.split(' › ').pop()]));
    const removedHere = [...lostIdsAll.filter((id) => !lostIds.includes(id)).map((id) => `#${id}`), ...lostFieldsAll.filter((f) => !lostFields.includes(f))];
    if (removedHere.length) lines.push(declared(removedHere));
    if (lostIds.length) lines.push(`- ⚠ ids gone (anchors, script or analytics hooks?): ${lostIds.slice(0, 15).map((x) => `#${x}`).join(', ')}${lostIds.length > 15 ? ` +${lostIds.length - 15}` : ''}`);
    if (lostFields.length) lines.push(`- ✗ form fields renamed or removed: ${lostFields.join(', ')}`);
    const lostHooks = (o.hooks || []).filter((h) => !(n.hooks || []).includes(h));
    if (lostIds.length || lostFields.length || lostHooks.length || !n.meta.h1) allKept = false;
    if (lostHooks.length) lines.push(`- ✗ data-* hooks gone (analytics, tests, scripts?): ${lostHooks.slice(0, 12).join(', ')}`);
    const lostForms = (o.forms || []).filter((f) => !(n.forms || []).includes(f));
    if (lostForms.length) lines.push(`- ✗ form submission changed (id, method or action): ${lostForms.join(', ')} → now ${(n.forms || []).join(', ') || 'no form'}`);
    for (const k of ['title', 'description', 'canonical', 'ogImage']) {
      if (o.meta[k] && !n.meta[k]) lines.push(`- ✗ ${k} missing (was "${String(o.meta[k]).slice(0, 80)}")`);
    }
    // Only regressions are the redesign's: a page that never had an h1 is reported as a note, not a loss.
    if (!n.meta.h1) lines.push(o.meta.h1 ? '- ✗ no h1 (the old page had one)' : '- ⚠ no h1 (the old page had none either — fix it now)');
    if (lines.length) { md(`### ${p}`); lines.forEach((l) => md(l)); md(); }
  }
  if (allKept) md(`- ✓ every id, form field, data-* hook, form submission and piece of metadata is still there${removedPats.length ? ' (or declared removed)' : ''}.`);
  const unused = removedPats.filter((p) => !removedUsed.has(p.d));
  if (unused.length) { md(); md(`- ⚠ --removed matched nothing that was removed (a typo, or still on the new site?): ${unused.map((p) => `"${p.d}"`).join(', ')}`); }
}

await browser.close();
const report = out.join('\n');
if (a.out) await writeFile(String(a.out), report + '\n');
console.log(report);
