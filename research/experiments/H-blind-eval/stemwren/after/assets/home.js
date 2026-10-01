// Home: the hero bouquet, what's in season this month and the delivery table, all from the shop's data files.
// The HTML already holds a version baked from the data (qa/tools/bake-home.mjs), so the page is complete without
// JavaScript; this refreshes it from today's export (flowers.json changes every morning).
import * as M from './bouquet-model.js';
import { bouquetSVG, stemSVG, headMarkup } from './bouquet-art.js';

const get = (n) => fetch(`data/${n}.json`).then((r) => { if (!r.ok) throw new Error(n); return r.json(); });

export function seasonRow(flowers, iso) {
  const month = M.MONTHS[M.monthOf(iso) - 1];
  return flowers.map((f) => {
    const a = M.availability(f, iso);
    const colour = f.colours[0];
    const inner = `${stemSVG(f, colour)}<span class="tag">${f.name}</span><span class="meta">${a.ok ? `${M.money(f.price)} a stem` : a.words}</span>`;
    return a.ok
      ? `<li><a class="season-stem" href="order/?add=${f.id}"><span class="visually-hidden">Start a bouquet with </span>${inner}</a></li>`
      : `<li><span class="season-stem is-resting">${inner}</span></li>`;
  }).join('') + `<!-- ${month} -->`;
}

export function heroArt(data, iso) {
  const b = M.defaultBouquet(iso, data.flowers);
  return { svg: bouquetSVG({ ...b, seed: 7 }, data, { cls: 'hero-bouquet' }), starter: b.starter, words: M.describe(b.lines, data.flowers, data.wraps, b.wrap, b.ribbon) };
}

export function zonesRows(delivery) {
  return delivery.zones.map((z) => `<tr><th scope="row">${z.name}${z.same_day ? ` <span class="sameday">· same day by ${M.cutoffWords(delivery.cutoff_same_day)}</span>` : ''}</th><td>${M.sortDistricts(z.districts).join(', ')}</td><td class="num">${M.money(z.price)}</td></tr>`).join('');
}

export function bucket(flowers) {
  const f = flowers.find((x) => x.id === 'chrysanthemum');
  if (!f) return '';
  const spots = [[220, 292], [244, 284], [266, 292], [232, 274], [256, 270]];
  return spots.map(([x, y], i) => `<g transform="translate(${x} ${y}) scale(.55)">${headMarkup(f, f.colours[i % f.colours.length], 'door' + i)}</g>`).join('');
}

if (typeof document !== 'undefined') {
  (async () => {
    try {
      const [flowers, wraps, delivery] = await Promise.all([get('flowers'), get('wraps'), get('delivery')]);
      const data = { flowers, wraps, delivery };
      const iso = M.londonNow().iso;
      const row = document.getElementById('season-row');
      row.innerHTML = seasonRow(flowers, iso);
      document.getElementById('season-lede').textContent = `What the shop can get for delivery in ${M.MONTHS[M.monthOf(iso) - 1]}. Tap one to start a bouquet with it.`;
      document.getElementById('zones-home').innerHTML = zonesRows(delivery);
      const link = document.getElementById('hero-link');
      const h = heroArt(data, iso);
      if (link.dataset.starter !== h.starter) {
        link.innerHTML = h.svg;
        link.dataset.starter = h.starter || '';
        const cap = document.querySelector('.hero-art figcaption'); if (cap) cap.textContent = `An illustration of a bouquet you can make: ${h.words}.`;
      }
      const b = document.getElementById('door-bucket');
      if (b && !b.dataset.done) { b.insertAdjacentHTML('afterbegin', bucket(flowers)); b.dataset.done = '1'; }
    } catch (_) { /* the baked version stays */ }
  })();
}
