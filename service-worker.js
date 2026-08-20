const CACHE_NAME = 'schoolsync-v2';
const ASSETS = [
  './', './index.html', './style.css', './script.js', './manifest.json',
  './icon-192.png', './icon-512.png',
  './backdrops/bg1.jpg', './backdrops/bg2.jpg', './backdrops/bg3.jpg', './backdrops/bg4.jpg',
  './backdrops/bg5.jpg', './backdrops/bg6.jpg', './backdrops/bg7.jpg', './backdrops/bg8.jpg'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
  self.clients.claim();
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => caches.match('./index.html')))
  );
});
