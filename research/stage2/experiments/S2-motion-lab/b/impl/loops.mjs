// Looping illustrations (a mascot idle) for per-frame cost and reduced-motion behaviour. Same asset for the Lottie runtimes.
export const LOOPS = {
  'loop-rive': `import { Rive, RuntimeLoader } from '@rive-app/canvas'; RuntimeLoader.setWasmUrl('/captures/b/wasm/rive-canvas.wasm');
    window.__r = new Rive({ src: '/captures/b-assets/truck.riv', canvas: document.getElementById('c'), stateMachines: 'drive', autoplay: true, onLoad: () => { window.__r.resizeDrawingSurfaceToCanvas(); window.__loaded = performance.now(); } });`,
  'loop-lottie-svg': `import lottie from 'lottie-web'; const a = lottie.loadAnimation({ container: document.getElementById('stage'), renderer: 'svg', loop: true, autoplay: true, path: '/captures/b-assets/hamster.json' }); a.addEventListener('DOMLoaded', () => { window.__loaded = performance.now(); });`,
  'loop-lottie-canvas': `import lottie from 'lottie-web'; const a = lottie.loadAnimation({ container: document.getElementById('stage'), renderer: 'canvas', loop: true, autoplay: true, path: '/captures/b-assets/hamster.json' }); a.addEventListener('DOMLoaded', () => { window.__loaded = performance.now(); });`,
  'loop-dotlottie': `import { DotLottie } from '@lottiefiles/dotlottie-web'; DotLottie.setWasmUrl('/captures/b/wasm/dotlottie-player.wasm');
    const d = new DotLottie({ canvas: document.getElementById('c'), src: '/captures/b-assets/hamster.lottie', autoplay: true, loop: true }); d.addEventListener('load', () => { window.__loaded = performance.now(); });`,
  'loop-dotlottie-worker': `import { DotLottieWorker } from '@lottiefiles/dotlottie-web'; DotLottieWorker.setWasmUrl?.('/captures/b/wasm/dotlottie-player.wasm');
    const d = new DotLottieWorker({ canvas: document.getElementById('c'), src: '/captures/b-assets/hamster.lottie', autoplay: true, loop: true }); d.addEventListener('load', () => { window.__loaded = performance.now(); });`,
  'rive-semantics': `import { Rive, RuntimeLoader } from '@rive-app/canvas'; RuntimeLoader.setWasmUrl('/captures/b/wasm/rive-canvas.wasm');
    window.__r = new Rive({ src: '/captures/b-assets/semantic.riv', canvas: document.getElementById('c'), stateMachines: 'State Machine 1', autoplay: true, semanticsMode: 'enabled', semanticsOptions: { riveCanvasLabel: 'Alerts demo' }, onLoad: () => { window.__r.resizeDrawingSurfaceToCanvas(); window.__loaded = performance.now(); } });`,
};
