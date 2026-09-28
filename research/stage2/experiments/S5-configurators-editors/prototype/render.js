// SVG preview of the configured cake: a three-quarter view drawn from the configuration, all artwork procedural
// (no third-party assets). Every tier is an extruded outline (round, rounded square turned 30°, heart) whose
// front-facing side facets are shaded by their normal, so one code path draws every shape.
// Deterministic: seeded placement, and depth sorts round and tie-break by index (the Cake Junction hydration lesson).
import { tierSizes, colourOf, lookup, DRIPS } from './model.js';

export const VIEW = { w: 640, h: 540 };
const K = 13;          // px per inch of radius (26 px per inch of diameter)
const TIER_H = 98;     // a 4-inch tier, foreshortened
const TILT = 0.3;      // ellipse ratio of a top face: the camera looks down about 17°
const LIGHT = norm([-0.55, 0.85]); // light in the top view: from the front left

function norm([x, z]) { const l = Math.hypot(x, z) || 1; return [x / l, z / l]; }
const hex = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export function mix(a, b, t) { const A = rgb(a), B = rgb(b); return `#${hex(A[0] + (B[0] - A[0]) * t)}${hex(A[1] + (B[1] - A[1]) * t)}${hex(A[2] + (B[2] - A[2]) * t)}`; }
const shade = (c, t) => (t < 0 ? mix(c, '#1e1210', -t) : mix(c, '#ffffff', t));
export const luminance = (c) => { const [r, g, b] = rgb(c).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const f1 = (v) => Math.round(v * 10) / 10;
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const esc = (s) => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

// ---------------------------------------------------------------------------------------------------------
// Outlines in the top view: x to the right, z towards the viewer; counter-clockwise, so the outward normal of edge
// (dx, dz) is (dz, -dx).
export function outline(shape, r, n = 96) {
  let pts;
  if (shape === 'round') pts = Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [r * Math.cos(a), r * Math.sin(a)]; });
  else if (shape === 'square') {
    const s = r * 0.93, rc = s * 0.16, rot = (30 * Math.PI) / 180, per = Math.max(4, Math.round(n / 4));
    const corners = [[s - rc, s - rc], [-(s - rc), s - rc], [-(s - rc), -(s - rc)], [s - rc, -(s - rc)]];
    pts = [];
    corners.forEach(([cx, cz], k) => { for (let i = 0; i <= per; i++) { const a = (k * Math.PI) / 2 + (i / per) * (Math.PI / 2); pts.push([cx + rc * Math.cos(a), cz + rc * Math.sin(a)]); } });
    pts = pts.map(([x, z]) => [x * Math.cos(rot) - z * Math.sin(rot), x * Math.sin(rot) + z * Math.cos(rot)]);
  } else { // heart, point towards the viewer
    const sc = (r * 1.08) / 16;
    pts = Array.from({ length: n }, (_, i) => { const t = (i / n) * Math.PI * 2; const x = 16 * Math.sin(t) ** 3; const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t); return [x * sc, -(y + 2.6) * sc]; });
  }
  let area = 0; for (let i = 0; i < pts.length; i++) { const [x1, z1] = pts[i], [x2, z2] = pts[(i + 1) % pts.length]; area += x1 * z2 - x2 * z1; }
  return area < 0 ? pts.reverse() : pts;
}
const proj = (cx, y, [x, z]) => [cx + x, y + z * TILT];
const polyPath = (pts) => `M${pts.map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L')}Z`;
function frontZ(pts, x) { let best = -Infinity; for (const [px, pz] of pts) if (Math.abs(px - x) < 6 && pz > best) best = pz; return best === -Infinity ? 0 : best; }
function inside(pts, x, z) { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, zi] = pts[i], [xj, zj] = pts[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; }

// ---------------------------------------------------------------------------------------------------------
export function layout(c) {
  const sizes = tierSizes(c);
  const heights = sizes.length * TIER_H;
  const bottomR = sizes[0] * K;
  const boardY = Math.round(VIEW.h / 2 + heights / 2 + 18);
  const tiers = sizes.map((inches, i) => ({ inches, r: inches * K, bottom: boardY - i * TIER_H, top: boardY - (i + 1) * TIER_H }));
  return { cx: VIEW.w / 2, boardY, boardR: bottomR * (c.shape === 'square' ? 1.3 : 1.12) + 22, tiers };
}

