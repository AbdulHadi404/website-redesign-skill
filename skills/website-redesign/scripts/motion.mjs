#!/usr/bin/env node
/**
 * Does the approved motion exist in the build, and does it survive reduced motion? Plans say "subtle animations";
 * builds ship static, or animate the wrong thing, or delete everything under prefers-reduced-motion. This script
 * checks a rendered page against a machine-checkable motion spec (motion.md §2, "The motion spec") and audits
 * the motion it finds without one.
 *
 *   node motion.mjs <url> | --base http://localhost:3000 --path /pricing
 *                   [--spec DESIGN.md|motion.json] [--out motion-report] [--device desktop|phone]
 *                   [--filmstrip all|none|id,id] [--times 0,50,100,150,200,300,450,700] [--jpeg]
 *                   [--no-audit] [--max 60] [--strict]
 *
 * Without --spec (the audit, desktop pointer):
 *   inventory   every element with a running-capable transition or animation: properties, durations, easings
 *   flags       `transition: all` · layout properties animated (width/height/top/left/margin/padding/…) in transitions,
 *               @keyframes or running animations · durations off the motion tokens (read from the page's --dur-*
 *               custom properties, else motion.md §4) or longer than the largest token · linear easing on movement ·
 *               keyframes entering from scale(0) · controls whose hover or keyboard focus changes nothing visible ·
 *               buttons with no :active (press) feedback · infinite animations · reduced-motion handling: CSS
 *               `prefers-reduced-motion` blocks, a universal "kill everything" rule, JS matchMedia queries, and what
 *               changes at load under reduce (CSS/WAAPI animations and JS-driven inline styles) · requestAnimationFrame
 *               still firing at rest (a library or loop that never sleeps)
 * With --spec, each entry is triggered for real (hover, focus, press, click, scroll, load, key:<Key>) and sampled
 * every frame (computed transform/opacity/colour/size, document.getAnimations(), view-transition pseudos), once
 * normally and once with prefers-reduced-motion: reduce. Per entry it reports whether anything animated (or it
 * changed in one frame, or not at all), the observed duration and easing against the tokens, which properties
 * moved (undeclared layout properties flagged), the stagger, and under reduce whether it stopped, was substituted
 * (a fade or colour change) or still moves, and whether the content ended up the same. "interrupt": ms re-triggers
 * mid-flight and reports whether the value continued, jumped, or the input never arrived (a view transition
 * swallows clicks). --filmstrip writes a PNG per entry: frames at fixed times after the trigger, normal above,
 * reduced below (screencast frames: the last frame painted at or before each time).
 *
 * The spec, in DESIGN.md as a fenced ```motion-spec block (JSON) or as a table whose header has id, trigger and
 * target columns (the same fields; lists comma-separated):
 *   { "tokens": { "duration": { "micro": 100, "medium": 240 }, "easing": { "out": "cubic-bezier(0.2, 0, 0, 1)" } },
 *     "motion": [ { "id": "sheet-open", "trigger": "click", "on": "#open", "target": "#sheet",
 *                   "properties": ["transform", "opacity"], "duration": "large", "easing": "out",
 *                   "reduced": "fade", "stagger": 40, "interrupt": 120, "setup": [{ "click": "#menu" }] } ] }
 *   duration   a token name (medium, --dur-medium), a number of ms (±15%), or a range "200-300"
 *   easing     a token name (out, --ease-out) or any CSS easing
 *   reduced    keep (essential feedback: press, toggle, focus) · fade (no movement; opacity/colour ≤ 200 ms or
 *              instant) · instant (final state in one frame) · static (already in its final state, nothing changes:
 *              scroll reveals) · pause (a loop that must not run)
 * How it decides: a channel (translate, scale, opacity, colour, shadow, size, text, a transitioning custom property)
 * that changes over ≥ 3 frames animates; 1–2 changes is instant. CSS/WAAPI durations and easings are read exactly from
 * the Animation objects; JavaScript-driven motion (GSAP, anime.js, React Spring) is judged from samples: a duration
 * range (last visible change … duration fitted with the best easing) and the easing that fits best. Targets mounted
 * by the trigger (React AnimatePresence) are picked up late. Channels already moving before the trigger (a pulsing
 * loop) are ignored. A box that moves because something near it changed size is a note, not a failure.
 * Writes <out>/motion.md, <out>/motion.json and <out>/filmstrip-<id>.png. Exits 1 when a spec entry fails (with
 * --strict, also on any flag). Limits: sampling reads computed styles, so canvas, WebGL, Lottie and Rive frames are
 * invisible to it (their <canvas> is one element); hover checks need a fine pointer (skipped with --device phone);
 * a CSS counter's digits are not readable (the transitioning custom property is). Scored on four builds of one page
 * and six held-out pages: research/stage2/experiments/S2-motion-lab (c/).
 */
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs, asList, launch, open, urlFor } from './lib/env.mjs';

const a = parseArgs();
const url = a._[0] || a.url || (a.base && a.base !== true ? urlFor(String(a.base), String(a.path && a.path !== true ? a.path : '/')) : null);
if (!url || url === true) {
  console.error('Usage: node motion.mjs <url> [--spec DESIGN.md|motion.json] [--out motion-report] [--device desktop|phone] [--filmstrip all|none|id,id] [--times 0,50,100,150,200,300,450,700] [--jpeg] [--no-audit] [--max 60] [--strict]');
  process.exit(2);
}
const outDir = path.resolve(String(a.out || 'motion-report'));
const phone = a.device === 'phone';
const CTX = phone
  ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
  : { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 };
const TIMES = asList(a.times, ['0', '50', '100', '150', '200', '300', '450', '700']).map(Number);
const MAX = Number(a.max) || 60;
const filmArg = a.filmstrip === undefined ? 'all' : String(a.filmstrip);

// ---------------------------------------------------------------- tokens and easing maths
const DEFAULT_TOKENS = {
  duration: { micro: 100, small: 150, medium: 240, large: 300, page: 400, hero: 700 },
  easing: { out: 'cubic-bezier(0.2, 0, 0, 1)', 'in-out': 'cubic-bezier(0.4, 0.14, 0.3, 1)', exit: 'cubic-bezier(0.3, 0, 1, 1)', emphasized: 'cubic-bezier(0.05, 0.7, 0.1, 1)' },
};
const KEYWORD_EASE = { ease: [0.25, 0.1, 0.25, 1], 'ease-in': [0.42, 0, 1, 1], 'ease-out': [0, 0, 0.58, 1], 'ease-in-out': [0.42, 0, 0.58, 1], linear: [0, 0, 1, 1] };
const tokenKey = (s) => String(s).trim().replace(/^var\(|\)$/g, '').replace(/^--/, '').replace(/^(motion-)?(dur(ation)?|ease|easing|time)-/, '');

function bezier([x1, y1, x2, y2]) {
  const cx = (u) => 3 * (1 - u) ** 2 * u * x1 + 3 * (1 - u) * u * u * x2 + u ** 3;
  const cy = (u) => 3 * (1 - u) ** 2 * u * y1 + 3 * (1 - u) * u * u * y2 + u ** 3;
  return (t) => { let lo = 0, hi = 1, u = t; for (let i = 0; i < 30; i++) { u = (lo + hi) / 2; if (cx(u) < t) lo = u; else hi = u; } return cy(u); };
}
/** An easing function from a CSS easing string (keywords, cubic-bezier(), linear(), steps() approximated). */
function easingFn(str) {
  const s = String(str || 'linear').trim().toLowerCase();
  if (KEYWORD_EASE[s]) return bezier(KEYWORD_EASE[s]);
  let m = s.match(/^cubic-bezier\(([^)]+)\)$/);
  if (m) return bezier(m[1].split(',').map(Number));
  m = s.match(/^linear\((.+)\)$/);
  if (m) {
    const stops = m[1].split(',').map((p) => p.trim().split(/\s+/)).map(([v, ...pc]) => ({ v: Number(v), x: pc.length ? parseFloat(pc[0]) / 100 : null }));
    stops[0].x ??= 0; stops.at(-1).x ??= 1;
    for (let i = 1; i < stops.length - 1; i++) if (stops[i].x == null) { let j = i; while (stops[j].x == null) j++; const x0 = stops[i - 1].x, x1 = stops[j].x; for (let k = i; k < j; k++) stops[k].x = x0 + ((x1 - x0) * (k - i + 1)) / (j - i + 1); }
    return (t) => { for (let i = 1; i < stops.length; i++) if (t <= stops[i].x) { const p = stops[i - 1], q = stops[i]; return q.x === p.x ? q.v : p.v + ((q.v - p.v) * (t - p.x)) / (q.x - p.x); } return 1; };
  }
  m = s.match(/^steps\((\d+)/);
  if (m) { const n = +m[1]; return (t) => Math.floor(t * n) / n; }
  return null;
}
/** Distance between two easings: RMS over 21 points (0 = identical). */
function easingDistance(e1, e2) {
  const f = easingFn(e1), g = easingFn(e2);
  if (!f || !g) return null;
  let s = 0; for (let i = 0; i <= 20; i++) { const t = i / 20; s += (f(t) - g(t)) ** 2; }
  return Math.sqrt(s / 21);
}

// ---------------------------------------------------------------- spec parsing
async function readSpec(file) {
  if (!file || file === true) return null;
  const text = await readFile(String(file), 'utf8');
  let spec = null;
  if (/\.json$/i.test(String(file))) spec = JSON.parse(text);
  else {
    const block = text.match(/```\s*(?:motion-spec|json\s+motion)\s*\n([\s\S]*?)```/);
    if (block) spec = JSON.parse(block[1]);
    else {
      // A markdown table whose header names id, trigger and target
      const lines = text.split('\n');
      for (let i = 0; i < lines.length - 1; i++) {
        const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
        if (!/^\s*\|/.test(lines[i]) || !/^\s*\|?\s*:?-{3,}/.test(lines[i + 1])) continue;
        const head = cells(lines[i]).map((h) => h.toLowerCase().replace(/[^a-z]/g, ''));
        if (!['id', 'trigger', 'target'].every((k) => head.includes(k))) continue;
        const rows = [];
        for (let j = i + 2; j < lines.length && /^\s*\|/.test(lines[j]); j++) {
          const c = cells(lines[j]); const o = {};
          head.forEach((h, k) => { let v = (c[k] ?? '').replace(/^`|`$/g, ''); if (v === '' || v === '—' || v === '-') return;
            if (h === 'properties') v = v.split(',').map((x) => x.trim().replace(/^`|`$/g, '')).filter(Boolean);
            else if (['stagger', 'interrupt'].includes(h)) v = Number(v);
            o[h === 'reducedmotion' ? 'reduced' : h] = v; });
          rows.push(o);
        }
        spec = { motion: rows };
        break;
      }
    }
  }
  if (!spec || !Array.isArray(spec.motion)) throw new Error(`${file}: no motion spec found (a \`\`\`motion-spec JSON block, a table with id/trigger/target columns, or a .json file)`);
  return spec;
}

