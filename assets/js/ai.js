/* ============================================================
   Novi, AI scanner
   Reads the recent tick history of every instrument, scores each
   digit contract it could write against that instrument, and
   surfaces the strongest edge it finds. The chosen signal can be
   placed by hand or handed to the engine to execute on its own.

   The scoring is deliberately plain: observed frequency over the
   sample window, multiplied by the contract's payout, minus the
   stake. Anything above zero is a positive expected return on the
   sample, which is all a scanner can honestly claim.
   ============================================================ */
(function () {
  "use strict";

  var API, F, I;
  var el = {};
  var unsub = [];
  var timer = null;

  var WINDOW = 180;          /* ticks per instrument in the sample */

  var S = {
    phase: 'idle',           /* idle | scanning | done */
    step: 0,                 /* instrument index while scanning */
    signals: [],
    pick: null,              /* symbol id of the selected signal */
    stake: 10,              /* USD; set to a round local figure on mount */
    ticks: 5,
    auto: false,
    error: null,
    placing: false
  };

  function $(id) { return document.getElementById(id); }
  function html(node, markup) { if (node) node.innerHTML = markup; }

  /* ---------- sampling ---------- */
  function digitsOf(symbol) {
    var h = API.feed.history(symbol).slice(-WINDOW);
    return h.map(function (p) {
      return p.digit == null ? Math.abs(Math.round(p.price * 100)) % 10 : p.digit;
    });
  }

  /* ---------- scoring ----------
     Every candidate carries the probability observed in the window
     and the expected return that probability implies at the quoted
     payout. The best candidate per instrument is the signal. */
  function score(symbol) {
    var d = digitsOf(symbol);
    var n = d.length;
    if (n < 40) return null;

    var freq = [0,0,0,0,0,0,0,0,0,0];
    var even = 0;
    d.forEach(function (x) { freq[x]++; if (x % 2 === 0) even++; });

    var P = API.payouts;
    var out = [];
    function add(type, side, barrier, hits, label) {
      var p = hits / n;
      out.push({
        type: type, side: side, barrier: barrier, label: label,
        prob: p, edge: p * P[type] - 1
      });
    }

    add('even_odd', 'even', null, even, 'Even');
    add('even_odd', 'odd', null, n - even, 'Odd');

    var above = 0, i;
    for (i = 0; i <= 8; i++) {
      above = 0;
      for (var j = i + 1; j <= 9; j++) above += freq[j];
      add('over', 'over', i, above, 'Over ' + i);
    }
    for (i = 1; i <= 9; i++) {
      var below = 0;
      for (var k = 0; k < i; k++) below += freq[k];
      add('under', 'under', i, below, 'Under ' + i);
    }

    var hottest = 0, coldest = 0;
    for (i = 1; i < 10; i++) {
      if (freq[i] > freq[hottest]) hottest = i;
      if (freq[i] < freq[coldest]) coldest = i;
    }
    add('matches', 'matches', hottest, freq[hottest], 'Matches ' + hottest);
    add('differs', 'differs', coldest, n - freq[coldest], 'Differs ' + coldest);

    out.sort(function (a, b) { return b.edge - a.edge; });
    var best = out[0];
    best.symbol = symbol;
    best.symbolName = API.symbol(symbol).name;
    best.sample = n;
    best.freq = freq;
    return best;
  }

  function rescan() {
    S.signals = API.symbols.map(function (s) { return score(s.id); })
      .filter(Boolean)
      .sort(function (a, b) { return b.edge - a.edge; });
    if (!S.signals.length) return;
    if (!S.pick || !current()) S.pick = S.signals[0].symbol;
  }

  function current() {
    for (var i = 0; i < S.signals.length; i++) {
      if (S.signals[i].symbol === S.pick) return S.signals[i];
    }
    return null;
  }

  /* ---------- scan animation ---------- */
  function startScan() {
    if (S.phase === 'scanning') return;
    S.phase = 'scanning';
    S.step = 0;
    S.error = null;
    render();
    clearInterval(timer);
    timer = setInterval(function () {
      S.step++;
      if (S.step >= API.symbols.length) {
        clearInterval(timer);
        rescan();
        S.phase = 'done';
        render();
        if (S.auto) place(true);
        return;
      }
      render();
    }, 260);
  }

  /* ---------- placing ---------- */
  function place(fromAuto) {
    var sig = current();
    if (!sig || S.placing) return;

    var err = API.contracts.validate({ stake: S.stake, ticks: S.ticks, symbol: sig.symbol });
    if (err) { S.error = err; render(); window.NexToast(err); return; }

    S.placing = true;
    var res = API.contracts.buy({
      symbol: sig.symbol, type: sig.type, side: sig.side,
      barrier: sig.type === 'even_odd' ? null : sig.barrier,
      stake: S.stake, ticks: S.ticks, run: 'AI'
    });
    S.placing = false;

    if (!res.ok) { S.error = res.error; render(); window.NexToast(res.error); return; }
    S.error = null;
    window.NexToast((fromAuto ? 'AI placed ' : 'Placed ') + sig.label + ' on ' + sig.symbolName);
    render();
  }

  /* Same as the terminal: the stake is USD in the field as well as in
     the contract, so there is nothing to convert either way. */
  function stakeShown() {
    return Math.round(S.stake * 100) / 100;
  }
  function setStakeShown(shown) {
    S.stake = Math.max(0, Math.round((+shown || 0) * 100) / 100);
  }

  /* v is in display units. */
  function setStake(v) {
    setStakeShown(v);
    S.error = null;
    render();
  }

  /* ---------- markup ---------- */
  function scanCard() {
    if (S.phase === 'scanning') {
      var sym = API.symbols[Math.min(S.step, API.symbols.length - 1)];
      return '<div class="ai-hero scanning">' +
        window.NexLoader() +
        '<b>Scanning the market</b>' +
        '<span class="ai-sub num">' + sym.name + '</span>' +
        '<div class="ai-progress"><i style="width:' +
          Math.round((S.step + 1) / API.symbols.length * 100) + '%"></i></div>' +
      '</div>';
    }

    if (S.phase === 'idle') {
      return '<div class="ai-hero">' +
        window.NexLoader() +
        '<b>Signal engine</b>' +
        '<span class="ai-sub">Reads the last ' + WINDOW + ' ticks on all ' +
          API.symbols.length + ' instruments and ranks the digit contracts by expected return.</span>' +
        '<button class="ai-go" id="aiScan">' + I('radar', 17) + 'Scan the market</button>' +
      '</div>';
    }

    var best = S.signals[0];
    return '<div class="ai-hero done">' +
      '<span class="label">Strongest edge found</span>' +
      '<b class="ai-headline">' + best.label + '</b>' +
      '<span class="ai-sub">' + best.symbolName + ' · ' + F.pct(best.prob * 100, 1) +
        ' of the last ' + best.sample + ' ticks</span>' +
      '<button class="ai-go ghost" id="aiScan">' + I('radar', 16) + 'Scan again</button>' +
    '</div>';
  }

  function signalRows() {
    if (S.phase !== 'done') return '';
    return '<div class="ai-sect label">Ranked signals</div>' +
      '<div class="list">' + S.signals.map(function (s) {
        var good = s.edge >= 0;
        var conf = Math.max(0, Math.min(100, s.prob * 100));
        return '<button class="ai-row' + (s.symbol === S.pick ? ' on' : '') +
            '" data-pick="' + s.symbol + '">' +
          '<span class="ai-badge ' + (good ? 'pos' : 'neg') + '">' + I('spark', 15) + '</span>' +
          '<span class="ai-t">' +
            '<b>' + s.label + '</b>' +
            '<span>' + s.symbolName + '</span>' +
            '<span class="ai-meter"><i style="width:' + conf.toFixed(0) + '%"></i></span>' +
          '</span>' +
          '<span class="ai-p">' +
            '<b class="num">' + F.pct(conf, 1) + '</b>' +
            '<span class="num ' + (good ? 'pos' : 'neg') + '">' +
              F.signedPct(s.edge * 100) + ' EV</span>' +
          '</span>' +
        '</button>';
      }).join('') + '</div>';
  }

  function ticketCard() {
    var sig = current();
    if (S.phase !== 'done' || !sig) return '';

    return '<div class="ai-sect label">Trade ticket</div>' +
      '<div class="ai-ticket">' +
        '<div class="ai-tline">' +
          '<span class="label">Contract</span>' +
          '<b>' + sig.label + ' · ' + sig.symbolName + '</b>' +
        '</div>' +
        '<div class="stack-row">' +
          '<span class="label">Duration</span>' +
          '<div class="pickline">' +
            '<button class="stepbtn" data-aiticks="-1" aria-label="Fewer ticks">' + I('minus', 14) + '</button>' +
            '<b class="num">' + S.ticks + '</b><span class="unit">ticks</span>' +
            '<button class="stepbtn" data-aiticks="1" aria-label="More ticks">' + I('plus', 14) + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="stake' + (S.error ? ' invalid' : '') + '">' +
          '<button data-aistake="-1" aria-label="Decrease stake">' + I('minus', 15) + '</button>' +
          '<div class="f"><input id="aiStake" value="' + stakeShown() + '" inputmode="decimal" aria-label="Stake">' +
            '<span class="cur">' + API.money.stakeCurrency() + '</span></div>' +
          '<button data-aistake="1" aria-label="Increase stake">' + I('plus', 15) + '</button>' +
        '</div>' +
        (S.error ? '<div class="field-error" role="alert">' + S.error + '</div>' : '') +
        '<div class="session"><span>Payout if it lands</span><span class="num">' +
          F.usd(API.contracts.payoutFor(sig.type, S.stake)) + '</span></div>' +
        '<label class="ai-auto">' +
          '<span><b>Let the engine place it</b>' +
          '<span>Every scan writes its top signal automatically.</span></span>' +
          '<i class="switch" id="aiAuto" role="switch" aria-checked="' + S.auto + '"></i>' +
        '</label>' +
      '</div>' +
      '<div class="ai-dock">' +
        '<button class="tbtn even" id="aiPlace">' +
          '<div class="t">Place ' + sig.label + '</div>' +
          '<div class="s">' + F.money(S.stake) + ' · ' + F.ticks(S.ticks) + '</div>' +
        '</button>' +
      '</div>';
  }

  function tradeLog() {
    var mine = API.contracts.all().filter(function (c) { return c.run === 'AI'; }).slice(0, 8);
    if (!mine.length) return '';
    return '<div class="ai-sect label">Placed by the engine</div>' +
      '<div class="list">' + mine.map(function (c) {
        var open = c.status === 'open';
        var cls = open ? 'live' : c.profit >= 0 ? 'pos' : 'neg';
        return '<div class="trow">' +
          '<span class="ico ' + cls + '">' + I(open ? 'clock' : c.profit >= 0 ? 'check' : 'close', 15) + '</span>' +
          '<span class="t"><b>' + API.contracts.label(c) + '</b>' +
            '<span>' + c.symbolName + ' · ' + F.time(c.entryTime) + '</span></span>' +
          '<span class="p"><span class="num ' + (open ? '' : cls) + '">' +
            (open ? F.money(c.value) : F.signedMoney(c.profit)) + '</span>' +
            '<span class="sub">' + (open ? 'running' : c.status) + '</span></span>' +
        '</div>';
      }).join('') + '</div>';
  }

  function render() {
    if (!el.root) return;
    var focused = document.activeElement && document.activeElement.id === 'aiStake';
    var caret = focused ? document.activeElement.selectionStart : null;

    html(el.root, scanCard() + signalRows() + ticketCard() + tradeLog() +
      '<div style="height:18px"></div>');

    if (focused) {
      var box = $('aiStake');
      if (box) { box.focus(); try { box.setSelectionRange(caret, caret); } catch (e) {} }
    }
  }

  /* ---------- events ---------- */
  function wire(root) {
    root.addEventListener('click', function (e) {
      var t = e.target;
      if (!t.closest) return;

      if (t.closest('#aiScan')) { startScan(); return; }

      var pick = t.closest('[data-pick]');
      if (pick) { S.pick = pick.getAttribute('data-pick'); S.error = null; render(); return; }

      var tk = t.closest('[data-aiticks]');
      if (tk) {
        S.ticks = Math.max(1, Math.min(10, S.ticks + (+tk.getAttribute('data-aiticks'))));
        render();
        return;
      }

      var st = t.closest('[data-aistake]');
      if (st) {
        var step = API.money.stakeChips().step;
        setStake(stakeShown() + (+st.getAttribute('data-aistake')) * step);
        return;
      }

      if (t.closest('#aiAuto')) {
        S.auto = !S.auto;
        render();
        window.NexToast(S.auto ? 'The engine will place its top signal' : 'Automatic placing is off');
        return;
      }

      if (t.closest('#aiPlace')) { place(false); return; }
    });

    root.addEventListener('input', function (e) {
      if (e.target.id !== 'aiStake') return;
      setStakeShown(e.target.value);
    });
  }

  /* ---------- mount ---------- */
  function init() {
    API = window.NexAPI; F = window.NexFmt; I = window.NexIcon;
    var root = $('aiPage');
    if (!root) return;
    el.root = root;

    if (!root.__stakeSet) {
      root.__stakeSet = true;
      S.stake = API.money.stakeChips().start;
    }

    unsub.forEach(function (f) { f(); });
    unsub = [];
    clearInterval(timer);
    S.phase = 'idle';
    S.signals = [];

    if (!root.__wired) { root.__wired = true; wire(root); }

    API.ready(function () {
      document.body.classList.remove('loading');
      render();

      /* while results are on screen, keep them honest against the feed, but only every second or so, or the list would rebuild under the
         finger on every tick */
      var lastRefresh = 0;
      unsub.push(API.on('tick', function () {
        if (S.phase !== 'done') return;
        if (document.activeElement && document.activeElement.id === 'aiStake') return;
        if (Date.now() - lastRefresh < 1200) return;
        lastRefresh = Date.now();
        rescan();
        render();
      }));
      unsub.push(API.on('settled', function (c) {
        if (c.run !== 'AI') return;
        window.NexToast(c.status === 'won'
          ? 'AI trade won ' + F.money(c.payout)
          : 'AI trade lost ' + F.money(c.stake));
        render();
      }));
      unsub.push(API.on('balance', render));
    });
  }

  window.NexAI = { init: init, state: S };
})();
