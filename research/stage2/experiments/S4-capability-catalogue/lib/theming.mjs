// How well a styled library takes a custom design system, measured from what it ships: the CSS files in
// the package, the distinct custom properties they define (theming surface), their dominant prefix, and
// whether a structural-only stylesheet exists beside the themed one (e.g. xyflow base.css vs style.css).
import { readdir, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

async function walk(dir, out = [], depth = 0) {
  if (depth > 5) return out;
  for (const e of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p, out, depth + 1);
    else if (/\.css$/.test(e.name) && !/\.module\.css$/.test(e.name)) out.push(p);
  }
  return out;
}

export async function theming(root, pkg) {
  const dir = path.join(root, 'node_modules', pkg);
  if (!existsSync(dir)) return null;
  const files = await walk(dir);
  const props = new Set();
  let bytes = 0;
  for (const f of files) {
    const t = await readFile(f, 'utf8');
    bytes += (await stat(f)).size;
    for (const m of t.matchAll(/(--[a-zA-Z0-9_-]+)\s*:/g)) props.add(m[1]);
  }
  const prefixes = {};
  for (const p of props) { const k = p.split('-').slice(0, 3).join('-'); prefixes[k] = (prefixes[k] || 0) + 1; }
  const top = Object.entries(prefixes).sort((a, b) => b[1] - a[1])[0];
  const names = files.map((f) => path.relative(dir, f));
  return {
    cssFiles: files.length, cssBytes: bytes, customProperties: props.size, prefix: top ? top[0] + '-*' : null,
    structuralSheet: names.filter((n) => /(^|[/.])(base|structure|core|layout|skeleton|init)\.css$/i.test(n)).slice(0, 3),
    sample: names.slice(0, 4),
  };
}
