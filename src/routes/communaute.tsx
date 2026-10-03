import { createFileRoute } from "@tanstack/react-router";
import { CommunityFeed } from "@/components/mv/CommunityFeed";

export const Route = createFileRoute("/communaute")({
  head: () => ({
    meta: [
      { title: "Avis & discussions — MovieVerse" },
      { name: "description", content: "Le fil communautaire MovieVerse : avis, notes, likes et commentaires sur films et animés." },
      { property: "og:title", content: "Avis & discussions — MovieVerse" },
      { property: "og:description", content: "Partagez vos avis sur les films et animés, aimez et commentez les publications." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Community,
});

function Community() {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-20 pt-36 lg:pt-28">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Communauté</p>
      <h1 className="mt-2 text-4xl font-extrabold md:text-5xl">Avis & discussions</h1>
      <p className="mt-3 text-muted-foreground">Pour publier un avis, ouvrez la fiche d'un titre et utilisez « Publier un avis ».</p>
      <div className="mt-8"><CommunityFeed /></div>
    </div>
  );
}
