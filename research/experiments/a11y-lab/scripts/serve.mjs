// Minimal static server for the lab pages: node scripts/serve.mjs [port] [root]
import http from 'node:http'; import { readFile } from 'node:fs/promises'; import path from 'node:path';
const port = +(process.argv[2] || 4173); const root = path.resolve(process.argv[3] || 'pages');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png' };
http.createServer(async (req, res) => {
  const p = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  try { const body = await readFile(p.endsWith('/') ? p + 'index.html' : p); res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(404, { 'content-type': 'text/html' }); res.end('<!doctype html><html lang="en"><title>Not found</title><h1>Not found</h1>'); }
}).listen(port, () => console.log(`serving ${root} on http://localhost:${port}`));
