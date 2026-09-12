/* ============================================================
   Nexas — shell
   Injects the chrome (top bar, drawer, tab bar), owns the modal
   engine, theme, session guard, connection banner and consent
   surfaces. Page-specific logic lives in trade.js / positions.js.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- icons ---------- */
  var I = {
    menu: 'M3 6h18M3 12h18M3 18h18',
    chart: 'M3 17l6-6 4 4 7-7|M14 8h6v6',
    globe: 'M3 12h18|M12 3a15 15 0 010 18 15 15 0 010-18',
    book: 'M3 9h18M9 9v11',
    shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
    user: 'M4 20a8 8 0 0116 0',
    down: 'M12 5v14M5 12l7 7 7-7',
    up: 'M12 19V5M5 12l7-7 7 7',
    chat: 'M21 15a2 2 0 01-2 2H8l-5 4V5a2 2 0 012-2h14a2 2 0 012 2z',
    moon: 'M20 14a8 8 0 01-10-10 8 8 0 1010 10z',
    sun: 'M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
    out: 'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4|M16 17l5-5-5-5M21 12H9',
    chev: 'M9 18l6-6-6-6',
    chevD: 'M6 9l6 6 6-6',
    back: 'M15 18l-6-6 6-6',
    close: 'M6 6l12 12M18 6L6 18',
    bell: 'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9|M13.7 21a2 2 0 01-3.4 0',
    idcard: 'M3 5h18v14H3z|M7 10h3M7 14h6M15 9h3v4h-3z',
    lock: 'M5 11h14v10H5z|M8 11V7a4 4 0 118 0v4',
    phone: 'M9 2h6a2 2 0 012 2v16a2 2 0 01-2 2H9a2 2 0 01-2-2V4a2 2 0 012-2z|M10.8 18.6h2.4',
    card: 'M3 8.5A2.5 2.5 0 015.5 6h13A2.5 2.5 0 0121 8.5v7a2.5 2.5 0 01-2.5 2.5h-13A2.5 2.5 0 013 15.5z|M3 10.5h18',
    coin: 'M12 6.2v11.6|M14.7 9.4A2.7 2.7 0 0012 8.2c-1.5 0-2.7.9-2.7 2s1.2 1.9 2.7 1.9 2.7.8 2.7 1.9-1.2 2-2.7 2a2.7 2.7 0 01-2.6-1.3',
    send: 'M4 12l16-8-6 16-2.5-6z',
    check: 'M5 13l4 4L19 7',
    minus: 'M5 12h14',
    plus: 'M12 5v14M5 12h14',
    clock: 'M12 7v5l3 2',
    sliders: 'M4 6h16M4 12h16M4 18h16|M9 4v4M15 10v4M7 16v4'
  };
  function icon(name, size) {
    var d = I[name] || '', parts = d.split('|'), body = '';
    if (name === 'globe' || name === 'coin' || name === 'clock') body += '<circle cx="12" cy="12" r="9"></circle>';
    if (name === 'user') body = '<circle cx="12" cy="8" r="3.4"></circle>';
    if (name === 'book') body = '<rect x="3" y="4" width="18" height="16" rx="2"></rect>';
    for (var i = 0; i < parts.length; i++) if (parts[i]) body += '<path d="' + parts[i] + '"></path>';
    return '<svg width="' + (size || 17) + '" height="' + (size || 17) + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + body + '</svg>';
  }
  window.NexIcon = icon;

  var API = window.NexAPI, F = window.NexFmt;

  /* ---------- routing ---------- */
  var BUNDLE = !!window.NEXAS_BUNDLE;
  function href(file) { return BUNDLE ? '#/' + file.replace('.html', '') : file; }
  function go(file) {
    if (BUNDLE) location.hash = '#/' + file.replace('.html', '');
    else location.href = file;
  }
  window.NexHref = href;
  window.NexGo = go;
  function currentPage() { return document.body.getAttribute('data-page') || 'trade'; }

  /* ---------- theme ---------- */
  var THEME_KEY = 'nexas.theme';
  function storedTheme() { try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; } }
  function isDark() {
    var t = document.documentElement.getAttribute('data-theme');
    if (t) return t === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function applyTheme(t) {
    if (t) document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
    try { t ? localStorage.setItem(THEME_KEY, t) : localStorage.removeItem(THEME_KEY); } catch (e) {}
    var sw = document.getElementById('themeSwitch');
    if (sw) sw.setAttribute('aria-checked', String(isDark()));
  }
  applyTheme(storedTheme());

  /* ---------- chrome ---------- */
  var TABS = [
    { id: 'trade', label: 'Trade', file: 'index.html', icon: 'chart' },
    { id: 'markets', label: 'Markets', file: 'markets.html', icon: 'globe' },
    { id: 'positions', label: 'Positions', file: 'positions.html', icon: 'book' },
    { id: 'responsible', label: 'Limits', file: 'responsible.html', icon: 'shield' }
  ];

  function balanceMarkup() {
    var kind = API.account.kind();
    return '<i class="acct-dot ' + kind + '"></i><span class="acct-kind">' + kind + '</span>' +
      '<span class="bal num">' + F.amount(API.account.balance()) + '</span>' + icon('chevD', 12);
  }

  function topbar(page) {
    var back = document.body.getAttribute('data-back');
    var title = document.body.getAttribute('data-title');

    if (title) {
      return '<header class="topbar">' +
        '<a class="iconbtn" href="' + href(back || 'index.html') + '" aria-label="Back">' + icon('back', 19) + '</a>' +
        '<div class="topbar-title">' + title + '</div>' +
        '<span class="iconbtn" aria-hidden="true"></span>' +
      '</header>';
    }

    var menu = '<nav class="deskmenu only-desk">' + TABS.map(function (t) {
      return '<a href="' + href(t.file) + '" class="' + (t.id === page ? 'active' : '') + '">' +
        (t.id === 'responsible' ? 'Responsible Trading' : t.label) + '</a>';
    }).join('') + '</nav>';

    return '<header class="topbar">' +
      '<button class="iconbtn only-mob" id="menuBtn" aria-label="Open menu">' + icon('menu', 19) + '</button>' +
      '<a class="wordmark only-desk" href="' + href('index.html') + '">Nexas</a>' +
      menu +
      '<span class="spacer"></span>' +
      '<button class="acct" data-open="switch" id="acctBtn" aria-label="Switch account">' + balanceMarkup() + '</button>' +
      '<button class="btn-primary" data-open="deposit">Deposit</button>' +
      '<button class="iconbtn bell" data-open="alerts" aria-label="Notifications">' + icon('bell', 18) + '<i></i></button>' +
    '</header>';
  }

  function drawer() {
    function item(label, opts) {
      opts = opts || {};
      var tag = opts.href ? 'a' : 'button';
      var attrs = opts.href ? ' href="' + href(opts.href) + '"' : '';
      if (opts.modal) attrs += ' data-open="' + opts.modal + '"';
      var tail = opts.tail || (opts.href || opts.modal ? icon('chev', 15) : '');
      return '<' + tag + ' class="ditem ' + (opts.cls || '') + '"' + attrs + '>' +
        icon(opts.icon, 17) + '<span>' + label + '</span>' +
        (tail ? '<i class="chev">' + tail + '</i>' : '') + '</' + tag + '>';
    }
    function group(label, iconName, items, open) {
      return '<div class="dgroup' + (open ? ' open' : '') + '">' +
        '<button class="ditem dgroup-head" aria-expanded="' + !!open + '">' + icon(iconName, 17) +
          '<span>' + label + '</span><i class="chev caret">' + icon('chevD', 15) + '</i></button>' +
        '<div class="dgroup-body">' + items.join('') + '</div></div>';
    }
    var s = API.session.get() || {};

    return '<div class="scrim" id="scrim"></div>' +
      '<aside class="drawer" id="drawer" aria-label="Menu">' +
        '<a class="drawer-user" href="' + href('account.html') + '">' +
          '<div class="avatar">' + (s.name || 'A').charAt(0) + '</div>' +
          '<div><b>' + (s.name || 'Guest') + '</b><span>' + (s.email || 'not signed in') + '</span></div>' +
          icon('chev', 16) +
        '</a>' +
        '<div class="dnav">' +
          group('Account', 'user', [
            item('Profile and name', { icon: 'idcard', modal: 'profile' }),
            item('Update password', { icon: 'lock', modal: 'password' }),
            item('Verify identity', { icon: 'shield', modal: 'verify' })
          ], true) +
          group('Funds', 'coin', [
            item('Deposit', { icon: 'down', modal: 'deposit' }),
            item('Withdraw', { icon: 'up', modal: 'withdraw' })
          ], false) +
        '</div>' +
        '<div class="drawer-sect label">Support</div>' +
        '<div class="dnav">' +
          item('Live chat', { icon: 'chat', href: 'chat.html' }) +
          item('Responsible trading', { icon: 'shield', href: 'responsible.html' }) +
          item('Light / dark theme', {
            icon: isDark() ? 'moon' : 'sun',
            tail: '<i class="switch" id="themeSwitch" role="switch" aria-checked="' + isDark() + '"></i>',
            cls: 'theme-toggle'
          }) +
        '</div>' +
        '<div class="drawer-foot">' +
          '<button class="ditem danger" id="signOut">' + icon('out', 17) + '<span>Log out</span></button>' +
        '</div>' +
      '</aside>';
  }

  function tabbar(page) {
    return '<nav class="tabbar only-mob">' + TABS.map(function (t) {
      return '<a href="' + href(t.file) + '" class="' + (t.id === page ? 'active' : '') + '">' +
        icon(t.icon, 18) + t.label + '</a>';
    }).join('') + '</nav>';
  }

  /* ---------- modal engine ---------- */
  var state = { key: null, step: null, trail: [], data: {} };
  var lastFocus = null;

  function host() {
    var h = document.getElementById('modalHost');
    if (!h) { h = document.createElement('div'); h.id = 'modalHost'; document.body.appendChild(h); }
    return h;
  }
  var closeToken = 0;
  function openModal(key, stepId) {
    var def = window.NexModals && window.NexModals[key];
    if (!def) return;
    closeToken++;
    lastFocus = document.activeElement;
    state = { key: key, step: stepId || Object.keys(def.steps)[0], trail: [], data: {} };
    renderModal(true);
  }
  function gotoStep(id) { state.trail.push(state.step); state.step = id; renderModal(false); }
  function backStep() {
    if (!state.trail.length) return closeModals();
    state.step = state.trail.pop();
    renderModal(false);
  }
  function renderModal(fresh) {
    var def = window.NexModals[state.key], step = def.steps[state.step];
    var title = typeof step.title === 'function' ? step.title(state.data) : step.title;
    var sub = typeof step.sub === 'function' ? step.sub(state.data) : step.sub;

    host().innerHTML =
      '<div class="modal' + (fresh ? '' : ' open') + '" role="dialog" aria-modal="true" aria-label="' + title + '">' +
        '<div class="modal-bg" data-close></div>' +
        '<div class="modal-box">' +
          '<div class="modal-head">' +
            (state.trail.length ? '<button class="iconbtn" data-modal-back aria-label="Back">' + icon('back', 18) + '</button>' : '') +
            '<div><h2>' + title + '</h2>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' +
            '<button class="iconbtn" data-close aria-label="Close">' + icon('close', 18) + '</button>' +
          '</div>' + step.body(state.data) +
        '</div></div>';

    if (fresh) requestAnimationFrame(function () {
      var m = host().querySelector('.modal');
      if (m) m.classList.add('open');
    });
    var first = host().querySelector('input, select, button:not([data-close])');
    if (first) first.focus();
    var pw = host().querySelector('#newPassword');
    if (pw) paintMeter(pw);
  }
  function closeModals() {
    var m = host().querySelector('.modal');
    if (!m) return;
    m.classList.remove('open');
    var token = ++closeToken;
    setTimeout(function () { if (token === closeToken) host().innerHTML = ''; }, 220);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  window.NexModal = { open: openModal, close: closeModals, step: gotoStep, data: function () { return state.data; } };

  /* focus trap: modal first, otherwise the open drawer */
  function trap(e) {
    if (e.key !== 'Tab') return;
    var drawerEl = document.getElementById('drawer');
    var box = host().querySelector('.modal-box') ||
      (drawerEl && drawerEl.classList.contains('open') ? drawerEl : null);
    if (!box) return;
    var f = box.querySelectorAll('a[href], button:not([disabled]), input, select, textarea');
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---------- toast ---------- */
  var toastEl;
  window.NexToast = function (msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('open');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function () { toastEl.classList.remove('open'); }, 2600);
  };

  /* ---------- connection banner ---------- */
  function connectionBanner() {
    var b = document.getElementById('connBanner');
    if (!b) {
      b = document.createElement('div');
      b.id = 'connBanner';
      b.className = 'conn-banner';
      b.setAttribute('role', 'status');
      document.body.appendChild(b);
    }
    var st = API.connection.status();
    b.className = 'conn-banner' + (st === 'live' ? '' : ' show');
    b.innerHTML = st === 'live' ? '' : '<span class="spin"></span>' +
      (st === 'reconnecting' ? 'Reconnecting to the price feed' : 'Connecting');
    document.body.classList.toggle('feed-down', st !== 'live');
  }

  /* ---------- consent + risk ---------- */
  function consentBar() {
    if (API.prefs.consent()) return;
    var c = document.createElement('div');
    c.className = 'consent';
    c.innerHTML = '<p>We use essential cookies to keep you signed in. Nothing is shared with advertisers.</p>' +
      '<div class="consent-btns">' +
        '<button class="btn-mini" data-consent="essential">Essential only</button>' +
        '<button class="btn-mini solid" data-consent="all">Accept</button>' +
      '</div>';
    document.body.appendChild(c);
  }
  function riskStrip() {
    if (document.body.getAttribute('data-chrome') !== 'app') return;
    if (API.prefs.riskAck()) return;
    var main = document.querySelector('main');
    if (!main) return;
    var r = document.createElement('div');
    r.className = 'risk-strip';
    r.id = 'riskStrip';
    r.innerHTML = '<span>' + icon('shield', 15) + 'Trading synthetic indices carries risk. You can lose your full stake.</span>' +
      '<button class="iconbtn" id="riskClose" aria-label="Dismiss">' + icon('close', 15) + '</button>';
    main.insertBefore(r, main.firstChild);
  }

  /* ---------- sign-in transition ---------- */
  function splash(message, to) {
    var el = document.createElement('div');
    el.className = 'splash';
    el.innerHTML = '<div class="splash-inner">' +
      '<div class="pulse"><i></i><i></i><i></i></div>' +
      '<div class="splash-word">Nexas</div>' +
      '<div class="splash-msg" role="status">' + message + '</div></div>';
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('open'); });
    setTimeout(function () {
      if (BUNDLE) { go(to); el.remove(); } else location.href = to;
    }, 1600);
  }
  window.NexSplash = splash;

  /* ---------- session guard ---------- */
  function guard() {
    if (document.body.getAttribute('data-chrome') !== 'app') return true;
    if (API.session.get()) return true;
    go('login.html');
    return false;
  }

  /* ---------- password meter ---------- */
  function paintMeter(input) {
    var v = input.value, score = 0;
    if (v.length >= 8) score++;
    if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++;
    if (/\d/.test(v)) score++;
    if (/[^A-Za-z0-9]/.test(v)) score++;
    var wrap = input.closest('.field') || document;
    wrap.querySelectorAll('.meter i').forEach(function (bar, i) { bar.classList.toggle('on', i < score); });
  }

  /* ---------- chrome mount ---------- */
  function mountChrome(root) {
    var chrome = document.body.getAttribute('data-chrome');
    host();
    if (chrome === 'auth' || chrome === 'plain') return;
    var page = currentPage();
    var sub = !!document.body.getAttribute('data-back');
    if (sub) document.body.classList.add('no-tabs');
    root.insertAdjacentHTML('afterbegin', topbar(page));
    root.insertAdjacentHTML('beforeend', drawer() + (sub ? '' : tabbar(page)));
  }

  function setDrawer(open) {
    var d = document.getElementById('drawer'), s = document.getElementById('scrim');
    if (!d) return;
    d.classList.toggle('open', open);
    s.classList.toggle('open', open);
    document.body.classList.toggle('locked', open);
  }

  /* ---------- global events ---------- */
  function wire() {
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.closest) return;

      if (t.closest('#menuBtn')) { setDrawer(true); return; }
      if (t.closest('#scrim')) { setDrawer(false); return; }

      var themeBtn = t.closest('.theme-toggle');
      if (themeBtn) {
        e.preventDefault();
        applyTheme(isDark() ? 'light' : 'dark');
        var ic = themeBtn.querySelector('svg');
        if (ic) ic.outerHTML = icon(isDark() ? 'moon' : 'sun', 17);
        return;
      }

      var grp = t.closest('.dgroup-head');
      if (grp) {
        var opened = grp.parentElement.classList.toggle('open');
        grp.setAttribute('aria-expanded', String(opened));
        return;
      }

      if (t.closest('#signOut')) { API.session.signOut(); splash('Signing you out', 'login.html'); return; }

      var consent = t.closest('[data-consent]');
      if (consent) {
        API.prefs.setConsent(true);
        var bar = consent.closest('.consent');
        if (bar) bar.remove();
        return;
      }
      if (t.closest('#riskClose')) {
        API.prefs.setRiskAck(true);
        var strip = document.getElementById('riskStrip');
        if (strip) strip.remove();
        return;
      }

      var sp = t.closest('[data-splash]');
      if (sp && sp.tagName !== 'FORM') {
        e.preventDefault();
        API.session.signIn(null, 'google');
        splash(sp.getAttribute('data-splash'), sp.getAttribute('data-to') || 'index.html');
        return;
      }

      var mod = t.closest('[data-open]');
      if (mod) { e.preventDefault(); setDrawer(false); openModal(mod.getAttribute('data-open')); return; }

      if (t.closest('[data-close]')) { closeModals(); return; }
      if (t.closest('[data-modal-back]')) { backStep(); return; }

      var setter = t.closest('[data-set]');
      if (setter) {
        var pair = setter.getAttribute('data-set').split(':');
        state.data[pair[0]] = pair[1];
      }
      var step = t.closest('[data-goto]');
      if (step) { gotoStep(step.getAttribute('data-goto')); return; }

      var action = t.closest('[data-action]');
      if (action) { runAction(action.getAttribute('data-action'), action); return; }

      var done = t.closest('[data-done]');
      if (done) { closeModals(); window.NexToast(done.getAttribute('data-done')); return; }

      if (t.closest('[data-copy]')) { window.NexToast('Address copied'); return; }

      var amt = t.closest('[data-amount]');
      if (amt) {
        var box = amt.closest('.field').querySelector('input');
        box.value = amt.getAttribute('data-amount');
        box.dispatchEvent(new Event('input', { bubbles: true }));
        return;
      }

      var reveal = t.closest('[data-reveal]');
      if (reveal) {
        var inp = reveal.parentElement.querySelector('input');
        inp.type = inp.type === 'password' ? 'text' : 'password';
        return;
      }

      var seg = t.closest('.seg button, .ctabs .ctab');
      if (seg && !seg.hasAttribute('data-tab') && !seg.hasAttribute('data-mode') && !seg.hasAttribute('data-posview')) {
        var parent = seg.parentElement;
        parent.querySelectorAll('button').forEach(function (b) { b.classList.remove('active'); });
        seg.classList.add('active');
      }
    });

    document.addEventListener('input', function (e) {
      var el = e.target;
      if (el.id === 'newPassword') paintMeter(el);
      var total = document.querySelector('[data-total="' + el.id + '"]');
      if (total) {
        var fee = +(total.getAttribute('data-fee') || 0);
        total.textContent = F.money(Math.max(0, (+el.value || 0) - fee));
      }
    });

    document.addEventListener('submit', function (e) {
      var f = e.target;
      if (!f.hasAttribute) return;
      if (f.hasAttribute('data-splash')) {
        e.preventDefault();
        var email = f.querySelector('input[type=email]');
        API.session.signIn(email && email.value, 'password');
        splash(f.getAttribute('data-splash'), f.getAttribute('data-to') || 'index.html');
        return;
      }
      if (f.hasAttribute('data-demo-form')) {
        e.preventDefault();
        window.NexToast(f.getAttribute('data-demo-form'));
      }
    });

    document.addEventListener('keydown', function (e) {
      trap(e);
      if (e.key === 'Escape') { closeModals(); setDrawer(false); }
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'd') openModal('deposit');
      if (e.key === '?') openModal('shortcuts');
    });
  }

  /* actions that touch money or verification */
  function runAction(name, node) {
    if (name === 'deposit') {
      var amount = +((document.getElementById('amount') || {}).value) || 0;
      if (amount <= 0) return window.NexToast('Enter an amount to deposit');
      API.account.credit(amount, 'Deposit');
      closeModals();
      window.NexToast('Deposited ' + F.money(amount));
      return;
    }
    if (name === 'withdraw') {
      if (!API.kyc.verified()) { gotoStep('kyc'); return; }
      var w = +((document.getElementById('wAmount') || {}).value) || 0;
      if (w <= 0) return window.NexToast('Enter an amount to withdraw');
      if (w > API.account.balance()) return window.NexToast('Not enough funds');
      API.account.debit(w, 'Withdrawal');
      closeModals();
      window.NexToast('Withdrawal of ' + F.money(w) + ' submitted');
      return;
    }
    if (name === 'verify') {
      API.kyc.submit();
      closeModals();
      window.NexToast('Identity submitted — usually cleared within the hour');
      return;
    }
    if (name === 'useAccount') {
      var kind = node.getAttribute('data-kind');
      API.account.use(kind);
      closeModals();
      window.NexToast('Switched to the ' + kind + ' account');
      return;
    }
    if (name === 'saveAuto') {
      API.prefs.setAuto({
        runs: +document.getElementById('autoRuns').value || 10,
        multiplier: +document.getElementById('autoMult').value || 2,
        takeProfit: +document.getElementById('autoTP').value || 200,
        stopLoss: +document.getElementById('autoSL').value || 100
      });
      closeModals();
      window.NexToast('Run settings saved');
      return;
    }
  }

  /* ---------- live chrome updates ---------- */
  function bindChrome() {
    API.on('balance', function () {
      var b = document.getElementById('acctBtn');
      if (b) b.innerHTML = balanceMarkup();
    });
    API.on('connection', connectionBanner);
    connectionBanner();
  }

  /* ---------- chat ---------- */
  function initChat() {
    var log = document.getElementById('chatLog');
    if (!log) return;
    var form = document.getElementById('chatForm'), input = document.getElementById('chatInput');
    function add(text, who) {
      var m = document.createElement('div');
      m.className = 'msg ' + who;
      m.innerHTML = text.replace(/</g, '&lt;') + '<span class="time">' + F.clock(Date.now()) + '</span>';
      log.appendChild(m);
      log.scrollTop = log.scrollHeight;
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = input.value.trim();
      if (!v) return;
      add(v, 'me');
      input.value = '';
      setTimeout(function () { add('Thanks — checking that for you now. One moment.', 'them'); }, 900);
    });
    log.scrollTop = log.scrollHeight;
  }

  /* ---------- markets ---------- */
  function initMarkets() {
    var listHost = document.getElementById('marketList');
    if (!listHost) return;
    function render() {
      listHost.innerHTML = '<div class="list">' + API.symbols.map(function (s) {
        var h = API.feed.history(s.id);
        var last = h[h.length - 1], first = h[Math.max(0, h.length - 60)];
        var chg = (last.price - first.price) / first.price * 100;
        return '<a class="mkt" href="' + href('index.html') + '">' +
          '<span class="inst-mark">' + icon('chart', 14) + '</span>' +
          '<span class="n"><b>' + s.name + '</b><span>' + s.group + '</span></span>' +
          '<span class="p"><span class="num">' + F.price(last.price, s.digits) + '</span>' +
          '<span class="num ' + (chg >= 0 ? 'pos' : 'neg') + '">' + F.signedPct(chg) + '</span></span></a>';
      }).join('') + '</div>';
    }
    API.ready(function () {
      document.body.classList.remove('loading');
      render();
      clearInterval(window.__nexMkt);
      window.__nexMkt = setInterval(render, 2000);
    });
  }

  /* ---------- boot ---------- */
  function boot() {
    API = window.NexAPI; F = window.NexFmt;
    clearInterval(window.__nexMkt);
    if (!guard()) return;
    document.body.classList.add('loading');
    mountChrome(document.querySelector('.app') || document.body);
    if (!window.__nexWired) { wire(); window.__nexWired = true; }
    bindChrome();
    consentBar();
    riskStrip();
    initChat();
    initMarkets();
    if (window.NexTrade) window.NexTrade.init();
    if (window.NexPositions) window.NexPositions.init();
    if (document.body.getAttribute('data-chrome') !== 'app') document.body.classList.remove('loading');
    if (document.querySelector('.trade-dock')) document.body.classList.add('has-sticky');
  }
  window.NexBoot = boot;

  if (!BUNDLE) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('sw.js').catch(function () {});
      });
    }
  }
})();
