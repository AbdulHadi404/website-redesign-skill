// Measures CLS for the font fallback variants under slow-4G + 4x CPU at 360px.
import { chromium, devices } from 'playwright';
const executablePath = process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const names = process.argv.slice(2).length ? process.argv.slice(2) : ['font-none', 'font-matched-nolocal', 'font-matched', 'font-matched-bold', 'font-optional'];
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
for (const name of names) {
  const vals = [];
  for (let run = 0; run < 3; run++) {
    const ctx = await browser.newContext({ ...devices['Moto G4'], defaultBrowserType: undefined });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 562.5, downloadThroughput: 184320, uploadThroughput: 86400 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.addInitScript(() => {
      window.__cls = 0; window.__shifts = [];
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) { window.__cls += e.value; window.__shifts.push(Math.round(e.startTime)); } })
        .observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto(`http://localhost:5055/${name}`, { waitUntil: 'load' });
    await page.waitForTimeout(3500);
    const r = await page.evaluate(() => ({ cls: +window.__cls.toFixed(4), at: window.__shifts,
      h1: Math.round(document.querySelector('h1').getBoundingClientRect().height),
      loaded: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family).join(','),
      rendered: document.fonts.check('700 44px "Playfair Display"') }));
    vals.push(r);
    await ctx.close();
  }
  console.log(name.padEnd(22), JSON.stringify(vals));
}
await browser.close();
