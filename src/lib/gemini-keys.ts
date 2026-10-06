// Répartition des clés Gemini par fonction, avec clés de secours.
// Chaque fonction a son propre quota quotidien ; si une clé répond "quota épuisé",
// la suivante prend le relais automatiquement. GEMINI_BACKUP_KEY est la clé de
// dernier recours commune, et GEMINI_API_KEY (clé d'origine) reste en tout dernier.
export type GeminiFeature = "chat" | "vision" | "reviews";

const POOLS: Record<GeminiFeature, string[]> = {
  chat: ["GEMINI_CHAT_KEY_1", "GEMINI_CHAT_KEY_2", "GEMINI_CHAT_KEY_3"],
  vision: ["GEMINI_VISION_KEY_1", "GEMINI_VISION_KEY_2"],
  reviews: ["GEMINI_REVIEWS_KEY_1", "GEMINI_REVIEWS_KEY_2"],
};

export function geminiKeys(feature: GeminiFeature): string[] {
  const names = [...POOLS[feature], "GEMINI_BACKUP_KEY", "GEMINI_API_KEY"];
  const keys = names.map((n) => process.env[n]).filter((k): k is string => !!k);
  return [...new Set(keys)];
}
