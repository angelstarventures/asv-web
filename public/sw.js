// Minimal service worker: no caching, all requests pass straight through to the
// network. Its only job is to satisfy PWA installability criteria (Chrome requires
// a registered service worker with a fetch handler) without risking stale financial
// data being served from a cache.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {});
