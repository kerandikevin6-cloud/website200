/* ============================================================
   Nexas — network layer

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

  async function refresh() {
    var t = tokens();
    if (!t || !t.refreshToken) return false;

    /* One refresh at a time. Three requests expiring together must not
       each spend the refresh token — only the first would succeed. */
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

  /* Is the server there at all? An opaque response counts as yes: we
     cannot read it, and do not need to — only whether it arrived. */
  async function probe() {
    if (!BASE) return false;
    try {
      await fetch(BASE + '/health', { mode: 'no-cors', cache: 'no-store' });
      return true;
    } catch (e) {
      return false;
    }
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
      /* fetch() throws the same way for a dead network and for a request
         the browser refused to send because this origin is not on the
         API's allow-list — the CORS reason never reaches JavaScript. So
         ask again with mode:'no-cors': that request is not origin-checked,
         so if it resolves the server is up and the problem is the
         allow-list, which is a different thing to tell somebody. */
      var reachable = await probe();
      if (reachable) {
        try {
          console.error('[nexas] the API is up but refused this origin: ' +
            location.origin + ' — add it to CORS_ORIGINS on the API.');
        } catch (e2) {}
        throw ApiError('This site is not cleared to reach the Nexas API. ' +
          'If you are testing a preview link, use the main address.', 'origin');
      }
      throw ApiError('Could not reach Nexas. Check your connection.', 'offline');
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

    depositMpesa: function (amountMinor, phone) {
      return call('/deposits/mpesa', {
        method: 'POST', body: { amountMinor: amountMinor, phone: phone }
      });
    },

    depositCard: function (amountMinor) {
      return call('/deposits/card', { method: 'POST', body: { amountMinor: amountMinor } });
    },

    deposit: function (reference) {
      return call('/deposits/' + encodeURIComponent(reference));
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
