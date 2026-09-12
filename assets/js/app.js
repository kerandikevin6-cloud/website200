/* ============================================================
   Nexas — shared runtime
   Injects the app chrome (top bar, drawer, tab bar, modals) into
   every page so each page file holds only its own content.
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
    tag: 'M12 5v14M5 12h14',
    phone: 'M9 2h6a2 2 0 012 2v16a2 2 0 01-2 2H9a2 2 0 01-2-2V4a2 2 0 012-2z|M10.8 18.6h2.4',
    card: 'M3 8.5A2.5 2.5 0 015.5 6h13A2.5 2.5 0 0121 8.5v7a2.5 2.5 0 01-2.5 2.5h-13A2.5 2.5 0 013 15.5z|M3 10.5h18',
    coin: 'M12 6.2v11.6|M14.7 9.4A2.7 2.7 0 0012 8.2c-1.5 0-2.7.9-2.7 2s1.2 1.9 2.7 1.9 2.7.8 2.7 1.9-1.2 2-2.7 2a2.7 2.7 0 01-2.6-1.3',
    send: 'M4 12l16-8-6 16-2.5-6z',
    check: 'M5 13l4 4L19 7'
  };
  function icon(name, size) {
    var d = I[name] || '';
    var parts = d.split('|');
    var body = '';
    var circle = (name === 'globe' || name === 'user' || name === 'coin');
    if (circle) body += '<circle cx="12" cy="12" r="9"></circle>';
    if (name === 'user') body = '<circle cx="12" cy="8" r="3.4"></circle>';
    if (name === 'book') body = '<rect x="3" y="4" width="18" height="16" rx="2"></rect>';
    for (var i = 0; i < parts.length; i++) if (parts[i]) body += '<path d="' + parts[i] + '"></path>';
    return '<svg width="' + (size || 17) + '" height="' + (size || 17) + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + body + '</svg>';
  }
  window.NexIcon = icon;

  /* ---------- routing helpers (works as files, or bundled preview) ---------- */
  var BUNDLE = !!window.NEXAS_BUNDLE;
  function href(file) { return BUNDLE ? '#/' + file.replace('.html', '') : file; }
  window.NexHref = href;
  function currentPage() {
    return document.body.getAttribute('data-page') || 'trade';
  }

  /* ---------- theme ---------- */
  var THEME_KEY = 'nexas.theme';
  function storedTheme() {
    try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
  }
  function applyTheme(t) {
    if (t) document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
    try { t ? localStorage.setItem(THEME_KEY, t) : localStorage.removeItem(THEME_KEY); } catch (e) {}
    var sw = document.getElementById('themeSwitch');
    if (sw) sw.setAttribute('aria-checked', String(isDark()));
    if (window.NexChart) window.NexChart.redraw();
  }
  function isDark() {
    var t = document.documentElement.getAttribute('data-theme');
    if (t) return t === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  applyTheme(storedTheme());

  /* ---------- chrome ---------- */
  var TABS = [
    { id: 'trade', label: 'Trade', file: 'index.html', icon: 'chart' },
    { id: 'markets', label: 'Markets', file: 'markets.html', icon: 'globe' },
    { id: 'positions', label: 'Positions', file: 'positions.html', icon: 'book' },
    { id: 'responsible', label: 'Limits', file: 'responsible.html', icon: 'shield' }
  ];

  /* Top bar has three zones: one control on the left, the account
     balance as the anchor, and a single green action on the right. */
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
      '<button class="acct" data-open="switch">' +
        '<i class="acct-dot"></i><span class="acct-kind">Real</span>' +
        '<span class="bal num">2,480.00</span>' + icon('chevD', 12) +
      '</button>' +
      '<button class="btn-primary" data-open="deposit">Deposit</button>' +
      '<button class="iconbtn bell" aria-label="Notifications">' + icon('bell', 18) + '<i></i></button>' +
    '</header>';
  }

  /* ---------- sign-in transition ---------- */
  function splash(message, to) {
    var el = document.createElement('div');
    el.className = 'splash';
    el.innerHTML =
      '<div class="splash-inner">' +
        '<div class="pulse"><i></i><i></i><i></i></div>' +
        '<div class="splash-word">Nexas</div>' +
        '<div class="splash-msg">' + message + '</div>' +
      '</div>';
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('open'); });
    setTimeout(function () {
      if (BUNDLE) { location.hash = '#/' + to.replace('.html', ''); el.remove(); }
      else location.href = to;
    }, 1700);
  }
  window.NexSplash = splash;

  function drawer() {
    function item(label, opts) {
      opts = opts || {};
      var tag = opts.href ? 'a' : 'button';
      var attrs = opts.href ? ' href="' + href(opts.href) + '"' : '';
      if (opts.modal) attrs += ' data-open="' + opts.modal + '"';
      var tail = opts.tail || (opts.href || opts.modal ? icon('chev', 15) : '');
      return '<' + tag + ' class="ditem ' + (opts.cls || '') + '"' + attrs + '>' +
        icon(opts.icon, 17) + '<span>' + label + '</span>' +
        (tail ? '<i class="chev">' + tail + '</i>' : '') +
        '</' + tag + '>';
    }
    /* a group is a disclosure: the header toggles its nested links open */
    function group(label, iconName, items, open) {
      return '<div class="dgroup' + (open ? ' open' : '') + '">' +
        '<button class="ditem dgroup-head">' + icon(iconName, 17) +
          '<span>' + label + '</span><i class="chev caret">' + icon('chevD', 15) + '</i></button>' +
        '<div class="dgroup-body">' + items.join('') + '</div>' +
      '</div>';
    }

    return '' +
      '<div class="scrim" id="scrim"></div>' +
      '<aside class="drawer" id="drawer" aria-label="Menu">' +
        '<a class="drawer-user" href="' + href('account.html') + '">' +
          '<div class="avatar">A</div>' +
          '<div><b>Amara Kimani</b><span>am***a@mail.com</span></div>' +
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
          '<a class="ditem danger" href="' + href('login.html') + '">' + icon('out', 17) + '<span>Log out</span></a>' +
        '</div>' +
      '</aside>';
  }

  function tabbar(page) {
    return '<nav class="tabbar only-mob">' + TABS.map(function (t) {
      return '<a href="' + href(t.file) + '" class="' + (t.id === page ? 'active' : '') + '">' +
        icon(t.icon, 18) + t.label + '</a>';
    }).join('') + '</nav>';
  }

  /* ---------- modal engine ----------
     Step definitions live in assets/js/modals.js. Operations that used to
     be their own page (name, password, verification, deposit, withdrawal)
     run here instead; only genuinely page-sized things still route away. */
  var state = { key: null, step: null, trail: [], data: {} };

  function host() {
    var h = document.getElementById('modalHost');
    if (!h) {
      h = document.createElement('div');
      h.id = 'modalHost';
      document.body.appendChild(h);
    }
    return h;
  }

  function openModal(key, stepId) {
    var def = window.NexModals && window.NexModals[key];
    if (!def) return;
    state = { key: key, step: stepId || Object.keys(def.steps)[0], trail: [], data: {} };
    renderModal(true);
  }
  function gotoStep(id) {
    state.trail.push(state.step);
    state.step = id;
    renderModal(false);
  }
  function backStep() {
    if (!state.trail.length) return closeModals();
    state.step = state.trail.pop();
    renderModal(false);
  }
  function renderModal(fresh) {
    var def = window.NexModals[state.key];
    var step = def.steps[state.step];
    var title = typeof step.title === 'function' ? step.title(state.data) : step.title;
    var sub = typeof step.sub === 'function' ? step.sub(state.data) : step.sub;

    host().innerHTML =
      '<div class="modal' + (fresh ? '' : ' open') + '" role="dialog" aria-modal="true" aria-label="' + title + '">' +
        '<div class="modal-bg" data-close></div>' +
        '<div class="modal-box">' +
          '<div class="grabber"></div>' +
          '<div class="modal-head">' +
            (state.trail.length ? '<button class="iconbtn" data-modal-back aria-label="Back">' + icon('back', 18) + '</button>' : '') +
            '<div><h2>' + title + '</h2>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' +
            '<button class="iconbtn" data-close aria-label="Close">' + icon('close', 18) + '</button>' +
          '</div>' +
          step.body(state.data) +
        '</div>' +
      '</div>';

    if (fresh) requestAnimationFrame(function () {
      var m = host().querySelector('.modal');
      if (m) m.classList.add('open');
    });
    bindMeter();
  }
  function closeModals() {
    var m = host().querySelector('.modal');
    if (!m) return;
    m.classList.remove('open');
    setTimeout(function () { host().innerHTML = ''; }, 220);
  }
  window.NexModal = { open: openModal, close: closeModals };

  /* ---------- toast ---------- */
  var toastEl;
  window.NexToast = function (msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('open');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function () { toastEl.classList.remove('open'); }, 2400);
  };

  /* ---------- boot chrome ---------- */
  function mountChrome(root) {
    var chrome = document.body.getAttribute('data-chrome');
    if (chrome === 'auth' || chrome === 'plain') {
      host();
      return;
    }
    var page = currentPage();
    var sub = !!document.body.getAttribute('data-back');
    if (sub) document.body.classList.add('no-tabs');
    host();
    root.insertAdjacentHTML('afterbegin', topbar(page));
    root.insertAdjacentHTML('beforeend', drawer() + (sub ? '' : tabbar(page)));
  }

  function wire() {
    document.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target : null;
      if (!t) return;

      var menuBtn = t.closest('#menuBtn');
      if (menuBtn) { setDrawer(true); return; }

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
      if (grp) { grp.parentElement.classList.toggle('open'); return; }

      var sp = t.closest('[data-splash]');
      if (sp && sp.tagName !== 'FORM') {
        e.preventDefault();
        splash(sp.getAttribute('data-splash'), sp.getAttribute('data-to') || 'index.html');
        return;
      }

      var mod = t.closest('[data-open]');
      if (mod) { e.preventDefault(); setDrawer(false); openModal(mod.getAttribute('data-open')); return; }

      if (t.closest('[data-close]')) { closeModals(); return; }
      if (t.closest('[data-modal-back]')) { backStep(); return; }

      /* inside a modal: set state, step forward, submit, copy, amounts */
      var setter = t.closest('[data-set]');
      if (setter) {
        var pair = setter.getAttribute('data-set').split(':');
        state.data[pair[0]] = pair[1];
      }
      var step = t.closest('[data-goto]');
      if (step) { gotoStep(step.getAttribute('data-goto')); return; }

      var done = t.closest('[data-done]');
      if (done) {
        var msg = done.getAttribute('data-done');
        closeModals();
        window.NexToast(msg);
        return;
      }
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
      if (seg) {
        var parent = seg.parentElement;
        parent.querySelectorAll('button').forEach(function (b) { b.classList.remove('active'); });
        seg.classList.add('active');
      }
    });

    /* live totals and strength meters, inside modals and on pages */
    document.addEventListener('input', function (e) {
      var el = e.target;
      if (el.id === 'newPassword') paintMeter(el);
      var total = document.querySelector('[data-total="' + el.id + '"]');
      if (total) {
        var fee = +(total.getAttribute('data-fee') || 0);
        var v = Math.max(0, (+el.value || 0) - fee);
        total.textContent = '$' + v.toFixed(2);
      }
    });

    document.addEventListener('submit', function (e) {
      var f = e.target;
      if (f.hasAttribute && f.hasAttribute('data-splash')) {
        e.preventDefault();
        splash(f.getAttribute('data-splash'), f.getAttribute('data-to') || 'index.html');
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeModals(); setDrawer(false); }
    });
  }

  function paintMeter(input) {
    var v = input.value, score = 0;
    if (v.length >= 8) score++;
    if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++;
    if (/\d/.test(v)) score++;
    if (/[^A-Za-z0-9]/.test(v)) score++;
    var wrap = input.closest('.field') || document;
    wrap.querySelectorAll('.meter i').forEach(function (bar, i) { bar.classList.toggle('on', i < score); });
  }
  function bindMeter() {
    var pw = host().querySelector('#newPassword');
    if (pw) paintMeter(pw);
  }

  function setDrawer(open) {
    var d = document.getElementById('drawer');
    var s = document.getElementById('scrim');
    if (!d) return;
    d.classList.toggle('open', open);
    s.classList.toggle('open', open);
  }

  /* ---------- shared page behaviours ---------- */
  function initStake() {
    var stake = document.getElementById('stake');
    if (!stake) return;
    function set(v) {
      v = Math.max(1, Math.round(v * 100) / 100);
      stake.value = v;
      var p = (v * 1.953).toFixed(2);
      document.querySelectorAll('[data-payout]').forEach(function (el) { el.textContent = p; });
    }
    var plus = document.getElementById('plus'), minus = document.getElementById('minus');
    if (plus) plus.addEventListener('click', function () { set(+stake.value + 1); });
    if (minus) minus.addEventListener('click', function () { set(+stake.value - 1); });
    stake.addEventListener('change', function () { set(+stake.value || 1); });
    var q = document.getElementById('quick');
    if (q) q.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (b) set(+stake.value + +b.getAttribute('data-add'));
    });
    document.querySelectorAll('.tbtn').forEach(function (b) {
      b.addEventListener('click', function () {
        window.NexToast(b.getAttribute('data-side') + ' taken at ' + stake.value + ' USD');
      });
    });
    set(+stake.value || 10);
  }

  function initChart() {
    var cv = document.getElementById('chart');
    if (!cv) return;
    var ctx = cv.getContext('2d');
    var data = [], last = 9601.01, prev = last;
    for (var k = 0; k < 220; k++) { last += (Math.random() - 0.5) * 1.6; data.push(last); }
    var W = 0, H = 0;

    function css(name) {
      return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    }
    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var r = cv.getBoundingClientRect();
      if (!r.width) return;
      W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }
    function draw() {
      if (!W) return;
      var padR = 62, padB = 14, padT = 12;
      var min = Infinity, max = -Infinity, i;
      for (i = 0; i < data.length; i++) { if (data[i] < min) min = data[i]; if (data[i] > max) max = data[i]; }
      var span = (max - min) || 1;
      min -= span * 0.12; max += span * 0.12; span = max - min;
      var w = W - padR, h = H - padB - padT;

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = css('--chart-bg'); ctx.fillRect(0, 0, W, H);
      ctx.font = '11px "IBM Plex Mono", monospace';
      ctx.textBaseline = 'middle';

      for (var g = 0; g <= 4; g++) {
        var y = padT + h * g / 4;
        ctx.strokeStyle = css('--chart-grid'); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, Math.round(y) + 0.5); ctx.lineTo(w, Math.round(y) + 0.5); ctx.stroke();
        ctx.fillStyle = css('--chart-axis');
        ctx.fillText((max - span * g / 4).toFixed(2), w + 10, y);
      }
      function X(i2) { return i2 / (data.length - 1) * w; }
      function Y(v) { return padT + (max - v) / span * h; }

      ctx.beginPath(); ctx.moveTo(X(0), Y(data[0]));
      for (i = 1; i < data.length; i++) ctx.lineTo(X(i), Y(data[i]));
      ctx.strokeStyle = css('--chart-line'); ctx.lineWidth = 1.3; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.lineTo(X(data.length - 1), H - padB); ctx.lineTo(X(0), H - padB); ctx.closePath();
      ctx.fillStyle = css('--chart-fill'); ctx.fill();

      var v2 = data[data.length - 1], y2 = Y(v2);
      ctx.setLineDash([3, 4]); ctx.strokeStyle = css('--chart-axis');
      ctx.beginPath(); ctx.moveTo(0, Math.round(y2) + 0.5); ctx.lineTo(w, Math.round(y2) + 0.5); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(X(data.length - 1), y2, 2.6, 0, Math.PI * 2);
      ctx.fillStyle = css('--chart-line'); ctx.fill();

      var lbl = v2.toFixed(2), bw = Math.min(ctx.measureText(lbl).width + 16, padR - 8);
      var bx = w + 6, by = y2 - 11;
      ctx.fillStyle = css('--surface'); roundRect(bx, by, bw, 22, 6); ctx.fill();
      ctx.strokeStyle = css('--line'); ctx.lineWidth = 1; roundRect(bx + .5, by + .5, bw - 1, 21, 6); ctx.stroke();
      ctx.fillStyle = css('--text'); ctx.fillText(lbl, bx + 8, y2);
    }
    function roundRect(x, y, w2, h2, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w2, y, x + w2, y + h2, r);
      ctx.arcTo(x + w2, y + h2, x, y + h2, r);
      ctx.arcTo(x, y + h2, x, y, r);
      ctx.arcTo(x, y, x + w2, y, r);
      ctx.closePath();
    }

    var digitsEl = document.getElementById('digits');
    var dist = [10.0, 8.0, 9.8, 9.5, 10.8, 11.5, 10.3, 11.5, 6.8, 11.0];
    var current = 3;
    function renderDigits() {
      if (!digitsEl) return;
      var max = Math.max.apply(null, dist), html = '';
      for (var i = 0; i < 10; i++) {
        html += '<div class="digit' + (dist[i] === max ? ' hot' : '') + (i === current ? ' cur' : '') +
          '"><b>' + i + '</b><i>' + dist[i].toFixed(1) + '%</i></div>';
      }
      digitsEl.innerHTML = html;
    }
    renderDigits();

    function tick() {
      var next = data[data.length - 1] + (Math.random() - 0.5) * 1.8;
      data.push(next); data.shift();
      var px = document.getElementById('px');
      if (px) px.textContent = next.toFixed(2);
      var d = next - prev, chg = document.getElementById('pxChg');
      if (chg) {
        chg.textContent = (d >= 0 ? '+' : '') + d.toFixed(2) + ' (' + (d >= 0 ? '+' : '') + (d / prev * 100).toFixed(2) + '%)';
        chg.className = 'c num ' + (d >= 0 ? 'pos' : 'neg');
      }
      prev = next;
      current = Math.floor(Math.abs(next * 100)) % 10;
      for (var i = 0; i < 10; i++) {
        dist[i] += (Math.random() - 0.5) * 0.25;
        if (dist[i] < 4) dist[i] = 4;
        if (dist[i] > 16) dist[i] = 16;
      }
      renderDigits(); draw();
    }

    window.NexChart = { redraw: draw, resize: size };
    window.addEventListener('resize', size);
    size();
    window.__nexTick = setInterval(tick, 1000);
  }

  function initChat() {
    var log = document.getElementById('chatLog');
    if (!log) return;
    var form = document.getElementById('chatForm');
    var input = document.getElementById('chatInput');
    function time() {
      var d = new Date();
      return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    }
    function add(text, who) {
      var el = document.createElement('div');
      el.className = 'msg ' + who;
      el.innerHTML = text.replace(/</g, '&lt;') + '<span class="time">' + time() + '</span>';
      log.appendChild(el);
      log.scrollTop = log.scrollHeight;
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = input.value.trim();
      if (!v) return;
      add(v, 'me');
      input.value = '';
      setTimeout(function () {
        add('Thanks — checking that for you now. One moment.', 'them');
      }, 900);
    });
    log.scrollTop = log.scrollHeight;
  }

  function initForms() {
    document.querySelectorAll('[data-demo-form]').forEach(function (f) {
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        window.NexToast(f.getAttribute('data-demo-form'));
      });
    });
    var otp = document.querySelector('.otp');
    if (otp) {
      otp.addEventListener('input', function (e) {
        var boxes = [].slice.call(otp.querySelectorAll('input'));
        var i = boxes.indexOf(e.target);
        if (e.target.value && i < boxes.length - 1) boxes[i + 1].focus();
      });
    }
  }

  function boot() {
    if (window.__nexTick) { clearInterval(window.__nexTick); window.__nexTick = null; }
    mountChrome(document.querySelector('.app') || document.body);
    if (!window.__nexWired) { wire(); window.__nexWired = true; }
    initStake();
    initChart();
    initChat();
    initForms();
    if (document.querySelector('.trade-dock')) document.body.classList.add('has-sticky');
  }
  window.NexBoot = boot;

  if (!BUNDLE) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
})();
