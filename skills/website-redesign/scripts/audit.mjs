#!/usr/bin/env node
/**
 * Measure a rendered page: the evidence for an audit (Phase 1) and the checks
 * for QA (Phases 6 and 8). It reports facts, not taste — the findings are
 * inputs to judgement, and a clean report is not a good design.
 *
 *   node audit.mjs --base http://localhost:3000 --paths / /pricing \
 *        [--kind marketing|app|field|commerce|content|docs|service] [--widths 1440,390]
 *        [--out ./audit] [--no-axe] [--focus 40]
 *
 * Per page and width it measures:
 *  - layout: horizontal overflow and the element causing it; phone zoom-out
 *  - type: sizes in use (by share of text), families, weights, measure
 *    (characters per line), centred/justified runs, leading, text < 12px
 *  - contrast: every text element against the ground actually painted under it
 *    (WCAG 2 ratio; text over images/gradients listed as "check by eye")
 *  - keyboard: tabs through the page, flags controls whose focus is invisible
 *    and focus hidden under sticky/fixed bars (WCAG 2.4.7 / 2.4.11)
 *  - targets: controls under 24×24 without the spacing exception (2.5.8),
 *    count under 44; pointer-cursor elements that are not controls
 *  - semantics: headings outline and skipped levels, landmarks, skip link,
 *    lang, title; axe-core violations (if axe-core is installed)
 *  - images: missing alt, no dimensions (CLS), lazy-loaded above the fold
 *    (LCP), served far larger than rendered
 *  - no-JS render: content that stays invisible without JavaScript (the
 *    reveal trap)
 *  - paint: LCP element and time, CLS, bytes by resource type, fonts loaded
 *  - signals: generic-look tells to review — gradient text, violet gradients,
 *    backdrop blur, emoji as icons, icon tiles, card and pill counts,
 *    over-used font families, cliché copy, big-number claims to verify
 *
 * Writes <out>/<slug>-<width>.json and prints a Markdown summary (also saved
 * as <out>/audit.md).
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs, asList, launch, open, settle, finishMotion, growToDocument, resolveModule, slugFor, urlFor } from './lib/env.mjs';
import { overflowCulprits } from './lib/probes.mjs';
import { pageInventory, hiddenContent } from './lib/inventory.mjs';
import { scriptsDir } from './lib/env.mjs';

const a = parseArgs();
const base = a.base || 'http://localhost:3000';
const paths = asList(a.paths, ['/']);
const widths = asList(a.widths, ['1440', '390']).map(Number);
const outDir = a.out || './audit';
const focusLimit = Number(a.focus) || 40;
// What kind of surface this is (from the framing step): marketing | app | commerce | content | docs | service.
// It changes which signals are reported: an app is judged by density and task rules, not by hero rules.
const kind = a.kind || 'marketing';
const axePath = a['no-axe'] ? null : resolveModule('axe-core/axe.min.js');
const saturatedFile = JSON.parse(await readFile(path.join(scriptsDir, 'lib/saturated-fonts.json'), 'utf8'));

await mkdir(outDir, { recursive: true });
const { browser } = await launch({ chrome: a.chrome });

const perfInit = () => {
  window.__perf = { lcp: null, cls: 0, shifts: [] };
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        const el = e.element;
        window.__perf.lcp = { time: Math.round(e.startTime), size: e.size, element: el ? el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + [...(el.classList || [])].slice(0, 2).map((c) => '.' + c).join('') : e.url || null };
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) if (!e.hadRecentInput) { window.__perf.cls += e.value; if (e.value > 0.01) window.__perf.shifts.push(Math.round(e.value * 1000) / 1000); }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch { /* unsupported */ }
};

