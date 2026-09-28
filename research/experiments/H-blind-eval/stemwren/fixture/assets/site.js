window.swTrack = window.swTrack || function (event, props) { (window.swEvents = window.swEvents || []).push([event, props || {}]); };
(function () {
  var t = document.querySelectorAll('.testimonial'); if (!t.length) return; var i = 0;
  setInterval(function () { t[i].classList.remove('active'); i = (i + 1) % t.length; t[i].classList.add('active'); }, 4000);
})();
