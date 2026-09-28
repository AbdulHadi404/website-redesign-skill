import p5 from 'p5';
import { ready, IMG, host } from './_ready.js';
new p5((s) => {
  let img;
  s.setup = async () => { s.createCanvas(800, 600); img = await s.loadImage(IMG); };
  s.draw = () => { s.background(240); if (img) { s.image(img, 100, 100); ready('p5-2d'); } };
}, host());
