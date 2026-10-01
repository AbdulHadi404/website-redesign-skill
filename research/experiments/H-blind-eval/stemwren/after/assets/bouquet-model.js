// The bouquet model: options, rules, prices, dates, URL encoding and the order payload.
// Pure functions only — the builder (order.js), the home page (home.js) and the tests in qa/ import this file.
// The data comes from data/*.json (flowers.json is exported from the stock sheet each morning: never edited here).

export const MIN_STEMS = 5;
export const MAX_STEMS = 25;
// The old form offered three flower lines. The order service's limit is unknown (assumption A2 in REPORT.md):
// if it rejects more than three entries in `stems`, set this to 3 and the builder will say so in words.
export const MAX_LINES = 6;

export const SIZES = [
  { name: 'Petite', min: 5, max: 9 },
  { name: 'Classic', min: 10, max: 17 },
  { name: 'Grand', min: 18, max: 25 },
];

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Customer words for the data's kinds (discovery/domain.md).
export const KIND_LABEL = { focal: 'Flowers', filler: 'Little flowers', foliage: 'Greenery' };

export const slug = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-');

export function totalStems(lines) {
  return lines.reduce((n, l) => n + (l.count || 0), 0);
}

export function sizeFor(total) {
  const s = SIZES.find((x) => total >= x.min && total <= x.max);
  return s ? s.name : null;
}

export const lowerFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);
export const money = (n) => '£' + (Math.round(n * 100) / 100).toFixed(2);

// ---- Dates, in UK time ------------------------------------------------------------------------------

/** Now in Europe/London, whatever the phone's own time zone. */
export function londonNow(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
      .formatToParts(date).map((p) => [p.type, p.value]),
  );
  const hour = parts.hour === '24' ? 0 : +parts.hour;
  return { iso: `${parts.year}-${parts.month}-${parts.day}`, hour, minute: +parts.minute };
}

/** Calendar arithmetic on YYYY-MM-DD strings (no time zone involved). */
export function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}
export const monthOf = (iso) => +iso.slice(5, 7);
export function dayLabel(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return { dow: DAYS[t.getUTCDay()], day: d, mon: MON[m - 1], long: `${DAYS[t.getUTCDay()]} ${d} ${MON[m - 1]}` };
}
/** The contract's delivery_date format, as the old form's placeholder asked for: DD/MM/YYYY (assumption A3). */
export function payloadDate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** Is "now" before the same-day cut-off ("13:00")? */
export function beforeCutoff(now, cutoff = '13:00') {
  const [h, m] = cutoff.split(':').map(Number);
  return now.hour < h || (now.hour === h && now.minute < m);
}

// ---- Seasons and stock -------------------------------------------------------------------------------

/**
 * Can this stem be ordered for delivery on `iso`? Season is judged by the delivery date's month (assumption A4);
 * stock is this morning's export and applies to every date.
 * Returns { ok: true } or { ok: false, reason: 'stock'|'season', back: 'May' | null, words: '…' }.
 */
export function availability(flower, iso) {
  if (!flower.stock) return { ok: false, reason: 'stock', back: null, words: 'None in today' };
  const m = monthOf(iso);
  if (!flower.season.includes(m)) {
    const back = nextSeasonMonth(flower, m);
    return { ok: false, reason: 'season', back, words: back ? `Back in ${back}` : 'Out of season' };
  }
  return { ok: true };
}

export function nextSeasonMonth(flower, fromMonth) {
  for (let i = 1; i <= 12; i++) {
    const m = ((fromMonth - 1 + i) % 12) + 1;
    if (flower.season.includes(m)) return MONTHS[m - 1];
  }
  return null;
}

/** The last month of the current run of season months, if the stem is in season in `month` (for "until October"). */
export function seasonEnds(flower, month) {
  if (flower.season.length === 12 || !flower.season.includes(month)) return null;
  let m = month;
  for (let i = 0; i < 12; i++) {
    const next = (m % 12) + 1;
    if (!flower.season.includes(next)) return MONTHS[m - 1];
    m = next;
  }
  return null;
}

