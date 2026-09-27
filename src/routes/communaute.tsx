import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Heart, MessageCircle, Send, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { addComment, fetchComments, fetchPosts, getPseudo, likedPosts, setPseudo, toggleLike, type Post } from "@/lib/community";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/communaute")({
  head: () => ({
    meta: [
      { title: "Avis & discussions — MovieVerse" },
      { name: "description", content: "Le fil communautaire MovieVerse : avis, notes, likes et commentaires sur films et animés." },
      { property: "og:title", content: "Avis & discussions — MovieVerse" },
      { property: "og:description", content: "Partagez vos avis sur films et animés, likez et commentez." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Community,
});

function Community() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["posts"], queryFn: fetchPosts, networkMode: "online" });
  useEffect(() => {
    const ch = supabase
      .channel("posts-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => qc.invalidateQueries({ queryKey: ["posts"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  return (
    <div className="mx-auto max-w-2xl px-4 pb-20 pt-36 lg:pt-28">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Communauté</p>
      <h1 className="mt-2 text-4xl font-extrabold md:text-5xl">Avis & discussions</h1>
      <p className="mt-3 text-muted-foreground">Pour publier un avis, ouvrez la fiche d'un titre et utilisez « Publier un avis ».</p>
      {error && <p className="mt-8 text-destructive">Impossible de charger le fil.</p>}
      <div className="mt-8 space-y-6">
        {isLoading && Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-64 animate-pulse rounded-2xl bg-muted" />)}
        {data?.length === 0 && <p className="rounded-2xl border border-border p-8 text-center text-muted-foreground">Aucune publication pour l'instant. Soyez le premier !</p>}
        {data?.map((p) => <PostCard key={p.id} post={p} />)}
      </div>
    </div>
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
    if (!author.trim() || !body.trim()) return toast.error("Pseudo et commentaire requis");
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
