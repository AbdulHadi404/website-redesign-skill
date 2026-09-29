import { WebGLRenderer, Scene, OrthographicCamera, Mesh, PlaneGeometry, MeshBasicMaterial, TextureLoader, SRGBColorSpace, Raycaster } from 'three';
import { ready, IMG, host } from './_ready.js';
const r = new WebGLRenderer({ antialias: false }); r.setSize(800, 600); host().append(r.domElement);
const scene = new Scene(); const cam = new OrthographicCamera(-400, 400, 300, -300, -10, 10);
const tex = await new TextureLoader().loadAsync(IMG); tex.colorSpace = SRGBColorSpace;
scene.add(new Mesh(new PlaneGeometry(512, 72), new MeshBasicMaterial({ map: tex, transparent: true })));
window.__ray = new Raycaster();
r.render(scene, cam); ready('webgl2');
