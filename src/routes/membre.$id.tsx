import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cloud, isMissingTable } from "@/lib/cloud";
import { useMyId } from "@/lib/roles";
import { NotReady } from "@/components/mv/NotReady";
import { Avatar } from "./membres";

export const Route = createFileRoute("/membre/$id")({
  head: () => ({ meta: [{ title: "Profil membre — MovieVerse" }, { name: "robots", content: "noindex" }] }),
  component: MemberPage,
});

function MemberPage() {
  const { id } = Route.useParams();
  const me = useMyId();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["member", id, me], retry: false, networkMode: "online",
    queryFn: async () => {
      const prof = await cloud.from("public_profiles").select("*").eq("id", id).maybeSingle();
      if (prof.error) throw prof.error;
      const [followers, mine, lists] = await Promise.all([
        cloud.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", id),
        me ? cloud.from("follows").select("follower_id").eq("follower_id", me).eq("following_id", id).maybeSingle() : Promise.resolve({ data: null }),
        cloud.from("user_lists").select("id,title,description,share_code").eq("owner_id", id).eq("is_public", true),
      ]);
      return { p: prof.data as { display_name: string | null; avatar_url: string | null; bio: string | null; watched_count: number; trophies_count: number; points: number } | null, followers: (followers.count ?? 0) as number, following: !!mine.data, lists: (lists.data ?? []) as { id: string; title: string; description: string | null; share_code: string }[] };
    },
  });
  const toggle = async () => {
    if (!me || !q.data) return;
    const r = q.data.following
      ? await cloud.from("follows").delete().eq("follower_id", me).eq("following_id", id)
      : await cloud.from("follows").insert({ follower_id: me, following_id: id });
    if (r.error) { toast.error("Action impossible."); return; }
    qc.invalidateQueries({ queryKey: ["member", id] });
  };
  if (q.error) return <div className="mx-auto max-w-2xl px-4 pt-36">{isMissingTable(q.error as { code?: string }) ? <NotReady what="Les profils publics" /> : <p className="text-muted-foreground">Profil introuvable.</p>}</div>;
  const p = q.data?.p;
  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-36 lg:pt-28">
      {q.isLoading && <div className="h-40 animate-pulse rounded-3xl bg-muted" />}
      {q.data && !p && <p className="text-muted-foreground">Ce profil n'est pas public ou n'existe pas. <Link to="/membres" className="text-primary underline">Voir le classement</Link></p>}
      {p && q.data && (
        <>
          <div className="flex items-center gap-4">
            <Avatar m={p} size={88} />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-3xl font-extrabold">{p.display_name ?? "Membre"}</h1>
              <p className="text-sm text-muted-foreground">{q.data.followers} abonné{q.data.followers > 1 ? "s" : ""} · {p.points} pts</p>
            </div>
            {me && me !== id && (
              <button onClick={toggle} className={`rounded-full px-5 py-2 text-sm font-semibold ${q.data.following ? "border border-border" : "bg-primary text-primary-foreground"}`}>{q.data.following ? "Abonné" : "S'abonner"}</button>
            )}
          </div>
          {p.bio && <p className="mt-5 whitespace-pre-line text-muted-foreground">{p.bio}</p>}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border bg-card p-4"><p className="text-2xl font-extrabold">{p.watched_count}</p><p className="text-xs text-muted-foreground">Titres vus</p></div>
            <div className="rounded-2xl border border-border bg-card p-4"><p className="text-2xl font-extrabold">{p.trophies_count}</p><p className="text-xs text-muted-foreground">Trophées</p></div>
          </div>
          {q.data.lists.length > 0 && (
            <>
              <h2 className="mt-10 text-xl font-bold">Listes publiques</h2>
              <div className="mt-3 space-y-2">
                {q.data.lists.map((l) => (
                  <Link key={l.id} to="/liste/$code" params={{ code: l.share_code }} className="block rounded-2xl border border-border bg-card p-4 hover:border-primary/60">
                    <p className="font-semibold">{l.title}</p>
                    {l.description && <p className="text-sm text-muted-foreground">{l.description}</p>}
                  </Link>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
