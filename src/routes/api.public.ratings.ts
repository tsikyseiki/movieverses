import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { apiJson, apiPreflight, checkApi, clampInt, isSafeId, KINDS } from "@/lib/http-guard";

// GET /api/public/ratings?kind=film&item_id=550&limit=50
// Notes moyennes de la communauté MovieVerse, agrégées par titre. Limité en débit (voir /developpeurs).
export const Route = createFileRoute("/api/public/ratings")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => apiPreflight(request),
      GET: async ({ request }) => {
        const { denied, rl } = checkApi(request, "ratings");
        if (denied) return denied;
        const u = new URL(request.url);
        const kind = u.searchParams.get("kind");
        const itemId = u.searchParams.get("item_id");
        const limit = clampInt(u.searchParams.get("limit"), 50, 1, 100);
        if (kind && !(KINDS as readonly string[]).includes(kind)) return apiJson(request, { error: "kind invalide (film, manga, occidental)" }, { status: 400, rl });
        if (itemId && !isSafeId(itemId)) return apiJson(request, { error: "item_id invalide" }, { status: 400, rl });
        let q = supabase.from("posts").select("kind,item_id,title,user_rating").not("user_rating", "is", null).limit(5000);
        if (kind) q = q.eq("kind", kind);
        if (itemId) q = q.eq("item_id", itemId);
        const { data, error } = await q;
        if (error) return apiJson(request, { error: "Service indisponible" }, { status: 503, rl });
        const m = new Map<string, { kind: string; item_id: string; title: string; count: number; sum: number }>();
        for (const r of data ?? []) {
          const k = `${r.kind}:${r.item_id}`;
          const e = m.get(k) ?? { kind: r.kind, item_id: r.item_id, title: r.title, count: 0, sum: 0 };
          e.count++;
          e.sum += Number(r.user_rating);
          m.set(k, e);
        }
        const out = [...m.values()]
          .map((e) => ({ kind: e.kind, item_id: e.item_id, title: e.title, ratings_count: e.count, average: Math.round((e.sum / e.count) * 10) / 10 }))
          .sort((a, b) => b.ratings_count - a.ratings_count || b.average - a.average)
          .slice(0, limit);
        return apiJson(request, { data: out, scale: "1-10", generated_at: new Date().toISOString() }, { rl, cacheSeconds: 60 });
      },
    },
  },
});
