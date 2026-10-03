import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { cloud, isMissingTable } from "@/lib/cloud";
import { useMyId } from "@/lib/roles";
import { NotReady } from "@/components/mv/NotReady";
import { FallbackPoster } from "@/components/mv/FallbackPoster";

export const Route = createFileRoute("/liste/$code")({
  head: () => ({ meta: [{ title: "Liste — MovieVerse" }, { name: "robots", content: "noindex" }] }),
  component: ListPage,
});

type Item = { kind: string; item_id: string; title: string; poster: string | null };

function ListPage() {
  const { code } = Route.useParams();
  const me = useMyId();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["list", code], retry: false, networkMode: "online",
    queryFn: async () => {
      const l = await cloud.from("user_lists").select("id,title,description,owner_id,is_public").eq("share_code", code).maybeSingle();
      if (l.error) throw l.error;
      if (!l.data) return null;
      const it = await cloud.from("user_list_items").select("kind,item_id,title,poster").eq("list_id", l.data.id).order("position").order("title");
      return { list: l.data as { id: string; title: string; description: string | null; owner_id: string }, items: (it.data ?? []) as Item[] };
    },
  });
  if (q.error) return <div className="mx-auto max-w-2xl px-4 pt-36">{isMissingTable(q.error as { code?: string }) ? <NotReady what="Les listes" /> : <p className="text-muted-foreground">Impossible de charger cette liste.</p>}</div>;
  const mine = q.data && me === q.data.list.owner_id;
  return (
    <div className="mx-auto max-w-[1500px] px-4 pb-24 pt-36 md:px-8 lg:pt-28">
      {q.isLoading && <div className="h-24 animate-pulse rounded-2xl bg-muted" />}
      {q.data === null && <p className="text-muted-foreground">Cette liste est privée ou n'existe pas.</p>}
      {q.data && (
        <>
          <h1 className="text-4xl font-extrabold md:text-5xl">{q.data.list.title}</h1>
          {q.data.list.description && <p className="mt-2 text-muted-foreground">{q.data.list.description}</p>}
          <p className="mt-2 text-sm text-muted-foreground">{q.data.items.length} titre{q.data.items.length > 1 ? "s" : ""}</p>
          {q.data.items.length === 0 && <p className="mt-10 text-center text-muted-foreground">Cette liste est vide.</p>}
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {q.data.items.map((i) => (
              <div key={`${i.kind}${i.item_id}`} className="group relative">
                <Link to="/titre/$kind/$id" params={{ kind: i.kind as "film", id: i.item_id }} className="block overflow-hidden rounded-xl bg-muted ring-1 ring-border">
                  <div className="aspect-[2/3]">{i.poster ? <img src={i.poster} alt={i.title} loading="lazy" className="h-full w-full object-cover" /> : <FallbackPoster title={i.title} />}</div>
                </Link>
                <p className="mt-1.5 line-clamp-1 text-sm font-semibold">{i.title}</p>
                {mine && <button aria-label="Retirer de la liste" onClick={async () => { await cloud.from("user_list_items").delete().eq("list_id", q.data!.list.id).eq("kind", i.kind).eq("item_id", i.item_id); qc.invalidateQueries({ queryKey: ["list", code] }); }} className="absolute right-1.5 top-1.5 rounded-full bg-black/70 p-1.5 text-white"><X className="h-3.5 w-3.5" /></button>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
