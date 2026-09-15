/* Nexas — offline shell.
   Network-first for our own files, cache as the offline fallback.

   This used to be cache-first, which meant a stylesheet cached once was
   served forever and a fix to app.css never reached the page. Network-first
   costs nothing on a fast connection, still works fully offline, and can
   never pin the UI to a stale build. */
var CACHE = 'nexas-v3';
var SHELL = [
  'index.html', 'ai.html', 'markets.html', 'positions.html', 'responsible.html', 'account.html',
  'chat.html', 'login.html', 'signup.html', 'forgot-password.html', 'reset-password.html',
  'assets/css/app.css',
  'assets/js/format.js', 'assets/js/api.js', 'assets/js/chart.js',
  'assets/js/modals.js', 'assets/js/trade.js', 'assets/js/positions.js',
  'assets/js/ai.js', 'assets/js/app.js',
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
      return caches.match(e.request).then(function (hit) {
        return hit || caches.match('index.html');
      });
    })
  );
});
