import { createRoot } from 'react-dom/client';
import { Suspense } from 'react';
import { Canvas, useLoader, addAfterEffect } from '@react-three/fiber';
import { TextureLoader } from 'three';
import { ready, IMG, host } from './_ready.js';
function Pic() { const t = useLoader(TextureLoader, IMG); return <mesh onPointerDown={() => {}}><planeGeometry args={[512, 72]} /><meshBasicMaterial map={t} transparent /></mesh>; }
let mounted = false;
addAfterEffect(() => { if (mounted) ready('webgl2'); });
function Mark() { mounted = true; return null; }
createRoot(host()).render(<Canvas orthographic flat style={{ width: 800, height: 600 }}><Suspense fallback={null}><Pic /><Mark /></Suspense></Canvas>);
