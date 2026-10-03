import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { cloud, isMissingTable } from "@/lib/cloud";
import { useMyId } from "@/lib/roles";
import { NotReady } from "@/components/mv/NotReady";

export const Route = createFileRoute("/listes")({
  head: () => ({ meta: [{ title: "Mes listes — MovieVerse" }, { name: "description", content: "Créez des listes de films et d'animés et partagez-les par lien." }] }),
  component: Lists,
});

type L = { id: string; title: string; is_public: boolean; share_code: string };

export const listUrl = (code: string) => `${window.location.origin}/liste/${code}`;

function Lists() {
  const me = useMyId();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const q = useQuery({
    queryKey: ["my-lists", me], enabled: !!me, retry: false, networkMode: "online",
    queryFn: async () => {
      const { data, error } = await cloud.from("user_lists").select("id,title,is_public,share_code").eq("owner_id", me).order("created_at", { ascending: false });
      if (error) throw error;
      return data as L[];
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["my-lists"] });
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !me) return;
    const { error } = await cloud.from("user_lists").insert({ owner_id: me, title: title.trim().slice(0, 80) });
    if (error) { toast.error("Création impossible."); return; }
    setTitle(""); refresh();
  };
  const share = async (l: L) => {
    const url = listUrl(l.share_code);
    if (navigator.share) await navigator.share({ title: l.title, url }).catch(() => undefined);
    else { await navigator.clipboard?.writeText(url); toast.success("Lien copié"); }
  };
  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-36 lg:pt-28">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Collections</p>
      <h1 className="mt-2 text-4xl font-extrabold md:text-5xl">Mes listes</h1>
      <p className="mt-3 text-sm text-muted-foreground">Créez vos listes (« Mes 10 meilleurs animés »…), puis ajoutez des titres depuis leur fiche avec le bouton « Ajouter à ».</p>
      <form onSubmit={create} className="mt-6 flex gap-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Nom de la nouvelle liste" aria-label="Nom de la liste" className="h-11 min-w-0 flex-1 rounded-full border border-border bg-background px-4 text-sm" />
        <button className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" /> Créer</button>
      </form>
      {q.error && isMissingTable(q.error as { code?: string }) && <NotReady what="Les listes" />}
      {q.data?.length === 0 && <p className="mt-10 text-center text-muted-foreground">Aucune liste pour l'instant.</p>}
      <div className="mt-8 space-y-3">
        {q.data?.map((l) => (
          <div key={l.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <Link to="/liste/$code" params={{ code: l.share_code }} className="min-w-0 flex-1 truncate text-lg font-bold hover:text-primary">{l.title}</Link>
              <button aria-label="Supprimer la liste" onClick={async () => { if (confirm(`Supprimer « ${l.title} » ?`)) { await cloud.from("user_lists").delete().eq("id", l.id); refresh(); } }} className="rounded-full p-2 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-sm">
              <label className="flex items-center gap-2 text-muted-foreground"><Switch checked={l.is_public} onCheckedChange={async (v) => { await cloud.from("user_lists").update({ is_public: v }).eq("id", l.id); refresh(); }} /> {l.is_public ? "Publique (lien actif)" : "Privée"}</label>
              {l.is_public && <button onClick={() => share(l)} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"><Link2 className="h-3.5 w-3.5" /> Partager</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
