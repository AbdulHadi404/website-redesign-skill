#!/usr/bin/env node
/**
 * Old site vs new site: what the redesign added, dropped or broke.
 *
 *   node parity.mjs --before http://localhost:4000 --after http://localhost:3000 \
 *        [--paths / /pricing /about | --crawl 40] [--source src content] [--out parity.md]
 *
 * Run the old build (main branch) and the new build (redesign branch) side by
 * side. For every route it compares:
 *  - claims: numbers with units, prices, percentages, multipliers ("10x"),
 *    "N+" counts, quotations. A claim on the new site that appears nowhere on
 *    the old site and nowhere in --source files is UNSOURCED: find where it
 *    came from or remove it. A claim on the old site missing from every new
 *    page is DROPPED: confirm the removal was deliberate (DESIGN.md "Remove").
 *  - routes: every old route (given or crawled) must still answer on the new
 *    site; same-origin links the old site had and the new site no longer links
 *    to are reported as orphaned.
 *  - element ids (anchors, script and analytics hooks) and form field names
 *    present on the old page and missing on the new one.
 *  - title, meta description, canonical, og:image, h1.
 * This turns "never invent proof" and the audit's preserved-list into checks.
 * It cannot tell a true claim from a false one — only whether it has a source.
 */
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs, asList, launch, settle, urlFor } from './lib/env.mjs';

const a = parseArgs();
if (!a.before || !a.after) { console.error('Usage: --before <old base URL> --after <new base URL> [--paths …|--crawl N] [--source dirs…]'); process.exit(1); }
const before = String(a.before).replace(/\/$/, ''), after = String(a.after).replace(/\/$/, '');
const crawlN = a.crawl ? Number(a.crawl) || 30 : 0;
let paths = asList(a.paths, ['/']);

const { browser } = await launch({ chrome: a.chrome });

function extract() {
  const text = document.body.innerText || '';
  const claimRe = /(?:\b\d(?:\.\d)?\s?\/\s?(?:5|10)\b|\b\d(?:\.\d)?\s?(?:out of|of)\s?(?:5|10)\b|[$€£¥₹]\s?\d[\d,.]*(?:\s?(?:k|m|bn|million|billion))?(?:\s?\/\s?\w+)?|\b\d[\d,.]*\s?(?:%|x\b|×|\+|k\+?\b|m\+?\b|ms\b|seconds?\b|mins?\b|minutes?\b|hours?\b|days?\b|weeks?\b|months?\b|years?\b|users?\b|customers?\b|clients?\b|teams?\b|companies\b|businesses\b|countries\b|languages\b|integrations\b|reviews?\b|stars?\b|downloads\b|employees\b|people\b)|\b(?:since|founded in|est\.?)\s+\d{4}\b)/gi;
  const claims = [...new Set([...text.matchAll(claimRe)].map((m) => m[0].trim()))];
  const quotes = [...new Set([
    ...[...document.querySelectorAll('blockquote, q')].map((q) => q.innerText.replace(/\s+/g, ' ').trim()),
    ...[...text.matchAll(/[“"]([^”"\n]{25,280})[”"]/g)].map((m) => m[1].trim()),
  ].filter((q) => q.length >= 25))];
  const links = [...new Set([...document.querySelectorAll('a[href]')].map((l) => { try { const u = new URL(l.href, location.href); return u.origin === location.origin ? u.pathname.replace(/\/$/, '') || '/' : null; } catch { return null; } }).filter(Boolean))];
  const ids = [...new Set([...document.querySelectorAll('[id]')].map((e) => e.id).filter((id) => id && !/^(__|radix-|headlessui-|react-|:r|mui-|astro-|svelte-)/.test(id) && !/[0-9a-f]{6,}/.test(id)))];
  const fields = [...new Set([...document.querySelectorAll('form [name]')].map((e) => `${e.closest('form')?.getAttribute('action') || e.closest('form')?.id || 'form'} › ${e.getAttribute('name')}`))];
  const meta = {
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.content || null,
    canonical: document.querySelector('link[rel="canonical"]')?.href || null,
    ogImage: document.querySelector('meta[property="og:image"]')?.content || null,
    h1: [...document.querySelectorAll('h1')].map((h) => h.innerText.trim()).join(' | ') || null,
  };
  return { text, claims, quotes, links, ids, fields, meta };
}

async function load(base, p) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    const res = await page.goto(urlFor(base, p), { waitUntil: 'networkidle', timeout: 45000 }).catch(() => page.goto(urlFor(base, p), { waitUntil: 'load', timeout: 60000 }));
    const status = res ? res.status() : 0;
    if (status >= 400) return { status };
    await settle(page, { settleMs: 300 });
    return { status, ...(await page.evaluate(extract)) };
  } catch (e) {
    return { status: 0, error: String(e.message).split('\n')[0] };
  } finally {
    await page.close();
  }
}

// Crawl the old site to find its routes.
if (crawlN) {
  const seen = new Set(paths), queue = [...paths];
  while (queue.length && seen.size < crawlN) {
    const p = queue.shift();
    const r = await load(before, p);
    for (const l of r.links || []) if (!seen.has(l) && !/\.(pdf|zip|png|jpe?g|svg|webp|xml|txt)$/i.test(l) && seen.size < crawlN) { seen.add(l); queue.push(l); }
  }
  paths = [...seen];
}

