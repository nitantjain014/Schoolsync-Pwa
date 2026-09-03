const CACHE_VERSION = 'v9';
const CACHE_NAME = `schoolsync-${CACHE_VERSION}`;

const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
    '/backdrops/bg2_for_Dark.jpg',
    '/backdrops/BG5_for_light.jpg',
    '/backdrops/BG4_for_light.jpg',
    '/backdrops/BG3_for_light.jpg',
    '/backdrops/BG2_for_light.png',
    '/backdrops/BG1_for_light.jpg',
    '/backdrops/Bg1_for_Dark.png'
];

// Files that should ALWAYS be fetched fresh from network first,
// so future updates show up without needing a manual cache clear.
const NETWORK_FIRST_EXTENSIONS = ['.html', '.css', '.js'];

function isNetworkFirst(url) {
    return NETWORK_FIRST_EXTENSIONS.some(ext => url.endsWith(ext)) || url.endsWith('/');
}

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(urlsToCache).catch(err => {
                console.log('Cache addAll error:', err);
            });
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    const url = event.request.url;

    if (isNetworkFirst(url)) {
        // Network-first: always try to get the latest file,
        // fall back to cache only if offline.
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    if (response && response.status === 200) {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return response;
                })
                .catch(() => caches.match(event.request).then(r => r || caches.match('/index.html')))
        );
        return;
    }

    // Cache-first for static assets (icons, manifest, images)
    event.respondWith(
        caches.match(event.request).then((response) => {
            if (response) {
                return response;
            }

            return fetch(event.request).then((response) => {
                if (!response || response.status !== 200 || response.type === 'error') {
                    return response;
                }

                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });

                return response;
            }).catch(() => {
                return caches.match('/index.html');
            });
        })
    );
});