// ---------------------------------------------------------------- in-page code
// Everything the page runs is plain functions passed to evaluate/addInitScript (no closures over Node values).
function pageInit() {
  // Record reduced-motion queries made from JavaScript, and inline-style churn (JS-driven animation) at load.
  const mm = window.matchMedia.bind(window);
  window.__mqReduce = 0;
  window.matchMedia = (q) => { if (/prefers-reduced-motion/.test(q)) window.__mqReduce++; return mm(q); };
  window.__styleChurn = new Map();
  const t0 = performance.now(); const last = new WeakMap();
  // only inline changes that move something count (an opacity-only fade is a valid reduced-motion substitute)
  const sig = (el) => { const st = el.style; return [st.transform, st.translate, st.scale, st.rotate, st.top, st.left, st.right, st.bottom, st.marginTop, st.marginLeft, st.width, st.height].join('|'); };
  const mo = new MutationObserver((list) => {
    if (performance.now() - t0 > 4000) { mo.disconnect(); return; }
    for (const r of list) { const el = r.target; if (!(el instanceof HTMLElement || el instanceof SVGElement)) continue; const k = sig(el); if (last.get(el) === k) continue; last.set(el, k);
      window.__styleChurn.set(el, (window.__styleChurn.get(el) || 0) + 1); }
  });
  const go = () => mo.observe(document.documentElement, { attributes: true, attributeFilter: ['style'], subtree: true });
  if (document.documentElement) go(); else document.addEventListener('DOMContentLoaded', go);
  // count requestAnimationFrame callbacks: nothing should tick when nothing moves
  const raf = window.requestAnimationFrame.bind(window); window.__rafCount = 0;
  window.requestAnimationFrame = (cb) => raf((t) => { window.__rafCount++; cb(t); });
  window.__inputs = [];
  for (const type of ['pointerdown', 'click', 'mouseover', 'keydown', 'focusin', 'scroll'])
    addEventListener(type, (e) => window.__inputs.push({ type, t: performance.now(), onTarget: !!(window.__on && e.target instanceof Node && window.__on.some((o) => o === e.target || o.contains(e.target))), tag: e.target?.tagName || '' }), { capture: true, passive: true });
}

