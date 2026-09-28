// R3F without <Canvas>: createRoot + extend() with only the classes used. <Canvas> calls
// extend(THREE) (the whole namespace), which keeps all of three in the bundle.
import { createRoot, extend, events, addAfterEffect } from '@react-three/fiber';
import { Mesh, PlaneGeometry, MeshBasicMaterial, TextureLoader } from 'three';
import { ready, IMG, host } from './_ready.js';
extend({ Mesh, PlaneGeometry, MeshBasicMaterial });
const canvas = document.createElement('canvas'); canvas.style.cssText = 'width:800px;height:600px;display:block'; host().append(canvas);
const root = createRoot(canvas);
await root.configure({ events, orthographic: true, flat: true, size: { width: 800, height: 600, top: 0, left: 0 } });
const tex = await new TextureLoader().loadAsync(IMG);
let mounted = false;
addAfterEffect(() => { if (mounted) ready('webgl2'); });
root.render(<mesh ref={() => { mounted = true; }} onPointerDown={() => {}}><planeGeometry args={[512, 72]} /><meshBasicMaterial map={tex} transparent /></mesh>);
