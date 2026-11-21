/* ==========================================================
   Body Scent — shared script (product / order / admin pages)
   Each page is detected by the elements it contains.
   ========================================================== */

var APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbxzxP7dVtHu1wHV78Svs6d8xNHc35g-WTuca3wIYlOvjKEQg7NUY0Atb_WG9_LBEAZxsg/exec';

var SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTrc0tOlL1drpqCXSc5TTDk8zpE36I_7KNu0c1oomTcTOTpRpBfYEfVGqBW9l1igGZLfzbEvl3g38Ov/pub?gid=0&single=true&output=csv';

var MOODS = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'fresh', label: 'Fresh' },
  { key: 'sweet', label: 'Sweet' },
  { key: 'confident', label: 'Confident' },
  { key: 'romance', label: 'Romance' }
];

document.addEventListener('DOMContentLoaded', function () {
  if (document.getElementById('product-list')) initProductPage();
  if (document.getElementById('orderForm')) initOrderPage();
  if (document.getElementById('ordersTable')) initAdminPage();
});

/* ----------------------------------------------------------
   Helpers
   ---------------------------------------------------------- */
function moodLabel(key) {
  for (var i = 0; i < MOODS.length; i++) {
    if (MOODS[i].key === key) return MOODS[i].label;
  }
  return key;
}

function formatPrice(n) {
  return Number(n).toLocaleString('th-TH');
}

function isValidMood(key) {
  return MOODS.some(function (m) {
    return m.key === key;
  });
}

/* ----------------------------------------------------------
   1) product.html
   ---------------------------------------------------------- */
function initProductPage() {
  var filterBar = document.getElementById('filter-bar');
  var list = document.getElementById('product-list');
  var products = [];
  var currentMood = 'all';

  var params = new URLSearchParams(window.location.search);
  var moodParam = (params.get('mood') || '').toLowerCase();
  if (isValidMood(moodParam)) currentMood = moodParam;

  function renderFilters() {
    if (!filterBar) return;
    filterBar.innerHTML = '';
    MOODS.forEach(function (m) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'filter-btn' + (m.key === currentMood ? ' is-active' : '');
      btn.textContent = m.label;
      btn.addEventListener('click', function () {
        currentMood = m.key;
        renderFilters();
        renderProducts();
        // keep the URL in sync so the filtered view can be shared
        var url = new URL(window.location.href);
        if (m.key === 'all') url.searchParams.delete('mood');
        else url.searchParams.set('mood', m.key);
        window.history.replaceState(null, '', url.toString());
      });
      filterBar.appendChild(btn);
    });
  }

  function buildCard(p) {
    var itemLabel = p.size ? p.name + ' ' + p.size : p.name;
    var orderUrl =
      'order.html?item=' + encodeURIComponent(itemLabel) +
      '&price=' + encodeURIComponent(p.price);

    var card = document.createElement('article');
    card.className = 'product-card';

    // image
    var imgWrap = document.createElement('div');
    imgWrap.className = 'product-card__image';
    var img = document.createElement('img');
    img.src = p.image;
    img.alt = p.name;
    img.loading = 'lazy';
    imgWrap.appendChild(img);

    // body
    var body = document.createElement('div');
    body.className = 'product-card__body';

    var mood = document.createElement('div');
    mood.className = 'product-card__mood';
    var dot = document.createElement('span');
    dot.className = 'mood-dot mood-' + p.mood;
    mood.appendChild(dot);
    mood.appendChild(document.createTextNode(moodLabel(p.mood)));

    var name = document.createElement('h3');
    name.className = 'product-card__name';
    name.textContent = p.name;

    var meta = document.createElement('div');
    meta.className = 'product-card__meta';
    meta.textContent = p.size ? p.size : p.type === 'rollon' ? 'โรลออน' : '';

    // footer: price + order button
    var footer = document.createElement('div');
    footer.className = 'product-card__footer';

    var price = document.createElement('span');
    price.className = 'price';
    price.textContent = formatPrice(p.price);
    var unit = document.createElement('small');
    unit.textContent = 'บาท';
    price.appendChild(unit);

    var btn = document.createElement('a');
    btn.className = 'btn btn--small';
    btn.href = orderUrl;
    btn.textContent = 'สั่งซื้อ';

    footer.appendChild(price);
    footer.appendChild(btn);

    body.appendChild(mood);
    body.appendChild(name);
    body.appendChild(meta);
    body.appendChild(footer);

    card.appendChild(imgWrap);
    card.appendChild(body);
    return card;
  }

  function renderProducts() {
    list.innerHTML = '';
    var shown = products.filter(function (p) {
      return currentMood === 'all' || p.mood === currentMood;
    });
    if (shown.length === 0) {
      var empty = document.createElement('p');
      empty.className = 'text-center';
      empty.textContent = 'ไม่พบสินค้าในหมวดนี้';
      list.appendChild(empty);
      return;
    }
    shown.forEach(function (p) {
      list.appendChild(buildCard(p));
    });
  }

  renderFilters();

  fetch('products.json')
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      products = data;
      renderProducts();
    })
    .catch(function (err) {
      console.error(err);
      list.innerHTML = '';
      var msg = document.createElement('p');
      msg.className = 'text-center';
      msg.textContent = 'ไม่สามารถโหลดรายการสินค้าได้ กรุณาลองใหม่อีกครั้ง';
      list.appendChild(msg);
    });
}

