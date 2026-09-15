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
    sliders: 'M4 6h16M4 12h16M4 18h16|M9 4v4M15 10v4M7 16v4',
    candles: '',
    headset: 'M4 13v-1a8 8 0 1116 0v1|M4 13h2.2a1 1 0 011 1v3.4a1 1 0 01-1 1H5.6A1.6 1.6 0 014 16.8z|M20 13h-2.2a1 1 0 00-1 1v3.4a1 1 0 001 1h.6a1.6 1.6 0 001.6-1.6z|M18.6 19.2a4 4 0 01-3.6 2.2h-1.6',
    gift: 'M12 8.5V21|M3.6 12.4h16.8|M9.1 8.5a2.3 2.3 0 110-4.6C11 3.9 12 6 12 8.5c0-2.5 1-4.6 2.9-4.6a2.3 2.3 0 110 4.6',
    copy: '',
    link: 'M9.5 14.5l5-5|M11 6.6l1.3-1.3a3.8 3.8 0 015.4 5.4L16.4 12|M13 17.4l-1.3 1.3a3.8 3.8 0 01-5.4-5.4L7.6 12',
    spark: 'M12 3.1l1.86 4.93 4.93 1.86-4.93 1.86L12 16.68l-1.86-4.93L5.21 9.89l4.93-1.86z|M18.5 15.2l.66 1.74 1.74.66-1.74.66-.66 1.74-.66-1.74-1.74-.66 1.74-.66z',
    radar: 'M12 12l4.6-4.6|M4.6 16.9a8.5 8.5 0 1114.8 0',
    target: 'M12 2v3M12 19v3M2 12h3M19 12h3'
  };
  function icon(name, size) {
    var d = I[name] || '', parts = d.split('|'), body = '';
    if (name === 'globe' || name === 'coin' || name === 'clock') body += '<circle cx="12" cy="12" r="9"></circle>';
    if (name === 'user') body = '<circle cx="12" cy="8" r="3.4"></circle>';
    if (name === 'book') body = '<rect x="3" y="4" width="18" height="16" rx="2"></rect>';
    if (name === 'candles') body =
      '<path d="M7.6 3.4v3.3M7.6 17.4v3.2M16.4 6.6v3.6M16.4 18.4v2.2"></path>' +
      '<rect x="4.8" y="6.7" width="5.6" height="10.7" rx="1.5"></rect>' +
      '<rect x="13.6" y="10.2" width="5.6" height="8.2" rx="1.5"></rect>';
    if (name === 'target') body =
      '<circle cx="12" cy="12" r="7.6"></circle><circle cx="12" cy="12" r="3.1"></circle>' + body;
    if (name === 'radar') body = '<circle cx="12" cy="12" r="1.5"></circle>' + body;
    if (name === 'gift') body = '<rect x="4.4" y="8.5" width="15.2" height="12.5" rx="1.8"></rect>' + body;
    if (name === 'copy') body =
      '<rect x="9" y="9" width="11" height="11" rx="2"></rect>' +
      '<path d="M5.5 15H5a1 1 0 01-1-1V5a1 1 0 011-1h9a1 1 0 011 1v.5"></path>';
    for (var i = 0; i < parts.length; i++) if (parts[i]) body += '<path d="' + parts[i] + '"></path>';
    return '<svg width="' + (size || 17) + '" height="' + (size || 17) + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + body + '</svg>';
  }
  window.NexIcon = icon;

  /* ---------- flags ----------
     Windows has no flag emoji font, so \uD83C\uDDF0\uD83C\uDDEA renders as the
     letters "KE" there. These are drawn instead: simplified to a few
     shapes each, which is all that survives at 18px anyway. */
  var FLAGS = {
    KE: '<rect width="24" height="16" fill="#fff"/>' +
        '<rect width="24" height="5.1" fill="#000"/>' +
        '<rect y="6" width="24" height="4" fill="#BB0000"/>' +
        '<rect y="10.9" width="24" height="5.1" fill="#006600"/>' +
        '<ellipse cx="12" cy="8" rx="2.7" ry="4.6" fill="#fff"/>' +
        '<ellipse cx="12" cy="8" rx="1.5" ry="3.4" fill="#BB0000"/>',
    UG: '<rect width="24" height="16" fill="#FCDC04"/>' +
        '<rect width="24" height="2.67" fill="#000"/>' +
        '<rect y="5.33" width="24" height="2.67" fill="#D90000"/>' +
        '<rect y="8" width="24" height="2.67" fill="#000"/>' +
        '<rect y="13.33" width="24" height="2.67" fill="#D90000"/>' +
        '<circle cx="12" cy="8" r="2.6" fill="#fff"/>',
    TZ: '<rect width="24" height="16" fill="#00A3DD"/>' +
        '<path d="M0 0h15L0 16z" fill="#1EB53A"/>' +
        '<path d="M17 0h7L7 16H0z" fill="#FCD116"/>' +
        '<path d="M19 0h5L5 16H0z" fill="#000" opacity=".92"/>',
    RW: '<rect width="24" height="16" fill="#20603D"/>' +
        '<rect width="24" height="8" fill="#00A1DE"/>' +
        '<rect y="8" width="24" height="4" fill="#FAD201"/>' +
        '<circle cx="18" cy="4" r="2" fill="#FAD201"/>',
    NG: '<rect width="24" height="16" fill="#fff"/>' +
        '<rect width="8" height="16" fill="#008751"/>' +
        '<rect x="16" width="8" height="16" fill="#008751"/>',
    GH: '<rect width="24" height="16" fill="#FCD116"/>' +
        '<rect width="24" height="5.33" fill="#CE1126"/>' +
        '<rect y="10.67" width="24" height="5.33" fill="#006B3F"/>' +
        '<path d="M12 5.6l1.1 3.3 3.2-1.9-2 3.2 3.3 1.1h-6.9z" fill="#000"/>',
    ZA: '<rect width="24" height="16" fill="#002395"/>' +
        '<rect width="24" height="8" fill="#DE3831"/>' +
        '<path d="M0 0l10 8-10 8z" fill="#000"/>' +
        '<path d="M0 6.2h24v3.6H0z" fill="#007A4D"/>'
  };
  function flag(cc) {
    var body = FLAGS[cc];
    if (!body) return '';
    return '<svg class="flagsvg" viewBox="0 0 24 16" width="19" height="13" ' +
      'role="img" aria-label="' + cc + '">' + body + '</svg>';
  }
  window.NexFlag = flag;

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
    { id: 'trade', label: 'Trade', file: 'index.html', icon: 'candles' },
    { id: 'ai', label: 'AI', file: 'ai.html', icon: 'spark' },
    { id: 'positions', label: 'Positions', file: 'positions.html', icon: 'book' },
    { id: 'markets', label: 'Markets', file: 'markets.html', icon: 'globe' }
  ];
  /* the desktop bar carries one extra link the bottom bar has no room for */
  var DESK = TABS.concat([{ id: 'learn', label: 'Learn', file: 'learn.html' }]);

  /* Stacked: the account kind sits over the amount, which roughly halves
     how much of the top bar this button takes. */
  function balanceMarkup() {
    var kind = API.account.kind();
    return '<i class="acct-dot ' + kind + '"></i>' +
      '<span class="acct-txt">' +
        '<span class="acct-kind">' + kind + '</span>' +
        '<span class="bal num">' + F.amount(API.account.balance()) + '</span>' +
      '</span>' + icon('chevD', 12);
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

    var menu = '<nav class="deskmenu only-desk">' + DESK.map(function (t) {
      return '<a href="' + href(t.file) + '" class="' + (t.id === page ? 'active' : '') + '">' +
        t.label + '</a>';
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
          item('Support', { icon: 'headset', href: 'chat.html' }) +
          item('Learn', { icon: 'book', href: 'learn.html' }) +
          item('Refer and earn', { icon: 'gift', modal: 'refer' }) +
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
        '<i class="tb-ico">' + icon(t.icon, 20) + '</i>' +
        '<i class="tb-lab">' + t.label + '</i></a>';
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
    /* Focus a real field if the step has one. Landing on the back or
       first action button just paints a focus ring on it, which reads
       as a stray box on an otherwise clean dialog. */
    var first = host().querySelector('.modal-box input, .modal-box select, .modal-box textarea');
    if (first) first.focus();
    else {
      var box = host().querySelector('.modal-box');
      if (box) { box.setAttribute('tabindex', '-1'); box.focus(); }
    }
    var pw = host().querySelector('#newPassword');
    if (pw) paintMeter(pw);
  }
  function closeModals() {
    payToken++;                               /* nothing pending may land now */
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

  /* ---------- clipboard and sharing ---------- */
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    ta.remove();
  }
  function copyText(text, note) {
    var msg = note || 'Copied';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { window.NexToast(msg); },
        function () { fallbackCopy(text); window.NexToast(msg); }
      );
      return;
    }
    fallbackCopy(text);
    window.NexToast(msg);
  }
  /* The share sheet where the device has one, the clipboard everywhere
     else — either way the person ends up holding the link. */
  function shareLink(url) {
    if (navigator.share) {
      navigator.share({
        title: 'Nexas',
        text: 'I trade synthetic indices on Nexas. Join with my link.',
        url: url
      }).catch(function () {});
      return;
    }
    copyText(url, 'Referral link copied — paste it anywhere');
  }

  /* ---------- phone number formatting ---------- */
  /* The sample for the country doubles as the grouping mask, so a new
     country needs no extra code: "712 345 678" groups 3-3-3. */
  function formatPhone(raw, sample, dial) {
    var digits = raw.replace(/\D/g, '');
    var want = sample.replace(/\D/g, '').length;
    /* People type the number the way they say it. Both the pasted dial
       code and the trunk "0" are already covered by the prefix cell, so
       drop them rather than making the person delete them. */
    if (dial && digits.indexOf(dial) === 0 && digits.length > want) digits = digits.slice(dial.length);
    if (digits.charAt(0) === '0') digits = digits.slice(1);
    digits = digits.slice(0, want);
    var out = '', di = 0;
    for (var i = 0; i < sample.length && di < digits.length; i++) {
      if (sample.charAt(i) === ' ') out += ' ';
      else out += digits.charAt(di++);
    }
    return out;
  }
  function paintCountry() {
    var c = API.geo.country();
    var ccs = document.querySelectorAll('[data-phone-cc]');
    for (var i = 0; i < ccs.length; i++) {
      ccs[i].innerHTML = '<i class="flag">' + flag(API.geo.code()) + '</i>' +
        '<b class="num">+' + c.dial + '</b>';
    }
    var boxes = document.querySelectorAll('.phone-input');
    for (var j = 0; j < boxes.length; j++) boxes[j].placeholder = c.sample;
  }

  /* ---------- document pickers ---------- */
  var DOC_MAX = 8 * 1024 * 1024;
  var DOC_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];

  function fileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }
  function refreshVerifyButton() {
    var btn = document.getElementById('verifySubmit');
    if (!btn) return;
    var pickers = document.querySelectorAll('.picker');
    var ready = pickers.length > 0;
    for (var i = 0; i < pickers.length; i++) {
      if (!API.kyc.hasDoc(pickers[i].getAttribute('data-slot'))) ready = false;
    }
    btn.disabled = !ready;
  }
  function renderPicked(picker, slot, file, preview) {
    var out = picker.querySelector('.pick-out');
    var zone = picker.querySelector('.dropzone');
    if (!file) {
      out.innerHTML = '';
      if (zone) zone.hidden = false;
      refreshVerifyButton();
      return;
    }
    /* The picture takes over the whole drop area: seeing your own ID in
       the box is the confirmation that it landed, so the invitation to
       upload has no reason to still be there. */
    if (zone) zone.hidden = true;
    out.innerHTML = '<div class="picked' + (preview ? ' shot' : '') + '">' +
      (preview
        ? '<img class="picked-fill" alt="Uploaded document" src="' + preview + '">'
        : '<span class="picked-doc">' + icon('idcard', 26) + '</span>') +
      '<div class="picked-bar">' +
        '<span class="picked-t"><b>' + file.name.replace(/</g, '&lt;') + '</b>' +
          '<span>' + fileSize(file.size) + ' \u00b7 ready to submit</span></span>' +
        '<button type="button" class="picked-x" data-unpick="' + slot + '" aria-label="Remove">' +
          icon('close', 16) + '</button>' +
      '</div>' +
    '</div>';
    refreshVerifyButton();
  }
  function takeFile(input) {
    var slot = input.getAttribute('data-slot');
    var picker = input.closest('.picker');
    var file = input.files && input.files[0];
    input.value = '';
    if (!file || !picker) return;

    if (DOC_TYPES.indexOf(file.type) === -1) {
      fieldError(input.id, 'Use a JPG, PNG, WebP or PDF');
      window.NexToast('That file type is not accepted');
      return;
    }
    if (file.size > DOC_MAX) {
      window.NexToast('That file is ' + fileSize(file.size) + ' \u2014 the limit is 8 MB');
      return;
    }
    API.kyc.setDoc(slot, file);

    if (file.type === 'application/pdf') { renderPicked(picker, slot, file, null); return; }
    var reader = new FileReader();
    reader.onload = function () { renderPicked(picker, slot, file, reader.result); };
    reader.onerror = function () { renderPicked(picker, slot, file, null); };
    reader.readAsDataURL(file);
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
    /* A signed-out visitor should meet the pitch, not a login form. */
    go('landing.html');
    return false;
  }

  /* ---------- password rules ----------
     One source of truth: the meter, the live checklist and the submit
     check all read these, so they can never disagree. */
  var PW_RULES = [
    { id: 'len',    test: function (v) { return v.length >= 8; },
      msg: 'Use at least 8 characters' },
    { id: 'case',   test: function (v) { return /[a-z]/.test(v) && /[A-Z]/.test(v); },
      msg: 'Include an upper and a lower case letter' },
    { id: 'digit',  test: function (v) { return /\d/.test(v); },
      msg: 'Include a number' },
    { id: 'symbol', test: function (v) { return /[^A-Za-z0-9]/.test(v); },
      msg: 'Include a symbol' }
  ];
  function pwScore(v) {
    var n = 0;
    for (var i = 0; i < PW_RULES.length; i++) if (PW_RULES[i].test(v)) n++;
    return n;
  }
  function pwFirstFailure(v) {
    for (var i = 0; i < PW_RULES.length; i++) if (!PW_RULES[i].test(v)) return PW_RULES[i].msg;
    return null;
  }
  function paintRules(v) {
    var list = document.getElementById('pwRules');
    if (!list) return;
    for (var i = 0; i < PW_RULES.length; i++) {
      var li = list.querySelector('[data-rule="' + PW_RULES[i].id + '"]');
      if (li) li.classList.toggle('ok', PW_RULES[i].test(v));
    }
  }
  /* Errors are written next to the field rather than re-rendering the
     step, so nothing the person has already typed is thrown away. */
  function fieldError(id, msg) {
    var input = document.getElementById(id);
    if (!input) return;
    var wrap = input.closest('.field') || input.parentNode;
    var err = wrap.querySelector('.field-error');
    if (!msg) { if (err) err.remove(); wrap.classList.remove('bad'); return; }
    if (!err) {
      err = document.createElement('div');
      err.className = 'field-error';
      err.setAttribute('role', 'alert');
      wrap.appendChild(err);
    }
    err.textContent = msg;
    wrap.classList.add('bad');
    input.focus();
  }
  function clearErrors() {
    var box = host().querySelector('.modal-box');
    if (!box) return;
    var errs = box.querySelectorAll('.field-error');
    for (var i = 0; i < errs.length; i++) errs[i].remove();
    var bad = box.querySelectorAll('.field.bad');
    for (var j = 0; j < bad.length; j++) bad[j].classList.remove('bad');
  }

  /* ---------- password meter ---------- */
  function paintMeter(input) {
    var v = input.value, score = pwScore(v);
    var wrap = input.closest('.field') || document;
    wrap.querySelectorAll('.meter i').forEach(function (bar, i) { bar.classList.toggle('on', i < score); });
    paintRules(v);
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

      var copier = t.closest('[data-copy-text]');
      if (copier) {
        copyText(copier.getAttribute('data-copy-text'), copier.getAttribute('data-copy-note'));
        return;
      }
      var sharer = t.closest('[data-share]');
      if (sharer) { shareLink(sharer.getAttribute('data-share')); return; }

      var amt = t.closest('[data-amount]');
      if (amt) {
        var box = amt.closest('.field').querySelector('input');
        box.value = amt.getAttribute('data-amount');
        box.dispatchEvent(new Event('input', { bubbles: true }));
        return;
      }

      var unpick = t.closest('[data-unpick]');
      if (unpick) {
        var slotName = unpick.getAttribute('data-unpick');
        API.kyc.clearDoc(slotName);
        var pk = unpick.closest('.picker');
        if (pk) renderPicked(pk, slotName, null, null);
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

    document.addEventListener('change', function (e) {
      if (e.target.classList && e.target.classList.contains('filepick')) takeFile(e.target);
    });

    document.addEventListener('input', function (e) {
      var el = e.target;
      if (el.id === 'newPassword') paintMeter(el);
      if (el.classList && el.classList.contains('phone-input')) {
        var atEnd = el.selectionStart === el.value.length;
        var c = API.geo.country();
        var next = formatPhone(el.value, c.sample, c.dial);
        if (next !== el.value) {
          el.value = next;
          if (!atEnd) { try { el.setSelectionRange(next.length, next.length); } catch (x) {} }
        }
      }
      var total = document.querySelector('[data-total="' + el.id + '"]');
      if (total) {
        var fee = +(total.getAttribute('data-fee') || 0);
        var fx = +(total.getAttribute('data-fx') || 1) || 1;
        total.textContent = F.money(Math.max(0, (+el.value || 0) - fee) / fx);
      }
    });

    document.addEventListener('submit', function (e) {
      var f = e.target;
      if (!f.hasAttribute) return;
      if (f.hasAttribute('data-splash')) {
        e.preventDefault();
        /* The auth pages post the same password rules as the modal. */
        var pw = f.querySelector('#newPassword');
        if (pw) {
          var bad = pwFirstFailure(pw.value);
          if (bad) { window.NexToast(bad); pw.focus(); return; }
          var again = f.querySelector('#confirmNew');
          if (again && again.value !== pw.value) {
            window.NexToast('Passwords do not match');
            again.focus();
            return;
          }
        }
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

  /* A settlement that is still pending must not survive the dialog that
     started it, so every timer is tagged and checked before it fires. */
  var payToken = 0;
  function reference() {
    var a = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789', out = '';
    for (var i = 0; i < 10; i++) out += a.charAt(Math.floor(Math.random() * a.length));
    return out;
  }
  function settle(after) {
    var token = ++payToken;
    gotoStep('pending');
    setTimeout(function () {
      if (token !== payToken) return;         /* cancelled or closed */
      if (!host().querySelector('.modal')) return;
      after();
      gotoStep('success');
    }, 2600);
  }

  /* actions that touch money or verification */
  function runAction(name, node) {
    if (name === 'deposit') {
      clearErrors();
      var box = document.getElementById('amount');
      var amount = +((box || {}).value) || 0;
      var pay = API.geo.country();
      var isLocal = state.data.method !== 'usdt' && !!pay.cur;
      var rate = isLocal ? pay.rate : 1;
      var money = isLocal ? pay.cur : API.account.currency();

      if (amount <= 0) return fieldError('amount', 'Enter an amount to deposit');
      var usd = amount / rate;
      if (usd < 1) return fieldError('amount', 'Minimum deposit is ' +
        F.count(Math.ceil(rate)) + ' ' + money);

      if (state.data.method === 'mpesa') {
        var ph = document.getElementById('mpesaPhone');
        var digits = ph ? ph.value.replace(/\D/g, '') : '';
        if (digits.length < pay.len) return fieldError('mpesaPhone', 'Enter your ' + pay.len + '-digit number');
        state.data.payTo = pay.dial + digits;
      }

      state.data.payLabel = F.count(amount) + ' ' + money;
      state.data.credited = Math.round(usd * 100) / 100;
      state.data.ref = reference();
      settle(function () {
        API.account.credit(state.data.credited, 'Deposit');
      });
      return;
    }
    if (name === 'withdraw') {
      if (!API.kyc.verified()) { gotoStep('kyc'); return; }
      clearErrors();
      var w = +((document.getElementById('wAmount') || {}).value) || 0;
      if (w <= 0) return fieldError('wAmount', 'Enter an amount to withdraw');
      if (w < 10) return fieldError('wAmount', 'Minimum withdrawal is ' + F.money(10));
      if (w > API.account.balance()) return fieldError('wAmount',
        'Not enough funds. Available ' + F.money(API.account.balance()));
      state.data.sent = w;
      state.data.ref = reference();
      settle(function () { API.account.debit(w, 'Withdrawal'); });
      return;
    }
    if (name === 'savePassword') {
      clearErrors();
      var cur = (document.getElementById('currentPassword') || {}).value || '';
      var nw = (document.getElementById('newPassword') || {}).value || '';
      var cf = (document.getElementById('confirmPassword') || {}).value || '';

      if (!cur) return fieldError('currentPassword', 'Enter your current password');
      var fail = pwFirstFailure(nw);
      if (fail) return fieldError('newPassword', fail);
      if (nw === cur) return fieldError('newPassword', 'Choose a password you have not used here before');
      if (!cf) return fieldError('confirmPassword', 'Repeat the new password');
      if (cf !== nw) return fieldError('confirmPassword', 'These do not match');

      closeModals();
      window.NexToast('Password updated');
      return;
    }
    if (name === 'verify') {
      if (node && node.disabled) return;
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
    API.on('geo', paintCountry);
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
    if (window.NexAI) window.NexAI.init();
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
