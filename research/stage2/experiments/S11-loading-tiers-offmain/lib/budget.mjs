// Budget arithmetic used in the S11 report, so every number in its tables is reproducible (no browser needed).
//  - GPU memory of textures by size and format (a full mip chain adds one third).
//  - What a wait buys in bytes on the network profiles the skill uses.
//  - The frame budget by display refresh, and the share left for the page's own JS.
import { saveResult } from './common.mjs';

const MiB = 1024 * 1024;
const FORMATS = {
  'RGBA8 (JPEG/PNG/WebP/AVIF once decoded)': 4,
  'BC7 / ASTC 4×4 / ETC2 RGBA8 (KTX2 UASTC transcoded)': 1,
  'BC1 / ETC1 / ETC2 RGB (KTX2 ETC1S transcoded, opaque)': 0.5,
};
const textures = [];
for (const size of [512, 1024, 2048, 4096]) {
  const row = { size: `${size}²` };
  for (const [f, bpp] of Object.entries(FORMATS)) row[f] = +((size * size * bpp * 4) / 3 / MiB).toFixed(1);
  textures.push(row);
}

// Deliverable bytes in a wait of W seconds: (W − rtts × RTT) × throughput. Two round trips on a warm connection
// (request + slow-start ramp), four on a cold one (DNS, TCP, TLS, request). A first-order model, not a simulator.
const NETS = {
  'slow 4G (Lighthouse mobile: 1.6 Mbps, 150 ms)': { mbps: 1.6, rtt: 0.15 },
  'p75 phone 2026 (Russell: 9 Mbps, 100 ms)': { mbps: 9, rtt: 0.1 },
  'slow 3G (400 kbps, 400 ms)': { mbps: 0.4, rtt: 0.4 },
};
const waits = [];
for (const [n, { mbps, rtt }] of Object.entries(NETS)) {
  const row = { network: n };
  for (const W of [1, 2.5, 5]) {
    row[`${W} s warm`] = Math.max(0, Math.round(((W - 2 * rtt) * mbps * 1e6) / 8 / 1024));
    row[`${W} s cold`] = Math.max(0, Math.round(((W - 4 * rtt) * mbps * 1e6) / 8 / 1024));
  }
  waits.push(row);
}

const frames = [30, 60, 90, 120].map((hz) => ({ refresh: `${hz} Hz`, frameMs: +(1000 / hz).toFixed(1), jsAt50pct: +(500 / hz).toFixed(1) }));

const out = { unitsTextures: 'MiB of GPU memory including a full mip chain (×4/3)', textures, unitsWaits: 'KiB deliverable', waits, frames };
await saveResult('budget', out);
if (import.meta.url === `file://${process.argv[1]}`) { console.table(textures); console.table(waits); console.table(frames); }
