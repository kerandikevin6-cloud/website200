/* ============================================================
   Novi, network layer

   Everything that talks to the server goes through here. When no API is
   configured, `NexNet.live` is false and callers fall back to the local
   simulation, so the interface stays fully usable while the backend is
   being built or is down.

   Tokens live in localStorage because a trading session should survive
   a closed tab; the refresh token is exchanged automatically when the
   access token expires mid-request.
   ============================================================ */
(function () {
  "use strict";

  var BASE = (window.NEXAS_API || '').replace(/\/+$/, '');
  var LIVE = !!BASE;
  var KEY = 'nexas.auth';

  function tokens() {
    try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; }
  }
  function setTokens(t) {
    try {
      if (t) localStorage.setItem(KEY, JSON.stringify(t));
      else localStorage.removeItem(KEY);
    } catch (e) {}
  }

  /* One error type so callers can show a message without unwrapping a
     response shape. `fields` carries per-input complaints straight from
     the server's validator. */
  function ApiError(message, code, fields) {
    var e = new Error(message);
    e.code = code;
    e.fields = fields || null;
    return e;
  }

  var refreshing = null;
  var serverSettings = null, settingsAsked = false;

  async function refresh() {
    var t = tokens();
    if (!t || !t.refreshToken) return false;

    /* One refresh at a time. Three requests expiring together must not
       each spend the refresh token, only the first would succeed. */
    if (!refreshing) {
      refreshing = (async function () {
        try {
          var res = await fetch(BASE + '/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: t.refreshToken })
          });
          var body = await res.json().catch(function () { return {}; });
          if (!res.ok || !body.session) { setTokens(null); return false; }
          setTokens(body.session);
          return true;
        } catch (e) {
          return false;
        } finally {
          refreshing = null;
        }
      })();
    }
    return refreshing;
  }

  /* ---------- what kind of failure was that? ----------
     fetch() throws identically for a dead network, a blocked origin and
     a server that returned an error page without CORS headers on it, the reason never reaches JavaScript. So ask /health and read the
     shape of the answer:

       'ok'      the service answered normally, so both the network and
                 the allow-list are fine and the original call failed for
                 its own reasons
       'error'   it answered, but badly, a 5xx, which on a host that
                 sleeps is usually an instance still waking up
       'blocked' a plain request threw while an opaque one succeeded:
                 something is answering, but the browser would not let us
                 read it
       'down'    nothing answered at all

     'blocked' is deliberately vague, because from in here it genuinely
     is. A host's own 502 page carries no CORS headers either, so a
     sleeping instance and an origin that is not on the allow-list look
     exactly alike from JavaScript. The message says what is true of
     both, it did not get through, nothing was charged, and the console
     line names both causes for whoever is actually debugging it. */
  async function diagnose() {
    if (!BASE) return 'down';
    try {
      var res = await fetch(BASE + '/health', { cache: 'no-store' });
      return res.ok ? 'ok' : 'error';
    } catch (e) {}

    try {
      await fetch(BASE + '/health', { mode: 'no-cors', cache: 'no-store' });
      return 'blocked';
    } catch (e2) {
      return 'down';
    }
  }

  /* Hosts that sleep take a few seconds to come back, and the request
     that wakes them is the one that fails. Nudge /health when the app
     loads so the instance is already awake by the time somebody presses
     Deposit, and keep nudging while it is still waking, a cold start is
     ten to thirty seconds, which is longer than the gap between loading
     a page and using it. */
  var awake = false;
  function warm(tries) {
    if (!BASE || awake) return Promise.resolve(false);
    tries = tries == null ? 5 : tries;

    return fetch(BASE + '/health', { cache: 'no-store' })
      .then(function (res) {
        if (res.ok) { awake = true; return true; }
        throw new Error('not ready');
      })
      .catch(function () {
        if (tries <= 0) return false;
        return new Promise(function (resolve) {
          setTimeout(function () { resolve(warm(tries - 1)); }, 3000);
        });
      });
  }

  /* Before anything that must not fail on a cold start. Waits for the
     instance if it is on its way up, and gives up quickly if it is not,
     so this never becomes the reason a request is slow. */
  function ensureAwake() {
    if (awake) return Promise.resolve(true);
    return warm(3);
  }

  async function call(path, options, retried) {
    options = options || {};
    var t = tokens();

    var res;
    try {
      res = await fetch(BASE + path, {
        method: options.method || 'GET',
        headers: Object.assign(
          { 'Content-Type': 'application/json' },
          (t && t.accessToken && !options.anon)
            ? { Authorization: 'Bearer ' + t.accessToken } : {},
          options.headers || {}
        ),
        body: options.body ? JSON.stringify(options.body) : undefined
      });
    } catch (e) {
      var why = await diagnose();

      if (why === 'error') {
        try {
          console.error('[nexas] the API answered with an error. If it is hosted ' +
            'on an instance that sleeps, it may still be waking up.');
        } catch (e2) {}
        throw ApiError('Novi is having trouble right now. Nothing was charged, ' +
          'give it a moment and try again.', 'server');
      }

      if (why === 'blocked') {
        try {
          console.error('[nexas] the API answered but the browser would not let us ' +
            'read it. Two causes look identical here: (1) ' + location.origin +
            ' is not in CORS_ORIGINS on the API, or (2) the API returned an error ' +
            'page, a 5xx carries no CORS headers, so a sleeping or crashed ' +
            'instance looks exactly like a blocked origin. Check the service is ' +
            'up first, then the allow-list.');
        } catch (e3) {}
        throw ApiError('Novi could not be reached just now. Nothing was charged, ' +
          'give it a moment and try again.', 'unreachable');
      }

      if (why === 'ok') {
        /* /health is fine, so this one request failed on its own. */
        throw ApiError('That request did not get through. Please try again.', 'flaky');
      }

      throw ApiError('Could not reach Novi. Check your connection.', 'offline');
    }

    /* A 5xx on a read is usually an instance still waking. Retry once, but only a GET. A POST that opens a payment is never retried
       automatically: the row is written before the provider is called,
       so a blind retry is how one deposit becomes two. */
    if (res.status >= 500 && !retried && (options.method || 'GET') === 'GET') {
      await new Promise(function (r) { setTimeout(r, 1200); });
      return call(path, options, true);
    }

    var body = await res.json().catch(function () { return {}; });

    if (res.status === 401 && !options.anon && !retried) {
      if (await refresh()) return call(path, options, true);
      setTokens(null);
    }

    if (!res.ok || body.ok === false) {
      var err = body.error || {};
      throw ApiError(err.message || 'That did not work', err.code, err.fields);
    }
    return body;
  }

  window.NexNet = {
    live: LIVE,
    base: BASE,
    tokens: tokens,
    setTokens: setTokens,
    warm: warm,
    diagnose: diagnose,
    signedIn: function () { return !!(tokens() || {}).accessToken; },

    /* ---------- auth ---------- */
    signup: async function (payload) {
      var out = await call('/auth/signup', { method: 'POST', body: payload, anon: true });
      if (out.session) setTokens(out.session);
      return out;
    },

    login: async function (email, password) {
      var out = await call('/auth/login', {
        method: 'POST', body: { email: email, password: password }, anon: true
      });
      setTokens(out.session);
      return out.user;
    },

    googleUrl: async function () {
      var out = await call('/auth/google', { anon: true });
      return out.url;
    },

    forgotPassword: function (email) {
      return call('/auth/forgot-password', { method: 'POST', body: { email: email }, anon: true });
    },

    resetPassword: function (accessToken, password) {
      return call('/auth/reset-password', {
        method: 'POST', body: { accessToken: accessToken, password: password }, anon: true
      });
    },

    changePassword: function (currentPassword, password) {
      return call('/auth/change-password', {
        method: 'POST', body: { currentPassword: currentPassword, password: password }
      });
    },

    session: function () { return call('/auth/session'); },

    logout: async function () {
      try { await call('/auth/logout', { method: 'POST' }); } catch (e) {}
      setTokens(null);
    },

    /* ---------- money ---------- */
    config: function () { return call('/config', { anon: true }); },

    /* The server's limits and the deposit wallet, fetched once and kept,
       because the deposit sheet renders synchronously and cannot wait
       for a request. Anything that needs it asks for the cached copy and
       gets null until the first answer lands. */
    settings: function () { return serverSettings; },
    loadSettings: function () {
      if (settingsAsked) return Promise.resolve(serverSettings);
      settingsAsked = true;
      return call('/config', { anon: true }).then(function (out) {
        serverSettings = out || null;
        return serverSettings;
      }).catch(function () { return null; });
    },

    depositMpesa: async function (amountMinor, phone) {
      /* Wait for a sleeping instance rather than reporting its cold
         start as a failed deposit. */
      await ensureAwake();
      return call('/deposits/mpesa', {
        method: 'POST', body: { amountMinor: amountMinor, phone: phone }
      });
    },

    /* USDT has no callback: this reports a transfer that has already
       been made, and a person credits it. See deposits.routes.js. */
    depositUsdt: async function (amountMinor, txHash) {
      await ensureAwake();
      return call('/deposits/usdt', {
        method: 'POST', body: { amountMinor: amountMinor, txHash: txHash }
      });
    },

    depositCard: async function (amountMinor) {
      await ensureAwake();
      return call('/deposits/card', { method: 'POST', body: { amountMinor: amountMinor } });
    },

    deposit: function (reference) {
      return call('/deposits/' + encodeURIComponent(reference));
    },

    /* ---------- finishing a sign-in that happened elsewhere ----------
       Google sends the customer to Supabase, Supabase sends them back
       here with a session in the URL. Nothing in this app made that
       session, so nothing in this app has it yet: adopting it is what
       turns a redirect into being signed in.

       Two shapes arrive, depending on how Supabase was asked:

         #access_token=...&refresh_token=...   the implicit flow, which
                                               is what we get today
         ?code=...                             PKCE, which needs a round
                                               trip to exchange

       Both are handled, because which one arrives is Supabase's decision
       and not ours, and the day it changes should not be the day
       sign-in stops working. */
    adoptFromUrl: async function () {
      var hash = String(location.hash || '').replace(/^#/, '');
      var frag = new URLSearchParams(hash);
      var query = new URLSearchParams(location.search || '');

      /* Supabase sends the reason under any of three names depending on
         where it failed, and error_code alone is what comes back when
         its own callback breaks rather than the provider refusing.
         Reading only two of the three is how a real failure arrives
         looking like nothing at all. */
      var failed = frag.get('error_description') || frag.get('error_code') || frag.get('error') ||
                   query.get('error_description') || query.get('error_code') || query.get('error');
      var access = frag.get('access_token');
      var refresh = frag.get('refresh_token');
      var code = query.get('code');

      if (!failed && !access && !code) return null;

      /* Clear it out of the address bar before anything else can go
         wrong. A page reload that replays an access token, or a token
         sitting in a screenshot or a shared link, are both worse than
         having to sign in again. */
      try {
        var url = new URL(location.href);
        url.hash = '';
        url.searchParams.delete('code');
        url.searchParams.delete('error');
        url.searchParams.delete('error_code');
        url.searchParams.delete('error_description');
        url.searchParams.delete('oauth');
        history.replaceState(history.state, '', url.pathname + url.search);
      } catch (e) {}

      if (failed) {
        /* The raw codes are for logs, not for people. Everything else is
           passed through rather than flattened into one vague sentence:
           an unknown reason is still a reason, and hiding it helps
           nobody sitting with support on the phone. */
        var raw = String(failed).replace(/\+/g, ' ');
        var friendly =
          raw === 'unexpected_failure'
            ? 'Google signed you in, but we could not finish creating the session. Try again, or use your email and password.'
          : raw === 'access_denied'
            ? 'That sign-in was cancelled.'
          : raw === 'server_error'
            ? 'The sign-in service had a problem. Try again in a moment.'
          : raw;
        try { console.error('[novi] sign-in failed: ' + raw); } catch (e) {}
        return { ok: false, message: friendly };
      }

      if (access) {
        setTokens({
          accessToken: access,
          refreshToken: refresh || '',
          expiresAt: Number(frag.get('expires_at')) || undefined
        });
        return { ok: true };
      }

      try {
        var out = await call('/auth/callback', {
          method: 'POST', body: { code: code }, anon: true
        });
        if (!out.session) return { ok: false, message: 'That sign-in could not be completed.' };
        setTokens(out.session);
        return { ok: true };
      } catch (err) {
        return { ok: false, message: err.message };
      }
    },

    /* ---------- verification ----------
       The document goes straight from the browser into a private
       Supabase Storage bucket, using the customer's own token, into a
       folder named after their user id. It never passes through our API,
       so a photo of somebody's electricity bill never sits in a request
       log or an error report. Our API is then told the path, checks it
       belongs to the caller, and records the submission. */
    kycStatus: async function () {
      return call('/kyc');
    },

    submitProofOfAddress: async function (file, userId) {
      var cfg = window.NEXAS_CONFIG || {};
      if (!cfg.supabaseUrl || !cfg.supabaseKey) {
        throw ApiError('Uploads are not configured on this site.', 'no_storage');
      }

      var t = tokens();
      if (!t || !t.accessToken) throw ApiError('Sign in again to upload.', 'unauthorized');

      /* The name is ours, not the file's. A customer's filename can
         contain anything, including a path, and the folder is what the
         storage policy checks. */
      var dot = (file.name || '').lastIndexOf('.');
      var ext = dot > -1 ? file.name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : 'jpg';
      var path = userId + '/proof-of-address-' + Date.now() + '.' + (ext || 'jpg');

      var res;
      try {
        res = await fetch(cfg.supabaseUrl + '/storage/v1/object/kyc/' + path, {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + t.accessToken,
            apikey: cfg.supabaseKey,
            'Content-Type': file.type || 'application/octet-stream',
            'x-upsert': 'false'
          },
          body: file
        });
      } catch (e) {
        throw ApiError('Could not upload the document. Check your connection.', 'offline');
      }

      if (!res.ok) {
        var detail = await res.json().catch(function () { return {}; });
        throw ApiError(detail.message || 'That file could not be uploaded.', 'upload_failed');
      }

      return call('/kyc', {
        method: 'POST',
        body: { path: path, mimeType: file.type || undefined, byteSize: file.size || undefined }
      });
    },

    /* ---------- support tickets ----------
       One question, one answer. There is no polling here: a reply lands
       when the page is next opened, which is the honest shape of a
       promise to come back within half an hour. */
    tickets: async function () {
      var out = await call('/tickets');
      return out.tickets || [];
    },

    openTicket: async function (category, body) {
      var out = await call('/tickets', { method: 'POST', body: { category: category, body: body } });
      return out.ticket;
    },

    /* ---------- trade history ----------
       The server keeps the record so it survives this browser. It does
       not decide it: contracts still settle client side, so these are
       sent up rather than fetched down as truth. Worth being honest
       about, see sql/007_trades.sql. */
    history: async function (params) {
      var q = [];
      if (params && params.account) q.push('account=' + encodeURIComponent(params.account));
      if (params && params.before) q.push('before=' + encodeURIComponent(params.before));
      q.push('limit=' + ((params && params.limit) || 50));
      var out = await call('/trades?' + q.join('&'));
      return { trades: out.trades || [], nextBefore: out.nextBefore || null };
    },

    recordTrades: async function (trades) {
      if (!trades || !trades.length) return { recorded: 0 };
      /* The server caps a batch at 200; send in chunks so a long
         backlog after an offline spell still goes up. */
      var done = 0, balanceMinor = null, refused = [];
      for (var i = 0; i < trades.length; i += 100) {
        var out = await call('/trades', {
          method: 'POST', body: { trades: trades.slice(i, i + 100) }
        });
        done += out.recorded || 0;
        /* The balance after the last chunk the server applied, which is
           the one the caller should believe. */
        if (out.balanceMinor != null) balanceMinor = out.balanceMinor;
        if (out.refused) refused = refused.concat(out.refused);
      }
      return { recorded: done, balanceMinor: balanceMinor, refused: refused };
    },

    deposits: async function () {
      var out = await call('/deposits');
      return out.payments || [];
    },

    /* Asking about a pending deposit makes the server re-check it with
       the provider, so this settles anything that was paid while nobody
       was watching, a callback that never arrived, a tab closed on the
       waiting screen, a phone that died after the PIN. Run on load, so a
       deposit cannot stay unpaid-looking just because the person who
       made it walked away.

       Quiet by design: it is a background tidy-up, not something to
       report. The balance refresh that follows is what they see. */
    settlePending: async function () {
      var settled = 0;
      try {
        var list = await this.deposits();
        var pending = list.filter(function (p) { return p.status === 'pending'; }).slice(0, 5);
        for (var i = 0; i < pending.length; i++) {
          try {
            var out = await this.deposit(pending[i].reference);
            if (out.payment && out.payment.status === 'success') settled++;
          } catch (e) { /* next one */ }
        }
      } catch (e) { /* not signed in, or the API is down: nothing to do */ }
      return settled;
    },

    /* Sits on the waiting screen until the provider answers. Polling is
       what rescues a deposit whose callback was lost, so it keeps going
       for a couple of minutes rather than giving up at the first
       still-pending reply. */
    waitForDeposit: async function (reference, onTick) {
      var deadline = Date.now() + 150000;
      while (Date.now() < deadline) {
        await new Promise(function (r) { setTimeout(r, 3000); });
        var out;
        try { out = await this.deposit(reference); } catch (e) { continue; }
        if (onTick) onTick(out.payment);
        if (out.payment.status !== 'pending') return out.payment;
      }
      return { status: 'pending', reference: reference };
    },

    withdraw: function (payload) {
      return call('/withdrawals', { method: 'POST', body: payload });
    },

    withdrawals: function () { return call('/withdrawals'); }
  };
})();
