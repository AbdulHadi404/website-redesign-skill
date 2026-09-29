// Lighthouse user flow: navigation + a timespan with a real click, so INP is measured in the lab
// (navigation-mode Lighthouse cannot measure INP; it reports TBT as the proxy).
//   node lh-flow.mjs http://localhost:5055/bad "#buy"
import puppeteer from 'puppeteer-core';
import { startFlow } from 'lighthouse';
import { writeFile } from 'node:fs/promises';
const [url = 'http://localhost:5055/bad', sel = '#buy'] = process.argv.slice(2);
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'], headless: true });
const page = await browser.newPage();
const flow = await startFlow(page, { config: { extends: 'lighthouse:default', settings: { onlyCategories: ['performance'] } } });
await flow.navigate(url);
await flow.startTimespan();
for (let i = 0; i < 3; i++) { await page.click(sel); await new Promise((r) => setTimeout(r, 500)); }
await flow.endTimespan();
const result = await flow.createFlowResult();
await writeFile('reports/flow.html', await flow.generateReport());
for (const step of result.steps) {
  const a = step.lhr.audits;
  const pick = (id) => a[id]?.displayValue ?? '—';
  console.log(`${step.lhr.gatherMode.padEnd(10)} LCP ${pick('largest-contentful-paint')} | TBT ${pick('total-blocking-time')} | CLS ${pick('cumulative-layout-shift')} | INP ${pick('interaction-to-next-paint')}`);
}
await browser.close();