function pageHelpers() {
  if (window.__mh) return;
  const describe = (el) => {
    if (!el || el.nodeType !== 1) return String(el);
    if (el.id) return `#${el.id}`;
    const own = el.tagName.toLowerCase() + [...el.classList].filter((c) => !/^(motion|in|visible|is-|js-)/.test(c)).slice(0, 2).map((c) => `.${c}`).join('');
    const anc = el.parentElement?.closest('[id]');
    return anc && anc !== document.body && anc !== document.documentElement ? `#${anc.id} ${own}` : own;
  };
  const LAYOUT = /^(width|height|min-width|min-height|max-width|max-height|top|left|right|bottom|inset(-.+)?|margin(-.+)?|padding(-.+)?|border(-top|-right|-bottom|-left)?-width|font-size|line-height|letter-spacing|flex-basis|gap|row-gap|column-gap)$/;
  const MOVE = /^(transform|translate|scale|rotate|top|left|right|bottom|inset|margin.*|offset.*)$/;
  const splitTop = (s) => String(s).split(/,(?![^(]*\))/).map((x) => x.trim());
  const ms = (s) => { const v = parseFloat(s); return /ms$/.test(s) ? v : v * 1000; };
  const num = (v) => parseFloat(v) || 0;
  const read = (el) => {
    const cs = getComputedStyle(el);
    let m = null; try { m = cs.transform && cs.transform !== 'none' ? new DOMMatrixReadOnly(cs.transform) : null; } catch { /* ignore */ }
    const tr = cs.translate && cs.translate !== 'none' ? cs.translate.split(' ').map(num) : [0, 0];
    const sc = cs.scale && cs.scale !== 'none' ? cs.scale.split(' ').map(Number) : [1, 1];
    const sx = (m ? Math.hypot(m.m11, m.m12) : 1) * (sc[0] ?? 1), sy = (m ? Math.hypot(m.m21, m.m22) : 1) * (sc[1] ?? sc[0] ?? 1);
    const text = el.childElementCount === 0 ? (el.textContent || '').trim().slice(0, 32) : '';
    const cvar = el.getAnimations().map((x) => x.transitionProperty || '').filter((p) => p.startsWith('--')).map((p) => `${p}:${cs.getPropertyValue(p).trim()}`).join(';');
    return { tx: +((m ? m.m41 : 0) + (tr[0] || 0)).toFixed(2), ty: +((m ? m.m42 : 0) + (tr[1] || 0)).toFixed(2), sx: +sx.toFixed(4), sy: +sy.toFixed(4),
      rot: +(m ? (Math.atan2(m.m12, m.m11) * 180) / Math.PI : 0).toFixed(2) + (cs.rotate && cs.rotate !== 'none' ? num(cs.rotate) : 0),
      op: +(+cs.opacity).toFixed(3), ow: el.offsetWidth ?? 0, oh: el.offsetHeight ?? 0, ol: el.offsetLeft ?? 0, ot: el.offsetTop ?? 0,
      color: cs.color, bg: cs.backgroundColor, shadow: cs.boxShadow, filter: cs.filter, clip: cs.clipPath, outline: cs.outlineStyle === 'none' ? 'none' : `${cs.outlineWidth} ${cs.outlineColor}`,
      vis: cs.visibility === 'hidden' || cs.display === 'none' ? 0 : 1, text, cvar };
  };
  const animInfo = (an) => {
    const eff = an.effect; const tm = eff?.getTiming?.() || {}; let kf = []; try { kf = eff?.getKeyframes?.() || []; } catch { /* ignore */ }
    const props = [...new Set(kf.flatMap((k) => Object.keys(k)).filter((p) => !['offset', 'computedOffset', 'easing', 'composite'].includes(p)))]
      .map((p) => p.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`));
    if (an.transitionProperty && !props.includes(an.transitionProperty)) props.push(an.transitionProperty);
    let easing = tm.easing || 'linear';
    if (easing === 'linear' && kf.length && kf[0].easing && kf[0].easing !== 'linear') easing = kf[0].easing; // CSS transitions and CSS animations keep the timing function on the keyframes
    const kind = an.constructor?.name === 'CSSTransition' ? 'transition' : an.constructor?.name === 'CSSAnimation' ? 'animation' : 'waapi';
    const timeline = an.timeline && an.timeline !== document.timeline ? an.timeline.constructor?.name || 'custom' : 'document';
    return { kind, name: an.animationName || an.transitionProperty || an.id || '', pseudo: eff?.pseudoElement || '', target: describe(eff?.target),
      duration: typeof tm.duration === 'number' ? Math.round(tm.duration) : null, delay: Math.round(tm.delay || 0), easing, iterations: tm.iterations, props, timeline };
  };
  const readVT = () => {
    const vt = document.getAnimations().filter((x) => (x.effect?.pseudoElement || '').startsWith('::view-transition'));
    if (!vt.length) return null;
    // one entry per pseudo: its position/scale and its opacity (sums would hide a symmetric slide or crossfade)
    const move = [], fade = [];
    for (const pe of [...new Set(vt.map((x) => x.effect.pseudoElement))].sort()) { const cs = getComputedStyle(document.documentElement, pe); const t = cs.transform;
      let m = [0, 0, 1]; if (t && t !== 'none') { const q = new DOMMatrixReadOnly(t); m = [q.m41, q.m42, Math.hypot(q.m11, q.m12)]; }
      if (cs.translate && cs.translate !== 'none') { const tr = cs.translate.split(' ').map(num); m[0] += tr[0] || 0; m[1] += tr[1] || 0; }
      move.push(m.map((x) => x.toFixed(1)).join(',')); fade.push((+cs.opacity).toFixed(2)); }
    return { n: vt.length, move: move.join(' '), fade: fade.join(' ') };
  };
  const fingerprint = (el) => {
    const f = (e, pseudo) => { const cs = getComputedStyle(e, pseudo); if (pseudo && (cs.content === 'none' || cs.content === 'normal')) return '';
      return [cs.color, cs.backgroundColor, cs.backgroundImage, cs.borderTopColor, cs.borderBottomColor, cs.boxShadow, cs.outlineStyle === 'none' ? 'none' : `${cs.outlineWidth} ${cs.outlineStyle} ${cs.outlineColor}`,
        `${cs.textDecorationLine} ${cs.textDecorationColor}`, cs.opacity, cs.transform, cs.translate, cs.scale, cs.filter].join('|'); };
    const kids = [...el.querySelectorAll('*')].slice(0, 6).map((k) => { const cs = getComputedStyle(k); return [cs.color, cs.opacity, cs.transform, cs.translate, cs.backgroundColor, cs.fill, cs.stroke].join('|'); });
    return [f(el), f(el, '::before'), f(el, '::after'), ...kids].join('§');
  };
  // finish what ends; hold loops (a pulsing button) at their first frame, so two reads compare states, not loop phases
  const finishAll = (el) => { for (const x of el.getAnimations?.({ subtree: true }) ?? []) { try { if (x.effect?.getComputedTiming?.().iterations !== Infinity) x.finish(); else { x.pause(); x.currentTime = 0; } } catch { /* ignore */ } } };
  const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05 && !el.closest('[inert],[aria-hidden="true"]'); };
  window.__mh = { describe, LAYOUT, MOVE, splitTop, ms, read, animInfo, readVT, fingerprint, finishAll, visible };
}

/** The static inventory: every element that has a transition or an animation, plus stylesheet facts. */
function inventory(maxEls) {
  const { describe, LAYOUT, MOVE, splitTop, ms } = window.__mh;
  const items = [];
  const els = [...document.querySelectorAll('body, body *')].slice(0, 4000);
  const interactive = (el) => el.matches('a[href], button, input, select, textarea, summary, [role=button], [role=link], [role=tab], [role=switch], [role=menuitem], [tabindex]:not([tabindex="-1"])');
  for (const el of els) {
    for (const pseudo of ['', '::before', '::after']) {
      const cs = getComputedStyle(el, pseudo || null);
      if (pseudo && (cs.content === 'none' || cs.content === 'normal')) continue;
      const props = splitTop(cs.transitionProperty), durs = splitTop(cs.transitionDuration).map(ms), dels = splitTop(cs.transitionDelay).map(ms), eases = splitTop(cs.transitionTimingFunction);
      const transitions = props.map((p, i) => ({ p, d: durs[i % durs.length], delay: dels[i % dels.length], e: eases[i % eases.length] })).filter((t) => t.d > 0 && t.p !== 'none');
      const names = splitTop(cs.animationName), ad = splitTop(cs.animationDuration).map((x) => (x === 'auto' ? 0 : ms(x))), ai = splitTop(cs.animationIterationCount), ae = splitTop(cs.animationTimingFunction);
      const tl = splitTop(cs.animationTimeline || 'auto'); const dl = splitTop(cs.animationDelay).map(ms);
      const animations = names.map((n, i) => ({ n, d: ad[i % ad.length], it: ai[i % ai.length], e: ae[i % ae.length], delay: dl[i % dl.length], tl: tl[i % tl.length] })).filter((x) => x.n !== 'none' && (x.d > 0 || x.tl !== 'auto'));
      if (!transitions.length && !animations.length) continue;
      items.push({ sel: describe(el) + pseudo, interactive: interactive(el), transitions, animations });
    }
    if (items.length >= maxEls * 20) break;
  }
  // Stylesheets: keyframes (which properties they animate, scale(0) entrances), reduced-motion blocks, a universal kill rule.
  const keyframes = {}; let reduceBlocks = 0; let killAll = null; let blocked = 0; const tokenProps = {};
  const walk = (rules, inReduce) => {
    for (const r of rules) {
      if (r.type === CSSRule.KEYFRAMES_RULE) {
        const props = new Set(); let scale0 = false;
        for (const k of r.cssRules) { for (let i = 0; i < k.style.length; i++) props.add(k.style[i]);
          if (/^(from|0%)$/.test(k.keyText.trim()) && /scale\(\s*0(\.0+)?\s*[,)]|scale:\s*0(\s|;|$)|matrix\(\s*0(\.0+)?\s*,/.test(k.style.cssText)) scale0 = true; }
        keyframes[r.name] = { props: [...props], layout: [...props].filter((p) => LAYOUT.test(p)), move: [...props].filter((p) => MOVE.test(p)), scale0 };
      } else if (r.type === CSSRule.MEDIA_RULE) {
        const red = /prefers-reduced-motion:\s*reduce/.test(r.conditionText || r.media?.mediaText || '');
        if (red) reduceBlocks++;
        walk(r.cssRules, inReduce || red);
      } else if (r.cssRules && r.type !== CSSRule.STYLE_RULE) walk(r.cssRules, inReduce);
      else if (r.type === CSSRule.STYLE_RULE) {
        if (inReduce && /(^|,)\s*(\*|html\s+\*|body\s+\*|:root\s+\*)(\s*,|\s*$|::)/.test(r.selectorText) &&
          /(animation|transition)(-duration)?\s*:\s*(none|0s|0\.0*1ms|0ms|1ms)\b[^;]*!important/.test(r.style.cssText)) killAll = `${r.selectorText} { ${r.style.cssText.slice(0, 120)} }`;
        if (/(^|,)\s*(:root|html)\s*(,|$)/.test(r.selectorText)) for (let i = 0; i < r.style.length; i++) { const n = r.style[i]; if (/^--(motion-)?(dur|duration|ease|easing|time)-/.test(n)) tokenProps[n] = getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
        if (r.cssRules?.length) walk(r.cssRules, inReduce); // nested CSS
      }
    }
  };
  for (const sh of document.styleSheets) { try { walk(sh.cssRules, false); } catch { blocked++; } }
  return { items, keyframes, reduceBlocks, killAll, blockedSheets: blocked, tokenProps };
}

/** Motion at load: CSS/WAAPI animations seen in the first seconds, and elements whose inline style kept changing. */
function loadMotion() {
  const { describe, animInfo } = window.__mh;
  const anims = document.getAnimations().map(animInfo);
  const churn = [...(window.__styleChurn || new Map())].filter(([, n]) => n >= 4).map(([el, n]) => ({ sel: describe(el), n })).slice(0, 30);
  return { anims, churn, mqReduce: window.__mqReduce || 0 };
}

// Sampler: start → every frame reads the targets, their animations and any view-transition pseudos.
function samplerStart({ sel, on, ms }) {
  const { read, animInfo, readVT } = window.__mh;
  let els = [...document.querySelectorAll(sel)].slice(0, 12);
  window.__on = on ? [...document.querySelectorAll(on)].slice(0, 1) : els.slice(0, 1);
  const late = !els.length; // mounted by the trigger (AnimatePresence, a toast appended on click): look again every frame
  window.__inputs = [];
  const frames = []; const anims = new Map(); const t0 = performance.now();
  window.__sample = { frames, anims, n: els.length, t0, done: false, delays: [], inView: els.map((e) => { const r = e.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }) };
  const tick = () => {
    const t = performance.now();
    if (late && els.length < 12) { const found = [...document.querySelectorAll(sel)].slice(0, 12); if (found.length > els.length) { els = found; window.__sample.n = els.length; } }
    const v = els.map((e) => (e.isConnected ? read(e) : null));
    const list = [...els.flatMap((e) => (e.isConnected ? e.getAnimations({ subtree: true }) : [])), ...document.getAnimations().filter((x) => (x.effect?.pseudoElement || '').startsWith('::view-transition'))];
    for (const x of list) { const info = animInfo(x); const k = `${info.kind}|${info.name}|${info.pseudo}|${info.target}|${info.duration}|${info.delay}`; if (!anims.has(k)) anims.set(k, { ...info, firstSeen: t - t0 }); }
    frames.push({ t: t - t0, v, vt: readVT(), running: list.filter((x) => x.playState === 'running').length });
    els.forEach((e, i) => { if (window.__sample.delays[i] == null) { const d = e.getAnimations().filter((x) => x.effect?.getComputedTiming?.().iterations !== Infinity).map((x) => x.effect.getTiming().delay || 0); if (d.length) window.__sample.delays[i] = Math.max(...d); } });
    if (t - t0 < ms) requestAnimationFrame(tick); else window.__sample.done = true;
  };
  requestAnimationFrame(tick);
  return late ? -1 : els.length;
}
function samplerCollect() {
  const s = window.__sample;
  return s ? { frames: s.frames, anims: [...s.anims.values()], n: Math.max(s.n, ...s.frames.map((f) => f.v.length)), t0: s.t0, done: s.done, delays: s.delays, inView: s.inView, inputs: window.__inputs.map((e) => ({ ...e, t: e.t - s.t0 })) } : null;
}

// ---------------------------------------------------------------- sample analysis (Node side)
const CH = { tx: 40, ty: 40, sx: 0.08, sy: 0.08, rot: 20, op: 1, ow: 60, oh: 60, ol: 40, ot: 40 }; // normalising scales per channel
const MOVE_CH = ['tx', 'ty', 'sx', 'sy', 'rot', 'ol', 'ot'];
const SIZE_CH = ['ow', 'oh'];
const STR_CH = ['color', 'bg', 'shadow', 'filter', 'clip', 'outline', 'text', 'vis', 'cvar'];
const EPS = { tx: 0.15, ty: 0.15, sx: 0.001, sy: 0.001, rot: 0.1, op: 0.004, ow: 0.5, oh: 0.5, ol: 0.5, ot: 0.5, num: 1e-9, vis: 0.5 };
const numOf = (t) => { const d = String(t ?? '').replace(/[^\d.-]/g, ''); return /\d/.test(d) ? parseFloat(d) : null; };

/** For one target over the sampled frames: which channels changed, over how many frames, from when to when.
 *  The frame just before tFrom is included, so the first change after the trigger counts. */
function channelStats(frames, idx, tFrom) {
  const all = frames.filter((f) => f.v[idx]);
  const k = Math.max(0, all.findIndex((f) => f.t >= tFrom - 1) - 1);
  const F = all.findIndex((f) => f.t >= tFrom - 1) < 0 ? [] : all.slice(k);
  if (F.length < 2) return null;
  const out = {};
  for (const ch of [...Object.keys(CH), ...STR_CH, 'num']) {
    const vals = F.map((f) => (ch === 'num' ? numOf(f.v[idx].text) : f.v[idx][ch]));
    if (ch === 'num' && vals.some((x) => x == null)) continue;
    let changes = 0, first = null, last = null, firstI = null;
    for (let i = 1; i < vals.length; i++) {
      const diff = typeof vals[i] === 'number' ? Math.abs(vals[i] - vals[i - 1]) > EPS[ch] : vals[i] !== vals[i - 1];
      if (diff) { changes++; if (first == null) { first = F[i].t; firstI = i; } last = F[i].t; }
    }
    if (!changes) continue;
    out[ch] = { changes, first, last, from: vals[0], to: vals.at(-1), range: typeof vals[0] === 'number' ? Math.max(...vals) - Math.min(...vals) : null, firstFrameBefore: F[firstI - 1].t };
  }
  // a changing number reflows its own box: width/height changes that come with text changes are not layout animation
  if (out.text) { delete out.ow; delete out.oh; delete out.ol; }
  return out;
}
/** animates: changed over ≥ 3 frames; instant: changed in 1–2 steps; none. */
function classify(stats) {
  if (!stats || !Object.keys(stats).length) return { state: 'none', moves: false, fades: false, counts: false, layout: false, jumps: [], shifted: [] };
  const anim = (ch) => stats[ch] && stats[ch].changes >= 3;
  const moves = MOVE_CH.some(anim) || SIZE_CH.some(anim);
  const fades = anim('op') || ['color', 'bg', 'shadow', 'filter', 'outline'].some(anim) || anim('clip');
  const counts = anim('text') || anim('cvar'); // a number counting, or a custom property driving something the sampler cannot name
  const any = Object.values(stats).some((s) => s.changes >= 3);
  const jumped = stats.vis ? [] : [...SIZE_CH, 'ol', 'ot'].filter((ch) => stats[ch] && stats[ch].changes < 3); // display:none ↔ shown moves every box
  // its own size jumped (with or without position): a layout property changed without transitioning; position alone: something around it re-laid out
  const jumps = jumped.some((ch) => SIZE_CH.includes(ch)) ? jumped : [];
  const shifted = jumps.length ? [] : jumped;
  return { state: any ? 'animates' : 'instant', moves, fades, counts, layout: SIZE_CH.some(anim) || (anim('ol') || anim('ot')), jumps, shifted };
}
function dominant(stats) {
  let best = null, score = 0;
  for (const [ch, s] of Object.entries(stats || {})) if (CH[ch] && s.range != null && s.changes >= 3) { const k = s.range / CH[ch]; if (k > score) { score = k; best = ch; } }
  if (!best && stats?.num && stats.num.changes >= 3) best = 'num'; // a counting number is the motion when nothing else moves
  return best;
}
/** Fit easing and duration together to one channel's samples: for each candidate easing, the duration (and a
 *  sub-frame start offset) that minimises the RMS between the eased progress and the sampled progress, including
 *  the samples after the end (which must sit at 1). A decelerating tail changes less than a pixel per frame, so the
 *  "last visible change" undercounts a sampled duration; the fit does not. */
function fitEasing(frames, idx, ch, candidates) {
  const F = frames.filter((f) => f.v[idx] && (ch === 'num' ? numOf(f.v[idx].text) != null : f.v[idx][ch] != null));
  const vals = F.map((f) => (ch === 'num' ? numOf(f.v[idx].text) : f.v[idx][ch]));
  const i0 = vals.findIndex((v, i) => i > 0 && Math.abs(v - vals[i - 1]) > EPS[ch]) - 1;
  if (i0 < 0) return null;
  const v0 = vals[i0], v1 = vals.at(-1);
  let i1 = vals.length - 1; while (i1 > i0 && Math.abs(vals[i1 - 1] - v1) <= EPS[ch]) i1--;
  if (i1 - i0 < 4 || Math.abs(v1 - v0) < EPS[ch] * 4) return null;
  const pts = []; for (let i = i0; i < vals.length; i++) pts.push([F[i].t, (vals[i] - v0) / (v1 - v0)]);
  const frame = F[i0 + 1].t - F[i0].t, span = F[i1].t - F[i0].t;
  const res = {}, dur = {};
  for (const [name, css] of Object.entries(candidates)) {
    const f = easingFn(css); if (!f) continue;
    let best = [Infinity, null];
    for (let off = 0; off <= 1.001; off += 0.25) for (let D = Math.max(16, span * 0.6); D <= span * 4; D *= 1.03) {
      const tA = F[i0].t + off * frame;
      let e = 0; for (const [t, p] of pts) { const u = Math.min(1, Math.max(0, (t - tA) / D)); e += (f(u) - p) ** 2; }
      if (e < best[0]) best = [e, D];
    }
    res[name] = +Math.sqrt(best[0] / pts.length).toFixed(3); dur[name] = Math.round(best[1]);
  }
  const top = Object.entries(res).sort((x, y) => x[1] - y[1])[0];
  return { best: top?.[0], rms: res, duration: dur, samples: pts.length };
}
/** Continuity at the moment of a second input (as in the lab's interruption test). */
function continuity(frames, idx, ch, tInt) {
  const F = frames.filter((f) => f.v[idx]); const v = F.map((f) => f.v[idx][ch]);
  const i0 = F.findLastIndex((f) => f.t < tInt); if (i0 < 1 || i0 >= F.length - 3) return null;
  // speeds (change per 16.7 ms), so a frame the busy machine dropped right after the input does not read as a jump
  const steps = v.map((x, i) => (i ? (Math.abs(x - v[i - 1]) * 16.7) / Math.max(8, F[i].t - F[i - 1].t) : 0));
  const range = Math.max(...v) - Math.min(...v) || 1;
  if (CH[ch] && range / CH[ch] < 0.25) return { continuous: true, tooSmall: true, discPct: null, maxPreStepPct: null }; // a few pixels of integer steps: nothing to judge
  const maxPre = Math.max(...steps.slice(1, i0 + 1)); const disc = Math.max(steps[i0 + 1], steps[i0 + 2]);
  return { continuous: disc <= 1.5 * maxPre + 0.03 * range, discPct: +((disc / range) * 100).toFixed(1), maxPreStepPct: +((maxPre / range) * 100).toFixed(1) };
}

// ---------------------------------------------------------------- run
await mkdir(outDir, { recursive: true });
const spec = await readSpec(a.spec).catch((e) => { console.error(e.message); process.exit(2); });
const { browser } = await launch({ chrome: a.chrome });

async function newPage(reducedMotion = 'no-preference') {
  const ctx = await browser.newContext({ ...CTX, reducedMotion });
  await ctx.addInitScript(pageInit);
  await ctx.addInitScript(pageHelpers);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return { ctx, page, errors };
}
const load = async (page) => { await open(page, url, { quietMs: 500, maxWaitMs: 8000 }); await page.evaluate(pageHelpers); };

const report = { url, date: new Date().toISOString(), device: phone ? 'phone' : 'desktop', browser: browser.version(), tokens: null, audit: null, spec: [], flags: [] };
const flags = report.flags;
const flag = (kind, sel, detail, level = 'warn') => flags.push({ kind, sel, detail, level });

// Tokens: spec → page custom properties → motion.md defaults
const durTokens = {}, easeTokens = {};
let tokenSource = 'motion.md defaults';
{
  const { ctx, page } = await newPage();
  await load(page);
  const inv = await page.evaluate(inventory, MAX);
  for (const [n, v] of Object.entries(inv.tokenProps)) {
    const k = tokenKey(n);
    if (/^--(motion-)?(dur|duration|time)-/.test(n)) { const m = String(v).match(/^(-?[\d.]+)(ms|s)$/); if (m) durTokens[k] = m[2] === 's' ? +m[1] * 1000 : +m[1]; }
    else if (easingFn(v)) easeTokens[k] = v;
  }
  if (Object.keys(durTokens).length) tokenSource = 'page custom properties';
  if (spec?.tokens?.duration) { Object.assign(durTokens, Object.fromEntries(Object.entries(spec.tokens.duration).map(([k, v]) => [tokenKey(k), Number(v)]))); tokenSource = 'spec'; }
  if (spec?.tokens?.easing) Object.assign(easeTokens, Object.fromEntries(Object.entries(spec.tokens.easing).map(([k, v]) => [tokenKey(k), v])));
  if (!Object.keys(durTokens).length) Object.assign(durTokens, DEFAULT_TOKENS.duration);
  for (const [k, v] of Object.entries(DEFAULT_TOKENS.easing)) easeTokens[k] ??= v;
  report.tokens = { source: tokenSource, duration: durTokens, easing: easeTokens };
  report.__inv = inv;
  await ctx.close();
}
const tokenValues = Object.values(durTokens).filter((v) => v > 0);
const maxToken = Math.max(...tokenValues);
const onToken = (d) => d === 0 || tokenValues.some((t) => Math.abs(d - t) <= Math.max(10, t * 0.1));

// ---------------------------------------------------------------- audit (no spec needed)
if (!a['no-audit']) {
  const inv = report.__inv;
  const { ctx: rctx, page: rpage } = await newPage('reduce');
  await load(rpage);
  const invR = await rpage.evaluate(inventory, MAX);
  await rpage.waitForTimeout(1500);
  const lmR = await rpage.evaluate(loadMotion);
  await rctx.close();

  const { ctx, page } = await newPage();
  await load(page);
  await page.waitForTimeout(1500);
  const lm = await page.evaluate(loadMotion);
  // nothing runs at rest: requestAnimationFrame callbacks per second over 2 s with no input
  const q0 = await page.evaluate(() => window.__rafCount); await page.waitForTimeout(2000); const q1 = await page.evaluate(() => window.__rafCount);
  const rafAtRest = (q1 - q0) / 2;
  if (rafAtRest > 5) flag('raf-at-rest', 'page', `requestAnimationFrame fires ${Math.round(rafAtRest)}×/s with no input — a JS loop runs at rest (seen in the lab: GSAP ScrollTrigger once registered, anime.js onScroll, React Spring useScroll, Motion scroll() with x/y/scale values, Rive and dotLottie until stopRendering()/freeze(), hand-written loops); stop it when nothing moves`, 'warn');
  const group = (arr) => { const m = new Map(); for (const x of arr) { const k = x.sel; m.set(k, (m.get(k) || 0) + 1); } return m; };
  // flags from the inventory
  const seen = new Set();
  const once = (kind, sel, detail, level) => { const k = `${kind}|${sel}`; if (seen.has(k)) return; seen.add(k); flag(kind, sel, detail, level); };
  const { LAYOUT_RE, MOVE_RE } = { LAYOUT_RE: /^(width|height|min-width|min-height|max-width|max-height|top|left|right|bottom|inset(-.+)?|margin(-.+)?|padding(-.+)?|border(-top|-right|-bottom|-left)?-width|font-size|line-height|letter-spacing|flex-basis|gap|row-gap|column-gap)$/, MOVE_RE: /^(transform|translate|scale|rotate|top|left|right|bottom|margin.*)$/ };
  for (const it of inv.items) {
    for (const t of it.transitions) {
      if (t.p === 'all') once('transition-all', it.sel, `transition: all ${t.d}ms — name the properties`, 'warn');
      if (LAYOUT_RE.test(t.p)) once('layout-transition', it.sel, `transition on ${t.p} (${t.d}ms) — re-lays-out every frame; animate transform/opacity (grid-template-rows 0fr→1fr for accordions)`, 'warn');
      if (!onToken(t.d)) once('off-token', it.sel, `transition ${t.p} ${t.d}ms is not a token (${tokenValues.join('/')})`, 'warn');
      if (t.d > maxToken) once('long', it.sel, `transition ${t.p} ${t.d}ms is longer than the largest token (${maxToken}ms)`, 'warn');
      if (/^linear$/.test(t.e) && MOVE_RE.test(t.p)) once('linear-movement', it.sel, `${t.p} moves with linear easing`, 'info');
    }
    for (const x of it.animations) {
      const kf = inv.keyframes[x.n];
      const scrollLinked = x.tl && x.tl !== 'auto';
      if (kf?.layout.length) once('layout-keyframes', it.sel, `@keyframes ${x.n} animates ${kf.layout.join(', ')}`, 'warn');
      if (kf?.scale0) once('scale-zero', it.sel, `@keyframes ${x.n} enters from scale(0) — start at 0.9–0.97 with opacity 0`, 'warn');
      if (x.it === 'infinite') once('infinite', it.sel, `@keyframes ${x.n} loops forever (${x.d}ms) — pause control or stop within 5 s (WCAG 2.2.2), off under reduce`, 'info');
      else if (!scrollLinked) {
        if (!onToken(x.d)) once('off-token', it.sel, `animation ${x.n} ${x.d}ms is not a token (${tokenValues.join('/')})`, 'warn');
        if (x.d > maxToken) once('long', it.sel, `animation ${x.n} ${x.d}ms is longer than the largest token (${maxToken}ms)`, 'warn');
      }
    }
  }
  for (const [name, kf] of Object.entries(inv.keyframes)) {
    // keyframes no element uses at load (a toast, a reveal that runs later) still ship
    if (kf.layout.length && !flags.some((f) => f.kind === 'layout-keyframes' && f.detail.includes(`@keyframes ${name} `))) once('layout-keyframes', `@keyframes ${name}`, `@keyframes ${name} animates ${kf.layout.join(', ')} (not running at load)`, 'warn');
    if (kf.scale0 && !flags.some((f) => f.kind === 'scale-zero' && f.detail.includes(`@keyframes ${name} `))) once('scale-zero', `@keyframes ${name}`, `@keyframes ${name} enters from scale(0) — start at 0.9–0.97 with opacity 0 (not running at load)`, 'warn');
  }
  for (const an of lm.anims) {
    const lay = an.props.filter((p) => LAYOUT_RE.test(p));
    if (lay.length && an.kind === 'waapi') once('layout-keyframes', an.target, `a running animation moves ${lay.join(', ')}`, 'warn');
  }
  // reduced-motion handling
  const jsDriven = lm.churn.length;
  if (!inv.reduceBlocks && !lm.mqReduce) flag('no-reduced-motion', 'page', 'no prefers-reduced-motion rule in readable CSS and no matchMedia query from JavaScript', 'warn');
  if (inv.killAll) flag('reduce-kills-all', 'page', `under reduce a universal rule removes every animation and transition, press and focus feedback included: ${inv.killAll}`, 'warn');
  const movingUnderReduce = lmR.anims.filter((x) => x.iterations === Infinity || x.props.some((p) => MOVE_RE.test(p)));
  for (const x of movingUnderReduce) once('moves-under-reduce', x.target + (x.pseudo || ''), `${x.kind} ${x.name || ''} (${x.props.join(', ')}, ${x.duration}ms${x.iterations === Infinity ? ', infinite' : ''}) still runs at load under reduce`, 'warn');
  for (const c of lmR.churn) once('moves-under-reduce', c.sel, `inline style changed ${c.n}× in the first 4 s under reduce (JavaScript-driven motion)`, 'warn');

  // hover / focus / press feedback on controls
  const hoverRes = [], focusRes = [], pressRes = [];
  const candidates = await page.evaluate((max) => {
    const { describe, fingerprint, visible } = window.__mh;
    const sel = 'a[href], button, [role=button], [role=tab], [role=switch], summary, input[type=submit], input[type=button], input[type=checkbox], input[type=radio], select';
    const els = [...document.querySelectorAll(sel)].filter((e) => visible(e) && !e.disabled && getComputedStyle(e).pointerEvents !== 'none').slice(0, max);
    window.__cands = els;
    window.__base = els.map((e) => { window.__mh.finishAll(e); return fingerprint(e); });
    return els.map((e, i) => { const cs = getComputedStyle(e); const inline = e.tagName === 'A' && cs.display === 'inline' && !e.closest('nav, header, footer, [role=navigation], [role=tablist]');
      return { i, sel: describe(e), control: !inline, button: e.matches('button, [role=button], input[type=submit], input[type=button]') || (e.tagName === 'A' && /\b(btn|button|cta)\b/i.test(e.className)) }; });
  }, MAX);
  const centre = (i) => page.evaluate((i) => { const e = window.__cands[i]; e.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = e.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2; const top = document.elementFromPoint(x, y); const vv = window.visualViewport || { scale: 1, offsetLeft: 0, offsetTop: 0 };
    return { x: (x - vv.offsetLeft) * vv.scale, y: (y - vv.offsetTop) * vv.scale, hit: !!top && (top === e || e.contains(top)) }; }, i);
  if (!phone) {
    for (const c of candidates) {
      const p = await centre(c.i); if (!p.hit) continue;
      await page.mouse.move(p.x, p.y); await page.waitForTimeout(60);
      const changed = await page.evaluate((i) => { const e = window.__cands[i]; window.__mh.finishAll(e); return window.__mh.fingerprint(e) !== window.__base[i]; }, c.i);
      hoverRes.push({ ...c, changed });
      if (!changed && c.control) once('hover-none', c.sel, 'hover changes nothing visible (colour, background, border, shadow, underline, opacity, transform)', 'warn');
      await page.mouse.move(1, 1); await page.waitForTimeout(30);
    }
  }
  // focus: a keyboard-modality focus on each control, so :focus-visible applies
  for (const c of candidates) {
    await page.keyboard.press('Shift');
    const changed = await page.evaluate((i) => { const e = window.__cands[i]; e.focus({ preventScroll: false }); if (document.activeElement !== e) return null; window.__mh.finishAll(e);
      const f = window.__mh.fingerprint(e); e.blur(); return f !== window.__base[i]; }, c.i);
    if (changed == null) continue;
    focusRes.push({ ...c, changed });
    if (!changed) once('focus-none', c.sel, 'keyboard focus changes nothing visible (audit.mjs and a11y.mjs check focus rings in depth)', 'warn');
  }
  // press: reload (hover and focus left state behind), hold the pointer down on each button, compare with its hover state
  await load(page);
  await page.evaluate((max) => { const { visible } = window.__mh; const sel = 'a[href], button, [role=button], [role=tab], [role=switch], summary, input[type=submit], input[type=button], input[type=checkbox], input[type=radio], select';
    window.__cands = [...document.querySelectorAll(sel)].filter((e) => visible(e) && !e.disabled && getComputedStyle(e).pointerEvents !== 'none').slice(0, max); }, MAX);
  if (!phone) {
    for (const c of candidates.filter((x) => x.button)) {
      const p = await centre(c.i).catch(() => null); if (!p?.hit) continue;
      await page.mouse.move(p.x, p.y); await page.waitForTimeout(60);
      const hov = await page.evaluate((i) => { const e = window.__cands[i]; window.__mh.finishAll(e); return window.__mh.fingerprint(e); }, c.i);
      await page.mouse.down(); await page.waitForTimeout(60);
      const act = await page.evaluate((i) => { const e = window.__cands[i]; window.__mh.finishAll(e); return window.__mh.fingerprint(e); }, c.i);
      await page.mouse.move(1, 1); await page.mouse.up(); await page.keyboard.press('Escape'); await page.waitForTimeout(40);
      pressRes.push({ ...c, changed: hov !== act });
      if (hov === act) once('no-active', c.sel, 'no :active (press) feedback — scale(0.97) or a darker fill for 100 ms tells the user the press registered', 'warn');
    }
  }
  await ctx.close();
  report.audit = {
    tokens: report.tokens,
    inventory: [...group(inv.items)].map(([sel, n]) => { const it = inv.items.find((x) => x.sel === sel); return { sel, n, transitions: it.transitions.map((t) => `${t.p} ${t.d}ms ${t.e}${t.delay ? ` +${t.delay}ms` : ''}`), animations: it.animations.map((x) => `${x.n} ${x.d}ms ${x.e}${x.it !== '1' ? ` ×${x.it}` : ''}${x.tl !== 'auto' ? ` timeline:${x.tl}` : ''}`) }; }),
    inventoryReduce: { elements: invR.items.length, transitions: invR.items.reduce((s, x) => s + x.transitions.length, 0), animations: invR.items.reduce((s, x) => s + x.animations.length, 0) },
    inventoryNormal: { elements: inv.items.length, transitions: inv.items.reduce((s, x) => s + x.transitions.length, 0), animations: inv.items.reduce((s, x) => s + x.animations.length, 0) },
    reduceBlocks: inv.reduceBlocks, killAll: inv.killAll, blockedSheets: inv.blockedSheets, mqReduce: lm.mqReduce,
    loadNormal: { anims: lm.anims.length, churn: lm.churn }, loadReduce: { anims: lmR.anims.length, churn: lmR.churn, moving: movingUnderReduce.map((x) => `${x.target}${x.pseudo} ${x.name}`) },
    hover: hoverRes, focus: focusRes, press: pressRes, jsDriven, rafAtRest,
  };
}
delete report.__inv;

// ---------------------------------------------------------------- spec entries
function resolveDuration(d) {
  if (d == null) return null;
  if (typeof d === 'number') return { min: d * 0.85 - 10, max: d * 1.15 + 10, label: `${d}ms` };
  const s = String(d).trim();
  let m = s.match(/^(\d+)\s*(?:-|–|to)\s*(\d+)\s*(ms)?$/); if (m) return { min: +m[1], max: +m[2], label: `${m[1]}–${m[2]}ms` };
  m = s.match(/^(\d+)\s*ms$/) || s.match(/^(\d+)$/); if (m) return resolveDuration(+m[1]);
  const t = durTokens[tokenKey(s)]; if (t != null) return { min: t * 0.85 - 10, max: t * 1.15 + 10, label: `${tokenKey(s)} (${t}ms)`, token: t };
  return { unknown: s };
}
const resolveEasing = (e) => (e == null ? null : easeTokens[tokenKey(e)] ?? (easingFn(e) ? e : null));

async function trigger(page, entry, ms) {
  const kind = String(entry.trigger || 'click');
  const on = entry.on || entry.target;
  for (const st of entry.setup || []) {
    if (st.click) await page.click(st.click, { timeout: 3000 }).catch(() => {});
    if (st.hover) await page.hover(st.hover, { timeout: 3000 }).catch(() => {});
    if (st.scroll) await page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: 'center', behavior: 'instant' }), st.scroll);
    if (st.wait) await page.waitForTimeout(st.wait);
  }
  if (kind !== 'scroll' && kind !== 'load') await page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: 'center', behavior: 'instant' }), on);
  if (kind === 'hover' || kind === 'press') await page.mouse.move(1, 1);
  if (kind === 'press') {
    await page.hover(on, { timeout: 3000 }).catch(() => {});
    await page.waitForFunction((s) => { const e = document.querySelector(s); return !e || !e.getAnimations({ subtree: true }).some((x) => x.playState === 'running' && x.effect?.getComputedTiming?.().iterations !== Infinity); }, entry.target, { timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(250);
  // input coordinates live in the visual viewport: on a phone page that overflows (zoomed out) they differ from CSS px
  const box = async () => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); const vv = window.visualViewport || { scale: 1, offsetLeft: 0, offsetTop: 0 };
    return { x: (r.left + r.width / 2 - vv.offsetLeft) * vv.scale, y: (r.top + r.height / 2 - vv.offsetTop) * vv.scale }; }, on);
  const n = await page.evaluate(samplerStart, { sel: entry.target, on, ms });
  if (!n) return { error: `target ${entry.target} not found` };
  if (n < 0 && entry.trigger === 'hover') return { error: `target ${entry.target} not found` };
  await page.waitForTimeout(150); // pre-roll: channels already changing now (a loop) are not the trigger's doing
  const p = await box();
  if (!p && kind !== 'load') return { error: `${on} not found` };
  const t0 = Date.now();
  if (kind === 'hover') await page.mouse.move(p.x, p.y, { steps: 2 });
  else if (kind === 'press') await page.mouse.down();
  else if (kind === 'click') await page.mouse.click(p.x, p.y);
  else if (kind === 'focus') { await page.keyboard.press('Shift'); await page.evaluate((s) => document.querySelector(s)?.focus(), on); }
  else if (kind.startsWith('key:')) { await page.evaluate((s) => document.querySelector(s)?.focus(), on); await page.keyboard.press(kind.slice(4)); }
  else if (kind === 'scroll') await page.evaluate((s) => new Promise((res) => { const e = document.querySelector(s); const y1 = Math.max(0, e.getBoundingClientRect().top + scrollY - innerHeight * 0.45); const y0 = scrollY; const t0 = performance.now();
    const step = () => { const k = Math.min(1, (performance.now() - t0) / 600); scrollTo(0, y0 + (y1 - y0) * k); if (k < 1) requestAnimationFrame(step); else res(); }; requestAnimationFrame(step); }), on);
  if (entry.interrupt) {
    await page.waitForTimeout(Math.max(0, entry.interrupt - (Date.now() - t0)));
    const q = await box();
    if (kind === 'click' && q) await page.mouse.click(q.x, q.y);
    else if (kind === 'hover') await page.mouse.move(1, 1);
    else if (kind === 'press') await page.mouse.up();
  }
  await page.waitForFunction(() => window.__sample?.done, null, { timeout: ms + 8000 }).catch(() => {});
  if (kind === 'press' && !entry.interrupt) { await page.mouse.move(1, 1); await page.mouse.up(); }
  return page.evaluate(samplerCollect);
}

async function runEntry(entry, mode, film) {
  const { ctx, page, errors } = await newPage(mode);
  const dur = resolveDuration(entry.duration);
  const ms = Math.max(1500, (dur?.max || 400) * 3.5 + (entry.stagger || 0) * 12 + (entry.interrupt || 0) + (entry.trigger === 'scroll' ? 600 : 0)) + 150;
  let cast = null;
  let data;
  try {
    if (entry.trigger === 'load') {
      // install the sampler before any page script, so the entrance is seen from the first frame
      await ctx.addInitScript(({ sel, on, ms }) => {
        const go = () => { window.__mh || window.__mhInit?.(); if (!window.__mh) return setTimeout(go, 5); window.__samplerStart({ sel, on, ms }); };
        document.addEventListener('DOMContentLoaded', go);
      }, { sel: entry.target, on: entry.on, ms });
      await ctx.addInitScript(`window.__samplerStart = ${samplerStart.toString()};`);
      if (film) cast = await screencast(page);
      await page.goto(url, { waitUntil: 'load' }).catch(() => {});
      await page.waitForFunction(() => window.__sample?.done, null, { timeout: ms + 10000 }).catch(() => {});
      data = await page.evaluate(samplerCollect);
    } else {
      await load(page);
      if (film) cast = await screencast(page);
      data = await trigger(page, entry, ms);
    }
    if (data && !data.error && cast) {
      const rect = await page.evaluate((s) => { const els = [...document.querySelectorAll(s)].slice(0, 12); if (!els.length) return null;
        const rs = els.map((e) => e.getBoundingClientRect()).filter((r) => r.width && r.height); if (!rs.length) return null;
        const x0 = Math.min(...rs.map((r) => r.left)), y0 = Math.min(...rs.map((r) => r.top)), x1 = Math.max(...rs.map((r) => r.right)), y1 = Math.max(...rs.map((r) => r.bottom));
        return { x: x0, y: y0, w: x1 - x0, h: y1 - y0, vw: innerWidth, vh: innerHeight }; }, entry.target);
      // Put everything on Node's clock: the page's clock via a round trip, the paint timestamps via the fastest
      // deliveries (renderer, browser and Node clocks can disagree by hundreds of ms)
      const n0 = Date.now(); const pg = await page.evaluate(() => [performance.timeOrigin + performance.now(), performance.timeOrigin + (window.__sample?.t0 || 0)]); const n1 = Date.now();
      const frames = await cast.stop();
      const lag = frames.map((fr) => fr.recv - fr.meta).sort((x, y) => x - y);
      const metaToNode = lag.length ? lag[Math.floor(lag.length * 0.1)] : 0;
      for (const fr of frames) fr.wall = fr.meta + metaToNode;
      data.film = { frames, rect: entry.trigger === 'scroll' ? { x: 0, y: 0, w: rect?.vw ?? CTX.viewport.width, h: rect?.vh ?? CTX.viewport.height, vw: rect?.vw ?? CTX.viewport.width, vh: rect?.vh ?? CTX.viewport.height } : rect,
        origin: pg[1] + ((n0 + n1) / 2 - pg[0]) };
    } else if (cast) await cast.stop();
  } catch (e) { data = { error: e.message.split('\n')[0] }; }
  await ctx.close();
  if (data) data.errors = errors.slice(0, 3);
  return data;
}

async function screencast(page) {
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  // meta: the browser's paint timestamp; recv: when Node got the frame (the two clocks are related after the run)
  cdp.on('Page.screencastFrame', async (f) => { frames.push({ meta: f.metadata.timestamp * 1000, recv: Date.now(), data: f.data, w: f.metadata.deviceWidth, h: f.metadata.deviceHeight });
    try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch { /* closed */ } });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 85, everyNthFrame: 1 });
  return { stop: async () => { try { await cdp.send('Page.stopScreencast'); } catch { /* ignore */ } await cdp.detach().catch(() => {}); return frames; } };
}

function triggerTime(data, entry) {
  if (entry.trigger === 'load') return 0;
  const want = { click: 'click', press: 'pointerdown', hover: 'mouseover', focus: 'focusin', scroll: 'scroll' }[entry.trigger] || 'keydown';
  const ev = data.inputs.find((e) => e.type === want);
  return ev ? ev.t : 0;
}

function analyse(entry, data) {
  if (!data || data.error) return { error: data?.error || 'no data' };
  const tT = triggerTime(data, entry);
  const perTarget = []; const ambient = new Set();
  for (let i = 0; i < data.n; i++) {
    const pre = entry.trigger === 'load' ? null : channelStats(data.frames.filter((f) => f.t < tT - 1), i, 0);
    const st = channelStats(data.frames, i, tT);
    for (const [ch, x] of Object.entries(pre || {})) if (x.changes >= 2 && st?.[ch]) { delete st[ch]; ambient.add(ch); } // a loop, not the trigger
    perTarget.push({ stats: st, cls: classify(st) });
  }
  const vtFrames = data.frames.filter((f) => f.t >= tT && f.vt);
  const vt = vtFrames.length ? { frames: vtFrames.length, moves: new Set(vtFrames.map((f) => f.vt.move)).size > 3, fades: new Set(vtFrames.map((f) => f.vt.fade)).size > 3, span: Math.round(vtFrames.at(-1).t - vtFrames[0].t) } : null;
  const anims = data.anims.filter((x) => x.firstSeen >= tT - 20 || entry.trigger === 'load');
  const cls = perTarget.map((p) => p.cls);
  // A CSS/WAAPI animation of ≥ 50 ms that ran after the trigger counts even if a busy machine sampled it in two frames.
  const ran = anims.filter((x) => x.timeline === 'document' && x.iterations !== Infinity && x.duration >= 50 && !x.pseudo.startsWith('::view-transition') && x.props.some((p) => !['display', 'overlay', 'visibility', 'content-visibility'].includes(p)));
  const ranMoves = ran.some((x) => x.props.some((p) => /^(transform|translate|scale|rotate|top|left|right|bottom|width|height|margin.*|inset.*)$/.test(p)));
  const sampledChanged = cls.some((c) => c.state !== 'none');
  const state = cls.some((c) => c.state === 'animates') || (vt && (vt.moves || vt.fades)) || (ran.length && sampledChanged) ? 'animates' : cls.some((c) => c.state === 'instant') ? 'instant' : 'none';
  const moves = cls.some((c) => c.moves) || !!vt?.moves || (ran.length > 0 && sampledChanged && ranMoves && !cls.some((c) => c.state === 'animates'));
  const fades = cls.some((c) => c.fades) || !!vt?.fades || (ran.length > 0 && sampledChanged && !ranMoves && !cls.some((c) => c.state === 'animates'));
  const layout = cls.some((c) => c.layout);
  const counts = cls.some((c) => c.counts);
  // durations: declared (Animation objects, exact) and observed (sampled span of the dominant channel per target)
  const docAnims = anims.filter((x) => x.timeline === 'document' && x.iterations !== Infinity && x.duration > 0);
  const declared = docAnims.length ? Math.max(...docAnims.map((x) => x.duration)) : null;
  const spans = perTarget.map((p) => { const ch = dominant(p.stats); const s = ch && p.stats[ch]; return s ? Math.round(s.last - s.firstFrameBefore) : null; }).filter((x) => x != null);
  const observed = spans.length ? Math.max(...spans) : vt ? Math.round(vt.span) : null; // first to last visible change: undercounts decelerating tails
  const starts = perTarget.map((p) => { const ch = dominant(p.stats); return ch ? p.stats[ch].firstFrameBefore : null; });
  const gaps = starts.filter((x) => x != null).map((x, i, arr) => (i ? x - arr[i - 1] : null)).filter((x) => x != null);
  // stagger: the declared per-element delays when the animations are CSS/WAAPI, else the sampled start times
  const dl = (data.delays || []).filter((x) => x != null);
  const dGaps = dl.length > 1 ? [...dl].sort((x, y) => x - y).map((x, i, arr) => (i ? x - arr[i - 1] : null)).filter((x) => x != null) : [];
  const stagger = dGaps.length && dGaps.some((x) => x > 0) ? Math.round(dGaps.reduce((s, x) => s + x, 0) / dGaps.length) : gaps.length ? Math.round(gaps.reduce((s, x) => s + x, 0) / gaps.length) : null;
  const staggerSource = dGaps.length && dGaps.some((x) => x > 0) ? 'declared' : gaps.length ? 'sampled' : null;
  const changedProps = new Set();
  for (const p of perTarget) for (const [ch, s] of Object.entries(p.stats || {})) if ((s.changes >= 3 || (s.changes && ch === 'text')) && !['vis', 'num'].includes(ch)) changedProps.add({ tx: 'transform', ty: 'transform', sx: 'transform', sy: 'transform', rot: 'transform', op: 'opacity', ow: 'width', oh: 'height', ol: 'left/margin', ot: 'top/margin', bg: 'background-color', color: 'color', shadow: 'box-shadow', filter: 'filter', clip: 'clip-path', outline: 'outline', text: 'text' }[ch]);
  for (const x of anims) if (!x.pseudo.startsWith('::view-transition')) for (const pr of x.props) changedProps.add(pr); // a view-transition group always animates width/height
  const ch0 = dominant(perTarget[0]?.stats);
  const fin = data.frames.at(-1)?.v?.[0] || null;
  const scrollLinked = anims.some((x) => x.timeline !== 'document');
  const inViewAtStart = entry.trigger === 'scroll' && (data.inView || []).some(Boolean);
  const jumps = [...new Set(perTarget.flatMap((p) => (p.cls.state === 'animates' || state === 'animates' ? p.cls.jumps : [])))];
  const shifted = [...new Set(perTarget.flatMap((p) => p.cls.shifted))];
  return { tT: Math.round(tT), jumps, shifted, state, moves, fades, counts, layout, vt, declared, observed, stagger, staggerSource, scrollLinked, inViewAtStart, props: [...changedProps], anims: anims.slice(0, 8), dominant: ch0,
    final: fin && { op: fin.op, vis: fin.vis, tx: fin.tx, ty: fin.ty, sx: fin.sx, text: fin.text }, targets: data.n, perTarget: perTarget.map((p) => p.cls.state),
    interrupt: entry.interrupt ? interruptInfo(entry, data, ch0, state) : null, frames: data.frames.length, ambient: [...ambient] };
}
function interruptInfo(entry, data, ch, state) {
  if (state !== 'animates') return { result: 'n/a (nothing animates)' };
  const want = entry.trigger === 'press' ? 'pointerdown' : entry.trigger === 'hover' ? 'mouseover' : 'click';
  const evs = data.inputs.filter((e) => e.type === want || (entry.trigger === 'press' && e.type === 'click'));
  if (entry.trigger === 'click') {
    const clicks = data.inputs.filter((e) => e.type === 'click');
    if (clicks.length < 2) return { result: 'second input not delivered' };
    if (!clicks[1].onTarget) return { result: `input swallowed (the second click landed on <${clicks[1].tag.toLowerCase()}>; a view transition hit-tests the root for its whole duration)` };
    if (!ch) return { result: 'nothing to compare' };
    const c = continuity(data.frames, 0, ch, clicks[1].t);
    return c ? { result: c.tooSmall ? 'n/a (it had barely moved when interrupted)' : c.continuous ? 'continues from the current value' : 'jumps', ...c } : { result: 'outside samples' };
  }
  return { result: evs.length ? 'n/a for this trigger' : 'no input' };
}

function judge(entry, n, r) {
  const problems = [];
  if (n.error) return { pass: false, problems: [`normal run: ${n.error}`] };
  if (n.state === 'none') problems.push(`static: nothing changed after the trigger${n.inViewAtStart ? ' (the target was already in view before the scroll: it may have played at load)' : ''}`);
  else if (n.state === 'instant') problems.push('static: changed in one frame (no animation)');
  const dur = resolveDuration(entry.duration);
  // declared durations (CSS/WAAPI) are exact; for JavaScript-driven motion, the duration fitted with the best-fitting easing
  // Sampled (JavaScript-driven) motion: the duration lies between the last visible change (a decelerating tail
  // changes less than a pixel per frame, so this undercounts) and the duration fitted with the best easing (for a
  // very flat tail, overcounts). Flag only when the whole range misses the spec. An interrupted run holds two animations.
  const fitted = n.fit ? n.fit.duration[n.fit.best] : null;
  const est = n.scrollLinked || n.declared != null || entry.interrupt ? null : [n.observed ?? fitted, fitted ?? n.observed].filter((x) => x != null).sort((x, y) => x - y);
  if (dur?.unknown) problems.push(`duration token "${dur.unknown}" not found`);
  else if (dur && n.state === 'animates' && !n.scrollLinked) {
    if (n.declared != null) { if (n.declared < dur.min || n.declared > dur.max) problems.push(`duration ${n.declared}ms outside ${dur.label}`); }
    else if (est?.length) { const lo = dur.min * 0.85 - 17, hi = dur.max * 1.15 + 17;
      if (est.at(-1) < lo || est[0] > hi) problems.push(`duration ~${est[0]}–${est.at(-1)}ms (sampled: last visible change – fitted) outside ${dur.label}`); }
  }
  const notes = [];
  if (n.shifted?.length) notes.push(`moved by a layout shift around it (${n.shifted.map((c) => ({ ol: 'left', ot: 'top' }[c])).join(', ')} jumped in one frame while its own size did not): look for content changing size nearby`);
  if (n.jumps?.length && n.state === 'animates') problems.push(`layout jumps in one frame (${n.jumps.map((c) => ({ ow: 'width', oh: 'height', ol: 'left/margin', ot: 'top/margin' }[c])).join(', ')}): a layout property changed without transitioning`);
  const wantE = resolveEasing(entry.easing);
  let easing = null;
  if (wantE && n.state === 'animates' && !n.scrollLinked) {
    const decl = n.anims.filter((x) => x.timeline === 'document' && x.iterations !== Infinity).map((x) => x.easing);
    if (decl.length) { const d = Math.min(...decl.map((e) => easingDistance(e, wantE) ?? 1)); easing = { declared: [...new Set(decl)].slice(0, 3), distance: +d.toFixed(3) }; if (d > 0.04) problems.push(`easing ${easing.declared.join(' / ')} is not ${entry.easing} (${wantE})`); }
    else if (n.fit) { easing = { estimated: n.fit.best, rms: n.fit.rms }; const mine = n.fit.rms.__spec; const best = Math.min(...Object.values(n.fit.rms)); if (mine != null && mine > best + 0.03 && mine > 0.06) problems.push(`sampled curve fits ${n.fit.best} better than ${entry.easing} (rms ${mine} vs ${best})`); }
  }
  const want = (entry.properties || []).map((p) => String(p).toLowerCase());
  if (want.length && n.state === 'animates') {
    const LAYOUT = /^(width|height|top|left|right|bottom|left\/margin|top\/margin|margin.*|padding.*|max-height|max-width|min-height|min-width|inset.*)$/;
    const extra = n.props.filter((p) => LAYOUT.test(p) && !want.includes(p));
    if (extra.length) problems.push(`animates layout properties not in the spec: ${[...new Set(extra)].join(', ')}`);
    if (n.layout && !want.some((p) => LAYOUT.test(p)) && !extra.length) problems.push('the element\'s layout box changes size or position during the animation');
    const alias = { transform: ['transform', 'translate', 'scale', 'rotate'], opacity: ['opacity'], 'background-color': ['background-color', 'background'], color: ['color'], 'box-shadow': ['box-shadow'], text: ['text'] };
    const missing = want.filter((p) => alias[p] && !alias[p].some((q) => n.props.includes(q)) && !(p === 'transform' && n.vt?.moves) && !(p === 'opacity' && n.vt?.fades));
    if (missing.length) problems.push(`spec'd properties that did not change: ${missing.join(', ')}`);
  }
  if (entry.stagger && n.targets > 1 && n.state === 'animates') {
    if (n.stagger == null || Math.abs(n.stagger - entry.stagger) > Math.max(20, entry.stagger * 0.5)) problems.push(`stagger ${n.stagger ?? '—'}ms, spec ${entry.stagger}ms`);
  }
  // reduced motion
  let reduced = null;
  if (r && !r.error) {
    const outcome = r.state === 'none' ? 'nothing changes' : r.state === 'instant' ? 'stops (instant)' : r.moves ? 'still moves' : r.fades ? 'substituted (fade/colour)' : r.counts ? 'still animates (text or custom property)' : 'substituted (fade/colour)';
    const lost = n.final && r.final && ((n.final.vis && !r.final.vis) || (n.final.vis && r.final.vis && n.final.op > 0.5 && r.final.op < 0.5) || (n.final.text && r.final.text !== n.final.text));
    const exp = String(entry.reduced || '').toLowerCase();
    let ok = true;
    if (lost) { ok = false; problems.push('reduced motion: the content ends in a different state (hidden or unfinished)'); }
    if (exp === 'keep' && r.state !== 'animates') { ok = false; problems.push(`reduced motion removed essential feedback (${outcome})`); }
    if (['fade', 'crossfade', 'instant', 'static', 'pause', 'none', 'off'].includes(exp) && r.moves) { ok = false; problems.push(`reduced motion: ${outcome} — spec says ${exp}`); }
    if (exp === 'fade' && r.state === 'animates' && !r.moves && !entry.interrupt && (r.declared ?? r.observed ?? 0) > 250) { ok = false; problems.push(`reduced motion: the fade takes ${r.declared ?? r.observed}ms (≤ 200 ms)`); }
    if (['instant', 'static', 'pause', 'none', 'off'].includes(exp) && r.state === 'animates' && !r.moves) { ok = false; problems.push(`reduced motion: ${outcome} — spec says ${exp}`); }
    if (exp === 'static' && r.state === 'instant' && entry.trigger !== 'load') { ok = false; problems.push('reduced motion: the content was hidden until the trigger (spec says it is simply present)'); }
    reduced = { expected: exp || '—', outcome, ok, final: r.final };
  } else if (r?.error) problems.push(`reduced run: ${r.error}`);
  if (n.interrupt && /swallowed|jumps/.test(n.interrupt.result)) problems.push(`interrupted after ${entry.interrupt}ms: ${n.interrupt.result}`);
  return { pass: problems.length === 0, problems, notes, easing, reduced };
}

const films = [];
if (spec) {
  const filmIds = filmArg === 'all' ? null : filmArg === 'none' ? [] : filmArg.split(',');
  for (const entry of spec.motion) {
    if (!entry.id || !entry.target) { report.spec.push({ id: entry.id || '(no id)', pass: false, problems: ['entry needs id and target'] }); continue; }
    const film = !filmIds || filmIds.includes(entry.id);
    const dn = await runEntry(entry, 'no-preference', film);
    const dr = await runEntry(entry, 'reduce', film);
    const n = analyse(entry, dn), r = analyse(entry, dr);
    const wantE = resolveEasing(entry.easing);
    if (!n.error && n.dominant && wantE) {
      const cands = { __spec: wantE, linear: 'linear', ease: 'ease', 'ease-in': 'ease-in', 'ease-out': 'ease-out', 'ease-in-out': 'ease-in-out', ...Object.fromEntries(Object.entries(easeTokens).map(([k, v]) => [`--ease-${k}`, v])) };
      n.fit = fitEasing(dn.frames, 0, n.dominant, cands);
    }
    const j = judge(entry, n, r);
    if (a.dump) { n.frames = dn?.frames; r.frames = dr?.frames; n.inputs = dn?.inputs; }
    const row = { id: entry.id, trigger: entry.trigger, on: entry.on, target: entry.target, spec: { properties: entry.properties, duration: entry.duration, easing: entry.easing, reduced: entry.reduced, stagger: entry.stagger },
      normal: n, reduce: r, ...j };
    report.spec.push(row);
    // a scroll trigger is a 600 ms scripted scroll: its filmstrip starts when the scroll ends
    const shift = entry.trigger === 'scroll' ? 600 : 0;
    if (film && dn?.film && dr?.film) films.push({ id: entry.id, n: dn.film, r: dr.film, tn: n.tT + shift, tr: r.tT + shift, after: shift ? 'the end of the scroll' : 'the trigger' });
    process.stderr.write(`${j.pass ? '✓' : '✗'} ${entry.id}${j.problems.length ? ` — ${j.problems[0]}` : ''}\n`);
  }
}

// ---------------------------------------------------------------- filmstrips
async function filmstrip(f) {
  const pick = (film, tTrig) => {
    const base = film.origin + tTrig;
    return TIMES.map((ms) => { const want = base + ms; let best = null; for (const fr of film.frames) if (fr.wall <= want + 4) best = fr; return best ? { ms, fr: best, at: Math.round(best.wall - base) } : { ms, fr: null }; });
  };
  const rect = f.n.rect || f.r.rect; if (!rect) return null;
  const pad = 24; const x = Math.max(0, rect.x - pad), y = Math.max(0, rect.y - pad);
  const w = Math.min(rect.vw - x, rect.w + pad * 2, 900), h = Math.min(rect.vh - y, rect.h + pad * 2, 600);
  const scale = Math.min(1, 1400 / (w * TIMES.length));
  const row = (label, cells) => `<div class="row"><div class="lab">${label}</div>${cells.map((c) => `<figure><div class="clip" style="width:${w * scale}px;height:${h * scale}px">${c.fr ? `<img src="data:image/jpeg;base64,${c.fr.data}" style="width:${c.fr.w * scale}px;margin-left:${-x * scale}px;margin-top:${-y * scale}px">` : ''}</div><figcaption>${c.ms} ms${c.fr && Math.abs(c.at - c.ms) > 20 ? ` <i>(frame ${c.at})</i>` : ''}</figcaption></figure>`).join('')}</div>`;
  const html = `<!doctype html><meta charset=utf-8><style>body{margin:0;padding:12px;background:#fff;font:12px/1.3 system-ui,sans-serif;color:#222}h1{font-size:13px;margin:0 0 8px}.row{display:flex;gap:6px;align-items:flex-start;margin-bottom:8px}.lab{width:70px;font-weight:600;padding-top:4px}figure{margin:0}.clip{overflow:hidden;outline:1px solid #ccc;background:#f4f4f4}.clip img{display:block}figcaption{text-align:center;color:#555;margin-top:2px}i{color:#a33;font-style:normal}</style>
<h1>${f.id} — frames after ${f.after} (last frame painted at or before each time; red: when that frame was painted)</h1>${row('normal', pick(f.n, f.tn))}${row('reduce', pick(f.r, f.tr))}`;
  const page = await browser.newPage();
  await page.setContent(html);
  await page.waitForTimeout(100);
  const file = path.join(outDir, `filmstrip-${f.id.replace(/[^a-z0-9_-]+/gi, '-')}.${a.jpeg ? 'jpg' : 'png'}`);
  await page.locator('body').screenshot({ path: file, type: a.jpeg ? 'jpeg' : 'png', ...(a.jpeg ? { quality: 80 } : {}) });
  await page.close();
  return file;
}
for (const f of films) { const file = await filmstrip(f).catch((e) => { console.error(`filmstrip ${f.id}: ${e.message}`); return null; }); const row = report.spec.find((x) => x.id === f.id); if (row && file) row.filmstrip = path.basename(file); }
await browser.close();

// ---------------------------------------------------------------- report
const md = [];
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|');
md.push(`# Motion check — ${url}`, '', `${report.date.slice(0, 10)} · ${report.device} · Chromium ${report.browser} · tokens from ${tokenSource}: ${Object.entries(durTokens).map(([k, v]) => `${k} ${v}`).join(', ')}`, '');
if (spec) {
  const fails = report.spec.filter((x) => !x.pass).length;
  md.push(`## Spec: ${report.spec.length - fails}/${report.spec.length} entries pass`, '');
  md.push('| id | trigger | normal | duration | easing | reduced (spec → seen) | verdict |', '| --- | --- | --- | --- | --- | --- | --- |');
  for (const x of report.spec) {
    const n = x.normal || {}; const r = x.reduced;
    const d = n.declared != null ? `${n.declared}ms` : n.observed != null ? `~${n.observed}ms` : '—';
    const e = x.easing?.declared ? x.easing.declared.join(' / ') : x.easing?.estimated ? `≈ ${x.easing.estimated}` : '—';
    md.push(`| ${esc(x.id)} | ${esc(x.trigger)} | ${esc(n.error || n.state)}${n.vt ? ' (view transition)' : ''}${x.spec?.stagger && n.stagger != null ? `, stagger ${n.stagger}ms (${n.staggerSource})` : ''} | ${d} (spec ${esc(x.spec?.duration ?? '—')}) | ${esc(e)} | ${esc(r ? `${r.expected} → ${r.outcome}` : '—')} | ${x.pass ? '✓' : `✗ ${esc(x.problems.join('; '))}`}${x.notes?.length ? ` (note: ${esc(x.notes.join('; '))})` : ''} |`);
  }
  md.push('');
  const fl = report.spec.filter((x) => x.filmstrip); if (fl.length) md.push(`Filmstrips: ${fl.map((x) => `\`${x.filmstrip}\``).join(', ')}`, '');
}
if (report.audit) {
  const A = report.audit;
  md.push('## Audit', '');
  md.push(`- Elements with motion: ${A.inventoryNormal.elements} (${A.inventoryNormal.transitions} transitions, ${A.inventoryNormal.animations} animations); under reduce: ${A.inventoryReduce.elements} (${A.inventoryReduce.transitions}, ${A.inventoryReduce.animations}).`);
  md.push(`- Reduced-motion handling: ${A.reduceBlocks} CSS \`prefers-reduced-motion: reduce\` block(s)${A.killAll ? ' including a universal kill rule' : ''}; JavaScript queried it ${A.mqReduce}×.${A.blockedSheets ? ` ${A.blockedSheets} stylesheet(s) unreadable (cross-origin): their rules are not inventoried.` : ''}`);
  md.push(`- At rest (no input, after load): requestAnimationFrame ${A.rafAtRest}×/s.`);
  md.push(`- At load: ${A.loadNormal.anims} CSS/WAAPI animation(s) normally, ${A.loadReduce.anims} under reduce; JS-driven inline-style motion on ${A.loadNormal.churn.length} element(s) normally, ${A.loadReduce.churn.length} under reduce.`);
  const hv = A.hover.filter((x) => x.control), fc = A.focus, pr = A.press;
  md.push(`- Hover: ${hv.filter((x) => x.changed).length}/${hv.length} controls change visibly · keyboard focus: ${fc.filter((x) => x.changed).length}/${fc.length} · press (:active): ${pr.filter((x) => x.changed).length}/${pr.length} buttons.`, '');
  const order = ['reduce-kills-all', 'no-reduced-motion', 'moves-under-reduce', 'raf-at-rest', 'transition-all', 'layout-transition', 'layout-keyframes', 'scale-zero', 'off-token', 'long', 'no-active', 'hover-none', 'focus-none', 'linear-movement', 'infinite'];
  const byKind = new Map(); for (const f of flags) { if (!byKind.has(f.kind)) byKind.set(f.kind, []); byKind.get(f.kind).push(f); }
  md.push('### Flags', '');
  if (!flags.length) md.push('None.', '');
  for (const k of [...order, ...[...byKind.keys()].filter((x) => !order.includes(x))]) {
    const fs = byKind.get(k); if (!fs) continue;
    md.push(`- **${k}** (${fs.length}): ${fs.slice(0, 8).map((f) => `\`${f.sel}\` — ${f.detail}`).join('; ')}${fs.length > 8 ? `; … ${fs.length - 8} more` : ''}`);
  }
  md.push('', '### Inventory (grouped by selector)', '', '| selector | count | transitions | animations |', '| --- | --- | --- | --- |');
  for (const it of A.inventory.slice(0, 40)) md.push(`| \`${esc(it.sel)}\` | ${it.n} | ${esc(it.transitions.join('; ')) || '—'} | ${esc(it.animations.join('; ')) || '—'} |`);
  if (A.inventory.length > 40) md.push(`| … ${A.inventory.length - 40} more | | | |`);
  md.push('');
}
md.push('## Limits', '', '- Computed styles only: canvas, WebGL, Lottie and Rive frames are invisible (their `<canvas>` is one element). JS libraries that animate inline styles (GSAP, anime.js, React Spring) are sampled, but their easing is estimated from samples, not declared.',
  '- Timings are headless Chromium on this machine; judge feel on a real device (motion.md §7). A hover check needs a fine pointer; `--device phone` skips it.', '');
await writeFile(path.join(outDir, 'motion.md'), md.join('\n'));
const strip = (k, v) => (k === 'frames' && Array.isArray(v) && !a.dump ? undefined : v);
await writeFile(path.join(outDir, 'motion.json'), JSON.stringify(report, strip, 1));
const failed = report.spec.filter((x) => !x.pass).length;
console.log(`${path.join(outDir, 'motion.md')}${spec ? ` — spec ${report.spec.length - failed}/${report.spec.length} pass` : ''}; ${flags.length} flag(s)`);
process.exit(failed || (a.strict && flags.some((f) => f.level === 'warn')) ? 1 : 0);
