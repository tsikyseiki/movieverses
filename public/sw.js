const CACHE_PREFIX = "movieverse-offline-";
const CACHE = `${CACHE_PREFIX}v3`;
const OFFLINE_URL = "/offline.html";
const PRECACHE = ["/", OFFLINE_URL, "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(PRECACHE.map((url) => new Request(url, { cache: "reload" })).map((req) => req.url).map((url) => new Request(url)).filter(Boolean).map((req) => req.url).map((url) => url));
    await self.skipWaiting();
  })().catch(async () => { await self.skipWaiting(); }));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

function isPrivatePath(pathname) {
  return pathname.startsWith("/api/") || pathname.startsWith("/~oauth") || pathname.startsWith("/auth") || pathname.startsWith("/_authenticated") || pathname.startsWith("/admin");
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  if (sameOrigin && isPrivatePath(url.pathname)) return;

  const isTmdbImage = url.hostname === "image.tmdb.org";
  const isLocalImage = sameOrigin && request.destination === "image";
  const isAsset = sameOrigin && ["script", "style", "font"].includes(request.destination);
  const isNavigation = sameOrigin && request.mode === "navigate";
  const isPublicData = sameOrigin && request.headers.get("accept")?.includes("application/json") && !isPrivatePath(url.pathname);
  if (!isTmdbImage && !isLocalImage && !isAsset && !isNavigation && !isPublicData) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request);
    if (isNavigation) {
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      } catch {
        return cached || await cache.match(OFFLINE_URL) || await cache.match("/") || Response.error();
      }
    }
    if (cached) {
      event.waitUntil(fetch(request).then((response) => {
        if (response.ok || response.type === "opaque") return cache.put(request, response.clone());
      }).catch(() => {}));
      return cached;
    }
    try {
      const response = await fetch(request);
      if (response.ok || response.type === "opaque") await cache.put(request, response.clone());
      return response;
    } catch {
      return Response.error();
    }
  })());
});
