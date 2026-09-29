/**
 * Does the skill's capture.mjs give identical pixels for two captures of a page whose only motion is infinite
 * animations (a spinner, a pulsing skeleton)? It finishes finite animations and pauses infinite ones where they are
 * (lib/env.mjs finishMotion), so two runs may freeze them at different frames. Captures twice, diffs at threshold 0.
 */
import { spawn } from 'node:child_process';
import { readFile, rm, readdir } from 'node:fs/promises';
import path from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { here, repo } from '../lib/server.mjs';

const run = (args) => new Promise((resolve) => { const p = spawn('node', args, { stdio: 'ignore' }); p.on('close', resolve); });
export async function captureMotion(base) {
  const out = path.join(here, 'captures/motion');
  await rm(out, { recursive: true, force: true });
  const script = path.join(repo, 'skills/website-redesign/scripts/capture.mjs');
  for (const label of ['a', 'b']) await run([script, '--base', base, '--paths', '/fixtures/vr/spinner.html', '--widths', '390', '--out', out, '--label', label]);
  const files = (await readdir(out)).filter((f) => f.endsWith('.png') && !f.includes('fold'));
  const [fa, fb] = ['-a.png', '-b.png'].map((s) => files.find((f) => f.endsWith(s)));
  if (!fa || !fb) return { error: `captures missing: ${files.join(', ')}` };
  const [A, B] = await Promise.all([fa, fb].map(async (f) => PNG.sync.read(await readFile(path.join(out, f)))));
  const w = Math.min(A.width, B.width), h = Math.min(A.height, B.height);
  const crop = (img) => { const o = new PNG({ width: w, height: h }); PNG.bitblt(img, o, 0, 0, w, h, 0, 0); return o; };
  const n0 = pixelmatch(crop(A).data, crop(B).data, null, w, h, { threshold: 0 });
  const n1 = pixelmatch(crop(A).data, crop(B).data, null, w, h, { threshold: 0.1 });
  return { files: [fa, fb], size: `${w}×${h}`, diffPixelsT0: n0, diffPixelsT01: n1 };
}
