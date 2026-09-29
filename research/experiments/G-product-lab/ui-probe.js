// ui-probe.js — runs inside a rendered page (Playwright page.evaluate or a browser console).
// Returns (1) measured style facts and (2) AI-tell / category-fit heuristics computed from
// the DOM and computed styles, so it works whatever framework produced the page.
// Usage (Playwright): const probe = fs.readFileSync('ui-probe.js','utf8');
//                     const r = await page.evaluate(probe + '\n;uiProbe()');
function uiProbe(opts = {}) {
  const VW = innerWidth, VH = innerHeight;
  const px = v => parseFloat(v) || 0;
  const round = (n, s = 1) => Math.round(n / s) * s;
  const parseRGB = c => { const m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const hsl = ({ r, g, b }) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2; if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; } return { h, s, l }; };
  const isVisible = el => { const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const firstFamily = f => (f || '').split(',')[0].replace(/["']/g, '').trim();
  const emojiRe = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{1F000}-\u{1F2FF}]/u;
  const all = [...document.body.querySelectorAll('*')].filter(isVisible);

  // ---------- text ----------
  const textEls = all.filter(el => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length));
  const T = textEls.map(el => {
    const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    const chars = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').length;
    return { el, cs, r, chars, size: round(px(cs.fontSize), 0.5), fam: firstFamily(cs.fontFamily), weight: +cs.fontWeight,
      color: cs.color, align: cs.textAlign, upper: cs.textTransform === 'uppercase', track: px(cs.letterSpacing) / px(cs.fontSize),
      mono: /mono|courier|consolas|menlo/i.test(cs.fontFamily), serif: /serif/i.test(cs.fontFamily) && !/sans/i.test(cs.fontFamily) };
  });
  const totalChars = T.reduce((a, t) => a + t.chars, 0) || 1;
  const bySize = {}; T.forEach(t => bySize[t.size] = (bySize[t.size] || 0) + t.chars);
  const sizes = Object.keys(bySize).map(Number).sort((a, b) => a - b);
  const bodySize = +Object.entries(bySize).sort((a, b) => b[1] - a[1])[0]?.[0] || 0;
  const families = {}; T.forEach(t => families[t.fam] = (families[t.fam] || 0) + t.chars);
  const weights = [...new Set(T.map(t => t.weight))].sort();
  const textColors = new Set(T.map(t => t.color));
  const centeredShare = T.filter(t => t.align === 'center').reduce((a, t) => a + t.chars, 0) / totalChars;
  const trackedCapsLabels = T.filter(t => t.upper && t.track > 0.05 && t.size <= 14).length;
  const monoShare = T.filter(t => t.mono).reduce((a, t) => a + t.chars, 0) / totalChars;
  const headings = [...document.querySelectorAll('h1,h2,h3')].filter(isVisible);
  const hSizes = { h1: [], h2: [], h3: [] }; headings.forEach(h => hSizes[h.tagName.toLowerCase()].push(px(getComputedStyle(h).fontSize)));
  const maxSize = sizes[sizes.length - 1] || 0;

  // line length (chars per line) for paragraphs
  const paras = [...document.querySelectorAll('p,li,dd')].filter(isVisible).map(p => {
    const cs = getComputedStyle(p); const lh = px(cs.lineHeight) || px(cs.fontSize) * 1.4; const lines = Math.max(1, Math.round(p.getBoundingClientRect().height / lh));
    return { cpl: p.textContent.trim().length / lines, lines };
  }).filter(p => p.lines >= 2);
  const maxCPL = paras.length ? Math.round(Math.max(...paras.map(p => p.cpl))) : null;

  // ---------- boxes ----------
  let shadows = 0, coloredShadows = 0, gradientBg = 0, gradientText = 0, blur = 0, cards = 0, charsInCards = 0, pills = 0;
  const radii = {}, spacings = {}, bgColors = new Set(), satColors = [];
  const cardEls = [];
  all.forEach(el => {
    const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    const rad = px(cs.borderTopLeftRadius); if (rad > 0 && rad < 9000) radii[round(rad)] = (radii[round(rad)] || 0) + 1;
    ['paddingTop', 'paddingLeft', 'marginTop', 'marginBottom', 'rowGap', 'columnGap'].forEach(k => { const v = px(cs[k]); if (v > 0) spacings[round(v)] = (spacings[round(v)] || 0) + 1; });
    if (cs.boxShadow && cs.boxShadow !== 'none') { const cols = (cs.boxShadow.match(/rgba?\([^)]+\)/g) || []).map(parseRGB).filter(c => c && c.a > 0.02); if (cols.length) shadows++; if (cols.some(c => hsl(c).s > 0.35 && c.a >= 0.15)) coloredShadows++; }
    if (/gradient/.test(cs.backgroundImage)) { gradientBg++; if (/text/.test(cs.webkitBackgroundClip || cs.backgroundClip) ) gradientText++; }
    if ((cs.backdropFilter && cs.backdropFilter !== 'none') || (cs.webkitBackdropFilter && cs.webkitBackdropFilter !== 'none')) blur++;
    const bg = parseRGB(cs.backgroundColor); if (bg && bg.a > 0.05) bgColors.add(cs.backgroundColor);
    [cs.color, cs.backgroundColor, cs.borderTopColor].forEach(c => { const p = parseRGB(c); if (p && p.a > 0.3) { const h = hsl(p); if (h.s > 0.45 && h.l > 0.2 && h.l < 0.8) satColors.push(Math.round(h.h)); } });
    const hasEdge = (px(cs.borderTopWidth) > 0 && px(cs.borderLeftWidth) > 0) || (cs.boxShadow && cs.boxShadow !== 'none');
    if (hasEdge && rad >= 8 && px(cs.paddingTop) >= 12 && r.width < VW * 0.9 && r.width > 120 && r.height > 60 && el.innerText && el.innerText.trim().length > 10) {
      const parentCard = cardEls.some(c => c.contains(el)); if (!parentCard) { cards++; cardEls.push(el); charsInCards += el.innerText.trim().length; }
    }
    const isBtn = el.matches('button,a,[role=button],input[type=submit]');
    if (isBtn && rad >= r.height / 2 - 1 && r.height >= 28 && r.width > r.height * 1.5) pills++;
  });
  const pageChars = (document.body.innerText || '').trim().length || 1;
  const radiusList = Object.entries(radii).sort((a, b) => b[1] - a[1]);
  const spacingVals = Object.keys(spacings).map(Number);
  const offGrid = spacingVals.filter(v => v % 4 !== 0 && v > 2).length;

  // ---------- interaction & density ----------
  const interactive = all.filter(el => el.matches('a[href],button,input,select,textarea,[role=button],[tabindex]:not([tabindex="-1"])'));
  const inFold = el => { const r = el.getBoundingClientRect(); return r.top < VH && r.bottom > 0; };
  const foldInteractive = interactive.filter(inFold);
  const small24 = interactive.filter(el => { if (getComputedStyle(el).display === 'inline' && el.closest('p,li,dd,td,span,label')) return false; const r = el.getBoundingClientRect(); return r.height < 24 || r.width < 24; }).length;
  const looksLikeButton = el => { if (!el.matches('a')) return false; const cs = getComputedStyle(el); const bg = parseRGB(cs.backgroundColor); return px(cs.paddingTop) >= 6 && ((bg && bg.a > 0.1) || px(cs.borderTopWidth) > 0 || /gradient/.test(cs.backgroundImage)); };
  const ctrlHeights = interactive.filter(el => el.matches('button,input:not([type=checkbox]):not([type=radio]),select,[role=button]') || looksLikeButton(el)).map(el => round(el.getBoundingClientRect().height));
  const rowHeights = [...document.querySelectorAll('tbody tr,[class*=Box-row],[role=row]')].filter(isVisible).map(r => round(r.getBoundingClientRect().height));
  const foldChars = T.filter(t => t.r.top < VH && t.r.bottom > 0).reduce((a, t) => a + t.chars, 0);
  const foldUnits = T.filter(t => t.r.top < VH && t.r.bottom > 0).length;
  // unlabelled charts: a row of >=5 text-less filled bars of varying height, or a conic-gradient pie, with no numbers nearby
  const unlabelledCharts = all.filter(el => { const kids = [...el.children]; if (kids.length < 5) return false; const hs = kids.map(k => k.getBoundingClientRect().height); const filled = kids.every(k => !(k.innerText || '').trim() && (parseRGB(getComputedStyle(k).backgroundColor)?.a > 0 || /gradient/.test(getComputedStyle(k).backgroundImage))); const varied = Math.max(...hs) - Math.min(...hs) > 20; const box = el.parentElement || el; return filled && varied && !/\d/.test((box.innerText || '').replace(/\s/g, '')); }).length
    + all.filter(el => /conic-gradient/.test(getComputedStyle(el).backgroundImage) && !/\d/.test((el.parentElement?.innerText || ''))).length;
  const iconOnlyButtons = all.filter(el => el.matches('button,[role=button]') && (el.innerText || '').replace(emojiRe, '').trim().length === 0).length;
  const ownText = el => [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
  const emojiUI = all.filter(el => { const t = ownText(el); if (!t || !emojiRe.test(t)) return false; const stripped = t.replace(emojiRe, '').replace(/[\uFE0F\u200D]/g, '').trim(); return stripped.length === 0 || el.matches('h1,h2,h3,h4,h5,button,a,nav *,[class*=badge],[class*=pill],[class*=icon]') || /^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}]/u.test(t); }).length;
  const fixedEls = all.filter(el => ['fixed', 'sticky'].includes(getComputedStyle(el).position)).length;
  let hoverScaleRules = 0; try { for (const ss of document.styleSheets) { let rules; try { rules = ss.cssRules; } catch (e) { continue; } for (const ru of rules) { if (ru.selectorText && /:hover/.test(ru.selectorText) && /(scale|translate)/.test(ru.style.cssText)) { try { const sel = ru.selectorText.replace(/:hover/g, ''); hoverScaleRules += document.querySelectorAll(sel).length; } catch (e) {} } } } } catch (e) {}
  const copy = (document.body.innerText || '').toLowerCase();
  const genericCopy = ['supercharge', 'seamless', 'streamline', 'unlock', 'revolutionary', 'game-changer', 'next-generation', 'cutting-edge', 'blazing', 'effortless', 'transform your', 'all-in-one', 'powerful features', 'trusted by', 'world-class', 'elevate'].filter(w => copy.includes(w));
  const fakeMetrics = (copy.match(/\b\d+(\.\d+)?\s?(x|%|k\+|m\+|\+)\s/g) || []).length;

  const indigoShare = satColors.length ? satColors.filter(h => h >= 235 && h <= 290).length / satColors.length : 0;
  const hueBuckets = {}; satColors.forEach(h => { const b = Math.round(h / 30) * 30 % 360; hueBuckets[b] = (hueBuckets[b] || 0) + 1; });

  const facts = {
    viewport: `${VW}x${VH}`,
    fontFamilies: Object.fromEntries(Object.entries(families).map(([k, v]) => [k, +(v / totalChars).toFixed(2)])),
    distinctFontSizes: sizes.length, fontSizes: sizes, bodySize, maxSize, displayToBodyRatio: bodySize ? +(maxSize / bodySize).toFixed(1) : null,
    h1: hSizes.h1, h2: [...new Set(hSizes.h2)], h3: [...new Set(hSizes.h3)], weights,
    distinctTextColors: textColors.size, distinctBgColors: bgColors.size, saturatedHueBuckets: hueBuckets,
    distinctRadii: radiusList.length, topRadii: radiusList.slice(0, 4).map(([r, n]) => `${r}px×${n}`),
    distinctSpacings: spacingVals.length, offFourPxGrid: offGrid, spacingValues: spacingVals.sort((a, b) => a - b),
    shadows, coloredShadows, gradientBackgrounds: gradientBg, gradientText, backdropBlur: blur,
    cardLikeContainers: cards, shareOfTextInCards: +(charsInCards / pageChars).toFixed(2),
    centeredTextShare: +centeredShare.toFixed(2), trackedCapsLabels, monoShare: +monoShare.toFixed(2),
    maxCharsPerLine: maxCPL, interactiveTotal: interactive.length, interactiveAboveFold: foldInteractive.length,
    textCharsAboveFold: foldChars, textUnitsAboveFold: foldUnits, unlabelledCharts, targetsUnder24px: small24, controlHeights: [...new Set(ctrlHeights)].sort((a, b) => a - b),
    tableRowHeights: [...new Set(rowHeights)].sort((a, b) => a - b), pillButtons: pills, iconOnlyButtons, emojiAsUI: emojiUI, fixedOrSticky: fixedEls, hoverMoveRules: hoverScaleRules,
    genericCopyHits: genericCopy, bigNumberClaims: fakeMetrics,
  };

  // ---------- tells (weights reflect evidence strength; see report) ----------
  const tells = [];
  const add = (id, hit, w, why) => { if (hit) tells.push({ id, w, why }); };
  add('ai-purple', indigoShare > 0.35 && satColors.length > 5, 3, `${Math.round(indigoShare * 100)}% of saturated colours sit in the indigo/violet band`);
  add('gradient-text', gradientText > 0, 3, `${gradientText} gradient-filled text elements`);
  add('gradient-everywhere', gradientBg >= 5, 2, `${gradientBg} gradient backgrounds`);
  add('coloured-glow-shadows', coloredShadows >= 2, 2, `${coloredShadows} saturated (glow) shadows`);
  add('emoji-as-ui', emojiUI >= 2, 2, `${emojiUI} emoji used in headings/nav/buttons/icons`);
  add('card-soup', cards >= 6 && charsInCards / pageChars > 0.45, 2, `${cards} card containers hold ${Math.round(charsInCards / pageChars * 100)}% of the text`);
  add('pill-everything', pills >= 4, 1, `${pills} pill-shaped buttons/links`);
  add('one-big-radius', radiusList.length && +radiusList[0][0] >= 12 && radiusList[0][1] >= 8, 1, `dominant radius ${radiusList[0]?.[0]}px on ${radiusList[0]?.[1]} boxes`);
  add('centred-everything', centeredShare > 0.45 && opts.kind !== 'app', 1, `${Math.round(centeredShare * 100)}% of text centred`);
  add('generic-copy', genericCopy.length >= 3, 2, `generic phrases: ${genericCopy.join(', ')}`);
  add('big-number-claims', fakeMetrics >= 3, 1, `${fakeMetrics} unsupported-looking "10x / 99.9% / 50K+" claims — verify each is real`);
  add('hover-lift-everywhere', hoverScaleRules >= 3, 1, `${hoverScaleRules} :hover rules that move or scale`);
  add('glass-blur', blur >= 2, 1, `${blur} backdrop-blur surfaces`);
  const hasSerifDisplay = headings.some(h => { const f = getComputedStyle(h).fontFamily; return /serif/i.test(f) && !/sans/i.test(f); });
  const pageBg = parseRGB(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255 };
  const bgH = hsl(pageBg); const cream = bgH.l > 0.88 && bgH.l < 0.985 && bgH.h >= 25 && bgH.h <= 60 && bgH.s > 0.15;
  add('tasteful-default (cream+serif)', cream && hasSerifDisplay, 3, 'warm cream page background with a serif display face — the 2025–26 "tasteful" default');
  add('mono/tracked-caps chrome', trackedCapsLabels >= 3 || (monoShare > 0.03 && monoShare < 0.3), 1, `${trackedCapsLabels} tracked-caps labels, mono share ${Math.round(monoShare * 100)}%`);
  // category-fit checks (only meaningful when the caller says what the page is)
  if (opts.kind === 'app') {
    add('marketing-type-in-app', maxSize >= 32, 2, `largest text ${maxSize}px in an app view (apps rarely need > 24–28px)`);
    add('low-density-app', bodySize >= 16 && (ctrlHeights.length && Math.min(...ctrlHeights) >= 40), 1, `body ${bodySize}px and controls ≥ ${Math.min(...ctrlHeights)}px — marketing density in a work tool`);
    add('icon-only-toolbar', iconOnlyButtons >= 3, 1, `${iconOnlyButtons} icon-only buttons — need visible labels or tooltips + shortcuts`);
  }
  if (opts.kind === 'marketing' || opts.kind === 'content') {
    add('line-too-long', maxCPL && maxCPL > 95, 1, `a paragraph runs ~${maxCPL} characters per line`);
  }
  const h2s = headings.filter(h => h.tagName === 'H2');
  const centredHeads = h2s.filter(h => getComputedStyle(h).textAlign === 'center').length;
  add('centred-section-headings', h2s.length >= 3 && centredHeads / h2s.length >= 0.8 && opts.kind !== 'app', 1, `${centredHeads}/${h2s.length} section headings centred`);
  const eyebrowed = h2s.filter(h => { const p = h.previousElementSibling; if (!p) return false; const cs = getComputedStyle(p); return px(cs.fontSize) <= 14 && (cs.textTransform === 'uppercase' || px(cs.letterSpacing) / px(cs.fontSize) > 0.05); }).length;
  add('eyebrow-above-every-heading', h2s.length >= 2 && eyebrowed / h2s.length >= 0.6, 1, `${eyebrowed}/${h2s.length} section headings have a small-caps eyebrow`);
  const h1 = document.querySelector('h1');
  const badgeBeforeH1 = h1 && [h1.previousElementSibling, h1.parentElement && h1.parentElement.previousElementSibling].some(p => { if (!p) return false; const r = p.getBoundingClientRect(); const cs = getComputedStyle(p); return r.height > 0 && r.height < 44 && px(cs.borderTopLeftRadius) >= r.height / 2 - 1 && (p.innerText || '').trim().length > 0; });
  add('badge-pill-above-hero', !!badgeBeforeH1, 1, 'a pill badge ("New", "✨ …") sits above the hero headline');
  const iconTiles = all.filter(el => { const r = el.getBoundingClientRect(); if (r.width < 32 || r.width > 72 || Math.abs(r.width - r.height) > 4) return false; const cs = getComputedStyle(el); const bg = parseRGB(cs.backgroundColor); if (!bg || bg.a < 0.1) return false; const h = hsl(bg); return px(cs.borderTopLeftRadius) >= 8 && px(cs.borderTopLeftRadius) < r.width / 2 && h.s > 0.3 && h.l > 0.8 && el.children.length <= 1 && (el.innerText || '').trim().length <= 2; }).length;
  add('tinted-icon-tiles', iconTiles >= 3, 2, `${iconTiles} icons sitting in pastel rounded squares (the feature-grid kit)`);
  add('five-star-testimonials', (copy.match(/★★★★★/g) || []).length >= 2, 1, 'star-rated testimonial cards — check every quote and name is real and attributable');
  add('most-popular-tier', /most popular/.test(copy), 0, 'three-tier pricing with a "Most popular" highlight — fine if true, a template if not');
  if (opts.kind === 'app') {
    const kpiTiles = cardEls.filter(c => /[+-]?\d+(\.\d+)?%/.test(c.innerText) && [...c.querySelectorAll('*')].some(x => px(getComputedStyle(x).fontSize) >= 24)).length;
    add('decorative-charts', unlabelledCharts > 0, 2, `${unlabelledCharts} chart(s) with no axis values or labels — a picture of data, not data`);
    add('kpi-tile-row', kpiTiles >= 3, 1, `${kpiTiles} KPI tiles with % deltas — does each number drive a decision, and is the comparison period real?`);
    add('greeting-header', /welcome back|good (morning|afternoon|evening)/.test(copy), 1, 'a greeting in the page title slot — the title should name the place and scope');
    const toasts = all.filter(el => getComputedStyle(el).position === 'fixed' && el.getBoundingClientRect().top > VH * 0.6 && /success|saved|updated/i.test(el.innerText || '')).length;
    add('success-toast', toasts > 0, 0, 'a toast for a routine success — prefer inline confirmation next to the trigger');
  }
  const score = tells.reduce((a, t) => a + t.w, 0);
  return { facts, tells, score };
}
if (typeof module !== 'undefined') module.exports = { uiProbe };
