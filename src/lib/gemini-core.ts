import { geminiKeys, logKeyUsage, POOLS, SHARED_KEYS, type GeminiFeature, type GeminiKey } from "@/lib/gemini-keys";

// Appel Gemini partagé (assistant, résumé des critiques, reconnaissance d'affiche, diagnostic).
// Accélérations : réflexion réduite quand le modèle l'accepte, recherche Google seulement si utile, repli automatique sans recherche.
// Clés : par fonction (GEMINI_CHAT_KEY_1…, GEMINI_VISION_KEY_1…, GEMINI_REVIEWS_KEY_1…), puis GEMINI_BACKUP_KEY et GEMINI_API_KEY (voir gemini-keys.ts).
// Les quotas de Google s'appliquent par PROJET, pas par clé : pour séparer vraiment les usages, chaque clé doit venir d'un projet différent.
export type GeminiPart = { text?: string; inlineData?: { mimeType: string; data: string } };
export type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };
export type GeminiOk = { text: string; sources: { title: string; url: string }[]; searched: boolean };
export type GeminiFail = { error: "missing_key" | "quota" | "upstream" | "empty"; detail?: string };
export type Purpose = GeminiFeature;

type Opts = {
  system?: string | undefined;
  contents: GeminiContent[];
  search?: boolean | undefined;
  json?: boolean | undefined;
  maxTokens?: number | undefined;
  temperature?: number | undefined;
  timeoutMs?: number | undefined;
  model?: string | undefined;
  noFallback?: boolean | undefined;
  purpose?: Purpose | undefined; // chat | reviews | vision : clés (et modèle) dédiés à cet usage
};

export const defaultModel = () => process.env["GEMINI_MODEL"] || "gemini-3.5-flash";
const modelFor = (p?: Purpose) => (p && process.env[`GEMINI_MODEL_${p.toUpperCase()}`]) || defaultModel();

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

// « Réflexion » du modèle : on essaie le niveau bas (Gemini 3), puis le budget zéro (Gemini 2.5), puis rien.
// Le premier mode refusé par Google (erreur 400) est abandonné pour toute la durée de vie du serveur.
let thinkingMode: "level" | "budget" | "off" = "level";
const thinkingConfig = () => (thinkingMode === "level" ? { thinkingLevel: "low" } : thinkingMode === "budget" ? { thinkingBudget: 0 } : undefined);
export const currentThinkingMode = () => thinkingMode;

async function once(key: string, model: string, o: Opts, search: boolean, tokens: number): Promise<GeminiOk | GeminiFail> {
  for (let tries = 0; tries < 3; tries++) {
    const think = thinkingConfig();
    let res: Response;
    try {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          ...(o.system ? { systemInstruction: { parts: [{ text: o.system }] } } : {}),
          contents: o.contents,
          ...(search ? { tools: [{ google_search: {} }] } : {}),
          generationConfig: {
            temperature: o.temperature ?? (o.json ? 0.1 : 0.5),
            maxOutputTokens: tokens,
            ...(o.json ? { responseMimeType: "application/json" } : {}),
            ...(think ? { thinkingConfig: think } : {}),
          },
        }),
        signal: AbortSignal.timeout(o.timeoutMs ?? 40_000),
      });
    } catch {
      return { error: "upstream", detail: "délai dépassé ou réseau indisponible" };
    }
    if (!res.ok) {
      let msg = "";
      try {
        msg = ((await res.json()) as { error?: { message?: string } }).error?.message ?? "";
      } catch {
        /* ignoré */
      }
      if (res.status === 400 && /think/i.test(msg) && thinkingMode !== "off") {
        thinkingMode = thinkingMode === "level" ? "budget" : "off";
        continue; // on réessaie avec un réglage de réflexion accepté
      }
      return { error: res.status === 429 ? "quota" : "upstream", detail: `HTTP ${res.status}${msg ? ` : ${msg.slice(0, 180)}` : ""}` };
    }
    const j = (await res.json()) as {
      candidates?: {
        finishReason?: string;
        content?: { parts?: { text?: string }[] };
        groundingMetadata?: { groundingChunks?: { web?: { uri?: string; title?: string } }[] };
      }[];
    };
    const c = j.candidates?.[0];
    const text = (c?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
    if (!text) return { error: "empty", detail: `réponse vide (${c?.finishReason ?? "raison inconnue"})` };
    const seen = new Set<string>();
    const sources = (c?.groundingMetadata?.groundingChunks ?? [])
      .map((x) => x.web)
      .filter((w): w is { uri: string; title?: string } => !!w?.uri && /^https:\/\//.test(w.uri))
      .filter((w) => !seen.has(w.uri) && seen.add(w.uri))
      .slice(0, 4)
      .map((w) => ({ title: w.title ?? "Source", url: w.uri }));
    return { text, sources, searched: search };
  }
  return { error: "upstream", detail: "réglage de réflexion refusé" };
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

/** Mesure le temps de réponse d'un modèle (sans repli), pour le diagnostic de l'administrateur. */
export async function probeGemini(model: string, search: boolean, keyName = "GEMINI_API_KEY"): Promise<{ ok: boolean; ms: number; status: string }> {
  const key = process.env[keyName]?.trim();
  if (!key) return { ok: false, ms: 0, status: "clé absente" };
  const t = performance.now();
  const r = await once(key, model, { contents: [{ role: "user", parts: [{ text: "Résume en 60 mots l'accueil critique du film Inception." }] }], timeoutMs: 40_000 }, search, 1500);
  const ms = Math.round(performance.now() - t);
  return "error" in r ? { ok: false, ms, status: r.detail ?? r.error } : { ok: true, ms, status: "OK" };
}