/** Stems in the bouquet that could not be made for delivery on `iso`. */
export function conflictsOn(lines, iso, flowers) {
  const byId = indexFlowers(flowers);
  const out = [];
  for (const l of lines) {
    const f = byId[l.id];
    if (!f) continue;
    const a = availability(f, iso);
    if (!a.ok && !out.some((o) => o.flower.id === f.id)) out.push({ flower: f, ...a });
  }
  return out;
}

export const indexFlowers = (flowers) => Object.fromEntries(flowers.map((f) => [f.id, f]));

// ---- Delivery ------------------------------------------------------------------------------------------

/**
 * Normalise what people type: any case, no space, extra spaces, punctuation (GOV.UK addresses pattern).
 * Returns { formatted: 'LS17 6AB', district: 'LS17', full: true } or null when it cannot be a postcode.
 */
export function parsePostcode(raw) {
  const s = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!s) return null;
  if (/^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(s)) {
    const district = s.slice(0, -3);
    return { formatted: `${district} ${s.slice(-3)}`, district, full: true };
  }
  if (/^[A-Z]{1,2}\d[A-Z\d]?$/.test(s)) return { formatted: s, district: s, full: false };
  return null;
}

export function zoneFor(raw, delivery) {
  const pc = parsePostcode(raw);
  if (!pc) return { postcode: null, zone: null };
  const zone = delivery.zones.find((z) => z.districts.includes(pc.district)) || null;
  return { postcode: pc, zone };
}

/**
 * The next `n` delivery days from today (UK time). `zone` may be null (postcode not known yet).
 * Each: { iso, label, today, ok, why } — today is offered only for a same-day zone before the cut-off.
 * Assumption A6: every day is a delivery day; zones without same-day start tomorrow.
 */
export function deliveryDays({ now, zone, cutoff, n = 14, lines = [], flowers = [] }) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const iso = addDays(now.iso, i);
    const today = i === 0;
    let ok = true, why = '';
    if (today) {
      if (!zone) { ok = false; why = 'Postcode first'; }
      else if (!zone.same_day) { ok = false; why = `Not same day to ${zone.name}`; }
      else if (!beforeCutoff(now, cutoff)) { ok = false; why = `Same-day closed at ${cutoffWords(cutoff)}`; }
    }
    const conflicts = conflictsOn(lines, iso, flowers);
    out.push({ iso, label: dayLabel(iso), today, ok, why, conflicts });
  }
  return out;
}

/** Postcode districts in reading order: LS6, LS7, LS8, LS17. */
export const sortDistricts = (d) => [...d].sort((a, b) => a.replace(/\d+.*/, '').localeCompare(b.replace(/\d+.*/, '')) || parseInt(a.replace(/^\D+/, ''), 10) - parseInt(b.replace(/^\D+/, ''), 10));

export const cutoffWords = (cutoff) => {
  const [h, m] = cutoff.split(':').map(Number);
  const hh = h > 12 ? h - 12 : h;
  return `${hh}${m ? ':' + String(m).padStart(2, '0') : ''}${h >= 12 ? 'pm' : 'am'}`;
};

// ---- Price -------------------------------------------------------------------------------------------

/** The customer's figure (the shop's order service recalculates — README). delivery is null until a zone is known. */
export function priceOf({ lines, wrap, ribbon, zone }, flowers, wraps) {
  const byId = indexFlowers(flowers);
  const stems = lines.reduce((s, l) => s + (byId[l.id] ? byId[l.id].price * l.count : 0), 0);
  const w = wraps.wraps.find((x) => x.id === wrap);
  const r = wraps.ribbons.find((x) => x.id === ribbon);
  const wrapP = w ? w.price : 0, ribbonP = r ? r.price : 0;
  const deliveryP = zone ? zone.price : null;
  const total = round2(stems + wrapP + ribbonP + (deliveryP || 0));
  return { stems: round2(stems), wrap: wrapP, ribbon: ribbonP, delivery: deliveryP, total };
}
const round2 = (n) => Math.round(n * 100) / 100;

