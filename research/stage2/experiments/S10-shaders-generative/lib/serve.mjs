// Minimal static server for dist/: no compression (sizes are reported gzip/brotli from the files),
// long-lived keep-alive, and a request log so each page load's payload can be summed.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.avif': 'image/avif', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.webm': 'video/webm', '.mp4': 'video/mp4' };
export async function serve(root, port = 0) {
  const log = [];
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    let p = path.join(root, decodeURIComponent(url.pathname));
    try {
      if ((await stat(p)).isDirectory()) p = path.join(p, 'index.html');
      const body = await readFile(p);
      const type = TYPES[path.extname(p)] || 'application/octet-stream';
      const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
      if (m && type.startsWith('video/')) {           // media elements fetch by range
        const start = m[1] ? Number(m[1]) : Math.max(0, body.length - Number(m[2]));
        const end = m[1] && m[2] ? Math.min(Number(m[2]), body.length - 1) : body.length - 1;
        log.push({ path: url.pathname, bytes: end - start + 1, t: Date.now(), range: true });
        res.writeHead(206, { 'content-type': type, 'content-length': end - start + 1, 'content-range': `bytes ${start}-${end}/${body.length}`, 'accept-ranges': 'bytes', 'cache-control': 'max-age=3600' });
        res.end(body.subarray(start, end + 1));
        return;
      }
      log.push({ path: url.pathname, bytes: body.length, t: Date.now() });
      res.writeHead(200, { 'content-type': type, 'content-length': body.length, 'cache-control': type.startsWith('video/') ? 'max-age=3600' : 'no-store', ...(type.startsWith('video/') ? { 'accept-ranges': 'bytes' } : {}) });
      res.end(body);
    } catch {
      res.writeHead(404); res.end('not found');
    }
  });
  await new Promise((r) => server.listen(port, '127.0.0.1', r));
  return { base: `http://127.0.0.1:${server.address().port}`, log, close: () => new Promise((r) => server.close(r)) };
}
