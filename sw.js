const CACHE_NAME = 'mcdee-md-v1';
const ASSETS = [
    './',
    './index.html',
    './src/app.js',
    './src/styles.css',
    './assets/icons/icon-512.svg',
    './manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
