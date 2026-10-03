import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cloud, isMissingTable } from "@/lib/cloud";
import { SITE } from "@/lib/site-config";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [{ title: "Contact & suggestions — MovieVerse" }, { name: "description", content: "Une idée, un bug, une demande de suppression de compte ? Écrivez à l'équipe MovieVerse." }, { property: "og:title", content: "Contact — MovieVerse" }] }),
  component: Contact,
});

const TYPES = ["Suggestion", "Bug", "Contenu à corriger", "Suppression de mon compte", "Autre"];

function Contact() {
  const [type, setType] = useState(TYPES[0]!);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (msg.trim().length < 10) { toast.error("Décrivez votre demande en quelques mots (10 caractères minimum)."); return; }
    setBusy(true);
    try {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid) { toast.error("Connectez-vous pour envoyer un message."); return; }
      const { error } = await cloud.from("feedback").insert({ user_id: uid, type, message: msg.trim().slice(0, 1000) });
      if (error) {
        toast.error(isMissingTable(error) ? (SITE.contactEmail ? "Formulaire indisponible : écrivez-nous par email." : "Formulaire bientôt disponible.") : "Envoi impossible. Réessayez.");
        return;
      }
      setSent(true);
      setMsg("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 pb-24 pt-36 lg:pt-28">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary"><Mail className="h-4 w-4" /> Aide</p>
      <h1 className="mt-2 text-4xl font-extrabold md:text-5xl">Contact & suggestions</h1>
      <p className="mt-3 text-sm text-muted-foreground">Une idée, un bug, un contenu à corriger ou une demande de suppression de compte : dites-nous tout.{SITE.contactEmail && <> Vous pouvez aussi écrire à <a className="text-primary underline" href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.</>}</p>
      {sent ? (
        <div className="mt-8 rounded-2xl border border-primary/40 bg-primary/10 p-6 text-center"><p className="text-lg font-bold">Merci, message envoyé !</p><p className="mt-1 text-sm text-muted-foreground">Nous lisons chaque retour. <Link to="/" className="text-primary underline">Retour à l'accueil</Link></p></div>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-4">
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => <button type="button" key={t} onClick={() => setType(t)} className={`rounded-full border px-4 py-1.5 text-sm ${type === t ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{t}</button>)}
          </div>
          <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={6} maxLength={1000} placeholder="Votre message…" aria-label="Votre message" className="w-full rounded-2xl border border-border bg-background p-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          <p className="text-right text-xs text-muted-foreground">{msg.length}/1000</p>
          <button disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground disabled:opacity-60">{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />} Envoyer</button>
        </form>
      )}
    </div>
  );
}
