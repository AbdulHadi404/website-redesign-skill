#!/usr/bin/env node
// Writes the shared header and footer, and a no-JavaScript copy of everything rendered from the data
// files, into each page between <!-- prerender:NAME --> … <!-- /prerender:NAME --> markers.
//
//   node tools/prerender.mjs          (Node 18+, no dependencies)
//
// Run it after data/fees.json or data/services.json changes. Browsers with JavaScript re-render the same
// blocks from the data files on every visit, so the site is right even before this is run; this keeps the
// copy that search engines, printouts and no-JavaScript visitors see in step.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  BUSINESS_TYPES, TURNOVERS, feeFor, resultHTML, scheduleHTML, deadlinesHTML, servicesHTML, updatedText, contactHref,
} from '../assets/fees-render.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFileSync(path.join(root, f), 'utf8');
const fees = JSON.parse(read('data/fees.json'));
const services = JSON.parse(read('data/services.json'));

const PAGES = [
  { file: 'index.html', key: 'home', prefix: '' },
  { file: 'services/index.html', key: 'services', prefix: '../' },
  { file: 'fees/index.html', key: 'fees', prefix: '../' },
  { file: 'team/index.html', key: 'team', prefix: '../' },
  { file: 'contact/index.html', key: 'contact', prefix: '../' },
];
const NAV = [['home', '', 'Home'], ['services', 'services/', 'Services'], ['fees', 'fees/', 'Fees'], ['team', 'team/', 'Our team'], ['contact', 'contact/', 'Contact']];
const PHONE_ICON = '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24"><path fill="currentColor" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"/></svg>';

function header({ key, prefix }) {
  const links = NAV.map(([k, href, label]) => `<li><a href="${href ? prefix + href : prefix || './'}"${k === key ? ' aria-current="page"' : ''}>${label}</a></li>`).join('');
  return `<a class="skip" href="#main">Skip to content</a>
<header class="site-header${key === 'home' || key === 'fees' ? '' : ' call-primary'}">
  <div class="wrap header-inner">
    <a class="brand" href="${prefix || './'}"><picture><source media="(min-width: 64em)" srcset="${prefix}assets/logo-outlined-rev.svg"><source media="(max-width: 22.5em)" srcset="${prefix}assets/logo-mark-rev.svg"><img src="${prefix}assets/logo-compact-rev.svg" alt="Hallam &amp; Price, home" width="219" height="56"></picture></a>
    <nav class="site-nav" aria-label="Main"><ul id="site-nav-list">${links}</ul></nav>
    <a class="btn btn-primary call" href="tel:01142700418">${PHONE_ICON}<span class="call-word">Call</span><span class="call-number"><span class="vh">: </span>0114 270 0418</span></a>
    <button class="btn menu-btn" type="button" aria-expanded="false" aria-controls="site-nav-list">Menu</button>
  </div>
</header>`;
}

function footer({ prefix }) {
  const links = NAV.map(([, href, label]) => `<li><a href="${href ? prefix + href : prefix || './'}">${label}</a></li>`).join('');
  return `<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div class="stack">
        <img src="${prefix}assets/logo-mark-rev.svg" alt="" width="56" height="56">
        <p>Hallam &amp; Price Chartered Accountants</p>
        <address>3 Cotton Mill Walk, Kelham Island, Sheffield S3 8DH</address>
      </div>
      <nav aria-label="Footer"><h2>Pages</h2><ul>${links}</ul></nav>
      <div><h2>Talk to us</h2><ul><li><a href="tel:01142700418">0114 270 0418</a></li><li><a href="mailto:info@hallamprice.co.uk">info@hallamprice.co.uk</a></li></ul></div>
    </div>
    <p class="legal">&copy; ${new Date().getFullYear()} Hallam &amp; Price Chartered Accountants. Registered to carry on audit work in the UK by the ICAEW. 3 Cotton Mill Walk, Kelham Island, Sheffield S3 8DH.</p>
  </div>
</footer>`;
}

const DEFAULT = { type: 'Sole trader', turnover: 'Under £50k' };
function finder({ prefix, key }) {
  const fee = feeFor(fees, DEFAULT.type, DEFAULT.turnover);
  const opts = (list, sel) => list.map((o) => {
    const v = typeof o === 'string' ? o : o.value;
    const l = typeof o === 'string' ? o.replace(/^Under/, 'under').replace(/^Over/, 'over') : o.label;
    return `<option value="${v}"${v === sel ? ' selected' : ''}>${l}</option>`;
  }).join('');
  const contact = `${prefix}contact/`;
  return `<p class="ff-q ff-controls js-only"><label for="ff-type">I’m<span class="vh"> (what describes you)</span></label> <span class="blank"><select id="ff-type">${opts(BUSINESS_TYPES, DEFAULT.type)}</select></span><span class="ff-turnover-clause"> <label for="ff-turnover">with a turnover of<span class="vh"> (your yearly turnover)</span></label> <span class="blank"><select id="ff-turnover">${opts(TURNOVERS, DEFAULT.turnover)}</select></span></span></p>
<p class="ff-static-q nojs-only">For example, a sole trader with a turnover under £50k:</p>
<div class="ff-result" role="status">${resultHTML(fee)}</div>
<div class="ff-side">
  <p class="ff-more">${fee.extra || ''}</p>
  <div class="actions"><a class="btn btn-primary ff-ask" data-primary-cta href="${contactHref(contact, DEFAULT.type, DEFAULT.turnover, fee.service)}">Ask about this fee</a>${key === 'fees' ? '<a class="text-link" href="#schedule-title">See the whole schedule</a>' : `<a class="text-link" href="${prefix}fees/">See every fee</a>`}</div>
</div>`;
}

const blocks = {
  header, footer, finder,
  services: ({ prefix }) => servicesHTML(services, fees, `${prefix}contact/`, 3),
  'services-page': ({ prefix }) => servicesHTML(services, fees, `${prefix}contact/`, 2),
  schedule: ({ prefix }) => scheduleHTML(fees, `${prefix}contact/`),
  deadlines: () => deadlinesHTML(fees, null),
  updated: () => updatedText(fees),
  vat: () => fees.vat_note || '',
};

let changed = 0;
for (const page of PAGES) {
  const file = path.join(root, page.file);
  let html = readFileSync(file, 'utf8');
  const before = html;
  html = html.replace(/(<!-- prerender:([a-z-]+) -->)([\s\S]*?)(<!-- \/prerender:\2 -->)/g, (m, open, name, _old, close) => {
    if (!blocks[name]) throw new Error(`${page.file}: unknown block ${name}`);
    const out = blocks[name](page);
    return `${open}${out.includes('\n') || out.length > 80 ? '\n' + out + '\n' : out}${close}`;
  });
  if (html !== before) { writeFileSync(file, html); changed++; }
}
console.log(`prerender: ${changed} page(s) updated from data/fees.json (updated ${fees.updated}) and data/services.json`);
