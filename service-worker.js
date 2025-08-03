const CACHE_NAME = "mentymate-v1";
const urlsToCache = [
  "/MentyMate-Prototype/",
  "/MentyMate-Prototype/index.html",
  "/MentyMate-Prototype/blog.html",
  "/MentyMate-Prototype/checkin.html",
  "/MentyMate-Prototype/manifest.json",
  "/MentyMate-Prototype/assets/styles.css",
  "/MentyMate-Prototype/assets/scripts.js",
  "/MentyMate-Prototype/assets/checkins.js",
  "/MentyMate-Prototype/assets/icon.png"
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
