import Two from 'two.js';
import { ready, IMG, host } from './_ready.js';
const two = new Two({ type: Two.Types.canvas, width: 800, height: 600 }).appendTo(host());
const tex = new Two.Texture(IMG, () => { const r = two.makeRectangle(400, 300, 512, 72); r.fill = tex; r.noStroke(); two.update(); ready('canvas2d'); });
