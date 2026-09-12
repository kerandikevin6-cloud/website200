/* Nexas — offline shell. Cache-first for the app files, network for data. */
var CACHE = 'nexas-v1';
var SHELL = [
  'index.html', 'markets.html', 'positions.html', 'responsible.html', 'account.html',
  'chat.html', 'login.html', 'signup.html', 'forgot-password.html', 'reset-password.html',
  'assets/css/app.css',
  'assets/js/format.js', 'assets/js/api.js', 'assets/js/chart.js',
  'assets/js/modals.js', 'assets/js/trade.js', 'assets/js/positions.js', 'assets/js/app.js',
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
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      return hit || fetch(e.request).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        return res;
      }).catch(function () { return caches.match('index.html'); });
    })
  );
});
