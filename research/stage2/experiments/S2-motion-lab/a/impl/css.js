// CSS + WAAPI: everything the platform does alone. JS only toggles state, measures FLIP and starts view transitions.
import { T, SLOW, reduceGuard } from '../tokens.js';
const $ = (s) => document.querySelector(s);
// the tokens live in css.css; ?slow=K rewrites them (test harness only)
if (SLOW !== 1) for (const [k, v] of Object.entries({ micro: T.dur.micro, medium: T.dur.medium, large: T.dur.large, page: T.dur.page, count: T.dur.count })) document.documentElement.style.setProperty(`--dur-${k}`, `${v}ms`); // harness
if (SLOW !== 1) document.documentElement.style.setProperty('--stagger', `${T.stagger}ms`); // harness
// ?vtpe: let clicks reach the page during a view transition (test variant; see the report)
if (new URLSearchParams(location.search).has('vtpe')) document.head.append(Object.assign(document.createElement('style'), { textContent: '::view-transition { pointer-events: none; }' })); // variant
const ease = `cubic-bezier(${T.ease.out})`;
const listMode = new URLSearchParams(location.search).get('list') || 'waapi'; // variant

// 2 list — FLIP with WAAPI, "first" measured from the current visual position so an interruption continues
const list = $('#list');
if (listMode === 'vt') for (const li of list.children) li.style.viewTransitionName = `li-${li.dataset.id}`; // variant
$('#shuffle').addEventListener('click', () => {
  const lis = [...list.children];
  if (listMode === 'vt' && document.startViewTransition && !reduceGuard()) { // variant
    document.startViewTransition(() => list.append(...lis.reverse())); // variant
    return; // variant
  } // variant
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

// 6 ticker — set the registered property; the transition retargets from the current value. While it counts the
// DOM text is empty and ::after shows the counter; when it settles (or at once, if nothing transitions) the
// final value becomes the DOM text again.
const ticker = $('#ticker'); let goal = 0;
const settle = () => { ticker.classList.remove('counting'); ticker.textContent = String(goal); };
ticker.addEventListener('transitionend', (e) => { if (e.propertyName === '--n') settle(); });
const setN = (n) => { goal = n; ticker.textContent = ''; ticker.classList.add('counting'); ticker.style.setProperty('--n', n);
  requestAnimationFrame(() => { if (!ticker.getAnimations().length) settle(); }); };
$('#tick-hi').addEventListener('click', () => setN(1000));
$('#tick-lo').addEventListener('click', () => setN(200));
window.__read = { ...(window.__read || {}), ticker: () => parseFloat(getComputedStyle(ticker).getPropertyValue('--n')) };

// 7 grid — class toggle; per-index delay from CSS
const grid = $('#grid');
[...grid.children].forEach((c, i) => c.style.setProperty('--i', i));
$('#grid-toggle').addEventListener('click', (e) => { grid.classList.toggle('on'); e.currentTarget.setAttribute('aria-pressed', grid.classList.contains('on')); });
