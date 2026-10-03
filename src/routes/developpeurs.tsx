import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/developpeurs")({
  head: () => ({
    meta: [
      { title: "API publique — MovieVerse" },
      { name: "description", content: "API REST gratuite : avis et notes agrégées de la communauté MovieVerse." },
      { property: "og:title", content: "API publique MovieVerse" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Docs,
});

const Code = ({ children }: { children: string }) => (
  <pre className="no-scrollbar mt-2 overflow-x-auto rounded-xl border border-border bg-card p-4 text-xs leading-relaxed"><code>{children}</code></pre>
);

function Docs() {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://movieverses.lovable.app";
  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-36 lg:pt-28">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Développeurs</p>
      <h1 className="mt-2 text-4xl font-extrabold md:text-5xl">API publique MovieVerse</h1>
      <p className="mt-3 text-muted-foreground">Lecture seule, gratuite, sans clé, ouverte à tous les sites (CORS). Format JSON. Seuls les pseudos publics sont exposés.</p>

      <h2 className="mt-10 text-2xl font-bold">Notes agrégées</h2>
      <p className="mt-1 text-sm text-muted-foreground"><code>GET /api/public/ratings</code> — paramètres : <code>kind</code> (film, manga, occidental), <code>item_id</code>, <code>limit</code> (1–100).</p>
      <Code>{`curl "${origin}/api/public/ratings?kind=film&limit=10"

{ "data": [ { "kind": "film", "item_id": "550", "title": "…", "ratings_count": 12, "average": 8.4 } ],
  "scale": "1-10" }`}</Code>

      <h2 className="mt-10 text-2xl font-bold">Avis</h2>
      <p className="mt-1 text-sm text-muted-foreground"><code>GET /api/public/reviews</code> — paramètres : <code>kind</code>, <code>item_id</code>, <code>limit</code> (1–100), <code>offset</code>.</p>
      <Code>{`curl "${origin}/api/public/reviews?kind=manga&item_id=16498&limit=5"`}</Code>

      <h2 className="mt-10 text-2xl font-bold">Limites et sécurité</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li><strong className="text-foreground">Débit :</strong> 60 requêtes par minute et par adresse IP. Au-delà, réponse <code>429</code> avec l'en-tête <code>Retry-After</code>.</li>
        <li><strong className="text-foreground">En-têtes :</strong> <code>X-RateLimit-Limit</code> et <code>X-RateLimit-Remaining</code> sur chaque réponse.</li>
        <li><strong className="text-foreground">Cache :</strong> les réponses sont mises en cache 30 à 60 secondes (<code>Cache-Control</code>).</li>
        <li><strong className="text-foreground">Validation :</strong> <code>kind</code> ∈ film, manga, occidental ; <code>item_id</code> alphanumérique (32 caractères max) ; <code>limit</code> ≤ 100 ; <code>offset</code> ≤ 5000.</li>
        <li><strong className="text-foreground">Confidentialité :</strong> seuls les pseudos publics, avis et notes sont exposés ; aucune donnée de compte. Les avis masqués par la modération sont exclus.</li>
        <li><strong className="text-foreground">Méthodes :</strong> lecture seule (<code>GET</code>, <code>OPTIONS</code>). Erreurs : <code>400</code> paramètre invalide, <code>429</code> trop de requêtes, <code>503</code> service indisponible ou API coupée.</li>
        <li><strong className="text-foreground">Disponibilité :</strong> <code>GET /api/public/status</code> et la page <a href="/statut" className="text-primary underline">État du système</a>.</li>
      </ul>

      <p className="mt-10 text-sm text-muted-foreground">Merci de mettre les réponses en cache de votre côté et de citer MovieVerse. Les identifiants <code>item_id</code> sont ceux de TMDB (films, séries) et d'AniList (animés).</p>
    </div>
  );
}
