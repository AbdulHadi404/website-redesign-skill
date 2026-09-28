#!/usr/bin/env node
/**
 * run-sources.mjs — what open-source web games and experiences actually do,
 * read from their code (cloned by fetch-sources.sh, never copied here).
 *
 *   static   2048's feedback timings and input map; Juicy Breakout's juice
 *            toggles; A Dark Room's control markup and sound default; The
 *            Evolution of Trust's chapter order; accessibility signals (ARIA,
 *            tabindex, reduced motion, keyboard, touch, mute) in each codebase
 *   play     A Dark Room played by a greedy script under a fake clock
 *            (Playwright page.clock): when each control and place first appears,
 *            in simulated minutes — the shape of progressive feature introduction
 *
 *   node run-sources.mjs [--sources /tmp/s2-S6] [--minutes 60]   writes results/sources.json
 */
import { readFile, readdir, writeFile, mkdir, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './lib/serve.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const SRC = arg('--sources', process.env.S6_SOURCES || '/tmp/s2-S6');
const MINUTES = +arg('--minutes', 60);
const out = { date: new Date().toISOString(), sources: SRC, repos: {} };
const rd = (p) => readFile(path.join(SRC, p), 'utf8');
const head = (repo) => { try { return execFileSync('git', ['-C', path.join(SRC, repo), 'rev-parse', 'HEAD']).toString().trim(); } catch { return null; } };

// ---------- static ----------
async function walk(dir, exts, acc = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'vendor', 'lib', 'build', 'dist', 'third_party'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p, exts, acc);
    else if (exts.includes(path.extname(e.name)) && (await stat(p)).size < 400000) acc.push(p);
  }
  return acc;
}
async function signals(repo) {
  const files = await walk(path.join(SRC, repo), ['.js', '.ts', '.jsx', '.tsx', '.vue', '.html', '.css', '.scss', '.as']);
  const count = { files: files.length, aria: 0, tabindex: 0, roleAttr: 0, reducedMotion: 0, keydown: 0, touch: 0, mute: 0, liveRegion: 0 };
  for (const f of files) {
    const s = await readFile(f, 'utf8');
    count.aria += (s.match(/aria-[a-z]+/g) || []).length;
    count.tabindex += (s.match(/tabindex|tabIndex/g) || []).length;
    count.roleAttr += (s.match(/role=["']|setAttribute\(['"]role/g) || []).length;
    count.reducedMotion += (s.match(/prefers-reduced-motion/g) || []).length;
    count.keydown += (s.match(/keydown|keyup|keypress/g) || []).length;
    count.touch += (s.match(/touchstart|pointerdown/g) || []).length;
    count.mute += (s.match(/\bmute|volume|soundOn|sound_on/gi) || []).length;
    count.liveRegion += (s.match(/aria-live|role=["'](status|alert|log)/g) || []).length;
  }
  return count;
}

const REPOS = ['adarkroom', '2048', 'juicy-breakout', 'trust', 'polygons', 'chrome-music-lab', 'folio-2019', 'hextris', 'BrowserQuest'];
for (const r of REPOS) {
  try { out.repos[r] = { commit: head(r), signals: await signals(r) }; } catch (e) { out.repos[r] = { error: e.message }; }
}

try {
  const scss = await rd('2048/style/main.scss');
  const km = await rd('2048/js/keyboard_input_manager.js');
  const pick = (re) => (scss.match(re) || [])[1] || null;
  out.repos['2048'].feedback = {
    moveTransition: pick(/\$transition-speed:\s*([\d.]+ms)/),
    newTileAppear: pick(/animation\(appear ([^)]+)\)/),
    mergePop: pick(/animation\(pop ([^)]+)\)/),
    scoreAdditionFloat: pick(/animation\(move-up ([^)]+)\)/),
    popKeyframes: (scss.match(/keyframes\(pop\)[\s\S]*?\n\}/) || [''])[0].match(/scale\([\d.]+\)/g),
    keysPerDirection: Object.keys(Object.fromEntries([...km.matchAll(/(\d+): (\d),?\s*\/\/ ([^\n]+)/g)].map((m) => [m[3].trim(), m[2]]))),
    touch: /touchstart/.test(km),
  };
} catch (e) { out.repos['2048'].feedbackError = e.message; }

