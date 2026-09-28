const { chromium } = require("/opt/node22/lib/node_modules/playwright");
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
  for (const rm of ["no-preference", "reduce"]) {
    const p = await b.newPage(); await p.emulateMedia({ reducedMotion: rm });
    await p.setContent(`<!doctype html><style>
      .withguard ::view-transition-group(*){} 
      @media (prefers-reduced-motion: reduce){ html.guard::view-transition-group(*), html.guard::view-transition-old(*), html.guard::view-transition-new(*){ animation:none !important } }
    </style><div id=a style="view-transition-name:box;width:50px;height:50px;background:red">x</div>`);
    for (const guard of [false, true]) {
      const r = await p.evaluate(async (guard) => {
        document.documentElement.classList.toggle("guard", guard);
        const vt = document.startViewTransition(() => { document.getElementById("a").style.width = (Math.random()*200+60)+"px"; });
        await vt.ready;
        const anims = document.getAnimations().filter(a => a.effect?.pseudoElement?.startsWith("::view-transition"));
        const out = anims.map(a => a.effect.pseudoElement + " " + Math.round(a.effect.getComputedTiming().duration) + "ms");
        await vt.finished; return out;
      }, guard);
      console.log(`prefers-reduced-motion=${rm.padEnd(13)} authorGuard=${guard}  VT animations: ${r.length} ${JSON.stringify(r)}`);
    }
    await p.close();
  }
  await b.close();
})();
