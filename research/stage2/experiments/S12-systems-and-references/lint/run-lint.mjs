#!/usr/bin/env node
// S12 token-enforcement lab: run candidate lint setups over a labelled fixture and count
// true positives, misses and false positives per line; then test what a Tailwind v4
// @theme lockdown does and does not stop.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import stylelint from 'stylelint';
import { ESLint } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import atlaskit from '@atlaskit/eslint-plugin-design-system';
import betterTw from 'eslint-plugin-better-tailwindcss';
import twPlugin from 'eslint-plugin-tailwindcss';
import { compile } from '@tailwindcss/node';

const here = path.dirname(fileURLToPath(import.meta.url));
const fx = path.join(here, 'fixture', 'src');
const CSS = path.join(fx, 'components.css');
const TSX = path.join(fx, 'Button.tsx');
const LOCKED = path.join(fx, 'tailwind-locked.css');

async function labels(file) {
  const lines = (await readFile(file, 'utf8')).split('\n');
  const out = new Map();
  lines.forEach((l, i) => { const m = /expect:(V|OK)\s*(?:\*\/)?\s*\}?\s*$/.exec(l); if (m) out.set(i + 1, m[1]); });
  return out;
}

function score(lab, flaggedLines, messages) {
  let tp = 0, fn = 0, fp = 0, tn = 0; const misses = [], falsePos = [];
  for (const [line, kind] of lab) {
    const hit = flaggedLines.has(line);
    if (kind === 'V') hit ? tp++ : (fn++, misses.push(line));
    else hit ? (fp++, falsePos.push(line)) : tn++;
  }
  const unlabelled = [...flaggedLines].filter((l) => !lab.has(l));
  return { violations: tp + fn, ok: fp + tn, caught: tp, missed: fn, falsePositives: fp, recall: Math.round((tp / (tp + fn)) * 1000) / 10, precision: tp + fp ? Math.round((tp / (tp + fp)) * 1000) / 10 : null, missLines: misses, falsePositiveLines: falsePos, unlabelledLinesFlagged: unlabelled, messages };
}

