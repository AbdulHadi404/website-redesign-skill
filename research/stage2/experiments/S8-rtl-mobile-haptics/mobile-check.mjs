#!/usr/bin/env node
/**
 * mobile-check.mjs — phone-width checks Chromium emulation can actually make. Experiment prototype (S8), not the skill.
 *
 *   node mobile-check.mjs <url> [--width 390 --height 844] [--insets 59,34,0,0] [--keyboard 336] [--shot shots/x.jpg]
 *
 *  safe-area  env(safe-area-inset-*) emulated through CDP Emulation.setSafeAreaInsetsOverride (top,bottom,left,right;
 *             default iPhone 15/16 portrait 59/34): controls in fixed or sticky bars that end up under the notch/Dynamic
 *             Island or the home indicator; whether the viewport meta has viewport-fit=cover
 *  targets    controls under 24 px without the 2.5.8 spacing exception; under 44 px on a coarse pointer; small controls
 *             packed closer than 8 px; small controls hugging the screen edge
 *  hover      content revealed only by :hover (rule scan) and invisible on this touch device
 *  pressed    controls with no visible pressed state (:active forced through CDP) and no tap highlight
 *  keyboards  what keyboard each field brings (type + inputmode), and the attribute mistakes (type=number for codes,
 *             no autocomplete, font-size < 16 px so iOS zooms on focus)
 *  keyboard   with the viewport shortened by an on-screen keyboard (resizes-content model): fixed bars that cover the
 *             focused field
 *  thumb      where the primary action and the tab bar sit against a one-handed reach model, drawn over the fold
 *             capture (a heuristic: see THUMB below)
 */
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { launch } from '/home/user/website-redesign-skill/skills/website-redesign/scripts/lib/env.mjs';

// One-handed reach model (heuristic, not measured here). Screen of a 6.1" phone: 390×844 CSS px ≈ 64×139 mm → ~6.1 px/mm.
// Thumb pivot (CMC joint) just outside the lower side edge; comfortable sweep 25–65 mm, stretch to 85 mm, beyond that a
// regrip. Accuracy band: 5 mm along the edges, where touch error is largest (Hoober 2013: ~7 mm centre vs ~11 mm edges).
export const THUMB = { pxPerMm: 6.1, pivotOutsideMm: 5, pivotUpMm: 15, near: 25, natural: 65, stretch: 85, edgeMm: 5 };

function thumbZone(x, y, W, H, hand) {
  const k = THUMB.pxPerMm, px = hand === 'right' ? W + THUMB.pivotOutsideMm * k : -THUMB.pivotOutsideMm * k, py = H - THUMB.pivotUpMm * k;
  const d = Math.hypot(x - px, y - py) / k;
  return d < THUMB.near ? 'awkward (at the thumb base)' : d <= THUMB.natural ? 'natural' : d <= THUMB.stretch ? 'stretch' : 'regrip';
}

// in-page: hover-only reveals
function hoverOnly() {
  const found = [];
  const HIDE = /opacity|visibility|display|transform|max-height|clip|height/;
  const walk = (rules, media) => {
    for (const r of rules) {
      if (r.media && r.cssRules) { walk(r.cssRules, [...media, r.media.mediaText]); continue; }
      if (r.cssRules && !r.selectorText) { walk(r.cssRules, media); continue; }
      if (!r.selectorText || !/:hover/.test(r.selectorText)) continue;
      if (media.some((m) => /hover:\s*hover|pointer:\s*fine/.test(m))) continue;
      for (const part of r.selectorText.split(',')) {
        const m = part.match(/^(.*?:hover)\s*([>~+\s]\s*.+)$/); if (!m) continue; // the hovered element reveals something else
        if (![...r.style].some((p) => HIDE.test(p))) continue;
        const target = part.replace(/:hover/g, '').trim();
        let els = []; try { els = [...document.querySelectorAll(target)]; } catch { continue; }
        const hidden = els.filter((e) => { const cs = getComputedStyle(e); const b = e.getBoundingClientRect(); return b.width > 0 && (cs.opacity === '0' || cs.visibility === 'hidden'); }).length
          + els.filter((e) => getComputedStyle(e).display === 'none').length;
        if (hidden) found.push({ rule: part.trim().slice(0, 80), hiddenOnTouch: hidden, focusAlternative: [...document.styleSheets].some((s) => { try { return [...s.cssRules].some((x) => x.selectorText && x.selectorText.includes(':focus-within') && x.selectorText.includes(target.split(' ').pop())); } catch { return false; } }) });
      }
    }
  };
  for (const s of document.styleSheets) { try { walk(s.cssRules, []); } catch { /* cross-origin */ } }
  return found;
}

