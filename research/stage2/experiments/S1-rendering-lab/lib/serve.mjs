// Minimal static server for dist/ (no compression, no caching: every page load is cold).
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css', '.wasm': 'application/wasm' };

export function serve(dir) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    let p = path.join(dir, decodeURIComponent(url.pathname));
    if (!p.startsWith(dir)) { res.writeHead(403).end(); return; }
    if (p.endsWith('/')) p += 'index.html';
    try {
      const body = await readFile(p);
      res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(body);
    } catch { res.writeHead(404).end('not found'); }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, base: `http://127.0.0.1:${server.address().port}` })));
}
