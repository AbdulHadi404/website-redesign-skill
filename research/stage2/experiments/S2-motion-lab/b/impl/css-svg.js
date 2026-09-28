// Animated SVG + CSS: a native <button role="switch">; the states are CSS (hover, :active, aria-checked).
const b = document.getElementById('toggle');
b.addEventListener('click', () => b.setAttribute('aria-checked', String(b.getAttribute('aria-checked') !== 'true')));
window.__toggle = () => b.click();
window.__loaded = performance.now();
