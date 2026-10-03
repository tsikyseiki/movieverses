import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion — MovieVerse" },
      { name: "description", content: "Connectez-vous ou créez votre compte MovieVerse gratuit." },
      { property: "og:title", content: "Connexion — MovieVerse" },
      { property: "og:description", content: "Créez votre compte MovieVerse gratuit par email ou Google." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("Email invalide").max(255),
  password: z.string().min(8, "8 caractères minimum").max(72),
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) nav({ to: "/", replace: true }); });
    const { data: sub } = supabase.auth.onAuthStateChange((e) => { if (e === "SIGNED_IN") nav({ to: "/", replace: true }); });
    return () => sub.subscription.unsubscribe();
  }, [nav]);

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        toast.success("Email de réinitialisation envoyé.");
        return;
      }
      const p = schema.safeParse({ email, password });
      if (!p.success) { toast.error(p.error.issues[0]?.message ?? "Champs invalides"); return; }
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: p.data.email, password: p.data.password,
          options: { emailRedirectTo: window.location.origin, data: { display_name: name.trim().slice(0, 40) } },
        });
        if (error) throw error;
        toast.success("Compte créé ! Vérifiez votre boîte mail pour confirmer.");
      } else {
        const { error } = await supabase.auth.signInWithPassword(p.data);
        if (error) throw new Error("Email ou mot de passe incorrect.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally { setBusy(false); }
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error("Connexion Google impossible.");
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 pb-16 pt-36">
      <div className="rounded-3xl border border-border bg-card p-8 shadow-2xl">
        <h1 className="font-display text-3xl font-extrabold">
          {mode === "signup" ? "Créer un compte" : mode === "forgot" ? "Mot de passe oublié" : "Connexion"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Connectez-vous pour accéder au catalogue complet de films, animés et mangas. 100 % gratuit, aucune carte bancaire.</p>
        {mode !== "forgot" && (
          <>
            <Button variant="outline" className="mt-6 w-full" onClick={google} type="button">Continuer avec Google</Button>
            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />ou<span className="h-px flex-1 bg-border" /></div>
          </>
        )}
        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <div><Label htmlFor="name">Pseudo</Label><Input id="name" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} /></div>
          )}
          <div><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          {mode !== "forgot" && (
            <div><Label htmlFor="pw">Mot de passe</Label><Input id="pw" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          )}
          <Button type="submit" className="w-full" disabled={busy}>
            {mode === "signup" ? "S'inscrire" : mode === "forgot" ? "Envoyer le lien" : "Se connecter"}
          </Button>
        </form>
        <div className="mt-5 flex flex-col gap-2 text-center text-sm text-muted-foreground">
          {mode === "login" && <button onClick={() => setMode("forgot")} className="hover:text-foreground">Mot de passe oublié ?</button>}
          <button onClick={() => setMode(mode === "signup" ? "login" : "signup")} className="font-semibold text-primary">
            {mode === "signup" ? "Déjà inscrit ? Se connecter" : "Pas de compte ? S'inscrire"}
          </button>
        </div>
      </div>
    </div>
  );
}
