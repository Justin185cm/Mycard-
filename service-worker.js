self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open('membercard-cache').then(function(cache) {
      return cache.addAll([
        '/',
        '/index.html',
        '/style.css',
        '/app.js',
        '/manifest.json',
        '/lib/sql-wasm.js',
        '/lib/JsBarcode.all.min.js',
        '/lib/qrcode.min.js',
        '/icons/icon-192.png',
        '/icons/icon-512.png'
      ]);
    })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request);
    })
  );
});
