// Sprite sheet: the Lottie toggle rendered to 31 frames in one WebP strip; CSS steps() plays it either way.
const b = document.getElementById('toggle');
b.addEventListener('click', () => { b.setAttribute('aria-checked', String(b.getAttribute('aria-checked') !== 'true')); b.classList.add('was'); });
window.__toggle = () => b.click();
window.__loaded = performance.now();
