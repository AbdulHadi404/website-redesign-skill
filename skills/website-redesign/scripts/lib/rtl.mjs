/**
 * Right-to-left and phone-width checks for audit.mjs, ported from the stage-2 S8 lab
 * (research/stage2/experiments/S8-rtl-mobile-haptics: rtl-check.mjs as served, mobile-check.mjs,
 * lib/icon-classify.mjs, lib/icon-names.json) with the fixes its review measured. The glyph-extent clipping probe,
 * which serves every script, is glyphClipProbe in probes.mjs.
 *
 * rtlChecks(page, cdp) runs only when the page is right-to-left or holds Arabic (rtlScope). FAIL = wrong for every
 * right-to-left reader; WARN = usually wrong, confirm; INFO = a decision to record.
 *   align     text-align: left on block text in RTL, where it visibly moves the text (numbers and code excluded;
 *             the first 200 candidate blocks are tried)                                                           FAIL
 *   arabic    letter-spacing ≥ 0.01em, or italic/oblique, on Arabic text                                          FAIL
 *   bidi      LTR text out of order within one line box: letters or digits reordered, or a data-like value (sign,
 *             currency, time range, phone) reordered: FAIL; only end punctuation moved: WARN. Fields for LTR data
 *             that resolve to RTL: FAIL when the value is laid out scrambled, else WARN. Order is compared line by
 *             line: wrapped English is not scrambled (the lab's first version, which sorted a whole node, raised 58
 *             false alarms in 64 out of sample; this one 6 true of 6). The first 8,000 LTR tokens are measured
 *   drawers   off-canvas panels parked off the LEFT edge in RTL (they slide in from the wrong side), unless the
 *             panel is meant for the inline end (its trigger sits on the left, or its class or id says end)       FAIL
 *   icons     names from data-icon, class, <use href> or ligature text, classified against lib/icon-names.json
 *             (Codex, Flutter, Material, Firefox): a never-mirror icon two or more sources agree on, flipped: FAIL;
 *             an arrow pointing against its label ("next", "التالي" point left in RTL): FAIL; a never-mirror name
 *             one source backs (or a media seek icon, forward_10), flipped, or a directional icon not flipped whose
 *             label cannot confirm it: WARN; names the sources disagree on: INFO; unknown names (back-to-top, an up
 *             arrow) never reported. Which way an icon points comes from the transform, rotate and scale properties
 *             of the icon and three ancestors composed; an arrow turned to point up or down is not directional
 *   css       rules with physical inline-axis values (as served, a deliberate value and a mistake look alike): INFO;
 *             @keyframes that move along x applied to RTL content: WARN
 *   fonts     glyphs drawn by a system fallback font where the element's stack names faces the page loaded
 *             (CDP CSS.getPlatformFontsForNode, sampled; the missing characters named): WARN
 *   structure dir="rtl" on body instead of html: WARN
 * phoneChecks(page, cdp, { width, height }) at phone width:
 *   hover     content (text, a control, an image with a text alternative) revealed only by :hover, hidden on a touch
 *             screen: FAIL (WARN when a click toggle opens it too). Rules inside a media query that does not match
 *             this width (a desktop menu's @media (min-width: 1024px), a sheet linked with media=) are not judged
 *   pressed   controls with no :active change and the tap highlight turned off (forcePseudoState, transitions off
 *             through a constructed stylesheet, which a CSP that refuses inline styles allows): WARN
 *   keyboards type=number for codes, phone and card numbers: FAIL; the wrong keyboard, a missing autocomplete, text
 *             under 16px (iOS zooms on focus): WARN
 *   safe-area controls in fixed or sticky bars inside emulated insets (59/34, iPhone portrait): FAIL, only when the
 *             viewport meta has viewport-fit=cover; without it the browser keeps the page inside the safe area, so
 *             one INFO, and only when the page has fixed bars
 *   keyboard  fixed bars over the focused field with a 336px keyboard: WARN, only with interactive-widget=resizes-content
 *   thumb     a primary action pinned (fixed or sticky) in the top third of a portrait phone: WARN (a regrip for either hand)
 * Each returns { findings: [{ level, check, message, examples }], ms, error?, … } for audit.mjs to print (rtlChecks
 * returns null when the block does not apply); after an error the findings made before it stand, and audit.mjs
 * prints the error as one warning line beside them.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------- in-page: does the RTL block apply?
export function rtlScope() {
  const html = document.documentElement, body = document.body;
  const dir = (e) => (e ? getComputedStyle(e).direction : null);
  const main = document.querySelector('main, [role=main]');
  const text = body ? body.innerText || '' : '';
  const arabic = (text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g) || []).length;
  return { rtl: dir(html) === 'rtl' || dir(body) === 'rtl' || dir(main) === 'rtl', arabic: arabic >= 2, htmlDir: html.getAttribute('dir'), bodyDir: body ? body.getAttribute('dir') : null };
}

// ---------------------------------------------------------------- in-page: rendered checks on the RTL page
export function rtlStatic() {
  const AR = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/, HE = /[\u0590-\u05FF]/;
  const sel = (el) => {
    if (el.id) return '#' + el.id;
    const own = el.tagName.toLowerCase() + [...el.classList].slice(0, 2).map((c) => '.' + c).join('');
    const p = el.parentElement;
    if (!p || p === document.body || el.classList.length) return own;
    return `${p.id ? '#' + p.id : p.tagName.toLowerCase() + [...p.classList].slice(0, 1).map((c) => '.' + c).join('')} > ${own}`;
  };
  const memo = new Map();
  const cs = (e) => { let c = memo.get(e); if (!c) { c = getComputedStyle(e); memo.set(e, c); } return c; };
  const shownMemo = new Map();
  const shown = (el) => {
    if (shownMemo.has(el)) return shownMemo.get(el);
    let ok = !el.checkVisibility || el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
    if (ok) { const b = el.getBoundingClientRect(); ok = b.width > 2 && b.height > 2; }
    for (let e = el; ok && e && e !== document.body; e = e.parentElement) { const c = cs(e); if (c.clip === 'rect(0px, 0px, 0px, 0px)' || /inset\(50%\)/.test(c.clipPath)) ok = false; }
    shownMemo.set(el, ok);
    return ok;
  };
  const res = { align: [], alignCount: 0, tracking: [], italic: [], scrambled: [], ltrInputs: [], drawers: [] };
  const LIGATURE = /material (icons|symbols)/i;
  const range = document.createRange();
  const tokens = (t) => { const out = []; const re = /[A-Za-z0-9\u0660-\u0669]+|[^\sA-Za-z0-9\u0660-\u0669\u0600-\u06FF]/g; let m; while ((m = re.exec(t))) out.push({ t: m[0], i: m.index }); return out; };
  // the block container that lays out a text node's line: the nearest ancestor that is not a plain inline box
  const blockOf = (el) => { let b = el; while (b && b !== document.body && /^(inline|contents)$/.test(cs(b).display)) b = b.parentElement; return b; };
  const alignSeen = new Set(), typeSeen = new Set();
  let alignTried = 0, tokenBudget = 8000;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n.data;
    if (!t.trim()) continue;
    const el = n.parentElement;
    if (!el || el.closest('script, style, noscript, template, svg, textarea, select, option') || !shown(el)) continue;
    const c = cs(el);
    // an icon font's ligature ("forward_10" drawn as one glyph by Material Symbols) is an icon, not text
    if (LIGATURE.test(c.fontFamily) || /material-(icons|symbols)/i.test(String(el.className))) continue;
    // (b) text-align: left in RTL, judged on the block container that lays the line out, only where it shows: the
    // text moves when the block is set to right. Blocks with no right-to-left letters (an English island that wants
    // dir="ltr"), numbers and code are not this check's business.
    const block = blockOf(el);
    if (block && block !== document.body && !alignSeen.has(block)) {
      alignSeen.add(block);
      const bc = cs(block);
      const candidate = bc.direction === 'rtl' && /^(left|-webkit-left)$/.test(bc.textAlign) && !block.closest('pre, code, kbd, samp') && (AR.test(block.textContent) || HE.test(block.textContent));
      // each trial costs two layouts: a page aligned left throughout is judged on its first 200 blocks
      if (candidate && alignTried++ >= 200) res.alignCapped = true;
      else if (candidate) {
        range.selectNodeContents(n);
        const before = [...range.getClientRects()].map((q) => q.left);
        const was = block.style.getPropertyValue('text-align'), prio = block.style.getPropertyPriority('text-align');
        block.style.setProperty('text-align', 'right', 'important');
        const after = [...range.getClientRects()].map((q) => q.left);
        if (was) block.style.setProperty('text-align', was, prio); else block.style.removeProperty('text-align');
        if (after.some((x, i) => before[i] !== undefined && Math.abs(x - before[i]) > 2)) { if (res.align.length < 40) res.align.push(sel(block)); res.alignCount++; }
      }
    }
    // (c) tracking and italics on Arabic
    if (AR.test(t) && !typeSeen.has(el)) {
      typeSeen.add(el);
      const ls = parseFloat(c.letterSpacing), fs = parseFloat(c.fontSize);
      if (ls && Math.abs(ls / fs) >= 0.01) res.tracking.push(`${sel(el)} (${(ls / fs).toFixed(3)}em)`);
      if (c.fontStyle !== 'normal') res.italic.push(`${sel(el)} (${c.fontStyle})`);
    }
    // (d) LTR text laid out out of order: no Arabic or Hebrew letters, laid out in an RTL block
    const holder = el.closest('p, div, td, th, li, span, label, a, button, dd, dt, h1, h2, h3, h4, h5, h6, section, article, caption, figcaption, blockquote') || el;
    if (cs(holder).direction !== 'rtl' || AR.test(t) || HE.test(t) || !/[0-9A-Za-z]/.test(t) || res.scrambled.length >= 40) continue;
    const toks = tokens(t);
    if (toks.length < 2) continue;
    // a Range per token: a page with a great deal of LTR text in RTL blocks is judged on its first 8,000 tokens
    if ((tokenBudget -= toks.length) < 0) { res.bidiCapped = true; continue; }
    const dataLike = /^(?=.*\d)\s*[+\-\u2212]?\s*[$€£¥]?[\d\s().,:%+\-\u2212/]+\s*$|\S+@\S+\.\S+|^\s*(https?:\/\/|www\.)|^\s*[A-Z]{2}\d{2}[\d\sA-Z]{8,}$|\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2}/.test(t);
    const bx = toks.map(({ t: s, i }) => { range.setStart(n, i); range.setEnd(n, i + s.length); const b = range.getBoundingClientRect(); return { x: b.left, top: b.top, bottom: b.bottom, rects: range.getClientRects().length }; });
    // Order means something only within one line box: a wrapped phrase puts later words on a lower line, further
    // LEFT in an RTL block. Tokens are grouped by line (vertical centre within half a line of the line's first
    // token) and visual and logical order compared line by line.
    const groups = [];
    const byY = toks.map((_, k) => k).filter((k) => bx[k].rects === 1).sort((a, b) => (bx[a].top + bx[a].bottom) - (bx[b].top + bx[b].bottom) || a - b);
    for (const k of byY) {
      const mid = (bx[k].top + bx[k].bottom) / 2, g = groups[groups.length - 1];
      if (g && Math.abs(mid - g.c) < Math.max(4, (bx[g.ks[0]].bottom - bx[g.ks[0]].top) / 2)) g.ks.push(k); else groups.push({ c: mid, ks: [k] });
    }
    for (const ks of groups.map((g) => g.ks.sort((a, b) => a - b))) {
      if (ks.length < 2) continue;
      const order = ks.map((k) => [bx[k].x, k]).sort((a, b) => a[0] - b[0]).map(([, k]) => k);
      if (order.every((k, j) => k === ks[j])) continue;
      const alnum = order.filter((k) => /[0-9A-Za-z]/.test(toks[k].t));
      const alnumInOrder = alnum.every((k, j) => j === 0 || k > alnum[j - 1]);
      const lineText = t.slice(toks[ks[0]].i, toks[ks[ks.length - 1]].i + toks[ks[ks.length - 1]].t.length);
      res.scrambled.push({ where: sel(el), text: (groups.length > 1 ? lineText : t.trim()).replace(/\s+/g, ' ').slice(0, 40), shown: order.map((k) => toks[k].t).join(' ').slice(0, 60), punctuationOnly: alnumInOrder && !dataLike });
      break; // one report per text node
    }
  }
  // Fields that hold LTR data (email, phone, URL, IBAN, card) and are laid out right to left. Judged by the field's
  // computed direction, not :dir(): Chromium's UA sheet keeps type=tel and type=date LTR whatever dir says.
  for (const inp of document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=range]):not([type=password]):not([type=submit]):not([type=button]):not([type=reset]):not([type=image]):not([type=file]):not([type=color]), textarea')) {
    if (!shown(inp)) continue;
    const ic = cs(inp);
    if (ic.direction !== 'rtl' || ic.unicodeBidi === 'plaintext') continue;
    const v = inp.value || '';
    const dataType = /^(email|url|tel)$/.test(inp.type) || /email|tel|url|cc-number|username|iban/i.test(inp.autocomplete || '') || /e-?mail|phone|mobile|iban|url|website/i.test(`${inp.name} ${inp.id}`);
    const ltrValue = v && !AR.test(v) && !HE.test(v) && /[0-9A-Za-z]/.test(v);
    let scrambled = false;
    if (ltrValue) {
      const p = document.createElement('div'); p.dir = 'rtl'; p.style.cssText = `position:absolute;top:-9999px;white-space:pre;font:${ic.font}`; p.textContent = v; document.body.append(p);
      const tn = p.firstChild, toks = tokens(v);
      const xs = toks.map(({ t: s, i }) => { const r = document.createRange(); r.setStart(tn, i); r.setEnd(tn, i + s.length); return r.getBoundingClientRect().left; });
      scrambled = !xs.map((x, k) => [x, k]).sort((a, b) => a[0] - b[0]).every(([, k], j) => k === j);
      p.remove();
    }
    if (scrambled || dataType) res.ltrInputs.push({ field: sel(inp), type: inp.type, value: v.slice(0, 30), scrambled });
  }
  // (e) off-canvas panels in RTL parked off the left edge: they slide in from the wrong side. Not when the panel is
  // meant for the inline end: its on-screen trigger sits in the left half (Bootstrap's dashboard: an offcanvas-end
  // opened from a button on the left), or, with no trigger found, its class or id says end.
  const W = document.documentElement.clientWidth;
  const endSide = (el) => {
    const id = el.id && CSS.escape(el.id);
    const triggers = id ? [...document.querySelectorAll(`[aria-controls~="${id}"], [data-bs-target="#${id}"], [data-target="#${id}"], a[href="#${id}"]`)].filter((t) => !el.contains(t) && shown(t)).map((t) => t.getBoundingClientRect()).filter((b) => b.right > 0 && b.left < W) : [];
    if (triggers.length) return triggers.every((b) => b.left + b.width / 2 < W / 2);
    return /(^|[-_\s])end($|[-_\s])/i.test(`${el.id} ${el.className}`);
  };
  for (const el of document.querySelectorAll('nav, aside, dialog, [role=dialog], [class*=drawer], [class*=offcanvas], [class*=off-canvas], [class*=sidebar], [class*=side-menu], [class*=sidenav]')) {
    const c = cs(el);
    if (!/fixed|absolute/.test(c.position) || c.direction !== 'rtl' || c.display === 'none') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 120 || r.height < 120) continue;
    if (r.right <= 1 && !res.drawers.some((d) => d.el.contains(el)) && !endSide(el)) res.drawers.push({ el, panel: sel(el) });
    else if (r.left >= W - 1) { /* parked off the right edge: the inline-start side in RTL */ }
  }
  res.drawers = res.drawers.map((d) => d.panel);
  return res;
}

