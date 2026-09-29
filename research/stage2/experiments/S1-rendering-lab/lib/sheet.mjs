// Contact sheet of screenshots (JPEG), labelled.
import sharp from 'sharp';
export async function contactSheet(entries, out, { cols = 3, w = 400, h = 300 } = {}) {
  const comps = [];
  for (let i = 0; i < entries.length; i++) {
    const { file, label } = entries[i];
    const x = (i % cols) * w, y = Math.floor(i / cols) * h;
    comps.push({ input: await sharp(file).resize(w, h).toBuffer(), left: x, top: y });
    const safe = String(label).replace(/[<&>]/g, '');
    comps.push({ input: Buffer.from(`<svg width="${w}" height="22"><rect width="${w}" height="22" fill="#000" fill-opacity=".65"/><text x="6" y="16" font-size="13" fill="#fff" font-family="sans-serif">${safe}</text></svg>`), left: x, top: y });
  }
  await sharp({ create: { width: cols * w, height: Math.ceil(entries.length / cols) * h, channels: 3, background: '#fff' } })
    .composite(comps).jpeg({ quality: 78 }).toFile(out);
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const [names, out] = process.argv.slice(2);
  await contactSheet(names.split(',').map((n) => ({ file: `/tmp/s2-S1/smoke-${n}.png`, label: n })), out);
}
