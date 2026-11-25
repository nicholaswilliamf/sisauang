/**
 * sw.js - Service Worker SisaUang PWA
 * Mengelola caching offline dengan strategi Cache-First dan fallback Network.
 */

const CACHE_NAME = "sisauang-pwa-v3";

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
            console.log("Menghapus cache Service Worker lama:", cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Event Fetch: Strategi Cache-First dengan fallback ke Network
self.addEventListener("fetch", event => {
  // Hanya proses permintaan method GET
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then(networkResponse => {
        // Simpan salinan respons jaringan valid ke cache untuk penggunaan offline berikutnya
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback jika offline dan membuka halaman utama
        if (event.request.mode === "navigate") {
          return caches.match("./index.html");
        }
      });
    })
  );
});
