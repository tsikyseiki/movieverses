import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { cloud, isMissingTable } from "@/lib/cloud";
import { useRole } from "@/lib/roles";
import { NotReady } from "@/components/mv/NotReady";

export const Route = createFileRoute("/moderation")({
  head: () => ({ meta: [{ title: "Modération — MovieVerse" }, { name: "robots", content: "noindex" }] }),
  component: Moderation,
});

type Report = { id: string; reason: string; created_at: string; post_id: string | null; posts: { id: string; title: string; body: string; author: string } | null };
type Hidden = { id: string; title: string; body: string; author: string };

function Moderation() {
  const { canModerate } = useRole();
  const qc = useQueryClient();
  const reports = useQuery({
    queryKey: ["mod-reports"], enabled: canModerate, retry: false, networkMode: "online",
    queryFn: async () => {
      const { data, error } = await cloud.from("reports").select("id,reason,created_at,post_id,posts(id,title,body,author)").eq("status", "open").order("created_at");
      if (error) throw error;
      return data as Report[];
    },
  });
  const hidden = useQuery({
    queryKey: ["mod-hidden"], enabled: canModerate && !reports.error, retry: false, networkMode: "online",
    queryFn: async () => ((await cloud.from("posts").select("id,title,body,author").eq("hidden", true).limit(50)).data ?? []) as Hidden[],
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["mod-reports"] }); qc.invalidateQueries({ queryKey: ["mod-hidden"] }); qc.invalidateQueries({ queryKey: ["posts"] }); };
  const act = async (r: Report, what: "hide" | "delete" | "dismiss") => {
    let err = null;
    if (what === "hide" && r.post_id) err = (await cloud.from("posts").update({ hidden: true }).eq("id", r.post_id)).error;
    if (what === "delete" && r.post_id) err = (await cloud.from("posts").delete().eq("id", r.post_id)).error;
    if (!err && what !== "delete") err = (await cloud.from("reports").update({ status: "resolved" }).eq("id", r.id)).error;
    if (err) toast.error("Action impossible."); else { toast.success("Fait"); refresh(); }
  };
  if (!canModerate) return <div className="pt-40 text-center text-muted-foreground">Accès réservé aux modérateurs.</div>;
  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-36 lg:pt-28">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary"><ShieldAlert className="h-4 w-4" /> Modération</p>
      <h1 className="mt-2 text-4xl font-extrabold">Signalements</h1>
      {reports.error && isMissingTable(reports.error as { code?: string }) && <NotReady what="La modération" />}
      {reports.data?.length === 0 && <p className="mt-8 rounded-2xl border border-border p-8 text-center text-muted-foreground">Aucun signalement en attente.</p>}
      <div className="mt-6 space-y-3">
        {reports.data?.map((r) => (
          <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Motif : <span className="font-semibold text-foreground">{r.reason}</span> · {new Date(r.created_at).toLocaleDateString("fr-FR")}</p>
            {r.posts ? <><p className="mt-2 font-semibold">{r.posts.title} — {r.posts.author}</p><p className="mt-1 line-clamp-4 whitespace-pre-line text-sm text-muted-foreground">{r.posts.body}</p></> : <p className="mt-2 text-sm text-muted-foreground">Avis déjà supprimé.</p>}
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              {r.post_id && <button onClick={() => act(r, "hide")} className="rounded-full border border-border px-3 py-1.5 hover:bg-muted">Masquer l'avis</button>}
              {r.post_id && <button onClick={() => confirm("Supprimer définitivement cet avis ?") && act(r, "delete")} className="rounded-full border border-destructive/50 px-3 py-1.5 text-destructive hover:bg-destructive/10">Supprimer</button>}
              <button onClick={() => act(r, "dismiss")} className="rounded-full border border-border px-3 py-1.5 hover:bg-muted">Classer sans suite</button>
            </div>
          </div>
        ))}
      </div>
      {(hidden.data?.length ?? 0) > 0 && (
        <>
          <h2 className="mt-12 text-xl font-bold">Avis masqués</h2>
          <div className="mt-3 space-y-2">
            {hidden.data!.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                <div className="min-w-0 flex-1"><p className="truncate font-semibold">{p.title} — {p.author}</p><p className="truncate text-xs text-muted-foreground">{p.body}</p></div>
                <button onClick={async () => { await cloud.from("posts").update({ hidden: false }).eq("id", p.id); refresh(); }} className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted">Rétablir</button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
