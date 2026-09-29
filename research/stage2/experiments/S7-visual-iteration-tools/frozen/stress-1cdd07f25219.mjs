#!/usr/bin/env node
/**
 * Real-content stress: mutate the rendered page the way real content and real networks do, and report what breaks.
 * Works on any page without per-site code: text is mutated in place (text nodes only, so the page's own markup and
 * scripts stay), repeated items are found by structure, network faults are injected by request type.
 *
 *   node stress.mjs --url http://localhost:3000/products
 *   node stress.mjs --base http://localhost:3000 --paths / /pricing [--widths 390,768,1280] [--only pseudo,rtl] [--out stress]
 *
 * Mutations (--only / --skip-mutations take a comma list; default all):
 *   pseudo     pseudo-localisation: accents, [brackets], +35% length on running text and more on short labels
 *              (+100% up to 10 characters, +80% to 20, +60% to 30, +40% to 50: short strings grow most in
 *              translation), the growth put into long compound words
 *   long       in data-like texts (list items, table cells, names, e-mails, URLs; or --targets) the longest word
 *              becomes a long unbroken token: a 49-letter name, a 70-character e-mail address where the text had
 *              one, an 84-character URL where it had one (no break points anywhere)
 *   empty      optional fields left empty: in repeated items (cards, rows, list entries) and table cells one text
 *              slot per item is blanked, a different slot in each item
 *   numbers    every figure becomes a very large or a negative long amount, keeping its currency sign or unit
 *              ("£39" → "£1,234,567,890.99", "12%" → "-98,765.43%"); years and times are left alone
 *   no-images  every image request blocked (img, picture, CSS backgrounds): broken images, collapsed boxes,
 *              and text that sat on a photograph without a fallback colour
 *   rtl        dir="rtl" lang="ar": first what did not mirror (physical left/right: an icon or a badge that stays
 *              on the left, text-align: left), then short and long texts swapped for Arabic samples. A page that is
 *              already right-to-left is checked the other way: physical text-align: left as it stands, then the page
 *              flipped to dir="ltr" (its other locale, when it shares the CSS) for what stays put (physical right,
 *              text-align: right); its text and lang are left as they are, and only mirroring is reported. When the flip does not take (a direction declared !important), the position
 *              check is skipped and the run says so
 *   list-0, list-1, list-500   every repeated list (cards, rows, results; auto-detected, or --list) emptied, cut
 *              to one item, or grown to 500 by cloning: the empty state, the lone card, the long page
 *   slow       throttled network and CPU while loading (562 ms RTT, 1.4 Mbit/s down, 4× CPU): a filmstrip of the
 *              first seconds, layout shifts with their sources, loading indicators seen, fonts still loading
 *   errors     every fetch/XHR answered 500: blank sections, "undefined" / "NaN" / "[object Object]", no message
 *   offline    every fetch/XHR aborted (the network dropped after the page loaded)
 * Network mutations (slow, errors, offline) run at the first width only unless --all-widths.
 *
 * Options
 *   --widths list   default 390,768,1280: a phone, a tablet (where desktop navigation and multi-column layouts are
 *                   narrowest, and longer text runs out of room first) and a laptop (under 768: phone emulation)
 *   --scope sel     mutate only inside this element (default body)
 *   --targets sel   text mutations only in these elements (e.g. ".product-name, .price, td")
 *   --skip sel      never mutate these (always skipped: code, pre, kbd, samp, [translate=no], .notranslate)
 *   --list sel      the repeated containers for list-* and empty (default: auto-detected, the 4 largest: three or more
 *                   siblings of one kind and one inner structure, outside nav/header/footer; never paragraphs, table
 *                   cells or page sections). Authored cards also qualify: on a brochure page, list-0/-500 and long are
 *                   mostly leads to dismiss; point them at the data (--list, --targets) on product and app routes
 *   --api glob      requests that slow/errors/offline treat as data (default: every fetch and XHR)
 *   --expand N      growth of running text for pseudo, in % (default 35)
 *   --no-full       skip the full-page JPEG per mutation (the sheet and crops are still written)
 *   --storage, --chrome   as in the other scripts
 *
 * After each mutation the page is measured with sweep.mjs's probe (overflow and its culprit, text past the edge,
 * clipped and truncated text, protrusion out of a drawn box, overlapping text, squeezed controls, distorted images)
 * and compared with the unmutated page at the same width: only what the mutation changed is reported, keyed by
 * check and element kind (positions dropped, so a fault the page already had is never reported as new). Mutation-specific checks add: text that is now "undefined"/"NaN"/"null"/"[object Object]"/"Invalid Date",
 * controls squeezed under 24 px or wrapping to 3+ lines, sections that lost their text with no message on screen,
 * text unreadable without its image, elements that did not mirror, and layout shifts while loading.
 *
 * Writes <out>/<slug>-stress.md and .json (per mutation and width: new findings with element, detail and box),
 * <out>/<slug>-stress-sheet.jpg (each mutation that broke something, scrolled to its worst finding, boxed and
 * numbered), <out>/<slug>-slow.jpg (the loading filmstrip), <out>/<slug>/<mutation>-<width>.jpg full pages, and
 * 1:1 crops in <out>/<slug>/crops/; the JSON records the browser build. Exit code 1 when any mutation produced a ✗.
 *
 * Leads, not verdicts: a mutation is harsher than most real content on purpose. A truncation that is designed
 * (a one-line ellipsis with the full text in a title or on the detail page) is fine; say which you dismissed and why.
 */
import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs, asList, launch, open, settle, slugFor, urlFor } from './lib/env.mjs';
import { measureAt, markFindings, drawSheet, prepare, evidenceShot, evidenceCrop, browserBuild } from './sweep.mjs';

export const ALL = ['pseudo', 'long', 'empty', 'numbers', 'no-images', 'rtl', 'list-0', 'list-1', 'list-500', 'slow', 'errors', 'offline'];
const NETWORK = new Set(['slow', 'errors', 'offline']);
const MARK = { error: '✗', warn: '△', info: '·' };
const WEIGHT = { error: 3, warn: 1, info: 0 };
const ALWAYS_SKIP = 'script,style,noscript,template,code,pre,kbd,samp,textarea,svg,math,[translate=no],.notranslate,[contenteditable=""],[contenteditable=true],[class*=logo i],[id*=logo i],[class*=wordmark i],header a[href="/"],[data-stress-skip]';

// Arabic samples (Modern Standard Arabic), by length. Digits in the original text are kept.
const AR = {
  short: ['الرئيسية', 'الأسعار', 'حسابي', 'المنتجات', 'اتصل بنا', 'ابدأ الآن', 'تسجيل الدخول', 'المزيد', 'بحث', 'إرسال', 'القائمة', 'السلة', 'الإعدادات', 'المساعدة', 'التفاصيل'],
  medium: ['جدول مناوبات يعمل به فريقك فعلاً', 'عرض أسبوع نموذجي', 'ابدأ تجربتك المجانية اليوم', 'كل ما تحتاجه في مكان واحد', 'آخر تحديث قبل خمس دقائق', 'الشروط والأحكام وسياسة الخصوصية'],
  long: 'أنشئ جدول مناوبات أسبوعياً في دقائق، وبدّل التغطية من هاتفك، واطّلع على ساعات العمل الإضافية قبل أن تحدث. يعمل مع جداول البيانات التي تستخدمها اليوم، ويرسل التنبيهات إلى الفريق تلقائياً، ويحفظ كل تغيير مع اسم من قام به ووقته.',
};

/* ------------------------------------------------------------------------------------------------------------ */
/* In-page functions (serialised by page.evaluate: self-contained)                                               */
/* ------------------------------------------------------------------------------------------------------------ */

