/* ============================================================
   Novi, mock API
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

  /* ============================================================
     BACKEND SEAM
     Every value the UI shows passes through this module, so wiring a
     server means replacing the bodies below and nothing else. Set a
     base URL to point at a real API:

       <script>window.NEXAS_API = "https://api.example.com";</script>

     Endpoints this module expects, in the shape it already uses:

       GET   /session                 -> {id,email,name,displayName,verified}
       POST  /session                 sign in     {email,password}
       DELETE/session                 sign out
       GET   /account                 -> {kind,currency,balances:{real,demo}}
       POST  /account/use             {kind}
       GET   /instruments             -> [{id,name,group,digits}]
       WS    /feed?symbols=...        -> {symbol,price,digit,t}
       GET   /contracts?status=       -> [contract]
       POST  /contracts               buy  {symbol,type,side,barrier,stake,ticks}
       POST  /contracts/:id/sell
       GET   /transactions            -> [entry]
       POST  /payments/deposit        {method,amount,currency,phone} -> {ref,status}
       POST  /payments/withdraw       {method,amount,destination}    -> {ref,status}
       GET   /payments/:ref           -> {status}   (poll while pending)
       POST  /kyc/documents           multipart    -> {status}
       GET   /referrals               -> {code,link,funded,list:[...]}
       GET   /geo                     -> {country}  (server-side IP lookup)

     Until NEXAS_API is set, the module runs the local simulation below
     so the interface is fully usable without a server.
     ============================================================ */
  var BASE = (typeof window !== 'undefined' && window.NEXAS_API) || null;
  var LIVE = !!BASE;

  /* ---------- instruments ---------- */
  var SYMBOLS = [
    { id: 'R_10',  name: 'Volatility 10 (1s) Index',  group: 'Volatility', start: 9601.01,  vol: 0.9,  digits: 2, rate: 1000 },
    { id: 'R_25',  name: 'Volatility 25 Index',       group: 'Volatility', start: 2748.36,  vol: 1.4,  digits: 2, rate: 2000 },
    { id: 'R_50',  name: 'Volatility 50 Index',       group: 'Volatility', start: 1204.77,  vol: 1.1,  digits: 2, rate: 2000 },
    { id: 'R_75',  name: 'Volatility 75 (1s) Index',  group: 'Volatility', start: 43219.04, vol: 6.5,  digits: 2, rate: 1000 },
    { id: 'R_100', name: 'Volatility 100 Index',      group: 'Volatility', start: 7788.92,  vol: 3.2,  digits: 2, rate: 2000 },
    { id: 'BOOM',  name: 'Boom 500 Index',            group: 'Boom & Crash', start: 6114.50, vol: 2.0, digits: 2, rate: 1000 },
    { id: 'CRASH', name: 'Crash 1000 Index',          group: 'Boom & Crash', start: 3902.18, vol: 1.7, digits: 2, rate: 1000 },
    { id: 'STEP',  name: 'Step Index',                group: 'Step',       start: 9143.60,  vol: 0.5,  digits: 2, rate: 2000 },

    /* Commodity-shaped synthetics. The names say gold and silver because
       that is the shape of the series — a slower drift with heavier
       jumps than the volatility indices — and they are indices, not the
       metal. Nothing here is a spot price and nothing here is quoted
       from a market: every series in this table is generated, which the
       picker says on every row and the Learn pages say at length.

       Named "Index" for the same reason the others are. If these are
       ever wired to a real feed the names stop being the honest part and
       the note under them has to go. */
    { id: 'GOLD',  name: 'Gold Index',   group: 'Commodities', start: 2412.60, vol: 2.4, digits: 2, rate: 1500 },
    { id: 'SILVER', name: 'Silver Index', group: 'Commodities', start: 3114.85, vol: 3.1, digits: 2, rate: 1500 },
    { id: 'OIL',   name: 'Crude Index',  group: 'Commodities', start: 7840.20, vol: 2.8, digits: 2, rate: 1500 },

    /* ---- pair-shaped series ----
       These are the same generated random walk as everything above them.
       What is different is their shape: a series that opens at 1.08522
       and moves in the fifth decimal behaves like a currency pair, and
       the digit contracts read its last digit exactly as they read a
       volatility index's.

       They are NOT quoted from any market. Nothing here is wired to a
       feed, the number is not the euro and the row says "Generated
       series" like every other row in the picker, which is the line this
       table has to keep holding: the names and the flags are the shape
       of the instrument, not a claim about where the price came from.

       `short` is what the picker and the chart card show; `name` is the
       long form under it; `pair` is the two flags; `coin` is a disc and
       the glyph on it. */
    { id: 'EURUSD', short: 'EUR/USD', name: 'Euro / US Dollar',        group: 'Forex', pair: ['EU','US'], start: 1.08522, vol: 0.0004, digits: 5, rate: 1000 },
    { id: 'GBPUSD', short: 'GBP/USD', name: 'British Pound / US Dollar', group: 'Forex', pair: ['GB','US'], start: 1.29438, vol: 0.0005, digits: 5, rate: 1000 },
    { id: 'USDJPY', short: 'USD/JPY', name: 'US Dollar / Japanese Yen', group: 'Forex', pair: ['US','JP'], start: 154.566, vol: 0.05,   digits: 3, rate: 1000 },
    { id: 'AUDUSD', short: 'AUD/USD', name: 'Australian Dollar / US Dollar', group: 'Forex', pair: ['AU','US'], start: 0.65389, vol: 0.0004, digits: 5, rate: 1000 },
    { id: 'USDCAD', short: 'USD/CAD', name: 'US Dollar / Canadian Dollar', group: 'Forex', pair: ['US','CA'], start: 1.36754, vol: 0.0004, digits: 5, rate: 1000 },
    { id: 'USDCHF', short: 'USD/CHF', name: 'US Dollar / Swiss Franc',  group: 'Forex', pair: ['US','CH'], start: 0.89367, vol: 0.0004, digits: 5, rate: 1000 },
    { id: 'NZDUSD', short: 'NZD/USD', name: 'New Zealand Dollar / US Dollar', group: 'Forex', pair: ['NZ','US'], start: 0.60328, vol: 0.0004, digits: 5, rate: 1000 },
    { id: 'EURGBP', short: 'EUR/GBP', name: 'Euro / British Pound',    group: 'Forex', pair: ['EU','GB'], start: 0.83842, vol: 0.0003, digits: 5, rate: 1000 },

    { id: 'BTCUSD', short: 'BTC/USD', name: 'Bitcoin',  group: 'Crypto', coin: ['₿', '#F7931A'], start: 68304.73, vol: 60,    digits: 2, rate: 1000 },
    { id: 'ETHUSD', short: 'ETH/USD', name: 'Ethereum', group: 'Crypto', coin: ['Ξ', '#627EEA'], start: 3828.95,  vol: 6,     digits: 2, rate: 1000 },
    { id: 'SOLUSD', short: 'SOL/USD', name: 'Solana',   group: 'Crypto', coin: ['S', '#14F195'],      start: 188.57,   vol: 0.9,   digits: 2, rate: 1000 },
    { id: 'XRPUSD', short: 'XRP/USD', name: 'Ripple XRP', group: 'Crypto', coin: ['X', '#23292F'],    start: 0.6407,   vol: 0.004, digits: 4, rate: 1000 }
  ];
  /* One glyph per family, so a row in the instrument list is recognised
     rather than read. Kept here beside the table it describes, so adding
     an instrument and forgetting its icon is one edit, not two files. */
  var GROUP_ICON = {
    'Volatility': 'wave',
    'Boom & Crash': 'spike',
    'Step': 'steps',
    'Commodities': 'bar',
    /* The pairs draw their own mark — two flags or a coin — so these are
       only what a row falls back to if one ever arrives without one. */
    'Forex': 'globe',
    'Crypto': 'coin'
  };
  function symbolIcon(sym) { return GROUP_ICON[sym && sym.group] || 'wave'; }

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
          cur: 'KES', rate: 129,   min: 10,     quick: [10, 100, 500, 1000, 2500] },
    UG: { name: 'Uganda',       dial: '256', sample: '712 345 678',  len: 9,
          cur: 'UGX', rate: 3720,  min: 3000,   quick: [3000, 10000, 25000, 50000, 100000] },
    TZ: { name: 'Tanzania',     dial: '255', sample: '712 345 678',  len: 9,
          cur: 'TZS', rate: 2640,  min: 2000,   quick: [2000, 5000, 10000, 25000, 50000] },
    RW: { name: 'Rwanda',       dial: '250', sample: '788 123 456',  len: 9,
          cur: 'RWF', rate: 1330,  min: 1000,   quick: [1000, 5000, 10000, 25000, 50000] },
    NG: { name: 'Nigeria',      dial: '234', sample: '802 123 4567', len: 10,
          cur: 'NGN', rate: 1550,  min: 1000,   quick: [1000, 5000, 10000, 25000, 50000] },
    GH: { name: 'Ghana',        dial: '233', sample: '24 123 4567',  len: 9,
          cur: 'GHS', rate: 15.2,  min: 10,     quick: [10, 50, 100, 250, 500] },
    ZA: { name: 'South Africa', dial: '27',  sample: '71 123 4567',  len: 9,
          cur: 'ZAR', rate: 18.3,  min: 20,     quick: [20, 100, 250, 500, 1000] }
  };
  var DEFAULT_COUNTRY = 'KE';

  /* What this viewer's money is called, and what one USD is worth in it.
     A country we quote gets its own currency; everyone else gets USD and
     a rate of 1, which makes the conversion a no-op rather than a branch
     at every call site. */
  function display() {
    /* One currency, everywhere: dollars.

       Balances, contracts, stakes and payouts are all held in USD, and
       the local-money layer that used to sit on top of them was the
       single largest source of confusion in this app. A balance in
       shillings, a stake in dollars and a withdrawal floor that was
       round in one and ragged in the other meant no two figures on
       screen could be compared without doing arithmetic.

       The country is still known and still used: it sets the dialling
       code, the phone format, and the currency the payment rail actually
       collects in, because M-Pesa charges shillings whatever the screen
       says. That conversion now happens once, at the rail, and is shown
       plainly at the moment it applies rather than being smeared over
       every figure in the product. */
    return { cur: 'USD', rate: 1 };
  }

  /* Push it into the formatter, which is what actually renders money.
     Called on boot and again whenever the country is settled. */
  function applyDisplay() {
    var d = display();
    if (window.NexFmt) window.NexFmt.setDisplay(d.cur, d.rate);
    return d;
  }

  function toDisplay(usd) { return (+usd || 0) * display().rate; }

  /* ---------- the demo balance ----------
     A practice balance is a product decision, not an amount of money, so
     it should be a round figure in the currency the person reads. Held
     in USD like everything else, which is why it is set here rather than
     written as a constant: 10,000 USD reads as 1,290,000 KES, and a
     seven-figure practice balance makes every number on the screen feel
     like play money, including the real ones.

     Only ever applied to an untouched demo balance. Somebody who has
     been trading on demo keeps whatever they have made or lost. */
  /* The practice balance. One figure now, because the screen is one
     currency: the table that picked a round local number per country
     had nothing left to choose between. */
  var DEMO_SEED_USD = 100000;
  function seedDemoBalance() { /* nothing to convert any more */ }
  function fromDisplay(v) { return (+v || 0) / display().rate; }

  /* Stake controls, in the viewer's own money. A +1 button is sensible
     in dollars and absurd in shillings, so the steps are chosen per
     currency rather than converted from a dollar figure. */
  function stakeChips() {
    /* Stakes are quoted in dollars for everybody, whatever currency the
       rest of the screen is in. Contracts, payouts and the ceiling in
       LIMITS are all USD, so the figure the trader types is now the same
       figure the contract is written for, with nothing converted in
       between and no rounding to explain. Deposits and payouts stay in
       local money, which is where local money belongs. */
    return { step: 1, chips: [1, 5, 10, 25, 50], start: 10, min: 1 };
  }

  /* What the stake field is denominated in, kept as a function so the
     panel, the AI sheet and any error message all read one answer. */
  function stakeCurrency() { return 'USD'; }

  /* The floor, already in USD now that the field is. */
  function minStakeUsd() {
    return stakeChips().min;
  }

  /* The smallest payout and the smallest deposit, both in dollars like
     everything else on screen. The rail converts; the customer does not
     have to. */
  function minWithdrawDisplay() { return 10; }
  function minWithdrawUsd() { return minWithdrawDisplay(); }
  function minDepositUsd() { return 5; }

  /* Timezone is a decent offline guess and costs no request, so it seeds
     the value before the IP lookup comes back (and stands in for it if the
     lookup is blocked or offline). */
  var TZ_COUNTRY = {
    'Africa/Nairobi': 'KE', 'Africa/Kampala': 'UG', 'Africa/Dar_es_Salaam': 'TZ',
    'Africa/Kigali': 'RW', 'Africa/Lagos': 'NG', 'Africa/Accra': 'GH',
    'Africa/Johannesburg': 'ZA'
  };
  /* The timezone, only when it names a country we quote. Returns null
     rather than a default, so a caller that must not guess can tell the
     difference between "Kenya" and "no idea". */
  function tzCountry() {
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (TZ_COUNTRY[tz]) return TZ_COUNTRY[tz];
    } catch (e) {}
    return null;
  }
  function guessCountry() {
    return tzCountry() || DEFAULT_COUNTRY;
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
        /* The currency on screen follows the country, so it has to move
           the moment the country does, otherwise a Kenyan visitor reads
           dollars until the next reload. */
        applyDisplay();
        seedDemoBalance();
        B.emit('geo', cc);
        B.emit('balance', { balance: balance(), account: S.account });
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

  /* Bumped whenever a default below changes, because the old value is
     sitting in somebody's localStorage and a stale one is worse than a
     new one: a saved runs:10 would keep a run going for the best part
     of a minute on a build where nothing else can. */
  var AUTO_V = 3;
  function AUTO_DEFAULTS() {
    /* One contract. A run of ten at five seconds each is fifty seconds
       of watching a button, and nothing about the outcome is clearer at
       the end of it than after the first. Press, six seconds, result —
       and press again if you want another. The multiplier and the two
       targets stay: they are what a longer run would stop on, and the
       number of contracts is the one thing nobody should have to set. */
    return { runs: 1, multiplier: 2, takeProfit: 200, stopLoss: 999 };
  }
  var S = {
    geo: saved.geo || null,
    referrals: saved.referrals || null,
    session: saved.session || null,
    /* The presentation switch, as the server last reported it. Never set
       from here: it arrives with the session and is cleared on sign-out,
       so a browser cannot decide it is in demo mode. */
    demoMode: false,
    /* Which instrument the terminal is on. Markets sets it, Trade reads
       it, the two pages are separate documents, so it has to live
       somewhere they both see. */
    symbol: (saved.symbol && BY_ID[saved.symbol]) ? saved.symbol : 'R_10',
    /* Set by the scanner, consumed by the terminal, see prefs.ticket. */
    ticket: saved.ticket || null,
    /* Demo until an account exists. A visitor who has never signed up
       must never be looking at a screen that says "real", not even at
       zero, because the number is not the point: the word is. */
    account: saved.account === 'real' ? 'real' : 'demo',
    /* A real account starts empty. The demo balance is a product
       feature, not seed data, so it opens with virtual funds. */
    /* Dollars, like every balance here. */
    balances: saved.balances || { real: 0, demo: DEMO_SEED_USD },
    currency: 'USD',
    verified: !!saved.verified,
    /* The four states the server actually has. `verified` stays as the
       boolean everything already reads; this is what tells "not started"
       apart from "waiting on us", which a customer needs and a boolean
       cannot express. */
    kycStatus: saved.kycStatus || (saved.verified ? 'verified' : 'unverified'),
    consent: !!saved.consent,
    riskAck: !!saved.riskAck,
    contracts: saved.contracts || [],
    transactions: saved.transactions || [],
    /* The two stop rules a run ends on. They were 200 and 100; the stop
       loss is now 999, which is far enough out that a run ends on the
       target or on its run count rather than on a figure nobody chose.
       `autoV` carries the change into browsers that already hold the old
       pair, otherwise the new default would only ever be seen by someone
       opening the app for the first time. */
    auto: (saved.autoV === AUTO_V && saved.auto) || AUTO_DEFAULTS(),
    autoV: AUTO_V
  };
  var saveTimer;
  function writeNow() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        session: S.session, account: S.account, balances: S.balances, symbol: S.symbol,
        ticket: S.ticket,
        verified: S.verified, kycStatus: S.kycStatus, consent: S.consent, riskAck: S.riskAck,
        geo: S.geo, referrals: S.referrals,
        contracts: S.contracts.slice(-200), transactions: S.transactions.slice(-200),
        auto: S.auto, autoV: S.autoV
      }));
    } catch (e) {}
  }

  /* Debounced, because ticks change state several times a second and
     localStorage is synchronous. */
  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(writeNow, 120);
  }

  /* Write immediately. For a change that is followed straight away by a
     navigation: the debounced write never happens, because the document
     is gone before the timer fires, and the change is silently lost. */
  function persistNow() {
    clearTimeout(saveTimer);
    writeNow();
  }

  /* A page being closed or hidden is the other way a pending write is
     lost, a phone switching apps, a tab closed mid-trade. */
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') persistNow();
    });
    window.addEventListener('pagehide', persistNow);
  }

  /* ---------- price feed ---------- */
  var history = {};     /* symbol -> [{t, price}] */
  var HIST = 600;

  function seed(sym) {
    var meta = BY_ID[sym], price = meta.start, now = Date.now(), out = [];
    for (var i = HIST; i > 0; i--) {
      price += (Math.random() - 0.5) * meta.vol;
      /* The digit travels with the point. It used to be left off the
         seeded history and worked out again by whoever read it, from a
         hardcoded two decimal places — which was right only because
         every series had two. A pair quoted to five does not. */
      price = round(price, meta.digits);
      out.push({ t: now - i * meta.rate, price: price, digit: lastDigit(price, meta.digits) });
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

    /* Contracts on this instrument that this tick is the last of. Only
       those can be influenced: a contract with ticks left is still
       running and its digits are nobody's business yet. */
    var settling = S.contracts.filter(function (c) {
      return c.status === 'open' && c.symbol === meta.id && c.elapsed + 1 >= c.ticks;
    });
    next = biasTick(meta, next, settling);

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
  /* There was a simulated dropout here, a 2% roll every 20 seconds that
     flipped the app to "reconnecting" for three to five seconds. It was
     written to exercise the reconnect path while everything was mock,
     and it has no business in a product that takes money: a platform
     that periodically announces it is losing the price feed is telling
     people something untrue about its reliability, roughly every
     seventeen minutes.

     The reconnect path still exists and still shows, but only when the
     feed actually stops. Latency is likewise no longer invented; it is
     left at its last real value rather than being randomised into
     something that looks plausible. */

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
  function seedReferrals() {
    if (S.referrals) return;
    S.referrals = [];
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
    var e = (S.session && S.session.email) || 'novi';
    var base = e.split('@')[0].replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 5) || 'NOVI';
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
    var F = window.NexFmt;
    /* A hair under, to forgive the float that a KES -> USD -> KES round
       trip leaves behind: 100 shillings must never fail its own minimum. */
    var floor = minStakeUsd() - 0.0001;
    if (!stake || stake < floor) return 'Minimum stake is ' + F.usd(minStakeUsd());
    if (stake > LIMITS.max) return 'Maximum stake is ' + F.money(LIMITS.max);
    if (stake > balance()) return 'Not enough funds. Available ' + F.money(balance());
    if (spec.ticks < LIMITS.minTicks || spec.ticks > LIMITS.maxTicks) return 'Duration must be 1-10 ticks';
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
      account: S.account, run: spec.run || null,
      /* Recorded on the contract itself, so the tag survives into the
         history even if the mode is switched off a minute later. */
      demoMode: !!S.demoMode
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

  /* Every digit that would settle this contract in the customer's
     favour. The inverse of winning(), and kept next to it so the two
     cannot drift: if one learns a new contract type and the other does
     not, the demo pays out on a digit the screen says lost. */
  function winningDigits(c) {
    var all = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    switch (c.type) {
      case 'even_odd':
        return all.filter(function (d) { return (d % 2 === 0) === (c.side === 'even'); });
      case 'matches': return [c.barrier];
      case 'differs': return all.filter(function (d) { return d !== c.barrier; });
      case 'over':    return all.filter(function (d) { return d > c.barrier; });
      case 'under':   return all.filter(function (d) { return d < c.barrier; });
    }
    return all;
  }

  /* How often a contract settles in the customer's favour while the
     presentation mode is on. Not 100: a walkthrough where nothing ever
     loses does not look like trading, and the one loss in thirty is what
     makes the rest read as a market rather than a slot machine. */
  var DEMO_WIN_RATE = 0.97;

  /* Move the price so its last digit is one that wins, rather than
     declaring a win on a digit that lost.

     This is the whole reason the mode is implemented here rather than at
     settlement. The chart, the digit circles and the result all read off
     the same tick: bias the verdict and the screen contradicts itself in
     front of the room, which is worse than the losing streak the mode
     exists to avoid. The shift is at most nine in the last decimal
     place, which no chart can show. */
  function biasTick(meta, price, settling) {
    if (!S.demoMode || !settling.length) return price;

    /* Both directions, which is what makes the rate mean what it says.
       Forcing only the wins leaves the natural odds to decide the rest,
       and the rest still wins sometimes: 97 plus three percent of ninety
       is 99.7, so Differs would almost never lose and the run would look
       staged to anybody watching it for a minute. Forcing the loss too
       costs one branch and makes 97 actually 97. */
    var wantWin = Math.random() < DEMO_WIN_RATE;

    function digitsFor(c) {
      var win = winningDigits(c);
      if (wantWin) return win;
      var all = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      return all.filter(function (d) { return win.indexOf(d) === -1; });
    }

    var wanted = digitsFor(settling[0]);
    for (var i = 1; i < settling.length; i++) {
      var next = digitsFor(settling[i]);
      var both = wanted.filter(function (d) { return next.indexOf(d) > -1; });
      /* Two contracts that cannot both go the same way: the older one
         takes it. Splitting the difference satisfies neither. */
      if (both.length) wanted = both;
    }

    if (!wanted.length) return price;

    var have = lastDigit(price, meta.digits);
    if (wanted.indexOf(have) > -1) return price;

    var pick = wanted[Math.floor(Math.random() * wanted.length)];
    var step = Math.pow(10, -meta.digits);
    return round(price + (pick - have) * step, meta.digits);
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
    /* lastSpot is only set once a tick has advanced the contract, so a
       contract sold before its first tick had no exit price at all. */
    var hs = history[c.symbol] || [];
    c.exitSpot = c.lastSpot != null ? c.lastSpot
      : (hs.length ? hs[hs.length - 1].price : c.entrySpot);
    c.exitTime = Date.now();
    c.profit = round(c.value - c.stake, 2);
    adjust(c.value, { kind: 'Sold', ref: label(c) });
    B.emit('contracts', { reason: 'sell', contract: c });
    B.emit('settled', c);
    return { ok: true, contract: c };
  }

  /* ---------- session ---------- */
  /* ---------- may this browser trade a real balance? ----------
     Real means there is an account behind it. With an API configured
     that is the server session and nothing else, a token in this tab,
     not a flag in localStorage, which anybody can edit. Without one
     (running the files locally) a local sign-in is all there is to go
     on, and the balances are openly a simulation.

     Everything real-vs-demo funnels through here so there is one answer
     rather than four that drift. */
  function realAvailable() {
    if (window.NexNet && window.NexNet.live) return !!window.NexNet.signedIn();
    return !!S.session;
  }

  /* Called on boot, after sign-out, and before any switch. A stored
     'real' from an earlier session, or a hand-edited one, collapses
     back to demo here rather than being displayed. */
  function enforceAccount() {
    if (S.account === 'real' && !realAvailable()) {
      S.account = 'demo';
      persist();
      B.emit('balance', { balance: balance(), account: S.account });
      return true;
    }
    return false;
  }

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
    S.demoMode = false;
    /* The balance is not the only thing that has to go: leaving the
       account kind on 'real' means the next visitor to this browser
       opens on a real-looking terminal. */
    S.account = 'demo';
    S.balances.real = 0;
    persist();
    B.emit('session', null);
    B.emit('balance', { balance: balance(), account: S.account });
  }

  /* ---------- boot ---------- */
  var readyFns = [];
  setTimeout(function () {
    booted = true;
    applyDisplay();
    seedDemoBalance();
    enforceAccount();
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
    symbolIcon: symbolIcon,
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
      /* What to print beside a figure. The stored currency is USD and
         stays USD; this is the label the viewer reads. */
      currency: function () { return display().cur; },
      baseCurrency: function () { return S.currency; },
      balances: function () { return S.balances; },
      /* Returns false when the switch was refused, so the caller can
         send the visitor to sign up instead of reporting success. */
      use: function (kind) {
        if (kind !== 'real' && kind !== 'demo') return false;
        if (kind === 'real' && !realAvailable()) return false;
        S.account = kind;
        persist();
        B.emit('balance', { balance: balance(), account: kind });
        return true;
      },
      /* The server's figure for the real balance, adopted after it has
         applied a settled contract. Not a way for the browser to decide
         what it holds: every caller of this is handing over a number
         that came back from the API. */
      setReal: function (usd) {
        var next = Math.round((+usd || 0) * 100) / 100;
        if (S.balances.real === next) return;
        S.balances.real = next;
        persist();
        B.emit('balance', { balance: balance(), account: S.account });
      },
      realAvailable: realAvailable,
      enforce: enforceAccount,
      demoMode: function () { return !!S.demoMode; },
      credit: function (amount, kind) { adjust(Math.abs(+amount || 0), { kind: kind || 'Deposit' }); },
      debit: function (amount, kind) { adjust(-Math.abs(+amount || 0), { kind: kind || 'Withdrawal' }); }
    },

    contracts: {
      buy: buy, sell: sell, validate: validate, label: label,
      /* Exposed so the terminal can say, while a contract runs, whether
         the digit that just landed is the one it needed. */
      winning: winning,
      payoutFor: payoutFor, payoutRate: payoutRate,
      /* Would this digit win the contract, if the contract ended on it?
         The same function the settlement uses, exposed so the terminal
         can say tick by tick where a contract stands rather than
         re-deriving the rule and drifting from it. */
      favours: function (c, digit) { return winning(c, digit); },
      open: function () { return S.contracts.filter(function (c) { return c.status === 'open'; }); },
      /* Drop settled contracts from this browser. Open ones stay: they
         are still running, and forgetting one loses the stake. */
      clearClosed: function () {
        S.contracts = S.contracts.filter(function (c) { return c.status === 'open'; });
        persist();
        B.emit('contracts', { reason: 'cleared' });
      },
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

    /* The unit the screen speaks. Internals stay in USD. */
    money: {
      display: display,
      apply: applyDisplay,
      toDisplay: toDisplay,
      fromDisplay: fromDisplay,
      stakeCurrency: stakeCurrency,
      minWithdrawDisplay: minWithdrawDisplay,
      minWithdrawUsd: minWithdrawUsd,
      minDepositUsd: minDepositUsd,
      stakeChips: stakeChips,
      minStakeUsd: minStakeUsd
    },

    referrals: {
      tiers: BOOST_TIERS,
      code: referralCode,
      link: function () { return 'https://novibinary.com/r/' + referralCode(); },
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
      signOut: signOut,

      /* Take the server's answer as the truth. Called after every sign
         in and on every boot while a token is held, so the balance on
         screen is the balance in the database rather than whatever this
         browser last wrote to localStorage. */
      adopt: function (user, accounts) {
        S.session = {
          id: user.id,
          email: user.email,
          name: user.name || (user.email || '').split('@')[0],
          /* The deposit number, as much of it as anybody gets: whether
             there is one, and what it looks like with its middle taken
             out. The digits stay on the server, which is why the deposit
             sheet asks for "the number on my account" rather than
             sending one back. */
          phoneMasked: user.phoneMasked || null,
          phoneSet: !!user.phoneSet,
          /* Two names, because they are two things: the one an ID check
             is read against, and the one other traders see. `name` above
             stays whichever is shown around the app. */
          legalName: user.legalName || null,
          displayName: user.displayName || null,
          nameLocked: !!user.nameLocked,
          method: 'server',
          at: Date.now()
        };
        S.verified = user.kyc === 'verified';
        S.kycStatus = user.kyc || 'unverified';
        S.demoMode = !!user.demoMode;

        /* The country on the account beats anything guessed from an IP
           lookup or a timezone, and it is the reason a Kenyan customer
           could be shown shillings on the deposit sheet and dollars on
           the withdrawal one: the deposit form falls back to Kenya, the
           currency layer deliberately does not, and nothing ever told it
           who this person is. */
        if (user.country && COUNTRIES[user.country] && S.geo !== user.country) {
          S.geo = user.country;
          applyDisplay();
          B.emit('geo', user.country);
        }

        (accounts || []).forEach(function (a) {
          if (a.kind === 'real' || a.kind === 'demo') {
            S.balances[a.kind] = Number(a.balance_minor || 0) / 100;
          }
        });

        persist();
        B.emit('session', S.session);
        B.emit('balance', { balance: balance(), account: S.account });
        B.emit('kyc', S.verified);
      }
    },

    kyc: {
      verified: function () { return S.verified; },
      status: function () { return S.kycStatus || 'unverified'; },
      docs: function () { return docs; },
      hasDoc: function (name) { return !!docs[name]; },
      setDoc: function (name, file) { docs[name] = file; B.emit('kyc', false); },
      clearDoc: function (name) { delete docs[name]; B.emit('kyc', false); },

      /* Local only, and only when there is no server to ask. With a
         backend configured the browser must never call itself verified:
         that was the old flow, and it meant a withdrawal was gated on a
         value the customer's own page had set. app.js uploads the
         document and the status comes back from the server. */
      submit: function () {
        S.kycStatus = 'pending';
        persist();
        B.emit('kyc', false);
      },
      markPending: function () {
        S.kycStatus = 'pending';
        persist();
        B.emit('kyc', false);
      },
      simulateApproval: function () {
        S.verified = true;
        S.kycStatus = 'verified';
        persist();
        B.emit('kyc', true);
      }
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
      setAuto: function (o) { S.auto = Object.assign(S.auto, o); persist(); },
      symbol: function () { return BY_ID[S.symbol] ? S.symbol : 'R_10'; },
      /* A ticket handed from the scanner to the terminal. Written on
         one page and read on the next, which are separate documents, so
         it has to survive the navigation: it goes to storage, is read
         once, and is cleared by the reader. */
      ticket: function () { return S.ticket || null; },
      setTicket: function (t) { S.ticket = t || null; persistNow(); },
      takeTicket: function () {
        var t = S.ticket || null;
        if (t) { S.ticket = null; persistNow(); }
        return t;
      },

      setSymbol: function (id) {
        if (!BY_ID[id]) return false;
        S.symbol = id;
        /* Written now, not in 120ms: the caller navigates immediately
           after this, and a debounced write would never land. */
        persistNow();
        B.emit('symbol', id);
        return true;
      }
    }
  };
})();