// ---- Editing lines (every change ends valid; never changes a need) -----------------------------------

/** Add one stem; returns { lines, added: bool, why } — refuses past MAX_STEMS or MAX_LINES, never silently. */
export function addStem(lines, id, colour) {
  if (totalStems(lines) >= MAX_STEMS) return { lines, added: false, why: `A bouquet holds up to ${MAX_STEMS} stems.` };
  const i = lines.findIndex((l) => l.id === id && l.colour === colour);
  if (i >= 0) return { lines: lines.map((l, j) => (j === i ? { ...l, count: l.count + 1 } : l)), added: true };
  if (lines.length >= MAX_LINES) return { lines, added: false, why: `Up to ${MAX_LINES} kinds of stem in one bouquet — take one out first.` };
  return { lines: [...lines, { id, colour, count: 1 }], added: true };
}

export function removeStem(lines, id, colour) {
  return lines
    .map((l) => (l.id === id && l.colour === colour ? { ...l, count: l.count - 1 } : l))
    .filter((l) => l.count > 0);
}

export function dropFlowers(lines, ids) {
  return lines.filter((l) => !ids.includes(l.id));
}

// ---- URL encoding (stems, wrap, ribbon, arrangement seed; never the card or anyone's details) -----------

export function encode({ lines, wrap, ribbon, seed }) {
  const p = new URLSearchParams();
  if (lines.length) p.set('b', lines.map((l) => `${l.id}.${slug(l.colour)}.${l.count}`).join('~'));
  if (wrap) p.set('w', wrap);
  if (ribbon) p.set('r', ribbon);
  if (seed) p.set('t', String(seed));
  return p.toString();
}

/** Decode and validate a shared link against today's data: unknown stems, colours and wraps are dropped, counts clamped. */
export function decode(search, flowers, wraps) {
  const p = new URLSearchParams(search);
  const byId = indexFlowers(flowers);
  const lines = [];
  for (const part of (p.get('b') || '').split('~')) {
    const [id, colourSlug, n] = part.split('.');
    const f = byId[id];
    if (!f) continue;
    const colour = f.colours.find((c) => slug(c) === colourSlug);
    const count = Math.max(0, Math.min(MAX_STEMS, parseInt(n, 10) || 0));
    if (!colour || !count) continue;
    const r = lines.length < MAX_LINES ? addLines(lines, { id, colour, count }) : null;
    if (!r) break;
  }
  // Clamp the total to MAX_STEMS, taking from the last line first.
  let over = totalStems(lines) - MAX_STEMS;
  for (let i = lines.length - 1; over > 0 && i >= 0; i--) {
    const take = Math.min(over, lines[i].count - 1);
    lines[i].count -= take; over -= take;
  }
  const wrap = wraps.wraps.some((w) => w.id === p.get('w')) ? p.get('w') : null;
  const ribbon = wraps.ribbons.some((r) => r.id === p.get('r')) ? p.get('r') : null;
  const seed = /^\d{1,9}$/.test(p.get('t') || '') ? +p.get('t') : null;
  return { lines, wrap, ribbon, seed, add: p.get('add') || null };
}
function addLines(lines, line) {
  const same = lines.find((l) => l.id === line.id && l.colour === line.colour);
  if (same) same.count += line.count; else lines.push({ ...line });
  return lines;
}

// ---- Validation, per chapter, with the payload's field names ----------------------------------------------

