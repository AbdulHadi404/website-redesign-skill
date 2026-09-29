// Minimal static server for the fixtures (ES modules need http, not file:).
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };

export async function serve(root, aliases = {}, generated = {}) {
  const server = http.createServer(async (req, res) => {
    const u = new URL(req.url, 'http://x');
    // aliases map a URL path to a file outside root (e.g. /vendor/pixi.mjs -> node_modules/...)
    // generated maps a URL path to an async function returning the page (variants derived at serve time)
    if (generated[u.pathname]) { res.writeHead(200, { 'content-type': TYPES['.html'], 'cache-control': 'no-store' }); res.end(await generated[u.pathname]()); return; }
    const alias = aliases[u.pathname];
    const p = alias || path.join(root, decodeURIComponent(u.pathname === '/' ? '/index.html' : u.pathname));
    if (!alias && !p.startsWith(root)) { res.writeHead(403).end(); return; }
    try {
      const body = await readFile(p);
      res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(body);
    } catch { res.writeHead(404).end('not found'); }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  return { base: `http://127.0.0.1:${port}`, close: () => new Promise((r) => server.close(r)) };
}