/** Text mutations: pseudo, long, empty, numbers, rtl-text. Returns what was changed. */
export function mutateText({ kind, scope, targets, skip, expand = 35, ar }) {
  const root = (scope && document.querySelector(scope)) || document.body;
  const SKIP = skip;
  const isSkipped = (el) => !el || el.closest(SKIP);
  // Initials in an avatar or monogram ("AM" in a small round box) are not translated and do not grow.
  const initials = (n) => {
    if (!/^[A-ZÀ-Þ]{1,3}$/.test(n.data.trim())) return false;
    for (let e = n.parentElement, d = 0; e && e !== document.body && d < 3; e = e.parentElement, d++) {
      if (/avatar|initials|monogram/i.test(`${e.id} ${typeof e.className === 'string' ? e.className : ''}`)) return true;
      const r = e.getBoundingClientRect(), c = getComputedStyle(e);
      if (r.width <= 64 && r.height <= 64 && r.width > 0 && parseFloat(c.borderTopLeftRadius) >= 0.3 * Math.min(r.width, r.height)) return true;
    }
    return false;
  };
  const nodes = [];
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    if (!n.data.trim()) continue;
    const el = n.parentElement;
    if (isSkipped(el) || (targets && !el.closest(targets))) continue;
    nodes.push(n);
  }
  const fields = [...root.querySelectorAll('input[type=submit], input[type=button], input[type=reset], input[placeholder], textarea[placeholder]')]
    .filter((e) => !(e.closest(SKIP) && !e.matches('textarea')) && (!targets || e.closest(targets)));

  let changed = 0;
  const note = [];
  if (kind === 'pseudo') {
    const ACC = { a: 'á', e: 'é', i: 'í', o: 'ö', u: 'ü', c: 'ç', n: 'ñ', s: 'š', y: 'ý', z: 'ž', A: 'Á', E: 'É', I: 'Î', O: 'Ö', U: 'Û', C: 'Ç', N: 'Ñ', S: 'Š', Y: 'Ý', Z: 'Ž' };
    const FILL = ['ünd', 'dér', 'wérdén', 'fǘr', 'Vérsíçhérüñg', 'Éínstéllüñgén', 'Kündénkönto'];
    const COMPOUND = ['vérwáltüñg', 'schäft', 'übérsícht', 'éínstéllüñg', 'kóñtó'];
    const grow = (len) => (len <= 10 ? 1.0 : len <= 20 ? 0.8 : len <= 30 ? 0.6 : len <= 50 ? 0.4 : expand / 100);
    const pseudo = (t) => {
      const core = t.trim();
      if (!core || /^[\d\s.,:;%£$€¥+\-−/()]+$/.test(core)) return t;
      let s = core.replace(/[a-zA-Z]/g, (ch) => ACC[ch] || ch);
      let extra = Math.ceil(core.length * grow(core.length));
      // Grow the longest word into a compound (German-style), then add words for the rest.
      const words = s.split(/(\s+)/);
      let li = 0; words.forEach((w, i) => { if (w.trim() && w.length > words[li].length) li = i; });
      let k = 0, add = '';
      while (add.length < Math.min(extra, 18)) add += COMPOUND[k++ % COMPOUND.length];
      words[li] += add.slice(0, Math.min(extra, 18));
      extra -= Math.min(extra, 18);
      s = words.join('');
      for (let j = 0; extra > 0; j++) { const f = FILL[j % FILL.length]; s += ' ' + f; extra -= f.length + 1; }
      const lead = t.match(/^\s*/)[0], trail = t.match(/\s*$/)[0];
      return `${lead}[${s}]${trail}`;
    };
    for (const n of nodes) { if (initials(n)) continue; const v = pseudo(n.data); if (v !== n.data) { n.data = v; changed++; } }
    for (const f of fields) {
      if (f.matches('input[type=submit], input[type=button], input[type=reset]') && f.value) { f.value = pseudo(f.value); changed++; }
      if (f.placeholder) { f.placeholder = pseudo(f.placeholder); changed++; }
    }
  } else if (kind === 'long') {
    const NAME = 'Wolfeschlegelsteinhausenbergerdorffvoralternwaren';
    const EMAIL = 'maximiliana.wolfeschlegelsteinhausen@internationalegesellschaft.example';
    const URL_ = 'https://www.internationalegesellschaftfuerbeispiele.example/verwaltungsdokumentation';
    // Only where data or user content lands (names, e-mails, URLs, items of a list, table cells): authored headings
    // and labels do not grow a 49-letter word, and a finding there would be noise.
    // Matched on whole parts of an id or class ("card-title", "user_name"), so "tagline" is not "tag".
    const DATA = /^(name|username|user|author|email|mail|title|address|city|company|product|sku|customer|account|member|owner|contact|profile|file|filename|url|tag|tags)$/i;
    const parts = (e) => [e.id, typeof e.className === 'string' ? e.className : ''].join(' ').split(/[\s_-]+/).filter(Boolean);
    const dataSlot = (el) => targets || el.closest('[data-stress-item], td, dd, output, time, data, [itemprop], address, cite, figcaption, input, option') ||
      (!el.closest('h1, h2, nav, [role=navigation]') && [el, el.parentElement, el.parentElement?.parentElement].some((e) => e && e !== document.body && parts(e).some((w) => DATA.test(w))));
    let kept = 0;
    for (const n of nodes) {
      if (!/@|https?:|www\.|\.(com|org|net|io|co|uk|de)\b/i.test(n.data) && !dataSlot(n.parentElement)) continue;
      kept++;
      const t = n.data;
      const words = t.split(/(\s+)/);
      let li = -1;
      words.forEach((w, i) => { if (/[A-Za-zÀ-ÿ@]/.test(w) && (li < 0 || w.length > words[li].length)) li = i; });
      if (li < 0) continue;
      const w = words[li];
      words[li] = /@/.test(w) ? EMAIL : /^(https?:|www\.)|\.(com|org|net|io|co|uk|de)\b/i.test(w) ? URL_ : NAME;
      n.data = words.join('');
      changed++;
    }
    for (const f of fields) if (f.placeholder) { f.placeholder = /@/.test(f.placeholder) ? EMAIL : NAME; changed++; }
    note.push(`data-like texts only (${kept}): list items, cells, names, e-mails, URLs — --targets to choose`);
  } else if (kind === 'empty') {
    // One text slot blanked per repeated item or table row, rotating, so each item misses a different field.
    const items = targets ? [...root.querySelectorAll(targets)] : [...document.querySelectorAll('[data-stress-item]')];
    const seen = new Set();
    items.forEach((it, i) => {
      if (seen.has(it)) return; seen.add(it);
      const slots = [];
      const w = document.createTreeWalker(it, NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode(); n; n = w.nextNode()) if (n.data.trim() && !isSkipped(n.parentElement)) slots.push(n);
      if (!slots.length) return;
      const n = targets ? slots[0] : slots[i % slots.length];
      if (targets) slots.forEach((s) => { s.data = ''; }); else n.data = '';
      changed++;
    });
    if (!items.length) note.push('no repeated items or table rows found: pass --targets for the fields that can be empty');
    else note.push(`${seen.size} item(s), one slot each`);
  } else if (kind === 'numbers') {
    const NUM = /([£$€¥₹]\s?)?([+\-−]?)(\d{1,3}(?:[,.\u00a0\u202f ]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?)(\s?(?:%|[kKmMbB]\b|[a-zA-Z]{1,3}\b))?/g;
    let i = 0;
    for (const n of nodes) {
      const t = n.data;
      const v = t.replace(NUM, (m, cur = '', sign, num, unit = '', off) => {
        const before = t.slice(Math.max(0, off - 1), off), after = t.slice(off + m.length, off + m.length + 1);
        if (/^(19|20)\d\d$/.test(num) && !cur) return m;              // a year
        if (after === ':' || before === ':' || /[/:-]/.test(after) || /[/-]/.test(before)) return m; // times, dates, ranges
        if (/^0\d/.test(num) && num.length > 3) return m;               // phone numbers, codes
        const neg = i++ % 2 === 1;
        const big = /%/.test(unit) ? (neg ? '98,765.43' : '12,345.67') : (neg ? '98,765,432.10' : '1,234,567,890.99');
        return `${neg ? '-' : ''}${cur}${big}${unit}`;
      });
      if (v !== t) { n.data = v; changed++; }
    }
  } else if (kind === 'rtl-text') {
    let si = 0, mi = 0;
    const arFor = (t) => {
      const core = t.trim();
      if (!core || /^[\d\s.,:;%£$€¥+\-−/()]+$/.test(core)) return t;
      const digits = (core.match(/\d[\d.,]*/g) || []).join(' ');
      let s;
      if (core.length <= 14) s = ar.short[si++ % ar.short.length];
      else if (core.length <= 45) s = ar.medium[mi++ % ar.medium.length];
      else { s = ''; while (s.length < core.length * 0.85) s += (s ? ' ' : '') + ar.long; s = s.slice(0, Math.max(40, Math.round(core.length * 0.85))).replace(/\s+\S*$/, ''); }
      return t.match(/^\s*/)[0] + s + (digits ? ' ' + digits : '') + t.match(/\s*$/)[0];
    };
    for (const n of nodes) { if (initials(n)) continue; const v = arFor(n.data); if (v !== n.data) { n.data = v; changed++; } }
    for (const f of fields) {
      if (f.matches('input[type=submit], input[type=button], input[type=reset]') && f.value) { f.value = arFor(f.value); changed++; }
      if (f.placeholder) { f.placeholder = arFor(f.placeholder); changed++; }
    }
  }
  return { changed, note: note.join('; ') };
}

