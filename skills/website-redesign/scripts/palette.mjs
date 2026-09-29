#!/usr/bin/env node
/**
 * Sample a logo's colours, and build role-based OKLCH scales from a brand colour.
 *
 *   node palette.mjs --from public/logo.svg          # colours in the mark, by use
 *   node palette.mjs --from logo.png                 # dominant colours in a raster
 *   node palette.mjs --brand '#1A3CF2' [--name blue] [--dark] [--css out.css]
 *   node palette.mjs --tenant '#FF7A00' [--dark ['#RRGGBB']] [--label 14/600] [--json]
 *   node palette.mjs --tenant-set tenants.txt [--dark] [--label 14/600] [--json]
 *
 * --brand builds a 12-step scale on the Radix role model (design-theory.md B5):
 *   1–2 backgrounds · 3–5 component fills (rest/hover/pressed) · 6–8 borders
 *   (subtle/interactive/strong) · 9 solid (= the brand colour itself) · 10 solid
 *   hover · 11 low-contrast text · 12 high-contrast text
 * Hue is held at the brand hue; lightness is stepped; chroma rises toward the
 * middle and falls at the ends; out-of-gamut steps are clamped by chroma, never
 * by lightness. Steps 11 and 12 are *solved*, not guessed: the darkest
 * lightness that reaches APCA Lc 60 and WCAG 4.5:1 (step 11, against steps 2
 * and 3, so it holds on a soft badge or a selected row) / Lc 90 and 7:1
 * (step 12, against step 2) — the Radix targets plus the conformance floor.
 * The label on step 9 is the one of white or #111 that passes WCAG 4.5:1; APCA
 * only breaks a tie. When neither passes, the script says so and names the
 * nearest step that carries a small-text label. Step 10 moves away from that
 * label when its usual direction would take the label below 4.5:1. A tinted
 * neutral scale on the same hue comes with it. The output is a starting point
 * to judge on real surfaces — never judge a colour from a swatch (Albers).
 *
 * --tenant treats the colour as untrusted input from a white-label customer
 * (design-systems.md, tenant themes): only an opaque #RRGGBB is accepted.
 * Roles: brand = the exact colour on large fills, with its label solved by the
 * rule above (moved in lightness only when it vanishes into the page, or when
 * no label passes); accent-strong = the tenant hue with its OKLCH lightness
 * solved for WCAG 4.5:1 on every ground *and* APCA Lc 75 where reachable, for
 * links, selected text and checked indicators. It goes lighter or darker by
 * which end (white or black) reaches the higher ratio on the grounds, not by
 * whether the page is dark (a #6E6E6E page takes light text: white 5.10:1,
 * black 4.12:1); accent-subtle sits at the other end. Every text pair is
 * gated at WCAG 4.5:1 and every non-text pair at 3:1; APCA below the size-aware level
 * of design-theory.md B6 for --label px/weight (default 14/600: Lc 75; Lc 60
 * at ≥ 24px or ≥ 16px/700) is a warning with the nearest fills that read well
 * (the admin options), never a gate. --dark adds dark mode (--dark '#RRGGBB'
 * is a dark-mode override colour). The grounds are the page and its surfaces:
 * --ground '#FFFFFF' '#F6F6F7' (light) and --dark-ground '#111113' '#1C1D21'
 * by default. Exits 1 on a WCAG failure or a refused colour.
 * --tenant-set reads one tenant per line: `#RRGGBB [#RRGGBB dark override]
 * [name]`; blank lines and // comments are skipped. Exits 1 if any tenant
 * fails WCAG or is refused; APCA warnings are printed, never fatal.
 *
 * Needs colorjs.io (MIT); raster sampling needs pngjs. `npm install` here.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { parseArgs, asList, importModule } from './lib/env.mjs';

const a = parseArgs();
let Color = await importModule('colorjs.io');
if (Color && typeof Color !== 'function') Color = Color.default ?? null;
if (!Color) { console.error('colorjs.io not found — run `npm install` in the scripts folder.'); process.exit(1); }

const toHex = (c) => c.to('srgb').toGamut({ space: 'srgb' }).toString({ format: 'hex', collapse: false });
const oklch = (c) => { const [l, ch, h] = c.to('oklch').coords; return `oklch(${(l * 100).toFixed(1)}% ${(ch ?? 0).toFixed(3)} ${(h ?? 0).toFixed(1)})`; };
const wcag = (x, y) => x.contrast(y, 'WCAG21');
const apca = (bg, fg) => bg.contrast(fg, 'APCA'); // background first — see contrast.mjs
// A solved step ships twice, as the hex in the comment and as the rounded oklch() value; measure the worse of the
// two so a step solved to 4.5:1 does not land at 4.49:1 once written out.
const shipped = (c) => [new Color(toHex(c)), new Color(oklch(c))];
const wcagShip = (x, y) => { const [xs, ys] = [shipped(x), shipped(y)]; return Math.min(wcag(xs[0], ys[0]), wcag(xs[1], ys[1])); };
const apcaShip = (bg, fg) => { const [bs, fs] = [shipped(bg), shipped(fg)]; return Math.min(Math.abs(apca(bs[0], fs[0])), Math.abs(apca(bs[1], fs[1]))); };

// ---------------------------------------------------------------- tenant colours
// Ported from s12(), parseTenantHex() and labelOptions() in research/stage2/experiments/S12-systems-and-references/
// tenant/methods.mjs (second round, after review). WCAG is the gate; APCA is a size-aware warning; the tenant's
// fill is never moved for APCA. Colours travel as #RRGGBB strings, so every pair is measured as it ships.
const TG = { text: 4.5, nonText: 3, lcText: 75, nearGroundRatio: 1.5, nearGroundChroma: 0.1 };
const GROUNDS = { light: ['#FFFFFF', '#F6F6F7'], dark: ['#111113', '#1C1D21'] };
// Locked status colours; only their hue is used (a tenant hue within 30° of one needs icon + word on that state).
const STATUS = { light: { danger: '#C9372C', warning: '#A15C00', success: '#1F7A4D' }, dark: { danger: '#F87168', warning: '#F5A524', success: '#4CC38A' } };
const WHITE = '#FFFFFF';
const C = (x) => (x instanceof Color ? x : new Color(x));
const HEX = (x) => toHex(C(x)).toUpperCase();
const wc = (x, y) => wcag(C(x), C(y));
const lcOf = (bg, fg) => Math.abs(apca(C(bg), C(fg)));
const okl = (x) => { const [l, c, h] = C(x).to('oklch').coords; return { l, c: c ?? 0, h: Number.isFinite(h) ? h : null }; };
// sRGB from OKLCH, reducing chroma (never lightness or hue) to fit the gamut.
const fromOklch = (l, c, h) => HEX(new Color('oklch', [Math.min(1, Math.max(0, l)), Math.max(0, c), h ?? 0]).toGamut({ space: 'srgb', method: 'oklch.c' }));
// sRGB at exactly this OKLCH lightness and hue, with the most chroma up to c that fits. toGamut's CSS Color 4
// mapping clips once it is within a JND, which near L 0 or 1 lands visibly off the asked lightness.
function atLightness(l, c, h) {
  const at = (x) => new Color('oklch', [Math.min(1, Math.max(0, l)), x, h ?? 0]);
  if (at(c).inGamut('srgb')) return HEX(at(c));
  let lo = 0, hi = c;
  for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (at(m).inGamut('srgb')) lo = m; else hi = m; }
  return HEX(at(lo));
}
const r2 = (x) => Math.round(x * 100) / 100;
const dE100 = (x, y) => Math.round(C(x).deltaE(C(y), 'OK') * 1000) / 10;

// A tenant colour is untrusted input: only an opaque 6-digit hex (Atlassian's isValidBrandHex rule). Alpha,
// keywords, short hex and other syntaxes are refused, never measured — contrast() ignores alpha, so #0000FF80
// measured as opaque blue (8.59:1 with white) paints #7F7FFF on white (3.29:1).
function parseTenantHex(input, what = 'tenant colour') {
  const v = typeof input === 'string' ? input.trim() : '';
  if (!/^#[0-9a-fA-F]{6}$/.test(v)) throw new TypeError(`${what} must be an opaque 6-digit hex (#RRGGBB), got ${JSON.stringify(typeof input === 'string' ? input : '')}`);
  return v.toUpperCase();
}
// A ground is the site's own token: any CSS colour, but opaque (a translucent one would be measured as opaque).
function parseGround(v, flag) {
  let c;
  try { c = new Color(String(v)); } catch { throw new TypeError(`${flag}: not a colour: ${JSON.stringify(v)}`); }
  const alpha = Number(c.alpha);
  if (Number.isFinite(alpha) && alpha < 1) throw new TypeError(`${flag}: ${v} is translucent — give the opaque colour it paints on the page`);
  return HEX(c);
}
// design-theory.md B6: Lc 75 for body-size labels (14px/600 buttons included); Lc 60 only at ≥ 24px/400 or ≥ 16px/700.
const apcaLevelFor = ({ px, weight }) => (px >= 24 || (px >= 16 && weight >= 700) ? 60 : 75);
function parseLabelSize(v) {
  if (v === undefined) return { px: 14, weight: 600 };
  const m = /^(\d+(?:\.\d+)?)(?:px)?\/(\d{3,4})$/.exec(typeof v === 'string' ? v.trim() : '');
  if (!m || +m[2] < 100 || +m[2] > 1000) throw new TypeError(`--label takes the label's px/weight, e.g. 14/600 (got ${JSON.stringify(v === true ? '' : v)})`);
  return { px: +m[1], weight: +m[2] };
}
function statusCollisions(colours, status) {
  const out = [];
  for (const [k, v] of Object.entries(status)) {
    const s = okl(v);
    if (colours.some((c) => { const x = okl(c); return x.c >= 0.06 && x.h !== null && Math.abs(((x.h - s.h + 540) % 360) - 180) <= 30; })) out.push(k);
  }
  return out;
}
function inkFor(T) {
  const achromatic = T.c < 0.02;
  const H = achromatic ? 265 : T.h; // a cool neutral hue for greys, black and white — never an invented brand hue
  const Cc = achromatic ? Math.min(T.c, 0.012) : T.c;
  return { achromatic, H, Cc, ink: fromOklch(0.2, Math.min(0.03, Cc * 0.3), H) };
}
// The label for a fill: the one of white or the tinted ink that passes WCAG; APCA only breaks a tie (both pass);
// if neither passes, the better ratio (the caller then moves the fill).
function tenantLabel(fill, ink) {
  const c = [WHITE, ink].map((on) => ({ on, w: wc(fill, on), lc: lcOf(fill, on) }));
  const pass = c.filter((x) => x.w >= TG.text);
  return pass.length ? pass.sort((x, y) => y.lc - x.lc)[0] : c.sort((x, y) => y.w - x.w)[0];
}

// Which way from a ground text and fills can move: toward white (+1) or toward black (-1), whichever end of the
// lightness range reaches the higher worst-case WCAG ratio on the grounds. Not OKLCH L 0.5: WCAG's crossover
// is at luminance 0.18 (about OKLCH L 0.56 for a grey), so on a page such as #6E6E6E (L 0.54) only lighter
// text reaches 4.5:1 (white 5.10:1, black 4.12:1). On a single ground one end always reaches √21 ≈ 4.58:1.
const BLACK = '#000000';
const lighterSide = (grounds) => (Math.min(...grounds.map((g) => wc(WHITE, g))) >= Math.min(...grounds.map((g) => wc(BLACK, g))) ? 1 : -1);

function tenantRoles(t, { grounds, status, labelSize }) {
  const page = grounds[0];
  const T = okl(t);
  const { achromatic, H, Cc, ink } = inkFor(T);
  const flags = [], warnings = [];
  const solidOk = (fill) => tenantLabel(fill, ink).w >= TG.text;
  // 1. brand: the tenant's colour, unless it vanishes into the page (low contrast AND too little chroma to stand
  // out by hue) or no label passes WCAG on it; then only its OKLCH lightness moves, as little as the gate needs.
  let brand = t;
  const nearGround = wc(t, page) < TG.nearGroundRatio && T.c < TG.nearGroundChroma;
  if (nearGround || !solidOk(brand)) {
    flags.push(nearGround ? 'tenant colour ≈ page ground: fill moved' : 'no label passes WCAG on the tenant colour: fill lightness moved');
    let found = null;
    for (let d = 0.005; d <= 1 && !found; d += 0.005) {
      for (const sgn of nearGround ? [lighterSide([page])] : [-1, 1]) {
        const L = T.l + sgn * d;
        if (L < 0 || L > 1) continue;
        const c = fromOklch(L, Cc, H);
        if (solidOk(c) && (!nearGround || wc(c, page) >= TG.nonText)) { found = c; break; }
      }
    }
    brand = found ?? brand;
  }
  const on = tenantLabel(brand, ink).on;
  // 2. hover: 0.05 OKLCH L away from the label, as long as the label still passes.
  const A = okl(brand);
  const hoverDir = on === WHITE ? -1 : 1;
  let brandHover = brand;
  for (const d of [0.05, 0.04, 0.03, 0.02]) {
    const c = fromOklch(A.l + hoverDir * d, A.c, A.h ?? H);
    if (wc(c, on) >= TG.text) { brandHover = c; break; }
  }
  if (brandHover === brand) flags.push('hover cannot move further from the label (the fill is at the end of the lightness range): give hover another cue');
  // 3. subtle ground (selected row, soft badge), then 4. accent-strong solved on every ground and the subtle one:
  // WCAG 4.5:1 and APCA Lc 75 where reachable (it is not the brand fill, so this costs no brand fidelity).
  // Accent text goes to the side of the grounds that reaches the higher ratio, and the subtle ground to the
  // other end (a pale tint under dark text, a deep shade under light text). If only the other side reaches
  // Lc 75 as well (a page near mid-grey: white text Lc 77 on #767676, black Lc 33), that side is used.
  const subtleFor = (sgn) => (sgn > 0 ? fromOklch(0.29, Math.min(Cc, 0.12) * 0.5, H) : fromOklch(0.965, Math.min(Cc, 0.12) * 0.3, H));
  const solveText = (sgn, lcMin) => {
    const textGrounds = [...grounds, subtleFor(sgn)];
    const ok = (c) => textGrounds.every((g) => wc(c, g) >= TG.text && lcOf(g, c) >= lcMin);
    const walk = (at) => {
      for (let d = 0.005; ; d += 0.005) {
        const L = Math.min(1, Math.max(0, T.l + sgn * d));
        const c = at(L);
        if (ok(c)) return c;
        if (L === 0 || L === 1) return null;
      }
    };
    // Then at the asked lightness exactly, whose last step is white or black itself: toGamut's clipping near
    // the ends lands off it (yellow at L 1 gives #FFFF84, 4.43:1 on #747474, where white gives 4.67:1).
    return ok(t) ? t : walk((L) => fromOklch(L, Cc, H)) ?? walk((L) => atLightness(L, Cc, H));
  };
  const side = lighterSide(grounds);
  let accentStrong = null, textSide = side;
  search: for (const lcMin of [TG.lcText, 0]) for (const sgn of [side, -side]) {
    const c = solveText(sgn, lcMin);
    if (c) { accentStrong = c; textSide = sgn; break search; }
  }
  const accentSubtle = subtleFor(textSide);
  const textGrounds = [...grounds, accentSubtle];
  if (!accentStrong) {
    accentStrong = t;
    // On a single ground one end always reaches 4.5:1, so this takes grounds on both sides of mid-grey.
    const worst = (x) => grounds.map((g) => ({ g, w: wc(x, g) })).sort((p, q) => p.w - q.w)[0];
    const [w, b] = [worst(WHITE), worst(BLACK)];
    flags.push(`no lightness of the tenant hue reaches 4.5:1 on every ground — white text reaches only ${w.w.toFixed(2)}:1 on ${w.g}, black only ${b.w.toFixed(2)}:1 on ${b.g}: grounds on both sides of mid-grey (such as a light page and a dark band) need an accent each`);
  }
  const weak = textGrounds.filter((g) => lcOf(g, accentStrong) < TG.lcText);
  if (weak.length) warnings.push(`accent-strong reads below APCA Lc ${TG.lcText} on ${weak.join(', ')} (Lc ${Math.round(Math.min(...weak.map((g) => lcOf(g, accentStrong))))})`);
  // 5. a brand fill under 3:1 on a ground gets a 1 px accent-strong border.
  const brandBorder = grounds.some((g) => wc(brand, g) < TG.nonText) ? accentStrong : null;
  // 6. APCA as a size-aware warning on the label, at rest and on hover — never a gate.
  const level = apcaLevelFor(labelSize);
  const labelLc = Math.min(lcOf(brand, on), lcOf(brandHover, on));
  if (labelLc < level) warnings.push(`label reads weak: APCA Lc ${Math.round(labelLc)} < ${level} for ${labelSize.px}px/${labelSize.weight}`);
  if (achromatic) flags.push('achromatic brand: selection needs a non-colour cue (weight, check, bar)');
  for (const k of statusCollisions([brand, accentStrong], status)) flags.push(`accent hue ≈ ${k}: ${k} states must carry icon + word, never colour alone`);
  return { roles: { brand, brandHover, onBrand: on, accentStrong, accentSubtle, brandBorder }, flags, warnings, level };
}

// Every pair the roles are used in, measured again from the shipped hex values: the gate.
function tenantPairs(r, grounds) {
  const where = (i) => (i ? `surface ${grounds[i]}` : `page ${grounds[0]}`);
  return [
    { kind: 'text', what: 'label on brand', fg: r.onBrand, bg: r.brand },
    { kind: 'text', what: 'label on brand-hover', fg: r.onBrand, bg: r.brandHover },
    ...grounds.map((g, i) => ({ kind: 'text', what: `accent-strong text on ${where(i)}`, fg: r.accentStrong, bg: g })),
    { kind: 'text', what: 'accent-strong text on accent-subtle', fg: r.accentStrong, bg: r.accentSubtle },
    ...grounds.map((g, i) => ({ kind: 'non-text', what: `indicator / focus ring on ${where(i)}`, fg: r.accentStrong, bg: g })),
    ...(r.brandBorder ? grounds.map((g, i) => ({ kind: 'non-text', what: `brand-border on ${where(i)}`, fg: r.brandBorder, bg: g })) : []),
  ].map((p) => { const w = wc(p.fg, p.bg); return { ...p, wcag: r2(w), lc: Math.round(lcOf(p.bg, p.fg)), pass: w >= (p.kind === 'text' ? TG.text : TG.nonText) }; });
}

// For the admin preview: for each label (white or ink), the nearest fill that passes WCAG and the nearest that
// also reads at the size-aware APCA level — the tenant chooses between legible versions of their colour.
function labelOptions(t, grounds, level) {
  const page = grounds[0];
  const T = okl(t);
  const { H, Cc, ink } = inkFor(T);
  const nearest = (on, lcMin) => {
    for (let d = 0; d <= 1; d += 0.005) for (const sgn of d ? [-1, 1] : [0]) {
      const L = T.l + sgn * d;
      if (L < 0 || L > 1) continue;
      const c = d ? fromOklch(L, Cc, H) : t;
      if (wc(c, on) >= TG.text && lcOf(c, on) >= lcMin && !(wc(c, page) < TG.nearGroundRatio && okl(c).c < TG.nearGroundChroma))
        return { fill: c, label: on, dE: dE100(t, c), wcag: r2(wc(c, on)), lc: Math.round(lcOf(c, on)) };
    }
    return null;
  };
  return { apcaLevel: level, whiteLabel: nearest(WHITE, 0), whiteLabelReadsWell: nearest(WHITE, level), darkLabel: nearest(ink, 0), darkLabelReadsWell: nearest(ink, level) };
}

function tenantMode(colour, mode, ctx) {
  const grounds = ctx.grounds[mode];
  const { roles, flags, warnings, level } = tenantRoles(colour, { grounds, status: STATUS[mode], labelSize: ctx.labelSize });
  const pairs = tenantPairs(roles, grounds);
  return { mode, colour, grounds, roles, moved: roles.brand !== colour, dE: dE100(colour, roles.brand), pairs, pass: pairs.every((p) => p.pass), flags, warnings, options: labelOptions(colour, grounds, level) };
}

function evaluateTenant(entry, ctx) {
  let t, dark = null;
  try {
    t = parseTenantHex(entry.input);
    if (entry.dark) dark = parseTenantHex(entry.dark, 'dark-mode override');
  } catch (e) { return { ...entry, refused: e.message, pass: false }; }
  const modes = ['light', ...(ctx.dark || dark ? ['dark'] : [])];
  const results = modes.map((m) => tenantMode(m === 'dark' && dark ? dark : t, m, ctx));
  return { ...entry, tenant: t, darkOverride: dark, modes: results, pass: results.every((r) => r.pass) };
}

const fmtOpt = (o) => `${o.fill}${o.dE ? ` (ΔE ${o.dE}` : ' (exact'}, ${o.wcag.toFixed(2)}:1, Lc ${o.lc})`;
// The nearest fills that read well, closest first: the choice offered with an APCA warning.
const readsWell = (o) => [o.whiteLabelReadsWell, o.darkLabelReadsWell].filter(Boolean).sort((x, y) => x.dE - y.dE)
  .map((x) => `${x.fill} with ${x.label} (${x.dE ? `ΔE ${x.dE}` : 'exact'})`).join(' or ') || 'none within the tenant hue';

function printTenantFull(r, ctx) {
  for (const m of r.modes) {
    const [page, ...surfaces] = m.grounds;
    console.log(`Tenant ${m.colour}${m.mode === 'dark' && r.darkOverride ? ' (dark override)' : ''} — ${m.mode}: page ${page}${surfaces.length ? `, surface ${surfaces.join(', ')}` : ''} · labels ${ctx.labelSize.px}px/${ctx.labelSize.weight} (APCA level Lc ${m.options.apcaLevel})\n`);
    const R = m.roles;
    const rows = [
      ['brand', R.brand, `large fills: the primary button, a selected chip — ${m.moved ? `moved from ${m.colour} (ΔE ${m.dE})` : "the tenant's exact colour"}`],
      ['brand-hover', R.brandHover, 'hovered and pressed brand fill'],
      ['on-brand', R.onBrand, 'label on brand and brand-hover'],
      ['accent-strong', R.accentStrong, 'links, accent and selected text, checked indicators'],
      ['accent-subtle', R.accentSubtle, 'selected row, soft badge (its text: accent-strong)'],
      ['brand-border', R.brandBorder ?? 'none', R.brandBorder ? 'a 1px border on the brand fill: the fill is under 3:1 on a ground' : 'the brand fill has 3:1 on every ground'],
    ];
    console.log('  role           hex      use');
    for (const [k, v, u] of rows) console.log(`  ${k.padEnd(13)}  ${v.padEnd(7)}  ${u}`);
    console.log(`\n  WCAG is the gate (text ≥ 4.5:1, non-text ≥ 3:1); APCA Lc is shown, never a gate`);
    for (const p of m.pairs) console.log(`  ${p.pass ? '✓' : '✗'} ${p.what.padEnd(44)} ${p.fg} on ${p.bg}  ${p.wcag.toFixed(2).padStart(5)}:1  Lc ${String(p.lc).padStart(3)}`);
    if (m.flags.length) console.log();
    for (const f of m.flags) console.log(`  · ${f}`);
    if (m.warnings.length) console.log();
    for (const w of m.warnings) console.log(`  ! ${w}${/^label reads weak/.test(w) ? ` — reads well: ${readsWell(m.options)}` : ''}`);
    const o = m.options;
    console.log(`\n  admin options (the tenant chooses; the default is the exact colour):`);
    console.log(`    white label  passes on ${o.whiteLabel ? fmtOpt(o.whiteLabel) : 'none'} · reads well on ${o.whiteLabelReadsWell ? fmtOpt(o.whiteLabelReadsWell) : 'none'}`);
    console.log(`    dark label   passes on ${o.darkLabel ? fmtOpt(o.darkLabel) : 'none'} · reads well on ${o.darkLabelReadsWell ? fmtOpt(o.darkLabelReadsWell) : 'none'}${o.darkLabel ? ` (label ${o.darkLabel.label})` : ''}`);
    console.log();
  }
}

function printTenantLine(r) {
  const where = r.line ? `line ${r.line}: ` : '';
  if (r.refused) { console.log(`✗ ${where}${JSON.stringify(r.text ?? r.input)} refused — ${r.refused}`); return; }
  for (const m of r.modes) {
    const R = m.roles;
    const label = m.pairs[0];
    console.log(`${m.pass ? '✓' : '✗'} ${m.colour} ${m.mode.padEnd(5)}${r.name ? ` ${r.name}` : ''} — brand ${R.brand}${m.moved ? ` (moved, ΔE ${m.dE})` : ' (exact)'}, label ${R.onBrand} ${label.wcag.toFixed(2)}:1, accent-strong ${R.accentStrong}${R.brandBorder ? ', with brand-border' : ''}`);
    for (const p of m.pairs.filter((x) => !x.pass)) console.log(`    ✗ ${p.what}: ${p.fg} on ${p.bg} ${p.wcag.toFixed(2)}:1 (needs ${p.kind === 'text' ? '4.5' : '3'}:1)`);
    for (const f of m.flags) console.log(`    · ${f}`);
    for (const w of m.warnings) console.log(`    ! ${w}${/^label reads weak/.test(w) ? ` — reads well: ${readsWell(m.options)}` : ''}`);
  }
}

async function runTenants() {
  const ctx = {};
  try {
    ctx.labelSize = parseLabelSize(a.label);
    const list = (v, def, flag) => (v === undefined ? def : asList(v).map((x) => parseGround(x, flag)));
    ctx.grounds = { light: list(a.ground, GROUNDS.light, '--ground'), dark: list(a['dark-ground'], GROUNDS.dark, '--dark-ground') };
    if (!ctx.grounds.light.length || !ctx.grounds.dark.length) throw new TypeError('--ground / --dark-ground take the page colour, then any surfaces');
  } catch (e) { console.error(e.message); return 1; }
  ctx.dark = a.dark !== undefined;
  let entries;
  if (a['tenant-set'] !== undefined) {
    if (typeof a['tenant-set'] !== 'string') { console.error('--tenant-set takes one file: one tenant per line, `#RRGGBB [#RRGGBB dark override] [name]`'); return 1; }
    if (typeof a.dark === 'string') { console.error('with --tenant-set, a dark override goes on the tenant\'s own line: `#RRGGBB #RRGGBB name`'); return 1; }
    let text;
    try { text = await readFile(a['tenant-set'], 'utf8'); } catch (e) { console.error(`cannot read ${a['tenant-set']}: ${e.code || e.message}`); return 1; }
    entries = [];
    for (const [i, raw] of text.replace(/^﻿/, '').split(/\r?\n/).entries()) {
      const line = raw.replace(/(^|\s)\/\/.*$/, '').trim();
      if (!line) continue;
      // A token is a run of non-space characters, or a function such as rgba(…) whole, so a refusal names it.
      const tokens = line.match(/[^\s(]*\([^)]*\)\S*|\S+/g);
      const [input, ...rest] = tokens;
      const dark = rest[0]?.startsWith('#') ? rest.shift() : null;
      entries.push({ line: i + 1, text: line, input, dark, name: rest.join(' ') || null });
    }
    if (!entries.length) { console.error(`no tenant colours in ${a['tenant-set']}`); return 1; }
  } else {
    if (typeof a.tenant !== 'string') { console.error('--tenant takes one colour, #RRGGBB (use --tenant-set for a file of them)'); return 1; }
    if (Array.isArray(a.dark)) { console.error('--dark takes at most one override colour'); return 1; }
    entries = [{ input: a.tenant, dark: typeof a.dark === 'string' ? a.dark : null }];
  }
  const results = entries.map((e) => evaluateTenant(e, ctx));
  const modes = results.flatMap((r) => r.modes ?? []);
  const summary = { tenants: results.length, refused: results.filter((r) => r.refused).length, tenantModes: modes.length, pass: modes.filter((m) => m.pass).length, fail: modes.filter((m) => !m.pass).length, withApcaWarnings: modes.filter((m) => m.warnings.length).length };
  const ok = results.every((r) => r.pass);
  if (a.json) {
    const out = ({ line, text, input, dark, name, tenant, darkOverride, refused, pass, modes }) => (refused
      ? { line, text, input, dark, refused, pass }
      : { line, name, tenant, darkOverride, pass, modes: modes.map(({ colour, ...m }) => ({ tenant: colour, ...m })) });
    console.log(JSON.stringify(a['tenant-set'] !== undefined ? { labelSize: ctx.labelSize, summary, pass: ok, tenants: results.map(out) } : { labelSize: ctx.labelSize, ...out(results[0]) }, null, 2));
    return ok ? 0 : 1;
  }
  if (a['tenant-set'] === undefined) {
    const r = results[0];
    if (r.refused) { console.error(`✗ ${JSON.stringify(r.input)} refused — ${r.refused}`); return 1; }
    printTenantFull(r, ctx);
    const fails = r.modes.flatMap((m) => m.pairs.filter((p) => !p.pass).map((p) => `${m.mode}: ${p.what} ${p.wcag.toFixed(2)}:1`));
    const nw = r.modes.reduce((n, m) => n + m.warnings.length, 0);
    console.log(fails.length ? `✗ ${r.tenant} fails WCAG — ${fails.join('; ')}` : `✓ ${r.tenant} passes WCAG in ${r.modes.map((m) => m.mode).join(' and ')}${nw ? `; ${nw} APCA warning${nw > 1 ? 's' : ''} (never a gate)` : ''}`);
    return ok ? 0 : 1;
  }
  for (const r of results) printTenantLine(r);
  console.log(`\n${summary.tenants} tenant colour${summary.tenants > 1 ? 's' : ''}, ${summary.tenantModes} tenant-mode${summary.tenantModes === 1 ? '' : 's'}: ${summary.pass} pass WCAG, ${summary.fail} fail, ${summary.refused} refused; ${summary.withApcaWarnings} with APCA warnings (never a gate)`);
  return ok ? 0 : 1;
}

if (a.tenant !== undefined || a['tenant-set'] !== undefined) {
  if (a.brand || a.from) { console.error('--tenant and --tenant-set run on their own, without --brand or --from'); process.exit(1); }
  const code = await runTenants();
  await new Promise((r) => process.stdout.write('', r));
  process.exit(code);
}

// ---------------------------------------------------------------- sampling
if (a.from) {
  const file = String(a.from);
  const counts = new Map();
  if (/\.svg$/i.test(file)) {
    const svg = await readFile(file, 'utf8');
    const re = /(?:fill|stroke|stop-color|color)\s*[:=]\s*["']?\s*(#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|oklch\([^)]*\)|[a-z]+)\b/gi;
    for (const m of svg.matchAll(re)) {
      const v = m[1];
      if (/^(none|currentcolor|transparent|inherit|url)$/i.test(v)) continue;
      try { const hx = toHex(new Color(v)); counts.set(hx, (counts.get(hx) || 0) + 1); } catch { /* not a colour */ }
    }
    if (/currentcolor/i.test(svg)) console.log('note: the mark uses currentColor somewhere — its colour comes from the page, not the file.');
  } else {
    const PNG = await importModule('pngjs');
    const png = (PNG.PNG ?? PNG).sync.read(await readFile(file));
    const { data, width, height } = png;
    const step = Math.max(1, Math.floor(Math.sqrt((width * height) / 60000)));
    for (let y = 0; y < height; y += step) for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      if (data[i + 3] < 200) continue;
      const q = [0, 1, 2].map((k) => Math.round(data[i + k] / 12) * 12);
      const hx = '#' + q.map((v) => Math.min(255, v).toString(16).padStart(2, '0')).join('');
      counts.set(hx, (counts.get(hx) || 0) + 1);
    }
  }
  // merge perceptually close colours (ΔE OK < 0.04)
  const sorted = [...counts.entries()].sort((p, q) => q[1] - p[1]);
  const groups = [];
  for (const [hx, n] of sorted) {
    const c = new Color(hx);
    const g = groups.find((g) => g.c.deltaE(c, 'OK') < 0.04);
    if (g) g.n += n; else groups.push({ c, hx, n });
  }
  const total = groups.reduce((s, g) => s + g.n, 0);
  console.log(`Colours in ${file} (by ${/\.svg$/i.test(file) ? 'number of uses' : 'pixel area'}):\n`);
  console.log('hex       share  oklch                         role guess');
  for (const g of groups.slice(0, 10)) {
    const [l, ch] = g.c.to('oklch').coords;
    const role = (ch ?? 0) < 0.03 ? (l > 0.9 ? 'near-white / ground' : l < 0.25 ? 'near-black / ink' : 'neutral') : 'brand hue';
    console.log(`${g.hx}  ${String(Math.round((g.n / total) * 100)).padStart(4)}%  ${oklch(g.c).padEnd(28)}  ${role}`);
  }
  console.log('\nRecord these in DESIGN.md ("Logo colours sampled"), then build scales: node palette.mjs --brand <hex>');
  if (!a.brand) process.exit(0);
  console.log();
}

