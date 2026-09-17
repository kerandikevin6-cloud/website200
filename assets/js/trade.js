/* ============================================================
   Novi, terminal
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
    tab: 'even_odd',           /* even_odd | matches | over_under */
    fromScan: null,            /* the scanner's ticket, while it is shown */
    side: 'even',
    barrier: 5,
    stake: 10,               /* USD; replaced at init with a round local figure */
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
    /* Markets is where this is chosen, so the terminal has to say which
       one it landed on, otherwise the choice is invisible the moment
       the page changes. Drawn over the chart so it costs no height. */
    /* A real <select>, not a custom menu: on a phone it opens the
       system picker, it is reachable from the keyboard for nothing, and
       it cannot end up behind the canvas. Rebuilt only when the
       instrument changes, so opening it is not interrupted by the tick
       that repaints the digits underneath. */
    /* Our own dropdown, not the browser's: the system menu is a white
       rectangle in the system font landing on a dark chart. Built once
       and left alone, so the tick that repaints the digits underneath
       cannot close it mid-choice. */
    var instEl = $('chartInst');
    if (instEl && !instEl.__sel) {
      instEl.__sel = window.NexSelect(instEl, {
        options: API.symbols.map(function (sym) {
          return {
            value: sym.id, label: sym.name, group: sym.group,
            icon: API.symbolIcon(sym),
            /* Said on every row, because it is the thing somebody is
               most likely to assume wrongly about a list that now has
               Gold in it. */
            note: 'Generated series'
          };
        }),
        value: S.symbol,
        onChange: function (o) { switchSymbol(o.value); }
      });
    } else if (instEl && instEl.__sel && instEl.__sel.value() !== S.symbol) {
      instEl.__sel.set(S.symbol);
    }
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
      /* The circle holds the digit and nothing else. The share sat
         inside it at 7.5px, which is under the size anything is meant to
         be read at, and it was competing with the number it describes. */
      var cls = 'dcell' + (pctArr[i] === max ? ' hot' : '') + (i === curDigit ? ' cur' : '') +
        (picking && i === S.barrier ? ' sel' : '');
      out += '<button class="' + cls + '" data-digit="' + i + '"' + (picking ? '' : ' tabindex="-1"') + '>' +
        '<span class="digit">' + i + '</span>' +
        '<i class="dpct">' + pctArr[i].toFixed(1) + '%</i></button>';
    }
    html(el.digits, out);
  }

  /* ---------- contract tabs ---------- */
  function renderTabs() {
    /* An icon each, so the three are told apart at a glance rather than
       by reading three similar pairs of words. The glyph says what the
       contract asks: a split for parity, a bullseye for hitting one
       digit, arrows for above and below. */
    var tabs = [
      ['even_odd', 'Even / Odd', 'parity'],
      ['matches', 'Matches / Differs', 'target'],
      ['over_under', 'Over / Under', 'overunder']
    ];
    html(el.tabs, tabs.map(function (t) {
      return '<button class="ctab' + (S.tab === t[0] ? ' active' : '') + '" data-tab="' + t[0] + '">' +
        '<i class="ctab-ico">' + I(t[2], 16) + '</i>' +
        '<span>' + t[1] + '</span>' +
      '</button>';
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
      targetCell('tgtSL', 'Stop loss', '$', auto.stopLoss, 'neg') +
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

    /* A number line, not a stepper. Picking 7 was six presses of a
       chevron, and the digit is not a quantity to nudge up and down: it
       is one of ten choices, all of which fit on one row. */
    var barrierRow = S.tab === 'even_odd' ? '' :
      '<div class="barrier">' +
        '<span class="label">' + (S.tab === 'matches' ? 'Digit to match' : 'Barrier digit') + '</span>' +
        '<div class="numline">' +
          [0,1,2,3,4,5,6,7,8,9].map(function (n) {
            return '<button class="nb' + (n === S.barrier ? ' on' : '') +
              '" data-digit="' + n + '" aria-pressed="' + (n === S.barrier) + '">' + n + '</button>';
          }).join('') +
        '</div>' +
      '</div>';

    var runRow = S.mode !== 'auto' ? '' :
      '<div class="runbar' + (S.run ? ' active' : '') + '">' +
        '<div>' +
          '<span class="label">Automated run</span>' +
          '<div class="runbar-t">' + (S.run
            ? S.run.done + ' of ' + S.run.total + ' · ' + F.signedUsd(S.run.pnl)
            : auto.runs + ' runs · ×' + auto.multiplier + ' on loss') + '</div>' +
        '</div>' +
        (S.run
          ? '<button class="btn-stop" id="runStop">Stop</button>'
          : '<button class="btn-mini" data-open="autorun">Settings</button>') +
      '</div>';

    /* The three targets are the rules an automated run stops on. In
       manual mode there is no run to stop, so they were three fields
       that did nothing sitting above the one control that does. */
    var targets = S.mode === 'auto' ? targetsRow(auto) : '';

    /* Where the numbers in this panel came from, said once. A panel that
       silently differs from how it was left is worse than one that
       explains itself. */
    var scanRow = !S.fromScan ? '' :
      '<div class="scan-note">' + I('radar', 15) +
        '<span><b>' + S.fromScan.label + '</b> on ' + S.fromScan.symbolName +
        ', from the scanner. Nothing is placed until you press buy.</span>' +
        '<button class="scan-x" id="scanClear" aria-label="Dismiss">' + I('close', 14) + '</button>' +
      '</div>';

    html(el.panel,
      scanRow +
      '<div class="seg" id="modeSeg">' +
        /* The label is wrapped because the capsule behind it is an
           absolutely positioned pseudo-element, which would otherwise
           paint over a bare text node. */
        '<button data-mode="auto" class="' + (S.mode === 'auto' ? 'active' : '') + '"><span>Auto</span></button>' +
        '<button data-mode="manual" class="' + (S.mode === 'manual' ? 'active' : '') + '"><span>Manual</span></button>' +
      '</div>' +
      /* Stake first: it is the field that gets touched on every single
         trade, and it was below three that are set once and left. */
      '<div>' +
        '<div class="stake' + (S.error ? ' invalid' : '') + '">' +
          '<button id="minus" aria-label="Decrease stake">' + I('minus', 15) + '</button>' +
          '<div class="f"><input id="stake" value="' + stakeShown() + '" inputmode="decimal" aria-label="Stake">' +
            '<span class="cur">' + API.money.stakeCurrency() + '</span></div>' +
          '<button id="plus" aria-label="Increase stake">' + I('plus', 15) + '</button>' +
        '</div>' +
        (S.error ? '<div class="field-error" role="alert">' + S.error + '</div>' : '') +
        '<div class="quick" id="quick">' +
          API.money.stakeChips().chips.map(function (n) {
            return '<button data-add="' + n + '">+' + F.count(n) + '</button>';
          }).join('') +
        '</div>' +
      '</div>' +
      barrierRow +
      targets +
      runRow +
      /* one line, not two: the trade screen is short on height and this
         is the least load-bearing thing on it */
      '<div class="session">' +
        '<span class="num">' + today.length + ' trades · ' + wins + 'W / ' + losses + 'L</span>' +
        '<span class="num ' + (pnl >= 0 ? 'pos' : 'neg') + '">' + F.signedUsd(pnl) + '</span>' +
      '</div>');
  }

  /* ---------- dock (the two CTAs) ----------
     Idle, each side shows its name and what it pays, nothing else. Once
     a side is running it turns amber and becomes the stop control, with
     its progress drawn along the bottom of the button itself, that is
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
          /* Dollars, because the stake above it is dollars. A payout
             quoted in shillings against a stake typed in dollars is two
             different questions on one button. */
          '<div class="s">' + F.usdAmount(payoutFor(sd[0])) + '</div>' +
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

    if (r.pnl >= r.takeProfit) return stopRun('Take-profit reached at ' + F.signedUsd(r.pnl));
    if (-r.pnl >= r.stopLoss) return stopRun('Stop-loss reached at ' + F.signedUsd(r.pnl));
    if (r.done >= r.total) return stopRun('Run finished at ' + F.signedUsd(r.pnl));
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

      if (t.closest('#scanClear')) { S.fromScan = null; renderPanel(); return; }

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

      var step = API.money.stakeChips().step;
      if (t.closest('#plus')) { setStake(stakeShown() + step); return; }
      if (t.closest('#minus')) { setStake(stakeShown() - step); return; }

      var add = t.closest('[data-add]');
      if (add) { setStake(stakeShown() + (+add.getAttribute('data-add'))); return; }

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
        setStakeShown(e.target.value);
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

  /* S.stake is USD, like every other amount inside the app, and now so
     is the field: stakes are quoted in dollars whatever currency the
     balance is shown in. These two
     are the only places it turns into the figure on screen and back, so
     a stake typed in shillings is stored in dollars and nothing else in
     this file has to know that happened.

     Round in display units, not USD: rounding the dollars first leaves
     the shillings showing 4,999.87 after somebody typed 5,000. */
  function stakeShown() {
    return Math.round(S.stake * 100) / 100;
  }
  function setStakeShown(shown) {
    S.stake = Math.max(0, Math.round((+shown || 0) * 100) / 100);
  }

  /* v is in display units, what the buttons add and what the field holds. */
  function setStake(v) {
    setStakeShown(v);
    check();
    if (typing()) {
      var f = el.panel.querySelector('#stake');
      if (f) f.value = stakeShown();
      refreshValidity();
    } else { renderPanel(); renderDock(); }
  }

  /* Change instrument without leaving the terminal. The chart is torn
     down and rebuilt rather than re-pointed: it holds a window into one
     series' history, and carrying that across to a different price
     range draws a cliff between the two. */
  function switchSymbol(id) {
    if (!id || id === S.symbol) return;
    if (!API.prefs.setSymbol(id)) return;
    S.symbol = id;
    if (chart) { chart.destroy(); chart = null; }
    chart = window.NexChart.create($('chart'), { symbol: S.symbol });
    chart.resize();
    renderAll();
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

    /* Open on a round figure in the viewer's own money, 500 KES, not
       the 1,290 that a $10 default converts to. Only on a first mount,
       so a stake the trader chose is never overwritten. */
    if (!root.__stakeSet) {
      root.__stakeSet = true;
      S.stake = API.money.stakeChips().start;
    }

    /* Markets is where an instrument is chosen; this is where that choice
       arrives. Read every mount, not just the first, coming back from
       Markets is a fresh document. */
    S.symbol = API.prefs.symbol();

    /* And a ticket from the scanner, if one is waiting. Taken, not read:
       it applies once and is gone, so coming back to this page tomorrow
       does not silently reset the panel to a signal from yesterday. */
    var ticket = API.prefs.takeTicket();
    if (ticket) {
      S.symbol = ticket.symbol || S.symbol;
      S.tab = ticket.tab || S.tab;
      if (ticket.barrier != null) S.barrier = ticket.barrier;
      if (ticket.ticks) S.ticks = ticket.ticks;
      if (ticket.stake) S.stake = ticket.stake;
      S.fromScan = ticket;
    }

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
