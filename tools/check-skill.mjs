#!/usr/bin/env node
// Repository checks for the skill: frontmatter, cross-references, section anchors, script syntax.
// Usage: node tools/check-skill.mjs   (exit code 1 on any problem)
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const skill = path.join(root, 'skills/website-redesign');
const problems = [];
const walk = (d) => readdirSync(d).flatMap((f) => { const p = path.join(d, f); return f === 'node_modules' ? [] : statSync(p).isDirectory() ? walk(p) : [p]; });
const rel = (p) => path.relative(root, p);

// 1. Frontmatter: name and description present, description ≤ 1024 chars, parseable as a YAML plain scalar.
const skillMd = readFileSync(path.join(skill, 'SKILL.md'), 'utf8');
const fm = /^---\n([\s\S]*?)\n---/.exec(skillMd);
if (!fm) problems.push('SKILL.md: no frontmatter');
else {
  const fields = Object.fromEntries(fm[1].split('\n').filter((l) => /^\w[\w-]*:/.test(l)).map((l) => [l.slice(0, l.indexOf(':')), l.slice(l.indexOf(':') + 1).trim()]));
  if (!/^[a-z0-9-]{1,64}$/.test(fields.name || '')) problems.push(`SKILL.md: name "${fields.name}" must be lowercase letters, digits and hyphens, ≤ 64 chars`);
  const d = fields.description || '';
  if (!d) problems.push('SKILL.md: description missing');
  if (d.length > 1024) problems.push(`SKILL.md: description is ${d.length} chars (max 1024)`);
  const quoted = /^(['"]).*\1$/.test(d);
  if (!quoted && /: |\s#/.test(d)) problems.push('SKILL.md: unquoted description contains ": " or " #" — invalid YAML plain scalar (use a dash, or quote the value)');
  if (!quoted && /^[\[{&*!|>'"%@`]/.test(d)) problems.push('SKILL.md: unquoted description starts with a YAML indicator character');
}

// 2. Every referenced file exists; every "file.md` §N" points at a real "## N." heading.
const docs = walk(skill).filter((f) => f.endsWith('.md'));
// resolve names against the knowledge base only, so a script's output folder (e.g. scripts/audit/audit.md) cannot shadow a reference
const byName = new Map(docs.filter((f) => /[\\/](references|templates)[\\/]/.test(f) || path.basename(f) === 'SKILL.md').map((f) => [path.basename(f), f]));
for (const f of docs) {
  const text = readFileSync(f, 'utf8');
  for (const m of text.matchAll(/(?:references|templates|scripts)\/[\w./-]+\.(?:md|mjs|json)/g)) {
    if (!existsSync(path.join(skill, m[0]))) problems.push(`${rel(f)}: missing file ${m[0]}`);
  }
  for (const m of text.matchAll(/`([\w-]+\.md)` §(\d+[a-z]?)/g)) {
    const target = byName.get(m[1]);
    if (!target) { problems.push(`${rel(f)}: ${m[1]} not found`); continue; }
    const re = new RegExp(`^##+ ${m[2]}[.\\s]`, 'm');
    if (!re.test(readFileSync(target, 'utf8'))) problems.push(`${rel(f)}: ${m[1]} §${m[2]} has no matching heading`);
  }
}

// 3. Scripts parse.
for (const f of walk(path.join(skill, 'scripts')).filter((f) => f.endsWith('.mjs'))) {
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); } catch (e) { problems.push(`${rel(f)}: ${String(e.stderr).split('\n').find((l) => l.trim()) || 'syntax error'}`); }
}

// 4. JSON metadata parses and versions agree.
const pj = JSON.parse(readFileSync(path.join(root, '.claude-plugin/plugin.json'), 'utf8'));
const mj = JSON.parse(readFileSync(path.join(root, '.claude-plugin/marketplace.json'), 'utf8'));
if (mj.plugins?.[0]?.version !== pj.version) problems.push(`version mismatch: plugin.json ${pj.version}, marketplace.json ${mj.plugins?.[0]?.version}`);

if (problems.length) { console.error(problems.map((p) => `✗ ${p}`).join('\n')); process.exit(1); }
console.log(`✓ skill checks passed (${docs.length} documents, frontmatter, cross-references, scripts, metadata)`);
