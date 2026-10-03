import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Flag, Heart, MessageCircle, Send, Star } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cloud, isMissingTable } from "@/lib/cloud";
import { useRole } from "@/lib/roles";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { addComment, fetchComments, fetchPosts, getPseudo, likedPosts, setPseudo, toggleLike, type Post } from "@/lib/community";
import { cn } from "@/lib/utils";

export function CommunityFeed({ limit }: { limit?: number }) {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["posts"], queryFn: fetchPosts, networkMode: "online" });
  useEffect(() => {
    const ch = supabase
      .channel("posts-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => qc.invalidateQueries({ queryKey: ["posts"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);


  const posts = limit ? data?.slice(0, limit) : data;
  return (
    <div className="space-y-6">
      {error && <p className="text-destructive">Impossible de charger le fil.</p>}
      {isLoading && Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-64 animate-pulse rounded-2xl bg-muted" />)}
      {posts?.length === 0 && <p className="rounded-2xl border border-border p-8 text-center text-muted-foreground">Aucune publication pour l'instant. Soyez le premier !</p>}
      {posts?.map((p) => <PostCard key={p.id} post={p} />)}
    </div>
  );
}

const REASONS = ["Spam ou publicité", "Contenu offensant", "Spoiler non signalé", "Autre"];

function PostMenu({ post }: { post: Post }) {
  const { canModerate } = useRole();
  const qc = useQueryClient();
  const report = async (reason: string) => {
    const { error } = await cloud.from("reports").insert({ post_id: post.id, reason });
    if (error) toast.error(isMissingTable(error) ? "Le signalement sera disponible bientôt." : "Signalement impossible.");
    else toast.success("Merci, l'avis a été signalé aux modérateurs.");
  };
  const mod = async (what: "hide" | "delete") => {
    const r = what === "hide" ? await cloud.from("posts").update({ hidden: true }).eq("id", post.id) : await cloud.from("posts").delete().eq("id", post.id);
    if (r.error) toast.error("Action impossible.");
    else { toast.success("Fait"); qc.invalidateQueries({ queryKey: ["posts"] }); }
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button aria-label="Signaler ou modérer cet avis" className="ml-auto rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><Flag className="h-4 w-4" /></button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-2">
        <p className="px-2 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Signaler</p>
        {REASONS.map((r) => <button key={r} onClick={() => report(r)} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-accent">{r}</button>)}
        {canModerate && (
          <>
            <p className="mt-2 px-2 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Modération</p>
            <button onClick={() => mod("hide")} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-accent">Masquer l'avis</button>
            <button onClick={() => confirm("Supprimer définitivement cet avis ?") && mod("delete")} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10">Supprimer l'avis</button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

function PostCard({ post }: { post: Post }) {
  const [liked, setLiked] = useState(() => likedPosts().includes(post.id));
  const [likes, setLikes] = useState(post.likes_count);
  const [open, setOpen] = useState(false);
  useEffect(() => setLikes(post.likes_count), [post.likes_count]);
  const like = async () => {
    setLiked(!liked);
    setLikes((n) => n + (liked ? -1 : 1));
    try { setLikes(await toggleLike(post.id)); } catch { setLiked(liked); toast.error("Action impossible"); }
  };
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card">
      <header className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">{post.author.slice(0, 1).toUpperCase()}</div>
        <div>
          <p className="font-semibold">{post.author}</p>
          <p className="text-xs text-muted-foreground">{new Date(post.created_at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}</p>
        </div>
        <PostMenu post={post} />
      </header>
      <Link to="/titre/$kind/$id" params={{ kind: post.kind, id: post.item_id }} className="flex gap-4 bg-muted/40 p-4">
        {post.poster && <img src={post.poster} alt={post.title} className="w-24 shrink-0 rounded-lg object-cover ring-1 ring-border" />}
        <div>
          <h2 className="text-lg font-bold">{post.title}</h2>
          <div className="mt-2 flex flex-wrap gap-2 text-sm">
            {post.rating != null && <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-0.5 font-bold text-scrim"><Star className="h-3.5 w-3.5 fill-current" />{Number(post.rating).toFixed(1)}</span>}
            {post.user_rating != null && <span className="rounded-full bg-primary px-2.5 py-0.5 font-bold text-primary-foreground">Avis : {post.user_rating}/10</span>}
          </div>
        </div>
      </Link>
      <p className="whitespace-pre-line p-4 leading-relaxed">{post.body}</p>
      <div className="flex items-center gap-6 border-t border-border px-4 py-3 text-sm">
        <button onClick={like} className={cn("inline-flex items-center gap-2 font-semibold", liked && "text-primary")}>
          <Heart className={cn("h-5 w-5", liked && "fill-primary")} /> {likes}
        </button>
        <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-2 font-semibold">
          <MessageCircle className="h-5 w-5" /> {post.comments_count}
        </button>
      </div>
      {open && <Comments postId={post.id} />}
    </article>
  );
}

function Comments({ postId }: { postId: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["comments", postId], queryFn: () => fetchComments(postId), networkMode: "online" });
  const [author, setAuthor] = useState(getPseudo);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const ch = supabase
      .channel(`comments-${postId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "post_comments", filter: `post_id=eq.${postId}` }, () => qc.invalidateQueries({ queryKey: ["comments", postId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [postId, qc]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!author.trim() || !body.trim()) { toast.error("Pseudo et commentaire requis"); return; }
    setBusy(true);
    try {
      await addComment(postId, author.trim().slice(0, 40), body.trim().slice(0, 1000));
      setPseudo(author.trim());
      setBody("");
      qc.invalidateQueries({ queryKey: ["comments", postId] });
      qc.invalidateQueries({ queryKey: ["posts"] });
    } catch { toast.error("Envoi impossible"); }
    setBusy(false);
  };
  return (
    <div className="space-y-3 border-t border-border bg-muted/30 p-4">
      {data?.map((c) => (
        <div key={c.id} className="rounded-xl bg-background p-3 text-sm">
          <span className="font-semibold">{c.author}</span> <span className="text-foreground/85">{c.body}</span>
        </div>
      ))}
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <input value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={40} placeholder="Pseudo" className="rounded-lg border border-border bg-background px-3 py-2 text-sm sm:w-32" />
        <input value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} placeholder="Écrire un commentaire…" className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        <button disabled={busy} className="inline-flex items-center justify-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Send className="h-4 w-4" /> Envoyer</button>
      </form>
    </div>
  );
}
