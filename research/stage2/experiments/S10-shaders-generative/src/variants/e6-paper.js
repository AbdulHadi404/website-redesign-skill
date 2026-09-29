// e6: a production shader library instead of a self-written shader — Paper Shaders' MeshGradient
// (Apache-2.0, @paper-design/shaders). The library owns the loop: it already pauses off-screen and in
// hidden tabs, caps pixel count, and resizes. It does not handle reduced motion or context loss; the
// page bootstrap covers reduced motion (it never imports this), and the lab measures the rest.
// Default minPixelRatio is 2 (it renders 2x even on 1x screens); ?paperdpr=1 measures the lower setting.
import { ShaderMount, meshGradientFragmentShader, getShaderColorFromString, ShaderFitOptions } from '@paper-design/shaders';

export default function start(bg) {
  const lab = (window.__lab ||= {});
  const q = new URLSearchParams(location.search);
  const host = document.createElement('div');
  host.className = 'fx';
  bg.append(host);
  let mount;
  try {
    mount = new ShaderMount(host, meshGradientFragmentShader, {
      u_colors: ['#09122a', '#085c6e', '#0c2d4a', '#3fa7a8', '#09122a', '#b85a4a'].map(getShaderColorFromString),
      u_colorsCount: 6, u_distortion: 0.8, u_swirl: 0.25, u_grainMixer: 0, u_grainOverlay: 0,
      u_fit: ShaderFitOptions.cover, u_scale: 1, u_rotation: 0, u_offsetX: 0, u_offsetY: 0,
      u_originX: 0.5, u_originY: 0.5, u_worldWidth: 0, u_worldHeight: 0,
    }, { alpha: false, powerPreference: 'low-power' }, q.has('still') ? 0 : 0.6, Number(q.get('t0') || 0) * 1000, Number(q.get('paperdpr') || 2));
  } catch (e) {
    lab.fallback = 'poster'; lab.failReason = e.message; host.remove();
    document.querySelector('.bg-toggle')?.setAttribute('hidden', '');
    return;
  }
  const gl = mount.gl;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  lab.info = { renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '', webgl2: true, library: 'paper' };
  lab.loseContext = () => gl.getExtension('WEBGL_lose_context');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    lab.ttff = performance.now(); host.style.opacity = '1';
    if (q.has('syncfirst')) { gl.finish(); lab.gpuFirst = performance.now(); }   // lab: when frame 1 is really done
  }));
  const toggle = document.querySelector('.bg-toggle');
  if (toggle) {
    // A plain button whose label says what it will do; no aria-pressed (APG: a toggle's label must not change).
    toggle.hidden = false; toggle.removeAttribute('aria-pressed');
    let paused = false;
    toggle.addEventListener('click', () => {
      paused = !paused; mount.setSpeed(paused ? 0 : 0.6);
      toggle.textContent = paused ? 'Play background animation' : 'Pause background animation';
    });
  }
  lab.pause = () => mount.setSpeed(0);
  lab.state = () => ({ canvas: [mount.canvasElement.width, mount.canvasElement.height] });
}
