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
await writeFile(new URL('.gitignore', here), '*\n'); // nothing fetched here is committed
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

// Held-out code for the lint lab (second round, after review): npm tarballs at pinned versions,
// only the paths the lab reads are extracted. None of this is committed (vendor/.gitignore).
//   TSX written with style objects: tldraw (own licence, LICENSE.md), BlockNote react + shadcn (MPL-2.0),
//   react-arborist (MIT), @lexical/react (MIT). Token-first CSS: tldraw ui.css, ckeditor5 (GPL-2.0-or-later
//   or commercial), ag-grid-community (MIT).
const NPM = [
  { dir: 'npm/tldraw', tgz: 'https://registry.npmjs.org/tldraw/-/tldraw-5.4.2.tgz', paths: ['package/src/lib', 'package/LICENSE.md'] },
  { dir: 'npm/blocknote-react', tgz: 'https://registry.npmjs.org/@blocknote/react/-/react-0.55.0.tgz', paths: ['package/src'] },
  { dir: 'npm/blocknote-shadcn', tgz: 'https://registry.npmjs.org/@blocknote/shadcn/-/shadcn-0.55.0.tgz', paths: ['package/src'] },
  { dir: 'npm/react-arborist', tgz: 'https://registry.npmjs.org/react-arborist/-/react-arborist-3.16.0.tgz', paths: ['package/src'] },
  { dir: 'npm/lexical-react', tgz: 'https://registry.npmjs.org/@lexical/react/-/react-0.52.0.tgz', paths: ['package/src'] },
  { dir: 'npm/ckeditor5', tgz: 'https://registry.npmjs.org/ckeditor5/-/ckeditor5-48.5.2.tgz', paths: ['package/dist/ckeditor5.css'] },
  { dir: 'npm/ag-grid-community', tgz: 'https://registry.npmjs.org/ag-grid-community/-/ag-grid-community-36.2.0.tgz', paths: ['package/styles/ag-grid.css'] },
];
for (const n of NPM) {
  const d = new URL(n.dir + '/', here).pathname;
  try { await access(d); continue; } catch {}
  await mkdir(d, { recursive: true });
  const tgz = d + 'pkg.tgz';
  execFileSync('curl', ['-sSfL', '-o', tgz, n.tgz]); // curl honours the lab's HTTPS proxy
  execFileSync('tar', ['-xzf', tgz, '-C', d, ...n.paths]);
  execFileSync('rm', ['-f', tgz]);
  console.log('fetched', n.dir);
}
