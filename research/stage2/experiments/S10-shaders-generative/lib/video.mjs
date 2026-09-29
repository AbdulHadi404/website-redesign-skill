// Variant i: the same shader, rendered offline to a seamless video loop (the "just ship a video" alternative).
// Frames come from e1 at 1280×720 (lab hook __lab.renderAt(t)); the loop closes with a 1 s crossfade of its
// tail into its head, so no reverse playback and no seam. Encodes AV1 and VP9 (what Chromium plays) and H.264
// (Safari/older devices; size reference only here — the lab's Chromium has no H.264 decoder).
import { execFileSync } from 'node:child_process';
import { mkdir, rm, writeFile, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

export const LOOP = { fps: 24, seconds: 8, crossfade: 1, width: 1280, height: 720 };

export async function renderFrames(page, url, outDir) {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof window.__lab?.renderAt === 'function', null, { timeout: 60000 });
  const L = LOOP.fps * LOOP.seconds, C = LOOP.fps * LOOP.crossfade;
  const raw = [];
  const t0 = Date.now();
  for (let i = 0; i < L + C; i++) {
    await page.evaluate((t) => window.__lab.renderAt(t), i / LOOP.fps);
    const png = await page.locator('#bg').screenshot({ type: 'png' });
    raw.push(await sharp(png).removeAlpha().raw().toBuffer());
  }
  const renderMs = Date.now() - t0;
  const { width, height } = LOOP;
  const out = [];
  for (let i = 0; i < L - C; i++) out.push(raw[C + i]);
  for (let j = 0; j < C; j++) {
    const a = raw[L + j], b = raw[j], k = j / C, m = Buffer.alloc(a.length);
    for (let p = 0; p < a.length; p++) m[p] = Math.round(a[p] * (1 - k) + b[p] * k);
    out.push(m);
  }
  for (let i = 0; i < out.length; i++) await sharp(out[i], { raw: { width, height, channels: 3 } }).png({ compressionLevel: 1 }).toFile(path.join(outDir, `f${String(i).padStart(4, '0')}.png`));
  return { frames: out.length, rendered: L + C, renderMs, firstFrame: path.join(outDir, 'f0000.png') };
}

export async function encode(ffmpeg, framesDir, outDir) {
  await mkdir(outDir, { recursive: true });
  // RGB frames → BT.709 YUV, tagged, so every decoder agrees on the colour. (The videocolour phase found Chromium
  // decodes tagged and untagged VP9 alike, within 1/255 of the source frame; ffmpeg's own PNG dump of the untagged
  // file drifted purple. Judge video colour in the browser, not from ffmpeg frame dumps.)
  const input = ['-y', '-hide_banner', '-loglevel', 'error', '-framerate', String(LOOP.fps), '-i', path.join(framesDir, 'f%04d.png'),
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv'];
  const jobs = {
    'loop-av1.webm': ['-c:v', 'libaom-av1', '-crf', '38', '-b:v', '0', '-cpu-used', '6', '-row-mt', '1', '-tiles', '2x2', '-pix_fmt', 'yuv420p', '-an'],
    'loop-vp9.webm': ['-c:v', 'libvpx-vp9', '-crf', '38', '-b:v', '0', '-deadline', 'good', '-cpu-used', '4', '-row-mt', '1', '-pix_fmt', 'yuv420p', '-an'],
    'loop-h264.mp4': ['-c:v', 'libx264', '-crf', '26', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an'],
  };
  const res = {};
  for (const [name, args] of Object.entries(jobs)) {
    const t0 = Date.now();
    execFileSync(ffmpeg, [...input, ...args, path.join(outDir, name)], { stdio: 'inherit' });
    res[name] = { bytes: (await stat(path.join(outDir, name))).size, encodeMs: Date.now() - t0, args: args.join(' ') };
  }
  return res;
}
