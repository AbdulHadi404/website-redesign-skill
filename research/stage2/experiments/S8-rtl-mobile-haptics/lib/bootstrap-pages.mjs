// Turn Bootstrap's example sources (Astro, MIT) into static pages the checkers can load: the frontmatter gives the
// title, direction and extra CSS/JS; the body is plain HTML apart from two expressions, replaced here. The pages go
// to <ext>/bootstrap-built/ and load bootstrap(.rtl).min.css from the clone, Chart.js from this folder's node_modules.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { ext } from './server.mjs';

export const PAGES = ['dashboard', 'dashboard-rtl', 'checkout', 'checkout-rtl'];
// pages the checkers were not developed on (run.mjs part "oos")
export const OOS_PAGES = ['album', 'album-rtl', 'blog-rtl', 'carousel', 'carousel-rtl', 'sidebars', 'offcanvas-navbar'];

export async function build(names = PAGES) {
  const src = path.join(ext, 'bootstrap/site/src/assets/examples');
  const out = path.join(ext, 'bootstrap-built');
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
    // Bootstrap's <Placeholder> component: a grey SVG box of the given size
    const w = (attrs.match(/width="([^"]*)"/) || [])[1] || '100%', h = (attrs.match(/height="([^"]*)"/) || [])[1] || '100';
    const cls = (attrs.match(/class="([^"]*)"/) || [])[1] || '', bg = (attrs.match(/background="([^"]*)"/) || [])[1] || '#777';
    return `<svg class="bd-placeholder-img ${cls}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="100%" height="100%" fill="${bg}"/></svg>`;
  }).replace(/\{false\}/g, '"false"').replace(/\{getVersionedDocsPath\('[^']*'\)\}/g, '"data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2272%22 height=%2257%22/%3E"').replace(/\{new Date\(\)\.getFullYear\(\)\}/g, '2026')}
<script src="/ext/bootstrap/dist/js/bootstrap.bundle.min.js"></script>
${js.map((j) => `<script src="${j}"></script>`).join('\n')}
</body></html>`;
    await writeFile(path.join(out, `${name}.html`), html);
    built.push(`/ext/bootstrap-built/${name}.html`);
  }
  return built;
}
