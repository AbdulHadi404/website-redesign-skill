// Shared React shell: the same ids and classes as markup.mjs, with slots each React implementation fills.
import { items, revealTops } from '../markup.mjs';
export { items, revealTops };
export function Shell({ Press, List, Sheet, View, Ticker, Grid, Progress, Reveal }) {
  return (<>
    <Progress />
    <main className="grid">
      <section className="card"><h2>1 Press</h2><Press /></section>
      <section className="card"><h2>2 List (FLIP)</h2><List /></section>
      <section className="card"><h2>3 Sheet</h2><Sheet /></section>
      <section className="card"><h2>4 View</h2><View /></section>
      <section className="card"><h2>6 Ticker</h2><Ticker /></section>
      <section className="card"><h2>7 Grid</h2><Grid /></section>
    </main>
    <div className="tall">{revealTops.map((y, i) => <Reveal key={i} i={i} top={y} />)}</div>
  </>);
}
