// Minimal static server for dist/: no compression (sizes are reported gzip/brotli from the files),
// long-lived keep-alive, and a request log so each page load's payload can be summed.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.avif': 'image/avif', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json' };
export async function serve(root, port = 0) {
  const log = [];
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    let p = path.join(root, decodeURIComponent(url.pathname));
    try {
      if ((await stat(p)).isDirectory()) p = path.join(p, 'index.html');
      const body = await readFile(p);
      log.push({ path: url.pathname, bytes: body.length, t: Date.now() });
      res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream', 'content-length': body.length, 'cache-control': 'no-store' });
      res.end(body);
    } catch {
      res.writeHead(404); res.end('not found');
    }
  });
  await new Promise((r) => server.listen(port, '127.0.0.1', r));
  return { base: `http://127.0.0.1:${server.address().port}`, log, close: () => new Promise((r) => server.close(r)) };
}
