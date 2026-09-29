// Fixtures and server for the streaming experiment: one product-listing page whose data takes BACKEND_MS to come
// from a backend, delivered four ways:
//   buffered   server waits for the data, then sends the whole page (classic SSR without streaming)
//   streamed   server flushes the head, header, hero and a skeleton at once; the list follows when the data is
//              ready, swapped in by a tiny inline script (what React/Next Suspense streaming does in order)
//   csr        server sends the same shell (hero and skeleton in the HTML) + an app bundle that fetches the data
//   csr-all    server sends an empty shell; the bundle renders hero and list (a client-rendered SPA)
import http from 'node:http';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { gzipSync, constants } from 'node:zlib';
import path from 'node:path';
import sharp from 'sharp';
import { here, siteRoot } from './common.mjs';

export const BACKEND_MS = 1200;
const dir = path.join(siteRoot, 'stream');

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const items = (() => { const r = rng(3); return Array.from({ length: 24 }, (_, i) => ({ id: i + 1, name: `Product ${i + 1}`, price: (9 + Math.floor(r() * 90)) + '.00', blurb: 'Hand-finished, ships in two days. '.repeat(1 + Math.floor(r() * 2)) })); })();
const itemHtml = (it) => `<li class=item><div class=thumb></div><div><strong>${it.name}</strong><p>${it.blurb}</p><span>€${it.price}</span></div></li>`;

const CSS = `body{margin:0;font:16px/1.5 system-ui,sans-serif;color:#1d1d1f;background:#fbfaf7}header{height:52px;display:flex;align-items:center;padding:0 16px;border-bottom:1px solid #e6e2da}
main{padding:0 16px}h1{font-size:28px;margin:16px 0 8px}.hero{width:100%;height:auto;display:block;border-radius:8px;aspect-ratio:3/2}
ul{list-style:none;padding:0;margin:16px 0}.item{display:flex;gap:12px;padding:12px 0;border-bottom:1px solid #eee;min-height:96px;box-sizing:border-box}
.thumb{width:72px;height:72px;border-radius:6px;background:#e9e4da;flex:none}.item p{margin:2px 0;color:#555;font-size:14px}
.sk .item div:last-child{flex:1;background:linear-gradient(#e9e4da 0 0) 0 4px/60% 14px no-repeat,linear-gradient(#efebe3 0 0) 0 30px/90% 12px no-repeat,linear-gradient(#efebe3 0 0) 0 50px/70% 12px no-repeat}`;
const OBS = `<script>window.__o={cls:0};new PerformanceObserver(l=>l.getEntries().forEach(e=>{__o.lcp=e.startTime;__o.lcpEl=e.element&&(e.element.id||e.element.tagName)})).observe({type:'largest-contentful-paint',buffered:true});
new PerformanceObserver(l=>l.getEntries().forEach(e=>{if(!e.hadRecentInput)__o.cls+=e.value})).observe({type:'layout-shift',buffered:true});
new PerformanceObserver(l=>l.getEntries().forEach(e=>{if(e.name==='first-contentful-paint')__o.fcp=e.startTime})).observe({type:'paint',buffered:true});</script>`;
const head = (title, extra = '') => `<!doctype html><html lang=en><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>${title}</title><style>${CSS}</style>${OBS}${extra}</head><body>`;
const top = `<header><strong>Northwind</strong></header><main><h1>New this week</h1><img class=hero id=hero src="/stream/hero.avif" width=780 height=520 fetchpriority=high alt="The new collection">`;
const skeleton = `<ul class=sk id=sk>${Array.from({ length: 6 }, () => '<li class=item><div class=thumb></div><div></div></li>').join('')}</ul>`;

