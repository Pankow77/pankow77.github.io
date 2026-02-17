// ================================================================
// ORACLE VR — Service Worker
// ================================================================
// Cache-first strategy for CDN assets (Three.js).
// After first load, ORACLE VR works fully offline.
// No CDN dependency. No Wi-Fi prayer.
// ================================================================

const CACHE_NAME = 'oracle-vr-v1';

const PRECACHE_URLS = [
    'oracle-vr.html',
    'js/oracle-engine.js',
    'js/oracle-simulator.js',
    'https://unpkg.com/three@0.160.0/build/three.module.js',
    'https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js',
    'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;

            return fetch(event.request).then(response => {
                // Cache CDN responses for offline resilience
                if (response.ok && event.request.url.includes('unpkg.com')) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            });
        })
    );
});
