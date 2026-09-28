const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const page = (range) => `<!doctype html><style>
body{margin:0;font:16px sans-serif} section{height:500px;border-bottom:1px solid #ccc} .card{height:120px;background:#468;margin:20px}
@supports (animation-timeline: view()) { @media (prefers-reduced-motion: no-preference) {
  .reveal{ animation: reveal linear both; animation-timeline: view(); animation-range: ${range}; }
}}
@keyframes reveal{ from{opacity:0; transform:translateY(24px)} to{opacity:1; transform:none} }
</style><section></section><section></section><div style="height:300px"></div><div class="card reveal" id=last>last card</div><footer style="height:40px">footer</footer>`;
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
  for (const range of ["entry 0% cover 30%", "entry 0% entry 100%"]) {
    for (const rm of ["no-preference", "reduce"]) {
      const p = await b.newPage({ viewport: { width: 1000, height: 800 } }); await p.emulateMedia({ reducedMotion: rm });
      await p.setContent(page(range));
      await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(300);
      const op = await p.evaluate(() => getComputedStyle(document.getElementById("last")).opacity);
      console.log(`range="${range}" reduced=${rm.padEnd(13)} last card opacity at max scroll = ${(+op).toFixed(2)}`);
      await p.close();
    }
  }
  await b.close();
})();
