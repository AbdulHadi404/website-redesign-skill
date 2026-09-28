// Theatre.js core: plays a keyframed sequence authored in Theatre Studio (AGPL, a dev tool) and exported as JSON.
// Only the sequence it is for: the staggered grid reveal. The state below is what Studio would export; it is
// generated here so the keyframes are the tokens (240 ms per cell, 40 ms stagger, the ease-out curve).
import { getProject, types } from '@theatre/core';
import { T, reduceGuard } from '../tokens.js';
const cells = [...document.querySelectorAll('#grid .cell')];
const [x1, y1, x2, y2] = T.ease.out;
const kf = (id, pos, value) => ({ id, position: pos, connectedRight: true, type: 'bezier', handles: [x2, y2, x1, y1], value });
const tracks = {};
cells.forEach((_, i) => {
  const t0 = (i * T.stagger) / 1000, t1 = (i * T.stagger + T.dur.medium) / 1000;
  tracks[`cell${i}`] = { trackIdByPropPath: { '["opacity"]': `o${i}`, '["y"]': `y${i}` }, trackData: {
    [`o${i}`]: { type: 'BasicKeyframedTrack', keyframes: [kf(`o${i}a`, t0, 0), kf(`o${i}b`, t1, 1)] },
    [`y${i}`]: { type: 'BasicKeyframedTrack', keyframes: [kf(`y${i}a`, t0, 12), kf(`y${i}b`, t1, 0)] } } };
});
const length = (11 * T.stagger + T.dur.medium) / 1000;
const state = { sheetsById: { Reveal: { staticOverrides: { byObject: {} }, sequence: { subUnitsPerUnit: 1000, length, type: 'PositionalSequence', tracksByObject: tracks } } }, definitionVersion: '0.4.0', revisionHistory: [] };
const sheet = getProject('S2 grid', { state }).sheet('Reveal');
cells.forEach((el, i) => sheet.object(`cell${i}`, { opacity: types.number(0, { range: [0, 1] }), y: types.number(12) })
  .onValuesChange((v) => { el.style.opacity = v.opacity; el.style.transform = `translateY(${v.y}px)`; }));
let on = false;
document.querySelector('#grid-toggle').addEventListener('click', (e) => {
  on = !on; e.currentTarget.setAttribute('aria-pressed', String(on));
  const seq = sheet.sequence;
  if (reduceGuard()) { seq.pause(); seq.position = on ? length : 0; return; } // rm
  seq.play({ range: [0, length], direction: on ? 'normal' : 'reverse' });
});
