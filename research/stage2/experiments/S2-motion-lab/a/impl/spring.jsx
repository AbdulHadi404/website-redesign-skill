// React Spring: physics first. Intent is a spring config (tension/friction) or a duration + easing function.
import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { animated, useSpring, useSprings, useTransition, useScroll, useInView, easings } from '@react-spring/web';
import { Shell, items } from './react-shell.jsx';
import { T, SLOW, reduceGuard } from '../tokens.js';
// The skill's productive spring (motion.md §4: stiffness 700, damping 47.6) — react-spring calls them tension and friction.
// ?slow=K slows the spring K times with the same damping ratio: mass K², friction K×.
const productive = { tension: 700, friction: 47.6 * SLOW, mass: SLOW * SLOW };
// react-spring ships named easings only; the token curve needs a bezier function
const bez = ([x1, y1, x2, y2]) => (t) => { let lo = 0, hi = 1, u = t; for (let i = 0; i < 20; i++) { u = (lo + hi) / 2; const x = 3 * (1 - u) ** 2 * u * x1 + 3 * (1 - u) * u * u * x2 + u ** 3; if (x < t) lo = u; else hi = u; } return 3 * (1 - u) ** 2 * u * y1 + 3 * (1 - u) * u * u * y2 + u ** 3; };
const ease = bez(T.ease.out);
const rmNow = () => reduceGuard(); // rm

function Press() {
  const [down, setDown] = useState(false);
  const st = useSpring({ scale: down ? 0.97 : 1, config: { duration: T.dur.micro, easing: ease } });
  return <animated.button id="press" className="btn" style={st} onPointerDown={() => setDown(true)} onPointerUp={() => setDown(false)} onPointerLeave={() => setDown(false)}>Press me</animated.button>;
}

function List() {
  const [order, setOrder] = useState(items.map((_, i) => i));
  const springs = useSprings(items.length, items.map((_, i) => ({ y: order.indexOf(i) * 32, immediate: rmNow(), config: productive })));
  return (<><button id="shuffle" onClick={() => setOrder((o) => [...o].reverse())}>Reverse order</button>
    <ul id="list" style={{ position: 'relative', height: items.length * 32 }}>{springs.map((st, i) =>
      <animated.li key={i} data-id={i + 1} style={{ position: 'absolute', left: 0, right: 0, top: 0, transform: st.y.to((y) => `translateY(${y}px)`) }}>{items[i]}</animated.li>)}</ul></>);
}

function Sheet() {
  const [open, setOpen] = useState(false); const [shown, setShown] = useState(false);
  const rm = rmNow(); // rm
  const st = useSpring({ y: open || rm ? 0 : 100, o: open || !rm ? 1 : 0, config: rm ? { duration: 150 } : { duration: T.dur.large, easing: ease },
    onRest: () => { if (!open) setShown(false); } });
  return (<><button id="sheet-toggle" aria-expanded={open} aria-controls="sheet" onClick={() => { setShown(true); setOpen((o) => !o); }}>Toggle sheet</button>
    <animated.dialog id="sheet" open={shown} aria-label="Sheet" style={{ opacity: st.o, transform: st.y.to((y) => `translateY(${y}%)`) }}>A sheet</animated.dialog></>);
}

function View() {
  const [v, setV] = useState('a'); const rm = rmNow(); // rm
  const tr = useTransition(v, { from: { opacity: 0, x: rm ? 0 : 24 }, enter: { opacity: 1, x: 0 }, leave: { opacity: 0, x: rm ? 0 : -24 },
    initial: null, config: { duration: rm ? 150 : T.dur.page, easing: ease } });
  return (<><button id="swap" onClick={() => setV((x) => (x === 'a' ? 'b' : 'a'))}>Swap view</button>
    <div id="stage">{tr((st, k) => <animated.div className="view" id={`view-${k}`} style={{ opacity: st.opacity, transform: st.x.to((x) => `translateX(${x}px)`) }}>{k.toUpperCase()}</animated.div>)}</div></>);
}

function Ticker() {
  const [to, setTo] = useState(0);
  const { n } = useSpring({ n: to, immediate: rmNow(), config: { duration: T.dur.count, easing: ease } });
  return (<><button id="tick-hi" onClick={() => setTo(1000)}>To 1000</button> <button id="tick-lo" onClick={() => setTo(200)}>To 200</button>
    <animated.output id="ticker">{n.to((x) => Math.round(x))}</animated.output></>);
}

function Grid() {
  const [on, setOn] = useState(false); const rm = rmNow(); // rm
  const springs = useSprings(12, Array.from({ length: 12 }, (_, i) => ({ opacity: on ? 1 : 0, y: on || rm ? 0 : 12, delay: rm ? 0 : i * T.stagger,
    config: { duration: rm ? 150 : T.dur.medium, easing: ease } })));
  return (<><button id="grid-toggle" aria-pressed={on} onClick={() => setOn((o) => !o)}>Toggle grid</button>
    <div id="grid">{springs.map((st, i) => <animated.div key={i} className="cell" style={{ opacity: st.opacity, transform: st.y.to((y) => `translateY(${y}px)`) }} />)}</div></>);
}

function Progress() { const { scrollYProgress } = useScroll(); return <animated.div id="progress" style={{ transform: scrollYProgress.to((p) => `scaleX(${p})`) }} />; }
function Reveal({ i, top }) {
  const rm = rmNow(); // rm
  const [ref, st] = useInView(() => ({ from: { opacity: rm ? 1 : 0, y: rm ? 0 : 16 }, to: { opacity: 1, y: 0 }, config: { duration: T.dur.medium, easing: ease } }), { amount: 0.2 });
  return <animated.div ref={ref} className="reveal" id={`r${i + 1}`} style={{ top, opacity: st.opacity, transform: st.y.to((y) => `translateY(${y}px)`) }}>Reveal {i + 1}</animated.div>;
}

createRoot(document.getElementById('root')).render(<Shell {...{ Press, List, Sheet, View, Ticker, Grid, Progress, Reveal }} />);