function tierSvg(c, t, i, cx, id) {
  const base = colourOf(c);
  const sponge = lookup.SPONGES.find((o) => o.id === c.sponge).colour;
  const fillingC = lookup.FILLINGS.find((o) => o.id === c.filling).colour;
  const glossy = c.finish === 'ganache' ? 0.55 : c.finish === 'fondant' ? 0.22 : 0.08;
  const sideBase = c.finish === 'naked' ? sponge : base;
  const pts = outline(c.shape, t.r);
  // shade each front-facing facet by its normal, then paint the whole side as ONE path with a horizontal gradient
  // whose stops are those facet colours (no seams between facets, flat faces stay flat on a square)
  const facets = [], frontV = new Map();
  const hx = norm([LIGHT[0], LIGHT[1] + 1]);
  for (let k = 0; k < pts.length; k++) {
    const p = pts[k], q = pts[(k + 1) % pts.length];
    const [nx, nz] = norm([q[1] - p[1], -(q[0] - p[0])]);
    if (nz <= 0.001) continue; // faces away from the camera
    const lam = Math.max(0, nx * LIGHT[0] + nz * LIGHT[1]);
    let col = mix(shade(sideBase, -0.55), sideBase, Math.min(1, 0.52 + 0.4 * lam + 0.08 * nz));
    col = mix(col, '#ffffff', Math.max(0, nx * hx[0] + nz * hx[1]) ** 24 * glossy);
    facets.push({ x: (p[0] + q[0]) / 2, col, k });
    frontV.set(k, p); frontV.set((k + 1) % pts.length, q);
  }
  const front = [...frontV.entries()].sort((u, v) => u[1][0] - v[1][0] || u[0] - v[0]).map(([, p]) => p);
  facets.sort((u, v) => u.x - v.x || u.k - v.k);
  const x0 = front[0][0], x1 = front[front.length - 1][0];
  const gid = `${id}-side${i}`;
  let s = `<defs><linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="${f1(cx + x0)}" y1="0" x2="${f1(cx + x1)}" y2="0">${facets.map((f) => `<stop offset="${((f.x - x0) / (x1 - x0)).toFixed(4)}" stop-color="${f.col}"/>`).join('')}</linearGradient>`;
  if (c.finish === 'naked') s += `<linearGradient id="${gid}-coat" gradientUnits="userSpaceOnUse" x1="0" y1="${f1(t.top)}" x2="0" y2="${f1(t.top + TIER_H + t.r * TILT)}">${[[0, 0.92], [0.1, 0.6], [0.28, 0.3], [0.45, 0.46], [0.62, 0.26], [0.8, 0.5], [1, 0.85]].map(([o, a]) => `<stop offset="${o}" stop-color="#f7efe3" stop-opacity="${a}"/>`).join('')}</linearGradient>`;
  s += '</defs>';
  const chain = (dy) => front.map((p) => proj(cx, t.top + dy, p));
  const sidePath = polyPath([...chain(0), ...chain(TIER_H).reverse()]);
  const band = (dy) => `M${chain(dy).map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L')}`;
  s += `<g class="tier" data-part="cake"><path d="${sidePath}" fill="url(#${gid})"/>`;
  if (c.finish === 'naked') {
    for (const fr of [0.36, 0.68]) s += `<path d="${band(TIER_H * fr)}" fill="none" stroke="${fillingC}" stroke-width="6" stroke-linecap="round" opacity=".9"/>`;
    s += `<path d="${sidePath}" fill="url(#${gid}-coat)"/>`;
  } else if (c.finish === 'buttercream') {
    for (const fr of [0.3, 0.66]) s += `<path d="${band(TIER_H * fr)}" fill="none" stroke="#ffffff" stroke-opacity=".1" stroke-width="1.2"/>`;
  }
  const topCol = c.finish === 'naked' ? '#f7efe3' : shade(base, 0.07);
  s += `<path d="${polyPath(pts.map((p) => proj(cx, t.top, p)))}" fill="${topCol}" stroke="${shade(topCol, -0.1)}" stroke-width="1"/>`;
  s += `<path d="${band(0)}" fill="none" stroke="#ffffff" stroke-opacity="${c.finish === 'ganache' ? 0.35 : 0.3}" stroke-width="2"/>`;
  s += '</g>';
  return { svg: s, pts, front };
}

