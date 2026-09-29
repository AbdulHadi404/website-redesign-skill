import { StaticCanvas, Canvas, FabricImage } from 'fabric';
import { ready, IMG, host } from './_ready.js';
const el = document.createElement('canvas'); el.width = 800; el.height = 600; host().append(el);
const canvas = new Canvas(el);
FabricImage.fromURL(IMG).then((img) => { canvas.add(img); canvas.renderAll(); requestAnimationFrame(() => ready('canvas2d')); });
window.__keep = StaticCanvas;
