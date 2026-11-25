/**
 * sw.js - Service Worker SisaUang PWA
 * Mengelola caching offline dengan strategi Cache-First dan fallback Network.
 */

const CACHE_NAME = "sisauang-pwa-v2";

const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/config.js",
  "./js/currency.js",
  "./js/storage.js",
  "./js/app.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// Event Install: Cache semua aset lokal penting & aktifkan segera
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Event Activate: Bersihkan cache lama jika ada pembaruan versi
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Event Fetch: Strategi Cache-First dengan Network Fallback
self.addEventListener("fetch", event => {
  // Hanya tangani request GET (abaikan non-GET)
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // 1. Jika aset ada di cache, gunakan langsung (cepat & 100% offline)
      if (cachedResponse) {
        return cachedResponse;
      }

      // 2. Jika tidak ada di cache, ambil dari network
      return fetch(event.request).then(networkResponse => {
        // Simpan salinan ke cache jika respons valid dan berasal dari origin yang sama
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          event.request.url.startsWith(self.location.origin)
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback saat offline jika halaman utama diminta
        if (event.request.headers.get("accept")?.includes("text/html")) {
          return caches.match("./index.html");
        }
      });
    })
  );
});
