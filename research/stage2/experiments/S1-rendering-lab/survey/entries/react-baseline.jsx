import { createRoot } from 'react-dom/client';
import { ready, host } from './_ready.js';
createRoot(host()).render(<canvas width={800} height={600} ref={(c) => { if (c) requestAnimationFrame(() => ready('react-only')); }} />);
