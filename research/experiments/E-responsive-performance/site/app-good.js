// Deferred, small. The banner overlays (no layout shift). The click handler paints
// feedback first, then yields before doing the expensive part (INP-friendly).
const yieldToMain = () =>
  globalThis.scheduler?.yield ? scheduler.yield() : new Promise((r) => setTimeout(r, 0));

setTimeout(() => document.getElementById('banner')?.classList.add('in'), 900);

document.getElementById('buy').addEventListener('click', async () => {
  const c = document.getElementById('count');
  c.textContent = +c.textContent + 1;       // visible response in the next frame
  await yieldToMain();                        // let the browser paint
  const t = performance.now(); while (performance.now() - t < 350) {} // the same "work", now off the interaction
});
