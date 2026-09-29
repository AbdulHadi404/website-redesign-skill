// Quick manual entry point: node vr/smoke.mjs capture|domdiff
import { serve } from '../lib/server.mjs';
import { captureSet } from './capture-set.mjs';
import { runDomDiff } from './run-domdiff.mjs';
import path from 'node:path';
const cap = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../captures/vr');
const s = await serve();
if (process.argv[2] === 'capture') { const t0 = Date.now(); await captureSet(s.base, cap); console.log('captured', Date.now() - t0); }
if (process.argv[2] === 'domdiff') { const rows = await runDomDiff(s.base, cap); for (const r of rows) console.log(r.width, r.variant, r.regression, r.changed, r.ms, '\n   ', r.lines.join('\n    '), '\n   px:', r.pixelRegions.join(' | ')); }
await s.close();
