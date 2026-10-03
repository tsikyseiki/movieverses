import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Liste blanche stricte : seuls ces chemins exacts peuvent être demandés à TMDB
const PATHS = [
  /^\/discover\/(movie|tv)$/,
  /^\/search\/(movie|tv|person|multi)$/,
  /^\/trending\/(all|movie|tv)\/(day|week)$/,
  /^\/(movie|tv)\/\d{1,9}$/,
  /^\/(movie|tv)\/\d{1,9}\/(credits|videos|similar|recommendations|watch\/providers)$/,
  /^\/person\/\d{1,9}$/,
  /^\/person\/\d{1,9}\/(movie|tv|combined)_credits$/,
  /^\/collection\/\d{1,9}$/,
  /^\/genre\/(movie|tv)\/list$/,
];
const Params = z
  .record(z.string().max(160))
  .refine((p) => Object.keys(p).length <= 24 && Object.keys(p).every((k) => /^[A-Za-z0-9_.]{1,40}$/.test(k) && k !== "api_key"), "bad_params");

// Garde-fou : plafond d'appels vers TMDB par minute (protège le quota de la clé en cas d'abus)
let budgetReset = 0;
let budgetUsed = 0;

// Cache mémoire côté serveur : les résultats populaires reviennent instantanément
const CACHE = new Map<string, { at: number; body: string }>();
const TTL = 10 * 60_000;

export const tmdbFetch = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ path: z.string().max(120), params: Params.default({}) }).parse(d))
  .handler(async ({ data }) => {
    const key = process.env["TMDB_API_KEY"];
    if (!key) return { error: "missing_key" as const, data: null };
    if (!PATHS.some((r) => r.test(data.path))) return { error: "bad_path" as const, data: null };
    const cacheKey = `${data.path}?${JSON.stringify(Object.entries(data.params).sort())}`;
    const hit = CACHE.get(cacheKey);
    if (hit && Date.now() - hit.at < TTL) return { error: null, data: hit.body };
    const url = new URL(`https://api.themoviedb.org/3${data.path}`);
    for (const [k, v] of Object.entries(data.params)) url.searchParams.set(k, v);
    const headers: Record<string, string> = { accept: "application/json" };
    // Supports both a v3 API key and a v4 read access token
    if (key.length > 40) headers['authorization'] = `Bearer ${key}`;
    else url.searchParams.set("api_key", key);
    const now = Date.now();
    if (now > budgetReset) { budgetReset = now + 60_000; budgetUsed = 0; }
    if (++budgetUsed > 900) return { error: "busy" as const, data: null };
    let res: Response;
    try {
      res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
    } catch {
      return { error: "network" as const, data: null };
    }
    if (!res.ok) return { error: `http_${res.status}` as const, data: null };
    const json = (await res.json()) as unknown;
    const body = JSON.stringify(json);
    if (CACHE.size > 400) CACHE.delete(CACHE.keys().next().value as string);
    CACHE.set(cacheKey, { at: Date.now(), body });
    return { error: null, data: body };
  });
