// Babylon's documented tree-shakeable deep imports (the root barrel is ~6× larger; stage-1 F §8.1).
import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import '@babylonjs/core/Materials/standardMaterial';
import { ready, host } from './_ready.js';
const c = document.createElement('canvas'); c.width = 800; c.height = 600; host().append(c);
const engine = new Engine(c, false);
const scene = new Scene(engine);
const cam = new FreeCamera('c', new Vector3(0, 0, -4), scene); cam.setTarget(Vector3.Zero());
new HemisphericLight('l', new Vector3(0, 1, 0), scene);
CreateBox('b', {}, scene);
scene.onAfterRenderObservable.addOnce(() => ready(engine.webGLVersion === 2 ? 'webgl2' : 'webgl'));
engine.runRenderLoop(() => scene.render());
