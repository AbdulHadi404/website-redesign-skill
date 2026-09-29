// Independent evidence for labelling hover-none and no-active flags: pixels, not computed styles. For each flagged
// selector on a page, every visible match (up to 8) is screenshotted at rest (twice, 350 ms apart: a region that
// changes by itself is 'unstable' and not judged), while hovered (after 60 ms and after
// 350 ms, so a hover animation in flight shows) and while pressed; a flag is confirmed when at least one match shows
// no pixel change at all. Used only to write c/labels.json (a copy of its output is c/labels-pixel-evidence.json); motion.mjs does not use it.
//   node c/verify-hover.mjs [--set heldout]   → captures/verify-hover.json
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { serve, labRoot } from '../lib/server.mjs';
import { launch } from '../lib/browser.mjs';
import { parseArgs } from '../../../../../skills/website-redesign/scripts/lib/env.mjs';
const repo = path.resolve(labRoot, '../../../..');
const fileOf = (p) => (p.startsWith('ext/') ? path.join(labRoot, 'captures', p) : path.join(repo, p));
export async function verifyHover({ set = 'heldout' } = {}) {
  const def = JSON.parse(await readFile(path.join(labRoot, 'c/pages.json'), 'utf8'));
  const res = JSON.parse(await readFile(path.join(labRoot, 'captures/pages-results.json'), 'utf8'));
  const { base, close } = await serve(repo); const { browser } = await launch();
  const out = {};
  for (const pg of def[set]) {
    const flags = (res[set]?.pages?.[pg.name]?.flags || []).filter((f) => f.kind === 'hover-none' || f.kind === 'no-active');
    if (!flags.length) continue;
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(`${base}/${path.relative(repo, fileOf(pg.path)).split(path.sep).join('/')}`, { waitUntil: 'load' }).catch(() => {});
    await page.waitForTimeout(800);
    for (const f of flags) {
      const n = await page.evaluate((s) => { try { return [...document.querySelectorAll(s)].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2 && getComputedStyle(e).visibility !== 'hidden'; }).length; } catch { return -1; } }, f.sel);
      const matches = [];
      for (let i = 0; i < Math.min(8, Math.max(0, n)); i++) {
        const box = await page.evaluate(({ s, i }) => { const e = [...document.querySelectorAll(s)].filter((x) => { const r = x.getBoundingClientRect(); return r.width > 2 && r.height > 2 && getComputedStyle(x).visibility !== 'hidden'; })[i]; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect();
          return { x: Math.max(0, r.left - 6), y: Math.max(0, r.top - 6), width: Math.min(innerWidth - Math.max(0, r.left - 6), r.width + 12), height: Math.min(innerHeight - Math.max(0, r.top - 6), r.height + 12), cx: r.left + r.width / 2, cy: r.top + r.height / 2 }; }, { s: f.sel, i });
        await page.mouse.move(1, 1); await page.waitForTimeout(400);
        const clip = { x: box.x, y: box.y, width: box.width, height: box.height };
        if (!(clip.width > 1 && clip.height > 1)) { matches.push({ unmeasurable: true }); continue; }
        const rest = await page.screenshot({ clip }); await page.waitForTimeout(350);
        if (!rest.equals(await page.screenshot({ clip }))) { matches.push({ unstable: true }); continue; } // the region changes on its own
        await page.mouse.move(box.cx, box.cy); await page.waitForTimeout(60);
        const h1 = await page.screenshot({ clip }); await page.waitForTimeout(290);
        const h2 = await page.screenshot({ clip });
        let pressed = null;
        if (f.kind === 'no-active') { await page.mouse.down(); await page.waitForTimeout(80); pressed = await page.screenshot({ clip }); await page.mouse.move(1, 1); await page.mouse.up(); await page.keyboard.press('Escape'); }
        await page.mouse.move(1, 1);
        matches.push({ hoverChanges: !rest.equals(h1) || !rest.equals(h2), pressChanges: pressed ? !pressed.equals(h2) && !pressed.equals(h1) : null });
      }
      const M = matches.filter((m) => !m.unmeasurable && !m.unstable);
      const confirmed = !M.length ? null : f.kind === 'hover-none' ? M.some((m) => !m.hoverChanges) : M.some((m) => m.pressChanges === false);
      (out[pg.name] ??= {})[`${f.kind}|${f.sel}`] = { matches: matches.length, confirmed, detail: matches };
    }
    await page.close();
    process.stderr.write(`verify ${pg.name}\n`);
  }
  await browser.close(); await close();
  await writeFile(path.join(labRoot, 'captures/verify-hover.json'), JSON.stringify(out, null, 1));
  return out;
}
if (import.meta.url === `file://${process.argv[1]}`) { const a = parseArgs(); const r = await verifyHover({ set: a.set || 'heldout' }); for (const [p, x] of Object.entries(r)) for (const [k, v] of Object.entries(x)) console.log(p, k, v.matches, v.confirmed); }
