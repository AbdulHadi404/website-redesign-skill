#!/usr/bin/env node
/**
 * run-audio.mjs — sound and haptics facts for the skill.
 *
 *   1. payload: min + gzip bytes of the ways to make a UI sound (esbuild bundles
 *      of raw Web Audio, ZzFX, Howler core / full, Tone.js one synth / namespace),
 *      plus the size of one 0.13 s click as an uncompressed WAV;
 *   2. compat: @mdn/browser-compat-data rows for vibration, audio, autoplay,
 *      user activation, reduced-motion/-transparency, fullscreen and the other
 *      APIs a game-like page leans on (version_added per browser, with notes);
 *   3. browser (skipped with --no-browser): what Chromium actually does with an
 *      AudioContext and navigator.vibrate() before and after a user gesture, under
 *      the default headless policy and under --autoplay-policy=user-gesture-required.
 *
 *   node run-audio.mjs [--no-browser]     writes results/audio.json
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const pkgVersion = (name) => JSON.parse(require('node:fs').readFileSync(path.join(here, 'node_modules', name, 'package.json'), 'utf8')).version;
await mkdir(path.join(here, 'results'), { recursive: true });
const out = { date: new Date().toISOString() };

// ---------- 1. payload ----------
const entries = [
  ['raw Web Audio (the toy\'s sound.js: two synthesised blips, toggle, gesture gate)', `import { createSound } from './toy/sound.js'; window.s = createSound;`],
  [`zzfx@${pkgVersion('zzfx')} (procedural sound effects)`, `import { zzfx } from 'zzfx'; window.p = () => zzfx(...[,,925,.04,.3,.6,1,.3,,6.27,-184,.09,.17]);`],
  [`howler@${pkgVersion('howler')} core (sprites, fallbacks, unlock; plays files)`, `import 'howler/dist/howler.core.min.js'; window.H = globalThis.Howl;`],
  [`howler@${pkgVersion('howler')} full (core + spatial plugin, the package main)`, `import { Howl } from 'howler'; window.H = Howl;`],
  [`tone@${pkgVersion('tone')} one Synth (tree-shaken)`, `import { Synth } from 'tone'; window.s = () => new Synth().toDestination();`],
  [`tone@${pkgVersion('tone')} whole namespace`, `import * as Tone from 'tone'; window.T = Tone;`],
];
out.payload = [];
for (const [name, contents] of entries) {
  const r = await esbuild.build({ stdin: { contents, resolveDir: here, loader: 'js' }, bundle: true, minify: true, format: 'esm', platform: 'browser', write: false, logLevel: 'silent', legalComments: 'none' });
  const code = r.outputFiles[0].contents;
  out.payload.push({ name, minBytes: code.length, gzipBytes: gzipSync(code, { level: 9 }).length });
}
// One 0.13 s click as a file: 44.1 kHz, 16-bit, mono PCM WAV (the no-encoder baseline).
out.payload.push({ name: 'one 0.13 s click as a 44.1 kHz 16-bit mono WAV file', fileBytes: 44 + Math.round(0.13 * 44100) * 2 });
out.esbuild = esbuild.version;

// ---------- 2. compat ----------
const bcd = require('@mdn/browser-compat-data');
out.bcd = { version: bcd.__meta.version, timestamp: bcd.__meta.timestamp };
const BROWSERS = ['chrome', 'chrome_android', 'edge', 'firefox', 'firefox_android', 'safari', 'safari_ios', 'samsunginternet_android'];
const KEYS = [
  'api.Navigator.vibrate', 'api.AudioContext', 'api.AudioContext.AudioContext', 'api.BaseAudioContext.createOscillator',
  'api.Navigator.userActivation', 'api.UserActivation.hasBeenActive', 'api.Navigator.getAutoplayPolicy', 'api.Navigator.audioSession', 'api.AudioSession.type',
  'api.HTMLMediaElement.autoplay', 'html.elements.input.switch', 'api.GamepadHapticActuator.playEffect', 'api.Gamepad',
  'api.Element.requestFullscreen', 'api.ScreenOrientation.lock', 'api.SpeechSynthesis.speak', 'api.Element.ariaNotify', 'api.Document.ariaNotify',
  'css.at-rules.media.prefers-reduced-motion', 'css.at-rules.media.prefers-reduced-transparency', 'css.at-rules.media.forced-colors',
  'css.at-rules.media.prefers-contrast', 'api.GPU', 'api.OffscreenCanvas', 'css.properties.touch-action', 'api.Document.startViewTransition',
];
const get = (key) => key.split('.').reduce((o, k) => o?.[k], bcd)?.__compat;
const fmt = (s) => {
  if (!s) return 'no data';
  const list = Array.isArray(s) ? s : [s];
  const main = list.find((x) => !x.flags && !x.prefix && !x.alternative_name) || list[0];
  if (main.version_added === false) return 'no';
  if (main.version_added === null) return 'unknown';
  let v = String(main.version_added);
  if (main.version_removed) v += `–${main.version_removed} (removed)`;
  if (main.partial_implementation) v += ' (partial)';
  if (main.flags) v += ' (flag)';
  if (main.prefix) v += ` (prefix ${main.prefix})`;
  return v;
};
out.compat = {};
for (const key of KEYS) {
  const c = get(key);
  if (!c) { out.compat[key] = 'not in BCD'; continue; }
  const row = Object.fromEntries(BROWSERS.map((b) => [b, fmt(c.support[b])]));
  const notes = BROWSERS.flatMap((b) => [].concat(c.support[b] || []).flatMap((s) => [].concat(s.notes || []).map((n) => `${b}: ${n}`)));
  out.compat[key] = { ...row, status: c.status, ...(notes.length ? { notes: [...new Set(notes)].slice(0, 6) } : {}) };
}

// ---------- 3. browser ----------
if (!process.argv.includes('--no-browser')) {
  const { launch } = await import(path.resolve(here, '../../../../skills/website-redesign/scripts/lib/env.mjs'));
  // env.mjs finds a working Chromium; relaunch it with the extra switch under test.
  const { browser: b0, chromium } = await launch();
  const version = b0.version(); await b0.close();
  const { existsSync, readdirSync } = await import('node:fs');
  const cache = path.join(process.env.HOME || '', '.cache/ms-playwright');
  const exes = [process.env.CHROME_PATH, ...(existsSync(cache) ? readdirSync(cache).filter((d) => /^chromium-\d+/.test(d)).sort().reverse().map((d) => path.join(cache, d, 'chrome-linux/chrome')) : [])].filter((p) => p && existsSync(p));
  const relaunch = async (args) => {
    const base = { headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', ...args] };
    try { return await chromium.launch(base); } catch { /* try a binary on disk */ }
    for (const executablePath of exes) { try { return await chromium.launch({ ...base, executablePath }); } catch { /* next */ } }
    throw new Error('no Chromium');
  };
  const probe = async (extraArgs) => {
    const browser = await relaunch(extraArgs);
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const msgs = [];
    page.on('console', (m) => msgs.push(m.text()));
    await page.setContent('<button id=b>Sound on</button>');
    const before = await page.evaluate(() => {
      const ac = new AudioContext();
      window.__ac = ac;
      return { audioContextState: ac.state, hasBeenActive: navigator.userActivation?.hasBeenActive ?? null, vibrateReturned: 'vibrate' in navigator ? navigator.vibrate(30) : 'absent', switchAttribute: 'switch' in HTMLInputElement.prototype };
    });
    await page.click('#b');
    const after = await page.evaluate(async () => {
      await window.__ac.resume().catch(() => {});
      return { audioContextState: window.__ac.state, hasBeenActive: navigator.userActivation?.hasBeenActive ?? null, vibrateReturned: 'vibrate' in navigator ? navigator.vibrate(30) : 'absent' };
    });
    const res = { chromium: browser.version() || version, args: extraArgs, beforeGesture: before, afterGesture: after, console: msgs.filter((m) => /vibrat|AudioContext|autoplay/i.test(m)).slice(0, 4) };
    await browser.close();
    return res;
  };
  out.browser = [await probe([]), await probe(['--autoplay-policy=user-gesture-required'])];
}

await writeFile(path.join(here, 'results', 'audio.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify({ payload: out.payload, vibrate: out.compat['api.Navigator.vibrate'], browser: out.browser?.map((b) => ({ args: b.args, before: b.beforeGesture, after: b.afterGesture })) }, null, 1));
