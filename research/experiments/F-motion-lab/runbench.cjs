const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const root = path.join(__dirname, "www");
const srv = http.createServer((q, s) => { if (q.url === "/") { s.writeHead(200, { "content-type": "text/html" }); return s.end('<!doctype html><body style="margin:0"></body>'); } fs.readFile(path.join(root, q.url.split("?")[0]), (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { "content-type": "text/javascript" }); s.end(d); }); });
const RATE = +process.env.RATE || 4;
srv.listen(8766, async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
  const libs = ["uplot", "chartjs", "chartjsDecimated", "echartsCanvas", "echartsCanvasLTTB", "echartsSVG", "plotSVG", "d3SVGpath", "rechartsSVG"];
  const sizes = [1000, 10000, 100000];
  console.log("CPU throttle", RATE + "x", "Chromium", browser.version());
  console.log("lib".padEnd(20), sizes.map(s => String(s).padStart(9)).join(""));
  for (const lib of libs) {
    const row = [];
    for (const n of sizes) {
      const ts = [];
      for (let i = 0; i < 3; i++) {
        const ctx = await browser.newContext({ viewport: { width: 1000, height: 600 } }); const page = await ctx.newPage();
        const cdp = await ctx.newCDPSession(page); await page.goto("http://localhost:8766/");
        await page.addScriptTag({ url: "/chartbench.js", type: "module" }); await page.waitForFunction(() => window.bench);
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: RATE });
        try { ts.push(await page.evaluate(([l, n]) => window.bench[l](n), [lib, n])); } catch (e) { ts.push(NaN); }
        await ctx.close();
      }
      ts.sort((a, b) => a - b); row.push(ts[1]);
    }
    console.log(lib.padEnd(20), row.map(v => (isNaN(v) ? "ERR" : v.toFixed(0) + "ms").padStart(9)).join(""));
  }
  await browser.close(); srv.close();
});
