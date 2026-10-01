// The analytics contract (README): swTrack('order_start' | 'order_submit' | 'order_error' {field} | 'order_success' {order, total}).
// Runs one order with a mistake on each build, against qa/serve.py's stand-in order service, and prints window.swEvents.
import { launch } from '../../skill/website-redesign/scripts/lib/env.mjs';
const { browser } = await launch();
const run = async (base, steps) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.on('dialog', (d) => d.accept());
  await page.goto(base + '/order/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await steps(page);
  await page.waitForTimeout(1200);
  const ev = await page.evaluate(() => window.swEvents);
  await ctx.close();
  return ev;
};
const oldEv = await run('http://127.0.0.1:4810', async (p) => {
  await p.click('button.submit'); // empty submit first
  await p.selectOption('select[name=size]', 'Classic'); await p.selectOption('select[name=flower1]', 'rose-garden'); await p.fill('input[name=colour1]', 'peach'); await p.fill('input[name=count1]', '12');
  for (const [k, v] of [['delivery_date', '03/10/2026'], ['delivery_postcode', 'LS17 6AB'], ['recipient_name', 'M'], ['sender_name', 'S'], ['sender_email', 's@example.com'], ['sender_phone', '07700 900123']]) await p.fill(`[name=${k}]`, v);
  await p.fill('textarea[name=recipient_address]', '22 Street Lane');
  await p.click('button.submit');
});
const newEv = await run('http://127.0.0.1:4811', async (p) => {
  await p.click('#next'); await p.click('#next');
  await p.click('#next'); // no postcode, no day: errors
  await p.fill('#delivery_postcode', 'LS17 6AB'); await p.waitForTimeout(400); await p.click("label:has(input[value='2026-10-03'])"); await p.click('#next');
  for (const [k, v] of [['recipient_name', 'M'], ['recipient_address', '22 Street Lane'], ['sender_name', 'S'], ['sender_email', 's@example.com'], ['sender_phone', '07700 900123']]) await p.fill('#' + k, v);
  await p.click('#next'); await p.waitForTimeout(300); await p.click('#next');
});
console.log('OLD', JSON.stringify(oldEv));
console.log('NEW', JSON.stringify(newEv));
await browser.close();
