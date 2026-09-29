/**
 * A static file server for the experiments. Serves several roots under one origin:
 *   /            -> this experiment folder
 *   /repo/...    -> the repository root (tools/regress/fixtures, H-blind-eval fixtures)
 *   /fonts/...   -> node_modules/@fontsource (OFL fonts installed from npm, not committed)
 * Extra roots can be mounted: serve({ mounts: { '/astro/': '/tmp/s2-S7/astro/dist' } }); with only: true, just the mounts.
 * `?delay=ms` on any request delays the response.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const repo = path.resolve(here, '../../../..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.ico': 'image/x-icon', '.txt': 'text/plain', '.xml': 'application/xml' };

export async function serve({ port = 0, mounts = {}, only = false } = {}) {
  // only: serve just the mounts (a fixture folder that expects to be the site root, e.g. S8's /fixtures/ and /fonts/).
  const table = only ? Object.entries(mounts).map(([k, v]) => [k.replace(/\/?$/, '/'), v]).sort((a, b) => b[0].length - a[0].length)
    : [['/repo/', repo], ['/fonts/', path.join(here, 'node_modules/@fontsource')], ...Object.entries(mounts).map(([k, v]) => [k.replace(/\/?$/, '/'), v]), ['/', here]];
  const server = createServer(async (req, res) => {
    const u = new URL(req.url, 'http://x');
    const delay = Number(u.searchParams.get('delay')) || 0;
    if (delay) await new Promise((r) => setTimeout(r, delay));
    const p = decodeURIComponent(u.pathname);
    const [prefix, root] = table.find(([k]) => p.startsWith(k) || p + '/' === k);
    let f = path.join(root, path.normalize(p.slice(prefix.length - 1) || '/'));
    if (!f.startsWith(root)) { res.writeHead(403); return res.end(); }
    try {
      let s = await stat(f);
      if (s.isDirectory()) { f = path.join(f, 'index.html'); s = await stat(f); }
      res.writeHead(200, { 'content-type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(await readFile(f));
    } catch { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('not found'); }
  });
  await new Promise((r) => server.listen(port, '127.0.0.1', r));
  return { server, base: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((r) => server.close(r)) };
}

// `node lib/server.mjs [port] [/mount/=dir ...]` keeps a server up for manual runs.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const mounts = Object.fromEntries(process.argv.slice(3).map((m) => m.split('=')));
  const s = await serve({ port: Number(process.argv[2]) || 0, mounts });
  console.log(s.base);
}
