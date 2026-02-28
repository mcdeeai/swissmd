const CACHE_NAME = 'mcdee-md-v4';
const ASSETS = [
    './',
    './index.html',
    './src/app.js',
    './src/styles.css',
    './assets/icons/icon-192.png',
    './assets/icons/icon-512.png',
    './assets/icons/icon-512.svg',
    './assets/icons/apple-touch-icon.png',
    './assets/logo-wordmark.svg',
    './manifest.json'
];

// Install: cache all assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
    self.skipWaiting(); // Activate immediately, don't wait for old tabs to close
});

// Activate: purge old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim(); // Take control of all pages immediately
});

// Fetch: network-first (fast updates), fallback to cache (offline support)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});
