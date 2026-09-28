// Page bodies for Part B. The stage is 300 × 150 CSS px in every variant.
const CSS_TOGGLE = `
#toggle { all: unset; box-sizing: border-box; display: block; width: 300px; height: 150px; cursor: pointer; border-radius: 75px; }
#toggle:focus-visible { outline: 3px solid #1a73e8; outline-offset: 4px; }
#toggle svg { display: block; width: 100%; height: 100%; }
#toggle .track { fill: #c9ced6; transition: fill 240ms cubic-bezier(0.2, 0, 0, 1); }
#toggle .knob { fill: #fff; transform: translateX(0); transition: transform 240ms cubic-bezier(0.2, 0, 0, 1), r 100ms; filter: drop-shadow(0 2px 3px rgb(0 0 0 / .3)); }
@media (hover: hover) and (pointer: fine) { #toggle:hover .track { fill: #b4bbc6; } }
#toggle:active .knob { r: 52px; }
#toggle[aria-checked="true"] .track { fill: #2e7d32; }
#toggle[aria-checked="true"] .knob { transform: translateX(150px); }
@media (prefers-reduced-motion: reduce) { #toggle .knob { transition: transform 150ms linear; } } /* a toggle knob is essential feedback: kept, shortened */`;
const SPRITE = `
#toggle { all: unset; display: block; width: 150px; height: 150px; cursor: pointer; background: url(/captures/b/sprite.webp) 0 0 / 3100% 100% no-repeat; }
#toggle:focus-visible { outline: 3px solid #1a73e8; outline-offset: 4px; }
#toggle[aria-checked="true"] { animation: on 500ms steps(30) forwards; }
#toggle[aria-checked="false"].was { animation: off 500ms steps(30) forwards; }
@keyframes on { from { background-position-x: 0; } to { background-position-x: 100%; } }
@keyframes off { from { background-position-x: 100%; } to { background-position-x: 0; } }
@media (prefers-reduced-motion: reduce) { #toggle[aria-checked] { animation-duration: 1ms; } }`;
export const BODY = {
  'rive-canvas': { body: '<canvas id="c" width="600" height="300" style="width:300px;height:150px"></canvas>', css: '' },
  'rive-canvas-lite': { body: '<canvas id="c" width="600" height="300" style="width:300px;height:150px"></canvas>', css: '' },
  'rive-webgl2': { body: '<canvas id="c" width="600" height="300" style="width:300px;height:150px"></canvas>', css: '' },
  'rive-react': { body: '<div id="stage" style="width:300px;height:150px"></div>', css: '' },
  'lottie-svg': { body: '<div id="stage" style="width:300px;height:150px"></div>', css: '' },
  'lottie-light': { body: '<div id="stage" style="width:300px;height:150px"></div>', css: '' },
  dotlottie: { body: '<canvas id="c" style="width:300px;height:150px"></canvas>', css: '' },
  'css-svg': { body: `<button id="toggle" role="switch" aria-checked="false" aria-label="Dark mode"><svg viewBox="0 0 300 150" aria-hidden="true"><rect class="track" x="0" y="0" width="300" height="150" rx="75"/><circle class="knob" cx="75" cy="75" r="56"/></svg></button>`, css: CSS_TOGGLE },
  sprite: { body: '<button id="toggle" role="switch" aria-checked="false" aria-label="Dark mode"></button>', css: SPRITE },
};
