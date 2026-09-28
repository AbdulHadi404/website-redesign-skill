window.hpTrack = window.hpTrack || function (e, p) { (window.hpEvents = window.hpEvents || []).push([e, p || {}]); };
document.addEventListener('click', function (e) { var a = e.target.closest('a[href^="tel:"]'); if (a) hpTrack('phone_click'); });
