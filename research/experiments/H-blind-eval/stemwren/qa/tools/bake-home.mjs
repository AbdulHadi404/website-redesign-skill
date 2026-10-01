// Bakes today's hero bouquet and in-season row into index.html, so the home page is complete without JavaScript.
// Run after the data changes month: node qa/tools/bake-home.mjs [YYYY-MM-DD]
import { readFileSync, writeFileSync } from 'node:fs';
import * as M from '../../assets/bouquet-model.js';
import { seasonRow, heroArt, bucket } from '../../assets/home.js';
const root = new URL('../../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const data = { flowers: JSON.parse(read('data/flowers.json')), wraps: JSON.parse(read('data/wraps.json')), delivery: JSON.parse(read('data/delivery.json')) };
const iso = process.argv[2] || M.londonNow().iso;
let html = read('index.html');
const h = heroArt(data, iso);
html = html.replace(/<!-- hero-art:start -->[\s\S]*?<!-- hero-art:end -->/, `<!-- hero-art:start -->${h.svg}<!-- hero-art:end -->`);
html = html.replace(/id="hero-link"( data-starter="[^"]*")?/, `id="hero-link" data-starter="${h.starter || ''}"`);
html = html.replace(/<!-- season:start -->[\s\S]*?<!-- season:end -->/, `<!-- season:start -->${seasonRow(data.flowers, iso)}<!-- season:end -->`);
html = html.replace(/(<g id="door-bucket")( data-done="1")?>(<g transform[\s\S]*?)?(<path d="M206 296h74l-8 64h-58z")/, `$1 data-done="1">${bucket(data.flowers)}$4`);
writeFileSync(new URL('index.html', root), html);
console.log('baked for', iso, 'starter', h.starter);
