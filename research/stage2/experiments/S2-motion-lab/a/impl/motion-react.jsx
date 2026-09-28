// Motion for React. Seconds again; reduced motion is opt-in through MotionConfig.
import { createRoot } from 'react-dom/client';
import { useState, ViewTransition, startTransition } from 'react';
import { motion, AnimatePresence, MotionConfig, useScroll, useMotionValue, useTransform, useReducedMotion, animate, stagger } from 'motion/react';
import { Shell, items } from './react-shell.jsx';
import { T, reduceGuard } from '../tokens.js';
const s = (ms) => ms / 1000;
const ease = T.ease.out;
const viewMode = new URLSearchParams(location.search).get('view') || 'presence';

const Press = () => <motion.button id="press" className="btn" whileTap={{ scale: 0.97 }} transition={{ duration: s(T.dur.micro), ease }}>Press me</motion.button>;

function List() {
  const [order, setOrder] = useState(items.map((_, i) => i + 1));
  return (<><button id="shuffle" onClick={() => setOrder((o) => [...o].reverse())}>Reverse order</button>
    <ul id="list">{order.map((id) => <motion.li layout key={id} data-id={id} transition={{ duration: s(T.dur.medium), ease }}>{items[id - 1]}</motion.li>)}</ul></>);
}

function Sheet() {
  const [open, setOpen] = useState(false);
  const rm = useReducedMotion() && reduceGuard(); // rm
  return (<><button id="sheet-toggle" aria-expanded={open} aria-controls="sheet" onClick={() => setOpen((o) => !o)}>Toggle sheet</button>
    <AnimatePresence>{open && <motion.dialog open id="sheet" key="sheet" aria-label="Sheet"
      initial={rm ? { opacity: 0 } : { y: '100%' }} animate={rm ? { opacity: 1 } : { y: 0 }} exit={rm ? { opacity: 0 } : { y: '100%' }}
      transition={{ duration: s(rm ? 150 : T.dur.large), ease }}>A sheet</motion.dialog>}</AnimatePresence></>);
}

function View() {
  const [v, setV] = useState('a');
  const flip = () => (viewMode === 'react-vt' ? startTransition(() => setV((x) => (x === 'a' ? 'b' : 'a'))) : setV((x) => (x === 'a' ? 'b' : 'a')));
  const el = <div className="view" id={`view-${v}`}>{v.toUpperCase()}</div>;
  if (viewMode === 'react-vt') return (<><button id="swap" onClick={flip}>Swap view</button>
    <ViewTransition name="stage"><div id="stage"><div className="view" key={v} id={`view-${v}`}>{v.toUpperCase()}</div></div></ViewTransition></>);
  return (<><button id="swap" onClick={flip}>Swap view</button><div id="stage">
    <AnimatePresence initial={false}><motion.div className="view" key={v} id={`view-${v}`}
      initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
      transition={{ duration: s(T.dur.page), ease }}>{v.toUpperCase()}</motion.div></AnimatePresence></div></>);
}

function Ticker() {
  const n = useMotionValue(0); const shown = useTransform(() => Math.round(n.get()));
  const go = (to) => (reduceGuard() ? n.jump(to) : animate(n, to, { duration: s(T.dur.count), ease })); // rm
  return (<><button id="tick-hi" onClick={() => go(1000)}>To 1000</button> <button id="tick-lo" onClick={() => go(200)}>To 200</button>
    <motion.output id="ticker">{shown}</motion.output></>);
}

function Grid() {
  const [on, setOn] = useState(false);
  const rm = useReducedMotion() && reduceGuard(); // rm
  return (<><button id="grid-toggle" aria-pressed={on} onClick={() => setOn((o) => !o)}>Toggle grid</button>
    <motion.div id="grid" initial="hide" animate={on ? 'show' : 'hide'} variants={{ show: { transition: { delayChildren: rm ? 0 : stagger(s(T.stagger)) } }, hide: {} }}>
      {Array.from({ length: 12 }, (_, i) => <motion.div key={i} className="cell" variants={{ show: { opacity: 1, y: 0 }, hide: { opacity: 0, y: rm ? 0 : 12 } }} transition={{ duration: s(rm ? 150 : T.dur.medium), ease }} />)}
    </motion.div></>);
}

function Progress() { const { scrollYProgress } = useScroll(); return <motion.div id="progress" style={{ scaleX: scrollYProgress }} />; }
const Reveal = ({ i, top }) => <motion.div className="reveal" id={`r${i + 1}`} style={{ top }} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
  viewport={{ amount: 0.2 }} transition={{ duration: s(T.dur.medium), ease }}>Reveal {i + 1}</motion.div>;

createRoot(document.getElementById('root')).render(
  <MotionConfig reducedMotion={window.__RM_GUARD ? 'user' : 'never'}>
    <Shell {...{ Press, List, Sheet, View, Ticker, Grid, Progress, Reveal }} />
  </MotionConfig>);
