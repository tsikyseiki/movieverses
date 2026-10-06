// Protections communes de l'API publique : limite de débit, CORS configurable, en-têtes de sécurité, mode « coupe-circuit ».
// Paramétrage par variables secrètes (toutes facultatives) :
//   PUBLIC_API_ENABLED=false            → coupe l'API publique (503)
//   PUBLIC_API_RATE_LIMIT=60            → requêtes par minute et par IP (5 à 1000)
//   PUBLIC_API_CORS_ORIGINS=https://a.com,https://b.com → limite les sites autorisés (par défaut : tous)

type Bucket = { n: number; reset: number };
const BUCKETS = new Map<string, Bucket>();

export type RateInfo = { ok: boolean; remaining: number; retryAfter: number; limit: number };

export function clientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export function rateLimit(key: string, max: number, windowMs = 60_000): RateInfo {
  const now = Date.now();
  let b = BUCKETS.get(key);
  if (!b || b.reset <= now) {
    b = { n: 0, reset: now + windowMs };
    BUCKETS.set(key, b);
  }
  b.n++;
  if (BUCKETS.size > 5000) {
    for (const [k, v] of BUCKETS) if (v.reset <= now) BUCKETS.delete(k);
    if (BUCKETS.size > 5000) BUCKETS.clear();
  }
  return { ok: b.n <= max, remaining: Math.max(0, max - b.n), retryAfter: Math.max(1, Math.ceil((b.reset - now) / 1000)), limit: max };
}

export const apiEnabled = () => process.env["PUBLIC_API_ENABLED"] !== "false";
export const apiRateLimit = () => Math.min(Math.max(Number(process.env["PUBLIC_API_RATE_LIMIT"] ?? 60) || 60, 5), 1000);

function allowedOrigin(req: Request): string | null {
  const conf = (process.env["PUBLIC_API_CORS_ORIGINS"] ?? "*").trim();
  if (conf === "*" || conf === "") return "*";
  const origin = req.headers.get("origin");
  return origin && conf.split(",").map((s) => s.trim()).includes(origin) ? origin : null;
}

function baseHeaders(req: Request) {
  const h = new Headers({
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Cross-Origin-Resource-Policy": "cross-origin",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  });
  const o = allowedOrigin(req);
  if (o) {
    h.set("Access-Control-Allow-Origin", o);
    if (o !== "*") h.set("Vary", "Origin");
  }
  return h;
}

export const apiPreflight = (req: Request) => new Response(null, { status: 204, headers: baseHeaders(req) });

export function apiJson(req: Request, body: unknown, opts: { status?: number; cacheSeconds?: number; rl?: RateInfo } = {}) {
  const status = opts.status ?? 200;
  const h = baseHeaders(req);
  h.set("Content-Type", "application/json; charset=utf-8");
  const ttl = opts.cacheSeconds ?? 60;
  h.set("Cache-Control", status >= 400 ? "no-store" : `public, max-age=${ttl}, s-maxage=${ttl}`);
  if (opts.rl) {
    h.set("X-RateLimit-Limit", String(opts.rl.limit));
    h.set("X-RateLimit-Remaining", String(opts.rl.remaining));
    if (!opts.rl.ok) h.set("Retry-After", String(opts.rl.retryAfter));
  }
  return new Response(JSON.stringify(body), { status, headers: h });
}

/** Vérifie coupe-circuit + débit. Renvoie une réponse de refus, ou null si la requête est autorisée (avec les infos de débit). */
export function checkApi(req: Request, scope: string): { denied: Response | null; rl: RateInfo } {
  const rl = rateLimit(`${scope}:${clientIp(req)}`, apiRateLimit());
  if (!apiEnabled()) return { denied: apiJson(req, { error: "API temporairement désactivée" }, { status: 503, rl }), rl };
  if (!rl.ok) return { denied: apiJson(req, { error: "Trop de requêtes. Réessayez plus tard." }, { status: 429, rl }), rl };
  return { denied: null, rl };
}

export const isSafeId = (s: string) => /^[A-Za-z0-9_-]{1,32}$/.test(s);
export const KINDS = ["film", "manga", "occidental", "serie"] as const;
export const clampInt = (v: string | null, def: number, min: number, max: number) => Math.min(Math.max(Math.trunc(Number(v ?? def)) || def, min), max);
