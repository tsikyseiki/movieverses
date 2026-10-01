const APP_SW_PATH = "/sw.js";

const isPreviewHost = (hostname: string) =>
  hostname.startsWith("id-preview--") ||
  hostname.startsWith("preview--") ||
  hostname === "lovableproject.com" ||
  hostname.endsWith(".lovableproject.com") ||
  hostname === "lovableproject-dev.com" ||
  hostname.endsWith(".lovableproject-dev.com") ||
  hostname === "beta.lovable.dev" ||
  hostname.endsWith(".beta.lovable.dev");

async function unregisterMovieVerseWorkers() {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.filter((r) => r.active?.scriptURL.endsWith(APP_SW_PATH)).map((r) => r.unregister()));
}

export async function setupOfflineApp() {
  if (!("serviceWorker" in navigator)) return;
  const refused = !import.meta.env.PROD || window.self !== window.top || isPreviewHost(window.location.hostname) || new URLSearchParams(window.location.search).has("sw");
  if (refused) {
    await unregisterMovieVerseWorkers();
    return;
  }
  const reg = await navigator.serviceWorker.register(APP_SW_PATH).catch(() => null);
  window.addEventListener("online", () => reg?.update().catch(() => {}));
}
