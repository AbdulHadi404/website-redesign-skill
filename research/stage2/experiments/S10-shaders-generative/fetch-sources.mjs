#!/usr/bin/env node
// Fetch the one third-party demo this lab runs (variant g), pinned, outside the repository.
// PavelDoGreat/WebGL-Fluid-Simulation — MIT, © 2017 Pavel Dobryakov. We do not redistribute it:
// the build copies what it needs into dist/ (git-ignored).
//
//   node fetch-sources.mjs            → /tmp/s2-S10/fluid at the pinned commit
//   S10_SRC=/elsewhere node fetch-sources.mjs
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

export const SRC = process.env.S10_SRC || '/tmp/s2-S10';
export const FLUID = {
  repo: 'https://github.com/PavelDoGreat/WebGL-Fluid-Simulation.git',
  commit: 'a2d292931f19d9b3b9f564e23e6c32729d2121c3',   // 2024-11-12, the tip on 2026-09-29
  dir: path.join(SRC, 'fluid'),
  licence: 'MIT (LICENSE: "Copyright (c) 2017 Pavel Dobryakov")',
};

export function fetchSources() {
  const sh = (c, cwd) => execSync(c, { cwd, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
  if (!existsSync(FLUID.dir)) {
    execSync(`mkdir -p ${SRC}`);
    sh(`git clone --depth 1 ${FLUID.repo} ${FLUID.dir}`);
  }
  let head = sh('git rev-parse HEAD', FLUID.dir);
  if (head !== FLUID.commit) {
    try { sh(`git fetch --depth 1 origin ${FLUID.commit} && git checkout -q ${FLUID.commit}`, FLUID.dir); head = sh('git rev-parse HEAD', FLUID.dir); } catch (e) { console.error(`could not pin ${FLUID.commit}: ${e.message.split('\n')[0]}`); }
  }
  return { fluid: { ...FLUID, head } };
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(fetchSources(), null, 1));