// ---------------------------------------------------------------- scales
if (!a.brand) { console.error('Usage: --from <logo.svg|png>  and/or  --brand <colour> [--name blue] [--dark] [--css out.css]'); process.exit(1); }
const brand = new Color(String(a.brand)).to('oklch');
const [BL, BC, BH0] = brand.coords;
const BH = BH0 ?? 0;
const name = a.name || 'brand';
const ROLES = ['app background', 'subtle background', 'component', 'component hover', 'component active', 'subtle border', 'border', 'strong border', 'solid', 'solid hover', 'text (low contrast)', 'text (high contrast)'];

function mk(l, c, h = BH) { return new Color('oklch', [l, c, h]).toGamut({ space: 'srgb', method: 'oklch.c' }); }

// The label on a solid fill: the one of white or #111 that passes WCAG 4.5:1; APCA only breaks a tie (both
// pass). Picking by APCA alone put white on #FF7A00 at 2.61:1 where #111 gives about 7:1 (S12, defect 1).
// When neither passes, the better ratio, and `pass: false` so the caller can say so.
const LABELS = [new Color('#fff'), new Color('#111')];
function labelOn(fill) {
  const c = LABELS.map((on) => ({ on, w: wcagShip(fill, on), lc: apcaShip(fill, on) }));
  const pass = c.filter((x) => x.w >= 4.5);
  const pick = pass.length ? pass.sort((x, y) => y.lc - x.lc)[0] : c.sort((x, y) => y.w - x.w)[0];
  return { ...pick, pass: pass.length > 0 };
}

