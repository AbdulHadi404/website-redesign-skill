// Variant e: the same toy built the way a developer following an engine's docs
// would build it — PixiJS 8 with its built-in AccessibilitySystem left on its
// defaults, `accessible = true` and an `accessibleTitle` on every palette entry
// and topping, and a click on a palette entry adding a topping at the centre
// (the one action Pixi's accessibility layer can trigger: it maps Enter/Space on
// its overlay <button> to click / pointertap). Pointer drag as in variant a.
// Nothing else is added, so the measurements show what the engine gives.
import { Application, Container, Graphics, Text } from '/vendor/pixi.mjs';
import { KINDS, onCake } from './model.js';

const W = 480, H = 530, CX = 240, CY = 220, R = 180, ICON = 26;
const PALETTE_Y = 462, PALETTE_X = [75, 185, 295, 405];
const COL = { strawberry: 0xd7263d, leaf: 0x2e8540, candle: 0x4a7bd0, flame: 0xff9f1c, flower: 0xe86fa6, heart: 0xf7d046, star: 0xf7b801 };

function drawKind(g, kind) {
  if (kind === 'strawberry') {
    g.moveTo(0, 16).bezierCurveTo(-20, 2, -16, -14, 0, -10).bezierCurveTo(16, -14, 20, 2, 0, 16).fill(COL.strawberry);
    for (let i = -1; i <= 1; i++) g.ellipse(i * 6, -12, 4, 7).fill(COL.leaf);
  } else if (kind === 'candle') {
    g.rect(-6, -10, 12, 26).fill(COL.candle);
    for (let i = 0; i < 3; i++) g.rect(-6, -6 + i * 8, 12, 3).fill(0xffffff);
    g.ellipse(0, -17, 4, 7).fill(COL.flame);
  } else if (kind === 'flower') {
    for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; g.ellipse(Math.cos(a) * 9, Math.sin(a) * 9, 7, 7).fill(COL.flower); }
    g.circle(0, 0, 6).fill(COL.heart);
  } else {
    g.star(0, 0, 5, 17, 7).fill(COL.star);
  }
  return g;
}

export async function createPixiView(model, host, initOptions = {}) {
  const app = new Application();
  await app.init({ width: W, height: H, background: '#fbf3e4', antialias: true, resolution: Math.min(devicePixelRatio || 1, 2), autoDensity: true, preserveDrawingBuffer: true, ...initOptions });
  const canvas = app.canvas;
  canvas.style.width = '100%'; canvas.style.maxWidth = W + 'px'; canvas.style.height = 'auto'; canvas.style.touchAction = 'none';
  host.appendChild(canvas);
  let frames = 0;
  app.ticker.add(() => { frames++; });

  const stage = app.stage;
  stage.eventMode = 'static'; stage.hitArea = app.screen;
  const plate = new Graphics().circle(CX, CY + 6, R + 18).fill(0xe4ddd0).circle(CX, CY, R).fill(0xf6d7e0);
  plate.circle(CX, CY, R - 6).stroke({ width: 8, color: 0xe8b3c4 });
  stage.addChild(plate);
  const tray = new Graphics().rect(0, PALETTE_Y - 44, W, H - PALETTE_Y + 44).fill(0xefe6d3);
  stage.addChild(tray);
  const itemsLayer = new Container(); stage.addChild(itemsLayer);
  const toPx = (x, y) => [CX + x * R, CY + y * R];
  const toCake = (px, py) => [(px - CX) / R, (py - CY) / R];
  let drag = null;
  const ghost = new Container(); ghost.visible = false; stage.addChild(ghost);

  KINDS.forEach((k, i) => {
    const c = new Container();
    c.x = PALETTE_X[i]; c.y = PALETTE_Y - 8;
    c.addChild(new Graphics().circle(0, 0, ICON + 4).fill(0xffffff));
    c.addChild(drawKind(new Graphics(), k.id));
    const t = new Text({ text: k.name, style: { fontFamily: 'system-ui, sans-serif', fontSize: 14, fontWeight: '600', fill: 0x3b2f2a } });
    t.anchor.set(0.5, 0); t.y = 36; c.addChild(t);
    c.eventMode = 'static'; c.cursor = 'grab';
    c.accessible = true; c.accessibleTitle = k.name;
    c.on('pointerdown', (e) => { drag = { type: 'new', kind: k.id, sx: e.global.x, sy: e.global.y, moved: false }; });
    // Pixi's accessibility layer turns Enter on its <button> into click/pointertap.
    c.on('pointertap', () => { if (!drag || !drag.moved) model.add(k.id, 0, 0); });
    stage.addChild(c);
  });

  const nodes = new Map();
  function addNode(it) {
    const g = drawKind(new Graphics(), it.kind);
    const [x, y] = toPx(it.x, it.y); g.x = x; g.y = y;
    g.eventMode = 'static'; g.cursor = 'grab';
    g.accessible = true; g.accessibleTitle = model.describe(it);
    g.on('pointerdown', (e) => { drag = { type: 'move', id: it.id, kind: it.kind, sx: e.global.x, sy: e.global.y, moved: false }; });
    g.on('pointertap', () => { if (!drag || !drag.moved) model.select(it.id); });
    itemsLayer.addChild(g); nodes.set(it.id, g);
  }
  model.on((evt) => {
    if (evt.type === 'add') addNode(evt.item);
    if (evt.type === 'move') {
      const g = nodes.get(evt.item.id); const [x, y] = toPx(evt.item.x, evt.item.y);
      g.x = x; g.y = y; g.visible = true;
      g.accessibleTitle = model.describe(evt.item); // a diligent developer updates the title…
    }
    if (evt.type === 'remove') { const g = nodes.get(evt.item.id); g?.destroy(); nodes.delete(evt.item.id); }
  });

  stage.on('globalpointermove', (e) => {
    if (!drag) return;
    const { x, y } = e.global;
    if (!drag.moved && Math.hypot(x - drag.sx, y - drag.sy) > 5) {
      drag.moved = true;
      ghost.removeChildren(); ghost.addChild(drawKind(new Graphics(), drag.kind)); ghost.visible = true;
      if (drag.type === 'move') nodes.get(drag.id).visible = false;
    }
    if (drag.moved) { ghost.x = x; ghost.y = y; ghost.alpha = onCake(...toCake(x, y)) ? 1 : 0.5; }
  });
  const end = (e) => {
    const d = drag; if (!d) return;
    ghost.visible = false;
    if (d.moved) {
      const [cx, cy] = toCake(e.global.x, e.global.y);
      if (d.type === 'new' && onCake(cx, cy)) model.add(d.kind, cx, cy, { exact: true });
      else if (d.type === 'move') onCake(cx, cy) ? model.move(d.id, cx, cy) : model.remove(d.id);
    }
    // let pointertap (fired after pointerup) see whether this was a drag
    setTimeout(() => { drag = null; }, 0);
  };
  stage.on('pointerup', end); stage.on('pointerupoutside', end);

  return {
    app, canvas, toPx, W, H, R, ICON, PALETTE_X, PALETTE_Y,
    get frames() { return frames; },
    invalidate() {},
  };
}
