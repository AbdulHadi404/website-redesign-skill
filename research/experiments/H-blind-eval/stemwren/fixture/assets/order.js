(function () {
  var form = document.getElementById('order');
  var flowers = [], wraps = {}, delivery = {};
  swTrack('order_start');
  Promise.all([fetch('../data/flowers.json').then(r => r.json()), fetch('../data/wraps.json').then(r => r.json()), fetch('../data/delivery.json').then(r => r.json())]).then(function (d) {
    flowers = d[0]; wraps = d[1]; delivery = d[2];
    var rows = document.getElementById('flower-rows');
    for (var n = 1; n <= 3; n++) {
      var html = '<div class="row2"><div class="field"><select name="flower' + n + '"><option value="">-- Flower ' + n + ' --</option>';
      flowers.forEach(function (f) { html += '<option value="' + f.id + '">' + f.name + '</option>'; });
      html += '</select></div><div class="field"><input name="colour' + n + '" placeholder="Colour"></div><div class="field"><input name="count' + n + '" placeholder="How many?"></div></div>';
      rows.insertAdjacentHTML('beforeend', html);
    }
    document.getElementById('wrap').innerHTML = wraps.wraps.map(w => '<option value="' + w.id + '">' + w.name + '</option>').join('');
    document.getElementById('ribbon').innerHTML = wraps.ribbons.map(w => '<option value="' + w.id + '">' + w.name + '</option>').join('');
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var fd = new FormData(form), stems = [], total = 0, missing = [];
    for (var n = 1; n <= 3; n++) {
      var id = fd.get('flower' + n); if (!id) continue;
      var f = flowers.find(x => x.id === id), c = parseInt(fd.get('count' + n) || '0', 10);
      stems.push({ id: id, colour: fd.get('colour' + n), count: c }); total += f.price * c;
    }
    ['size', 'delivery_date', 'delivery_postcode', 'recipient_name', 'recipient_address', 'sender_name', 'sender_email', 'sender_phone'].forEach(function (k) { if (!fd.get(k)) { missing.push(k); swTrack('order_error', { field: k }); } });
    if (!stems.length) { missing.push('stems'); swTrack('order_error', { field: 'stems' }); }
    if (missing.length) { alert('Please fill in all required fields!'); return; }
    var w = wraps.wraps.find(x => x.id === fd.get('wrap')), r = wraps.ribbons.find(x => x.id === fd.get('ribbon'));
    total += (w ? w.price : 0) + (r ? r.price : 0);
    var pc = String(fd.get('delivery_postcode')).toUpperCase().split(' ')[0];
    var zone = delivery.zones.find(z => z.districts.indexOf(pc) > -1);
    total += zone ? zone.price : 0;
    if (!confirm('Your total is £' + total.toFixed(2) + '. Place order?')) return;
    var body = { size: fd.get('size'), stems: stems, wrap: fd.get('wrap'), ribbon: fd.get('ribbon'), card_message: fd.get('card_message'), delivery_date: fd.get('delivery_date'), delivery_postcode: fd.get('delivery_postcode'), recipient_name: fd.get('recipient_name'), recipient_address: fd.get('recipient_address'), sender_name: fd.get('sender_name'), sender_email: fd.get('sender_email'), sender_phone: fd.get('sender_phone') };
    swTrack('order_submit');
    fetch('/api/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(r => r.json()).then(function (res) { swTrack('order_success', { order: res.order, total: res.total }); form.innerHTML = '<h2>Thank you! Order ' + res.order + '</h2>'; })
      .catch(function () { alert('Something went wrong'); });
  });
})();
