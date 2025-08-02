const CACHE_NAME = "mentymate-v1";
const urlsToCache = [
  "/MentyMate-Prototype/",
  "/MentyMate-Prototype/index.html",
  "/MentyMate-Prototype/manifest.json",
  "/MentyMate-Prototype/assets/styles.css",
  "/MentyMate-Prototype/assets/scripts.js",
  "/MentyMate-Prototype/assets/icon.png",
  "/MentyMate-Prototype/assets/icons/icon-192.png",
  "/MentyMate-Prototype/assets/icons/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