/**
 * Repeated lists: containers whose children are mostly one kind of item with the same inner structure (cards, rows,
 * results, list entries), outside the page chrome. Page sections are not items: they hold h1/h2 headings or differ
 * in structure. Marks containers data-stress-list and items data-stress-item; returns them, outermost and largest first.
 */
export function findLists({ list, scope, max = 4 }) {
  const root = (scope && document.querySelector(scope)) || document.body;
  const sig = (e) => e.tagName + '.' + [...e.classList].filter((c) => !/\d{3,}|active|current|selected|open|first|last|odd|even/.test(c)).sort().join('.');
  const name = (e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + [...e.classList].slice(0, 2).map((c) => '.' + c).join('');
  const bag = (e) => { const m = new Map(); let n = 0; for (const d of e.querySelectorAll('*')) { if (++n > 80) break; m.set(d.tagName, (m.get(d.tagName) || 0) + 1); } return m; };
  const jac = (a, b) => { let i = 0, u = 0; for (const k of new Set([...a.keys(), ...b.keys()])) { i += Math.min(a.get(k) || 0, b.get(k) || 0); u += Math.max(a.get(k) || 0, b.get(k) || 0); } return u ? i / u : 1; };
  const itemsIn = (c, kind) => {
    const counts = new Map();
    for (const k of c.children) counts.set(sig(k), (counts.get(sig(k)) || 0) + 1);
    const [best, n] = [...counts].sort((a, b) => b[1] - a[1])[0] || [];
    return { best: kind || best, items: [...c.children].filter((k) => sig(k) === (kind || best)), share: n / c.children.length };
  };
  let found = [];
  if (list) found = [...root.querySelectorAll(list)].map((c) => ({ c, ...itemsIn(c) }));
  else {
    for (const c of root.querySelectorAll('*')) {
      if (c.children.length < 3 || c.closest('nav, header, footer, [role=navigation], select, datalist, svg, [role=menu], [role=menubar], [role=tablist], [aria-hidden=true], dialog:not([open])')) continue;
      const x = itemsIn(c);
      if (x.items.length < 3 || x.share < 0.6) continue;
      // Page sections, table cells and runs of prose paragraphs are not list items.
      if (/^(SECTION|MAIN|ASIDE|HEADER|FOOTER|NAV|FORM|SCRIPT|STYLE|OPTION|BR|TD|TH|COL|P|BLOCKQUOTE|PRE|HR)$/.test(x.items[0].tagName) || /^(TR|COLGROUP|THEAD)$/.test(c.tagName)) continue;
      if (x.items.some((k) => k.querySelector('main, section, h1, h2') || /^H[1-6]$/.test(k.tagName))) continue;
      const b0 = bag(x.items[Math.floor(x.items.length / 2)]); // the middle item: a header row or a featured first card is not the norm
      if (x.items.filter((k) => jac(bag(k), b0) >= 0.7).length < x.items.length * 0.6) continue; // same inner structure
      const r = c.getBoundingClientRect();
      if (r.width < 40 || r.height < 20 || !(c.innerText || '').trim()) continue;
      found.push({ c, ...x, area: r.width * r.height });
    }
    found = found.filter((x) => !found.some((y) => y !== x && y.c.contains(x.c))).sort((a, b) => b.area - a.area).slice(0, max);
  }
  for (const x of found) { x.c.setAttribute('data-stress-list', ''); x.items.forEach((k) => k.setAttribute('data-stress-item', '')); }
  return found.map((x) => ({ container: name(x.c), item: x.best.split('.')[0].toLowerCase(), n: x.items.length }));
}

/** list-0 / list-1 / list-500 on the containers findLists marked. */
export function mutateLists({ count }) {
  const name = (e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + [...e.classList].slice(0, 2).map((c) => '.' + c).join('');
  const done = [];
  for (const c of document.querySelectorAll('[data-stress-list]')) {
    const items = [...c.children].filter((k) => k.hasAttribute('data-stress-item'));
    if (!items.length) continue;
    const before = items.length;
    if (count === 0) items.forEach((k) => k.remove());
    else if (count === 1) items.slice(1).forEach((k) => k.remove());
    else {
      const target = items[0].querySelectorAll('*').length > 150 ? 200 : count;
      let last = items[items.length - 1];
      for (let i = items.length; i < target; i++) { const cl = items[i % items.length].cloneNode(true); cl.querySelectorAll('[id]').forEach((e) => e.removeAttribute('id')); cl.removeAttribute('id'); last.after(cl); last = cl; }
    }
    const t0 = performance.now(); void document.body.offsetHeight; const layoutMs = Math.round(performance.now() - t0);
    const r = c.getBoundingClientRect();
    done.push({ container: name(c), item: items[0].tagName.toLowerCase(), before, after: [...c.children].filter((k) => k.hasAttribute('data-stress-item')).length, height: Math.round(r.height), layoutMs });
  }
  return { containers: done, docH: document.documentElement.scrollHeight };
}

/** Positions before the dir flip: every structural element's gaps to its parent's content box. */
export function mirrorRecord({ scope }) {
  const root = (scope && document.querySelector(scope)) || document.body;
  const list = [];
  let id = 0;
  for (const el of root.querySelectorAll('*')) {
    if (list.length > 2500) break;
    if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|BR|WBR|OPTION)$/.test(el.tagName) || el.closest('[dir]:not(html):not([data-stress-dir]), bdi')) continue;
    const p = el.parentElement;
    if (!p) continue;
    const cs = getComputedStyle(el);
    if (getComputedStyle(p).display === 'inline') continue; // inside a line of text, bidi reordering decides, not layout
    const replaced = /^(IMG|SVG|VIDEO|CANVAS|PICTURE|svg)$/.test(el.tagName);
    const positioned = cs.position === 'absolute' || cs.position === 'fixed';
    if (cs.display === 'inline' && !replaced) continue;
    if (cs.display === 'contents' || cs.display === 'none') continue;
    const r = el.getBoundingClientRect(), pr = p.getBoundingClientRect();
    // Nearly as wide as its parent: nothing to mirror (24 px, or a fifth of a small parent: a badge in an icon button).
    if (r.width < 4 || r.height < 4 || pr.width - r.width < Math.min(24, Math.max(8, 0.2 * pr.width))) continue;
    if (replaced && !positioned && r.width > 96) continue; // a photograph in flow follows its box
    const pcs = getComputedStyle(p);
    const L = pr.left + parseFloat(pcs.borderLeftWidth) + parseFloat(pcs.paddingLeft), R = pr.right - parseFloat(pcs.borderRightWidth) - parseFloat(pcs.paddingRight);
    const box = positioned ? [pr.left, pr.right] : [L, R];
    el.__mir = ++id;
    list.push({ id, gL: r.left - box[0], gR: box[1] - r.right, positioned, replaced });
  }
  window.__mirror = list;
  return list.length;
}

