// Fixtures for the tier experiment: a probe page and a governor page.
import { mkdir, writeFile, cp } from 'node:fs/promises';
import path from 'node:path';
import { here, siteRoot } from './common.mjs';

export async function buildTiers() {
  const dir = path.join(siteRoot, 'tiers');
  await mkdir(dir, { recursive: true });
  await cp(path.join(here, 'lib/client'), path.join(siteRoot, 'client'), { recursive: true });
  await cp(path.join(here, 'node_modules/@pmndrs/detect-gpu/dist'), path.join(siteRoot, 'vendor/detect-gpu'), { recursive: true });

  // Probe page. ?cond=quiet probes after load; ?cond=busy probes while "boot" long tasks run (a page still hydrating).
  await writeFile(path.join(dir, 'index.html'), `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width">
<title>tier probe</title><body style="margin:0;font:16px system-ui"><h1>Tier probe</h1><canvas id=c width=300 height=150></canvas>
<script type=module>
import { readSignals, probeWebGL, frameProbe, burstProbe, makeWork } from '/client/tier.js';
const q = new URLSearchParams(location.search);
const cond = q.get('cond') || 'quiet';
// A fixed CPU loop standing in for framework boot/hydration: ~60 ms per task at 1x, scaled by throttling like real work.
function boot() { let s = 0; for (let i = 0; i < 2.5e7; i++) s += Math.sqrt(i) * 1e-9; return s; }
async function run() {
  const out = { cond };
  const t0 = performance.now();
  out.signals = readSignals();
  out.signalsMs = performance.now() - t0;
  const t1 = performance.now();
  out.gl = probeWebGL();
  out.glMs = performance.now() - t1;
  const work = makeWork();
  if (cond === 'busy') { let n = 0; const id = setInterval(() => { boot(); if (++n >= 12) clearInterval(id); }, 90); }
  const t2 = performance.now();
  const f = await frameProbe({ work, maxMs: 2000, earlyExit: false });
  out.frame = { frames: f.frames, ms: f.ms, works: f.workAll.map((x) => +x.toFixed(3)), gaps: f.gaps.map((x) => +x.toFixed(2)) };
  out.frameWall = performance.now() - t2;
  const b = burstProbe({ work });
  out.burst = b;
  const t3 = performance.now();
  try {
    const { getGPUTier } = await import('/vendor/detect-gpu/index.mjs');
    out.detectGpu = await getGPUTier({ benchmarksURL: '/vendor/detect-gpu/benchmarks' });
  } catch (e) { out.detectGpu = { error: String(e) }; }
  out.detectGpuMs = performance.now() - t3;
  window.__result = out;
}
addEventListener('load', () => setTimeout(run, 300));
</script>`);

  // detect-gpu against renderer strings it would see on real phones (no device needed: override.renderer).
  await writeFile(path.join(dir, 'detectgpu.html'), `<!doctype html><meta charset=utf-8><title>detect-gpu overrides</title><script type=module>
import { getGPUTier } from '/vendor/detect-gpu/index.mjs';
const cases = [
  ['Adreno (TM) 610', true], ['Adreno (TM) 619', true], ['Adreno (TM) 650', true], ['Adreno (TM) 740', true], ['Adreno (TM) 830', true],
  ['Mali-G52 MC2', true], ['Mali-G57 MC2', true], ['Mali-G68 MC4', true], ['Mali-G710 MC10', true], ['Mali-G925-Immortalis MC12', true],
  ['PowerVR Rogue GE8320', true], ['Apple GPU', true], ['Samsung Xclipse 940', true],
  ['ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)', false], ['ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)', false],
  ['ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)', false], ['Apple GPU', false],
];
const out = [];
for (const [renderer, isMobile] of cases) {
  const t = performance.now();
  const r = await getGPUTier({ benchmarksURL: '/vendor/detect-gpu/benchmarks', override: { renderer, isMobile, screenSize: isMobile ? { width: 390, height: 844 } : { width: 1920, height: 1080 } } });
  out.push({ renderer, isMobile, ...r, ms: +(performance.now() - t).toFixed(1) });
}
window.__result = out;
</script>`);

  // Governor page: a canvas scene with four quality levels (particle count and resolution scale).
  await writeFile(path.join(dir, 'governor.html'), `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width">
<title>governor</title><body style="margin:0;background:#111"><canvas id=c style="width:390px;height:300px"></canvas>
<script type=module>
import { createGovernor } from '/client/governor.js';
const q = new URLSearchParams(location.search);
const mode = q.get('mode') || 'continuous';     // continuous | ondemand
const kind = q.get('gov') || 'rules';           // rules (governor.js) | fpsavg (a port of drei PerformanceMonitor's averaging)
const LEVELS = [{ n: 9000, scale: 1 }, { n: 4500, scale: 0.85 }, { n: 2200, scale: 0.7 }, { n: 1000, scale: 0.6 }];
const cv = document.getElementById('c'), g = cv.getContext('2d');
const P = new Float32Array(9000 * 4).map(() => Math.random());
let level = 0;
const log = [];
// drei PerformanceMonitor defaults (src/core/PerformanceMonitor.tsx): fps = frames / ms over 250 ms windows collected
// only on rendered frames, 10 windows, decline when > 75% of them are under the lower bound (40 at 60 Hz).
function fpsAvg() {
  let frames = [], averages = [], index = 0, refreshrate = 0;
  return { get level() { return level; }, frame(now) {
    frames.push(now);
    const ms = frames[frames.length - 1] - frames[0];
    if (ms >= 250) {
      const fps = Math.round(frames.length / ms * 1000); refreshrate = Math.max(refreshrate, fps);
      averages[index++ % 10] = fps;
      if (averages.length === 10) {
        const [lower, upper] = refreshrate > 100 ? [60, 100] : [40, 60];
        const low = averages.filter((v) => v < lower).length, high = averages.filter((v) => v >= upper).length;
        if (low > 7.5 && level < 3) { log.push({ t: Math.round(now), from: level, to: level + 1, why: 'fps averages ' + averages.join(',') }); level++; }
        else if (high > 7.5 && level > 0) { log.push({ t: Math.round(now), from: level, to: level - 1, why: 'fps averages ' + averages.join(',') }); level--; }
        averages = [];
      }
      frames = [];
    }
  } };
}
const gov = kind === 'fpsavg' ? fpsAvg() : createGovernor({});
const frames = [];
function size() { const s = LEVELS[level].scale * devicePixelRatio; cv.width = Math.round(390 * s); cv.height = Math.round(300 * s); }
size();
function draw(now) {
  const { n } = LEVELS[level], w = cv.width, h = cv.height;
  for (let i = 0; i < n; i++) { const k = i * 4; P[k] = (P[k] + P[k + 2] * 0.002) % 1; P[k + 1] = (P[k + 1] + P[k + 3] * 0.002) % 1; }
  g.fillStyle = '#111'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#e8b04a';
  for (let i = 0; i < n; i++) { const k = i * 4; g.fillRect(P[k] * w, P[k + 1] * h, 3, 3); }
  const before = gov.level;
  gov.frame(now);
  if (gov.level !== before) { level = gov.level; size(); }
  frames.push([Math.round(now), level]);
}
if (mode === 'continuous') { const loop = (now) => { draw(now); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
else {
  // on-demand (frameloop="demand"): a click-driven update every 700 ms renders 3 frames; every 6 s a 1 s drag
  // renders continuously. Nothing renders in between.
  let until = 0;
  const tick = (now) => { draw(now); if (performance.now() < until) requestAnimationFrame(tick); };
  const burst = (ms) => { const idle = performance.now() >= until; until = Math.max(until, performance.now() + ms); if (idle) requestAnimationFrame(tick); };
  setInterval(() => burst(40), 700);
  setInterval(() => burst(1000), 6000);
}
window.__gov = () => ({ log: kind === 'fpsavg' ? log : gov.log, level: gov.level, refresh: gov.refresh || null, frames });
</script>`);
}
