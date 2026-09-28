// Shared helpers for the a11y lab scripts.
import { chromium } from 'playwright';
export const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
export const BASE = process.env.BASE || 'http://localhost:4173';
export async function launch() {
  return chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
}
// Map a CSS selector or XPath found by a tool back to the seeded flaw ids (data-flaw on the element or an ancestor).
export async function flawsFor(page, { css, xpath }) {
  return page.evaluate(({ css, xpath }) => {
    let el = null;
    try {
      if (xpath) el = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
      else if (css) el = document.querySelector(css);
    } catch { /* invalid selector */ }
    if (!el) return ['?'];
    if (el.nodeType !== 1) el = el.parentElement;
    const ids = new Set();
    // the element itself, its ancestors, and (for page-level rules on <html>) nothing
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      if (n.dataset && n.dataset.flaw) { n.dataset.flaw.split(/\s+/).forEach(i => ids.add(i)); break; }
    }
    if (!ids.size) ids.add(el.tagName.toLowerCase() === 'html' ? 'page' : '-');
    return [...ids];
  }, { css, xpath });
}
export const ms = (t0) => `${((performance.now() - t0) / 1000).toFixed(2)}s`;
