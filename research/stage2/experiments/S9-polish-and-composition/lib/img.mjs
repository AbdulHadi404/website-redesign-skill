// Image helpers: PNG IO, crops, and three difference measures between two captures of the same page.
//   pm     pixelmatch (threshold 0.1, anti-aliasing ignored), the measure compare.mjs prints: % of pixels
//   jnd    CIEDE2000 > 2.3 (about one just-noticeable difference) at full resolution: % of pixels
//   thumb  CIEDE2000 > 2.3 after a 4x box downscale (a thumbnail, roughly what survives a glance): % of pixels
import { readFile, writeFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

export const readPng = async (f) => PNG.sync.read(await readFile(f));
export const writePng = async (f, png) => writeFile(f, PNG.sync.write(png));

export function crop(img, x, y, w, h) {
  x = Math.max(0, Math.round(x)); y = Math.max(0, Math.round(y));
  w = Math.max(1, Math.min(Math.round(w), img.width - x)); h = Math.max(1, Math.min(Math.round(h), img.height - y));
  const o = new PNG({ width: w, height: h });
  PNG.bitblt(img, o, x, y, w, h, 0, 0);
  return o;
}

export function downscale(img, k) {
  const w = Math.floor(img.width / k), h = Math.floor(img.height / k);
  const o = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r = 0, g = 0, b = 0;
    for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) {
      const i = ((y * k + dy) * img.width + (x * k + dx)) * 4;
      r += img.data[i]; g += img.data[i + 1]; b += img.data[i + 2];
    }
    const j = (y * w + x) * 4, n = k * k;
    o.data[j] = r / n; o.data[j + 1] = g / n; o.data[j + 2] = b / n; o.data[j + 3] = 255;
  }
  return o;
}

export function upscale(img, k) {
  const o = new PNG({ width: img.width * k, height: img.height * k });
  for (let y = 0; y < o.height; y++) for (let x = 0; x < o.width; x++) {
    const i = (Math.floor(y / k) * img.width + Math.floor(x / k)) * 4, j = (y * o.width + x) * 4;
    o.data[j] = img.data[i]; o.data[j + 1] = img.data[i + 1]; o.data[j + 2] = img.data[i + 2]; o.data[j + 3] = 255;
  }
  return o;
}

const LIN = new Float64Array(256).map((_, v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
function lab(r, g, b) {
  const R = LIN[r | 0], G = LIN[g | 0], B = LIN[b | 0];
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const X = f((0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / 0.95047);
  const Y = f(0.2126729 * R + 0.7151522 * G + 0.072175 * B);
  const Z = f((0.0193339 * R + 0.119192 * G + 0.9503041 * B) / 1.08883);
  return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
}
const RAD = Math.PI / 180;
export function de2000([L1, a1, b1], [L2, a2, b2]) {
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cb = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)));
  const a1p = a1 * (1 + G), a2p = a2 * (1 + G);
  const C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
  const h = (b, a) => { if (!a && !b) return 0; const t = Math.atan2(b, a) / RAD; return t < 0 ? t + 360 : t; };
  const h1p = h(b1, a1p), h2p = h(b2, a2p);
  const dLp = L2 - L1, dCp = C2p - C1p;
  let dhp = 0;
  if (C1p * C2p) { dhp = h2p - h1p; if (dhp > 180) dhp -= 360; else if (dhp < -180) dhp += 360; }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * RAD);
  const Lbp = (L1 + L2) / 2, Cbp = (C1p + C2p) / 2;
  let hbp = h1p + h2p;
  if (C1p * C2p) { hbp = Math.abs(h1p - h2p) > 180 ? (h1p + h2p + (h1p + h2p < 360 ? 360 : -360)) / 2 : (h1p + h2p) / 2; }
  const T = 1 - 0.17 * Math.cos((hbp - 30) * RAD) + 0.24 * Math.cos(2 * hbp * RAD) + 0.32 * Math.cos((3 * hbp + 6) * RAD) - 0.2 * Math.cos((4 * hbp - 63) * RAD);
  const dTh = 30 * Math.exp(-(((hbp - 275) / 25) ** 2));
  const Rc = 2 * Math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25 ** 7));
  const Sl = 1 + (0.015 * (Lbp - 50) ** 2) / Math.sqrt(20 + (Lbp - 50) ** 2), Sc = 1 + 0.045 * Cbp, Sh = 1 + 0.015 * Cbp * T;
  const Rt = -Math.sin(2 * dTh * RAD) * Rc;
  return Math.sqrt((dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh));
}

