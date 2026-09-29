// Third-party pages for the held-out check of motion.mjs, fetched (never committed) at pinned commits into captures/ext/.
//   node c/fetch-ext.mjs
// Licences (read in each repository at the pinned commit): twbs/bootstrap MIT (LICENSE); animate-css/animate.css
// Hippocratic License 2.1 (LICENSE); IanLunn/Hover "free personal/open source or paid commercial" (license.txt).
// None of these files is redistributed from this folder: the lab only serves them locally to a headless browser.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { labRoot } from '../lib/server.mjs';
export const EXT = {
  bootstrap: { repo: 'https://github.com/twbs/bootstrap.git', sha: '46a88042b323d78c580352085ca60afca5c6c405' },
  'animate.css': { repo: 'https://github.com/animate-css/animate.css.git', sha: '3f8ab233dbbd9d2fe577528d2296382954be3d1a' },
  Hover: { repo: 'https://github.com/IanLunn/Hover.git', sha: 'eb8629df13850d78bbcccd4fed68d231aec0c535' },
};
export async function fetchExt() {
  const root = path.join(labRoot, 'captures/ext'); await mkdir(root, { recursive: true });
  for (const [name, { repo, sha }] of Object.entries(EXT)) {
    const dir = path.join(root, name);
    if (existsSync(path.join(dir, '.git'))) { const head = execFileSync('git', ['-C', dir, 'rev-parse', 'HEAD']).toString().trim(); if (head === sha) continue; }
    else { await mkdir(dir, { recursive: true }); execFileSync('git', ['-C', dir, 'init', '-q']); execFileSync('git', ['-C', dir, 'remote', 'add', 'origin', repo]); }
    execFileSync('git', ['-C', dir, 'fetch', '-q', '--depth', '1', 'origin', sha], { stdio: 'inherit' });
    execFileSync('git', ['-C', dir, 'checkout', '-q', '--force', sha]);
  }
  return root;
}
if (import.meta.url === `file://${process.argv[1]}`) console.log(await fetchExt());