function dripSvg(c, t, cx, seed) {
  const colour = DRIPS.find((d) => d.id === c.drip).colour;
  const pts = outline(c.shape, t.r, 360);
  const front = pts.map((p, k) => { const q = pts[(k + 1) % pts.length]; const [, nz] = norm([q[1] - p[1], -(q[0] - p[0])]); return { p, nz }; }).filter((o) => o.nz > 0.02).map((o) => o.p).sort((u, v) => u[0] - v[0]);
  const r = rng(seed);
  const drips = []; for (let x = front[0][0] + 8; x < front[front.length - 1][0] - 6; x += 16 + r() * 16) drips.push({ x, len: 10 + r() * 34, w: 5 + r() * 4 });
  const prof = (x) => 7 + drips.reduce((a, d) => { const u = (x - d.x) / d.w; return a + (Math.abs(u) < 1 ? d.len * Math.sqrt(1 - u * u) : 0); }, 0);
  const topEdge = front.map((p) => proj(cx, t.top - 1, p));
  const bottom = [...front].reverse().map((p) => { const [x, y] = proj(cx, t.top, p); return [x, y + prof(p[0])]; });
  let s = `<g data-part="drip">`;
  s += `<path d="${polyPath(outline(c.shape, t.r).map((p) => proj(cx, t.top, p)))}" fill="${shade(colour, 0.06)}"/>`;
  s += `<path d="${polyPath([...topEdge, ...bottom])}" fill="${colour}"/>`;
  s += `<path d="M${topEdge.map(([x, y]) => `${f1(x)} ${f1(y + 3)}`).join('L')}" fill="none" stroke="#ffffff" stroke-opacity=".35" stroke-width="2"/>`;
  for (const d of drips) { const z = frontZ(pts, d.x); const [x, y] = proj(cx, t.top, [d.x, z]); s += `<ellipse cx="${f1(x - 1.5)}" cy="${f1(y + prof(d.x) - 5)}" rx="1.6" ry="2.6" fill="#ffffff" opacity=".45"/>`; }
  return `${s}</g>`;
}

