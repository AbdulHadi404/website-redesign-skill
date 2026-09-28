import { launch } from '/tmp/claude-0/-home-user-website-redesign-skill/c5b6846e-6a5b-5d91-847f-94b2f6f7dc15/scratchpad/skill-frozen-4/skills/website-redesign/scripts/lib/env.mjs';
const { browser } = await launch();
async function run(base, flow) {
  const page = await browser.newPage();
  let body = null;
  await page.route('**/api/apply', (r) => { body = r.request().postData(); r.fulfill({ status: 200, contentType: 'application/json', body: '{"reference":"HPP-104233"}' }); });
  await page.goto(base + '/apply/'); await page.waitForTimeout(500);
  await page.setInputFiles('[name=proof_of_address]', { name: 'council-tax-2026.pdf', mimeType: 'application/pdf', buffer: Buffer.from('x') }).catch(() => {});
  await flow(page);
  await page.waitForTimeout(800);
  const events = await page.evaluate(() => window.hbcEvents);
  const extra = await page.evaluate(() => ({ title: document.title, active: document.activeElement?.outerHTML.slice(0, 80), priceRendered: document.getElementById('price')?.getClientRects().length }));
  await page.close();
  return { body, events, extra };
}
const old = await run('http://localhost:5841', async (p) => {
  for (const [n, v] of [['full_name','Aoife Byrne'],['email','aoife@example.com'],['phone','07700 900123'],['address_line1','12 Castle Street'],['postcode','HB1 2CS'],['vehicle_reg','HB19 XYZ'],['vehicle_make','Ford']]) await p.fill(`[name=${n}]`, v);
  await p.selectOption('[name=zone]', 'C'); await p.selectOption('[name=permit_length]', '12');
  await p.check('[name=blue_badge]'); await p.check('[name=consent]'); await p.click('#human'); await p.click('button[type=submit]');
});
const neu = await run('http://localhost:5843', async (p) => {
  const cont = () => p.click('section:not([hidden]) button[type=submit]');
  await p.selectOption('#street', 'Castle Street'); await cont();
  await p.check('#permit_length-12'); await p.check('#blue_badge'); await cont();
  await p.fill('#vehicle_reg', 'HB19 XYZ'); await p.fill('#vehicle_make', 'Ford'); await cont();
  for (const [n, v] of [['full_name','Aoife Byrne'],['address_line1','12 Castle Street'],['postcode','HB1 2CS'],['email','aoife@example.com'],['phone','07700 900123']]) await p.fill(`#${n}`, v);
  await cont();
  await p.setInputFiles('#proof_of_address', { name: 'council-tax-2026.pdf', mimeType: 'application/pdf', buffer: Buffer.from('x') });
  await cont(); await p.check('#consent'); await p.click('#send');
});
console.log('OLD body', old.body); console.log('NEW body', neu.body);
console.log('identical:', old.body === neu.body);
console.log('OLD events', JSON.stringify(old.events)); console.log('NEW events', JSON.stringify(neu.events));
console.log('NEW after', JSON.stringify(neu.extra));
// error-event parity: empty submit on old vs empty continue through every new step
const page = await browser.newPage(); await page.goto('http://localhost:5841/apply/'); await page.waitForTimeout(400); await page.click('button[type=submit]');
console.log('OLD empty-submit events', JSON.stringify(await page.evaluate(() => window.hbcEvents)));
await page.goto('http://localhost:5843/apply/#check'); await page.waitForTimeout(400);
const p2 = await browser.newPage(); await p2.goto('http://localhost:5843/apply/'); await p2.waitForTimeout(400); await p2.click('section:not([hidden]) button[type=submit]');
console.log('NEW empty step-1 events', JSON.stringify(await p2.evaluate(() => window.hbcEvents)), 'focus:', await p2.evaluate(() => document.activeElement.id));
await browser.close();
