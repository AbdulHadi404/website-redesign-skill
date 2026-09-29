import { createRoot } from 'react-dom/client';
import { Application, extend, useApplication } from '@pixi/react';
import { Container, Sprite, Assets } from 'pixi.js';
import { useEffect, useState } from 'react';
import { ready, IMG, host } from './_ready.js';
extend({ Container, Sprite });
function Pic() {
  const [tex, setTex] = useState(null);
  const { app } = useApplication();
  useEffect(() => { Assets.load(IMG).then(setTex); }, []);
  useEffect(() => { if (tex && app?.renderer) app.renderer.runners.postrender.add({ postrender: () => ready(app.renderer.name) }); }, [tex, app]);
  return tex ? <pixiSprite texture={tex} eventMode="static" onPointerDown={() => {}} /> : null;
}
createRoot(host()).render(<Application width={800} height={600} preference="webgl"><Pic /></Application>);
