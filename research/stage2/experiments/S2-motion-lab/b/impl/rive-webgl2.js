// Rive, @rive-app/webgl2: the switch (Day/Night) with its own state machine (hover + click listeners in the file).
import { Rive, RuntimeLoader } from '@rive-app/webgl2';
RuntimeLoader.setWasmUrl('/captures/b/wasm/rive-webgl2.wasm'); // self-host: the default is unpkg, then jsDelivr
const canvas = document.getElementById('c');
window.__r = new Rive({ src: '/captures/b-assets/switch.riv', canvas, stateMachines: 'Main State Machine', autoplay: true,
  onLoad: () => { window.__r.resizeDrawingSurfaceToCanvas(); window.__loaded = performance.now(); } });
window.__toggle = () => window.__r.stateMachineInputs('Main State Machine').find((i) => i.name === 'Click').fire();
