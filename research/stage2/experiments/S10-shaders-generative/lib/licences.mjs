// Licence evidence for the code sources a creative developer reaches for, read from the repositories themselves
// (raw.githubusercontent.com at HEAD, commit pinned with git ls-remote). Sites without a repository (Shadertoy,
// CodePen, OpenProcessing) are recorded from search snippets in the report, not here.
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';

// [owner/repo, why it matters, files to try, README pattern to quote]
export const SOURCES = [
  ['mrdoob/three.js', 'three.js and its examples folder', ['LICENSE']],
  ['pmndrs/postprocessing', 'bloom, grain, CA, vignette for three.js', ['LICENSE.md', 'LICENSE']],
  ['stegu/webgl-noise', 'the simplex/classic noise most shaders paste', ['LICENSE']],
  ['patriciogonzalezvivo/lygia', 'large GLSL/WGSL function library', ['LICENSE.md'], /dual-licensed/i],
  ['patriciogonzalezvivo/thebookofshaders', 'the standard shader tutorial and its examples', ['LICENSE']],
  ['PavelDoGreat/WebGL-Fluid-Simulation', 'the fluid demo used as variant g', ['LICENSE']],
  ['paper-design/shaders', 'Paper Shaders (mesh gradient and others)', ['LICENSE']],
  ['FireCMSco/neat', 'NEAT gradients', ['LICENSE']],
  ['ruucm/shadergradient', 'ShaderGradient', ['LICENSE', 'LICENSE.md'], /^MIT ©/m],
  ['jordienr/whatamesh', '"mesh gradients like Stripe"', ['LICENSE', 'LICENSE.md'], /stripe|kevinhufnagl/i],
  ['tengbao/vanta', 'Vanta.js backgrounds', ['LICENSE.md', 'LICENSE']],
  ['processing/p5.js', 'p5.js', ['license.txt', 'LICENSE']],
  ['oframe/ogl', 'OGL', ['LICENSE'], /Unlicense|public domain/i],
  ['regl-project/regl', 'regl', ['LICENSE']],
  ['greggman/twgl.js', 'twgl.js', ['LICENSE.md', 'LICENSE']],
  ['matteobruni/tsparticles', 'tsParticles', ['LICENSE']],
  ['codrops/RainEffect', 'a classic Codrops WebGL demo', ['LICENSE', 'LICENSE.md'], /licen[sc]e[\s\S]{0,300}/i],
  ['codrops/ImageTrailEffects', 'a Codrops demo', ['LICENSE', 'LICENSE.md'], /licen[sc]e[\s\S]{0,300}/i],
  ['guilanier/codrops-sdf-lensblur', 'a recent Codrops tutorial repo (guest author)', ['LICENSE']],
  ['jothyrangan/codrops-cinematic-scroll-animations', 'a recent Codrops tutorial repo (guest author)', ['LICENSE', 'LICENSE.md'], /licen[sc]e[\s\S]{0,80}/i],
];

const SPDX = [
  [/Prosperity Public License/i, 'Prosperity-3.0.0 (noncommercial; 30-day commercial trial)'],
  [/Commons Clause/i, 'MIT + Commons Clause (not open source: no selling)'],
  [/All rights reserved[\s\S]*cannot use this Work/i, 'All rights reserved (no use in any product or website)'],
  [/Apache License[\s\S]{0,40}Version 2\.0/i, 'Apache-2.0'],
  [/GNU LESSER GENERAL PUBLIC LICENSE[\s\S]{0,80}Version 2\.1/i, 'LGPL-2.1'],
  [/This software is provided 'as-is'[\s\S]*altered source versions must be plainly marked/i, 'Zlib'],
  [/Permission is hereby granted, free of charge/i, 'MIT'],
  [/unencumbered software released into the public domain/i, 'Unlicense'],
];
const classify = (t) => SPDX.find(([re]) => re.test(t))?.[1] ?? 'unrecognised';

async function get(url) {
  const r = await fetch(url);
  return r.ok ? r.text() : null;
}

export async function licences() {
  const out = {};
  for (const [repo, why, files, readmeRe] of SOURCES) {
    const rec = { repo, why };
    try { rec.commit = execSync(`git ls-remote https://github.com/${repo}.git HEAD`, { stdio: ['ignore', 'pipe', 'ignore'], timeout: 30000 }).toString().split(/\s/)[0] || null; } catch { rec.commit = null; }
    for (const f of files) {
      const t = await get(`https://raw.githubusercontent.com/${repo}/HEAD/${f}`);
      if (t) { rec.file = f; rec.licence = classify(t); rec.firstLines = t.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 2).join(' | ').slice(0, 200); rec.sha256 = crypto.createHash('sha256').update(t).digest('hex').slice(0, 16); break; }
    }
    if (!rec.file) rec.licence = 'no licence file at the repository root';
    if (readmeRe) {
      const t = (await get(`https://raw.githubusercontent.com/${repo}/HEAD/README.md`)) || '';
      const m = t.match(readmeRe);
      rec.readme = m ? t.slice(Math.max(0, m.index - 20), m.index + 320).replace(/\s+/g, ' ').trim() : null;
    }
    out[repo] = rec;
  }
  return out;
}
