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

// ffmpeg for the pre-rendered video variant (i-video): the static build inside the imageio-ffmpeg wheel on PyPI
// (ffmpeg 7.0.2 with libaom-av1, libvpx-vp9, libx264). Set FFMPEG=/path/to/ffmpeg to use another build.
export const FFMPEG_WHEEL = { pkg: 'imageio-ffmpeg==0.6.0', dir: path.join(SRC, 'pip') };
export function fetchFfmpeg() {
  if (process.env.FFMPEG && existsSync(process.env.FFMPEG)) return process.env.FFMPEG;
  const bin = path.join(FFMPEG_WHEEL.dir, 'x/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2');
  if (!existsSync(bin)) {
    execSync(`mkdir -p ${FFMPEG_WHEEL.dir} && cd ${FFMPEG_WHEEL.dir} && pip download ${FFMPEG_WHEEL.pkg} --no-deps -d . -q && python3 -m zipfile -e imageio_ffmpeg-*.whl x && chmod +x ${bin}`, { stdio: 'ignore' });
  }
  return bin;
}

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
  let ffmpeg = null;
  try { ffmpeg = fetchFfmpeg(); } catch (e) { console.error(`ffmpeg: ${e.message.split('\n')[0]}`); }
  return { fluid: { ...FLUID, head }, ffmpeg };
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(fetchSources(), null, 1));
