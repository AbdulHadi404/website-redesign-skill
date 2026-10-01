// Analytics contract (README): window.swTrack(event, props). Kept exactly; the shop's real tracker replaces the stub.
window.swTrack = window.swTrack || function (event, props) { (window.swEvents = window.swEvents || []).push([event, props || {}]); };

(function () {
  // Phone menu: a disclosure button, not a menu role.
  var btn = document.querySelector('.menu-button');
  var nav = document.getElementById('site-nav');
  if (btn && nav) {
    var mq = window.matchMedia('(max-width: 760px)');
    var set = function (open) { btn.setAttribute('aria-expanded', String(open)); nav.classList.toggle('is-open', open); };
    set(false);
    btn.addEventListener('click', function () { set(btn.getAttribute('aria-expanded') !== 'true'); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a') && mq.matches) set(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { set(false); btn.focus(); } });
    mq.addEventListener('change', function () { set(false); });
  }
  // One primary action per view: the header's button stays quiet while the hero's is on screen.
  var header = document.querySelector('.site-header');
  var cta = document.querySelector('.header-cta');
  var hero = document.querySelector('.hero-cta');
  if (header && cta && hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { cta.classList.toggle('is-quiet', es[0].isIntersecting); }).observe(hero);
  }
  if (header) {
    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 4); };
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }
})();
