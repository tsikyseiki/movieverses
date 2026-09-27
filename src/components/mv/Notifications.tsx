import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fetchUpcoming } from "@/lib/catalog";
import { useStore } from "@/lib/store";

export function Notifications() {
  const { favorites, settings, seenNotifs, markSeen, ready } = useStore();
  const counts = new Map<number, number>();
  favorites.forEach((f) => f.genreIds?.forEach((g) => counts.set(g, (counts.get(g) ?? 0) + 1)));
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([g]) => g).sort();
  const { data = [] } = useQuery({
    queryKey: ["upcoming", top.join(","), settings.lang],
    queryFn: () => fetchUpcoming(top, settings.lang),
    enabled: ready,
    staleTime: 30 * 60_000,
    retry: false,
  });
  const unseen = data.filter((d) => !seenNotifs.includes(d.id));
  return (
    <Popover onOpenChange={(o) => !o && markSeen(data.map((d) => d.id))}>
      <PopoverTrigger asChild>
        <button aria-label="Notifications" className="relative rounded-full p-2 transition hover:bg-accent">
          <Bell className="h-5 w-5" />
          {unseen.length > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {unseen.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-2">
        <p className="px-2 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {top.length ? "Bientôt dans vos genres favoris" : "Sorties à venir"}
        </p>
        <div className="max-h-96 overflow-y-auto">
          {data.length === 0 && <p className="p-3 text-sm text-muted-foreground">Rien de nouveau pour l'instant.</p>}
          {data.map((i) => (
            <Link key={i.id} to="/titre/$kind/$id" params={{ kind: i.kind, id: i.id }} className="flex gap-3 rounded-lg p-2 hover:bg-accent">
              <div className="h-12 w-8 shrink-0 overflow-hidden rounded bg-muted">{i.poster && <img src={i.poster} alt="" className="h-full w-full object-cover" />}</div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {!seenNotifs.includes(i.id) && <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-primary align-middle" />}
                  {i.title}
                </p>
                <p className="text-xs text-muted-foreground">Sortie le {i.date ? new Date(i.date).toLocaleDateString("fr-FR") : "—"}</p>
              </div>
            </Link>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