function bloom(x, y, size, col, rot) {
  let s = '';
  for (let k = 0; k < 5; k++) { const a = rot + k * 72; s += `<ellipse cx="${f1(x)}" cy="${f1(y - size * 0.42)}" rx="${f1(size * 0.34)}" ry="${f1(size * 0.5)}" fill="${col}" stroke="${shade(col, -0.18)}" stroke-width=".6" transform="rotate(${f1(a)} ${f1(x)} ${f1(y)})"/>`; }
  return `${s}<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(size * 0.22)}" fill="#e7b949"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(size * 0.1)}" fill="#b07a26"/>`;
}
export function flowerAnchor(c, t, pts, cx) {
  const x = c.flowerPos * t.r * 0.72;
  const z = frontZ(pts, x) * 0.62;
  const [X, Y] = proj(cx, t.top, [x, z]);
  return { x: X, y: Y - 4 };
}
function flowersSvg(c, t, pts, cx, seed) {
  const { x, y } = flowerAnchor(c, t, pts, cx);
  const r = rng(seed);
  const cols = ['#f6d3d6', '#fff5ec', '#f1abb1', '#fbe0c4', '#e798a6'];
  let s = `<g data-part="flowers" class="draggable">`;
  s += `<ellipse cx="${f1(x)}" cy="${f1(y + 8)}" rx="44" ry="15" fill="transparent"/>`; // generous hit area
  const leaves = [[-34, 4, -30], [30, 6, 25], [-14, 14, -70], [18, 15, 60], [0, -14, 5]];
  for (const [dx, dy, a] of leaves) s += `<ellipse cx="${f1(x + dx)}" cy="${f1(y + dy)}" rx="13" ry="5.5" fill="${r() > 0.5 ? '#7c9a6a' : '#94ad80'}" transform="rotate(${a} ${f1(x + dx)} ${f1(y + dy)})"/>`;
  const blooms = [[-20, 2, 17], [2, -7, 21], [21, 3, 16], [-8, 11, 15], [12, 12, 14], [30, 12, 11]];
  for (const [dx, dy, sz] of blooms) s += bloom(x + dx, y + dy, sz, cols[Math.floor(r() * cols.length)], r() * 70);
  // a short cascade down the front of the tier
  s += bloom(x + 6, y + 36, 11, cols[1], 20) + bloom(x - 3, y + 58, 9, cols[3], 50);
  s += `<ellipse cx="${f1(x + 14)}" cy="${f1(y + 47)}" rx="9" ry="4" fill="#94ad80" transform="rotate(40 ${f1(x + 14)} ${f1(y + 47)})"/>`;
  return `${s}</g>`;
}
function goldSvg(c, t, pts, cx, seed) {
  const r = rng(seed); let s = `<g data-part="goldleaf">`;
  for (let k = 0; k < 16; k++) {
    const a = -1.25 + (k / 15) * 2.5 + (r() - 0.5) * 0.2;
    const x = Math.sin(a) * t.r * 0.97; const z = frontZ(pts, x);
    const [X, Y0] = proj(cx, t.top, [x, z]); const Y = Y0 + TIER_H * (0.08 + r() ** 1.6 * 0.6);
    const rad = 2 + r() * 4.5; const poly = Array.from({ length: 6 }, (_, i) => { const an = (i / 6) * Math.PI * 2 + r() * 0.7; const rr = rad * (0.5 + r() * 0.7); return [X + Math.cos(an) * rr * Math.max(0.35, Math.cos(a)), Y + Math.sin(an) * rr]; });
    s += `<path d="${polyPath(poly)}" fill="${r() > 0.4 ? '#d4a73d' : '#e6c068'}" stroke="#f5dd92" stroke-width=".6" opacity=".95"/>`;
  }
  return `${s}</g>`;
}
function sprinklesSvg(c, t, pts, cx, seed) {
  const r = rng(seed); const cols = ['#e76f8e', '#f2c14e', '#6cb4e4', '#8fcb9b', '#b48ee0', '#ffffff'];
  let s = `<g data-part="sprinkles">`, n = 0, guard = 0;
  while (n < 44 && guard++ < 800) {
    const x = (r() * 2 - 1) * t.r, z = (r() * 2 - 1) * t.r;
    if (!inside(pts, x * 1.08, z * 1.08)) continue;
    const [X, Y] = proj(cx, t.top, [x, z]);
    s += `<rect x="${f1(X - 3)}" y="${f1(Y - 1)}" width="6" height="2.2" rx="1.1" fill="${cols[n % cols.length]}" transform="rotate(${Math.round(r() * 180)} ${f1(X)} ${f1(Y)})"/>`; n++;
  }
  return `${s}</g>`;
}
function macaronsSvg(c, t, cx) {
  const cols = ['#f4b6c2', '#c9e4ca', '#fbe7a1', '#cdb4db', '#a9d6e5'];
  const items = cols.map((col, k) => { const a = Math.PI * (1.12 + (k / 4) * 0.76); const x = Math.cos(a) * t.r * 0.66, z = Math.sin(a) * t.r * 0.66; const [X, Y] = proj(cx, t.top, [x, z]); return { X, Y, col, k }; }).sort((u, v) => Math.round(u.Y) - Math.round(v.Y) || u.k - v.k);
  let s = `<g data-part="macarons">`;
  for (const { X, Y, col } of items) s += `<ellipse cx="${f1(X)}" cy="${f1(Y - 2)}" rx="14" ry="7" fill="${shade(col, -0.1)}"/><rect x="${f1(X - 12)}" y="${f1(Y - 10)}" width="24" height="4" rx="2" fill="#fbf3e4"/><ellipse cx="${f1(X)}" cy="${f1(Y - 13)}" rx="14" ry="7" fill="${col}"/><ellipse cx="${f1(X - 4)}" cy="${f1(Y - 15)}" rx="5" ry="2" fill="#ffffff" opacity=".45"/>`;
  return `${s}</g>`;
}
function messageSvg(c, t, cx, topCol) {
  if (c.message === 'none' || !c.text.trim()) return '';
  const txt = esc(c.text.trim());
  const len = Math.max(3, c.text.trim().length);
  if (c.message === 'piped') {
    // on the back half of the top face, so front-rim decorations never cover it; sized to the tier's width there
    const ink = luminance(topCol) > 0.35 ? '#5b3a2e' : '#fff6ea';
    const size = Math.min(28, (1.15 * t.r) / (0.56 * len));
    const y = t.top - t.r * TILT * 0.3;
    return `<g data-part="message"><text x="${cx}" y="0" text-anchor="middle" dominant-baseline="middle" transform="translate(0 ${f1(y)}) scale(1 .62)" font-family="Fraunces, Georgia, serif" font-style="italic" font-weight="600" font-size="${f1(size)}" fill="${ink}">${txt}</text></g>`;
  }
  // a plaque stands just behind the centre; never wider than the tier it stands on
  const w = Math.min(Math.max(len * 8.4 + 26, 70), t.r * 1.7), h = 28;
  const size = Math.min(15, (w - 14) / (0.5 * len));
  const x = cx - w / 2;
  const baseY = t.top - t.r * TILT * 0.15;
  return `<g data-part="message"><rect x="${f1(x + 2)}" y="${f1(baseY - h + 3)}" width="${f1(w)}" height="${h}" rx="6" fill="#000" opacity=".12"/><rect x="${f1(x)}" y="${f1(baseY - h)}" width="${f1(w)}" height="${h}" rx="6" fill="#fbf5ea" stroke="#dcc9ad"/><text x="${f1(x + w / 2)}" y="${f1(baseY - h / 2 + 1)}" text-anchor="middle" dominant-baseline="middle" font-family="Fraunces, Georgia, serif" font-style="italic" font-weight="600" font-size="${f1(size)}" fill="#5b3a2e">${txt}</text></g>`;
}

