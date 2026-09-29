/**
 * Held-out pages added after the review (fetch-sites.sh builds them; nothing third-party is committed):
 *  - Bootstrap's examples (MIT, twbs/bootstrap at the commit S8 pinned), LTR and RTL, turned from their Astro sources
 *    into static pages the way S8's lib/bootstrap-pages.mjs does: frontmatter → title, direction, extra CSS/JS; the
 *    <Placeholder> component → a grey SVG box; Chart.js from this folder's node_modules.
 *  - Two G-product-lab pages (this repository) with the CSS they were written for, from npm (@carbon/styles 1.116.0,
 *    Apache-2.0; @primer/css 21.5.1, MIT), so they render styled rather than bare.
 * Served under /ext/ (= $S7_SITES, default /tmp/s2-S7).
 */
import { readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { repo } from './server.mjs';

export const SITES = process.env.S7_SITES || '/tmp/s2-S7';
export const BOOTSTRAP_LTR = ['album', 'pricing', 'checkout', 'dashboard'];
export const BOOTSTRAP_RTL = ['album-rtl', 'checkout-rtl', 'dashboard-rtl', 'blog-rtl'];

export async function buildBootstrap(names = [...BOOTSTRAP_LTR, ...BOOTSTRAP_RTL]) {
  const src = path.join(SITES, 'bootstrap/site/src/assets/examples');
  if (!existsSync(src)) return [];
  const out = path.join(SITES, 'bootstrap-built');
  await mkdir(out, { recursive: true });
  const built = [];
  for (const name of names) {
    const raw = await readFile(path.join(src, name, 'index.astro'), 'utf8');
    const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    const fm = m[1], body = m[2];
    const title = (fm.match(/title = '([^']*)'/) || [])[1] || name;
    const rtl = /direction = 'rtl'/.test(fm);
    const bodyClass = (fm.match(/body_class = '([^']*)'/) || [])[1] || '';
    const url = (rel) => (/^https?:/.test(rel) ? rel : `/ext/bootstrap/site/src/assets/examples/${name}/${rel}`);
    const css = [...(fm.match(/extra_css = \[([^\]]*)\]/)?.[1].matchAll(/'([^']+)'/g) || [])].map((x) => x[1]).filter((u) => !/^https?:/.test(u));
    const js = [...fm.matchAll(/src: '([^']+)'/g)].map((x) => x[1]).map((u) => (/chart\.js/.test(u) ? '/node_modules/chart.js/dist/chart.umd.js' : url(u)));
    const html = `<!doctype html>
<html lang="${rtl ? 'ar' : 'en'}" dir="${rtl ? 'rtl' : 'ltr'}" data-bs-theme="light">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>
<link rel="stylesheet" href="/ext/bootstrap/dist/css/bootstrap${rtl ? '.rtl' : ''}.min.css">
${css.map((c) => `<link rel="stylesheet" href="${url(c)}">`).join('\n')}
</head>
<body class="${bodyClass}">
${body.replace(/<Placeholder([^>]*?)\/>/g, (all, attrs) => {
    const w = (attrs.match(/width="([^"]*)"/) || [])[1] || '100%', h = (attrs.match(/height="([^"]*)"/) || [])[1] || '100';
    const cls = (attrs.match(/class="([^"]*)"/) || [])[1] || '', bg = (attrs.match(/background="([^"]*)"/) || [])[1] || '#777';
    return `<svg class="bd-placeholder-img ${cls}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="100%" height="100%" fill="${bg}"/></svg>`;
  }).replace(/\{false\}/g, '"false"').replace(/\{getVersionedDocsPath\('[^']*'\)\}/g, '"data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2272%22 height=%2257%22/%3E"').replace(/\{new Date\(\)\.getFullYear\(\)\}/g, '2026')}
<script src="/ext/bootstrap/dist/js/bootstrap.bundle.min.js"></script>
${js.map((j) => `<script src="${j}"></script>`).join('\n')}
</body></html>`;
    await writeFile(path.join(out, `${name}.html`), html);
    built.push(name);
  }
  return built;
}

/** G-product-lab's Carbon and Primer pages, copied next to the CSS they link (css/carbon.css, css/primer.css). */
export async function buildProductLab() {
  const pk = path.join(SITES, 'pkgs');
  const carbon = path.join(pk, 'carbon/package/css/styles.min.css'), primer = path.join(pk, 'primer/package/dist/primer.css');
  if (!existsSync(carbon) || !existsSync(primer)) return [];
  const out = path.join(SITES, 'product-lab');
  await mkdir(path.join(out, 'css'), { recursive: true });
  await cp(carbon, path.join(out, 'css/carbon.css'));
  await cp(primer, path.join(out, 'css/primer.css'));
  for (const f of ['carbon-table.html', 'primer-issues.html']) await cp(path.join(repo, 'research/experiments/G-product-lab/pages', f), path.join(out, f));
  return ['carbon-table', 'primer-issues'];
}

if (process.argv[1] && process.argv[1].endsWith('extra-pages.mjs')) {
  console.log('bootstrap:', (await buildBootstrap()).join(', ') || 'clone missing');
  console.log('product-lab:', (await buildProductLab()).join(', ') || 'packages missing');
}
