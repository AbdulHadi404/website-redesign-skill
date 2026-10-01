// Renders the sage-linen backdrop tile (her photo set's backdrop, described in social/posts.md #1, #3)
// as a seamless WebP. Folds: stitched fractal noise lit from the top left (window light);
// weave: fine horizontal/vertical threads. Run: node qa/tools/make-linen.mjs <skill-scripts-dir> <out.webp> [size] [base]
import { launch } from '../../../skill/website-redesign/scripts/lib/env.mjs';
import { writeFile } from 'node:fs/promises';
const out = process.argv[2] || 'assets/linen.webp';
const size = +(process.argv[3] || 768);
const base = process.argv[4] || '#9fb08f';
const { browser } = await launch();
const page = await browser.newPage();
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
<defs>
 <filter id="folds" filterUnits="userSpaceOnUse" x="-${size}" y="-${size}" width="${3*size}" height="${3*size}" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="${(3.0/size).toFixed(5)} ${(4.0/size).toFixed(5)}" numOctaves="4" seed="7" stitchTiles="stitch" x="0" y="0" width="${size}" height="${size}" result="n0"/>
  <feTile in="n0" result="n"/>
  <feDiffuseLighting in="n" surfaceScale="9" diffuseConstant="1.05" lighting-color="#ffffff" result="lit">
    <feDistantLight azimuth="225" elevation="52"/>
  </feDiffuseLighting>
  <feColorMatrix in="lit" type="matrix" values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 0 1" result="g0"/>
  <feComponentTransfer in="g0" result="g"><feFuncR type="linear" slope="0.75" intercept="-0.08"/><feFuncG type="linear" slope="0.75" intercept="-0.08"/><feFuncB type="linear" slope="0.75" intercept="-0.08"/></feComponentTransfer>
  <feFlood flood-color="${base}" result="c"/>
  <feBlend in="c" in2="g" mode="overlay" result="tinted"/>
  <feTurbulence type="fractalNoise" baseFrequency="0.9 0.06" numOctaves="1" seed="3" stitchTiles="stitch" x="0" y="0" width="${size}" height="${size}" result="wx0"/><feTile in="wx0" result="wx"/>
  <feTurbulence type="fractalNoise" baseFrequency="0.06 0.9" numOctaves="1" seed="5" stitchTiles="stitch" x="0" y="0" width="${size}" height="${size}" result="wy0"/><feTile in="wy0" result="wy"/>
  <feBlend in="wx" in2="wy" mode="multiply" result="w"/>
  <feColorMatrix in="w" type="matrix" values="0 0 0 0 0.12  0 0 0 0 0.16  0 0 0 0 0.1  -0.5 -0.5 -0.5 0 0.82" result="wa"/>
  <feComposite in="wa" in2="tinted" operator="atop" result="woven"/>
  <feComposite in="tinted" in2="woven" operator="over"/>
 </filter>
</defs>
<rect width="100%" height="100%" fill="${base}"/>
<rect x="-${size}" y="-${size}" width="${3*size}" height="${3*size}" filter="url(#folds)"/>
</svg>`;
await page.setContent('<canvas id=c></canvas>');
const data = await page.evaluate(async ({ svg, size }) => {
  const img = new Image();
  img.src = 'data:image/svg+xml;base64,' + btoa(svg);
  await img.decode();
  const c = document.getElementById('c'); c.width = size; c.height = size;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0);
  return c.toDataURL('image/webp', 0.72);
}, { svg, size });
await writeFile(out, Buffer.from(data.split(',')[1], 'base64'));
console.log(out, Buffer.from(data.split(',')[1], 'base64').length, 'bytes');
await browser.close();
