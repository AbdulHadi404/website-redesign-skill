#!/usr/bin/env node
/**
 * probe-canvas.mjs — prototype check for interactive <canvas> (and WebGL) toys,
 * the gap the skill's a11y.mjs and axe do not cover (see results.json).
 *
 *   node lib/probe-canvas.mjs <url> [--reduce]
 *
 * For every visible canvas ≥ 200×200 CSS px:
 *   interactive   pointer/mouse/touch listeners on the canvas (CDP)
 *   exposure      the canvas's role and name in Chromium's accessibility tree
 *   proxies       Tab stops whose box lies over the canvas (a parallel DOM)
 *   keyboard      does Enter / Space / an arrow on the first proxy change the canvas pixels?
 *   narration     is there a live region, and did its text change after that key?
 *   motion        canvas frames that still change 100–600 ms after the change (run with --reduce)
 * Verdict: FAIL when an interactive canvas has no keyboard path; WARN when it has
 * one but no narration, or keeps animating under reduced motion.
 */
export async function probeCanvas(page, { reduce = false } = {}) {
  const cdp = await page.context().newCDPSession(page);
  const canvases = await page.$$('canvas');
  const out = [];
  for (const [ci, handle] of canvases.entries()) {
    const box = await handle.boundingBox();
    if (!box || box.width * box.height < 40000) continue;
    const { result } = await cdp.send('Runtime.evaluate', { expression: `document.querySelectorAll('canvas')[${ci}]` });
    const { listeners } = await cdp.send('DOMDebugger.getEventListeners', { objectId: result.objectId });
    const types = [...new Set(listeners.map((l) => l.type))];
    const interactive = types.some((t) => /^(pointer|mouse|touch)(down|start)$|^click$/.test(t));
    const ax = await cdp.send('Accessibility.getPartialAXTree', { objectId: result.objectId, fetchRelatives: false });
    const node = ax.nodes[0] || {};
    const exposure = { ignored: !!node.ignored, role: node.role?.value, name: node.name?.value || '' };
    const hash = () => handle.evaluate((c) => { const d = c.toDataURL(); let h = 0; for (let i = 0; i < d.length; i += 7) h = (h * 31 + d.charCodeAt(i)) | 0; return h; });
    const liveText = () => page.evaluate(() => [...document.querySelectorAll('[role=status],[role=alert],[role=log],[aria-live]')].filter((e) => e.getAttribute('aria-live') !== 'off').map((e) => e.textContent).join(' | '));
    const hasLive = await page.evaluate(() => document.querySelectorAll('[role=status],[role=alert],[role=log],[aria-live]:not([aria-live=off])').length);
    // Tab walk
    await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
    let proxies = 0, firstProxy = -1, stops = 0;
    for (let i = 0; i < 60; i++) {
      await page.keyboard.press('Tab'); stops++;
      const r = await page.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null; const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
      if (!r) break;
      const inside = r.x >= box.x && r.x <= box.x + box.width && r.y >= box.y && r.y <= box.y + box.height;
      if (inside) { proxies++; if (firstProxy < 0) firstProxy = i; }
    }
    let keyboardChangesCanvas = false, narrated = false, framesAfter = null;
    if (firstProxy >= 0) {
      await page.evaluate(() => document.activeElement?.blur());
      for (let i = 0; i <= firstProxy; i++) await page.keyboard.press('Tab');
      for (const key of ['Enter', 'Space', 'ArrowRight']) {
        const h0 = await hash(), l0 = await liveText();
        await page.keyboard.press(key);
        await page.waitForTimeout(120);
        if (await hash() !== h0) {
          keyboardChangesCanvas = true;
          await page.waitForTimeout(80);
          narrated = (await liveText()) !== l0;
          const seen = new Set();
          for (let k = 0; k < 10; k++) { seen.add(await hash()); await page.waitForTimeout(50); }
          framesAfter = seen.size;
          break;
        }
      }
    }
    const verdict = !interactive ? (exposure.ignored || exposure.name ? 'PASS' : 'WARN: static canvas without a name or aria-hidden')
      : !keyboardChangesCanvas ? 'FAIL: interactive canvas with no keyboard path (2.1.1)'
        : !narrated ? 'WARN: keyboard works but changes are not narrated (4.1.3)'
          : reduce && framesAfter > 2 ? 'WARN: still animating after a change under reduced motion (2.3.3)'
            : 'PASS';
    out.push({ index: ci, box: { w: Math.round(box.width), h: Math.round(box.height) }, listenerTypes: types, interactive, exposure, liveRegions: hasLive, tabStops: stops, proxiesReached: proxies, keyboardChangesCanvas, narrated, distinctFramesAfterChange: framesAfter, reduce, verdict });
  }
  await cdp.detach();
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.argv[2];
  const reduce = process.argv.includes('--reduce');
  const { fileURLToPath } = await import('node:url');
  const path = await import('node:path');
  const env = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../../skills/website-redesign/scripts/lib/env.mjs');
  const { launch } = await import(env);
  const { browser } = await launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: reduce ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  console.log(JSON.stringify(await probeCanvas(page, { reduce }), null, 2));
  await browser.close();
}
