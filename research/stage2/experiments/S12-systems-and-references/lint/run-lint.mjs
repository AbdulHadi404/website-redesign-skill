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
const STYLE_SETUPS = {
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
const tsxBase = { files: ['**/*.tsx'], languageOptions: { parser: tsParser, parserOptions: { ecmaFeatures: { jsx: true } } } };
const RESTRICT_ARBITRARY = [{ pattern: '^(?:[a-z-]+:)*(p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|rounded(?:-[a-z]+)?|text|bg|border|shadow|fill|stroke|ring|outline|from|to|via)-\\[.+\\]$', message: 'Arbitrary value for a token-owned property: $0' }];
const ES_SETUPS = {
  'js-E1-core-no-restricted-syntax': { note: 'ESLint core rule with AST selectors, zero dependencies', config: [{ ...tsxBase, rules: { 'no-restricted-syntax': ['error', ...CORE_SELECTORS] } }] },
  'js-E2-atlaskit-ensure-design-token-usage': { note: '@atlaskit/eslint-plugin-design-system ensure-design-token-usage (domains color + spacing)', config: [{ ...tsxBase, plugins: { '@atlaskit/design-system': atlaskit }, rules: { '@atlaskit/design-system/ensure-design-token-usage': ['error', { domains: ['color', 'spacing'], applyImport: false }] } }] },
  'js-E3-better-tailwindcss-locked': { note: 'eslint-plugin-better-tailwindcss: no-unknown-classes against the locked @theme + no-restricted-classes for arbitrary token-owned values', config: [{ ...tsxBase, plugins: { 'better-tailwindcss': betterTw }, settings: { 'better-tailwindcss': { entryPoint: LOCKED } }, rules: { 'better-tailwindcss/no-unknown-classes': 'error', 'better-tailwindcss/no-restricted-classes': ['error', { restrict: RESTRICT_ARBITRARY }] } }] },
  'js-E4-tailwindcss-plugin-locked': { note: 'eslint-plugin-tailwindcss v4: no-arbitrary-value + no-custom-classname against the locked @theme', config: [{ ...tsxBase, plugins: { tailwindcss: twPlugin }, settings: { tailwindcss: { cssConfigPath: LOCKED } }, rules: { 'tailwindcss/no-arbitrary-value': 'error', 'tailwindcss/no-custom-classname': 'error' } }] },
  'js-E1s-core-scoped-hex': { note: 'E1 with hex strings reported only in colour positions (property value, colour attribute, colour-named variable)', config: [{ ...tsxBase, rules: { 'no-restricted-syntax': ['error', ...SCOPED_SELECTORS] } }] },
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
export async function runHeldOut() {
  const vend = path.join(here, '..', 'vendor');
  const tsxFiles = [...(await walk(path.join(vend, 'shadcn', 'apps/v4/registry/new-york-v4/ui'), '.tsx')), ...(await walk(path.join(vend, 'shadcn', 'apps/v4/registry/new-york-v4/blocks'), '.tsx'))];
  const cssFiles = await walk(path.join(vend, 'radix-themes', 'packages/radix-ui-themes/src/components'), '.css');
  const res = { tsxFiles: tsxFiles.length, cssFiles: cssFiles.length, eslint: {}, stylelint: {} };
  const setups = {
    'js-E1-core-no-restricted-syntax': [{ ...tsxBase, rules: { 'no-restricted-syntax': ['error', ...CORE_SELECTORS] } }],
    'js-E1s-core-scoped-hex': [{ ...tsxBase, rules: { 'no-restricted-syntax': ['error', ...SCOPED_SELECTORS] } }],
    'js-E3r-better-tailwindcss-restricted-only': [{ ...tsxBase, plugins: { 'better-tailwindcss': betterTw }, rules: { 'better-tailwindcss/no-restricted-classes': ['error', { restrict: RESTRICT_ARBITRARY }] } }],
  };
  for (const [id, config] of Object.entries(setups)) {
    const eslint = new ESLint({ cwd: vend, overrideConfigFile: true, overrideConfig: config });
    const results = await eslint.lintFiles(tsxFiles);
    const flags = [];
    for (const r of results) {
      const lines = (await readFile(r.filePath, 'utf8')).split('\n');
      for (const m of r.messages.filter((x) => x.ruleId)) flags.push({ file: path.relative(vend, r.filePath), line: m.line, rule: m.message.slice(0, 120), text: lines[m.line - 1].trim().slice(0, 140) });
    }
    res.eslint[id] = { flags: flags.length, filesFlagged: new Set(flags.map((f) => f.file)).size, sample: flags };
  }
  for (const id of ['css-A-builtins', 'css-D-builtins-bare-lengths', 'css-B1-strict-value-defaults', 'css-B2-strict-value-no-functions']) {
    const r = await stylelint.lint({ files: cssFiles, config: STYLE_SETUPS[id].config, configBasedir: path.join(here, '..') });
    const flags = [];
    for (const f of r.results) {
      const lines = (await readFile(f.source, 'utf8')).split('\n');
      for (const w of f.warnings) flags.push({ file: path.relative(vend, f.source), line: w.line, rule: w.rule, text: lines[w.line - 1].trim().slice(0, 140) });
    }
    const byRule = {}; for (const x of flags) byRule[x.rule] = (byRule[x.rule] ?? 0) + 1;
    res.stylelint[id] = { flags: flags.length, byRule, sample: flags };
  }
  // Categories fixed before counting: config-exemptable (a zero with a unit, a value derived from a
  // var(), a keyword such as inherit/Canvas/currentColor, an em-relative optical nudge) vs a raw literal.
  const catCss = (t) => {
    const v = t.replace(/^[^:]+:\s*/, '').replace(/;.*$/, '');
    if (/^-?0(\.0+)?[a-z%]*$/.test(v)) return 'zero-with-unit';
    if (/var\(/.test(v)) return 'derived-from-var';
    if (/^[a-z]+$/i.test(v) && /^(inherit|currentcolor|transparent|canvas|canvastext)$/i.test(v)) return 'keyword';
    if (!/px|rem|#|rgb|hsl/.test(v) && /em\b/.test(v)) return 'em-relative';
    return 'raw-literal';
  };
  for (const v of Object.values(res.stylelint)) { v.categories = {}; for (const f of v.sample) { f.category = catCss(f.text); v.categories[f.category] = (v.categories[f.category] ?? 0) + 1; } }
  const catTw = (m) => {
    const cls = (/: (\S+)$/.exec(m) ?? [])[1] ?? '';
    const val = (/\[(.+)\]$/.exec(cls) ?? [])[1] ?? '';
    if (/var\(|--/.test(val)) return 'derived-from-var';
    if (/^(inherit|Canvas|CanvasText|currentColor|transparent)$/.test(val)) return 'keyword';
    if (/^-?0[a-z%]*$/.test(val)) return 'zero-with-unit';
    return 'raw-literal';
  };
  const tw = res.eslint['js-E3r-better-tailwindcss-restricted-only'];
  tw.categories = {}; for (const f of tw.sample) { f.category = catTw(f.rule); tw.categories[f.category] = (tw.categories[f.category] ?? 0) + 1; }
  let loc = 0; for (const f of tsxFiles) loc += (await readFile(f, 'utf8')).split('\n').length; res.tsxLines = loc;
  let cloc = 0; for (const f of cssFiles) cloc += (await readFile(f, 'utf8')).split('\n').length; res.cssLines = cloc;
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
  const row = (id, x) => ({ setup: id, V: x.violations, caught: x.caught, missed: x.missed, OK: x.ok, falsePos: x.falsePositives, recall: x.recall, precision: x.precision, err: x.error ? x.error.slice(0, 60) : (x.fatal?.length ? x.fatal[0].slice(0, 60) : '') });
  console.table([...Object.entries(r.stylelint), ...Object.entries(r.eslint)].map(([id, x]) => row(id, x)));
  console.log(JSON.stringify(r.tailwind.generated));
}
