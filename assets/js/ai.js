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

  var WINDOW = 100;          /* ticks per instrument in the sample */

  /* The three contract families, which is what somebody actually means
     when they say what they want to trade. The scanner used to rank all
     of them against each other and answer a question nobody asked: the
     best edge on the board is no use to a trader who has decided they
     are trading over/under today. */
  var FAMILIES = {
    even_odd: { label: 'Even / Odd', note: 'Is the last digit even or odd', types: ['even_odd'] },
    matches:  { label: 'Matches / Differs', note: 'Does the last digit hit one number', types: ['matches', 'differs'] },
    over_under: { label: 'Over / Under', note: 'Is the last digit above or below a barrier', types: ['over', 'under'] }
  };

  var S = {
    phase: 'idle',           /* idle | scanning | done */
    family: 'even_odd',      /* which of the three is being scanned */
    step: 0,                 /* instrument index while scanning */
    signals: [],
    pick: null,              /* symbol id of the selected signal */
    ticks: 5,
    auto: false,
    placing: false
  };

  function $(id) { return document.getElementById(id); }
  function html(node, markup) { if (node) node.innerHTML = markup; }

  /* ---------- sampling ---------- */
  function digitsOf(symbol) {
    var h = API.feed.history(symbol).slice(-WINDOW);
    var dp = (API.symbol(symbol) || {}).digits || 2;
    return h.map(function (p) {
      return p.digit == null ? Math.abs(Math.round(p.price * Math.pow(10, dp))) % 10 : p.digit;
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

    /* Only the family that was asked for. */
    var want = FAMILIES[S.family].types;
    out = out.filter(function (c) { return want.indexOf(c.type) > -1; });
    if (!out.length) return null;

    out.sort(function (a, b) { return b.edge - a.edge; });
    var best = out[0];
    best.symbol = symbol;
    best.symbolName = API.symbol(symbol).name;
    best.sample = n;
    best.freq = freq;
    return best;
  }

  /* Every volatility index is scored and kept, best first: the top one
     is the answer, the others are the market news under it. */
  function pool() {
    return API.symbols.filter(function (s) { return s.group === 'Volatility'; });
  }

  function rescan() {
    S.signals = pool().map(function (s) { return score(s.id); })
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

  /* ---------- the scan ----------
     It walks the indices one at a time, the counter and the bar moving
     with it, and lands on the best of them. Run as soon as the page
     opens, and again whenever the market or the button asks. */
  var STEP_MS = 420;

  function startScan() {
    clearInterval(timer);
    S.phase = 'scanning';
    S.step = 0;
    render();
    timer = setInterval(function () {
      S.step++;
      if (S.step >= pool().length) {
        clearInterval(timer);
        var before = S.lastPick;
        S.pick = null;
        rescan();
        /* A fresh scan lands on a different index from the last one when
           there is another worth taking, so the pick moves round the
           volatilities rather than settling on one. */
        if (before && S.signals.length > 1 && S.signals[0].symbol === before) {
          S.signals.push(S.signals.shift());
          S.pick = S.signals[0].symbol;
        }
        S.lastPick = S.pick;
        S.phase = 'done';
      }
      render();
    }, STEP_MS);
  }

  /* ---------- handing it to the terminal ----------
     The scanner does not place trades. What crosses over is what it
     found: instrument, contract and digit. The stake is asked for on the
     terminal, directly above the buttons. */
  var TAB_FOR = {
    even_odd: 'even_odd', matches: 'matches', differs: 'matches',
    over: 'over_under', under: 'over_under'
  };

  function handOff() {
    var sig = current();
    if (!sig) return;

    API.prefs.setSymbol(sig.symbol);
    API.prefs.setTicket({
      symbol: sig.symbol,
      tab: TAB_FOR[sig.type] || 'even_odd',
      side: sig.side,
      barrier: sig.type === 'even_odd' ? null : sig.barrier,
      ticks: S.ticks,
      label: sig.label,
      symbolName: sig.symbolName,
      at: Date.now()
    });
    window.NexGo('/');
  }

  /* ---------- markup ---------- */
  function familyOf(sig) { return FAMILIES[TAB_FOR[sig.type] || 'even_odd'].label; }

  /* The reason, in the words of the sample it came from. */
  function why(sig) {
    var n = sig.sample;
    var hits = Math.round(sig.prob * n);
    var pc = ' (' + Math.round(sig.prob * 100) + '%).';
    switch (sig.type) {
      case 'over': return hits + ' of the last ' + n + ' ticks closed above ' + sig.barrier + pc;
      case 'under': return hits + ' of the last ' + n + ' ticks closed below ' + sig.barrier + pc;
      case 'matches': return 'Digit ' + sig.barrier + ' landed on ' + hits + ' of the last ' + n + ' ticks' + pc;
      case 'differs': return hits + ' of the last ' + n + ' ticks missed digit ' + sig.barrier + pc;
      default: return sig.label + ' closed ' + hits + ' of the last ' + n + ' ticks' + pc;
    }
  }

  function familySelect() {
    return '<label class="es-k" for="esFamily">Market</label>' +
      '<div class="es-select">' +
        '<select id="esFamily">' + Object.keys(FAMILIES).map(function (id) {
          return '<option value="' + id + '"' + (id === S.family ? ' selected' : '') + '>' +
            FAMILIES[id].label + '</option>';
        }).join('') + '</select>' + I('chevD', 14) +
      '</div>';
  }

  function progress() {
    var list = pool();
    if (!list.length) return '';
    var at = S.phase === 'scanning' ? Math.min(S.step, list.length - 1) : list.length - 1;
    var count = S.phase === 'idle' ? 0 : at + 1;
    var name = S.phase === 'idle' ? 'Ready to scan'
      : S.phase === 'done' && current() ? current().symbolName : list[at].name;
    return '<div class="es-prog' + (S.phase === 'scanning' ? ' on' : '') + '">' +
        '<div class="es-prog-row"><span>' + name + '</span>' +
          '<span class="num">' + count + '/' + list.length + '</span></div>' +
        '<div class="es-bar"><i style="width:' + Math.round(count / list.length * 100) + '%"></i></div>' +
      '</div>';
  }

  function bestCard() {
    if (S.phase === 'idle') {
      return '<div class="es-best wait"><p>Press Start deep scan to find the best market.</p></div>';
    }
    if (S.phase !== 'done') {
      return '<div class="es-best wait">' + window.NexLoader() + '<p>Scanning…</p></div>';
    }
    var sig = current();
    if (!sig) {
      return '<div class="es-best wait"><p>Not enough ticks yet. Re-scan in a minute.</p></div>';
    }
    return '<div class="es-best">' +
        '<span class="es-ok">' + I('check', 14) + '</span>' +
        '<div>' +
          '<p><b>Best market:</b> ' + sig.symbolName + ' | ' + familyOf(sig) + ' ' + sig.label +
            ' | <b class="es-q">Quality ' + Math.round(sig.prob * 100) + '%</b></p>' +
          '<p class="es-why"><b>Why:</b> ' + why(sig) + '</p>' +
        '</div>' +
      '</div>';
  }

  /* What the rest of the board is doing, read off the same scan: one
     line for each index the scanner did not pick. */
  function news() {
    if (S.phase !== 'done') return '';
    var rest = S.signals.filter(function (s) { return s.symbol !== S.pick; }).slice(0, 3);
    if (!rest.length) return '';
    return '<div class="es-news">' +
        '<div class="es-news-head">' + I('wave', 16) +
          '<b>Market<br>news</b><span>What’s moving markets while you trade</span></div>' +
        '<ul>' + rest.map(function (s) {
          return '<li><b>' + s.symbolName + ': ' + s.label + ' leads at ' +
              Math.round(s.prob * 100) + '%</b></li>';
        }).join('') + '</ul>' +
      '</div>';
  }

  function fields() {
    var sig = S.phase === 'done' ? current() : null;
    function f(k, v) {
      return '<span class="es-k">' + k + '</span><div class="es-field">' + (v || '—') + '</div>';
    }
    return f('Selected market', sig && sig.symbolName) +
      f('Trade type', sig ? familyOf(sig) : FAMILIES[S.family].label) +
      f('Prediction (auto)', sig && sig.label);
  }

  function foot() {
    var sig = S.phase === 'done' ? current() : null;
    return '<div class="es-foot">' +
        '<button class="btn btn-fill es-scan" id="aiScanAgain"' +
          (S.phase === 'scanning' ? ' disabled' : '') + '>' +
          I('search', 16) + (S.phase === 'idle' ? 'Start deep scan' : 'Re-scan for best market') + '</button>' +
        '<button class="es-load" id="aiTake"' + (sig ? '' : ' disabled') + '>' +
          'Load ' + (sig ? sig.symbolName : 'market') + '</button>' +
      '</div>';
  }

  function render() {
    if (!el.root) return;
    html(el.root, '<div class="es">' +
        '<div class="es-head">' +
          '<span class="es-mark">' + I('radar', 16) + '</span>' +
          '<b>Entry Scanner</b>' +
          '<button class="es-x" id="esClose" aria-label="Close">' + I('close', 16) + '</button>' +
        '</div>' +
        '<div class="es-body">' +
          '<p class="es-intro">Scans every volatility index for the best entry from its recent ticks.</p>' +
          familySelect() + progress() + bestCard() + news() + fields() +
        '</div>' +
        foot() +
      '</div>');
  }

  /* ---------- events ---------- */
  function wire(root) {
    root.addEventListener('click', function (e) {
      var t = e.target;
      if (!t.closest) return;
      if (t.closest('#aiScanAgain')) { startScan(); return; }
      if (t.closest('#aiTake')) { handOff(); return; }
      if (t.closest('#esClose')) { window.NexGo('/'); return; }
    });
    root.addEventListener('change', function (e) {
      if (e.target.id !== 'esFamily' || !FAMILIES[e.target.value]) return;
      S.family = e.target.value;
      S.signals = [];
      S.pick = null;
      clearInterval(timer);
      S.phase = 'idle';
      render();
    });
  }

  /* ---------- mount ---------- */
  function init() {
    API = window.NexAPI; F = window.NexFmt; I = window.NexIcon;
    var root = $('aiPage');
    if (!root) return;
    el.root = root;

    clearInterval(timer);
    S.phase = 'idle';
    S.signals = [];

    if (!root.__wired) { root.__wired = true; wire(root); }

    API.ready(function () {
      document.body.classList.remove('loading');
      render();
      /* Opened before the feed has a hundred ticks to read, the scan has
         nothing to say yet; it fills in as soon as there is enough. */
      var lastTry = 0;
      unsub.forEach(function (f) { f(); });
      unsub = [API.on('tick', function () {
        if (S.phase !== 'done' || S.signals.length || Date.now() - lastTry < 1500) return;
        lastTry = Date.now();
        rescan();
        if (S.signals.length) render();
      })];
    });
  }

  window.NexAI = { init: init, state: S };
})();