async function focusWalk(page, limit = focusLimit) {
  {
    // Real Tab presses, so :focus-visible applies as it would for a keyboard user.
    const results = [];
    const seen = new Set();
    await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
    for (let i = 0; i < limit; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(40);
      const r = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        // Finish the element's transitions before each read: with `transition: all` (shadcn, many kits) the ring fades
        // in, and reading mid-transition before and after blur gives the same interpolated value — "no change".
        const settleEl = (e) => { for (const a of e.getAnimations?.({ subtree: true }) ?? []) { try { a.finish(); } catch { /* infinite */ } } };
        const ring = (cs) => [cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 ? cs.outlineWidth + cs.outlineColor : 'none', cs.boxShadow, cs.borderColor, cs.backgroundColor, cs.color, cs.textDecorationLine];
        // A ring drawn on ::before/::after (the stretched-link pattern) counts too: pseudo styles are folded into each property.
        const fp = (e) => { settleEl(e); const own = ring(getComputedStyle(e)); const pseudo = ['::before', '::after'].map((p) => { const c = getComputedStyle(e, p); return c.content === 'none' || c.content === 'normal' ? null : ring(c).concat(c.opacity); }); return own.map((v, i) => [v, ...pseudo.map((q) => (q ? q[i] : ''))].join('|')).concat(pseudo.map((q) => (q ? q[6] : '')).join('|')); };
        const focused = fp(el);
        const id = el.id ? `#${el.id}` : el.tagName.toLowerCase() + [...el.classList].slice(0, 2).map((c) => '.' + c).join('') + (el.textContent.trim() ? ` "${el.textContent.trim().replace(/\s+/g, ' ').slice(0, 24)}"` : el.getAttribute('aria-label') ? ` [${el.getAttribute('aria-label')}]` : ' (no name)');
        const key = el.outerHTML.slice(0, 200) + el.getBoundingClientRect().top;
        el.setAttribute('data-audit-focus', '1');
        el.blur();
        const unfocused = fp(el);
        el.focus({ preventScroll: true });
        el.removeAttribute('data-audit-focus');
        const r = el.getBoundingClientRect();
        let coveredBy = null;
        for (const o of document.querySelectorAll('body *')) {
          const cs = getComputedStyle(o);
          if ((cs.position !== 'fixed' && cs.position !== 'sticky') || o.contains(el) || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05) continue;
          const q = o.getBoundingClientRect();
          const ix = Math.max(0, Math.min(r.right, q.right) - Math.max(r.left, q.left));
          const iy = Math.max(0, Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top));
          if (r.width * r.height > 0 && ix * iy >= r.width * r.height * 0.9) {
            const top = document.elementFromPoint(Math.min(Math.max(r.left + r.width / 2, 0), innerWidth - 1), Math.min(Math.max(r.top + r.height / 2, 0), innerHeight - 1));
            if (top && o.contains(top) && !el.contains(top)) { coveredBy = o.tagName.toLowerCase() + [...o.classList].slice(0, 1).map((c) => '.' + c).join(''); break; }
          }
        }
        const names = ['outline', 'box-shadow', 'border', 'background', 'colour', 'underline', 'pseudo-element opacity'];
        const changed = names.filter((n, i) => focused[i] !== unfocused[i]);
        return { id, key, visibleChange: changed.length > 0, changed, coveredBy };
      });
      if (!r) continue;
      if (seen.has(r.key)) break; // wrapped around
      seen.add(r.key);
      results.push(r);
    }
    return results;
  }
}

const summary = [];
// One page failing must not end the run; say why it failed in the report.
const pageFailure = (e) => /Execution context was destroyed|navigat/i.test(String(e?.message))
  ? 'the page kept reloading while it was measured. Dev servers (Vite, Astro, Next) reload while they optimise dependencies, and link prefetching triggers more of it — audit a production build (`npm run build`, then the preview server), or open each page once before auditing.'
  : String(e?.message || e).split('\n')[0];
const md = (s = '') => summary.push(s);

