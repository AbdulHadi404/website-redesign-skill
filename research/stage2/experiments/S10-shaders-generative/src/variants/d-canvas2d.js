// d: Canvas 2D flow-field particles with fading trails — the classic generative hero, self-authored.
// 1,400 particles advected through an analytic flow field; each frame fades the canvas slightly
// (a full-canvas fill, which is where most of the cost is) and draws short strokes.
import { run } from '../lib/hero.js';

const N = Number(new URLSearchParams(location.search).get('n') || 1400);
export default function start(bg) {
  let ctx, w = 1, h = 1, dpr = 1, px, py, age;
  const field = (x, y, t) => {
    const a = Math.sin(x * 0.0021 + t * 0.15) * 1.7 + Math.cos(y * 0.0027 - t * 0.11) * 1.3 + Math.sin((x + y) * 0.0012 + t * 0.07);
    return a;
  };
  const seed = (i) => { px[i] = Math.random() * w; py[i] = Math.random() * h; age[i] = Math.random() * 400; };
  run(bg, {
    kind: '2d',
    init(canvas) {
      ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) throw new Error('no 2d');
      px = new Float32Array(N); py = new Float32Array(N); age = new Float32Array(N);
      return { info: { renderer: 'canvas2d' } };
    },
    resize(W, H, d) {
      w = W; h = H; dpr = d;
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#09122a'); g.addColorStop(1, '#0a3440');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < N; i++) seed(i);
    },
    frame(t, dt) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(9, 18, 42, 0.06)';          // trail fade
      ctx.fillRect(0, 0, w, h);
      ctx.lineWidth = 1.2 * dpr;
      ctx.globalCompositeOperation = 'lighter';
      const step = 60 * (dt || 1 / 60) * 1.4 * dpr;
      for (let pass = 0; pass < 2; pass++) {
        ctx.strokeStyle = pass ? 'rgba(250, 133, 107, 0.35)' : 'rgba(118, 219, 214, 0.28)';
        ctx.beginPath();
        for (let i = pass; i < N; i += 2) {
          const a = field(px[i] / dpr, py[i] / dpr, t);
          const nx = px[i] + Math.cos(a) * step, ny = py[i] + Math.sin(a) * step;
          ctx.moveTo(px[i], py[i]); ctx.lineTo(nx, ny);
          px[i] = nx; py[i] = ny; age[i] -= 1;
          if (age[i] < 0 || nx < 0 || ny < 0 || nx > w || ny > h) seed(i);
        }
        ctx.stroke();
      }
    },
  });
}