// A dessert fork on the table: the scale cue, since the camera frames each size (people judge size from images).
const FORK_IN = 6.5;
function forkSvg(L) {
  const len = FORK_IN * K * 2 * 0.97; const x = L.cx + L.boardR * 0.42, y = L.boardY + L.boardR * TILT + 34;
  const head = len * 0.3, handle = len - head;
  return `<g data-part="scale" transform="translate(${f1(x)} ${f1(y)}) rotate(-7)"><ellipse cx="${f1(len / 2)}" cy="8" rx="${f1(len / 2)}" ry="4" fill="#3a2418" opacity=".12"/>`
    + `<path d="M0 -3.5 Q${f1(handle * 0.5)} -5 ${f1(handle)} -2 L${f1(handle)} 2 Q${f1(handle * 0.5)} 5 0 3.5 Q-4 0 0 -3.5Z" fill="#aeb4ba"/>`
    + `<path d="M${f1(handle)} -2 L${f1(handle + head * 0.28)} -7 L${f1(len)} -7 L${f1(len)} -4.6 L${f1(handle + head * 0.36)} -4.6 L${f1(handle + head * 0.36)} -1.2 L${f1(len)} -1.2 L${f1(len)} 1.2 L${f1(handle + head * 0.36)} 1.2 L${f1(handle + head * 0.36)} 4.6 L${f1(len)} 4.6 L${f1(len)} 7 L${f1(handle + head * 0.28)} 7 L${f1(handle)} 2Z" fill="#c3c8cd"/>`
    + `<path d="M4 -1.8 Q${f1(handle * 0.5)} -3.2 ${f1(handle - 2)} -1" fill="none" stroke="#eef1f3" stroke-width="1.2"/></g>`;
}
// The camera frames the cake's geometry (people, tiers, shape) and nothing else: a decoration, a colour or a drag
// never moves the view, and the fork keeps the size honest.
export function fitViewBox(c, pad = 16) {
  const L = layout(c); const topT = L.tiers[L.tiers.length - 1];
  const forkEnd = L.cx + L.boardR * 0.42 + FORK_IN * K * 2;
  const halfW = Math.max(L.boardR + 12, forkEnd - L.cx) + pad;
  const y0 = topT.top - topT.r * TILT - 70 - pad, y1 = L.boardY + L.boardR * TILT + 48 + pad;
  return [L.cx - halfW, y0, halfW * 2, y1 - y0].map((v) => Math.round(v)).join(' ');
}

