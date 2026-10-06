import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callGemini, currentThinkingMode, defaultModel, KEY_NAMES, probeGemini, type Purpose } from "@/lib/gemini-core";

// ---- Appel Gemini : noyau partagé (réflexion réduite, repli sans recherche, mesures) ----
type GeminiPart = { text?: string; inlineData?: { mimeType: string; data: string } };
async function gemini(opts: { purpose: Purpose; system?: string; parts: GeminiPart[]; search?: boolean; json?: boolean; maxTokens?: number }) {
  return callGemini({ purpose: opts.purpose, system: opts.system, contents: [{ role: "user", parts: opts.parts }], search: opts.search, json: opts.json, maxTokens: opts.maxTokens });
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
const CACHE = new Map<string, { at: number; text: string; sources: { title: string; url: string }[]; searched: boolean }>();
const KIND = { film: "film", manga: "animé japonais", occidental: "série d'animation occidentale", serie: "série télévisée" } as const;

export const summarizeReviews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ title: z.string().min(1).max(150), kind: z.enum(["film", "manga", "occidental", "serie"]), year: z.string().max(10).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const ck = `${data.kind}|${data.title}|${data.year ?? ""}`;
    const hit = CACHE.get(ck);
    if (hit && Date.now() - hit.at < 24 * 3600_000) return { ok: true as const, text: hit.text, sources: hit.sources, searched: hit.searched };
    if (limited(context.userId, 15)) return { ok: false as const, error: "rate_limited" as const };
    const r = await gemini({
      purpose: "reviews",
      search: true,
      maxTokens: 6000,
      system: "Tu rédiges des synthèses de critiques, neutres, factuelles et sans spoiler, en français. N'invente aucun chiffre ni citation.",
      parts: [{ text: `Résume en UN SEUL paragraphe (90 à 120 mots) l'accueil critique de « ${data.title} » (${KIND[data.kind]}${data.year ? `, ${data.year}` : ""}) à partir de la presse et des sites de notes (Rotten Tomatoes, IMDb, Metacritic, MyAnimeList, Allociné…). Mentionne les points forts et les reproches qui reviennent le plus, et les notes ou scores trouvés en précisant leur source. Si les informations sont rares ou contradictoires, dis-le.` }],
    });
    if ("error" in r) return { ok: false as const, error: r.error, detail: r.detail };
    CACHE.set(ck, { at: Date.now(), text: r.text, sources: r.sources, searched: r.searched });
    if (CACHE.size > 300) CACHE.delete(CACHE.keys().next().value as string);
    return { ok: true as const, text: r.text, sources: r.sources, searched: r.searched };
  });

// ---- 2) Reconnaissance d'affiche par photo ----
export const recognizePoster = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ image: z.string().min(100).max(2_500_000), mime: z.enum(["image/jpeg", "image/png", "image/webp"]) }).parse(d))
  .handler(async ({ data, context }) => {
    if (limited(context.userId, 10)) return { ok: false as const, error: "rate_limited" as const };
    const r = await gemini({
      purpose: "vision",
      json: true,
      maxTokens: 1500,
      system: "Tu identifies des films, séries et animés à partir de leur affiche. Réponds uniquement en JSON. N'invente pas : si tu n'es pas sûr, mets title à null.",
      parts: [
        { inlineData: { mimeType: data.mime, data: data.image } },
        { text: 'Identifie l\'œuvre sur cette affiche. Réponds avec ce JSON exact : {"title": string|null, "original_title": string|null, "year": number|null, "confidence": "haute"|"moyenne"|"faible"}' },
      ],
    });
    if ("error" in r) return { ok: false as const, error: r.error, detail: r.detail };
    try {
      const p = JSON.parse(r.text.replace(/^```json|```$/g, "").trim()) as { title?: string | null; original_title?: string | null; year?: number | null; confidence?: string };
      return { ok: true as const, title: p.title ?? null, original: p.original_title ?? null, year: p.year ?? null, confidence: p.confidence ?? "faible" };
    } catch {
      return { ok: false as const, error: "empty" as const };
    }
  });

// ---- 3) Diagnostic de l'IA (administrateur) : temps de réponse de chaque modèle avec la clé enregistrée ----
export const aiDiagnostics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) return { ok: false as const, error: "forbidden" as const };
    if (!KEY_NAMES.some((n) => process.env[n]?.trim())) return { ok: false as const, error: "missing_key" as const };
    const models = [...new Set([defaultModel(), "gemini-3.5-flash", "gemini-flash-latest", "gemini-flash-lite-latest", "gemini-3-flash-preview"])];
    const rows = await Promise.all(models.map(async (model) => ({ model, plain: await probeGemini(model, false), search: await probeGemini(model, true) })));
    // Chaque clé configurée est testée (jamais affichée : seulement son nom)
    const keys = await Promise.all(KEY_NAMES.map(async (name) => (process.env[name]?.trim() ? { name, configured: true as const, ...(await probeGemini(defaultModel(), false, name)) } : { name, configured: false as const })));
    return { ok: true as const, current: defaultModel(), thinking: currentThinkingMode(), rows, keys };
  });
