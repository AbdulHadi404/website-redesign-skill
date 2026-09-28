const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const root = path.join(__dirname, "www");
const srv = http.createServer((q, s) => { const p = path.join(root, decodeURIComponent(q.url.split("?")[0])); if (q.url === "/" ) { s.writeHead(200,{"content-type":"text/html"}); return s.end("<!doctype html><canvas></canvas><div id=c></div><div id=v></div><svg></svg>"); } fs.readFile(p, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { "content-type": p.endsWith(".js") ? "text/javascript" : p.endsWith(".wasm")?"application/wasm":"application/octet-stream" }); s.end(d); }); });
srv.listen(8765, async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args:["--no-sandbox"] });
  console.log("browser", browser.version());
  const names = fs.readdirSync(root).filter(f => f.endsWith(".js")).map(f => f.slice(0, -3)).sort();
  const out = [];
  for (const n of names) {
    const times = [];
    for (let i = 0; i < 7; i++) {
      const ctx = await browser.newContext(); const page = await ctx.newPage();
      const cdp = await ctx.newCDPSession(page); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      await page.goto("http://localhost:8765/");
      const t = await page.evaluate(async (u) => { const t0 = performance.now(); try { await import(u); } catch (e) { return "ERR " + e.message.slice(0, 60); } return performance.now() - t0; }, `/${n}.js?${i}`);
      times.push(t); await ctx.close();
    }
    const num = times.filter(x => typeof x === "number").sort((a, b) => a - b);
    out.push([n, num.length ? num[Math.floor(num.length / 2)].toFixed(0) : times[0]]);
    console.log(n.padEnd(32), out.at(-1)[1]);
  }
  fs.writeFileSync("evalcost.json", JSON.stringify(out));
  await browser.close(); srv.close();
});
