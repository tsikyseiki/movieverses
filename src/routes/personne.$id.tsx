import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchPerson } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import { PosterCard, PosterSkeleton, gridCols } from "@/components/mv/PosterCard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/personne/$id")({
  head: () => ({ meta: [{ title: "Filmographie — MovieVerse" }, { name: "description", content: "Filmographie d'un acteur ou réalisateur sur MovieVerse." }] }),
  component: PersonPage,
});

function PersonPage() {
  const { id } = Route.useParams();
  const { settings } = useStore();
  const { data: p, isLoading, error } = useQuery({ queryKey: ["person", id, settings.lang], queryFn: () => fetchPerson(id, settings.lang), staleTime: 60 * 60_000 });
  if (error) return <div className="mx-auto max-w-3xl px-4 pt-36 text-muted-foreground">Impossible de charger cette fiche. <Link to="/" className="text-primary underline">Retour à l'accueil</Link></div>;
  return (
    <div className="mx-auto max-w-[1500px] px-4 pb-20 pt-36 md:px-8 lg:pt-28">
      {isLoading || !p ? (
        <div className="h-48 animate-pulse rounded-3xl bg-muted" />
      ) : (
        <>
          <div className="flex flex-col gap-6 sm:flex-row">
            <div className="h-48 w-36 shrink-0 overflow-hidden rounded-2xl bg-muted ring-1 ring-border">{p.photo && <img src={p.photo} alt={p.name} className="h-full w-full object-cover" />}</div>
            <div className="min-w-0">
              <h1 className="text-4xl font-extrabold md:text-5xl">{p.name}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {p.birthday ? `Né(e) le ${new Date(p.birthday).toLocaleDateString("fr-FR", { dateStyle: "long" })}` : ""}{p.place ? ` · ${p.place}` : ""}
              </p>
              {p.bio && <p className="mt-4 line-clamp-6 max-w-3xl text-sm leading-relaxed text-muted-foreground">{p.bio}</p>}
            </div>
          </div>
          <h2 className="mt-10 text-2xl font-bold">Filmographie</h2>
          {p.works.length === 0 && <p className="mt-4 text-muted-foreground">Aucun titre disponible dans le catalogue MovieVerse.</p>}
          <div className={cn("mt-6 grid gap-x-4 gap-y-6", gridCols(settings.cardSize))}>
            {p.works.map((i, n) => <PosterCard key={`${i.kind}${i.id}`} item={i} index={n} />)}
          </div>
        </>
      )}
      {isLoading && <div className={cn("mt-8 grid gap-4", gridCols(settings.cardSize))}>{Array.from({ length: 6 }).map((_, n) => <PosterSkeleton key={n} />)}</div>}
    </div>
  );
}
