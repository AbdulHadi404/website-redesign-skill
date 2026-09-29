import litecanvas from 'litecanvas';
import { ready, host } from './_ready.js';
const c = document.createElement('canvas'); host().append(c);
const e = litecanvas({ canvas: c, width: 800, height: 600, global: false, loop: { draw() { e.cls(0); e.rectfill(100, 100, 48, 48, 3); ready('canvas2d'); } } });
