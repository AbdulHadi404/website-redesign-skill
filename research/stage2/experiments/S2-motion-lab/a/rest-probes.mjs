// Which library features keep requestAnimationFrame running when nothing moves? One tiny page per feature;
// rAF callbacks per second counted over 2 s, starting 1.5 s after the last animation finished.
//   node a/rest-probes.mjs
import { build } from 'esbuild';
import path from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import { serve, labRoot } from '../lib/server.mjs';
import { launch, median } from '../lib/browser.mjs';
const P = {
  'motion animate (finished)': `import { animate } from 'motion'; animate('#b', { x: 100 }, { duration: 0.2 });`,
  'motion animate transform string (finished)': `import { animate } from 'motion'; animate('#b', { transform: 'translateX(100px)' }, { duration: 0.2 });`,
  'motion scroll(animate scaleX)': `import { animate, scroll } from 'motion'; scroll(animate('#p', { scaleX: [0, 1] }, { ease: 'linear' }));`,
  'motion scroll(animate transform string)': `import { animate, scroll } from 'motion'; scroll(animate('#p', { transform: ['scaleX(0)', 'scaleX(1)'] }, { ease: 'linear' }));`,
  'motion scroll(callback)': `import { scroll } from 'motion'; scroll((p) => { document.querySelector('#p').style.transform = 'scaleX(' + p + ')'; });`,
  'motion inView': `import { inView, animate } from 'motion'; inView('#b', (el) => { animate(el, { opacity: 1 }); });`,
  'motion press': `import { press, animate } from 'motion'; press('#b', (el) => { animate(el, { scale: 0.97 }); return () => animate(el, { scale: 1 }); });`,
  'gsap tween (finished)': `import { gsap } from 'gsap'; gsap.to('#b', { x: 100, duration: 0.2 });`,
  'gsap + ScrollTrigger (one trigger)': `import { gsap } from 'gsap'; import { ScrollTrigger } from 'gsap/ScrollTrigger'; gsap.registerPlugin(ScrollTrigger); gsap.to('#p', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: true } });`,
  'gsap ScrollTrigger registered only': `import { gsap } from 'gsap'; import { ScrollTrigger } from 'gsap/ScrollTrigger'; gsap.registerPlugin(ScrollTrigger); gsap.to('#b', { x: 100, duration: 0.2 });`,
  'anime animate (finished)': `import { animate } from 'animejs'; animate('#b', { x: 100, duration: 200 });`,
  'anime onScroll': `import { onScroll, utils } from 'animejs'; onScroll({ target: document.body, onUpdate: (o) => utils.set('#p', { scaleX: o.progress }) });`,
  'anime waapi.animate (finished)': `import { waapi } from 'animejs'; waapi.animate('#b', { translate: '100px', duration: 200 });`,
  'react-spring useSpring (finished)': `import { createRoot } from 'react-dom/client'; import { useSpring, animated } from '@react-spring/web';
    const A = () => { const s = useSpring({ from: { x: 0 }, to: { x: 100 }, config: { duration: 200 } }); return <animated.div id="b" style={{ transform: s.x.to((x) => 'translateX(' + x + 'px)') }} />; };
    createRoot(document.getElementById('root')).render(<A />);`,
  'react-spring useScroll': `import { createRoot } from 'react-dom/client'; import { useScroll, animated } from '@react-spring/web';
    const A = () => { const { scrollYProgress } = useScroll(); return <animated.div id="p" style={{ transform: scrollYProgress.to((p) => 'scaleX(' + p + ')') }} />; };
    createRoot(document.getElementById('root')).render(<A />);`,
  'motion/react useScroll': `import { createRoot } from 'react-dom/client'; import { motion, useScroll } from 'motion/react';
    const A = () => { const { scrollYProgress } = useScroll(); return <motion.div id="p" style={{ scaleX: scrollYProgress }} />; };
    createRoot(document.getElementById('root')).render(<A />);`,
  'theatre sequence played once': `import { getProject, types } from '@theatre/core'; const sheet = getProject('p').sheet('s'); sheet.object('o', { x: types.number(0) }).onValuesChange((v) => { document.querySelector('#b').style.transform = 'translateX(' + v.x + 'px)'; }); sheet.sequence.play({ range: [0, 0.2] });`,
  'CSS transition (finished)': `const b = document.querySelector('#b'); b.style.transition = 'transform 200ms'; requestAnimationFrame(() => requestAnimationFrame(() => { b.style.transform = 'translateX(100px)'; }));`,
};
export async function restProbes(runs = 3) {
  const dir = path.join(labRoot, 'captures/rest'); await mkdir(dir, { recursive: true });
  const { base, close } = await serve(); const { browser } = await launch();
  const out = {};
  let i = 0;
  for (const [name, src] of Object.entries(P)) {
    const react = /react/.test(name);
    await build({ stdin: { contents: src, loader: 'jsx', resolveDir: labRoot }, bundle: true, format: 'esm', jsx: 'automatic', outfile: path.join(dir, `p${i}.js`), minify: true, define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'silent' });
    await writeFile(path.join(dir, `p${i}.html`), `<!doctype html><meta charset="utf-8"><style>#p{position:fixed;top:0;left:0;right:0;height:4px;background:red;transform-origin:0 50%}#b{width:50px;height:50px;background:blue}body{height:3000px;margin:0}</style>${react ? '<div id="root"></div>' : '<div id="p"></div><div id="b"></div>'}<script type="module" src="p${i}.js"></script>`);
    const vals = [];
    for (let r = 0; r < runs; r++) {
      const ctx = await browser.newContext({ viewport: { width: 800, height: 600 } });
      await ctx.addInitScript(() => { const raf = window.requestAnimationFrame.bind(window); window.__n = 0; window.requestAnimationFrame = (cb) => raf((t) => { window.__n++; cb(t); }); });
      const page = await ctx.newPage();
      await page.goto(`${base}/captures/rest/p${i}.html`);
      await page.waitForTimeout(400); await page.mouse.move(25, 25); await page.mouse.down(); await page.mouse.up(); // a press, for the press probe
      await page.evaluate(() => scrollTo(0, 500)); await page.waitForTimeout(200); await page.evaluate(() => scrollTo(0, 0));
      await page.waitForTimeout(1500);
      const n0 = await page.evaluate(() => window.__n); await page.waitForTimeout(2000); const n1 = await page.evaluate(() => window.__n);
      vals.push((n1 - n0) / 2); await ctx.close();
    }
    out[name] = median(vals); i++;
  }
  await browser.close(); await close();
  return out;
}
if (import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(await restProbes(), null, 1));
