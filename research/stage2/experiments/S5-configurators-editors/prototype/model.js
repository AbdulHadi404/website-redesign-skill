// Cake configurator model: options, the dependency rules, prices, lead time, URL encoding, randomise, description.
// Pure functions only, so the same file runs in the browser and in Node (prototype-run.mjs tests it exhaustively).
// Every price here is a SAMPLE for this evidence prototype, not a real bakery's price list.

export const PEOPLE = [
  // Customer vocabulary first ("how many people"), trade terms as hints. Allowed tiers depend on the count.
  { id: 8, tiers: { 1: [6] } },
  { id: 12, tiers: { 1: [8] } },
  { id: 20, tiers: { 1: [10], 2: [8, 6] } },
  { id: 30, tiers: { 2: [10, 7], 3: [9, 7, 5] } },
  { id: 50, tiers: { 3: [12, 9, 6] } },
];
export const SHAPES = [
  { id: 'round', name: 'Round', price: 0 },
  { id: 'square', name: 'Square', price: 6 },
  { id: 'heart', name: 'Heart', price: 8, hint: 'One tier, up to 20 people' },
];
export const SPONGES = [
  { id: 'vanilla', name: 'Vanilla', colour: '#f1d9a0' },
  { id: 'chocolate', name: 'Chocolate', colour: '#6b4331' },
  { id: 'lemon', name: 'Lemon', colour: '#f3dc72' },
  { id: 'redvelvet', name: 'Red velvet', colour: '#9e2f3a' },
  { id: 'carrot', name: 'Carrot', colour: '#c68a4c' },
];
export const FILLINGS = [
  { id: 'vanillabc', name: 'Vanilla buttercream', colour: '#fbf1dc' },
  { id: 'raspberry', name: 'Raspberry jam', colour: '#b8324b' },
  { id: 'caramel', name: 'Salted caramel', colour: '#c4863a' },
  { id: 'lemoncurd', name: 'Lemon curd', colour: '#efcb3f' },
  { id: 'ganache', name: 'Chocolate ganache', colour: '#4a2c22' },
];
export const FINISHES = [
  { id: 'buttercream', name: 'Buttercream', note: 'Smooth and soft', perPerson: 4.5, leadExtra: 0 },
  { id: 'naked', name: 'Naked', note: 'A thin coat, the sponge shows through', perPerson: 4.0, leadExtra: 0 },
  { id: 'ganache', name: 'Ganache', note: 'Glossy chocolate', perPerson: 5.0, leadExtra: 0 },
  { id: 'fondant', name: 'Fondant', note: 'Sharp edges, smooth sugar paste', perPerson: 6.0, leadExtra: 1 },
];
export const COLOURS = [
  { id: 'ivory', name: 'Ivory', colour: '#f6eee0' },
  { id: 'blush', name: 'Blush', colour: '#f1c3be' },
  { id: 'sage', name: 'Sage', colour: '#b7c9ad' },
  { id: 'sky', name: 'Sky', colour: '#bcd2e5' },
  { id: 'butter', name: 'Butter', colour: '#f4e19e' },
  { id: 'lilac', name: 'Lilac', colour: '#d3c3e3' },
  { id: 'charcoal', name: 'Charcoal', colour: '#3f3b3a' },
  { id: 'custom', name: 'Your colour', colour: null },
];
export const GANACHE = [
  { id: 'dark', name: 'Dark', colour: '#3b2219' },
  { id: 'milk', name: 'Milk', colour: '#7a4a2e' },
  { id: 'white', name: 'White', colour: '#efe3cc' },
];
export const DECORATIONS = [
  { id: 'drip', name: 'Drip', price: 8, note: 'Glaze over the top edge' },
  { id: 'flowers', name: 'Fresh flowers', price: 18, note: 'Seasonal, arranged by hand' },
  { id: 'goldleaf', name: 'Gold leaf', price: 12, note: 'Edible flakes on the top tier' },
  { id: 'sprinkles', name: 'Sprinkles', price: 4, note: 'A scatter on top' },
  { id: 'macarons', name: 'Macarons', price: 14, note: 'Five, in matching colours' },
];
export const DRIPS = [
  { id: 'gold', name: 'Gold', colour: '#d6a93f' },
  { id: 'chocolate', name: 'Chocolate', colour: '#4a2a1f' },
  { id: 'white', name: 'White chocolate', colour: '#f3ead8' },
  { id: 'pink', name: 'Pink', colour: '#e58ea3' },
];
export const MESSAGES = [
  { id: 'none', name: 'No message', price: 0 },
  { id: 'piped', name: 'Piped on top', price: 0, hint: 'Needs a top tier of 6 inches or more' },
  { id: 'plaque', name: 'On a plaque', price: 6 },
];
export const MAX_DECORATIONS = 3;
export const MAX_TEXT = 30;
export const TIER_PRICE = { 1: 0, 2: 15, 3: 35 };
export const BASE_LEAD_DAYS = { 1: 3, 2: 5, 3: 7 };

