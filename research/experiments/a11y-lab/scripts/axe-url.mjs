// axe-core on any URL: node scripts/axe-url.mjs <url> [--experimental]  → compact summary (rule, impact, SC, nodes, first target)
import { AxeBuilder } from '@axe-core/playwright';
import { launch } from './lib.mjs';
const url = process.argv[2]; const exp = process.argv.includes('--experimental');
const browser = await launch(); const page = await (await browser.newContext()).newPage(); // AxeBuilder needs a page from newContext()
await page.goto(url);
const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice', ...(exp ? ['experimental'] : [])]).analyze();
for (const v of r.violations) console.log(`${v.impact.padEnd(9)} ${v.id.padEnd(28)} ${v.tags.filter(t => /^wcag\d{3,}$/.test(t)).join(',').padEnd(10)} ${String(v.nodes.length).padStart(3)}  ${v.nodes[0].target.join(' ')}`);
console.log(`${r.violations.length} rules violated · ${r.incomplete.length} need review: ${r.incomplete.map(i => i.id).join(', ')}`);
await browser.close();