function scale({ dark = false, chroma = BC, neutral = false }) {
  // Lightness for steps 1–8 (Radix-like spacing); chroma share per step.
  const Ls = dark ? [0.17, 0.2, 0.25, 0.29, 0.33, 0.38, 0.44, 0.53] : [0.99, 0.975, 0.945, 0.915, 0.88, 0.84, 0.78, 0.7];
  const Cs = neutral ? [0.25, 0.35, 0.5, 0.55, 0.6, 0.7, 0.8, 0.9] : [0.06, 0.12, 0.26, 0.38, 0.48, 0.58, 0.7, 0.85];
  const steps = Ls.map((l, i) => mk(l, chroma * Cs[i]));
  // 9: the brand itself (light); on dark, lifted if it would sink into the ground.
  let solid = neutral ? mk(dark ? 0.6 : 0.55, chroma) : mk(BL, BC);
  if (dark && !neutral && Math.abs(apca(steps[1], solid)) < 30) solid = mk(Math.max(BL, 0.62), BC * 0.9);
  // 10: 0.05 darker (light) or lighter (dark) — unless that takes step 9's label below 4.5:1 on hover, where
  // it moves the other way, away from the label (a label chosen for the rest state must hold on hover too).
  const hoverAt = (sign) => mk(solid.coords[0] + sign * 0.05, (solid.coords[1] ?? 0) * 1.02);
  const label = labelOn(solid);
  let hover = hoverAt(dark ? 1 : -1);
  if (label.pass && wcagShip(hover, label.on) < 4.5 && wcagShip(hoverAt(dark ? -1 : 1), label.on) >= 4.5) hover = hoverAt(dark ? -1 : 1);
  // 11 and 12: search lightness for the APCA target *and* the WCAG ratio — Lc 60 alone can land at ~3.5:1,
  // which fails WCAG AA for small text. Step 11 is solved against steps 2 *and* 3: solved on step 2 alone it
  // sat at exactly 4.5:1 there and 4.11–4.19:1 on step 3, the soft-badge and selected-row ground (S12).
  const solve = (target, ratio, grounds) => {
    let best = null;
    for (let i = 0; i <= 200; i++) {
      const l = dark ? 0.55 + i * 0.0022 : 0.75 - i * 0.0033;
      const c = mk(l, chroma * (neutral ? 0.9 : 0.7));
      if (grounds.every((g) => apcaShip(g, c) >= target && wcagShip(g, c) >= ratio)) { best = c; break; }
    }
    return best ?? mk(dark ? 0.98 : 0.1, chroma * 0.3);
  };
  return [...steps, solid, hover, solve(60, 4.5, [steps[1], steps[2]]), solve(90, 7, [steps[1]])];
}

