import { geminiKeys, logKeyUsage, POOLS, SHARED_KEYS, type GeminiFeature, type GeminiKey } from "@/lib/gemini-keys";

// Appel Gemini partagé (assistant, résumé des critiques, reconnaissance d'affiche, diagnostic).
// Accélérations : réflexion réduite quand le modèle l'accepte, recherche Google seulement si utile, repli automatique sans recherche.
export type GeminiPart = { text?: string; inlineData?: { mimeType: string; data: string } };
export type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };
export type GeminiOk = { text: string; sources: { title: string; url: string }[]; searched: boolean };
export type GeminiFail = { error: "missing_key" | "quota" | "upstream" | "empty"; detail?: string };

export type Purpose = GeminiFeature;

type Opts = {
  system?: string;
  contents: GeminiContent[];
  search?: boolean;
  json?: boolean;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  model?: string;
  noFallback?: boolean;
  purpose?: Purpose; // chat | reviews | vision : clé (et modèle) dédiés si configurés
};

export const defaultModel = () => process.env["GEMINI_MODEL"] || "gemini-3.5-flash";
const modelFor = (p?: Purpose) => (p && process.env[`GEMINI_MODEL_${p.toUpperCase()}`]) || defaultModel();

// Les clés par fonction (GEMINI_CHAT_KEY_1…, GEMINI_VISION_KEY_1…, GEMINI_REVIEWS_KEY_1…) puis GEMINI_BACKUP_KEY et GEMINI_API_KEY viennent de gemini-keys.ts.
// Les quotas de Google s'appliquent par PROJET, pas par clé : pour séparer vraiment les usages, chaque clé doit venir d'un projet différent.
// Clés lues dans les secrets : GEMINI_API_KEY_CHAT / _REVIEWS / _VISION (facultatives), puis GEMINI_API_KEY en secours.
export const KEY_NAMES: string[] = [...Object.values(POOLS).flat(), ...SHARED_KEYS];
function keysFor(p?: Purpose): GeminiKey[] {
  if (p) return geminiKeys(p);
  const seen = new Set<string>();
  return SHARED_KEYS.flatMap((name) => {
    const key = process.env[name]?.trim();
    if (!key || seen.has(key)) return [];
    seen.add(key);
    return [{ name, key }];
  });
}

export async function callGemini(o: Opts): Promise<GeminiOk | GeminiFail> {
  const keys = keysFor(o.purpose);
  if (!keys.length) return { error: "missing_key" };
  const model = o.model ?? modelFor(o.purpose);
  const tokens = o.maxTokens ?? 3000;
  let last: GeminiOk | GeminiFail = { error: "upstream" };
  for (const [i, { name, key }] of keys.entries()) {
    let r = await once(key, model, o, !!o.search, tokens);
    // Recherche indisponible (quota, erreur, délai) ou réponse vide : repli sans recherche, avec plus de marge
    if (!o.noFallback && "error" in r && (o.search || r.error === "empty")) r = await once(key, model, o, false, Math.min(tokens * 2, 8000));
    void logKeyUsage(name, !("error" in r) ? "ok" : r.error === "quota" ? "quota" : "error");
    if (!("error" in r)) return r;
    last = r;
    // Quota épuisé ou clé refusée : on passe à la clé suivante (la clé générale en secours)
    const keyProblem = r.error === "quota" || /HTTP 40[13]/.test(r.detail ?? "");
    if (!keyProblem || i === keys.length - 1) break;
  }
  return last;
}

/** Mesure le temps de réponse d'un modèle (sans repli), pour la page de diagnostic admin. */
export async function probeGemini(model: string, search: boolean, keyName = "GEMINI_API_KEY"): Promise<{ ok: boolean; ms: number; status: string }> {
  const key = process.env[keyName]?.trim();
  if (!key) return { ok: false, ms: 0, status: "clé absente" };
  const t = performance.now();
  const r = await once(key, model, { contents: [{ role: "user", parts: [{ text: "Résume en 60 mots l'accueil critique du film Inception." }] }], timeoutMs: 40_000 }, search, 1500);
  const ms = Math.round(performance.now() - t);
  return "error" in r ? { ok: false, ms, status: r.detail ?? r.error } : { ok: true, ms, status: "OK" };
}
