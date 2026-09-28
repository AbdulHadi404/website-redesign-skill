// dotLottie web: the .lottie toggle with its embedded state machine (PointerDown toggles OnOffSwitch).
import { DotLottie } from '@lottiefiles/dotlottie-web';
DotLottie.setWasmUrl('/captures/b/wasm/dotlottie-player.wasm'); // self-host: the default is jsDelivr/unpkg
const d = new DotLottie({ canvas: document.getElementById('c'), src: '/captures/b-assets/toggle-sm.lottie', autoplay: false });
d.addEventListener('load', () => { window.__loaded = performance.now(); d.stateMachineLoad('toggle'); d.stateMachineStart(); });
window.__d = d;
window.__toggle = () => d.stateMachineSetBooleanInput('OnOffSwitch', !d.stateMachineGetBooleanInput('OnOffSwitch'));
