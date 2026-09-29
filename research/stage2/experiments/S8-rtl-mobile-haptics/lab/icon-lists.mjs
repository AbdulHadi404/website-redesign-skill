// Builds lib/icon-names.json, the name lists the RTL icon classifier (lib/icon-classify.mjs) uses, from the sources
// instead of hand-written regexes:
//   mirror  Wikimedia Codex icons.ts (shouldFlip, or a separate RTL asset) and Flutter's Material icons.dart
//           (matchTextDirection: true on the base icon), pinned in fetch.sh
//   never   the explicit "do not mirror" lists of Material (2014 bidirectionality text), Firefox's RTL guidelines and
//           Codex's style guide, minus every name a source mirrors
//   ambiguous  the rows where the sources disagree (the matrix in the S8 report)
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { root, ext } from '../lib/server.mjs';
import { keyOf } from '../lib/icon-classify.mjs';

export async function build() {
  const codex = await readFile(path.join(ext, 'sources', 'codex-icons.ts'), 'utf8');
  const flutter = await readFile(path.join(ext, 'sources', 'flutter-icons.dart'), 'utf8');
  const mirror = {};
  const addM = (name, src) => { const k = keyOf(name); if (!k) return; (mirror[k] ??= []).includes(src) || mirror[k].push(src); };
  // Codex: one export per icon; IconFlipForRtl with shouldFlip, or IconVariedByDir with an rtl asset
  const blocks = codex.split(/\n(?=export const cdxIcon)/).filter((b) => b.startsWith('export const cdxIcon'));
  let codexFlip = 0, codexRtl = 0;
  for (const b of blocks) {
    const n = b.match(/cdxIcon(\w+)/)[1];
    const flip = /shouldFlip:\s*true/.test(b), rtl = /\brtl:/.test(b);
    if (flip) codexFlip++; if (rtl) codexRtl++;
    if (flip || rtl) addM(n.replace(/([a-z0-9])([A-Z])/g, '$1-$2'), 'codex');
  }
  // Flutter: the base icon (doc comment class "material-icons", not -sharp/-round/-outlined)
  const re = /\/\/\/ <i class="material-icons(-[a-z]+)?[^"]*">([^<]+)<\/i>[^\n]*\n\s*static const IconData (\w+) = IconData\(([^;]*?)\);/g;
  let m, flutterBase = 0, flutterMirror = 0;
  while ((m = re.exec(flutter))) {
    if (m[1]) continue; flutterBase++;
    if (/matchTextDirection:\s*true/.test(m[4])) { flutterMirror++; addM(m[3], 'flutter'); }
  }
  // Explicit "do not mirror", with who says so. Keys are matched on name tokens by lib/icon-classify.mjs.
  const NEVER = {
    check: { tokens: ['check', 'checkmark', 'tick', 'done', 'check2'], sources: ['material', 'firefox', 'codex'] },
    media: { tokens: ['play', 'pause', 'stop', 'rewind', 'eject', 'record', 'skip', 'fast-forward', 'media'], sources: ['material', 'firefox', 'codex'] },
    circularTime: { tokens: ['clock', 'alarm', 'timer', 'history', 'schedule', 'refresh', 'reload', 'sync', 'autorenew', 'restart', 'spinner', 'loader', 'clockwise', 'counterclockwise', 'repeat', 'rotate', 'hourglass', 'stopwatch'], sources: ['material', 'codex'] },
    search: { tokens: ['search', 'magnifier', 'magnifying', 'zoom'], sources: ['material', 'codex (right-hand objects)'] },
    calendar: { tokens: ['calendar'], sources: ['codex'] },
    edit: { tokens: ['edit', 'pencil', 'pen'], sources: ['codex (right-hand objects)'] },
    keyboard: { tokens: ['keyboard'], sources: ['material (physical objects)'] },
    camera: { tokens: ['camera'], sources: ['material'] },
  };
  const AMBIGUOUS = {
    volume: { tokens: ['volume', 'speaker', 'mute', 'unmute', 'sound', 'audio'], note: 'Material and Codex mirror the speaker, Flutter does not; inside an LTR media player keep the player direction' },
    help: { tokens: ['help', 'question', 'questionmark'], note: 'mirror for Arabic, Persian, Urdu (Codex, Flutter); Codex keeps it for Hebrew and Yiddish' },
    logInOut: { tokens: ['login', 'logout', 'log-in', 'log-out', 'signin', 'signout', 'sign-in', 'sign-out', 'exit', 'box-arrow-in', 'door'], note: 'Codex flips LogIn/LogOut, Flutter does not' },
    quote: { tokens: ['quote', 'quotes', 'blockquote'], note: 'Codex flips Quotes, Flutter keeps format_quote' },
    chart: { tokens: ['chart', 'graph', 'trending', 'analytics', 'bar-chart', 'line-chart', 'show-chart'], note: 'time axis: Material and Firefox run time right-to-left, Apple and Codex keep graphs' },
    clipboard: { tokens: ['copy', 'cut', 'paste', 'content-copy', 'content-paste', 'content-cut'], note: 'Codex flips Copy/Cut/Paste, Flutter does not' },
  };
  const out = {
    generated: 'lab/icon-lists.mjs', sources: {
      codex: 'wikimedia/design-codex@8a1caafc packages/codex-icons/src/icons.ts', flutter: 'flutter/flutter@929df566 packages/flutter/lib/src/material/icons.dart',
      material: 'Material bidirectionality (2014 text, as quoted in github.com/albatrosary/material-design-jp Usability/Bidirectionality.md)',
      firefox: 'mozilla/gecko-dev docs/code-quality/coding-style/rtl_guidelines.rst "What NOT to mirror"', codexGuide: 'design-codex style-guide/bidirectionality.md Icons',
    },
    counts: { codexIcons: blocks.length, codexFlip, codexRtlAsset: codexRtl, flutterBase, flutterBaseMirror: flutterMirror, mirrorKeys: Object.keys(mirror).length,
      mirrorBoth: Object.values(mirror).filter((s) => s.length > 1).length },
    mirror, never: NEVER, ambiguous: AMBIGUOUS,
  };
  await writeFile(path.join(root, 'lib', 'icon-names.json'), JSON.stringify(out, null, 1));
  return out.counts;
}
if (import.meta.url === `file://${process.argv[1]}`) console.log(await build());
