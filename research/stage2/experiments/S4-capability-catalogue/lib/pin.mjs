// One-off: pin every catalogue package (plus the lab's own tools) to the npm `latest` of today in package.json.
// Usage: NODE_USE_ENV_PROXY=1 node lib/pin.mjs   (then npm install --legacy-peer-deps --ignore-scripts)
import { writeFile } from 'node:fs/promises';
import { candidates } from '../catalogue.mjs';
const tools = ['react', 'react-dom', 'esbuild', 'date-fns', 'd3-polygon', '@mdn/browser-compat-data'];
const names = [...new Set([...candidates.flatMap((c) => c.pkgs), ...tools])].sort();
const deps = {};
for (const n of names) {
  const r = await fetch('https://registry.npmjs.org/' + n.replace('/', '%2F'));
  const j = await r.json();
  deps[n] = j['dist-tags'].latest;
}
const pkg = { name: 's4-capability-catalogue', private: true, type: 'module',
  description: 'Stage-2 stream S4: capability catalogue of hard-UI libraries (licence, activity, bundle cost) and keyboard/a11y demos of the top picks. Run: npm install --legacy-peer-deps --ignore-scripts && node run.mjs',
  scripts: { start: 'node run.mjs' }, dependencies: deps };
await writeFile(new URL('../package.json', import.meta.url), JSON.stringify(pkg, null, 2) + '\n');
console.log(Object.keys(deps).length, 'packages pinned');