// ---------------------------------------------------------------- in-page: icons
export function findIcons() {
  const CLS = /(^|\s)(icon|fa[srlbd]?|bi|ph|material-(icons|symbols)[\w-]*|lucide|feather|mdi|glyphicon|ti|ri)(-|\s|$)/i;
  const cls = (el) => String(el.className?.baseVal ?? el.className ?? '');
  const nameOf = (el) => {
    const bits = [el.getAttribute('data-icon'), el.getAttribute('data-lucide'), el.getAttribute('data-feather'), el.getAttribute('name'), cls(el)];
    const use = el.querySelector && el.querySelector('use'); if (use) bits.push(use.getAttribute('href') || use.getAttribute('xlink:href'));
    if (el.tagName === 'IMG') bits.push(el.getAttribute('src'), el.getAttribute('alt'));
    if (/material/i.test(cls(el))) bits.push(el.textContent);
    return bits.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  };
  const ctxOf = (el) => { const c = el.closest('a, button, [role=button], [role=link], [role=tab], [role=menuitem]'); if (!c) return ''; return (c.getAttribute('aria-label') || c.getAttribute('title') || c.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40) + (c.getAttribute('rel') ? ` rel=${c.getAttribute('rel')}` : ''); };
  // Which way the icon's x axis ends up: the transforms of the icon and up to three ancestors composed, each from its
  // individual rotate and scale properties (Tailwind v4's rtl:rotate-180 and -scale-x-100 compile to these) and its
  // transform. flipped: x now points left (a mirror, or a half turn); vertical: an arrow turned to point up or down.
  const DEG = { deg: 1, rad: 180 / Math.PI, turn: 360, grad: 0.9 };
  const matrixOf = (c) => {
    let m = new DOMMatrix();
    try {
      if (c.rotate && c.rotate !== 'none') {
        const t = c.rotate.trim().split(/\s+/), a = t.pop().match(/^(-?[\d.e+-]+)(deg|rad|turn|grad)?$/);
        const axis = t.length === 3 ? t.map(Number) : { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }[t[0]] || [0, 0, 1];
        if (a) m = m.rotateAxisAngle(...axis, parseFloat(a[1]) * DEG[a[2] || 'deg']);
      }
      if (c.scale && c.scale !== 'none') {
        const v = c.scale.trim().split(/\s+/).map((x) => (x.endsWith('%') ? parseFloat(x) / 100 : parseFloat(x)));
        m = m.scale(v[0], v[1] ?? v[0], v[2] ?? 1);
      }
      if (c.transform && c.transform !== 'none') m = m.multiply(new DOMMatrix(c.transform));
    } catch { /* a value DOMMatrix cannot read: taken as no transform */ }
    return m;
  };
  const turnOf = (el) => {
    let m = new DOMMatrix();
    for (let p = el, k = 0; p && k < 4; p = p.parentElement, k++) m = matrixOf(getComputedStyle(p)).multiply(m);
    const len = Math.hypot(m.m11, m.m12, m.m13) || 1;
    return { flipped: m.m11 / len < -0.5, vertical: Math.abs(m.m11 / len) < 0.5 };
  };
  const out = [], seen = new Set();
  for (const el of document.querySelectorAll('svg, i, span, img, [data-icon]')) {
    if (seen.has(el) || (el.tagName.toLowerCase() === 'svg' && el.parentElement?.closest('svg'))) continue;
    const r = el.getBoundingClientRect(); if (r.width < 6 || r.height < 6 || r.width > 64 || r.height > 64) continue;
    const isIcon = el.tagName.toLowerCase() === 'svg' || el.hasAttribute('data-icon') || CLS.test(cls(el)) || (el.tagName === 'IMG' && /icon|arrow|chevron/i.test(el.getAttribute('src') || ''));
    if (!isIcon || (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }))) continue;
    seen.add(el);
    const island = el.closest('[dir=ltr]');
    const name = nameOf(el).slice(0, 80);
    if (!name) continue;
    out.push({ name, context: ctxOf(el), ...turnOf(el), dir: getComputedStyle(el).direction, ltrIsland: !!island && island !== document.documentElement });
  }
  return out;
}

