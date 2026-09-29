// Generate the sprite fixtures (all drawn here, so they are ours to commit if needed) and pack them three ways:
//  - 60 individual PNG frames (the naive way)
//  - a hand-made CSS sprite: a uniform 10 x 6 grid, no trimming (what CSS steps() needs)
//  - a packed atlas from free-tex-packer-core (MaxRects, trimmed, JSON hash for PixiJS)
// Each image set is also encoded as PNG8 (palette), lossless WebP, lossy WebP and AVIF, to compare payloads.
// Also: a 16-tile tileset, a 9-slice panel, 4 parallax layers.
import sharp from 'sharp';
import { packAsync } from 'free-tex-packer-core';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';

const FRAMES = 60;
const S = 128;
export const BLEED_VARIANTS = {
  tight: { padding: 0, extrude: 0 },
  pad2: { padding: 2, extrude: 0 },
  extrude1: { padding: 0, extrude: 1 },
  extrude2: { padding: 0, extrude: 2 },
  'extrude2+pad2': { padding: 2, extrude: 2 },
  extrude8: { padding: 0, extrude: 8 },
};

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }

// A bouncing creature: squash and stretch, blinking, leg cycle, shadow. Occupies ~60–75 % of the cell, so trimming matters.
export function creatureSVG(i) {
  const t = i / FRAMES; // 0..1 loop
  const phase = t * Math.PI * 2 * 2; // two hops per loop
  const hop = Math.abs(Math.sin(phase));
  const y = 88 - hop * 34;
  const squash = 1 + (1 - hop) ** 3 * 0.28;
  const rx = 30 * squash, ry = 30 / squash;
  const blink = (i % 30) > 26 ? 0.15 : 1;
  const leg = Math.sin(phase * 2) * 7;
  const hue = 200 + Math.sin(t * Math.PI * 2) * 12;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <defs><radialGradient id="g" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="hsl(${hue} 90% 72%)"/><stop offset="1" stop-color="hsl(${hue + 20} 70% 38%)"/></radialGradient></defs>
  <ellipse cx="64" cy="118" rx="${26 - hop * 10}" ry="${5 - hop * 2}" fill="rgba(0,0,0,${0.35 - hop * 0.2})"/>
  <path d="M${52 + leg} ${y + ry - 4} l-4 ${14 - hop * 6}" stroke="hsl(${hue + 20} 60% 28%)" stroke-width="6" stroke-linecap="round"/>
  <path d="M${76 - leg} ${y + ry - 4} l4 ${14 - hop * 6}" stroke="hsl(${hue + 20} 60% 28%)" stroke-width="6" stroke-linecap="round"/>
  <ellipse cx="64" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#g)" stroke="hsl(${hue + 25} 60% 22%)" stroke-width="3"/>
  <ellipse cx="54" cy="${y - 6}" rx="6" ry="${8 * blink}" fill="#fff"/><ellipse cx="76" cy="${y - 6}" rx="6" ry="${8 * blink}" fill="#fff"/>
  <circle cx="${55 + leg * 0.2}" cy="${y - 5}" r="${3 * blink}" fill="#123"/><circle cx="${77 + leg * 0.2}" cy="${y - 5}" r="${3 * blink}" fill="#123"/>
  <path d="M56 ${y + 10} q8 ${6 + hop * 4} 16 0" stroke="#123" stroke-width="2.5" fill="none" stroke-linecap="round"/>
</svg>`;
}

function tileSVG(k) {
  const r = rng(1000 + k);
  const palettes = [['#5a8f3c', '#6fae4a', '#4a7a30'], ['#8a6a44', '#9c7a52', '#6f5436'], ['#3a78b5', '#4a8bc9', '#2f6aa0'], ['#8c8c8c', '#a0a0a0', '#6e6e6e']];
  const [base, hi, lo] = palettes[k % 4];
  let dots = '';
  for (let d = 0; d < 14; d++) dots += `<rect x="${Math.floor(r() * 30)}" y="${Math.floor(r() * 30)}" width="2" height="2" fill="${r() > 0.5 ? hi : lo}"/>`;
  const edge = k >= 4 ? `<rect x="0" y="0" width="32" height="${4 + (k % 3) * 3}" fill="${lo}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="${base}"/>${dots}${edge}</svg>`;
}

const panelSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96">
 <defs><linearGradient id="p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d3350"/><stop offset="1" stop-color="#1b1f33"/></linearGradient></defs>
 <rect x="2" y="2" width="92" height="92" rx="20" fill="url(#p)" stroke="#e8c26a" stroke-width="4"/>
 <rect x="10" y="10" width="76" height="76" rx="13" fill="none" stroke="#e8c26a" stroke-opacity=".35" stroke-width="2"/>
 <circle cx="16" cy="16" r="4" fill="#e8c26a"/><circle cx="80" cy="16" r="4" fill="#e8c26a"/><circle cx="16" cy="80" r="4" fill="#e8c26a"/><circle cx="80" cy="80" r="4" fill="#e8c26a"/>
</svg>`;

function layerSVG(k) {
  const r = rng(77 + k);
  const W = 1024, H = 256;
  const cols = ['#c9d6ea', '#8fa7c8', '#5c7aa3', '#2e4466'];
  const base = [150, 170, 190, 215][k], amp = [60, 50, 40, 30][k];
  let d = `M0 ${H}`;
  const f1 = 2 + k, f2 = 5 + k * 2, p1 = r() * 6, p2 = r() * 6;
  for (let x = 0; x <= W; x += 8) {
    // periodic in W so the layer tiles seamlessly
    const yy = base - amp * (0.6 * Math.sin((x / W) * Math.PI * 2 * f1 + p1) * 0.5 + 0.4 * Math.sin((x / W) * Math.PI * 2 * f2 + p2) * 0.5 + 0.5);
    d += ` L${x} ${yy.toFixed(1)}`;
  }
  d += ` L${W} ${H} Z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><path d="${d}" fill="${cols[k]}"/></svg>`;
}

async function encodeSet(name, pngBuffers, outDir) {
  // One encoded copy per format; returns total bytes per format.
  const fmts = {
    png: (s) => s.png({ compressionLevel: 9, adaptiveFiltering: true }),
    png8: (s) => s.png({ palette: true, quality: 90, compressionLevel: 9 }),
    webpLossless: (s) => s.webp({ lossless: true, effort: 6 }),
    webp: (s) => s.webp({ quality: 85, alphaQuality: 90, effort: 6 }),
    avif: (s) => s.avif({ quality: 60, effort: 6 }),
  };
  const ext = { png: 'png', png8: 'png', webpLossless: 'webp', webp: 'webp', avif: 'avif' };
  const totals = {};
  for (const [f, enc] of Object.entries(fmts)) {
    const dir = path.join(outDir, `${name}-${f}`);
    await mkdir(dir, { recursive: true });
    let bytes = 0;
    const files = [];
    for (const [i, b] of pngBuffers.entries()) {
      const out = await enc(sharp(b.buffer)).toBuffer();
      const fn = `${b.name}.${ext[f]}`;
      await writeFile(path.join(dir, fn), out);
      bytes += out.length;
      files.push(fn);
    }
    totals[f] = { bytes, files };
  }
  return totals;
}

export async function generate(outDir) {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  const t0 = performance.now();
  // 1. frames
  const frames = [];
  for (let i = 0; i < FRAMES; i++) {
    const buf = await sharp(Buffer.from(creatureSVG(i))).png().toBuffer();
    frames.push({ name: `f${String(i).padStart(2, '0')}`, buffer: buf });
  }
  // 2. hand CSS sprite: uniform grid 10 x 6
  const cols = 10, rows = Math.ceil(FRAMES / cols);
  const grid = await sharp({ create: { width: cols * S, height: rows * S, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(frames.map((f, i) => ({ input: f.buffer, left: (i % cols) * S, top: Math.floor(i / cols) * S }))).png().toBuffer();
  // 3. packed atlas (trimmed, no rotation so Canvas 2D can draw it with one drawImage)
  const packed = await packAsync(frames.map((f) => ({ path: `${f.name}.png`, contents: f.buffer })), {
    textureName: 'atlas', width: 2048, height: 2048, fixedSize: false, powerOfTwo: false, padding: 2, extrude: 0,
    allowRotation: false, detectIdentical: true, allowTrim: true, trimMode: 'trim', removeFileExtension: true,
    prependFolderName: false, exporter: 'JsonHash', packer: 'MaxRectsPacker',
  });
  const atlasPng = packed.find((f) => f.name.endsWith('.png'));
  const atlasJson = JSON.parse(packed.find((f) => f.name.endsWith('.json')).buffer.toString());
  atlasJson.animations = { hop: Object.keys(atlasJson.frames).sort() };
  const packMs = performance.now() - t0;

  const sets = {};
  sets.files = await encodeSet('files', frames, outDir);
  sets.grid = await encodeSet('grid', [{ name: 'grid', buffer: grid }], outDir);
  sets.atlas = await encodeSet('atlas', [{ name: 'atlas', buffer: atlasPng.buffer }], outDir);
  await writeFile(path.join(outDir, 'atlas.json'), JSON.stringify(atlasJson));
  const gm = await sharp(grid).metadata(), am = await sharp(atlasPng.buffer).metadata();

  // 4. tiles, panel, parallax layers
  const tiles = [];
  for (let k = 0; k < 16; k++) tiles.push(await sharp(Buffer.from(tileSVG(k))).png().toBuffer());
  const tileset = await sharp({ create: { width: 128, height: 128, channels: 4, background: '#0000' } })
    .composite(tiles.map((b, k) => ({ input: b, left: (k % 4) * 32, top: Math.floor(k / 4) * 32 }))).png({ compressionLevel: 9 }).toBuffer();
  await writeFile(path.join(outDir, 'tileset.png'), tileset);
  const panel = await sharp(Buffer.from(panelSVG)).png({ compressionLevel: 9 }).toBuffer();
  await writeFile(path.join(outDir, 'panel.png'), panel);
  const layers = [];
  for (let k = 0; k < 4; k++) {
    const b = await sharp(Buffer.from(layerSVG(k))).png({ compressionLevel: 9, palette: true }).toBuffer();
    await writeFile(path.join(outDir, `layer${k}.png`), b);
    layers.push(b.length);
  }
  // 5. bleed test atlases: a green tile (t00) in the middle of a 3 x 3 block of magenta tiles, packed with different
  //    transparent padding and edge extrusion. Laid out by hand (same meaning as free-tex-packer's `padding` and
  //    `extrude`: extrusion copies the tile's edge pixels outwards; padding is a transparent gap after that).
  const bleed = {};
  const solid = (hex) => sharp({ create: { width: 32, height: 32, channels: 4, background: hex } }).png().toBuffer();
  const green = await solid('#00c000ff'), magenta = await solid('#ff00ffff');
  for (const [name, { padding, extrude }] of Object.entries(BLEED_VARIANTS)) {
    const pitch = 32 + 2 * extrude + padding;
    const size = 3 * pitch + padding;
    const comps = [];
    for (let k = 0; k < 9; k++) {
      const src = k === 4 ? green : magenta;
      const ext = extrude ? await sharp(src).extend({ top: extrude, bottom: extrude, left: extrude, right: extrude, extendWith: 'copy' }).png().toBuffer() : src;
      comps.push({ input: ext, left: padding + (k % 3) * pitch, top: padding + Math.floor(k / 3) * pitch });
    }
    const png = await sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(comps).png().toBuffer();
    await writeFile(path.join(outDir, `bleed-${name}.png`), png);
    bleed[name] = { padding, extrude, size, frame: { x: padding + pitch + extrude, y: padding + pitch + extrude, w: 32, h: 32 } };
  }
  await writeFile(path.join(outDir, 'bleed.json'), JSON.stringify(bleed));

  const meta = {
    frames: FRAMES, cell: S, bleed,
    grid: { width: gm.width, height: gm.height, cols, rows },
    atlas: { width: am.width, height: am.height, json: Buffer.byteLength(JSON.stringify(atlasJson)), frames: Object.keys(atlasJson.frames).length },
    packMs: Math.round(packMs),
    sets: Object.fromEntries(Object.entries(sets).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).map(([f, x]) => [f, { bytes: x.bytes, requests: x.files.length }]))])),
    decodedRGBA: { files: FRAMES * S * S * 4, grid: gm.width * gm.height * 4, atlas: am.width * am.height * 4 },
    extras: { tilesetBytes: tileset.length, panelBytes: panel.length, layerBytes: layers },
  };
  await writeFile(path.join(outDir, 'meta.json'), JSON.stringify(meta, null, 1));
  return meta;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = process.argv[2] || path.resolve('build/sprites');
  console.log(JSON.stringify(await generate(out), null, 1));
}
