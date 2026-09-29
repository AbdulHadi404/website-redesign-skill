// Shared by every hello world: mark the first rendered frame once.
export const ready = (what = 'frame') => { if (window.__ready == null) { window.__ready = performance.now(); window.__what = what; } };
export const IMG = '/assets/atlas.png';
export const host = () => document.getElementById('host');