export function mirrorCheck({ tol = 3, to = 'rtl' }) {
  const DIR = to === 'rtl' ? 'RTL' : 'LTR';
  const list = window.__mirror || [];
  const byId = new Map(list.map((x) => [x.id, x]));
  const sel = (e) => {
    const parts = [];
    for (let x = e; x && x !== document.body && parts.length < 4; x = x.parentElement) {
      if (x.id && !/\d{3,}/.test(x.id)) { parts.unshift('#' + x.id); break; }
      const cls = [...x.classList].filter((c) => !/^(css-|sc-|_|svelte-|astro-)|\d{3,}|:/.test(c)).slice(0, 2);
      parts.unshift(x.tagName.toLowerCase() + (cls.length ? '.' + cls.join('.') : ''));
    }
    return parts.join(' > ');
  };
  const out = [];
  const flagged = [];
  for (const el of document.body.querySelectorAll('*')) {
    const b = el.__mir && byId.get(el.__mir);
    if (!b || flagged.some((f) => f.contains(el))) continue;
    if (Math.abs(b.gL - b.gR) <= Math.min(16, Math.max(4, 0.25 * el.parentElement.getBoundingClientRect().width))) continue; // centred: nothing to mirror
    const p = el.parentElement, cs = getComputedStyle(el), pcs = getComputedStyle(p);
    const r = el.getBoundingClientRect(), pr = p.getBoundingClientRect();
    const L = pr.left + parseFloat(pcs.borderLeftWidth) + parseFloat(pcs.paddingLeft), R = pr.right - parseFloat(pcs.borderRightWidth) - parseFloat(pcs.paddingRight);
    const box = b.positioned ? [pr.left, pr.right] : [L, R];
    const gL = r.left - box[0], gR = box[1] - r.right;
    const mirrored = Math.abs(gL - b.gR) <= tol + 0.02 * pr.width && Math.abs(gR - b.gL) <= tol + 0.02 * pr.width;
    const stayed = Math.abs(gL - b.gL) <= tol && Math.abs(gR - b.gR) <= tol;
    if (mirrored || !stayed) continue;
    // Why it stayed: the physical property that pins it.
    const why = b.positioned ? (cs.left !== 'auto' && cs.right === 'auto' ? `left: ${cs.left}` : cs.right !== 'auto' && cs.left === 'auto' ? `right: ${cs.right}` : 'left/right')
      : parseFloat(cs.marginLeft) !== parseFloat(cs.marginRight) ? `margin-left ${cs.marginLeft} / margin-right ${cs.marginRight}` : pcs.textAlign === 'left' || pcs.textAlign === 'right' ? `text-align: ${pcs.textAlign} on its parent` : /flex|grid/.test(pcs.display) && pcs.direction === 'ltr' ? 'its parent keeps direction: ltr' : `${pcs.display} parent`;
    flagged.push(el);
    out.push({ check: 'not-mirrored', sel: sel(el), detail: `${b.replaced ? 'icon/image' : b.positioned ? 'positioned element' : el.tagName.toLowerCase()} stays ${Math.round(b.gL)}px from the left and ${Math.round(b.gR)}px from the right in ${DIR} (${why})`, box: { x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) } });
    if (out.length >= 25) break;
  }
  return out;
}

/** Physical text-align on text blocks that stays put when the direction changes (left in RTL, right in LTR). */
export function alignCheck({ side = 'left', dir = 'RTL', max = 10 }) {
  const sel = (e) => {
    const parts = [];
    for (let x = e; x && x !== document.body && parts.length < 4; x = x.parentElement) {
      if (x.id && !/\d{3,}/.test(x.id)) { parts.unshift('#' + x.id); break; }
      const cls = [...x.classList].filter((c) => !/^(css-|sc-|_|svelte-|astro-)|\d{3,}|:/.test(c)).slice(0, 2);
      parts.unshift(x.tagName.toLowerCase() + (cls.length ? '.' + cls.join('.') : ''));
    }
    return parts.join(' > ');
  };
  const out = [];
  // Reported where it is declared (outermost), on text that is not a number, outside islands with their own dir.
  for (const el of document.body.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, td, th, caption, dd, dt, label, blockquote, figcaption, div')) {
    if (out.length >= max) break;
    const cs = getComputedStyle(el);
    if (cs.textAlign !== side || getComputedStyle(el.parentElement).textAlign === side || el.closest('[dir]:not(html):not([data-stress-dir]), bdi')) continue;
    const t = (el.innerText || '').trim();
    if (t.length < 8 || /^[\d\s.,%£$€+\-−]+$/.test(t)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 40 || r.height < 4) continue;
    out.push({ check: 'not-mirrored', sel: sel(el), detail: `text-align: ${side} (physical) — stays ${side} in ${dir}; use start`, box: { x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) } });
  }
  return out;
}

/**
 * The page's direction. Marks the elements that set it (html, body, and wide direct children of body carrying a dir)
 * with data-stress-dir, so the mirror checks tell them from islands with their own dir (a number, a code sample).
 */
export function pageDirection() {
  const d = (e) => (e ? getComputedStyle(e).direction : null);
  for (const e of [document.documentElement, document.body, ...[...document.body.children].filter((e) => e.hasAttribute('dir') && e.getBoundingClientRect().width >= innerWidth * 0.5)]) e.setAttribute('data-stress-dir', '');
  return d(document.documentElement) === 'rtl' || d(document.body) === 'rtl' ? 'rtl' : 'ltr';
}
/** Flip the elements pageDirection marked to `to`; returns whether it took. */
export function flipDirection({ to }) {
  const roots = [...document.querySelectorAll('[data-stress-dir]')];
  for (const e of roots) { e.setAttribute('dir', to); e.style.setProperty('direction', to); }
  if (to === 'rtl') document.documentElement.lang = 'ar'; // flipped back to LTR, the text stays Arabic: so does lang
  // Took effect? (a direction declared !important in the page's CSS wins over all of this)
  return roots.every((e) => getComputedStyle(e).direction === to);
}

/** Visible text that reads as a template or data fault. */
export function junkText() {
  const RX = /\b(undefined|NaN|null)\b|\[object Object\]|Invalid Date|\{\{[^}]*\}\}|\$\{[^}]*\}/;
  const out = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n && out.length < 20; n = w.nextNode()) {
    const el = n.parentElement;
    if (!el || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|CODE|PRE)$/.test(el.tagName) || !RX.test(n.data)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1 || (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }))) continue;
    const s = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + [...el.classList].slice(0, 2).map((c) => '.' + c).join('');
    out.push({ sel: s, text: n.data.trim().slice(0, 60), box: { x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) } });
  }
  return out;
}

/** Visible text per region (top-level sections), and any error or empty-state message on screen. */
export function regionText() {
  const main = document.querySelector('main, [role=main]') || document.body;
  let regions = [...main.children];
  if (regions.length === 1 && regions[0].children.length > 1) regions = [...regions[0].children];
  const name = (e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + [...e.classList].slice(0, 2).map((c) => '.' + c).join('');
  const out = regions.filter((e) => !/^(SCRIPT|STYLE|TEMPLATE)$/.test(e.tagName)).slice(0, 40).map((e, i) => {
    const r = e.getBoundingClientRect();
    return { key: `${i}:${name(e)}`, sel: name(e), chars: (e.innerText || '').replace(/\s+/g, ' ').trim().length, box: { x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) } };
  });
  const body = (document.body.innerText || '').replace(/\s+/g, ' ');
  // Error and empty-state wording on screen, as short snippets around the words (compared with the unmutated page).
  const messages = [...body.matchAll(/\b(error|went wrong|try again|failed|couldn.t|could not|unable to|offline|no connection|not available|no results|nothing (?:here|found|yet)|is empty|no data|no items|no orders|none yet)\b/gi)]
    .slice(0, 6).map((m) => body.slice(Math.max(0, m.index - 30), m.index + m[0].length + 30).trim());
  return { regions: out, chars: body.trim().length, messages };
}

