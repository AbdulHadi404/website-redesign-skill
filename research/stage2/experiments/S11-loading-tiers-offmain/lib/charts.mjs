// Renders two small result charts into shots/ (JPEG) from results/*.json, so the report has pictures that carry no
// third-party imagery: (1) how much of the final hero is visible over time per encoding on slow 3G and slow 4G;
// (2) the loading journeys as timelines (request → usable → full) per variant.
import path from 'node:path';
import sharp from 'sharp';
import { launch, here, readResult } from './common.mjs';

const COLORS = { 'avif-lqip': '#1f7a5c', avif: '#2c6fbb', webp: '#8a5cc2', 'jpeg-progressive': '#c2562c', 'jpeg-baseline': '#777' };

function curvesSvg(curves, net, w = 560, h = 300, tMax) {
  const pad = { l: 44, r: 12, t: 28, b: 34 };
  const X = (t) => pad.l + (t / tMax) * (w - pad.l - pad.r), Y = (v) => pad.t + (1 - Math.max(0, v)) * (h - pad.t - pad.b);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" font-family="system-ui,sans-serif" font-size="12">`;
  s += `<text x="${pad.l}" y="16" font-weight="600">Share of the final hero visible — ${net}, CPU 4×</text>`;
  for (let v = 0; v <= 1; v += 0.25) s += `<line x1="${pad.l}" x2="${w - pad.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="#e3e3e3"/><text x="${pad.l - 6}" y="${Y(v) + 4}" text-anchor="end" fill="#555">${Math.round(v * 100)}%</text>`;
  for (let t = 0; t <= tMax; t += 1000) s += `<text x="${X(t)}" y="${h - 14}" text-anchor="middle" fill="#555">${t / 1000} s</text>`;
  for (const c of curves.filter((c) => c.net === net)) {
    const pts = c.curve.map(([t, v]) => [t, v]);
    let d = '';
    pts.forEach(([t, v], i) => { d += (i ? `L${X(t).toFixed(1)},${Y(pts[i - 1][1]).toFixed(1)}L` : 'M') + `${X(t).toFixed(1)},${Y(v).toFixed(1)}`; });
    s += `<path d="${d}" fill="none" stroke="${COLORS[c.k] || '#000'}" stroke-width="2"/>`;
  }
  let ly = Y(0.42);
  for (const [k, col] of Object.entries(COLORS)) { s += `<rect x="${w - pad.r - 150}" y="${ly}" width="10" height="10" fill="${col}"/><text x="${w - pad.r - 135}" y="${ly + 9}">${k}</text>`; ly += 16; }
  return s + '</svg>';
}

function journeySvg(summary, jname, runs = [], w = 1120, h = 310) {
  const rows = Object.entries(summary).filter(([k]) => k.startsWith(jname + '|'));
  const med = (xs) => { const s = xs.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[s.length >> 1] : null; };
  for (const [k, r] of rows) if (r.warm == null) r.warm = med(runs.filter((x) => `${x.journey}|${x.variant}` === k).map((x) => x.warm));
  const tMax = Math.ceil((Math.max(...rows.map(([, r]) => Math.max(r.ready ?? 0, r.shown ?? 0))) + 2500) / 5000) * 5000;
  const pad = { l: 120, r: 16, t: 30, b: 28 }, rh = (h - pad.t - pad.b) / rows.length;
  const X = (t) => pad.l + (t / tMax) * (w - pad.l - pad.r);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" font-family="system-ui,sans-serif" font-size="12">`;
  s += `<text x="${pad.l}" y="16" font-weight="600">"${jname}" visitor, slow 4G + CPU 4× · thin: prefetched on approach · dark: requested → usable · light: → full detail · red: tap on "Try it live"</text>`;
  for (let t = 0; t <= tMax; t += 5000) s += `<line x1="${X(t)}" x2="${X(t)}" y1="${pad.t}" y2="${h - pad.b}" stroke="#eee"/><text x="${X(t)}" y="${h - 10}" text-anchor="middle" fill="#555">${t / 1000} s</text>`;
  rows.forEach(([k, r], i) => {
    const y = pad.t + i * rh + 4, bh = rh - 8;
    s += `<text x="${pad.l - 8}" y="${y + bh / 2 + 4}" text-anchor="end">${k.split('|')[1]}</text>`;
    if (r.warm != null && r.request != null && r.request > r.warm) s += `<rect x="${X(r.warm)}" y="${y + bh / 2 - 2}" width="${X(r.request) - X(r.warm)}" height="4" fill="#7a9cc6"/>`;
    if (r.request != null && r.usable != null) s += `<rect x="${X(r.request)}" y="${y}" width="${Math.max(1, X(r.usable) - X(r.request))}" height="${bh}" fill="#2c6fbb"/>`;
    if (r.usable != null && r.ready != null && r.ready > r.usable) s += `<rect x="${X(r.usable)}" y="${y}" width="${X(r.ready) - X(r.usable)}" height="${bh}" fill="#a9c6ea"/>`;
    if (r.clickAt != null) s += `<line x1="${X(r.clickAt)}" x2="${X(r.clickAt)}" y1="${y - 2}" y2="${y + bh + 2}" stroke="#c2562c" stroke-width="3"/>`;
    if (r.waitAfterClick != null) s += `<text x="${X(Math.max(r.shown ?? 0, r.clickAt ?? 0)) + 6}" y="${y + bh / 2 + 4}" fill="#222">wait ${(r.waitAfterClick / 1000).toFixed(1)} s</text>`;
  });
  return s + '</svg>';
}

export async function renderCharts() {
  const ph = await readResult('placeholders');
  const lo = await readResult('loading');
  const { browser } = await launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  const shot = async (html, file, width, height) => {
    await page.setViewportSize({ width, height });
    await page.setContent(`<body style="margin:0;background:#fff">${html}</body>`);
    await sharp(await page.screenshot()).jpeg({ quality: 82 }).toFile(path.join(here, 'shots', file));
  };
  const out = [];
  if (ph?.film) {
    const curves = ph.film.filter((f) => f.curve);
    await shot(`<div style="display:flex">${curvesSvg(curves, 'slow4g', 560, 300, 2500)}${curvesSvg(curves, 'slow3g', 560, 300, 7000)}</div>`, 'progressive-images.jpg', 1120, 300);
    out.push('shots/progressive-images.jpg');
  }
  if (lo?.summary) {
    await shot(`${journeySvg(lo.summary, 'quick', lo.runs)}${journeySvg(lo.summary, 'reader', lo.runs)}`, 'loading-journeys.jpg', 1120, 620);
    out.push('shots/loading-journeys.jpg');
  }
  await browser.close();
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(await renderCharts());
