#!/usr/bin/env node
// Fetches the fixture's font files into assets/ (git-ignored). Google Sans Flex is OFL-1.1
// (google/fonts ofl/googlesansflex/OFL.txt); it is fetched rather than committed to keep the folder small.
// Two requests of the same family: weight axis only (what most sites load, optical size frozen at the default
// instance) and weight + optical size. Latin subset only.
// Behind a proxy on Node >= 22.21 run with NODE_USE_ENV_PROXY=1 (run.mjs does this for you).
//   node fetch-assets.mjs [--force]
import { writeFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, 'assets');
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141 Safari/537.36';
const FONTS = {
  'gsf-wght.woff2': 'Google+Sans+Flex:wght@100..1000',
  'gsf-opsz-wght.woff2': 'Google+Sans+Flex:opsz,wght@6..144,100..1000',
};

await mkdir(out, { recursive: true });
for (const [file, spec] of Object.entries(FONTS)) {
  const dest = path.join(out, file);
  if (!process.argv.includes('--force') && (await stat(dest).catch(() => null))?.size > 10000) { console.log(`${file}: present`); continue; }
  const cssUrl = `https://fonts.googleapis.com/css2?family=${spec}&display=swap`;
  const css = await (await fetch(cssUrl, { headers: { 'user-agent': UA } })).text();
  const url = css.split('/* latin */')[1]?.match(/url\((https:[^)]+)\)/)?.[1];
  if (!url) throw new Error(`no latin woff2 in ${cssUrl}:\n${css.slice(0, 300)}`);
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  await writeFile(dest, buf);
  console.log(`${file}: ${buf.length} bytes from ${url}`);
}
