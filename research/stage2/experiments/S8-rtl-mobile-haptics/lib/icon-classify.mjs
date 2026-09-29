// RTL icon classifier. Names come from the element (data-icon, class, <use href>, Material ligature text); the lists
// come from lib/icon-names.json, generated from Codex, Flutter, Material, Firefox (lab/icon-lists.mjs).
//   directional  mirror in RTL. strength "strong" when both Codex and Flutter mirror it or it is an arrow/chevron/
//                back/next/undo/redo/reply/send/external/list/indent name; "weak" when one source mirrors it
//   never        must not mirror. "strong" when two or more sources say so (checks, media, circular time, search);
//                "weak" for one source (calendar, edit/pencil, keyboard, camera)
//   ambiguous    the sources disagree: record a decision (INFO)
//   unknown      no source speaks to it: never a FAIL
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const STOP = new Set(['bi', 'fa', 'fas', 'far', 'fal', 'fab', 'fad', 'solid', 'regular', 'light', 'duotone', 'thin', 'sharp', 'rounded', 'round',
  'outlined', 'outline', 'filled', 'fill', 'stroke', 'icon', 'icons', 'i', 'mdi', 'lucide', 'ti', 'ri', 'ph', 'bold', 'alt', 'o', 'sm', 'md', 'lg', 'xl',
  'ios', 'new', 'material', 'symbols', 'svg', 'feather', 'glyphicon', 'cdx', 'dir', 'btn', 'size', 'sprite', 'svg-inline']);
const SYN = { person: 'user', people: 'users', plus: 'add', prev: 'previous', magnifier: 'search', trash: 'delete' };
// Bootstrap Icons number variants (check2, calendar3, speedometer2): the trailing digit is not part of the name
export const tokensOf = (w) => String(w).replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase().split(/[^a-z0-9]+/).map((t) => (/^[a-z]{3,}\d$/.test(t) ? t.slice(0, -1) : t)).filter((t) => t && !STOP.has(t) && !/^\d+$/.test(t));
export const keyOf = (w) => [...new Set(tokensOf(w).map((t) => SYN[t] || t))].sort().join('-');

const file = fileURLToPath(new URL('./icon-names.json', import.meta.url));
let LISTS = null;
const lists = () => (LISTS ??= existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { mirror: {}, never: {}, ambiguous: {} });

const CORE = /(arrow|chevron|caret|angle|triangle|navigate)s?[\s_-]*(double[\s_-]*)?(left|right|back|forward|next|before|prev|previous|start|end)\b|(double|dbl)[\s_-]*(chevron|arrow|angle)|arrow[\w-]*?[-_](left|right)\b|(^|[\s_#-])(back|forward|next|prev|previous)([\s_-]|$)|\bundo\b|\bredo\b|reply|(^|[\s_-])send([\s_-]|$)|external|open[-_ ]?in[-_ ]?new|new[-_]window|launch|indent|outdent|(^|[\s_-])list([\s_-]|$)|list[-_](ul|bullet|bulleted)|align[-_](left|right|start|end)|text[-_](left|right|start|end)|first[-_]page|last[-_]page|wrap[-_]text|text[-_]flow/i;

// true when the hyphenated token sequence t occurs in the word's tokens
const has = (toks, t) => (`-${toks.join('-')}-`).includes(`-${t}-`);

export function classifyIcon(name, context = '') {
  const L = lists();
  const words = String(name).split(/[\s#]+/).filter(Boolean);
  let best = { class: 'unknown' };
  const rank = { unknown: 0, never: 1, directional: 1, ambiguous: 1 };
  for (const w of words) {
    const toks = tokensOf(w); if (!toks.length) continue;
    const r = one(w, toks, L);
    if (rank[r.class] > rank[best.class]) best = r;
    if (best.class !== 'unknown') break;
  }
  // Bootstrap's box-arrow(-in)-left/right are its sign-in / sign-out icons: the log-in/out disagreement
  if (best.class === 'directional' && /box-arrow-(in-)?(left|right)\b/.test(name) && !/external|new tab|نافذة/i.test(context)) best = { class: 'ambiguous', family: 'logInOut', note: L.ambiguous.logInOut?.note };
  return best;
}
function one(w, toks, L) {
  for (const [fam, a] of Object.entries(L.ambiguous)) if (a.tokens.some((t) => has(toks, t))) return { class: 'ambiguous', family: fam, note: a.note };
  const src = L.mirror[keyOf(w)];
  if (src) return { class: 'directional', strength: src.length > 1 || CORE.test(w) ? 'strong' : 'weak', sources: src };
  const nev = Object.entries(L.never).find(([, n]) => n.tokens.some((t) => has(toks, t)));
  if (nev && nev[1].sources.length > 1) return { class: 'never', strength: 'strong', family: nev[0], sources: nev[1].sources };
  if (CORE.test(w)) return { class: 'directional', strength: 'strong', sources: ['pattern'] };
  if (nev) return { class: 'never', strength: 'weak', family: nev[0], sources: nev[1].sources };
  return { class: 'unknown' };
}

// The first version's hand-written lists, kept only so run.mjs can measure before/after on the same pages.
const L_MEDIA = /play|pause|stop|record|rewind|fast[-_ ]?forward|skip|media|volume/i;
const L_DIR = /(arrow|chevron|caret|angle|triangle)[\s_-]*(left|right|back|forward|next|prev|start|end)|(^|[\s_#-])(back|forward|next|prev|previous)([\s_-]|$)|undo|redo|reply|send|external|open[-_ ]?in[-_ ]?new|launch|indent|outdent|(^|[\s_-])list([\s_-]|$)|list-(ul|bullet)|align-(left|right)|trending|first[-_]page|last[-_]page|sidebar|double-?chevron|redirect/i;
const L_NEVER = /clock|time|schedule|alarm|timer|refresh|sync|reload|rotate|replay|history|check|tick|done|success|search|magnif|logo|brand|close|x-mark|menu|hamburger|cart|bag|heart|star|user|person|home|settings|gear|bell|mail|phone|calendar|camera|trash|delete|plus|minus|download|upload|sort|filter|alert|info|warning|error/i;
const L_AMB = /help|question|quote|attach|paperclip|chart|graph|log[-_ ]?(in|out)|sign[-_ ]?(in|out)|exit|cut|copy|paste|volume|speaker|edit|pencil/i;
export function classifyIconLegacy(name) {
  const c = L_MEDIA.test(name) ? (/volume|speaker/i.test(name) ? 'ambiguous' : 'never') : L_AMB.test(name) ? 'ambiguous' : L_DIR.test(name) ? 'directional' : L_NEVER.test(name) ? 'never' : 'unknown';
  return { class: c, strength: 'strong' };
}
