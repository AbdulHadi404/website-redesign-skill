// The one DOM every vanilla implementation drives (React implementations render the same ids and classes).
export const items = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo'];
export const revealTops = [900, 1250, 1600, 1950, 2300];
export function markup() {
  return `
<div id="progress"></div>
<main class="grid">
  <section class="card"><h2>1 Press</h2><button id="press" class="btn">Press me</button></section>
  <section class="card"><h2>2 List (FLIP)</h2><button id="shuffle">Reverse order</button>
    <ul id="list">${items.map((t, i) => `<li data-id="${i + 1}">${t}</li>`).join('')}</ul></section>
  <section class="card"><h2>3 Sheet</h2><button id="sheet-toggle" aria-expanded="false" aria-controls="sheet">Toggle sheet</button></section>
  <section class="card"><h2>4 View</h2><button id="swap">Swap view</button><div id="stage"><div class="view" id="view-a">A</div></div></section>
  <section class="card"><h2>6 Ticker</h2><button id="tick-hi">To 1000</button> <button id="tick-lo">To 200</button><output id="ticker">0</output></section>
  <section class="card"><h2>7 Grid</h2><button id="grid-toggle" aria-pressed="false">Toggle grid</button>
    <div id="grid">${Array.from({ length: 12 }, () => '<div class="cell"></div>').join('')}</div></section>
</main>
<dialog id="sheet" aria-label="Sheet">A sheet</dialog>
<div class="tall">${revealTops.map((y, i) => `<div class="reveal" id="r${i + 1}" style="top:${y}px">Reveal ${i + 1}</div>`).join('')}</div>`;
}
