import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ALLOWED = /^\/(discover|trending|search|movie|tv|genre)\//;

export const tmdbFetch = createServerFn({ method: "GET" })
  .inputValidator((d) =>
    z.object({ path: z.string().max(200), params: z.record(z.string()).default({}) }).parse(d),
  )
  .handler(async ({ data }) => {
    const key = process.env["TMDB_API_KEY"];
    if (!key) return { error: "missing_key" as const, data: null };
    if (!ALLOWED.test(data.path)) return { error: "bad_path" as const, data: null };
    const url = new URL(`https://api.themoviedb.org/3${data.path}`);
    for (const [k, v] of Object.entries(data.params)) url.searchParams.set(k, v);
    const headers: Record<string, string> = { accept: "application/json" };
    // Supports both a v3 API key and a v4 read access token
    if (key.length > 40) headers['authorization'] = `Bearer ${key}`;
    else url.searchParams.set("api_key", key);
    const res = await fetch(url, { headers });
    if (!res.ok) return { error: `http_${res.status}` as const, data: null };
    const json = (await res.json()) as unknown;
    return { error: null, data: JSON.stringify(json) };
  });
