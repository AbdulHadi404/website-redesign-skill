// Sprite lab page (bundled by esbuild). The runner calls window.lab[name](params) and gets numbers back.
// Every frame-cost test renders K frames in a tight loop and forces a GPU/raster sync after each one
// (readPixels / getImageData of one pixel), so the time includes the work, not just the command submission.
import { Application, Assets, Sprite, AnimatedSprite, Texture, Rectangle, Container, NineSliceSprite, TilingSprite, Spritesheet, RenderTexture, ImageSource } from 'pixi.js';
import { Spine } from '@esotericsoftware/spine-pixi-v8';

const B = '/build/sprites';
const W = 1280, H = 720;
const median = (xs) => { const a = [...xs].sort((p, q) => p - q); const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }
const ext = { png: 'png', png8: 'png', webpLossless: 'webp', webp: 'webp', avif: 'avif' };
const names = Array.from({ length: 60 }, (_, i) => `f${String(i).padStart(2, '0')}`);

async function blobs(set, fmt) {
  if (set === 'files') return Promise.all(names.map((n) => fetch(`${B}/files-${fmt}/${n}.${ext[fmt]}`).then((r) => r.blob())));
  return [await fetch(`${B}/${set}-${fmt}/${set}.${ext[fmt]}`).then((r) => r.blob())];
}

function glCounter(gl) {
  const c = { calls: 0 };
  for (const fn of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
    const orig = gl[fn].bind(gl);
    gl[fn] = (...a) => { c.calls++; return orig(...a); };
  }
  return c;
}

async function pixiApp() {
  const app = new Application();
  await app.init({ width: W, height: H, preference: 'webgl', antialias: false, autoStart: false, background: '#1b1f33', resolution: 1 });
  document.body.appendChild(app.canvas);
  const gl = app.renderer.gl;
  const counter = glCounter(gl);
  const px = new Uint8Array(4);
  // Returns draw calls and the moment the CPU side finished (before the sync), so CPU submit time and synced frame time separate.
  const frame = () => { counter.calls = 0; app.renderer.render(app.stage); const syncAt = performance.now(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); return { calls: counter.calls, syncAt }; };
  return { app, frame };
}

// frameMs: update + render + sync (GPU-bound under SwiftShader); cpuMs: update + render submit only (WebGL tests).
function timeFrames(K, fn, warm = 5) {
  for (let i = 0; i < warm; i++) fn(i);
  const t = [], cpu = [];
  let last;
  for (let i = 0; i < K; i++) { const t0 = performance.now(); last = fn(i + warm); const t1 = performance.now(); t.push(t1 - t0); if (last && last.syncAt) cpu.push(last.syncAt - t0); }
  const out = { frameMs: median(t) };
  if (cpu.length) out.cpuMs = median(cpu);
  if (last && last.calls != null) out.drawCalls = last.calls;
  return out;
}

async function atlasFrames(fmt) {
  const json = await fetch(`${B}/atlas.json`).then((r) => r.json());
  return json;
}

