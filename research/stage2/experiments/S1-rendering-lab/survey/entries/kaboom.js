import kaboom from 'kaboom';
import { ready, IMG, host } from './_ready.js';
const c = document.createElement('canvas'); host().append(c);
const k = kaboom({ canvas: c, width: 800, height: 600, global: false, background: [240, 230, 220] });
k.loadSprite('a', IMG);
k.onLoad(() => { k.add([k.sprite('a'), k.pos(100, 100), k.area()]); k.onDraw(() => ready('webgl')); });
