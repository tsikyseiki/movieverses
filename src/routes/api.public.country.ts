import { createFileRoute } from "@tanstack/react-router";
import { checkApi } from "@/lib/http-guard";

// GET /api/public/country — pays du visiteur d'après sa connexion (en-tête ajouté par Cloudflare), sans demander la position.
export const Route = createFileRoute("/api/public/country")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { denied } = checkApi(request, "country");
        if (denied) return denied;
        const code = (request.headers.get("cf-ipcountry") ?? "").toUpperCase();
        const country = /^[A-Z]{2}$/.test(code) && code !== "XX" && code !== "T1" ? code : null;
        return new Response(JSON.stringify({ country }), {
          headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
        });
      },
    },
  },
});
