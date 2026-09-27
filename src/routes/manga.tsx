import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { Catalog } from "@/components/mv/Catalog";

export const Route = createFileRoute("/manga")({
  validateSearch: z.object({ genre: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Animé Manga — MovieVerse" },
      { name: "description", content: "Animés japonais : shonen, shojo, seinen, isekai, mecha, slice of life et plus, avec lecture des scans." },
      { property: "og:title", content: "Animé Manga — MovieVerse" },
      { property: "og:description", content: "Animés japonais par genre et lecture des scans." },
    ],
  }),
  component: () => <Catalog kind="manga" genre={Route.useSearch().genre ?? null} />,
});
