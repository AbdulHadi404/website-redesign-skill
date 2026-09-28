// Konva's documented minimal import: the core plus only the shapes used.
import Konva from 'konva/lib/Core';
import { Image as KImage } from 'konva/lib/shapes/Image';
import { ready, IMG, host } from './_ready.js';
const stage = new Konva.Stage({ container: host(), width: 800, height: 600 });
const layer = new Konva.Layer(); stage.add(layer);
const img = new Image(); img.src = IMG;
img.onload = () => { layer.add(new KImage({ image: img, x: 100, y: 100, draggable: true })); layer.draw(); requestAnimationFrame(() => ready('canvas2d')); };
