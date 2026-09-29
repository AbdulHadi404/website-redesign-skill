import RAPIER from '@dimforge/rapier2d-compat';
import { ready } from './_ready.js';
await RAPIER.init();
const world = new RAPIER.World({ x: 0, y: -9.81 });
world.createCollider(RAPIER.ColliderDesc.cuboid(10, 0.1));
world.step(); requestAnimationFrame(() => ready('physics-only'));
