// Tests for assets/bouquet-model.js against the owner's rules (README) and the contract.
// Run: node --test qa/
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as M from '../assets/bouquet-model.js';

const flowers = JSON.parse(readFileSync(new URL('../data/flowers.json', import.meta.url)));
const wraps = JSON.parse(readFileSync(new URL('../data/wraps.json', import.meta.url)));
const delivery = JSON.parse(readFileSync(new URL('../data/delivery.json', import.meta.url)));

test('size is what the stem count says (Petite 5–9, Classic 10–17, Grand 18–25)', () => {
  for (let n = 0; n <= 30; n++) {
    const want = n >= 5 && n <= 9 ? 'Petite' : n >= 10 && n <= 17 ? 'Classic' : n >= 18 && n <= 25 ? 'Grand' : null;
    assert.equal(M.sizeFor(n), want, `n=${n}`);
  }
});

test('every add or remove from every reachable bouquet ends within 0–25 stems and never touches another line', () => {
  // Exhaustive over a small alphabet: three stem/colour pairs, counts 0..25 total.
  const pairs = [['rose', 'red'], ['eucalyptus', 'silver dollar'], ['dahlia', 'burgundy']];
  let transitions = 0;
  for (let a = 0; a <= 25; a++) for (let b = 0; a + b <= 25; b++) for (let c = 0; a + b + c <= 25; c++) {
    const lines = [[...pairs[0], a], [...pairs[1], b], [...pairs[2], c]].filter((x) => x[2]).map(([id, colour, count]) => ({ id, colour, count }));
    for (const [id, colour] of pairs) {
      const r = M.addStem(lines, id, colour);
      transitions++;
      const n = M.totalStems(r.lines);
      assert.ok(n <= M.MAX_STEMS);
      if (M.totalStems(lines) < M.MAX_STEMS) assert.ok(r.added && n === M.totalStems(lines) + 1);
      else assert.ok(!r.added && r.why);
      for (const l of lines) if (!(l.id === id && l.colour === colour)) assert.deepEqual(r.lines.find((x) => x.id === l.id && x.colour === l.colour), l);
      const d = M.removeStem(lines, id, colour);
      transitions++;
      assert.ok(d.every((l) => l.count > 0));
      for (const l of lines) if (!(l.id === id && l.colour === colour)) assert.deepEqual(d.find((x) => x.id === l.id && x.colour === l.colour), l);
    }
  }
  assert.ok(transitions > 10000);
});

test('no more than MAX_LINES kinds, said in words', () => {
  let lines = [];
  const pairs = flowers.flatMap((f) => f.colours.map((c) => [f.id, c]));
  for (const [id, c] of pairs.slice(0, M.MAX_LINES)) lines = M.addStem(lines, id, c).lines;
  const r = M.addStem(lines, ...pairs[M.MAX_LINES]);
  assert.equal(r.added, false);
  assert.match(r.why, /kinds of stem/);
});

test('out-of-season and out-of-stock stems are refused with when they are back', () => {
  const byId = M.indexFlowers(flowers);
  assert.deepEqual(M.availability(byId.peony, '2026-10-15').ok, false);
  assert.equal(M.availability(byId.peony, '2026-10-15').words, 'Back in May');
  assert.equal(M.availability(byId['sweet-pea'], '2026-06-15').reason, 'stock');
  assert.equal(M.availability(byId.dahlia, '2026-10-31').ok, true);
  assert.equal(M.availability(byId.dahlia, '2026-11-01').words, 'Back in July');
  assert.equal(M.seasonEnds(byId.dahlia, 10), 'October');
  assert.equal(M.availability(byId.tulip, '2027-01-02').ok, true);
});

test('a delivery date that makes a chosen stem unavailable is a validation error, not a silent change', () => {
  const s = { lines: [{ id: 'dahlia', colour: 'burgundy', count: 6 }], postcode: 'LS7 3NB', date: '2026-11-03' };
  const errs = M.validate('delivery', s, { delivery, flowers, now: { iso: '2026-10-01', hour: 10, minute: 0 } });
  assert.equal(errs[0].field, 'delivery_date');
  assert.match(errs[0].message, /Dahlia/);
  assert.equal(s.lines[0].count, 6);
});

test('postcodes are accepted however they are typed', () => {
  for (const raw of ['LS17 6AB', 'ls176ab', ' ls17  6ab ', 'LS17-6AB', 'Ls17 6aB.']) assert.equal(M.parsePostcode(raw).formatted, 'LS17 6AB');
  assert.equal(M.parsePostcode('LS7').full, false);
  assert.equal(M.parsePostcode('hello'), null);
  assert.equal(M.zoneFor('ls176ab', delivery).zone.id, 'A'); // the old form priced this at £0 delivery
  assert.equal(M.zoneFor('LS1 4AP', delivery).zone.id, 'B');
  assert.equal(M.zoneFor('BD1 1AA', delivery).zone, null);
});