/** For no-images: text that sat on an image and is now on a ground it cannot be read on. */
export function imageFallback() {
  const lum = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null;
    const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return { L: 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b), a };
  };
  const ground = (el) => {
    for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; const l = lum(c); if (l && l.a > 0.5) return { c, L: l.L }; }
    return { c: 'rgb(255, 255, 255) (canvas)', L: 1 };
  };
  const broken = [...document.images].filter((i) => i.complete && !i.naturalWidth && i.getBoundingClientRect().width > 40);
  const out = [], imgs = [];
  for (const [index, i] of [...document.images].entries()) {
    if (!i.complete || i.naturalWidth) continue;
    const r = i.getBoundingClientRect();
    const cs = getComputedStyle(i);
    const sized = i.hasAttribute('width') && i.hasAttribute('height') || cs.aspectRatio !== 'auto';
    const s = i.tagName.toLowerCase() + (i.id ? '#' + i.id : '') + [...i.classList].slice(0, 2).map((c) => '.' + c).join('');
    imgs.push({ index, url: (i.currentSrc || i.src).split(/[?#]/)[0], src: (i.currentSrc || i.src).split(/[?#]/)[0].split('/').pop().slice(0, 40), sel: (i.parentElement ? i.parentElement.tagName.toLowerCase() + [...i.parentElement.classList].slice(0, 1).map((c) => '.' + c).join('') + ' > ' : '') + s, w: Math.round(r.width), h: Math.round(r.height), sized, alt: i.alt, box: { x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) } });
  }
  const done = new Set();
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = tw.nextNode(); n && out.length < 12; n = tw.nextNode()) {
    const el = n.parentElement;
    if (!n.data.trim() || !el || done.has(el) || /^(SCRIPT|STYLE)$/.test(el.tagName)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    // Was it on an image? A background-image on an ancestor, or a broken <img> under most of its box.
    let onImage = null, painted = false;
    for (let e = el, d = 0; e && e !== document.body && d < 6; e = e.parentElement, d++) {
      const c = getComputedStyle(e);
      if (/url\(/.test(c.backgroundImage)) { onImage = 'background image'; break; }
      // Something painted between the text and the image (a filled or gradient pill, a scrim) is its real ground.
      if (c.backgroundImage !== 'none' || (lum(c.backgroundColor)?.a || 0) > 0.5) { painted = true; break; }
    }
    if (painted) continue;
    if (!onImage) for (const b of broken) { const q = b.getBoundingClientRect(); const iw = Math.min(q.right, r.right) - Math.max(q.left, r.left), ih = Math.min(q.bottom, r.bottom) - Math.max(q.top, r.top); if (iw > 0 && ih > 0 && iw * ih > 0.5 * r.width * r.height && !b.contains(el)) { onImage = 'image'; break; } }
    if (!onImage) continue;
    done.add(el);
    const fg = lum(getComputedStyle(el).color), g = ground(el);
    if (!fg) continue;
    const ratio = (Math.max(fg.L, g.L) + 0.05) / (Math.min(fg.L, g.L) + 0.05);
    if (ratio >= 3) continue;
    const s = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + [...el.classList].slice(0, 2).map((c) => '.' + c).join('');
    out.push({ check: 'unreadable', sel: s, detail: `"${n.data.trim().slice(0, 30)}" sat on an ${onImage}; without it ${getComputedStyle(el).color} on ${g.c} is ${ratio.toFixed(2)}:1 — give the section a ground colour`, box: { x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) } });
  }
  return { unreadable: out, broken: imgs };
}

/** Loading-state snapshot during a throttled load. */
export function loadingSnapshot() {
  const txt = (document.body?.innerText || '').replace(/\s+/g, ' ').trim();
  const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2 && (!e.checkVisibility || e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })); };
  const main = document.querySelector('main, [role=main]') || document.body;
  let regions = main ? [...main.children] : [];
  if (regions.length === 1 && regions[0].children.length > 1) regions = [...regions[0].children];
  const name = (e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + [...e.classList].slice(0, 2).map((c) => '.' + c).join('');
  const ind = [...document.querySelectorAll('[aria-busy=true], [role=progressbar], progress, [class*=skeleton i], [class*=spinner i], [class*=loading i], [class*=shimmer i], [class*=placeholder i]')].filter(vis);
  const h1 = document.querySelector('h1');
  const hr = h1 && h1.getBoundingClientRect();
  return {
    chars: txt.length,
    loadingText: /\b(loading|chargement|laden|cargando)\b/i.test(txt),
    indicators: ind.slice(0, 5).map((e) => e.tagName.toLowerCase() + [...e.classList].slice(0, 2).map((c) => '.' + c).join('')),
    h1: hr ? Math.round(hr.top + scrollY) : null,
    cls: Math.round((window.__cls?.value || 0) * 1000) / 1000,
    fonts: [...(document.fonts || [])].filter((f) => f.status === 'loading').map((f) => `${f.family.replace(/"/g, '')} ${f.weight}`).slice(0, 4),
    docH: document.documentElement.scrollHeight,
    regions: regions.filter((e) => !/^(SCRIPT|STYLE|TEMPLATE)$/.test(e.tagName)).slice(0, 40).map((e, i) => { const r = e.getBoundingClientRect(); return { key: `${i}:${name(e)}`, sel: name(e), top: Math.round(r.top + scrollY), h: Math.round(r.height) }; }),
  };
}

/** Installed before any page script (addInitScript): cumulative layout shift with sources. */
function clsObserver() {
  window.__cls = { value: 0, sources: [] };
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (e.hadRecentInput) continue;
        window.__cls.value += e.value;
        for (const s of e.sources || []) {
          const n = s.node && s.node.nodeType === 1 ? s.node : s.node?.parentElement;
          if (!n) continue;
          const name = n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + [...n.classList].slice(0, 2).map((c) => '.' + c).join('');
          const dy = Math.round(s.currentRect.y - s.previousRect.y), dh = Math.round(s.currentRect.height - s.previousRect.height);
          window.__cls.sources.push({ name, value: e.value, dy, dh, t: Math.round(e.startTime) });
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch { /* no layout-shift entries in this browser */ }
}

/* ------------------------------------------------------------------------------------------------------------ */
/* Node side                                                                                                    */
/* ------------------------------------------------------------------------------------------------------------ */

const norm = (sel) => String(sel).replace(/:nth-of-type\(\d+\)/g, ':nth-of-type(n)');
// New against the unmutated page is judged per element kind, positions dropped: a list cut to one row renames
// "tr:nth-of-type(3) > td" to "tr > td", and a fault the page already had must not come back as new.
const key = (f) => `${f.check}|${String(f.sel).replace(/:nth-of-type\(\d+\)/g, '')}`;
const esc = (s) => String(s).replace(/\|/g, '\\|');

async function measure(page, mobile) {
  return measureAt(page, { measure: null, track: false, cta: null, mobile });
}

/** Mutation-specific comparisons with the unmutated page: controls squeezed or wrapping, regions emptied. */
function compareControls(base, now, mobile) {
  // Without a device-width viewport, phone Chrome lays the page out 980 px wide and boosts font sizes by how much text
  // each block holds (text autosizing), so a control's size moves from load to load: nothing to compare.
  if (mobile && !/width\s*=\s*device-width/i.test(base.viewportMeta || '')) return [];
  const b = new Map(base.controls.map((c) => [norm(c.sel), c]));
  const out = [];
  for (const c of now.controls) {
    const p = b.get(norm(c.sel));
    if (!p) continue;
    // Squeezed: narrower than 24 px, or shorter than 24 px without having lost a line of its label.
    if ((c.w < 24 && p.w >= 24) || (c.h < 24 && p.h >= 24 && c.lines >= p.lines)) out.push({ check: 'squeezed', sev: 'warn', sel: c.sel, detail: `"${c.label}" ${p.w}×${p.h} → ${c.w}×${c.h}px`, box: c.box });
    else if (c.buttonLike && c.lines >= 3 && p.lines === 1) out.push({ check: 'label-wrap', sev: 'warn', sel: c.sel, detail: `"${c.label}" now wraps to ${c.lines} lines (${c.w}×${c.h}px)`, box: c.box });
    else if (/nav|tab|menu/i.test(c.sel) && c.lines >= 2 && p.lines === 1) out.push({ check: 'label-wrap', sev: 'warn', sel: c.sel, detail: `navigation item "${c.label}" now wraps (${c.lines} lines)`, box: c.box });
  }
  return out;
}

function compareRegions(base, now, mutation) {
  const b = new Map(base.regions.map((r) => [r.key, r]));
  const out = [];
  const lost = [];
  for (const r of now.regions) {
    const p = b.get(r.key);
    if (p && p.chars >= 40 && r.chars < p.chars * 0.4) lost.push({ r, p });
  }
  if (lost.length) {
    const fresh = (now.messages || []).filter((m) => !(base.messages || []).includes(m));
    const msg = fresh.length ? fresh[0] : null;
    const list0 = mutation === 'list-0';
    for (const { r, p } of lost.slice(0, 6)) out.push({ check: msg ? 'content-lost' : list0 ? 'no-empty-state' : 'silent-failure', sev: msg ? 'info' : 'warn', sel: r.sel, detail: `${p.chars} → ${r.chars} characters of text${msg ? `; the page says "…${msg}…"` : list0 ? ' with its list empty, and no empty-state message' : ' and no error or empty message on screen'}`, box: r.box });
  }
  const fresh = (now.messages || []).filter((m) => !(base.messages || []).includes(m));
  if (mutation.startsWith('list-0') && !lost.length && fresh.length) out.push({ check: 'empty-state', sev: 'info', sel: '(page)', detail: `the page says "…${fresh[0]}…"`, box: null });
  return out;
}

async function shot(page, file, maxH = 6000) {
  const docH = await page.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight || 0)).catch(() => 800);
  const vw = page.viewportSize().width;
  const clip = { x: 0, y: 0, width: Math.max(vw, await page.evaluate(() => document.documentElement.scrollWidth).catch(() => vw)), height: Math.min(docH, maxH) };
  await page.screenshot({ path: file, fullPage: true, clip, type: 'jpeg', quality: 70 }).catch(() => null);
}

