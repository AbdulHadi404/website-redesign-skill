// CDP screencast: frames with wall-clock timestamps (ms), decoded lazily with pngjs.
import { PNG } from 'pngjs';
export async function startScreencast(page, { maxWidth, maxHeight } = {}) {
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', async (f) => {
    frames.push({ wall: f.metadata.timestamp * 1000, data: f.data, w: f.metadata.deviceWidth, h: f.metadata.deviceHeight, sy: f.metadata.scrollOffsetY });
    try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch { /* closed */ }
  });
  await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1, ...(maxWidth ? { maxWidth } : {}), ...(maxHeight ? { maxHeight } : {}) });
  return { frames, stop: async () => { try { await cdp.send('Page.stopScreencast'); } catch { /* ignore */ } await cdp.detach().catch(() => {}); return frames; } };
}
export const decode = (f) => (f.png ??= PNG.sync.read(Buffer.from(f.data, 'base64')));
/** Mean luminance (0..1) of a CSS-pixel rect in a frame. */
export function meanLum(f, rect) {
  const png = decode(f); const sx = png.width / f.w, sy = png.height / f.h;
  let sum = 0, n = 0;
  for (let y = Math.floor(rect.y * sy); y < Math.floor((rect.y + rect.height) * sy); y += 2)
    for (let x = Math.floor(rect.x * sx); x < Math.floor((rect.x + rect.width) * sx); x += 2) {
      const i = (y * png.width + x) * 4; sum += (0.2126 * png.data[i] + 0.7152 * png.data[i + 1] + 0.0722 * png.data[i + 2]) / 255; n++;
    }
  return n ? sum / n : null;
}
/** First row (CSS px) from the top, in column x, whose colour is near rgb. */
export function firstRowOfColour(f, x, rgb, tol = 40) {
  const png = decode(f); const sx = png.width / f.w, sy = png.height / f.h; const px = Math.floor(x * sx);
  for (let y = 0; y < png.height; y++) { const i = (y * png.width + px) * 4;
    if (Math.abs(png.data[i] - rgb[0]) + Math.abs(png.data[i + 1] - rgb[1]) + Math.abs(png.data[i + 2] - rgb[2]) < tol) return y / sy; }
  return null;
}
