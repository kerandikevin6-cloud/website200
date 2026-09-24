/* ============================================================
   Novi, first-run tour
   Eight steps for a new account, shown once on the trade screen:
   where the money is, how to fund it, what to trade, how a trade is
   placed, the scanner, and what stands between a win and a payout.
   Nothing else. A tour that points at everything teaches nothing.

   Each step lights up the real control rather than a picture of it,
   so what somebody learns is where the thing actually is. A step whose
   control is not on screen (a phone has no rail, a desktop has no
   bottom bar) falls back to the next place it lives, and failing that
   to a card in the middle.
   ============================================================ */
(function () {
  "use strict";

  var SEEN = 'nexas.tour.v1.';
  var NEW_FOR_MS = 14 * 86400000;     /* how long an account counts as new */

  function I(name, size) { return window.NexIcon ? window.NexIcon(name, size) : ''; }

  /* First visible match. A selector, or a function returning a node. */
  function find(targets) {
    for (var i = 0; i < (targets || []).length; i++) {
      var t = targets[i];
      var list = typeof t === 'function' ? [t()] : document.querySelectorAll(t);
      for (var j = 0; j < list.length; j++) {
        var n = list[j];
        if (!n) continue;
        var r = n.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && getComputedStyle(n).visibility !== 'hidden') return n;
      }
    }
    return null;
  }
  function navTo(label) {
    return function () {
      var links = document.querySelectorAll('.tabbar a, .rail .rnav');
      for (var i = 0; i < links.length; i++) {
        var lab = links[i].querySelector('.tb-lab, .rnav-lab');
        if (lab && lab.textContent.trim() === label) {
          var r = links[i].getBoundingClientRect();
          if (r.width > 0 && r.height > 0) return links[i];
        }
      }
      return null;
    };
  }

  var STEPS = [
    {
      icon: 'spark',
      title: 'Welcome to Novi',
      body: 'A quick look at the parts that matter: eight steps, under a minute. ' +
        'You can skip it and come back to anything later.'
    },
    {
      targets: ['#acctBtn'],
      icon: 'coin',
      title: 'Your balance',
      body: 'This is the account you are trading. Practice on the demo account with ' +
        'virtual funds, and tap here to switch to your real account when you are ready.'
    },
    {
      targets: ['.topbar .btn-primary', '.rail [data-open="deposit"]'],
      icon: 'down',
      title: 'Deposit',
      body: 'Fund your real account with M-Pesa, card or USDT. Deposits usually land ' +
        'within two minutes.'
    },
    {
      targets: ['#chartInst', '#chartPin'],
      icon: 'candles',
      title: 'Pick a market',
      body: 'Choose a volatility index here. Each one ticks every second or two, and ' +
        'the last digit of each price is what the contracts are about.'
    },
    {
      targets: ['#contractTabs'],
      icon: 'parity',
      title: 'Choose a contract',
      body: 'Even or Odd, Matches or Differs, Over or Under: each asks a different ' +
        'question about that last digit, and pays a different amount.'
    },
    {
      targets: ['#panel', '#modeSeg'],
      icon: 'sliders',
      title: 'Set your stake and trade',
      body: 'Manual places a single trade. Auto keeps trading until it reaches your ' +
        'target profit or stop loss. Set the stake, then press a side at the bottom.'
    },
    {
      targets: [navTo('AI')],
      icon: 'radar',
      title: 'Let the AI scan',
      body: 'The AI scanner reads the recent ticks on every volatility index and loads ' +
        'its best pick into the terminal for you. Nothing is placed until you press a side.'
    },
    {
      targets: ['.rail [data-open="verify"]', '#menuBtn'],
      icon: 'shield',
      title: 'Verify to withdraw',
      body: 'Before your first payout, send your proof of address and both sides of your ' +
        'ID from Verify identity in the menu. It is checked within the hour.',
      last: true
    }
  ];

  var S = { i: 0, el: null, target: null, user: null };

  function seenKey() { return SEEN + (S.user || 'local'); }
  function markSeen() { try { localStorage.setItem(seenKey(), '1'); } catch (e) {} }
  function seen(user) {
    try { return localStorage.getItem(SEEN + (user || 'local')) === '1'; } catch (e) { return true; }
  }

  function build() {
    var el = document.createElement('div');
    el.className = 'tour';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.innerHTML = '<div class="tour-hole"></div>' +
      '<div class="tour-card" tabindex="-1">' +
        '<div class="tour-top">' +
          '<span class="tour-ico"></span>' +
          '<span class="tour-count"></span>' +
          '<button class="tour-x" type="button" data-tour="skip" aria-label="Close the tour">' + I('close', 16) + '</button>' +
        '</div>' +
        '<h3 class="tour-title"></h3>' +
        '<p class="tour-body"></p>' +
        '<div class="tour-dots"></div>' +
        '<div class="tour-btns">' +
          '<button class="tour-skip" type="button" data-tour="skip">Skip</button>' +
          '<button class="tour-back" type="button" data-tour="back">Back</button>' +
          '<button class="tour-next" type="button" data-tour="next">Next</button>' +
        '</div>' +
      '</div>';
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-tour]');
      if (!b) return;
      var a = b.getAttribute('data-tour');
      if (a === 'skip') end();
      else if (a === 'back') show(S.i - 1);
      else if (a === 'next') { if (STEPS[S.i].last) end(); else show(S.i + 1); }
    });
    document.body.appendChild(el);
    return el;
  }

  function show(i) {
    if (i < 0 || i >= STEPS.length) return;
    S.i = i;
    var step = STEPS[i];
    var el = S.el;

    el.querySelector('.tour-ico').innerHTML = I(step.icon, 18);
    el.querySelector('.tour-count').textContent = (i + 1) + ' of ' + STEPS.length;
    el.querySelector('.tour-title').textContent = step.title;
    el.querySelector('.tour-body').textContent = step.body;
    el.querySelector('.tour-dots').innerHTML = STEPS.map(function (_, k) {
      return '<i class="' + (k === i ? 'on' : k < i ? 'done' : '') + '"></i>';
    }).join('');
    el.querySelector('.tour-back').hidden = i === 0;
    el.querySelector('.tour-skip').hidden = !!step.last;
    el.querySelector('.tour-next').textContent = i === 0 ? 'Show me around'
      : step.last ? 'Start trading' : 'Next';

    S.target = find(step.targets);
    if (S.target && S.target.scrollIntoView) {
      S.target.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }
    place();
    var card = el.querySelector('.tour-card');
    try { card.focus({ preventScroll: true }); } catch (e) {}
  }

  /* The hole sits over the control; the card goes below it if it fits,
     above it if not, and in the middle when there is nothing to point at. */
  function place() {
    if (!S.el) return;
    var hole = S.el.querySelector('.tour-hole');
    var card = S.el.querySelector('.tour-card');
    var vw = window.innerWidth, vh = window.innerHeight;
    var pad = 6, gap = 12, edge = 16;

    if (!S.target) {
      S.el.classList.add('centred');
      hole.style.cssText = '';
      card.style.left = card.style.top = '';
      return;
    }
    S.el.classList.remove('centred');

    var r = S.target.getBoundingClientRect();
    var top = Math.max(4, r.top - pad), left = Math.max(4, r.left - pad);
    var w = Math.min(vw - 8, r.width + pad * 2), h = Math.min(vh - 8, r.height + pad * 2);
    hole.style.cssText = 'top:' + top + 'px;left:' + left + 'px;width:' + w + 'px;height:' + h + 'px';

    var cw = card.offsetWidth, ch = card.offsetHeight;
    var cx = Math.min(Math.max(edge, r.left + r.width / 2 - cw / 2), vw - cw - edge);
    var cy = top + h + gap;
    if (cy + ch > vh - edge) cy = top - gap - ch;          /* above */
    if (cy < edge) cy = Math.max(edge, (vh - ch) / 2);     /* too tall either way */
    card.style.left = cx + 'px';
    card.style.top = cy + 'px';
  }

  function onKey(e) {
    if (!S.el) return;
    if (e.key === 'Escape') end();
    else if (e.key === 'ArrowRight') { if (!STEPS[S.i].last) show(S.i + 1); }
    else if (e.key === 'ArrowLeft') show(S.i - 1);
  }

  function start(user) {
    if (S.el) return;
    S.user = user || null;
    S.el = build();
    document.body.classList.add('touring');
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    document.addEventListener('keydown', onKey);
    requestAnimationFrame(function () {
      S.el.classList.add('open');
      show(0);
    });
  }

  function end() {
    markSeen();
    if (!S.el) return;
    var el = S.el;
    S.el = null;
    S.target = null;
    document.body.classList.remove('touring');
    window.removeEventListener('resize', place);
    window.removeEventListener('scroll', place, true);
    document.removeEventListener('keydown', onKey);
    el.classList.remove('open');
    setTimeout(function () { el.remove(); }, 220);
  }

  /* Once per account, on the trade screen, for an account that is new.
     Waits for the terminal to be drawn so there is something to point
     at, and for any dialog already open to be dealt with first. */
  function maybeStart() {
    if (document.body.getAttribute('data-page') !== 'trade') return;
    var API = window.NexAPI;
    if (!API || !API.session) return;

    API.ready(function () {
      setTimeout(function tryStart(n) {
        n = n || 0;
        var s = API.session.get();
        if (!s) return;
        if (seen(s.id)) return;
        if (s.createdAt && Date.now() - new Date(s.createdAt).getTime() > NEW_FOR_MS) return;
        if (document.body.getAttribute('data-page') !== 'trade') return;
        /* Something else is on screen: a dialog, or the page still
           loading. Look again shortly, for a while. */
        var busy = document.querySelector('.modal.open') ||
          document.body.classList.contains('loading') || !document.getElementById('panel') ||
          !document.querySelector('#panel .stake-block');
        if (busy) { if (n < 40) setTimeout(function () { tryStart(n + 1); }, 500); return; }
        start(s.id);
      }, 900);
    });
  }

  window.NexTour = { maybeStart: maybeStart, start: function () {
    var s = window.NexAPI && window.NexAPI.session.get();
    start(s && s.id);
  }, end: end };
})();
