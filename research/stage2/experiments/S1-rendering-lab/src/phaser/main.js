// Phaser 4: one Image per decoration from a texture atlas, Phaser's input plugin for hover and drag,
// the Scene update loop for bob and particles.
import * as Phaser from 'phaser';
import {
  W, H, CELL, HIT_R, P_COUNT, FREEZE, ASSETS,
  readParams, installHarness, Model, particle, clampX, clampY,
} from '../shared/scene.js';

const params = readParams();
const lab = installHarness(__VARIANT__, params);
const stage = document.getElementById('stage');
const m = new Model(params.n, params.reduced);
const now = () => (params.freeze ? FREEZE.t : performance.now());

class Decorate extends Phaser.Scene {
  preload() {
    this.load.image('bg', ASSETS + 'bg.png');
    this.load.atlas('atlas', ASSETS + 'atlas.png', ASSETS + 'atlas.json');
  }
  create() {
    const game = this.game;
    lab.info.renderer = `phaser-${game.renderer.type === Phaser.WEBGL ? 'webgl' : game.renderer.type === Phaser.CANVAS ? 'canvas' : game.renderer.type}`;
    game.canvas.style.touchAction = 'none';
    for (const t of ['pointerdown', 'pointermove', 'pointerup']) game.canvas.addEventListener(t, lab.input, { capture: true });
    this.add.image(0, 0, 'bg').setOrigin(0);
    this.ring = this.add.image(0, 0, 'atlas', 'ring').setVisible(false);
    this.imgs = m.items.map((it) => {
      const img = this.add.image(it.x, it.y, 'atlas', it.frame);
      img.setInteractive({
        hitArea: new Phaser.Geom.Circle(CELL / 2, CELL / 2, HIT_R), hitAreaCallback: Phaser.Geom.Circle.Contains,
        draggable: true, useHandCursor: true,
      });
      img.setData('id', it.id);
      img.on('pointerover', () => { m.hovered = it.id; this.invalidate(); });
      img.on('pointerout', () => { if (m.hovered === it.id) m.hovered = -1; this.invalidate(); });
      return img;
    });
    this.fx = [];
    this.input.on('pointerdown', (p, over) => { if (!over.length) { this.select(-1); this.invalidate(); } });
    this.input.on('dragstart', (p, img) => {
      const id = img.getData('id'), it = m.items[id];
      this.select(id);
      m.drag = { id, ox: 0, oy: 0 };
      lab.picked.push(id);
      this.invalidate();
    });
    this.input.on('drag', (p, img, x, y) => {
      const it = m.items[img.getData('id')];
      it.x = clampX(x); it.y = clampY(y);
      this.invalidate();
    });
    this.input.on('dragend', () => { if (m.up(now())) lab.drop(); this.invalidate(); });
    game.events.once('postrender', () => lab.markFirstFrame());
    if (params.freeze) { m.freeze(); this.select(m.selected); }
    lab.getItem = (id) => ({ x: m.items[id].x, y: m.items[id].y });
    lab.topId = () => m.order[m.order.length - 1];
    if (params.reduced || params.freeze) {
      this.update();
      game.events.once('postrender', () => game.loop.sleep());
    }
  }
  select(id) {
    m.selected = id;
    if (id < 0) { this.ring.setVisible(false); return; }
    m.raise(id);
    this.children.bringToTop(this.ring);      // ring, then the item, on top (moveBelow is a no-op when
    this.children.bringToTop(this.imgs[id]);  // the ring already sits lower in the list)
    this.ring.setVisible(true);
  }
  invalidate() {
    // Reduced motion: wake the loop for one frame, then sleep again (on-demand rendering).
    if (!(params.reduced || params.freeze)) return;
    const loop = this.game.loop;
    if (loop.running) return;
    loop.wake();
    this.game.events.once('postrender', () => loop.sleep());
  }
  update() {
    const t = now();
    m.prune(t);
    for (const it of m.items) {
      const img = this.imgs[it.id];
      img.x = it.x; img.y = m.y(it, t);
      img.setScale(m.scale(it.id));
    }
    if (m.selected >= 0) { const img = this.imgs[m.selected]; this.ring.setPosition(img.x, img.y).setScale(img.scaleX); }
    let k = 0;
    for (const b of m.bursts) {
      const age = t - b.t0;
      for (let i = 0; i < P_COUNT; i++) {
        const p = particle(i, age); if (!p) continue;
        if (!this.fx[k]) this.fx[k] = this.add.image(0, 0, 'atlas', 'spark');
        this.fx[k++].setVisible(true).setPosition(b.x + p.dx, b.y + p.dy).setAlpha(p.alpha).setScale(p.scale);
      }
    }
    for (; k < this.fx.length; k++) this.fx[k].setVisible(false);
  }
}

new Phaser.Game({
  type: Phaser.AUTO, width: W, height: H, parent: stage, backgroundColor: '#f3e3cf',
  banner: false, audio: { noAudio: true }, render: { antialias: true },
  scale: { mode: Phaser.Scale.NONE }, scene: Decorate,
});