export const PRESETS = [
  { id: 'garden', name: 'Blush garden', config: { people: 12, tiers: 1, shape: 'round', sponge: 'vanilla', filling: 'raspberry', finish: 'buttercream', colour: 'blush', hue: 8, ganache: 'dark', decorations: ['flowers', 'goldleaf'], drip: 'gold', flowerPos: -0.45, message: 'none', text: '' } },
  { id: 'midnight', name: 'Midnight drip', config: { people: 20, tiers: 2, shape: 'round', sponge: 'chocolate', filling: 'caramel', finish: 'ganache', colour: 'ivory', hue: 30, ganache: 'dark', decorations: ['drip', 'macarons'], drip: 'gold', flowerPos: 0.4, message: 'none', text: '' } },
  { id: 'sweetheart', name: 'Sweetheart', config: { people: 8, tiers: 1, shape: 'heart', sponge: 'redvelvet', filling: 'vanillabc', finish: 'buttercream', colour: 'ivory', hue: 350, ganache: 'white', decorations: ['sprinkles'], drip: 'pink', flowerPos: 0, message: 'piped', text: 'Be mine' } },
  { id: 'stack', name: 'Celebration stack', config: { people: 50, tiers: 3, shape: 'round', sponge: 'lemon', filling: 'lemoncurd', finish: 'fondant', colour: 'sage', hue: 100, ganache: 'white', decorations: ['flowers', 'goldleaf'], drip: 'white', flowerPos: 0.35, message: 'plaque', text: 'Congratulations' } },
];
export const DEFAULT = PRESETS[0].config;

const byId = (list, id) => list.find((o) => o.id === id);
export const peopleOf = (c) => byId(PEOPLE, c.people);
export const tierSizes = (c) => peopleOf(c).tiers[c.tiers];
export const allowedTiers = (people) => Object.keys(byId(PEOPLE, people).tiers).map(Number);
export const topTierInches = (c) => { const s = tierSizes(c); return s[s.length - 1]; };
export const colourOf = (c) => {
  if (c.finish === 'ganache') return byId(GANACHE, c.ganache).colour;
  if (c.finish === 'naked') return '#f7efe3';
  if (c.colour === 'custom') return hslHex(c.hue, 0.5, 0.8);
  return byId(COLOURS, c.colour).colour;
};
export function hslHex(h, s, l) {
  const f = (n) => { const k = (n + h / 30) % 12; const a = s * Math.min(l, 1 - l); const v = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return Math.round(v * 255).toString(16).padStart(2, '0'); };
  return `#${f(0)}${f(8)}${f(4)}`;
}
export const hueName = (h) => { const names = [[15, 'red'], [40, 'orange'], [65, 'yellow'], [150, 'green'], [195, 'teal'], [255, 'blue'], [290, 'violet'], [335, 'pink'], [361, 'red']]; return `pastel ${names.find(([m]) => h < m)[1]}`; };

