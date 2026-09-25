/* ============================================================
   Novi, positions
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

  /* ---------- runs ----------
     An automated run is one trade to the person who started it, so it is
     listed as one: open while it runs, one row in the history when it
     ends. Its contracts are inside it, on the detail sheet. Contracts
     not in a run are listed on their own, as they always were. */
  function contractsOf(runId) {
    return API.contracts.all().filter(function (c) { return c.run === runId; });
  }
  function runSummary(r) {
    var cs = contractsOf(r.id);
    var settled = cs.filter(function (c) { return c.status !== 'open'; });
    var open = cs.filter(function (c) { return c.status === 'open'; })[0];
    var pnl = settled.reduce(function (a, c) { return a + (c.profit || 0); }, 0);
    return {
      run: r, contracts: cs,
      done: settled.length,
      wins: settled.filter(function (c) { return c.profit >= 0; }).length,
      losses: settled.filter(function (c) { return c.profit < 0; }).length,
      /* Settled P/L, plus what the open contract is worth right now. */
      pnl: Math.round((pnl + (open ? open.value - open.stake : 0)) * 100) / 100,
      live: r.status === 'running',
      at: r.endedAt || (settled[0] && settled[0].exitTime) || r.startedAt
    };
  }
  var REASON = {
    running: 'Running', take_profit: 'Target reached', stop_loss: 'Stop loss hit', stopped: 'Stopped',
    trade_limit: 'Trade limit'
  };

  function items() {
    if (view === 'transactions') return rows();
    var runs = API.runs ? API.runs.all() : [];
    var known = {};
    runs.forEach(function (r) { known[r.id] = true; });

    if (view === 'open') {
      var openRuns = runs.filter(function (r) { return r.status === 'running'; })
        .map(function (r) { return { kind: 'run', s: runSummary(r) }; });
      var loose = API.contracts.open().filter(function (c) { return !(c.run && known[c.run]); })
        .map(function (c) { return { kind: 'contract', c: c }; });
      return openRuns.concat(loose);
    }

    var closedRuns = runs.filter(function (r) { return r.status !== 'running'; })
      .map(runSummary)
      .filter(function (s) {
        return s.done && within(s.at) && s.contracts.some(typeOk);
      })
      .map(function (s) { return { kind: 'run', s: s, at: s.at }; });
    var single = rows().filter(function (c) { return !(c.run && known[c.run]); })
      .map(function (c) { return { kind: 'contract', c: c, at: c.exitTime || c.entryTime }; });
    return closedRuns.concat(single).sort(function (a, b) { return b.at - a.at; });
  }

  function runRow(s) {
    var r = s.run;
    var cls = s.live ? 'live' : s.pnl >= 0 ? 'pos' : 'neg';
    return '<button class="trow" data-run="' + r.id + '">' +
      '<span class="ico ' + cls + '">' +
        (s.live ? I('clock', 16) : I(s.pnl >= 0 ? 'check' : 'close', 16)) + '</span>' +
      '<span class="t"><b>Auto · ' + (r.label || r.side) + '</b>' +
        '<span>' + String(r.symbolName || r.symbol || '').replace(' Index', '') + ' · ' +
          s.done + (s.done === 1 ? ' trade' : ' trades') + ' · ' + s.wins + 'W/' + s.losses + 'L' +
          (s.live ? '' : ' · ' + F.clock(s.at)) + '</span></span>' +
      '<span class="p"><span class="num ' + (s.pnl >= 0 ? 'pos' : 'neg') + '">' + F.signed(s.pnl) + '</span>' +
        '<span class="num sub">' + (REASON[r.status] || r.status) + '</span></span>' +
    '</button>';
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

    /* Two groups, not five loose controls: the period chips, then the
       controls that act on what they select. Left to right, they read as
       "this period, of this type, exported", and the export sits at the
       far right where an action belongs, instead of wherever the wrap
       happened to drop it. */
    el.filters.innerHTML =
      '<div class="filters">' +
        '<div class="chipline">' + ranges.map(function (r) {
          return '<button class="fchip' + (filter.range === r[0] ? ' on' : '') + '" data-range="' + r[0] + '">' + r[1] + '</button>';
        }).join('') + '</div>' +
        '<div class="filter-tail">' +
          (view === 'closed'
            ? '<select class="input sm" id="typeFilter" aria-label="Contract type">' + types.map(function (t) {
                return '<option value="' + t[0] + '"' + (filter.type === t[0] ? ' selected' : '') + '>' + t[1] + '</option>';
              }).join('') + '</select>'
            : '') +
          '<button class="btn-mini" id="exportBtn">' + I('down', 14) + 'CSV</button>' +
        '</div>' +
      '</div>';
  }

  function instrumentName(c) {
    if (c.symbolName) return c.symbolName;
    var meta = API.symbol(c.symbol);
    return (meta && meta.name) || c.symbol || 'Unknown';
  }

  /* ---------- list ---------- */
  function renderList() {
    var data = items();
    if (!data.length) {
      el.list.innerHTML = '<div class="empty">' +
        I('book', 26) +
        '<b>Nothing here yet</b>' +
        '<span>' + (view === 'open' ? 'Trades and automated runs appear here while they run.'
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

    el.list.innerHTML = '<div class="list">' + data.map(function (it) {
      if (it.kind === 'run') return runRow(it.s);
      var c = it.c;
      var live = c.status === 'open';
      var pl = live ? c.value - c.stake : c.profit;
      return '<button class="trow" data-detail="' + c.id + '">' +
        '<span class="ico ' + (live ? 'live' : pl >= 0 ? 'pos' : 'neg') + '">' +
          (live ? I('clock', 16) : I(pl >= 0 ? 'check' : 'close', 16)) + '</span>' +
        '<span class="t"><b>' + API.contracts.label(c) + '</b>' +
          /* symbolName is written when the contract is opened, so a row
             restored from an older stored shape, or one that arrives
             from the server later, can be missing it. Reading through
             it directly threw, and a throw here loses the whole list and
             leaves the previous screen in place with nothing to say why. */
          '<span>' + instrumentName(c).replace(' Index', '') + ' · ' + F.money(c.stake) +
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

  function runDetail(id) {
    var r = API.runs.get(id);
    if (!r) return;
    window.NexModals.detail = {
      steps: {
        main: {
          title: 'Auto · ' + (r.label || r.side),
          sub: r.symbolName,
          body: function () {
            var s = runSummary(API.runs.get(id) || r);
            var list = s.contracts.slice().sort(function (a, b) { return a.entryTime - b.entryTime; });
            return '<div class="modal-form">' +
              '<div class="detail-pl ' + (s.pnl >= 0 ? 'pos' : 'neg') + '"><span class="label">' +
                (s.live ? 'Running' : 'Result') + '</span><b class="num">' + F.signedMoney(s.pnl) + '</b></div>' +
              '<div class="totals">' +
                kv('Status', REASON[r.status] || r.status) +
                kv('Trades', s.done) +
                kv('Wins / Losses', s.wins + ' / ' + s.losses) +
                kv('Stake per trade', F.money(r.stake)) +
                kv('Target profit', F.money(r.takeProfit)) +
                kv('Stop loss', F.money(r.stopLoss)) +
                (r.maxTrades ? kv('Trade limit', r.maxTrades) : '') +
                kv('Started', F.dateTime(r.startedAt)) +
                (r.endedAt && !s.live ? kv('Ended', F.dateTime(r.endedAt)) : '') +
              '</div>' +
              (list.length
                ? '<div class="label" style="margin:4px 0 -4px">Trades in this run</div>' +
                  '<div class="list" style="margin:0">' + list.map(function (c, i) {
                    var live = c.status === 'open';
                    var pl = live ? c.value - c.stake : c.profit;
                    return '<div class="trow">' +
                      '<span class="ico ' + (live ? 'live' : pl >= 0 ? 'pos' : 'neg') + '">' + (i + 1) + '</span>' +
                      '<span class="t"><b>' + API.contracts.label(c) + '</b>' +
                        '<span>' + F.money(c.stake) + ' · ' + F.clock(c.exitTime || c.entryTime) + '</span></span>' +
                      '<span class="p"><span class="num ' + (pl >= 0 ? 'pos' : 'neg') + '">' + F.signed(pl) + '</span>' +
                        '<span class="num sub">' + (live ? 'running' : c.status) + '</span></span>' +
                    '</div>';
                  }).join('') + '</div>'
                : '') +
            '</div>';
          }
        }
      }
    };
    window.NexModal.open('detail');
  }

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
      window.NexToast('Download blocked here, CSV copied to the clipboard');
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
      var rr = e.target.closest('[data-run]');
      if (rr) { runDetail(rr.getAttribute('data-run')); return; }
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
