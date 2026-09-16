/* Novi, offline shell.
   Network-first for our own files, cache as the offline fallback.

   This used to be cache-first, which meant a stylesheet cached once was
   served forever and a fix to app.css never reached the page. Network-first
   costs nothing on a fast connection, still works fully offline, and can
   never pin the UI to a stale build. */
var CACHE = 'nexas-v15';
var SHELL = [
  'landing.html', 'index.html', 'ai.html', 'markets.html', 'positions.html', 'learn.html', 'responsible.html', 'account.html',
  'chat.html', 'history.html', 'copy.html', 'terms.html', 'privacy.html', 'risk.html',
  'security.html', 'complaints.html', 'login.html', 'signup.html', 'forgot-password.html', 'reset-password.html',
  'assets/css/app.css',
  'assets/js/config.js', 'assets/js/countries.js', 'assets/js/net.js', 'assets/js/format.js', 'assets/js/api.js', 'assets/js/chart.js',
  'assets/js/modals.js', 'assets/js/trade.js', 'assets/js/positions.js',
  'assets/js/ai.js', 'assets/js/app.js',
  'assets/mpesa.png', 'assets/cards.png', 'assets/cards-ink.png',
  'assets/support-mark.png', 'assets/share-card.png',
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
