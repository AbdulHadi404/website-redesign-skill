// Does CDP CPU throttling (Emulation.setCPUThrottlingRate) slow a dedicated Worker, or only the page's
// main thread? Times the same fixed loop on the main thread and in a Worker at 1× and 4×, and tries to
// send the throttling command to the Worker's own DevTools target.
import http from 'node:http';
import { median } from './measure.mjs';

const LOOP = `function spin(k){let x=0;for(let i=0;i<k;i++){x=(x*1103515245+12345+i)|0}return x}`;
const WORKER = `${LOOP}
onmessage=({data})=>{const t=performance.now();spin(data);postMessage(performance.now()-t)}`;
const PAGE = `<!doctype html><meta charset="utf-8"><body><script>${LOOP}
const w = new Worker('/w.js');
window.mainLoop = (k) => { const t = performance.now(); spin(k); return performance.now() - t; };
window.workerLoop = (k) => new Promise((res) => { w.onmessage = ({ data }) => res(data); w.postMessage(k); });
window.ready = true;
</script>`;

export async function throttleProbe(browser, { runs = 5, iterations = 4e7 } = {}) {
  const server = http.createServer((req, res) => {
    if (req.url === '/w.js') { res.writeHead(200, { 'content-type': 'text/javascript' }); res.end(WORKER); return; }
    if (req.url === '/') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(PAGE); return; }
    res.writeHead(404).end();
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const out = {
    note: `The same integer loop (${iterations.toExponential(0)} iterations) timed with performance.now() on the page's main thread and inside a dedicated Worker, with Emulation.setCPUThrottlingRate 1 and 4 sent to the page's CDP session. min and median of ${runs} runs each, alternating main/Worker. Then the throttling command sent directly to the Worker's DevTools target (Target.attachToTarget, non-flattened session).`,
    cells: {},
  };
  const r1 = (x) => Math.round(x);
  for (const rate of [1, 4]) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await page.goto(base);
    await page.waitForFunction(() => window.ready);
    await page.evaluate((k) => window.workerLoop(k / 10), iterations); // warm up both JITs
    await page.evaluate((k) => window.mainLoop(k / 10), iterations);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate });
    const main = [], worker = [];
    for (let i = 0; i < runs; i++) {
      main.push(await page.evaluate((k) => window.mainLoop(k), iterations));
      worker.push(await page.evaluate((k) => window.workerLoop(k), iterations));
    }
    out.cells[`${rate}x`] = { rate, mainMin: r1(Math.min(...main)), mainMedian: r1(median(main)), workerMin: r1(Math.min(...worker)), workerMedian: r1(median(worker)), main: main.map(r1), worker: worker.map(r1) };
    console.log('throttleprobe', rate, JSON.stringify(out.cells[`${rate}x`]));
    await ctx.close();
  }
  // Ask the Worker's own target to throttle.
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(base);
  await page.waitForFunction(() => window.ready);
  await page.evaluate(() => window.workerLoop(1000));
  const bcdp = await browser.newBrowserCDPSession();
  const { targetInfos } = await bcdp.send('Target.getTargets');
  const wt = targetInfos.find((t) => t.type === 'worker' && t.url.startsWith(base.replace(/\/$/, '')));
  if (!wt) out.workerTarget = { found: false, types: [...new Set(targetInfos.map((t) => t.type))] };
  else {
    const { sessionId } = await bcdp.send('Target.attachToTarget', { targetId: wt.targetId, flatten: false });
    const reply = new Promise((res) => {
      bcdp.on('Target.receivedMessageFromTarget', (e) => { if (e.sessionId === sessionId) { const m = JSON.parse(e.message); if (m.id === 7) res(m); } });
      setTimeout(() => res({ timeout: true }), 5000);
    });
    await bcdp.send('Target.sendMessageToTarget', { sessionId, message: JSON.stringify({ id: 7, method: 'Emulation.setCPUThrottlingRate', params: { rate: 4 } }) });
    const m = await reply;
    out.workerTarget = { found: true, type: wt.type, reply: m.error ? { error: m.error.message } : m.timeout ? 'no reply in 5 s' : { ok: m.result } };
  }
  console.log('throttleprobe worker target', JSON.stringify(out.workerTarget));
  await ctx.close();
  server.close();
  return out;
}
