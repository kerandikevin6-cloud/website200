/* ============================================================
   Nexas, formatting
   One place for money, numbers, percentages and time so locale
   and currency changes never have to be chased through views.
   ============================================================ */
(function () {
  "use strict";

  var locale = (navigator.languages && navigator.languages[0]) || navigator.language || 'en-US';

  /* ---------- display currency ----------
     Balances, stakes and contracts are held in USD everywhere inside the
     app: one unit, so the arithmetic has no seams in it. What a person
     reads is their own money, and that conversion happens here and only
     here, a rate applied twice is a bug you find in a support ticket.

     rate is display units per 1 USD, so 1 means "already USD" and the
     conversion is a no-op for anyone outside the countries we quote. */
  var currency = 'USD';
  var rate = 1;

  function local(v) { return (+v || 0) * rate; }

  function nf(min, max) {
    return new Intl.NumberFormat(locale, { minimumFractionDigits: min, maximumFractionDigits: max });
  }
  var n2 = nf(2, 2), n0 = nf(0, 0);

  var F = {
    setLocale: function (l) { locale = l; n2 = nf(2, 2); n0 = nf(0, 0); },
    setCurrency: function (c) { currency = c; },

    /* Set both at once: the currency shown and the rate to get there.
       Called when the country is known, and again if it changes. */
    setDisplay: function (cur, r) {
      currency = cur || 'USD';
      rate = (+r > 0) ? +r : 1;
    },
    currency: function () { return currency; },
    rate: function () { return rate; },

    /* USD in, display units out, and back. Every amount crossing
       between the two goes through these, so there is one place to look
       when a figure is wrong by exactly the exchange rate. */
    toDisplay: local,
    fromDisplay: function (v) { return (+v || 0) / rate; },

    /* All four take USD and render the viewer's currency. */

    /* 2,480.00 */
    amount: function (v) { return n2.format(local(v)); },

    /* 1,250.00 USD. Takes USD and leaves it there: for the few figures
       that are quoted in dollars whatever the viewer's currency is, the
       stake among them. */
    usd: function (v) { return n2.format(+v || 0) + ' USD'; },
    usdAmount: function (v) { return n2.format(+v || 0); },

    /* 2,480.00 KES, currency after the figure, the way traders read it */
    money: function (v, cur) { return n2.format(local(v)) + ' ' + (cur || currency); },

    /* +12.40 / −3.05, always signed */
    signed: function (v) {
      var x = local(v);
      return (x > 0 ? '+' : x < 0 ? '−' : '') + n2.format(Math.abs(x));
    },
    signedMoney: function (v, cur) { return F.signed(v) + ' ' + (cur || currency); },

    /* Signed, in dollars, for the figures that sit beside a stake. */
    signedUsd: function (v) {
      var x = +v || 0;
      return (x > 0 ? '+' : x < 0 ? '−' : '') + n2.format(Math.abs(x)) + ' USD';
    },

    /* Already in display units, formatted, never converted. Deposit and
       withdrawal sheets work in local money from the start. */
    localAmount: function (v) { return n2.format(+v || 0); },
    localMoney: function (v, cur) { return n2.format(+v || 0) + ' ' + (cur || currency); },

    /* 0.42% */
    pct: function (v, digits) {
      return (+v || 0).toFixed(digits == null ? 2 : digits) + '%';
    },
    signedPct: function (v) {
      var x = +v || 0;
      return (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x).toFixed(2) + '%';
    },

    /* price with the instrument's own precision */
    price: function (v, digits) { return (+v || 0).toFixed(digits == null ? 2 : digits); },

    count: function (v) { return n0.format(+v || 0); },

    /* 21:35:16 in the viewer's timezone */
    time: function (ts) {
      return new Date(ts).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    },
    clock: function (ts) {
      return new Date(ts).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
    },
    date: function (ts) {
      return new Date(ts).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
    },
    dateTime: function (ts) { return F.date(ts) + ' · ' + F.time(ts); },

    /* "just now", "4m ago", "2h ago" */
    ago: function (ts) {
      var s = Math.max(0, (Date.now() - ts) / 1000);
      if (s < 45) return 'just now';
      if (s < 3600) return Math.round(s / 60) + 'm ago';
      if (s < 86400) return Math.round(s / 3600) + 'h ago';
      return Math.round(s / 86400) + 'd ago';
    },

    /* 5 ticks · 1m 20s */
    ticks: function (n) { return n + (n === 1 ? ' tick' : ' ticks'); },
    duration: function (sec) {
      sec = Math.max(0, Math.round(sec));
      var m = Math.floor(sec / 60), s = sec % 60;
      return m ? m + 'm ' + s + 's' : s + 's';
    },

    /* timezone label for the session footer */
    zone: function () {
      try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { return 'UTC'; }
    }
  };

  window.NexFmt = F;
})();