// in-page: controls
function controls() {
  const sel = (el) => el.id ? '#' + el.id : el.tagName.toLowerCase() + ([...el.classList].slice(0, 2).map((c) => '.' + c).join('')) + (el.getAttribute('aria-label') ? `[${el.getAttribute('aria-label').slice(0, 24)}]` : el.textContent.trim() ? `"${el.textContent.trim().slice(0, 20)}"` : '');
  const out = [];
  let k = 0;
  for (const el of document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=link], summary, label:has(input[type=radio]), label:has(input[type=checkbox])')) {
    if (el.matches('input[type=radio], input[type=checkbox]') && el.closest('label')) continue; // the label is the target
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    if (r.width < 1 || r.height < 1 || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    let fixedAnc = null; for (let p = el; p && p !== document.body; p = p.parentElement) { const pc = getComputedStyle(p); if (pc.position === 'fixed' || pc.position === 'sticky') { fixedAnc = p; break; } }
    el.dataset.mcK = String(k);
    out.push({ k: k++, sel: sel(el), tag: el.tagName.toLowerCase(), x: r.left, y: r.top + scrollY, w: r.width, h: r.height, vy: r.top, fixed: !!fixedAnc, fixedPos: fixedAnc ? getComputedStyle(fixedAnc).position : null,
      text: (el.getAttribute('aria-label') || el.textContent || el.value || '').trim().slice(0, 40), type: el.getAttribute('type'), cls: el.className?.baseVal ?? el.className,
      filled: /^(button|a)$/i.test(el.tagName) && r.width >= 100 && !/rgba\(0, 0, 0, 0\)|rgb\(2[3-5]\d, 2[3-5]\d, 2[3-5]\d\)/.test(cs.backgroundColor) && cs.backgroundImage === 'none' ? true : /gradient/.test(cs.backgroundImage) && r.width >= 100,
      tapHighlight: cs.webkitTapHighlightColor, inlineLink: cs.display === 'inline' && !!el.closest('p, li:not([class])') });
  }
  return out;
}

function inputs() {
  const labelOf = (el) => (el.labels?.[0]?.textContent || el.getAttribute('aria-label') || el.placeholder || el.name || el.id || '').trim();
  return [...document.querySelectorAll('input:not([type=hidden]):not([type=radio]):not([type=checkbox]):not([type=range]), textarea')].map((el) => ({
    field: el.id ? '#' + el.id : el.name, label: labelOf(el).replace(el.value, '').slice(0, 30), type: el.getAttribute('type') || 'text', inputmode: el.getAttribute('inputmode'),
    autocomplete: el.getAttribute('autocomplete'), enterkeyhint: el.getAttribute('enterkeyhint'), autocapitalize: el.getAttribute('autocapitalize'),
    fontSize: parseFloat(getComputedStyle(el).fontSize), name: el.name, id: el.id }));
}
const PURPOSE = [
  ['email', /e-?mail/i], ['tel', /phone|mobile|tel\b|جوال|هاتف/i], ['otp', /one-time|otp|verification code|رمز التحقق/i], ['card', /card number|cc-?number|رقم البطاقة/i],
  ['cvc', /security code|cvc|cvv|csc/i], ['postcode', /post ?code|zip|postal/i], ['url', /website|url|link/i], ['search', /search|بحث/i],
  ['amount', /amount|price|المبلغ/i], ['quantity', /quantity|qty|الكمية/i],
];
function keyboardOf(i) { if (i.inputmode) return i.inputmode; return { email: 'email', tel: 'tel', url: 'url', number: 'number (spinner; decimal pad on iOS)', search: 'search', password: 'text (secure)', date: 'date picker' }[i.type] || 'text'; }
function judgeInput(i) {
  const hay = `${i.label} ${i.name} ${i.id} ${i.autocomplete || ''}`;
  const purpose = (PURPOSE.find(([, re]) => re.test(hay)) || ['text'])[0];
  const issues = [];
  const kb = keyboardOf(i);
  if (i.type === 'number' && !['quantity', 'amount'].includes(purpose)) issues.push(['FAIL', `type=number for ${purpose}: drops leading zeros, adds spinners, silently drops Arabic digits — use type=text inputmode=numeric`]);
  const want = { email: ['email', 'email'], tel: ['tel', 'tel'], otp: ['numeric', 'one-time-code'], card: ['numeric', 'cc-number'], cvc: ['numeric', 'cc-csc'], url: ['url', 'url'], postcode: [null, 'postal-code'], search: ['search', null], amount: ['decimal', null] }[purpose];
  if (want) {
    if (want[0] && !kb.startsWith(want[0])) issues.push(['WARN', `${purpose} field brings the "${kb}" keyboard; expected ${want[0]}`]);
    if (want[1] && i.autocomplete !== want[1]) issues.push(['WARN', `autocomplete="${want[1]}" missing (autofill${purpose === 'otp' ? ', SMS code suggestion' : ''})`]);
  }
  if (i.fontSize < 16) issues.push(['WARN', `font-size ${i.fontSize}px: iOS Safari zooms the page on focus`]);
  if (purpose === 'email' && i.autocapitalize !== 'off' && i.type !== 'email') issues.push(['INFO', 'autocapitalize="off" for an address typed in a text field']);
  if (!i.enterkeyhint) issues.push(['INFO', 'no enterkeyhint (next/done/search/send labels the return key)']);
  return { field: i.field, label: i.label, purpose, keyboard: kb, issues };
}

