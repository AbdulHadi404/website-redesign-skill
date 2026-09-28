// Downloads the third-party test photos into captures/src (git-ignored). Nothing fetched here is committed:
// the photos are used only to measure encodings and placeholders. Provenance as the source repositories state it.
import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(here, 'captures/src');
export const PHOTOS = [
  // lovell/sharp test fixtures (repo Apache-2.0; photo from flickr.com/photos/grizdave/2569067123, licence not stated): the large hero.
  { name: 'hero.jpg', url: 'https://raw.githubusercontent.com/lovell/sharp/main/test/fixtures/2569067123_aca715a2ee_o.jpg' },
  // lovell/sharp test fixtures, marked "public domain" in test/fixtures/index.js (flickr.com/photos/mars_/14389236779).
  { name: 'concert.jpg', url: 'https://raw.githubusercontent.com/lovell/sharp/main/test/fixtures/concert.jpg' },
  // woltapp/blurhash website images (repo MIT; photo licences not stated): a varied set for placeholder sizes.
  ...[1, 2, 3, 4, 5].map((i) => ({ name: `bh${i}.jpg`, url: `https://raw.githubusercontent.com/woltapp/blurhash/master/Website/assets/images/img${i}.jpg` })),
  { name: 'bh-wide.jpg', url: 'https://raw.githubusercontent.com/woltapp/blurhash/master/Website/assets/images/get-started-bg.jpg' },
];

export async function fetchAssets() {
  await mkdir(dir, { recursive: true });
  for (const p of PHOTOS) {
    const out = path.join(dir, p.name);
    try { await access(out); continue; } catch { /* fetch it */ }
    const r = await fetch(p.url);
    if (!r.ok) throw new Error(`${p.url}: HTTP ${r.status}`);
    await writeFile(out, Buffer.from(await r.arrayBuffer()));
    console.error(`fetched ${p.name}`);
  }
  return dir;
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(await fetchAssets());
