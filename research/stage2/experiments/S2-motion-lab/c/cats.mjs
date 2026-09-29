// motion.mjs problem text → category (shared by the Part C scorers). Order matters: a reduced-motion message may
// mention a "custom property"; a text message may mention "counter()".
export const CATS = [['static', /^static/], ['reduced', /^reduced motion/], ['interrupt', /^interrupted/], ['text', /^text on screen/], ['duration', /^duration/], ['easing', /easing|curve fits/], ['props', /propert|layout/], ['stagger', /^stagger/]];
export const catOf = (p) => (CATS.find(([, re]) => re.test(p)) || ['other'])[0];
