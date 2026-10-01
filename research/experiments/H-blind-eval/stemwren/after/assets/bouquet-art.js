// The illustrated flat lay: a hand-tied bouquet seen from above, lying on the shop's sage linen
// (social/posts.md #1, #3, #6). Every stem is drawn from its real top-view shape, in the colour names of
// data/flowers.json. One light, from the top left (the window). It is an illustration and says so wherever shown.

import { indexFlowers } from './bouquet-model.js';

// ---- Colour --------------------------------------------------------------------------------------------

// base, edge (darker), light (highlight), centre — per colour name in flowers.json
const COLOURS = {
  peach: ['#f4b291', '#d4876a', '#fcd6c2', '#e79a78'],
  blush: ['#f1c3be', '#d29a96', '#fbe2de', '#e2aaa5'],
  ivory: ['#f2e8d2', '#cdbf9f', '#fbf6ea', '#e2d4b2'],
  'deep red': ['#8c1f30', '#5a0f1e', '#b33a4b', '#6e1424'],
  red: ['#c9283b', '#8b1426', '#e45a66', '#a81b2f'],
  white: ['#f5f3ec', '#cfcdc2', '#ffffff', '#e3e1d6'],
  pink: ['#ec8dad', '#c56688', '#f7b9cd', '#d97498'],
  yellow: ['#f3cf48', '#cfa528', '#fbe48d', '#e2b934'],
  coral: ['#f07f6b', '#c65846', '#f9a796', '#de6a57'],
  apricot: ['#f3a866', '#cf7d40', '#f9c99a', '#e39252'],
  burgundy: ['#6c1631', '#430a1d', '#90304e', '#561026'],
  'cafe au lait': ['#e9cab4', '#c49f88', '#f5e3d6', '#d8b29a'],
  orange: ['#ec7b2f', '#bf5619', '#f6a566', '#d9661f'],
  purple: ['#7e4098', '#552869', '#a668bf', '#69337f'],
  lilac: ['#c8aadf', '#9f82bd', '#e2cff0', '#b597d0'],
  'mixed pastel': ['#f3b8c9', '#c98ea2', '#fbe3ea', '#d9a2b6'],
  bronze: ['#b96a2e', '#874718', '#d68e4f', '#a15a22'],
  green: ['#b2c86e', '#88a14a', '#d2e19c', '#9cb55a'],
  'silver dollar': ['#9fb6a9', '#6c8b7d', '#c6d7cd', '#86a294'],
};
const PASTELS = ['#f3b8c9', '#d7b6e8', '#fbe5ee', '#f6c6aa', '#cfe0f2'];
const LEAF = { stem: '#5b7a42', stemDark: '#3f5a2c', pitto: ['#56773a', '#37532a', '#7d9c5a'] };

export function palette(flower, colour) {
  if (flower.id === 'pittosporum') return LEAF.pitto.concat(LEAF.pitto[0]);
  return COLOURS[colour] || COLOURS.white;
}

