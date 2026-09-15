/* ============================================================
   Nexas — mock API
   Everything the UI knows about prices, money and contracts comes
   through this module. It is deliberately shaped like the real
   thing (subscribe to a feed, buy, sell, list) so swapping in a
   WebSocket and REST calls means rewriting this file only.

     NexAPI.ready(fn)                  once, after boot
     NexAPI.on('tick'|'balance'|'contracts'|'connection'|'session', fn)
     NexAPI.feed.subscribe(sym, fn)    -> unsubscribe()
     NexAPI.contracts.buy(spec)        -> {ok, contract} | {ok:false, error}
   ============================================================ */
(function () {
  "use strict";

  var KEY = 'nexas.v1';

  /* ---------- instruments ---------- */
  var SYMBOLS = [
    { id: 'R_10',  name: 'Volatility 10 (1s) Index',  group: 'Volatility', start: 9601.01,  vol: 0.9,  digits: 2, rate: 1000 },
    { id: 'R_25',  name: 'Volatility 25 Index',       group: 'Volatility', start: 2748.36,  vol: 1.4,  digits: 2, rate: 2000 },
    { id: 'R_50',  name: 'Volatility 50 Index',       group: 'Volatility', start: 1204.77,  vol: 1.1,  digits: 2, rate: 2000 },
    { id: 'R_75',  name: 'Volatility 75 (1s) Index',  group: 'Volatility', start: 43219.04, vol: 6.5,  digits: 2, rate: 1000 },
    { id: 'R_100', name: 'Volatility 100 Index',      group: 'Volatility', start: 7788.92,  vol: 3.2,  digits: 2, rate: 2000 },
    { id: 'BOOM',  name: 'Boom 500 Index',            group: 'Boom & Crash', start: 6114.50, vol: 2.0, digits: 2, rate: 1000 },
    { id: 'CRASH', name: 'Crash 1000 Index',          group: 'Boom & Crash', start: 3902.18, vol: 1.7, digits: 2, rate: 1000 },
    { id: 'STEP',  name: 'Step Index',                group: 'Step',       start: 9143.60,  vol: 0.5,  digits: 2, rate: 2000 }
  ];
  var BY_ID = {};
  SYMBOLS.forEach(function (s) { BY_ID[s.id] = s; });

  var PAYOUT = {            /* payout multiple by contract type */
    even_odd: 1.953,
    matches: 10.35,
    differs: 1.084,
    over: 1.72,
    under: 1.72
  };
  var LIMITS = { min: 1, max: 5000, maxTicks: 10, minTicks: 1 };

  /* ---------- countries we take mobile money from ----------
     flag is the emoji pair, so there is no image to ship. sample is the
     local format shown as the placeholder, minus the dialling code. */
  /* `rate` is local units per 1 USD. In a live build these come from the
     payments provider on each quote; here they are fixed so the maths in
     the deposit sheet is inspectable. `quick` are the chip amounts, in
     local money, rounded to figures people actually send. */
  var COUNTRIES = {
    KE: { name: 'Kenya',        dial: '254', sample: '712 345 678',  len: 9,
          cur: 'KES', rate: 129,   quick: [500, 1000, 2500, 5000, 10000] },
    UG: { name: 'Uganda',       dial: '256', sample: '712 345 678',  len: 9,
          cur: 'UGX', rate: 3720,  quick: [20000, 50000, 100000, 200000, 500000] },
    TZ: { name: 'Tanzania',     dial: '255', sample: '712 345 678',  len: 9,
          cur: 'TZS', rate: 2640,  quick: [10000, 25000, 50000, 100000, 250000] },
    RW: { name: 'Rwanda',       dial: '250', sample: '788 123 456',  len: 9,
          cur: 'RWF', rate: 1330,  quick: [5000, 10000, 25000, 50000, 100000] },
    NG: { name: 'Nigeria',      dial: '234', sample: '802 123 4567', len: 10,
          cur: 'NGN', rate: 1550,  quick: [5000, 10000, 25000, 50000, 100000] },
    GH: { name: 'Ghana',        dial: '233', sample: '24 123 4567',  len: 9,
          cur: 'GHS', rate: 15.2,  quick: [50, 100, 250, 500, 1000] },
    ZA: { name: 'South Africa', dial: '27',  sample: '71 123 4567',  len: 9,
          cur: 'ZAR', rate: 18.3,  quick: [100, 250, 500, 1000, 2500] }
  };
  var DEFAULT_COUNTRY = 'KE';

  /* Timezone is a decent offline guess and costs no request, so it seeds
     the value before the IP lookup comes back (and stands in for it if the
     lookup is blocked or offline). */
  var TZ_COUNTRY = {
    'Africa/Nairobi': 'KE', 'Africa/Kampala': 'UG', 'Africa/Dar_es_Salaam': 'TZ',
    'Africa/Kigali': 'RW', 'Africa/Lagos': 'NG', 'Africa/Accra': 'GH',
    'Africa/Johannesburg': 'ZA'
  };
  function guessCountry() {
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (TZ_COUNTRY[tz]) return TZ_COUNTRY[tz];
    } catch (e) {}
    return DEFAULT_COUNTRY;
  }
  function countryCode() {
    return (S.geo && COUNTRIES[S.geo]) ? S.geo : guessCountry();
  }
  /* One lookup per session at most; the answer is remembered so the field
     is already right the next time the modal opens. */
  var geoAsked = false;
  function detectCountry() {
    if (geoAsked || S.geo) return;
    geoAsked = true;
    if (!window.fetch || !window.AbortController) return;
    var ac = new AbortController();
    var t = setTimeout(function () { ac.abort(); }, 2500);
    fetch('https://ipapi.co/json/', { signal: ac.signal })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        clearTimeout(t);
        var cc = j && j.country_code;
        if (!cc || !COUNTRIES[cc]) return;
        S.geo = cc;
        persist();
        B.emit('geo', cc);
      })
      .catch(function () { clearTimeout(t); });
  }

  /* ---------- tiny event bus ---------- */
  function bus() {
    var map = {};
    return {
      on: function (k, fn) {
        (map[k] = map[k] || []).push(fn);
        return function () { map[k] = map[k].filter(function (f) { return f !== fn; }); };
      },
      emit: function (k, d) { (map[k] || []).slice().forEach(function (f) { try { f(d); } catch (e) {} }); }
    };
  }
  var B = bus();

  /* ---------- persisted state ---------- */
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  var saved = load();
  var S = {
    geo: saved.geo || null,
    referrals: saved.referrals || null,
    session: saved.session || null,
    account: saved.account || 'real',
    balances: saved.balances || { real: 2480, demo: 10000 },
    currency: 'USD',
    verified: !!saved.verified,
    consent: !!saved.consent,
    riskAck: !!saved.riskAck,
    contracts: saved.contracts || [],
    transactions: saved.transactions || [],
    auto: saved.auto || { runs: 10, multiplier: 2, takeProfit: 200, stopLoss: 100 }
  };
  var saveTimer;
  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try {
        localStorage.setItem(KEY, JSON.stringify({
          session: S.session, account: S.account, balances: S.balances,
          verified: S.verified, consent: S.consent, riskAck: S.riskAck,
          geo: S.geo, referrals: S.referrals,
          contracts: S.contracts.slice(-200), transactions: S.transactions.slice(-200),
          auto: S.auto
        }));
      } catch (e) {}
    }, 120);
  }

  /* ---------- price feed ---------- */
  var history = {};     /* symbol -> [{t, price}] */
  var HIST = 600;

  function seed(sym) {
    var meta = BY_ID[sym], price = meta.start, now = Date.now(), out = [];
    for (var i = HIST; i > 0; i--) {
      price += (Math.random() - 0.5) * meta.vol;
      out.push({ t: now - i * meta.rate, price: round(price, meta.digits) });
    }
    history[sym] = out;
  }
  function round(v, d) { return Math.round(v * Math.pow(10, d)) / Math.pow(10, d); }
  function lastDigit(price, digits) {
    return Math.abs(Math.round(price * Math.pow(10, digits))) % 10;
  }
  SYMBOLS.forEach(function (s) { seed(s.id); });

  /* one clock for every symbol, paused while the tab is hidden */
  var acc = {}, last = 0, raf = null, booted = false;
  function loop(ts) {
    raf = requestAnimationFrame(loop);
    if (!last) last = ts;
    var dt = Math.min(ts - last, 2000);
    last = ts;
    if (connection.status !== 'live') return;

    SYMBOLS.forEach(function (meta) {
      acc[meta.id] = (acc[meta.id] || 0) + dt;
      while (acc[meta.id] >= meta.rate) {
        acc[meta.id] -= meta.rate;
        tick(meta);
      }
    });
  }
  function tick(meta) {
    var h = history[meta.id];
    var prev = h[h.length - 1].price;
    var next = round(prev + (Math.random() - 0.5) * meta.vol, meta.digits);
    var point = { t: Date.now(), price: next, digit: lastDigit(next, meta.digits) };
    h.push(point);
    if (h.length > HIST) h.shift();
    advanceContracts(meta.id, point);
    B.emit('tick', { symbol: meta.id, point: point, prev: prev });
  }
  function start() {
    if (raf) return;
    last = 0;
    raf = requestAnimationFrame(loop);
  }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else start();
  });

  /* ---------- connection ---------- */
  var connection = { status: 'booting', since: Date.now(), latency: 42 };
  function setConnection(status) {
    if (connection.status === status) return;
    connection.status = status;
    connection.since = Date.now();
    B.emit('connection', connection);
  }
  /* occasional realistic drop, so the UI's reconnect path is exercised */
  setInterval(function () {
    if (connection.status !== 'live' || document.hidden) return;
    if (Math.random() > 0.02) return;
    setConnection('reconnecting');
    setTimeout(function () { setConnection('live'); }, 2600 + Math.random() * 2200);
  }, 20000);
  setInterval(function () {
    if (connection.status === 'live') connection.latency = Math.round(28 + Math.random() * 60);
  }, 4000);

  /* ---------- referrals ----------
     Referrals do not pay cash. Each one that funds an account lifts the
     payout on every winning contract the referrer places, by the tier
     below. The top tier stays under the house margin on every contract
     (the thinnest is even/odd at 2.35%), so a boost makes trading
     cheaper and never turns a negative expectation positive. */
  var BOOST_TIERS = [
    { funded: 0,  boost: 0 },
    { funded: 1,  boost: 0.003 },
    { funded: 3,  boost: 0.006 },
    { funded: 6,  boost: 0.010 },
    { funded: 12, boost: 0.015 }
  ];
  var REF_NAMES = ['J. Mwangi', 'A. Otieno', 'S. Wanjiru', 'D. Kiptoo', 'P. Njeri', 'M. Achieng'];
  function seedReferrals() {
    if (S.referrals) return;
    var now = Date.now(), out = [];
    for (var i = 0; i < 4; i++) {
      out.push({
        id: 'RF' + (now - i * 86400000),
        name: REF_NAMES[i],
        joined: now - (i * 4 + 2) * 86400000,
        funded: i < 3
      });
    }
    S.referrals = out;
    persist();
  }
  function fundedCount() {
    seedReferrals();
    return S.referrals.filter(function (r) { return r.funded; }).length;
  }
  function boostTier() {
    var n = fundedCount(), best = BOOST_TIERS[0];
    for (var i = 0; i < BOOST_TIERS.length; i++) {
      if (n >= BOOST_TIERS[i].funded) best = BOOST_TIERS[i];
    }
    return best;
  }
  function nextTier() {
    var n = fundedCount();
    for (var i = 0; i < BOOST_TIERS.length; i++) {
      if (BOOST_TIERS[i].funded > n) return BOOST_TIERS[i];
    }
    return null;
  }
  function boost() { return boostTier().boost; }
  function referralCode() {
    var e = (S.session && S.session.email) || 'nexas';
    var base = e.split('@')[0].replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 5) || 'NEXAS';
    return base + '7K';
  }

  /* Documents hold image data, which is far too big for localStorage and
     has no business being persisted in a browser anyway, so they live for
     the session only. */
  var docs = {};

  /* ---------- money ---------- */
  function balance() { return S.balances[S.account]; }
  function adjust(delta, entry) {
    S.balances[S.account] = round(S.balances[S.account] + delta, 2);
    if (entry) {
      S.transactions.unshift({
        id: 'T' + Date.now() + Math.floor(Math.random() * 99),
        t: Date.now(), kind: entry.kind, ref: entry.ref || '',
        amount: round(delta, 2), balance: S.balances[S.account], account: S.account
      });
    }
    persist();
    B.emit('balance', { balance: balance(), account: S.account });
  }

  /* ---------- contracts ---------- */
  function payoutRate(type) {
    return (PAYOUT[type] || 1.95) * (1 + boost());
  }
  function payoutFor(type, stake) {
    return round(stake * payoutRate(type), 2);
  }

  function validate(spec) {
    if (!S.session) return 'Sign in to place a trade';
    if (connection.status !== 'live') return 'Waiting for the price feed';
    var stake = +spec.stake;
    if (!stake || stake < LIMITS.min) return 'Minimum stake is ' + LIMITS.min + ' ' + S.currency;
    if (stake > LIMITS.max) return 'Maximum stake is ' + window.NexFmt.count(LIMITS.max) + ' ' + S.currency;
    if (stake > balance()) return 'Not enough funds. Available ' + window.NexFmt.money(balance(), S.currency);
    if (spec.ticks < LIMITS.minTicks || spec.ticks > LIMITS.maxTicks) return 'Duration must be 1–10 ticks';
    return null;
  }

  function buy(spec) {
    var error = validate(spec);
    if (error) return { ok: false, error: error };

    var meta = BY_ID[spec.symbol];
    var h = history[spec.symbol];
    var entry = h[h.length - 1];
    var c = {
      id: 'C' + Date.now() + Math.floor(Math.random() * 99),
      symbol: spec.symbol, symbolName: meta.name,
      type: spec.type, side: spec.side, barrier: spec.barrier == null ? null : spec.barrier,
      stake: round(+spec.stake, 2), payout: payoutFor(spec.type, +spec.stake),
      ticks: spec.ticks, elapsed: 0,
      entrySpot: entry.price, entryTime: Date.now(),
      exitSpot: null, exitTime: null,
      status: 'open', profit: 0, value: round(+spec.stake, 2),
      account: S.account, run: spec.run || null
    };
    S.contracts.unshift(c);
    adjust(-c.stake, { kind: 'Trade', ref: label(c) });
    B.emit('contracts', { reason: 'buy', contract: c });
    return { ok: true, contract: c };
  }

  function label(c) {
    if (c.type === 'even_odd') return c.side === 'even' ? 'Even' : 'Odd';
    if (c.type === 'matches') return 'Matches ' + c.barrier;
    if (c.type === 'differs') return 'Differs ' + c.barrier;
    if (c.type === 'over') return 'Over ' + c.barrier;
    if (c.type === 'under') return 'Under ' + c.barrier;
    return c.type;
  }

  function winning(c, digit) {
    switch (c.type) {
      case 'even_odd': return (digit % 2 === 0) === (c.side === 'even');
      case 'matches': return digit === c.barrier;
      case 'differs': return digit !== c.barrier;
      case 'over': return digit > c.barrier;
      case 'under': return digit < c.barrier;
    }
    return false;
  }

  /* indicative resale value while a contract runs */
  function mark(c, digit) {
    var progress = c.elapsed / c.ticks;
    var win = winning(c, digit);
    var v = win
      ? c.stake + (c.payout - c.stake) * progress * 0.82
      : c.stake * (1 - progress * 0.88);
    return round(Math.max(0, v), 2);
  }

  function advanceContracts(symbol, point) {
    var changed = false;
    S.contracts.forEach(function (c) {
      if (c.status !== 'open' || c.symbol !== symbol) return;
      c.elapsed++;
      c.lastSpot = point.price;
      c.lastDigit = point.digit;
      c.value = mark(c, point.digit);
      changed = true;
      if (c.elapsed >= c.ticks) settle(c, point);
    });
    if (changed) { persist(); B.emit('contracts', { reason: 'tick' }); }
  }

  function settle(c, point) {
    var won = winning(c, point.digit);
    c.status = won ? 'won' : 'lost';
    c.exitSpot = point.price;
    c.exitDigit = point.digit;
    c.exitTime = Date.now();
    c.profit = round(won ? c.payout - c.stake : -c.stake, 2);
    c.value = won ? c.payout : 0;
    if (won) adjust(c.payout, { kind: 'Payout', ref: label(c) });
    B.emit('settled', c);
  }

  function sell(id) {
    var c = S.contracts.filter(function (x) { return x.id === id; })[0];
    if (!c || c.status !== 'open') return { ok: false, error: 'Contract is no longer open' };
    c.status = 'sold';
    c.exitSpot = c.lastSpot;
    c.exitTime = Date.now();
    c.profit = round(c.value - c.stake, 2);
    adjust(c.value, { kind: 'Sold', ref: label(c) });
    B.emit('contracts', { reason: 'sell', contract: c });
    B.emit('settled', c);
    return { ok: true, contract: c };
  }

  /* ---------- session ---------- */
  function signIn(email, method) {
    S.session = {
      token: 'demo.' + Math.random().toString(36).slice(2),
      email: email || 'amara@mail.com',
      name: 'Amara Kimani',
      method: method || 'password',
      at: Date.now()
    };
    persist();
    B.emit('session', S.session);
    return S.session;
  }
  function signOut() {
    S.session = null;
    persist();
    B.emit('session', null);
  }

  /* ---------- boot ---------- */
  var readyFns = [];
  setTimeout(function () {
    booted = true;
    setConnection('live');
    start();
    readyFns.forEach(function (f) { f(); });
    readyFns = [];
    detectCountry();
    B.emit('ready');
  }, 420);

  window.NexAPI = {
    limits: LIMITS,
    payouts: PAYOUT,
    symbols: SYMBOLS,
    symbol: function (id) { return BY_ID[id] || SYMBOLS[0]; },
    ready: function (fn) { booted ? fn() : readyFns.push(fn); },
    isReady: function () { return booted; },
    on: B.on,

    feed: {
      history: function (sym) { return history[sym] || []; },
      last: function (sym) { var h = history[sym] || []; return h[h.length - 1]; },
      subscribe: function (sym, fn) {
        return B.on('tick', function (d) { if (d.symbol === sym) fn(d); });
      }
    },

    account: {
      kind: function () { return S.account; },
      balance: balance,
      currency: function () { return S.currency; },
      balances: function () { return S.balances; },
      use: function (kind) {
        if (kind !== 'real' && kind !== 'demo') return;
        S.account = kind;
        persist();
        B.emit('balance', { balance: balance(), account: kind });
      },
      credit: function (amount, kind) { adjust(Math.abs(+amount || 0), { kind: kind || 'Deposit' }); },
      debit: function (amount, kind) { adjust(-Math.abs(+amount || 0), { kind: kind || 'Withdrawal' }); }
    },

    contracts: {
      buy: buy, sell: sell, validate: validate, label: label,
      payoutFor: payoutFor, payoutRate: payoutRate,
      open: function () { return S.contracts.filter(function (c) { return c.status === 'open'; }); },
      closed: function () { return S.contracts.filter(function (c) { return c.status !== 'open'; }); },
      all: function () { return S.contracts.slice(); },
      get: function (id) { return S.contracts.filter(function (c) { return c.id === id; })[0]; },
      today: function () {
        var start = new Date(); start.setHours(0, 0, 0, 0);
        return S.contracts.filter(function (c) { return c.entryTime >= start.getTime(); });
      }
    },

    transactions: { list: function () { return S.transactions.slice(); } },

    geo: {
      countries: COUNTRIES,
      code: countryCode,
      country: function () { return COUNTRIES[countryCode()]; },
      detect: detectCountry
    },

    referrals: {
      tiers: BOOST_TIERS,
      code: referralCode,
      link: function () { return 'https://nexas.trade/r/' + referralCode(); },
      list: function () { seedReferrals(); return S.referrals.slice(); },
      count: function () { seedReferrals(); return S.referrals.length; },
      funded: fundedCount,
      boost: boost,
      tier: boostTier,
      next: nextTier
    },

    session: {
      get: function () { return S.session; },
      signIn: signIn,
      signOut: signOut
    },

    kyc: {
      verified: function () { return S.verified; },
      docs: function () { return docs; },
      hasDoc: function (name) { return !!docs[name]; },
      setDoc: function (name, file) { docs[name] = file; B.emit('kyc', false); },
      clearDoc: function (name) { delete docs[name]; B.emit('kyc', false); },
      submit: function () { S.verified = true; persist(); B.emit('kyc', true); }
    },

    connection: {
      status: function () { return connection.status; },
      latency: function () { return connection.latency; },
      simulateDrop: function () {
        setConnection('reconnecting');
        setTimeout(function () { setConnection('live'); }, 2600);
      }
    },

    prefs: {
      consent: function () { return S.consent; },
      setConsent: function (v) { S.consent = !!v; persist(); },
      riskAck: function () { return S.riskAck; },
      setRiskAck: function (v) { S.riskAck = !!v; persist(); },
      auto: function () { return S.auto; },
      setAuto: function (o) { S.auto = Object.assign(S.auto, o); persist(); }
    },

    /* demo-data helper: gives a first-time viewer something to look at */
    seedDemoHistory: function () {
      if (S.contracts.length) return;
      var now = Date.now(), types = [
        ['even_odd', 'even', null], ['even_odd', 'odd', null],
        ['matches', null, 4], ['over', null, 5], ['under', null, 3], ['differs', null, 7]
      ];
      for (var i = 0; i < 9; i++) {
        var t = types[i % types.length];
        var stake = [5, 10, 10, 25, 50][i % 5];
        var won = Math.random() > 0.45;
        var payout = payoutFor(t[0], stake);
        S.contracts.push({
          id: 'C' + (now - i * 900000), symbol: 'R_10', symbolName: 'Volatility 10 (1s) Index',
          type: t[0], side: t[1], barrier: t[2], stake: stake, payout: payout,
          ticks: 5, elapsed: 5,
          entrySpot: round(9600 + Math.random() * 4, 2), entryTime: now - i * 900000 - 5000,
          exitSpot: round(9600 + Math.random() * 4, 2), exitTime: now - i * 900000,
          status: won ? 'won' : 'lost', profit: round(won ? payout - stake : -stake, 2),
          value: won ? payout : 0, account: 'real'
        });
        S.transactions.push({
          id: 'T' + (now - i * 900000), t: now - i * 900000, kind: won ? 'Payout' : 'Trade',
          ref: label({ type: t[0], side: t[1], barrier: t[2] }),
          amount: won ? payout : -stake, balance: S.balances.real, account: 'real'
        });
      }
      persist();
    }
  };
})();