function table(title, s, dark) {
  const ground = s[1];
  console.log(`${title}\n`);
  console.log('step  role                     hex      oklch                         vs step 2: WCAG   APCA');
  s.forEach((c, i) => {
    const w = wcag(ground, c), p = apca(ground, c);
    console.log(`${String(i + 1).padStart(4)}  ${ROLES[i].padEnd(23)}  ${toHex(c)}  ${oklch(c).padEnd(28)}  ${w.toFixed(2).padStart(6)}:1  ${p.toFixed(0).padStart(5)}`);
  });
  // Non-text contrast (WCAG 1.4.11): the lightest step that reaches 3:1 against both grounds — for the focus ring
  // and for control borders that carry meaning (inputs, checkboxes). Decorative borders may stay lighter.
  const ok = s.map((c, i) => [i, Math.min(wcag(s[0], c), wcag(s[1], c))]).filter(([, r]) => r >= 3).sort((x, y) => x[1] - y[1]);
  const threeToOne = ok.length ? ok[0][0] : 11;
  console.log(`\n  focus ring and meaningful control borders (≥ 3:1 on steps 1 and 2): step ${threeToOne + 1} ${toHex(s[threeToOne])} (${wcag(s[1], s[threeToOne]).toFixed(2)}:1)${threeToOne > 7 ? ' — steps 6–8 are for decorative borders only' : ''}`);
  const label = labelOn(s[8]);
  const onSolid = label.on;
  let note = '';
  if (!label.pass) {
    // Neither label reaches 4.5:1: name the nearest step (10 before 8 on a tie) whose fill carries one.
    const near = s.map((c, i) => ({ i, c, l: labelOn(c) })).filter((x) => x.i !== 8 && x.l.pass)
      .sort((x, y) => Math.abs(x.i - 8) - Math.abs(y.i - 8) || y.i - x.i)[0];
    note = ` — neither #ffffff nor #111111 reaches 4.5:1 on step 9: keep step 9 for large text (≥ 3:1), icons and fills; ${near ? `small-text labels go on step ${near.i + 1} ${toHex(near.c)} with ${toHex(near.l.on)} (${near.l.w.toFixed(2)}:1)` : 'no step of this scale carries a small-text label'}`;
  } else if (Math.abs(apca(s[8], onSolid)) < 59.5) note = ` — APCA Lc ${Math.abs(apca(s[8], onSolid)).toFixed(0)}: reads weak as a label at any size (a warning, never a gate; \`--tenant ${toHex(s[8])}\` lists the nearest fills that read well)`;
  else if (Math.abs(apca(s[8], onSolid)) < 74.5) note = ` — APCA Lc ${Math.abs(apca(s[8], onSolid)).toFixed(0)}: reads well only at ≥ 24px or ≥ 16px bold (a warning, never a gate)`;
  console.log(`\n  text on step 9: ${toHex(onSolid)} (WCAG ${wcag(s[8], onSolid).toFixed(2)}:1, APCA ${apca(s[8], onSolid).toFixed(0)})${note}`);
  const onHover = wcagShip(s[9], onSolid);
  if (label.pass && onHover < 4.5) console.log(`  on step 10 (solid hover) the same label is ${onHover.toFixed(2)}:1 — below 4.5:1: give hover another cue, or use a hover fill that keeps 4.5:1`);
  // Steps 11 and 12 also sit on step 3 (a soft badge, a selected row, a component at rest).
  console.log(`  text on step 3: step 11 ${wcag(s[2], s[10]).toFixed(2)}:1 (APCA ${apca(s[2], s[10]).toFixed(0)}), step 12 ${wcag(s[2], s[11]).toFixed(2)}:1 (APCA ${apca(s[2], s[11]).toFixed(0)})`);
  console.log();
}

const light = scale({});
const neutralChroma = Math.min(0.02, Math.max(0.006, BC * 0.08));
const neutral = scale({ chroma: neutralChroma, neutral: true });
table(`${name} — light`, light);
table(`neutral (tinted with hue ${BH.toFixed(0)}, chroma ${neutralChroma.toFixed(3)}) — light`, neutral);
let darkS, darkN;
if (a.dark) {
  darkS = scale({ dark: true });
  darkN = scale({ dark: true, chroma: neutralChroma, neutral: true });
  table(`${name} — dark`, darkS, true);
  table('neutral — dark', darkN, true);
}

if (a.css) {
  const vars = (prefix, s) => s.map((c, i) => `  --${prefix}-${i + 1}: ${oklch(c)}; /* ${toHex(c)} ${ROLES[i]} */`).join('\n');
  let css = `:root {\n${vars(name, light)}\n${vars('neutral', neutral)}\n}\n`;
  if (darkS) css += `@media (prefers-color-scheme: dark) {\n  :root {\n${vars(name, darkS).replace(/^/gm, '  ')}\n${vars('neutral', darkN).replace(/^/gm, '  ')}\n  }\n}\n`;
  await writeFile(String(a.css), css);
  console.log(`wrote ${a.css}`);
}
