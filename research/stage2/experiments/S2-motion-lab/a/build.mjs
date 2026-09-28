// Build every Part A implementation into captures/a/: a runnable page per implementation, plus size bundles.
import { build } from 'esbuild';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { labRoot } from '../lib/server.mjs';
import { markup } from './markup.mjs';

export const IMPLS = {
  css: { entry: 'css.js', css: 'css.css', label: 'CSS + WAAPI' },
  motion: { entry: 'motion.js', label: 'Motion (vanilla)' },
  'motion-react': { entry: 'motion-react.jsx', react: true, label: 'Motion for React' },
  gsap: { entry: 'gsap.js', label: 'GSAP' },
  anime: { entry: 'anime.js', label: 'anime.js v4' },
  spring: { entry: 'spring.jsx', react: true, label: 'React Spring' },
  autoanimate: { entry: 'autoanimate.js', label: 'AutoAnimate' },
  theatre: { entry: 'theatre.js', label: 'Theatre.js core' },
};
const out = path.join(labRoot, 'captures/a');
const common = { bundle: true, format: 'esm', platform: 'browser', target: 'es2022', jsx: 'automatic', logLevel: 'silent', define: { 'process.env.NODE_ENV': '"production"' } };

// Lines of code: non-blank, non-comment. Lines tagged `// rm` or `/* rm */` are the reduced-motion additions.
export function loc(src) {
  let code = 0, rm = 0, inBlock = false;
  for (const raw of src.split('\n')) {
    const l = raw.trim();
    if (inBlock) { if (l.includes('*/')) inBlock = false; continue; }
    if (!l || l.startsWith('//')) continue;
    if (l.startsWith('/*')) { if (!l.includes('*/')) inBlock = true; else if (l.endsWith('*/') && !/\*\/.+/.test(l) && l.replace(/\/\*.*?\*\//g, '').trim() === '') continue; }
    code++; if (/\/\/ rm\b|\/\* rm \*\//.test(l)) rm++;
  }
  return { code, rm };
}

export async function buildA() {
  await mkdir(out, { recursive: true });
  const sizes = {};
  for (const [name, im] of Object.entries(IMPLS)) {
    const entry = path.join(labRoot, 'a/impl', im.entry);
    // 1) runnable bundle (React included)
    await build({ ...common, entryPoints: [entry], outfile: path.join(out, `${name}.js`), minify: true });
    // 2) size bundles: the whole set, minified; React external for React implementations
    const sizeOf = async (external) => {
      const r = await build({ ...common, entryPoints: [entry], write: false, minify: true, external, metafile: true });
      const buf = Buffer.from(r.outputFiles[0].contents);
      return { min: buf.length, gz: gzipSync(buf, { level: 9 }).length };
    };
    const lib = await sizeOf(im.react ? ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime'] : []);
    const cssText = im.css ? await readFile(path.join(labRoot, 'a/impl', im.css), 'utf8') : '';
    const cssMin = cssText.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ');
    const src = await readFile(entry, 'utf8');
    const l = loc(src); const lc = im.css ? loc(cssText) : { code: 0, rm: 0 };
    sizes[name] = { label: im.label, jsMin: lib.min, jsGz: lib.gz, cssGz: cssText ? gzipSync(Buffer.from(cssMin), { level: 9 }).length : 0,
      withReactGz: im.react ? (await sizeOf([])).gz : null, loc: l.code + lc.code, locRm: l.rm + lc.rm };
    const head = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${im.label}</title><link rel="icon" href="data:,"><script>if (window.__RM_GUARD) document.documentElement.classList.add('rm-guard');</script>
<link rel="stylesheet" href="/a/base.css">${im.css ? `<link rel="stylesheet" href="/a/impl/${im.css}">` : ''}</head>`;
    const body = im.react ? '<body><div id="root"></div>' : `<body>${markup()}`;
    await writeFile(path.join(out, `${name}.html`), `${head}${body}<script type="module" src="/captures/a/${name}.js"></script></body></html>`);
  }
  // tokens.js and markup are only imported by bundles; the React shell reads markup.mjs at build time
  return sizes;
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(await buildA(), null, 1));