export function mix(a, b, t) {
  const pa = hex(a), pb = hex(b);
  return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

// ---- Randomness that repeats (a shared link or a re-render draws the same bouquet) -----------------------

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
const f1 = (n) => Math.round(n * 10) / 10;

// ---- Shapes ----------------------------------------------------------------------------------------------

/** A petal with its base at 0,0 pointing up (−y). tip < 1 points it, > 1 rounds it. */
function petal(len, wid, tip = 1) {
  const L = f1(len), W = f1(wid);
  return `M0 0C${W} ${f1(-L * 0.12)} ${f1(W * tip)} ${f1(-L * 0.95)} 0 ${-L}C${f1(-W * tip)} ${f1(-L * 0.95)} ${-W} ${f1(-L * 0.12)} 0 0Z`;
}
/** A petal whose outer edge ruffles (peony, lisianthus, sweet pea). */
function ruffle(len, wid, bumps, r) {
  const pts = [];
  const n = bumps * 2 + 2;
  for (let i = 0; i <= n; i++) {
    const a = Math.PI * (i / n); // 0..π across the outer edge
    const rad = 1 + (i % 2 ? 0.08 + r() * 0.06 : -0.02);
    pts.push([Math.cos(a) * wid * rad * -1, -len * 0.45 - Math.sin(a) * len * 0.55 * rad]);
  }
  let d = `M0 0L${f1(pts[0][0])} ${f1(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i += 2) d += `Q${f1(pts[i][0])} ${f1(pts[i][1])} ${f1(pts[i + 1][0])} ${f1(pts[i + 1][1])}`;
  return d + 'Z';
}
const ring = (count, fn) => Array.from({ length: count }, (_, i) => fn(i, (360 / count) * i)).join('');
const use = (d, fill, stroke, rot, extra = '') => `<path d="${d}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width=".7" stroke-opacity=".55"` : ''}${rot ? ` transform="rotate(${f1(rot)})"` : ''}${extra}/>`;
const light = (r) => `<circle r="${f1(r)}" fill="url(#bq-hl)"/><circle r="${f1(r)}" fill="url(#bq-sh)"/>`;

// Each returns markup centred on 0,0. `r` is the head's radius in viewBox units.
const HEADS = {
  'rose-garden'(r, c, R) { // cupped, many petals, quartered centre
    let s = ring(8, (i, a) => use(petal(r, r * 0.55, 1.25), c[0], c[1], a + R() * 10));
    s += ring(7, (i, a) => use(petal(r * 0.8, r * 0.46, 1.25), mix(c[0], c[2], 0.25), c[1], a + 22 + R() * 8));
    s += ring(7, (i, a) => use(petal(r * 0.6, r * 0.36, 1.2), mix(c[0], c[3], 0.25), c[1], a + 8 + R() * 8));
    s += ring(6, (i, a) => use(petal(r * 0.42, r * 0.26, 1.2), mix(c[0], c[2], 0.35), c[1], a + 30));
    s += ring(4, (i, a) => `<path d="M0 0q${f1(r * 0.16)} ${f1(-r * 0.05)} ${f1(r * 0.14)} ${f1(-r * 0.2)}" stroke="${c[1]}" stroke-width="1" fill="none" transform="rotate(${a + 20})"/>`);
    return s + `<circle r="${f1(r * 0.07)}" fill="${c[1]}"/>` + light(r);
  },
  rose(r, c, R) { // spiral
    let s = ring(5, (i, a) => use(petal(r, r * 0.66, 1.2), c[0], c[1], a + R() * 12));
    s += ring(5, (i, a) => use(petal(r * 0.74, r * 0.5, 1.2), mix(c[0], c[3], 0.3), c[1], a + 36));
    s += ring(4, (i, a) => use(petal(r * 0.5, r * 0.36, 1.15), c[0], c[1], a + 15));
    const k = r * 0.32;
    s += `<path d="M0 0c${f1(k * 0.5)} ${f1(-k * 0.2)} ${f1(k * 0.6)} ${f1(k * 0.5)} ${f1(k * 0.1)} ${f1(k * 0.65)}c${f1(-k * 0.8)} ${f1(k * 0.25)} ${f1(-k * 1.1)} ${f1(-k * 0.6)} ${f1(-k * 0.5)} ${f1(-k)}c${f1(k * 0.7)} ${f1(-k * 0.45)} ${f1(k * 1.5)} 0 ${f1(k * 1.4)} ${f1(k * 0.8)}" fill="none" stroke="${c[1]}" stroke-width="1.2" stroke-linecap="round"/>`;
    return s + light(r);
  },
  peony(r, c, R) { // big ruffle
    let s = ring(9, (i, a) => use(ruffle(r, r * 0.42, 3, R), c[0], c[1], a + R() * 14));
    s += ring(9, (i, a) => use(ruffle(r * 0.78, r * 0.36, 3, R), mix(c[0], c[2], 0.3), c[1], a + 20 + R() * 10));
    s += ring(10, (i, a) => use(ruffle(r * 0.55, r * 0.26, 2, R), mix(c[0], c[3], 0.25), c[1], a + R() * 30));
    s += ring(8, (i, a) => use(ruffle(r * 0.32, r * 0.18, 2, R), mix(c[0], c[2], 0.45), c[1], a + R() * 40));
    return s + light(r);
  },
  ranunculus(r, c) { // tight concentric rings
    let s = '';
    for (let k = 0; k < 7; k++) {
      const rr = r * (1 - k * 0.125), n = 16 - k;
      const fill = k % 2 ? mix(c[0], c[2], 0.3) : c[0];
      s += ring(n, (i, a) => use(petal(rr, rr * 0.3, 1.3), fill, c[1], a + k * 9));
    }
    return s + `<circle r="${f1(r * 0.16)}" fill="#8ea25c"/><circle r="${f1(r * 0.07)}" fill="#4e5f2e"/>` + light(r);
  },
  dahlia(r, c) { // decorative: pointed petals in rings
    let s = '';
    const counts = [18, 16, 14, 12, 9, 7];
    counts.forEach((n, k) => {
      const len = r * (1 - k * 0.15);
      const fill = mix(c[0], k % 2 ? c[2] : c[3], 0.25 + k * 0.05);
      s += ring(n, (i, a) => use(petal(len, len * 0.22, 0.45), fill, c[1], a + k * 11) + `<path d="M0 ${f1(-len * 0.2)}V${f1(-len * 0.8)}" stroke="${c[1]}" stroke-opacity=".35" stroke-width=".6" transform="rotate(${a + k * 11})"/>`);
    });
    return s + `<circle r="${f1(r * 0.1)}" fill="${c[1]}"/>` + light(r);
  },
  tulip(r, c) { // a closed cup from above
    let s = ring(3, (i, a) => use(petal(r, r * 0.78, 1.15), c[0], c[1], a));
    s += ring(3, (i, a) => use(petal(r * 0.86, r * 0.62, 1.1), mix(c[0], c[2], 0.3), c[1], a + 60));
    s += `<path d="M${f1(-r * 0.14)} 0L0 ${f1(-r * 0.16)}L${f1(r * 0.14)} 0L0 ${f1(r * 0.16)}Z" fill="${c[1]}" opacity=".7"/>`;
    return s + light(r);
  },
  lisianthus(r, c, R) {
    let s = ring(5, (i, a) => use(ruffle(r, r * 0.52, 3, R), c[0], c[1], a + R() * 10));
    s += ring(5, (i, a) => use(ruffle(r * 0.62, r * 0.38, 2, R), mix(c[0], c[2], 0.35), c[1], a + 36));
    return s + `<circle r="${f1(r * 0.2)}" fill="#c9d38a"/><circle r="${f1(r * 0.09)}" fill="#7d8f3c"/>` + light(r);
  },
  'sweet-pea'(r, c, R) { // three ruffled florets, mixed pastels
    let s = '';
    for (let k = 0; k < 3; k++) {
      const a = k * 120 + R() * 30, d = r * 0.48, col = PASTELS[(k + Math.floor(R() * 5)) % 5];
      const x = f1(Math.cos((a * Math.PI) / 180) * d), y = f1(Math.sin((a * Math.PI) / 180) * d);
      s += `<g transform="translate(${x} ${y}) rotate(${f1(a + 90)})">${use(ruffle(r * 0.55, r * 0.42, 3, R), col, mix(col, '#7a5a6a', 0.45))}${use(ruffle(r * 0.38, r * 0.3, 2, R), mix(col, '#ffffff', 0.4), mix(col, '#7a5a6a', 0.45), 180)}</g>`;
    }
    return s + light(r);
  },
  chrysanthemum(r, c, R) {
    let s = ring(26, (i, a) => use(petal(r, r * 0.11, 0.8), c[0], c[1], a + R() * 4));
    s += ring(20, (i, a) => use(petal(r * 0.76, r * 0.1, 0.8), mix(c[0], c[2], 0.25), c[1], a + 7));
    s += ring(14, (i, a) => use(petal(r * 0.5, r * 0.09, 0.8), mix(c[0], c[3], 0.3), c[1], a + 3));
    return s + `<circle r="${f1(r * 0.18)}" fill="${mix(c[3], '#6b6a2a', 0.45)}"/>` + light(r);
  },
  gypsophila(r, c, R) { // a cloud of tiny flowers on fine stems
    let s = '';
    for (let k = 0; k < 6; k++) {
      const a = R() * Math.PI * 2, d = r * (0.3 + R() * 0.6);
      s += `<path d="M0 0L${f1(Math.cos(a) * d)} ${f1(Math.sin(a) * d)}" stroke="#7f9467" stroke-width=".7"/>`;
    }
    for (let k = 0; k < 46; k++) {
      const a = R() * Math.PI * 2, d = r * Math.sqrt(R());
      s += `<circle cx="${f1(Math.cos(a) * d)}" cy="${f1(Math.sin(a) * d)}" r="${f1(1.5 + R() * 1.4)}" fill="#fbfbf6" stroke="#c9cbbf" stroke-width=".5"/>`;
    }
    return s;
  },
};

// Foliage sprigs point up (−y) from 0,0.
const SPRIGS = {
  eucalyptus(len, c, R) {
    let s = `<path d="M0 0Q${f1(len * 0.06)} ${f1(-len * 0.5)} 0 ${f1(-len)}" stroke="${mix(c[1], '#4c6356', 0.4)}" stroke-width="1.6" fill="none"/>`;
    const n = 9;
    for (let i = 0; i < n; i++) {
      const t = 0.14 + (i / (n - 1)) * 0.86, side = i % 2 ? 1 : -1;
      const rr = 7.5 + (1 - t) * 4 + R() * 1.5;
      const x = f1(side * (rr * 0.8 + 1)), y = f1(-len * t);
      s += `<circle cx="${x}" cy="${y}" r="${f1(rr)}" fill="${i % 3 === 1 ? c[2] : c[0]}" stroke="${c[1]}" stroke-width=".7" stroke-opacity=".7"/>`;
      s += `<circle cx="${f1(+x - rr * 0.3)}" cy="${f1(+y - rr * 0.3)}" r="${f1(rr * 0.35)}" fill="#fff" opacity=".18"/>`;
    }
    return s;
  },
  pittosporum(len, c, R) {
    let s = `<path d="M0 0Q${f1(-len * 0.05)} ${f1(-len * 0.5)} 0 ${f1(-len)}" stroke="#4a3a2a" stroke-width="1.4" fill="none"/>`;
    const n = 12;
    for (let i = 0; i < n; i++) {
      const t = 0.12 + (i / (n - 1)) * 0.88, side = i % 2 ? 1 : -1;
      const l = 13 - t * 4 + R() * 2;
      s += `<g transform="translate(0 ${f1(-len * t)}) rotate(${f1(side * (52 + R() * 18))})"><path d="${petal(l, l * 0.42, 0.9)}" fill="${i % 4 === 0 ? c[2] : c[0]}" stroke="${c[1]}" stroke-width=".6"/><path d="M0 0V${f1(-l * 0.85)}" stroke="${c[2]}" stroke-width=".5" opacity=".8"/></g>`;
    }
    return s + `<g transform="translate(0 ${f1(-len)})">${use(petal(10, 4.5, 0.9), c[0], c[1])}</g>`;
  },
};

// Sizes in viewBox units (a 400 × 560 stage). Radii are top-view heads; foliage is sprig length.
export const SIZE = { 'rose-garden': 27, rose: 21, peony: 31, ranunculus: 19, dahlia: 30, tulip: 17, lisianthus: 19, 'sweet-pea': 15, chrysanthemum: 20, gypsophila: 22, eucalyptus: 80, pittosporum: 70 };

export function headMarkup(flower, colour, seedKey) {
  const R = rng(hash(seedKey));
  const c = palette(flower, colour);
  if (flower.kind === 'foliage') return (SPRIGS[flower.id] || SPRIGS.pittosporum)(SIZE[flower.id] || 70, c, R);
  return (HEADS[flower.id] || HEADS.rose)(SIZE[flower.id] || 20, c, R);
}

// ---- Layout -----------------------------------------------------------------------------------------------

const TIE = { x: 200, y: 392 };
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/** Positions for every stem instance. Pure: the same bouquet and seed always lay out the same way. */
export function layout(lines, flowers, seed, wrap) {
  const byId = indexFlowers(flowers);
  // One instance per stem; interleave lines so like stems spread through the bouquet.
  const queues = lines.filter((l) => byId[l.id]).map((l) => Array.from({ length: l.count }, (_, i) => ({ key: `${l.id}.${l.colour}.${i}`, flower: byId[l.id], colour: l.colour })));
  const all = [];
  for (let k = 0; queues.some((q) => q.length); k++) for (const q of queues) if (q.length) all.push(q.shift());
  const heads = all.filter((x) => x.flower.kind !== 'foliage');
  const greens = all.filter((x) => x.flower.kind === 'foliage');
  const R0 = rng(seed || 1);

  const area = heads.reduce((s, h) => s + (SIZE[h.flower.id] || 20) ** 2, 0);
  const R = Math.max(50, Math.sqrt(area / 0.9) + 4);
  const box = wrap === 'box';
  const C = { x: TIE.x, y: box ? 250 : TIE.y - Math.max(96, R * 1.08) };

  // Vogel spiral slots, then a few rounds of relaxation so heads overlap a little, as real ones do.
  const rot0 = R0() * Math.PI * 2;
  const pts = heads.map((h, i) => {
    const rad = (R - (SIZE[h.flower.id] || 20) * 0.55) * Math.sqrt((i + 0.5) / Math.max(1, heads.length));
    const a = rot0 + i * GOLDEN;
    return { ...h, r: SIZE[h.flower.id] || 20, x: C.x + Math.cos(a) * rad + (R0() - 0.5) * 6, y: C.y + Math.sin(a) * rad * 0.94 + (R0() - 0.5) * 6, rot: R0() * 360 };
  });
  for (let it = 0; it < 24; it++) {
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const a = pts[i], b = pts[j];
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01, min = (a.r + b.r) * 0.78;
      if (d < min) { const push = (min - d) / 2, ux = dx / d, uy = dy / d; a.x -= ux * push; a.y -= uy * push; b.x += ux * push; b.y += uy * push; }
    }
    for (const p of pts) { // keep inside the dome
      const dx = p.x - C.x, dy = p.y - C.y, d = Math.hypot(dx, dy), lim = R - p.r * 0.5;
      if (d > lim) { p.x = C.x + (dx / d) * lim; p.y = C.y + (dy / d) * lim; }
    }
  }
  // Greenery around the rim, spread evenly, biased away from the stems below.
  const g = greens.map((h, i) => {
    const n = greens.length;
    const a = -Math.PI / 2 + (n === 1 ? (R0() - 0.5) : (-1.2 + (2.4 * i) / (n - 1))) * (box ? 2.6 : 1.7) * (0.85 + R0() * 0.3);
    const dir = a + (R0() - 0.5) * 0.5 + (n % 2 && i === (n - 1) / 2 ? (R0() < 0.5 ? -0.3 : 0.3) : 0);
    const base = R * 0.42;
    return { ...h, x: C.x + Math.cos(dir) * base, y: C.y + Math.sin(dir) * base, rot: (dir * 180) / Math.PI + 90, len: (SIZE[h.flower.id] || 70) * (0.9 + R0() * 0.25) + R * 0.25 };
  });
  // Draw order: greenery first, then heads from the rim inwards (the dome's top is nearest the camera).
  pts.sort((a, b) => Math.hypot(b.x - C.x, b.y - C.y) - Math.hypot(a.x - C.x, a.y - C.y));
  const top = Math.min(C.y - R - 46, ...g.map((s) => s.y - Math.cos((s.rot * Math.PI) / 180) * s.len - 8));
  const bottom = box ? C.y + R + 44 : TIE.y + 64 + R * 0.55;
  return { heads: pts, greens: g, R, C, tie: TIE, box, top, bottom };
}

// ---- Wraps and ties ---------------------------------------------------------------------------------------

const WRAPS = {
  kraft: { fill: '#c69d6c', edge: '#8a6a45', light: '#dcbb8f', crease: '#a07d52', opacity: 1 },
  linen: { fill: '#6f8c6c', edge: '#4c6649', light: '#8aa587', crease: '#58745a', opacity: 1 },
  tissue: { fill: '#fbfbf7', edge: '#c9cdc2', light: '#ffffff', crease: '#d9dcd2', opacity: 0.94 },
};

/** The back sheet (behind the heads) and the front cone (over the stems), drawn for a dome of radius 100 at the tie. */
function wrapSheets(id, R) {
  const w = WRAPS[id] || WRAPS.kraft;
  const r = rng(hash(id + 'sheet'));
  const T = { x: 0, y: 0 }; // drawn around the tie; scaled by the caller
  const C = { x: 0, y: -112 };
  const top = [];
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * 0.94 + (Math.PI * 1.12 * i) / 10;
    const rad = 150 + (i % 2 ? 12 : -6) + r() * 10;
    top.push([C.x + Math.cos(a) * rad * 1.0, C.y + Math.sin(a) * rad * 0.9]);
  }
  let back = `M${T.x - 16} ${T.y - 6}L${f1(top[0][0] + 6)} ${f1(top[0][1] + 40)}L${f1(top[0][0])} ${f1(top[0][1])}`;
  for (let i = 1; i < top.length; i++) { const [px, py] = top[i - 1], [x, y] = top[i]; back += `Q${f1((px + x) / 2 + (r() - 0.5) * 10)} ${f1((py + y) / 2 - 6)} ${f1(x)} ${f1(y)}`; }
  back += `L${f1(top[top.length - 1][0] - 6)} ${f1(top[top.length - 1][1] + 40)}L${T.x + 16} ${T.y - 6}Z`;
  const creases = top.filter((_, i) => i % 2).map(([x, y]) => `M${T.x} ${T.y - 4}L${f1(x * 0.96)} ${f1(y * 0.96 + 4)}`).join('');
  const front = `M-118 -62Q-60 -10 -14 -2L-26 70Q-10 78 4 72Q18 80 30 70L14 -2Q62 -14 116 -66Q86 -20 40 6Q10 16 -8 10Q-62 -4 -118 -62Z`;
  const frontCrease = `M-96 -50Q-50 -12 -12 2M98 -54Q56 -16 12 4M-6 12L-16 70M8 12L18 68`;
  const backSvg = `<path d="${back}" fill="${w.fill}" stroke="${w.edge}" stroke-width="1.2" opacity="${w.opacity}"/><path d="${creases}" stroke="${w.crease}" stroke-width="1.1" fill="none" opacity=".55"/>${id === 'linen' ? weave(back, w) : ''}`;
  const frontSvg = `<path d="${front}" fill="${w.fill}" stroke="${w.edge}" stroke-width="1.2" opacity="${w.opacity}"/><path d="${frontCrease}" stroke="${w.crease}" stroke-width="1" fill="none" opacity=".6"/><path d="M-118 -62Q-60 -10 -14 -2" stroke="${w.light}" stroke-width="2" fill="none" opacity=".7"/>${id === 'linen' ? weave(front, w) : ''}`;
  return { backSvg, frontSvg };
}
function weave(d, w) { // a hint of the linen's weave, clipped to the sheet
  const id = 'wv' + hash(d).toString(36);
  let lines = '';
  for (let y = -300; y < 100; y += 5) lines += `M-200 ${y}H200`;
  return `<clipPath id="${id}"><path d="${d}"/></clipPath><path d="${lines}" stroke="${w.edge}" stroke-width=".4" opacity=".35" clip-path="url(#${id})"/>`;
}

