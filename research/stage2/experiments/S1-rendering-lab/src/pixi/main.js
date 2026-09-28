// PixiJS v8: one Sprite per decoration from a Spritesheet (auto-batched into few draw calls),
// Pixi's federated events for hover/drag, app.ticker for bob and particles.
import { Application, Assets, Sprite, Container, Circle, UPDATE_PRIORITY } from 'pixi.js';
import {
  W, H, BOB_AMP, HOVER_SCALE, SEL_SCALE, HIT_R, P_COUNT, FREEZE, ASSETS,
  readParams, installHarness, Model, particle, clampX, clampY, itemLabel,
} from '../shared/scene.js';
import { attachKeyboard } from '../shared/a11y.js';

if (__PIXIA11Y__) await import('pixi.js/accessibility');

const params = readParams();
const lab = installHarness(__VARIANT__, params);
const stage = document.getElementById('stage');

const app = new Application();
await app.init({
  width: W, height: H, background: '#f3e3cf', antialias: false, hello: false,
  resolution: Math.min(devicePixelRatio || 1, 2), autoDensity: true, preference: 'webgl',
  ...(__PIXIA11Y__ ? { accessibilityOptions: { enabledByDefault: true, deactivateOnMouseMove: false } } : {}),
});
lab.info.renderer = `pixi-${app.renderer.name}`;
app.canvas.style.touchAction = 'none';
app.canvas.style.display = 'block';
stage.append(app.canvas);
for (const t of ['pointerdown', 'pointermove', 'pointerup']) app.canvas.addEventListener(t, lab.input, { capture: true });

const [bgTex, sheet] = await Promise.all([Assets.load(ASSETS + 'bg.png'), Assets.load(ASSETS + 'atlas.json')]);
app.stage.addChild(new Sprite(bgTex));
const layer = new Container();
const fx = new Container();
app.stage.addChild(layer, fx);

const m = new Model(params.n, params.reduced);
const now = () => (params.freeze ? FREEZE.t : performance.now());
const ring = new Sprite(sheet.textures.ring);
ring.anchor.set(0.5); ring.visible = false; ring.eventMode = 'none';
const sprites = m.items.map((it) => {
  const s = new Sprite(sheet.textures[it.frame]);
  s.anchor.set(0.5);
  s.position.set(it.x, it.y);
  s.eventMode = 'static';
  s.cursor = 'pointer';
  s.hitArea = new Circle(0, 0, HIT_R);
  s.on('pointerover', () => { m.hovered = it.id; invalidate(); });
  s.on('pointerout', () => { if (m.hovered === it.id) m.hovered = -1; invalidate(); });
  s.on('pointerdown', (e) => {
    select(it.id);
    m.drag = { id: it.id, ox: e.global.x - it.x, oy: e.global.y - it.y };
    lab.picked.push(it.id);
    invalidate();
  });
  if (__PIXIA11Y__) {
    s.accessible = true; s.accessibleType = 'button'; s.accessibleTitle = itemLabel(it, params.n); s.tabIndex = 0;
    s.on('pointertap', () => { select(it.id); invalidate(); });
  }
  layer.addChild(s);
  return s;
});
layer.addChild(ring);

function select(id) {
  m.selected = id;
  if (id < 0) { ring.visible = false; return; }
  m.raise(id);
  layer.addChild(sprites[id]);                           // raise to top
  layer.addChildAt(ring, layer.getChildIndex(sprites[id])); // ring just below it
  ring.visible = true;
}

app.stage.eventMode = 'static';
app.stage.hitArea = app.screen;
app.stage.on('pointerdown', (e) => { if (e.target === app.stage) { select(-1); invalidate(); } });
app.stage.on('globalpointermove', (e) => {
  if (!m.drag) return;
  const it = m.items[m.drag.id];
  it.x = clampX(e.global.x - m.drag.ox); it.y = clampY(e.global.y - m.drag.oy);
  invalidate();
});
const end = () => { if (m.up(now())) lab.drop(); invalidate(); };
app.stage.on('pointerup', end);
app.stage.on('pointerupoutside', end);

// Particles: a pool of sprites, positioned from the shared particle() function.
const pool = [];
const spark = (k) => {
  while (pool.length <= k) { const p = new Sprite(sheet.textures.spark); p.anchor.set(0.5); p.eventMode = 'none'; fx.addChild(p); pool.push(p); }
  return pool[k];
};

function update() {
  const t = now();
  m.prune(t);
  for (const it of m.items) {
    const s = sprites[it.id];
    s.x = it.x; s.y = m.y(it, t);
    s.scale.set(m.scale(it.id));
  }
  if (m.selected >= 0) { const s = sprites[m.selected]; ring.position.set(s.x, s.y); ring.scale.set(s.scale.x); }
  let k = 0;
  for (const b of m.bursts) {
    const age = t - b.t0;
    for (let i = 0; i < P_COUNT; i++) {
      const p = particle(i, age); if (!p) continue;
      const s = spark(k++); s.visible = true; s.position.set(b.x + p.dx, b.y + p.dy); s.alpha = p.alpha; s.scale.set(p.scale);
    }
  }
  for (; k < pool.length; k++) pool[k].visible = false;
}

let first = true;
let t0 = null;
app.ticker.add(() => { t0 = performance.now(); }, null, UPDATE_PRIORITY.HIGH);
app.renderer.runners.postrender.add({ postrender() { if (t0 != null) { lab.cpu(performance.now() - t0); t0 = null; } if (first) { first = false; lab.markFirstFrame(); } } });

let scheduled = false;
function invalidate() {
  if (!(params.reduced || params.freeze) || scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => { scheduled = false; update(); app.render(); });
}

if (params.freeze) {
  m.freeze();
  select(m.selected);
}
if (params.reduced || params.freeze) {
  app.ticker.stop();
  update(); app.render();
} else {
  app.ticker.add(update);
}

if (__A11Y__) {
  attachKeyboard({
    host: stage, items: m.items, n: params.n, pos: (id) => m.items[id],
    actions: {
      select: (id) => { select(id); m.drag = { id, ox: 0, oy: 0 }; invalidate(); },
      move: (id, dx, dy) => { const it = m.items[id]; it.x = clampX(it.x + dx); it.y = clampY(it.y + dy); invalidate(); },
      moveTo: (id, x, y) => { const it = m.items[id]; it.x = x; it.y = y; m.drag = null; invalidate(); },
      drop: () => { if (m.up(now())) lab.drop(); invalidate(); },
    },
  });
}

lab.getItem = (id) => ({ x: m.items[id].x, y: m.items[id].y });
lab.selectedId = () => m.selected;
lab.topId = () => m.order[m.order.length - 1];