export function validate(chapter, s, ctx) {
  const errs = [];
  const add = (field, message, target) => errs.push({ field, message, target: target || field });
  if (chapter === 'flowers' || chapter === 'all') {
    const n = totalStems(s.lines);
    if (n < MIN_STEMS) add('stems', n ? `Add ${MIN_STEMS - n} more stem${MIN_STEMS - n > 1 ? 's' : ''} — a bouquet has at least ${MIN_STEMS}.` : `Add at least ${MIN_STEMS} stems.`, 'tray');
    if (n > MAX_STEMS) add('stems', `Take out ${n - MAX_STEMS} stems — a bouquet has at most ${MAX_STEMS}.`, 'tray');
  }
  if (chapter === 'delivery' || chapter === 'all') {
    const z = zoneFor(s.postcode, ctx.delivery);
    if (!String(s.postcode || '').trim()) add('delivery_postcode', 'Enter the postcode the flowers are going to.');
    else if (!z.postcode || !z.postcode.full) add('delivery_postcode', 'Enter the full postcode, like LS7 3NB.');
    else if (!z.zone) add('delivery_postcode', `We don’t deliver to ${z.postcode.district} yet. Our areas are listed below.`);
    if (!s.date) add('delivery_date', 'Choose a delivery day.', 'day-0');
    else if (s.date < ctx.now.iso) add('delivery_date', 'Choose a day from today onwards.', 'day-0');
    else if (z.zone && s.date === ctx.now.iso && !(z.zone.same_day && beforeCutoff(ctx.now, ctx.delivery.cutoff_same_day))) {
      add('delivery_date', z.zone.same_day ? `Same-day orders close at ${cutoffWords(ctx.delivery.cutoff_same_day)}. Choose tomorrow or later.` : `Same-day delivery is only for ${ctx.delivery.zones.filter((x) => x.same_day).map((x) => x.name).join(', ')}. Choose tomorrow or later.`, 'day-0');
    } else {
      const c = conflictsOn(s.lines, s.date, ctx.flowers);
      if (c.length) add('delivery_date', `${list(c.map((x) => `${plural(x.flower.name.toLowerCase(), 2)} (${lowerFirst(x.words)})`)).replace(/^./, (m) => m.toUpperCase())} can’t be had on that day. Choose another day, or change the flowers.`, 'day-0');
    }
  }
  if (chapter === 'details' || chapter === 'all') {
    if (!s.recipient_name.trim()) add('recipient_name', 'Enter the name of the person the flowers are for.');
    if (!s.recipient_address.trim()) add('recipient_address', 'Enter the address the flowers are going to.');
    if (!s.sender_name.trim()) add('sender_name', 'Enter your name.');
    if (!s.sender_email.trim()) add('sender_email', 'Enter your email address.');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.sender_email.trim())) add('sender_email', 'Enter an email address like name@example.com.');
    if (!s.sender_phone.trim()) add('sender_phone', 'Enter your phone number.');
    else if (s.sender_phone.replace(/\D/g, '').length < 10) add('sender_phone', 'Enter a phone number with at least 10 digits, like 07700 900123.');
  }
  return errs;
}

// ---- The order payload: exactly the old keys, in the old order (README contract) --------------------------

export function payload(s) {
  const pc = parsePostcode(s.postcode);
  return {
    size: sizeFor(totalStems(s.lines)) || '',
    stems: s.lines.map((l) => ({ id: l.id, colour: l.colour, count: l.count })),
    wrap: s.wrap,
    ribbon: s.ribbon,
    card_message: s.card_message,
    delivery_date: payloadDate(s.date),
    delivery_postcode: pc ? pc.formatted : String(s.postcode || '').trim(),
    recipient_name: s.recipient_name.trim(),
    recipient_address: s.recipient_address.trim(),
    sender_name: s.sender_name.trim(),
    sender_email: s.sender_email.trim(),
    sender_phone: s.sender_phone.trim(),
  };
}

// ---- Starters (recipes inspired by the shop's posts; counts are ours, not the shop's) ------------------

