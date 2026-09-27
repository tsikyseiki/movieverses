import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { PosterCard, gridCols } from "@/components/mv/PosterCard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ma-liste")({
  head: () => ({
    meta: [
      { title: "Ma liste & Vu récemment — MovieVerse" },
      { name: "description", content: "Vos favoris et votre historique, enregistrés sur cet appareil." },
      { property: "og:title", content: "Ma liste — MovieVerse" },
      { property: "og:description", content: "Favoris et historique de visionnage." },
    ],
  }),
  component: MyList,
});

function MyList() {
  const { favorites, history, settings, ready } = useStore();
  const [tab, setTab] = useState<"fav" | "hist">("fav");
  const items = tab === "fav" ? favorites : history;
  return (
    <div className="mx-auto max-w-[1500px] px-4 pb-20 pt-36 md:px-8 lg:pt-28">
      <h1 className="text-4xl font-extrabold md:text-6xl">Ma liste</h1>
      <div className="mt-6 inline-flex rounded-full bg-muted p-1">
        {([["fav", `Favoris (${favorites.length})`], ["hist", `Vu récemment (${history.length})`]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={cn("rounded-full px-5 py-2 text-sm font-medium transition", tab === k ? "bg-background shadow" : "text-muted-foreground")}>{l}</button>
        ))}
      </div>
      {ready && items.length === 0 ? (
        <p className="mt-16 text-center text-muted-foreground">{tab === "fav" ? "Ajoutez des titres avec le cœur pour les retrouver ici." : "Les fiches que vous consultez apparaîtront ici."}</p>
      ) : (
        <div className={cn("mt-8 grid gap-x-4 gap-y-6", gridCols(settings.cardSize))}>
          {items.map((i, n) => <PosterCard key={`${i.kind}${i.id}`} item={i} index={n} />)}
        </div>
      )}
    </div>
  );
}
