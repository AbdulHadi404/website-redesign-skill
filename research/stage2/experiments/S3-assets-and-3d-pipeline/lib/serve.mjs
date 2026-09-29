// Minimal static server (HTTP/1.1, like most local dev servers; browsers open ≤ 6 connections per origin).
// Routes: /build/ → BUILD dir, /cache/ → fetched third-party inputs, /nm/ → this lab's node_modules.
import http from 'node:http';
import http2 from 'node:http2';
import { execFileSync } from 'node:child_process';
import { createReadStream, existsSync, readFileSync, mkdirSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const LAB = path.resolve(here, '..');
export const BUILD = process.env.S3_BUILD || '/tmp/s2-S3/build';
export const CACHE = process.env.S3_CACHE || '/tmp/s2-S3/cache';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif', '.jpg': 'image/jpeg', '.ktx2': 'image/ktx2',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream', '.wasm': 'application/wasm',
  '.riv': 'application/octet-stream', '.skel': 'application/octet-stream', '.atlas': 'text/plain', '.css': 'text/css',
};

// A throwaway self-signed certificate for the HTTP/2 server (browsers speak h2 only over TLS; the lab context
// sets ignoreHTTPSErrors). Generated once with openssl into the build folder.
function cert() {
  const dir = path.join(BUILD, 'cert');
  const key = path.join(dir, 'key.pem'), crt = path.join(dir, 'cert.pem');
  if (!existsSync(crt)) {
    mkdirSync(dir, { recursive: true });
    execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', crt, '-days', '30', '-subj', '/CN=127.0.0.1'], { stdio: 'ignore' });
  }
  return { key: readFileSync(key), cert: readFileSync(crt) };
}

/** serve() → HTTP/1.1 (≤ 6 connections per origin in the browser); serve(0, { h2: true }) → HTTP/2 over TLS (one multiplexed connection). */
export function serve(port = 0, { h2 = false } = {}) {
  const roots = { build: BUILD, cache: CACHE, nm: path.join(LAB, 'node_modules') };
  const handler = async (req, res) => {
    try {
      const u = new URL(req.url, 'http://x');
      const [, root, ...rest] = decodeURIComponent(u.pathname).split('/');
      const base = roots[root];
      if (!base) { res.writeHead(404); return res.end(); }
      const file = path.join(base, ...rest);
      if (!file.startsWith(base)) { res.writeHead(403); return res.end(); }
      const st = await stat(file);
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'content-length': st.size, 'cache-control': 'no-store', 'access-control-allow-origin': '*' });
      createReadStream(file).pipe(res);
    } catch { res.writeHead(404); res.end(); }
  };
  const server = h2 ? http2.createSecureServer({ ...cert(), allowHTTP1: false }, handler) : http.createServer(handler);
  const sessions = new Set();
  if (h2) server.on('session', (s) => { sessions.add(s); s.on('close', () => sessions.delete(s)); });
  const close = () => new Promise((r) => { for (const s of sessions) s.destroy(); server.close(r); });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve({ server, url: `${h2 ? 'https' : 'http'}://127.0.0.1:${server.address().port}`, close })));
}
