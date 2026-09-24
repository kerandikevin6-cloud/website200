/* Novi, offline shell.
   Network-first for our own files, cache as the offline fallback.

   This used to be cache-first, which meant a stylesheet cached once was
   served forever and a fix to app.css never reached the page. Network-first
   costs nothing on a fast connection, still works fully offline, and can
   never pin the UI to a stale build. */
/* ---- the version on the asset urls ----
   The scripts and the stylesheet are asked for as app.js?v=<date>, and
   the pages ask for them the same way. That query is the only thing
   that can reach a browser which already holds these files: they went
   out for months under max-age of a year and "immutable", which is a
   promise that the browser will not so much as ask again. Changing the
   header fixes the next visitor; changing the url is what frees the
   ones already carrying a copy.

   It does not need bumping every deploy. The header says revalidate
   now, so from here on a changed file is picked up by asking. This is
   the one-time way out of the year that was already promised. */
var CACHE = 'nexas-v29';
var SHELL = [
  'landing.html', 'index.html', 'ai.html', 'markets.html', 'positions.html', 'learn.html', 'responsible.html', 'account.html',
  'chat.html', 'history.html', 'copy.html', 'terms.html', 'privacy.html', 'risk.html',
  'security.html', 'complaints.html', 'login.html', 'signup.html', 'forgot-password.html', 'reset-password.html',
  'assets/css/app.css?v=20260921',
  'assets/js/config.js?v=20260921', 'assets/js/countries.js?v=20260921', 'assets/js/net.js?v=20260921', 'assets/js/format.js?v=20260921', 'assets/js/api.js?v=20260921', 'assets/js/chart.js?v=20260921',
  'assets/js/modals.js?v=20260921', 'assets/js/trade.js?v=20260921', 'assets/js/positions.js?v=20260921',
  'assets/js/ai.js?v=20260921', 'assets/js/tour.js?v=20260923', 'assets/js/app.js?v=20260921',
  'assets/mpesa.png', 'assets/cards.png', 'assets/cards-ink.png',
  'assets/share-card.png',
  'assets/favicon.ico', 'assets/favicon-32.png', 'assets/favicon-192.png',
  'assets/favicon-512.png', 'assets/apple-touch-icon.png',
  'manifest.webmanifest'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () {
    return self.skipWaiting();
  }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).origin !== self.location.origin) return;

  e.respondWith(
    fetch(e.request).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      return res;
    }).catch(function () {
      /* Offline. The cache holds real file names, but links are clean
         now, so a request for /positions has to find positions.html.
         Try the exact request, then the .html behind it, then the
         terminal as a last resort. */
      return caches.match(e.request).then(function (hit) {
        if (hit) return hit;
        var path = new URL(e.request.url).pathname.replace(/^\//, '');
        if (!path) path = 'index.html';
        else if (!/\.[a-z0-9]+$/i.test(path)) path += '.html';
        return caches.match(path).then(function (alt) {
          return alt || caches.match('index.html');
        });
      });
    })
  );
});
