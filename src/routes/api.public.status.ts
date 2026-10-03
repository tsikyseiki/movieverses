import { createFileRoute } from "@tanstack/react-router";
import { apiJson, apiPreflight, apiEnabled, checkApi } from "@/lib/http-guard";

// GET /api/public/status — sonde de disponibilité (utilisée par la page /statut)
export const Route = createFileRoute("/api/public/status")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => apiPreflight(request),
      GET: async ({ request }) => {
        const { denied, rl } = checkApi(request, "status");
        if (denied) return denied;
        return apiJson(request, { ok: apiEnabled(), service: "MovieVerse API", time: new Date().toISOString() }, { rl, cacheSeconds: 5 });
      },
    },
  },
});