try {
  const s = await rd('juicy-breakout/src/com/grapefrukt/games/juicy/Settings.as');
  const groups = [];
  let cur = null;
  for (const line of s.split('\n')) {
    const h = line.match(/\[header\("([^"]+)"\)\]/);
    if (h) { cur = { group: h[1], toggles: [] }; groups.push(cur); continue; }
    const v = line.match(/static public var (\w+)\s*:(Boolean|Number|int)\s*=\s*([^;]+);/);
    if (v && cur) cur.toggles.push(`${v[1]}=${v[3].trim()}`);
  }
  out.repos['juicy-breakout'].juice = { booleanTogglesDefaultOff: (s.match(/static public var \w+\s*:Boolean\s*=\s*false/g) || []).length, groups };
} catch (e) { out.repos['juicy-breakout'].juiceError = e.message; }

try {
  const btn = await rd('adarkroom/script/Button.js');
  const eng = await rd('adarkroom/script/engine.js');
  out.repos.adarkroom.markup = {
    buttonElement: (btn.match(/var el = \$\('<(\w+)>'\)/) || [])[1],
    buttonHasTabindexOrRole: /tabindex|role/.test(btn),
    costShownIn: /tooltip/.test(btn) ? 'hover tooltip' : 'unknown',
    soundDefault: /toggleVolume\(Boolean\(\$SM\.get\('config\.soundOn'\)\)\)/.test(eng) ? 'off until chosen (config.soundOn unset = false)' : 'unknown',
    soundPrompt: (eng.match(/title: _\('(Sound Available!)'\)[\s\S]{0,200}?text: \[\s*_\('([^']+)'\),\s*_\('([^']+)'\)/) || []).slice(1),
    soundPromptDelayMs: +((eng.match(/setTimeout\(notifyAboutSound, (\d+)\)/) || [])[1] || 0),
    menuOptions: [...eng.matchAll(/addClass\('(\w+) menuBtn'\)\s*\n\s*\.text\(_\('([^']+)'\)\)/g)].map((m) => m[2]),
  };
} catch (e) { out.repos.adarkroom.markupError = e.message; }

try {
  out.repos.trust.chapters = (await readdir(path.join(SRC, 'trust/js/slides'))).filter((f) => f.endsWith('.js')).sort();
  const words = await rd('trust/words.html');
  out.repos.trust.allCopyInOneFile = { file: 'words.html', paragraphs: (words.match(/<p id=/g) || []).length, words: words.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length };
  const main = await rd('trust/js/main.js');
  out.repos.trust.soundDefault = /_soundIsOn = true/.test(main) ? 'on (Howler; toggle ON/OFF)' : 'unknown';
} catch (e) { out.repos.trust.error2 = e.message; }

// ---------- play: A Dark Room under a fake clock ----------
if (!process.argv.includes('--no-play')) {
  const { launch } = await import(path.resolve(here, '../../../../skills/website-redesign/scripts/lib/env.mjs'));
  const srv = await serve(path.join(SRC, 'adarkroom'));
  const { browser } = await launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.route((u) => !u.hostname.match(/^127\.0\.0\.1$|^localhost$/), (r) => r.abort());
  const page = await ctx.newPage();
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.goto(`${srv.base}/index.html?lang=en`, { waitUntil: 'domcontentloaded' });
  await page.clock.runFor(2000);
  await page.waitForFunction(() => window.Engine && document.querySelector('#lightButton'), null, { timeout: 20000 });
  const seen = {}; const places = {}; const timeline = [];
  const snapshot = () => page.evaluate(() => {
    const vis = (e) => !!(e.offsetWidth || e.offsetHeight);
    const btns = [...document.querySelectorAll('#outerSlider .button')].map((b) => ({ id: b.id, text: b.childNodes[0]?.textContent?.trim() || b.textContent.trim() }));
    const tabs = [...document.querySelectorAll('#header .headerButton')].map((h) => h.textContent.trim());
    const stores = document.querySelectorAll('#stores .storeRow').length;
    const menu = [...document.querySelectorAll('.menu .menuBtn, .menuBtn')].filter(vis).length;
    return { btns, tabs, stores, menu };
  });
  // Greedy player: every simulated second, answer any event (sound: "disable audio"), then
  // press every enabled control in every unlocked place except embarking into the world.
  const act = () => page.evaluate(() => {
    const ev = document.querySelector('#event');
    if (ev) {
      const choices = [...ev.querySelectorAll('.button:not(.disabled)')];
      const pref = choices.find((b) => /disable audio|ignore|leave|continue|go home|end/i.test(b.textContent)) || choices[0];
      pref?.click();
      return 'event';
    }
    for (const b of document.querySelectorAll('#outerSlider .button:not(.disabled)')) {
      if (/embark|launch|lift off|restart/i.test(b.textContent) || b.id === 'embarkButton') continue;
      b.click();
    }
    return 'play';
  });
  for (let s = 0; s <= MINUTES * 60; s++) {
    if (s % 30 === 0) {
      const snap = await snapshot();
      const t = +(s / 60).toFixed(1);
      for (const b of snap.btns) if (!(b.id in seen)) seen[b.id] = { text: b.text, firstSeenMin: t };
      for (const p of snap.tabs) if (!(p in places)) places[p] = t;
      if (s % 300 === 0) timeline.push({ minute: t, controls: snap.btns.length, places: snap.tabs.length || 1, storeRows: snap.stores });
    }
    await act();
    await page.clock.runFor(1000);
  }
  out.adarkroomPlay = {
    method: `greedy script, ${MINUTES} simulated minutes at 1 s steps, fake clock; events answered with the first safe choice; world map (embark) not entered`,
    controlsFirstSeen: Object.values(seen).sort((a, b) => a.firstSeenMin - b.firstSeenMin),
    placesFirstSeen: places,
    timeline,
  };
  await browser.close(); await srv.close();
}

await mkdir(path.join(here, 'results'), { recursive: true });
await writeFile(path.join(here, 'results', 'sources.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify({ signals: Object.fromEntries(Object.entries(out.repos).map(([k, v]) => [k, v.signals])), play: out.adarkroomPlay?.timeline, first: out.adarkroomPlay?.controlsFirstSeen?.map((c) => `${c.firstSeenMin}m ${c.text}`) }, null, 1));