// Only the flowers, for a drag in progress: a gesture repaints the part that moves, not the whole cake.
export function renderFlowers(c) {
  const L = layout(c); const top = L.tiers[L.tiers.length - 1];
  const seed = top.inches * 97 + c.tiers * 13 + (c.shape === 'heart' ? 5 : c.shape === 'square' ? 3 : 1);
  return flowersSvg(c, top, outline(c.shape, top.r), L.cx, seed + 3);
}

// ---------------------------------------------------------------------------------------------------------
export function renderCake(c, id = 'cake') {
  const L = layout(c);
  const { cx, boardY, boardR } = L;
  let s = `<defs><filter id="${id}-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10"/></filter></defs>`;
  s += `<ellipse cx="${cx}" cy="${boardY + 18}" rx="${f1(boardR + 30)}" ry="${f1((boardR + 30) * TILT * 0.8)}" fill="#3a2418" opacity=".16" filter="url(#${id}-soft)"/>`;
  s += `<g data-part="board"><ellipse cx="${cx}" cy="${boardY + 8}" rx="${f1(boardR)}" ry="${f1(boardR * TILT)}" fill="#cfc6b8"/><rect x="${f1(cx - boardR)}" y="${boardY}" width="${f1(boardR * 2)}" height="8" fill="#cfc6b8"/><ellipse cx="${cx}" cy="${boardY}" rx="${f1(boardR)}" ry="${f1(boardR * TILT)}" fill="#ece6dc" stroke="#d7cfc2"/></g>`;
  s += forkSvg(L);
  const bottomPts = outline(c.shape, L.tiers[0].r);
  s += `<path d="${polyPath(bottomPts.map((p) => proj(cx, boardY + 2, p)))}" fill="#3a2418" opacity=".22" filter="url(#${id}-soft)"/>`;
  let last = null;
  L.tiers.forEach((t, i) => { const out = tierSvg(c, t, i, cx, id); s += out.svg; last = { t, pts: out.pts }; });
  const top = last.t; const seed = top.inches * 97 + c.tiers * 13 + (c.shape === 'heart' ? 5 : c.shape === 'square' ? 3 : 1);
  const topCol = c.decorations.includes('drip') ? DRIPS.find((d) => d.id === c.drip).colour : c.finish === 'naked' ? '#f7efe3' : colourOf(c);
  if (c.decorations.includes('drip')) s += dripSvg(c, top, cx, seed);
  if (c.decorations.includes('goldleaf')) s += goldSvg(c, top, last.pts, cx, seed + 1);
  if (c.decorations.includes('sprinkles')) s += sprinklesSvg(c, top, last.pts, cx, seed + 2);
  if (c.decorations.includes('macarons')) s += macaronsSvg(c, top, cx);
  s += messageSvg(c, top, cx, topCol);
  if (c.decorations.includes('flowers')) s += flowersSvg(c, top, last.pts, cx, seed + 3);
  return s;
}

// The cut slice: sponge and filling are invisible from outside, so the preview shows them here.
export function renderSlice(c) {
  const sponge = lookup.SPONGES.find((o) => o.id === c.sponge).colour;
  const fill = lookup.FILLINGS.find((o) => o.id === c.filling).colour;
  const coat = c.finish === 'naked' ? '#f7efe3' : colourOf(c);
  const coatW = c.finish === 'naked' ? 2 : c.finish === 'fondant' ? 4 : 6;
  let s = `<path d="M10 22 Q10 14 18 14 L112 14 L112 90 L10 90 Z" fill="${coat}" stroke="${shade(coat, -0.15)}"/>`;
  const layers = [[20, 18, sponge], [38, 6, fill], [44, 18, sponge], [62, 6, fill], [68, 18, sponge]];
  const r = rng(7);
  for (const [y, h, col] of layers) {
    s += `<rect x="${10}" y="${y}" width="${112 - 10 - coatW}" height="${h}" fill="${col}"/>`;
    if (col === sponge) for (let k = 0; k < 9; k++) s += `<circle cx="${f1(14 + r() * 88)}" cy="${f1(y + 3 + r() * (h - 6))}" r="${f1(0.8 + r() * 1.1)}" fill="${shade(sponge, -0.25)}" opacity=".55"/>`;
  }
  return `${s}<rect x="10" y="86" width="102" height="4" fill="${shade(sponge, -0.3)}" opacity=".35"/>`;
}