const norm = (s) => s.toLowerCase().replace(/[\s,]/g, '').replace(/[“”"']/g, '').replace(/×/g, 'x');
let sourceText = '';
for (const dir of asList(a.source)) {
  const walk = async (d) => {
    for (const f of await readdir(d).catch(() => [])) {
      if (/^(node_modules|\.git|dist|build|\.next|\.astro|coverage|\.cache)$/.test(f)) continue;
      const fp = path.join(d, f);
      const st = await stat(fp).catch(() => null);
      if (!st) continue;
      if (st.isDirectory()) await walk(fp);
      else if (/\.(md|mdx|json|ya?ml|tsx?|jsx?|astro|html?|vue|svelte|txt|csv)$/i.test(f) && st.size < 2e6) sourceText += (await readFile(fp, 'utf8')) + '\n';
    }
  };
  await walk(dir);
}
const sourceNorm = norm(sourceText);

const out = [];
const md = (s = '') => out.push(s);
const oldAll = { text: '', claims: new Set(), quotes: new Set(), links: new Set() };
const newAll = { text: '', claims: new Set(), quotes: new Set(), links: new Set() };
const perPage = [];
for (const p of paths) {
  const [o, n] = [await load(before, p), await load(after, p)];
  perPage.push({ p, o, n });
  for (const [acc, r] of [[oldAll, o], [newAll, n]]) {
    if (!r.text) continue;
    acc.text += r.text + '\n';
    r.claims.forEach((c) => acc.claims.add(c));
    r.quotes.forEach((c) => acc.quotes.add(c));
    r.links.forEach((c) => acc.links.add(c));
  }
}
const oldNorm = norm(oldAll.text), newNorm = norm(newAll.text);

md(`# Parity: ${before} → ${after}`);
md();
md(`Routes compared: ${paths.length}${crawlN ? ' (crawled from the old site)' : ''}${asList(a.source).length ? ` · sources searched: ${asList(a.source).join(', ')}` : ''}`);
md();
const missing = perPage.filter(({ o, n }) => o.status && o.status < 400 && (!n.status || n.status >= 400));
md('## Routes');
md(missing.length ? missing.map(({ p, n }) => `- ✗ \`${p}\` answered on the old site, ${n.status ? `returns ${n.status}` : `fails (${n.error || 'no response'})`} on the new one — keep it or redirect it.`).join('\n') : '- ✓ every compared route answers on the new site.');
const orphaned = [...oldAll.links].filter((l) => !newAll.links.has(l));
if (orphaned.length) md(`- ⚠ linked from the old pages but not from any new page: ${orphaned.slice(0, 20).map((l) => `\`${l}\``).join(', ')}`);
md();

md('## Claims on the new site with no source');
const unsourced = [...newAll.claims].filter((c) => !oldNorm.includes(norm(c)) && !(sourceNorm && sourceNorm.includes(norm(c))));
const unsourcedQuotes = [...newAll.quotes].filter((q) => !oldNorm.includes(norm(q).slice(0, 60)) && !(sourceNorm && sourceNorm.includes(norm(q).slice(0, 60))));
md(unsourced.length || unsourcedQuotes.length ? [
  ...unsourced.map((c) => `- ✗ "${c}"`),
  ...unsourcedQuotes.map((q) => `- ✗ quotation: “${q.slice(0, 140)}${q.length > 140 ? '…' : ''}”`),
].join('\n') + '\n\nEach needs a source (the user, the repo, a document) or it comes out. Sample data in a product fragment must read as obviously illustrative.' : '- ✓ none — every number and quotation on the new site exists on the old site or in the sources.');
md();

md('## Claims on the old site missing from the new one');
const dropped = [...oldAll.claims].filter((c) => !newNorm.includes(norm(c)));
const droppedQuotes = [...oldAll.quotes].filter((q) => !newNorm.includes(norm(q).slice(0, 60)));
md(dropped.length || droppedQuotes.length ? [
  ...dropped.map((c) => `- ⚠ "${c}"`),
  ...droppedQuotes.map((q) => `- ⚠ quotation: “${q.slice(0, 140)}${q.length > 140 ? '…' : ''}”`),
].join('\n') + '\n\nEach should be a deliberate "Remove" in DESIGN.md, or restored.' : '- ✓ none.');
md();

md('## Per page: ids, form fields, metadata');
for (const { p, o, n } of perPage) {
  if (!o.text || !n.text) continue;
  const lines = [];
  const lostIds = o.ids.filter((id) => !n.ids.includes(id));
  if (lostIds.length) lines.push(`- ⚠ ids gone (anchors, script or analytics hooks?): ${lostIds.slice(0, 15).map((x) => `#${x}`).join(', ')}${lostIds.length > 15 ? ` +${lostIds.length - 15}` : ''}`);
  const lostFields = o.fields.filter((f) => !n.fields.includes(f));
  if (lostFields.length) lines.push(`- ✗ form fields renamed or removed: ${lostFields.join(', ')}`);
  for (const k of ['title', 'description', 'canonical', 'ogImage']) {
    if (o.meta[k] && !n.meta[k]) lines.push(`- ✗ ${k} missing (was "${String(o.meta[k]).slice(0, 80)}")`);
  }
  if (!n.meta.h1) lines.push('- ✗ no h1');
  if (lines.length) { md(`### ${p}`); lines.forEach((l) => md(l)); md(); }
}

await browser.close();
const report = out.join('\n');
if (a.out) await writeFile(String(a.out), report + '\n');
console.log(report);
