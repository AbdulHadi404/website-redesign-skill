// dotLottie web: the .lottie toggle with its embedded state machine (PointerDown toggles OnOffSwitch).
import { DotLottie, DotLottieWorker } from '@lottiefiles/dotlottie-web';
DotLottie.setWasmUrl('/captures/b/wasm/dotlottie-player.wasm'); // self-host: the default is jsDelivr/unpkg
if (DotLottieWorker.setWasmUrl) DotLottieWorker.setWasmUrl('/captures/b/wasm/dotlottie-player.wasm');
const W = new URLSearchParams(location.search).has('worker');
const canvas = document.getElementById('c');
const d = new (W ? DotLottieWorker : DotLottie)({ canvas, src: '/captures/b-assets/toggle-sm.lottie', autoplay: false, stateMachineId: 'toggle' });
d.addEventListener('load', async () => { window.__loaded = performance.now(); await d.stateMachineLoad?.('toggle'); await d.stateMachineStart?.(); });
window.__d = d;
window.__toggle = async () => { const v = await d.stateMachineGetBooleanInput('OnOffSwitch'); await d.stateMachineSetBooleanInput('OnOffSwitch', !v); };