// ---------------------------------------------------------------------------------------------------------
// The dependency rules, in dependency order (people → tiers → shape → finish → decorations → message).
// NEEDS are facts the person gave us: how many people, and the message (whether there is one, how it is written,
// its words). Everything else is taste. Two rules follow, and the exhaustive test in prototype-run.mjs checks both:
//  - a repair changes only TASTE, never a need: a taste option that would change a need is shown inactive with
//    its reason (unavailableReason) instead of being offered with a repair (the first version turned "heart" at
//    30 people into a cake for 20, cheaper and too small: caught in review);
//  - a repair never changes the option just chosen.
// Every repair is reported in words, and the caller records the choice and its repairs as ONE history step.
export const NEEDS = ['people', 'message', 'text'];
export function violations(c) {
  const v = [];
  if (!allowedTiers(c.people).includes(c.tiers)) v.push('tiers-for-people');
  if (c.shape === 'heart' && c.tiers !== 1) v.push('heart-one-tier');
  if (c.decorations.includes('drip') && c.finish === 'fondant') v.push('drip-not-fondant');
  if (c.decorations.length > MAX_DECORATIONS) v.push('max-decorations');
  if (c.message === 'piped' && topTierInches(c) < 6) v.push('piped-needs-6in');
  if (c.text.length > MAX_TEXT) v.push('text-length');
  return v;
}
const topOf = (people, tiers) => { const s = byId(PEOPLE, people).tiers[tiers]; return s ? s[s.length - 1] : 0; };
const nearest = (list, x) => list.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a));

export function resolve(next, changed) {
  const c = { ...next, decorations: [...next.decorations] };
  const adj = [];
  const set = (key, to, reason) => { if (c[key] !== to) { adj.push({ key, from: c[key], to, reason }); c[key] = to; } };
  const ch = new Set(changed);
  // tiers must suit the number of people (tiers that do not suit are not offered, so this repairs tiers, not people)
  const allowed = allowedTiers(c.people);
  if (!allowed.includes(c.tiers)) set('tiers', nearest(allowed, c.tiers), `${c.people} people need ${allowed.join(' or ')} ${allowed.length > 1 || allowed[0] > 1 ? 'tiers' : 'tier'}`);
  // a heart is one tier (heart is inactive above 20 people, so choosing it only ever changes the tiers)
  if (c.shape === 'heart' && c.tiers !== 1) {
    if (ch.has('shape') && allowedTiers(c.people).includes(1)) set('tiers', 1, 'heart cakes are one tier');
    else set('shape', 'round', 'heart cakes are one tier, up to 20 people');
  }
  // a drip slides off fondant
  if (c.decorations.includes('drip') && c.finish === 'fondant') {
    if (ch.has('decorations')) set('finish', 'buttercream', 'a drip needs buttercream or ganache underneath');
    else { adj.push({ key: 'decorations', from: [...c.decorations], to: c.decorations.filter((d) => d !== 'drip'), reason: 'a drip slides off fondant' }); c.decorations = c.decorations.filter((d) => d !== 'drip'); }
  }
  if (c.decorations.length > MAX_DECORATIONS) c.decorations = c.decorations.slice(-MAX_DECORATIONS);
  // piping needs room on the top tier: keep the message as asked and change the tiers (taste) when a count allows it
  if (c.message === 'piped' && topTierInches(c) < 6) {
    const fit = allowedTiers(c.people).filter((t) => topOf(c.people, t) >= 6 && (c.shape !== 'heart' || t === 1));
    if (!ch.has('tiers') && fit.length) set('tiers', nearest(fit, c.tiers), 'piped writing needs a top tier of 6 inches or more');
    else set('message', 'plaque', `the ${topTierInches(c)}-inch top tier is too small to pipe on`);
  }
  if (c.text.length > MAX_TEXT) c.text = c.text.slice(0, MAX_TEXT);
  return { config: c, adjustments: adj };
}

