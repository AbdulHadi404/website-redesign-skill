#!/usr/bin/env node
// Downloads the prototype's two typefaces (SIL Open Font License) from Google Fonts into prototype/fonts/, latin
// subset only, and writes prototype/fonts/fonts.css. The folder is git-ignored: run this instead of committing fonts.
//   node fetch-fonts.mjs        (behind a proxy, Node >= 22.21: NODE_USE_ENV_PROXY=1 node fetch-fonts.mjs)
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, 'prototype', 'fonts');
const CSS_URL = 'https://fonts.googleapis.com/css2?family=Figtree:wght@400..700&family=Fraunces:ital,opsz,wght@0,9..144,600;1,9..144,600&display=swap';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';

await mkdir(out, { recursive: true });
const css = await (await fetch(CSS_URL, { headers: { 'user-agent': UA } })).text();
const blocks = css.split('/*').slice(1).map((b) => ({ subset: b.slice(0, b.indexOf('*/')).trim(), body: b.slice(b.indexOf('*/') + 2) }));
let local = '/* Figtree and Fraunces, SIL Open Font License 1.1, latin subset, fetched by fetch-fonts.mjs */\n';
let n = 0;
for (const { subset, body } of blocks) {
  if (subset !== 'latin') continue;
  const family = body.match(/font-family:\s*'([^']+)'/)[1];
  const style = body.match(/font-style:\s*(\w+)/)[1];
  const weight = body.match(/font-weight:\s*([\d ]+);/)[1].trim().replace(' ', '-');
  const url = body.match(/url\((https:[^)]+)\)/)[1];
  const file = `${family.toLowerCase()}-${style}-${weight}.woff2`;
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  await writeFile(path.join(out, file), buf);
  local += body.replace(/url\(https:[^)]+\)/, `url(${file})`).trim().replace(/^/, '') + '\n';
  n++;
  console.log(`${file}  ${(buf.length / 1024).toFixed(1)} KB`);
}
await writeFile(path.join(out, 'fonts.css'), local);
console.log(`wrote ${n} faces to ${path.relative(process.cwd(), out)}`);