export async function mobileCheck(browser, url, { width = 390, height = 844, insets = [59, 34, 0, 0], keyboard = 336, shot = null } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'load' });
  const cdp = await ctx.newCDPSession(page);
  const [top, bottom, left, right] = insets;
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top, topMax: top, bottom, bottomMax: bottom, left, leftMax: left, right, rightMax: right } });
  await page.waitForTimeout(150);
  const findings = []; const add = (level, check, message, examples = []) => findings.push({ level, check, message, count: examples.length || undefined, examples: examples.slice(0, 60) });
  const env = await page.evaluate(() => ({ viewportMeta: document.querySelector('meta[name=viewport]')?.content || null, hoverNone: matchMedia('(hover: none)').matches, coarse: matchMedia('(pointer: coarse)').matches }));
  if (!/viewport-fit\s*=\s*cover/.test(env.viewportMeta || '')) add('WARN', 'safe-area', 'No viewport-fit=cover: iOS keeps content out of the notch in landscape (letterboxed bars) and env() insets stay 0 — decide, and check fixed bars on a device');
  const C = await page.evaluate(controls);
  const H = height, W = width;
  // safe areas: controls in fixed/sticky bars inside the inset zones
  const under = C.filter((c) => c.fixed && ((c.vy + c.h > H - bottom + 2 && bottom) || (c.vy < top - 2 && top && c.fixedPos))).map((c) => `${c.sel} ${c.vy < top ? `top ${Math.round(top - c.vy)}px under the status bar/island` : `${Math.round(c.vy + c.h - (H - bottom))}px into the home-indicator zone`}`);
  if (under.length) add('FAIL', 'safe-area', `Controls in fixed/sticky bars inside the safe-area insets (emulated ${top}/${bottom}/${left}/${right})`, under);
  // targets
  const small = C.filter((c) => !['input', 'textarea', 'select'].includes(c.tag));
  const rects = small.map((c) => ({ ...c, cx: c.x + c.w / 2, cy: c.y + c.h / 2 }));
  const tiny = [], under44 = [], packed = [], edge = [];
  for (const c of rects) {
    const mn = Math.min(c.w, c.h);
    const others = rects.filter((o) => o !== c && o.fixed === c.fixed); // fixed bars and the page scroll apart: compare like with like
    const gaps = others.map((o) => [Math.max(o.x - (c.x + c.w), c.x - (o.x + o.w), o.y - (c.y + c.h), c.y - (o.y + o.h), 0), o]).sort((u, v) => u[0] - v[0]);
    const [gap, nearest] = gaps[0] || [Infinity, null];
    if (mn < 24) { const circleClear = others.every((o) => Math.hypot(o.cx - c.cx, o.cy - c.cy) >= 24); if (!circleClear) tiny.push(`${c.sel} ${Math.round(c.w)}×${Math.round(c.h)}`); }
    if (env.coarse && mn < 44 && !c.inlineLink) under44.push(`${c.sel} ${Math.round(c.w)}×${Math.round(c.h)}`);
    if (mn < 48 && gap < 8) packed.push(`${c.sel} (${Math.round(gap)}px from ${nearest.sel})`);
    if (mn < 44 && (c.x < THUMB.edgeMm * THUMB.pxPerMm || c.x + c.w > W - THUMB.edgeMm * THUMB.pxPerMm)) edge.push(c.sel);
  }
  if (tiny.length) add('FAIL', 'targets', 'Targets under 24 px without the spacing exception (WCAG 2.5.8)', tiny);
  if (under44.length) add('WARN', 'targets', 'Targets under 44 px on a coarse pointer (buttons, fixed-bar links)', under44);
  if (packed.length) add('WARN', 'targets', 'Small targets packed closer than 8 px (mis-taps)', packed);
  if (edge.length) add('INFO', 'targets', 'Small targets hugging the screen edge, where touch error is largest', edge);
  // hover-only
  const hov = await page.evaluate(hoverOnly);
  if (hov.length) add('FAIL', 'hover', 'Content revealed only on :hover, hidden on this touch device', hov.map((h) => `${h.rule} (${h.hiddenOnTouch} hidden${h.focusAlternative ? '; has a :focus-within twin' : ''})`));
  // pressed state
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
  const noPress = [];
  // transitions would report the pre-press colour for 150 ms (Bootstrap's .btn): read end states
  const noTransitions = await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; }' });
  for (const c of small.filter((c) => ['button', 'a'].includes(c.tag)).slice(0, 40)) {
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: `[data-mc-k="${c.k}"]` });
    if (!nodeId) continue;
    const st = () => page.evaluate((k) => { const e = document.querySelector(`[data-mc-k="${k}"]`); const s = getComputedStyle(e); return [s.backgroundColor, s.color, s.transform, s.opacity, s.boxShadow, s.filter, s.outlineStyle].join('|'); }, c.k);
    const a = await st();
    await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['active'] });
    const b = await st();
    await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] });
    if (a === b && /rgba\(0, 0, 0, 0\)|transparent/.test(c.tapHighlight)) noPress.push(c.sel);
  }
  await noTransitions.evaluate((t) => t.remove());
  if (noPress.length) add('WARN', 'pressed', 'Controls with no pressed (:active) state and the tap highlight turned off: a tap gives no feedback until the result', noPress);
  // keyboards
  const I = (await page.evaluate(inputs)).map(judgeInput);
  for (const lvl of ['FAIL', 'WARN']) {
    const ex = I.flatMap((i) => i.issues.filter(([l]) => l === lvl).map(([, m]) => `${i.field} (${i.label}): ${m}`));
    if (ex.length) add(lvl, 'keyboards', lvl === 'FAIL' ? 'Fields whose type breaks input' : 'Fields that bring the wrong keyboard or miss autofill', ex);
  }
  // keyboard open (resizes-content model): fixed bars over the focused field
  const covered = [];
  await page.setViewportSize({ width, height: height - keyboard });
  for (const i of I) {
    const r = await page.evaluate((f) => {
      const el = f.startsWith('#') ? document.querySelector(f) : document.querySelector(`[name="${f}"]`); if (!el) return null;
      el.focus(); el.scrollIntoView({ block: 'nearest' }); const b = el.getBoundingClientRect();
      const bars = [...document.querySelectorAll('body *')].filter((e) => getComputedStyle(e).position === 'fixed' && e.getBoundingClientRect().height > 0);
      const hit = bars.find((e) => { const q = e.getBoundingClientRect(); return q.top < b.bottom - 2 && q.bottom > b.top + 2 && q.left < b.right && q.right > b.left && !e.contains(el); });
      return hit ? (hit.className || hit.tagName).toString().slice(0, 30) : null;
    }, i.field);
    if (r) covered.push(`${i.field} under .${r}`);
  }
  await page.setViewportSize({ width, height });
  if (covered.length) add('WARN', 'keyboard', `With a ${keyboard}px keyboard open (resizes-content), fixed bars cover the focused field — add scroll-padding-block-end or hide the bars while typing`, covered);
  // thumb reach for the primary action and the tab bar
  await page.evaluate(() => scrollTo(0, 0));
  const C0 = await page.evaluate(controls);
  const PRIMARY = /primary|cta|btn-primary|buy|checkout/i;
  const onScreen = C0.filter((c) => c.vy >= 0 && c.vy + c.h <= H);
  const primaries = onScreen.filter((c) => PRIMARY.test(String(c.cls)) || c.type === 'submit' || c.filled);
  const tabs = onScreen.filter((c) => c.fixed && c.vy > H * 0.8 && c.tag === 'a');
  const place = (c) => { const x = c.x + c.w / 2, y = c.vy + c.h / 2; return { target: c.sel, band: y < H / 3 ? 'top third' : y < (2 * H) / 3 ? 'middle third' : 'bottom third', right: thumbZone(x, y, W, H, 'right'), left: thumbZone(x, y, W, H, 'left'), edge: x < 30 || x > W - 30 || y > H - 30 };
  };
  // the one-handed model is for portrait; landscape phones are held in two hands
  const thumb = width > height ? { model: 'not applied in landscape' , primaries: [], tabbar: [] } : { model: THUMB, primaries: primaries.map(place), tabbar: tabs.map(place) };
  const hard = thumb.primaries.filter((p) => p.right === 'regrip' && p.left === 'regrip');
  if (hard.length) add('WARN', 'thumb', 'Primary action outside one-handed reach for either thumb (regrip needed): move it to a bottom bar or in-flow after the content it acts on', hard.map((p) => `${p.target} (${p.band})`));
  if (shot) {
    await page.evaluate(({ W, H, THUMB }) => {
      const k = THUMB.pxPerMm; const svgNS = 'http://www.w3.org/2000/svg';
      const s = document.createElementNS(svgNS, 'svg'); s.setAttribute('width', W); s.setAttribute('height', H); s.id = 'thumb-overlay';
      s.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:none';
      const circle = (cx, r, fill, stroke) => { const c = document.createElementNS(svgNS, 'circle'); c.setAttribute('cx', cx); c.setAttribute('cy', H - THUMB.pivotUpMm * k); c.setAttribute('r', r * k); c.setAttribute('fill', fill); c.setAttribute('stroke', stroke); c.setAttribute('stroke-width', 2); c.setAttribute('stroke-dasharray', '6 4'); s.append(c); };
      for (const [cx, col] of [[W + THUMB.pivotOutsideMm * k, '30,120,220'], [-THUMB.pivotOutsideMm * k, '220,110,30']]) {
        circle(cx, THUMB.stretch, `rgba(${col},0.08)`, `rgba(${col},0.7)`); circle(cx, THUMB.natural, `rgba(${col},0.12)`, `rgba(${col},0.9)`); circle(cx, THUMB.near, 'rgba(255,255,255,0.35)', `rgba(${col},0.6)`);
      }
      const e = THUMB.edgeMm * k; const band = document.createElementNS(svgNS, 'path');
      band.setAttribute('d', `M0 0H${W}V${H}H0Z M${e} ${e}V${H - e}H${W - e}V${e}Z`); band.setAttribute('fill', 'rgba(200,0,0,0.10)'); band.setAttribute('fill-rule', 'evenodd'); s.append(band);
      const t = (y, txt) => { const n = document.createElementNS(svgNS, 'text'); n.setAttribute('x', 8); n.setAttribute('y', y); n.setAttribute('font-size', 11); n.setAttribute('fill', '#900'); n.setAttribute('font-family', 'sans-serif'); n.textContent = txt; s.append(n); };
      t(H / 3 - 4, '— top third: regrip for one hand —'); t(22 + e, 'red band: 5 mm edge, least accurate'); t(H - THUMB.pivotUpMm * k - THUMB.natural * k + 14, 'blue: right thumb 25–65–85 mm · orange: left');
      document.body.append(s);
    }, { W, H, THUMB });
    await mkdir(path.dirname(shot), { recursive: true });
    await page.screenshot({ path: shot, type: 'jpeg', quality: 70, scale: 'css' });
    await page.evaluate(() => document.getElementById('thumb-overlay')?.remove());
  }
  await ctx.close();
  const summary = { FAIL: findings.filter((f) => f.level === 'FAIL').length, WARN: findings.filter((f) => f.level === 'WARN').length, INFO: findings.filter((f) => f.level === 'INFO').length };
  return { url, width, height, insets, env, summary, thumb, inputs: I.map(({ field, purpose, keyboard }) => ({ field, purpose, keyboard })), findings };
}