export async function buildStreaming() {
  await mkdir(dir, { recursive: true });
  await sharp(path.join(here, 'captures/src/hero.jpg')).resize({ width: 780, height: 520, fit: 'cover' }).avif({ quality: 72, effort: 4 }).toFile(path.join(dir, 'hero.avif'));
  // An app bundle of a typical size (~100 KB gzip: a framework plus a listing page) with ~80 ms of boot work at 1×.
  const r = rng(5); const fns = [];
  for (let i = 0; i < 2600; i++) fns.push(`function f${i}(a){const k=${JSON.stringify(String(r()).slice(2))};let s=a;for(let j=0;j<${4 + Math.floor(r() * 8)};j++)s=(s*31+k.charCodeAt(j%k.length))%${10007 + Math.floor(r() * 9000)};return s}`);
  const app = `${fns.join('\n')}
const F=[${fns.map((_, i) => 'f' + i).join(',')}];let acc=0;for(let i=0;i<F.length;i++)acc+=F[i](i);
(function(){let s=0;for(let i=0;i<1.5e7;i++)s+=Math.sqrt(i)*1e-9;window.__boot=s})();
const itemHtml=${itemHtml.toString()};
(async()=>{const mode=document.documentElement.dataset.mode;
 if(mode==='csr-all'){document.getElementById('root').innerHTML=${JSON.stringify(top)}+${JSON.stringify(skeleton)};}
 const items=await (await fetch('/stream/api/items')).json();
 const ul=document.createElement('ul');ul.innerHTML=items.map(itemHtml).join('');document.getElementById('sk').replaceWith(ul);performance.mark('list');})();`;
  await writeFile(path.join(dir, 'app.js'), app);
  const raw = await readFile(path.join(dir, 'app.js'));
  return { backendMs: BACKEND_MS, appJs: { raw: raw.length, gzip: gzipSync(raw, { level: constants.Z_BEST_COMPRESSION }).length }, heroBytes: (await readFile(path.join(dir, 'hero.avif'))).length, items: items.length };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export function serveStreaming() {
  const gz = (s) => gzipSync(Buffer.from(s), { level: 6 });
  const server = http.createServer(async (req, res) => {
    const u = new URL(req.url, 'http://x');
    const p = u.pathname;
    const html = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' };
    if (p === '/stream/hero.avif') { res.writeHead(200, { 'Content-Type': 'image/avif' }); res.end(await readFile(path.join(dir, 'hero.avif'))); return; }
    if (p === '/stream/app.js') { res.writeHead(200, { 'Content-Type': 'text/javascript', 'Content-Encoding': 'gzip' }); res.end(gz(await readFile(path.join(dir, 'app.js')))); return; }
    if (p === '/stream/api/items') { await sleep(BACKEND_MS); res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(items)); return; }
    const list = `<ul>${items.map(itemHtml).join('')}</ul><script>performance.mark('list')</script>`;
    if (p === '/stream/buffered') {
      await sleep(BACKEND_MS);
      res.writeHead(200, html); res.end(head('buffered') + top + list + '</main></body></html>'); return;
    }
    if (p === '/stream/streamed') {
      // Transfer-Encoding: chunked; the first chunk is flushed at once (a production server would gzip-flush it)
      res.writeHead(200, html);
      res.write(head('streamed') + top + skeleton);
      await sleep(BACKEND_MS);
      res.end(`<template id=data>${list}</template><script>{const t=document.getElementById('data');document.getElementById('sk').replaceWith(t.content);t.remove();performance.mark('list')}</script></main></body></html>`);
      return;
    }
    if (p === '/stream/csr') { res.writeHead(200, html); res.end(head('csr', '<script defer src="/stream/app.js"></script>').replace('<html lang=en>', '<html lang=en data-mode=csr>') + top + skeleton + '</main></body></html>'); return; }
    if (p === '/stream/csr-all') { res.writeHead(200, html); res.end(head('csr-all', '<script defer src="/stream/app.js"></script>').replace('<html lang=en>', '<html lang=en data-mode=csr-all>') + '<div id=root></div></body></html>'); return; }
    res.writeHead(404).end();
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((r) => { server.closeAllConnections?.(); server.close(r); }) })));
}
