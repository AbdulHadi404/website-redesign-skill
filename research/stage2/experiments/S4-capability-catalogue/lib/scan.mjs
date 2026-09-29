// Stated accessibility, crude: keyboard handlers and ARIA found in the code a minimal entry actually ships.
// It scans the bundle OUTPUT (every JS chunk, so every bundled dependency counts: SVAR Gantt's keyboard
// lives in @svar-ui/grid-store and its ARIA grid in @svar-ui/react-grid) and attributes matches to the
// packages whose input files contributed bytes. Presence is not quality: a demo decides (F3).
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const KEY = /\b(keydown|onKeyDown|keyup|onKeyUp|keypress)\b/;
// Arrow keys as minified code writes them: quoted names, unquoted object keys (React Flow: {ArrowUp:{x:0,y:-1}}),
// key-code maps (DHTMLX: up:38,down:40), runs of constants (@hello-pangea/dnd: Lc=37,Mc=38,$c=39,kc=40) and
// keyCode comparisons (react-colorful: r<37||r>40).
const ARROWS = new RegExp([
  String.raw`["'\x60](ArrowUp|ArrowDown|ArrowLeft|ArrowRight|arrowup|arrowdown|arrowleft|arrowright)["'\x60]`,
  String.raw`\bArrow(Up|Down|Left|Right)\s*:`,
  String.raw`\b(up|UP|arrowUp|ARROW_UP|UP_ARROW|down|DOWN|arrowDown|ARROW_DOWN|DOWN_ARROW)\s*:\s*(38|40)\b`,
  String.raw`=\s*37\s*,\s*[\w$]+\s*=\s*38\s*,\s*[\w$]+\s*=\s*39\s*,\s*[\w$]+\s*=\s*40\b`,
  String.raw`\b(keyCode|which)\s*===?\s*(37|38|39|40)\b`,
  String.raw`\b(37|38|39|40)\s*===?\s*[\w$]+\.(keyCode|which)\b`,
  String.raw`\b(37|38|39|40)\s*===?\s*[a-zA-Z_$]{1,3}\b[^\n]{0,40}\b(37|38|39|40)\b`,
  String.raw`[<>]=?\s*(37|40)\b[^\n]{0,20}[<>]=?\s*(37|40)\b`,
  String.raw`\bcase\s*(37|38|39|40)\s*:`,
].join('|'));
const ROLE = /\brole["']?\s*[:=,]\s*\\?["'`]([a-z]+)["'`\\]/g;
const ARIA = /\baria-([a-z]+)\b/g;
const ARIA_CAMEL = /\baria(Label|Labelledby|Describedby|Selected|Expanded|Level|Rowindex|Colindex|Rowcount|Colcount|Valuenow|Valuetext|Valuemin|Valuemax|Orientation|Controls|Activedescendant|Live|Hidden|Checked|Pressed|Setsize|Posinset|Multiselectable|Grabbed|Dropeffect|Roledescription|Keyshortcuts)\b/g;
export const WIDGET_ROLES = new Set(['application', 'grid', 'gridcell', 'row', 'rowheader', 'columnheader', 'treegrid', 'tree', 'treeitem', 'listbox', 'option', 'slider', 'separator', 'tab', 'tablist', 'tabpanel', 'menu', 'menubar', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'toolbar', 'dialog', 'alertdialog', 'combobox', 'spinbutton', 'scrollbar', 'switch', 'radiogroup', 'searchbox', 'textbox']);

function scanText(t) {
  const roles = new Set([...t.matchAll(ROLE)].map((m) => m[1]));
  const aria = new Set([...t.matchAll(ARIA)].map((m) => m[1]));
  for (const m of t.matchAll(ARIA_CAMEL)) aria.add(m[1].toLowerCase());
  return { key: KEY.test(t), arrows: ARROWS.test(t), roles, aria };
}

export async function scanBundle(size) {
  if (!size?.ok || !size.outDir || !existsSync(size.outDir)) return null;
  const files = (await readdir(size.outDir)).filter((f) => f.endsWith('.js'));
  const text = (await Promise.all(files.map((f) => readFile(path.join(size.outDir, f), 'utf8')))).join('\n');
  const all = scanText(text);
  const byPkg = {};
  for (const f of size.inputFiles || []) {
    const m = f.match(/node_modules\/((?:@[^/]+\/)?[^/]+)\//g);
    if (!m || !/\.(m?js|cjs|jsx|ts|tsx|svelte|vue)$/.test(f)) continue;
    const pkg = m[m.length - 1].replace(/node_modules\/|\/$/g, '');
    const r = scanText(await readFile(f, 'utf8').catch(() => ''));
    const wr = [...r.roles].filter((x) => WIDGET_ROLES.has(x));
    if (!r.key && !r.arrows && !wr.length && r.aria.size < 3) continue;
    const e = (byPkg[pkg] ??= { key: false, arrows: false, roles: new Set(), aria: 0 });
    e.key ||= r.key; e.arrows ||= r.arrows; wr.forEach((x) => e.roles.add(x)); e.aria = Math.max(e.aria, r.aria.size);
  }
  const widgetRoles = [...all.roles].filter((x) => WIDGET_ROLES.has(x)).sort();
  const verdict = all.key && all.arrows && (widgetRoles.length || all.aria.size >= 3) ? 'keyboard + ARIA' : all.key && all.arrows ? 'keyboard only' : widgetRoles.length || all.aria.size >= 3 ? 'ARIA only' : all.key ? 'key handler, no arrows or ARIA' : 'none found';
  return {
    verdict, keyHandlers: all.key, arrowKeys: all.arrows, widgetRoles, ariaAttributes: all.aria.size, aria: [...all.aria].sort().slice(0, 24),
    byPackage: Object.fromEntries(Object.entries(byPkg).map(([k, v]) => [k, { key: v.key, arrows: v.arrows, roles: [...v.roles].sort(), aria: v.aria }])),
  };
}
