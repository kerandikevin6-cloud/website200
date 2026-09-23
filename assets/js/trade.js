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
    /* Not a setting. See ticksFor(): a contract runs five seconds, and
       how many ticks that is depends on the instrument. */
    ticks: 5,
    /* Auto is what this screen is for. Manual is still a tap away, but
       somebody arriving at a scanner-driven terminal is there to let it
       run, and defaulting to the mode that does nothing on its own made
       them set it up twice. */
    mode: 'auto',           /* auto | manual */
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
  /* Only for a point old enough to predate the digit being stored on it.
     Two decimal places was hardcoded here, which is wrong the moment a
     series is quoted to five. */
  function lastDigitOf(price, digits) {
    return Math.abs(Math.round(price * Math.pow(10, digits))) % 10;
  }

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
        options: API.symbols.map(instOption),
        value: S.symbol,
        onChange: function (o) { switchSymbol(o.value); }
      });
      /* The figures in the list are whatever they were on the last tick
         of the selected series, which on a two-second instrument is up
         to two seconds stale at the moment the list opens. Refresh once
         on the way in, after the click has done the opening. */
      instEl.addEventListener('click', function () { setTimeout(refreshPicker, 0); });
    } else if (instEl && instEl.__sel && instEl.__sel.value() !== S.symbol) {
      instEl.__sel.set(S.symbol);
    }
    refreshPicker();
    var h = API.feed.history(S.symbol).slice(-120);
    renderInstLive(h, meta);
    var counts = [0,0,0,0,0,0,0,0,0,0];
    h.forEach(function (p) {
      var dg = p.digit == null ? lastDigitOf(p.price, meta.digits) : p.digit;
      counts[dg]++;
    });
    var total = h.length || 1;
    var pctArr = counts.map(function (c) { return c / total * 100; });
    var max = Math.max.apply(null, pctArr);
    var cur = h[h.length - 1];
    var curDigit = cur.digit == null ? lastDigitOf(cur.price, meta.digits) : cur.digit;

    var picking = S.tab !== 'even_odd';
    /* While a contract is running, the digit that just landed is either
       on its side or it is not, and that is the only thing anybody is
       reading this row for. Green for a tick the contract wants, red for
       one it does not — so a trader on Even watches the live circle go
       green on 2 and red on 3 without doing the parity themselves. */
    var live = liveContract();
    var out = '';
    for (var i = 0; i < 10; i++) {
      /* The circle holds the digit and nothing else. The share sat
         inside it at 7.5px, which is under the size anything is meant to
         be read at, and it was competing with the number it describes. */
      var cls = 'dcell' + (pctArr[i] === max ? ' hot' : '') + (i === curDigit ? ' cur' : '') +
        (picking && i === S.barrier ? ' sel' : '') +
        (live && i === curDigit
          ? (API.contracts.winning(live, i) ? ' hit' : ' miss')
          : '');
      out += '<button class="' + cls + '" data-digit="' + i + '"' + (picking ? '' : ' tabindex="-1"') + '>' +
        '<span class="digit">' + i + '</span>' +
        '<i class="dpct">' + pctArr[i].toFixed(1) + '%</i></button>';
    }
    html(el.digits, out);
  }

  /* ---------- a row in the instrument picker ----------
     The mark, the short name, the long one, and on the right what the
     series is doing: the price and how far it has moved over the last
     120 ticks, which is the same window the digit shares are counted
     across and the same one the card over the chart reports.

     "Generated series" stays on every row, including the ones with
     flags on them. The flags are the shape of the instrument — a pair
     moving in its fifth decimal — and not a claim that the number came
     from a market, because it did not: every series in this app is the
     same random walk with different numbers in front of it. */
  function instOption(sym) {
    return {
      value: sym.id,
      label: sym.short || sym.name,
      group: sym.group,
      iconHtml: window.NexMark(sym),
      note: (sym.short ? sym.name + ' · ' : '') + 'Generated series',
      tail: instTail(sym)
    };
  }

  /* The window each figure is measured over: one number, used by the
     card, the picker and the digit shares alike. */
  var WINDOW = 120;

  function instTail(sym) {
    var h = API.feed.history(sym.id);
    if (!h || !h.length) return '';
    h = h.slice(-WINDOW);
    var first = h[0].price, last = h[h.length - 1].price;
    var pct = first ? (last - first) / first * 100 : 0;
    var tone = pct > 0 ? 'pos' : pct < 0 ? 'neg' : '';
    return '<b class="p num">' + last.toFixed(sym.digits) + '</b>' +
      '<span class="c num ' + tone + '">' + (pct > 0 ? '+' : '') + pct.toFixed(2) + '%</span>';
  }

  /* Only while the list is open, and only the figures: rebuilding the
     rows under a finger would lose the scroll position every second. */
  function refreshPicker() {
    var host = $('chartInst');
    if (!host || !host.classList.contains('open')) return;
    var rows = host.querySelectorAll('.sel-row');
    for (var i = 0; i < rows.length; i++) {
      var tail = rows[i].querySelector('.sel-tail');
      var sym = API.symbol(rows[i].getAttribute('data-val'));
      if (tail && sym) tail.innerHTML = instTail(sym);
    }
  }

  /* ---------- the live figure on the instrument card ----------
     The price and how far it has moved, over the same last 120 ticks the
     digit shares below are counted across. One window for everything on
     this screen: two different "recently"s on one card is a question
     nobody should have to ask.

     Repainted from renderDigits, which already runs on every tick, so
     this costs a tick handler rather than a timer of its own. */
  function renderInstLive(h, meta) {
    var node = $('instLive');
    if (!node || !h.length) return;
    var first = h[0].price, last = h[h.length - 1].price;
    var chg = last - first;
    var pct = first ? chg / first * 100 : 0;
    var tone = chg > 0 ? 'pos' : chg < 0 ? 'neg' : '';
    var sign = chg > 0 ? '+' : '';

    node.innerHTML =
      '<span class="p">' + last.toFixed(meta.digits) + '</span>' +
      '<span class="c ' + tone + '">' + sign + chg.toFixed(meta.digits) +
        ' (' + sign + pct.toFixed(2) + '%)</span>';
    node.title = 'Change over the last ' + h.length + ' ticks';
  }

  /* ---------- contract tabs ---------- */
  function renderTabs() {
    /* An icon each, so the three are told apart at a glance rather than
       by reading three similar pairs of words. The glyph says what the
       contract asks: a split for parity, a bullseye for hitting one
       digit, arrows for above and below. */
    var tabs = [
      ['even_odd', 'Even / Odd', 'lc-contrast'],
      ['matches', 'Matches / Differs', 'lc-crosshair'],
      ['over_under', 'Over / Under', 'lc-arrow-down-up']
    ];
    /* The heading only shows where the tabs are a list inside the
       ticket. Across the top of the chart they are plainly three tabs
       and a word over them is a word to read. */
    html(el.tabs, '<span class="label ctabs-h">Contract</span>' + tabs.map(function (t) {
      return '<button class="ctab' + (S.tab === t[0] ? ' active' : '') + '" data-tab="' + t[0] + '">' +
        '<i class="ctab-ico">' + I(t[2], 16) + '</i>' +
        '<span>' + t[1] + '</span>' +
      '</button>';
    }).join(''));
  }

  /* ---------- which column the chooser lives in ----------
     On a laptop the contract type belongs to the ticket. It was a row of
     three tabs in the top corner of the chart column, which is the one
     place on the screen nobody looks while setting up a trade — "I
     cannot see where you choose Even / Odd" is the whole report. In the
     right-hand card it is a list of three, above the stake, with the
     rest of the ticket under it.

     Moved rather than copied: one chooser, one active state. On a phone
     it goes back where it was, above the chart, because there is only
     one column there and it is the first thing the page should say. */
  var wide = null;
  function placeTabs() {
    if (!el.tabs) return;
    /* On a phone they belong inside the pinned head, above the chart and
       held there with it. Dropped back into .col-mid they would scroll
       away with the digits, which is the one place they must not be:
       the chooser has to stay reachable from anywhere in the ticket. */
    var head = document.querySelector('.terminal .chart-pin') ||
               document.querySelector('.terminal .col-mid');
    var right = document.querySelector('.terminal .col-right');
    if (!head || !right) return;
    var want = window.matchMedia('(min-width:900px)').matches ? right : head;
    if (el.tabs.parentElement === want) return;
    want.insertBefore(el.tabs, want.firstChild);
  }
  function watchWidth() {
    if (!window.matchMedia) return;
    wide = window.matchMedia('(min-width:900px)');
    var onChange = function () { placeTabs(); };
    if (wide.addEventListener) wide.addEventListener('change', onChange);
    else if (wide.addListener) wide.addListener(onChange);
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

  /* ---------- what this ticket is ----------
     Four lines under the controls: the instrument, the contract, how long
     it runs and what it pays. Every one of these was already decided
     somewhere on the screen — on Markets, in the chooser, in code — and
     none of them was written down in the one card you read before
     pressing a side.

     Desktop only. The right-hand card has the height for it and the
     phone does not; there the same four facts are two thumb-lengths of
     scrolling away from the buttons, which is worse than not saying
     them. */
  function detailRow(k, v) {
    return '<div class="td-row"><span>' + k + '</span><b>' + v + '</b></div>';
  }
  function ticketDetail() {
    var meta = API.symbol(S.symbol);
    var sides = sidesFor();
    var r0 = API.contracts.payoutRate(typeFor(sides[0][0]));
    var r1 = API.contracts.payoutRate(typeFor(sides[1][0]));
    function rate(r) { return '+' + ((r - 1) * 100).toFixed(2) + '%'; }

    return '<div class="tdetail">' +
      detailRow('Instrument', meta.name) +
      detailRow('Contract', tabLabel()) +
      detailRow('Duration', (RUN_MS / 1000) + ' seconds') +
      /* The two sides of a contract do not always pay the same — Matches
         and Differs are nowhere near each other — so this says one rate
         only when it is honestly one rate. */
      (r0 === r1
        ? detailRow('Payout', rate(r0))
        : detailRow(sides[0][1], rate(r0)) + detailRow(sides[1][1], rate(r1))) +
    '</div>';
  }
  function tabLabel() {
    return S.tab === 'even_odd' ? 'Even / Odd'
      : S.tab === 'matches' ? 'Matches / Differs' : 'Over / Under';
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

    /* The run bar that sat here is gone, and with it the Settings
       button. It showed "3 of 10 · +$4" and a Stop — both of which the
       trade button already shows, in amber, with the progress drawn
       along its own foot. Two of the same control is one to think
       about, and this one sat between the targets and the buttons they
       apply to.

       What it also carried was a way into the run settings. The three
       numbers a run stops on are still editable, in the row directly
       above; how many contracts it places and the multiplier are not
       something to be set before every session. */

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
      '<div class="stake-block">' +
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
      targets +
      /* Last, under the automated run box, and in the same place in both
         modes. It used to sit directly under the stake in manual and
         above two boxes in auto, so the digit moved down the panel when
         the mode changed — on the one control somebody reaches for
         without looking. */
      barrierRow +
      ticketDetail() +
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

  /* Any open contract on the instrument on screen. Used to tint the
     live digit; when two are running the first is enough, since the
     circle can only say one thing. */
  function liveContract() {
    var open = API.contracts.open();
    for (var i = 0; i < open.length; i++) {
      if (open[i].symbol === S.symbol) return open[i];
    }
    return null;
  }

  /* the live contract for a side on this instrument, if any */
  function runningOn(side) {
    var open = API.contracts.open();
    for (var i = 0; i < open.length; i++) {
      if (open[i].symbol === S.symbol && open[i].side === side) return open[i];
    }
    return null;
  }

  /* "3s left", from ticks and the speed this instrument runs at. The
     contract counts ticks; a person waiting counts seconds. */
  function secondsLeft(c) {
    var rate = (API.symbol(c.symbol) || {}).rate || 1000;
    var left = Math.max(0, Math.ceil((c.ticks - c.elapsed) * rate / 1000));
    return left + 's left';
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
          /* A run of several shows how far through it is and where it
             stands in money, with the bar filling contract by contract.
             A single contract follows the contract itself: how much of it
             is left, and the same seconds drawn along the foot. */
          var pcTicks = live ? Math.min(100, Math.round(live.elapsed / live.ticks * 100)) : 0;
          var multi = isRun && S.run.total > 1;
          var sub = multi
            ? S.run.done + ' of ' + S.run.total + ' · ' + F.signed(S.run.pnl)
            : live
              ? secondsLeft(live) + ' · ' + F.signed(live.value - live.stake)
              : 'starting';
          return '<button class="tbtn stop" data-stop="' + sd[0] + '">' +
            '<div class="t">Stop</div>' +
            '<div class="s">' + sub + '</div>' +
            '<i class="tbtn-bar" style="width:' + (multi
              ? Math.round(S.run.done / S.run.total * 100) : pcTicks) + '%"></i>' +
          '</button>';
        }

        return '<button class="tbtn ' + tone + '" data-side="' + sd[0] + '"' +
          (blocked || busy ? ' disabled' : '') + '>' +
          '<div class="t">' + sd[1] + '</div>' +
          /* The figure was a bare "19.53", which is a number with no
             question attached: it could as easily have been the stake,
             the price or the balance. It says what it is and what it is
             in — Payout, in dollars, because the stake above it is
             dollars — with the rate it works out to on the other end of
             the row. */
          '<div class="s payout">' +
            '<span class="s-k">Payout <b>$' + F.usdAmount(payoutFor(sd[0])) + '</b></span>' +
            '<span class="s-p">' + pct(sd[0]) + '</span>' +
          '</div>' +
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

  /* ---------- calling the ticks ----------
     Every tick a contract lives through is called as it lands: the
     digit, and whether it is on your side. Ten seconds of a contract is
     five to ten of these depending on how fast the instrument runs, and
     that is the point — a contract that reports once at the end is ten
     seconds of nothing followed by a verdict, and the ten seconds are
     the part somebody is actually watching.

     It says where the contract stands, not what it has won. The last
     tick is the one that decides, and every call before it is "this is
     what it would be if it stopped here" — which is exactly what the
     resale value above the button is already saying in money. */
  function callTick(d) {
    var open = API.contracts.open();
    var mine = null;
    for (var i = 0; i < open.length; i++) {
      if (open[i].symbol === d.symbol) { mine = open[i]; break; }
    }
    if (!mine || !window.NexTick) return;

    /* The contract is settled by the tick that ends it, and that one
       gets the full banner a moment later. Calling it twice, once small
       and once large, reads as two results. */
    if (mine.elapsed >= mine.ticks) return;

    /* Money, not the digit. The digit was on the circle above and in
       the pill and on the chart, three times over, and none of those
       answers the question somebody has while a contract runs, which is
       what it is worth right now. It climbs on a tick that lands the
       right way and falls on one that does not — the same figure the
       trade button is showing, said loudly enough to notice. */
    var pnl = mine.value - mine.stake;
    var good = API.contracts.favours(mine, d.point.digit);
    window.NexTick(good ? 'win' : 'loss', F.signedUsd(pnl),
      'Tick ' + mine.elapsed + ' of ' + mine.ticks, mine.symbolName || '');
  }

  /* ---------- how long a contract runs ----------
     Ten seconds, and it is not asked for.

     It used to be five ticks, which is not the same thing: these
     instruments tick at different speeds, one a second and one every
     two, so the identical contract ran for five seconds on one series
     and ten on another. The number nobody could see was changing while
     the number on the ticket stayed at "5".

     So the duration is stated in time and the ticks are worked out from
     whatever the instrument runs at. Clamped to what the contract rules
     allow, so an unusually slow series cannot round down to nothing.

     Ten seconds is also what makes the run watchable: every tick inside
     it is called as it lands, which on these instruments is five to ten
     calls per contract instead of one verdict at the end. */
  var RUN_MS = 10000;

  function ticksFor(symbol) {
    var meta = API.symbol(symbol) || {};
    var rate = meta.rate || 1000;
    return Math.max(1, Math.min(10, Math.round(RUN_MS / rate)));
  }

  /* ---------- validation ---------- */
  function check() {
    S.error = API.contracts.validate({ stake: S.stake, ticks: ticksFor(S.symbol), symbol: S.symbol });
    return !S.error;
  }

  /* ---------- placing ---------- */
  function place(side, runId) {
    var res = API.contracts.buy({
      symbol: S.symbol, type: typeFor(side), side: side,
      barrier: S.tab === 'even_odd' ? null : S.barrier,
      stake: S.stake, ticks: ticksFor(S.symbol), run: runId || null
    });
    if (!res.ok) {
      S.error = res.error;
      renderPanel();
      window.NexToast(res.error);
      return null;
    }
    S.error = null;
    /* The live circle tints against the open contract, so the row has to
       be repainted the moment there is one rather than on the next tick. */
    renderPanel(); renderActive(); renderDock(); renderDigits();
    return res.contract;
  }

  /* ---------- automated runs ---------- */
  /* How many contracts a run places: what the auto settings say, which
     is one unless someone has chosen more. It used to be a random four to
     eight, so a single press kept placing contracts (doubling the stake
     after every loss) long after the trader thought they had finished,
     and the result card only came at the end of a run they never asked
     for. Target profit and stop loss still end a longer run early. */
  function runLength(cfg) {
    var n = Math.floor(+(cfg && cfg.runs) || 1);
    return Math.max(1, Math.min(50, n));
  }

  function startRun(side) {
    var cfg = API.prefs.auto();
    S.run = {
      id: 'R' + Date.now(), side: side, total: runLength(cfg), done: 0, wins: 0, losses: 0, pnl: 0,
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
    if (!reason) return;

    /* Every run ends on the summary card, a run of one included. It
       used to be held back for runs of more than one contract, on the
       grounds that "1 of 1" is not a story worth a dialog — but a run
       of one is the default, so in practice an automated trade settled
       with nothing but a banner that was gone three seconds later, and
       the card that reports the session never appeared at all.

       A run stopped by hand before its contract settled has no result
       to show, so that one still leaves with a toast. */
    if (r.done && window.NexModal) {
      window.NexModal.open('runResult', null, { run: r, reason: reason });
      return;
    }
    window.NexToast(reason);
  }
  function showResult(c) {
    if (window.NexModal) window.NexModal.open('result', null, { contract: c });
  }

  /* A contract settling inside a run that carries on says so across the
     top, green won and red lost. Anything that ends on a card, a
     hand-placed contract or the last of a run, leaves this to the card. */
  function flashResult(c) {
    if (!window.NexFlash) return;
    var stamp = c.status === 'won' ? 'Contract Won'
      : c.status === 'sold' ? 'Position Closed' : 'Contract Lost';
    var kind = c.status === 'sold' ? (c.profit >= 0 ? 'win' : 'loss')
      : c.status === 'won' ? 'win' : 'loss';
    window.NexFlash(kind, stamp, c.symbolName || '',
      API.contracts.label(c) + '  ' + F.signedUsd(c.profit));
  }

  /* The sound the banner would have made, for a result that goes
     straight to the card instead. */
  function soundResult(c) {
    if (window.NexSound) window.NexSound.play(c.profit >= 0 && c.status !== 'lost' ? 'win' : 'loss');
  }

  function onSettled(c) {
    /* A hand-placed contract gets the full result dialog and nothing
       else: a banner saying the same thing over the top of the card was
       the one result reported twice. Contracts inside an automated run
       would throw a dialog every few seconds, so those report with the
       banner, except the last, which the run's card reports. */
    if (c.status !== 'open' && !c.run) { soundResult(c); showResult(c); }
    if (!S.run || c.run !== S.run.id) { renderAll(); return; }

    var r = S.run;
    r.done++;
    /* Counted as the run goes rather than derived at the end: the
       summary card reports wins, losses and the rate between them, and a
       contract sold early is neither a clean win nor a clean loss — it
       is whichever side of zero it came out on. */
    if (c.profit >= 0) r.wins++; else r.losses++;
    r.pnl = Math.round((r.pnl + c.profit) * 100) / 100;
    r.stake = c.status === 'won' ? r.base : Math.round(r.stake * r.multiplier * 100) / 100;
    S.stake = r.stake;

    var end = r.pnl >= r.takeProfit ? 'Take-profit reached at ' + F.signedUsd(r.pnl)
      : -r.pnl >= r.stopLoss ? 'Stop-loss reached at ' + F.signedUsd(r.pnl)
      : r.done >= r.total ? 'Run finished at ' + F.signedUsd(r.pnl)
      : !check() ? 'Run stopped: ' + S.error : null;
    if (end) { soundResult(c); return stopRun(end); }

    flashResult(c);
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

      /* #runStop went with the run bar. Stopping is the trade button
         itself now, which is what [data-stop] below handles. */

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
      /* A duration on the ticket is ignored: every contract here runs
         five seconds, and the scanner ranks contracts, not durations. */
      /* No stake rides along any more: the scanner found a contract, not
         a position size. Whatever is in the field here stays. */
      S.fromScan = ticket;
    }

    unsub.forEach(function (f) { f(); });
    unsub = [];
    if (chart) { chart.destroy(); chart = null; }
    placeTabs();
    if (root.__wired) { mounted(); return; }
    root.__wired = true;
    watchWidth();
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
        callTick(d);
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
