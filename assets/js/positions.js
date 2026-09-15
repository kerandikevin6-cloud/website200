/* ============================================================
   Nexas — positions
   Open contracts, settled history and the cash ledger, with
   filters, a detail sheet and CSV export.
   ============================================================ */
(function () {
  "use strict";

  var API, F, I;
  var view = 'open';
  var filter = { range: 'today', type: 'all' };
  var el = {};

  function within(ts) {
    var d = new Date(); d.setHours(0, 0, 0, 0);
    if (filter.range === 'today') return ts >= d.getTime();
    if (filter.range === '7d') return ts >= Date.now() - 7 * 864e5;
    if (filter.range === '30d') return ts >= Date.now() - 30 * 864e5;
    return true;
  }
  function typeOk(c) {
    if (filter.type === 'all') return true;
    if (filter.type === 'digits') return c.type === 'matches' || c.type === 'differs';
    if (filter.type === 'evenodd') return c.type === 'even_odd';
    return c.type === 'over' || c.type === 'under';
  }

  function rows() {
    if (view === 'open') return API.contracts.open();
    if (view === 'closed') {
      return API.contracts.closed().filter(function (c) { return within(c.exitTime || c.entryTime) && typeOk(c); });
    }
    return API.transactions.list().filter(function (t) { return within(t.t); });
  }

  /* The P&L header used to sit here. Removed on purpose: this page is
     for what is open and what settled, and a running total at the top
     turns every visit into a scoreboard check. The numbers are still on
     each row, where they belong to a trade rather than to a mood. */

  function labelRange() {
    return { today: 'today', '7d': 'last 7 days', '30d': 'last 30 days', all: 'all time' }[filter.range];
  }

  /* ---------- filters ---------- */
  function renderFilters() {
    if (view === 'open') { el.filters.innerHTML = ''; return; }
    var ranges = [['today', 'Today'], ['7d', '7 days'], ['30d', '30 days'], ['all', 'All']];
    var types = [['all', 'All types'], ['evenodd', 'Even / Odd'], ['digits', 'Matches / Differs'], ['overunder', 'Over / Under']];

    el.filters.innerHTML =
      '<div class="filters">' +
        '<div class="chipline">' + ranges.map(function (r) {
          return '<button class="fchip' + (filter.range === r[0] ? ' on' : '') + '" data-range="' + r[0] + '">' + r[1] + '</button>';
        }).join('') + '</div>' +
        (view === 'closed'
          ? '<select class="input sm" id="typeFilter" aria-label="Contract type">' + types.map(function (t) {
              return '<option value="' + t[0] + '"' + (filter.type === t[0] ? ' selected' : '') + '>' + t[1] + '</option>';
            }).join('') + '</select>'
          : '') +
        '<button class="btn-mini" id="exportBtn">' + I('down', 14) + 'CSV</button>' +
      '</div>';
  }

  /* ---------- list ---------- */
  function renderList() {
    var data = rows();
    if (!data.length) {
      el.list.innerHTML = '<div class="empty">' +
        I('book', 26) +
        '<b>Nothing here yet</b>' +
        '<span>' + (view === 'open' ? 'Contracts you take will appear here while they run.'
          : view === 'closed' ? 'No settled contracts in this period.'
          : 'No money movements in this period.') + '</span></div>';
      return;
    }

    if (view === 'transactions') {
      el.list.innerHTML = '<div class="list">' + data.map(function (t) {
        return '<div class="trow">' +
          '<span class="ico ' + (t.amount >= 0 ? 'pos' : 'neg') + '">' + I(t.amount >= 0 ? 'up' : 'down', 16) + '</span>' +
          '<span class="t"><b>' + t.kind + (t.ref ? ' · ' + t.ref : '') + '</b>' +
          '<span>' + F.dateTime(t.t) + '</span></span>' +
          '<span class="p"><span class="num ' + (t.amount >= 0 ? 'pos' : 'neg') + '">' + F.signed(t.amount) + '</span>' +
          '<span class="num sub">' + F.amount(t.balance) + '</span></span>' +
        '</div>';
      }).join('') + '</div>';
      return;
    }

    el.list.innerHTML = '<div class="list">' + data.map(function (c) {
      var live = c.status === 'open';
      var pl = live ? c.value - c.stake : c.profit;
      return '<button class="trow" data-detail="' + c.id + '">' +
        '<span class="ico ' + (live ? 'live' : pl >= 0 ? 'pos' : 'neg') + '">' +
          (live ? I('clock', 16) : I(pl >= 0 ? 'check' : 'close', 16)) + '</span>' +
        '<span class="t"><b>' + API.contracts.label(c) + '</b>' +
          '<span>' + c.symbolName.replace(' Index', '') + ' · ' + F.money(c.stake) +
          (live ? ' · ' + Math.max(0, c.ticks - c.elapsed) + ' ticks left' : ' · ' + F.clock(c.exitTime)) + '</span></span>' +
        '<span class="p"><span class="num ' + (pl >= 0 ? 'pos' : 'neg') + '">' + F.signed(pl) + '</span>' +
          '<span class="num sub">' + (live ? 'value ' + F.amount(c.value) : c.status) + '</span></span>' +
      '</button>';
    }).join('') + '</div>';
  }

  /* ---------- detail ---------- */
  function detail(id) {
    var c = API.contracts.get(id);
    if (!c) return;
    var live = c.status === 'open';
    var pl = live ? c.value - c.stake : c.profit;

    window.NexModals.detail = {
      steps: {
        main: {
          title: API.contracts.label(c),
          sub: c.symbolName,
          body: function () {
            return '<div class="modal-form">' +
              '<div class="detail-pl ' + (pl >= 0 ? 'pos' : 'neg') + '"><span class="label">' +
                (live ? 'Indicative' : 'Result') + '</span><b class="num">' + F.signedMoney(pl) + '</b></div>' +
              '<div class="totals">' +
                kv('Contract', API.contracts.label(c)) +
                kv('Stake', F.money(c.stake)) +
                kv('Payout if won', F.money(c.payout)) +
                kv('Duration', F.ticks(c.ticks)) +
                kv('Entry spot', F.price(c.entrySpot)) +
                kv('Entry time', F.dateTime(c.entryTime)) +
                (c.exitSpot != null ? kv('Exit spot', F.price(c.exitSpot)) : '') +
                (c.exitTime ? kv('Exit time', F.dateTime(c.exitTime)) : '') +
                kv('Reference', c.id) +
              '</div>' +
              (live
                ? '<button class="btn btn-fill" data-sell-modal="' + c.id + '">Sell for ' + F.money(c.value) + '</button>'
                : '') +
            '</div>';
          }
        }
      }
    };
    window.NexModal.open('detail');
  }
  function kv(k, v) { return '<div class="kv"><span>' + k + '</span><b>' + v + '</b></div>'; }

  /* ---------- export ---------- */
  function csv() {
    var data = rows(), head, lines;
    if (view === 'transactions') {
      head = ['time', 'kind', 'reference', 'amount', 'balance'];
      lines = data.map(function (t) {
        return [new Date(t.t).toISOString(), t.kind, t.ref, t.amount, t.balance];
      });
    } else {
      head = ['id', 'contract', 'symbol', 'stake', 'payout', 'ticks', 'entry', 'exit', 'status', 'profit', 'time'];
      lines = data.map(function (c) {
        return [c.id, API.contracts.label(c), c.symbolName, c.stake, c.payout, c.ticks,
          c.entrySpot, c.exitSpot == null ? '' : c.exitSpot, c.status, c.profit,
          new Date(c.entryTime).toISOString()];
      });
    }
    var text = [head].concat(lines).map(function (r) {
      return r.map(function (x) { return '"' + String(x).replace(/"/g, '""') + '"'; }).join(',');
    }).join('\n');

    /* the hosted preview sandbox blocks downloads; copy instead */
    if (window.NEXAS_BUNDLE) {
      if (navigator.clipboard) navigator.clipboard.writeText(text);
      window.NexToast('CSV copied to the clipboard (' + (data.length) + ' rows)');
      return;
    }
    try {
      var blob = new Blob([text], { type: 'text/csv' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'nexas-' + view + '-' + new Date().toISOString().slice(0, 10) + '.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.NexToast('CSV exported');
    } catch (e) {
      navigator.clipboard && navigator.clipboard.writeText(text);
      window.NexToast('Download blocked here — CSV copied to the clipboard');
    }
  }

  /* ---------- mount ---------- */
  function renderAll() { renderFilters(); renderList(); }

  function init() {
    API = window.NexAPI; F = window.NexFmt; I = window.NexIcon;
    var root = document.getElementById('positions');
    if (!root) return;

    el.filters = document.getElementById('posFilters');
    el.list = document.getElementById('posList');

    root.addEventListener('click', function (e) {
      var tab = e.target.closest('[data-posview]');
      if (tab) {
        view = tab.getAttribute('data-posview');
        tab.parentElement.querySelectorAll('[data-posview]').forEach(function (b) { b.classList.remove('active'); });
        tab.classList.add('active');
        renderAll();
        return;
      }
      var r = e.target.closest('[data-range]');
      if (r) { filter.range = r.getAttribute('data-range'); renderAll(); return; }
      var d = e.target.closest('[data-detail]');
      if (d) { detail(d.getAttribute('data-detail')); return; }
      if (e.target.closest('#exportBtn')) { csv(); return; }
    });
    root.addEventListener('change', function (e) {
      if (e.target.id === 'typeFilter') { filter.type = e.target.value; renderAll(); }
    });
    document.addEventListener('click', function (e) {
      var s = e.target.closest('[data-sell-modal]');
      if (!s) return;
      var res = API.contracts.sell(s.getAttribute('data-sell-modal'));
      window.NexModal.close();
      window.NexToast(res.ok ? 'Contract sold' : res.error);
    });

    if (window.__nexPosOff) window.__nexPosOff.forEach(function (f) { f(); });
    window.__nexPosOff = [];

    API.ready(function () {
      document.body.classList.remove('loading');
      renderAll();
      window.__nexPosOff.push(API.on('contracts', renderAll));
      window.__nexPosOff.push(API.on('balance', renderAll));
    });
  }

  window.NexPositions = { init: init };
})();
