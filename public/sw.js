// MovieVerse — service worker hors ligne (v4)
// Ne met en cache que l'interface, les images, les scripts/styles et les données publiques.
// Ne met JAMAIS en cache les routes privées, l'authentification, ni les vidéos / iframes externes.

const CACHE_PREFIX = "movieverse-offline-";
const CACHE = `${CACHE_PREFIX}v4`;
const OFFLINE_URL = "/offline.html";
const PRECACHE = ["/", OFFLINE_URL, "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

const PRIVATE_PREFIXES = ["/api/", "/~oauth", "/auth", "/_authenticated", "/admin", "/reset-password", "/moderation"];
const MAX_IMAGES = 300;

function isPrivatePath(pathname) {
  return PRIVATE_PREFIXES.some((p) => pathname.startsWith(p));
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Pré-cache tolérant : une ressource absente ne bloque pas l'installation.
    await Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Garde une taille raisonnable pour le cache d'images.
async function trimImages(cache) {
  const keys = await cache.keys();
  if (keys.length > MAX_IMAGES) {
    await Promise.all(keys.slice(0, keys.length - MAX_IMAGES).map((k) => cache.delete(k)));
  }
}

// Stratégie : réseau d'abord, cache en secours (pages)
async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (fallbackUrl) {
      const fb = await cache.match(fallbackUrl);
      if (fb) return fb;
    }
    return Response.error();
  }
}

// Stratégie : cache d'abord, mise à jour en arrière-plan (scripts, styles, polices, images)
async function cacheFirst(event, request, isImage) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const refresh = fetch(request).then((response) => {
    if (response.ok || response.type === "opaque") {
      cache.put(request, response.clone());
      if (isImage) trimImages(cache);
    }
    return response;
  }).catch(() => null);
  if (cached) {
    event.waitUntil(refresh);
    return cached;
  }
  const network = await refresh;
  return network || Response.error();
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  // Jamais de cache pour le privé, ni pour les vidéos / iframes / API externes (streaming, etc.)
  if (sameOrigin && isPrivatePath(url.pathname)) return;
  if (request.destination === "video" || request.destination === "audio" || request.destination === "iframe") return;

  const isNavigation = request.mode === "navigate" && sameOrigin;
  const isTmdbImage = url.hostname === "image.tmdb.org";
  const isLocalImage = sameOrigin && request.destination === "image";
  const isAsset = sameOrigin && ["script", "style", "font"].includes(request.destination);
  const isPublicData = sameOrigin && (request.headers.get("accept") || "").includes("application/json");

  if (isNavigation) {
    event.respondWith(networkFirst(request, OFFLINE_URL));
    return;
  }
  if (isTmdbImage || isLocalImage) {
    event.respondWith(cacheFirst(event, request, true));
    return;
  }
  if (isAsset) {
    event.respondWith(cacheFirst(event, request, false));
    return;
  }
  if (isPublicData) {
    event.respondWith(networkFirst(request));
  }
});
