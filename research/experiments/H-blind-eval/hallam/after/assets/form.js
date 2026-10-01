// The enquiry form: GOV.UK-style validation on submit, then live as each answer is fixed; an error summary
// for three or more errors, otherwise focus on the first problem; answers carried in from the fee finder.
// What the CRM receives is unchanged: the same ten fields, names, order and values, by a native POST.
(function () {
  var form = document.getElementById('enquiry');
  if (!form) return;
  form.noValidate = true;

  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var RULES = {
    name: { empty: 'Enter your name' },
    email: { empty: 'Enter your email address', test: function (v) { return EMAIL.test(v.trim()); }, bad: 'Enter an email address in the correct format, like name@example.com' },
    phone: { empty: 'Enter your phone number', test: function (v) { return v.replace(/\D/g, '').length >= 10; }, bad: 'Enter a phone number with at least 10 digits, like 07700 900982' },
    business_name: { optional: true },
    business_type: { empty: 'Select which of these describes you' },
    turnover: { empty: 'Select your annual turnover' },
    service: { empty: 'Select the service you need' },
    message: { empty: 'Tell us how we can help' },
    preferred_contact: { empty: 'Select how you’d like us to reply' },
    how_heard: { empty: 'Select how you heard about us' }
  };
  var ORDER = Object.keys(RULES);
  var title = document.title;
  var tried = false;
  var summary = document.getElementById('error-summary');

  function controls(name) {
    var el = form.elements[name];
    return el && el.length && !el.tagName ? Array.prototype.slice.call(el) : [el];
  }
  function value(name) {
    var el = form.elements[name];
    return (el && el.value) || '';
  }
  function check(name) {
    var r = RULES[name], v = value(name);
    if (r.optional && !v.trim()) return '';
    if (!v.trim()) return r.empty;
    if (r.test && !r.test(v)) return r.bad;
    return '';
  }
  function show(name, msg) {
    var q = form.querySelector('[data-q="' + name + '"]');
    if (!q) return;
    var id = 'f-' + name + '-error';
    var old = document.getElementById(id);
    var ctrls = controls(name);
    if (msg) {
      if (!old) {
        old = document.createElement('p');
        old.className = 'error-message';
        old.id = id;
        var anchor = q.querySelector('.hint') || q.querySelector('legend') || q.querySelector('label');
        if (anchor.tagName === 'LEGEND') anchor.insertAdjacentElement('afterend', old);
        else anchor.insertAdjacentElement('afterend', old);
      }
      old.innerHTML = '<span class="vh">Error:</span> ' + msg;
      q.classList.add('has-error');
      ctrls.forEach(function (c) {
        c.setAttribute('aria-invalid', 'true');
        var d = (c.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
        if (d.indexOf(id) < 0) d.push(id);
        c.setAttribute('aria-describedby', d.join(' '));
      });
    } else {
      if (old) old.remove();
      q.classList.remove('has-error');
      ctrls.forEach(function (c) {
        c.removeAttribute('aria-invalid');
        var d = (c.getAttribute('aria-describedby') || '').split(' ').filter(function (x) { return x && x !== id; });
        if (d.length) c.setAttribute('aria-describedby', d.join(' ')); else c.removeAttribute('aria-describedby');
      });
    }
  }
  function renderSummary(errors, keepOpen) {
    var list = summary.querySelector('ul');
    list.innerHTML = '';
    errors.forEach(function (e) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = '#f-' + e.name;
      a.textContent = e.msg;
      li.appendChild(a);
      list.appendChild(li);
    });
    summary.hidden = keepOpen ? errors.length === 0 : errors.length < 3;
  }
  function validate() {
    var errors = [];
    ORDER.forEach(function (n) { var m = check(n); show(n, m); if (m) errors.push({ name: n, msg: m }); });
    return errors;
  }

  summary.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#f-"]');
    if (!a) return;
    var target = document.getElementById(a.getAttribute('href').slice(1));
    if (!target) return;
    e.preventDefault();
    var q = target.closest('.q');
    (q || target).scrollIntoView({ block: 'start' });
    target.focus({ preventScroll: true });
  });

  form.addEventListener('submit', function (e) {
    tried = true;
    var errors = validate();
    if (errors.length) {
      e.preventDefault();
      document.title = 'Error: ' + title;
      renderSummary(errors);
      if (errors.length >= 3) summary.focus();
      else document.getElementById('f-' + errors[0].name).focus();
      return;
    }
    document.title = title;
    hpTrack('enquiry_submit');
  });

  // After the first attempt, each answer is re-checked as it is fixed.
  function live(e) {
    if (!tried || !e.target.name || !RULES[e.target.name]) return;
    show(e.target.name, check(e.target.name));
    var remaining = ORDER.map(function (n) { var m = check(n); return m ? { name: n, msg: m } : null; }).filter(Boolean);
    if (!summary.hidden) renderSummary(remaining, true);
    if (!remaining.length) { summary.hidden = true; document.title = title; }
  }
  form.addEventListener('input', live);
  form.addEventListener('change', live);

  // Answers carried in from the fee finder (?business_type=…&turnover=…&service=…): only known option values.
  var q = new URLSearchParams(location.search);
  var filled = 0;
  ['business_type', 'turnover', 'service'].forEach(function (n) {
    var v = q.get(n);
    if (!v) return;
    var ok = controls(n).some(function (c) {
      if (c.type === 'radio') { if (c.value === v) { c.checked = true; return true; } return false; }
      if (c.tagName === 'SELECT') { for (var i = 0; i < c.options.length; i++) if (c.options[i].value === v && v) { c.value = v; return true; } }
      return false;
    });
    if (ok) filled++;
  });
  if (filled) document.getElementById('prefill-note').hidden = false;
})();
