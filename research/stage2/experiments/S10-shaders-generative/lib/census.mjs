// Demo vs production, counted: which "production" features the code people copy from actually contains.
// three.js examples (every examples/*.html at HEAD), a sample of Codrops repositories, the background libraries
// installed here, and the fluid demo. Pattern counts are files containing the pattern (grep -l).
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

export const FEATURES = {
  'devicePixelRatio used': 'devicePixelRatio',
  'raw devicePixelRatio (uncapped)': 'setPixelRatio\\(\\s*window\\.devicePixelRatio\\s*\\)',
  'DPR capped (Math.min)': 'Math\\.min\\([^)]*devicePixelRatio|devicePixelRatio[^;]*Math\\.min',
  'IntersectionObserver (off-screen pause)': 'IntersectionObserver',
  'visibilitychange / document.hidden': 'visibilitychange|document\\.hidden|visibilityState',
  'WebGL context loss handled': 'webglcontextlost|contextlost',
  'prefers-reduced-motion': 'prefers-reduced-motion|reducedMotion',
  'powerPreference': 'powerPreference',
  'failIfMajorPerformanceCaveat': 'failIfMajorPerformanceCaveat',
  'debug GUI (lil-gui / dat.gui)': 'lil-gui|dat\\.gui|new GUI\\(',
  'stats panel': 'Stats\\(|stats\\.module',
};
const sh = (c, o = {}) => execSync(c, { stdio: ['ignore', 'pipe', 'ignore'], timeout: 300000, ...o }).toString();
// GNU grep applies --exclude-dir to command-line directories too, so excludes are passed only for repositories.
const count = (dir, re, include, excl = '') => {
  try { return Number(sh(`grep -r -l -E '${re}' ${include} ${excl} ${dir} 2>/dev/null | grep -v -E '\\.(d\\.ts|map)$' | wc -l`).trim()); } catch { return 0; }
};
const REPO_EXCL = '--exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build';

export function census(src, nodeModules, fluidDir) {
  mkdirSync(src, { recursive: true });
  const out = {};
  // three.js examples: sparse, blobless clone of examples/*.html only
  const three = path.join(src, 'three');
  if (!existsSync(path.join(three, 'examples'))) {
    sh(`rm -rf ${three} && git clone -q --depth 1 --filter=blob:none --sparse https://github.com/mrdoob/three.js ${three}`);
    sh(`git sparse-checkout set --no-cone '/examples/*.html'`, { cwd: three });
  }
  const files = Number(sh(`ls ${three}/examples/*.html | wc -l`).trim());
  out['three.js examples'] = { commit: sh('git rev-parse HEAD', { cwd: three }).trim(), files, counts: Object.fromEntries(Object.entries(FEATURES).map(([k, re]) => [k, count(`${three}/examples`, re, '--include=*.html')])) };
  // Codrops: two classic demos (codrops org) and two recent guest-author tutorial repos
  const cd = path.join(src, 'codrops');
  for (const r of ['codrops/RainEffect', 'codrops/ImageTrailEffects', 'guilanier/codrops-sdf-lensblur', 'jothyrangan/codrops-cinematic-scroll-animations']) {
    const d = path.join(cd, r.replace('/', '_'));
    if (!existsSync(d)) sh(`mkdir -p ${cd} && git clone -q --depth 1 https://github.com/${r}.git ${d}`);
    out[r] = { commit: sh('git rev-parse HEAD', { cwd: d }).trim(), counts: Object.fromEntries(Object.entries(FEATURES).map(([k, re]) => [k, count(d, re, '--include=*.js --include=*.ts --include=*.jsx --include=*.tsx --include=*.html --include=*.vue --include=*.mjs', REPO_EXCL)])) };
  }
  // installed background libraries and the fluid demo
  for (const [name, dir] of [['vanta', 'vanta/src'], ['@firecms/neat', '@firecms/neat/dist/NeatGradient.js'], ['@paper-design/shaders', '@paper-design/shaders/dist'], ['@tsparticles/engine', '@tsparticles/engine/esm'], ['granim', 'granim/lib'], ['curtainsjs', 'curtainsjs/src'], ['ogl', 'ogl/src']]) {
    out[name] = { counts: Object.fromEntries(Object.entries(FEATURES).map(([k, re]) => [k, count(path.join(nodeModules, dir), re, '--include=*.js --include=*.mjs')])) };
  }
  out['WebGL-Fluid-Simulation script.js'] = { counts: Object.fromEntries(Object.entries(FEATURES).map(([k, re]) => [k, count(path.join(fluidDir, 'script.js'), re, '')])) };
  return out;
}
