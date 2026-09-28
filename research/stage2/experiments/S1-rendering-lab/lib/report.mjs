// results.json → results.md: the tables the stream report quotes.
import { writeFile } from 'node:fs/promises';

const kb = (b) => (b == null ? '—' : (b / 1024).toFixed(1));
const f = (x, d = 1) => (x == null || Number.isNaN(x) ? '—' : typeof x === 'number' ? x.toFixed(d) : String(x));
const row = (cells) => `| ${cells.join(' | ')} |`;
const head = (cells) => `${row(cells)}\n${row(cells.map(() => '---'))}`;

function fetchedGz(build, jsFiles) {
  if (!build || !jsFiles) return null;
  return jsFiles.reduce((a, name) => a + (build.files?.[name]?.gzip ?? build.worker?.gzip ?? 0), 0);
}

export async function writeReport(R, out) {
  const L = [];
  L.push('# S1 rendering lab — results', '');
  const m = R.meta || {};
  L.push(`Generated ${m.date?.slice(0, 16) ?? ''} · Chromium ${m.chromium ?? '?'} headless · ${m.cpus} × ${m.cpuModel ?? ''} (shared) · WebGL: ${m.webgl?.renderer ?? 'none'}`, '');
  L.push('**Every GPU-bound number here is CPU-emulated.** WebGL runs on SwiftShader and the display compositor runs in software (`SoftwareRenderer`), so frame rates of the WebGL variants — and, less so, of DOM/SVG compositing — are pessimistic and comparable only with each other. `JS ms/frame` (the scene\'s own update + render call) and `renderer ms/frame` (renderer-process CPU per displayed frame) are the GPU-independent columns. `busy %` (CDP TaskDuration) counts a main thread blocked waiting for the emulated GPU as busy, so it overstates WebGL main-thread load.', '');
  L.push(m.method ?? '', '');

  // Build sizes
  if (R.build) {
    L.push('## Production bundles (esbuild, minified; KB)', '');
    L.push(head(['variant', 'total min', 'total gzip', 'total br', 'runtime min', 'app min', 'app gzip', 'JS fetched at run time (gzip, per file)', 'chunks']));
    for (const [k, b] of Object.entries(R.build)) {
      const run = R.main?.[`${k}|200|1x`]?.summary ?? R.a11yPerf?.[`${k}|200|1x`]?.summary;
      L.push(row([k, kb(b.total.min), kb(b.total.gzip), kb(b.total.br), kb(b.runtime.min), kb(b.app.min), kb(b.app.gzip), kb(fetchedGz(b, run?.jsFiles)), Object.keys(b.files).length + (b.worker ? 1 : 0)]));
    }
    L.push('', 'Runtime packages (min KB): ' + Object.entries(R.build).filter(([, b]) => b.runtime.min).map(([k, b]) => `${k}: ${Object.entries(b.runtime.packages).sort((a, c) => c[1] - a[1]).slice(0, 4).map(([p, v]) => `${p} ${kb(v)}`).join(', ')}`).join('; '), '');
  }

  // Main matrix
  if (R.main) {
    L.push('## Steady state and drag, per N and CPU throttle (medians of runs)', '');
    const cols = ['variant', 'renderer', 'first frame ms', 'fps', 'frame p50/p95 ms', 'JS ms/frame p50/p95', 'renderer ms/frame', 'GPU-proc CPU %', 'busy %', 'drag move→frame p50/p95 ms', 'Event Timing max ms', 'heap MB', 'DOM nodes', 'draw calls', 'runs'];
    const groups = {};
    for (const [k, v] of Object.entries(R.main)) { const g = `N=${v.cell.n}, ${v.cell.throttle}× CPU`; (groups[g] ??= []).push([k, v]); }
    for (const [g, rows] of Object.entries(groups).sort((a, b) => { const p = (s) => s.match(/N=(\d+), (\d)/).slice(1).map(Number); const [an, at] = p(a[0]); const [bn, bt] = p(b[0]); return at - bt || an - bn; })) {
      L.push(`### ${g}`, '', head(cols));
      for (const [, v] of rows) {
        const s = v.summary;
        if (!s.runs) { L.push(row([v.cell.variant, 'FAILED', s.failed ?? '', ...cols.slice(3).map(() => '')])); continue; }
        L.push(row([v.cell.variant, s.renderer, f(s.ttff, 0), f(s.fps), `${f(s.frameMedian)} / ${f(s.frameP95)}`, `${f(s.jsMs, 2)} / ${f(s.jsP95, 2)}`, f(s.rendererMsPerFrame), f(s.gpuCpu, 0), f(s.busyPct, 0), `${f(s.moveToFrame)} / ${f(s.moveToFrameP95)}${s.dragOk ? '' : ' (drag failed)'}`, f(s.eventTimingMax, 0), f(s.heapMB), f(s.domNodes, 0), f(s.drawCalls, 0), s.runs]));
      }
      L.push('');
    }
  }

  if (R.worker) {
    L.push('## Main thread under load (50 ms busy every 100 ms): Canvas 2D on the main thread vs in a Worker', '');
    L.push(head(['variant', 'N', 'CPU', 'scene fps', 'scene frame p95', 'main-thread fps', 'drag move→frame p50/p95 ms', 'move event delay p50/p95 ms', 'busy %', 'runs']));
    for (const v of Object.values(R.worker)) {
      const s = v.summary;
      L.push(row([v.cell.variant, v.cell.n, `${v.cell.throttle}×`, f(s.fps), f(s.frameP95), f(s.mainFps ?? s.fps), `${f(s.moveToFrame)} / ${f(s.moveToFrameP95)}`, `${f(s.moveDelay)} / ${f(s.moveDelayP95)}`, f(s.busyPct, 0), s.runs]));
    }
    L.push('', 'For the Worker variant, "scene fps" is the Worker\'s own rAF cadence and move→frame is measured in the Worker (event timestamp → the Worker finished drawing the frame that used it); "main-thread fps" is the page\'s rAF.', '');
  }

  if (R.presented) {
    L.push('## Frames that reached the screen (compositor), with and without main-thread load', '', R.presented.note, '');
    L.push(head(['variant', 'N', 'no load: presented fps', 'load 50/100 ms: presented fps']));
    const seen = new Set();
    for (const c of Object.values(R.presented.cells)) {
      const k = `${c.variant}|${c.n}`; if (seen.has(k)) continue; seen.add(k);
      L.push(row([c.variant, c.n, f(R.presented.cells[`${k}|load0`]?.fps), f(R.presented.cells[`${k}|load50`]?.fps)]));
    }
    L.push('');
  }

  if (R.a11y) {
    L.push('## Accessibility', '');
    L.push(head(['variant', 'focusable by Tab', 'tab stops (N=20)', 'buttons in tree', 'first focus', 'keyboard pick/move/drop', 'tree (first lines)']));
    for (const [k, t] of Object.entries(R.a11y.tree)) {
      const kbd = R.a11y.keyboard?.[k];
      const kd = kbd ? (kbd.pass ? `pass (moved ${kbd.movedBy?.join(',')}, counter ${kbd.counter}, live "${kbd.live}")` : `no: ${kbd.enterSelects != null ? `Enter selects ${kbd.enterSelects}, arrows move ${kbd.arrowsMove}` : JSON.stringify(kbd)}`) : '—';
      L.push(row([k, t.focusable ? 'yes' : 'no', t.tabStops ?? '—', t.buttons, t.focused ? `${t.focused.tag}${t.focused.role ? `[role=${t.focused.role}]` : ''} "${t.focused.name}"` : '—', kd, '`' + (t.snapshotHead || '(empty)').split('\n').slice(0, 2).join(' / ').replace(/\|/g, '\\|') + '`']));
    }
    L.push('');
  }
  if (R.a11yPerf) {
    L.push('### Cost of the keyboard/screen-reader layer (1× CPU)', '');
    L.push(head(['variant', 'N', 'first frame ms', 'fps', 'frame p95', 'JS ms/frame', 'renderer ms/frame', 'busy %', 'drag move→frame p50/p95', 'DOM nodes', 'heap MB', 'app gzip KB']));
    for (const v of Object.values(R.a11yPerf)) {
      const s = v.summary;
      L.push(row([v.cell.variant, v.cell.n, f(s.ttff, 0), f(s.fps), f(s.frameP95), f(s.jsMs, 2), f(s.rendererMsPerFrame), f(s.busyPct, 0), `${f(s.moveToFrame)} / ${f(s.moveToFrameP95)}`, f(s.domNodes, 0), f(s.heapMB), kb(R.build?.[v.cell.variant]?.app.gzip)]));
    }
    L.push('');
  }

  if (R.reduced) {
    L.push('## prefers-reduced-motion: reduce, at rest (N=200, 1×; no harness rAF loop)', '');
    L.push(head(['variant', 'rAF calls in 5 s', 'busy %', 'renderer CPU %', 'GPU-proc CPU %', 'drag still works', 'runs']));
    for (const v of Object.values(R.reduced)) {
      const s = v.summary;
      L.push(row([v.cell.label ?? v.cell.variant, f(s.rafCalls, 0), f(s.busyPct), f(s.rendererCpu), f(s.gpuCpu), s.dragOk ? 'yes' : 'no', s.runs]));
    }
    L.push('');
  }

  if (R.nowebgl) {
    L.push(`## WebGL disabled (${R.nowebgl.flags})`, '');
    L.push(head(['variant', 'renderer chosen', 'first frame', 'fps', 'drag works', 'errors']));
    for (const [k, v] of Object.entries(R.nowebgl.variants)) L.push(row([k, v.renderer ?? '—', v.firstFrame ? `${f(v.ttff, 0)} ms` : 'none', f(v.fps), v.dragOk ? 'yes' : 'no', (v.errors || []).join('; ').replace(/\|/g, '/').slice(0, 140)]));
    L.push('');
  }

  if (R.contextLoss) {
    L.push('## WebGL context loss and restore (N=200, animating)', '', R.contextLoss.note, '');
    L.push(head(['variant', 'recovered', 'lost / restored events', 'scene frames in 1 s after', '% px differ vs before', 'errors']));
    for (const [k, v] of Object.entries(R.contextLoss.variants)) L.push(row([k, v.recovered ? 'yes' : 'NO', `${v.lostEv ?? '—'} / ${v.restoredEv ?? '—'}`, v.framesAfter ?? '—', f(v.diffPct, 2), (v.errors || []).join('; ').replace(/\|/g, '/').slice(0, 140) || (v.why ?? '')]));
    L.push('');
  }

  if (R.shots) {
    L.push('## Visual parity', '', R.shots.note, '');
    L.push(head(['variant', 'N=200 % px differ', 'N=2000 % px differ']));
    const vs = [...new Set(Object.keys(R.shots.diffs).map((k) => k.split('|')[0]))];
    for (const v of vs) L.push(row([v, f(R.shots.diffs[`${v}|200`], 2), f(R.shots.diffs[`${v}|2000`], 2)]));
    L.push('', 'Sheets: `shots/scene-n200.jpg`, `shots/scene-n2000.jpg`, `shots/no-webgl.jpg`.', '');
  }

  if (R.survey?.entries) {
    L.push('## Engine survey: hello-world payload and boot (not built as the scene)', '', R.survey.method, '');
    L.push(head(['entry', 'kind', 'initial gzip KB', 'all chunks gzip KB', 'fetched at boot gzip KB', 'WASM', 'boot to first frame (4× CPU) ms', 'renderer', 'licence (package.json · file)', 'latest (published)', 'React binding']));
    for (const [k, e] of Object.entries(R.survey.entries)) {
      const pk = Object.entries(e.packages || {})[e.includesReact && Object.keys(e.packages).length > 1 ? 0 : 0];
      const lic = Object.entries(e.packages || {}).map(([p, v]) => `${p}: ${v.license}${v.licenseFile ? '' : ' (no file)'}`).join('; ');
      const rel = Object.entries(e.packages || {}).map(([p, v]) => `${v.registry?.latest ?? v.version} (${v.registry?.published ?? '?'})${v.registry?.deprecated ? ' DEPRECATED' : ''}`).join('; ');
      L.push(row([k + (e.includesReact ? ' (+React)' : ''), e.kind, kb(e.size?.initial.gzip), kb(e.size?.all.gzip), kb(e.fetched?.gzip), e.size?.wasm?.length ? e.size.wasm.map((w) => `${kb(w.gzip)} gz`).join(', ') : '—', e.boot?.ms ?? (e.boot?.errors?.[0] ?? e.buildError ?? '—'), e.boot?.renderer ?? '—', lic, rel, e.reactBinding ?? '—']));
      void pk;
    }
    L.push('');
    if (R.survey.published) {
      L.push('### Engines that are not npm packages (published figures; tags as in the stream report)', '');
      L.push(head(['engine', 'minimum web payload', 'licence', 'React interop', 'latest', 'mobile notes', 'sources']));
      for (const e of R.survey.published) L.push(row([e.engine, e.payload, e.licence, e.react, e.latest, e.mobile, e.sources]));
      L.push('');
    }
  }
  await writeFile(out, L.join('\n'));
}
