const CACHE = "movieverse-v1";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const isImage = req.destination === "image";
  const isShell = url.origin === self.location.origin && (req.mode === "navigate" || /\.(js|css|woff2?)$/.test(url.pathname));
  if (!isImage && !isShell) return;
  e.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      if (isImage) {
        const hit = await cache.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res.ok || res.type === "opaque") cache.put(req, res.clone());
          return res;
        } catch {
          return Response.error();
        }
      }
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch {
        return (await cache.match(req)) || (await cache.match("/")) || Response.error();
      }
    })(),
  );
});
