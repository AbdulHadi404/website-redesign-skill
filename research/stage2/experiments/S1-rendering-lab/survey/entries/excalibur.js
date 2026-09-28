import { Engine, Actor, ImageSource, Loader, DisplayMode } from 'excalibur';
import { ready, IMG, host } from './_ready.js';
const c = document.createElement('canvas'); host().append(c);
const game = new Engine({ canvasElement: c, width: 800, height: 600, displayMode: DisplayMode.Fixed, suppressPlayButton: true });
const src = new ImageSource(IMG);
const loader = new Loader([src]); loader.suppressPlayButton = true;
await game.start(loader);
const a = new Actor({ x: 400, y: 300 }); a.graphics.use(src.toSprite()); game.add(a);
game.on('postdraw', () => ready('webgl'));
