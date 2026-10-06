// Répartition des clés Gemini par fonction, avec clés de secours.
// Chaque fonction a son propre quota quotidien ; si une clé répond "quota épuisé",
// la suivante prend le relais automatiquement. GEMINI_BACKUP_KEY est la clé de
// dernier recours commune, et GEMINI_API_KEY (clé d'origine) reste en tout dernier.
export type GeminiFeature = "chat" | "vision" | "reviews";

export const POOLS: Record<GeminiFeature, string[]> = {
  chat: ["GEMINI_CHAT_KEY_1", "GEMINI_CHAT_KEY_2", "GEMINI_CHAT_KEY_3"],
  vision: ["GEMINI_VISION_KEY_1", "GEMINI_VISION_KEY_2"],
  reviews: ["GEMINI_REVIEWS_KEY_1", "GEMINI_REVIEWS_KEY_2"],
};
export const SHARED_KEYS = ["GEMINI_BACKUP_KEY", "GEMINI_API_KEY"];

export type GeminiKey = { name: string; key: string };

export function geminiKeys(feature: GeminiFeature): GeminiKey[] {
  const seen = new Set<string>();
  const out: GeminiKey[] = [];
  for (const name of [...POOLS[feature], ...SHARED_KEYS]) {
    const key = process.env[name];
    if (key && !seen.has(key)) { seen.add(key); out.push({ name, key }); }
  }
  return out;
}

/** Enregistre l'issue d'un appel (sans jamais stocker la clé elle-même). Ne bloque jamais la réponse. */
export async function logKeyUsage(name: string, status: "ok" | "quota" | "error") {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.rpc("log_gemini_usage", { _key: name, _status: status });
  } catch { /* le suivi ne doit jamais casser l'IA */ }
}
