import { serve } from '../lib/server.mjs';
import * as P from './pipelines.mjs';
const s = await serve();
const which = process.argv[2];
const mod = await import('./pipelines.mjs');
const fns = { pw: 'playwrightTest', backstop: 'backstop', lp: 'lostPixel' };
// internal functions are not exported; use runPipelines filtered via env
const res = await mod.runOne(which, s.base, process.argv[3] === 'masked');
console.log(JSON.stringify(res, null, 1).slice(0, 6000));
await s.close();
