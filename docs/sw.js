const CACHE_NAME = 'player-test-store'

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll([
            '/',
            '/index.html',
            '/index.js',
            '/index.css',
        ])),
    );
});

const workerOrigin = self.location.origin;
console.log("Service Worker Origin:", workerOrigin);

function isSameOrigin(urlString) {
  const urlOrigin = (new URL(urlString)).origin;
  return urlOrigin === self.location.origin;
}

self.addEventListener('fetch', e => {
    console.log(e.request.url);
    if (e.request.method !== "GET") return;
    if (!isSameOrigin(e.request.url)) return;

    if (navigator.onLine) {
        e.respondWith(
            fetch(e.request).then(resp =>
                caches.open(CACHE_NAME).then(cache => {
                    // Put in cache if succeeds
                    cache.put(e.request, resp.clone());
                    return resp;
                })
            ).catch(err =>
                caches.match(e.request).then(resp => resp || err)
            )
        );
    } else {
        e.respondWith(caches.match(e.request))
    }
});
