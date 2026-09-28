// Who keeps requestAnimationFrame running at rest? Unminified bundles; stacks of rAF requests during 1 s at rest,
// after load only ("load") and after one pass through every interaction ("used").
//   node a/diag-rest.mjs [impl,impl]
import { build } from 'esbuild';
import path from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import { serve, labRoot } from '../lib/server.mjs';
import { launch } from '../lib/browser.mjs';
import { IMPLS } from './build.mjs';
import { markup } from './markup.mjs';
export async function diagRest(names = Object.keys(IMPLS)) {
  const out = path.join(labRoot, 'captures/diag'); await mkdir(out, { recursive: true });
  const { base, close } = await serve(); const { browser } = await launch();
  const res = {};
  for (const name of names) {
    const im = IMPLS[name];
    await build({ entryPoints: [path.join(labRoot, 'a/impl', im.entry)], bundle: true, format: 'esm', outfile: path.join(out, `${name}.js`), jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'silent' });
    await writeFile(path.join(out, `${name}.html`), `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/a/base.css">${im.css ? `<link rel="stylesheet" href="/a/impl/${im.css}">` : ''}</head><body>${im.react ? '<div id="root"></div>' : markup()}<script type="module" src="/captures/diag/${name}.js"></script></body></html>`);
    res[name] = {};
    for (const phase of ['load', 'used']) {
      const ctx = await browser.newContext({ viewport: { width: 1000, height: 800 } });
      await ctx.addInitScript(() => { window.__RM_GUARD = true; const raf = window.requestAnimationFrame.bind(window); window.__stacks = null;
        window.requestAnimationFrame = (cb) => { if (window.__stacks) { const st = (new Error().stack || '').split('\n').slice(2, 5).map((l) => l.trim().replace(/\(?http:\/\/[^/]+\/captures\/diag\//, '').replace(/\)$/, '')).join(' < '); window.__stacks[st] = (window.__stacks[st] || 0) + 1; } return raf(cb); }; });
      const page = await ctx.newPage();
      await page.goto(`${base}/captures/diag/${name}.html`); await page.waitForTimeout(800);
      if (phase === 'used') { for (const s of ['#press', '#shuffle', '#sheet-toggle', '#swap', '#tick-hi', '#grid-toggle']) { await page.click(s, { timeout: 1500 }).catch(() => {}); await page.waitForTimeout(150); }
        for (const y of [300, 900, 0]) { await page.evaluate((y) => scrollTo(0, y), y); await page.waitForTimeout(150); } await page.waitForTimeout(1500); }
      await page.evaluate(() => { window.__stacks = {}; }); await page.waitForTimeout(1000);
      res[name][phase] = Object.entries(await page.evaluate(() => window.__stacks)).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${v}× ${k}`);
      await ctx.close();
    }
  }
  await browser.close(); await close();
  return res;
}
if (import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(await diagRest(process.argv[2]?.split(',')), null, 1));
