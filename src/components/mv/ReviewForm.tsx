import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { MessagesSquare } from "lucide-react";
import { toast } from "sonner";
import type { Kind } from "@/lib/catalog";
import { createPost, getPseudo, setPseudo } from "@/lib/community";

type Target = { kind: Kind; item_id: string; title: string; poster: string | null; rating: number | null };

export function ReviewForm({ item, myRating }: { item: Target; myRating: number }) {
  const [author, setAuthor] = useState(getPseudo);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!author.trim() || !body.trim()) return toast.error("Pseudo et avis requis");
    setBusy(true);
    try {
      await createPost({ ...item, user_rating: myRating || null, author: author.trim().slice(0, 40), body: body.trim().slice(0, 2000) });
      setPseudo(author.trim());
      setBody("");
      setDone(true);
      toast.success("Avis publié dans la communauté");
    } catch {
      toast.error("Publication impossible");
    }
    setBusy(false);
  };
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="flex items-center gap-2 text-2xl font-bold"><MessagesSquare className="h-6 w-6 text-primary" /> Publier un avis</h2>
      <p className="mt-1 text-sm text-muted-foreground">Votre note personnelle ({myRating ? `${myRating}/10` : "non notée"}) sera jointe à la publication.</p>
      <form onSubmit={submit} className="mt-4 grid gap-3">
        <input value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={40} placeholder="Votre pseudo" className="rounded-lg border border-border bg-background px-3 py-2 sm:w-64" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} rows={3} placeholder="Qu'en avez-vous pensé ?" className="rounded-lg border border-border bg-background px-3 py-2" />
        <div className="flex flex-wrap items-center gap-4">
          <button disabled={busy} className="rounded-full bg-primary px-6 py-2.5 font-semibold text-primary-foreground disabled:opacity-50">Publier</button>
          {done && <Link to="/communaute" className="text-sm font-semibold text-primary">Voir dans Avis & discussions →</Link>}
        </div>
      </form>
    </section>
  );
}
