import { useQuery } from "@tanstack/react-query";
import { ListPlus } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cloud, isMissingTable } from "@/lib/cloud";
import { useMyId } from "@/lib/roles";
import type { Kind } from "@/lib/catalog";

type Target = { kind: Kind; id: string; title: string; poster: string | null };

export function AddToListMenu({ item }: { item: Target }) {
  const me = useMyId();
  const lists = useQuery({
    queryKey: ["add-menu", me], enabled: !!me, retry: false, staleTime: 60_000, networkMode: "online",
    queryFn: async () => {
      const [mine, shared] = await Promise.all([
        cloud.from("user_lists").select("id,title").eq("owner_id", me).order("created_at", { ascending: false }),
        cloud.from("shared_watchlists").select("id,name").order("created_at", { ascending: false }),
      ]);
      if (mine.error && isMissingTable(mine.error)) throw mine.error;
      return { mine: (mine.data ?? []) as { id: string; title: string }[], shared: (shared.data ?? []) as { id: string; name: string }[] };
    },
  });
  const add = async (table: "user_list_items" | "shared_watchlist_items", id: string) => {
    const row = table === "user_list_items"
      ? { list_id: id, kind: item.kind, item_id: item.id, title: item.title, poster: item.poster }
      : { watchlist_id: id, kind: item.kind, item_id: item.id, title: item.title, poster: item.poster };
    const { error } = await cloud.from(table).insert(row);
    if (error) toast.error(error.code === "23505" ? "Déjà dans cette liste." : "Ajout impossible.");
    else toast.success("Ajouté à la liste");
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-5 py-3 font-semibold backdrop-blur hover:bg-background/70">
          <ListPlus className="h-5 w-5" /> Ajouter à…
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2">
        {lists.error && <p className="p-3 text-sm text-muted-foreground">Les listes seront disponibles bientôt.</p>}
        {lists.isLoading && <p className="p-3 text-sm text-muted-foreground">Chargement…</p>}
        {lists.data && (
          <div className="max-h-72 overflow-y-auto">
            <p className="px-2 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Mes listes</p>
            {lists.data.mine.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">Aucune liste. Créez-en dans « Mes listes ».</p>}
            {lists.data.mine.map((l) => <button key={l.id} onClick={() => add("user_list_items", l.id)} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-accent">{l.title}</button>)}
            <p className="mt-2 px-2 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Listes partagées</p>
            {lists.data.shared.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">Aucune liste partagée.</p>}
            {lists.data.shared.map((l) => <button key={l.id} onClick={() => add("shared_watchlist_items", l.id)} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-accent">{l.name}</button>)}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
