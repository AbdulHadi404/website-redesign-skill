// One product page, four builds: the same markup, different motion (c/pages/<variant>.css|js).
export const markup = () => `
<header id="top"><nav id="nav" aria-label="Main"><a href="#plans">Pricing</a> <a href="#features">Features</a> <a href="#panel-demo">Demo</a></nav></header>
<main>
<section id="hero"><div class="blob" aria-hidden="true"></div>
  <h1 id="hero-title">Close the books in a day, not a week</h1>
  <p>Ledgerline reconciles every account overnight and shows you only the exceptions.</p>
  <p class="actions"><button id="cta" class="btn">Start free trial</button> <button id="open-sheet" class="btn secondary" aria-expanded="false" aria-controls="sheet">Compare plans</button></p>
</section>
<section id="plans" aria-label="Plans">
  <article class="plan" id="plan-basic"><h2>Basic</h2><p>$19 per month</p><a class="btn" href="#basic">Choose Basic</a></article>
  <article class="plan" id="plan-pro"><h2>Pro</h2><p>$49 per month</p><a class="btn" href="#pro">Choose Pro</a></article>
  <article class="plan" id="plan-team"><h2>Team</h2><p>$99 per month</p><a class="btn" href="#team">Choose Team</a></article>
</section>
<section id="stats"><p><output id="stat">1,280</output> finance teams closed last month with Ledgerline</p></section>
<section id="features" aria-label="Features">
  ${['Bank feeds', 'Auto-match', 'Exceptions first', 'Audit trail', 'Multi-entity', 'Close checklist'].map((t, i) => `<div class="feature" style="--i:${i}"><h3>${t}</h3><p>What it does, in one plain line.</p></div>`).join('\n  ')}
</section>
<section id="panel-demo" aria-label="Demo">
  <div id="panel"><div class="view" id="view-a">Exceptions: 3</div><div class="view" id="view-b" hidden>Matched: 1,214</div></div>
  <p><button id="next" class="btn">Next view</button> <button id="save" class="btn">Save</button></p>
  <div id="toast" role="status" class="toast">Saved</div>
</section>
</main>
<dialog id="sheet" aria-label="Plan comparison"><p>Basic · Pro · Team — everything in Basic, plus…</p><button id="close-sheet" class="btn">Close</button></dialog>
<footer><p>© Ledgerline (fixture)</p></footer>`;
