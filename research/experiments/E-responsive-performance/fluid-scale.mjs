// Fluid type + space tokens (Utopia math, via utopia-core) with a WCAG 1.4.4 zoom check per step.
//   node fluid-scale.mjs [minW=360] [maxW=1440] [minBase=16] [maxBase=19] [minRatio=1.2] [maxRatio=1.333] [steps=6] [relativeTo=viewport|container]
// Also checks a few "display" clamps typical of marketing heroes.
import { calculateTypeScale, calculateSpaceScale, calculateClamp, checkWCAG } from 'utopia-core';
const [minWidth = 360, maxWidth = 1440, minFontSize = 16, maxFontSize = 19, minTypeScale = 1.2, maxTypeScale = 1.333, positiveSteps = 6, relativeTo = 'viewport'] =
  process.argv.slice(2).map((v, i) => (i < 7 ? Number(v) : v));
const type = calculateTypeScale({ minWidth, maxWidth, minFontSize, maxFontSize, minTypeScale, maxTypeScale, positiveSteps, negativeSteps: 2, relativeTo });
console.log(`/* Type: ${minWidth}–${maxWidth}px, base ${minFontSize}→${maxFontSize}px, ratio ${minTypeScale}→${maxTypeScale}, relative to ${relativeTo} */`);
console.log(':root {');
for (const s of type) console.log(`  --step-${s.label}: ${s.clamp}; /* ${s.minFontSize}→${s.maxFontSize}px (x${(s.maxFontSize / s.minFontSize).toFixed(2)})${s.wcagViolation && (s.wcagViolation.length ?? 1) ? `  WCAG 1.4.4 FAIL ${JSON.stringify(s.wcagViolation)}` : ''} */`);
const space = calculateSpaceScale({ minWidth, maxWidth, minSize: minFontSize, maxSize: maxFontSize, positiveSteps: [1.5, 2, 3, 4, 6], negativeSteps: [0.75, 0.5, 0.25], relativeTo });
for (const s of space.sizes) console.log(`  --space-${s.label}: ${s.clamp};`);
for (const s of space.oneUpPairs) console.log(`  --space-${s.label}: ${s.clamp};`);
console.log('}');
console.log('\n/* Display sizes a hero might want: */');
for (const [min, max] of [[32, 64], [36, 88], [40, 96], [32, 120], [28, 72]]) {
  const v = checkWCAG({ min, max, minWidth, maxWidth });
  console.log(`${min}→${max}px (x${(max / min).toFixed(2)}): ${calculateClamp({ minSize: min, maxSize: max, minWidth, maxWidth, relativeTo })}  ${v && v.length ? 'FAILS WCAG 1.4.4 for viewports ' + v.map(Math.round).join('–') + 'px' : 'ok (reaches 200% at some zoom ≤ 500%)'}`);
}
