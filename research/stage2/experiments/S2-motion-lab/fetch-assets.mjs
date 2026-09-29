// Sample assets for Part B, fetched (not committed) from the official example repositories at pinned commits.
// Licences: rive-app/rive-wasm and rive-app/rive-react are MIT (LICENSE in each repo, "Copyright (c) 2020-2021 Rive" /
// "(c) 2021 Rive"); LottieFiles/dotlottie-web is MIT ("Copyright (c) 2023 LottieFiles.com"). The files carry no separate
// licence of their own, so they fall under their repository's MIT licence.
//   node fetch-assets.mjs   → captures/b-assets/
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import path from 'node:path';
import { labRoot } from './lib/server.mjs';
const RIVE_WASM = 'https://raw.githubusercontent.com/rive-app/rive-wasm/66533f8e337d05a6e586e0ea188142990c7fa0a2/';
const RIVE_REACT = 'https://raw.githubusercontent.com/rive-app/rive-react/0b254da3fcbbb37bce17d5afdc467adca95629b6/';
const DOTLOTTIE = 'https://raw.githubusercontent.com/LottieFiles/dotlottie-web/a08deda3ba399203c9c155fa29a55cfa35eb4946/';
export const ASSETS = {
  'switch.riv': RIVE_WASM + 'js/examples/_frameworks/parcel_example_canvas/switch_event_example.riv',
  'rating.riv': RIVE_WASM + 'js/examples/_frameworks/parcel_example_canvas/rating_animation.riv',
  'truck.riv': RIVE_WASM + 'js/examples/_frameworks/parcel_example_canvas/truck.riv',
  'rating-react.riv': RIVE_REACT + 'examples/public/rating.riv',
  'semantic.riv': RIVE_REACT + 'examples/public/semantic_warning_exp4.riv',
  'focus.riv': RIVE_WASM + 'js/test/assets/focus.riv',
  'toggle-sm.lottie': DOTLOTTIE + 'fixtures/sm/toggle.lottie',
  'star-rating-sm.lottie': DOTLOTTIE + 'fixtures/sm/star-rating.lottie',
  'hamster.lottie': DOTLOTTIE + 'fixtures/hamster.lottie',
};
/** Minimal zip reader (stored or deflated entries), enough for .lottie files. */
export function unzip(buf) {
  const out = {}; let i = 0;
  while (buf.readUInt32LE(i) === 0x04034b50) {
    const method = buf.readUInt16LE(i + 8), csize = buf.readUInt32LE(i + 18), nlen = buf.readUInt16LE(i + 26), xlen = buf.readUInt16LE(i + 28);
    const name = buf.toString('utf8', i + 30, i + 30 + nlen); const start = i + 30 + nlen + xlen; const data = buf.subarray(start, start + csize);
    out[name] = method === 8 ? inflateRawSync(data) : data; i = start + csize;
  }
  return out;
}
export async function fetchAssets() {
  const dir = path.join(labRoot, 'captures/b-assets'); await mkdir(dir, { recursive: true });
  for (const [name, url] of Object.entries(ASSETS)) {
    const file = path.join(dir, name);
    if (!existsSync(file)) { const r = await fetch(url); if (!r.ok) throw new Error(`${url}: ${r.status}`); await writeFile(file, Buffer.from(await r.arrayBuffer())); }
  }
  // the Lottie JSON inside the state-machine toggle, for lottie-web (which cannot read .lottie)
  const z = unzip(await readFile(path.join(dir, 'toggle-sm.lottie')));
  const anim = Object.keys(z).find((k) => /^a\/.*\.json$|^animations\/.*\.json$/.test(k));
  await writeFile(path.join(dir, 'toggle.json'), z[anim]);
  const zh = unzip(await readFile(path.join(dir, 'hamster.lottie')));
  await writeFile(path.join(dir, 'hamster.json'), zh[Object.keys(zh).find((k) => /\.json$/.test(k) && !/manifest/.test(k))]);
  return dir;
}
if (import.meta.url === `file://${process.argv[1]}`) console.log(await fetchAssets());