// ------------------------------------------------------------------ stylelint setups
const COLOR_FUNCS = ['rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'lab', 'lch', 'oklab', 'oklch', 'color'];
const SPACING_PROPS = '/^(padding|margin|gap|row-gap|column-gap|inset|top|right|bottom|left)/';
// A raw px/rem length anywhere in the value, unless the value uses var(); zero is allowed.
const BARE_LENGTH = '/^(?!.*var\\().*(?:^|[\\s(,])-?(?:[1-9]\\d*(?:\\.\\d+)?|0?\\.\\d*[1-9]\\d*)(?:px|rem)\\b/';
// Second round (after review): positional properties are not token-owned by default, and optical
// nudges of 2 px (0.125rem) or less, either sign, are allowed. Only a length ABOVE 2 px is flagged.
const TOKEN_PROPS = '/^(padding|margin|gap|row-gap|column-gap)/';
const POSITIONAL_PROPS = '/^(inset|top|right|bottom|left)/';
const BIG_LENGTH = '/^(?!.*var\\().*(?:^|[\\s(,])-?(?:(?:[3-9]|[1-9]\\d+)(?:\\.\\d+)?|2\\.\\d*[1-9]\\d*)px\\b|^(?!.*var\\().*(?:^|[\\s(,])-?(?:[1-9]\\d*(?:\\.\\d+)?|0?\\.(?:[2-9]\\d*|1[3-9]\\d*|12[6-9]\\d*|125\\d*[1-9]\\d*))rem\\b/';
const cssE = (extra = {}) => ({ rules: {
  'color-no-hex': true,
  'color-named': 'never',
  'function-disallowed-list': COLOR_FUNCS,
  'declaration-property-value-disallowed-list': { [TOKEN_PROPS]: [BIG_LENGTH], 'font-size': [BIG_LENGTH], '/radius$/': [BIG_LENGTH], ...extra },
} });
const STYLE_SETUPS = {
  'css-E-token-props-no-nudges': {
    note: 'second round, recommended: core rules; lengths flagged only on padding/margin/gap/font-size/radius and only above 2 px (0.125rem), either sign; positional properties not checked',
    config: cssE(),
  },
  'css-E+pos-opt-in-positional': {
    note: 'E plus top/right/bottom/left/inset (the opt-in), to show what positional checking adds',
    config: cssE({ [POSITIONAL_PROPS]: [BIG_LENGTH] }),
  },
  'css-A-builtins': {
    note: 'stylelint core rules only: color-no-hex, color-named, function-disallowed-list, declaration-property-unit-disallowed-list',
    config: { rules: {
      'color-no-hex': true,
      'color-named': 'never',
      'function-disallowed-list': COLOR_FUNCS,
      'declaration-property-unit-disallowed-list': { [SPACING_PROPS]: ['px', 'rem', 'em'], 'font-size': ['px', 'rem', 'em'], '/radius$/': ['px', 'rem', 'em'] },
    } },
  },
  'css-D-builtins-bare-lengths': {
    note: 'revised after the held-out run (so its held-out numbers are not blind): A, but lengths are flagged only when bare (no var(), not zero, not em)',
    config: { rules: {
      'color-no-hex': true,
      'color-named': 'never',
      'function-disallowed-list': COLOR_FUNCS,
      'declaration-property-value-disallowed-list': { [SPACING_PROPS]: [BARE_LENGTH], 'font-size': [BARE_LENGTH], '/radius$/': [BARE_LENGTH] },
    } },
  },
  'css-B1-strict-value-defaults': {
    note: 'stylelint-declaration-strict-value with its default ignoreFunctions: true',
    config: { plugins: ['stylelint-declaration-strict-value'], rules: {
      'scale-unlimited/declaration-strict-value': [['/color$/', 'fill', 'stroke', 'background', 'box-shadow', '/^padding/', '/^margin/', 'gap', 'font-size', '/radius$/'], { ignoreValues: ['currentColor', 'transparent', 'inherit', 'initial', 'unset', 'none', '0', 'auto'], expandShorthand: true }],
    } },
  },
  'css-B2-strict-value-no-functions': {
    note: 'stylelint-declaration-strict-value with ignoreFunctions: false (functions other than var() are flagged)',
    config: { plugins: ['stylelint-declaration-strict-value'], rules: {
      'scale-unlimited/declaration-strict-value': [['/color$/', 'fill', 'stroke', 'background', 'box-shadow', '/^padding/', '/^margin/', 'gap', 'font-size', '/radius$/'], { ignoreValues: ['currentColor', 'transparent', 'inherit', 'initial', 'unset', 'none', '0', 'auto'], expandShorthand: true, ignoreFunctions: false }],
    } },
  },
  'css-C-builtins-plus-strict-value': {
    note: 'A + B1 together',
    config: { plugins: ['stylelint-declaration-strict-value'], rules: {
      'color-no-hex': true, 'color-named': 'never', 'function-disallowed-list': COLOR_FUNCS,
      'declaration-property-unit-disallowed-list': { [SPACING_PROPS]: ['px', 'rem', 'em'], 'font-size': ['px', 'rem', 'em'], '/radius$/': ['px', 'rem', 'em'] },
      'scale-unlimited/declaration-strict-value': [['/color$/', 'fill', 'stroke', 'background', 'box-shadow', '/^padding/', '/^margin/', 'gap', 'font-size', '/radius$/'], { ignoreValues: ['currentColor', 'transparent', 'inherit', 'initial', 'unset', 'none', '0', 'auto'], expandShorthand: true }],
    } },
  },
};

async function runStylelint() {
  const lab = await labels(CSS);
  const out = {};
  for (const [id, s] of Object.entries(STYLE_SETUPS)) {
    const r = await stylelint.lint({ files: [CSS], config: s.config, configBasedir: path.join(here, '..') });
    const w = r.results[0].warnings;
    out[id] = { note: s.note, ...score(lab, new Set(w.map((x) => x.line)), w.map((x) => `${x.line}: ${x.rule}`)) };
  }
  return out;
}

// ------------------------------------------------------------------ ESLint setups
const HEX = '^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$';
const CORE_SELECTORS = [
  { selector: `Literal[value=/${HEX}/]`, message: 'Raw hex colour: use a colour token.' },
  { selector: 'Literal[value=/^(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\\(/]', message: 'Raw colour function: use a colour token.' },
  { selector: 'TemplateElement[value.raw=/#[0-9a-fA-F]{3,8}\\b|\\b(rgb|rgba|hsl|hsla|oklch)\\(/]', message: 'Raw colour in a CSS-in-JS template: use a token.' },
  { selector: 'Property[key.name=/^(color|background|backgroundColor|borderColor|fill|stroke|outlineColor)$/] > Literal[value=/^[a-z]+$/i][value!=/^(currentColor|transparent|inherit|initial|unset|none)$/i]', message: 'Named colour: use a colour token.' },
  { selector: 'Property[key.name=/^(padding|margin|gap|rowGap|columnGap|fontSize|borderRadius|top|left|right|bottom|inset)/] > Literal[raw=/^[\'"]?-?[1-9]/]', message: 'Raw length: use a spacing, type or radius token.' },
  { selector: 'JSXAttribute[name.name=/^class(Name)?$/] Literal[value=/(^|\\s)(p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|rounded(-[a-z]+)?|text|bg|border|shadow|fill|stroke|ring|outline|from|to|via)-\\[/]', message: 'Arbitrary Tailwind value for a token-owned property.' },
];
// Same checks, but a hex string is reported only where it is used as a colour: an object
// property (style objects, css({})), a JSX colour attribute, or a variable named like a colour.
const HEX_ANY = `Literal[value=/${HEX}/]`;
const SCOPED_SELECTORS = [
  { selector: `Property > ${HEX_ANY}`, message: 'Raw hex colour: use a colour token.' },
  { selector: `JSXAttribute[name.name=/^(fill|stroke|color|stopColor|floodColor|lightingColor)$/] > ${HEX_ANY}`, message: 'Raw hex colour: use a colour token.' },
  { selector: `VariableDeclarator[id.name=/(colou?r|brand|accent|bg|fg|background|foreground|primary|ink|tint)/i] > ${HEX_ANY}`, message: 'Raw hex colour: use a colour token.' },
  ...CORE_SELECTORS.slice(1),
];
// Second round (after review): every check is scoped to a STYLE context — a JSX style/sx/css attribute,
// a css()/sx()/keyframes()/styled*() argument, a styled/css template, or an object typed as CSSProperties —
// with anchored key regexes, token-owned keys only (no top/left/…), lengths only above 2 px, and no
// percentages. Hex in a JSX colour attribute or a colour-named variable is still reported.
const CTX = [
  'JSXAttribute[name.name=/^(style|sx|css)$/]',
  'CallExpression[callee.name=/^(css|sx|keyframes|styled|createStyles|makeStyles)$/] > ObjectExpression',
  'CallExpression[callee.object.name="styled"] > ObjectExpression',
  'CallExpression[callee.callee.name="styled"] > ObjectExpression',
  'VariableDeclarator[id.typeAnnotation.typeAnnotation.typeName.name="CSSProperties"]',
  'VariableDeclarator[id.typeAnnotation.typeAnnotation.typeName.right.name="CSSProperties"]',
  'TSAsExpression[typeAnnotation.typeName.name="CSSProperties"]',
  'TSAsExpression[typeAnnotation.typeName.right.name="CSSProperties"]',
];
const K_COLOR = '/^(color|background|backgroundColor|border(Top|Right|Bottom|Left|Inline|Block)?(Start|End)?Color|borderColor|fill|stroke|outlineColor|caretColor|accentColor|textDecorationColor|columnRuleColor|stopColor|floodColor)$/';
const K_SHORT = '/^(border|borderTop|borderRight|borderBottom|borderLeft|outline|boxShadow|textShadow|background|backgroundImage)$/';
const K_LEN = '/^((padding|margin)(Top|Right|Bottom|Left|Inline|Block|InlineStart|InlineEnd|BlockStart|BlockEnd|Horizontal|Vertical)?|gap|rowGap|columnGap|fontSize|border(TopLeft|TopRight|BottomLeft|BottomRight|StartStart|StartEnd|EndStart|EndEnd)?Radius)$/';
const V_HEX = `/${HEX}/`;
const V_FN = '/^(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)\\(/';
const V_IN = '/#[0-9a-fA-F]{3,8}\\b|\\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch)\\(/';
const V_NAMED_NOT = '/^(currentColor|transparent|inherit|initial|unset|none|revert|revert-layer|Canvas|CanvasText|ButtonFace|ButtonText|Highlight|HighlightText|GrayText|LinkText|Field|FieldText)$/i';
const V_BIGLEN = BIG_LENGTH; // same test as the CSS rule: a px/rem length above 2 px, not inside var()
const STYLE_SELECTORS = CTX.flatMap((c) => [
  { selector: `${c} Property[key.name=${K_COLOR}] > Literal[value=${V_HEX}]`, message: 'Raw hex colour in a style: use a colour token.' },
  { selector: `${c} Property[key.name=${K_COLOR}] > Literal[value=${V_FN}]`, message: 'Raw colour function in a style: use a colour token.' },
  { selector: `${c} Property[key.name=${K_COLOR}] > Literal[value=/^[a-z]+$/i][value!=${V_NAMED_NOT}]`, message: 'Named colour in a style: use a colour token.' },
  { selector: `${c} Property[key.name=${K_SHORT}] > Literal[value=${V_IN}]`, message: 'Raw colour inside a style shorthand: use a colour token.' },
  { selector: `${c} Property[key.name=${K_LEN}] > Literal[value=${V_BIGLEN}]`, message: 'Raw length (> 2px) in a style: use a spacing, type or radius token.' },
  { selector: `${c} Property[key.name=${K_LEN}] > Literal[value>2]`, message: 'Raw length (> 2px) in a style: use a spacing, type or radius token.' },
  { selector: `${c} Property[key.name=${K_LEN}] > UnaryExpression[operator="-"] > Literal[value>2]`, message: 'Raw length (> 2px) in a style: use a spacing, type or radius token.' },
]);
const STYLE_SCOPED_SELECTORS = [
  ...STYLE_SELECTORS,
  { selector: `JSXAttribute[name.name=/^(fill|stroke|color|stopColor|floodColor|lightingColor)$/] > Literal[value=${V_HEX}]`, message: 'Raw hex colour attribute: use a colour token.' },
  { selector: `VariableDeclarator[id.name=/(colou?r|brand|accent|bg|fg|background|foreground|primary|ink|tint)$/i] > Literal[value=${V_HEX}]`, message: 'Raw hex colour: use a colour token.' },
  { selector: 'TaggedTemplateExpression[tag.object.name="styled"] TemplateElement[value.raw=/#[0-9a-fA-F]{3,8}\\b|\\b(rgb|rgba|hsl|hsla|oklch)\\(/]', message: 'Raw colour in a styled template: use a token.' },
  { selector: 'TaggedTemplateExpression[tag.callee.name="styled"] TemplateElement[value.raw=/#[0-9a-fA-F]{3,8}\\b|\\b(rgb|rgba|hsl|hsla|oklch)\\(/]', message: 'Raw colour in a styled template: use a token.' },
  { selector: 'TaggedTemplateExpression[tag.name=/^(css|keyframes|createGlobalStyle|injectGlobal)$/] TemplateElement[value.raw=/#[0-9a-fA-F]{3,8}\\b|\\b(rgb|rgba|hsl|hsla|oklch)\\(/]', message: 'Raw colour in a css template: use a token.' },
];
const tsxBase = { files: ['**/*.tsx'], languageOptions: { parser: tsParser, parserOptions: { ecmaFeatures: { jsx: true } } } };
const RESTRICT_ARBITRARY = [{ pattern: '^(?:[a-z-]+:)*(p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|rounded(?:-[a-z]+)?|text|bg|border|shadow|fill|stroke|ring|outline|from|to|via)-\\[.+\\]$', message: 'Arbitrary value for a token-owned property: $0' }];
const ES_SETUPS = {
  'js-E1-core-no-restricted-syntax': { note: 'ESLint core rule with AST selectors, zero dependencies', config: [{ ...tsxBase, rules: { 'no-restricted-syntax': ['error', ...CORE_SELECTORS] } }] },
  'js-E2-atlaskit-ensure-design-token-usage': { note: '@atlaskit/eslint-plugin-design-system ensure-design-token-usage (domains color + spacing)', config: [{ ...tsxBase, plugins: { '@atlaskit/design-system': atlaskit }, rules: { '@atlaskit/design-system/ensure-design-token-usage': ['error', { domains: ['color', 'spacing'], applyImport: false }] } }] },
  'js-E3-better-tailwindcss-locked': { note: 'eslint-plugin-better-tailwindcss: no-unknown-classes against the locked @theme + no-restricted-classes for arbitrary token-owned values', config: [{ ...tsxBase, plugins: { 'better-tailwindcss': betterTw }, settings: { 'better-tailwindcss': { entryPoint: LOCKED } }, rules: { 'better-tailwindcss/no-unknown-classes': 'error', 'better-tailwindcss/no-restricted-classes': ['error', { restrict: RESTRICT_ARBITRARY }] } }] },
  'js-E4-tailwindcss-plugin-locked': { note: 'eslint-plugin-tailwindcss v4: no-arbitrary-value + no-custom-classname against the locked @theme', config: [{ ...tsxBase, plugins: { tailwindcss: twPlugin }, settings: { tailwindcss: { cssConfigPath: LOCKED } }, rules: { 'tailwindcss/no-arbitrary-value': 'error', 'tailwindcss/no-custom-classname': 'error' } }] },
  'js-E1s-core-scoped-hex': { note: 'E1 with hex strings reported only in colour positions (property value, colour attribute, colour-named variable)', config: [{ ...tsxBase, rules: { 'no-restricted-syntax': ['error', ...SCOPED_SELECTORS] } }] },
  'js-E1t-style-scoped': { note: 'second round, recommended (warning level): E1 checks only inside style contexts, anchored key regexes, token-owned keys only, lengths > 2 px, no percentages', config: [{ ...tsxBase, rules: { 'no-restricted-syntax': ['warn', ...STYLE_SCOPED_SELECTORS] } }] },
  'js-E5t-style-scoped-plus-better-tailwindcss': { note: 'second round: E1t + E3', config: [{ ...tsxBase, plugins: { 'better-tailwindcss': betterTw }, settings: { 'better-tailwindcss': { entryPoint: LOCKED } }, rules: { 'no-restricted-syntax': ['warn', ...STYLE_SCOPED_SELECTORS], 'better-tailwindcss/no-unknown-classes': 'warn', 'better-tailwindcss/no-restricted-classes': ['warn', { restrict: RESTRICT_ARBITRARY }] } }] },
  'js-E5-core-plus-better-tailwindcss': { note: 'E1s + E3 (recommended hand-over for a Tailwind React codebase)', config: [{ ...tsxBase, plugins: { 'better-tailwindcss': betterTw }, settings: { 'better-tailwindcss': { entryPoint: LOCKED } }, rules: { 'no-restricted-syntax': ['error', ...SCOPED_SELECTORS], 'better-tailwindcss/no-unknown-classes': 'error', 'better-tailwindcss/no-restricted-classes': ['error', { restrict: RESTRICT_ARBITRARY }] } }] },
};

async function runEslint() {
  const lab = await labels(TSX);
  const out = {};
  for (const [id, s] of Object.entries(ES_SETUPS)) {
    try {
      const eslint = new ESLint({ cwd: path.join(here, 'fixture'), overrideConfigFile: true, overrideConfig: s.config });
      const t0 = performance.now();
      const [r] = await eslint.lintFiles([TSX]);
      const ms = Math.round(performance.now() - t0);
      const fatal = r.messages.filter((m) => m.fatal || !m.ruleId);
      const ms2 = r.messages.filter((m) => m.ruleId);
      out[id] = { note: s.note, lintMs: ms, fatal: fatal.map((m) => m.message), ...score(lab, new Set(ms2.map((m) => m.line)), ms2.map((m) => `${m.line}: ${m.ruleId}: ${m.message.slice(0, 90)}`)) };
    } catch (e) {
      out[id] = { note: s.note, error: String(e.message).slice(0, 300) };
    }
  }
  return out;
}

// ------------------------------------------------------------------ Tailwind v4 lockdown
async function runTailwind() {
  const cands = ['bg-red-500', 'p-4', 'p-13', 'text-sm', 'rounded-md', 'shadow-lg', 'text-[#ff0000]', 'p-[13px]', 'rounded-[6px]', 'text-[15px]', 'bg-accent', 'bg-accent/50', 'p-sm', 'rounded-card', 'text-fg'];
  const esc = (k) => '.' + k.replace(/[[\]#/.]/g, (m) => '\\' + m);
  const out = {};
  for (const [name, file] of [['open', 'tailwind-open.css'], ['locked', 'tailwind-locked.css']]) {
    const css = await readFile(path.join(fx, file), 'utf8');
    const c = await compile(css, { base: fx, onDependency() {} });
    const built = c.build(cands);
    out[name] = Object.fromEntries(cands.map((k) => [k, built.includes(esc(k))]));
  }
  return { candidates: cands, generated: out, tailwindVersion: (await import('tailwindcss/package.json', { with: { type: 'json' } })).default.version };
}

// ------------------------------------------------------------------ held-out code (not seen while tuning)
// shadcn/ui new-york-v4 registry (ui + blocks) and Radix Themes component CSS: both are token-first
// codebases, so every flag is either a real raw value or a false positive. Fetched by fetch-vendor.mjs.
import { readdir } from 'node:fs/promises';
async function walk(dir, ext) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p, ext))); else if (p.endsWith(ext)) out.push(p);
  }
  return out;
}
// CSS categories (fixed before counting): token definitions (a custom property declaration — in a real setup
// the token file is in ignoreFiles), then what the flagged value is.
function catCss(t) {
  const prop = (/^\s*([-\w]+)\s*:/.exec(t) ?? [])[1] ?? '';
  const v = t.replace(/^[^:]+:\s*/, '').replace(/;.*$/, '').replace(/\/\*.*$/, '').trim();
  if (prop.startsWith('--')) return 'token-definition';
  if (/^-?0(\.0+)?[a-z%]*$/.test(v)) return 'zero-with-unit';
  // a colour written out: a hex, a colour function with no var() inside, or a named colour word
  const rawFn = [...v.matchAll(/\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(([^()]*)\)/gi)].some((m) => !/var\(/.test(m[2]));
  const named = /(?:^|[\s,)])(white|black|red|green|blue|gray|grey|silver|yellow|orange|purple|pink|navy|teal)(?:$|[\s,;])/i.test(v);
  if (/#[0-9a-f]{3,8}\b/i.test(v) || rawFn || named) return 'raw colour';
  if (/var\(/.test(v)) return 'derived-from-var';
  if (/^(inherit|currentcolor|transparent|canvas|canvastext|initial|unset)$/i.test(v)) return 'keyword';
  if (/^(inset|top|right|bottom|left)/.test(prop)) return 'positional';
  const L = [...v.matchAll(/(-?\d*\.?\d+)(px|rem)\b/g)].map((m) => Number(m[1]) * (m[2] === 'rem' ? 16 : 1));
  if (!L.length && /em\b/.test(v)) return 'em-relative';
  if (L.length && L.every((x) => Math.abs(x) <= 2)) return 'nudge ≤ 2px';
  if (/^margin/.test(prop) && L.some((x) => x < 0)) return 'negative margin > 2px';
  if (L.length) return 'raw length > 2px';
  return 'other';
}

// Held-out code, never used while writing the rules:
//   round 1: shadcn/ui new-york-v4 (Tailwind classes) and Radix Themes component CSS;
//   round 2 (after review): five style-object-heavy TSX codebases and three more token-first stylesheets.
import { judge, referenceSet } from './style-context.mjs';
async function walkSrc(dir, ext) {
  return (await walk(dir, ext)).filter((p) => !/\.test\.|\.spec\.|stories|\/test\/|__tests__/.test(p));
}
export async function runHeldOut() {
  const vend = path.join(here, '..', 'vendor');
  const npm = (d) => path.join(vend, 'npm', d, 'package');
  const tsxSets = {
    'shadcn/ui new-york-v4': [...(await walk(path.join(vend, 'shadcn', 'apps/v4/registry/new-york-v4/ui'), '.tsx')), ...(await walk(path.join(vend, 'shadcn', 'apps/v4/registry/new-york-v4/blocks'), '.tsx'))],
    'tldraw 5.4.2 src/lib': await walkSrc(path.join(npm('tldraw'), 'src/lib'), '.tsx'),
    '@blocknote/react 0.55.0': await walkSrc(path.join(npm('blocknote-react'), 'src'), '.tsx'),
    '@blocknote/shadcn 0.55.0': await walkSrc(path.join(npm('blocknote-shadcn'), 'src'), '.tsx'),
    'react-arborist 3.16.0': await walkSrc(path.join(npm('react-arborist'), 'src'), '.tsx'),
    '@lexical/react 0.52.0': await walkSrc(path.join(npm('lexical-react'), 'src'), '.tsx'),
  };
  const cssSets = {
    'Radix Themes components': await walk(path.join(vend, 'radix-themes', 'packages/radix-ui-themes/src/components'), '.css'),
    'tldraw 5.4.2 ui.css': [path.join(npm('tldraw'), 'src/lib/ui.css')],
    'ckeditor5 48.5.2 dist/ckeditor5.css': [path.join(npm('ckeditor5'), 'dist/ckeditor5.css')],
    'ag-grid-community 36.2.0 styles/ag-grid.css': [path.join(npm('ag-grid-community'), 'styles/ag-grid.css')],
  };
  const lineCount = async (files) => { let n = 0; for (const f of files) n += (await readFile(f, 'utf8')).split('\n').length; return n; };
  const res = { tsx: {}, css: {} };
  const esSetups = {
    'js-E1-core-no-restricted-syntax': [{ ...tsxBase, rules: { 'no-restricted-syntax': ['error', ...CORE_SELECTORS] } }],
    'js-E1s-core-scoped-hex': [{ ...tsxBase, rules: { 'no-restricted-syntax': ['error', ...SCOPED_SELECTORS] } }],
    'js-E1t-style-scoped': [{ ...tsxBase, rules: { 'no-restricted-syntax': ['warn', ...STYLE_SCOPED_SELECTORS] } }],
    'js-E3r-better-tailwindcss-restricted-only': [{ ...tsxBase, plugins: { 'better-tailwindcss': betterTw }, rules: { 'better-tailwindcss/no-restricted-classes': ['error', { restrict: RESTRICT_ARBITRARY }] } }],
  };
  // A hit is a true positive when the independent judge puts it in a style context AND it is a raw colour or
  // a raw length above 2 px; a false positive when it is not in a style context, or is a percentage, a
  // positional value or the visually-hidden idiom; debatable when it is a ≤ 2 px nudge or a bare word.
  const verdict = (j) => {
    if (['not-style', 'not-found', 'unparsable'].includes(j.context)) return 'false positive';
    if (['percent', 'positional', 'visually-hidden idiom'].includes(j.kind)) return 'false positive';
    if (['raw colour', 'named colour', 'raw length'].includes(j.kind)) return 'true positive';
    return 'debatable';
  };
  for (const [name, files] of Object.entries(tsxSets)) {
    const set = { files: files.length, lines: await lineCount(files), setups: {} };
    const ref = []; for (const f of files) for (const r of await referenceSet(f)) ref.push({ file: f, ...r });
    set.referenceRawStyleValues = ref.length;
    for (const [id, config] of Object.entries(esSetups)) {
      if (id.startsWith('js-E3r') && !name.startsWith('shadcn')) continue; // Tailwind-class rule: only the Tailwind codebase
      const eslint = new ESLint({ cwd: vend, overrideConfigFile: true, overrideConfig: config });
      const results = await eslint.lintFiles(files);
      const flags = [];
      for (const r of results) {
        const lines = (await readFile(r.filePath, 'utf8')).split('\n');
        for (const m of r.messages.filter((x) => x.ruleId === 'no-restricted-syntax' || x.ruleId?.startsWith('better-tailwindcss/'))) {
          const j = id.startsWith('js-E3r') ? { context: 'tailwind-class', kind: 'class' } : await judge(r.filePath, m);
          flags.push({ file: path.relative(vend, r.filePath), line: m.line, column: m.column, rule: m.message.slice(0, 120), text: lines[m.line - 1].trim().slice(0, 140), ...j, verdict: id.startsWith('js-E3r') ? undefined : verdict(j) });
        }
      }
      const by = (k) => { const o = {}; for (const f of flags) if (f[k]) o[f[k]] = (o[f[k]] ?? 0) + 1; return o; };
      const hitRef = id.startsWith('js-E3r') ? null : ref.filter((x) => flags.some((f) => path.join(vend, f.file) === x.file && f.line === x.line && f.column === x.column)).length;
      set.setups[id] = { flags: flags.length, verdicts: by('verdict'), contexts: by('context'), kinds: by('kind'), referenceCaught: hitRef, sample: flags };
    }
    set.referenceSample = ref.slice(0, 80).map((x) => ({ ...x, file: path.relative(vend, x.file) }));
    res.tsx[name] = set;
  }
  // Tailwind arbitrary-value categories (shadcn only)
  const catTw = (m) => {
    const cls = (/: (\S+)$/.exec(m) ?? [])[1] ?? '';
    const val = (/\[(.+)\]$/.exec(cls) ?? [])[1] ?? '';
    if (/var\(|--/.test(val)) return 'derived-from-var';
    if (/^(inherit|Canvas|CanvasText|currentColor|transparent)$/.test(val)) return 'keyword';
    if (/^-?0[a-z%]*$/.test(val)) return 'zero-with-unit';
    return 'raw-literal';
  };
  const tw = res.tsx['shadcn/ui new-york-v4'].setups['js-E3r-better-tailwindcss-restricted-only'];
  tw.categories = {}; for (const f of tw.sample) { f.category = catTw(f.rule); tw.categories[f.category] = (tw.categories[f.category] ?? 0) + 1; }
  tw.topLiterals = Object.entries(tw.sample.reduce((o, f) => { const c = (/: (\S+)$/.exec(f.rule) ?? [])[1] ?? ''; o[c] = (o[c] ?? 0) + 1; return o; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5);

  for (const [name, files] of Object.entries(cssSets)) {
    const set = { files: files.length, lines: await lineCount(files), setups: {} };
    for (const id of ['css-A-builtins', 'css-D-builtins-bare-lengths', 'css-E-token-props-no-nudges', 'css-E+pos-opt-in-positional', 'css-B1-strict-value-defaults', 'css-B2-strict-value-no-functions']) {
      const r = await stylelint.lint({ files, config: STYLE_SETUPS[id].config, configBasedir: path.join(here, '..') });
      const flags = [];
      for (const f of r.results) {
        const lines = (await readFile(f.source, 'utf8')).split('\n');
        for (const w of f.warnings) { if (w.rule === 'CssSyntaxError') continue; const text = lines[w.line - 1].trim().slice(0, 140); flags.push({ file: path.relative(vend, f.source), line: w.line, rule: w.rule, text, category: catCss(text) }); }
      }
      const cats = {}; for (const x of flags) cats[x.category] = (cats[x.category] ?? 0) + 1;
      const counted = flags.filter((x) => x.category !== 'token-definition');
      // Repeated literals are token candidates: the most frequent flagged declarations.
      const rep = {}; for (const x of counted) { const d = x.text.replace(/\s*;.*$/, '').replace(/\s+/g, ' '); rep[d] = (rep[d] ?? 0) + 1; }
      set.setups[id] = { flags: counted.length, tokenDefinitionsExcluded: flags.length - counted.length, categories: cats, topRepeated: Object.entries(rep).sort((a, b) => b[1] - a[1]).slice(0, 6), sample: counted };
    }
    res.css[name] = set;
  }
  return res;
}

export async function runLint() {
  const versions = {};
  for (const p of ['stylelint', 'stylelint-declaration-strict-value', 'eslint', '@atlaskit/eslint-plugin-design-system', 'eslint-plugin-better-tailwindcss', 'eslint-plugin-tailwindcss', 'tailwindcss']) {
    versions[p] = JSON.parse(await readFile(path.join(here, '..', 'node_modules', p, 'package.json'), 'utf8')).version;
  }
  return { versions, stylelint: await runStylelint(), eslint: await runEslint(), tailwind: await runTailwind(), heldOut: await runHeldOut() };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await runLint();
  await writeFile(path.join(here, 'lint-results.json'), JSON.stringify(r, null, 1));
  const row = (id, x) => ({ setup: id, V: x.violations, caught: x.caught, missed: x.missed, OK: x.ok, falsePos: x.falsePositives, err: x.error ? x.error.slice(0, 60) : (x.fatal?.length ? x.fatal[0].slice(0, 60) : '') });
  console.table([...Object.entries(r.stylelint), ...Object.entries(r.eslint)].map(([id, x]) => row(id, x)));
  for (const [n, s] of Object.entries(r.heldOut.tsx)) for (const [id, x] of Object.entries(s.setups)) console.log(n, id, x.flags, JSON.stringify(x.verdicts), 'ref', x.referenceCaught, '/', s.referenceRawStyleValues);
  for (const [n, s] of Object.entries(r.heldOut.css)) for (const [id, x] of Object.entries(s.setups)) console.log(n, id, x.flags, JSON.stringify(x.categories));
  console.log(JSON.stringify(r.tailwind.generated));
}
