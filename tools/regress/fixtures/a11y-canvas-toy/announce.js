// A polite status region that exists, empty, from page load (accessibility.md §7).
export function createAnnouncer(parent = document.body) {
  const el = document.createElement('p');
  el.className = 'sr-only'; el.setAttribute('role', 'status'); el.id = 'announcer';
  parent.appendChild(el);
  let last = '', timer = 0;
  return function announce(msg) {
    clearTimeout(timer);
    if (msg === last) { el.textContent = ''; timer = setTimeout(() => { el.textContent = msg; }, 60); }
    else el.textContent = msg;
    last = msg;
  };
}
