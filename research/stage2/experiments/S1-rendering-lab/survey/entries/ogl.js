import { Renderer, Camera, Transform, Mesh, Plane, Program, Texture } from 'ogl';
import { ready, IMG, host } from './_ready.js';
const renderer = new Renderer({ width: 800, height: 600 }); const gl = renderer.gl; host().append(gl.canvas);
const cam = new Camera(gl, { left: -400, right: 400, top: 300, bottom: -300 }); cam.position.z = 1;
const scene = new Transform();
const img = new Image(); img.src = IMG;
img.onload = () => {
  const t = new Texture(gl, { image: img });
  const program = new Program(gl, { vertex: 'attribute vec2 uv;attribute vec3 position;uniform mat4 modelViewMatrix;uniform mat4 projectionMatrix;varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragment: 'precision highp float;uniform sampler2D t;varying vec2 vUv;void main(){gl_FragColor=texture2D(t,vUv);}', uniforms: { t: { value: t } }, transparent: true });
  const m = new Mesh(gl, { geometry: new Plane(gl, { width: 512, height: 72 }), program }); m.setParent(scene);
  renderer.render({ scene, camera: cam }); ready('webgl');
};
