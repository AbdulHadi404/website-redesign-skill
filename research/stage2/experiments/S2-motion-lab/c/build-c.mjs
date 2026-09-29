// Build the four Part C pages into captures/c/ (the GSAP page is bundled with esbuild).
import { build } from 'esbuild';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { labRoot } from '../lib/server.mjs';
import { markup } from './markup.mjs';
export const VARIANTS = ['static', 'good', 'over', 'gsap'];
export async function buildC() {
  const out = path.join(labRoot, 'captures/c'); await mkdir(out, { recursive: true });
  const src = (f) => path.join(labRoot, 'c/pages', f);
  for (const v of VARIANTS) {
    let js;
    if (v === 'gsap') { await build({ entryPoints: [src('gsap.js')], bundle: true, minify: true, format: 'esm', outfile: path.join(out, 'gsap.bundle.js'), logLevel: 'silent' }); js = '<script type="module" src="gsap.bundle.js"></script>'; }
    else js = `<script type="module">${await readFile(src(`${v}.js`), 'utf8')}</script>`;
    await writeFile(path.join(out, `${v}.html`), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Ledgerline — ${v}</title><link rel="icon" href="data:,">
<style>${await readFile(src('base.css'), 'utf8')}</style><style>${await readFile(src(`${v}.css`), 'utf8')}</style></head><body>${markup()}${js}</body></html>`);
  }
  return out;
}
if (import.meta.url === `file://${process.argv[1]}`) console.log(await buildC());
