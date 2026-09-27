import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { Catalog } from "@/components/mv/Catalog";

export const Route = createFileRoute("/occidental")({
  validateSearch: z.object({ genre: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Animé Occidental — MovieVerse" },
      { name: "description", content: "Séries animées occidentales : action, comédie, super-héros, science-fiction, famille." },
      { property: "og:title", content: "Animé Occidental — MovieVerse" },
      { property: "og:description", content: "Les meilleures séries animées occidentales par genre." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <Catalog kind="occidental" genre={Route.useSearch().genre ?? null} />,
});
