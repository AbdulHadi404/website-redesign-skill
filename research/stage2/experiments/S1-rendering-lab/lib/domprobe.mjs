// Does a page full of compositor-driven CSS animations cost the main thread anything? Plain divs with a
// looping bob (CSS `translate`, CSS `transform`, WAAPI `transform`), with and without an unrelated
// requestAnimationFrame loop elsewhere on the page. Counts UpdateLayoutTree (style recalc) from a trace.
import http from 'node:http';
import { median } from './measure.mjs';

const MODES = {
  'css translate': { css: '.a{animation:bob 1600ms linear infinite}@keyframes bob{0%,100%{translate:0 0}50%{translate:0 -4px}}' },
  'css transform': { css: '.a{animation:bob 1600ms linear infinite}@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}' },
  'waapi transform': { waapi: true },
  'css translate + rAF loop': { css: '.a{animation:bob 1600ms linear infinite}@keyframes bob{0%,100%{translate:0 0}50%{translate:0 -4px}}', raf: true },
  'css transform + rAF loop': { css: '.a{animation:bob 1600ms linear infinite}@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}', raf: true },
  'waapi transform + rAF loop': { waapi: true, raf: true },
  'no animation + rAF loop': { raf: true },
  // No rAF loop, but one element moved every 16 ms from a timer (what pointermove handlers do during a drag).
  'css translate + moving one element (drag)': { css: '.a{animation:bob 1600ms linear infinite}@keyframes bob{0%,100%{translate:0 0}50%{translate:0 -4px}}', drag: true },
  'no animation + moving one element (drag)': { drag: true },
};

const page = (m, n) => `<!doctype html><meta charset="utf-8"><style>body{margin:0}.a{position:absolute;width:40px;height:40px;background:#c33;border-radius:50%}${m.css || ''}</style><body><script>
for (let i = 0; i < ${n}; i++) {
  const d = document.createElement('div'); d.className = 'a';
  d.style.left = (i * 37 % 780) + 'px'; d.style.top = (Math.floor(i * 37 / 780) * 9 % 560) + 'px'; d.style.animationDelay = (-i * 13) + 'ms';
  document.body.append(d);
  ${m.waapi ? "d.animate([{transform:'translateY(0)'},{transform:'translateY(-4px)'},{transform:'translateY(0)'}],{duration:1600,iterations:Infinity,delay:-i*13});" : ''}
}
${m.raf ? 'const f = () => requestAnimationFrame(f); f();' : ''}
${m.drag ? "const mv = document.querySelector('.a'); mv.style.animation = 'none'; let k = 0; setInterval(() => { k++; mv.style.transform = 'translate(' + (k % 200) + 'px,' + (k % 100) + 'px)'; }, 16);" : ''}
</script>`;

export async function domProbe(browser, { runs = 3, ns = [200, 2000] } = {}) {
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (!MODES[u.searchParams.get('m')]) { res.writeHead(404).end(); return; }   // e.g. /favicon.ico
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(page(MODES[u.searchParams.get('m')], Number(u.searchParams.get('n'))));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const out = { note: 'Plain 40px divs, one looping 1.6 s bob each; 2 s trace after 0.8 s; style recalcs per second, mean ms each, and total style ms per second (median of runs). "+ rAF loop" adds an empty requestAnimationFrame loop elsewhere on the page; "+ moving one element (drag)" moves one (non-animated) div from a 16 ms timer, as pointermove handlers do during a drag, with no rAF loop.', cells: {} };
  for (const n of ns) {
    for (const [name, m] of Object.entries(MODES)) {
      const per = [], ms = [], busy = [], tot = [];
      for (let i = 0; i < runs; i++) {
        const ctx = await browser.newContext({ viewport: { width: 860, height: 720 } });
        const pg = await ctx.newPage();
        const cdp = await ctx.newCDPSession(pg);
        await cdp.send('Performance.enable');
        await pg.goto(`${base}/?m=${encodeURIComponent(name)}&n=${n}`);
        await pg.waitForTimeout(800);
        const m0 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]));
        await browser.startTracing(pg, { categories: ['devtools.timeline'] });
        await pg.waitForTimeout(2000);
        const ev = JSON.parse((await browser.stopTracing()).toString()).traceEvents;
        const m1 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]));
        const ult = ev.filter((e) => e.name === 'UpdateLayoutTree' && e.dur);
        per.push(ult.length / 2);
        ms.push(ult.length ? ult.reduce((a, e) => a + e.dur, 0) / ult.length / 1000 : 0);
        // Total style time per second: the rate and the per-recalc cost trade off (a slower recalc means
        // fewer frames), so this product is the stable number.
        tot.push(ult.reduce((a, e) => a + e.dur, 0) / 2 / 1000);
        busy.push((100 * (m1.TaskDuration - m0.TaskDuration)) / (m1.Timestamp - m0.Timestamp));
        await ctx.close();
      }
      const r1 = (x) => Math.round(x * 10) / 10;
      out.cells[`${name}|${n}`] = { mode: name, n, recalcsPerSec: r1(median(per)), msEach: Math.round(median(ms) * 100) / 100, styleMsPerSec: r1(median(tot)), busyPct: r1(median(busy)), runsStyleMsPerSec: tot.map(r1), runsBusyPct: busy.map(r1) };
      console.log('domprobe', name, n, JSON.stringify(out.cells[`${name}|${n}`]));
    }
  }
  server.close();
  return out;
}
