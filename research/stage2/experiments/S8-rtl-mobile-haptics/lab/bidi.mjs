// Bidi in RTL forms and text: scrambled LTR data (phone, card, IBAN…), input direction options, truncation,
// Arabic justification, the Saudi riyal sign. Fixture: fixtures/bidi.html. Writes shots/bidi.jpg.
import path from 'node:path';
import { root } from '../lib/server.mjs';

// In-page: are the value's tokens laid out left-to-right in logical order (i.e. readable as typed)?
function orderCheck() {
  const tokensIn = (text) => { const out = []; const re = /[A-Za-z0-9٠-٩]+|[^\sA-Za-z0-9٠-٩]/g; let m; while ((m = re.exec(text))) out.push({ t: m[0], i: m.index }); return out; };
  const visualOrder = (el) => {
    const tn = [...el.childNodes].find((n) => n.nodeType === 3);
    const toks = tokensIn(tn.textContent);
    const xs = toks.map(({ t, i }) => { const r = document.createRange(); r.setStart(tn, i); r.setEnd(tn, i + t.length); return r.getBoundingClientRect().left; });
    const order = xs.map((x, k) => [x, k]).sort((a, b) => a[0] - b[0]).map(([, k]) => k);
    const inOrder = order.every((k, j) => k === j);
    return { inOrder, visual: order.map((k) => toks[k].t).join(' ') };
  };
  const res = { spans: [], inputs: [], uaDirection: {} };
  for (const el of document.querySelectorAll('.v')) res.spans.push({ i: +el.dataset.i, mode: el.dataset.mode, ...visualOrder(el) });
  // Inputs: lay the value out in a probe with the input's resolved direction (same bidi paragraph level).
  for (const inp of document.querySelectorAll('#inputs input')) {
    const dir = inp.matches(':dir(rtl)') ? 'rtl' : 'ltr';
    const probe = document.createElement('div'); probe.dir = dir; probe.style.cssText = 'position:absolute; top:-999px; white-space:pre; font:14px sans-serif';
    probe.textContent = inp.value; document.body.append(probe);
    const o = visualOrder(probe); probe.remove();
    const cs = getComputedStyle(inp);
    res.inputs.push({ i: +inp.dataset.i, mode: inp.dataset.mode, type: inp.type, resolvedDir: dir, textAlign: cs.textAlign, ...o });
  }
  // Does the UA force a direction on any input type in an RTL document?
  for (const t of ['text', 'email', 'tel', 'url', 'number', 'password', 'search', 'date']) {
    const i = document.createElement('input'); i.type = t; document.body.append(i);
    res.uaDirection[t] = { direction: getComputedStyle(i).direction, textAlign: getComputedStyle(i).textAlign }; i.remove();
  }
  return res;
}

function truncationCheck() {
  const out = {};
  for (const id of ['t1', 't2', 't3', 't4']) {
    const el = document.getElementById(id), tn = el.firstChild, box = el.getBoundingClientRect();
    const r = document.createRange(); r.setStart(tn, 0); r.setEnd(tn, 3);
    const first = r.getBoundingClientRect();
    const r2 = document.createRange(); r2.setStart(tn, tn.length - 3); r2.setEnd(tn, tn.length);
    const last = r2.getBoundingClientRect();
    const inside = (q) => q.left >= box.left - 1 && q.right <= box.right + 1;
    out[id] = { containerDir: getComputedStyle(el).direction, resolvedDir: el.matches(':dir(rtl)') ? 'rtl' : 'ltr', startVisible: inside(first), endVisible: inside(last) };
  }
  return out;
}

function justifyCheck() {
  const gaps = (p) => {
    const tn = p.firstChild, words = []; const re = /\S+/g; let m;
    while ((m = re.exec(tn.textContent))) { const r = document.createRange(); r.setStart(tn, m.index); r.setEnd(tn, m.index + m[0].length); words.push(r.getBoundingClientRect()); }
    const g = [];
    for (let k = 1; k < words.length; k++) if (Math.abs(words[k].top - words[k - 1].top) < 2) g.push(Math.abs(words[k - 1].left - words[k].right));
    return { maxGap: Math.round(Math.max(...g) * 10) / 10, meanGap: Math.round((g.reduce((a, b) => a + b, 0) / g.length) * 10) / 10 };
  };
  return { start: gaps(document.getElementById('j0')), justify: gaps(document.getElementById('j1')), textJustifySupported: CSS.supports('text-justify', 'inter-character') };
}

