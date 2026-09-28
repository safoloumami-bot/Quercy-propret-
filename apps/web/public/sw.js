/* global self, caches, fetch, URL */
/*
 * Service worker Quercy : consultation hors ligne des écrans et données déjà vus.
 * - Pages, données (tRPC en GET) et navigations : réseau d'abord, copie locale si hors ligne.
 * - Fichiers statiques versionnés (/_next/static) : copie locale d'abord.
 * Les écritures (POST) ne sont jamais mises en cache ; les caches sont vidés à la déconnexion.
 */
const PAGES = "quercy-pages-v1";
const STATIC = "quercy-static-v1";
const MAX_PAGES = 300;
const SKIP = [
  "/api/auth",
  "/api/realtime",
  "/api/ai",
  "/api/health",
  "/api/dev",
  "/api/v1",
  "/api/stripe",
];

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => ![PAGES, STATIC].includes(k)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

async function trim() {
  const cache = await caches.open(PAGES);
  const keys = await cache.keys();
  for (const request of keys.slice(0, Math.max(0, keys.length - MAX_PAGES)))
    await cache.delete(request);
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      const cache = await caches.open(PAGES);
      await cache.put(request, response.clone());
      void trim();
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw error;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(STATIC)).put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (SKIP.some((p) => url.pathname.startsWith(p))) return;
  if (request.headers.get("accept")?.includes("text/event-stream")) return;
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/brand/")) {
    event.respondWith(cacheFirst(request));
    return;
  }
  event.respondWith(networkFirst(request));
});

self.addEventListener("message", (event) => {
  if (event.data === "clear") event.waitUntil(caches.delete(PAGES));
});
