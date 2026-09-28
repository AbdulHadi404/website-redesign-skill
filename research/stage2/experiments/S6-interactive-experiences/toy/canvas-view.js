// Canvas view: draws the cake, the palette and the toppings; handles pointer
// drag (and, optionally, tap-to-place); owns the "juice" layer (pop on drop,
// particles, poof on removal). Renders on demand: nothing runs at rest.
import { KINDS, onCake } from './model.js';

const W = 480, H = 530, CX = 240, CY = 220, R = 180, ICON = 26, ITEM = 22;
const PALETTE_Y = 462, PALETTE_X = [75, 185, 295, 405];

export function createCanvasView(model, canvas, opts = {}) {
  const { tapToPlace = false, juice = 'always', interactive = true, onTapState = () => {} } = opts;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const HH = interactive ? H : 420;
  canvas.width = W * dpr; canvas.height = HH * dpr;
  canvas.style.width = '100%'; canvas.style.maxWidth = W + 'px'; canvas.style.height = 'auto';
  const ctx = canvas.getContext('2d');
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  const juicy = () => juice === 'always' || !mq.matches;
  const toPx = (x, y) => [CX + x * R, CY + y * R];
  const toCake = (px, py) => [(px - CX) / R, (py - CY) / R];
  const particles = [];
  const frameHooks = new Set();
  let drag = null, hover = null, armed = null, raf = 0, wobble = 0, frames = 0;

  function burst(x, y, n, colour) {
    if (!juicy()) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 1.5 + Math.random() * 2.5;
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, life: 1, colour });
    }
  }
  model.on((evt) => {
    if (evt.type === 'add') { const [px, py] = toPx(evt.item.x, evt.item.y); burst(px, py, 10, '#f2c14e'); }
    if (evt.type === 'remove') { const [px, py] = toPx(evt.item.x, evt.item.y); burst(px, py, 8, '#bbb'); }
    invalidate();
  });

  // ---------- drawing ----------
  function drawKind(kind, x, y, s = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (kind === 'strawberry') {
      ctx.fillStyle = '#d7263d'; ctx.beginPath(); ctx.moveTo(0, 16); ctx.bezierCurveTo(-20, 2, -16, -14, 0, -10); ctx.bezierCurveTo(16, -14, 20, 2, 0, 16); ctx.fill();
      ctx.fillStyle = '#2e8540'; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.ellipse(i * 6, -12, 4, 7, i * 0.6, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#ffe9a8'; for (const [a, b] of [[-5, 0], [4, 3], [-1, 8], [6, -4]]) { ctx.fillRect(a, b, 2, 2); }
    } else if (kind === 'candle') {
      ctx.fillStyle = '#4a7bd0'; ctx.fillRect(-6, -10, 12, 26);
      ctx.fillStyle = '#fff'; for (let i = 0; i < 3; i++) ctx.fillRect(-6, -6 + i * 8, 12, 3);
      ctx.fillStyle = '#ff9f1c'; ctx.beginPath(); ctx.ellipse(0, -17, 4, 7, 0, 0, Math.PI * 2); ctx.fill();
    } else if (kind === 'flower') {
      ctx.fillStyle = '#e86fa6'; for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; ctx.beginPath(); ctx.ellipse(Math.cos(a) * 9, Math.sin(a) * 9, 8, 6, a, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#f7d046'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = '#f7b801'; ctx.beginPath();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 7 : 17, a = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  function popScale(it, now) {
    if (!juicy()) return 1;
    const t = (now - it.born) / 260;
    if (t >= 1) return 1;
    return 1 + 0.35 * Math.cos(t * Math.PI * 1.5) * (1 - t);
  }
  function render(now = performance.now()) {
    frames++;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#fbf3e4'; ctx.fillRect(0, 0, W, HH);
    // plate and cake (top view)
    ctx.fillStyle = '#e4ddd0'; ctx.beginPath(); ctx.arc(CX, CY + 6, R + 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f6d7e0'; ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#e8b3c4'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(CX, CY, R - 6, 0, Math.PI * 2); ctx.stroke();
    // palette
    if (interactive) {
    ctx.fillStyle = '#efe6d3'; ctx.fillRect(0, PALETTE_Y - 44, W, H - PALETTE_Y + 44);
    ctx.font = '600 14px system-ui, sans-serif'; ctx.textAlign = 'center';
    KINDS.forEach((k, i) => {
      const x = PALETTE_X[i];
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, PALETTE_Y - 8, ICON + 4, 0, Math.PI * 2); ctx.fill();
      if (armed === k.id) { ctx.strokeStyle = '#1f5fd1'; ctx.lineWidth = 3; ctx.stroke(); }
      drawKind(k.id, x, PALETTE_Y - 8, 1);
      ctx.fillStyle = '#3b2f2a'; ctx.fillText(k.name, x, PALETTE_Y + 40);
    });
    }
    // items
    const w = wobble ? Math.sin(now / 120) * 0.02 : 0;
    for (const it of model.state.items) {
      if (drag && drag.type === 'move' && drag.id === it.id && drag.moved) continue;
      if (wobble) it.y += w * (it.id % 2 ? 1 : -1) * 0.05;
      const [px, py] = toPx(it.x, it.y);
      if (model.state.selected === it.id || hover === it.id) {
        ctx.strokeStyle = model.state.selected === it.id ? '#1f5fd1' : '#8a6d5a'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.arc(px, py, ITEM + 6, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      }
      drawKind(it.kind, px, py, popScale(it, now));
    }
    // dragged ghost
    if (drag && drag.moved) {
      ctx.globalAlpha = onCake(...toCake(drag.x, drag.y)) ? 1 : 0.5;
      drawKind(drag.kind, drag.x, drag.y, juicy() ? 1.15 : 1);
      ctx.globalAlpha = 1;
    }
    // particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life -= 0.04;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      ctx.globalAlpha = p.life; ctx.fillStyle = p.colour; ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    ctx.globalAlpha = 1;
    for (const fn of frameHooks) fn(now);
  }
  function animating(now) {
    return wobble || particles.length > 0 || (drag && drag.moved) ||
      (juicy() && model.state.items.some((it) => now - it.born < 260));
  }
  function loop(now) {
    raf = 0; render(now);
    if (animating(now)) raf = requestAnimationFrame(loop);
  }
  function invalidate() { if (!raf) raf = requestAnimationFrame(loop); }

  // ---------- pointer ----------
  const local = (e) => { const r = canvas.getBoundingClientRect(), k = W / r.width; return [(e.clientX - r.left) * k, (e.clientY - r.top) * k]; };
  const hitPalette = (x, y) => KINDS.findIndex((k, i) => Math.hypot(x - PALETTE_X[i], y - (PALETTE_Y - 8)) < ICON + 8);
  const hitItem = (x, y) => {
    for (let i = model.state.items.length - 1; i >= 0; i--) {
      const it = model.state.items[i]; const [px, py] = toPx(it.x, it.y);
      if (Math.hypot(x - px, y - py) < ITEM + 6) return it;
    }
    return null;
  };
  if (interactive) {
  canvas.addEventListener('pointerdown', (e) => {
    const [x, y] = local(e);
    const p = hitPalette(x, y), it = p < 0 ? hitItem(x, y) : null;
    drag = { sx: x, sy: y, x, y, moved: false, type: p >= 0 ? 'new' : it ? 'move' : 'none', kind: p >= 0 ? KINDS[p].id : it?.kind, id: it?.id };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    const [x, y] = local(e);
    if (!drag) {
      const it = hitItem(x, y); const h = it ? it.id : null;
      canvas.style.cursor = it || hitPalette(x, y) >= 0 ? 'grab' : 'default';
      if (h !== hover) { hover = h; invalidate(); }
      return;
    }
    drag.x = x; drag.y = y;
    if (!drag.moved && Math.hypot(x - drag.sx, y - drag.sy) > 5 && drag.type !== 'none') { drag.moved = true; canvas.style.cursor = 'grabbing'; }
    if (drag.moved) invalidate();
  });
  const end = (e) => {
    if (!drag) return;
    const d = drag; drag = null; canvas.style.cursor = 'default';
    const [cx, cy] = toCake(d.x, d.y);
    if (d.moved) {
      if (d.type === 'new' && onCake(cx, cy)) model.add(d.kind, cx, cy, { exact: true });
      else if (d.type === 'move') onCake(cx, cy) ? model.move(d.id, cx, cy) : model.remove(d.id);
      invalidate(); return;
    }
    if (!tapToPlace) { invalidate(); return; }
    // single-pointer alternative to dragging (WCAG 2.5.7): tap a source, then tap a target
    if (d.type === 'new') { armed = armed === d.kind ? null : d.kind; model.select(null); }
    else if (d.type === 'move') { armed = null; model.select(model.state.selected === d.id ? null : d.id); }
    else if (onCake(cx, cy) && armed) { model.add(armed, cx, cy, { exact: true }); }
    else if (onCake(cx, cy) && model.state.selected) { model.move(model.state.selected, cx, cy); }
    else { armed = null; model.select(null); }
    onTapState({ armed, selected: model.state.selected });
    invalidate();
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', () => { drag = null; invalidate(); });
  }
  mq.addEventListener?.('change', invalidate);
  invalidate();

  return {
    canvas, toPx, W, H, R, ITEM, ICON, PALETTE_X, PALETTE_Y,
    get armed() { return armed; },
    disarm() { armed = null; invalidate(); },
    invalidate, render, onFrame(fn) { frameHooks.add(fn); return () => frameHooks.delete(fn); },
    setWobble(v, { quiet = false } = {}) { wobble = v; if (!quiet) invalidate(); },
    get frames() { return frames; },
    get particles() { return particles.length; },
  };
}
