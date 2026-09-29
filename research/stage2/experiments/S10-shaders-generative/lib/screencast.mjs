// When does the effect really appear on screen, and when does its motion really stop?
// A CDP screencast records every composited frame (JPEG, small) with its swap timestamp. The page is loaded with
// ?capture&noscrim&noposter (classes set by an inline <head> script, so even the first paint is isolated): copy,
// nav, pause control, scrim and poster hidden, crossfade disabled. The hero is then flat navy until the effect's
// first frame is presented, so the first non-navy frame is the first visible frame (a near-black frame is
// reported separately: on a real page that would be a flash over the poster).
import sharp from 'sharp';

export const ISOLATE_QUERY = 'capture&noscrim&noposter';

export async function startScreencast(cdp, { maxWidth = 256, maxHeight = 144 } = {}) {
  const frames = [];
  const on = (f) => {
    frames.push({ ts: (f.metadata.timestamp ?? 0) * 1000, data: f.data });
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  };
  cdp.on('Page.screencastFrame', on);
  await cdp.send('Page.enable').catch(() => {});
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 70, maxWidth, maxHeight, everyNthFrame: 1 });
  return {
    frames,
    async stop() { await cdp.send('Page.stopScreencast').catch(() => {}); cdp.off?.('Page.screencastFrame', on); return frames; },
  };
}

const NAVY = [9, 18, 42];
// Per frame, on a 64×36 thumbnail: mean max-channel distance from the navy ground (flat navy measures ~1 after
// JPEG), share of pixels more than 8 levels off navy, share near black, share near white or paper-light (the blank page or page body before
// navigation). A faint effect (Canvas 2D trails on navy) measured mean 7.5 / share 0.19; flat navy 1.0 / 0.
async function classify(b64) {
  const { data, info } = await sharp(Buffer.from(b64, 'base64')).resize(64, 36, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let off = 0, black = 0, white = 0, sum = 0;
  const n = info.width * info.height;
  for (let i = 0; i < data.length; i += 3) {
    const d = Math.max(Math.abs(data[i] - NAVY[0]), Math.abs(data[i + 1] - NAVY[1]), Math.abs(data[i + 2] - NAVY[2]));
    sum += d;
    if (d > 8) off++;
    if (data[i] < 5 && data[i + 1] < 5 && data[i + 2] < 8) black++;
    if (data[i] > 200 && data[i + 1] > 200 && data[i + 2] > 200) white++;   // blank page or the light page body before the hero paints
  }
  return { mean: sum / n, off: off / n, black: black / n, white: white / n, thumb: data };
}
const diff = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; };

// frames → { firstVisible, blackFrames, lastChange } in ms from navigation (timeOrigin in ms since epoch).
export async function analyse(frames, timeOrigin, { minOff = 0.02, minMean = 3 } = {}) {
  const rows = [];
  for (const f of frames) rows.push({ t: Math.round(f.ts - timeOrigin), ...(f.cls ||= await classify(f.data)) });
  const page = rows.filter((r) => r.white < 0.5 && r.t > 0);
  const seen = (r) => (r.off >= minOff || r.mean > minMean) && r.black < 0.5;
  const firstNavy = page.find((r) => !seen(r) && r.black < 0.5);
  const firstVisible = page.find(seen);
  const blackFrames = page.filter((r) => r.black >= 0.5).map((r) => r.t);
  // Motion end, two ways. lastChange: the last presented frame whose pixels differ at all from the frame before
  // (the screencast re-encodes identical content to identical bytes; after the loop stops nothing is sent).
  // lastVisibleChange: the first frame from which everything stays within 0.75 levels (mean) of the final frame.
  let lastChange = null;
  { const fr = frames.filter((f) => { const t = f.ts - timeOrigin; return t > 0 && f.cls.white < 0.5; });
    for (let i = fr.length - 1; i > 0; i--) if (fr[i].data !== fr[i - 1].data) { lastChange = Math.round(fr[i].ts - timeOrigin); break; } }
  let lastVisibleChange = null;
  if (page.length) {
    const fin = page.at(-1).thumb;
    for (let i = page.length - 1; i >= 0; i--) if (diff(page[i].thumb, fin) > 0.75) { lastVisibleChange = page[Math.min(page.length - 1, i + 1)].t; break; }
  }
  return { frames: rows.length, firstNavy: firstNavy?.t ?? null, firstVisible: firstVisible?.t ?? null, blackFrames: blackFrames.slice(0, 5), blackCount: blackFrames.length, lastChange, lastVisibleChange, lastFrame: page.at(-1)?.t ?? null };
}
