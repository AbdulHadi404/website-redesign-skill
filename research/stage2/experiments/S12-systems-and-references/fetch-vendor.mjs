#!/usr/bin/env node
// Fetches third-party source used by the experiments into ./vendor (git-ignored).
// Pinned to commits so results reproduce. Licences: radix-ui/website MIT (WorkOS).
import { mkdir, writeFile, access } from 'node:fs/promises';
const here = new URL('./vendor/', import.meta.url);
const FILES = [
  {
    out: 'generate-radix-colors.ts',
    url: 'https://raw.githubusercontent.com/radix-ui/website/bb424082fd33fadc244a6dd276d3ced55caa6234/components/generate-radix-colors.tsx',
    licence: 'MIT — https://github.com/radix-ui/website/blob/main/LICENSE',
  },
];
await mkdir(here, { recursive: true });
// Held-out code for the lint lab: sparse, pinned clones (git only; GitHub is reachable from the lab).
import { execFileSync } from 'node:child_process';
const REPOS = [
  { dir: 'shadcn', url: 'https://github.com/shadcn-ui/ui', sha: 'db2db460a26fa84fb65c8d903b213925fbdee9ed', paths: ['apps/v4/registry/new-york-v4/ui', 'apps/v4/registry/new-york-v4/blocks'], licence: 'MIT' },
  { dir: 'radix-themes', url: 'https://github.com/radix-ui/themes', sha: '1faff10ac26ae17f09944d418c6949b93fc6b566', paths: ['packages/radix-ui-themes/src/components'], licence: 'MIT' },
];
for (const r of REPOS) {
  const d = new URL(r.dir + '/', here).pathname;
  try { await access(d); continue; } catch {}
  const git = (...a) => execFileSync('git', a, { cwd: d, stdio: 'pipe' });
  await mkdir(d, { recursive: true });
  git('init', '-q'); git('remote', 'add', 'origin', r.url);
  git('sparse-checkout', 'set', ...r.paths);
  git('fetch', '-q', '--depth', '1', '--filter=blob:none', 'origin', r.sha);
  git('checkout', '-q', 'FETCH_HEAD');
  console.log('cloned', r.dir, r.sha.slice(0, 8));
}
for (const f of FILES) {
  const dest = new URL(f.out, here);
  try { await access(dest); continue; } catch {}
  const r = await fetch(f.url);
  if (!r.ok) throw new Error(`${f.url}: HTTP ${r.status}`);
  let text = await r.text();
  // The website pins colorjs.io 0.5.2; later versions return a different hue for achromatic colours and the generator crashes.
  text = text.replace('from "colorjs.io"', 'from "colorjs-052"');
  await writeFile(dest, `// Source: ${f.url}\n// Licence: ${f.licence}\n// Modified: colorjs.io import pointed at the pinned 0.5.2 alias\n` + text);
  console.log('fetched', f.out);
}
