// A static server for the fixture. /v/<variant>/ serves page/index.html with the variant's move classes on <html>;
// a variant is 'base', a move id, or a stack name from the variants map passed in.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.js': 'text/javascript' };

export async function serve(root, variants, port = 0) {
  const pageDir = path.join(root, 'page');
  const assetDir = path.join(root, 'assets');
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://x');
      let m = url.pathname.match(/^\/v\/([\w-]+)\/?$/);
      if (m) {
        const moves = variants[m[1]];
        if (!moves) { res.writeHead(404); return res.end(`unknown variant ${m[1]}`); }
        const html = (await readFile(path.join(pageDir, 'index.html'), 'utf8')).replace('__MOVES__', moves.map((x) => `m-${x}`).join(' '));
        res.writeHead(200, { 'content-type': TYPES['.html'], 'cache-control': 'no-store' });
        return res.end(html);
      }
      const p = url.pathname.startsWith('/assets/') ? path.join(assetDir, url.pathname.slice(8)) : path.join(pageDir, url.pathname === '/' ? 'index.html' : url.pathname);
      if (!p.startsWith(pageDir) && !p.startsWith(assetDir)) { res.writeHead(403); return res.end(); }
      const body = await readFile(p);
      res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(body);
    } catch {
      res.writeHead(404); res.end('not found');
    }
  });
  await new Promise((r) => server.listen(port, '127.0.0.1', r));
  return { server, base: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((r) => server.close(r)) };
}
