import Konva from 'konva';
import { ready, IMG, host } from './_ready.js';
const stage = new Konva.Stage({ container: host(), width: 800, height: 600 });
const layer = new Konva.Layer(); stage.add(layer);
const img = new Image(); img.src = IMG;
img.onload = () => { layer.add(new Konva.Image({ image: img, x: 100, y: 100, draggable: true })); layer.draw(); requestAnimationFrame(() => ready('canvas2d')); };
