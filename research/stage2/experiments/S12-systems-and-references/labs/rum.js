/* Post-launch RUM snippet (S12 lab). Reports rage clicks, dead clicks, JS errors, Core Web
 * Vitals with attribution (needs web-vitals' attribution build loaded first as window.webVitals)
 * and task outcomes, to one endpoint with sendBeacon. No personal data: selectors, not text.
 *   window.rum.task('checkout', 'start' | 'success' | 'fail', { reason })
 * Rage click: ≥ 3 clicks within 1 s within 30 px, not ending in a text selection.
 * Dead click: a click on something that looks interactive that causes no DOM change,
 * navigation or focus change within 1 s. */
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
    if (navigator.sendBeacon) navigator.sendBeacon(ENDPOINT, body);
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
  function looksInteractive(el) {
    var t = el.closest('a,button,input,select,textarea,summary,label,[role=button],[role=link],[role=tab],[role=menuitem],[onclick],[tabindex]');
    if (t) return t;
    return getComputedStyle(el).cursor === 'pointer' ? el : null;
  }

  var clicks = [];
  var mutated = 0;
  new MutationObserver(function () { mutated++; }).observe(document, { subtree: true, childList: true, attributes: true, characterData: true });
  addEventListener('click', function (ev) {
    var now = performance.now();
    clicks = clicks.filter(function (c) { return now - c.t < 1000; });
    clicks.push({ t: now, x: ev.clientX, y: ev.clientY, el: ev.target });
    var near = clicks.filter(function (c) { return Math.hypot(c.x - ev.clientX, c.y - ev.clientY) < 30; });
    if (near.length === 3) {
      // A triple-click that selects a paragraph is a gesture, not frustration.
      setTimeout(function () {
        var selected = String(getSelection() || '').trim().length > 0;
        if (!selected) send('rage_click', { target: sel(ev.target), n: near.length });
        else send('triple_click_select', { target: sel(ev.target) });
      }, 0);
    }
    var it = looksInteractive(ev.target);
    if (it && !it.disabled) {
      var m0 = mutated, href = location.href, f0 = document.activeElement;
      setTimeout(function () {
        if (mutated === m0 && location.href === href && document.activeElement === f0) send('dead_click', { target: sel(it) });
      }, 1000);
    }
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
