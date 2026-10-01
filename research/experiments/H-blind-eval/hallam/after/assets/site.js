window.hpTrack = window.hpTrack || function (e, p) { (window.hpEvents = window.hpEvents || []).push([e, p || {}]); };
document.addEventListener('click', function (e) { var a = e.target.closest('a[href^="tel:"]'); if (a) hpTrack('phone_click'); });

// The analytics contract above is unchanged from 2014: hpTrack(event, props) queues into window.hpEvents,
// and every tel: link reports phone_click. Each page also defines the same queue in its <head>, so the
// page's own calls (fees_view, enquiry_start) work before this file loads.

(function () {
  var root = document.documentElement;
  root.classList.add('js');

  // Phone menu: a disclosure button that shows the nav list; Escape closes it and returns focus.
  var btn = document.querySelector('.menu-btn');
  var list = btn && document.getElementById(btn.getAttribute('aria-controls'));
  if (btn && list) {
    var close = function (focus) {
      btn.setAttribute('aria-expanded', 'false');
      root.classList.remove('menu-open');
      if (focus) btn.focus();
    };
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      root.classList.toggle('menu-open', open);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') close(true);
    });
    list.addEventListener('click', function (e) { if (e.target.closest('a')) close(false); });
    document.addEventListener('click', function (e) {
      if (btn.getAttribute('aria-expanded') === 'true' && !e.target.closest('.site-nav') && !e.target.closest('.menu-btn')) close(false);
    });
    matchMedia('(min-width: 64em)').addEventListener('change', function () { close(false); });
  }

  // One primary action per view: the header's Call button stays quiet while a page's own primary action
  // is on screen, and takes the primary style once it has scrolled away (or on pages without one).
  var header = document.querySelector('.site-header');
  var primaries = document.querySelectorAll('[data-primary-cta]');
  if (header) {
    var seen = new Set();
    var setState = function () { header.classList.toggle('call-primary', seen.size === 0); };
    if ('IntersectionObserver' in window && primaries.length) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) seen.add(en.target); else seen.delete(en.target); });
        setState();
      }, { rootMargin: '-64px 0px 0px 0px' });
      primaries.forEach(function (p) { io.observe(p); });
    } else {
      setState();
    }
    // The sticky header gains its rule only once the page has scrolled.
    var sentinel = document.createElement('div');
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.className = 'scroll-sentinel';
    document.body.prepend(sentinel);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { header.classList.toggle('is-scrolled', !en[0].isIntersecting); }).observe(sentinel);
    }
  }
})();
