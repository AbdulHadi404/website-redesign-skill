// One Chromium at a time, from the skill's own playwright-core (see skills/website-redesign/scripts/lib/env.mjs).
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const skillScripts = path.resolve(here, '../../../../../skills/website-redesign/scripts');

export async function launchBrowser(extraArgs = []) {
  const pw = await import(pathToFileURL(path.join(skillScripts, 'node_modules/playwright-core/index.js')).href).then((m) => m.default ?? m);
  const args = ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars', '--font-render-hinting=none', '--enable-unsafe-swiftshader', ...extraArgs];
  for (const executablePath of [process.env.CHROME_PATH, '/opt/pw-browsers/chromium-1194/chrome-linux/chrome']) {
    if (executablePath && existsSync(executablePath)) return pw.chromium.launch({ headless: true, executablePath, args });
  }
  const { launch } = await import(pathToFileURL(path.join(skillScripts, 'lib/env.mjs')).href);
  return (await launch()).browser;
}
