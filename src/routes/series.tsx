import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { Catalog } from "@/components/mv/Catalog";

export const Route = createFileRoute("/series")({
  validateSearch: z.object({ genre: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Séries — MovieVerse" },
      { name: "description", content: "Les séries du moment par genre : drame, comédie, crime, science-fiction, mystère et plus." },
      { property: "og:title", content: "Séries — MovieVerse" },
      { property: "og:description", content: "Les séries populaires par genre, mises à jour en temps réel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <Catalog kind="serie" genre={Route.useSearch().genre ?? null} />,
});