/* ----------------------------------------------------------
   2) order.html
   ---------------------------------------------------------- */
function initOrderPage() {
  var form = document.getElementById('orderForm');
  var itemsEl = document.getElementById('items');
  var totalEl = document.getElementById('total');

  // Auto-fill item + price from the URL (both fields)
  var params = new URLSearchParams(window.location.search);
  var item = params.get('item');
  var price = params.get('price');
  if (item !== null && itemsEl) itemsEl.value = item;
  if (price !== null && totalEl) totalEl.value = price;

  var isSubmitting = false;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (isSubmitting) return; // prevent duplicate rows from double clicks
    isSubmitting = true;

    var payload = {
      customerName: document.getElementById('customerName').value.trim(),
      contact: document.getElementById('contact').value.trim(),
      items: document.getElementById('items').value.trim(),
      total: document.getElementById('total').value.trim(),
      note: document.getElementById('note').value.trim()
    };

    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    .then(() => { window.location.href = 'thankyou.html'; })
    .catch(error => {
      console.error(error);
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    })
    .finally(() => { isSubmitting = false; });
  });
}

/* ----------------------------------------------------------
   3) admin.html
   ---------------------------------------------------------- */

// Minimal CSV parser: handles quoted fields, escaped quotes (""),
// commas and line breaks inside quotes, CRLF/LF, and a leading BOM.
function parseCSV(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  var rows = [];
  var row = [];
  var field = '';
  var inQuotes = false;

  for (var i = 0; i < text.length; i++) {
    var c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }

  // last field / row (file may not end with a newline)
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function initAdminPage() {
  var tbody = document.querySelector('#ordersTable tbody');
  var COLS = 6;

  function showMessage(text) {
    tbody.innerHTML = '';
    var tr = document.createElement('tr');
    var td = document.createElement('td');
    td.colSpan = COLS;
    td.style.textAlign = 'center';
    td.textContent = text;
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  showMessage('กำลังโหลดข้อมูล...');

  fetch(SHEET_CSV_URL + '&t=' + Date.now())
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.text();
    })
    .then(function (text) {
      var rows = parseCSV(text);

      // drop the header row, and any fully blank rows
      var data = rows.slice(1).filter(function (r) {
        return r.some(function (cell) {
          return cell.trim() !== '';
        });
      });

      if (data.length === 0) {
        showMessage('ยังไม่มีคำสั่งซื้อ');
        return;
      }

      // rows are appended in time order, so reverse = newest first
      data.reverse();

      tbody.innerHTML = '';
      data.forEach(function (r) {
        var tr = document.createElement('tr');
        for (var i = 0; i < COLS; i++) {
          var td = document.createElement('td');
          td.textContent = r[i] !== undefined ? r[i] : ''; // textContent: no HTML injection
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      });
    })
    .catch(function (err) {
      console.error(err);
      showMessage('ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
    });
}