export function print(r) {
  const lines = [`\nMOBILE ${r.url} @${r.width}×${r.height}: ${r.summary.FAIL} fail, ${r.summary.WARN} warn, ${r.summary.INFO} info`];
  for (const f of r.findings) { lines.push(`  ${f.level.padEnd(4)} [${f.check}] ${f.message}${f.count ? ` (${f.count})` : ''}`); for (const e of f.examples.slice(0, 12)) lines.push(`         · ${e}`); if (f.examples.length > 12) lines.push(`         … ${f.examples.length - 12} more`); }
  lines.push(`  thumb: primaries ${JSON.stringify(r.thumb.primaries)}`);
  return lines.join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2); const url = args.find((a) => /^https?:/.test(a));
  if (!url) { console.error('usage: node mobile-check.mjs <url> [--width 390 --height 844] [--insets 59,34,0,0] [--keyboard 336] [--shot shots/x.jpg]'); process.exit(2); }
  const get = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  const { browser } = await launch();
  const r = await mobileCheck(browser, url, { width: +get('--width') || 390, height: +get('--height') || 844, insets: get('--insets') ? get('--insets').split(',').map(Number) : undefined, keyboard: +get('--keyboard') || 336, shot: get('--shot') });
  await browser.close();
  console.log(print(r));
  process.exit(r.summary.FAIL ? 1 : 0);
}