async function riyalCheck(page) {
  // Which font actually draws U+20C1 in each stack: CDP CSS.getPlatformFontsForNode (this machine has Unifont, which
  // has the sign, so "something rendered" is not evidence; the platform font name is).
  const stacks = { Brand: 'Brand', 'IBM Plex Sans Arabic': '"T-IBM Plex Sans Arabic"', 'Noto Naskh Arabic': '"T-Noto Naskh Arabic"', Inter: '"T-Inter"', 'system-ui': 'system-ui' };
  await page.evaluate(async (stacks) => {
    for (const [k, f] of Object.entries(stacks)) {
      const s = document.createElement('span'); s.id = 'rs-' + k.replace(/\W/g, ''); s.style.fontFamily = f; s.textContent = '\u20C1'; document.body.append(s);
      await document.fonts.load(`20px ${f}`, '\u20C1');
    }
  }, stacks);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  const { root: docRoot } = await cdp.send('DOM.getDocument', { depth: -1 });
  const out = {};
  for (const k of Object.keys(stacks)) {
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: docRoot.nodeId, selector: '#rs-' + k.replace(/\W/g, '') });
    const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
    out[k] = fonts.map((f) => `${f.familyName}${f.isCustomFont ? ' (web font)' : ' (system)'}`).join(', ');
  }
  const intl = await page.evaluate(() => {
    const t = document.getElementById('r4').textContent;
    const r = { text: t, hasU20C1: t.includes('\u20C1'), codepoints: [...t].filter((c) => c.charCodeAt(0) > 127).map((c) => 'U+' + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')).join(' ') };
    for (const cd of ['symbol', 'narrowSymbol']) r['has_' + cd] = new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR', currencyDisplay: cd }).format(125).includes('\u20C1');
    return r;
  });
  return { drawnBy: out, intlArSA: intl };
}

// Typing into dir=auto inputs: what direction does the field take as the user types?
async function typingCheck(page) {
  const out = [];
  for (const [label, text] of [['empty', ''], ['+966 digits first', '+966 50 123'], ['email', 'sara@example.com'], ['arabic name', 'سارة'], ['digits only', '0501234567']]) {
    const dir = await page.evaluate(async () => {
      const i = document.createElement('input'); i.dir = 'auto'; i.id = 'typing'; document.body.prepend(i); i.focus(); return true;
    });
    if (text) await page.keyboard.insertText(text);
    const r = await page.evaluate(() => { const i = document.getElementById('typing'); const d = i.matches(':dir(rtl)') ? 'rtl' : 'ltr'; i.remove(); return d; });
    out.push({ typed: label, resolvedDir: r });
  }
  return out;
}

export async function run(browser, base) {
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(base + '/fixtures/bidi.html');
  await page.evaluate(() => document.fonts.ready);
  const vals = await page.evaluate(() => window.VALUES.map((v) => v[1]));
  const order = await page.evaluate(orderCheck);
  const name = (i) => vals[i];
  const table = {};
  for (const s of order.spans) (table[name(s.i)] ??= {})[s.mode] = s.inOrder ? 'ok' : `scrambled → "${s.visual}"`;
  for (const s of order.inputs) (table[name(s.i)] ??= {})['input:' + s.mode] = (s.inOrder ? 'ok' : `scrambled → "${s.visual}"`) + ` (${s.resolvedDir}, text-align ${s.textAlign})`;
  const res = {
    values: table, uaInputDirection: order.uaDirection,
    truncation: await page.evaluate(truncationCheck),
    justify: await page.evaluate(justifyCheck),
    riyal: await riyalCheck(page),
    dirAutoTyping: await typingCheck(page),
  };
  await page.screenshot({ path: path.join(root, 'shots', 'bidi.jpg'), type: 'jpeg', quality: 70, fullPage: true });
  await ctx.close();
  return res;
}
