/* ============================================================
   Nexas — terminal
   Renders the contract panel for the selected trade type, runs
   validation, places and sells contracts, drives the automated
   run loop, and keeps the chart, digits and open positions in
   step with the feed.
   ============================================================ */
(function () {
  "use strict";

  var API, F, I;
  var el = {};                                   /* mounted nodes */
  var chart = null;
  var unsub = [];

  var S = {
    symbol: 'R_10',
    tab: 'even_odd',        /* even_odd | matches | over_under */
    side: 'even',
    barrier: 5,
    stake: 10,
    ticks: 5,             /* fixed: the duration picker was removed */
    mode: 'manual',         /* manual | auto */
    error: null,
    run: null
  };

  /* ---------- helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function html(node, markup) { if (node) node.innerHTML = markup; }

  function typeFor(side) {
    if (S.tab === 'even_odd') return 'even_odd';
    if (S.tab === 'matches') return side === 'matches' ? 'matches' : 'differs';
    return side === 'over' ? 'over' : 'under';
  }
  function payoutFor(side) {
    return API.contracts.payoutFor(typeFor(side), S.stake);
  }
  /* payoutRate carries the referral boost, so the figure on the button
     always matches what the contract actually pays. */
  function pct(side) {
    return ((API.contracts.payoutRate(typeFor(side)) - 1) * 100).toFixed(2) + '%';
  }

  /* ---------- digits ---------- */
  function renderDigits() {
    var meta = API.symbol(S.symbol);
    var h = API.feed.history(S.symbol).slice(-120);
    var counts = [0,0,0,0,0,0,0,0,0,0];
    h.forEach(function (p) {
      var dg = p.digit == null ? Math.abs(Math.round(p.price * 100)) % 10 : p.digit;
      counts[dg]++;
    });
    var total = h.length || 1;
    var pctArr = counts.map(function (c) { return c / total * 100; });
    var max = Math.max.apply(null, pctArr);
    var cur = h[h.length - 1];
    var curDigit = cur.digit == null ? Math.abs(Math.round(cur.price * 100)) % 10 : cur.digit;

    var picking = S.tab !== 'even_odd';
    var out = '';
    for (var i = 0; i < 10; i++) {
      var cls = 'digit' + (pctArr[i] === max ? ' hot' : '') + (i === curDigit ? ' cur' : '') +
        (picking && i === S.barrier ? ' picked' : '');
      out += '<button class="' + cls + '" data-digit="' + i + '"' + (picking ? '' : ' tabindex="-1"') + '>' +
        '<b>' + i + '</b><i>' + pctArr[i].toFixed(1) + '</i></button>';
    }
    html(el.digits, out);
  }

  /* ---------- contract tabs ---------- */
  function renderTabs() {
    var tabs = [['even_odd', 'Even / Odd'], ['matches', 'Matches / Differs'], ['over_under', 'Over / Under']];
    html(el.tabs, tabs.map(function (t) {
      return '<button class="ctab' + (S.tab === t[0] ? ' active' : '') + '" data-tab="' + t[0] + '">' + t[1] + '</button>';
    }).join(''));
  }

  /* ---------- run targets ----------
     Profit in green, loss in red, the loss multiplier in orange. These
     are the same three numbers the automated run stops on, so editing
     one here writes straight through to the saved run settings. */
  function targetCell(id, label, prefix, value, tone) {
    return '<div class="tgt ' + tone + '">' +
      '<span class="tgt-l">' + label + '</span>' +
      '<span class="tgt-v"><i>' + prefix + '</i>' +
        '<input id="' + id + '" class="num" value="' + value + '" inputmode="decimal" ' +
        'autocomplete="off" aria-label="' + label + '"></span>' +
    '</div>';
  }
  function targetsRow(auto) {
    return '<div class="targets">' +
      targetCell('tgtTP', 'Target profit', '$', auto.takeProfit, 'pos') +
      targetCell('tgtSL', 'Target loss', '$', auto.stopLoss, 'neg') +
      targetCell('tgtMult', 'Loss multiple', '\u00D7', auto.multiplier, 'warn') +
    '</div>';
  }

  /* ---------- panel ---------- */
  function renderPanel() {
    var today = API.contracts.today();
    var wins = today.filter(function (c) { return c.status === 'won'; }).length;
    var losses = today.filter(function (c) { return c.status === 'lost'; }).length;
    var pnl = today.reduce(function (a, c) { return a + (c.status === 'open' ? 0 : c.profit); }, 0);
    var auto = API.prefs.auto();

    var barrierRow = S.tab === 'even_odd' ? '' :
      '<div class="stack-row">' +
        '<span class="label">' + (S.tab === 'matches' ? 'Digit to match' : 'Barrier digit') + '</span>' +
        '<div class="pickline">' +
          '<button class="stepbtn" data-barrier="-1" aria-label="Lower digit">' + I('minus', 14) + '</button>' +
          '<b class="num">' + S.barrier + '</b>' +
          '<button class="stepbtn" data-barrier="1" aria-label="Raise digit">' + I('plus', 14) + '</button>' +
        '</div>' +
      '</div>';

    var runRow = S.mode !== 'auto' ? '' :
      '<div class="runbar' + (S.run ? ' active' : '') + '">' +
        '<div>' +
          '<span class="label">Automated run</span>' +
          '<div class="runbar-t">' + (S.run
            ? S.run.done + ' of ' + S.run.total + ' · ' + F.signedMoney(S.run.pnl)
            : auto.runs + ' runs · ×' + auto.multiplier + ' on loss') + '</div>' +
        '</div>' +
        (S.run
          ? '<button class="btn-stop" id="runStop">Stop</button>'
          : '<button class="btn-mini" data-open="autorun">Settings</button>') +
      '</div>';

    html(el.panel,
      '<div class="seg" id="modeSeg">' +
        '<button data-mode="auto" class="' + (S.mode === 'auto' ? 'active' : '') + '">Auto</button>' +
        '<button data-mode="manual" class="' + (S.mode === 'manual' ? 'active' : '') + '">Manual</button>' +
      '</div>' +
      targetsRow(auto) +
      runRow +
      barrierRow +
      '<div>' +
        '<div class="stake' + (S.error ? ' invalid' : '') + '">' +
          '<button id="minus" aria-label="Decrease stake">' + I('minus', 15) + '</button>' +
          '<div class="f"><input id="stake" value="' + S.stake + '" inputmode="decimal" aria-label="Stake">' +
            '<span class="cur">' + API.account.currency() + '</span></div>' +
          '<button id="plus" aria-label="Increase stake">' + I('plus', 15) + '</button>' +
        '</div>' +
        (S.error ? '<div class="field-error" role="alert">' + S.error + '</div>' : '') +
        '<div class="quick" id="quick">' +
          [1, 5, 10, 25, 50].map(function (n) { return '<button data-add="' + n + '">+' + n + '</button>'; }).join('') +
        '</div>' +
      '</div>' +
      /* one line, not two: the trade screen is short on height and this
         is the least load-bearing thing on it */
      '<div class="session">' +
        '<span class="num">' + today.length + ' trades · ' + wins + 'W / ' + losses + 'L</span>' +
        '<span class="num ' + (pnl >= 0 ? 'pos' : 'neg') + '">' + F.signedMoney(pnl) + '</span>' +
      '</div>');
  }

  /* ---------- dock (the two CTAs) ----------
     Idle, each side shows its name and what it pays, nothing else. Once
     a side is running it turns amber and becomes the stop control, with
     its progress drawn along the bottom of the button itself — that is
     the whole progress display, so nothing has to appear elsewhere on
     the page and push the layout around. */
  function sidesFor() {
    return S.tab === 'even_odd' ? [['even', 'Even'], ['odd', 'Odd']]
      : S.tab === 'matches' ? [['matches', 'Matches ' + S.barrier], ['differs', 'Differs ' + S.barrier]]
      : [['over', 'Over ' + S.barrier], ['under', 'Under ' + S.barrier]];
  }

  /* the live contract for a side on this instrument, if any */
  function runningOn(side) {
    var open = API.contracts.open();
    for (var i = 0; i < open.length; i++) {
      if (open[i].symbol === S.symbol && open[i].side === side) return open[i];
    }
    return null;
  }

  function renderDock() {
    var blocked = API.connection.status() !== 'live';
    var busy = false;
    var sides = sidesFor();
    for (var i = 0; i < sides.length; i++) if (runningOn(sides[i][0])) busy = true;
    if (S.run) busy = true;

    html(el.dock,
      '<div class="trade-actions">' + sides.map(function (sd, i) {
        var live = runningOn(sd[0]);
        var isRun = S.run && S.run.side === sd[0];
        var tone = i === 0 ? 'even' : 'odd';

        if (live || isRun) {
          var pcTicks = live ? Math.min(100, Math.round(live.elapsed / live.ticks * 100)) : 0;
          var sub = isRun
            ? S.run.done + ' of ' + S.run.total + ' · ' + F.signed(S.run.pnl)
            : (live.ticks - live.elapsed) + ' left · ' + F.signed(live.value - live.stake);
          return '<button class="tbtn stop" data-stop="' + sd[0] + '">' +
            '<div class="t">Stop</div>' +
            '<div class="s">' + sub + '</div>' +
            '<i class="tbtn-bar" style="width:' + (isRun
              ? Math.round(S.run.done / S.run.total * 100) : pcTicks) + '%"></i>' +
          '</button>';
        }

        return '<button class="tbtn ' + tone + '" data-side="' + sd[0] + '"' +
          (blocked || busy ? ' disabled' : '') + '>' +
          '<div class="t">' + sd[1] + '</div>' +
          '<div class="s">' + F.amount(payoutFor(sd[0])) + '</div>' +
        '</button>';
      }).join('') + '</div>');
  }

  /* The old card under the chart is gone: progress lives on the button
     and the full detail comes up as a result dialog when it finishes. */
  function renderActive() { html(el.active, ''); }

  function renderAll() {
    renderTabs(); renderDigits();
    if (!typing()) renderPanel();
    renderDock(); renderActive();
    if (chart) chart.setMarkers(API.contracts.all().filter(function (c) { return c.symbol === S.symbol; }).slice(0, 12));
  }

  /* update the error + CTA state in place, so typing is never interrupted */
  function refreshValidity() {
    var box = el.panel.querySelector('.stake');
    if (!box) return renderPanel();
    box.classList.toggle('invalid', !!S.error);
    var err = el.panel.querySelector('.field-error');
    if (S.error && !err) {
      err = document.createElement('div');
      err.className = 'field-error';
      err.setAttribute('role', 'alert');
      box.parentNode.insertBefore(err, box.nextSibling);
    }
    if (err) {
      if (!S.error) err.remove();
      else err.textContent = S.error;
    }
    renderDock();
  }

  function typing() {
    var a = document.activeElement;
    if (!a) return false;
    return a.id === 'stake' || !!(a.closest && a.closest('.targets'));
  }

  /* ---------- validation ---------- */
  function check() {
    S.error = API.contracts.validate({ stake: S.stake, ticks: S.ticks, symbol: S.symbol });
    return !S.error;
  }

  /* ---------- placing ---------- */
  function place(side, runId) {
    var res = API.contracts.buy({
      symbol: S.symbol, type: typeFor(side), side: side,
      barrier: S.tab === 'even_odd' ? null : S.barrier,
      stake: S.stake, ticks: S.ticks, run: runId || null
    });
    if (!res.ok) {
      S.error = res.error;
      renderPanel();
      window.NexToast(res.error);
      return null;
    }
    S.error = null;
    renderPanel(); renderActive(); renderDock();
    return res.contract;
  }

  /* ---------- automated runs ---------- */
  function startRun(side) {
    var cfg = API.prefs.auto();
    S.run = {
      id: 'R' + Date.now(), side: side, total: cfg.runs, done: 0, pnl: 0,
      base: S.stake, stake: S.stake, multiplier: cfg.multiplier,
      takeProfit: cfg.takeProfit, stopLoss: cfg.stopLoss
    };
    renderPanel();
    place(side, S.run.id);
  }
  function stopRun(reason) {
    if (!S.run) return;
    var r = S.run;
    S.run = null;
    S.stake = r.base;
    renderPanel();
    renderDock();
    if (reason && window.NexModal) window.NexModal.open('runResult', null, { run: r, reason: reason });
    else if (reason) window.NexToast(reason);
  }
  function showResult(c) {
    if (window.NexModal) window.NexModal.open('result', null, { contract: c });
  }

  function onSettled(c) {
    /* A hand-placed contract gets the full result dialog. Contracts
       inside an automated run would throw a dialog every few seconds,
       so those stay as toasts and the run reports once at the end. */
    if (c.status !== 'open' && !c.run) showResult(c);
    else if (c.status !== 'open') {
      window.NexToast(c.status === 'won'
        ? 'Won ' + F.money(c.payout)
        : c.status === 'sold' ? 'Sold at ' + F.money(c.value)
        : 'Lost ' + F.money(c.stake));
    }
    if (!S.run || c.run !== S.run.id) { renderAll(); return; }

    var r = S.run;
    r.done++;
    r.pnl = Math.round((r.pnl + c.profit) * 100) / 100;
    r.stake = c.status === 'won' ? r.base : Math.round(r.stake * r.multiplier * 100) / 100;
    S.stake = r.stake;

    if (r.pnl >= r.takeProfit) return stopRun('Take-profit reached at ' + F.signedMoney(r.pnl));
    if (-r.pnl >= r.stopLoss) return stopRun('Stop-loss reached at ' + F.signedMoney(r.pnl));
    if (r.done >= r.total) return stopRun('Run finished at ' + F.signedMoney(r.pnl));
    if (!check()) return stopRun('Run stopped: ' + S.error);

    renderAll();
    setTimeout(function () { if (S.run) place(r.side, r.id); }, 700);
  }

  /* ---------- events ---------- */
  function wire(root) {
    root.addEventListener('click', function (e) {
      var t = e.target;

      var tab = t.closest('[data-tab]');
      if (tab) {
        S.tab = tab.getAttribute('data-tab');
        stopRun();
        renderAll();
        return;
      }

      var mode = t.closest('[data-mode]');
      if (mode) {
        S.mode = mode.getAttribute('data-mode');
        if (S.mode === 'manual') stopRun();
        renderPanel();
        return;
      }

      var dg = t.closest('[data-digit]');
      if (dg && S.tab !== 'even_odd') {
        S.barrier = +dg.getAttribute('data-digit');
        renderDigits(); renderPanel(); renderDock();
        return;
      }

      var bStep = t.closest('[data-barrier]');
      if (bStep) {
        S.barrier = Math.max(0, Math.min(9, S.barrier + (+bStep.getAttribute('data-barrier'))));
        renderDigits(); renderPanel(); renderDock();
        return;
      }

      if (t.closest('#plus')) { setStake(S.stake + 1); return; }
      if (t.closest('#minus')) { setStake(S.stake - 1); return; }

      var add = t.closest('[data-add]');
      if (add) { setStake(S.stake + (+add.getAttribute('data-add'))); return; }

      var sell = t.closest('[data-sell]');
      if (sell) {
        var r = API.contracts.sell(sell.getAttribute('data-sell'));
        if (!r.ok) window.NexToast(r.error);
        renderAll();
        return;
      }

      if (t.closest('#runStop')) { stopRun('Run stopped'); return; }

      var stop = t.closest('[data-stop]');
      if (stop) {
        var which2 = stop.getAttribute('data-stop');
        if (S.run) { stopRun('Run stopped'); renderAll(); return; }
        var live = runningOn(which2);
        if (live) {
          var sold = API.contracts.sell(live.id);
          if (!sold.ok) window.NexToast(sold.error);
        }
        renderAll();
        return;
      }

      var side = t.closest('[data-side]');
      if (side) {
        if (!check()) { renderPanel(); window.NexToast(S.error); return; }
        var which = side.getAttribute('data-side');
        if (S.mode === 'auto') { S.run ? stopRun('Run stopped') : startRun(which); }
        else place(which);
        return;
      }

      /* chart controls */
      var zoom = t.closest('[data-zoom]');
      if (zoom && chart) {
        var z = zoom.getAttribute('data-zoom');
        z === 'in' ? chart.zoom(0.8) : z === 'out' ? chart.zoom(1.25) : chart.reset();
        return;
      }
    });

    root.addEventListener('input', function (e) {
      var id = e.target.id;
      if (id === 'stake') {
        S.stake = Math.max(0, +e.target.value || 0);
        check();
        refreshValidity();
        return;
      }
      if (id === 'tgtTP') API.prefs.setAuto({ takeProfit: Math.max(0, +e.target.value || 0) });
      else if (id === 'tgtSL') API.prefs.setAuto({ stopLoss: Math.max(0, +e.target.value || 0) });
      else if (id === 'tgtMult') API.prefs.setAuto({ multiplier: Math.max(1, +e.target.value || 1) });
    });
    root.addEventListener('blur', function (e) {
      var id = e.target.id;
      if (id === 'stake' || id === 'tgtTP' || id === 'tgtSL' || id === 'tgtMult') renderPanel();
    }, true);
  }

  function setStake(v) {
    S.stake = Math.max(0, Math.round(v * 100) / 100);
    check();
    if (typing()) { var f = el.panel.querySelector('#stake'); if (f) f.value = S.stake; refreshValidity(); }
    else { renderPanel(); renderDock(); }
  }

  /* ---------- mount ---------- */
  function init() {
    API = window.NexAPI; F = window.NexFmt; I = window.NexIcon;
    var root = $('terminal');
    if (!root) return;

    el.tabs = $('contractTabs');
    el.digits = $('digits');
    el.panel = $('panel');
    el.dock = $('dock');
    el.active = $('activeList');

    unsub.forEach(function (f) { f(); });
    unsub = [];
    if (chart) { chart.destroy(); chart = null; }
    if (root.__wired) { mounted(); return; }
    root.__wired = true;
    wire(root);

    mounted();
  }

  function mounted() {
    API.ready(function () {
      chart = window.NexChart.create($('chart'), { symbol: S.symbol });
      chart.resize();
      document.body.classList.remove('loading');
      renderAll();

      unsub.push(API.on('tick', function (d) {
        if (d.symbol !== S.symbol) return;
        renderDigits();
        /* only while something is live, so the idle dock is not rebuilt
           under the finger once a second for no reason */
        if (S.run || API.contracts.open().length) renderDock();
        if (chart) chart.dirty = true;
      }));
      unsub.push(API.on('settled', onSettled));
      unsub.push(API.on('balance', function () { check(); typing() ? refreshValidity() : renderPanel(); }));
      unsub.push(API.on('connection', renderDock));
    });
  }

  window.NexTrade = { init: init, state: S };
})();