const lab = {
  // Network + decode: fetch every image of a set, decode with createImageBitmap. Called on a throttled page.
  async load({ set, fmt }) {
    const t0 = performance.now();
    const bs = await blobs(set, fmt);
    const tFetch = performance.now() - t0;
    const t1 = performance.now();
    const bmps = await Promise.all(bs.map((b) => createImageBitmap(b)));
    const tDecode = performance.now() - t1;
    const res = performance.getEntriesByType('resource').filter((e) => e.name.includes(`/${set}-${fmt}/`));
    return { fetchMs: tFetch, decodeMs: tDecode, totalMs: performance.now() - t0, requests: res.length, bytes: bs.reduce((s, b) => s + b.size, 0), images: bmps.length };
  },

  // Decode only (warm cache): time to decode all images of a set, sequentially awaited in parallel like a loader would.
  async decode({ set, fmt, runs = 5 }) {
    const bs = await blobs(set, fmt);
    const t = [];
    for (let r = 0; r < runs; r++) { const t0 = performance.now(); const bm = await Promise.all(bs.map((b) => createImageBitmap(b))); t.push(performance.now() - t0); bm.forEach((x) => x.close()); }
    return { decodeMs: median(t) };
  },

  // Canvas 2D: N animated sprites, drawn from the packed atlas (drawImage with a source rect) or from 60 separate images.
  async canvasDraw({ source, n = 300, K = 60 }) {
    const c = document.createElement('canvas'); c.width = W; c.height = H; document.body.appendChild(c);
    const ctx = c.getContext('2d', { willReadFrequently: true }); // CPU raster, deterministic (a readback every frame would switch Chromium to it anyway)
    const r = rng(1);
    const sp = Array.from({ length: n }, () => ({ x: r() * (W - 128), y: r() * (H - 128), o: Math.floor(r() * 60) }));
    let draw;
    if (source === 'atlas') {
      const img = await createImageBitmap(await fetch(`${B}/atlas-png/atlas.png`).then((x) => x.blob()));
      const json = await atlasFrames();
      const fr = names.map((k) => json.frames[k]);
      draw = (t) => { ctx.clearRect(0, 0, W, H); for (const s of sp) { const f = fr[(t + s.o) % 60]; const { x, y, w, h } = f.frame; ctx.drawImage(img, x, y, w, h, s.x + f.spriteSourceSize.x, s.y + f.spriteSourceSize.y, w, h); } };
    } else if (source === 'grid') {
      const img = await createImageBitmap(await fetch(`${B}/grid-png/grid.png`).then((x) => x.blob()));
      draw = (t) => { ctx.clearRect(0, 0, W, H); for (const s of sp) { const i = (t + s.o) % 60; ctx.drawImage(img, (i % 10) * 128, Math.floor(i / 10) * 128, 128, 128, s.x, s.y, 128, 128); } };
    } else {
      const imgs = await Promise.all((await blobs('files', 'png')).map((b) => createImageBitmap(b)));
      draw = (t) => { ctx.clearRect(0, 0, W, H); for (const s of sp) ctx.drawImage(imgs[(t + s.o) % 60], s.x, s.y); };
    }
    const res = timeFrames(K, (t) => { draw(t); ctx.getImageData(0, 0, 1, 1); });
    c.remove();
    return res;
  },

  // PixiJS: N AnimatedSprites from one atlas texture vs 60 separate textures. Reports draw calls per frame.
  async pixiDraw({ source, n = 300, K = 30 }) {
    const { app, frame } = await pixiApp();
    let textures;
    if (source === 'atlas') {
      const json = await atlasFrames();
      const base = await Assets.load(`${B}/atlas-png/atlas.png`);
      const sheet = new Spritesheet(base, json); await sheet.parse();
      textures = sheet.animations.hop;
    } else if (source === 'grid') {
      // one texture, untrimmed 128 px cells: isolates the draw-call effect (vs files) from the trimming effect (vs atlas)
      const base = await Assets.load(`${B}/grid-png/grid.png`);
      textures = names.map((_, i) => new Texture({ source: base.source, frame: new Rectangle((i % 10) * 128, Math.floor(i / 10) * 128, 128, 128) }));
    } else {
      textures = await Promise.all(names.map((k) => Assets.load(`${B}/files-png/${k}.png`)));
    }
    const r = rng(1);
    const sprites = Array.from({ length: n }, () => { const s = new AnimatedSprite(textures); s.autoUpdate = false; s.x = r() * (W - 128); s.y = r() * (H - 128); s.gotoAndStop(Math.floor(r() * 60)); app.stage.addChild(s); return s; });
    const res = timeFrames(K, () => { for (const s of sprites) s.gotoAndStop((s.currentFrame + 1) % 60); return frame(); });
    app.destroy(true, { children: true, texture: false });
    return res;
  },

  // Parallax: 4 repeating layers scrolling at different speeds.
  async parallax({ engine, K = 40 }) {
    const speeds = [0.2, 0.45, 0.8, 1.4];
    if (engine === 'canvas') {
      const c = document.createElement('canvas'); c.width = W; c.height = H; document.body.appendChild(c);
      const ctx = c.getContext('2d', { willReadFrequently: true }); // CPU raster, deterministic (a readback every frame would switch Chromium to it anyway)
      const imgs = await Promise.all([0, 1, 2, 3].map((k) => fetch(`${B}/layer${k}.png`).then((r) => r.blob()).then(createImageBitmap)));
      const draw = (t) => { ctx.fillStyle = '#e9eef7'; ctx.fillRect(0, 0, W, H); imgs.forEach((im, k) => { const off = -((t * 4 * speeds[k]) % im.width); for (let x = off; x < W; x += im.width) ctx.drawImage(im, x, H - im.height * 1.8, im.width, im.height * 1.8); }); };
      const res = timeFrames(K, (t) => { draw(t); ctx.getImageData(0, 0, 1, 1); });
      c.remove(); return res;
    }
    const { app, frame } = await pixiApp();
    app.renderer.background.color = '#e9eef7';
    const tex = await Promise.all([0, 1, 2, 3].map((k) => Assets.load(`${B}/layer${k}.png`)));
    const layers = tex.map((t) => { const s = new TilingSprite({ texture: t, width: W, height: t.height * 1.8 }); s.tileScale.set(1, 1.8); s.y = H - t.height * 1.8; app.stage.addChild(s); return s; });
    const res = timeFrames(K, (t) => { layers.forEach((l, k) => { l.tilePosition.x = -t * 4 * speeds[k]; }); return frame(); });
    app.destroy(true, { children: true, texture: false });
    return res;
  },

  // Tile map: 256 x 256 map of 32 px tiles (65,536 tiles), viewport 1280 x 720, scrolling diagonally.
  async tilemap({ mode, K = 40 }) {
    const T = 32, MW = 256, MH = 256;
    const r = rng(9);
    const map = new Uint8Array(MW * MH).map(() => Math.floor(r() * 16));
    const pos = (t) => [(t * 7) % (MW * T - W), (t * 3) % (MH * T - H)];
    if (mode.startsWith('canvas')) {
      const c = document.createElement('canvas'); c.width = W; c.height = H; document.body.appendChild(c);
      const ctx = c.getContext('2d', { willReadFrequently: true }); // CPU raster, deterministic (a readback every frame would switch Chromium to it anyway)
      const ts = await fetch(`${B}/tileset.png`).then((x) => x.blob()).then(createImageBitmap);
      let draw;
      if (mode === 'canvas-tiles') {
        draw = (t) => { const [cx, cy] = pos(t); const x0 = Math.floor(cx / T), y0 = Math.floor(cy / T); for (let y = y0; y <= y0 + H / T + 1 && y < MH; y++) for (let x = x0; x <= x0 + W / T + 1 && x < MW; x++) { const k = map[y * MW + x]; ctx.drawImage(ts, (k % 4) * T, Math.floor(k / 4) * T, T, T, x * T - cx, y * T - cy, T, T); } };
      } else {
        // chunk cache: 16 x 16 tiles pre-rendered into 512 px canvases on first use
        const CH = 16, cache = new Map();
        const chunk = (cx, cy) => { const key = cy * 1000 + cx; let cv = cache.get(key); if (!cv) { cv = new OffscreenCanvas(CH * T, CH * T); const g = cv.getContext('2d'); for (let y = 0; y < CH; y++) for (let x = 0; x < CH; x++) { const k = map[(cy * CH + y) * MW + cx * CH + x]; g.drawImage(ts, (k % 4) * T, Math.floor(k / 4) * T, T, T, x * T, y * T, T, T); } cache.set(key, cv); } return cv; };
        draw = (t) => { const [cx, cy] = pos(t); const s = CH * T; for (let y = Math.floor(cy / s); y * s < cy + H; y++) for (let x = Math.floor(cx / s); x * s < cx + W; x++) ctx.drawImage(chunk(x, y), x * s - cx, y * s - cy); };
      }
      const res = timeFrames(K, (t) => { draw(t); ctx.getImageData(0, 0, 1, 1); });
      c.remove(); return res;
    }
    const { app, frame } = await pixiApp();
    const base = await Assets.load(`${B}/tileset.png`);
    const tt = Array.from({ length: 16 }, (_, k) => new Texture({ source: base.source, frame: new Rectangle((k % 4) * T, Math.floor(k / 4) * T, T, T) }));
    const world = new Container(); app.stage.addChild(world);
    if (mode === 'pixi-all') {
      // every tile a Sprite, culling on: the naive scene graph
      for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) { const s = new Sprite(tt[map[y * MW + x]]); s.x = x * T; s.y = y * T; s.cullable = true; world.addChild(s); }
      app.stage.cullable = false;
      const { Culler } = await import('pixi.js');
      const res = timeFrames(K, (t) => { const [cx, cy] = pos(t); world.x = -cx; world.y = -cy; Culler.shared.cull(app.stage, { x: 0, y: 0, width: W, height: H }); return frame(); });
      app.destroy(true, { children: true, texture: false }); return { ...res, sprites: MW * MH };
    }
    // pixi-visible: a pool of sprites covering the viewport only, re-textured when the camera moves (what a tilemap renderer does)
    const cols = W / T + 2, rows = Math.ceil(H / T) + 2;
    const pool = Array.from({ length: cols * rows }, () => { const s = new Sprite(tt[0]); world.addChild(s); return s; });
    const res = timeFrames(K, (t) => { const [cx, cy] = pos(t); const x0 = Math.floor(cx / T), y0 = Math.floor(cy / T); let i = 0; for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) { const s = pool[i++]; const mx = Math.min(MW - 1, x0 + x), my = Math.min(MH - 1, y0 + y); s.texture = tt[map[my * MW + mx]]; s.x = mx * T - cx; s.y = my * T - cy; } return frame(); });
    app.destroy(true, { children: true, texture: false });
    return { ...res, sprites: pool.length };
  },

  // 9-slice panels at several sizes: Pixi NineSliceSprite, for comparison with CSS border-image in the same page (screenshot).
  async nineslice() {
    const { app, frame } = await pixiApp();
    const tex = await Assets.load(`${B}/panel.png`);
    const sizes = [[96, 96, 20, 20], [300, 120, 140, 20], [180, 260, 470, 20], [520, 90, 20, 320], [400, 220, 570, 320]];
    let x = 20;
    sizes.forEach(([w, h, x, y]) => { const p = new NineSliceSprite({ texture: tex, leftWidth: 28, rightWidth: 28, topHeight: 28, bottomHeight: 28, width: w, height: h }); p.x = x; p.y = y; app.stage.addChild(p); });
    const calls = frame().calls;
    // the CSS twin
    const div = document.createElement('div');
    div.style.cssText = `position:absolute;left:0;top:${H}px;width:${W}px;height:${H}px;background:#1b1f33`;
    sizes.forEach(([w, h, x, y]) => { const p = document.createElement('div'); p.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;box-sizing:border-box;border:28px solid transparent;border-image:url(${B}/panel.png) 28 fill / 28px stretch`; div.appendChild(p); });
    document.body.appendChild(div);
    await new Promise((r) => setTimeout(r, 300));
    return { drawCalls: calls };
  },

  // Atlas bleeding: tile t00 (green) is drawn edge to edge from an atlas where magenta tiles surround it, under the
  // transforms a page really applies (scale 0.8, a half-pixel camera, mipmapped 0.3 scale, 2x nearest for pixel
  // art). Counts pixels inside the tiled area that picked up magenta (bleed) or went dark (seam: transparent padding
  // sampled, or a gap between tiles).
  async bleed({ variant, mode }) {
    const meta = await fetch(`${B}/bleed.json`).then((r) => r.json());
    const v = meta[variant];
    const bmp = await createImageBitmap(await fetch(`${B}/bleed-${variant}.png`).then((r) => r.blob()), { premultiplyAlpha: 'none' });
    const CW = 640, CH = 360;
    const [engine, scaleS, offS] = mode.split(':');
    const s = Number(scaleS), off = Number(offS);
    const step = 32 * s, n = Math.floor((Math.min(CW, CH) - 8) / step);
    const place = (i) => off + 4 + i * step;
    let px;
    if (engine === 'canvas') {
      const c = document.createElement('canvas'); c.width = CW; c.height = CH;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.fillStyle = '#000'; g.fillRect(0, 0, CW, CH);
      g.imageSmoothingEnabled = true;
      const { x, y, w, h } = v.frame;
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) g.drawImage(bmp, x, y, w, h, place(i), place(j), step, step);
      px = g.getImageData(0, 0, CW, CH).data;
    } else {
      const app = new Application();
      await app.init({ width: CW, height: CH, preference: 'webgl', antialias: false, autoStart: false, background: '#000000', resolution: 1, preserveDrawingBuffer: true });
      const mip = engine === 'pixi-mip';
      const source = new ImageSource({ resource: bmp, scaleMode: engine === 'pixi-nearest' ? 'nearest' : 'linear', autoGenerateMipmaps: mip, alphaMode: 'premultiply-alpha-on-upload' });
      const tex = new Texture({ source, frame: new Rectangle(v.frame.x, v.frame.y, v.frame.w, v.frame.h) });
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const sp = new Sprite(tex); sp.x = place(i); sp.y = place(j); sp.width = step; sp.height = step; sp.roundPixels = false; app.stage.addChild(sp); }
      app.renderer.render(app.stage);
      const gl = app.renderer.gl;
      const buf = new Uint8Array(CW * CH * 4);
      gl.readPixels(0, 0, CW, CH, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      // flip to top-down rows so the same rectangle test applies
      px = new Uint8Array(buf.length);
      for (let row = 0; row < CH; row++) px.set(buf.subarray((CH - 1 - row) * CW * 4, (CH - row) * CW * 4), row * CW * 4);
      app.destroy(true, { children: true, texture: true });
    }
    // interior of the tiled block, one pixel in from its outer edge
    const x0 = Math.ceil(place(0)) + 1, x1 = Math.floor(place(n)) - 1;
    let total = 0, bleed = 0, seam = 0;
    for (let y = x0; y < x1; y++) for (let x = x0; x < x1; x++) {
      const i = (y * CW + x) * 4, r = px[i], g = px[i + 1], b = px[i + 2];
      total++;
      if (r > 16 || b > 16) bleed++;
      else if (g < 170) seam++;
    }
    return { bleedPct: (100 * bleed) / total, seamPct: (100 * seam) / total, pixels: total, tiles: n * n };
  },

  // Spine: render spineboy's 'run' at a fixed display scale, either live (skeletal) or capture it to frames.
  async spineLoad() {
    Assets.add({ alias: 'sbData', src: '/cache/spine/spineboy-pro.skel' });
    Assets.add({ alias: 'sbAtlas', src: '/cache/spine/spineboy-pma.atlas' });
    const t0 = performance.now();
    await Assets.load(['sbData', 'sbAtlas']);
    return performance.now() - t0;
  },

  async spineCapture({ fps = 30, scale = 0.4 }) {
    await lab.spineLoad();
    const { app } = await pixiApp();
    const sb = Spine.from({ skeleton: 'sbData', atlas: 'sbAtlas', scale, autoUpdate: false });
    const entry = sb.state.setAnimation(0, 'run', true);
    const dur = entry.animation.duration;
    const n = Math.round(dur * fps);
    const box = { w: 360, h: 320 };
    sb.x = box.w / 2; sb.y = box.h - 8;
    app.stage.addChild(sb);
    const out = [];
    sb.update(0);
    for (let i = 0; i < n; i++) {
      const rt = RenderTexture.create({ width: box.w, height: box.h });
      app.renderer.render({ container: app.stage, target: rt, clear: true, clearColor: [0, 0, 0, 0] });
      out.push(await app.renderer.extract.base64({ target: rt, format: 'png' }));
      rt.destroy(true);
      sb.update(1 / fps);
    }
    const animations = sb.skeleton.data.animations.map((a) => [a.name, Math.round(a.duration * 1000) / 1000]);
    app.destroy(true, { children: true, texture: false });
    return { frames: out, duration: dur, animations };
  },

  async spineDraw({ mode, n = 50, K = 30, scale = 0.4 }) {
    const { app, frame } = await pixiApp();
    const r = rng(3);
    let items, step;
    if (mode === 'skeletal') {
      await lab.spineLoad();
      items = Array.from({ length: n }, () => { const s = Spine.from({ skeleton: 'sbData', atlas: 'sbAtlas', scale, autoUpdate: false }); s.state.setAnimation(0, 'run', true); s.update(r()); s.x = 128 + r() * (W - 256); s.y = 240 + r() * (H - 250); app.stage.addChild(s); return s; });
      step = () => { for (const s of items) s.update(1 / 30); };
    } else {
      const json = await fetch('/build/spineboy-run/atlas.json').then((x) => x.json());
      const base = await Assets.load('/build/spineboy-run/atlas.png');
      const sheet = new Spritesheet(base, json); await sheet.parse();
      const tex = sheet.animations.run;
      items = Array.from({ length: n }, () => { const s = new AnimatedSprite(tex); s.autoUpdate = false; s.anchor.set(0.5, 1); s.gotoAndStop(Math.floor(r() * tex.length)); s.x = 128 + r() * (W - 256); s.y = 248 + r() * (H - 250); app.stage.addChild(s); return s; });
      step = () => { for (const s of items) s.gotoAndStop((s.currentFrame + 1) % s.totalFrames); };
    }
    // Split CPU (animation update) from the render+sync.
    const upd = [];
    const res = timeFrames(K, () => { const t0 = performance.now(); step(); upd.push(performance.now() - t0); return frame(); });
    app.destroy(true, { children: true, texture: false });
    return { ...res, updateMs: median(upd) };
  },
};
window.lab = lab;
window.labReady = true;
