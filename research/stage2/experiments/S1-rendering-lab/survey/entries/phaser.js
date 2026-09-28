import * as Phaser from 'phaser';
import { ready, IMG, host } from './_ready.js';
new Phaser.Game({
  type: Phaser.AUTO, width: 800, height: 600, parent: host(), banner: false, audio: { noAudio: true },
  scene: {
    preload() { this.load.image('a', IMG); },
    create() { this.add.image(400, 300, 'a').setInteractive({ draggable: true }); this.game.events.once('postrender', () => ready(this.game.renderer.type === Phaser.WEBGL ? 'webgl' : 'canvas')); },
  },
});
