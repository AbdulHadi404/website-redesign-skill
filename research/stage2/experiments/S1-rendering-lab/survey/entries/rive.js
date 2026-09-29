// Payload only: the Rive runtime JS; its WASM is fetched separately at runtime (sized in stage-1 F §8.1).
import { Rive } from '@rive-app/canvas';
import { ready } from './_ready.js';
window.__rive = Rive; requestAnimationFrame(() => ready('js-only'));
