// The designer's intent for the seven interactions, as the skill's motion tokens (motion.md §4).
// Every implementation imports this and converts it into its own vocabulary; the conversion lines are the
// "intent adapter" that the report compares (units, easing syntax, stagger syntax).
export const T = {
  dur: { micro: 100, small: 150, medium: 240, large: 300, page: 400, count: 800 }, // ms
  stagger: 40, // ms between siblings
  ease: { out: [0.2, 0, 0, 1], exit: [0.3, 0, 1, 1] }, // cubic-bezier control points
  sheetH: 280, // px
};
export const reduceGuard = () => !!window.__RM_GUARD && matchMedia('(prefers-reduced-motion: reduce)').matches;
