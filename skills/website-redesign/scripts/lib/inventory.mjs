/**
 * pageInventory — one in-page pass that measures the rendered page.
 * Serialised into the page by Playwright, so everything it needs is inside it.
 * Call it with the viewport grown to the whole document (growToDocument) so
 * elementsFromPoint can sample the painted ground under every text element.
 *
 * Returns raw measurements; audit.mjs turns them into findings.
 */
export function pageInventory({ initialViewportHeight, lazyAttrs, saturated = {} }) {
  const CLICHES = /\b(built for the way you work|meet your new|the future of \w+|say goodbye to|look no further|more than just an?|not just an?|supercharge[sd]?|seamless(ly)?|empower(s|ing)?|revolutioni[sz]e[sd]?|next[- ]gen(eration)?|cutting[- ]edge|unlock(s|ing)?|leverag(e|es|ing)|all[- ]in[- ]one|blazing[- ]fast|world[- ]class|game[- ]chang(er|ing)|effortless(ly)?|elevate[sd]?|unleash(es|ed)?|streamline[sd]?|harness(es|ing)?|transform (your|how)|built for the future|at scale|10x|work smarter)\b/gi;
  const EMOJI = /\p{Extended_Pictographic}/u;

  // ---- helpers -----------------------------------------------------------
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const rgbaCache = new Map();
  const rgba = (css) => {
    if (rgbaCache.has(css)) return rgbaCache.get(css);
    let out = null;
    const m = /^rgba?\(([^)]+)\)$/.exec(css);
    if (m) {
      const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat);
      out = [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
    } else {
      // oklch()/lab()/color() etc: let the canvas convert to sRGB.
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = '#000';
      ctx.fillStyle = css;
      ctx.fillRect(0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data;
      out = [d[0], d[1], d[2], d[3] / 255];
    }
    rgbaCache.set(css, out);
    return out;
  };
  const over = (top, bottom) => { // composite rgba over opaque rgb
    const a = top[3];
    return [0, 1, 2].map((i) => top[i] * a + bottom[i] * (1 - a)).concat(1);
  };
  const lum = ([r, g, b]) => {
    const f = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const hex = (c) => '#' + c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  const hue = ([r, g, b]) => {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    if (d < 0.08) return null;
    let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return (h * 60 + 360) % 360;
  };
  const sel = (el) => {
    if (!el || el === document.body) return 'body';
    if (el.id) return `#${el.id}`;
    const cls = [...el.classList].filter((c) => !/^(css|sc|jsx|svelte|astro)-/.test(c)).slice(0, 2).map((c) => `.${CSS.escape(c)}`).join('');
    const own = el.tagName.toLowerCase() + cls;
    const p = el.parentElement;
    if (!p || p === document.body) return own;
    const parent = p.id ? `#${p.id}` : p.tagName.toLowerCase() + [...p.classList].slice(0, 1).map((c) => `.${CSS.escape(c)}`).join('');
    return `${parent} > ${own}`;
  };
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    // Closed <details> content still reports client rects in Chromium; checkVisibility knows it is not rendered.
    if (el.checkVisibility && !el.checkVisibility({ checkVisibilityCSS: false })) return false;
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.visibility === 'collapse' || parseFloat(cs.opacity) < 0.05) return false;
      if (e.getAttribute('aria-hidden') === 'true' && e !== el) return false;
    }
    return true;
  };
  const opacityChain = (el) => { let o = 1; for (let e = el; e && e !== document.documentElement; e = e.parentElement) o *= parseFloat(getComputedStyle(e).opacity); return o; };
  const short = (t, n = 60) => t.replace(/\s+/g, ' ').trim().slice(0, n);

  // ---- text elements -----------------------------------------------------
  const textEls = new Map(); // element -> own text
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.nodeValue.trim() && !['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'].includes(n.parentElement?.tagName) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
  });
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    textEls.set(el, (textEls.get(el) || '') + n.nodeValue);
  }

  const sizes = new Map(), families = new Map(), weights = new Map(), textColours = new Map();
  const contrast = [], unknownGround = [], gradientText = [], emoji = [], smallText = [], caps = [], cliches = new Set(), statClaims = [];
  // Monospace faces: whole words, so display faces such as Monoton or Monotype Corsiva are not taken for code fonts.
  const MONO = /\bmono\b|mono(space|\s)|\bcode\b|courier|consolas|menlo|monaco|sfmono|inconsolata|iosevka|anonymous pro|monaspace|lucida console|lucida sans typewriter|nanum gothic coding|pragmata|fixedsys|^hack$/i;
  const families1 = (stack) => stack.split(',').map((f) => f.replace(/["']/g, '').trim()).filter(Boolean);
  const monoCand = []; // { el, text, stack, tag } whose rendered face is resolved once `probe` exists (below)
  // Visually hidden (the 1×1 clip pattern, on the element or a wrapper): read by screen readers, not seen.
  const srOnly = (el, box = el.getBoundingClientRect()) => {
    if (box.width <= 2 && box.height <= 2) return true;
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      const c = getComputedStyle(e);
      if (c.clip === 'rect(0px, 0px, 0px, 0px)' || /inset\(50%\)/.test(c.clipPath)) return true;
    }
    return false;
  };
  let totalChars = 0;
  for (const [el, raw] of textEls) {
    if (!visible(el)) continue;
    const text = raw.replace(/\s+/g, ' ').trim();
    const cs = getComputedStyle(el);
    const px = Math.round(parseFloat(cs.fontSize) * 2) / 2;
    const n = text.length;
    totalChars += n;
    sizes.set(px, (sizes.get(px) || 0) + n);
    const fam = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
    families.set(fam, (families.get(fam) || 0) + n);
    weights.set(cs.fontWeight, (weights.get(cs.fontWeight) || 0) + n);
    // Form controls are read below, from their value or placeholder (a textarea's text is its value).
    if (!srOnly(el) && !/^(TEXTAREA|SELECT|OPTION|OPTGROUP)$/.test(el.tagName)) monoCand.push({ el, text, stack: cs.fontFamily, tag: el.tagName.toLowerCase() });
    // The type floor is 12px; the product-UI caps rule allows 11px only for a single uppercase word (a column head,
    // a nav-group label). Anything else under 12px is reported, two-word caps labels included.
    const capsLabel = px >= 11 && (cs.textTransform === 'uppercase' || (text === text.toUpperCase() && text !== text.toLowerCase())) && !text.includes(' ');
    if (px < 12 && n > 2 && !capsLabel) smallText.push({ selector: sel(el), px, text: short(text, 40) });
    if (cs.textTransform === 'uppercase' && n > 24) caps.push({ selector: sel(el), text: short(text, 40), tracking: cs.letterSpacing });
    if (EMOJI.test(text) && (el.closest('h1,h2,h3,h4,button,a,[role=button],nav') || n <= 3)) emoji.push({ selector: sel(el), text: short(text, 40) });
    for (const m of text.matchAll(CLICHES)) cliches.add(m[0].toLowerCase());
    if (px >= 36 && /^[~<>]?[\d.,]+\s?[%x×+kKmMbB]*\+?$/.test(text)) statClaims.push({ selector: sel(el), text });

    const clip = cs.webkitBackgroundClip || cs.backgroundClip;
    const fgRaw = rgba(cs.color);
    if (clip === 'text' || fgRaw[3] === 0) {
      gradientText.push({ selector: sel(el), text: short(text, 40) });
      continue;
    }
    // Sample the painted ground under the middle of the element's first line box.
    // Sample the element's own text, not its descendants': a clipped screen-reader-only span inside a button still
    // lays out a full-width line box beside it, and sampling there reads the page behind the button.
    const range = document.createRange();
    const ownText = [...el.childNodes].find((c) => c.nodeType === 3 && c.nodeValue.trim());
    if (ownText) range.selectNodeContents(ownText); else range.selectNodeContents(el);
    const firstBox = () => [...range.getClientRects()].find((r) => r.width > 1 && r.height > 1) || el.getBoundingClientRect();
    let box = firstBox();
    // elementsFromPoint only sees the viewport: bring text below a capped viewport into view first
    // (instant, so a CSS scroll-behavior: smooth does not leave the sample in mid-scroll).
    if (box.top >= innerHeight || box.bottom <= 0) { scrollTo({ top: scrollY + box.top - innerHeight / 2, behavior: 'instant' }); box = firstBox(); }
    // Not seen, so not a contrast pair: screen-reader-only text, and fixed things parked off-screen until focus (skip links).
    const ecs = getComputedStyle(el);
    if ((box.width <= 2 && box.height <= 2) || ecs.clip === 'rect(0px, 0px, 0px, 0px)' || /inset\(50%\)/.test(ecs.clipPath) || box.top >= innerHeight || box.bottom <= 0 || box.right <= 0 || box.left >= innerWidth) continue;
    const cx = Math.min(Math.max(box.left + Math.min(box.width / 2, 20), 1), innerWidth - 1);
    const cy = Math.min(Math.max(box.top + box.height / 2, 1), innerHeight - 1);
    const stack = document.elementsFromPoint(cx, cy);
    const idx = stack.indexOf(el);
    let ground = null, layers = [], unknown = null;
    for (const s of (idx >= 0 ? stack.slice(idx) : stack)) {
      if (s !== el && el.contains(s)) continue;
      const scs = getComputedStyle(s);
      if (['IMG', 'VIDEO', 'CANVAS', 'PICTURE', 'IFRAME'].includes(s.tagName)) { unknown = s.tagName.toLowerCase(); break; }
      if (s.tagName === 'svg' || s instanceof SVGElement) continue;
      if (scs.backgroundImage && scs.backgroundImage !== 'none') { unknown = /gradient/.test(scs.backgroundImage) ? 'gradient' : 'background-image'; break; }
      const bg = rgba(scs.backgroundColor);
      if (bg[3] > 0) { layers.push(bg); if (bg[3] >= 0.99) break; }
    }
    if (unknown) { unknownGround.push({ selector: sel(el), text: short(text, 40), ground: unknown }); continue; }
    ground = [255, 255, 255, 1];
    for (let i = layers.length - 1; i >= 0; i--) ground = over(layers[i], ground);
    const fg = over([fgRaw[0], fgRaw[1], fgRaw[2], fgRaw[3] * opacityChain(el)], ground);
    const r = ratio(fg, ground);
    const bold = parseInt(cs.fontWeight, 10) >= 700;
    const large = px >= 24 || (px >= 18.66 && bold);
    const need = large ? 3 : 4.5;
    textColours.set(hex(fg), (textColours.get(hex(fg)) || 0) + n);
    contrast.push({ selector: sel(el), text: short(text, 40), fg: hex(fg), bg: hex(ground), ratio: Math.round(r * 100) / 100, need, px, weight: cs.fontWeight, chars: n });
  }

  // ---- measure, alignment, justification ---------------------------------
  const measure = [], centred = [], justified = [], tightLeading = [];
  for (const el of document.querySelectorAll('p, li, dd, blockquote')) {
    if (!visible(el)) continue;
    const text = el.textContent.replace(/\s+/g, ' ').trim();
    if (text.length < 120) continue;
    const cs = getComputedStyle(el);
    const range = document.createRange();
    range.selectNodeContents(el);
    const tops = new Set([...range.getClientRects()].filter((r) => r.width > 2).map((r) => Math.round(r.top)));
    const lines = Math.max(1, tops.size);
    const perLine = Math.round(text.length / lines);
    if (lines >= 2 && perLine > 85) measure.push({ selector: sel(el), charsPerLine: perLine, lines });
    if (cs.textAlign === 'center' && lines >= 3) centred.push({ selector: sel(el), lines });
    if (cs.textAlign === 'justify') justified.push({ selector: sel(el) });
    const lh = cs.lineHeight === 'normal' ? 1.2 : parseFloat(cs.lineHeight) / parseFloat(cs.fontSize);
    if (lines >= 2 && lh < 1.35 && parseFloat(cs.fontSize) < 24) tightLeading.push({ selector: sel(el), lineHeight: Math.round(lh * 100) / 100 });
  }

  // ---- headings and landmarks --------------------------------------------
  // Visually hidden headings (the 1×1 clip pattern) are for screen readers: their browser-default size is not part of the scale.
  const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6,[role=heading]')].filter(visible).filter((h) => { const b = h.getBoundingClientRect(); return b.width > 2 && b.height > 2; }).map((h) => ({
    level: h.getAttribute('aria-level') ? +h.getAttribute('aria-level') : +h.tagName[1], text: short(h.textContent, 70), px: parseFloat(getComputedStyle(h).fontSize),
  }));
  const skipped = [];
  headings.forEach((h, i) => { if (i && h.level > headings[i - 1].level + 1) skipped.push(`${headings[i - 1].level}→${h.level} at "${h.text}"`); });
  const has = (s) => !!document.querySelector(s);
  const firstFocusable = document.querySelector('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
  const landmarks = {
    main: has('main, [role=main]'), nav: has('nav, [role=navigation]'), header: has('header, [role=banner]'), footer: has('footer, [role=contentinfo]'),
    skipLink: !!firstFocusable && firstFocusable.tagName === 'A' && /^#./.test(firstFocusable.getAttribute('href') || ''),
  };

  scrollTo({ top: 0, behavior: 'instant' });

  // ---- interactive targets -----------------------------------------------
  const INTERACTIVE = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=link], [role=tab], [role=checkbox], [role=switch], [role=menuitem], [role=option], [role=radio]';
  const targets = [...document.querySelectorAll(INTERACTIVE)].filter(visible).map((el) => {
    const r = el.getBoundingClientRect();
    const inline = el.tagName === 'A' && getComputedStyle(el).display === 'inline' && el.parentElement && /\S/.test([...el.parentElement.childNodes].filter((c) => c !== el && c.nodeType === 3).map((c) => c.nodeValue).join(''));
    return { el, r, inline };
  });
  const small = [];
  for (const t of targets) {
    if (t.inline) continue;
    const { r } = t;
    if (r.width >= 24 && r.height >= 24) continue;
    // WCAG 2.5.8 spacing exception: a 24px-diameter circle centred on the target intersects no other
    // target, and no other undersized target's circle (centres ≥ 24px apart). Touching is allowed.
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const crowded = targets.some((o) => {
      if (o === t || o.el.contains(t.el) || t.el.contains(o.el)) return false;
      const toRect = Math.hypot(Math.max(o.r.left - cx, 0, cx - o.r.right), Math.max(o.r.top - cy, 0, cy - o.r.bottom));
      if (toRect < 12) return true;
      const undersized = !o.inline && (o.r.width < 24 || o.r.height < 24);
      return undersized && Math.hypot(o.r.left + o.r.width / 2 - cx, o.r.top + o.r.height / 2 - cy) < 24;
    });
    small.push({ selector: sel(t.el), w: Math.round(r.width), h: Math.round(r.height), name: short(t.el.getAttribute('aria-label') || t.el.textContent || t.el.getAttribute('title') || '', 30), spacingException: !crowded });
  }
  const under48Els = targets.filter((t) => !t.inline && (t.r.width < 48 || t.r.height < 48));
  const under44Els = targets.filter((t) => !t.inline && (t.r.width < 44 || t.r.height < 44));
  const under44 = under44Els.length;
  const under44List = under44Els.slice(0, 6).map((t) => ({ selector: sel(t.el), w: Math.round(t.r.width), h: Math.round(t.r.height), name: short(t.el.getAttribute('aria-label') || t.el.textContent || '', 24) }));

  // Pointer cursor on something that is not a control: a div with onclick.
  const fakeControls = [];
  for (const el of document.body.querySelectorAll('div, span, li, td, tr, img, svg, p')) {
    if (getComputedStyle(el).cursor !== 'pointer') continue;
    if (el.closest(INTERACTIVE + ', label')) continue;
    if (el.parentElement && getComputedStyle(el.parentElement).cursor === 'pointer' && !el.parentElement.closest(INTERACTIVE)) continue;
    if (!visible(el)) continue;
    fakeControls.push({ selector: sel(el), text: short(el.textContent, 30), keyboard: el.hasAttribute('tabindex') });
  }

  // ---- images ------------------------------------------------------------
  const images = [...document.images].map((img, i) => {
    const r = img.getBoundingClientRect();
    const cs = getComputedStyle(img);
    const src = img.currentSrc || img.src;
    return {
      selector: sel(img), src: src.split('/').pop().slice(0, 60), alt: img.getAttribute('alt'), decorative: img.getAttribute('alt') === '' || img.getAttribute('role') === 'presentation' || img.closest('[aria-hidden=true]') !== null,
      sized: (img.hasAttribute('width') && img.hasAttribute('height')) || cs.aspectRatio !== 'auto',
      lazy: lazyAttrs[i] === 'lazy', aboveFold: r.top < initialViewportHeight && r.bottom > 0,
      natural: [img.naturalWidth, img.naturalHeight], rendered: [Math.round(r.width), Math.round(r.height)],
      format: (src.match(/\.(avif|webp|png|jpe?g|gif|svg)(\?|$)/i) || [])[1]?.toLowerCase() || null, visible: r.width > 0 && r.height > 0,
    };
  });

  // ---- content cut off by an overflow:hidden/clip ancestor ---------------
  // Across the inline axis, by the element's box. Down the block axis, by the ink of its own text when probes.mjs
  // glyphClipProbe measured it first (its data-audit-ink mark, in document coordinates): a box whose padding runs past
  // the clip cuts nothing, and glyphs that reach past their line box are cut although the box fits. Without a mark
  // (not measured), by the box. inkK links an element to its entry in glyphClipProbe's list, so a caller reports it once.
  const clippedText = [];
  for (const [el] of textEls) {
    if (!visible(el)) continue;
    const cs = getComputedStyle(el);
    if (cs.textOverflow === 'ellipsis' || cs.webkitLineClamp !== 'none' && cs.webkitLineClamp) continue;
    const r = el.getBoundingClientRect();
    if (r.width <= 2 || r.height <= 2) continue; // visually-hidden text
    const ink = (el.getAttribute('data-audit-ink') || '').split(',').map((v) => parseFloat(v) - scrollY);
    const inked = ink.length === 2 && ink.every(Number.isFinite);
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const pc = getComputedStyle(p);
      if (['auto', 'scroll'].includes(pc.overflowX) || ['auto', 'scroll'].includes(pc.overflowY)) break; // scrollable: reachable, not cut off
      const cx = ['hidden', 'clip'].includes(pc.overflowX), cy = ['hidden', 'clip'].includes(pc.overflowY);
      if (!cx && !cy) continue;
      const q = p.getBoundingClientRect();
      if (q.width <= 2 || q.height <= 2) break;
      const outX = cx && (r.right > q.right + 2 || r.left < q.left - 2);
      const outY = cy && (inked ? ink[1] > q.bottom + 1 || ink[0] < q.top - 1 : r.bottom > q.bottom + 2 || r.top < q.top - 2);
      if (outX || outY) clippedText.push({ selector: sel(el), by: sel(p), text: short(el.textContent, 30), axis: outX && outY ? 'xy' : outX ? 'x' : 'y', ink: inked, inkK: el.getAttribute('data-audit-ink-k') });
      break;
    }
  }

  // ---- near-miss alignment: left edges of text blocks 1–4px apart ------------
  // A grid gives few distinct edges; hand-placed layouts drift into 48/50/52. Only left-aligned text blocks at
  // least 40px wide count (centred text and icons are excluded), and only edges shared by two or more blocks.
  const edgeCount = new Map();
  for (const [el] of textEls) {
    if (!visible(el)) continue;
    const cs = getComputedStyle(el);
    if (!['block', 'flex', 'grid', 'list-item', 'table-cell'].includes(cs.display) || cs.textAlign === 'center' || cs.textAlign === 'right' || cs.textAlign === 'end') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 40 || r.height < 8) continue;
    const x = Math.round(r.left + parseFloat(cs.paddingLeft || 0));
    edgeCount.set(x, (edgeCount.get(x) || 0) + 1);
  }
  const edges = [...edgeCount.entries()].filter(([, n]) => n >= 2).sort((p, q) => p[0] - q[0]);
  const nearMisses = [];
  for (let i = 1; i < edges.length; i++) { const d = edges[i][0] - edges[i - 1][0]; if (d >= 1 && d <= 4) nearMisses.push(`${edges[i - 1][0]}px ×${edges[i - 1][1]} vs ${edges[i][0]}px ×${edges[i][1]}`); }

  // ---- concentric radii: a rounded element near a corner of its nearest painted rounded ancestor --------
  // Nested corners read as one shape when inner radius ≈ outer radius − the gap between them; an inner radius well
  // above that looks swollen (the "card with a pill inside it" mismatch). Stage-2 S9 (probe v2): all four corners,
  // each with its own radii; the nearest painted rounded ancestor, not any rounded box further up; discs and pills
  // skipped, inside and out (a round play button in a card is a role, not a nesting); a flag only where the gap is at
  // most R, the case the rule is for. A child further in (R < gap ≤ 1.5 R) is listed as information (radiusFarIn).
  const radiusMismatch = [], radiusFarIn = [];
  {
    const CORNERS = [['TopLeft', 'top-left'], ['TopRight', 'top-right'], ['BottomLeft', 'bottom-left'], ['BottomRight', 'bottom-right']];
    // a corner's horizontal radius in px (a percentage resolves against the box; the smaller side keeps it conservative)
    const radius = (v, box) => { const a = String(v).split(' ')[0]; return a.endsWith('%') ? (parseFloat(a) / 100) * Math.min(box.width, box.height) : parseFloat(a) || 0; };
    // painted surfaces only: a radius on an invisible box has no corner to match
    const painted = (c) => rgba(c.backgroundColor)[3] > 0 || (c.backgroundImage && c.backgroundImage !== 'none') || (parseFloat(c.borderTopWidth) > 0 && c.borderTopStyle !== 'none' && rgba(c.borderTopColor)[3] > 0) || c.boxShadow !== 'none';
    const rounded = new Map();
    for (const el of document.body.querySelectorAll('*')) {
      if (el instanceof SVGElement && el.tagName !== 'svg') continue;
      const c = getComputedStyle(el);
      if (!/[1-9]/.test(c.borderTopLeftRadius + c.borderTopRightRadius + c.borderBottomLeftRadius + c.borderBottomRightRadius) || !painted(c)) continue;
      const box = el.getBoundingClientRect();
      if (box.width < 1 || box.height < 1) continue;
      const rad = CORNERS.map(([k]) => radius(c[`border${k}Radius`], box));
      // a disc or a pill: its round ends are its shape, not a nested corner
      if (Math.max(...rad) >= Math.min(box.width, box.height) / 2 - 1) continue;
      rounded.set(el, { box, rad });
    }
    for (const [ch, { box: cr, rad: rc }] of rounded) {
      if (radiusMismatch.length >= 8) break;
      if (cr.width < 24 || cr.height < 16) continue;
      let p = ch.parentElement;
      while (p && p !== document.body && !rounded.has(p)) p = p.parentElement;
      if (!p || p === document.body) continue;
      const { box: pr, rad: rp } = rounded.get(p);
      if (pr.width < 60 || pr.height < 40 || cr.width >= pr.width - 1 || !visible(ch)) continue;
      const gaps = [[cr.left - pr.left, cr.top - pr.top], [pr.right - cr.right, cr.top - pr.top], [cr.left - pr.left, pr.bottom - cr.bottom], [pr.right - cr.right, pr.bottom - cr.bottom]];
      for (let i = 0; i < 4; i++) {
        const R = rp[i], r = rc[i], [dx, dy] = gaps[i];
        if (R < 8 || r < 4 || dx < 0 || dy < 0 || dx > R * 1.5 + 2 || dy > R * 1.5 + 2) continue; // not near this corner
        const gap = Math.min(dx, dy), ideal = Math.max(R - gap, 0);
        if (r <= ideal + 4) continue;
        const row = `\`${sel(ch)}\` ${Math.round(r)}px inside \`${sel(p)}\` ${Math.round(R)}px, ${Math.round(gap)}px in (≈${Math.round(ideal)}px${i ? `, ${CORNERS[i][1]} corner` : ''})`;
        if (gap <= R) radiusMismatch.push(row); else if (radiusFarIn.length < 8) radiusFarIn.push(row);
        break;
      }
    }
  }

  // ---- meaning carried by colour alone: status dots with no text -----------
  const colourOnly = [];
  for (const el of document.body.querySelectorAll('span, i, div, b, em')) {
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.width > 16 || r.height < 4 || r.height > 16 || el.children.length) continue;
    const cs = getComputedStyle(el);
    const c = rgba(cs.backgroundColor);
    if (c[3] < 0.5 || hue(c) === null || el.textContent.trim()) continue;
    if (el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('role') === 'img') continue;
    // Window chrome (the red/amber/green dots on a code or browser mock): a row of 2+ dots with no text.
    const sibs = el.parentElement ? [...el.parentElement.children] : [];
    if (sibs.length >= 2 && !el.parentElement.textContent.trim() && sibs.every((d) => !d.children.length && d.getBoundingClientRect().width <= 16)) continue;
    const cell = el.closest('td, li, [role=cell], [role=gridcell]') || el.parentElement;
    const words = cell ? cell.textContent.replace(/\s+/g, '').length : 0;
    // A bar (clearly wider or taller than a dot) encodes length, not a category.
    if (Math.max(r.width, r.height) > Math.min(r.width, r.height) * 1.8) continue;
    if (words === 0) colourOnly.push({ selector: sel(el), colour: hex(c), hue: Math.round(hue(c) / 30) });
  }
  // WCAG 1.4.1 is about colour being the only way to tell things apart: dots in a single hue signal presence
  // (an "unread" mark), which is visible without colour vision. Report only when two or more hues are in play.
  if (new Set(colourOnly.map((d) => d.hue)).size < 2) colourOnly.length = 0;

  // ---- empty states written as a bare phrase --------------------------------
  const bareEmpty = [];
  for (const [el, raw] of textEls) {
    const t = raw.trim();
    if (/^(no (data|records?|results?|items?|entries|activity)( (found|yet|available))?|nothing (here|to (show|see))( yet)?|empty|n\/a)\.?$/i.test(t) && visible(el)) bareEmpty.push({ selector: sel(el), text: t });
  }

  // ---- families that are declared but not actually available --------------
  // A face the page loaded is available whatever its style: a family served only in italic, or only in the weights
  // the page uses, would otherwise measure as its fallback when probed upright at 400.
  const loadedFaces = new Set([...(document.fonts || [])].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/^["']|["']$/g, '').toLowerCase()));
  const probe = (family) => {
    if (loadedFaces.has(family.toLowerCase())) return false;
    const span = document.createElement('span');
    span.textContent = 'mmmmmmmmmwwwwwlliI10@#';
    span.style.cssText = 'position:absolute;left:-9999px;top:0;font-size:48px;white-space:nowrap';
    document.body.appendChild(span);
    const w = (f) => { span.style.fontFamily = f; return span.getBoundingClientRect().width; };
    const same = () => ['monospace', 'serif', 'sans-serif'].every((fb) => Math.abs(w(`"${family}", ${fb}`) - w(fb)) < 0.5);
    let res = true;
    for (const [style, weight] of [['normal', 400], ['italic', 400], ['normal', 700], ['italic', 700]]) {
      span.style.fontStyle = style; span.style.fontWeight = weight;
      if (!same()) { res = false; break; }
    }
    span.remove();
    return res; // true = renders identically to every fallback = not available
  };
  const GENERIC = /^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-sans-serif|ui-serif|ui-monospace|ui-rounded|emoji|math|fangsong|-apple-system|blinkmacsystemfont|inherit|initial)$/i;
  const unavailableFamilies = [...families.keys()].filter((f) => !GENERIC.test(f) && families.get(f) / Math.max(totalChars, 1) >= 0.02 && probe(f));

  // ---- monospace text: the face actually rendered, form-control values and placeholders included -------------
  // The first family decides, unless it is unavailable: then the stack falls through (the same width probe) to the
  // next family that renders, and a fallback to a monospace face counts as monospace.
  const probed = new Map(), pitch = new Map();
  const missing = (f) => { const k = f.toLowerCase(); if (!probed.has(k)) probed.set(k, probe(f)); return probed.get(k); };
  // A face named like a code font counts only when its glyphs are one width: Code Next and Code Pro are sans faces.
  const fixedPitch = (f) => {
    const k = f.toLowerCase();
    if (!pitch.has(k)) {
      const span = document.createElement('span');
      span.style.cssText = `position:absolute;left:-9999px;top:0;font-size:48px;white-space:nowrap;font-family:"${f.replace(/"/g, '')}", monospace`;
      document.body.appendChild(span);
      const w = (t) => { span.textContent = t; return span.getBoundingClientRect().width; };
      const narrow = w('iiiiiiiiii'), wide = w('WWWWWWWWWW');
      span.remove();
      pitch.set(k, Math.abs(wide - narrow) <= wide * 0.02);
    }
    return pitch.get(k);
  };
  const monoFace = (stack) => {
    const fams = families1(stack);
    for (let i = 0; i < fams.length; i++) {
      const f = fams[i];
      const generic = GENERIC.test(f);
      if (generic && !/^(inherit|initial)$/i.test(f)) return /mono/i.test(f) ? (i ? `${fams[0]} → ${f}` : f) : null;
      if (!generic && missing(f)) continue;
      return MONO.test(f) && fixedPitch(f) ? (i ? `${fams[0]} → ${f}` : f) : null;
    }
    return null;
  };
  // Only stacks that name a monospace face anywhere are worth probing.
  const monoItems = [];
  for (const c of monoCand) {
    if (!/mono|code|courier|consolas|menlo|monaco|inconsolata|iosevka|anonymous|monaspace|lucida|coding|pragmata|fixedsys|hack/i.test(c.stack)) continue;
    const family = monoFace(c.stack);
    if (family) monoItems.push({ selector: sel(c.el), text: short(c.text, 40), family, tag: c.tag, code: !!c.el.closest('kbd, code, samp, pre') });
  }
  const NO_TEXT = /^(hidden|checkbox|radio|range|color|file|image|reset|submit|button)$/i;
  for (const el of document.querySelectorAll('input, textarea, select')) {
    if ((el.tagName === 'INPUT' && NO_TEXT.test(el.type)) || !visible(el) || srOnly(el)) continue;
    const value = el.tagName === 'SELECT' ? (el.selectedOptions?.[0]?.text || '') : el.value || '';
    const ph = !value.trim() && (el.getAttribute('placeholder') || '').trim();
    if (!value.trim() && !ph) continue;
    const stack = ph ? getComputedStyle(el, '::placeholder').fontFamily : getComputedStyle(el).fontFamily;
    const family = monoFace(stack);
    // A password is named, never quoted.
    const text = ph ? `placeholder: ${ph}` : el.type === 'password' ? '(password)' : value;
    if (family) monoItems.push({ selector: sel(el), text: short(text, 40), family, tag: el.tagName.toLowerCase(), code: false });
  }
  // Browser defaults first (code, kbd, samp and pre render monospace unless the page sets them), then the rest.
  monoItems.sort((p, q) => q.code - p.code);
  const mono = { count: monoItems.length, items: monoItems.slice(0, 10).map(({ code, ...m }) => m) };

  // ---- system inventory: surfaces, radii, shadows, spacing ---------------
  const radii = new Map(), shadows = new Map(), spacing = new Map(), gradients = [];
  let cards = 0, pills = 0, blur = 0, iconTiles = 0, buttonsLike = 0;
  const all = [...document.body.querySelectorAll('*')];
  for (const el of all) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    for (const k of ['marginTop', 'marginBottom', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'rowGap', 'columnGap']) {
      const v = parseFloat(cs[k]);
      if (v > 0) spacing.set(Math.round(v), (spacing.get(Math.round(v)) || 0) + 1);
    }
    const rad = parseFloat(cs.borderTopLeftRadius);
    if (rad > 0) radii.set(rad >= r.height / 2 - 1 ? 'pill' : Math.round(rad), (radii.get(rad >= r.height / 2 - 1 ? 'pill' : Math.round(rad)) || 0) + 1);
    if (cs.boxShadow !== 'none') shadows.set(cs.boxShadow, (shadows.get(cs.boxShadow) || 0) + 1);
    if (cs.backdropFilter && cs.backdropFilter !== 'none') blur++;
    if (/gradient/.test(cs.backgroundImage)) {
      const stops = [...cs.backgroundImage.matchAll(/(rgba?\([^)]*\)|oklch\([^)]*\)|color\([^)]*\)|#[0-9a-f]{3,8})/gi)].map((m) => rgba(m[1]));
      const hues = stops.filter((c) => c[3] > 0.2).map(hue).filter((h) => h !== null);
      gradients.push({ selector: sel(el), violet: hues.some((h) => h >= 245 && h <= 295), area: Math.round(r.width * r.height) });
    }
    const bg = rgba(cs.backgroundColor);
    const bordered = parseFloat(cs.borderTopWidth) > 0 && parseFloat(cs.borderLeftWidth) > 0;
    if (rad >= 10 && (cs.boxShadow !== 'none' || bordered) && r.width >= 160 && r.height >= 90 && !['BUTTON', 'A', 'INPUT', 'IMG'].includes(el.tagName)) cards++;
    const isButtonish = el.matches('a, button, [role=button]') && (bg[3] > 0 || bordered || /gradient/.test(cs.backgroundImage)) && r.height < 64;
    if (isButtonish) { buttonsLike++; if (rad >= r.height / 2 - 1) pills++; }
    if (r.width >= 28 && r.width <= 72 && Math.abs(r.width - r.height) <= 2 && rad >= 6 && bg[3] > 0 && el.textContent.trim().length <= 2 && !el.matches('a, button, input, img')) iconTiles++;
  }
  const top = (m, n = 12) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);

  // ---- second-order tells (the model's prior), measured ---------------------
  const oklab = ([r, g, b]) => {
    const f = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    const [R, G, B] = [f(r), f(g), f(b)];
    const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
    const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
    const q = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
    const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * q;
    const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * q;
    const Bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * q;
    return { L, C: Math.hypot(A, Bb), h: (Math.atan2(Bb, A) * 180 / Math.PI + 360) % 360 };
  };
  // Page ground: the background painted under most of the viewport's area.
  const groundCount = new Map();
  for (let y = 20; y < Math.min(document.documentElement.scrollHeight, innerHeight) - 1; y += 97) {
    for (let x = 20; x < innerWidth - 1; x += 131) {
      for (const s of document.elementsFromPoint(x, y)) {
        const c = rgba(getComputedStyle(s).backgroundColor);
        if (c[3] > 0.9) { const k = hex(c); groundCount.set(k, (groundCount.get(k) || 0) + 1); break; }
      }
    }
  }
  const grounds = [...groundCount.entries()].sort((p, q) => q[1] - p[1]);
  const mainGround = grounds[0]?.[0] || '#ffffff';
  const gl = oklab(rgba(mainGround));
  const creamGround = gl.L > 0.9 && gl.C > 0.008 && gl.C < 0.05 && gl.h > 55 && gl.h < 105;

  // Eyebrows: short tracked/uppercase line immediately before a heading.
  const hs = [...document.querySelectorAll('h1, h2')].filter(visible);
  let eyebrows = 0;
  const eyebrowExamples = [];
  for (const h of hs) {
    const prev = h.previousElementSibling;
    if (!prev || !visible(prev)) continue;
    const t = prev.textContent.trim();
    const cs = getComputedStyle(prev);
    const tracked = parseFloat(cs.letterSpacing) / parseFloat(cs.fontSize) > 0.04;
    const upper = cs.textTransform === 'uppercase' || (t === t.toUpperCase() && /[A-Z]/.test(t));
    if (t.length > 0 && t.length <= 40 && parseFloat(cs.fontSize) <= 16 && (tracked || upper || /^0?\d{1,2}([.\s/—–-]|$)/.test(t))) { eyebrows++; if (eyebrowExamples.length < 4) eyebrowExamples.push(t); }
  }
  const sectionCount = Math.max(1, document.querySelectorAll('h2').length);

  // One accented word or phrase inside a headline (italic, colour or family switch).
  const accentedHeadlines = [];
  for (const h of hs) {
    const hcs = getComputedStyle(h);
    for (const c of h.querySelectorAll('em, i, span, strong, b, mark')) {
      const ccs = getComputedStyle(c);
      const ct = c.textContent.trim();
      if (!ct || ct.length > h.textContent.trim().length * 0.6) continue;
      // A step number ("1 Contact") or an icon is a marker, not an accented word.
      if (/^[\d\s.:)–-]+$/.test(ct) || c.closest('[aria-hidden="true"]')) continue;
      if (ccs.fontStyle !== hcs.fontStyle || ccs.color !== hcs.color || ccs.fontFamily !== hcs.fontFamily || ccs.backgroundClip === 'text' || ccs.webkitBackgroundClip === 'text') { accentedHeadlines.push(`${short(h.textContent, 50)} [${ct}]`); break; }
    }
  }

  // Coloured side stripes, zero-offset glows, one-radius share, centred share.
  let sideStripes = 0, glows = 0;
  const stripeExamples = [];
  for (const el of all) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (r.width < 80 || r.height < 32) continue;
    // A stripe beside a quotation, or on a form group / alert that also states the problem in
    // words (GOV.UK's error pattern), is information, not decoration.
    const stripeExempt = el.tagName === 'BLOCKQUOTE' || el.querySelector('input, select, textarea, [role=alert], [aria-invalid=true]') || el.matches('[role=alert], [role=status]');
    for (const side of stripeExempt ? [] : ['Left', 'Right', 'Top']) {
      const w = parseFloat(cs[`border${side}Width`]);
      const others = ['Left', 'Right', 'Top', 'Bottom'].filter((x) => x !== side).map((x) => parseFloat(cs[`border${x}Width`]));
      const col = rgba(cs[`border${side}Color`]);
      if (w >= 2 && w <= 8 && Math.max(...others) <= 1 && col[3] > 0.5 && hue(col) !== null && (side !== 'Top' || parseFloat(cs.borderTopLeftRadius) > 0)) { sideStripes++; if (stripeExamples.length < 3) stripeExamples.push(sel(el)); break; }
    }
    if (cs.boxShadow !== 'none') {
      for (const part of cs.boxShadow.split(/,(?![^(]*\))/)) {
        const nums = part.replace(/(rgba?|oklch|color)\([^)]*\)/g, '').trim().split(/\s+/).map(parseFloat).filter((n) => !isNaN(n));
        const colM = /(rgba?\([^)]*\)|oklch\([^)]*\)|color\([^)]*\))/.exec(part);
        if (nums.length >= 3 && nums[0] === 0 && nums[1] === 0 && nums[2] >= 12 && colM && hue(rgba(colM[1])) !== null) { glows++; break; }
      }
    }
  }
  const roundedVals = [...radii.entries()].filter(([k]) => k !== 'pill' && k >= 4);
  const roundedTotal = roundedVals.reduce((n, [, c]) => n + c, 0);
  const topRadius = roundedVals.sort((p, q) => q[1] - p[1])[0];
  const oneRadius = topRadius && topRadius[0] >= 16 && roundedTotal >= 6 && topRadius[1] / roundedTotal > 0.8 ? topRadius[0] : null;
  const blocks = [...document.querySelectorAll('p, li, h1, h2, h3, h4, blockquote, figcaption')].filter((e) => visible(e) && e.textContent.trim().length > 20);
  const centredShare = blocks.length ? Math.round((blocks.filter((e) => getComputedStyle(e).textAlign === 'center').length / blocks.length) * 100) : 0;

  // Copy cadence: em-dash density, middle-dot meta strings, arrows appended to CTAs, aphorisms.
  const bodyText = document.body.innerText || '';
  const emDashes = (bodyText.match(/—/g) || []).length;
  const middleDots = (bodyText.match(/\S+ · \S+[^\n]* · \S+/g) || []).length;
  const arrowCtas = [...document.querySelectorAll('a, button')].filter((e) => visible(e) && /[→↗➜›»]\s*$/.test(e.textContent.trim())).length;
  const aphorisms = (bodyText.match(/(^|\n|\. )[A-Z][\w\s]{2,24}\. (No|Not|Never|Zero) [\w\s]{2,24}\./g) || []).length;

  // Heading scale: largest heading ÷ the body size; adjacent heading-size steps.
  const bodyPx = [...sizes.entries()].sort((p, q) => q[1] - p[1])[0]?.[0] || 16;
  const hSizes = [...new Set(headings.map((h) => Math.round(h.px)))].sort((p, q) => q - p);
  const headingRatio = hSizes.length ? Math.round((hSizes[0] / bodyPx) * 100) / 100 : null;
  const flatSteps = hSizes.slice(1).map((v, i) => [hSizes[i], v]).filter(([a, b]) => a / b < 1.2).map(([a, b]) => `${a}→${b}`);
  // A lower-rank heading set larger than a higher-rank one (an h2 bigger than the h1) inverts the outline visually.
  const byLevel = {};
  for (const h of headings) if (h.level) byLevel[h.level] = Math.max(byLevel[h.level] || 0, h.px);
  const lv = Object.keys(byLevel).map(Number).sort((p, q) => p - q);
  // ---- numbers and scripts (multilingual.md §2a) ------------------------------------------------------
  // Measured, because the defects a bilingual or financial screen is judged by are invisible in a capture review:
  // two digit systems in one row, numeric columns aligned by text direction instead of place value, decimals that
  // vary down a column, inputs that silently drop Arabic digits, untranslated strings on a language variant.
  const numbers = { mixedDigits: [], columns: [], numberInputs: 0, otherScript: [] };
  {
    const LATIN = /[0-9]/, EASTERN = /[\u0660-\u0669\u06F0-\u06F9]/;
    const BIDI = /[\u200E\u200F\u061C\u202A-\u202E\u2066-\u2069]/g;
    const clean = (t) => t.replace(BIDI, '').replace(/\s+/g, ' ').trim();
    // For mixing, only numerals that are values count: an invoice number or VAT id in Latin digits is an identifier.
    const valueDigits = (t) => clean(t).replace(/\b[A-Z]{2,}[-_]?[\d-]+\b/g, '').replace(/\b\d{9,}\b/g, '');
    const ROWS = 'tr, [role=row], li, dd, [class*=kpi], [class*=stat], [class*=metric], [class*=total]';
    for (const row of document.querySelectorAll(ROWS)) {
      // The innermost row only: a KPI strip and each of its tiles would otherwise both be reported.
      if (!visible(row) || row.querySelector(ROWS)) continue;
      const t = valueDigits(row.innerText || '');
      if (LATIN.test(t) && EASTERN.test(t)) { numbers.mixedDigits.push(`\`${sel(row)}\` "${clean(row.innerText).slice(0, 60)}"`); if (numbers.mixedDigits.length >= 5) break; }
    }
    const NUM = /^[+\-\u2212(]?\s*(?:[A-Z]{3}|[$€£¥₹﷼]|ر\.س|د\.إ)?\s*[+\-\u2212]?[\d\u0660-\u0669\u06F0-\u06F9][\d\u0660-\u0669\u06F0-\u06F9,.\u066B\u066C\s']*\s*(?:%|\u066A|[A-Z]{3}|ر\.س|د\.إ|[KMB])?\)?$/;
    const decimals = (t) => { const m = t.match(/[.\u066B]([\d\u0660-\u0669\u06F0-\u06F9]+)\D*$/); return m ? m[1].length : 0; };
    const align = (cs) => {
      const rtl = cs.direction === 'rtl', ta = cs.textAlign;
      if (ta === 'right' || ta === '-webkit-right') return 'right';
      if (ta === 'left' || ta === '-webkit-left') return 'left';
      if (ta === 'center' || ta === '-webkit-center') return 'center';
      if (ta === 'end') return rtl ? 'left' : 'right';
      return rtl ? 'right' : 'left'; // start, justify, match-parent
    };
    // Judge alignment from paint, not from text-align (a stacked phone cell that is display:flex with
    // justify-content:space-between paints its number flush right under text-align:left), and judge the column, not
    // the cell: place values line up when the digits' right edges coincide from row to row, whatever sits between
    // them and the cell's edge (a pill's padding, a trailing icon, a ::after unit, a padded link or inner box).
    // Only text nodes that hold digits are measured (a Range each), so a ::before label and a currency sign set in
    // a box of its own (accounting style) do not count. Offsets are taken from each cell's content box.
    // Right edges constant and left edges ragged = right; the reverse = left; both ragged about one centre = centre.
    // When every value paints the same width, both edges coincide and the rows cannot tell: then one value is made
    // narrower for a moment (its longest digit run cut to its first character, and put back before anything
    // paints), and the edge that stays put is the one the layout anchors, whatever does the anchoring (text-align,
    // a float, justify-content, a grid track, an inline-flex pill with its padding or icon).
    const DIGIT = /[\d\u0660-\u0669\u06F0-\u06F9]/;
    const digitBox = (cell) => {
      const cs = getComputedStyle(cell), b = cell.getBoundingClientRect();
      let laidOut = null;
      const nodes = [];
      const tw = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT), rg = document.createRange();
      for (let n = tw.nextNode(); n; n = tw.nextNode()) {
        if (!DIGIT.test(n.data) || !n.parentElement) continue;
        const pb = n.parentElement.getBoundingClientRect();
        if (pb.width <= 2 || srOnly(n.parentElement, pb)) continue; // visually hidden text is not painted in the cell
        rg.selectNodeContents(n);
        if (![...rg.getClientRects()].some((q) => q.width > 1 && q.height > 1 && q.right > b.left && q.left < b.right)) continue;
        nodes.push(n);
        for (let e = n.parentElement; e && e !== cell && !laidOut; e = e.parentElement) {
          const ecs = getComputedStyle(e);
          if (!/^(inline|contents)$/.test(ecs.display)) laidOut = ecs;
        }
      }
      const m = { cell, cs, b, nodes, ta: align(laidOut || cs) };
      return Object.assign(m, digitEdges(m));
    };
    // The digits' painted extent, and its offsets from the cell's content box (gl, gr).
    const digitEdges = ({ cell, cs, nodes }) => {
      const b = cell.getBoundingClientRect();
      const L = b.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft), R = b.right - parseFloat(cs.borderRightWidth) - parseFloat(cs.paddingRight);
      let l = Infinity, r = -Infinity;
      const rg = document.createRange();
      for (const n of nodes) {
        rg.selectNodeContents(n);
        for (const q of rg.getClientRects()) if (q.width > 1 && q.height > 1 && q.right > b.left && q.left < b.right) { l = Math.min(l, q.left); r = Math.max(r, q.right); }
      }
      return r > l ? { l, r, L, R, gl: l - L, gr: R - r } : { l: NaN };
    };
    // Narrow one value for a moment and see which edge stays: 'right', 'left', 'center', or null when it cannot tell
    // (a single character, or a cell that resized with its value, as a column held by nothing else does).
    const anchored = (m) => {
      const n = m.nodes.reduce((a, x) => (x.data.trim().length > a.data.trim().length ? x : a));
      const was = n.data, s = was.trim();
      if (s.length < 2) return null;
      let e;
      try { n.data = s[0]; e = digitEdges(m); } finally { n.data = was; }
      if (!(e.r > e.l) || Math.abs(e.L - m.L) > 0.5 || Math.abs(e.R - m.R) > 0.5 || (m.r - m.l) - (e.r - e.l) < 2) return null;
      const dl = e.l - m.l, dr = m.r - e.r; // how far each edge moved inwards
      if (Math.abs(dr) <= 0.5 && dl > 1) return 'right';
      if (Math.abs(dl) <= 0.5 && dr > 1) return 'left';
      if (Math.abs(dl - dr) <= 1) return 'center';
      return null;
    };
    const columnAlign = (cells) => {
      const all = cells.map(digitBox);
      const m = all.filter((x) => x.nodes.length && x.r > x.l);
      if (!m.length) return [...new Set(all.map((x) => x.ta))];
      if (m.length >= 2) {
        const spread = (f) => { const v = m.map(f); return Math.max(...v) - Math.min(...v); };
        const sL = spread((x) => x.gl), sR = spread((x) => x.gr), sC = spread((x) => x.gl - x.gr);
        if (sR <= 1 && sL > 1) return ['right'];
        if (sL <= 1 && sR > 1) return ['left'];
        if (sL > 1 && sR > 1 && sC <= 2) return ['center'];
      }
      // Rows that paint alike need one trial; rows that differ (an icon on some) get a few, narrowest first, so the
      // value holding the column's width is the last one narrowed.
      const same = m.length < 2 || m.every((x) => Math.abs(x.gl - m[0].gl) <= 1 && Math.abs(x.gr - m[0].gr) <= 1);
      const tried = [...m].sort((a, b) => (a.r - a.l) - (b.r - b.l)).slice(0, same ? 3 : 4);
      const got = [];
      for (const x of tried) { const k = anchored(x); if (k) { got.push(k); if (same) break; } }
      return got.length ? [...new Set(got)] : [...new Set(m.map((x) => x.ta))];
    };
    for (const table of document.querySelectorAll('table, [role=table], [role=grid]')) {
      if (!visible(table)) continue;
      const rows = [...table.querySelectorAll('tbody tr, [role=row]')].filter((r) => r.querySelector('td, [role=cell], [role=gridcell]'));
      if (rows.length < 3) continue;
      const cols = Math.max(...rows.map((r) => r.children.length));
      for (let c = 0; c < cols; c++) {
        const cells = rows.map((r) => r.children[c]).filter((x) => x && visible(x));
        const vals = cells.map((x) => clean(x.innerText || '')).filter(Boolean);
        const numeric = vals.filter((v) => NUM.test(v));
        if (vals.length < 3 || numeric.length < vals.length * 0.8) continue;
        // Identifiers (invoice numbers, years, phone numbers) are numeric but not quantities: skip integer-only
        // columns whose values all have the same length, like IDs, unless they carry currency or grouping.
        const quantity = numeric.some((v) => /[,.\u066B\u066C%\u066A$€£¥₹﷼]|ر\.س|[A-Z]{3}/.test(v)) || new Set(numeric.map((v) => v.length)).size > 1;
        if (!quantity) continue;
        const cs = getComputedStyle(cells[0]);
        const head = table.querySelector(`thead th:nth-child(${c + 1}), [role=columnheader]:nth-child(${c + 1})`);
        const name = clean(head?.innerText || '') || `column ${c + 1}`;
        const issues = [];
        const al = columnAlign(cells.filter((x) => NUM.test(clean(x.innerText || ''))));
        if (!(al.length === 1 && al[0] === 'right')) issues.push(`aligned ${al.join('/')} (numbers align right in both directions)`);
        const fv = cs.fontVariantNumeric + ' ' + cs.fontFeatureSettings;
        if (!/tabular-nums|"tnum"/.test(fv)) issues.push('no tabular-nums');
        const dec = new Set(numeric.map(decimals));
        if (dec.size > 1) issues.push(`decimals vary (${[...dec].sort().join(', ')} places)`);
        if (issues.length) numbers.columns.push(`"${name.slice(0, 30)}": ${issues.join('; ')}`);
        if (numbers.columns.length >= 6) break;
      }
    }
    const lang = (document.documentElement.lang || '').toLowerCase();
    const rtlLang = /^(ar|fa|ur|he|ps|ku|sd|ug|yi)\b/.test(lang) || document.documentElement.dir === 'rtl';
    if (rtlLang || /^(ar|fa|ur)/.test(lang)) numbers.numberInputs = document.querySelectorAll('input[type=number]').length;
    // Arabic-script text on a Latin-script page (by its lang, or by the majority of its letters when it has none),
    // in text or in placeholders and labels, with no lang of its own.
    const body = document.body.innerText || '';
    const arabicLetters = (body.match(/[\u0600-\u06FF]/g) || []).length, latinLetters = (body.match(/[A-Za-z\u00C0-\u024F]/g) || []).length;
    const latinPage = lang ? !/^(ar|fa|ur|ps|ku|sd|ug)\b/.test(lang) : latinLetters > arabicLetters * 2;
    if (latinPage) {
      const arabicOwn = (el) => { const o = el.closest('[lang]'); return o && o !== document.documentElement && /^(ar|fa|ur|ps|ku|sd|ug)/i.test(o.lang); };
      const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = tw.nextNode(); n && numbers.otherScript.length < 6; n = tw.nextNode()) {
        const t = clean(n.data);
        // A string mixing both scripts ("سند · Sanad") is usually a bilingual brand lockup, a proper name.
        if (!/[\u0600-\u06FF]{2,}/.test(t) || /[A-Za-z]{3,}/.test(t) || !n.parentElement || !visible(n.parentElement) || arabicOwn(n.parentElement)) continue;
        numbers.otherScript.push(`\`${sel(n.parentElement)}\` "${t.slice(0, 40)}"`);
      }
      for (const el of document.querySelectorAll('[placeholder], [aria-label], [title], input[type=submit][value], input[type=button][value]')) {
        if (numbers.otherScript.length >= 6) break;
        const t = clean(el.getAttribute('placeholder') || el.getAttribute('aria-label') || el.getAttribute('title') || el.value || '');
        if (/[\u0600-\u06FF]{2,}/.test(t) && !/[A-Za-z]{3,}/.test(t) && visible(el) && !arabicOwn(el)) numbers.otherScript.push(`\`${sel(el)}\` placeholder/label "${t.slice(0, 40)}"`);
      }
    }
    numbers.pageLang = lang || (latinPage ? 'none (Latin text)' : 'none');
  }

  // ---- dead bands: tall horizontal strips with nothing in them ----------------------------------------
  // Occupancy of the document height by text, media, controls and background images, in 8px strips. A run of
  // empty strips taller than about half a screen is a dead band (a 100svh hero on a tall screen, a parallax gap,
  // a spacer), unless a background image fills it.
  const deadBands = [];
  {
    const sy = scrollY, STEP = 8;
    const docH = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    const occ = new Uint8Array(Math.ceil(docH / STEP) + 1);
    const fill = (top, bottom) => { for (let y = Math.max(0, Math.floor((top + sy) / STEP)); y <= Math.min(occ.length - 1, Math.floor((bottom + sy) / STEP)); y++) occ[y] = 1; };
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      if (!n.data.trim() || !n.parentElement || !visible(n.parentElement)) continue;
      const rg = document.createRange(); rg.selectNodeContents(n);
      for (const b of rg.getClientRects()) if (b.width > 0) fill(b.top, b.bottom);
    }
    for (const el of document.body.querySelectorAll('*')) {
      const media = /^(IMG|SVG|VIDEO|CANVAS|IFRAME|INPUT|SELECT|TEXTAREA|BUTTON|PICTURE|OBJECT|EMBED)$/i.test(el.tagName);
      if (!media && !getComputedStyle(el).backgroundImage.includes('url(')) continue;
      if (!visible(el)) continue;
      const b = el.getBoundingClientRect();
      if (b.width >= 8 && b.height >= 8) fill(b.top, b.bottom);
    }
    const minRun = Math.max(360, (initialViewportHeight || 900) * 0.45);
    let start = null;
    for (let i = 0; i <= occ.length; i++) {
      const empty = i < occ.length && !occ[i];
      if (empty && start === null) start = i;
      else if (!empty && start !== null) {
        const top = start * STEP, h = (i - start) * STEP;
        // Leading and trailing space (above the first content, below the footer) is not a band between things.
        if (h >= minRun && start > 0 && i < occ.length) {
          let owner = null;
          for (const el of document.body.querySelectorAll('section, header, main > *, body > *, div')) {
            const b = el.getBoundingClientRect();
            if (b.top + sy <= top && b.bottom + sy >= top + h && b.width >= innerWidth * 0.5 && (!owner || b.height < owner.h)) owner = { el, h: b.height };
          }
          deadBands.push(`${Math.round(h)}px empty from y=${Math.round(top)}${owner ? ` inside \`${sel(owner.el)}\`` : ''}`);
        }
        start = null;
      }
      if (deadBands.length >= 4) break;
    }
  }

  // ---- headline widows: a heading whose last line holds one word -----------------------------------
  // Measured per word with Range rects, so it is the wrap this width actually produced.
  const widows = [];
  for (const h of document.querySelectorAll('h1, h2, h3, [role=heading]')) {
    if (!visible(h) || widows.length >= 6) continue;
    const words = [];
    const walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      for (const m of n.data.matchAll(/\S+/g)) {
        const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
        const b = r.getClientRects()[0];
        if (b && b.width > 0) words.push({ w: m[0], top: b.top, h: b.height });
      }
    }
    if (words.length < 4) continue;
    const lines = [];
    for (const w of words) { const l = lines.find((x) => Math.abs(x.top - w.top) < w.h * 0.5); if (l) l.words.push(w.w); else lines.push({ top: w.top, words: [w.w] }); }
    lines.sort((x, y) => x.top - y.top);
    const last = lines[lines.length - 1];
    // A lone short word ("it.", "AI") is the classic widow; a single long compound can be deliberate.
    if (lines.length >= 2 && last.words.length === 1 && last.words[0].replace(/\W/g, '').length <= 12) {
      widows.push(`${h.tagName.toLowerCase()} "${words.slice(0, 6).map((w) => w.w).join(' ')}${words.length > 6 ? ' …' : ''}" ends with "${last.words[0]}" alone on line ${lines.length}`);
    }
  }

  const headingInversions = [];
  for (let i = 0; i < lv.length; i++) for (let j = i + 1; j < lv.length; j++) if (byLevel[lv[j]] > byLevel[lv[i]] + 1) headingInversions.push(`h${lv[j]} ${Math.round(byLevel[lv[j]])}px > h${lv[i]} ${Math.round(byLevel[lv[i]])}px`);

  // Browser surfaces left at their defaults; custom properties used but never defined.
  let cssText = '';
  const blocked = [];
  for (const sh of document.styleSheets) {
    try { for (const r of sh.cssRules) cssText += r.cssText + '\n'; } catch { blocked.push(sh.href); }
  }
  for (const el of document.querySelectorAll('[style]')) cssText += el.getAttribute('style') + ';\n';
  const surfaces = { selection: /::selection/.test(cssText), 'accent-color': /accent-color\s*:/.test(cssText), 'text-underline-offset': /text-underline-offset\s*:/.test(cssText), 'tabular numerals': /tabular-nums|"tnum"/.test(cssText), 'focus-visible': /:focus-visible/.test(cssText), 'color-scheme': /color-scheme\s*:/.test(cssText) || !!document.querySelector('meta[name="color-scheme"]') };
  const defined = new Set([...cssText.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
  // Component libraries set some custom properties from script only while a component is open (Radix popper sizes,
  // Floating UI, carousels, shadcn skeleton/sidebar widths); they are not typos.
  const RUNTIME_VARS = /^--(radix|reka|headlessui|floating|bits|kb|ark|zag|base-ui|mantine|chakra|tw|skeleton|sidebar|embla|vaul|sonner|cmdk|swiper|motion|framer)-/;
  const undefinedVars = [...new Set([...cssText.matchAll(/var\(\s*(--[\w-]+)\s*\)/g)].map((m) => m[1]).filter((v) => !defined.has(v) && !RUNTIME_VARS.test(v)))];
  const transitionAll = /transition(-property)?\s*:\s*all\b/.test(cssText);

  // ---- app-surface tells (reported only for --kind app) ---------------------
  const cardEls = all.filter((el) => {
    if (['BUTTON', 'A', 'INPUT', 'IMG', 'TD', 'TH', 'TR', 'LI'].includes(el.tagName)) return false;
    const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    const bordered = parseFloat(cs.borderTopWidth) > 0 && parseFloat(cs.borderLeftWidth) > 0;
    return parseFloat(cs.borderTopLeftRadius) >= 8 && (cs.boxShadow !== 'none' || bordered) && r.width >= 120 && r.height >= 60 && parseFloat(cs.paddingTop) >= 12;
  });
  const outerCards = cardEls.filter((c) => !cardEls.some((o) => o !== c && o.contains(c)));
  const charsInCards = outerCards.reduce((n, c) => n + (c.innerText || '').replace(/\s+/g, '').length, 0);
  const pageChars = Math.max(1, (document.body.innerText || '').replace(/\s+/g, '').length);
  const kpiTiles = cardEls.filter((c) => /[+−-]?\d+(\.\d+)?\s?%/.test(c.innerText || '') && [...c.querySelectorAll('*')].some((x) => parseFloat(getComputedStyle(x).fontSize) >= 24)).length;
  // Greetings in the languages this skill has met (Arabic interfaces greet as often as English ones).
  const greeting = /(^|[\s,.!])(welcome back|good (morning|afternoon|evening)|hello|hi|hey|bonjour|bonsoir|bienvenue|hola|buenos d[ií]as|bienvenid[oa]|hallo|guten (morgen|tag|abend)|willkommen|ol[aá]|bom dia|bem-vind[oa]|merhaba|g[uü]nayd[ıi]n|ho[sş] geldin|مرحب[\u0600-\u06FF\u064B-\u065F]*|أهل[\u0600-\u06FF\u064B-\u065F]*|اهل[\u0600-\u06FF]*|صباح الخير|مساء الخير|هلا|سلام|خوش آمدید|درود)[\s,،!]+\S+/i.test(hs.map((h) => h.textContent).join(' ') + ' ' + [...document.querySelectorAll('h1, [class*=title]')].slice(0, 3).map((e) => e.textContent).join(' '));
  const iconOnly = [...document.querySelectorAll('button, [role=button], a')].filter((b) => visible(b) && !b.textContent.trim() && b.getBoundingClientRect().width <= 48).length;
  // A chart is labelled by text inside it, axis/tick/legend text beside it, or an accessible name: aria-labelledby
  // that resolves to text, aria-label, a <title>, or the title of a role="img". An SVG or canvas hidden from assistive
  // technology (aria-hidden, role none/presentation) is decoration, not a chart (stage-2 S5 G4: 3 → 0 on its prototype).
  const accName = (g) => {
    const byIds = (g.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean).map((id) => { const t = document.getElementById(id); return t ? (t.getAttribute('aria-label') || t.textContent || '').trim() : ''; }).join(' ').trim();
    return byIds || (g.getAttribute('aria-label') || '').trim() || (g.getAttribute('role') === 'img' ? (g.getAttribute('title') || '').trim() : '') || (g.tagName === 'svg' ? ([...g.children].find((c) => c.tagName === 'title')?.textContent || '').trim() : '');
  };
  const charts = [...document.querySelectorAll('svg, canvas')].filter((g) => {
    if (g.getAttribute('aria-hidden') === 'true' || /^(none|presentation)$/.test(g.getAttribute('role') || '')) return false;
    const r = g.getBoundingClientRect();
    if (r.width < 60 || r.height < 24 || !visible(g)) return false;
    const hasData = g.tagName === 'svg' && g.querySelector('path, rect, polyline, circle');
    const labelled = g.querySelector?.('text') || accName(g) || g.querySelector?.('title') || (g.parentElement && /\d/.test([...g.parentElement.querySelectorAll('[class*=axis], [class*=tick], [class*=legend]')].map((x) => x.textContent).join('')));
    return (hasData || g.tagName === 'CANVAS') && !labelled;
  }).length;
  const controls = [...document.querySelectorAll('button, input:not([type=checkbox]):not([type=radio]):not([type=hidden]), select')].filter(visible).map((c) => Math.round(c.getBoundingClientRect().height));
  const maxPx = Math.max(...[...sizes.keys()], 0);
  const hoverMoves = (cssText.match(/:hover[^{]*\{[^}]*transform\s*:\s*(translate|scale)/g) || []).length;
  const h1el = document.querySelector('h1');
  const badgeAboveH1 = !!h1el && [h1el.previousElementSibling, h1el.parentElement?.previousElementSibling].some((p) => {
    if (!p) return false; const r = p.getBoundingClientRect(); const cs = getComputedStyle(p);
    return r.height > 0 && r.height < 44 && parseFloat(cs.borderTopLeftRadius) >= r.height / 2 - 1 && p.textContent.trim().length > 0;
  });

  const spacingVals = [...spacing.keys()];
  return {
    totalChars,
    type: {
      sizes: [...sizes.entries()].sort((a, b) => b[0] - a[0]).map(([px, chars]) => ({ px, chars })),
      families: top(families).map(([family, chars]) => ({ family, share: Math.round((chars / Math.max(totalChars, 1)) * 100), saturated: saturated[family.toLowerCase()] || null })),
      weights: top(weights).map(([w, chars]) => ({ weight: w, share: Math.round((chars / Math.max(totalChars, 1)) * 100) })),
      smallText: smallText.slice(0, 10), caps: caps.slice(0, 10), measure: measure.slice(0, 10), centred: centred.slice(0, 10), justified: justified.slice(0, 5), tightLeading: tightLeading.slice(0, 10),
    },
    colour: { textColours: top(textColours, 20).map(([c, chars]) => ({ colour: c, chars })) },
    contrast: { failing: Object.values(contrast.filter((c) => c.ratio < c.need).reduce((acc, c) => { const k = c.selector + c.fg + c.bg; acc[k] = acc[k] ? { ...acc[k], times: acc[k].times + 1 } : { ...c, times: 1 }; return acc; }, {})).sort((a, b) => a.ratio - b.ratio), failingCount: contrast.filter((c) => c.ratio < c.need).length, checked: contrast.length, unknownGround: unknownGround.slice(0, 15), unknownCount: unknownGround.length },
    headings, skippedLevels: skipped, landmarks,
    title: document.title, lang: document.documentElement.lang || null,
    targets: { total: targets.length, under24: small.filter((s) => !s.spacingException), under24SpacingOk: small.filter((s) => s.spacingException).length, under44, under44List, under48: under48Els.length, under48List: under48Els.slice(0, 6).map((t) => ({ selector: sel(t.el), w: Math.round(t.r.width), h: Math.round(t.r.height), name: short(t.el.getAttribute('aria-label') || t.el.textContent || '', 24) })) },
    fakeControls: fakeControls.slice(0, 15), fakeControlCount: fakeControls.length,
    clippedText: clippedText.slice(0, 10), clippedCount: clippedText.length, clippedInk: clippedText.map((c) => c.inkK).filter(Boolean), colourOnly: colourOnly.slice(0, 10), colourOnlyCount: colourOnly.length, bareEmpty, unavailableFamilies, mono,
    images,
    system: {
      radii: top(radii, 10).map(([r, n]) => ({ radius: r, count: n })), shadowKinds: shadows.size, shadowTop: top(shadows, 4).map(([s, n]) => ({ shadow: s, count: n })),
      spacingDistinct: spacingVals.length, spacingOn4: Math.round((spacingVals.filter((v) => v % 4 === 0).length / Math.max(spacingVals.length, 1)) * 100),
    },
    signals: {
      gradientText, emoji: emoji.slice(0, 10), cliches: [...cliches], statClaims: statClaims.slice(0, 10), gradients: gradients.length, violetGradients: gradients.filter((g) => g.violet).length,
      backdropBlur: blur, cards, pills, buttonsLike, iconTiles, domNodes: all.length,
      mainGround, creamGround, eyebrows, eyebrowExamples, sectionCount, accentedHeadlines: accentedHeadlines.slice(0, 5), sideStripes, stripeExamples, glows, oneRadius, centredShare, nearMisses, leftEdges: edges.length, radiusMismatch, radiusFarIn,
      emDashes, middleDots, arrowCtas, aphorisms, headingRatio, bodyPx, flatSteps, headingInversions, widows, deadBands, numbers,
      cardTextShare: Math.round((charsInCards / pageChars) * 100), outerCards: outerCards.length, kpiTiles, greeting, iconOnly, unlabelledCharts: charts,
      controlHeights: [...new Set(controls)].sort((x, y) => x - y), maxPx, hoverMoves, badgeAboveH1,
    },
    css: { surfaces, undefinedVars: undefinedVars.slice(0, 12), transitionAll, unreadableSheets: blocked.filter(Boolean).length },
  };
}

/** Elements that are present and sized but invisible — run with JavaScript disabled. */
export function hiddenContent() {
  const out = [];
  for (const el of document.body.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) continue;
    if (!(parseFloat(cs.opacity) < 0.05 || cs.visibility === 'hidden')) continue;
    if (el.closest('[aria-hidden=true], dialog:not([open]), [hidden], [popover]')) continue;
    const hasContent = el.textContent.trim().length > 0 || el.querySelector('img, svg, video, picture') || el.tagName === 'IMG';
    if (!hasContent) continue;
    // report only the outermost hidden element
    const p = el.parentElement;
    const pcs = p && getComputedStyle(p);
    if (p && (parseFloat(pcs.opacity) < 0.05 || pcs.visibility === 'hidden')) continue;
    const cls = [...el.classList].slice(0, 2).map((c) => '.' + c).join('');
    out.push(el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + cls);
  }
  return out;
}
