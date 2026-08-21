const CACHE_NAME = 'schoolsync-v4';
const ASSETS = [
  './', './index.html', './style.css', './script.js', './manifest.json',
  './icon-192.png', './icon-512.png',
  './bg1.jpg', './bg2.jpg', './bg3.jpg', './bg4.jpg',
  './bg5.jpg', './bg6.jpg', './bg7.jpg', './bg8.jpg'
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
