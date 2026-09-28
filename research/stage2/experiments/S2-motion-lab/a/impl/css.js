// CSS + WAAPI: everything the platform does alone. JS only toggles state, measures FLIP and starts view transitions.
import { T, reduceGuard } from '../tokens.js';
const $ = (s) => document.querySelector(s);
const ease = `cubic-bezier(${T.ease.out})`;
const listMode = new URLSearchParams(location.search).get('list') || 'waapi';

// 2 list — FLIP with WAAPI, "first" measured from the current visual position so an interruption continues
const list = $('#list');
if (listMode === 'vt') for (const li of list.children) li.style.viewTransitionName = `li-${li.dataset.id}`;
$('#shuffle').addEventListener('click', () => {
  const lis = [...list.children];
  if (listMode === 'vt' && document.startViewTransition && !reduceGuard()) {
    document.startViewTransition(() => list.append(...lis.reverse()));
    return;
  }
  const first = new Map(lis.map((li) => [li, li.getBoundingClientRect().top]));
  lis.forEach((li) => li.getAnimations().forEach((a) => a.cancel()));
  list.append(...lis.reverse());
  if (reduceGuard()) return; // rm
  for (const li of lis) {
    const dy = first.get(li) - li.getBoundingClientRect().top;
    if (dy) li.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: T.dur.medium, easing: ease });
  }
});

// 3 sheet — the dialog animates itself (css.css); JS only opens and closes it
const sheet = $('#sheet'), tog = $('#sheet-toggle');
tog.addEventListener('click', () => {
  if (sheet.open) sheet.close(); else sheet.show();
  tog.setAttribute('aria-expanded', String(sheet.open));
});

// 4 view — same-document view transition
const stage = $('#stage');
$('#swap').addEventListener('click', () => {
  const swap = () => { const v = stage.firstElementChild; const toB = v.id === 'view-a'; v.id = toB ? 'view-b' : 'view-a'; v.textContent = toB ? 'B' : 'A'; };
  if (document.startViewTransition) document.startViewTransition(swap); else swap();
});

// 6 ticker — set the registered property; the transition retargets from the current value
const ticker = $('#ticker');
const setN = (n) => { ticker.style.setProperty('--n', n); ticker.setAttribute('aria-label', String(n)); };
$('#tick-hi').addEventListener('click', () => setN(1000));
$('#tick-lo').addEventListener('click', () => setN(200));
window.__read = { ...(window.__read || {}), ticker: () => parseFloat(getComputedStyle(ticker).getPropertyValue('--n')) };

// 7 grid — class toggle; per-index delay from CSS
const grid = $('#grid');
[...grid.children].forEach((c, i) => c.style.setProperty('--i', i));
$('#grid-toggle').addEventListener('click', (e) => { grid.classList.toggle('on'); e.currentTarget.setAttribute('aria-pressed', grid.classList.contains('on')); });
