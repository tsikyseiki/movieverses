// Récupération des adresses des pages d'un chapitre (MangaDex@Home), partagée par la fonction serveur et la route de secours.
const UA = { "User-Agent": "MovieVerse/1.0", accept: "application/json" };

export type AtHome = { base: string; hash: string; data: string[]; saver: string[] };
const CACHE = new Map<string, { exp: number; v: AtHome }>();

/**
 * forcePort443=true : MangaDex choisit un serveur sur le port HTTPS standard.
 * Beaucoup de réseaux (4G, Wi-Fi public…) bloquent les ports inhabituels, d'où les pages cassées.
 * L'adresse reçue n'est garantie que 15 min : on la garde 5 min côté serveur.
 */
export async function atHome(id: string, fresh = false): Promise<AtHome> {
  const hit = CACHE.get(id);
  if (!fresh && hit && hit.exp > Date.now()) return hit.v;
  const res = await fetch(`https://api.mangadex.org/at-home/server/${id}?forcePort443=true`, { headers: UA });
  if (!res.ok) throw new Error(`MangaDex ${res.status}`);
  const r = (await res.json()) as { baseUrl: string; chapter: { hash: string; data?: string[]; dataSaver?: string[] } };
  const v: AtHome = { base: r.baseUrl, hash: r.chapter.hash, data: r.chapter.data ?? [], saver: r.chapter.dataSaver ?? [] };
  CACHE.set(id, { exp: Date.now() + 5 * 60_000, v });
  if (CACHE.size > 100) CACHE.clear();
  return v;
}

export type Quality = "data" | "saver";

export function pageUrl(v: AtHome, q: Quality, i: number): string | null {
  const file = (q === "data" ? v.data : v.saver)[i];
  return file ? `${v.base}/${q === "data" ? "data" : "data-saver"}/${v.hash}/${file}` : null;
}
