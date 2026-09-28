// Haptics on the web: what Chromium does with navigator.vibrate (user activation) and with <input switch>, and what
// the two iOS "switch haptic" libraries weigh. Browser support itself comes from BCD (lib/compat.mjs).
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readdir, stat, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const run$ = promisify(execFile);

async function packSize(spec) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 's8-pack-'));
  try {
    const { stdout } = await run$('npm', ['pack', spec, '--json', '--silent'], { cwd: dir, timeout: 60000 });
    const j = JSON.parse(stdout)[0];
    await run$('tar', ['xzf', j.filename], { cwd: dir });
    const pkg = JSON.parse(await readFile(path.join(dir, 'package', 'package.json'), 'utf8'));
    // the ESM entry a bundler would take
    const entry = pkg.module || pkg.exports?.['.']?.import?.default || pkg.exports?.['.']?.import || pkg.exports?.['.']?.default || pkg.main;
    let entryBytes = null;
    if (typeof entry === 'string') { try { entryBytes = (await stat(path.join(dir, 'package', entry))).size; } catch { /* */ } }
    return { spec: `${j.name}@${j.version}`, license: pkg.license, unpackedSize: j.unpackedSize, entry, entryBytes };
  } catch (e) { return { spec, error: e.message.slice(0, 120) }; }
}

export async function run(browser, base) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(base + '/fixtures/blank.html');
  await page.setContent('<button id="b">tap</button><label id="l"><input type="checkbox" switch id="sw"> switch</label>');
  const before = await page.evaluate(() => ({ exists: typeof navigator.vibrate === 'function', result: navigator.vibrate ? navigator.vibrate(10) : null, activation: navigator.userActivation?.hasBeenActive }));
  await page.tap('#b');
  const after = await page.evaluate(() => ({ result: navigator.vibrate(10), activation: navigator.userActivation?.hasBeenActive, longPattern: navigator.vibrate(Array(200).fill(10)) }));
  const sw = await page.evaluate(() => { const i = document.getElementById('sw'); return { switchProperty: 'switch' in i, role: i.type, appearance: getComputedStyle(i).appearance }; });
  await ctx.close();
  return {
    chromium: { vibrateBeforeGesture: before, vibrateAfterTap: after, inputSwitch: sw,
      note: 'headless Chromium on Linux has no vibration motor: the return value says whether the call was accepted, not whether anything moved' },
    libraries: [await packSize('ios-haptics@3.2.0'), await packSize('web-haptics@0.0.6')],
  };
}
