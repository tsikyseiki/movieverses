import { createFileRoute } from "@tanstack/react-router";
import { apiEnabled, clientIp, rateLimit } from "@/lib/http-guard";
import { atHome, pageUrl } from "@/lib/mangadex-at-home";

// GET /api/public/manga-page?c=<chapitre>&i=<n° de page>&q=saver|data
// Chargement de SECOURS : si le navigateur n'arrive pas à joindre le serveur d'images de MangaDex (réseau mobile, port bloqué…),
// c'est le serveur de MovieVerse qui va chercher la page. L'adresse est reconstruite côté serveur : aucune URL n'est acceptée en entrée.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/api/public/manga-page")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const fail = (status: number, msg: string) =>
          new Response(msg, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
        if (!apiEnabled()) return fail(503, "API temporairement désactivée");
        if (!rateLimit(`mpage:${clientIp(request)}`, 400).ok) return fail(429, "Trop de requêtes");

        const u = new URL(request.url);
        const c = u.searchParams.get("c") ?? "";
        const i = Number(u.searchParams.get("i"));
        const q = u.searchParams.get("q") === "data" ? "data" : "saver";
        if (!UUID.test(c) || !Number.isInteger(i) || i < 0 || i > 999) return fail(400, "Paramètres invalides");

        try {
          for (const fresh of [false, true]) {
            const url = pageUrl(await atHome(c, fresh), q, i);
            if (!url) return fail(404, "Page introuvable");
            try {
              const up = await fetch(url);
              const type = up.headers.get("content-type") ?? "";
              if (up.ok && type.startsWith("image/")) {
                return new Response(up.body, {
                  headers: { "Content-Type": type, "Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff" },
                });
              }
            } catch { /* on retente avec un autre serveur */ }
          }
        } catch { /* MangaDex injoignable */ }
        return fail(502, "Image indisponible");
      },
    },
  },
});
