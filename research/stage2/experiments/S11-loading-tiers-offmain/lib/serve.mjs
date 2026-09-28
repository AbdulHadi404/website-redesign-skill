// A tiny static server for the fixtures in captures/site. Serves a precompressed .gz twin when the client
// accepts gzip (as a production host would), long-lived cache headers for hashed-style assets, and
// no-cache for HTML. Returns { url, close }.
import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.ndjson': 'application/x-ndjson', '.css': 'text/css', '.avif': 'image/avif', '.webp': 'image/webp', '.jpg': 'image/jpeg',
  '.png': 'image/png', '.bin': 'application/octet-stream', '.svg': 'image/svg+xml', '.wasm': 'application/wasm',
};

export function serve(root, { port = 0, headers = {} } = {}) {
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    let p = path.join(root, decodeURIComponent(u.pathname));
    if (!p.startsWith(root)) { res.writeHead(403).end(); return; }
    if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, 'index.html');
    if (!existsSync(p)) { res.writeHead(404).end('not found'); return; }
    const ext = path.extname(p);
    const h = { 'Content-Type': TYPES[ext] || 'application/octet-stream', ...headers };
    h['Cache-Control'] = ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable';
    // Workers and fetch() from the same origin: no CORS needed; COOP/COEP only when asked (SharedArrayBuffer).
    let file = p;
    if (/\bgzip\b/.test(req.headers['accept-encoding'] || '') && existsSync(p + '.gz')) { file = p + '.gz'; h['Content-Encoding'] = 'gzip'; h['Vary'] = 'Accept-Encoding'; }
    h['Content-Length'] = statSync(file).size;
    res.writeHead(200, h);
    if (req.method === 'HEAD') { res.end(); return; }
    createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => {
    const { port: p } = server.address();
    resolve({ url: `http://127.0.0.1:${p}`, close: () => new Promise((r) => { server.closeAllConnections?.(); server.close(r); }) });
  }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = path.resolve(process.argv[2] || 'captures/site');
  const s = await serve(root, { port: Number(process.argv[3]) || 8411 });
  console.log(`serving ${root} at ${s.url}`);
}
