import { createRoot } from 'react-dom/client';
import { useEffect, useState } from 'react';
import { Stage, Layer, Image as KImage } from 'react-konva';
import { ready, IMG, host } from './_ready.js';
function App() {
  const [img, setImg] = useState(null);
  useEffect(() => { const i = new Image(); i.onload = () => setImg(i); i.src = IMG; }, []);
  useEffect(() => { if (img) requestAnimationFrame(() => ready('canvas2d')); }, [img]);
  return <Stage width={800} height={600}><Layer>{img && <KImage image={img} x={100} y={100} draggable />}</Layer></Stage>;
}
createRoot(host()).render(<App />);