export const STARTERS = [
  { id: 'peach', name: 'Peach season', note: 'Garden roses, lisianthus and eucalyptus in kraft and twine', post: 1,
    lines: [{ id: 'rose-garden', colour: 'peach', count: 5 }, { id: 'lisianthus', colour: 'white', count: 4 }, { id: 'eucalyptus', colour: 'silver dollar', count: 3 }], wrap: 'kraft', ribbon: 'twine' },
  { id: 'dahlia', name: 'Café au lait', note: 'Dahlias with pittosporum and gypsophila in sage linen', post: 3,
    lines: [{ id: 'dahlia', colour: 'cafe au lait', count: 7 }, { id: 'pittosporum', colour: 'green', count: 4 }, { id: 'gypsophila', colour: 'white', count: 3 }], wrap: 'linen', ribbon: 'silk-sage' },
  { id: 'red', name: 'Deep red', note: 'Garden roses and roses with eucalyptus in white tissue', post: null,
    lines: [{ id: 'rose-garden', colour: 'deep red', count: 4 }, { id: 'rose', colour: 'red', count: 8 }, { id: 'eucalyptus', colour: 'silver dollar', count: 5 }], wrap: 'tissue', ribbon: 'none' },
  { id: 'peony', name: 'Peonies in a hat box', note: 'Blush peonies with a sage ribbon', post: 6,
    lines: [{ id: 'peony', colour: 'blush', count: 9 }], wrap: 'box', ribbon: 'silk-sage' },
  { id: 'tulip', name: 'Pick & mix tulips', note: 'Tulips in four colours with eucalyptus', post: 7,
    lines: [{ id: 'tulip', colour: 'pink', count: 3 }, { id: 'tulip', colour: 'yellow', count: 3 }, { id: 'tulip', colour: 'white', count: 3 }, { id: 'tulip', colour: 'purple', count: 3 }, { id: 'eucalyptus', colour: 'silver dollar', count: 3 }], wrap: 'kraft', ribbon: 'twine' },
];

/** A starter is offered only when every stem in it can be had on `iso`. */
export function starterAvailability(starter, iso, flowers) {
  const c = conflictsOn(starter.lines, iso, flowers);
  return c.length ? { ok: false, words: c[0].words } : { ok: true };
}

/** The first starter available on `iso`, else a bouquet of whatever is available. */
export function defaultBouquet(iso, flowers) {
  const s = STARTERS.find((x) => starterAvailability(x, iso, flowers).ok);
  if (s) return { lines: s.lines.map((l) => ({ ...l })), wrap: s.wrap, ribbon: s.ribbon, starter: s.id };
  const ok = flowers.filter((f) => availability(f, iso).ok);
  const focal = ok.find((f) => f.kind === 'focal'), green = ok.find((f) => f.kind === 'foliage');
  const lines = [];
  if (focal) lines.push({ id: focal.id, colour: focal.colours[0], count: 7 });
  if (green) lines.push({ id: green.id, colour: green.colours[0], count: 3 });
  return { lines, wrap: 'kraft', ribbon: 'twine', starter: null };
}

export function describe(lines, flowers, wraps, wrap, ribbon) {
  const byId = indexFlowers(flowers);
  const parts = lines.map((l) => `${l.count} ${l.colour} ${plural(byId[l.id]?.name.toLowerCase() || l.id, l.count)}`);
  const w = wraps.wraps.find((x) => x.id === wrap), r = wraps.ribbons.find((x) => x.id === ribbon);
  let s = list(parts);
  if (w) s += `, in ${w.name.toLowerCase()}`;
  if (r && r.id !== 'none') s += ` with ${r.name.toLowerCase()}`;
  return s;
}
export function plural(name, n) {
  if (n === 1) return name;
  if (/(eucalyptus|pittosporum|gypsophila|lisianthus|ranunculus)$/.test(name)) return name;
  if (/sweet pea$/.test(name)) return name + 's';
  if (/y$/.test(name)) return name.slice(0, -1) + 'ies';
  return name + 's';
}
export function list(a) {
  if (a.length <= 1) return a.join('');
  return a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
}
