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
    if (px < 12 && n > 2) smallText.push({ selector: sel(el), px, text: short(text, 40) });
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
    const range = document.createRange();
    range.selectNodeContents(el);
    const box = [...range.getClientRects()].find((r) => r.width > 1 && r.height > 1) || el.getBoundingClientRect();
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
  const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6,[role=heading]')].filter(visible).map((h) => ({
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
    // WCAG 2.5.8 spacing exception: a 24px circle on the target's centre touches no other target.
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const crowded = targets.some((o) => o !== t && !o.el.contains(t.el) && !t.el.contains(o.el) &&
      Math.max(o.r.left - cx, 0, cx - o.r.right) ** 2 + Math.max(o.r.top - cy, 0, cy - o.r.bottom) ** 2 < 12 * 12 * 4);
    small.push({ selector: sel(t.el), w: Math.round(r.width), h: Math.round(r.height), name: short(t.el.getAttribute('aria-label') || t.el.textContent || t.el.getAttribute('title') || '', 30), spacingException: !crowded });
  }
  const under44 = targets.filter((t) => !t.inline && (t.r.width < 44 || t.r.height < 44)).length;

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
  const clippedText = [];
  for (const [el] of textEls) {
    if (!visible(el)) continue;
    const cs = getComputedStyle(el);
    if (cs.textOverflow === 'ellipsis' || cs.webkitLineClamp !== 'none' && cs.webkitLineClamp) continue;
    const r = el.getBoundingClientRect();
    if (r.width <= 2 || r.height <= 2) continue; // visually-hidden text
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const pc = getComputedStyle(p);
      const cx = ['hidden', 'clip'].includes(pc.overflowX), cy = ['hidden', 'clip'].includes(pc.overflowY);
      if (!cx && !cy) continue;
      const q = p.getBoundingClientRect();
      if (q.width <= 2 || q.height <= 2) break;
      const outX = cx && (r.right > q.right + 2 || r.left < q.left - 2);
      const outY = cy && (r.bottom > q.bottom + 2 || r.top < q.top - 2);
      if (outX || outY) clippedText.push({ selector: sel(el), by: sel(p), text: short(el.textContent, 30) });
      break;
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
    const cell = el.closest('td, li, [role=cell], [role=gridcell]') || el.parentElement;
    const words = cell ? cell.textContent.replace(/\s+/g, '').length : 0;
    if (words === 0) colourOnly.push({ selector: sel(el), colour: hex(c) });
  }

  // ---- empty states written as a bare phrase --------------------------------
  const bareEmpty = [];
  for (const [el, raw] of textEls) {
    const t = raw.trim();
    if (/^(no (data|records?|results?|items?|entries|activity)( (found|yet|available))?|nothing (here|to (show|see))( yet)?|empty|n\/a)\.?$/i.test(t) && visible(el)) bareEmpty.push({ selector: sel(el), text: t });
  }

  // ---- families that are declared but not actually available --------------
  const probe = (family) => {
    const span = document.createElement('span');
    span.textContent = 'mmmmmmmmmwwwwwlliI10@#';
    span.style.cssText = 'position:absolute;left:-9999px;top:0;font-size:48px;white-space:nowrap';
    document.body.appendChild(span);
    const w = (f) => { span.style.fontFamily = f; return span.getBoundingClientRect().width; };
    const res = ['monospace', 'serif', 'sans-serif'].every((fb) => Math.abs(w(`"${family}", ${fb}`) - w(fb)) < 0.5);
    span.remove();
    return res; // true = renders identically to every fallback = not available
  };
  const GENERIC = /^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-sans-serif|ui-serif|ui-monospace|ui-rounded|emoji|math|fangsong|-apple-system|blinkmacsystemfont|inherit|initial)$/i;
  const unavailableFamilies = [...families.keys()].filter((f) => !GENERIC.test(f) && families.get(f) / Math.max(totalChars, 1) >= 0.02 && probe(f));

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

  // Browser surfaces left at their defaults; custom properties used but never defined.
  let cssText = '';
  const blocked = [];
  for (const sh of document.styleSheets) {
    try { for (const r of sh.cssRules) cssText += r.cssText + '\n'; } catch { blocked.push(sh.href); }
  }
  for (const el of document.querySelectorAll('[style]')) cssText += el.getAttribute('style') + ';\n';
  const surfaces = { selection: /::selection/.test(cssText), 'accent-color': /accent-color\s*:/.test(cssText), 'text-underline-offset': /text-underline-offset\s*:/.test(cssText), 'tabular numerals': /tabular-nums|"tnum"/.test(cssText), 'focus-visible': /:focus-visible/.test(cssText), 'color-scheme': /color-scheme\s*:/.test(cssText) || !!document.querySelector('meta[name="color-scheme"]') };
  const defined = new Set([...cssText.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
  const undefinedVars = [...new Set([...cssText.matchAll(/var\(\s*(--[\w-]+)\s*\)/g)].map((m) => m[1]).filter((v) => !defined.has(v)))];
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
  const greeting = /\b(welcome back|good (morning|afternoon|evening)|hello|hi),?\s+\w+/i.test(hs.map((h) => h.textContent).join(' ') + ' ' + [...document.querySelectorAll('h1, [class*=title]')].slice(0, 3).map((e) => e.textContent).join(' '));
  const iconOnly = [...document.querySelectorAll('button, [role=button], a')].filter((b) => visible(b) && !b.textContent.trim() && b.getBoundingClientRect().width <= 48).length;
  const charts = [...document.querySelectorAll('svg, canvas')].filter((g) => {
    const r = g.getBoundingClientRect();
    if (r.width < 60 || r.height < 24 || !visible(g)) return false;
    const hasData = g.tagName === 'svg' && g.querySelector('path, rect, polyline, circle');
    const labelled = g.querySelector?.('text') || g.getAttribute('aria-label') || g.querySelector?.('title') || (g.parentElement && /\d/.test([...g.parentElement.querySelectorAll('[class*=axis], [class*=tick], [class*=legend]')].map((x) => x.textContent).join('')));
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
    targets: { total: targets.length, under24: small.filter((s) => !s.spacingException), under24SpacingOk: small.filter((s) => s.spacingException).length, under44 },
    fakeControls: fakeControls.slice(0, 15), fakeControlCount: fakeControls.length,
    clippedText: clippedText.slice(0, 10), clippedCount: clippedText.length, colourOnly: colourOnly.slice(0, 10), colourOnlyCount: colourOnly.length, bareEmpty, unavailableFamilies,
    images,
    system: {
      radii: top(radii, 10).map(([r, n]) => ({ radius: r, count: n })), shadowKinds: shadows.size, shadowTop: top(shadows, 4).map(([s, n]) => ({ shadow: s, count: n })),
      spacingDistinct: spacingVals.length, spacingOn4: Math.round((spacingVals.filter((v) => v % 4 === 0).length / Math.max(spacingVals.length, 1)) * 100),
    },
    signals: {
      gradientText, emoji: emoji.slice(0, 10), cliches: [...cliches], statClaims: statClaims.slice(0, 10), gradients: gradients.length, violetGradients: gradients.filter((g) => g.violet).length,
      backdropBlur: blur, cards, pills, buttonsLike, iconTiles, domNodes: all.length,
      mainGround, creamGround, eyebrows, eyebrowExamples, sectionCount, accentedHeadlines: accentedHeadlines.slice(0, 5), sideStripes, stripeExamples, glows, oneRadius, centredShare,
      emDashes, middleDots, arrowCtas, aphorisms, headingRatio, bodyPx, flatSteps,
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