try {
  // No-JS pass once per page, at the first width.
  for (const p of paths) {
    try {
    const url = urlFor(base, p);
    const slug = slugFor(p);
    md(`## ${p}  (${kind})`);
    md();
    {
      const ctx = await browser.newContext({ viewport: { width: widths[0], height: 900 }, javaScriptEnabled: false });
      const page = await ctx.newPage();
      await open(page, url);
      const hidden = await page.evaluate(hiddenContent).catch(() => []);
      await ctx.close();
      if (hidden.length) md(`- ✗ **Invisible without JavaScript** (${hidden.length}): ${hidden.slice(0, 6).join(', ')} — content must be finished by default; let a script hide it only to animate it in (see implementation.md, "The reveal, written safely").`);
    }
    {
      // Reduced-motion parity: anything visible normally must be visible under reduce.
      const ctx = await browser.newContext({ viewport: { width: widths[0], height: 900 }, reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      await open(page, url);
      await settle(page);
      const hidden = await page.evaluate(hiddenContent).catch(() => []);
      await ctx.close();
      if (hidden.length) md(`- ✗ **Invisible under prefers-reduced-motion: reduce** (${hidden.length}): ${hidden.slice(0, 6).join(', ')} — reduced motion must remove the movement, not the content.`);
    }

    for (const width of widths) {
      const mobile = width < 768;
      const h0 = mobile ? 844 : 900;
      const ctx = await browser.newContext({ viewport: { width, height: h0 }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
      await ctx.addInitScript(perfInit);
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(`uncaught: ${String(e.message).split('\n')[0].slice(0, 140)}`));
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().split('\n')[0].slice(0, 140)); });
      page.on('requestfailed', (r) => errors.push(`request failed: ${r.url().slice(0, 100)} (${r.failure()?.errorText})`));
      const t0 = Date.now();
      await open(page, url);
      const loadMs = Date.now() - t0;
      const lazyAttrs = await page.evaluate(() => [...document.images].map((i) => i.getAttribute('loading')));
      await page.waitForTimeout(500);
      const perf = await page.evaluate(() => {
        const res = performance.getEntriesByType('resource');
        const bytes = {};
        for (const r of res) { const k = r.initiatorType === 'link' && /\.css/.test(r.name) ? 'css' : /\.(woff2?|ttf|otf)/.test(r.name) ? 'font' : r.initiatorType; bytes[k] = (bytes[k] || 0) + (r.transferSize || r.encodedBodySize || 0); }
        const nav = performance.getEntriesByType('navigation')[0];
        return { ...window.__perf, bytes, html: nav ? nav.transferSize || nav.encodedBodySize : null, fonts: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight}${f.style === 'italic' ? 'i' : ''}`) };
      });

      await settle(page);
      const focus = await focusWalk(page);
      const layoutW = await page.evaluate(() => innerWidth);
      const overflow = await page.evaluate(overflowCulprits);
      await growToDocument(page, width);
      // Growing the viewport fires scroll-reveal observers; let those transitions finish before measuring.
      await page.waitForTimeout(250);
      await finishMotion(page);
      const inv = await page.evaluate(pageInventory, { initialViewportHeight: h0, lazyAttrs, saturated: saturatedFile.faces });

      let axe = null;
      if (axePath) {
        await page.addScriptTag({ path: axePath });
        axe = await page.evaluate(async () => {
          // Two experimental rules earn their place (tables without headers, name ≠ visible label); they report as warnings.
          const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] }, rules: { 'td-has-header': { enabled: true }, 'label-content-name-mismatch': { enabled: true } }, resultTypes: ['violations'] });
          return r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, experimental: v.tags.includes('experimental'), count: v.nodes.length, targets: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) }));
        });
      }
      await ctx.close();

      const report = { url, width, loadMs, layoutWidth: layoutW, overflow, focus, perf, inventory: inv, axe, errors };
      await writeFile(path.join(outDir, `${slug}-${width}.json`), JSON.stringify(report, null, 2));

      // ---------- summary ----------
      md(`### ${width}px`);
      md();
      const F = [], W = [], S = [];
      if (mobile && layoutW > width) F.push(`Phone layout viewport widened to ${layoutW}px by overflowing content — the page loads zoomed out.`);
      if (overflow.overflow) F.push(`Horizontal overflow by ${overflow.by}px: ${overflow.culprits.map((c) => `\`${c.selector}\` (${c.width}px wide)`).join(', ')}`);
      const fails = inv.contrast.failing;
      if (fails.length) F.push(`Contrast below WCAG AA on ${inv.contrast.failingCount} of ${inv.contrast.checked} text elements: ${fails.slice(0, 6).map((c) => `\`${c.selector}\`${c.times > 1 ? ` ×${c.times}` : ''} ${c.fg} on ${c.bg} = ${c.ratio}:1 (needs ${c.need}, ${c.px}px)`).join('; ')}`);
      if (inv.clippedCount) F.push(`Text cut off by an overflow:hidden/clip container (${inv.clippedCount}): ${inv.clippedText.slice(0, 5).map((c) => `\`${c.selector}\` in \`${c.by}\``).join(', ')} — scroll it, reflow it, or truncate deliberately with a way to see the rest.`);
      if (inv.colourOnlyCount) F.push(`Status carried by colour alone (${inv.colourOnlyCount} dots with no text or name): ${inv.colourOnly.slice(0, 4).map((c) => `\`${c.selector}\` ${c.colour}`).join(', ')} — add a word or an icon with a label (WCAG 1.4.1).`);
      if (inv.unavailableFamilies.length) F.push(`Declared font families not available — the page renders in a fallback: ${inv.unavailableFamilies.join(', ')} (font file blocked, 404, or never loaded).`);
      if (inv.contrast.unknownCount) W.push(`${inv.contrast.unknownCount} text elements sit on an image or gradient — check by eye in the render: ${inv.contrast.unknownGround.slice(0, 4).map((u) => `\`${u.selector}\` (${u.ground})`).join(', ')}`);
      const noFocus = focus.filter((f) => !f.visibleChange);
      if (noFocus.length) F.push(`No visible focus change on ${noFocus.length} of ${focus.length} tabbed controls: ${noFocus.slice(0, 6).map((f) => f.id).join(', ')}`);
      const shadowOnly = focus.filter((f) => f.changed?.length && f.changed.every((c) => c === 'box-shadow'));
      if (shadowOnly.length) W.push(`${shadowOnly.length} controls show focus with box-shadow alone — it disappears in Windows High Contrast / forced-colors mode; add \`outline: 2px solid transparent\` (or a real outline): ${shadowOnly.slice(0, 3).map((f) => f.id).join(', ')}`);
      const hiddenFocus = focus.filter((f) => f.coveredBy);
      if (hiddenFocus.length) F.push(`Focused control hidden under a fixed/sticky element: ${hiddenFocus.slice(0, 4).map((f) => `${f.id} under ${f.coveredBy}`).join(', ')}`);
      if (focus.length === 0) W.push('Tab reached no controls — check the page is keyboard-operable.');
      if (inv.targets.under24.length) F.push(`${inv.targets.under24.length} targets under 24×24px without spacing (WCAG 2.5.8): ${inv.targets.under24.slice(0, 5).map((t) => `\`${t.selector}\` ${t.w}×${t.h}${t.name ? ` "${t.name}"` : ''}`).join(', ')}`);
      if (mobile && inv.targets.under44) W.push(`${inv.targets.under44} of ${inv.targets.total} controls are under 44px in one dimension (fine for inline links; not for primary actions or nav): ${inv.targets.under44List.map((u) => `\`${u.selector}\` ${u.w}×${u.h}${u.name ? ` "${u.name}"` : ''}`).join(', ')}${inv.targets.under44 > inv.targets.under44List.length ? ', …' : ''}`);
      if (inv.fakeControlCount) F.push(`${inv.fakeControlCount} pointer-cursor elements that are not controls (no role, ${inv.fakeControls.filter((c) => !c.keyboard).length} unreachable by keyboard): ${inv.fakeControls.slice(0, 5).map((c) => `\`${c.selector}\``).join(', ')}`);
      const h1 = inv.headings.filter((h) => h.level === 1).length;
      if (h1 !== 1) F.push(`${h1} h1 elements (expect exactly one).`);
      if (inv.skippedLevels.length) W.push(`Heading levels skipped: ${inv.skippedLevels.slice(0, 4).join('; ')}`);
      const lm = inv.landmarks;
      const missing = (kind === 'app' || kind === 'field' ? ['main'] : ['main', 'nav', 'header', 'footer']).filter((k) => !lm[k]);
      if (missing.length) W.push(`Missing landmarks: ${missing.join(', ')}.`);
      if (!lm.skipLink && width === widths[0]) W.push('No skip link as the first focusable element.');
      if (!inv.lang) F.push('No lang attribute on <html>.');
      if (errors.length) F.push(`Console/page errors (${errors.length}): ${[...new Set(errors)].slice(0, 4).join(' | ')}`);
      if (inv.css.undefinedVars.length) W.push(`CSS custom properties used with no definition and no fallback: ${inv.css.undefinedVars.join(', ')} — a typo here breaks a style silently; ignore any that a script sets at runtime.`);
      const imgs = inv.images.filter((i) => i.visible);
      const noAlt = imgs.filter((i) => i.alt === null && !i.decorative);
      if (noAlt.length) F.push(`${noAlt.length} images without an alt attribute: ${noAlt.slice(0, 4).map((i) => i.src).join(', ')}`);
      const lazyTop = imgs.filter((i) => i.lazy && i.aboveFold);
      if (lazyTop.length) F.push(`Lazy-loaded image in the first viewport (delays LCP): ${lazyTop.map((i) => i.src).join(', ')}`);
      const unsized = imgs.filter((i) => !i.sized);
      if (unsized.length) W.push(`${unsized.length} images without width/height or aspect-ratio (layout shift): ${unsized.slice(0, 4).map((i) => i.src).join(', ')}`);
      const big = imgs.filter((i) => i.format !== 'svg' && i.natural[0] > i.rendered[0] * (mobile ? 2 : 1) * 1.6 && i.natural[0] > 600);
      if (big.length) W.push(`${big.length} images served much larger than rendered: ${big.slice(0, 3).map((i) => `${i.src} ${i.natural[0]}px for ${i.rendered[0]}px`).join(', ')}`);
      const t = inv.type;
      const sizesInUse = t.sizes.filter((s) => s.chars / Math.max(inv.totalChars, 1) >= 0.005);
      W.push(`Type sizes carrying text: ${sizesInUse.map((s) => s.px).join(' · ')} px (${t.sizes.length} distinct). Families (declared): ${t.families.map((f) => `${f.family} ${f.share}%${inv.unavailableFamilies.includes(f.family) ? ' — not loaded, a fallback rendered' : ''}`).join(', ')}. Weights: ${t.weights.map((w) => `${w.weight} ${w.share}%`).join(', ')}.`);
      if (t.measure.length) W.push(`Long measure (> 85 characters per line): ${t.measure.slice(0, 4).map((m) => `\`${m.selector}\` ~${m.charsPerLine}`).join(', ')}`);
      if (t.centred.length) W.push(`Centred text of 3+ lines: ${t.centred.slice(0, 4).map((m) => `\`${m.selector}\` (${m.lines} lines)`).join(', ')}`);
      if (t.justified.length) W.push(`Justified text: ${t.justified.map((m) => `\`${m.selector}\``).join(', ')}`);
      if (t.tightLeading.length) W.push(`Multi-line body text with line-height under 1.35: ${t.tightLeading.slice(0, 4).map((m) => `\`${m.selector}\` ${m.lineHeight}`).join(', ')}`);
      if (t.smallText.length) W.push(`Text under 12px: ${t.smallText.slice(0, 5).map((m) => `\`${m.selector}\` ${m.px}px`).join(', ')}`);
      if (t.caps.length) W.push(`Long uppercase runs (> 24 characters): ${t.caps.slice(0, 3).map((m) => `"${m.text}"`).join(', ')}`);
      const sys = inv.system;
      W.push(`System: ${sys.spacingDistinct} distinct spacing values (${sys.spacingOn4}% on a 4px grid); radii ${sys.radii.map((r) => `${r.radius}${r.radius === 'pill' ? '' : 'px'}×${r.count}`).join(', ')}; ${sys.shadowKinds} distinct shadows.`);
      if (perf.lcp) W.push(`LCP: \`${perf.lcp.element}\` at ${perf.lcp.time} ms (local, unthrottled — use Lighthouse for a real number). CLS ${perf.cls.toFixed(3)}${perf.cls > 0.1 ? ' ✗ over 0.1' : ''}.`);
      const kb = (n) => `${Math.round(n / 1024)} KB`;
      W.push(`Transfer: ${[...Object.entries(perf.bytes).filter(([, v]) => v > 0).map(([k, v]) => `${k} ${kb(v)}`), perf.html ? `html ${kb(perf.html)}` : null].filter(Boolean).join(', ') || 'n/a'}; web fonts loaded: ${perf.fonts.length ? [...new Set(perf.fonts)].join(', ') : 'none'}.`);
      if (axe) {
        const std = axe.filter((v) => !v.experimental), exp = axe.filter((v) => v.experimental);
        const serious = std.filter((v) => v.impact === 'critical' || v.impact === 'serious');
        if (std.length) (serious.length ? F : W).push(`axe-core: ${std.map((v) => `${v.id} (${v.impact}, ${v.count})`).join(', ')}`);
        if (exp.length) W.push(`axe-core experimental (review each): ${exp.map((v) => `${v.id} (${v.count}: ${v.targets.join(', ')})`).join('; ')}`);
      } else if (!a['no-axe']) W.push('axe-core not installed — run `npm install` in the scripts folder for the automated WCAG rules.');
      const sg = inv.signals;
      if (sg.gradientText.length) S.push(`Gradient-filled text ×${sg.gradientText.length}: ${sg.gradientText.slice(0, 3).map((g) => `"${g.text}"`).join(', ')}`);
      if (sg.violetGradients) S.push(`Violet/indigo gradients ×${sg.violetGradients} (of ${sg.gradients} gradients).`);
      else if (sg.gradients > 3) S.push(`${sg.gradients} gradient backgrounds.`);
      if (sg.backdropBlur) S.push(`backdrop-filter (glass) ×${sg.backdropBlur}.`);
      if (sg.emoji.length) S.push(`Emoji used as icons or in headings/controls: ${sg.emoji.slice(0, 5).map((e) => `"${e.text}"`).join(', ')}`);
      if (sg.iconTiles >= 3) S.push(`${sg.iconTiles} icon tiles (small tinted rounded squares holding an icon) — the generated feature-grid signature.`);
      if (sg.cards >= 6) S.push(`${sg.cards} card containers (rounded + shadow/border) — check each holds card-shaped content.`);
      if (sg.buttonsLike >= 3 && sg.pills / sg.buttonsLike >= 0.8) S.push(`${sg.pills} of ${sg.buttonsLike} buttons/links are pills.`);
      const sat = t.families.filter((f) => f.saturated && f.share >= 10);
      if (sat.length) S.push(`Saturated face(s) (list checked ${saturatedFile.checked}): ${sat.map((f) => `${f.family} ${f.share}% [${f.saturated}]`).join(', ')} — needs a documented reason: a brand asset, or a need no other face meets.`);
      if (sg.creamGround) S.push(`Warm cream/paper ground (${sg.mainGround}) — the model's default "tasteful" ground; keep it only if the brand's own assets call for it.`);
      if (sg.eyebrows > Math.ceil(sg.sectionCount / 3)) S.push(`${sg.eyebrows} eyebrow labels over ${sg.sectionCount} sections (tracked/uppercase/numbered line above a heading), e.g. ${sg.eyebrowExamples.map((e) => `"${e}"`).join(', ')} — at most one per three sections, and only where it carries information.`);
      if (sg.accentedHeadlines.length) S.push(`Headline with one accented word/phrase (italic, colour or face switch) ×${sg.accentedHeadlines.length}: ${sg.accentedHeadlines.slice(0, 2).join('; ')}`);
      if (sg.sideStripes) S.push(`Coloured side-stripe borders ×${sg.sideStripes}: ${sg.stripeExamples.join(', ')} — the accent-stripe card.`);
      if (sg.glows) S.push(`Zero-offset coloured glow shadows ×${sg.glows}.`);
      if (sg.oneRadius) S.push(`One radius (${sg.oneRadius}px) on over 80% of rounded elements — the card-kit look.`);
      if (sg.centredShare > 60 && kind !== 'app') S.push(`${sg.centredShare}% of text blocks are centred.`);
      if (kind === 'app' || kind === 'field') {
        if (sg.maxPx >= 32) S.push(`Largest text is ${sg.maxPx}px in an app view — work tools rarely need more than 24–28px; the page title names the place and scope.`);
        if (sg.greeting) S.push('A greeting ("Welcome back, …", "Good morning, …") sits in the title slot.');
        if (sg.outerCards >= 6 && sg.cardTextShare > 45) S.push(`${sg.outerCards} card containers hold ${sg.cardTextShare}% of the text — collections belong in tables and lists; name one elevation model.`);
        if (sg.kpiTiles >= 3) S.push(`${sg.kpiTiles} KPI tiles with % deltas — does each number drive a decision, with a target and a real comparison period?`);
        if (sg.unlabelledCharts) S.push(`${sg.unlabelledCharts} chart(s) with no text, title or axis labels — a picture of data, not data.`);
        if (sg.iconOnly >= 3) S.push(`${sg.iconOnly} icon-only controls — visible labels for anything not universal; tooltip and shortcut on desktop.`);
        const minCtl = sg.controlHeights.length ? Math.min(...sg.controlHeights) : 0;
        if (kind === 'app' && sg.bodyPx >= 16 && minCtl >= 40) S.push(`Body ${sg.bodyPx}px with controls ≥ ${minCtl}px — marketing density in a desk work tool (apps: 13–14px body, 28–32px controls; a field tool used with gloves is different: --kind field).`);
        if (kind === 'field' && mobile) {
          const small = inv.targets.under48List || [];
          if (small.length) F.push(`${inv.targets.under48} controls under 48px on a field tool (gloves, glare): ${small.map((u) => `\`${u.selector}\` ${u.w}×${u.h}${u.name ? ` "${u.name}"` : ''}`).join(', ')}${inv.targets.under48 > small.length ? ', …' : ''} — 48px minimum, 56px for gloved hands.`);
          if (sg.bodyPx < 16) W.push(`Body text ${sg.bodyPx}px on a field tool — 16–18px reads at arm's length in glare.`);
        }
      } else {
        if (sg.badgeAboveH1) S.push('A pill badge sits directly above the headline ("✨ New …").');
        if (sg.hoverMoves >= 3) S.push(`${sg.hoverMoves} :hover rules that move or scale — hover should change contrast; lift only what can be picked up.`);
      }
      if (sg.headingRatio && sg.headingRatio < 2 && !mobile && kind === 'marketing') S.push(`Largest heading is only ${sg.headingRatio}× the body size (${sg.bodyPx}px) — a flat scale for a marketing page (fine for product UI).`);
      if (sg.headingInversions?.length) W.push(`Heading sizes inverted: ${sg.headingInversions.join(', ')} — the visual outline contradicts the document outline.`);
      if (sg.flatSteps.length) W.push(`Heading sizes closer than 1.2× apart: ${sg.flatSteps.join(', ')} — levels that do not read as different.`);
      const perChars = inv.totalChars / Math.max(sg.emDashes, 1);
      if (sg.emDashes >= 8 && perChars < 500) S.push(`${sg.emDashes} em dashes (one per ${Math.round(perChars)} characters) — a machine cadence in copy.`);
      if (sg.middleDots >= 2) S.push(`${sg.middleDots} "A · B · C" meta strings.`);
      if (sg.arrowCtas >= 3) S.push(`${sg.arrowCtas} links/buttons end in an arrow glyph.`);
      if (sg.aphorisms >= 2) S.push(`${sg.aphorisms} "X. No Y." aphorisms in the copy.`);
      if (inv.css.transitionAll) W.push('`transition: all` in the CSS — name the properties (transform, opacity) so layout and colour changes do not animate by accident.');
      const missingSurfaces = Object.entries(inv.css.surfaces).filter(([, v]) => !v).map(([k]) => k);
      if (missingSurfaces.length && width === widths[0]) W.push(`Browser surfaces left at defaults: ${missingSurfaces.join(', ')}${inv.css.unreadableSheets ? ` (${inv.css.unreadableSheets} cross-origin stylesheets not inspected)` : ''}.`);
      if (inv.bareEmpty.length) S.push(`Empty state written as a bare phrase: ${inv.bareEmpty.slice(0, 3).map((e) => `"${e.text}"`).join(', ')} — say why it is empty and what to do next.`);
      if (t.families.length === 1 && t.weights.length <= 2 && sizesInUse.length > 3) S.push('One family at one or two weights carries every level — on a marketing page the display level usually needs its own voice (weight, width, optical size, a second family).');
      if (sg.cliches.length) S.push(`Cliché copy: ${sg.cliches.slice(0, 10).map((c) => `"${c}"`).join(', ')}`);
      if (sg.statClaims.length) S.push(`Big-number claims — verify each is real and sourced: ${sg.statClaims.map((c) => `"${c.text}"`).join(', ')}`);
      if (F.length) { md('**Fails**'); F.forEach((x) => md(`- ✗ ${x}`)); md(); }
      if (W.length) { md('**Measurements and warnings**'); W.forEach((x) => md(`- ${x}`)); md(); }
      if (S.length) { md('**Generic-look signals** (review, not rules)'); S.forEach((x) => md(`- ◆ ${x}`)); md(); }
    }
    } catch (e) {
      for (const c of browser.contexts()) await c.close().catch(() => {});
      md(`- ✗ **Could not audit ${p}**: ${pageFailure(e)}`);
      md();
    }
  }
} finally {
  await browser.close();
}

const text = summary.join('\n');
await writeFile(path.join(outDir, 'audit.md'), `# Page audit\n\n${text}\n`);
console.log(text);
