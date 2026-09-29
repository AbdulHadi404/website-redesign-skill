import { Application, Assets, Sprite } from 'pixi.js';
import { ready, IMG, host } from './_ready.js';
const app = new Application();
await app.init({ width: 800, height: 600, preference: 'webgl', hello: false });
host().append(app.canvas);
const s = new Sprite(await Assets.load(IMG));
s.eventMode = 'static'; s.cursor = 'pointer'; s.on('pointerdown', () => {});
app.stage.addChild(s);
app.renderer.runners.postrender.add({ postrender: () => ready(app.renderer.name) });
