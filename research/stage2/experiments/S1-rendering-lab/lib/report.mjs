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
  L.push('**"4×" is not a phone.** CDP `Emulation.setCPUThrottlingRate` slows only the page\'s main thread; the compositor, raster threads, GPU process and Workers run at full speed (see "What CPU throttling reaches" below). A 4× column therefore means "main thread 4× slower, everything else unchanged", which favours DOM/SVG (whose compositing and raster happen off the main thread) over Canvas 2D (which draws on the main thread), and would favour a Worker over everything, so Worker variants are measured at 1× only. Read 4× results as relative positions, not as object counts for a phone.', '');
  L.push(m.method ?? '', '');
  if (R.throttleProbe) {
    L.push('## What CPU throttling reaches', '', R.throttleProbe.note, '');
    L.push(head(['throttle', 'main thread min / median ms', 'Worker min / median ms']));
    for (const c of Object.values(R.throttleProbe.cells)) L.push(row([`${c.rate}×`, `${c.mainMin} / ${c.mainMedian}`, `${c.workerMin} / ${c.workerMedian}`]));
    const w = R.throttleProbe.workerTarget;
    L.push('', `Emulation.setCPUThrottlingRate sent to the Worker\'s own target: ${w?.reply?.error ? `error "${w.reply.error}"` : JSON.stringify(w)}.`, '');
  }

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
    for (const [k, v] of Object.entries(R.main)) { const g = `N=${v.cell.n}, ${v.cell.throttle}× CPU${v.cell.throttle > 1 ? ' (main thread only)' : ''}`; (groups[g] ??= []).push([k, v]); }
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

  if (R.sweep) {
    L.push('## Where the CPU renderers stop holding the frame rate (object-count sweep)', '');
    L.push('Same scene and method as the main matrix, measured as its own round-robin set per throttle. Each cell: fps · % of frames that missed a vsync (rAF delta > 25 ms) · frame p95 ms, medians of runs. **Holds** = at most 10 % of frames miss a vsync (median of runs); the limit is given as a bracket between the last count that holds and the first that does not, with how many runs held at each end. p95 is shown but not used: rAF deltas come in whole vsyncs (17 / 33 / 50 ms), so p95 flips on a single frame. For the Worker variant, fps is the Worker\'s. The CPU renderers\' raster and compositing run in software here, so absolute fps is pessimistic; use the crossover points relative to each other.', '');
    for (const thr of [1, 4]) {
      const ns = [...new Set(Object.values(R.sweep).filter((v) => v.cell.throttle === thr).map((v) => v.cell.n))].sort((a, b) => a - b);
      if (!ns.length) continue;
      const loads = Object.values(R.sweep).filter((v) => v.cell.throttle === thr).flatMap((v) => v.runs.map((r) => r.loadavg?.[0])).filter((x) => x != null).sort((a, b) => a - b);
      L.push(`### ${thr}× CPU${thr > 1 ? ' (main thread only; compositor, raster and GPU process unthrottled)' : ''}`, '', `1-minute load average during these runs: median ${f(loads[loads.length >> 1])}, range ${f(loads[0])}–${f(loads[loads.length - 1])} on ${R.meta?.cpus ?? '?'} CPUs.`, '', head(['variant', ...ns.map((n) => `N=${n}`), 'holds up to (bracket)']));
      for (const vname of ['dom', 'svg', 'canvas2d', 'canvas2d-worker']) {
        const sums = ns.map((n) => R.sweep[`${vname}|${n}|${thr}x`]?.summary);
        if (!sums.some((x) => x?.runs)) continue;
        const cells = sums.map((s) => (s?.runs ? `${f(s.fps)} · ${f(s.missedPct, 0)}% · ${f(s.frameP95, 0)}` : '—'));
        let last = null, fail = null;
        for (let i = 0; i < ns.length; i++) { const s = sums[i]; if (!s?.runs) continue; if (s.missedPct <= 10 && fail == null) last = i; else if (fail == null && s.missedPct > 10) fail = i; }
        const br = `${last == null ? `< ${ns[0]}` : `${ns[last]} (${sums[last].holdsRuns}/${sums[last].runs})`} – ${fail == null ? `> ${ns[ns.length - 1]}` : `${ns[fail]} (${sums[fail].holdsRuns}/${sums[fail].runs})`}`;
        L.push(row([vname, ...cells, br]));
      }
      L.push('');
      L.push(`GPU-process CPU % (software display compositor) and main-thread busy % at ${thr}×:`, '');
      L.push(head(['variant', ...ns.map((n) => `N=${n}`)]));
      for (const vname of ['dom', 'svg', 'canvas2d', 'canvas2d-worker']) {
        const sums = ns.map((n) => R.sweep[`${vname}|${n}|${thr}x`]?.summary);
        if (!sums.some((x) => x?.runs)) continue;
        L.push(row([vname, ...sums.map((s) => (s?.runs ? `GPU ${f(s.gpuCpu, 0)} · main ${f(s.busyPct, 0)}` : '—'))]));
      }
      L.push('');
    }
  }

  if (R.sweepLoad && R.sweep) {
    L.push('### The same 1× cells with the machine busier', '', R.sweepLoadMeta?.note ?? '', '');
    L.push(head(['variant', 'N', 'quiet sweep: fps · missed %', 'with burners: fps · missed %', 'load average (sweep / burners)']));
    for (const v of Object.values(R.sweepLoad)) {
      const q = R.sweep[`${v.cell.variant}|${v.cell.n}|1x`]?.summary; const b = v.summary;
      L.push(row([v.cell.variant, v.cell.n, q ? `${f(q.fps)} · ${f(q.missedPct, 0)}%` : '—', `${f(b.fps)} · ${f(b.missedPct, 0)}%`, `${f(q?.loadavg1)} / ${f(b.loadavg1)}`]));
    }
    L.push('');
  }
  if (R.instancing) {
    L.push('## One mesh per item vs one InstancedMesh, vanilla three.js vs React Three Fiber', '');
    L.push('Measured as one set (its own round-robin groups), so compare within this table. `JS ms/frame` is the GPU-independent column: the scene\'s update + render call on the main thread.', '');
    L.push(head(['variant', 'N', 'CPU', 'first frame ms', 'fps', 'JS ms/frame p50/p95', 'draw calls', 'heap MB', 'drag move→frame p50/p95', 'app+runtime gzip KB', 'runs']));
    for (const v of Object.values(R.instancing)) {
      const s = v.summary;
      L.push(row([v.cell.variant, v.cell.n, `${v.cell.throttle}×`, f(s.ttff, 0), f(s.fps), `${f(s.jsMs, 2)} / ${f(s.jsP95, 2)}`, f(s.drawCalls, 0), f(s.heapMB), `${f(s.moveToFrame)} / ${f(s.moveToFrameP95)}`, kb(R.build?.[v.cell.variant]?.total.gzip), s.runs]));
    }
    if (R.instancingNoWebgl) {
      L.push('', 'WebGL disabled: ' + Object.entries(R.instancingNoWebgl).map(([k, v]) => `**${k}** renderer ${v.renderer ?? 'none'}, poster visible ${v.posterVisible ? 'yes' : 'no'}, canvases ${v.canvases}${v.errors?.length ? `, error "${v.errors[0].slice(0, 90)}"` : ''}`).join('; ') + '.');
    }
    L.push('');
  }

  if (R.worker) {
    L.push('## Main thread under load (50 ms busy every 100 ms): Canvas 2D on the main thread vs in a Worker (1× only)', '');
    L.push(head(['variant', 'N', 'CPU', 'scene fps', 'missed vsyncs %', 'scene frame p95', 'main-thread fps', 'drag move→frame p50/p95 ms', 'move event delay p50/p95 ms', 'busy %', 'runs']));
    for (const v of Object.values(R.worker).sort((a, b) => a.cell.n - b.cell.n)) {
      const s = v.summary;
      L.push(row([v.cell.variant, v.cell.n, `${v.cell.throttle}×`, f(s.fps), f(s.missedPct, 0), f(s.frameP95), f(s.mainFps ?? s.fps), `${f(s.moveToFrame)} / ${f(s.moveToFrameP95)}`, `${f(s.moveDelay)} / ${f(s.moveDelayP95)}`, f(s.busyPct, 0), s.runs]));
    }
    L.push('', 'For the Worker variant, "scene fps" is the Worker\'s own rAF cadence and move→frame is measured in the Worker (event timestamp → the Worker finished drawing the frame that used it); "main-thread fps" is the page\'s rAF. Measured at 1× only, because CDP throttling does not slow the Worker.', '');
  }

  if (R.presented) {
    L.push('## Frames that reached the screen (compositor), with and without main-thread load', '', R.presented.note, '');
    L.push(head(['variant', 'N', 'no load: presented fps', 'no load: main busy %', 'load 50/100 ms: presented fps']));
    const seen = new Set();
    for (const c of Object.values(R.presented.cells)) {
      const k = `${c.variant}|${c.n}`; if (seen.has(k)) continue; seen.add(k);
      L.push(row([c.variant, c.n, f(R.presented.cells[`${k}|load0`]?.fps), f(R.presented.cells[`${k}|load0`]?.busyPct), f(R.presented.cells[`${k}|load50`]?.fps)]));
    }
    L.push('');
  }

  if (R.domProbe) {
    L.push('## Compositor-driven CSS animations and the main thread (plain divs)', '', R.domProbe.note, '');
    L.push(head(['mode', 'N', 'style recalcs / s', 'ms each', 'style ms per s', 'main busy %', 'runs: style ms per s']));
    for (const c of Object.values(R.domProbe.cells)) L.push(row([c.mode, c.n, f(c.recalcsPerSec), f(c.msEach, 2), f(c.styleMsPerSec ?? c.recalcsPerSec * c.msEach, 0), f(c.busyPct), (c.runsStyleMsPerSec || []).map((x) => f(x, 0)).join(', ')]));
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
  if (R.a11y?.tapToPlace) {
    L.push('### Single-pointer alternative (tap to pick up, tap a spot to place; WCAG 2.5.7)', '');
    L.push(head(['variant', 'pass', 'landed vs target (px off)', 'counter', 'announced after 1st / 2nd tap']));
    for (const [k, t] of Object.entries(R.a11y.tapToPlace)) L.push(row([k, t.pass ? 'yes' : 'NO', `${t.landed.join(',')} vs ${t.target.x},${t.target.y} (${t.offPx})`, t.counter, `"${t.afterFirstTap}" / "${t.afterSecondTap}"`]));
    L.push('');
  }
  if (R.a11y?.overlaySync) {
    L.push('### Is the keyboard control still over the object after a mouse drag?', '');
    L.push(head(['variant', 'result', 'object after drag', 'control centre', 'drift px']));
    for (const [k, t] of Object.entries(R.a11y.overlaySync)) L.push(row([k, t.native ? t.pass : t.pass ? 'yes' : 'NO', t.object?.join(',') ?? '—', t.control?.join(',') ?? '—', f(t.driftPx)]));
    L.push('');
  }
  if (R.a11y?.focusRing) {
    L.push('### Where the focus ring is drawn (`shots/focus-ring.jpg`)', '');
    L.push(head(['variant', 'pass', 'focused element box', 'ring box', 'drawn by', 'ring centre off object px']));
    for (const [k, t] of Object.entries(R.a11y.focusRing)) L.push(row([k, t.pass ? 'yes' : 'NO', t.elementBox, t.indicatorBox, t.drawnBy, t.indicatorOffPx]));
    L.push('', 'In SVG, a `<use>` of a `<symbol>` whose viewBox crops a sprite atlas reports the whole atlas strip as its box, so a CSS outline (and anything else that reads the element box) frames the wrong area; the keyboard build draws an explicit ring shape instead.', '');
    if (R.a11y.firstTab) L.push('First Tab into the stage: ' + Object.entries(R.a11y.firstTab).map(([k, t]) => `**${k}** → ${t.firstFocus} (${t.pass ? 'ok' : 'wrong stop'})`).join('; ') + '. In Chromium an SVG element with a focus/focusin listener becomes a Tab stop, so the listener belongs on an HTML ancestor.', '');
  }
  const perfCols = ['variant', 'N', 'CPU', 'first frame ms', 'fps', 'missed %', 'JS ms/frame', 'renderer ms/frame', 'busy %', 'drag: move→frame p50/p95', 'drag: style+layout ms per move', 'drag: main ms per move', 'DOM nodes', 'heap MB', 'app gzip KB', 'runs'];
  const perfRow = (v) => { const s = v.summary; return row([v.cell.label ?? v.cell.variant, v.cell.n, `${v.cell.throttle}×`, f(s.ttff, 0), f(s.fps), f(s.missedPct, 0), f(s.jsMs, 2), f(s.rendererMsPerFrame), f(s.busyPct, 0), `${f(s.moveToFrame)} / ${f(s.moveToFrameP95)}`, f(s.dragStyleLayoutMsPerMove, 2), f(s.dragMainMsPerMove), f(s.domNodes, 0), f(s.heapMB), kb(R.build?.[v.cell.variant]?.app.gzip), s.runs]); };
  if (R.a11yPerf) {
    L.push('### Cost of the keyboard/screen-reader layer: DOM and SVG (1× CPU)', '');
    L.push(head(perfCols));
    for (const v of Object.values(R.a11yPerf)) L.push(perfRow(v));
    L.push('');
  }
  if (R.a11yPerfWebgl) {
    L.push('### Cost of the keyboard/screen-reader layer: PixiJS on WebGL (SwiftShader; read JS and renderer ms/frame only)', '');
    L.push('PixiJS\'s built-in AccessibilitySystem registers only for the WebGL and WebGPU renderers, so its cost can only be measured here. Frame rate, busy % and drag latency are SwiftShader-bound and say nothing about the layer.', '');
    L.push(head(perfCols));
    for (const v of Object.values(R.a11yPerfWebgl)) L.push(perfRow(v));
    L.push('');
  }
  if (R.a11yPerfCanvas) {
    L.push('### Cost of the keyboard/screen-reader layer: PixiJS on its Canvas 2D renderer (WebGL disabled)', '');
    L.push('WebGL is disabled so PixiJS runs on its own Canvas 2D renderer at a measurable frame rate (under SwiftShader it ran at 2–3 fps, where frame time, busy % and drag latency cannot show a small cost). `?nosync` = the keyboard build without the per-move overlay sync (the earlier bug); `?lefttop` = the sync writing left/top instead of transform. `pixi-pixia11y` is inert here: PixiJS registers its AccessibilitySystem only for WebGL and WebGPU, so on its Canvas fallback no accessibility DOM exists (compare DOM nodes). "drag: style+layout ms per move" is main-thread style recalc + layout time while the pointer is down, divided by the 30 moves.', '');
    L.push(head(perfCols));
    for (const v of Object.values(R.a11yPerfCanvas).sort((a, b) => a.cell.throttle - b.cell.throttle || a.cell.n - b.cell.n)) L.push(perfRow(v));
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

  if (R.nowebglPerf) {
    L.push('### Engines on their Canvas 2D fallback vs vanilla Canvas 2D (WebGL disabled, 1× CPU)', '');
    L.push(head(['variant', 'N', 'renderer', 'fps', 'frame p95', 'JS ms/frame p50/p95', 'renderer ms/frame', 'busy %', 'drag move→frame p50/p95', 'heap MB', 'runs']));
    for (const v of Object.values(R.nowebglPerf)) {
      const s = v.summary;
      L.push(row([v.cell.variant, v.cell.n, s.renderer, f(s.fps), f(s.frameP95), `${f(s.jsMs, 2)} / ${f(s.jsP95, 2)}`, f(s.rendererMsPerFrame), f(s.busyPct, 0), `${f(s.moveToFrame)} / ${f(s.moveToFrameP95)}`, f(s.heapMB), s.runs]));
    }
    L.push('');
  }

  if (R.shots) {
    L.push('## Visual parity', '', R.shots.note, '');
    L.push(head(['variant', 'N=200 % px differ', 'N=2000 % px differ']));
    const vs = [...new Set(Object.keys(R.shots.diffs).map((k) => k.split('|')[0]))];
    for (const v of vs) L.push(row([v, f(R.shots.diffs[`${v}|200`], 2), f(R.shots.diffs[`${v}|2000`], 2)]));
    L.push('', 'Sheets: `shots/scene-n200.jpg`, `shots/scene-n2000.jpg`, `shots/no-webgl.jpg`, `shots/context-loss.jpg`.', '');
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
