// Motion for React under prefers-reduced-motion with <MotionConfig reducedMotion="user">: which values become instant,
// and does a per-animation `transition.reduceMotion: false` keep essential feedback (a press scale)?
//   node a/repro-motion-reduce.mjs
import { build } from 'esbuild';
import path from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import { serve, labRoot } from '../lib/server.mjs';
import { launch } from '../lib/browser.mjs';
const SRC = `import { createRoot } from 'react-dom/client'; import { motion, MotionConfig } from 'motion/react';
const t = { duration: 0.3 };
createRoot(document.getElementById('root')).render(<MotionConfig reducedMotion="user">
  <motion.button id="a" whileTap={{ scale: 0.8 }} transition={t}>default</motion.button>
  <motion.button id="b" whileTap={{ scale: 0.8 }} transition={{ ...t, reduceMotion: false }}>reduceMotion: false</motion.button>
  <motion.div id="c" animate={{ x: 100, opacity: 0.2 }} transition={{ duration: 0.6, delay: 0.3 }} style={{ width: 40, height: 40, background: 'red' }} />
</MotionConfig>);`;
export async function reproMotionReduce() {
  const dir = path.join(labRoot, 'captures/tmp'); await mkdir(dir, { recursive: true });
  await build({ stdin: { contents: SRC, loader: 'jsx', resolveDir: labRoot }, bundle: true, format: 'esm', jsx: 'automatic', outfile: path.join(dir, 'mr.js'), define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'silent' });
  await writeFile(path.join(dir, 'mr.html'), '<!doctype html><meta charset="utf-8"><div id="root" style="padding:40px"></div><script type="module" src="mr.js"></script>');
  const { base, close } = await serve(); const { browser } = await launch();
  const out = {};
  for (const reducedMotion of ['no-preference', 'reduce']) {
    const ctx = await browser.newContext({ reducedMotion }); const page = await ctx.newPage();
    await page.goto(`${base}/captures/tmp/mr.html`); await page.waitForTimeout(150);
    // #c: sample x and opacity during its 0.6 s animation (starts after 0.3 s)
    const c = await page.evaluate(() => new Promise((res) => { const s = []; const t0 = performance.now(); const el = document.getElementById('c');
      const tick = () => { const cs = getComputedStyle(el); s.push([new DOMMatrix(cs.transform === 'none' ? undefined : cs.transform).m41, +cs.opacity]); if (performance.now() - t0 < 1200) requestAnimationFrame(tick); else res(s); }; requestAnimationFrame(tick); }));
    const inter = (xs, lo, hi) => xs.filter((v) => v > lo && v < hi).length;
    const r = { xIntermediateFrames: inter(c.map((v) => v[0]), 1, 99), opacityIntermediateFrames: inter(c.map((v) => v[1]), 0.21, 0.99) };
    for (const id of ['a', 'b']) {
      const box = await page.locator(`#${id}`).boundingBox(); await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      const p = page.evaluate((id) => new Promise((res) => { const s = []; const t0 = performance.now(); const el = document.getElementById(id);
        const tick = () => { const m = getComputedStyle(el).transform; s.push(m === 'none' ? 1 : new DOMMatrix(m).a); if (performance.now() - t0 < 500) requestAnimationFrame(tick); else res(s); }; requestAnimationFrame(tick); }), id);
      await page.mouse.down(); const s = await p; await page.mouse.up();
      r[`press_${id}`] = { intermediateFrames: s.filter((v) => v > 0.81 && v < 0.99).length, final: +s.at(-1).toFixed(3) };
    }
    out[reducedMotion] = r; await ctx.close();
  }
  await browser.close(); await close();
  return out;
}
if (import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(await reproMotionReduce(), null, 1));
