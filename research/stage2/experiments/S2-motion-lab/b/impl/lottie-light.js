// lottie-web light (SVG only): the toggle JSON; states by playing the timeline forwards or backwards.
import lottie from 'lottie-web/build/player/lottie_light';
const R = new URLSearchParams(location.search).get('renderer') || 'svg';
const anim = lottie.loadAnimation({ container: document.getElementById('stage'), renderer: R, loop: false, autoplay: false, path: '/captures/b-assets/toggle.json' });
anim.setSpeed(2);
anim.addEventListener('DOMLoaded', () => { window.__loaded = performance.now(); });
let on = false;
window.__toggle = () => { on = !on; anim.setDirection(on ? 1 : -1); anim.play(); };
document.getElementById('stage').addEventListener('pointerdown', window.__toggle);
window.__anim = anim;
