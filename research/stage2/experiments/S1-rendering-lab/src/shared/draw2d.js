// Canvas 2D drawing shared by the main-thread and the Worker (OffscreenCanvas) variants.
import { CELL, RING, SPARK, P_COUNT, particle } from './scene.js';

export function draw2d(ctx, m, t, atlas, bg, frames) {
  ctx.globalAlpha = 1;
  ctx.drawImage(bg, 0, 0);
  const sel = m.selected;
  for (const id of m.order) {
    const it = m.items[id];
    const s = m.scale(id);
    const y = m.y(it, t);
    if (id === sel) {
      const f = frames.ring, w = RING * s;
      ctx.drawImage(atlas, f.x, f.y, f.w, f.h, it.x - w / 2, y - w / 2, w, w);
    }
    const f = frames[it.frame], w = CELL * s;
    ctx.drawImage(atlas, f.x, f.y, f.w, f.h, it.x - w / 2, y - w / 2, w, w);
  }
  if (m.bursts.length) {
    const f = frames.spark;
    for (const b of m.bursts) {
      const age = t - b.t0;
      for (let i = 0; i < P_COUNT; i++) {
        const p = particle(i, age);
        if (!p) continue;
        ctx.globalAlpha = p.alpha;
        const w = SPARK * p.scale;
        ctx.drawImage(atlas, f.x, f.y, f.w, f.h, b.x + p.dx - w / 2, b.y + p.dy - w / 2, w, w);
      }
    }
    ctx.globalAlpha = 1;
  }
}
