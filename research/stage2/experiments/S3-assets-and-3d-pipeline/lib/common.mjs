import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import os from 'node:os';

const here = path.dirname(fileURLToPath(import.meta.url));
export const LAB = path.resolve(here, '..');
export const SKILL_SCRIPTS = path.resolve(LAB, '../../../../skills/website-redesign/scripts');
const RESULTS = path.join(LAB, 'results.json');

/** Merge one section into results.json, key by key, so a partial run (--only …) replaces only what it measured. */
export async function mergeResults(key, value) {
  let all = {};
  try { all = JSON.parse(await readFile(RESULTS, 'utf8')); } catch { /* first run */ }
  all[key] = { ...(all[key] || {}), ...value, measuredAt: new Date().toISOString(), host: { cpus: os.cpus().length, node: process.version } };
  await writeFile(RESULTS, JSON.stringify(all, null, 1) + '\n');
}

/** One headless Chromium through the skill's own launcher (Playwright's Chromium; WebGL via SwiftShader). */
export async function launchLab() {
  const { launch } = await import(pathToFileURL(path.join(SKILL_SCRIPTS, 'lib/env.mjs')).href);
  const { browser } = await launch();
  return { browser, version: browser.version() };
}
