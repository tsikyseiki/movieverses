import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---- Appel Gemini (partagé par les deux fonctions ci-dessous) ----
type GeminiPart = { text?: string; inlineData?: { mimeType: string; data: string } };
async function gemini(opts: { system?: string; parts: GeminiPart[]; search?: boolean; json?: boolean; maxTokens?: number }) {
  const key = process.env["GEMINI_API_KEY"];
  if (!key) return { error: "missing_key" as const };
  const model = process.env["GEMINI_MODEL"] || "gemini-3.5-flash";
  const call = (search: boolean) =>
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        ...(opts.system ? { systemInstruction: { parts: [{ text: opts.system }] } } : {}),
        contents: [{ role: "user", parts: opts.parts }],
        ...(search ? { tools: [{ google_search: {} }] } : {}),
        generationConfig: { temperature: opts.json ? 0.1 : 0.4, maxOutputTokens: opts.maxTokens ?? 3000, ...(opts.json ? { responseMimeType: "application/json" } : {}) },
      }),
      signal: AbortSignal.timeout(30_000),
    });
  let res: Response;
  try {
    res = await call(!!opts.search);
    // Quota gratuit de la recherche Google épuisé : on répond quand même, sans recherche
    if (res.status === 429 && opts.search) res = await call(false);
  } catch {
    return { error: "upstream" as const };
  }
  if (!res.ok) return { error: (res.status === 429 ? "quota" : "upstream") as "quota" | "upstream" };
  const j = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] }; groundingMetadata?: { groundingChunks?: { web?: { uri?: string; title?: string } }[] } }[];
  };
  const c = j.candidates?.[0];
  const text = (c?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
  if (!text) return { error: "empty" as const };
  const seen = new Set<string>();
  const sources = (c?.groundingMetadata?.groundingChunks ?? [])
    .map((x) => x.web)
    .filter((w): w is { uri: string; title?: string } => !!w?.uri && /^https:\/\//.test(w.uri))
    .filter((w) => !seen.has(w.uri) && seen.add(w.uri))
    .slice(0, 4)
    .map((w) => ({ title: w.title ?? "Source", url: w.uri }));
  return { text, sources };
}

const HITS = new Map<string, number[]>();
function limited(uid: string, max: number) {
  const now = Date.now();
  const r = (HITS.get(uid) ?? []).filter((t) => now - t < 10 * 60_000);
  if (r.length >= max) return true;
  r.push(now);
  HITS.set(uid, r);
  if (HITS.size > 2000) HITS.delete(HITS.keys().next().value as string);
  return false;
}

// ---- 1) Résumé neutre des critiques ----
const CACHE = new Map<string, { at: number; text: string; sources: { title: string; url: string }[] }>();
const KIND = { film: "film", manga: "animé japonais", occidental: "série d'animation occidentale" } as const;

export const summarizeReviews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ title: z.string().min(1).max(150), kind: z.enum(["film", "manga", "occidental"]), year: z.string().max(10).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const ck = `${data.kind}|${data.title}|${data.year ?? ""}`;
    const hit = CACHE.get(ck);
    if (hit && Date.now() - hit.at < 24 * 3600_000) return { ok: true as const, text: hit.text, sources: hit.sources };
    if (limited(context.userId, 15)) return { ok: false as const, error: "rate_limited" as const };
    const r = await gemini({
      search: true,
      maxTokens: 2000,
      system: "Tu rédiges des synthèses de critiques, neutres, factuelles et sans spoiler, en français. N'invente aucun chiffre ni citation.",
      parts: [{ text: `Résume en UN SEUL paragraphe (90 à 120 mots) l'accueil critique de « ${data.title} » (${KIND[data.kind]}${data.year ? `, ${data.year}` : ""}) à partir de la presse et des sites de notes (Rotten Tomatoes, IMDb, Metacritic, MyAnimeList, Allociné…). Mentionne les points forts et les reproches qui reviennent le plus, et les notes ou scores trouvés en précisant leur source. Si les informations sont rares ou contradictoires, dis-le.` }],
    });
    if ("error" in r) return { ok: false as const, error: r.error };
    CACHE.set(ck, { at: Date.now(), text: r.text, sources: r.sources });
    if (CACHE.size > 300) CACHE.delete(CACHE.keys().next().value as string);
    return { ok: true as const, text: r.text, sources: r.sources };
  });

// ---- 2) Reconnaissance d'affiche par photo ----
export const recognizePoster = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ image: z.string().min(100).max(2_500_000), mime: z.enum(["image/jpeg", "image/png", "image/webp"]) }).parse(d))
  .handler(async ({ data, context }) => {
    if (limited(context.userId, 10)) return { ok: false as const, error: "rate_limited" as const };
    const r = await gemini({
      json: true,
      maxTokens: 400,
      system: "Tu identifies des films, séries et animés à partir de leur affiche. Réponds uniquement en JSON. N'invente pas : si tu n'es pas sûr, mets title à null.",
      parts: [
        { inlineData: { mimeType: data.mime, data: data.image } },
        { text: 'Identifie l\'œuvre sur cette affiche. Réponds avec ce JSON exact : {"title": string|null, "original_title": string|null, "year": number|null, "confidence": "haute"|"moyenne"|"faible"}' },
      ],
    });
    if ("error" in r) return { ok: false as const, error: r.error };
    try {
      const p = JSON.parse(r.text.replace(/^```json|```$/g, "").trim()) as { title?: string | null; original_title?: string | null; year?: number | null; confidence?: string };
      return { ok: true as const, title: p.title ?? null, original: p.original_title ?? null, year: p.year ?? null, confidence: p.confidence ?? "faible" };
    } catch {
      return { ok: false as const, error: "empty" as const };
    }
  });
