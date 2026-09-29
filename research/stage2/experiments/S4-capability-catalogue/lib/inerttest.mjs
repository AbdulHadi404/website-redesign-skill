// F9: does Playwright's ariaSnapshot list content that assistive technology does not get?
// Compares ariaSnapshot (default and mode:'ai') with Chromium's own accessibility tree (CDP) on a page
// with an `inert` region and an aria-hidden subtree. Run: node lib/inerttest.mjs (run.mjs --only inert).
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const SKILL_ENV = path.resolve(here, '../../../../../skills/website-redesign/scripts/lib/env.mjs');

export async function inertTest() {
  const { launch } = await import(pathToFileURL(SKILL_ENV).href);
  const { browser } = await launch();
  const out = {};
  try {
    const page = await browser.newPage();
    await page.setContent(`<button id="before">Before the demo</button><main inert><h1>Background heading</h1><a href="#">Background link</a></main><div aria-hidden="true"><button>Hidden button</button></div><dialog open><button>Inside dialog</button></dialog>`);
    for (const mode of ['default', 'ai']) {
      const snap = await page.locator('body').ariaSnapshot(mode === 'ai' ? { mode } : {});
      out[`ariaSnapshot_${mode}`] = { listsInert: snap.includes('Background heading'), listsAriaHidden: snap.includes('Hidden button') };
    }
    const cdp = await page.context().newCDPSession(page);
    const { nodes } = await cdp.send('Accessibility.getFullAXTree');
    out.cdp = { listsInert: nodes.some((n) => !n.ignored && n.name?.value === 'Background heading'), listsAriaHidden: nodes.some((n) => !n.ignored && n.name?.value === 'Hidden button') };
    out.playwright = (await import(pathToFileURL(path.resolve(here, '../../../../../skills/website-redesign/scripts/node_modules/playwright-core/package.json')).href, { with: { type: 'json' } })).default.version;
  } finally { await browser.close(); }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(JSON.stringify(await inertTest(), null, 1));
