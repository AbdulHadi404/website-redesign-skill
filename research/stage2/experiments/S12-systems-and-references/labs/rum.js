/* Post-launch RUM snippet (S12 lab, second round after review). Reports rage clicks, dead clicks,
 * JS errors, Core Web Vitals with attribution (needs web-vitals' attribution build loaded first as
 * window.webVitals) and task outcomes, to one endpoint with sendBeacon. No personal data: selectors, not text.
 *   window.rum.task('checkout', 'start' | 'success' | 'fail', { reason })
 *
 * Rage click: the posthog-js rule (packages/browser/src/extensions/rageclick.ts): each click lands within
 *   30 px (Manhattan) of the previous one and < 1000 ms after it; the 3rd click of such a run is one rage
 *   click. Difference, stated: a run whose last click leaves a text selection (triple-click to select a
 *   paragraph) is logged as triple_click_select instead. (PostHog's opt-in ignore_text_selection skips text
 *   fields instead.) Text fields are skipped here too: repeated clicks there move the caret.
 * Dead click: a click on something that looks interactive, followed by no response. Responses, as in
 *   posthog-js dead-clicks-autocapture: a DOM mutation < 2500 ms, a scroll < 100 ms, a selection change
 *   < 100 ms; plus an input/change event < 100 ms, a navigation or hash change, or a new window.
 *   Never judged (they respond without a DOM mutation): input, textarea, select, contenteditable, a label
 *   that belongs to a control, a[href] (PostHog skips anchors too), media and canvas (unobservable).
 *   Focus moving to the clicked control is NOT a response (the browser does it for any button).
 *   A mutation caused by a later click still masks an earlier dead click (PostHog has the same limit).
 */
(function () {
  var ENDPOINT = window.RUM_ENDPOINT || '/rum';
  var q = [];
  function send(type, data) {
    var e = Object.assign({ type: type, t: Math.round(performance.now()), path: location.pathname, release: window.RUM_RELEASE || '' }, data || {});
    q.push(e);
    (window.rumLog = window.rumLog || []).push(e);
  }
  function flush() {
    if (!q.length) return;
    var body = JSON.stringify(q); q = [];
    try { if (navigator.sendBeacon) navigator.sendBeacon(ENDPOINT, body); } catch (err) { /* e.g. file:// */ }
  }
  addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(); });
  addEventListener('pagehide', flush);

  function sel(el) {
    if (!el || el.nodeType !== 1) return '';
    if (el.id) return '#' + el.id;
    var s = el.tagName.toLowerCase();
    var c = (el.getAttribute('class') || '').trim().split(/\s+/)[0];
    if (c) s += '.' + c;
    var p = el.parentElement;
    return p && p !== document.body ? sel(p) + ' > ' + s : s;
  }
  function isTextEntry(el) {
    return !!el && el.nodeType === 1 && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
  }
  function notJudged(el) {
    if (!el || el.nodeType !== 1) return true;
    if (el.closest('input,textarea,select,[contenteditable=""],[contenteditable="true"],a[href],video,audio,canvas,embed,object,iframe')) return true;
    if (el.isContentEditable) return true;
    var lab = el.closest('label');
    if (lab && lab.control) return true;
    return false;
  }
  function looksInteractive(el) {
    var t = el.closest('button,summary,[role=button],[role=link],[role=tab],[role=menuitem],[role=checkbox],[role=switch],[onclick]');
    if (t) return t;
    return getComputedStyle(el).cursor === 'pointer' ? el : null;
  }

  // responses: each pending dead-click candidate is marked answered by the first response inside its window
  var pending = [], lastSelection = -1e9, hadRange = false;
  function answer(windowMs) { var now = performance.now(); pending.forEach(function (c) { if (now - c.t0 < windowMs) c.answered = true; }); }
  new MutationObserver(function () { answer(2500); }).observe(document, { subtree: true, childList: true, attributes: true, characterData: true });
  addEventListener('scroll', function () { answer(100); }, true);
  // A click on plain text moves an invisible caret; like PostHog, only a range selection (made or cleared)
  // or a caret inside an editable field counts as a response.
  document.addEventListener('selectionchange', function () {
    var s = getSelection(), isRange = !!s && s.type === 'Range';
    var editing = isTextEntry(document.activeElement);
    var counts = isRange || hadRange || editing;
    hadRange = isRange;
    if (!counts) return;
    lastSelection = performance.now(); answer(100);
  });
  addEventListener('input', function () { answer(100); }, true);
  addEventListener('change', function () { answer(100); }, true);

  var run = [];           // rage-click run (PostHog rule)
  var seen = [];          // dead-click candidates already queued: same element within 1 s counts once
  addEventListener('click', function (ev) {
    var now = performance.now();
    if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return; // open in new tab etc.: intentional
    var target = ev.target;

    // ---- rage click
    if (!isTextEntry(target)) {
      var last = run[run.length - 1];
      if (last && Math.abs(ev.clientX - last.x) + Math.abs(ev.clientY - last.y) < 30 && now - last.t < 1000) {
        run.push({ x: ev.clientX, y: ev.clientY, t: now });
        if (run.length === 3) {
          var runTarget = target;
          setTimeout(function () {
            var selected = String(getSelection() || '').trim().length > 0;
            send(selected ? 'triple_click_select' : 'rage_click', { target: sel(runTarget) });
          }, 0);
        }
      } else run = [{ x: ev.clientX, y: ev.clientY, t: now }];
    }

    // ---- dead click
    if (notJudged(target)) return;
    var it = looksInteractive(target);
    if (!it || it.disabled || it.getAttribute('aria-disabled') === 'true') return;
    seen = seen.filter(function (s) { return now - s.t < 1000; });
    if (seen.some(function (s) { return s.el === it; })) return;
    seen.push({ el: it, t: now });
    var c = { t0: now, href: location.href, answered: now - lastSelection < 100 };
    pending.push(c);
    setTimeout(function () {
      pending.splice(pending.indexOf(c), 1);
      if (!c.answered && location.href === c.href && document.visibilityState !== 'hidden') send('dead_click', { target: sel(it) });
    }, 2500);
  }, true);

  addEventListener('error', function (e) { send('js_error', { message: String(e.message).slice(0, 200), source: (e.filename || '').split('/').pop(), line: e.lineno }); });
  addEventListener('unhandledrejection', function (e) { send('js_error', { message: String(e.reason && e.reason.message || e.reason).slice(0, 200), kind: 'promise' }); });

  var wv = window.webVitals;
  if (wv) {
    var report = function (m) {
      var a = m.attribution || {};
      send('web_vital', { name: m.name, value: Math.round(m.name === 'CLS' ? m.value * 1000 : m.value), rating: m.rating, target: a.interactionTarget || a.target || a.largestShiftTarget || '', delta: Math.round(m.delta) });
    };
    wv.onLCP(report); wv.onCLS(report); wv.onINP(report, { reportAllChanges: true });
  }
  window.rum = { task: function (name, outcome, extra) { send('task', Object.assign({ name: name, outcome: outcome }, extra || {})); }, flush: flush };
})();
