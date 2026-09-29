// Lab wrappers around libcheck.mjs (the proposed skill script): the same classifier, registry and git
// readers, pinned to the lab's cutoff date and reading licences from the installed packages (= the npm tarballs).
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { registry as reg, adoption, activity as act, licenceFromDir, readmeNotice as notice, readmeProcurement, repoReadme } from '../libcheck.mjs';

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
// README notices about this package (package README first, then the repository's root README, which can be
// newer than the tarball: vaul 1.1.2 ships no "unmaintained" note, its repository README has one).
export async function readmeNotice(root, pkg, repo) {
  const dir = path.join(root, 'node_modules', pkg);
  const f = existsSync(dir) ? (await readdir(dir)).find((x) => /^readme(\.md)?$/i.test(x)) : null;
  const t = f ? await readFile(path.join(dir, f), 'utf8') : '';
  const own = notice(t, pkg);
  if (own) return { notice: own, source: 'package README', procurement: readmeProcurement(t) };
  const rootText = await repoReadme(repo);
  const r = rootText ? notice(rootText, pkg) : null;
  return { notice: r, source: r ? `github.com/${repo} README` : null, procurement: readmeProcurement(t) };
}