function tieMarkup(wrap, ribbon) {
  const twine = (n) => {
    let s = '';
    for (let i = 0; i < n; i++) s += `<path d="M-19 ${-6 + i * 3.2}Q0 ${-1 + i * 3.2} 20 ${-6 + i * 3.2}" stroke="#8d7148" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M-19 ${-6.6 + i * 3.2}Q0 ${-1.6 + i * 3.2} 20 ${-6.6 + i * 3.2}" stroke="#c4a777" stroke-width=".7" fill="none"/>`;
    return s + `<path d="M6 4q14 10 6 30q-4 10 4 18" stroke="#8d7148" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M-4 4q-16 12 -10 28" stroke="#8d7148" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
  };
  const bow = (fill, edge, sheen) => `<g>
    <path d="M0 0C-10 -18 -46 -24 -42 -4C-40 10 -12 6 0 0Z" fill="${fill}" stroke="${edge}" stroke-width="1"/>
    <path d="M0 0C10 -18 46 -24 42 -4C40 10 12 6 0 0Z" fill="${fill}" stroke="${edge}" stroke-width="1"/>
    <path d="M-30 -12C-24 -16 -14 -12 -8 -6M30 -12C24 -16 14 -12 8 -6" stroke="${sheen}" stroke-width="1.6" fill="none" opacity=".8"/>
    <path d="M-3 2C-12 22 -22 40 -26 62L-14 58C-8 38 -2 22 3 4Z" fill="${fill}" stroke="${edge}" stroke-width="1"/>
    <path d="M3 2C10 24 16 44 26 60L36 52C26 38 14 22 6 2Z" fill="${fill}" stroke="${edge}" stroke-width="1"/>
    <ellipse rx="7" ry="6" fill="${fill}" stroke="${edge}" stroke-width="1"/></g>`;
  if (ribbon === 'silk-sage') return bow('#7e9c7b', '#4f6a4d', '#b5ccb1');
  if (ribbon === 'silk-blush') return bow('#ecbcb4', '#b98a84', '#fbe2dd');
  if (ribbon === 'twine') return twine(5);
  if (wrap === 'kraft') return twine(3); // "Kraft paper and twine"
  return `<path d="M-15 -4Q0 2 16 -4" stroke="rgba(0,0,0,.25)" stroke-width="1.5" fill="none"/>`;
}

function boxMarkup(L) {
  const { C, R } = L;
  const rr = R * 0.9 + 6;
  return {
    back: `<circle cx="${C.x}" cy="${C.y}" r="${f1(rr + 14)}" fill="#dcd8cc" stroke="#9c9a8c" stroke-width="1.2"/><circle cx="${C.x}" cy="${C.y}" r="${f1(rr)}" fill="#6d6a5c"/><circle cx="${C.x}" cy="${C.y}" r="${f1(rr)}" fill="url(#bq-boxin)"/>`,
    front: `<circle cx="${C.x}" cy="${C.y}" r="${f1(rr + 7)}" fill="none" stroke="#e9e6dc" stroke-width="12" opacity=".96"/><circle cx="${C.x}" cy="${C.y}" r="${f1(rr + 1.5)}" fill="none" stroke="#b7b3a5" stroke-width="1.2"/><circle cx="${C.x}" cy="${C.y}" r="${f1(rr + 14)}" fill="none" stroke="#9c9a8c" stroke-width="1"/>`,
    tieAt: { x: C.x + rr * 0.6, y: C.y + rr * 0.8 + 6 },
  };
}

// ---- Static markup (home page, thumbnails, the share picture) --------------------------------------------

export const DEFS = `<defs>
<radialGradient id="bq-hl" cx=".32" cy=".3" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".34"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></radialGradient>
<radialGradient id="bq-sh" cx=".7" cy=".74" r=".7"><stop offset=".35" stop-color="#2a2018" stop-opacity="0"/><stop offset="1" stop-color="#2a2018" stop-opacity=".28"/></radialGradient>
<radialGradient id="bq-boxin" cx=".45" cy=".42" r=".6"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></radialGradient>
<filter id="bq-blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7"/></filter>
</defs>`;

/** Everything except the keyed stems: returned as separate layers so the live view can update them in place. */
export function scene(state, data) {
  const L = layout(state.lines, data.flowers, state.seed, state.wrap);
  const s = Math.max(0.6, L.R / 118);
  const sheets = L.box ? null : wrapSheets(state.wrap, L.R);
  const box = L.box ? boxMarkup(L) : null;
  const tieAt = box ? box.tieAt : L.tie;
  const cy = (L.top + L.bottom) / 2;
  const k = Math.min(1.24, 536 / (L.bottom - L.top));
  return {
    L,
    root: `translate(200px, 284px) rotate(-7deg) scale(${f1(k * 100) / 100}) translate(-200px, ${f1(-cy)}px)`,
    sheetT: `translate(${L.tie.x}px, ${L.tie.y}px) scale(${f1(s * 100) / 100})`,
    shadow: box
      ? `<circle cx="${L.C.x + 8}" cy="${L.C.y + 12}" r="${f1(L.R + 30)}" fill="#26301f" opacity=".35"/>`
      : `<g style="transform:translate(${L.tie.x + 8}px, ${L.tie.y + 12}px) scale(${f1(s * 100) / 100})"><path d="M-16 -6L-150 -80L-140 -200L0 -270L140 -200L150 -80L16 -6L22 80L-22 80Z" fill="#26301f" opacity=".4"/></g>`,
    back: box ? box.back : sheets.backSvg,
    front: box ? box.front : sheets.frontSvg,
    tie: `<g transform="translate(${tieAt.x} ${tieAt.y})">${tieMarkup(state.wrap, state.ribbon)}</g>`,
  };
}

function stemGeom(p, L) {
  const dx = p.x - L.tie.x, dy = p.y - L.tie.y;
  const ang = (Math.atan2(dx, -dy) * 180) / Math.PI; // 0 = straight up
  const len = Math.hypot(dx, dy);
  return { ang, len, below: ang * 0.42 };
}

function instanceParts(p, L, kind) {
  const g = stemGeom(p, L);
  const r = rng(hash(p.key + 'stem'));
  const endLen = 46 + L.R * 0.5 + r() * 26;
  return {
    upper: `transform:translate(${L.tie.x}px, ${L.tie.y}px) rotate(${f1(g.ang)}deg) scale(1, ${f1(g.len / 100 * 1000) / 1000})`,
    lower: `transform:translate(${L.tie.x}px, ${L.tie.y}px) rotate(${f1(g.below + (r() - 0.5) * 6)}deg)`,
    endLen,
    head: kind === 'foliage' ? `transform:translate(${f1(p.x)}px, ${f1(p.y)}px) rotate(${f1(p.rot)}deg) scale(${f1(p.len / (SIZE[p.flower.id] || 70) * 100) / 100})` : `transform:translate(${f1(p.x)}px, ${f1(p.y)}px) rotate(${f1(p.rot)}deg)`,
  };
}
const STEM_UP = `<path d="M0 0L0 -100" stroke="${LEAF.stem}" stroke-width="2.6" vector-effect="non-scaling-stroke" stroke-linecap="round"/>`;
const stemDown = (len) => `<path d="M0 0L0 ${f1(len)}" stroke="${LEAF.stem}" stroke-width="2.8" stroke-linecap="round"/><path d="M-1.4 ${f1(len - 0.5)}L1.4 ${f1(len - 0.5)}" stroke="#b9c99a" stroke-width="2"/>`;

/** A complete, self-contained SVG string of a bouquet. */
export function bouquetSVG(state, data, { label = '', id = '', cls = 'bouquet' } = {}) {
  const S = scene(state, data);
  const { L } = S;
  let stemsUp = '', stemsDown = '', greens = '', heads = '';
  if (!L.box) {
    for (const p of [...L.greens, ...L.heads]) {
      const parts = instanceParts(p, L, p.flower.kind);
      stemsUp += `<g style="${parts.upper}">${STEM_UP}</g>`;
      stemsDown += `<g style="${parts.lower}">${stemDown(parts.endLen)}</g>`;
    }
  }
  for (const p of L.greens) greens += `<g class="head" style="${instanceParts(p, L, 'foliage').head}"><g class="head-art">${headMarkup(p.flower, p.colour, p.key)}</g></g>`;
  for (const p of L.heads) heads += `<g class="head" style="${instanceParts(p, L).head}"><g class="head-art">${headMarkup(p.flower, p.colour, p.key)}</g></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 560" class="${cls}"${id ? ` id="${id}"` : ''} ${label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true"'} focusable="false">${DEFS}
<g class="bq-root" style="transform:${S.root};transform-origin:0 0">
<g class="bq-shadow" filter="url(#bq-blur)">${S.shadow}</g>
<g class="bq-back"><g class="bq-sheet" style="transform:${S.sheetT}">${L.box ? '' : S.back}</g>${L.box ? S.back : ''}</g>
<g class="bq-ends">${stemsDown}</g>
<g class="bq-stems">${stemsUp}</g>
<g class="bq-greens">${greens}</g>
<g class="bq-heads">${heads}</g>
<g class="bq-front"><g class="bq-sheet" style="transform:${S.sheetT}">${L.box ? '' : S.front}</g>${L.box ? S.front : ''}</g>
<g class="bq-tie">${S.tie}</g>
</g></svg>`;
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// ---- The live view: updates in place, so stems glide instead of jumping -----------------------------------

export class BouquetView {
  constructor(host, data) {
    this.host = host;
    this.data = data;
    host.innerHTML = bouquetSVG({ lines: [], wrap: 'kraft', ribbon: 'none', seed: 1 }, data, { cls: 'bouquet', label: ' ' });
    this.svg = host.querySelector('svg');
    const q = (c) => this.svg.querySelector(c);
    this.el = { root: q('.bq-root'), shadow: q('.bq-shadow'), back: q('.bq-back'), ends: q('.bq-ends'), stems: q('.bq-stems'), greens: q('.bq-greens'), heads: q('.bq-heads'), front: q('.bq-front'), tie: q('.bq-tie') };
    this.items = new Map();
    this.wrapKey = '';
  }

  update(state, { label } = {}) {
    const S = scene(state, this.data);
    const { L } = S;
    if (label) this.svg.setAttribute('aria-label', label);
    this.el.root.style.transform = S.root;
    this.el.shadow.innerHTML = S.shadow;
    const wrapKey = `${state.wrap}|${L.box}`;
    if (wrapKey !== this.wrapKey) {
      this.el.back.innerHTML = `<g class="bq-sheet" style="transform:${S.sheetT}">${L.box ? '' : S.back}</g>${L.box ? S.back : ''}`;
      this.el.front.innerHTML = `<g class="bq-sheet" style="transform:${S.sheetT}">${L.box ? '' : S.front}</g>${L.box ? S.front : ''}`;
      if (this.wrapKey) for (const g of [this.el.back, this.el.front]) { g.classList.remove('is-new'); void g.getBBox; g.getBoundingClientRect(); g.classList.add('is-new'); }
      this.wrapKey = wrapKey;
    } else {
      this.svg.querySelectorAll('.bq-sheet').forEach((g) => { g.style.transform = S.sheetT; });
      if (L.box) { this.el.back.innerHTML = S.back; this.el.front.innerHTML = S.front; }
    }
    this.el.tie.innerHTML = S.tie;
    this.el.stems.style.opacity = L.box ? 0 : 1;
    this.el.ends.style.opacity = L.box ? 0 : 1;

    const seen = new Set();
    const created = [];
    const place = (p, kind) => {
      seen.add(p.key);
      const parts = instanceParts(p, L, kind);
      let it = this.items.get(p.key);
      if (!it) {
        const ns = 'http://www.w3.org/2000/svg';
        const mk = (html, style) => { const g = document.createElementNS(ns, 'g'); g.innerHTML = html; g.setAttribute('style', style); return g; };
        it = {
          head: mk(`<g class="head-art">${headMarkup(p.flower, p.colour, p.key)}</g>`, parts.head),
          up: mk(STEM_UP, parts.upper),
          down: mk(stemDown(parts.endLen), parts.lower),
        };
        it.head.setAttribute('class', 'head is-new');
        it.head.dataset.key = p.key;
        it.up.setAttribute('class', 'stem is-new');
        it.down.setAttribute('class', 'stem is-new');
        this.items.set(p.key, it);
        created.push(it);
        setTimeout(() => { it.head.classList.remove('is-new'); it.up.classList.remove('is-new'); it.down.classList.remove('is-new'); }, 700);
      } else {
        // Never move an existing node in the DOM: re-inserting it cancels its transition, and the stem would jump.
        it.head.style.transform = parts.head.replace('transform:', '');
        it.up.style.transform = parts.upper.replace('transform:', '');
        it.down.style.transform = parts.lower.replace('transform:', '');
      }
      return it;
    };
    const insertInOrder = (layer, list, part) => {
      // New nodes go where the draw order wants them (rim first, centre last), relative to nodes already there.
      for (let i = 0; i < list.length; i++) {
        const el = list[i][part];
        if (el.parentNode === layer) continue;
        const next = list.slice(i + 1).map((x) => x[part]).find((n) => n.parentNode === layer);
        layer.insertBefore(el, next || null);
      }
    };
    const greens = L.greens.map((p) => place(p, 'foliage'));
    const heads = L.heads.map((p) => place(p, p.flower.kind));
    insertInOrder(this.el.greens, greens, 'head');
    insertInOrder(this.el.heads, heads, 'head');
    insertInOrder(this.el.stems, [...greens, ...heads], 'up');
    insertInOrder(this.el.ends, [...greens, ...heads], 'down');
    for (const [key, it] of this.items) {
      if (!seen.has(key)) { it.head.remove(); it.up.remove(); it.down.remove(); this.items.delete(key); }
    }
  }

  /** A standalone copy of the current picture (for the share image). */
  markup() {
    return new XMLSerializer().serializeToString(this.svg);
  }
}

// ---- One stem, standing, for the tray and the home page's flat lay -----------------------------------------

export function stemSVG(flower, colour, { label = '' } = {}) {
  const key = `${flower.id}.${colour}.tray`;
  const r = rng(hash(key));
  const leaf = (y, side) => `<g transform="translate(40 ${y}) rotate(${side * 58})"><path d="${petal(16, 6, 0.8)}" fill="${LEAF.stem}" stroke="${LEAF.stemDark}" stroke-width=".6"/></g>`;
  let art;
  if (flower.kind === 'foliage') {
    art = `<g transform="translate(40 116)">${headMarkup(flower, colour, key).replace(/^/, '')}</g>`;
    art = `<g transform="translate(40 128) scale(1.12) translate(-40 -128)">${art}</g>`;
  } else {
    const hr = SIZE[flower.id] || 20;
    const scale = Math.min(1.25, 30 / hr);
    art = `<path d="M40 128Q${f1(38 + r() * 4)} 84 40 40" stroke="${LEAF.stem}" stroke-width="2.6" fill="none" stroke-linecap="round"/>${leaf(96, -1)}${leaf(80, 1)}<g transform="translate(40 36) scale(${f1(scale * 100) / 100})">${headMarkup(flower, colour, key)}</g>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 132" class="stem-art" ${label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true"'} focusable="false">${art}</svg>`;
}

/** The defs the tray and home stems need (gradients), placed once per page. */
export function defsSVG() {
  return `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">${DEFS}</svg>`;
}
