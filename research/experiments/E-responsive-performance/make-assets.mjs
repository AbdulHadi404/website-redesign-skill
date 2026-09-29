// Generates a photo-like hero image and encodes it at several widths in JPEG / WebP / AVIF,
// printing the byte sizes so format and width decisions can be made from numbers.
//   node make-assets.mjs
import sharp from 'sharp';
import { mkdir, writeFile, copyFile, stat } from 'node:fs/promises';

await mkdir('site/img', { recursive: true });
await mkdir('site/fonts', { recursive: true });

// Photo-like: turbulence (texture) + gradients + a few shapes. Compresses roughly like a real photo.
const W = 2400, H = 1350;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1d3b53"/><stop offset=".5" stop-color="#c77d4a"/><stop offset="1" stop-color="#f3d9a4"/>
    </linearGradient>
    <filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".012" numOctaves="5" seed="7"/>
      <feColorMatrix type="saturate" values=".6"/><feComponentTransfer><feFuncA type="linear" slope=".55"/></feComponentTransfer></filter>
    <filter id="f"><feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="3" seed="3"/>
      <feComponentTransfer><feFuncA type="linear" slope=".45"/></feComponentTransfer></filter>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <rect width="100%" height="100%" filter="url(#n)"/>
  <circle cx="1700" cy="500" r="330" fill="#fff4dc" opacity=".55"/>
  <path d="M0 1000 Q 600 780 1200 980 T 2400 900 V1350 H0Z" fill="#20303a" opacity=".85"/>
  <rect width="100%" height="100%" filter="url(#f)"/>
</svg>`;
const master = await sharp(Buffer.from(svg)).png().toBuffer();
await writeFile('site/img/master.png', master);

const widths = [480, 800, 1200, 1600, 2400];
const rows = [];
for (const w of widths) {
  const base = sharp(master).resize({ width: w });
  const jpg = await base.clone().jpeg({ quality: 80, mozjpeg: true }).toBuffer();
  const webp = await base.clone().webp({ quality: 75 }).toBuffer();
  const avif = await base.clone().avif({ quality: 50, effort: 4 }).toBuffer();
  await writeFile(`site/img/hero-${w}.jpg`, jpg);
  await writeFile(`site/img/hero-${w}.webp`, webp);
  await writeFile(`site/img/hero-${w}.avif`, avif);
  rows.push({ width: w, jpgKB: +(jpg.length / 1024).toFixed(1), webpKB: +(webp.length / 1024).toFixed(1), avifKB: +(avif.length / 1024).toFixed(1) });
}
// An unoptimised "as exported from design tool" PNG for the bad page
await writeFile('site/img/hero-raw.png', await sharp(master).png({ compressionLevel: 6 }).toBuffer());
console.table(rows);
console.log('raw PNG KB', ((await stat('site/img/hero-raw.png')).size / 1024).toFixed(1));

// A web font to test font-loading behaviour (system DejaVu, served as a file)
await copyFile('/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf', 'site/fonts/display.ttf');
console.log('font KB', ((await stat('site/fonts/display.ttf')).size / 1024).toFixed(1));