/** Throttled load: frames at fixed times, layout shifts with sources, loading indicators. */
async function slowLoad(ctx, url, { times = [500, 1000, 2000, 3000, 5000, 8000], net } = {}) {
  const page = await ctx.newPage();
  await page.addInitScript(clsObserver);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: net.latency, downloadThroughput: (net.down * 1024) / 8, uploadThroughput: (net.up * 1024) / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: net.cpu });
  let loaded = null;
  const t0 = Date.now();
  page.once('load', () => { loaded = Date.now() - t0; });
  const nav = page.goto(url, { waitUntil: 'commit', timeout: 60000 }).catch(() => null);
  const frames = [];
  for (const t of times) {
    const wait = t - (Date.now() - t0);
    if (wait > 0) await page.waitForTimeout(wait);
    await nav;
    const at = Date.now() - t0;
    const snap = await page.evaluate(loadingSnapshot).catch(() => null);
    const png = await page.screenshot({ timeout: 10000 }).catch(() => null);
    frames.push({ t: at, ...(snap || {}), png });
    if (loaded && Date.now() - t0 > loaded + 1500 && t >= 2000) break;
  }
  await page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1000);
  const cls = await page.evaluate(() => window.__cls).catch(() => null);
  const final = await page.evaluate(loadingSnapshot).catch(() => null);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }).catch(() => {});
  await page.close();
  return { frames, cls, final, loadMs: loaded };
}

