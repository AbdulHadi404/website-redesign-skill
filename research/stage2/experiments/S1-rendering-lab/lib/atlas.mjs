// Generates the scene's own art (no third-party assets): one sprite atlas (PNG + TexturePacker-style
// JSON, which PixiJS and Phaser both load natively) and one background image, from SVG via sharp.
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const CELL = 48;          // decoration frame size (drawn 1:1)
export const RING = 64;          // selection ring frame
export const SPARK = 16;         // particle frame
export const FRAMES = ['cherry', 'strawberry', 'star', 'heart', 'candle', 'flower', 'macaron', 'leaf'];

const art = {
  cherry: `<path d="M24 8 C26 16 30 20 34 24" stroke="#2f7d32" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M24 8 C30 4 36 6 38 10 C32 12 28 11 24 8Z" fill="#43a047"/>
    <circle cx="22" cy="32" r="12" fill="#c62828"/><circle cx="18" cy="27" r="4" fill="#ef9a9a"/>`,
  strawberry: `<path d="M24 44 C12 36 8 26 10 18 C14 12 34 12 38 18 C40 26 36 36 24 44Z" fill="#e53935"/>
    <path d="M14 16 L18 8 L22 14 L24 6 L27 14 L31 8 L34 16 Z" fill="#43a047"/>
    <g fill="#ffe082"><circle cx="18" cy="22" r="1.4"/><circle cx="26" cy="21" r="1.4"/><circle cx="32" cy="24" r="1.4"/><circle cx="21" cy="29" r="1.4"/><circle cx="28" cy="30" r="1.4"/><circle cx="24" cy="37" r="1.4"/></g>`,
  star: `<path d="M24 5 L29.4 17.6 L43 18.6 L32.6 27.4 L35.8 40.8 L24 33.6 L12.2 40.8 L15.4 27.4 L5 18.6 L18.6 17.6Z" fill="#fbc02d" stroke="#f57f17" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="20" cy="20" r="3" fill="#fff59d"/>`,
  heart: `<path d="M24 42 C10 32 6 24 6 17 C6 11 11 7 16 7 C20 7 23 10 24 13 C25 10 28 7 32 7 C37 7 42 11 42 17 C42 24 38 32 24 42Z" fill="#ec407a"/>
    <ellipse cx="15" cy="16" rx="4" ry="3" fill="#f8bbd0"/>`,
  candle: `<rect x="18" y="16" width="12" height="28" rx="2" fill="#90caf9"/>
    <path d="M18 22 L30 18 M18 30 L30 26 M18 38 L30 34" stroke="#fff" stroke-width="3"/>
    <path d="M24 3 C28 8 29 12 24 15 C19 12 20 8 24 3Z" fill="#ff9800"/><path d="M24 7 C26 10 26 12 24 14 C22 12 22 10 24 7Z" fill="#ffeb3b"/>`,
  flower: `<g fill="#fff" stroke="#f48fb1" stroke-width="1.5"><circle cx="24" cy="12" r="8"/><circle cx="35.4" cy="20.3" r="8"/><circle cx="31" cy="33.7" r="8"/><circle cx="17" cy="33.7" r="8"/><circle cx="12.6" cy="20.3" r="8"/></g>
    <circle cx="24" cy="24" r="6" fill="#fdd835"/>`,
  macaron: `<rect x="7" y="12" width="34" height="11" rx="5.5" fill="#ce93d8"/><rect x="8" y="22" width="32" height="5" rx="2.5" fill="#fff8e1"/>
    <rect x="7" y="26" width="34" height="11" rx="5.5" fill="#ba68c8"/><rect x="12" y="14" width="10" height="3" rx="1.5" fill="#f3e5f5"/>`,
  leaf: `<path d="M8 40 C8 20 20 8 42 8 C42 30 30 40 8 40Z" fill="#66bb6a"/><path d="M8 40 C18 30 26 22 36 14" stroke="#2e7d32" stroke-width="2" fill="none"/>`,
};

export function layout() {
  const frames = {};
  FRAMES.forEach((f, i) => { frames[f] = { x: 2 + i * 52, y: 2, w: CELL, h: CELL }; });
  frames.ring = { x: 418, y: 2, w: RING, h: RING };
  frames.spark = { x: 486, y: 2, w: SPARK, h: SPARK };
  return { frames, w: 512, h: 72 };
}

export async function buildAssets(outDir) {
  await mkdir(outDir, { recursive: true });
  const { frames, w, h } = layout();
  const parts = FRAMES.map((f) => `<g transform="translate(${frames[f].x} ${frames[f].y})">${art[f]}</g>`);
  const r = frames.ring;
  parts.push(`<g transform="translate(${r.x} ${r.y})"><circle cx="32" cy="32" r="28" fill="none" stroke="#1a237e" stroke-width="4"/><circle cx="32" cy="32" r="28" fill="none" stroke="#fff" stroke-width="1.5" stroke-dasharray="6 5"/></g>`);
  const s = frames.spark;
  parts.push(`<g transform="translate(${s.x} ${s.y})"><path d="M8 0 L10 6 L16 8 L10 10 L8 16 L6 10 L0 8 L6 6Z" fill="#ffd54f"/><circle cx="8" cy="8" r="2" fill="#fff"/></g>`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${parts.join('')}</svg>`;
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(path.join(outDir, 'atlas.png'));

  const json = {
    frames: Object.fromEntries(Object.entries(frames).map(([k, f]) => [k, {
      frame: { x: f.x, y: f.y, w: f.w, h: f.h }, rotated: false, trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: f.w, h: f.h }, sourceSize: { w: f.w, h: f.h },
    }])),
    meta: { app: 'S1-rendering-lab/lib/atlas.mjs', image: 'atlas.png', format: 'RGBA8888', size: { w, h }, scale: '1' },
  };
  await writeFile(path.join(outDir, 'atlas.json'), JSON.stringify(json));

  // Background: a table and a round cake seen from above-front; the decorating area is the cake top.
  const bg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
    <defs>
      <linearGradient id="t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3e3cf"/><stop offset="1" stop-color="#e2c9a8"/></linearGradient>
      <linearGradient id="side" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f1c7b5"/><stop offset=".5" stop-color="#fbe3d6"/><stop offset="1" stop-color="#eab8a4"/></linearGradient>
      <radialGradient id="top" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="#fffaf3"/><stop offset="1" stop-color="#fbe9dc"/></radialGradient>
    </defs>
    <rect width="800" height="600" fill="url(#t)"/>
    <ellipse cx="400" cy="548" rx="330" ry="40" fill="#cfd8dc"/><ellipse cx="400" cy="540" rx="330" ry="40" fill="#eceff1"/>
    <path d="M90 330 L90 500 A310 60 0 0 0 710 500 L710 330 Z" fill="url(#side)"/>
    <path d="M90 470 A310 60 0 0 0 710 470" stroke="#f8bbd0" stroke-width="10" fill="none"/>
    <ellipse cx="400" cy="330" rx="310" ry="170" fill="url(#top)" stroke="#f3cdbd" stroke-width="3"/>
  </svg>`;
  await sharp(Buffer.from(bg)).png({ compressionLevel: 9 }).toFile(path.join(outDir, 'bg.png'));
  return { frames, w, h };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = process.argv[2] || 'dist/assets';
  await buildAssets(out);
  console.log('assets written to', out);
}