test('same day only for a same-day zone before the cut-off, in UK time', () => {
  const A = delivery.zones[0], B = delivery.zones[1];
  const before = { iso: '2026-10-01', hour: 12, minute: 59 }, after = { iso: '2026-10-01', hour: 13, minute: 0 };
  assert.equal(M.deliveryDays({ now: before, zone: A, cutoff: '13:00' })[0].ok, true);
  assert.equal(M.deliveryDays({ now: after, zone: A, cutoff: '13:00' })[0].ok, false);
  assert.equal(M.deliveryDays({ now: before, zone: B, cutoff: '13:00' })[0].ok, false);
  assert.equal(M.deliveryDays({ now: before, zone: null, cutoff: '13:00' })[0].ok, false);
  assert.equal(M.deliveryDays({ now: before, zone: B, cutoff: '13:00' })[1].ok, true);
  // 11:30 UTC on 1 Oct is 12:30 in London (BST): still before the cut-off
  assert.deepEqual(M.londonNow(new Date('2026-10-01T11:30:00Z')), { iso: '2026-10-01', hour: 12, minute: 30 });
  // 12:30 UTC on 1 Dec is 12:30 in London (GMT)
  assert.equal(M.londonNow(new Date('2026-12-01T12:30:00Z')).hour, 12);
  // across midnight
  assert.equal(M.londonNow(new Date('2026-10-01T23:30:00Z')).iso, '2026-10-02');
});

test('price: stems + wrap + ribbon + zone, with delivery unknown until a postcode', () => {
  const lines = [{ id: 'rose-garden', colour: 'peach', count: 5 }, { id: 'lisianthus', colour: 'white', count: 4 }, { id: 'eucalyptus', colour: 'silver dollar', count: 3 }];
  const p0 = M.priceOf({ lines, wrap: 'kraft', ribbon: 'twine', zone: null }, flowers, wraps);
  assert.equal(p0.stems, 36.3);
  assert.equal(p0.delivery, null);
  const p1 = M.priceOf({ lines, wrap: 'box', ribbon: 'silk-sage', zone: delivery.zones[0] }, flowers, wraps);
  assert.equal(p1.total, 36.3 + 9 + 2 + 4.95);
});

test('shared links carry stems, wrap, ribbon and arrangement — never words', () => {
  const s = { lines: [{ id: 'rose-garden', colour: 'cafe au lait', count: 3 }, { id: 'dahlia', colour: 'cafe au lait', count: 4 }, { id: 'eucalyptus', colour: 'silver dollar', count: 2 }], wrap: 'linen', ribbon: 'silk-blush', seed: 42, card_message: 'secret', recipient_name: 'Someone' };
  const q = M.encode(s);
  assert.doesNotMatch(q, /secret|Someone/);
  const d = M.decode('?' + q, flowers, wraps);
  // garden roses have no "cafe au lait": that line is dropped, never guessed
  assert.deepEqual(d.lines, [{ id: 'dahlia', colour: 'cafe au lait', count: 4 }, { id: 'eucalyptus', colour: 'silver dollar', count: 2 }]);
  assert.equal(d.wrap, 'linen'); assert.equal(d.ribbon, 'silk-blush'); assert.equal(d.seed, 42);
  const junk = M.decode('?b=rose.red.99~nope.x.3&w=gold&r=<script>', flowers, wraps);
  assert.equal(M.totalStems(junk.lines), 25); assert.equal(junk.wrap, null); assert.equal(junk.ribbon, null);
});

test('the payload has exactly the old keys, in the old order, with the old value shapes', () => {
  const s = { lines: [{ id: 'rose-garden', colour: 'peach', count: 5 }], wrap: 'kraft', ribbon: 'none', card_message: '', postcode: 'ls76ab', date: '2026-10-03', recipient_name: ' A ', recipient_address: 'B', sender_name: 'C', sender_email: 'c@x.uk', sender_phone: '07700 900000' };
  const p = M.payload(s);
  assert.deepEqual(Object.keys(p), ['size', 'stems', 'wrap', 'ribbon', 'card_message', 'delivery_date', 'delivery_postcode', 'recipient_name', 'recipient_address', 'sender_name', 'sender_email', 'sender_phone']);
  assert.equal(p.size, 'Petite');
  assert.deepEqual(p.stems, [{ id: 'rose-garden', colour: 'peach', count: 5 }]);
  assert.equal(typeof p.stems[0].count, 'number');
  assert.equal(p.delivery_date, '03/10/2026');
  assert.equal(p.delivery_postcode, 'LS7 6AB');
  assert.equal(p.recipient_name, 'A');
});

test('every starter is a valid bouquet of real stems, colours, wraps and ribbons', () => {
  const byId = M.indexFlowers(flowers);
  for (const s of M.STARTERS) {
    const n = M.totalStems(s.lines);
    assert.ok(M.sizeFor(n), `${s.id} has ${n} stems`);
    for (const l of s.lines) assert.ok(byId[l.id] && byId[l.id].colours.includes(l.colour), `${s.id}: ${l.id} ${l.colour}`);
    assert.ok(wraps.wraps.some((w) => w.id === s.wrap) && wraps.ribbons.some((r) => r.id === s.ribbon));
  }
  // in October the first available starter is the peach one (post 1), never peonies
  assert.equal(M.defaultBouquet('2026-10-01', flowers).starter, 'peach');
  assert.equal(M.starterAvailability(M.STARTERS.find((x) => x.id === 'peony'), '2026-10-01', flowers).words, 'Back in May');
});
