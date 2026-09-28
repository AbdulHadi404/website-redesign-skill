// dotLottie web, DotLottieWorker: the same file rendered in a Web Worker through OffscreenCanvas.
import { DotLottieWorker } from '@lottiefiles/dotlottie-web';
const abs = (u) => new URL(u, location.href).href; // the worker resolves URLs against its own script: pass absolute ones
DotLottieWorker.setWasmUrl?.(abs('/captures/b/wasm/dotlottie-player.wasm'));
const d = new DotLottieWorker({ canvas: document.getElementById('c'), src: abs('/captures/b-assets/toggle-sm.lottie'), autoplay: false });
d.addEventListener('load', async () => { window.__loaded = performance.now(); await d.stateMachineLoad('toggle'); await d.stateMachineStart(); });
window.__d = d;
window.__toggle = async () => d.stateMachineSetBooleanInput('OnOffSwitch', !(await d.stateMachineGetBooleanInput('OnOffSwitch')));
