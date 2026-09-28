// Tailwind v4 delivery of tenant colours (added after review): does a utility generated from a
// theme variable that points at a tenant custom property pick up a tenant set BELOW <html>?
// Compiles each variant with @tailwindcss/node and reads the painted colours in Chromium.
import { compile } from '@tailwindcss/node';

const TENANTS = { root: 'rgb(26, 60, 242)', acme: 'rgb(255, 0, 0)', zen: 'rgb(0, 168, 107)' };
const BODY = `<div id="root" class="bg-accent text-accent">root</div>
<div data-tenant="acme"><div id="acme" class="bg-accent">acme</div><div id="acme50" class="bg-accent/50">acme 50%</div><p id="acmeText" class="text-accent">acme link</p></div>
<div data-tenant="zen"><div id="zen" class="bg-accent">zen</div><div id="zenSurface" class="bg-surface">zen surface</div></div>`;
const TENANT_CSS = `:root { --tenant-accent: #1a3cf2; --surface: #f6f6f7; }
[data-tenant="acme"] { --tenant-accent: #ff0000; }
[data-tenant="zen"] { --tenant-accent: #00a86b; --surface: #e6f6ee; }`;
const VARIANTS = {
  'theme (plain)': `@theme { --color-accent: var(--tenant-accent); --color-surface: var(--surface); }`,
  'theme inline': `@theme inline { --color-accent: var(--tenant-accent); --color-surface: var(--surface); }`,
};

export async function twTenantProbe(browser) {
  const page = await browser.newPage();
  const out = { tailwind: (await import('tailwindcss/package.json', { with: { type: 'json' } })).default.version, variants: {} };
  for (const [name, theme] of Object.entries(VARIANTS)) {
    const css = `@import "tailwindcss/theme.css" layer(theme);\n@import "tailwindcss/utilities.css" layer(utilities);\n${theme}\n${TENANT_CSS}`;
    const c = await compile(css, { base: process.cwd(), onDependency() {} });
    const built = c.build(['bg-accent', 'bg-accent/50', 'text-accent', 'bg-surface']);
    const rule = (built.match(/\.bg-accent \{[^}]*\}/) || [''])[0].replace(/\s+/g, ' ');
    for (const where of ['subtree', 'html']) {
      // 'html': one tenant per page, set on <html> (the case plain @theme handles)
      const html = where === 'html'
        ? `<!doctype html><html data-tenant="acme"><head><style>${built}</style></head><body><div id="acme" class="bg-accent">acme</div><div id="acme50" class="bg-accent/50">x</div><p id="acmeText" class="text-accent">x</p></body></html>`
        : `<!doctype html><html><head><style>${built}</style></head><body>${BODY}</body></html>`;
      await page.setContent(html);
      const got = await page.evaluate(() => Object.fromEntries(['root', 'acme', 'acme50', 'acmeText', 'zen', 'zenSurface'].map((id) => {
        const el = document.getElementById(id); if (!el) return [id, null];
        const cs = getComputedStyle(el); return [id, id.endsWith('Text') ? cs.color : cs.backgroundColor];
      }).filter(([, v]) => v !== null)));
      const expect = { root: TENANTS.root, acme: TENANTS.acme, acmeText: TENANTS.acme, zen: TENANTS.zen, zenSurface: 'rgb(230, 246, 238)' };
      const checks = Object.entries(expect).filter(([k]) => k in got).map(([k, v]) => ({ el: k, expect: v, got: got[k], ok: got[k] === v }));
      // 50% utility: must be the tenant colour at half alpha (any serialisation with the tenant's channels)
      if (got.acme50) checks.push({ el: 'acme50', expect: 'tenant red at 50%', got: got.acme50, ok: /^oklab\(0\.62\d* 0\.22\d* 0\.12\d* \/ 0\.5\)$|^rgba\(255, 0, 0, 0\.5\)$/.test(got.acme50) }); // sRGB red in oklab: 0.628 0.225 0.126
      out.variants[`${name} · tenant on ${where}`] = { bgAccentRule: rule, pass: checks.every((x) => x.ok), checks };
    }
  }
  await page.close();
  return out;
}
