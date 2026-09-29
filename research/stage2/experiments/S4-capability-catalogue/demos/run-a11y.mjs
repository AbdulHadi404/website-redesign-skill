// Builds every demos/src/<demo>.jsx with esbuild (React bundled, production), serves them locally and
// drives each with Playwright: keyboard operation, focus, the accessibility tree and what live regions say.
// Each scenario runs `runs` times in a fresh context; a check passes only if it passed in every run.
// Called by ../run.mjs (step a11y); standalone: node demos/run-a11y.mjs [demo …] [--runs 5]
import * as esbuild from 'esbuild';
import http from 'node:http';
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { scenarios } from './tests.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const SKILL_ENV = path.resolve(here, '../../../../../skills/website-redesign/scripts/lib/env.mjs');

async function build(name, work, root) {
  const out = path.join(work, name);
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  const res = await esbuild.build({
    entryPoints: [path.join(here, 'src', name + '.jsx')], bundle: true, format: 'esm', outdir: out, splitting: true,
    minify: true, jsx: 'automatic', loader: { '.js': 'jsx', '.woff2': 'file', '.woff': 'file', '.png': 'file', '.svg': 'file', '.wasm': 'file' },
    define: { 'process.env.NODE_ENV': '"production"', global: 'globalThis' }, nodePaths: [path.join(root, 'node_modules')],
    logLevel: 'silent', metafile: true, target: 'es2022', conditions: ['production'],
  });
  const css = Object.keys(res.metafile.outputs).filter((f) => f.endsWith('.css')).map((f) => path.basename(f));
  const shared = (await import(pathToFileURL(path.join(here, 'src', 'shared.css.mjs')).href)).css;
  await writeFile(path.join(out, 'index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${name}</title>
${css.map((c) => `<link rel="stylesheet" href="${c}">`).join('\n')}<style>${shared}</style></head>
<body><button id="before">Before the demo</button><main><h1>${name}</h1><div id="root"></div></main><button id="after">After the demo</button>
<script type="module" src="${name}.js"></script></body></html>`);
}

function serve(dir) {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.json': 'application/json' };
  const server = http.createServer(async (req, res) => {
    const p = path.join(dir, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    try { const f = p.endsWith('/') ? path.join(p, 'index.html') : p; const b = await readFile(f); res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); res.end(b); }
    catch { res.writeHead(404); res.end(); }
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

// Records every text change inside a live region (aria-live polite/assertive, role status/alert/log).
const RECORDER = () => {
  window.__ann = [];
  const last = new WeakMap();
  const live = (el) => el && el.nodeType === 1 && ((el.getAttribute('aria-live') && el.getAttribute('aria-live') !== 'off') || ['status', 'alert', 'log'].includes(el.getAttribute('role')));
  new MutationObserver((ms) => {
    for (const m of ms) {
      // A live region inserted with its text already inside: record it too (and note it: many screen readers skip those).
      for (const a of m.addedNodes || []) if (live(a) && a.textContent.trim()) { const t = a.textContent.replace(/\s+/g, ' ').trim(); last.set(a, t); window.__ann.push('[inserted] ' + t); }
      let n = m.target.nodeType === 1 ? m.target : m.target.parentElement;
      while (n && !live(n)) n = n.parentElement;
      if (!n) continue;
      const t = n.textContent.replace(/\s+/g, ' ').trim();
      if (t && last.get(n) !== t) { last.set(n, t); window.__ann.push(t); }
    }
  }).observe(document, { subtree: true, childList: true, characterData: true });
};

export async function runA11y({ root, work, runs = 5, only = [] }) {
  const { launch } = await import(pathToFileURL(SKILL_ENV).href);
  const names = Object.keys(scenarios).filter((n) => !only.length || only.includes(n));
  await mkdir(work, { recursive: true });
  for (const n of names) { process.stdout.write(`  build ${n}\n`); await build(n, work, root); }
  const server = await serve(work);
  const base = `http://127.0.0.1:${server.address().port}`;
  const { browser } = await launch();
  const out = {};
  try {
    for (const n of names) {
      const perRun = [];
      for (let i = 0; i < runs; i++) {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
        const page = await ctx.newPage();
        const errors = [];
        page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
        await page.addInitScript(RECORDER);
        await page.goto(`${base}/${n}/index.html`, { waitUntil: 'load' });
        await page.waitForTimeout(600);
        let r;
        try { r = await scenarios[n].run(page, { shot: i === 0 ? path.join(here, '..', 'shots', n + '.jpg') : null }); }
        catch (e) { r = { checks: { scenarioCompleted: false }, error: String(e.message).split('\n')[0] }; }
        r.announcements = await page.evaluate(() => window.__ann).catch(() => []);
        r.pageErrors = errors;
        perRun.push(r);
        await ctx.close();
      }
      // A check passes if every run passed it; values are taken from the first run.
      const checks = {};
      for (const k of Object.keys(perRun[0].checks || {})) {
        const vals = perRun.map((r) => r.checks?.[k]);
        checks[k] = typeof vals[0] === 'boolean' ? `${vals.filter(Boolean).length}/${runs}` : vals[0];
      }
      out[n] = { library: scenarios[n].library, checks, detail: perRun[0].detail, announcements: perRun[0].announcements.slice(0, 20), pageErrors: perRun[0].pageErrors, error: perRun[0].error };
      console.log(`  ${n}:`, JSON.stringify(checks));
    }
  } finally { await browser.close(); server.close(); }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const runs = argv.includes('--runs') ? +argv[argv.indexOf('--runs') + 1] : 5;
  const only = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--runs');
  const root = path.resolve(here, '..');
  const res = await runA11y({ root, work: path.join(os.tmpdir(), 's2-S4', 'demos'), runs, only });
  const file = path.join(root, 'results.json');
  const all = existsSync(file) ? JSON.parse(await readFile(file, 'utf8')) : {};
  all.a11y = { ...(all.a11y || {}), ...res };
  await writeFile(file, JSON.stringify(all, null, 1) + '\n');
}