// Why an option is unavailable right now (shown beside it, never only a greyed-out control). null = available.
// A taste option that would change a need is unavailable, with the reason and what would unlock it.
export function unavailableReason(c, key, value) {
  if (key === 'decorations' && !c.decorations.includes(value) && c.decorations.length >= MAX_DECORATIONS) return 'Up to three decorations';
  if (key === 'message' && value === 'piped' && topTierInches(c) < 6) return `The ${topTierInches(c)}-inch top tier is too small to pipe on`;
  if (key === 'shape' && value === 'heart' && !allowedTiers(c.people).includes(1)) return 'Heart cakes serve up to 20 people';
  if (key === 'tiers' && c.message === 'piped' && topOf(c.people, value) && topOf(c.people, value) < 6) return `${value} tiers leave a ${topOf(c.people, value)}-inch top tier, too small to pipe your message on`;
  return null;
}
// Options that are allowed but will change another choice say so BEFORE they are chosen. The hint is computed by
// running the same rules on the hypothetical choice, so it cannot drift from what choosing will do (a hand-written
// list of hints in the first version missed two cases).
export function sideEffects(c, key, value) {
  if (M_same(c[key], value)) return [];
  return resolve({ ...c, [key]: value }, [key]).adjustments;
}
const NUM = ['zero', 'one', 'two', 'three'];
export function sideEffectHint(c, key, value) {
  const adj = sideEffects(c, key, value);
  if (!adj.length) return null;
  const made = [], other = [];
  for (const a of adj) {
    if (a.key === 'people') made.push(`${a.to} people`);
    else if (a.key === 'tiers') made.push(`${NUM[a.to]} ${a.to === 1 ? 'tier' : 'tiers'}`);
    else if (a.key === 'shape') other.push(`changes the shape to ${byId(SHAPES, a.to).name.toLowerCase()}`);
    else if (a.key === 'finish') other.push(`changes the finish to ${byId(FINISHES, a.to).name.toLowerCase()}`);
    else if (a.key === 'message') other.push('moves the message to a plaque');
    else if (a.key === 'decorations') other.push(`removes the ${byId(DECORATIONS, a.from.find((x) => !a.to.includes(x))).name.toLowerCase()}`);
  }
  const parts = [...(made.length ? [`changes to ${made.join(', ')}`] : []), ...other];
  const txt = listJoin(parts);
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}
const M_same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ---------------------------------------------------------------------------------------------------------
export function price(c) {
  const fin = byId(FINISHES, c.finish);
  const lines = [[`${c.people} people, ${fin.name.toLowerCase()}`, c.people * fin.perPerson]];
  if (TIER_PRICE[c.tiers]) lines.push([`${c.tiers} tiers`, TIER_PRICE[c.tiers]]);
  const sh = byId(SHAPES, c.shape); if (sh.price) lines.push([`${sh.name} shape`, sh.price]);
  for (const d of c.decorations) { const o = byId(DECORATIONS, d); lines.push([o.name, o.price]); }
  const m = byId(MESSAGES, c.message); if (m.price) lines.push(['Message plaque', m.price]);
  const total = Math.round(lines.reduce((a, [, v]) => a + v, 0));
  return { lines, total, perPerson: total / c.people };
}
export const leadDays = (c) => BASE_LEAD_DAYS[c.tiers] + byId(FINISHES, c.finish).leadExtra;

// ---------------------------------------------------------------------------------------------------------
// URL state: short keys, validated on the way in (a bad or old link falls back per field, then resolves).
// Free text (the message's words) is NEVER written to the URL: the query string reaches analytics page views
// (page_location), server logs and shared links. The words stay in the local draft and travel with the request.
// (The first version wrote them as tx=, so "Happy 30th Maya" sat in every page URL: caught in review.)
const KEYS = { people: 'p', tiers: 't', shape: 'sh', sponge: 'sp', filling: 'fi', finish: 'fn', colour: 'co', hue: 'h', ganache: 'ga', decorations: 'd', drip: 'dr', flowerPos: 'fp', message: 'm' };
export function encode(c) {
  const q = new URLSearchParams();
  for (const [k, s] of Object.entries(KEYS)) {
    const v = c[k];
    q.set(s, k === 'decorations' ? v.join('.') : k === 'flowerPos' ? String(Math.round(v * 100)) : String(v));
  }
  return q.toString();
}
export function decode(str, fallback = DEFAULT) {
  const q = new URLSearchParams(str);
  if (!q.has('p')) return null;
  const pick = (list, v, d) => (list.some((o) => String(o.id) === v) ? list.find((o) => String(o.id) === v).id : d);
  const num = (v, lo, hi, d) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
  const c = {
    people: pick(PEOPLE, q.get('p'), fallback.people), tiers: num(q.get('t'), 1, 3, fallback.tiers),
    shape: pick(SHAPES, q.get('sh'), fallback.shape), sponge: pick(SPONGES, q.get('sp'), fallback.sponge),
    filling: pick(FILLINGS, q.get('fi'), fallback.filling), finish: pick(FINISHES, q.get('fn'), fallback.finish),
    colour: pick(COLOURS, q.get('co'), fallback.colour), hue: Math.round(num(q.get('h'), 0, 359, fallback.hue)),
    ganache: pick(GANACHE, q.get('ga'), fallback.ganache),
    decorations: [...new Set((q.get('d') || '').split('.').filter((d) => DECORATIONS.some((o) => o.id === d)))],
    drip: pick(DRIPS, q.get('dr'), fallback.drip), flowerPos: num(q.get('fp'), -100, 100, fallback.flowerPos * 100) / 100,
    message: pick(MESSAGES, q.get('m'), fallback.message), text: '',
  };
  return resolve(c, []).config;
}

