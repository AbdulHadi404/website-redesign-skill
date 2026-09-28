// How DOM size and content-visibility change (a) initial render time and (b) the INP of a
// UI-wide toggle (a "compact density" switch that changes padding on every row), at 4x CPU.
//   CHROME_PATH=... node dom-cost.mjs
import { chromium, devices } from 'playwright';
const executablePath = process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const page = (n, cv) => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{margin:0;font:14px/1.4 system-ui} .row{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:12px;padding:14px 16px;border-bottom:1px solid #ddd}
body.compact .row{padding:4px 16px}
.section{${cv ? 'content-visibility:auto;contain-intrinsic-size:auto 2200px;' : ''}}
</style></head><body>
<button id="t" style="position:fixed;top:8px;right:8px;min-height:44px;z-index:10">Compact</button>
<script>
window.__inp = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.interactionId) window.__inp = Math.max(window.__inp, e.duration); }).observe({ type: 'event', durationThreshold: 16, buffered: true });
const t0 = performance.now();
let html = '';
for (let s = 0; s < ${n / 50}; s++) { html += '<section class="section"><h2>Group ' + s + '</h2>';
  for (let i = 0; i < 50; i++) html += '<div class="row"><span>Customer ' + (s*50+i) + ' <b>Ltd</b></span><span>£' + (i*37%900) + '</span><span>Open</span><span><a href="#">View</a></span></div>';
  html += '</section>'; }
document.body.insertAdjacentHTML('beforeend', html);
document.body.offsetHeight;
requestAnimationFrame(() => setTimeout(() => { window.__render = performance.now() - t0; }, 0));
document.getElementById('t').addEventListener('click', () => document.body.classList.toggle('compact'));
</script></body></html>`;

const browser = await chromium.launch({ executablePath, args: ["--no-sandbox", "--disable-background-networking"] });
const rows = [];
for (const n of [1000, 5000, 20000]) for (const cv of [false, true]) {
  const ctx = await browser.newContext({ ...devices['Moto G4'], defaultBrowserType: undefined });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  // (observer lives in the page: setContent() uses document.open/write, which discards init-script globals)
  await p.setContent(page(n, cv));
  await p.waitForFunction(() => window.__render);
  const render = await p.evaluate(() => Math.round(window.__render));
  for (let i = 0; i < 4; i++) { await p.click('#t'); await p.waitForTimeout(400); }
  const inp = await p.evaluate(() => Math.round(window.__inp));
  const nodes = await p.evaluate(() => document.getElementsByTagName('*').length);
  rows.push({ rows: n, domNodes: nodes, contentVisibility: cv, initialRenderMs: render, densityToggleINPms: inp });
  await ctx.close();
}
await browser.close();
console.table(rows);
