import { Engine, Bodies, Composite, Runner } from 'matter-js';
import { ready } from './_ready.js';
const e = Engine.create(); Composite.add(e.world, [Bodies.rectangle(400, 200, 80, 80), Bodies.rectangle(400, 610, 810, 60, { isStatic: true })]);
Runner.run(Runner.create(), e); requestAnimationFrame(() => ready('physics-only'));
