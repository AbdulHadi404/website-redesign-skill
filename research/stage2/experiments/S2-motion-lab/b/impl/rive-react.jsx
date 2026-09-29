// Rive, @rive-app/react-canvas (useRive): same file, same state machine.
import { createRoot } from 'react-dom/client';
import { useRive, RuntimeLoader } from '@rive-app/react-canvas';
RuntimeLoader.setWasmUrl('/captures/b/wasm/rive-canvas.wasm');
function Switch() {
  const { rive, RiveComponent } = useRive({ src: '/captures/b-assets/switch.riv', stateMachines: 'Main State Machine', autoplay: true, onLoad: () => { window.__loaded = performance.now(); } });
  window.__r = rive; window.__toggle = () => rive?.stateMachineInputs('Main State Machine').find((i) => i.name === 'Click').fire();
  return <RiveComponent style={{ width: 300, height: 150 }} />;
}
createRoot(document.getElementById('stage')).render(<Switch />);
