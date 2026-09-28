const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const fs = require("fs");
const poster = `<img src="/poster.svg" width=1200 height=700 style="position:absolute;inset:0">`;
const cases = {
  "canvas only, no text": `<canvas id=c width=1200 height=700 style="width:1200px;height:700px"></canvas>`,
  "canvas + short h1": `<h1 style="font:32px sans-serif">Short headline</h1><canvas id=c width=1200 height=700 style="width:1200px;height:700px"></canvas>`,
  "h1 + detailed poster under canvas": `<h1 style="font:32px sans-serif">Short headline</h1><div style="position:relative;width:1200px;height:700px">${poster}<canvas id=c width=1200 height=700 style="position:absolute;inset:0"></canvas></div>`,
};
const script = `<script>const gl=document.getElementById('c').getContext('webgl2'); window.glok=!!gl; if(gl){gl.clearColor(1,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT);}
window.lcp=[]; new PerformanceObserver(l=>{for(const e of l.getEntries()) window.lcp.push((e.element?.tagName||'?')+' size='+e.size+' t='+Math.round(e.startTime))}).observe({type:'largest-contentful-paint',buffered:true});</script>`;
const srv = require("http").createServer((q, s) => {
  if (q.url.startsWith("/poster.svg")) { s.writeHead(200, { "content-type": "image/svg+xml" }); return s.end(fs.readFileSync("www/poster.svg")); }
  const k = decodeURIComponent(q.url.slice(1)); s.writeHead(200, { "content-type": "text/html" }); s.end(`<!doctype html><body style="margin:0">${cases[k] || ""}${script}`);
}).listen(8799, async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  for (const name of Object.keys(cases)) {
    const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
    await p.goto("http://localhost:8799/" + encodeURIComponent(name)); await p.waitForTimeout(1000);
    console.log(name.padEnd(36), "webgl2:", await p.evaluate(() => window.glok), " LCP:", JSON.stringify(await p.evaluate(() => window.lcp)));
    await p.close();
  }
  await b.close(); srv.close();
});
