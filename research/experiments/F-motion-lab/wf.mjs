import { features } from "web-features";
const want = /view-transition|scroll-driven|animation-timeline|starting-style|transition-behavior|allow-discrete|linear-easing|popover|dialog|prefers-reduced-motion|webgpu|web-animations|interpolate-size|calc-size|scroll-timeline|anchor-positioning|individual-transforms|motion-path|will-change|content-visibility|scrollend|scroll-snap|offscreen-canvas|webgl2|interactivity|scroll-state|cross-document|element-scoped|view-transition-class|match-element|:has|prefers-reduced-transparency|scroll-triggered|timeline-scope|animation-composition|scroll-into-view|reading-flow|light-dark|sibling-index|registered-custom|@property|trigonometric|content-visibility/;
for (const [id, f] of Object.entries(features)) {
  if (f.kind && f.kind !== "feature") continue;
  if (!want.test(id) && !want.test(f.name||"")) continue;
  const s = f.status || {};
  console.log(id.padEnd(40), String(s.baseline).padEnd(6), (s.baseline_low_date||"").padEnd(11), (s.baseline_high_date||"").padEnd(11), JSON.stringify(s.support));
}
