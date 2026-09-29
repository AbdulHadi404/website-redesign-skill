// Independent judge for the held-out TSX lint runs (added after review).
// It parses each file with @typescript-eslint/parser, finds the node an ESLint message points at,
// and decides from the AST — not from the lint selectors — whether that literal is a style value:
//   style-attr      inside a JSX style / sx / css attribute
//   style-call      inside css() / sx() / keyframes() / styled*() / makeStyles() arguments
//   style-template  inside a styled.x`…` / css`…` / keyframes`…` template
//   style-typed     inside an object typed or asserted as (React.)CSSProperties
//   style-named     inside a property or variable named style / styles / sx / *Style / *Styles
//   jsx-colour-attr a JSX fill / stroke / color / stopColor attribute
//   colour-variable a hex string assigned to a variable named like a colour
//   not-style       anything else (options objects, enums, schemas, data) → a false positive
// It also scans every file for the reference set: raw colour and raw length values (> 2 px) on
// token-owned style keys in ANY style context above, including the broad "style-named" context the
// lint selectors do not cover, so recall can be measured against something wider than the rule.
import { readFile } from 'node:fs/promises';
import { parse } from '@typescript-eslint/parser';

const STYLE_CALLEE = /^(css|sx|keyframes|styled|createStyles|makeStyles|createGlobalStyle|injectGlobal)$/;
const STYLE_NAME = /^(style|styles|sx|css)$|Styles?$/;
export const COLOR_KEY = /^(color|background|backgroundColor|border(Top|Right|Bottom|Left|Inline|Block)?(Start|End)?Color|borderColor|fill|stroke|outlineColor|caretColor|accentColor|textDecorationColor|columnRuleColor|stopColor|floodColor)$/;
export const SHORTHAND_COLOR_KEY = /^(border|borderTop|borderRight|borderBottom|borderLeft|outline|boxShadow|textShadow|background|backgroundImage)$/;
export const LEN_KEY = /^((padding|margin)(Top|Right|Bottom|Left|Inline|Block|InlineStart|InlineEnd|BlockStart|BlockEnd|Horizontal|Vertical)?|gap|rowGap|columnGap|fontSize|border(TopLeft|TopRight|BottomLeft|BottomRight|StartStart|StartEnd|EndStart|EndEnd)?Radius)$/;
export const POS_KEY = /^(top|right|bottom|left|inset(Inline|Block)?(Start|End)?)$/;
const HEX = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const COLOR_FN = /^(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)\(/;
const COLOR_IN = /#[0-9a-fA-F]{3,8}\b|\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/;
const KEYWORD = /^(currentColor|transparent|inherit|initial|unset|none|revert|revert-layer|auto|Canvas|CanvasText|ButtonFace|ButtonText|Highlight|HighlightText|GrayText|LinkText|Field|FieldText)$/i;

function withParents(ast) {
  const stack = [[ast, null]];
  while (stack.length) {
    const [n, p] = stack.pop();
    n.__parent = p;
    for (const k of Object.keys(n)) {
      if (k === '__parent' || k === 'parent' || k === 'loc' || k === 'range' || k === 'tokens' || k === 'comments') continue;
      const v = n[k];
      if (Array.isArray(v)) { for (const c of v) if (c && typeof c.type === 'string') stack.push([c, n]); }
      else if (v && typeof v.type === 'string') stack.push([v, n]);
    }
  }
  return ast;
}
const cache = new Map();
async function load(file) {
  if (!cache.has(file)) {
    const src = await readFile(file, 'utf8');
    let ast = null;
    try { ast = withParents(parse(src, { loc: true, range: true, jsx: true, ecmaVersion: 'latest', sourceType: 'module' })); } catch { /* unparsable */ }
    cache.set(file, { src, ast });
  }
  return cache.get(file);
}
function* walk(n) { const st = [n]; while (st.length) { const x = st.pop(); yield x; for (const k of Object.keys(x)) { if (k === '__parent' || k === 'parent' || k === 'loc' || k === 'range' || k === 'tokens' || k === 'comments') continue; const v = x[k]; if (Array.isArray(v)) { for (const c of v) if (c && typeof c.type === 'string') st.push(c); } else if (v && typeof v.type === 'string') st.push(v); } } }
const keyName = (prop) => prop?.key?.name ?? (typeof prop?.key?.value === 'string' ? prop.key.value : null);
const calleeName = (c) => c?.type === 'Identifier' ? c.name : c?.type === 'MemberExpression' ? (c.object.type === 'Identifier' ? c.object.name : calleeName(c.object)) : c?.type === 'CallExpression' ? calleeName(c.callee) : null;
const typeName = (t) => t?.typeName?.name ?? t?.typeName?.right?.name ?? null;

// The style context of a node, or 'not-style'.
export function contextOf(node) {
  let n = node;
  if (n.__parent?.type === 'JSXAttribute' && /^(fill|stroke|color|stopColor|floodColor|lightingColor)$/.test(n.__parent.name?.name)) return 'jsx-colour-attr';
  if (n.__parent?.type === 'VariableDeclarator' && n.type === 'Literal' && HEX.test(String(n.value)) && /(colou?r|brand|accent|bg|fg|background|foreground|primary|ink|tint)$/i.test(n.__parent.id?.name ?? '')) return 'colour-variable';
  while (n) {
    const p = n.__parent;
    if (!p) break;
    if (p.type === 'JSXAttribute' && /^(style|sx|css)$/.test(p.name?.name)) return 'style-attr';
    if (p.type === 'CallExpression' && n !== p.callee && STYLE_CALLEE.test(calleeName(p.callee) ?? '')) return 'style-call';
    if (p.type === 'TaggedTemplateExpression' && STYLE_CALLEE.test(calleeName(p.tag) ?? '')) return 'style-template';
    if ((p.type === 'TSAsExpression' || p.type === 'TSSatisfiesExpression') && /CSSProperties$/.test(typeName(p.typeAnnotation) ?? '')) return 'style-typed';
    if (p.type === 'VariableDeclarator' && /CSSProperties$/.test(typeName(p.id?.typeAnnotation?.typeAnnotation) ?? '')) return 'style-typed';
    if (p.type === 'Property' && n === p.value && STYLE_NAME.test(keyName(p) ?? '')) return 'style-named';
    if (p.type === 'VariableDeclarator' && STYLE_NAME.test(p.id?.name ?? '')) return 'style-named';
    n = p;
  }
  return 'not-style';
}

// px or rem lengths in a string or number, in px (rem = 16 px)
function lengths(v) {
  if (typeof v === 'number') return [v];
  return [...String(v).matchAll(/(-?\d*\.?\d+)(px|rem)\b/g)].map((m) => Number(m[1]) * (m[2] === 'rem' ? 16 : 1));
}
// What kind of value a flagged literal is (within its property).
export function valueKind(node) {
  const lit = node.type === 'UnaryExpression' ? node.argument : node;
  const v = node.type === 'UnaryExpression' ? -lit.value : lit.value;
  const prop = node.__parent?.type === 'Property' ? node.__parent : node.__parent?.__parent?.type === 'Property' ? node.__parent.__parent : null;
  const key = keyName(prop) ?? node.__parent?.name?.name ?? '';
  if (typeof v === 'string' && /%/.test(v) && !lengths(v).length) return 'percent';
  if (POS_KEY.test(key)) return lengths(v).some((x) => Math.abs(x) >= 999) ? 'visually-hidden idiom' : 'positional';
  if (typeof v === 'string' && (HEX.test(v) || COLOR_FN.test(v) || COLOR_IN.test(v))) return 'raw colour';
  if (typeof v === 'string' && /^[a-z]+$/i.test(v) && !KEYWORD.test(v)) return COLOR_KEY.test(key) ? 'named colour' : 'word';
  const L = lengths(v);
  if (L.length) return L.every((x) => Math.abs(x) <= 2) ? 'nudge ≤ 2px' : 'raw length';
  return 'other';
}

// Locate the node an ESLint message reports and judge it.
export async function judge(file, msg) {
  const { ast } = await load(file);
  if (!ast) return { context: 'unparsable', kind: 'other' };
  // ESLint 10 messages carry no nodeType: take the innermost value-like node starting at the reported position.
  const RANK = { Literal: 3, TemplateElement: 3, UnaryExpression: 2, JSXAttribute: 1 };
  let found = null;
  for (const n of walk(ast)) {
    if (n.loc && n.loc.start.line === msg.line && n.loc.start.column === msg.column - 1 && (!msg.nodeType || n.type === msg.nodeType)) {
      if (!found || (RANK[n.type] ?? 0) > (RANK[found.type] ?? 0)) found = n;
    }
  }
  if (!found) return { context: 'not-found', kind: 'other' };
  return { context: contextOf(found), kind: valueKind(found) };
}

// Reference set: every raw colour / raw length (> 2 px) on a token-owned key inside any style context.
export async function referenceSet(file) {
  const { ast, src } = await load(file);
  if (!ast) return [];
  const lines = src.split('\n');
  const out = [];
  for (const n of walk(ast)) {
    let valueNode = null, key = null;
    if (n.type === 'Property' && (n.value.type === 'Literal' || (n.value.type === 'UnaryExpression' && n.value.argument.type === 'Literal'))) { valueNode = n.value; key = keyName(n); }
    else if (n.type === 'JSXAttribute' && n.value?.type === 'Literal' && /^(fill|stroke|color|stopColor|floodColor)$/.test(n.name?.name)) { valueNode = n.value; key = n.name.name; }
    if (!valueNode || !key) continue;
    const ctx = contextOf(valueNode);
    if (ctx === 'not-style') continue;
    const kind = valueKind(valueNode);
    const token = (COLOR_KEY.test(key) && ['raw colour', 'named colour'].includes(kind)) || (SHORTHAND_COLOR_KEY.test(key) && kind === 'raw colour') || (LEN_KEY.test(key) && kind === 'raw length') || (key === 'fill' || key === 'stroke' ? kind === 'raw colour' : false);
    if (token) out.push({ line: valueNode.loc.start.line, column: valueNode.loc.start.column + 1, key, context: ctx, kind, text: lines[valueNode.loc.start.line - 1].trim().slice(0, 140) });
  }
  return out;
}