// ---------------------------------------------------------------------------------------------------------
// "Surprise me": randomise taste, never needs. The number of people and the message are facts the person gave us.
export function randomise(c, rnd = Math.random) {
  const pickR = (list) => list[Math.floor(rnd() * list.length)];
  const fits = allowedTiers(c.people).filter((t) => c.message !== 'piped' || Math.min(...byId(PEOPLE, c.people).tiers[t]) >= 6);
  const tiers = pickR(fits.length ? fits : allowedTiers(c.people)); // never a size that would undo the message
  const shape = pickR(SHAPES.filter((s) => s.id !== 'heart' || tiers === 1)).id;
  const finish = pickR(FINISHES).id;
  const pool = DECORATIONS.map((d) => d.id).filter((d) => d !== 'drip' || finish !== 'fondant');
  const n = 1 + Math.floor(rnd() * 3);
  const decorations = [];
  while (decorations.length < n) { const d = pickR(pool); if (!decorations.includes(d)) decorations.push(d); }
  const next = { ...c, tiers, shape, finish, sponge: pickR(SPONGES).id, filling: pickR(FILLINGS).id,
    colour: pickR(COLOURS.filter((o) => o.id !== 'custom')).id, ganache: pickR(GANACHE).id, decorations,
    drip: pickR(DRIPS).id, flowerPos: Math.round((rnd() * 1.6 - 0.8) * 100) / 100 };
  return resolve(next, []).config;
}

// ---------------------------------------------------------------------------------------------------------
// The text alternative of the preview: the whole configuration in one sentence (the preview is role="img").
export function describe(c) {
  const sizes = tierSizes(c);
  const fin = byId(FINISHES, c.finish).name.toLowerCase();
  const col = c.finish === 'ganache' ? `${byId(GANACHE, c.ganache).name.toLowerCase()} chocolate ` : c.finish === 'naked' ? '' : c.colour === 'custom' ? `${hueName(c.hue)} ` : `${byId(COLOURS, c.colour).name.toLowerCase()} `;
  const tiersTxt = c.tiers === 1 ? `a ${sizes[0]}-inch ${c.shape} cake` : `a ${c.tiers}-tier ${c.shape} cake (${sizes.join(', ')} inches)`;
  const dec = c.decorations.map((d) => (d === 'drip' ? `a ${byId(DRIPS, c.drip).name.toLowerCase()} drip` : d === 'flowers' ? `fresh flowers on the ${c.flowerPos < -0.25 ? 'left' : c.flowerPos > 0.25 ? 'right' : 'centre'}` : byId(DECORATIONS, d).name.toLowerCase()));
  const msg = c.message === 'none' || !c.text ? '' : ` The ${c.message === 'plaque' ? 'plaque' : 'piping'} reads “${c.text}”.`;
  const inside = `${byId(SPONGES, c.sponge).name.toLowerCase()} sponge with ${byId(FILLINGS, c.filling).name.toLowerCase()}`;
  return `Sketch of ${tiersTxt} for ${c.people} people: ${inside}, ${col}${fin} outside${dec.length ? `, with ${listJoin(dec)}` : ''}.${msg}`;
}
export const listJoin = (a) => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);
export const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export const lookup = { PEOPLE, SHAPES, SPONGES, FILLINGS, FINISHES, COLOURS, GANACHE, DECORATIONS, DRIPS, MESSAGES };
export const nameOf = (key, id) => {
  const list = { shape: SHAPES, sponge: SPONGES, filling: FILLINGS, finish: FINISHES, colour: COLOURS, ganache: GANACHE, drip: DRIPS, message: MESSAGES }[key];
  if (list) return byId(list, id)?.name ?? String(id);
  if (key === 'people') return `${id} people`;
  if (key === 'tiers') return `${id} ${id === 1 ? 'tier' : 'tiers'}`;
  if (key === 'decorations') return id.length ? listJoin(id.map((d) => byId(DECORATIONS, d).name.toLowerCase())) : 'no decorations';
  return String(id);
};
