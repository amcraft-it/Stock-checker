// ══════════════════════════════════════════
// Stock Checker — app.js
// Hosted on GitHub Pages
// Uses google.script.run (runs inside Apps Script HtmlService)
// ══════════════════════════════════════════

var allOn = false;

// ── Helpers ──
function $(id) { return document.getElementById(id); }

function esc(s) {
  if (!s) return '';
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function fmtDate(d) {
  if (!d) return '';
  try {
    var dt = new Date(d);
    if (isNaN(dt)) return esc(d);
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) {
    return esc(d);
  }
}

// ── Init ──
window.addEventListener('DOMContentLoaded', function () {
  loadLocations();
  ['fItemCode', 'fItemName', 'fBatchNr'].forEach(function (id) {
    $(id).addEventListener('keydown', function (e) {
      if (e.key === 'Enter') doSearch();
    });
  });
});

// ── Load locations ──
function loadLocations() {
  google.script.run
    .withSuccessHandler(renderChips)
    .withFailureHandler(function () {
      $('locGrid').innerHTML = '<span class="loc-msg" style="color:var(--red)">Failed to load locations</span>';
    })
    .getAllLocations();
}

function renderChips(locs) {
  var g = $('locGrid');
  g.innerHTML = '';
  locs.forEach(function (loc) {
    var c = document.createElement('div');
    c.className = 'chip';
    c.dataset.code = loc.code;
    c.innerHTML =
      '<input type="checkbox" value="' + loc.code + '">' +
      '<span class="dot"></span>' +
      '<span>' + esc(loc.name) + '</span>';

    c.addEventListener('click', function () {
      var cb = c.querySelector('input');
      cb.checked = !cb.checked;
      c.classList.toggle('on', cb.checked);
      syncToggle();
    });

    g.appendChild(c);
  });
}

function toggleAll() {
  allOn = !allOn;
  var chips = document.querySelectorAll('.chip');
  for (var i = 0; i < chips.length; i++) {
    chips[i].querySelector('input').checked = allOn;
    chips[i].classList.toggle('on', allOn);
  }
  syncToggle();
}

function syncToggle() {
  var total = document.querySelectorAll('.chip input').length;
  var checked = document.querySelectorAll('.chip input:checked').length;
  allOn = total > 0 && checked === total;
  $('btnToggle').textContent = allOn ? 'Deselect all' : 'Select all';
}

function selectedLocs() {
  var cbs = document.querySelectorAll('.chip input:checked');
  var arr = [];
  for (var i = 0; i < cbs.length; i++) arr.push(cbs[i].value);
  return arr;
}

// ── Search ──
function doSearch() {
  var code = $('fItemCode').value.trim();
  var name = $('fItemName').value.trim();
  var batch = $('fBatchNr').value.trim();
  var locs = selectedLocs();

  if (!code && !name && !batch) {
    showMsg('Please fill at least one search field.', 'err');
    return;
  }
  if (locs.length === 0) {
    showMsg('Please select at least one location.', 'err');
    return;
  }

  hideMsg();
  hideResults();
  hideEmpty();
  $('loader').style.display = 'flex';
  $('btnSearch').disabled = true;

  google.script.run
    .withSuccessHandler(onSearchDone)
    .withFailureHandler(onSearchFail)
    .searchStock(code, name, locs, batch);
}

function onSearchDone(res) {
  $('loader').style.display = 'none';
  $('btnSearch').disabled = false;

  if (!res.success) {
    showMsg(res.error, 'err');
    return;
  }
  if (!res.data || res.data.length === 0) {
    showEmpty();
    return;
  }
  renderTable(res.data);
}

function onSearchFail(err) {
  $('loader').style.display = 'none';
  $('btnSearch').disabled = false;
  showMsg('Error: ' + err.message, 'err');
}

// ── Render table ──
function renderTable(data) {
  var tb = $('rBody');
  tb.innerHTML = '';

  data.forEach(function (r) {
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td class="mono">' + esc(r.itemcode) + '</td>' +
      '<td>' + esc(r.itemname) + '</td>' +
      '<td class="qty">' + esc(String(r.quantity || 0)) + '</td>' +
      '<td>' + esc(r.unit) + '</td>' +
      '<td>' + esc(r.group) + '</td>' +
      '<td><span class="badge">' + esc(r.location) + '</span></td>' +
      '<td class="date">' + fmtDate(r.bestbefore) + '</td>' +
      '<td class="mono">' + esc(r.batchnr) + '</td>';
    tb.appendChild(tr);
  });

  $('rCount').innerHTML = 'Found <em>' + data.length + '</em> item' + (data.length === 1 ? '' : 's');
  $('results').style.display = 'block';
}

// ── UI helpers ──
function showMsg(t, cls) {
  var m = $('msg');
  m.textContent = t;
  m.className = 'msg ' + cls;
}
function hideMsg() {
  var m = $('msg');
  m.className = 'msg';
  m.style.display = 'none';
}
function hideResults() { $('results').style.display = 'none'; }
function showEmpty() { $('empty').style.display = 'block'; }
function hideEmpty() { $('empty').style.display = 'none'; }

function clearForm() {
  $('fItemCode').value = '';
  $('fItemName').value = '';
  $('fBatchNr').value = '';
  var chips = document.querySelectorAll('.chip');
  for (var i = 0; i < chips.length; i++) {
    chips[i].querySelector('input').checked = false;
    chips[i].classList.remove('on');
  }
  allOn = false;
  syncToggle();
  hideMsg();
  hideResults();
  hideEmpty();
}