function jndShare(A, B, jnd = 2.3) {
  let n = 0, sum = 0, changed = 0;
  const cache = new Map();
  const L = (d, i) => { const k = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2]; let v = cache.get(k); if (!v) { v = lab(d[i], d[i + 1], d[i + 2]); if (cache.size < 2e5) cache.set(k, v); } return v; };
  for (let i = 0; i < A.data.length; i += 4) {
    if (A.data[i] === B.data[i] && A.data[i + 1] === B.data[i + 1] && A.data[i + 2] === B.data[i + 2]) continue;
    changed++;
    const d = de2000(L(A.data, i), L(B.data, i));
    if (d > jnd) { n++; sum += d; }
  }
  const px = A.width * A.height;
  return { jnd: (n / px) * 100, any: (changed / px) * 100, meanDE: n ? sum / n : 0 };
}

/** Compare two images over their common area. Returns percentages and the bounding box of pixelmatch changes. */
export function measure(A0, B0, { diffOut } = {}) {
  const w = Math.min(A0.width, B0.width), h = Math.min(A0.height, B0.height);
  const A = crop(A0, 0, 0, w, h), B = crop(B0, 0, 0, w, h);
  const out = new PNG({ width: w, height: h });
  const n = pixelmatch(A.data, B.data, out.data, w, h, { threshold: 0.1 });
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (out.data[i] === 255 && out.data[i + 1] === 0 && out.data[i + 2] === 0) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  const full = jndShare(A, B);
  const k = 4;
  const thumb = jndShare(downscale(A, k), downscale(B, k));
  return {
    size: [w, h], sizeDiffers: A0.width !== B0.width || A0.height !== B0.height ? [[A0.width, A0.height], [B0.width, B0.height]] : undefined,
    pm: +((n / (w * h)) * 100).toFixed(4), any: +full.any.toFixed(4), jnd: +full.jnd.toFixed(4), meanDE: +full.meanDE.toFixed(2), thumb: +thumb.jnd.toFixed(4),
    bbox: x1 >= 0 ? [x0, y0, x1 - x0 + 1, y1 - y0 + 1] : null,
    diff: diffOut ? out : undefined,
  };
}

/** The densest changed region: a w x h window placed on the grid cell with the most pixelmatch changes. */
export function hotWindow(diff, w, h) {
  if (!diff) return null;
  const step = 16;
  const gw = Math.ceil(diff.width / step), gh = Math.ceil(diff.height / step);
  const cells = new Float64Array(gw * gh);
  for (let y = 0; y < diff.height; y++) for (let x = 0; x < diff.width; x++) {
    const i = (y * diff.width + x) * 4;
    if (diff.data[i] === 255 && diff.data[i + 1] === 0 && diff.data[i + 2] === 0) cells[Math.floor(y / step) * gw + Math.floor(x / step)]++;
  }
  const cw = Math.ceil(w / step), ch = Math.ceil(h / step);
  let best = -1, bx = 0, by = 0;
  for (let y = 0; y + ch <= gh || y === 0; y++) {
    for (let x = 0; x + cw <= gw || x === 0; x++) {
      let s = 0;
      for (let yy = y; yy < Math.min(gh, y + ch); yy++) for (let xx = x; xx < Math.min(gw, x + cw); xx++) s += cells[yy * gw + xx];
      if (s > best) { best = s; bx = x; by = y; }
      if (x + cw > gw) break;
    }
    if (y + ch > gh) break;
  }
  return best > 0 ? [Math.min(bx * step, Math.max(0, diff.width - w)), Math.min(by * step, Math.max(0, diff.height - h)), w, h] : null;
}

/** PNG -> JPEG through the browser (no native image dependency). `page` is a Playwright page. */
export async function toJpeg(page, png, dest, quality = 0.82, scale = 1) {
  const b64 = PNG.sync.write(png).toString('base64');
  const out = await page.evaluate(async ([b64, q, s]) => {
    const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
    const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', q).split(',')[1];
  }, [b64, quality, scale]);
  await writeFile(dest, Buffer.from(out, 'base64'));
}
