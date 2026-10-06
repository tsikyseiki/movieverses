import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { apiJson, apiPreflight, checkApi, clampInt, isSafeId, KINDS } from "@/lib/http-guard";

// GET /api/public/reviews?kind=film&item_id=550&limit=20&offset=0
// Avis publiés par la communauté (pseudo public uniquement, jamais d'identifiant de compte). Limité en débit.
export const Route = createFileRoute("/api/public/reviews")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => apiPreflight(request),
      GET: async ({ request }) => {
        const { denied, rl } = checkApi(request, "reviews");
        if (denied) return denied;
        const u = new URL(request.url);
        const kind = u.searchParams.get("kind");
        const itemId = u.searchParams.get("item_id");
        const limit = clampInt(u.searchParams.get("limit"), 20, 1, 100);
        const offset = clampInt(u.searchParams.get("offset"), 0, 0, 5000);
        if (kind && !(KINDS as readonly string[]).includes(kind)) return apiJson(request, { error: "kind invalide (film, manga, occidental, serie)" }, { status: 400, rl });
        if (itemId && !isSafeId(itemId)) return apiJson(request, { error: "item_id invalide" }, { status: 400, rl });
        let q = supabase
          .from("posts")
          .select("id,kind,item_id,title,user_rating,author,body,likes_count,comments_count,created_at")
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);
        if (kind) q = q.eq("kind", kind);
        if (itemId) q = q.eq("item_id", itemId);
        // Les avis masqués par la modération ne sont jamais exposés (ignoré tant que la colonne n'existe pas)
        const filtered = await q.eq("hidden" as never, false as never);
        const { data, error } = filtered.error ? await q : filtered;
        if (error) return apiJson(request, { error: "Service indisponible" }, { status: 503, rl });
        return apiJson(request, { data: data ?? [], limit, offset }, { rl, cacheSeconds: 30 });
      },
    },
  },
});
