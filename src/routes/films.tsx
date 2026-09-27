import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { Catalog } from "@/components/mv/Catalog";

export const Route = createFileRoute("/films")({
  validateSearch: z.object({ genre: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Films — MovieVerse" },
      { name: "description", content: "Films populaires par genre : action, romance, horreur, zombie, science-fiction et plus." },
      { property: "og:title", content: "Films — MovieVerse" },
      { property: "og:description", content: "Films populaires par genre, mis à jour en temps réel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <Catalog kind="film" genre={Route.useSearch().genre ?? null} />,
});
