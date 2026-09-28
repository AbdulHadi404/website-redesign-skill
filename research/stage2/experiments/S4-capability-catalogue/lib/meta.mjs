// Lab wrappers around libcheck.mjs (the proposed skill script): the same classifier, registry and git
// readers, pinned to the lab's cutoff date and reading licences from the installed packages (= the npm tarballs).
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { registry as reg, adoption, activity as act, licenceFromDir } from '../libcheck.mjs';

export const CUTOFF = '2025-09-28'; // twelve months before the lab date (2026-09-28)

export async function registry(name) {
  const [r, a] = await Promise.all([reg(name, CUTOFF), adoption(name)]);
  return { ...r, ...(a || {}) };
}
export const activity = (repo, cacheDir) => act(repo, cacheDir, CUTOFF);
export async function licence(root, pkg, repo) {
  const dir = path.join(root, 'node_modules', pkg);
  if (!existsSync(dir)) return { pkg, error: 'not installed' };
  return { pkg, ...(await licenceFromDir(dir, repo)) };
}
export async function readmeNotice(root, pkg) {
  const dir = path.join(root, 'node_modules', pkg);
  if (!existsSync(dir)) return null;
  const f = (await readdir(dir)).find((x) => /^readme(\.md)?$/i.test(x));
  if (!f) return null;
  const t = await readFile(path.join(dir, f), 'utf8');
  const m = t.match(/[^\n]{0,80}(unmaintained|no longer (being )?maintained|not (actively )?maintained|looking for (new )?maintainers|deprecated in favou?r|placeholder package|archived)[^\n]{0,80}/i);
  return m ? m[0].trim().slice(0, 200) : null;
}
