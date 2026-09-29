import { Application, Text, event } from 'melonjs';
import { ready, host } from './_ready.js';
host().id = 'screen';
const app = new Application(800, 600, { parent: 'screen', scale: 1, backgroundColor: '#f3e3cf' });
await app.init();
event.once(event.GAME_AFTER_DRAW, () => ready(app.renderer?.type || 'auto'));
app.world.addChild(new Text(400, 300, { font: 'Arial', size: 40, fillStyle: '#202020', text: 'Hello' }));