function isApi(req, apiGlob) {
  if (apiGlob) return apiGlob.test(req.url());
  return ['fetch', 'xhr'].includes(req.resourceType());
}
const globToRx = (g) => new RegExp('^' + g.split('**').map((p) => p.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*')).join('.*') + '$');

async function stressPage(browser, url, a, outDir) {
  const t0 = Date.now();
  const widths = asList(a.widths, ['390', '768', '1280']).map(Number).filter(Boolean);
  const only = a.only ? new Set(asList(a.only)) : null;
  const skipM = new Set(asList(a['skip-mutations']));
  const muts = ALL.filter((m) => (!only || only.has(m)) && !skipM.has(m));
  const skip = [ALWAYS_SKIP, a.skip].filter((x) => x && x !== true).join(',');
  const scope = a.scope && a.scope !== true ? a.scope : null;
  const targets = a.targets && a.targets !== true ? asList(a.targets).join(', ') : null;
  const list = a.list && a.list !== true ? asList(a.list).join(', ') : null;
  const apiGlob = a.api && a.api !== true ? globToRx(String(a.api)) : null;
  const net = { latency: 562.5, down: 1474, up: 675, cpu: 4 };
  const slug = slugFor(new URL(url).pathname + new URL(url).search);
  const pageDir = path.join(outDir, slug);
  await rm(pageDir, { recursive: true, force: true });
  await mkdir(path.join(pageDir, 'crops'), { recursive: true });
  const results = [];
  const cells = [];
  let filmstrip = null;
  let cropN = 0;
  const crops = [];

  for (const [wi, width] of widths.entries()) {
    const mobile = width < 768;
    const height = mobile ? 844 : 900;
    const ctxOpts = { viewport: { width, height }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile };
    const ctx = await browser.newContext(ctxOpts);
    // ---- the unmutated page ----
    const page = await ctx.newPage();
    const apiSeen = [];
    const errorsSeen = [];
    page.on('request', (r) => { if (isApi(r, apiGlob) && apiSeen.length < 50) apiSeen.push(r.url()); });
    page.on('pageerror', (e) => errorsSeen.push(String(e.message).slice(0, 120)));
    await open(page, url);
    if (/^(chrome-error:|about:blank)/.test(page.url())) throw new Error(`the page did not load (${url}) — is the server running?`);
    await settle(page);
    await prepare(page);
    const base = await measure(page, mobile);
    base.rt = await page.evaluate(regionText);
    base.junk = await page.evaluate(junkText);
    base.imgs = await page.evaluate(() => [...document.images].map((i) => ({ url: (i.currentSrc || i.src).split(/[?#]/)[0], h: Math.round(i.getBoundingClientRect().height) })));
    const baseKeys = new Set(base.findings.map(key));
    const baseJunk = new Set(base.junk.map((j) => j.text));
    const baseErrors = errorsSeen.length;
    results.push({ mutation: 'none', width, findings: base.findings.length, errors: base.findings.filter((f) => f.sev === 'error').length, api: apiSeen.length });

    for (const m of muts) {
      if (NETWORK.has(m) && wi > 0 && !a['all-widths']) continue;
      const tm = Date.now();
      const res = { mutation: m, width, applied: '', new: [], ms: 0 };
      if (m === 'slow') {
        const s = await slowLoad(ctx, url, { net });
        const first = s.frames.find((f) => f.chars > 20);
        const src = new Map();
        for (const x of s.cls?.sources || []) { const e = src.get(x.name) || { name: x.name, value: 0, dy: 0, n: 0 }; e.value += x.value; e.n++; if (Math.abs(x.dy) > Math.abs(e.dy)) e.dy = x.dy; src.set(x.name, e); }
        const top = [...src.values()].sort((p, q) => q.value - p.value).slice(0, 4);
        const clsV = s.cls?.value || 0;
        if (clsV > 0.1) res.new.push({ check: 'layout-shift', sev: clsV > 0.25 ? 'error' : 'warn', sel: top[0]?.name || '(page)', detail: `cumulative layout shift ${clsV.toFixed(3)} while loading; moved most: ${top.map((x) => `${x.name} (${x.dy >= 0 ? '+' : ''}${x.dy}px)`).join(', ')}`, box: null });
        if (!first || first.t >= 3000) res.new.push({ check: 'blank', sev: 'warn', sel: '(page)', detail: first ? `nothing readable until ${first.t / 1000} s on a throttled phone` : `nothing readable in the first ${s.frames.at(-1)?.t / 1000} s on a throttled phone`, box: null });
        const fontWait = s.frames.filter((f) => f.fonts?.length);
        if (fontWait.length && fontWait.at(-1).t >= 2000) res.new.push({ check: 'fonts-late', sev: 'info', sel: '(page)', detail: `web fonts still loading at ${fontWait.at(-1).t / 1000} s: ${fontWait.at(-1).fonts.join(', ')} — check the frames for invisible or reflowing text`, box: null });
        // Sections that moved after they first appeared: something above them changed height as it loaded (a
        // skeleton shorter than its content, an image without dimensions). CLS misses it below the fold.
        const fin = new Map((s.final?.regions || []).map((x) => [x.key, x]));
        const firstSeen = new Map();
        for (const f of s.frames) for (const x of f.regions || []) if (x.h > 0 && !firstSeen.has(x.key)) firstSeen.set(x.key, { ...x, t: f.t });
        const moved = [...firstSeen.values()].map((x) => ({ x, f: fin.get(x.key) })).filter(({ x, f }) => f && Math.abs(f.top - x.top) > 40);
        if (moved.length) {
          const { x, f } = moved[0];
          const grew = (s.final?.regions || []).filter((r) => r.top < f.top).map((r) => ({ r, was: firstSeen.get(r.key) })).filter(({ r, was }) => was && Math.abs(r.h - was.h) > 30).map(({ r, was }) => `${r.sel} ${was.h} → ${r.h}px`);
          res.new.push({ check: 'late-shift', sev: 'warn', sel: x.sel, detail: `moved ${f.top - x.top > 0 ? 'down' : 'up'} ${Math.abs(f.top - x.top)}px after it first showed at ${(x.t / 1000).toFixed(1)} s${grew.length ? `; above it ${grew.slice(0, 2).join(', ')}` : ''} — reserve the space (a skeleton of the final height, image dimensions)`, box: null });
        }
        const ind = [...new Set(s.frames.flatMap((f) => f.indicators || []))];
        res.applied = `${s.frames.length} frames; CLS ${clsV.toFixed(3)}; load event at ${s.loadMs ? (s.loadMs / 1000).toFixed(1) + ' s' : 'not reached'}; loading indicators seen: ${ind.length ? ind.join(', ') : s.frames.some((f) => f.loadingText) ? '"Loading" text' : 'none'}`;
        res.frames = s.frames.map(({ png, ...f }) => f);
        filmstrip = s.frames.filter((f) => f.png).map((f) => ({ label: `${(f.t / 1000).toFixed(1)} s · ${f.chars} chars · CLS ${f.cls ?? 0}${f.indicators?.length ? ' · ' + f.indicators[0] : ''}`, png: f.png, cellW: mobile ? 220 : 400 }));
      } else {
        const p = await ctx.newPage();
        const errs = [];
        p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 120)));
        let hits = 0;
        if (m === 'no-images') await p.route('**/*', (r) => (r.request().resourceType() === 'image' ? (hits++, r.abort('blockedbyclient')) : r.continue()));
        if (m === 'errors' || m === 'offline') {
          if (!apiSeen.length) { res.applied = 'skipped: the page made no fetch/XHR request while loading (pass --api for other data requests)'; res.ms = Date.now() - tm; results.push(res); await p.close(); continue; }
          await p.route('**/*', (r) => {
            if (!isApi(r.request(), apiGlob)) return r.continue();
            hits++;
            return m === 'offline' ? r.abort('internetdisconnected') : r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"stress test"}' });
          });
        }
        await open(p, url, { quietMs: 500 });
        await settle(p);
        await prepare(p);
        if (m === 'no-images') res.applied = `${hits} image request(s) blocked`;
        if (m === 'errors' || m === 'offline') res.applied = `${hits} data request(s) ${m === 'offline' ? 'aborted' : 'answered 500'}`;
        let extra = [];
        let directionOnly = false; // a right-to-left page flipped to LTR keeps its Arabic text: only mirroring is meaningful
        if (m === 'empty' || m === 'long' || m.startsWith('list-')) res.lists = await p.evaluate(findLists, { list, scope });
        if (['pseudo', 'long', 'empty', 'numbers'].includes(m)) {
          const r = await p.evaluate(mutateText, { kind: m, scope, targets, skip, expand: Number(a.expand) || 35 });
          res.applied = `${r.changed} text(s) changed${r.note ? '; ' + r.note : ''}`;
        } else if (m === 'rtl') {
          // A page that is already right-to-left: dir=rtl again would change nothing, and every asymmetric element
          // would "stay". Check its physical text-align: left as it stands, then flip it to its other direction.
          const native = (await p.evaluate(pageDirection)) === 'rtl';
          directionOnly = native;
          const to = native ? 'ltr' : 'rtl';
          const own = native ? await p.evaluate(alignCheck, { side: 'left', dir: 'this RTL page' }) : [];
          // A stylesheet made for right-to-left only (bootstrap.rtl.css, style-rtl.css: RTLCSS output, physical
          // properties swapped): the LTR locale loads another one, so flipping this page says nothing about it.
          const rtlSheet = native ? await p.evaluate(() => [...document.styleSheets].map((x) => x.href || '').find((h) => /(^|[._-])rtl([._-]|$)/i.test(h.split(/[?#]/)[0].split('/').pop())) || null) : null;
          const n = rtlSheet ? 0 : await p.evaluate(mirrorRecord, { scope });
          const took = rtlSheet ? false : await p.evaluate(flipDirection, { to });
          await p.waitForTimeout(150);
          const after = took ? [...await p.evaluate(mirrorCheck, { to }), ...await p.evaluate(alignCheck, { side: to === 'rtl' ? 'left' : 'right', dir: to.toUpperCase() })] : [];
          extra = [...own, ...after].map((f) => ({ ...f, sev: 'warn' }));
          const r = native ? { changed: 0 } : await p.evaluate(mutateText, { kind: 'rtl-text', scope, targets, skip, ar: AR });
          res.applied = native
            ? `the page is already right-to-left: physical text-align checked as it is${rtlSheet ? `; it loads a right-to-left stylesheet (${rtlSheet.split('/').pop()}), so its LTR locale uses another: not flipped (run --only rtl on the LTR page)` : `, then flipped to dir=ltr (its other locale)${took ? `; ${n} element(s) checked for mirroring` : '; the flip did not take (direction set !important?): mirroring not checked'}`}; text left as it is`
            : `dir=rtl lang=ar${took ? `; ${n} element(s) checked for mirroring` : '; the flip did not take (direction set !important?): mirroring not checked'}; ${r.changed} text(s) in Arabic`;
        } else if (m.startsWith('list-')) {
          const r = await p.evaluate(mutateLists, { count: Number(m.slice(5)) });
          res.applied = r.containers.length ? r.containers.map((c) => `${c.container}: ${c.before} → ${c.after} ${c.item}${m === 'list-500' ? ` (${c.height}px tall, layout ${c.layoutMs} ms)` : ''}`).join('; ') : 'no repeated list found: pass --list';
          if (m === 'list-500') for (const c of r.containers) if (c.height > 20000) extra.push({ check: 'long-list', sev: 'info', sel: c.container, detail: `${c.after} ${c.item}s make a ${c.height}px list — paginate, "load more" or virtualise before real data does this`, box: null });
          if (m === 'list-0') for (const c of r.containers) extra.push({ check: 'empty-list', sev: 'info', sel: c.container, detail: `emptied (${c.before} → 0 ${c.item}): look at the capture — is there an empty state, or just a heading over nothing?`, box: null });
        }
        await p.waitForTimeout(250);
        const now = await measure(p, mobile);
        now.rt = await p.evaluate(regionText);
        now.junk = await p.evaluate(junkText);
        const fresh = now.findings.filter((f) => !baseKeys.has(key(f)) && f.sev !== 'info');
        const junk = now.junk.filter((j) => !baseJunk.has(j.text)).map((j) => ({ check: 'junk-text', sev: 'error', sel: j.sel, detail: `shows "${j.text}"`, box: j.box }));
        let img = [];
        if (m === 'no-images') {
          const r = await p.evaluate(imageFallback);
          img = r.unreadable.map((f) => ({ ...f, sev: 'error' }));
          // Same image, same place in document order, in the loaded page: how tall was it there?
          const was = (b) => (base.imgs[b.index]?.url === b.url ? base.imgs[b.index].h : undefined);
          const jumped = r.broken.filter((b) => !b.sized && was(b) !== undefined && Math.abs(was(b) - b.h) > 24);
          if (jumped.length) img.push({ check: 'unsized-image', sev: 'warn', sel: jumped[0].sel, count: jumped.length, detail: `${jumped.length} image(s) with no width/height or aspect-ratio are ${jumped[0].h}px tall while missing and ${was(jumped[0])}px loaded (${jumped.slice(0, 3).map((b) => b.src).join(', ')}): everything below jumps when they arrive`, box: jumped[0].box });
        }
        const regions = ['errors', 'offline', 'list-0', 'no-images'].includes(m) ? compareRegions(base.rt, now.rt, m) : [];
        const errNote = errs.length ? [{ check: 'page-error', sev: 'warn', sel: '(page)', detail: `${errs.length} uncaught error(s): ${errs[0]}`, box: null }] : [];
        res.new = directionOnly ? [...junk, ...extra] : [...fresh, ...junk, ...img, ...extra, ...compareControls(base, now, mobile), ...regions, ...(['errors', 'offline'].includes(m) ? errNote : [])];
        // Group repeats of one element kind: 40 cards clipped read as one line, "×40".
        const g = new Map();
        for (const f of res.new) { const k = key(f); const e = g.get(k); if (e) e.count++; else g.set(k, { ...f, count: 1 }); }
        res.new = [...g.values()].sort((x, y) => WEIGHT[y.sev] - WEIGHT[x.sev]);
        res.docH = await p.evaluate(() => document.documentElement.scrollHeight).catch(() => null);
        // Evidence: the marked page, a cell for the sheet, crops of the worst findings.
        const marks = res.new.filter((f) => f.box && f.sev !== 'info').slice(0, 8);
        if (marks.length) {
          // The sheet cell and the crops first; the full-page JPEG last (on a zoomed-out phone page a full-page
          // screenshot changes the page scale, and text autosizing then moves the text away from the marks).
          const rmMarks = await markFindings(p, marks);
          const png = await evidenceShot(p, marks[0].box, { height }).catch(() => null);
          if (png) cells.push({ label: `${m} @ ${width}px — ${res.new.filter((f) => f.sev === 'error').length} ✗, ${res.new.filter((f) => f.sev === 'warn').length} △`, png, notes: marks.map((f) => `${MARK[f.sev]} ${f.check}: ${f.sel}${f.count > 1 ? ` (×${f.count})` : ''} — ${f.detail}`.slice(0, 150)), cellW: mobile ? 300 : 520, sc: marks.reduce((s, f) => s + WEIGHT[f.sev], 0) });
          await rmMarks();
          for (const f of marks.filter((f) => f.sev === 'error').slice(0, 2)) {
            if (cropN >= 16) break;
            const file = path.join(pageDir, 'crops', `${String(++cropN).padStart(2, '0')}-${m}-${width}-${f.check}.png`);
            const rm1 = await markFindings(p, [f]);
            if (await evidenceCrop(p, f.box, file).catch(() => false)) crops.push({ file, mutation: m, width, check: f.check, sel: f.sel });
            await rm1();
          }
          if (!a['no-full']) { const rmAll = await markFindings(p, marks); const f = path.join(pageDir, `${m}-${width}.jpg`); await shot(p, f); res.full = f; await rmAll(); }
        }
        await p.close();
      }
      res.ms = Date.now() - tm;
      results.push(res);
    }
    await ctx.close();
  }

  // Contact sheet: the mutations that broke most, worst first, then the loading filmstrip on its own sheet.
  const sheet = cells.length ? path.join(outDir, `${slug}-stress-sheet.jpg`) : null;
  if (sheet) await drawSheet(browser, cells.sort((p, q) => q.sc - p.sc).slice(0, 12), sheet, { title: `${url} — what each content mutation broke (new findings only, boxed and numbered)` });
  const strip = filmstrip?.length ? path.join(outDir, `${slug}-slow.jpg`) : null;
  if (strip) await drawSheet(browser, filmstrip, strip, { title: `${url} — throttled load (${net.latency} ms RTT, ${net.down} kbit/s, ${net.cpu}× CPU): what the first seconds show` });
  return { url, browser: a.__build || null, ms: Date.now() - t0, widths, mutations: muts, results, sheet, filmstrip: strip, crops };
}

function markdown(r) {
  const L = [`## ${r.url}`, '', `${r.mutations.length} mutations at ${r.widths.join(', ')} px in ${(r.ms / 1000).toFixed(0)} s.${r.sheet ? ` Sheet: \`${r.sheet}\`.` : ''}${r.filmstrip ? ` Loading filmstrip: \`${r.filmstrip}\`.` : ''}`, ''];
  L.push('| mutation | width | applied | new ✗ | new △ |', '| --- | --- | --- | --- | --- |');
  for (const x of r.results.filter((x) => x.mutation !== 'none')) L.push(`| ${x.mutation} | ${x.width} | ${esc(x.applied || '')} | ${x.new.filter((f) => f.sev === 'error').length} | ${x.new.filter((f) => f.sev === 'warn').length} |`);
  L.push('');
  // Which mutations break which elements.
  const byEl = new Map();
  for (const x of r.results) for (const f of x.new || []) {
    if (f.sev === 'info') continue;
    const k = norm(f.sel);
    const e = byEl.get(k) || { sel: f.sel, w: 0, cells: new Map() };
    e.w += WEIGHT[f.sev];
    const c = e.cells.get(x.mutation) || new Set();
    c.add(`${MARK[f.sev]} ${f.check}`); e.cells.set(x.mutation, c); byEl.set(k, e);
  }
  if (byEl.size) {
    const cols = r.mutations.filter((m) => [...byEl.values()].some((e) => e.cells.has(m)));
    L.push('**What breaks what** (element × mutation; details below):', '', `| element | ${cols.join(' | ')} |`, `| --- |${cols.map(() => ' --- |').join('')}`);
    for (const e of [...byEl.values()].sort((p, q) => q.w - p.w).slice(0, 30)) L.push(`| \`${esc(e.sel)}\` | ${cols.map((m) => (e.cells.has(m) ? [...e.cells.get(m)].join(', ') : '')).join(' | ')} |`);
    L.push('');
  } else L.push('No mutation produced a new finding. The checks are leads, not a verdict: look at the sheets.', '');
  for (const x of r.results.filter((x) => x.new?.length)) {
    L.push(`**${x.mutation} @ ${x.width}px**${x.full ? ` (\`${x.full}\`)` : ''}`);
    for (const f of x.new.slice(0, 12)) L.push(`- ${MARK[f.sev]} ${f.check}: \`${f.sel}\`${f.count > 1 ? ` ×${f.count}` : ''} — ${f.detail}`);
    if (x.new.length > 12) L.push(`- … ${x.new.length - 12} more in the JSON`);
    L.push('');
  }
  if (r.crops.length) L.push(`1:1 crops: ${r.crops.map((c) => `\`${c.file}\``).join(', ')}`, '');
  return L.join('\n');
}

async function main() {
  const a = parseArgs();
  const urls = a.url ? asList(a.url) : asList(a.paths, ['/']).map((p) => urlFor(a.base || 'http://localhost:3000', p));
  const outDir = a.out || 'stress';
  await mkdir(outDir, { recursive: true });
  const { browser } = await launch({ chrome: a.chrome });
  a.__build = await browserBuild(browser);
  let anyError = false;
  const md = ['# Content stress', ''];
  try {
    for (const url of urls) {
      try {
        const r = await stressPage(browser, url, a, outDir);
        const slug = slugFor(new URL(url).pathname + new URL(url).search);
        await writeFile(path.join(outDir, `${slug}-stress.json`), JSON.stringify(r, null, 1));
        const m = markdown(r);
        await writeFile(path.join(outDir, `${slug}-stress.md`), m);
        md.push(m);
        console.log(m);
        if (r.results.some((x) => x.new?.some((f) => f.sev === 'error'))) anyError = true;
      } catch (e) {
        anyError = true;
        console.error(`✗ ${url} not stressed: ${String(e?.stack || e).split('\n').slice(0, 3).join(' ')}`);
      }
    }
  } finally { await browser.close(); }
  if (urls.length > 1) await writeFile(path.join(outDir, 'stress.md'), md.join('\n'));
  process.exitCode = anyError ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