// ---------------------------------------------------------------- in-page: stylesheet scan
export function cssScan() {
  const LOGICAL = /margin-inline|padding-inline|inset-inline|border-inline|border-(start|end)-(start|end)-radius|text-align:\s*(start|end)|float:\s*inline/;
  const RTLSEL = /\[dir=?["']?rtl|:dir\(rtl\)|\.rtl\b|:lang\(ar|\[lang=?["']?ar|html\[dir/i;
  const NUMSEL = /num|amount|price|money|currency|qty|quantity|total|figure|digit/i;
  const res = { rules: 0, physical: 0, physicalRules: [], overrideRules: 0, logicalRules: 0, crossOrigin: 0, keyframes: [], shadowsX: 0, transformsX: 0 };
  const MOVES = /translateX\(\s*-?[1-9]|translate\(\s*-?[1-9]|translate3d\(\s*-?[1-9]/;
  const walk = (rules) => {
    for (const r of rules) {
      if (r instanceof CSSKeyframesRule) {
        const moves = [...r.cssRules].some((k) => MOVES.test(k.style.transform || '') || /^-?[1-9]/.test(k.style.translate || '') || k.style.left || k.style.right);
        if (moves && !res.keyframes.includes(r.name)) res.keyframes.push(r.name);
        continue;
      }
      if (r.cssRules && !r.selectorText) { walk(r.cssRules); continue; }
      if (!r.style || !r.selectorText) continue;
      res.rules++;
      const st = r.style, sel = r.selectorText;
      if (LOGICAL.test(r.cssText)) res.logicalRules++;
      const hits = [];
      for (const [a, b] of [['margin-left', 'margin-right'], ['padding-left', 'padding-right'], ['border-left-width', 'border-right-width']]) {
        const x = st.getPropertyValue(a), y = st.getPropertyValue(b);
        if ((x || y) && x !== y) hits.push(x && y ? `${a}:${x}/${b}:${y}` : x ? `${a}:${x}` : `${b}:${y}`);
      }
      const L = st.getPropertyValue('left'), R = st.getPropertyValue('right');
      if ((L || R) && L !== R) hits.push(L && R ? `left:${L}/right:${R}` : L ? `left:${L}` : `right:${R}`);
      for (const [a, b] of [['border-top-left-radius', 'border-top-right-radius'], ['border-bottom-left-radius', 'border-bottom-right-radius']]) {
        const x = st.getPropertyValue(a), y = st.getPropertyValue(b); if ((x || y) && x !== y) hits.push(`${a}:${x || '—'}/${b}:${y || '—'}`);
      }
      // numbers align right in both directions (multilingual.md §2a): a right-aligned numeric column is deliberate
      const ta = st.getPropertyValue('text-align'); if (/^(left|right)$/.test(ta) && !(ta === 'right' && NUMSEL.test(sel))) hits.push(`text-align:${ta}`);
      const fl = st.getPropertyValue('float'); if (/^(left|right)$/.test(fl)) hits.push(`float:${fl}`);
      if (MOVES.test(st.getPropertyValue('transform'))) res.transformsX++;
      const bs = st.getPropertyValue('box-shadow'); if (bs && bs.split(/,(?![^(]*\))/).some((s) => /^(inset\s+)?-?[1-9][\d.]*px/.test(s.trim()) || /\)\s+-?[1-9][\d.]*px\s+-?[\d.]+/.test(s))) res.shadowsX++;
      if (!hits.length) continue;
      if (RTLSEL.test(sel)) { res.overrideRules++; continue; }
      res.physical++;
      if (res.physicalRules.length < 12) res.physicalRules.push(`${sel.slice(0, 60)} { ${hits.join('; ')} }`);
    }
  };
  for (const s of document.styleSheets) { try { walk(s.cssRules); } catch { res.crossOrigin++; } }
  // x-moving keyframes that animate right-to-left content (a keyframe written for LTR, applied in RTL)
  const moving = new Set(res.keyframes), applied = new Map();
  if (moving.size) {
    for (const el of document.body.querySelectorAll('*')) {
      const c = getComputedStyle(el);
      if (c.animationName === 'none' || c.direction !== 'rtl') continue;
      for (const nm of c.animationName.split(',').map((x) => x.trim())) if (moving.has(nm) && !applied.has(nm)) applied.set(nm, el.tagName.toLowerCase() + [...el.classList].slice(0, 2).map((x) => '.' + x).join(''));
    }
  }
  res.keyframesInRtl = [...applied].map(([nm, where]) => `@keyframes ${nm} (on ${where})`);
  return res;
}

// ---------------------------------------------------------------- icon names (Node side)
const STOP = new Set(['bi', 'fa', 'fas', 'far', 'fal', 'fab', 'fad', 'solid', 'regular', 'light', 'duotone', 'thin', 'sharp', 'rounded', 'round',
  'outlined', 'outline', 'filled', 'fill', 'stroke', 'icon', 'icons', 'i', 'mdi', 'lucide', 'ti', 'ri', 'ph', 'bold', 'alt', 'o', 'sm', 'md', 'lg', 'xl',
  'ios', 'new', 'material', 'symbols', 'svg', 'feather', 'glyphicon', 'cdx', 'dir', 'btn', 'size', 'sprite', 'svg-inline']);
const SYN = { person: 'user', people: 'users', plus: 'add', prev: 'previous', magnifier: 'search', trash: 'delete' };
// Bootstrap Icons number variants (check2, calendar3): the trailing digit is not part of the name
const tokensOf = (w) => String(w).replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase().split(/[^a-z0-9]+/).map((t) => (/^[a-z]{3,}\d$/.test(t) ? t.slice(0, -1) : t)).filter((t) => t && !STOP.has(t) && !/^\d+$/.test(t));
const keyOf = (w) => [...new Set(tokensOf(w).map((t) => SYN[t] || t))].sort().join('-');
const namesFile = fileURLToPath(new URL('./icon-names.json', import.meta.url));
let LISTS = null;
const lists = () => (LISTS ??= existsSync(namesFile) ? JSON.parse(readFileSync(namesFile, 'utf8')) : { mirror: {}, never: {}, ambiguous: {} });
const CORE = /(arrow|chevron|caret|angle|triangle|navigate)s?[\s_-]*(double[\s_-]*)?(left|right|back|forward|next|before|prev|previous|start|end)\b|(double|dbl)[\s_-]*(chevron|arrow|angle)|arrow[\w-]*?[-_](left|right)\b|(^|[\s_#-])(back|forward|next|prev|previous)([\s_-]|$)|\bundo\b|\bredo\b|reply|(^|[\s_-])send([\s_-]|$)|external|open[-_ ]?in[-_ ]?new|new[-_]window|launch|indent|outdent|(^|[\s_-])list([\s_-]|$)|list[-_](ul|bullet|bulleted)|align[-_](left|right|start|end)|text[-_](left|right|start|end)|first[-_]page|last[-_]page|wrap[-_]text|text[-_]flow/i;
const has = (toks, t) => (`-${toks.join('-')}-`).includes(`-${t}-`);
// A seek control: a media verb with its seconds (Material forward_10, replay_30; Carbon rewind--5). Media playback does
// not mirror, and tokensOf drops the digits, so without this forward_10 would key as Flutter's mail "forward".
const SEEK = /(^|[^a-z0-9])(forward|replay|rewind|back|skip|seek)[\s_-]*(5|10|15|30|45|60)(?![0-9])/i;
// A vertical destination does not mirror: back-to-top is an up arrow, not a back arrow. (Up and down alone are not
// enough: Tabler's arrow-back-up and arrow-forward-up are undo and redo, curved arrows that point along the line.)
const VERT = ['top', 'bottom', 'upward', 'downward', 'north', 'south'], HORIZ = ['left', 'right', 'start', 'end', 'east', 'west'];
function classifyOne(w, toks, L) {
  for (const [fam, a] of Object.entries(L.ambiguous)) if (a.tokens.some((t) => has(toks, t))) return { class: 'ambiguous', family: fam, note: a.note };
  if (SEEK.test(w)) return { class: 'never', strength: 'weak', family: 'media', sources: ['seek pattern'] };
  const vertical = VERT.some((t) => has(toks, t)) && !HORIZ.some((t) => has(toks, t));
  const src = !vertical && L.mirror[keyOf(w)];
  if (src) return { class: 'directional', strength: src.length > 1 || CORE.test(w) ? 'strong' : 'weak', sources: src };
  const nev = Object.entries(L.never).find(([, x]) => x.tokens.some((t) => has(toks, t)));
  if (nev && nev[1].sources.length > 1) return { class: 'never', strength: 'strong', family: nev[0], sources: nev[1].sources };
  if (!vertical && CORE.test(w)) return { class: 'directional', strength: 'strong', sources: ['pattern'] };
  if (nev) return { class: 'never', strength: 'weak', family: nev[0], sources: nev[1].sources };
  return { class: 'unknown' };
}
/**
 * Classify an icon name for RTL: directional (mirror; strong when two sources or an arrow/chevron/back/next/undo/
 * reply/send/external/list name, weak when one source), never (strong when two or more sources: checks, media,
 * circular time, search; weak for one: calendar, edit, keyboard, camera), ambiguous (the sources disagree), unknown.
 */
export function classifyIcon(name, context = '') {
  const L = lists();
  let best = { class: 'unknown' };
  for (const w of String(name).split(/[\s#]+/).filter(Boolean)) {
    const toks = tokensOf(w); if (!toks.length) continue;
    best = { ...classifyOne(w, toks, L), word: w };
    if (best.class !== 'unknown') break;
  }
  // Bootstrap's box-arrow(-in)-left/right are its sign-in / sign-out icons: the log-in/out disagreement
  if (best.class === 'directional' && /box-arrow-(in-)?(left|right)\b/.test(name) && !/external|new tab|نافذة/i.test(context)) best = { class: 'ambiguous', family: 'logInOut', note: L.ambiguous.logInOut?.note, word: best.word };
  return best;
}

// ---------------------------------------------------------------- in-page: fallback-font candidates (h)
function fallbackCandidates() {
  const clean = (f) => f.trim().replace(/^["']|["']$/g, '').toLowerCase();
  const loaded = new Set([...(document.fonts || [])].filter((f) => f.status === 'loaded').map((f) => clean(f.family)));
  if (!loaded.size) return { cands: [], chosen: [] };
  // Faces the page named: families in a stack, and the local() fonts behind those of its @font-face rules that loaded
  // (a face that never loaded draws nothing, so its local font drawing the text is a fallback like any other)
  const ranges = (ur) => (ur || 'U+0-10FFFF').split(',').map((r) => r.trim().replace(/^U\+/i, '').split('-').map((h) => parseInt(h.replace(/\?/g, '0'), 16))).map(([a, b]) => `${a}-${b ?? a}`).join(',');
  const faceKey = (fam, w, st, ur) => `${fam}|${String(w || 'normal').replace(/\s+/g, ' ')}|${st || 'normal'}|${ranges(ur)}`;
  const status = new Map([...(document.fonts || [])].map((f) => [faceKey(clean(f.family), f.weight, f.style, f.unicodeRange), f.status]));
  const locals = new Map();
  const walk = (rules) => {
    for (const r of rules) {
      if (r instanceof CSSFontFaceRule) {
        const fam = clean(r.style.getPropertyValue('font-family'));
        const st = status.get(faceKey(fam, r.style.getPropertyValue('font-weight'), r.style.getPropertyValue('font-style'), r.style.getPropertyValue('unicode-range')));
        if (st && st !== 'loaded') continue; // unmatched: counted as chosen, the cautious way
        for (const m of r.style.getPropertyValue('src').matchAll(/local\(\s*["']?([^"')]+)["']?\s*\)/g)) { if (!locals.has(fam)) locals.set(fam, new Set()); locals.get(fam).add(m[1].trim().toLowerCase()); }
      } else if (r.cssRules) walk(r.cssRules);
    }
  };
  for (const s of document.styleSheets) { try { walk(s.cssRules); } catch { /* cross-origin */ } }
  const RARE = /[\u066B\u066C\u066A\u060C\u061F\u0698\u06A9\u06AF\u067E\u0686\u06CC\u06A4\uFDFC\u20C1\u0671-\u06D3\u06F0-\u06F9]/;
  const SCRIPT = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF\u20C1]/;
  const out = [], perStack = new Map(), seen = new Set();
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const pool = [];
  for (let n = tw.nextNode(); n && pool.length < 400; n = tw.nextNode()) {
    const el = n.parentElement;
    if (!el || seen.has(el) || !SCRIPT.test(n.data) || el.closest('script, style, noscript, template, svg')) continue;
    seen.add(el);
    if (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
    const c = getComputedStyle(el);
    const stack = c.fontFamily.split(',').map(clean);
    if (!stack.some((f) => loaded.has(f))) continue; // no web face chosen here: the system draws it by design
    pool.push({ el, rare: RARE.test(n.data), key: `${c.fontFamily}|${c.fontWeight}|${c.fontStyle}`, stack });
  }
  // every element with a rare character (Arabic separators, Persian letters, the riyal signs), then up to three per style
  for (const p of [...pool.filter((x) => x.rare), ...pool.filter((x) => !x.rare)]) {
    if (out.length >= 30) break;
    const k = perStack.get(p.key) || 0;
    if (!p.rare && k >= 3) continue;
    perStack.set(p.key, k + 1);
    const i = out.length;
    p.el.setAttribute('data-audit-fb', String(i));
    const chosen = new Set(p.stack);
    for (const f of p.stack) for (const l of locals.get(f) || []) chosen.add(l);
    out.push({ i, sel: p.el.tagName.toLowerCase() + (p.el.id ? '#' + p.el.id : [...p.el.classList].slice(0, 2).map((x) => '.' + x).join('')), text: (p.el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40), chars: [...new Set([...p.el.textContent].filter((ch) => /\S/.test(ch)))].slice(0, 80).join(''), stack: c0(p.stack), chosen: [...chosen] });
  }
  function c0(s) { return s.slice(0, 3).join(', '); }
  // faces declared but never loaded, with their ranges: a face the family's other faces outrank (a font-weight or
  // font-style descriptor another face wins), or one no text needed
  const unloaded = [...(document.fonts || [])].filter((f) => f.status === 'unloaded').map((f) => ({ family: clean(f.family), weight: f.weight, style: f.style,
    ranges: f.unicodeRange.split(',').map((r) => r.trim().replace(/^U\+/i, '').split('-').map((h) => parseInt(h.replace(/\?/g, '0'), 16))).map(([a, b]) => [a, b ?? a]) }));
  return { cands: out, unloaded };
}

async function fallbackFonts(page, cdp) {
  const { cands, unloaded } = await page.evaluate(fallbackCandidates);
  if (!cands.length) return { hits: [] };
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
  const hits = [];
  try {
    for (const c of cands) {
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: `[data-audit-fb="${c.i}"]` });
      if (!nodeId) continue;
      const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
      const chosen = new Set(c.chosen);
      const fb = fonts.filter((f) => !f.isCustomFont && f.glyphCount > 0 && !chosen.has(f.familyName.toLowerCase()));
      if (fb.length) hits.push({ ...c, nodeId, fallback: fb.map((f) => `${f.familyName} ${f.glyphCount}`) });
    }
    // Name the characters: each distinct character of the first hits, set alone in a probe span with the same font.
    const named = new Map();
    for (const h of hits.slice(0, 4)) {
      const chars = [...h.chars];
      await page.evaluate(({ i }) => { const src = document.querySelector(`[data-audit-fb="${i}"]`); const s = document.createElement('span'); s.id = '__audit_fb_probe'; s.style.cssText = `position:absolute;left:-9999px;top:0;font:${getComputedStyle(src).font}`; src.append(s); }, h);
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#__audit_fb_probe' });
      const miss = [];
      for (const ch of chars) {
        // lay it out before asking: the platform fonts are read from layout, and a stale one answers for the last text
        await page.evaluate((t) => { const e = document.getElementById('__audit_fb_probe'); e.textContent = t; return e.getBoundingClientRect().width; }, ch);
        const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
        if (fonts.some((f) => !f.isCustomFont && !h.chosen.includes(f.familyName.toLowerCase()))) miss.push(ch);
      }
      await page.evaluate(() => document.getElementById('__audit_fb_probe')?.remove());
      named.set(h.i, miss);
    }
    for (const h of hits) { h.missing = named.get(h.i) || null; h.tested = named.has(h.i) ? [...h.chars].length : 0; }
  } finally {
    await page.evaluate(() => document.querySelectorAll('[data-audit-fb]').forEach((e) => e.removeAttribute('data-audit-fb'))).catch(() => {});
  }
  // a face declared for the missing characters that never loaded explains the fallback
  const miss = [...new Set(hits.flatMap((h) => h.missing || []))];
  const stacks = new Set(hits.flatMap((h) => h.chosen));
  const idle = (unloaded || []).filter((f) => stacks.has(f.family) && miss.some((ch) => f.ranges.some(([a, b]) => ch.codePointAt(0) >= a && ch.codePointAt(0) <= b)));
  return { hits, miss, tested: hits.reduce((n, h) => n + (h.tested || 0), 0), missed: hits.reduce((n, h) => n + (h.missing ? h.missing.length : 0), 0), idle: [...new Set(idle.map((f) => `"${f.family}" ${f.weight}${f.style !== 'normal' ? ` ${f.style}` : ''}`))] };
}

// ---------------------------------------------------------------- the RTL block (Node side)
const FWD = /\bnext\b|التالي|التالى|forward|continue|proceed|متابعة|تابع|استمر|أكمل|اكمل|المزيد|اقرأ|read more|learn more|see all|view all|عرض الكل|get started|ابدأ|rel=next|\bsave\b|حفظ|submit|إرسال|ارسال|أرسل|\bsend\b/i;
const BWD = /\bprev|السابق|\bback\b|رجوع|عودة|العودة|ارجع|الرجوع|للخلف|rel=prev/i;
const unicodeName = (ch) => `U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`;

/** The RTL block: null when the page is neither right-to-left nor holds Arabic. */
export async function rtlChecks(page, cdp) {
  const t0 = Date.now();
  const scope = await page.evaluate(rtlScope);
  if (!scope.rtl && !scope.arabic) return null;
  const findings = [];
  const add = (level, check, message, examples = []) => findings.push({ level, check, message, examples });
  try { await rtlBlock(page, cdp, scope, add); } catch (e) { return { scope, findings, error: String(e?.message || e).split('\n')[0], ms: Date.now() - t0 }; }
  return { scope, findings, ms: Date.now() - t0 };
}

// the findings made before an error stand: rtlChecks reports the error beside them
async function rtlBlock(page, cdp, scope, add) {
  const st = await page.evaluate(rtlStatic);
  if (scope.rtl && !scope.htmlDir && scope.bodyDir === 'rtl') add('WARN', 'structure', 'dir="rtl" is on <body>, not <html>: the root, the scrollbar and anything outside body stay left to right');
  if (st.align.length) add('FAIL', 'align', `text-align: left inside right-to-left text${st.alignCount > st.align.length || st.alignCapped ? ` (${st.alignCount}${st.alignCapped ? '+' : ''} blocks; the first ${st.align.length} listed)` : ''} — use text-align: start (numbers keep right in both directions)`, st.align);
  if (st.tracking.length) add('FAIL', 'arabic', 'Letter-spacing on Arabic text — it pulls the joined letters apart; set it to 0 under :lang(ar)', st.tracking);
  if (st.italic.length) add('FAIL', 'arabic', 'Italic or oblique on Arabic text — a synthesised slant, not an Arabic style; use weight or colour', st.italic);
  const scr = st.scrambled.filter((s) => !s.punctuationOnly), punct = st.scrambled.filter((s) => s.punctuationOnly);
  if (scr.length) add('FAIL', 'bidi', 'Left-to-right data shown out of order in right-to-left text — wrap it in <bdi dir="ltr"> (or <span dir="ltr">), or format it with Intl', scr.map((s) => `${s.where}: "${s.text}" reads as "${s.shown}"`));
  if (punct.length) add('WARN', 'bidi', 'Left-to-right phrases in right-to-left text without dir/lang: their end punctuation jumps to the other end — mark them lang="en" dir="ltr"', punct.map((s) => `${s.where}: "${s.text}"`));
  const bad = st.ltrInputs.filter((i) => i.scrambled), rtlData = st.ltrInputs.filter((i) => !i.scrambled);
  if (bad.length) add('FAIL', 'bidi', 'Fields whose left-to-right value is laid out out of order — dir="ltr" on the field, aligned with the form (text-align: right under :dir(rtl), or -webkit-match-parent)', bad.map((i) => `${i.field} [${i.type}] "${i.value}"`));
  if (rtlData.length) add('WARN', 'bidi', 'Email/phone/URL/IBAN fields laid out right to left: a value that starts with digits or ends in punctuation will scramble as it is typed — dir="ltr" on the field', rtlData.map((i) => `${i.field} [${i.type}]`));
  if (scope.rtl) {
    if (st.drawers.length) add('FAIL', 'drawers', 'Off-canvas panels parked off the LEFT edge on a right-to-left page: they slide in from the wrong side — inset-inline-start, and a translate that follows the direction (translateX(calc(-100% * var(--dir))))', st.drawers);
    // (f) icons, as served: flipped state from transforms, meaning from the control's label
    const icons = (await page.evaluate(findIcons)).map((ic) => ({ ...ic, ...classifyIcon(ic.name, ic.context) }))
      .filter((v) => (v.ltrIsland ? v.class === 'never' : v.dir === 'rtl')); // a player kept LTR still must not flip its icons
    const lbl = (v) => `${v.word}${v.context ? ` in "${v.context}"` : ''}${v.sources ? ` [${v.sources.join('+')}]` : ''}`;
    // which way the drawn (LTR) icon points, from its name's tokens; a flip turns it round
    const pointing = (v) => { const t = tokensOf(v.word); const side = t.some((x) => /^(right|forward|next|end|send)$/.test(x)) ? 'right' : t.some((x) => /^(left|back|prev|previous|start|before)$/.test(x)) ? 'left' : null; return side && v.flipped ? (side === 'right' ? 'left' : 'right') : side; };
    const verdict = (v) => { const p = pointing(v); if (!p) return null; if (FWD.test(v.context)) return p === 'left'; if (BWD.test(v.context)) return p === 'right'; return null; };
    // Bootstrap Icons' "list" is the hamburger: on a menu toggle it is a symmetric menu glyph, not a bulleted list
    const MENU = /menu|navigation|\bnav\b|toggle|القائمة|قائمة|التنقل/i;
    // an arrow turned to point up or down (an open disclosure's chevron) has no reading direction to follow
    const dirIcons = icons.filter((v) => v.class === 'directional' && !v.vertical && !(/^(list|bi-list)$/i.test(v.word) && MENU.test(v.context)));
    const wrongWay = dirIcons.filter((v) => verdict(v) === false);
    if (wrongWay.length) add('FAIL', 'icons', 'Arrows that point against the reading direction for their action (forward actions point left in RTL, back actions right)', wrongWay.map((v) => `${v.word} in "${v.context}"`));
    for (const [lvl, strength, what] of [['FAIL', 'strong', 'checks, media, circular time, search: every source agrees'], ['WARN', 'weak', 'one source: calendar, edit, keyboard, camera, a media seek control']]) {
      const n = icons.filter((v) => v.class === 'never' && v.strength === strength && v.flipped);
      if (n.length) add(lvl, 'icons', `Icons that must not mirror but are flipped (${what})`, n.map(lbl));
    }
    // a directional icon whose label confirms it points the right way is fine without a flip (an RTL set, or a swapped name)
    const unflipped = dirIcons.filter((v) => !v.flipped && verdict(v) === null);
    if (unflipped.length) add('WARN', 'icons', 'Directional icons with no flip in RTL — confirm each points the reading way (or was swapped for its mirror)', unflipped.map(lbl));
    const amb = icons.filter((v) => v.class === 'ambiguous');
    if (amb.length) add('INFO', 'icons', 'Icons the sources disagree on — record the decision in DESIGN.md', [...new Set(amb.map((v) => `${v.word}: ${v.flipped ? 'flipped' : 'not flipped'} — ${v.note || ''}`))]);
    // (g) the stylesheet
    const css = await page.evaluate(cssScan);
    if (css.keyframesInRtl.length) add('WARN', 'css', 'Keyframes that move along x, applied to right-to-left content: transforms never flip with dir — give them a direction variable or an RTL variant', css.keyframesInRtl);
    if (css.physical) add('INFO', 'css', `${css.physical} of ${css.rules} rules set physical inline-axis values (${css.overrideRules} RTL overrides; ${css.logicalRules} rules use logical properties; ${css.transformsX} x-translations; ${css.shadowsX} shadows with an x offset${css.crossOrigin ? `; ${css.crossOrigin} cross-origin sheets not read` : ''}) — as served, a deliberate value and a mistake look alike: check each, or run a flip capture`, css.physicalRules);
  }
  // (h) glyphs from a system fallback font
  if (cdp) {
    const fb = await fallbackFonts(page, cdp).catch(() => ({ hits: [] }));
    if (fb.hits.length) {
      // most characters falling back means the face does not serve this script at all; a few means coverage gaps
      const whole = fb.tested && fb.missed / fb.tested >= 0.5;
      const why = fb.idle?.length ? ` The face declared for them never loaded: ${fb.idle.join(', ')} — another face of the family outranks it (match its font-weight/font-style descriptors to theirs).`
        : whole ? ' The page\'s faces do not cover this script: add one that does (fonts.mjs lists a face\'s coverage).'
        : ` ${fb.miss.length ? `Missing from the page's faces: ${fb.miss.slice(0, 12).map((ch) => `${ch} ${unicodeName(ch)}`).join(', ')}${fb.miss.length > 12 ? ', …' : ''} — c` : 'C'}hoose a face that covers them (fonts.mjs lists a face's coverage; Intl's ٫ ٬ and the riyal sign U+20C1 are the usual gaps).`;
      add('WARN', 'fonts', `Glyphs drawn by a system fallback font, not the page's own faces${whole ? ' (most of the text)' : ''} — each device substitutes its own.${why}`,
        fb.hits.map((h) => `${h.sel} "${h.text}" (${h.fallback.join(', ')} glyphs; stack ${h.stack})`));
    }
  }
}

// ---------------------------------------------------------------- in-page: phone width
function hoverOnly() {
  const found = [];
  const HIDE = /opacity|visibility|display|transform|max-height|clip|height/;
  const NOHOVER = /(any-)?hover:\s*hover|(any-)?pointer:\s*fine/;
  const shownEl = (e) => !e.checkVisibility || e.checkVisibility({ checkOpacity: false, checkVisibilityCSS: true });
  // A rule applies only where its media query matches: a desktop menu's hover inside @media (min-width: 1024px) is
  // not the phone's (media text a browser cannot evaluate counts as matching)
  const matches = (m) => { if (!m || m === 'all') return true; try { return matchMedia(m).matches; } catch { return true; } };
  // what a hover reveals is content when it holds text, a control or an image with a text alternative; a decorative
  // layer (a colour version over a grey logo, an empty overlay, an img with alt="") is not lost on a touch screen
  const CONTROL = 'a[href], button, input, select, textarea, [tabindex], [role=button], [role=link], [role=menuitem]';
  const content = (e) => {
    if (e.closest('[aria-hidden=true]')) return false;
    if ((e.textContent || '').trim() || e.matches(CONTROL) || e.querySelector(CONTROL)) return true;
    return [e, ...e.querySelectorAll('img, svg, video, canvas, [role=img]')].some((i) => (i.tagName === 'IMG' ? !i.hasAttribute('alt') || i.getAttribute('alt').trim() !== ''
      : /^(VIDEO|CANVAS)$/.test(i.tagName) || !!(i.getAttribute('aria-label') || i.getAttribute('aria-labelledby') || (i.tagName.toLowerCase() === 'svg' && i.querySelector('title')))));
  };
  const walk = (rules, media) => {
    for (const r of rules) {
      if (typeof CSSImportRule !== 'undefined' && r instanceof CSSImportRule) { try { walk(r.styleSheet.cssRules, [...media, r.media.mediaText]); } catch { /* cross-origin */ } continue; }
      if (r.media && r.cssRules) { walk(r.cssRules, [...media, r.media.mediaText]); continue; }
      if (typeof CSSSupportsRule !== 'undefined' && r instanceof CSSSupportsRule && !CSS.supports(r.conditionText)) continue;
      if (r.cssRules && !r.selectorText) { walk(r.cssRules, media); continue; }
      if (!r.selectorText || !/:hover/.test(r.selectorText) || media.some((m) => NOHOVER.test(m)) || !media.every(matches)) continue;
      if (![...r.style].some((p) => HIDE.test(p))) continue;
      for (const part of r.selectorText.split(/,(?![^(]*\))/)) {
        const m = part.match(/^(.*?:hover[^\s>~+]*)\s*([>~+\s]\s*.+)$/); if (!m) continue; // the hovered element reveals another
        const target = part.replace(/:hover/g, '').trim(), hovered = m[1].replace(/:hover/g, '').trim();
        let els = [], hov = [];
        try { els = [...document.querySelectorAll(target)]; hov = [...document.querySelectorAll(hovered || '*')].filter((e) => shownEl(e) && e.getBoundingClientRect().width > 0); } catch { continue; }
        if (!hov.length) continue;
        // hidden now, by the very property this rule changes (a box hidden some other way is not this rule's doing)
        const sets = new Set([...r.style]);
        const hidden = els.filter((e) => { const cs = getComputedStyle(e); if (cs.display === 'none') return sets.has('display') && content(e); const b = e.getBoundingClientRect(); if (!(b.width > 0)) return false; return ((cs.opacity === '0' && sets.has('opacity')) || (cs.visibility === 'hidden' && sets.has('visibility'))) && content(e); });
        if (!hidden.length) continue;
        // a click or tap path opens it as well: a toggle inside the hovered element, or a control pointing at the target
        const toggle = hov.some((h) => h.querySelector('[aria-expanded], [aria-haspopup]') || h.matches('[aria-expanded], [aria-haspopup]')) || hidden.some((e) => e.id && document.querySelector(`[aria-controls~="${CSS.escape(e.id)}"]`));
        const twin = [...document.styleSheets].some((s) => { try { return [...s.cssRules].some((x) => x.selectorText && x.selectorText.includes(':focus-within') && x.selectorText.includes(target.split(/\s+/).pop())); } catch { return false; } });
        found.push({ rule: part.trim().slice(0, 80), hidden: hidden.length, toggle, twin });
      }
    }
  };
  for (const s of document.styleSheets) { if (s.disabled) continue; try { walk(s.cssRules, s.media?.mediaText ? [s.media.mediaText] : []); } catch { /* cross-origin */ } }
  return found;
}

function phoneControls() {
  const sel = (el) => (el.id ? '#' + el.id : el.tagName.toLowerCase() + [...el.classList].slice(0, 2).map((c) => '.' + c).join('')) + (el.getAttribute('aria-label') ? `[${el.getAttribute('aria-label').slice(0, 24)}]` : el.textContent.trim() ? ` "${el.textContent.replace(/\s+/g, ' ').trim().slice(0, 20)}"` : '');
  const out = [];
  let k = 0;
  for (const el of document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=link], summary, label:has(input[type=radio]), label:has(input[type=checkbox])')) {
    if (el.matches('input[type=radio], input[type=checkbox]') && el.closest('label')) continue; // the label is the target
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    if (r.width < 1 || r.height < 1 || (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }))) continue;
    let bar = null; for (let p = el; p && p !== document.body; p = p.parentElement) { const pc = getComputedStyle(p); if (pc.position === 'fixed' || pc.position === 'sticky') { bar = pc.position; break; } }
    el.setAttribute('data-audit-mc', String(k));
    const bg = cs.backgroundColor;
    // on screen: a closed drawer parked beside the viewport is not under the notch
    const onScreen = r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight;
    out.push({ k: k++, sel: sel(el), tag: el.tagName.toLowerCase(), x: r.left, vy: r.top, w: r.width, h: r.height, bar: onScreen ? bar : null, type: el.getAttribute('type'), cls: String(el.className?.baseVal ?? el.className ?? ''),
      filled: (/^(button|a)$/i.test(el.tagName) && r.width >= 100 && !/rgba\(0, 0, 0, 0\)|rgb\(2[3-5]\d, 2[3-5]\d, 2[3-5]\d\)/.test(bg) && cs.backgroundImage === 'none') || (/gradient/.test(cs.backgroundImage) && r.width >= 100),
      tapOff: /rgba\(0, 0, 0, 0\)|transparent/.test(cs.webkitTapHighlightColor) });
  }
  return out;
}

function phoneInputs() {
  const labelOf = (el) => (el.labels?.[0]?.textContent || el.getAttribute('aria-label') || el.placeholder || el.name || el.id || '').replace(/\s+/g, ' ').trim();
  return [...document.querySelectorAll('input:not([type=hidden]):not([type=radio]):not([type=checkbox]):not([type=range]):not([type=submit]):not([type=button]):not([type=reset]):not([type=image]):not([type=file]):not([type=color]), textarea')]
    .filter((el) => !el.checkVisibility || el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }))
    .map((el, k) => { el.setAttribute('data-audit-in', String(k)); return { k, field: el.id ? '#' + el.id : el.name ? `[name=${el.name}]` : el.tagName.toLowerCase(), label: labelOf(el).replace(el.value, '').slice(0, 30), type: el.getAttribute('type') || 'text', inputmode: el.getAttribute('inputmode'),
      autocomplete: el.getAttribute('autocomplete'), autocapitalize: el.getAttribute('autocapitalize'), fontSize: parseFloat(getComputedStyle(el).fontSize), name: el.name, id: el.id }; });
}

const PURPOSE = [
  ['postcode', /post ?code|\bzip\b|postal|الرمز البريدي|الرمز البريدى/i], ['email', /e-?mail|البريد الإلكتروني|البريد الالكتروني|بريد إلكتروني/i], ['tel', /phone|mobile|\btel\b|جوال|هاتف/i], ['otp', /one-time|\botp\b|verification code|رمز التحقق/i], ['card', /card number|cc-?number|رقم البطاقة/i],
  ['cvc', /security code|\bcvc\b|\bcvv\b|\bcsc\b|cc-csc/i], ['url', /website|\burl\b/i], ['search', /search|بحث/i],
  ['amount', /amount|price|المبلغ/i], ['quantity', /quantity|\bqty\b|الكمية/i],
];
const keyboardOf = (i) => i.inputmode || { email: 'email', tel: 'tel', url: 'url', number: 'number (spinner; decimal pad on iOS)', search: 'search', password: 'text (secure)', date: 'date picker' }[i.type] || 'text';
function judgeInput(i) {
  const hay = `${i.label} ${i.name} ${i.id} ${i.autocomplete || ''}`;
  const purpose = (PURPOSE.find(([, re]) => re.test(hay)) || ['text'])[0];
  const issues = [];
  const kb = keyboardOf(i);
  if (i.type === 'number' && !['quantity', 'amount', 'text'].includes(purpose)) issues.push(['FAIL', `type=number for ${purpose}: drops leading zeros, adds a spinner, and silently drops Arabic digits — type="text" inputmode="numeric"${purpose === 'tel' ? ' (or type="tel")' : ''}`]);
  const want = { email: ['email', 'email'], tel: ['tel', 'tel'], otp: ['numeric', 'one-time-code'], card: ['numeric', 'cc-number'], cvc: ['numeric', 'cc-csc'], url: ['url', 'url'], postcode: [null, 'postal-code'], search: ['search', null], amount: ['decimal', null] }[purpose];
  if (want) {
    if (want[0] && !kb.startsWith(want[0]) && !(i.type === 'number' && issues.length)) issues.push(['WARN', `${purpose} field brings the "${kb}" keyboard; expected ${want[0]}`]);
    if (want[1] && !(i.autocomplete || '').split(/\s+/).includes(want[1])) issues.push(['WARN', `autocomplete="${want[1]}" missing (autofill${purpose === 'otp' ? ', the SMS code suggestion' : ''})`]);
  }
  if (i.fontSize < 16) issues.push(['WARN', `font-size ${i.fontSize}px: iOS Safari zooms the page on focus`]);
  return { k: i.k, field: i.field, label: i.label, purpose, keyboard: kb, issues };
}

// Transitions off, through a constructed stylesheet: a Content-Security-Policy without 'unsafe-inline' in style-src
// refuses page.addStyleTag (and logs a console error the audit would report as the page's), not adoptedStyleSheets.
// Returns the function that puts them back, or null when neither way works.
async function noTransitions(page) {
  const css = '*, *::before, *::after { transition: none !important; }';
  const adopted = await page.evaluate((css) => {
    try { const s = new CSSStyleSheet(); s.replaceSync(css); document.adoptedStyleSheets = [...document.adoptedStyleSheets, s]; window.__auditNoTransitions = s; return true; } catch { return false; }
  }, css).catch(() => false);
  if (adopted) return () => page.evaluate(() => { const s = window.__auditNoTransitions; document.adoptedStyleSheets = document.adoptedStyleSheets.filter((x) => x !== s); delete window.__auditNoTransitions; }).catch(() => {});
  const tag = await page.addStyleTag({ content: css }).catch(() => null);
  return tag ? () => tag.evaluate((t) => t.remove()).catch(() => {}) : null;
}

/** The phone-width block. The page is left as found: insets back to 0, viewport restored, nothing focused. */
export async function phoneChecks(page, cdp, { width, height, insets = [59, 34, 0, 0], keyboard = 336 } = {}) {
  const t0 = Date.now();
  const findings = [];
  const add = (level, check, message, examples = []) => findings.push({ level, check, message, examples });
  const meta = await page.evaluate(() => document.querySelector('meta[name=viewport]')?.getAttribute('content') || '');
  const cover = /viewport-fit\s*=\s*cover/i.test(meta), resizesContent = /interactive-widget\s*=\s*resizes-content/i.test(meta);
  await page.evaluate(() => { document.activeElement?.blur?.(); scrollTo(0, 0); });
  let error = null;
  try {
    // hover-only reveals
    const hov = await page.evaluate(hoverOnly);
    const hard = hov.filter((h) => !h.toggle), soft = hov.filter((h) => h.toggle);
    if (hard.length) add('FAIL', 'hover', 'Content revealed only on :hover, hidden on this touch screen — show it by default on touch, or put the reveal inside @media (hover: hover) and give touch a visible control', hard.map((h) => `${h.rule} (${h.hidden} hidden${h.twin ? '; a :focus-within twin does not help a tap' : ''})`));
    if (soft.length) add('WARN', 'hover', 'Content revealed on :hover that a toggle also opens — check a tap opens it (and a second tap closes it)', soft.map((h) => `${h.rule} (${h.hidden} hidden)`));
    // the input keyboard table
    const I = (await page.evaluate(phoneInputs)).map(judgeInput);
    for (const lvl of ['FAIL', 'WARN']) {
      const ex = I.flatMap((i) => i.issues.filter(([l]) => l === lvl).map(([, m]) => `${i.field}${i.label ? ` (${i.label})` : ''}: ${m}`));
      if (ex.length) add(lvl, 'keyboards', lvl === 'FAIL' ? 'Fields whose type breaks input' : 'Fields that bring the wrong keyboard, miss autofill, or zoom the page on focus', ex);
    }
    const C = await page.evaluate(phoneControls);
    // pressed states: :active forced through CDP, transitions off so an end state is read, not the first frame
    const tapOff = C.filter((c) => c.tapOff && /^(a|button)$/.test(c.tag)).slice(0, 40);
    if (cdp && tapOff.length) {
      const restore = await noTransitions(page);
      try {
        if (!restore) throw new Error('transitions could not be switched off');
        await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
        const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
        const noPress = [];
        const look = (k) => page.evaluate((k) => { const e = document.querySelector(`[data-audit-mc="${k}"]`); if (!e) return null; const s = getComputedStyle(e); const p = getComputedStyle(e, '::before'), q = getComputedStyle(e, '::after'); return [s.backgroundColor, s.color, s.transform, s.opacity, s.boxShadow, s.filter, s.outlineStyle, s.borderColor, s.textDecorationLine, p.opacity, p.backgroundColor, q.opacity, q.backgroundColor].join('|'); }, k);
        for (const c of tapOff) {
          const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: `[data-audit-mc="${c.k}"]` }).catch(() => ({}));
          if (!nodeId) continue;
          const a = await look(c.k);
          await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['active'] });
          const b = await look(c.k);
          await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] });
          if (a !== null && a === b) noPress.push(c.sel);
        }
        if (noPress.length) add('WARN', 'pressed', 'Controls with no pressed (:active) state and the tap highlight turned off: a tap shows nothing until the result arrives', noPress);
      } catch (e) {
        add('WARN', 'pressed', `Pressed states not checked: ${String(e?.message || e).split('\n')[0].slice(0, 160)}`);
      } finally { if (restore) await restore(); }
    }
    // safe areas: only when the page opts in to edge-to-edge (without cover, iOS keeps it inside the safe area)
    const bars = C.filter((c) => c.bar && (c.vy < insets[0] + 8 || c.vy + c.h > height - insets[1] - 8));
    if (cover && cdp) {
      const [top, bottom, left, right] = insets;
      await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top, topMax: top, bottom, bottomMax: bottom, left, leftMax: left, right, rightMax: right } });
      await page.waitForTimeout(150);
      const Ci = await page.evaluate(phoneControls);
      const under = Ci.filter((c) => c.bar && ((bottom && c.vy + c.h > height - bottom + 2) || (top && c.vy < top - 2)))
        .map((c) => `${c.sel} ${c.vy < top ? `${Math.round(top - c.vy)}px under the status bar or island` : `${Math.round(c.vy + c.h - (height - bottom))}px into the home-indicator zone`}`);
      await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0, topMax: 0, bottom: 0, bottomMax: 0, left: 0, leftMax: 0, right: 0, rightMax: 0 } });
      await page.waitForTimeout(100);
      if (under.length) add('FAIL', 'safe-area', `Controls in fixed or sticky bars inside the safe-area insets (viewport-fit=cover; emulated ${insets.join('/')}) — pad the bars with max(…, env(safe-area-inset-*))`, under);
    } else if (!cover && bars.length) add('INFO', 'safe-area', 'No viewport-fit=cover: the browser keeps the page inside the safe area, so the fixed bars cannot sit under the notch or the home indicator (choose cover only for an edge-to-edge design, then pad the bars with env()) — check the bars on a device');
    // the keyboard, only when the page asks for the layout to shrink with it (resizes-content)
    if (resizesContent) {
      await page.setViewportSize({ width, height: height - keyboard });
      const covered = [];
      for (const i of I) {
        const hit = await page.evaluate((k) => {
          const el = document.querySelector(`[data-audit-in="${k}"]`); if (!el) return null;
          el.focus(); el.scrollIntoView({ block: 'nearest', behavior: 'instant' }); const b = el.getBoundingClientRect(); // focus scrolls as the browser does (centre if needed)
          const bar = [...document.querySelectorAll('body *')].find((e) => { if (getComputedStyle(e).position !== 'fixed' || e.contains(el)) return false; const q = e.getBoundingClientRect(); return q.height > 0 && q.top < b.bottom - 2 && q.bottom > b.top + 2 && q.left < b.right && q.right > b.left; });
          return bar ? bar.tagName.toLowerCase() + [...bar.classList].slice(0, 1).map((c) => '.' + c).join('') : null;
        }, i.k);
        if (hit) covered.push(`${i.field} under ${hit}`);
      }
      await page.evaluate(() => { document.activeElement?.blur?.(); scrollTo(0, 0); });
      await page.setViewportSize({ width, height });
      if (covered.length) add('WARN', 'keyboard', `With a ${keyboard}px keyboard open (interactive-widget=resizes-content), fixed bars cover the focused field — scroll-padding-block-end, or hide the bars while typing`, covered);
    }
    // the primary action pinned in the top third (portrait): a regrip for either thumb
    if (height > width) {
      // a primary action: named so, a submit, or a filled button (not the brand or logo link a dark bar paints)
      const PRIMARY = /(^|[\s_-])(primary|cta|buy|checkout)([\s_-]|$)|btn-primary/i;
      const pinned = C.filter((c) => c.bar && c.vy >= 0 && c.vy + c.h / 2 < height / 3 && !/brand|logo/i.test(c.cls)
        && (PRIMARY.test(c.cls) || c.type === 'submit' || (c.filled && (c.tag === 'button' || /(^|[\s_-])(btn|button)/i.test(c.cls)))));
      if (pinned.length) add('WARN', 'thumb', 'Primary action pinned in the top third of the phone screen: a regrip for either thumb — a bottom bar, or in flow after the content it acts on', pinned.map((c) => c.sel));
    }
  } catch (e) {
    // the findings made before the error stand; the error is reported beside them
    error = String(e?.message || e).split('\n')[0];
  } finally {
    await page.evaluate(() => { for (const a of ['data-audit-mc', 'data-audit-in']) document.querySelectorAll(`[${a}]`).forEach((e) => e.removeAttribute(a)); document.activeElement?.blur?.(); scrollTo(0, 0); }).catch(() => {});
  }
  return { cover, resizesContent, findings, ...(error ? { error } : {}), ms: Date.now() - t0 };
}
