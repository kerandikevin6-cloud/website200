/* ============================================================
   Novi, shell
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
    back: 'M19 12H5|M11 18l-6-6 6-6',
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
    target: 'M12 2v3M12 19v3M2 12h3M19 12h3',
    alert: 'M12 8v5M12 16.2v.1',
    /* The three contract families. Drawn rather than labelled with a
       letter, because the words beside them are already the label and a
       glyph that repeats the word is decoration. */
    parity: '',
    overunder: 'M7 9.5l5-4 5 4|M7 14.5l5 4 5-4',
    /* The instrument families. A volatility series is a jagged line, a
       boom and crash is one with a spike in it, a step index is a
       staircase, and a commodity is a bar. Four shapes that are the
       thing they name, which is all an icon at 16px can be. */
    wave: 'M3 15.5l3.2-6 2.6 4.4 2.6-8 2.8 9.4 2.4-5 3 5.2|M21 15.5h.2',
    spike: 'M3 17.5l4.5-2.5 3.5 1.5 3-11 3 8 4-3',
    steps: 'M3 18h4v-4h4.5v-4H16V6h5',
    bar: 'M6 20V9.5|M12 20V4.5|M18 20V13.5'
  };
  /* ---------- solid icons ----------
     Material Symbols (Apache 2.0), drawn on Google's 0 -960 960 960 grid
     rather than the 24-box the stroke set above uses, so they need their
     own renderer. Filled weight, because the tab bar and the composer
     read better solid at 20px than a 1.5px outline does.

     The paths are inlined rather than linked as .svg files: build.js
     folds the whole app into one file, and an <img src> would be the one
     thing in it that still needs the network. */
  var M = {
    /* candlestick_chart */
    candles: 'M280-200v-40h-40q-17 0-28.5-11.5T200-280v-400q0-17 11.5-28.5T240-720h40v-40q0-17 11.5-28.5T320-800q17 0 28.5 11.5T360-760v40h40q17 0 28.5 11.5T440-680v400q0 17-11.5 28.5T400-240h-40v40q0 17-11.5 28.5T320-160q-17 0-28.5-11.5T280-200Zm320 0v-160h-40q-17 0-28.5-11.5T520-400v-200q0-17 11.5-28.5T560-640h40v-120q0-17 11.5-28.5T640-800q17 0 28.5 11.5T680-760v120h40q17 0 28.5 11.5T760-600v200q0 17-11.5 28.5T720-360h-40v160q0 17-11.5 28.5T640-160q-17 0-28.5-11.5T600-200Z',
    /* smart_toy (assets/bot.svg) */
    bot: 'M160-360q-50 0-85-35t-35-85q0-50 35-85t85-35v-80q0-33 23.5-56.5T240-760h120q0-50 35-85t85-35q50 0 85 35t35 85h120q33 0 56.5 23.5T800-680v80q50 0 85 35t35 85q0 50-35 85t-85 35v160q0 33-23.5 56.5T720-120H240q-33 0-56.5-23.5T160-200v-160Zm242.5-97.5Q420-475 420-500t-17.5-42.5Q385-560 360-560t-42.5 17.5Q300-525 300-500t17.5 42.5Q335-440 360-440t42.5-17.5Zm240 0Q660-475 660-500t-17.5-42.5Q625-560 600-560t-42.5 17.5Q540-525 540-500t17.5 42.5Q575-440 600-440t42.5-17.5ZM320-280h320v-80H320v80Zm-80 80h480v-480H240v480Zm240-240Z',
    /* receipt_long */
    positions: 'M240-80q-50 0-85-35t-35-85v-80q0-17 11.5-28.5T160-320h80v-536q0-7 6-9.5t11 2.5l29 29q6 6 14 6t14-6l32-32q6-6 14-6t14 6l32 32q6 6 14 6t14-6l32-32q6-6 14-6t14 6l32 32q6 6 14 6t14-6l32-32q6-6 14-6t14 6l32 32q6 6 14 6t14-6l32-32q6-6 14-6t14 6l32 32q6 6 14 6t14-6l29-29q5-5 11-2.5t6 9.5v656q0 50-35 85t-85 35H240Zm480-80q17 0 28.5-11.5T760-200v-560H320v440h320q17 0 28.5 11.5T680-280v80q0 17 11.5 28.5T720-160ZM400-680h160q17 0 28.5 11.5T600-640q0 17-11.5 28.5T560-600H400q-17 0-28.5-11.5T360-640q0-17 11.5-28.5T400-680Zm0 120h160q17 0 28.5 11.5T600-520q0 17-11.5 28.5T560-480H400q-17 0-28.5-11.5T360-520q0-17 11.5-28.5T400-560Zm280-40q-17 0-28.5-11.5T640-640q0-17 11.5-28.5T680-680q17 0 28.5 11.5T720-640q0 17-11.5 28.5T680-600Zm0 120q-17 0-28.5-11.5T640-520q0-17 11.5-28.5T680-560q17 0 28.5 11.5T720-520q0 17-11.5 28.5T680-480Z',
    /* monitoring */
    markets: 'M160-120q-17 0-28.5-11.5T120-160v-40q0-17 11.5-28.5T160-240q17 0 28.5 11.5T200-200v40q0 17-11.5 28.5T160-120Zm160 0q-17 0-28.5-11.5T280-160v-220q0-17 11.5-28.5T320-420q17 0 28.5 11.5T360-380v220q0 17-11.5 28.5T320-120Zm160 0q-17 0-28.5-11.5T440-160v-140q0-17 11.5-28.5T480-340q17 0 28.5 11.5T520-300v140q0 17-11.5 28.5T480-120Zm160 0q-17 0-28.5-11.5T600-160v-200q0-17 11.5-28.5T640-400q17 0 28.5 11.5T680-360v200q0 17-11.5 28.5T640-120Zm160 0q-17 0-28.5-11.5T760-160v-360q0-17 11.5-28.5T800-560q17 0 28.5 11.5T840-520v360q0 17-11.5 28.5T800-120ZM560-481q-16 0-30.5-6T503-504L400-607 188-395q-12 12-28.5 11.5T131-396q-11-12-10.5-28.5T132-452l211-211q12-12 26.5-17.5T400-686q16 0 31 5.5t26 17.5l103 103 212-212q12-12 28.5-11.5T829-771q11 12 10.5 28.5T828-715L617-504q-11 11-26 17t-31 6Z',
    /* send (assets/send.svg) */
    send: 'M120-160v-640l760 320-760 320Zm80-120 474-200-474-200v140l240 60-240 60v140Zm0 0v-400 400Z',
    /* attach_file (assets/attach.svg) */
    attach: 'M640-520v-200h80v200h-80ZM440-244q-35-10-57.5-39T360-350v-370h80v476Zm30 164q-104 0-177-73t-73-177v-370q0-75 52.5-127.5T400-880q75 0 127.5 52.5T580-700v300h-80v-300q-1-42-29.5-71T400-800q-42 0-71 29t-29 71v370q-1 71 49 120.5T470-160q25 0 47.5-6.5T560-186v89q-21 8-43.5 12.5T470-80Zm170-40v-120H520v-80h120v-120h80v120h120v80H720v120h-80Z'
  };

  function micon(name, size) {
    var d = M[name];
    if (!d) return '';
    var n = size || 20;
    return '<svg width="' + n + '" height="' + n + '" viewBox="0 -960 960 960" ' +
      'fill="currentColor" aria-hidden="true" focusable="false"><path d="' + d + '"></path></svg>';
  }
  window.NexSolid = micon;

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
    if (name === 'alert') body = '<circle cx="12" cy="12" r="9"></circle>' + body;
    if (name === 'gift') body = '<rect x="4.4" y="8.5" width="15.2" height="12.5" rx="1.8"></rect>' + body;
    /* Even / odd: one circle filled, one not — the split itself. */
    if (name === 'parity') body =
      '<circle cx="8" cy="12" r="4.2" fill="currentColor" stroke="none"></circle>' +
      '<circle cx="16.4" cy="12" r="4.2"></circle>';
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
    /* Thirteen stripes would be mud at 13px wide, so this is seven,
       which is what the eye reads as "the American flag" at this size. */
    US: '<rect width="24" height="16" fill="#fff"/>' +
        '<rect width="24" height="2.29" y="0" fill="#B22234"/>' +
        '<rect width="24" height="2.29" y="4.57" fill="#B22234"/>' +
        '<rect width="24" height="2.29" y="9.14" fill="#B22234"/>' +
        '<rect width="24" height="2.29" y="13.71" fill="#B22234"/>' +
        '<rect width="10" height="8.6" fill="#3C3B6E"/>',
    ZA: '<rect width="24" height="16" fill="#002395"/>' +
        '<rect width="24" height="8" fill="#DE3831"/>' +
        '<path d="M0 0l10 8-10 8z" fill="#000"/>' +
        '<path d="M0 6.2h24v3.6H0z" fill="#007A4D"/>',

    /* ---- the pairs ----
       Drawn to the same 24x16 box as the rest and simplified the same
       way the American one is: at 19px wide a faithful Union Jack is
       four grey smudges, so these keep the two or three shapes the eye
       actually uses to name a flag and drop everything else. */
    EU: '<rect width="24" height="16" fill="#039"/>' +
        '<g fill="#FC0">' +
        '<circle cx="12" cy="3.4" r=".85"/><circle cx="15" cy="4.2" r=".85"/>' +
        '<circle cx="17.2" cy="6.4" r=".85"/><circle cx="18" cy="9.4" r=".85"/>' +
        '<circle cx="17.2" cy="12.4" r=".85"/><circle cx="15" cy="14.6" r=".85"/>' +
        '<circle cx="12" cy="15.4" r=".85"/><circle cx="9" cy="14.6" r=".85"/>' +
        '<circle cx="6.8" cy="12.4" r=".85"/><circle cx="6" cy="9.4" r=".85"/>' +
        '<circle cx="6.8" cy="6.4" r=".85"/><circle cx="9" cy="4.2" r=".85"/>' +
        '</g>',
    GB: '<rect width="24" height="16" fill="#012169"/>' +
        '<path d="M0 0l24 16M24 0L0 16" stroke="#fff" stroke-width="3.2"/>' +
        '<path d="M0 0l24 16M24 0L0 16" stroke="#C8102E" stroke-width="1.9"/>' +
        '<path d="M12 0v16M0 8h24" stroke="#fff" stroke-width="5.3"/>' +
        '<path d="M12 0v16M0 8h24" stroke="#C8102E" stroke-width="3.2"/>',
    JP: '<rect width="24" height="16" fill="#fff"/>' +
        '<circle cx="12" cy="8" r="4.4" fill="#BC002D"/>',
    AU: '<rect width="24" height="16" fill="#012169"/>' +
        '<path d="M0 0h12v8H0z" fill="#012169"/>' +
        '<path d="M0 0l12 8M12 0L0 8" stroke="#fff" stroke-width="1.7"/>' +
        '<path d="M6 0v8M0 4h12" stroke="#fff" stroke-width="2.7"/>' +
        '<path d="M6 0v8M0 4h12" stroke="#C8102E" stroke-width="1.5"/>' +
        '<g fill="#fff"><circle cx="6" cy="12.6" r="1.5"/>' +
        '<circle cx="17" cy="4" r=".8"/><circle cx="20" cy="7.4" r=".8"/>' +
        '<circle cx="17.4" cy="11" r=".8"/><circle cx="21" cy="12.4" r=".8"/></g>',
    CA: '<rect width="24" height="16" fill="#fff"/>' +
        '<rect width="6" height="16" fill="#D80621"/>' +
        '<rect x="18" width="6" height="16" fill="#D80621"/>' +
        '<path d="M12 3.4l1.5 3.2 2.4-.9-1.1 3.1 1.9.5-3 2.1.5 1.6-2.2-.5-2.2.5.5-1.6-3-2.1 1.9-.5-1.1-3.1 2.4.9z" fill="#D80621"/>',
    CH: '<rect width="24" height="16" fill="#D52B1E"/>' +
        '<path d="M10.4 3.6h3.2v3.2h3.2v3.2h-3.2v3.2h-3.2v-3.2H7.2V6.8h3.2z" fill="#fff"/>',
    NZ: '<rect width="24" height="16" fill="#012169"/>' +
        '<path d="M0 0l12 8M12 0L0 8" stroke="#fff" stroke-width="1.7"/>' +
        '<path d="M6 0v8M0 4h12" stroke="#fff" stroke-width="2.7"/>' +
        '<path d="M6 0v8M0 4h12" stroke="#C8102E" stroke-width="1.5"/>' +
        '<g fill="#C8102E" stroke="#fff" stroke-width=".5">' +
        '<circle cx="19.4" cy="4" r="1"/><circle cx="16.6" cy="8" r="1"/>' +
        '<circle cx="21" cy="9.4" r="1"/><circle cx="18.6" cy="12.6" r="1"/>' +
        '</g>'
  };
  function flag(cc) {
    var body = FLAGS[cc];
    if (!body) return '';
    return '<svg class="flagsvg" viewBox="0 0 24 16" width="19" height="13" ' +
      'role="img" aria-label="' + cc + '">' + body + '</svg>';
  }
  window.NexFlag = flag;

  /* ---------- the mark on an instrument row ----------
     Three kinds, because the list has three kinds of thing in it. A
     currency pair gets both its flags, overlapped, which is the one
     mark that says "these two against each other" without words. A coin
     gets its own disc. Everything else keeps the family glyph it had.

     Kept here rather than in the feed, because the feed's table is
     about how a series behaves and this is about how it is drawn. */
  function mark(sym) {
    if (!sym) return '';
    if (sym.pair) {
      return '<span class="pairflags">' +
        '<i>' + flag(sym.pair[0]) + '</i><i>' + flag(sym.pair[1]) + '</i></span>';
    }
    if (sym.coin) {
      return '<span class="coin" style="background:' + sym.coin[1] + '">' +
        sym.coin[0] + '</span>';
    }
    return '<i class="sel-ico">' + icon(window.NexAPI.symbolIcon(sym), 16) + '</i>';
  }
  window.NexMark = mark;

  var API = window.NexAPI, F = window.NexFmt;

  /* ---------- routing ---------- */
  var BUNDLE = !!window.NEXAS_BUNDLE;
  /* Links are clean now: "positions", not "positions.html". The single
     file bundle still routes on a hash, and the multi page site lets the
     host resolve the extension, so both forms have to be accepted here
     rather than assumed. "/" is the terminal, which is index. */
  function pageName(file) {
    var name = String(file || '').replace(/^\//, '').replace(/\.html$/, '');
    return name || 'index';
  }
  function href(file) { return BUNDLE ? '#/' + pageName(file) : file; }
  function go(file) {
    if (BUNDLE) location.hash = '#/' + pageName(file);
    else location.href = file;
  }
  window.NexHref = href;
  window.NexGo = go;
  function currentPage() { return document.body.getAttribute('data-page') || 'trade'; }

  /* ---------- theme ---------- */
  var THEME_KEY = 'nexas.theme';
  /* Dark is the product's default. Light is opt-in and, once chosen,
     remembered, so a new visitor always arrives in dark. */
  function storedTheme() {
    try { return localStorage.getItem(THEME_KEY) || 'dark'; } catch (e) { return 'dark'; }
  }
  function isDark() {
    return document.documentElement.getAttribute('data-theme') !== 'light';
  }
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t === 'light' ? 'light' : 'dark');
    try { localStorage.setItem(THEME_KEY, t === 'light' ? 'light' : 'dark'); } catch (e) {}
    paintThemeToggles();
  }
  /* There are two of these now, the drawer's and the rail's, and a theme
     changed from one has to show in the other. */
  function paintThemeToggles() {
    var all = document.querySelectorAll('.theme-toggle');
    for (var i = 0; i < all.length; i++) {
      var sw = all[i].querySelector('.switch');
      if (sw) sw.setAttribute('aria-checked', String(isDark()));
      var ic = all[i].querySelector('svg');
      if (ic) ic.outerHTML = icon(isDark() ? 'moon' : 'sun', 17);
    }
  }
  applyTheme(storedTheme());

  /* ---------- a dropdown we drew ourselves ----------
     A native <select> hands its menu to the operating system, which
     styles it in the browser's own font on the browser's own white, and
     on a dark trading screen that is a rectangle of somebody else's
     design dropped into the middle of ours. It also cannot carry a
     second line, which several of these want.

     Same contract as a <select>: a value, an onChange, and the keyboard
     works. The host element is replaced, so the caller passes an empty
     container and keeps the returned handle.

       NexSelect(host, {
         options: [{ value, label, note, group, icon }],
         value, onChange, align: 'left' | 'right'
       })
  */
  function NexSelect(host, opts) {
    opts = opts || {};
    var options = opts.options || [];
    var value = opts.value != null ? opts.value : (options[0] || {}).value;
    var open = false;

    function find(v) {
      for (var i = 0; i < options.length; i++) if (options[i].value === v) return options[i];
      return options[0] || { label: '' };
    }

    host.classList.add('sel');
    if (opts.align === 'right') host.classList.add('sel-right');
    host.innerHTML =
      '<button type="button" class="sel-btn" aria-haspopup="listbox" aria-expanded="false">' +
        '<span class="sel-now"></span>' + icon('chevD', 12) +
      '</button>' +
      '<div class="sel-pop" role="listbox" hidden></div>';

    var btn = host.querySelector('.sel-btn');
    var pop = host.querySelector('.sel-pop');
    var now = host.querySelector('.sel-now');

    /* An option can bring its own mark as markup — two flags, a coin —
       rather than the name of a glyph in the icon set. */
    function markup(o) {
      if (o.iconHtml) return o.iconHtml;
      return o.icon ? '<i class="sel-ico">' + icon(o.icon, 15) + '</i>' : '';
    }

    function paint() {
      var cur = find(value);
      now.innerHTML = markup(cur) + '<span>' + cur.label + '</span>';
      var lastGroup = null;
      pop.innerHTML = options.map(function (o) {
        var head = '';
        if (o.group && o.group !== lastGroup) {
          lastGroup = o.group;
          head = '<div class="sel-group">' + o.group + '</div>';
        }
        return head +
          '<button type="button" class="sel-row' + (o.value === value ? ' on' : '') +
            '" role="option" aria-selected="' + (o.value === value) + '" data-val="' + o.value + '">' +
            markup(o) +
            '<span class="sel-t"><b>' + o.label + '</b>' +
              (o.note ? '<span>' + o.note + '</span>' : '') + '</span>' +
            /* Whatever the caller wants on the right of the row. The
               terminal puts the price and how far it has moved there,
               and repaints it in place while the list is open. */
            (o.tail ? '<span class="sel-tail">' + o.tail + '</span>' : '') +
            (o.value === value ? icon('check', 15) : '') +
          '</button>';
      }).join('');
    }

    function setOpen(next) {
      open = next;
      pop.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
      host.classList.toggle('open', open);
    }

    function choose(v) {
      value = v;
      paint();
      setOpen(false);
      if (opts.onChange) opts.onChange(find(v));
    }

    btn.addEventListener('click', function (e) { e.preventDefault(); setOpen(!open); });
    pop.addEventListener('click', function (e) {
      var row = e.target.closest('[data-val]');
      if (row) choose(row.getAttribute('data-val'));
    });
    host.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && open) { setOpen(false); btn.focus(); }
    });
    document.addEventListener('click', function (e) {
      if (open && !host.contains(e.target)) setOpen(false);
    });

    paint();
    return {
      value: function () { return value; },
      set: choose,
      setOptions: function (next, keep) {
        options = next || [];
        if (!keep) value = (options[0] || {}).value;
        paint();
      }
    };
  }
  window.NexSelect = NexSelect;

  /* ---------- chrome ---------- */
  var TABS = [
    { id: 'trade', label: 'Trade', file: '/', icon: 'candles' },
    { id: 'ai', label: 'AI', file: 'ai', icon: 'bot' },
    { id: 'positions', label: 'Positions', file: 'positions', icon: 'positions' },
    { id: 'markets', label: 'Markets', file: 'markets', icon: 'markets' }
  ];
  /* ---------- the desktop rail ----------
     Everything the phone can reach. A desktop had five links in the top
     bar and no way at all to get to Deposit, Withdraw, Verify identity
     or the theme: the button that opens the drawer is phone-only, so
     two thirds of the menu simply did not exist on a laptop. The rail
     carries the lot.

     Thin by default, 64px, and it widens over the page on hover to show
     the names. It overlays rather than pushes, so nothing reflows when
     a cursor crosses it.

     The four pages keep the solid glyphs the bottom bar uses, so the
     same place is the same mark on both. Everything below them is the
     stroke set, which is the drawer's: pages are solid, actions are
     drawn. */
  var RAIL = [
    TABS.map(function (t) {
      return { id: t.id, label: t.label, file: t.file, solid: t.icon };
    }),
    [
      { label: 'Deposit', modal: 'deposit', icon: 'down' },
      { label: 'Withdraw', modal: 'withdraw', icon: 'up' }
    ],
    [
      { id: 'history', label: 'Trading history', file: 'history', icon: 'clock' },
      { id: 'copy', label: 'Copy trading', file: 'copy', icon: 'copy' }
    ],
    [
      { id: 'account', label: 'Account', file: 'account', icon: 'user' },
      { label: 'Profile and name', modal: 'profile', icon: 'idcard' },
      { label: 'Update password', modal: 'password', icon: 'lock' },
      { label: 'Verify identity', modal: 'verify', icon: 'shield' }
    ],
    [
      { id: 'chat', label: 'Support', file: 'chat', icon: 'headset' },
      { id: 'learn', label: 'Learn', file: 'learn', icon: 'book' },
      { label: 'Refer and earn', modal: 'refer', icon: 'gift' }
    ]
  ];

  /* Stacked: the account kind sits over the amount, which roughly halves
     how much of the top bar this button takes. */
  function balanceMarkup() {
    var kind = API.account.kind();
    var real = kind === 'real';
    /* Dollars, because that is the currency the balance is actually
       held in: every contract, every payout and the ledger itself are
       USD, and showing it converted meant the figure on the chip never
       matched the figure in the account. */
    /* Both balances are dollars, so both carry the same flag. A
       Kenyan flag beside a figure in USD was the old local-money layer
       leaving a fingerprint. */
    return '<span class="acct-flag">' + (flag('US') || '') + '</span>' +
      '<span class="acct-txt">' +
        '<span class="acct-kind">' + kind + ' · USD</span>' +
        '<span class="bal num">' +
          (real ? F.usdAmount(API.account.balance()) : F.amount(API.account.balance())) +
        '</span>' +
      '</span>' + icon('chevD', 12);
  }

  /* The name, in two lines, with a monogram beside it. One place, so
     the bar and the sign-in pages cannot drift apart.

     aria-label carries the whole name: a screen reader reading "NB NOVI
     BINARY" off three separate elements is not the name of anything. */
  function wordmark(to) {
    return '<a class="wordmark" href="' + to + '" aria-label="Novi Binary">' +
      '<span class="wm-name" aria-hidden="true"><b>Novi</b><i>Binary</i></span>' +
    '</a>';
  }
  window.NexWordmark = wordmark;

  function topbar(page) {
    var back = document.body.getAttribute('data-back');
    var title = document.body.getAttribute('data-title');

    if (title) {
      return '<header class="topbar">' +
        '<a class="iconbtn back-btn" href="' + href(back || '/') + '" aria-label="Back">' + icon('back', 18) + '</a>' +
        '<div class="topbar-title">' + title + '</div>' +
        '<span class="iconbtn" aria-hidden="true"></span>' +
      '</header>';
    }

    /* No link row here any more. The rail below the bar holds every
       link there is, and a second copy of five of them in the bar was
       the same navigation said twice. */
    return '<header class="topbar">' +
      '<button class="iconbtn only-mob" id="menuBtn" aria-label="Open menu">' + icon('menu', 19) + '</button>' +
      wordmark(href('/')) +
      '<span class="spacer"></span>' +
      '<button class="acct ' + API.account.kind() + '" data-open="switch" id="acctBtn" ' +
        'aria-label="Switch account">' + balanceMarkup() + '</button>' +
      '<button class="btn-primary" data-open="deposit">Deposit</button>' +
      '<button class="iconbtn bell" data-open="alerts" aria-label="Notifications">' + icon('bell', 18) + '<i></i></button>' +
    '</header>';
  }

  /* The drawer is open on a table, on a phone somebody else can see, in
     a screen share. The address is there to confirm which account this
     is, and the middle of it does not help with that. */
  function maskEmail(e) {
    e = (e || '').trim();
    var at = e.indexOf('@');
    if (at < 1) return e;
    var name = e.slice(0, at), rest = e.slice(at);
    var shown = name.length <= 2
      ? name.charAt(0) + '•••'
      : name.charAt(0) + '•••' + name.charAt(name.length - 1);
    return shown + rest;
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
        '<a class="drawer-user" href="' + href('account') + '">' +
          '<div class="avatar">' + (s.name || 'A').charAt(0) + '</div>' +
          '<div><b>' + (s.name || 'Guest') + '</b><span>' +
            (s.email ? maskEmail(s.email) : 'not signed in') + '</span></div>' +
          icon('chev', 16) +
        '</a>' +
        '<div class="dnav">' +
          group('Account', 'user', [
            item('Profile and name', { icon: 'idcard', modal: 'profile' }),
            item('Update password', { icon: 'lock', modal: 'password' }),
            item('Verify identity', { icon: 'shield', modal: 'verify' })
          ], true) +
          /* Deposit and Withdraw stand on their own. They were behind a
             "Funds" heading, which is a word to read and a caret to
             reason about in front of the two most-used items in this
             menu; and the group was open by default anyway, so the
             heading only ever cost a row. */
          item('Deposit', { icon: 'down', modal: 'deposit' }) +
          item('Withdraw', { icon: 'up', modal: 'withdraw' }) +
          item('Trading history', { icon: 'clock', href: 'history' }) +
          item('Copy trading', { icon: 'copy', href: 'copy' }) +
          item('Support', { icon: 'headset', href: 'chat' }) +
          item('Learn', { icon: 'book', href: 'learn' }) +
          item('Refer and earn', { icon: 'gift', modal: 'refer' }) +
          item('Light / dark theme', {
            icon: isDark() ? 'moon' : 'sun',
            tail: '<i class="switch" role="switch" aria-checked="' + isDark() + '"></i>',
            cls: 'theme-toggle'
          }) +
        '</div>' +
        '<div class="drawer-foot">' +
          '<button class="ditem danger" data-signout>' + icon('out', 17) + '<span>Log out</span></button>' +
        '</div>' +
      '</aside>';
  }

  function tabbar(page) {
    return '<nav class="tabbar only-mob">' + TABS.map(function (t) {
      return '<a href="' + href(t.file) + '" class="' + (t.id === page ? 'active' : '') + '">' +
        '<i class="tb-ico">' + micon(t.icon, 22) + '</i>' +
        '<i class="tb-lab">' + t.label + '</i></a>';
    }).join('') + '</nav>';
  }

  /* The rail. One row per link, the glyph in a fixed 64px box so the
     icons line up whether or not the names are showing. */
  function rail(page) {
    function row(it) {
      var on = it.id && it.id === page;
      var tag = it.file ? 'a' : 'button';
      var attrs = it.file ? ' href="' + href(it.file) + '"' : ' type="button"';
      if (it.modal) attrs += ' data-open="' + it.modal + '"';
      if (it.signout) attrs += ' data-signout';
      if (on) attrs += ' aria-current="page"';
      return '<' + tag + ' class="rnav' + (on ? ' on' : '') + (it.cls ? ' ' + it.cls : '') + '"' +
        attrs + '>' +
        '<i class="rnav-ico">' + (it.solid ? micon(it.solid, 20) : icon(it.icon, 17)) + '</i>' +
        '<span class="rnav-lab">' + it.label + '</span>' +
        (it.tail || '') +
      '</' + tag + '>';
    }

    var body = RAIL.map(function (grp) {
      return grp.map(row).join('');
    }).join('<div class="rail-sep"></div>');

    /* The theme sits at the foot with its switch, same control as the
       drawer's — the switch is only visible once the rail is open, and
       the sun or moon carries the state until then. */
    var foot =
      row({
        label: 'Light / dark theme', icon: isDark() ? 'moon' : 'sun', cls: 'theme-toggle',
        tail: '<i class="switch" role="switch" aria-checked="' + isDark() + '"></i>'
      }) +
      row({ label: 'Log out', icon: 'out', cls: 'danger', signout: true });

    return '<nav class="rail only-desk" id="rail" aria-label="Sections">' +
      '<div class="rail-body">' + body + '</div>' +
      '<div class="rail-foot">' + foot + '</div>' +
    '</nav>';
  }

  /* ---------- modal engine ---------- */
  var state = { key: null, step: null, trail: [], data: {} };
  var lastFocus = null;

  function host() {
    var h = document.getElementById('modalHost');
    if (!h) { h = document.createElement('div'); h.id = 'modalHost'; document.body.appendChild(h); }
    return h;
  }
  /* ---------- overlays and the back button ----------
     A dialog or the drawer is a place the person went, so Back should
     bring them out of it rather than off the page entirely. Opening one
     pushes a history entry; Back pops it and we close instead of
     navigating. Closing from the UI rewinds that entry so the stack does
     not fill up with dead states. */
  /* One history entry covers "something is open", whatever that is.
     Pushing and popping per call raced badly: choosing Deposit from the
     drawer closed the drawer (queueing a history.back) and opened the
     dialog in the same tick, so the late pop arrived and shut the dialog
     again. Intent is tracked in flags and reconciled once per tick, so
     handing over from one overlay to another touches history not at all. */
  var overlayDepth = 0;
  var modalOpen = false, drawerOpen = false;
  var syncTimer = null;

  function syncOverlay() {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(function () {
      var want = modalOpen || drawerOpen;
      if (want && !overlayDepth) {
        overlayDepth = 1;
        try { history.pushState({ nexOverlay: true }, ''); } catch (e) { overlayDepth = 0; }
      } else if (!want && overlayDepth) {
        overlayDepth = 0;
        try { history.back(); } catch (e) {}
      }
    }, 0);
  }

  window.addEventListener('popstate', function () {
    if (!overlayDepth) return;                /* a real navigation */
    overlayDepth = 0;
    clearTimeout(syncTimer);                  /* no queued push may undo this */
    if (modalOpen) closeModals(true);
    if (drawerOpen) setDrawer(false, true);
  });

  var closeToken = 0;
  /* Money surfaces need an account behind them, for the same reason the
     real balance does: a deposit form for somebody with no account
     collects a number and then fails at the server. Send them to sign up
     instead, it is what the form was going to ask for anyway. */
  var NEEDS_ACCOUNT = { deposit: 1, withdraw: 1 };

  function openModal(key, stepId, data) {
    var def = window.NexModals && window.NexModals[key];
    if (!def) return;
    if (NEEDS_ACCOUNT[key] && !API.account.realAvailable()) {
      leaveTo('signup');
      return;
    }
    closeToken++;
    lastFocus = document.activeElement;
    modalOpen = true;
    syncOverlay();
    state = { key: key, step: stepId || Object.keys(def.steps)[0], trail: [], data: data || {} };
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
            (state.trail.length && !step.noBack
              ? '<button class="iconbtn back-btn" data-modal-back aria-label="Back">' + icon('back', 17) + '</button>'
              : '') +
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
    /* Steps that need real elements wired once they are on screen. */
    if (state.key === 'ticket' && state.step === 'form') mountTicketForm();
    mountPhonePickers();
  }
  /* Exported so a page that renders a phone field outside a dialog can
     bring its picker to life the same way. */
  window.NexPhonePickers = function () { mountPhonePickers(); };
  /* ---------- leaving for another page ----------
     Closing an overlay rewinds the history entry it pushed, and that
     rewind is queued on a timer. Set location straight after it and the
     rewind lands on top of the navigation: the dialog shuts and the page
     never changes. That is what left somebody who pressed "Sign up" on
     the real account still sitting in the demo one.

     So when the next thing is a page and not a closed dialog, forget the
     entry instead of asking history to move, then go. The stray entry is
     the same URL we are leaving, so Back still comes back here. */
  function leaveTo(file) {
    overlayDepth = 0;
    clearTimeout(syncTimer);
    if (drawerOpen) setDrawer(false, true);
    closeModals(true);
    go(file);
  }

  function closeModals(fromPop) {
    payToken++;                               /* nothing pending may land now */
    var m = host().querySelector('.modal');
    if (!m) { modalOpen = false; return; }
    modalOpen = false;
    if (!fromPop) syncOverlay();
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
     else, either way the person ends up holding the link. */
  function shareLink(url) {
    if (navigator.share) {
      navigator.share({
        title: 'Novi',
        text: 'I trade synthetic indices on Novi. Join with my link.',
        url: url
      }).catch(function () {});
      return;
    }
    copyText(url, 'Referral link copied, paste it anywhere');
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
  /* The IP lookup landing later than the form did. Only the fields
     nobody has touched are moved: somebody who has already chosen a
     country has said something, and a background lookup must not
     overrule them. */
  function paintCountry() {
    var c = API.geo.country();
    var ccs = document.querySelectorAll('[data-cc-picker]');
    for (var i = 0; i < ccs.length; i++) {
      if (ccs[i].__sel && !ccs[i].__touched) ccs[i].__sel.set(API.geo.code());
    }
  }

  /* ---------- the country on a phone field ----------
     Mounted after the markup is on screen, because the picker is a live
     control rather than a string. The list is the countries mobile money
     actually reaches, which is the same table the deposit rails come
     from, so the two can never offer different answers. */
  function mountPhonePickers() {
    var hosts = document.querySelectorAll('[data-cc-picker]');
    for (var i = 0; i < hosts.length; i++) {
      (function (host) {
        if (host.__sel || !window.NexCountries) return;
        var fieldId = host.getAttribute('data-cc-picker');
        var hidden = document.getElementById(fieldId + 'Country');
        var input = document.getElementById(fieldId);
        var pay = API.geo.countries;
        /* Narrow to the deposit rails, unless the field asked for
           everything — see phoneField(). */
        var all = host.hasAttribute('data-cc-all');

        host.__sel = window.NexCountries.mountPicker(host, {
          value: host.getAttribute('data-cc') || 'KE',
          only: all ? null : Object.keys(pay),
          onChange: function (chosen) {
            if (hidden) hidden.value = chosen.cc;
            var local = pay[chosen.cc];
            if (input) {
              /* A local format to copy where we have one; a plain prompt
                 where we do not, rather than holding up a Kenyan number
                 as the example of a Portuguese one. */
              input.placeholder = local ? local.sample : 'Phone number';
              /* The number was typed for a different country, and the
                 length rules differ. Clearing is kinder than sending it
                 and being told it is the wrong length. */
              if (host.__touched) input.value = '';
            }
            host.__touched = true;
          }
        });
        /* The first onChange is the mount, not a choice. */
        host.__touched = false;
      })(hosts[i]);
    }
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

  /* ---------- loader ---------- */
  function loader(cls) {
    return '<span class="scaleloader ' + (cls || '') + '" role="status" aria-label="Loading">' +
      '<i></i><i></i><i></i><i></i><i></i></span>';
  }
  window.NexLoader = loader;

  /* A block for a panel or a page that has nothing to show yet. */
  window.NexLoading = function (label) {
    return '<div class="loading-block">' + loader() +
      '<span>' + (label || 'Loading') + '</span></div>';
  };

  /* The app is useless until the price feed answers, so hold a veil over
     it rather than showing a dead terminal with zeroes in it. */
  /* Once per session, not once per page. The feed connects in a second
     or two and then stays connected; showing "Connecting to the feed"
     again on every tab change is the app blinking at its own user. */
  var FEED_SEEN = 'nexas.feedSeen';
  function feedSeen() {
    try { return sessionStorage.getItem(FEED_SEEN) === '1'; } catch (e) { return false; }
  }
  function markFeedSeen() {
    try { sessionStorage.setItem(FEED_SEEN, '1'); } catch (e) {}
  }

  function bootVeil() {
    if (document.body.getAttribute('data-chrome') !== 'app') return;
    if (feedSeen()) return;
    if (document.getElementById('bootVeil')) return;
    var v = document.createElement('div');
    v.className = 'boot';
    v.id = 'bootVeil';
    v.innerHTML = '<div class="boot-word">Novi</div>' + loader() +
      '<span>Connecting to the feed</span>';
    document.body.appendChild(v);
  }
  function dropVeil() {
    markFeedSeen();
    var v = document.getElementById('bootVeil');
    if (!v) return;
    v.classList.add('gone');
    setTimeout(function () { if (v.parentNode) v.parentNode.removeChild(v); }, 320);
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
    /* Only a real drop. 'booting' is the second before the feed answers
       on a fresh load, and announcing it flashed an amber "Connecting"
       bar on every single navigation, which reads as a platform that
       keeps losing its connection, on a site whose whole job is to look
       dependable. The boot veil already covers that moment. */
    var show = st === 'reconnecting';
    b.className = 'conn-banner' + (show ? ' show' : '');
    b.innerHTML = show ? '<span class="spin"></span>Reconnecting to the price feed' : '';
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

  /* ---------- sign-in transition ---------- */
  /* Pass a destination and it shows, waits, and goes there. Pass none
     and it simply stays up until the caller takes it down, which is what
     an OAuth return needs: the wait is a network round trip of unknown
     length, not a fixed 1.6 seconds. */
  function splash(message, to) {
    var el = document.createElement('div');
    el.className = 'splash';
    el.innerHTML = '<div class="splash-inner">' +
      '<div class="pulse"><i></i><i></i><i></i></div>' +
      '<div class="splash-word">Novi</div>' +
      '<div class="splash-msg" role="status">' + message + '</div></div>';
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('open'); });

    if (to) {
      setTimeout(function () {
        if (BUNDLE) { go(to); el.remove(); } else location.href = to;
      }, 1600);
    }
    return el;
  }
  window.NexSplash = splash;

  /* ---------- session guard ---------- */
  function guard() {
    if (document.body.getAttribute('data-chrome') !== 'app') return true;
    if (API.session.get()) return true;
    if (window.NexNet && window.NexNet.live && window.NexNet.signedIn()) return true;
    /* A signed-out visitor should meet the pitch, not a login form. */
    go('landing');
    return false;
  }

  /* ---------- auth submission ----------
     One handler for sign-in, sign-up and reset, because all three end
     the same way: a session, or a message under the right field. When
     no API is configured it falls through to the local simulation so
     the interface stays walkable. */
  function busy(form, on, label) {
    var btn = form.querySelector('[type=submit], .btn-fill');
    if (!btn) return;
    if (on) {
      btn.dataset.idle = btn.dataset.idle || btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = loader('sm') + (label || 'Please wait');
    } else {
      btn.disabled = false;
      if (btn.dataset.idle) btn.innerHTML = btn.dataset.idle;
    }
  }

  /* The server answers with per-field complaints; put each one under the
     field it belongs to instead of flattening them into a toast. */
  /* A validation failure carries a message per field. On a form we can
     mark the input; from a modal that has already moved on there is no
     input left to mark, so the field message has to travel in the toast
     "Check the details you entered" on its own tells nobody anything. */
  function serverErrorText(err) {
    var msg = err.message || 'Something went wrong';
    if (err.fields) {
      var first = Object.keys(err.fields)[0];
      if (first && err.fields[first]) return err.fields[first];
    }
    return msg;
  }

  function showServerErrors(form, err) {
    if (err.fields) {
      var placed = false;
      Object.keys(err.fields).forEach(function (name) {
        var input = form.querySelector('#' + name) ||
                    form.querySelector('[name="' + name + '"]') ||
                    (name === 'email' ? form.querySelector('input[type=email]') : null) ||
                    (name === 'password' ? passwordIn(form, '#password') : null);
        if (input) { markField(input, err.fields[name]); placed = true; }
      });
      if (placed) return;
    }
    window.NexToast(serverErrorText(err));
  }

  /* Find a password box by what it is for, rather than by its current
     type. The reveal button flips type between "password" and "text", so
     input[type=password] matches nothing the moment somebody taps the
     eye to check what they typed: the form then submits an empty
     password and the server rejects the body as malformed. A 400 on a
     correct password, for exactly the people careful enough to look.

     Used by the submit path, the client side check and the error
     placer, so all three agree on which element is the password. */
  function passwordIn(form, selector) {
    return form.querySelector(selector) ||
           form.querySelector('input[autocomplete=current-password]') ||
           form.querySelector('input[autocomplete=new-password]') ||
           form.querySelector('input[type=password]') ||
           form.querySelector('input[type=text][data-password]');
  }

  async function submitAuthForm(f) {
    var kind = f.getAttribute('data-auth') || 'login';
    var to = f.getAttribute('data-to') || '/';
    var splashText = f.getAttribute('data-splash');
    var emailInput = f.querySelector('input[type=email]');
    var email = emailInput ? emailInput.value.trim().toLowerCase() : '';

    if (!window.NexNet || !window.NexNet.live) {
      /* No backend configured: keep the original local behaviour. */
      API.session.signIn(email, 'password');
      splash(splashText, to);
      return;
    }

    busy(f, true, kind === 'signup' ? 'Creating' : 'Signing in');
    try {
      if (kind === 'signup') {
        var first = (f.querySelector('#sFirst') || {}).value || '';
        var last = (f.querySelector('#sLast') || {}).value || '';
        var whole = (first + ' ' + last).trim();
        var out = await window.NexNet.signup({
          email: email,
          password: (passwordIn(f, '#newPassword') || {}).value || '',
          name: whole || email.split('@')[0],
          phone: (f.querySelector('#sPhone') || {}).value || undefined,
          /* Chosen on the form, not guessed from an IP address. It sets
             the dialling code the number is read against and the
             currency every later screen is priced in. */
          country: ((f.querySelector('#sCountry') || {}).value) || undefined
        });
        if (out.needsConfirmation) {
          busy(f, false);
          window.NexToast('Check your email to confirm the address, then sign in.');
          return;
        }
      } else if (kind === 'reset') {
        /* Supabase sends the recovery token back in the URL fragment. */
        var frag = new URLSearchParams(location.hash.replace(/^#/, ''));
        var token = frag.get('access_token');
        if (!token) {
          busy(f, false);
          window.NexToast('Open this page from the link in your email.');
          return;
        }
        await window.NexNet.resetPassword(token, (passwordIn(f, '#newPassword') || {}).value || '');
        busy(f, false);
        window.NexToast('Password updated. Sign in with the new one.');
        setTimeout(function () { go('login'); }, 900);
        return;
      } else if (kind === 'forgot') {
        await window.NexNet.forgotPassword(email);
        busy(f, false);
        window.NexToast('If that address has an account, a reset link is on its way.');
        return;
      } else {
        await window.NexNet.login(email, (passwordIn(f, '#password') || {}).value || '');
      }

      await hydrateSession();
      splash(splashText, to);
    } catch (err) {
      busy(f, false);
      showServerErrors(f, err);
    }
  }

  /* Pull the server's idea of who this is and what they hold, and let
     the local API mirror it so every existing screen keeps working. */
  async function hydrateSession() {
    if (!window.NexNet || !window.NexNet.live || !window.NexNet.signedIn()) return null;
    try {
      var out = await window.NexNet.session();
      API.session.adopt({
        id: out.user.id,
        email: out.user.email,
        name: out.profile && out.profile.display_name,
        kyc: out.profile && out.profile.kyc_status,
        phone: out.profile && out.profile.phone,
        country: out.profile && out.profile.country,
        /* The presentation switch, as the server reports it. The browser
           never decides this. */
        demoMode: !!(out.profile && out.profile.demo_mode),
        tier: (out.profile && out.profile.tier) || 'standard'
      }, out.accounts || []);
      paintDemoBadge();
      return out;
    } catch (err) {
      return null;
    }
  }
  window.NexHydrate = hydrateSession;

  /* ---------- form validation ----------
     Everything the person types is checked before anything is submitted,
     and the message lands under the field that is wrong rather than in a
     toast that disappears. */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function markField(input, msg) {
    var wrap = input.closest('.field') || input.parentNode;
    var err = wrap.querySelector('.field-error');
    if (!msg) { if (err) err.remove(); wrap.classList.remove('bad'); return true; }
    if (!err) {
      err = document.createElement('div');
      err.className = 'field-error';
      err.setAttribute('role', 'alert');
      wrap.appendChild(err);
    }
    err.textContent = msg;
    wrap.classList.add('bad');
    return false;
  }

  function validateForm(f) {
    var firstBad = null;
    function fail(input, msg) {
      markField(input, msg);
      if (!firstBad) firstBad = input;
    }

    var email = f.querySelector('input[type=email]');
    if (email) {
      var v = email.value.trim();
      if (!v) fail(email, 'Enter your email address');
      else if (!EMAIL_RE.test(v)) fail(email, 'That does not look like an email address');
      else markField(email, null);
    }

    /* A new password is held to the full rules; an existing one only has
       to be present, since the rules may have changed since they set it. */
    var fresh = f.querySelector('#newPassword');
    if (fresh) {
      var bad = fresh.value ? pwFirstFailure(fresh.value) : 'Choose a password';
      if (bad) fail(fresh, bad);
      else markField(fresh, null);

      var again = f.querySelector('#confirmNew');
      if (again) {
        if (!again.value) fail(again, 'Repeat the password');
        else if (again.value !== fresh.value) fail(again, 'These do not match');
        else markField(again, null);
      }
    } else {
      var pw = passwordIn(f, '#password');
      if (pw && !pw.value) fail(pw, 'Enter your password');
      else if (pw) markField(pw, null);
    }

    /* Only a box that actually is a consent. This used to match any
       checkbox inside a .checkline, which on the sign-in page is "Keep
       me signed in", so anyone who left that unticked was told to
       "accept the terms" and could not sign in at all. A convenience
       toggle was gating the door. */
    var consent = f.querySelector('input[type=checkbox][data-consent], input[type=checkbox][required]');
    if (consent && !consent.checked) {
      window.NexToast('Accept the terms to continue');
      if (!firstBad) firstBad = consent;
    }

    var otp = f.querySelectorAll('.otp input');
    if (otp.length) {
      var code = '';
      for (var i = 0; i < otp.length; i++) code += (otp[i].value || '').trim();
      if (code.length < otp.length) {
        window.NexToast('Enter the ' + otp.length + '-digit code');
        if (!firstBad) firstBad = otp[0];
      }
    }

    if (firstBad) { firstBad.focus(); return false; }
    return true;
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
    /* The rail is fixed, so where it lands in the document does not
       matter to the layout — only that it is inside the app shell. */
    root.insertAdjacentHTML('beforeend', rail(page) + drawer() + (sub ? '' : tabbar(page)));
    watchScroll();
  }

  /* A class while the page is moving, cleared a moment after it stops.
     The floating dock uses it to lift slightly, which is what makes it
     read as sitting above the page rather than being part of it.
     Passive, and it sets one class: the listener itself must never be
     the reason a scroll stutters. */
  function watchScroll() {
    var idle = null;
    addEventListener('scroll', function () {
      document.body.classList.add('scrolling');
      clearTimeout(idle);
      idle = setTimeout(function () {
        document.body.classList.remove('scrolling');
      }, 260);
    }, { passive: true });
  }

  function setDrawer(open, fromPop) {
    var d = document.getElementById('drawer'), s = document.getElementById('scrim');
    if (!d) return;
    drawerOpen = !!open;
    if (!fromPop) syncOverlay();
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

      if (t.closest('.theme-toggle')) {
        e.preventDefault();
        applyTheme(isDark() ? 'light' : 'dark');
        return;
      }

      var grp = t.closest('.dgroup-head');
      if (grp) {
        var opened = grp.parentElement.classList.toggle('open');
        grp.setAttribute('aria-expanded', String(opened));
        return;
      }

      if (t.closest('[data-signout]')) {
        if (window.NexNet && window.NexNet.live) window.NexNet.logout();
        API.session.signOut();
        splash('Signing you out', 'landing');
        return;
      }

      var consent = t.closest('[data-consent]');
      if (consent) {
        API.prefs.setConsent(true);
        var bar = consent.closest('.consent');
        if (bar) bar.remove();
        return;
      }

      var sp = t.closest('[data-splash]');
      if (sp && sp.tagName !== 'FORM') {
        e.preventDefault();
        if (window.NexNet && window.NexNet.live) {
          /* Hand off to Supabase's consent screen. Nothing Google-shaped
             is ever posted to our own origin. */
          sp.disabled = true;
          window.NexNet.googleUrl().then(function (url) {
            location.href = url;
          }).catch(function (err) {
            sp.disabled = false;
            window.NexToast(err.message);
          });
          return;
        }
        API.session.signIn(null, 'google');
        splash(sp.getAttribute('data-splash'), sp.getAttribute('data-to') || '/');
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
      if (el.classList && el.classList.contains('input')) {
        var holder = el.closest('.field');
        if (holder && holder.classList.contains('bad')) markField(el, null);
      }
      if (el.classList && el.classList.contains('phone-input')) {
        var atEnd = el.selectionStart === el.value.length;
        var c = API.geo.country();
        var next = formatPhone(el.value, c.sample, c.dial);
        if (next !== el.value) {
          el.value = next;
          if (!atEnd) { try { el.setSelectionRange(next.length, next.length); } catch (x) {} }
        }
      }
      /* The shilling figure under a dollar field, kept in step with what
         is typed rather than fixed at whatever the form opened on. */
      var charge = document.querySelector('[data-charge="' + el.id + '"]');
      if (charge) {
        var cRate = +(charge.getAttribute('data-rate') || 1) || 1;
        charge.textContent = 'Charged as ' +
          F.localMoney(Math.round((+el.value || 0) * cRate), charge.getAttribute('data-cur'));
      }

      var total = document.querySelector('[data-total="' + el.id + '"]');
      if (total) {
        /* The field and the fee are both in the viewer's currency
           already, so this formats rather than converts. */
        var fee = +(total.getAttribute('data-fee') || 0);
        var fx = +(total.getAttribute('data-fx') || 1) || 1;
        total.textContent = F.localMoney(Math.max(0, (+el.value || 0) - fee) / fx);
      }
    });

    document.addEventListener('submit', function (e) {
      var f = e.target;
      if (!f.hasAttribute) return;
      if (f.hasAttribute('data-splash')) {
        e.preventDefault();
        if (!validateForm(f)) return;
        submitAuthForm(f);
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

  /* ---------- money, for real ----------
     The balance is never touched here. The server credits it when the
     provider confirms, and the screen picks that up from the session
     it re-reads afterwards. A client that adds to its own balance is a
     client that disagrees with the ledger the moment anything fails. */
  /* ---------- explaining a failed payment ----------
     Two kinds of failure, and telling them apart is the whole job.

     Some are the customer's to act on: the prompt was declined, the PIN
     was wrong, the balance was short. Telling that person "this is our
     fault, we are fixing it" sends them away to wait for a fix that is
     never coming, and they try again an hour later with the same empty
     wallet. So those say plainly what happened.

     The rest, a provider that did not answer, a gateway error, a push
     that never left, are ours. Those say so, and say it without making
     the customer feel they did something wrong, because they did not.

     Anything we cannot place goes in the second bucket. Blaming the
     customer on a guess is the worse of the two mistakes. */
  var MPESA_THEIRS = [
    { re: /cancel/i,
      headline: 'Prompt cancelled',
      detail: 'Cancelled on your phone',
      note: 'Nothing was taken. Send it again when you are ready.' },
    { re: /insufficient|balance/i,
      headline: 'Not enough in M-Pesa',
      detail: 'Insufficient funds',
      note: 'Nothing was taken. Top up or try a smaller amount.' },
    { re: /pin|incorrect|wrong/i,
      headline: 'PIN not accepted',
      detail: 'PIN rejected',
      note: 'Nothing was taken. You can try again.' },
    { re: /timeout|timed out|expired|no response|not answered/i,
      headline: 'Prompt expired',
      detail: 'Not approved in time',
      note: 'Nothing was taken. Send it again and approve the prompt.' }
  ];

  function explainFailure(reason, method) {
    var text = String(reason || '');
    var mpesa = method !== 'card';

    if (mpesa) {
      for (var i = 0; i < MPESA_THEIRS.length; i++) {
        if (MPESA_THEIRS[i].re.test(text)) {
          return {
            headline: MPESA_THEIRS[i].headline,
            note: MPESA_THEIRS[i].note,
            detail: MPESA_THEIRS[i].detail,
            ref: state.data.ref || null
          };
        }
      }
    }

    /* Ours, or unattributable, which we treat as ours. */
    return {
      headline: mpesa ? 'M-Pesa is not responding' : 'Payment could not be completed',
      note: 'This is on us, not you. Nothing was charged. We are on it, try again shortly.',
      detail: text ? text.slice(0, 90) : 'No response from the provider',
      ref: state.data.ref || null
    };
  }

  function failDeposit(reason, method) {
    state.data.fail = explainFailure(reason, method);
    gotoStep('failed');
  }

  /* phone is passed in, not read from the DOM. gotoStep('pending') below
     replaces the modal body, so by the time this function looks for the
     number the input it came from no longer exists, which sent an empty
     string to the API, failed validation, and meant no STK prompt ever
     left the building. Read your inputs before you repaint. */
  async function liveDeposit(amount, money, phone) {
    var method = state.data.method;
    var token = ++payToken;
    gotoStep('pending');

    try {
      var started;
      if (method === 'usdt') {
        /* Reported, not collected: the transfer has already happened and
           nothing here can confirm it. The row goes in pending and a
           person credits it after looking at the chain. */
        started = await window.NexNet.depositUsdt(Math.round(amount * 100), state.data.txHash);
      } else if (method === 'card') {
        started = await window.NexNet.depositCard(Math.round(amount * 100));
        /* Paystack collects the card on its own page. Same tab, not a
           popup: this runs after an await, so the click that opened it is
           no longer the current gesture and window.open is silently
           blocked. The return trip carries ?deposit=<reference>, which
           resumeDeposit() picks up on the way back in. */
        if (started.checkoutUrl) { location.href = started.checkoutUrl; return; }
        throw new Error('Paystack did not return a checkout page. Try again.');
      } else {
        started = await window.NexNet.depositMpesa(Math.round(amount * 100), phone);
      }

      state.data.ref = started.reference;

      /* A chain transfer waits on a person, not on a callback, so there
         is nothing to poll for. Spinning for two and a half minutes and
         then saying "still pending" would be a worse way of telling
         somebody the same thing. */
      if (method === 'usdt') { gotoStep('reported'); return; }

      /* Some rails settle in the request itself rather than through a
         callback, and answer with the finished payment. Polling for
         three seconds to rediscover something we were just told is a
         waiting screen shown for no reason. */
      if (started.status === 'success') {
        state.data.credited = (started.creditedMinor || 0) / 100;
        await hydrateSession();
        gotoStep('success');
        return;
      }

      var payment = await window.NexNet.waitForDeposit(started.reference);
      if (token !== payToken) return;            /* closed while waiting */

      if (payment.status === 'success') {
        state.data.credited = (payment.creditedMinor || 0) / 100;
        await hydrateSession();
        gotoStep('success');
      } else if (payment.status === 'pending') {
        /* Still pending after the wait. That is not a failure, mobile
           money is slow and callbacks get lost, but it cannot sit on a
           spinner forever either, so it gets an honest screen with a way
           to look again. */
        state.data.fail = {
          headline: 'No confirmation yet',
          note: 'If you approved it, it will credit on its own. If no prompt came, ' +
                'nothing was taken.',
          detail: 'Waiting on the provider',
          ref: state.data.ref || null,
          recheck: true
        };
        gotoStep('failed');
      } else {
        failDeposit(payment.failureReason, method);
      }
    } catch (err) {
      if (token !== payToken) return;
      /* A validation error is about what was typed, so it belongs on the
         form. Anything else is a payment that did not happen. */
      if (err.fields) {
        gotoStep('form');
        showServerErrors(document, err);
        return;
      }
      failDeposit(serverErrorText(err), method);
    }
  }

  /* phone read by the caller, before the repaint, see liveDeposit. */
  async function liveWithdraw(amountUsd, dest) {
    var token = ++payToken;
    gotoStep('pending');
    try {
      await window.NexNet.withdraw(Object.assign({
        amountMinor: Math.round(amountUsd * 100)
      }, dest));
      if (token !== payToken) return;

      state.data.ref = reference();
      await hydrateSession();
      gotoStep('success');
    } catch (err) {
      if (token !== payToken) return;
      if (err.fields) {
        gotoStep('form');
        showServerErrors(document, err);
        return;
      }
      state.data.fail = {
        headline: 'Payout not sent',
        note: 'This is on us, not you. Your balance is unchanged. Try again shortly.',
        detail: serverErrorText(err)
      };
      gotoStep('failed');
    }
  }

  /* actions that touch money or verification */
  function runAction(name, node) {
    if (name === 'deposit') {
      clearErrors();
      var box = document.getElementById('amount');
      /* Typed in dollars, like everything else on screen. */
      var usd = +((box || {}).value) || 0;
      var pay = API.geo.country();

      var floor = API.money.minDepositUsd();
      if (usd <= 0) return fieldError('amount', 'Enter an amount to deposit');
      if (usd < floor) return fieldError('amount',
        'Minimum deposit is ' + F.count(floor) + ' USD');

      /* Neither M-Pesa nor the card processor charges dollars here, so
         the rail is asked for the shilling equivalent while the customer
         is quoted and credited in dollars. The conversion lives here and
         at the server's own rate on the way back, and nowhere between. */
      var toRail = state.data.method !== 'usdt' && pay.rate && pay.rate !== 1;
      var rate = toRail ? pay.rate : 1;
      var money = toRail ? pay.cur : 'USD';
      var amount = Math.round(usd * rate * 100) / 100;

      if (state.data.method === 'mpesa') {
        /* The country on the field, not the one the IP lookup guessed. */
        var dcc = ((document.getElementById('mpesaPhoneCountry') || {}).value) || API.geo.code();
        var dc = API.geo.countries[dcc] || pay;
        var ph = document.getElementById('mpesaPhone');
        var digits = ph ? ph.value.replace(/\D/g, '') : '';
        if (digits.length < dc.len) return fieldError('mpesaPhone', 'Enter your ' + dc.len + '-digit number');
        state.data.payTo = dc.dial + digits;
      }

      if (state.data.method === 'usdt') {
        /* The hash is the only thing tying a transfer on a public chain
           to this account, so it is checked here rather than being
           discovered as missing by the person trying to credit it. */
        var hash = ((document.getElementById('txHash') || {}).value || '').trim();
        if (!hash) return fieldError('txHash', 'Paste the transaction hash from your wallet');
        if (!/^[A-Fa-f0-9]{64}$/.test(hash)) {
          return fieldError('txHash', 'A TRC-20 hash is 64 letters and numbers');
        }
        state.data.txHash = hash;
      }

      state.data.payLabel = F.count(amount) + ' ' + money;
      state.data.credited = Math.round(usd * 100) / 100;

      if (window.NexNet && window.NexNet.live) return liveDeposit(amount, money, state.data.payTo || '');

      state.data.ref = reference();
      settle(function () {
        API.account.credit(state.data.credited, 'Deposit');
      });
      return;
    }
    if (name === 'withdraw') {
      /* Ask the server before refusing. An approval made five minutes
         ago must not stay invisible until the next page load: somebody
         who was told to verify, verified, and came straight back would
         be told to verify again, which is the moment they stop
         believing the queue moves at all. */
      if (!API.kyc.verified()) {
        if (window.NexNet && window.NexNet.live && window.NexNet.signedIn()) {
          if (node) { node.disabled = true; node.innerHTML = loader('sm') + 'Checking'; }
          hydrateSession().then(function () {
            if (node) { node.disabled = false; node.textContent = 'Request withdrawal'; }
            if (API.kyc.verified()) runAction('withdraw', node);
            else gotoStep('kyc');
          });
          return;
        }
        gotoStep('kyc');
        return;
      }
      clearErrors();
      /* Typed in the viewer's money; every check below is in USD, so
         it converts once here and not again anywhere after. */
      var wShown = +((document.getElementById('wAmount') || {}).value) || 0;
      var w = API.money.fromDisplay(wShown);
      if (w <= 0) return fieldError('wAmount', 'Enter an amount to withdraw');
      /* Compared in USD, quoted in their money, so the message names the
         same round figure the field's hint does. */
      if (w < API.money.minWithdrawUsd() - 0.0001) {
        return fieldError('wAmount', 'Minimum withdrawal is ' +
          F.localMoney(API.money.minWithdrawDisplay()));
      }
      if (w > API.account.balance()) return fieldError('wAmount',
        'Not enough funds. Available ' + F.money(API.account.balance()));
      state.data.sent = w;

      /* Each rail needs a different thing, and each is checked here so a
         mistyped address is caught before the balance is held rather
         than after. */
      var method = state.data.method || 'mpesa';
      var dest = { method: method };

      if (method === 'usdt') {
        var addr = ((document.getElementById('wAddress') || {}).value || '').trim();
        if (addr.length < 20) return fieldError('wAddress', 'Enter the full wallet address');
        dest.address = addr;
        dest.network = (document.getElementById('wNetwork') || {}).value || undefined;
      } else if (method === 'card') {
        var bank = ((document.getElementById('wBank') || {}).value || '').trim();
        var holder = ((document.getElementById('wCardName') || {}).value || '').trim();
        var account = ((document.getElementById('wAccount') || {}).value || '').replace(/[^0-9]/g, '');
        if (bank.length < 2) return fieldError('wBank', 'Enter the name of the bank');
        if (holder.length < 2) return fieldError('wCardName', 'Enter the name on the account');
        if (account.length < 6) return fieldError('wAccount', 'Enter the full account number');
        dest.card = { bank: bank, name: holder, account: account };
      } else {
        var wcc = ((document.getElementById('wPhoneCountry') || {}).value) || API.geo.code();
        var wdigits = (((document.getElementById('wPhone') || {}).value) || '').replace(/\D/g, '');
        var wc = API.geo.countries[wcc];
        var world = window.NexCountries && window.NexCountries.get(wcc);
        var wdial = wc ? wc.dial : (world && world.dial);

        if (wc) {
          /* A country we take deposits from: we know the length. */
          if (wdigits.length < wc.len) {
            return fieldError('wPhone', 'Enter your ' + wc.len + '-digit number');
          }
        } else if (wdigits.length < 6 || wdigits.length > 14) {
          /* Everywhere else we do not, so this is the only check worth
             making: long enough to be a phone number, short enough to
             fit one. The person paying it out reads the rest. */
          return fieldError('wPhone', 'Enter the number without the country code');
        }

        /* Sent in full, with the code the customer picked, so the server
           is not left guessing the country from a profile that may say
           something else. */
        dest.phone = wdial ? ('+' + wdial + wdigits) : (wdigits || undefined);
        dest.country = wcc;
      }

      if (window.NexNet && window.NexNet.live) return liveWithdraw(w, dest);

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

      if (window.NexNet && window.NexNet.live) {
        var btn = node;
        if (btn) { btn.disabled = true; btn.innerHTML = loader('sm') + 'Saving'; }
        window.NexNet.changePassword(cur, nw).then(function () {
          gotoStep('done');
        }).catch(function (err) {
          if (btn) { btn.disabled = false; btn.textContent = 'Update password'; }
          if (err.fields && err.fields.currentPassword) {
            fieldError('currentPassword', err.fields.currentPassword);
          } else {
            window.NexToast(err.message);
          }
        });
        return;
      }

      gotoStep('done');
      return;
    }
    if (name === 'saveProfile') {
      clearErrors();
      var first = ((document.getElementById('firstName') || {}).value || '').trim();
      var last = ((document.getElementById('lastName') || {}).value || '').trim();
      var shown = ((document.getElementById('displayName') || {}).value || '').trim();

      if (!first) return fieldError('firstName', 'Enter your first name');
      if (!last) return fieldError('lastName', 'Enter your last name');
      if (/\d/.test(first + last)) return fieldError('firstName', 'Names cannot contain numbers');
      if (!shown) return fieldError('displayName', 'Pick a name to show other traders');

      state.data.savedName = shown;
      gotoStep('done');
      return;
    }
    if (name === 'sendTicket') {
      if (node && node.disabled) return;
      var catHost = document.getElementById('tCatSel');
      var textEl = document.getElementById('tBody');
      var text = ((textEl || {}).value || '').trim();

      if (text.length < 10) {
        window.NexToast('Tell us a little more, so we can find it.');
        if (textEl) textEl.focus();
        return;
      }
      if (!(window.NexNet && window.NexNet.live && window.NexNet.signedIn())) {
        window.NexToast('Sign in first, so the reply reaches you.');
        return;
      }

      var category = (catHost && catHost.__sel) ? catHost.__sel.value() : 'other';
      if (node) { node.disabled = true; node.innerHTML = loader('sm') + 'Sending'; }

      window.NexNet.openTicket(category, text).then(function () {
        gotoStep('done');
        if (window.NexTickets) window.NexTickets();
      }).catch(function (err) {
        if (node) { node.disabled = false; node.textContent = 'Send to support'; }
        window.NexToast(err.message);
      });
      return;
    }
    if (name === 'verify') {
      if (node && node.disabled) return;

      /* No backend: the old local behaviour, which is a simulation and
         is the only place it is still honest. */
      if (!(window.NexNet && window.NexNet.live && window.NexNet.signedIn())) {
        API.kyc.simulateApproval();
        gotoStep('done');
        return;
      }

      var docs = API.kyc.docs();
      var file = docs['Proof of address'];
      if (!file) {
        window.NexToast('Choose the document first.');
        return;
      }

      var session = API.session.get() || {};
      if (!session.id) {
        window.NexToast('Sign in again to send this.');
        return;
      }

      if (node) { node.disabled = true; node.innerHTML = loader('sm') + 'Sending'; }

      window.NexNet.submitProofOfAddress(file, session.id).then(function () {
        /* Pending, not verified. The server decides, and the difference
           is the whole reason this route exists. */
        API.kyc.markPending();
        API.kyc.clearDoc('Proof of address');
        gotoStep('done');
      }).catch(function (err) {
        if (node) { node.disabled = false; node.textContent = 'Submit for review'; }
        window.NexToast(err.message);
      });
      return;
    }
    if (name === 'recheckDeposit') {
      var ref = state.data.ref;
      if (!ref || !(window.NexNet && window.NexNet.live)) return closeModals();
      if (node) { node.disabled = true; node.innerHTML = loader('sm') + 'Checking'; }

      window.NexNet.deposit(ref).then(async function (out) {
        var p = out.payment || {};
        if (p.status === 'success') {
          state.data.credited = (p.creditedMinor || 0) / 100;
          await hydrateSession();
          gotoStep('success');
        } else if (p.status === 'pending') {
          if (node) { node.disabled = false; node.textContent = 'Check again'; }
          window.NexToast('Still pending. It will credit on its own once it clears.');
        } else {
          failDeposit(p.failureReason, state.data.method);
        }
      }).catch(function (err) {
        if (node) { node.disabled = false; node.textContent = 'Check again'; }
        window.NexToast(serverErrorText(err));
      });
      return;
    }
    if (name === 'useAccount') {
      var kind = node.getAttribute('data-kind');
      /* use() refuses 'real' when there is no account behind it. That is
         not an error to report, it is the moment to offer the thing
         they were reaching for. */
      if (!API.account.use(kind)) {
        leaveTo('signup');
        return;
      }
      gotoStep('done');
      return;
    }
    if (name === 'saveAuto') {
      clearErrors();
      var runs = +document.getElementById('autoRuns').value || 0;
      var mult = +document.getElementById('autoMult').value || 0;
      var tp = +document.getElementById('autoTP').value || 0;
      var sl = +document.getElementById('autoSL').value || 0;

      if (runs < 1 || runs > 500) return fieldError('autoRuns', 'Between 1 and 500 runs');
      if (mult < 1 || mult > 5) return fieldError('autoMult', 'Between 1 and 5');
      if (tp <= 0) return fieldError('autoTP', 'Set a take-profit above zero');
      if (sl <= 0) return fieldError('autoSL', 'Set a stop-loss above zero');

      API.prefs.setAuto({ runs: runs, multiplier: mult, takeProfit: tp, stopLoss: sl });
      gotoStep('done');
      return;
    }
  }

  /* ---------- live chrome updates ---------- */
  function bindChrome() {
    API.on('settled', function (c) {
      if (!(window.NexNet && window.NexNet.live && window.NexNet.signedIn())) return;
      window.NexNet.recordTrades([tradePayload(c)]).then(function (out) {
        /* A settled contract on the real account moves the balance on
           the server now, and the server is the one that counts. Adopt
           what it says rather than trusting the figure this browser just
           worked out for itself: if the two disagree, this is the moment
           somebody finds out, not the withdrawal screen. */
        if (out && out.balanceMinor != null && API.account.kind() === 'real') {
          API.account.setReal(out.balanceMinor / 100);
        }
      }).catch(function () {});
    });

    API.on('balance', function () {
      var b = document.getElementById('acctBtn');
      if (!b) return;
      b.innerHTML = balanceMarkup();
      /* The colour is the account, so it has to move when the account
         does, not only when the bar is first drawn. */
      var kind = API.account.kind();
      b.classList.toggle('real', kind === 'real');
      b.classList.toggle('demo', kind !== 'real');
    });
    API.on('connection', connectionBanner);
    API.on('geo', paintCountry);
    connectionBanner();
  }

  /* Everything a customer typed goes through here before it is put back
     on the page: their own words, and the reply, both of which arrive as
     text and must not arrive as markup. */
  function escapeHtml(t) {
    return String(t == null ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ---------- support tickets ----------
     What was here before was a chat window that answered itself: the
     message went into a div, "Lucy" replied nine hundred milliseconds
     later, and nothing ever left the browser. Somebody who had lost a
     deposit typed the whole story into a box that threw it away.

     A ticket is smaller and real. One question, one answer, a status
     they can see, and it lands in a queue a person works through. The
     page is the record of what has been asked; the asking is a dialog,
     which opens on arrival because it is what somebody came here for. */
  var TICKET_CATS = [
    { value: 'deposit', label: 'A deposit', note: 'Money you sent that has not arrived' },
    { value: 'withdrawal', label: 'A withdrawal', note: 'A payout you are waiting on' },
    { value: 'account', label: 'My account', note: 'Sign in, details or verification' },
    { value: 'trading', label: 'Trading and contracts', note: 'A trade that did not settle as expected' },
    { value: 'other', label: 'Something else', note: '' }
  ];

  function initChat() {
    var listHost = document.getElementById('ticketList');
    if (!listHost) return;

    var LABEL = {};
    TICKET_CATS.forEach(function (c) { LABEL[c.value] = c.label; });
    var MIN = 10;

    function live() {
      return !!(window.NexNet && window.NexNet.live && window.NexNet.signedIn());
    }

    function card(t) {
      var when = F.dateTime(t.at);
      return '<div class="ticket">' +
        '<div class="ticket-top">' +
          '<b>' + (LABEL[t.category] || t.category) + '</b>' +
          '<span class="badge ' + (t.status === 'open' ? 'warn' : 'ok') + '">' +
            (t.status === 'open' ? 'Waiting' : t.status === 'closed' ? 'Closed' : 'Answered') +
          '</span>' +
        '</div>' +
        '<p class="ticket-said">' + escapeHtml(t.body) + '</p>' +
        (t.reply
          ? '<div class="ticket-reply"><b>Novi support</b><p>' + escapeHtml(t.reply) + '</p></div>'
          : '<div class="ticket-wait">We usually come back within 30 minutes.</div>') +
        '<div class="ticket-when">' + when + '</div>' +
      '</div>';
    }

    async function refresh() {
      if (!live()) {
        listHost.innerHTML = '<div class="empty" style="padding:30px 16px">' +
          icon('headset', 24) + '<b>Sign in to send this</b>' +
          '<span>A ticket has to be attached to an account, so we know ' +
          'whose deposit or payout we are looking at.</span></div>';
        return;
      }
      try {
        var tickets = await window.NexNet.tickets();
        listHost.innerHTML = tickets.length
          ? tickets.map(card).join('')
          : '<div class="empty" style="padding:30px 16px">' +
              icon('headset', 24) + '<b>Nothing open</b>' +
              '<span>Anything you send appears here with its answer.</span></div>';
      } catch (err) {
        listHost.innerHTML = '<div class="empty" style="padding:30px 16px">' +
          icon('alert', 24) + '<b>Could not load your tickets</b>' +
          '<span>' + escapeHtml(err.message) + '</span></div>';
      }
    }
    window.NexTickets = refresh;

    var newBtn = document.getElementById('tNew');
    if (newBtn) newBtn.addEventListener('click', function () { openModal('ticket'); });

    refresh();

    /* Opened on arrival, once: this page has one purpose and making
       somebody press a button to reach it is a step for its own sake.
       Not when they have come back to read an answer, though. */
    if (!sessionStorage.getItem('nexas.ticketAsked')) {
      try { sessionStorage.setItem('nexas.ticketAsked', '1'); } catch (e) {}
      setTimeout(function () { openModal('ticket'); }, 260);
    }
  }

  /* The dialog's own wiring: the category dropdown and the counter under
     the box, both of which only exist once the step is on screen. */
  function mountTicketForm() {
    var host = document.getElementById('tCatSel');
    var body = document.getElementById('tBody');
    var count = document.getElementById('tCount');
    if (!host || !body || host.__sel) return;

    host.__sel = NexSelect(host, { options: TICKET_CATS, value: 'deposit' });

    function countdown() {
      var n = (body.value || '').trim().length;
      count.textContent = n < 10
        ? (10 - n) + ' more character' + (10 - n === 1 ? '' : 's')
        : n + ' of 2,000';
    }
    body.addEventListener('input', countdown);
    countdown();
  }

  /* ---------- markets ---------- */
  /* Markets is the instrument picker, not a data screen. Prices belong on
     the chart, where they mean something next to a contract; a wall of
     numbers here is something to read rather than something to use, and
     the only decision this page exists to support is "trade that one
     instead". So: grouped names, the current one marked, no card around
     them, the rows sit on the page.

     Choosing writes the preference and goes to the terminal, which reads
     it on mount. */
  function initMarkets() {
    var listHost = document.getElementById('marketList');
    if (!listHost) return;

    function render() {
      var current = API.prefs.symbol();
      var groups = [];
      var byGroup = {};
      API.symbols.forEach(function (sym) {
        if (!byGroup[sym.group]) { byGroup[sym.group] = []; groups.push(sym.group); }
        byGroup[sym.group].push(sym);
      });

      listHost.innerHTML = groups.map(function (g) {
        return '<div class="mkt-group">' +
          '<div class="mkt-group-label">' + g + '</div>' +
          byGroup[g].map(function (sym) {
            var on = sym.id === current;
            /* The same mark the terminal's picker uses, so a pair is
               recognised in both places by the same pair of flags. */
            return '<button class="mkt-pick' + (on ? ' on' : '') + '" data-symbol="' + sym.id + '">' +
              mark(sym) +
              '<span class="n">' + (sym.short || sym.name) +
                (sym.short ? '<i>' + sym.name + '</i>' : '') + '</span>' +
              (on ? '<span class="mkt-on">Trading</span>' : '') +
            '</button>';
          }).join('') +
        '</div>';
      }).join('');
    }

    listHost.addEventListener('click', function (e) {
      var pick = e.target.closest('[data-symbol]');
      if (!pick) return;
      var id = pick.getAttribute('data-symbol');
      if (!API.prefs.setSymbol(id)) return;
      render();
      go('/');
    });

    API.ready(function () {
      document.body.classList.remove('loading');
      render();
      /* Nothing on this page ticks any more, so nothing has to be
         repainted on a timer. */
      clearInterval(window.__nexMkt);
    });
  }

  /* ---------- returning from Paystack ----------
     The card flow opens Paystack in its own tab and the original tab
     polls, but that tab can be gone, closed, reloaded, or the payment
     finished on a phone. Paystack sends the customer back to
     ?deposit=<reference>, so treat that as a second, independent way of
     finding out what happened. The server is still the one that decides:
     this only asks.

     The parameter is stripped either way, so a reload or a shared link
     cannot replay it. */
  async function resumeDeposit() {
    var ref;
    try { ref = new URLSearchParams(location.search).get('deposit'); } catch (e) { return; }
    if (!ref) return;

    try {
      var url = new URL(location.href);
      url.searchParams.delete('deposit');
      history.replaceState(history.state, '', url.pathname + url.search + url.hash);
    } catch (e) {}

    if (!(window.NexNet && window.NexNet.live && window.NexNet.signedIn())) return;

    try {
      var payment = await window.NexNet.waitForDeposit(ref);
      if (payment.status === 'success') {
        await hydrateSession();
        window.NexToast('Deposit credited.');
      } else if (payment.status === 'pending') {
        window.NexToast('Still waiting on the payment. It will credit on its own once it clears.');
      } else {
        window.NexToast(payment.failureReason || 'That payment did not go through.');
      }
    } catch (err) {
      window.NexToast(err.message);
    }
  }

  /* ---------- trade history, kept on the server ----------
     Settlement still happens here, in the browser, so this is the
     client telling the server what it decided rather than the other way
     round. It is worth doing anyway: without it a person's history dies
     with this browser's localStorage, and they have no record of what
     they did on a phone they no longer use.

     Sent as a batch on load and one at a time after that. Re-sending is
     safe, the server keys on the contract id and ignores duplicates, so nothing has to be tracked as "already sent". */
  function tradePayload(c) {
    return {
      clientRef: String(c.id),
      accountKind: c.account === 'real' ? 'real' : 'demo',
      demoMode: !!c.demoMode,
      symbol: c.symbol,
      symbolName: c.symbolName || undefined,
      contractType: c.type,
      side: c.side || undefined,
      barrier: c.barrier == null ? null : c.barrier,
      stakeMinor: Math.round((+c.stake || 0) * 100),
      /* What was actually paid, not what the contract could have paid.
         c.payout keeps the potential figure after a loss, and sending
         that would have the server crediting a payout on a losing
         contract — which it refuses, taking the whole record with it. */
      payoutMinor: c.status === 'won' ? Math.round((+c.payout || 0) * 100) : 0,
      profitMinor: Math.round((+c.profit || 0) * 100),
      currency: 'USD',
      status: c.status === 'won' ? 'won' : 'lost',
      ticks: c.ticks || undefined,
      entrySpot: c.entrySpot == null ? undefined : c.entrySpot,
      exitSpot: c.exitSpot == null ? undefined : c.exitSpot,
      openedAt: new Date(c.entryTime).toISOString(),
      settledAt: new Date(c.exitTime || c.entryTime).toISOString()
    };
  }

  function syncHistory() {
    if (!(window.NexNet && window.NexNet.live && window.NexNet.signedIn())) return;
    var settled = API.contracts.closed().filter(function (c) {
      return c.status === 'won' || c.status === 'lost';
    });
    if (!settled.length) return;
    /* Quietly. A failure here costs a record, not a trade. The backlog
       carries money now, though: anything settled while this browser was
       offline is applied to the balance when it goes up, so the figure
       that comes back is the one to believe. */
    window.NexNet.recordTrades(settled.slice(0, 200).map(tradePayload))
      .then(function (out) {
        if (out && out.balanceMinor != null && API.account.kind() === 'real') {
          API.account.setReal(out.balanceMinor / 100);
        }
      })
      .catch(function () {});
  }

  /* ---------- the presentation marker ----------
     While the mode is on, the terminal says so, in the top bar, where it
     is in shot for anything recorded off this screen. A staged win that
     is labelled is a demonstration; the same win unlabelled is a claim
     about how the product performs, and this is the line between the
     two. It is not dismissible for that reason. */
  function paintDemoBadge() {
    var on = API.account.demoMode && API.account.demoMode();
    var el = document.getElementById('demoBadge');

    if (!on) { if (el) el.remove(); return; }
    if (el) return;

    var bar = document.querySelector('.topbar');
    if (!bar) return;

    el = document.createElement('span');
    el.id = 'demoBadge';
    el.className = 'demo-badge';
    el.setAttribute('role', 'status');
    el.textContent = 'VIP DEMO';
    bar.appendChild(el);
  }

  /* ---------- coming back from Google ----------
     The redirect lands on the sign-in page with a session in the URL.
     Without this the page renders exactly as it did before anyone signed
     in, which is what somebody who has just signed in reads as "it did
     not work" — and they are not wrong, because it had not.

     Runs before the guard, so the terminal does not bounce a person who
     is, as of this moment, signed in. */
  async function resumeOAuth() {
    if (!(window.NexNet && window.NexNet.live)) { unveil(); return false; }

    /* Up before anything is awaited: the form is already hidden by the
       head script, and this is what replaces it. */
    var veil = splash('Signing you in', null);
    var startedAt = Date.now();

    function fail(message) {
      veil.remove();
      unveil();
      window.NexToast(message);
      return false;
    }

    var out = await window.NexNet.adoptFromUrl();
    if (!out) { veil.remove(); unveil(); return false; }
    if (!out.ok) return fail(out.message || 'That sign-in did not complete.');

    try {
      await hydrateSession();
    } catch (e) {
      return fail('Signed in, but your account could not be loaded. Try again.');
    }

    /* A floor on how briefly this can show. Without it a fast round trip
       strobes: rings appear and are gone before they have drawn, which
       reads as a glitch rather than as a welcome. */
    var held = Date.now() - startedAt;
    if (held < 1100) await new Promise(function (r) { setTimeout(r, 1100 - held); });

    go('/');
    return true;
  }

  /* Let the page show again. Used on every path that ends with the
     customer still on this page, so a failure never leaves them looking
     at a hidden form. */
  function unveil() {
    document.documentElement.removeAttribute('data-oauth');
  }

  /* ---------- boot ---------- */
  function boot() {
    API = window.NexAPI; F = window.NexFmt;

    /* Before the guard and before anything is painted. On the sign-in
       page a returning session has to be adopted, and on any other page
       this is a no-op that costs one URL parse. */
    if (/[?#].*(access_token|[?&]code=|error_code|error_description|[?&#]error=)/.test(location.href)) {
      resumeOAuth();
      return;
    }

    /* Before anything is painted: a stored 'real' with no account behind
       it collapses to demo, so no screen ever renders the word. */
    API.account.enforce();
    /* Wake the API early. An instance that has gone to sleep takes a few
       seconds to come back, and the request that wakes it is the one that
       fails, better that is this one than somebody's deposit. */
    if (window.NexNet && window.NexNet.live) {
      window.NexNet.warm();
      /* The deposit wallet and the server's limits, fetched once on
         boot so the deposit sheet has them the moment it opens. */
      window.NexNet.loadSettings();
    }
    clearInterval(window.__nexMkt);
    if (!guard()) return;
    document.body.classList.add('loading');
    bootVeil();
    API.ready(dropVeil);
    /* Re-read the account from the server on every load, so a balance
       changed elsewhere, a deposit that cleared, a payout approved, is reflected rather than trusting what this browser last saw. */
    if (window.NexNet && window.NexNet.live && window.NexNet.signedIn()) {
      hydrateSession();
      /* Then chase anything that was paid while this browser was not
         looking. A deposit that cleared after the tab closed has no
         other way of reaching the balance on screen. */
      syncHistory();
      window.NexNet.settlePending().then(function (n) {
        if (!n) return;
        hydrateSession();
        window.NexToast(n === 1
          ? 'A deposit cleared and has been added to your balance.'
          : n + ' deposits cleared and have been added to your balance.');
      });
    }
    mountChrome(document.querySelector('.app') || document.body);
    paintDemoBadge();
    if (!window.__nexWired) { wire(); window.__nexWired = true; }
    bindChrome();
    consentBar();
    initChat();
    initMarkets();
    if (window.NexTrade) window.NexTrade.init();
    if (window.NexPositions) window.NexPositions.init();
    if (window.NexAI) window.NexAI.init();
    resumeDeposit();
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
