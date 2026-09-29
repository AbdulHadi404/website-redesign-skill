// The designer's intent for the seven interactions, as the skill's motion tokens (motion.md §4).
// Every implementation imports this and converts it into its own vocabulary; the conversion lines are the
// "intent adapter" that the report compares (units, easing syntax, stagger syntax).
// ?slow=K multiplies every duration and the stagger by K (the interruption test runs at K=4 so that a one-frame
// discontinuity is distinguishable from ordinary per-frame motion). Nothing else changes.
const K = typeof location === 'undefined' ? 1 : +(new URLSearchParams(location.search).get('slow') || 1);
export const SLOW = K;
export const T = {
  dur: { micro: 100 * K, small: 150 * K, medium: 240 * K, large: 300 * K, page: 400 * K, count: 800 * K }, // ms
  stagger: 40 * K, // ms between siblings
  ease: { out: [0.2, 0, 0, 1], exit: [0.3, 0, 1, 1] }, // cubic-bezier control points
  sheetH: 280, // px
};
export const reduceGuard = () => !!window.__RM_GUARD && matchMedia('(prefers-reduced-motion: reduce)').matches;
