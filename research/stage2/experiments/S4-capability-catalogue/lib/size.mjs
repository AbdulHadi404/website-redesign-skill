// Bundle-cost measurement for the lab: libcheck.mjs's bundleCost with the lab's pinned esbuild and node_modules.
// esbuild (minify, ESM, splitting, browser, production conditions), React/Vue/Svelte external (the stage-1
// stream-B method), gzip -9 per output file; initial JS = entry chunk + static imports, lazy chunks separate.
import * as esbuild from 'esbuild';
import path from 'node:path';
import { bundleCost } from '../libcheck.mjs';

export const measure = (id, entryCode, { buildDir, root, assets = [], alias = {} }) =>
  bundleCost(entryCode, { root, buildDir: path.join(buildDir, id), assets, alias, esbuild });
