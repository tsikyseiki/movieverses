import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Check, Copy, Plus, Search, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cloud, isMissingTable } from "@/lib/cloud";
import { useMyId } from "@/lib/roles";
import { searchAll } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import { NotReady } from "@/components/mv/NotReady";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/partage")({
  head: () => ({ meta: [{ title: "Listes partagées — MovieVerse" }, { name: "description", content: "Une watchlist à plusieurs, mise à jour en temps réel." }] }),
  component: Shared,
});

type WL = { id: string; name: string; join_code: string };
type WItem = { id: string; kind: string; item_id: string; title: string; poster: string | null; watched: boolean };

function Detail({ wl, me }: { wl: WL; me: string }) {
  const { settings } = useStore();
  const qc = useQueryClient();
  const [online, setOnline] = useState(1);
  const [term, setTerm] = useState("");
  const items = useQuery({
    queryKey: ["wl-items", wl.id], networkMode: "online",
    queryFn: async () => {
      const { data, error } = await cloud.from("shared_watchlist_items").select("id,kind,item_id,title,poster,watched").eq("watchlist_id", wl.id).order("created_at");
      if (error) throw error;
      return data as WItem[];
    },
  });
  const found = useQuery({ queryKey: ["wl-search", term], queryFn: () => searchAll(term, settings.lang), enabled: term.trim().length >= 2, staleTime: 60_000 });

  // Temps réel : tout changement d'un membre apparaît chez les autres, avec le nombre de personnes connectées
  useEffect(() => {
    const ch = supabase
      .channel(`wl-${wl.id}`, { config: { presence: { key: me } } })
      .on("postgres_changes", { event: "*", schema: "public", table: "shared_watchlist_items", filter: `watchlist_id=eq.${wl.id}` }, () => qc.invalidateQueries({ queryKey: ["wl-items", wl.id] }))
      .on("presence", { event: "sync" }, () => setOnline(Math.max(1, Object.keys(ch.presenceState()).length)))
      .subscribe(async (s) => { if (s === "SUBSCRIBED") await ch.track({ at: Date.now() }); });
    return () => { void supabase.removeChannel(ch); };
  }, [wl.id, me, qc]);

  const add = async (i: { kind: string; id: string; title: string; poster: string | null }) => {
    const { error } = await cloud.from("shared_watchlist_items").insert({ watchlist_id: wl.id, kind: i.kind, item_id: i.id, title: i.title, poster: i.poster });
    if (error) toast.error(error.code === "23505" ? "Déjà dans la liste." : "Ajout impossible.");
    else { setTerm(""); qc.invalidateQueries({ queryKey: ["wl-items", wl.id] }); }
  };
  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold">{wl.name}</p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="h-2 w-2 animate-pulse rounded-full bg-primary" /> {online} connecté{online > 1 ? "s" : ""} en ce moment</p>
        </div>
        <button onClick={async () => { await navigator.clipboard?.writeText(wl.join_code); toast.success("Code copié : " + wl.join_code); }} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"><Copy className="h-4 w-4" /> Code : {wl.join_code}</button>
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-full border border-border bg-muted/60 px-4 py-2.5">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Ajouter un titre à la liste…" aria-label="Ajouter un titre" className="w-full bg-transparent text-sm outline-none" />
      </div>
      {found.data && term.trim().length >= 2 && (
        <div className="mt-2 max-h-64 space-y-1 overflow-y-auto rounded-2xl border border-border bg-popover p-2">
          {found.data.slice(0, 6).map((i) => (
            <button key={`${i.kind}${i.id}`} onClick={() => add({ kind: i.kind, id: i.id, title: i.title, poster: i.poster })} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-accent">
              <div className="h-12 w-8 shrink-0 overflow-hidden rounded bg-muted">{i.poster && <img src={i.poster} alt="" className="h-full w-full object-cover" />}</div>
              <span className="truncate text-sm font-medium">{i.title}</span><Plus className="ml-auto h-4 w-4" />
            </button>
          ))}
        </div>
      )}
      {items.data?.length === 0 && <p className="mt-8 text-center text-muted-foreground">La liste est vide : ajoutez le premier titre !</p>}
      <div className="mt-4 space-y-2">
        {items.data?.map((it) => (
          <div key={it.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
            <div className="h-16 w-11 shrink-0 overflow-hidden rounded-md bg-muted">{it.poster && <img src={it.poster} alt="" className="h-full w-full object-cover" />}</div>
            <p className={cn("min-w-0 flex-1 truncate font-semibold", it.watched && "text-muted-foreground line-through")}>{it.title}</p>
            <button aria-label={it.watched ? "Marquer comme à voir" : "Marquer comme vu"} onClick={() => cloud.from("shared_watchlist_items").update({ watched: !it.watched }).eq("id", it.id)} className={cn("rounded-full border p-2", it.watched ? "border-primary bg-primary text-primary-foreground" : "border-border")}><Check className="h-4 w-4" /></button>
            <button aria-label="Retirer" onClick={() => cloud.from("shared_watchlist_items").delete().eq("id", it.id)} className="rounded-full p-2 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Shared() {
  const me = useMyId();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const lists = useQuery({
    queryKey: ["shared-lists", me], enabled: !!me, retry: false, networkMode: "online",
    queryFn: async () => {
      const { data, error } = await cloud.from("shared_watchlists").select("id,name,join_code").order("created_at", { ascending: false });
      if (error) throw error;
      return data as WL[];
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["shared-lists"] });
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!me) { toast.error("Session non chargée : rechargez la page, puis réessayez."); return; }
    const { data, error } = await cloud.from("shared_watchlists").insert({ owner_id: me, name: name.trim().slice(0, 60) }).select("id").single();
    if (error) {
      const e = error as { message?: string; code?: string; details?: string; hint?: string };
      toast.error(`Création impossible : ${[e.code, e.message, e.details, e.hint].filter(Boolean).join(" · ").slice(0, 240) || "erreur inconnue"}`, { duration: 15000 });
      return;
    }
    setName(""); setSel(data.id); refresh();
  };
  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    const { data, error } = await cloud.rpc("join_watchlist", { _code: code.trim() });
    if (error) { toast.error("Code invalide."); return; }
    setCode(""); setSel(data as string); refresh();
  };
  const current = lists.data?.find((l) => l.id === sel);
  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-36 lg:pt-28">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary"><Users className="h-4 w-4" /> À plusieurs</p>
      <h1 className="mt-2 text-4xl font-extrabold md:text-5xl">Listes partagées</h1>
      <p className="mt-3 text-sm text-muted-foreground">Une watchlist commune avec vos amis, mise à jour en direct : tout le monde voit les ajouts et les « vu » instantanément.</p>
      {lists.error && isMissingTable(lists.error as { code?: string }) ? <NotReady what="Les listes partagées" /> : (
        <>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <form onSubmit={create} className="flex gap-2"><input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Nouvelle liste" aria-label="Nom de la liste partagée" className="h-11 min-w-0 flex-1 rounded-full border border-border bg-background px-4 text-sm" /><button className="h-11 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground">Créer</button></form>
            <form onSubmit={join} className="flex gap-2"><input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code d'invitation" aria-label="Code d'invitation" className="h-11 min-w-0 flex-1 rounded-full border border-border bg-background px-4 text-sm" /><button className="h-11 rounded-full border border-border px-4 text-sm font-semibold">Rejoindre</button></form>
          </div>
          <div className="no-scrollbar -mx-4 mt-5 flex gap-2 overflow-x-auto px-4">
            {lists.data?.map((l) => <button key={l.id} onClick={() => setSel(l.id)} className={cn("shrink-0 rounded-full border px-4 py-1.5 text-sm", sel === l.id ? "border-primary bg-primary text-primary-foreground" : "border-border")}>{l.name}</button>)}
          </div>
          {lists.data?.length === 0 && <p className="mt-10 text-center text-muted-foreground">Créez une liste, puis partagez son code avec vos amis.</p>}
          {current && me && <Detail key={current.id} wl={current} me={me} />}
        </>
      )}
    </div>
  );
}
